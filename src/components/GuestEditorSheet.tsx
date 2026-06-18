import { useState } from 'react'
import type { MatchParticipant, MatchTeam } from '../types'
import { ModalSheet } from './ModalSheet'

export function GuestEditorSheet({ guest, team, onSave, onClose }: { guest?: MatchParticipant; team: MatchTeam; onSave: (values: { name: string; avatar?: string; team: MatchTeam }) => void; onClose: () => void }) {
  const [name, setName] = useState(guest?.guestName ?? '')
  const [avatar, setAvatar] = useState(guest?.avatar ?? '')
  const [error, setError] = useState('')
  const save = () => { if (!name.trim()) { setError('El nombre es obligatorio.'); return } onSave({ name: name.trim(), avatar: avatar.trim(), team }); onClose() }
  return <ModalSheet title={guest ? 'Editar invitado' : `Invitado al ${team === 'light' ? 'claro' : 'oscuro'}`} onClose={onClose}>
    <div className="mb-5 flex items-center gap-3"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500 text-xl font-black text-ink">{avatar || 'IN'}</div><p className="text-sm text-slate-400">No necesita cuenta y sus stats solo cuentan en este partido.</p></div>
    <label className="block"><span className="text-xs font-bold text-slate-500">Nombre o apodo</span><input autoFocus value={name} onChange={event => setName(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 outline-none focus:border-emerald-500 dark:border-white/10" /></label>
    <label className="mt-4 block"><span className="text-xs font-bold text-slate-500">Avatar opcional</span><input value={avatar} maxLength={4} onChange={event => setAvatar(event.target.value)} placeholder="⚽ o NC" className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 outline-none focus:border-emerald-500 dark:border-white/10" /></label>
    {error && <p className="mt-2 text-sm font-bold text-rose-500">{error}</p>}
    <div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onClose} className="min-h-12 rounded-xl border border-slate-200 font-bold dark:border-white/10">Cancelar</button><button onClick={save} className="min-h-12 rounded-xl bg-emerald-500 font-bold text-ink">Guardar</button></div>
  </ModalSheet>
}
