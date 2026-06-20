import { useState } from 'react'
import { FireIcon, LogoutIcon, MedalIcon, TrophyIcon } from '../components/icons'
import { PageTitle } from '../components/PageTitle'
import { ProfileEditor } from '../components/ProfileEditor'
import { SettingsSheet } from '../components/SettingsSheet'
import { StatEntryEditor } from '../components/StatEntryEditor'
import { LinkEntrySheet } from '../components/LinkEntrySheet'
import type { Group, Match, MatchResult, MatchTeam, PersonalWorldCupState, StatEntry, ThemeMode, User } from '../types'
import type { UserTotals } from '../utils/stats'
import { formatEntryDate } from '../utils/format'
import { worldCupStageLabels } from '../utils/worldCup'
import { worldCupProgress } from '../utils/activityFeed'
import { formatStatContext } from '../utils/statContext'
import { UserAvatar } from '../components/UserAvatar'
import { ShareProfileCardButton } from '../components/ShareProfileCardButton'

interface Props {
  user: User
  group: Group
  entries: StatEntry[]
  allEntries: StatEntry[]
  matches: Match[]
  groups: Group[]
  totals: UserTotals
  worldCup: PersonalWorldCupState
  theme: ThemeMode
  onSaveUser: (user: User) => void | string | Promise<void | string>
  onUpdateEntry: (id: string, values: Pick<StatEntry, 'result' | 'goals' | 'assists'>) => void | Promise<void>
  onDeleteEntry: (id: string) => void | Promise<void>
  onLinkEntry: (entryId: string, matchId: string, team: MatchTeam, result?: MatchResult) => boolean | Promise<boolean>
  onTheme: (theme: ThemeMode) => void
  onLogout: () => void
  accountMode?: boolean
  statsError?: string
  onOpenMatch: (matchId: string) => void
  historyEntries?: StatEntry[]
  historyTotal?: number
  historyPage?: number
  historyPageSize?: number
  historyLoading?: boolean
  historyError?: string
  onHistoryPageChange?: (page: number) => void
}

