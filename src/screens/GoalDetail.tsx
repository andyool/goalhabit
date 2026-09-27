import { Archive, Check, Pencil, Plus, Sparkles, Trash, Trophy, X } from "lucide-react";
import { useMemo, useState } from "react";
import { LineChart } from "../components/charts";
import { HabitIcon, PACE_META, useGoalStats } from "../components/items";
import { Badge, Button, Card, cx, EmptyState, IconButton, inputCls, List, PageHeader, Ring, Row, SectionTitle } from "../components/ui";
import { fmtNum, scheduleLabel, targetLabel } from "../lib/actions";
import { COLORS } from "../lib/content";
import { addDays, diffDays, formatDay, relativeDay, todayKey } from "../lib/date";
import { goalCurrent, precisionRate, targetOn } from "../lib/metrics";
import { useStore } from "../lib/store";
import { navigate, toast, useUI } from "../lib/ui";

export function GoalDetail({ id }: { id: string }) {
  const state = useStore();
  const goal = state.goals.find((g) => g.id === id);
  if (!goal) {
    return (
      <div>
        <PageHeader title="Goal" back={{ name: "goals" }} />
        <EmptyState icon="🤷" title="Goal not found" body="It may have been deleted." />
      </div>
    );
  }
  return <GoalView goalId={goal.id} />;
}

