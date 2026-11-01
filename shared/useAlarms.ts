// (0.10.0) 값 감시·알람 — 조건(앱 설정에 저장)·감시 상태·알람 목록·소리·작업 표시줄 깜빡임·기록 CSV(1초마다 덧붙임).
// 판정은 shared/alarm.ts(시험 있음). Windows 알림 플러그인은 쓰지 않는다 — 앱 안 목록 + 소리(선택) + 창이 뒤에 있으면 작업 표시줄 깜빡임.
// PortDock 은 안전 장치가 아니다 — 감시 보조용.
import type { Lang } from "./lang.ts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow, UserAttentionType } from "@tauri-apps/api/window";
import { load, store } from "./framing";
import { count, type Feature } from "./usage";
import {
  ALARM_CSV_HEADER,
  activeKeys,
  alarmCsvLine,
  applyEdges,
  closeAll,
  newWatch,
  sanitizeRules,
  stepWatch,
  tickWatch,
  unacked,
  type AlarmEdge,
  type AlarmEntry,
  type AlarmRule,
  type Watch,
} from "./alarm.ts";
import { alarmText } from "./alarmText.ts";

let audio: AudioContext | null = null;
function beep() {
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = 880;
    g.gain.value = 0.1;
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.25);
  } catch {
    /* 소리를 낼 수 없는 환경 — 무시 */
  }
}

/** 확인하지 않은 알람이 있으면 소리를 다시 내는 간격 */
const REBEEP_MS = 5000;

export interface AlarmLog {
  path: string;
  lines: number;
}

export interface Alarms {
  rules: Map<string, AlarmRule>;
  setRule: (key: string, rule: AlarmRule | null) => void;
  /** 값 하나 — value null = 이번 읽기 실패. 조건이 없는 열쇠는 그냥 돌아간다(가볍게) */
  feed: (key: string, ts: number, value: number | null) => void;
  /** 조건이 걸린 열쇠인지(폴링 처리에서 먼저 거를 때) */
  has: (key: string) => boolean;
  entries: AlarmEntry[];
  active: Set<string>;
  ack: (id: number) => void;
  ackAll: () => void;
  clearEnded: () => void;
  sound: boolean;
  setSound: (on: boolean) => void;
  log: AlarmLog | null;
  toggleLog: () => Promise<void>;
  running: boolean;
}

/**
 * @param storeKey 조건을 둘 설정 열쇠(앱마다 따로, 예 «alarms»)
 * @param running 감시 중인지(연결·시작) — false 로 바뀌면 열린 알람을 닫고 감시 상태를 지운다(사용자가 멈춘 것은 «끊김» 이 아님)
 * @param labelOf 열쇠 → 사람이 읽는 이름(목록·CSV)
 */
