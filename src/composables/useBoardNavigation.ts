import type { Ref } from 'vue'

/**
 * Arrow-key navigation between piles and cards (roving focus).
 *
 * Focusable elements declare their position with data attributes:
 * `data-nav-area` (`top` | `tableau`), `data-nav-col` (0–6) and, for tableau
 * cards, `data-nav-index` (card index within the pile).
 */
export function useBoardNavigation(root: Ref<HTMLElement | null>) {
  interface Item {
    el: HTMLElement
    area: 'top' | 'tableau'
    col: number
    index: number
  }

  function items(): Item[] {
    if (!root.value) return []
    return [...root.value.querySelectorAll<HTMLElement>('[data-nav-area]')].map((el) => ({
      el,
      area: el.dataset.navArea as Item['area'],
      col: Number(el.dataset.navCol),
      index: Number(el.dataset.navIndex ?? -1),
    }))
  }

  /** The item a column lands on: the tab stop (top card) of that pile. */
  function columnStop(all: Item[], area: Item['area'], col: number): Item | undefined {
    const inCol = all.filter((i) => i.area === area && i.col === col)
    return inCol.find((i) => i.el.tabIndex === 0) ?? inCol.at(-1)
  }

  function nearestColumn(
    all: Item[],
    area: Item['area'],
    col: number,
    direction: -1 | 1 | 0,
  ): Item | undefined {
    const cols = [...new Set(all.filter((i) => i.area === area).map((i) => i.col))].sort(
      (a, b) => a - b,
    )
    let target: number | undefined
    if (direction === 1) target = cols.find((c) => c > col)
    else if (direction === -1) target = [...cols].reverse().find((c) => c < col)
    else
      target = cols.reduce<number | undefined>(
        (best, c) => (best === undefined || Math.abs(c - col) < Math.abs(best - col) ? c : best),
        undefined,
      )
    return target === undefined ? undefined : columnStop(all, area, target)
  }

  function next(current: Item, key: string, all: Item[]): Item | undefined {
    const sameCol = all.filter((i) => i.area === current.area && i.col === current.col)
    const position = sameCol.indexOf(current)
    switch (key) {
      case 'ArrowRight':
        return nearestColumn(all, current.area, current.col, 1)
      case 'ArrowLeft':
        return nearestColumn(all, current.area, current.col, -1)
      case 'ArrowDown':
        if (current.area === 'top') return nearestColumn(all, 'tableau', current.col, 0)
        return sameCol[position + 1]
      case 'ArrowUp':
        if (current.area === 'tableau' && position > 0) return sameCol[position - 1]
        if (current.area === 'tableau') return nearestColumn(all, 'top', current.col, 0)
        return undefined
      case 'Home':
        return nearestColumn(all, current.area, -1, 1)
      case 'End':
        return nearestColumn(all, current.area, 99, -1)
    }
    return undefined
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
      return
    const all = items()
    const active = document.activeElement
    const current = all.find((i) => i.el === active)
    if (!current) return
    const target = next(current, event.key, all)
    event.preventDefault()
    target?.el.focus()
  }

  return { onKeydown }
}
