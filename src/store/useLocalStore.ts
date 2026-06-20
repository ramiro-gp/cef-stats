import { useCallback, useMemo, useState } from 'react'
import { availableGroups, defaultGroup, defaultUser } from '../data/seedData'
import type { AppState, Group, GroupMember, Match, MatchEvent, MatchFormat, MatchParticipant, MatchResult, MatchScore, MatchTeam, StatEntry, User } from '../types'
import { createUniqueGroupCode, normalizeGroupCode } from '../utils/groups'
import { createId, createMatchInviteCode, createStatEntryId } from '../utils/ids'
import { normalizeHandle } from '../utils/identity'
import { isTeamFull } from '../utils/matches'
import { getActiveGroup, hasDuplicateMatchEntry } from '../utils/selectors'

function initialGroupMembers(): GroupMember[] {
  return availableGroups.map((group, index) => ({ id: `member-${group.id}-${defaultUser.id}`, groupId: group.id, userId: defaultUser.id, role: index === 0 ? 'owner' : 'member', joinedAt: '2026-06-17T00:00:00.000Z' }))
}

function freshInitialState(): AppState {
  return {
    user: { ...defaultUser },
    groups: availableGroups.map(group => ({ ...group, spicyMode: true })),
    groupMembers: initialGroupMembers(),
    activeGroupId: defaultGroup.id,
    entries: [],
    matches: [],
    matchEvents: [],
  }
}

