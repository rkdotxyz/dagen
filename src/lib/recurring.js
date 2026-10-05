/*
  recurring.js — chores that come back.

  A template is a rule, not a task: "Cook, daily, 18:00, 1 hour". Real
  tasks are made from it one day at a time, as you look at each day, so
  the app never fills your storage with a year of dinners.

  Making them as you go also means each day's copy is an ordinary task:
  you can move it, mark it tentative or tick it off without touching the
  rule behind it.
*/

import { splitStart, weekdayIndex } from './dates.js'
import { makeStart } from './dates.js'

// The id used to remember "I deleted this chore on this day, don't
// bring it back". A template id and a day, joined.
export function skipKey(templateId, day) {
  return `${templateId}:${day}`
}

// Is this chore due on this day?
export function isDue(template, day) {
  if (template.repeat === 'daily') return true
  return weekdayIndex(day) === template.weekday
}

// The chores that should exist on this day but don't yet.
// Three filters, each answering one question:
//   due today? already made? deleted on purpose?
// Returns tasks without an id: whoever calls this gives them one.
export function missingTasks(templates, day, tasks, skipped) {
  return templates
    .filter((template) => isDue(template, day))
    .filter(
      (template) =>
        !tasks.some(
          (task) =>
            task.templateId === template.id && splitStart(task.start).day === day,
        ),
    )
    .filter((template) => !skipped.includes(skipKey(template.id, day)))
    .map((template) => ({
      templateId: template.id,
      categoryId: template.categoryId,
      title: template.title,
      start: makeStart(day, template.time),
      durationMin: template.durationMin,
      tentative: false,
      status: 'todo',
    }))
}
