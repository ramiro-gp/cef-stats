import type { Group, RankingPlayer, StatEntry, StatFootballFormat, StatMatchType, User } from '../types'
import { isAllScope } from './scopes'
import { buildGroupRankings, buildRankings } from './stats'

export type MatchTypeFilter = 'all' | StatMatchType
export type FootballFormatFilter = 'all' | StatFootballFormat

export function filterRankingEntries(entries: StatEntry[], matchType: MatchTypeFilter, footballFormat: FootballFormatFilter): StatEntry[] {
  return entries.filter(entry => {
    const entryMatchType = entry.matchType ?? 'friendly'
    const entryFootballFormat = entry.footballFormat ?? 'F5'
    return (matchType === 'all' || entryMatchType === matchType) && (footballFormat === 'all' || entryFootballFormat === footballFormat)
  })
}

export function buildScopeRankings(entries: StatEntry[], users: User[], group: Group, currentUserId: string): RankingPlayer[] {
  return users.flatMap(user => {
    const userEntries = entries.filter(entry => entry.userId === user.id)
    const built = isAllScope(group) ? buildRankings(userEntries, user, false) : buildGroupRankings(userEntries, group.id, user, false)
    return built.map(player => ({ ...player, initials: user.avatar || player.initials, isCurrentUser: user.id === currentUserId }))
  })
}
