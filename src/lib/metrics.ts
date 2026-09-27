/**
 * Pure scoring functions. Everything here is derived from habits + logs, so
 * nothing needs to be stored or kept in sync.
 *
 * - Day completion: average of min(1, value / target) over the habits due that day.
 * - Focus Score: 70% today's completion + 30% momentum (previous 6 days).
 * - Precision Rate: how closely a habit hits its intended rhythm over a window.
 * - Locked-In Score: time since the current run of days with >= 70% completion began.
 */
import { addDays, diffDays, fromKey, rangeKeys, startOfWeek, todayKey, weekdayIndex, type DateKey } from "./date";
import type { Goal, Habit, Logs } from "./types";

export const LOCK_IN_THRESHOLD = 0.7;

export function targetOn(habit: Habit, day: DateKey): number {
  let t = habit.targetHistory.length ? habit.targetHistory[0].target : habit.target;
  for (const h of habit.targetHistory) {
    if (h.from <= day) t = h.target;
    else break;
  }
  return Math.max(t, 0.0001);
}

export function isActiveOn(habit: Habit, day: DateKey): boolean {
  if (day < habit.createdAt) return false;
  if (habit.archivedAt && day >= habit.archivedAt) return false;
  return true;
}

export function valueOn(logs: Logs, habitId: string, day: DateKey): number {
  return logs[day]?.[habitId]?.value ?? 0;
}

export function ratioOn(habit: Habit, logs: Logs, day: DateKey): number {
  return Math.min(1, valueOn(logs, habit.id, day) / targetOn(habit, day));
}

export function isDoneOn(habit: Habit, logs: Logs, day: DateKey): boolean {
  return ratioOn(habit, logs, day) >= 1;
}

/** Whether the habit appears in the day's list (weekly habits always appear). */
export function isScheduledOn(habit: Habit, day: DateKey): boolean {
  if (!isActiveOn(habit, day)) return false;
  const s = habit.schedule;
  if (s.type === "weekdays") return s.days.includes(weekdayIndex(day));
  return true;
}

/** Completions of a weekly habit in its week strictly before `day`. */
export function weekCompletionsBefore(habit: Habit, logs: Logs, day: DateKey): number {
  let n = 0;
  for (let k = startOfWeek(day); k < day; k = addDays(k, 1)) if (isDoneOn(habit, logs, k)) n++;
  return n;
}

export function weekCompletions(habit: Habit, logs: Logs, day: DateKey): number {
  let n = 0;
  const start = startOfWeek(day);
  for (let i = 0; i < 7; i++) if (isDoneOn(habit, logs, addDays(start, i))) n++;
  return n;
}

/**
 * Whether the habit counts toward the day's score. A flexible weekly habit only
 * counts when it was done that day, or when skipping it would make the weekly
 * quota impossible.
 */
export function isDueOn(habit: Habit, logs: Logs, day: DateKey): boolean {
  if (!isScheduledOn(habit, day)) return false;
  const s = habit.schedule;
  if (s.type !== "weekly") return true;
  if (valueOn(logs, habit.id, day) > 0) return true;
  const needed = s.times - weekCompletionsBefore(habit, logs, day);
  const daysLeft = 7 - weekdayIndex(day);
  return needed > 0 && needed >= daysLeft;
}

export interface DayStats {
  due: number;
  done: number;
  /** 0..1, null when nothing was due */
  completion: number | null;
}

export function dayStats(habits: Habit[], logs: Logs, day: DateKey): DayStats {
  let due = 0;
  let sum = 0;
  let done = 0;
  for (const h of habits) {
    if (!isDueOn(h, logs, day)) continue;
    due++;
    const r = ratioOn(h, logs, day);
    sum += r;
    if (r >= 1) done++;
  }
  return { due, done, completion: due ? sum / due : null };
}

export function focusScore(habits: Habit[], logs: Logs, day: DateKey): number | null {
  const today = dayStats(habits, logs, day).completion;
  if (today === null) return null;
  const prev: number[] = [];
  for (let i = 1; i <= 6; i++) {
    const c = dayStats(habits, logs, addDays(day, -i)).completion;
    if (c !== null) prev.push(c);
  }
  const momentum = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : today;
  return Math.round(100 * (0.7 * today + 0.3 * momentum));
}

