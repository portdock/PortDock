import { useEffect, useMemo, useState, type ReactElement } from "react";

export interface HelpSection {
  title: string;
  /** 한 줄씩. «- » 로 시작하면 글머리표 */
  body: string[];
}
export type HelpDoc = Record<"ko" | "en", HelpSection[]>;

const UI = {
  ko: { title: "도움말", search: "찾기…", close: "닫기", none: "찾는 내용이 없습니다" },
  en: { title: "Help", search: "Search…", close: "Close", none: "No matches" },
};

/** 섹션 목록(왼쪽) + 본문(오른쪽). 찾기 칸으로 걸러 보고, Esc 로 닫는다 */
export function HelpDialog({ doc, lang, app, onClose }: { doc: HelpDoc; lang: "ko" | "en"; app: string; onClose: () => void }) {
  const ui = UI[lang];
  const sections = doc[lang];
  const [q, setQ] = useState("");
  const [cur, setCur] = useState(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return sections.map((s, i) => ({ s, i })).filter(({ s }) => !k || s.title.toLowerCase().includes(k) || s.body.some((b) => b.toLowerCase().includes(k)));
  }, [sections, q]);
  const active = shown.find((x) => x.i === cur) ?? shown[0];

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal help" role="dialog" aria-label={ui.title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>
            {app} · {ui.title}
          </b>
          <input className="help-search" value={q} placeholder={ui.search} onChange={(e) => setQ(e.target.value)} autoFocus />
          <button className="btn small ghost" onClick={onClose} title={ui.close} aria-label={ui.close}>
            ✕
          </button>
        </div>
        <div className="help-body">
          <nav className="help-toc">
            {shown.map(({ s, i }) => (
              <button key={i} className={active?.i === i ? "help-link on" : "help-link"} onClick={() => setCur(i)}>
                {s.title}
              </button>
            ))}
          </nav>
          <article className="help-text">
            {!active && <p className="hint">{ui.none}</p>}
            {active && (
              <>
                <h3>{active.s.title}</h3>
                {render(active.s.body)}
              </>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}

/** 이어진 «- » 줄은 하나의 목록으로 */
function render(lines: string[]) {
  const out: ReactElement[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`u${out.length}`}>
          {list.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const l of lines) {
    if (l.startsWith("- ")) list.push(l.slice(2));
    else {
      flush();
      out.push(<p key={`p${out.length}`}>{l}</p>);
    }
  }
  flush();
  return out;
}

/** F1 로 도움말 열기 */
export function useHelpKey(open: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
}
