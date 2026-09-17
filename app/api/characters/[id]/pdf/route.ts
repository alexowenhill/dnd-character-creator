import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/guard'
import { getCharacter } from '@/lib/store'
import { characterSheetPdf } from '@/lib/pdf-sheet'

/** The official WotC character sheet, filled with this character's numbers. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireSession()
  if (denied) return denied

  const { id } = await ctx.params
  const character = await getCharacter(id)
  if (!character) return NextResponse.json({ error: 'No such character.' }, { status: 404 })

  const pdf = await characterSheetPdf(character)
  const filename = `${character.name.replace(/[^\w -]/g, '').trim() || 'character'}.pdf`

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
