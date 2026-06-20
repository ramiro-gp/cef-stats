import { useCallback, useEffect, useRef, useState } from 'react'
import type { Match } from '../types'
import { findMatchByCode, isValidMatchCode } from '../utils/matches'
import { ModalSheet } from './ModalSheet'

interface Props {
  matches: Match[]
  remoteMode?: boolean
  initialValue?: string
  onLookup?: (value: string) => Promise<Match | null>
  onOpen: (match: Match) => void
  onClose: () => void
}

export function MatchJoinSheet({ matches, remoteMode = false, initialValue = '', onLookup, onOpen, onClose }: Props) {
  const [query, setQuery] = useState(initialValue)
  const [match, setMatch] = useState<Match | null>(null)
  const [status, setStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle')
  const [error, setError] = useState('')
  const initialSearchStarted = useRef(false)
  const performSearch = useCallback(async (value: string) => {
    if (!value.trim()) return null
    if (!isValidMatchCode(value)) {
      setMatch(null)
      setStatus('not_found')
      setError('El código o link no tiene un formato válido.')
      return null
    }
    setStatus('searching')
    setError('')
    try {
      const found = onLookup ? await onLookup(value) : findMatchByCode(matches, value)
      setMatch(found)
      setStatus(found ? 'found' : 'not_found')
      return found
    } catch (reason) {
      setMatch(null)
      setStatus('not_found')
      setError(reason instanceof Error ? reason.message : 'No pudimos buscar el partido.')
      return null
    }
  }, [matches, onLookup])
  const search = () => performSearch(query)

  useEffect(() => {
    if (initialValue && !initialSearchStarted.current) {
      initialSearchStarted.current = true
      void Promise.resolve().then(() => performSearch(initialValue)).then(found => { if (found) onOpen(found) })
    }
  }, [initialValue, onOpen, performSearch])

  return <ModalSheet title="Unirme con código" onClose={onClose}>
    <label className="text-xs font-bold text-slate-500">Código o link del partido</label>
    <input autoFocus value={query} onChange={event => { setQuery(event.target.value); setMatch(null); setStatus('idle'); setError('') }} onKeyDown={event => { if (event.key === 'Enter') void search() }} placeholder="CEF-XXXXXXXXXXXX o https://..." className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-transparent px-3 font-mono outline-none focus:border-emerald-500 dark:border-white/10" />
    <button onClick={() => void search()} disabled={!query.trim() || status === 'searching'} className="mt-3 min-h-11 w-full rounded-xl border border-emerald-500/30 text-sm font-bold text-emerald-500 disabled:opacity-40">{status === 'searching' ? 'Buscando...' : 'Buscar partido'}</button>
    <p className={`mt-3 text-sm leading-6 ${status === 'found' ? 'text-emerald-500' : status === 'not_found' ? 'text-amber-500' : 'text-slate-400'}`}>
      {status === 'searching' ? 'Buscando partido...' : status === 'found' ? `Encontramos: ${match?.title}` : status === 'not_found' ? error || (remoteMode ? 'No encontramos un partido con ese código o link.' : 'No encontramos ese partido en este dispositivo. Cuando los partidos estén online, este código va a funcionar entre usuarios.') : 'Pegá el código o link de invitación.'}
    </p>
    <div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onClose} className="min-h-12 rounded-xl border border-slate-200 font-bold dark:border-white/10">Cancelar</button><button onClick={() => { if (match) onOpen(match) }} disabled={!match} className="min-h-12 rounded-xl bg-emerald-500 font-bold text-ink disabled:opacity-40">Abrir partido</button></div>
  </ModalSheet>
}
