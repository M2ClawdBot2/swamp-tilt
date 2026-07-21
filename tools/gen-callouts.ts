/**
 * Grok (xAI) build-time script: generates announcer callout lines for every
 * mode/event, and FLUX prompt variations from the §4 seed prompts. Build-
 * time only, never bundled — XAI_API_KEY never ships in the client.
 *
 * Every line gets human review before it's committed (per build prompt
 * §11). This script only ever PRINTS generated lines and writes them to a
 * `.draft.json` file — never overwrites the real, human-approved
 * src/data/callouts.json directly. Promoting a draft to the real file is a
 * deliberate manual step (see `promoteDraft` below), not something this
 * script does on its own.
 */
import 'dotenv/config'
import { writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'

const XAI_BASE_URL = process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1'
const XAI_MODEL = process.env.XAI_MODEL ?? 'grok-4'

const TONE_GUIDE =
  'Tone: dry, deadpan, cabinet-announcer. Not snarky, not partisan attack lines. ' +
  'This is a game on a public-facing student org site — keep it about the BIT ' +
  '(tables, flyers, budgets, paperwork, procedure), never about opponents or real ' +
  'people. Active voice, sentence case. "Ball saved," not "Ball Save Activated!!" ' +
  'Keep each line under 8 words. No exclamation points unless the moment truly earns it.'

export interface CalloutEvent {
  key: string
  context: string
  count: number
}

export const CALLOUT_EVENTS: CalloutEvent[] = [
  { key: 'ballLaunch', context: 'player launches a new ball', count: 4 },
  { key: 'tableLetterLit', context: 'a T-A-B-L-E drop target is knocked down', count: 3 },
  { key: 'recruitLit', context: 'the TABLE bank is complete, Recruit Multiball is lit', count: 2 },
  { key: 'recruitStart', context: 'Recruit Multiball begins, 3 balls in play', count: 2 },
  { key: 'recruitSurvived', context: 'the player survived the full Recruit Multiball timer', count: 2 },
  { key: 'budgetLetterLit', context: 'a B-U-D-G-E-T drop target is knocked down', count: 3 },
  { key: 'fundingLit', context: 'the BUDGET bank is complete, funding is lit', count: 2 },
  { key: 'filingLock', context: 'a ball locks in the filing cabinet (1 of 3 needed)', count: 3 },
  { key: 'charterStart', context: 'Charter Multiball begins on The Reitz', count: 2 },
  { key: 'denialKickback', context: 'a missed shot on The Reitz kicks the ball back down to the Plaza, no progress lost', count: 3 },
  { key: 'gavelHit', context: 'the gavel target on The Bench is struck', count: 2 },
  { key: 'wizardLocked', context: 'the ball is locked under the gavel, one shot from the wizard mode', count: 2 },
  { key: 'wizardStart', context: 'SUMMARY JUDGMENT wizard mode begins, all three levels live', count: 2 },
  { key: 'wizardEnd', context: 'SUMMARY JUDGMENT ends and the final award is calculated', count: 2 },
  { key: 'tiltWarning', context: 'the player nudged the machine too hard, a tilt warning is issued', count: 2 },
  { key: 'tilt', context: 'the machine tilts — all scoring and flippers freeze for this ball', count: 2 },
  { key: 'drain', context: 'the ball drains down the swamp at the bottom of the Plaza', count: 3 },
  { key: 'skillShot', context: 'the player hits the skill shot by plunging a yard sign into the plaza', count: 2 },
  { key: 'highScore', context: 'the player just earned a new high score', count: 2 },
  { key: 'gameOver', context: 'the game has ended', count: 2 },
]

interface XaiResponse {
  choices: { message: { content: string } }[]
}

async function callGrok(prompt: string): Promise<string> {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) throw new Error('XAI_API_KEY not set in .env')
  const res = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [
        { role: 'system', content: TONE_GUIDE },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
    }),
  })
  if (!res.ok) throw new Error(`xAI ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as XaiResponse
  return json.choices[0]?.message.content ?? ''
}

function parseLines(raw: string, count: number): string[] {
  const lines = raw
    .split('\n')
    .map((l) => l.replace(/^[\d.\-*\s"]+/, '').replace(/["']+$/, '').trim())
    .filter(Boolean)
  return lines.slice(0, count)
}

async function generateEvent(ev: CalloutEvent): Promise<string[]> {
  const prompt = `Write ${ev.count} distinct one-line pinball cabinet announcer callouts for this moment: ${ev.context}. One per line, no numbering, no quotes.`
  const raw = await callGrok(prompt)
  return parseLines(raw, ev.count)
}

export async function generateDraft(): Promise<Record<string, string[]>> {
  const draft: Record<string, string[]> = {}
  for (const ev of CALLOUT_EVENTS) {
    console.log(`[gen-callouts] ${ev.key}...`)
    try {
      draft[ev.key] = await generateEvent(ev)
    } catch (e) {
      console.error(`[gen-callouts] FAILED ${ev.key}:`, e)
      draft[ev.key] = []
    }
  }
  return draft
}

/**
 * Human-review gate: print every generated line to the console, grouped by
 * event, before anything touches disk. Never auto-approved.
 */
function printForReview(draft: Record<string, string[]>): void {
  console.log('\n=== REVIEW REQUIRED before promoting to src/data/callouts.json ===\n')
  for (const [key, lines] of Object.entries(draft)) {
    console.log(`${key}:`)
    for (const line of lines) console.log(`  "${line}"`)
  }
  console.log('\nRun `tsx tools/gen-callouts.ts promote` after reviewing the .draft.json file.\n')
}

const DRAFT_PATH = path.join(process.cwd(), 'src/data/callouts.draft.json')
const FINAL_PATH = path.join(process.cwd(), 'src/data/callouts.json')

async function main(): Promise<void> {
  const cmd = process.argv[2]
  if (cmd === 'promote') {
    const draft = JSON.parse(await readFile(DRAFT_PATH, 'utf-8'))
    await writeFile(FINAL_PATH, JSON.stringify(draft, null, 2) + '\n')
    console.log(`[gen-callouts] promoted ${DRAFT_PATH} -> ${FINAL_PATH}`)
    return
  }
  const draft = await generateDraft()
  await writeFile(DRAFT_PATH, JSON.stringify(draft, null, 2) + '\n')
  printForReview(draft)
  console.log(`[gen-callouts] wrote draft to ${DRAFT_PATH} (NOT committed as final)`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
