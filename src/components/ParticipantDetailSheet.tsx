import type { GuestMatchStats, MatchParticipant, StatEntry, User } from '../types'
import { getParticipantAvatar, getParticipantHandle, getParticipantName } from '../utils/matches'
import { ModalSheet } from './ModalSheet'

export function ParticipantDetailSheet({ participant, user, entry, guestStats, isMvp, onEditGuest, onGuestStats, onRemoveGuest, onClose }: { participant: MatchParticipant; user: User; entry?: StatEntry; guestStats?: GuestMatchStats; isMvp: boolean; onEditGuest: () => void; onGuestStats: () => void; onRemoveGuest: () => void; onClose: () => void }) {
  const guest = participant.type === 'guest'
  const name = getParticipantName(participant, user)
  const avatar = getParticipantAvatar(participant, user)
  const handle = getParticipantHandle(participant, user)
  const goals = guest ? guestStats?.goals ?? 0 : entry?.goals ?? 0
  const assists = guest ? guestStats?.assists ?? 0 : entry?.assists ?? 0
  return <ModalSheet title={name} onClose={onClose}><div className="flex items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500 text-xl font-black text-ink">{avatar}</div><div><p className="font-extrabold">{name}</p>{!guest && handle && <p className="text-sm text-slate-400">@{handle}</p>}<p className="mt-1 text-xs font-bold uppercase tracking-wider text-emerald-500">Equipo {participant.team === 'light' ? 'claro' : 'oscuro'} · {guest ? 'Invitado' : 'Usuario'}</p></div></div><div className="mt-5 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-slate-100 p-3 dark:bg-white/5"><div className="text-xl font-black">{goals}</div><div className="text-[9px] text-slate-400">GOLES</div></div><div className="rounded-xl bg-slate-100 p-3 dark:bg-white/5"><div className="text-xl font-black">{assists}</div><div className="text-[9px] text-slate-400">ASIST.</div></div><div className="rounded-xl bg-violet-500/10 p-3"><div className="text-xl">{isMvp ? '⭐' : '—'}</div><div className="text-[9px] text-slate-400">MVP</div></div></div>{guest && <div className="mt-6 grid grid-cols-2 gap-2"><button onClick={onEditGuest} className="min-h-11 rounded-xl border border-slate-200 text-sm font-bold dark:border-white/10">Editar nombre</button><button onClick={onGuestStats} className="min-h-11 rounded-xl bg-emerald-500 text-sm font-bold text-ink">Cargar stats</button><button onClick={onRemoveGuest} className="col-span-2 min-h-11 text-sm font-bold text-rose-500">Quitar invitado</button></div>}</ModalSheet>
}
