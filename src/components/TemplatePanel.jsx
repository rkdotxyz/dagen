/*
  TemplatePanel.jsx — the list of recurring chores, and the form to add one.

  A template is a rule: what, where, how often, when and for how long.
  Since Phase 12 a rule can also make FIXED events ("KTH lecture, Tue
  10:00"), which take capacity first, and can belong to an Area.
  Nothing here knows how the rules turn into tasks; that's recurring.js.

  The whole panel is a shadcn/ui Card, with its Input, NativeSelect and
  Button inside.
*/

import { useId, useState } from 'react'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { findArea, liveAreas } from '../lib/areas.js'
import { CATEGORIES, getCategory } from '../config.js'
import { DURATIONS, QUARTER_TIMES, WEEKDAY_NAMES, formatDuration } from '../lib/dates.js'

// Describes a rule in words: "Daily at 18:00 · 1h" or "Every Saturday…".
function describe(template) {
  const when =
    template.repeat === 'daily' ? 'Daily' : `Every ${WEEKDAY_NAMES[template.weekday]}`

  const fixed = template.fixed ? ' · fixed' : ''
  return `${when} at ${template.time} · ${formatDuration(template.durationMin)}${fixed}`
}

function TemplatePanel({ templates, areas = [], onAdd, onDelete }) {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id)
  const [repeat, setRepeat] = useState('daily')
  const [weekday, setWeekday] = useState(0)
  const [time, setTime] = useState('18:00')
  const [durationMin, setDurationMin] = useState(30)
  const [fixed, setFixed] = useState(false)
  const [areaId, setAreaId] = useState('')
  const fixedId = useId()

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed === '') return

    const area = findArea(areas, areaId)

    onAdd({
      title: trimmed,
      // As in the task form, an Area decides the category.
      categoryId: area ? area.categoryId : categoryId,
      areaId: area ? area.id : null,
      fixed: fixed,
      repeat: repeat,
      // Number(...) because a <select> always hands back text, even "0".
      weekday: Number(weekday),
      time: time,
      durationMin: durationMin,
    })

    setTitle('')
  }

  return (
    <section className="templates" aria-label="Recurring chores">
      <Card className="panel-card">
        <CardHeader>
          <CardTitle>Recurring chores</CardTitle>
        </CardHeader>
        <CardContent>

        {templates.length === 0 ? (
          <p className="empty">
            No recurring chores yet. Add one and it will appear on every day it is due.
          </p>
        ) : (
          <ul className="template-list">
            {templates.map((template) => (
              <li key={template.id} className="template">
                <span
                  className="dot"
                  style={{ backgroundColor: getCategory(template.categoryId).hex }}
                />
                <span className="template-text">
                  <span>{template.title}</span>
                  <span className="task-when">{describe(template)}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(template.id)}
                  aria-label={`Delete the ${template.title} chore`}
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form className="task-form" onSubmit={handleSubmit}>
          <Input
            className="field"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Cook dinner"
            aria-label="Chore name"
          />

          <div className="form-row">
            <NativeSelect
              className="field"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              aria-label="Category"
            >
              {CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              className="field"
              value={repeat}
              onChange={(event) => setRepeat(event.target.value)}
              aria-label="How often"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </NativeSelect>

            {/* The weekday only matters for a weekly chore, so it only
              appears when one is chosen. */}
            {repeat === 'weekly' && (
              <NativeSelect
                className="field"
                value={weekday}
                onChange={(event) => setWeekday(event.target.value)}
                aria-label="Weekday"
              >
                {WEEKDAY_NAMES.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </NativeSelect>
            )}

            <NativeSelect
              className="field"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              aria-label="Chore time"
            >
              {QUARTER_TIMES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="chips" role="group" aria-label="Chore duration">
            {DURATIONS.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={option === durationMin ? 'default' : 'outline'}
                aria-pressed={option === durationMin}
                onClick={() => setDurationMin(option)}
              >
                {formatDuration(option)}
              </Button>
            ))}
          </div>

          <div className="form-row">
            {liveAreas(areas).length > 0 && (
              <NativeSelect
                className="field"
                value={areaId}
                onChange={(event) => setAreaId(event.target.value)}
                aria-label="Chore Area"
              >
                <option value="">No Area</option>
                {liveAreas(areas).map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </NativeSelect>
            )}

            <div className="tentative-toggle">
              <Switch id={fixedId} checked={fixed} onCheckedChange={setFixed} />
              <Label htmlFor={fixedId}>Fixed event</Label>
            </div>
          </div>

          <div className="form-row">
            <Button type="submit">Add chore</Button>
          </div>
        </form>
        </CardContent>
      </Card>
    </section>
  )
}

export default TemplatePanel
