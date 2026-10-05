/*
  AccountBar.jsx — the one line about signing in.

  Three states: not set up (no Supabase keys), signed out, signed in.
  It shows what's true rather than hiding the difference, because
  "where are my tasks actually kept?" is a fair question to be able to
  answer at a glance.
*/

// Each link gets a pen underline, re-sketched whenever you hover it.
import { DrawablyUnderline } from 'drawably/react'

function AccountBar({ isConfigured, session, syncing, onSignIn, onSignOut }) {
  if (!isConfigured) {
    return <p className="account">Saved on this device only.</p>
  }

  if (!session) {
    return (
      <p className="account">
        Saved on this device only.{' '}
        <button type="button" className="link" onClick={onSignIn}>
          <DrawablyUnderline>Sign in with Google</DrawablyUnderline>
        </button>{' '}
        to use Dagen on your phone too.
      </p>
    )
  }

  return (
    <p className="account">
      {/* Optional chaining (?.) : if there's no user or no email, this is
          undefined rather than an error. */}
      <span>{session.user?.email}</span>
      {syncing && <span className="syncing"> · saving…</span>}{' '}
      <button type="button" className="link" onClick={onSignOut}>
        <DrawablyUnderline>Sign out</DrawablyUnderline>
      </button>
    </p>
  )
}

export default AccountBar
