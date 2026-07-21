/**
 * Gate 3 proof, headless: the post-process pipeline (decimate, Draco,
 * center+scale, budget enforcement) works end to end on a real GLB. Can't
 * exercise the FLUX/TRELLIS generation itself without a live pod (see
 * ROADMAP), so this proves the half of the pipeline that doesn't need one:
 * a synthetic high-poly mesh in, a budget-compliant centered GLB out, and a
 * genuine throw when a mesh can't be decimated to budget.
 */
import { NodeIO, Document } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
// @ts-expect-error — no types shipped for the draco3d wasm bindings package
import draco3d from 'draco3dgltf'
import { postprocessGlb } from '../tools/postprocess-glb'

let failures = 0
function report(name: string, ok: boolean, detail: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} — ${detail}`)
  if (!ok) failures++
}

/** A high-poly icosphere-ish mesh, offset off-center, so decimation and centering both have real work to do. */
function buildHighPolyGlb(subdivisions: number): Document {
  const doc = new Document()
  const buffer = doc.createBuffer()
  const positions: number[] = []
  const indices: number[] = []

  const rings = subdivisions
  const segs = subdivisions * 2
  const OFFSET = [50, 30, -20] // off-origin, so centering has something to fix
  const R = 5
  for (let r = 0; r <= rings; r++) {
    const phi = (Math.PI * r) / rings
    for (let s = 0; s <= segs; s++) {
      const theta = (2 * Math.PI * s) / segs
      positions.push(
        OFFSET[0] + R * Math.sin(phi) * Math.cos(theta),
        OFFSET[1] + R * Math.cos(phi),
        OFFSET[2] + R * Math.sin(phi) * Math.sin(theta),
      )
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segs; s++) {
      const a = r * (segs + 1) + s
      const b = a + segs + 1
      indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
  }

  const posAccessor = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array(positions))
    .setBuffer(buffer)
  const idxAccessor = doc
    .createAccessor()
    .setType('SCALAR')
    .setArray(new Uint32Array(indices))
    .setBuffer(buffer)

  const prim = doc.createPrimitive().setAttribute('POSITION', posAccessor).setIndices(idxAccessor)
  const mesh = doc.createMesh('sphere').addPrimitive(prim)
  const node = doc.createNode('sphere').setMesh(mesh)
  const scene = doc.createScene('default').addChild(node)
  doc.getRoot().setDefaultScene(scene)
  return doc
}

async function main(): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), 'gate3-'))
  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    })
  try {
    // ---- 1. a mesh well over budget gets decimated to fit, and centered ----
    const highPoly = buildHighPolyGlb(60) // ~14,400 tris
    const rawPath = path.join(dir, 'high.glb')
    await io.write(rawPath, highPoly)

    const outPath = path.join(dir, 'out.glb')
    const result = await postprocessGlb(rawPath, outPath, 3000, 20)
    report(
      'decimates an over-budget mesh to fit',
      result.withinBudget && result.triCount <= 3000 * 1.05,
      `${result.triCount} tris, budget 3000`,
    )

    const written = await io.read(outPath)
    const node = written.getRoot().listScenes()[0]?.listChildren()[0]
    const scale = node?.getScale() ?? [0, 0, 0]
    const translation = node?.getTranslation() ?? [1, 1, 1]
    report(
      'centers the mesh at the origin (translation compensates the offset)',
      Math.abs(translation[0]) > 1 || Math.abs(translation[1]) > 1 || Math.abs(translation[2]) > 1,
      `node translation=[${translation.map((n) => n.toFixed(1)).join(', ')}]`,
    )
    report('scales to the requested size', scale[0] > 0 && scale[0] < 10, `scale=${scale[0].toFixed(3)}`)

    // ---- 2. a mesh already under budget passes through untouched (no decimation needed) ----
    const lowPoly = buildHighPolyGlb(6) // ~144 tris, well under any real budget
    const rawPath2 = path.join(dir, 'low.glb')
    await io.write(rawPath2, lowPoly)
    const outPath2 = path.join(dir, 'out2.glb')
    const result2 = await postprocessGlb(rawPath2, outPath2, 3000, 20)
    report('under-budget mesh passes with room to spare', result2.withinBudget, `${result2.triCount} tris, budget 3000`)

    // ---- 3. an impossible budget fails loudly rather than shipping silently ----
    let threw = false
    let message = ''
    try {
      await postprocessGlb(rawPath, path.join(dir, 'impossible.glb'), 2, 20)
    } catch (e) {
      threw = true
      message = String(e)
    }
    report('impossible budget fails loudly, does not ship', threw, message.slice(0, 90))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }

  console.log(failures === 0 ? '\nGate 3 asset pipeline: ALL PASS' : `\nGate 3 asset pipeline: ${failures} FAILURE(S)`)
  process.exit(failures === 0 ? 0 : 1)
}

await main()
