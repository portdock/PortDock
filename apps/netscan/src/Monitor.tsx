// 핑 감시 탭 — 정한 장비들을 정한 간격으로 핑하고 잃음·응답 시간·끊김을 센다. 탭을 바꿔도 계속 돈다(상태는 App 이 든다).
import { useCallback, useEffect, useRef, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow, UserAttentionType } from "@tauri-apps/api/window";
import { load, loadInt, store } from "@shared/framing";
import { autoLogPath, formatTime, type Settings } from "@shared/settings";
import { NumInput } from "@shared/NumInput";
import { tip } from "@shared/tips";
import { noteError } from "@shared/report";
import type { ToastApi } from "@shared/Toast";
import { api, type MonitorEvent } from "./api";
import { dict, fill, type Key, type Lang } from "./i18n";
import { stamp } from "./net";

export const MAX_MON = 64;

export interface MonStat {
  host: string;
  ip: string | null;
  sent: number;
  lost: number;
  /** 마지막 응답 시간 — null 이면 시간 초과, undefined 면 아직 없음 */
  last: number | null | undefined;
  state: "wait" | "up" | "down";
  min: number | null;
  max: number | null;
  sum: number;
  ok: number;
  downs: number;
  downSince: number | null;
  lastDown: number | null;
}

export interface MonEvent {
  ts: number;
  host: string;
  kind: "down" | "up";
  /** 다시 응답했을 때 끊겨 있던 시간(ms) */
  dur?: number;
}

const blank = (host: string): MonStat => ({ host, ip: null, sent: 0, lost: 0, last: undefined, state: "wait", min: null, max: null, sum: 0, ok: 0, downs: 0, downSince: null, lastDown: null });

/** «12초», «3분 4초», «1시간 2분» */
export function duration(ms: number, lang: Lang) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (lang === "ko") return h ? `${h}시간 ${m}분` : m ? `${m}분 ${r}초` : `${r}초`;
  return h ? `${h} h ${m} min` : m ? `${m} min ${r} s` : `${r} s`;
}

