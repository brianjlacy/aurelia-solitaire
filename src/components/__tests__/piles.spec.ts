import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StockPile from '@/components/piles/StockPile.vue'
import WastePile from '@/components/piles/WastePile.vue'
import FoundationPile from '@/components/piles/FoundationPile.vue'
import TableauPile from '@/components/piles/TableauPile.vue'
import { Locations, Suit } from '@/domain/types'
import { pile } from '@/testing/fixtures'
import { mountWithBoard } from '@/testing/mount'

describe('StockPile', () => {
  it('draws on click and describes its state', async () => {
    const onStockClick = vi.fn()
    const wrapper = mountWithBoard(StockPile, {
      props: { cards: pile('#AH #2H', false), wasteCount: 0, drawCount: 3 },
      board: { onStockClick },
    })
    const button = wrapper.get('button')
    expect(button.attributes('aria-label')).toBe('Stock, 2 cards. Draw three.')
    expect(wrapper.get('.stock-count').text()).toBe('2')
    await button.trigger('click')
    expect(onStockClick).toHaveBeenCalled()
    await wrapper.setProps({ cards: pile('#AH', false), drawCount: 1 })
    expect(button.attributes('aria-label')).toBe('Stock, 1 card. Draw one.')
  })

  it('offers to recycle or is disabled when empty', async () => {
    const wrapper = mountWithBoard(StockPile, {
      props: { cards: [], wasteCount: 3, drawCount: 3, hint: true },
    })
    expect(wrapper.get('button').attributes('aria-label')).toBe(
      'Stock is empty. Turn the waste pile over.',
    )
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.get('button').classes()).toContain('card--hint')
    await wrapper.setProps({ wasteCount: 0 })
    expect(wrapper.get('button').attributes('aria-label')).toBe('Stock is empty.')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })
})

describe('WastePile', () => {
  it('fans the top three cards in draw-three mode; only the top is interactive', async () => {
    const onCardClick = vi.fn()
    const onCardDblClick = vi.fn()
    const onCardActivate = vi.fn()
    const onCardPointerDown = vi.fn()
    const wrapper = mountWithBoard(WastePile, {
      props: { cards: pile('AH 2H 3H 4H'), drawCount: 3 },
      board: { onCardClick, onCardDblClick, onCardActivate, onCardPointerDown },
    })
    const cards = wrapper.findAll('.card')
    expect(cards).toHaveLength(3)
    expect(cards[2]!.attributes('aria-label')).toBe('4 of Hearts')
    expect(cards[2]!.attributes('style')).toContain('0.24 * 2')
    expect(cards[0]!.attributes('aria-hidden')).toBe('true')
    await cards[2]!.trigger('click')
    await cards[2]!.trigger('dblclick')
    await cards[2]!.trigger('keydown', { key: 'Enter' })
    await cards[2]!.trigger('pointerdown')
    await cards[0]!.trigger('click')
    expect(onCardClick).toHaveBeenCalledTimes(1)
    expect(onCardClick).toHaveBeenCalledWith(Locations.waste(), 3)
    expect(onCardDblClick).toHaveBeenCalledWith(Locations.waste(), 3)
    expect(onCardActivate).toHaveBeenCalledWith(Locations.waste(), 3)
    expect(onCardPointerDown).toHaveBeenCalled()

    await wrapper.setProps({ drawCount: 1 })
    expect(wrapper.findAll('.card')).toHaveLength(2)
    expect(wrapper.findAll('.card')[1]!.attributes('style') ?? '').not.toContain('left')
  })

  it('shows an empty slot', () => {
    const wrapper = mountWithBoard(WastePile, { props: { cards: [], drawCount: 3 } })
    expect(wrapper.find('.pile-slot').exists()).toBe(true)
    expect(wrapper.findAll('.card')).toHaveLength(0)
  })
})

