import { afterEach } from 'vitest'

// jsdom lacks ResizeObserver, which Headless UI's Dialog uses.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

afterEach(() => {
  try {
    localStorage.clear()
  } catch {
    // jsdom always provides localStorage; ignore in other environments.
  }
})
