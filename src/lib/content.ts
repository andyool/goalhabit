import { APP_NAME } from "./brand";
import type { ColorKey, GoalKind, GoalTracking, HabitSchedule, TimeOfDay } from "./types";

export const COLORS: Record<ColorKey, string> = {
  blue: "#3D7BFF",
  indigo: "#6366F1",
  violet: "#8B5CF6",
  pink: "#EC4899",
  red: "#EF4444",
  orange: "#F97316",
  amber: "#F5B32A",
  green: "#22C55E",
  teal: "#14B8A6",
  cyan: "#06B6D4",
};

export const COLOR_KEYS = Object.keys(COLORS) as ColorKey[];

export const EMOJIS = [
  "🎯", "📚", "🏃", "💪", "🧘", "💧", "🥗", "😴", "✍️", "💻", "🎸", "🧠",
  "💰", "📈", "🚭", "📵", "🌅", "🚶", "🏋️", "🚴", "🏊", "🧹", "🙏", "❤️",
  "🎨", "🗣️", "🌱", "☀️", "🧊", "🍎", "📝", "⏱️", "🎧", "🧗", "⚽", "🏆",
];

export interface Area {
  id: string;
  label: string;
  emoji: string;
}

export const AREAS: Area[] = [
  { id: "fitness", label: "Fitness", emoji: "💪" },
  { id: "mind", label: "Mind & Focus", emoji: "🧠" },
  { id: "career", label: "Career", emoji: "💼" },
  { id: "learning", label: "Learning", emoji: "📚" },
  { id: "finance", label: "Finance", emoji: "💰" },
  { id: "health", label: "Health", emoji: "🥗" },
  { id: "creativity", label: "Creativity", emoji: "🎨" },
  { id: "relationships", label: "Relationships", emoji: "❤️" },
];

export interface HabitTemplate {
  name: string;
  emoji: string;
  color: ColorKey;
  target: number;
  unit: string;
  schedule: HabitSchedule;
  timeOfDay: TimeOfDay;
  linkUnits?: boolean;
}

export interface GoalTemplate {
  id: string;
  area: string;
  title: string;
  emoji: string;
  color: ColorKey;
  kind: GoalKind;
  tracking: GoalTracking;
  startValue: number;
  targetValue: number;
  unit: string;
  days: number;
  why: string;
  milestones: string[];
  habits: HabitTemplate[];
}

