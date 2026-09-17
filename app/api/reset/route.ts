import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/guard'
import { deleteCampaign, deleteCharacter, listCampaigns, listCharacters } from '@/lib/store'

/**
 * Wipe every character and campaign on the site — for clearing test data
 * before handing the site to the real table. Gated behind the party session
 * like everything else; the UI in front of this makes someone type a
 * confirmation phrase first, since there is no undo.
 */
export async function DELETE() {
  const denied = await requireSession()
  if (denied) return denied

  const [characters, campaigns] = await Promise.all([listCharacters(), listCampaigns()])
  await Promise.all([
    ...characters.map((character) => deleteCharacter(character.id)),
    ...campaigns.map((campaign) => deleteCampaign(campaign.id)),
  ])

  return NextResponse.json({
    ok: true,
    deletedCharacters: characters.length,
    deletedCampaigns: campaigns.length,
  })
}
