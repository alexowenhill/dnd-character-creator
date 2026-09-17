'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/Button'

type Note = { id: string; title: string; body: string; author: string; createdAt: string }

/** Shared campaign notes — lore, session recaps, house rules. */
export function Notes({ campaignId, notes }: { campaignId: string; notes: Note[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [author, setAuthor] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, author }),
      })
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(data?.error ?? 'Could not save the note.')
      setTitle('')
      setBody('')
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const input =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-stone-600 outline-none focus:border-amber-500'

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-stone-500">Notes and lore</h2>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-sm text-stone-400 hover:text-stone-300 cursor-pointer"
          >
            + Add a note
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title — e.g. Session 3, or The Duke's bargain"
            autoFocus
            className={input}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What happened, what you learned, what you owe whom…"
            rows={5}
            className={`${input} resize-y`}
          />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Your name (optional)"
            className={`${input} max-w-xs`}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={busy}>
              {busy ? 'Saving…' : 'Save note'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-stone-500">
          Nothing written down yet. Notes here are shared with everyone who has the password.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <article key={note.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium text-stone-100">{note.title}</h3>
                <span className="text-[11px] text-stone-500">
                  {note.author ? `${note.author} · ` : ''}
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
              </div>
              {note.body && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-300">
                  {note.body}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
