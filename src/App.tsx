import { useEffect, useMemo, useRef, useState } from 'react'
import { AppShell } from './components/AppShell'
import { useLocalStore } from './store/useLocalStore'
import { AddStatsPage } from './pages/AddStatsPage'
import { GroupsPage } from './pages/GroupsPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { ProfilePage } from './pages/ProfilePage'
import { RankingsPage } from './pages/RankingsPage'
import { MatchesPage } from './pages/MatchesPage'
import type { AccessMode, AuthProfile, GroupMemberView, Page, RankingPlayer, User } from './types'
import { buildGroupRankings, calculateUserTotals } from './utils/stats'
import { calculatePersonalWorldCup } from './utils/worldCup'
import { useTheme } from './hooks/useTheme'
import { getGroupEntries } from './utils/selectors'
import { useAuth } from './hooks/useAuth'
import { useSupabaseGroups } from './hooks/useSupabaseGroups'
import { useSupabaseStats } from './hooks/useSupabaseStats'
import { isPersonalScope } from './utils/scopes'
import { extractGroupInviteCode } from './utils/groups'
import { groupInviteIntentRepository } from './data/groupInviteIntentRepository'
import { extractInviteCode, isTeamFull } from './utils/matches'
import { useSupabaseMatches } from './hooks/useSupabaseMatches'
import { matchInviteIntentRepository } from './data/matchInviteIntentRepository'

function mergeAuthProfile(profile: AuthProfile, localUser: User): User {
  const initials = profile.name.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || localUser.initials
  const storedNickname = localUser.nickname.trim()
  const nickname = storedNickname && storedNickname.toLowerCase() !== 'rami' ? storedNickname : profile.name
  return { ...localUser, id: profile.id, name: profile.name, nickname, username: profile.handle, avatar: profile.avatar || initials, initials }
}

function initialGroupInviteCode(): string {
  if (typeof window === 'undefined') return groupInviteIntentRepository.load() ?? ''
  return extractGroupInviteCode(window.location.href) || groupInviteIntentRepository.load() || ''
}

function initialMatchInviteCode(): string {
  if (typeof window === 'undefined') return matchInviteIntentRepository.load() ?? ''
  return extractInviteCode(window.location.href) || matchInviteIntentRepository.load() || ''
}

