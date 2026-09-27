/**
 * The on-device "agent": rule-based analysis that turns stats into patterns,
 * trends and one-tap actions. Works without an API key; the Claude coach
 * builds on top of it.
 */
import { addDays, diffDays, startOfWeek, todayKey, weekdayIndex, WEEKDAYS_LONG, type DateKey } from "./date";
import {
  averageFocus,
  completionHours,
  dayStats,
  goalCurrent,
  goalPace,
  goalProgress,
  LOCK_IN_THRESHOLD,
  precisionRate,
  targetOn,
  weekdayPerformance,
} from "./metrics";
import type { AppState, Goal, Habit, HabitSchedule, ID } from "./types";

export type SuggestionAction =
  | { type: "setTarget"; habitId: ID; target: number }
  | { type: "setSchedule"; habitId: ID; schedule: HabitSchedule }
  | { type: "enableImprovement"; habitId: ID }
  | { type: "newHabitForGoal"; goalId: ID }
  | { type: "openReview" }
  | { type: "openGoal"; goalId: ID };

export interface Suggestion {
  key: string;
  tone: "warn" | "info" | "good";
  icon: string;
  title: string;
  body: string;
  action?: { label: string; do: SuggestionAction };
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 }));

export function activeHabits(habits: Habit[]) {
  return habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order);
}

export function activeGoals(goals: Goal[]) {
  return goals.filter((g) => !g.archived).sort((a, b) => a.order - b.order);
}

/** Week start whose review is currently due (Sunday reviews this week, Monday reviews last week). */
export function reviewWeekDue(state: Pick<AppState, "reviews" | "habits">, today: DateKey = todayKey()): DateKey | null {
  const wd = weekdayIndex(today);
  if (wd !== 6 && wd !== 0) return null;
  const week = wd === 6 ? startOfWeek(today) : addDays(startOfWeek(today), -7);
  if (!state.habits.some((h) => h.createdAt <= addDays(week, 6))) return null;
  return state.reviews.some((r) => r.weekStart === week) ? null : week;
}

