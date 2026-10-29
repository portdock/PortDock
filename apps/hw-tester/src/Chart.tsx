// 시간축 그래프 — 그림 라이브러리 없이 canvas 로(Plot 앱 그래프와 같은 방식: 색은 CSS 변수, 새 값이 와도 requestAnimationFrame 한 번).
// 선 = 응답 시간(ms), 위쪽 띠의 빨간 칸 = 그 박자에 응답 없음(손실), 세로 줄 = 사건(Wi-Fi 끊김 빨강·연결 초록).
// 점이 픽셀보다 많으면 픽셀 칸마다 가장 큰 값만 그린다(튄 값이 숨지 않게).
import { useEffect, useRef } from "react";
import { yMax } from "./model";

export interface Series {
  label: string;
  /** CSS 변수 이름(예: --c1) 또는 색 */
  color: string;
  /** (시각 ms, 값) — 값 -1 = 손실, null = 재지 않음 */
  points: readonly { ts: number; v: number | null }[];
  /** 점으로만(DNS 처럼 드문 값) */
  dots?: boolean;
}
export interface Mark {
  ts: number;
  /** «bad» 빨강 · «good» 초록 */
  kind: "bad" | "good";
}

export function Chart({ series, marks, spanMs, now, unit, fixedMax, ariaLabel, empty }: { series: Series[]; marks: Mark[]; spanMs: number | null; now: number; unit: string; fixedMax?: number; ariaLabel: string; empty: string }) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 300, h: 200 });
  const props = useRef({ series, marks, spanMs, now, unit, fixedMax, empty });
  props.current = { series, marks, spanMs, now, unit, fixedMax, empty };
  const queued = useRef(0);

  const draw = () => {
    queued.current = 0;
    const c = cv.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const { series, marks, spanMs, now, unit, fixedMax, empty } = props.current;
    const { w, h } = size.current;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(c);
    const col = (n: string, d: string) => (n.startsWith("--") ? css.getPropertyValue(n).trim() || d : n);
    const ink = col("--ink", "#1b1f24");
    const muted = col("--muted", "#5f6b78");
    const grid = col("--line", "#d9dee4");
    const bad = col("--danger", "#b91c1c");
    const good = col("--ok", "#15803d");
    const fpx = Math.round((parseFloat(col("--fs", "13px")) || 13) * 0.85);
    ctx.clearRect(0, 0, w, h);
    ctx.font = `${fpx}px system-ui, sans-serif`;
    const all = series.flatMap((s) => s.points);
    const first = all.length ? Math.min(...series.filter((s) => s.points.length).map((s) => s.points[0].ts)) : now;
    const x1 = now;
    const x0 = spanMs == null ? Math.min(first, x1 - 10_000) : x1 - spanMs;
    const inView = (ts: number) => ts >= x0 && ts <= x1;
    const vis = all.filter((p) => inView(p.ts) && p.v != null).map((p) => p.v as number);
    const ymax = fixedMax ?? yMax(vis);
    const pad = { l: 46, r: 10, t: 16, b: 22 };
    const lossBand = 6 * series.filter((s) => !s.dots).length;
    const top = pad.t + lossBand + 4;
    const bottom = h - pad.b;
    const X = (ts: number) => pad.l + ((ts - x0) / Math.max(1, x1 - x0)) * (w - pad.l - pad.r);
    const Y = (v: number) => bottom - (Math.min(v, ymax) / ymax) * (bottom - top);
    // 눈금
    ctx.strokeStyle = grid;
    ctx.fillStyle = muted;
    ctx.lineWidth = 1;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 4; i++) {
      const v = (ymax * i) / 4;
      const y = Math.round(Y(v)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      ctx.fillText(`${Math.round(v)}${i === 4 ? ` ${unit}` : ""}`, pad.l - 4, y);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const span = x1 - x0;
    const step = [10e3, 30e3, 60e3, 300e3, 600e3, 1800e3, 3600e3, 7200e3, 21600e3].find((s) => span / s <= 6) ?? 21600e3;
    for (let tk = Math.ceil(x0 / step) * step; tk <= x1; tk += step) {
      const d = new Date(tk);
      ctx.fillText(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}${step < 60e3 ? `:${String(d.getSeconds()).padStart(2, "0")}` : ""}`, X(tk), bottom + 4);
    }
    // 사건 세로 줄
    for (const m of marks) {
      if (!inView(m.ts)) continue;
      ctx.strokeStyle = m.kind === "bad" ? bad : good;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(Math.round(X(m.ts)) + 0.5, pad.t);
      ctx.lineTo(Math.round(X(m.ts)) + 0.5, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // 선·손실 띠
    let band = 0;
    for (const s of series) {
      const color = col(s.color, ink);
      const pts = s.points.filter((p) => inView(p.ts));
      if (s.dots) {
        ctx.fillStyle = color;
        for (const p of pts) if (p.v != null && p.v >= 0) ctx.fillRect(X(p.ts) - 2, Y(p.v) - 2, 4, 4);
        continue;
      }
      const by = pad.t + band * 6;
      band++;
      // 픽셀 칸마다 가장 큰 값
      const cols = new Map<number, { v: number; lost: boolean }>();
      for (const p of pts) {
        if (p.v == null) continue;
        const px = Math.round(X(p.ts));
        const o = cols.get(px);
        const lost = p.v < 0;
        if (!o) cols.set(px, { v: lost ? -1 : p.v, lost });
        else {
          o.lost ||= lost;
          if (!lost) o.v = Math.max(o.v, p.v);
        }
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let pen = false;
      for (const [px, o] of [...cols.entries()].sort((a, b) => a[0] - b[0])) {
        if (o.lost) {
          ctx.fillStyle = bad;
          ctx.fillRect(px - 1, by, 3, 5);
        }
        if (o.v < 0) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(px, Y(o.v));
        else ctx.moveTo(px, Y(o.v));
        pen = true;
      }
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(pad.l - 40, by, 4, 5);
    }
    if (!all.length) {
      ctx.fillStyle = muted;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(empty, (pad.l + w - pad.r) / 2, (top + bottom) / 2);
    }
  };

  const queue = () => {
    if (!queued.current) queued.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      size.current = { w: Math.max(100, el.clientWidth), h: Math.max(80, el.clientHeight) };
      queue();
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (queued.current) cancelAnimationFrame(queued.current);
      queued.current = 0;
    };
  }, []);
  useEffect(queue);

  return (
    <div className="chart" ref={box}>
      <canvas ref={cv} role="img" aria-label={ariaLabel} />
    </div>
  );
}
