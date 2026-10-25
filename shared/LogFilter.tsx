// 로그 찾기·거르기 줄 — Serial·TCP·UDP 공통. 거르기는 보기만 바꾸고 기록은 그대로 둔다.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EMPTY_FILTER, filterActive, LogIndex, looksHex, lowerBound, parseQuery, type DirFilter, type FilterState, type LogFrame, type QueryMode } from "./logSearch";
import { tip } from "./tips";
import "./filterbar.css";

type Lang = "ko" | "en";

const L = {
  ko: {
    find: "찾기 (Ctrl+F) — 01 03 또는 글자",
    auto: "자동",
    hex: "HEX",
    text: "글자",
    prev: "이전 (Shift+Enter)",
    next: "다음 (Enter)",
    hitsOnly: "찾은 줄만",
    failOnly: "틀림만",
    all: "전체",
    off: "거르기 끄기 (Esc)",
    badHex: "HEX 가 아님",
    none: "없음",
    shown: "{a}/{b}줄 보임",
  },
  en: {
    find: "Find (Ctrl+F) — 01 03 or text",
    auto: "Auto",
    hex: "HEX",
    text: "Text",
    prev: "Previous (Shift+Enter)",
    next: "Next (Enter)",
    hitsOnly: "Matches only",
    failOnly: "FAIL only",
    all: "All",
    off: "Clear filter (Esc)",
    badHex: "not HEX",
    none: "none",
    shown: "{a}/{b} lines",
  },
};

/** 찾기·거르기 상태와 결과. frames 는 앱의 framesRef.current, version 은 새 줄이 올 때마다 바뀌는 값 */
export function useLogFilter<F extends LogFrame>(frames: F[], version: number) {
  const [state, setState] = useState<FilterState>(EMPTY_FILTER);
  const index = useRef(new LogIndex());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { view, hits } = useMemo(() => index.current.update(frames, state), [frames, version, state]);
  const first = frames.length ? (frames[0].seq ?? 0) : 0;
  const count = view ? view.length : frames.length;
  /** 보이는 i 번째 줄 */
  const at = (i: number): F | undefined => (view ? frames[view[i] - first] : frames[i]);
  /** 줄 번호(seq) → 보이는 자리(없으면 -1) */
  const indexOfSeq = (seq: number) => {
    if (!view) return seq - first >= 0 && seq - first < frames.length ? seq - first : -1;
    const i = lowerBound(view, seq);
    return view[i] === seq ? i : -1;
  };
  const isHit = (seq: number | undefined) => seq != null && hits.length > 0 && hits[lowerBound(hits, seq)] === seq;
  return { state, setState, view, hits, count, at, indexOfSeq, isHit, active: filterActive(state) };
}

export type LogFilter<F extends LogFrame = LogFrame> = ReturnType<typeof useLogFilter<F>>;

/** 사람이 읽는 거르기 설명 — 파일 머리줄에 쓴다. 거르기가 없으면 null */
export function filterDesc(s: FilterState, lang: Lang) {
  if (!filterActive(s)) return null;
  const t = L[lang];
  const parts: string[] = [];
  if (s.dir !== "all") parts.push(s.dir.toUpperCase());
  if (s.failOnly) parts.push(t.failOnly);
  if (s.hitsOnly && s.query.trim()) parts.push(`${t.hitsOnly} «${s.query.trim()}»`);
  return parts.join(", ");
}

