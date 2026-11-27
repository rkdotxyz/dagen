/*
  vite.config.js — settings for Vite (dev server and builder), Vitest
  (the test runner), the PWA plugin that makes Dagen installable on a
  phone's home screen, and Tailwind CSS, which shadcn/ui is styled with.
*/

import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // "@/components/ui/button" means "src/components/ui/button". shadcn's
  // components are written with this shortcut, so Vite needs to know it.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  plugins: [
    react(),

    // Reads the class names in the components and writes just the CSS
    // they use.
    tailwindcss(),

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
        background_color: '#ffffff',
        theme_color: '#ffffff',
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
    // Fills the gaps in the pretend browser before any test runs.
    setupFiles: ['./src/test-setup.js'],
  },
})
