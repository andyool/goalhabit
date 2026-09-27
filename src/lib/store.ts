import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays, diffDays, fromKey, todayKey, type DateKey } from "./date";
import { CHALLENGES, type GoalTemplate, type HabitTemplate } from "./content";
import { isScheduledOn, precisionRate, targetOn } from "./metrics";
import type { AppState, CheckIn, Goal, Habit, ID, Milestone, Profile, WeeklyReview } from "./types";

export function uid(): ID {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().slice(0, 12);
  return Math.random().toString(36).slice(2, 14);
}

const defaultProfile = (): Profile => ({
  name: "",
  areas: [],
  onboarded: false,
  theme: "dark",
  remindersEnabled: false,
  offTrackAlerts: true,
  createdAt: todayKey(),
});

export const initialState = (): AppState => ({
  profile: defaultProfile(),
  habits: [],
  goals: [],
  logs: {},
  checkIns: {},
  reviews: [],
  challenges: [],
  lessonsRead: [],
  dismissedSuggestions: [],
  activity: [],
});

export type HabitInput = Omit<Habit, "id" | "targetHistory" | "createdAt" | "archived" | "order" | "archivedAt" | "lastAdjust"> & {
  createdAt?: DateKey;
};

export type GoalInput = Omit<Goal, "id" | "entries" | "milestones" | "createdAt" | "archived" | "order" | "completedAt"> & {
  milestones?: (Omit<Milestone, "id" | "done"> & { done?: boolean })[];
};

export function habitFromTemplate(t: HabitTemplate, goalId?: ID): HabitInput {
  return {
    name: t.name,
    emoji: t.emoji,
    color: t.color,
    target: t.target,
    unit: t.unit,
    schedule: t.schedule,
    timeOfDay: t.timeOfDay,
    goalId,
    linkUnits: !!(goalId && t.linkUnits),
    improvementMode: false,
  };
}

export function goalFromTemplate(t: GoalTemplate, today: DateKey = todayKey()): GoalInput {
  return {
    title: t.title,
    emoji: t.emoji,
    color: t.color,
    category: t.area,
    why: t.why,
    kind: t.kind,
    tracking: t.tracking,
    startValue: t.startValue,
    targetValue: t.targetValue,
    unit: t.unit,
    startDate: today,
    deadline: addDays(today, t.days),
    milestones: t.milestones.map((title) => ({ title })),
  };
}

interface Actions {
  updateProfile: (patch: Partial<Profile>) => void;
  addHabit: (input: HabitInput) => ID;
  updateHabit: (id: ID, patch: Partial<Habit>) => void;
  archiveHabit: (id: ID) => void;
  restoreHabit: (id: ID) => void;
  deleteHabit: (id: ID) => void;
  moveHabit: (id: ID, dir: -1 | 1) => void;
  setLog: (habitId: ID, day: DateKey, value: number) => void;
  addGoal: (input: GoalInput) => ID;
  updateGoal: (id: ID, patch: Partial<Goal>) => void;
  deleteGoal: (id: ID) => void;
  setGoalCompleted: (id: ID, done: boolean) => void;
  archiveGoal: (id: ID, archived: boolean) => void;
  addEntry: (goalId: ID, value: number, note?: string, date?: DateKey) => void;
  deleteEntry: (goalId: ID, entryId: ID) => void;
  addMilestone: (goalId: ID, title: string, dueDate?: DateKey) => ID;
  updateMilestone: (goalId: ID, milestoneId: ID, patch: Partial<Milestone>) => void;
  toggleMilestone: (goalId: ID, milestoneId: ID) => void;
  deleteMilestone: (goalId: ID, milestoneId: ID) => void;
  setCheckIn: (day: DateKey, c: CheckIn) => void;
  saveReview: (r: WeeklyReview) => void;
  joinChallenge: (templateId: ID) => void;
  leaveChallenge: (templateId: ID) => void;
  markLessonRead: (id: ID) => void;
  dismissSuggestion: (key: string) => void;
  logActivity: (text: string) => void;
  runImprovementMode: () => string[];
  loadDemo: () => void;
  importData: (data: AppState) => void;
  resetAll: () => void;
}

