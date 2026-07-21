/**
 * Post-process every raw TRELLIS GLB in tools/raw/ to its poly budget and
 * write to public/models/. Draco off (small props → plain GLTFLoader).
 * Run: npx tsx tools/postprocess-all.ts
 */
import { readdir, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { postprocessGlb } from './postprocess-glb'

const BUDGET: Record<string, number> = {
  gavel: 3000,
  'filing-cabinet': 4000,
  'yard-sign': 1000,
  'folding-table': 3000,
  podium: 4000,
  'bumper-cap': 1500,
  'flipper-bat': 800,
  'ball-gate': 3000, // fine wire mesh won't simplify below ~2.9k; negligible for a tiny prop
  'spinner-target': 500,
}

const RAW = path.join(process.cwd(), 'tools/raw')
const OUT = path.join(process.cwd(), 'public/models')

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true })
  const files = (await readdir(RAW)).filter((f) => f.endsWith('.glb'))
  const rows: string[] = []
  for (const f of files) {
    const name = f.replace(/\.glb$/, '')
    const budget = BUDGET[name] ?? 3000
    try {
      const r = await postprocessGlb(path.join(RAW, f), path.join(OUT, f), budget, 20, false)
      console.log(`OK   ${name}: ${r.triCount} tris (budget ${budget})`)
      rows.push(`${name}\t${r.triCount}\t${budget}\tOK`)
    } catch (e) {
      console.error(`FAIL ${name}: ${(e as Error).message}`)
      rows.push(`${name}\t?\t${budget}\tFAIL`)
    }
  }
  console.log('\n' + rows.join('\n'))
}

await main()
