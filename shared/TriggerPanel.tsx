// 트리거 칸과 동작 — 받은 줄(RX)에 패턴이 오면 색칠·소리·반복 멈춤·파일 기록 멈춤·사건 줄·창 깜빡임. Serial·TCP·UDP 공통.
// 화면에서만 돈다(백엔드와 무관). 목록은 localStorage("triggers"), 맞은 횟수는 켜 있는 동안만.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow, UserAttentionType } from "@tauri-apps/api/window";
import { load, store } from "./framing";
import { useFold } from "./settings";
import { compileAll, matchTriggers, newTrigger, sanitizeTriggers, TRIGGER_COLORS, type Trigger } from "./triggers";
import type { ToastApi } from "./Toast";
import { tip } from "./tips";
import { io } from "./ioText";
import type { Lang } from "./uiText";
import "./io.css";

/** 앱이 넘기는 동작들 */
export interface TriggerActions {
  addEv: (note: string) => void;
  /** 반복 보내기를 멈춘다(켜져 있었으면 true) */
  stopRepeat: () => boolean;
  /** 파일 기록을 멈춘다(켜져 있었으면 true) */
  stopLog: () => boolean;
}

let audio: AudioContext | null = null;
function beep() {
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = 1320;
    g.gain.value = 0.08;
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.12);
  } catch {
    /* 소리를 낼 수 없는 환경 — 무시 */
  }
}

/**
 * 트리거 목록과 검사기. `check(frame)` 을 받은 줄마다 부른다(onEvent 안에서 — 늘 같은 함수).
 * 맞으면 줄에 색(mark)을 붙이고 동작을 한다.
 */
export function useTriggers(lang: Lang, actions: TriggerActions) {
  const [list, setListState] = useState<Trigger[]>(() => sanitizeTriggers(load("triggers", [])));
  const [hits, setHits] = useState<Record<number, number>>({});
  const compiled = useMemo(() => compileAll(list, lang), [list, lang]);
  const cur = useRef({ compiled, actions, lang });
  cur.current = { compiled, actions, lang };
  const last = useRef({ beep: 0, flash: 0 });
  const pending = useRef<Record<number, number>>({});
  const flushTimer = useRef<number | null>(null);

  const setList = useCallback((f: Trigger[] | ((l: Trigger[]) => Trigger[])) => {
    setListState((l) => {
      const next = typeof f === "function" ? f(l) : f;
      store("triggers", next);
      return next;
    });
  }, []);

  /** 받은 줄 하나 — 맞은 트리거가 있으면 동작하고 그 목록을 돌려준다 */
  const check = useCallback((f: { dir: string; bytes: number[]; mark?: string | null }) => {
    if (f.dir !== "rx" || !f.bytes.length) return [];
    const { compiled, actions, lang } = cur.current;
    if (!compiled.length) return [];
    const hit = matchTriggers(compiled, f.bytes);
    if (!hit.length) return hit;
    const now = Date.now();
    for (const t of hit) {
      pending.current[t.id] = (pending.current[t.id] ?? 0) + 1;
      if (t.color && !f.mark) f.mark = t.color;
      let extra = "";
      if (t.stopRepeat && actions.stopRepeat()) extra += io(lang, "evTrgRepeat");
      if (t.stopLog && actions.stopLog()) extra += io(lang, "evTrgLog");
      if (t.note || extra) actions.addEv(io(lang, "evTrigger", { a: t.name }) + extra);
      if (t.sound && now - last.current.beep > 250) {
        last.current.beep = now;
        beep();
      }
      if (t.flash && now - last.current.flash > 3000) {
        last.current.flash = now;
        getCurrentWindow()
          .requestUserAttention(UserAttentionType.Informational)
          .catch(() => {});
      }
    }
    // 횟수 표시는 묶어서(많이 들어와도 화면이 따라가게)
    flushTimer.current ??= window.setTimeout(() => {
      flushTimer.current = null;
      const add = pending.current;
      pending.current = {};
      setHits((h) => {
        const n = { ...h };
        for (const [k, v] of Object.entries(add)) n[+k] = (n[+k] ?? 0) + v;
        return n;
      });
    }, 200);
    return hit;
  }, []);

  useEffect(
    () => () => {
      if (flushTimer.current != null) clearTimeout(flushTimer.current);
    },
    [],
  );

  const resetHits = useCallback(() => setHits({}), []);
  return { list, setList, hits, resetHits, check, compiled };
}

export type TriggersApi = ReturnType<typeof useTriggers>;

