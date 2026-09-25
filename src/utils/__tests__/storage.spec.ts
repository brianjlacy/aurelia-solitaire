import { describe, expect, it, vi } from 'vitest'
import {
  getBrowserStorage,
  isNonNegativeInteger,
  isNonNegativeNumber,
  isRecord,
  PersistedValue,
  type KeyValueStorage,
} from '@/utils/storage'

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

const validate = (d: unknown) => (isRecord(d) && typeof d.n === 'number' ? { n: d.n } : null)

describe('PersistedValue', () => {
  it('round-trips a versioned value', () => {
    const storage = memoryStorage()
    const value = new PersistedValue({ key: 'k', version: 1, validate, storage })
    expect(value.load()).toBeNull()
    expect(value.save({ n: 5 })).toBe(true)
    expect(JSON.parse(storage.data.get('k')!)).toMatchObject({ version: 1, data: { n: 5 } })
    expect(value.load()).toEqual({ n: 5 })
    expect(storage.data.has('k-backup')).toBe(false)
  })

  it('ignores other versions, bad JSON and invalid data', () => {
    const storage = memoryStorage()
    const value = new PersistedValue({ key: 'k', version: 2, validate, storage })
    storage.setItem('k', JSON.stringify({ version: 1, data: { n: 1 } }))
    expect(value.load()).toBeNull()
    storage.setItem('k', '{not json')
    expect(value.load()).toBeNull()
    storage.setItem('k', JSON.stringify({ version: 2, data: { n: 'x' } }))
    expect(value.load()).toBeNull()
    storage.setItem('k', JSON.stringify([1]))
    expect(value.load()).toBeNull()
  })

  it('falls back to the backup copy', () => {
    const storage = memoryStorage()
    const value = new PersistedValue({ key: 'k', version: 1, validate, storage, backup: true })
    value.save({ n: 9 })
    expect(storage.data.has('k-backup')).toBe(true)
    storage.setItem('k', 'corrupt')
    expect(value.load()).toEqual({ n: 9 })
    value.clear()
    expect(value.load()).toBeNull()
  })

  it('degrades gracefully without storage', () => {
    const value = new PersistedValue({ key: 'k', version: 1, validate, storage: null })
    expect(value.save({ n: 1 })).toBe(false)
    expect(value.load()).toBeNull()
    expect(() => value.clear()).not.toThrow()
  })

  it('reports write failures', () => {
    const storage = memoryStorage()
    storage.setItem = () => {
      throw new Error('QuotaExceeded')
    }
    storage.removeItem = () => {
      throw new Error('denied')
    }
    const value = new PersistedValue({ key: 'k', version: 1, validate, storage })
    expect(value.save({ n: 1 })).toBe(false)
    expect(() => value.clear()).not.toThrow()
  })

  it('uses localStorage by default', () => {
    const value = new PersistedValue({ key: 'default-k', version: 1, validate })
    value.save({ n: 3 })
    expect(localStorage.getItem('default-k')).not.toBeNull()
    expect(value.load()).toEqual({ n: 3 })
  })
})

describe('getBrowserStorage', () => {
  it('returns localStorage when usable', () => {
    expect(getBrowserStorage()).toBe(localStorage)
  })

  it('returns null when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(getBrowserStorage()).toBeNull()
  })

  it('returns null when storage is missing', () => {
    vi.spyOn(globalThis, 'localStorage', 'get').mockReturnValue(undefined as unknown as Storage)
    expect(getBrowserStorage()).toBeNull()
  })
})

describe('guards', () => {
  it('checks records and numbers', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord([])).toBe(false)
    expect(isRecord(null)).toBe(false)
    expect(isNonNegativeNumber(1.5)).toBe(true)
    expect(isNonNegativeNumber(-1)).toBe(false)
    expect(isNonNegativeNumber(Infinity)).toBe(false)
    expect(isNonNegativeInteger(2)).toBe(true)
    expect(isNonNegativeInteger(2.5)).toBe(false)
  })
})
