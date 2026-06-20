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
    load: () => getStorage()?.getItem(key) ?? null,
    save: value => getStorage()?.setItem(key, value),
    clear: () => getStorage()?.removeItem(key),
  }
}
