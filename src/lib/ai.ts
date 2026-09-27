/**
 * The Agent — an in-app coach backed by Claude. It runs entirely in the
 * browser with the user's own API key, and can act on the app through tools
 * (create goals/habits, tune targets, log progress).
 */
import type Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam, BetaToolUnion, BetaToolResultBlockParam, BetaToolUseBlock } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { addDays, todayKey } from "./date";
import { COLOR_KEYS } from "./content";
import { coachContext } from "./insights";
import { FREE_GOAL_LIMIT, snapshot, useStore } from "./store";
import type { ColorKey, HabitSchedule } from "./types";
import { APP_NAME } from "./brand";

const SYSTEM = `You are the ${APP_NAME} Agent: a sharp, warm discipline coach inside the ${APP_NAME} habit & goal tracking app.

How ${APP_NAME} works:
- Goals are SMART outcomes (numeric with a target value/unit, or milestone-based) with deadlines. Habits are the daily actions that drive them; a habit can be linked to a goal, and with unit linking its logged amounts add to the goal's value.
- Focus Score (0-100) = 70% of today's weighted habit completion + 30% momentum from the previous 6 days.
- Precision Rate = how closely a habit hits its intended rhythm (partial completions count partially).
- Locked-In Score = time since the current run of days with at least 70% of habits done began. ${APP_NAME} favours precision over perfection: never miss twice.
- Improvement Mode automatically raises a habit's target after a strong week (>=90%) and lowers it after a weak one (<50%).

How to coach:
- Call get_overview at the start of a conversation and whenever you need fresh numbers. Ground every observation in the user's actual data; quote specific numbers.
- Be concise and direct: short paragraphs or tight bullet lists, no filler. Use **bold** for key numbers. Offer one clear next step.
- You can change the app with tools. When the user asks you to plan, create or adjust something, do it with tools rather than describing it, then summarize what you changed. For bigger restructures (archiving habits, several changes at once) propose first and act once the user agrees.
- When creating goals make them SMART: specific title, measurable target or milestones, realistic deadline, and a personal "why". Link 1-3 small habits to each goal and prefer targets the user can hit on a bad day.
- Dates are YYYY-MM-DD in the user's local calendar.`;

const scheduleShape = {
  schedule_type: z.enum(["daily", "weekdays", "weekly"]).optional(),
  days: z.array(z.number().int().min(0).max(6)).optional(),
  times_per_week: z.number().int().min(1).max(7).optional(),
};

const Inputs = {
  get_overview: z.object({}).passthrough(),
  create_goal: z.object({
    title: z.string().min(1),
    emoji: z.string().optional(),
    kind: z.enum(["numeric", "milestones"]),
    tracking: z.enum(["cumulative", "measurement"]).optional(),
    start_value: z.number().optional(),
    target_value: z.number().optional(),
    unit: z.string().optional(),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    why: z.string().optional(),
    milestones: z.array(z.string()).optional(),
  }),
  create_habit: z.object({
    name: z.string().min(1),
    emoji: z.string().optional(),
    target: z.number().positive(),
    unit: z.string().min(1),
    ...scheduleShape,
    time_of_day: z.enum(["anytime", "morning", "afternoon", "evening"]).optional(),
    goal_id: z.string().optional(),
    link_units: z.boolean().optional(),
    reminder: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }),
  update_habit: z.object({
    habit_id: z.string(),
    name: z.string().optional(),
    target: z.number().positive().optional(),
    ...scheduleShape,
    time_of_day: z.enum(["anytime", "morning", "afternoon", "evening"]).optional(),
    improvement_mode: z.boolean().optional(),
    goal_id: z.string().nullable().optional(),
  }),
  archive_habit: z.object({ habit_id: z.string() }),
  log_habit: z.object({ habit_id: z.string(), value: z.number().min(0), date: z.string().optional() }),
  add_milestone: z.object({ goal_id: z.string(), title: z.string().min(1), due_date: z.string().optional() }),
  complete_milestone: z.object({ goal_id: z.string(), milestone_id: z.string() }),
  log_goal_progress: z.object({ goal_id: z.string(), value: z.number(), note: z.string().optional() }),
};

type ToolName = keyof typeof Inputs;

const scheduleProps = {
  schedule_type: { type: "string", enum: ["daily", "weekdays", "weekly"], description: "daily; weekdays = specific days; weekly = flexible N times per week" },
  days: { type: "array", items: { type: "integer", minimum: 0, maximum: 6 }, description: "For schedule_type=weekdays. 0=Monday ... 6=Sunday" },
  times_per_week: { type: "integer", minimum: 1, maximum: 7, description: "For schedule_type=weekly" },
} as const;

