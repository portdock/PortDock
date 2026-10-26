// 통신 기록 칸(0.3.0) — 가상 스크롤로 설정 «화면에 남길 줄 수» 까지 전부, 찾기·거르기(Ctrl+F)·따라가기·줄 고르기·키보드 이동·복사·화면 저장.
// Modbus Slave 의 Traffic.tsx 꼴. 따로 떼어 둔 까닭: 새 줄·굴림·따라가기로 자주 다시 그려지는데, 그때마다 규칙 칸까지 다시 그리지 않게.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ascii, hex, type Frame } from "./api";
import { tip } from "@shared/tips";
import { load, store } from "@shared/framing";
import { formatTime, rowHeight, type Settings } from "@shared/settings";
import { useFollowTail } from "@shared/useFollowTail";
import { FollowButton } from "@shared/FollowButton";
import { filterDesc, LogFilterBar, useLogFilter } from "@shared/LogFilter";
import { copyTextOf, selectedFrames, useCopyKey, useLogSelection } from "@shared/logCopy";
import { LogMenu, logMenuItems, type MenuAt } from "@shared/LogMenu";
import { useLogKeys } from "@shared/logKeys";
import { screenText } from "@shared/logSearch";
import { KEYS, withKey } from "@shared/shortcuts";
import { dict, type Key, type Lang } from "./i18n";

/**
 * 따라가기(공용 useFollowTail) + 경주 막기 — Modbus Slave 와 같다. 새 줄이 자주 오면 사람이 위로 굴린 직후의
 * scroll 사건보다 «맨 아래로» 가 먼저 실행되어 굴린 자리가 덮일 수 있다. 그리기 직전에 «마지막으로 본 자리보다 위» 면
 * 맨 아래로 간 뒤 그 자리로 되돌리고 멈춘다.
 */
function useGuardedFollow(ref: RefObject<HTMLDivElement | null>, autoScroll: boolean, mark: number, tick: string) {
  const seen = useRef(0);
  const want = useRef<number | null>(null);
  const followingRef = useRef(autoScroll);
  useLayoutEffect(() => {
    const el = ref.current;
    want.current = null;
    if (!el || !followingRef.current) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 24;
    if (!atBottom && el.scrollTop < seen.current - 1) want.current = el.scrollTop;
  }, [ref, tick]);
  const follow = useFollowTail(ref, autoScroll, mark, tick);
  followingRef.current = follow.following;
  const { pause } = follow;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (want.current != null) {
      el.scrollTop = want.current;
      want.current = null;
      pause();
    }
    seen.current = el.scrollTop;
  }, [ref, tick, follow.following, pause]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = () => (seen.current = el.scrollTop);
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, [ref]);
  return follow;
}

/** 앱이 통신 기록 칸에 거는 손잡이 */
export interface TrafficHandle {
  /** 새 줄이 들어왔다 — 다시 그린다 */
  bump: () => void;
  /** 화면 기록 지우기(Ctrl+L) */
  clear: () => void;
  /** 화면 내용 저장(Ctrl+S) */
  save: () => void;
}

