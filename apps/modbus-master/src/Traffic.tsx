// 통신 기록 칸 — Modbus Slave 의 것과 같다(요청 TX·응답 RX·사건 EV 에 Modbus 풀이를 붙인다).
// 가상 스크롤(설정 «화면에 남길 줄 수» 까지), 찾기·거르기·따라가기·줄 고르기·복사는 다른 프로그램과 같다.
// 따로 떼어 둔 까닭: 새 줄·굴림·따라가기로 자주 다시 그려지는데, 그때마다 값 표(수백 칸)까지 다시 그리지 않게.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { hex, type Frame } from "./api";
import { tip } from "@shared/tips";
import { formatTime, rowHeight, type Settings } from "@shared/settings";
import { useFollowTail } from "@shared/useFollowTail";
import { FollowButton } from "@shared/FollowButton";
import { FailCount, LogFilterBar, useLogFilter } from "@shared/LogFilter";
import { copyTextOf, selectedFrames, useCopyKey, useLogSelection } from "@shared/logCopy";
import { LogMenu, logMenuItems, type MenuAt } from "@shared/LogMenu";
import { KEYS, withKey } from "@shared/shortcuts";
import { ui } from "@shared/uiText";
import { dict, type Key, type Lang } from "./i18n";

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * 따라가기(공용 useFollowTail) + 경주 막기. 새 줄이 자주 오면, 사람이 위로 굴린 직후의 scroll 사건보다
 * 먼저(가상 스크롤이 scroll 사건 안에서 밀린 화면 갱신을 한꺼번에 그릴 때) «맨 아래로» 가 실행되어
 * 굴린 자리가 덮이고 따라가기가 멈추지 않는다. 그리기 직전에 «마지막으로 본 자리보다 위» 인지 보고,
 * 그렇다면 맨 아래로 간 뒤 그 자리로 되돌리고 멈춘다.
 */
function useGuardedFollow(ref: RefObject<HTMLDivElement | null>, autoScroll: boolean, mark: number, tick: string) {
  const seen = useRef(0);
  const want = useRef<number | null>(null);
  const followingRef = useRef(autoScroll);
  // 공용 훅의 «맨 아래로» 보다 먼저 — 선언 순서대로 돈다
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
  // 공용 훅 뒤 — 되돌리고 멈춘다. 지금 자리를 기억한다
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
}

