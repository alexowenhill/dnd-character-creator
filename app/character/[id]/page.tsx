import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Sheet } from '@/components/Sheet'
import { signedIn } from '@/lib/guard'
import { getCharacter } from '@/lib/store'
import { computeSheet } from '@/lib/character'

export const dynamic = 'force-dynamic'

export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await signedIn())) redirect('/')

  const { id } = await params
  const character = await getCharacter(id)
  if (!character) notFound()

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 space-y-6">
      <Link href="/" className="text-sm text-stone-400 hover:text-stone-300">
        ← The party
      </Link>
      <Sheet sheet={computeSheet(character)} />
    </main>
  )
}
