'use client'

import { useLocaleStore } from '@/stores/useLocaleStore'
import { useT } from '@/i18n'

export default function LanguageToggle() {
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  const t = useT()

  return (
    <div className="flex items-center bg-white/15 backdrop-blur-sm rounded-lg border border-white/20 overflow-hidden text-xs font-medium">
      <button
        onClick={() => setLocale('en')}
        className={`px-2.5 py-1.5 transition-colors ${
          locale === 'en'
            ? 'bg-white/25 text-white'
            : 'text-white/60 hover:text-white/80'
        }`}
      >
        {t('langEN')}
      </button>
      <span className="w-px h-4 bg-white/20" />
      <button
        onClick={() => setLocale('zh')}
        className={`px-2.5 py-1.5 transition-colors ${
          locale === 'zh'
            ? 'bg-white/25 text-white'
            : 'text-white/60 hover:text-white/80'
        }`}
      >
        {t('langZH')}
      </button>
    </div>
  )
}
