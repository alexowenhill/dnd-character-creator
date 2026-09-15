import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { yonderFetch, DND_TOKEN_COOKIE } from '@/lib/yonder'

/**
 * Transparent authenticated proxy to D&D Yonder.
 *
 *   /api/dnd/characters/classes  ->  {YONDER_BASE}/api/characters/classes
 *
 * Every upstream endpoint needs a bearer token, so rather than hand-writing a
 * route per endpoint we attach the cookie token here and forward the rest
 * untouched. That also means endpoints not yet covered by the UI (encounters,
 * creatures, campaign maps) work without further changes.
 */
async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const token = (await cookies()).get(DND_TOKEN_COOKIE)?.value

  if (!token) {
    return NextResponse.json({ error: 'Not signed in to D&D Yonder' }, { status: 401 })
  }

  const search = req.nextUrl.search
  const upstreamPath = `/api/${path.map(encodeURIComponent).join('/')}${search}`

  let json: unknown = undefined
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    const text = await req.text()
    if (text) {
      try {
        json = JSON.parse(text)
      } catch {
        return NextResponse.json({ error: 'Request body was not valid JSON' }, { status: 400 })
      }
    }
  }

  const result = await yonderFetch(upstreamPath, { method: req.method, token, json })

  if (result.status === 401) {
    const res = NextResponse.json({ error: 'D&D Yonder session expired' }, { status: 401 })
    res.cookies.set(DND_TOKEN_COOKIE, '', { maxAge: 0, path: '/' })
    return res
  }

  return NextResponse.json(result.body, { status: result.status })
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const PUT = proxy
export const DELETE = proxy
