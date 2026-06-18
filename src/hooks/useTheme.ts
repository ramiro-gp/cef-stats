import { useEffect, useState } from 'react'
import { themeSettingsRepository } from '../data/appRepository'
import type { ThemeMode } from '../types'

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => themeSettingsRepository.load().mode)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const dark = theme === 'dark' || (theme === 'system' && systemDark)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    themeSettingsRepository.save({ mode: theme })
  }, [dark, theme])

  return { theme, setTheme, dark }
}