export function useMonitor(lang: Lang, settings: Settings, toast: ToastApi) {
  const t = useCallback((k: Key, v?: Record<string, string | number>) => fill(dict[lang][k], v), [lang]);
  const [hosts, setHosts] = useState<string[]>(() => load("monHosts", []));
  useEffect(() => store("monHosts", hosts), [hosts]);
  const [intervalS, setIntervalS] = useState<number>(() => loadInt("monInterval", 1, 3600, 5));
  useEffect(() => store("monInterval", intervalS), [intervalS]);
  const [timeoutMs, setTimeoutMs] = useState<number>(() => loadInt("monTimeout", 100, 10_000, 1000));
  useEffect(() => store("monTimeout", timeoutMs), [timeoutMs]);
  const [attention, setAttention] = useState<boolean>(() => load("monAttention", true));
  useEffect(() => store("monAttention", attention), [attention]);
  const attentionRef = useRef(attention);
  attentionRef.current = attention;

  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logPath, setLogPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (error) noteError(error);
  }, [error]);
  const stats = useRef(new Map<string, MonStat>());
  const [events, setEvents] = useState<MonEvent[]>([]);
  const [version, setVersion] = useState(0);
  const langRef = useRef(lang);
  langRef.current = lang;

  const statOf = (h: string) => {
    let s = stats.current.get(h);
    if (!s) stats.current.set(h, (s = blank(h)));
    return s;
  };

  const onEvent = useCallback((e: MonitorEvent) => {
    if (e.type === "error") {
      setError(e.message);
      setLogPath(null);
      return;
    }
    const evs: MonEvent[] = [];
    let dropped = false;
    for (const smp of e.samples) {
      const s = statOf(smp.host);
      s.sent++;
      s.last = smp.rtt;
      if (smp.rtt != null) {
        s.ok++;
        s.sum += smp.rtt;
        s.min = s.min == null ? smp.rtt : Math.min(s.min, smp.rtt);
        s.max = s.max == null ? smp.rtt : Math.max(s.max, smp.rtt);
        if (s.state === "down") evs.push({ ts: e.ts, host: s.host, kind: "up", dur: s.downSince != null ? e.ts - s.downSince : undefined });
        s.state = "up";
        s.downSince = null;
      } else {
        s.lost++;
        if (s.state !== "down") {
          s.downs++;
          s.downSince = e.ts;
          s.lastDown = e.ts;
          evs.push({ ts: e.ts, host: s.host, kind: "down" });
          dropped = true;
        }
        s.state = "down";
      }
    }
    if (evs.length) setEvents((list) => [...evs.reverse(), ...list].slice(0, 500));
    if (dropped && attentionRef.current) {
      try {
        getCurrentWindow()
          .requestUserAttention(UserAttentionType.Critical)
          .catch(() => {});
      } catch {
        /* 창 API 없음(미리보기) */
      }
    }
    setVersion((v) => v + 1);
  }, []);

  function add(text: string) {
    const h = text.trim();
    if (!h) return false;
    if (hosts.includes(h)) {
      toast.show(t("monDup"), { error: true });
      return false;
    }
    if (hosts.length >= MAX_MON) {
      toast.show(t("monMax", { n: MAX_MON }), { error: true });
      return false;
    }
    setHosts((l) => [...l, h]);
    return true;
  }
  function remove(h: string) {
    const i = hosts.indexOf(h);
    setHosts((l) => l.filter((x) => x !== h));
    stats.current.delete(h);
    toast.show(`${h} — ${t("monRemove")}`, { undo: () => setHosts((l) => (l.includes(h) ? l : [...l.slice(0, i), h, ...l.slice(i)])) });
  }
  function reset() {
    stats.current.clear();
    setEvents([]);
    setVersion((v) => v + 1);
  }

  async function start() {
    if (busy || running || !hosts.length) return;
    setBusy(true);
    setError(null);
    reset();
    const auto = settings.autoLog && settings.logFolder ? autoLogPath(settings.logFolder, "netscan-ping", "csv") : null;
    try {
      const targets = await api.monitorStart({ hosts, intervalMs: Math.round(intervalS * 1000), timeoutMs }, auto, onEvent);
      for (const tg of targets) statOf(tg.host).ip = tg.ip;
      setRunning(true);
      setLogPath(auto);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function stop() {
    await api.monitorStop().catch(() => {});
    setRunning(false);
    setLogPath(null);
  }
  async function toggleLog() {
    if (logPath) {
      await api.monitorSetLog(null).catch((e) => setError(String(e)));
      setLogPath(null);
      return;
    }
    const path = await save({ defaultPath: `portdock-netscan-ping-${stamp()}.csv`, filters: [{ name: "CSV", extensions: ["csv"] }] });
    if (!path) return;
    await api
      .monitorSetLog(path)
      .then(() => setLogPath(path))
      .catch((e) => setError(String(e)));
  }

  const downCount = hosts.filter((h) => stats.current.get(h)?.state === "down").length;
  return { hosts, add, remove, reset, intervalS, setIntervalS, timeoutMs, setTimeoutMs, attention, setAttention, running, busy, start, stop, logPath, toggleLog, error, setError, stats: stats.current, events, version, downCount };
}

export type MonitorApi = ReturnType<typeof useMonitor>;

export function MonitorView({ lang, mon, settings }: { lang: Lang; mon: MonitorApi; settings: Settings }) {
  const t = (k: Key, v?: Record<string, string | number>) => fill(dict[lang][k], v);
  const [draft, setDraft] = useState("");
  const fmt = (ts: number) => formatTime(ts, settings.timeFormat === "elapsed" ? "local" : settings.timeFormat, ts);
  const ms = (n: number | null | undefined) => (n == null ? "—" : n < 1 ? t("under1") : String(n));
  const addDraft = () => {
    if (mon.add(draft)) setDraft("");
  };
  return (
    <div className="monitor">
      <div className="toolbar">
        <input
          className="mon-host"
          value={draft}
          placeholder="192.168.0.10"
          aria-label={t("monHost")}
          data-tip={tip(lang, "nsMonHost")}
          disabled={mon.running}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && addDraft()}
        />
        <button className="btn small" onClick={addDraft} disabled={mon.running || !draft.trim()} data-tip={tip(lang, "nsMonAdd")}>
          + {t("monAdd")}
        </button>
        <span className="sep" />
        <label className="inline" data-tip={tip(lang, "nsMonInterval")}>
          {t("monInterval")}
          <NumInput className="num" min={1} max={3600} value={mon.intervalS} disabled={mon.running} onValue={mon.setIntervalS} aria-label={t("monInterval")} />
        </label>
        <label className="inline" data-tip={tip(lang, "nsMonTimeout")}>
          {t("monTimeout")}
          <NumInput className="num" min={100} max={10000} value={mon.timeoutMs} disabled={mon.running} onValue={mon.setTimeoutMs} aria-label={t("monTimeout")} />
        </label>
        <label className="inline" data-tip={tip(lang, "nsMonAttention")}>
          <input type="checkbox" checked={mon.attention} onChange={(e) => mon.setAttention(e.target.checked)} /> {t("monAttention")}
        </label>
        <span className="grow" />
        <button className="btn small" onClick={mon.toggleLog} disabled={!mon.running} data-tip={tip(lang, mon.logPath ? "stopLog" : "nsMonLog")}>
          {mon.logPath ? t("monLogStop") : t("monLog")}
        </button>
        <button className="btn small" onClick={mon.reset} disabled={!mon.stats.size} data-tip={tip(lang, "nsMonReset")}>
          {t("monReset")}
        </button>
        <button className={mon.running ? "btn small danger" : "btn small primary"} onClick={mon.running ? mon.stop : mon.start} disabled={mon.busy || (!mon.running && !mon.hosts.length)} data-tip={tip(lang, "nsMonStart")}>
          {mon.running ? t("monStop") : t("monStart")}
        </button>
      </div>
      {mon.logPath && (
        <div className="statusbar">
          <span className="rec">● REC</span>
          <span className="mono ellipsis" title={mon.logPath}>
            {mon.logPath}
          </span>
        </div>
      )}
      {mon.error && <div className="error pad">{mon.error}</div>}
      <div className="table-wrap">
        {mon.hosts.length === 0 ? (
          <div className="empty-guide">{t("monEmpty")}</div>
        ) : (
          <table className="grid mon-grid">
            <thead>
              <tr>
                <th>{t("colState")}</th>
                <th>{t("monHost").split(" (")[0]}</th>
                <th>{t("colLast")}</th>
                <th>{t("colSent")}</th>
                <th>{t("colLost")}</th>
                <th>{t("colMinAvgMax")}</th>
                <th>{t("colDowns")}</th>
                <th>{t("colLastDown")}</th>
                <th aria-label={t("monRemove")} />
              </tr>
            </thead>
            <tbody>
              {mon.hosts.map((h) => {
                const s = mon.stats.get(h);
                const state = !mon.running && !s?.sent ? "wait" : (s?.state ?? "wait");
                const lossPct = s && s.sent ? ((s.lost / s.sent) * 100).toFixed(s.lost && s.lost < s.sent ? 1 : 0) : null;
                return (
                  <tr key={h} className={state === "down" ? "down" : undefined}>
                    <td>
                      <span className={`dot ${state === "up" ? "s-connected" : state === "down" ? "s-disconnected" : ""}`} /> {state === "up" ? t("up") : state === "down" ? t("down") : t("waiting")}
                    </td>
                    <td className="mono">
                      {h}
                      {s?.ip && s.ip !== h ? <span className="muted"> ({s.ip})</span> : null}
                    </td>
                    <td className="mono num-cell">{s?.last === undefined ? "—" : s.last === null ? t("timeoutWord") : `${ms(s.last)} ${t("ms")}`}</td>
                    <td className="mono num-cell">{s?.sent ?? 0}</td>
                    <td className={`mono num-cell${s?.lost ? " bad-text" : ""}`}>
                      {s?.lost ?? 0}
                      {lossPct != null ? ` (${lossPct}%)` : ""}
                    </td>
                    <td className="mono num-cell">{s && s.ok ? `${ms(s.min)} / ${ms(Math.round(s.sum / s.ok))} / ${ms(s.max)}` : "—"}</td>
                    <td className="mono num-cell">{s?.downs ?? 0}</td>
                    <td className="mono">
                      {s?.lastDown ? fmt(s.lastDown) : "—"}
                      {s?.state === "down" && s.downSince != null ? <span className="bad-text"> · {duration(Date.now() - s.downSince, lang)}</span> : null}
                    </td>
                    <td>
                      <button className="btn small ghost" onClick={() => mon.remove(h)} disabled={mon.running} aria-label={`${t("monRemove")} ${h}`} data-tip={tip(lang, "nsMonRemove")}>
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="mon-events">
        <h3 data-tip={tip(lang, "nsMonEvents")}>{t("events")}</h3>
        {mon.events.length === 0 ? (
          <div className="hint">{t("noEvents")}</div>
        ) : (
          <ul>
            {mon.events.map((e, i) => (
              <li key={`${e.ts}-${e.host}-${i}`} className={e.kind}>
                <span className="mono">{fmt(e.ts)}</span> {e.kind === "down" ? t("evDown", { h: e.host }) : t("evUp", { h: e.host, d: e.dur != null ? duration(e.dur, lang) : "?" })}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
