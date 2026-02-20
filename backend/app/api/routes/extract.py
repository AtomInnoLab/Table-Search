"""信息抽取相关API路由"""
import asyncio
import json
import logging
import random
from concurrent.futures import ThreadPoolExecutor
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
from app.services.extraction import extract_cell_sync, ExtractionError
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


# ========== Real LLM extraction (ThreadPoolExecutor) ==========

_executor = ThreadPoolExecutor(max_workers=settings.EXTRACTION_CONCURRENCY)


def _extract_cell_in_thread(
    paper_id: str,
    column_id: str,
    column_prompt: str,
) -> CellUpdate:
    """Run a single LLM extraction in a worker thread.

    Args:
        paper_id: Paper identifier.
        column_id: Column identifier.
        column_prompt: Extraction instruction.

    Returns:
        CellUpdate with the extraction result.
    """
    paper_data = get_paper(paper_id)
    if not paper_data:
        logger.warning("Paper %s not found in cache", paper_id)
        return CellUpdate(
            paper_id=paper_id,
            column_id=column_id,
            status="error",
            value="Paper data not available",
        )

    try:
        llm_result = extract_cell_sync(paper_data, column_prompt)
    except ExtractionError as e:
        return CellUpdate(
            paper_id=paper_id,
            column_id=column_id,
            status="error",
            value=e.message,
        )

    if llm_result:
        evidence = Evidence(
            text=llm_result.get("evidence_text", ""),
            page=1,
            confidence=0.85,
        )
        return CellUpdate(
            paper_id=paper_id,
            column_id=column_id,
            status="completed",
            value=llm_result["value"],
            evidence=evidence,
        )

    return CellUpdate(paper_id=paper_id, column_id=column_id, status="na")


async def _llm_batch_stream(
    paper_ids: list[str],
    column_ids: list[str],
    column_prompts: dict[str, str],
) -> AsyncGenerator[str, None]:
    """Launch all (paper, column) extractions in thread pool, stream results."""
    loop = asyncio.get_event_loop()
    total = len(paper_ids) * len(column_ids)

    # Send all loading events first
    for paper_id in paper_ids:
        for column_id in column_ids:
            loading = CellUpdate(paper_id=paper_id, column_id=column_id, status="loading")
            yield sse_event("cell_update", loading.model_dump_json())

    # Submit all tasks to thread pool
    futures = []
    for paper_id in paper_ids:
        for column_id in column_ids:
            prompt = column_prompts.get(column_id, "")
            future = loop.run_in_executor(
                _executor,
                _extract_cell_in_thread,
                paper_id,
                column_id,
                prompt,
            )
            futures.append(future)

    # Yield results as each thread completes
    completed_cells = 0
    for coro in asyncio.as_completed(futures):
        result: CellUpdate = await coro
        yield sse_event("cell_update", result.model_dump_json())
        completed_cells += 1

    yield sse_event("complete", json.dumps({"completed": completed_cells, "total": total}))


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
        prompts = {column_id: column_prompt}
        async for event in _llm_batch_stream(paper_ids, [column_id], prompts):
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
