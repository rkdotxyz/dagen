# Dagen Horizon: product and tech spec

**For:** Claude Code, working in `rkdotxyz/dagen`
**Goal:** turn Dagen from a one-day task list into a planner that works across four horizons (day, week, month, quarter) and tracks where time actually goes.
**Reference:** the "Horizon" prototype (a single HTML page) that this spec describes in words. Nothing in this spec depends on seeing it.
**Version target:** v3.0, built as Phases 11–17, one pull request per phase.

---

## 0. How to use this document (read first, Claude Code)

1. Save this file as `docs/horizon-spec.md` in the repo and read it in full before writing any code.
2. Work **one phase at a time** (section 9). For each phase:
   - Create a branch named `phase-11-areas` etc. from `main`.
   - Implement only that phase's scope. Do not start the next phase.
   - Run `npm run check` (lint + test + build). It must pass with `--deny-warnings`.
   - Add a build-log entry to `docs/build-log.md` in the existing format (What I did / What broke and how I fixed it / Learned / Checklist). Leave "What broke" as `(fill in)` if nothing did. RK fills in the learning notes himself.
   - Update the roadmap in `README.md`.
   - Open a PR. Stop and summarise what changed and what to test by hand.
3. Keep the house style of this codebase, which is a learning project:
   - Every file opens with a block comment that explains what it's for in plain words.
   - Logic lives in plain, tested functions in `src/lib/`. Components draw and report events upwards; they don't own rules.
   - Comments explain *why*, in short sentences, for someone learning React.
   - Use `drawably` controls for UI, like the existing components.
   - No new runtime dependencies unless this spec names one. Ask first otherwise.
4. Existing behaviour must keep working at every phase: Google sign-in, cloud save, Google Calendar push and pull, recurring chores, clash warnings, busy calendars, PWA install. When a test fails because behaviour changed **on purpose**, update the test and say so in the PR.
5. If something in this spec contradicts the code, the code wins for *how* things work today. Raise it in the PR description rather than guessing.

---

## 1. Why

Dagen today answers "what's on today, at what time?". RK is involved in around 20 things at once: KTH courses, a group project, an exhibit, side projects, an internship search, freelance work, learning, and life admin. He needs to:

1. **Plan better** across day, week, month and quarter. Some things have hard times (classes, a crit, a flight). Some have deadlines but no fixed time. Some have neither but still matter.
2. **Track where time goes**, with almost no effort.
3. **See the big picture**: which areas are getting time, which are being neglected, and whether the plan was realistic.

---

## 2. Core ideas (the product in nine lines)

1. **Hard things first, soft things fill what's left.** Fixed events take capacity before anything else. Flexible tasks can only use the hours that remain.
2. **Three kinds of item:** *fixed* (happens at a set time), *deadline* (due by a date), and *open* (no date but still matters).
3. **A start-by date for every deadline.** It's worked out from the estimate, so the warning comes before the deadline, not on it.
4. **Unplaced tasks stay visible.** Tasks don't need a day. Tasks with no day sit in a "To place" list until you give them one.
5. **Rollover with a count.** An unfinished flexible task from a past day goes back to "To place" and its "pushed" counter goes up. At 3, Dagen offers *Halve it* or *Drop it*.
6. **Areas, triaged each quarter.** Each thing you're involved in is an Area, set to *active* (push forward, aim for 5 at most), *maintain* (keep ticking) or *paused* (on purpose).
7. **One timer.** Starting a task stops whatever was running. Every stop saves a time entry. Forgotten time can be logged afterwards, or a finished block can be "logged as planned" in one tap.
8. **Plan flows down, time rolls up.** Quarter outcomes → monthly hour budgets → the weekly plan → daily blocks. Time entries add up the other way into insights.
9. **Insights compare what you planned with what you actually tracked.**

---

## 3. What exists today (relevant facts from the code)

