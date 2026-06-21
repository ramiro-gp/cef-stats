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
    { target: 'app-scope', title: 'Elegí qué querés ver', text: 'Acá elegís tus datos personales, todos tus grupos o un grupo puntual.' },
    { target: 'nav-home', title: 'Inicio', text: 'Acá ves el resumen de tu temporada, tu racha y tu camino en el Mundial.' },
    { target: 'nav-add', title: 'Cargar', text: 'Acá cargás cómo te fue después de jugar: resultado, goles y asistencias.' },
    { target: 'nav-matches', title: 'Partidos', text: 'Acá armás partidos, compartís invitaciones y elegís equipos.' },
    { target: 'nav-groups', title: 'Grupos', text: 'Acá creás grupos con tus amigos o te unís con una invitación.' },
    { target: 'nav-rankings', title: 'Rankings y Estadísticas', text: 'Acá comparás tus números con los demás en tablas y gráficos.' },
    { target: 'nav-profile', title: 'Perfil y Ajustes', text: 'Acá editás tu perfil, compartís tu tarjeta y encontrás la ayuda.' },
  ],
  home: [
    { page: 'home', target: 'home-hero', title: 'Tu punto de partida', text: 'Desde acá podés cargar tus números o ir directo a tus partidos.' },
    { page: 'home', target: 'home-season', title: 'Mi temporada', text: 'Acá ves tus goles, asistencias, partidos, racha y avance en el Mundial.' },
    { page: 'home', target: 'home-activity', title: 'Últimas novedades', text: 'Acá aparecen las acciones recientes e importantes de la app.' },
    { page: 'home', target: 'app-scope', title: 'Elegí qué mirar', text: 'Personal muestra lo tuyo sin grupo. TODOS junta tus grupos y tus datos personales.' },
  ],
  add: [
    { page: 'add', target: 'add-context', title: 'Dónde cuenta', text: 'Elegí Personal o un grupo antes de guardar la carga.' },
    { page: 'add', target: 'add-result', title: 'Cómo te fue', text: 'Marcá Gané, Empaté o Perdí.' },
    { page: 'add', target: 'add-numbers', title: 'Tus números', text: 'Sumá goles, asistencias y los detalles del partido.' },
    { page: 'add', target: 'add-save', title: 'A la tabla', text: 'Guardá y Fulbo Stats actualiza temporada, ranking y racha.' },
  ],
  matches: [
    { page: 'matches', target: 'matches-heading', title: 'Partidos del grupo elegido', text: 'Esta pantalla muestra los partidos del grupo que elegiste ver. En Personal aparecen los partidos sin grupo y en TODOS se juntan todos.' },
    { page: 'matches', target: 'matches-create', title: 'Crear partido', text: 'Desde acá armás un partido nuevo, elegís horario, formato, grupo y nombres de equipos.' },
    { page: 'matches', target: 'matches-join', title: 'Unirme con código', text: 'Pegá un código o link para entrar a un partido que te compartieron.' },
    { page: 'matches', target: 'matches-list', title: 'Abrir un partido', text: 'Tocá una tarjeta para elegir equipo, ver el resultado, comentar en FOROBARDO y cargar o vincular tus números.' },
  ],
  groups: [
    { page: 'groups', target: 'groups-list', title: 'Tus grupos', text: 'Entrá a un grupo, copiá su invitación o editá los que creaste.' },
    { page: 'groups', target: 'groups-actions', title: 'Sumá al equipo', text: 'Creá un grupo nuevo o unite con un código.' },
  ],
  rankings: [
    { page: 'rankings', target: 'rankings-view', title: 'Ranking', text: 'En Ranking ves la tabla y comparás goles, asistencias, partidos y rendimiento.' },
    { page: 'rankings', target: 'rankings-view', title: 'Estadísticas', text: 'En Estadísticas ves gráficos y elegís qué jugadores querés comparar.' },
    { page: 'rankings', target: 'rankings-filters', title: 'Elegí qué partidos contar', text: 'Podés mirar amistosos, torneos y distintos formatos de fútbol.' },
  ],
  profile: [
    { page: 'profile', target: 'profile-card', title: 'Tu tarjeta completa', text: 'Resume todos tus goles, asistencias, partidos y récords.' },
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
