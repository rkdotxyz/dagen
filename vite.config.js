/*
  vite.config.js — settings for Vite (the dev server and builder)
  and, since Phase 2, for Vitest (the test runner). Vitest reads this
  same file, so tests understand JSX exactly like the app does.
*/

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  test: {
    // Tests run in Node, which has no browser: no page, no localStorage.
    // jsdom is a pretend browser that provides them.
    environment: 'jsdom',
  },
})
