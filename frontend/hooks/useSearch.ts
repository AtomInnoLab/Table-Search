/**
 * 搜索 + 信息提取 编排 Hook
 *
 * 管理 SSE 生命周期：新搜索自动中止旧连接。
 */
'use client'

import { useRef, useCallback } from 'react'
import { useMatrixStore } from '@/stores/useMatrixStore'
import { SSEClient } from '@/lib/sse-client'
import { searchApi, extractApi } from '@/lib/api'
import type { Paper, Column, ColumnSuggestion } from '@/types'

export function useSearch() {
  const {
    isSearching,
    isExtracting,
    initSearch,
    setSessionId,
    addPaper,
    addColumn,
    setIsSearching,
    setIsExtracting,
    updateCell,
    setHasMore,
  } = useMatrixStore()

  const searchClientRef = useRef<SSEClient | null>(null)
  const extractClientRef = useRef<SSEClient | null>(null)

  const abortAll = useCallback(() => {
    searchClientRef.current?.disconnect()
    searchClientRef.current = null
    extractClientRef.current?.disconnect()
    extractClientRef.current = null
  }, [])

  // ---------- 内部：批量提取 ----------

  const startExtraction = useCallback(
    async (sid: string, paperIds: string[], columnIds: string[]) => {
      if (paperIds.length === 0 || columnIds.length === 0) return

      setIsExtracting(true)
      const client = new SSEClient()
      extractClientRef.current = client

      // Build column_id -> prompt mapping
      const { columns: allCols } = useMatrixStore.getState()
      const columnPrompts: Record<string, string> = {}
      for (const cid of columnIds) {
        const col = allCols.find((c) => c.id === cid)
        if (col) columnPrompts[cid] = col.prompt
      }

      await client.connectPost(extractApi.batch(), {
        session_id: sid,
        paper_ids: paperIds,
        column_ids: columnIds,
        column_prompts: columnPrompts,
      }, {
        onMessage: (event, data) => {
          if (event === 'cell_update') updateCell(data)
        },
        onComplete: () => setIsExtracting(false),
        onError: (err) => {
          console.error('Extraction SSE error:', err)
          setIsExtracting(false)
        },
      })
    },
    [setIsExtracting, updateCell],
  )

  // ---------- 搜索 ----------

  const doSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return
      abortAll()
      initSearch(query)

      const client = new SSEClient()
      searchClientRef.current = client

      let newSessionId = ''
      const paperIds: string[] = []
      const columnIds: string[] = []

      await client.connectPost(searchApi.stream(), {
        query,
        page: 1,
        page_size: 20,
      }, {
        onMessage: (event, data) => {
          if (event === 'session') {
            newSessionId = data.session_id
            setSessionId(newSessionId)
          } else if (event === 'paper') {
            addPaper(data as Paper)
            paperIds.push(data.id)
          } else if (event === 'column') {
            const s = data as ColumnSuggestion
            const col: Column = {
              id: s.id,
              name: s.name,
              prompt: s.prompt,
              column_type: 'auto',
              position: columnIds.length,
            }
            addColumn(col)
            columnIds.push(col.id)
          }
        },
        onComplete: () => {
          setIsSearching(false)
          // 如果首页就没拿到数据，说明没有更多了
          if (paperIds.length === 0) setHasMore(false)
          startExtraction(newSessionId, paperIds, columnIds)
        },
        onError: (err) => {
          console.error('Search SSE error:', err)
          setIsSearching(false)
        },
      })
    },
    [abortAll, initSearch, setSessionId, addPaper, addColumn, setIsSearching, setHasMore, startExtraction],
  )

  // ---------- 提取单列（自定义列） ----------

  const extractColumn = useCallback(
    async (columnId: string) => {
      const { sessionId: sid, papers, columns: allCols } = useMatrixStore.getState()
      const pids = papers.map((p) => p.id)
      if (!sid || pids.length === 0) return

      const col = allCols.find((c) => c.id === columnId)

      setIsExtracting(true)
      const client = new SSEClient()
      extractClientRef.current = client

      await client.connectPost(extractApi.column(), {
        session_id: sid,
        column_id: columnId,
        paper_ids: pids,
        column_prompt: col?.prompt || '',
      }, {
        onMessage: (event, data) => {
          if (event === 'cell_update') updateCell(data)
        },
        onComplete: () => setIsExtracting(false),
        onError: (err) => {
          console.error('Column extraction error:', err)
          setIsExtracting(false)
        },
      })
    },
    [setIsExtracting, updateCell],
  )

  // ---------- 加载更多 + 回填 ----------

  const loadMore = useCallback(
    async (page: number) => {
      const state = useMatrixStore.getState()
      if (!state.sessionId || !state.query) return

      setIsSearching(true)
      const client = new SSEClient()
      searchClientRef.current = client

      const newPaperIds: string[] = []
      const existingColumnIds = state.columns.map((c) => c.id)

      await client.connectPost(searchApi.stream(), {
        query: state.query,
        page,
        page_size: 20,
      }, {
        onMessage: (event, data) => {
          if (event === 'paper') {
            addPaper(data as Paper)
            newPaperIds.push(data.id)
          }
          // 加载更多时忽略 session / column 事件
        },
        onComplete: () => {
          setIsSearching(false)
          if (newPaperIds.length === 0) {
            setHasMore(false)
            return
          }
          // 回填：新论文 x 所有已有列
          if (existingColumnIds.length > 0) {
            startExtraction(state.sessionId!, newPaperIds, existingColumnIds)
          }
        },
        onError: (err) => {
          console.error('Load more error:', err)
          setIsSearching(false)
        },
      })
    },
    [addPaper, setIsSearching, setHasMore, startExtraction],
  )

  return { doSearch, extractColumn, loadMore, abortAll, isSearching, isExtracting }
}
