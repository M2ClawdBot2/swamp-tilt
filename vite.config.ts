import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/games/pinball/',
  server: { port: Number(process.env.PORT ?? 5173) },
  build: { target: 'es2022' },
  plugins: [react()],
})
