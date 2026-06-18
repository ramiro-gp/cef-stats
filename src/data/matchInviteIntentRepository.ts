import { createStringStorageAdapter } from './localStorageAdapter'

const storage = createStringStorageAdapter('cef-stats-pending-match-invite')

export const matchInviteIntentRepository = {
  load: storage.load,
  save: storage.save,
  clear: storage.clear,
}
