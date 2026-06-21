import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabaseRepository, type StatEntryInput, type StatEntryUpdateInput, type StatScope } from '../data/supabaseRepository'
import type { Group, StatEntry } from '../types'
import { isAllScope, isPersonalScope } from '../utils/scopes'

export function useSupabaseStats(userId: string | null, activeScope: Group | null, groupIds: string[] = []) {
  const [entryState, setEntryState] = useState<{ scopeKey: string; entries: StatEntry[] }>({ scopeKey: 'none', entries: [] })
  const [loadingScopeKey, setLoadingScopeKey] = useState<string | null>(userId ? 'initial' : null)
  const [saving, setSaving] = useState(false)
  const [errorState, setErrorState] = useState<{ scopeKey: string; message: string }>({ scopeKey: 'none', message: '' })
  const requestId = useRef(0)
  const scope = useMemo<StatScope | null>(() => {
    if (!userId || !activeScope) return null
    if (isPersonalScope(activeScope)) return { type: 'personal', userId }
    if (isAllScope(activeScope)) return { type: 'all', userId, groupIds }
    return { type: 'group', userId, groupId: activeScope.id }
  }, [activeScope, groupIds, userId])
  const scopeKey = scope ? `${scope.type}:${scope.type === 'group' ? scope.groupId : scope.type === 'all' ? scope.groupIds.join(',') : scope.userId}` : 'none'
  const entries = entryState.scopeKey === scopeKey ? entryState.entries : []
  const loading = loadingScopeKey === scopeKey || loadingScopeKey === 'initial'
  const error = errorState.scopeKey === scopeKey ? errorState.message : ''

  const load = useCallback(async () => {
    const requestedScopeKey = scopeKey
    const currentRequestId = ++requestId.current
    if (!scope) {
      setEntryState({ scopeKey: requestedScopeKey, entries: [] })
      setLoadingScopeKey(null)
      return
    }
    setLoadingScopeKey(requestedScopeKey)
    setErrorState({ scopeKey: requestedScopeKey, message: '' })
    setEntryState({ scopeKey: requestedScopeKey, entries: [] })
    try {
      const loaded = await supabaseRepository.listStatEntries(scope)
      if (requestId.current === currentRequestId) setEntryState({ scopeKey: requestedScopeKey, entries: loaded })
    } catch (reason) {
      if (requestId.current === currentRequestId) setErrorState({ scopeKey: requestedScopeKey, message: reason instanceof Error ? reason.message : 'No pudimos cargar las stats.' })
    } finally {
      if (requestId.current === currentRequestId) setLoadingScopeKey(null)
    }
  }, [scope, scopeKey])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const createEntry = useCallback(async (input: StatEntryInput) => {
    if (!scope) throw new Error('No hay un scope activo para guardar stats.')
    const mutationScopeKey = scopeKey
    setSaving(true)
    setErrorState({ scopeKey: mutationScopeKey, message: '' })
    try {
      const created = await supabaseRepository.createStatEntry(scope, input)
      setEntryState(current => current.scopeKey === mutationScopeKey ? { ...current, entries: [created, ...current.entries] } : current)
      return created
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'No pudimos guardar las stats.'
      setErrorState({ scopeKey: mutationScopeKey, message })
      throw reason instanceof Error ? reason : new Error(message)
    } finally {
      setSaving(false)
    }
  }, [scope, scopeKey])

  const updateEntry = useCallback(async (id: string, input: StatEntryUpdateInput) => {
    const mutationScopeKey = scopeKey
    setSaving(true)
    setErrorState({ scopeKey: mutationScopeKey, message: '' })
    try {
      if (!userId) throw new Error('Necesitás iniciar sesión para editar stats.')
      const updated = await supabaseRepository.updateStatEntry(id, userId, input)
      setEntryState(current => current.scopeKey === mutationScopeKey ? { ...current, entries: current.entries.map(entry => entry.id === id ? updated : entry) } : current)
      return updated
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'No pudimos actualizar la carga.'
      setErrorState({ scopeKey: mutationScopeKey, message })
      throw reason instanceof Error ? reason : new Error(message)
    } finally {
      setSaving(false)
    }
  }, [scopeKey, userId])

  const deleteEntry = useCallback(async (id: string) => {
    const mutationScopeKey = scopeKey
    setSaving(true)
    setErrorState({ scopeKey: mutationScopeKey, message: '' })
    try {
      if (!userId) throw new Error('Necesitás iniciar sesión para borrar stats.')
      await supabaseRepository.deleteStatEntry(id, userId)
      setEntryState(current => current.scopeKey === mutationScopeKey ? { ...current, entries: current.entries.filter(entry => entry.id !== id) } : current)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'No pudimos borrar la carga.'
      setErrorState({ scopeKey: mutationScopeKey, message })
      throw reason instanceof Error ? reason : new Error(message)
    } finally {
      setSaving(false)
    }
  }, [scopeKey, userId])

  return { entries, loading, saving, error, createEntry, updateEntry, deleteEntry, reload: load }
}
