import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/guard'
import { yonderFetch, toOptions, describeUpstream } from '@/lib/yonder'
import { yonderTokenResult } from '@/lib/yonder-account'
import { YONDER_CLASS_IDS, classById } from '@/lib/srd'

/**
 * Spells available to a class at a spell level, from the Yonder spell index.
 *
 * The response shape is undocumented, so it is normalised tolerantly and an
 * unrecognised shape comes back as an empty list rather than an error — the
 * wizard then offers a free-text box instead. Nothing here blocks a character.
 *
 * With a `name` query param instead of `level`, looks up one spell by name
 * across every level the class knows, rather than a list — used by the
 * character sheet to fetch the description of a spell that was picked before
 * descriptions were saved onto the character, or typed in by hand.
 */
export async function GET(req: NextRequest) {
  const denied = await requireSession()
  if (denied) return denied

  const classId = req.nextUrl.searchParams.get('classId') ?? ''
  const name = req.nextUrl.searchParams.get('name')
  const charClass = classById(classId)
  const yonderClassId = YONDER_CLASS_IDS[classId]

  if (!charClass || yonderClassId === undefined) {
    return NextResponse.json(name ? { spell: null, source: 'unavailable' } : { spells: [], source: 'unavailable' })
  }

  const { token, reason } = await yonderTokenResult()
  if (!token) {
    return NextResponse.json(name ? { spell: null, source: 'unavailable', reason } : { spells: [], source: 'unavailable', reason })
  }

  if (name) {
    const result = await yonderFetch(`/api/game/spells/class/${yonderClassId}`, { token })
    if (!result.ok) {
      return NextResponse.json({
        spell: null,
        source: 'unavailable',
        reason: `spells request failed: ${result.status} ${describeUpstream(result.body)}`,
      })
    }
    const match = toOptions(result.body).find((option) => option.name.toLowerCase() === name.toLowerCase())
    if (!match) {
      return NextResponse.json({ spell: null, source: 'unavailable', reason: `"${name}" was not in the class spell list` })
    }
    return NextResponse.json({ spell: { name: match.name, desc: match.desc }, source: 'yonder' })
  }

  const level = Number(req.nextUrl.searchParams.get('level') ?? '0')
  if (!Number.isInteger(level) || level < 0 || level > 9) {
    return NextResponse.json({ spells: [], source: 'unavailable' })
  }

  const result = await yonderFetch(
    `/api/game/spells/class/${yonderClassId}/level/${level}`,
    { token },
  )
  if (!result.ok) {
    return NextResponse.json({
      spells: [],
      source: 'unavailable',
      reason: `spells request failed: ${result.status} ${describeUpstream(result.body)}`,
    })
  }

  const spells = toOptions(result.body)
    .map((option) => ({ id: String(option.id), name: option.name, desc: option.desc }))
    .slice(0, 80)

  return NextResponse.json({
    spells,
    source: spells.length ? 'yonder' : 'unavailable',
    reason: spells.length ? undefined : `no spells found in the response: ${describeUpstream(result.body)}`,
  })
}
