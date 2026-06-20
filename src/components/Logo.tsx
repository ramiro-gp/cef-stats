import { APP_WORDMARK } from '../config/appBrand'

export function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-2.5">
    <div className="relative grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500 text-ink shadow-glow">
      <span className="text-lg font-black tracking-tighter">{APP_WORDMARK.primary[0]}</span>
      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink bg-white dark:border-ink" />
    </div>
    {!compact && <span className="text-xl font-extrabold tracking-tight">{APP_WORDMARK.primary} <span className="text-emerald-500">{APP_WORDMARK.accent}</span></span>}
  </div>
}
