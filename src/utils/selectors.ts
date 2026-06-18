import type { AppState, Group, GroupMember, Match, MatchParticipant, StatEntry } from '../types'

export function getActiveGroup(state: Pick<AppState, 'groups' | 'activeGroupId'>, fallback: Group): Group {
  return state.groups.find(group => group.id === state.activeGroupId) ?? state.groups[0] ?? fallback
}

export function getGroupMembers(members: GroupMember[], groupId: string): GroupMember[] {
  return members.filter(member => member.groupId === groupId)
}

export function getMatchParticipants(match: Match, team?: MatchParticipant['team']): MatchParticipant[] {
  return team ? match.participants.filter(participant => participant.team === team) : match.participants
}

export function getGroupEntries(entries: StatEntry[], groupId: string): StatEntry[] {
  return entries.filter(entry => entry.groupId === groupId)
}

export function getMatchEntries(entries: StatEntry[], matchId: string): StatEntry[] {
  return entries.filter(entry => entry.matchId === matchId)
}

export function hasDuplicateMatchEntry(entries: StatEntry[], userId: string, matchId: string, excludeEntryId?: string): boolean {
  return entries.some(entry => entry.id !== excludeEntryId && entry.userId === userId && entry.matchId === matchId)
}
