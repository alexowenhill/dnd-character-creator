import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { requireSession } from '@/lib/guard'
import { deleteCampaign, getCampaign, saveCampaign } from '@/lib/store'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireSession()
  if (denied) return denied

  const { id } = await ctx.params
  const campaign = await getCampaign(id)
  if (!campaign) return NextResponse.json({ error: 'No such campaign.' }, { status: 404 })
  return NextResponse.json(campaign)
}

/** Add a note (lore, session recap, a house rule) to the campaign. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireSession()
  if (denied) return denied

  const { id } = await ctx.params
  const campaign = await getCampaign(id)
  if (!campaign) return NextResponse.json({ error: 'No such campaign.' }, { status: 404 })

  const body = (await req.json().catch(() => null)) as
    | { title?: string; body?: string; author?: string }
    | null
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const text = typeof body?.body === 'string' ? body.body.trim() : ''
  if (!title && !text) {
    return NextResponse.json({ error: 'A note needs a title or some text.' }, { status: 400 })
  }

  campaign.notes.unshift({
    id: randomUUID(),
    title: title.slice(0, 120) || 'Note',
    body: text.slice(0, 5000),
    author: typeof body?.author === 'string' ? body.author.trim().slice(0, 40) : '',
    createdAt: new Date().toISOString(),
  })
  await saveCampaign(campaign)
  return NextResponse.json(campaign, { status: 201 })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireSession()
  if (denied) return denied

  const { id } = await ctx.params
  await deleteCampaign(id)
  return NextResponse.json({ ok: true })
}
