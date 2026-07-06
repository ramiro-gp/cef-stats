export type AvatarKind = 'horse' | 'pig' | 'dog' | 'cat' | 'chicken' | 'person' | 'alien' | 'astronaut' | 'police' | 'fan' | 'wizard' | 'ogre' | 'ninja' | 'pirate' | 'dictator'

export interface AvatarOption {
  key: string
  label: string
  kind: AvatarKind
  background: string
  primary: string
  secondary: string
  skin?: string
  hair?: string
  hairTone?: 'dark' | 'blond'
  gender?: 'man' | 'woman'
}

export const avatarOptions: AvatarOption[] = [
  { key: 'avatar:caballo', label: 'Caballo', kind: 'horse', background: '#78350f', primary: '#b86f3d', secondary: '#fef3c7' },
  { key: 'avatar:chancho', label: 'Chancho', kind: 'pig', background: '#9d174d', primary: '#f9a8d4', secondary: '#fce7f3' },
  { key: 'avatar:perro', label: 'Perro', kind: 'dog', background: '#854d0e', primary: '#d69a5b', secondary: '#5b321c' },
  { key: 'avatar:gato', label: 'Gato', kind: 'cat', background: '#334155', primary: '#cbd5e1', secondary: '#64748b' },
  { key: 'avatar:gallina', label: 'Gallina', kind: 'chicken', background: '#991b1b', primary: '#f8fafc', secondary: '#ef4444' },
  { key: 'avatar:hombre-claro-oscuro', label: 'Hombre moreno', kind: 'person', background: '#064e3b', primary: '#34d399', secondary: '#facc15', skin: '#efbd91', hair: '#21150f', hairTone: 'dark', gender: 'man' },
  { key: 'avatar:hombre-claro-rubio', label: 'Hombre rubio', kind: 'person', background: '#1e3a8a', primary: '#60a5fa', secondary: '#fef08a', skin: '#f2c69d', hair: '#d6a62e', hairTone: 'blond', gender: 'man' },
  { key: 'avatar:hombre-oscuro', label: 'Hombre tez oscura', kind: 'person', background: '#4c1d95', primary: '#a78bfa', secondary: '#ddd6fe', skin: '#75432d', hair: '#130d0a', hairTone: 'dark', gender: 'man' },
  { key: 'avatar:mujer-clara-oscura', label: 'Mujer morena', kind: 'person', background: '#831843', primary: '#f472b6', secondary: '#fbcfe8', skin: '#edb889', hair: '#25140e', hairTone: 'dark', gender: 'woman' },
  { key: 'avatar:mujer-clara-rubia', label: 'Mujer rubia', kind: 'person', background: '#713f12', primary: '#fbbf24', secondary: '#fef3c7', skin: '#f1c39a', hair: '#d7a72d', hairTone: 'blond', gender: 'woman' },
  { key: 'avatar:mujer-oscura', label: 'Mujer tez oscura', kind: 'person', background: '#0c4a6e', primary: '#38bdf8', secondary: '#bae6fd', skin: '#804b34', hair: '#17100c', hairTone: 'dark', gender: 'woman' },
  { key: 'avatar:alien', label: 'Alien', kind: 'alien', background: '#312e81', primary: '#86efac', secondary: '#c4b5fd' },
  { key: 'avatar:astronauta', label: 'Astronauta', kind: 'astronaut', background: '#172554', primary: '#e2e8f0', secondary: '#38bdf8', skin: '#d89c70', hair: '#2b190f' },
  { key: 'avatar:policia', label: 'Policía', kind: 'police', background: '#1e3a8a', primary: '#3b82f6', secondary: '#facc15', skin: '#dca477', hair: '#21140e' },
  { key: 'avatar:hincha', label: 'Hincha desprolijo', kind: 'fan', background: '#7f1d1d', primary: '#ef4444', secondary: '#facc15', skin: '#d99b6c', hair: '#3b2114' },
  { key: 'avatar:brujo', label: 'Brujo anciano', kind: 'wizard', background: '#3b0764', primary: '#7c3aed', secondary: '#e9d5ff', skin: '#d7a176', hair: '#f8fafc' },
  { key: 'avatar:ogro', label: 'Ogro', kind: 'ogre', background: '#365314', primary: '#84cc16', secondary: '#d9f99d' },
  { key: 'avatar:ninja', label: 'Ninja', kind: 'ninja', background: '#18181b', primary: '#27272a', secondary: '#ef4444', skin: '#c98258' },
  { key: 'avatar:pirata', label: 'Pirata', kind: 'pirate', background: '#164e63', primary: '#ef4444', secondary: '#facc15', skin: '#e7ad7c', hair: '#25140d' },
  { key: 'avatar:dictador', label: 'Dictador', kind: 'dictator', background: '#1f2937', primary: '#334155', secondary: '#facc15', skin: '#d99b6c', hair: '#1c120c' },
]

const legacyAvatarAliases: Record<string, string> = {
  'avatar:capitan': 'avatar:hombre-claro-oscuro', 'avatar:arquera': 'avatar:mujer-oscura', 'avatar:veloz': 'avatar:hombre-claro-rubio',
  'avatar:muro': 'avatar:hombre-oscuro', 'avatar:talento': 'avatar:hombre-claro-rubio', 'avatar:magia': 'avatar:mujer-clara-rubia',
  'avatar:clasico': 'avatar:hombre-claro-oscuro', 'avatar:nocturno': 'avatar:hombre-oscuro', 'avatar:picante': 'avatar:hincha',
  'avatar:maestro': 'avatar:brujo', 'avatar:barrio': 'avatar:hombre-claro-oscuro', 'avatar:leyenda': 'avatar:pirata',
}

export function findAvatarOption(value?: string | null): AvatarOption | undefined {
  const resolved = value ? legacyAvatarAliases[value] ?? value : ''
  return avatarOptions.find(option => option.key === resolved)
}