| Piece | Where | Notes for this work |
|---|---|---|
| Tasks | `App.jsx` state, saved by `storage.js` | `{ id, categoryId, title, start: "YYYY-MM-DDTHH:MM", durationMin, tentative, status: "todo"\|"done", templateId? }`. **Every task has a `start` today.** |
| Categories | `config.js` | 8 fixed categories with `hex` and `googleColorId`. Google colours depend on these. **Keep them.** |
| Recurring chores | `recurring.js`, `TemplatePanel.jsx` | Templates make one task per day as days are opened. `skipped` holds deleted occurrences. |
| Clashes | `conflicts.js` | Overlap rule plus Google "busy" events. |
| Cloud | `cloud.js` + Supabase | One JSON row per user in table `planners`. `toPlanner` / `fromPlanner` whitelist the fields. |
| Google Calendar | `googleCalendar.js`, `calendarSync.js`, `incoming.js` | Push uses signature diffing. Pull only touches events tagged `dagenTaskId`. |
| Busy calendars | `busy.js`, `CalendarPicker.jsx` | Events from chosen calendars count as busy blocks for clashes. |
| UI | `drawably` sketch controls, blueprint theme in `index.css` | Phone-first PWA. |
| Dates | `dates.js` | Local-time helpers. Monday-first weeks. Quarter-hour snapping. |

The README roadmap still says "Phase 4 in progress". Correct it in Phase 11.

---

## 4. Data model

All new fields are **optional with safe defaults**, so old saves load unchanged. Add migrations in `storage.js` (local) and `cloud.js` `fromPlanner` (cloud), in the existing style.

### 4.1 Task (extended)

```js
{
  id, categoryId, title, status, tentative, templateId?,   // unchanged
  start: "2026-11-27T13:00" | null,   // CHANGED: null = not placed on a day yet
  day: "2026-11-27" | null,           // NEW: placed on a day with no time ("any time")
  durationMin: 90,                    // unchanged; for flexible tasks this is the estimate
  areaId: "a_rk" | null,              // NEW: which Area it belongs to
  fixed: false,                       // NEW: true = hard time, never rolls over
  due: "2026-12-08" | null,           // NEW: deadline (a day)
  priority: false,                    // NEW: shows on the week's priorities list
  rolled: 0,                          // NEW: times it was pushed back to "To place"
  doneAt: "2026-11-27T15:10" | null,  // NEW: set when ticked, for insights
}
```

**Placement rules.** A task is in exactly one of three states:

| State | `start` | `day` | Shown in |
|---|---|---|---|
| Timed | set | derived from `start`, keep in sync | Day/Week grids at its time |
| Any time on a day | `null` | set | That day's "Any time" area |
| Unplaced | `null` | `null` | "To place" list |

Add a helper `placementOf(task)` returning `"timed" | "anytime" | "unplaced"`, and `dayOf(task)` returning the day or `null`. **Every place that calls `splitStart(task.start)` must go through these helpers**, because `start` can now be null. Known places: `App.jsx` (`byTime`, `dayMarkers`, the day filter, `deleteTask`), `conflicts.js`, `recurring.js`, `TaskItem.jsx`, `TaskForm.jsx`, `calendarSync.js`. Write a test for each with a null `start`.

**Migration:** existing tasks get `day` from their `start`, `areaId: null`, `fixed: false`, `due: null`, `priority: false`, `rolled: 0`, `doneAt: null`.

### 4.2 Area (new)

```js
{
  id: "a_rk",
  name: "Räckvidd (NAVET)",
  categoryId: "projects",              // sets its colour; uses the existing 8 categories
  status: "active" | "maintain" | "paused",
  monthlyBudgetHours: 20,              // planned hours per month (0 allowed)
  outcome: "Exhibit running on a touch screen at NAVET",  // quarter goal; for active Areas
  startDay: "2026-10-01" | null,       // optional, for the quarter timeline
  endDay: "2026-12-10" | null,
  createdAt, archived: false
}
```

