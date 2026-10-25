import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// GitHub Pages serves the app from https://<username>.github.io/level-up/
// so every asset path must start with /level-up/. If you rename the repo,
// change this (and the basePath in pwa-assets.config.ts).
const BASE = '/level-up/'
const BG = '#0b0d10'

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  define: {
    __APP_VERSION__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Ask before updating, so a new version never reloads mid-workout.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: BASE,
        name: 'Level Up',
        short_name: 'Level Up',
        description: 'A 12-week training plan that plays like a game.',
        lang: 'en-AU',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: BG,
        theme_color: BG,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the whole app (JS, CSS, fonts, icons) so it works fully offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        globIgnores: ['**/apple-splash-*'],
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
