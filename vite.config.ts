/// <reference types="vitest" />
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/plattenzuschnitt/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon-192.png'],
      manifest: {
        name: 'Plattenzuschnitt',
        short_name: 'Zuschnitt',
        description: 'Optimierter Holzplattenzuschnitt',
        theme_color: '#1e293b',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: []
      }
    })
  ],
  test: {
    environment: 'node'
  }
})
