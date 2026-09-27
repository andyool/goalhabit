import { Check, Crown, Minus, Plus, Sparkles, Trash, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fmtNum, scheduleLabel, targetLabel } from "../lib/actions";
import { COLORS, COLOR_KEYS, EMOJIS, GOAL_TEMPLATES, QUICK_HABITS, type GoalTemplate, type HabitTemplate } from "../lib/content";
import { addDays, relativeDay, todayKey, WEEKDAYS_SHORT } from "../lib/date";
import { goalCurrent, targetOn, weekCompletions } from "../lib/metrics";
import { goalFromTemplate, habitFromTemplate, useStore } from "../lib/store";
import type { ColorKey, GoalKind, GoalTracking, HabitSchedule, TimeOfDay } from "../lib/types";
import { navigate, toast, useUI, type Sheet } from "../lib/ui";
import { Badge, BottomSheet, Button, Chip, cx, Field, inputBase, inputCls, Segmented, Toggle } from "./ui";
import { APP_NAME } from "../lib/brand";

export function Sheets() {
  const sheet = useUI((s) => s.sheet);
  const close = useUI((s) => s.closeSheet);
  // Keep the last sheet rendered during the exit animation.
  const [last, setLast] = useState<Sheet | null>(sheet);
  useEffect(() => {
    if (sheet) setLast(sheet);
  }, [sheet]);
  const s = sheet ?? last;
  const key = s ? JSON.stringify(s) : "none";
  return (
    <>
      <BottomSheet open={sheet?.type === "habit"} onClose={close} title={s?.type === "habit" && s.id ? "Edit habit" : "New habit"}>
        {s?.type === "habit" && <HabitForm key={key} id={s.id} goalId={s.goalId} onDone={close} />}
      </BottomSheet>
      <BottomSheet open={sheet?.type === "goal"} onClose={close} title={s?.type === "goal" && s.id ? "Edit goal" : "New SMART goal"}>
        {s?.type === "goal" && <GoalForm key={key} id={s.id} onDone={close} />}
      </BottomSheet>
      <BottomSheet open={sheet?.type === "log"} onClose={close} title="Log progress">
        {s?.type === "log" && <LogSheet key={key} habitId={s.habitId} day={s.day} onDone={close} />}
      </BottomSheet>
      <BottomSheet open={sheet?.type === "goalEntry"} onClose={close} title="Update goal">
        {s?.type === "goalEntry" && <GoalEntrySheet key={key} goalId={s.goalId} onDone={close} />}
      </BottomSheet>
      <BottomSheet open={sheet?.type === "paywall"} onClose={close} title="">
        {s?.type === "paywall" && <Paywall reason={s.reason} onDone={close} />}
      </BottomSheet>
    </>
  );
}

/* ------------------------------- Pickers ------------------------------- */

function EmojiColorPicker({ emoji, color, onEmoji, onColor }: { emoji: string; color: ColorKey; onEmoji: (e: string) => void; onColor: (c: ColorKey) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="grid h-[52px] w-[52px] place-items-center rounded-2xl text-2xl ring-1 ring-line transition active:scale-95"
        style={{ background: `${COLORS[color]}26` }}
        aria-label="Choose icon and color"
      >
        {emoji}
      </button>
      {open && (
        <div className="absolute left-5 right-5 z-20 mt-2 rounded-2xl border border-line bg-elev p-3 shadow-2xl">
          <div className="grid grid-cols-9 gap-1">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onEmoji(e)}
                className={cx("grid aspect-square place-items-center rounded-xl text-xl transition hover:bg-card-2", e === emoji && "bg-accent-soft ring-1 ring-accent")}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-line-soft pt-3">
            {COLOR_KEYS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onColor(c)}
                aria-label={c}
                className={cx("h-8 w-8 rounded-full transition", c === color && "ring-2 ring-fg ring-offset-2 ring-offset-[var(--bg-elev)]")}
                style={{ background: COLORS[c] }}
              />
            ))}
          </div>
          <Button size="sm" variant="secondary" className="mt-3" full onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
}

