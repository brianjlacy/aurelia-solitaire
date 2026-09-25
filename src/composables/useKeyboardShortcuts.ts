import { onBeforeUnmount, onMounted } from 'vue'

export interface ShortcutHandlers {
  undo: () => void
  redo: () => void
  newGame: () => void
  hint: () => void
  help: () => void
  escape: () => void
  /** Shortcuts are ignored while this returns true (e.g. a modal is open). */
  disabled?: () => boolean
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** Maps a keyboard event to a shortcut name, or `null`. */
export function matchShortcut(
  event: KeyboardEvent,
): keyof Omit<ShortcutHandlers, 'disabled'> | null {
  const mod = event.ctrlKey || event.metaKey
  const key = event.key.toLowerCase()
  if (mod && !event.altKey) {
    if (key === 'z') return event.shiftKey ? 'redo' : 'undo'
    if (key === 'y') return 'redo'
    return null
  }
  if (event.altKey || mod) return null
  if (event.key === '?') return 'help'
  if (event.key === 'Escape') return 'escape'
  if (event.shiftKey) return null
  if (key === 'n') return 'newGame'
  if (key === 'h') return 'hint'
  return null
}

/** Global keyboard shortcuts (Ctrl+Z, Ctrl+Y, N, H, ?, Esc). */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  function onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.repeat || isEditable(event.target)) return
    if (handlers.disabled?.()) return
    const name = matchShortcut(event)
    if (!name) return
    event.preventDefault()
    handlers[name]()
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

  return { onKeydown }
}
