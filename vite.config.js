/*
  vite.config.js — settings for Vite (dev server and builder), Vitest
  (the test runner) and, from this phase, the PWA plugin that makes Dagen
  installable on a phone's home screen.
*/

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // When you push a new version, the installed app updates itself
      // the next time it's opened, instead of asking.
      registerType: 'autoUpdate',

      // The manifest is the card a phone reads when you "Add to Home
      // Screen": what the app is called, its colours, and how it opens.
      manifest: {
        name: 'Dagen',
        short_name: 'Dagen',
        description: 'Plan the day in a few taps.',
        start_url: '/',
        // standalone = opens without the browser's address bar, like an app.
        display: 'standalone',
        background_color: '#151515',
        theme_color: '#0b6e7f',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            // "maskable" lets Android crop it to whatever shape it uses.
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],

  test: {
    environment: 'jsdom',
  },
})
