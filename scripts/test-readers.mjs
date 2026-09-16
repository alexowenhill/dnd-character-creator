/**
 * Checks the response readers against a range of plausible payload shapes.
 *
 * The upstream API does not document its response shapes, so lib/shape.ts and
 * lib/sheet.ts probe for field names. These cases pin down the behaviour that
 * matters — above all the alphabetical ability ids, where a silent mix-up would
 * hand someone the wrong stats — and prove that an unrecognised shape degrades
 * instead of crashing.
 *
 * Run against the real API with `npm run probe`; this needs no network.
 *
 *   npm test
 */
import { readSheet, modifierFor } from '../lib/sheet.ts'
import { toOptions, extractGuid, extractRoll, bestThreeOfFour, extractToken, describeUpstream, listCharacters } from '../lib/shape.ts'

let failed = 0
const check = (label, cond, extra = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${cond ? '' : ` ${extra}`}`)
  if (!cond) failed++
}

// --- readSheet across plausible shapes -----------------------------
// Shape A: flat, abilities as list keyed by abilityId (alphabetical ids)
const a = readSheet({
  name: 'Thorin', level: 3,
  race: { id: 1, name: 'Dwarf' },
  class: { id: 2, name: 'Fighter', path: { name: 'Champion' } },
  background: { name: 'Soldier' },
  abilities: [
    { abilityId: 5, score: 16 }, // STR
    { abilityId: 3, score: 12 }, // DEX
    { abilityId: 2, score: 15 }, // CON
    { abilityId: 4, score: 9 },  // INT
    { abilityId: 6, score: 13 }, // WIS
    { abilityId: 1, score: 8 },  // CHA
  ],
  languages: [{ name: 'Common' }, { name: 'Dwarvish' }],
  spells: [],
})
check('A: name', a.name === 'Thorin')
check('A: race', a.race === 'Dwarf')
check('A: class', a.className === 'Fighter')
check('A: path', a.classPath === 'Champion', a.classPath)
check('A: background', a.background === 'Soldier')
check('A: STR first in sheet order', a.abilities[0].short === 'STR' && a.abilities[0].score === 16)
check('A: CHA last, id 1', a.abilities[5].short === 'CHA' && a.abilities[5].score === 8)
check('A: modifier STR 16 = +3', a.abilities[0].modifier === 3, String(a.abilities[0].modifier))
check('A: languages', a.languages.join(',') === 'Common,Dwarvish', a.languages.join(','))
check('A: not empty', a.empty === false)

// Shape B: wrapped in envelope, abilities keyed by name, plain strings
const b = readSheet({
  character: {
    characterName: 'Lyra',
    level: 1,
    race: 'Elf',
    class: 'Wizard',
    background: 'Sage',
    abilities: { strength: 8, dexterity: 15, constitution: 12, intelligence: 17, wisdom: 13, charisma: 10 },
    languages: ['Common', 'Elvish'],
    spells: ['Magic Missile'],
  },
})
check('B: envelope unwrapped', b.name === 'Lyra', b.name)
check('B: race string', b.race === 'Elf')
check('B: abilities by name, INT 17', b.abilities.find(x => x.short === 'INT').score === 17)
check('B: INT mod +3', b.abilities.find(x => x.short === 'INT').modifier === 3)
check('B: spells', b.spells.join(',') === 'Magic Missile')

// Shape C: abilities as list keyed by ability NAME + "value"
const c = readSheet({
  name: 'Grok',
  abilities: [{ name: 'Strength', value: 18 }, { name: 'CHA', value: 6 }],
})
check('C: by label', c.abilities.find(x => x.short === 'STR').score === 18)
check('C: by short code', c.abilities.find(x => x.short === 'CHA').score === 6)

// Shape D: total garbage -> empty flag set, no crash
const d = readSheet({ wibble: true, frotz: [1, 2] })
check('D: empty flagged', d.empty === true)
check('D: six ability slots still present', d.abilities.length === 6)
const e = readSheet(null)
check('E: null safe', e.empty === true && e.abilities.length === 6)

// modifiers
check('mod 10 = 0', modifierFor(10) === 0)
check('mod 9 = -1', modifierFor(9) === -1)
check('mod 3 = -4', modifierFor(3) === -4)
check('mod 20 = +5', modifierFor(20) === 5)

// --- shape.ts helpers ------------------------------------------------
check('toOptions bare array', toOptions([{ id: 1, name: 'Elf' }]).length === 1)
check('toOptions enveloped', toOptions({ data: [{ id: 2, name: 'Orc' }] })[0].name === 'Orc')
check('toOptions races key', toOptions({ races: [{ id: 3, name: 'Human' }] })[0].id === 3)
check('toOptions strings', toOptions(['Alice', 'Bob'])[0].name === 'Alice')
check('toOptions nested children', toOptions([{ id: 1, name: 'Fighter', paths: [{ id: 9, name: 'Champion' }] }])[0].children[0].name === 'Champion')
check('extractGuid direct', extractGuid({ guid: 'abc' }) === 'abc')
check('extractGuid nested', extractGuid({ character: { guid: 'xyz' } }) === 'xyz')
check('extractGuid nested in data', extractGuid({ data: { guid: 'd1' } }) === 'd1')
// The reported failure: a numeric id was rejected outright.
check('extractGuid numeric id', extractGuid({ id: 42 }) === '42', String(extractGuid({ id: 42 })))
check('extractGuid numeric nested', extractGuid({ character: { id: 7 } }) === '7')
check('extractGuid uuid key', extractGuid({ uuid: 'u1' }) === 'u1')
check('extractGuid characterId', extractGuid({ characterId: 9 }) === '9')
check('extractGuid character_guid', extractGuid({ character_guid: 'cg' }) === 'cg')
check('extractGuid deeply nested', extractGuid({ result: { data: { character: { guid: 'deep' } } } }) === 'deep')
// A guid anywhere beats an id, even a shallower one belonging to something else.
check('extractGuid prefers guid over id', extractGuid({ id: 1, guid: 'g' }) === 'g')
check('extractGuid guid wins over owner id', extractGuid({ user: { id: 99 }, character: { guid: 'right' } }) === 'right',
  String(extractGuid({ user: { id: 99 }, character: { guid: 'right' } })))
check('extractGuid none -> null', extractGuid({ message: 'created' }) === null)
check('extractGuid null safe', extractGuid(null) === null)
check('extractGuid cycle safe', (() => { const a = { n: {} }; a.n.back = a; return extractGuid(a) === null })())
check('extractRoll numeric guid', (() => {
  const r = extractRoll({ guid: 1234, rolls: { d6: [1, 2, 3, 4] } }); return r?.guid === '1234'
})())
check('extractRoll', (() => { const r = extractRoll({ guid: 'g1', rolls: { d6: [4, 5, 2, 6] } }); return r.guid === 'g1' && r.values.length === 4 })())
check('bestThreeOfFour drops lowest', bestThreeOfFour([4, 5, 2, 6]) === 15, String(bestThreeOfFour([4, 5, 2, 6])))

// --- listCharacters: where a guid really comes from -------------------
check('listCharacters bare array', listCharacters([{ guid: 'a', name: 'Thorin' }]).length === 1)
check('listCharacters reads name', listCharacters([{ guid: 'a', name: 'Thorin' }])[0].name === 'Thorin')
check('listCharacters enveloped', listCharacters({ data: [{ guid: 'b', name: 'Lyra' }] })[0].guid === 'b')
check('listCharacters characters key', listCharacters({ characters: [{ guid: 'c', name: 'X' }] })[0].guid === 'c')
check('listCharacters numeric id', listCharacters([{ id: 7, name: 'Grok' }])[0].guid === '7')
check('listCharacters skips entries with no id', listCharacters([{ name: 'nope' }]).length === 0)
check('listCharacters missing name -> empty string', listCharacters([{ guid: 'd' }])[0].name === '')
check('listCharacters null safe', listCharacters(null).length === 0)
check('listCharacters finds the new one by diff', (() => {
  const before = listCharacters([{ guid: 'a', name: 'Old' }])
  const after = listCharacters([{ guid: 'a', name: 'Old' }, { guid: 'b', name: 'New' }])
  const known = new Set(before.map((c) => c.guid))
  const fresh = after.filter((c) => !known.has(c.guid))
  return fresh.length === 1 && fresh[0].guid === 'b'
})())

// --- extractToken: the shapes Laravel auth endpoints actually use -----
check('token: top level', extractToken({ token: 'abc.def.ghi' }) === 'abc.def.ghi')
check('token: with user alongside', extractToken({ user: { id: 1 }, token: 't1' }) === 't1')
check('token: access_token (Passport)', extractToken({ access_token: 't2', token_type: 'Bearer' }) === 't2')
check('token: plainTextToken (Sanctum)', extractToken({ plainTextToken: '1|abcdef' }) === '1|abcdef')
check('token: nested in data', extractToken({ data: { token: 't3' } }) === 't3')
check('token: nested in user', extractToken({ user: { name: 'x', api_token: 't4' } }) === 't4')
check('token: nested object under token', extractToken({ token: { plainTextToken: 't5' } }) === 't5')
check('token: bare string body', extractToken('1|rawtoken') === '1|rawtoken')
check('token: shallow beats deep', extractToken({ token: 'shallow', data: { token: 'deep' } }) === 'shallow')
check('token: absent -> null', extractToken({ message: 'Invalid credentials' }) === null)
check('token: HTML body -> null', extractToken('<!DOCTYPE html><html>') === null)
check('token: null safe', extractToken(null) === null)
check('token: no infinite loop on cycle', (() => {
  const a = { nested: {} }; a.nested.back = a
  return extractToken(a) === null
})())

// --- describeUpstream ------------------------------------------------
check('describe: message field', describeUpstream({ message: 'Invalid credentials' }) === 'Invalid credentials')
check('describe: error field', describeUpstream({ error: 'nope' }) === 'nope')
check('describe: html', describeUpstream('<!DOCTYPE html>') === 'an HTML page rather than JSON')
check('describe: empty', describeUpstream(null) === 'empty response')
check('describe: falls back to JSON', describeUpstream({ odd: 1 }) === '{"odd":1}', describeUpstream({ odd: 1 }))

console.log(failed ? `\n${failed} FAILED` : '\nall passed')
process.exitCode = failed ? 1 : 0
