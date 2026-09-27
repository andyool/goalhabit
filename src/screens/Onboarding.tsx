import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Button, cx, inputCls, ProgressBar } from "../components/ui";
import { fmtNum, scheduleLabel, targetLabel } from "../lib/actions";
import { APP_NAME, TAGLINE } from "../lib/brand";
import { AREAS, COLORS, GOAL_TEMPLATES, QUICK_HABITS, type HabitTemplate } from "../lib/content";
import { goalFromTemplate, habitFromTemplate, useStore } from "../lib/store";

const BLOCKERS = [
  { id: "motivation", emoji: "🔋", label: "I lose motivation after a few days", answer: "Motivation fades — systems don't. Your habits are linked to goals so you always see why they matter, and suggestions step in when you start slipping." },
  { id: "perfection", emoji: "💔", label: "One missed day and I give up", answer: "That's why there are no fragile streaks here. The Locked-In Score only asks for 70% of your habits — precision over perfection." },
  { id: "overwhelm", emoji: "🌀", label: "I set too many goals at once", answer: "We'll start with one goal and 1–3 small daily actions. Focus compounds faster than ambition." },
  { id: "tracking", emoji: "🧭", label: "I can't tell if I'm making progress", answer: "Your Focus Score, precision rates and goal pace show exactly where you stand — every single day." },
];

