import type { LoadFormatPreference, LoadMatchTypePreference, PlayerPosition } from '../types'

const positions: PlayerPosition[] = ['Arquero', 'Defensor', 'Mediocampista', 'Delantero']
const formats: LoadFormatPreference[] = ['F5', 'F6', 'F7', 'F8', 'F11', 'ask']
const inputClass = 'mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#102019]'

interface Props {
  position: PlayerPosition | ''
  defaultMatchType: LoadMatchTypePreference
  defaultFootballFormat: LoadFormatPreference
  onPosition: (value: PlayerPosition | '') => void
  onMatchType: (value: LoadMatchTypePreference) => void
  onFootballFormat: (value: LoadFormatPreference) => void
  showHeading?: boolean
}

export function LoadPreferencesFields({ position, defaultMatchType, defaultFootballFormat, onPosition, onMatchType, onFootballFormat, showHeading = true }: Props) {
  return <section className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
    {showHeading && <><h3 className="text-sm font-extrabold">Preferencias de carga</h3><p className="mt-1 text-xs leading-5 text-slate-400">Elegí los defaults para cargar rápido. Siempre podés cambiarlos antes de guardar.</p></>}
    <div className={`${showHeading ? 'mt-4' : ''} grid gap-4 sm:grid-cols-2`}>
      <label className="block sm:col-span-2"><span className="text-xs font-bold text-slate-500">Posición habitual</span><select value={position} onChange={event => onPosition(event.target.value as PlayerPosition | '')} className={inputClass}><option value="">Sin posición</option>{positions.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="block"><span className="text-xs font-bold text-slate-500">Tipo de partido</span><select value={defaultMatchType} onChange={event => onMatchType(event.target.value as LoadMatchTypePreference)} className={inputClass}><option value="friendly">Amistoso</option><option value="tournament">Torneo</option><option value="ask">Preguntarme</option></select></label>
      <label className="block"><span className="text-xs font-bold text-slate-500">Formato</span><select value={defaultFootballFormat} onChange={event => onFootballFormat(event.target.value as LoadFormatPreference)} className={inputClass}>{formats.map(format => <option key={format} value={format}>{format === 'ask' ? 'Preguntarme' : format}</option>)}</select></label>
    </div>
  </section>
}
