/**
 * HAND-AUTHORED collision helpers + shared types. Never generated.
 * Every surface the ball can touch is a numerically-defined primitive so the
 * ball's behavior is exact and predictable. Level geometry lives in
 * src/game/levels/*.ts; this file owns the primitives and the world builder.
 */
import type RAPIER from '@dimforge/rapier3d-compat'
import { RAPIER as R } from './world'
import { WALL_HEIGHT } from '../scale'

/** Renderer-consumable description of one authored collider box. */
export interface WallDesc {
  cx: number
  cy: number
  cz: number
  yaw: number // rotation about +y, radians
  pitch: number // rotation about +x (applied after yaw), radians — ramps
  hx: number
  hy: number
  hz: number
  kind: 'wall' | 'floor' | 'glass' | 'ramp' | 'rampWall'
  level: 1 | 2 | 3
}

export const WALL_FRICTION = 0.3
export const WALL_RESTITUTION = 0.32
export const FLOOR_FRICTION = 0.35
export const FLOOR_RESTITUTION = 0.03

export function quatFor(d: { yaw: number; pitch: number }): {
  x: number
  y: number
  z: number
  w: number
} {
  // q = qy(yaw) ⊗ qx(pitch); in practice geometry uses one or the other
  const sy = Math.sin(d.yaw / 2)
  const cy = Math.cos(d.yaw / 2)
  const sx = Math.sin(d.pitch / 2)
  const cx = Math.cos(d.pitch / 2)
  return { x: cy * sx, y: sy * cx, z: -sy * sx, w: cy * cx }
}

export interface SegmentOpts {
  y0?: number // base of wall (floor surface height)
  h?: number // wall height
  overlap?: number
  level?: 1 | 2 | 3
}

/** Vertical wall segment from (x1,z1) to (x2,z2) standing on y0. */
export function segment(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  halfT: number,
  opts: SegmentOpts = {},
): WallDesc {
  const { y0 = 0, h = WALL_HEIGHT, overlap = 0.4, level = 1 } = opts
  const dx = x2 - x1
  const dz = z2 - z1
  const len = Math.hypot(dx, dz)
  // rotation about +y by yaw maps +x to (cos yaw, 0, -sin yaw)
  const yaw = Math.atan2(-dz, dx)
  return {
    cx: (x1 + x2) / 2,
    cy: y0 + h / 2,
    cz: (z1 + z2) / 2,
    yaw,
    pitch: 0,
    hx: len / 2 + overlap,
    hy: h / 2,
    hz: halfT,
    kind: 'wall',
    level,
  }
}

export function arc(
  cx: number,
  cz: number,
  r: number,
  a0: number,
  a1: number,
  n: number,
  halfT: number,
  opts: SegmentOpts = {},
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
        { overlap: 0.6, ...opts },
      ),
    )
  }
  return out
}

/** Axis-aligned box (floors, lids). x/z/y are min/max extents. */
export function slab(
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  yTop: number,
  thickness: number,
  kind: WallDesc['kind'],
  level: 1 | 2 | 3,
): WallDesc {
  return {
    cx: (x0 + x1) / 2,
    cy: yTop - thickness / 2,
    cz: (z0 + z1) / 2,
    yaw: 0,
    pitch: 0,
    hx: (x1 - x0) / 2,
    hy: thickness / 2,
    hz: (z1 - z0) / 2,
    kind,
    level,
  }
}

/**
 * Smooth enclosed ramp: a cubic-Bézier height profile (horizontal tangents
 * at both ends) sampled into short pitched channel segments. Two lessons
 * from the Gate 2 proofs are baked in here:
 *   1. a sharp flat→43° entry is an inelastic impact that eats ~65% of the
 *      ball's speed (it stalled 20 cm below the crest) — the curved lip
 *      distributes the turn across many small transitions;
 *   2. the near-horizontal exit tangent plus the lid means the ball arrives
 *      rolling at floor level instead of ballistically overflying the field.
 */
/**
 * Profile polyline: a short shallow entry chamfer, one long straight climb,
 * a short shallow exit chamfer. Every extra joint in a multi-arc curve is
 * another chance for a ball to clip a seam and bleed speed to friction —
 * three segments total (vs. the ~18 an arc-sampled Bézier needed) proved far
 * more reliable in the Gate 2 proofs: fewer joints, easier to keep them
 * clean, energy loss stays close to the single unavoidable entry impact.
 * Heading is -z (up-field).
 */
