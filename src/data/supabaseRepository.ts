import { supabase, SUPABASE_NOT_CONFIGURED_MESSAGE } from '../lib/supabaseClient'
import type { Group, GroupMemberRole, GroupMemberView, MatchResult, MatchTeam, PlayerPosition, StatEntry, StatFootballFormat, StatMatchType, StatScopeType } from '../types'
import { createStringStorageAdapter } from './localStorageAdapter'
import { normalizeGroupCode } from '../utils/groups'
import type { StatFilters } from '../utils/statFilters'

interface GroupRow {
  id: string
  name: string
  invite_code: string
  created_by: string | null
  group_emoji?: string | null
  created_at: string
  updated_at: string
}

interface MembershipRow {
  id: string
  group_id: string
  user_id: string
  role: GroupMemberRole
  created_at: string
}

interface ProfileRow {
  id: string
  name: string
  handle: string
  avatar: string | null
}

interface StatEntryRow {
  id: string
  user_id: string
  scope_type: StatScopeType
  group_id: string | null
  result: MatchResult
  goals: number
  assists: number
  local_match_id: string | null
  match_id: string | null
  team: MatchTeam | null
  match_type: StatMatchType | null
  football_format: StatFootballFormat | null
  played_position: PlayerPosition | null
  played_at: string
  created_at: string
  updated_at: string
}

export type StatScope = { type: 'personal'; userId: string } | { type: 'group'; userId: string; groupId: string } | { type: 'all'; userId: string; groupIds: string[] }
export type StatEntryInput = Pick<StatEntry, 'result' | 'goals' | 'assists' | 'matchId' | 'team' | 'matchType' | 'footballFormat' | 'playedPosition'> & { playedAt?: string }

const activeGroupStorage = createStringStorageAdapter('cef-stats-active-supabase-group')

function client() {
  if (!supabase) throw new Error(SUPABASE_NOT_CONFIGURED_MESSAGE)
  return supabase
}

function groupError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('group_emoji')) return 'Falta ejecutar supabase/patches/011_add_group_emoji.sql.'
  if (normalized.includes('invalid invite code')) return 'No encontramos un grupo con ese código.'
  if (normalized.includes('already a member') || normalized.includes('duplicate')) return 'Ya pertenecés a ese grupo.'
  if (normalized.includes('permission') || normalized.includes('policy') || normalized.includes('row-level security')) return 'No tenés permisos para realizar esta acción. Revisá las policies RLS.'
  if (normalized.includes('create_group_with_membership') || normalized.includes('join_group_by_invite')) return 'Falta actualizar el schema de Supabase. Volvé a ejecutar supabase/schema.sql.'
  return message
}

function toGroup(row: GroupRow, memberCount: number): Group {
  return { id: row.id, name: row.name, code: row.invite_code, memberCount, gamesCount: 0, emoji: row.group_emoji?.trim() || '⚽', spicyMode: true, seeded: false }
}

const groupColumns = 'id,name,invite_code,created_by,group_emoji,created_at,updated_at'

function statError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('match_id') && (normalized.includes('does not exist') || normalized.includes('schema cache'))) return 'Falta ejecutar supabase/patches/003_add_matches.sql.'
  if ((normalized.includes('match_type') || normalized.includes('football_format') || normalized.includes('played_position')) && (normalized.includes('does not exist') || normalized.includes('schema cache'))) return 'Falta ejecutar supabase/patches/009_add_stat_entry_context.sql.'
  if (normalized.includes('stat_entries_football_format_check')) return 'Falta ejecutar supabase/patches/010_expand_stat_football_formats.sql.'
  if (normalized.includes('stat_entries') && (normalized.includes('does not exist') || normalized.includes('schema cache'))) return 'Falta ejecutar supabase/patches/002_add_stat_entries.sql.'
  if (normalized.includes('permission') || normalized.includes('policy') || normalized.includes('row-level security')) return 'No tenés permisos para guardar stats en este scope. Revisá tu membresía o participación en el partido.'
  if (normalized.includes('authentication') || normalized.includes('jwt')) return 'Tu sesión venció. Volvé a iniciar sesión.'
  return message
}

