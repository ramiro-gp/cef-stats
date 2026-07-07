import { useMemo, useState } from 'react'
import { ChevronRight, PlusCircleIcon } from '../components/icons'
import { ActivityFeedPanel } from '../components/ActivityFeedPanel'
import { GroupTicker } from '../components/GroupTicker'
import type { Group, Match, MatchEvent, MatchTeam, Page, PersonalWorldCupState, RankingPlayer, StatEntry, User } from '../types'
import { buildActivityFeed, buildAllGroupsActivityFeed } from '../utils/activityFeed'
import { buildGroupBannerMessages } from '../utils/banner'
import { isTeamFull } from '../utils/matches'
import { getGoalPosition, type UserTotals } from '../utils/stats'
import { worldCupStageLabels } from '../utils/worldCup'
import { isAllScope, isPersonalScope } from '../utils/scopes'

interface Props {
  user: User
  group: Group
  entries: StatEntry[]
  matches: Match[]
  matchEvents: MatchEvent[]
  totals: UserTotals
  rankings: RankingPlayer[]
  worldCup: PersonalWorldCupState
  onNavigate: (page: Page) => void
  onOpenMatch?: (matchId: string) => void
  onAttendMatch?: (matchId: string) => void | Promise<unknown>
  onOmitMatch?: (matchId: string) => void | Promise<unknown>
  onJoinMatchTeam?: (matchId: string, team: MatchTeam) => void | Promise<unknown>
  userNames?: Record<string, string>
  groupNames?: Record<string, string>
  playerGroupIds?: Record<string, string[]>
}

