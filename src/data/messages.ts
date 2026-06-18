import type { Group, Match, RankingPlayer, StatEntry, User } from '../types'
import type { UserTotals } from '../utils/stats'

export const FUNNY_BANNER_FREQUENCY_PERCENT = 5

export const rareFunnyMessages = [
  'La pelota pidió cambio después de esa definición.',
  'Hay olor a prime. Nadie quiere decir de quién.',
  'El grupo solicita VAR para revisar semejante partidazo.',
  'Hoy se duerme con la tabla de goleadores abierta.',
  'La estadística no miente, pero sabe provocar.',
]

export function getRareFunnyMessage(entryNumber: number): string | null {
  if (entryNumber === 0 || entryNumber % 9 !== 0) return null
  return rareFunnyMessages[Math.floor(entryNumber / 9 - 1) % rareFunnyMessages.length]
}

interface BannerFunnyContext {
  group: Group
  players: RankingPlayer[]
  user: User
  totals: UserTotals
  matches: Match[]
  entries: StatEntry[]
  entryCount: number
}

function stableHash(value: string): number {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function getRareBannerFunnyMessage({ group, players, user, totals, matches, entries, entryCount }: BannerFunnyContext): string | null {
  const latestMatch = [...matches].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  const seed = `${group.id}:${entryCount}:${latestMatch?.id ?? 'no-match'}:${latestMatch?.updatedAt ?? 'no-update'}`
  const hash = stableHash(seed)
  if (hash % 100 >= FUNNY_BANNER_FREQUENCY_PERCENT) return null

  const candidates: string[] = []

  if (latestMatch?.score && Math.abs(latestMatch.score.light - latestMatch.score.dark) >= 2) {
    const lightWon = latestMatch.score.light > latestMatch.score.dark
    if (latestMatch.score.light !== latestMatch.score.dark) {
      const winningTeam = lightWon ? 'claro' : 'oscuro'
      const losingTeam = lightWon ? 'oscuro' : 'claro'
      const winningScore = lightWon ? latestMatch.score.light : latestMatch.score.dark
      const losingScore = lightWon ? latestMatch.score.dark : latestMatch.score.light
      candidates.push(`El equipo ${winningTeam} le rompió el orto ${winningScore}-${losingScore} al equipo ${losingTeam}.`)
    }
  }

  const agent007 = players.find(player => player.matches >= 7 && player.goals === 0 && player.assists === 0)
  if (agent007) candidates.push(`A ${agent007.name} le dicen Agente 007: 0 goles, 0 asistencias, 7 partidos jugados.`)

  const selfish = players.find(player => player.matches >= 4 && player.assists <= 1)
  if (selfish) candidates.push(`${selfish.name} no la pasa ni con una orden judicial.`)

  const hatTrick = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).find(entry => entry.goals >= 3)
  if (hatTrick) candidates.push(`El pelotudo de ${user.name} metió 3 goles y se llevó la pelota.`)

  if (totals.scoringStreak >= 3 || totals.average >= 1.5) {
    candidates.push(`${user.name} está en su prime... por ahora.`)
    candidates.push(`Los botines de ${user.name} farmean aura 🔥`)
  }

  const groupPlayer = players[hash % Math.max(1, players.length)]
  candidates.push(`La cancha se inclina cuando el gordo de ${groupPlayer?.name ?? user.name} se cae.`)
  candidates.push('Bonchita mal.')

  return candidates[(hash >>> 8) % candidates.length]
}
