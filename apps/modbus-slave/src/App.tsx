import { useCallback, useEffect, useRef, useState } from "react";
import { ask, open as openDialog, save } from "@tauri-apps/plugin-dialog";
import {
  api,
  EXCEPTIONS,
  hex,
  TABLES,
  type Faults,
  type Frame,
  type PortInfo,
  type SerialConfig,
  type SessionEvent,
  type Stats,
  type Table,
} from "./api";
import { tip } from "@shared/tips";
import { ReportButton } from "@shared/ReportDialog";
import { noteError } from "@shared/report";
import { HelpDialog, useHelpKey } from "@shared/HelpDialog";
import { help } from "./help";
import { samePorts } from "@shared/framing";
import { autoLogPath, formatTime, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { dict, type Key, type Lang } from "./i18n";
import "./App.css";

type Status = "idle" | "connected" | "disconnected" | "reconnecting" | "closed";
type Format = "u16" | "s16" | "hex" | "bin";
type Range = { start: number; count: number };

const BAUDS = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
const MAX_VIEW = 2000;

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장이 막힌 환경 — 무시 */
  }
}

function show(v: number, f: Format) {
  switch (f) {
    case "s16":
      return String(v > 0x7fff ? v - 0x10000 : v);
    case "hex":
      return v.toString(16).toUpperCase().padStart(4, "0");
    case "bin":
      return v.toString(2).padStart(16, "0").replace(/(.{4})(?!$)/g, "$1 ");
    default:
      return String(v);
  }
}

function parse(text: string, f: Format): number | null {
  const s = text.trim().replace(/\s+/g, "");
  if (!s) return null;
  let n: number;
  if (f === "hex" || /^0x/i.test(s)) n = parseInt(s.replace(/^0x/i, ""), 16);
  else if (f === "bin") n = parseInt(s, 2);
  else n = Number(s);
  if (!Number.isInteger(n)) return null;
  if (n < 0 && n >= -0x8000) n += 0x10000;
  return n >= 0 && n <= 0xffff ? n : null;
}

const key = (id: number, t: Table) => `${id}:${t}`;

