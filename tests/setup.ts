import { afterEach } from 'vitest'

afterEach(() => {
  try {
    localStorage.clear()
  } catch {
    // jsdom always provides localStorage; ignore in other environments.
  }
})
