import type { Group } from '../types'

export function createUniqueGroupCode(name: string, groups: Group[]): string {
  const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).map(word => word.slice(0, 4)).join('-').toUpperCase().slice(0, 14) || 'GRUPO'
  let code = base
  let suffix = 2
  while (groups.some(group => group.code.toUpperCase() === code)) code = `${base}-${suffix++}`
  return code
}

export function normalizeGroupCode(value: string): string {
  return extractGroupInviteCode(value)
}

export function extractGroupInviteCode(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    const queryCode = url.searchParams.get('joinGroup') ?? url.searchParams.get('groupCode')
    if (queryCode) return queryCode.trim().toUpperCase()
    const pathMatch = url.pathname.match(/\/join\/(?:group\/)?([^/?#]+)/i)
    return pathMatch ? decodeURIComponent(pathMatch[1]).trim().toUpperCase() : ''
  } catch {
    const pathMatch = trimmed.match(/\/join\/(?:group\/)?([^/?#]+)/i)
    const rawCode = pathMatch?.[1] ?? trimmed
    return decodeURIComponent(rawCode).split(/[?#]/)[0].trim().toUpperCase()
  }
}

export function createGroupInviteLink(code: string, origin: string): string {
  const url = new URL('/', origin)
  url.searchParams.set('joinGroup', normalizeGroupCode(code))
  return url.toString()
}
