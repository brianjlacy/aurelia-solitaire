import type { DrawCount, GameState } from '../models/GameState'
import { Dealer } from '../services/Dealer'
import type { RandomSource } from '../../utils/random'

/**
 * Fluent builder for new deals.
 *
 * @example
 * ```ts
 * const state = new GameBuilder().withDrawCount(1).withSeed(42).build()
 * ```
 */
export class GameBuilder {
  private drawCount: DrawCount = 3
  private seed: number | null = null
  private random: RandomSource | undefined

  withDrawCount(drawCount: DrawCount): this {
    this.drawCount = drawCount
    return this
  }

  /** Deterministic deal; `null` restores a cryptographically random deal. */
  withSeed(seed: number | null): this {
    this.seed = seed
    return this
  }

  withRandom(random: RandomSource): this {
    this.random = random
    return this
  }

  build(): GameState {
    return new Dealer().deal({ drawCount: this.drawCount, seed: this.seed, random: this.random })
  }
}
