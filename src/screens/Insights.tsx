import { AnimatePresence } from "motion/react";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { BarChart, Heatmap, LineChart } from "../components/charts";
import { HabitIcon, SuggestionCard } from "../components/items";
import { Button, Card, EmptyState, PageHeader, ProgressBar, Segmented, SectionTitle, Stat } from "../components/ui";
import { COLORS } from "../lib/content";
import { addDays, rangeKeys, todayKey, WEEKDAYS_SHORT } from "../lib/date";
import { activeHabits, buildSuggestions, deepAnalysis, type AnalysisItem } from "../lib/insights";
import { averageFocus, completionHours, dayStats, focusScore, lockedIn, overallPrecision, precisionRate, weekdayPerformance } from "../lib/metrics";
import { useStore } from "../lib/store";
import { navigate } from "../lib/ui";
import { APP_NAME } from "../lib/brand";

type Range = "7" | "30" | "90";

function Delta({ now, before, suffix = "" }: { now: number | null; before: number | null; suffix?: string }) {
  if (now === null || before === null) return null;
  const d = Math.round(now - before);
  if (d === 0) return <span className="text-fg-3">No change vs previous</span>;
  return (
    <span className={d > 0 ? "text-good" : "text-bad"}>
      {d > 0 ? "▲" : "▼"} {Math.abs(d)}
      {suffix} vs previous
    </span>
  );
}

export function Insights() {
  const state = useStore();
  const [range, setRange] = useState<Range>("30");
  const today = todayKey();
  const n = Number(range);
  const from = addDays(today, -(n - 1));
  const prevFrom = addDays(from, -n);
  const prevTo = addDays(from, -1);
  const all = state.habits;
  const habits = activeHabits(all);

  const data = {
      focus: averageFocus(all, state.logs, from, today),
      focusPrev: averageFocus(all, state.logs, prevFrom, prevTo),
      precision: overallPrecision(habits, state.logs, from, today),
      precisionPrev: overallPrecision(habits, state.logs, prevFrom, prevTo),
      locked: lockedIn(all, state.logs),
      points: rangeKeys(from, today).map((k) => ({ key: k, value: focusScore(all, state.logs, k) })),
      weekday: weekdayPerformance(all, state.logs, addDays(today, -Math.max(n, 28)), addDays(today, -1)),
      hours: completionHours(all, state.logs, addDays(today, -Math.max(n, 28)), today),
      ranking: habits
        .map((h) => ({ h, p: precisionRate(h, state.logs, from, today) }))
        .filter((x): x is { h: (typeof habits)[number]; p: number } => x.p !== null)
        .sort((a, b) => b.p - a.p),
      completed: rangeKeys(from, today).reduce((a, k) => a + dayStats(all, state.logs, k).done, 0),
    suggestions: buildSuggestions(state, today),
    analysis: deepAnalysis(state, today),
  };

  if (!all.length) {
    return (
      <div>
        <PageHeader title="Insights" />
        <EmptyState icon="📊" title="Your patterns live here" body={`Track a few days of habits and ${APP_NAME} will surface your Focus Score trend, precision and patterns.`} />
      </div>
    );
  }

  const hourBars = data.hours.map((v, h) => ({
    label: h % 6 === 0 && h > 0 ? new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric" }) : "",
    value: v,
    tip: new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  }));

  return (
    <div>
      <PageHeader title="Insights" />
      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { value: "7", label: "7 days" },
          { value: "30", label: "30 days" },
          { value: "90", label: "90 days" },
        ]}
      />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Avg Focus Score" value={data.focus ?? "—"} sub={<Delta now={data.focus} before={data.focusPrev} />} />
        <Stat
          label="Precision Rate"
          value={data.precision === null ? "—" : `${Math.round(data.precision * 100)}%`}
          sub={<Delta now={data.precision === null ? null : data.precision * 100} before={data.precisionPrev === null ? null : data.precisionPrev * 100} suffix="%" />}
        />
        <Stat label="Locked-in run" value={`${Math.floor(data.locked.ms / 86_400_000)}d`} sub={`Best: ${data.locked.bestDays} days`} />
        <Stat label="Habits completed" value={data.completed} sub={`in the last ${n} days`} />
      </div>

      <SectionTitle>Focus Score</SectionTitle>
      <Card className="px-3 pb-2 pt-4">
        <LineChart points={data.points} />
      </Card>

      <SectionTitle>Consistency</SectionTitle>
      <Card className="p-4">
        <p className="mb-3 text-xs text-fg-3">More blue means more consistency — each square is one day.</p>
        <Heatmap weeks={n === 90 ? 17 : n === 30 ? 12 : 8} valueFor={(k) => dayStats(all, state.logs, k).completion} />
      </Card>

      {data.suggestions.length > 0 && (
        <>
          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} /> Agent actions
            </span>
          </SectionTitle>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {data.suggestions.map((s) => (
                <SuggestionCard key={s.key} s={s} />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      <SectionTitle>Precision by habit</SectionTitle>
      <Card className="space-y-3.5 p-4">
        {data.ranking.map(({ h, p }) => (
          <button key={h.id} type="button" onClick={() => navigate({ name: "habit", id: h.id })} className="flex w-full items-center gap-3 text-left">
            <HabitIcon habit={h} size={34} />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex justify-between text-sm">
                <span className="truncate font-medium">{h.name}</span>
                <span className="num font-semibold">{Math.round(p * 100)}%</span>
              </div>
              <ProgressBar value={p} color={COLORS[h.color]} height={5} />
            </div>
          </button>
        ))}
      </Card>

      <SectionTitle>
        <span className="flex items-center gap-1.5">
          Deep Analysis
        </span>
      </SectionTitle>
      <div className="space-y-5">
        <AnalysisGroup title="Trends" items={data.analysis.trends} />
        <AnalysisGroup title="Patterns" items={data.analysis.patterns} />
        <AnalysisGroup title="Tips" items={data.analysis.tips} />
      </div>

      <SectionTitle>Best days</SectionTitle>
      <Card className="px-3 pb-2 pt-4">
        <BarChart height={140} max={1} bars={data.weekday.map((v, i) => ({ label: WEEKDAYS_SHORT[i], value: v, tip: `${WEEKDAYS_SHORT[i]} average` }))} format={(v) => `${Math.round(v * 100)}%`} />
      </Card>

      <SectionTitle>
        <span className="flex items-center gap-1.5">When you get things done</span>
      </SectionTitle>
      <Card className="px-3 pb-2 pt-4">
        <BarChart height={130} bars={hourBars} format={(v) => `${v} completions`} />
      </Card>

      <Button
        full
        variant="soft"
        size="lg"
        className="mt-6"
        onClick={() =>
          navigate({ name: "coach", prompt: "Give me a deep analysis of my last 30 days: what's working, what's slipping, and the 3 highest-leverage changes. Apply the changes you're confident about." })
        }
      >
        <Sparkles size={18} /> Ask your Agent for a full analysis
      </Button>
    </div>
  );
}

function AnalysisGroup({ title, items }: { title: string; items: AnalysisItem[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-2 px-1 text-xs font-semibold text-fg-2">{title}</div>
      <div className="card divide-y divide-line-soft overflow-hidden">
        {items.map((it, i) => (
          <div key={i} className="flex gap-3 p-4">
            <span className="text-xl">{it.icon}</span>
            <div>
              <div className="text-sm font-semibold">{it.title}</div>
              <p className="mt-0.5 text-sm text-fg-2">{it.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
