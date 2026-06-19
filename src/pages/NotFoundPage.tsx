export function NotFoundPage({ onHome, onMatches }: { onHome: () => void; onMatches: () => void }) {
  return <section className="mx-auto max-w-lg py-12 text-center sm:py-20">
    <p className="text-sm font-black uppercase tracking-[.25em] text-emerald-500">Error 404</p>
    <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Esta cancha no existe.</h1>
    <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">La dirección puede estar incompleta o la pantalla pudo haberse movido.</p>
    <div className="mx-auto mt-7 grid max-w-sm gap-3 sm:grid-cols-2"><button onClick={onHome} className="min-h-12 rounded-xl bg-emerald-500 px-5 font-bold text-ink">Volver al inicio</button><button onClick={onMatches} className="min-h-12 rounded-xl border border-slate-200 px-5 font-bold dark:border-white/10">Ir a partidos</button></div>
  </section>
}
