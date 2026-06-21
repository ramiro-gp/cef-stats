import { ChevronRight, PlusCircleIcon } from '../components/icons'
import { ActivityFeedPanel } from '../components/ActivityFeedPanel'
import { GroupTicker } from '../components/GroupTicker'
import type { Group, Match, MatchEvent, Page, PersonalWorldCupState, RankingPlayer, StatEntry, User } from '../types'
import { buildActivityFeed, buildAllGroupsActivityFeed } from '../utils/activityFeed'
import { buildGroupBannerMessages } from '../utils/banner'
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
  userNames?: Record<string, string>
  groupNames?: Record<string, string>
  playerGroupIds?: Record<string, string[]>
}

export function HomePage({ user, group, entries, matches, matchEvents, totals, rankings, worldCup, onNavigate, userNames = {}, groupNames = {}, playerGroupIds = {} }: Props) {
  const personalScope = isPersonalScope(group)
  const allScope = isAllScope(group)
  const feed = allScope ? buildAllGroupsActivityFeed(entries, userNames, groupNames, matches) : buildActivityFeed(entries, user, group, matches, matchEvents)
  const recentFeed = feed.slice(0, 10)
  const hasRankings = rankings.length > 0
  const goalPosition = getGoalPosition(rankings, user.id)
  const playerAhead = [...rankings].sort((a, b) => b.goals - a.goals)[goalPosition - 2]
  const goalsToNext = playerAhead ? playerAhead.goals - totals.goals + 1 : 0
  const tickerMessages = buildGroupBannerMessages(group, rankings, user, totals, worldCup, entries.length, matches, entries, playerGroupIds)

  return <>
    <section data-tour="home-hero" className="relative overflow-hidden rounded-[28px] bg-[#0c2019] p-5 text-white shadow-xl dark:border dark:border-white/5 sm:p-7">
      <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">{group.name}</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Buenas, {user.nickname} 👋</h1><p className="mt-1 text-sm text-slate-400">{allScope ? 'Estás viendo todos tus grupos combinados.' : personalScope ? 'Estás cargando en Mi historial.' : '¿Cómo te fue en la cancha?'}</p></div>
          <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right sm:block"><div className="text-xs text-slate-400">Cargas visibles</div><div className="text-sm font-bold">{entries.length} partido{entries.length === 1 ? '' : 's'}</div></div>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button onClick={() => onNavigate('add')} className="flex min-h-16 w-full items-center justify-between rounded-2xl bg-emerald-500 px-5 font-extrabold text-ink shadow-glow transition hover:bg-emerald-400 active:scale-[.99] sm:w-auto sm:min-w-72">
            <span className="flex items-center gap-3"><PlusCircleIcon /> Cargar mis números</span><ChevronRight />
          </button>
          <button onClick={() => onNavigate('matches')} className="min-h-12 w-full rounded-xl border border-white/10 text-sm font-bold text-slate-300 transition hover:bg-white/5 sm:w-auto sm:px-5">+ Partido</button>
        </div>
      </div>
    </section>

    <GroupTicker key={group.id} messages={tickerMessages} />

    <section data-tour="home-season" className="mt-6">
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
  </>
}
