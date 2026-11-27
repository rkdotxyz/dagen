/*
  TabBar.jsx — the screens: Day, Week, and the ones still to come.

  On a phone it sits at the bottom, where a thumb reaches. From 900px wide
  it moves to the top (index.css). The tab is also written into the web
  address (#week), so a reload, or the installed app, opens where you were.

  Month, Quarter and Insights are shown but switched off until their
  phases arrive, so the shape of the app is visible from the start.
*/

import { Button } from '@/components/ui/button'
import { TABS } from '../config.js'

function TabBar({ tab, onChange }) {
  return (
    <nav className="tab-bar" aria-label="Views">
      {TABS.map((item) => (
        <Button
          key={item.id}
          variant={item.id === tab ? 'default' : 'ghost'}
          // Tailwind classes, so they win over the Button's own padding:
          // five equal tabs on a phone, natural widths from 900px.
          className="tab h-11 min-w-0 flex-1 px-1 text-xs min-[900px]:h-9 min-[900px]:flex-none min-[900px]:px-4 min-[900px]:text-sm"
          disabled={!item.ready}
          // aria-current tells a screen reader which screen you're on.
          aria-current={item.id === tab ? 'page' : undefined}
          aria-label={item.ready ? item.name : `${item.name} (coming soon)`}
          onClick={() => onChange(item.id)}
        >
          {item.name}
        </Button>
      ))}
    </nav>
  )
}

export default TabBar