Deleting an Area that has tasks or time entries: confirm in two steps, then set `archived: true` (keep history). Tasks keep their `areaId`, and the UI shows the archived name greyed out.

### 4.3 Time entry (new)

```js
{ id, areaId | null, taskId | null, categoryId, label, start: "2026-11-27T13:02", end: "2026-11-27T14:40", source: "timer" | "manual" | "as-planned" }
```

`categoryId` is copied in at save time, so insights still work if the task is deleted later.

### 4.4 Running timer (new, single)

```js
activeTimer: { taskId | null, areaId | null, label, startedAt: "2026-11-27T13:02:11.000Z" } | null
```

Saved with the planner, so it survives reloads and carries across devices. Shorter than 60 seconds on stop: discard and say so.

### 4.5 Away blocks (new)

```js
{ id, title: "Winter trip", startDay: "2026-12-18", endDay: "2027-01-05" }
```

Days inside an away block have **zero capacity** and get a "Lid on" / "Away" treatment in every view. These blocks are **not** pushed to Google in v3.0.

### 4.6 Settings (new)

```js
settings: {
  capacity: { weekday: 8, weekend: 4 },   // free hours per day before fixed items
  activeAreaLimit: 5,                     // warns above this, doesn't block
  rolloverEnabled: true
}
```

### 4.7 Cloud shape

Extend `toPlanner` / `fromPlanner` with `areas`, `entries`, `activeTimer`, `away` and `settings`. It stays one row. Keep the whitelist approach. `fromPlanner` must default every missing field. No Supabase schema change is needed (`data` is JSON).

Size check: a time entry is about 150 bytes, and 10 a day comes to roughly 550 KB a year. That's fine for one row for now. Add a TODO note in `cloud.js` about archiving entries older than 18 months later.

---

## 5. Rules (pure functions in `src/lib/`, all unit-tested)

### 5.1 `capacity.js`
- `baseHours(day, settings)`: weekday or weekend capacity.
- `isAway(day, away)`.
- `fixedHours(day, tasks, busyBlocks)`: total length of `fixed` tasks plus busy Google events that day. Overlapping blocks are counted once (merge the intervals).
- `plannedHours(day, tasks)`: estimates of non-fixed tasks placed on that day (timed or any time), excluding done ones.
- `freeHours(day, …)` = `away ? 0 : base − fixed − planned`. This can be negative, which means overpacked.
- `weekSummary(weekStart, …)` and `monthSummary(monthStart, …)`: totals and the overpacked days.

### 5.2 `deadlines.js`
- `startBy(task)` = `due − (ceil(durationMin / 120) + 1)` days. It assumes about 2 hours a day on a task, plus one day of buffer. Put both numbers in `config.js` (`HOURS_PER_DAY_ON_TASK = 2`, `START_BUFFER_DAYS = 1`).
- `deadlineState(task, today)`: `"overdue"` (due < today), `"start-now"` (startBy ≤ today), `"upcoming"`, or `"none"`.

### 5.3 `rollover.js`
- `rollOver(tasks, today)`: every task that is **not done, not fixed, has no `templateId`**, and is placed on a day before today becomes unplaced (`start = null`, `day = null`) with `rolled + 1`.
  - Recurring chores don't roll over. Missed is missed, as today.
  - Runs once when the app opens and when the date changes while it's open (check on `focus`).
  - Returns the same array if nothing changed, so React doesn't redraw.
- A rolled task leaves Google Calendar through the normal sync, because unplaced tasks aren't sent (5.6).

### 5.4 `timer.js`
- `startTimer(state, { taskId, areaId, label }, now)`: stops any running timer first, saving its entry, then starts the new one.
- `stopTimer(state, now)`: returns `{ state, entry | null, discarded: boolean }`.
- `logAsPlanned(task, day)`: makes an entry from the task's planned time and length (`source: "as-planned"`).
- `isLogged(task, day, entries)`: true if any entry has this `taskId` on that day.

