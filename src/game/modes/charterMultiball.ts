/**
 * L2 — Charter Multiball. Three filing-cabinet locks, then multiball
 * starts ON Reitz (locks are a Reitz-level grind, the payoff stays there).
 */
import type { BallPool } from '../multiball'
import { useGameStore } from '../state'
import { REITZ } from '../levels'

export const CHARTER = {
  locksNeeded: 3,
  ballCount: 3,
  jackpot: 75_000,
} as const

export function registerLock(): void {
  const s = useGameStore.getState()
  if (s.charterActive) return
  if (s.charterLocks >= CHARTER.locksNeeded) return
  const locks = s.charterLocks + 1
  useGameStore.setState({ charterLocks: locks })
  s.addScore(10_000, `Filing cabinet lock ${locks}/${CHARTER.locksNeeded}`)
}

export function startCharter(pool: BallPool): boolean {
  const s = useGameStore.getState()
  if (s.charterActive || s.charterLocks < CHARTER.locksNeeded) return false
  useGameStore.setState({
    charterActive: true,
    charterLocks: 0,
    activeModeName: 'Charter Multiball',
  })
  s.pushLog('CHARTER MULTIBALL — 3 balls on The Reitz')
  while (pool.liveCount < CHARTER.ballCount) {
    pool.spawn(-4 + pool.liveCount * 4, REITZ.y + 3, -10)
  }
  return true
}

export function tickCharter(pool: BallPool): boolean {
  const s = useGameStore.getState()
  if (!s.charterActive) return false
  if (pool.liveCount <= 1) {
    useGameStore.setState({ charterActive: false, activeModeName: null })
    s.addScore(CHARTER.jackpot, 'Charter jackpot')
    s.pushLog('CHARTER MULTIBALL ends')
    return true
  }
  return false
}
