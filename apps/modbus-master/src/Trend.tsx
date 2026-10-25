// 추세 — 고른 칸의 값 변화를 작은 선 그림으로(그림 라이브러리 없이 canvas). 마지막·최소·최대를 옆에 적는다.
import { useEffect, useRef } from "react";
import { tip } from "@shared/tips";
import { dict, type Key, type Lang } from "./i18n";
import { scaleSeries, type Series } from "./model";

export interface TrendItem {
  key: string;
  /** «표 1 · 40001 온도» */
  label: string;
  series: Series | undefined;
  /** 마지막 값 글(화면 칸과 같은 모양) */
  last: string;
}

const W = 180;
const H = 30;

function Spark({ s, version }: { s: Series | undefined; version: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== W * dpr) {
      c.width = W * dpr;
      c.height = H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!s || !s.v.length) return;
    const css = getComputedStyle(c);
    const { pts } = scaleSeries(s, W, H, 2);
    ctx.strokeStyle = css.getPropertyValue("--accent").trim() || "#3730a3";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    const [lx, ly] = pts[pts.length - 1];
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(lx, ly, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }, [s, version]);
  return <canvas ref={ref} className="spark" style={{ width: W, height: H }} aria-hidden="true" />;
}

const num = (v: number) => (Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(6))));

export function Trend({ lang, items, version, onRemove, onClear }: { lang: Lang; items: TrendItem[]; version: number; onRemove: (key: string) => void; onClear: () => void }) {
  const t = (k: Key) => dict[lang][k];
  return (
    <div className="trend" aria-label={t("trend")}>
      <div className="trend-head">
        <b data-tip={tip(lang, "mmTrend")}>{t("trend")}</b>
        <span className="grow" />
        <button className="btn small ghost" onClick={onClear}>
          {t("trendClear")}
        </button>
      </div>
      <div className="trend-rows">
        {items.map((it) => {
          const s = it.series;
          let min = 0;
          let max = 0;
          if (s?.v.length) {
            min = Math.min(...s.v);
            max = Math.max(...s.v);
          }
          return (
            <div key={it.key} className="trend-row">
              <span className="trend-label" title={it.label}>
                {it.label}
              </span>
              <Spark s={s} version={version} />
              <span className="trend-last mono">{it.last}</span>
              <span className="trend-range mono">{s?.v.length ? `${num(min)} ~ ${num(max)}` : "—"}</span>
              <button className="btn small ghost" onClick={() => onRemove(it.key)} aria-label={`${t("trendRemove")} ${it.label}`} title={t("trendRemove")}>
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