### 5.5 `insights.js`
For a range `[from, to]`, where *planned* only counts days up to today:
- `planned` by category and by Area: fixed and flexible items on placed days.
- `tracked` by category and by Area: time entries, plus the running timer up to now.
- `budgetVsActual(areas, entries, range)`: monthly budget scaled to the range (`× days / 30.4`).
- `mostBehind`: the active Area with the lowest actual ÷ budget.
- `longestUntouched`: the non-paused Area with the most days since its last entry.
- `pausedButUsed`: paused Areas that still have time entries in the range.
- `estimateAccuracy`: for done tasks that have entries, total tracked ÷ total estimated. `null` if there's no data.
- `areasPerDay(lastNDays)`: how many different Areas got time each day, as a signal of context switching.
- `balanceScore`: `100 − (sum of |actual share − planned share| per category) × 100 / 1.2`, clamped to 0–100.

### 5.6 Google Calendar sync changes
- `planSync` **skips tasks without `start`**. If such a task was sent before, plan a delete. That's how unplacing and rollover remove the event.
- `signatureOf` is unchanged for timed tasks.
- Fixed tasks are pushed like any other (opaque). Flexible tasks keep the existing tentative/transparent rules.
- `applyIncoming`: if an incoming event belongs to a task that is now unplaced, ignore it.
- Time entries are **not** pushed to Google in v3.0.

### 5.7 Busy calendars as fixed time
Busy events already feed clashes. They now also feed `fixedHours`, so lectures in RK's KTH calendar take capacity automatically. Today busy events are fetched for the selected day only. Fetch the visible **week** for the Week view and the visible **month** for the Month view. Cache by calendar and range in memory, and don't save them.

---

## 6. Screens

Navigation: a bottom tab bar on phones, and the same tabs as a top or side bar from 900px up. The tabs are **Day · Week · Month · Quarter · Insights**, plus **Areas** in a menu or as a sixth tab. Each tab remembers its own position (which week, which month). Use the URL hash for the tab (`#week`) so the PWA reopens where you left it.

A **Now bar** stays on every screen (sticky): the running timer's label, its Area colour dot, an elapsed clock (`HH:MM:SS`, updating every second) and **Stop**. With nothing running it shows **Resume last** and **Log time**.

A global **+ Add** opens one form with a choice of Task or Fixed event. Keyboard shortcut: `N` (desktop).

### 6.1 Day (evolves today's home screen)
- Keep the week strip, swipe, and Today.
- The title states the finding: "Friday is overpacked by 0.5h", or "Friday · 3h free".
- A day capacity bar shows fixed time, planned tasks and free time.
- Schedule list with large times on the left. Each row has a tick (tasks), the title, its Area and length, a clash warning, and **Start** or "running".
- Past blocks with nothing logged get **Log as planned**.
- An "Any time" group for tasks placed on the day with no time.
- A **Time log** card lists the day's time entries (edit or delete each) and has **+ Log time**.
- The category sections stay available as a "By category" toggle. Default to the time-ordered schedule, which matches the prototype better. Keep the old view one tap away so nothing is lost.

### 6.2 Week (new, the main planning screen)
- Title: "Week 48 has 6h of slack" or "Thursday is overpacked".
  Sub-line: dates · fixed hours · planned hours · number of clashes.
- **Seven day columns** (wide screens) or **seven stacked day cards** (phones). Each shows:
  - The header: day name and date, plus "3.5h free" or "over 2h" in red.
  - Fixed items (marked clearly, e.g. a dark band or hatching), then flexible tasks, in time order. Then any-time tasks.
  - Done tasks are dimmed and struck through. A thin "now" line shows on today.
  - Away days show a covered card: "Away · Winter trip".
