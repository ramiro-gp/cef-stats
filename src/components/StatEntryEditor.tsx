import { useState } from 'react'
import type { MatchResult, StatEntry } from '../types'
import { ModalSheet } from './ModalSheet'

const resultOptions: { value: MatchResult; label: string; emoji: string }[] = [
  { value: 'win', label: 'Gané', emoji: '🙌' }, { value: 'draw', label: 'Empaté', emoji: '🤝' }, { value: 'loss', label: 'Perdí', emoji: '😮‍💨' },
]

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 dark:border-white/10"><span className="font-bold">{label}</span><div className="flex items-center gap-3"><button onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0} className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 text-2xl disabled:opacity-30 dark:border-white/10">−</button><span className="w-8 text-center text-2xl font-black">{value}</span><button onClick={() => onChange(value + 1)} className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500 text-2xl font-black text-ink">+</button></div></div>
}

export function StatEntryEditor({ entry, onSave, onDelete, onClose }: { entry: StatEntry; onSave: (values: Pick<StatEntry, 'result' | 'goals' | 'assists'>) => void | Promise<void>; onDelete: () => void | Promise<void>; onClose: () => void }) {
  const [result, setResult] = useState(entry.result)
  const [goals, setGoals] = useState(entry.goals)
  const [assists, setAssists] = useState(entry.assists)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await onSave({ result, goals, assists })
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setSaving(true)
    setError('')
    try {
      await onDelete()
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos eliminar la carga.')
    } finally {
      setSaving(false)
    }
  }

  return <ModalSheet title="Editar carga" onClose={onClose}>
    <div className="grid grid-cols-3 gap-2.5">{resultOptions.map(option => <button key={option.value} onClick={() => setResult(option.value)} className={`min-h-24 rounded-2xl border p-3 text-center transition ${result === option.value ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-white/10'}`}><span className="block text-2xl">{option.emoji}</span><span className="mt-2 block text-sm font-bold">{option.label}</span></button>)}</div>
    <div className="mt-4 space-y-3"><Counter label="Goles" value={goals} onChange={setGoals} /><Counter label="Asistencias" value={assists} onChange={setAssists} /></div>
    {error && <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-500">{error}</div>}
    <div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onClose} disabled={saving} className="min-h-12 rounded-xl border border-slate-200 font-bold disabled:opacity-50 dark:border-white/10">Cancelar</button><button onClick={() => void save()} disabled={saving} className="min-h-12 rounded-xl bg-emerald-500 font-extrabold text-ink disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar cambios'}</button></div>
    <button onClick={() => void remove()} disabled={saving} onBlur={() => setConfirmDelete(false)} className={`mt-5 min-h-11 w-full rounded-xl text-sm font-bold transition disabled:opacity-50 ${confirmDelete ? 'bg-rose-500 text-white' : 'text-rose-500 hover:bg-rose-500/10'}`}>{confirmDelete ? 'Confirmar eliminación' : 'Eliminar esta carga'}</button>
  </ModalSheet>
}
