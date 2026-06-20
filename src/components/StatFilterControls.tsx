import { FOOTBALL_FORMAT_FILTER_OPTIONS, MATCH_TYPE_FILTER_OPTIONS, type StatFilters } from '../utils/statFilters'

function FilterRow<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return <div><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{options.map(option => <button type="button" key={option.value} onClick={() => onChange(option.value)} aria-pressed={value === option.value} className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-bold transition ${value === option.value ? 'bg-emerald-500 text-ink' : 'border border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300'}`}>{option.label}</button>)}</div></div>
}

export function StatFilterControls({ filters, onChange }: { filters: StatFilters; onChange: (filters: StatFilters) => void }) {
  return <div className="space-y-4">
    <FilterRow label="Tipo de partido" options={MATCH_TYPE_FILTER_OPTIONS} value={filters.matchType} onChange={matchType => onChange({ ...filters, matchType })} />
    <FilterRow label="Formato" options={FOOTBALL_FORMAT_FILTER_OPTIONS} value={filters.footballFormat} onChange={footballFormat => onChange({ ...filters, footballFormat })} />
  </div>
}