describe('FoundationPile', () => {
  it('labels the empty slot and accepts drops', async () => {
    const onPileActivate = vi.fn()
    const wrapper = mountWithBoard(FoundationPile, {
      props: { suit: Suit.Hearts, index: 0, cards: [] },
      board: { onPileActivate, dropState: () => 'valid' },
    })
    const slot = wrapper.get('[role="button"]')
    expect(slot.attributes('aria-label')).toBe('Empty foundation pile for Hearts')
    expect(wrapper.attributes('data-drop-target')).toBe('foundation-0')
    expect(wrapper.classes()).toContain('pile--drop-valid')
    await slot.trigger('click')
    await slot.trigger('keydown', { key: 'Enter' })
    await slot.trigger('keydown', { key: ' ' })
    expect(onPileActivate).toHaveBeenCalledTimes(3)
    expect(onPileActivate).toHaveBeenCalledWith(Locations.foundation(0))
  })

  it('renders only the top card as interactive and celebrates', async () => {
    const onCardClick = vi.fn()
    const onCardDblClick = vi.fn()
    const onCardActivate = vi.fn()
    const onCardPointerDown = vi.fn()
    const wrapper = mountWithBoard(FoundationPile, {
      props: { suit: Suit.Spades, index: 2, cards: pile('AS 2S 3S') },
      board: {
        onCardClick,
        onCardDblClick,
        onCardActivate,
        onCardPointerDown,
        celebrating: true,
        dropState: () => 'invalid',
      },
    })
    const cards = wrapper.findAll('.card')
    expect(cards).toHaveLength(2)
    expect(cards[1]!.classes()).toContain('card-celebrate')
    expect(wrapper.classes()).toContain('pile--drop-invalid')
    expect(wrapper.attributes('aria-label')).toBe('Spades foundation, 3 of 13')
    await cards[1]!.trigger('click')
    await cards[1]!.trigger('dblclick')
    await cards[1]!.trigger('keydown', { key: 'Enter' })
    await cards[1]!.trigger('pointerdown')
    expect(onCardClick).toHaveBeenCalledWith(Locations.foundation(2), 2)
    expect(onCardDblClick).toHaveBeenCalled()
    expect(onCardActivate).toHaveBeenCalled()
    expect(onCardPointerDown).toHaveBeenCalled()
  })
})

describe('TableauPile', () => {
  it('fans cards with tighter offsets for face-down cards', () => {
    const wrapper = mountWithBoard(TableauPile, {
      props: { pileIndex: 2, cards: pile('#9D #3C KH QS') },
    })
    const cards = wrapper.findAll('.card')
    expect(cards).toHaveLength(4)
    expect(cards[2]!.attributes('style')).toContain(
      'var(--tableau-fan-offset-hidden) * 2 + var(--tableau-fan-offset) * 0',
    )
    expect(cards[3]!.attributes('style')).toContain('var(--tableau-fan-offset) * 1')
    expect(cards[0]!.attributes('aria-label')).toBe('Face-down card')
    expect(cards[3]!.attributes('tabindex')).toBe('0')
    expect(cards[2]!.attributes('tabindex')).toBe('-1')
    expect(cards[0]!.attributes('tabindex')).toBeUndefined()
    expect(wrapper.attributes('aria-label')).toBe('Column 3, 4 cards, 2 face up')
    expect(wrapper.attributes('style')).toContain(
      'var(--tableau-fan-offset-hidden) * 2 + var(--tableau-fan-offset) * 1',
    )
  })

  it('forwards card interactions with the pile location', async () => {
    const onCardClick = vi.fn()
    const onCardDblClick = vi.fn()
    const onCardActivate = vi.fn()
    const onCardPointerDown = vi.fn()
    const wrapper = mountWithBoard(TableauPile, {
      props: { pileIndex: 0, cards: pile('KH') },
      board: {
        onCardClick,
        onCardDblClick,
        onCardActivate,
        onCardPointerDown,
        isSelected: () => true,
        isHintTarget: () => true,
      },
    })
    const card = wrapper.get('.card')
    await card.trigger('click')
    await card.trigger('dblclick')
    await card.trigger('keydown', { key: ' ' })
    await card.trigger('pointerdown')
    expect(onCardClick).toHaveBeenCalledWith(Locations.tableau(0), 0)
    expect(onCardDblClick).toHaveBeenCalledWith(Locations.tableau(0), 0)
    expect(onCardActivate).toHaveBeenCalledWith(Locations.tableau(0), 0)
    expect(onCardPointerDown).toHaveBeenCalled()
    expect(card.classes()).toContain('card--selected')
    expect(wrapper.classes()).toContain('pile--target')
    expect(wrapper.attributes('aria-label')).toBe('Column 1, 1 card, 1 face up')
  })

  it('renders an activatable empty slot', async () => {
    const onPileActivate = vi.fn()
    const wrapper = mountWithBoard(TableauPile, {
      props: { pileIndex: 4, cards: [] },
      board: { onPileActivate },
    })
    const slot = wrapper.get('[role="button"]')
    expect(slot.attributes('aria-label')).toBe('Empty column 5')
    await slot.trigger('click')
    await slot.trigger('keydown', { key: 'Enter' })
    await slot.trigger('keydown', { key: ' ' })
    expect(onPileActivate).toHaveBeenCalledTimes(3)
    expect(wrapper.attributes('aria-label')).toBe('Column 5, empty')
  })

  it('throws outside a board', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(() => mount(TableauPile, { props: { pileIndex: 0, cards: [] } })).toThrow(
      /inside <GameBoard>/,
    )
  })
})