export default function App() {
  const [accessMode, setAccessMode] = useState<AccessMode>('gateway')
  const [page, setPage] = useState<Page>('home')
  const [matchToOpen, setMatchToOpen] = useState<string | null>(null)
  const [pendingGroupCode, setPendingGroupCode] = useState(initialGroupInviteCode)
  const [groupInviteError, setGroupInviteError] = useState('')
  const [pendingMatchCode, setPendingMatchCode] = useState(initialMatchInviteCode)
  const attemptedGroupCode = useRef('')
  const store = useLocalStore()
  const auth = useAuth()
  const { theme, setTheme, dark } = useTheme()
  const accountMode = Boolean(auth.user && auth.profile)
  const effectiveAccessMode: AccessMode = accountMode ? 'account' : accessMode
  const remoteGroups = useSupabaseGroups(accountMode ? auth.user!.id : null)
  const { groups: sharedGroups, joinGroup: joinRemoteGroup, loading: groupsLoading, ready: groupsReady, selectGroup: selectRemoteGroup } = remoteGroups
  const currentUser = useMemo(() => auth.profile ? mergeAuthProfile(auth.profile, store.user) : store.user, [auth.profile, store.user])
  const groups = accountMode ? remoteGroups.scopes : store.groups
  const group = accountMode ? remoteGroups.activeScope : store.group
  const selectGroup = accountMode ? remoteGroups.selectGroup : store.setGroup
  const remoteStats = useSupabaseStats(accountMode ? auth.user!.id : null, accountMode ? remoteGroups.activeScope : null)
  const remoteMatchGroupId = accountMode && remoteGroups.activeScope && !isPersonalScope(remoteGroups.activeScope) ? remoteGroups.activeScope.id : null
  const remoteMatches = useSupabaseMatches(accountMode ? auth.user!.id : null, remoteMatchGroupId)

  const navigate = (next: Page) => {
    if (next !== 'matches') setMatchToOpen(null)
    setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    if (pendingGroupCode) groupInviteIntentRepository.save(pendingGroupCode)
  }, [pendingGroupCode])

  useEffect(() => {
    if (pendingMatchCode) matchInviteIntentRepository.save(pendingMatchCode)
  }, [pendingMatchCode])

  useEffect(() => {
    if (accountMode && pendingMatchCode) void Promise.resolve().then(() => setPage('matches'))
  }, [accountMode, pendingMatchCode])

  useEffect(() => {
    if (!accountMode || !groupsReady || groupsLoading || !pendingGroupCode || attemptedGroupCode.current === pendingGroupCode) return
    attemptedGroupCode.current = pendingGroupCode
    void Promise.resolve().then(async () => {
      const clearInviteLocation = () => {
        const url = new URL(window.location.href)
        url.searchParams.delete('joinGroup')
        url.searchParams.delete('groupCode')
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
      }
      try {
        setGroupInviteError('')
        const existing = sharedGroups.find(item => item.code.toUpperCase() === pendingGroupCode.toUpperCase())
        if (existing) selectRemoteGroup(existing)
        else await joinRemoteGroup(pendingGroupCode)
        groupInviteIntentRepository.clear()
        setPendingGroupCode('')
        clearInviteLocation()
        setPage('groups')
      } catch (reason) {
        groupInviteIntentRepository.clear()
        setPendingGroupCode('')
        clearInviteLocation()
        setGroupInviteError(reason instanceof Error ? reason.message : 'No pudimos unirnos al grupo de la invitación.')
        setPage('groups')
      }
    })
  }, [accountMode, groupsLoading, groupsReady, joinRemoteGroup, pendingGroupCode, selectRemoteGroup, sharedGroups])

  if (effectiveAccessMode === 'gateway') return <LoginPage configured={auth.configured} loading={auth.loading} authError={auth.error} pendingGroupCode={pendingGroupCode} pendingMatchCode={pendingMatchCode} onSignIn={auth.signIn} onSignUp={auth.signUp} />

  const saveUser = async (nextUser: User): Promise<void | string> => {
    if (accountMode) {
      const result = await auth.updateProfile({ name: nextUser.name, handle: nextUser.username, avatar: nextUser.avatar })
      if (result.error) return result.error
    }
    store.setUser(nextUser)
  }

  const logout = async () => {
    if (accountMode) await auth.signOut()
    setAccessMode('gateway')
    setPage('home')
    setMatchToOpen(null)
  }

  if (!group) return null

  const scopeEntries = accountMode ? remoteStats.entries : getGroupEntries(store.entries, group.id)
  const groupEntries = accountMode ? scopeEntries.filter(entry => entry.userId === currentUser.id) : scopeEntries
  const groupMatches = accountMode ? remoteMatches.matches : store.matches.filter(match => match.groupId === group.id)
  const groupMatchEvents = accountMode ? [] : store.matchEvents.filter(event => event.groupId === group.id)
  const totals = calculateUserTotals(groupEntries, group.seeded)
  const rankingUsers: User[] = accountMode && !isPersonalScope(group)
    ? remoteGroups.members.map(member => ({ ...currentUser, id: member.userId, name: member.name, username: member.handle, avatar: member.avatar || member.name.slice(0, 2).toUpperCase(), initials: member.avatar || member.name.slice(0, 2).toUpperCase() }))
    : [currentUser]
  if (!rankingUsers.some(user => user.id === currentUser.id)) rankingUsers.unshift(currentUser)
  for (const entry of scopeEntries) {
    if (!rankingUsers.some(user => user.id === entry.userId)) {
      const shortId = entry.userId.slice(0, 6).toUpperCase()
      rankingUsers.push({ ...currentUser, id: entry.userId, name: `Jugador ${shortId}`, username: `jugador_${shortId.toLowerCase()}`, avatar: 'J', initials: 'J' })
    }
  }
  const rankings: RankingPlayer[] = accountMode
    ? rankingUsers.flatMap(user => buildGroupRankings(scopeEntries.filter(entry => entry.userId === user.id), group.id, user, false))
    : buildGroupRankings(store.entries, group.id, currentUser, group.seeded)
  const worldCup = calculatePersonalWorldCup(groupEntries)
  const localMemberPlayers = rankings.length ? rankings : [{ id: currentUser.id, name: currentUser.name, initials: currentUser.avatar, isCurrentUser: true }]
  const localMembers: GroupMemberView[] = localMemberPlayers.map((player, index) => ({ id: `mock-member-${player.id}`, groupId: group.id, userId: player.id, role: index === 0 ? 'owner' : 'member', joinedAt: '2026-06-17T00:00:00.000Z', name: player.name, handle: player.isCurrentUser ? currentUser.username : player.name.toLowerCase(), avatar: player.initials }))
  const lookupMatch = accountMode ? async (value: string) => {
    const found = await remoteMatches.lookupMatch(value)
    if (found) {
      const hostGroup = remoteGroups.groups.find(item => item.id === found.groupId)
      if (hostGroup) remoteGroups.selectGroup(hostGroup)
    }
    return found
  } : undefined
  const consumeMatchInvite = () => {
    matchInviteIntentRepository.clear()
    setPendingMatchCode('')
    const url = new URL(window.location.href)
    url.searchParams.delete('match')
    url.searchParams.delete('code')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }
  const linkEntry = accountMode ? async (entryId: string, matchId: string, team: 'light' | 'dark', result?: 'win' | 'draw' | 'loss') => {
    const entry = remoteStats.entries.find(item => item.id === entryId && item.userId === currentUser.id)
    const match = groupMatches.find(item => item.id === matchId)
    if (!entry || !match || entry.matchId || isTeamFull(match, team, currentUser.id)) return false
    if (remoteStats.entries.some(item => item.id !== entryId && item.userId === currentUser.id && item.matchId === matchId)) return false
    await remoteStats.updateEntry(entryId, { matchId, team, ...(result ? { result } : {}) })
    return true
  } : store.linkEntryToMatch

  const content = {
    home: <HomePage user={currentUser} group={group} entries={groupEntries} matches={groupMatches} matchEvents={groupMatchEvents} totals={totals} rankings={rankings} worldCup={worldCup} onNavigate={navigate} />,
    add: <AddStatsPage onSave={values => accountMode ? remoteStats.createEntry(values) : store.addEntry(values, group.id)} onNavigate={navigate} matches={groupMatches} groups={groups} entries={accountMode ? scopeEntries : store.entries} user={currentUser} />,
    matches: <MatchesPage group={group} user={currentUser} matches={groupMatches} entries={accountMode ? scopeEntries : groupEntries} initialMatchId={matchToOpen} initialInviteCode={pendingMatchCode} remoteMode={accountMode} loading={accountMode && remoteMatches.loading} loadError={accountMode ? remoteMatches.error : ''} onLookupMatch={lookupMatch} onInviteConsumed={consumeMatchInvite} onCreate={accountMode ? remoteMatches.createMatch : values => store.createMatch(values, group.id)} onJoinTeam={accountMode ? remoteMatches.joinTeam : store.joinMatchTeam} onLeave={accountMode ? remoteMatches.leaveMatch : store.leaveMatch} onScore={accountMode ? remoteMatches.saveScore : store.saveMatchScore} onMvp={accountMode ? remoteMatches.setMvp : store.setMatchMvp} onSaveStats={accountMode ? async (matchId, values) => {
      const existing = remoteStats.entries.find(entry => entry.userId === currentUser.id && entry.matchId === matchId)
      if (existing) await remoteStats.updateEntry(existing.id, values)
      else await remoteStats.createEntry({ ...values, matchId })
    } : store.saveMatchEntry} onAddGuest={accountMode ? remoteMatches.addGuest : store.addGuest} onUpdateGuest={accountMode ? remoteMatches.updateGuest : store.updateGuest} onRemoveGuest={accountMode ? remoteMatches.removeGuest : store.removeGuest} onSaveGuestStats={accountMode ? remoteMatches.saveGuestStats : store.saveGuestStats} />,
    rankings: <RankingsPage group={group} players={rankings} />,
    profile: <ProfilePage user={currentUser} group={group} entries={groupEntries} allEntries={accountMode ? groupEntries : store.entries} matches={groupMatches} groups={groups} totals={totals} worldCup={worldCup} theme={theme} onSaveUser={saveUser} onUpdateEntry={accountMode ? async (id, values) => { await remoteStats.updateEntry(id, values) } : store.updateEntry} onDeleteEntry={accountMode ? remoteStats.deleteEntry : store.deleteEntry} onLinkEntry={linkEntry} onTheme={setTheme} onReset={store.resetData} onLogout={() => void logout()} onOpenMatch={matchId => { setMatchToOpen(matchId); navigate('matches') }} accountMode={accountMode} statsError={accountMode ? remoteStats.error : ''} />,
    groups: <GroupsPage groups={accountMode ? remoteGroups.groups : groups} currentGroup={accountMode ? remoteGroups.activeSharedGroup : group} members={accountMode ? remoteGroups.members : localMembers} currentUserId={accountMode ? auth.user!.id : currentUser.id} remoteMode={accountMode} loading={accountMode && remoteGroups.loading} membersLoading={accountMode && remoteGroups.membersLoading} loadError={accountMode ? groupInviteError || remoteGroups.error : ''} onSelectGroup={selectGroup} onCreateGroup={accountMode ? remoteGroups.createGroup : store.createGroup} onJoinGroup={accountMode ? remoteGroups.joinGroup : store.joinGroup} onUpdateGroup={accountMode ? remoteGroups.updateGroup : store.updateGroup} onExitAccount={accountMode ? () => void logout() : undefined} />,
  }[page]

  return <AppShell page={page} user={currentUser} group={group} groups={groups} dark={dark} onTheme={() => setTheme(dark ? 'light' : 'dark')} onSelectGroup={selectGroup} onNavigate={navigate}>
    {accountMode && remoteStats.loading ? <div className="rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-white/10">Cargando stats...</div> : <>{accountMode && remoteStats.error && page !== 'profile' && <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-500">{remoteStats.error}</div>}{content}</>}
  </AppShell>
}
