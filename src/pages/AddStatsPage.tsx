import { useState } from 'react'
import { CheckIcon, FireIcon } from '../components/icons'
import { PageTitle } from '../components/PageTitle'
import { MatchCodePickerSheet, type MatchLinkSelection } from '../components/MatchCodePickerSheet'
import type { Group, Match, MatchResult, Page, PlayerPosition, StatEntry, StatFootballFormat, StatMatchType, User } from '../types'
import type { AddStatEntry } from '../store/useLocalStore'

const resultOptions: { value: MatchResult; label: string; emoji: string }[] = [
  { value: 'win', label: 'Gané', emoji: '🙌' },
  { value: 'draw', label: 'Empaté', emoji: '🤝' },
  { value: 'loss', label: 'Perdí', emoji: '😮‍💨' },
]

const positionOptions: PlayerPosition[] = ['Arquero', 'Defensor', 'Mediocampista', 'Delantero']

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (next: number) => void }) {
  return <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-5">
    <div><div className="font-bold">{label}</div><div className="mt-1 text-xs text-slate-400">En este partido</div></div>
    <div className="flex items-center gap-3">
      <button type="button" aria-label={`Restar ${label.toLowerCase()}`} onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0} className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 text-2xl font-medium transition active:scale-90 disabled:opacity-30 dark:border-white/10">−</button>
      <span className="w-10 text-center text-3xl font-black tabular-nums">{value}</span>
      <button type="button" aria-label={`Sumar ${label.toLowerCase()}`} onClick={() => onChange(value + 1)} className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500 text-2xl font-bold text-ink transition hover:bg-emerald-400 active:scale-90">+</button>
    </div>
  </div>
}

interface Props {
  onSave: (values: Parameters<AddStatEntry>[0], contextId: string) => ReturnType<AddStatEntry>
  onNavigate: (page: Page) => void
  matches: Match[]
  groups: Group[]
  entries: StatEntry[]
  user: User
  defaultContextId?: string
  personalContextId?: string
}