function GoalView({ goalId }: { goalId: string }) {
  const state = useStore();
  const goal = state.goals.find((g) => g.id === goalId)!;
  const openSheet = useUI((s) => s.openSheet);
  const { progress, pace, current } = useGoalStats(goal);
  const [newMs, setNewMs] = useState("");
  const [msDate, setMsDate] = useState("");
  const today = todayKey();
  const color = COLORS[goal.color];
  const meta = PACE_META[pace.status];
  const linked = state.habits.filter((h) => h.goalId === goal.id && !h.archived);

  const series = useMemo(() => {
    if (goal.kind !== "numeric") return null;
    const total = Math.max(1, diffDays(goal.startDate, today));
    const stepDays = Math.max(1, Math.ceil(total / 60));
    const pts = [];
    for (let k = goal.startDate; k <= today; k = addDays(k, stepDays)) pts.push({ key: k, value: goalCurrent(goal, state.habits, state.logs, k) });
    if (pts.at(-1)?.key !== today) pts.push({ key: today, value: goalCurrent(goal, state.habits, state.logs, today) });
    return pts;
  }, [goal, state.habits, state.logs, today]);

  const seriesVals = series?.map((p) => p.value) ?? [];
  const lo = Math.min(goal.startValue, goal.targetValue, ...seriesVals);
  const hi = Math.max(goal.startValue, goal.targetValue, ...seriesVals);
  const chartMin = goal.tracking === "measurement" ? Math.floor(lo - (hi - lo) * 0.1) : 0;
  const chartMax = goal.tracking === "measurement" ? Math.ceil(hi + (hi - lo) * 0.1) : hi;

  const addMs = () => {
    if (!newMs.trim()) return;
    state.addMilestone(goal.id, newMs.trim(), msDate || undefined);
    setNewMs("");
    setMsDate("");
  };

  return (
    <div>
      <PageHeader
        title=""
        back={{ name: "goals" }}
        large={false}
        right={
          <IconButton label="Edit goal" onClick={() => openSheet({ type: "goal", id: goal.id })}>
            <Pencil size={18} />
          </IconButton>
        }
      />

      <div className="-mt-4 mb-5 flex items-start gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl" style={{ background: `${color}24` }}>
          {goal.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-tight tracking-tight">{goal.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {goal.deadline && <span className="text-xs text-fg-3">Due {formatDay(goal.deadline, { month: "short", day: "numeric", year: "numeric" })}</span>}
          </div>
        </div>
      </div>

      {goal.why && (
        <blockquote className="mb-4 border-l-2 pl-3 text-sm italic text-fg-2" style={{ borderColor: color }}>
          “{goal.why}”
        </blockquote>
      )}

      <Card glow className="p-5">
        <div className="flex items-center gap-5">
          <Ring value={progress} size={112} stroke={11} color={color}>
            <div className="text-center">
              <div className="text-3xl font-bold tracking-tight">{Math.round(progress * 100)}%</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-3">Progress</div>
            </div>
          </Ring>
          <div className="min-w-0 flex-1 space-y-2.5 text-sm">
            {current !== null ? (
              <div>
                <div className="text-xs text-fg-3">{goal.tracking === "measurement" ? "Current" : "So far"}</div>
                <div className="text-lg font-semibold">
                  {fmtNum(current)} <span className="text-sm font-normal text-fg-3">/ {fmtNum(goal.targetValue)} {goal.unit}</span>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xs text-fg-3">Milestones</div>
                <div className="text-lg font-semibold">
                  {goal.milestones.filter((m) => m.done).length} <span className="text-sm font-normal text-fg-3">of {goal.milestones.length}</span>
                </div>
              </div>
            )}
            {pace.status !== "done" && pace.status !== "no-deadline" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-fg-3">Expected</div>
                  <div className="font-semibold">{Math.round(pace.expected * 100)}%</div>
                </div>
                <div>
                  <div className="text-xs text-fg-3">{pace.daysLeft !== null && pace.daysLeft < 0 ? "Overdue" : "Days left"}</div>
                  <div className="font-semibold">{pace.daysLeft !== null ? Math.abs(pace.daysLeft) : "—"}</div>
                </div>
              </div>
            )}
            {pace.projected && pace.status !== "done" && <div className="text-xs text-fg-3">At this pace: done {relativeDay(pace.projected)}</div>}
            {goal.completedAt && <div className="text-xs text-good">Achieved {relativeDay(goal.completedAt)} 🏆</div>}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {goal.kind === "numeric" && !goal.completedAt && (
            <Button variant="soft" size="sm" onClick={() => openSheet({ type: "goalEntry", goalId: goal.id })}>
              <Plus size={15} /> Log progress
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            className={goal.kind !== "numeric" || goal.completedAt ? "col-span-2" : ""}
            onClick={() => navigate({ name: "coach", prompt: `Review my goal "${goal.title}" (id ${goal.id}). Am I on track, and what should I change this week?` })}
          >
            <Sparkles size={15} /> Ask Agent
          </Button>
        </div>
      </Card>

      {series && series.length > 1 && (
        <>
          <SectionTitle>Progress over time</SectionTitle>
          <Card className="px-3 pb-2 pt-4">
            <LineChart points={series} max={chartMax} min={chartMin} unit={` ${goal.unit}`} color={color} />
          </Card>
        </>
      )}

      <SectionTitle>Milestones</SectionTitle>
      <List>
        {goal.milestones.map((m) => (
          <Row key={m.id} className="group">
            <button
              type="button"
              onClick={() => state.toggleMilestone(goal.id, m.id)}
              className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full transition", m.done ? "text-white" : "ring-2 ring-line")}
              style={m.done ? { background: color } : undefined}
              aria-label={m.done ? "Mark not done" : "Mark done"}
            >
              {m.done && <Check size={14} strokeWidth={3} />}
            </button>
            <div className="min-w-0 flex-1">
              <div className={cx("text-sm font-medium", m.done && "text-fg-3 line-through")}>{m.title}</div>
              {(m.dueDate || m.doneAt) && (
                <div className="text-xs text-fg-3">{m.done && m.doneAt ? `Done ${relativeDay(m.doneAt)}` : m.dueDate ? `Due ${relativeDay(m.dueDate)}` : ""}</div>
              )}
            </div>
            <button type="button" onClick={() => state.deleteMilestone(goal.id, m.id)} className="rounded-full p-1.5 text-fg-3 opacity-60 hover:text-bad hover:opacity-100" aria-label="Delete milestone">
              <X size={15} />
            </button>
          </Row>
        ))}
        <div className="space-y-2 p-3">
          <input className={cx(inputCls, "py-2.5")} placeholder="Add a milestone" value={newMs} onChange={(e) => setNewMs(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMs()} />
          {newMs.trim() && (
            <div className="flex items-center gap-2">
              <label className="flex flex-1 items-center gap-2 text-xs text-fg-3">
                Due
                <input type="date" className="flex-1 rounded-2xl border border-line bg-card-2 px-3 py-2 text-sm text-fg" value={msDate} onChange={(e) => setMsDate(e.target.value)} />
              </label>
              <Button size="sm" onClick={addMs}>
                <Plus size={16} /> Add
              </Button>
            </div>
          )}
        </div>
      </List>

      <SectionTitle
        right={
          <button type="button" onClick={() => openSheet({ type: "habit", goalId: goal.id })} className="flex items-center gap-1 text-[13px] font-semibold text-accent-2">
            <Plus size={15} /> Link habit
          </button>
        }
      >
        Daily actions
      </SectionTitle>
      {linked.length ? (
        <List>
          {linked.map((h) => {
            const p = precisionRate(h, state.logs, addDays(today, -14), today);
            return (
              <Row key={h.id} onClick={() => navigate({ name: "habit", id: h.id })}>
                <HabitIcon habit={h} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{h.name}</div>
                  <div className="text-xs text-fg-3">
                    {targetLabel(targetOn(h, today), h.unit)} · {scheduleLabel(h.schedule)}
                    {h.linkUnits && " · counts toward goal"}
                  </div>
                </div>
                <span className="num text-sm font-semibold">{p === null ? "—" : `${Math.round(p * 100)}%`}</span>
              </Row>
            );
          })}
        </List>
      ) : (
        <Card className="p-4 text-sm text-fg-2">No habits linked yet. Goals move when daily actions drive them — link one or two small habits.</Card>
      )}

      {goal.kind === "numeric" && goal.entries.length > 0 && (
        <>
          <SectionTitle>Progress log</SectionTitle>
          <List>
            {[...goal.entries]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .slice(0, 30)
              .map((e) => (
                <Row key={e.id}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {goal.tracking === "measurement" ? "" : e.value >= 0 ? "+" : ""}
                      {fmtNum(e.value)} {goal.unit}
                    </div>
                    <div className="truncate text-xs text-fg-3">
                      {formatDay(e.date)}
                      {e.note ? ` · ${e.note}` : ""}
                    </div>
                  </div>
                  <button type="button" onClick={() => state.deleteEntry(goal.id, e.id)} className="rounded-full p-1.5 text-fg-3 hover:text-bad" aria-label="Delete entry">
                    <Trash size={14} />
                  </button>
                </Row>
              ))}
          </List>
        </>
      )}

      <div className="mt-8 grid grid-cols-2 gap-2">
        <Button
          variant={goal.completedAt ? "secondary" : "primary"}
          onClick={() => {
            state.setGoalCompleted(goal.id, !goal.completedAt);
            if (!goal.completedAt) toast(`🏆 ${goal.title} — achieved!`, "good");
          }}
        >
          <Trophy size={16} /> {goal.completedAt ? "Reopen" : "Mark achieved"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            state.archiveGoal(goal.id, true);
            toast("Goal archived");
            navigate({ name: "goals" }, { replace: true });
          }}
        >
          <Archive size={16} /> Archive
        </Button>
        <Button
          variant="danger"
          className="col-span-2"
          onClick={() => {
            if (!confirm(`Delete “${goal.title}”? Linked habits are kept.`)) return;
            state.deleteGoal(goal.id);
            toast("Goal deleted");
            navigate({ name: "goals" }, { replace: true });
          }}
        >
          <Trash size={16} /> Delete goal
        </Button>
      </div>
      <p className="mt-4 text-center text-xs text-fg-3">Started {formatDay(goal.startDate, { month: "short", day: "numeric", year: "numeric" })}</p>
    </div>
  );
}
