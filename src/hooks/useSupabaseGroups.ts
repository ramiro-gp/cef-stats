import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabaseRepository } from '../data/supabaseRepository'
import type { Group, GroupMemberView } from '../types'
import { createPersonalScope } from '../utils/scopes'

export function useSupabaseGroups(userId: string | null) {
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string | null>(() => supabaseRepository.getPersistedActiveGroupId())
  const [members, setMembers] = useState<GroupMemberView[]>([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [membersLoading, setMembersLoading] = useState(false)
  const [error, setError] = useState('')
  const personalScope = useMemo(() => userId ? createPersonalScope(userId) : null, [userId])
  const scopes = useMemo(() => personalScope ? [personalScope, ...groups] : groups, [groups, personalScope])
  const activeScope = useMemo(() => scopes.find(group => group.id === activeGroupId) ?? personalScope ?? groups[0] ?? null, [activeGroupId, groups, personalScope, scopes])
  const activeSharedGroup = useMemo(() => groups.find(group => group.id === activeScope?.id) ?? null, [activeScope?.id, groups])

  const selectGroup = useCallback((group: Group) => {
    setActiveGroupId(group.id)
    supabaseRepository.persistActiveGroupId(group.id)
  }, [])

  const loadGroups = useCallback(async () => {
    if (!userId) {
      setGroups([])
      setLoading(false)
      return []
    }
    setLoading(true)
    setError('')
    try {
      const loaded = await supabaseRepository.getGroups(userId)
      setGroups(loaded)
      const persisted = supabaseRepository.getPersistedActiveGroupId()
      const personalId = `personal:${userId}`
      const persistedIsValid = persisted === personalId || Boolean(persisted && loaded.some(group => group.id === persisted))
      const nextActiveId = persistedIsValid && persisted ? persisted : personalId
      setActiveGroupId(nextActiveId)
      supabaseRepository.persistActiveGroupId(nextActiveId)
      return loaded
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'No pudimos cargar tus grupos.'
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { void Promise.resolve().then(loadGroups) }, [loadGroups])

  useEffect(() => {
    if (!activeSharedGroup?.id) return
    let active = true
    void Promise.resolve().then(async () => {
      if (active) setMembersLoading(true)
      try {
        const result = await supabaseRepository.getMembers(activeSharedGroup.id)
        if (active) setMembers(result)
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'No pudimos cargar los miembros.')
      } finally {
        if (active) setMembersLoading(false)
      }
    })
    return () => { active = false }
  }, [activeSharedGroup?.id])

  const createGroup = useCallback(async (name: string) => {
    const created = await supabaseRepository.createGroup(name)
    const loaded = await loadGroups()
    selectGroup(loaded.find(group => group.id === created.id) ?? created)
    return created
  }, [loadGroups, selectGroup])

  const joinGroup = useCallback(async (code: string) => {
    const groupId = await supabaseRepository.joinGroup(code)
    const loaded = await loadGroups()
    const joined = loaded.find(group => group.id === groupId)
    if (!joined) throw new Error('Te uniste, pero no pudimos cargar el grupo. Reintentá.')
    selectGroup(joined)
    return joined
  }, [loadGroups, selectGroup])

  const updateGroup = useCallback(async (id: string, values: Partial<Pick<Group, 'name'>>) => {
    if (!values.name) return
    const updated = await supabaseRepository.updateGroup(id, values.name)
    setGroups(current => current.map(group => group.id === id ? updated : group))
  }, [])

  return { groups, scopes, personalScope, activeScope, activeSharedGroup, members: activeSharedGroup ? members : [], loading, membersLoading: activeSharedGroup ? membersLoading : false, error, selectGroup, createGroup, joinGroup, updateGroup, reload: loadGroups }
}
