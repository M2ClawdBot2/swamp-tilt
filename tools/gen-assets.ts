/**
 * FLUX (reference image) -> TRELLIS (image to 3D) batch, per build prompt
 * §4. Build-time only, run by hand on Sam's machine against a live pod —
 * never runs automatically, never bundled. Every asset gets a row appended
 * to ASSETS.md with prompt, seed, poly count, date, thumbnail path.
 *
 * Requires FLUX_ENDPOINT + TRELLIS_ENDPOINT (both blank until a pod is
 * provisioned — see tools/pod.ts). This script is complete and ready to
 * run the moment those are set; it does not start the pod itself (call
 * `withPod()` from tools/pod.ts around it, or start manually first).
 */
import 'dotenv/config'
import { writeFile, mkdir, appendFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { postprocessGlb } from './postprocess-glb'

const NEGATIVE_SUFFIX = ', plain white background, single object, centered, no text, no logos'

export interface PropSpec {
  name: string
  level: string
  budgetTris: number
  prompt: string
  count?: number // e.g. bumper caps ×3 — one generation, reused 3x in-scene
  authored?: boolean // true = never send to TRELLIS at all (ramp rails)
}

export const PROPS: PropSpec[] = [
  { name: 'gavel', level: '3', budgetTris: 3000, prompt: 'a wooden judge\'s gavel on a plain white background, product photograph, centered, soft studio light, no shadow' },
  { name: 'filing-cabinet', level: '2', budgetTris: 4000, prompt: 'a single grey steel four-drawer filing cabinet, plain white background, product photo, isometric' },
  { name: 'yard-sign', level: '1', budgetTris: 1000, prompt: 'a blank corrugated plastic yard sign on a wire stake, white background, product photo' },
  { name: 'folding-table', level: '1', budgetTris: 3000, prompt: 'a plastic folding table, white background, product photograph, three-quarter view' },
  { name: 'podium', level: '2', budgetTris: 4000, prompt: 'a wooden lectern podium, white background, product photograph' },
  { name: 'bumper-cap', level: '1', budgetTris: 1500, count: 3, prompt: 'a glossy mushroom-shaped pinball bumper cap, white background, product render' },
  { name: 'flipper-bat', level: 'all', budgetTris: 800, count: 6, prompt: 'a red pinball flipper bat, white background, product render' },
  { name: 'ball-gate', level: '2', budgetTris: 1000, prompt: 'a small brass wire gate mechanism, white background, macro product photo' },
  { name: 'spinner-target', level: '1,3', budgetTris: 500, prompt: 'a flat rectangular metal spinner target on a pivot, white background' },
  { name: 'ramp-rails', level: 'all', budgetTris: 0, prompt: '', authored: true },
]

function flatPrompt(p: PropSpec): string {
  return p.prompt + NEGATIVE_SUFFIX
}

async function generateFlux(prompt: string, seed: number): Promise<Buffer> {
  const endpoint = process.env.FLUX_ENDPOINT
  if (!endpoint) throw new Error('FLUX_ENDPOINT not set — provision the pod first (tools/pod.ts)')
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      seed,
      steps: Number(process.env.FLUX_STEPS ?? 28),
      guidance: Number(process.env.FLUX_GUIDANCE ?? 3.5),
    }),
  })
  if (!res.ok) throw new Error(`FLUX ${res.status}: ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

async function generateTrellis(imagePng: Buffer): Promise<Buffer> {
  const endpoint = process.env.TRELLIS_ENDPOINT
  if (!endpoint) throw new Error('TRELLIS_ENDPOINT not set — provision the pod first (tools/pod.ts)')
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: new Uint8Array(imagePng),
  })
  if (!res.ok) throw new Error(`TRELLIS ${res.status}: ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

async function appendAssetRow(row: {
  prop: string
  level: string
  budget: number
  actual: number
  seed: number
  prompt: string
  thumb: string
}): Promise<void> {
  const date = new Date().toISOString().slice(0, 10)
  const line = `| ${row.prop} | ${row.level} | ${row.budget} | ${row.actual} | ${row.seed} | ${row.prompt.replace(/\|/g, '\\|')} | ${date} | ${row.thumb} | generated |\n`
  await appendFile(path.join(process.cwd(), 'ASSETS.md'), line)
}

async function generateOne(prop: PropSpec, index: number): Promise<void> {
  if (prop.authored) {
    console.log(`[gen-assets] SKIP ${prop.name} — authored, not generated`)
    return
  }
  const seed = 1000 + index
  const refDir = path.join(process.cwd(), 'tools/refs')
  const rawDir = path.join(process.cwd(), 'tools/raw')
  const outDir = path.join(process.cwd(), 'public/models')
  await mkdir(refDir, { recursive: true })
  await mkdir(rawDir, { recursive: true })
  await mkdir(outDir, { recursive: true })

  console.log(`[gen-assets] ${prop.name}: FLUX...`)
  const refPng = await generateFlux(flatPrompt(prop), seed)
  const refPath = path.join(refDir, `${prop.name}-${seed}.png`)
  await writeFile(refPath, refPng)

  console.log(`[gen-assets] ${prop.name}: TRELLIS...`)
  const rawGlb = await generateTrellis(refPng)
  const rawPath = path.join(rawDir, `${prop.name}-${seed}.glb`)
  await writeFile(rawPath, rawGlb)

  console.log(`[gen-assets] ${prop.name}: post-processing...`)
  const outPath = path.join(outDir, `${prop.name}.glb`)
  const result = await postprocessGlb(rawPath, outPath, prop.budgetTris)

  await appendAssetRow({
    prop: prop.name,
    level: prop.level,
    budget: prop.budgetTris,
    actual: result.triCount,
    seed,
    prompt: prop.prompt,
    thumb: `tools/refs/${prop.name}-${seed}.png`,
  })
  console.log(`[gen-assets] ${prop.name}: DONE (${result.triCount}/${prop.budgetTris} tris)`)
}

async function main(): Promise<void> {
  if (!existsSync(path.join(process.cwd(), 'ASSETS.md'))) {
    throw new Error('ASSETS.md missing — run this from the swamp-tilt repo root')
  }
  const only = process.argv[2]
  const batch = only ? PROPS.filter((p) => p.name === only) : PROPS
  if (only && batch.length === 0) throw new Error(`no prop named "${only}"`)

  for (let i = 0; i < batch.length; i++) {
    try {
      await generateOne(batch[i], i)
    } catch (e) {
      // fail loudly per prop, keep going — one bad generation shouldn't
      // waste the rest of an expensive GPU-hour batch
      console.error(`[gen-assets] FAILED ${batch[i].name}:`, e)
    }
  }
  console.log('[gen-assets] batch complete — see ASSETS.md')
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
