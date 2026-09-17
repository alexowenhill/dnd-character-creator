/** Shared route guard: every API route behind the party password uses this. */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE, isValidSessionToken } from './session.ts'

export async function signedIn(): Promise<boolean> {
  return isValidSessionToken((await cookies()).get(SESSION_COOKIE)?.value)
}

/** Returns a 401 response when not signed in, or null when the caller may go on. */
export async function requireSession(): Promise<NextResponse | null> {
  if (await signedIn()) return null
  return NextResponse.json({ error: 'Enter the party password first.' }, { status: 401 })
}
