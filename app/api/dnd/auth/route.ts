import { NextRequest, NextResponse } from 'next/server'
import { yonderFetch, DND_TOKEN_COOKIE, extractToken, describeUpstream } from '@/lib/yonder'

/**
 * Logs in or registers against D&D Yonder and stores the returned JWT in an
 * httpOnly cookie. The browser never sees the token.
 *
 * The published Postman collection sends these two endpoints as form data, so
 * that is tried first; if the upstream rejects the encoding we retry as JSON.
 */
export async function POST(req: NextRequest) {
  const { mode, name, email, password, passwordConfirmation } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const path = mode === 'register' ? '/api/user/register' : '/api/user/login'
  const form: Record<string, string> = { email, password }
  if (mode === 'register') {
    form.name = name ?? email.split('@')[0]
    form.password_confirmation = passwordConfirmation ?? password
  }

  let result = await yonderFetch(path, { method: 'POST', form })

  // 401/422 are real credential or validation failures; anything else may just
  // mean the endpoint wanted JSON. A 2xx with no token anywhere in it is the
  // same signal — the encoding was accepted but the payload was not understood.
  const needsRetry = result.status !== 401 && result.status !== 422 &&
    (!result.ok || extractToken(result.body) === null)
  if (needsRetry) {
    const retry = await yonderFetch(path, { method: 'POST', json: form })
    // Only keep the retry if it actually got us further.
    if (retry.ok && extractToken(retry.body) !== null) result = retry
    else if (!result.ok && retry.ok) result = retry
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        error: `${mode === 'register' ? 'Could not register' : 'Could not sign in'}: ${describeUpstream(result.body)}`,
        upstream: result.body,
      },
      { status: result.status || 502 },
    )
  }

  const token = extractToken(result.body)
  if (token === null) {
    // The call succeeded but carried no token. Most often that is the API
    // reporting a problem in a 200, so lead with whatever it said.
    return NextResponse.json(
      {
        error: `Signed in, but no token came back. The API said: ${describeUpstream(result.body)}`,
        upstream: result.body,
      },
      { status: 502 },
    )
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(DND_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(DND_TOKEN_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
