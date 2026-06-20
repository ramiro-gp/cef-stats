import type { Group, RankingPlayer, StatEntry, User } from '../types'
import { isAllScope } from './scopes'
import { filterStatEntries, type FootballFormatFilter, type MatchTypeFilter } from './statFilters'
import { buildGroupRankings, buildRankings } from './stats'

export type { FootballFormatFilter, MatchTypeFilter } from './statFilters'

export function filterRankingEntries(entries: StatEntry[], matchType: MatchTypeFilter, footballFormat: FootballFormatFilter): StatEntry[] {
  return filterStatEntries(entries, { matchType, footballFormat })
}

export function buildScopeRankings(entries: StatEntry[], users: User[], group: Group, currentUserId: string): RankingPlayer[] {
  return users.flatMap(user => {
    const userEntries = entries.filter(entry => entry.userId === user.id)
    const built = isAllScope(group) ? buildRankings(userEntries, user, false) : buildGroupRankings(userEntries, group.id, user, false)
    return built.map(player => ({ ...player, initials: user.avatar || player.initials, isCurrentUser: user.id === currentUserId }))
  })
}
