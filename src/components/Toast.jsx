/*
  Toast.jsx — a short message at the bottom of the screen, sometimes with
  one action: "Dropped Update CV. [Undo]", or just "Under a minute, so it
  wasn't saved."

  App owns the timer that hides it (6 seconds) and what the action does;
  this only draws the message and the button.
*/

import { Button } from '@/components/ui/button'

function Toast({ message, actionLabel, onAction }) {
  return (
    // role="status" lets a screen reader read it out without moving focus.
    <div className="toast" role="status">
      <span>{message}</span>
      {actionLabel && (
        <Button size="sm" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export default Toast
