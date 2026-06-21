import { useEffect, useState } from 'react'
import { themeSettingsRepository } from '../data/appRepository'
import type { ThemeMode } from '../types'

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => themeSettingsRepository.load().mode)
  const dark = theme === 'dark' || theme === 'amoled'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.classList.toggle('theme-amoled', theme === 'amoled')
    themeSettingsRepository.save({ mode: theme })
  }, [dark, theme])

  return { theme, setTheme, dark }
}
