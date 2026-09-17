import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/guard'
import { deleteCharacter, getCharacter, saveCharacter } from '@/lib/store'
import { computeSheet } from '@/lib/character'
import { validateCharacterInput } from '@/lib/validate-character'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireSession()
  if (denied) return denied

  const { id } = await ctx.params
  const character = await getCharacter(id)
  if (!character) return NextResponse.json({ error: 'No such character.' }, { status: 404 })

  return NextResponse.json(computeSheet(character))
}

/** Replace a character in place — editing it, or resetting it back through the wizard. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireSession()
  if (denied) return denied

  const { id } = await ctx.params
  const existing = await getCharacter(id)
  if (!existing) return NextResponse.json({ error: 'No such character.' }, { status: 404 })

  const result = validateCharacterInput(await req.json().catch(() => null), {
    id: existing.id,
    createdAt: existing.createdAt,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  await saveCharacter(result.character)
  return NextResponse.json({ id: result.character.id, sheet: computeSheet(result.character) })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireSession()
  if (denied) return denied

  const { id } = await ctx.params
  await deleteCharacter(id)
  return NextResponse.json({ ok: true })
}
