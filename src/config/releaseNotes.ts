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
    'Inicio ahora habla de Últimas novedades.',
    'El banner evita mensajes repetidos de Mundial en fases tempranas.',
    'Corregimos textos e íconos rotos en Partidos.',
  ],
}
