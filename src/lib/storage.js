/*
  storage.js — saves and loads tasks.

  Right now tasks are kept in the browser's localStorage: a small
  per-website notebook that survives reloads and restarts, but only
  on this browser on this device. In a later phase this file will talk
  to a cloud database instead, and nothing else in the app will need
  to change. That's why storage gets its own file.
*/

// The name of our "page" in the notebook. The v1 lets us change the
// shape of the data later without mixing it up with old saves.
const STORAGE_KEY = 'dagen.tasks.v1'

// Returns the saved list, or an empty list if there's nothing (or
// something went wrong). The app should always start, even if storage fails.
export function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    // localStorage only stores text. JSON.parse turns the text back
    // into a real array of task objects.
    return saved ? JSON.parse(saved) : []
  } catch {
    // Blocked storage or damaged text: start with nothing rather than crash.
    return []
  }
}

// Saves the whole list. JSON.stringify turns the array into text.
export function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch {
    // Storage can be full or switched off (some private-browsing modes).
    // The app keeps working; it just won't remember after a reload.
  }
}
