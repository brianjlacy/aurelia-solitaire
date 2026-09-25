import { describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import { installErrorHandling, registerErrorReporter, reportError } from '@/utils/errorReporter'

describe('errorReporter', () => {
  it('logs and forwards errors to registered reporters', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reporter = vi.fn()
    const off = registerErrorReporter(reporter)
    const failing = registerErrorReporter(() => {
      throw new Error('reporter broke')
    })
    const error = new Error('boom')
    reportError(error, { source: 'test', info: 'detail' })
    expect(log).toHaveBeenCalledWith('[solitaire] test (detail):', error)
    expect(reporter).toHaveBeenCalledWith(error, { source: 'test', info: 'detail' })
    off()
    failing()
    reportError(error, { source: 'test' })
    expect(log).toHaveBeenLastCalledWith('[solitaire] test:', error)
    expect(reporter).toHaveBeenCalledTimes(1)
  })

  it('installs Vue and window handlers', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reporter = vi.fn()
    const off = registerErrorReporter(reporter)
    const app = createApp(defineComponent({ render: () => h('div') }))
    const target = new EventTarget() as unknown as Window
    installErrorHandling(app, target)

    const error = new Error('vue')
    app.config.errorHandler!(error, null, 'render')
    expect(reporter).toHaveBeenCalledWith(error, { source: 'vue', info: 'render' })

    const errorEvent = Object.assign(new Event('error'), {
      error: new Error('window'),
      message: 'window',
    })
    target.dispatchEvent(errorEvent)
    expect(reporter).toHaveBeenLastCalledWith(errorEvent.error, { source: 'window' })

    const messageOnly = Object.assign(new Event('error'), { error: null, message: 'script error' })
    target.dispatchEvent(messageOnly)
    expect(reporter).toHaveBeenLastCalledWith('script error', { source: 'window' })

    const rejection = Object.assign(new Event('unhandledrejection'), { reason: 'nope' })
    target.dispatchEvent(rejection)
    expect(reporter).toHaveBeenLastCalledWith('nope', { source: 'unhandledrejection' })
    off()
  })
})
