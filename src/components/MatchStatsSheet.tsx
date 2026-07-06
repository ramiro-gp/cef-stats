import { useState } from 'react'
import type { Match, MatchResult, StatEntry } from '../types'
import { getMatchResultForTeam } from '../utils/matches'
import { ModalSheet } from './ModalSheet'

const options: { value: MatchResult; label: string; emoji: string }[] = [
  { value: 'win', label: 'Gané', emoji: '🙌' }, { value: 'draw', label: 'Empaté', emoji: '🤝' }, { value: 'loss', label: 'Perdí', emoji: '😮‍💨' },
]

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 dark:border-white/10"><span className="font-bold">{label}</span><div className="flex items-center gap-3"><button onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0} className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 text-2xl disabled:opacity-30 dark:border-white/10">−</button><span className="w-8 text-center text-2xl font-black">{value}</span><button onClick={() => onChange(value + 1)} className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500 text-2xl font-black text-ink">+</button></div></div>
}

export function MatchStatsSheet({ match, userId, existing, onSave, onClose }: { match: Match; userId: string; existing?: StatEntry; onSave: (values: Pick<StatEntry, 'result' | 'goals' | 'assists' | 'team'>) => void | Promise<void>; onClose: () => void }) {
  const team = match.participants.find(participant => participant.userId === userId)?.team
  const automaticResult = getMatchResultForTeam(match.score, team)
  const [result, setResult] = useState<MatchResult | null>(automaticResult ?? existing?.result ?? null)
  const [goals, setGoals] = useState(existing?.goals ?? 0)
  const [assists, setAssists] = useState(existing?.assists ?? 0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    const finalResult = automaticResult ?? result
    if (!finalResult) { setError('Elegí un resultado para guardar.'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({ result: finalResult, goals, assists, team })
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos guardar las stats.')
    } finally {
      setSaving(false)
    }
  }

  return <ModalSheet title={existing ? 'Editar stats' : 'Cargar stats'} onClose={onClose}>
    {automaticResult ? <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm"><span className="font-bold text-emerald-500">Resultado calculado:</span> {automaticResult === 'win' ? 'Ganaste' : automaticResult === 'draw' ? 'Empataste' : 'Perdiste'} según tu equipo.</div> : <div className="grid grid-cols-3 gap-2.5">{options.map(option => <button key={option.value} onClick={() => setResult(option.value)} className={`min-h-24 rounded-2xl border p-3 ${result === option.value ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-white/10'}`}><span className="block text-2xl">{option.emoji}</span><span className="mt-2 block text-sm font-bold">{option.label}</span></button>)}</div>}
    <div className="mt-4 space-y-3"><Counter label="Goles" value={goals} onChange={setGoals} /><Counter label="Asistencias" value={assists} onChange={setAssists} /></div>
    {error && <p className="mt-3 text-sm font-bold text-rose-500">{error}</p>}
    <div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onClose} disabled={saving} className="min-h-12 rounded-xl border border-slate-200 font-bold disabled:opacity-50 dark:border-white/10">Cancelar</button><button onClick={() => void save()} disabled={saving} className="min-h-12 rounded-xl bg-emerald-500 font-extrabold text-ink disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar stats'}</button></div>
  </ModalSheet>
}
