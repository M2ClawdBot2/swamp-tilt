/**
 * Ball pool: N physics balls tracked as a flat array. Single-ball play is
 * just this array with length 1 — multiball is not a special case, it's
 * the same drain/spawn machinery with more balls live at once.
 */
import type RAPIER from '@dimforge/rapier3d-compat'
import { createBall, resetBall } from './physics/ball'
import { BALL_RADIUS } from './scale'

export interface PoolBall {
  id: number
  body: RAPIER.RigidBody
  drained: boolean
}

export class BallPool {
  private world: RAPIER.World
  private nextId = 0
  balls: PoolBall[] = []

  constructor(world: RAPIER.World) {
    this.world = world
  }

  spawn(x: number, y: number, z: number): PoolBall {
    const body = createBall(this.world, x, y, z)
    const ball: PoolBall = { id: this.nextId++, body, drained: false }
    this.balls.push(ball)
    return ball
  }

  /** Remove a drained ball from the live simulation entirely. */
  remove(ball: PoolBall): void {
    ball.drained = true
    this.world.removeRigidBody(ball.body)
    this.balls = this.balls.filter((b) => b !== ball)
  }

  get liveCount(): number {
    return this.balls.length
  }

  /** The ball the camera/HUD should track: whichever is highest up (deepest into the machine). */
  primary(): PoolBall | null {
    if (this.balls.length === 0) return null
    return this.balls.reduce((best, b) => (b.body.translation().y > best.body.translation().y ? b : best))
  }

  reset(x: number, y: number, z: number): void {
    for (const b of [...this.balls]) this.remove(b)
    this.spawn(x, y, z)
  }
}

export function relaunch(ball: PoolBall, x: number, y: number, z: number, vz: number): void {
  resetBall(ball.body, x, y, z)
  ball.body.setLinvel({ x: 0, y: 0, z: vz }, true)
}

export { BALL_RADIUS }
