"""搜索相关API路由"""
import asyncio
import json
import uuid
from typing import AsyncGenerator
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.schemas import SearchRequest, SearchResponse
from app.core.config import settings
from app.mocks.mock_data import get_mock_papers, get_suggested_columns
from app.services.paper_store import store_paper, clear_all as clear_paper_cache

router = APIRouter()


def sse_event(event: str, data: str) -> str:
    """构造单条SSE消息，event+data合并在一次yield中"""
    return f"event: {event}\ndata: {data}\n\n"


# ========== Mock 搜索 ==========

async def mock_search_stream(query: str, page: int, page_size: int) -> AsyncGenerator[str, None]:
    """Mock搜索事件流"""
    await asyncio.sleep(0.3)

    session_id = str(uuid.uuid4())
    yield sse_event("session", json.dumps({"session_id": session_id}))

    papers = get_mock_papers(query, page, page_size)
    for paper in papers:
        await asyncio.sleep(0.08)
        store_paper(paper.id, paper.model_dump())
        yield sse_event("paper", paper.model_dump_json())

    suggested_columns = get_suggested_columns(query)
    for column in suggested_columns:
        await asyncio.sleep(0.05)
        yield sse_event("column", column.model_dump_json())

    yield sse_event("complete", json.dumps({"total": len(papers), "query": query}))


# ========== Wispaper 真实搜索 ==========

async def wispaper_search_stream(query: str, page: int, page_size: int) -> AsyncGenerator[str, None]:
    """代理到Wispaper API，将其SSE事件转换为我们的格式"""
    import httpx

    clear_paper_cache()

    session_id = str(uuid.uuid4())
    yield sse_event("session", json.dumps({"session_id": session_id}))

    offset = (page - 1) * page_size

    body = {
        "message": query,
        "stream": False,
        "search_scholar": True,
        "slow_search": True,
        "offset": offset,
        "limit": page_size,
        "x-billing": "search",
    }

    headers = {
        "accept": "text/event-stream",
        "content-type": "application/json",
        "authorization": f"Bearer {settings.WISPAPER_AUTH_TOKEN}",
        "cache-control": "no-cache",
    }

    paper_count = 0
    seen_ids = set()
    columns_sent = False

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                settings.WISPAPER_API_URL,
                json=body,
                headers=headers,
            ) as response:
                if response.status_code != 200:
                    error_text = ""
                    async for chunk in response.aiter_text():
                        error_text += chunk
                    yield sse_event("error", json.dumps({
                        "message": f"Wispaper API error: {response.status_code}",
                        "detail": error_text[:500],
                    }))
                    yield sse_event("complete", json.dumps({"total": 0, "query": query}))
                    return

                buffer = ""
                async for chunk in response.aiter_text():
                    buffer += chunk
                    # 按双换行分割SSE消息
                    while "\n\n" in buffer:
                        msg, buffer = buffer.split("\n\n", 1)
                        msg = msg.strip()
                        if not msg.startswith("data: "):
                            continue

                        raw = msg[6:]

                        # 跳过 [PENDING] / [DONE]
                        if raw.startswith("[PENDING]"):
                            continue
                        if raw.startswith("[DONE]"):
                            break

                        try:
                            event_data = json.loads(raw)
                        except json.JSONDecodeError:
                            continue

                        event_type = event_data.get("event", "")
                        name = event_data.get("name", "")
                        data = event_data.get("data", {})

                        # 从 verification onAgentEnd 提取论文
                        if name == "verification" and event_type == "onAgentEnd":
                            meta = data.get("metadata")
                            if not meta or not meta.get("title"):
                                continue

                            paper_id = meta.get("uuid") or meta.get("id") or str(uuid.uuid4())
                            if paper_id in seen_ids:
                                continue
                            seen_ids.add(paper_id)

                            # 解析authors
                            authors_raw = meta.get("authors", "")
                            if isinstance(authors_raw, str):
                                authors = [a.strip() for a in authors_raw.split(",") if a.strip()]
                            else:
                                authors = authors_raw or []

                            paper = {
                                "id": paper_id,
                                "title": meta.get("title", ""),
                                "year": meta.get("year"),
                                "authors": authors[:10],
                                "abstract": meta.get("abstract", ""),
                                "url": meta.get("url", ""),
                                "pdf_url": meta.get("pdf_url"),
                                "doi": meta.get("doi"),
                                "venue": meta.get("venue"),
                                "citations": meta.get("citations"),
                                "score": meta.get("final_score"),
                            }

                            store_paper(paper_id, paper)
                            yield sse_event("paper", json.dumps(paper))
                            paper_count += 1

                        # 从 search_verify_agent onAgentEnd 提取criteria作为推荐列
                        elif name == "search_verify_agent" and event_type == "onAgentEnd" and not columns_sent:
                            content = data.get("content", {})
                            if isinstance(content, dict):
                                criteria = content.get("metadata", {}).get("criteria", [])
                                for i, c in enumerate(criteria):
                                    col = {
                                        "id": f"col_auto_{i}",
                                        "name": c.get("name", f"Dimension {i+1}"),
                                        "prompt": c.get("description", c.get("name", "")),
                                    }
                                    yield sse_event("column", json.dumps(col))
                                columns_sent = True

    except httpx.TimeoutException:
        yield sse_event("error", json.dumps({"message": "Search timeout"}))
    except Exception as e:
        yield sse_event("error", json.dumps({"message": f"Search error: {str(e)}"}))

    yield sse_event("complete", json.dumps({"total": paper_count, "query": query}))


# ========== 路由 ==========

@router.post("/search/stream")
async def search_stream(request: SearchRequest):
    """搜索论文（SSE流式接口）"""
    if settings.USE_MOCK_SEARCH:
        generator = mock_search_stream(request.query, request.page, request.page_size)
    else:
        generator = wispaper_search_stream(request.query, request.page, request.page_size)

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/search")
async def search(request: SearchRequest) -> SearchResponse:
    """搜索论文（传统REST接口，用于兼容）"""
    session_id = str(uuid.uuid4())
    papers = get_mock_papers(request.query, request.page, request.page_size)
    suggested_columns = get_suggested_columns(request.query)

    return SearchResponse(
        session_id=session_id,
        query=request.query,
        papers=papers,
        suggested_columns=suggested_columns,
        total=len(papers),
    )