export function LogFilterBar({
  lang,
  filter,
  selected,
  total,
  onJump,
}: {
  lang: Lang;
  filter: LogFilter<LogFrame>;
  /** 지금 고른 줄(seq) — 다음·이전은 여기서부터 */
  selected: number | null;
  /** 화면에 있는 전체 줄 수 */
  total: number;
  /** 찾은 줄로 옮겨 고르기 */
  onJump: (seq: number) => void;
}) {
  const t = L[lang];
  const { state, setState, hits } = filter;
  const inputRef = useRef<HTMLInputElement>(null);
  const set = (p: Partial<FilterState>) => setState((s) => ({ ...s, ...p }));
  const q = state.query.trim();
  const parsed = q ? parseQuery(q, state.qmode) : null;
  const badHex = !!q && !parsed;
  const detected: "hex" | "text" = state.qmode === "auto" ? (looksHex(q) ? "hex" : "text") : state.qmode;

  const go = useCallback(
    (dir: 1 | -1) => {
      if (!hits.length) return;
      let seq: number;
      if (dir > 0) {
        const i = selected == null ? 0 : lowerBound(hits, selected + 1);
        seq = hits[i < hits.length ? i : 0];
      } else {
        const i = selected == null ? hits.length : lowerBound(hits, selected);
        seq = hits[i > 0 ? i - 1 : hits.length - 1];
      }
      onJump(seq);
    },
    [hits, selected, onJump],
  );

  // Ctrl+F — 대화 상자가 열려 있으면 그쪽에 맡긴다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "f" && !document.querySelector(".modal-back")) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pos = selected != null && hits.length ? lowerBound(hits, selected) : -1;
  const posText = !q ? "" : badHex ? t.badHex : !hits.length ? t.none : pos >= 0 && hits[pos] === selected ? `${pos + 1}/${hits.length}` : `–/${hits.length}`;
  const anyOn = !!q || filter.active;

  return (
    <div className="filterbar">
      <input
        ref={inputRef}
        className={badHex ? "find bad" : "find"}
        value={state.query}
        placeholder={t.find}
        data-tip={tip(lang, "findBox")}
        spellCheck={false}
        onChange={(e) => set({ query: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            go(e.shiftKey ? -1 : 1);
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            // 처음엔 찾는 글자만, 비어 있으면 거르기 전체를 끈다
            if (state.query) set({ query: "" });
            else setState({ ...EMPTY_FILTER, qmode: state.qmode });
          }
        }}
      />
      <select className="qmode" value={state.qmode} onChange={(e) => set({ qmode: e.target.value as QueryMode })} data-tip={tip(lang, "findMode")}>
        <option value="auto">
          {t.auto}
          {q ? ` (${detected === "hex" ? t.hex : t.text})` : ""}
        </option>
        <option value="hex">{t.hex}</option>
        <option value="text">{t.text}</option>
      </select>
      <button className="btn small" onClick={() => go(-1)} disabled={!hits.length} title={t.prev} aria-label={t.prev}>
        ▲
      </button>
      <button className="btn small" onClick={() => go(1)} disabled={!hits.length} title={t.next} aria-label={t.next}>
        ▼
      </button>
      <span className={hits.length || !q ? "hitpos" : "hitpos none"}>{posText}</span>
      <label className="inline" data-tip={tip(lang, "hitsOnly")}>
        <input type="checkbox" checked={state.hitsOnly} onChange={(e) => set({ hitsOnly: e.target.checked })} /> {t.hitsOnly}
      </label>
      <label className="inline" data-tip={tip(lang, "failOnly")}>
        <input type="checkbox" checked={state.failOnly} onChange={(e) => set({ failOnly: e.target.checked })} /> {t.failOnly}
      </label>
      <select className="dirsel" value={state.dir} onChange={(e) => set({ dir: e.target.value as DirFilter })} data-tip={tip(lang, "dirFilter")}>
        <option value="all">{t.all}</option>
        <option value="rx">RX</option>
        <option value="tx">TX</option>
        <option value="ev">EV</option>
      </select>
      <span className="grow" />
      {filter.active && <span className="shown">{t.shown.replace("{a}", filter.count.toLocaleString()).replace("{b}", total.toLocaleString())}</span>}
      {anyOn && (
        <button className="btn small ghost" onClick={() => setState({ ...EMPTY_FILTER, qmode: state.qmode })} title={t.off} aria-label={t.off} data-tip={tip(lang, "filterOff")}>
          ✕
        </button>
      )}
    </div>
  );
}

/** «CHECK FAIL n» — 누르면 «틀림만» 을 켜고 끈다. 0 이면(체크섬 검사를 안 쓰면 늘 0) 도구줄 자리를 아끼려고 숨긴다 */
export function FailCount({ lang, n, filter }: { lang: Lang; n: number; filter: LogFilter<LogFrame> }) {
  if (!n && !filter.state.failOnly) return null;
  return (
    <button
      className={n ? "failcount on" : "failcount"}
      data-tip={tip(lang, "failCount")}
      onClick={() => filter.setState((s) => ({ ...s, failOnly: !s.failOnly }))}
      aria-pressed={filter.state.failOnly}
    >
      CHECK FAIL {n.toLocaleString()}
    </button>
  );
}
