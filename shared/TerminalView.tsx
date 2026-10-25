// 터미널 보기 화면 — TermBuffer 의 줄을 그린다. 맨 아래에 있으면 새 줄을 따라간다(위로 굴리면 멈춤).
import { useLayoutEffect, useRef } from "react";
import { termColor, type Seg, type TermBuffer } from "./terminal";
import { io } from "./ioText";
import type { Lang } from "./uiText";
import "./io.css";

/** 한 번에 그리는 줄 수 — 넘는 앞줄은 그리지 않는다(버퍼에는 남음) */
const DRAW_MAX = 2000;

export function TerminalView({ term, lang, colors, onColors, version }: { term: TermBuffer; lang: Lang; colors: boolean; onColors: (v: boolean) => void; version: number }) {
  const box = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const lines = term.lines();
  const shown = lines.length > DRAW_MAX ? lines.slice(lines.length - DRAW_MAX) : lines;
  useLayoutEffect(() => {
    const el = box.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [version, term.version]);
  return (
    <>
      <div className="term-bar">
        <span>{io(lang, "termLines", { n: lines.length.toLocaleString() })}</span>
        <label className="inline">
          <input type="checkbox" checked={colors} onChange={(e) => onColors(e.target.checked)} /> {io(lang, "termColors")}
        </label>
      </div>
      <div
        className="term"
        ref={box}
        tabIndex={0}
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
      >
        {lines.length === 0 && <div className="empty-guide">{io(lang, "termEmpty")}</div>}
        {shown.map((l, i) => (
          <div key={lines.length - shown.length + i} className="term-line">
            {l.map((s, j) => (colors ? <span key={j} style={segStyle(s)}>{s.text}</span> : s.text))}
          </div>
        ))}
      </div>
    </>
  );
}

function segStyle(s: Seg) {
  if (s.fg === undefined && s.bg === undefined && !s.bold) return undefined;
  return { color: termColor(s.fg), background: termColor(s.bg), fontWeight: s.bold ? 700 : undefined };
}
