import { useMemo, useState } from 'react'
import { MedalIcon } from '../components/icons'
import { PageTitle } from '../components/PageTitle'
import { UserAvatar } from '../components/UserAvatar'
import { StatFilterControls } from '../components/StatFilterControls'
import { RankingStatisticsView } from '../components/RankingStatisticsView'
import type { Group, RankingPlayer, RankingTab, StatEntry, User } from '../types'
import { buildScopeRankings, filterRankingEntries, type FootballFormatFilter, type MatchTypeFilter } from '../utils/rankingFilters'
import { footballFormatFilterLabel, matchTypeFilterLabel } from '../utils/statFilters'
import { isAllScope, isPersonalScope } from '../utils/scopes'
import { sortRankings } from '../utils/stats'
import { worldCupStageLabels } from '../utils/worldCup'

const tabs: { id: RankingTab; label: string }[] = [
  { id: 'goals', label: 'Goles' }, { id: 'assists', label: 'Asistencias' }, { id: 'matches', label: 'Partidos' }, { id: 'average', label: 'Promedio' }, { id: 'worldCup', label: 'Mundial' },
]
function rankingValue(player: RankingPlayer, tab: RankingTab): string {
  if (tab === 'goals') return `${player.goals} goles`
  if (tab === 'assists') return `${player.assists} asist.`
  if (tab === 'matches') return `${player.matches} partidos`
  if (tab === 'average') return `${player.average.toFixed(2)} p/partido`
  return player.worldCupsWon ? `${player.worldCupsWon} ganado${player.worldCupsWon === 1 ? '' : 's'}` : worldCupStageLabels[player.worldCupStage]
}

function rankingDetail(player: RankingPlayer, tab: RankingTab): string {
  if (tab === 'goals') return `${(player.matches ? player.goals / player.matches : 0).toFixed(2)} por partido`
  if (tab === 'assists') return `${(player.matches ? player.assists / player.matches : 0).toFixed(2)} por partido`
  if (tab === 'matches') return `${player.wins}/${player.matches} ganados`
  if (tab === 'average') return `${player.goals} goles · ${player.matches} partidos`
  return `${player.matches} partidos cargados`
}

interface Props { group: Group; players: RankingPlayer[]; sourceEntries: StatEntry[]; sourceUsers: User[]; currentUserId: string }

