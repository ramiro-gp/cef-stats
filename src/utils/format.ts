import type { MatchResult } from '../types'

export const resultLabels: Record<MatchResult, string> = {
  win: 'Victoria',
  draw: 'Empate',
  loss: 'Derrota',
}

export function formatEntryDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(value))
    .replace('.', '')
}

export function relativeTime(value: string): string {
  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000))
  if (diffMinutes < 1) return 'Recién'
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`
  const hours = Math.floor(diffMinutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'Ayer' : `Hace ${days} días`
}
