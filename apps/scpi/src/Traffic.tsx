// 통신 기록 칸 — Modbus Master 의 것을 SCPI 에 맞췄다: 내용은 글(제어 문자는 <CR>·<LF>), 줄 옆에 응답 시간·블록 크기.
// 가상 스크롤(설정 «화면에 남길 줄 수» 까지), 찾기·거르기·따라가기·줄 고르기·복사는 다른 프로그램과 같다(shared/LogFilter·logCopy·LogMenu).
// 따로 떼어 둔 까닭: 새 줄·굴림·따라가기로 자주 다시 그려지는데, 그때마다 응답 칸·측정 표까지 다시 그리지 않게.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { hex } from "./api";
import { tip } from "@shared/tips";
import { showBytes } from "./model";
import type { LogFrame } from "@shared/logSearch";
import { formatTime, rowHeight, type Settings } from "@shared/settings";
import { useFollowTail } from "@shared/useFollowTail";
import { FollowButton } from "@shared/FollowButton";
import { FailCount, filterDesc, LogFilterBar, useLogFilter } from "@shared/LogFilter";
import { copyTextOf, selectedFrames, useCopyKey, useLogSelection } from "@shared/logCopy";
import { LogMenu, logMenuItems, type MenuAt } from "@shared/LogMenu";
import { KEYS, withKey } from "@shared/shortcuts";
import { ui } from "@shared/uiText";
import { dict, type Key, type Lang } from "./i18n";
import { load } from "@shared/framing";
import { useLogKeys } from "@shared/logKeys";

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

/** 기록 한 줄 — `sum` 은 응답 시간·블록 크기 */
export interface Frame extends LogFrame {
  sum?: string | null;
  /** 빨간 사건 줄(시간 초과·끊김) */
  bad?: boolean;
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
  failCount,
  handle,
  connected,
  logPath,
  onToggleLog,
  error,
  onClearError,
  onCopied,
  onSave,
  children,
}: {
  lang: Lang;
  settings: Pick<Settings, "fontSize" | "autoScroll" | "timeFormat">;
  traffic: MutableRefObject<Frame[]>;
  seqRef: MutableRefObject<number>;
  failCount: MutableRefObject<number>;
  handle: MutableRefObject<TrafficHandle | null>;
  connected: boolean;
  logPath: string | null;
  onToggleLog: () => void;
  error: string | null;
  onClearError: () => void;
  onCopied: (ok: boolean, n: number) => void;
  /** 화면 내용 저장(Ctrl+S) — 보이는 줄(거르기 반영) */
  onSave: (view: number[] | null, desc: string | null) => void;
  /** 기록이 비었을 때 보일 것(첫 실행 카드) */
  children?: React.ReactNode;
}) {
  const peers = false;
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
  // 로그 칸 키보드 이동(0.3.0) — ↑↓·Shift+↑↓·PageUp/PageDown·Home/End
  const onLogKey = useLogKeys({
    sel,
    count: filter.count,
    seqAt: (i) => filter.at(i)?.seq,
    indexOfSeq: filter.indexOfSeq,
    scrollTo: (i) => rows.scrollToIndex(i, { align: "auto" }),
    page: () => Math.max(1, Math.floor((tlogRef.current?.clientHeight ?? 0) / rowHeight(settings.fontSize)) - 1),
    follow,
  });
  const [showSum, setShowSum] = useState<boolean>(() => load("showSum", true));
  const saveRef = useRef(() => {});
  saveRef.current = () => onSave(filter.view, filterDesc(filter.state, lang));
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
    handle.current = { bump: () => setTick((x) => x + 1), clear: () => clearRef.current(), save: () => saveRef.current() };
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
      return list.length ? copyTextOf(list, "lines", "ascii", fmt, peers) : null;
    },
    (ok) => onCopied(ok, sel.set.size),
  );

  return (
    <div className="traffic">
      <div className="toolbar">
        <b data-tip={tip(lang, "scTraffic")}>{t("traffic")}</b>
        <label data-tip={withKey(ui(lang, "autoscrollTip"), KEYS.end)} className="inline">
          <input type="checkbox" checked={follow.following} onChange={(e) => (e.target.checked ? follow.resume() : follow.pause())} /> {t("autoscroll")}
        </label>
        <label data-tip={tip(lang, "scShowSum")} className="inline">
          <input type="checkbox" checked={showSum} onChange={(e) => setShowSum(e.target.checked)} /> {t("showSum")}
        </label>
        <span className="grow" />
        <FailCount lang={lang} n={failCount.current} filter={filter} />
        <button data-tip={withKey(tip(lang, logPath ? "stopLog" : "logToFile"), KEYS.fileLog)} className="btn small" onClick={onToggleLog} disabled={!connected}>
          {logPath ? t("stopLog") : t("logToFile")}
        </button>
        <button data-tip={withKey(tip(lang, "scSaveScreen"), KEYS.save)} className="btn small" onClick={() => saveRef.current()} disabled={!frames.length}>
          {t("saveScreen")}
        </button>
        <button data-tip={withKey(tip(lang, "clear"), KEYS.clear)} className="btn small" onClick={clear}>
          {t("clear")}
        </button>
      </div>
      <LogFilterBar lang={lang} filter={filter} selected={sel.primary} total={frames.length} onJump={jumpTo} />
      <div className="log-wrap">
        {!frames.length && children}
        <div className="tlog" ref={tlogRef} tabIndex={0} onKeyDown={onLogKey}>
          <div style={{ height: rows.getTotalSize(), position: "relative" }}>
            {rows.getVirtualItems().map((r) => {
              const f = filter.at(r.index);
              if (!f || f.seq == null) return null;
              const seq = f.seq;
              // 시간 초과·끊김 사건 줄은 빨갛게
              const bad = !!f.bad;
              return (
                <div
                  key={r.key}
                  className={`trow ${f.dir}${bad ? " bad" : ""}${filter.isHit(seq) ? " hit" : ""}${sel.has(seq) ? " sel" : ""}${sel.primary === seq ? " primary" : ""}`}
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
                  {f.dir !== "ev" && showSum && f.sum && <span className="sum">{f.sum}</span>}
                  <span className="data">{f.dir === "ev" ? f.note : f.note ? `${showBytes(f.bytes.slice(0, 80))}… ${f.note}` : showBytes(f.bytes)}</span>
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
            view: "ascii",
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
