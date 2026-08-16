import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.join(os.tmpdir(), 'vite-nikke-l2d-cache')

// https://vite.dev/config/
export default defineConfig({
  root: __dirname,
  base: './',
  cacheDir,
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  }
})
