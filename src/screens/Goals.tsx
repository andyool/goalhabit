import { ArrowDown, ArrowUp, Archive, ChevronRight, Plus, Trophy } from "lucide-react";
import { useState } from "react";
import { GoalCard, HabitIcon } from "../components/items";
import { Button, cx, EmptyState, IconButton, List, PageHeader, Row, Segmented, SectionTitle } from "../components/ui";
import { openNewGoal, scheduleLabel, targetLabel } from "../lib/actions";
import { addDays, todayKey } from "../lib/date";
import { activeGoals, activeHabits } from "../lib/insights";
import { habitStreak, precisionRate, targetOn } from "../lib/metrics";
import { FREE_GOAL_LIMIT, useStore } from "../lib/store";
import { navigate, useUI } from "../lib/ui";
import { APP_NAME } from "../lib/brand";

export function Goals({ tab: initialTab = "goals" }: { tab?: "goals" | "habits" }) {
  const [tab, setTab] = useState<"goals" | "habits">(initialTab);
  const openSheet = useUI((s) => s.openSheet);
  const state = useStore();
  const goals = activeGoals(state.goals);
  const current = goals.filter((g) => !g.completedAt);
  const achieved = goals.filter((g) => g.completedAt);
  const habits = activeHabits(state.habits);
  const archivedCount = state.habits.filter((h) => h.archived).length + state.goals.filter((g) => g.archived).length;
  const today = todayKey();

  const switchTab = (t: "goals" | "habits") => {
    setTab(t);
    navigate({ name: "goals", tab: t }, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="Plan"
        right={
          <IconButton label={tab === "goals" ? "New goal" : "New habit"} onClick={() => (tab === "goals" ? openNewGoal() : openSheet({ type: "habit" }))} className="bg-accent text-white hover:bg-accent hover:text-white">
            <Plus size={20} />
          </IconButton>
        }
      />
      <Segmented
        value={tab}
        onChange={switchTab}
        options={[
          { value: "goals", label: `Goals · ${current.length}` },
          { value: "habits", label: `Habits · ${habits.length}` },
        ]}
      />

      {tab === "goals" ? (
        <div className="mt-5 space-y-3">
          {current.length === 0 ? (
            <EmptyState
              icon="🎯"
              title="Set your first SMART goal"
              body={`Big goals feel far away. ${APP_NAME} breaks them into milestones and links them to daily actions so you actually finish.`}
              action={<Button onClick={openNewGoal}>Create a goal</Button>}
            />
          ) : (
            current.map((g) => <GoalCard key={g.id} goal={g} />)
          )}
          {!state.profile.pro && current.length > 0 && (
            <p className="px-1 text-center text-xs text-fg-3">
              {current.length}/{FREE_GOAL_LIMIT} free goals used ·{" "}
              <button type="button" onClick={() => openSheet({ type: "paywall" })} className="font-semibold text-accent-2">
                Go unlimited
              </button>
            </p>
          )}
          {achieved.length > 0 && (
            <>
              <SectionTitle>
                <span className="flex items-center gap-1.5">
                  <Trophy size={13} /> Achieved
                </span>
              </SectionTitle>
              {achieved.map((g) => (
                <GoalCard key={g.id} goal={g} />
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="mt-5">
          {habits.length === 0 ? (
            <EmptyState icon="🌱" title="No habits yet" body="Add the small daily actions that build your identity." action={<Button onClick={() => openSheet({ type: "habit" })}>Add a habit</Button>} />
          ) : (
            <List>
              {habits.map((h, i) => {
                const p = precisionRate(h, state.logs, addDays(today, -30), today);
                const st = habitStreak(h, state.logs);
                const goal = state.goals.find((g) => g.id === h.goalId);
                return (
                  <Row key={h.id} className="gap-2 pr-2">
                    <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => navigate({ name: "habit", id: h.id })}>
                      <HabitIcon habit={h} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{h.name}</div>
                        <div className="truncate text-xs text-fg-3">
                          {targetLabel(targetOn(h, today), h.unit)} · {scheduleLabel(h.schedule)}
                          {goal ? ` · ${goal.emoji} ${goal.title}` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cx("num text-sm font-semibold", p === null ? "text-fg-3" : p >= 0.8 ? "text-good" : p >= 0.5 ? "text-fg" : "text-warn")}>
                          {p === null ? "—" : `${Math.round(p * 100)}%`}
                        </div>
                        <div className="text-[10px] text-fg-3">🔥 {st.current}</div>
                      </div>
                    </button>
                    <div className="flex flex-col">
                      <button type="button" disabled={i === 0} onClick={() => state.moveHabit(h.id, -1)} className="rounded p-0.5 text-fg-3 hover:text-fg disabled:opacity-20" aria-label="Move up">
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" disabled={i === habits.length - 1} onClick={() => state.moveHabit(h.id, 1)} className="rounded p-0.5 text-fg-3 hover:text-fg disabled:opacity-20" aria-label="Move down">
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </Row>
                );
              })}
            </List>
          )}
          <p className="mt-3 px-1 text-center text-xs text-fg-3">Precision over the last 30 days</p>
        </div>
      )}

      {archivedCount > 0 && (
        <button type="button" onClick={() => navigate({ name: "archive" })} className="mt-6 flex w-full items-center justify-center gap-1.5 py-2 text-sm font-medium text-fg-3 hover:text-fg">
          <Archive size={15} /> Archive ({archivedCount}) <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}

export function ArchiveScreen() {
  const state = useStore();
  const habits = state.habits.filter((h) => h.archived);
  const goals = state.goals.filter((g) => g.archived);
  return (
    <div>
      <PageHeader title="Archive" back={{ name: "goals" }} />
      {!habits.length && !goals.length && <EmptyState icon="🗄️" title="Nothing archived" body="Archived goals and habits keep their history and show up here." />}
      {goals.length > 0 && (
        <>
          <SectionTitle>Goals</SectionTitle>
          <List>
            {goals.map((g) => (
              <Row key={g.id}>
                <span className="text-2xl">{g.emoji}</span>
                <span className="flex-1 font-medium">{g.title}</span>
                <Button size="sm" variant="secondary" onClick={() => state.archiveGoal(g.id, false)}>
                  Restore
                </Button>
              </Row>
            ))}
          </List>
        </>
      )}
      {habits.length > 0 && (
        <>
          <SectionTitle>Habits</SectionTitle>
          <List>
            {habits.map((h) => (
              <Row key={h.id}>
                <HabitIcon habit={h} size={36} />
                <button type="button" className="flex-1 text-left font-medium" onClick={() => navigate({ name: "habit", id: h.id })}>
                  {h.name}
                </button>
                <Button size="sm" variant="secondary" onClick={() => state.restoreHabit(h.id)}>
                  Restore
                </Button>
              </Row>
            ))}
          </List>
        </>
      )}
    </div>
  );
}
