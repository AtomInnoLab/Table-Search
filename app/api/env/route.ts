import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    ENVIRONMENT: process.env.ENVIRONMENT ?? 'not set',
  })
}
