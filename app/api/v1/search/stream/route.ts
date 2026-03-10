/**
 * POST /api/v1/search/stream — SSE streaming search
 * (replaces backend/app/api/routes/search.py search_stream)
 */
import { NextRequest } from 'next/server'
import { config } from '@/lib/server/config'
import { storePaper, clearAll } from '@/lib/server/paper-store'
import {
  getMockPapers,
  getSuggestedColumns,
  FIXED_AUTO_COLUMNS,
} from '@/lib/server/mock-data'
import { v4 as uuid } from 'uuid'

export const runtime = 'nodejs'

function sseEvent(event: string, data: string): string {
  return `event: ${event}\ndata: ${data}\n\n`
}

function sseHeaders() {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
}

// ========== Mock search stream ==========

function mockSearchStream(
  query: string,
  page: number,
  pageSize: number,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        await sleep(300)

        const sessionId = uuid()
        controller.enqueue(
          encoder.encode(
            sseEvent('session', JSON.stringify({ session_id: sessionId })),
          ),
        )

        const papers = getMockPapers(query, page, pageSize)
        for (const paper of papers) {
          await sleep(80)
          storePaper(paper.id, paper as unknown as Record<string, unknown>)
          controller.enqueue(
            encoder.encode(sseEvent('paper', JSON.stringify(paper))),
          )
        }

        const columns = getSuggestedColumns(query)
        for (const col of columns) {
          await sleep(50)
          controller.enqueue(
            encoder.encode(sseEvent('column', JSON.stringify(col))),
          )
        }

        controller.enqueue(
          encoder.encode(
            sseEvent(
              'complete',
              JSON.stringify({ total: papers.length, query }),
            ),
          ),
        )
      } catch {
        // stream aborted
      } finally {
        controller.close()
      }
    },
  })
}

// ========== Wispaper real search stream ==========

function wispaperSearchStream(
  query: string,
  page: number,
  pageSize: number,
  authorization?: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      clearAll()

      const sessionId = uuid()
      controller.enqueue(
        encoder.encode(
          sseEvent('session', JSON.stringify({ session_id: sessionId })),
        ),
      )

      const offset = (page - 1) * pageSize
      const body = {
        message: query,
        stream: false,
        search_scholar: true,
        slow_search: true,
        offset,
        limit: pageSize,
        'x-billing': 'search',
      }
      const headers: Record<string, string> = {
        accept: 'text/event-stream',
        'content-type': 'application/json',
        'cache-control': 'no-cache',
        ...(authorization ? { authorization } : {}),
      }

      const seenIds = new Set<string>()
      let total = 0
      let totalSearched = 0

      try {
        const response = await fetch(config.WISPAPER_API_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errorText = await response.text()
          const errorMsg = `Wispaper API error: ${response.status} ${errorText.slice(0, 500)}`
          controller.enqueue(
            encoder.encode(
              sseEvent('error', JSON.stringify({ message: errorMsg })),
            ),
          )
          controller.enqueue(
            encoder.encode(
              sseEvent(
                'complete',
                JSON.stringify({ total: 0, query }),
              ),
            ),
          )
          controller.close()
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          while (buffer.includes('\n\n')) {
            const idx = buffer.indexOf('\n\n')
            const msg = buffer.slice(0, idx).trim()
            buffer = buffer.slice(idx + 2)

            if (!msg.startsWith('data: ')) continue

            const raw = msg.slice(6)
            if (raw.startsWith('[PENDING]')) continue
            if (raw.startsWith('[DONE]')) break

            let eventData: Record<string, unknown>
            try {
              eventData = JSON.parse(raw)
            } catch {
              continue
            }

            const eventType = eventData.event as string
            const name = eventData.name as string
            const data = (eventData.data || {}) as Record<string, unknown>

            if (name === 'verification' && eventType === 'onAgentEnd') {
              const meta = data.metadata as Record<string, unknown> | undefined
              if (!meta || !meta.title) continue

              totalSearched++

              const criteria = meta.criteria as unknown[]
              if (!criteria || (Array.isArray(criteria) && criteria.length === 0))
                continue

              const paperId =
                (meta.uuid as string) ||
                (meta.id as string) ||
                uuid()
              if (seenIds.has(paperId)) continue
              seenIds.add(paperId)

              const authorsRaw = meta.authors
              let authors: string[]
              if (typeof authorsRaw === 'string') {
                authors = authorsRaw
                  .split(',')
                  .map((a) => a.trim())
                  .filter(Boolean)
              } else if (Array.isArray(authorsRaw)) {
                authors = authorsRaw as string[]
              } else {
                authors = []
              }

              const paper = {
                id: paperId,
                title: meta.title || '',
                year: meta.year,
                authors: authors.slice(0, 10),
                abstract: meta.abstract || '',
                url: meta.url || '',
                pdf_url: meta.pdf_url,
                doi: meta.doi,
                venue: meta.venue,
                citations: meta.citations,
                score: meta.final_score,
              }

              storePaper(paperId, paper as unknown as Record<string, unknown>)
              controller.enqueue(
                encoder.encode(sseEvent('paper', JSON.stringify(paper))),
              )
              total++
            }
          }
        }
      } catch (err) {
        console.warn(`Wispaper search error for '${query}':`, err)
      }

      // Send fixed auto columns (Task + Method)
      for (let i = 0; i < FIXED_AUTO_COLUMNS.length; i++) {
        const col = FIXED_AUTO_COLUMNS[i]
        controller.enqueue(
          encoder.encode(
            sseEvent(
              'column',
              JSON.stringify({
                id: `col_auto_${i}`,
                name: col.name,
                prompt: col.prompt,
              }),
            ),
          ),
        )
      }

      controller.enqueue(
        encoder.encode(
          sseEvent(
            'complete',
            JSON.stringify({
              total,
              searched: totalSearched,
              query,
            }),
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
  const query = body.query as string
  const page = (body.page as number) || 1
  const pageSize = (body.page_size as number) || 20

  const cookieToken = request.cookies.get('token')?.value
  const authHeader = request.headers.get('authorization')
  // cookie token → "Bearer <token>"; otherwise forward Authorization header as-is (e.g. "MR-xxx")
  const authorization = cookieToken ? `Bearer ${cookieToken}` : authHeader || undefined
  console.log("============================00003",process.env.USE_MOCK_SEARCH);

  const stream = config.USE_MOCK_SEARCH
    ? mockSearchStream(query, page, pageSize)
    : wispaperSearchStream(query, page, pageSize, authorization)

  return new Response(stream, { headers: sseHeaders() })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
