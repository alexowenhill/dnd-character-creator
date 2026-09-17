import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/guard'
import { rollD20 } from '@/lib/dice'

/**
 * A single d20 for clicking an ability (or skill, or save) on the sheet to
 * roll a check. The modifier is added client-side from the sheet's own
 * numbers — this only supplies the die.
 */
export async function POST() {
  const denied = await requireSession()
  if (denied) return denied

  return NextResponse.json(await rollD20())
}
