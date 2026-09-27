import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, X } from "lucide-react";
import { Fragment, useEffect, useId, type ReactNode } from "react";
import { goBack, useUI, type Route } from "../lib/ui";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className, onClick, glow }: { children: ReactNode; className?: string; onClick?: () => void; glow?: boolean }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cx("card block w-full text-left", glow && "glow", onClick && "transition active:scale-[0.99] hover:border-line", className)}
    >
      {children}
    </Comp>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "soft";

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className,
  disabled,
  type = "button",
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  full?: boolean;
}) {
  const v: Record<BtnVariant, string> = {
    primary: "bg-accent text-white shadow-[0_8px_24px_-8px_var(--accent)] hover:brightness-110",
    secondary: "bg-card-2 text-fg border border-line hover:border-fg-3",
    ghost: "text-fg-2 hover:text-fg hover:bg-card-2",
    danger: "bg-bad/15 text-bad hover:bg-bad/25",
    soft: "bg-accent-soft text-accent-2 hover:brightness-125",
  };
  const s = { sm: "h-9 px-3.5 text-sm rounded-xl", md: "h-11 px-5 text-[15px] rounded-2xl", lg: "h-14 px-6 text-base rounded-2xl" }[size];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none",
        v[variant],
        s,
        full && "w-full",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({ children, onClick, label, className }: { children: ReactNode; onClick?: () => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx("grid h-10 w-10 place-items-center rounded-full text-fg-2 transition hover:bg-card-2 hover:text-fg active:scale-95", className)}
    >
      {children}
    </button>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  right,
  large = true,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: Route | true;
  right?: ReactNode;
  large?: boolean;
}) {
  return (
    <header className="safe-top mb-5 pt-4">
      {(back || right) && (
        <div className="mb-2 flex h-10 items-center justify-between">
          {back ? (
            <button
              onClick={() => goBack(back === true ? undefined : back)}
              className="-ml-2 flex items-center gap-0.5 rounded-full py-2 pl-1 pr-3 text-[15px] font-medium text-accent-2 transition hover:bg-card-2"
            >
              <ChevronLeft size={22} /> Back
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1">{right}</div>
        </div>
      )}
      {subtitle && <p className="mb-1 text-[13px] font-medium uppercase tracking-wider text-fg-3">{subtitle}</p>}
      <h1 className={cx("font-bold tracking-tight", large ? "text-[30px] leading-9" : "text-2xl")}>{title}</h1>
    </header>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-fg-3">{children}</h2>
      {right}
    </div>
  );
}

export function Ring({
  value,
  size = 120,
  stroke = 10,
  color = "var(--accent)",
  track = "var(--line-soft)",
  children,
  gradient = true,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  gradient?: boolean;
}) {
  const id = "ring" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {gradient && (
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6ea0ff" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
        )}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={gradient ? `url(#${id})` : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ type: "spring", stiffness: 80, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function ProgressBar({ value, color = "var(--accent)", height = 6, marker }: { value: number; color?: string; height?: number; marker?: number }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative w-full overflow-hidden rounded-full bg-line-soft" style={{ height }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={false}
        animate={{ width: `${v * 100}%` }}
        transition={{ type: "spring", stiffness: 90, damping: 20 }}
      />
      {marker !== undefined && marker > 0 && marker < 1 && (
        <div className="absolute top-0 h-full w-0.5 bg-fg-2/70" style={{ left: `${marker * 100}%` }} title="Expected by now" />
      )}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cx("relative flex rounded-2xl bg-card-2 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx("relative z-10 flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition", value === o.value ? "text-fg" : "text-fg-3 hover:text-fg-2")}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${options.map((x) => x.value).join("")}`} className="absolute inset-0 -z-10 rounded-xl bg-card shadow-sm ring-1 ring-line" transition={{ type: "spring", stiffness: 400, damping: 35 }} />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx("relative h-7 w-12 shrink-0 rounded-full transition", checked ? "bg-accent" : "bg-line")}
    >
      <motion.span className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow" animate={{ left: checked ? 22 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-fg-2">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block px-1 text-xs text-fg-3">{hint}</span>}
    </label>
  );
}

export const inputBase =
  "rounded-2xl border border-line bg-card-2 px-4 py-3 text-fg placeholder:text-fg-3 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15";
export const inputCls = `${inputBase} w-full`;

export function Row({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className={cx("flex w-full items-center gap-3 px-4 py-3.5 text-left", onClick && "transition hover:bg-card-2/60 active:bg-card-2", className)}>
      {children}
    </Comp>
  );
}

export function List({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("card divide-y divide-line-soft overflow-hidden", className)}>{children}</div>;
}

export function Chip({ children, active, onClick, className }: { children: ReactNode; active?: boolean; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition active:scale-95",
        active ? "border-accent bg-accent-soft text-fg" : "border-line bg-card-2 text-fg-2 hover:text-fg",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "good" | "warn" | "bad" | "accent" }) {
  const t = {
    default: "bg-card-2 text-fg-2",
    good: "bg-good/15 text-good",
    warn: "bg-warn/15 text-warn",
    bad: "bg-bad/15 text-bad",
    accent: "bg-accent-soft text-accent-2",
  }[tone];
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", t)}>{children}</span>;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 text-4xl">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-fg-2">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cx("card p-4", className)}>
      <div className="text-xs font-medium text-fg-3">{label}</div>
      <div className="num mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-fg-3">{sub}</div>}
    </div>
  );
}

export function BottomSheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[28px] border border-line bg-elev shadow-2xl md:rounded-[28px]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line md:hidden" />
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <h2 className="text-lg font-bold">{title}</h2>
              <IconButton label="Close" onClick={onClose} className="-mr-2">
                <X size={20} />
              </IconButton>
            </div>
            <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-5">{children}</div>
            {footer && <div className="safe-bottom border-t border-line-soft px-5 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            className={cx(
              "pointer-events-auto max-w-md rounded-2xl border px-4 py-3 text-left text-sm font-medium shadow-2xl backdrop-blur-xl",
              t.tone === "good" ? "border-good/30 bg-good/15 text-fg" : t.tone === "warn" ? "border-warn/30 bg-warn/15 text-fg" : "border-line bg-elev/90 text-fg",
            )}
          >
            {t.text}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------- Markdown -------------------------------- */

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${keyBase}-${i++}`;
    if (t.startsWith("**")) out.push(<strong key={k}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={k}>{t.slice(1, -1)}</code>);
    else out.push(<em key={k}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Minimal, safe markdown: paragraphs, headings, bullet/numbered lists, bold, italics, code. */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split("\n");
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^#{1,6}\s+(.*)/.exec(line);
    if (h) {
      blocks.push(<h3 key={key++}>{inline(h[1], `h${key}`)}</h3>);
      i++;
      continue;
    }
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*•]\s+/, ""));
      blocks.push(
        <ul key={key++}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, `u${key}-${j}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ""));
      blocks.push(
        <ol key={key++}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, `o${key}-${j}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\s*[-*•]\s+|\s*\d+[.)]\s+)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(
      <p key={key++}>
        {para.map((p, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(p, `p${key}-${j}`)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return <div className="md">{blocks}</div>;
}
