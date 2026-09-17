/**
 * Character storage.
 *
 * Netlify Blobs in production. Netlify provides the store automatically for a
 * deployed site, so there is nothing to configure beyond the site itself.
 *
 * Locally there is no Blobs service, so the same interface is backed by a file
 * under .data/. That keeps `npm run dev` working without a Netlify login, and
 * means the storage call sites do not care which is in use.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { StoredCharacter } from './character.ts'

const STORE_NAME = 'characters'
const CAMPAIGN_STORE = 'campaigns'
const LOCAL_PATH = join(process.cwd(), '.data', 'characters.json')
const LOCAL_CAMPAIGN_PATH = join(process.cwd(), '.data', 'campaigns.json')

type Bag = Record<string, StoredCharacter>

/**
 * A campaign groups the party and holds shared notes.
 *
 * Kept local rather than using the API's campaigns: those are tied to Yonder
 * user accounts and their invites go to Yonder users, but everyone here shares
 * one account, so invites have nobody to address.
 */
export type Campaign = {
  id: string
  name: string
  blurb?: string
  /** Shared lore, session notes, house rules — newest first. */
  notes: { id: string; title: string; body: string; author: string; createdAt: string }[]
  createdAt: string
}

type CampaignBag = Record<string, Campaign>

/** Netlify sets these; their absence is how we detect local development. */
function onNetlify(): boolean {
  return Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT)
}

async function readLocalFile<T>(path: string): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T
  } catch {
    // No file yet, or unreadable — start empty rather than failing the request.
    return {} as T
  }
}

async function writeLocalFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value, null, 2))
}

const readLocal = () => readLocalFile<Bag>(LOCAL_PATH)
const writeLocal = (bag: Bag) => writeLocalFile(LOCAL_PATH, bag)

async function blobStore(name = STORE_NAME) {
  const { getStore } = await import('@netlify/blobs')
  return getStore(name)
}

export async function listCharacters(): Promise<StoredCharacter[]> {
  let characters: StoredCharacter[]

  if (onNetlify()) {
    const store = await blobStore()
    const { blobs } = await store.list()
    characters = (
      await Promise.all(
        blobs.map(async (blob) => (await store.get(blob.key, { type: 'json' })) as StoredCharacter | null),
      )
    ).filter((entry): entry is StoredCharacter => entry !== null)
  } else {
    characters = Object.values(await readLocal())
  }

  // Newest first, so a fresh character is at the top of the party page.
  return characters.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function getCharacter(id: string): Promise<StoredCharacter | null> {
  if (onNetlify()) {
    const store = await blobStore()
    return ((await store.get(id, { type: 'json' })) as StoredCharacter | null) ?? null
  }
  return (await readLocal())[id] ?? null
}

export async function saveCharacter(character: StoredCharacter): Promise<void> {
  if (onNetlify()) {
    const store = await blobStore()
    await store.setJSON(character.id, character)
    return
  }
  const bag = await readLocal()
  bag[character.id] = character
  await writeLocal(bag)
}

export async function deleteCharacter(id: string): Promise<void> {
  if (onNetlify()) {
    const store = await blobStore()
    await store.delete(id)
    return
  }
  const bag = await readLocal()
  delete bag[id]
  await writeLocal(bag)
}

/* ------------------------------------------------------------------ *
 * Campaigns
 * ------------------------------------------------------------------ */

export async function listCampaigns(): Promise<Campaign[]> {
  let campaigns: Campaign[]

  if (onNetlify()) {
    const store = await blobStore(CAMPAIGN_STORE)
    const { blobs } = await store.list()
    campaigns = (
      await Promise.all(
        blobs.map(async (blob) => (await store.get(blob.key, { type: 'json' })) as Campaign | null),
      )
    ).filter((entry): entry is Campaign => entry !== null)
  } else {
    campaigns = Object.values(await readLocalFile<CampaignBag>(LOCAL_CAMPAIGN_PATH))
  }

  return campaigns.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  if (onNetlify()) {
    const store = await blobStore(CAMPAIGN_STORE)
    return ((await store.get(id, { type: 'json' })) as Campaign | null) ?? null
  }
  return (await readLocalFile<CampaignBag>(LOCAL_CAMPAIGN_PATH))[id] ?? null
}

export async function saveCampaign(campaign: Campaign): Promise<void> {
  if (onNetlify()) {
    const store = await blobStore(CAMPAIGN_STORE)
    await store.setJSON(campaign.id, campaign)
    return
  }
  const bag = await readLocalFile<CampaignBag>(LOCAL_CAMPAIGN_PATH)
  bag[campaign.id] = campaign
  await writeLocalFile(LOCAL_CAMPAIGN_PATH, bag)
}

export async function deleteCampaign(id: string): Promise<void> {
  if (onNetlify()) {
    const store = await blobStore(CAMPAIGN_STORE)
    await store.delete(id)
    return
  }
  const bag = await readLocalFile<CampaignBag>(LOCAL_CAMPAIGN_PATH)
  delete bag[id]
  await writeLocalFile(LOCAL_CAMPAIGN_PATH, bag)
}
