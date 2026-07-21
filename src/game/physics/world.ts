import RAPIER from '@dimforge/rapier3d-compat'
import { DT, GRAVITY, SLOPE_DEG } from '../scale'

let ready: Promise<unknown> | null = null

/** Idempotent WASM init. Must resolve before any other physics call. */
export function initRapier(): Promise<unknown> {
  return (ready ??= RAPIER.init())
}

/**
 * Gravity along the table normal: geometry stays flat, the 6.5° inclination
 * lives entirely in the gravity vector. +z is down-field (toward the flippers).
 */
export function tableGravity(): { x: number; y: number; z: number } {
  const rad = (SLOPE_DEG * Math.PI) / 180
  return { x: 0, y: -GRAVITY * Math.cos(rad), z: GRAVITY * Math.sin(rad) }
}

export function createWorld(): RAPIER.World {
  const world = new RAPIER.World(tableGravity())
  world.timestep = DT
  return world
}

export { RAPIER }
