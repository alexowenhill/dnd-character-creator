'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'

/** Deletes the campaign. Characters in it are untouched — they just drop back to unassigned. */
export function DeleteCampaign({ campaignId, campaignName }: { campaignId: string; campaignName: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not delete the campaign.')
      router.push('/')
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-stone-600 hover:text-red-400 cursor-pointer"
      >
        Delete campaign
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2">
      <span className="text-xs text-red-200">
        Delete &quot;{campaignName}&quot;? Its characters stay, just unassigned from it.
      </span>
      <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
        {busy ? 'Deleting…' : 'Yes, delete it'}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
        Cancel
      </Button>
      {error && <p className="w-full text-xs text-red-300">{error}</p>}
    </div>
  )
}
