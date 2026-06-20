import { supabase, SUPABASE_NOT_CONFIGURED_MESSAGE } from '../lib/supabaseClient'
import type { Match, MatchComment, MatchFormat, MatchMvpVote, MatchParticipant, MatchScore, MatchTeam } from '../types'
import { extractInviteCode, isValidMatchCode } from '../utils/matches'

interface MatchRow {
  id: string
  host_group_id: string | null
  title: string
  format: MatchFormat
  invite_code: string
  scheduled_at: string
  created_by: string
  status: Match['status']
  light_score: number
  dark_score: number
  mvp_user_id: string | null
  mvp_guest_id: string | null
  created_at: string
  updated_at: string
}

interface ParticipantRow {
  id: string
  match_id: string
  user_id: string
  team: MatchTeam | null
  created_at: string
}

interface GuestRow {
  id: string
  match_id: string
  name: string
  avatar: string | null
  team: MatchTeam
  goals: number
  assists: number
  created_at: string
  updated_at: string
}

interface ProfileRow {
  id: string
  name: string
  handle: string
  avatar: string | null
}

interface MvpVoteRow {
  id: string
  match_id: string
  voter_user_id: string
  voted_user_id: string | null
  voted_guest_id: string | null
  created_at: string
  updated_at: string
}

interface CommentRow {
  id: string
  match_id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string
}

interface MatchGroupLabelRow {
  match_id: string
  group_name: string
}

const matchColumns = 'id,host_group_id,title,format,invite_code,scheduled_at,created_by,status,light_score,dark_score,mvp_user_id,mvp_guest_id,created_at,updated_at'

function client() {
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE)
  return supabase
}

function matchError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('match_comments') && (normalized.includes('does not exist') || normalized.includes('schema cache'))) return 'Falta ejecutar supabase/patches/006_add_match_comments.sql.'
  if (normalized.includes('match_mvp_votes') && (normalized.includes('does not exist') || normalized.includes('schema cache'))) return 'Falta ejecutar supabase/patches/005_add_match_mvp_votes.sql.'
  if ((normalized.includes('list_my_matches') || normalized.includes('get_match_group_labels')) && (normalized.includes('does not exist') || normalized.includes('schema cache'))) return 'Falta ejecutar supabase/patches/007_allow_external_match_participants.sql.'
  if (normalized.includes('attend_match_by_invite') && (normalized.includes('does not exist') || normalized.includes('schema cache'))) return 'Falta ejecutar supabase/patches/008_allow_match_participants_without_team.sql.'
  if (normalized.includes('host_group_id') && normalized.includes('not-null')) return 'Falta ejecutar supabase/patches/012_allow_matches_without_group.sql.'
  if (normalized.includes('matches') && (normalized.includes('does not exist') || normalized.includes('schema cache'))) return 'Falta ejecutar supabase/patches/003_add_matches.sql.'
  if (normalized.includes('invalid match invite code')) return 'No encontramos un partido con ese código.'
  if (normalized.includes('group membership required')) return 'Necesitás pertenecer al grupo para crear un partido.'
  if (normalized.includes('mvp voter must participate')) return 'Tenés que participar del partido para votar al MVP.'
  if (normalized.includes('mvp user must participate') || normalized.includes('mvp guest must belong')) return 'Sólo podés votar a participantes de este partido.'
  if (normalized.includes('comment author must participate')) return 'Tenés que participar del partido para comentar.'
  if (normalized.includes('match_comments_body_check')) return 'El comentario debe tener entre 1 y 240 caracteres.'
  if (normalized.includes('permission') || normalized.includes('policy') || normalized.includes('row-level security')) return 'No tenés permisos para realizar esta acción en el partido.'
  if (normalized.includes('duplicate') || normalized.includes('stat_entries_user_match_unique')) return 'Ya existe una carga tuya vinculada a este partido.'
  return message
}

