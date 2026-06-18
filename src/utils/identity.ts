export function normalizeHandle(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase()
}

export function isValidHandle(value: string): boolean {
  return /^[a-z0-9._]{3,24}$/.test(normalizeHandle(value))
}
