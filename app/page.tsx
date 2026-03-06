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
    fetch('/agents/literature-matrix/api/env')
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
    <main className="bg-[#f0f2f5] min-h-screen">
      {/* Test environment banner */}
      {process.env.NEXT_PUBLIC_ENV !== 'production' && (
        <div className="bg-red-600 py-1 font-bold text-white text-xs text-center tracking-widest">
          TEST ENVIRONMENT
        </div>
      )}
      {/* Top bar */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500">
        <div className="mx-auto px-4 sm:px-8 py-4 sm:py-6 max-w-[1600px]">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <button
              onClick={handleLogoClick}
              className="group flex items-center gap-3 cursor-pointer"
            >
              <div className="flex justify-center items-center bg-white/20 group-hover:bg-white/30 backdrop-blur rounded-xl w-8 sm:w-10 h-8 sm:h-10 transition-colors">
                <svg className="w-5 sm:w-6 h-5 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <div className="text-left">
                <h1 className="font-bold text-white text-lg sm:text-2xl tracking-tight">
                  {t('appTitle')}
                </h1>
                <p className="hidden sm:block text-[11px] text-blue-100 sm:text-xs">
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
      <div className="mx-auto px-3 sm:px-8 py-4 sm:py-6 max-w-[1600px]">
        {/* Matrix Table */}
        {hasResults && (
          <div className="bg-white shadow-sm p-3 sm:p-5 rounded-xl ring-1 ring-black/5">
            <MatrixTable />
          </div>
        )}

        {/* Empty State */}
        {!hasResults && (
          <div className="flex flex-col items-center mt-4 sm:mt-10 px-4 text-center">
            <div className="flex justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100 mb-5 sm:mb-6 rounded-full w-20 sm:w-28 h-20 sm:h-28">
              <svg className="w-10 sm:w-14 h-10 sm:h-14 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="mb-2 font-semibold text-gray-800 text-lg sm:text-xl">
              {t('emptyTitle')}
            </h3>
            <p className="max-w-lg text-gray-400 text-sm leading-relaxed">
              {t('emptyDescription')}
            </p>
            <div className="flex justify-center mt-6 sm:mt-8">
              <button
                onClick={() => searchBarRef.current?.typewrite('Find a paper using a distillation method to train models', { onboarding: true })}
                className="bg-white shadow-sm hover:shadow-md px-3 py-1.5 rounded-full ring-1 ring-gray-200/60 hover:ring-indigo-300 text-gray-500 hover:text-indigo-600 text-xs active:scale-95 transition-all cursor-pointer"
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
