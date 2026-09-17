import Link from 'next/link'
import { redirect } from 'next/navigation'
import { signedIn } from '@/lib/guard'
import { Console } from './Console'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'API console',
}

export default async function ConsolePage() {
  if (!(await signedIn())) redirect('/')

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 space-y-6">
      <header className="space-y-1">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-300">
          ← The party
        </Link>
        <h1 className="text-2xl font-semibold text-stone-100">API console</h1>
        <p className="text-sm text-stone-400">
          Sends raw requests to the real D&D Yonder API, through the shared account&apos;s
          token, and shows back exactly what it says. Nothing here is shaped or cached —
          it is the same route surface the rest of the app calls, laid bare for testing.
        </p>
      </header>

      <Console />
    </main>
  )
}
