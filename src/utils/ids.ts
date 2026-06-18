export function createId(prefix: string): string {
  const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${value}`
}

export function createStatEntryId(createdAt: string, index: number): string {
  return `${createdAt}-${String(index).padStart(6, '0')}-${createId('stat')}`
}

export function createMatchInviteCode(existingCodes: string[]): string {
  const existing = new Set(existingCodes.map(code => code.toUpperCase()))
  while (true) {
    const code = `CEF-${createId('').replace(/[^a-z0-9]/gi, '').slice(-5).toUpperCase().padStart(5, '0')}`
    if (!existing.has(code)) return code
  }
}
