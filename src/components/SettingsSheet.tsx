import { useState } from 'react'
import { appVersion } from '../config/appVersion'
import { APP_NAME } from '../config/appBrand'
import type { LoadFormatPreference, LoadMatchTypePreference, PlayerPosition, ThemeMode, User } from '../types'
import { LoadPreferencesFields } from './LoadPreferencesFields'
import { ModalSheet } from './ModalSheet'
import type { ProductTourId } from '../config/productTours'

interface Props {
  user: User
  theme: ThemeMode
  onTheme: (theme: ThemeMode) => void
  onSaveUser: (user: User) => void | string | Promise<void | string>
  onClose: () => void
  onStartTour: (tourId: ProductTourId) => void
  onOpenGuide: () => void
  canInstall: boolean
  installed: boolean
  onInstall: () => Promise<boolean>
}

export function SettingsSheet({ user, theme, onTheme, onSaveUser, onClose, onStartTour, onOpenGuide, canInstall, installed, onInstall }: Props) {
  const [position, setPosition] = useState<PlayerPosition | ''>(user.position)
  const [defaultMatchType, setDefaultMatchType] = useState<LoadMatchTypePreference>(user.defaultMatchType)
  const [defaultFootballFormat, setDefaultFootballFormat] = useState<LoadFormatPreference>(user.defaultFootballFormat)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [installing, setInstalling] = useState(false)

  const save = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const saveError = await onSaveUser({ ...user, position, defaultMatchType, defaultFootballFormat })
      if (saveError) { setError(saveError); return }
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos guardar los ajustes.')
    } finally {
      setSaving(false)
    }
  }

  return <ModalSheet title="Ajustes" onClose={onClose}>
    <section><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Apariencia</p><div className="mt-3 grid grid-cols-3 gap-2">{(['light', 'dark', 'amoled'] as ThemeMode[]).map(mode => <button key={mode} onClick={() => onTheme(mode)} className={`min-h-11 rounded-xl text-sm font-bold ${theme === mode ? 'bg-emerald-500 text-ink' : 'border border-slate-200 dark:border-white/10'}`}>{mode === 'light' ? 'Claro' : mode === 'dark' ? 'Oscuro' : 'AMOLED'}</button>)}</div></section>
    <div className="mt-6"><LoadPreferencesFields position={position} defaultMatchType={defaultMatchType} defaultFootballFormat={defaultFootballFormat} onPosition={setPosition} onMatchType={setDefaultMatchType} onFootballFormat={setDefaultFootballFormat} /></div>
    <section className="mt-6 border-t border-slate-200 pt-5 dark:border-white/10"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Ayuda y recorridos</p><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">Repasá toda la app o elegí una pantalla.</p><button type="button" onClick={() => { onClose(); onOpenGuide() }} className="mt-4 min-h-12 w-full rounded-xl border border-emerald-500/30 font-extrabold text-emerald-600 dark:text-emerald-400">Guía de uso y reglas</button><button type="button" onClick={() => { onClose(); onStartTour('general') }} className="mt-2 min-h-12 w-full rounded-xl bg-emerald-500 font-extrabold text-ink">Ver recorrido inicial</button><div className="mt-3 grid grid-cols-2 gap-2">{([['home', 'Inicio'], ['add', 'Cargar'], ['matches', 'Partidos'], ['groups', 'Grupos'], ['rankings', 'Rankings'], ['profile', 'Perfil']] as [ProductTourId, string][]).map(([tourId, label]) => <button type="button" key={tourId} onClick={() => { onClose(); onStartTour(tourId) }} className="min-h-11 rounded-xl border border-slate-200 text-xs font-bold dark:border-white/10">{label}</button>)}</div></section>
    <section className="mt-6 border-t border-slate-200 pt-5 dark:border-white/10"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Instalar Fulbo Stats</p><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">Usala como una app, con acceso desde tu pantalla de inicio. Tus datos siguen sincronizándose online con tu cuenta.</p>{canInstall && <button type="button" disabled={installing} onClick={() => { setInstalling(true); void onInstall().finally(() => setInstalling(false)) }} className="mt-3 min-h-12 w-full rounded-xl bg-emerald-500 font-extrabold text-ink disabled:opacity-50">{installing ? 'Abriendo instalación...' : 'Instalar app'}</button>}{installed && <p className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">Fulbo Stats ya está abierta como app instalada.</p>}<div className="mt-3 space-y-1 text-xs leading-5 text-slate-400"><p><strong>Android:</strong> menú de Chrome → Instalar app.</p><p><strong>iPhone:</strong> Compartir → Agregar a pantalla de inicio.</p><p><strong>Windows:</strong> usá el ícono Instalar de Chrome o Edge.</p></div></section>
    {error && <p className="mt-3 text-sm font-semibold text-rose-500">{error}</p>}
    <button type="button" onClick={() => void save()} disabled={saving} className="mt-5 min-h-12 w-full rounded-xl bg-emerald-500 font-extrabold text-ink disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar ajustes'}</button>
    <p className="mt-6 text-center text-xs text-slate-400">{APP_NAME} {appVersion}<span className="mx-1.5">·</span>Desarrollado por <a href="https://ramirogp.me" target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-600 underline-offset-2 hover:underline dark:text-emerald-400">Ramiro GP</a></p>
  </ModalSheet>
}
