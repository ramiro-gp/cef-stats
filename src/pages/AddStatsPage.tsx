import { useState } from 'react'
import { CheckIcon, FireIcon } from '../components/icons'
import { PageTitle } from '../components/PageTitle'
import { MatchCodePickerSheet, type MatchLinkSelection } from '../components/MatchCodePickerSheet'
import type { Group, Match, MatchResult, Page, PlayerPosition, StatEntry, StatFootballFormat, StatMatchType, User } from '../types'
import type { AddStatEntry } from '../store/useLocalStore'
import { getMatchResultForTeam } from '../utils/matches'

const resultOptions: { value: MatchResult; label: string; emoji: string }[] = [
  { value: 'win', label: 'Gané', emoji: '🙌' },
  { value: 'draw', label: 'Empaté', emoji: '🤝' },
  { value: 'loss', label: 'Perdí', emoji: '😮‍💨' },
]
const positionOptions: PlayerPosition[] = ['Arquero', 'Defensor', 'Mediocampista', 'Delantero']
const formatOptions: StatFootballFormat[] = ['F5', 'F6', 'F7', 'F8', 'F11']

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
  onNotify: (text: string, tone?: 'success' | 'error') => void
  matches: Match[]
  groups: Group[]
  entries: StatEntry[]
  user: User
  onAttendMatch?: (matchId: string) => Match | void | Promise<Match | void>
  onOmitMatch?: (matchId: string) => Match | void | Promise<Match | void>
  defaultContextId?: string
  personalContextId?: string
}

