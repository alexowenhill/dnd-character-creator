import { cookies } from 'next/headers'
import Link from 'next/link'
import { DND_TOKEN_COOKIE } from '@/lib/yonder'
import { Console } from './Console'

export const metadata = {
  title: 'API console',
  description: 'Send requests to the D&D Yonder API and see exactly what comes back.',
}

export default async function ConsolePage() {
  const signedIn = Boolean((await cookies()).get(DND_TOKEN_COOKIE)?.value)

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 space-y-6">
      <header className="space-y-1">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-300">
          ← Character creator
        </Link>
        <h1 className="text-2xl font-semibold text-stone-200">API console</h1>
        <p className="text-sm text-stone-400">
          Send any request to the D&amp;D Yonder API and see exactly what comes back. Requests go
          through the same server-side proxy the app uses, so your token is attached for you and
          never touches the browser.
        </p>
      </header>

      <Console signedIn={signedIn} />
    </main>
  )
}
