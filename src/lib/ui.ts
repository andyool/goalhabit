import { useEffect, useState } from "react";
import { create } from "zustand";
import type { ID } from "./types";

/* ---------------------------------- Router --------------------------------- */

export type Route =
  | { name: "today" }
  | { name: "goals"; tab?: "goals" | "habits" }
  | { name: "insights" }
  | { name: "coach"; prompt?: string }
  | { name: "profile" }
  | { name: "goal"; id: ID }
  | { name: "habit"; id: ID }
  | { name: "review" }
  | { name: "challenges" }
  | { name: "learn" }
  | { name: "lesson"; id: ID }
  | { name: "settings" }
  | { name: "archive" };

export function parseHash(hash: string): Route {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  const [a, b] = path.split("/");
  const q = new URLSearchParams(query);
  switch (a) {
    case "goals":
      return { name: "goals", tab: q.get("tab") === "habits" ? "habits" : "goals" };
    case "insights":
      return { name: "insights" };
    case "coach":
      return { name: "coach", prompt: q.get("q") ?? undefined };
    case "profile":
      return { name: "profile" };
    case "goal":
      return b ? { name: "goal", id: b } : { name: "goals" };
    case "habit":
      return b ? { name: "habit", id: b } : { name: "goals", tab: "habits" };
    case "review":
      return { name: "review" };
    case "challenges":
      return { name: "challenges" };
    case "learn":
      return b ? { name: "lesson", id: b } : { name: "learn" };
    case "settings":
      return { name: "settings" };
    case "archive":
      return { name: "archive" };
    default:
      return { name: "today" };
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case "goals":
      return r.tab === "habits" ? "#/goals?tab=habits" : "#/goals";
    case "coach":
      return r.prompt ? `#/coach?q=${encodeURIComponent(r.prompt)}` : "#/coach";
    case "goal":
      return `#/goal/${r.id}`;
    case "habit":
      return `#/habit/${r.id}`;
    case "lesson":
      return `#/learn/${r.id}`;
    default:
      return `#/${r.name}`;
  }
}

/** Number of in-app pushes we can safely go back through. */
let depth = 0;

export function navigate(r: Route, opts: { replace?: boolean } = {}) {
  const h = href(r);
  if (opts.replace) history.replaceState(null, "", h);
  else {
    history.pushState(null, "", h);
    depth++;
  }
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function goBack(fallback: Route = { name: "today" }) {
  if (depth > 0) history.back();
  else navigate(fallback, { replace: true });
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    const onPop = () => {
      depth = Math.max(0, depth - 1);
    };
    const on = () => {
      setRoute(parseHash(location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("hashchange", on);
      window.removeEventListener("popstate", onPop);
    };
  }, []);
  return route;
}

/* ------------------------------ Sheets & toasts ----------------------------- */

export type Sheet =
  | { type: "habit"; id?: ID; goalId?: ID }
  | { type: "goal"; id?: ID }
  | { type: "log"; habitId: ID; day: string }
  | { type: "goalEntry"; goalId: ID }
  | { type: "paywall"; reason?: string };

export interface Toast {
  id: number;
  text: string;
  tone?: "default" | "good" | "warn";
}

interface UIState {
  sheet: Sheet | null;
  toasts: Toast[];
  openSheet: (s: Sheet) => void;
  closeSheet: () => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useUI = create<UIState>((set, get) => ({
  sheet: null,
  toasts: [],
  openSheet: (sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  toast: (text, tone = "default") => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
    setTimeout(() => get().dismissToast(id), 3200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (text: string, tone?: Toast["tone"]) => useUI.getState().toast(text, tone);
