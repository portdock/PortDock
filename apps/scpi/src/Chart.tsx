// 반복 측정 추세 — 그림 라이브러리 없이 canvas. 숫자 값만(실패·넘침은 빈 자리로 끊는다), 최근 MAX 개.
// 위·아래에 그림 안 최댓값·최솟값, 오른쪽 끝 점은 마지막 값.
import { useEffect, useRef } from "react";
import { fmtNum, type Sample } from "./model";

const MAX = 1000;
const H = 120;

export function Chart({ samples, version, label, empty }: { samples: Sample[]; version: number; label: string; empty: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const width = useRef(0);

  useEffect(() => {
    const draw = () => {
      const c = ref.current;
      const ctx = c?.getContext("2d");
      const w = Math.max(100, Math.floor(box.current?.clientWidth ?? 300));
      width.current = w;
      if (!c || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      if (c.width !== w * dpr || c.height !== H * dpr) {
        c.width = w * dpr;
        c.height = H * dpr;
        c.style.width = `${w}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, H);
      const list = samples.slice(-MAX);
      const vals = list.map((s) => s.value).filter((v): v is number => v != null);
      if (!vals.length) return;
      const css = getComputedStyle(c);
      const accent = css.getPropertyValue("--accent").trim() || "#0b6e75";
      const muted = css.getPropertyValue("--muted").trim() || "#5f6b78";
      const line = css.getPropertyValue("--line").trim() || "#d9dee4";
      let lo = Math.min(...vals);
      let hi = Math.max(...vals);
      if (hi === lo) {
        const pad = Math.abs(hi) * 0.01 || 1;
        hi += pad;
        lo -= pad;
      }
      const top = 16;
      const bottom = H - 16;
      const left = 4;
      const right = w - 6;
      const x = (i: number) => (list.length < 2 ? right : left + ((right - left) * i) / (list.length - 1));
      const y = (v: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
      // 눈금 — 위·아래 선
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, top + 0.5);
      ctx.lineTo(right, top + 0.5);
      ctx.moveTo(left, bottom + 0.5);
      ctx.lineTo(right, bottom + 0.5);
      ctx.stroke();
      ctx.fillStyle = muted;
      ctx.font = "11px " + (css.getPropertyValue("--mono").trim() || "monospace");
      ctx.textBaseline = "bottom";
      ctx.fillText(fmtNum(hi), left + 2, top - 2);
      ctx.textBaseline = "top";
      ctx.fillText(fmtNum(lo), left + 2, bottom + 2);
      // 값 선 — 실패(null)에서 끊는다
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      let pen = false;
      let last: [number, number] | null = null;
      for (let i = 0; i < list.length; i++) {
        const v = list[i].value;
        if (v == null) {
          pen = false;
          continue;
        }
        const p: [number, number] = [x(i), y(v)];
        if (pen) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
        pen = true;
        last = p;
      }
      ctx.stroke();
      if (last) {
        const [lx, ly] = last;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    draw();
    const ro = typeof ResizeObserver !== "undefined" && box.current ? new ResizeObserver(() => box.current && box.current.clientWidth !== width.current && draw()) : null;
    if (ro && box.current) ro.observe(box.current);
    return () => ro?.disconnect();
  }, [samples, version]);

  const any = samples.some((s) => s.value != null);
  return (
    <div className="chart" ref={box} aria-label={label}>
      <canvas ref={ref} style={{ height: H }} aria-hidden="true" />
      {!any && <div className="chart-empty hint">{empty}</div>}
    </div>
  );
}
