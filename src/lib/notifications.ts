import { APP_NAME } from "./brand";
import { todayKey } from "./date";
import { goalPace, goalProgress, isDoneOn, isScheduledOn } from "./metrics";
import { useStore } from "./store";
import { toast } from "./ui";

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

async function notify(title: string, body: string, tag: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag, icon: "/icon-192.png", badge: "/icon-192.png" });
    else new Notification(title, { body, tag, icon: "/icon-192.png" });
  } catch {
    // Some browsers only allow notifications from a service worker; ignore failures.
  }
}

function once(key: string): boolean {
  try {
    const k = `notified:${key}`;
    if (localStorage.getItem(k)) return false;
    localStorage.setItem(k, "1");
    return true;
  } catch {
    return true;
  }
}

function tick() {
  const s = useStore.getState();
  if (!s.profile.onboarded) return;
  const today = todayKey();
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  if (s.profile.remindersEnabled) {
    for (const h of s.habits) {
      if (h.archived || !h.reminder || h.reminder > hhmm) continue;
      if (!isScheduledOn(h, today) || isDoneOn(h, s.logs, today)) continue;
      if (!once(`${today}:${h.id}`)) continue;
      void notify(`${h.emoji} ${h.name}`, `Time for ${h.name.toLowerCase()} — ${h.target} ${h.unit}. Stay locked in.`, `habit-${h.id}`);
    }
  }

  if (s.profile.offTrackAlerts && now.getHours() >= 9) {
    const off = s.goals.filter((g) => {
      if (g.archived || g.completedAt) return false;
      const st = goalPace(g, goalProgress(g, s.habits, s.logs, today), today).status;
      return st === "off-track" || st === "overdue";
    });
    if (off.length && once(`${today}:offtrack`)) {
      const text = off.length === 1 ? `${off[0].emoji} ${off[0].title} is off track. Your Agent has a fix.` : `${off.length} goals are off track. Your Agent has suggestions.`;
      toast(text, "warn");
      void notify(APP_NAME, text, "off-track");
    }
  }
}

let lastDay = "";

function daily() {
  const today = todayKey();
  if (today === lastDay) return;
  lastDay = today;
  const s = useStore.getState();
  if (!s.profile.onboarded) return;
  const notes = s.runImprovementMode();
  notes.forEach((n, i) => setTimeout(() => toast(`Improvement Mode · ${n}`, "good"), 600 + i * 400));
}

export function startBackgroundLoops() {
  daily();
  setTimeout(tick, 1500);
  const id = setInterval(() => {
    daily();
    tick();
  }, 30_000);
  return () => clearInterval(id);
}