export function AddStatsPage({ onSave, onNavigate, onNotify, matches, groups, entries, user, onAttendMatch, onOmitMatch, defaultContextId = '', personalContextId = '' }: Props) {
  const defaultContextGroup = groups.find(group => group.id === defaultContextId)
  const initialMatchType = defaultContextGroup?.defaultMatchType ?? (user.defaultMatchType === 'ask' ? 'friendly' : user.defaultMatchType)
  const initialFormat = defaultContextGroup?.defaultFootballFormat ?? (user.defaultFootballFormat === 'ask' ? 'F5' : user.defaultFootballFormat)
  const [result, setResult] = useState<MatchResult | null>(null)
  const [goals, setGoals] = useState(0)
  const [assists, setAssists] = useState(0)
  const [saved, setSaved] = useState(false)
  const [linking, setLinking] = useState(false)
  const [linked, setLinked] = useState<MatchLinkSelection | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingMatchAction, setPendingMatchAction] = useState('')
  const [error, setError] = useState('')
  const [contextId, setContextId] = useState(defaultContextId)
  const [matchType, setMatchType] = useState<StatMatchType>(initialMatchType)
  const [footballFormat, setFootballFormat] = useState<StatFootballFormat>(initialFormat)
  const [playedPosition, setPlayedPosition] = useState<PlayerPosition | ''>(user.position)
  const [detailsOpen, setDetailsOpen] = useState(user.defaultMatchType === 'ask' || user.defaultFootballFormat === 'ask' || (!user.position && (initialMatchType === 'tournament' || initialFormat === 'F8' || initialFormat === 'F11')))
  const contextName = personalContextId && contextId === personalContextId ? 'Personal' : groups.find(group => group.id === contextId)?.name
  const positionRelevant = matchType === 'tournament' || footballFormat === 'F8' || footballFormat === 'F11'
  const matchTypeLabel = matchType === 'tournament' ? 'Torneo' : 'Amistoso'
  const pendingMatches = matches
    .filter(match => {
      const matchesContext = contextId === personalContextId ? !match.groupId : Boolean(contextId) && match.groupId === contextId
      return matchesContext && !match.omittedByCurrentUser && !entries.some(entry => entry.userId === user.id && entry.matchId === match.id)
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  const selectMatchShortcut = (match: Match) => {
    const participant = match.participants.find(item => item.userId === user.id)
    const team = participant?.team
    const automaticResult = team ? getMatchResultForTeam(match.score, team) : null
    setLinked({ match, team, automaticResult })
    setContextId(match.groupId || personalContextId)
    if (automaticResult) setResult(automaticResult)
    const matchGroup = groups.find(group => group.id === match.groupId)
    if (matchGroup?.defaultMatchType) setMatchType(matchGroup.defaultMatchType)
    if (formatOptions.includes(match.format as StatFootballFormat)) setFootballFormat(match.format as StatFootballFormat)
  }
  const attendShortcut = async (match: Match) => {
    if (!onAttendMatch || pendingMatchAction) return
    setPendingMatchAction(`attend-${match.id}`)
    setError('')
    try {
      const updated = await onAttendMatch(match.id)
      selectMatchShortcut(updated ?? match)
      onNotify(`Te anotaste en ${match.title}.`)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'No pudimos anotarte en el partido.'
      setError(message)
      onNotify(message, 'error')
    } finally {
      setPendingMatchAction('')
    }
  }
  const omitShortcut = async (match: Match) => {
    if (!onOmitMatch || pendingMatchAction) return
    setPendingMatchAction(`omit-${match.id}`)
    setError('')
    try {
      await onOmitMatch(match.id)
      if (linked?.match.id === match.id) setLinked(null)
      onNotify(`Omitiste ${match.title}.`)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'No pudimos omitir el partido.'
      setError(message)
      onNotify(message, 'error')
    } finally {
      setPendingMatchAction('')
    }
  }

  const save = async () => {
    if (!result || !contextId || saved || saving) return
    setSaving(true)
    setError('')
    try {
      await onSave({ result: linked?.automaticResult ?? result, goals, assists, matchId: linked?.match.id, team: linked?.team, matchType, footballFormat, playedPosition: positionRelevant && playedPosition ? playedPosition : undefined }, contextId)
      setSaved(true)
      onNotify('Stats cargadas correctamente.')
      onNavigate('home')
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'No pudimos guardar las stats.'
      setError(message)
      onNotify(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return <div className="mx-auto max-w-2xl">
    <PageTitle eyebrow="Carga rápida" title="¿Cómo te fue hoy?" subtitle="Tres toques y listo. Sin vueltas." />
    <div className="space-y-5">
      <section data-tour="add-context" className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
        <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Estás cargando dentro de</span><select value={contextId} onChange={event => { const nextContextId = event.target.value; setContextId(nextContextId); setLinked(null); const selectedGroup = groups.find(group => group.id === nextContextId); if (selectedGroup?.defaultMatchType) setMatchType(selectedGroup.defaultMatchType); if (selectedGroup?.defaultFootballFormat) setFootballFormat(selectedGroup.defaultFootballFormat) }} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-bold outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#102019]"><option value="">Elegí un contexto</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}{personalContextId && <option value={personalContextId}>Personal (sin grupo)</option>}</select></label>
        {contextName && <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Esta carga se guardará en {contextName}.</p>}
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">El grupo que elijas verá tu carga. Si jugaste sin nadie de tu grupo, poné Personal.</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-400">Si no aparece ningún grupo, <button type="button" onClick={() => onNavigate('groups')} className="font-bold text-emerald-500 underline underline-offset-2">creá o unite a uno</button>.</p>
      </section>

      {pendingMatches.length > 0 && <section className="rounded-2xl border border-emerald-500/20 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-3"><h2 className="text-sm font-extrabold">Partidos pendientes de cargar</h2><p className="mt-1 text-xs leading-5 text-slate-400">Mostramos los partidos del contexto elegido arriba. Podés unirte, omitir o elegir uno para cargar stats.</p></div>
        <div className="space-y-2">{pendingMatches.slice(0, 5).map(match => {
          const participant = match.participants.find(item => item.userId === user.id)
          const teamName = participant?.team ? participant.team === 'light' ? match.lightTeamName : match.darkTeamName : participant ? 'Sin equipo todavía' : 'Todavía no decidiste'
          const undecided = !participant
          return <article key={match.id} className={`rounded-2xl border p-3 transition ${linked?.match.id === match.id ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-500/40 dark:border-white/10'}`}>
            <button type="button" onClick={() => selectMatchShortcut(match)} className="w-full text-left">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{match.title}</p><p className="mt-1 text-xs text-slate-400">{new Date(match.scheduledAt).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {match.groupId ? match.groupName ?? groups.find(group => group.id === match.groupId)?.name ?? 'Grupo' : 'Sin grupo'}</p></div><span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{teamName}</span></div>
            </button>
            {undecided && onAttendMatch && onOmitMatch && <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => void attendShortcut(match)} disabled={Boolean(pendingMatchAction)} className="min-h-10 rounded-xl bg-emerald-500 text-xs font-black text-ink disabled:opacity-50">{pendingMatchAction === `attend-${match.id}` ? 'ANOTANDO...' : 'UNIRME'}</button><button type="button" onClick={() => void omitShortcut(match)} disabled={Boolean(pendingMatchAction)} className="min-h-10 rounded-xl border border-slate-200 text-xs font-black text-slate-500 disabled:opacity-50 dark:border-white/10">{pendingMatchAction === `omit-${match.id}` ? 'OMITIENDO...' : 'OMITIR'}</button></div>}
          </article>
        })}</div>
      </section>}
      <section data-tour="add-result">
        <div className="mb-3 flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-xs font-black text-ink">1</span><h2 className="text-sm font-bold">Resultado <span className="text-emerald-500">*</span></h2></div>
        <div className="grid grid-cols-3 gap-2.5">{resultOptions.map(option => <button type="button" key={option.value} disabled={Boolean(linked?.automaticResult)} onClick={() => setResult(option.value)} className={`relative min-h-24 rounded-2xl border p-3 text-center transition active:scale-[.97] disabled:cursor-default ${result === option.value ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-emerald-500/40 dark:border-white/10 dark:bg-white/[0.04]'}`}>{result === option.value && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-ink"><CheckIcon className="h-3.5 w-3.5 stroke-[3]" /></span>}<span className="block text-2xl">{option.emoji}</span><span className="mt-2 block text-sm font-bold">{option.label}</span></button>)}</div>
      </section>

      <section data-tour="add-numbers">
        <div className="mb-3 flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-xs font-black text-ink">2</span><h2 className="text-sm font-bold">Tus números</h2></div>
        <div className="space-y-3"><Counter label="Goles" value={goals} onChange={setGoals} /><Counter label="Asistencias" value={assists} onChange={setAssists} /></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-extrabold">{matchTypeLabel} · {footballFormat}{positionRelevant && playedPosition ? ` · ${playedPosition}` : ''}</p><p className="mt-1 text-xs text-slate-400">Tipo y formato del partido</p></div><button type="button" onClick={() => setDetailsOpen(open => !open)} className="min-h-10 shrink-0 rounded-xl px-3 text-xs font-bold text-emerald-500">{detailsOpen ? 'Ocultar' : 'Cambiar detalles'}</button></div>
        {detailsOpen && <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 dark:border-white/5">
          <div><p className="text-xs font-bold text-slate-500">Tipo de partido</p><div className="mt-2 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-white/5">{([{ value: 'friendly', label: 'Amistoso' }, { value: 'tournament', label: 'Torneo' }] as const).map(option => <button type="button" key={option.value} aria-pressed={matchType === option.value} onClick={() => setMatchType(option.value)} className={`min-h-10 rounded-lg text-sm font-bold transition ${matchType === option.value ? 'bg-emerald-500 text-ink shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>{option.label}</button>)}</div></div>
          <div><p className="text-xs font-bold text-slate-500">Formato</p><div className="mt-2 grid grid-cols-5 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">{formatOptions.map(format => <button type="button" key={format} aria-pressed={footballFormat === format} onClick={() => setFootballFormat(format)} className={`min-h-10 rounded-lg text-xs font-black transition ${footballFormat === format ? 'bg-emerald-500 text-ink shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>{format}</button>)}</div></div>
          {positionRelevant && <label className="block"><span className="text-xs font-bold text-slate-500">Posición jugada</span><select value={playedPosition} onChange={event => setPlayedPosition(event.target.value as PlayerPosition | '')} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#102019]"><option value="">Sin posición</option>{positionOptions.map(position => <option key={position} value={position}>{position}</option>)}</select></label>}
        </div>}
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 p-4 dark:border-white/15">{linked ? <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-500">Partido vinculado</p><p className="mt-1 font-bold">{linked.match.title} · {linked.team ? linked.team === 'light' ? linked.match.lightTeamName : linked.match.darkTeamName : 'sin equipo todavía'}</p>{linked.automaticResult && <p className="mt-1 text-xs text-slate-400">Resultado calculado automáticamente.</p>}</div><button onClick={() => setLinked(null)} className="min-h-10 rounded-xl px-3 text-xs font-bold text-rose-500">Quitar</button></div> : <><button onClick={() => setLinking(true)} className="min-h-11 w-full text-sm font-bold text-emerald-500">Vincular a partido con código</button><p className="mt-1 text-center text-[11px] leading-5 text-slate-400">¿Todavía no se creó el partido? Podés vincularlo después desde tu perfil.</p></>}</section>

      <div className="rounded-2xl bg-slate-100 p-4 text-xs text-slate-500 dark:bg-white/[0.04] dark:text-slate-400"><FireIcon className="mr-2 inline h-4 w-4 text-orange-500" />Guardá tus números y actualizamos tu racha.</div>
      {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-500">{error}</div>}
      <button data-tour="add-save" type="button" onClick={() => void save()} disabled={!result || !contextId || saved || saving} className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 font-extrabold text-ink shadow-glow transition hover:bg-emerald-400 active:scale-[.99] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:disabled:bg-white/10 dark:disabled:text-slate-600">{saved ? <><CheckIcon /> ¡Stats guardadas!</> : saving ? 'Guardando...' : 'Guardar stats'}</button>
      {!result && <p className="-mt-2 text-center text-xs text-slate-400">Elegí un resultado para poder guardar</p>}
      {!contextId && <p className="-mt-2 text-center text-xs text-slate-400">Elegí dónde guardar la carga.</p>}
    </div>
    {linking && <MatchCodePickerSheet matches={matches} groups={groups} entries={entries} userId={user.id} onSelect={selection => { setLinked(selection); setContextId(selection.match.groupId || personalContextId); if (selection.automaticResult) setResult(selection.automaticResult); const matchGroup = groups.find(group => group.id === selection.match.groupId); if (matchGroup?.defaultMatchType) setMatchType(matchGroup.defaultMatchType); if (formatOptions.includes(selection.match.format as StatFootballFormat)) setFootballFormat(selection.match.format as StatFootballFormat) }} onClose={() => setLinking(false)} />}
  </div>
}