export function ProfilePage({ user, group, entries, allEntries, matches, groups, totals, worldCup, theme, onSaveUser, onUpdateEntry, onDeleteEntry, onLinkEntry, onTheme, onLogout, onOpenMatch, accountMode = false, statsError = '', historyEntries, historyTotal, historyPage, historyPageSize = 20, historyLoading = false, historyError = '', onHistoryPageChange }: Props) {
  const [editingProfile, setEditingProfile] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<StatEntry | null>(null)
  const [linkEntry, setLinkEntry] = useState<StatEntry | null>(null)
  const [localHistoryState, setLocalHistoryState] = useState({ userId: user.id, page: 1 })
  const localHistoryPage = localHistoryState.userId === user.id ? localHistoryState.page : 1
  const controlledHistory = historyPage !== undefined && Boolean(onHistoryPageChange)
  const historySource = historyEntries ?? entries
  const totalHistoryEntries = historyTotal ?? historySource.length
  const historyPages = Math.max(1, Math.ceil(totalHistoryEntries / historyPageSize))
  const activeHistoryPage = Math.min(historyPages, historyPage ?? localHistoryPage)
  const sortedHistory = [...historySource].sort((a, b) => (b.playedAt ?? b.createdAt).localeCompare(a.playedAt ?? a.createdAt))
  const history = controlledHistory ? sortedHistory : sortedHistory.slice((activeHistoryPage - 1) * historyPageSize, activeHistoryPage * historyPageSize)
  const changeHistoryPage = (page: number) => {
    const next = Math.min(historyPages, Math.max(1, page))
    if (controlledHistory) onHistoryPageChange?.(next)
    else setLocalHistoryState({ userId: user.id, page: next })
  }
  const progress = worldCupProgress(worldCup)
  const profileTitle = user.nickname && user.nickname !== user.name ? `${user.name} “${user.nickname}”` : user.name

  return <>
    <div className="mb-6 flex items-start justify-between gap-3"><PageTitle eyebrow="Mi perfil" title={profileTitle} subtitle={`${user.position || 'Sin posición'} · ${group.name}`} /><button onClick={() => setSettingsOpen(true)} className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-white/10">Ajustes</button></div>
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <section className="relative overflow-hidden rounded-[28px] bg-[#0c2019] p-6 text-white">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative flex items-center gap-4"><UserAvatar value={user.avatar} fallback={user.initials} className="h-20 w-20 rounded-3xl text-2xl" /><div className="min-w-0"><div className="truncate text-xl font-black">{user.name}</div><div className="mt-1 text-sm font-semibold text-emerald-400">{user.position || 'Sin posición'}</div><div className="mt-0.5 text-sm text-slate-400">@{user.username.replace(/^@/, '')}</div>{totals.scoringStreak > 0 && <span className="mt-2 inline-block rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">En racha</span>}</div></div>
          <div className="relative mt-6 grid grid-cols-3 divide-x divide-white/10 text-center"><div><div className="text-xl font-black">{totals.goals}</div><div className="text-[10px] text-slate-500">Goles</div></div><div><div className="text-xl font-black">{totals.assists}</div><div className="text-[10px] text-slate-500">Asist.</div></div><div><div className="text-xl font-black">{totals.matches}</div><div className="text-[10px] text-slate-500">Partidos</div></div></div>
          <button onClick={() => setEditingProfile(true)} className="relative mt-5 min-h-11 w-full rounded-xl border border-white/10 bg-white/5 text-sm font-bold hover:bg-white/10">Editar perfil</button>
          <div className="relative"><ShareProfileCardButton user={user} totals={totals} /></div>
        </section>
        <section className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.07] p-5">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/15 text-violet-500"><TrophyIcon /></div><div><p className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Mundial personal · Ciclo {worldCup.currentCycle}</p><h3 className="font-extrabold">{worldCupStageLabels[worldCup.currentStage]}</h3></div></div>
          <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">{worldCup.statusText}</p>
          <div className="mt-4 grid grid-cols-7 gap-1">{Array.from({ length: 7 }, (_, index) => <div key={index} className={`h-1.5 rounded-full ${index < progress ? 'bg-violet-500' : 'bg-slate-200 dark:bg-white/10'}`} />)}</div>
          <div className="mt-3 text-[11px] text-slate-400">Mundiales ganados: <strong className="text-violet-500">{worldCup.worldCupsWon}</strong></div>
        </section>
        <button onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3.5 text-sm font-bold text-slate-500 transition hover:border-red-400 hover:text-red-500 dark:border-white/10"><LogoutIcon className="h-4 w-4" /> {accountMode ? 'Cerrar sesión' : 'Salir del modo local'}</button>
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between"><div><h2 className="font-extrabold">Mi historial de cargas</h2><p className="mt-0.5 text-xs text-slate-400">Sólo tus números, en todos los scopes disponibles.</p></div><span className="text-xs text-slate-400">{totalHistoryEntries} {accountMode ? 'en Supabase' : 'locales'}</span></div>
        {(historyError || statsError) && <div className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-500">{historyError || statsError}</div>}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]">
          {historyLoading && <div className="p-8 text-center text-sm text-slate-400">Cargando tu historial...</div>}
          {!historyLoading && history.length === 0 && <div className="p-8 text-center"><div className="text-2xl">⚽</div><p className="mt-3 font-bold">Todavía no hay stats</p><p className="mt-1 text-sm text-slate-400">Cargá tu primer partido y aparece acá.</p></div>}
          {!historyLoading && history.map((entry, index) => { const linkedMatch = entry.matchId ? matches.find(match => match.id === entry.matchId) : undefined; const matchGroupName = linkedMatch ? (linkedMatch.groupId ? linkedMatch.groupName ?? groups.find(item => item.id === linkedMatch.groupId)?.name ?? 'Grupo anfitrión' : 'Sin grupo') : undefined; const resultText = entry.result === 'win' ? 'Gané' : entry.result === 'draw' ? 'Empaté' : 'Perdí'; return <div key={entry.id} className={`flex items-center gap-3 p-4 sm:p-5 ${index !== history.length - 1 ? 'border-b border-slate-100 dark:border-white/5' : ''}`}>
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${entry.result === 'win' ? 'bg-emerald-500/10 text-emerald-500' : entry.result === 'draw' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>{entry.result === 'win' ? <MedalIcon className="h-5 w-5" /> : <span className="font-black">{entry.result === 'draw' ? 'E' : 'D'}</span>}</div>
            <div className="min-w-0 flex-1"><div className="font-bold">{resultText}</div><div className="mt-1 text-xs capitalize text-slate-400">{formatEntryDate(entry.playedAt ?? entry.createdAt)}</div><div className="mt-1 text-[10px] font-semibold text-slate-400">{formatStatContext(entry)}</div>{linkedMatch ? <><button onClick={() => onOpenMatch(linkedMatch.id)} className="mt-1 block max-w-full truncate text-left text-[10px] font-bold text-emerald-500 underline-offset-2 hover:underline">{linkedMatch.title} →</button>{matchGroupName && <div className="mt-1 text-[10px] font-medium text-slate-400">Grupo: {matchGroupName}</div>}</> : entry.matchId ? <div className="mt-1 text-[10px] font-bold leading-4 text-slate-400">Partido vinculado no disponible.</div> : null}</div>
            <div className="flex flex-wrap justify-end gap-2 text-center"><div><div className="font-black">{entry.goals}</div><div className="text-[9px] text-slate-400">GOL</div></div><div><div className="font-black">{entry.assists}</div><div className="text-[9px] text-slate-400">ASIS</div></div>{!entry.matchId && <button onClick={() => setLinkEntry(entry)} className="min-h-10 rounded-xl border border-emerald-500/30 px-2 text-[10px] font-bold text-emerald-500">Vincular a partido</button>}<button onClick={() => setSelectedEntry(entry)} className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-bold dark:border-white/10">Editar</button></div>
          </div>})}
        </div>
        {historyPages > 1 && <div className="mt-4 flex items-center justify-between gap-3"><button onClick={() => changeHistoryPage(activeHistoryPage - 1)} disabled={activeHistoryPage <= 1 || historyLoading} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold disabled:opacity-40 dark:border-white/10">← Anterior</button><span className="text-xs font-bold text-slate-400">Página {activeHistoryPage} de {historyPages}</span><button onClick={() => changeHistoryPage(activeHistoryPage + 1)} disabled={activeHistoryPage >= historyPages || historyLoading} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold disabled:opacity-40 dark:border-white/10">Siguiente →</button></div>}
        <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]"><FireIcon className="h-5 w-5 text-orange-500"/><div className="mt-4 text-2xl font-black">{totals.scoringStreak}</div><div className="text-xs text-slate-400">Racha goleadora</div></div><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]"><TrophyIcon className="h-5 w-5 text-emerald-500"/><div className="mt-4 text-2xl font-black">{totals.winRate}%</div><div className="text-xs text-slate-400">Partidos ganados</div></div></div>
      </div>
    </div>
    {editingProfile && <ProfileEditor user={user} accountMode={accountMode} onSave={onSaveUser} onClose={() => setEditingProfile(false)} />}
    {selectedEntry && <StatEntryEditor entry={selectedEntry} onSave={values => onUpdateEntry(selectedEntry.id, values)} onDelete={() => onDeleteEntry(selectedEntry.id)} onClose={() => setSelectedEntry(null)} />}
    {linkEntry && <LinkEntrySheet entry={linkEntry} matches={matches} groups={groups} allEntries={allEntries} onLink={onLinkEntry} onEditExisting={entry => setSelectedEntry(entry)} onClose={() => setLinkEntry(null)} />}
    {settingsOpen && <SettingsSheet user={user} theme={theme} onTheme={onTheme} onSaveUser={onSaveUser} onClose={() => setSettingsOpen(false)} />}
  </>
}