const daily: HabitSchedule = { type: "daily" };

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: "run-100k",
    area: "fitness",
    title: "Run 100 km",
    emoji: "🏃",
    color: "orange",
    kind: "numeric",
    tracking: "cumulative",
    startValue: 0,
    targetValue: 100,
    unit: "km",
    days: 60,
    why: "Build an engine I can rely on and feel strong every day.",
    milestones: ["First 10 km", "Halfway — 50 km", "Run 10 km in one go"],
    habits: [
      { name: "Run", emoji: "🏃", color: "orange", target: 3, unit: "km", schedule: { type: "weekly", times: 4 }, timeOfDay: "morning", linkUnits: true },
      { name: "Stretch", emoji: "🧘", color: "teal", target: 10, unit: "min", schedule: daily, timeOfDay: "evening" },
    ],
  },
  {
    id: "strength",
    area: "fitness",
    title: "Train 60 sessions",
    emoji: "🏋️",
    color: "red",
    kind: "numeric",
    tracking: "cumulative",
    startValue: 0,
    targetValue: 60,
    unit: "sessions",
    days: 90,
    why: "Get visibly stronger and keep the promise I make to myself.",
    milestones: ["Two weeks without a missed session", "Add 10% to main lifts", "60 sessions done"],
    habits: [
      { name: "Workout", emoji: "🏋️", color: "red", target: 1, unit: "session", schedule: { type: "weekdays", days: [0, 2, 4, 5] }, timeOfDay: "afternoon", linkUnits: true },
      { name: "Protein target", emoji: "🥗", color: "green", target: 1, unit: "times", schedule: daily, timeOfDay: "anytime" },
    ],
  },
  {
    id: "read-12",
    area: "learning",
    title: "Read 12 books",
    emoji: "📚",
    color: "indigo",
    kind: "numeric",
    tracking: "cumulative",
    startValue: 0,
    targetValue: 3600,
    unit: "pages",
    days: 180,
    why: "Think more clearly and learn from people smarter than me.",
    milestones: ["Finish book 1", "Finish book 6", "Finish book 12"],
    habits: [
      { name: "Read", emoji: "📚", color: "indigo", target: 20, unit: "pages", schedule: daily, timeOfDay: "evening", linkUnits: true },
    ],
  },
  {
    id: "language",
    area: "learning",
    title: "Reach conversational Spanish",
    emoji: "🗣️",
    color: "amber",
    kind: "milestones",
    tracking: "cumulative",
    startValue: 0,
    targetValue: 1,
    unit: "",
    days: 120,
    why: "Connect with people on my travels without a phrasebook.",
    milestones: ["Learn 500 core words", "Hold a 5-minute conversation", "Watch a show without subtitles", "30-minute conversation with a native speaker"],
    habits: [
      { name: "Language practice", emoji: "🗣️", color: "amber", target: 20, unit: "min", schedule: daily, timeOfDay: "morning" },
      { name: "Speaking session", emoji: "🎧", color: "orange", target: 1, unit: "times", schedule: { type: "weekly", times: 2 }, timeOfDay: "anytime" },
    ],
  },
  {
    id: "deep-work",
    area: "career",
    title: "Ship my side project",
    emoji: "💻",
    color: "blue",
    kind: "milestones",
    tracking: "cumulative",
    startValue: 0,
    targetValue: 1,
    unit: "",
    days: 60,
    why: "Prove to myself I can finish what I start.",
    milestones: ["Define the MVP scope", "Working prototype", "First 10 users", "Public launch"],
    habits: [
      { name: "Deep work", emoji: "💻", color: "blue", target: 90, unit: "min", schedule: { type: "weekdays", days: [0, 1, 2, 3, 4] }, timeOfDay: "morning" },
      { name: "No phone first hour", emoji: "📵", color: "violet", target: 1, unit: "times", schedule: daily, timeOfDay: "morning" },
    ],
  },
  {
    id: "promotion",
    area: "career",
    title: "Earn a promotion",
    emoji: "📈",
    color: "cyan",
    kind: "milestones",
    tracking: "cumulative",
    startValue: 0,
    targetValue: 1,
    unit: "",
    days: 180,
    why: "Grow into the role I want and be paid for the value I create.",
    milestones: ["Agree on expectations with my manager", "Lead one visible project", "Collect feedback from 3 peers", "Promotion conversation"],
    habits: [
      { name: "Plan tomorrow", emoji: "📝", color: "cyan", target: 1, unit: "times", schedule: { type: "weekdays", days: [0, 1, 2, 3, 4] }, timeOfDay: "evening" },
      { name: "Learn a skill", emoji: "🧠", color: "indigo", target: 30, unit: "min", schedule: { type: "weekly", times: 3 }, timeOfDay: "anytime" },
    ],
  },
  {
    id: "save",
    area: "finance",
    title: "Save $5,000",
    emoji: "💰",
    color: "green",
    kind: "numeric",
    tracking: "cumulative",
    startValue: 0,
    targetValue: 5000,
    unit: "$",
    days: 180,
    why: "Have a safety net so I can make decisions from calm, not fear.",
    milestones: ["$1,000 emergency buffer", "$2,500 saved", "$5,000 saved"],
    habits: [
      { name: "No-spend day", emoji: "💰", color: "green", target: 1, unit: "times", schedule: { type: "weekly", times: 4 }, timeOfDay: "anytime" },
      { name: "Track expenses", emoji: "📝", color: "teal", target: 1, unit: "times", schedule: daily, timeOfDay: "evening" },
    ],
  },
  {
    id: "meditate",
    area: "mind",
    title: "Meditate 30 hours",
    emoji: "🧘",
    color: "violet",
    kind: "numeric",
    tracking: "cumulative",
    startValue: 0,
    targetValue: 1800,
    unit: "min",
    days: 120,
    why: "Stay calm under pressure and stop living on autopilot.",
    milestones: ["7 days in a row", "10 hours total", "30 hours total"],
    habits: [
      { name: "Meditate", emoji: "🧘", color: "violet", target: 15, unit: "min", schedule: daily, timeOfDay: "morning", linkUnits: true },
      { name: "Journal", emoji: "✍️", color: "pink", target: 1, unit: "times", schedule: daily, timeOfDay: "evening" },
    ],
  },
  {
    id: "screen",
    area: "mind",
    title: "Cut screen time in half",
    emoji: "📵",
    color: "pink",
    kind: "numeric",
    tracking: "measurement",
    startValue: 6,
    targetValue: 3,
    unit: "h/day",
    days: 45,
    why: "Take my attention back and spend it on what matters.",
    milestones: ["Delete social apps from home screen", "Under 4.5 h/day", "Under 3 h/day"],
    habits: [
      { name: "Phone-free morning", emoji: "📵", color: "pink", target: 1, unit: "times", schedule: daily, timeOfDay: "morning" },
      { name: "Walk outside", emoji: "🚶", color: "green", target: 20, unit: "min", schedule: daily, timeOfDay: "afternoon" },
    ],
  },
  {
    id: "weight",
    area: "health",
    title: "Lose 6 kg",
    emoji: "🥗",
    color: "teal",
    kind: "numeric",
    tracking: "measurement",
    startValue: 84,
    targetValue: 78,
    unit: "kg",
    days: 90,
    why: "Feel light, energetic and confident in my body.",
    milestones: ["-2 kg", "-4 kg", "-6 kg"],
    habits: [
      { name: "Drink water", emoji: "💧", color: "cyan", target: 8, unit: "glasses", schedule: daily, timeOfDay: "anytime" },
      { name: "10k steps", emoji: "🚶", color: "green", target: 10000, unit: "steps", schedule: daily, timeOfDay: "anytime" },
      { name: "No sugar", emoji: "🍎", color: "red", target: 1, unit: "times", schedule: daily, timeOfDay: "anytime" },
    ],
  },
  {
    id: "sleep",
    area: "health",
    title: "Fix my sleep",
    emoji: "😴",
    color: "indigo",
    kind: "milestones",
    tracking: "cumulative",
    startValue: 0,
    targetValue: 1,
    unit: "",
    days: 30,
    why: "Wake up rested and stop running on caffeine.",
    milestones: ["Set a fixed bedtime", "7 nights in bed before 11pm", "Wake without an alarm"],
    habits: [
      { name: "In bed by 23:00", emoji: "😴", color: "indigo", target: 1, unit: "times", schedule: daily, timeOfDay: "evening" },
      { name: "No screens after 22:00", emoji: "📵", color: "violet", target: 1, unit: "times", schedule: daily, timeOfDay: "evening" },
    ],
  },
  {
    id: "create",
    area: "creativity",
    title: "Publish 20 pieces",
    emoji: "🎨",
    color: "pink",
    kind: "numeric",
    tracking: "cumulative",
    startValue: 0,
    targetValue: 20,
    unit: "pieces",
    days: 90,
    why: "Get my work out of my head and into the world.",
    milestones: ["First piece published", "10 pieces", "20 pieces"],
    habits: [
      { name: "Create", emoji: "🎨", color: "pink", target: 45, unit: "min", schedule: { type: "weekly", times: 5 }, timeOfDay: "anytime" },
      { name: "Publish", emoji: "🚀", color: "amber", target: 1, unit: "piece", schedule: { type: "weekly", times: 2 }, timeOfDay: "anytime", linkUnits: true },
    ],
  },
  {
    id: "connect",
    area: "relationships",
    title: "Be more present with people I love",
    emoji: "❤️",
    color: "red",
    kind: "milestones",
    tracking: "cumulative",
    startValue: 0,
    targetValue: 1,
    unit: "",
    days: 60,
    why: "The people close to me deserve my full attention.",
    milestones: ["Weekly call with family for a month", "Plan a trip with friends", "Phone-free dinners for 30 days"],
    habits: [
      { name: "Reach out to someone", emoji: "💬", color: "red", target: 1, unit: "times", schedule: daily, timeOfDay: "anytime" },
      { name: "Phone-free dinner", emoji: "🍽️", color: "orange", target: 1, unit: "times", schedule: daily, timeOfDay: "evening" },
    ],
  },
];

