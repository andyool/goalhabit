import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, Lock, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { GoalCard, HabitRow, SuggestionCard } from "../components/items";
import { Button, Card, cx, EmptyState, Ring, SectionTitle } from "../components/ui";
import { ENERGY, MOODS } from "../lib/content";
import { addDays, formatDay, greeting, rangeKeys, startOfWeek, todayKey, WEEKDAYS_LETTER, type DateKey } from "../lib/date";
import { activeGoals, activeHabits, buildSuggestions } from "../lib/insights";
import { computeXp, dayStats, focusScore, isScheduledOn, levelFromXp, lockedIn, splitDuration } from "../lib/metrics";
import { useStore } from "../lib/store";
import { navigate, useUI } from "../lib/ui";
import type { TimeOfDay } from "../lib/types";

const GROUPS: { id: TimeOfDay; label: string; emoji: string }[] = [
  { id: "morning", label: "Morning", emoji: "🌅" },
  { id: "afternoon", label: "Afternoon", emoji: "☀️" },
  { id: "evening", label: "Evening", emoji: "🌙" },
  { id: "anytime", label: "Anytime", emoji: "⏳" },
];

function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function Today() {
  const state = useStore();
  const openSheet = useUI((s) => s.openSheet);
  const now = useNow();
  const today = todayKey(now);
  const [day, setDay] = useState<DateKey>(today);
  const habits = activeHabits(state.habits);
  const all = state.habits;
  const stats = dayStats(all, state.logs, day);
  const score = focusScore(all, state.logs, day);
  const locked = lockedIn(all, state.logs, now);
  const dur = splitDuration(locked.ms);
  const weekDays = rangeKeys(startOfWeek(today), addDays(startOfWeek(today), 6));
  const suggestions = buildSuggestions(state, today);
  const level = levelFromXp(
    computeXp(all, state.logs, state.goals, { checkIns: Object.keys(state.checkIns).length, reviews: state.reviews.length, lessons: state.lessonsRead.length }),
  );
  const goals = activeGoals(state.goals).filter((g) => !g.completedAt);
  const dayHabits = habits.filter((h) => isScheduledOn(h, day));
  const hiddenCount = habits.length - dayHabits.length;
  const checkIn = state.checkIns[day];

  return (
    <div>
      <header className="safe-top flex items-center justify-between pb-4 pt-5">
        <div>
          <p className="text-[13px] font-medium text-fg-3">{formatDay(today, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">
            {greeting(now)}
            {state.profile.name ? `, ${state.profile.name}` : ""}
          </h1>
        </div>
        <button type="button" onClick={() => navigate({ name: "profile" })} className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3 transition active:scale-95">
          <Ring value={level.progress} size={30} stroke={3}>
            <span className="text-[11px] font-bold">{level.level}</span>
          </Ring>
          <span className="text-xs font-semibold text-fg-2">{level.title}</span>
        </button>
      </header>

      {/* Week strip */}
      <div className="mb-4 grid grid-cols-7 gap-1">
        {weekDays.map((k, i) => {
          const c = dayStats(all, state.logs, k).completion;
          const future = k > today;
          const selected = k === day;
          return (
            <button
              key={k}
              type="button"
              disabled={future}
              onClick={() => setDay(k)}
              className={cx("flex flex-col items-center gap-1.5 rounded-2xl py-2 transition", selected ? "bg-card ring-1 ring-line" : "hover:bg-card/60", future && "opacity-35")}
            >
              <span className={cx("text-[11px] font-semibold", k === today ? "text-accent-2" : "text-fg-3")}>{WEEKDAYS_LETTER[i]}</span>
              <Ring value={future ? 0 : (c ?? 0)} size={34} stroke={3.5} gradient={false} color={c !== null && c >= 0.7 ? "var(--accent)" : "var(--accent-2)"}>
                <span className={cx("text-[12px] font-semibold", selected ? "text-fg" : "text-fg-2")}>{Number(k.slice(-2))}</span>
              </Ring>
            </button>
          );
        })}
      </div>

      {/* Hero */}
      <Card glow className="p-5">
        <div className="flex items-center gap-5">
          <Ring value={(score ?? 0) / 100} size={116} stroke={11}>
            <div className="text-center">
              <div className="text-[34px] font-bold leading-none tracking-tight">{score ?? "–"}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-fg-3">Focus</div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-3">
              <Lock size={11} /> Locked in
            </div>
            <div className="mt-1 flex items-baseline gap-1 font-bold tracking-tight">
              <span className="text-[26px]">{dur.days}</span>
              <span className="mr-1 text-sm text-fg-3">d</span>
              <span className="text-[26px]">{String(dur.hours).padStart(2, "0")}</span>
              <span className="mr-1 text-sm text-fg-3">h</span>
              <span className="text-[26px]">{String(dur.minutes).padStart(2, "0")}</span>
              <span className="text-sm text-fg-3">m</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-fg-3">
              {locked.ms === 0
                ? "Complete 70% of today's habits to lock in."
                : locked.todayLocked
                  ? "Today is locked in. Keep the run going."
                  : "Hit 70% today to extend your run."}
            </p>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="font-semibold">
                {stats.done}/{stats.due}
              </span>
              <span className="text-fg-3">habits {day === today ? "today" : formatDay(day, { weekday: "short" })}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Suggestions */}
      {day === today && suggestions.length > 0 && (
        <div className="mt-4">
          <AnimatePresence mode="popLayout">
            <SuggestionCard key={suggestions[0].key} s={suggestions[0]} compact />
          </AnimatePresence>
          {suggestions.length > 1 && (
            <button type="button" onClick={() => navigate({ name: "insights" })} className="mt-2 flex w-full items-center justify-center gap-1 py-1 text-xs font-semibold text-fg-3 hover:text-fg">
              {suggestions.length - 1} more suggestions <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* Check-in */}
      {day <= today && (!checkIn || day !== today) && (
        <CheckInCard key={day} day={day} />
      )}

      {/* Habits */}
      <SectionTitle
        right={
          <button type="button" onClick={() => openSheet({ type: "habit" })} className="flex items-center gap-1 text-[13px] font-semibold text-accent-2">
            <Plus size={15} /> Habit
          </button>
        }
      >
        {day === today ? "Today's habits" : formatDay(day, { weekday: "long", month: "short", day: "numeric" })}
      </SectionTitle>

      {habits.length === 0 ? (
        <EmptyState
          icon="🌱"
          title="Start with one small habit"
          body="Habits are the daily actions that drive your goals. Pick something so small you can't say no."
          action={<Button onClick={() => openSheet({ type: "habit" })}>Add a habit</Button>}
        />
      ) : dayHabits.length === 0 ? (
        <EmptyState icon="🛌" title="Rest day" body="Nothing scheduled for this day. Recovery is part of the system." />
      ) : (
        <div className="space-y-5">
          {GROUPS.map((g) => {
            const list = dayHabits.filter((h) => h.timeOfDay === g.id);
            if (!list.length) return null;
            return (
              <div key={g.id}>
                <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold text-fg-3">
                  <span>{g.emoji}</span> {g.label}
                </div>
                <motion.div layout className="space-y-2">
                  {list.map((h) => (
                    <HabitRow key={h.id} habit={h} day={day} />
                  ))}
                </motion.div>
              </div>
            );
          })}
          {hiddenCount > 0 && <p className="px-1 text-center text-xs text-fg-3">{hiddenCount} habit{hiddenCount > 1 ? "s" : ""} not scheduled this day</p>}
        </div>
      )}

      {/* Goals */}
      {goals.length > 0 && (
        <>
          <SectionTitle
            right={
              <button type="button" onClick={() => navigate({ name: "goals" })} className="flex items-center text-[13px] font-semibold text-accent-2">
                All <ChevronRight size={15} />
              </button>
            }
          >
            Goals
          </SectionTitle>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} compact />
            ))}
          </div>
        </>
      )}

      {checkIn && day === today && (
        <div className="mt-6 text-center text-xs text-fg-3">
          Checked in today: {MOODS[checkIn.mood - 1]} mood · {ENERGY[checkIn.energy - 1]} energy
        </div>
      )}
    </div>
  );
}

