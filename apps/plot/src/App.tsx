import { useCallback, useEffect, useMemo, useRef, useState, type InputHTMLAttributes } from "react";
import { VERSION } from "@shared/version";
import { save } from "@tauri-apps/plugin-dialog";
import { api, type PlotEvent, type PortInfo, type RawLine, type SerialConfig, type Source, type Transport } from "./api";
import { channelColor, channelName, clock, CK_SIZE, csvOf, fmtNum, frameLen, MAX_CHANNELS, NUM_SIZE, parseHex, Ring, stats, type CkKind, type Format, type NumKind, type Sep, type XMode } from "./model";
import { Plot, type ChannelView, type PlotHandle, type YAxis } from "./Plot";
import { tip } from "@shared/tips";
import { help } from "./help";
import { dict, fill, type Key, type Lang } from "./i18n";
import { ReportButton } from "@shared/ReportDialog";
import { noteError } from "@shared/report";
import { HelpDialog, useHelpKey } from "@shared/HelpDialog";
import { load, samePorts, store } from "@shared/framing";
import { useFold, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { useToast } from "@shared/Toast";
import { KEYS, overlayOpen, typingTarget, useShortcuts, withKey } from "@shared/shortcuts";
import { useWindowTitle, windowTitle } from "@shared/useWindowTitle";
import { PinButton } from "@shared/PinButton";
import { NarrowBar, SideBackdrop, SideClose } from "@shared/NarrowBar";
import { FirstCard } from "@shared/FirstCard";
import { Splitter, useStoredHeight } from "@shared/Splitter";
import { ui } from "@shared/uiText";
import { RecentButton, RecentHosts, useRecent } from "@shared/RecentPicker";
import { joinHostPort, splitHostPort } from "@shared/recent";
import { PortPicker } from "@shared/PortPicker";
import { portUsable } from "@shared/portPick";
import "./App.css";

const APP = "PortDock Plot";
type Status = "idle" | "connected" | "listening" | "disconnected" | "reconnecting" | "closed";
const BAUDS = [9600, 19200, 38400, 57600, 115200, 230400, 250000, 460800, 500000, 921600, 1000000, 2000000];
/** 원시 보기에 남길 줄 수 */
const RAW_KEEP = 300;
const NUMS: NumKind[] = ["u8", "i8", "u16", "i16", "u32", "i32", "f32", "f64"];
const CKS: [CkKind, string][] = [
  ["sum8", "SUM8"],
  ["bcc", "XOR (BCC)"],
  ["crc8", "CRC8"],
  ["crc16-modbus", "CRC16 Modbus"],
  ["crc16-ccitt", "CRC16 CCITT"],
  ["crc16-xmodem", "CRC16 XMODEM"],
  ["lrc", "LRC"],
  ["sum16", "SUM16"],
  ["crc32", "CRC32"],
];

/** 화면의 해석 설정(시작 바이트는 글로 들고 있다가 보낼 때 바꾼다) */
interface FmtUi {
  kind: "text" | "binary";
  sep: Sep;
  header: "auto" | "off";
  syncText: string;
  channels: number;
  num: NumKind;
  little: boolean;
  checksum: CkKind | null;
  checkSync: boolean;
}
const FMT0: FmtUi = { kind: "text", sep: "auto", header: "auto", syncText: "AA 55", channels: 2, num: "i16", little: true, checksum: null, checkSync: false };

interface ViewCfg {
  mode: XMode;
  points: number;
  seconds: number;
}
/** 채널마다 사용자가 바꾼 것 */
interface ChCfg {
  name?: string;
  color?: string;
  show?: boolean;
  axis?: "L" | "R";
}

function cleanFmt(v: Partial<FmtUi>): FmtUi {
  const f = { ...FMT0, ...v };
  if (f.kind !== "binary") f.kind = "text";
  if (!["auto", "comma", "space", "tab", "semicolon"].includes(f.sep)) f.sep = "auto";
  if (f.header !== "off") f.header = "auto";
  if (!NUMS.includes(f.num)) f.num = "i16";
  if (!(Number.isInteger(f.channels) && f.channels >= 1 && f.channels <= MAX_CHANNELS)) f.channels = 2;
  if (f.checksum !== null && !CKS.some(([k]) => k === f.checksum)) f.checksum = null;
  f.little = f.little !== false;
  f.checkSync = f.checkSync === true;
  if (typeof f.syncText !== "string") f.syncText = "";
  return f;
}

/** 화면 설정 → 백엔드 Format(시작 바이트가 틀리면 null) */
function toFormat(f: FmtUi): Format | null {
  if (f.kind === "text") return { kind: "text", sep: f.sep, header: f.header };
  const s = parseHex(f.syncText);
  if (s.error || s.bytes.length > 8) return null;
  return { kind: "binary", sync: s.bytes, channels: f.channels, num: f.num, little: f.little, checksum: f.checksum, checkSync: f.checkSync };
}

function cleanY(v: Partial<YAxis> | null): YAxis {
  const y = { auto: true, min: 0, max: 100, ...(v ?? {}) };
  return { auto: y.auto !== false, min: Number.isFinite(y.min) ? y.min : 0, max: Number.isFinite(y.max) ? y.max : 100 };
}

function pickPort(ports: PortInfo[], id: { vid: number | null; pid: number | null; serial: string | null } | null) {
  const same =
    id &&
    ((id.serial && ports.find((p) => p.serial_number === id.serial && p.vid === id.vid && p.pid === id.pid)) ||
      (id.vid != null && ports.find((p) => p.vid === id.vid && p.pid === id.pid)));
  return (same || ports[0]).name;
}

/** 소수도 받는 숫자 칸 — Enter·칸 벗어날 때 반영, 틀리면 되돌림 */
function FloatInput({ value, onValue, ...rest }: { value: number; onValue: (n: number) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Number(text.trim().replace(",", "."));
    if (text.trim() && Number.isFinite(n)) onValue(n);
    else setText(String(value));
  };
  return (
    <input
      {...rest}
      inputMode="decimal"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
    />
  );
}

const isDark = (theme: string) => theme === "dark" || (theme !== "light" && typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches);
const fileStamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const baseName = (p: string) => p.split(/[\\/]/).pop() ?? p;

export default function App() {
  const { settings, update, reset } = useSettings();
  const lang = settings.lang;
  const T = dict[lang];
  const t = useCallback((k: Key) => dict[lang][k], [lang]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState<boolean | string>(false);
  const openHelp = useCallback(() => setShowHelp(true), []);
  useHelpKey(openHelp);
  const [showSide, setShowSide] = useState(false);
  const toast = useToast(lang);
  const langRef = useRef(lang);
  langRef.current = lang;

  // ---- 테마(채널 기본 색이 테마마다 다르다)
  const [sysDark, setSysDark] = useState(() => isDark("system"));
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const m = matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSysDark(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  const dark = settings.theme === "dark" || (settings.theme === "system" && sysDark);

  // ---- 받는 곳
  const [transport, setTransport] = useState<Transport>(() => {
    const v = load<Transport>("transport", "serial");
    return v === "tcp" || v === "udp" ? v : "serial";
  });
  const [cfg, setCfg] = useState<SerialConfig>(() => ({ port: "", baud: 115200, dataBits: 8, parity: "none", stopBits: 1, flow: "none", dtr: true, autoReconnect: true, ...load<Partial<SerialConfig>>("cfg", {}) }));
  const [tcp, setTcp] = useState(() => ({ host: "192.168.0.10", port: 5000, ...load<Partial<{ host: string; port: number }>>("tcp", {}) }));
  const [udp, setUdp] = useState(() => ({ host: "0.0.0.0", port: 5005, group: "", ...load<Partial<{ host: string; port: number; group: string }>>("udp", {}) }));
  const [advSaved, setAdvSaved] = useState<boolean>(() => load<boolean>("advOpen", false) === true);
  const [advOpen, setAdvOpen] = useFold(advSaved || !cfg.dtr || !cfg.autoReconnect, setAdvSaved, settings.expandAll);
  useEffect(() => store("transport", transport), [transport]);
  useEffect(() => store("cfg", cfg), [cfg]);
  useEffect(() => store("tcp", tcp), [tcp]);
  useEffect(() => store("udp", udp), [udp]);
  useEffect(() => store("advOpen", advSaved), [advSaved]);

  // ---- 해석
  const [fmt, setFmt] = useState<FmtUi>(() => cleanFmt(load<Partial<FmtUi>>("format", {})));
  useEffect(() => store("format", fmt), [fmt]);
  const format = useMemo(() => toFormat(fmt), [fmt]);
  const syncErr = fmt.kind === "binary" ? parseHex(fmt.syncText).error : null;

  // ---- 보기
  const [view, setView] = useState<ViewCfg>(() => {
    const v = load<Partial<ViewCfg>>("view", {});
    return { mode: v.mode === "time" ? "time" : "points", points: Number.isInteger(v.points) && v.points! >= 10 ? v.points! : 1000, seconds: Number.isInteger(v.seconds) && v.seconds! >= 1 ? v.seconds! : 10 };
  });
  useEffect(() => store("view", view), [view]);
  const [yL, setYL] = useState<YAxis>(() => cleanY(load<Partial<YAxis> | null>("yL", null)));
  const [yR, setYR] = useState<YAxis>(() => cleanY(load<Partial<YAxis> | null>("yR", null)));
  useEffect(() => store("yL", yL), [yL]);
  useEffect(() => store("yR", yR), [yR]);
  const [chCfg, setChCfg] = useState<ChCfg[]>(() => {
    const v = load<unknown>("channels", []);
    return Array.isArray(v) ? (v.slice(0, MAX_CHANNELS).map((c) => (c && typeof c === "object" ? c : {})) as ChCfg[]) : [];
  });
  useEffect(() => store("channels", chCfg), [chCfg]);
  const setCh = (i: number, patch: Partial<ChCfg>) =>
    setChCfg((old) => {
      const next = old.slice();
      while (next.length <= i) next.push({});
      next[i] = { ...next[i], ...patch };
      return next;
    });
  const [tab, setTab] = useState<"channels" | "raw">(() => (load<string>("tab", "channels") === "raw" ? "raw" : "channels"));
  useEffect(() => store("tab", tab), [tab]);
  const [lowerH, setLowerH] = useStoredHeight("lowerH");

  // ---- 포트 목록(시리얼일 때만)
  const [ports, setPorts] = useState<PortInfo[]>([]);
  useEffect(() => {
    if (transport !== "serial") return;
    let alive = true;
    const tick = () =>
      api
        .listPorts()
        .then((p) => alive && setPorts((o) => samePorts(o, p)))
        .catch(() => {});
    tick();
    const id = setInterval(tick, 1500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [transport]);

  // ---- 받기 상태
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  runningRef.current = running;
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [startErr, setStartErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (error) noteError(error);
  }, [error]);
  useEffect(() => {
    if (running || !ports.length || portUsable(ports, cfg.port)) return;
    setCfg((c) => ({ ...c, port: pickPort(ports, load("portId", null)) }));
  }, [ports, cfg.port, running]);

  // ---- 값·원시 줄
  const ring = useRef(new Ring()).current;
  const plotApi = useRef<PlotHandle | null>(null);
  const [origin, setOrigin] = useState(0);
  const originRef = useRef(0);
  const [deviceNames, setDeviceNames] = useState<string[]>([]);
  const raw = useRef<RawLine[]>([]);
  const counts = useRef({ rows: 0, bad: 0, bytes: 0, dropped: 0 });
  const rate = useRef({ at: performance.now(), rows: 0, value: 0 });
  const [recPath, setRecPath] = useState<string | null>(null);
  const [recRows, setRecRows] = useState(0);
  const [frozen, setFrozen] = useState(false);
  const frozenAt = useRef(0);
  /** 표·받은 양 다시 그리기(받는 중 0.25초마다) */
  const [tick, setTick] = useState(0);
  const dirty = useRef(false);

  const addRaw = useCallback((lines: RawLine[]) => {
    if (!lines.length) return;
    raw.current.push(...lines);
    if (raw.current.length > RAW_KEEP) raw.current.splice(0, raw.current.length - RAW_KEEP);
    dirty.current = true;
  }, []);
  const evLine = useCallback((text: string, ok = true): RawLine => ({ ts: Date.now(), text, ok, ev: true }), []);

  const stopRef = useRef<() => Promise<void>>(async () => {});
  const onEvent = useCallback(
    (e: PlotEvent) => {
      switch (e.type) {
        case "data": {
          for (let i = 0; i < e.rows.length; i++) ring.push(e.t[i], e.rows[i]);
          if (e.rows.length && !originRef.current) {
            originRef.current = e.t[0];
            setOrigin(e.t[0]);
          }
          const c = counts.current;
          c.rows += e.rows.length;
          c.bad += e.bad;
          c.bytes += e.bytes;
          c.dropped += e.dropped;
          rate.current.rows += e.rows.length;
          if (e.names) setDeviceNames(e.names);
          addRaw(e.raw);
          if (e.recRows != null) setRecRows(e.recRows);
          dirty.current = true;
          if (e.rows.length) plotApi.current?.bump();
          break;
        }
        case "status":
          setStatus(e.state);
          setStatusMsg(e.message);
          // 세션이 스스로 닫힘(자동 재연결 끔 + 끊김 등) — 정리
          if (e.state === "closed" && runningRef.current) void stopRef.current();
          break;
        case "error":
          setError(e.message);
          break;
        case "recordStopped":
          setRecPath(null);
          setError(e.message);
          break;
      }
    },
    [ring, addRaw],
  );

  // 표·받은 양·초당 줄 — 0.25초마다(값이 바뀌었을 때만)
  useEffect(() => {
    const id = setInterval(() => {
      const r = rate.current;
      const now = performance.now();
      if (now - r.at >= 1000) {
        r.value = (r.rows * 1000) / (now - r.at);
        r.rows = 0;
        r.at = now;
        dirty.current = true;
      }
      if (dirty.current) {
        dirty.current = false;
        setTick((x) => x + 1);
      }
    }, 250);
    return () => clearInterval(id);
  }, []);

  // ---- 시작·멈춤
  const where = transport === "serial" ? `${cfg.port} ${cfg.baud}` : transport === "tcp" ? `TCP ${tcp.host.trim()}:${tcp.port}` : `UDP :${udp.port}`;
  const startable = !!format && (transport === "serial" ? portUsable(ports, cfg.port) : transport === "tcp" ? !!tcp.host.trim() && tcp.port > 0 : udp.port >= 0);
  // 최근 연결 기록(0.3.0) — 받기 시작에 성공했을 때만 기억
  const recentTcp = useRecent("tcp");
  const recentUdp = useRecent("udp");
  async function start() {
    if (starting || runningRef.current || !format) return;
    setStarting(true);
    setStartErr(null);
    setError(null);
    setStatusMsg(null);
    const source: Source =
      transport === "serial" ? { kind: "serial", config: cfg } : transport === "tcp" ? { kind: "tcp", host: tcp.host.trim(), port: tcp.port } : { kind: "udp", host: udp.host.trim() || "0.0.0.0", port: udp.port, group: udp.group.trim() };
    try {
      const desc = await api.start(source, format, onEvent);
      runningRef.current = true;
      setRunning(true);
      setStatus((s) => (s === "idle" || s === "closed" ? (transport === "udp" ? "listening" : "connected") : s));
      addRaw([evLine(fill(dict[langRef.current].evStart, { a: desc }))]);
      if (transport === "serial") {
        const p = ports.find((x) => x.name === cfg.port);
        if (p) store("portId", { vid: p.vid, pid: p.pid, serial: p.serial_number });
      } else if (transport === "tcp") recentTcp.remember(joinHostPort(tcp.host.trim(), tcp.port));
      else recentUdp.remember(joinHostPort(udp.host.trim() || "0.0.0.0", udp.port));
    } catch (e) {
      setStartErr(String(e));
      noteError(String(e));
    } finally {
      setStarting(false);
    }
  }
  const stop = useCallback(async () => {
    runningRef.current = false;
    setRunning(false);
    setRecPath(null);
    await api.stop().catch(() => {});
    setStatus("closed");
    addRaw([evLine(dict[langRef.current].evStop)]);
    dirty.current = true;
  }, [addRaw, evLine]);
  stopRef.current = stop;

  // 받는 중 해석 바꾸기(틀린 시작 바이트면 보내지 않음)
  const fmtKey = JSON.stringify(format);
  useEffect(() => {
    if (!runningRef.current || !format) return;
    const id = setTimeout(() => api.setFormat(format).catch((e) => setError(String(e))), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fmtKey]);

  // ---- 채널 보기
  const nCh = Math.max(ring.channels, deviceNames.length);
  const channels: ChannelView[] = Array.from({ length: nCh }, (_, i) => {
    const c = chCfg[i] ?? {};
    return { name: channelName(i, c.name, deviceNames[i]), color: c.color || channelColor(i, dark), show: c.show !== false, axis: c.axis === "R" ? "R" : "L" };
  });
  const names = channels.map((c) => c.name);
  const anyRight = channels.some((c) => c.axis === "R");
  const span = view.mode === "time" ? view.seconds * 1000 : view.points;

  // ---- 기록·저장
  async function toggleRecord() {
    if (recPath) {
      await api.record(null, []).catch(() => {});
      setRecPath(null);
      return;
    }
    if (!runningRef.current) return toast.show(T.needRun, { error: true });
    const path = await save({ title: T.csvDlgTitle, defaultPath: `plot-${fileStamp()}.csv`, filters: [{ name: "CSV (Excel)", extensions: ["csv"] }] }).catch(() => null);
    if (!path) return;
    try {
      await api.record(path, names);
      setRecRows(0);
      setRecPath(path);
    } catch (e) {
      setError(String(e));
    }
  }
  async function saveCsv() {
    const [lo, hi] = plotApi.current?.range() ?? [0, 0];
    if (hi <= lo) return toast.show(T.nothingToSave, { error: true });
    const path = await save({ defaultPath: `plot-view-${fileStamp()}.csv`, filters: [{ name: "CSV (Excel)", extensions: ["csv"] }] }).catch(() => null);
    if (!path) return;
    await api
      .writeText(path, csvOf(ring, lo, hi, names))
      .then(() => toast.show(fill(T.saved, { a: baseName(path) })))
      .catch((e) => setError(String(e)));
  }
  async function savePng() {
    const path = await save({ defaultPath: `plot-${fileStamp()}.png`, filters: [{ name: "PNG", extensions: ["png"] }] }).catch(() => null);
    if (!path) return;
    const bytes = await plotApi.current?.png();
    if (!bytes) return setError("PNG");
    await api
      .writeBytes(path, Array.from(bytes))
      .then(() => toast.show(fill(T.saved, { a: baseName(path) })))
      .catch((e) => setError(String(e)));
  }
  const clearAll = useCallback(() => {
    ring.clear();
    raw.current = [];
    counts.current = { rows: 0, bad: 0, bytes: 0, dropped: 0 };
    originRef.current = 0;
    setOrigin(0);
    plotApi.current?.clearMarks();
    plotApi.current?.reset();
    dirty.current = true;
    plotApi.current?.bump();
  }, [ring]);
  const togglePause = useCallback(() => {
    setFrozen((f) => {
      if (!f) frozenAt.current = counts.current.rows;
      return !f;
    });
  }, []);
  const onFreeze = useCallback((on: boolean) => {
    if (on) frozenAt.current = counts.current.rows;
    setFrozen(on);
  }, []);
  const live = useCallback(() => plotApi.current?.reset(), []);

  // ---- 첫 실행
  const [firstDone, setFirstDone] = useState<boolean>(() => load<boolean>("firstHintDone", false) === true);
  useEffect(() => store("firstHintDone", firstDone), [firstDone]);

  // ---- 단축키: F4 시작·멈춤, Space 멈춤, End 실시간, Esc 측정점, Ctrl+S 화면 CSV, Ctrl+Shift+L 기록, Ctrl+L 지우기
  const runDisabled = starting || (!running && !startable);
  useShortcuts([
    { key: "F4", run: () => !runDisabled && void (running ? stop() : start()) },
    { key: "l", ctrl: true, run: clearAll },
    { key: "l", ctrl: true, shift: true, run: () => void toggleRecord() },
    { key: "s", ctrl: true, run: () => void saveCsv() },
    { key: "End", inInput: false, run: live },
    { key: "Escape", inInput: false, run: () => plotApi.current?.clearMarks() },
  ]);
  // Space 는 버튼·고르기·입력칸에서는 그 칸의 동작이므로 따로 본다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " || e.ctrlKey || e.altKey || e.metaKey || e.isComposing || overlayOpen() || typingTarget()) return;
      const a = document.activeElement;
      if (a && (a instanceof HTMLButtonElement || a instanceof HTMLSelectElement || a instanceof HTMLInputElement || a.tagName === "SUMMARY" || a.tagName === "A")) return;
      e.preventDefault();
      togglePause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePause]);
  useExitGuard(running || !!recPath, settings.confirmExit, lang, APP);
  const clearError = useCallback(() => setError(null), []);

  // ---- 창 제목: «COM3 115200 · 받는 중 ● REC — PortDock Plot»
  const statusKey = `status_${starting ? "starting" : status}` as Key;
  useWindowTitle(windowTitle(APP, running ? [where, t(statusKey)] : [], !!recPath));
  const parityCh = cfg.parity === "odd" ? "O" : cfg.parity === "even" ? "E" : "N";
  const summaryLine = transport === "serial" ? `${cfg.port || T.noPorts} ${cfg.baud} ${cfg.dataBits}${parityCh}${cfg.stopBits} · ${t(statusKey)}` : `${where} · ${t(statusKey)}`;
  const runLabel = running ? T.stop : T.start;
  const dotClass = startErr && !running ? "s-disconnected" : running ? (status === "disconnected" || status === "reconnecting" ? "s-reconnecting" : "s-connected") : "s-idle";

  // ---- 표(보이는 범위)
  void tick;
  const [lo, hi] = plotApi.current?.range() ?? [0, 0];
  const rows = channels.map((c, i) => ({ c, i, s: stats(ring, i, lo, hi), last: ring.n ? ring.val(i, ring.n - 1) : NaN }));
  const c = counts.current;
  const fl = frameLen(format ?? { kind: "text", sep: "auto", header: "auto" });
  const newSince = frozen ? c.rows - frozenAt.current : 0;

  const firstCard =
    !firstDone && !ring.n ? (
      <FirstCard lang={lang} className="plot-first" title={T.firstTitle} onHide={() => setFirstDone(true)} links={[{ id: "start", label: T.firstTitle }, { id: "tutorial", label: T.firstSimLink }]} onHelp={setShowHelp}>
        <ol>
          <li>{T.first1}</li>
          <li>{T.first2}</li>
          <li>{T.first3}</li>
        </ol>
        <div className="hint">{T.firstSim}</div>
      </FirstCard>
    ) : null;

  return (
    <div className={`app${showSide ? " show-side" : ""}`}>
      <SideBackdrop open={showSide} onClose={() => setShowSide(false)} />
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>Plot</small>
          </span>
          <span className="brand-tools">
            <select className="lang" aria-label={lang === "ko" ? "언어" : "Language"} value={lang} onChange={(e) => update({ lang: e.target.value as Lang })}>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
            <PinButton lang={lang} on={settings.alwaysOnTop} onToggle={(v) => update({ alwaysOnTop: v })} />
            <ReportButton app={APP} lang={lang} frames={() => raw.current.map((r) => ({ ts: r.ts, dir: r.ev ? "ev" : "rx", bytes: [], note: r.why ? `${r.text} — ${r.why}` : r.text }))} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} usageAsked={settings.usageAsked} onUsage={(on) => update({ usageStats: on, usageAsked: true })} />
            <button className="icon-btn" onClick={openHelp} title={T.helpTip} aria-label={T.helpTip}>
              ?
            </button>
            <button className="icon-btn" onClick={() => setShowSettings(true)} title={ui(lang, "settings")} aria-label={ui(lang, "settings")}>
              ⚙
            </button>
            <SideClose lang={lang} onClose={() => setShowSide(false)} />
          </span>
        </div>

        <label data-tip={tip(lang, "plTransport")}>
          {T.transport}
          <select value={transport} disabled={running} title={running ? T.lockedHint : ""} onChange={(e) => setTransport(e.target.value as Transport)}>
            <option value="serial">{T.trSerial}</option>
            <option value="tcp">{T.trTcp}</option>
            <option value="udp">{T.trUdp}</option>
          </select>
        </label>
        {transport === "serial" && (
          <>
            <label data-tip={tip(lang, "port")}>
              {T.port}
              <PortPicker lang={lang} className="port-sel" ports={ports} value={cfg.port} disabled={running} title={running ? T.lockedHint : ""} emptyLabel={T.noPorts} onChange={(name) => setCfg((c) => ({ ...c, port: name }))} />
            </label>
            <div className="grid2">
              <label data-tip={tip(lang, "baud")}>
                {T.baud}
                <NumInput list="bauds" min={50} max={20000000} value={cfg.baud} disabled={running} onValue={(n) => setCfg({ ...cfg, baud: n })} />
                <datalist id="bauds">
                  {BAUDS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </label>
              <label data-tip={tip(lang, "dataBits")}>
                {T.dataBits}
                <select value={cfg.dataBits} disabled={running} onChange={(e) => setCfg({ ...cfg, dataBits: Number(e.target.value) })}>
                  <option value={8}>8</option>
                  <option value={7}>7</option>
                </select>
              </label>
              <label data-tip={tip(lang, "parity")}>
                {T.parity}
                <select value={cfg.parity} disabled={running} onChange={(e) => setCfg({ ...cfg, parity: e.target.value as SerialConfig["parity"] })}>
                  <option value="none">{T.none}</option>
                  <option value="even">{T.even}</option>
                  <option value="odd">{T.odd}</option>
                </select>
              </label>
              <label data-tip={tip(lang, "stopBits")}>
                {T.stopBits}
                <select value={cfg.stopBits} disabled={running} onChange={(e) => setCfg({ ...cfg, stopBits: Number(e.target.value) })}>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </label>
            </div>
            <details className="adv panel" open={advOpen} onToggle={(e) => setAdvOpen((e.target as HTMLDetailsElement).open)}>
              <summary data-tip={tip(lang, "plSerialAdv")}>
                <span className="sum-title">{T.serialAdv}</span>
                {!advOpen && <span className="sum-note">{fill(T.serialAdvSummary, { a: cfg.dtr ? T.on : T.off, b: cfg.autoReconnect ? T.on : T.off })}</span>}
              </summary>
              <label className="inline" data-tip={tip(lang, "plDtr")}>
                <input type="checkbox" checked={cfg.dtr} disabled={running} onChange={(e) => setCfg({ ...cfg, dtr: e.target.checked })} /> {T.dtr}
              </label>
              <label className="inline" data-tip={tip(lang, "plAutoReconnect")}>
                <input type="checkbox" checked={cfg.autoReconnect} disabled={running} onChange={(e) => setCfg({ ...cfg, autoReconnect: e.target.checked })} /> {T.autoReconnect}
              </label>
            </details>
          </>
        )}
        {transport === "tcp" && (
          <>
            <div className="grid2 net">
              <label data-tip={tip(lang, "plHost")}>
                {T.host}
                <span className="addr-row">
                  <input className={tcp.host.trim() ? "" : "bad"} list="tcp-recent-hosts" value={tcp.host} disabled={running} spellCheck={false} onChange={(e) => setTcp({ ...tcp, host: e.target.value })} />
                  <RecentButton
                    lang={lang}
                    recent={recentTcp}
                    disabled={running}
                    onPick={(v) => {
                      const r = splitHostPort(v);
                      setTcp((o) => ({ ...o, host: r.host, port: r.port ?? o.port }));
                    }}
                  />
                </span>
                <RecentHosts id="tcp-recent-hosts" recent={recentTcp} />
              </label>
              <label data-tip={tip(lang, "plNetPort")}>
                {T.netPort}
                <NumInput min={1} max={65535} value={tcp.port} disabled={running} onValue={(n) => setTcp({ ...tcp, port: n })} />
              </label>
            </div>
            {!tcp.host.trim() && <div className="interlock">{T.hostEmpty}</div>}
          </>
        )}
        {transport === "udp" && (
          <>
            <div className="grid2 net">
              <label data-tip={tip(lang, "plBindHost")}>
                {T.bindHost}
                <span className="addr-row">
                  <input list="bind-hosts" value={udp.host} disabled={running} spellCheck={false} onChange={(e) => setUdp({ ...udp, host: e.target.value })} />
                  <RecentButton
                    lang={lang}
                    recent={recentUdp}
                    disabled={running}
                    onPick={(v) => {
                      const r = splitHostPort(v);
                      setUdp((o) => ({ ...o, host: r.host, port: r.port ?? o.port }));
                    }}
                  />
                </span>
                <datalist id="bind-hosts">
                  <option value="0.0.0.0" label={T.bindAny} />
                  <option value="127.0.0.1" />
                </datalist>
              </label>
              <label data-tip={tip(lang, "plBindPort")}>
                {T.netPort}
                <NumInput min={0} max={65535} value={udp.port} disabled={running} onValue={(n) => setUdp({ ...udp, port: n })} />
              </label>
            </div>
            <label data-tip={tip(lang, "plGroup")}>
              {T.group}
              <input value={udp.group} disabled={running} spellCheck={false} placeholder="239.0.0.1" onChange={(e) => setUdp({ ...udp, group: e.target.value })} />
            </label>
          </>
        )}

        <hr />
        <b>{T.formatTitle}</b>
        <label data-tip={tip(lang, "plFmtKind")}>
          {T.fmtKind}
          <select className="fmt-kind" value={fmt.kind} onChange={(e) => setFmt({ ...fmt, kind: e.target.value as FmtUi["kind"] })}>
            <option value="text">{T.fmtText}</option>
            <option value="binary">{T.fmtBinary}</option>
          </select>
        </label>
        {fmt.kind === "text" ? (
          <>
            <div className="grid2">
              <label data-tip={tip(lang, "plSep")}>
                {T.sep}
                <select value={fmt.sep} onChange={(e) => setFmt({ ...fmt, sep: e.target.value as Sep })}>
                  <option value="auto">{T.sepAuto}</option>
                  <option value="comma">{T.sepComma}</option>
                  <option value="space">{T.sepSpace}</option>
                  <option value="tab">{T.sepTab}</option>
                  <option value="semicolon">{T.sepSemicolon}</option>
                </select>
              </label>
              <label data-tip={tip(lang, "plHeader")}>
                {T.header}
                <select value={fmt.header} onChange={(e) => setFmt({ ...fmt, header: e.target.value as FmtUi["header"] })}>
                  <option value="auto">{T.headerAuto}</option>
                  <option value="off">{T.headerOff}</option>
                </select>
              </label>
            </div>
            <div className="hint mono fmt-example">{T.textExample}</div>
          </>
        ) : (
          <>
            <label data-tip={tip(lang, "plSync")}>
              {T.sync}
              <input className={syncErr ? "mono sync-in bad" : "mono sync-in"} value={fmt.syncText} spellCheck={false} onChange={(e) => setFmt({ ...fmt, syncText: e.target.value })} />
            </label>
            {syncErr && <div className="interlock">{fill(T.syncBad, { a: syncErr })}</div>}
            <div className="grid2">
              <label data-tip={tip(lang, "plChannels")}>
                {T.channels}
                <NumInput min={1} max={MAX_CHANNELS} value={fmt.channels} onValue={(n) => setFmt({ ...fmt, channels: n })} />
              </label>
              <label data-tip={tip(lang, "plNum")}>
                {T.num}
                <select value={fmt.num} onChange={(e) => setFmt({ ...fmt, num: e.target.value as NumKind })}>
                  {NUMS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label data-tip={tip(lang, "plEndian")}>
              {T.endian}
              <select value={fmt.little ? "le" : "be"} onChange={(e) => setFmt({ ...fmt, little: e.target.value === "le" })}>
                <option value="le">{T.little}</option>
                <option value="be">{T.big}</option>
              </select>
            </label>
            <label data-tip={tip(lang, "plChecksum")}>
              {T.checksum}
              <select value={fmt.checksum ?? ""} onChange={(e) => setFmt({ ...fmt, checksum: (e.target.value || null) as CkKind | null })}>
                <option value="">{T.ckNone}</option>
                {CKS.map(([k, n]) => (
                  <option key={k} value={k}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            {fmt.checksum && (
              <label className="inline" data-tip={tip(lang, "plCheckSync")}>
                <input type="checkbox" checked={fmt.checkSync} onChange={(e) => setFmt({ ...fmt, checkSync: e.target.checked })} /> {T.checkSync}
              </label>
            )}
            {format && (
              <div className="hint frame-len">
                {fill(T.frameLen, { n: fl, s: format.kind === "binary" ? format.sync.length : 0, v: fmt.channels * NUM_SIZE[fmt.num], c: fmt.checksum ? CK_SIZE[fmt.checksum] : 0 })}
              </div>
            )}
          </>
        )}

        <hr />
        <button data-tip={withKey(tip(lang, "plStart"), KEYS.connect)} className={running ? "btn danger" : "btn primary"} onClick={running ? () => void stop() : () => void start()} disabled={runDisabled}>
          {runLabel}
        </button>
        {running && <span className="lock-note">🔒 {T.lockedHint}</span>}
        {startErr && !running ? (
          <div className="status s-failed" role="alert">
            <b>{T.startFailed}</b> · {startErr}
            {/busy|in use|denied|사용 중|거부|refused/i.test(startErr) && <div>{transport === "serial" ? T.busyHint : T.refusedHint}</div>}
          </div>
        ) : (
          <div className={`status s-${starting ? "reconnecting" : status === "listening" ? "connected" : status}`}>
            {t(statusKey)}
            {statusMsg ? ` · ${statusMsg}` : ""}
          </div>
        )}
        <div className="counts mono" data-tip={tip(lang, "plCounts")}>
          <span>{fill(T.countRows, { n: c.rows.toLocaleString() })}</span>
          <span className={c.bad ? "bad" : ""}>{fill(T.countBad, { n: c.bad.toLocaleString() })}</span>
          <span>{fill(T.countRate, { n: running ? Math.round(rate.current.value).toLocaleString() : 0 })}</span>
          <span>{fill(T.countBytes, { n: c.bytes.toLocaleString() })}</span>
          {c.dropped > 0 && <span className="bad">{fill(T.countDropped, { n: c.dropped.toLocaleString() })}</span>}
        </div>
      </aside>

      <main className="main">
        <NarrowBar lang={lang} open={showSide} onToggle={() => setShowSide(!showSide)} dot={dotClass} summary={summaryLine}>
          <button className={running ? "btn small danger" : "btn small primary"} onClick={running ? () => void stop() : () => void start()} disabled={runDisabled} data-tip={withKey(tip(lang, "plStart"), KEYS.connect)}>
            {runLabel}
          </button>
        </NarrowBar>
        <div className="toolbar plotbar">
          {frozen ? (
            <button className="btn small primary" onClick={live} data-tip={withKey(tip(lang, "plResume"), "End")}>
              {T.resume}
            </button>
          ) : (
            <button className="btn small" onClick={togglePause} data-tip={withKey(tip(lang, "plPause"), "Space")}>
              {T.pause}
            </button>
          )}
          <label className="inline" data-tip={tip(lang, "plWindow")}>
            {T.window}
            <select className="win-mode" value={view.mode} onChange={(e) => setView({ ...view, mode: e.target.value as XMode })}>
              <option value="points">{T.winPoints}</option>
              <option value="time">{T.winSeconds}</option>
            </select>
          </label>
          <span data-tip={tip(lang, "plSpan")}>
            {view.mode === "points" ? (
              <NumInput className="num" aria-label={T.winPoints} min={10} max={100000} value={view.points} onValue={(n) => setView({ ...view, points: n })} />
            ) : (
              <NumInput className="num" aria-label={T.winSeconds} min={1} max={86400} value={view.seconds} onValue={(n) => setView({ ...view, seconds: n })} />
            )}
          </span>
          <span className="ygroup" data-tip={tip(lang, "plY")}>
            <label className="inline">
              {T.yLeft}
              <select value={yL.auto ? "auto" : "fixed"} onChange={(e) => setYL({ ...yL, auto: e.target.value === "auto" })}>
                <option value="auto">{T.yAuto}</option>
                <option value="fixed">{T.yFixed}</option>
              </select>
            </label>
            {!yL.auto && (
              <>
                <FloatInput className={`num${yL.max > yL.min ? "" : " bad"}`} aria-label={T.yMin} title={T.yMin} value={yL.min} onValue={(n) => setYL({ ...yL, min: n })} />
                <FloatInput className={`num${yL.max > yL.min ? "" : " bad"}`} aria-label={T.yMax} title={yL.max > yL.min ? T.yMax : T.yBad} value={yL.max} onValue={(n) => setYL({ ...yL, max: n })} />
              </>
            )}
          </span>
          {anyRight && (
            <span className="ygroup" data-tip={tip(lang, "plYRight")}>
              <label className="inline">
                {T.yRight}
                <select value={yR.auto ? "auto" : "fixed"} onChange={(e) => setYR({ ...yR, auto: e.target.value === "auto" })}>
                  <option value="auto">{T.yAuto}</option>
                  <option value="fixed">{T.yFixed}</option>
                </select>
              </label>
              {!yR.auto && (
                <>
                  <FloatInput className={`num${yR.max > yR.min ? "" : " bad"}`} aria-label={T.yMin} title={T.yMin} value={yR.min} onValue={(n) => setYR({ ...yR, min: n })} />
                  <FloatInput className={`num${yR.max > yR.min ? "" : " bad"}`} aria-label={T.yMax} title={yR.max > yR.min ? T.yMax : T.yBad} value={yR.max} onValue={(n) => setYR({ ...yR, max: n })} />
                </>
              )}
            </span>
          )}
          <span className="grow" />
          <button className={recPath ? "btn small danger" : "btn small"} onClick={() => void toggleRecord()} disabled={!recPath && !running} data-tip={withKey(tip(lang, "plRecord"), KEYS.fileLog)}>
            {recPath ? T.recording : T.record}
          </button>
          <button className="btn small" onClick={() => void saveCsv()} disabled={!ring.n} data-tip={withKey(tip(lang, "plSaveCsv"), KEYS.save)}>
            {T.saveCsv}
          </button>
          <button className="btn small" onClick={() => void savePng()} disabled={!ring.n} data-tip={tip(lang, "plSavePng")}>
            {T.savePng}
          </button>
          <button className="btn small ghost" onClick={clearAll} disabled={!ring.n && !raw.current.length} data-tip={withKey(tip(lang, "plClear"), KEYS.clear)}>
            {T.clear}
          </button>
        </div>
        {(frozen || recPath || error) && (
          <div className="notes">
            {frozen && (
              <span className="hint warn">
                ⏸ {T.frozenNote}
                {newSince > 0 ? ` (+${newSince.toLocaleString()})` : ""}
              </span>
            )}
            {recPath && (
              <span className="hint rec ellipsis" title={recPath}>
                {fill(T.recNote, { a: baseName(recPath), n: recRows.toLocaleString() })}
              </span>
            )}
            {error && (
              <span className="error-note" role="alert">
                ⚠ {error}
                <button className="btn small ghost" onClick={clearError} aria-label={T.close}>
                  ✕
                </button>
              </span>
            )}
          </div>
        )}
        <Plot ring={ring} handle={plotApi} channels={channels} mode={view.mode} span={span} yL={yL} yR={yR} frozen={frozen} onFreeze={onFreeze} origin={origin} t={T} empty={firstCard} />
        <Splitter lang={lang} onHeight={setLowerH} />
        <section className="lower" style={lowerH ? { height: lowerH } : undefined}>
          <div className="toolbar lower-tabs">
            <span className="segs" role="tablist">
              {(["channels", "raw"] as const).map((v) => (
                <button key={v} role="tab" aria-selected={tab === v} className={tab === v ? "seg on" : "seg"} onClick={() => setTab(v)}>
                  {v === "channels" ? T.tabChannels : T.tabRaw}
                  {v === "raw" && c.bad > 0 ? <span className="bad"> ●</span> : null}
                </button>
              ))}
            </span>
            {tab === "channels" ? (
              <span className="hint ellipsis" data-tip={tip(lang, "plStats")}>
                {fill(T.statsNote, { n: Math.max(0, hi - lo).toLocaleString() })}
              </span>
            ) : (
              <>
                <span className="hint ellipsis" data-tip={tip(lang, "plRaw")}>
                  {fill(T.rawNote, { n: RAW_KEEP })}
                </span>
                <span className="grow" />
                <button
                  className="btn small ghost"
                  disabled={!raw.current.length}
                  onClick={() => {
                    raw.current = [];
                    setTick((x) => x + 1);
                  }}
                >
                  {T.rawClear}
                </button>
              </>
            )}
          </div>
          {tab === "channels" ? (
            channels.length === 0 ? (
              <div className="hint lower-empty">{T.noChannels}</div>
            ) : (
              <div className="ctable-wrap">
                <table className="ctable">
                  <thead>
                    <tr>
                      <th>{T.colShow}</th>
                      <th>{T.colColor}</th>
                      <th>{T.colName}</th>
                      <th>{T.colAxis}</th>
                      <th className="num-col">{T.colLast}</th>
                      <th className="num-col">{T.colMin}</th>
                      <th className="num-col">{T.colMax}</th>
                      <th className="num-col">{T.colMean}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ c: ch, i, s, last }) => (
                      <tr key={i} className={ch.show ? "" : "off"}>
                        <td>
                          <input type="checkbox" aria-label={`${T.colShow} ${ch.name}`} checked={ch.show} data-tip={tip(lang, "plShow")} onChange={(e) => setCh(i, { show: e.target.checked })} />
                        </td>
                        <td>
                          <input
                            type="color"
                            className="swatch-in"
                            aria-label={`${T.colColor} ${ch.name}`}
                            value={ch.color}
                            data-tip={tip(lang, "plColor")}
                            onChange={(e) => setCh(i, { color: e.target.value })}
                            onDoubleClick={() => setCh(i, { color: undefined })}
                            title={T.resetColor}
                          />
                        </td>
                        <td>
                          <input className="ch-name" value={chCfg[i]?.name ?? ""} placeholder={channelName(i, undefined, deviceNames[i])} spellCheck={false} aria-label={`${T.colName} ${i + 1}`} data-tip={tip(lang, "plName")} onChange={(e) => setCh(i, { name: e.target.value })} />
                        </td>
                        <td>
                          <select value={ch.axis} aria-label={`${T.colAxis} ${ch.name}`} data-tip={tip(lang, "plAxis")} onChange={(e) => setCh(i, { axis: e.target.value as "L" | "R" })}>
                            <option value="L">{T.axisL}</option>
                            <option value="R">{T.axisR}</option>
                          </select>
                        </td>
                        <td className="mono num-col">{fmtNum(last)}</td>
                        <td className="mono num-col">{fmtNum(s.min)}</td>
                        <td className="mono num-col">{fmtNum(s.max)}</td>
                        <td className="mono num-col">{fmtNum(s.mean)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : raw.current.length === 0 ? (
            <div className="hint lower-empty">{T.rawEmpty}</div>
          ) : (
            <RawView lines={raw.current} version={tick} />
          )}
        </section>
      </main>

      {showHelp && <HelpDialog doc={help} lang={lang} app={APP} start={typeof showHelp === "string" ? showHelp : null} onClose={() => setShowHelp(false)} />}
      {showSettings && (
        <SettingsDialog app={APP} version={VERSION} settings={settings} update={update} reset={reset} onClose={() => setShowSettings(false)} writeText={api.writeText} readText={api.readText} busy={running || !!recPath} />
      )}
      {toast.node}
    </div>
  );
}

/** 원시 수신 — 최근 줄, 맨 아래를 따라간다(위로 굴리면 멈춤) */
function RawView({ lines, version }: { lines: RawLine[]; version: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (el && follow.current) el.scrollTop = el.scrollHeight;
  }, [version, lines.length]);
  return (
    <div
      className="rawlog mono"
      ref={ref}
      onScroll={(e) => {
        const el = e.currentTarget;
        follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
      }}
    >
      {lines.map((r, k) => (
        <div key={k} className={`rrow${r.ev ? " ev" : r.ok ? "" : " fail"}`}>
          <span className="ts">{clock(r.ts)}</span>
          <span className="rtext">{r.text || " "}</span>
          {r.why && <span className="why">— {r.why}</span>}
        </div>
      ))}
    </div>
  );
}