export const QUICK_HABITS: HabitTemplate[] = [
  { name: "Drink water", emoji: "💧", color: "cyan", target: 8, unit: "glasses", schedule: daily, timeOfDay: "anytime" },
  { name: "Read", emoji: "📚", color: "indigo", target: 10, unit: "pages", schedule: daily, timeOfDay: "evening" },
  { name: "Meditate", emoji: "🧘", color: "violet", target: 10, unit: "min", schedule: daily, timeOfDay: "morning" },
  { name: "Workout", emoji: "🏋️", color: "red", target: 1, unit: "times", schedule: { type: "weekly", times: 3 }, timeOfDay: "afternoon" },
  { name: "Walk", emoji: "🚶", color: "green", target: 30, unit: "min", schedule: daily, timeOfDay: "anytime" },
  { name: "Journal", emoji: "✍️", color: "pink", target: 1, unit: "times", schedule: daily, timeOfDay: "evening" },
  { name: "Wake up early", emoji: "🌅", color: "amber", target: 1, unit: "times", schedule: { type: "weekdays", days: [0, 1, 2, 3, 4] }, timeOfDay: "morning" },
  { name: "Deep work", emoji: "💻", color: "blue", target: 60, unit: "min", schedule: { type: "weekdays", days: [0, 1, 2, 3, 4] }, timeOfDay: "morning" },
  { name: "Cold shower", emoji: "🧊", color: "teal", target: 1, unit: "times", schedule: daily, timeOfDay: "morning" },
  { name: "No social media", emoji: "📵", color: "orange", target: 1, unit: "times", schedule: daily, timeOfDay: "anytime" },
];

