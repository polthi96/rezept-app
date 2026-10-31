/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Feste Veröffentlichungsadresse: https://<github-name>.github.io/rezept-app/
// Die Daten auf dem iPhone sind an diese Adresse gebunden – nicht ändern (siehe docs/KONZEPT.md, 5c).
const BASE = '/rezept-app/'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

export default defineConfig({
  base: BASE,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      // "prompt": neue Versionen werden geladen, aber erst nach Tipp auf "Jetzt neu starten" aktiv.
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Kochbuch',
        short_name: 'Kochbuch',
        description: 'Rezepte sammeln, kochen und Ernährung im Blick behalten',
        lang: 'de',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        background_color: '#faf7f2',
        theme_color: '#c4552d',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
