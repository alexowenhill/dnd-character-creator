import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Wizard } from './Wizard'
import { signedIn } from '@/lib/guard'
import { getCharacter, listCampaigns } from '@/lib/store'
import { DEFAULT_LEVEL } from '@/lib/config'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Make a character',
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; reset?: string }>
}) {
  if (!(await signedIn())) redirect('/')

  const { edit, reset } = await searchParams
  const editingId = edit || reset
  const mode = edit ? 'edit' : reset ? 'reset' : 'create'

  const [campaigns, initial] = await Promise.all([
    listCampaigns().then((entries) => entries.map((campaign) => ({ id: campaign.id, name: campaign.name }))),
    editingId ? getCharacter(editingId) : null,
  ])
  if (editingId && !initial) notFound()

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 space-y-6">
      <header className="space-y-1">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-300">
          ← The party
        </Link>
        <p className="text-sm font-medium text-sky-400">⚓ Greetings — it&apos;s time to create our characters for this sea quest.</p>
        <h1 className="text-2xl font-semibold text-stone-100">
          {mode === 'edit' ? `Edit ${initial?.name}` : mode === 'reset' ? `Start ${initial?.name} over` : 'Make a character'}
        </h1>
        <p className="text-sm text-stone-400">
          Starting at level {DEFAULT_LEVEL}. Nothing is saved until the last step.
        </p>
      </header>

      <Wizard defaultLevel={DEFAULT_LEVEL} campaigns={campaigns} initial={initial} mode={mode} />
    </main>
  )
}
