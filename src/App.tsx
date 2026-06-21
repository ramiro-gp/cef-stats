import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { useLocalStore } from './store/useLocalStore'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import type { AuthProfile, GroupMemberView, Page, RankingPlayer, StatEntry, User } from './types'
import { buildGroupRankings, buildRankings, calculateScoringStreakRecord, calculateUserTotals } from './utils/stats'
import { calculatePersonalWorldCup } from './utils/worldCup'
import { useTheme } from './hooks/useTheme'
import { getGroupEntries } from './utils/selectors'
import { useAuth } from './hooks/useAuth'
import { useSupabaseGroups } from './hooks/useSupabaseGroups'
import { useSupabaseStats } from './hooks/useSupabaseStats'
import { useSupabaseProfileHistory } from './hooks/useSupabaseProfileHistory'
import { isAllScope, isPersonalScope } from './utils/scopes'
import { extractGroupInviteCode } from './utils/groups'
import { groupInviteIntentRepository } from './data/groupInviteIntentRepository'
import { extractInviteCode, isTeamFull, isValidMatchCode } from './utils/matches'
import { useSupabaseMatches } from './hooks/useSupabaseMatches'
import { matchInviteIntentRepository } from './data/matchInviteIntentRepository'
import { AuthSplash } from './components/AuthSplash'
import { pageFromPathname, pagePaths } from './config/routes'
import { supabaseRepository } from './data/supabaseRepository'

const AddStatsPage = lazy(() => import('./pages/AddStatsPage').then(module => ({ default: module.AddStatsPage })))
const GroupsPage = lazy(() => import('./pages/GroupsPage').then(module => ({ default: module.GroupsPage })))
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })))
const RankingsPage = lazy(() => import('./pages/RankingsPage').then(module => ({ default: module.RankingsPage })))
const MatchesPage = lazy(() => import('./pages/MatchesPage').then(module => ({ default: module.MatchesPage })))

function PageLoading() {
  return <div className="rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10">Cargando pantalla...</div>
}

function mergeAuthProfile(profile: AuthProfile, localUser: User): User {
  const initials = profile.name.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || localUser.initials
  return { ...localUser, id: profile.id, name: profile.name, nickname: profile.name, username: profile.handle, avatar: profile.avatar || initials, initials, position: profile.position ?? '', defaultMatchType: profile.defaultMatchType, defaultFootballFormat: profile.defaultFootballFormat }
}

function initialGroupInviteCode(): string {
  if (typeof window === 'undefined') return groupInviteIntentRepository.load() ?? ''
  return extractGroupInviteCode(window.location.href) || groupInviteIntentRepository.load() || ''
}

function initialMatchInviteCode(): string {
  if (typeof window === 'undefined') return matchInviteIntentRepository.load() ?? ''
  const explicitCode = extractInviteCode(window.location.href)
  if (explicitCode) return explicitCode
  const storedCode = matchInviteIntentRepository.load() ?? ''
  if (isValidMatchCode(storedCode)) return extractInviteCode(storedCode)
  if (storedCode) matchInviteIntentRepository.clear()
  return ''
}

