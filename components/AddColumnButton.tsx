'use client'

import { useState, useRef, useEffect } from 'react'
import { useMatrixStore } from '@/stores/useMatrixStore'
import { useSearch } from '@/hooks/useSearch'
import { useT } from '@/i18n'

export default function AddColumnButton() {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const columns = useMatrixStore((s) => s.columns)
  const addColumn = useMatrixStore((s) => s.addColumn)
  const { extractColumn } = useSearch()
  const t = useT()

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const handleSubmit = () => {
    const text = prompt.trim()
    if (!text) return

    const colId = `col_custom_${Date.now()}`
    const newCol = {
      id: colId,
      name: text,
      prompt: text,
      column_type: 'custom' as const,
      position: columns.length,
    }

    addColumn(newCol)
    setPrompt('')
    setOpen(false)
    extractColumn(colId)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') {
      setOpen(false)
      setPrompt('')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-8 h-8 rounded-lg border-2 border-dashed border-gray-200 text-gray-300 hover:border-indigo-300 hover:text-indigo-400 hover:bg-indigo-50/50 transition-all"
        title={t('addColumnTooltip')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 min-w-[220px]">
      <input
        ref={inputRef}
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('addColumnPlaceholder')}
        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
      />
      <button
        onClick={handleSubmit}
        disabled={!prompt.trim()}
        className="px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {t('addColumnButton')}
      </button>
      <button
        onClick={() => { setOpen(false); setPrompt('') }}
        className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  )
}
