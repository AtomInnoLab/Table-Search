import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/server/config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cookieToken = request.cookies.get('token')?.value
  const authHeader = request.headers.get('authorization')
  if (!cookieToken && !authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // cookie token → "Bearer <token>"; otherwise forward Authorization header as-is (e.g. "MR-xxx")
  const authorization = cookieToken ? `Bearer ${cookieToken}` : authHeader!

  try {
    const origin = new URL(config.WISPAPER_API_URL).origin
    const url = `${origin}/api/v1/order/benefit`

    const res = await fetch(url, {
      headers: {
        Authorization: authorization,
      },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: res.status },
      )
    }

    const json = await res.json()
    const data = json.data

    const used: number = data?.usage?.search ?? 0

    const quotas: Array<{ product_type: string; limit: number }> =
      data?.plan?.metadata?.product_quotas ?? []
    const searchQuota = quotas.find((q) => q.product_type === 'search')
    const limit: number | null = searchQuota?.limit ?? null

    return NextResponse.json({ used, limit })
  } catch (err) {
    console.error('[benefit] Failed to fetch quota:', err)
    return NextResponse.json(
      { error: 'Failed to fetch quota' },
      { status: 500 },
    )
  }
}