export function useAlarms(o: {
  storeKey: string;
  lang: Lang;
  running: boolean;
  labelOf: (key: string) => string;
  writeText: (path: string, text: string) => Promise<void>;
  appendText: (path: string, text: string) => Promise<void>;
  feature: Feature;
  fileStem: string;
  onError: (msg: string) => void;
}): Alarms {
  const [ruleList, setRuleList] = useState<AlarmRule[]>(() => sanitizeRules(load<unknown>(o.storeKey, [])));
  useEffect(() => store(o.storeKey, ruleList), [o.storeKey, ruleList]);
  const rules = useMemo(() => new Map(ruleList.map((r) => [r.key, r])), [ruleList]);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;
  const [sound, setSoundState] = useState<boolean>(() => load<boolean>(`${o.storeKey}Sound`, true) !== false);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const setSound = useCallback(
    (on: boolean) => {
      setSoundState(on);
      store(`${o.storeKey}Sound`, on);
    },
    [o.storeKey],
  );

  const watches = useRef(new Map<string, Watch>());
  const [entries, setEntries] = useState<AlarmEntry[]>([]);
  const entriesRef = useRef(entries);
  const seq = useRef(0);
  const nextId = useCallback(() => ++seq.current, []);
  const pending = useRef<AlarmEdge[]>([]);
  const scheduled = useRef(false);
  const lastBeep = useRef(0);
  const labelRef = useRef(o.labelOf);
  labelRef.current = o.labelOf;
  const runningRef = useRef(o.running);

  // 기록 CSV
  const [log, setLog] = useState<AlarmLog | null>(null);
  const logRef = useRef(log);
  logRef.current = log;
  const logBuf = useRef("");
  const writeLine = useCallback((ev: "raise" | "clear" | "ack" | "stop", e: AlarmEntry, ts: number) => {
    if (!logRef.current) return;
    logBuf.current += alarmCsvLine(ev, e, labelRef.current(e.key), rulesRef.current.get(e.key), ts);
  }, []);

  const commit = useCallback(
    (next: AlarmEntry[]) => {
      entriesRef.current = next;
      setEntries(next);
    },
    [],
  );

  const flush = useCallback(() => {
    scheduled.current = false;
    const edges = pending.current;
    if (!edges.length) return;
    pending.current = [];
    const r = applyEdges(entriesRef.current, edges, nextId);
    for (const e of r.raised) writeLine("raise", e, e.start);
    for (const e of r.cleared) writeLine("clear", e, e.end ?? Date.now());
    commit(r.list);
    if (r.raised.length) {
      count(o.feature);
      if (soundRef.current) {
        beep();
        lastBeep.current = Date.now();
      }
      if (!document.hasFocus())
        getCurrentWindow()
          .requestUserAttention(UserAttentionType.Critical)
          .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commit, nextId, writeLine]);

  const push = useCallback(
    (edges: AlarmEdge[]) => {
      if (!edges.length) return;
      pending.current.push(...edges);
      if (!scheduled.current) {
        scheduled.current = true;
        queueMicrotask(flush);
      }
    },
    [flush],
  );

  const feed = useCallback(
    (key: string, ts: number, value: number | null) => {
      const rule = rulesRef.current.get(key);
      if (!rule || !runningRef.current) return;
      let w = watches.current.get(key);
      if (!w) watches.current.set(key, (w = newWatch(ts)));
      push(stepWatch(rule, w, ts, value));
    },
    [push],
  );
  const has = useCallback((key: string) => rulesRef.current.has(key), []);

  // 감시 시작·멈춤
  useEffect(() => {
    runningRef.current = o.running;
    watches.current.clear();
    if (o.running) return;
    const now = Date.now();
    const c = closeAll(entriesRef.current, now);
    for (const e of c.closed) writeLine("stop", e, now);
    if (c.closed.length) commit(c.list);
  }, [o.running, commit, writeLine]);

  // 1초마다 — 값이 오지 않을 때의 «끊김», 확인 안 한 알람 소리 다시
  useEffect(() => {
    if (!o.running) return;
    const id = setInterval(() => {
      const now = Date.now();
      const edges: AlarmEdge[] = [];
      for (const rule of rulesRef.current.values()) {
        let w = watches.current.get(rule.key);
        if (!w) watches.current.set(rule.key, (w = newWatch(now)));
        edges.push(...tickWatch(rule, w, now));
      }
      push(edges);
      if (soundRef.current && unacked(entriesRef.current) && now - lastBeep.current >= REBEEP_MS) {
        lastBeep.current = now;
        beep();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [o.running, push]);

  const setRule = useCallback(
    (key: string, rule: AlarmRule | null) => {
      setRuleList((list) => {
        const rest = list.filter((r) => r.key !== key);
        return rule ? [...rest, { ...rule, key }] : rest;
      });
      if (!rule) {
        // 조건을 지우면 그 열쇠의 열린 알람을 닫는다
        watches.current.delete(key);
        const w = entriesRef.current.filter((e) => e.key === key && e.end == null);
        if (w.length) push(w.map((e) => ({ key, kind: e.kind, on: false, ts: Date.now(), value: null })));
      }
    },
    [push],
  );

  const ack = useCallback(
    (id: number) => {
      const now = Date.now();
      commit(
        entriesRef.current.map((e) => {
          if (e.id !== id || e.acked) return e;
          writeLine("ack", e, now);
          return { ...e, acked: true };
        }),
      );
    },
    [commit, writeLine],
  );
  const ackAll = useCallback(() => {
    const now = Date.now();
    commit(
      entriesRef.current.map((e) => {
        if (e.acked) return e;
        if (e.end == null) writeLine("ack", e, now);
        return { ...e, acked: true };
      }),
    );
  }, [commit, writeLine]);
  const clearEnded = useCallback(() => commit(entriesRef.current.filter((e) => e.end == null)), [commit]);

  // 기록 — 1초마다 파일에 덧붙인다
  useEffect(() => {
    if (!log) return;
    const path = log.path;
    const out = () => {
      const text = logBuf.current;
      if (!text) return;
      logBuf.current = "";
      const n = text.split("\r\n").length - 1;
      o.appendText(path, text)
        .then(() => setLog((v) => (v && v.path === path ? { ...v, lines: v.lines + n } : v)))
        .catch((e) => {
          o.onError(String(e));
          setLog(null);
        });
    };
    const id = setInterval(out, 1000);
    return () => {
      clearInterval(id);
      out();
    };
    // 파일이 바뀔 때만 다시
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log?.path]);

  const toggleLog = useCallback(async () => {
    if (logRef.current) {
      setLog(null);
      return;
    }
    const st = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const path = await save({ title: alarmText(o.lang, "logTitle"), defaultPath: `${o.fileStem}-alarms-${st}.csv`, filters: [{ name: "CSV (Excel)", extensions: ["csv"] }] });
    if (!path) return;
    try {
      // 엑셀에서 한글이 깨지지 않게 BOM
      await o.writeText(path, "﻿" + ALARM_CSV_HEADER);
      logBuf.current = "";
      setLog({ path, lines: 0 });
    } catch (e) {
      o.onError(String(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.lang, o.fileStem]);

  const active = useMemo(() => activeKeys(entries), [entries]);
  return { rules, setRule, feed, has, entries, active, ack, ackAll, clearEnded, sound, setSound, log, toggleLog, running: o.running };
}
