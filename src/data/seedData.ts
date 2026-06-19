import type { ActivityFeedItem, Group, RankingPlayer, User } from '../types'

export const defaultUser: User = {
  id: 'user-ramiro',
  name: 'Ramiro',
  nickname: '',
  username: 'rami10',
  initials: 'RA',
  avatar: 'RA',
  position: '',
  defaultMatchType: 'friendly',
  defaultFootballFormat: 'F5',
}

export const defaultGroup: Group = {
  id: 'group-cef-miercoles',
  name: 'CEF Miércoles',
  code: 'CEF-MIE-24',
  memberCount: 12,
  gamesCount: 18,
  emoji: '⚽',
  spicyMode: true,
  seeded: true,
}

export const availableGroups: Group[] = [
  defaultGroup,
  { id: 'group-barrio', name: 'Los del Barrio', code: 'BAR-2024', memberCount: 9, gamesCount: 7, emoji: '🏟️', spicyMode: true, seeded: true },
  { id: 'group-viernes', name: 'Fútbol 5 Viernes', code: 'F5-VIE', memberCount: 10, gamesCount: 4, emoji: '🔥', spicyMode: false, seeded: true },
]

// Números históricos mock. Las nuevas cargas locales se suman al usuario actual.
export const baseCurrentPlayer: RankingPlayer = {
  id: defaultUser.id,
  name: defaultUser.name,
  initials: defaultUser.initials,
  accent: 'bg-emerald-500',
  goals: 18,
  assists: 11,
  matches: 18,
  wins: 12,
  draws: 3,
  losses: 3,
  average: 1,
  worldCupsWon: 0,
  worldCupStage: 'group',
  isCurrentUser: true,
}

export const mockRankingPlayers: RankingPlayer[] = [
  { id: 'fede', name: 'Fede', initials: 'FE', goals: 22, assists: 7, matches: 20, wins: 13, draws: 3, losses: 4, average: 1.1, worldCupsWon: 1, worldCupStage: 'quarterFinal', accent: 'bg-violet-500' },
  { id: 'thiago', name: 'Thiago', initials: 'TH', goals: 16, assists: 14, matches: 19, wins: 11, draws: 4, losses: 4, average: 0.84, worldCupsWon: 0, worldCupStage: 'semiFinal', accent: 'bg-sky-500' },
  { id: 'nacho', name: 'Nacho', initials: 'NA', goals: 15, assists: 9, matches: 18, wins: 9, draws: 5, losses: 4, average: 0.83, worldCupsWon: 0, worldCupStage: 'roundOf16', accent: 'bg-amber-500' },
  { id: 'lucas', name: 'Lucas', initials: 'LU', goals: 13, assists: 12, matches: 20, wins: 8, draws: 6, losses: 6, average: 0.65, worldCupsWon: 0, worldCupStage: 'group', accent: 'bg-rose-500' },
]

export const seedFeed: ActivityFeedItem[] = [
  { id: 'seed-1', groupId: defaultGroup.id, icon: 'trophy', category: 'world_cup', important: true, text: 'Thiago llegó a semifinal de su Mundial Personal.', createdAt: '2026-06-17T14:00:00.000Z' },
  { id: 'seed-2', groupId: defaultGroup.id, icon: 'up', category: 'ranking_change', important: true, text: 'Fede superó a Lucas en goles.', createdAt: '2026-06-16T21:00:00.000Z' },
  { id: 'seed-3', groupId: defaultGroup.id, icon: 'fire', category: 'streak', important: true, text: 'Nacho lleva 3 partidos seguidos convirtiendo.', createdAt: '2026-06-15T21:00:00.000Z' },
]

export const reservedMockHandles = ['fede', 'thiago', 'nacho', 'lucas']