async function hydrateMatches(rows: MatchRow[]): Promise<Match[]> {
  if (!rows.length) return []
  const db = client()
  const matchIds = rows.map(row => row.id)
  const [participantsResult, guestsResult, votesResult, commentsResult, groupLabelsResult] = await Promise.all([
    db.from('match_participants').select('id,match_id,user_id,team,created_at').in('match_id', matchIds),
    db.from('match_guests').select('id,match_id,name,avatar,team,goals,assists,created_at,updated_at').in('match_id', matchIds),
    db.from('match_mvp_votes').select('id,match_id,voter_user_id,voted_user_id,voted_guest_id,created_at,updated_at').in('match_id', matchIds),
    db.from('match_comments').select('id,match_id,user_id,body,created_at,updated_at').in('match_id', matchIds),
    db.rpc('get_match_group_labels', { p_match_ids: matchIds }),
  ])
  if (participantsResult.error) throw new Error(matchError(participantsResult.error.message))
  if (guestsResult.error) throw new Error(matchError(guestsResult.error.message))
  if (votesResult.error) throw new Error(matchError(votesResult.error.message))
  if (commentsResult.error) throw new Error(matchError(commentsResult.error.message))
  if (groupLabelsResult.error) throw new Error(matchError(groupLabelsResult.error.message))
  const participantRows = participantsResult.data as ParticipantRow[]
  const guestRows = guestsResult.data as GuestRow[]
  const voteRows = votesResult.data as MvpVoteRow[]
  const commentRows = commentsResult.data as CommentRow[]
  const groupLabels = new Map((groupLabelsResult.data as MatchGroupLabelRow[]).map(item => [item.match_id, item.group_name]))
  const userIds = [...new Set(participantRows.map(row => row.user_id))]
  const profiles = new Map<string, ProfileRow>()
  if (userIds.length) {
    const profilesResult = await db.from('profiles').select('id,name,handle,avatar').in('id', userIds)
    if (profilesResult.error) throw new Error(matchError(profilesResult.error.message))
    for (const profile of profilesResult.data as ProfileRow[]) profiles.set(profile.id, profile)
  }

  return rows.map(row => {
    const registered: MatchParticipant[] = participantRows.filter(item => item.match_id === row.id).map(item => {
      const profile = profiles.get(item.user_id)
      return { id: item.id, matchId: item.match_id, userId: item.user_id, type: 'registered_user', team: item.team ?? undefined, displayName: profile?.name, handle: profile?.handle, avatar: profile?.avatar ?? undefined, createdAt: item.created_at }
    })
    const matchGuests = guestRows.filter(item => item.match_id === row.id)
    const guests: MatchParticipant[] = matchGuests.map(item => ({ id: item.id, matchId: item.match_id, guestName: item.name, avatar: item.avatar ?? undefined, type: 'guest', team: item.team, createdAt: item.created_at }))
    const mvpVotes: MatchMvpVote[] = voteRows.filter(item => item.match_id === row.id).flatMap(item => {
      const participantId = item.voted_guest_id ?? registered.find(participant => participant.userId === item.voted_user_id)?.id
      return participantId ? [{ id: item.id, matchId: item.match_id, voterUserId: item.voter_user_id, participantId, createdAt: item.created_at, updatedAt: item.updated_at }] : []
    })
    const voteCounts = mvpVotes.reduce<Record<string, number>>((counts, vote) => ({ ...counts, [vote.participantId]: (counts[vote.participantId] ?? 0) + 1 }), {})
    const highestVoteCount = Math.max(0, ...Object.values(voteCounts))
    const leaders = highestVoteCount ? Object.keys(voteCounts).filter(participantId => voteCounts[participantId] === highestVoteCount) : []
    const mvpParticipantId = leaders.length === 1 ? leaders[0] : undefined
    const mvpUserId = registered.find(item => item.id === mvpParticipantId)?.userId
    const comments: MatchComment[] = commentRows.filter(item => item.match_id === row.id).flatMap(item => {
      const profile = profiles.get(item.user_id)
      return profile ? [{ id: item.id, matchId: item.match_id, userId: item.user_id, body: item.body, authorName: profile.name, authorHandle: profile.handle, authorAvatar: profile.avatar ?? undefined, createdAt: item.created_at, updatedAt: item.updated_at }] : []
    })
    return {
      id: row.id,
      groupId: row.host_group_id ?? '',
      groupName: groupLabels.get(row.id),
      title: row.title,
      format: row.format,
      scheduledAt: row.scheduled_at,
      createdByUserId: row.created_by,
      inviteCode: row.invite_code,
      status: row.status,
      participants: [...registered, ...guests],
      score: row.status === 'played' || row.light_score > 0 || row.dark_score > 0 ? { light: row.light_score, dark: row.dark_score } : undefined,
      mvpUserId,
      mvpParticipantId,
      mvpVotes,
      comments,
      guestStats: matchGuests.map(item => ({ participantId: item.id, goals: item.goals, assists: item.assists, updatedAt: item.updated_at })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
}

async function oneMatch(row: MatchRow): Promise<Match> {
  const hydrated = await hydrateMatches([row])
  if (!hydrated[0]) throw new Error('No pudimos cargar el partido.')
  return hydrated[0]
}

export const supabaseMatchRepository = {
  async listGroupMatches(groupId: string): Promise<Match[]> {
    const result = await client().from('matches').select(matchColumns).eq('host_group_id', groupId).order('scheduled_at', { ascending: false })
    if (result.error) throw new Error(matchError(result.error.message))
    return hydrateMatches(result.data as MatchRow[])
  },

  async listMyMatches(): Promise<Match[]> {
    const result = await client().rpc('list_my_matches')
    if (result.error) throw new Error(matchError(result.error.message))
    return hydrateMatches((result.data ?? []) as MatchRow[])
  },

  async getMatch(matchId: string): Promise<Match> {
    const result = await client().from('matches').select(matchColumns).eq('id', matchId).single<MatchRow>()
    if (result.error) throw new Error(matchError(result.error.message))
    return oneMatch(result.data)
  },

  async lookupByInvite(value: string): Promise<Match | null> {
    if (!isValidMatchCode(value)) return null
    const code = extractInviteCode(value)
    if (!code) return null
    const result = await client().rpc('get_match_by_invite', { p_invite_code: code })
    if (result.error) throw new Error(matchError(result.error.message))
    const row = (Array.isArray(result.data) ? result.data[0] : result.data) as MatchRow | undefined
    return row ? oneMatch(row) : null
  },

  async attendByInvite(value: string): Promise<Match | null> {
    if (!isValidMatchCode(value)) return null
    const code = extractInviteCode(value)
    if (!code) return null
    const result = await client().rpc('attend_match_by_invite', { p_invite_code: code })
    if (result.error) throw new Error(matchError(result.error.message))
    return result.data ? this.getMatch(result.data as string) : null
  },

  async createMatch(groupId: string | null, values: { title: string; scheduledAt: string; format?: MatchFormat }): Promise<Match> {
    const result = await client().rpc('create_match_with_invite', { p_host_group_id: groupId, p_title: values.title.trim(), p_format: values.format ?? 'F5', p_scheduled_at: values.scheduledAt })
    if (result.error) throw new Error(matchError(result.error.message))
    const row = (Array.isArray(result.data) ? result.data[0] : result.data) as MatchRow | undefined
    if (!row) throw new Error('Supabase no devolvió el partido creado.')
    return oneMatch(row)
  },

  async joinTeam(inviteCode: string, team: MatchTeam): Promise<Match> {
    const result = await client().rpc('join_match_by_invite', { p_invite_code: extractInviteCode(inviteCode), p_team: team })
    if (result.error) throw new Error(matchError(result.error.message))
    return this.getMatch(result.data as string)
  },

  async leaveMatch(matchId: string, userId: string): Promise<void> {
    const result = await client().from('match_participants').delete().eq('match_id', matchId).eq('user_id', userId)
    if (result.error) throw new Error(matchError(result.error.message))
  },

  async saveScore(matchId: string, score: MatchScore): Promise<Match> {
    const result = await client().from('matches').update({ light_score: score.light, dark_score: score.dark, status: 'played' }).eq('id', matchId).select(matchColumns).single<MatchRow>()
    if (result.error) throw new Error(matchError(result.error.message))
    return oneMatch(result.data)
  },

  async setMvp(matchId: string, participant: MatchParticipant, voterUserId: string): Promise<Match> {
    const votedUserId = participant.type === 'registered_user' ? participant.userId ?? null : null
    if (participant.type === 'registered_user' && !votedUserId) throw new Error('El participante elegido no tiene un usuario válido.')
    const values = {
      match_id: matchId,
      voter_user_id: voterUserId,
      voted_guest_id: participant.type === 'guest' ? participant.id : null,
      voted_user_id: votedUserId,
    }
    const result = await client().from('match_mvp_votes').upsert(values, { onConflict: 'match_id,voter_user_id' }).select('id').single()
    if (result.error) throw new Error(matchError(result.error.message))
    return this.getMatch(matchId)
  },

  async saveComment(matchId: string, userId: string, body: string): Promise<Match> {
    const cleanBody = body.trim()
    if (!cleanBody || cleanBody.length > 240) throw new Error('El comentario debe tener entre 1 y 240 caracteres.')
    const result = await client().from('match_comments').upsert({ match_id: matchId, user_id: userId, body: cleanBody }, { onConflict: 'match_id,user_id' }).select('id').single()
    if (result.error) throw new Error(matchError(result.error.message))
    return this.getMatch(matchId)
  },

  async deleteComment(matchId: string, userId: string): Promise<Match> {
    const result = await client().from('match_comments').delete().eq('match_id', matchId).eq('user_id', userId)
    if (result.error) throw new Error(matchError(result.error.message))
    return this.getMatch(matchId)
  },

  async addGuest(matchId: string, values: { name: string; avatar?: string; team: MatchTeam }): Promise<Match> {
    const result = await client().from('match_guests').insert({ match_id: matchId, name: values.name.trim(), avatar: values.avatar?.trim() || null, team: values.team }).select('id').single()
    if (result.error) throw new Error(matchError(result.error.message))
    return this.getMatch(matchId)
  },

  async updateGuest(matchId: string, guestId: string, values: { name: string; avatar?: string }): Promise<Match> {
    const result = await client().from('match_guests').update({ name: values.name.trim(), avatar: values.avatar?.trim() || null }).eq('id', guestId).eq('match_id', matchId)
    if (result.error) throw new Error(matchError(result.error.message))
    return this.getMatch(matchId)
  },

  async removeGuest(matchId: string, guestId: string): Promise<Match> {
    const result = await client().from('match_guests').delete().eq('id', guestId).eq('match_id', matchId)
    if (result.error) throw new Error(matchError(result.error.message))
    return this.getMatch(matchId)
  },

  async saveGuestStats(matchId: string, guestId: string, goals: number, assists: number): Promise<Match> {
    const result = await client().from('match_guests').update({ goals, assists }).eq('id', guestId).eq('match_id', matchId)
    if (result.error) throw new Error(matchError(result.error.message))
    return this.getMatch(matchId)
  },
}
