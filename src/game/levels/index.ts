import type RAPIER from '@dimforge/rapier3d-compat'
import { type WallDesc, instantiate, segment, slab } from '../physics/colliders'
import { buildPlaza, PLAZA } from './plaza'
import { buildReitz, REITZ } from './reitz'
import { buildBench, BENCH } from './bench'

export { PLAZA, REITZ, BENCH }

/**
 * Invisible containment shell: the cabinet box. Nothing that happens inside
 * — ramp exits, shaft overshoots, airballs — may ever leave the machine.
 */
function buildShell(): WallDesc[] {
  const H = 110
  const shell: WallDesc[] = [
    segment(-28.2, -53, -28.2, 46.2, 0.6, { h: H }),
    segment(28.2, -53, 28.2, 46.2, 0.6, { h: H }),
    segment(-28.2, 46.2, 28.2, 46.2, 0.6, { h: H }),
    segment(-28.2, -53, 28.2, -53, 0.6, { h: H }),
    slab(-29, 29, -54, 47, H + 1, 1, 'glass', 1),
  ]
  for (const s of shell) s.kind = 'glass' // never rendered
  return shell
}

/** One continuous physics world, three Y-strata. Not three scenes. */
export function buildAllLevels(world: RAPIER.World): WallDesc[] {
  const descs = [...buildPlaza(), ...buildReitz(), ...buildBench(), ...buildShell()]
  instantiate(world, descs)
  return descs
}

/** Which stratum is a Y coordinate on? (fall transitions pass through) */
export function levelOfY(y: number): 1 | 2 | 3 {
  if (y < 25) return 1
  if (y < 65) return 2
  return 3
}
