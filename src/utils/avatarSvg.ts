import type { AvatarOption } from '../data/avatarOptions'

const eyes = '<circle cx="27" cy="29" r="1.7" fill="#111827"/><circle cx="37" cy="29" r="1.7" fill="#111827"/>'
const smile = '<path d="M27 36c3 2 7 2 10 0" fill="none" stroke="#7c3f35" stroke-width="1.6" stroke-linecap="round"/>'

function bust(fill: string) { return `<path d="M8 64c2-15 10-23 24-23s22 8 24 23" fill="${fill}"/>` }
function person(option: AvatarOption) {
  const skin = option.skin ?? '#d8a078'; const hair = option.hair ?? '#21150f'
  const hairShape = option.gender === 'woman'
    ? `<path d="M15 30C15 12 23 5 32 5s17 7 17 25l-5 11H20l-5-11Z" fill="${hair}"/><circle cx="32" cy="27" r="14" fill="${skin}"/>`
    : `<circle cx="32" cy="27" r="15" fill="${skin}"/><path d="M17 25C18 11 24 5 33 5s15 7 16 20c-6-5-11-7-16-7s-10 2-16 7Z" fill="${hair}"/>`
  return `${bust(option.primary)}${hairShape}${eyes}${smile}<path d="M25 46h14l-2 18H27Z" fill="${option.secondary}" opacity=".4"/>`
}
function animal(option: AvatarOption) {
  const p = option.primary; const s = option.secondary
  if (option.kind === 'horse') return `${bust(s)}<path d="m19 17-7-11 13 6m20 5 7-11-13 6" fill="${p}"/><path d="M19 14c3-7 8-10 13-10s10 3 13 10v24c0 9-6 15-13 15s-13-6-13-15V14Z" fill="${p}"/><path d="M19 19C22 8 27 4 32 4s10 4 13 15c-8-5-18-5-26 0Z" fill="#3f2113"/>${eyes}<ellipse cx="32" cy="39" rx="10" ry="8" fill="${s}" opacity=".45"/>${smile}`
  if (option.kind === 'pig') return `${bust(s)}<path d="m20 15-8-7 2 13m30-6 8-7-2 13" fill="${p}"/><circle cx="32" cy="28" r="19" fill="${p}"/>${eyes}<ellipse cx="32" cy="38" rx="9" ry="7" fill="${s}"/><circle cx="29" cy="38" r="1.5" fill="#9d174d"/><circle cx="35" cy="38" r="1.5" fill="#9d174d"/>`
  if (option.kind === 'dog') return `${bust(p)}<path d="M18 17 7 10l5 24 9-8m25-9 11-7-5 24-9-8" fill="${s}"/><circle cx="32" cy="29" r="18" fill="${p}"/>${eyes}<ellipse cx="32" cy="38" rx="8" ry="7" fill="#f1c38e"/><path d="m29 36 3-2 3 2-3 3Z" fill="#111827"/>${smile}`
  if (option.kind === 'cat') return `${bust(s)}<path d="m18 18-8-13 15 7m21 6 8-13-15 7" fill="${p}"/><circle cx="32" cy="29" r="18" fill="${p}"/><ellipse cx="26" cy="29" rx="2" ry="3" fill="#111827"/><ellipse cx="38" cy="29" rx="2" ry="3" fill="#111827"/><path d="m29 36 3-2 3 2-3 3Z" fill="#ef9a9a"/><path d="M18 36h9m-10 4h10m19-4h-9m10 4H37" stroke="#475569" stroke-width="1.3"/>`
  return `${bust(p)}<circle cx="32" cy="29" r="18" fill="${p}"/><circle cx="24" cy="12" r="5" fill="${s}"/><circle cx="32" cy="9" r="6" fill="${s}"/><circle cx="40" cy="12" r="5" fill="${s}"/>${eyes}<path d="m25 35 7-5 7 5-7 5Z" fill="#f59e0b"/><circle cx="32" cy="43" r="4" fill="${s}"/><path d="M15 31c-3 6-3 12 1 17m33-17c3 6 3 12-1 17" fill="none" stroke="${p}" stroke-width="6" stroke-linecap="round"/>`
}
function character(option: AvatarOption) {
  if (option.kind === 'alien') return `${bust('#818cf8')}<path d="M32 5c13 0 20 9 18 22-2 14-9 23-18 23s-16-9-18-23C12 14 19 5 32 5Z" fill="${option.primary}"/><ellipse cx="24" cy="28" rx="5" ry="8" fill="#111827" transform="rotate(-18 24 28)"/><ellipse cx="40" cy="28" rx="5" ry="8" fill="#111827" transform="rotate(18 40 28)"/>${smile}`
  const skin = option.skin ?? (option.kind === 'ogre' ? '#84cc16' : '#d8a078'); const hair = option.hair ?? '#21150f'
  const base = `${bust(option.primary)}<circle cx="32" cy="28" r="15" fill="${skin}"/>${eyes}${smile}`
  if (option.kind === 'astronaut') return `${bust(option.primary)}<circle cx="32" cy="28" r="22" fill="#cbd5e1"/><circle cx="32" cy="28" r="16" fill="#0f172a"/><circle cx="32" cy="29" r="13" fill="${skin}"/>${eyes}${smile}<path d="M18 50h28" stroke="${option.secondary}" stroke-width="4"/>`
  if (option.kind === 'police') return `${base}<path d="M16 19c3-10 9-14 16-14s13 4 16 14H16Z" fill="#1e3a8a"/><path d="M13 19h38" stroke="#60a5fa" stroke-width="4"/><path d="m32 8 3 4-3 4-3-4Z" fill="${option.secondary}"/>`
  if (option.kind === 'fan') return `${base}<path d="M16 24c0-13 7-20 16-20 5 0 9 2 12 6l6-3-3 8 5 3-7 2c-8-5-19-5-29 4Z" fill="${hair}"/><circle cx="43" cy="36" r="3" fill="#ef4444" opacity=".55"/><path d="M18 48h28" stroke="${option.secondary}" stroke-width="5"/>`
  if (option.kind === 'wizard') return `${base}<path d="M12 20 31 0l20 20H12Z" fill="#6d28d9"/><path d="M7 20h50" stroke="${option.secondary}" stroke-width="5"/><path d="M18 36c3 20 25 20 28 0-8 5-20 5-28 0Z" fill="#f8fafc"/><circle cx="40" cy="10" r="3" fill="#facc15"/>`
  if (option.kind === 'ogre') return `${bust('#65a30d')}<path d="m18 24-12-8 11 17m29-9 12-8-11 17" fill="${skin}"/><circle cx="32" cy="29" r="18" fill="${skin}"/>${eyes}<path d="M27 39c3-2 7-2 10 0" stroke="#365314" stroke-width="2"/><path d="M20 17c8-6 16-6 24 0" stroke="#365314" stroke-width="5"/>`
  if (option.kind === 'ninja') return `${bust('#18181b')}<circle cx="32" cy="28" r="17" fill="#18181b"/><path d="M17 25h30v10H17Z" fill="${skin}"/>${eyes}<path d="M16 42h32l-4 22H20Z" fill="#27272a"/><path d="m43 15 12-5-8 10" fill="${option.secondary}"/>`
  if (option.kind === 'dictator') return `${bust(option.primary)}<circle cx="32" cy="29" r="15" fill="${skin}"/><path d="M15 19c4-9 10-13 17-13s13 4 17 13H15Z" fill="#263241"/><path d="M13 19h38" stroke="#475569" stroke-width="4"/><path d="m32 8 4 5-4 4-4-4Z" fill="${option.secondary}"/><path d="M24 27c3-2 6-2 8 0 2-2 5-2 8 0" stroke="#111827" stroke-width="1.6" stroke-linecap="round"/><circle cx="27" cy="30" r="1.5" fill="#111827"/><circle cx="37" cy="30" r="1.5" fill="#111827"/><path d="M24 37c4-4 12-4 16 0" fill="#111827"/><path d="M25 45h14l-2 19H27Z" fill="${option.secondary}" opacity=".45"/>`
  return `${base}<path d="M16 21c4-11 10-16 17-16s13 5 17 16H16Z" fill="#dc2626"/><path d="M12 21h40" stroke="${option.secondary}" stroke-width="5"/><circle cx="27" cy="29" r="6" fill="#111827"/><path d="m22 25 11 9" stroke="#111827" stroke-width="2"/><path d="M19 38c5 13 21 13 26 0-8 5-18 5-26 0Z" fill="${hair}"/>`
}

export function avatarSvgMarkup(option: AvatarOption): string {
  const art = ['horse', 'pig', 'dog', 'cat', 'chicken'].includes(option.kind) ? animal(option) : option.kind === 'person' ? person(option) : character(option)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${option.background}"/>${art}</svg>`
}

export function avatarSvgDataUrl(option: AvatarOption): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvgMarkup(option))}`
}
