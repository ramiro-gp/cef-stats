import type { Group, Page, User } from '../types'
import { Logo } from './Logo'
import { BottomNav } from './BottomNav'
import { GroupSelector } from './GroupSelector'
import { CalendarIcon, HomeIcon, MoonIcon, PlusCircleIcon, SunIcon, TrophyIcon, UserIcon, UsersIcon } from './icons'
import { isPersonalScope } from '../utils/scopes'
import { appVersion } from '../config/appVersion'

const desktopItems = [
  { page: 'home' as const, label: 'Inicio', icon: HomeIcon },
  { page: 'add' as const, label: 'Cargar stats', icon: PlusCircleIcon },
  { page: 'matches' as const, label: 'Partidos', icon: CalendarIcon },
  { page: 'rankings' as const, label: 'Rankings', icon: TrophyIcon },
  { page: 'profile' as const, label: 'Mi perfil', icon: UserIcon },
  { page: 'groups' as const, label: 'Mis grupos', icon: UsersIcon },
]

interface Props {
  page: Page
  user: User
  group: Group | null
  groups: Group[]
  dark: boolean
  onTheme: () => void
  onSelectGroup: (group: Group) => void
  onNavigate: (page: Page) => void
  children: React.ReactNode
}

export function AppShell({ page, user, group, groups, dark, onTheme, onSelectGroup, onNavigate, children }: Props) {
  const personalScope = group ? isPersonalScope(group) : false
  return <div className="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-ink dark:text-white">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#09130f] lg:flex">
      <Logo />
      <p className="mt-2 text-xs text-slate-400">Tu fútbol, en números.</p>
      <nav className="mt-10 space-y-2">
        {desktopItems.map(({ page: itemPage, label, icon: Icon }) => <button key={itemPage} onClick={() => onNavigate(itemPage)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition ${page === itemPage ? 'bg-emerald-500 text-ink shadow-glow' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'}`}><Icon />{label}</button>)}
      </nav>
      <div className="mt-auto rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
        <div className="text-xs font-bold uppercase tracking-widest text-emerald-500">Grupo activo</div>
        <div className="mt-1 font-bold">{group?.name ?? 'Sin grupo activo'}</div>
        {group && <div className="mt-1 text-xs text-slate-400">{personalScope ? 'Stats personales · Local' : `${group.memberCount} jugadores · ${group.gamesCount} partidos`}</div>}
      </div>
      <p className="mt-3 text-center text-[10px] font-medium tracking-wide text-slate-400 dark:text-slate-500">{appVersion}</p>
    </aside>

    <div className="lg:pl-64">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-slate-50/90 px-3 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-ink/90 sm:px-4 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <div className="shrink-0 lg:hidden"><Logo compact /></div>
          <div className="min-w-0 flex-1 lg:flex-none"><GroupSelector activeGroup={group} groups={groups} onSelect={onSelectGroup} /></div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onTheme} aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">{dark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}</button>
            <button onClick={() => onNavigate('profile')} className="hidden h-10 min-w-10 place-items-center rounded-full bg-emerald-500 px-2 text-sm font-extrabold text-ink min-[380px]:grid">{user.avatar || user.initials}</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">{children}<p className="mt-10 text-center text-[10px] font-medium tracking-wide text-slate-400 dark:text-slate-500 lg:hidden">{appVersion}</p></main>
    </div>
    <BottomNav page={page} onNavigate={onNavigate} />
  </div>
}
