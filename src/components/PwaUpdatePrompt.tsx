import type { ReleaseNotes } from '../config/releaseNotes'

interface Props {
  needRefresh: boolean
  latest?: ReleaseNotes | null
  onLater: () => void
  onUpdate: () => void | Promise<void>
  onReadNotes: () => void
}

export function PwaUpdatePrompt({ needRefresh, latest, onLater, onUpdate, onReadNotes }: Props) {
  if (!needRefresh) return null

  return <div role="status" className="fixed inset-0 z-[110] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-[30px] border border-emerald-500/30 bg-[#07110e] p-5 text-emerald-50 shadow-2xl">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Actualización disponible</p>
      <h2 className="mt-2 text-2xl font-black">Hay una nueva versión de Fulbo Stats.</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">Trae mejoras para cargar partidos y usar la app más cómodo en el celu.</p>
      {latest && <p className="mt-2 text-xs font-bold text-emerald-300">Versión nueva: v{latest.version}</p>}
      <button type="button" onClick={onReadNotes} className="mt-4 text-sm font-extrabold text-emerald-400 underline underline-offset-4">Leer parche</button>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" onClick={onLater} className="min-h-12 rounded-xl border border-white/15 px-3 text-sm font-bold">Después</button>
        <button type="button" onClick={() => void onUpdate()} className="min-h-12 rounded-xl bg-emerald-500 px-3 text-sm font-extrabold text-ink">Actualizar</button>
      </div>
    </div>
  </div>
}
