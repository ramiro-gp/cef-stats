import type { Page } from '../types'

export type ProductTourId = 'general' | Page

export interface ProductTourStep {
  page?: Page
  target: string
  title: string
  text: string
}

export const productTours: Record<ProductTourId, ProductTourStep[]> = {
  general: [
    { target: 'app-scope', title: 'Elegí tu cancha', text: 'Cambiá entre Personal, TODOS o un grupo. Inicio, Partidos y Rankings respetan este scope.' },
    { target: 'nav-home', title: 'Inicio', text: 'Tu temporada, racha y progreso del Mundial de un vistazo.' },
    { target: 'nav-add', title: 'Cargar', text: 'Guardá resultado, goles y asistencias en pocos toques.' },
    { target: 'nav-matches', title: 'Partidos', text: 'Creá fechas, compartí el código y armá los equipos.' },
    { target: 'nav-groups', title: 'Grupos', text: 'Jugá con los tuyos: creá grupos o unite con invitación.' },
    { target: 'nav-rankings', title: 'Rankings y Estadísticas', text: 'Compará números con filtros y gráficos según el scope activo.' },
    { target: 'nav-profile', title: 'Perfil y Ajustes', text: 'Editá tu perfil, compartí tu tarjeta y volvé a abrir estas guías.' },
  ],
  home: [
    { page: 'home', target: 'home-hero', title: 'Tu resumen', text: 'Acá empieza cada fecha: estado actual y acceso rápido a tus números.' },
    { page: 'home', target: 'home-season', title: 'Mi temporada', text: 'Goles, asistencias y partidos siempre siguen el scope elegido.' },
    { page: 'home', target: 'app-scope', title: 'Probá otro scope', text: 'Personal muestra lo tuyo sin grupo; TODOS suma tus grupos y Personal.' },
  ],
  add: [
    { page: 'add', target: 'add-context', title: 'Dónde cuenta', text: 'Elegí Personal o un grupo antes de guardar la carga.' },
    { page: 'add', target: 'add-result', title: 'Cómo te fue', text: 'Marcá Gané, Empaté o Perdí.' },
    { page: 'add', target: 'add-numbers', title: 'Tus números', text: 'Sumá goles, asistencias y los detalles del partido.' },
    { page: 'add', target: 'add-save', title: 'A la tabla', text: 'Guardá y Fulbo Stats actualiza temporada, ranking y racha.' },
  ],
  matches: [
    { page: 'matches', target: 'matches-list', title: 'Armá o unite', text: 'Arriba podés crear un partido o entrar con un código de invitación.' },
    { page: 'matches', target: 'matches-list', title: 'Tus partidos', text: 'La lista respeta el scope y se pagina para que mobile siga liviano.' },
  ],
  groups: [
    { page: 'groups', target: 'groups-list', title: 'Tus grupos', text: 'Entrá a un grupo, copiá su invitación o editá los que creaste.' },
    { page: 'groups', target: 'groups-actions', title: 'Sumá al equipo', text: 'Creá un grupo nuevo o unite con un código.' },
  ],
  rankings: [
    { page: 'rankings', target: 'rankings-view', title: 'Dos formas de mirar', text: 'Alterná entre la tabla clásica y los gráficos comparativos.' },
    { page: 'rankings', target: 'rankings-filters', title: 'Filtrá la cancha', text: 'Combiná Amistoso o Torneo con F5, F6, F7, F8 o F11.' },
    { page: 'rankings', target: 'rankings-view', title: 'Compará', text: 'La tabla y los gráficos usan el mismo scope y filtros que elegiste arriba.' },
  ],
  profile: [
    { page: 'profile', target: 'profile-card', title: 'Tu tarjeta global', text: 'Resume todos tus goles, asistencias, partidos y récords, sin importar el scope.' },
    { page: 'profile', target: 'profile-history', title: 'Tu historial', text: 'Revisá, filtrá y editá tus cargas personales.' },
    { page: 'profile', target: 'profile-settings', title: 'Ajustes y ayuda', text: 'Cambiá preferencias y volvé a iniciar cualquier recorrido.' },
  ],
}

const INITIAL_TOUR_KEY = 'fulbo-stats:onboarding:initial:v1'

export function hasSeenInitialTour(userId: string): boolean {
  try { return window.localStorage.getItem(`${INITIAL_TOUR_KEY}:${userId}`) === 'seen' }
  catch { return true }
}

export function markInitialTourSeen(userId: string): void {
  try { window.localStorage.setItem(`${INITIAL_TOUR_KEY}:${userId}`, 'seen') }
  catch { /* La preferencia es opcional: nunca bloquea la app. */ }
}