export interface ChallengeTemplate {
  id: string;
  title: string;
  emoji: string;
  color: ColorKey;
  days: number;
  tagline: string;
  description: string;
  habits: HabitTemplate[];
}

export const CHALLENGES: ChallengeTemplate[] = [
  {
    id: "75-soft",
    title: "75 Soft",
    emoji: "🔥",
    color: "orange",
    days: 75,
    tagline: "The sustainable discipline reset",
    description: "Eat well, train 45 minutes, drink 3 litres of water and read 10 pages — every day for 75 days. One rest day per week for training.",
    habits: [
      { name: "Train 45 min", emoji: "🏋️", color: "orange", target: 45, unit: "min", schedule: { type: "weekly", times: 6 }, timeOfDay: "anytime" },
      { name: "Drink 3 L water", emoji: "💧", color: "cyan", target: 3, unit: "L", schedule: daily, timeOfDay: "anytime" },
      { name: "Read 10 pages", emoji: "📚", color: "indigo", target: 10, unit: "pages", schedule: daily, timeOfDay: "evening" },
      { name: "Eat clean", emoji: "🥗", color: "green", target: 1, unit: "times", schedule: daily, timeOfDay: "anytime" },
    ],
  },
  {
    id: "monk-mode",
    title: "Monk Mode",
    emoji: "🧘",
    color: "violet",
    days: 30,
    tagline: "Cut the noise. Go deep.",
    description: "A month of deep focus: two hours of deep work, daily meditation and zero social media. Built for creators and founders who lose focus fast.",
    habits: [
      { name: "Deep work", emoji: "💻", color: "blue", target: 120, unit: "min", schedule: daily, timeOfDay: "morning" },
      { name: "Meditate", emoji: "🧘", color: "violet", target: 10, unit: "min", schedule: daily, timeOfDay: "morning" },
      { name: "Zero social media", emoji: "📵", color: "pink", target: 1, unit: "times", schedule: daily, timeOfDay: "anytime" },
    ],
  },
  {
    id: "5am-club",
    title: "5AM Club",
    emoji: "🌅",
    color: "amber",
    days: 21,
    tagline: "Win the morning, win the day",
    description: "Wake at 5 AM and complete a 20/20/20 routine: move, reflect, learn. 21 days to make early rising automatic.",
    habits: [
      { name: "Wake at 5 AM", emoji: "🌅", color: "amber", target: 1, unit: "times", schedule: daily, timeOfDay: "morning" },
      { name: "Move", emoji: "🏃", color: "orange", target: 20, unit: "min", schedule: daily, timeOfDay: "morning" },
      { name: "Reflect", emoji: "✍️", color: "pink", target: 20, unit: "min", schedule: daily, timeOfDay: "morning" },
      { name: "Learn", emoji: "🧠", color: "indigo", target: 20, unit: "min", schedule: daily, timeOfDay: "morning" },
    ],
  },
  {
    id: "dopamine-detox",
    title: "Dopamine Detox",
    emoji: "📵",
    color: "pink",
    days: 14,
    tagline: "Reset your reward system",
    description: "Two weeks without cheap dopamine: no short-form video, no junk food, and a daily walk without your phone.",
    habits: [
      { name: "No short-form video", emoji: "📵", color: "pink", target: 1, unit: "times", schedule: daily, timeOfDay: "anytime" },
      { name: "No junk food", emoji: "🍎", color: "red", target: 1, unit: "times", schedule: daily, timeOfDay: "anytime" },
      { name: "Phone-free walk", emoji: "🚶", color: "green", target: 20, unit: "min", schedule: daily, timeOfDay: "afternoon" },
    ],
  },
  {
    id: "10k-steps",
    title: "10K Steps",
    emoji: "🚶",
    color: "green",
    days: 30,
    tagline: "The simplest health upgrade",
    description: "Hit 10,000 steps every day for 30 days. Small daily action, big compound result.",
    habits: [{ name: "10,000 steps", emoji: "🚶", color: "green", target: 10000, unit: "steps", schedule: daily, timeOfDay: "anytime" }],
  },
  {
    id: "reading-sprint",
    title: "Reading Sprint",
    emoji: "📚",
    color: "indigo",
    days: 30,
    tagline: "Finish 2 books this month",
    description: "Read 20 pages a day for 30 days — that's two average books. Replace the evening scroll with a chapter.",
    habits: [{ name: "Read 20 pages", emoji: "📚", color: "indigo", target: 20, unit: "pages", schedule: daily, timeOfDay: "evening" }],
  },
];

