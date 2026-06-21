import { useEffect, useState } from 'react'
import type { Page } from '../types'
import { productTours, type ProductTourId } from '../config/productTours'

function visibleTarget(name: string): HTMLElement | null {
  return [...document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)].find(element => {
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }) ?? null
}

export function ProductTour({ tourId, activePage, onNavigate, onClose }: { tourId: ProductTourId; activePage: Page | null; onNavigate: (page: Page) => void; onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0)
  const steps = productTours[tourId]
  const step = steps[Math.min(stepIndex, steps.length - 1)]

  useEffect(() => {
    if (step.page && step.page !== activePage) onNavigate(step.page)
    const timeout = window.setTimeout(() => {
      const target = visibleTarget(step.target)
      target?.classList.add('product-tour-highlight')
      target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }, step.page && step.page !== activePage ? 350 : 80)
    return () => {
      window.clearTimeout(timeout)
      document.querySelectorAll('.product-tour-highlight').forEach(element => element.classList.remove('product-tour-highlight'))
    }
  }, [activePage, onNavigate, step])

  const finish = () => onClose()
  const next = () => stepIndex === steps.length - 1 ? finish() : setStepIndex(index => index + 1)
  const previous = () => setStepIndex(index => Math.max(0, index - 1))

  const mobileCardPosition = step.target.startsWith('nav-') ? 'items-start pt-20' : 'items-end pb-[max(16px,env(safe-area-inset-bottom))]'

  return <div role="dialog" aria-modal="true" aria-label="Recorrido guiado" className={`fixed inset-0 z-[55] flex justify-center p-3 sm:items-center sm:py-3 ${mobileCardPosition}`}>
    <button type="button" aria-label="Cerrar recorrido" onClick={finish} className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]" />
    <section className="relative z-[80] w-full max-w-md rounded-3xl border border-emerald-500/25 bg-white p-5 shadow-2xl dark:bg-[#102019]">
      <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-500">Paso {stepIndex + 1} de {steps.length}</span><button type="button" onClick={finish} className="min-h-10 px-2 text-xs font-bold text-slate-400">Cerrar</button></div>
      <h2 className="mt-3 text-xl font-black">{step.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{step.text}</p>
      <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" disabled={stepIndex === 0} onClick={previous} className="min-h-12 rounded-xl border border-slate-200 font-bold disabled:opacity-30 dark:border-white/10">Atrás</button><button type="button" onClick={next} className="min-h-12 rounded-xl bg-emerald-500 font-extrabold text-ink">{stepIndex === steps.length - 1 ? 'Terminar' : 'Siguiente'}</button></div>
    </section>
  </div>
}
