import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return <div role="status" className="fixed inset-x-4 bottom-24 z-[90] mx-auto max-w-md rounded-2xl border border-emerald-500/30 bg-[#092019] p-4 text-sm text-emerald-100 shadow-2xl"><p className="font-extrabold">Hay una nueva versión de Fulbo Stats.</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => void updateServiceWorker(true)} className="min-h-10 flex-1 rounded-xl bg-emerald-500 px-3 font-extrabold text-ink">Actualizar</button><button type="button" onClick={() => setNeedRefresh(false)} className="min-h-10 rounded-xl border border-white/15 px-3 font-bold">Después</button></div></div>
}
