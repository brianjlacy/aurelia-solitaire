import { cryptoRandom, type RandomSource } from './random'

/**
 * Fisher–Yates shuffle. Returns a new array; the input is not modified.
 *
 * @param items - Items to shuffle
 * @param random - Random source, cryptographically strong by default
 */
export function shuffle<T>(items: readonly T[], random: RandomSource = cryptoRandom()): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j] as T, result[i] as T]
  }
  return result
}