- Tap a block to edit it. Tap ▶ to start its timer.
- **Side panel, or a sheet on phones:**
  - **Priorities this week:** priority tasks that are placed this week or due within 14 days, plus priority fixed events in the next 14 days. Five at most.
  - **To place:** unplaced, undone tasks sorted by start-by date, then by priority, then by `rolled`. Each row shows the Area dot, the estimate, a pill (`start now` / `start by Thu 3 Dec` / `overdue` / `pushed 2×`) and a **Place on…** day picker (today onward). Tasks pushed 3 times or more also get **Halve it** (estimate ÷ 2, `rolled` back to 0) and **Drop** (delete, with Undo).
- **Desktop extra:** drag a task from To place onto a day column. Use the drop position for the time, snapped to 30 minutes, or drop in the any-time zone. Dragging back to To place unplaces it. On touch, the day picker does the same job; don't build touch drag.

### 6.3 Month (new)
- Title: "December has 84h free" or "3 overpacked days in December".
  Sub-line: planned hours · deadlines this month · tracked so far.
- A **calendar grid** (Mon–Sun). Each day cell shows the date, up to two labels (one-off fixed events, priorities, "Due: …" for deadlines), away shading, and a red edge when overpacked. Tap a cell to open that day.
- **Monthly hour budgets panel:** every non-paused Area with − / + (1h steps) on `monthlyBudgetHours`. A bar shows total budgets against the month's free hours, with the message "Over by 12h. Lower a budget or pause an Area." or "8h unbudgeted. Keep some slack."
- Weekly recurring items are left out of the cell labels to keep it readable. Say so in a caption.

### 6.4 Quarter (new)
- A rolling three months starting from the current month, with ‹ › to shift by three.
- Title: "6 active Areas this quarter, more than 5" when over the limit. Otherwise: "N active Areas this quarter".
- **Triage board:** three columns, *Active · Maintain · Paused*, each holding Area chips. Tapping a chip cycles its status. On desktop, dragging between columns is optional.
- **Timeline:** months across, with week ticks. One lane per Area that has `startDay`/`endDay` or dated items in the range. Each lane shows a bar from start to end, round markers for deadlines, square markers for one-off fixed events, hatched bands for away blocks across all lanes, and a "today" line. Labels must not overlap. Truncate them, or flip a label to the left of its marker when there's no room on the right. On phones, scroll sideways inside the timeline only.
- **Outcomes:** one row per active Area with its outcome text (or a prompt to write one), tracked hours vs `monthlyBudgetHours × 3`, and Edit.

### 6.5 Insights (new)
- A **Week / Month / Quarter** switch, for the current period.
- Title: the finding, e.g. "November went to study and making; career got 7%".
- Stat tiles: Most behind plan · Untouched longest · Estimates vs reality ("1.4×") · Paused but still used.
- A **split by category:** one stacked bar with a legend showing hours and percentages.
- **Planned vs actual by Area:** one row each, the planned budget as an outline and tracked time as a fill, with "6.5 / 10h". The number is red under 50%.
- **Areas touched per day:** small bars for the last 14 days, highlighted at 6 or more.
- **Where the hours went:** the top 5 labels by tracked time.

### 6.6 Areas and settings (new)
- An Areas table: name, category dot, status, budget per month, last worked on ("3d ago" / "never"), and Edit. **+ Area**.
- Free hours per day (weekday, weekend), rollover on/off, and the active Area limit.
- Away blocks: list, add, edit, delete.
- Data: **Copy as JSON** (clipboard) and **Import JSON** (paste, validate, replace with Undo).

### 6.7 The add/edit form (evolve `TaskForm.jsx`)
- Fields: title · Area (grouped by category; picking an Area sets the category) · kind (**Task** or **Fixed event**) · day (optional for tasks) · time (optional for tasks, required for fixed) · duration or estimate (the existing chips plus a free number) · deadline (tasks) · priority · tentative (unchanged) · done (when editing).
- Recurring fixed events keep using templates (`TemplatePanel`). Allow `fixed: true` and `areaId` on templates, so "KTH lecture, Tue 10:00" makes fixed tasks.
- Keep the clash warning and the +15m / +1h / Tomorrow chips.
- **Delete** with Undo (a toast for 6 seconds). For a task made from a template, keep the existing "skip this day" behaviour.
- Validation messages appear inline under the field: "Add a title first.", "Fixed events need a start time.", "Estimate must be more than 0."

