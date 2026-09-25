import { useSettingsStore } from '@/stores/settingsStore'
import shuffleUrl from '@/assets/sounds/shuffle.mp3?url'
import winUrl from '@/assets/sounds/win.mp3?url'

export type SoundName = 'shuffle' | 'flip' | 'place' | 'invalid' | 'win'

type ToneSpec = {
  frequency: number
  duration: number
  type: OscillatorType
  gain: number
  slide?: number
}

/** Short synthesised effects — no network requests, tiny footprint. */
const TONES: Partial<Record<SoundName, ToneSpec>> = {
  flip: { frequency: 660, duration: 0.06, type: 'triangle', gain: 0.25, slide: 880 },
  place: { frequency: 220, duration: 0.07, type: 'sine', gain: 0.35, slide: 160 },
  invalid: { frequency: 150, duration: 0.18, type: 'square', gain: 0.12, slide: 110 },
}

const SAMPLES: Partial<Record<SoundName, string>> = { shuffle: shuffleUrl, win: winUrl }

let context: AudioContext | null = null
const elements = new Map<string, HTMLAudioElement>()

function getContext(): AudioContext | null {
  if (context) return context
  const Ctor = globalThis.AudioContext as typeof AudioContext | undefined
  if (!Ctor) return null
  try {
    context = new Ctor()
  } catch {
    return null
  }
  return context
}

function playTone(spec: ToneSpec, volume: number): void {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined)
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = spec.type
  osc.frequency.setValueAtTime(spec.frequency, t)
  if (spec.slide) osc.frequency.exponentialRampToValueAtTime(spec.slide, t + spec.duration)
  gain.gain.setValueAtTime(spec.gain * volume, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + spec.duration)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + spec.duration + 0.02)
}

function playSample(url: string, volume: number): void {
  let element = elements.get(url)
  if (!element) {
    element = new Audio(url)
    element.preload = 'auto'
    elements.set(url, element)
  }
  element.volume = volume
  element.currentTime = 0
  try {
    const playing = element.play()
    // Autoplay restrictions reject the promise; sound is best-effort.
    if (playing && typeof playing.catch === 'function') playing.catch(() => undefined)
  } catch {
    // Media playback not supported in this environment.
  }
}

/** Sound effects honouring the mute and volume settings. */
export function useAudio() {
  const settings = useSettingsStore()

  function play(name: SoundName): void {
    if (!settings.soundEnabled || settings.volume <= 0) return
    const tone = TONES[name]
    if (tone) playTone(tone, settings.volume)
    const sample = SAMPLES[name]
    if (sample) playSample(sample, settings.volume)
  }

  return { play }
}

/** Test helper: forget cached audio resources. */
export function resetAudioForTests(): void {
  context = null
  elements.clear()
}
