import { useState } from 'react'
import type { Group, Match, MatchResult, MatchTeam, StatEntry } from '../types'
import { formatInviteCodeInput } from '../utils/inviteCodes'
import { useMatchCodeLookup } from '../hooks/useMatchCodeLookup'
import { getMatchResultForTeam, isTeamFull } from '../utils/matches'
import { ModalSheet } from './ModalSheet'

interface Props { entry: StatEntry; matches: Match[]; groups: Group[]; allEntries: StatEntry[]; onLink: (entryId: string, matchId: string, team: MatchTeam, result?: MatchResult) => boolean | Promise<boolean>; onSuccess: () => void; onEditExisting: (entry: StatEntry) => void; onClose: () => void }

export function LinkEntrySheet({ entry, matches, groups, allEntries, onLink, onSuccess, onEditExisting, onClose }: Props) {
  const { query, setQuery, match, status } = useMatchCodeLookup(matches)
  const [team, setTeam] = useState<MatchTeam | null>(null)
  const [error, setError] = useState('')
  const [confirmResult, setConfirmResult] = useState(false)
  const [linking, setLinking] = useState(false)
  const participant = match?.participants.find(item => item.userId === entry.userId)
  const assignedTeam = participant?.team
  const effectiveTeam = assignedTeam ?? team
  const calculated = match && effectiveTeam ? getMatchResultForTeam(match.score, effectiveTeam) : null
  const duplicateEntry = match ? allEntries.find(item => item.id !== entry.id && item.userId === entry.userId && item.matchId === match.id) : undefined
  const groupName = match ? (match.groupId ? groups.find(group => group.id === match.groupId)?.name ?? 'Grupo anfitrión' : 'Sin grupo') : ''
  const link = async () => {
    if (!match) return
    if (duplicateEntry) { setError('Ya tenés una carga vinculada a este partido.'); return }
    if (!effectiveTeam) { setError('Primero elegí equipo.'); return }
    if (!assignedTeam && isTeamFull(match, effectiveTeam, entry.userId)) { setError('El equipo está completo.'); return }
    if (calculated && calculated !== entry.result && !confirmResult) { setConfirmResult(true); return }
    setLinking(true)
    setError('')
    try {
      if (!await onLink(entry.id, match.id, effectiveTeam, calculated ?? undefined)) { setError('No pudimos vincular la carga. Revisá que todavía tengas acceso al partido.'); return }
      onSuccess()
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos vincular la carga.')
    } finally {
      setLinking(false)
    }
  }

  return <ModalSheet title="Vincular a partido" onClose={onClose}>
    <label className="text-xs font-bold text-slate-500">Código o link de invitación</label><input autoFocus value={query} onChange={event => { setQuery(formatInviteCodeInput(event.target.value)); setTeam(null); setConfirmResult(false); setError('') }} placeholder="H63K-81HY o link de invitación" className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 font-mono uppercase outline-none focus:border-emerald-500 dark:border-white/10" />
    <p className={`mt-2 text-xs font-bold ${status === 'found' ? 'text-emerald-500' : status === 'not_found' || status === 'invalid' ? 'text-rose-500' : 'text-slate-400'}`}>{status === 'searching' ? 'Buscando partido...' : status === 'found' ? `Partido encontrado: ${match?.title}` : status === 'not_found' ? 'No encontramos un partido con ese código/link.' : status === 'invalid' ? 'El código o link no tiene un formato válido.' : 'Pegá el código o link completo.'}</p>
    {match && <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-white/10"><p className="font-extrabold">{match.title}</p><p className="mt-1 text-xs text-slate-400">{new Date(match.scheduledAt).toLocaleDateString('es-AR')} · {groupName} · {match.format ?? 'F5'}</p>{assignedTeam && <p className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">Ya participás en {assignedTeam === 'light' ? match.lightTeamName : match.darkTeamName}. Usaremos ese equipo.</p>}<div className="mt-4 grid grid-cols-2 gap-2">{(['light', 'dark'] as MatchTeam[]).map(value => { const full = !assignedTeam && isTeamFull(match, value, entry.userId); const label = value === 'light' ? match.lightTeamName : match.darkTeamName; return <button key={value} disabled={Boolean(assignedTeam) || full} onClick={() => { setTeam(value); setConfirmResult(false); setError('') }} className={`min-h-12 truncate rounded-xl px-2 text-sm font-bold disabled:opacity-50 ${effectiveTeam === value ? 'bg-emerald-500 text-ink' : 'border border-slate-200 dark:border-white/10'}`}>{label}{full ? ' · completo' : ''}</button> })}</div>{calculated && <p className="mt-3 text-xs text-slate-400">El resultado indica: <strong>{calculated === 'win' ? 'Ganaste' : calculated === 'draw' ? 'Empataste' : 'Perdiste'}</strong>.</p>}{duplicateEntry && <div className="mt-3 rounded-xl bg-amber-500/10 p-3"><p className="text-xs font-bold text-amber-500">Ya tenés una carga vinculada a este partido.</p><button onClick={() => { onClose(); onEditExisting(duplicateEntry) }} className="mt-2 min-h-9 text-xs font-black text-emerald-500">Editar esa carga →</button></div>}</div>}
    {confirmResult && calculated && <div className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm leading-5 text-amber-600 dark:text-amber-400">El partido indica que {calculated === 'win' ? 'ganaste' : calculated === 'draw' ? 'empataste' : 'perdiste'}, distinto de tu carga. Confirmá para actualizarla.</div>}{error && <p className="mt-3 text-sm font-bold text-rose-500">{error}</p>}
    <div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onClose} disabled={linking} className="min-h-12 rounded-xl border border-slate-200 font-bold disabled:opacity-50 dark:border-white/10">Cancelar</button><button onClick={() => void link()} disabled={!match || !effectiveTeam || Boolean(duplicateEntry) || linking} className="min-h-12 rounded-xl bg-emerald-500 font-bold text-ink disabled:opacity-40">{linking ? 'Vinculando...' : confirmResult ? 'Confirmar y actualizar' : 'Vincular stats'}</button></div>
  </ModalSheet>
}
