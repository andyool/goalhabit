import { BookOpen, ChevronRight, Crown, Repeat, Settings, Swords, Archive } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, Card, List, PageHeader, ProgressBar, Ring, Row, SectionTitle } from "../components/ui";
import { reviewWeekDue } from "../lib/insights";
import { computeXp, isDoneOn, levelFromXp, lockedIn, LEVEL_TITLES } from "../lib/metrics";
import { useStore } from "../lib/store";
import { navigate, useUI } from "../lib/ui";

function MenuRow({ icon, label, sub, onClick, badge }: { icon: ReactNode; label: string; sub?: string; onClick: () => void; badge?: ReactNode }) {
  return (
    <Row onClick={onClick}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-card-2 text-fg-2">{icon}</span>
      <div className="flex-1">
        <div className="text-[15px] font-medium">{label}</div>
        {sub && <div className="text-xs text-fg-3">{sub}</div>}
      </div>
      {badge}
      <ChevronRight size={18} className="text-fg-3" />
    </Row>
  );
}

export function Profile() {
  const state = useStore();
  const openSheet = useUI((s) => s.openSheet);
  const xp = computeXp(state.habits, state.logs, state.goals, { checkIns: Object.keys(state.checkIns).length, reviews: state.reviews.length, lessons: state.lessonsRead.length });
  const level = levelFromXp(xp);
  const locked = lockedIn(state.habits, state.logs);
  let completions = 0;
  for (const day of Object.keys(state.logs)) for (const h of state.habits) if (isDoneOn(h, state.logs, day)) completions++;
  const achieved = state.goals.filter((g) => g.completedAt).length;
  const reviewDue = reviewWeekDue(state);
  const activeChallenges = state.challenges.filter((c) => !c.leftAt).length;

  return (
    <div>
      <PageHeader title="Profile" />
      <Card glow className="p-5">
        <div className="flex items-center gap-4">
          <Ring value={level.progress} size={84} stroke={6}>
            <div className="grid h-[64px] w-[64px] place-items-center rounded-full bg-card-2 text-2xl font-bold">{(state.profile.name || "?").slice(0, 1).toUpperCase()}</div>
          </Ring>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-bold">{state.profile.name || "You"}</h2>
              {state.profile.pro && (
                <Badge tone="accent">
                  <Crown size={10} /> Pro
                </Badge>
              )}
            </div>
            <div className="text-sm text-fg-2">
              Level {level.level} · {level.title}
            </div>
            <div className="mt-2">
              <ProgressBar value={level.progress} height={5} />
              <div className="mt-1 text-[11px] text-fg-3">
                {level.into} / {level.span} XP to {LEVEL_TITLES[Math.min(level.level, LEVEL_TITLES.length - 1)]}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2 text-center">
          {[
            [completions, "Check-offs"],
            [`${Math.max(locked.bestDays, Math.floor(locked.ms / 86_400_000))}d`, "Best run"],
            [achieved, "Goals won"],
            [xp.toLocaleString(), "Total XP"],
          ].map(([v, l]) => (
            <div key={l as string} className="rounded-2xl bg-card-2/70 px-1 py-2.5">
              <div className="text-lg font-bold">{v}</div>
              <div className="text-[10px] text-fg-3">{l}</div>
            </div>
          ))}
        </div>
      </Card>

      {!state.profile.pro && (
        <Card onClick={() => openSheet({ type: "paywall" })} className="mt-4 flex items-center gap-3 border-accent/30 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white">
            <Crown size={20} />
          </span>
          <div className="flex-1">
            <div className="font-semibold">Upgrade to Pro</div>
            <div className="text-xs text-fg-3">Unlimited goals, AI Agent, Deep Analysis</div>
          </div>
          <ChevronRight size={18} className="text-fg-3" />
        </Card>
      )}

      <SectionTitle>Grow</SectionTitle>
      <List>
        <MenuRow icon={<Repeat size={18} />} label="Weekly review" sub="Reflect and choose next week's focus" onClick={() => navigate({ name: "review" })} badge={reviewDue ? <Badge tone="accent">Due</Badge> : undefined} />
        <MenuRow icon={<Swords size={18} />} label="Challenges" sub={activeChallenges ? `${activeChallenges} active` : "Join a structured challenge"} onClick={() => navigate({ name: "challenges" })} />
        <MenuRow icon={<BookOpen size={18} />} label="Learn" sub={`${state.lessonsRead.length} lessons read`} onClick={() => navigate({ name: "learn" })} />
      </List>

      <SectionTitle>App</SectionTitle>
      <List>
        <MenuRow icon={<Settings size={18} />} label="Settings" sub="Theme, reminders, AI, data" onClick={() => navigate({ name: "settings" })} />
        <MenuRow icon={<Archive size={18} />} label="Archive" onClick={() => navigate({ name: "archive" })} />
      </List>

      {state.activity.length > 0 && (
        <>
          <SectionTitle>Recent activity</SectionTitle>
          <List>
            {state.activity.slice(0, 8).map((a) => (
              <Row key={a.id}>
                <div className="flex-1 text-sm text-fg-2">{a.text}</div>
                <div className="shrink-0 text-[11px] text-fg-3">{new Date(a.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
              </Row>
            ))}
          </List>
        </>
      )}
    </div>
  );
}
