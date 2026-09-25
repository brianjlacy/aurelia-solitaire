import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CardComponent from '@/components/cards/CardComponent.vue'
import { Card } from '@/domain/models/Card'
import { Rank, Suit } from '@/domain/types'

const ace = new Card(Suit.Hearts, Rank.Ace)

describe('CardComponent', () => {
  afterEach(() => vi.useRealTimers())

  it('should render card rank and suit when face up', () => {
    const wrapper = mount(CardComponent, { props: { card: ace, faceUp: true } })
    expect(wrapper.text()).toContain('A')
    expect(wrapper.find('.suit-hearts').exists()).toBe(true)
    expect(wrapper.attributes('aria-label')).toBe('Ace of Hearts')
    expect(wrapper.attributes('role')).toBe('img')
    expect(wrapper.attributes('data-card-id')).toBe('hearts-1')
  })

  it('renders face cards with a large letter', () => {
    const wrapper = mount(CardComponent, {
      props: { card: new Card(Suit.Spades, Rank.King), faceUp: true },
    })
    expect(wrapper.find('.card-center--face').text()).toContain('K')
  })

  it('should show card back when face down', () => {
    const wrapper = mount(CardComponent, { props: { card: ace, faceUp: false } })
    expect(wrapper.find('.card-back').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('A')
    expect(wrapper.attributes('aria-label')).toBe('Face-down card')
  })

  it('should emit click event', async () => {
    const wrapper = mount(CardComponent, { props: { card: ace, faceUp: true, interactive: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
    expect(wrapper.emitted('click')![0]).toEqual([ace])
  })

  it('emits dblclick, activate and dragstart only when interactive', async () => {
    const wrapper = mount(CardComponent, { props: { card: ace, faceUp: true } })
    await wrapper.trigger('click')
    await wrapper.trigger('dblclick')
    await wrapper.trigger('keydown', { key: 'Enter' })
    await wrapper.trigger('pointerdown')
    expect(wrapper.emitted()).not.toHaveProperty('click')
    expect(wrapper.emitted()).not.toHaveProperty('activate')

    await wrapper.setProps({ interactive: true, draggable: true, tabbable: true })
    expect(wrapper.attributes('role')).toBe('button')
    expect(wrapper.attributes('tabindex')).toBe('0')
    expect(wrapper.attributes('aria-pressed')).toBe('false')
    await wrapper.trigger('dblclick')
    await wrapper.trigger('keydown', { key: 'Enter' })
    await wrapper.trigger('keydown', { key: ' ' })
    await wrapper.trigger('pointerdown')
    expect(wrapper.emitted('dblclick')).toHaveLength(1)
    expect(wrapper.emitted('activate')).toHaveLength(2)
    expect(wrapper.emitted('dragstart')![0]![0]).toBe(ace)

    await wrapper.setProps({ draggable: false, tabbable: false })
    await wrapper.trigger('pointerdown')
    expect(wrapper.emitted('dragstart')).toHaveLength(1)
    expect(wrapper.attributes('tabindex')).toBe('-1')
  })

  it('should be draggable only when draggable prop is true', async () => {
    const wrapper = mount(CardComponent, { props: { card: ace, faceUp: true, draggable: true } })
    expect(wrapper.attributes('data-draggable')).toBe('true')
    // Native HTML5 drag is disabled in favour of pointer events.
    expect(wrapper.attributes('draggable')).toBe('false')
    await wrapper.setProps({ draggable: false })
    expect(wrapper.attributes('data-draggable')).toBe('false')
  })

  it('reflects visual states as classes', () => {
    const wrapper = mount(CardComponent, {
      props: {
        card: ace,
        faceUp: true,
        interactive: true,
        draggable: true,
        selected: true,
        hint: true,
        invalid: true,
        dragging: true,
        celebrate: true,
        offsetIndex: 2,
      },
    })
    const classes = wrapper.classes()
    for (const c of [
      'card--interactive',
      'card--selected',
      'card--hint',
      'card-shake',
      'card--dragging',
      'card-celebrate',
    ]) {
      expect(classes).toContain(c)
    }
    expect(wrapper.attributes('style')).toContain('animation-delay: 180ms')
    expect(wrapper.attributes('aria-pressed')).toBe('true')
  })

  it('renders ghosts without ids or interactivity', () => {
    const wrapper = mount(CardComponent, {
      props: { card: ace, faceUp: true, ghost: true, interactive: true },
    })
    expect(wrapper.attributes('data-card-id')).toBeUndefined()
    expect(wrapper.attributes('data-ghost-card-id')).toBe('hearts-1')
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.attributes('tabindex')).toBeUndefined()
  })

  it('plays a flip animation when revealed', async () => {
    vi.useFakeTimers()
    const wrapper = mount(CardComponent, { props: { card: ace, faceUp: false } })
    await wrapper.setProps({ faceUp: true })
    expect(wrapper.classes()).toContain('card-flip')
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(wrapper.classes()).not.toContain('card-flip')
    await wrapper.setProps({ faceUp: false })
    expect(wrapper.classes()).not.toContain('card-flip')
    wrapper.unmount()
  })
})
