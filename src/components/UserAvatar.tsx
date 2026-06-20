import { findAvatarOption } from '../data/avatarOptions'
import { avatarSvgDataUrl } from '../utils/avatarSvg'

export function UserAvatar({ value, fallback = 'J', className = '' }: { value?: string | null; fallback?: string; className?: string }) {
  const option = findAvatarOption(value)
  const fallbackValue = value?.startsWith('avatar:') ? fallback : value || fallback
  return <span className={`inline-grid shrink-0 place-items-center overflow-hidden bg-emerald-500 font-black text-ink ${className}`} aria-hidden="true">
    {option ? <img src={avatarSvgDataUrl(option)} alt="" className="h-full w-full" draggable={false} /> : <span className="px-1">{fallbackValue}</span>}
  </span>
}
