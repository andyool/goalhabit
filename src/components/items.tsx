import { motion } from "motion/react";
import { Check, ChevronRight, Flame, Lightbulb, Link2, Sparkles, X } from "lucide-react";
import { applySuggestion, fmtNum, scheduleLabel, toggleHabit } from "../lib/actions";
import { COLORS } from "../lib/content";
import { relativeDay, todayKey, type DateKey } from "../lib/date";
import type { Suggestion } from "../lib/insights";
import { goalCurrent, goalPace, goalProgress, habitStreak, isDueOn, ratioOn, targetOn, valueOn, weekCompletions, type PaceStatus } from "../lib/metrics";
import { useStore } from "../lib/store";
import type { Goal, Habit } from "../lib/types";
import { navigate, useUI } from "../lib/ui";
import { Badge, cx, ProgressBar, Ring } from "./ui";

export function HabitIcon({ habit, size = 44 }: { habit: Pick<Habit, "emoji" | "color">; size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-2xl" style={{ width: size, height: size, background: `${COLORS[habit.color]}24`, fontSize: size * 0.48 }}>
      {habit.emoji}
    </span>
  );
}

export function HabitRow({ habit, day }: { habit: Habit; day: DateKey }) {
  const logs = useStore((s) => s.logs);
  const goal = useStore((s) => (habit.goalId ? s.goals.find((g) => g.id === habit.goalId) : undefined));
  const openSheet = useUI((s) => s.openSheet);
  const value = valueOn(logs, habit.id, day);
  const target = targetOn(habit, day);
  const ratio = ratioOn(habit, logs, day);
  const done = ratio >= 1;
  const streak = habitStreak(habit, logs, day);
  const due = isDueOn(habit, logs, day);
  const color = COLORS[habit.color];
  const future = day > todayKey();
  const isCheck = target === 1;

  let sub: string;
  if (habit.schedule.type === "weekly") sub = `${weekCompletions(habit, logs, day)}/${habit.schedule.times} this week`;
  else if (isCheck) sub = scheduleLabel(habit.schedule);
  else sub = `${fmtNum(value)} / ${fmtNum(target)} ${habit.unit}`;

  return (
    <motion.div layout className={cx("card flex items-center gap-3 p-3 pr-3.5 transition", done && "opacity-75", !due && !done && "opacity-60")}>
      <button type="button" onClick={() => !future && openSheet({ type: "log", habitId: habit.id, day })} className="flex min-w-0 flex-1 items-center gap-3 text-left" disabled={future}>
        <HabitIcon habit={habit} />
        <div className="min-w-0 flex-1">
          <div className={cx("truncate font-semibold", done && "text-fg-2 line-through decoration-fg-3/60")}>{habit.name}</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-fg-3">
            <span className="num">{sub}</span>
            {streak.current > 1 && (
              <span className="flex items-center gap-0.5 text-orange-400">
                <Flame size={12} /> {streak.current}
                {streak.unit === "weeks" ? "w" : ""}
              </span>
            )}
            {goal && <Link2 size={11} className="shrink-0" aria-label={`Linked to ${goal.title}`} />}
            {habit.improvementMode && <Sparkles size={11} className="shrink-0 text-accent-2" aria-label="Improvement Mode" />}
          </div>
          {!isCheck && ratio > 0 && ratio < 1 && (
            <div className="mt-1.5 pr-4">
              <ProgressBar value={ratio} color={color} height={4} />
            </div>
          )}
        </div>
      </button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        disabled={future}
        onClick={() => toggleHabit(habit.id, day)}
        aria-label={done ? `Mark ${habit.name} not done` : `Complete ${habit.name}`}
        className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full disabled:opacity-30"
      >
        <Ring value={ratio} size={44} stroke={3.5} color={color} gradient={false} track="var(--line)">
          <motion.span
            initial={false}
            animate={{ scale: done ? 1 : 0.6, opacity: done ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="grid h-[34px] w-[34px] place-items-center rounded-full text-white"
            style={{ background: color }}
          >
            <Check size={18} strokeWidth={3} />
          </motion.span>
        </Ring>
      </motion.button>
    </motion.div>
  );
}

export const PACE_META: Record<PaceStatus, { label: string; tone: "good" | "warn" | "bad" | "accent" | "default" }> = {
  done: { label: "Achieved", tone: "good" },
  "on-track": { label: "On track", tone: "good" },
  behind: { label: "Behind", tone: "warn" },
  "off-track": { label: "Off track", tone: "bad" },
  overdue: { label: "Overdue", tone: "bad" },
  "no-deadline": { label: "Open", tone: "default" },
};

export function useGoalStats(goal: Goal) {
  const habits = useStore((s) => s.habits);
  const logs = useStore((s) => s.logs);
  const progress = goalProgress(goal, habits, logs);
  const pace = goalPace(goal, progress);
  const current = goal.kind === "numeric" ? goalCurrent(goal, habits, logs) : null;
  return { progress, pace, current };
}

export function GoalCard({ goal, compact }: { goal: Goal; compact?: boolean }) {
  const { progress, pace, current } = useGoalStats(goal);
  const color = COLORS[goal.color];
  const meta = PACE_META[pace.status];
  const next = goal.milestones.find((m) => !m.done);

  if (compact) {
    return (
      <button type="button" onClick={() => navigate({ name: "goal", id: goal.id })} className="card flex w-56 shrink-0 flex-col gap-3 p-4 text-left transition active:scale-[0.98]">
        <div className="flex items-center justify-between">
          <span className="text-2xl">{goal.emoji}</span>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
        <div className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">{goal.title}</div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-fg-3">{current !== null ? `${fmtNum(current)} / ${fmtNum(goal.targetValue)} ${goal.unit}` : `${goal.milestones.filter((m) => m.done).length}/${goal.milestones.length} milestones`}</span>
            <span className="num font-semibold">{Math.round(progress * 100)}%</span>
          </div>
          <ProgressBar value={progress} color={color} marker={pace.status !== "done" && pace.status !== "no-deadline" ? pace.expected : undefined} />
        </div>
      </button>
    );
  }

  return (
    <button type="button" onClick={() => navigate({ name: "goal", id: goal.id })} className="card w-full p-4 text-left transition active:scale-[0.99]">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: `${color}24` }}>
          {goal.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold leading-snug">{goal.title}</div>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
          <div className="mt-0.5 text-xs text-fg-3">
            {goal.deadline ? `Due ${relativeDay(goal.deadline)}` : "No deadline"}
            {next ? ` · Next: ${next.title}` : ""}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-fg-2">
            {current !== null ? (
              <>
                <span className="num font-semibold text-fg">{fmtNum(current)}</span> / {fmtNum(goal.targetValue)} {goal.unit}
              </>
            ) : (
              `${goal.milestones.filter((m) => m.done).length} of ${goal.milestones.length} milestones`
            )}
          </span>
          <span className="num font-semibold">{Math.round(progress * 100)}%</span>
        </div>
        <ProgressBar value={progress} color={color} height={8} marker={pace.status !== "done" && pace.status !== "no-deadline" ? pace.expected : undefined} />
      </div>
    </button>
  );
}

export function SuggestionCard({ s, compact }: { s: Suggestion; compact?: boolean }) {
  const dismiss = useStore((st) => st.dismissSuggestion);
  const tone = s.tone === "warn" ? "border-warn/25" : s.tone === "good" ? "border-good/25" : "border-accent/25";
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cx("card relative overflow-hidden border p-4", tone)}>
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card-2 text-xl">{s.icon}</span>
        <div className="min-w-0 flex-1 pr-5">
          <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent-2">
            <Lightbulb size={11} /> Suggestion
          </div>
          <div className="font-semibold leading-snug">{s.title}</div>
          <p className={cx("mt-1 text-sm text-fg-2", compact && "line-clamp-2")}>{s.body}</p>
          {s.action && (
            <button type="button" onClick={() => applySuggestion(s)} className="mt-3 inline-flex items-center gap-1 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white transition active:scale-95">
              {s.action.label} <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
      <button type="button" onClick={() => dismiss(s.key)} className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-fg-3 hover:bg-card-2 hover:text-fg" aria-label="Dismiss">
        <X size={15} />
      </button>
    </motion.div>
  );
}
