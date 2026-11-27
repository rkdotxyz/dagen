# Dagen
![CI](https://github.com/rkdotxyz/dagen/actions/workflows/ci.yml/badge.svg)

*Dagen* is Swedish for "the day". A phone-friendly planner: tasks live in colour-coded categories and Areas, timed tasks appear in Google Calendar, and tasks without a day wait in a "To place" list.

**Status:** v2 is done (Phases 0–10). Now building **Dagen Horizon** (v3.0): planning across the day, week, month and quarter, and tracking where time goes. Phase 12 of 17: the Week view, To place, deadlines and the morning rollover. The full plan is in `docs/horizon-spec.md`.

## Run it locally

    npm install
    npm run dev

Then open http://localhost:5173

## Roadmap

- [x] Phase 0: Setup, GitHub and Vercel
- [x] Phase 1: Task list
- [x] Phase 2: Automated checks (GitHub Actions)
- [x] Phase 3: Categories and colours
- [x] Phase 4: The + create flow
- [x] Phase 5: Week strip and task actions
- [x] Phase 6: Recurring chores (v1.0)
- [x] Phase 7: Cloud and login
- [x] Phase 8: Push to Google Calendar
- [x] Phase 9: Two-way sync and busy calendars (v2.0)
- [x] Phase 10: Blueprint look with drawably
- [x] Plain shadcn/ui look in place of drawably, for now (the design comes later)

### Dagen Horizon (v3.0)

- [x] Phase 11: Data model, Areas, unplaced tasks (v2.1)
- [x] Phase 12: Week view, To place, rollover, deadlines (v2.2)
- [ ] Phase 13: Timer and time log (v2.3)
- [ ] Phase 14: Month view and budgets (v2.4)
- [ ] Phase 15: Quarter view and away blocks (v2.5)
- [ ] Phase 16: Insights (v2.6)
- [ ] Phase 17: Polish and release (v3.0)

See `docs/build-log.md` for how it's going.