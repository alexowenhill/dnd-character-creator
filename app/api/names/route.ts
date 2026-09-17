import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/guard'
import { yonderFetch } from '@/lib/yonder'
import { yonderToken } from '@/lib/yonder-account'

/** Name styles the Yonder generator understands. */
const STYLES = new Set([
  'goblin', 'orc', 'ogre', 'dwarf', 'halfling', 'gnome', 'elf',
  'fey', 'demon', 'angel', 'human', 'tiefling',
])

/**
 * Name suggestions from the Yonder generator, which builds them with a Markov
 * chain per race. Purely a nicety — if it is unavailable the caller just types
 * a name, so this answers with an empty list rather than an error.
 */
export async function GET(req: NextRequest) {
  const denied = await requireSession()
  if (denied) return denied

  const style = req.nextUrl.searchParams.get('style') ?? ''
  const path = STYLES.has(style) ? `/api/names/${style}` : '/api/names'

  const token = await yonderToken()
  if (!token) return NextResponse.json({ names: [], source: 'unavailable' })

  const result = await yonderFetch(path, { token })
  const names = (result.body as { names?: unknown } | null)?.names
  return NextResponse.json({
    names: Array.isArray(names) ? names.map(String).slice(0, 12) : [],
    source: result.ok ? 'yonder' : 'unavailable',
  })
}
