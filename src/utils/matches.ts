import type { Match, MatchFormat, MatchResult, MatchScore, MatchTeam, StatEntry } from '../types'

const BASE_TEAM_SIZE: Record<MatchFormat, number> = { F5: 5, F6: 6, F7: 7, F8: 8, F11: 11 }

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
    const queryCode = url.searchParams.get('code')
    if (queryCode) return queryCode.toUpperCase()
    return url.pathname.split('/').filter(Boolean).at(-1)?.toUpperCase() ?? ''
  } catch {
    return trimmed.replace(/^.*\/match\//i, '').split(/[?#/]/)[0].toUpperCase()
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
