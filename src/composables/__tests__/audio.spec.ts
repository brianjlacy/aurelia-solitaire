import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { resetAudioForTests, useAudio } from '@/composables/useAudio'
import { useSettingsStore } from '@/stores/settingsStore'

class FakeParam {
  setValueAtTime = vi.fn()
  exponentialRampToValueAtTime = vi.fn()
}
class FakeNode {
  frequency = new FakeParam()
  gain = new FakeParam()
  type = ''
  connect = vi.fn(() => this)
  start = vi.fn()
  stop = vi.fn()
}
class FakeAudioContext {
  static instances = 0
  state = 'suspended'
  currentTime = 0
  destination = {}
  resume = vi.fn(() => Promise.resolve())
  constructor() {
    FakeAudioContext.instances++
  }
  createOscillator = vi.fn(() => new FakeNode())
  createGain = vi.fn(() => new FakeNode())
}

describe('useAudio', () => {
  let play: ReturnType<typeof vi.fn>
  beforeEach(() => {
    setActivePinia(createPinia())
    resetAudioForTests()
    FakeAudioContext.instances = 0
    vi.stubGlobal('AudioContext', FakeAudioContext)
    play = vi.fn(() => Promise.reject(new Error('autoplay blocked')))
    vi.stubGlobal(
      'Audio',
      class {
        preload = ''
        volume = 1
        currentTime = 5
        play = play
        constructor(public src: string) {}
      },
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  it('synthesises tones through a shared AudioContext', () => {
    const audio = useAudio()
    audio.play('flip')
    audio.play('place')
    audio.play('invalid')
    expect(FakeAudioContext.instances).toBe(1)
  })

  it('plays samples and tolerates autoplay rejection', () => {
    const audio = useAudio()
    audio.play('shuffle')
    audio.play('shuffle')
    audio.play('win')
    expect(play).toHaveBeenCalledTimes(3)
  })

  it('tolerates media errors and missing return values', () => {
    play.mockImplementationOnce(() => {
      throw new Error('not implemented')
    })
    play.mockImplementationOnce(() => undefined as never)
    const audio = useAudio()
    expect(() => audio.play('win')).not.toThrow()
    expect(() => audio.play('win')).not.toThrow()
  })

  it('is silent when muted or at zero volume', () => {
    const settings = useSettingsStore()
    const audio = useAudio()
    settings.update({ soundEnabled: false })
    audio.play('win')
    settings.update({ soundEnabled: true, volume: 0 })
    audio.play('win')
    expect(play).not.toHaveBeenCalled()
  })

  it('degrades without Web Audio', () => {
    vi.stubGlobal('AudioContext', undefined)
    expect(() => useAudio().play('flip')).not.toThrow()
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('denied')
        }
      },
    )
    expect(() => useAudio().play('flip')).not.toThrow()
  })

  it('does not resume a running context', () => {
    class Running extends FakeAudioContext {
      override state = 'running'
    }
    vi.stubGlobal('AudioContext', Running)
    useAudio().play('flip')
    expect(FakeAudioContext.instances).toBe(1)
  })
})
