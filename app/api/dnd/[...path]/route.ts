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
const PREFIX = '/api/dnd/'

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const token = (await cookies()).get(DND_TOKEN_COOKIE)?.value

  if (!token) {
    return NextResponse.json({ error: 'Not signed in to D&D Yonder' }, { status: 401 })
  }

  // Take the path from the URL rather than from `params`, because a trailing
  // slash is significant upstream (`POST /api/characters/` is the documented
  // create route) and the params array drops it. `skipTrailingSlashRedirect`
  // in next.config.ts stops Next from rewriting it away before we get here.
  const pathname = req.nextUrl.pathname
  const rest = pathname.startsWith(PREFIX) ? pathname.slice(PREFIX.length) : path.join('/')

  // The segments come straight from the URL, so refuse traversal outright.
  if (rest.split('/').some((segment) => segment === '..' || segment === '.')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const search = req.nextUrl.search
  const upstreamPath = `/api/${rest}${search}`

  let json: unknown = undefined
  let form: Record<string, string> | undefined = undefined
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    const text = await req.text()
    if (text) {
      // Forward the encoding the caller chose. The console can send form data,
      // since login and register take form data and the rest may too.
      if ((req.headers.get('content-type') ?? '').includes('x-www-form-urlencoded')) {
        form = Object.fromEntries(new URLSearchParams(text))
      } else {
        try {
          json = JSON.parse(text)
        } catch {
          return NextResponse.json({ error: 'Request body was not valid JSON' }, { status: 400 })
        }
      }
    }
  }

  const result = await yonderFetch(upstreamPath, { method: req.method, token, json, form })

  // A 3xx body is empty, so say what happened instead of returning nothing.
  // This is the failure mode where a POST to a redirecting URL would otherwise
  // be silently retried as a GET and look like a successful read.
  if (result.status >= 300 && result.status < 400) {
    return NextResponse.json(
      {
        error: `Upstream redirected (${result.status}) instead of handling ${req.method} /api/${rest}`,
        redirectedTo: result.redirectedTo ?? null,
        hint: 'A POST answered with a redirect loses its body. Try the same path with or without a trailing slash.',
      },
      { status: 502, headers: { 'x-upstream-status': String(result.status) } },
    )
  }

  if (result.status === 401) {
    const res = NextResponse.json({ error: 'D&D Yonder session expired' }, { status: 401 })
    res.cookies.set(DND_TOKEN_COOKIE, '', { maxAge: 0, path: '/' })
    return res
  }

  // Diagnostics ride along in headers so the console can show what really came
  // back without changing the body the app sees.
  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      'x-upstream-status': String(result.status),
      'x-upstream-content-type': result.contentType ?? 'none',
      'x-upstream-bytes': String(result.text.length),
    },
  })
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const PUT = proxy
export const DELETE = proxy
