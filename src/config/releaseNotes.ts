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
    'Home muestra varios partidos disponibles del grupo.',
    'Podés unirte u omitir partidos desde Inicio.',
    'Limpiamos frases flojas del banner rotativo.',
  ],
}
