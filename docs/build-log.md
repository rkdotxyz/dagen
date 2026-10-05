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