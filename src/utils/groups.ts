import type { Group } from '../types'
import { createInviteToken } from './ids'

export function createUniqueGroupCode(_name: string, groups: Group[]): string {
  const existing = new Set(groups.map(group => group.code.toUpperCase()))
  let code = `CEF-${createInviteToken()}`
  while (existing.has(code)) code = `CEF-${createInviteToken()}`
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
