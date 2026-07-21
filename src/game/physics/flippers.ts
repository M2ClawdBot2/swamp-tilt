/**
 * Flippers are kinematic position-based bodies driven by an angular ramp —
 * NOT motors. Rest → end over ~35 ms on an ease curve; Rapier derives the
 * surface velocity from the kinematic pose delta, which is what flings the
 * ball. Hold = stays at end angle (cradle). Release ramps back down.
 *
 * The two flippers are fully independent state machines. Nothing here may
 * ever read the other flipper's state.
 */
import type RAPIER from '@dimforge/rapier3d-compat'
import { RAPIER as R } from './world'

export const FLIPPER = {
  halfLen: 3.25,
  radius: 0.95,
  y: 1.2,
  upTime: 0.035, // s, rest → end
  downTime: 0.05, // s, end → rest
  friction: 0.8,
  restitution: 0.25,
} as const

// ease-out: fast off the line like a solenoid, decelerating into the stop
function easeOutQuad(p: number): number {
  return 1 - (1 - p) * (1 - p)
}

export type FlipperSide = 'left' | 'right'

export class Flipper {
  readonly body: RAPIER.RigidBody
  readonly side: FlipperSide
  readonly pivotX: number
  readonly pivotZ: number
  readonly restAngle: number
  readonly endAngle: number
  /** ramp progress, 0 = rest, 1 = end */
  private p = 0
  /** current commanded angle (radians about +y) */
  angle: number

  constructor(world: RAPIER.World, side: FlipperSide, pivotX: number, pivotZ: number) {
    this.side = side
    this.pivotX = pivotX
    this.pivotZ = pivotZ
    // Rotation about +y maps +x → (cos a, 0, -sin a). Left bat points +x,
    // right bat points -x; signs chosen so rest = tip down-field (+z),
    // end = tip up-field (-z).
    if (side === 'left') {
      this.restAngle = -0.56 // -32°
      this.endAngle = 0.66 // +38°
    } else {
      this.restAngle = 0.56
      this.endAngle = -0.66
    }
    this.angle = this.restAngle

    this.body = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(pivotX, FLIPPER.y, pivotZ),
    )
    const alongX = side === 'left' ? FLIPPER.halfLen : -FLIPPER.halfLen
    const col = R.ColliderDesc.capsule(FLIPPER.halfLen, FLIPPER.radius)
      // capsule axis is local +y; rotate 90° about z to lay it along local x
      .setRotation({ x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 })
      .setTranslation(alongX, 0, 0)
      .setFriction(FLIPPER.friction)
      .setRestitution(FLIPPER.restitution)
    world.createCollider(col, this.body)
    this.body.setNextKinematicRotation(quatY(this.angle))
  }

  get raised(): boolean {
    return this.p >= 1
  }

  /** Advance one fixed physics step. `pressed` is read fresh every substep. */
  update(dt: number, pressed: boolean): void {
    if (pressed) this.p = Math.min(1, this.p + dt / FLIPPER.upTime)
    else this.p = Math.max(0, this.p - dt / FLIPPER.downTime)
    this.angle = this.restAngle + (this.endAngle - this.restAngle) * easeOutQuad(this.p)
    this.body.setNextKinematicRotation(quatY(this.angle))
  }
}

function quatY(a: number): { x: number; y: number; z: number; w: number } {
  return { x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) }
}
