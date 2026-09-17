import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/guard.ts'
import { yonderFetch } from '@/lib/yonder.ts'
import { yonderTokenResult } from '@/lib/yonder-account.ts'

/**
 * Raw proxy for the API console at /console. Forwards whatever method, path
 * and body the page sends to the real D&D Yonder API using the shared
 * account's token, and hands back the upstream status and body untouched —
 * this exists to let someone poke the live API directly, not to shape its
 * answers.
 */
async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const denied = await requireSession()
  if (denied) return denied

  const { path } = await ctx.params
  const upstreamPath = `/api/${path.join('/')}${req.nextUrl.search}`

  const { token, reason } = await yonderTokenResult()
  if (!token) {
    return NextResponse.json({ ok: false, status: 0, reason: `no token: ${reason}` }, { status: 502 })
  }

  const method = req.method
  let json: unknown
  if (method !== 'GET' && method !== 'HEAD') {
    const text = await req.text()
    if (text) {
      try {
        json = JSON.parse(text)
      } catch {
        return NextResponse.json({ ok: false, status: 0, reason: 'request body is not valid JSON' }, { status: 400 })
      }
    }
  }

  const result = await yonderFetch(upstreamPath, { method, token, json })
  return NextResponse.json({
    ok: result.ok,
    status: result.status,
    contentType: result.contentType,
    redirectedTo: result.redirectedTo,
    followedRedirectTo: result.followedRedirectTo,
    body: result.body,
  })
}

export const GET = handle
export const POST = handle
export const PATCH = handle
export const DELETE = handle