export function buildSuggestions(state: AppState, today: DateKey = todayKey()): Suggestion[] {
  const out: Suggestion[] = [];
  const habits = activeHabits(state.habits);
  const from14 = addDays(today, -14);
  const yesterday = addDays(today, -1);

  const reviewWeek = reviewWeekDue(state, today);
  if (reviewWeek) {
    out.push({
      key: `review-${reviewWeek}`,
      tone: "info",
      icon: "🔁",
      title: "Your weekly review is ready",
      body: "Take 3 minutes to look back at your week and choose one focus for the next.",
      action: { label: "Start review", do: { type: "openReview" } },
    });
  }

  for (const g of activeGoals(state.goals)) {
    const progress = goalProgress(g, state.habits, state.logs, today);
    const pace = goalPace(g, progress, today);
    if (pace.status !== "off-track" && pace.status !== "behind" && pace.status !== "overdue") continue;
    const linked = habits.filter((h) => h.goalId === g.id);
    if (!linked.length) {
      out.push({
        key: `goal-nohabit-${g.id}-${pace.status}`,
        tone: "warn",
        icon: g.emoji,
        title: `${g.title} is ${pace.status === "overdue" ? "overdue" : "off track"}`,
        body: `You're at ${pct(progress)} but should be near ${pct(pace.expected)}. Goals move when daily actions drive them — link a habit.`,
        action: { label: "Add linked habit", do: { type: "newHabitForGoal", goalId: g.id } },
      });
      continue;
    }
    const unitHabit = linked.find((h) => h.linkUnits && h.schedule.type === "daily");
    if (g.kind === "numeric" && g.tracking === "cumulative" && unitHabit && pace.daysLeft && pace.daysLeft > 0) {
      const remaining = g.targetValue - goalCurrent(g, state.habits, state.logs, today);
      const perDay = Math.ceil(remaining / pace.daysLeft);
      const cur = targetOn(unitHabit, today);
      if (perDay > cur) {
        out.push({
          key: `goal-rate-${g.id}-${perDay}`,
          tone: "warn",
          icon: g.emoji,
          title: `${g.title}: ${pace.status === "behind" ? "slightly behind" : "off track"}`,
          body: `To finish by the deadline you need about ${fmt(perDay)} ${g.unit}/day. ${unitHabit.name} is set to ${fmt(cur)}.`,
          action: { label: `Set to ${fmt(perDay)} ${unitHabit.unit}`, do: { type: "setTarget", habitId: unitHabit.id, target: perDay } },
        });
        continue;
      }
    }
    out.push({
      key: `goal-pace-${g.id}-${pace.status}-${today}`,
      tone: "warn",
      icon: g.emoji,
      title: `${g.title} needs attention`,
      body: `Progress ${pct(progress)} vs ${pct(pace.expected)} expected by now${pace.daysLeft !== null && pace.daysLeft >= 0 ? `, ${pace.daysLeft} days left` : ""}. Prioritize its habits this week.`,
      action: { label: "Open goal", do: { type: "openGoal", goalId: g.id } },
    });
  }

  for (const h of habits) {
    if (diffDays(h.createdAt, today) < 7) continue;
    const p = precisionRate(h, state.logs, from14, yesterday);
    if (p === null) continue;
    const t = targetOn(h, today);
    if (p < 0.5) {
      if (t > 1) {
        const next = Math.max(1, Math.round(t * 0.7));
        out.push({
          key: `scale-down-${h.id}-${next}`,
          tone: "warn",
          icon: h.emoji,
          title: `Make ${h.name} easier`,
          body: `Precision is ${pct(p)} over 2 weeks. Showing up beats perfection — drop the target to ${fmt(next)} ${h.unit} and rebuild momentum.`,
          action: { label: `Lower to ${fmt(next)}`, do: { type: "setTarget", habitId: h.id, target: next } },
        });
      } else if (h.schedule.type === "daily") {
        out.push({
          key: `flex-${h.id}`,
          tone: "warn",
          icon: h.emoji,
          title: `Give ${h.name} some flexibility`,
          body: `You're hitting it ${pct(p)} of days. Switching to 4× per week keeps the habit alive without the all-or-nothing pressure.`,
          action: { label: "Switch to 4×/week", do: { type: "setSchedule", habitId: h.id, schedule: { type: "weekly", times: 4 } } },
        });
      }
    } else if (p >= 0.95 && !h.improvementMode && t > 1) {
      out.push({
        key: `level-up-${h.id}`,
        tone: "good",
        icon: h.emoji,
        title: `You're crushing ${h.name}`,
        body: `${pct(p)} precision for 2 weeks. Turn on Improvement Mode to raise the bar automatically as you grow.`,
        action: { label: "Enable Improvement Mode", do: { type: "enableImprovement", habitId: h.id } },
      });
    }
  }

  const perf = weekdayPerformance(habits, state.logs, addDays(today, -42), yesterday);
  const known = perf.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v !== null);
  if (known.length >= 5) {
    const worst = known.reduce((a, b) => (b.v < a.v ? b : a));
    const best = known.reduce((a, b) => (b.v > a.v ? b : a));
    if (best.v - worst.v >= 0.25) {
      out.push({
        key: `weekday-${worst.i}-${startOfWeek(today)}`,
        tone: "info",
        icon: "📅",
        title: `${WEEKDAYS_LONG[worst.i]}s are your weak spot`,
        body: `You average ${pct(worst.v)} on ${WEEKDAYS_LONG[worst.i]}s vs ${pct(best.v)} on ${WEEKDAYS_LONG[best.i]}s. Prepare the night before or plan a lighter version.`,
      });
    }
  }

  for (const g of activeGoals(state.goals)) {
    for (const m of g.milestones) {
      if (m.done || !m.dueDate) continue;
      const d = diffDays(today, m.dueDate);
      if (d >= 0 && d <= 3) {
        out.push({
          key: `milestone-${m.id}`,
          tone: "info",
          icon: "🚩",
          title: `Milestone due ${d === 0 ? "today" : `in ${d} day${d > 1 ? "s" : ""}`}`,
          body: `“${m.title}” for ${g.title}.`,
          action: { label: "Open goal", do: { type: "openGoal", goalId: g.id } },
        });
      }
    }
  }

  const dailyCount = habits.filter((h) => h.schedule.type === "daily").length;
  const overall = habits.map((h) => precisionRate(h, state.logs, from14, yesterday)).filter((v): v is number => v !== null);
  const avg = overall.length ? overall.reduce((a, b) => a + b, 0) / overall.length : null;
  if (dailyCount >= 8 && avg !== null && avg < 0.6) {
    out.push({
      key: `too-many-${startOfWeek(today)}`,
      tone: "info",
      icon: "🎯",
      title: "Fewer habits, more focus",
      body: `You have ${dailyCount} daily habits at ${pct(avg)} precision. Archive the least important two — consistency compounds faster with focus.`,
    });
  }

  return out.filter((s) => !state.dismissedSuggestions.includes(s.key));
}

/* ------------------------------ Deep Analysis ------------------------------ */

export interface AnalysisItem {
  icon: string;
  title: string;
  body: string;
}

