import type { Group } from '../types'

export function createUniqueGroupCode(name: string, groups: Group[]): string {
  const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).map(word => word.slice(0, 4)).join('-').toUpperCase().slice(0, 14) || 'GRUPO'
  let code = base
  let suffix = 2
  while (groups.some(group => group.code.toUpperCase() === code)) code = `${base}-${suffix++}`
  return code
}

export function normalizeGroupCode(value: string): string {
  return value.trim().toUpperCase()
}
