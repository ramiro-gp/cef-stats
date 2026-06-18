import { useState } from 'react'
import type { GuestMatchStats, MatchParticipant } from '../types'
import { ModalSheet } from './ModalSheet'

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 dark:border-white/10"><span className="font-bold">{label}</span><div className="flex items-center gap-3"><button onClick={() => onChange(Math.max(0, value - 1))} disabled={!value} className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 text-2xl disabled:opacity-30 dark:border-white/10">−</button><span className="w-8 text-center text-2xl font-black">{value}</span><button onClick={() => onChange(value + 1)} className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500 text-2xl font-black text-ink">+</button></div></div>
}

export function GuestStatsSheet({ guest, stats, onSave, onClose }: { guest: MatchParticipant; stats?: GuestMatchStats; onSave: (goals: number, assists: number) => void; onClose: () => void }) {
  const [goals, setGoals] = useState(stats?.goals ?? 0)
  const [assists, setAssists] = useState(stats?.assists ?? 0)
  return <ModalSheet title={`Stats de ${guest.guestName}`} onClose={onClose}><div className="space-y-3"><Counter label="Goles" value={goals} onChange={setGoals} /><Counter label="Asistencias" value={assists} onChange={setAssists} /></div><p className="mt-4 text-xs leading-5 text-slate-400">Estas stats cuentan en el resumen del partido, pero no en rankings ni Mundial Personal.</p><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onClose} className="min-h-12 rounded-xl border border-slate-200 font-bold dark:border-white/10">Cancelar</button><button onClick={() => { onSave(goals, assists); onClose() }} className="min-h-12 rounded-xl bg-emerald-500 font-bold text-ink">Guardar stats</button></div></ModalSheet>
}
