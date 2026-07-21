/**
 * L2 — THE REITZ (y=+40). Narrow institution. No outlanes and no back wall:
 * anything past the flippers falls off the floor edge, drops the 40 cm shaft,
 * and lands on the Plaza mid-field. Left lane is the (steep) ramp to The
 * Bench. Ball arrives from L1 through a hole in this floor at the top-right.
 */
import { type WallDesc, segment, slab, rampChannel } from '../physics/colliders'

export const REITZ = {
  y: 40, // floor top surface
  xHalf: 16,
  wallHalfT: 0.75,
  topZ: -44,
  floorEndZ: 8, // past this: the fall shaft to L1
  flipperPivotX: 6.5,
  flipperPivotZ: 4,
  wallH: 6,
  // Perimeter is much taller than the nominal field-wall height: a ball
  // arriving from the L1 ramp is briefly airborne well above this floor,
  // and a low curb lets it sail clean over into the void beyond (Gate 2
  // finding — the ball fell for -4000+ units before this fix). The outer
  // machine shell (levels/index.ts) is the last-resort catch; this wall is
  // what actually keeps the shot on this level.
  perimeterH: 22,
  // floor opening for the L1 ramp tube: computed from the incline's own
  // pitch so the tube's enclosure never pokes through the floor plane
  // outside this window (see ROADMAP notes for the derivation).
  entryHole: { x0: 8.4, x1: 15.6, z0: -38.6, z1: -22.5 },
  // floor opening for the OUTGOING L2→L3 ramp's own footprint. Missing
  // entirely in an earlier version: this floor is flat and continuous at
  // y=40 with no hole cut for the ramp, so the ramp's rising incline sat
  // directly on top of a permanent flat surface at the same starting
  // height. The ball just kept riding the flat floor underneath the
  // incline instead of climbing it — it barely gained height over 20+ cm
  // of horizontal travel before finally catching the ramp's structure
  // edge-on and bouncing chaotically (Gate 2 finding, isolated by decoding
  // Rapier's raw contact-pair handles and reading off exactly which two
  // colliders — floor and ramp — the ball was straddling simultaneously).
  exitHole: { x0: -14, x1: -8, z0: -37, z1: 3 },
  // lane wall separating the L3-ramp lane from the field
  laneWallX: -8,
  // ramp to L3: steep — full flips only. "Going up is hard." Single incline,
  // same reasoning as the L1 ramp (see plaza.ts).
  ramp: { cx: -11, z0: 2, y0: 40, z1: -36, y1: 84.5, width: 5 },
  // enclosed fall shaft: past the floor edge the ball is walled in and drops
  // straight through the Plaza's lid hole (no ballistic overshoot)
  shaft: { z0: 8, z1: 12, yBottom: 13, yTop: 46 },
} as const

