/**
 * SFX playback via Howler. Files are the placeholder WAVs from
 * tools/gen-sfx.ts — same names, so real recordings drop in later without
 * touching call sites. Mobile unlock (audio needs a user gesture before it
 * can play) is handled by unlocking on the first pointerdown/keydown.
 */
import { Howl } from 'howler'

export type SfxName =
  | 'flip'
  | 'bumper'
  | 'target'
  | 'spinner'
  | 'launch'
  | 'jackpot'
  | 'multiball'
  | 'drain'
  | 'tilt'
  | 'gavel'
  | 'wizardStart'
  | 'uiSelect'
  | 'uiConfirm'

const SFX_NAMES: SfxName[] = [
  'flip',
  'bumper',
  'target',
  'spinner',
  'launch',
  'jackpot',
  'multiball',
  'drain',
  'tilt',
  'gavel',
  'wizardStart',
  'uiSelect',
  'uiConfirm',
]

let sounds: Map<SfxName, Howl> | null = null
let masterVolume = 0.7
let muted = false
let unlocked = false

function basePath(): string {
  return `${import.meta.env.BASE_URL}audio`
}

function ensureLoaded(): Map<SfxName, Howl> {
  if (sounds) return sounds
  sounds = new Map()
  for (const name of SFX_NAMES) {
    sounds.set(name, new Howl({ src: [`${basePath()}/${name}.wav`], volume: masterVolume }))
  }
  return sounds
}

export function play(name: SfxName): void {
  if (muted) return
  const map = ensureLoaded()
  map.get(name)?.play()
}

export function setMuted(m: boolean): void {
  muted = m
}

export function setVolume(v: number): void {
  masterVolume = Math.max(0, Math.min(1, v))
  if (sounds) for (const h of sounds.values()) h.volume(masterVolume)
}

/** Call once on the first user gesture (click/keydown) — mobile browsers block audio until then. */
export function unlockAudio(): void {
  if (unlocked) return
  unlocked = true
  ensureLoaded()
}

export function bindUnlockOnFirstGesture(): void {
  const handler = () => {
    unlockAudio()
    window.removeEventListener('pointerdown', handler)
    window.removeEventListener('keydown', handler)
  }
  window.addEventListener('pointerdown', handler, { once: true })
  window.addEventListener('keydown', handler, { once: true })
}
