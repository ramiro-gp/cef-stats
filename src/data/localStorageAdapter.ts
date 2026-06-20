export interface StorageAdapter<T> {
  load: () => T | null
  save: (value: T) => void
  clear: () => void
}

function getStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

export function createStringStorageAdapter(key: string): StorageAdapter<string> {
  return {
    load: () => { try { return getStorage()?.getItem(key) ?? null } catch { return null } },
    save: value => { try { getStorage()?.setItem(key, value) } catch { /* Preferencia opcional: la app sigue funcionando sin persistencia local. */ } },
    clear: () => { try { getStorage()?.removeItem(key) } catch { /* Sin efecto si el navegador bloquea storage. */ } },
  }
}
