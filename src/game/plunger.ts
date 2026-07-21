/**
 * The plunger: hold to charge (pull back), release to fire the ball up the
 * shooter lane. Charge maps to launch power. This is the ball-start ritual
 * that makes the machine read as real — a ball waits in the lane, you pull
 * and let go, it rips up into play.
 *
 * The ball body is kept parked (velocity zeroed) while it waits so it can't
 * dribble; charge grows while `held`; release imparts a straight -z velocity
 * (up the lane) scaled between MIN and MAX.
 */
import type RAPIER from '@dimforge/rapier3d-compat'
import { useGameStore } from './state'
import { PLAZA } from './levels'

export const PLUNGER = {
  chargeTime: 0.9, // seconds of holding to reach full power
  minLaunch: 380, // cm/s at zero charge (still clears the lane)
  maxLaunch: 720, // cm/s at full charge (rips around the orbit)
} as const

/** Park a served ball at the bottom of the shooter lane, waiting. */
export function serveToLane(ball: RAPIER.RigidBody): void {
  const S = PLAZA.shooter
  ball.setTranslation({ x: S.serveX, y: 1.35, z: S.serveZ }, true)
  ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
  ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
  useGameStore.setState({ ballInLane: true, launched: false, plungerCharge: 0 })
}

/** Advance the charge while the plunger is held. Call each physics step. */
export function chargePlunger(dt: number, held: boolean): void {
  const s = useGameStore.getState()
  if (!s.ballInLane) return
  if (held) {
    useGameStore.setState({ plungerCharge: Math.min(1, s.plungerCharge + dt / PLUNGER.chargeTime) })
  }
}

/**
 * Fire. Returns the launch speed (cm/s) if a ball was actually in the lane,
 * else null. `power` overrides the accumulated charge when provided (the
 * mobile pull-back gesture supplies its own 0-1 power directly).
 */
export function releasePlunger(ball: RAPIER.RigidBody, power?: number): number | null {
  const s = useGameStore.getState()
  if (!s.ballInLane) return null
  const charge = power ?? s.plungerCharge
  const speed = PLUNGER.minLaunch + (PLUNGER.maxLaunch - PLUNGER.minLaunch) * Math.min(1, Math.max(0, charge))
  ball.setLinvel({ x: 0, y: 0, z: -speed }, true)
  useGameStore.setState({ ballInLane: false, launched: true, plungerCharge: 0 })
  return speed
}
