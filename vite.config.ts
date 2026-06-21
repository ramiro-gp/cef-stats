import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['favicon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
    manifest: {
      name: 'Fulbo Stats',
      short_name: 'Fulbo',
      description: 'Tus números, tus amigos, tu fútbol.',
      lang: 'es-AR',
      theme_color: '#07110e',
      background_color: '#000000',
      display: 'standalone',
      start_url: '/',
      scope: '/',
      orientation: 'any',
      icons: [
        { src: '/pwa-192x192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
        { src: '/pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        { src: '/pwa-512x512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
      ],
    },
    workbox: {
      cleanupOutdatedCaches: true,
      navigateFallback: '/index.html',
      globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      runtimeCaching: [],
    },
  })],
})
