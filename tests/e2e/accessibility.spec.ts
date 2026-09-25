import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures/game'

test.describe('Accessibility', () => {
  test.beforeEach(async ({ solitaire }) => {
    await solitaire.goto()
  })

  for (const theme of ['classic', 'dark', 'high-contrast'] as const) {
    test(`has no detectable accessibility issues (${theme})`, async ({ page }) => {
      await page.evaluate((t) => {
        localStorage.setItem(
          'solitaire-settings',
          JSON.stringify({ version: 1, savedAt: 0, data: { theme: t } }),
        )
      }, theme)
      await page.reload()
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      expect(results.violations).toEqual([])
    })
  }

  test('dialogs have no detectable accessibility issues', async ({ page }) => {
    for (const name of ['Settings', 'Statistics', 'Help']) {
      await page.getByRole('button', { name, exact: true }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
      expect(results.violations, name).toEqual([])
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
    }
  })

  test('should have proper ARIA labels on cards', async ({ page }) => {
    await page.click('button:has-text("New Game")')
    const card = page.locator('.card').first()
    const ariaLabel = await card.getAttribute('aria-label')
    expect(ariaLabel).toMatch(/^(Ace|[2-9]|10|Jack|Queen|King) of (Hearts|Diamonds|Clubs|Spades)$/)
    await expect(page.locator('.card--face-down').first()).toHaveAttribute(
      'aria-label',
      'Face-down card',
    )
    await expect(
      page.getByRole('button', { name: 'Empty foundation pile for Hearts' }),
    ).toBeVisible()
  })

  test('should announce game events to screen readers', async ({ page, solitaire }) => {
    await page.click('button:has-text("New Game")')
    const liveRegion = page.locator('[aria-live="polite"]')
    await expect(liveRegion).toBeAttached()
    await expect(liveRegion).toContainText('New game dealt')
    await solitaire.loadLayout({ tableau: ['KS', '#2C QH'], fillStock: true })
    await solitaire.drag(solitaire.card('Queen of Hearts'), solitaire.tableau.nth(0))
    await expect(liveRegion).toContainText('Moved card')
  })

  test('has a skip link, a main landmark and a heading', async ({ page }) => {
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to game' })
    await expect(skip).toBeFocused()
    await expect(page.getByRole('main')).toBeAttached()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Klondike Solitaire')
  })

  test('respects reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const duration = await page
      .locator('.card')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration)
    expect(duration.split(',').every((d) => parseFloat(d) < 0.001)).toBe(true)
  })
})
