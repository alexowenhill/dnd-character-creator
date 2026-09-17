import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Notes } from './Notes'
import { DeleteCampaign } from './DeleteCampaign'
import { signedIn } from '@/lib/guard'
import { getCampaign, listCharacters } from '@/lib/store'
import { computeSheet, formatModifier } from '@/lib/character'

export const dynamic = 'force-dynamic'

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await signedIn())) redirect('/')

  const { id } = await params
  const [campaign, characters] = await Promise.all([getCampaign(id), listCharacters()])
  if (!campaign) notFound()

  const members = characters.filter((character) => character.campaignId === id)

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 space-y-8">
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href="/" className="text-sm text-stone-400 hover:text-stone-300">
              ← The party
            </Link>
            <h1 className="text-2xl font-semibold text-stone-100">{campaign.name}</h1>
            <p className="text-sm text-stone-400">
              {members.length} character{members.length === 1 ? '' : 's'}
            </p>
          </div>
          <DeleteCampaign campaignId={campaign.id} campaignName={campaign.name} />
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-stone-500">The party</h2>
        {members.length === 0 ? (
          <p className="text-sm text-stone-500">
            No characters in this campaign yet — pick it on the last step when you make one.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {members.map((character) => {
              const sheet = computeSheet(character)
              return (
                <Link
                  key={character.id}
                  href={`/character/${character.id}`}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-stone-100">{character.name}</span>
                    <span className="text-xs text-stone-500">{character.playerName || '—'}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-400">
                    Level {character.level} {sheet.raceName} {sheet.className}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {sheet.abilities.map((ability) => (
                      <span
                        key={ability.key}
                        className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-stone-400"
                      >
                        {ability.short} {ability.total}
                        <span className="ml-1 text-stone-600">
                          {formatModifier(ability.modifier)}
                        </span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-stone-500">
                    {sheet.hitPoints} HP · AC {sheet.armourClass}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <Notes campaignId={campaign.id} notes={campaign.notes} />
    </main>
  )
}
