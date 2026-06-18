import { useEffect, useState } from 'react'

export function GroupTicker({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (messages.length < 2) return
    const timer = window.setInterval(() => setIndex(current => (current + 1) % messages.length), 4500)
    return () => window.clearInterval(timer)
  }, [messages.length])

  if (!messages.length) return null

  const safeIndex = index % messages.length

  return <div className="mt-3 flex min-h-11 items-center gap-3 overflow-hidden rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] px-3.5 py-2.5">
    <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> En vivo</span>
    <div className="h-5 min-w-0 flex-1 overflow-hidden" aria-live="polite">
      <p key={`${safeIndex}-${messages[safeIndex]}`} className="animate-ticker-in truncate text-sm font-semibold">{messages[safeIndex]}</p>
    </div>
    {messages.length > 1 && <span className="shrink-0 text-[10px] tabular-nums text-slate-400">{safeIndex + 1}/{messages.length}</span>}
  </div>
}
