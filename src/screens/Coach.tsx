import { motion } from "motion/react";
import { ArrowUp, Check, Crown, KeyRound, RotateCcw, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, cx, IconButton, inputCls, Markdown, PageHeader } from "../components/ui";
import { MODELS } from "../lib/models";
import { useStore } from "../lib/store";
import { navigate, useUI } from "../lib/ui";

const STARTERS = [
  "How was my week? Be honest.",
  "I'm slipping. Help me get back on track.",
  "Plan a new goal with me",
  "Optimize my habits for my goals",
  "What's my best time of day for deep work?",
];

let autoSent = "";

export function Coach({ prompt }: { prompt?: string }) {
  const profile = useStore((s) => s.profile);
  const chat = useStore((s) => s.chat);
  const pushChat = useStore((s) => s.pushChat);
  const patchChat = useStore((s) => s.patchChat);
  const clearChat = useStore((s) => s.clearChat);
  const openSheet = useUI((s) => s.openSheet);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const ready = profile.pro && !!profile.apiKey;

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat, thinking]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    setBusy(true);
    pushChat({ role: "user", text: t });
    const id = pushChat({ role: "assistant", text: "" });
    const actions: string[] = [];
    const ai = await import("../lib/ai");
    try {
      const final = await ai.askCoach(t, {
        onText: (full) => patchChat(id, { text: full }),
        onAction: (a) => {
          actions.push(a);
          patchChat(id, { actions: [...actions] });
        },
        onThinking: setThinking,
      });
      patchChat(id, { text: final || (actions.length ? "Done." : "…") });
    } catch (err) {
      const aborted = err instanceof Error && (err.name === "AbortError" || /abort/i.test(err.message));
      const current = useStore.getState().chat.find((m) => m.id === id)?.text ?? "";
      patchChat(id, aborted ? { text: current || "Stopped." } : { text: ai.friendlyError(err), error: true });
    } finally {
      setBusy(false);
      setThinking(false);
    }
  };

  useEffect(() => {
    if (prompt && ready && autoSent !== prompt) {
      autoSent = prompt;
      navigate({ name: "coach" }, { replace: true });
      void send(prompt);
    }
  }, [prompt, ready]);

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col md:min-h-[calc(100dvh-2rem)]">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Agent <Sparkles size={22} className="text-accent-2" />
          </span>
        }
        right={
          chat.length > 0 && (
            <IconButton
              label="New conversation"
              onClick={() => {
                if (confirm("Start a new conversation?")) clearChat();
              }}
            >
              <RotateCcw size={18} />
            </IconButton>
          )
        }
      />

      {!profile.pro ? (
        <Card glow className="p-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-white">
            <Crown size={26} />
          </div>
          <h2 className="text-xl font-bold">Your personal discipline Agent</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-fg-2">
            It watches your progress, spots what's off, and adjusts your plan before you burn out. Ask it to plan goals, tune habits or analyze your week — it acts directly in the app.
          </p>
          <Button className="mt-5" onClick={() => openSheet({ type: "paywall", reason: "The AI Agent is part of Pro." })}>
            Unlock the Agent
          </Button>
        </Card>
      ) : !profile.apiKey ? (
        <ApiKeySetup />
      ) : (
        <>
          <div className="flex-1 space-y-4 pb-4">
            {chat.length === 0 && (
              <div className="pt-4 text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-2xl">🤖</div>
                <h2 className="text-lg font-semibold">What do you want to work on?</h2>
                <p className="mx-auto mt-1 max-w-xs text-sm text-fg-3">I can see your goals, habits and stats, and I can make changes for you.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {STARTERS.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-line bg-card px-3.5 py-2 text-sm text-fg-2 transition hover:text-fg active:scale-95">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chat.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-accent px-4 py-2.5 text-[15px] text-white">{m.text}</div>
                ) : (
                  <div className="max-w-[92%] space-y-2">
                    {m.actions && m.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {m.actions.map((a, i) => (
                          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-good/12 px-2.5 py-1 text-xs font-medium text-good">
                            <Check size={12} strokeWidth={3} /> {a}
                          </span>
                        ))}
                      </div>
                    )}
                    {(m.text || !busy) && (
                      <div className={cx("rounded-3xl rounded-bl-lg border px-4 py-3 text-[15px] leading-relaxed", m.error ? "border-bad/30 bg-bad/10 text-fg" : "border-line-soft bg-card")}>
                        {m.text ? <Markdown text={m.text} /> : <span className="text-fg-3">…</span>}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
            {busy && thinking && (
              <div className="dot-pulse flex items-center gap-1 px-2 text-fg-3" aria-label="Agent is thinking">
                <span className="h-2 w-2 rounded-full bg-current" />
                <span className="h-2 w-2 rounded-full bg-current" />
                <span className="h-2 w-2 rounded-full bg-current" />
              </div>
            )}
            <div ref={bottom} />
          </div>

          <form
            className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-10 -mx-1 md:bottom-4"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <div className="flex items-end gap-2 rounded-[26px] border border-line bg-elev/95 p-1.5 pl-4 shadow-2xl backdrop-blur-xl">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(140, e.target.scrollHeight)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="Message your Agent…"
                className="max-h-36 flex-1 resize-none bg-transparent py-2 text-fg outline-none placeholder:text-fg-3"
              />
              {busy ? (
                <button type="button" onClick={() => void import("../lib/ai").then((m) => m.stopCoach())} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card-2 text-fg" aria-label="Stop">
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white transition disabled:opacity-30" aria-label="Send">
                  <ArrowUp size={18} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export function ApiKeySetup({ compact }: { compact?: boolean }) {
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const [key, setKey] = useState(profile.apiKey);
  return (
    <Card className={cx("space-y-4", compact ? "p-4" : "p-5")}>
      {!compact && (
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-2">
            <KeyRound size={20} />
          </span>
          <div>
            <h2 className="font-semibold">Connect Claude</h2>
            <p className="mt-0.5 text-sm text-fg-2">
              Your Agent runs on Claude by Anthropic. Paste an API key from{" "}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="font-medium text-accent-2 underline-offset-2 hover:underline">
                console.anthropic.com
              </a>
              .
            </p>
          </div>
        </div>
      )}
      <input type="password" autoComplete="off" spellCheck={false} className={inputCls} placeholder="sk-ant-…" value={key} onChange={(e) => setKey(e.target.value)} />
      <select className={inputCls} value={profile.model} onChange={(e) => updateProfile({ model: e.target.value })}>
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} — {m.note}
          </option>
        ))}
      </select>
      <Button full onClick={() => updateProfile({ apiKey: key.trim() })} disabled={key.trim() === profile.apiKey}>
        {profile.apiKey ? "Update key" : "Connect"}
      </Button>
      <p className="text-xs leading-relaxed text-fg-3">The key is stored only on this device and sent directly to Anthropic's API. Usage is billed to your Anthropic account.</p>
    </Card>
  );
}