function matchDate(value: string) {
  return new Date(value).toLocaleString('es-AR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function HomePage({ user, group, entries, matches, matchEvents, totals, rankings, worldCup, onNavigate, onOpenMatch, onAttendMatch, onOmitMatch, onJoinMatchTeam, userNames = {}, groupNames = {}, playerGroupIds = {} }: Props) {
  const [pendingAction, setPendingAction] = useState('')
  const [choosingTeamFor, setChoosingTeamFor] = useState<string | null>(null)
  const [locallyOmitted, setLocallyOmitted] = useState<Set<string>>(() => new Set())
  const personalScope = isPersonalScope(group)
  const allScope = isAllScope(group)
  const feed = allScope || (!personalScope && entries.some(entry => entry.userId !== user.id)) ? buildAllGroupsActivityFeed(entries, userNames, groupNames, matches) : buildActivityFeed(entries, user, group, matches, matchEvents)
  const recentFeed = feed.slice(0, 10)
  const hasRankings = rankings.length > 0
  const goalPosition = getGoalPosition(rankings, user.id)
  const playerAhead = [...rankings].sort((a, b) => b.goals - a.goals)[goalPosition - 2]
  const goalsToNext = playerAhead ? playerAhead.goals - totals.goals + 1 : 0
  const tickerMessages = buildGroupBannerMessages(group, rankings, user, totals, worldCup, entries.length, matches, entries, playerGroupIds)
  const featuredMatches = useMemo(() => !allScope && !personalScope
    ? [...matches]
      .filter(match => match.status === 'open' && !match.omittedByCurrentUser && !locallyOmitted.has(match.id))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 5)
    : [], [allScope, locallyOmitted, matches, personalScope])

  const runAction = async (key: string, action: () => void | Promise<unknown>) => {
    if (pendingAction) return
    setPendingAction(key)
    try { await action() }
    finally { setPendingAction('') }
  }

  const attend = (match: Match) => {
    if (!onAttendMatch) return
    void runAction(`attend-${match.id}`, async () => {
      await onAttendMatch(match.id)
      setChoosingTeamFor(match.id)
    })
  }

  const omit = (match: Match) => {
    if (!onOmitMatch) return
    void runAction(`omit-${match.id}`, async () => {
      await onOmitMatch(match.id)
      setLocallyOmitted(current => new Set([...current, match.id]))
    })
  }

  const joinTeam = (match: Match, team: MatchTeam) => {
    if (!onJoinMatchTeam) return
    void runAction(`team-${match.id}-${team}`, async () => {
      await onJoinMatchTeam(match.id, team)
      setChoosingTeamFor(null)
    })
  }

  return <>
    <section data-tour="home-hero" className="relative overflow-hidden rounded-[28px] bg-[#0c2019] p-4 text-white shadow-xl dark:border dark:border-white/5 sm:p-6">
      <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">{group.name}</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div><h1 className="text-xl font-extrabold tracking-tight sm:text-3xl">Buenas, {user.nickname} 👋</h1><p className="mt-1 text-sm text-slate-400">{allScope ? 'Estás viendo todos tus grupos combinados.' : personalScope ? 'Estás cargando en Mi historial.' : '¿Cómo te fue en la cancha?'}</p></div>
          <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right sm:block"><div className="text-xs text-slate-400">Cargas visibles</div><div className="text-sm font-bold">{entries.length} partido{entries.length === 1 ? '' : 's'}</div></div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button onClick={() => onNavigate('add')} className="flex min-h-14 w-full items-center justify-between rounded-2xl bg-emerald-500 px-4 font-extrabold text-ink shadow-glow transition hover:bg-emerald-400 active:scale-[.99] sm:w-auto sm:min-w-64">
            <span className="flex items-center gap-3"><PlusCircleIcon /> Cargar stats</span><ChevronRight />
          </button>
          <button onClick={() => onNavigate('matches')} className="min-h-12 w-full rounded-xl border border-white/10 text-sm font-bold text-slate-300 transition hover:bg-white/5 sm:w-auto sm:px-5">+ Partido</button>
        </div>
      </div>
    </section>

    <GroupTicker key={group.id} messages={tickerMessages} />

    {featuredMatches.length > 0 && <section className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-widest text-emerald-500">Partidos disponibles de {group.name}</p><span className="text-xs font-bold text-slate-400">{featuredMatches.length}</span></div>
      <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1">
        {featuredMatches.map(match => {
          const myParticipant = match.participants.find(participant => participant.userId === user.id)
          const canChooseTeam = Boolean(myParticipant && !myParticipant.team) || choosingTeamFor === match.id
          const lightName = match.lightTeamName || 'CLARO'
          const darkName = match.darkTeamName || 'OSCURO'
          return <article key={match.id} className="min-w-[260px] snap-start rounded-2xl border border-emerald-500/20 bg-white p-3 dark:bg-white/[0.04]">
            <button type="button" onClick={() => onOpenMatch ? onOpenMatch(match.id) : onNavigate('matches')} className="block w-full text-left">
              <h2 className="truncate text-base font-extrabold">{match.title}</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{matchDate(match.scheduledAt)} · {match.participants.length} anotado{match.participants.length === 1 ? '' : 's'}</p>
            </button>
            {!myParticipant && !canChooseTeam && <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => attend(match)} disabled={Boolean(pendingAction)} className="min-h-10 rounded-xl bg-emerald-500 text-xs font-black text-ink disabled:opacity-50">UNIRME</button>
              <button type="button" onClick={() => omit(match)} disabled={Boolean(pendingAction)} className="min-h-10 rounded-xl border border-slate-200 text-xs font-black text-slate-500 disabled:opacity-50 dark:border-white/10">OMITIR</button>
            </div>}
            {canChooseTeam && <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2">
              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-300">Equipo opcional</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => joinTeam(match, 'light')} disabled={Boolean(pendingAction) || isTeamFull(match, 'light', user.id)} className="min-h-10 truncate rounded-xl bg-white px-2 text-xs font-black text-slate-900 disabled:opacity-40">{lightName}</button>
                <button type="button" onClick={() => joinTeam(match, 'dark')} disabled={Boolean(pendingAction) || isTeamFull(match, 'dark', user.id)} className="min-h-10 truncate rounded-xl bg-[#111b17] px-2 text-xs font-black text-white disabled:opacity-40">{darkName}</button>
              </div>
              <button type="button" onClick={() => setChoosingTeamFor(null)} className="mt-2 min-h-8 w-full text-[11px] font-bold text-slate-500">Elegir después</button>
            </div>}
            {myParticipant?.team && <p className="mt-3 rounded-xl bg-emerald-500/10 p-2 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">Ya estás anotado en {myParticipant.team === 'light' ? lightName : darkName}</p>}
          </article>
        })}
      </div>
    </section>}

    {!group.seeded && entries.length === 0 && <section className="mt-6 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/[0.05] p-5 text-center"><p className="font-extrabold">Todavía no hay stats</p><p className="mt-1 text-sm text-slate-400">{personalScope ? 'Cargá tu primer partido. Podés crear un grupo más adelante para comparar con amigos.' : 'Cargá tu primer partido y el grupo empieza a tomar vida.'}</p><button onClick={() => onNavigate('add')} className="mt-4 min-h-11 rounded-xl bg-emerald-500 px-5 text-sm font-bold text-ink">Cargar primer partido</button></section>}

    <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
      <section data-tour="home-activity">
        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-extrabold">Movimientos recientes</h2><p className="mt-0.5 text-xs text-slate-400">Últimos {Math.min(10, feed.length)} de {allScope ? 'tus grupos' : group.name}</p></div><span className="h-2 w-2 rounded-full bg-emerald-500" /></div>
        <ActivityFeedPanel items={recentFeed} />
      </section>
      <div className="space-y-3">
        <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-5">
          <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-500">Tu posición</p><p className="mt-1 text-xl font-black">{hasRankings ? `#${goalPosition} en goles` : 'Sin ranking'}</p></div><div className="text-4xl font-black text-emerald-500/25">{hasRankings ? String(goalPosition).padStart(2, '0') : '—'}</div></div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{!hasRankings ? 'Los rankings se arman solos con las primeras cargas.' : playerAhead ? `Te faltan ${goalsToNext} para superar a ${playerAhead.name}.` : 'Estás liderando el ranking. Que no se duerman.'}</p>
        </section>
        <section className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.07] p-5"><p className="text-xs font-bold uppercase tracking-widest text-violet-500">Mundial personal · Ciclo {worldCup.currentCycle}</p><p className="mt-1 font-extrabold">{worldCupStageLabels[worldCup.currentStage]}</p><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{worldCup.statusText}</p></section>
      </div>
    </div>

    <section data-tour="home-season" className="mt-8">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-extrabold">Mi temporada</h2><span className="text-xs text-slate-400">{totals.matches} partidos</span></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Mis goles', value: String(totals.goals), detail: group.name, icon: '⚽', color: 'text-emerald-500' },
          { label: 'Mis asistencias', value: String(totals.assists), detail: group.name, icon: '→', color: 'text-sky-500' },
          { label: 'Mi racha', value: String(totals.scoringStreak), detail: 'partidos', icon: '↗', color: 'text-orange-500' },
          { label: 'Mundial personal', value: worldCupStageLabels[worldCup.currentStage], detail: worldCup.worldCupsWon ? `${worldCup.worldCupsWon} ganado${worldCup.worldCupsWon === 1 ? '' : 's'}` : `Ciclo ${worldCup.currentCycle}`, icon: '◇', color: 'text-violet-500' },
        ].map(item => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500/30 dark:border-white/10 dark:bg-white/[0.04]">
          <div className={`mb-5 text-xl font-black ${item.color}`}>{item.icon}</div><div className="truncate text-2xl font-black tracking-tight">{item.value}</div><div className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{item.label}</div><div className="mt-2 text-[11px] text-slate-400">{item.detail}</div>
        </div>)}
      </div>
    </section>
  </>
}
