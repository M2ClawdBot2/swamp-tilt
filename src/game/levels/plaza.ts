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
  // Shooter lane: a real plunger channel OUTSIDE the right play wall (the
  // right funnel/inlane already occupies the inside, so the lane can't share
  // it — it lives in its own strip). Ball rests at the bottom against the
  // drain-wall extension; the plunger shoves it up (-z); a top deflector
  // turns it left through a gap in the play wall, into the upper-right
  // playfield. This is the "feel real" fix — no more auto-launch from mid-field.
  shooter: {
    xInnerWall: 26.5, // shared with the right play wall (which gets a gap up top)
    xOuterWall: 32,
    bottomZ: 44,
    topZ: 14, // where the outer wall meets the deflector
    // Exit gap sits in the OPEN upper field (z 6..16): below the inner orbit
    // rail's tail (which ends at z=4) and above the right funnel (which starts
    // at z=16), so the deflected ball lands in clear playfield instead of the
    // narrow orbit lane, where it just rattled across and bounced back into
    // the shooter lane (Gate 7 finding).
    exitZ0: 6,
    exitZ1: 16,
    serveX: 29.5, // lane centerline
    serveZ: 42,
  },
} as const

export function buildPlaza(): WallDesc[] {
  const T = PLAZA
  const walls: WallDesc[] = []
  const tall = { h: T.lidY, level: 1 as const }

  // Perimeter: full height up to the lid so nothing escapes sideways
  walls.push(segment(-T.sideWallX, T.arcCenterZ, -T.sideWallX, T.drainZ, T.sideWallHalfT, tall))
  // Right play wall is SPLIT by the shooter-lane exit gap (S.exitZ0..exitZ1):
  // below the gap it's solid down to the drain; above the gap a short stub
  // up to the arch springline.
  const S = T.shooter
  walls.push(segment(T.sideWallX, T.arcCenterZ, T.sideWallX, S.exitZ0, T.sideWallHalfT, tall))
  walls.push(segment(T.sideWallX, S.exitZ1, T.sideWallX, T.drainZ, T.sideWallHalfT, tall))
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

  // Floor (extended right to carry the shooter lane)
  walls.push(slab(-29, 33, -54, 46, 0, 2, 'floor', 1))

  // ---- Shooter lane ----
  const laneTall = { h: T.lidY, level: 1 as const }
  // Outer wall of the lane, from the bottom stop up to where it meets the
  // deflector at the top.
  walls.push(segment(S.xOuterWall, S.bottomZ, S.xOuterWall, S.topZ, T.sideWallHalfT, laneTall))
  // Bottom stop (extends the drain wall across the lane so the served ball rests)
  walls.push(segment(T.sideWallX, S.bottomZ, S.xOuterWall, S.bottomZ, T.sideWallHalfT, laneTall))
  // Top deflector: a "/" (in x-right / z-down space) whose face turns the
  // up-moving ball toward −x, out through the exit gap into the playfield.
  // Its normal must point (−x, +z) to reflect −z motion into −x motion —
  // the first attempt sloped the other way and kicked the ball into the
  // outer wall (Gate 7 finding, traced per-step). Runs from the outer wall
  // top down-left to the top lip of the exit gap.
  walls.push(segment(S.xOuterWall, S.topZ, T.sideWallX - 1, S.exitZ0, T.sideWallHalfT, laneTall))

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
