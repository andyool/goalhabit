# GoalHabit

A discipline app for goals and habits, modelled on [Pattrn](https://pattrn.io). You set SMART goals, link them to daily habits, and track how consistent you are. Scores include a daily **Focus Score**, a **Precision Rate** for each habit and a **Locked-In Score**.

It's a mobile-first installable web app (PWA). All data stays on the device.

## Features

| Area | What you get |
| --- | --- |
| **Today** | Week strip with a daily completion ring; Focus Score hero; live Locked-In timer (days, hours, minutes); habits grouped by time of day with one-tap check-off or amount logging; mood and energy check-in; top suggestion; goals carousel |
| **Goals** | SMART goal builder with templates and a live S/M/A/R/T checklist; numeric goals (cumulative, or measurement such as body weight) or milestone goals; deadlines, pace tracking (on track / behind / off track / overdue), projected finish date, progress chart, progress log |
| **Habits** | Daily, specific weekdays, or flexible N× per week; amount targets with units; unit linking so logged amounts count toward a goal; reminders; **Improvement Mode**, which scales targets up after a week at 90% or better and down after a week under 50%; streaks, heatmap, 14-day and weekday charts, target history |
| **Insights** | Focus Score trend, blue consistency heatmap, precision ranking, rule-based suggestions (one-tap fixes), Deep Analysis (trends, patterns, tips), best weekdays, peak hours, mood/energy correlations |
| **Growth** | Weekly review ritual, challenges (75 Soft, Monk Mode, 5AM Club and more), lessons on discipline, XP and levels, activity feed |
| **App** | Dark and light themes, desktop sidebar layout, offline service worker, notifications, JSON export/import, demo data |

### How the scores work

- **Day completion**: the average of `min(1, logged / target)` over the habits due that day. Partial progress counts.
- **Focus Score** (0–100): 70% of today's completion plus 30% momentum from the previous six days.
- **Precision Rate**: how closely a habit hits its intended rhythm. Flexible weekly habits are measured against a prorated weekly quota.
- **Locked-In Score**: time since the current run of days with at least 70% completion began. Rest days bridge the run, and today stays open until it ends. Precision over perfection: one miss doesn't erase months of work.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for the scoring engine
npm run build      # production build in dist/
```

On first launch, go through onboarding, or choose **Explore with demo data** to get 70 days of realistic history.

Every feature is available from the start — no plans, no paywall, no AI, no accounts.

## Put it on your phone

The included GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and publishes the app to GitHub Pages on every push.

1. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Actions → Deploy to GitHub Pages → Run workflow** (or just push a commit).
3. Open `https://<your-username>.github.io/goalhabit/` on your phone.
4. iPhone (Safari): **Share → Add to Home Screen**. Android (Chrome): **⋮ → Add to Home screen / Install app**.

## Project structure

```
src/
  lib/          data model, store (zustand + localStorage), scoring engine, insight and suggestion rules
  components/   UI kit, charts (SVG), list items, bottom sheets (forms, logging)
  screens/      Today, Goals, GoalDetail, HabitDetail, Insights, Profile, Review, Challenges, Learn, Settings, Onboarding
public/         PWA manifest, service worker, icons
```

To rebrand, change `APP_NAME` in `src/lib/brand.ts` (and the name in `index.html` / `public/manifest.webmanifest`).
