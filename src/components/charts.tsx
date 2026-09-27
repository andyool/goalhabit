import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { addDays, formatDay, rangeKeys, startOfWeek, todayKey, weekdayIndex, WEEKDAYS_LETTER, type DateKey } from "../lib/date";
import { cx } from "./ui";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    setW(Math.floor(ref.current.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function Tooltip({ x, y, children, width }: { x: number; y: number; children: ReactNode; width: number }) {
  const left = Math.max(4, Math.min(width - 132, x - 64));
  return (
    <div
      className="pointer-events-none absolute z-10 w-32 rounded-xl border border-line bg-elev/95 px-2.5 py-1.5 text-xs shadow-xl backdrop-blur"
      style={{ left, top: Math.max(0, y - 52) }}
    >
      {children}
    </div>
  );
}

/* --------------------------------- Line chart -------------------------------- */

function compact(v: number) {
  const a = Math.abs(v);
  if (a >= 10_000) return `${Math.round(v / 1000)}k`;
  if (a >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

export interface LinePoint {
  key: DateKey;
  value: number | null;
}

export function LineChart({ points, height = 170, max = 100, min = 0, unit = "", color = "var(--accent)" }: { points: LinePoint[]; height?: number; max?: number; min?: number; unit?: string; color?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 28;
  const padR = 10;
  const padT = 10;
  const padB = 22;
  const iw = Math.max(1, width - padL - padR);
  const ih = height - padT - padB;
  const n = points.length;
  const x = (i: number) => padL + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const span = max - min || 1;
  const y = (v: number) => padT + ih - ((v - min) / span) * ih;

  // Split into segments at nulls.
  const segs: { i: number; v: number }[][] = [];
  let cur: { i: number; v: number }[] = [];
  points.forEach((p, i) => {
    if (p.value === null) {
      if (cur.length) segs.push(cur);
      cur = [];
    } else cur.push({ i, v: p.value });
  });
  if (cur.length) segs.push(cur);

  const ticks = [min, (min + max) / 2, max];
  const labelEvery = Math.max(1, Math.ceil(n / 6));
  const lastIdx = [...points].reverse().findIndex((p) => p.value !== null);
  const last = lastIdx === -1 ? null : n - 1 - lastIdx;

  const onMove = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect();
    const rel = clientX - rect.left - padL;
    const i = Math.round((rel / iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          onMouseMove={(e) => onMove(e.clientX)}
          onMouseLeave={() => setHover(null)}
          onTouchStart={(e) => onMove(e.touches[0].clientX)}
          onTouchMove={(e) => onMove(e.touches[0].clientX)}
          onTouchEnd={() => setHover(null)}
          role="img"
          aria-label="Line chart"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="var(--line-soft)" strokeWidth={1} />
              <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--text-3)" className="num">
                {compact(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            (i % labelEvery === 0 && x(n - 1) - x(i) >= 56) || i === n - 1 ? (
              <text key={p.key} x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={10} fill="var(--text-3)">
                {formatDay(p.key)}
              </text>
            ) : null,
          )}
          {segs.map((s, si) => {
            const d = s.map((pt, j) => `${j ? "L" : "M"}${x(pt.i)},${y(pt.v)}`).join(" ");
            const area = `${d} L${x(s[s.length - 1].i)},${y(min)} L${x(s[0].i)},${y(min)} Z`;
            return (
              <g key={si}>
                <path d={area} fill={color} opacity={0.1} />
                <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              </g>
            );
          })}
          {last !== null && hover === null && (
            <circle cx={x(last)} cy={y(points[last].value!)} r={4.5} fill={color} stroke="var(--card)" strokeWidth={2} />
          )}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} stroke="var(--text-3)" strokeWidth={1} />
              {points[hover].value !== null && <circle cx={x(hover)} cy={y(points[hover].value!)} r={5} fill={color} stroke="var(--card)" strokeWidth={2} />}
            </g>
          )}
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={x(hover)} y={points[hover].value !== null ? y(points[hover].value!) : padT + ih / 2} width={width}>
          <div className="text-fg-3">{formatDay(points[hover].key, { weekday: "short", month: "short", day: "numeric" })}</div>
          <div className="font-semibold text-fg">{points[hover].value === null ? "No habits due" : `${(Math.round(points[hover].value! * 10) / 10).toLocaleString()}${unit}`}</div>
        </Tooltip>
      )}
    </div>
  );
}