const TOOLS: BetaToolUnion[] = [
  {
    name: "get_overview",
    description: "Get a fresh snapshot of the user's goals, habits (with ids, targets, precision), Focus Score, today's progress, check-ins, last weekly review and on-device agent findings.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_goal",
    description: "Create a SMART goal. Numeric goals need target_value and unit (cumulative = amounts add up, measurement = latest value like body weight). Milestone goals are tracked by completed milestones.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        emoji: { type: "string", description: "A single emoji" },
        kind: { type: "string", enum: ["numeric", "milestones"] },
        tracking: { type: "string", enum: ["cumulative", "measurement"] },
        start_value: { type: "number" },
        target_value: { type: "number" },
        unit: { type: "string" },
        deadline: { type: "string", description: "YYYY-MM-DD" },
        why: { type: "string", description: "The personal reason, phrased as identity" },
        milestones: { type: "array", items: { type: "string" } },
      },
      required: ["title", "kind"],
    },
  },
  {
    name: "create_habit",
    description: "Create a habit. Use goal_id to link it to a goal; link_units=true makes logged amounts count toward a cumulative numeric goal (units must match the goal's unit).",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        emoji: { type: "string" },
        target: { type: "number", description: "Amount per day, e.g. 20 (pages). Use 1 with unit 'times' for yes/no habits." },
        unit: { type: "string" },
        ...scheduleProps,
        time_of_day: { type: "string", enum: ["anytime", "morning", "afternoon", "evening"] },
        goal_id: { type: "string" },
        link_units: { type: "boolean" },
        reminder: { type: "string", description: "HH:MM local time" },
      },
      required: ["name", "target", "unit"],
    },
  },
  {
    name: "update_habit",
    description: "Change a habit's name, daily target, schedule, time of day, Improvement Mode, or linked goal (goal_id null to unlink).",
    input_schema: {
      type: "object",
      properties: {
        habit_id: { type: "string" },
        name: { type: "string" },
        target: { type: "number" },
        ...scheduleProps,
        time_of_day: { type: "string", enum: ["anytime", "morning", "afternoon", "evening"] },
        improvement_mode: { type: "boolean" },
        goal_id: { type: ["string", "null"] },
      },
      required: ["habit_id"],
    },
  },
  {
    name: "archive_habit",
    description: "Archive a habit (history is kept). Only after the user agreed.",
    input_schema: { type: "object", properties: { habit_id: { type: "string" } }, required: ["habit_id"] },
  },
  {
    name: "log_habit",
    description: "Set the logged amount for a habit on a date (default today).",
    input_schema: {
      type: "object",
      properties: { habit_id: { type: "string" }, value: { type: "number" }, date: { type: "string", description: "YYYY-MM-DD" } },
      required: ["habit_id", "value"],
    },
  },
  {
    name: "add_milestone",
    description: "Add a milestone to a goal.",
    input_schema: {
      type: "object",
      properties: { goal_id: { type: "string" }, title: { type: "string" }, due_date: { type: "string", description: "YYYY-MM-DD" } },
      required: ["goal_id", "title"],
    },
  },
  {
    name: "complete_milestone",
    description: "Mark a goal milestone as done.",
    input_schema: { type: "object", properties: { goal_id: { type: "string" }, milestone_id: { type: "string" } }, required: ["goal_id", "milestone_id"] },
  },
  {
    name: "log_goal_progress",
    description: "Record progress on a numeric goal: for cumulative goals the value is added; for measurement goals it is the new current value.",
    input_schema: {
      type: "object",
      properties: { goal_id: { type: "string" }, value: { type: "number" }, note: { type: "string" } },
      required: ["goal_id", "value"],
    },
  },
].map((t) => ({ ...t, eager_input_streaming: true }) as BetaToolUnion);

function toSchedule(i: { schedule_type?: string; days?: number[]; times_per_week?: number }): HabitSchedule | undefined {
  if (i.schedule_type === "daily") return { type: "daily" };
  if (i.schedule_type === "weekdays") return { type: "weekdays", days: [...new Set(i.days?.length ? i.days : [0, 1, 2, 3, 4])].sort() };
  if (i.schedule_type === "weekly") return { type: "weekly", times: i.times_per_week ?? 3 };
  return undefined;
}

const pickColor = (): ColorKey => COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];

