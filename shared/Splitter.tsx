// 위아래 칸 사이 높이 조절 막대 — 아래 칸(통신 기록) 높이를 끌어서 바꾸고 px 로 기억한다(Modbus Slave·Master, 10/18).
// 두 번 누르면 처음(CSS 기본) 높이로. 포커스를 두고 ↑·↓(Shift 는 큰 걸음)로도 바꾼다. 위 칸은 keepAbove px 아래로 줄이지 않는다.
import { useEffect, useState, type KeyboardEvent, type PointerEvent } from "react";
import { load, store } from "./framing";
import { ui, type Lang } from "./uiText";
import "./io.css";

/** 기억한 높이(px). null = CSS 기본 */
export function useStoredHeight(key: string): [number | null, (h: number | null) => void] {
  const [h, setH] = useState<number | null>(() => {
    const v = load<number | null>(key, null);
    return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null;
  });
  useEffect(() => store(key, h), [key, h]);
  return [h, setH];
}

export function Splitter({ lang, onHeight, min = 90, keepAbove = 150 }: { lang: Lang; onHeight: (h: number | null) => void; min?: number; keepAbove?: number }) {
  /** 지금 아래·위 칸 높이로 허용 범위를 잡아 h 를 맞춘다 */
  const fit = (bar: HTMLElement, h: number) => {
    const below = bar.nextElementSibling as HTMLElement | null;
    const above = bar.previousElementSibling as HTMLElement | null;
    if (!below) return h;
    const max = below.offsetHeight + Math.max(0, (above?.offsetHeight ?? 0) - keepAbove);
    return Math.round(Math.max(min, Math.min(max, h)));
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const bar = e.currentTarget;
    const below = bar.nextElementSibling as HTMLElement | null;
    if (!below) return;
    e.preventDefault();
    const y0 = e.clientY;
    const h0 = below.offsetHeight;
    const max = fit(bar, 1e9);
    bar.setPointerCapture(e.pointerId);
    bar.classList.add("dragging");
    const move = (ev: globalThis.PointerEvent) => onHeight(Math.round(Math.max(min, Math.min(max, h0 - (ev.clientY - y0)))));
    const up = () => {
      bar.classList.remove("dragging");
      bar.removeEventListener("pointermove", move);
      bar.removeEventListener("pointerup", up);
      bar.removeEventListener("pointercancel", up);
    };
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", up);
    bar.addEventListener("pointercancel", up);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 80 : 20;
    const below = e.currentTarget.nextElementSibling as HTMLElement | null;
    if (!below) return;
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      onHeight(fit(e.currentTarget, below.offsetHeight + (e.key === "ArrowUp" ? step : -step)));
    } else if (e.key === "Enter" || e.key === "Home") {
      e.preventDefault();
      onHeight(null);
    }
  };
  const label = ui(lang, "splitLog");
  return <div className="splitter" role="separator" aria-orientation="horizontal" aria-label={label} title={label} tabIndex={0} onPointerDown={onPointerDown} onKeyDown={onKeyDown} onDoubleClick={() => onHeight(null)} />;
}
