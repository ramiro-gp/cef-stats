import { useEffect, useMemo, useState } from 'react'
import { Logo } from '../components/Logo'
import { ArrowUpIcon, FireIcon, MedalIcon, TrophyIcon, UsersIcon } from '../components/icons'
import { authErrorMessage, authRepository, type AuthResult, type SignUpValues } from '../data/authRepository'
import { SUPABASE_NOT_CONFIGURED_MESSAGE } from '../lib/supabaseClient'
import { isValidHandle, normalizeHandle } from '../utils/identity'

interface Props {
  configured: boolean
  loading: boolean
  authError?: string
  pendingGroupCode?: string
  pendingMatchCode?: string
  onSignIn: (email: string, password: string) => Promise<AuthResult>
  onSignUp: (values: SignUpValues) => Promise<AuthResult>
}

const metricCards = [
  { icon: TrophyIcon, value: '#1', label: 'Ranking' },
  { icon: FireIcon, value: '3+', label: 'Rachas' },
  { icon: ArrowUpIcon, value: '18', label: 'Goles' },
  { icon: UsersIcon, value: '5v5', label: 'Partidos' },
  { icon: MedalIcon, value: '🏆', label: 'Mundiales' },
  { icon: ArrowUpIcon, value: '7', label: 'Asistencias' },
]

function formatCompactCount(value: number | null): string {
  if (value === null) return '+'
  if (value < 1000) return `+${value}`
  const compact = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: value < 10000 ? 1 : 0 }).format(value)
  return `+${compact}`
}

