/*
  devSeed.js — a realistic planner for trying Dagen out by hand.

  Open the dev server with ?seed=horizon (http://localhost:5173/?seed=horizon)
  and this replaces what's on this device with RK's real Areas, a week of
  classes, some tasks, a trip and about 40 days of tracked time, all
  relative to today. It's how the README screenshots were made.

  It only exists in development: main.jsx loads it inside
  "if (import.meta.env.DEV)", which the production build removes entirely.
  It never touches the cloud: it writes to this device's storage only.

  buildSeed is a plain function (given today and a random source) so it
  can be tested like everything else in lib/.
*/

import { addDays, makeStart, startOfWeek } from './dates.js'
import { TASK_DEFAULTS, migrateArea } from './migrate.js'

// The Areas from the spec: [id, name, category, status, hours a month].
const AREAS = [
  ['a_kth', 'KTH courses', 'classes', 'active', 30],
  ['a_dm', 'DM2601 · Rocky', 'classes', 'active', 22],
  ['a_rk', 'Räckvidd (NAVET)', 'projects', 'active', 20],
  ['a_int', 'Internship search', 'personal', 'active', 10],
  ['a_pf', 'Portfolio site', 'projects', 'active', 8],
  ['a_trip', 'Winter trip planning', 'personal', 'active', 5],
  ['a_sv', 'Swedish', 'learning', 'maintain', 8],
  ['a_dt', 'Detent library', 'projects', 'maintain', 6],
  ['a_robot', 'Desk robot', 'projects', 'maintain', 4],
  ['a_f360', 'Fusion 360', 'learning', 'maintain', 3],
  ['a_ongem', 'OnGem freelance', 'projects', 'maintain', 4],
  ['a_admin', 'Admin and errands', 'chores', 'maintain', 4],
  ['a_gb', 'Gesture bloom', 'projects', 'paused', 0],
]

// Weekly fixed rules: [id, title, area, category, weekday (Mon = 0), time, minutes].
const RULES = [
  ['r_studio_mon', 'DM2601 studio', 'a_dm', 'classes', 0, '09:00', 180],
  ['r_studio_fri', 'DM2601 studio', 'a_dm', 'classes', 4, '09:00', 180],
  ['r_lecture', 'KTH lecture', 'a_kth', 'classes', 1, '10:00', 120],
  ['r_lab', 'KTH lab', 'a_kth', 'classes', 3, '10:00', 180],
  ['r_sv_mon', 'Swedish class', 'a_sv', 'learning', 0, '17:15', 90],
  ['r_sv_fri', 'Swedish class', 'a_sv', 'learning', 4, '16:00', 90],
]

// What tracked time gets spent on, with how often (weight).
const WORK = [
  ['a_kth', 'classes', 'Lecture notes', 5],
  ['a_dm', 'classes', 'Rocky prototype', 4],
  ['a_rk', 'projects', 'Exhibit build', 4],
  ['a_int', 'personal', 'Applications', 2],
  ['a_pf', 'projects', 'Portfolio case study', 1],
  ['a_sv', 'learning', 'Swedish practice', 2],
  ['a_dt', 'projects', 'Detent library', 1],
  ['a_gb', 'projects', 'Gesture bloom sketch', 1],
]

const time = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

function task(id, details) {
  return {
    ...TASK_DEFAULTS,
    id: id,
    categoryId: 'projects',
    status: 'todo',
    tentative: false,
    durationMin: 60,
    ...details,
  }
}

// The next 18 Dec (this year's, unless it has passed) to 5 Jan after it.
function winterTrip(today) {
  const year = Number(today.slice(0, 4))
  const start = today <= `${year}-12-18` ? `${year}-12-18` : `${year + 1}-12-18`
  return { id: 'w_trip', title: 'Winter trip', startDay: start, endDay: `${Number(start.slice(0, 4)) + 1}-01-05` }
}

