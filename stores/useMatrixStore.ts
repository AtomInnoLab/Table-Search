/**
 * Matrix表格状态管理
 */
import { create } from 'zustand'
import type { Paper, Column, CellData, Project } from '@/types'

interface HydrateData {
  sessionId: string | null
  query: string
  papers: Paper[]
  columns: Column[]
  cells: [string, CellData][]
  totalSearched: number
}

interface MatrixStore {
  // State
  sessionId: string | null
  query: string
  papers: Paper[]
  columns: Column[]
  cells: Map<string, CellData>
  isSearching: boolean
  isExtracting: boolean
  currentPage: number
  hasMore: boolean
  newPaperIds: Set<string>
  totalSearched: number
  visibleCount: number

  // 搜索
  setSessionId: (id: string) => void
  initSearch: (query: string) => void
  addPaper: (paper: Paper) => void
  clearNewPaperId: (id: string) => void
  setIsSearching: (v: boolean) => void
  setTotalSearched: (n: number) => void

  // 列
  addColumn: (column: Column) => void
  removeColumn: (columnId: string) => void
  updateColumn: (columnId: string, updates: Partial<Column>) => void
  clearColumnCells: (columnId: string) => void

  // 单元格
  updateCell: (cellData: CellData) => void
  setIsExtracting: (v: boolean) => void

  // 分页
  incrementPage: () => void
  setHasMore: (v: boolean) => void
  showMore: () => void

  // 恢复
  hydrateFromProject: (data: HydrateData) => void

  // 重置
  reset: () => void
}

const cellKey = (paperId: string, columnId: string) => `${paperId}_${columnId}`

export const useMatrixStore = create<MatrixStore>((set, get) => ({
  sessionId: null,
  query: '',
  papers: [],
  columns: [],
  cells: new Map(),
  isSearching: false,
  isExtracting: false,
  currentPage: 1,
  hasMore: true,
  newPaperIds: new Set(),
  totalSearched: 0,
  visibleCount: 10,

  setSessionId: (sessionId) => set({ sessionId }),

  initSearch: (query) =>
    set({
      sessionId: null,
      query,
      papers: [],
      columns: [],
      cells: new Map(),
      isSearching: true,
      isExtracting: false,
      currentPage: 1,
      hasMore: true,
      newPaperIds: new Set(),
      totalSearched: 0,
      visibleCount: 10,
    }),

  addPaper: (paper) =>
    set((s) => {
      const newPaperIds = new Set(s.newPaperIds)
      newPaperIds.add(paper.id)
      return { papers: [...s.papers, paper], newPaperIds }
    }),

  clearNewPaperId: (id) =>
    set((s) => {
      const newPaperIds = new Set(s.newPaperIds)
      newPaperIds.delete(id)
      return { newPaperIds }
    }),

  setIsSearching: (isSearching) => set({ isSearching }),

  setTotalSearched: (totalSearched) => set({ totalSearched }),

  addColumn: (column) =>
    set((s) => ({
      columns: [...s.columns, column],
    })),

  removeColumn: (columnId) =>
    set((s) => {
      const newCells = new Map(s.cells)
      for (const key of newCells.keys()) {
        if (key.endsWith(`_${columnId}`)) newCells.delete(key)
      }
      return {
        columns: s.columns.filter((c) => c.id !== columnId),
        cells: newCells,
      }
    }),

  updateColumn: (columnId, updates) =>
    set((s) => ({
      columns: s.columns.map((c) => (c.id === columnId ? { ...c, ...updates } : c)),
    })),

  clearColumnCells: (columnId) =>
    set((s) => {
      const newCells = new Map(s.cells)
      for (const key of newCells.keys()) {
        if (key.endsWith(`_${columnId}`)) newCells.delete(key)
      }
      return { cells: newCells }
    }),

  updateCell: (cellData) =>
    set((s) => {
      const newCells = new Map(s.cells)
      newCells.set(cellKey(cellData.paper_id, cellData.column_id), cellData)
      return { cells: newCells }
    }),

  setIsExtracting: (isExtracting) => set({ isExtracting }),

  incrementPage: () => set((s) => ({ currentPage: s.currentPage + 1 })),

  setHasMore: (hasMore) => set({ hasMore }),

  showMore: () => set((s) => ({ visibleCount: s.visibleCount + 10 })),

  hydrateFromProject: (data) =>
    set({
      sessionId: data.sessionId,
      query: data.query,
      papers: data.papers,
      columns: data.columns,
      cells: new Map(data.cells),
      totalSearched: data.totalSearched,
      isSearching: false,
      isExtracting: false,
      currentPage: 1,
      hasMore: true,
      newPaperIds: new Set(),
      visibleCount: data.papers.length,
    }),

  reset: () =>
    set({
      sessionId: null,
      query: '',
      papers: [],
      columns: [],
      cells: new Map(),
      isSearching: false,
      isExtracting: false,
      currentPage: 1,
      hasMore: true,
      newPaperIds: new Set(),
      totalSearched: 0,
      visibleCount: 10,
    }),
}))
