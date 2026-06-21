import type { Group } from '../types'

const PERSONAL_PREFIX = 'personal:'
const ALL_PREFIX = 'all:'

export function createAllScope(userId: string): Group {
  return { id: `${ALL_PREFIX}${userId}`, name: 'TODOS', code: 'ALL', memberCount: 0, gamesCount: 0, emoji: '🌐', spicyMode: true, seeded: false }
}

export function createPersonalScope(userId: string): Group {
  return { id: `${PERSONAL_PREFIX}${userId}`, name: 'Personal (sin grupo)', code: 'PERSONAL', memberCount: 1, gamesCount: 0, emoji: '👤', spicyMode: true, seeded: false }
}

export function isPersonalScope(group: Pick<Group, 'id'>): boolean {
  return group.id.startsWith(PERSONAL_PREFIX)
}

export function isAllScope(group: Pick<Group, 'id'>): boolean {
  return group.id.startsWith(ALL_PREFIX)
}

export function isVirtualScope(group: Pick<Group, 'id'>): boolean {
  return isAllScope(group) || isPersonalScope(group)
}
