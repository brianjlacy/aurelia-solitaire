import { describe, expect, it, vi } from 'vitest'
import { createEventBus } from '@/utils/eventBus'

describe('eventBus', () => {
  it('publishes to subscribers and unsubscribes', () => {
    const bus = createEventBus<{ ping: number; pong: string }>()
    const ping = vi.fn()
    const off = bus.on('ping', ping)
    bus.emit('ping', 1)
    bus.emit('pong', 'x')
    expect(ping).toHaveBeenCalledWith(1)
    off()
    bus.emit('ping', 2)
    expect(ping).toHaveBeenCalledTimes(1)
  })

  it('supports off and clear', () => {
    const bus = createEventBus<{ ping: number }>()
    const a = vi.fn()
    const b = vi.fn()
    bus.on('ping', a)
    bus.on('ping', b)
    bus.off('ping', a)
    bus.emit('ping', 1)
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
    bus.clear()
    bus.emit('ping', 2)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('tolerates handlers that unsubscribe during emit', () => {
    const bus = createEventBus<{ ping: number }>()
    const second = vi.fn()
    const off = bus.on('ping', () => off())
    bus.on('ping', second)
    bus.emit('ping', 1)
    expect(second).toHaveBeenCalled()
  })
})
