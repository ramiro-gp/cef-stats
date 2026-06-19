import type { Match, MatchFormat, MatchParticipant, MatchResult, MatchScore, MatchTeam, StatEntry, User } from '../types'

const BASE_TEAM_SIZE: Record<MatchFormat, number> = { F5: 5, F6: 6, F7: 7, F8: 8, F11: 11 }

function identityInitials(name?: string, handle?: string): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? []
  if (words.length) return words.slice(0, 2).map(word => word[0]).join('').toUpperCase()
  const cleanHandle = handle?.trim().replace(/^@/, '')
  return cleanHandle?.[0]?.toUpperCase() ?? 'J'
}

export function getParticipantName(participant: MatchParticipant, user: User): string {
  if (participant.type === 'guest') return participant.guestName?.trim() || 'Invitado'
  if (participant.userId === user.id) return user.name.trim() || user.username.replace(/^@/, '') || 'Jugador'
  return participant.displayName?.trim() || participant.handle?.replace(/^@/, '') || 'Jugador'
}

export function getParticipantHandle(participant: MatchParticipant, user: User): string | undefined {
  if (participant.type === 'guest') return participant.guestHandle?.trim().replace(/^@/, '') || undefined
  const handle = participant.userId === user.id ? user.username : participant.handle
  return handle?.trim().replace(/^@/, '') || undefined
}

export function getParticipantAvatar(participant: MatchParticipant, user: User): string {
  if (participant.type === 'guest') return participant.avatar?.trim() || 'IN'
  const avatar = participant.userId === user.id ? user.avatar : participant.avatar
  return avatar?.trim() || identityInitials(getParticipantName(participant, user), getParticipantHandle(participant, user))
}

export interface MatchMvpSummary {
  status: 'none' | 'winner' | 'tie'
  leaderParticipantIds: string[]
  counts: Record<string, number>
  totalVotes: number
  myVoteParticipantId?: string
}

export function getMatchMvpSummary(match: Match, userId?: string): MatchMvpSummary {
  if (!match.mvpVotes) {
    return {
      status: match.mvpParticipantId ? 'winner' : 'none',
      leaderParticipantIds: match.mvpParticipantId ? [match.mvpParticipantId] : [],
      counts: {},
      totalVotes: 0,
    }
  }

  const counts = match.mvpVotes.reduce<Record<string, number>>((result, vote) => {
    result[vote.participantId] = (result[vote.participantId] ?? 0) + 1
    return result
  }, {})
  const highest = Math.max(0, ...Object.values(counts))
  const leaderParticipantIds = highest ? Object.keys(counts).filter(participantId => counts[participantId] === highest) : []
  return {
    status: leaderParticipantIds.length > 1 ? 'tie' : leaderParticipantIds.length === 1 ? 'winner' : 'none',
    leaderParticipantIds,
    counts,
    totalVotes: match.mvpVotes.length,
    myVoteParticipantId: userId ? match.mvpVotes.find(vote => vote.voterUserId === userId)?.participantId : undefined,
  }
}

export function getMaxTeamSize(format: MatchFormat = 'F5'): number {
  return BASE_TEAM_SIZE[format] + 2
}

export function isTeamFull(match: Match, team: MatchTeam, userId?: string): boolean {
  if (userId && match.participants.some(participant => participant.userId === userId && participant.team === team)) return false
  return match.participants.filter(participant => participant.team === team).length >= getMaxTeamSize(match.format ?? 'F5')
}

export function extractInviteCode(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    const queryCode = url.searchParams.get('match') ?? url.searchParams.get('code')
    if (queryCode) return queryCode.trim().toUpperCase()
    const pathMatch = url.pathname.match(/\/match\/([^/?#]+)/i)
    return pathMatch ? decodeURIComponent(pathMatch[1]).trim().toUpperCase() : ''
  } catch {
    const queryMatch = trimmed.match(/[?&](?:match|code)=([^&#]+)/i)
    if (queryMatch) return decodeURIComponent(queryMatch[1]).trim().toUpperCase()
    const pathMatch = trimmed.match(/(?:^|\/)match\/([^/?#]+)/i)
    if (pathMatch) return decodeURIComponent(pathMatch[1]).trim().toUpperCase()
    if (trimmed.includes('/') || trimmed.startsWith('?')) return ''
    return trimmed.toUpperCase()
  }
}

export function isValidMatchCode(value: string): boolean {
  return /^CEF-[A-Z0-9]{5}$/.test(extractInviteCode(value))
}

export function findMatchByCode(matches: Match[], value: string): Match | null {
  if (!isValidMatchCode(value)) return null
  const code = extractInviteCode(value)
  return matches.find(match => match.inviteCode.toUpperCase() === code) ?? null
}

export function getMatchResultForTeam(score?: MatchScore, team?: MatchTeam): MatchResult | null {
  if (!score || !team) return null
  if (score.light === score.dark) return 'draw'
  const teamWon = team === 'light' ? score.light > score.dark : score.dark > score.light
  return teamWon ? 'win' : 'loss'
}

export function getLoadedGoalsByTeam(entries: StatEntry[], team: MatchTeam): number {
  return entries.filter(entry => entry.team === team).reduce((sum, entry) => sum + entry.goals, 0)
}

export function getMatchStatTotals(entries: StatEntry[], match: Match): Record<MatchTeam, { goals: number; assists: number }> {
  const totals = { light: { goals: 0, assists: 0 }, dark: { goals: 0, assists: 0 } }
  entries.filter(entry => entry.matchId === match.id && entry.team).forEach(entry => {
    totals[entry.team!].goals += entry.goals
    totals[entry.team!].assists += entry.assists
  })
  match.guestStats.forEach(stats => {
    const team = match.participants.find(participant => participant.id === stats.participantId)?.team
    if (!team) return
    totals[team].goals += stats.goals
    totals[team].assists += stats.assists
  })
  return totals
}
