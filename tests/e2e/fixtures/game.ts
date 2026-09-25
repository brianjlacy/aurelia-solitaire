import { test as base, expect, type Locator, type Page } from '@playwright/test'

/** Card notation layout accepted by `window.__solitaire.loadLayout`. */
export interface LayoutSpec {
  stock?: string
  waste?: string
  foundationRanks?: number[]
  tableau?: string[]
  drawCount?: 1 | 3
  moveCount?: number
  fillStock?: boolean
}

export class SolitairePage {
  readonly tableau: Locator
  readonly foundations: Locator
  readonly moveCounter: Locator
  readonly announcer: Locator
  readonly stock: Locator
  readonly waste: Locator

  constructor(readonly page: Page) {
    this.tableau = page.locator('.tableau-pile')
    this.foundations = page.locator('.foundation-pile')
    this.moveCounter = page.locator('.move-counter')
    this.announcer = page.locator('[aria-live="polite"]')
    this.stock = page.locator('.stock-button')
    this.waste = page.locator('.waste-pile')
  }

  async goto(query = ''): Promise<void> {
    await this.page.goto(`/${query}`)
    await expect(this.page.locator('html[data-test-hooks="ready"]')).toBeAttached()
    await expect(this.tableau).toHaveCount(7)
  }

  card(name: string): Locator {
    return this.page.locator(`.card[aria-label="${name}"]`)
  }

  async load(name: 'nearWin' | 'autoComplete' | 'aceReady'): Promise<void> {
    await this.page.evaluate((n) => window.__solitaire!.load(n), name)
  }

  async loadLayout(spec: LayoutSpec): Promise<void> {
    await this.page.evaluate((s) => window.__solitaire!.loadLayout(s), spec)
  }

  async state() {
    return this.page.evaluate(() => window.__solitaire!.getState())
  }

  /** Drags with intermediate pointer moves, like a real user. */
  /** Waits for card move animations to settle. */
  async settle(): Promise<void> {
    await this.page.waitForFunction(() =>
      document.getAnimations().every((a) => a.playState !== 'running'),
    )
  }

  async drag(source: Locator, target: Locator): Promise<void> {
    await this.settle()
    const from = (await source.boundingBox())!
    const to = (await target.boundingBox())!
    await this.page.mouse.move(from.x + from.width / 2, from.y + 12)
    await this.page.mouse.down()
    await this.page.mouse.move(from.x + from.width / 2 + 10, from.y + 20, { steps: 3 })
    await this.page.mouse.move(to.x + to.width / 2, to.y + Math.min(to.height / 2, 40), {
      steps: 8,
    })
    await this.page.mouse.up()
  }
}

type Fixtures = { solitaire: SolitairePage; consoleErrors: string[] }

export const test = base.extend<Fixtures>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))
    await use(errors)
    expect(errors, 'no console errors').toEqual([])
  },
  solitaire: async ({ page, consoleErrors }, use) => {
    void consoleErrors
    await use(new SolitairePage(page))
  },
})

export { expect }
