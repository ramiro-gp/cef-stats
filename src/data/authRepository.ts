import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase, SUPABASE_NOT_CONFIGURED_MESSAGE } from '../lib/supabaseClient'
import type { AuthProfile, PlayerPosition } from '../types'
import { normalizeHandle } from '../utils/identity'

interface ProfileRow {
  id: string
  name: string
  handle: string
  avatar: string | null
  position: PlayerPosition | null
  created_at: string
  updated_at: string
}

export interface AuthResult {
  error?: string
  message?: string
}

export interface SignUpValues {
  email: string
  password: string
  name: string
  handle: string
}

const profileColumns = 'id,name,handle,avatar,position,created_at,updated_at'

function toProfile(row: ProfileRow): AuthProfile {
  return { id: row.id, name: row.name, handle: row.handle, avatar: row.avatar, position: row.position, createdAt: row.created_at, updatedAt: row.updated_at }
}

function authErrorMessage(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('profiles_handle_key') || normalized.includes('duplicate') || normalized.includes('unique')) return 'Ese @usuario ya está en uso.'
  if (normalized.includes('invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (normalized.includes('email not confirmed')) return 'Confirmá tu email antes de entrar.'
  if (normalized.includes('user already registered')) return 'Ya existe una cuenta con ese email.'
  if (normalized.includes('database error saving new user')) return 'No se pudo crear el perfil. El @usuario podría estar en uso.'
  if (normalized.includes('position') && (normalized.includes('does not exist') || normalized.includes('schema cache'))) return 'Falta ejecutar supabase/patches/004_add_profile_position.sql.'
  return message
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
    const { data } = await client.auth.getSession()
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
    if (response.error) return { profile: null, error: authErrorMessage(response.error.message) }
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
    if (response.error) return { profile: null, error: authErrorMessage(response.error.message) }
    return { profile: toProfile(response.data) }
  },
  async signIn(email: string, password: string): Promise<AuthResult> {
    const { client, error } = requireClient()
    if (!client) return { error: error! }
    const response = await client.auth.signInWithPassword({ email: email.trim(), password })
    return response.error ? { error: authErrorMessage(response.error.message) } : {}
  },
  async signUp(values: SignUpValues): Promise<AuthResult> {
    const { client, error } = requireClient()
    if (!client) return { error: error! }
    const handle = normalizeHandle(values.handle)
    const availability = await client.rpc('is_handle_available', { p_handle: handle })
    if (availability.error) return { error: 'No pudimos validar el @usuario. Verificá que hayas ejecutado supabase/schema.sql.' }
    if (!availability.data) return { error: 'Ese @usuario ya está en uso.' }
    const response = await client.auth.signUp({
      email: values.email.trim(),
      password: values.password,
      options: { data: { name: values.name.trim(), handle } },
    })
    if (response.error) return { error: authErrorMessage(response.error.message) }
    if (!response.data.session) return { message: 'Cuenta creada. Revisá tu email para confirmar el registro y después iniciá sesión.' }
    return {}
  },
  async signOut(): Promise<AuthResult> {
    const { client, error } = requireClient()
    if (!client) return { error: error! }
    const response = await client.auth.signOut()
    return response.error ? { error: authErrorMessage(response.error.message) } : {}
  },
  async updateProfile(user: SupabaseUser, values: Pick<AuthProfile, 'name' | 'handle' | 'avatar' | 'position'>): Promise<{ profile?: AuthProfile; error?: string }> {
    const { client, error } = requireClient()
    if (!client) return { error: error! }
    const response = await client.from('profiles').update({ name: values.name.trim(), handle: normalizeHandle(values.handle), avatar: values.avatar?.trim() || null, position: values.position || null, updated_at: new Date().toISOString() }).eq('id', user.id).select(profileColumns).single<ProfileRow>()
    if (response.error) return { error: authErrorMessage(response.error.message) }
    return { profile: toProfile(response.data) }
  },
}
