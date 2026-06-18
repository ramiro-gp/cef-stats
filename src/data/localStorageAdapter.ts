export interface StorageAdapter<T> {
  load: () => T | null
  save: (value: T) => void
  clear: () => void
}

function getStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

export function createJsonStorageAdapter<T>(key: string): StorageAdapter<T> {
  return {
    load: () => {
      const raw = getStorage()?.getItem(key)
      if (!raw) return null
      try {
        return JSON.parse(raw) as T
      } catch {
        return null
      }
    },
    save: value => getStorage()?.setItem(key, JSON.stringify(value)),
    clear: () => getStorage()?.removeItem(key),
  }
}

export function createStringStorageAdapter(key: string): StorageAdapter<string> {
  return {
    load: () => getStorage()?.getItem(key) ?? null,
    save: value => getStorage()?.setItem(key, value),
    clear: () => getStorage()?.removeItem(key),
  }
}