// A whole planner. `random` returns numbers in [0, 1); tests pass a
// fixed one so the result is always the same.
export function buildSeed(today, random = Math.random) {
  const monday = startOfWeek(today)
  const thursday = addDays(monday, 3)

  const areas = AREAS.map(([id, name, categoryId, status, hours]) =>
    migrateArea({ id: id, name: name, categoryId: categoryId, status: status, monthlyBudgetHours: hours }),
  )
  areas.find((area) => area.id === 'a_rk').outcome = 'Exhibit running on a touch screen at NAVET'
  Object.assign(areas.find((area) => area.id === 'a_rk'), { startDay: addDays(monday, -40), endDay: addDays(monday, 13) })
  Object.assign(areas.find((area) => area.id === 'a_dm'), { startDay: addDays(monday, -20), endDay: addDays(monday, 25) })

  const templates = RULES.map(([id, title, areaId, categoryId, weekday, at, minutes]) => ({
    id: id,
    title: title,
    areaId: areaId,
    categoryId: categoryId,
    repeat: 'weekly',
    weekday: weekday,
    time: at,
    durationMin: minutes,
    fixed: true,
  }))

  const tasks = [
    // This week.
    task('s_exhibit', { title: 'Exhibit wiring', areaId: 'a_rk', start: makeStart(addDays(monday, 1), '13:00'), durationMin: 120, priority: true }),
    task('s_rocky', { title: 'Rocky user test plan', areaId: 'a_dm', categoryId: 'classes', day: addDays(monday, 2), durationMin: 90 }),
    // The clash: overlaps Thursday's lab (10:00–13:00).
    task('s_call', { title: 'Call with NAVET', areaId: 'a_rk', categoryId: 'appointments', start: makeStart(thursday, '11:30'), durationMin: 60, fixed: true }),
    task('s_cv', { title: 'Update CV', areaId: 'a_int', categoryId: 'personal', start: makeStart(addDays(monday, 4), '14:00'), durationMin: 60 }),
    task('s_case', { title: 'Portfolio case study', areaId: 'a_pf', day: addDays(monday, 5), durationMin: 180 }),
    task('s_admin', { title: 'Pay rent, CSN', areaId: 'a_admin', categoryId: 'chores', day: addDays(monday, 6), durationMin: 30 }),
    // Waiting to be placed.
    task('s_robot', { title: 'Desk robot gearbox', areaId: 'a_robot', durationMin: 180, rolled: 3 }),
    task('s_text', { title: 'Write exhibit text', areaId: 'a_rk', durationMin: 300, due: addDays(today, 6), priority: true }),
    task('s_apply', { title: 'Spotify application', areaId: 'a_int', categoryId: 'personal', durationMin: 240, due: addDays(today, 11) }),
  ].map((item) => (item.start ? { ...item, day: item.start.slice(0, 10) } : item))

  // This week's tasks on days already gone were done, and took a little
  // longer than planned (so "Estimates vs reality" has something to say).
  const doneEntries = []
  for (const item of tasks) {
    if (!item.day || item.day >= today || item.fixed) continue
    item.status = 'done'
    item.doneAt = makeStart(item.day, '18:00')
    const minutes = Math.round((item.durationMin * 1.3) / 15) * 15
    doneEntries.push({
      id: `e_done_${item.id}`,
      taskId: item.id,
      areaId: item.areaId,
      categoryId: item.categoryId,
      label: item.title,
      start: makeStart(item.day, '19:00'),
      end: makeStart(item.day, time(19 * 60 + minutes)),
      source: 'timer',
    })
  }

  // About 40 days of tracked time, a few blocks a day.
  const totalWeight = WORK.reduce((sum, item) => sum + item[3], 0)
  const entries = []
  for (let ago = 40; ago >= 1; ago--) {
    const day = addDays(today, -ago)
    let at = 8 * 60 + Math.floor(random() * 4) * 15
    const blocks = 1 + Math.floor(random() * 4)

    for (let index = 0; index < blocks && at < 21 * 60; index++) {
      let pick = random() * totalWeight
      const [areaId, categoryId, label] = WORK.find((item) => (pick -= item[3]) < 0) ?? WORK[0]
      const minutes = 30 + Math.floor(random() * 7) * 15

      entries.push({
        id: `e_seed_${ago}_${index}`,
        taskId: null,
        areaId: areaId,
        categoryId: categoryId,
        label: label,
        start: makeStart(day, time(at)),
        end: makeStart(day, time(Math.min(at + minutes, 23 * 60 + 45))),
        source: random() < 0.8 ? 'timer' : 'manual',
      })
      at += minutes + 30
    }
  }

  return {
    tasks: tasks,
    templates: templates,
    skipped: [],
    collapsed: [],
    areas: areas,
    entries: [...entries, ...doneEntries],
    activeTimer: null,
    away: [winterTrip(today)],
    settings: { capacity: { weekday: 8, weekend: 4 }, activeAreaLimit: 5, rolloverEnabled: true },
  }
}
