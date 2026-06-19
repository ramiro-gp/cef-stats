import type { StatEntry } from '../types'

export function formatStatContext(entry: Pick<StatEntry, 'matchType' | 'footballFormat' | 'playedPosition'>): string {
  const matchType = entry.matchType === 'tournament' ? 'Torneo' : 'Amistoso'
  const footballFormat = entry.footballFormat ?? 'F5'
  return [matchType, footballFormat, entry.playedPosition].filter(Boolean).join(' · ')
}
