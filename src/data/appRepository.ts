import type { AppState, Group, ThemeMode, ThemeSettings } from '../types'
import { createJsonStorageAdapter, createStringStorageAdapter } from './localStorageAdapter'

export const APP_STORAGE_KEY = 'cef-stats-local-v1'
export const THEME_STORAGE_KEY = 'cef-theme'

export type PersistedAppState = Partial<AppState> & { group?: Group }

export interface AppRepository {
  load: () => PersistedAppState | null
  save: (state: AppState) => void
  clear: () => void
}

const appStorage = createJsonStorageAdapter<PersistedAppState>(APP_STORAGE_KEY)
const themeStorage = createStringStorageAdapter(THEME_STORAGE_KEY)

export const appRepository: AppRepository = {
  load: appStorage.load,
  save: appStorage.save,
  clear: appStorage.clear,
}

export const themeSettingsRepository = {
  load(): ThemeSettings {
    const mode = themeStorage.load()
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
  return value === 'dark' || value === 'light' || value === 'system'
}
