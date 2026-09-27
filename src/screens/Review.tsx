import { Star } from "lucide-react";
import { useState } from "react";
import { WeekDots } from "../components/charts";
import { HabitIcon } from "../components/items";
import { Button, Card, cx, Field, inputCls, List, PageHeader, Row, SectionTitle, Segmented, Stat } from "../components/ui";
import { addDays, formatDay, rangeKeys, startOfWeek, todayKey, type DateKey } from "../lib/date";
import { activeGoals, activeHabits, reviewWeekDue } from "../lib/insights";
import { averageFocus, dayStats, LOCK_IN_THRESHOLD, precisionRate } from "../lib/metrics";
import { useStore } from "../lib/store";
import { goBack, toast } from "../lib/ui";

export function Review() {
  const state = useStore();
  const today = todayKey();
  const thisWeek = startOfWeek(today);
  const lastWeek = addDays(thisWeek, -7);
  const due = reviewWeekDue(state, today);
  const [week, setWeek] = useState<DateKey>(due ?? lastWeek);
  const existing = state.reviews.find((r) => r.weekStart === week);
  const end = addDays(week, 6) > today ? today : addDays(week, 6);
  const days = rangeKeys(week, addDays(week, 6));
  const habits = activeHabits(state.habits);
  const focus = averageFocus(state.habits, state.logs, week, end);
  const prevFocus = averageFocus(state.habits, state.logs, addDays(week, -7), addDays(week, -1));
  const comps = days.map((k) => (k > today ? null : dayStats(state.habits, state.logs, k).completion));
  const lockedDays = comps.filter((c) => c !== null && c >= LOCK_IN_THRESHOLD).length;
  const done = days.reduce((a, k) => a + (k > today ? 0 : dayStats(state.habits, state.logs, k).done), 0);
  const ranked = habits
    .map((h) => ({ h, p: precisionRate(h, state.logs, week, end) }))
    .filter((x): x is { h: (typeof habits)[number]; p: number } => x.p !== null)
    .sort((a, b) => b.p - a.p);
  const goals = activeGoals(state.goals).filter((g) => !g.completedAt);

  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [win, setWin] = useState(existing?.win ?? "");
  const [obstacle, setObstacle] = useState(existing?.obstacle ?? "");
  const [focusGoalId, setFocusGoalId] = useState(existing?.focusGoalId ?? goals[0]?.id ?? "");
  const [intention, setIntention] = useState(existing?.intention ?? "");

  const switchWeek = (w: DateKey) => {
    setWeek(w);
    const r = state.reviews.find((x) => x.weekStart === w);
    setRating(r?.rating ?? 0);
    setWin(r?.win ?? "");
    setObstacle(r?.obstacle ?? "");
    setFocusGoalId(r?.focusGoalId ?? goals[0]?.id ?? "");
    setIntention(r?.intention ?? "");
  };

  const save = () => {
    if (!rating) return toast("Rate your week first", "warn");
    state.saveReview({ weekStart: week, rating, win: win.trim(), obstacle: obstacle.trim(), focusGoalId: focusGoalId || undefined, intention: intention.trim(), createdAt: Date.now() });
    if (!existing) state.logActivity(`Weekly review completed · ${formatDay(week)}`);
    toast(existing ? "Review updated" : "Review saved · +40 XP", "good");
    goBack({ name: "profile" });
  };

  return (
    <div>
      <PageHeader title="Weekly review" subtitle={`${formatDay(week)} – ${formatDay(addDays(week, 6))}`} back={{ name: "profile" }} />
      <Segmented
        value={week === thisWeek ? "this" : "last"}
        onChange={(v) => switchWeek(v === "this" ? thisWeek : lastWeek)}
        options={[
          { value: "last", label: "Last week" },
          { value: "this", label: "This week" },
        ]}
      />

      <Card className="mt-4 flex items-center justify-between p-4">
        <div>
          <div className="text-xs text-fg-3">Daily consistency</div>
          <div className="mt-0.5 text-sm font-semibold">{lockedDays} of 7 days locked in</div>
        </div>
        <WeekDots values={comps} days={days} />
      </Card>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat
          label="Avg Focus Score"
          value={focus ?? "—"}
          sub={focus !== null && prevFocus !== null ? `${focus >= prevFocus ? "▲" : "▼"} ${Math.abs(focus - prevFocus)} vs week before` : undefined}
        />
        <Stat label="Habits completed" value={done} />
      </div>

      {ranked.length > 0 && (
        <>
          <SectionTitle>Highlights</SectionTitle>
          <List>
            <Row>
              <HabitIcon habit={ranked[0].h} size={36} />
              <div className="flex-1">
                <div className="text-xs text-fg-3">Strongest habit</div>
                <div className="text-sm font-semibold">{ranked[0].h.name}</div>
              </div>
              <span className="num text-sm font-semibold text-good">{Math.round(ranked[0].p * 100)}%</span>
            </Row>
            {ranked.length > 1 && (
              <Row>
                <HabitIcon habit={ranked[ranked.length - 1].h} size={36} />
                <div className="flex-1">
                  <div className="text-xs text-fg-3">Needs attention</div>
                  <div className="text-sm font-semibold">{ranked[ranked.length - 1].h.name}</div>
                </div>
                <span className="num text-sm font-semibold text-warn">{Math.round(ranked[ranked.length - 1].p * 100)}%</span>
              </Row>
            )}
          </List>
        </>
      )}

      <SectionTitle>Reflect</SectionTitle>
      <div className="space-y-4">
        <Field label="How was your week?">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className="rounded-xl p-1.5 transition active:scale-90" aria-label={`${n} stars`}>
                <Star size={30} className={cx(n <= rating ? "fill-amber-400 text-amber-400" : "text-line")} />
              </button>
            ))}
          </div>
        </Field>
        <Field label="Biggest win">
          <input className={inputCls} value={win} onChange={(e) => setWin(e.target.value)} placeholder="What are you proud of?" />
        </Field>
        <Field label="What got in the way?">
          <input className={inputCls} value={obstacle} onChange={(e) => setObstacle(e.target.value)} placeholder="Be honest — no judgement" />
        </Field>
        {goals.length > 0 && (
          <Field label="One focus goal for next week">
            <select className={inputCls} value={focusGoalId} onChange={(e) => setFocusGoalId(e.target.value)}>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.title}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Intention">
          <textarea className={cx(inputCls, "min-h-20 resize-none")} value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="Next week I will…" />
        </Field>
        <Button full size="lg" onClick={save}>
          {existing ? "Update review" : "Complete review"}
        </Button>
      </div>

      {state.reviews.length > 0 && (
        <>
          <SectionTitle>Past reviews</SectionTitle>
          <List>
            {[...state.reviews].reverse().map((r) => (
              <Row key={r.weekStart} onClick={() => switchWeek(r.weekStart)}>
                <div className="flex-1">
                  <div className="text-sm font-medium">Week of {formatDay(r.weekStart)}</div>
                  <div className="truncate text-xs text-fg-3">{r.intention || r.win || "—"}</div>
                </div>
                <span className="text-sm text-amber-400">{"★".repeat(r.rating)}</span>
              </Row>
            ))}
          </List>
        </>
      )}
    </div>
  );
}