export interface Lesson {
  id: string;
  title: string;
  emoji: string;
  minutes: number;
  summary: string;
  body: string[];
  takeaways: string[];
}

export const LESSONS: Lesson[] = [
  {
    id: "systems",
    title: "Goals set direction. Systems make progress.",
    emoji: "🧭",
    minutes: 3,
    summary: "Why winners and losers share the same goals — and what actually separates them.",
    body: [
      "Everyone in a race wants to win. The goal is identical for winners and losers, so the goal can't be what makes the difference. What differs is the system: the daily actions you repeat whether you feel like it or not.",
      "A goal is a single moment of success. A system is a process you can run every day. When you focus only on the goal, you are unhappy until you reach it, and you tend to stop once you do.",
      `Use your goal to choose direction, then put nearly all your attention on the habits that move you toward it. That is why every goal in ${APP_NAME} links to daily actions — the goal is the compass, the habits are the engine.`,
    ],
    takeaways: ["Pick one goal per area and link 1–3 habits to it", "Judge your day by the habits, not the distance to the goal", "Review the goal weekly, the habits daily"],
  },
  {
    id: "precision",
    title: "Precision beats perfection",
    emoji: "🎯",
    minutes: 3,
    summary: "The 70% rule and why all-or-nothing thinking kills discipline.",
    body: [
      "Streak-based trackers punish a single miss. One bad day resets months of work to zero, and many people quit right there. That's the 'what the hell' effect: once the streak is broken, why bother?",
      "Research on habit formation shows missing a single day barely affects long-term automaticity. What matters is that you return quickly. Precision — how often you hit your intended rhythm — is a far more honest measure than an unbroken chain.",
      `${APP_NAME}'s Locked-In Score only asks for 70% of your habits each day. It is high enough to demand real commitment, and forgiving enough that one tough evening doesn't erase your progress.`,
    ],
    takeaways: ["Aim for 70%+ of habits, every day", "Never miss twice in a row", "Track precision over weeks, not perfection over days"],
  },
  {
    id: "two-minute",
    title: "Make it so small you can't say no",
    emoji: "🌱",
    minutes: 2,
    summary: "Scaling habits down to build the identity first.",
    body: [
      "Motivation is unreliable. On the hardest days you need a version of the habit that takes less effort than the excuse. Read one page. Put on your running shoes. Meditate for two minutes.",
      "The point isn't the size of the action — it's casting a vote for the person you are becoming. Once showing up is automatic, scaling up is easy.",
      "Improvement Mode automates this: when your precision drops, it lowers the target so you keep showing up; when you're crushing it, it raises the bar a little.",
    ],
    takeaways: ["Define a minimum version of every habit", "Master showing up before optimizing", "Let Improvement Mode scale targets for you"],
  },
  {
    id: "environment",
    title: "Design your environment",
    emoji: "🏠",
    minutes: 3,
    summary: "Discipline is easier when the right choice is the easy choice.",
    body: [
      "People with great self-control aren't resisting temptation all day — they've arranged their lives so they rarely face it. Every habit has friction. Your job is to reduce friction for good habits and add friction to bad ones.",
      "Put the book on your pillow. Lay out your gym clothes the night before. Log out of social apps and move them off your home screen. Charge your phone outside the bedroom.",
      "Small changes to your surroundings do more than any amount of willpower.",
    ],
    takeaways: ["Make cues for good habits obvious", "Add at least 20 seconds of friction to bad habits", "Prepare tomorrow's environment tonight"],
  },
  {
    id: "stacking",
    title: "Habit stacking",
    emoji: "🧱",
    minutes: 2,
    summary: "Anchor new habits to ones you already do.",
    body: [
      "Your day already has reliable anchors: waking up, coffee, lunch, brushing your teeth. Attach new habits to them using a simple formula: 'After I [current habit], I will [new habit].'",
      "After I pour my coffee, I will meditate for five minutes. After I close my laptop, I will plan tomorrow. The existing habit becomes the trigger, so you don't have to remember.",
      "Use the time-of-day setting on each habit to group them into morning, afternoon and evening stacks.",
    ],
    takeaways: ["Write one stack for mornings and one for evenings", "Keep stacks short: 2–4 habits", "Order matters — go from easiest to hardest"],
  },
  {
    id: "review",
    title: "The weekly review",
    emoji: "🔁",
    minutes: 3,
    summary: "Fifteen minutes a week that keeps you pointed in the right direction.",
    body: [
      "Without reflection, you repeat the same week over and over. A weekly review turns raw data into decisions: what worked, what didn't, and what you'll change.",
      "Look at your precision per habit and your Focus Score trend. Name one win and one obstacle. Then choose a single focus goal for the next week and write down an intention.",
      `${APP_NAME} prompts you every Sunday and Monday — make it a ritual with your favourite drink.`,
    ],
    takeaways: ["Same time, same place, every week", "Celebrate one win before fixing anything", "Choose one focus goal, not five"],
  },
  {
    id: "energy",
    title: "Manage energy, not time",
    emoji: "⚡",
    minutes: 3,
    summary: "Match hard tasks to your peak hours.",
    body: [
      "You don't have the same capacity at 9 AM and 9 PM. Most people have a peak window for deep focus, a trough after lunch, and a recovery phase in the evening.",
      `${APP_NAME} records when you complete habits and how you feel in daily check-ins. Deep Analysis shows your most productive hours and how your mood tracks your consistency.`,
      "Put your hardest habit in your peak window and protect it like a meeting.",
    ],
    takeaways: ["Find your peak hours in Insights", "Schedule deep work there", "Use troughs for easy, admin-style habits"],
  },
  {
    id: "identity",
    title: "Become the person, not the result",
    emoji: "🪞",
    minutes: 2,
    summary: "Identity-based habits last longer than outcome-based ones.",
    body: [
      "'I'm trying to quit smoking' and 'I'm not a smoker' lead to very different behaviour. The first is a fight against yourself. The second is simply being who you are.",
      "Every time you complete a habit you gather evidence for a new identity. Ten check-ins make you someone who works out. A hundred make it who you are.",
      `Write the 'why' for every goal in ${APP_NAME} as a statement about the person you are becoming.`,
    ],
    takeaways: ["Decide who you want to be", "Prove it with small wins", "Let your stats be the evidence"],
  },
];

export const MOODS = ["😞", "😕", "😐", "🙂", "😄"];
export const ENERGY = ["🪫", "😪", "⚖️", "⚡", "🚀"];