export function LoginPage({ configured, loading, authError, pendingGroupCode = '', pendingMatchCode = '', onSignIn, onSignUp }: Props) {
  const [mode, setMode] = useState<'welcome' | 'login' | 'register'>('welcome')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [userCount, setUserCount] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    if (!configured) return
    void authRepository.getPublicUserCount().then(count => {
      if (mounted) setUserCount(count)
    })
    return () => { mounted = false }
  }, [configured])

  const avatarItems = useMemo(() => ['RA', 'FE', 'TH', formatCompactCount(userCount)], [userCount])

  const submit = async () => {
    if (submitting || loading) return
    setError('')
    setMessage('')
    if (!configured) { setError(SUPABASE_NOT_CONFIGURED_MESSAGE); return }
    if (!email.trim() || !password) { setError('Completá email y contraseña.'); return }
    if (mode === 'register' && !name.trim()) { setError('Ingresá tu nombre.'); return }
    if (mode === 'register' && !isValidHandle(handle)) { setError('El @usuario debe tener 3–24 caracteres: letras, números, punto o guion bajo.'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    setSubmitting(true)
    try {
      const result = mode === 'register'
        ? await onSignUp({ email, password, name, handle: normalizeHandle(handle) })
        : await onSignIn(email, password)
      if (result.error) setError(result.error)
      if (result.message) setMessage(result.message)
    } catch (reason) {
      setError(authErrorMessage(reason))
    } finally {
      setSubmitting(false)
    }
  }

  const switchMode = (nextMode: 'welcome' | 'login' | 'register') => {
    setMode(nextMode)
    setError('')
    setMessage('')
  }

  const accountForm = mode !== 'welcome' && <div className="my-auto py-8">
    <button type="button" onClick={() => switchMode('welcome')} className="mb-6 min-h-10 text-sm font-bold text-emerald-400">← Volver</button>
    <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Fulbo Stats</p>
    <h1 className="mt-2 text-3xl font-black">{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</h1>
    {pendingGroupCode && <div className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-200">Tenés una invitación pendiente al grupo <strong>{pendingGroupCode}</strong>. Entrá o registrate para unirte.</div>}
    {pendingMatchCode && <div className="mt-5 rounded-2xl border border-sky-400/25 bg-sky-400/10 p-4 text-sm leading-6 text-sky-200">Tenés una invitación pendiente al partido <strong>{pendingMatchCode}</strong>. Entrá o registrate para abrirlo.</div>}
    {!configured && <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-200">{SUPABASE_NOT_CONFIGURED_MESSAGE}</div>}
    <div className="mt-6 space-y-4">
      {mode === 'register' && <>
        <label className="block"><span className="text-xs font-bold text-slate-400">Nombre</span><input value={name} onChange={event => setName(event.target.value)} autoComplete="name" className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 outline-none focus:border-emerald-500" /></label>
        <label className="block"><span className="text-xs font-bold text-slate-400">@usuario</span><div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">@</span><input value={handle} maxLength={24} onChange={event => setHandle(event.target.value.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9._]/g, ''))} autoComplete="username" className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-3 outline-none focus:border-emerald-500" /></div></label>
      </>}
      <label className="block"><span className="text-xs font-bold text-slate-400">Email</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 outline-none focus:border-emerald-500" /></label>
      <label className="block"><span className="text-xs font-bold text-slate-400">Contraseña</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 outline-none focus:border-emerald-500" /></label>
    </div>
    {error && <p className="mt-4 rounded-xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-300">{error}</p>}
    {!error && authError && <p className="mt-4 rounded-xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-300">{authError}</p>}
    {message && <p className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300">{message}</p>}
    <button type="button" onClick={submit} disabled={submitting || loading} className="mt-6 min-h-14 w-full rounded-2xl bg-emerald-500 px-6 font-extrabold text-ink disabled:opacity-50">{submitting ? (mode === 'register' ? 'Creando cuenta...' : 'Entrando...') : loading ? 'Cargando sesión...' : mode === 'login' ? 'Entrar' : 'Registrarme'}</button>
    <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="mt-3 min-h-11 w-full text-sm font-bold text-slate-400">{mode === 'login' ? '¿No tenés cuenta? Registrate' : 'Ya tengo cuenta'}</button>
  </div>

  return <div className="relative flex min-h-dvh overflow-hidden bg-ink px-5 py-8 text-white">
    <div className="absolute -right-32 -top-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
    <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
    <div className="relative mx-auto flex w-full max-w-md flex-col">
      <Logo />
      {accountForm || <>
        <div className="my-auto py-14">
          <div className="mb-8 flex -space-x-2">{avatarItems.map((item, i) => <div key={`${item}-${i}`} className={`grid h-11 w-11 place-items-center rounded-full border-2 border-ink text-xs font-extrabold ${['bg-emerald-500 text-ink', 'bg-violet-500', 'bg-sky-500', 'bg-white/10'][i]}`}>{item}</div>)}</div>
          <h1 className="max-w-sm text-4xl font-black leading-[1.08] tracking-[-0.04em] sm:text-5xl">Tu partido no termina en la cancha.</h1>
          <p className="mt-5 max-w-sm text-lg leading-7 text-slate-400">Guardá tus números, armá partidos y peleá rankings con tus amigos.</p>
          {pendingGroupCode && <div className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-200">Invitación pendiente al grupo <strong>{pendingGroupCode}</strong>. Iniciá sesión o creá una cuenta para unirte.</div>}
          {pendingMatchCode && <div className="mt-5 rounded-2xl border border-sky-400/25 bg-sky-400/10 p-4 text-sm leading-6 text-sky-200">Invitación pendiente al partido <strong>{pendingMatchCode}</strong>. Iniciá sesión o creá una cuenta para abrirlo.</div>}
          <div className="relative mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] py-3">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-ink to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-ink to-transparent" />
            <div className="ticker-marquee-track flex w-max gap-2 px-3 [--marquee-duration:22s]">
              {[...metricCards, ...metricCards].map(({icon: Icon, value, label}, index) => <div key={`${label}-${index}`} className="flex min-w-[112px] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2">
                <Icon className="h-5 w-5 shrink-0 text-emerald-400" />
                <div><div className="text-sm font-black leading-none">{value}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div></div>
              </div>)}
            </div>
          </div>
          {!configured && <p className="mt-5 text-xs leading-5 text-amber-300">{SUPABASE_NOT_CONFIGURED_MESSAGE}</p>}
          {authError && <p className="mt-3 text-xs leading-5 text-rose-300">{authError}</p>}
        </div>
        <div className="space-y-3">
          <button type="button" onClick={() => switchMode('login')} className="min-h-14 w-full rounded-2xl bg-emerald-500 px-6 font-extrabold text-ink">Entrar</button>
          <button type="button" onClick={() => switchMode('register')} className="min-h-12 w-full rounded-2xl border border-white/10 px-6 font-extrabold text-slate-200">Crear cuenta</button>
        </div>
      </>}
    </div>
  </div>
}
