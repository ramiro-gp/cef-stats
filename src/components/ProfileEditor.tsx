import { useState } from 'react'
import type { LoadFormatPreference, LoadMatchTypePreference, PlayerPosition, User } from '../types'
import { isValidHandle, normalizeHandle } from '../utils/identity'
import { ModalSheet } from './ModalSheet'
import { LoadPreferencesFields } from './LoadPreferencesFields'
import { avatarOptions } from '../data/avatarOptions'
import { UserAvatar } from './UserAvatar'

export function ProfileEditor({ user, accountMode = false, onSave, onClose }: { user: User; accountMode?: boolean; onSave: (user: User) => void | string | Promise<void | string>; onClose: () => void }) {
  const [name, setName] = useState(user.name)
  const [nickname, setNickname] = useState(user.nickname)
  const [avatar, setAvatar] = useState(user.avatar || user.initials)
  const [username, setUsername] = useState(user.username.replace(/^@/, ''))
  const [position, setPosition] = useState<PlayerPosition | ''>(user.position)
  const [defaultMatchType, setDefaultMatchType] = useState<LoadMatchTypePreference>(user.defaultMatchType)
  const [defaultFootballFormat, setDefaultFootballFormat] = useState<LoadFormatPreference>(user.defaultFootballFormat)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const cleanUsername = normalizeHandle(username)
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    if (!isValidHandle(cleanUsername)) { setError('El @usuario debe tener 3–24 caracteres: letras, números, punto o guion bajo.'); return }
    const fallbackInitials = name.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
    setSaving(true)
    setError('')
    try {
      const saveError = await onSave({ ...user, name: name.trim(), nickname: accountMode ? name.trim() : nickname.trim(), username: cleanUsername, avatar: avatar.trim() || fallbackInitials, initials: fallbackInitials, position, defaultMatchType, defaultFootballFormat })
      if (saveError) { setError(saveError); return }
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos guardar el perfil.')
    } finally {
      setSaving(false)
    }
  }

  return <ModalSheet title="Editar perfil" onClose={onClose}>
    <div className="mb-5 flex items-center gap-4"><UserAvatar value={avatar} fallback={name.trim().slice(0, 2).toUpperCase()} className="h-16 w-16 rounded-2xl text-xl" /><p className="text-sm leading-6 text-slate-400">Elegí un avatar genérico o mantené tus iniciales.</p></div>
    <div className="space-y-4">
      <label className="block"><span className="text-xs font-bold text-slate-500">Nombre</span><input value={name} onChange={event => setName(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 outline-none focus:border-emerald-500 dark:border-white/10" /></label>
      {!accountMode && <label className="block"><span className="text-xs font-bold text-slate-500">Apodo opcional</span><input value={nickname} onChange={event => setNickname(event.target.value)} placeholder="Podés configurarlo después" className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 outline-none focus:border-emerald-500 dark:border-white/10" /></label>}
      <label className="block"><span className="text-xs font-bold text-slate-500">@usuario</span><div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">@</span><input value={username} maxLength={24} onChange={event => setUsername(event.target.value.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9._]/g, ''))} className="h-12 w-full rounded-xl border border-slate-200 bg-transparent pl-8 pr-3 outline-none focus:border-emerald-500 dark:border-white/10" /></div></label>
      <section><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-500">Avatar</span><button type="button" onClick={() => setAvatar('')} className="text-xs font-bold text-emerald-500">Usar iniciales</button></div><div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">{avatarOptions.map((option, index) => <button type="button" key={option.key} onClick={() => setAvatar(option.key)} aria-label={`Elegir avatar ${index + 1}`} aria-pressed={avatar === option.key} className={`min-w-0 rounded-2xl border-2 p-1 transition ${avatar === option.key ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/25'}`}><UserAvatar value={option.key} className="aspect-square w-full rounded-xl" /></button>)}</div></section>
      <LoadPreferencesFields position={position} defaultMatchType={defaultMatchType} defaultFootballFormat={defaultFootballFormat} onPosition={setPosition} onMatchType={setDefaultMatchType} onFootballFormat={setDefaultFootballFormat} />
    </div>
    {error && <p className="mt-3 text-sm font-semibold text-rose-500">{error}</p>}
    <div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onClose} disabled={saving} className="min-h-12 rounded-xl border border-slate-200 font-bold disabled:opacity-50 dark:border-white/10">Cancelar</button><button onClick={save} disabled={saving} className="min-h-12 rounded-xl bg-emerald-500 font-extrabold text-ink disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar'}</button></div>
  </ModalSheet>
}
