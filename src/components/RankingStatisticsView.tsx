import { useMemo, useState } from 'react'
import type { RankingPlayer } from '../types'
import { UserAvatar } from './UserAvatar'

const MAX_SELECTED_PLAYERS = 6
const colors = ['bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-sky-500', 'bg-rose-500', 'bg-lime-500']

const metrics = [
  { id: 'goals', label: 'Goles', value: (player: RankingPlayer) => player.goals, format: (value: number) => String(value) },
  { id: 'assists', label: 'Asistencias', value: (player: RankingPlayer) => player.assists, format: (value: number) => String(value) },
  { id: 'matches', label: 'Partidos / cargas', value: (player: RankingPlayer) => player.matches, format: (value: number) => String(value) },
  { id: 'goalAverage', label: 'Goles por partido', value: (player: RankingPlayer) => player.matches ? player.goals / player.matches : 0, format: (value: number) => value.toFixed(2) },
  { id: 'assistAverage', label: 'Asistencias por partido', value: (player: RankingPlayer) => player.matches ? player.assists / player.matches : 0, format: (value: number) => value.toFixed(2) },
]

function initialSelection(players: RankingPlayer[], currentUserId: string): string[] {
  const ordered = [...players].sort((a, b) => Number(b.id === currentUserId) - Number(a.id === currentUserId) || b.goals + b.assists - a.goals - a.assists)
  return ordered.slice(0, players.length <= MAX_SELECTED_PLAYERS ? players.length : 4).map(player => player.id)
}

export function RankingStatisticsView({ players, currentUserId }: { players: RankingPlayer[]; currentUserId: string }) {
  const [selection, setSelection] = useState(() => initialSelection(players, currentUserId))
  const [selectionWarning, setSelectionWarning] = useState('')

  const selectedPlayers = useMemo(() => players.filter(player => selection.includes(player.id)), [players, selection])
  const togglePlayer = (playerId: string) => {
    setSelection(current => {
      if (current.includes(playerId)) {
        setSelectionWarning('')
        return current.filter(id => id !== playerId)
      }
      if (current.length >= MAX_SELECTED_PLAYERS) {
        setSelectionWarning(`Podés comparar hasta ${MAX_SELECTED_PLAYERS} jugadores a la vez.`)
        return current
      }
      setSelectionWarning('')
      return [...current, playerId]
    })
  }

  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-extrabold">Jugadores a comparar</h2><p className="mt-1 text-xs leading-5 text-slate-400">Elegí hasta {MAX_SELECTED_PLAYERS}. Los gráficos usan el scope y los filtros activos.</p></div><span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-500">{selection.length}/{MAX_SELECTED_PLAYERS}</span></div>
      <div className="mt-4 flex flex-wrap gap-2">{players.map(player => { const active = selection.includes(player.id); return <button key={player.id} type="button" aria-pressed={active} onClick={() => togglePlayer(player.id)} className={`flex min-h-10 items-center gap-2 rounded-full border px-2.5 pr-3 text-xs font-bold transition ${active ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-400'}`}><UserAvatar value={player.initials} fallback={player.name.slice(0, 2).toUpperCase()} className="h-6 w-6 rounded-full text-[8px] text-white" />{player.name}{player.isCurrentUser && <span className="text-[9px] uppercase">Vos</span>}</button> })}</div>
      {selectionWarning && <p className="mt-3 text-xs font-semibold text-amber-500">{selectionWarning}</p>}
    </section>
    {selectedPlayers.length === 0 ? <div className="rounded-2xl border border-dashed border-emerald-500/30 p-8 text-center"><p className="font-extrabold">Elegí al menos un jugador</p><p className="mt-1 text-sm text-slate-400">Activá un nombre para mostrar sus estadísticas.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{metrics.map(metric => {
      const maximum = Math.max(...selectedPlayers.map(metric.value), 0)
      return <section key={metric.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]"><h3 className="text-sm font-extrabold">{metric.label}</h3><div className="mt-4 space-y-3">{selectedPlayers.map((player, index) => { const value = metric.value(player); const width = maximum > 0 ? Math.max(4, value / maximum * 100) : 0; return <div key={player.id}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold">{player.name}</span><span className="font-black tabular-nums">{metric.format(value)}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className={`h-full rounded-full transition-all ${colors[index % colors.length]}`} style={{ width: `${width}%` }} /></div></div> })}</div></section>
    })}</div>}
  </div>
}
