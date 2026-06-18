import type { Group } from '../types'

const PERSONAL_PREFIX = 'personal:'

export function createPersonalScope(userId: string): Group {
  return { id: `${PERSONAL_PREFIX}${userId}`, name: 'Mi historial', code: 'PERSONAL', memberCount: 1, gamesCount: 0, emoji: '👤', spicyMode: true, seeded: false }
}

export function isPersonalScope(group: Pick<Group, 'id'>): boolean {
  return group.id.startsWith(PERSONAL_PREFIX)
}
