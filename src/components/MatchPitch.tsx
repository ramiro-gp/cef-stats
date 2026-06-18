import type { GuestMatchStats, MatchParticipant, StatEntry, User } from '../types'
import { getParticipantAvatar, getParticipantName } from '../utils/matches'

interface Props {
  participants: MatchParticipant[]
  user: User
  entries: StatEntry[]
  guestStats: GuestMatchStats[]
  mvpParticipantId?: string
  activeParticipantId?: string
  onSelect: (participant: MatchParticipant, anchor: HTMLElement) => void
}

export function MatchPitch({ participants, user, entries, guestStats, mvpParticipantId, activeParticipantId, onSelect }: Props) {
  const team = (kind: 'light' | 'dark') => participants.filter(participant => participant.team === kind)
  const avatar = (participant: MatchParticipant) => getParticipantAvatar(participant, user)
  const name = (participant: MatchParticipant) => getParticipantName(participant, user)
  const stats = (participant: MatchParticipant) => participant.type === 'guest' ? guestStats.find(item => item.participantId === participant.id) : entries.find(entry => entry.userId === participant.userId)

  const renderTeam = (kind: 'light' | 'dark') => {
    const players = team(kind)
    const columns = players.length > 6 ? 'grid-cols-4' : 'grid-cols-3'
    return <div className={`grid h-[45%] ${columns} content-center gap-x-1.5 gap-y-2 px-3 py-3 sm:gap-x-3 sm:gap-y-3 sm:px-6`}>
      {players.map(participant => {
        const playerStats = stats(participant)
        const active = activeParticipantId === participant.id
        return <button
          key={participant.id}
          type="button"
          onClick={event => onSelect(participant, event.currentTarget)}
          aria-label={`Ver stats de ${name(participant)}`}
          aria-pressed={active}
          className="group relative flex min-w-0 flex-col items-center"
        >
          <span className={`grid h-10 w-10 place-items-center rounded-full border-2 text-[10px] font-black shadow-xl transition sm:h-11 sm:w-11 sm:text-xs ${active ? 'scale-110 border-amber-300 ring-4 ring-amber-300/25' : 'group-hover:-translate-y-1'} ${kind === 'light' ? 'border-white bg-slate-100 text-slate-900' : 'border-slate-600 bg-[#101512] text-white'}`}>{avatar(participant)}</span>
          {mvpParticipantId === participant.id && <span className="absolute -top-2 right-[calc(50%-23px)] text-xs">⭐</span>}
          <span className="mt-1 max-w-16 truncate rounded-md bg-black/50 px-1.5 py-0.5 text-[8px] font-bold text-white backdrop-blur-sm sm:max-w-20 sm:text-[9px]">{name(participant)}</span>
          <span className="mt-0.5 text-[8px] font-bold text-white/65">{playerStats?.goals ?? 0}G · {playerStats?.assists ?? 0}A</span>
        </button>
      })}
    </div>
  }

  if (!participants.length) return <div className="mx-auto grid aspect-[9/14] w-full max-w-[430px] place-items-center rounded-[28px] border-2 border-dashed border-emerald-300/30 bg-[#12613f] p-8 text-center text-sm font-bold text-emerald-50 shadow-xl">Todavía no hay jugadores anotados.</div>

  return <div className="mx-auto w-full max-w-[430px] [perspective:900px]">
    <div className="relative aspect-[9/14] overflow-hidden rounded-[28px] border-4 border-emerald-100/30 bg-[linear-gradient(180deg,#0d5135_0%,#11623f_50%,#0e593a_50%,#126843_100%)] shadow-[0_24px_55px_rgba(0,0,0,.32)] [transform:rotateX(3deg)] [transform-origin:center_bottom]">
      <div className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-white/55" />
      <div className="pointer-events-none absolute inset-x-3 top-1/2 border-t-2 border-white/55" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/55" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
      <div className="pointer-events-none absolute left-1/2 top-3 h-16 w-[44%] -translate-x-1/2 border-2 border-t-0 border-white/50" />
      <div className="pointer-events-none absolute left-1/2 top-3 h-6 w-[20%] -translate-x-1/2 border-x-2 border-b-2 border-white/40" />
      <div className="pointer-events-none absolute bottom-3 left-1/2 h-16 w-[44%] -translate-x-1/2 border-2 border-b-0 border-white/50" />
      <div className="pointer-events-none absolute bottom-3 left-1/2 h-6 w-[20%] -translate-x-1/2 border-x-2 border-t-2 border-white/40" />
      <div className="relative z-10 flex h-full flex-col justify-between">{renderTeam('dark')}<div className="px-4 text-center text-[9px] font-black uppercase tracking-[.25em] text-white/50">Oscuro · Claro</div>{renderTeam('light')}</div>
    </div>
  </div>
}
