import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase, SUPABASE_NOT_CONFIGURED_MESSAGE } from '../lib/supabaseClient'
import type { AuthProfile, LoadFormatPreference, LoadMatchTypePreference, PlayerPosition } from '../types'
import { normalizeHandle } from '../utils/identity'

interface ProfileRow {
  id: string
  name: string
  handle: string
  avatar: string | null
  position: PlayerPosition | null
  default_match_type: LoadMatchTypePreference
  default_football_format: LoadFormatPreference
  created_at: string
  updated_at: string
}

export interface AuthResult {
  error?: string
  message?: string
  session?: Session
}

export interface SignUpValues {
  email: string
  password: string
  name: string
  handle: string
}

const profileColumns = 'id,name,handle,avatar,position,default_match_type,default_football_format,created_at,updated_at'

function toProfile(row: ProfileRow): AuthProfile {
  return { id: row.id, name: row.name, handle: row.handle, avatar: row.avatar, position: row.position, defaultMatchType: row.default_match_type ?? 'friendly', defaultFootballFormat: row.default_football_format ?? 'F5', createdAt: row.created_at, updatedAt: row.updated_at }
}

export function authErrorMessage(reason: unknown): string {
  const source = reason && typeof reason === 'object' ? reason as { message?: unknown; error_description?: unknown; status?: unknown; code?: unknown } : null
  const rawMessage = typeof reason === 'string'
    ? reason
    : typeof source?.message === 'string'
      ? source.message
      : typeof source?.error_description === 'string'
        ? source.error_description
        : ''
  const status = typeof source?.status === 'number' ? source.status : Number(source?.status || 0)
  const code = typeof source?.code === 'string' ? source.code.toLowerCase() : ''
  const normalized = `${code} ${rawMessage}`.toLowerCase()
  if (normalized.includes('profiles_handle_key') || normalized.includes('duplicate') || normalized.includes('unique')) return 'Ese @usuario ya está en uso.'
  if (normalized.includes('invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (normalized.includes('email not confirmed')) return 'Confirmá tu email antes de entrar.'
  if (normalized.includes('user already registered') || normalized.includes('identity_already_exists') || normalized.includes('email already')) return 'Ya existe una cuenta con ese email.'
  if (normalized.includes('database error saving new user')) return 'No se pudo crear el perfil. El @usuario podría estar en uso.'
  if (normalized.includes('weak_password') || normalized.includes('password should') || normalized.includes('password must') || normalized.includes('at least 6')) return 'La contraseña no cumple los requisitos de seguridad. Usá al menos 6 caracteres.'
  if (status === 429 || normalized.includes('rate limit') || normalized.includes('too many requests') || normalized.includes('over_email_send_rate_limit')) return 'Demasiados intentos. Esperá unos minutos y volvé a probar.'
  if (normalized.includes('position') && (normalized.includes('does not exist') || normalized.includes('schema cache'))) return 'Falta ejecutar supabase/patches/004_add_profile_position.sql.'
  if ((normalized.includes('default_match_type') || normalized.includes('default_football_format')) && (normalized.includes('does not exist') || normalized.includes('schema cache'))) return 'Falta ejecutar supabase/patches/009_add_stat_entry_context.sql.'
  if (normalized.includes('profiles_default_football_format_check')) return 'Falta ejecutar supabase/patches/010_expand_stat_football_formats.sql.'
  if (status >= 500 || normalized.includes('internal server error') || normalized.includes('unexpected_failure')) return 'Supabase tuvo un error interno. Probá nuevamente en unos minutos.'
  return rawMessage.trim() && rawMessage.trim() !== '{}' ? rawMessage.trim() : 'No pudimos completar la operación. Probá nuevamente.'
}

function requireClient() {
  if (!supabase || !isSupabaseConfigured) return { client: null, error: SUPABASE_NOT_CONFIGURED_MESSAGE }
  return { client: supabase, error: null }
}

export const authRepository = {
  configured: isSupabaseConfigured,
  async getSession(): Promise<Session | null> {
    const { client } = requireClient()
    if (!client) return null
    const { data, error } = await client.auth.getSession()
    if (error) throw new Error(authErrorMessage(error))
    return data.session
  },
  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    const { client } = requireClient()
    if (!client) return () => undefined
    const { data } = client.auth.onAuthStateChange((_event, session) => callback(session))
    return () => data.subscription.unsubscribe()
  },
  async getProfile(userId: string): Promise<{ profile: AuthProfile | null; error?: string }> {
    const { client, error } = requireClient()
    if (!client) return { profile: null, error: error! }
    const response = await client.from('profiles').select(profileColumns).eq('id', userId).maybeSingle<ProfileRow>()
    if (response.error) return { profile: null, error: authErrorMessage(response.error) }
    return { profile: response.data ? toProfile(response.data) : null }
  },
  async ensureProfile(user: SupabaseUser): Promise<{ profile: AuthProfile | null; error?: string }> {
    const existing = await this.getProfile(user.id)
    if (existing.profile || existing.error) return existing
    const metadata = user.user_metadata ?? {}
    const fallbackHandle = `user_${user.id.slice(0, 8)}`
    const row = {
      id: user.id,
      name: String(metadata.name || user.email?.split('@')[0] || 'Jugador').trim(),
      handle: normalizeHandle(String(metadata.handle || fallbackHandle)),
      avatar: metadata.avatar ? String(metadata.avatar).trim() : null,
    }
    const { client, error } = requireClient()
    if (!client) return { profile: null, error: error! }
    const response = await client.from('profiles').insert(row).select(profileColumns).single<ProfileRow>()
    if (response.error) return { profile: null, error: authErrorMessage(response.error) }
    return { profile: toProfile(response.data) }
  },
  async signIn(email: string, password: string): Promise<AuthResult> {
    const { client, error } = requireClient()
    if (!client) return { error: error! }
    try {
      const response = await client.auth.signInWithPassword({ email: email.trim(), password })
      return response.error ? { error: authErrorMessage(response.error) } : { session: response.data.session }
    } catch (reason) {
      return { error: authErrorMessage(reason) }
    }
  },
  async signUp(values: SignUpValues): Promise<AuthResult> {
    const { client, error } = requireClient()
    if (!client) return { error: error! }
    const handle = normalizeHandle(values.handle)
    try {
      const availability = await client.rpc('is_handle_available', { p_handle: handle })
      if (availability.error) return { error: authErrorMessage(availability.error) }
      if (!availability.data) return { error: 'Ese @usuario ya está en uso.' }
      const response = await client.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: { data: { name: values.name.trim(), handle } },
      })
      if (response.error) return { error: authErrorMessage(response.error) }
      if (response.data.user && response.data.user.identities?.length === 0) return { error: 'Ya existe una cuenta con ese email.' }
      if (response.data.session) return { session: response.data.session }
      return { message: 'Cuenta creada, pero la sesión no se inició automáticamente. Iniciá sesión para continuar.' }
    } catch (reason) {
      return { error: authErrorMessage(reason) }
    }
  },
  async signOut(): Promise<AuthResult> {
    const { client, error } = requireClient()
    if (!client) return { error: error! }
    const response = await client.auth.signOut()
    return response.error ? { error: authErrorMessage(response.error) } : {}
  },
  async updateProfile(user: SupabaseUser, values: Pick<AuthProfile, 'name' | 'handle' | 'avatar' | 'position' | 'defaultMatchType' | 'defaultFootballFormat'>): Promise<{ profile?: AuthProfile; error?: string }> {
    const { client, error } = requireClient()
    if (!client) return { error: error! }
    const response = await client.from('profiles').update({ name: values.name.trim(), handle: normalizeHandle(values.handle), avatar: values.avatar?.trim() || null, position: values.position || null, default_match_type: values.defaultMatchType, default_football_format: values.defaultFootballFormat, updated_at: new Date().toISOString() }).eq('id', user.id).select(profileColumns).single<ProfileRow>()
    if (response.error) return { error: authErrorMessage(response.error) }
    return { profile: toProfile(response.data) }
  },
  async updatePassword(password: string): Promise<AuthResult> {
    const { client, error } = requireClient()
    if (!client) return { error: error! }
    const response = await client.auth.updateUser({ password })
    return response.error ? { error: authErrorMessage(response.error) } : {}
  },
  async getPublicUserCount(): Promise<number | null> {
    const { client } = requireClient()
    if (!client) return null
    const response = await client.from('profiles').select('id', { count: 'exact', head: true })
    if (response.error) return null
    return response.count ?? null
  },
}
