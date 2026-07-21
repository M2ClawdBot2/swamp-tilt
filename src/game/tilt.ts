/**
 * Tilt: a nudge always shoves the ball(s) physically. Warning at 2 nudges
 * within the rolling window, tilt (death) at 3. Per the build prompt's
 * flavor: "a chomp, warning at 2, death at 3."
 */
import { useGameStore } from './state'

export const TILT = {
  windowSeconds: 2.5,
  warningAt: 2,
  tiltAt: 3,
  impulseStrength: 55, // cm/s added to the ball per nudge
} as const

let nudgeTimestamps: number[] = []

export function resetTilt(): void {
  nudgeTimestamps = []
  useGameStore.setState({ tiltWarnings: 0, tilted: false })
}

/** Physical nudge vector for a direction, world XZ (gravity-plane) units. */
export function nudgeImpulse(dir: 'left' | 'right' | 'up'): { x: number; z: number } {
  const s = TILT.impulseStrength
  if (dir === 'left') return { x: s, z: 0 }
  if (dir === 'right') return { x: -s, z: 0 }
  return { x: 0, z: -s * 0.6 } // "up" nudge: a gentler shove up-field
}

/**
 * Register a nudge at time `t` (seconds, monotonic). Returns whether this
 * nudge caused a NEW tilt (so the caller can react — freeze flippers, kill
 * scoring for the rest of the ball).
 */
export function registerNudge(t: number): boolean {
  const state = useGameStore.getState()
  if (state.tilted) return false // already tilted this ball; nudging again changes nothing

  nudgeTimestamps.push(t)
  nudgeTimestamps = nudgeTimestamps.filter((ts) => t - ts <= TILT.windowSeconds)
  const count = nudgeTimestamps.length

  if (count >= TILT.tiltAt) {
    useGameStore.setState({ tilted: true, tiltWarnings: TILT.tiltAt })
    state.pushLog('TILT — chomp')
    return true
  }
  if (count >= TILT.warningAt) {
    useGameStore.setState({ tiltWarnings: count })
    state.pushLog(`Tilt warning ${count}`)
  }
  return false
}