export function Traffic({
  lang,
  settings,
  traffic,
  seqRef,
  handle,
  peers,
  error,
  onCopied,
  onSave,
  sendAgain,
  addRule,
}: {
  lang: Lang;
  settings: Pick<Settings, "fontSize" | "autoScroll" | "timeFormat">;
  traffic: MutableRefObject<Frame[]>;
  seqRef: MutableRefObject<number>;
  handle: MutableRefObject<TrafficHandle | null>;
  /** TCP·UDP — 줄에 상대 주소를 보이고 복사에도 넣는다 */
  peers: boolean;
  error: string | null;
  onCopied: (ok: boolean, n: number) => void;
  /** 화면 내용 저장 — 보이는 줄(거르기 반영)을 지금 보기대로 만든 글 */
  onSave: (text: string) => void;
  /** 우클릭 «다시 보내기» */
  sendAgain: { run: (b: number[]) => void; enabled: boolean; why: string };
  /** 우클릭 «이 요청으로 규칙 만들기» — seq 의 바이트(없으면 null) */
  addRule: { run: (b: number[]) => void; bytesOf: (seq: number) => number[] | null };
}) {
  const t = (k: Key) => dict[lang][k];
  const [tick, setTick] = useState(0);
  const frames = traffic.current;
  const tlogRef = useRef<HTMLDivElement>(null);
  const timeBase = useRef<number | null>(null);
  const [view, setView] = useState<"hex" | "ascii">(() => load("trafficView", "hex"));
  useEffect(() => {
    store("trafficView", view);
  }, [view]);
  const filter = useLogFilter(frames, tick);
  const rows = useVirtualizer({ count: filter.count, getScrollElement: () => tlogRef.current, estimateSize: () => rowHeight(settings.fontSize), overscan: 20 });
  // 글자 크기를 바꾸면 줄 높이를 다시 잰다
  useEffect(() => {
    rows.measure();
  }, [settings.fontSize, rows]);
  const follow = useGuardedFollow(tlogRef, settings.autoScroll, seqRef.current, `${tick}:${view}:${filter.count}:${rows.getTotalSize()}`);
  const sel = useLogSelection({ indexOfSeq: filter.indexOfSeq, seqAt: (i) => filter.at(i)?.seq });
  const frameOf = (seq: number) => {
    const f = frames.length ? frames[seq - (frames[0].seq ?? 0)] : undefined;
    return f && f.seq === seq ? f : undefined;
  };
  const [menu, setMenu] = useState<MenuAt>(null);
  const jumpTo = useCallback(
    (seq: number) => {
      sel.only(seq);
      follow.pause();
      const i = filter.indexOfSeq(seq);
      if (i >= 0) rows.scrollToIndex(i, { align: "center" });
    },
    [sel, follow, filter, rows],
  );
  // 로그 칸 키보드 이동(↑↓·Shift·PageUp/Down·Home/End) — 로그 칸에 포커스가 있을 때만
  const onLogKeys = useLogKeys({
    sel,
    count: filter.count,
    seqAt: (i) => filter.at(i)?.seq,
    indexOfSeq: filter.indexOfSeq,
    scrollTo: (i) => rows.scrollToIndex(i, { align: "auto" }),
    page: () => Math.max(1, Math.floor((tlogRef.current?.clientHeight ?? 0) / rowHeight(settings.fontSize)) - 1),
    follow,
  });

  // «지난 시간» 기준 — 오래된 줄이 화면에서 잘려도 바뀌지 않게 첫 기록 시각을 잡아 두고, 지우면 다시 잡는다
  if (!frames.length) timeBase.current = null;
  else if (timeBase.current === null) timeBase.current = frames[0].ts;
  const fmt = (ts: number) => formatTime(ts, settings.timeFormat, timeBase.current ?? ts);

  const clear = () => {
    traffic.current = [];
    sel.clear();
    setMenu(null);
    follow.resume();
    setTick((x) => x + 1);
  };
  const clearRef = useRef(clear);
  clearRef.current = clear;
  const saveRef = useRef(() => {});
  saveRef.current = () => {
    if (!traffic.current.length) return;
    onSave(screenText({ app: "PortDock Simulator", frames: traffic.current, view: filter.view, mode: view, fmt, hex, ascii, filterDesc: filterDesc(filter.state, lang), lang, peers }));
  };
  useEffect(() => {
    handle.current = { bump: () => setTick((x) => x + 1), clear: () => clearRef.current(), save: () => saveRef.current() };
    return () => {
      handle.current = null;
    };
  }, [handle]);

  // Ctrl+C — 고른 통신 기록 줄을 «시각 방향 [상대] 내용»(지금 보기대로)으로
  useCopyKey(
    () => {
      const list = selectedFrames(sel, frameOf);
      return list.length ? copyTextOf(list, "lines", view, fmt, peers) : null;
    },
    (ok) => onCopied(ok, sel.set.size),
  );

  return (
    <div className="traffic">
      <div className="toolbar">
        <b data-tip={tip(lang, "traffic")}>{t("traffic")}</b>
        {(["hex", "ascii"] as const).map((v) => (
          <button key={v} className={view === v ? "seg on" : "seg"} onClick={() => setView(v)} aria-pressed={view === v}>
            {v.toUpperCase()}
          </button>
        ))}
        <span className="grow" />
        <button data-tip={withKey(t("saveScreenTip"), KEYS.save)} className="btn small" onClick={() => saveRef.current()} disabled={!frames.length}>
          {t("saveScreen")}
        </button>
        <button data-tip={withKey(tip(lang, "clear"), KEYS.clear)} className="btn small" onClick={clear}>
          {t("clear")}
        </button>
      </div>
      <LogFilterBar lang={lang} filter={filter} selected={sel.primary} total={frames.length} onJump={jumpTo} />
      <div className="log-wrap">
        <div className="tlog" ref={tlogRef} tabIndex={0} onKeyDown={onLogKeys}>
          <div style={{ height: rows.getTotalSize(), position: "relative" }}>
            {rows.getVirtualItems().map((r) => {
              const f = filter.at(r.index);
              if (!f || f.seq == null) return null;
              const seq = f.seq;
              return (
                <div
                  key={r.key}
                  className={`trow ${f.dir}${filter.isHit(seq) ? " hit" : ""}${sel.has(seq) ? " sel" : ""}${sel.primary === seq ? " primary" : ""}`}
                  style={{ transform: `translateY(${r.start}px)` }}
                  onClick={(e: ReactMouseEvent) => sel.click(e, seq)}
                  onContextMenu={(e: ReactMouseEvent) => {
                    e.preventDefault();
                    sel.context(seq);
                    setMenu({ x: e.clientX, y: e.clientY, seq });
                  }}
                >
                  <span className="ts">{fmt(f.ts)}</span>
                  <span className="dir">{f.dir === "rx" ? "RX ◀" : f.dir === "tx" ? "TX ▶" : "EV"}</span>
                  {peers && f.dir !== "ev" && <span className="peeraddr">{f.peer}</span>}
                  <span className="data">{f.dir === "ev" ? f.note : view === "ascii" ? ascii(f.bytes) : hex(f.bytes)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <FollowButton follow={follow} lang={lang} hidden={!frames.length} />
      </div>
      {menu && (
        <LogMenu
          x={menu.x}
          y={menu.y}
          label={t("traffic")}
          onClose={() => setMenu(null)}
          items={logMenuItems({
            lang,
            frames: selectedFrames(sel, frameOf),
            clicked: frameOf(menu.seq),
            view,
            fmt,
            peers,
            onCopied,
            sendAgain,
            addRule: { run: addRule.run, bytes: addRule.bytesOf(menu.seq) },
            find: (b) => {
              filter.setState((s) => ({ ...s, query: hex(b), qmode: "hex" }));
              document.querySelector<HTMLInputElement>(".filterbar .find")?.focus();
            },
          })}
        />
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
