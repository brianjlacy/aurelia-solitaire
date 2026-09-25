/** Minimal subset of the Web Storage API, injectable for tests. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Envelope written to storage so the schema can evolve safely. */
export interface VersionedRecord<T> {
  readonly version: number
  readonly savedAt: number
  readonly data: T
}

export interface PersistedValueOptions<T> {
  /** Primary storage key. */
  key: string
  /** Current schema version; records with another version are ignored. */
  version: number
  /** Validates (and optionally normalises) untrusted data read from storage. */
  validate: (data: unknown) => T | null
  /** Also keep a backup copy under `${key}-backup` and fall back to it. */
  backup?: boolean
  /** Storage implementation, `window.localStorage` by default. */
  storage?: KeyValueStorage | null
}

/** Returns `localStorage` when available and usable, otherwise `null`. */
export function getBrowserStorage(): KeyValueStorage | null {
  try {
    const storage = globalThis.localStorage
    if (!storage) return null
    const probe = '__solitaire_probe__'
    storage.setItem(probe, probe)
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

/**
 * A typed, versioned, validated value in key/value storage.
 *
 * All failures (quota, privacy mode, corrupt JSON, schema mismatch) degrade
 * gracefully to "no saved value" instead of throwing.
 */
export class PersistedValue<T> {
  private readonly storage: KeyValueStorage | null
  private readonly backupKey: string

  constructor(private readonly options: PersistedValueOptions<T>) {
    this.storage = options.storage === undefined ? getBrowserStorage() : options.storage
    this.backupKey = `${options.key}-backup`
  }

  /** Reads the value, falling back to the backup copy when the primary is invalid. */
  load(): T | null {
    const primary = this.read(this.options.key)
    if (primary !== null) return primary
    return this.options.backup ? this.read(this.backupKey) : null
  }

  /** Writes the value (and backup). Returns `false` if storage is unavailable or full. */
  save(data: T): boolean {
    if (!this.storage) return false
    const record: VersionedRecord<T> = { version: this.options.version, savedAt: Date.now(), data }
    try {
      const json = JSON.stringify(record)
      this.storage.setItem(this.options.key, json)
      if (this.options.backup) this.storage.setItem(this.backupKey, json)
      return true
    } catch {
      return false
    }
  }

  /** Removes the value and its backup. */
  clear(): void {
    try {
      this.storage?.removeItem(this.options.key)
      this.storage?.removeItem(this.backupKey)
    } catch {
      // Storage is best-effort; nothing else to do.
    }
  }

  private read(key: string): T | null {
    if (!this.storage) return null
    try {
      const raw = this.storage.getItem(key)
      if (raw === null) return null
      const record: unknown = JSON.parse(raw)
      if (!isRecord(record) || record.version !== this.options.version) return null
      return this.options.validate(record.data)
    } catch {
      return null
    }
  }
}

/** Whether `value` is a non-null, non-array object. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Whether `value` is a finite number `>= 0`. */
export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Whether `value` is an integer `>= 0`. */
export function isNonNegativeInteger(value: unknown): value is number {
  return isNonNegativeNumber(value) && Number.isInteger(value)
}
