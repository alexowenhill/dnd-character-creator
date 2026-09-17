import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/guard'
import { yonderFetch, toOptions, describeUpstream } from '@/lib/yonder'
import { yonderTokenResult } from '@/lib/yonder-account'

const TYPES = new Set([
  'armor', 'book', 'clothing', 'food', 'other', 'pack', 'potion',
  'projectile', 'weapon', 'gemstone', 'art object', 'bag', 'artisan',
  'instrument', 'gaming',
])

/**
 * The Yonder item catalogue, for browsing extra gear beyond the starter kit.
 *
 * Armour class is computed from lib/equipment.ts rather than from here: the
 * API's own AC maths ignores the dexterity cap on medium and heavy armour, and
 * its starting-equipment endpoint is keyed to characters stored on their side.
 * So this is a shopping list, not a source of rules.
 */
export async function GET(req: NextRequest) {
  const denied = await requireSession()
  if (denied) return denied

  const type = req.nextUrl.searchParams.get('type') ?? ''
  if (!TYPES.has(type)) return NextResponse.json({ items: [], source: 'unavailable' })

  const { token, reason } = await yonderTokenResult()
  if (!token) return NextResponse.json({ items: [], source: 'unavailable', reason })

  const result = await yonderFetch(`/api/game/items/${encodeURIComponent(type)}`, { token })
  if (!result.ok) {
    return NextResponse.json({
      items: [],
      source: 'unavailable',
      reason: `items request failed: ${result.status} ${describeUpstream(result.body)}`,
    })
  }

  const items = toOptions(result.body)
    .map((option) => {
      const raw = option.raw as Record<string, unknown>
      const cost = raw.cost as { value?: unknown; unit?: unknown } | undefined
      return {
        id: String(option.id),
        name: option.name,
        weight: typeof raw.weight === 'number' ? raw.weight : undefined,
        cost:
          cost && cost.value !== undefined ? `${cost.value} ${cost.unit ?? ''}`.trim() : undefined,
      }
    })
    .slice(0, 200)

  return NextResponse.json({ items, source: items.length ? 'yonder' : 'unavailable' })
}
