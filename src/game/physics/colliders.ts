/**
 * HAND-AUTHORED playfield collision. Never generated.
 * Every surface the ball can touch is a numerically-defined primitive so the
 * ball's behavior is exact and predictable. Visual meshes get parented to
 * these later; in prod the collider debug meshes are hidden.
 */
import type RAPIER from '@dimforge/rapier3d-compat'
import { RAPIER as R } from './world'
import { GLASS_Y, WALL_HEIGHT } from '../scale'

/** Renderer-consumable description of one authored collider box. */
export interface WallDesc {
  cx: number
  cy: number
  cz: number
  yaw: number // rotation about +y, radians
  hx: number
  hy: number
  hz: number
  kind: 'wall' | 'floor' | 'glass'
}

const WALL_FRICTION = 0.3
const WALL_RESTITUTION = 0.32
const FLOOR_FRICTION = 0.35
const FLOOR_RESTITUTION = 0.03

// ---- Gate 1 table geometry (all cm, see SCALE.md) ----
export const TABLE = {
  sideWallX: 26.5, // wall centerline; half-thickness 1.0 → inner face ±25.5
  sideWallHalfT: 1.0,
  arcCenterZ: -24,
  outerArcR: 26.5,
  innerArcR: 19.5,
  innerRailHalfT: 0.5,
  innerRailBottomZ: 4, // rail runs z ∈ [arcCenterZ, this]
  drainZ: 44,
  funnel: { xOuter: 25.5, zOuter: 16, xInner: 13.2, zInner: 33.2 },
  flipperPivotX: 11,
  flipperPivotZ: 36,
} as const

/** Axis-aligned or yawed wall segment from (x1,z1) to (x2,z2). */
function segment(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  halfT: number,
  overlap = 0.4,
): WallDesc {
  const dx = x2 - x1
  const dz = z2 - z1
  const len = Math.hypot(dx, dz)
  // rotation about +y by yaw maps +x to (cos yaw, 0, -sin yaw)
  const yaw = Math.atan2(-dz, dx)
  return {
    cx: (x1 + x2) / 2,
    cy: WALL_HEIGHT / 2,
    cz: (z1 + z2) / 2,
    yaw,
    hx: len / 2 + overlap,
    hy: WALL_HEIGHT / 2,
    hz: halfT,
    kind: 'wall',
  }
}

function arc(
  cx: number,
  cz: number,
  r: number,
  a0: number,
  a1: number,
  n: number,
  halfT: number,
): WallDesc[] {
  const out: WallDesc[] = []
  for (let i = 0; i < n; i++) {
    const p = a0 + ((a1 - a0) * i) / n
    const q = a0 + ((a1 - a0) * (i + 1)) / n
    out.push(
      segment(
        cx + r * Math.cos(p),
        cz + r * Math.sin(p),
        cx + r * Math.cos(q),
        cz + r * Math.sin(q),
        halfT,
        0.6, // extra overlap so arc segment joints have no gaps
      ),
    )
  }
  return out
}

export function gate1TableDescs(): WallDesc[] {
  const T = TABLE
  const walls: WallDesc[] = []

  // Straight side walls (outer), z from arc springline down to drain wall
  walls.push(segment(-T.sideWallX, T.arcCenterZ, -T.sideWallX, T.drainZ, T.sideWallHalfT))
  walls.push(segment(T.sideWallX, T.arcCenterZ, T.sideWallX, T.drainZ, T.sideWallHalfT))

  // Outer top arch: 180° → 360° passes through the table's top (-z)
  walls.push(...arc(0, T.arcCenterZ, T.outerArcR, Math.PI, 2 * Math.PI, 22, T.sideWallHalfT))

  // Inner orbit rail: arc + two vertical tails. Lane between inner rail and
  // outer wall is the orbit (≈5.5 cm clear, ball is 2.7).
  walls.push(...arc(0, T.arcCenterZ, T.innerArcR, Math.PI, 2 * Math.PI, 18, T.innerRailHalfT))
  walls.push(segment(-T.innerArcR, T.arcCenterZ, -T.innerArcR, T.innerRailBottomZ, T.innerRailHalfT))
  walls.push(segment(T.innerArcR, T.arcCenterZ, T.innerArcR, T.innerRailBottomZ, T.innerRailHalfT))

  // Funnel (inlane) walls feeding the flippers
  walls.push(segment(-T.funnel.xOuter, T.funnel.zOuter, -T.funnel.xInner, T.funnel.zInner, 0.6))
  walls.push(segment(T.funnel.xOuter, T.funnel.zOuter, T.funnel.xInner, T.funnel.zInner, 0.6))

  // Post segments: funnel end → flipper base. Without these there's a dead
  // pocket beside the pivot where the ball wedges instead of resting on the
  // bat (found by the Gate 1 cradle-release trace).
  walls.push(segment(-T.funnel.xInner, T.funnel.zInner, -T.flipperPivotX - 0.6, T.flipperPivotZ - 0.6, 0.6))
  walls.push(segment(T.funnel.xInner, T.funnel.zInner, T.flipperPivotX + 0.6, T.flipperPivotZ - 0.6, 0.6))

  // Drain wall behind the flippers (ball that reaches it has drained; game
  // logic respawns, the wall just keeps physics contained)
  walls.push(segment(-T.sideWallX, T.drainZ, T.sideWallX, T.drainZ, T.sideWallHalfT))

  // Floor
  walls.push({ cx: 0, cy: -1, cz: -4, yaw: 0, hx: 29, hy: 1, hz: 50, kind: 'floor' })
  // Glass (invisible ceiling) so flipper smashes can't eject the ball
  walls.push({ cx: 0, cy: GLASS_Y + 1, cz: -4, yaw: 0, hx: 29, hy: 1, hz: 50, kind: 'glass' })

  return walls
}

/** Instantiate descs as fixed colliders. Returns the descs for the renderer. */
export function buildGate1Table(world: RAPIER.World): WallDesc[] {
  const descs = gate1TableDescs()
  const body = world.createRigidBody(R.RigidBodyDesc.fixed())
  for (const d of descs) {
    const desc = R.ColliderDesc.cuboid(d.hx, d.hy, d.hz)
      .setTranslation(d.cx, d.cy, d.cz)
      .setRotation({ x: 0, y: Math.sin(d.yaw / 2), z: 0, w: Math.cos(d.yaw / 2) })
      .setFriction(d.kind === 'floor' ? FLOOR_FRICTION : WALL_FRICTION)
      .setRestitution(d.kind === 'floor' ? FLOOR_RESTITUTION : WALL_RESTITUTION)
    world.createCollider(desc, body)
  }
  return descs
}
