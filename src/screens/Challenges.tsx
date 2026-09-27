import { Crown } from "lucide-react";
import { useState } from "react";
import { WeekDots } from "../components/charts";
import { HabitIcon } from "../components/items";
import { Badge, BottomSheet, Button, Card, PageHeader, ProgressBar, SectionTitle } from "../components/ui";
import { scheduleLabel, targetLabel } from "../lib/actions";
import { CHALLENGES, COLORS, type ChallengeTemplate } from "../lib/content";
import { addDays, diffDays, rangeKeys, todayKey } from "../lib/date";
import { dayStats } from "../lib/metrics";
import { useStore } from "../lib/store";
import type { JoinedChallenge } from "../lib/types";
import { toast, useUI } from "../lib/ui";

const FREE_CHALLENGES = ["10k-steps", "reading-sprint"];

function useChallengeProgress(c: JoinedChallenge, t: ChallengeTemplate) {
  const allHabits = useStore((s) => s.habits);
  const habits = allHabits.filter((h) => c.habitIds.includes(h.id));
  const logs = useStore((s) => s.logs);
  const today = todayKey();
  const end = addDays(c.joinedAt, t.days - 1);
  const last = c.leftAt ? addDays(c.leftAt, -1) : end < today ? end : today;
  let success = 0;
  for (const k of rangeKeys(c.joinedAt, last)) {
    const s = dayStats(habits, logs, k);
    if (s.due > 0 && s.done === s.due) success++;
  }
  const dayNum = Math.min(t.days, diffDays(c.joinedAt, today) + 1);
  const week = rangeKeys(addDays(today, -6), today).map((k) => (k < c.joinedAt ? null : dayStats(habits, logs, k).completion));
  return { success, dayNum, finished: today > end, week, weekDays: rangeKeys(addDays(today, -6), today) };
}

export function Challenges() {
  const state = useStore();
  const openSheet = useUI((s) => s.openSheet);
  const [preview, setPreview] = useState<ChallengeTemplate | null>(null);
  const active = state.challenges.filter((c) => !c.leftAt);
  const activeIds = active.map((c) => c.id);

  const join = (t: ChallengeTemplate) => {
    if (!state.profile.pro && !FREE_CHALLENGES.includes(t.id)) {
      setPreview(null);
      openSheet({ type: "paywall", reason: `${t.title} is a Pro challenge.` });
      return;
    }
    state.joinChallenge(t.id);
    setPreview(null);
    toast(`${t.emoji} You're in: ${t.title}. ${t.habits.length} habits added to Today.`, "good");
  };

  return (
    <div>
      <PageHeader title="Challenges" subtitle="Events" back={{ name: "profile" }} />
      <p className="-mt-2 mb-2 text-sm text-fg-2">Structured sprints that add a set of habits to your day. Finish every habit to win the day.</p>

      {active.length > 0 && (
        <>
          <SectionTitle>Active</SectionTitle>
          <div className="space-y-3">
            {active.map((c) => {
              const t = CHALLENGES.find((x) => x.id === c.id);
              return t ? <ActiveChallenge key={c.id} c={c} t={t} /> : null;
            })}
          </div>
        </>
      )}

      <SectionTitle>Browse</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {CHALLENGES.filter((t) => !activeIds.includes(t.id)).map((t) => (
          <Card key={t.id} onClick={() => setPreview(t)} className="overflow-hidden p-0">
            <div className="flex h-20 items-center justify-between px-4" style={{ background: `linear-gradient(135deg, ${COLORS[t.color]}40, transparent)` }}>
              <span className="text-4xl">{t.emoji}</span>
              <div className="flex gap-1.5">
                <Badge>{t.days} days</Badge>
                {!state.profile.pro && !FREE_CHALLENGES.includes(t.id) && (
                  <Badge tone="accent">
                    <Crown size={10} /> Pro
                  </Badge>
                )}
              </div>
            </div>
            <div className="p-4">
              <div className="font-semibold">{t.title}</div>
              <div className="mt-0.5 text-sm text-fg-3">{t.tagline}</div>
            </div>
          </Card>
        ))}
      </div>

      <BottomSheet open={!!preview} onClose={() => setPreview(null)} title={preview ? `${preview.emoji} ${preview.title}` : ""}>
        {preview && (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-fg-2">{preview.description}</p>
            <div className="space-y-2">
              {preview.habits.map((h) => (
                <div key={h.name} className="flex items-center gap-3 rounded-2xl bg-card-2 p-3">
                  <HabitIcon habit={h} size={36} />
                  <div>
                    <div className="text-sm font-semibold">{h.name}</div>
                    <div className="text-xs text-fg-3">
                      {targetLabel(h.target, h.unit)} · {scheduleLabel(h.schedule)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button full size="lg" onClick={() => join(preview)}>
              Join · {preview.days} days
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function ActiveChallenge({ c, t }: { c: JoinedChallenge; t: ChallengeTemplate }) {
  const leave = useStore((s) => s.leaveChallenge);
  const p = useChallengeProgress(c, t);
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl text-2xl" style={{ background: `${COLORS[t.color]}26` }}>
          {t.emoji}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{t.title}</div>
            {p.finished ? <Badge tone="good">Finished</Badge> : <Badge tone="accent">Day {p.dayNum}</Badge>}
          </div>
          <div className="text-xs text-fg-3">
            {p.success} of {t.days} perfect days
          </div>
        </div>
      </div>
      <div className="mt-3">
        <ProgressBar value={p.dayNum / t.days} color={COLORS[t.color]} />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <WeekDots values={p.week} days={p.weekDays} />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (confirm(`Leave ${t.title}? Its habits will be archived.`)) leave(t.id);
          }}
        >
          {p.finished ? "Close" : "Leave"}
        </Button>
      </div>
    </Card>
  );
}
