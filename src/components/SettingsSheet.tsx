import { useState } from 'react'
import type { ThemeMode } from '../types'
import { ModalSheet } from './ModalSheet'

export function SettingsSheet({ theme, onTheme, onReset, onClose }: { theme: ThemeMode; onTheme: (theme: ThemeMode) => void; onReset: () => void; onClose: () => void }) {
  const [confirmReset, setConfirmReset] = useState(false)
  return <ModalSheet title="Ajustes" onClose={onClose}>
    <section><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tema</p><div className="mt-3 grid grid-cols-3 gap-2">{(['dark', 'light', 'system'] as ThemeMode[]).map(mode => <button key={mode} onClick={() => onTheme(mode)} className={`min-h-11 rounded-xl text-sm font-bold capitalize ${theme === mode ? 'bg-emerald-500 text-ink' : 'border border-slate-200 dark:border-white/10'}`}>{mode === 'dark' ? 'Oscuro' : mode === 'light' ? 'Claro' : 'Sistema'}</button>)}</div></section>
    <section className="mt-6 border-t border-slate-100 pt-5 dark:border-white/5"><button onClick={() => { if (confirmReset) { onReset(); onClose() } else setConfirmReset(true) }} onBlur={() => setConfirmReset(false)} className={`min-h-12 w-full rounded-xl border text-sm font-bold transition ${confirmReset ? 'border-rose-500 bg-rose-500 text-white' : 'border-rose-500/30 text-rose-500'}`}>{confirmReset ? 'Confirmar: borrar todos los datos locales' : 'Resetear datos locales/mock'}</button></section>
    <p className="mt-6 text-center text-xs text-slate-400">CEF Stats v0.1 local</p>
  </ModalSheet>
}
