"""信息抽取相关API路由"""
import asyncio
import json
import logging
import random
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.models.schemas import (
    CellUpdate,
    Evidence,
    ExtractColumnRequest,
    ExtractRequest,
)
from app.mocks.mock_data import get_mock_cell_value
from app.services.extraction import extract_cell_with_llm, ExtractionError
from app.services.paper_store import get_paper

logger = logging.getLogger(__name__)

router = APIRouter()


def sse_event(event: str, data: str) -> str:
    """构造单条SSE消息"""
    return f"event: {event}\ndata: {data}\n\n"


# ========== Mock extraction (original) ==========


async def _extract_cell_mock(
    paper_id: str,
    column_id: str,
    column_prompt: str = "",
) -> AsyncGenerator[str, None]:
    """Mock: yield loading then result after delay."""
    loading = CellUpdate(paper_id=paper_id, column_id=column_id, status="loading")
    yield sse_event("cell_update", loading.model_dump_json())

    await asyncio.sleep(random.uniform(0.15, 0.6))

    mock_data = get_mock_cell_value(paper_id, column_id, column_prompt)

    if mock_data:
        evidence = Evidence(
            text=f"Evidence text for '{mock_data['value']}'...",
            page=mock_data["page"] or 1,
            bbox=[100.0, 200.0, 400.0, 220.0],
            confidence=0.92,
        )
        result = CellUpdate(
            paper_id=paper_id,
            column_id=column_id,
            status="completed",
            value=mock_data["value"],
            evidence=evidence,
        )
    else:
        result = CellUpdate(paper_id=paper_id, column_id=column_id, status="na")

    yield sse_event("cell_update", result.model_dump_json())


# ========== Real LLM extraction ==========


async def _extract_cell_llm_task(
    paper_id: str,
    column_id: str,
    column_prompt: str,
    semaphore: asyncio.Semaphore,
    queue: asyncio.Queue,
) -> None:
    """Run a single LLM extraction, push SSE strings to queue.

    Args:
        paper_id: Paper identifier.
        column_id: Column identifier.
        column_prompt: Extraction instruction.
        semaphore: Concurrency limiter.
        queue: Output queue for SSE events.
    """
    # Send loading event immediately
    loading = CellUpdate(paper_id=paper_id, column_id=column_id, status="loading")
    await queue.put(sse_event("cell_update", loading.model_dump_json()))

    async with semaphore:
        paper_data = get_paper(paper_id)
        if not paper_data:
            logger.warning("Paper %s not found in cache", paper_id)
            result = CellUpdate(
                paper_id=paper_id,
                column_id=column_id,
                status="error",
                value="Paper data not available",
            )
            await queue.put(sse_event("cell_update", result.model_dump_json()))
            return

        try:
            llm_result = await extract_cell_with_llm(paper_data, column_prompt)
        except ExtractionError as e:
            result = CellUpdate(
                paper_id=paper_id,
                column_id=column_id,
                status="error",
                value=e.message,
            )
            await queue.put(sse_event("cell_update", result.model_dump_json()))
            return

        if llm_result:
            evidence = Evidence(
                text=llm_result.get("evidence_text", ""),
                page=1,
                confidence=0.85,
            )
            result = CellUpdate(
                paper_id=paper_id,
                column_id=column_id,
                status="completed",
                value=llm_result["value"],
                evidence=evidence,
            )
        else:
            result = CellUpdate(
                paper_id=paper_id, column_id=column_id, status="na"
            )

        await queue.put(sse_event("cell_update", result.model_dump_json()))


async def _llm_batch_stream(
    paper_ids: list[str],
    column_ids: list[str],
    column_prompts: dict[str, str],
) -> AsyncGenerator[str, None]:
    """Launch all (paper, column) extractions concurrently, stream results."""
    semaphore = asyncio.Semaphore(settings.EXTRACTION_CONCURRENCY)
    queue: asyncio.Queue[str] = asyncio.Queue()
    total = len(paper_ids) * len(column_ids)

    tasks: list[asyncio.Task] = []
    for paper_id in paper_ids:
        for column_id in column_ids:
            prompt = column_prompts.get(column_id, "")
            task = asyncio.create_task(
                _extract_cell_llm_task(
                    paper_id, column_id, prompt, semaphore, queue
                )
            )
            tasks.append(task)

    # Yield events as they arrive; stop when all tasks are done
    finished = 0
    completed_cells = 0
    while finished < len(tasks):
        # Check for done tasks
        done_now = sum(1 for t in tasks if t.done())

        # Drain all available events from queue
        while not queue.empty():
            event = queue.get_nowait()
            yield event
            # Count completed cells (non-loading events)
            if '"status":"completed"' in event or '"status":"na"' in event or '"status":"error"' in event:
                completed_cells += 1

        if done_now >= len(tasks):
            # Drain any remaining events
            while not queue.empty():
                event = queue.get_nowait()
                yield event
                if '"status":"completed"' in event or '"status":"na"' in event or '"status":"error"' in event:
                    completed_cells += 1
            finished = done_now
        else:
            await asyncio.sleep(0.05)

    # Propagate any exceptions
    for task in tasks:
        if task.exception():
            logger.error("Extraction task failed: %s", task.exception())

    yield sse_event("complete", json.dumps({"completed": completed_cells, "total": total}))


async def _llm_column_stream(
    column_id: str,
    paper_ids: list[str],
    column_prompt: str,
) -> AsyncGenerator[str, None]:
    """Single-column LLM extraction stream."""
    prompts = {column_id: column_prompt}
    async for event in _llm_batch_stream(paper_ids, [column_id], prompts):
        yield event


# ========== Unified stream dispatchers ==========


async def extract_batch_stream(
    paper_ids: list[str],
    column_ids: list[str],
    column_prompts: dict[str, str] | None = None,
) -> AsyncGenerator[str, None]:
    """批量提取事件流"""
    prompts = column_prompts or {}

    if settings.USE_MOCK_EXTRACTION:
        completed = 0
        total = len(paper_ids) * len(column_ids)
        for paper_id in paper_ids:
            for column_id in column_ids:
                async for chunk in _extract_cell_mock(
                    paper_id, column_id, prompts.get(column_id, "")
                ):
                    yield chunk
                completed += 1
        yield sse_event("complete", json.dumps({"completed": completed, "total": total}))
    else:
        async for event in _llm_batch_stream(paper_ids, column_ids, prompts):
            yield event


async def extract_column_stream(
    column_id: str,
    paper_ids: list[str],
    column_prompt: str = "",
) -> AsyncGenerator[str, None]:
    """单列提取事件流（添加新列时使用）"""
    if settings.USE_MOCK_EXTRACTION:
        for paper_id in paper_ids:
            async for chunk in _extract_cell_mock(paper_id, column_id, column_prompt):
                yield chunk
        yield sse_event("complete", json.dumps({"completed": len(paper_ids)}))
    else:
        async for event in _llm_column_stream(column_id, paper_ids, column_prompt):
            yield event


# ========== Routes ==========


@router.post("/extract/batch")
async def extract_batch(request: ExtractRequest):
    """批量提取信息（SSE流式接口）"""
    return StreamingResponse(
        extract_batch_stream(request.paper_ids, request.column_ids, request.column_prompts),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/extract/column")
async def extract_column(request: ExtractColumnRequest):
    """单列提取（SSE流式接口）"""
    return StreamingResponse(
        extract_column_stream(request.column_id, request.paper_ids, request.column_prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
