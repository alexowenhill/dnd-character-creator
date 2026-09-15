import { NextRequest, NextResponse } from 'next/server'
import { yonderFetch, DND_TOKEN_COOKIE } from '@/lib/yonder'

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
  // mean the endpoint wanted JSON.
  if (!result.ok && result.status !== 401 && result.status !== 422) {
    result = await yonderFetch(path, { method: 'POST', json: form })
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: mode === 'register' ? 'Could not register' : 'Wrong email or password', upstream: result.body },
      { status: result.status || 502 },
    )
  }

  const token = (result.body as { token?: unknown } | null)?.token
  if (typeof token !== 'string') {
    return NextResponse.json(
      { error: 'No token in the upstream response', upstream: result.body },
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