export type Store = AppState & Actions;

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState(),

      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      addHabit: (input) => {
        const id = uid();
        const createdAt = input.createdAt ?? todayKey();
        set((s) => ({
          habits: [
            ...s.habits,
            {
              ...input,
              id,
              createdAt,
              targetHistory: [{ from: createdAt, target: input.target }],
              archived: false,
              order: s.habits.length ? Math.max(...s.habits.map((h) => h.order)) + 1 : 0,
            },
          ],
        }));
        return id;
      },

      updateHabit: (id, patch) =>
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h;
            const next = { ...h, ...patch };
            if (patch.target !== undefined && patch.target !== h.target) {
              const today = todayKey();
              const from = today < h.createdAt ? h.createdAt : today;
              next.targetHistory = [...h.targetHistory.filter((t) => t.from < from), { from, target: patch.target }];
            }
            if (patch.goalId === undefined && "goalId" in patch) next.linkUnits = false;
            return next;
          }),
        })),

      archiveHabit: (id) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? { ...h, archived: true, archivedAt: addDays(todayKey(), 1) } : h)),
        })),

      restoreHabit: (id) =>
        set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, archived: false, archivedAt: undefined } : h)) })),

      deleteHabit: (id) =>
        set((s) => {
          const logs = { ...s.logs };
          for (const day of Object.keys(logs)) {
            if (logs[day][id]) {
              const row = { ...logs[day] };
              delete row[id];
              logs[day] = row;
            }
          }
          return {
            habits: s.habits.filter((h) => h.id !== id),
            logs,
            challenges: s.challenges.map((c) => ({ ...c, habitIds: c.habitIds.filter((x) => x !== id) })),
          };
        }),

      moveHabit: (id, dir) =>
        set((s) => {
          const list = [...s.habits].sort((a, b) => a.order - b.order);
          const i = list.findIndex((h) => h.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= list.length) return {};
          [list[i], list[j]] = [list[j], list[i]];
          return { habits: list.map((h, idx) => ({ ...h, order: idx })) };
        }),

      setLog: (habitId, day, value) =>
        set((s) => {
          const row = { ...(s.logs[day] ?? {}) };
          if (value <= 0) delete row[habitId];
          else row[habitId] = { value: Math.round(value * 100) / 100, at: Date.now() };
          return { logs: { ...s.logs, [day]: row } };
        }),

      addGoal: (input) => {
        const id = uid();
        const { milestones = [], ...rest } = input;
        set((s) => ({
          goals: [
            ...s.goals,
            {
              ...rest,
              id,
              entries: [],
              milestones: milestones.map((m) => ({ ...m, id: uid(), done: !!m.done, doneAt: m.done ? todayKey() : undefined })),
              createdAt: todayKey(),
              archived: false,
              order: s.goals.length,
            },
          ],
        }));
        get().logActivity(`New goal: ${input.title}`);
        return id;
      },

      updateGoal: (id, patch) => set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),

      deleteGoal: (id) =>
        set((s) => ({
          goals: s.goals.filter((g) => g.id !== id),
          habits: s.habits.map((h) => (h.goalId === id ? { ...h, goalId: undefined, linkUnits: false } : h)),
        })),

      setGoalCompleted: (id, done) => {
        const g = get().goals.find((x) => x.id === id);
        set((s) => ({ goals: s.goals.map((x) => (x.id === id ? { ...x, completedAt: done ? todayKey() : undefined } : x)) }));
        if (done && g) get().logActivity(`Goal achieved: ${g.title} 🏆`);
      },

      archiveGoal: (id, archived) => set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, archived } : g)) })),

      addEntry: (goalId, value, note, date = todayKey()) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === goalId ? { ...g, entries: [...g.entries, { id: uid(), date, value, note }] } : g)),
        })),

      deleteEntry: (goalId, entryId) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === goalId ? { ...g, entries: g.entries.filter((e) => e.id !== entryId) } : g)),
        })),

      addMilestone: (goalId, title, dueDate) => {
        const id = uid();
        set((s) => ({
          goals: s.goals.map((g) => (g.id === goalId ? { ...g, milestones: [...g.milestones, { id, title, dueDate, done: false }] } : g)),
        }));
        return id;
      },

      updateMilestone: (goalId, milestoneId, patch) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId ? { ...g, milestones: g.milestones.map((m) => (m.id === milestoneId ? { ...m, ...patch } : m)) } : g,
          ),
        })),

      toggleMilestone: (goalId, milestoneId) => {
        const g = get().goals.find((x) => x.id === goalId);
        const m = g?.milestones.find((x) => x.id === milestoneId);
        if (!g || !m) return;
        get().updateMilestone(goalId, milestoneId, { done: !m.done, doneAt: m.done ? undefined : todayKey() });
        if (!m.done) get().logActivity(`Milestone reached: ${m.title}`);
      },

      deleteMilestone: (goalId, milestoneId) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === goalId ? { ...g, milestones: g.milestones.filter((m) => m.id !== milestoneId) } : g)),
        })),

      setCheckIn: (day, c) => set((s) => ({ checkIns: { ...s.checkIns, [day]: c } })),

      saveReview: (r) =>
        set((s) => ({ reviews: [...s.reviews.filter((x) => x.weekStart !== r.weekStart), r].sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1)) })),

      joinChallenge: (templateId) => {
        const t = CHALLENGES.find((c) => c.id === templateId);
        if (!t) return;
        const ids = t.habits.map((h) => get().addHabit({ ...habitFromTemplate(h), challengeId: templateId }));
        set((s) => ({
          challenges: [...s.challenges.filter((c) => c.id !== templateId), { id: templateId, joinedAt: todayKey(), habitIds: ids }],
        }));
        get().logActivity(`Joined challenge: ${t.title}`);
      },

      leaveChallenge: (templateId) => {
        const c = get().challenges.find((x) => x.id === templateId);
        if (!c) return;
        c.habitIds.forEach((id) => get().archiveHabit(id));
        set((s) => ({ challenges: s.challenges.map((x) => (x.id === templateId ? { ...x, leftAt: todayKey() } : x)) }));
      },

      markLessonRead: (id) => set((s) => (s.lessonsRead.includes(id) ? {} : { lessonsRead: [...s.lessonsRead, id] })),

      dismissSuggestion: (key) => set((s) => ({ dismissedSuggestions: [...s.dismissedSuggestions, key] })),

      logActivity: (text) => set((s) => ({ activity: [{ id: uid(), at: Date.now(), text }, ...s.activity].slice(0, 50) })),

      runImprovementMode: () => {
        const today = todayKey();
        const notes: string[] = [];
        const { habits, logs } = get();
        for (const h of habits) {
          if (!h.improvementMode || h.archived) continue;
          const since = h.lastAdjust ?? h.createdAt;
          if (diffDays(since, today) < 7) continue;
          const from = addDays(today, -7);
          const to = addDays(today, -1);
          let dueDays = 0;
          for (let k = from; k <= to; k = addDays(k, 1)) if (isScheduledOn(h, k)) dueDays++;
          const p = precisionRate(h, logs, from, to);
          if (p === null || dueDays < 3) {
            get().updateHabit(h.id, { lastAdjust: today });
            continue;
          }
          const cur = targetOn(h, today);
          const step = Math.max(1, Math.round(cur * 0.1));
          if (p >= 0.9) {
            const next = cur + step;
            get().updateHabit(h.id, { target: next, lastAdjust: today });
            notes.push(`${h.emoji} ${h.name}: target raised to ${next} ${h.unit} — you hit ${Math.round(p * 100)}% last week.`);
          } else if (p < 0.5 && cur > 1) {
            const next = Math.max(1, cur - step);
            get().updateHabit(h.id, { target: next, lastAdjust: today });
            notes.push(`${h.emoji} ${h.name}: recovery — target lowered to ${next} ${h.unit} so you keep showing up.`);
          } else {
            get().updateHabit(h.id, { lastAdjust: today });
          }
        }
        notes.forEach((n) => get().logActivity(`Improvement Mode · ${n}`));
        return notes;
      },

      loadDemo: () => set(buildDemo()),

      importData: (data) => set({ ...initialState(), ...data }),

      resetAll: () => set(initialState()),
    }),
    {
      name: "pattrn-state-v1",
      version: 1,
      partialize: (s) => {
        const out: Partial<Store> = {};
        for (const k of Object.keys(initialState()) as (keyof AppState)[]) (out as Record<string, unknown>)[k] = s[k];
        return out;
      },
    },
  ),
);

