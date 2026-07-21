/**
 * Post-process a raw TRELLIS GLB: decimate to the prop's poly budget, Draco
 * compress, center + scale to SCALE.md's 1-unit-=-1cm convention, and FAIL
 * LOUDLY if it can't hit budget — never silently ship a 200k-tri gavel.
 * Build-time only.
 */
import { NodeIO } from '@gltf-transform/core'
import { KHRDracoMeshCompression, KHRTextureBasisu } from '@gltf-transform/extensions'
import { simplify, weld, dedup, prune, draco } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
// @ts-expect-error — no types shipped for the draco3d wasm bindings package
import draco3d from 'draco3dgltf'

export interface PostprocessResult {
  triCount: number
  withinBudget: boolean
}

function countTriangles(doc: import('@gltf-transform/core').Document): number {
  let tris = 0
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices()
      const positions = prim.getAttribute('POSITION')
      const count = indices ? indices.getCount() : (positions?.getCount() ?? 0)
      tris += count / 3
    }
  }
  return Math.round(tris)
}

/** Center the scene at the origin and scale its longest axis to `targetSizeCm`. */
function centerAndScale(doc: import('@gltf-transform/core').Document, targetSizeCm: number): void {
  const root = doc.getRoot()
  const scene = root.getDefaultScene() ?? root.listScenes()[0]
  if (!scene) return

  let min = [Infinity, Infinity, Infinity]
  let max = [-Infinity, -Infinity, -Infinity]
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')
      if (!pos) continue
      for (let i = 0; i < pos.getCount(); i++) {
        const v = pos.getElement(i, [0, 0, 0])
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k], v[k])
          max[k] = Math.max(max[k], v[k])
        }
      }
    }
  }
  const size = max.map((m, i) => m - min[i])
  const longest = Math.max(...size, 1e-6)
  const scale = targetSizeCm / longest
  const center = min.map((m, i) => m + size[i] / 2)

  for (const node of scene.listChildren()) {
    node.setScale([scale, scale, scale])
    node.setTranslation([-center[0] * scale, -center[1] * scale, -center[2] * scale])
  }
}

export async function postprocessGlb(
  inputPath: string,
  outputPath: string,
  budgetTris: number,
  targetSizeCm = 20,
): Promise<PostprocessResult> {
  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression, KHRTextureBasisu])
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    })

  const doc = await io.read(inputPath)

  await doc.transform(dedup(), weld())

  // Iterate: meshoptimizer's error tolerance can stop it short of the
  // requested ratio on a single pass (it won't over-simplify past its error
  // bound), so one shot at "budget/current" isn't reliable — keep tightening
  // the ratio against the ACTUAL result until budget is hit or progress stalls.
  let tris = countTriangles(doc)
  for (let attempt = 0; attempt < 6 && tris > budgetTris; attempt++) {
    const before = tris
    const ratio = Math.max(0.01, (budgetTris / tris) * 0.9) // slight overshoot margin
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 1 }))
    tris = countTriangles(doc)
    if (tris >= before) break // no further progress possible
  }

  await doc.transform(prune())
  centerAndScale(doc, targetSizeCm)
  await doc.transform(draco())

  await io.write(outputPath, doc)

  const withinBudget = tris > 0 && tris <= budgetTris * 1.05 // 5% slack for rounding
  if (!withinBudget) {
    // FAIL LOUDLY — per build prompt §4, never silently ship an overrun (or
    // simplified-into-oblivion, tris===0) asset
    const problem = tris === 0 ? 'simplified to a degenerate empty mesh (0 tris)' : `has ${tris} tris after simplification`
    throw new Error(
      `[postprocess-glb] BUDGET FAILURE: ${inputPath} ${problem}, budget is ${budgetTris}. ` +
        `Not written cleanly to ${outputPath} — investigate the source mesh before shipping this prop.`,
    )
  }
  return { triCount: tris, withinBudget }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [input, output, budget] = process.argv.slice(2)
  if (!input || !output || !budget) {
    console.error('usage: tsx tools/postprocess-glb.ts <input.glb> <output.glb> <budgetTris>')
    process.exit(1)
  }
  const result = await postprocessGlb(input, output, Number(budget))
  console.log(`[postprocess-glb] ${input} -> ${output}: ${result.triCount} tris`)
}
