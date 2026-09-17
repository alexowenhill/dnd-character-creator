import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/guard'
import { yonderFetch, describeUpstream } from '@/lib/yonder'
import { yonderTokenResult } from '@/lib/yonder-account'

/** Name styles the Yonder generator understands. */
const STYLES = new Set([
  'goblin', 'orc', 'ogre', 'dwarf', 'halfling', 'gnome', 'elf',
  'fey', 'demon', 'angel', 'human', 'tiefling',
])

/**
 * Name suggestions from the Yonder generator, which builds them with a Markov
 * chain per race. If it is unavailable the caller just types a name, but the
 * reason comes back too — "not configured" and "wrong password" and "the API
 * is down" all used to look identical, which made this undiagnosable.
 */
export async function GET(req: NextRequest) {
  const denied = await requireSession()
  if (denied) return denied

  const style = req.nextUrl.searchParams.get('style') ?? ''
  const path = STYLES.has(style) ? `/api/names/${style}` : '/api/names'

  const { token, reason } = await yonderTokenResult()
  if (!token) return NextResponse.json({ names: [], source: 'unavailable', reason })

  const result = await yonderFetch(path, { token })
  if (!result.ok) {
    return NextResponse.json({
      names: [],
      source: 'unavailable',
      reason: `names request failed: ${result.status} ${describeUpstream(result.body)}`,
    })
  }

  const names = (result.body as { names?: unknown } | null)?.names
  if (!Array.isArray(names)) {
    return NextResponse.json({
      names: [],
      source: 'unavailable',
      reason: `unexpected response shape: ${describeUpstream(result.body)}`,
    })
  }

  return NextResponse.json({ names: names.map(String).slice(0, 12), source: 'yonder' })
}
