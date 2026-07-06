import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabaseRepository } from '../data/supabaseRepository'
import type { Group, GroupMemberView } from '../types'
import { createAllScope, createPersonalScope } from '../utils/scopes'

export function useSupabaseGroups(userId: string | null) {
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string | null>(() => supabaseRepository.getPersistedActiveGroupId())
  const [members, setMembers] = useState<GroupMemberView[]>([])
  const [allMembers, setAllMembers] = useState<GroupMemberView[]>([])
  const [loading, setLoading] = useState(Boolean(userId))
  const [membersLoading, setMembersLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null)
  const personalScope = useMemo(() => userId ? createPersonalScope(userId) : null, [userId])
  const allScope = useMemo(() => userId ? createAllScope(userId) : null, [userId])
  const scopes = useMemo(() => [...(allScope ? [allScope] : []), ...(personalScope ? [personalScope] : []), ...groups], [allScope, groups, personalScope])
  const activeScope = useMemo(() => scopes.find(group => group.id === activeGroupId) ?? personalScope ?? allScope ?? groups[0] ?? null, [activeGroupId, allScope, groups, personalScope, scopes])
  const activeSharedGroup = useMemo(() => groups.find(group => group.id === activeScope?.id) ?? null, [activeScope?.id, groups])

  const selectGroup = useCallback((group: Group) => {
    setActiveGroupId(group.id)
    supabaseRepository.persistActiveGroupId(group.id)
  }, [])

  const loadGroups = useCallback(async () => {
    if (!userId) {
      setGroups([])
      setAllMembers([])
      setLoadedUserId(null)
      setLoading(false)
      return []
    }
    setLoading(true)
    setError('')
    try {
      const loaded = await supabaseRepository.getGroups(userId)
      setGroups(loaded)
      setAllMembers(await supabaseRepository.getMembersForGroups(loaded.map(group => group.id)))
      const persisted = supabaseRepository.getPersistedActiveGroupId()
      const allId = `all:${userId}`
      const personalId = `personal:${userId}`
      const persistedIsValid = persisted === allId || persisted === personalId || Boolean(persisted && loaded.some(group => group.id === persisted))
      const nextActiveId = persistedIsValid && persisted ? persisted : personalId
      setActiveGroupId(nextActiveId)
      supabaseRepository.persistActiveGroupId(nextActiveId)
      return loaded
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'No pudimos cargar tus grupos.'
      setError(message)
      return []
    } finally {
      setLoadedUserId(userId)
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

  const createGroup = useCallback(async (name: string, emoji = '⚽') => {
    const created = await supabaseRepository.createGroup(name, emoji)
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

  const updateGroup = useCallback(async (id: string, values: Partial<Pick<Group, 'name' | 'emoji' | 'defaultMatchType' | 'defaultFootballFormat'>>) => {
    if (!values.name) return
    const updated = await supabaseRepository.updateGroup(id, { name: values.name, emoji: values.emoji ?? '⚽', defaultMatchType: values.defaultMatchType, defaultFootballFormat: values.defaultFootballFormat })
    setGroups(current => current.map(group => group.id === id ? updated : group))
  }, [])

  const kickMember = useCallback(async (groupId: string, targetUserId: string) => {
    await supabaseRepository.kickGroupMember(groupId, targetUserId)
    const loaded = await loadGroups()
    setMembers(await supabaseRepository.getMembers(groupId))
    setAllMembers(await supabaseRepository.getMembersForGroups(loaded.map(group => group.id)))
  }, [loadGroups])

  const deleteGroup = useCallback(async (groupId: string) => {
    await supabaseRepository.deleteGroup(groupId)
    await loadGroups()
  }, [loadGroups])

  return { groups, scopes, allScope, personalScope, activeScope, activeSharedGroup, members: activeSharedGroup ? members : [], allMembers, loading, ready: !userId || loadedUserId === userId, membersLoading: activeSharedGroup ? membersLoading : false, error, selectGroup, createGroup, joinGroup, updateGroup, kickMember, deleteGroup, reload: loadGroups }
}
