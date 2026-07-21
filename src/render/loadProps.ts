/**
 * Placeholder prop meshes, authored as primitives at the correct dimensions
 * per SCALE.md and the §4 prop table. Every one of these becomes a one-line
 * swap for a real GLB once tools/gen-assets.ts has run against a live pod
 * (see PROP_MODEL_PATHS below) — the collider stays authored either way,
 * per §4: "collision = authored, visual = TRELLIS, parented to the
 * authored collider." These placeholders ARE that visual layer until the
 * real one exists.
 */
import * as THREE from 'three'

export type PropName =
  | 'gavel'
  | 'filing-cabinet'
  | 'yard-sign'
  | 'folding-table'
  | 'podium'
  | 'bumper-cap'
  | 'flipper-bat'
  | 'ball-gate'
  | 'spinner-target'

/** Where the real generated GLB will live once Phase 3's batch has run. */
export function propModelPath(name: PropName, base = '/games/pinball/models'): string {
  return `${base}/${name}.glb`
}

const WOOD = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.7 })
const STEEL = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.35, metalness: 0.6 })
const PLASTIC = new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.5 })
const BRASS = new THREE.MeshStandardMaterial({ color: 0xb8964f, roughness: 0.3, metalness: 0.8 })
const CAP_ORANGE = new THREE.MeshStandardMaterial({ color: 0xe8863a, roughness: 0.25, metalness: 0.1 })

function group(...children: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group()
  for (const c of children) g.add(c)
  return g
}

/** A wooden judge's gavel: head + handle, ~14 cm long, standing on its head. */
function buildGavel(): THREE.Group {
  const head = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 6, 16), WOOD)
  head.rotation.z = Math.PI / 2
  head.position.y = 3
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 8, 12), WOOD)
  handle.position.y = 7.5
  const g = group(head, handle)
  g.traverse((o) => (o instanceof THREE.Mesh ? (o.castShadow = true) : null))
  return g
}

/** A grey steel four-drawer filing cabinet, ~40x45x130 cm. */
function buildFilingCabinet(): THREE.Group {
  const body = new THREE.Mesh(new THREE.BoxGeometry(40, 130, 45), STEEL)
  body.position.y = 65
  const drawers: THREE.Mesh[] = []
  for (let i = 0; i < 4; i++) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(36, 26, 2), new THREE.MeshStandardMaterial({ color: 0x7d868d, roughness: 0.4, metalness: 0.5 }))
    d.position.set(0, 16 + i * 29, 23.5)
    drawers.push(d)
  }
  const g = group(body, ...drawers)
  g.traverse((o) => (o instanceof THREE.Mesh ? (o.castShadow = true) : null))
  return g
}

/** A blank corrugated yard sign on a wire stake, ~45x30 cm panel. */
function buildYardSign(): THREE.Group {
  const panel = new THREE.Mesh(new THREE.BoxGeometry(45, 30, 0.6), PLASTIC)
  panel.position.y = 35
  const stakeMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6, metalness: 0.4 })
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 40, 6), stakeMat)
  legL.position.set(-15, 15, 0)
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 40, 6), stakeMat)
  legR.position.set(15, 15, 0)
  const g = group(panel, legL, legR)
  g.traverse((o) => (o instanceof THREE.Mesh ? (o.castShadow = true) : null))
  return g
}

/** A plastic folding table, ~75x180x1.5 cm top on X-braced legs. */
function buildFoldingTable(): THREE.Group {
  const top = new THREE.Mesh(new THREE.BoxGeometry(180, 3, 75), PLASTIC)
  top.position.y = 73
  const legMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.3 })
  const legs: THREE.Mesh[] = []
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 72, 8), legMat)
      leg.position.set(sx * 85, 36, sz * 33)
      legs.push(leg)
    }
  }
  const g = group(top, ...legs)
  g.traverse((o) => (o instanceof THREE.Mesh ? (o.castShadow = true) : null))
  return g
}

/** A wooden lectern podium, ~55x110x45 cm, angled reading surface. */
function buildPodium(): THREE.Group {
  const body = new THREE.Mesh(new THREE.BoxGeometry(55, 100, 45), WOOD)
  body.position.y = 50
  const top = new THREE.Mesh(new THREE.BoxGeometry(58, 4, 48), WOOD)
  top.position.y = 101
  top.rotation.x = -0.25
  const g = group(body, top)
  g.traverse((o) => (o instanceof THREE.Mesh ? (o.castShadow = true) : null))
  return g
}

/** A glossy mushroom-shaped pop-bumper cap, ~5 cm dia. */
function buildBumperCap(): THREE.Group {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), CAP_ORANGE)
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.6, 20), STEEL)
  ring.position.y = -0.1
  const g = group(dome, ring)
  g.traverse((o) => (o instanceof THREE.Mesh ? (o.castShadow = true) : null))
  return g
}

/** A small brass wire ball-gate mechanism, mostly for lock lanes. */
function buildBallGate(): THREE.Group {
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 8), BRASS)
  bar.rotation.z = Math.PI / 2
  const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), BRASS)
  pivot.position.x = -3
  const g = group(bar, pivot)
  g.traverse((o) => (o instanceof THREE.Mesh ? (o.castShadow = true) : null))
  return g
}

/** A flat rectangular metal spinner target on a pivot. */
function buildSpinnerTarget(): THREE.Group {
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 3), STEEL)
  plate.position.y = 3
  const g = group(plate)
  g.traverse((o) => (o instanceof THREE.Mesh ? (o.castShadow = true) : null))
  return g
}

const BUILDERS: Record<PropName, () => THREE.Group> = {
  gavel: buildGavel,
  'filing-cabinet': buildFilingCabinet,
  'yard-sign': buildYardSign,
  'folding-table': buildFoldingTable,
  podium: buildPodium,
  'bumper-cap': buildBumperCap,
  'flipper-bat': () => group(), // flipper meshes are already built in scene.ts (buildFlipperMesh)
  'ball-gate': buildBallGate,
  'spinner-target': buildSpinnerTarget,
}

/**
 * Build a prop's PLACEHOLDER mesh. Once tools/gen-assets.ts has produced a
 * real GLB (see propModelPath), swap the call site to a GLTFLoader load of
 * that path instead — the collider and placement code around it doesn't
 * change, only where the visual mesh comes from.
 */
export function buildPropPlaceholder(name: PropName): THREE.Group {
  return BUILDERS[name]()
}
