import { test, expect } from './fixtures/game'

test.describe('Klondike Solitaire', () => {
  test.beforeEach(async ({ solitaire }) => {
    await solitaire.goto()
  })

  test('should start new game and display initial state', async ({ page, solitaire }) => {
    await page.click('button:has-text("New Game")')
    await expect(solitaire.tableau).toHaveCount(7)
    for (let i = 0; i < 7; i++) {
      await expect(solitaire.tableau.nth(i).locator('.card')).toHaveCount(i + 1)
      await expect(solitaire.tableau.nth(i).locator('.card--face-up')).toHaveCount(1)
    }
    await expect(solitaire.moveCounter).toHaveText('0')
    await expect(solitaire.stock).toHaveAttribute('aria-label', /24 cards/)
    await expect(solitaire.foundations).toHaveCount(4)
    await expect(solitaire.foundations.locator('.card')).toHaveCount(0)
    await expect(page).toHaveTitle('Klondike Solitaire')
  })

  test('deals reproducibly from a seed in the URL', async ({ solitaire }) => {
    await solitaire.goto('?seed=1234')
    const first = await solitaire.state()
    await solitaire.goto('?seed=1234')
    expect((await solitaire.state()).tableau).toEqual(first.tableau)
    expect(first.seed).toBe(1234)
  })

  test('draws from the stock and recycles the waste', async ({ solitaire }) => {
    await solitaire.loadLayout({ stock: 'AH 2H 3H 4H', drawCount: 3, tableau: ['KS'] })
    await solitaire.stock.click()
    await expect(solitaire.moveCounter).toHaveText('1')
    await expect(solitaire.waste.locator('.card')).toHaveCount(3)
    await expect(solitaire.waste.locator('.card').last()).toHaveAttribute(
      'aria-label',
      '2 of Hearts',
    )
    await solitaire.stock.click()
    await expect(solitaire.waste.locator('.card').last()).toHaveAttribute(
      'aria-label',
      'Ace of Hearts',
    )
    await expect(solitaire.stock).toHaveAttribute('aria-label', /Turn the waste pile over/)
    await solitaire.stock.click()
    await expect(solitaire.waste.locator('.card')).toHaveCount(0)
    await expect(solitaire.stock).toHaveAttribute('aria-label', /4 cards/)
  })

  test('should move card via drag-and-drop', async ({ solitaire }) => {
    await solitaire.loadLayout({ tableau: ['KS', '#2C QH'], fillStock: true })
    await solitaire.drag(solitaire.card('Queen of Hearts'), solitaire.tableau.nth(0))
    await expect(solitaire.moveCounter).toHaveText('1')
    await expect(solitaire.tableau.nth(0).locator('.card')).toHaveCount(2)
    await expect(solitaire.tableau.nth(1).locator('.card')).toHaveAttribute(
      'aria-label',
      '2 of Clubs',
    )
    await expect(solitaire.announcer).toContainText(
      'Moved card: Queen of Hearts to column 1. Revealed 2 of Clubs.',
    )
  })

  test('drags a run of cards together', async ({ solitaire }) => {
    await solitaire.loadLayout({ tableau: ['#5D KS QH JC', ''], fillStock: true })
    await solitaire.drag(solitaire.card('King of Spades'), solitaire.tableau.nth(1))
    await expect(solitaire.tableau.nth(1).locator('.card')).toHaveCount(3)
    await expect(solitaire.tableau.nth(0).locator('.card')).toHaveAttribute(
      'aria-label',
      '5 of Diamonds',
    )
  })

  test('snaps back on an invalid drop', async ({ solitaire }) => {
    await solitaire.loadLayout({ tableau: ['KS', '#2C QS'], fillStock: true })
    await solitaire.drag(solitaire.card('Queen of Spades'), solitaire.tableau.nth(0))
    await expect(solitaire.moveCounter).toHaveText('0')
    await expect(solitaire.announcer).toContainText(
      'Invalid move. Queen of Spades cannot be placed on King of Spades.',
    )
    await expect(solitaire.tableau.nth(1).locator('.card')).toHaveCount(2)
    await expect(solitaire.page.locator('.drag-layer')).toHaveCount(0)
  })

  test('cancels a drag with Escape', async ({ page, solitaire }) => {
    await solitaire.loadLayout({ tableau: ['KS', '#2C QH'], fillStock: true })
    const box = (await solitaire.card('Queen of Hearts').boundingBox())!
    await page.mouse.move(box.x + 20, box.y + 20)
    await page.mouse.down()
    await page.mouse.move(box.x + 120, box.y + 120, { steps: 5 })
    await expect(page.locator('.drag-layer')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await expect(page.locator('.drag-layer')).toHaveCount(0)
    await expect(solitaire.moveCounter).toHaveText('0')
  })

  test('should auto-move card to foundation on double-click', async ({ solitaire }) => {
    await solitaire.load('aceReady')
    await solitaire.card('Ace of Spades').dblclick()
    await expect(
      solitaire.foundations.nth(2).locator('.card[aria-label="Ace of Spades"]'),
    ).toBeVisible()
    await expect(solitaire.moveCounter).toHaveText('1')
  })

  test('explains why a double-clicked card cannot move', async ({ solitaire }) => {
    await solitaire.load('aceReady')
    await solitaire.card('5 of Clubs').dblclick()
    await expect(solitaire.announcer).toContainText('5 of Clubs cannot go to a foundation yet.')
    await expect(solitaire.moveCounter).toHaveText('0')
  })

  test('moves cards by tapping source then destination', async ({ solitaire }) => {
    await solitaire.loadLayout({ tableau: ['KS', '#2C QH'], fillStock: true })
    await solitaire.card('Queen of Hearts').click()
    await expect(solitaire.card('Queen of Hearts')).toHaveAttribute('aria-pressed', 'true')
    await expect(solitaire.tableau.nth(0)).toHaveClass(/pile--target/)
    await solitaire.card('King of Spades').click()
    await expect(solitaire.tableau.nth(0).locator('.card')).toHaveCount(2)
    await expect(solitaire.moveCounter).toHaveText('1')
  })

  test('should undo move correctly', async ({ page, solitaire }) => {
    await solitaire.loadLayout({ tableau: ['KS', '#2C QH'], fillStock: true })
    const initialState = await solitaire.state()
    await expect(page.locator('button[aria-label="Undo"]')).toBeDisabled()
    await solitaire.drag(solitaire.card('Queen of Hearts'), solitaire.tableau.nth(0))
    await expect(solitaire.moveCounter).toHaveText('1')
    const afterMove = await solitaire.state()

    await page.click('button[aria-label="Undo"]')
    expect(await solitaire.state()).toEqual(initialState)
    await expect(page.locator('button[aria-label="Redo"]')).toBeEnabled()

    await page.click('button[aria-label="Redo"]')
    expect(await solitaire.state()).toEqual(afterMove)

    await page.keyboard.press('Control+z')
    expect(await solitaire.state()).toEqual(initialState)
    await page.keyboard.press('Control+y')
    expect(await solitaire.state()).toEqual(afterMove)
  })

  test('should detect win and show victory modal', async ({ page, solitaire }) => {
    await solitaire.load('nearWin')
    await solitaire.drag(solitaire.card('King of Clubs'), solitaire.foundations.nth(3))
    await expect(page.locator('.win-modal')).toBeVisible()
    await expect(page.locator('.win-modal')).toContainText('You Won!')
    await expect(page.locator('.win-modal')).toContainText('100')
    await page.locator('.win-modal').getByRole('button', { name: 'View statistics' }).click()
    await expect(page.locator('.stats-modal [data-stat="won"]')).toContainText('1')
    await expect(page.locator('.stats-modal [data-stat="rate"]')).toContainText('100%')
  })

  test('starts a new game from the victory dialog', async ({ page, solitaire }) => {
    await solitaire.load('nearWin')
    await solitaire.card('King of Clubs').dblclick()
    await page.locator('.win-modal').getByRole('button', { name: 'New Game' }).click()
    await expect(page.locator('.win-modal')).toHaveCount(0)
    await expect(solitaire.moveCounter).toHaveText('0')
    await expect(solitaire.stock).toHaveAttribute('aria-label', /24 cards/)
  })

  test('auto-completes a solved board', async ({ page, solitaire }) => {
    await solitaire.load('autoComplete')
    await page.getByRole('button', { name: 'Auto-complete' }).click()
    await expect(page.locator('.win-modal')).toBeVisible({ timeout: 10_000 })
  })

  test('shows a hint', async ({ page, solitaire }) => {
    await solitaire.load('aceReady')
    await page.keyboard.press('h')
    await expect(solitaire.announcer).toContainText('Hint: Move Ace of Spades to the foundation.')
    await expect(solitaire.card('Ace of Spades')).toHaveClass(/card--hint/)
    await expect(solitaire.foundations.nth(2)).toHaveClass(/pile--target/)
  })

  test('asks before abandoning a game in progress', async ({ page, solitaire }) => {
    await solitaire.stock.click()
    await page.click('button:has-text("New Game")')
    const dialog = page.getByRole('dialog', { name: 'Start a new game?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Keep playing' }).click()
    await expect(solitaire.moveCounter).toHaveText('1')
    await page.keyboard.press('n')
    await page.getByRole('dialog').getByRole('button', { name: 'New Game' }).click()
    await expect(solitaire.moveCounter).toHaveText('0')
  })

  test('restores the game after a reload', async ({ page, solitaire }) => {
    await solitaire.stock.click()
    const before = await solitaire.state()
    await page.reload()
    await expect(solitaire.moveCounter).toHaveText('1')
    expect(await solitaire.state()).toEqual(before)
  })

  test('persists settings and applies draw count to the next game', async ({ page, solitaire }) => {
    await page.getByRole('button', { name: 'Settings' }).click()
    const dialog = page.getByRole('dialog', { name: 'Settings' })
    await dialog.getByLabel('One card (easy)').check()
    await dialog.getByLabel('Theme').selectOption('dark')
    await dialog.getByRole('button', { name: 'Done' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.click('button:has-text("New Game")')
    await expect(solitaire.stock).toHaveAttribute('aria-label', /Draw one/)
    await solitaire.stock.click()
    await expect(solitaire.waste.locator('.card')).toHaveCount(1)
  })

  test('hides the timer when disabled', async ({ page }) => {
    await expect(page.locator('.timer-display')).toBeVisible()
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('dialog').getByLabel('Show timer').uncheck()
    await page.keyboard.press('Escape')
    await expect(page.locator('.timer-display')).toHaveCount(0)
  })

  test('should be keyboard accessible', async ({ page, solitaire }) => {
    await solitaire.loadLayout({ tableau: ['KS', '#2C QH'], fillStock: true })
    // Tab through the header controls to the first card.
    await solitaire.card('King of Spades').focus()
    await expect(page.locator('.card:focus')).toBeVisible()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.tableau-pile:nth-child(2) .card:focus')).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(solitaire.announcer).toContainText('Selected Queen of Hearts')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('Enter')
    await expect(solitaire.tableau.nth(0).locator('.card')).toHaveCount(2)
    await expect(solitaire.moveCounter).toHaveText('1')
  })

  test('reaches the board with Tab and draws with the keyboard', async ({ page, solitaire }) => {
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab')
      if (await solitaire.stock.evaluate((el) => el === document.activeElement)) break
    }
    await expect(solitaire.stock).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(solitaire.moveCounter).toHaveText('1')
    await page.keyboard.press('ArrowDown')
    await expect(solitaire.tableau.nth(0).locator('.card:focus')).toBeVisible()
  })

  test('opens help with ?', async ({ page }) => {
    await page.keyboard.press('Shift+?')
    await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('plays a whole seeded game using hints without errors', async ({ page, solitaire }) => {
    await solitaire.goto('?seed=7')
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('h')
      const text = (await solitaire.announcer.textContent()) ?? ''
      if (text.includes('No moves')) break
      const hinted = page.locator('.card--hint').first()
      if (await page.locator('.stock-button.card--hint').count()) {
        await solitaire.stock.click()
      } else if (await hinted.count()) {
        const target = page.locator('.pile--target').first()
        await solitaire.drag(hinted, target)
      }
    }
    const state = await solitaire.state()
    const cards = [state.stock, state.waste, ...state.foundations, ...state.tableau].flat()
    expect(new Set(cards.map((c) => c.split(':')[0])).size).toBe(52)
  })
})
