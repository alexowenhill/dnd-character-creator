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
const LOCAL_PATH = join(process.cwd(), '.data', 'characters.json')

type Bag = Record<string, StoredCharacter>

/** Netlify sets these; their absence is how we detect local development. */
function onNetlify(): boolean {
  return Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT)
}

async function readLocal(): Promise<Bag> {
  try {
    return JSON.parse(await readFile(LOCAL_PATH, 'utf8')) as Bag
  } catch {
    // No file yet, or unreadable — start empty rather than failing the request.
    return {}
  }
}

async function writeLocal(bag: Bag): Promise<void> {
  await mkdir(dirname(LOCAL_PATH), { recursive: true })
  await writeFile(LOCAL_PATH, JSON.stringify(bag, null, 2))
}

async function blobStore() {
  const { getStore } = await import('@netlify/blobs')
  return getStore(STORE_NAME)
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
