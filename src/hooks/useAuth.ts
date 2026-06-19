import { useCallback, useEffect, useState } from 'react'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { authErrorMessage, authRepository, type AuthResult, type SignUpValues } from '../data/authRepository'
import type { AuthProfile } from '../types'

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(authRepository.configured)
  const [error, setError] = useState('')
  const status = loading ? 'loading' : user && profile ? 'authenticated' : 'unauthenticated'

  const syncSession = useCallback(async (session: Session | null) => {
    setUser(session?.user ?? null)
    if (!session?.user) {
      setProfile(null)
      setError('')
      setLoading(false)
      return
    }
    setLoading(true)
    const result = await authRepository.ensureProfile(session.user)
    setProfile(result.profile)
    setError(result.error ?? (result.profile ? '' : 'No encontramos tu profile. Verificá que hayas ejecutado supabase/schema.sql.'))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!authRepository.configured) return
    let active = true
    void authRepository.getSession().then(session => { if (active) void syncSession(session) }).catch(reason => {
      if (!active) return
      setError(authErrorMessage(reason))
      setLoading(false)
    })
    const unsubscribe = authRepository.onAuthStateChange(session => { if (active) window.setTimeout(() => void syncSession(session), 0) })
    return () => { active = false; unsubscribe() }
  }, [syncSession])

  const refreshProfile = useCallback(async (): Promise<AuthResult> => {
    if (!user) return { error: 'No hay una sesión activa.' }
    const result = await authRepository.getProfile(user.id)
    if (result.error) return { error: result.error }
    setProfile(result.profile)
    return {}
  }, [user])

  const updateProfile = useCallback(async (values: Pick<AuthProfile, 'name' | 'handle' | 'avatar' | 'position' | 'defaultMatchType' | 'defaultFootballFormat'>): Promise<AuthResult> => {
    if (!user) return { error: 'No hay una sesión activa.' }
    const result = await authRepository.updateProfile(user, values)
    if (result.error) return { error: result.error }
    if (result.profile) setProfile(result.profile)
    return {}
  }, [user])

  const signOut = useCallback(async (): Promise<AuthResult> => {
    const result = await authRepository.signOut()
    if (!result.error) {
      setUser(null)
      setProfile(null)
      setError('')
      setLoading(false)
    }
    return result
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const result = await authRepository.signIn(email, password)
    if (result.session) await syncSession(result.session)
    return result
  }, [syncSession])

  const signUp = useCallback(async (values: SignUpValues): Promise<AuthResult> => {
    const result = await authRepository.signUp(values)
    if (result.session) await syncSession(result.session)
    return result
  }, [syncSession])

  return {
    configured: authRepository.configured,
    status,
    user,
    profile,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    updateProfile,
  }
}
