"""LLM-based extraction service using MiniMax (OpenAI-compatible API)."""
import json
import logging
import re
from typing import Optional

from openai import (
    AsyncOpenAI,
    OpenAI,
    AuthenticationError,
    APIConnectionError,
    RateLimitError,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "You are an academic paper analyst. Given a paper's metadata, "
    "extract the requested information.\n\n"
    "Rules:\n"
    "1. Respond ONLY with a single JSON object, nothing else.\n"
    "2. Do NOT include any explanation, reasoning, or thinking.\n"
    '3. Format: {"value": "concise answer", "evidence": "quote from abstract"}\n'
    '4. If not available: {"value": null, "evidence": null}\n'
    "5. Use your knowledge about well-known papers to supplement the abstract."
)


def _build_user_prompt(paper_data: dict, column_prompt: str) -> str:
    """Build the user prompt from paper metadata and column prompt.

    Args:
        paper_data: Dict with title, abstract, authors, year.
        column_prompt: The extraction instruction for this column.

    Returns:
        Formatted user prompt string.
    """
    title = paper_data.get("title", "Unknown")
    year = paper_data.get("year", "Unknown")
    authors = paper_data.get("authors", [])
    abstract = paper_data.get("abstract", "No abstract available.")

    if isinstance(authors, list):
        authors_str = ", ".join(authors)
    else:
        authors_str = str(authors)

    return (
        f"Paper: {title} ({year})\n"
        f"Authors: {authors_str}\n"
        f"Abstract: {abstract}\n\n"
        f"Extract: {column_prompt}"
    )


def _get_client() -> AsyncOpenAI:
    """Create an AsyncOpenAI client configured for MiniMax.

    Returns:
        Configured AsyncOpenAI client.
    """
    return AsyncOpenAI(
        api_key=settings.MINIMAX_API_KEY,
        base_url=settings.MINIMAX_BASE_URL,
    )


class ExtractionError(Exception):
    """Raised when LLM API call fails (auth, network, rate-limit, etc.)."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


async def extract_cell_with_llm(
    paper_data: dict,
    column_prompt: str,
) -> Optional[dict]:
    """Extract a single cell value from paper metadata using LLM.

    Args:
        paper_data: Dict with title, abstract, authors, year.
        column_prompt: The extraction instruction for this column.

    Returns:
        Dict with 'value' and 'evidence_text' keys, or None if the
        information is not available in the paper.

    Raises:
        ExtractionError: When the LLM API call fails.
    """
    client = _get_client()
    user_prompt = _build_user_prompt(paper_data, column_prompt)

    try:
        response = await client.chat.completions.create(
            model=settings.MINIMAX_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=512,
        )
    except AuthenticationError as e:
        logger.error("LLM authentication failed: %s", e)
        raise ExtractionError("LLM API key invalid or expired") from e
    except RateLimitError as e:
        logger.error("LLM rate limit hit: %s", e)
        raise ExtractionError("LLM API rate limit exceeded, please retry later") from e
    except APIConnectionError as e:
        logger.error("LLM connection failed: %s", e)
        raise ExtractionError("Cannot connect to LLM API") from e
    except Exception as e:
        logger.exception("LLM extraction failed for paper: %s", paper_data.get("title"))
        raise ExtractionError(f"LLM API error: {e}") from e

    try:
        content = response.choices[0].message.content
        if not content:
            logger.warning("Empty response from LLM for paper: %s", paper_data.get("title"))
            return None

        # Strip <think>...</think> blocks (reasoning models)
        content = content.strip()
        content = re.sub(r"<think>[\s\S]*?</think>", "", content).strip()

        # Strip markdown code fences if present
        if content.startswith("```"):
            content = content.split("\n", 1)[-1]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        # If content is empty after stripping (model only produced thinking),
        # return None
        if not content:
            logger.warning(
                "LLM response was empty after stripping think tags for paper: %s",
                paper_data.get("title"),
            )
            return None

        result = json.loads(content)

        if result.get("value") is None:
            return None

        return {
            "value": str(result["value"]),
            "evidence_text": result.get("evidence") or "",
        }

    except json.JSONDecodeError:
        logger.error(
            "Failed to parse LLM response as JSON for paper: %s, raw: %s",
            paper_data.get("title"),
            content,
        )
        return None


# ========== Sync extraction for thread pool ==========

_sync_client: Optional[OpenAI] = None


def _get_sync_client() -> OpenAI:
    """Get or create a thread-safe sync OpenAI client.

    Returns:
        Configured sync OpenAI client.
    """
    global _sync_client
    if _sync_client is None:
        _sync_client = OpenAI(
            api_key=settings.MINIMAX_API_KEY,
            base_url=settings.MINIMAX_BASE_URL,
        )
    return _sync_client


def _parse_llm_content(content: Optional[str], title: str) -> Optional[dict]:
    """Parse LLM response content into structured result.

    Args:
        content: Raw LLM response content.
        title: Paper title for logging.

    Returns:
        Dict with 'value' and 'evidence_text', or None.
    """
    if not content:
        logger.warning("Empty response from LLM for paper: %s", title)
        return None

    content = content.strip()
    content = re.sub(r"<think>[\s\S]*?</think>", "", content).strip()

    if content.startswith("```"):
        content = content.split("\n", 1)[-1]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

    if not content:
        logger.warning("LLM response empty after stripping for paper: %s", title)
        return None

    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        logger.error("Failed to parse LLM JSON for paper: %s, raw: %s", title, content)
        return None

    if result.get("value") is None:
        return None

    return {
        "value": str(result["value"]),
        "evidence_text": result.get("evidence") or "",
    }


def extract_cell_sync(paper_data: dict, column_prompt: str) -> Optional[dict]:
    """Sync extraction for use in ThreadPoolExecutor.

    Args:
        paper_data: Dict with title, abstract, authors, year.
        column_prompt: The extraction instruction for this column.

    Returns:
        Dict with 'value' and 'evidence_text', or None.

    Raises:
        ExtractionError: When the LLM API call fails.
    """
    client = _get_sync_client()
    user_prompt = _build_user_prompt(paper_data, column_prompt)

    try:
        response = client.chat.completions.create(
            model=settings.MINIMAX_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=512,
        )
    except AuthenticationError as e:
        logger.error("LLM authentication failed: %s", e)
        raise ExtractionError("LLM API key invalid or expired") from e
    except RateLimitError as e:
        logger.error("LLM rate limit hit: %s", e)
        raise ExtractionError("LLM API rate limit exceeded, please retry later") from e
    except APIConnectionError as e:
        logger.error("LLM connection failed: %s", e)
        raise ExtractionError("Cannot connect to LLM API") from e
    except Exception as e:
        logger.exception("LLM extraction failed for paper: %s", paper_data.get("title"))
        raise ExtractionError(f"LLM API error: {e}") from e

    return _parse_llm_content(
        response.choices[0].message.content,
        paper_data.get("title", "Unknown"),
    )