export function useLocalStore() {
  const [state, setState] = useState<AppState>(freshInitialState)
  const group = getActiveGroup(state, defaultGroup)

  const addEntry = useCallback((values: Pick<StatEntry, 'result' | 'goals' | 'assists' | 'matchId' | 'team' | 'matchType' | 'footballFormat' | 'playedPosition'>, groupIdOverride?: string) => {
    const createdAt = new Date().toISOString()
    const linkedValues = values
    const linkedMatch = linkedValues.matchId ? state.matches.find(match => match.id === linkedValues.matchId) : undefined
    const entry: StatEntry = {
      ...linkedValues,
      id: createStatEntryId(createdAt, state.entries.length),
      userId: state.user.id,
      groupId: linkedMatch?.groupId ?? groupIdOverride ?? state.activeGroupId,
      createdAt,
    }
    setState(current => {
      if (!linkedMatch || !linkedValues.team) return { ...current, entries: [...current.entries, entry] }
      if (isTeamFull(linkedMatch, linkedValues.team, current.user.id)) return current
      const hasParticipant = linkedMatch.participants.some(participant => participant.userId === current.user.id)
      const participant: MatchParticipant = { id: createId('participant'), matchId: linkedMatch.id, userId: current.user.id, type: 'registered_user', team: linkedValues.team, createdAt }
      const event: MatchEvent = { id: createId('event'), groupId: linkedMatch.groupId, matchId: linkedMatch.id, type: 'stats_linked', userId: current.user.id, team: linkedValues.team, createdAt }
      return { ...current, activeGroupId: linkedMatch.groupId, entries: [...current.entries, entry], matches: current.matches.map(match => match.id === linkedMatch.id ? { ...match, participants: hasParticipant ? match.participants.map(existing => existing.userId === current.user.id ? { ...existing, team: linkedValues.team! } : existing) : [...match.participants, participant], updatedAt: createdAt } : match), matchEvents: [...current.matchEvents, event] }
    })
    return entry
  }, [state.activeGroupId, state.entries.length, state.matches, state.user.id])

  const updateEntry = useCallback((id: string, values: Pick<StatEntry, 'result' | 'goals' | 'assists'>) => {
    setState(current => ({ ...current, entries: current.entries.map(entry => entry.id === id ? { ...entry, ...values } : entry) }))
  }, [])

  const deleteEntry = useCallback((id: string) => {
    setState(current => ({ ...current, entries: current.entries.filter(entry => entry.id !== id) }))
  }, [])

  const setUser = useCallback((user: User) => setState(current => ({ ...current, user: { ...user, username: normalizeHandle(user.username) } })), [])
  const setGroup = useCallback((nextGroup: Group) => setState(current => ({ ...current, activeGroupId: nextGroup.id })), [])

  const createGroup = useCallback((name: string, emoji = '⚽') => {
    let created!: Group
    setState(current => {
      const createdAt = new Date().toISOString()
      created = { id: createId('group'), name: name.trim(), code: createUniqueGroupCode(name, current.groups), memberCount: 1, gamesCount: 0, emoji, spicyMode: true, seeded: false }
      const membership: GroupMember = { id: createId('member'), groupId: created.id, userId: current.user.id, role: 'owner', joinedAt: createdAt }
      return { ...current, groups: [...current.groups, created], groupMembers: [...current.groupMembers, membership], activeGroupId: created.id }
    })
    return created
  }, [])

  const joinGroup = useCallback((rawCode: string) => {
    const code = normalizeGroupCode(rawCode)
    let joined!: Group
    setState(current => {
      const existing = current.groups.find(item => item.code.toUpperCase() === code)
      if (existing) {
        joined = existing
        const alreadyMember = current.groupMembers.some(member => member.groupId === existing.id && member.userId === current.user.id)
        const membership: GroupMember = { id: createId('member'), groupId: existing.id, userId: current.user.id, role: 'member', joinedAt: new Date().toISOString() }
        return { ...current, groupMembers: alreadyMember ? current.groupMembers : [...current.groupMembers, membership], activeGroupId: existing.id }
      }
      joined = { id: createId('group'), name: `Grupo ${code}`, code, memberCount: 1, gamesCount: 0, emoji: '⚽', spicyMode: true, seeded: false }
      const membership: GroupMember = { id: createId('member'), groupId: joined.id, userId: current.user.id, role: 'member', joinedAt: new Date().toISOString() }
      return { ...current, groups: [...current.groups, joined], groupMembers: [...current.groupMembers, membership], activeGroupId: joined.id }
    })
    return joined
  }, [])

  const updateGroup = useCallback((id: string, values: Partial<Pick<Group, 'name' | 'emoji' | 'spicyMode'>>) => {
    setState(current => ({ ...current, groups: current.groups.map(item => item.id === id ? { ...item, ...values, spicyMode: true } : item) }))
  }, [])

  const createMatch = useCallback((values: { title: string; scheduledAt: string; format?: MatchFormat; lightTeamName: string; darkTeamName: string }, groupIdOverride?: string) => {
    const createdAt = new Date().toISOString()
    const id = createId('match')
    const groupId = groupIdOverride ?? state.activeGroupId
    const match: Match = {
      id,
      groupId,
      title: values.title.trim() || 'Partido de hoy',
      lightTeamName: values.lightTeamName || 'CLARO',
      darkTeamName: values.darkTeamName || 'OSCURO',
      scheduledAt: values.scheduledAt,
      format: values.format,
      createdByUserId: state.user.id,
      inviteCode: createMatchInviteCode(state.matches.map(existing => existing.inviteCode)),
      status: 'open',
      participants: [],
      guestStats: [],
      createdAt,
      updatedAt: createdAt,
    }
    const event: MatchEvent = { id: createId('event'), groupId, matchId: id, type: 'created', userId: state.user.id, createdAt }
    setState(current => ({ ...current, matches: [...current.matches, match], matchEvents: [...current.matchEvents, event] }))
    return match
  }, [state.activeGroupId, state.matches, state.user.id])

  const joinMatchTeam = useCallback((matchId: string, team: MatchTeam) => {
    const createdAt = new Date().toISOString()
    setState(current => {
      const match = current.matches.find(item => item.id === matchId)
      if (!match || match.participants.some(participant => participant.userId === current.user.id && participant.team === team) || isTeamFull(match, team, current.user.id)) return current
      const participants: MatchParticipant[] = [...match.participants.filter(participant => participant.userId !== current.user.id), { id: createId('participant'), matchId, userId: current.user.id, type: 'registered_user', team, createdAt }]
      const event: MatchEvent = { id: createId('event'), groupId: match.groupId, matchId, type: 'joined_team', userId: current.user.id, team, createdAt }
      return { ...current, matches: current.matches.map(item => item.id === matchId ? { ...item, participants, updatedAt: createdAt } : item), matchEvents: [...current.matchEvents, event] }
    })
  }, [])

  const setParticipantTeam = useCallback((matchId: string, participantId: string, team: MatchTeam) => {
    const updatedAt = new Date().toISOString()
    setState(current => ({ ...current, matches: current.matches.map(match => match.id === matchId ? { ...match, participants: match.participants.map(participant => participant.id === participantId ? { ...participant, team } : participant), updatedAt } : match), entries: current.entries.map(entry => entry.matchId === matchId && current.matches.find(match => match.id === matchId)?.participants.find(participant => participant.id === participantId)?.userId === entry.userId ? { ...entry, team } : entry) }))
  }, [])

  const leaveMatch = useCallback((matchId: string) => {
    const createdAt = new Date().toISOString()
    setState(current => {
      const match = current.matches.find(item => item.id === matchId)
      if (!match || !match.participants.some(participant => participant.userId === current.user.id)) return current
      const event: MatchEvent = { id: createId('event'), groupId: match.groupId, matchId, type: 'left_match', userId: current.user.id, createdAt }
      const leavingParticipant = match.participants.find(participant => participant.userId === current.user.id)
      return { ...current, matches: current.matches.map(item => item.id === matchId ? { ...item, participants: item.participants.filter(participant => participant.userId !== current.user.id), mvpUserId: item.mvpUserId === current.user.id ? undefined : item.mvpUserId, mvpParticipantId: item.mvpParticipantId === leavingParticipant?.id ? undefined : item.mvpParticipantId, updatedAt: createdAt } : item), matchEvents: [...current.matchEvents, event] }
    })
  }, [])

  const saveMatchScore = useCallback((matchId: string, score: MatchScore) => {
    const createdAt = new Date().toISOString()
    setState(current => {
      const match = current.matches.find(item => item.id === matchId)
      if (!match) return current
      const event: MatchEvent = { id: createId('event'), groupId: match.groupId, matchId, type: 'score_saved', score, createdAt }
      return { ...current, matches: current.matches.map(item => item.id === matchId ? { ...item, score, status: 'played', updatedAt: createdAt } : item), matchEvents: [...current.matchEvents, event] }
    })
  }, [])

  const setMatchMvp = useCallback((matchId: string, participantId: string) => {
    const createdAt = new Date().toISOString()
    setState(current => {
      const match = current.matches.find(item => item.id === matchId)
      const participant = match?.participants.find(item => item.id === participantId)
      if (!match || !participant) return current
      const event: MatchEvent = { id: createId('event'), groupId: match.groupId, matchId, type: 'mvp_selected', userId: participant.userId, participantId, guestName: participant.guestName, createdAt }
      return { ...current, matches: current.matches.map(item => item.id === matchId ? { ...item, mvpUserId: participant.userId, mvpParticipantId: participantId, updatedAt: createdAt } : item), matchEvents: [...current.matchEvents, event] }
    })
  }, [])

  const saveMatchEntry = useCallback((matchId: string, values: Pick<StatEntry, 'result' | 'goals' | 'assists' | 'team'>) => {
    const createdAt = new Date().toISOString()
    setState(current => {
      const existing = current.entries.find(entry => entry.matchId === matchId && entry.userId === current.user.id)
      if (existing) return { ...current, entries: current.entries.map(entry => entry.id === existing.id ? { ...entry, ...values } : entry) }
      const match = current.matches.find(item => item.id === matchId)
      if (!match) return current
      const entry: StatEntry = { ...values, id: createStatEntryId(createdAt, current.entries.length), userId: current.user.id, groupId: match.groupId, matchId, createdAt }
      return { ...current, entries: [...current.entries, entry] }
    })
  }, [])

  const addGuest = useCallback((matchId: string, values: { name: string; avatar?: string; team: MatchTeam }) => {
    const createdAt = new Date().toISOString()
    setState(current => {
      const match = current.matches.find(item => item.id === matchId)
      if (!match || isTeamFull(match, values.team)) return current
      const participant: MatchParticipant = { id: createId('participant'), matchId, guestName: values.name.trim(), avatar: values.avatar?.trim() || 'IN', type: 'guest', team: values.team, createdAt }
      const event: MatchEvent = { id: createId('event'), groupId: match.groupId, matchId, type: 'guest_added', participantId: participant.id, guestName: participant.guestName, team: values.team, createdAt }
      return { ...current, matches: current.matches.map(item => item.id === matchId ? { ...item, participants: [...item.participants, participant], updatedAt: createdAt } : item), matchEvents: [...current.matchEvents, event] }
    })
  }, [])

  const updateGuest = useCallback((matchId: string, participantId: string, values: { name: string; avatar?: string }) => {
    const updatedAt = new Date().toISOString()
    setState(current => ({ ...current, matches: current.matches.map(match => match.id === matchId ? { ...match, participants: match.participants.map(participant => participant.id === participantId && participant.type === 'guest' ? { ...participant, guestName: values.name.trim(), avatar: values.avatar?.trim() || participant.avatar } : participant), updatedAt } : match) }))
  }, [])

  const removeGuest = useCallback((matchId: string, participantId: string) => {
    const createdAt = new Date().toISOString()
    setState(current => {
      const match = current.matches.find(item => item.id === matchId)
      const guest = match?.participants.find(participant => participant.id === participantId && participant.type === 'guest')
      if (!match || !guest) return current
      const event: MatchEvent = { id: createId('event'), groupId: match.groupId, matchId, type: 'guest_removed', participantId, guestName: guest.guestName, createdAt }
      return { ...current, matches: current.matches.map(item => item.id === matchId ? { ...item, participants: item.participants.filter(participant => participant.id !== participantId), guestStats: item.guestStats.filter(stats => stats.participantId !== participantId), mvpParticipantId: item.mvpParticipantId === participantId ? undefined : item.mvpParticipantId, updatedAt: createdAt } : item), matchEvents: [...current.matchEvents, event] }
    })
  }, [])

  const saveGuestStats = useCallback((matchId: string, participantId: string, goals: number, assists: number) => {
    const createdAt = new Date().toISOString()
    setState(current => {
      const match = current.matches.find(item => item.id === matchId)
      const guest = match?.participants.find(participant => participant.id === participantId && participant.type === 'guest')
      if (!match || !guest) return current
      const exists = match.guestStats.some(stats => stats.participantId === participantId)
      const guestStats = exists ? match.guestStats.map(stats => stats.participantId === participantId ? { ...stats, goals, assists, updatedAt: createdAt } : stats) : [...match.guestStats, { participantId, goals, assists, updatedAt: createdAt }]
      const event: MatchEvent = { id: createId('event'), groupId: match.groupId, matchId, type: 'guest_stats', participantId, guestName: guest.guestName, goals, assists, createdAt }
      return { ...current, matches: current.matches.map(item => item.id === matchId ? { ...item, guestStats, updatedAt: createdAt } : item), matchEvents: [...current.matchEvents, event] }
    })
  }, [])

  const linkEntryToMatch = useCallback((entryId: string, matchId: string, team: MatchTeam, result?: MatchResult) => {
    const createdAt = new Date().toISOString()
    const entry = state.entries.find(item => item.id === entryId)
    const match = state.matches.find(item => item.id === matchId)
    if (!entry || !match || entry.matchId || isTeamFull(match, team, entry.userId) || hasDuplicateMatchEntry(state.entries, entry.userId, matchId, entryId)) return false
    setState(current => {
      const hasParticipant = match.participants.some(participant => participant.userId === current.user.id)
      const participant: MatchParticipant = { id: createId('participant'), matchId, userId: current.user.id, type: 'registered_user', team, createdAt }
      const event: MatchEvent = { id: createId('event'), groupId: match.groupId, matchId, type: 'stats_linked', userId: current.user.id, team, createdAt }
      return {
        ...current,
        activeGroupId: match.groupId,
        entries: current.entries.map(item => item.id === entryId ? { ...item, groupId: match.groupId, matchId, team, result: result ?? item.result } : item),
        matches: current.matches.map(item => item.id === matchId ? { ...item, participants: hasParticipant ? item.participants.map(existing => existing.userId === current.user.id ? { ...existing, team } : existing) : [...item.participants, participant], updatedAt: createdAt } : item),
        matchEvents: [...current.matchEvents, event],
      }
    })
    return true
  }, [state.entries, state.matches])

  return useMemo(() => ({ ...state, group, addEntry, updateEntry, deleteEntry, setUser, setGroup, createGroup, joinGroup, updateGroup, createMatch, joinMatchTeam, setParticipantTeam, leaveMatch, saveMatchScore, setMatchMvp, saveMatchEntry, addGuest, updateGuest, removeGuest, saveGuestStats, linkEntryToMatch }), [state, group, addEntry, updateEntry, deleteEntry, setUser, setGroup, createGroup, joinGroup, updateGroup, createMatch, joinMatchTeam, setParticipantTeam, leaveMatch, saveMatchScore, setMatchMvp, saveMatchEntry, addGuest, updateGuest, removeGuest, saveGuestStats, linkEntryToMatch])
}

export type AddStatEntry = (values: Pick<StatEntry, 'result' | 'goals' | 'assists' | 'matchId' | 'team' | 'matchType' | 'footballFormat' | 'playedPosition'>) => StatEntry | Promise<StatEntry>
