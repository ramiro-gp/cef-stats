import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabaseMatchRepository } from '../data/supabaseMatchRepository'
import type { Match, MatchFormat, MatchScore, MatchTeam } from '../types'
import { getMatchMvpSummary } from '../utils/matches'

export function useSupabaseMatches(userId: string | null, groupId: string | null) {
  const scopeKey = groupId ?? 'invite-only'
  const [matchState, setMatchState] = useState<{ scopeKey: string; matches: Match[] }>({ scopeKey, matches: [] })
  const matches = useMemo(() => matchState.scopeKey === scopeKey ? matchState.matches : [], [matchState, scopeKey])
  const requestId = useRef(0)
  const [loading, setLoading] = useState(Boolean(userId && groupId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const upsert = useCallback((match: Match) => {
    setMatchState(current => {
      const currentMatches = current.scopeKey === scopeKey ? current.matches : []
      return { scopeKey, matches: currentMatches.some(item => item.id === match.id) ? currentMatches.map(item => item.id === match.id ? match : item) : [match, ...currentMatches] }
    })
    return match
  }, [scopeKey])

  const load = useCallback(async () => {
    const currentRequestId = ++requestId.current
    if (!userId || !groupId) {
      setMatchState({ scopeKey, matches: [] })
      setLoading(false)
      setError('')
      return
    }
    setLoading(true)
    setError('')
    setMatchState({ scopeKey, matches: [] })
    try {
      const loaded = await supabaseMatchRepository.listMatches(groupId)
      if (requestId.current === currentRequestId) setMatchState({ scopeKey, matches: loaded })
    } catch (reason) {
      if (requestId.current === currentRequestId) setError(reason instanceof Error ? reason.message : 'No pudimos cargar los partidos.')
    } finally {
      if (requestId.current === currentRequestId) setLoading(false)
    }
  }, [groupId, scopeKey, userId])

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

  const createMatch = useCallback((values: { title: string; scheduledAt: string; format?: MatchFormat }) => {
    if (!groupId) return Promise.reject(new Error('Elegí un grupo real para crear un partido.'))
    return mutate(async () => upsert(await supabaseMatchRepository.createMatch(groupId, values)))
  }, [groupId, mutate, upsert])

  const lookupMatch = useCallback((value: string) => mutate(async () => {
    const found = await supabaseMatchRepository.lookupByInvite(value)
    return found ? upsert(found) : null
  }), [mutate, upsert])

  const joinTeam = useCallback((matchId: string, team: MatchTeam) => mutate(async () => {
    const match = matches.find(item => item.id === matchId)
    if (!match) throw new Error('No encontramos el partido para unirte.')
    return upsert(await supabaseMatchRepository.joinTeam(match.inviteCode, team))
  }), [matches, mutate, upsert])

  const leaveMatch = useCallback((matchId: string) => mutate(async () => {
    if (!userId) throw new Error('Necesitás iniciar sesión.')
    await supabaseMatchRepository.leaveMatch(matchId, userId)
    setMatchState(current => ({ ...current, matches: current.matches.map(match => {
      if (match.id !== matchId) return match
      const leavingParticipant = match.participants.find(participant => participant.userId === userId)
      const participants = match.participants.filter(participant => participant.userId !== userId)
      const nextMatch = { ...match, participants, mvpVotes: match.mvpVotes?.filter(vote => vote.voterUserId !== userId && vote.participantId !== leavingParticipant?.id), comments: match.comments?.filter(comment => comment.userId !== userId) }
      const summary = getMatchMvpSummary(nextMatch)
      const mvpParticipantId = summary.status === 'winner' ? summary.leaderParticipantIds[0] : undefined
      return { ...nextMatch, mvpParticipantId, mvpUserId: participants.find(participant => participant.id === mvpParticipantId)?.userId }
    }) }))
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
  const removeGuest = useCallback((matchId: string, guestId: string) => mutate(async () => upsert(await supabaseMatchRepository.removeGuest(matchId, guestId))), [mutate, upsert])
  const saveGuestStats = useCallback((matchId: string, guestId: string, goals: number, assists: number) => mutate(async () => upsert(await supabaseMatchRepository.saveGuestStats(matchId, guestId, goals, assists))), [mutate, upsert])

  return { matches, loading, saving, error, createMatch, lookupMatch, joinTeam, leaveMatch, saveScore, setMvp, saveComment, deleteComment, addGuest, updateGuest, removeGuest, saveGuestStats, reload: load }
}
