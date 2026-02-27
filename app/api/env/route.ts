import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ENVIRONMENT: process.env.ENVIRONMENT ?? 'not set',
  })
}