function Stepper({ value, onChange, min = 0, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; step?: number }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(min, value - step))} className="grid h-11 w-11 place-items-center rounded-xl bg-card-2 ring-1 ring-line active:scale-95" aria-label="Decrease">
        <Minus size={18} />
      </button>
      <input
        inputMode="decimal"
        value={Number.isFinite(value) ? String(value) : ""}
        onChange={(e) => {
          const v = parseFloat(e.target.value.replace(",", "."));
          onChange(Number.isFinite(v) ? v : 0);
        }}
        className={cx(inputBase, "num w-20 min-w-0 px-2 text-center font-semibold")}
      />
      <button type="button" onClick={() => onChange(value + step)} className="grid h-11 w-11 place-items-center rounded-xl bg-card-2 ring-1 ring-line active:scale-95" aria-label="Increase">
        <Plus size={18} />
      </button>
    </div>
  );
}

const UNITS = ["times", "min", "pages", "km", "glasses", "steps", "reps", "hours"];

/* ------------------------------ Habit form ------------------------------ */

function HabitForm({ id, goalId: presetGoal, onDone }: { id?: string; goalId?: string; onDone: () => void }) {
  const store = useStore();
  const existing = store.habits.find((h) => h.id === id);
  const goals = store.goals.filter((g) => !g.archived);
  const [name, setName] = useState(existing?.name ?? "");
  const [emoji, setEmoji] = useState(existing?.emoji ?? "✅");
  const [color, setColor] = useState<ColorKey>(existing?.color ?? "blue");
  const [target, setTarget] = useState(existing ? targetOn(existing, todayKey()) : 1);
  const [unit, setUnit] = useState(existing?.unit ?? "times");
  const [schedule, setSchedule] = useState<HabitSchedule>(existing?.schedule ?? { type: "daily" });
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(existing?.timeOfDay ?? "anytime");
  const [goalId, setGoalId] = useState<string>(existing?.goalId ?? presetGoal ?? "");
  const [linkUnits, setLinkUnits] = useState(existing?.linkUnits ?? false);
  const [reminder, setReminder] = useState(existing?.reminder ?? "");
  const [improvement, setImprovement] = useState(existing?.improvementMode ?? false);

  const goal = goals.find((g) => g.id === goalId);
  const canLinkUnits = goal?.kind === "numeric" && goal.tracking === "cumulative";

  const applyTemplate = (t: HabitTemplate) => {
    setName(t.name);
    setEmoji(t.emoji);
    setColor(t.color);
    setTarget(t.target);
    setUnit(t.unit);
    setSchedule(t.schedule);
    setTimeOfDay(t.timeOfDay);
  };

  const save = () => {
    if (!name.trim()) return toast("Give your habit a name", "warn");
    if (schedule.type === "weekdays" && !schedule.days.length) return toast("Pick at least one day", "warn");
    const data = {
      name: name.trim(),
      emoji,
      color,
      target: Math.max(0.1, target),
      unit: unit.trim() || "times",
      schedule,
      timeOfDay,
      goalId: goalId || undefined,
      linkUnits: !!(goalId && canLinkUnits && linkUnits),
      reminder: reminder || undefined,
      improvementMode: improvement,
    };
    if (existing) {
      store.updateHabit(existing.id, { ...data, lastAdjust: improvement && !existing.improvementMode ? todayKey() : existing.lastAdjust });
      toast("Habit updated", "good");
    } else {
      store.addHabit(data);
      toast(`${emoji} ${data.name} added`, "good");
    }
    onDone();
  };

  return (
    <div className="relative space-y-5 pt-1">
      {!existing && (
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {QUICK_HABITS.map((t) => (
            <Chip key={t.name} onClick={() => applyTemplate(t)} active={name === t.name} className="shrink-0">
              {t.emoji} {t.name}
            </Chip>
          ))}
        </div>
      )}

      <div className="flex items-end gap-3">
        <EmojiColorPicker emoji={emoji} color={color} onEmoji={setEmoji} onColor={setColor} />
        <div className="flex-1">
          <Field label="Name">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Read" autoFocus={!existing} />
          </Field>
        </div>
      </div>

      <Field label="Daily target">
        <div className="flex items-center gap-3">
          <Stepper value={target} onChange={setTarget} min={0.5} step={target >= 100 ? 10 : 1} />
          <input className={cx(inputBase, "w-0 min-w-24 flex-1")} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="unit" />
        </div>
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
          {UNITS.map((u) => (
            <button key={u} type="button" onClick={() => setUnit(u)} className={cx("shrink-0 rounded-full px-3 py-1 text-xs font-medium", unit === u ? "bg-accent-soft text-accent-2" : "bg-card-2 text-fg-3")}>
              {u}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Frequency">
        <Segmented
          value={schedule.type}
          onChange={(v) => setSchedule(v === "daily" ? { type: "daily" } : v === "weekdays" ? { type: "weekdays", days: [0, 1, 2, 3, 4] } : { type: "weekly", times: 3 })}
          options={[
            { value: "daily", label: "Daily" },
            { value: "weekdays", label: "Days" },
            { value: "weekly", label: "Per week" },
          ]}
        />
        {schedule.type === "weekdays" && (
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {WEEKDAYS_SHORT.map((d, i) => {
              const on = schedule.days.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSchedule({ type: "weekdays", days: on ? schedule.days.filter((x) => x !== i) : [...schedule.days, i].sort() })}
                  className={cx("rounded-xl py-2.5 text-xs font-semibold transition", on ? "bg-accent text-white" : "bg-card-2 text-fg-3")}
                >
                  {d}
                </button>
              );
            })}
          </div>
        )}
        {schedule.type === "weekly" && (
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-card-2 px-4 py-2">
            <span className="text-sm text-fg-2">Times per week</span>
            <Stepper value={schedule.times} onChange={(v) => setSchedule({ type: "weekly", times: Math.max(1, Math.min(7, Math.round(v))) })} min={1} />
          </div>
        )}
      </Field>

      <Field label="Time of day">
        <Segmented
          value={timeOfDay}
          onChange={setTimeOfDay}
          options={[
            { value: "morning", label: "🌅" },
            { value: "afternoon", label: "☀️" },
            { value: "evening", label: "🌙" },
            { value: "anytime", label: "Any" },
          ]}
        />
      </Field>

      <Field label="Linked goal" hint="Habits are the daily actions that move a goal forward.">
        <select className={inputCls} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
          <option value="">No goal</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.emoji} {g.title}
            </option>
          ))}
        </select>
      </Field>

      {canLinkUnits && goal && (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-card-2 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Unit linking</div>
            <div className="text-xs text-fg-3">
              Every {unit} logged counts toward “{goal.title}” ({goal.unit})
            </div>
          </div>
          <Toggle checked={linkUnits} onChange={setLinkUnits} label="Unit linking" />
        </div>
      )}

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-card-2 px-4 py-3">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles size={14} className="text-accent-2" /> Improvement Mode
          </div>
          <div className="text-xs text-fg-3">Raises the target after a strong week, lowers it when you need recovery.</div>
        </div>
        <Toggle checked={improvement} onChange={setImprovement} label="Improvement Mode" />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-card-2 px-4 py-3">
        <div>
          <div className="text-sm font-semibold">Reminder</div>
          <div className="text-xs text-fg-3">Notifies you while {APP_NAME} is open (enable in Settings)</div>
        </div>
        <div className="flex items-center gap-2">
          {reminder && (
            <button type="button" onClick={() => setReminder("")} className="text-fg-3" aria-label="Remove reminder">
              <X size={16} />
            </button>
          )}
          <input type="time" value={reminder} onChange={(e) => setReminder(e.target.value)} className="rounded-xl border border-line bg-card px-2 py-1.5 text-sm" />
        </div>
      </div>

      <Button full size="lg" onClick={save}>
        {existing ? "Save changes" : "Create habit"}
      </Button>
      {existing && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              store.archiveHabit(existing.id);
              toast("Habit archived — history kept");
              onDone();
              navigate({ name: "goals", tab: "habits" }, { replace: true });
            }}
          >
            Archive
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!confirm(`Delete “${existing.name}” and all its history?`)) return;
              store.deleteHabit(existing.id);
              toast("Habit deleted");
              onDone();
              navigate({ name: "goals", tab: "habits" }, { replace: true });
            }}
          >
            <Trash size={16} /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Goal form ------------------------------- */

