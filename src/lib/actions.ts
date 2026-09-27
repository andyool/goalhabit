import { todayKey } from "./date";
import type { Suggestion } from "./insights";
import { targetOn } from "./metrics";
import { useStore } from "./store";
import { navigate, toast, useUI } from "./ui";

export function applySuggestion(s: Suggestion) {
  const a = s.action?.do;
  if (!a) return;
  const st = useStore.getState();
  switch (a.type) {
    case "setTarget": {
      const h = st.habits.find((x) => x.id === a.habitId);
      st.updateHabit(a.habitId, { target: a.target });
      st.dismissSuggestion(s.key);
      if (h) toast(`${h.emoji} ${h.name} target set to ${a.target} ${h.unit}`, "good");
      break;
    }
    case "setSchedule":
      st.updateHabit(a.habitId, { schedule: a.schedule });
      st.dismissSuggestion(s.key);
      toast("Schedule updated", "good");
      break;
    case "enableImprovement":
      st.updateHabit(a.habitId, { improvementMode: true, lastAdjust: todayKey() });
      st.dismissSuggestion(s.key);
      toast("Improvement Mode on — targets now adapt weekly", "good");
      break;
    case "newHabitForGoal":
      useUI.getState().openSheet({ type: "habit", goalId: a.goalId });
      break;
    case "openReview":
      navigate({ name: "review" });
      break;
    case "openGoal":
      navigate({ name: "goal", id: a.goalId });
      break;
  }
}

/** Toggle a habit between done and not done for a day. */
export function toggleHabit(habitId: string, day: string) {
  const st = useStore.getState();
  const h = st.habits.find((x) => x.id === habitId);
  if (!h) return;
  const t = targetOn(h, day);
  const cur = st.logs[day]?.[habitId]?.value ?? 0;
  const next = cur >= t ? 0 : t;
  st.setLog(habitId, day, next);
  if (navigator.vibrate) navigator.vibrate(next ? 12 : 6);
}

export function openNewGoal() {
  useUI.getState().openSheet({ type: "goal" });
}

export function fmtNum(n: number) {
  return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/** "20 pages", or "Once" for simple yes/no habits. */
export function targetLabel(target: number, unit: string) {
  return target === 1 && unit === "times" ? "Once" : `${fmtNum(target)} ${unit}`;
}

export function scheduleLabel(s: import("./types").HabitSchedule): string {
  if (s.type === "daily") return "Every day";
  if (s.type === "weekly") return `${s.times}× per week`;
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const d = [...s.days].sort();
  if (d.join() === "0,1,2,3,4") return "Weekdays";
  if (d.join() === "5,6") return "Weekends";
  return d.map((i) => names[i]).join(", ");
}
