/** A source of uniformly distributed numbers in `[0, 1)`. */
export type RandomSource = () => number

const UINT32_RANGE = 0x1_0000_0000

/**
 * Deterministic PRNG (mulberry32). Used for reproducible deals (`?seed=`)
 * and tests; not suitable for anything security-sensitive.
 */
export function seededRandom(seed: number): RandomSource {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE
  }
}

/** Cryptographically strong random source backed by `crypto.getRandomValues`. */
export function cryptoRandom(): RandomSource {
  const buffer = new Uint32Array(1)
  return () => {
    globalThis.crypto.getRandomValues(buffer)
    return (buffer[0] as number) / UINT32_RANGE
  }
}

/** A random unsigned 32-bit seed from the crypto source. */
export function randomSeed(): number {
  return Math.floor(cryptoRandom()() * UINT32_RANGE) >>> 0
}

/** Parses a user-supplied seed (e.g. from the URL); returns `null` when invalid. */
export function parseSeed(value: string | null | undefined): number | null {
  if (value === null || value === undefined || !/^\d{1,10}$/.test(value)) return null
  const seed = Number(value)
  return seed <= 0xffff_ffff ? seed : null
}