/** 오른쪽 칸의 «트리거» — 접고 펼 수 있다 */
export function TriggerPanel({ lang, trg, toast, expandAll = false }: { lang: Lang; trg: TriggersApi; toast: ToastApi; /** 설정 «모두 펼치기» */ expandAll?: boolean }) {
  const [openSaved, setOpenSaved] = useState(() => load("triggersOpen", false));
  useEffect(() => store("triggersOpen", openSaved), [openSaved]);
  const [open, setOpen] = useFold(openSaved, setOpenSaved, expandAll);
  const { list, setList, hits, compiled } = trg;
  const total = Object.values(hits).reduce((a, b) => a + b, 0);
  const on = list.filter((t) => t.on).length;
  const set = (id: number, p: Partial<Trigger>) => setList((l) => l.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const add = () => {
    const id = Math.max(0, ...list.map((t) => t.id)) + 1;
    setList((l) => [...l, newTrigger(id)]);
    setOpen(true);
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`.trg[data-id="${id}"] .trg-pat`)?.focus());
  };
  const del = (t: Trigger, i: number) => {
    setList((l) => l.filter((x) => x.id !== t.id));
    toast.show(io(lang, "trgDeleted", { a: t.name }), { undo: () => setList((l) => [...l.slice(0, i), t, ...l.slice(i)]) });
  };
  return (
    <div className="trg-panel">
      <div className="trg-head">
        <button type="button" className="trg-toggle" onClick={() => setOpen(!open)} aria-expanded={open} data-tip={tip(lang, "triggers")}>
          {open ? "▾" : "▸"} {io(lang, "trgTitle")} {list.length > 0 && <span className="trg-count">{on}/{list.length}</span>}
          {total > 0 && <span className="trg-total">{io(lang, "trgTotal", { n: total.toLocaleString() })}</span>}
        </button>
        <button type="button" className="btn small" onClick={add}>
          {io(lang, "trgAdd")}
        </button>
      </div>
      {open && (
        <div className="trg-list">
          {list.length === 0 && <div className="hint">{io(lang, "trgEmpty")}</div>}
          {list.map((t, i) => {
            const c = compiled.find((x) => x.t.id === t.id);
            return (
              <div key={t.id} className={`trg${t.on ? "" : " off"}`} data-id={t.id} style={t.color ? { borderLeftColor: t.color } : undefined}>
                <div className="trg-row">
                  <input type="checkbox" checked={t.on} onChange={(e) => set(t.id, { on: e.target.checked })} aria-label={io(lang, "trgOn")} title={io(lang, "trgOn")} />
                  <input className="trg-name" value={t.name} onChange={(e) => set(t.id, { name: e.target.value })} aria-label={io(lang, "trgName")} spellCheck={false} />
                  <select value={t.mode} onChange={(e) => set(t.id, { mode: e.target.value as Trigger["mode"] })} aria-label="HEX / ASCII">
                    <option value="ascii">ASCII</option>
                    <option value="hex">HEX</option>
                  </select>
                  <span className="trg-hits mono" title={io(lang, "trgHits", { n: hits[t.id] ?? 0 })}>
                    {io(lang, "trgHits", { n: (hits[t.id] ?? 0).toLocaleString() })}
                  </span>
                  <button type="button" className="btn small ghost" onClick={() => del(t, i)} aria-label={io(lang, "trgDel")} data-tip={io(lang, "trgDel")}>
                    ✕
                  </button>
                </div>
                <input
                  className={`trg-pat mono${c?.error && t.pattern ? " bad" : ""}`}
                  value={t.pattern}
                  placeholder={t.mode === "hex" ? "01 03 ?? **" : "ALARM*"}
                  onChange={(e) => set(t.id, { pattern: e.target.value })}
                  aria-label={io(lang, "trgPattern")}
                  data-tip={io(lang, t.mode === "hex" ? "trgHelpHex" : "trgHelpAscii")}
                  spellCheck={false}
                />
                {c?.error && t.pattern && <span className="error">{c.error}</span>}
                <div className="trg-acts">
                  <label className="inline" title={io(lang, "trgColor")}>
                    <input type="checkbox" checked={!!t.color} onChange={(e) => set(t.id, { color: e.target.checked ? TRIGGER_COLORS[(t.id - 1) % TRIGGER_COLORS.length] : null })} />
                    {t.color ? (
                      <input type="color" className="trg-color" value={t.color} onChange={(e) => set(t.id, { color: e.target.value })} aria-label={io(lang, "trgColor")} />
                    ) : (
                      io(lang, "trgColor")
                    )}
                  </label>
                  {(
                    [
                      ["sound", "trgSound"],
                      ["stopRepeat", "trgStopRepeat"],
                      ["stopLog", "trgStopLog"],
                      ["note", "trgNote"],
                      ["flash", "trgFlash"],
                    ] as const
                  ).map(([k, label]) => (
                    <label key={k} className="inline">
                      <input type="checkbox" checked={t[k]} onChange={(e) => set(t.id, { [k]: e.target.checked })} /> {io(lang, label)}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          {total > 0 && (
            <button type="button" className="btn small ghost" onClick={trg.resetHits}>
              {io(lang, "trgResetHits")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
