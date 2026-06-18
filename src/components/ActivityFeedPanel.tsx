import { useCallback, useEffect, useRef } from 'react'
import type { ActivityCategory, ActivityFeedItem } from '../types'
import { relativeTime } from '../utils/format'
import { ArrowUpIcon, FireIcon, TrophyIcon } from './icons'

const categoryLabels: Record<ActivityCategory, string> = {
  stat_entry: 'Carga', ranking_change: 'Ranking', streak: 'Racha', world_cup: 'Mundial', funny: 'Sistema', system: 'Sistema',
}

export function ActivityFeedPanel({ items }: { items: ActivityFeedItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const topFadeRef = useRef<HTMLDivElement>(null)
  const bottomFadeRef = useRef<HTMLDivElement>(null)

  const updateFades = useCallback(() => {
    const element = scrollRef.current
    if (!element) return
    const canScroll = element.scrollHeight > element.clientHeight + 2
    if (topFadeRef.current) topFadeRef.current.style.opacity = canScroll && element.scrollTop > 4 ? '1' : '0'
    if (bottomFadeRef.current) bottomFadeRef.current.style.opacity = canScroll && element.scrollTop + element.clientHeight < element.scrollHeight - 4 ? '1' : '0'
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(updateFades)
    window.addEventListener('resize', updateFades)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', updateFades) }
  }, [items.length, updateFades])

  return <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]">
    <div ref={topFadeRef} className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-white via-white/80 to-transparent opacity-0 transition-opacity dark:from-[#0d1814] dark:via-[#0d1814]/80" />
    <div ref={scrollRef} onScroll={updateFades} className="no-scrollbar max-h-[430px] overflow-y-auto overscroll-contain scroll-smooth">
      {items.map((item, index) => {
        const Icon = item.icon === 'trophy' ? TrophyIcon : item.icon === 'fire' ? FireIcon : ArrowUpIcon
        return <div key={item.id} className={`flex gap-3 p-3.5 transition ${item.important ? 'bg-emerald-500/[0.045]' : ''} ${index !== items.length - 1 ? 'border-b border-slate-100 dark:border-white/5' : ''}`}>
          <div className={`grid shrink-0 place-items-center rounded-xl ${item.important ? 'h-10 w-10 bg-emerald-500/10 text-emerald-500' : 'h-8 w-8 bg-slate-100 text-slate-400 dark:bg-white/5'}`}><Icon className={item.important ? 'h-5 w-5' : 'h-4 w-4'} /></div>
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className={`text-[9px] font-black uppercase tracking-wider ${item.important ? 'text-emerald-500' : 'text-slate-400'}`}>{categoryLabels[item.category]}</span><span className="text-[10px] text-slate-400">{relativeTime(item.createdAt)}</span></div><p className={`mt-1 leading-5 ${item.important ? 'text-sm font-bold' : 'text-[13px] text-slate-500 dark:text-slate-300'}`}>{item.text}</p></div>
        </div>
      })}
    </div>
    <div ref={bottomFadeRef} className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-white via-white/85 to-transparent opacity-0 transition-opacity dark:from-[#0d1814] dark:via-[#0d1814]/85" />
  </div>
}