export function averageFocus(habits: Habit[], logs: Logs, from: DateKey, to: DateKey): number | null {
  const vals = rangeKeys(from, to)
    .map((k) => focusScore(habits, logs, k))
    .filter((v): v is number => v !== null);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

/** 0..1 or null when the habit had nothing due in the window. */
export function precisionRate(habit: Habit, logs: Logs, from: DateKey, to: DateKey): number | null {
  const start = from < habit.createdAt ? habit.createdAt : from;
  const end = habit.archivedAt && habit.archivedAt <= to ? addDays(habit.archivedAt, -1) : to;
  if (start > end) return null;
  const s = habit.schedule;
  if (s.type === "weekly") {
    let achieved = 0;
    let expected = 0;
    for (let w = startOfWeek(start); w <= end; w = addDays(w, 7)) {
      const wEnd = addDays(w, 6);
      const a = w < start ? start : w;
      const b = wEnd > end ? end : wEnd;
      const covered = diffDays(a, b) + 1;
      let done = 0;
      for (let k = a; k <= b; k = addDays(k, 1)) if (isDoneOn(habit, logs, k)) done++;
      const exp = (s.times * covered) / 7;
      expected += exp;
      achieved += Math.min(done, exp);
    }
    return expected > 0 ? Math.min(1, achieved / expected) : null;
  }
  let due = 0;
  let sum = 0;
  for (let k = start; k <= end; k = addDays(k, 1)) {
    if (!isScheduledOn(habit, k)) continue;
    due++;
    sum += ratioOn(habit, logs, k);
  }
  return due ? sum / due : null;
}

export function overallPrecision(habits: Habit[], logs: Logs, from: DateKey, to: DateKey): number | null {
  const vals = habits.map((h) => precisionRate(h, logs, from, to)).filter((v): v is number => v !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export interface Streak {
  current: number;
  best: number;
  unit: "days" | "weeks";
}

export function habitStreak(habit: Habit, logs: Logs, today: DateKey = todayKey()): Streak {
  const s = habit.schedule;
  if (s.type === "weekly") {
    const weeks: boolean[] = [];
    for (let w = startOfWeek(habit.createdAt); w <= today; w = addDays(w, 7)) {
      weeks.push(weekCompletions(habit, logs, w) >= s.times);
    }
    return { ...runs(weeks, true), unit: "weeks" };
  }
  const days: boolean[] = [];
  const end = habit.archivedAt && habit.archivedAt <= today ? addDays(habit.archivedAt, -1) : today;
  for (let k = habit.createdAt; k <= end; k = addDays(k, 1)) {
    if (isScheduledOn(habit, k)) days.push(isDoneOn(habit, logs, k));
  }
  const lastIsToday = end === today && isScheduledOn(habit, today);
  return { ...runs(days, lastIsToday), unit: "days" };
}

/** Longest and trailing run of `true`. A trailing `false` for an in-progress period doesn't break the run. */
function runs(list: boolean[], lastInProgress: boolean) {
  let best = 0;
  let cur = 0;
  for (const v of list) {
    cur = v ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  let current = 0;
  let i = list.length - 1;
  if (lastInProgress && i >= 0 && !list[i]) i--;
  for (; i >= 0 && list[i]; i--) current++;
  return { current, best };
}

export interface LockedIn {
  /** ms since the run began (0 when not locked in) */
  ms: number;
  start: DateKey | null;
  todayLocked: boolean;
  bestDays: number;
}

export function lockedIn(habits: Habit[], logs: Logs, now: Date = new Date()): LockedIn {
  const today = todayKey(now);
  const earliest = habits.reduce<DateKey>((min, h) => (h.createdAt < min ? h.createdAt : min), today);
  const todayC = dayStats(habits, logs, today).completion;
  const todayLocked = todayC !== null && todayC >= LOCK_IN_THRESHOLD;

  let start: DateKey | null = null;
  for (let k = addDays(today, -1); k >= earliest; k = addDays(k, -1)) {
    const c = dayStats(habits, logs, k).completion;
    if (c === null) continue; // rest days bridge the run
    if (c >= LOCK_IN_THRESHOLD) start = k;
    else break;
  }
  if (!start && todayLocked) start = today;

  let best = 0;
  let cur = 0;
  for (let k = earliest; k <= today; k = addDays(k, 1)) {
    const c = dayStats(habits, logs, k).completion;
    if (c === null) continue;
    if (c >= LOCK_IN_THRESHOLD) best = Math.max(best, ++cur);
    else if (k !== today) cur = 0;
  }

  const ms = start ? Math.max(0, now.getTime() - fromKey(start).getTime()) : 0;
  return { ms, start, todayLocked, bestDays: best };
}

export function splitDuration(ms: number) {
  const totalMin = Math.floor(ms / 60_000);
  return { days: Math.floor(totalMin / 1440), hours: Math.floor((totalMin % 1440) / 60), minutes: totalMin % 60 };
}

/* ---------------------------------- Goals --------------------------------- */

export function linkedHabits(goal: Goal, habits: Habit[]): Habit[] {
  return habits.filter((h) => h.goalId === goal.id);
}

export function goalCurrent(goal: Goal, habits: Habit[], logs: Logs, today: DateKey = todayKey()): number {
  const entries = goal.entries.filter((e) => e.date <= today);
  if (goal.tracking === "measurement") {
    if (!entries.length) return goal.startValue;
    // Stable sort keeps insertion order for same-day entries, so the last one wins.
    return [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).at(-1)!.value;
  }
  let v = goal.startValue + entries.reduce((a, e) => a + e.value, 0);
  for (const h of habits) {
    if (h.goalId !== goal.id || !h.linkUnits) continue;
    for (const [day, row] of Object.entries(logs)) {
      if (day < goal.startDate || day > today) continue;
      v += row[h.id]?.value ?? 0;
    }
  }
  return v;
}

export function goalProgress(goal: Goal, habits: Habit[], logs: Logs, today: DateKey = todayKey()): number {
  if (goal.completedAt) return 1;
  if (goal.kind === "milestones") {
    if (!goal.milestones.length) return 0;
    return goal.milestones.filter((m) => m.done).length / goal.milestones.length;
  }
  const span = goal.targetValue - goal.startValue;
  if (span === 0) return 1;
  const p = (goalCurrent(goal, habits, logs, today) - goal.startValue) / span;
  return Math.max(0, Math.min(1, p));
}

export type PaceStatus = "done" | "on-track" | "behind" | "off-track" | "overdue" | "no-deadline";

export interface Pace {
  status: PaceStatus;
  expected: number;
  daysLeft: number | null;
  projected: DateKey | null;
}

export function goalPace(goal: Goal, progress: number, today: DateKey = todayKey()): Pace {
  if (goal.completedAt || progress >= 1) return { status: "done", expected: 1, daysLeft: null, projected: null };
  if (!goal.deadline) return { status: "no-deadline", expected: 0, daysLeft: null, projected: null };
  const total = Math.max(1, diffDays(goal.startDate, goal.deadline));
  const elapsedDays = Math.max(0, diffDays(goal.startDate, today));
  const expected = Math.min(1, elapsedDays / total);
  const daysLeft = diffDays(today, goal.deadline);
  const rate = elapsedDays > 0 ? progress / elapsedDays : 0;
  const projected = rate > 0 ? addDays(today, Math.ceil((1 - progress) / rate)) : null;
  let status: PaceStatus;
  if (daysLeft < 0) status = "overdue";
  else if (elapsedDays < 3 || progress >= expected - 0.05) status = "on-track";
  else if (progress >= expected - 0.15) status = "behind";
  else status = "off-track";
  return { status, expected, daysLeft, projected };
}

/* ------------------------------- Levels & XP ------------------------------- */

export const LEVEL_TITLES = [
  "Beginner",
  "Starter",
  "Committed",
  "Consistent",
  "Focused",
  "Disciplined",
  "Relentless",
  "Locked In",
  "Elite",
  "Unstoppable",
];

export function computeXp(
  habits: Habit[],
  logs: Logs,
  goals: Goal[],
  extras: { checkIns: number; reviews: number; lessons: number },
): number {
  let xp = 0;
  for (const day of Object.keys(logs)) {
    let doneCount = 0;
    for (const h of habits) {
      if (isActiveOn(h, day) && isDoneOn(h, logs, day)) {
        xp += 10;
        doneCount++;
      }
    }
    if (doneCount) {
      const c = dayStats(habits, logs, day).completion;
      if (c !== null && c >= LOCK_IN_THRESHOLD) xp += 20;
    }
  }
  for (const g of goals) {
    xp += g.milestones.filter((m) => m.done).length * 50;
    if (g.completedAt) xp += 250;
  }
  xp += extras.checkIns * 5 + extras.reviews * 40 + extras.lessons * 25;
  return xp;
}

/** Level n starts at 125 * n * (n - 1) XP. */
export function levelFromXp(xp: number) {
  let level = 1;
  while (125 * (level + 1) * level <= xp) level++;
  const floor = 125 * level * (level - 1);
  const next = 125 * (level + 1) * level;
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    into: xp - floor,
    span: next - floor,
    progress: (xp - floor) / (next - floor),
  };
}

/* -------------------------------- Patterns -------------------------------- */

export function weekdayPerformance(habits: Habit[], logs: Logs, from: DateKey, to: DateKey): (number | null)[] {
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  for (const k of rangeKeys(from, to)) {
    const c = dayStats(habits, logs, k).completion;
    if (c === null) continue;
    sums[weekdayIndex(k)] += c;
    counts[weekdayIndex(k)]++;
  }
  return sums.map((s, i) => (counts[i] ? s / counts[i] : null));
}

/** Completions per hour-of-day bucket (0-23) within the window. */
export function completionHours(habits: Habit[], logs: Logs, from: DateKey, to: DateKey): number[] {
  const hours = Array(24).fill(0);
  for (const k of rangeKeys(from, to)) {
    const row = logs[k];
    if (!row) continue;
    for (const h of habits) {
      const e = row[h.id];
      if (e && e.value >= targetOn(h, k)) hours[new Date(e.at).getHours()]++;
    }
  }
  return hours;
}
