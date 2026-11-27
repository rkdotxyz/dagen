import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Tailwind, the shadcn/ui theme and Dagen's layout, all in one file.
import './index.css'
import App from './App.jsx'

function start() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// Development only: ?seed=horizon fills this device with sample data
// (src/lib/devSeed.js) before the app starts. import.meta.env.DEV is false
// in the production build, so this whole block, and devSeed.js with it,
// is left out of what gets published.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('seed') === 'horizon') {
  Promise.all([import('./lib/devSeed.js'), import('./lib/cloud.js'), import('./lib/storage.js')]).then(
    ([{ buildSeed }, { toPlanner }, storage]) => {
      const planner = toPlanner(buildSeed(new Date().toLocaleDateString('sv-SE')))
      storage.saveTasks(planner.tasks)
      storage.saveTemplates(planner.templates)
      storage.saveSkipped(planner.skipped)
      storage.saveCollapsed(planner.collapsed)
      storage.saveAreas(planner.areas)
      storage.saveEntries(planner.entries)
      storage.saveTimer(planner.activeTimer)
      storage.saveAway(planner.away)
      storage.saveSettings(planner.settings)
      // Drop "?seed=horizon" from the address, so a reload keeps your
      // changes instead of seeding again.
      window.history.replaceState(null, '', window.location.pathname + window.location.hash)
      start()
    },
  )
} else {
  start()
}