export interface Analysis {
  trends: AnalysisItem[];
  patterns: AnalysisItem[];
  tips: AnalysisItem[];
}

export function deepAnalysis(state: AppState, today: DateKey = todayKey()): Analysis {
  const habits = activeHabits(state.habits);
  const all = state.habits;
  const trends: AnalysisItem[] = [];
  const patterns: AnalysisItem[] = [];
  const tips: AnalysisItem[] = [];
  const y = addDays(today, -1);

  const thisWeek = averageFocus(all, state.logs, addDays(today, -6), today);
  const lastWeek = averageFocus(all, state.logs, addDays(today, -13), addDays(today, -7));
  if (thisWeek !== null && lastWeek !== null) {
    const d = thisWeek - lastWeek;
    trends.push({
      icon: d >= 0 ? "📈" : "📉",
      title: `Focus Score ${d >= 0 ? "up" : "down"} ${Math.abs(d)} points`,
      body: `Averaging ${thisWeek} over the last 7 days vs ${lastWeek} the week before.${d < -5 ? " Something changed — check which habits slipped below." : d > 5 ? " Keep doing exactly what you're doing." : ""}`,
    });
  }

  const improved: { h: Habit; d: number; now: number }[] = [];
  for (const h of habits) {
    const now = precisionRate(h, state.logs, addDays(today, -14), y);
    const before = precisionRate(h, state.logs, addDays(today, -28), addDays(today, -15));
    if (now !== null && before !== null) improved.push({ h, d: now - before, now });
  }
  if (improved.length) {
    const up = improved.reduce((a, b) => (b.d > a.d ? b : a));
    const down = improved.reduce((a, b) => (b.d < a.d ? b : a));
    if (up.d > 0.05) trends.push({ icon: up.h.emoji, title: `${up.h.name} is trending up`, body: `Precision rose ${pct(up.d)} to ${pct(up.now)} over the last two weeks.` });
    if (down.d < -0.05 && down.h.id !== up.h.id)
      trends.push({ icon: down.h.emoji, title: `${down.h.name} is slipping`, body: `Precision dropped ${pct(-down.d)} to ${pct(down.now)}. Lower the target or move it to a better time of day.` });
  }

  const perf = weekdayPerformance(all, state.logs, addDays(today, -56), y);
  const known = perf.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v !== null);
  if (known.length >= 4) {
    const best = known.reduce((a, b) => (b.v > a.v ? b : a));
    const worst = known.reduce((a, b) => (b.v < a.v ? b : a));
    patterns.push({
      icon: "📅",
      title: `Best day: ${WEEKDAYS_LONG[best.i]}`,
      body: `You complete ${pct(best.v)} of habits on ${WEEKDAYS_LONG[best.i]}s, and ${pct(worst.v)} on ${WEEKDAYS_LONG[worst.i]}s.`,
    });
  }

  const hours = completionHours(all, state.logs, addDays(today, -56), today);
  const total = hours.reduce((a, b) => a + b, 0);
  if (total >= 10) {
    let bestStart = 0;
    let bestSum = -1;
    for (let hStart = 0; hStart < 24; hStart++) {
      const s = hours[hStart] + hours[(hStart + 1) % 24] + hours[(hStart + 2) % 24];
      if (s > bestSum) {
        bestSum = s;
        bestStart = hStart;
      }
    }
    const label = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric" });
    patterns.push({
      icon: "⏰",
      title: `Peak window: ${label(bestStart)}–${label((bestStart + 3) % 24)}`,
      body: `${pct(bestSum / total)} of your completions happen in this window. Schedule your hardest habit here.`,
    });
  }

  const moodOn: number[] = [];
  const moodOff: number[] = [];
  const energyOn: number[] = [];
  const energyOff: number[] = [];
  for (const [day, c] of Object.entries(state.checkIns)) {
    const comp = dayStats(all, state.logs, day).completion;
    if (comp === null) continue;
    (comp >= LOCK_IN_THRESHOLD ? moodOn : moodOff).push(c.mood);
    (comp >= LOCK_IN_THRESHOLD ? energyOn : energyOff).push(c.energy);
  }
  const avgOf = (a: number[]) => a.reduce((x, y2) => x + y2, 0) / a.length;
  if (moodOn.length >= 3 && moodOff.length >= 3) {
    const a = avgOf(moodOn);
    const b = avgOf(moodOff);
    patterns.push({
      icon: "🙂",
      title: a > b ? "Discipline lifts your mood" : "Mood isn't tied to completion",
      body: `On locked-in days your mood averages ${a.toFixed(1)}/5 vs ${b.toFixed(1)}/5 on other days.${a - b > 0.4 ? " The feeling follows the action — not the other way round." : ""}`,
    });
  }
  if (energyOn.length >= 3 && energyOff.length >= 3) {
    const a = avgOf(energyOn);
    const b = avgOf(energyOff);
    if (Math.abs(a - b) > 0.3)
      patterns.push({ icon: "⚡", title: "Energy and consistency move together", body: `Energy averages ${a.toFixed(1)} on locked-in days vs ${b.toFixed(1)} otherwise. Protect sleep to protect your streak.` });
  }

  const ranked = habits
    .map((h) => ({ h, p: precisionRate(h, state.logs, addDays(today, -30), y) }))
    .filter((x): x is { h: Habit; p: number } => x.p !== null)
    .sort((a, b) => b.p - a.p);
  if (ranked.length >= 2) {
    const top = ranked[0];
    const low = ranked[ranked.length - 1];
    patterns.push({ icon: top.h.emoji, title: `Most consistent: ${top.h.name}`, body: `${pct(top.p)} precision over 30 days — this habit is part of your identity now.` });
    if (low.p < 0.6) {
      tips.push({
        icon: "🌱",
        title: `Shrink ${low.h.name}`,
        body: `At ${pct(low.p)}, it's your hardest habit. Define a 2-minute version you can do on bad days — it keeps the identity alive.`,
      });
    }
  }

  const morning = habits.filter((h) => h.timeOfDay === "morning").length;
  if (morning === 0 && habits.length >= 3)
    tips.push({ icon: "🌅", title: "Build a morning anchor", body: "None of your habits are set for the morning. One small win right after waking sets the tone for the whole day." });
  if (habits.some((h) => !h.goalId) && state.goals.length)
    tips.push({ icon: "🔗", title: "Link habits to goals", body: "Habits linked to a goal get twice the context: you see why they matter, and unit-linked habits move goal progress automatically." });
  if (!Object.keys(state.checkIns).length)
    tips.push({ icon: "📝", title: "Start daily check-ins", body: "Log mood and energy on the Today screen to unlock correlations between how you feel and what you do." });
  tips.push({ icon: "🔁", title: "Never miss twice", body: "Missing once is an accident. Missing twice is the start of a new habit. After a miss, make the next rep tiny but certain." });

  return { trends, patterns, tips };
}