function CheckInCard({ day }: { day: DateKey }) {
  const existing = useStore((s) => s.checkIns[day]);
  const setCheckIn = useStore((s) => s.setCheckIn);
  const [mood, setMood] = useState(existing?.mood ?? 0);
  const [energy, setEnergy] = useState(existing?.energy ?? 0);

  const save = (m: number, e: number) => {
    if (m && e) setCheckIn(day, { mood: m, energy: e });
  };

  return (
    <Card className="mt-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">{day === todayKey() ? "How are you today?" : `Check-in · ${formatDay(day, { weekday: "short", month: "short", day: "numeric" })}`}</div>
        {existing && <span className="text-xs text-good">Saved</span>}
      </div>
      <div className="space-y-2.5">
        {[
          { label: "Mood", icons: MOODS, value: mood, set: (v: number) => (setMood(v), save(v, energy)) },
          { label: "Energy", icons: ENERGY, value: energy, set: (v: number) => (setEnergy(v), save(mood, v)) },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="w-14 text-xs font-medium text-fg-3">{row.label}</span>
            <div className="grid flex-1 grid-cols-5 gap-1.5">
              {row.icons.map((e, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => row.set(i + 1)}
                  aria-label={`${row.label} ${i + 1} of 5`}
                  className={cx("rounded-xl py-1.5 text-xl transition active:scale-90", row.value === i + 1 ? "bg-accent-soft ring-1 ring-accent" : "bg-card-2 grayscale-[0.4] hover:grayscale-0")}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
