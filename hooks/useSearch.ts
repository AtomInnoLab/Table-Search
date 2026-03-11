/**
 * 搜索 + 信息提取 编排 Hook
 *
 * 管理 SSE 生命周期：新搜索自动中止旧连接。
 */
'use client'

import { useRef, useCallback } from 'react'
import { useMatrixStore } from '@/stores/useMatrixStore'
import { SSEClient } from '@/lib/sse-client'
import { searchApi, extractApi, paperApi } from '@/lib/api'
import { getVisitorHeaders } from '@/lib/visitor'
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
    setTotalSearched,
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
      }, getVisitorHeaders())
    },
    [setIsExtracting, updateCell],
  )

  // ---------- 搜索 ----------

  const doSearch = useCallback(
    async (query: string, opts?: { onboarding?: boolean }) => {
      if (!query.trim()) return
      abortAll()
      initSearch(query)

      const client = new SSEClient()
      searchClientRef.current = client

      let newSessionId = ''
      const paperIds: string[] = []
      const columnIds: string[] = []
      let extractionTriggered = false

      const tryEarlyExtraction = () => {
        if (extractionTriggered) return
        const { visibleCount } = useMatrixStore.getState()
        if (paperIds.length >= visibleCount && columnIds.length > 0) {
          extractionTriggered = true
          const visiblePaperIds = paperIds.slice(0, visibleCount)
          startExtraction(newSessionId, visiblePaperIds, [...columnIds])
        }
      }

      const url = opts?.onboarding ? searchApi.onboarding() : searchApi.stream()
      const body = opts?.onboarding ? {} : { query, page: 1, page_size: 20 }

      await client.connectPost(url, body, {
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
            // 收到 column 时检查是否已有足够论文，立即开始抽取
            tryEarlyExtraction()
          }
        },
        onComplete: (data) => {
          setIsSearching(false)
          if (data?.searched) setTotalSearched(data.searched)
          if (paperIds.length === 0) setHasMore(false)
          // 如果论文不足 10 篇，在 complete 时触发抽取
          if (!extractionTriggered && paperIds.length > 0 && columnIds.length > 0) {
            extractionTriggered = true
            startExtraction(newSessionId, paperIds, columnIds)
          }
        },
        onError: (err) => {
          console.error('Search SSE error:', err)
          setIsSearching(false)
        },
      }, getVisitorHeaders())
    },
    [abortAll, initSearch, setSessionId, addPaper, addColumn, setIsSearching, setHasMore, startExtraction],
  )

  // ---------- 提取单列（自定义列） ----------

  const extractColumn = useCallback(
    async (columnId: string) => {
      const { sessionId: sid, papers, columns: allCols, visibleCount } = useMatrixStore.getState()
      const pids = papers.slice(0, visibleCount).map((p) => p.id)
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
      }, getVisitorHeaders())
    },
    [setIsExtracting, updateCell],
  )

  // ---------- 对新显示的论文触发提取 ----------

  const startExtractionForVisible = useCallback(() => {
    const { sessionId: sid, papers, columns, cells, visibleCount } = useMatrixStore.getState()
    if (!sid || columns.length === 0) return

    const columnIds = columns.map((c) => c.id)
    // Find visible papers that haven't been extracted yet
    const visiblePapers = papers.slice(0, visibleCount)
    const unextractedIds = visiblePapers
      .filter((p) => !cells.has(`${p.id}_${columnIds[0]}`))
      .map((p) => p.id)

    if (unextractedIds.length > 0) {
      startExtraction(sid, unextractedIds, columnIds)
    }
  }, [startExtraction])

  // ---------- 加载更多 + 回填 ----------

  const loadMore = useCallback(
    async (page: number) => {
      const state = useMatrixStore.getState()
      if (!state.sessionId || !state.query) return

      setIsSearching(true)
      const client = new SSEClient()
      searchClientRef.current = client

      const newPaperIds: string[] = []

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
          // 不自动提取，等用户点 Load More 显示后再提取
        },
        onError: (err) => {
          console.error('Load more error:', err)
          setIsSearching(false)
        },
      }, getVisitorHeaders())
    },
    [addPaper, setIsSearching, setHasMore],
  )

  // ---------- 恢复后端 paper cache ----------

  const restoreSession = useCallback(
    async (papers: Paper[]): Promise<string | null> => {
      try {
        const res = await fetch(paperApi.restore(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getVisitorHeaders() },
          credentials: 'include',
          body: JSON.stringify({ papers }),
        })
        if (!res.ok) return null
        const data = await res.json()
        return data.session_id || null
      } catch (err) {
        console.error('Restore session error:', err)
        return null
      }
    },
    [],
  )

  return { doSearch, extractColumn, loadMore, startExtractionForVisible, abortAll, restoreSession, isSearching, isExtracting }
}
