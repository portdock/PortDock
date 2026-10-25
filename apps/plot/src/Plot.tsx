// 실시간 그래프 — 그림 라이브러리 없이 canvas 로 직접. 새 값이 와도 requestAnimationFrame 한 번에 한 번만 그리고,
// 점이 픽셀보다 많으면 픽셀 칸마다 처음·최소·최대·마지막만 그린다(model.decimate) — 초당 수천 점이 와도 버틴다.
// 휠 = 가로 확대·축소, Shift+휠 = 세로, 끌기 = 옮기기(Shift 면 세로도), 누르기 = 측정점 A·B, 두 번 누르기 = 처음 보기(실시간), 오른쪽 버튼 = 측정점 지우기.
import { useCallback, useEffect, useRef, useState, type MutableRefObject, type ReactNode, type PointerEvent as PEv, type WheelEvent as WEv } from "react";
import { channelDash, decimate, fmtDur, fmtNum, fmtTick, clock, nearest, niceStep, padRange, rangeOf, ticks, type Ring, type XMode } from "./model";
import { fill, type Dict } from "./i18n";

export interface ChannelView {
  name: string;
  color: string;
  show: boolean;
  axis: "L" | "R";
}

export interface YAxis {
  auto: boolean;
  min: number;
  max: number;
}

export interface PlotHandle {
  /** 새 값 — 다음 화면 그리기 때 다시 그린다 */
  bump: () => void;
  /** 지금 보이는 논리 범위 [lo, hi) */
  range: () => [number, number];
  /** 그래프 그림(PNG 바이트) */
  png: () => Promise<Uint8Array | null>;
  /** 실시간 보기로(확대·옮기기·Y 조절을 버리고) */
  reset: () => void;
  clearMarks: () => void;
}

/** 측정점 — 누른 자리의 받은 순서 번호·시각과 그때 값 */
interface Mark {
  idx: number;
  ts: number;
  vals: number[];
}

const PAD = { top: 26, bottom: 26, left: 58, right: 14, rightAxis: 58 };

