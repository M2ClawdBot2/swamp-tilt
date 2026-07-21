/**
 * L3 — THE BENCH (y=+80). The court: tightest field, ONE flipper, flat 10×
 * (scoring lands in Phase 2). A miss rolls off the open floor edge and falls
 * onto The Reitz mid-field — falling down is cheap.
 */
import { type WallDesc, segment, slab } from '../physics/colliders'

export const BENCH = {
  y: 80,
  xHalf: 13,
  wallHalfT: 0.75,
  topZ: -40,
  floorEndZ: -13, // open edge: past the flipper line the ball falls to L2
  flipperPivotX: -4.2,
  flipperPivotZ: -18,
  wallH: 6,
  // Same reasoning as Reitz's perimeterH: catches a ball still airborne
  // after the L2→L3 climb instead of letting it sail past a low curb.
  perimeterH: 22,
  // floor opening for the L2 ramp tube (single incline, pitch-derived hole)
  entryHole: { x0: -13.5, x1: -7.4, z0: -40, z1: -22.1 },
  // post to the right of the single flipper's tip — the only other guard
  post: { x: 2.9, z: -16.1 },
  // enclosed drop shaft off the open floor edge down to The Reitz
  shaft: { z0: -13, z1: -9, yBottom: 44.5, yTop: 88 },
} as const

export function buildBench(): WallDesc[] {
  const T = BENCH
  const walls: WallDesc[] = []
  const o = { y0: T.y, h: T.wallH, level: 3 as const }
  const tall = { y0: T.y, h: T.perimeterH, level: 3 as const }

  // Left boundary jogs around the ramp-tube ridge (the tube's enclosure
  // pokes above this floor for z in about [-40,-22]). The jog must stay
  // clear of the tube's own walls (cx=-11, width 5 → wall faces at x=-14
  // and x=-8) for their ENTIRE z-span, not just visually near them — an
  // earlier version placed a wall at (x=-7..-13, z=-36), squarely inside
  // the tube's footprint, and a ball climbing the ramp at speed got
  // simultaneous contact from both colliders and kicked sideways almost
  // every step, bleeding nearly all its speed before reaching the top
  // (Gate 2 finding, isolated via a fine-grained per-step trace — the
  // same class of bug as the Reitz laneWallX duplicate). This jog only
  // starts at z=-21, past where the tube's hole in the floor ends.
  walls.push(segment(-T.xHalf, T.topZ, -T.xHalf, -21, T.wallHalfT, tall))
  walls.push(segment(-T.xHalf, -21, -6.5, -21, T.wallHalfT, tall))
  walls.push(segment(-6.5, -21, -6.5, -16.2, T.wallHalfT, o))
  walls.push(segment(-6.5, -16.2, -T.xHalf, -16.2, T.wallHalfT, o))
  walls.push(segment(-T.xHalf, -16.2, -T.xHalf, T.floorEndZ + 2, T.wallHalfT, o))
  walls.push(segment(T.xHalf, T.topZ, T.xHalf, T.floorEndZ + 2, T.wallHalfT, o))
  walls.push(segment(-T.xHalf, T.topZ, T.xHalf, T.topZ, T.wallHalfT, tall))
  walls.push(segment(T.xHalf - 5, T.topZ, T.xHalf, T.topZ + 5, T.wallHalfT, o))

  // Funnels: left wall → flipper base; right wall → the post
  walls.push(segment(-6.5, -16.4, T.flipperPivotX - 0.8, T.flipperPivotZ - 0.8, 0.5, o))
  walls.push(
    segment(T.flipperPivotX - 1.6, T.flipperPivotZ - 2.2, T.flipperPivotX - 0.6, T.flipperPivotZ - 0.6, 0.5, o),
  )
  walls.push(segment(T.xHalf - 0.75, -26, T.post.x + 1.2, T.post.z - 1.6, 0.5, o))
  walls.push(segment(T.post.x + 1.2, T.post.z - 1.6, T.post.x, T.post.z, 0.5, o))

  // Floor around the entry hole
  const H = T.entryHole
  walls.push(slab(-T.xHalf, T.xHalf, T.topZ, H.z0, T.y, 1, 'floor', 3))
  walls.push(slab(H.x1, T.xHalf, H.z0, H.z1, T.y, 1, 'floor', 3))
  walls.push(slab(-T.xHalf, T.xHalf, H.z1, T.floorEndZ, T.y, 1, 'floor', 3))

  // Drop shaft down to The Reitz. Spans only the jogged field width — the
  // L2→L3 ramp tube passes through x≈-11 at exactly these heights, and a
  // full-width shaft wall would hang across the tube's interior (Gate 2
  // finding: the climbing ball hit it at y=55.7 and died).
  const S = T.shaft
  const shaftX0 = -6.5
  const shaftH = S.yTop - S.yBottom
  walls.push(segment(shaftX0, S.z1, T.xHalf, S.z1, 0.6, { y0: S.yBottom, h: shaftH, level: 3 }))
  walls.push(segment(shaftX0, S.z0, T.xHalf, S.z0, 0.6, { y0: S.yBottom, h: T.y - 0.5 - S.yBottom, level: 3 }))
  walls.push(segment(shaftX0, S.z0, shaftX0, S.z1, 0.6, { y0: S.yBottom, h: shaftH, level: 3 }))
  walls.push(segment(T.xHalf, S.z0, T.xHalf, S.z1, 0.6, { y0: S.yBottom, h: shaftH, level: 3 }))

  return walls
}