export function snapshot(): AppState {
  const s = useStore.getState();
  const out = {} as Record<string, unknown>;
  for (const k of Object.keys(initialState())) out[k] = (s as unknown as Record<string, unknown>)[k];
  return out as unknown as AppState;
}

/* --------------------------------- Demo data -------------------------------- */

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function buildDemo(): AppState {
  const rand = rng(42);
  const today = todayKey();
  const start = addDays(today, -69);
  const state = initialState();
  state.profile = { ...state.profile, name: "Alex", areas: ["learning", "fitness", "career"], onboarded: true, createdAt: start };

  const g1: Goal = {
    id: uid(), title: "Read 12 books", emoji: "📚", color: "indigo", category: "learning",
    why: "Think more clearly and learn from people smarter than me.", kind: "numeric", tracking: "cumulative",
    startValue: 0, targetValue: 3600, unit: "pages", entries: [], startDate: start, deadline: addDays(start, 180),
    milestones: [
      { id: uid(), title: "Finish book 1", done: true, doneAt: addDays(start, 16) },
      { id: uid(), title: "Finish book 6", done: false },
      { id: uid(), title: "Finish book 12", done: false },
    ],
    archived: false, createdAt: start, order: 0,
  };
  const g2: Goal = {
    id: uid(), title: "Run 200 km", emoji: "🏃", color: "orange", category: "fitness",
    why: "Build an engine I can rely on and feel strong every day.", kind: "numeric", tracking: "cumulative",
    startValue: 0, targetValue: 200, unit: "km", entries: [{ id: uid(), date: addDays(start, 3), value: 5, note: "Weekend long run" }],
    startDate: start, deadline: addDays(start, 100),
    milestones: [
      { id: uid(), title: "First 10 km", done: true, doneAt: addDays(start, 12) },
      { id: uid(), title: "Halfway — 100 km", done: true, doneAt: addDays(start, 45) },
      { id: uid(), title: "Run 10 km in one go", done: false },
    ],
    archived: false, createdAt: start, order: 1,
  };
  const g3: Goal = {
    id: uid(), title: "Ship my side project", emoji: "💻", color: "blue", category: "career",
    why: "Prove to myself I can finish what I start.", kind: "milestones", tracking: "cumulative",
    startValue: 0, targetValue: 1, unit: "", entries: [], startDate: addDays(start, 10), deadline: addDays(today, 25),
    milestones: [
      { id: uid(), title: "Define the MVP scope", done: true, doneAt: addDays(start, 14) },
      { id: uid(), title: "Working prototype", done: true, doneAt: addDays(start, 50) },
      { id: uid(), title: "First 10 users", done: false, dueDate: addDays(today, 10) },
      { id: uid(), title: "Public launch", done: false, dueDate: addDays(today, 25) },
    ],
    archived: false, createdAt: addDays(start, 10), order: 2,
  };
  state.goals = [g1, g2, g3];

  const mk = (p: Partial<Habit> & Pick<Habit, "name" | "emoji" | "color" | "target" | "unit" | "schedule" | "timeOfDay">, order: number, created = start): Habit => ({
    id: uid(), linkUnits: false, improvementMode: false, archived: false, createdAt: created,
    targetHistory: [{ from: created, target: p.target }], order, ...p,
  });
  const read = mk({ name: "Read", emoji: "📚", color: "indigo", target: 20, unit: "pages", schedule: { type: "daily" }, timeOfDay: "evening", goalId: g1.id, linkUnits: true, improvementMode: true, lastAdjust: addDays(today, -3) }, 0);
  read.targetHistory = [{ from: start, target: 15 }, { from: addDays(start, 30), target: 20 }];
  const run = mk({ name: "Run", emoji: "🏃", color: "orange", target: 5, unit: "km", schedule: { type: "weekly", times: 3 }, timeOfDay: "morning", goalId: g2.id, linkUnits: true }, 1);
  const deep = mk({ name: "Deep work", emoji: "💻", color: "blue", target: 90, unit: "min", schedule: { type: "weekdays", days: [0, 1, 2, 3, 4] }, timeOfDay: "morning", goalId: g3.id }, 2, addDays(start, 10));
  const med = mk({ name: "Meditate", emoji: "🧘", color: "violet", target: 10, unit: "min", schedule: { type: "daily" }, timeOfDay: "morning", reminder: "07:30" }, 3);
  const water = mk({ name: "Drink water", emoji: "💧", color: "cyan", target: 8, unit: "glasses", schedule: { type: "daily" }, timeOfDay: "anytime" }, 4);
  const phone = mk({ name: "No phone first hour", emoji: "📵", color: "pink", target: 1, unit: "times", schedule: { type: "daily" }, timeOfDay: "morning", goalId: g3.id }, 5, addDays(start, 20));
  state.habits = [read, run, deep, med, water, phone];

  const hourFor = (h: Habit) =>
    h.timeOfDay === "morning" ? 6 + Math.floor(rand() * 4) : h.timeOfDay === "evening" ? 19 + Math.floor(rand() * 4) : 10 + Math.floor(rand() * 8);

  for (let k = start; k < today; k = addDays(k, 1)) {
    const age = diffDays(start, k) / 70; // improvement over time
    const wd = (fromKey(k).getDay() + 6) % 7;
    // Weekends are weaker, and the last stretch is a strong locked-in run.
    const recent = diffDays(k, today) <= 9 ? 0.3 : 0;
    const dayFactor = (wd === 6 ? -0.25 : wd === 5 ? -0.1 : wd === 1 || wd === 2 ? 0.08 : 0) + recent;
    const row: AppState["logs"][string] = {};
    let doneCount = 0;
    let dueCount = 0;
    for (const h of state.habits) {
      if (!isScheduledOn(h, k)) continue;
      const base = { [read.id]: 0.72, [run.id]: 0.45, [deep.id]: 0.7, [med.id]: 0.66, [water.id]: 0.8, [phone.id]: 0.55 }[h.id] ?? 0.6;
      let p = Math.min(0.97, base + age * 0.2 + dayFactor);
      if (h.schedule.type === "weekly") p *= (h.schedule.times / 7) * 1.15;
      dueCount++;
      if (rand() < p) {
        const t = targetOn(h, k);
        const over = h.unit === "km" ? Math.round((t + rand() * 3) * 10) / 10 : h.unit === "pages" ? t + Math.floor(rand() * 12) : t;
        const d = fromKey(k);
        d.setHours(hourFor(h), Math.floor(rand() * 60));
        row[h.id] = { value: over, at: d.getTime() };
        doneCount++;
      } else if (rand() < 0.35 && h.target > 1) {
        const d = fromKey(k);
        d.setHours(hourFor(h), Math.floor(rand() * 60));
        row[h.id] = { value: Math.max(1, Math.floor(targetOn(h, k) * (0.3 + rand() * 0.4))), at: d.getTime() };
      }
    }
    if (Object.keys(row).length) state.logs[k] = row;
    if (rand() < 0.75) {
      const ratio = dueCount ? doneCount / dueCount : 0.5;
      const mood = Math.max(1, Math.min(5, Math.round(1.8 + ratio * 3 + (rand() - 0.5))));
      const energy = Math.max(1, Math.min(5, Math.round(1.5 + ratio * 2.6 + (rand() - 0.5) * 1.5)));
      state.checkIns[k] = { mood, energy };
    }
  }
  // Some progress already today
  const now = Date.now();
  state.logs[today] = { [med.id]: { value: 10, at: now }, [water.id]: { value: 3, at: now } };

  const lastWeek = addDays(today, -((fromKey(today).getDay() + 6) % 7) - 7);
  state.reviews = [
    { weekStart: lastWeek, rating: 4, win: "Hit my reading target every weekday", obstacle: "Late nights on Friday and Saturday", focusGoalId: g3.id, intention: "Protect my morning deep-work block", createdAt: now - 5 * 86_400_000 },
  ];
  state.challenges = [];
  state.lessonsRead = ["systems", "precision"];
  state.activity = [
    { id: uid(), at: now - 3 * 86_400_000, text: "Improvement Mode · 📚 Read: target raised to 20 pages — you hit 94% last week." },
    { id: uid(), at: now - 25 * 86_400_000, text: "Milestone reached: Halfway — 100 km" },
  ];
  return state;
}
