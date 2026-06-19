import { useCallback, useEffect, useState } from 'react'
import { supabaseRepository } from '../data/supabaseRepository'
import type { StatEntry } from '../types'

const PAGE_SIZE = 20

export function useSupabaseProfileHistory(userId: string | null) {
  const [pageState, setPageState] = useState<{ userId: string | null; page: number }>({ userId, page: 1 })
  const page = pageState.userId === userId ? pageState.page : 1
  const [entries, setEntries] = useState<StatEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!userId) {
      setEntries([])
      setTotal(0)
      setLoading(false)
      setError('')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await supabaseRepository.listUserStatEntries(userId, page, PAGE_SIZE)
      const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))
      if (page > totalPages) {
        setPageState({ userId, page: totalPages })
        return
      }
      setEntries(result.entries)
      setTotal(result.total)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos cargar tu historial.')
    } finally {
      setLoading(false)
    }
  }, [page, userId])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const setPage = (nextPage: number) => setPageState({ userId, page: nextPage })

  return { entries, total, page, pageSize: PAGE_SIZE, loading, error, setPage, reload: load }
}
