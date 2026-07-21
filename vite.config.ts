import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/games/pinball/',
  server: { port: Number(process.env.PORT ?? 5173) },
  build: { target: 'es2022' },
})
