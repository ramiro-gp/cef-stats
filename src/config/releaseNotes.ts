import packageInfo from '../../package.json'

export interface ReleaseNotes {
  version: string
  title: string
  notes: string[]
}

export const currentReleaseNotes: ReleaseNotes = {
  version: packageInfo.version,
  title: 'Últimos cambios',
  notes: [
    'Mejoramos movimientos recientes en grupos.',
    'Sacamos eventos poco importantes del feed.',
    'El aviso de partido disponible en Home quedó más claro.',
  ],
}
