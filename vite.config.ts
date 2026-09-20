import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), cloudflare()],
  // Discord の Interactions Endpoint URL と OAuth の redirect_uri を
  // 使い回せるように、wrangler dev と同じポートに固定する。
  server: { port: 13575, strictPort: true },
})
