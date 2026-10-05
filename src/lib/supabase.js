/*
  supabase.js — the connection to your Supabase project.

  Supabase is a hosted Postgres database with sign-in built in. The two
  values below come from your project's settings and live in .env.local,
  which Git never saves. Vite only exposes variables whose names start
  with VITE_, and everything it exposes ends up in the published
  JavaScript, so ONLY the "anon" key goes here: it's designed to be
  public, and the database's own rules decide what it may touch.

  If the values are missing (a fresh clone, or CI), isConfigured is false
  and the app simply runs as it always has, saving in the browser.
*/

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

export const supabase = isConfigured ? createClient(url, anonKey) : null
