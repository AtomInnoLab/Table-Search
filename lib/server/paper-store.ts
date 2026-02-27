/**
 * In-memory paper cache (replaces backend/app/services/paper_store.py)
 *
 * Stores paper metadata during search so the extraction service
 * can access it without re-fetching.
 */

const paperCache = new Map<string, Record<string, unknown>>()

export function storePaper(
  paperId: string,
  paperData: Record<string, unknown>,
): void {
  paperCache.set(paperId, paperData)
}

export function getPaper(
  paperId: string,
): Record<string, unknown> | undefined {
  return paperCache.get(paperId)
}

export function clearAll(): void {
  paperCache.clear()
}
