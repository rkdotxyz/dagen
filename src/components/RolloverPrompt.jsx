/*
  RolloverPrompt.jsx — the morning question about unfinished work.

  "2 tasks didn't happen. Move them to To place?" Nothing moves until you
  say yes (RK chose a prompt over doing it silently). "Not now" leaves
  them where they are, and Dagen doesn't ask again until tomorrow.

  The rule for which tasks count is in rollover.js.
*/

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function RolloverPrompt({ count, onMove, onDismiss }) {
  const what = count === 1 ? '1 task didn’t happen.' : `${count} tasks didn’t happen.`

  return (
    // role="status" lets a screen reader announce it without stealing focus.
    <Card className="rollover-prompt" role="status">
      <CardContent className="rollover-content">
        <p className="rollover-text">{what} Move them to To place?</p>
        <div className="form-actions">
          <Button size="sm" onClick={onMove}>
            Move them
          </Button>
          <Button size="sm" variant="outline" onClick={onDismiss}>
            Not now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default RolloverPrompt
