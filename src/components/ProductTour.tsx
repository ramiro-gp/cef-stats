import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const rootRef = useRef<HTMLDivElement>(null)
  const steps = productTours[tourId]
  const step = steps[Math.min(stepIndex, steps.length - 1)]

  useEffect(() => {
    if (step.page && step.page !== activePage) onNavigate(step.page)
    let target: HTMLElement | null = null
    const measure = () => {
      const nextTarget = visibleTarget(step.target)
      if (!nextTarget || !rootRef.current) return
      if (target !== nextTarget) {
        target?.classList.remove('product-tour-highlight')
        target = nextTarget
        target.classList.add('product-tour-highlight')
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      }
      const rect = target.getBoundingClientRect()
      const padding = 8
      const top = Math.max(0, rect.top - padding)
      const left = Math.max(0, rect.left - padding)
      const right = Math.min(window.innerWidth, rect.right + padding)
      const bottom = Math.min(window.innerHeight, rect.bottom + padding)
      rootRef.current.style.setProperty('--tour-top', `${top}px`)
      rootRef.current.style.setProperty('--tour-left', `${left}px`)
      rootRef.current.style.setProperty('--tour-right', `${window.innerWidth - right}px`)
      rootRef.current.style.setProperty('--tour-bottom', `${window.innerHeight - bottom}px`)
      rootRef.current.style.setProperty('--tour-width', `${right - left}px`)
      rootRef.current.style.setProperty('--tour-height', `${bottom - top}px`)
    }
    const timeout = window.setTimeout(measure, step.page && step.page !== activePage ? 350 : 80)
    const settleTimeout = window.setTimeout(measure, step.page && step.page !== activePage ? 700 : 430)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.clearTimeout(timeout)
      window.clearTimeout(settleTimeout)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      target?.classList.remove('product-tour-highlight')
    }
  }, [activePage, onNavigate, step])

  const finish = () => onClose()
  const next = () => stepIndex === steps.length - 1 ? finish() : setStepIndex(index => index + 1)
  const previous = () => setStepIndex(index => Math.max(0, index - 1))

  const mobileCardPosition = step.target.startsWith('nav-') ? 'items-start pt-20' : 'items-end pb-[max(16px,env(safe-area-inset-bottom))]'

  return createPortal(<div ref={rootRef} role="dialog" aria-modal="true" aria-label="Recorrido guiado" className={`pointer-events-none fixed inset-0 isolate flex justify-center p-3 sm:items-center sm:py-3 ${mobileCardPosition}`} style={{ zIndex: 2147483647 }}>
    <button type="button" aria-label="Cerrar recorrido" onClick={finish} className="pointer-events-auto absolute inset-x-0 top-0 bg-slate-950/65" style={{ height: 'var(--tour-top, 100%)' }} />
    <button type="button" aria-label="Cerrar recorrido" onClick={finish} className="pointer-events-auto absolute inset-x-0 bottom-0 bg-slate-950/65" style={{ height: 'var(--tour-bottom, 0px)' }} />
    <button type="button" aria-label="Cerrar recorrido" onClick={finish} className="pointer-events-auto absolute left-0 bg-slate-950/65" style={{ top: 'var(--tour-top, 0px)', width: 'var(--tour-left, 0px)', height: 'var(--tour-height, 0px)' }} />
    <button type="button" aria-label="Cerrar recorrido" onClick={finish} className="pointer-events-auto absolute right-0 bg-slate-950/65" style={{ top: 'var(--tour-top, 0px)', width: 'var(--tour-right, 0px)', height: 'var(--tour-height, 0px)' }} />
    <div className="pointer-events-auto absolute" style={{ top: 'var(--tour-top, 0px)', left: 'var(--tour-left, 0px)', width: 'var(--tour-width, 0px)', height: 'var(--tour-height, 0px)' }} />
    <section className="pointer-events-auto relative z-10 w-full max-w-md rounded-3xl border border-emerald-500/30 bg-white p-5 text-slate-950 shadow-2xl dark:bg-[#080d0b] dark:text-white">
      <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-500">Paso {stepIndex + 1} de {steps.length}</span><button type="button" onClick={finish} className="min-h-10 px-2 text-xs font-bold text-slate-400">Cerrar</button></div>
      <h2 className="mt-3 text-xl font-black">{step.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{step.text}</p>
      <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" disabled={stepIndex === 0} onClick={previous} className="min-h-12 rounded-xl border border-slate-200 font-bold disabled:opacity-30 dark:border-white/10">Atrás</button><button type="button" onClick={next} className="min-h-12 rounded-xl bg-emerald-500 font-extrabold text-ink">{stepIndex === steps.length - 1 ? 'Terminar' : 'Siguiente'}</button></div>
    </section>
  </div>, document.body)
}
