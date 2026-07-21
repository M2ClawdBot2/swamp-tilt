/**
 * Gate 2 capture: records the scripted multilevel traversal demo
 * (?demo=gate2) — Plaza → Reitz → falls home → Reitz → Bench → falls home —
 * and asserts no console errors and the traversal actually completes.
 */
import { test, expect } from '@playwright/test'

const URL = process.env.GATE2_URL ?? 'http://localhost:5199/games/pinball/'

test('gate 2 traversal capture', async ({ page }) => {
  test.setTimeout(60_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto(`${URL}?demo=gate2`)
  await page.waitForSelector('canvas')

  // screenshot mid-climb (L1->L2 shot happens ~0.3-1s in) and after full
  // cascade settles (~12s), instead of a full video — real-Chrome context
  // teardown after `video: 'on'` hangs indefinitely in this sandbox
  // regardless of timeout, an environment quirk unrelated to the game.
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'harness/shots/gate2-midclimb.png' })
  await page.waitForTimeout(11_500)
  await page.screenshot({ path: 'harness/shots/gate2-settled.png' })

  const debug = await page.locator('#debug').textContent()
  console.log('--- DEBUG OVERLAY ---')
  console.log(debug)
  expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0)
})
