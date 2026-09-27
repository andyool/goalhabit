/** Local calendar-day helpers. A DateKey is a local "YYYY-MM-DD" string. */
export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now: Date = new Date()): DateKey {
  return toKey(now);
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: DateKey, b: DateKey): number {
  const ms = fromKey(b).getTime() - fromKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** 0 = Monday ... 6 = Sunday */
export function weekdayIndex(key: DateKey): number {
  return (fromKey(key).getDay() + 6) % 7;
}

export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -weekdayIndex(key));
}

export function rangeKeys(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

export const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const WEEKDAYS_LETTER = ["M", "T", "W", "T", "F", "S", "S"];
export const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function formatDay(key: DateKey, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return fromKey(key).toLocaleDateString(undefined, opts);
}

export function relativeDay(key: DateKey, today: DateKey = todayKey()): string {
  const d = diffDays(today, key);
  if (d === 0) return "Today";
  if (d === -1) return "Yesterday";
  if (d === 1) return "Tomorrow";
  if (d < 0 && d > -7) return `${-d} days ago`;
  if (d > 0 && d < 7) return `In ${d} days`;
  return formatDay(key, { month: "short", day: "numeric", year: fromKey(key).getFullYear() === fromKey(today).getFullYear() ? undefined : "numeric" });
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
