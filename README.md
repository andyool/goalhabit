# GoalHabit

A discipline app for goals and habits, modelled on [Pattrn](https://pattrn.io). You set SMART goals, link them to daily habits, and track how consistent you are. Scores include a daily **Focus Score**, a **Precision Rate** for each habit and a **Locked-In Score**. An AI **Agent** runs on Claude and can plan and adjust your system for you.

It's a mobile-first installable web app (PWA). All data stays on the device.

## Features

| Area | What you get |
| --- | --- |
| **Today** | Week strip with a daily completion ring; Focus Score hero; live Locked-In timer (days, hours, minutes); habits grouped by time of day with one-tap check-off or amount logging; mood and energy check-in; top Agent suggestion; goals carousel |
| **Goals** | SMART goal builder with templates and a live S/M/A/R/T checklist; numeric goals (cumulative, or measurement such as body weight) or milestone goals; deadlines, pace tracking (on track / behind / off track / overdue), projected finish date, progress chart, progress log |
| **Habits** | Daily, specific weekdays, or flexible N× per week; amount targets with units; unit linking so logged amounts count toward a goal; reminders; **Improvement Mode**, which scales targets up after a week at 90% or better and down after a week under 50%; streaks, heatmap, 14-day and weekday charts, target history |
| **Insights** | Focus Score trend, blue consistency heatmap, precision ranking, Agent actions (one-tap fixes), Deep Analysis (trends, patterns, tips), best weekdays, peak hours, mood/energy correlations |
| **Agent** | Chat with Claude, which can see your stats and act through tools: create goals and habits, change targets and schedules, add or complete milestones, log progress |
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

### AI Agent

Every feature is available from the start, with no plans or paywall. The Agent only needs an Anthropic API key. Add the key in **Settings → AI Agent** or on the Agent tab. The key is stored only in the browser and requests go directly to the Anthropic API. The default model is Claude Opus 5, and you can switch to Sonnet 5 or Haiku 4.5.

## Project structure

```
src/
  lib/          data model, store (zustand + localStorage), scoring engine, insights/agent rules, Claude client
  components/   UI kit, charts (SVG), list items, bottom sheets (forms, logging)
  screens/      Today, Goals, GoalDetail, HabitDetail, Insights, Coach, Profile, Review, Challenges, Learn, Settings, Onboarding
public/         PWA manifest, service worker, icons
```

To rebrand, change `APP_NAME` in `src/lib/brand.ts` (and the name in `index.html` / `public/manifest.webmanifest`).
