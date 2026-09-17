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
 */
export async function GET(req: NextRequest) {
  const denied = await requireSession()
  if (denied) return denied

  const classId = req.nextUrl.searchParams.get('classId') ?? ''
  const level = Number(req.nextUrl.searchParams.get('level') ?? '0')
  const charClass = classById(classId)
  const yonderClassId = YONDER_CLASS_IDS[classId]

  if (!charClass || yonderClassId === undefined || !Number.isInteger(level) || level < 0 || level > 9) {
    return NextResponse.json({ spells: [], source: 'unavailable' })
  }

  const { token, reason } = await yonderTokenResult()
  if (!token) return NextResponse.json({ spells: [], source: 'unavailable', reason })

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
