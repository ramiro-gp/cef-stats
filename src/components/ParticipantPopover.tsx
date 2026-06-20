import { useEffect, useRef, useState } from 'react'
import type { GuestMatchStats, MatchParticipant, MatchTeam, StatEntry, User } from '../types'
import { getParticipantHandle, getParticipantName } from '../utils/matches'

export interface PopoverAnchor {
  top: number
  left: number
  width: number
  height: number
}

function MiniCounter({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="min-w-0 flex-1"><p className="mb-1 text-[9px] font-bold uppercase text-slate-400">{label}</p><div className="flex items-center justify-between gap-1.5"><button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={!value} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-lg disabled:opacity-30 dark:border-white/10">−</button><span className="w-6 text-center font-black">{value}</span><button type="button" onClick={() => onChange(value + 1)} className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500 text-lg font-black text-ink">+</button></div></div>
}

interface Props {
  participant: MatchParticipant
  anchor: PopoverAnchor
  user: User
  entry?: StatEntry
  guestStats?: GuestMatchStats
  isMvp: boolean
  isCreator: boolean
  lightTeamName: string
  darkTeamName: string
  onChangeTeam: (team: MatchTeam) => void | Promise<unknown>
  onSaveGuestStats: (goals: number, assists: number) => void | Promise<void>
  onEditGuest: () => void
  onRemoveGuest: () => void
  onClose: () => void
}

export function ParticipantPopover({ participant, anchor, user, entry, guestStats, isMvp, isCreator, lightTeamName, darkTeamName, onChangeTeam, onSaveGuestStats, onEditGuest, onRemoveGuest, onClose }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const guest = participant.type === 'guest'
  const [goals, setGoals] = useState(guestStats?.goals ?? 0)
  const [assists, setAssists] = useState(guestStats?.assists ?? 0)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [teamSaving, setTeamSaving] = useState(false)
  const [teamFeedback, setTeamFeedback] = useState('')
  const [currentTeam, setCurrentTeam] = useState(participant.team)
  const name = getParticipantName(participant, user)
  const handle = getParticipantHandle(participant, user)
  const width = Math.min(288, window.innerWidth - 32)
  const left = Math.max(16, Math.min(anchor.left + anchor.width / 2 - width / 2, window.innerWidth - width - 16))
  const above = anchor.top > window.innerHeight / 2
  const position = above ? { bottom: window.innerHeight - anchor.top + 8, left, width } : { top: anchor.top + anchor.height + 8, left, width }

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) onClose() }
    const closeOnViewportChange = () => onClose()
    document.addEventListener('pointerdown', close)
    window.addEventListener('resize', closeOnViewportChange)
    window.addEventListener('scroll', closeOnViewportChange, true)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('resize', closeOnViewportChange)
      window.removeEventListener('scroll', closeOnViewportChange, true)
    }
  }, [onClose])

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await onSaveGuestStats(goals, assists)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1600)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos guardar las stats.')
    } finally {
      setSaving(false)
    }
  }
  const changeTeam = async (team: MatchTeam) => {
    if (teamSaving || currentTeam === team) return
    setTeamSaving(true); setError(''); setTeamFeedback('')
    try { await onChangeTeam(team); setCurrentTeam(team); setTeamFeedback(`Movido a ${team === 'light' ? lightTeamName : darkTeamName}.`) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No pudimos cambiar el equipo.') }
    finally { setTeamSaving(false) }
  }

  return <div ref={root} role="dialog" aria-label={`Stats de ${name}`} style={position} className="fixed z-50 rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl dark:border-white/10 dark:bg-[#102019] dark:text-white">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-extrabold">{name}</p>{handle && <p className="truncate text-xs text-slate-400">@{handle.replace(/^@/, '')}</p>}<p className="mt-1 text-[9px] font-black uppercase tracking-wider text-emerald-500">{currentTeam ? `Equipo ${currentTeam === 'light' ? lightTeamName : darkTeamName}` : 'Pendiente de equipo'} · {guest ? 'Invitado' : 'Usuario'} {isMvp ? '· MVP ⭐' : ''}</p></div><button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 dark:bg-white/5">×</button></div>
    {isCreator && <div className="mt-4"><p className="text-[9px] font-bold uppercase text-slate-400">Asignar equipo</p><div className="mt-2 grid grid-cols-2 gap-2">{(['light', 'dark'] as MatchTeam[]).map(team => <button key={team} type="button" disabled={teamSaving || currentTeam === team} onClick={() => void changeTeam(team)} className={`min-h-10 truncate rounded-xl px-2 text-xs font-bold disabled:opacity-50 ${currentTeam === team ? 'bg-emerald-500 text-ink' : 'border border-slate-200 dark:border-white/10'}`}>{teamSaving ? 'Guardando...' : team === 'light' ? lightTeamName : darkTeamName}</button>)}</div>{teamFeedback && <p className="mt-2 text-xs font-bold text-emerald-500">{teamFeedback}</p>}</div>}
    {error && <p className="mt-3 text-xs font-bold text-rose-500">{error}</p>}
    {guest && isCreator ? <><div className="mt-4 flex gap-4"><MiniCounter label="Goles" value={goals} onChange={value => { setGoals(value); setSaved(false) }} /><MiniCounter label="Asistencias" value={assists} onChange={value => { setAssists(value); setSaved(false) }} /></div><button type="button" onClick={() => void save()} disabled={saving} className="mt-4 min-h-10 w-full rounded-xl bg-emerald-500 text-sm font-bold text-ink disabled:opacity-50">{saving ? 'Guardando...' : saved ? 'Stats guardadas ✓' : 'Guardar stats'}</button><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={onEditGuest} className="min-h-9 text-xs font-bold text-slate-500">Editar nombre</button><button type="button" onClick={onRemoveGuest} className="min-h-9 text-xs font-bold text-rose-500">Quitar</button></div></> : <div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-slate-100 p-3 dark:bg-white/5"><div className="text-xl font-black">{guest ? guestStats?.goals ?? 0 : entry?.goals ?? 0}</div><div className="text-[9px] text-slate-400">GOLES</div></div><div className="rounded-xl bg-slate-100 p-3 dark:bg-white/5"><div className="text-xl font-black">{guest ? guestStats?.assists ?? 0 : entry?.assists ?? 0}</div><div className="text-[9px] text-slate-400">ASIST.</div></div></div>}
  </div>
}
