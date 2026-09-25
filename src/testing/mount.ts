import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { defineComponent, h, type Component, type DefineComponent } from 'vue'
import { BOARD_CONTEXT, type BoardContext } from '@/components/game/boardContext'

/** Runs a composable inside a mounted component and returns its result. */
export function withSetup<T>(composable: () => T, pinia: Pinia = createPinia()) {
  setActivePinia(pinia)
  let result!: T
  const wrapper = mount(
    defineComponent({
      setup() {
        result = composable()
        return () => h('div')
      },
    }),
    { global: { plugins: [pinia] }, attachTo: document.body },
  )
  return { result, wrapper, pinia }
}

/** A board context whose every method is a spy; override as needed. */
export function fakeBoard(overrides: Partial<BoardContext> = {}): BoardContext {
  const noop = () => undefined
  return {
    onCardClick: noop,
    onCardDblClick: noop,
    onCardActivate: noop,
    onCardPointerDown: noop,
    onPileActivate: noop,
    onStockClick: noop,
    canPickUp: () => true,
    isSelected: () => false,
    isCardDragging: () => false,
    isInvalid: () => false,
    isHintSource: () => false,
    isHintTarget: () => false,
    isSelectionTarget: () => false,
    dropState: () => null,
    celebrating: false,
    ...overrides,
  }
}

/** Mounts a pile component with a fake board context. */
export function mountWithBoard(
  component: Component,
  options: { props?: Record<string, unknown>; board?: Partial<BoardContext> } = {},
) {
  return mount(component as DefineComponent<Record<string, unknown>>, {
    props: options.props,
    global: { provide: { [BOARD_CONTEXT as symbol]: fakeBoard(options.board) } },
  })
}

/** Sets a fixed bounding box on an element (jsdom has no layout). */
export function setRect(
  el: Element,
  rect: { left: number; top: number; width: number; height: number },
): void {
  const value = {
    ...rect,
    x: rect.left,
    y: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON: () => rect,
  }
  el.getBoundingClientRect = () => value as DOMRect
}
