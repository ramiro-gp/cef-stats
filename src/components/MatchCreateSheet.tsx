import { useState } from 'react'
import type { Group, Match, MatchFormat, StatMatchType } from '../types'
import { ModalSheet } from './ModalSheet'
import { matchTeamNamePreferencesRepository } from '../data/matchTeamNamePreferencesRepository'

const formats: MatchFormat[] = ['F5', 'F6', 'F7', 'F8', 'F11']
const matchTypes: { value: StatMatchType; label: string }[] = [{ value: 'friendly', label: 'Amistoso' }, { value: 'tournament', label: 'Torneo' }]
const NO_GROUP_VALUE = '__no_group__'

const localDateTime = (value?: string) => {
  const date = value ? new Date(value) : new Date()
  if (!value && (date.getMinutes() || date.getSeconds() || date.getMilliseconds())) date.setHours(date.getHours() + 1)
  if (!value) date.setMinutes(0, 0, 0)
  const pad = (item: number) => String(item).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export interface MatchFormValues {
  title: string
  scheduledAt: string
  format: MatchFormat
  matchType: StatMatchType
  groupId?: string | null
  lightTeamName: string
  darkTeamName: string
}

interface Props {
  groups?: Group[]
  defaultGroupId?: string
  match?: Match
  onCreate: (values: MatchFormValues) => Match | Promise<Match>
  onClose: () => void
}

export function MatchCreateSheet({ groups, defaultGroupId = '', match, onCreate, onClose }: Props) {
  const editing = Boolean(match)
  const defaultGroup = groups?.find(group => group.id === defaultGroupId)
  const [title, setTitle] = useState(match?.title ?? 'Partido de hoy')
  const [scheduledAt, setScheduledAt] = useState(() => localDateTime(match?.scheduledAt))
  const [format, setFormat] = useState<MatchFormat>(match?.format ?? defaultGroup?.defaultFootballFormat ?? 'F5')
  const [matchType, setMatchType] = useState<StatMatchType>(match?.matchType ?? defaultGroup?.defaultMatchType ?? 'friendly')
  const [groupId, setGroupId] = useState(match ? match.groupId || NO_GROUP_VALUE : defaultGroupId)
  const [initialTeamNames] = useState(matchTeamNamePreferencesRepository.load)
  const [lightTeamName, setLightTeamName] = useState(match?.lightTeamName ?? initialTeamNames.light)
  const [darkTeamName, setDarkTeamName] = useState(match?.darkTeamName ?? initialTeamNames.dark)
  const [saveTeamNames, setSaveTeamNames] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const create = async () => {
    if (groups && !groupId) { setError('Elegí un grupo o Sin grupo.'); return }
    const cleanLightName = lightTeamName.trim().toUpperCase()
    const cleanDarkName = darkTeamName.trim().toUpperCase()
    if (!cleanLightName || !cleanDarkName) { setError('Completá los nombres de ambos equipos.'); return }
    if (cleanLightName === cleanDarkName) { setError('Los equipos deben tener nombres distintos.'); return }
    if (new Date(scheduledAt).getMinutes() % 15 !== 0) { setError('Elegí minutos 00, 15, 30 o 45.'); return }
    setSaving(true)
    setError('')
    try {
      await onCreate({ title: title.trim() || 'Partido de hoy', scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(), format, matchType, groupId: groups ? (groupId === NO_GROUP_VALUE ? null : groupId) : undefined, lightTeamName: cleanLightName, darkTeamName: cleanDarkName })
      if (saveTeamNames) matchTeamNamePreferencesRepository.save(cleanLightName, cleanDarkName)
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : editing ? 'No pudimos guardar el partido.' : 'No pudimos crear el partido.')
    } finally {
      setSaving(false)
    }
  }

  return <ModalSheet title={editing ? 'Editar partido' : '+ Partido'} onClose={onClose}>
    {groups && <label className="mb-4 block"><span className="text-xs font-bold text-slate-500">Grupo anfitrión</span><select value={groupId} disabled={editing} onChange={event => { const nextGroupId = event.target.value; setGroupId(nextGroupId); const selectedGroup = groups.find(group => group.id === nextGroupId); if (selectedGroup?.defaultFootballFormat) setFormat(selectedGroup.defaultFootballFormat); if (selectedGroup?.defaultMatchType) setMatchType(selectedGroup.defaultMatchType) }} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-bold outline-none focus:border-emerald-500 disabled:opacity-60 dark:border-white/10 dark:bg-[#102019]"><option value="">Elegí una opción</option><option value={NO_GROUP_VALUE}>Sin grupo</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select><span className="mt-2 block text-[11px] leading-5 text-slate-400">{editing ? 'El grupo anfitrión no se cambia desde esta edición.' : 'Usá Sin grupo para partidos mezclados. El link suma participantes al partido, no a un grupo.'}</span></label>}
    <label className="block"><span className="text-xs font-bold text-slate-500">Nombre opcional</span><input value={title} onChange={event => setTitle(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 outline-none focus:border-emerald-500 dark:border-white/10" /></label>
    <label className="mt-4 block"><span className="text-xs font-bold text-slate-500">Fecha y horario</span><input type="datetime-local" step="900" value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 outline-none focus:border-emerald-500 dark:border-white/10" /><span className="mt-1 block text-[11px] text-slate-400">Minutos disponibles: 00, 15, 30 o 45.</span></label>
    <div className="mt-4"><span className="text-xs font-bold text-slate-500">Tipo</span><div className="mt-2 grid grid-cols-2 gap-2">{matchTypes.map(item => <button key={item.value} type="button" onClick={() => setMatchType(item.value)} className={`min-h-11 rounded-xl text-xs font-bold ${matchType === item.value ? 'bg-emerald-500 text-ink' : 'border border-slate-200 dark:border-white/10'}`}>{item.label}</button>)}</div></div>
    <div className="mt-4"><span className="text-xs font-bold text-slate-500">Formato</span><div className="mt-2 grid grid-cols-5 gap-2">{formats.map(item => <button key={item} type="button" onClick={() => setFormat(item)} className={`min-h-11 rounded-xl text-xs font-bold ${format === item ? 'bg-emerald-500 text-ink' : 'border border-slate-200 dark:border-white/10'}`}>{item}</button>)}</div></div>
    <div className="mt-4 grid grid-cols-2 gap-3"><label><span className="text-xs font-bold text-slate-500">Equipo claro</span><input value={lightTeamName} maxLength={24} onChange={event => setLightTeamName(event.target.value.toUpperCase())} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 font-bold outline-none focus:border-emerald-500 dark:border-white/10" /></label><label><span className="text-xs font-bold text-slate-500">Equipo oscuro</span><input value={darkTeamName} maxLength={24} onChange={event => setDarkTeamName(event.target.value.toUpperCase())} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 font-bold outline-none focus:border-emerald-500 dark:border-white/10" /></label></div>
    {!editing && <label className="mt-3 flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-semibold dark:border-white/10"><input type="checkbox" checked={saveTeamNames} onChange={event => setSaveTeamNames(event.target.checked)} className="h-4 w-4 accent-emerald-500" />Guardar nombres para el siguiente partido</label>}
    {error && <p className="mt-3 text-sm font-bold text-rose-500">{error}</p>}
    <div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onClose} disabled={saving} className="min-h-12 rounded-xl border border-slate-200 font-bold disabled:opacity-50 dark:border-white/10">Cancelar</button><button onClick={() => void create()} disabled={saving || Boolean(groups && !groupId)} className="min-h-12 rounded-xl bg-emerald-500 font-extrabold text-ink disabled:opacity-50">{saving ? 'Guardando...' : editing ? 'Guardar partido' : 'Crear partido'}</button></div>
  </ModalSheet>
}
