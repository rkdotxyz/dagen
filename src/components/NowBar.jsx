/*
  NowBar.jsx — what you're doing right now, on every screen.

  While a timer runs: its label, its Area's colour, a clock counting up
  (HH:MM:SS, every second) and Stop. With nothing running: "Resume last"
  (restarts whatever you tracked most recently) and "Log time" (for time
  you forgot to track).

  The clock is the only thing this component owns: a tick every second,
  so the elapsed time can be redrawn. The timer itself lives in App and
  is saved, so closing the app doesn't lose it.
*/

import { useEffect, useState } from 'react'
import { PlayIcon, PlusIcon, SquareIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCategory } from '../config.js'
import { elapsedSeconds, formatClock } from '../lib/timer.js'

function NowBar({ timer, last, onStop, onResume, onLogTime }) {
  // Redraw once a second while something runs. The interval is cleared
  // when the timer stops or the bar goes away.
  const [now, setNow] = useState(() => new Date())

  // Until the first tick the clock may read a moment early; elapsedSeconds
  // never goes below zero, so it simply shows 00:00:00 for that second.
  useEffect(() => {
    if (!timer) return
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [timer])

  if (timer) {
    return (
      <div className="now-bar running" role="region" aria-label="Now">
        <span className="dot" style={{ backgroundColor: getCategory(timer.categoryId).hex }} />
        <span className="now-label">{timer.label}</span>
        {/* tabular numbers keep the clock from jiggling as digits change */}
        <span className="now-clock" aria-label="Time so far">
          {formatClock(elapsedSeconds(timer, now))}
        </span>
        <Button size="sm" onClick={onStop}>
          <SquareIcon />
          Stop
        </Button>
      </div>
    )
  }

  return (
    <div className="now-bar" role="region" aria-label="Now">
      <span className="now-label muted">Nothing running</span>
      {last && (
        <Button size="sm" variant="outline" onClick={onResume} aria-label={`Resume ${last.label}`}>
          <PlayIcon />
          Resume last
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={onLogTime}>
        <PlusIcon />
        Log time
      </Button>
    </div>
  )
}

export default NowBar