---

## 7. Visual direction

- **Keep Dagen's identity**: the blueprint paper, the drawably pen, and the category colours from `config.js`. Horizon's layouts slot into it. Don't port the prototype's purple theme.
- Fixed items must look different from flexible ones without relying on colour: hatching, a solid band, or a lock glyph from the pen font (check that the glyph exists).
- Warnings (overpacked, overdue, clash) use the existing `--warn`.
- Every interactive target is at least 44px. Every view must work at 360px wide. Wide content (the week columns, the quarter timeline) scrolls inside its own container, never the page.
- Accessible names on every icon-only button, following the existing test pattern.
- Respect `prefers-reduced-motion`.

---

## 8. Non-goals for v3.0

- Pushing time entries or away blocks to Google Calendar.
- Notifications or reminders.
- Shared or multi-user planners.
- AI suggestions for the week (the bones are there; later).
- The "What's on your plate" plate/bento visuals. They're a possible v4 skin over the same data model.

---

## 9. Phases

Each phase is one PR. Each must pass `npm run check` and keep all existing features working.

### Phase 11: Data model, Areas, unplaced tasks (v2.1)
- Everything in section 4, the migrations, and the `placementOf` / `dayOf` helpers. Make every `splitStart(task.start)` site null-safe.
- `planSync` skips unplaced tasks and deletes their events (5.6).
- Areas CRUD screen (6.6, without away blocks and data tools yet).
- An Area picker in the task form.
- Fix the README roadmap and add Phases 11–17.
- **Tests:** migrations (old task, old cloud row), placement helpers, null-start safety in conflicts, recurring and planSync, plus Area CRUD behaviour.
- **Done when:** old data loads unchanged, tasks can be saved without a day, and Google never gets an event for an unplaced task.

### Phase 12: Week view, To place, rollover, deadlines (v2.2)
- `capacity.js`, `deadlines.js`, `rollover.js`.
- Tab navigation with hash routing (Day, Week; others greyed out as "coming soon").
- The Week screen (6.2), including priorities, To place, Place on…, Halve it / Drop, and the overpacked headline.
- The Day title and capacity bar (6.1).
- Busy calendars fetched for the whole week (5.7).
- **Tests:** capacity maths (interval merge, away days, negative free), start-by and deadline states, rollover (skips fixed, done and template tasks; is idempotent), the week headline text.
- **Done when:** RK can plan a week, see which days are overpacked, and unfinished work comes back as "pushed 1×" the next morning.

### Phase 13: Timer and time log (v2.3)
- `timer.js`, the Now bar, Start on every block, Stop / Resume last, Log time (manual), Log as planned, and the day's time log with edit and delete.
- Save `activeTimer` and `entries` to local storage and the cloud.
- **Tests:** a new start stops the old timer, under 60s is discarded, timers survive a reload, log-as-planned is only offered once.
- **Done when:** a running timer survives closing the app, and every stop creates exactly one entry.

### Phase 14: Month view and budgets (v2.4)
- The Month screen (6.3) and the budgets panel. Busy calendars fetched for the month.
- **Tests:** month free hours, budget totals and the over/under message, deadline labels on the right day.

### Phase 15: Quarter view (v2.5)
- The Quarter screen (6.4): the triage board, the timeline with collision-free labels, and outcomes.
- Away blocks UI (in Areas and settings) and `isAway` across all views.
- **Tests:** status cycling, which lanes get included, the label-placement function (pure: given marker x positions and label widths, it returns positions or hides labels).

### Phase 16: Insights (v2.6)
- `insights.js` and the Insights screen (6.5).
- **Tests:** every metric with fixed fixtures, including empty data, which shows "—" with a hint and never `NaN`.

