/**
 * Plunger verification in a real browser: start a game, confirm a ball waits
 * in the lane (prompt visible), hold Space to charge, release, and confirm
 * the ball actually launched into play (prompt gone, ball moved).
 */
import { test, expect } from '@playwright/test'

const URL = process.env.PLUNGER_URL ?? 'http://localhost:5199/games/pinball/'

test('plunger charges and launches the ball into play', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto(`${URL}?demo=game`)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(800)

  // ball should be waiting in the lane
  await expect(page.locator('.st-plunger')).toBeVisible()
  const promptText = await page.locator('.st-plunger-label').textContent()
  console.log(`[plunger] prompt: "${promptText}"`)

  // hold Space to charge
  await page.keyboard.down('Space')
  await page.waitForTimeout(700)
  const chargeWidth = await page.locator('.st-plunger-fill').evaluate((el) => (el as HTMLElement).style.width)
  console.log(`[plunger] charge after 700ms hold: ${chargeWidth}`)
  // release — fires the plunger
  await page.keyboard.up('Space')
  await page.waitForTimeout(1200)

  // ball should have left the lane and be in play
  const debug = await page.locator('#debug').textContent()
  const maxSpeed = Number(debug?.match(/max ([\d.]+) m\/s/)?.[1] ?? 0)
  console.log(`[plunger] max ball speed after launch: ${maxSpeed} m/s`)

  const laneGone = (await page.locator('.st-plunger').count()) === 0
  expect(Number(chargeWidth.replace('%', '')), 'plunger charged while held').toBeGreaterThan(30)
  expect(maxSpeed, 'ball actually launched at speed').toBeGreaterThan(3)
  expect(laneGone, 'ball left the lane (prompt cleared)').toBe(true)
  expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0)
})
