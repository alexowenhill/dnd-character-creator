import { cookies } from 'next/headers'
import { DND_TOKEN_COOKIE } from '@/lib/yonder'
import { CharacterCreator } from './CharacterCreator'

export default async function HomePage() {
  const signedIn = Boolean((await cookies()).get(DND_TOKEN_COOKIE)?.value)

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 space-y-8">
      <header className="space-y-1">
        <div className="text-4xl">🎲</div>
        <h1 className="text-2xl font-semibold text-stone-300">Character creator</h1>
        <p className="text-sm text-stone-400">
          Pick a race, a class and a background, roll your stats, and end up with a character sheet.
        </p>
      </header>

      <CharacterCreator signedIn={signedIn} />
    </main>
  )
}
