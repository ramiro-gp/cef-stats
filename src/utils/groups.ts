import type { Group } from '../types'
import { compactInviteCode, createReadableInviteCode, formatInviteCode } from './inviteCodes'

export function createUniqueGroupCode(_name: string, groups: Group[]): string {
  const existing = new Set(groups.map(group => compactInviteCode(group.code)))
  let code = createReadableInviteCode()
  while (existing.has(compactInviteCode(code))) code = createReadableInviteCode()
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
    if (queryCode) return formatInviteCode(queryCode)
    const pathMatch = url.pathname.match(/\/join\/(?:group\/)?([^/?#]+)/i)
    return pathMatch ? formatInviteCode(decodeURIComponent(pathMatch[1])) : ''
  } catch {
    const pathMatch = trimmed.match(/\/join\/(?:group\/)?([^/?#]+)/i)
    const rawCode = pathMatch?.[1] ?? trimmed
    return formatInviteCode(decodeURIComponent(rawCode).split(/[?#]/)[0])
  }
}

export function createGroupInviteLink(code: string, origin: string): string {
  const url = new URL('/', origin)
  url.searchParams.set('joinGroup', normalizeGroupCode(code))
  return url.toString()
}
