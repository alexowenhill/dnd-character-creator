'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'

/** Create a campaign to group the party under. */
export function CampaignBar({ hasCampaigns }: { hasCampaigns: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(data?.error ?? 'Could not create the campaign.')
      setName('')
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-stone-400 hover:text-stone-300 cursor-pointer"
      >
        {hasCampaigns ? '+ Another campaign' : '+ Start a campaign'}
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Campaign name"
        autoFocus
        required
        className="flex-1 min-w-[200px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-stone-600 outline-none focus:border-amber-500"
      />
      <Button type="submit" variant="primary" size="sm" disabled={busy}>
        {busy ? 'Creating…' : 'Create'}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  )
}
