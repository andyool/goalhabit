import type { DateKey } from "./date";

export type ID = string;

export type ColorKey =
  | "blue"
  | "indigo"
  | "violet"
  | "pink"
  | "red"
  | "orange"
  | "amber"
  | "green"
  | "teal"
  | "cyan";

export type HabitSchedule =
  | { type: "daily" }
  | { type: "weekdays"; days: number[] } // 0 = Monday ... 6 = Sunday
  | { type: "weekly"; times: number }; // flexible: N times per week

export type TimeOfDay = "anytime" | "morning" | "afternoon" | "evening";

export interface Habit {
  id: ID;
  name: string;
  emoji: string;
  color: ColorKey;
  schedule: HabitSchedule;
  /** Current daily target; history keeps past targets so old days are scored fairly. */
  target: number;
  unit: string;
  targetHistory: { from: DateKey; target: number }[];
  goalId?: ID;
  /** When true, logged amounts count toward the linked goal's value. */
  linkUnits: boolean;
  reminder?: string; // "HH:MM"
  timeOfDay: TimeOfDay;
  improvementMode: boolean;
  lastAdjust?: DateKey;
  challengeId?: ID;
  createdAt: DateKey;
  archived: boolean;
  /** First day the habit no longer counts (history before it is kept). */
  archivedAt?: DateKey;
  order: number;
}

export interface LogEntry {
  value: number;
  /** epoch ms of the most recent update — used for time-of-day patterns */
  at: number;
}

/** logs[dateKey][habitId] */
export type Logs = Record<DateKey, Record<ID, LogEntry>>;

export interface Milestone {
  id: ID;
  title: string;
  dueDate?: DateKey;
  done: boolean;
  doneAt?: DateKey;
}

export interface ProgressEntry {
  id: ID;
  date: DateKey;
  value: number;
  note?: string;
}

export type GoalKind = "numeric" | "milestones";
/** cumulative: entries add up (read 24 books). measurement: latest entry is the value (weight 80kg). */
export type GoalTracking = "cumulative" | "measurement";

export interface Goal {
  id: ID;
  title: string;
  emoji: string;
  color: ColorKey;
  category: string;
  why: string;
  kind: GoalKind;
  tracking: GoalTracking;
  startValue: number;
  targetValue: number;
  unit: string;
  entries: ProgressEntry[];
  milestones: Milestone[];
  startDate: DateKey;
  deadline?: DateKey;
  completedAt?: DateKey;
  archived: boolean;
  createdAt: DateKey;
  order: number;
}

export interface CheckIn {
  mood: number; // 1-5
  energy: number; // 1-5
  note?: string;
}

export interface WeeklyReview {
  weekStart: DateKey;
  rating: number;
  win: string;
  obstacle: string;
  focusGoalId?: ID;
  intention: string;
  createdAt: number;
}

export interface JoinedChallenge {
  id: ID; // template id
  joinedAt: DateKey;
  habitIds: ID[];
  leftAt?: DateKey;
}

export interface Profile {
  name: string;
  areas: string[];
  onboarded: boolean;
  theme: "dark" | "light" | "system";
  remindersEnabled: boolean;
  offTrackAlerts: boolean;
  createdAt: DateKey;
}

export interface AppState {
  profile: Profile;
  habits: Habit[];
  goals: Goal[];
  logs: Logs;
  checkIns: Record<DateKey, CheckIn>;
  reviews: WeeklyReview[];
  challenges: JoinedChallenge[];
  lessonsRead: ID[];
  dismissedSuggestions: string[];
  activity: { id: ID; at: number; text: string }[];
}
