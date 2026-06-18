export function PageTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return <div className="mb-6">
    {eyebrow && <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-500">{eyebrow}</p>}
    <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
    {subtitle && <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>}
  </div>
}
