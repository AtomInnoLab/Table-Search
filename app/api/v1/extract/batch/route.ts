/**
 * POST /api/v1/extract/batch — SSE batch extraction
 * (replaces backend/app/api/routes/extract.py extract_batch)
 */
import { NextRequest } from 'next/server'
import { config } from '@/lib/server/config'
import { getPaper } from '@/lib/server/paper-store'
import { getMockCellValue } from '@/lib/server/mock-data'
import { extractCellWithLlm, ExtractionError } from '@/lib/server/extraction'

export const runtime = 'nodejs'

function sseEvent(event: string, data: string): string {
  return `event: ${event}\ndata: ${data}\n\n`
}

function cellUpdateJson(
  paperId: string,
  columnId: string,
  status: string,
  value?: string | null,
  evidence?: { text: string; page: number; bbox?: number[]; confidence: number } | null,
): string {
  return JSON.stringify({
    paper_id: paperId,
    column_id: columnId,
    status,
    ...(value != null && { value }),
    ...(evidence && { evidence }),
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ========== Mock batch extraction ==========

function mockBatchStream(
  paperIds: string[],
  columnIds: string[],
  columnPrompts: Record<string, string>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      let completed = 0
      const total = paperIds.length * columnIds.length

      for (const paperId of paperIds) {
        for (const columnId of columnIds) {
          // loading
          controller.enqueue(
            encoder.encode(
              sseEvent(
                'cell_update',
                cellUpdateJson(paperId, columnId, 'loading'),
              ),
            ),
          )

          await sleep(150 + Math.random() * 450)

          const mockData = getMockCellValue(
            paperId,
            columnId,
            columnPrompts[columnId] || '',
          )

          if (mockData) {
            controller.enqueue(
              encoder.encode(
                sseEvent(
                  'cell_update',
                  cellUpdateJson(paperId, columnId, 'completed', mockData.value, {
                    text: `Evidence text for '${mockData.value}'...`,
                    page: mockData.page || 1,
                    bbox: [100.0, 200.0, 400.0, 220.0],
                    confidence: 0.92,
                  }),
                ),
              ),
            )
          } else {
            controller.enqueue(
              encoder.encode(
                sseEvent(
                  'cell_update',
                  cellUpdateJson(paperId, columnId, 'na'),
                ),
              ),
            )
          }
          completed++
        }
      }

      controller.enqueue(
        encoder.encode(
          sseEvent('complete', JSON.stringify({ completed, total })),
        ),
      )
      controller.close()
    },
  })
}

// ========== Real LLM batch extraction ==========

function llmBatchStream(
  paperIds: string[],
  columnIds: string[],
  columnPrompts: Record<string, string>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const total = paperIds.length * columnIds.length

      // Send all loading events first
      for (const paperId of paperIds) {
        for (const columnId of columnIds) {
          controller.enqueue(
            encoder.encode(
              sseEvent(
                'cell_update',
                cellUpdateJson(paperId, columnId, 'loading'),
              ),
            ),
          )
        }
      }

      // Build all tasks
      const tasks: Array<{
        paperId: string
        columnId: string
        prompt: string
      }> = []
      for (const paperId of paperIds) {
        for (const columnId of columnIds) {
          tasks.push({
            paperId,
            columnId,
            prompt: columnPrompts[columnId] || '',
          })
        }
      }

      // Run with concurrency limit
      let completedCells = 0
      const concurrency = config.EXTRACTION_CONCURRENCY
      let idx = 0

      async function runTask(task: {
        paperId: string
        columnId: string
        prompt: string
      }) {
        const paperData = getPaper(task.paperId)
        if (!paperData) {
          return sseEvent(
            'cell_update',
            cellUpdateJson(
              task.paperId,
              task.columnId,
              'error',
              'Paper data not available',
            ),
          )
        }

        try {
          const result = await extractCellWithLlm(paperData, task.prompt)
          if (result) {
            return sseEvent(
              'cell_update',
              cellUpdateJson(task.paperId, task.columnId, 'completed', result.value, {
                text: result.evidence_text,
                page: 1,
                confidence: 0.85,
              }),
            )
          }
          return sseEvent(
            'cell_update',
            cellUpdateJson(task.paperId, task.columnId, 'na'),
          )
        } catch (err) {
          const msg =
            err instanceof ExtractionError
              ? err.message
              : 'Extraction failed'
          return sseEvent(
            'cell_update',
            cellUpdateJson(task.paperId, task.columnId, 'error', msg),
          )
        }
      }

      // Process tasks with concurrency limit
      const promises: Promise<void>[] = []

      function startNext(): Promise<void> | undefined {
        if (idx >= tasks.length) return undefined
        const task = tasks[idx++]
        const p = runTask(task).then((event) => {
          controller.enqueue(encoder.encode(event))
          completedCells++
          const next = startNext()
          if (next) return next
        })
        return p
      }

      // Kick off initial batch
      for (let i = 0; i < Math.min(concurrency, tasks.length); i++) {
        const p = startNext()
        if (p) promises.push(p)
      }

      await Promise.all(promises)

      controller.enqueue(
        encoder.encode(
          sseEvent(
            'complete',
            JSON.stringify({ completed: completedCells, total }),
          ),
        ),
      )
      controller.close()
    },
  })
}

// ========== Route handler ==========

export async function POST(request: NextRequest) {
  const body = await request.json()
  const paperIds = body.paper_ids as string[]
  const columnIds = body.column_ids as string[]
  const columnPrompts = (body.column_prompts || {}) as Record<string, string>

  const stream = config.USE_MOCK_EXTRACTION
    ? mockBatchStream(paperIds, columnIds, columnPrompts)
    : llmBatchStream(paperIds, columnIds, columnPrompts)

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
