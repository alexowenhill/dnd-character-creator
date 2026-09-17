/**
 * Checks the shared Yonder account's self-bootstrapping login (lib/yonder-account.ts)
 * against a mock built from the real API's own source
 * (github.com/AshleyJSheridan/dnd-game-api), not the docs page — the docs
 * turned out to describe a different response shape than the code sends, and
 * that mismatch is exactly what this file exists to catch happening again.
 *
 * Two things the real controllers do that are easy to get wrong from docs
 * alone, both reproduced here:
 *   - POST /api/user/register returns a plain message, no token. A
 *     login-only client would 401 forever against an account that has never
 *     been registered.
 *   - A duplicate-email registration fails with HTTP 400 (HTTP_BAD_REQUEST in
 *     the controller), not the more usual 422.
 *
 *   npm test
 */
import { createServer } from 'node:http'

let failed = 0
const check = (label, cond, extra = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${cond ? '' : `  ${extra}`}`)
  if (!cond) failed++
}

/** A fresh mock per test run, on a random free port, mirroring AuthController. */
function startMock() {
  const users = new Map()
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        const send = (status, payload) => {
          res.writeHead(status, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(payload))
        }
        let json = {}
        try {
          json = body ? JSON.parse(body) : {}
        } catch {
          json = Object.fromEntries(new URLSearchParams(body))
        }

        if (req.url === '/api/user/register' && req.method === 'POST') {
          const { name, email, password, password_confirmation } = json
          if (!name || !email || !password) return send(400, { error: 'missing fields' })
          if (password !== password_confirmation) {
            return send(400, { password: ['The password confirmation does not match.'] })
          }
          if (users.has(email)) return send(400, { email: ['The email has already been taken.'] })
          users.set(email, { name, password })
          // The real controller returns no token here, just a message.
          return send(200, { message: 'User created successfully' })
        }

        if (req.url === '/api/user/login' && req.method === 'POST') {
          const { email, password } = json
          const user = users.get(email)
          if (!user || user.password !== password) return send(401, { error: 'Invalid credentials' })
          // Real shape: access_token at top level, not the "token" the old
          // published docs described.
          return send(200, {
            access_token: `jwt-for-${email}`,
            refresh_token: `refresh-for-${email}`,
            token_type: 'bearer',
            expires_in: 3600,
          })
        }

        if (req.url.startsWith('/api/names') && req.method === 'GET') {
          if (!req.headers.authorization?.startsWith('Bearer ')) return send(401, { error: 'Token not valid' })
          return send(200, { style: 'generic', names: ['Aldric', 'Beona'] })
        }

        return send(404, { message: 'no mock route' })
      })
    })
    server.listen(0, () => resolve(server))
  })
}

const server = await startMock()
const port = server.address().port
process.env.DND_API_BASE = `http://localhost:${port}`

async function freshAccountModule() {
  // Cache-bust the module cache: each case needs a clean in-memory token cache.
  return import(`../lib/yonder-account.ts?t=${Date.now()}-${Math.random()}`)
}

try {
  // --- Not configured -------------------------------------------------
  delete process.env.YONDER_EMAIL
  delete process.env.YONDER_PASSWORD
  {
    const { yonderTokenResult } = await freshAccountModule()
    const result = await yonderTokenResult()
    check('unconfigured: no token', result.token === null)
    check('unconfigured: reason names the env vars', result.reason?.includes('YONDER_EMAIL'), result.reason)
  }

  // --- First-ever run: account does not exist, self-registers ---------
  process.env.YONDER_EMAIL = 'party-fresh@example.com'
  process.env.YONDER_PASSWORD = 'correct-horse-battery'
  {
    const { yonderTokenResult } = await freshAccountModule()
    const result = await yonderTokenResult()
    check('fresh account: self-registers and gets a token', result.token === 'jwt-for-party-fresh@example.com', JSON.stringify(result))
  }

  // --- Account now exists: plain login, no register attempt -----------
  {
    const { yonderTokenResult } = await freshAccountModule()
    const result = await yonderTokenResult()
    check('existing account: logs in directly', result.token === 'jwt-for-party-fresh@example.com')
  }

  // --- Wrong password: must not loop into re-registering ---------------
  process.env.YONDER_PASSWORD = 'the-wrong-password'
  {
    const { yonderTokenResult } = await freshAccountModule()
    const result = await yonderTokenResult()
    check('wrong password: no token', result.token === null)
    check(
      'wrong password: reason names credentials, not registration',
      result.reason?.includes('invalid credentials'),
      result.reason,
    )
  }

  // --- Recovered password: a downstream call actually works -----------
  process.env.YONDER_PASSWORD = 'correct-horse-battery'
  {
    const { yonderTokenResult } = await freshAccountModule()
    const { token } = await yonderTokenResult()
    const res = await fetch(`http://localhost:${port}/api/names`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const names = await res.json()
    check('bootstrapped token works against a real endpoint', res.ok && Array.isArray(names.names), JSON.stringify(names))
  }
} finally {
  server.close()
}

console.log(failed ? `\n${failed} FAILED` : '\nall passed')
process.exitCode = failed ? 1 : 0
