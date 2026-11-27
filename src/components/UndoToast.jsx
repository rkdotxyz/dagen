/*
  UndoToast.jsx — "Dropped Update CV. Undo" at the bottom of the screen.

  Shown for 6 seconds after something is removed. App owns the timer and
  what Undo puts back; this only draws the message and the button.
*/

import { Button } from '@/components/ui/button'

function UndoToast({ message, onUndo }) {
  return (
    <div className="toast" role="status">
      <span>{message}</span>
      <Button size="sm" variant="secondary" onClick={onUndo}>
        Undo
      </Button>
    </div>
  )
}

export default UndoToast
