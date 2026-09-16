#!/usr/bin/env node
/**
 * Walks a character all the way through the live D&D Yonder API and reports
 * what actually comes back.
 *
 * This app was built from the published docs and Postman collection, which
 * describe request bodies but not responses, so the response readers in
 * lib/shape.ts and lib/sheet.ts probe for field names. This script checks those
 * guesses against the real thing and tells you which ones are wrong.
 *
 *   npm run probe
 *
 * It registers a throwaway account by default. To reuse one:
 *   DND_EMAIL=you@example.com DND_PASSWORD=secret npm run probe
 *
 * Full request/response transcript is written to probe-output.json (gitignored).
 */

import { writeFile } from 'node:fs/promises'

const BASE = process.env.DND_API_BASE ?? 'https://dndapi.ashleysheridan.co.uk'

const transcript = []
let token = null
let failures = 0

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
}

function pass(message) {
  console.log(`  ${c.green('PASS')} ${message}`)
}

function fail(message) {
  failures += 1
  console.log(`  ${c.red('FAIL')} ${message}`)
}

function note(message) {
  console.log(`  ${c.dim(message)}`)
}

/** Report a PATCH: what came back on success, status and body on failure. */
function report(res, label, okMessage) {
  if (res.ok) pass(okMessage)
  else fail(`${label} → ${res.status}: ${JSON.stringify(res.body).slice(0, 300)}`)
}

/** Compact structural description of a response, so shapes are obvious at a glance. */
function describe(value, depth = 0) {
  if (value === null) return 'null'
  if (Array.isArray(value)) {
    if (!value.length) return 'Array(0)'
    const first = value[0]
    const inner =
      depth > 1 ? typeof first : `${describe(first, depth + 1)}`
    return `Array(${value.length}) of ${inner}`
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (depth > 1) return `{ ${keys.slice(0, 8).join(', ')} }`
    const parts = keys
      .slice(0, 12)
      .map((key) => `${key}: ${describe(value[key], depth + 1)}`)
    return `{ ${parts.join(', ')}${keys.length > 12 ? ', …' : ''} }`
  }
  if (typeof value === 'string') return value.length > 40 ? 'string' : `"${value}"`
  return typeof value
}

async function call(method, path, { json, form, auth = true } = {}) {
  const headers = { Accept: 'application/json' }
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let body
  if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = new URLSearchParams(form).toString()
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  }

  let res
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body })
  } catch (err) {
    transcript.push({ method, path, error: String(err) })
    return { ok: false, status: 0, body: null, error: String(err) }
  }

  const text = await res.text()
  let parsed = text
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    // Upstream returned HTML — keep the string so it shows up in the transcript.
  }

  transcript.push({ method, path, status: res.status, request: json ?? form, response: parsed })
  return { ok: res.ok, status: res.status, body: parsed }
}

/** Try several candidate paths and report which one answers. */
async function findWorkingPath(label, candidates) {
  for (const path of candidates) {
    const res = await call('GET', path)
    if (res.ok) {
      pass(`${label}: ${c.bold(path)} → ${describe(res.body)}`)
      return { path, body: res.body }
    }
    note(`${path} → ${res.status}`)
  }
  fail(`${label}: none of these answered — ${candidates.join(', ')}`)
  return null
}

/* ------------------------------------------------------------------ *
 * Optionally load the app's own readers so we can check them directly.
 * Needs a Node with TypeScript type-stripping (22.18+ / 23+).
 * ------------------------------------------------------------------ */
let readers = null
try {
  const shape = await import('../lib/shape.ts')
  const sheet = await import('../lib/sheet.ts')
  readers = { ...shape, ...sheet }
} catch {
  // Checked below; the shape report still works without it.
}

