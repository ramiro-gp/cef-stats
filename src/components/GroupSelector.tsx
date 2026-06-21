import { useEffect, useRef, useState } from 'react'
import type { Group } from '../types'
import { CheckIcon, ChevronRight, UsersIcon } from './icons'
import { isAllScope, isPersonalScope } from '../utils/scopes'

interface Props {
  activeGroup: Group | null
  groups: Group[]
  onSelect: (group: Group) => void
}

export function GroupSelector({ activeGroup, groups, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  return <div ref={root} className="relative">
    <button onClick={() => setOpen(value => !value)} aria-expanded={open} aria-haspopup="listbox" className={`flex h-10 max-w-56 items-center gap-2 rounded-xl border bg-white px-2.5 text-xs font-bold shadow-sm transition sm:max-w-72 sm:px-3 sm:text-sm dark:bg-white/5 ${open ? 'border-emerald-500' : 'border-slate-200 hover:border-emerald-400 dark:border-white/10'}`}>
      <span className="shrink-0 text-base leading-none">{activeGroup?.emoji || '⚽'}</span>
      <span className="truncate"><span className="font-medium text-slate-400">Estás viendo:</span> {activeGroup?.name ?? 'Sin vista'}</span>
      <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition ${open ? '-rotate-90' : 'rotate-90'}`} />
    </button>
    {open && <div role="listbox" className="absolute right-0 top-12 z-50 w-72 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-[#102019]">
      <div className="flex items-center gap-2 px-2.5 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"><UsersIcon className="h-4 w-4" /> Cambiar lo que estás viendo</div>
      {groups.length === 0 && <p className="px-2.5 py-3 text-xs text-slate-400">Creá o unite a un grupo.</p>}
      {groups.map(group => {
        const active = group.id === activeGroup?.id
        const all = isAllScope(group)
        const personal = isPersonalScope(group)
        return <button role="option" aria-selected={active} key={group.id} onClick={() => { onSelect(group); setOpen(false) }} className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${active ? 'bg-emerald-500/10' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-lg dark:bg-white/10">{group.emoji || '⚽'}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{group.name}</span><span className="mt-0.5 block text-[10px] text-slate-400">{all ? 'Grupos + Personal sin grupo' : personal ? 'Sólo tus cargas y partidos sin grupo' : `${group.memberCount} jugadores`}</span></span>
          {active && <CheckIcon className="h-4 w-4 text-emerald-500" />}
        </button>
      })}
    </div>}
  </div>
}
