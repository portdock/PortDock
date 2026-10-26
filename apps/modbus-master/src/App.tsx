import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as KeyEv, type MouseEvent as MouseEv } from "react";
import { VERSION } from "@shared/version";
import { open as openDialog, save } from "@tauri-apps/plugin-dialog";
import { api, outcomeText, type Frame, type MasterEvent, type NetConfig, type Outcome, type PortInfo, type SerialConfig, type Setup, type Stats, type Timing, type Transport } from "./api";
import {
  addrLabel,
  broadcastRead,
  errorCount,
  exportCsv,
  FCS,
  fcHex,
  fmtMs,
  importCsv,
  isBitFc,
  layout,
  maxQty,
  minUnit,
  newTable,
  numValue,
  parseAddr,
  plcGuess,
  pointRegs,
  pushSample,
  sanitizeTables,
  shapeOf,
  showValue,
  stamp,
  tableLabel,
  toSpec,
  trendKey,
  VALUE_LOG_HEADER,
  valueLogLines,
  writableFc,
  type AddrMode,
  type Fc,
  type Format,
  type Item,
  type Point,
  type PollTable,
  type Series,
} from "./model";
import { Traffic, type TrafficHandle } from "./Traffic";
import { WriteDialog, TYPE_LABEL } from "./WriteDialog";
import { PointDialog } from "./PointDialog";
import { NO_SCAN, ScanDialog, type ScanState } from "./ScanDialog";
import { Trend, type TrendItem } from "./Trend";
import { tip } from "@shared/tips";
import { ReportButton } from "@shared/ReportDialog";
import { noteError } from "@shared/report";
import { HelpDialog, useHelpKey } from "@shared/HelpDialog";
import { FirstCard } from "@shared/FirstCard";
import { Popover } from "@shared/Popover";
import { Splitter, useStoredHeight } from "@shared/Splitter";
import { help } from "./help";
import { launchFilled, masterLaunch } from "./launch";
import { load, samePorts, store } from "@shared/framing";
import { autoLogPath, useFold, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { DeviceDialog, JOIN_GAP, type DeviceApplyOpts } from "@shared/DeviceDialog";
import { deviceName, pollGroups, serialDefaults, type Device } from "@shared/devices";
import { useToast } from "@shared/Toast";
import { KEYS, useShortcuts, withKey } from "@shared/shortcuts";
import { useWindowTitle, windowTitle } from "@shared/useWindowTitle";
import { PinButton } from "@shared/PinButton";
import { NarrowBar, SideBackdrop, SideClose } from "@shared/NarrowBar";
import { ui } from "@shared/uiText";
import { dict, fill, type Key, type Lang } from "./i18n";
import "./App.css";

const APP = "PortDock Modbus Master";
type Status = "idle" | "connecting" | "connected" | "disconnected" | "reconnecting" | "closed";
const BAUDS = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
const MAX_TRENDS = 6;

/** 표 하나의 마지막 읽기 */
interface TableResult {
  /** 마지막으로 읽은 값(실패해도 그 전 값을 남긴다) */
  values: number[] | null;
  ts: number;
  outcome: Outcome;
  rttMs: number;
  /** 지난번과 달라진 칸(값 목록의 자리) */
  changed: Set<number>;
}

/** 연결했던 장치 — COM 번호가 바뀌어도 같은 장치를 찾는 데 쓴다 */
type PortId = { vid: number | null; pid: number | null; serial: string | null };

function pickPort(ports: PortInfo[], id: PortId | null) {
  const same =
    id &&
    ((id.serial && ports.find((p) => p.serial_number === id.serial && p.vid === id.vid && p.pid === id.pid)) ||
      (id.vid != null && ports.find((p) => p.vid === id.vid && p.pid === id.pid)));
  return (same || ports[0]).name;
}

function cleanTiming(t: Partial<Timing>): Timing {
  const n = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi ? v : d);
  return { timeoutMs: n(t.timeoutMs, 10, 60000, 1000), retries: n(t.retries, 0, 10, 0), delayMs: n(t.delayMs, 0, 60000, 20) };
}

/** 값 기록 — 파일·방식·쓴 줄 수 */
interface ValueLog {
  path: string;
  onChange: boolean;
  lines: number;
}

