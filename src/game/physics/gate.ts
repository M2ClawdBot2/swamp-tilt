/**
 * One-way flap gate: a thin dynamic plate on a revolute hinge with a hard
 * closed limit. A ball rising from below pushes it open and passes; a ball
 * rolling over it from the field presses it into the closed limit and rolls
 * across. No sensors, no teleports — the same mechanism as a real ball gate.
 */
import type RAPIER from '@dimforge/rapier3d-compat'
import { RAPIER as R } from './world'

export interface FlapSpec {
  /** hole x extents */
  x0: number
  x1: number
  /** hinge edge z (the up-field edge the flap swings toward) */
  hingeZ: number
  /** far edge z (flap tip rests here when closed) */
  tipZ: number
  /** floor surface height the flap lies flush with */
  y: number
  level: 1 | 2 | 3
}

export class OneWayFlap {
  readonly body: RAPIER.RigidBody
  readonly spec: FlapSpec
  readonly halfX: number
  readonly halfZ: number

  constructor(world: RAPIER.World, spec: FlapSpec) {
    this.spec = spec
    this.halfX = (spec.x1 - spec.x0) / 2 + 0.4
    this.halfZ = Math.abs(spec.tipZ - spec.hingeZ) / 2 + 0.2
    const cx = (spec.x0 + spec.x1) / 2
    const cz = (spec.hingeZ + spec.tipZ) / 2

    this.body = world.createRigidBody(
      R.RigidBodyDesc.dynamic().setTranslation(cx, spec.y - 0.25, cz).setCanSleep(false),
    )
    world.createCollider(
      R.ColliderDesc.cuboid(this.halfX, 0.22, this.halfZ)
        .setDensity(0.35)
        .setFriction(0.3)
        .setRestitution(0.1),
      this.body,
    )

    const hinge = world.createRigidBody(
      R.RigidBodyDesc.fixed().setTranslation(cx, spec.y - 0.25, spec.hingeZ),
    )
    const sign = Math.sign(spec.tipZ - spec.hingeZ) // +1: tip is down-field of hinge
    const params = R.JointData.revolute(
      { x: 0, y: 0, z: 0 }, // anchor on hinge body
      { x: 0, y: 0, z: -sign * this.halfZ }, // anchor on flap (its hinge edge)
      { x: 1, y: 0, z: 0 }, // axis: world x
    )
    const joint = world.createImpulseJoint(params, hinge, this.body, true) as RAPIER.RevoluteImpulseJoint
    // closed (0) is a hard stop; opens up-and-away to ~85°
    if (sign > 0) joint.setLimits(0, 1.5)
    else joint.setLimits(-1.5, 0)
    // light spring pulls it shut
    joint.configureMotorPosition(0, 60, 4)
  }
}
