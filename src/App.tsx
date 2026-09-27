import { AnimatePresence, motion } from "motion/react";
import { ChartColumn, Crown, House, Sparkles, Target, User } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Sheets } from "./components/sheets";
import { cx, Toasts } from "./components/ui";
import { APP_NAME } from "./lib/brand";
import { reviewWeekDue } from "./lib/insights";
import { startBackgroundLoops } from "./lib/notifications";
import { useStore } from "./lib/store";
import { navigate, useRoute, useUI, type Route } from "./lib/ui";
import { ArchiveScreen, Goals } from "./screens/Goals";
import { Challenges } from "./screens/Challenges";
import { Coach } from "./screens/Coach";
import { GoalDetail } from "./screens/GoalDetail";
import { HabitDetail } from "./screens/HabitDetail";
import { Insights } from "./screens/Insights";
import { Learn, Lesson } from "./screens/Learn";
import { Logo, Onboarding } from "./screens/Onboarding";
import { Profile } from "./screens/Profile";
import { Review } from "./screens/Review";
import { Settings } from "./screens/Settings";
import { Today } from "./screens/Today";

type Tab = "today" | "goals" | "insights" | "coach" | "profile";

const TABS: { id: Tab; label: string; icon: typeof House }[] = [
  { id: "today", label: "Today", icon: House },
  { id: "goals", label: "Plan", icon: Target },
  { id: "insights", label: "Insights", icon: ChartColumn },
  { id: "coach", label: "Agent", icon: Sparkles },
  { id: "profile", label: "Profile", icon: User },
];

function tabFor(r: Route): Tab {
  switch (r.name) {
    case "goals":
    case "goal":
    case "habit":
    case "archive":
      return "goals";
    case "insights":
      return "insights";
    case "coach":
      return "coach";
    case "profile":
    case "review":
    case "challenges":
    case "learn":
    case "lesson":
    case "settings":
      return "profile";
    default:
      return "today";
  }
}

function useTheme() {
  const theme = useStore((s) => s.profile.theme);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const t = theme === "system" ? (mq.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = t;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#07080b" : "#f4f6fa");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
}

function Screen({ route }: { route: Route }): ReactNode {
  switch (route.name) {
    case "today":
      return <Today />;
    case "goals":
      return <Goals tab={route.tab} />;
    case "goal":
      return <GoalDetail id={route.id} />;
    case "habit":
      return <HabitDetail id={route.id} />;
    case "insights":
      return <Insights />;
    case "coach":
      return <Coach prompt={route.prompt} />;
    case "profile":
      return <Profile />;
    case "review":
      return <Review />;
    case "challenges":
      return <Challenges />;
    case "learn":
      return <Learn />;
    case "lesson":
      return <Lesson id={route.id} />;
    case "settings":
      return <Settings />;
    case "archive":
      return <ArchiveScreen />;
  }
}

export default function App() {
  useTheme();
  const onboarded = useStore((s) => s.profile.onboarded);
  const pro = useStore((s) => s.profile.pro);
  const reviewDue = useStore((s) => !!reviewWeekDue(s));
  const openSheet = useUI((s) => s.openSheet);
  const route = useRoute();
  const tab = tabFor(route);

  useEffect(() => (onboarded ? startBackgroundLoops() : undefined), [onboarded]);

  if (!onboarded) {
    return (
      <>
        <Onboarding />
        <Toasts />
      </>
    );
  }

  const go = (t: Tab) => navigate({ name: t } as Route, { replace: true });
  const routeKey = JSON.stringify(route);

  return (
    <div className="md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line-soft px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <Logo size={36} />
          <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
        </div>
        <nav className="space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition", tab === id ? "bg-card text-fg ring-1 ring-line" : "text-fg-2 hover:bg-card/60 hover:text-fg")}
            >
              <Icon size={19} strokeWidth={tab === id ? 2.4 : 2} className={tab === id ? "text-accent-2" : ""} />
              {label}
              {id === "profile" && reviewDue && <span className="ml-auto h-2 w-2 rounded-full bg-accent" />}
            </button>
          ))}
        </nav>
        {!pro && (
          <button type="button" onClick={() => openSheet({ type: "paywall" })} className="glow card mt-auto p-4 text-left">
            <div className="flex items-center gap-2 font-semibold">
              <Crown size={16} className="text-accent-2" /> Go Pro
            </div>
            <p className="mt-1 text-xs text-fg-3">Unlimited goals, AI Agent and Deep Analysis.</p>
          </button>
        )}
      </aside>

      <main className="mx-auto w-full max-w-xl px-4 pb-32 md:max-w-2xl md:px-8 md:pb-16">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={routeKey} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
            <Screen route={route} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile tab bar */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-bg/85 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => go(id)} className={cx("relative flex flex-col items-center gap-1 pb-2 pt-2.5 text-[10.5px] font-semibold transition", tab === id ? "text-fg" : "text-fg-3")}>
              {tab === id && <motion.span layoutId="tab-indicator" className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" />}
              <span className="relative">
                <Icon size={22} strokeWidth={tab === id ? 2.4 : 1.9} className={tab === id ? "text-accent-2" : ""} />
                {id === "profile" && reviewDue && <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-accent ring-2 ring-bg" />}
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>

      <Sheets />
      <Toasts />
    </div>
  );
}
