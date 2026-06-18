import { useEffect, useState } from 'react'
import type { Match } from '../types'
import { findMatchByCode } from '../utils/matches'

export type MatchLookupStatus = 'idle' | 'searching' | 'found' | 'not_found'

export function useMatchCodeLookup(matches: Match[]) {
  const [query, setQueryState] = useState('')
  const [match, setMatch] = useState<Match | null>(null)
  const [status, setStatus] = useState<MatchLookupStatus>('idle')

  const setQuery = (value: string) => {
    setQueryState(value)
    setMatch(null)
    setStatus(value.trim() ? 'searching' : 'idle')
  }

  useEffect(() => {
    if (!query.trim()) return
    const timer = window.setTimeout(() => {
      const found = findMatchByCode(matches, query)
      setMatch(found)
      setStatus(found ? 'found' : 'not_found')
    }, 280)
    return () => window.clearTimeout(timer)
  }, [matches, query])

  return { query, setQuery, match, status }
}
