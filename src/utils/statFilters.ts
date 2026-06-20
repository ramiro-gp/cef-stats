import type { StatEntry, StatFootballFormat, StatMatchType } from '../types'

export type MatchTypeFilter = 'all' | StatMatchType
export type FootballFormatFilter = 'all' | StatFootballFormat

export interface StatFilters {
  matchType: MatchTypeFilter
  footballFormat: FootballFormatFilter
}

export const DEFAULT_STAT_FILTERS: StatFilters = { matchType: 'all', footballFormat: 'all' }
export const MATCH_TYPE_FILTER_OPTIONS: { value: MatchTypeFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'friendly', label: 'Amistoso' },
  { value: 'tournament', label: 'Torneo' },
]
export const FOOTBALL_FORMAT_FILTER_OPTIONS: { value: FootballFormatFilter; label: string }[] = ['all', 'F5', 'F6', 'F7', 'F8', 'F11'].map(value => ({ value: value as FootballFormatFilter, label: value === 'all' ? 'Todos' : value }))

export function filterStatEntries(entries: StatEntry[], filters: StatFilters): StatEntry[] {
  return entries.filter(entry => {
    const matchType = entry.matchType ?? 'friendly'
    const footballFormat = entry.footballFormat ?? 'F5'
    return (filters.matchType === 'all' || matchType === filters.matchType)
      && (filters.footballFormat === 'all' || footballFormat === filters.footballFormat)
  })
}

export function matchTypeFilterLabel(value: MatchTypeFilter): string {
  return MATCH_TYPE_FILTER_OPTIONS.find(option => option.value === value)?.label ?? 'Todos'
}

export function footballFormatFilterLabel(value: FootballFormatFilter): string {
  return value === 'all' ? 'Todos los formatos' : value
}