export function buildReitz(): WallDesc[] {
  const T = REITZ
  const walls: WallDesc[] = []
  const o = { y0: T.y, h: T.wallH, level: 2 as const }
  const tall = { y0: T.y, h: T.perimeterH, level: 2 as const }

  // Perimeter (open at the bottom — the fall shaft IS the drain)
  walls.push(segment(-T.xHalf, T.topZ, -T.xHalf, T.floorEndZ + 2, T.wallHalfT, tall))
  walls.push(segment(T.xHalf, T.topZ, T.xHalf, T.floorEndZ + 2, T.wallHalfT, tall))
  walls.push(segment(-T.xHalf, T.topZ, T.xHalf, T.topZ, T.wallHalfT, tall))
  // 45° corner wedge so the top-left corner isn't a dead pocket
  walls.push(segment(-T.xHalf, T.topZ + 6, -T.xHalf + 6, T.topZ, T.wallHalfT, o))

  // Lane wall for the L3 ramp, covering only the span BEYOND the ramp's own
  // footprint (topZ to the ramp's far end). The ramp's own right-side wall
  // sits at this exact x already (cx + width/2 + 0.5 = -8 = laneWallX) — an
  // earlier version ran this wall the full length, creating an exact
  // duplicate collider alongside the ramp's own wall for its entire climb.
  // A fast ball grazing that boundary got contact resolution from both
  // colliders simultaneously and kicked sideways at ~15 cm/s per step,
  // bleeding almost all its speed before the ramp's midpoint (Gate 2
  // finding, isolated via a fine-grained per-step trace).
  walls.push(segment(T.laneWallX, T.topZ, T.laneWallX, T.ramp.z1 - 1, T.wallHalfT, o))

  // Funnel to the left flipper. Stays entirely at x > laneWallX so it never
  // dips into the ramp tube's right wall (centered at laneWallX) — an
  // earlier version routed to -flipperPivotX-2.2 = -8.7, inside the tube's
  // own -8.5..-7.5 footprint, and silently ate the shot's speed (Gate 2
  // finding, traced via the headless proof).
  walls.push(
    segment(T.laneWallX, T.ramp.z0 + 4, -T.flipperPivotX - 0.6, T.flipperPivotZ - 0.6, 0.5, o),
  )
  walls.push(segment(T.xHalf - 0.75, -6, T.flipperPivotX + 2.2, T.flipperPivotZ - 2.6, 0.5, o))
  walls.push(
    segment(T.flipperPivotX + 2.2, T.flipperPivotZ - 2.6, T.flipperPivotX + 0.6, T.flipperPivotZ - 0.6, 0.5, o),
  )

  // Floor, composed around both the L1-ramp entry hole and the L2→L3 ramp's
  // own exit hole. Sliced into z-bands at every hole boundary so each band
  // excludes exactly the holes active within it.
  const H1 = T.entryHole
  const H2 = T.exitHole
  const flr = (x0: number, x1: number, z0: number, z1: number) => slab(x0, x1, z0, z1, T.y, 1, 'floor', 2)
  walls.push(flr(-T.xHalf, T.xHalf, T.topZ, H1.z0)) // above both holes
  walls.push(flr(-T.xHalf, H1.x0, H1.z0, H2.z0)) // H1 active only
  walls.push(flr(H1.x1, T.xHalf, H1.z0, H2.z0))
  walls.push(flr(-T.xHalf, H2.x0, H2.z0, H1.z1)) // both active
  walls.push(flr(H2.x1, H1.x0, H2.z0, H1.z1))
  walls.push(flr(H1.x1, T.xHalf, H2.z0, H1.z1))
  walls.push(flr(-T.xHalf, H2.x0, H1.z1, H2.z1)) // H2 active only
  walls.push(flr(H2.x1, T.xHalf, H1.z1, H2.z1))
  walls.push(flr(-T.xHalf, T.xHalf, H2.z1, T.floorEndZ)) // below both holes

  // Ramp to The Bench: single incline, open (no lid)
  walls.push(...rampChannel(T.ramp.cx, T.ramp.z0, T.ramp.y0, T.ramp.z1, T.ramp.y1, T.ramp.width, 2, false))

  // Fall shaft enclosure: back wall stops horizontal carry-off, front wall
  // (below the floor) stops swing-back, sides keep it a chute
  const S = T.shaft
  const shaftH = S.yTop - S.yBottom
  walls.push(segment(-T.xHalf, S.z1, T.xHalf, S.z1, 0.6, { y0: S.yBottom, h: shaftH, level: 2 }))
  walls.push(segment(-T.xHalf, S.z0, T.xHalf, S.z0, 0.6, { y0: S.yBottom, h: T.y - 0.5 - S.yBottom, level: 2 }))
  walls.push(segment(-T.xHalf, S.z0, -T.xHalf, S.z1, 0.6, { y0: S.yBottom, h: shaftH, level: 2 }))
  walls.push(segment(T.xHalf, S.z0, T.xHalf, S.z1, 0.6, { y0: S.yBottom, h: shaftH, level: 2 }))

  return walls
}
