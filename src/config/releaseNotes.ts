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
    'Agregamos recuperar contraseña.',
    'Sumamos mantener sesión abierta.',
    'Pulimos el carrusel y el contador del login.',
  ],
}
