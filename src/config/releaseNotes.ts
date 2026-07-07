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
    'Mejoramos la pantalla de entrada.',
    'Sumamos métricas en movimiento y contador de jugadores.',
    'Limpiamos textos raros del login.',
  ],
}
