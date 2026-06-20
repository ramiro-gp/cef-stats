import { Logo } from './Logo'

export function AuthSplash() {
  return <div className="grid min-h-dvh place-items-center bg-slate-50 px-6 text-slate-950 dark:bg-ink dark:text-white">
    <div className="flex flex-col items-center text-center"><Logo /><span className="mt-6 h-7 w-7 animate-spin rounded-full border-2 border-emerald-500/25 border-t-emerald-500" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-slate-400">Cargando tu sesión...</p></div>
  </div>
}