export default function App() {
  const { settings, update, reset } = useSettings();
  const lang = settings.lang;
  const setLang = (l: Lang) => update({ lang: l });
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const openHelp = useCallback(() => setShowHelp(true), []);
  useHelpKey(openHelp);
  // 화면에 남길 줄 수 — 이벤트 콜백 안에서 최신 값을 쓰려고 ref
  const maxLines = useRef(settings.maxLines);
  maxLines.current = settings.maxLines;
  const t = useCallback((k: Key) => dict[lang][k], [lang]);

  // ---- 포트
  const [ports, setPorts] = useState<PortInfo[]>([]);
  useEffect(() => {
    let alive = true;
    const tick = () => api.listPorts().then((p) => alive && setPorts((o) => samePorts(o, p))).catch(() => {});
    tick();
    const id = setInterval(tick, 1500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  const [cfg, setCfg] = useState<SerialConfig>(() =>
    load("cfg", { port: "", baud: 9600, dataBits: 8, parity: "none", stopBits: 1, flow: "none", dtr: false, rts: false, autoReconnect: true }),
  );
  useEffect(() => {
    store("cfg", cfg);
  }, [cfg]);
  useEffect(() => {
    if (!cfg.port && ports.length) setCfg((c) => ({ ...c, port: ports[0].name }));
  }, [ports, cfg.port]);

  const [status, setStatus] = useState<Status>("idle");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 화면에 보인 오류는 «문제 보고» 에 넣을 수 있게 모아 둔다
  useEffect(() => {
    if (error) noteError(error);
  }, [error]);
  const [logPath, setLogPath] = useState<string | null>(null);

  // ---- 통신 기록
  const traffic = useRef<Frame[]>([]);
  const [tick, setTick] = useState(0);
  const onEvent = useCallback((e: SessionEvent) => {
    if (e.type === "frames") {
      traffic.current.push(...e.frames);
      if (traffic.current.length > maxLines.current) traffic.current.splice(0, traffic.current.length - maxLines.current);
      setTick((v) => v + 1);
    } else if (e.type === "status") {
      setStatus(e.state);
      if (e.state === "connected") setError(null);
      if (e.state === "closed") {
        setConnected(false);
        setLogPath(null);
      }
    } else if (e.type === "error") {
      setError(e.message);
    }
  }, []);
  // 기록 칸만 맨 아래로 — scrollIntoView 는 창 전체를 움직이고, 이 WebView 에선 Promise 를 돌려준다
  const tlogRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  useEffect(() => {
    const el = tlogRef.current;
    if (el && atBottom.current && settings.autoScroll) el.scrollTop = el.scrollHeight;
  }, [tick, settings.autoScroll]);

  // ---- 슬레이브·표 설정 (연결과 무관하게 살아 있다)
  const [ids, setIds] = useState<number[]>(() => load("ids", [1]));
  const [sel, setSel] = useState<number>(() => load("sel", 1));
  const [table, setTable] = useState<Table>(() => load("table", "holding-registers"));
  const [ranges, setRanges] = useState<Record<string, Range>>(() => load("ranges", {}));
  const [format, setFormat] = useState<Format>(() => load("format", "u16"));
  const [faults, setFaults] = useState<Faults>(() => load("faults", { delayMs: 0, noResponse: false, forceException: 0, badCrc: false }));
  const [newId, setNewId] = useState("");
  const range = ranges[key(sel, table)] ?? { start: 0, count: 100 };
  const bits = TABLES.find((x) => x.id === table)!.bits;

  useEffect(() => {
    store("ids", ids);
  }, [ids]);
  useEffect(() => {
    store("sel", sel);
  }, [sel]);
  useEffect(() => {
    store("table", table);
  }, [table]);
  useEffect(() => {
    store("ranges", ranges);
  }, [ranges]);
  useEffect(() => {
    store("format", format);
  }, [format]);
  useEffect(() => {
    store("faults", faults);
  }, [faults]);

  // 화면 설정 → 엔진. 처음 켤 때 저장해 둔 표 값도 되살린다.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      await api.setSlaveIds(ids);
      for (const id of ids)
        for (const tb of TABLES) {
          const r = ranges[key(id, tb.id)] ?? { start: 0, count: 100 };
          await api.setRange(id, tb.id, r.start, r.count);
          const saved = load<{ start: number; values: number[] } | number[] | null>(`values:${key(id, tb.id)}`, null);
          // 예전 판은 배열만 저장했다 — 그때는 시작 0 으로 본다
          const sv = Array.isArray(saved) ? { start: 0, values: saved } : saved;
          if (sv && Array.isArray(sv.values)) await api.setValues(id, tb.id, sv.start, sv.values.slice(0, 65536 - sv.start));
        }
      await api.setFaults(faults);
      setReady(true);
    })().catch((e) => setError(String(e)));
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (ready) api.setSlaveIds(ids).catch((e) => setError(String(e)));
  }, [ids, ready]);
  useEffect(() => {
    if (ready) api.setFaults(faults).catch((e) => setError(String(e)));
  }, [faults, ready]);
  useEffect(() => {
    if (ready) api.setRange(sel, table, range.start, range.count).catch((e) => setError(String(e)));
  }, [ready, sel, table, range.start, range.count]);

  // ---- 표 값: 0.3초마다 다시 읽고, 마스터가 바꾼 칸을 잠깐 표시한다
  const [values, setValues] = useState<number[]>([]);
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<Stats | null>(null);
  const prev = useRef<{ k: string; v: number[] }>({ k: "", v: [] });
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewCount = Math.min(range.count, MAX_VIEW);
  const refresh = useCallback(async () => {
    if (!ready || !ids.includes(sel)) return;
    const v = await api.getValues(sel, table, range.start, viewCount);
    const k = `${key(sel, table)}:${range.start}:${viewCount}`;
    if (prev.current.k === k) {
      const changed = new Set<number>();
      v.forEach((x, i) => x !== prev.current.v[i] && changed.add(i));
      if (changed.size) {
        setFlash(changed);
        // F18 강조 타이머는 하나만 — 연달아 쓰여도 앞 타이머가 새 강조를 지우지 않게
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(new Set()), 1200);
        store(`values:${key(sel, table)}`, { start: range.start, values: v });
      }
    }
    // F17 바뀐 게 없으면 다시 그리지 않는다(최대 2000칸)
    const same = prev.current.k === k && v.length === prev.current.v.length && v.every((x, i) => x === prev.current.v[i]);
    prev.current = { k, v };
    if (!same) setValues(v);
  }, [ready, ids, sel, table, range.start, viewCount]);
  useEffect(() => {
    refresh().catch(() => {});
    const id = setInterval(() => {
      refresh().catch(() => {});
      api
        .getStats()
        .then((s) => setStats((o) => (o && JSON.stringify(o) === JSON.stringify(s) ? o : s)))
        .catch(() => {});
    }, 300);
    return () => clearInterval(id);
  }, [refresh]);

  async function writeValue(i: number, v: number) {
    await api.setValues(sel, table, range.start + i, [v]);
    const next = values.slice();
    next[i] = v;
    prev.current.v = next;
    setValues(next);
    store(`values:${key(sel, table)}`, { start: range.start, values: next });
  }

  async function fill() {
    if (!(await ask(t("askFill"), { title: "PortDock Modbus Slave", kind: "warning" }))) return;
    const v = Array.from({ length: viewCount }, (_, i) => (bits ? i % 2 : i));
    await api.setValues(sel, table, range.start, v);
    store(`values:${key(sel, table)}`, { start: range.start, values: v });
    refresh();
  }

  async function exportTable() {
    const path = await save({ defaultPath: `modbus-slave-${sel}-${table}.json`, filters: [{ name: "JSON", extensions: ["json"] }] });
    if (!path) return;
    try {
      const all = await api.getValues(sel, table, range.start, range.count);
      const body = { app: "PortDock Modbus Slave", slave: sel, table, start: range.start, values: all };
      await api.writeText(path, JSON.stringify(body, null, 2));
    } catch (e) {
      setError(String(e));
    }
  }

  async function importTable() {
    const path = await openDialog({ filters: [{ name: "JSON", extensions: ["json"] }] });
    if (!path || Array.isArray(path)) return;
    try {
      const body = JSON.parse(await api.readText(path)) as { slave?: number; table?: Table; start: number; values: number[] };
      const ok =
        Number.isInteger(body.start) &&
        body.start >= 0 &&
        Array.isArray(body.values) &&
        body.start + body.values.length <= 65536 &&
        body.values.every((v) => Number.isInteger(v) && v >= 0 && v <= 0xffff);
      if (!ok) throw new Error(t("badTableFile"));
      if ((body.slave != null && body.slave !== sel) || (body.table != null && body.table !== table)) {
        const msg = t("importOther").replace("{a}", `${body.slave ?? "?"} / ${body.table ?? "?"}`).replace("{b}", `${sel} / ${table}`);
        if (!(await ask(msg, { title: "PortDock Modbus Slave", kind: "warning" }))) return;
      }
      await api.setValues(sel, table, body.start, body.values);
      refresh();
    } catch (e) {
      setError(String(e));
    }
  }

  // ---- 연결
  const [connecting, setConnecting] = useState(false);
  async function connect() {
    if (connecting) return;
    setConnecting(true);
    setError(null);
    try {
      await api.open(cfg, onEvent);
      setConnected(true);
      if (settings.autoLog && settings.logFolder) {
        const p = autoLogPath(settings.logFolder, "modbus-slave");
        await api.setLog(p).then(() => setLogPath(p)).catch((e) => setError(String(e)));
      }
      setStatus("connected");
    } catch (e) {
      setError(String(e));
    } finally {
      setConnecting(false);
    }
  }
  async function disconnect() {
    await api.close();
    setConnected(false);
    setStatus("closed");
    setLogPath(null);
  }
  useEffect(() => {
    if (!connected) return;
    const id = setTimeout(() => api.reconfigure(cfg).catch((e) => setError(String(e))), 300);
    return () => clearTimeout(id);
    // 포트 이름은 연결 중 바꾸지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, cfg.baud, cfg.dataBits, cfg.parity, cfg.stopBits]);

  async function toggleLog() {
    if (logPath) {
      try {
        await api.setLog(null);
      } catch (e) {
        setError(String(e));
      } finally {
        setLogPath(null);
      }
      return;
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const path = await save({ defaultPath: `modbus-slave-${stamp}.log`, filters: [{ name: "Log", extensions: ["log", "txt"] }] });
    if (!path) return;
    await api.setLog(path).then(() => setLogPath(path)).catch((e) => setError(String(e)));
  }

  function addId() {
    const n = Number(newId);
    if (!Number.isInteger(n) || n < 1 || n > 247 || ids.includes(n)) return;
    setIds([...ids, n].sort((a, b) => a - b));
    setSel(n);
    setNewId("");
  }

  const statusKey = `status_${status}` as Key;
  const frames = traffic.current.slice(-300);

  const fmt = (ts: number) => formatTime(ts, settings.timeFormat, traffic.current[0]?.ts ?? ts);
  useExitGuard(connected || !!logPath, settings.confirmExit, lang, "PortDock Modbus Slave");

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>Modbus Slave</small>
          </span>
          <span className="brand-tools">
          <select
            className="lang"
            value={lang}
            onChange={(e) => {
              setLang(e.target.value as Lang);
              store("lang", e.target.value);
            }}
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
          <ReportButton app="PortDock Modbus Slave" lang={lang} frames={() => traffic.current} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} />
          <button className="icon-btn" onClick={openHelp} title={t("helpTip")} aria-label={t("helpTip")}>
            ?
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title={lang === "ko" ? "설정" : "Settings"}>
            ⚙
          </button>
          </span>
        </div>

        <label data-tip={tip(lang, "port")}>
          {t("port")}
          <select value={cfg.port} disabled={connected} title={connected ? t("lockedHint") : ""} onChange={(e) => setCfg({ ...cfg, port: e.target.value })}>
            {ports.length === 0 && <option value="">{t("noPorts")}</option>}
            {ports.map((p) => (
              <option key={p.name} value={p.name}>
                {p.product ?? p.manufacturer ? `${p.name} — ${p.product ?? p.manufacturer}` : p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid2">
          <label data-tip={tip(lang, "baud")}>
            {t("baud")}
            <NumInput list="bauds" min={50} max={20000000} value={cfg.baud} commitOnBlur={connected} onValue={(n) => setCfg({ ...cfg, baud: n })} />
            <datalist id="bauds">
              {BAUDS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </label>
          <label data-tip={tip(lang, "dataBits")}>
            {t("dataBits")}
            <select value={cfg.dataBits} onChange={(e) => setCfg({ ...cfg, dataBits: Number(e.target.value) })}>
              <option>8</option>
              <option>7</option>
            </select>
          </label>
          <label data-tip={tip(lang, "parity")}>
            {t("parity")}
            <select value={cfg.parity} onChange={(e) => setCfg({ ...cfg, parity: e.target.value as SerialConfig["parity"] })}>
              <option value="none">{t("none")}</option>
              <option value="even">{t("even")}</option>
              <option value="odd">{t("odd")}</option>
            </select>
          </label>
          <label data-tip={tip(lang, "stopBits")}>
            {t("stopBits")}
            <select value={cfg.stopBits} onChange={(e) => setCfg({ ...cfg, stopBits: Number(e.target.value) })}>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </label>
        </div>
        <button data-tip={tip(lang, connected ? "disconnect" : "connect")} className={connected ? "btn danger" : "btn primary"} onClick={connected ? disconnect : connect} disabled={!cfg.port || connecting}>
          {connected ? t("disconnect") : t("connect")}
        </button>
        {connected && <span className="lock-note">🔒 {t("lockedHint")}</span>}
        <div className={`status s-${status}`}>{t(statusKey)}</div>

        <hr />
        <label data-tip={tip(lang, "slaves")}>{t("slaves")}</label>
        <div className="chips">
          {ids.map((id) => (
            <span key={id} className={id === sel ? "chip on" : "chip"}>
              <button className="chip-btn" onClick={() => setSel(id)} aria-pressed={id === sel} title={`ID ${id}`}>
                {id}
              </button>
              {ids.length > 1 && (
                <button
                  className="chip-x"
                  aria-label={`${t("delete")} ${id}`}
                  title={`${t("delete")} ${id}`}
                  onClick={async () => {
                    if (!(await ask(t("askDelSlave").replace("{a}", String(id)), { title: "PortDock Modbus Slave", kind: "warning" }))) return;
                    const rest = ids.filter((x) => x !== id);
                    setIds(rest);
                    if (sel === id) setSel(rest[0]);
                  }}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="row2">
          <input value={newId} placeholder="1~247" onChange={(e) => setNewId(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addId()} />
          <button data-tip={tip(lang, "addSlave")} className="btn small" onClick={addId}>
            {t("addSlave")}
          </button>
        </div>

        <hr />
        <label data-tip={tip(lang, "faults")}>{t("faults")}</label>
        <label data-tip={tip(lang, "delay")}>
          {t("delay")}
          <NumInput min={0} max={600000} value={faults.delayMs} onValue={(n) => setFaults({ ...faults, delayMs: n })} />
        </label>
        <label data-tip={tip(lang, "noResponse")} className="inline">
          <input type="checkbox" checked={faults.noResponse} onChange={(e) => setFaults({ ...faults, noResponse: e.target.checked })} /> {t("noResponse")}
        </label>
        <label data-tip={tip(lang, "badCrc")} className="inline">
          <input type="checkbox" checked={faults.badCrc} onChange={(e) => setFaults({ ...faults, badCrc: e.target.checked })} /> {t("badCrc")}
        </label>
        <label data-tip={tip(lang, "forceException")}>
          {t("forceException")}
          <select value={faults.forceException} onChange={(e) => setFaults({ ...faults, forceException: Number(e.target.value) })}>
            <option value={0}>{t("none")}</option>
            {EXCEPTIONS.map(([c, n, ko]) => (
              <option key={c} value={c}>
                {lang === "ko" ? `${ko} (${n.slice(3)})` : n}
              </option>
            ))}
          </select>
        </label>
        {(faults.delayMs > 0 || faults.noResponse || faults.badCrc || faults.forceException > 0) && <div className="hint warn">⚠ {t("faults")}</div>}
        {faults.delayMs >= 1000 && <div className="interlock">{t("ilDelay")}</div>}
        {faults.noResponse && faults.forceException > 0 && <div className="interlock">{t("ilNoRespWins")}</div>}

        <hr />
        <label data-tip={tip(lang, "stats")}>{t("stats")}</label>
        {stats && (
          <table className="stats">
            <tbody>
              <tr>
                <td>{t("requests")}</td>
                <td>{stats.requests}</td>
              </tr>
              <tr>
                <td>{t("ok")}</td>
                <td>{stats.ok}</td>
              </tr>
              <tr>
                <td>{t("exceptions")}</td>
                <td>{stats.exceptions}</td>
              </tr>
              <tr>
                <td>{t("ignored")}</td>
                <td>{stats.ignored}</td>
              </tr>
            </tbody>
          </table>
        )}
        <button data-tip={tip(lang, "reset")} className="btn small" onClick={() => api.resetStats()}>
          {t("reset")}
        </button>
      </aside>

      <main className="main">
        <div className="toolbar">
          {TABLES.map((tb) => (
            <button key={tb.id} className={table === tb.id ? "seg on" : "seg"} onClick={() => setTable(tb.id)} title={tb.fc}>
              {t(tb.id)} <small>{tb.fc.split(" ")[0]}</small>
            </button>
          ))}
          <span className="grow" />
          <span className="hint">ID {sel}</span>
        </div>
        <div className="toolbar">
          <label data-tip={tip(lang, "start")} className="inline">
            {t("start")}
            <NumInput
              className="num"
              min={0}
              max={65535}
              value={range.start}
              onValue={(n) => setRanges({ ...ranges, [key(sel, table)]: { start: n, count: Math.min(range.count, 65536 - n) } })}
            />
          </label>
          <label data-tip={tip(lang, "count")} className="inline">
            {t("count")}
            <NumInput
              className="num"
              min={1}
              max={65536 - range.start}
              value={range.count}
              onValue={(n) => setRanges({ ...ranges, [key(sel, table)]: { ...range, count: n } })}
            />
          </label>
          {!bits && (
            <label data-tip={tip(lang, "format")} className="inline">
              {t("format")}
              <select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
                <option value="u16">U16</option>
                <option value="s16">S16</option>
                <option value="hex">HEX</option>
                <option value="bin">BIN</option>
              </select>
            </label>
          )}
          <span className="hint">{t("rangeHint")}</span>
          <span className="grow" />
          <button className="btn small" onClick={fill} data-tip={tip(lang, "fill")}>
            {t("fill")}
          </button>
          <button data-tip={tip(lang, "exportTable")} className="btn small" onClick={exportTable}>
            {t("exportTable")}
          </button>
          <button data-tip={tip(lang, "importTable")} className="btn small" onClick={importTable}>
            {t("importTable")}
          </button>
        </div>

        <div className="regs">
          {values.map((v, i) => (
            <div key={`${table}:${range.start + i}`} className={flash.has(i) ? "reg flash" : "reg"} title={flash.has(i) ? t("writtenByMaster") : ""}>
              <span className="addr">{range.start + i}</span>
              {bits ? (
                <input type="checkbox" checked={v !== 0} onChange={(e) => writeValue(i, e.target.checked ? 1 : 0)} />
              ) : (
                <RegInput value={v} format={format} onCommit={(n) => writeValue(i, n)} />
              )}
            </div>
          ))}
        </div>

        <div className="traffic">
          <div className="toolbar">
            <b data-tip={tip(lang, "traffic")}>{t("traffic")}</b>
            <span className="grow" />
            <button data-tip={tip(lang, logPath ? "stopLog" : "logToFile")} className="btn small" onClick={toggleLog} disabled={!connected}>
              {logPath ? t("stopLog") : t("logToFile")}
            </button>
            <button data-tip={tip(lang, "clear")}
              className="btn small"
              onClick={() => {
                traffic.current = [];
                setTick((x) => x + 1);
              }}
            >
              {t("clear")}
            </button>
          </div>
          <div
            className="tlog"
            ref={tlogRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
            }}
          >
            {frames.map((f, i) => (
              <div key={i} className={`trow ${f.dir}`}>
                <span className="ts">{fmt(f.ts)}</span>
                <span className="dir">{f.dir === "rx" ? "RX ◀" : f.dir === "tx" ? "TX ▶" : "EV"}</span>
                <span className="data">{f.dir === "ev" ? f.note : hex(f.bytes)}</span>
                {f.check === false && <span className="badge fail">CRC</span>}
              </div>
            ))}
          </div>
          {error && <div className="error">{error}</div>}
        </div>
      </main>
      {showHelp && <HelpDialog doc={help} lang={lang} app="PortDock Modbus Slave" onClose={() => setShowHelp(false)} />}
      {showSettings && (
        <SettingsDialog
          app="PortDock Modbus Slave"
          version="0.1.0"
          settings={settings}
          update={update}
          reset={reset}
          onClose={() => setShowSettings(false)}
          writeText={api.writeText}
          readText={api.readText}
          busy={connected || !!logPath}
        />
      )}
    </div>
  );
}

/** 레지스터 칸 — 입력 중엔 화면 갱신이 덮어쓰지 않게, 엔터·포커스 잃을 때 반영 */
function RegInput({ value, format, onCommit }: { value: number; format: Format; onCommit: (n: number) => void }) {
  const [text, setText] = useState(show(value, format));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(show(value, format));
  }, [value, format, editing]);
  const commit = () => {
    setEditing(false);
    const n = parse(text, format);
    if (n == null) setText(show(value, format));
    else if (n !== value) onCommit(n);
  };
  return (
    <input
      className={parse(text, format) == null ? "regval bad" : "regval"}
      value={text}
      onFocus={() => setEditing(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}
