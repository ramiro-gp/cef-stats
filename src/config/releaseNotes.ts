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
    'La carga de stats ahora deja resolver partidos más rápido.',
    'Podés unirte a un equipo u omitir partidos desde la carga.',
    'Los grupos pueden tener formato y tipo de partido por defecto.',
    'Mejoramos detalles visuales para que entre mejor en celular.',
  ],
}
