/**
 * Synthesizes placeholder SFX as WAV files — no audio library needed, just
 * raw PCM synthesis written straight to a .wav header. Build-time only;
 * real recordings can replace these files later without touching
 * audio/bank.ts (same filenames, same sprite map).
 */
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const SAMPLE_RATE = 44100

function writeWav(samples: Float32Array): Buffer {
  const bytesPerSample = 2
  const dataSize = samples.length * bytesPerSample
  const buf = Buffer.alloc(44 + dataSize)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20) // PCM
  buf.writeUInt16LE(1, 22) // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24)
  buf.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28)
  buf.writeUInt16LE(bytesPerSample, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2)
  }
  return buf
}

function envelope(n: number, i: number, attack: number, release: number): number {
  const t = i / n
  if (t < attack) return t / attack
  if (t > 1 - release) return (1 - t) / release
  return 1
}

function tone(freqStart: number, freqEnd: number, durationSec: number, opts: { noise?: number; attack?: number; release?: number } = {}): Float32Array {
  const n = Math.floor(SAMPLE_RATE * durationSec)
  const out = new Float32Array(n)
  const attack = opts.attack ?? 0.02
  const release = opts.release ?? 0.3
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / n
    const freq = freqStart + (freqEnd - freqStart) * t
    phase += (2 * Math.PI * freq) / SAMPLE_RATE
    let v = Math.sin(phase)
    if (opts.noise) v = v * (1 - opts.noise) + (Math.random() * 2 - 1) * opts.noise
    out[i] = v * envelope(n, i, attack, release) * 0.6
  }
  return out
}

function chord(freqs: number[], durationSec: number, opts: { attack?: number; release?: number } = {}): Float32Array {
  const layers = freqs.map((f) => tone(f, f, durationSec, opts))
  const n = layers[0].length
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (const l of layers) sum += l[i]
    out[i] = sum / layers.length
  }
  return out
}

const SFX: Record<string, () => Float32Array> = {
  flip: () => tone(900, 300, 0.08, { attack: 0.002, release: 0.5 }),
  bumper: () => tone(500, 900, 0.1, { attack: 0.005, release: 0.6, noise: 0.15 }),
  target: () => tone(1200, 1600, 0.06, { attack: 0.002, release: 0.6 }),
  spinner: () => tone(2000, 2400, 0.04, { attack: 0.001, release: 0.8 }),
  launch: () => tone(150, 700, 0.35, { attack: 0.05, release: 0.4, noise: 0.05 }),
  jackpot: () => chord([523, 659, 784, 1047], 0.6, { attack: 0.01, release: 0.6 }),
  multiball: () => chord([392, 523, 659, 784], 0.9, { attack: 0.02, release: 0.7 }),
  drain: () => tone(300, 60, 0.7, { attack: 0.01, release: 0.85, noise: 0.2 }), // "the swamp"
  tilt: () => tone(220, 90, 0.5, { attack: 0.01, release: 0.6, noise: 0.4 }),
  gavel: () => tone(180, 90, 0.15, { attack: 0.001, release: 0.7, noise: 0.1 }),
  wizardStart: () => chord([261, 329, 392, 523, 659], 1.4, { attack: 0.05, release: 0.7 }),
  uiSelect: () => tone(700, 1000, 0.05, { attack: 0.002, release: 0.6 }),
  uiConfirm: () => tone(700, 1400, 0.12, { attack: 0.005, release: 0.6 }),
}

async function main(): Promise<void> {
  const outDir = path.join(process.cwd(), 'public/audio')
  await mkdir(outDir, { recursive: true })
  for (const [name, gen] of Object.entries(SFX)) {
    const samples = gen()
    const wav = writeWav(samples)
    await writeFile(path.join(outDir, `${name}.wav`), wav)
    console.log(`[gen-sfx] ${name}.wav (${(samples.length / SAMPLE_RATE).toFixed(2)}s)`)
  }
  console.log(`[gen-sfx] wrote ${Object.keys(SFX).length} placeholder SFX to ${outDir}`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
export { SFX }
