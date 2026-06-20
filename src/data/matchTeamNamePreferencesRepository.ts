import { createStringStorageAdapter } from './localStorageAdapter'

const lightStorage = createStringStorageAdapter('fulbo-stats-light-team-name')
const darkStorage = createStringStorageAdapter('fulbo-stats-dark-team-name')

export const matchTeamNamePreferencesRepository = {
  load: () => ({ light: lightStorage.load() || 'CLARO', dark: darkStorage.load() || 'OSCURO' }),
  save: (light: string, dark: string) => { lightStorage.save(light); darkStorage.save(dark) },
}
