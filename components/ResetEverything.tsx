'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/Button'

const CONFIRM_PHRASE = 'DELETE'

/** A tucked-away danger zone for wiping test data before the real table starts playing. */
export function ResetEverything({
  characterCount,
  campaignCount,
}: {
  characterCount: number
  campaignCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (done) {
    return <p className="text-xs text-stone-600">Everything cleared — ready for the real table.</p>
  }

  if (characterCount === 0 && campaignCount === 0) return null

  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/reset', { method: 'DELETE' })
      if (!res.ok) throw new Error('Could not clear the data.')
      setDone(true)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-stone-700 hover:text-red-400 cursor-pointer"
      >
        Clear all test data ({characterCount} character{characterCount === 1 ? '' : 's'},{' '}
        {campaignCount} campaign{campaignCount === 1 ? '' : 's'})
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
      <p className="text-xs text-red-200">
        This deletes every character and campaign on the site — {characterCount} character
        {characterCount === 1 ? '' : 's'} and {campaignCount} campaign{campaignCount === 1 ? '' : 's'} —
        for everyone. There is no undo. Type <span className="font-mono font-semibold">DELETE</span> to
        confirm.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          autoFocus
          className="w-32 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-red-500"
        />
        <Button
          variant="danger"
          size="sm"
          onClick={remove}
          disabled={busy || confirmText !== CONFIRM_PHRASE}
        >
          {busy ? 'Clearing…' : 'Delete everything'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false)
            setConfirmText('')
          }}
          disabled={busy}
        >
          Cancel
        </Button>
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  )
}
