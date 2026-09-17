import { NextRequest, NextResponse } from 'next/server'
import {
  SESSION_COOKIE,
  makeSessionToken,
  partyPassword,
  passwordMatches,
} from '@/lib/session'

/** Exchange the shared party password for a signed session cookie. */
export async function POST(req: NextRequest) {
  if (!partyPassword()) {
    return NextResponse.json(
      {
        error:
          'No party password is set on the server. Set PARTY_PASSWORD in the site environment variables.',
      },
      { status: 503 },
    )
  }

  const { password } = (await req.json().catch(() => ({}))) as { password?: string }
  if (typeof password !== 'string' || !passwordMatches(password)) {
    return NextResponse.json({ error: 'That is not the password.' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, makeSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 60,
    path: '/',
  })
  return res
}

/** Sign out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
