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