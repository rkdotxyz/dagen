# Dagen build log

## Phase 0: Setup (v0.1)

**Date:** 2026-09-22

**What I did**
- Installed VS Code and Node.js LTS
- Created the project with Vite 8 (React template) inside an existing `dagen` folder using `npm create vite@latest . -- --template react`
- Replaced the starter page with "Dagen" and today's date; colour tokens with dark mode
- Git: first commit, published to GitHub from VS Code
- Connected the repo to Vercel: every push to main publishes the site

**Results**
- Dev server runs at localhost:5173
- Site opens on my phone from the vercel.app link

**What broke and how I fixed it**
- Nothing broke. Chose Oxlint as the linter (default).

**Learned**
- Git can run in a second terminal while the dev server keeps running
- VS Code's Publish Branch creates the GitHub repo, so there's no need to make it by hand

**Checklist**
- [x] Page shows Dagen and today's date locally and on phone
- [x] Code on GitHub
- [x] Committed and tagged v0.1


## Phase 2: Automated checks (v0.3)

**Date:** 2026-09-22

**What I did**
- Added Vitest, jsdom and Testing Library; 3 unit tests for storage and 6 behaviour tests for the task list
- New scripts: test, test:watch, and check (lint + test + build, the same as CI)
- Lint now fails on warnings (--deny-warnings)
- GitHub Actions workflow running lint, test and build on every pull request and on main
- Broke ticking on purpose to watch the check go red, then fixed it
- Ruleset on main: pull request required, checks must pass

**What broke and how I fixed it**
- npm test failed with "Invalid hook call" and all 6 App tests red. Cause: @testing-library/react was missing from the project, so Node found a copy outside the project that brought a second React with it. Fixed by installing the dev dependencies again.

**Learned**
- Two copies of React in one run breaks all hooks; `npm ls <package>` shows what's actually installed
- Tests only guard what they check: matching text ignores extra spaces, so a "trims spaces" test needed tightening to be real
- CI runs on a clean machine, which catches files you forgot to commit

**Checklist**
- [x] 9 tests pass locally and in CI
- [x] Saw the check go red, then green
- [x] Tagged v0.3


## Phase 3: Categories and colours (v0.4)

**Date:** 2026-10-01

**What I did**
- Added src/config.js: eight categories, each with a name, a hex colour and Google Calendar's colour id
- Home screen is now stacked collapsible sections, one per category, with a colour dot and a count of what's left
- Each section has its own +, so adding a task never means picking a category
- storage.js migrates tasks with no category, or an unknown one, to the default category
- Collapsed sections are remembered under their own storage key
- Rewrote App.test.jsx for the new behaviour; added config tests (unique ids, valid hex, Google colour ids 1-11)

**Results**
- 18 tests passing locally and in CI
- Phase 1 tasks reappeared under Personal instead of disappearing

**What broke and how I fixed it**
- CI failed on the pull request: the old App.test.jsx was still in place, so six tests looked for 'Task name', the single add box that no longer exists. Fixed by pasting in the rewritten test file and pushing again.

**Learned**
- Grouping is a view, not a second copy: one list of tasks, each section gets tasks.filter(...)
- Data you edit by hand deserves tests too; a typo in a colour now fails a check
- When behaviour changes on purpose, its tests change with it. A red test can mean "update me", not only "fix the app"
- within(...) in tests searches inside one section, which is how you prove a task landed in the right place

**Checklist**
- [x] Eight coloured sections, each with its own +
- [x] Folding remembered after a reload
- [x] Old tasks rescued into Personal
- [x] Merged via PR, tagged v0.4


## Phase 5: Week strip and task actions (v0.6)

**Date:** 2026-10-05

**What I did**
- Monday-first week strip with arrows, a Today button, swipe, and dots for days with tasks or clashes
- Sections now show one day at a time; new tasks default to the day being viewed
- TaskForm does double duty: add, or edit an existing task with +15m / +1h / Tomorrow chips
- shiftStart moves a task across midnight correctly

