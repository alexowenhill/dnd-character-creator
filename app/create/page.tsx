import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Wizard } from './Wizard'
import { signedIn } from '@/lib/guard'
import { listCampaigns } from '@/lib/store'
import { DEFAULT_LEVEL } from '@/lib/config'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Make a character',
}

export default async function CreatePage() {
  if (!(await signedIn())) redirect('/')

  const campaigns = (await listCampaigns()).map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
  }))

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 space-y-6">
      <header className="space-y-1">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-300">
          ← The party
        </Link>
        <h1 className="text-2xl font-semibold text-stone-100">Make a character</h1>
        <p className="text-sm text-stone-400">
          Starting at level {DEFAULT_LEVEL}. Nothing is saved until the last step.
        </p>
      </header>

      <Wizard defaultLevel={DEFAULT_LEVEL} campaigns={campaigns} />
    </main>
  )
}