### Phase 17: Polish and release (v3.0)
- Undo toasts everywhere something is deleted. Copy/Import JSON. The `N` shortcut. The empty state for a brand-new user ("Start by adding your Areas"). Reduced-motion pass. A 360px pass.
- Update the PWA manifest description to "Plan the day, the week and the quarter."
- README: features, screenshots, roadmap ticked. Build-log entry. Tag `v3.0`.

---

## 10. Sample data for manual testing (optional dev seed)

Add `src/lib/devSeed.js`, loaded **only** when the URL has `?seed=horizon` and only in dev builds (`import.meta.env.DEV`). It's never used in production. Use RK's real Areas so testing feels real. Dates are relative to today.

| Area | Category | Status | Budget/month |
|---|---|---|---|
| KTH courses | classes | active | 30 |
| DM2601 · Rocky | classes | active | 22 |
| Räckvidd (NAVET) | projects | active | 20 |
| Internship search | personal | active | 10 |
| Portfolio site | projects | active | 8 |
| Winter trip planning | personal | active | 5 |
| Swedish | learning | maintain | 8 |
| Detent library | projects | maintain | 6 |
| Desk robot | projects | maintain | 4 |
| Fusion 360 | learning | maintain | 3 |
| OnGem freelance | projects | maintain | 4 |
| Admin and errands | chores | maintain | 4 |
| Gesture bloom | projects | paused | 0 |

Include:
- Weekly fixed templates: DM2601 studio Mon and Fri 09:00 (3h), KTH lecture Tue 10:00 (2h), KTH lab Thu 10:00 (3h), Swedish class Mon 17:15 and Fri 16:00 (1.5h).
- One overlap on Thursday, to show a clash.
- Five or six tasks for this week.
- Unplaced tasks: one with `rolled: 3`, and two with deadlines 6 and 11 days out.
- An away block "Winter trip", 18 Dec – 5 Jan.
- About 40 days of random past time entries, so Insights has data.

---

## 11. Acceptance checklist for v3.0

- [ ] Old local and cloud data load with nothing lost.
- [ ] A task can exist with no day, appear in To place, and never reach Google Calendar.
- [ ] Unfinished flexible tasks roll over each morning with a visible "pushed N×". Fixed, done and recurring ones never roll over.
- [ ] Every deadline task shows start now / start by / overdue correctly.
- [ ] Week and Month correctly flag overpacked days, counting busy Google events.
- [ ] One timer at a time. It survives reloads and syncs through the cloud.
- [ ] Insights numbers match hand-calculated fixtures.
- [ ] Every view works at 360px, with no page-level sideways scroll.
- [ ] `npm run check` passes and CI is green.
- [ ] README and build log are updated, and `v3.0` is tagged.

---

## 12. Open questions for RK (Claude Code: ask, don't assume)

1. **Areas vs categories:** this spec keeps the 8 categories (they drive Google colours) and adds Areas underneath. Is that right, or should the categories be replaced by life areas (study, career, making, life)?
2. **Rollover:** automatic every morning (the spec's default), or a morning prompt asking "4 tasks didn't happen. Move them to To place?"
3. **Busy calendars as fixed time:** should every chosen busy calendar count against capacity, or only some?
4. **Time entries in Google:** keep them out (the spec's default), or write them to a separate "Dagen log" calendar later?

### Answers (RK, 2026-11-27)

1. **Areas vs categories:** keep the 8 categories (they drive Google colours) and add Areas underneath. As written.
2. **Rollover:** a **morning prompt**, not automatic. Dagen asks "4 tasks didn't happen. Move them to To place?" and only moves them on a yes. `rollOver()` stays a pure function; Phase 12 calls it from the prompt instead of on open.
3. **Busy calendars as fixed time:** **every** chosen busy calendar counts against capacity. No per-calendar switch.
4. **Time entries in Google:** not asked yet. Keeping the spec's default (out of Google in v3.0), which is a non-goal anyway.
