import { useState } from 'react'
import type { Group, Match, MatchResult, MatchTeam, StatEntry } from '../types'
import { useMatchCodeLookup } from '../hooks/useMatchCodeLookup'
import { getMatchResultForTeam, isTeamFull } from '../utils/matches'
import { ModalSheet } from './ModalSheet'

interface Props { entry: StatEntry; matches: Match[]; groups: Group[]; allEntries: StatEntry[]; onLink: (entryId: string, matchId: string, team: MatchTeam, result?: MatchResult) => boolean | Promise<boolean>; onEditExisting: (entry: StatEntry) => void; onClose: () => void }

export function LinkEntrySheet({ entry, matches, groups, allEntries, onLink, onEditExisting, onClose }: Props) {
  const { query, setQuery, match, status } = useMatchCodeLookup(matches)
  const [team, setTeam] = useState<MatchTeam | null>(null)
  const [error, setError] = useState('')
  const [confirmResult, setConfirmResult] = useState(false)
  const [linking, setLinking] = useState(false)
  const calculated = match && team ? getMatchResultForTeam(match.score, team) : null
  const duplicateEntry = match ? allEntries.find(item => item.id !== entry.id && item.userId === entry.userId && item.matchId === match.id) : undefined
  const groupName = match ? (match.groupId ? groups.find(group => group.id === match.groupId)?.name ?? 'Grupo anfitrión' : 'Sin grupo') : ''
  const link = async () => {
    if (!match || !team) return
    if (calculated && calculated !== entry.result && !confirmResult) { setConfirmResult(true); return }
    setLinking(true)
    setError('')
    try {
      if (!await onLink(entry.id, match.id, team, calculated ?? undefined)) { setError('No se pudo vincular: revisá cupo o carga duplicada.'); return }
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos vincular la carga.')
    } finally {
      setLinking(false)
    }
  }

  return <ModalSheet title="Vincular a partido" onClose={onClose}>
    <label className="text-xs font-bold text-slate-500">Código o link de invitación</label><input autoFocus value={query} onChange={event => { setQuery(event.target.value); setTeam(null); setConfirmResult(false); setError('') }} placeholder="CEF-XXXXX o https://..." className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 font-mono outline-none focus:border-emerald-500 dark:border-white/10" />
    <p className={`mt-2 text-xs font-bold ${status === 'found' ? 'text-emerald-500' : status === 'not_found' ? 'text-rose-500' : 'text-slate-400'}`}>{status === 'searching' ? 'Buscando partido...' : status === 'found' ? `Partido encontrado: ${match?.title}` : status === 'not_found' ? 'No encontramos un partido con ese código/link.' : 'Pegá el código o link completo.'}</p>
    {match && <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-white/10"><p className="font-extrabold">{match.title}</p><p className="mt-1 text-xs text-slate-400">{new Date(match.scheduledAt).toLocaleDateString('es-AR')} · {groupName} · {match.format ?? 'F5'}</p><div className="mt-4 grid grid-cols-2 gap-2">{(['light', 'dark'] as MatchTeam[]).map(value => { const full = isTeamFull(match, value, entry.userId); return <button key={value} disabled={full} onClick={() => { setTeam(value); setConfirmResult(false) }} className={`min-h-12 rounded-xl text-sm font-bold disabled:opacity-35 ${team === value ? 'bg-emerald-500 text-ink' : 'border border-slate-200 dark:border-white/10'}`}>{full ? `${value === 'light' ? 'Claro' : 'Oscuro'} completo` : `Equipo ${value === 'light' ? 'claro' : 'oscuro'}`}</button> })}</div>{calculated && <p className="mt-3 text-xs text-slate-400">El resultado indica: <strong>{calculated === 'win' ? 'Ganaste' : calculated === 'draw' ? 'Empataste' : 'Perdiste'}</strong>.</p>}{duplicateEntry && <div className="mt-3 rounded-xl bg-amber-500/10 p-3"><p className="text-xs font-bold text-amber-500">Ya existe una carga tuya para este partido.</p><button onClick={() => { onClose(); onEditExisting(duplicateEntry) }} className="mt-2 min-h-9 text-xs font-black text-emerald-500">Editar esa carga →</button></div>}</div>}
    {confirmResult && calculated && <div className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm leading-5 text-amber-600 dark:text-amber-400">El partido indica que {calculated === 'win' ? 'ganaste' : calculated === 'draw' ? 'empataste' : 'perdiste'}, distinto de tu carga. Confirmá para actualizarla.</div>}{error && <p className="mt-3 text-sm font-bold text-rose-500">{error}</p>}
    <div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onClose} disabled={linking} className="min-h-12 rounded-xl border border-slate-200 font-bold disabled:opacity-50 dark:border-white/10">Cancelar</button><button onClick={() => void link()} disabled={!match || !team || Boolean(duplicateEntry) || linking} className="min-h-12 rounded-xl bg-emerald-500 font-bold text-ink disabled:opacity-40">{linking ? 'Vinculando...' : confirmResult ? 'Confirmar y actualizar' : 'Vincular stats'}</button></div>
  </ModalSheet>
}
