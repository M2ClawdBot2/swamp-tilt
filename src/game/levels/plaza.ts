/**
 * L1 — TURLINGTON PLAZA (y=0). Full width, two flippers, orbit, and the
 * right-center ramp up to The Reitz. Geometry proven by the Gate 1 suite;
 * Gate 2 adds the ramp mouth, the lid at y=12 (with authored holes for the
 * fall shaft and the ramp tube), and full-height perimeter walls.
 */
import { type WallDesc, segment, arc, slab, rampChannel } from '../physics/colliders'

export const PLAZA = {
  sideWallX: 26.5,
  sideWallHalfT: 1.0,
  arcCenterZ: -24,
  outerArcR: 26.5,
  innerArcR: 19.5,
  innerRailHalfT: 0.5,
  innerRailBottomZ: 4,
  drainZ: 44,
  funnel: { xOuter: 25.5, zOuter: 16, xInner: 13.2, zInner: 33.2 },
  flipperPivotX: 11,
  flipperPivotZ: 36,
  lidY: 12,
  // ramp to L2: a single straight enclosed incline, entry mouth on the field
  // at z≈6, x∈[9.5,14.5]. A multi-joint smooth profile was tried first and
  // repeatedly bled speed at each segment joint (Gate 2 finding); a single
  // clean incline has exactly one joint (the entry) and reliably completes
  // the climb, exiting open-ended into the Reitz airspace. "Going up is
  // hard" — this rewards a genuinely full-power shot, not a glancing one.
  ramp: { cx: 12, z0: 6, y0: 0, z1: -38, y1: 44.5, width: 5 },
} as const

export function buildPlaza(): WallDesc[] {
  const T = PLAZA
  const walls: WallDesc[] = []
  const tall = { h: T.lidY, level: 1 as const }

  // Perimeter: full height up to the lid so nothing escapes sideways
  walls.push(segment(-T.sideWallX, T.arcCenterZ, -T.sideWallX, T.drainZ, T.sideWallHalfT, tall))
  walls.push(segment(T.sideWallX, T.arcCenterZ, T.sideWallX, T.drainZ, T.sideWallHalfT, tall))
  walls.push(...arc(0, T.arcCenterZ, T.outerArcR, Math.PI, 2 * Math.PI, 22, T.sideWallHalfT, tall))
  walls.push(segment(-T.sideWallX, T.drainZ, T.sideWallX, T.drainZ, T.sideWallHalfT, tall))

  // Inner orbit rail (playfield height)
  walls.push(...arc(0, T.arcCenterZ, T.innerArcR, Math.PI, 2 * Math.PI, 18, T.innerRailHalfT))
  walls.push(segment(-T.innerArcR, T.arcCenterZ, -T.innerArcR, T.innerRailBottomZ, T.innerRailHalfT))
  walls.push(segment(T.innerArcR, T.arcCenterZ, T.innerArcR, T.innerRailBottomZ, T.innerRailHalfT))

  // Funnels + posts (posts close the dead pocket — Gate 1 finding)
  walls.push(segment(-T.funnel.xOuter, T.funnel.zOuter, -T.funnel.xInner, T.funnel.zInner, 0.6))
  walls.push(segment(T.funnel.xOuter, T.funnel.zOuter, T.funnel.xInner, T.funnel.zInner, 0.6))
  walls.push(segment(-T.funnel.xInner, T.funnel.zInner, -T.flipperPivotX - 0.6, T.flipperPivotZ - 0.6, 0.6))
  walls.push(segment(T.funnel.xInner, T.funnel.zInner, T.flipperPivotX + 0.6, T.flipperPivotZ - 0.6, 0.6))

  // Floor
  walls.push(slab(-29, 29, -54, 46, 0, 2, 'floor', 1))

  // Ramp to The Reitz: single incline, open (no lid) so it can't trap a
  // slow ball against a ceiling — it just rolls back down instead.
  walls.push(...rampChannel(T.ramp.cx, T.ramp.z0, T.ramp.y0, T.ramp.z1, T.ramp.y1, T.ramp.width, 1, false))

  // Lid at y=12, composed around two authored holes:
  //   H1: fall-shaft landing from L2  (x −17..17, z 6..16)
  //   H2: ramp tube pierce            (x 9..15,  z −42..2)
  const L = T.lidY + 1
  walls.push(slab(-28.5, 28.5, -52.5, -42, L, 1, 'glass', 1)) // above arch
  walls.push(slab(-28.5, 9, -42, 2, L, 1, 'glass', 1)) // left of H2
  walls.push(slab(15, 28.5, -42, 2, L, 1, 'glass', 1)) // right of H2
  walls.push(slab(-28.5, 28.5, 2, 6, L, 1, 'glass', 1)) // strip below H2
  walls.push(slab(-28.5, -17, 6, 16, L, 1, 'glass', 1)) // left of H1
  walls.push(slab(17, 28.5, 6, 16, L, 1, 'glass', 1)) // right of H1
  walls.push(slab(-28.5, 28.5, 16, 45, L, 1, 'glass', 1)) // lower field

  return walls
}