export function RankingsPage({ group, players, sourceEntries, sourceUsers, currentUserId }: Props) {
  const [view, setView] = useState<'ranking' | 'statistics'>('ranking')
  const [tab, setTab] = useState<RankingTab>('goals')
  const [matchType, setMatchType] = useState<MatchTypeFilter>('all')
  const [footballFormat, setFootballFormat] = useState<FootballFormatFilter>('all')
  const personalScope = isPersonalScope(group)
  const allScope = isAllScope(group)
  const filtersActive = matchType !== 'all' || footballFormat !== 'all'
  const filteredEntries = useMemo(() => filterRankingEntries(sourceEntries, matchType, footballFormat), [footballFormat, matchType, sourceEntries])
  const filteredPlayers = useMemo(() => filtersActive ? buildScopeRankings(filteredEntries, sourceUsers, group, currentUserId) : players, [currentUserId, filteredEntries, filtersActive, group, players, sourceUsers])
  const sorted = sortRankings(filteredPlayers, tab)
  const current = filteredPlayers.find(player => player.isCurrentUser)
  const typeLabel = matchTypeFilterLabel(matchType)
  const formatLabel = footballFormatFilterLabel(footballFormat)

  return <>
    <PageTitle eyebrow={group.name} title={personalScope ? 'Mis números' : 'Rankings'} subtitle={personalScope ? 'Tu rendimiento personal, sin necesidad de un grupo.' : allScope ? 'Personas únicas y stats combinadas de tus grupos y Personal.' : 'La tabla que nadie admite mirar todos los días.'} />
    <div data-tour="rankings-view" className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-white/5"><button type="button" onClick={() => setView('ranking')} className={`min-h-11 rounded-xl text-sm font-extrabold transition ${view === 'ranking' ? 'bg-emerald-500 text-ink shadow-glow' : 'text-slate-500 dark:text-slate-400'}`}>Ranking</button><button type="button" onClick={() => setView('statistics')} className={`min-h-11 rounded-xl text-sm font-extrabold transition ${view === 'statistics' ? 'bg-emerald-500 text-ink shadow-glow' : 'text-slate-500 dark:text-slate-400'}`}>Estadísticas</button></div>
    <section data-tour="rankings-filters" className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <StatFilterControls filters={{ matchType, footballFormat }} onChange={filters => { setMatchType(filters.matchType); setFootballFormat(filters.footballFormat) }} />
      <p className="mt-4 text-[11px] font-semibold text-slate-400">{view === 'ranking' ? 'Rankings' : 'Estadísticas'} · {typeLabel} · {formatLabel}<span className="ml-1">({filteredEntries.length} cargas)</span></p>
    </section>

    {filteredPlayers.length === 0 ? <div className="rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/[0.05] p-8 text-center"><div className="text-3xl">🏆</div><p className="mt-3 font-extrabold">{filtersActive ? 'No hay datos para este filtro' : personalScope ? 'Tu historial está listo' : 'Todavía no hay rankings'}</p><p className="mt-1 text-sm leading-6 text-slate-400">{filtersActive ? 'Probá otra combinación de tipo y formato.' : personalScope ? 'Cargá tu primer partido para ver acá tus números.' : 'Los rankings se arman solos con las primeras cargas.'}</p></div> : view === 'statistics' ? <RankingStatisticsView key={`${group.id}:${filteredPlayers.map(player => player.id).join(':')}`} players={filteredPlayers} currentUserId={currentUserId} /> : <>
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold transition ${tab === item.id ? 'bg-emerald-500 text-ink' : 'border border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400'}`}>{item.label}</button>)}</div>
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <section className="space-y-2.5">{sorted.map((player, index) => <div key={player.id} className={`flex items-center gap-3 rounded-2xl border p-3.5 transition ${player.isCurrentUser ? 'border-emerald-500/50 bg-emerald-500/[0.08]' : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]'}`}><div className={`w-7 text-center text-sm font-black ${index < 3 ? 'text-emerald-500' : 'text-slate-400'}`}>{index + 1}</div><UserAvatar value={player.initials} fallback={player.name.slice(0, 2).toUpperCase()} className={`h-11 w-11 rounded-full text-xs text-white ${player.accent}`} /><div className="min-w-0 flex-1"><div className="truncate font-bold">{player.name} {player.isCurrentUser && <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500">Vos</span>}</div><div className="mt-0.5 text-xs text-slate-400">{player.wins}V · {player.draws}E · {player.losses}D</div></div><div className="text-right"><div className="font-black tabular-nums">{rankingValue(player, tab)}</div><div className="mt-0.5 text-[10px] text-slate-400">{rankingDetail(player, tab)}</div>{index < 3 && <div className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-400">Top {index + 1}</div>}</div></div>)}</section>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]"><MedalIcon className="h-8 w-8 text-emerald-500" /><h3 className="mt-4 font-extrabold">Tu balance</h3><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{filtersActive ? `Balance para ${typeLabel.toLowerCase()} · ${formatLabel}.` : personalScope ? 'Cada carga de tu historial se suma a este resumen.' : 'Totales del scope que estás viendo.'}</p>{current && <div className="mt-5 grid grid-cols-3 gap-2 text-center"><div><div className="text-xl font-black text-emerald-500">{current.wins}</div><div className="text-[10px] text-slate-400">VICTORIAS</div></div><div><div className="text-xl font-black text-amber-500">{current.draws}</div><div className="text-[10px] text-slate-400">EMPATES</div></div><div><div className="text-xl font-black text-rose-500">{current.losses}</div><div className="text-[10px] text-slate-400">DERROTAS</div></div></div>}</aside>
      </div>
    </>}
  </>
}
