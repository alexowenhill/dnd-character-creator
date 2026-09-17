'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'

/**
 * The shared party password. No usernames — everyone types the same thing.
 */
export function Gate({ configured }: { configured: boolean }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(data?.error ?? 'That did not work.')
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
        <p className="font-medium">No party password is set yet.</p>
        <p className="mt-1 text-amber-200/80">
          Set <code className="rounded bg-black/30 px-1.5 py-0.5">PARTY_PASSWORD</code> in the
          site&rsquo;s environment variables and redeploy. Everyone who knows it can then get in from
          this page.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="max-w-sm space-y-3">
      <p className="text-sm text-stone-400">
        Type the party password. There is no username — everyone uses the same one.
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Party password"
        autoComplete="current-password"
        autoFocus
        required
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-stone-600 outline-none focus:border-amber-500"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={busy}>
        {busy ? 'Checking…' : 'Enter'}
      </Button>
    </form>
  )
}
