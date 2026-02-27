/**
 * POST /api/v1/extract/column — SSE single column extraction
 * (replaces backend/app/api/routes/extract.py extract_column)
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

// ========== Mock single column extraction ==========

function mockColumnStream(
  columnId: string,
  paperIds: string[],
  columnPrompt: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      for (const paperId of paperIds) {
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

        const mockData = getMockCellValue(paperId, columnId, columnPrompt)

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
      }

      controller.enqueue(
        encoder.encode(
          sseEvent(
            'complete',
            JSON.stringify({ completed: paperIds.length }),
          ),
        ),
      )
      controller.close()
    },
  })
}

// ========== Real LLM single column extraction ==========

function llmColumnStream(
  columnId: string,
  paperIds: string[],
  columnPrompt: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      // Send all loading events
      for (const paperId of paperIds) {
        controller.enqueue(
          encoder.encode(
            sseEvent(
              'cell_update',
              cellUpdateJson(paperId, columnId, 'loading'),
            ),
          ),
        )
      }

      // Run with concurrency limit
      const concurrency = config.EXTRACTION_CONCURRENCY
      let completedCells = 0
      let idx = 0

      async function runTask(paperId: string): Promise<string> {
        const paperData = getPaper(paperId)
        if (!paperData) {
          return sseEvent(
            'cell_update',
            cellUpdateJson(
              paperId,
              columnId,
              'error',
              'Paper data not available',
            ),
          )
        }

        try {
          const result = await extractCellWithLlm(paperData, columnPrompt)
          if (result) {
            return sseEvent(
              'cell_update',
              cellUpdateJson(paperId, columnId, 'completed', result.value, {
                text: result.evidence_text,
                page: 1,
                confidence: 0.85,
              }),
            )
          }
          return sseEvent(
            'cell_update',
            cellUpdateJson(paperId, columnId, 'na'),
          )
        } catch (err) {
          const msg =
            err instanceof ExtractionError
              ? err.message
              : 'Extraction failed'
          return sseEvent(
            'cell_update',
            cellUpdateJson(paperId, columnId, 'error', msg),
          )
        }
      }

      const promises: Promise<void>[] = []

      function startNext(): Promise<void> | undefined {
        if (idx >= paperIds.length) return undefined
        const paperId = paperIds[idx++]
        const p = runTask(paperId).then((event) => {
          controller.enqueue(encoder.encode(event))
          completedCells++
          const next = startNext()
          if (next) return next
        })
        return p
      }

      for (let i = 0; i < Math.min(concurrency, paperIds.length); i++) {
        const p = startNext()
        if (p) promises.push(p)
      }

      await Promise.all(promises)

      controller.enqueue(
        encoder.encode(
          sseEvent(
            'complete',
            JSON.stringify({ completed: completedCells }),
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
  const columnId = body.column_id as string
  const paperIds = body.paper_ids as string[]
  const columnPrompt = (body.column_prompt as string) || ''

  const stream = config.USE_MOCK_EXTRACTION
    ? mockColumnStream(columnId, paperIds, columnPrompt)
    : llmColumnStream(columnId, paperIds, columnPrompt)

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
