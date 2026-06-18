import { useEffect, useState } from 'react'
import { CheckIcon, CopyIcon, TrophyIcon } from '../components/icons'
import { MatchCreateSheet } from '../components/MatchCreateSheet'
import { MatchStatsSheet } from '../components/MatchStatsSheet'
import { GuestEditorSheet } from '../components/GuestEditorSheet'
import { MatchPitch } from '../components/MatchPitch'
import { ModalSheet } from '../components/ModalSheet'
import { ParticipantPopover } from '../components/ParticipantPopover'
import type { PopoverAnchor } from '../components/ParticipantPopover'
import { PageTitle } from '../components/PageTitle'
import type { Group, Match, MatchFormat, MatchParticipant, MatchScore, MatchTeam, StatEntry, User } from '../types'
import { resultLabels } from '../utils/format'
import { getMatchStatTotals, getMaxTeamSize, isTeamFull } from '../utils/matches'
import { getMatchEntries, getMatchParticipants } from '../utils/selectors'

interface Props {
  group: Group
  user: User
  matches: Match[]
  entries: StatEntry[]
  initialMatchId?: string | null
  onCreate: (values: { title: string; scheduledAt: string; format?: MatchFormat }) => Match
  onJoinTeam: (matchId: string, team: MatchTeam) => void
  onLeave: (matchId: string) => void
  onScore: (matchId: string, score: MatchScore) => void
  onMvp: (matchId: string, participantId: string) => void
  onSaveStats: (matchId: string, values: Pick<StatEntry, 'result' | 'goals' | 'assists' | 'team'>) => void | Promise<void>
  onAddGuest: (matchId: string, values: { name: string; avatar?: string; team: MatchTeam }) => void
  onUpdateGuest: (matchId: string, participantId: string, values: { name: string; avatar?: string }) => void
  onRemoveGuest: (matchId: string, participantId: string) => void
  onSaveGuestStats: (matchId: string, participantId: string, goals: number, assists: number) => void
}

function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function ScoreEditor({ match, onSave }: { match: Match; onSave: (score: MatchScore) => void }) {
  const [light, setLight] = useState(match.score?.light ?? 0)
  const [dark, setDark] = useState(match.score?.dark ?? 0)
  const counter = (label: string, value: number, setValue: (value: number) => void, tone: string) => <div className="rounded-2xl border border-slate-200 p-4 text-center dark:border-white/10"><p className={`text-xs font-black uppercase tracking-widest ${tone}`}>{label}</p><div className="mt-3 flex items-center justify-center gap-3"><button onClick={() => setValue(Math.max(0, value - 1))} disabled={value === 0} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-xl disabled:opacity-30 dark:border-white/10">−</button><span className="w-8 text-3xl font-black">{value}</span><button onClick={() => setValue(value + 1)} className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500 text-xl font-black text-ink">+</button></div></div>
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]"><h3 className="font-extrabold">Resultado</h3><div className="mt-3 grid grid-cols-2 gap-3">{counter('Claro', light, setLight, 'text-slate-500 dark:text-slate-200')}{counter('Oscuro', dark, setDark, 'text-slate-800 dark:text-slate-400')}</div><button onClick={() => onSave({ light, dark })} className="mt-3 min-h-12 w-full rounded-xl bg-emerald-500 font-bold text-ink">{match.score ? 'Actualizar resultado' : 'Guardar resultado'}</button></section>
}

