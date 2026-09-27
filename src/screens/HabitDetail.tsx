import { Flame, Link2, Pencil, Sparkles } from "lucide-react";
import { BarChart, Heatmap } from "../components/charts";
import { HabitIcon } from "../components/items";
import { Button, Card, EmptyState, IconButton, List, PageHeader, Row, SectionTitle, Stat, Toggle } from "../components/ui";
import { fmtNum, scheduleLabel, targetLabel } from "../lib/actions";
import { addDays, formatDay, rangeKeys, todayKey, WEEKDAYS_SHORT, weekdayIndex } from "../lib/date";
import { habitStreak, isActiveOn, isDoneOn, isScheduledOn, precisionRate, ratioOn, targetOn, valueOn } from "../lib/metrics";
import { useStore } from "../lib/store";
import { navigate, toast, useUI } from "../lib/ui";

export function HabitDetail({ id }: { id: string }) {
  const state = useStore();
  const openSheet = useUI((s) => s.openSheet);
  const habit = state.habits.find((h) => h.id === id);
  const today = todayKey();
  if (!habit) {
    return (
      <div>
        <PageHeader title="Habit" back={{ name: "goals", tab: "habits" }} />
        <EmptyState icon="🤷" title="Habit not found" body="It may have been deleted." />
      </div>
    );
  }
  const goal = state.goals.find((g) => g.id === habit.goalId);
  const streak = habitStreak(habit, state.logs, today);
  const p30 = precisionRate(habit, state.logs, addDays(today, -29), today);
  const pAll = precisionRate(habit, state.logs, habit.createdAt, today);
  let completions = 0;
  let total = 0;
  for (const [day, row] of Object.entries(state.logs)) {
    const e = row[habit.id];
    if (!e) continue;
    total += e.value;
    if (isDoneOn(habit, state.logs, day)) completions++;
  }
  const last14 = rangeKeys(addDays(today, -13), today);
  const bars = last14.map((k) => ({
    label: WEEKDAYS_SHORT[weekdayIndex(k)][0],
    value: isActiveOn(habit, k) ? valueOn(state.logs, habit.id, k) : null,
    tip: formatDay(k, { weekday: "short", month: "short", day: "numeric" }),
    highlight: isDoneOn(habit, state.logs, k),
  }));
  const maxBar = Math.max(targetOn(habit, today), ...bars.map((b) => b.value ?? 0));

  const wd = Array(7).fill(0);
  const wdN = Array(7).fill(0);
  for (let k = addDays(today, -55); k <= today; k = addDays(k, 1)) {
    if (!isScheduledOn(habit, k) || habit.schedule.type === "weekly") continue;
    wd[weekdayIndex(k)] += ratioOn(habit, state.logs, k);
    wdN[weekdayIndex(k)]++;
  }

  return (
    <div>
      <PageHeader
        title=""
        large={false}
        back={{ name: "goals", tab: "habits" }}
        right={
          <IconButton label="Edit habit" onClick={() => openSheet({ type: "habit", id: habit.id })}>
            <Pencil size={18} />
          </IconButton>
        }
      />
      <div className="-mt-4 mb-5 flex items-center gap-4">
        <HabitIcon habit={habit} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{habit.name}</h1>
          <p className="text-sm text-fg-3">
            {targetLabel(targetOn(habit, today), habit.unit)} · {scheduleLabel(habit.schedule)}
            {habit.reminder ? ` · ⏰ ${habit.reminder}` : ""}
          </p>
        </div>
      </div>

      {habit.archived && (
        <Card className="mb-4 flex items-center justify-between p-4">
          <span className="text-sm text-fg-2">This habit is archived.</span>
          <Button size="sm" variant="secondary" onClick={() => state.restoreHabit(habit.id)}>
            Restore
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Current streak" value={<span className="flex items-center gap-1.5">{streak.current} <Flame size={20} className="text-orange-400" /></span>} sub={streak.unit} />
        <Stat label="Best streak" value={streak.best} sub={streak.unit} />
        <Stat label="Precision · 30 days" value={p30 === null ? "—" : `${Math.round(p30 * 100)}%`} sub={pAll === null ? undefined : `${Math.round(pAll * 100)}% all-time`} />
        <Stat label="Completions" value={completions} sub={`${fmtNum(Math.round(total * 10) / 10)} ${habit.unit} total`} />
      </div>

      {!habit.archived && (
        <Button full className="mt-4" onClick={() => openSheet({ type: "log", habitId: habit.id, day: today })}>
          Log today
        </Button>
      )}

      <SectionTitle>Consistency</SectionTitle>
      <Card className="p-4">
        <Heatmap
          valueFor={(k) => (isScheduledOn(habit, k) ? (habit.schedule.type === "weekly" && !valueOn(state.logs, habit.id, k) ? null : ratioOn(habit, state.logs, k)) : null)}
          onSelect={(k) => openSheet({ type: "log", habitId: habit.id, day: k })}
        />
      </Card>

      <SectionTitle>Last 14 days</SectionTitle>
      <Card className="px-3 pb-2 pt-4">
        <BarChart bars={bars} max={maxBar} color={`var(--accent)`} format={(v) => `${fmtNum(v)} ${habit.unit}`} />
      </Card>

      {habit.schedule.type !== "weekly" && wdN.some((n) => n > 0) && (
        <>
          <SectionTitle>By weekday</SectionTitle>
          <Card className="px-3 pb-2 pt-4">
            <BarChart
              height={130}
              max={1}
              bars={wd.map((s, i) => ({ label: WEEKDAYS_SHORT[i], value: wdN[i] ? s / wdN[i] : null, tip: `${WEEKDAYS_SHORT[i]} · last 8 weeks` }))}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </Card>
        </>
      )}

      <SectionTitle>Settings</SectionTitle>
      <List>
        <Row>
          <Sparkles size={18} className="text-accent-2" />
          <div className="flex-1">
            <div className="text-sm font-medium">Improvement Mode</div>
            <div className="text-xs text-fg-3">Adjusts the target weekly based on your precision</div>
          </div>
          <Toggle
            checked={habit.improvementMode}
            onChange={(v) => {
              state.updateHabit(habit.id, { improvementMode: v, lastAdjust: v ? todayKey() : habit.lastAdjust });
              toast(v ? "Improvement Mode on" : "Improvement Mode off");
            }}
          />
        </Row>
        <Row onClick={goal ? () => navigate({ name: "goal", id: goal.id }) : () => openSheet({ type: "habit", id: habit.id })}>
          <Link2 size={18} className="text-fg-3" />
          <div className="flex-1">
            <div className="text-sm font-medium">{goal ? `${goal.emoji} ${goal.title}` : "Not linked to a goal"}</div>
            <div className="text-xs text-fg-3">{goal ? (habit.linkUnits ? `Each ${habit.unit} counts toward the goal` : "Linked goal") : "Tap to link"}</div>
          </div>
        </Row>
      </List>

      {habit.targetHistory.length > 1 && (
        <>
          <SectionTitle>Target history</SectionTitle>
          <List>
            {[...habit.targetHistory].reverse().map((t, i) => (
              <Row key={t.from + i}>
                <span className="flex-1 text-sm">
                  {targetLabel(t.target, habit.unit)}
                </span>
                <span className="text-xs text-fg-3">from {formatDay(t.from)}</span>
              </Row>
            ))}
          </List>
        </>
      )}
      <p className="mt-6 text-center text-xs text-fg-3">Tracking since {formatDay(habit.createdAt, { month: "short", day: "numeric", year: "numeric" })}</p>
    </div>
  );
}
