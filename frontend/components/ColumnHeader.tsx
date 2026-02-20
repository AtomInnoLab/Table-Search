'use client'

import { useState, useRef, useEffect } from 'react'
import { useMatrixStore } from '@/stores/useMatrixStore'
import { useSearch } from '@/hooks/useSearch'
import type { Column } from '@/types'

export default function ColumnHeader({ column }: { column: Column }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(column.prompt)
  const menuRef = useRef<HTMLDivElement>(null)
  const removeColumn = useMatrixStore((s) => s.removeColumn)
  const updateColumn = useMatrixStore((s) => s.updateColumn)
  const clearColumnCells = useMatrixStore((s) => s.clearColumnCells)
  const { extractColumn } = useSearch()

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenuOpen(true)
  }

  const handleDelete = () => {
    removeColumn(column.id)
    setMenuOpen(false)
  }

  const handleEditStart = () => {
    setEditing(true)
    setEditValue(column.prompt)
    setMenuOpen(false)
  }

  const handleEditSave = () => {
    const newPrompt = editValue.trim()
    if (newPrompt && newPrompt !== column.prompt) {
      updateColumn(column.id, { name: newPrompt, prompt: newPrompt })
      clearColumnCells(column.id)
      extractColumn(column.id)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[140px]">
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleEditSave()
            if (e.key === 'Escape') setEditing(false)
          }}
          onBlur={handleEditSave}
          className="flex-1 px-2 py-1 text-xs border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white text-gray-800 normal-case"
        />
      </div>
    )
  }

  return (
    <div className="relative flex items-center gap-1.5 min-w-[140px]" onContextMenu={handleContextMenu}>
      <span className="truncate cursor-default normal-case text-[11px] font-semibold" title={column.prompt}>
        {column.name}
      </span>
      {column.column_type === 'auto' && (
        <span className="shrink-0 text-[8px] leading-3 font-bold bg-indigo-100 text-indigo-500 px-1 py-0.5 rounded">
          AUTO
        </span>
      )}
      {column.column_type === 'custom' && (
        <span className="shrink-0 text-[8px] leading-3 font-bold bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded">
          CUSTOM
        </span>
      )}

      {/* Context menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[150px] overflow-hidden"
        >
          <button
            onClick={handleEditStart}
            className="w-full px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit definition
          </button>
          <button
            onClick={handleDelete}
            className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Delete column
          </button>
        </div>
      )}
    </div>
  )
}