export function MatchesPage({ group, user, matches, entries, initialMatchId = null, onCreate, onJoinTeam, onLeave, onScore, onMvp, onSaveStats, onAddGuest, onUpdateGuest, onRemoveGuest, onSaveGuestStats }: Props) {
  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [guestTeam, setGuestTeam] = useState<MatchTeam | null>(null)
  const [editingGuest, setEditingGuest] = useState<MatchParticipant | null>(null)
  const [activeParticipant, setActiveParticipant] = useState<{ participant: MatchParticipant; anchor: PopoverAnchor } | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  useEffect(() => {
    if (initialMatchId && matches.some(match => match.id === initialMatchId)) void Promise.resolve().then(() => setSelectedId(initialMatchId))
  }, [initialMatchId, matches])
  const selected = matches.find(match => match.id === selectedId)
  const openParticipant = (participant: MatchParticipant, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    setActiveParticipant({ participant, anchor: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } })
  }

  if (!selected) return <>
    <div className="flex items-start justify-between gap-4"><PageTitle eyebrow={group.name} title="Partidos" subtitle="Organizá la próxima fecha sin tapar la carga rápida." /><button onClick={() => setCreating(true)} className="min-h-12 shrink-0 rounded-xl bg-emerald-500 px-4 text-sm font-extrabold text-ink">+ Partido</button></div>
    {matches.length === 0 ? <div className="rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/[0.05] p-8 text-center"><div className="text-3xl">⚽</div><p className="mt-3 font-extrabold">Todavía no hay partidos en este grupo</p><p className="mt-1 text-sm text-slate-400">Creá uno para organizar la próxima fecha.</p><button onClick={() => setCreating(true)} className="mt-5 min-h-12 rounded-xl bg-emerald-500 px-5 font-bold text-ink">Crear primer partido</button></div> : <div className="grid gap-3 sm:grid-cols-2">{[...matches].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)).map(match => <button key={match.id} onClick={() => { setActiveParticipant(null); setSelectedId(match.id) }} className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-500/40 dark:border-white/10 dark:bg-white/[0.04]"><div className="flex items-start justify-between gap-3"><div><p className="font-extrabold">{match.title}</p><p className="mt-1 text-xs capitalize text-slate-400">{formatMatchDate(match.scheduledAt)}</p></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${match.status === 'played' ? 'bg-violet-500/15 text-violet-500' : 'bg-emerald-500/15 text-emerald-500'}`}>{match.status === 'played' ? 'Jugado' : 'Abierto'}</span></div><div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-400">{match.format ?? 'Formato libre'} · {match.participants.length} anotados</span><span className="font-black">{match.score ? `${match.score.light}–${match.score.dark}` : 'Ver →'}</span></div></button>)}</div>}
    {creating && <MatchCreateSheet onCreate={values => { const match = onCreate(values); setSelectedId(match.id); return match }} onClose={() => setCreating(false)} />}
  </>

  const myParticipant = selected.participants.find(participant => participant.userId === user.id)
  const matchEntries = getMatchEntries(entries, selected.id)
  const myEntry = matchEntries.find(entry => entry.userId === user.id)
  const lightTeam = getMatchParticipants(selected, 'light')
  const darkTeam = getMatchParticipants(selected, 'dark')
  const maxTeamSize = getMaxTeamSize(selected.format ?? 'F5')
  const matchStatTotals = getMatchStatTotals(entries, selected)
  const loadedLightGoals = matchStatTotals.light.goals
  const loadedDarkGoals = matchStatTotals.dark.goals
  const playerName = (participant: MatchParticipant) => participant.type === 'guest' ? participant.guestName ?? 'Invitado' : participant.userId === user.id ? user.name : 'Jugador mock'
  const playerAvatar = (participant: MatchParticipant) => participant.type === 'guest' ? participant.avatar || 'IN' : participant.userId === user.id ? user.avatar : 'JU'
  const entryPlayerName = (entry: StatEntry) => { const participant = selected.participants.find(item => item.userId === entry.userId); return participant ? playerName(participant) : entry.userId === user.id ? user.name : 'Jugador mock' }
  const copyInvite = () => { void navigator.clipboard?.writeText(`https://cefstats.local/match/${selected.inviteCode}`); setCopied(true); window.setTimeout(() => setCopied(false), 1500) }

  return <>
    <button onClick={() => { setActiveParticipant(null); setSelectedId(null) }} className="mb-4 min-h-10 text-sm font-bold text-emerald-500">← Todos los partidos</button>
    <div className="mb-6 flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-500">{group.name}</p><h1 className="mt-1 text-2xl font-black">{selected.title}</h1><p className="mt-1 text-sm capitalize text-slate-400">{formatMatchDate(selected.scheduledAt)} · {selected.format ?? 'Formato libre'}</p></div><span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-[10px] font-black uppercase text-emerald-500">{selected.status === 'played' ? 'Jugado' : 'Abierto'}</span></div>
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Invitación mock</p><p className="mt-1 font-mono font-bold text-emerald-500">{selected.inviteCode}</p></div><button onClick={copyInvite} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-white/10">{copied ? <CheckIcon className="h-4 w-4 text-emerald-500" /> : <CopyIcon className="h-4 w-4" />} {copied ? 'Copiado' : 'Copiar link'}</button></div></section>
        <section className="grid grid-cols-2 gap-3">{([{ team: 'light' as const, label: 'Claro', players: lightTeam }, { team: 'dark' as const, label: 'Oscuro', players: darkTeam }]).map(item => { const full = isTeamFull(selected, item.team, user.id); return <div key={item.team} className={`rounded-2xl border p-4 ${item.team === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-slate-700 bg-[#111b17] text-white'}`}><div className="flex items-center justify-between"><p className="text-sm font-black">{item.label}</p><span className="text-xs font-bold opacity-60">{item.players.length}/{maxTeamSize}</span></div><div className="mt-3 space-y-2">{item.players.length === 0 && <p className="text-xs opacity-45">Sin jugadores</p>}{item.players.map(participant => <button onClick={event => openParticipant(participant, event.currentTarget)} key={participant.id} className="flex w-full items-center gap-2 text-left"><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-[10px] font-black text-ink">{playerAvatar(participant)}</span><span className="truncate text-xs font-bold">{playerName(participant)}</span>{participant.type === 'guest' && <span className="ml-auto text-[8px] font-bold uppercase opacity-45">Inv.</span>}</button>)}</div><button disabled={full} onClick={() => onJoinTeam(selected.id, item.team)} className={`mt-4 min-h-11 w-full rounded-xl text-xs font-bold disabled:cursor-not-allowed disabled:opacity-35 ${myParticipant?.team === item.team ? 'bg-emerald-500 text-ink' : 'border border-current/15'}`}>{myParticipant?.team === item.team ? 'Estoy acá' : full ? 'Equipo completo' : `Unirme al ${item.team === 'light' ? 'claro' : 'oscuro'}`}</button><button disabled={full} onClick={() => setGuestTeam(item.team)} className="mt-2 min-h-10 w-full rounded-xl border border-current/10 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-35">{full ? 'Cupo completo' : '+ Agregar invitado'}</button></div> })}</section>
        <section><div className="mb-3 flex items-center justify-between"><h3 className="font-extrabold">Cancha</h3><span className="text-xs text-slate-400">Tocá un jugador</span></div><MatchPitch participants={selected.participants} user={user} entries={matchEntries} guestStats={selected.guestStats} mvpParticipantId={selected.mvpParticipantId} activeParticipantId={activeParticipant?.participant.id} onSelect={openParticipant} /></section>
        {myParticipant && <button onClick={() => setConfirmLeave(true)} className="min-h-11 w-full text-sm font-bold text-rose-500">Salir del partido</button>}
        <ScoreEditor key={`${selected.id}-${selected.updatedAt}`} match={selected} onSave={score => onScore(selected.id, score)} />
      </div>
      <aside className="space-y-5">
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4"><h3 className="font-extrabold">Mis números</h3><p className="mt-1 text-xs leading-5 text-slate-400">{myEntry ? `${resultLabels[myEntry.result]} · ${myEntry.goals} goles · ${myEntry.assists} asistencias` : 'Todavía no cargaste stats para este partido.'}</p><button onClick={() => setStatsOpen(true)} className="mt-4 min-h-12 w-full rounded-xl bg-emerald-500 px-3 text-sm font-extrabold text-ink">{myEntry ? 'Editar mis números de este partido' : 'Cargar mis números para este partido'}</button></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]"><h3 className="font-extrabold">Resumen</h3>{selected.score ? <p className="mt-3 text-center text-3xl font-black">Claro {selected.score.light} <span className="text-slate-400">–</span> {selected.score.dark} Oscuro</p> : <p className="mt-2 text-sm text-slate-400">Todavía no hay resultado.</p>}<p className="mt-3 text-center text-xs text-slate-400">Goles cargados: Claro {loadedLightGoals} · Oscuro {loadedDarkGoals}</p>{selected.mvpParticipantId && <p className="mt-3 rounded-xl bg-violet-500/10 p-3 text-center text-sm font-bold text-violet-500">MVP: {playerName(selected.participants.find(participant => participant.id === selected.mvpParticipantId)!)}</p>}<div className="mt-4 space-y-2">{matchEntries.map(entry => <div key={entry.id} className="flex items-center justify-between rounded-xl bg-slate-100 p-2.5 text-xs dark:bg-white/5"><span className="font-bold">{entryPlayerName(entry)}</span><span>{entry.goals} G · {entry.assists} A</span></div>)}{selected.guestStats.map(stats => { const guest = selected.participants.find(participant => participant.id === stats.participantId); return guest ? <div key={stats.participantId} className="flex items-center justify-between rounded-xl bg-slate-100 p-2.5 text-xs dark:bg-white/5"><span className="font-bold">{playerName(guest)} <em className="font-normal text-slate-400">(Invitado)</em></span><span>{stats.goals} G · {stats.assists} A</span></div> : null })}</div>{selected.score && loadedLightGoals !== selected.score.light && <p className="mt-3 text-xs leading-5 text-amber-500">Los goles cargados del equipo claro no coinciden con el resultado. Puede faltar cargar stats.</p>}{selected.score && loadedDarkGoals !== selected.score.dark && <p className="mt-2 text-xs leading-5 text-amber-500">Los goles cargados del equipo oscuro no coinciden con el resultado. Puede faltar cargar stats.</p>}</section>
        {selected.participants.length > 0 && <section className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-4"><div className="flex items-center gap-2"><TrophyIcon className="h-5 w-5 text-violet-500"/><h3 className="font-extrabold">MVP manual</h3></div><div className="mt-3 space-y-2">{selected.participants.map(participant => <button key={participant.id} onClick={() => onMvp(selected.id, participant.id)} className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-sm font-bold ${selected.mvpParticipantId === participant.id ? 'bg-violet-500 text-white' : 'border border-violet-500/20'}`}><span>{playerName(participant)}</span>{selected.mvpParticipantId === participant.id && <CheckIcon className="h-4 w-4" />}</button>)}</div></section>}
      </aside>
    </div>
    {statsOpen && <MatchStatsSheet match={selected} userId={user.id} existing={myEntry} onSave={values => onSaveStats(selected.id, values)} onClose={() => setStatsOpen(false)} />}
    {guestTeam && <GuestEditorSheet team={guestTeam} onSave={values => onAddGuest(selected.id, values)} onClose={() => setGuestTeam(null)} />}
    {editingGuest && <GuestEditorSheet guest={editingGuest} team={editingGuest.team} onSave={values => onUpdateGuest(selected.id, editingGuest.id, values)} onClose={() => setEditingGuest(null)} />}
    {activeParticipant && <ParticipantPopover participant={activeParticipant.participant} anchor={activeParticipant.anchor} user={user} entry={matchEntries.find(entry => entry.userId === activeParticipant.participant.userId)} guestStats={selected.guestStats.find(stats => stats.participantId === activeParticipant.participant.id)} isMvp={selected.mvpParticipantId === activeParticipant.participant.id} isCreator={selected.createdByUserId === user.id} onSaveGuestStats={(goals, assists) => onSaveGuestStats(selected.id, activeParticipant.participant.id, goals, assists)} onEditGuest={() => { setEditingGuest(activeParticipant.participant); setActiveParticipant(null) }} onRemoveGuest={() => { onRemoveGuest(selected.id, activeParticipant.participant.id); setActiveParticipant(null) }} onClose={() => setActiveParticipant(null)} />}
    {confirmLeave && <ModalSheet title="Salir del partido" onClose={() => setConfirmLeave(false)}><p className="text-sm leading-6 text-slate-500 dark:text-slate-300">¿Seguro que querés salir de este partido?</p><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={() => setConfirmLeave(false)} className="min-h-12 rounded-xl border border-slate-200 font-bold dark:border-white/10">Cancelar</button><button onClick={() => { onLeave(selected.id); setConfirmLeave(false) }} className="min-h-12 rounded-xl bg-rose-500 font-bold text-white">Sí, salir</button></div></ModalSheet>}
  </>
}