export function Onboarding() {
  const store = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [blocker, setBlocker] = useState<string>("");
  const [goalId, setGoalId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const total = 6;

  const goalTemplates = GOAL_TEMPLATES.filter((t) => areas.length === 0 || areas.includes(t.area));
  const goal = GOAL_TEMPLATES.find((t) => t.id === goalId) ?? null;
  const habitOptions: (HabitTemplate & { fromGoal?: boolean })[] = [
    ...(goal?.habits.map((h) => ({ ...h, fromGoal: true })) ?? []),
    ...QUICK_HABITS.filter((q) => !goal?.habits.some((h) => h.name === q.name)).slice(0, goal ? 4 : 6),
  ];


  const finish = () => {
    store.updateProfile({ name: name.trim(), areas, onboarded: true });
    let gid: string | undefined;
    if (goal) gid = store.addGoal(goalFromTemplate(goal));
    habitOptions.forEach((h) => {
      if (picked[h.name]) store.addHabit(habitFromTemplate(h, h.fromGoal ? gid : undefined));
    });
    store.logActivity("Joined — day one of locking in 🔒");
  };

  const next = () => {
    if (step === 4) {
      // Preselect the goal's habits (or two starter habits) when entering the habit step.
      const init: Record<string, boolean> = {};
      habitOptions.forEach((h) => (init[h.name] = !!h.fromGoal));
      if (!goal) habitOptions.slice(0, 2).forEach((h) => (init[h.name] = true));
      setPicked(init);
    }
    setStep((s) => Math.min(total, s + 1));
  };
  const canNext = [true, name.trim().length > 0, areas.length > 0, !!blocker, true, Object.values(picked).some(Boolean)][step] ?? true;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8">
      {step > 0 && (
        <div className="safe-top flex items-center gap-3 pt-4">
          <button type="button" onClick={() => setStep(step - 1)} className="-ml-2 rounded-full p-2 text-fg-2 hover:bg-card" aria-label="Back">
            <ChevronLeft size={22} />
          </button>
          <ProgressBar value={step / total} height={5} />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="flex flex-1 flex-col">
          {step === 0 && (
            <div className="flex flex-1 flex-col">
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <Logo />
                <h1 className="mt-8 text-4xl font-bold tracking-tight">{APP_NAME}</h1>
                <p className="mt-3 max-w-xs text-lg text-fg-2">{TAGLINE}</p>
                <div className="mt-10 grid w-full max-w-xs gap-3 text-left text-sm text-fg-2">
                  {[
                    ["🎯", "Set SMART goals and break them into milestones"],
                    ["🔗", "Link daily habits that actually move them"],
                    ["📈", "See your Focus Score and patterns every day"],
                    ["🔒", "Stay locked in with precision, not perfection"],
                  ].map(([e, t]) => (
                    <div key={t} className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-card text-lg">{e}</span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Button full size="lg" onClick={next}>
                  Get started
                </Button>
                <Button
                  full
                  variant="ghost"
                  onClick={() => {
                    store.loadDemo();
                  }}
                >
                  Explore with demo data
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <Step title="What should we call you?" sub="We'll keep things personal.">
              <input autoFocus className={cx(inputCls, "text-lg")} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" onKeyDown={(e) => e.key === "Enter" && canNext && next()} />
            </Step>
          )}

          {step === 2 && (
            <Step title={`What do you want to improve${name ? `, ${name}` : ""}?`} sub="Pick up to three areas. Focus beats ambition.">
              <div className="grid grid-cols-2 gap-2.5">
                {AREAS.map((a) => {
                  const on = areas.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAreas(on ? areas.filter((x) => x !== a.id) : areas.length < 3 ? [...areas, a.id] : areas)}
                      className={cx("flex items-center gap-3 rounded-2xl border p-4 text-left font-medium transition active:scale-[0.98]", on ? "border-accent bg-accent-soft" : "border-line bg-card")}
                    >
                      <span className="text-2xl">{a.emoji}</span>
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step title="What usually stops you?" sub="Be honest — there's a system for every one of these.">
              <div className="space-y-2.5">
                {BLOCKERS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBlocker(b.id)}
                    className={cx("flex w-full items-center gap-3 rounded-2xl border p-4 text-left font-medium transition", blocker === b.id ? "border-accent bg-accent-soft" : "border-line bg-card")}
                  >
                    <span className="text-2xl">{b.emoji}</span>
                    {b.label}
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {blocker && (
                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-2xl bg-card p-4 text-sm leading-relaxed text-fg-2">
                    {BLOCKERS.find((b) => b.id === blocker)?.answer}
                  </motion.p>
                )}
              </AnimatePresence>
            </Step>
          )}

          {step === 4 && (
            <Step title="Choose your first goal" sub="You can customize it any time — or skip and add one later.">
              <div className="space-y-2.5">
                {goalTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setGoalId(goalId === t.id ? null : t.id)}
                    className={cx("flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition", goalId === t.id ? "border-accent bg-accent-soft" : "border-line bg-card")}
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-xl text-2xl" style={{ background: `${COLORS[t.color]}26` }}>
                      {t.emoji}
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold">{t.title}</div>
                      <div className="text-xs text-fg-3">
                        {t.days} days · {t.kind === "milestones" ? `${t.milestones.length} milestones` : `${fmtNum(t.targetValue)} ${t.unit}`}
                      </div>
                    </div>
                    {goalId === t.id && (
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-white">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </Step>
          )}

          {step === 5 && (
            <Step title="Pick your daily actions" sub={goal ? `These drive “${goal.title}”. Start small — you can scale up later.` : "Start with two or three. Small enough that you can't say no."}>
              <div className="space-y-2.5">
                {habitOptions.map((h) => {
                  const on = !!picked[h.name];
                  return (
                    <button
                      key={h.name}
                      type="button"
                      onClick={() => setPicked({ ...picked, [h.name]: !on })}
                      className={cx("flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition", on ? "border-accent bg-accent-soft" : "border-line bg-card")}
                    >
                      <span className="grid h-11 w-11 place-items-center rounded-xl text-2xl" style={{ background: `${COLORS[h.color]}26` }}>
                        {h.emoji}
                      </span>
                      <div className="flex-1">
                        <div className="font-semibold">{h.name}</div>
                        <div className="text-xs text-fg-3">
                          {targetLabel(h.target, h.unit)} · {scheduleLabel(h.schedule)}
                          {h.fromGoal ? " · linked to goal" : ""}
                        </div>
                      </div>
                      <span className={cx("grid h-6 w-6 place-items-center rounded-full", on ? "bg-accent text-white" : "ring-1 ring-line")}>{on && <Check size={14} />}</span>
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 6 && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="text-6xl">🤝</div>
              <h1 className="mt-6 text-3xl font-bold tracking-tight">Make it official</h1>
              <p className="mt-3 max-w-xs text-fg-2">
                I{name ? `, ${name},` : ""} commit to showing up for my goals — not perfectly, but consistently. When I miss, I won't miss twice.
              </p>
              <div className="mt-12">
                <HoldButton onDone={finish} />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {step > 0 && step < 6 && (
        <Button full size="lg" className="mt-6" disabled={!canNext} onClick={next}>
          {step === 4 && !goalId ? "Skip for now" : "Continue"}
        </Button>
      )}
    </div>
  );
}

function Step({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="pt-8">
      <h1 className="text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
      {sub && <p className="mt-2 text-fg-2">{sub}</p>}
      <div className="mt-7">{children}</div>
    </div>
  );
}

export function Logo({ size = 88 }: { size?: number }) {
  return (
    <div className="relative grid place-items-center rounded-[28%] bg-accent shadow-[0_20px_60px_-12px_var(--accent)]" style={{ width: size, height: size }}>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect x="5" y="26" width="8" height="15" rx="3" fill="white" opacity="0.55" />
        <rect x="20" y="16" width="8" height="25" rx="3" fill="white" opacity="0.8" />
        <rect x="35" y="6" width="8" height="35" rx="3" fill="white" />
      </svg>
    </div>
  );
}

function HoldButton({ onDone }: { onDone: () => void }) {
  const [p, setP] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef(0);
  const done = useRef(false);
  const DURATION = 1200;

  const begin = () => {
    if (done.current) return;
    start.current = performance.now();
    const step = (t: number) => {
      const v = Math.min(1, (t - start.current) / DURATION);
      setP(v);
      if (v >= 1) {
        done.current = true;
        navigator.vibrate?.(30);
        setTimeout(onDone, 250);
        return;
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  const cancel = () => {
    if (done.current) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    setP(0);
  };

  const r = 58;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onPointerDown={begin}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && begin()}
        onKeyUp={cancel}
        className="relative grid h-[132px] w-[132px] touch-none select-none place-items-center rounded-full"
        aria-label="Press and hold to commit"
      >
        <svg width="132" height="132" className="absolute -rotate-90">
          <circle cx="66" cy="66" r={r} stroke="var(--line)" strokeWidth="6" fill="none" />
          <circle cx="66" cy="66" r={r} stroke="var(--accent)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
        </svg>
        <motion.span animate={{ scale: p > 0 ? 0.92 : 1 }} className={cx("grid h-[104px] w-[104px] place-items-center rounded-full text-white transition", p >= 1 ? "bg-good" : "bg-accent")}>
          {p >= 1 ? <Check size={40} strokeWidth={3} /> : <span className="text-sm font-bold uppercase tracking-wider">Hold</span>}
        </motion.span>
      </button>
      <span className="text-sm text-fg-3">Press and hold to commit</span>
    </div>
  );
}