function GoalForm({ id, onDone }: { id?: string; onDone: () => void }) {
  const store = useStore();
  const existing = store.goals.find((g) => g.id === id);
  const today = todayKey();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [emoji, setEmoji] = useState(existing?.emoji ?? "🎯");
  const [color, setColor] = useState<ColorKey>(existing?.color ?? "blue");
  const [kind, setKind] = useState<GoalKind>(existing?.kind ?? "numeric");
  const [tracking, setTracking] = useState<GoalTracking>(existing?.tracking ?? "cumulative");
  const [startValue, setStartValue] = useState(existing?.startValue ?? 0);
  const [targetValue, setTargetValue] = useState(existing?.targetValue ?? 10);
  const [unit, setUnit] = useState(existing?.unit ?? "");
  const [why, setWhy] = useState(existing?.why ?? "");
  const [deadline, setDeadline] = useState(existing?.deadline ?? addDays(today, 90));
  const [milestones, setMilestones] = useState<string[]>(existing ? [] : []);
  const [newMs, setNewMs] = useState("");
  const [template, setTemplate] = useState<GoalTemplate | null>(null);
  const [habitPicks, setHabitPicks] = useState<boolean[]>([]);
  const areas = store.profile.areas;

  const templates = useMemo(() => {
    const pref = GOAL_TEMPLATES.filter((t) => areas.includes(t.area));
    return [...pref, ...GOAL_TEMPLATES.filter((t) => !areas.includes(t.area))];
  }, [areas]);

  const applyTemplate = (t: GoalTemplate) => {
    const g = goalFromTemplate(t, today);
    setTemplate(t);
    setTitle(g.title);
    setEmoji(g.emoji);
    setColor(g.color);
    setKind(g.kind);
    setTracking(g.tracking);
    setStartValue(g.startValue);
    setTargetValue(g.targetValue);
    setUnit(g.unit);
    setWhy(g.why);
    setDeadline(g.deadline!);
    setMilestones(t.milestones);
    setHabitPicks(t.habits.map(() => true));
  };

  const smart = {
    S: title.trim().length >= 4,
    M: kind === "milestones" ? (existing?.milestones.length ?? 0) + milestones.length > 0 : targetValue !== startValue && !!unit.trim(),
    A: kind === "milestones" || Math.abs(targetValue - startValue) > 0,
    R: why.trim().length >= 8,
    T: !!deadline && deadline > today,
  };

  const save = () => {
    if (!title.trim()) return toast("Name your goal", "warn");
    if (kind === "numeric" && targetValue === startValue) return toast("Target must differ from the starting value", "warn");
    if (existing) {
      store.updateGoal(existing.id, { title: title.trim(), emoji, color, kind, tracking, startValue, targetValue, unit: unit.trim(), why: why.trim(), deadline: deadline || undefined });
      milestones.forEach((m) => store.addMilestone(existing.id, m));
      toast("Goal updated", "good");
      onDone();
      return;
    }
    const gid = store.addGoal({
      title: title.trim(),
      emoji,
      color,
      category: template?.area ?? "custom",
      why: why.trim(),
      kind,
      tracking,
      startValue: kind === "numeric" ? startValue : 0,
      targetValue: kind === "numeric" ? targetValue : 1,
      unit: kind === "numeric" ? unit.trim() : "",
      startDate: today,
      deadline: deadline || undefined,
      milestones: milestones.map((m) => ({ title: m })),
    });
    let created = 0;
    template?.habits.forEach((h, i) => {
      if (habitPicks[i]) {
        store.addHabit(habitFromTemplate(h, gid));
        created++;
      }
    });
    toast(`${emoji} Goal created${created ? ` with ${created} linked habit${created > 1 ? "s" : ""}` : ""}`, "good");
    onDone();
    navigate({ name: "goal", id: gid });
  };

  return (
    <div className="relative space-y-5 pt-1">
      {!existing && (
        <div>
          <div className="mb-2 px-1 text-[13px] font-medium text-fg-2">Start from a template</div>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {templates.map((t) => (
              <Chip key={t.id} onClick={() => applyTemplate(t)} active={template?.id === t.id} className="shrink-0">
                {t.emoji} {t.title}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between rounded-2xl bg-card-2 p-1.5">
        {(Object.keys(smart) as (keyof typeof smart)[]).map((k) => (
          <div key={k} className={cx("flex flex-1 flex-col items-center rounded-xl py-1.5 transition", smart[k] ? "bg-accent-soft" : "")}>
            <span className={cx("text-base font-bold", smart[k] ? "text-accent-2" : "text-fg-3")}>{k}</span>
            <span className="text-[9px] uppercase tracking-wide text-fg-3">{{ S: "Specific", M: "Measurable", A: "Achievable", R: "Relevant", T: "Time-bound" }[k]}</span>
          </div>
        ))}
      </div>

      <div className="flex items-end gap-3">
        <EmojiColorPicker emoji={emoji} color={color} onEmoji={setEmoji} onColor={setColor} />
        <div className="flex-1">
          <Field label="Specific — what exactly will you achieve?">
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Run a half marathon" />
          </Field>
        </div>
      </div>

      <Field label="Measurable — how will you track it?">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: "numeric", label: "Number" },
            { value: "milestones", label: "Milestones" },
          ]}
        />
      </Field>

      {kind === "numeric" && (
        <div className="space-y-3 rounded-2xl bg-card-2 p-4">
          <Segmented
            value={tracking}
            onChange={setTracking}
            className="bg-card"
            options={[
              { value: "cumulative", label: "Accumulate" },
              { value: "measurement", label: "Measure" },
            ]}
          />
          <p className="px-1 text-xs text-fg-3">
            {tracking === "cumulative" ? "Progress adds up over time — pages read, km run, dollars saved." : "Track a changing value — body weight, screen time, a best time."}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Start">
              <input inputMode="decimal" className={cx(inputCls, "bg-card")} value={startValue} onChange={(e) => setStartValue(parseFloat(e.target.value) || 0)} />
            </Field>
            <Field label="Target">
              <input inputMode="decimal" className={cx(inputCls, "bg-card")} value={targetValue} onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)} />
            </Field>
            <Field label="Unit">
              <input className={cx(inputCls, "bg-card")} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="km" />
            </Field>
          </div>
        </div>
      )}

      <Field label={kind === "milestones" ? "Achievable — break it into milestones" : "Milestones (optional)"}>
        <div className="space-y-2">
          {existing?.milestones.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-xl bg-card-2 px-3 py-2.5 text-sm text-fg-2">
              <span className={cx("h-4 w-4 rounded-full border", m.done ? "border-accent bg-accent" : "border-line")} />
              {m.title}
            </div>
          ))}
          {milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-card-2 px-3 py-2.5 text-sm">
              <span className="h-4 w-4 rounded-full border border-line" />
              <span className="flex-1">{m}</span>
              <button type="button" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))} className="text-fg-3 hover:text-bad" aria-label="Remove milestone">
                <X size={16} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={newMs}
              onChange={(e) => setNewMs(e.target.value)}
              placeholder="Add a milestone"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newMs.trim()) {
                  e.preventDefault();
                  setMilestones([...milestones, newMs.trim()]);
                  setNewMs("");
                }
              }}
            />
            <Button
              variant="secondary"
              className="shrink-0"
              onClick={() => {
                if (!newMs.trim()) return;
                setMilestones([...milestones, newMs.trim()]);
                setNewMs("");
              }}
            >
              <Plus size={18} />
            </Button>
          </div>
        </div>
      </Field>

      <Field label="Relevant — why does this matter to you?" hint="Phrase it as who you're becoming. Your Agent uses this to keep you motivated.">
        <textarea className={cx(inputCls, "min-h-20 resize-none")} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="I want to become someone who…" />
      </Field>

      <Field label="Time-bound — deadline">
        <input type="date" className={inputCls} value={deadline} min={addDays(today, 1)} onChange={(e) => setDeadline(e.target.value)} />
        <div className="mt-2 flex gap-1.5">
          {[
            ["30 days", 30],
            ["90 days", 90],
            ["6 months", 182],
            ["1 year", 365],
          ].map(([l, d]) => (
            <button key={l} type="button" onClick={() => setDeadline(addDays(today, d as number))} className="rounded-full bg-card-2 px-3 py-1 text-xs font-medium text-fg-3 hover:text-fg">
              {l}
            </button>
          ))}
        </div>
      </Field>

      {!existing && template && template.habits.length > 0 && (
        <div>
          <div className="mb-2 px-1 text-[13px] font-medium text-fg-2">Daily actions to link</div>
          <div className="space-y-2">
            {template.habits.map((h, i) => (
              <button
                key={h.name}
                type="button"
                onClick={() => setHabitPicks(habitPicks.map((v, j) => (j === i ? !v : v)))}
                className={cx("flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition", habitPicks[i] ? "border-accent bg-accent-soft" : "border-line bg-card-2")}
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl text-lg" style={{ background: `${COLORS[h.color]}26` }}>
                  {h.emoji}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{h.name}</span>
                  <span className="block text-xs text-fg-3">
                    {targetLabel(h.target, h.unit)} · {scheduleLabel(h.schedule)}
                    {h.linkUnits ? " · counts toward goal" : ""}
                  </span>
                </span>
                <span className={cx("grid h-6 w-6 place-items-center rounded-full", habitPicks[i] ? "bg-accent text-white" : "ring-1 ring-line")}>{habitPicks[i] && <Check size={14} />}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Button full size="lg" onClick={save}>
        {existing ? "Save changes" : "Create goal"}
      </Button>
    </div>
  );
}

/* -------------------------------- Log sheet -------------------------------- */

function LogSheet({ habitId, day, onDone }: { habitId: string; day: string; onDone: () => void }) {
  const habit = useStore((s) => s.habits.find((h) => h.id === habitId));
  const logs = useStore((s) => s.logs);
  const setLog = useStore((s) => s.setLog);
  const current = logs[day]?.[habitId]?.value ?? 0;
  const [value, setValue] = useState(current);
  if (!habit) return null;
  const target = targetOn(habit, day);
  const pct = Math.min(1, value / target);
  const quick = target >= 1000 ? [500, 1000, 2500] : target >= 50 ? [5, 10, 25] : target >= 5 ? [1, 5, 10] : [1];

  const save = (v = value) => {
    setLog(habit.id, day, v);
    if (v >= target && current < target) toast(`${habit.emoji} ${habit.name} complete!`, "good");
    onDone();
  };

  return (
    <div className="space-y-5 pt-1">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl text-2xl" style={{ background: `${COLORS[habit.color]}26` }}>
          {habit.emoji}
        </span>
        <div className="flex-1">
          <div className="font-semibold">{habit.name}</div>
          <div className="text-sm text-fg-3">
            {relativeDay(day)} · target {fmtNum(target)} {habit.unit}
            {habit.schedule.type === "weekly" && ` · ${weekCompletions(habit, logs, day)}/${habit.schedule.times} this week`}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-3xl bg-card-2 py-6">
        <div className="text-center">
          <div className="text-5xl font-bold tracking-tight">{fmtNum(value)}</div>
          <div className="mt-1 text-sm text-fg-3">
            of {fmtNum(target)} {habit.unit} · {Math.round(pct * 100)}%
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setValue(Math.max(0, value - (quick[0] ?? 1)))} className="grid h-14 w-14 place-items-center rounded-2xl bg-card ring-1 ring-line active:scale-95" aria-label="Decrease">
            <Minus />
          </button>
          <input
            inputMode="decimal"
            value={String(value)}
            onChange={(e) => setValue(Math.max(0, parseFloat(e.target.value.replace(",", ".")) || 0))}
            className={cx(inputBase, "w-28 bg-card text-center text-lg font-semibold")}
            aria-label="Amount"
          />
          <button type="button" onClick={() => setValue(value + (quick[0] ?? 1))} className="grid h-14 w-14 place-items-center rounded-2xl bg-card ring-1 ring-line active:scale-95" aria-label="Increase">
            <Plus />
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {quick.slice(1).map((q) => (
            <Chip key={q} onClick={() => setValue(value + q)}>
              +{fmtNum(q)}
            </Chip>
          ))}
          <Chip active onClick={() => setValue(Math.max(value, target))}>
            <Check size={14} /> Complete
          </Chip>
          {value > 0 && <Chip onClick={() => setValue(0)}>Reset</Chip>}
        </div>
      </div>

      <Button full size="lg" onClick={() => save()}>
        Save
      </Button>
      <button
        type="button"
        onClick={() => {
          onDone();
          navigate({ name: "habit", id: habit.id });
        }}
        className="w-full text-center text-sm font-medium text-accent-2"
      >
        View habit details
      </button>
    </div>
  );
}

/* ------------------------------ Goal entry sheet ------------------------------ */

function GoalEntrySheet({ goalId, onDone }: { goalId: string; onDone: () => void }) {
  const store = useStore();
  const goal = store.goals.find((g) => g.id === goalId);
  const [value, setValue] = useState<number>(() => (goal && goal.tracking === "measurement" ? goalCurrent(goal, store.habits, store.logs) : 1));
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayKey());
  if (!goal) return null;
  const measurement = goal.tracking === "measurement";
  return (
    <div className="space-y-5 pt-1">
      <p className="text-sm text-fg-2">
        {measurement ? `Record your current value for “${goal.title}”.` : `Add progress toward “${goal.title}”. Linked habits add their units automatically.`}
      </p>
      <Field label={measurement ? `Current value (${goal.unit})` : `Amount to add (${goal.unit})`}>
        <Stepper value={value} onChange={setValue} min={measurement ? -Infinity : 0} />
      </Field>
      <Field label="Date">
        <input type="date" className={inputCls} value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Note (optional)">
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Finished chapter 4" />
      </Field>
      <Button
        full
        size="lg"
        onClick={() => {
          if (!measurement && value === 0) return toast("Enter an amount", "warn");
          store.addEntry(goal.id, value, note.trim() || undefined, date);
          toast("Progress saved", "good");
          onDone();
        }}
      >
        Save progress
      </Button>
    </div>
  );
}

/* ---------------------------------- Paywall ---------------------------------- */

const PRO_FEATURES = [
  ["🎯", "Unlimited goals", "Free includes 2 active goals"],
  ["🤖", "AI Agent & coach chat", "Plans, adjusts and logs for you"],
  ["🔬", "Deep Analysis", "Peak hours, mood & energy correlations, trends"],
  ["⚡", "AI Actions", "One-tap optimizations for goals and habits"],
  ["🏆", "All challenges", "75 Soft, Monk Mode, 5AM Club and more"],
];

function Paywall({ reason, onDone }: { reason?: string; onDone: () => void }) {
  const updateProfile = useStore((s) => s.updateProfile);
  const [plan, setPlan] = useState<"year" | "month">("year");
  return (
    <div className="-mt-4 space-y-5">
      <div className="glow -mx-5 flex flex-col items-center px-6 pb-2 pt-6 text-center">
        <div className="mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-accent text-white shadow-[0_12px_40px_-8px_var(--accent)]">
          <Crown size={30} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{APP_NAME} Pro</h2>
        <p className="mt-1 text-sm text-fg-2">{reason ?? "Unlock your full discipline system."}</p>
      </div>
      <div className="space-y-2.5">
        {PRO_FEATURES.map(([e, t, d]) => (
          <div key={t} className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-card-2 text-lg">{e}</span>
            <div>
              <div className="text-sm font-semibold">{t}</div>
              <div className="text-xs text-fg-3">{d}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["year", "Yearly", "$34.99", "$2.92/mo · 3-day free trial"],
            ["month", "Monthly", "$5.99", "Cancel anytime"],
          ] as const
        ).map(([id, label, price, sub]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPlan(id)}
            className={cx("relative rounded-2xl border p-4 text-left transition", plan === id ? "border-accent bg-accent-soft" : "border-line bg-card-2")}
          >
            {id === "year" && (
              <span className="absolute -top-2.5 right-3">
                <Badge tone="accent">Save 51%</Badge>
              </span>
            )}
            <div className="text-sm text-fg-2">{label}</div>
            <div className="text-xl font-bold">{price}</div>
            <div className="text-[11px] text-fg-3">{sub}</div>
          </button>
        ))}
      </div>
      <Button
        full
        size="lg"
        onClick={() => {
          updateProfile({ pro: true, proSince: todayKey() });
          toast(`Welcome to ${APP_NAME} Pro 👑`, "good");
          onDone();
        }}
      >
        {plan === "year" ? "Start 3-day free trial" : "Upgrade to Pro"}
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-fg-3">
        Payments aren't connected in this build — Pro unlocks on this device at no cost. You can switch back to Free in Settings.
      </p>
    </div>
  );
}