export function Plot({
  ring,
  handle,
  channels,
  mode,
  span,
  yL,
  yR,
  frozen,
  onFreeze,
  origin,
  t,
  empty,
}: {
  ring: Ring;
  handle: MutableRefObject<PlotHandle | null>;
  channels: ChannelView[];
  mode: XMode;
  /** 보이는 폭 — points 면 점 수, time 이면 ms */
  span: number;
  yL: YAxis;
  yR: YAxis;
  /** 멈춤(받기는 계속) — 확대·옮기기를 하면 저절로 켠다 */
  frozen: boolean;
  onFreeze: (on: boolean) => void;
  /** 가로축 0 초의 시각(지우기 뒤 첫 값) */
  origin: number;
  t: Dict;
  /** 값이 없을 때 가운데 글(첫 실행 카드 등) */
  empty?: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 300, h: 200 });
  const queued = useRef(false);
  /** 멈췄을 때·확대했을 때의 가로 범위(null = 실시간) */
  const view = useRef<[number, number] | null>(null);
  /** Y 를 휠·끌기로 바꾼 범위(null = 설정대로) */
  const yOver = useRef<{ L: [number, number] | null; R: [number, number] | null }>({ L: null, R: null });
  const cursor = useRef<{ x: number; y: number } | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  /** 누르기 직전의 측정점 — 두 번 누르기(실시간으로)가 그 두 번의 누르기로 바뀐 측정점을 되돌린다 */
  const marksBefore = useRef<{ at: number; marks: Mark[] }>({ at: 0, marks: [] });
  const marksRef = useRef(marks);
  marksRef.current = marks;
  /** 마지막 그리기의 좌표 변환 — 마우스가 쓴다 */
  const geo = useRef({ x0: 0, x1: 1, l: 0, r: 1, top: 0, bottom: 1, yl: [0, 1] as [number, number], yr: [0, 1] as [number, number] });
  const props = useRef({ channels, mode, span, yL, yR, frozen, origin, t });
  props.current = { channels, mode, span, yL, yR, frozen, origin, t };
  const [hasData, setHasData] = useState(ring.n > 0);

  const xRange = useCallback((): [number, number] => {
    const { mode, span } = props.current;
    if (view.current) return view.current;
    const x1 = ring.n ? ring.lastX(mode) : mode === "time" ? Date.now() : 0;
    return [x1 - span, x1];
  }, [ring]);

  const draw = useCallback(() => {
    queued.current = false;
    const c = cv.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const { channels, mode, yL, yR, origin, t } = props.current;
    const { w, h } = size.current;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(c);
    const col = (n: string, d: string) => css.getPropertyValue(n).trim() || d;
    const bg = col("--panel", "#ffffff");
    const ink = col("--ink", "#1b1f24");
    const muted = col("--muted", "#5f6b78");
    const grid = col("--line", "#d9dee4");
    // 글자 크기 설정을 따른다(기본 13px → 11px)
    const fpx = Math.round((parseFloat(col("--fs", "13px")) || 13) * 0.85);
    const font = `${fpx}px ${col("--mono", "monospace")}`;
    const lh = Math.round(fpx * 1.4);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    setHasData(ring.n > 0);

    const shown = channels.map((ch, i) => ({ ...ch, i })).filter((ch) => ch.show && ch.i < ring.channels);
    const hasR = shown.some((ch) => ch.axis === "R");
    const l = PAD.left;
    const r = w - (hasR ? PAD.rightAxis : PAD.right);
    const top = PAD.top;
    const bottom = h - PAD.bottom;
    const pw = Math.max(10, r - l);
    const [x0, x1] = xRange();
    const [lo, hi] = rangeOf(ring, mode, x0, x1);
    // 채널마다 솎은 점 → 축마다 값 범위
    const lines = shown.map((ch) => ({ ch, pts: decimate(ring, mode, ch.i, lo, hi, x0, x1, pw) }));
    const span = { L: [Infinity, -Infinity], R: [Infinity, -Infinity] };
    for (const { ch, pts } of lines) {
      const s = span[ch.axis];
      for (let k = 0; k < pts.length; k += 2) {
        const v = pts[k + 1];
        if (Number.isNaN(v) || pts[k] < -1 || pts[k] > pw + 1) continue;
        if (v < s[0]) s[0] = v;
        if (v > s[1]) s[1] = v;
      }
    }
    const yr = (ax: "L" | "R", cfg: YAxis): [number, number] => {
      const o = yOver.current[ax];
      if (o) return o;
      if (!cfg.auto && cfg.max > cfg.min) return [cfg.min, cfg.max];
      return padRange(span[ax][0], span[ax][1]);
    };
    const yl = yr("L", yL);
    const yrr = hasR ? yr("R", yR) : yl;
    geo.current = { x0, x1, l, r, top, bottom, yl, yr: yrr };
    const X = (x: number) => l + ((x - x0) / (x1 - x0 || 1)) * pw;
    const Y = (v: number, ax: "L" | "R") => {
      const [a, b] = ax === "L" ? yl : yrr;
      return bottom - ((v - a) / (b - a || 1)) * (bottom - top);
    };

    // 눈금 — 가로: 받은 순서 번호 또는 0 초부터 지난 시간
    ctx.font = font;
    ctx.lineWidth = 1;
    ctx.strokeStyle = grid;
    ctx.fillStyle = muted;
    const yt = ticks(yl[0], yl[1], Math.max(2, Math.floor((bottom - top) / 40)));
    const ys = niceStep(yl[1] - yl[0], Math.max(2, Math.floor((bottom - top) / 40)));
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.beginPath();
    for (const v of yt) {
      const y = Math.round(Y(v, "L")) + 0.5;
      ctx.moveTo(l, y);
      ctx.lineTo(r, y);
      ctx.fillText(fmtTick(v, ys), l - 6, y);
    }
    ctx.stroke();
    if (hasR) {
      const rt = ticks(yrr[0], yrr[1], Math.max(2, Math.floor((bottom - top) / 40)));
      const rs = niceStep(yrr[1] - yrr[0], Math.max(2, Math.floor((bottom - top) / 40)));
      ctx.textAlign = "left";
      for (const v of rt) ctx.fillText(fmtTick(v, rs), r + 6, Y(v, "R"));
    }
    const xCount = Math.max(2, Math.floor(pw / 90));
    const unit = mode === "time" ? 1000 : 1;
    const xs = niceStep((x1 - x0) / unit, xCount);
    const xt = ticks((x0 - (mode === "time" ? origin : 0)) / unit, (x1 - (mode === "time" ? origin : 0)) / unit, xCount);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.beginPath();
    for (const v of xt) {
      const x = Math.round(X(v * unit + (mode === "time" ? origin : 0))) + 0.5;
      if (x < l - 1 || x > r + 1) continue;
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.fillText(mode === "time" ? `${fmtTick(v, xs)} s` : fmtTick(v, xs), x, bottom + 5);
    }
    ctx.strokeStyle = grid;
    ctx.stroke();
    ctx.strokeRect(l + 0.5, top + 0.5, pw - 1, bottom - top - 1);

    // 값 선
    ctx.save();
    ctx.beginPath();
    ctx.rect(l, top, pw, bottom - top);
    ctx.clip();
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    for (const { ch, pts } of lines) {
      ctx.strokeStyle = ch.color;
      ctx.setLineDash(channelDash(ch.i) ? [6, 4] : []);
      ctx.beginPath();
      let pen = false;
      for (let k = 0; k < pts.length; k += 2) {
        const v = pts[k + 1];
        if (Number.isNaN(v)) {
          pen = false;
          continue;
        }
        const px = l + pts[k];
        const py = Y(v, ch.axis);
        if (pen) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
        pen = true;
      }
      ctx.stroke();
      // 점이 적으면 점도 찍는다(띄엄띄엄 오는 값이 보이게)
      if (pts.length / 2 < pw / 8) {
        ctx.fillStyle = ch.color;
        for (let k = 0; k < pts.length; k += 2) {
          if (Number.isNaN(pts[k + 1])) continue;
          ctx.beginPath();
          ctx.arc(l + pts[k], Y(pts[k + 1], ch.axis), 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.setLineDash([]);
    // 측정점 A·B
    marksRef.current.forEach((m, k) => {
      const mx = mode === "time" ? m.ts : m.idx;
      if (mx < x0 || mx > x1) return;
      const x = Math.round(X(mx)) + 0.5;
      ctx.strokeStyle = ink;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ink;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(k === 0 ? "A" : "B", x + 3, top + 2);
    });
    ctx.restore();

    // 범례(PNG 에도 남게 그림 안에)
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    let lx = l;
    for (const ch of shown) {
      const label = `${ch.name}${hasR ? (ch.axis === "R" ? " ▸" : " ◂") : ""}`;
      const tw = ctx.measureText(label).width;
      if (lx + tw + 22 > w - 4) {
        ctx.fillStyle = muted;
        ctx.fillText("…", lx, 12);
        break;
      }
      ctx.strokeStyle = ch.color;
      ctx.lineWidth = 2;
      ctx.setLineDash(channelDash(ch.i) ? [4, 3] : []);
      ctx.beginPath();
      ctx.moveTo(lx, 12.5);
      ctx.lineTo(lx + 14, 12.5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ink;
      ctx.fillText(label, lx + 18, 12);
      lx += tw + 32;
    }

    // 커서 — 가장 가까운 점의 값
    const cur = cursor.current;
    if (cur && ring.n && cur.x >= l && cur.x <= r && cur.y >= top && cur.y <= bottom) {
      const xv = x0 + ((cur.x - l) / pw) * (x1 - x0);
      const i = nearest(ring, mode, xv);
      if (i >= 0) {
        const x = Math.round(X(ring.x(i, mode))) + 0.5;
        ctx.strokeStyle = muted;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();
        const rows = [`#${ring.index(i)} · ${clock(ring.time(i))}`];
        const colors: (string | null)[] = [null];
        for (const ch of shown) {
          const v = ring.val(ch.i, i);
          rows.push(`${ch.name}: ${fmtNum(v)}`);
          colors.push(ch.color);
          const vy = Y(v, ch.axis);
          if (!Number.isNaN(v) && vy >= top && vy <= bottom) {
            ctx.fillStyle = ch.color;
            ctx.beginPath();
            ctx.arc(x, vy, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        const bw = Math.max(...rows.map((s) => ctx.measureText(s).width)) + 22;
        const bh = rows.length * lh + 8;
        let bx = x + 10;
        if (bx + bw > r) bx = x - 10 - bw;
        const by = Math.min(Math.max(top + 4, cur.y - bh / 2), bottom - bh - 2);
        ctx.fillStyle = bg;
        ctx.strokeStyle = grid;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        rows.forEach((s, k) => {
          const yy = by + 4 + lh / 2 + k * lh;
          if (colors[k]) {
            ctx.fillStyle = colors[k]!;
            ctx.fillRect(bx + 6, yy - 4, 8, 8);
          }
          ctx.fillStyle = ink;
          ctx.fillText(s, bx + (colors[k] ? 18 : 6), yy);
        });
      }
    }
    if (!ring.n) {
      ctx.fillStyle = muted;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t.plotEmpty, l + pw / 2, (top + bottom) / 2);
    }
  }, [ring, xRange]);

  const bump = useCallback(() => {
    if (queued.current) return;
    queued.current = true;
    requestAnimationFrame(draw);
  }, [draw]);

  // 크기
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const w = Math.max(100, Math.floor(el.clientWidth));
      const h = Math.max(80, Math.floor(el.clientHeight));
      size.current = { w, h };
      if (cv.current) {
        cv.current.style.width = `${w}px`;
        cv.current.style.height = `${h}px`;
      }
      bump();
    };
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [bump]);

  // 설정이 바뀌면 다시
  useEffect(bump, [bump, channels, mode, span, yL, yR, origin, marks, t]);
  // 멈춤을 풀면 실시간으로, 멈추면 지금 범위에서 고정
  useEffect(() => {
    if (frozen) view.current = view.current ?? xRange();
    else view.current = null;
    bump();
  }, [frozen, bump, xRange]);
  // 가로축 방식을 바꾸면 고정 범위는 뜻이 없다
  useEffect(() => {
    view.current = frozen ? xRange() : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const reset = useCallback(() => {
    view.current = null;
    yOver.current = { L: null, R: null };
    onFreeze(false);
    bump();
  }, [bump, onFreeze]);

  handle.current = {
    bump,
    range: () => {
      const [x0, x1] = xRange();
      const [lo, hi] = rangeOf(ring, props.current.mode, x0, x1);
      // 가장자리 밖 한 점씩은 빼고(그리기용 여유)
      let a = lo;
      let b = hi;
      while (a < b && ring.x(a, props.current.mode) < x0) a++;
      while (b > a && ring.x(b - 1, props.current.mode) > x1) b--;
      return [a, b];
    },
    png: () =>
      new Promise((res) => {
        const c = cv.current;
        if (!c) return res(null);
        cursor.current = null;
        draw();
        c.toBlob((b) => (b ? b.arrayBuffer().then((a) => res(new Uint8Array(a))) : res(null)), "image/png");
      }),
    reset,
    clearMarks: () => setMarks([]),
  };

  // ---- 마우스
  const drag = useRef<{ x: number; y: number; v: [number, number]; yl: [number, number]; yr: [number, number]; moved: boolean; shift: boolean } | null>(null);
  const local = (e: { clientX: number; clientY: number }) => {
    const b = cv.current!.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };
  const onWheel = (e: WEv<HTMLCanvasElement>) => {
    if (!ring.n) return;
    const p = local(e);
    const g = geo.current;
    const k = e.deltaY > 0 ? 1.25 : 0.8;
    if (e.shiftKey) {
      // 세로 확대 — 마우스 자리를 가운데로 두고 두 축 모두
      const f = (bottom: number, [a, b]: [number, number]): [number, number] => {
        const v = a + ((bottom - p.y) / (g.bottom - g.top)) * (b - a);
        return [v - (v - a) * k, v + (b - v) * k];
      };
      yOver.current = { L: f(g.bottom, g.yl), R: f(g.bottom, g.yr) };
    } else {
      const xv = g.x0 + ((p.x - g.l) / (g.r - g.l)) * (g.x1 - g.x0);
      const n0 = xv - (xv - g.x0) * k;
      const n1 = xv + (g.x1 - xv) * k;
      if (n1 - n0 < (props.current.mode === "time" ? 5 : 4)) return;
      view.current = [n0, n1];
      if (!props.current.frozen) onFreeze(true);
    }
    bump();
  };
  // 휠이 페이지를 굴리지 않게(React 의 onWheel 은 passive)
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const stop = (e: WheelEvent) => e.preventDefault();
    c.addEventListener("wheel", stop, { passive: false });
    return () => c.removeEventListener("wheel", stop);
  }, []);
  const onDown = (e: PEv<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const p = local(e);
    const g = geo.current;
    drag.current = { ...p, v: [g.x0, g.x1], yl: g.yl, yr: g.yr, moved: false, shift: e.shiftKey };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PEv<HTMLCanvasElement>) => {
    const p = local(e);
    cursor.current = p;
    const d = drag.current;
    if (d) {
      const dx = p.x - d.x;
      const dy = p.y - d.y;
      if (!d.moved && Math.hypot(dx, dy) < 4) return bump();
      d.moved = true;
      const g = geo.current;
      const sx = ((d.v[1] - d.v[0]) / (g.r - g.l)) * dx;
      view.current = [d.v[0] - sx, d.v[1] - sx];
      if (d.shift) {
        const sy = (r: [number, number]) => ((r[1] - r[0]) / (g.bottom - g.top)) * dy;
        yOver.current = { L: [d.yl[0] + sy(d.yl), d.yl[1] + sy(d.yl)], R: [d.yr[0] + sy(d.yr), d.yr[1] + sy(d.yr)] };
      }
      if (!props.current.frozen) onFreeze(true);
    }
    bump();
  };
  const onUp = (e: PEv<HTMLCanvasElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved || !ring.n) return;
    // 누르기 = 측정점
    const p = local(e);
    const g = geo.current;
    if (p.x < g.l || p.x > g.r) return;
    const mode = props.current.mode;
    const i = nearest(ring, mode, g.x0 + ((p.x - g.l) / (g.r - g.l)) * (g.x1 - g.x0));
    if (i < 0) return;
    const m: Mark = { idx: ring.index(i), ts: ring.time(i), vals: Array.from({ length: ring.channels }, (_, c) => ring.val(c, i)) };
    const now = performance.now();
    // 두 번 누르기의 첫 누르기 전 상태를 기억(0.5초 안의 두 번째 누르기는 같은 두 번 누르기로 본다)
    if (now - marksBefore.current.at > 500) marksBefore.current = { at: now, marks: marksRef.current };
    setMarks((old) => (old.length === 1 ? [old[0], m] : [m]));
  };
  const onLeave = () => {
    cursor.current = null;
    bump();
  };

  const [a, b] = marks;
  const shownIdx = channels.map((c, i) => (c.show ? i : -1)).filter((i) => i >= 0);
  return (
    <div className="plot-wrap">
      <div className="plot-box" ref={box}>
        <canvas
          ref={cv}
          className="plot-canvas"
          role="img"
          aria-label={t.plotAria}
          onWheel={onWheel}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onLeave}
          onDoubleClick={() => {
            setMarks(marksBefore.current.marks);
            reset();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setMarks([]);
          }}
        />
        {!hasData && empty ? <div className="plot-empty">{empty}</div> : null}
      </div>
      <div className="measure-bar" aria-live="polite">
        {!a ? (
          <span className="hint">{t.markHint}</span>
        ) : (
          <>
            <span className="mono">
              <b>A</b> #{a.idx} · {clock(a.ts)}
            </span>
            {b ? (
              <>
                <span className="mono">
                  <b>B</b> #{b.idx} · {clock(b.ts)}
                </span>
                <span className="mono delta">
                  Δt {fmtDur(b.ts - a.ts)} · Δn {b.idx - a.idx}
                  {b.ts !== a.ts ? ` · 1/Δt ${fmtNum(1000 / Math.abs(b.ts - a.ts))} Hz` : ""}
                </span>
                {shownIdx.map((i) =>
                  i < a.vals.length && i < b.vals.length ? (
                    <span key={i} className="mono delta">
                      <i className="swatch" style={{ background: channels[i].color }} />
                      {channels[i].name} Δ {fmtNum(b.vals[i] - a.vals[i])}
                    </span>
                  ) : null,
                )}
              </>
            ) : (
              <span className="hint">{fill(t.markB, {})}</span>
            )}
            <button type="button" className="btn small ghost" onClick={() => setMarks([])}>
              {t.markClear}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
