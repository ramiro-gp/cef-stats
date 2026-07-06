import { useEffect } from 'react'

export interface ToastMessage {
  id: number
  tone: 'success' | 'error'
  text: string
  durationMs?: number
  actionLabel?: string
  onAction?: () => void
}

export function AppToast({ message, onClose }: { message: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, message.durationMs ?? 3200)
    return () => window.clearTimeout(timeout)
  }, [message.durationMs, message.id, onClose])

  return <div role="status" aria-live="polite" className={`fixed inset-x-4 top-20 z-[100] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border p-4 text-sm font-bold shadow-2xl ${message.tone === 'success' ? 'border-emerald-500/30 bg-[#092019] text-emerald-300' : 'border-rose-500/30 bg-[#271014] text-rose-200'}`}>
    <span>{message.text}</span>
    <div className="flex shrink-0 items-center gap-2">
      {message.actionLabel && message.onAction && <button type="button" onClick={message.onAction} className="min-h-8 rounded-lg bg-emerald-500 px-3 text-xs font-black text-ink">{message.actionLabel}</button>}
      <button type="button" onClick={onClose} aria-label="Cerrar notificación" className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-lg">×</button>
    </div>
  </div>
}
