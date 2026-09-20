import { fileURLToPath, URL } from 'node:url'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    // tanstackRouter は react() より前に置く。後ろだとルート生成が黙って失敗する。
    tanstackRouter({
      target: 'react',
      // 既定の src/routes は Worker 側のルーティングと衝突するため変更する。
      routesDirectory: './src/web/routes',
      generatedRouteTree: './src/web/routeTree.gen.ts',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    cloudflare(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Discord の Interactions Endpoint URL と OAuth の redirect_uri を
  // 使い回せるように、wrangler dev と同じポートに固定する。
  server: { port: 13575, strictPort: true },
})
