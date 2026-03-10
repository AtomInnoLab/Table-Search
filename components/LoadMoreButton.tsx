'use client'

import { useMatrixStore } from '@/stores/useMatrixStore'
import { useSearch } from '@/hooks/useSearch'
import { useT } from '@/i18n'

export default function LoadMoreButton() {
  const papers = useMatrixStore((s) => s.papers)
  const visibleCount = useMatrixStore((s) => s.visibleCount)
  const hasMore = useMatrixStore((s) => s.hasMore)
  const currentPage = useMatrixStore((s) => s.currentPage)
  const incrementPage = useMatrixStore((s) => s.incrementPage)
  const showMore = useMatrixStore((s) => s.showMore)
  const { loadMore, startExtractionForVisible, isSearching, isExtracting } = useSearch()
  const t = useT()

  // Nothing more to show locally or from backend
  const hasHiddenPapers = visibleCount < papers.length
  if (!hasHiddenPapers && !hasMore) return null

  const loading = isSearching || isExtracting

  const handleClick = () => {
    if (loading) return
    if (hasHiddenPapers) {
      // Reveal next 10 locally and extract them
      showMore()
      startExtractionForVisible()
    } else {
      // Fetch more from backend
      const nextPage = currentPage + 1
      incrementPage()
      loadMore(nextPage)
    }
  }

  return (
    <div className="flex justify-center py-4">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`group flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${
          loading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-indigo-300 hover:text-indigo-600 hover:shadow-sm'
        }`}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {t('loadingMore')}
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m0 0l-4-4m4 4l4-4" />
            </svg>
            {t('loadMoreButton')}
          </>
        )}
      </button>
    </div>
  )
}
