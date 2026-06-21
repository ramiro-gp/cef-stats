import { useState } from 'react'
import type { Group, Match, MatchResult, MatchTeam, StatEntry } from '../types'
import { formatInviteCodeInput } from '../utils/inviteCodes'
import { useMatchCodeLookup } from '../hooks/useMatchCodeLookup'
import { getMatchResultForTeam, getMaxTeamSize, isTeamFull } from '../utils/matches'
import { ModalSheet } from './ModalSheet'

export interface MatchLinkSelection { match: Match; team: MatchTeam; automaticResult: MatchResult | null }

export function MatchCodePickerSheet({ matches, groups, entries, userId, onSelect, onClose }: { matches: Match[]; groups: Group[]; entries: StatEntry[]; userId: string; onSelect: (selection: MatchLinkSelection) => void; onClose: () => void }) {
  const { query, setQuery, match, status } = useMatchCodeLookup(matches)
  const [team, setTeam] = useState<MatchTeam | null>(null)
  const assignedTeam = match?.participants.find(participant => participant.userId === userId)?.team
  const effectiveTeam = assignedTeam ?? team
  const duplicate = match ? entries.some(entry => entry.matchId === match.id && entry.userId === userId) : false
  const select = () => { if (!match || !effectiveTeam || duplicate) return; onSelect({ match, team: effectiveTeam, automaticResult: getMatchResultForTeam(match.score, effectiveTeam) }); onClose() }
  return <ModalSheet title="Vincular con código o link" onClose={onClose}>
    <input autoFocus value={query} onChange={event => { setQuery(formatInviteCodeInput(event.target.value)); setTeam(null) }} placeholder="H63K-81HY o link de invitación" className="h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 font-mono uppercase outline-none focus:border-emerald-500 dark:border-white/10" />
    <p className={`mt-2 text-xs font-bold ${status === 'found' ? 'text-emerald-500' : status === 'not_found' || status === 'invalid' ? 'text-rose-500' : 'text-slate-400'}`}>{status === 'searching' ? 'Buscando partido...' : status === 'found' ? `Partido encontrado: ${match?.title}` : status === 'not_found' ? 'No encontramos un partido con ese código/link.' : status === 'invalid' ? 'El código o link no tiene un formato válido.' : 'La búsqueda empieza automáticamente.'}</p>
    {match && <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-white/10"><p className="font-extrabold">{match.title}</p><p className="mt-1 text-xs text-slate-400">{new Date(match.scheduledAt).toLocaleDateString('es-AR')} · {match.groupId ? groups.find(group => group.id === match.groupId)?.name ?? 'Grupo anfitrión' : 'Sin grupo'} · {match.format ?? 'F5'}</p>{assignedTeam && <p className="mt-3 text-xs font-bold text-emerald-500">Ya estás en {assignedTeam === 'light' ? match.lightTeamName : match.darkTeamName}.</p>}<div className="mt-4 grid grid-cols-2 gap-2">{(['light', 'dark'] as MatchTeam[]).map(value => { const full = !assignedTeam && isTeamFull(match, value, userId); const count = match.participants.filter(participant => participant.team === value).length; const max = getMaxTeamSize(match.format ?? 'F5'); const label = value === 'light' ? match.lightTeamName : match.darkTeamName; return <button key={value} disabled={Boolean(assignedTeam) || full} onClick={() => setTeam(value)} className={`min-h-12 truncate rounded-xl px-2 text-sm font-bold disabled:opacity-50 ${effectiveTeam === value ? 'bg-emerald-500 text-ink' : 'border border-slate-200 dark:border-white/10'}`}>{label} {count}/{max}{full ? ' · completo' : ''}</button> })}</div>{duplicate && <p className="mt-3 text-xs font-bold text-amber-500">Ya tenés una carga vinculada a este partido. Editala desde su detalle.</p>}</div>}
    <div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onClose} className="min-h-12 rounded-xl border border-slate-200 font-bold dark:border-white/10">Cancelar</button><button onClick={select} disabled={!match || !effectiveTeam || duplicate} className="min-h-12 rounded-xl bg-emerald-500 font-bold text-ink disabled:opacity-40">Vincular stats</button></div>
  </ModalSheet>
}
