import { useState } from 'react'
import type { Match, MatchScore } from '../types'

interface Props {
  match: Match
  onSave: (score: MatchScore) => void | Promise<unknown>
}

export function MatchScoreEditor({ match, onSave }: Props) {
  const [light, setLight] = useState(match.score?.light ?? 0)
  const [dark, setDark] = useState(match.score?.dark ?? 0)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const save = async () => {
    if (saving) return
    setSaving(true)
    setFeedback(null)
    try {
      await onSave({ light, dark })
      setFeedback({ tone: 'success', text: 'Resultado guardado.' })
    } catch (reason) {
      setFeedback({ tone: 'error', text: reason instanceof Error ? reason.message : 'No pudimos guardar el resultado.' })
    } finally {
      setSaving(false)
    }
  }

  const counter = (label: string, value: number, setValue: (value: number) => void, tone: string) => <div className="rounded-2xl border border-slate-200 p-4 text-center dark:border-white/10"><p className={`text-xs font-black uppercase tracking-widest ${tone}`}>{label}</p><div className="mt-3 flex items-center justify-center gap-3"><button onClick={() => setValue(Math.max(0, value - 1))} disabled={saving || value === 0} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-xl disabled:opacity-30 dark:border-white/10">−</button><span className="w-8 text-3xl font-black">{value}</span><button onClick={() => setValue(value + 1)} disabled={saving} className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500 text-xl font-black text-ink disabled:opacity-40">+</button></div></div>

  return <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]"><h3 className="font-extrabold">Resultado</h3><div className="mt-3 grid grid-cols-2 gap-3">{counter(match.lightTeamName || 'CLARO', light, setLight, 'text-slate-500 dark:text-slate-200')}{counter(match.darkTeamName || 'OSCURO', dark, setDark, 'text-slate-800 dark:text-slate-400')}</div>{feedback && <p className={`mt-3 text-sm font-bold ${feedback.tone === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>{feedback.text}</p>}<button onClick={() => void save()} disabled={saving} className="mt-3 min-h-12 w-full rounded-xl bg-emerald-500 font-bold text-ink disabled:opacity-50">{saving ? 'Guardando resultado...' : match.score ? 'Actualizar resultado' : 'Guardar resultado'}</button></section>
}
