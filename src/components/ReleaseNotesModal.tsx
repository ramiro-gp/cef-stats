import { useState } from 'react'
import { appVersion } from '../config/appVersion'
import { currentReleaseNotes, type ReleaseNotes } from '../config/releaseNotes'

interface Props {
  updateAvailable?: boolean
  latest?: ReleaseNotes | null
  checking?: boolean
  onCheck?: () => void | Promise<void>
  onUpdate?: () => void | Promise<void>
  onClose: () => void
}

export function ReleaseNotesModal({ updateAvailable = false, latest, checking = false, onCheck, onUpdate, onClose }: Props) {
  const [busy, setBusy] = useState(false)
  const notes = latest ?? currentReleaseNotes
  const versionLabel = `v${notes.version}`
  const runUpdate = async () => {
    if (!onUpdate) return
    setBusy(true)
    try { await onUpdate() } finally { setBusy(false) }
  }

  return <div role="dialog" aria-modal="true" aria-label="Notas de versión" className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-[28px] border border-emerald-500/30 bg-[#07110e] p-5 text-white shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">{updateAvailable ? 'Nueva versión disponible' : 'Fulbo Stats'}</p>
          <h2 className="mt-2 text-2xl font-black">{updateAvailable ? `Hay una versión más reciente (${versionLabel})` : notes.title}</h2>
          <p className="mt-1 text-sm text-slate-300">Tu versión actual: {appVersion}</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-xl font-bold">×</button>
      </div>

      <ul className="mt-5 space-y-2.5">
        {notes.notes.map(note => <li key={note} className="flex gap-2 rounded-2xl bg-white/[0.06] p-3 text-sm leading-5 text-slate-100"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" /><span>{note}</span></li>)}
      </ul>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {onCheck && <button type="button" onClick={() => void onCheck()} disabled={checking || busy} className="min-h-12 rounded-xl border border-white/15 px-4 text-sm font-extrabold text-white disabled:opacity-50">{checking ? 'Buscando...' : 'Chequear versión'}</button>}
        {updateAvailable && onUpdate ? <button type="button" onClick={() => void runUpdate()} disabled={busy} className="min-h-12 rounded-xl bg-emerald-500 px-4 text-sm font-extrabold text-ink disabled:opacity-50">{busy ? 'Actualizando...' : 'Actualizar'}</button> : <button type="button" onClick={onClose} className="min-h-12 rounded-xl bg-white/10 px-4 text-sm font-extrabold">Después</button>}
      </div>
    </div>
  </div>
}
