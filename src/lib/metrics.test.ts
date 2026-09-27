import { describe, expect, it } from "vitest";
import { addDays, startOfWeek, toKey, weekdayIndex } from "./date";
import {
  dayStats,
  focusScore,
  goalCurrent,
  goalPace,
  goalProgress,
  habitStreak,
  isDueOn,
  levelFromXp,
  lockedIn,
  precisionRate,
  targetOn,
} from "./metrics";
import type { Goal, Habit, Logs } from "./types";

const MON = "2026-09-07"; // a Monday

function habit(p: Partial<Habit> = {}): Habit {
  const target = p.target ?? 1;
  const createdAt = p.createdAt ?? "2026-08-01";
  return {
    id: p.id ?? "h1",
    name: "Test",
    emoji: "✅",
    color: "blue",
    schedule: { type: "daily" },
    target,
    unit: "times",
    targetHistory: [{ from: createdAt, target }],
    linkUnits: false,
    timeOfDay: "anytime",
    improvementMode: false,
    createdAt,
    archived: false,
    order: 0,
    ...p,
  };
}

function log(logs: Logs, day: string, id: string, value: number) {
  logs[day] = { ...(logs[day] ?? {}), [id]: { value, at: new Date(`${day}T08:00:00`).getTime() } };
}

describe("dates", () => {
  it("computes weekdays and week starts (Monday first)", () => {
    expect(weekdayIndex(MON)).toBe(0);
    expect(weekdayIndex(addDays(MON, 6))).toBe(6);
    expect(startOfWeek(addDays(MON, 4))).toBe(MON);
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("targets", () => {
  it("scores past days against the target that applied then", () => {
    const h = habit({ target: 20, targetHistory: [{ from: "2026-08-01", target: 10 }, { from: MON, target: 20 }] });
    expect(targetOn(h, addDays(MON, -1))).toBe(10);
    expect(targetOn(h, MON)).toBe(20);
  });
});

describe("day completion and focus score", () => {
  it("counts partial progress", () => {
    const a = habit({ id: "a", target: 10 });
    const b = habit({ id: "b" });
    const logs: Logs = {};
    log(logs, MON, "a", 5);
    log(logs, MON, "b", 1);
    const s = dayStats([a, b], logs, MON);
    expect(s.due).toBe(2);
    expect(s.done).toBe(1);
    expect(s.completion).toBeCloseTo(0.75);
  });

  it("returns null when nothing is due", () => {
    const h = habit({ schedule: { type: "weekdays", days: [0] } });
    expect(dayStats([h], {}, addDays(MON, 1)).completion).toBeNull();
    expect(focusScore([h], {}, addDays(MON, 1))).toBeNull();
  });

  it("blends today with momentum", () => {
    const h = habit();
    const logs: Logs = {};
    for (let i = 1; i <= 6; i++) log(logs, addDays(MON, -i), "h1", 1);
    // today not done: 0.7 * 0 + 0.3 * 1
    expect(focusScore([h], logs, MON)).toBe(30);
    log(logs, MON, "h1", 1);
    expect(focusScore([h], logs, MON)).toBe(100);
  });
});

describe("flexible weekly habits", () => {
  it("only become due when the quota would otherwise be missed", () => {
    const h = habit({ schedule: { type: "weekly", times: 2 } });
    const logs: Logs = {};
    expect(isDueOn(h, logs, MON)).toBe(false);
    expect(isDueOn(h, logs, addDays(MON, 5))).toBe(true); // Sat: 2 needed, 2 days left
    log(logs, addDays(MON, 1), "h1", 1);
    expect(isDueOn(h, logs, addDays(MON, 5))).toBe(false); // 1 needed, 2 days left
    expect(isDueOn(h, logs, addDays(MON, 6))).toBe(true);
    expect(isDueOn(h, logs, addDays(MON, 1))).toBe(true); // done that day counts
  });

  it("measures precision against the prorated quota", () => {
    const h = habit({ schedule: { type: "weekly", times: 3 }, createdAt: "2026-08-01" });
    const logs: Logs = {};
    [0, 2, 4].forEach((d) => log(logs, addDays(MON, d), "h1", 1));
    expect(precisionRate(h, logs, MON, addDays(MON, 6))).toBeCloseTo(1);
    const logs2: Logs = {};
    log(logs2, MON, "h1", 1);
    expect(precisionRate(h, logs2, MON, addDays(MON, 6))).toBeCloseTo(1 / 3);
  });
});

describe("streaks", () => {
  it("does not break the streak for today before it's done", () => {
    const h = habit({ createdAt: addDays(MON, -10) });
    const logs: Logs = {};
    for (let i = 1; i <= 4; i++) log(logs, addDays(MON, -i), "h1", 1);
    expect(habitStreak(h, logs, MON).current).toBe(4);
    log(logs, MON, "h1", 1);
    expect(habitStreak(h, logs, MON).current).toBe(5);
    expect(habitStreak(h, logs, addDays(MON, 2)).current).toBe(0);
  });

  it("skips unscheduled days", () => {
    const h = habit({ schedule: { type: "weekdays", days: [0, 2, 4] }, createdAt: addDays(MON, -7) });
    const logs: Logs = {};
    [-7, -5, -3, 0].forEach((d) => log(logs, addDays(MON, d), "h1", 1));
    expect(habitStreak(h, logs, MON).current).toBe(4);
  });
});

describe("locked-in score", () => {
  it("measures time since the run of >=70% days began", () => {
    const a = habit({ id: "a", createdAt: addDays(MON, -10) });
    const b = habit({ id: "b", createdAt: addDays(MON, -10) });
    const c = habit({ id: "c", createdAt: addDays(MON, -10) });
    const logs: Logs = {};
    for (let i = 1; i <= 3; i++) {
      log(logs, addDays(MON, -i), "a", 1);
      log(logs, addDays(MON, -i), "b", 1);
      log(logs, addDays(MON, -i), "c", 1);
    }
    log(logs, addDays(MON, -4), "a", 1); // 33%: breaks the run
    const now = new Date(`${MON}T12:00:00`);
    const r = lockedIn([a, b, c], logs, now);
    expect(r.start).toBe(addDays(MON, -3));
    expect(Math.round(r.ms / 3_600_000)).toBe(3 * 24 + 12);
    expect(r.todayLocked).toBe(false);
    expect(r.bestDays).toBe(3);
  });

  it("is zero when yesterday broke the run and today isn't locked yet", () => {
    const a = habit({ createdAt: addDays(MON, -5) });
    const r = lockedIn([a], {}, new Date(`${MON}T12:00:00`));
    expect(r.ms).toBe(0);
    expect(r.start).toBeNull();
  });
});

describe("goals", () => {
  const base: Goal = {
    id: "g",
    title: "Read",
    emoji: "📚",
    color: "blue",
    category: "learning",
    why: "",
    kind: "numeric",
    tracking: "cumulative",
    startValue: 0,
    targetValue: 100,
    unit: "pages",
    entries: [],
    milestones: [],
    startDate: MON,
    deadline: addDays(MON, 10),
    archived: false,
    createdAt: MON,
    order: 0,
  };

  it("adds unit-linked habit logs and manual entries", () => {
    const h = habit({ goalId: "g", linkUnits: true, target: 10 });
    const logs: Logs = {};
    log(logs, MON, "h1", 12);
    log(logs, addDays(MON, 1), "h1", 8);
    log(logs, addDays(MON, -1), "h1", 50); // before the goal started
    const g = { ...base, entries: [{ id: "e", date: MON, value: 5 }] };
    expect(goalCurrent(g, [h], logs, addDays(MON, 1))).toBe(25);
    expect(goalProgress(g, [h], logs, addDays(MON, 1))).toBeCloseTo(0.25);
  });

  it("handles decreasing measurement goals", () => {
    const g: Goal = { ...base, tracking: "measurement", startValue: 84, targetValue: 78, unit: "kg", entries: [{ id: "a", date: MON, value: 82 }, { id: "b", date: addDays(MON, 2), value: 81 }] };
    expect(goalCurrent(g, [], {}, addDays(MON, 1))).toBe(82);
    expect(goalProgress(g, [], {}, addDays(MON, 3))).toBeCloseTo(0.5);
  });

  it("flags goals that fall behind the expected pace", () => {
    expect(goalPace(base, 0.1, addDays(MON, 5)).status).toBe("off-track");
    expect(goalPace(base, 0.45, addDays(MON, 5)).status).toBe("on-track");
    expect(goalPace(base, 0.4, addDays(MON, 5)).status).toBe("behind");
    expect(goalPace(base, 0.1, addDays(MON, 1)).status).toBe("on-track"); // grace period
    expect(goalPace(base, 0.5, addDays(MON, 12)).status).toBe("overdue");
    expect(goalPace(base, 1, addDays(MON, 12)).status).toBe("done");
  });

  it("scores milestone goals by completed milestones", () => {
    const g: Goal = { ...base, kind: "milestones", milestones: [{ id: "1", title: "a", done: true }, { id: "2", title: "b", done: false }] };
    expect(goalProgress(g, [], {})).toBe(0.5);
  });
});

describe("levels", () => {
  it("grows level thresholds", () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(249).level).toBe(1);
    expect(levelFromXp(250).level).toBe(2);
    expect(levelFromXp(750).level).toBe(3);
  });
});

it("toKey uses the local calendar", () => {
  expect(toKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
});
