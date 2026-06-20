export function createId(prefix: string): string {
  const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${value}`
}

export function createStatEntryId(createdAt: string, index: number): string {
  return `${createdAt}-${String(index).padStart(6, '0')}-${createId('stat')}`
}

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function createInviteToken(length = 12): string {
  const values = new Uint8Array(length)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(values)
  else for (let index = 0; index < length; index += 1) values[index] = Math.floor(Math.random() * 256)
  return Array.from(values, value => INVITE_ALPHABET[value % INVITE_ALPHABET.length]).join('')
}

export function createMatchInviteCode(existingCodes: string[]): string {
  const existing = new Set(existingCodes.map(code => code.toUpperCase()))
  while (true) {
    const code = `CEF-${createInviteToken()}`
    if (!existing.has(code)) return code
  }
}
