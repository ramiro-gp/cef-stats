import { useEffect, useState, type CSSProperties } from 'react'
import { APP_WORDMARK } from '../config/appBrand'

export function GroupTicker({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (messages.length < 2 || reducedMotion) return
    const timer = window.setInterval(() => setIndex(current => (current + 1) % messages.length), 4500)
    return () => window.clearInterval(timer)
  }, [messages.length, reducedMotion])

  if (!messages.length) return null

  const safeIndex = index % messages.length
  const duration = Math.max(24, messages.join(' ').length * 0.16)
  const messageRow = (copy: string) => <div key={copy} className="flex shrink-0 items-center gap-20 pr-20">{messages.map((message, messageIndex) => <span key={`${copy}-${messageIndex}-${message}`} className="whitespace-nowrap text-sm font-semibold">{message}</span>)}</div>

  return <div className="mt-3 flex min-h-11 items-center gap-3 overflow-hidden rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] px-3.5 py-2.5">
    <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {APP_WORDMARK.primary}</span>
    <div className="h-5 min-w-0 flex-1 overflow-hidden sm:hidden">
      <span className="sr-only">{messages.join('. ')}</span>
      {reducedMotion ? <p className="truncate text-sm font-semibold">{messages[0]}</p> : <div aria-hidden="true" className="ticker-marquee-track flex w-max" style={{ '--marquee-duration': `${duration}s` } as CSSProperties}>{messageRow('first')}{messageRow('second')}</div>}
    </div>
    <div className="hidden h-5 min-w-0 flex-1 overflow-hidden sm:block" aria-live="polite">
      <p key={`${safeIndex}-${messages[safeIndex]}`} className={`${reducedMotion ? '' : 'animate-ticker-in'} truncate text-sm font-semibold`}>{messages[safeIndex]}</p>
    </div>
    {messages.length > 1 && <span className="hidden shrink-0 text-[10px] tabular-nums text-slate-400 sm:block">{safeIndex + 1}/{messages.length}</span>}
  </div>
}
