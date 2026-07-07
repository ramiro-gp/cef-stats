import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabaseMatchRepository } from '../data/supabaseMatchRepository'
import { supabaseRepository } from '../data/supabaseRepository'
import type { Match, MatchFormat, MatchScore, MatchTeam, StatEntry, StatMatchType } from '../types'
import { getMatchMvpSummary } from '../utils/matches'

export function useSupabaseMatches(userId: string | null, groupId: string | null) {
  const scopeKey = userId ?? 'signed-out'
  const [matchState, setMatchState] = useState<{ scopeKey: string; matches: Match[] }>({ scopeKey, matches: [] })
  const matches = useMemo(() => matchState.scopeKey === scopeKey ? matchState.matches : [], [matchState, scopeKey])
  const [entries, setEntries] = useState<StatEntry[]>([])
  const requestId = useRef(0)
  const [loading, setLoading] = useState(Boolean(userId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const upsert = useCallback((match: Match) => {
    setMatchState(current => {
      const currentMatches = current.scopeKey === scopeKey ? current.matches : []
      return { scopeKey, matches: currentMatches.some(item => item.id === match.id) ? currentMatches.map(item => item.id === match.id ? match : item) : [match, ...currentMatches] }
    })
    return match
  }, [scopeKey])

  const removeMatchFromState = useCallback((matchId: string) => {
    setMatchState(current => ({ ...current, matches: current.matches.filter(match => match.id !== matchId) }))
    setEntries(current => current.filter(entry => entry.matchId !== matchId))
  }, [])

  const load = useCallback(async () => {
    const currentRequestId = ++requestId.current
    if (!userId) {
      setMatchState({ scopeKey, matches: [] })
      setEntries([])
      setLoading(false)
      setError('')
      return
    }
    setLoading(true)
    setError('')
    setMatchState({ scopeKey, matches: [] })
    setEntries([])
    try {
      const loaded = await supabaseMatchRepository.listMyMatches()
      const loadedEntries = await supabaseRepository.listMatchStatEntries(loaded.map(match => match.id))
      if (requestId.current === currentRequestId) {
        setMatchState({ scopeKey, matches: loaded })
        setEntries(loadedEntries)
      }
    } catch (reason) {
      if (requestId.current === currentRequestId) setError(reason instanceof Error ? reason.message : 'No pudimos cargar los partidos.')
    } finally {
      if (requestId.current === currentRequestId) setLoading(false)
    }
  }, [scopeKey, userId])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const mutate = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setSaving(true)
    setError('')
    try {
      return await operation()
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'No pudimos actualizar el partido.'
      setError(message)
      throw reason instanceof Error ? reason : new Error(message)
    } finally {
      setSaving(false)
    }
  }, [])

  const createMatch = useCallback((values: { title: string; scheduledAt: string; format?: MatchFormat; matchType?: StatMatchType; groupId?: string | null; lightTeamName: string; darkTeamName: string }) => {
    const targetGroupId = values.groupId === undefined ? groupId : values.groupId
    return mutate(async () => upsert(await supabaseMatchRepository.createMatch(targetGroupId, values)))
  }, [groupId, mutate, upsert])

  const updateMatch = useCallback((matchId: string, values: { title: string; scheduledAt: string; format: MatchFormat; matchType: StatMatchType; lightTeamName: string; darkTeamName: string }) => mutate(async () => upsert(await supabaseMatchRepository.updateMatch(matchId, values))), [mutate, upsert])

  const lookupMatch = useCallback((value: string) => mutate(async () => {
    const found = await supabaseMatchRepository.attendByInvite(value)
    if (!found) return null
    const attended = upsert(found)
    const loadedEntries = await supabaseRepository.listMatchStatEntries([attended.id])
    setEntries(current => [...current.filter(entry => entry.matchId !== attended.id), ...loadedEntries])
    return attended
  }), [mutate, upsert])

  const joinTeam = useCallback((matchId: string, team: MatchTeam) => mutate(async () => {
    const match = matches.find(item => item.id === matchId)
    if (!match) throw new Error('No encontramos el partido para unirte.')
    const joined = upsert(await supabaseMatchRepository.joinTeam(match.inviteCode, team))
    const loadedEntries = await supabaseRepository.listMatchStatEntries([joined.id])
    setEntries(current => [...current.filter(entry => entry.matchId !== joined.id), ...loadedEntries])
    return joined
  }), [matches, mutate, upsert])

  const attendMatch = useCallback((matchId: string) => mutate(async () => {
    const attended = upsert(await supabaseMatchRepository.attendMatch(matchId))
    const loadedEntries = await supabaseRepository.listMatchStatEntries([attended.id])
    setEntries(current => [...current.filter(entry => entry.matchId !== attended.id), ...loadedEntries])
    return attended
  }), [mutate, upsert])

  const omitMatch = useCallback((matchId: string) => mutate(async () => upsert(await supabaseMatchRepository.omitMatch(matchId))), [mutate, upsert])

  const setParticipantTeam = useCallback((matchId: string, participantId: string, team: MatchTeam) => mutate(async () => upsert(await supabaseMatchRepository.setParticipantTeam(matchId, participantId, team))), [mutate, upsert])

  const leaveMatch = useCallback((matchId: string) => mutate(async () => {
    if (!userId) throw new Error('Necesitás iniciar sesión.')
    await supabaseMatchRepository.leaveMatch(matchId, userId)
    setMatchState(current => ({ ...current, matches: current.matches.flatMap(match => {
      if (match.id !== matchId) return match
      if (match.createdByUserId !== userId) return []
      const leavingParticipant = match.participants.find(participant => participant.userId === userId)
      const participants = match.participants.filter(participant => participant.userId !== userId)
      if (participants.length === 0) return []
      const nextMatch = { ...match, participants, mvpVotes: match.mvpVotes?.filter(vote => vote.voterUserId !== userId && vote.participantId !== leavingParticipant?.id), comments: match.comments?.filter(comment => comment.userId !== userId) }
      const summary = getMatchMvpSummary(nextMatch)
      const mvpParticipantId = summary.status === 'winner' ? summary.leaderParticipantIds[0] : undefined
      return [{ ...nextMatch, mvpParticipantId, mvpUserId: participants.find(participant => participant.id === mvpParticipantId)?.userId }]
    }) }))
    setEntries(current => current.filter(entry => entry.matchId !== matchId))
  }), [mutate, userId])

  const saveScore = useCallback((matchId: string, score: MatchScore) => mutate(async () => upsert(await supabaseMatchRepository.saveScore(matchId, score))), [mutate, upsert])

  const setMvp = useCallback((matchId: string, participantId: string) => mutate(async () => {
    if (!userId) throw new Error('Necesitás iniciar sesión.')
    const participant = matches.find(item => item.id === matchId)?.participants.find(item => item.id === participantId)
    if (!participant) throw new Error('No encontramos al participante elegido como MVP.')
    return upsert(await supabaseMatchRepository.setMvp(matchId, participant, userId))
  }), [matches, mutate, upsert, userId])

  const saveComment = useCallback((matchId: string, body: string) => mutate(async () => {
    if (!userId) throw new Error('Necesitás iniciar sesión.')
    return upsert(await supabaseMatchRepository.saveComment(matchId, userId, body))
  }), [mutate, upsert, userId])

  const deleteComment = useCallback((matchId: string) => mutate(async () => {
    if (!userId) throw new Error('Necesitás iniciar sesión.')
    return upsert(await supabaseMatchRepository.deleteComment(matchId, userId))
  }), [mutate, upsert, userId])

  const addGuest = useCallback((matchId: string, values: { name: string; avatar?: string; team: MatchTeam }) => mutate(async () => upsert(await supabaseMatchRepository.addGuest(matchId, values))), [mutate, upsert])
  const updateGuest = useCallback((matchId: string, guestId: string, values: { name: string; avatar?: string }) => mutate(async () => upsert(await supabaseMatchRepository.updateGuest(matchId, guestId, values))), [mutate, upsert])
  const removeGuest = useCallback((matchId: string, guestId: string) => mutate(async () => {
    const match = await supabaseMatchRepository.removeGuest(matchId, guestId)
    if (!match) {
      removeMatchFromState(matchId)
      return null
    }
    return upsert(match)
  }), [mutate, removeMatchFromState, upsert])
  const saveGuestStats = useCallback((matchId: string, guestId: string, goals: number, assists: number) => mutate(async () => upsert(await supabaseMatchRepository.saveGuestStats(matchId, guestId, goals, assists))), [mutate, upsert])

  const saveStats = useCallback((matchId: string, values: Pick<StatEntry, 'result' | 'goals' | 'assists' | 'team' | 'matchType' | 'footballFormat' | 'playedPosition'>) => mutate(async () => {
    if (!userId) throw new Error('Necesitás iniciar sesión.')
    const match = matches.find(item => item.id === matchId)
    if (!match) throw new Error('No encontramos el partido para guardar tus números.')
    const existing = entries.find(entry => entry.matchId === matchId && entry.userId === userId)
    const saved = existing
      ? await supabaseRepository.updateStatEntry(existing.id, userId, values)
      : await supabaseRepository.createStatEntry(match.groupId ? { type: 'group', userId, groupId: match.groupId } : { type: 'personal', userId }, { ...values, matchType: values.matchType ?? match.matchType ?? 'friendly', footballFormat: values.footballFormat ?? match.format ?? 'F5', matchId })
    setEntries(current => existing ? current.map(entry => entry.id === saved.id ? saved : entry) : [saved, ...current])
    return saved
  }), [entries, matches, mutate, userId])

  return { matches, entries, loading, saving, error, createMatch, updateMatch, lookupMatch, joinTeam, attendMatch, omitMatch, setParticipantTeam, leaveMatch, saveScore, setMvp, saveComment, deleteComment, addGuest, updateGuest, removeGuest, saveGuestStats, saveStats, reload: load }
}
