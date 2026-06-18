import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>
const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const HomeIcon = (p: IconProps) => <svg {...base} {...p}><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></svg>
export const PlusCircleIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg>
export const TrophyIcon = (p: IconProps) => <svg {...base} {...p}><path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3M12 13v4M8 21h8M10 17h4"/></svg>
export const UserIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>
export const UsersIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 4.3a3 3 0 0 1 0 5.4M17 14a5 5 0 0 1 4 5"/></svg>
export const SunIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>
export const MoonIcon = (p: IconProps) => <svg {...base} {...p}><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z"/></svg>
export const ChevronRight = (p: IconProps) => <svg {...base} {...p}><path d="m9 18 6-6-6-6"/></svg>
export const ArrowUpIcon = (p: IconProps) => <svg {...base} {...p}><path d="m18 9-6-6-6 6M12 3v18"/></svg>
export const FireIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 22c4.4 0 8-3.1 8-7.6 0-3.3-2-6.4-5.1-8.5.1 2.3-1 3.8-2.2 4.6.3-3.8-1.7-6.5-4.3-8.5.2 3.6-4.4 6.1-4.4 11.9C4 18.7 7.6 22 12 22Z"/><path d="M9.5 18.5c0-2 1.5-3.2 2.5-4.8.4 1.7 2.5 2.5 2.5 4.8"/></svg>
export const CheckIcon = (p: IconProps) => <svg {...base} {...p}><path d="m5 12 4 4L19 6"/></svg>
export const MedalIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="12" cy="14" r="6"/><path d="m8.5 9-3-6h5L12 8l1.5-5h5l-3 6M10 14l1.4 1.4L14.5 12"/></svg>
export const CopyIcon = (p: IconProps) => <svg {...base} {...p}><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
export const LogoutIcon = (p: IconProps) => <svg {...base} {...p}><path d="M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/></svg>
export const CalendarIcon = (p: IconProps) => <svg {...base} {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
