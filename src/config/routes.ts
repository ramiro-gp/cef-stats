import type { Page } from '../types'

export const pagePaths: Record<Page, string> = {
  home: '/',
  add: '/cargar',
  matches: '/partidos',
  rankings: '/rankings',
  profile: '/perfil',
  groups: '/grupos',
}

export function pageFromPathname(pathname: string): Page | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (normalized === '/' || normalized === '') return 'home'
  if (normalized === '/cargar') return 'add'
  if (normalized === '/partidos' || normalized.startsWith('/partidos/')) return 'matches'
  if (normalized === '/rankings') return 'rankings'
  if (normalized === '/perfil') return 'profile'
  if (normalized === '/grupos') return 'groups'
  return null
}
