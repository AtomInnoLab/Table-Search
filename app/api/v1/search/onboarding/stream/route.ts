/**
 * POST /api/v1/search/onboarding/stream — SSE onboarding demo search
 *
 * Hardcoded params, proxies to upstream onboarding endpoint.
 * Response format identical to /api/v1/search/stream.
 */
import { NextRequest } from 'next/server'
import { config } from '@/lib/server/config'
import { storePaper, clearAll } from '@/lib/server/paper-store'
import {
  getMockPapers,
  FIXED_AUTO_COLUMNS,
} from '@/lib/server/mock-data'
import { v4 as uuid } from 'uuid'

export const runtime = 'nodejs'

const ONBOARDING_BODY = {
  session_id: 'ea9b8f64-46f9-44a0-a1a5-83253cbd5587',
  query: 'Find a paper using a distillation method to train models',
  uuid: 'e5b4e2f4-3995-49c6-805b-bc6140ecea60',
  lang: 'en',
}

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

// ========== Mock ==========

function mockOnboardingStream(): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      try {
        await sleep(300)

        const sessionId = uuid()
        controller.enqueue(
          encoder.encode(sseEvent('session', JSON.stringify({ session_id: sessionId }))),
        )

        const papers = getMockPapers(ONBOARDING_BODY.query, 1, 20)
        for (const paper of papers) {
          await sleep(80)
          storePaper(paper.id, paper as unknown as Record<string, unknown>)
          controller.enqueue(encoder.encode(sseEvent('paper', JSON.stringify(paper))))
        }

        for (let i = 0; i < FIXED_AUTO_COLUMNS.length; i++) {
          const col = FIXED_AUTO_COLUMNS[i]
          await sleep(50)
          controller.enqueue(
            encoder.encode(
              sseEvent('column', JSON.stringify({ id: `col_auto_${i}`, name: col.name, prompt: col.prompt })),
            ),
          )
        }

        controller.enqueue(
          encoder.encode(sseEvent('complete', JSON.stringify({ total: papers.length, query: ONBOARDING_BODY.query }))),
        )
      } catch {
        // stream aborted
      } finally {
        controller.close()
      }
    },
  })
}

// ========== Real ==========

function wispaperOnboardingStream(authorization?: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      clearAll()

      const sessionId = uuid()
      controller.enqueue(
        encoder.encode(sseEvent('session', JSON.stringify({ session_id: sessionId }))),
      )

      const origin = new URL(config.WISPAPER_API_URL).origin
      const url = `${origin}/api/v1/search/onboarding/stream`
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
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(ONBOARDING_BODY),
        })

        if (!response.ok) {
          const errorText = await response.text()
          const errorMsg = `Onboarding API error: ${response.status} ${errorText.slice(0, 500)}`
          controller.enqueue(encoder.encode(sseEvent('error', JSON.stringify({ message: errorMsg }))))
          controller.enqueue(
            encoder.encode(sseEvent('complete', JSON.stringify({ total: 0, query: ONBOARDING_BODY.query }))),
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
              controller.enqueue(encoder.encode(sseEvent('paper', JSON.stringify(paper))))
              total++
            }
          }
        }
      } catch (err) {
        console.warn('Onboarding search error:', err)
      }

      for (let i = 0; i < FIXED_AUTO_COLUMNS.length; i++) {
        const col = FIXED_AUTO_COLUMNS[i]
        controller.enqueue(
          encoder.encode(
            sseEvent('column', JSON.stringify({ id: `col_auto_${i}`, name: col.name, prompt: col.prompt })),
          ),
        )
      }

      controller.enqueue(
        encoder.encode(
          sseEvent('complete', JSON.stringify({ total, searched: totalSearched, query: ONBOARDING_BODY.query })),
        ),
      )
      controller.close()
    },
  })
}

// ========== Route handler ==========

export async function POST(request: NextRequest) {
  const cookieToken = request.cookies.get('token')?.value
  const authHeader = request.headers.get('authorization')
  const authorization = cookieToken ? `Bearer ${cookieToken}` : authHeader || undefined

  const stream = config.USE_MOCK_SEARCH
    ? mockOnboardingStream()
    : wispaperOnboardingStream(authorization)

  return new Response(stream, { headers: sseHeaders() })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