export function Traffic({
  lang,
  settings,
  traffic,
  seqRef,
  failCount,
  handle,
  connected,
  logPath,
  onToggleLog,
  peers,
  error,
  onClearError,
  onCopied,
  height,
}: {
  /** 끌어서 정한 높이(px) — 없으면 CSS 기본 */
  height?: number | null;
  lang: Lang;
  settings: Pick<Settings, "fontSize" | "autoScroll" | "timeFormat">;
  traffic: MutableRefObject<Frame[]>;
  seqRef: MutableRefObject<number>;
  failCount: MutableRefObject<number>;
  handle: MutableRefObject<TrafficHandle | null>;
  connected: boolean;
  logPath: string | null;
  onToggleLog: () => void;
  /** TCP — 복사할 때 상대 주소를 넣는다 */
  peers: boolean;
  error: string | null;
  onClearError: () => void;
  onCopied: (ok: boolean, n: number) => void;
}) {
  const t = (k: Key) => dict[lang][k];
  const [tick, setTick] = useState(0);
  const frames = traffic.current;
  const tlogRef = useRef<HTMLDivElement>(null);
  const timeBase = useRef<number | null>(null);
  const filter = useLogFilter(frames, tick);
  const rows = useVirtualizer({ count: filter.count, getScrollElement: () => tlogRef.current, estimateSize: () => rowHeight(settings.fontSize), overscan: 20 });
  // 글자 크기를 바꾸면 줄 높이를 다시 잰다
  useEffect(() => {
    rows.measure();
  }, [settings.fontSize, rows]);
  const follow = useGuardedFollow(tlogRef, settings.autoScroll, seqRef.current, `${tick}:${filter.count}:${rows.getTotalSize()}`);
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
  const [showSum, setShowSum] = useState<boolean>(() => load("showSum", true));
  useEffect(() => {
    try {
      localStorage.setItem("showSum", JSON.stringify(showSum));
    } catch {
      /* 저장이 막힌 환경 */
    }
  }, [showSum]);
  const clear = () => {
    traffic.current = [];
    failCount.current = 0;
    sel.clear();
    setMenu(null);
    follow.resume();
    setTick((x) => x + 1);
  };
  const clearRef = useRef(clear);
  clearRef.current = clear;
  useEffect(() => {
    handle.current = { bump: () => setTick((x) => x + 1), clear: () => clearRef.current() };
    return () => {
      handle.current = null;
    };
  }, [handle]);

  // «지난 시간» 기준 — 오래된 줄이 화면에서 잘려도 바뀌지 않게 첫 기록 시각을 잡아 두고, 지우면 다시 잡는다
  if (!frames.length) timeBase.current = null;
  else if (timeBase.current === null) timeBase.current = frames[0].ts;
  const fmt = (ts: number) => formatTime(ts, settings.timeFormat, timeBase.current ?? ts);
  // Ctrl+C — 고른 통신 기록 줄을 «시각 방향 HEX» 로
  useCopyKey(
    () => {
      const list = selectedFrames(sel, frameOf);
      return list.length ? copyTextOf(list, "lines", "hex", fmt, peers) : null;
    },
    (ok) => onCopied(ok, sel.set.size),
  );

  return (
    <div className={height ? "traffic sized" : "traffic"} style={height ? { height } : undefined}>
      <div className="toolbar">
        <b data-tip={tip(lang, "traffic")}>{t("traffic")}</b>
        <label data-tip={withKey(ui(lang, "autoscrollTip"), KEYS.end)} className="inline">
          <input type="checkbox" checked={follow.following} onChange={(e) => (e.target.checked ? follow.resume() : follow.pause())} /> {t("autoscroll")}
        </label>
        <label data-tip={tip(lang, "showSum")} className="inline">
          <input type="checkbox" checked={showSum} onChange={(e) => setShowSum(e.target.checked)} /> {t("showSum")}
        </label>
        <span className="grow" />
        <FailCount lang={lang} n={failCount.current} filter={filter} />
        <button data-tip={withKey(tip(lang, logPath ? "stopLog" : "logToFile"), KEYS.fileLog)} className="btn small" onClick={onToggleLog} disabled={!connected}>
          {logPath ? t("stopLog") : t("logToFile")}
        </button>
        <button data-tip={withKey(tip(lang, "clear"), KEYS.clear)} className="btn small" onClick={clear}>
          {t("clear")}
        </button>
      </div>
      <LogFilterBar lang={lang} filter={filter} selected={sel.primary} total={frames.length} onJump={jumpTo} />
      <div className="log-wrap">
        <div className="tlog" ref={tlogRef}>
          <div style={{ height: rows.getTotalSize(), position: "relative" }}>
            {rows.getVirtualItems().map((r) => {
              const f = filter.at(r.index);
              if (!f || f.seq == null) return null;
              const seq = f.seq;
              // 예외·CRC·모양 틀림(국번·함수·바이트 수·MBAP·덜 옴)은 빨갛게
              const bad = f.dir === "rx" && (f.check === false || (!!f.sum && !/→ (정상|OK)/.test(f.sum)));
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
                  title={f.sum ?? undefined}
                >
                  <span className="ts">{fmt(f.ts)}</span>
                  <span className="dir">{f.dir === "rx" ? "RX ◀" : f.dir === "tx" ? "TX ▶" : "EV"}</span>
                  {f.peer && <span className="peeraddr">{f.peer}</span>}
                  {f.dir !== "ev" && showSum && f.sum && <span className={bad ? "sum bad" : "sum"}>{f.sum}</span>}
                  <span className="data">{f.dir === "ev" ? f.note : hex(f.bytes)}</span>
                  {f.check === false && <span className="badge fail">CRC</span>}
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
            view: "hex",
            fmt,
            peers,
            onCopied,
            find: (b) => {
              filter.setState((s) => ({ ...s, query: hex(b), qmode: "hex" }));
              document.querySelector<HTMLInputElement>(".filterbar .find")?.focus();
            },
          })}
        />
      )}
      {error && (
        <div className="error traffic-error" role="alert">
          {error}
          <button className="btn small ghost" onClick={onClearError} aria-label={t("close")} title={t("close")}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
