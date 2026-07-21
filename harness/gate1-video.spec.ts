/**
 * Gate 1 capture: records the scripted demo (?demo=gate1) — cradle,
 * post-pass, orbit, full-power flip, both-held — then measures real
 * input→flipper latency with trusted keyboard events at display refresh.
 */
import { test, expect } from '@playwright/test'

const URL = process.env.GATE1_URL ?? 'http://localhost:5199/pinball/'

test('gate 1 demo video + latency', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto(`${URL}?demo=gate1`)
  await page.waitForSelector('canvas')

  // demo runs ~29 s of physics time (5 scenarios + gaps)
  await page.waitForTimeout(31_000)

  // latency measurement with trusted input at real refresh rate
  for (let i = 0; i < 12; i++) {
    const key = i % 2 ? 'ShiftRight' : 'ShiftLeft'
    await page.keyboard.down(key)
    await page.waitForTimeout(180)
    await page.keyboard.up(key)
    await page.waitForTimeout(140)
  }

  const debug = await page.locator('#debug').textContent()
  console.log('--- DEBUG OVERLAY ---')
  console.log(debug)
  expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0)

  const m = debug?.match(/worst (\d+)f \((\d+) presses\)/)
  expect(m, 'latency line present').toBeTruthy()
  const worstFrames = Number(m![1])
  const presses = Number(m![2])
  expect(presses).toBeGreaterThanOrEqual(12)
  expect(worstFrames, 'input→flipper latency must be 0-1 frames').toBeLessThanOrEqual(1)

  const fpsMatch = debug?.match(/fps (\d+)/)
  console.log(`fps at capture end: ${fpsMatch?.[1]}`)
})
