import { useStore } from 'zustand'
import { useGameStore, type GameState, type GameActions } from '../game/state'
import { settingsStore, type Settings, type SettingsActions } from '../game/settings'

export function useGame<T>(selector: (s: GameState & GameActions) => T): T {
  return useStore(useGameStore, selector)
}

export function useSettings<T>(selector: (s: Settings & SettingsActions) => T): T {
  return useStore(settingsStore, selector)
}