/** Executes one tool call against the store. Returns [resultJson, human-readable action or null]. */
function runTool(name: string, raw: unknown): { result: unknown; action?: string; error?: boolean } {
  if (!(name in Inputs)) return { result: { error: `Unknown tool ${name}` }, error: true };
  const parsed = Inputs[name as ToolName].safeParse(raw);
  if (!parsed.success) return { result: { error: "Invalid input", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, error: true };
  const s = useStore.getState();
  const today = todayKey();
  const input = parsed.data as Record<string, unknown>;

  switch (name as ToolName) {
    case "get_overview":
      return { result: coachContext(snapshot(), today) };

    case "create_goal": {
      const i = parsed.data as z.infer<typeof Inputs.create_goal>;
      const active = s.goals.filter((g) => !g.archived && !g.completedAt).length;
      if (!s.profile.pro && active >= FREE_GOAL_LIMIT)
        return { result: { error: `Free plan allows ${FREE_GOAL_LIMIT} active goals. Tell the user they can upgrade to Pro for unlimited goals, or complete/archive one first.` }, error: true };
      const numeric = i.kind === "numeric";
      const id = s.addGoal({
        title: i.title,
        emoji: i.emoji ?? "🎯",
        color: pickColor(),
        category: "custom",
        why: i.why ?? "",
        kind: i.kind,
        tracking: i.tracking ?? "cumulative",
        startValue: numeric ? (i.start_value ?? 0) : 0,
        targetValue: numeric ? (i.target_value ?? 1) : 1,
        unit: numeric ? (i.unit ?? "") : "",
        startDate: today,
        deadline: i.deadline ?? addDays(today, 90),
        milestones: (i.milestones ?? []).map((title) => ({ title })),
      });
      return { result: { ok: true, goal_id: id }, action: `Created goal “${i.title}”` };
    }

    case "create_habit": {
      const i = parsed.data as z.infer<typeof Inputs.create_habit>;
      if (i.goal_id && !s.goals.some((g) => g.id === i.goal_id)) return { result: { error: "goal_id not found" }, error: true };
      const id = s.addHabit({
        name: i.name,
        emoji: i.emoji ?? "✅",
        color: pickColor(),
        target: i.target,
        unit: i.unit,
        schedule: toSchedule(i) ?? { type: "daily" },
        timeOfDay: i.time_of_day ?? "anytime",
        goalId: i.goal_id,
        linkUnits: !!(i.goal_id && i.link_units),
        reminder: i.reminder,
        improvementMode: false,
      });
      return { result: { ok: true, habit_id: id }, action: `Created habit “${i.name}”` };
    }

    case "update_habit": {
      const i = parsed.data as z.infer<typeof Inputs.update_habit>;
      const h = s.habits.find((x) => x.id === i.habit_id);
      if (!h) return { result: { error: "habit_id not found" }, error: true };
      const patch: Parameters<typeof s.updateHabit>[1] = {};
      if (i.name) patch.name = i.name;
      if (i.target) patch.target = i.target;
      const sch = toSchedule(i);
      if (sch) patch.schedule = sch;
      if (i.time_of_day) patch.timeOfDay = i.time_of_day;
      if (i.improvement_mode !== undefined) patch.improvementMode = i.improvement_mode;
      if (i.goal_id !== undefined) patch.goalId = i.goal_id ?? undefined;
      s.updateHabit(h.id, patch);
      const bits = [i.target && `target → ${i.target} ${h.unit}`, sch && "schedule", i.name && "name", i.time_of_day && "time", i.improvement_mode !== undefined && `Improvement Mode ${i.improvement_mode ? "on" : "off"}`, i.goal_id !== undefined && "goal link"].filter(Boolean);
      return { result: { ok: true }, action: `Updated ${h.name}${bits.length ? ` (${bits.join(", ")})` : ""}` };
    }

    case "archive_habit": {
      const h = s.habits.find((x) => x.id === input.habit_id);
      if (!h) return { result: { error: "habit_id not found" }, error: true };
      s.archiveHabit(h.id);
      return { result: { ok: true }, action: `Archived ${h.name}` };
    }

    case "log_habit": {
      const i = parsed.data as z.infer<typeof Inputs.log_habit>;
      const h = s.habits.find((x) => x.id === i.habit_id);
      if (!h) return { result: { error: "habit_id not found" }, error: true };
      s.setLog(h.id, i.date ?? today, i.value);
      return { result: { ok: true }, action: `Logged ${i.value} ${h.unit} · ${h.name}` };
    }

    case "add_milestone": {
      const i = parsed.data as z.infer<typeof Inputs.add_milestone>;
      const g = s.goals.find((x) => x.id === i.goal_id);
      if (!g) return { result: { error: "goal_id not found" }, error: true };
      const id = s.addMilestone(g.id, i.title, i.due_date);
      return { result: { ok: true, milestone_id: id }, action: `Added milestone “${i.title}”` };
    }

    case "complete_milestone": {
      const i = parsed.data as z.infer<typeof Inputs.complete_milestone>;
      const g = s.goals.find((x) => x.id === i.goal_id);
      const m = g?.milestones.find((x) => x.id === i.milestone_id);
      if (!g || !m) return { result: { error: "milestone not found" }, error: true };
      if (!m.done) s.toggleMilestone(g.id, m.id);
      return { result: { ok: true }, action: `Completed milestone “${m.title}”` };
    }

    case "log_goal_progress": {
      const i = parsed.data as z.infer<typeof Inputs.log_goal_progress>;
      const g = s.goals.find((x) => x.id === i.goal_id);
      if (!g) return { result: { error: "goal_id not found" }, error: true };
      s.addEntry(g.id, i.value, i.note);
      return { result: { ok: true }, action: `Logged ${i.value} ${g.unit} on ${g.title}` };
    }
  }
}

/** Trim old turns while keeping the conversation starting at a plain user message. */
function trimHistory(msgs: BetaMessageParam[], max = 40): BetaMessageParam[] {
  if (msgs.length <= max) return msgs;
  for (let i = msgs.length - max; i < msgs.length; i++) {
    const m = msgs[i];
    if (m.role === "user" && typeof m.content === "string") return msgs.slice(i);
  }
  return msgs.slice(-1);
}

let sdk: typeof Anthropic | null = null;

async function loadSdk(): Promise<typeof Anthropic> {
  sdk ??= (await import("@anthropic-ai/sdk")).default;
  return sdk;
}

export function friendlyError(err: unknown): string {
  const Anthropic = sdk;
  if (!Anthropic) return err instanceof Error ? err.message : "Something went wrong.";
  if (err instanceof Anthropic.AuthenticationError) return "Your API key was rejected. Check it in Settings → AI Coach.";
  if (err instanceof Anthropic.PermissionDeniedError) return "This API key doesn't have access to the selected model.";
  if (err instanceof Anthropic.NotFoundError) return "The selected model isn't available for this key. Pick another model in Settings.";
  if (err instanceof Anthropic.RateLimitError) return "Rate limited — give it a few seconds and try again.";
  if (err instanceof Anthropic.APIConnectionError) return "Couldn't reach the Claude API. Check your connection.";
  if (err instanceof Anthropic.APIError) return `Claude API error (${err.status ?? "?"}): ${err.message}`;
  return err instanceof Error ? err.message : "Something went wrong.";
}

export interface CoachCallbacks {
  onText: (full: string) => void;
  onAction: (action: string) => void;
  onThinking: (thinking: boolean) => void;
}

let controller: AbortController | null = null;

export function stopCoach() {
  controller?.abort();
}

/** Sends a user message and runs the tool loop until the agent is done. Returns the final text. */
export async function askCoach(userText: string, cb: CoachCallbacks): Promise<string> {
  const { profile, chatApi, setChatApi } = useStore.getState();
  if (!profile.apiKey) throw new Error("Add your Anthropic API key in Settings to talk to your Agent.");

  const Anthropic = await loadSdk();
  const client = new Anthropic({ apiKey: profile.apiKey, dangerouslyAllowBrowser: true });
  const model = profile.model || "claude-opus-5";
  const supportsFallbacks = model === "claude-opus-5";
  const adaptive = !model.startsWith("claude-haiku");

  let messages: BetaMessageParam[] = trimHistory([...(chatApi as BetaMessageParam[]), { role: "user", content: userText }]);
  let text = "";
  controller = new AbortController();

  for (let iter = 0; iter < 10; iter++) {
    cb.onThinking(true);
    const stream = client.beta.messages.stream(
      {
        model,
        max_tokens: 16000,
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        tools: TOOLS,
        messages,
        ...(adaptive ? { thinking: { type: "adaptive" as const }, output_config: { effort: "medium" as const } } : {}),
        ...(supportsFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      },
      { signal: controller.signal },
    );
    const base = text;
    let turnText = "";
    stream.on("text", (delta) => {
      cb.onThinking(false);
      turnText += delta;
      text = base + turnText;
      cb.onText(text);
    });

    const message = await stream.finalMessage();
    cb.onThinking(false);

    if (message.stop_reason === "refusal") {
      // Drop the refused exchange from history so the next message starts clean.
      setChatApi(chatApi);
      controller = null;
      return `${base}${base ? "\n\n" : ""}I can't help with that one — let's get back to your goals and habits.`;
    }

    messages = [...messages, { role: "assistant", content: message.content }];

    if (message.stop_reason === "pause_turn") continue;
    // A tool call cut off at max_tokens may be truncated — never run it.
    if (message.stop_reason !== "tool_use") break;

    const toolUses = message.content.filter((b): b is BetaToolUseBlock => b.type === "tool_use");
    if (!toolUses.length) break;

    const results: BetaToolResultBlockParam[] = toolUses.map((t) => {
      const r = runTool(t.name, t.input);
      if (r.action) cb.onAction(r.action);
      return { type: "tool_result", tool_use_id: t.id, content: JSON.stringify(r.result), ...(r.error ? { is_error: true } : {}) };
    });
    messages = [...messages, { role: "user", content: results }];
    if (text && !text.endsWith("\n")) {
      text += "\n\n";
    }
  }

  setChatApi(messages);
  controller = null;
  return text.trim();
}
