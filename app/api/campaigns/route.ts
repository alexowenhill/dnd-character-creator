import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { requireSession } from '@/lib/guard'
import { listCampaigns, saveCampaign } from '@/lib/store'

export async function GET() {
  const denied = await requireSession()
  if (denied) return denied
  return NextResponse.json(await listCampaigns())
}

export async function POST(req: NextRequest) {
  const denied = await requireSession()
  if (denied) return denied

  const body = (await req.json().catch(() => null)) as { name?: string; blurb?: string } | null
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) return NextResponse.json({ error: 'A campaign needs a name.' }, { status: 400 })
  if (name.length > 80) return NextResponse.json({ error: 'That name is too long.' }, { status: 400 })

  const campaign = {
    id: randomUUID(),
    name,
    blurb: typeof body?.blurb === 'string' ? body.blurb.slice(0, 500) : undefined,
    notes: [],
    createdAt: new Date().toISOString(),
  }
  await saveCampaign(campaign)
  return NextResponse.json(campaign, { status: 201 })
}
