/**
 * POST /api/v1/search — REST search (mock only)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getMockPapers, getSuggestedColumns } from '@/lib/server/mock-data'
import { v4 as uuid } from 'uuid'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const query = body.query as string
  const page = (body.page as number) || 1
  const pageSize = (body.page_size as number) || 20

  const sessionId = uuid()
  const papers = getMockPapers(query, page, pageSize)
  const suggestedColumns = getSuggestedColumns(query)

  return NextResponse.json({
    session_id: sessionId,
    query,
    papers,
    suggested_columns: suggestedColumns,
    total: papers.length,
  })
}
