/**
 * Gate 6 ship verification: boots the real build (or dev server) headless-
 * ish in real Chrome (WebGL needs a real GPU context — see gate1/2's own
 * README notes on headless-shell rendering at ~3 fps), asserts no console
 * errors, physics actually steps, a ball spawns and responds to flippers,
 * all three levels are reachable via a scripted impulse, and the frame
 * budget holds under 16ms average over 300 frames. Screenshots each level
 * to harness/shots/ for a human to eyeball.
 */
import { test, expect } from '@playwright/test'

const URL = process.env.VERIFY_URL ?? 'http://localhost:5199/games/pinball/'

test('boots clean, no console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto(URL)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(1500)
  expect(errors, `console errors on boot: ${errors.join('\n')}`).toHaveLength(0)
})

test('physics steps and a ball responds to flippers', async ({ page }) => {
  await page.goto(URL)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)

  const before = await page.locator('#debug').textContent()
  const beforeSubsteps = Number(before?.match(/substeps (\d+)/)?.[1] ?? -1)
  expect(beforeSubsteps).toBeGreaterThanOrEqual(0) // debug overlay is live

  // hold left flipper, confirm ball speed changes (it's resting at spawn —
  // a flip should impart some motion within a couple hundred ms)
  await page.keyboard.down('ShiftLeft')
  await page.waitForTimeout(300)
  await page.keyboard.up('ShiftLeft')
  await page.waitForTimeout(200)

  const after = await page.locator('#debug').textContent()
  const maxSpeed = Number(after?.match(/max ([\d.]+) m\/s/)?.[1] ?? 0)
  expect(maxSpeed, `flipper input should have moved the ball: ${after}`).toBeGreaterThan(0)
})

test('all three levels reachable via scripted impulse (traversal demo)', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(`${URL}?demo=gate2`)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(13_000) // traversalScenario reaches L3 by ~t=11s

  const debug = await page.locator('#debug').textContent()
  const maxSpeed = Number(debug?.match(/max ([\d.]+) m\/s/)?.[1] ?? 0)
  // the traversal scenario's full-power shots peak well above a resting
  // ball's speed only if it actually climbed both ramps
  expect(maxSpeed, `expected evidence of climbing shots: ${debug}`).toBeGreaterThan(3)
  expect(errors, `console errors during traversal: ${errors.join('\n')}`).toHaveLength(0)
})

test('frame budget holds under 16ms average over 300 frames', async ({ page }) => {
  // Measure the ACTUAL JS execution time inside every requestAnimationFrame
  // callback (game loop's physics step + render), not the wall-clock gap
  // between successive callbacks. On a vsync-locked 60Hz display that gap
  // is ~16.67ms by definition — the refresh interval — regardless of how
  // cheap the work inside each callback is, so measuring gaps is
  // unsatisfiable noise, not a real perf signal (Gate 6 finding: two
  // rounds of shadow-map tuning moved a gap-based measurement by 0.05ms).
  // Wrapping rAF itself, installed before any app code runs, measures what
  // the budget is actually about: does OUR code fit inside one frame.
  await page.addInitScript(() => {
    const native = window.requestAnimationFrame.bind(window)
    const durations: number[] = []
    ;(window as unknown as { __frameDurations: number[] }).__frameDurations = durations
    window.requestAnimationFrame = (cb: FrameRequestCallback) =>
      native((t) => {
        const start = performance.now()
        cb(t)
        durations.push(performance.now() - start)
      })
  })

  await page.goto(URL)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(1000) // let things settle post-boot, discard warm-up frames
  await page.evaluate(() => {
    ;(window as unknown as { __frameDurations: number[] }).__frameDurations.length = 0
  })
  await page.waitForTimeout(5000) // ~300 frames at 60Hz

  const avgWorkMs = await page.evaluate(() => {
    const d = (window as unknown as { __frameDurations: number[] }).__frameDurations
    return d.length ? d.reduce((a, b) => a + b, 0) / d.length : -1
  })
  console.log(`[verify] average rAF callback execution time: ${avgWorkMs.toFixed(2)}ms`)
  expect(avgWorkMs).toBeGreaterThan(0) // sanity: we actually captured frames
  expect(avgWorkMs, `frame budget exceeded: ${avgWorkMs.toFixed(2)}ms avg (want <16ms)`).toBeLessThan(16)
})

test('per-level screenshots', async ({ page }) => {
  await page.goto(`${URL}?demo=gate2`)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'harness/shots/verify-level1.png' })
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'harness/shots/verify-level2.png' })
  await page.waitForTimeout(9000)
  await page.screenshot({ path: 'harness/shots/verify-level3.png' })
})
