import { createInviteToken } from './ids'

const READABLE_ALPHABET_PATTERN = '[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]'

export function compactInviteCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function createReadableInviteCode(): string {
  const token = createInviteToken(8)
  return `${token.slice(0, 4)}-${token.slice(4)}`
}

export function formatInviteCode(value: string): string {
  const compact = compactInviteCode(value)
  return new RegExp(`^${READABLE_ALPHABET_PATTERN}{8}$`).test(compact) ? `${compact.slice(0, 4)}-${compact.slice(4)}` : value.trim().toUpperCase()
}

export function formatInviteCodeInput(value: string): string {
  if (/[/?#]/.test(value)) return value
  const compact = compactInviteCode(value)
  if (compact.startsWith('CEF') || compact.startsWith('FUL') || compact.length > 8) return value.toUpperCase()
  return compact.length > 4 ? `${compact.slice(0, 4)}-${compact.slice(4, 8)}` : compact
}

export function inviteCodesEqual(left: string, right: string): boolean {
  return compactInviteCode(left) === compactInviteCode(right)
}

export function isSupportedInviteCode(value: string): boolean {
  const compact = compactInviteCode(value)
  return new RegExp(`^${READABLE_ALPHABET_PATTERN}{8}$`).test(compact)
    || /^CEF[A-Z0-9]{5}$/.test(compact)
    || new RegExp(`^CEF${READABLE_ALPHABET_PATTERN}{12}$`).test(compact)
    || new RegExp(`^FUL${READABLE_ALPHABET_PATTERN}{12}$`).test(compact)
}
