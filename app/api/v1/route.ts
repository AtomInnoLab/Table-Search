/**
 * Health check endpoint
 */
import { NextResponse } from 'next/server'
import { config } from '@/lib/server/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    app: 'Dynamic Literature Matrix',
    status: 'ok',
    mock_search: config.USE_MOCK_SEARCH,
    mock_extraction: config.USE_MOCK_EXTRACTION,
  })
}