/* --------------------------------- Bar chart --------------------------------- */

export interface Bar {
  label: string;
  value: number | null;
  tip?: string;
  highlight?: boolean;
}

export function BarChart({ bars, height = 150, max, format = (v) => `${Math.round(v)}`, color = "var(--accent)", showValues = false }: { bars: Bar[]; height?: number; max?: number; format?: (v: number) => string; color?: string; showValues?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padT = showValues ? 18 : 8;
  const padB = 22;
  const ih = height - padT - padB;
  const m = max ?? Math.max(1, ...bars.map((b) => b.value ?? 0));
  const band = width / Math.max(1, bars.length);
  const bw = Math.min(24, Math.max(4, band * 0.62));
  const r = Math.min(4, bw / 2);

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }} onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Bar chart">
          <line x1={0} x2={width} y1={padT + ih} y2={padT + ih} stroke="var(--line)" strokeWidth={1} />
          {bars.map((b, i) => {
            const cxp = band * i + band / 2;
            const h = b.value ? Math.max(2, (b.value / m) * ih) : 0;
            const x0 = cxp - bw / 2;
            const y0 = padT + ih - h;
            const path =
              h > r
                ? `M${x0},${padT + ih} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + bw - r} Q${x0 + bw},${y0} ${x0 + bw},${y0 + r} V${padT + ih} Z`
                : `M${x0},${padT + ih} V${y0} H${x0 + bw} V${padT + ih} Z`;
            const dim = hover !== null && hover !== i;
            const showLabel = bars.length <= 12 || i % Math.ceil(bars.length / 8) === 0;
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
                <rect x={band * i} y={0} width={band} height={height} fill="transparent" />
                {b.value === null ? (
                  <rect x={x0} y={padT + ih - 2} width={bw} height={2} rx={1} fill="var(--line)" />
                ) : (
                  <path d={path} fill={color} opacity={dim ? 0.35 : b.highlight === false ? 0.45 : 1} />
                )}
                {showValues && b.value !== null && (
                  <text x={cxp} y={y0 - 5} textAnchor="middle" fontSize={10} fill="var(--text-2)" className="num">
                    {format(b.value)}
                  </text>
                )}
                {showLabel && (
                  <text x={cxp} y={height - 6} textAnchor="middle" fontSize={10} fill={hover === i ? "var(--text)" : "var(--text-3)"}>
                    {b.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && (
        <Tooltip x={band * hover + band / 2} y={padT + ih - ((bars[hover].value ?? 0) / m) * ih} width={width}>
          <div className="text-fg-3">{bars[hover].tip ?? bars[hover].label}</div>
          <div className="font-semibold text-fg">{bars[hover].value === null ? "No data" : format(bars[hover].value!)}</div>
        </Tooltip>
      )}
    </div>
  );
}

/* ---------------------------------- Heatmap ---------------------------------- */

/** Sequential single-hue blue ramp: more blue = more consistency. */
export function heatColor(v: number | null): string {
  if (v === null) return "var(--heat-0)";
  if (v <= 0) return "color-mix(in oklab, var(--accent) 8%, var(--heat-0))";
  const steps = [0.25, 0.5, 0.75, 1];
  const mix = [28, 50, 74, 100];
  const idx = steps.findIndex((s) => v <= s + 1e-9);
  return `color-mix(in oklab, var(--accent) ${mix[idx === -1 ? 3 : idx]}%, var(--heat-0))`;
}

export function Heatmap({ weeks = 17, valueFor, end = todayKey(), onSelect }: { weeks?: number; valueFor: (k: DateKey) => number | null; end?: DateKey; onSelect?: (k: DateKey) => void }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<{ k: DateKey; x: number; y: number } | null>(null);
  const first = addDays(startOfWeek(end), -(weeks - 1) * 7);
  const gap = 3;
  const labelW = 14;
  const cell = width ? Math.min(18, Math.floor((width - labelW - gap * (weeks - 1)) / weeks)) : 12;
  const cols: DateKey[][] = [];
  for (let w = 0; w < weeks; w++) cols.push(rangeKeys(addDays(first, w * 7), addDays(first, w * 7 + 6)));
  const gridW = labelW + weeks * cell + (weeks - 1) * gap;

  return (
    <div ref={ref} className="relative w-full" onMouseLeave={() => setHover(null)}>
      <div className="flex" style={{ gap, width: gridW }}>
        <div className="flex flex-col" style={{ gap, width: labelW - gap }}>
          {WEEKDAYS_LETTER.map((l, i) => (
            <div key={i} className="text-[9px] leading-none text-fg-3" style={{ height: cell, lineHeight: `${cell}px` }}>
              {i % 2 === 0 ? l : ""}
            </div>
          ))}
        </div>
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col" style={{ gap }}>
            {col.map((k) => {
              const future = k > end;
              const v = future ? null : valueFor(k);
              return (
                <button
                  key={k}
                  type="button"
                  disabled={future}
                  onClick={() => onSelect?.(k)}
                  onMouseEnter={(e) => {
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const p = ref.current!.getBoundingClientRect();
                    setHover({ k, x: r.left - p.left + cell / 2, y: r.top - p.top });
                  }}
                  aria-label={`${formatDay(k)}: ${v === null ? "nothing due" : `${Math.round(v * 100)}%`}`}
                  className={cx("rounded-[4px] transition", future ? "opacity-0" : "hover:ring-2 hover:ring-fg-3", k === end && "ring-1 ring-accent-2")}
                  style={{ width: cell, height: cell, background: heatColor(v) }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-fg-3">
        Less
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <span key={v} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: heatColor(v) }} />
        ))}
        More
      </div>
      {hover && (
        <Tooltip x={hover.x} y={hover.y + 6} width={width}>
          <div className="text-fg-3">{formatDay(hover.k, { weekday: "short", month: "short", day: "numeric" })}</div>
          <div className="font-semibold text-fg">{(() => {
            const v = valueFor(hover.k);
            return v === null ? "Nothing due" : `${Math.round(v * 100)}% complete`;
          })()}</div>
        </Tooltip>
      )}
    </div>
  );
}

/* ------------------------------ Week dot strip ------------------------------ */

export function WeekDots({ values, days }: { values: (number | null)[]; days: DateKey[] }) {
  return (
    <div className="flex gap-1.5">
      {values.map((v, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <span className="h-5 w-5 rounded-md" style={{ background: heatColor(v) }} title={`${formatDay(days[i])}: ${v === null ? "—" : `${Math.round(v * 100)}%`}`} />
          <span className="text-[9px] text-fg-3">{WEEKDAYS_LETTER[weekdayIndex(days[i])]}</span>
        </div>
      ))}
    </div>
  );
}

export function Sparkline({ values, width = 80, height = 28, color = "var(--accent)" }: { values: (number | null)[]; width?: number; height?: number; color?: string }) {
  const pts = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (pts.length < 2) return <svg width={width} height={height} />;
  const max = Math.max(1, ...pts.map((p) => p.v));
  const x = (i: number) => 2 + (i / (values.length - 1)) * (width - 4);
  const y = (v: number) => height - 3 - (v / max) * (height - 6);
  const d = pts.map((p, j) => `${j ? "L" : "M"}${x(p.i)},${y(p.v)}`).join(" ");
  const lp = pts[pts.length - 1];
  return (
    <svg width={width} height={height} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      <circle cx={x(lp.i)} cy={y(lp.v)} r={3} fill={color} />
    </svg>
  );
}
