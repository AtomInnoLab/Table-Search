import { useCallback } from 'react'
import { useLocaleStore } from '@/stores/useLocaleStore'
import type { Messages, Locale } from './types'
import en from './en'
import zh from './zh'

export type { Locale, Messages }

const dictionaries: Record<Locale, Messages> = { en, zh }

type TranslateFn = (key: keyof Messages, params?: Record<string, string | number>) => string

export function useT(): TranslateFn {
  const locale = useLocaleStore((s) => s.locale)

  return useCallback(
    (key, params) => {
      let text = dictionaries[locale][key]
      if (params) {
        // Replace {key} placeholders
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
        }
        // Handle simple {key, plural, one {x} other {y}} patterns
        text = text.replace(
          /\{(\w+),\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g,
          (_match, paramKey, one, other) => {
            const val = params[paramKey]
            return val === 1 ? one : other
          },
        )
      }
      return text
    },
    [locale],
  )
}
