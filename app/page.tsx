'use client'

import { useRef, useEffect, useCallback } from 'react'
import SearchBar from '@/components/SearchBar'
import type { SearchBarHandle } from '@/components/SearchBar'
import MatrixTable from '@/components/MatrixTable'
import ProjectPanel from '@/components/ProjectPanel'
import LanguageToggle from '@/components/LanguageToggle'
import { useMatrixStore } from '@/stores/useMatrixStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useLocaleStore, useLocaleHydration } from '@/stores/useLocaleStore'
import { useT } from '@/i18n'

export default function Home() {
  useLocaleHydration()
  const sessionId = useMatrixStore((s) => s.sessionId)
  const papers = useMatrixStore((s) => s.papers)
  const isSearching = useMatrixStore((s) => s.isSearching)
  const isExtracting = useMatrixStore((s) => s.isExtracting)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const saveCurrentAsProject = useProjectStore((s) => s.saveCurrentAsProject)
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId)
  const searchBarRef = useRef<SearchBarHandle>(null)
  const locale = useLocaleStore((s) => s.locale)
  const t = useT()

  // Log ENVIRONMENT from server
  useEffect(() => {
    fetch('/agents/lit-matrix/api/env')
      .then((r) => r.json())
      .then((d) => console.log(`ENVIRONMENT=${d.ENVIRONMENT}`))
      .catch(() => {})
  }, [])

  // Sync html lang attribute
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  }, [locale])

  // Auto-save: when search/extraction finishes and we have data
  const prevBusyRef = useRef(false)
  useEffect(() => {
    const wasBusy = prevBusyRef.current
    const isBusy = isSearching || isExtracting
    prevBusyRef.current = isBusy

    if (wasBusy && !isBusy && papers.length > 0) {
      // Search or extraction just finished — auto-save
      saveCurrentAsProject()
    }
  }, [isSearching, isExtracting, papers.length, saveCurrentAsProject])

  // When user starts a new search, clear active project so a new one is created
  const query = useMatrixStore((s) => s.query)
  const prevQueryRef = useRef(query)
  useEffect(() => {
    if (query && query !== prevQueryRef.current) {
      setActiveProjectId(null)
    }
    prevQueryRef.current = query
  }, [query, setActiveProjectId])

  const reset = useMatrixStore((s) => s.reset)

  const handleLogoClick = useCallback(() => {
    reset()
    setActiveProjectId(null)
  }, [reset, setActiveProjectId])

  const hasResults = sessionId && papers.length > 0

  return (
    <main className="min-h-screen bg-[#f0f2f5]">
      {/* Test environment banner */}
      {process.env.NEXT_PUBLIC_ENV !== 'production' && (
        <div className="bg-red-600 text-white text-center py-1 text-xs font-bold tracking-widest">
          TEST ENVIRONMENT
        </div>
      )}
      {/* Top bar */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500">
        <div className="max-w-[1600px] mx-auto px-4 py-4 sm:px-8 sm:py-6">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <div className="text-left">
                <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                  {t('appTitle')}
                </h1>
                <p className="text-blue-100 text-[11px] sm:text-xs hidden sm:block">
                  {t('appSubtitle')}
                </p>
              </div>
            </button>
            <LanguageToggle />
          </div>
          <SearchBar ref={searchBarRef} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-3 py-4 sm:px-8 sm:py-6">
        {/* Matrix Table */}
        {hasResults && (
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-3 sm:p-5">
            <MatrixTable />
          </div>
        )}

        {/* Empty State */}
        {!hasResults && (
          <div className="mt-4 sm:mt-10 flex flex-col items-center text-center px-4">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center mb-5 sm:mb-6">
              <svg className="w-10 h-10 sm:w-14 sm:h-14 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
              {t('emptyTitle')}
            </h3>
            <p className="text-gray-400 text-sm max-w-lg leading-relaxed">
              {t('emptyDescription')}
            </p>
            <div className="mt-6 sm:mt-8 flex justify-center">
              <button
                onClick={() => searchBarRef.current?.typewrite('Find a paper using a distillation method to train models', { onboarding: true })}
                className="px-3 py-1.5 bg-white rounded-full text-xs text-gray-500 shadow-sm ring-1 ring-gray-200/60 hover:ring-indigo-300 hover:text-indigo-600 hover:shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Find a paper using a distillation method to train models
              </button>
            </div>

            {/* Recent Projects */}
            <div className="mt-8 sm:mt-10 w-full max-w-3xl">
              <ProjectPanel />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
