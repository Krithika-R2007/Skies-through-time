import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// HashRouter + base: './' => zero-config static hosting anywhere (GH Pages, S3, Vercel, Netlify, local files)
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      // Forward every backend path to the FastAPI server in development.
      // The frontend uses VITE_API_URL (default http://localhost:8000) in production;
      // during `vite dev` these paths are proxied to avoid CORS preflight issues.
      '/sky': 'http://localhost:8000',
      '/explore': 'http://localhost:8000',
      '/search': 'http://localhost:8000',
      '/spectrum': 'http://localhost:8000',
      '/motion': 'http://localhost:8000',
      '/gaia': 'http://localhost:8000',
      '/neossat': 'http://localhost:8000',
      '/cadc': 'http://localhost:8000',
      '/unwise': 'http://localhost:8000',
      '/journal': 'http://localhost:8000',
      '/watchlist': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, 'src/test/setup.ts')],
  },
})
