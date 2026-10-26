// 최근 연결 기록(0.3.0) 화면 조각 — 주소 칸 옆 «▾» 버튼(누르면 최근 목록: 누르면 채우기, ✕ 지우기)과 주소 칸 자동 완성(datalist).
// 기록·정리 규칙은 recent.ts(시험 있음). 연결에 성공했을 때만 remember 를 부른다.
import { useCallback, useRef, useState } from "react";
import { Popover } from "./Popover";
import { forgetRecent, loadRecent, rememberRecent, splitHostPort } from "./recent";
import { ui, type Lang } from "./uiText";
import { tip } from "./tips";

/** 한 모드의 최근 목록 — 기억·지우기하면 화면도 바뀐다. mode 를 바꾸면 그 모드의 목록 */
export function useRecent(mode: string) {
  const [ver, setVer] = useState(0);
  void ver;
  const list = loadRecent(mode);
  const remember = useCallback(
    (v: string) => {
      rememberRecent(mode, v);
      setVer((n) => n + 1);
    },
    [mode],
  );
  const forget = useCallback(
    (v: string) => {
      forgetRecent(mode, v);
      setVer((n) => n + 1);
    },
    [mode],
  );
  return { mode, list, remember, forget };
}

export type Recent = ReturnType<typeof useRecent>;

/**
 * 주소 칸 옆 작은 «▾» — 최근 연결 목록. 고르면 onPick(«host:port» 그대로), ✕ 는 그 줄만 지운다.
 * 목록이 비면 버튼은 흐리게(누르면 «아직 없음» 한 줄).
 */
export function RecentButton({ lang, recent, onPick, disabled, format }: { lang: Lang; recent: Recent; onPick: (v: string) => void; disabled?: boolean; format?: (v: string) => string }) {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const label = ui(lang, "recentTitle");
  return (
    <>
      <button
        ref={btn}
        type="button"
        className={`btn small recent-btn${recent.list.length ? "" : " empty"}`}
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-expanded={open}
        aria-label={label}
        data-tip={tip(lang, "recent")}
      >
        ▾
      </button>
      {open && (
        <Popover anchor={btn.current} onClose={close} label={label} className="recent-pop">
          <b className="recent-head">{label}</b>
          {recent.list.length === 0 && <span className="hint">{ui(lang, "recentNone")}</span>}
          {recent.list.map((v) => (
            <div key={v} className="pop-row recent-row">
              <button
                type="button"
                className="btn small ghost recent-pick mono"
                onClick={() => {
                  close();
                  onPick(v);
                }}
                title={v}
              >
                {format ? format(v) : v}
              </button>
              <button type="button" className="btn small ghost recent-del" onClick={() => recent.forget(v)} aria-label={ui(lang, "recentForget", { a: v })} title={ui(lang, "recentForget", { a: v })}>
                ✕
              </button>
            </div>
          ))}
        </Popover>
      )}
    </>
  );
}

/** 주소 칸 자동 완성 — 최근 목록의 주소 부분(«host:port» 의 host)만, 겹치지 않게 */
export function RecentHosts({ id, recent }: { id: string; recent: Recent }) {
  const hosts = [...new Set(recent.list.map((v) => splitHostPort(v).host).filter(Boolean))];
  return (
    <datalist id={id}>
      {hosts.map((h) => (
        <option key={h} value={h} />
      ))}
    </datalist>
  );
}
