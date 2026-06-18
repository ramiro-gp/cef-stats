import type { ReactNode } from 'react'

export function ModalSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={title}>
    <button aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
    <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#0d1814] sm:rounded-[28px] sm:p-6">
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 dark:bg-white/15 sm:hidden" />
      <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-extrabold">{title}</h2><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-xl dark:bg-white/5">×</button></div>
      {children}
    </div>
  </div>
}
