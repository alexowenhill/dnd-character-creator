/**
 * The shared party password.
 *
 * There are no user accounts. Everyone types the same password and gets a
 * signed, httpOnly cookie proving they did. The password itself never goes into
 * the cookie — the cookie holds a HMAC of a fixed payload, so it cannot be
 * forged without the secret and reveals nothing if read.
 *
 * This is a lock on a garden gate, not a bank vault. It keeps a public URL from
 * being wide open, which is what it is for.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'party_session'

/** Set in Netlify's environment. Both have deliberately awkward defaults. */
export function partyPassword(): string | null {
  const value = process.env.PARTY_PASSWORD
  return value && value.length > 0 ? value : null
}

function secret(): string {
  // Falls back to the password so a single environment variable is enough to
  // get going; setting SESSION_SECRET as well is better.
  return process.env.SESSION_SECRET ?? process.env.PARTY_PASSWORD ?? 'dev-only-insecure-secret'
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex')
}

/** The cookie value: a payload plus its signature. */
export function makeSessionToken(): string {
  const payload = `party.${Date.now()}`
  return `${payload}.${sign(payload)}`
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false
  const index = token.lastIndexOf('.')
  if (index < 1) return false

  const payload = token.slice(0, index)
  const signature = token.slice(index + 1)
  const expected = sign(payload)

  // Compare in constant time; mismatched lengths cannot be compared at all.
  const a = Buffer.from(signature, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || a.length === 0) return false
  return timingSafeEqual(a, b)
}

/** Constant-time password check, so the endpoint does not leak by timing. */
export function passwordMatches(candidate: string): boolean {
  const expected = partyPassword()
  if (!expected) return false
  const a = Buffer.from(candidate)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