**What broke and how I fixed it**
- (fill in)

**Learned**
- (getDay() + 6) % 7 is the whole Monday-first convention
- useRef holds a value between redraws without causing one, which is right for a swipe position
- Accessible names carry meaning: the day buttons are named "Tomorrow, 2 tasks, has a clash", and the tests read the same name a screen reader would
- Touch events travel upwards, so the swipe handlers belong on the whole strip

**Checklist**
- [x] Week strip, day filtering, editing
- [x] 69 tests passing
- [x] Merged via PR, tagged v0.6


## Phase 11: Data model, Areas, unplaced tasks (v2.1)

**Date:** 2026-11-27

**What I did**
- Saved the Horizon spec as `docs/horizon-spec.md`, with my answers to its open questions (keep the 8 categories, rollover as a morning prompt, every busy calendar counts as fixed time)
- Tasks gained `day`, `areaId`, `fixed`, `due`, `priority`, `rolled` and `doneAt`. A task can now be timed, "any time" on a day, or unplaced (no day yet)
- New `placement.js` (`placementOf`, `dayOf`, `timeOf`, `withDay`). Every place that called `splitStart(task.start)` on a task now goes through it, because `start` can be null
- New `migrate.js`, shared by `storage.js` and `cloud.js`: old local saves and old cloud rows load with every field kept and the new ones defaulted. Cloud tasks are migrated too now (they weren't before)
- Areas, time entries, the running timer, away blocks and settings are saved locally and in the cloud row. Only Areas and settings have screens so far
- An Areas panel (header button): add, edit, delete, restore, last worked on, the active-Area limit warning, and the settings (free hours, active limit, rollover)
- Deleting an Area that tasks still use asks first, then archives it. Its name stays on old tasks, greyed out
- The task form has an Area picker (grouped by category; picking one sets the category), "Any time" in the time list, and a "No day yet" chip
- A simple "To place" list under the categories for tasks with no day
- Google Calendar: only timed tasks are sent. Unplacing a task deletes its event. Incoming changes for unplaced tasks are ignored, and an old event's "cancelled" can't delete a task that was placed again
- Ticking a task notes when (`doneAt`)
- README roadmap fixed (it still said Phase 4) and Phases 11–17 added

**What broke and how I fixed it**
- (fill in)
- Five storage and cloud tests failed because a saved task now loads back with extra fields. That was on purpose, so the tests changed from "exactly equal" to "everything kept"
- The Area form's "Hours per month must be 0 or more." never showed: the browser's own `min="0"` check blocked the submit first. Fixed with `noValidate`, so the inline message always shows

**Learned**
- (fill in)

**Checklist**
- [x] Old local and cloud data load unchanged (tests for both)
- [x] Tasks can be saved without a day, and survive a reload
- [x] Google never gets an event for an unplaced task
- [x] `npm run check` passes: 205 tests
- [ ] Merged via PR, tagged v2.1


## Between 11 and 12: shadcn/ui instead of drawably

**Date:** 2026-11-27

**What I did**
- Removed drawably (the hand-drawn controls and the blueprint theme)
- Added Tailwind CSS and shadcn/ui. Its components live in `src/components/ui/` as our own code: Button, Card, Input, NativeSelect, Badge, Checkbox, Switch, Label
- Neutral shadcn theme in `index.css`, light and dark following the system setting. Category colours stay as dots
- Real icons (lucide) for the arrows, +, edit and delete buttons, with the same accessible names
- `@/` path alias, `components.json` so `npx shadcn add <component>` works, and a test setup file for jsdom's missing ResizeObserver

**What broke and how I fixed it**
- (fill in)
- Every test with a checkbox or switch failed with "ResizeObserver is not defined": Radix measures its controls and jsdom can't. Fixed with a do-nothing stand-in in `src/test-setup.js`

**Learned**
- (fill in)

**Checklist**
- [x] No test needed changing: they find things by label and role, not by look
- [x] Works at 360px, light and dark
- [ ] Merged via PR
