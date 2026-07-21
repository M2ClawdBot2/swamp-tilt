/**
 * Callout playback: reads the baked JSON, no runtime API calls (per build
 * prompt — Grok only ever runs at build time). "Playback" here means DMD
 * text, not a voice clip: generating actual speech audio needs a TTS step
 * this build doesn't have yet. A real machine would pair this with a voice
 * line; the hook (`onCallout`) is already the seam Phase 5 audio work would
 * wire a Howl to, once recordings exist.
 */
import callouts from '../data/callouts.json'

export type CalloutKey = keyof typeof callouts

let onCallout: ((text: string) => void) | null = null

export function subscribeCallouts(fn: (text: string) => void): () => void {
  onCallout = fn
  return () => {
    onCallout = null
  }
}

export function fireCallout(key: CalloutKey): string | null {
  const lines = (callouts as Record<string, string[]>)[key]
  if (!lines || lines.length === 0) return null
  const line = lines[Math.floor(Math.random() * lines.length)]
  onCallout?.(line)
  return line
}