export function AddStatsPage({ onSave, onNavigate, matches, groups, entries, user, defaultContextId = '', personalContextId = '' }: Props) {
  const [result, setResult] = useState<MatchResult | null>(null)
  const [goals, setGoals] = useState(0)
  const [assists, setAssists] = useState(0)
  const [saved, setSaved] = useState(false)
  const [linking, setLinking] = useState(false)
  const [linked, setLinked] = useState<MatchLinkSelection | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [contextId, setContextId] = useState(defaultContextId)
  const [matchType, setMatchType] = useState<StatMatchType>(user.defaultMatchType === 'ask' ? 'friendly' : user.defaultMatchType)
  const [footballFormat, setFootballFormat] = useState<StatFootballFormat>(user.defaultFootballFormat === 'ask' ? 'F5' : user.defaultFootballFormat)
  const [playedPosition, setPlayedPosition] = useState<PlayerPosition | ''>(user.position)
  const [detailsOpen, setDetailsOpen] = useState(user.defaultMatchType === 'ask' || user.defaultFootballFormat === 'ask' || (!user.position && (user.defaultMatchType === 'tournament' || user.defaultFootballFormat === 'F8')))
  const contextName = personalContextId && contextId === personalContextId ? 'Personal (sin grupo)' : groups.find(group => group.id === contextId)?.name
  const positionRelevant = matchType === 'tournament' || footballFormat === 'F8'
  const matchTypeLabel = matchType === 'tournament' ? 'Torneo' : 'Amistoso'

  const save = async () => {
    if (!result || !contextId || saved || saving) return
    setSaving(true)
    setError('')
    try {
      await onSave({ result: linked?.automaticResult ?? result, goals, assists, matchId: linked?.match.id, team: linked?.team, matchType, footballFormat, playedPosition: positionRelevant && playedPosition ? playedPosition : undefined }, contextId)
      setSaved(true)
      window.setTimeout(() => onNavigate('home'), 1200)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos guardar las stats.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="mx-auto max-w-2xl">
    <PageTitle eyebrow="Carga rápida" title="¿Cómo te fue hoy?" subtitle="Tres toques y listo. Sin vueltas." />
    <div className="space-y-5">
      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4"><label className="block"><span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Estás cargando dentro de</span><select value={contextId} onChange={event => { setContextId(event.target.value); setLinked(null) }} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-bold outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#102019]"><option value="">Elegí un contexto</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}{personalContextId && <option value={personalContextId}>Personal (sin grupo)</option>}</select></label><p className="mt-2 text-xs leading-5 text-slate-400">{contextName ? `Esta carga se guardará en ${contextName}.` : 'TODOS es sólo una vista: elegí dónde guardar esta carga.'}</p></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-extrabold">{matchTypeLabel} · {footballFormat}{positionRelevant && playedPosition ? ` · ${playedPosition}` : ''}</p><p className="mt-1 text-xs text-slate-400">Detalles opcionales de esta carga</p></div><button type="button" onClick={() => setDetailsOpen(open => !open)} className="min-h-10 shrink-0 rounded-xl px-3 text-xs font-bold text-emerald-500">{detailsOpen ? 'Ocultar' : 'Cambiar detalles'}</button></div>
        {detailsOpen && <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 dark:border-white/5 sm:grid-cols-2">
          <label><span className="text-xs font-bold text-slate-500">Tipo de partido</span><select value={matchType} onChange={event => setMatchType(event.target.value as StatMatchType)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#102019]"><option value="friendly">Amistoso</option><option value="tournament">Torneo</option></select></label>
          <label><span className="text-xs font-bold text-slate-500">Formato</span><select value={footballFormat} onChange={event => setFootballFormat(event.target.value as StatFootballFormat)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#102019]"><option value="F5">F5</option><option value="F8">F8</option></select></label>
          {positionRelevant && <label className="sm:col-span-2"><span className="text-xs font-bold text-slate-500">Posición jugada</span><select value={playedPosition} onChange={event => setPlayedPosition(event.target.value as PlayerPosition | '')} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#102019]"><option value="">Sin posición</option>{positionOptions.map(position => <option key={position} value={position}>{position}</option>)}</select></label>}
        </div>}
      </section>
      <section>
        <div className="mb-3 flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-xs font-black text-ink">1</span><h2 className="text-sm font-bold">Resultado <span className="text-emerald-500">*</span></h2></div>
        <div className="grid grid-cols-3 gap-2.5">
          {resultOptions.map(option => <button type="button" key={option.value} disabled={Boolean(linked?.automaticResult)} onClick={() => setResult(option.value)} className={`relative min-h-24 rounded-2xl border p-3 text-center transition active:scale-[.97] disabled:cursor-default ${result === option.value ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-emerald-500/40 dark:border-white/10 dark:bg-white/[0.04]'}`}>
            {result === option.value && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-ink"><CheckIcon className="h-3.5 w-3.5 stroke-[3]" /></span>}
            <span className="block text-2xl">{option.emoji}</span><span className="mt-2 block text-sm font-bold">{option.label}</span>
          </button>)}
        </div>
      </section>
      <section className="rounded-2xl border border-dashed border-slate-300 p-4 dark:border-white/15">{linked ? <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-500">Partido vinculado</p><p className="mt-1 font-bold">{linked.match.title} · Equipo {linked.team === 'light' ? 'claro' : 'oscuro'}</p>{linked.automaticResult && <p className="mt-1 text-xs text-slate-400">Resultado calculado automáticamente.</p>}</div><button onClick={() => setLinked(null)} className="min-h-10 rounded-xl px-3 text-xs font-bold text-rose-500">Quitar</button></div> : <><button onClick={() => setLinking(true)} className="min-h-11 w-full text-sm font-bold text-emerald-500">Vincular a partido con código</button><p className="mt-1 text-center text-[11px] leading-5 text-slate-400">¿Todavía no se creó el partido? Podés vincularlo después desde tu perfil.</p></>}</section>
      <section>
        <div className="mb-3 flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-xs font-black text-ink">2</span><h2 className="text-sm font-bold">Tus números</h2></div>
        <div className="space-y-3"><Counter label="Goles" value={goals} onChange={setGoals} /><Counter label="Asistencias" value={assists} onChange={setAssists} /></div>
      </section>
      <div className="rounded-2xl bg-slate-100 p-4 text-xs text-slate-500 dark:bg-white/[0.04] dark:text-slate-400"><FireIcon className="mr-2 inline h-4 w-4 text-orange-500" />Guardá tus números y actualizamos tu racha.</div>
      {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-500">{error}</div>}
      <button type="button" onClick={() => void save()} disabled={!result || !contextId || saved || saving} className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 font-extrabold text-ink shadow-glow transition hover:bg-emerald-400 active:scale-[.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:disabled:bg-white/10 dark:disabled:text-slate-600">
        {saved ? <><CheckIcon /> ¡Stats guardadas!</> : saving ? 'Guardando...' : 'Guardar stats'}
      </button>
      {!result && <p className="-mt-2 text-center text-xs text-slate-400">Elegí un resultado para poder guardar</p>}
      {!contextId && <p className="-mt-2 text-center text-xs text-slate-400">Elegí dónde guardar la carga.</p>}
    </div>
    {linking && <MatchCodePickerSheet matches={matches} groups={groups} entries={entries} userId={user.id} onSelect={selection => { setLinked(selection); setContextId(selection.match.groupId); if (selection.automaticResult) setResult(selection.automaticResult) }} onClose={() => setLinking(false)} />}
  </div>
}
