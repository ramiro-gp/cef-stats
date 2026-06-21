import type { ThemeMode, ThemeSettings } from '../types'
import { createStringStorageAdapter } from './localStorageAdapter'

export const THEME_STORAGE_KEY = 'cef-theme'
const themeStorage = createStringStorageAdapter(THEME_STORAGE_KEY)

export const themeSettingsRepository = {
  load(): ThemeSettings {
    const mode = themeStorage.load()
    if (mode === 'system') return { mode: 'dark' }
    return { mode: isThemeMode(mode) ? mode : 'dark' }
  },
  save(settings: ThemeSettings): void {
    themeStorage.save(settings.mode)
  },
  clear(): void {
    themeStorage.clear()
  },
} satisfies { load: () => ThemeSettings; save: (settings: ThemeSettings) => void; clear: () => void }

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'dark' || value === 'light' || value === 'amoled'
}
