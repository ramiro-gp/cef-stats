import { useState } from 'react'
import type { Group, Match, MatchFormat } from '../types'
import { ModalSheet } from './ModalSheet'

const formats: MatchFormat[] = ['F5', 'F6', 'F7', 'F8', 'F11']
const localDateTime = () => {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

interface CreateMatchValues {
  title: string
  scheduledAt: string
  format?: MatchFormat
  groupId?: string | null
}

const NO_GROUP_VALUE = '__no_group__'

export function MatchCreateSheet({ groups, defaultGroupId = '', onCreate, onClose }: { groups?: Group[]; defaultGroupId?: string; onCreate: (values: CreateMatchValues) => Match | Promise<Match>; onClose: () => void }) {
  const [title, setTitle] = useState('Partido de hoy')
  const [scheduledAt, setScheduledAt] = useState(localDateTime)
  const [format, setFormat] = useState<MatchFormat>('F5')
  const [groupId, setGroupId] = useState(defaultGroupId)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const create = async () => {
    if (groups && !groupId) { setError('Elegí un grupo o Sin grupo.'); return }
    setSaving(true)
    setError('')
    try {
      await onCreate({ title: title.trim() || 'Partido de hoy', scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(), format, groupId: groups ? (groupId === NO_GROUP_VALUE ? null : groupId) : undefined })
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos crear el partido.')
    } finally {
      setSaving(false)
    }
  }

  return <ModalSheet title="+ Partido" onClose={onClose}>
    {groups && <label className="mb-4 block"><span className="text-xs font-bold text-slate-500">Grupo anfitrión</span><select value={groupId} onChange={event => setGroupId(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-bold outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#102019]"><option value="">Elegí una opción</option><option value={NO_GROUP_VALUE}>Sin grupo</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select><span className="mt-2 block text-[11px] leading-5 text-slate-400">Usá Sin grupo para partidos mezclados. El link suma participantes al partido, no a un grupo.</span></label>}
    <label className="block"><span className="text-xs font-bold text-slate-500">Nombre opcional</span><input value={title} onChange={event => setTitle(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 outline-none focus:border-emerald-500 dark:border-white/10" /></label>
    <label className="mt-4 block"><span className="text-xs font-bold text-slate-500">Fecha</span><input type="datetime-local" value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 outline-none focus:border-emerald-500 dark:border-white/10" /></label>
    <div className="mt-4"><span className="text-xs font-bold text-slate-500">Formato</span><div className="mt-2 grid grid-cols-5 gap-2">{formats.map(item => <button key={item} onClick={() => setFormat(item)} className={`min-h-11 rounded-xl text-xs font-bold ${format === item ? 'bg-emerald-500 text-ink' : 'border border-slate-200 dark:border-white/10'}`}>{item}</button>)}</div></div>
    {error && <p className="mt-3 text-sm font-bold text-rose-500">{error}</p>}
    <div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onClose} disabled={saving} className="min-h-12 rounded-xl border border-slate-200 font-bold disabled:opacity-50 dark:border-white/10">Cancelar</button><button onClick={() => void create()} disabled={saving || Boolean(groups && !groupId)} className="min-h-12 rounded-xl bg-emerald-500 font-extrabold text-ink disabled:opacity-50">{saving ? 'Creando...' : 'Crear partido'}</button></div>
  </ModalSheet>
}
