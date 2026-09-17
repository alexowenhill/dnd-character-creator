import Link from 'next/link'
import { Gate } from '@/components/Gate'
import { signedIn } from '@/lib/guard'
import { partyPassword } from '@/lib/session'
import { listCampaigns, listCharacters } from '@/lib/store'
import { CampaignBar } from '@/components/CampaignBar'
import { computeSheet, formatModifier } from '@/lib/character'
import { DEFAULT_LEVEL } from '@/lib/config'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const unlocked = await signedIn()

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <div className="text-3xl">🎲</div>
        <h1 className="text-2xl font-semibold text-stone-100">The party</h1>
        <p className="text-sm text-stone-400">
          Answer a few questions, roll your stats, and walk away with a level {DEFAULT_LEVEL}{' '}
          character sheet. No rules knowledge needed.
        </p>
      </header>

      {!unlocked ? (
        <Gate configured={Boolean(partyPassword())} />
      ) : (
        <PartyList />
      )}

      {unlocked && (
        <footer className="pt-4">
          <Link href="/console" className="text-xs text-stone-600 hover:text-stone-400">
            API console — send raw requests and see what the API returns
          </Link>
        </footer>
      )}
    </main>
  )
}

async function PartyList() {
  const [characters, campaigns] = await Promise.all([listCharacters(), listCampaigns()])

  // Group by campaign, with anything unassigned last.
  const groups = [
    ...campaigns.map((campaign) => ({
      key: campaign.id,
      name: campaign.name,
      href: `/campaign/${campaign.id}`,
      members: characters.filter((character) => character.campaignId === campaign.id),
    })),
    {
      key: 'none',
      name: campaigns.length ? 'Not in a campaign' : '',
      href: null,
      members: characters.filter(
        (character) => !character.campaignId || !campaigns.some((c) => c.id === character.campaignId),
      ),
    },
  ].filter((group) => group.members.length > 0 || group.key !== 'none')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/create"
          className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-stone-950 transition-colors hover:bg-amber-500"
        >
          Make a character
        </Link>
        <CampaignBar hasCampaigns={campaigns.length > 0} />
      </div>

      {characters.length === 0 && campaigns.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-stone-400">
          Nobody has made a character yet. Be the first.
        </p>
      ) : (
        // Campaign headings show even before anyone has joined them, so a
        // campaign created first is not invisible.
        groups.map((group) => (
        <div key={group.key} className="space-y-3">
          {group.name && (
            <h2 className="text-xs font-medium uppercase tracking-wider text-stone-500">
              {group.href ? (
                <Link href={group.href} className="hover:text-stone-300">
                  {group.name} →
                </Link>
              ) : (
                group.name
              )}
            </h2>
          )}
          {group.members.length === 0 ? (
            <p className="text-sm text-stone-600">No characters yet.</p>
          ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {group.members.map((character) => {
            const sheet = computeSheet(character)
            return (
              <div
                key={character.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
              >
                <Link href={`/character/${character.id}`} className="block">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-stone-100">{character.name}</span>
                    <span className="text-xs text-stone-500">
                      {character.playerName || '—'}
                    </span>
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
                        <span className="ml-1 text-stone-600">{formatModifier(ability.modifier)}</span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-stone-500">
                    {sheet.hitPoints} HP · AC {sheet.armourClass}
                  </p>
                </Link>
                <div className="mt-3 flex gap-3 border-t border-white/5 pt-2 text-[11px]">
                  <Link href={`/create?edit=${character.id}`} className="text-stone-500 hover:text-sky-400">
                    Edit
                  </Link>
                  <Link href={`/create?reset=${character.id}`} className="text-stone-500 hover:text-amber-400">
                    Start over
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
          )}
        </div>
        ))
      )}
    </div>
  )
}
