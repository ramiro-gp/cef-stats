import type { Page } from '../types'
import { CalendarIcon, HomeIcon, PlusCircleIcon, TrophyIcon, UserIcon } from './icons'

const items = [
  { page: 'home' as const, label: 'Inicio', icon: HomeIcon },
  { page: 'add' as const, label: 'Cargar', icon: PlusCircleIcon },
  { page: 'matches' as const, label: 'Partidos', icon: CalendarIcon },
  { page: 'rankings' as const, label: 'Rankings', icon: TrophyIcon },
  { page: 'profile' as const, label: 'Perfil', icon: UserIcon },
]

export function BottomNav({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  return <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl dark:border-white/10 dark:bg-[#09130f]/90 lg:hidden">
    <div className="mx-auto grid max-w-lg grid-cols-5">
      {items.map(({ page: itemPage, label, icon: Icon }) => {
        const active = page === itemPage
        return <button key={itemPage} onClick={() => onNavigate(itemPage)} className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition ${active ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
          {active && <span className="absolute top-0 h-1 w-5 rounded-full bg-emerald-500" />}
          <Icon className={active ? 'stroke-[2.4]' : ''} />
          {label}
        </button>
      })}
    </div>
  </nav>
}
