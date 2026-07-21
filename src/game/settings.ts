/**
 * Persistent options: audio, camera, difficulty, reduced motion, cabinet
 * visibility. localStorage-backed, vanilla zustand (same reasoning as
 * state.ts — read/written from both React and the physics loop).
 */
import { createStore } from 'zustand/vanilla'

export type Difficulty = 'easy' | 'standard' | 'hard'

export interface Settings {
  audioVolume: number // 0-1
  audioMuted: boolean
  cameraShake: boolean
  followStrength: number // 0-1
  reducedMotion: boolean
  difficulty: Difficulty
  showCabinet: boolean
}

const DEFAULTS: Settings = {
  audioVolume: 0.7,
  audioMuted: false,
  cameraShake: true,
  followStrength: 0.5,
  reducedMotion: false,
  difficulty: 'standard',
  showCabinet: true,
}

const STORAGE_KEY = 'swamp-tilt:settings'

function load(): Settings {
  if (typeof localStorage === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

function persist(s: Settings): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // storage full/unavailable — settings just won't persist this session
  }
}

export interface SettingsActions {
  set<K extends keyof Settings>(key: K, value: Settings[K]): void
  reset(): void
}

export const settingsStore = createStore<Settings & SettingsActions>((set, get) => ({
  ...load(),
  set(key, value) {
    set({ [key]: value } as Partial<Settings>)
    persist(get())
  },
  reset() {
    set(DEFAULTS)
    persist(get())
  },
}))
