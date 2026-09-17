/**
 * Client for the D&D Yonder API (dndapi.ashleysheridan.co.uk).
 *
 * Everything runs server-side: the shared account's token (lib/yonder-account.ts)
 * never reaches the browser. Feature routes (names, spells, items, roll) each
 * shape one endpoint's response; app/api/console/[...path] is a thin, unshaped
 * proxy for manually exercising the rest of the API from /console.
 *
 * Response-shape helpers live in ./shape so client components can use them
 * without pulling this module into the browser bundle.
 */

export const YONDER_BASE =
  process.env.DND_API_BASE ?? 'https://dndapi.ashleysheridan.co.uk'

export type YonderResult = {
  ok: boolean
  status: number
  body: unknown
  /** Raw response text, before any JSON parsing — `[]` and `""` differ. */
  text: string
  /** Set when upstream answered with a 3xx instead of doing the work. */
  redirectedTo?: string
  /** Set when a body-carrying request was re-sent to a redirect target. */
  followedRedirectTo?: string
  contentType?: string
}

/** Raw call against the upstream API. `token` is optional for login/register. */
export async function yonderFetch(
  path: string,
  init: {
    method?: string
    token?: string
    json?: unknown
    form?: Record<string, string>
    /** Overrides for Accept and friends, so header theories can be tested. */
    extraHeaders?: Record<string, string>
  } = {},
): Promise<YonderResult> {
  const { method = 'GET', token, json, form, extraHeaders } = init
  const headers: Record<string, string> = { Accept: 'application/json', ...extraHeaders }
  if (token) headers.Authorization = `Bearer ${token}`

  let body: string | undefined
  if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = new URLSearchParams(form).toString()
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  }

  const carriesBody = method !== 'GET' && method !== 'HEAD'

  // A GET may follow redirects normally — there is no body to lose. Anything
  // with a body must not, because per the fetch spec a 301/302 is retried as a
  // GET with the body dropped. The live API answers `POST /api/characters/`
  // with a 301 to `/api/characters`, which silently became a read of the
  // characters list: a create that appeared to succeed and returned [].
  let res = await fetch(`${YONDER_BASE}${path}`, {
    method,
    headers,
    body,
    cache: 'no-store',
    redirect: carriesBody ? 'manual' : 'follow',
  })

  let followed: string | undefined
  if (carriesBody && res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location')
    if (location) {
      const target = new URL(location, YONDER_BASE)
      // Only ever re-send to the same origin: the Authorization header must not
      // follow a redirect off to another host.
      if (target.origin === new URL(YONDER_BASE).origin) {
        // Re-issue with the method and body intact — what a 307/308 would have
        // preserved. One hop only, so a redirect loop cannot spin.
        res = await fetch(target, {
          method,
          headers,
          body,
          cache: 'no-store',
          redirect: 'manual',
        })
        followed = target.toString()
      }
    }
  }

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
    followedRedirectTo: followed,
    redirectedTo: location ?? undefined,
    contentType: res.headers.get('content-type') ?? undefined,
  }
}

export * from './shape.ts'
