/**
 * The single D&D Yonder account the whole site shares.
 *
 * Players never sign in to Yonder. The site holds one account's credentials in
 * environment variables, logs in once, and caches the token in memory. The
 * token never reaches the browser.
 *
 * Yonder is used only where a failure is harmless: rolling dice and suggesting
 * names. Rules data is local (lib/srd.ts) and characters are stored by us, so
 * the API being slow, down, or refusing writes never blocks a character.
 */

import { yonderFetch, extractToken } from './yonder.ts'

let cached: { token: string; at: number } | null = null
/** Re-login occasionally rather than trusting a token forever. */
const MAX_AGE_MS = 1000 * 60 * 60 * 6

export function yonderConfigured(): boolean {
  return Boolean(process.env.YONDER_EMAIL && process.env.YONDER_PASSWORD)
}

/**
 * The shared token, logging in if needed. Returns null when the account is not
 * configured or the login fails — callers fall back to doing it locally.
 */
export async function yonderToken(): Promise<string | null> {
  if (!yonderConfigured()) return null
  if (cached && Date.now() - cached.at < MAX_AGE_MS) return cached.token

  const credentials = {
    email: process.env.YONDER_EMAIL as string,
    password: process.env.YONDER_PASSWORD as string,
  }

  // Login takes form data per the Postman collection; retry as JSON if refused.
  let result = await yonderFetch('/api/user/login', { method: 'POST', form: credentials })
  if (!result.ok || extractToken(result.body) === null) {
    result = await yonderFetch('/api/user/login', { method: 'POST', json: credentials })
  }

  const token = result.ok ? extractToken(result.body) : null
  if (!token) {
    cached = null
    return null
  }

  cached = { token, at: Date.now() }
  return token
}

/** Forget the cached token, so the next call logs in again. */
export function clearYonderToken(): void {
  cached = null
}
