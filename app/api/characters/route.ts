import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/guard'
import { listCharacters, saveCharacter } from '@/lib/store'
import { computeSheet } from '@/lib/character'
import { validateCharacterInput } from '@/lib/validate-character'

export async function GET() {
  const denied = await requireSession()
  if (denied) return denied

  const characters = await listCharacters()
  // Send computed sheets so the party page can show real numbers.
  return NextResponse.json(characters.map((character) => computeSheet(character)))
}

export async function POST(req: NextRequest) {
  const denied = await requireSession()
  if (denied) return denied

  const result = validateCharacterInput(await req.json().catch(() => null))
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  await saveCharacter(result.character)
  return NextResponse.json({ id: result.character.id, sheet: computeSheet(result.character) }, { status: 201 })
}
