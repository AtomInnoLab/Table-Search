'use client'

import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react'
import { useMatrixStore } from '@/stores/useMatrixStore'
import { useSearch } from '@/hooks/useSearch'
import { useT } from '@/i18n'

export interface SearchBarHandle {
  typewrite: (text: string) => void
}

const SearchBar = forwardRef<SearchBarHandle>(function SearchBar(_props, ref) {
  const [inputValue, setInputValue] = useState('')
  const query = useMatrixStore((s) => s.query)
  const sessionId = useMatrixStore((s) => s.sessionId)
  const { doSearch, isSearching } = useSearch()
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const t = useT()

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

  const typewrite = useCallback((text: string) => {
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
        doSearch(text)
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

      {query && sessionId && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-100/70">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>{t('resultsFor')} <span className="text-white/90 font-medium">{query}</span></span>
        </div>
      )}
    </div>
  )
})

export default SearchBar
