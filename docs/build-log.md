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