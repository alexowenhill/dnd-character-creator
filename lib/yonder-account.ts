/**
 * The single D&D Yonder account the whole site shares.
 *
 * Players never sign in to Yonder. The site holds one account's credentials in
 * environment variables and uses them on every request. The token never
 * reaches the browser.
 *
 * The account is self-bootstrapping: nobody has to manually register it first.
 * `POST /api/user/register` on the real API returns no token at all — just a
 * confirmation message — so a login-only client would 401 forever against an
 * email that has never been registered. This tries login first and, only on an
 * auth failure, registers the account and logs in again. Confirmed against the
 * API's own source (AshleyJSheridan/dnd-game-api): login answers with
 * `access_token` at the top level, not the `token` the old docs described.
 *
 * Every failure carries a reason, because "unavailable" alone was
 * undiagnosable — a missing config, a wrong password and a down API all looked
 * identical from the UI.
 */

import { yonderFetch, extractToken, describeUpstream } from './yonder.ts'

export type YonderTokenResult =
  | { token: string; reason?: undefined }
  | { token: null; reason: string }

type CacheEntry =
  | { kind: 'ok'; token: string; at: number }
  | { kind: 'fail'; reason: string; at: number }

let cache: CacheEntry | null = null
/** A working token is trusted for a while before re-checking. */
const OK_TTL_MS = 1000 * 60 * 60 * 6
/** A failure is cached briefly, so a burst of requests (six dice rolls, a name
 *  suggestion, a spell lookup) does not each retry the network — but a fixed
 *  config or a recovered API is noticed again quickly. */
const FAIL_TTL_MS = 1000 * 30

export function yonderConfigured(): boolean {
  return Boolean(process.env.YONDER_EMAIL && process.env.YONDER_PASSWORD)
}

async function attemptLogin(email: string, password: string): Promise<YonderTokenResult> {
  // Postman collection sends this as form data; retry as JSON if refused.
  let result = await yonderFetch('/api/user/login', { method: 'POST', form: { email, password } })
  if (!result.ok || extractToken(result.body) === null) {
    result = await yonderFetch('/api/user/login', { method: 'POST', json: { email, password } })
  }

  const token = result.ok ? extractToken(result.body) : null
  if (token) return { token }

  return {
    token: null,
    reason:
      result.status === 401
        ? 'login rejected (invalid credentials)'
        : `login failed: ${result.status} ${describeUpstream(result.body)}`,
  }
}

async function attemptRegister(
  name: string,
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; reason: string; accountAlreadyExists: boolean }> {
  const payload = { name, email, password, password_confirmation: password }
  let result = await yonderFetch('/api/user/register', { method: 'POST', form: payload })
  if (!result.ok) {
    result = await yonderFetch('/api/user/register', { method: 'POST', json: payload })
  }

  if (result.ok) return { ok: true }

  // A validation failure (400 — the controller uses HTTP_BAD_REQUEST, not the
  // more usual 422) naming the email means the account already exists and the
  // stored password is simply wrong. Retrying registration will never fix
  // that, so it is treated differently from a genuine registration failure.
  const bodyText = JSON.stringify(result.body ?? '').toLowerCase()
  const accountAlreadyExists = result.status === 400 && bodyText.includes('email')

  return {
    ok: false,
    reason: `registration failed: ${result.status} ${describeUpstream(result.body)}`,
    accountAlreadyExists,
  }
}

/**
 * The shared token, logging in (and registering, if this is the first time)
 * as needed. Every caller gets either a token or a specific reason there is
 * none, instead of a bare "unavailable".
 */
export async function yonderTokenResult(): Promise<YonderTokenResult> {
  if (!yonderConfigured()) {
    return { token: null, reason: 'YONDER_EMAIL / YONDER_PASSWORD are not set' }
  }

  if (cache?.kind === 'ok' && Date.now() - cache.at < OK_TTL_MS) return { token: cache.token }
  if (cache?.kind === 'fail' && Date.now() - cache.at < FAIL_TTL_MS) {
    return { token: null, reason: cache.reason }
  }

  const email = process.env.YONDER_EMAIL as string
  const password = process.env.YONDER_PASSWORD as string
  const name = process.env.YONDER_NAME ?? 'The Party'

  let attempt = await attemptLogin(email, password)

  if (attempt.token === null && attempt.reason === 'login rejected (invalid credentials)') {
    // The account may simply not exist yet — this is what a fresh
    // YONDER_EMAIL/YONDER_PASSWORD pair looks like on first deploy.
    const registered = await attemptRegister(name, email, password)
    if (registered.ok) {
      attempt = await attemptLogin(email, password)
    } else if (!registered.accountAlreadyExists) {
      attempt = { token: null, reason: registered.reason }
    }
    // else: account exists, so the original "invalid credentials" stands —
    // YONDER_PASSWORD does not match what is actually registered.
  }

  cache =
    attempt.token !== null
      ? { kind: 'ok', token: attempt.token, at: Date.now() }
      : { kind: 'fail', reason: attempt.reason, at: Date.now() }

  return attempt
}

/** Convenience for callers that only want the token and can shrug off why not. */
export async function yonderToken(): Promise<string | null> {
  const result = await yonderTokenResult()
  return result.token
}

/** Forget the cached token or failure, so the next call starts over. */
export function clearYonderToken(): void {
  cache = null
}