async function main() {
  console.log(c.bold(`\nProbing ${BASE}\n`))

  /* -- 1. Auth ---------------------------------------------------- */
  console.log(c.bold('1. Register / login'))
  const email = process.env.DND_EMAIL ?? `probe-${Date.now()}@example.com`
  const password = process.env.DND_PASSWORD ?? 'probe-password-123'
  const reusing = Boolean(process.env.DND_EMAIL)

  const credentials = {
    name: 'Probe',
    email,
    password,
    password_confirmation: password,
  }
  const path = reusing ? '/api/user/login' : '/api/user/register'
  const payload = reusing ? { email, password } : credentials

  // The Postman collection sends these as form data; retry as JSON if refused.
  let auth = await call('POST', path, { form: payload, auth: false })
  let encoding = 'form'
  if (!auth.ok) {
    note(`form-encoded → ${auth.status}; retrying as JSON`)
    auth = await call('POST', path, { json: payload, auth: false })
    encoding = 'json'
  }

  if (!auth.ok) {
    fail(`${path} → ${auth.status}: ${JSON.stringify(auth.body).slice(0, 300)}`)
    console.log('\nCannot continue without a token.\n')
    return
  }
  pass(`${path} accepts ${c.bold(encoding)} — ${describe(auth.body)}`)

  token = auth.body?.token ?? auth.body?.access_token ?? auth.body?.data?.token
  if (typeof token !== 'string') {
    fail(`no token found in the response; app/api/dnd/auth reads .token`)
    console.log('\nCannot continue without a token.\n')
    return
  }
  pass(`token present (${token.slice(0, 12)}…)`)
  if (!reusing) note(`account: ${email} / ${password}`)

  /* -- 2. Create the character ------------------------------------ */
  console.log(c.bold('\n2. Create character'))
  const created = await call('POST', '/api/characters/', {
    json: { name: 'Probe Character', level: 1 },
  })
  if (!created.ok) {
    fail(`POST /api/characters/ → ${created.status}: ${JSON.stringify(created.body).slice(0, 300)}`)
    return
  }
  note(`response: ${describe(created.body)}`)

  const guid = readers
    ? readers.extractGuid(created.body)
    : (created.body?.guid ?? created.body?.character?.guid ?? null)
  if (typeof guid !== 'string') {
    fail('no character guid found — check extractGuid() in lib/shape.ts')
    return
  }
  pass(`guid ${guid}`)

  /* -- 3. Option lists -------------------------------------------- */
  console.log(c.bold('\n3. Option lists'))
  const lists = {}
  for (const [label, candidates] of Object.entries({
    races: ['/api/characters/races'],
    classes: ['/api/characters/classes'],
    backgrounds: ['/api/characters/backgrounds'],
    // The languages endpoint is not in the docs — the app guesses game/languages.
    languages: [
      '/api/game/languages',
      '/api/characters/languages',
      '/api/languages',
    ],
  })) {
    const found = await findWorkingPath(label, candidates)
    if (found) lists[label] = found
  }

  if (readers) {
    for (const [label, found] of Object.entries(lists)) {
      const options = readers.toOptions(found.body)
      if (options.length) {
        pass(`toOptions() reads ${options.length} ${label} — e.g. ${JSON.stringify(options[0].name)} (id ${options[0].id})`)
        if (options[0].children?.length) {
          note(`  nested children present: ${options[0].children.length}`)
        }
      } else {
        fail(`toOptions() found no ${label}: add the right key to lib/shape.ts — shape was ${describe(found.body)}`)
      }
    }
  } else {
    note('Skipped normaliser checks (needs Node 22.18+ for TypeScript imports).')
  }

  /* -- 4. Name generator ------------------------------------------ */
  console.log(c.bold('\n4. Name generator'))
  await findWorkingPath('names', ['/api/names/elf', '/api/names'])

  /* -- 5. Patch race / class / background -------------------------- */
  console.log(c.bold('\n5. Apply race, class, background'))
  const firstId = (label) => {
    const found = lists[label]
    if (!found) return null
    if (readers) return readers.toOptions(found.body)[0]?.id ?? null
    const arr = Array.isArray(found.body) ? found.body : Object.values(found.body).find(Array.isArray)
    return arr?.[0]?.id ?? null
  }

  const raceId = firstId('races')
  if (raceId !== null) {
    const res = await call('PATCH', `/api/characters/${guid}`, {
      json: { updateType: 'race', charRaceId: raceId },
    })
    report(res, 'race', `race ${raceId} → ${describe(res.body)}`)
  }

  const classId = firstId('classes')
  if (classId !== null) {
    // classPathId is documented as an array.
    const res = await call('PATCH', `/api/characters/${guid}`, {
      json: { updateType: 'class', charClassId: classId },
    })
    report(res, 'class', `class ${classId} → ${describe(res.body)}`)
  }

  const backgroundId = firstId('backgrounds')
  if (backgroundId !== null) {
    const res = await call('PATCH', `/api/characters/${guid}`, {
      json: { updateType: 'background', charBackgroundId: backgroundId, characteristics: [] },
    })
    report(res, 'background', `background ${backgroundId} → ${describe(res.body)}`)
  }

  /* -- 6. Dice + abilities ---------------------------------------- */
  console.log(c.bold('\n6. Roll and assign abilities'))
  // Alphabetical ability ids: 1 CHA, 2 CON, 3 DEX, 4 INT, 5 STR, 6 WIS.
  const abilityIds = [1, 2, 3, 4, 5, 6]
  const abilityRolls = []
  for (const abilityId of abilityIds) {
    const res = await call('POST', '/api/game/dice', { json: { dice: { d6: 4 } } })
    if (!res.ok) {
      fail(`dice → ${res.status}: ${JSON.stringify(res.body).slice(0, 200)}`)
      break
    }
    if (abilityId === 1) note(`dice response: ${describe(res.body)}`)
    const roll = readers ? readers.extractRoll(res.body) : { guid: res.body?.guid, values: [] }
    if (!roll?.guid) {
      fail('no roll guid — check extractRoll() in lib/shape.ts')
      break
    }
    abilityRolls.push({ abilityId, guid: roll.guid })
  }

  if (abilityRolls.length === abilityIds.length) {
    pass(`six rolls collected`)
    const res = await call('PATCH', `/api/characters/${guid}`, {
      json: { updateType: 'abilities', abilityRolls },
    })
    report(res, 'abilities', `abilities saved → ${describe(res.body)}`)
  }

  /* -- 7. Spells --------------------------------------------------- */
  console.log(c.bold('\n7. Available spells'))
  const spells = await call('GET', `/api/characters/${guid}/spells/available`)
  if (spells.ok) {
    pass(`available spells → ${describe(spells.body)}`)
    if (readers) {
      const options = readers.toOptions(spells.body)
      note(`toOptions() reads ${options.length} spells`)
    }
  } else {
    note(`available spells → ${spells.status} (may be empty for a non-caster class)`)
  }

  /* -- 8. The finished sheet --------------------------------------- */
  console.log(c.bold('\n8. Finished character sheet'))
  const final = await call('GET', `/api/characters/${guid}`)
  if (!final.ok) {
    fail(`GET character → ${final.status}`)
  } else {
    note(`shape: ${describe(final.body)}`)
    if (readers) {
      const parsed = readers.readSheet(final.body)
      if (parsed.empty) {
        fail('readSheet() recognised nothing — update the key lists in lib/sheet.ts')
      } else {
        pass('readSheet() understood the response:')
        console.log(
          c.dim(
            [
              `    name:       ${parsed.name ?? '—'}`,
              `    level:      ${parsed.level ?? '—'}`,
              `    race:       ${parsed.race ?? '—'}`,
              `    class:      ${parsed.className ?? '—'}${parsed.classPath ? ` (${parsed.classPath})` : ''}`,
              `    background: ${parsed.background ?? '—'}`,
              `    abilities:  ${parsed.abilities.map((a) => `${a.short} ${a.score ?? '—'}`).join('  ')}`,
              `    languages:  ${parsed.languages.join(', ') || '—'}`,
              `    spells:     ${parsed.spells.join(', ') || '—'}`,
            ].join('\n'),
          ),
        )
        for (const missing of ['name', 'race', 'className', 'background']) {
          if (!parsed[missing]) {
            fail(`readSheet() could not find "${missing}" — add its real key to lib/sheet.ts`)
          }
        }
        if (parsed.abilities.every((a) => a.score === undefined)) {
          fail('readSheet() found no ability scores — add the real key to readAbilities() in lib/sheet.ts')
        }
      }
    }
  }

  /* -- Summary ------------------------------------------------------ */
  await writeFile('probe-output.json', JSON.stringify(transcript, null, 2))
  console.log(c.bold('\nSummary'))
  note(`full transcript written to probe-output.json (${transcript.length} calls)`)
  if (failures) {
    console.log(`\n${c.yellow(`${failures} check(s) failed`)} — each one names the file to fix.\n`)
    process.exitCode = 1
  } else {
    console.log(`\n${c.green('Everything the app relies on checked out.')}\n`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