export default function App() {
  const { settings, update, reset } = useSettings();
  const lang = settings.lang;
  const t = useCallback((k: Key) => dict[lang][k], [lang]);
  const [showSettings, setShowSettings] = useState(false);
  // true = 첫 절, 글자 = 그 id 의 절(첫 실행 카드의 도움말 링크)
  const [showHelp, setShowHelp] = useState<boolean | string>(false);
  // 첫 실행 카드(연결 전 값 칸 위) — «다시 보지 않기» 또는 첫 연결 뒤 숨긴다(10/18)
  const [firstDone, setFirstDone] = useState<boolean>(() => load<boolean>("firstHintDone", false) === true);
  useEffect(() => store("firstHintDone", firstDone), [firstDone]);
  // 통신 기록 높이(끌어서 조절, 기억)
  const [trafficH, setTrafficH] = useStoredHeight("trafficH");
  // 값 기록(CSV) 띄움 칸 — 표 도구줄의 «값 기록» 버튼
  const [vlogPop, setVlogPop] = useState(false);
  const vlogBtn = useRef<HTMLButtonElement>(null);
  const openHelp = useCallback(() => setShowHelp(true), []);
  useHelpKey(openHelp);
  const maxLines = useRef(settings.maxLines);
  maxLines.current = settings.maxLines;
  const [showSide, setShowSide] = useState(false);
  const toast = useToast(lang);

  // ---- 연결 설정
  const [transport, setTransport] = useState<Transport>(() => {
    const v = load<Transport>("transport", "serial");
    return v === "tcp" || v === "rtu-tcp" ? v : "serial";
  });
  const [cfg, setCfg] = useState<SerialConfig>(() => ({
    port: "",
    baud: 9600,
    dataBits: 8,
    parity: "none",
    stopBits: 1,
    flow: "none",
    dtr: false,
    rts: false,
    autoReconnect: true,
    ...load<Partial<SerialConfig>>("cfg", {}),
  }));
  const [net, setNet] = useState<NetConfig>(() => ({ host: "192.168.0.10", port: 502, autoReconnect: true, ...load<Partial<NetConfig>>("net", {}) }));
  const [timing, setTiming] = useState<Timing>(() => cleanTiming(load<Partial<Timing>>("timing", {})));
  const [forceMulti, setForceMulti] = useState<boolean>(() => load<boolean>("forceMulti", false) === true);
  const [addrMode, setAddrMode] = useState<AddrMode>(() => {
    const v = load<AddrMode>("addrMode", "zero");
    return v === "one" || v === "plc" ? v : "zero";
  });
  const tcp = transport !== "serial";
  const wire: "tcp" | "rtu" = transport === "tcp" ? "tcp" : "rtu";

  // ---- 폴링 표
  const [tables, setTables] = useState<PollTable[]>(() => sanitizeTables(load("tables", null)));
  const [selId, setSelId] = useState<number>(() => load("selTable", 0));
  const sel = tables.find((x) => x.id === selId) ?? tables[0];
  const selIndex = tables.indexOf(sel);
  const [paused, setPaused] = useState(false);
  const [trendKeys, setTrendKeys] = useState<string[]>(() => {
    const v = load<unknown>("trends", []);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, MAX_TRENDS) : [];
  });
  const [selAddr, setSelAddr] = useState<number | null>(null);

  useEffect(() => store("transport", transport), [transport]);
  useEffect(() => store("cfg", cfg), [cfg]);
  useEffect(() => store("net", net), [net]);
  useEffect(() => store("timing", timing), [timing]);
  useEffect(() => store("forceMulti", forceMulti), [forceMulti]);
  // 왼쪽 «통신 세부»(기다림·재시도·간격·여러 칸 쓰기)·«통계» 접기 — 기본값이 아니면 펼친 채 시작, 열림 상태는 기억
  const commChanged = timing.timeoutMs !== 1000 || timing.retries !== 0 || timing.delayMs !== 20 || forceMulti;
  const [commOpenSaved, setCommOpenSaved] = useState<boolean>(() => commChanged || load<boolean>("commOpen", false) === true);
  useEffect(() => store("commOpen", commOpenSaved), [commOpenSaved]);
  const [commOpen, setCommOpen] = useFold(commOpenSaved, setCommOpenSaved, settings.expandAll);
  const [statsOpenSaved, setStatsOpenSaved] = useState<boolean>(() => load<boolean>("statsOpen", false) === true);
  useEffect(() => store("statsOpen", statsOpenSaved), [statsOpenSaved]);
  const [statsOpen, setStatsOpen] = useFold(statsOpenSaved, setStatsOpenSaved, settings.expandAll);
  // 0·1 기준 시작 칸에 40001 같은 PLC 표기를 넣었을 때의 알림줄(그대로 적용하고 «PLC 표기로 바꾸기» 를 권한다)
  const [plcNote, setPlcNote] = useState<{ id: number; text: string; start: number; fc: Fc } | null>(null);
  useEffect(() => store("addrMode", addrMode), [addrMode]);
  useEffect(() => store("tables", tables), [tables]);
  useEffect(() => store("selTable", sel.id), [sel.id]);
  useEffect(() => store("trends", trendKeys), [trendKeys]);
  // TCP → RTU 로 바꾸면 국번 0 읽기 표는 브로드캐스트가 되어 폴링에서 빠진다 — 몇 개인지 알린다
  const prevWire = useRef(wire);
  useEffect(() => {
    const was = prevWire.current;
    prevWire.current = wire;
    if (was !== "tcp" || wire !== "rtu") return;
    const n = tables.filter((x) => broadcastRead(x, wire)).length;
    if (n > 0) toast.show(fill(t("bcastSwitched"), { n }), { error: true, ms: 7000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wire]);

  // 나중에 부르는 콜백에서 최신 값을 쓰려고
  const tablesRef = useRef(tables);
  tablesRef.current = tables;
  const trendRef = useRef(trendKeys);
  trendRef.current = trendKeys;
  const addrModeRef = useRef(addrMode);
  addrModeRef.current = addrMode;
  const langRef = useRef(lang);
  langRef.current = lang;

  // ---- 포트 목록
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

  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const connectedRef = useRef(false);
  connectedRef.current = connected;
  const [connecting, setConnecting] = useState(false);
  const [connectErr, setConnectErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (error) noteError(error);
  }, [error]);
  const [logPath, setLogPath] = useState<string | null>(null);
  const [portNotice, setPortNotice] = useState<string | null>(null);
  useEffect(() => {
    if (connected || !ports.length || ports.some((p) => p.name === cfg.port)) return;
    const next = pickPort(ports, load<PortId | null>("portId", null));
    if (cfg.port) setPortNotice(fill(dict[lang].portSwitched, { a: cfg.port, b: next }));
    setCfg((c) => ({ ...c, port: next }));
  }, [ports, cfg.port, connected, lang]);

  // ---- 명령줄 인자(0.2.0) — «--tcp 192.168.0.10:502 --unit 1» 등. 설정만 채우고 연결은 사용자가 누른다
  const launchDone = useRef(false);
  useEffect(() => {
    if (launchDone.current) return;
    launchDone.current = true;
    api
      .launchArgs()
      .then((argv) => {
        if (!argv?.length) return;
        const l = masterLaunch(argv, wire);
        const d = dict[langRef.current];
        const parts: string[] = [];
        if (l.transport === "tcp" && l.host) {
          setTransport("tcp");
          setNet((n) => ({ ...n, host: l.host!, port: l.port ?? 502 }));
          parts.push(`${d.trTcp} ${l.host.includes(":") ? `[${l.host}]` : l.host}:${l.port ?? 502}`);
        }
        if (l.transport === "serial" && l.serialPort) {
          setTransport("serial");
          setCfg((c) => ({ ...c, port: l.serialPort! }));
          parts.push(`${d.trSerial} ${l.serialPort}`);
        }
        if (l.baud !== undefined) {
          setCfg((c) => ({ ...c, baud: l.baud! }));
          parts.push(`${l.baud} bps`);
        }
        if (l.unit !== undefined) {
          const id = sel.id;
          setTables((ts) => ts.map((x) => (x.id === id ? { ...x, unit: l.unit! } : x)));
          parts.push(fill(d.titleUnit, { a: l.unit }));
        }
        const msg = [launchFilled(l) && fill(d.launchSet, { a: parts.join(" · ") }), l.bad.length > 0 && fill(d.launchBad, { a: l.bad.join(", ") })].filter(Boolean).join(" / ");
        if (msg) toast.show(msg, { error: l.bad.length > 0, ms: 9000 });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 읽은 값·추세·값 기록
  const [results, setResults] = useState<Record<number, TableResult>>({});
  const resultsRef = useRef(results);
  const series = useRef(new Map<string, Series>());
  const [trendVer, setTrendVer] = useState(0);
  const lastTrendDraw = useRef(0);
  const [vlog, setVlog] = useState<ValueLog | null>(null);
  const vlogRef = useRef(vlog);
  vlogRef.current = vlog;
  const vlogBuf = useRef("");
  const vlogPrev = useRef(new Map<number, Map<number, string>>());

  const handlePolls = useCallback((polls: Extract<MasterEvent, { type: "batch" }>["polls"]) => {
    if (!polls.length) return;
    const next = { ...resultsRef.current };
    let trended = false;
    for (const p of polls) {
      const tb = tablesRef.current.find((x) => x.id === p.table);
      const prev = next[p.table];
      if (p.outcome.result !== "ok") {
        next[p.table] = { values: prev?.values ?? null, ts: p.ts, outcome: p.outcome, rttMs: p.rttMs, changed: new Set() };
        continue;
      }
      const values = p.outcome.values;
      const changed = new Set<number>();
      if (prev?.values && prev.values.length === values.length) values.forEach((v, i) => v !== prev.values![i] && changed.add(i));
      next[p.table] = { values, ts: p.ts, outcome: p.outcome, rttMs: p.rttMs, changed };
      if (!tb) continue;
      // 추세 — 이 표의 칸만
      for (const k of trendRef.current) {
        const [tid, a] = k.split(":").map(Number);
        if (tid !== tb.id || a < tb.start || a >= tb.start + values.length) continue;
        const pt = isBitFc(tb.fc) ? undefined : tb.points.find((q) => q.addr === a);
        const sh = shapeOf(tb.fc, pt);
        const v = numValue(values.slice(a - tb.start, a - tb.start + (pt ? pointRegs(pt) : 1)), sh);
        if (v == null) continue;
        let s = series.current.get(k);
        if (!s) series.current.set(k, (s = { ts: [], v: [] }));
        pushSample(s, p.ts, v);
        trended = true;
      }
      // 값 기록
      const vl = vlogRef.current;
      if (vl) {
        let prevMap = vlogPrev.current.get(tb.id);
        if (!prevMap) vlogPrev.current.set(tb.id, (prevMap = new Map()));
        const name = tableLabel(tb, tablesRef.current.indexOf(tb), dict[langRef.current].tableWord);
        vlogBuf.current += valueLogLines(p.ts, tb, name, values, addrModeRef.current, vl.onChange, prevMap);
      }
    }
    resultsRef.current = next;
    setResults(next);
    // 추세 그림은 0.2초에 한 번까지
    if (trended && Date.now() - lastTrendDraw.current > 200) {
      lastTrendDraw.current = Date.now();
      setTrendVer((v) => v + 1);
    }
  }, []);

  // 값 기록 — 1초마다 파일에 덧붙인다
  useEffect(() => {
    if (!vlog) return;
    const flush = () => {
      const text = vlogBuf.current;
      if (!text) return;
      vlogBuf.current = "";
      const n = text.split("\r\n").length - 1;
      api
        .appendText(vlog.path, text)
        .then(() => setVlog((v) => (v && v.path === vlog.path ? { ...v, lines: v.lines + n } : v)))
        .catch((e) => {
          setError(String(e));
          setVlog(null);
        });
    };
    const id = setInterval(flush, 1000);
    return () => {
      clearInterval(id);
      flush();
    };
    // 파일이 바뀔 때만 다시
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vlog?.path]);

  // ---- 통신 기록
  const traffic = useRef<Frame[]>([]);
  const seqRef = useRef(0);
  const failCount = useRef(0);
  const trafficApi = useRef<TrafficHandle | null>(null);

  // ---- 찾기·쓰기
  const [scan, setScan] = useState<ScanState>(NO_SCAN);
  const [showScan, setShowScan] = useState(false);
  const pendingWrites = useRef(new Map<number, (o: Outcome, rttMs: number) => void>());
  const writeSeq = useRef(0);

  const onEvent = useCallback(
    (e: MasterEvent) => {
      switch (e.type) {
        case "batch": {
          if (e.lines.length) {
            for (const f of e.lines) {
              f.seq = ++seqRef.current;
              if (f.check === false) failCount.current++;
            }
            traffic.current.push(...e.lines);
            if (traffic.current.length > maxLines.current) traffic.current.splice(0, traffic.current.length - maxLines.current);
            trafficApi.current?.bump();
          }
          handlePolls(e.polls);
          break;
        }
        case "write": {
          const r = pendingWrites.current.get(e.token);
          pendingWrites.current.delete(e.token);
          r?.(e.outcome, e.rttMs);
          break;
        }
        case "scan-hit":
          setScan((s) => ({ ...s, hits: [...s.hits.filter((h) => h.unit !== e.unit), { unit: e.unit, outcome: e.outcome, rttMs: e.rttMs }] }));
          break;
        case "scan-ranges":
          setScan((s) => ({ ...s, ranges: e.ranges }));
          break;
        case "scan-progress":
          setScan((s) => ({ ...s, done: e.done, total: e.total }));
          break;
        case "scan-done":
          setScan((s) => ({ ...s, running: false, done: e.cancelled ? s.done : s.total, finished: { found: e.found, cancelled: e.cancelled, stopped: e.stopped } }));
          break;
        case "status":
          setStatus(e.state);
          setStatusMsg(e.message);
          if (e.state === "connected") {
            setError(null);
            setCfg((c) => (!e.port || c.port === e.port || /:\d+$/.test(e.port) ? c : { ...c, port: e.port }));
          }
          if (e.state === "closed") {
            setConnected(false);
            setLogPath(null);
            setScan((s) => (s.running ? { ...s, running: false } : s));
            for (const r of pendingWrites.current.values()) r({ result: "send-error", why: dict[langRef.current].status_closed }, 0);
            pendingWrites.current.clear();
          }
          break;
        case "error":
          setError(e.message);
          break;
      }
    },
    [handlePolls],
  );

  // ---- 백엔드로 보내는 설정(연결 중)
  const specs = useMemo(() => JSON.stringify(tables.map(toSpec)), [tables]);
  useEffect(() => {
    if (connected) api.setTables(JSON.parse(specs)).catch((e) => setError(String(e)));
  }, [connected, specs]);
  useEffect(() => {
    if (!connected) return;
    const id = setTimeout(() => api.setTiming(timing).catch((e) => setError(String(e))), 300);
    return () => clearTimeout(id);
  }, [connected, timing]);
  const style = useMemo(() => ({ base: addrMode === "one" ? 1 : 0, plc: addrMode === "plc" }), [addrMode]);
  useEffect(() => {
    if (connected) api.setAddrStyle(style).catch(() => {});
  }, [connected, style]);
  useEffect(() => {
    if (connected) api.setPaused(paused).catch(() => {});
  }, [connected, paused]);

  // ---- 통계(0.5초마다)
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    if (!connected) return;
    const tick = () =>
      api
        .getStats()
        .then((s) => setStats((o) => (o && JSON.stringify(o) === JSON.stringify(s) ? o : s)))
        .catch(() => {});
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [connected]);

  /** 첫 실행 카드 — 장비 종류를 고르면 연결 방식을 맞추고 다음에 넣을 칸(TCP 는 장비 주소, 시리얼은 포트)으로 */
  function pickDevice(tr: Transport) {
    setTransport(tr);
    if (matchMedia("(max-width: 900px)").matches) setShowSide(true);
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(tr === "serial" ? "aside.side select.port-sel" : "aside.side .grid2.net input");
      el?.focus();
      if (el instanceof HTMLInputElement) el.select();
    }, 50);
  }

  // ---- 연결
  async function connect() {
    if (connecting) return;
    setConnecting(true);
    setError(null);
    setConnectErr(null);
    setPortNotice(null);
    setStatusMsg(null);
    const setup: Setup = { timing, tables: tables.map(toSpec), style, paused };
    try {
      if (transport === "serial") {
        await api.open(cfg, setup, onEvent);
        const p = ports.find((x) => x.name === cfg.port);
        if (p) store("portId", { vid: p.vid, pid: p.pid, serial: p.serial_number } satisfies PortId);
      } else {
        await api.openTcp({ host: net.host.trim(), port: net.port, wire, autoReconnect: net.autoReconnect }, setup, onEvent);
      }
      setStatus((s) => (s === "idle" || s === "closed" ? (transport === "serial" ? "connected" : "connecting") : s));
      setConnected(true);
      setFirstDone(true);
      // 첫 연결 한 번만 — 쓰기·형식 길 안내
      if (!load<boolean>("firstConnectTip", false)) {
        store("firstConnectTip", true);
        toast.show(t("firstConnectTip"), { ms: 7000 });
      }
      setStats(null);
      resultsRef.current = {};
      setResults({});
      if (settings.autoLog && settings.logFolder) {
        const p = autoLogPath(settings.logFolder, "modbus-master");
        await api
          .setLog(p)
          .then(() => setLogPath(p))
          .catch((e) => setError(String(e)));
      }
    } catch (e) {
      setConnectErr(String(e));
      noteError(String(e));
    } finally {
      setConnecting(false);
    }
  }
  async function disconnect() {
    await api.close();
    setConnected(false);
    setStatus("closed");
    setStatusMsg(null);
    setLogPath(null);
    setScan((s) => (s.running ? { ...s, running: false } : s));
  }
  useEffect(() => {
    if (!connected || transport !== "serial") return;
    const id = setTimeout(() => api.reconfigure(cfg).catch((e) => setError(String(e))), 300);
    return () => clearTimeout(id);
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
    const st = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const path = await save({ title: t("logDlgTitle"), defaultPath: `modbus-master-${st}.log`, filters: [{ name: "Log", extensions: ["log", "txt"] }] });
    if (!path) return;
    await api
      .setLog(path)
      .then(() => setLogPath(path))
      .catch((e) => setError(String(e)));
  }

  const [vlogMode, setVlogMode] = useState<boolean>(() => load<boolean>("vlogOnChange", false) === true);
  useEffect(() => store("vlogOnChange", vlogMode), [vlogMode]);
  useEffect(() => {
    setVlog((v) => (v && v.onChange !== vlogMode ? { ...v, onChange: vlogMode } : v));
  }, [vlogMode]);
  async function toggleValueLog() {
    if (vlog) {
      setVlog(null);
      return;
    }
    const st = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const path = await save({ title: t("vlDlgTitle"), defaultPath: `modbus-values-${st}.csv`, filters: [{ name: "CSV (Excel)", extensions: ["csv"] }] });
    if (!path) return;
    try {
      // 엑셀에서 한글이 깨지지 않게 BOM
      await api.writeText(path, "﻿" + VALUE_LOG_HEADER);
      vlogPrev.current = new Map();
      vlogBuf.current = "";
      setVlog({ path, onChange: vlogMode, lines: 0 });
    } catch (e) {
      setError(String(e));
    }
  }

  // ---- 표 고치기
  const rereadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patchTable = useCallback((id: number, patch: Partial<PollTable>) => {
    const cur = tablesRef.current.find((x) => x.id === id);
    // 읽는 범위(국번·함수·시작·개수)가 바뀌면 앞 값은 다른 주소의 것 — 지우고, 연결 중이면 곧바로 한 번 읽는다
    const moved = !!cur && (["unit", "fc", "start", "qty"] as const).some((k) => k in patch && patch[k] !== cur[k]);
    if (moved) {
      const { [id]: _gone, ...rest } = resultsRef.current;
      void _gone;
      resultsRef.current = rest;
      setResults(rest);
      vlogPrev.current.delete(id);
      if (connectedRef.current) {
        if (rereadTimer.current) clearTimeout(rereadTimer.current);
        rereadTimer.current = setTimeout(() => api.readOnce(id).catch(() => {}), 400);
      }
    }
    setTables((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);
  function addTable(from?: Partial<PollTable>) {
    const nt = newTable(tables, from);
    setTables([...tables, nt]);
    setSelId(nt.id);
    setSelAddr(null);
    return nt;
  }
  function deleteTable(id: number) {
    const idx = tables.findIndex((x) => x.id === id);
    const gone = tables[idx];
    if (!gone || tables.length < 2) return;
    const rest = tables.filter((x) => x.id !== id);
    setTables(rest);
    if (sel.id === id) setSelId(rest[Math.min(idx, rest.length - 1)].id);
    const goneTrends = trendKeys.filter((k) => k.startsWith(`${id}:`));
    setTrendKeys((k) => k.filter((x) => !x.startsWith(`${id}:`)));
    toast.show(fill(t("deletedTable"), { a: tableLabel(gone, idx, t("tableWord")) }), {
      undo: () => {
        setTables((list) => {
          const back = [...list];
          back.splice(Math.min(idx, back.length), 0, gone);
          return back;
        });
        setTrendKeys((k) => [...k, ...goneTrends].slice(0, MAX_TRENDS));
        setSelId(id);
      },
    });
  }
  function changeFc(fc: Fc) {
    const q = Math.min(sel.qty, maxQty(fc), 65536 - sel.start);
    if (q < sel.qty) toast.show(fill(t("qtyClamped"), { a: fcHex(fc), b: maxQty(fc) }));
    patchTable(sel.id, { fc, qty: q });
  }

  // ---- 값 보기
  const res = results[sel.id];
  const bits = isBitFc(sel.fc);
  const pts = bits ? undefined : sel.points;
  const items = useMemo(() => layout(sel.start, Math.min(sel.qty, maxQty(sel.fc), 65536 - sel.start), pts), [sel.start, sel.qty, sel.fc, pts]);
  const label = useCallback((a: number) => addrLabel(sel.fc, a, addrMode), [sel.fc, addrMode]);
  const regsOfItem = (it: Item) => (res?.values ? res.values.slice(it.addr - sel.start, it.addr - sel.start + it.span) : []);
  const textOf = (it: Item) => (res?.values ? showValue(regsOfItem(it), shapeOf(sel.fc, it.point), sel.format) : "—");
  const stale = !!res && res.outcome.result !== "ok";
  const tableStats = stats?.tables[String(sel.id)];

  // ---- 쓰기 창·칸 설정 창
  const [writeAt, setWriteAt] = useState<number | null>(null);
  const [pointAt, setPointAt] = useState<number | null>(null);
  function openWrite(a: number) {
    setSelAddr(a);
    if (!writableFc(sel.fc)) {
      toast.show(t("readOnly"), { error: true });
      return;
    }
    setWriteAt(a);
  }
  const doWrite = useCallback(
    (table: PollTable, start: number, values: number[], multi: boolean) =>
      new Promise<Outcome>((resolve) => {
        const token = ++writeSeq.current;
        const done = (o: Outcome, rttMs: number) => {
          if (o.result === "ok" || o.result === "broadcast") toast.show(fill(dict[langRef.current].wOk, { a: addrLabel(table.fc, start, addrModeRef.current), ms: fmtMs(rttMs) }));
          resolve(o);
        };
        pendingWrites.current.set(token, done);
        api.write(token, table.id, { unit: table.unit, bits: table.fc === 1, start, values, forceMulti: multi }).catch((e) => {
          pendingWrites.current.delete(token);
          resolve({ result: "send-error", why: String(e) });
        });
      }),
    [toast],
  );
  function savePoint(a: number, p: Point | null) {
    const list = sel.points.filter((q) => q.addr !== a);
    const plain = !p || (p.type === "u16" && !p.name && p.order === "ABCD");
    patchTable(sel.id, { points: plain ? list : [...list, p!].sort((x, y) => x.addr - y.addr) });
    setPointAt(null);
  }

  // ---- CSV
  async function exportTable() {
    const path = await save({ defaultPath: `modbus-master-${tableLabel(sel, selIndex, "table").replace(/[\\/:*?"<>|\s]+/g, "-")}.csv`, filters: [{ name: "CSV (Excel)", extensions: ["csv"] }] });
    if (!path) return;
    try {
      await api.writeText(path, exportCsv(sel, res?.values ?? null));
      toast.show(fill(t("exported"), { a: path.split(/[\\/]/).pop() ?? path }));
    } catch (e) {
      setError(String(e));
    }
  }
  async function importTable() {
    const path = await openDialog({ filters: [{ name: "CSV", extensions: ["csv", "txt"] }] });
    if (!path || Array.isArray(path)) return;
    try {
      const r = importCsv(await api.readText(path), sel, lang);
      if (r.errors.length) throw new Error(`${t("csvBad")}\n${r.errors.join("\n")}`);
      patchTable(sel.id, { points: r.points });
      const parts = [fill(t("csvDone"), { n: r.used })];
      if (r.skipped) parts.push(fill(t("csvSkipped"), { n: r.skipped }));
      if (r.outside) parts.push(fill(t("csvOutside"), { n: r.outside }));
      toast.show(parts.join(" · "), r.skipped || r.outside ? { ms: 6000 } : {});
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // ---- 장비 프로필(내장 레지스터 맵) — 함수 코드별로 이어진 칸을 표 하나로, 국번은 장비 기본값
  const [showDevice, setShowDevice] = useState(false);
  function applyDevice(d: Device, o: DeviceApplyOpts) {
    const groups = pollGroups(d, lang, o.joinGaps ? JOIN_GAP : 0);
    if (!groups.length) return;
    let list = tables;
    const added: PollTable[] = [];
    for (const g of groups) {
      const nt = newTable(list, { name: g.name, unit: d.comm.unit ?? 1, fc: g.fc, start: g.start, qty: g.qty, points: isBitFc(g.fc) ? [] : g.points });
      list = [...list, nt];
      added.push(nt);
    }
    setTables(list);
    setSelId(added[0].id);
    setSelAddr(null);
    setShowDevice(false);
    const msgs = [fill(t("devLoaded"), { a: deviceName(d, lang), n: added.length })];
    const sd = serialDefaults(d);
    if (o.comm && Object.keys(sd).length) {
      const next = { ...cfg, ...sd };
      setCfg(next);
      msgs.push(fill(t("devCommSet"), { a: `${next.baud} ${next.dataBits}${next.parity === "odd" ? "O" : next.parity === "even" ? "E" : "N"}${next.stopBits}` }));
    }
    toast.show(msgs.join(" · "), { ms: 6000 });
  }

  // ---- 추세
  const selKey = selAddr != null ? trendKey(sel.id, selAddr) : null;
  function toggleTrend() {
    if (!selKey) return toast.show(t("trendPick"));
    if (trendKeys.includes(selKey)) return setTrendKeys(trendKeys.filter((k) => k !== selKey));
    if (trendKeys.length >= MAX_TRENDS) return toast.show(fill(t("trendMax"), { n: MAX_TRENDS }), { error: true });
    setTrendKeys([...trendKeys, selKey]);
  }
  const trendItems: TrendItem[] = trendKeys.map((k) => {
    const [tid, a] = k.split(":").map(Number);
    const tb = tables.find((x) => x.id === tid);
    if (!tb) return { key: k, label: `${k} ${t("trendGone")}`, series: undefined, last: "—" };
    const pt = isBitFc(tb.fc) ? undefined : tb.points.find((q) => q.addr === a);
    const r = results[tid];
    const regs = r?.values ? r.values.slice(a - tb.start, a - tb.start + (pt ? pointRegs(pt) : 1)) : [];
    const name = tableLabel(tb, tables.indexOf(tb), t("tableWord"));
    return { key: k, label: `${name} · ${addrLabel(tb.fc, a, addrMode)}${pt?.name ? ` ${pt.name}` : ""}`, series: series.current.get(k), last: r?.values ? showValue(regs, shapeOf(tb.fc, pt), tb.format) : "—" };
  });

  // ---- 찾기
  async function startScan(kind: "ids" | "addrs", run: () => Promise<void>, unit = 1, fc: Fc = 3) {
    setScan({ ...NO_SCAN, kind, running: true, unit, fc });
    try {
      await run();
    } catch (e) {
      setScan((s) => ({ ...s, running: false, finished: { found: 0, cancelled: false, stopped: String(e) } }));
    }
  }

  // ---- 단축키: F4 연결·끊기, Ctrl+L 기록 지우기, Ctrl+S 표 CSV 저장, Ctrl+Shift+L 파일 기록, F6 한 번 읽기, F8 폴링 멈춤
  const startable = transport === "serial" ? ports.some((p) => p.name === cfg.port) : !!net.host.trim() && net.port > 0;
  const runDisabled = connecting || (!connected && !startable);
  /** «한 번 읽기» — RTU 국번 0 표는 백엔드가 조용히 건너뛰므로 여기서 알린다 */
  function readOnceSel() {
    if (broadcastRead(sel, wire)) return toast.show(t("bcastRead"), { error: true });
    void api.readOnce(sel.id).catch((e) => setError(String(e)));
  }
  useShortcuts([
    { key: "F4", run: () => !runDisabled && void (connected ? disconnect() : connect()) },
    { key: "l", ctrl: true, run: () => trafficApi.current?.clear() },
    { key: "l", ctrl: true, shift: true, run: () => connected && void toggleLog() },
    { key: "s", ctrl: true, run: () => void exportTable() },
    { key: "F6", run: () => connected && readOnceSel() },
    { key: "F8", run: () => setPaused((p) => !p) },
  ]);
  useExitGuard(connected || !!logPath || !!vlog, settings.confirmExit, lang, APP);
  const clearError = useCallback(() => setError(null), []);
  const onCopied = (ok: boolean, n: number) => toast.show(ok ? ui(lang, "copied", { n }) : ui(lang, "copyFail"), { error: !ok });

  // ---- 창 제목: «COM3 9600 · 국번 1 · 표 2 — PortDock Modbus Master»
  const statusKey = `status_${status}` as Key;
  const parityCh = cfg.parity === "odd" ? "O" : cfg.parity === "even" ? "E" : "N";
  const trName = transport === "tcp" ? "Modbus TCP" : "RTU over TCP";
  const where = tcp ? `${net.host.trim()}:${net.port}` : `${cfg.port} ${cfg.baud}`;
  useWindowTitle(
    windowTitle(APP, connected ? [where, fill(t("titleUnit"), { a: sel.unit }), fill(t("titleTables"), { n: tables.length }), status !== "connected" && t(statusKey)] : [], !!logPath),
  );
  const summaryLine = tcp
    ? `${trName} ${net.host}:${net.port} · ${t(statusKey)}`
    : `${cfg.port || t("noPorts")} ${cfg.baud} ${cfg.dataBits}${parityCh}${cfg.stopBits} · ${t(statusKey)}`;
  const runLabel = connected ? t("disconnect") : t("connect");
  const total = stats?.total;

  // 값 칸 — 값·칸 설정·보기가 바뀔 때만 다시 그린다
  const regsView = useMemo(() => {
    const cell = (it: Item) => {
      const key = trendKey(sel.id, it.addr);
      const p = it.point;
      const name = p?.name ?? "";
      const changed = !!res && Array.from({ length: it.span }, (_, k) => res.changed.has(it.addr - sel.start + k)).some(Boolean);
      const text = textOf(it);
      const tag = !p || bits ? "" : p.type === "u16" ? (p.order !== "ABCD" ? p.order : "") : `${p.type === "string" ? `STR(${p.len ?? 2})` : TYPE_LABEL[p.type]}${p.order !== "ABCD" ? ` ${p.order}` : ""}`;
      return { key, name, changed, text, tag, trended: trendKeys.includes(key) };
    };
    const common = (it: Item) => ({
      onClick: () => setSelAddr(it.addr),
      onDoubleClick: () => openWrite(it.addr),
      onKeyDown: (e: KeyEv) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          openWrite(it.addr);
        }
      },
      onContextMenu: (e: MouseEv) => {
        e.preventDefault();
        setSelAddr(it.addr);
        setPointAt(it.addr);
      },
    });
    const range = (it: Item) => (it.span > 1 ? `${label(it.addr)}–${label(it.addr + it.span - 1)}` : label(it.addr));
    return (
      <div className={`regs${sel.view === "list" ? " list" : ""}${stale ? " stale" : ""}`}>
        {sel.view === "grid" ? (
          items.map((it) => {
            const c = cell(it);
            return (
              <div
                key={`${sel.id}:${it.addr}`}
                className={`reg${c.changed ? " flash" : ""}${it.span > 1 ? " wide" : ""}${selAddr === it.addr ? " picked" : ""}`}
                style={it.span > 1 ? { gridColumn: `span ${it.span >= 4 ? 3 : 2}` } : undefined}
                tabIndex={0}
                role="button"
                aria-label={`${range(it)} ${c.name} ${c.text}`}
                title={c.name ? `${c.name} — ${t("cellTip")}` : t("cellTip")}
                {...common(it)}
              >
                <span className="addr">{label(it.addr)}</span>
                {c.name && <span className="rname">{c.name}</span>}
                <span className={`rv${bits ? (c.text === "1" ? " bit on" : " bit") : ""}`}>{c.text}</span>
                {c.tag && <span className="rtype">{c.tag}</span>}
                {c.trended && <span className="trendmark">📈</span>}
              </div>
            );
          })
        ) : (
          <table className="rtable">
            <thead>
              <tr>
                <th>{t("colAddr")}</th>
                <th>{t("colName")}</th>
                <th>{t("colType")}</th>
                <th>{t("colValue")}</th>
                <th>{t("colRaw")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const c = cell(it);
                const sh = shapeOf(sel.fc, it.point);
                const raw = res?.values ? regsOfItem(it).map((v) => (bits ? String(v) : v.toString(16).toUpperCase().padStart(4, "0"))).join(" ") : "";
                return (
                  <tr
                    key={`${sel.id}:${it.addr}`}
                    className={`${c.changed ? "flash" : ""}${selAddr === it.addr ? " picked" : ""}`}
                    tabIndex={0}
                    aria-label={`${range(it)} ${c.name} ${c.text}`}
                    title={t("cellTip")}
                    {...common(it)}
                  >
                    <td className="addr">{range(it)}</td>
                    <td className="rname">{c.name}</td>
                    <td className="rtype">
                      {bits ? "BIT" : sh.type === "u16" ? sel.format.toUpperCase() : TYPE_LABEL[sh.type]}
                      {!bits && sh.order !== "ABCD" ? ` ${sh.order}` : ""}
                    </td>
                    <td className="rval mono">
                      {c.text}
                      {c.trended ? " 📈" : ""}
                    </td>
                    <td className="rraw mono">{raw}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, res, sel.id, sel.view, sel.format, sel.fc, sel.start, addrMode, lang, selAddr, trendKeys, bits, stale]);

  const lastLine = broadcastRead(sel, wire) ? (
    <span className="hint warn" role="status">
      ⚠ {t("bcastRead")}
    </span>
  ) : !res ? (
    <span className="hint">{connected ? t("notRead") : ""}</span>
  ) : res.outcome.result === "ok" ? (
    <span className="hint ok">
      ✓ {fill(t("lastRead"), { t: stamp(res.ts).slice(11), ms: fmtMs(res.rttMs) })}
    </span>
  ) : (
    <span className="hint warn" role="status">
      ⚠ {outcomeText(res.outcome, lang)} · {stamp(res.ts).slice(11)}
      {res.values ? ` · ${t("stale")}` : ""}
    </span>
  );
  const writeItem = writeAt == null ? undefined : items.find((x) => x.addr === writeAt);
  const pointItem = pointAt == null ? undefined : items.find((x) => x.addr === pointAt);

  return (
    <div className={showSide ? "app show-side" : "app"}>
      <SideBackdrop open={showSide} onClose={() => setShowSide(false)} />
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>Modbus Master</small>
          </span>
          <span className="brand-tools">
            <select className="lang" aria-label={lang === "ko" ? "언어" : "Language"} value={lang} onChange={(e) => update({ lang: e.target.value as Lang })}>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
            <PinButton lang={lang} on={settings.alwaysOnTop} onToggle={(v) => update({ alwaysOnTop: v })} />
            <ReportButton app={APP} lang={lang} frames={() => traffic.current} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} usageAsked={settings.usageAsked} onUsage={(on) => update({ usageStats: on, usageAsked: true })} />
            <button className="icon-btn" onClick={openHelp} title={t("helpTip")} aria-label={t("helpTip")}>
              ?
            </button>
            <button className="icon-btn" onClick={() => setShowSettings(true)} title={ui(lang, "settings")} aria-label={ui(lang, "settings")}>
              ⚙
            </button>
            <SideClose lang={lang} onClose={() => setShowSide(false)} />
          </span>
        </div>

        <label data-tip={tip(lang, "mmTransport")}>
          {t("transport")}
          <select value={transport} disabled={connected} title={connected ? t("lockedHint") : ""} onChange={(e) => setTransport(e.target.value as Transport)}>
            <option value="serial">{t("trSerial")}</option>
            <option value="tcp">{t("trTcp")}</option>
            <option value="rtu-tcp">{t("trRtuTcp")}</option>
          </select>
        </label>
        {transport === "serial" ? (
          <>
            <label data-tip={tip(lang, "port")}>
              {t("port")}
              <select
                className="port-sel"
                value={cfg.port}
                disabled={connected}
                title={connected ? t("lockedHint") : ""}
                onChange={(e) => {
                  setCfg({ ...cfg, port: e.target.value });
                  setPortNotice(null);
                }}
              >
                {ports.length === 0 && <option value="">{t("noPorts")}</option>}
                {ports.map((p) => (
                  <option key={p.name} value={p.name}>
                    {(p.product ?? p.manufacturer) ? `${p.name} — ${p.product ?? p.manufacturer}` : p.name}
                  </option>
                ))}
              </select>
            </label>
            {portNotice && !connected && <div className="hint warn">{portNotice}</div>}
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
            <label className="inline" data-tip={tip(lang, "autoReconnect")}>
              <input type="checkbox" checked={cfg.autoReconnect} disabled={connected} onChange={(e) => setCfg({ ...cfg, autoReconnect: e.target.checked })} /> {t("autoReconnect")}
            </label>
          </>
        ) : (
          <>
            <div className="grid2 net">
              <label data-tip={tip(lang, "mmHost")}>
                {t("host")}
                <input className={net.host.trim() ? "" : "bad"} value={net.host} disabled={connected} spellCheck={false} onChange={(e) => setNet({ ...net, host: e.target.value })} />
              </label>
              <label data-tip={tip(lang, "mmNetPort")}>
                {t("netPort")}
                <NumInput min={1} max={65535} value={net.port} disabled={connected} onValue={(n) => setNet({ ...net, port: n })} />
              </label>
            </div>
            {!net.host.trim() && <div className="interlock">{t("hostEmpty")}</div>}
            <label className="inline" data-tip={tip(lang, "autoReconnect")}>
              <input type="checkbox" checked={net.autoReconnect} disabled={connected} onChange={(e) => setNet({ ...net, autoReconnect: e.target.checked })} /> {t("autoReconnect")}
            </label>
          </>
        )}
        <details className="adv panel comm" open={commOpen} onToggle={(e) => setCommOpen((e.target as HTMLDetailsElement).open)}>
          <summary data-tip={tip(lang, "mmComm")}>
            <span className="sum-title">{t("commDetail")}</span>
            {!commOpen && (
              <span className="sum-note">
                {fill(t("commSummary"), { a: timing.timeoutMs, b: timing.retries, c: timing.delayMs })}
                {forceMulti ? ` · ${t("forceMultiShort")}` : ""}
              </span>
            )}
          </summary>
          <div className="grid3 timing">
            <label data-tip={tip(lang, "mmTimeout")}>
              {t("timeout")}
              <NumInput min={10} max={60000} value={timing.timeoutMs} onValue={(n) => setTiming({ ...timing, timeoutMs: n })} />
            </label>
            <label data-tip={tip(lang, "mmRetries")}>
              {t("retries")}
              <NumInput min={0} max={10} value={timing.retries} onValue={(n) => setTiming({ ...timing, retries: n })} />
            </label>
            <label data-tip={tip(lang, "mmDelay")}>
              {t("delay")}
              <NumInput min={0} max={60000} value={timing.delayMs} onValue={(n) => setTiming({ ...timing, delayMs: n })} />
            </label>
          </div>
          <label className="inline" data-tip={tip(lang, "mmForceMulti")}>
            <input type="checkbox" checked={forceMulti} onChange={(e) => setForceMulti(e.target.checked)} /> {t("forceMulti")}
          </label>
        </details>
        <button data-tip={withKey(tip(lang, connected ? "disconnect" : "connect"), KEYS.connect)} className={connected ? "btn danger" : "btn primary"} onClick={connected ? disconnect : connect} disabled={runDisabled}>
          {runLabel}
        </button>
        {connected && <span className="lock-note">🔒 {t("lockedHint")}</span>}
        {connectErr && !connected ? (
          <div className="status s-failed" role="alert">
            <b>{t("connectFailed")}</b> · {connectErr}
            {/busy|in use|denied|사용 중|거부/i.test(connectErr) && <div>{t("busyHint")}</div>}
          </div>
        ) : (
          <div className={`status s-${status}`}>
            {t(statusKey)}
            {statusMsg ? ` · ${statusMsg}` : ""}
            {scan.running && <div className="scan-note">{fill(t("scanSideRunning"), { d: scan.done, t: scan.total || "…" })}</div>}
          </div>
        )}
        <label className="inline" data-tip={withKey(tip(lang, "mmPauseAll"), "F8")}>
          <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} /> {t("pauseAll")}
        </label>
        <button className="btn small" onClick={() => setShowScan(true)} data-tip={tip(lang, "mmScan")}>
          {t("scan")}
        </button>


        <hr />
        <details className="adv panel stats-fold" open={statsOpen} onToggle={(e) => setStatsOpen((e.target as HTMLDetailsElement).open)}>
          <summary data-tip={tip(lang, "mmStats")}>
            <span className="sum-title">{t("stats")}</span>
            {!statsOpen &&
              (total ? (
                <span className={total.timeouts || total.exceptions || total.crc || total.bad ? "sum-note bad" : "sum-note"}>
                  {fill(t("statsSummary"), { a: total.requests, b: total.timeouts + total.exceptions + total.crc + total.bad })}
                </span>
              ) : (
                <span className="sum-note">{t("statsNone")}</span>
              ))}
          </summary>
          {total && (
            <table className="stats">
              <tbody>
                <tr>
                  <td>{t("stReq")}</td>
                  <td>{total.requests}</td>
                </tr>
                <tr>
                  <td>{t("stOk")}</td>
                  <td>{total.ok}</td>
                </tr>
                <tr className={total.timeouts ? "warnrow" : ""}>
                  <td>{t("stTimeout")}</td>
                  <td>{total.timeouts}</td>
                </tr>
                <tr className={(transport === "tcp" ? total.bad : total.crc) ? "warnrow" : ""}>
                  <td>{transport === "tcp" ? `MBAP · ${t("stBad")}` : t("stCrc")}</td>
                  <td>{transport === "tcp" ? total.bad : total.crc}</td>
                </tr>
                <tr className={total.exceptions ? "warnrow" : ""}>
                  <td>{t("stExc")}</td>
                  <td>{total.exceptions}</td>
                </tr>
                {transport !== "tcp" && total.bad > 0 && (
                  <tr className="warnrow">
                    <td>{t("stBad")}</td>
                    <td>{total.bad}</td>
                  </tr>
                )}
                {total.sendErrors > 0 && (
                  <tr className="warnrow">
                    <td>{t("stSend")}</td>
                    <td>{total.sendErrors}</td>
                  </tr>
                )}
                <tr>
                  <td>
                    {t("stAvg")} / {t("stMax")}
                  </td>
                  <td>
                    {fmtMs(total.avgMs)} / {fmtMs(total.maxMs)} ms
                  </td>
                </tr>
              </tbody>
            </table>
          )}
          <button data-tip={tip(lang, "reset")} className="btn small" onClick={() => api.resetStats().catch(() => {})} disabled={!connected}>
            {t("reset")}
          </button>
        </details>
      </aside>

      <main className="main">
        <NarrowBar lang={lang} open={showSide} onToggle={() => setShowSide(!showSide)} dot={connectErr && !connected ? "s-disconnected" : `s-${status}`} summary={summaryLine}>
          <button className={connected ? "btn small danger" : "btn small primary"} onClick={connected ? disconnect : connect} disabled={runDisabled} data-tip={withKey(tip(lang, connected ? "disconnect" : "connect"), KEYS.connect)}>
            {runLabel}
          </button>
        </NarrowBar>
        <div className="toolbar tabs" role="tablist" aria-label={t("tableWord")}>
          {tables.map((tb, i) => {
            const n = errorCount(stats?.tables[String(tb.id)]);
            const r = results[tb.id];
            const bad = !!r && r.outcome.result !== "ok";
            return (
              <span key={tb.id} className={tb.id === sel.id ? "tab on" : "tab"}>
                <button
                  className="tab-btn"
                  role="tab"
                  aria-selected={tb.id === sel.id}
                  onClick={() => {
                    setSelId(tb.id);
                    setSelAddr(null);
                  }}
                  title={`${tableLabel(tb, i, t("tableWord"))} · ID ${tb.unit} · FC${fcHex(tb.fc)} · ${addrLabel(tb.fc, tb.start, addrMode)} (${tb.qty})`}
                >
                  {broadcastRead(tb, wire) && (
                    <span className="bcast-mark" title={t("bcastRead")} aria-label={t("bcastRead")}>
                      ⚠{" "}
                    </span>
                  )}
                  {!tb.enabled || tb.intervalMs === 0 ? "⏸ " : bad ? "● " : ""}
                  {tableLabel(tb, i, t("tableWord"))}
                  <small> {tb.unit}·{fcHex(tb.fc)}</small>
                  {/* 빨강은 «지금 실패 중» 일 때만 — 고친 뒤에는 회색 누적 수(통계 «초기화» 로 지움) */}
                  {n > 0 && (
                    <span className={bad ? "err-badge" : "err-badge old"} title={`${t(bad ? "badgeNow" : "badgeOld")} · ${t("stTimeout")}·${t("stCrc")}·${t("stExc")}`}>
                      {n > 999 ? "999+" : n}
                    </span>
                  )}
                </button>
                {tables.length > 1 && (
                  <button className="tab-x" aria-label={`${t("delTable")} ${tableLabel(tb, i, t("tableWord"))}`} title={t("delTable")} onClick={() => deleteTable(tb.id)}>
                    ×
                  </button>
                )}
              </span>
            );
          })}
          <button className="btn small" onClick={() => addTable()} data-tip={tip(lang, "mmAddTable")}>
            {t("addTable")}
          </button>
          <button className="btn small" onClick={() => addTable({ ...sel, name: sel.name ? `${sel.name} (2)` : "" })} data-tip={tip(lang, "mmDupTable")}>
            {t("dupTable")}
          </button>
        </div>
        <div className="toolbar tcfg">
          <label className="inline" data-tip={tip(lang, "mmTableName")}>
            {t("tableName")}
            <input className="tname" value={sel.name} maxLength={40} placeholder={`${t("tableWord")} ${selIndex + 1}`} onChange={(e) => patchTable(sel.id, { name: e.target.value })} />
          </label>
          <label className="inline" data-tip={tip(lang, "mmUnit")}>
            {t("unit")}
            <NumInput className="num" min={minUnit(wire)} max={255} value={sel.unit} onValue={(n) => patchTable(sel.id, { unit: n })} />
          </label>
          <label className="inline" data-tip={tip(lang, "mmFc")}>
            {t("fc")}
            <select value={sel.fc} onChange={(e) => changeFc(Number(e.target.value) as Fc)}>
              {FCS.map((f) => (
                <option key={f} value={f}>
                  {t(`fc${f}` as Key)}
                </option>
              ))}
            </select>
          </label>
          <label className="inline" data-tip={tip(lang, "mmStart")}>
            {t("start")}
            <AddrInput
              key={`${sel.id}:${addrMode}`}
              text={label(sel.start)}
              onCommit={(s) => {
                const r = parseAddr(s, addrMode, sel.fc);
                const guess = plcGuess(s, addrMode, sel.fc);
                setPlcNote(guess ? { id: sel.id, text: s.trim(), ...guess } : null);
                if (!r) {
                  // 0 기준에서 65535 를 넘는 410000 같은 수 — 오류 대신 알림줄의 «PLC 표기로 바꾸기» 로
                  if (guess) return false;
                  toast.show(fill(t("startBad"), { a: s }), { error: true });
                  return false;
                }
                const fcNow = r.fc;
                const q = Math.min(sel.qty, maxQty(fcNow), 65536 - r.start);
                if (fcNow !== sel.fc) toast.show(fill(t("fcSwitched"), { a: s.trim(), b: t(`fc${fcNow}` as Key) }));
                patchTable(sel.id, { start: r.start, fc: fcNow, qty: q });
                return true;
              }}
            />
          </label>
          <label className="inline" data-tip={tip(lang, "mmQty")}>
            {t("qty")}
            <NumInput className="num" min={1} max={Math.min(maxQty(sel.fc), 65536 - sel.start)} value={sel.qty} onValue={(n) => patchTable(sel.id, { qty: n })} />
          </label>
          <label className="inline" data-tip={tip(lang, "mmInterval")}>
            {t("interval")}
            <NumInput className="num" min={0} max={86400000} value={sel.intervalMs} onValue={(n) => patchTable(sel.id, { intervalMs: n > 0 && n < 10 ? 10 : n })} />
          </label>
          <label className="inline" data-tip={tip(lang, "mmPolling")}>
            <input type="checkbox" checked={sel.enabled} onChange={(e) => patchTable(sel.id, { enabled: e.target.checked })} /> {t("polling")}
          </label>
          <button className="btn small" disabled={!connected} onClick={readOnceSel} data-tip={withKey(tip(lang, "mmReadOnce"), "F6")}>
            {t("readOnce")}
          </button>
        </div>
        {plcNote && plcNote.id === sel.id && addrMode !== "plc" && (
          <div className="notice warn plc-note" role="status">
            <span>
              {fill(t("plcNote"), {
                a: plcNote.text,
                b: addrMode === "zero" ? t("amZero") : t("amOne"),
                c: plcNote.start,
                f: fcHex(plcNote.fc),
              })}
            </span>
            <button
              className="btn small"
              onClick={() => {
                setAddrMode("plc");
                patchTable(sel.id, { start: plcNote.start, fc: plcNote.fc, qty: Math.min(sel.qty, maxQty(plcNote.fc), 65536 - plcNote.start) });
                setPlcNote(null);
              }}
            >
              {t("toPlc")}
            </button>
            <button className="btn small ghost" aria-label={ui(lang, "closeNote")} title={ui(lang, "closeNote")} onClick={() => setPlcNote(null)}>
              ✕
            </button>
          </div>
        )}
        {broadcastRead(sel, wire) && (
          <div className="notice warn" role="status">
            <span>{t("bcastNote")}</span>
            <button className="btn small" onClick={() => patchTable(sel.id, { unit: 1 })}>
              {t("bcastFix")}
            </button>
          </div>
        )}
        <div className="toolbar tview">
          {!bits && (
            <label className="inline" data-tip={tip(lang, "mmFormat")}>
              {t("format")}
              <select
                className="fmt-sel"
                value={sel.format}
                onChange={(e) => {
                  if (e.target.value !== "__point") return patchTable(sel.id, { format: e.target.value as Format });
                  // 표 전체 표시가 아니라 칸마다 정하는 형식(32비트·float·문자열) — 고른 칸(없으면 첫 칸)의 형식 창을 연다
                  e.target.value = sel.format;
                  const it = items.find((x) => x.addr === selAddr) ?? items[0];
                  if (!it) return;
                  toast.show(fill(t("fmtTypedNote"), { a: label(it.addr) }));
                  setSelAddr(it.addr);
                  setPointAt(it.addr);
                }}
              >
                <option value="u16">U16</option>
                <option value="s16">S16</option>
                <option value="hex">HEX</option>
                <option value="bin">BIN</option>
                <option value="__point">{t("fmtTyped")}</option>
              </select>
            </label>
          )}
          <label className="inline" data-tip={tip(lang, "mmAddrMode")}>
            {t("addrMode")}
            <select value={addrMode} onChange={(e) => setAddrMode(e.target.value as AddrMode)}>
              <option value="zero">{t("amZero")}</option>
              <option value="one">{t("amOne")}</option>
              <option value="plc">{t("amPlc")}</option>
            </select>
          </label>
          <span className="segs" role="group" aria-label={t("view")} data-tip={tip(lang, "regView")}>
            {(["grid", "list"] as const).map((v) => (
              <button key={v} className={sel.view === v ? "seg on" : "seg"} aria-pressed={sel.view === v} onClick={() => patchTable(sel.id, { view: v })}>
                {v === "grid" ? t("viewGrid") : t("viewList")}
              </button>
            ))}
          </span>
          <button className={selKey && trendKeys.includes(selKey) ? "btn small on" : "btn small"} onClick={toggleTrend} data-tip={tip(lang, "mmTrendAdd")}>
            {t("trendAdd")}
          </button>
          <span className="grow" />
          {/* 값 기록(CSV) — 왼쪽 칸에서 표 도구줄로(10/18). 기록 중이면 빨간 «● 값 기록 n줄» */}
          <button
            ref={vlogBtn}
            className={vlog ? "btn small danger vlog-btn" : "btn small vlog-btn"}
            onClick={() => setVlogPop((o) => !o)}
            aria-expanded={vlogPop}
            title={vlog?.path}
            data-tip={tip(lang, "mmValueLog")}
          >
            {vlog ? fill(t("vlBtnOn"), { n: vlog.lines }) : t("vlBtn")} ▾
          </button>
          {vlogPop && (
            <Popover anchor={vlogBtn.current} onClose={() => setVlogPop(false)} label={t("valueLog")} className="vlog-pop">
              <b>{t("valueLog")}</b>
              <span className="segs" role="group" aria-label={t("valueLog")}>
                {([false, true] as const).map((v) => (
                  <button key={String(v)} className={vlogMode === v ? "seg on" : "seg"} aria-pressed={vlogMode === v} onClick={() => setVlogMode(v)} data-tip={tip(lang, v ? "mmVlChange" : "mmVlEvery")}>
                    {v ? t("vlChange") : t("vlEvery")}
                  </button>
                ))}
              </span>
              <div className="pop-row">
                <button
                  className={vlog ? "btn small danger" : "btn small primary"}
                  onClick={() => {
                    setVlogPop(false);
                    void toggleValueLog();
                  }}
                  data-tip={tip(lang, "mmValueLog")}
                >
                  {vlog ? t("vlStop") : t("vlStart")}
                </button>
              </div>
              {vlog && <div className="hint ellipsis" title={vlog.path}>{fill(t("vlLines"), { n: vlog.lines, a: vlog.path.split(/[\\/]/).pop() ?? vlog.path })}</div>}
            </Popover>
          )}
          <button className="btn small" onClick={exportTable} data-tip={withKey(tip(lang, "mmExportCsv"), KEYS.save)}>
            {t("exportCsv")}
          </button>
          <button className="btn small" onClick={importTable} data-tip={tip(lang, "mmImportCsv")}>
            {t("importCsv")}
          </button>
          <button className="btn small" onClick={() => setShowDevice(true)} data-tip={tip(lang, "mmDevice")}>
            {t("devProfile")}
          </button>
        </div>
        <div className="tstat">
          {lastLine}
          {paused && <span className="hint warn">⏸ {t("pausedNote")}</span>}
          <span className="grow" />
          {tableStats && (
            <span className="tstat-n mono" data-tip={tip(lang, "mmTableStats")}>
              {t("stReq")} {tableStats.requests} · {t("stOk")} {tableStats.ok}
              <span className={tableStats.timeouts ? "bad" : ""}>
                {" "}
                · {t("stTimeout")} {tableStats.timeouts}
              </span>
              <span className={tableStats.crc ? "bad" : ""}>
                {" "}
                · CRC {tableStats.crc}
              </span>
              <span className={tableStats.exceptions ? "bad" : ""}>
                {" "}
                · {t("stExc")} {tableStats.exceptions}
              </span>
              {tableStats.bad > 0 && (
                <span className="bad">
                  {" "}
                  · {t("stBad")} {tableStats.bad}
                </span>
              )}
              {" "}· {t("stAvg")} {fmtMs(tableStats.avgMs)} / {t("stMax")} {fmtMs(tableStats.maxMs)} ms
            </span>
          )}
        </div>

        {!connected && !firstDone && (
          <FirstCard lang={lang} className="mm-first" title={t("firstAsk")} onHide={() => setFirstDone(true)} links={[{ id: "start", label: t("firstHelp") }]} onHelp={setShowHelp}>
            <div className="first-picks">
              <button type="button" className={transport === "tcp" ? "btn small first-tcp on" : "btn small first-tcp"} onClick={() => pickDevice("tcp")} data-tip={tip(lang, "mmFirstTcp")}>
                {t("firstTcp")}
              </button>
              <button type="button" className={transport === "serial" ? "btn small first-rtu on" : "btn small first-rtu"} onClick={() => pickDevice("serial")} data-tip={tip(lang, "mmFirstRtu")}>
                {t("firstRtu")}
              </button>
            </div>
            <div className="first-addr" role="group" aria-label={t("addrMode")} data-tip={tip(lang, "mmAddrMode")}>
              <span>{t("firstAddr")}</span>
              <span className="segs">
                {(["zero", "one", "plc"] as const).map((m) => (
                  <button key={m} type="button" className={addrMode === m ? "seg on" : "seg"} aria-pressed={addrMode === m} onClick={() => setAddrMode(m)}>
                    {t(m === "zero" ? "amZero" : m === "one" ? "amOne" : "amPlc")}
                  </button>
                ))}
              </span>
            </div>
            <div className="hint">{t("firstHint")}</div>
          </FirstCard>
        )}

        {regsView}

        {trendItems.length > 0 && <Trend lang={lang} items={trendItems} version={trendVer} onRemove={(k) => setTrendKeys(trendKeys.filter((x) => x !== k))} onClear={() => setTrendKeys([])} />}

        <Splitter lang={lang} onHeight={setTrafficH} />
        <Traffic
          height={trafficH}
          lang={lang}
          settings={settings}
          traffic={traffic}
          seqRef={seqRef}
          failCount={failCount}
          handle={trafficApi}
          connected={connected}
          logPath={logPath}
          onToggleLog={toggleLog}
          peers={false}
          error={error}
          onClearError={clearError}
          onCopied={onCopied}
        />
      </main>
      {writeAt != null && writeItem && (
        <WriteDialog
          lang={lang}
          bits={sel.fc === 1}
          unit={sel.unit}
          addr={writeAt}
          addrLabel={label}
          shape={shapeOf(sel.fc, writeItem.point)}
          format={sel.format}
          current={textOf(writeItem)}
          forceMulti={forceMulti}
          onForceMulti={setForceMulti}
          wire={wire}
          onWrite={(values, multi) => (connected ? doWrite(sel, writeAt, values, multi) : Promise.resolve<Outcome>({ result: "send-error", why: t("needConnect") }))}
          onClose={() => setWriteAt(null)}
        />
      )}
      {pointAt != null && pointItem && (
        <PointDialog lang={lang} bits={bits} addr={pointAt} addrLabel={label} points={sel.points} point={pointItem.point ?? sel.points.find((p) => p.addr === pointAt)} onSave={(p) => savePoint(pointAt, p)} onClose={() => setPointAt(null)} />
      )}
      {showScan && (
        <ScanDialog
          lang={lang}
          connected={connected}
          scan={scan}
          addrMode={addrMode}
          wire={wire}
          defaults={{ unit: sel.unit, fc: sel.fc, start: sel.start }}
          onStartIds={(c) => void startScan("ids", () => api.scanIds(c), 1, c.fc)}
          onStartAddrs={(c) => void startScan("addrs", () => api.scanAddrs(c), c.unit, c.fc)}
          onCancel={() => api.scanCancel().catch(() => {})}
          onUseId={(unit, fc, a) => {
            addTable({ unit, fc, start: a, qty: Math.min(10, maxQty(fc), 65536 - a), name: "", points: [] });
            setShowScan(false);
          }}
          onUseRange={(unit, fc, a, b) => {
            addTable({ unit, fc, start: a, qty: Math.min(b - a + 1, maxQty(fc)), name: "", points: [] });
            setShowScan(false);
          }}
          onClose={() => setShowScan(false)}
        />
      )}
      {showDevice && <DeviceDialog lang={lang} mode="master" onApply={applyDevice} onClose={() => setShowDevice(false)} />}
      {showHelp && <HelpDialog doc={help} lang={lang} app={APP} start={typeof showHelp === "string" ? showHelp : null} onClose={() => setShowHelp(false)} />}
      {showSettings && (
        <SettingsDialog app={APP} version={VERSION} settings={settings} update={update} reset={reset} onClose={() => setShowSettings(false)} writeText={api.writeText} readText={api.readText} busy={connected || !!logPath} />
      )}
      {toast.node}
    </div>
  );
}

/** 시작 주소 칸 — 지금 표기(0·1 기준·40001)로 쓰고 Enter·칸 벗어날 때 반영. 틀리면 원래 글로 */
function AddrInput({ text: shown, onCommit }: { text: string; onCommit: (s: string) => boolean }) {
  const [text, setText] = useState(shown);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(shown);
  }, [shown, editing]);
  const commit = () => {
    setEditing(false);
    if (text.trim() === shown) return;
    if (!onCommit(text)) setText(shown);
  };
  return (
    <input
      className="num addr-in mono"
      value={text}
      inputMode="numeric"
      spellCheck={false}
      onFocus={() => setEditing(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setText(shown);
        }
      }}
    />
  );
}