function toStatEntry(row: StatEntryRow): StatEntry {
  return {
    id: row.id,
    userId: row.user_id,
    scopeType: row.scope_type,
    groupId: row.group_id ?? `personal:${row.user_id}`,
    result: row.result,
    goals: row.goals,
    assists: row.assists,
    matchId: row.match_id ?? row.local_match_id ?? undefined,
    team: row.team ?? undefined,
    matchType: row.match_type ?? 'friendly',
    footballFormat: row.football_format ?? 'F5',
    playedPosition: row.played_position ?? undefined,
    playedAt: row.played_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const statColumns = 'id,user_id,scope_type,group_id,result,goals,assists,match_id,local_match_id,team,match_type,football_format,played_position,played_at,created_at,updated_at'

export const supabaseRepository = {
  getPersistedActiveGroupId: activeGroupStorage.load,
  persistActiveGroupId: activeGroupStorage.save,
  clearPersistedActiveGroupId: activeGroupStorage.clear,

  async getGroups(userId: string): Promise<Group[]> {
    const db = client()
    const memberships = await db.from('group_members').select('group_id').eq('user_id', userId)
    if (memberships.error) throw new Error(groupError(memberships.error.message))
    const groupIds = (memberships.data ?? []).map(item => item.group_id as string)
    if (!groupIds.length) return []
    const [groupsResult, countsResult] = await Promise.all([
      db.from('groups').select(groupColumns).in('id', groupIds),
      db.from('group_members').select('group_id').in('group_id', groupIds),
    ])
    if (groupsResult.error) throw new Error(groupError(groupsResult.error.message))
    if (countsResult.error) throw new Error(groupError(countsResult.error.message))
    const counts = new Map<string, number>()
    for (const membership of countsResult.data ?? []) counts.set(membership.group_id as string, (counts.get(membership.group_id as string) ?? 0) + 1)
    return (groupsResult.data as GroupRow[]).map(row => toGroup(row, counts.get(row.id) ?? 0)).sort((a, b) => a.name.localeCompare(b.name))
  },

  async createGroup(name: string, emoji = '⚽'): Promise<Group> {
    const db = client()
    const result = await db.rpc('create_group_with_membership', { p_name: name.trim() })
    if (result.error) throw new Error(groupError(result.error.message))
    const row = (Array.isArray(result.data) ? result.data[0] : result.data) as GroupRow | null
    if (!row) throw new Error('Supabase no devolvió el grupo creado.')
    const updated = await db.from('groups').update({ group_emoji: emoji }).eq('id', row.id).select(groupColumns).single<GroupRow>()
    if (updated.error) throw new Error(groupError(updated.error.message))
    return toGroup(updated.data, 1)
  },

  async updateGroup(groupId: string, values: Pick<Group, 'name' | 'emoji'>): Promise<Group> {
    const db = client()
    const result = await db.from('groups').update({ name: values.name.trim(), group_emoji: values.emoji || '⚽', updated_at: new Date().toISOString() }).eq('id', groupId).select(groupColumns).single<GroupRow>()
    if (result.error) throw new Error(groupError(result.error.message))
    const members = await this.getMembers(groupId)
    return toGroup(result.data, members.length)
  },

  async joinGroup(inviteCode: string): Promise<string> {
    const result = await client().rpc('join_group_by_invite', { p_invite_code: normalizeGroupCode(inviteCode) })
    if (result.error) throw new Error(groupError(result.error.message))
    return result.data as string
  },

  async getMembers(groupId: string): Promise<GroupMemberView[]> {
    const db = client()
    const membershipsResult = await db.from('group_members').select('id,group_id,user_id,role,created_at').eq('group_id', groupId).order('created_at')
    if (membershipsResult.error) throw new Error(groupError(membershipsResult.error.message))
    const memberships = membershipsResult.data as MembershipRow[]
    if (!memberships.length) return []
    const profilesResult = await db.from('profiles').select('id,name,handle,avatar').in('id', memberships.map(member => member.user_id))
    if (profilesResult.error) throw new Error(groupError(profilesResult.error.message))
    const profiles = new Map((profilesResult.data as ProfileRow[]).map(profile => [profile.id, profile]))
    return memberships.map(member => {
      const profile = profiles.get(member.user_id)
      return { id: member.id, groupId: member.group_id, userId: member.user_id, role: member.role, joinedAt: member.created_at, name: profile?.name ?? 'Usuario', handle: profile?.handle ?? 'sin-handle', avatar: profile?.avatar ?? null }
    })
  },

  async getMembersForGroups(groupIds: string[]): Promise<GroupMemberView[]> {
    if (!groupIds.length) return []
    const db = client()
    const membershipsResult = await db.from('group_members').select('id,group_id,user_id,role,created_at').in('group_id', groupIds).order('created_at')
    if (membershipsResult.error) throw new Error(groupError(membershipsResult.error.message))
    const memberships = membershipsResult.data as MembershipRow[]
    if (!memberships.length) return []
    const profilesResult = await db.from('profiles').select('id,name,handle,avatar').in('id', [...new Set(memberships.map(member => member.user_id))])
    if (profilesResult.error) throw new Error(groupError(profilesResult.error.message))
    const profiles = new Map((profilesResult.data as ProfileRow[]).map(profile => [profile.id, profile]))
    return memberships.map(member => {
      const profile = profiles.get(member.user_id)
      return { id: member.id, groupId: member.group_id, userId: member.user_id, role: member.role, joinedAt: member.created_at, name: profile?.name ?? 'Usuario', handle: profile?.handle ?? 'sin-handle', avatar: profile?.avatar ?? null }
    })
  },

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    const result = await client().from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
    if (result.error) throw new Error(groupError(result.error.message))
  },

  async listStatEntries(scope: StatScope): Promise<StatEntry[]> {
    if (scope.type === 'all' && !scope.groupIds.length) return []
    let query = client().from('stat_entries').select(statColumns).order('played_at', { ascending: false })
    query = scope.type === 'personal'
      ? query.eq('scope_type', 'personal').is('group_id', null).eq('user_id', scope.userId)
      : scope.type === 'all'
        ? query.eq('scope_type', 'group').in('group_id', scope.groupIds)
        : query.eq('scope_type', 'group').eq('group_id', scope.groupId)
    const result = await query
    if (result.error) throw new Error(statError(result.error.message))
    return (result.data as StatEntryRow[]).map(toStatEntry)
  },

  async listMatchStatEntries(matchIds: string[]): Promise<StatEntry[]> {
    if (!matchIds.length) return []
    const result = await client().from('stat_entries').select(statColumns).in('match_id', matchIds).order('played_at', { ascending: false })
    if (result.error) throw new Error(statError(result.error.message))
    return (result.data as StatEntryRow[]).map(toStatEntry)
  },

  async listUserStatEntries(userId: string, page: number, pageSize: number, filters: StatFilters): Promise<{ entries: StatEntry[]; total: number }> {
    const from = Math.max(0, page - 1) * pageSize
    let query = client().from('stat_entries').select(statColumns, { count: 'exact' }).eq('user_id', userId)
    if (filters.matchType === 'friendly') query = query.or('match_type.eq.friendly,match_type.is.null')
    else if (filters.matchType === 'tournament') query = query.eq('match_type', 'tournament')
    if (filters.footballFormat === 'F5') query = query.or('football_format.eq.F5,football_format.is.null')
    else if (filters.footballFormat !== 'all') query = query.eq('football_format', filters.footballFormat)
    const result = await query.order('played_at', { ascending: false }).range(from, from + pageSize - 1)
    if (result.error) throw new Error(statError(result.error.message))
    return { entries: (result.data as StatEntryRow[]).map(toStatEntry), total: result.count ?? 0 }
  },

  async createStatEntry(scope: StatScope, input: StatEntryInput): Promise<StatEntry> {
    if (!scope.userId) throw new Error('Necesitás iniciar sesión para guardar stats.')
    if (scope.type === 'all') throw new Error('Elegí un grupo específico o Mi historial para cargar stats.')
    const result = await client().from('stat_entries').insert({
      user_id: scope.userId,
      scope_type: scope.type,
      group_id: scope.type === 'group' ? scope.groupId : null,
      result: input.result,
      goals: input.goals,
      assists: input.assists,
      match_id: input.matchId ?? null,
      local_match_id: null,
      team: input.team ?? null,
      match_type: input.matchType ?? 'friendly',
      football_format: input.footballFormat ?? 'F5',
      played_position: input.playedPosition ?? null,
      played_at: input.playedAt ?? new Date().toISOString(),
    }).select(statColumns).single<StatEntryRow>()
    if (result.error) throw new Error(statError(result.error.message))
    return toStatEntry(result.data)
  },

  async updateStatEntry(id: string, userId: string, input: Partial<StatEntryInput>): Promise<StatEntry> {
    const values: Record<string, unknown> = {}
    if (input.result !== undefined) values.result = input.result
    if (input.goals !== undefined) values.goals = input.goals
    if (input.assists !== undefined) values.assists = input.assists
    if (input.matchId !== undefined) { values.match_id = input.matchId; values.local_match_id = null }
    if (input.team !== undefined) values.team = input.team
    if (input.matchType !== undefined) values.match_type = input.matchType
    if (input.footballFormat !== undefined) values.football_format = input.footballFormat
    if (input.playedPosition !== undefined) values.played_position = input.playedPosition || null
    if (input.playedAt !== undefined) values.played_at = input.playedAt
    const result = await client().from('stat_entries').update(values).eq('id', id).eq('user_id', userId).select(statColumns).single<StatEntryRow>()
    if (result.error) throw new Error(statError(result.error.message))
    return toStatEntry(result.data)
  },

  async deleteStatEntry(id: string, userId: string): Promise<void> {
    const result = await client().from('stat_entries').delete().eq('id', id).eq('user_id', userId).select('id').maybeSingle<{ id: string }>()
    if (result.error) throw new Error(statError(result.error.message))
    if (!result.data) throw new Error('No pudimos borrar la carga: no existe o no te pertenece.')
  },
}
