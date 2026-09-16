/**
 * Client for the D&D Yonder API (dndapi.ashleysheridan.co.uk).
 *
 * Everything runs server-side so the JWT never reaches the browser: it lives in
 * an httpOnly cookie and is attached by the proxy in app/api/dnd/[...path].
 *
 * Response-shape helpers live in ./shape so client components can use them
 * without pulling this module into the browser bundle.
 */

export const YONDER_BASE =
  process.env.DND_API_BASE ?? 'https://dndapi.ashleysheridan.co.uk'

export const DND_TOKEN_COOKIE = 'dnd_token'

export type YonderResult = {
  ok: boolean
  status: number
  body: unknown
  /** Raw response text, before any JSON parsing — `[]` and `""` differ. */
  text: string
  /** Set when upstream answered with a 3xx instead of doing the work. */
  redirectedTo?: string
  contentType?: string
}

/** Raw call against the upstream API. `token` is optional for login/register. */
export async function yonderFetch(
  path: string,
  init: { method?: string; token?: string; json?: unknown; form?: Record<string, string> } = {},
): Promise<YonderResult> {
  const { method = 'GET', token, json, form } = init
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let body: string | undefined
  if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = new URLSearchParams(form).toString()
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  }

  const res = await fetch(`${YONDER_BASE}${path}`, {
    method,
    headers,
    body,
    cache: 'no-store',
    // Never follow redirects. Per the fetch spec a 301/302 answering a POST is
    // retried as a GET with the body dropped, so a redirect on the create route
    // would silently turn into a read of the characters list and look like a
    // create that returned an empty list. Surface the 3xx instead.
    redirect: 'manual',
  })

  const text = await res.text()
  let parsed: unknown = text
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    // Upstream returned HTML (often a Laravel error page). Keep it as a string
    // so the caller can surface something useful.
  }

  const location = res.headers.get('location')
  return {
    ok: res.ok,
    status: res.status,
    body: parsed,
    text,
    redirectedTo: location ?? undefined,
    contentType: res.headers.get('content-type') ?? undefined,
  }
}

export * from './shape'
