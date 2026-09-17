import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/guard'
import { deleteCharacter, getCharacter } from '@/lib/store'
import { computeSheet } from '@/lib/character'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireSession()
  if (denied) return denied

  const { id } = await ctx.params
  const character = await getCharacter(id)
  if (!character) return NextResponse.json({ error: 'No such character.' }, { status: 404 })

  return NextResponse.json(computeSheet(character))
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireSession()
  if (denied) return denied

  const { id } = await ctx.params
  await deleteCharacter(id)
  return NextResponse.json({ ok: true })
}
