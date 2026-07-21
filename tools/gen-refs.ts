/**
 * Generate reference product images for every prop via xAI's image model.
 * These feed TRELLIS (image -> 3D). Build-time only; xAI credits, not the
 * RunPod budget. Saves PNG/JPEG to tools/refs/ and appends nothing to
 * ASSETS.md yet (that happens after the 3D conversion in gen-assets).
 */
import 'dotenv/config'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { PROPS } from './gen-assets'

const XAI_BASE_URL = process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1'
const NEG = ', plain white background, single object, centered, no text, no logos, no watermark'

async function genImage(prompt: string): Promise<{ buf: Buffer; costUsd: number }> {
  const key = process.env.XAI_API_KEY
  if (!key) throw new Error('XAI_API_KEY not set')
  const res = await fetch(`${XAI_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'grok-imagine-image', prompt, n: 1 }),
  })
  if (!res.ok) throw new Error(`xAI images ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as {
    data: { url?: string; b64_json?: string }[]
    usage?: { cost_in_usd_ticks?: number }
  }
  const item = json.data[0]
  let buf: Buffer
  if (item.b64_json) buf = Buffer.from(item.b64_json, 'base64')
  else if (item.url) buf = Buffer.from(await (await fetch(item.url)).arrayBuffer())
  else throw new Error('xAI returned no image data')
  const costUsd = (json.usage?.cost_in_usd_ticks ?? 0) * 1e-9 // ticks are nano-dollars
  return { buf, costUsd }
}

async function main(): Promise<void> {
  const refDir = path.join(process.cwd(), 'tools/refs')
  await mkdir(refDir, { recursive: true })
  const only = process.argv[2]
  const batch = PROPS.filter((p) => !p.authored && (!only || p.name === only))

  let total = 0
  for (const prop of batch) {
    const prompt = prop.prompt + NEG
    console.log(`[gen-refs] ${prop.name}...`)
    try {
      const { buf, costUsd } = await genImage(prompt)
      await writeFile(path.join(refDir, `${prop.name}.jpg`), buf)
      total += costUsd
      console.log(`[gen-refs] ${prop.name}: saved (${(buf.length / 1024).toFixed(0)} KB, ~$${costUsd.toFixed(3)})`)
    } catch (e) {
      console.error(`[gen-refs] FAILED ${prop.name}:`, e)
    }
  }
  console.log(`[gen-refs] done — ~$${total.toFixed(2)} of xAI image credit`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
