/**
 * Scoring zones: circular regions in the XZ plane, one level each. A ball's
 * (x,z) inside a zone's radius counts as "in it" for that physics step.
 *
 * This is a deliberate simplification over physically modeling drop-target
 * solenoids, pop-bumper caps, etc. as their own Rapier bodies — the rules
 * layer (this file + modes/*) needs to be provably correct first; giving
 * every target real recoil physics is visual/feel polish for later (see
 * ROADMAP Phase 4). The ball still has to physically arrive at the right
 * place at the right height, which is what the physics engine guarantees;
 * this layer just asks "did a live ball cross into this circle."
 */
import { levelOfY } from './levels'

export interface Zone {
  name: string
  level: 1 | 2 | 3
  x: number
  z: number
  radius: number
}

export interface ZoneEvent {
  zone: Zone
  ballId: number
}

/** Edge-triggered enter events, plus continuous occupancy for hold-zones. */
export class ZoneTracker {
  private zones: Zone[]
  private inside = new Map<string, Set<number>>() // zoneName -> ball ids currently inside

  constructor(zones: Zone[]) {
    this.zones = zones
    for (const z of zones) this.inside.set(z.name, new Set())
  }

  /** Call once per physics step with live balls' {id, x, y, z}. Returns this step's enter events. */
  update(balls: { id: number; x: number; y: number; z: number }[]): ZoneEvent[] {
    const events: ZoneEvent[] = []
    for (const zone of this.zones) {
      const occupants = this.inside.get(zone.name)!
      const stillIn = new Set<number>()
      for (const b of balls) {
        if (levelOfY(b.y) !== zone.level) continue
        const dx = b.x - zone.x
        const dz = b.z - zone.z
        if (dx * dx + dz * dz <= zone.radius * zone.radius) {
          stillIn.add(b.id)
          if (!occupants.has(b.id)) events.push({ zone, ballId: b.id })
        }
      }
      this.inside.set(zone.name, stillIn)
    }
    return events
  }

  isOccupied(zoneName: string): boolean {
    return (this.inside.get(zoneName)?.size ?? 0) > 0
  }
}
