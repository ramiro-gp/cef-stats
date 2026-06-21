import { useCallback, useEffect, useRef, useState } from 'react'
import { supabaseRepository } from '../data/supabaseRepository'
import type { StatEntry } from '../types'
import { DEFAULT_STAT_FILTERS, type StatFilters } from '../utils/statFilters'

const PAGE_SIZE = 20

export function useSupabaseProfileHistory(userId: string | null) {
  const [pageState, setPageState] = useState<{ userId: string | null; page: number }>({ userId, page: 1 })
  const [filters, setFilters] = useState<StatFilters>(DEFAULT_STAT_FILTERS)
  const requestId = useRef(0)
  const page = pageState.userId === userId ? pageState.page : 1
  const [entries, setEntries] = useState<StatEntry[]>([])
  const [seasonEntries, setSeasonEntries] = useState<StatEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const currentRequestId = ++requestId.current
    if (!userId) {
      setEntries([])
      setSeasonEntries([])
      setTotal(0)
      setLoading(false)
      setError('')
      return
    }
    setLoading(true)
    setError('')
    try {
      const [result, loadedSeasonEntries] = await Promise.all([
        supabaseRepository.listUserStatEntries(userId, page, PAGE_SIZE, filters),
        supabaseRepository.listUserSeasonEntries(userId),
      ])
      const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))
      if (currentRequestId !== requestId.current) return
      if (page > totalPages) {
        setPageState({ userId, page: totalPages })
        return
      }
      setEntries(result.entries)
      setSeasonEntries(loadedSeasonEntries)
      setTotal(result.total)
    } catch (reason) {
      if (currentRequestId === requestId.current) setError(reason instanceof Error ? reason.message : 'No pudimos cargar tu historial.')
    } finally {
      if (currentRequestId === requestId.current) setLoading(false)
    }
  }, [filters, page, userId])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const setPage = (nextPage: number) => setPageState({ userId, page: nextPage })
  const updateFilters = (nextFilters: StatFilters) => { setFilters(nextFilters); setPageState({ userId, page: 1 }) }

  return { entries, seasonEntries, total, page, pageSize: PAGE_SIZE, loading, error, filters, setFilters: updateFilters, setPage, reload: load }
}