/** Compact JSON snapshot for the AI coach. */
export function coachContext(state: AppState, today: DateKey = todayKey()) {
  const habits = activeHabits(state.habits);
  const y = addDays(today, -1);
  return {
    today,
    weekday: WEEKDAYS_LONG[weekdayIndex(today)],
    user: { name: state.profile.name, focusAreas: state.profile.areas },
    focusScore: {
      last7Avg: averageFocus(state.habits, state.logs, addDays(today, -6), today),
      prev7Avg: averageFocus(state.habits, state.logs, addDays(today, -13), addDays(today, -7)),
    },
    todayProgress: dayStats(state.habits, state.logs, today),
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      target: targetOn(h, today),
      unit: h.unit,
      schedule: h.schedule,
      timeOfDay: h.timeOfDay,
      linkedGoalId: h.goalId ?? null,
      improvementMode: h.improvementMode,
      loggedToday: state.logs[today]?.[h.id]?.value ?? 0,
      precision14d: round2(precisionRate(h, state.logs, addDays(today, -14), y)),
      precision30d: round2(precisionRate(h, state.logs, addDays(today, -30), y)),
    })),
    goals: activeGoals(state.goals).map((g) => {
      const progress = goalProgress(g, state.habits, state.logs, today);
      const pace = goalPace(g, progress, today);
      return {
        id: g.id,
        title: g.title,
        why: g.why,
        kind: g.kind,
        current: g.kind === "numeric" ? goalCurrent(g, state.habits, state.logs, today) : undefined,
        target: g.kind === "numeric" ? g.targetValue : undefined,
        unit: g.unit || undefined,
        progress: round2(progress),
        expectedProgress: round2(pace.expected),
        status: pace.status,
        deadline: g.deadline ?? null,
        milestones: g.milestones.map((m) => ({ id: m.id, title: m.title, done: m.done, dueDate: m.dueDate ?? null })),
      };
    }),
    recentCheckIns: Object.entries(state.checkIns)
      .filter(([d]) => d >= addDays(today, -7))
      .map(([date, c]) => ({ date, ...c })),
    lastReview: state.reviews.at(-1) ?? null,
    agentFindings: buildSuggestions(state, today).map((s) => `${s.title}: ${s.body}`),
  };
}

function round2(v: number | null) {
  return v === null ? null : Math.round(v * 100) / 100;
}
