import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/guard'
import { rollAbilities } from '@/lib/dice'

/**
 * Six 4d6-drop-lowest rolls. Rolled by the server so the numbers cannot be
 * quietly retried in the browser until they come out nicely.
 */
export async function POST() {
  const denied = await requireSession()
  if (denied) return denied

  return NextResponse.json(await rollAbilities())
}
