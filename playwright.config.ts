import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'harness',
  timeout: 180_000,
  use: {
    // real Chrome, headed: the capture needs GPU WebGL — headless-shell
    // software-renders at ~3 fps
    channel: 'chrome',
    headless: false,
    viewport: { width: 1280, height: 720 },
  },
  outputDir: 'harness/shots',
  reporter: [['list']],
})
