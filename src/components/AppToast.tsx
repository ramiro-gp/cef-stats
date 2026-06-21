import { useEffect } from 'react'

export interface ToastMessage { id: number; tone: 'success' | 'error'; text: string }

export function AppToast({ message, onClose }: { message: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 3200)
    return () => window.clearTimeout(timeout)
  }, [message.id, onClose])

  return <div role="status" aria-live="polite" className={`fixed inset-x-4 top-20 z-[100] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border p-4 text-sm font-bold shadow-2xl ${message.tone === 'success' ? 'border-emerald-500/30 bg-[#092019] text-emerald-300' : 'border-rose-500/30 bg-[#271014] text-rose-200'}`}><span>{message.text}</span><button type="button" onClick={onClose} aria-label="Cerrar notificación" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-lg">×</button></div>
}
