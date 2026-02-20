"""Paper data cache for extraction.

Stores paper metadata (title, abstract, authors, year) during search
so that the extraction service can access it without re-fetching.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Module-level in-memory cache: paper_id -> paper_data dict
_paper_cache: dict[str, dict] = {}


def store_paper(paper_id: str, paper_data: dict) -> None:
    """Cache a paper's metadata after search.

    Args:
        paper_id: Unique paper identifier.
        paper_data: Dict with keys like title, abstract, authors, year.
    """
    _paper_cache[paper_id] = paper_data
    logger.debug("Stored paper %s (total cached: %d)", paper_id, len(_paper_cache))


def get_paper(paper_id: str) -> Optional[dict]:
    """Retrieve cached paper metadata.

    Args:
        paper_id: Unique paper identifier.

    Returns:
        Paper data dict, or None if not found.
    """
    return _paper_cache.get(paper_id)


def clear_all() -> None:
    """Clear all cached papers (called at the start of a new search)."""
    count = len(_paper_cache)
    _paper_cache.clear()
    logger.debug("Cleared paper cache (%d entries removed)", count)
