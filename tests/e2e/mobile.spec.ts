import { test, expect } from './fixtures/game'

test.describe('Mobile', () => {
  test.beforeEach(async ({ solitaire }) => {
    await solitaire.goto()
  })

  test('fits the viewport without horizontal scrolling', async ({ page, solitaire }) => {
    await expect(solitaire.tableau).toHaveCount(7)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    const last = (await solitaire.tableau.nth(6).boundingBox())!
    expect(last.x + last.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  })

  test('taps to draw and taps to move', async ({ page, solitaire }) => {
    await solitaire.stock.tap()
    await expect(solitaire.moveCounter).toHaveText('1')
    await solitaire.loadLayout({ tableau: ['KS', '#2C QH'], fillStock: true })
    await solitaire.card('Queen of Hearts').tap()
    await solitaire.card('King of Spades').tap()
    await expect(solitaire.tableau.nth(0).locator('.card')).toHaveCount(2)
    await expect(page.locator('.move-counter')).toHaveText('1')
  })

  test('drags with touch-sized cards', async ({ solitaire }) => {
    await solitaire.loadLayout({ tableau: ['KS', '#2C QH'], fillStock: true })
    await solitaire.drag(solitaire.card('Queen of Hearts'), solitaire.tableau.nth(0))
    await expect(solitaire.tableau.nth(0).locator('.card')).toHaveCount(2)
  })
})