export default function App() {
  const [pendingGroupCode, setPendingGroupCode] = useState(initialGroupInviteCode)
  const [groupInviteError, setGroupInviteError] = useState('')
  const [pendingMatchCode, setPendingMatchCode] = useState(initialMatchInviteCode)
  const attemptedGroupCode = useRef('')
  const store = useLocalStore()
  const auth = useAuth()
  const location = useLocation()
  const routerNavigate = useNavigate()
  const { theme, setTheme, dark } = useTheme()
  const accountMode = Boolean(auth.user && auth.profile)
  const activePage = pageFromPathname(location.pathname)
  const matchRouteId = matchPath('/partidos/:matchId', location.pathname)?.params.matchId ?? null
  const remoteGroups = useSupabaseGroups(accountMode ? auth.user!.id : null)
  const { groups: sharedGroups, joinGroup: joinRemoteGroup, loading: groupsLoading, ready: groupsReady, selectGroup: selectRemoteGroup } = remoteGroups
  const currentUser = useMemo(() => auth.profile ? mergeAuthProfile(auth.profile, store.user) : store.user, [auth.profile, store.user])
  const groups = accountMode ? remoteGroups.scopes : store.groups
  const group = accountMode ? remoteGroups.activeScope : store.group
  const selectGroup = accountMode ? remoteGroups.selectGroup : store.setGroup
  const sharedGroupIds = useMemo(() => remoteGroups.groups.map(item => item.id), [remoteGroups.groups])
  const remoteStats = useSupabaseStats(accountMode ? auth.user!.id : null, accountMode ? remoteGroups.activeScope : null, sharedGroupIds)
  const profileHistory = useSupabaseProfileHistory(accountMode ? auth.user!.id : null)
  const remoteMatchGroupId = accountMode ? remoteGroups.activeSharedGroup?.id ?? null : null
  const remoteMatches = useSupabaseMatches(accountMode ? auth.user!.id : null, remoteMatchGroupId)

  const navigate = (next: Page) => {
    routerNavigate(pagePaths[next])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (pendingGroupCode) groupInviteIntentRepository.save(pendingGroupCode)
  }, [pendingGroupCode])

  useEffect(() => {
    if (pendingMatchCode) matchInviteIntentRepository.save(pendingMatchCode)
  }, [pendingMatchCode])

  useEffect(() => {
    if (accountMode && pendingMatchCode && location.pathname !== '/login' && !location.pathname.startsWith('/partidos')) {
      void Promise.resolve().then(() => routerNavigate({ pathname: pagePaths.matches, search: location.search }, { replace: true }))
    }
  }, [accountMode, location.pathname, location.search, pendingMatchCode, routerNavigate])

  useEffect(() => {
    if (!accountMode || location.pathname === '/login' || !groupsReady || groupsLoading || !pendingGroupCode || attemptedGroupCode.current === pendingGroupCode) return
    attemptedGroupCode.current = pendingGroupCode
    void Promise.resolve().then(async () => {
      const groupsLocation = () => {
        const search = new URLSearchParams(location.search)
        search.delete('joinGroup')
        search.delete('groupCode')
        return { pathname: pagePaths.groups, search: search.toString() ? `?${search}` : '' }
      }
      try {
        setGroupInviteError('')
        const existing = sharedGroups.find(item => item.code.toUpperCase() === pendingGroupCode.toUpperCase())
        if (existing) selectRemoteGroup(existing)
        else await joinRemoteGroup(pendingGroupCode)
        groupInviteIntentRepository.clear()
        setPendingGroupCode('')
        routerNavigate(groupsLocation(), { replace: true })
      } catch (reason) {
        groupInviteIntentRepository.clear()
        setPendingGroupCode('')
        routerNavigate(groupsLocation(), { replace: true })
        setGroupInviteError(reason instanceof Error ? reason.message : 'No pudimos unirnos al grupo de la invitación.')
      }
    })
  }, [accountMode, groupsLoading, groupsReady, joinRemoteGroup, location.pathname, location.search, pendingGroupCode, routerNavigate, selectRemoteGroup, sharedGroups])

  if (auth.status === 'loading') return <AuthSplash />

  if (auth.status === 'unauthenticated') {
    if (location.pathname !== '/login') return <Navigate to={{ pathname: '/login', search: location.search }} replace state={{ from: `${location.pathname}${location.search}` }} />
    return <LoginPage configured={auth.configured} loading={auth.loading} authError={auth.error} pendingGroupCode={pendingGroupCode} pendingMatchCode={pendingMatchCode} onSignIn={auth.signIn} onSignUp={auth.signUp} />
  }

  if (location.pathname === '/login') {
    const requested = (location.state as { from?: string } | null)?.from
    const fallback = pendingMatchCode ? `${pagePaths.matches}${location.search}` : `/${location.search}`
    const destination = requested?.startsWith('/') && !requested.startsWith('//') && !requested.startsWith('/login') ? requested : fallback
    return <Navigate to={destination} replace />
  }

  const saveUser = async (nextUser: User): Promise<void | string> => {
    if (accountMode) {
      const result = await auth.updateProfile({ name: nextUser.name, handle: nextUser.username, avatar: nextUser.avatar, position: nextUser.position || null, defaultMatchType: nextUser.defaultMatchType, defaultFootballFormat: nextUser.defaultFootballFormat })
      if (result.error) return result.error
      return
    }
    store.setUser(nextUser)
  }

  const logout = async () => {
    if (accountMode) {
      const result = await auth.signOut()
      if (result.error) throw new Error(result.error)
    }
    routerNavigate('/login', { replace: true })
  }

  if (!group) return <AuthSplash />

  const allScope = accountMode && isAllScope(group)
  const personalScope = accountMode && isPersonalScope(group)
  const allMemberships = new Set(remoteGroups.allMembers.map(member => `${member.groupId}:${member.userId}`))
  const scopeEntries = accountMode ? (allScope ? remoteStats.entries.filter(entry => entry.groupId && allMemberships.has(`${entry.groupId}:${entry.userId}`)) : remoteStats.entries) : getGroupEntries(store.entries, group.id)
  const groupEntries = accountMode ? scopeEntries.filter(entry => entry.userId === currentUser.id) : scopeEntries
  const globalEntries = [...new Map((accountMode ? profileHistory.seasonEntries : store.entries.filter(entry => entry.userId === currentUser.id)).map(entry => [entry.id, entry])).values()]
  const activeUserEntries = allScope ? globalEntries : groupEntries
  const homeEntries = allScope ? [...new Map([...scopeEntries, ...globalEntries.filter(entry => entry.scopeType === 'personal')].map(entry => [entry.id, entry])).values()] : groupEntries
  const allMatches = accountMode ? remoteMatches.matches : store.matches.filter(match => match.groupId === group.id)
  const groupMatches = accountMode ? allScope ? allMatches : personalScope ? allMatches.filter(match => !match.groupId) : allMatches.filter(match => match.groupId === group.id) : allMatches
  const groupMatchEvents = accountMode ? [] : store.matchEvents.filter(event => event.groupId === group.id)
  const totals = calculateUserTotals(activeUserEntries, accountMode ? false : group.seeded)
  const globalTotals = calculateUserTotals(globalEntries, false)
  const globalScoringStreakRecord = calculateScoringStreakRecord(globalEntries)
  const rankingMemberSource = allScope ? remoteGroups.allMembers : remoteGroups.members
  const uniqueRankingMembers = [...new Map(rankingMemberSource.map(member => [member.userId, member])).values()]
  const rankingUsers: User[] = accountMode && !isPersonalScope(group)
    ? uniqueRankingMembers.map(member => ({ ...currentUser, id: member.userId, name: member.name, username: member.handle, avatar: member.avatar || member.name.slice(0, 2).toUpperCase(), initials: member.avatar || member.name.slice(0, 2).toUpperCase() }))
    : [currentUser]
  if (!rankingUsers.some(user => user.id === currentUser.id)) rankingUsers.unshift(currentUser)
  for (const entry of scopeEntries) {
    if (!rankingUsers.some(user => user.id === entry.userId)) {
      const shortId = entry.userId.slice(0, 6).toUpperCase()
      rankingUsers.push({ ...currentUser, id: entry.userId, name: `Jugador ${shortId}`, username: `jugador_${shortId.toLowerCase()}`, avatar: 'J', initials: 'J' })
    }
  }
  const rankings: RankingPlayer[] = accountMode
    ? rankingUsers.flatMap(user => {
      const userEntries = scopeEntries.filter(entry => entry.userId === user.id)
      const built = allScope ? buildRankings(userEntries, user, false) : buildGroupRankings(userEntries, group.id, user, false)
      return built.map(player => ({ ...player, initials: user.avatar || player.initials, isCurrentUser: user.id === currentUser.id }))
    })
    : buildGroupRankings(store.entries, group.id, currentUser, group.seeded).map(player => player.isCurrentUser ? { ...player, initials: currentUser.avatar || player.initials } : player)
  const worldCup = calculatePersonalWorldCup(activeUserEntries)
  const globalWorldCup = calculatePersonalWorldCup(globalEntries)
  const localMemberPlayers = rankings.length ? rankings : [{ id: currentUser.id, name: currentUser.name, initials: currentUser.avatar, isCurrentUser: true }]
  const localMembers: GroupMemberView[] = localMemberPlayers.map((player, index) => ({ id: `mock-member-${player.id}`, groupId: group.id, userId: player.id, role: index === 0 ? 'owner' : 'member', joinedAt: '2026-06-17T00:00:00.000Z', name: player.name, handle: player.isCurrentUser ? currentUser.username : player.name.toLowerCase(), avatar: player.initials }))
  const userNames = Object.fromEntries(rankingUsers.map(user => [user.id, user.name]))
  const groupNames = Object.fromEntries(remoteGroups.groups.map(item => [item.id, item.name]))
  const playerGroupIds = remoteGroups.allMembers.reduce<Record<string, string[]>>((result, member) => {
    const current = result[member.userId] ?? []
    if (!current.includes(member.groupId)) result[member.userId] = [...current, member.groupId]
    return result
  }, {})
  const lookupMatch = accountMode ? async (value: string) => {
    return remoteMatches.lookupMatch(value)
  } : undefined
  const consumeMatchInvite = (matchId?: string) => {
    matchInviteIntentRepository.clear()
    setPendingMatchCode('')
    const search = new URLSearchParams(location.search)
    search.delete('match')
    search.delete('code')
    routerNavigate({ pathname: matchId ? `${pagePaths.matches}/${matchId}` : location.pathname, search: search.toString() ? `?${search}` : '' }, { replace: true })
  }
  const linkEntry = accountMode ? async (entryId: string, matchId: string, team: 'light' | 'dark', result?: 'win' | 'draw' | 'loss') => {
    const entry = [...profileHistory.entries, ...remoteStats.entries].find(item => item.id === entryId && item.userId === currentUser.id)
    const match = allMatches.find(item => item.id === matchId)
    if (!entry || !match || entry.matchId || (entry.groupId ?? '') !== match.groupId || isTeamFull(match, team, currentUser.id)) return false
    if (remoteMatches.entries.some(item => item.id !== entryId && item.userId === currentUser.id && item.matchId === matchId)) return false
    await remoteStats.updateEntry(entryId, { matchId, team, ...(result ? { result } : {}) })
    await profileHistory.reload()
    return true
  } : store.linkEntryToMatch

  const updateProfileHistoryEntry = async (id: string, values: Pick<StatEntry, 'result' | 'goals' | 'assists'>) => {
    if (!accountMode) return store.updateEntry(id, values)
    await remoteStats.updateEntry(id, values)
    await profileHistory.reload()
  }

  const deleteProfileHistoryEntry = async (id: string) => {
    if (!accountMode) return store.deleteEntry(id)
    await remoteStats.deleteEntry(id)
    await profileHistory.reload()
  }

  const saveQuickStats = async (values: Pick<StatEntry, 'result' | 'goals' | 'assists' | 'matchId' | 'team' | 'matchType' | 'footballFormat' | 'playedPosition'>, contextId: string): Promise<StatEntry> => {
    if (!accountMode) return store.addEntry(values, contextId)
    if (values.matchId) {
      const saved = await remoteMatches.saveStats(values.matchId, values)
      await Promise.all([profileHistory.reload(), remoteStats.reload()])
      return saved
    }
    const personalContextId = remoteGroups.personalScope?.id
    const scope = contextId === personalContextId
      ? { type: 'personal' as const, userId: currentUser.id }
      : remoteGroups.groups.some(item => item.id === contextId)
        ? { type: 'group' as const, userId: currentUser.id, groupId: contextId }
        : null
    if (!scope) throw new Error('Elegí un contexto válido para guardar la carga.')
    const created = await supabaseRepository.createStatEntry(scope, values)
    await Promise.all([remoteStats.reload(), profileHistory.reload()])
    return created
  }

  const pageContent = {
    home: <HomePage user={currentUser} group={group} entries={homeEntries} matches={groupMatches} matchEvents={groupMatchEvents} totals={totals} rankings={rankings} worldCup={worldCup} onNavigate={navigate} userNames={userNames} groupNames={groupNames} playerGroupIds={playerGroupIds} />,
    add: <AddStatsPage key={group.id} onSave={saveQuickStats} onNavigate={navigate} matches={accountMode ? allMatches : groupMatches} groups={accountMode ? remoteGroups.groups : store.groups} entries={accountMode ? scopeEntries : store.entries} user={currentUser} defaultContextId={accountMode ? remoteGroups.activeSharedGroup?.id ?? (personalScope ? remoteGroups.personalScope?.id ?? '' : '') : group.id} personalContextId={accountMode ? remoteGroups.personalScope?.id : undefined} />,
    matches: <MatchesPage group={group} user={currentUser} matches={matchRouteId ? allMatches : groupMatches} entries={accountMode ? remoteMatches.entries : groupEntries} initialMatchId={matchRouteId} initialInviteCode={pendingMatchCode} remoteMode={accountMode} loading={accountMode && remoteMatches.loading} loadError={accountMode ? remoteMatches.error : ''} creationGroups={accountMode ? remoteGroups.groups : []} onLookupMatch={lookupMatch} onInviteConsumed={consumeMatchInvite} onOpenMatch={matchId => routerNavigate(`${pagePaths.matches}/${matchId}`)} onCloseMatch={() => routerNavigate(pagePaths.matches, { replace: true })} onCreate={accountMode ? remoteMatches.createMatch : values => store.createMatch(values, group.id)} onJoinTeam={accountMode ? remoteMatches.joinTeam : store.joinMatchTeam} onParticipantTeam={accountMode ? remoteMatches.setParticipantTeam : store.setParticipantTeam} onLeave={accountMode ? remoteMatches.leaveMatch : store.leaveMatch} onScore={accountMode ? remoteMatches.saveScore : store.saveMatchScore} onMvp={accountMode ? remoteMatches.setMvp : store.setMatchMvp} onSaveComment={accountMode ? remoteMatches.saveComment : undefined} onDeleteComment={accountMode ? remoteMatches.deleteComment : undefined} onSaveStats={accountMode ? async (matchId, values) => { const saved = await remoteMatches.saveStats(matchId, values); await Promise.all([profileHistory.reload(), remoteStats.reload()]); return saved } : store.saveMatchEntry} onAddGuest={accountMode ? remoteMatches.addGuest : store.addGuest} onUpdateGuest={accountMode ? remoteMatches.updateGuest : store.updateGuest} onRemoveGuest={accountMode ? remoteMatches.removeGuest : store.removeGuest} onSaveGuestStats={accountMode ? remoteMatches.saveGuestStats : store.saveGuestStats} />,
    rankings: <RankingsPage group={group} players={rankings} sourceEntries={scopeEntries} sourceUsers={accountMode ? rankingUsers : [currentUser]} currentUserId={currentUser.id} />,
    profile: <ProfilePage user={currentUser} group={group} entries={groupEntries} allEntries={accountMode ? [...profileHistory.entries, ...remoteStats.entries] : store.entries} matches={accountMode ? allMatches : groupMatches} groups={groups} totals={globalTotals} worldCup={worldCup} globalScoringStreakRecord={globalScoringStreakRecord} globalWorldCupsWon={globalWorldCup.worldCupsWon} theme={theme} onSaveUser={saveUser} onUpdateEntry={updateProfileHistoryEntry} onDeleteEntry={deleteProfileHistoryEntry} onLinkEntry={linkEntry} onTheme={setTheme} onLogout={logout} onOpenMatch={matchId => routerNavigate(`${pagePaths.matches}/${matchId}`)} accountMode={accountMode} statsError={accountMode ? remoteStats.error : ''} historyEntries={accountMode ? profileHistory.entries : store.entries.filter(entry => entry.userId === currentUser.id)} historyTotal={accountMode ? profileHistory.total : undefined} historyPage={accountMode ? profileHistory.page : undefined} historyPageSize={profileHistory.pageSize} historyLoading={accountMode && profileHistory.loading} historyError={accountMode ? profileHistory.error : ''} historyFilters={accountMode ? profileHistory.filters : undefined} onHistoryFiltersChange={accountMode ? profileHistory.setFilters : undefined} onHistoryPageChange={accountMode ? profileHistory.setPage : undefined} />,
    groups: <GroupsPage groups={accountMode ? remoteGroups.groups : groups} currentGroup={accountMode ? remoteGroups.activeSharedGroup : group} members={accountMode ? remoteGroups.members : localMembers} memberships={accountMode ? remoteGroups.allMembers : localMembers} currentUserId={accountMode ? auth.user!.id : currentUser.id} remoteMode={accountMode} loading={accountMode && remoteGroups.loading} membersLoading={accountMode && remoteGroups.membersLoading} loadError={accountMode ? groupInviteError || remoteGroups.error : ''} onSelectGroup={selectGroup} onCreateGroup={accountMode ? remoteGroups.createGroup : store.createGroup} onJoinGroup={accountMode ? remoteGroups.joinGroup : store.joinGroup} onUpdateGroup={accountMode ? remoteGroups.updateGroup : store.updateGroup} />,
  }

  const routedContent = <Routes>
    <Route path="/" element={pageContent.home} />
    <Route path="/cargar" element={pageContent.add} />
    <Route path="/partidos" element={pageContent.matches} />
    <Route path="/partidos/:matchId" element={pageContent.matches} />
    <Route path="/rankings" element={pageContent.rankings} />
    <Route path="/perfil" element={pageContent.profile} />
    <Route path="/grupos" element={pageContent.groups} />
    <Route path="*" element={<NotFoundPage onHome={() => navigate('home')} onMatches={() => navigate('matches')} />} />
  </Routes>

  return <AppShell page={activePage} user={currentUser} group={group} groups={groups} dark={dark} onTheme={() => setTheme(dark ? 'light' : 'dark')} onSelectGroup={selectGroup} onNavigate={navigate}>
    {activePage && accountMode && remoteStats.loading ? <div className="rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10">Cargando stats...</div> : <>{accountMode && remoteStats.error && activePage !== 'profile' && <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-500">{remoteStats.error}</div>}<Suspense fallback={<PageLoading />}>{routedContent}</Suspense></>}
  </AppShell>
}