export function rampProfilePoints(
  z0: number,
  y0: number,
  z1: number,
  y1: number,
): { z: number; y: number }[] {
  const L = z0 - z1
  const H = y1 - y0
  const chamfer = Math.min(0.16, (0.4 * L) / Math.hypot(L, H)) // fraction of run per chamfer
  return [
    { z: z0, y: y0 },
    { z: z0 - L * chamfer * 0.5, y: y0 + H * chamfer * 0.15 },
    { z: z1 + L * chamfer * 0.5, y: y1 - H * chamfer * 0.15 },
    { z: z1, y: y1 },
  ]
}

export function rampProfile(
  cx: number,
  z0: number,
  y0: number,
  z1: number,
  y1: number,
  width: number,
  level: 1 | 2 | 3,
): WallDesc[] {
  const pts = rampProfilePoints(z0, y0, z1, y1)
  const out: WallDesc[] = []
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    if (Math.hypot(b.z - a.z, b.y - a.y) < 0.05) continue
    out.push(...rampChannel(cx, a.z, a.y, b.z, b.y, width, level))
  }
  return out
}

/**
 * Straight enclosed ramp channel running along z (heading up-field when
 * z1 < z0), climbing from y0 to y1. Floor + two side walls + lid: a
 * ball-tight square tube. Width is the clear interior width.
 */
export function rampChannel(
  cx: number,
  z0: number,
  y0: number,
  z1: number,
  y1: number,
  width: number,
  level: 1 | 2 | 3,
  lid = true,
): WallDesc[] {
  const dz = z1 - z0
  const dy = y1 - y0
  const len = Math.hypot(dz, dy) + 1.2 // slight overlap at both ends
  const pitch = Math.atan2(dy, -dz) // box axis maps to (0, sin, -cos)·? see note
  const midY = (y0 + y1) / 2
  const midZ = (z0 + z1) / 2
  // Boxes are placed along the segment's surface NORMAL n=(0,cos p,sin p),
  // not world y: world-y offsets make pitched top faces sag by hy·(1−cos p),
  // which differs per segment and exposes millimeter end-face steps at the
  // joints — at 5 m/s those read as head-on walls (Gate 2 finding). With
  // normal placement all segment faces contain the shared polyline points,
  // and concave-joint overlaps tuck under the neighbor.
  const nY = Math.cos(pitch)
  const nZ = Math.sin(pitch)
  const mk = (offX: number, offN: number, hx: number, hy: number, kind: WallDesc['kind']): WallDesc => ({
    cx: cx + offX,
    cy: midY + offN * nY,
    cz: midZ + offN * nZ,
    yaw: 0,
    pitch,
    hx,
    hy,
    hz: len / 2,
    kind,
    level,
  })
  // clearance is measured perpendicular to the incline: vertical gap × cos(pitch)
  // must exceed the ball diameter with margin even at the steepest (51°) ramp
  const wallH = 8
  const parts = [
    mk(0, -0.5, width / 2 + 1.1, 0.5, 'ramp'), // floor (top at ~surface)
    mk(-(width / 2 + 0.5), wallH / 2 - 0.4, 0.5, wallH / 2, 'rampWall'),
    mk(width / 2 + 0.5, wallH / 2 - 0.4, 0.5, wallH / 2, 'rampWall'),
  ]
  // exit spouts skip the lid: a fast ball may fly over the spout, and the
  // deflector wedge beyond is what catches it — a spout roof would ricochet
  // it straight back down the tube
  if (lid) parts.push(mk(0, wallH - 0.3, width / 2 + 1.1, 0.5, 'rampWall'))
  return parts
}

/** Instantiate descs as fixed colliders on one static body. */
export function instantiate(world: RAPIER.World, descs: WallDesc[]): void {
  const body = world.createRigidBody(R.RigidBodyDesc.fixed())
  for (const d of descs) {
    const isFloor = d.kind === 'floor' || d.kind === 'ramp'
    const desc = R.ColliderDesc.cuboid(d.hx, d.hy, d.hz)
      .setTranslation(d.cx, d.cy, d.cz)
      .setRotation(quatFor(d))
      .setFriction(isFloor ? FLOOR_FRICTION : WALL_FRICTION)
      .setRestitution(isFloor ? FLOOR_RESTITUTION : WALL_RESTITUTION)
    world.createCollider(desc, body)
  }
}
