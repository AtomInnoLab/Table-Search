'use client'

import { useMemo, memo, useCallback, useState, useEffect, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table'
import { useMatrixStore } from '@/stores/useMatrixStore'
import AddColumnButton from '@/components/AddColumnButton'
import LoadMoreButton from '@/components/LoadMoreButton'
import ColumnHeader from '@/components/ColumnHeader'
import type { Paper, CellData, Column } from '@/types'

type TableRow = Paper
const columnHelper = createColumnHelper<TableRow>()

const FIXED_COLS_WIDTH = { title: 240, year: 64, authors: 150 }
const FROZEN_TOTAL = FIXED_COLS_WIDTH.title + FIXED_COLS_WIDTH.year + FIXED_COLS_WIDTH.authors
const DYNAMIC_COL_WIDTH = 200

export default function MatrixTable() {
  const papers = useMatrixStore((s) => s.papers)
  const columns = useMatrixStore((s) => s.columns)
  const isExtracting = useMatrixStore((s) => s.isExtracting)
  const cells = useMatrixStore((s) => s.cells)
  const newPaperIds = useMatrixStore((s) => s.newPaperIds)
  const clearNewPaperId = useMatrixStore((s) => s.clearNewPaperId)
  const totalSearched = useMatrixStore((s) => s.totalSearched)

  // Notification counter for newly added papers
  const [notifyCount, setNotifyCount] = useState(0)
  const [showNotify, setShowNotify] = useState(false)
  const prevNewSizeRef = useRef(0)

  useEffect(() => {
    const currentSize = newPaperIds.size
    // Only react to increases (new papers added), ignore decreases (animation cleanup)
    if (currentSize > prevNewSizeRef.current) {
      const delta = currentSize - prevNewSizeRef.current
      setNotifyCount((c) => c + delta)
      setShowNotify(true)
    }
    prevNewSizeRef.current = currentSize
  }, [newPaperIds.size])

  // Auto-fade notification after 3s of no new papers
  useEffect(() => {
    if (!showNotify) return
    const timer = setTimeout(() => {
      setShowNotify(false)
      setNotifyCount(0)
    }, 3000)
    return () => clearTimeout(timer)
  }, [showNotify, notifyCount])

  const getCellData = useCallback(
    (paperId: string, columnId: string): CellData | undefined =>
      cells.get(`${paperId}_${columnId}`),
    [cells],
  )

  if (papers.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center gap-2 text-gray-400">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Loading papers...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Extraction status */}
      {isExtracting && (
        <div className="mb-3 sm:mb-4 px-3 sm:px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-lg flex items-center gap-2.5">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
          </div>
          <span className="text-xs sm:text-sm font-medium text-blue-700">Extracting information from papers...</span>
        </div>
      )}

      {/* Notification badge */}
      {showNotify && notifyCount > 0 && (
        <div className="mb-3 flex justify-end">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-medium shadow-sm animate-row-highlight">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {notifyCount} new {notifyCount === 1 ? 'paper' : 'papers'} screened
          </span>
        </div>
      )}

      {/* Desktop: Table */}
      <div className="hidden md:block">
        <DesktopTable papers={papers} columns={columns} getCellData={getCellData} newPaperIds={newPaperIds} clearNewPaperId={clearNewPaperId} />
      </div>

      {/* Mobile: Cards */}
      <div className="block md:hidden">
        <MobileCards papers={papers} columns={columns} getCellData={getCellData} newPaperIds={newPaperIds} clearNewPaperId={clearNewPaperId} />
      </div>

      {/* Load more */}
      <LoadMoreButton />

      {/* Stats */}
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
        {totalSearched > 0 && (
          <>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              {totalSearched} 篇论文已搜索
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
          </>
        )}
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          {papers.length} 篇论文已添加
        </span>
        <span className="w-1 h-1 rounded-full bg-gray-300" />
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          {columns.length} dimensions
        </span>
      </div>
    </div>
  )
}

// ========== Desktop Table ==========

function DesktopTable({
  papers, columns, getCellData, newPaperIds, clearNewPaperId,
}: {
  papers: Paper[]
  columns: Column[]
  getCellData: (paperId: string, columnId: string) => CellData | undefined
  newPaperIds: Set<string>
  clearNewPaperId: (id: string) => void
}) {
  const tableColumns = useMemo<ColumnDef<TableRow, any>[]>(() => {
    const fixed: ColumnDef<TableRow, any>[] = [
      columnHelper.accessor('title', {
        id: '_title',
        header: () => <span className="whitespace-nowrap">Title</span>,
        cell: (info) => (
          <div className="font-medium text-gray-900 line-clamp-2 leading-snug">
            {info.getValue()}
          </div>
        ),
        size: FIXED_COLS_WIDTH.title,
        meta: { frozen: true },
      }),
      columnHelper.accessor('year', {
        id: '_year',
        header: 'Year',
        cell: (info) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium tabular-nums">
            {info.getValue()}
          </span>
        ),
        size: FIXED_COLS_WIDTH.year,
        meta: { frozen: true },
      }),
      columnHelper.accessor('authors', {
        id: '_authors',
        header: 'Authors',
        cell: (info) => {
          const a = info.getValue()
          return (
            <span className="text-gray-500 truncate block text-xs">
              {a.slice(0, 2).join(', ')}
              {a.length > 2 && ` +${a.length - 2}`}
            </span>
          )
        },
        size: FIXED_COLS_WIDTH.authors,
        meta: { frozen: true, isLastFrozen: true },
      }),
    ]

    const dynamic: ColumnDef<TableRow, any>[] = columns.map((col) =>
      columnHelper.display({
        id: col.id,
        header: () => <ColumnHeader column={col} />,
        cell: (info) => (
          <CellRenderer cellData={getCellData(info.row.original.id, col.id)} />
        ),
        size: DYNAMIC_COL_WIDTH,
      }),
    )

    return [...fixed, ...dynamic]
  }, [columns, getCellData])

  // Calculate total table width to prevent compression
  const tableMinWidth = FROZEN_TOTAL + columns.length * DYNAMIC_COL_WIDTH + 60

  const table = useReactTable({
    data: papers,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  })

  return (
    <div className="overflow-x-auto rounded-lg ring-1 ring-gray-200">
      <table className="border-collapse" style={{ minWidth: tableMinWidth }}>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const meta = header.column.columnDef.meta as any
                const frozen = meta?.frozen
                const isLastFrozen = meta?.isLastFrozen
                return (
                  <th
                    key={header.id}
                    className={`px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b-2 border-gray-100 ${
                      frozen
                        ? 'sticky z-20 bg-gradient-to-b from-gray-50 to-gray-100'
                        : 'bg-gradient-to-b from-gray-50 to-gray-100/80 border-r border-gray-100'
                    }`}
                    style={{
                      minWidth: header.getSize(),
                      width: header.getSize(),
                      ...(frozen ? stickyLeftStyle(header.column.id) : {}),
                      ...(isLastFrozen ? { boxShadow: '4px 0 8px -2px rgba(0,0,0,0.08)' } : {}),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                )
              })}
              <th className="px-3 py-3 bg-gradient-to-b from-gray-50 to-gray-100/80 border-b-2 border-gray-100 sticky right-0 z-20">
                <AddColumnButton />
              </th>
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((row, i) => {
            const rowBg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
            const isNew = newPaperIds.has(row.id)
            return (
              <tr
                key={row.id}
                className={`group transition-colors hover:bg-blue-50/50 ${rowBg} ${isNew ? 'animate-row-highlight' : ''}`}
                onAnimationEnd={() => clearNewPaperId(row.id)}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as any
                  const frozen = meta?.frozen
                  const isLastFrozen = meta?.isLastFrozen
                  return (
                    <td
                      key={cell.id}
                      className={`px-4 py-3.5 text-sm border-b border-gray-100 ${
                        frozen
                          ? `sticky z-10 ${rowBg} group-hover:bg-blue-50/50`
                          : 'border-r border-gray-50'
                      }`}
                      style={{
                        minWidth: cell.column.getSize(),
                        ...(frozen ? stickyLeftStyle(cell.column.id) : {}),
                        ...(isLastFrozen ? { boxShadow: '4px 0 8px -2px rgba(0,0,0,0.06)' } : {}),
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
                <td className={`sticky right-0 ${rowBg} group-hover:bg-blue-50/50 border-b border-gray-100`} />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ========== Mobile Cards ==========

function MobileCards({
  papers, columns, getCellData, newPaperIds, clearNewPaperId,
}: {
  papers: Paper[]
  columns: Column[]
  getCellData: (paperId: string, columnId: string) => CellData | undefined
  newPaperIds: Set<string>
  clearNewPaperId: (id: string) => void
}) {
  return (
    <div className="space-y-2.5">
      {columns.length > 0 && (
        <div className="flex items-center justify-between px-1 mb-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            {columns.length} dimensions
          </div>
          <AddColumnButton />
        </div>
      )}

      {papers.map((paper, i) => (
        <MobileCard
          key={paper.id}
          paper={paper}
          columns={columns}
          getCellData={getCellData}
          index={i}
          isNew={newPaperIds.has(paper.id)}
          clearNewPaperId={clearNewPaperId}
        />
      ))}
    </div>
  )
}

const MobileCard = memo(function MobileCard({
  paper, columns, getCellData, index, isNew, clearNewPaperId,
}: {
  paper: Paper
  columns: Column[]
  getCellData: (paperId: string, columnId: string) => CellData | undefined
  index: number
  isNew: boolean
  clearNewPaperId: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasData = columns.length > 0

  return (
    <div
      className={`rounded-xl overflow-hidden transition-shadow ${
        expanded ? 'shadow-md ring-1 ring-indigo-200' : 'shadow-sm ring-1 ring-gray-200/80'
      } ${isNew ? 'animate-row-highlight' : ''}`}
      onAnimationEnd={() => clearNewPaperId(paper.id)}
    >
      {/* Header */}
      <button
        className={`w-full text-left px-4 py-3 bg-white active:bg-gray-50 transition-colors`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          {/* Index badge */}
          <span className="shrink-0 mt-0.5 w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-semibold text-gray-900 leading-snug">
              {paper.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-semibold tabular-nums">
                {paper.year}
              </span>
              <span className="text-[11px] text-gray-400 truncate">
                {paper.authors.slice(0, 2).join(', ')}
                {paper.authors.length > 2 && ` +${paper.authors.length - 2}`}
              </span>
            </div>
          </div>
          {hasData && (
            <svg
              className={`shrink-0 w-4 h-4 text-gray-300 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && hasData && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 space-y-2.5">
          {columns.map((col) => {
            const cellData = getCellData(paper.id, col.id)
            return (
              <div key={col.id}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    {col.name}
                  </span>
                  {col.column_type === 'auto' && (
                    <span className="text-[8px] leading-3 font-bold bg-indigo-100 text-indigo-500 px-1 py-0.5 rounded">AUTO</span>
                  )}
                  {col.column_type === 'custom' && (
                    <span className="text-[8px] leading-3 font-bold bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded">CUSTOM</span>
                  )}
                </div>
                <div className="text-[13px] leading-relaxed">
                  <CellRenderer cellData={cellData} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})

// ========== Sticky left offsets ==========

function stickyLeftStyle(colId: string): React.CSSProperties {
  switch (colId) {
    case '_title': return { position: 'sticky', left: 0 }
    case '_year': return { position: 'sticky', left: FIXED_COLS_WIDTH.title }
    case '_authors': return { position: 'sticky', left: FIXED_COLS_WIDTH.title + FIXED_COLS_WIDTH.year }
    default: return {}
  }
}

// ========== CellRenderer ==========

const CellRenderer = memo(function CellRenderer({ cellData }: { cellData?: CellData }) {
  if (!cellData) return <span className="text-gray-200">--</span>

  switch (cellData.status) {
    case 'loading':
      return (
        <div className="flex items-center gap-2 text-gray-300">
          <div className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-gray-300 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-1 rounded-full bg-gray-300 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-1 rounded-full bg-gray-300 animate-bounce" />
          </div>
          <span className="text-xs">extracting</span>
        </div>
      )
    case 'completed':
      return (
        <div className="group/cell relative max-w-[180px]">
          <div className="text-gray-800 leading-snug text-xs line-clamp-2 cursor-default">{cellData.value}</div>
          {cellData.value && cellData.value.length > 30 && (
            <div className="invisible group-hover/cell:visible absolute z-50 left-0 bottom-full mb-1.5 w-64 max-h-48 overflow-y-auto p-2.5 bg-gray-900 text-white text-xs leading-relaxed rounded-lg shadow-xl pointer-events-none">
              {cellData.value}
            </div>
          )}
        </div>
      )
    case 'na':
      return <span className="text-gray-300 italic text-xs">N/A</span>
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 text-red-400 text-xs">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          Failed
        </span>
      )
    default:
      return <span className="text-gray-200">--</span>
  }
})
