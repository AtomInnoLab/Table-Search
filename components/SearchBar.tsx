'use client'

import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react'
import { useMatrixStore } from '@/stores/useMatrixStore'
import { useSearch } from '@/hooks/useSearch'
import { useT } from '@/i18n'
import { quotaApi } from '@/lib/api'
import { getVisitorHeaders } from '@/lib/visitor'

export interface SearchBarHandle {
  typewrite: (text: string, opts?: { onboarding?: boolean }) => void
}

const SearchBar = forwardRef<SearchBarHandle>(function SearchBar(_props, ref) {
  const [inputValue, setInputValue] = useState('')
  const [quota, setQuota] = useState<{ remainingCredits: string } | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const query = useMatrixStore((s) => s.query)
  const { doSearch, isSearching } = useSearch()
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSearchingRef = useRef(false)
  const t = useT()

  const fetchQuota = useCallback(() => {
    fetch(quotaApi.benefit(), { method: 'POST', headers: getVisitorHeaders(), credentials: 'include' })
      .then((r) => {
        if (r.status === 401) {
          setShowLoginModal(true)
          return null
        }
        return r.ok ? r.json() : null
      })
      .then((data) => { if (data) setQuota(data) })
      .catch(() => {})
  }, [t])

  // Fetch quota on mount
  useEffect(() => { fetchQuota() }, [fetchQuota])

  // Refetch quota when search completes (isSearching: true → false)
  useEffect(() => {
    if (prevSearchingRef.current && !isSearching) {
      fetchQuota()
    }
    prevSearchingRef.current = isSearching
  }, [isSearching, fetchQuota])

  // Sync inputValue when query changes externally (e.g. loading a project)
  useEffect(() => {
    if (query && !typingRef.current) {
      setInputValue(query)
    }
  }, [query])

  useEffect(() => {
    return () => {
      if (typingRef.current) clearTimeout(typingRef.current)
    }
  }, [])

  const typewrite = useCallback((text: string, opts?: { onboarding?: boolean }) => {
    if (typingRef.current) clearTimeout(typingRef.current)
    setInputValue('')
    let i = 0
    const tick = () => {
      i++
      setInputValue(text.slice(0, i))
      if (i < text.length) {
        typingRef.current = setTimeout(tick, 30 + Math.random() * 40)
      } else {
        typingRef.current = null
        doSearch(text, opts)
      }
    }
    typingRef.current = setTimeout(tick, 100)
  }, [doSearch])

  useImperativeHandle(ref, () => ({ typewrite }), [typewrite])

  const handleSearch = () => {
    if (inputValue.trim() && !isSearching) {
      if (typingRef.current) {
        clearTimeout(typingRef.current)
        typingRef.current = null
      }
      doSearch(inputValue.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="w-full">
      <div className="relative flex items-center">
        {/* Search icon */}
        <div className="absolute left-3 sm:left-4 pointer-events-none">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('searchPlaceholder')}
          disabled={isSearching}
          className="w-full pl-9 pr-20 py-2.5 sm:pl-12 sm:pr-28 sm:py-3.5 text-sm sm:text-base bg-white/15 backdrop-blur-sm text-white placeholder-white/40 border border-white/20 rounded-xl focus:outline-none focus:bg-white/20 focus:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        />

        <button
          onClick={handleSearch}
          disabled={isSearching || !inputValue.trim()}
          className={`absolute right-1.5 sm:right-2 px-3 py-1.5 sm:px-5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            isSearching || !inputValue.trim()
              ? 'bg-white/10 text-white/30 cursor-not-allowed'
              : 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-sm'
          }`}
        >
          {isSearching ? (
            <span className="flex items-center gap-1.5">
              <svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="hidden sm:inline">{t('searchingButton')}</span>
            </span>
          ) : (
            t('searchButton')
          )}
        </button>
      </div>

      {quota && (
        <div className="mt-2 text-xs text-white/50">
          {t('remainingCredits', { credits: Math.floor(Number(quota.remainingCredits)).toLocaleString() })}
        </div>
      )}

      {/* Login required modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('loginRequired')}</h3>
              <p className="text-sm text-gray-500 mb-6">{t('loginRequiredDesc')}</p>
              <button
                onClick={() => { window.location.href = '/app/search' }}
                className="w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
              >
                {t('loginButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default SearchBar
