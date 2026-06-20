import { useState } from 'react'
import type { User } from '../types'
import type { UserTotals } from '../utils/stats'
import { createProfileCardPng } from '../utils/profileCard'
import { APP_NAME, APP_SLUG } from '../config/appBrand'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function ShareProfileCardButton({ user, totals }: { user: User; totals: UserTotals }) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done'>('idle')
  const [error, setError] = useState('')
  const createAndShare = async () => {
    if (status === 'generating') return
    setStatus('generating'); setError('')
    try {
      const blob = await createProfileCardPng(user, totals)
      const handle = user.username.replace(/^@/, '').trim()
      const safeHandle = handle.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'jugador'
      const filename = `${APP_SLUG}-${safeHandle}.png`
      const file = new File([blob], filename, { type: 'image/png' })
      let canShareFile = false
      try { canShareFile = typeof navigator.share === 'function' && Boolean(navigator.canShare?.({ files: [file] })) } catch { canShareFile = false }
      if (canShareFile) {
        try { await navigator.share({ title: `Mi tarjeta ${APP_NAME}`, text: `Mis números en ${APP_NAME} ⚽`, files: [file] }) }
        catch (reason) { if (reason instanceof DOMException && reason.name === 'AbortError') throw reason; download(blob, filename) }
      } else download(blob, filename)
      setStatus('done'); window.setTimeout(() => setStatus('idle'), 1800)
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') setStatus('idle')
      else { setError(reason instanceof Error ? reason.message : 'No pudimos generar la tarjeta.'); setStatus('idle') }
    }
  }
  return <><button type="button" onClick={() => void createAndShare()} disabled={status === 'generating'} className="mt-2 min-h-11 w-full rounded-xl bg-emerald-500 font-extrabold text-ink transition hover:bg-emerald-400 disabled:opacity-60">{status === 'generating' ? 'Generando tarjeta…' : status === 'done' ? 'Tarjeta lista ✓' : 'Compartir mi tarjeta'}</button>{error && <p className="mt-2 text-center text-xs font-bold text-rose-400">{error}</p>}</>
}
