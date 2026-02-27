/**
 * POST /api/v1/papers/restore — Restore paper cache
 * (replaces backend/app/api/routes/search.py restore_papers)
 */
import { NextRequest, NextResponse } from 'next/server'
import { storePaper } from '@/lib/server/paper-store'
import { v4 as uuid } from 'uuid'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const papers = body.papers as Array<Record<string, unknown>>

  const sessionId = uuid()
  let count = 0

  for (const paper of papers) {
    const paperId = paper.id as string | undefined
    if (paperId) {
      storePaper(paperId, paper)
      count++
    }
  }

  return NextResponse.json({
    session_id: sessionId,
    restored: count,
  })
}
