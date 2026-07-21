import type RAPIER from '@dimforge/rapier3d-compat'
import { RAPIER as R } from './world'
import { BALL_DENSITY, BALL_RADIUS } from '../scale'

/**
 * The ball: small, fast, steel. CCD is non-negotiable — at 240 Hz a 10 m/s
 * ball moves 4.2 cm per step, more than any wall is thick.
 */
export function createBall(world: RAPIER.World, x: number, y: number, z: number): RAPIER.RigidBody {
  const body = world.createRigidBody(
    R.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setCcdEnabled(true)
      // never sleep: the table is always inclined, and a sleeping ball ignores
      // gravity until something touches it (found by the Gate 1 release trace)
      .setCanSleep(false)
      .setLinearDamping(0.06)
      .setAngularDamping(0.05),
  )
  world.createCollider(
    R.ColliderDesc.ball(BALL_RADIUS)
      .setDensity(BALL_DENSITY)
      .setFriction(0.35)
      .setRestitution(0.28),
    body,
  )
  return body
}

export function resetBall(ball: RAPIER.RigidBody, x: number, y: number, z: number): void {
  ball.setTranslation({ x, y, z }, true)
  ball.setLinvel({ x: 0, y: 0, z: 0 }, true)
  ball.setAngvel({ x: 0, y: 0, z: 0 }, true)
}
