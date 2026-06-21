import { baseCurrentPlayer, mockRankingPlayers } from '../data/seedData'
import type { MatchResult, RankingPlayer, RankingTab, StatEntry, User } from '../types'
import { calculatePersonalWorldCup } from './worldCup'

export interface UserTotals {
  goals: number
  assists: number
  matches: number
  wins: number
  draws: number
  losses: number
  average: number
  winRate: number
  scoringStreak: number
}

const countResult = (entries: StatEntry[], result: MatchResult) => entries.filter(entry => entry.result === result).length

export function calculateUserTotals(entries: StatEntry[], includeSeedData = true): UserTotals {
  const base = includeSeedData ? baseCurrentPlayer : { goals: 0, assists: 0, matches: 0, wins: 0, draws: 0, losses: 0 }
  const goals = base.goals + entries.reduce((sum, entry) => sum + entry.goals, 0)
  const assists = base.assists + entries.reduce((sum, entry) => sum + entry.assists, 0)
  const matches = base.matches + entries.length
  const wins = base.wins + countResult(entries, 'win')
  const draws = base.draws + countResult(entries, 'draw')
  const losses = base.losses + countResult(entries, 'loss')
  const scoringStreakIndex = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).findIndex(entry => entry.goals === 0)

  return {
    goals, assists, matches, wins, draws, losses,
    average: matches ? goals / matches : 0,
    winRate: matches ? Math.round((wins / matches) * 100) : 0,
    scoringStreak: scoringStreakIndex === -1 ? entries.length : scoringStreakIndex,
  }
}

export function calculateScoringStreakRecord(entries: StatEntry[]): number {
  let current = 0
  let record = 0
  for (const entry of [...entries].sort((a, b) => (a.playedAt ?? a.createdAt).localeCompare(b.playedAt ?? b.createdAt) || a.id.localeCompare(b.id))) {
    current = entry.goals > 0 ? current + 1 : 0
    record = Math.max(record, current)
  }
  return record
}

export function buildRankings(entries: StatEntry[], user: User, includeSeedData = true): RankingPlayer[] {
  if (!includeSeedData && entries.length === 0) return []
  const totals = calculateUserTotals(entries, includeSeedData)
  const worldCup = calculatePersonalWorldCup(entries)
  const currentPlayer: RankingPlayer = {
    ...(includeSeedData ? baseCurrentPlayer : { id: user.id, accent: 'bg-emerald-500' }),
    ...totals,
    id: user.id,
    name: user.name,
    initials: user.avatar || user.initials,
    accent: 'bg-emerald-500',
    worldCupsWon: worldCup.worldCupsWon,
    worldCupStage: worldCup.currentStage,
    isCurrentUser: true,
  }
  return [currentPlayer, ...(includeSeedData ? mockRankingPlayers : [])]
}

export function buildGroupRankings(entries: StatEntry[], groupId: string, user: User, includeSeedData = true): RankingPlayer[] {
  return buildRankings(entries.filter(entry => entry.groupId === groupId), user, includeSeedData)
}

export function sortRankings(players: RankingPlayer[], tab: RankingTab): RankingPlayer[] {
  if (tab === 'worldCup') return [...players].sort((a, b) => b.worldCupsWon - a.worldCupsWon || b.goals - a.goals)
  return [...players].sort((a, b) => b[tab] - a[tab])
}

export function getGoalPosition(players: RankingPlayer[], userId: string): number {
  return [...players].sort((a, b) => b.goals - a.goals).findIndex(player => player.id === userId) + 1
}
