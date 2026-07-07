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
    'En perfil podés ver tu email y cambiar contraseña.',
    'La zona de eliminar grupo queda menos expuesta.',
    'Los partidos ahora pueden marcarse como Amistoso o Torneo.',
    'El creador puede editar datos principales del partido.',
  ],
}
