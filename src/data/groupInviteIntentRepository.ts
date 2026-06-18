import { createStringStorageAdapter } from './localStorageAdapter'

const storage = createStringStorageAdapter('cef-stats-pending-group-invite')

export const groupInviteIntentRepository = {
  load: storage.load,
  save: storage.save,
  clear: storage.clear,
}
