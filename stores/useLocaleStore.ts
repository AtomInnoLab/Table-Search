import { create } from 'zustand'
import { useEffect, useState } from 'react'
import type { Locale } from '@/i18n/types'

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem('locale')
  if (stored === 'en' || stored === 'zh') return stored
  const nav = navigator.language || ''
  return nav.startsWith('zh') ? 'zh' : 'en'
}

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
  _hydrate: () => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: 'en',
  setLocale: (locale) => {
    localStorage.setItem('locale', locale)
    set({ locale })
  },
  _hydrate: () => {
    set({ locale: detectLocale() })
  },
}))

/** Call once in top-level component to sync locale after hydration */
export function useLocaleHydration() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    if (!hydrated) {
      useLocaleStore.getState()._hydrate()
      setHydrated(true)
    }
  }, [hydrated])
}
