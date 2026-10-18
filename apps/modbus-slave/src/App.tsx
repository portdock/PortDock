import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";
import { ask, open as openDialog, save } from "@tauri-apps/plugin-dialog";
import {
  api,
  EXCEPTIONS,
  TABLES,
  type DeviceId,
  type Faults,
  type FaultTarget,
  type Frame,
  type NetConfig,
  type Peer,
  type PortInfo,
  type SerialConfig,
  type SessionEvent,
  type Stats,
  type Table,
  type Transport,
} from "./api";
import {
  TABLE_IDS,
  addrBase,
  addrText,
  decodeValue,
  encodeValue,
  formatValue,
  isBits,
  isPlainPoint,
  layout,
  mergePoints,
  parseCsv,
  parseValue,
  pointRegs,
  rowPoint,
  simSummary,
  simToSpec,
  tableRows,
  toCsv,
  type AddrMode,
  type Item,
  type Point,
  type SimCfg,
  type SimSpec,
  type VType,
} from "./regmap";
import { CellDialog, typeLabel } from "./CellDialog";
import { Traffic, type TrafficHandle } from "./Traffic";
import { tip } from "@shared/tips";
import { ReportButton } from "@shared/ReportDialog";
import { noteError } from "@shared/report";
import { HelpDialog, useHelpKey } from "@shared/HelpDialog";
import { help } from "./help";
import { samePorts } from "@shared/framing";
import { autoLogPath, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { useToast } from "@shared/Toast";
import { KEYS, useShortcuts, withKey } from "@shared/shortcuts";
import { useWindowTitle, windowTitle } from "@shared/useWindowTitle";
import { PinButton } from "@shared/PinButton";
import { NarrowBar, SideBackdrop, SideClose } from "@shared/NarrowBar";
import { ui } from "@shared/uiText";
import { dict, type Key, type Lang } from "./i18n";
import "./App.css";

type Status = "idle" | "connected" | "listening" | "disconnected" | "reconnecting" | "closed";
type Format = "u16" | "s16" | "hex" | "bin";
type Range = { start: number; count: number };
type RegView = "grid" | "list";

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

/** 값이 바뀌면 localStorage 에 */
function usePersist(k: string, v: unknown) {
  useEffect(() => store(k, v), [k, v]);
}


/** 연결했던 장치 — COM 번호가 바뀌어도 같은 장치를 찾는 데 쓴다 */
type PortId = { vid: number | null; pid: number | null; serial: string | null };

/** 저장된 포트가 목록에 없으면 같은 장치(일련번호 → VID:PID)를, 없으면 첫 포트를 */
function pickPort(ports: PortInfo[], id: PortId | null) {
  const same =
    id &&
    ((id.serial && ports.find((p) => p.serial_number === id.serial && p.vid === id.vid && p.pid === id.pid)) ||
      (id.vid != null && ports.find((p) => p.vid === id.vid && p.pid === id.pid)));
  return (same || ports[0]).name;
}

/** 저장해 두는 표 값 — 슬레이브 → 표 → 주소 → 값. 0 이 아닌 칸만 */
type SavedValues = Record<string, Partial<Record<Table, Record<string, number>>>>;
const NO_TARGET: FaultTarget = { slaveIds: [], functions: [], addrFrom: null, addrTo: null, everyNth: 1, probability: 100 };
const NO_FAULTS: Faults = { delayMs: 0, delayMaxMs: 0, noResponse: false, forceException: 0, badCrc: false, badMbapLen: false, target: NO_TARGET };
const DEFAULT_DEVICE: DeviceId = { vendor: "PortDock", productCode: "Modbus Slave", revision: "1.0" };
/** 마스터가 쓸 수 있는 표 */
const WRITABLE: Table[] = ["coils", "holding-registers"];
const utf8Len = (s: string) => new TextEncoder().encode(s).length;

/** 장애 대상 칸 해석 — «1, 3» 국번, «03, 10» 함수 코드(HEX). 비면 []. 틀리면 null */
function parseList(text: string, hexMode: boolean): number[] | null {
  const toks = text.split(/[\s,;]+/).filter(Boolean);
  const out: number[] = [];
  for (const tok of toks) {
    const n = hexMode ? (/^(0x)?[0-9a-f]{1,2}$/i.test(tok) ? parseInt(tok.replace(/^0x/i, ""), 16) : NaN) : /^\d+$/.test(tok) ? Number(tok) : NaN;
    if (!Number.isInteger(n) || n < (hexMode ? 1 : 0) || n > (hexMode ? 0x7f : 255)) return null;
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

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
  // 아주 좁은 창(900px 이하)에서 왼쪽 연결 설정 칸을 펼칠지
  const [showSide, setShowSide] = useState(false);
  const toast = useToast(lang);

  // ---- 연결 방식: 시리얼(RTU) · TCP 서버(Modbus TCP) · TCP 서버(RTU over TCP)
  const [transport, setTransport] = useState<Transport>(() => {
    const v = load<Transport>("transport", "serial");
    return v === "tcp" || v === "rtu-tcp" ? v : "serial";
  });
  useEffect(() => {
    store("transport", transport);
  }, [transport]);
  const [net, setNet] = useState<NetConfig>(() => ({ host: "0.0.0.0", port: 502, ignoreUnitId: false, ...load<Partial<NetConfig>>("net", {}) }));
  useEffect(() => {
    store("net", net);
  }, [net]);
  const tcp = transport !== "serial";
  const [peers, setPeers] = useState<Peer[]>([]);
  const [local, setLocal] = useState<string | null>(null);

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

  const [status, setStatus] = useState<Status>("idle");
  // 백엔드가 준 설명(재연결 대기·닫힌 이유) — Serial 과 같이 상태 옆에 보인다
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 화면에 보인 오류는 «문제 보고» 에 넣을 수 있게 모아 둔다
  useEffect(() => {
    if (error) noteError(error);
  }, [error]);
  const [logPath, setLogPath] = useState<string | null>(null);
  // 연결 실패는 상태 칸에 빨갛게
  const [connectErr, setConnectErr] = useState<string | null>(null);

  // 저장된 포트가 목록에 없으면 같은 장치(없으면 첫 포트)로 바꾸고 알린다. 연결 중엔 건드리지 않는다
  const [portNotice, setPortNotice] = useState<string | null>(null);
  useEffect(() => {
    if (connected || !ports.length || ports.some((p) => p.name === cfg.port)) return;
    const next = pickPort(ports, load<PortId | null>("portId", null));
    if (cfg.port) setPortNotice(dict[lang].portSwitched.replace("{a}", cfg.port).replace("{b}", next));
    setCfg((c) => ({ ...c, port: next }));
  }, [ports, cfg.port, connected, lang]);

  // ---- 통신 기록 — 가상 스크롤(설정 «화면에 남길 줄 수» 까지), 찾기·거르기·따라가기·줄 고르기는 다른 프로그램과 같다
  const traffic = useRef<Frame[]>([]);
  const seqRef = useRef(0);
  const failCount = useRef(0);
  const trafficApi = useRef<TrafficHandle | null>(null);
  const onEvent = useCallback((e: SessionEvent) => {
    if (e.type === "frames") {
      for (const f of e.frames) {
        f.seq = ++seqRef.current;
        if (f.check === false) failCount.current++;
      }
      traffic.current.push(...e.frames);
      if (traffic.current.length > maxLines.current) traffic.current.splice(0, traffic.current.length - maxLines.current);
      trafficApi.current?.bump();
    } else if (e.type === "status") {
      setStatus(e.state);
      setStatusMsg(e.message);
      if (e.state === "connected") {
        setError(null);
        // 다시 꽂아 COM 번호가 바뀌었으면 다음 연결도 새 번호로(시리얼만)
        setCfg((c) => (!e.port || c.port === e.port || /:\d+$/.test(e.port) ? c : { ...c, port: e.port }));
      }
      if (e.state === "closed") {
        setConnected(false);
        setLogPath(null);
        setPeers([]);
        setLocal(null);
      }
    } else if (e.type === "peers") {
      setPeers(e.peers);
    } else if (e.type === "error") {
      setError(e.message);
    }
  }, []);

  // ---- 슬레이브·표 설정 (연결과 무관하게 살아 있다)
  const [ids, setIds] = useState<number[]>(() => load("ids", [1]));
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const [selId, setSel] = useState<number>(() => load("sel", 1));
  const [table, setTable] = useState<Table>(() => load("table", "holding-registers"));
  const [ranges, setRanges] = useState<Record<string, Range>>(() => load("ranges", {}));
  const [format, setFormat] = useState<Format>(() => load("format", "u16"));
  const [addrMode, setAddrMode] = useState<AddrMode>(() => load("addrMode", "zero"));
  const [regView, setRegView] = useState<RegView>(() => load("regView", "grid"));
  // 타입·이름(점)과 자동 변화 — 슬레이브:표 마다
  const [points, setPoints] = useState<Record<string, Point[]>>(() => load("points", {}));
  const [sims, setSims] = useState<Record<string, SimCfg[]>>(() => load("sims", {}));
  const [device, setDevice] = useState<DeviceId>(() => ({ ...DEFAULT_DEVICE, ...load<Partial<DeviceId>>("device", {}) }));
  // 장애 주입은 켤 때마다 꺼진 상태로 시작한다 — 모르고 켜 둔 채 정상 시험을 하지 않게
  const [faults, setFaults] = useState<Faults>(NO_FAULTS);
  const [fText, setFText] = useState({ ids: "", fcs: "", from: "", to: "" });
  const [advOpen, setAdvOpen] = useState(false);
  const [newId, setNewId] = useState("");
  const [idErr, setIdErr] = useState<string | null>(null);
  const [cellDlg, setCellDlg] = useState<number | null>(null);
  const range = ranges[key(selId, table)] ?? { start: 0, count: 100 };
  const bits = isBits(table);
  const base = addrBase(addrMode);
  const pts = points[key(selId, table)];
  const tableSims = sims[key(selId, table)];

  usePersist("ids", ids);
  usePersist("sel", selId);
  usePersist("table", table);
  usePersist("ranges", ranges);
  usePersist("format", format);
  usePersist("addrMode", addrMode);
  usePersist("regView", regView);
  usePersist("points", points);
  usePersist("sims", sims);
  usePersist("device", device);

  // ---- 표 값 저장 — 모든 슬레이브·표의 0 이 아닌 칸을 «tableValues» 하나에. 바뀌면 1초 뒤 한꺼번에 쓴다
  const savedVals = useRef<SavedValues>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushValues = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    store("tableValues", savedVals.current);
  }, []);
  const remember = useCallback(
    (id: number, tb: Table, start: number, values: number[]) => {
      const m = ((savedVals.current[id] ??= {})[tb] ??= {});
      values.forEach((v, i) => {
        if (v) m[start + i] = v;
        else delete m[start + i];
      });
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flushValues, 1000);
    },
    [flushValues],
  );
  // 창을 닫기 직전 남은 것을 쓴다
  useEffect(() => {
    const onUnload = () => saveTimer.current && flushValues();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [flushValues]);

  /** 표 하나의 자동 변화 → 백엔드 모양(점의 타입·순서를 붙인다) */
  const specsFor = useCallback(
    (id: number, tb: Table): SimSpec[] => {
      const k = key(id, tb);
      return (sims[k] ?? []).map((s) => simToSpec(s, points[k]?.find((p) => p.addr === s.addr), isBits(tb))).filter((x): x is SimSpec => !!x);
    },
    [sims, points],
  );

  // 화면 설정 → 엔진. 처음 켤 때 저장해 둔 표 값도 되살린다.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        // 예전 판이 저장한 장애 설정은 지운다
        localStorage.removeItem("faults");
      } catch {
        /* 저장이 막힌 환경 */
      }
      await api.setSlaveIds(ids);
      const stored = load<SavedValues | null>("tableValues", null);
      const sv: SavedValues = stored ?? {};
      for (const id of ids)
        for (const tb of TABLES) {
          const r = ranges[key(id, tb.id)] ?? { start: 0, count: 100 };
          await api.setRange(id, tb.id, r.start, r.count);
          if (!stored) {
            // 예전 판은 보이는 창만 «values:슬레이브:표» 로 저장했다(더 예전엔 배열만 — 시작 0)
            const old = load<{ start: number; values: number[] } | number[] | null>(`values:${key(id, tb.id)}`, null);
            const o = Array.isArray(old) ? { start: 0, values: old } : old;
            if (o && Array.isArray(o.values)) {
              const m = ((sv[id] ??= {})[tb.id] ??= {});
              o.values.slice(0, 65536 - o.start).forEach((v, i) => v && (m[o.start + i] = v));
            }
          }
          const m = sv[id]?.[tb.id];
          const addrs = m ? Object.keys(m).map(Number).filter((a) => Number.isInteger(a) && a >= 0 && a < 65536) : [];
          if (m && addrs.length) {
            // 한 번에 보낸다 — 빈 칸은 0(새 표는 모두 0)
            const lo = Math.min(...addrs);
            const hi = Math.max(...addrs);
            const arr = new Array<number>(hi - lo + 1).fill(0);
            for (const a of addrs) arr[a - lo] = m[a] & 0xffff;
            await api.setValues(id, tb.id, lo, arr);
          }
        }
      savedVals.current = sv;
      if (!stored) {
        store("tableValues", sv);
        try {
          for (const k of Object.keys(localStorage)) if (k.startsWith("values:")) localStorage.removeItem(k);
        } catch {
          /* 저장이 막힌 환경 */
        }
      }
      await api.setFaults(NO_FAULTS);
      setReady(true);
    })().catch((e) => setError(String(e)));
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 지운 슬레이브의 값·칸 설정은 저장에서도 뺀다
  useEffect(() => {
    if (!ready) return;
    const gone = Object.keys(savedVals.current).filter((k) => !ids.includes(Number(k)));
    if (gone.length) {
      for (const k of gone) delete savedVals.current[k];
      flushValues();
    }
    const stale = (o: Record<string, unknown>) => Object.keys(o).some((k) => !ids.includes(Number(k.split(":")[0])));
    const prune = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).filter(([k]) => ids.includes(Number(k.split(":")[0]))));
    setPoints((o) => (stale(o) ? prune(o) : o));
    setSims((o) => (stale(o) ? prune(o) : o));
  }, [ids, ready, flushValues]);
  useEffect(() => {
    if (ready) api.setSlaveIds(ids).catch((e) => setError(String(e)));
  }, [ids, ready]);
  useEffect(() => {
    if (ready) api.setFaults(faults).catch((e) => setError(String(e)));
  }, [faults, ready]);
  useEffect(() => {
    if (ready) api.setRange(selId, table, range.start, range.count).catch((e) => setError(String(e)));
  }, [ready, selId, table, range.start, range.count]);
  useEffect(() => {
    if (ready) api.setAddrStyle({ base, plc: addrMode === "plc" }).catch(() => {});
  }, [ready, base, addrMode]);
  // 장치 식별 — 80바이트를 넘으면 보내지 않고 칸을 빨갛게
  const devTooLong = [device.vendor, device.productCode, device.revision].some((s) => utf8Len(s) > 80);
  useEffect(() => {
    if (!ready || devTooLong) return;
    const id = setTimeout(() => api.setDeviceId(device).catch((e) => setError(String(e))), 300);
    return () => clearTimeout(id);
  }, [ready, device, devTooLong]);
  // 자동 변화 — 바뀐 표만 백엔드로(같은 내용이면 다시 보내지 않는다 — 주기 시계가 처음부터 돌지 않게)
  const pushed = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!ready) return;
    for (const id of ids)
      for (const tb of TABLE_IDS) {
        const k = key(id, tb);
        const specs = specsFor(id, tb);
        const sig = JSON.stringify(specs);
        if ((pushed.current[k] ?? "[]") === sig) continue;
        pushed.current[k] = sig;
        api.setSims(id, tb, specs).catch((e) => setError(String(e)));
      }
    // 지운 슬레이브는 다음에 다시 더하면 처음부터 보낸다
    for (const k of Object.keys(pushed.current)) if (!ids.includes(Number(k.split(":")[0]))) delete pushed.current[k];
  }, [ready, ids, specsFor]);
  // TCP 로 바꾸면 «CRC 틀리게», RTU 로 바꾸면 «MBAP 길이 틀리게» 를 끈다(보이지 않는 장애가 켜져 있지 않게)
  useEffect(() => {
    setFaults((f) => (transport === "tcp" ? (f.badCrc ? { ...f, badCrc: false } : f) : f.badMbapLen ? { ...f, badMbapLen: false } : f));
  }, [transport]);

  // ---- 표 값: 0.3초마다 다시 읽고, 마스터가 바꾼 칸을 잠깐 표시한다(자동 변화 칸은 빼고)
  const [values, setValues] = useState<number[]>([]);
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<Stats | null>(null);
  const prev = useRef<{ k: string; v: number[] }>({ k: "", v: [] });
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewCount = Math.min(range.count, MAX_VIEW);
  /** 자동 변화가 걸린 레지스터(보이는 범위 기준 자리) */
  const simAddrs = useMemo(() => {
    const s = new Set<number>();
    for (const c of tableSims ?? []) {
      const p = pts?.find((q) => q.addr === c.addr);
      const n = p ? pointRegs(p) : 1;
      for (let a = c.addr; a < c.addr + n; a++) s.add(a);
    }
    return s;
  }, [tableSims, pts]);
  const simAddrsRef = useRef(simAddrs);
  simAddrsRef.current = simAddrs;
  const refresh = useCallback(async () => {
    if (!ready || !ids.includes(selId)) return;
    const v = await api.getValues(selId, table, range.start, viewCount);
    const k = `${key(selId, table)}:${range.start}:${viewCount}`;
    if (prev.current.k === k) {
      const changed = new Set<number>();
      v.forEach((x, i) => x !== prev.current.v[i] && !simAddrsRef.current.has(range.start + i) && changed.add(i));
      if (changed.size) {
        setFlash(changed);
        // F18 강조 타이머는 하나만 — 연달아 쓰여도 앞 타이머가 새 강조를 지우지 않게
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(new Set()), 1200);
      }
    }
    // F17 바뀐 게 없으면 다시 그리지 않는다(최대 2000칸)
    const same = prev.current.k === k && v.length === prev.current.v.length && v.every((x, i) => x === prev.current.v[i]);
    prev.current = { k, v };
    if (!same) setValues(v);
  }, [ready, ids, selId, table, range.start, viewCount]);
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

  // 마스터가 쓰면(통계의 쓰기 수가 바뀌면) 1초 뒤 모든 슬레이브의 쓸 수 있는 표 범위를 읽어 저장한다
  const writes = stats?.writes;
  useEffect(() => {
    if (!ready || writes == null) return;
    const timer = setTimeout(async () => {
      for (const id of ids)
        for (const tb of WRITABLE) {
          const r = ranges[key(id, tb)] ?? { start: 0, count: 100 };
          const v = await api.getValues(id, tb, r.start, r.count).catch(() => null);
          if (v) remember(id, tb, r.start, v);
        }
    }, 1000);
    return () => clearTimeout(timer);
  }, [writes, ready, ids, ranges, remember]);

  // ---- 칸(타입 지정 점 포함)
  const items = useMemo(() => layout(range.start, Math.min(viewCount, values.length), pts), [range.start, viewCount, values.length, pts]);
  const itemType = (it: Item): VType => (bits ? "bit" : (it.point?.type ?? "u16"));
  const regsOfItem = (it: Item) => values.slice(it.addr - range.start, it.addr - range.start + it.span);
  /** 칸 → 화면 글. u16 은 «표시»(U16·S16·HEX·BIN)대로, 나머지는 타입대로 */
  const showItem = (it: Item, regs = regsOfItem(it)) => {
    const ty = itemType(it);
    const order = it.point?.order ?? "ABCD";
    if (ty === "u16") return show((decodeValue(regs, "u16", order) as number | null) ?? 0, format);
    return formatValue(decodeValue(regs, ty, order, it.point?.len), ty);
  };
  /** 입력 글 → 쓸 레지스터(틀리면 null) */
  const parseItem = (it: Item, text: string): number[] | null => {
    const ty = itemType(it);
    const order = it.point?.order ?? "ABCD";
    if (ty === "u16") {
      const n = parse(text, format);
      return n == null ? null : encodeValue(n, "u16", order);
    }
    const v = parseValue(text, ty, it.point?.len);
    return v == null ? null : encodeValue(v, ty, order, it.point?.len);
  };
  const typeTag = (it: Item) => {
    const p = it.point;
    if (!p || bits || p.type === "u16") return p && p.order !== "ABCD" && !bits ? p.order : "";
    return `${p.type === "string" ? `STR(${p.len ?? 2})` : p.type.toUpperCase()}${p.order !== "ABCD" ? ` ${p.order}` : ""}`;
  };
  const simOf = (a: number) => tableSims?.find((s) => s.addr === a);

  async function writeRegs(addr: number, regs: number[]) {
    // 실패하면 화면 값은 그대로 두고 이유를 보인다(다음 읽기에서 실제 값으로 돌아온다)
    try {
      await api.setValues(selId, table, addr, regs);
    } catch (e) {
      setError(String(e));
      return false;
    }
    const next = values.slice();
    regs.forEach((v, k) => {
      const i = addr - range.start + k;
      if (i >= 0 && i < next.length) next[i] = v;
    });
    prev.current.v = next;
    setValues(next);
    remember(selId, table, addr, regs);
    return true;
  }

  /** 여러 값 붙여넣기(엑셀 등) — i 번째 칸부터 이어서 한 번에 쓴다. 칸마다 그 칸의 형식으로 읽고, 범위를 넘는 값은 버리고 알린다 */
  async function pasteMany(i: number, tokens: string[]): Promise<string | null> {
    const regs: number[] = [];
    let n = 0;
    for (; n < tokens.length && i + n < items.length; n++) {
      const it = items[i + n];
      const r = parseItem(it, tokens[n]);
      if (!r) {
        toast.show(t("pasteBad").replace("{a}", tokens[n]).replace("{b}", it.point && it.point.type !== "u16" ? it.point.type.toUpperCase() : format.toUpperCase()), { error: true });
        return null;
      }
      regs.push(...r);
    }
    if (!n || !(await writeRegs(items[i].addr, regs))) return null;
    const msg = t("pasted").replace("{n}", String(n)).replace("{a}", addrText(table, items[i].addr, addrMode));
    toast.show(tokens.length > n ? `${msg} · ${t("pasteCut").replace("{n}", String(tokens.length - n))}` : msg);
    return showItem(items[i], regs.slice(0, items[i].span));
  }

  async function fill() {
    if (!(await ask(t("askFill"), { title: "PortDock Modbus Slave", kind: "warning" }))) return;
    const v = Array.from({ length: viewCount }, (_, i) => (bits ? i % 2 : i));
    try {
      await api.setValues(selId, table, range.start, v);
    } catch (e) {
      setError(String(e));
      return;
    }
    remember(selId, table, range.start, v);
    refresh();
  }

  /** 칸 설정 창의 결과 — 기본 모양이면 점을 지우고, 자동 변화가 없으면 그것도 지운다 */
  function saveCell(addr: number, p: Point | null, s: SimCfg | null) {
    const k = key(selId, table);
    setPoints((o) => {
      const list = (o[k] ?? []).filter((q) => q.addr !== addr);
      return { ...o, [k]: p && !isPlainPoint(p) ? [...list, p].sort((a, b) => a.addr - b.addr) : list };
    });
    setSims((o) => {
      const list = (o[k] ?? []).filter((x) => x.addr !== addr);
      return { ...o, [k]: s ? [...list, s].sort((a, b) => a.addr - b.addr) : list };
    });
    setCellDlg(null);
  }

  // ---- 표 내보내기·가져오기(CSV·JSON)
  async function exportTable() {
    const path = await save({
      defaultPath: `modbus-slave-${selId}-${table}.csv`,
      filters: [
        { name: "CSV (Excel)", extensions: ["csv"] },
        { name: "JSON", extensions: ["json"] },
      ],
    });
    if (!path) return;
    try {
      const all = await api.getValues(selId, table, range.start, range.count);
      const end = range.start + range.count;
      if (/\.json$/i.test(path)) {
        const body = {
          app: "PortDock Modbus Slave",
          slave: selId,
          table,
          start: range.start,
          values: all,
          points: (pts ?? []).filter((p) => p.addr >= range.start && p.addr < end),
          sims: (tableSims ?? []).filter((s) => s.addr >= range.start && s.addr < end),
        };
        await api.writeText(path, JSON.stringify(body, null, 2));
      } else await api.writeText(path, toCsv(tableRows(table, range.start, all, pts)));
      toast.show(t("exported").replace("{a}", path.split(/[\\/]/).pop() ?? path));
    } catch (e) {
      setError(String(e));
    }
  }

  /** 레지스터 묶음(주소 → 값)을 이어진 덩어리로 나눠 쓴다 */
  async function writeSparse(tb: Table, m: Map<number, number>) {
    const addrs = [...m.keys()].sort((a, b) => a - b);
    for (let i = 0; i < addrs.length; ) {
      let j = i;
      while (j + 1 < addrs.length && addrs[j + 1] === addrs[j] + 1) j++;
      const vals = addrs.slice(i, j + 1).map((a) => m.get(a)!);
      await api.setValues(selId, tb, addrs[i], vals);
      remember(selId, tb, addrs[i], isBits(tb) ? vals.map((x) => (x ? 1 : 0)) : vals);
      i = j + 1;
    }
  }

  async function importCsv(text: string) {
    const r = parseCsv(text, lang);
    if (r.errors.length) throw new Error(`${t("csvBad")}\n${r.errors.join("\n")}`);
    if (!r.rows.length) throw new Error(t("csvNoRows"));
    const byTable = new Map<Table, typeof r.rows>();
    for (const row of r.rows) (byTable.get(row.table) ?? byTable.set(row.table, []).get(row.table)!).push(row);
    let outside = 0;
    const counts: string[] = [];
    const nextPoints = { ...points };
    for (const [tb, list] of byTable) {
      const regs = new Map<number, number>();
      for (const row of list) {
        if (row.value == null) continue;
        encodeValue(row.value, row.type, row.order, row.len).forEach((v, k) => regs.set(row.address + k, v));
      }
      await writeSparse(tb, regs);
      const k = key(selId, tb);
      const add = list.map(rowPoint).filter((p): p is Point => !!p);
      nextPoints[k] = mergePoints(points[k], add, list.filter((row) => !rowPoint(row)).map((row) => row.address));
      const rg = ranges[k] ?? { start: 0, count: 100 };
      outside += list.filter((row) => row.address < rg.start || row.address >= rg.start + rg.count).length;
      counts.push(`${t(tb)} ${list.length}`);
    }
    setPoints(nextPoints);
    const msg = t("csvDone").replace("{n}", String(r.rows.length)).replace("{a}", counts.join(" · "));
    toast.show(outside ? `${msg}. ${t("rangeCut").replace("{n}", String(outside))}` : msg, outside ? { ms: 6000 } : {});
  }

  async function importJson(text: string) {
    const body = JSON.parse(text) as { slave?: number; table?: Table; start: number; values: number[]; points?: unknown; sims?: unknown };
    const ok =
      Number.isInteger(body.start) &&
      body.start >= 0 &&
      Array.isArray(body.values) &&
      body.start + body.values.length <= 65536 &&
      body.values.every((v) => Number.isInteger(v) && v >= 0 && v <= 0xffff);
    if (!ok) throw new Error(t("badTableFile"));
    if ((body.slave != null && body.slave !== selId) || (body.table != null && body.table !== table)) {
      const msg = t("importOther").replace("{a}", `${body.slave ?? "?"} / ${body.table ?? "?"}`).replace("{b}", `${selId} / ${table}`);
      if (!(await ask(msg, { title: "PortDock Modbus Slave", kind: "warning" }))) return;
    }
    await api.setValues(selId, table, body.start, body.values);
    remember(selId, table, body.start, bits ? body.values.map((x) => (x ? 1 : 0)) : body.values);
    // 칸 설정(점·자동 변화)도 들어 있으면 — 틀린 것은 빼고
    const k = key(selId, table);
    const okPoint = (p: Point) =>
      p && Number.isInteger(p.addr) && p.addr >= 0 && p.addr < 65536 && typeof p.name === "string" && ["u16", "s16", "u32", "s32", "f32", "f64", "string", "bit"].includes(p.type) && ["ABCD", "CDAB", "BADC", "DCBA"].includes(p.order) && p.addr + pointRegs(p) <= 65536;
    const okSim = (s: SimCfg) => s && Number.isInteger(s.addr) && typeof s.kind === "string" && Number.isFinite(s.periodMs);
    let skipped = false;
    if (Array.isArray(body.points)) {
      const list = (body.points as Point[]).filter(okPoint);
      skipped ||= list.length !== body.points.length;
      setPoints((o) => ({ ...o, [k]: mergePoints(o[k], list) }));
    }
    if (Array.isArray(body.sims)) {
      const list = (body.sims as SimCfg[]).filter(okSim);
      skipped ||= list.length !== body.sims.length;
      setSims((o) => ({ ...o, [k]: [...(o[k] ?? []).filter((s) => !list.some((x) => x.addr === s.addr)), ...list].sort((a, b) => a.addr - b.addr) }));
    }
    if (skipped) toast.show(t("jsonPointsBad"), { error: true });
    refresh();
  }

  async function importTable() {
    const path = await openDialog({ filters: [{ name: "CSV / JSON", extensions: ["csv", "json", "txt"] }] });
    if (!path || Array.isArray(path)) return;
    try {
      const text = await api.readText(path);
      if (/\.json$/i.test(path) || text.replace(/^﻿/, "").trimStart().startsWith("{")) await importJson(text);
      else await importCsv(text);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // ---- 연결
  const [connecting, setConnecting] = useState(false);
  async function connect() {
    if (connecting) return;
    setConnecting(true);
    setError(null);
    setConnectErr(null);
    setPortNotice(null);
    setStatusMsg(null);
    try {
      if (transport === "serial") {
        await api.open(cfg, onEvent);
        const p = ports.find((x) => x.name === cfg.port);
        if (p) store("portId", { vid: p.vid, pid: p.pid, serial: p.serial_number } satisfies PortId);
        setStatus("connected");
      } else {
        const at = await api.openTcp({ host: net.host.trim(), port: net.port, wire: transport === "tcp" ? "tcp" : "rtu", ignoreUnitId: net.ignoreUnitId }, onEvent);
        setLocal(at || null);
        setStatus((s) => (s === "idle" || s === "closed" ? "listening" : s));
      }
      setConnected(true);
      if (settings.autoLog && settings.logFolder) {
        const p = autoLogPath(settings.logFolder, "modbus-slave");
        await api.setLog(p).then(() => setLogPath(p)).catch((e) => setError(String(e)));
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
    setPeers([]);
    setLocal(null);
  }
  useEffect(() => {
    if (!connected || transport !== "serial") return;
    const id = setTimeout(() => api.reconfigure(cfg).catch((e) => setError(String(e))), 300);
    return () => clearTimeout(id);
    // 포트 이름은 연결 중 바꾸지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, cfg.baud, cfg.dataBits, cfg.parity, cfg.stopBits]);
  // «Unit ID 무시» 는 연결 중에도 바로
  useEffect(() => {
    if (connected && tcp) api.setOptions({ ignoreUnitId: net.ignoreUnitId }).catch((e) => setError(String(e)));
  }, [connected, tcp, net.ignoreUnitId]);

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
    const path = await save({ title: t("logDlgTitle"), defaultPath: `modbus-slave-${stamp}.log`, filters: [{ name: "Log", extensions: ["log", "txt"] }] });
    if (!path) return;
    await api.setLog(path).then(() => setLogPath(path)).catch((e) => setError(String(e)));
  }

  /** 슬레이브 지우기 — 확인 창 대신 5초 «되돌리기». 되돌리면 표 값·범위·칸 설정도 그대로 돌아온다 */
  function deleteSlave(id: number) {
    const wasSel = selId;
    // 지우면 저장된 표 값·칸 설정도 빠지므로(위 효과) 미리 떠 둔다
    const snap = JSON.parse(JSON.stringify(savedVals.current[id] ?? {})) as SavedValues[string];
    const mine = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([k]) => Number(k.split(":")[0]) === id));
    const snapPoints = mine(points) as Record<string, Point[]>;
    const snapSims = mine(sims) as Record<string, SimCfg[]>;
    const rest = ids.filter((x) => x !== id);
    setIds(rest);
    if (selId === id) setSel(rest[0]);
    toast.show(ui(lang, "deletedSlave", { a: id }), {
      undo: async () => {
        // 그사이 다른 슬레이브를 더했어도 그대로 두고 이 주소만 되살린다
        const back = [...new Set([...idsRef.current, id])].sort((a, b) => a - b);
        try {
          await api.setSlaveIds(back);
          for (const tb of TABLES) {
            const r = ranges[key(id, tb.id)] ?? { start: 0, count: 100 };
            await api.setRange(id, tb.id, r.start, r.count);
            const m = snap?.[tb.id];
            const addrs = m ? Object.keys(m).map(Number) : [];
            if (m && addrs.length) {
              const lo = Math.min(...addrs);
              const arr = new Array<number>(Math.max(...addrs) - lo + 1).fill(0);
              for (const a of addrs) arr[a - lo] = m[a] & 0xffff;
              await api.setValues(id, tb.id, lo, arr);
            }
          }
        } catch (e) {
          setError(String(e));
        }
        savedVals.current[id] = snap;
        flushValues();
        setIds(back);
        setPoints((o) => ({ ...o, ...snapPoints }));
        setSims((o) => ({ ...o, ...snapSims }));
        if (wasSel === id) setSel(id);
      },
    });
  }

  function addId() {
    const s = newId.trim();
    if (!s) return;
    const n = Number(s);
    // 거절하면 칸을 빨갛게 하고 이유를 보인다
    const why = !/^\d+$/.test(s) || n > 247 ? t("idRange") : n === 0 ? t("idZero") : ids.includes(n) ? t("idDup").replace("{a}", String(n)) : null;
    if (why) {
      setIdErr(why);
      return;
    }
    setIdErr(null);
    setIds([...ids, n].sort((a, b) => a - b));
    setSel(n);
    setNewId("");
  }

  // ---- 장애 대상(고급) 칸 — 맞는 글이면 바로 적용, 틀리면 빨갛게(앞의 맞는 값 유지)
  const fErr = useMemo(() => {
    const e: Partial<Record<"ids" | "fcs" | "from" | "to" | "order", string>> = {};
    if (parseList(fText.ids, false) == null) e.ids = t("fBadIds");
    if (parseList(fText.fcs, true) == null) e.fcs = t("fBadFcs");
    const addrOk = (s: string) => !s.trim() || (/^\d+$/.test(s.trim()) && Number(s) >= base && Number(s) <= 65535 + base);
    const badAddr = t("fBadAddr").replace("{a}", String(base)).replace("{b}", String(65535 + base));
    if (!addrOk(fText.from)) e.from = badAddr;
    if (!addrOk(fText.to)) e.to = badAddr;
    if (!e.from && !e.to && fText.from.trim() && fText.to.trim() && Number(fText.from) > Number(fText.to)) e.order = t("fAddrOrder");
    return e;
  }, [fText, base, t]);
  function setTargetText(k: keyof typeof fText, v: string) {
    const next = { ...fText, [k]: v };
    setFText(next);
    const idsL = parseList(next.ids, false);
    const fcsL = parseList(next.fcs, true);
    const num = (s: string) => (s.trim() && /^\d+$/.test(s.trim()) ? Number(s) - base : null);
    const from = num(next.from);
    const to = num(next.to);
    const addrOk = (s: string, n: number | null) => !s.trim() || (n != null && n >= 0 && n <= 65535);
    if (idsL == null || fcsL == null || !addrOk(next.from, from) || !addrOk(next.to, to) || (from != null && to != null && from > to)) return;
    setFaults((f) => ({ ...f, target: { ...f.target, slaveIds: idsL, functions: fcsL, addrFrom: from, addrTo: to } }));
  }
  // 주소 표기(0·1 기준)를 바꾸면 대상 주소 글도 같은 주소로 옮겨 쓴다
  const prevBase = useRef(base);
  useEffect(() => {
    if (prevBase.current === base) return;
    const d = base - prevBase.current;
    prevBase.current = base;
    setFText((x) => ({ ...x, from: /^\d+$/.test(x.from.trim()) ? String(Number(x.from) + d) : x.from, to: /^\d+$/.test(x.to.trim()) ? String(Number(x.to) + d) : x.to }));
  }, [base]);
  const tg = faults.target;
  const targeted = tg.slaveIds.length > 0 || tg.functions.length > 0 || tg.addrFrom != null || tg.addrTo != null || tg.everyNth > 1 || tg.probability < 100;
  const faultOn = faults.delayMs > 0 || faults.delayMaxMs > 0 || faults.noResponse || faults.badCrc || faults.badMbapLen || faults.forceException > 0;
  const targetText = [
    tg.slaveIds.length ? t("fTIds").replace("{a}", tg.slaveIds.join(",")) : "",
    tg.functions.length ? t("fTFcs").replace("{a}", tg.functions.map((f) => f.toString(16).toUpperCase().padStart(2, "0")).join(",")) : "",
    tg.addrFrom != null || tg.addrTo != null ? t("fTAddr").replace("{a}", addrText(table, tg.addrFrom ?? 0, addrMode)).replace("{b}", addrText(table, tg.addrTo ?? 65535, addrMode)) : "",
    tg.everyNth > 1 ? t("fTNth").replace("{n}", String(tg.everyNth)) : "",
    tg.probability < 100 ? t("fTProb").replace("{p}", String(tg.probability)) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  useEffect(() => {
    if (targeted) setAdvOpen(true);
  }, [targeted]);

  const statusKey = `status_${status}` as Key;

  useExitGuard(connected || !!logPath, settings.confirmExit, lang, "PortDock Modbus Slave");

  // ---- 단축키: F4 연결·끊기, Ctrl+L 통신 기록 지우기, Ctrl+Shift+L 파일 기록
  const startable = transport === "serial" ? ports.some((p) => p.name === cfg.port) : !!net.host.trim();
  const runDisabled = connecting || (!connected && !startable);
  useShortcuts([
    { key: "F4", run: () => !runDisabled && void (connected ? disconnect() : connect()) },
    { key: "l", ctrl: true, run: () => trafficApi.current?.clear() },
    { key: "l", ctrl: true, shift: true, run: () => connected && void toggleLog() },
  ]);
  const clearError = useCallback(() => setError(null), []);
  const onCopied = (ok: boolean, n: number) => toast.show(ok ? ui(lang, "copied", { n }) : ui(lang, "copyFail"), { error: !ok });

  // ---- 창 제목: «COM5 · 슬레이브 1,2 — PortDock Modbus Slave» / «TCP :502 · 클라이언트 2 — …»
  const parityCh = cfg.parity === "odd" ? "O" : cfg.parity === "even" ? "E" : "N";
  const slaveList = ids.length > 6 ? `${ids.slice(0, 6).join(",")},…` : ids.join(",");
  const localPort = local?.match(/:(\d+)$/)?.[1] ?? String(net.port);
  const clientsText = t("clients").replace("{n}", String(peers.length));
  const trName = transport === "tcp" ? "Modbus TCP" : "RTU over TCP";
  useWindowTitle(
    windowTitle(
      "PortDock Modbus Slave",
      !connected ? [] : tcp ? [`${trName} :${localPort}`, clientsText, t("titleSlaves").replace("{a}", slaveList)] : [cfg.port, t("titleSlaves").replace("{a}", slaveList), status !== "connected" && t(statusKey)],
      !!logPath,
    ),
  );
  const summaryLine = tcp
    ? `${trName} ${net.host}:${connected ? localPort : net.port} · ${t(statusKey)}${connected ? ` · ${clientsText}` : ""}`
    : `${cfg.port || t("noPorts")} ${cfg.baud} ${cfg.dataBits}${parityCh}${cfg.stopBits} · ${t("titleSlaves").replace("{a}", slaveList)} · ${t(statusKey)}`;
  const runLabel = connected ? (tcp ? t("stopSrv") : t("disconnect")) : tcp ? t("startSrv") : t("connect");
  const perFc = stats ? Object.entries(stats.perFc).sort(([a], [b]) => a.localeCompare(b)) : [];
  const dlgItem = cellDlg == null ? undefined : items.find((x) => x.addr === cellDlg);

  /** 칸 하나의 값 입력(비트는 체크칸) */
  const valueControl = (it: Item, i: number) =>
    bits ? (
      <input type="checkbox" checked={(values[it.addr - range.start] ?? 0) !== 0} onChange={(e) => writeRegs(it.addr, [e.target.checked ? 1 : 0])} aria-label={addrText(table, it.addr, addrMode)} />
    ) : (
      <RegInput
        text={showItem(it)}
        check={(s) => parseItem(it, s) != null}
        onCommit={(s) => {
          const r = parseItem(it, s);
          if (r) writeRegs(it.addr, r);
        }}
        onPasteMany={(tokens) => pasteMany(i, tokens)}
        str={it.point?.type === "string"}
      />
    );
  const cfgButton = (it: Item) => (
    <button className="cellcfg" onClick={() => setCellDlg(it.addr)} aria-label={`${t("cellCfg")} ${addrText(table, it.addr, addrMode)}`} data-tip={tip(lang, "cellCfg")}>
      ⋯
    </button>
  );

  // 레지스터 표 — 값·칸 설정·보기가 바뀔 때만 다시 그린다(통계·상태가 0.3초마다 바뀌어도 수백 칸을 다시 그리지 않게)
  const regsView = useMemo(
    () => (
        <div className={regView === "list" ? "regs list" : "regs"}>
          {regView === "grid" ? (
            items.map((it, i) => {
              const fl = flash.has(it.addr - range.start) || (it.span > 1 && Array.from({ length: it.span }, (_, k) => flash.has(it.addr - range.start + k)).some(Boolean));
              const sim = simOf(it.addr);
              const name = it.point?.name ?? "";
              const tag = typeTag(it);
              return (
                <div
                  key={`${table}:${it.addr}`}
                  className={`reg${fl ? " flash" : ""}${it.span > 1 ? " wide" : ""}`}
                  style={it.span > 1 ? { gridColumn: `span ${it.span >= 4 ? 3 : 2}` } : undefined}
                  title={fl ? t("writtenByMaster") : name}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setCellDlg(it.addr);
                  }}
                >
                  <span className="addr">{addrText(table, it.addr, addrMode)}</span>
                  {name && <span className="rname">{name}</span>}
                  {valueControl(it, i)}
                  {tag && <span className="rtype">{tag}</span>}
                  {sim && (
                    <span className="simmark" title={t("simMark").replace("{a}", simSummary(sim, lang))} aria-label={t("simMark").replace("{a}", simSummary(sim, lang))}>
                      ◷
                    </span>
                  )}
                  {cfgButton(it)}
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
                  <th>{t("colSim")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const fl = Array.from({ length: it.span }, (_, k) => flash.has(it.addr - range.start + k)).some(Boolean);
                  const sim = simOf(it.addr);
                  const ty = itemType(it);
                  return (
                    <tr
                      key={`${table}:${it.addr}`}
                      className={fl ? "flash" : ""}
                      title={fl ? t("writtenByMaster") : ""}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setCellDlg(it.addr);
                      }}
                    >
                      <td className="addr">{it.span > 1 ? `${addrText(table, it.addr, addrMode)}–${addrText(table, it.addr + it.span - 1, addrMode)}` : addrText(table, it.addr, addrMode)}</td>
                      <td className="rname">{it.point?.name ?? ""}</td>
                      <td className="rtype">
                        {bits ? "bit" : ty === "u16" ? (format === "u16" ? "U16" : format.toUpperCase()) : typeLabel(ty, lang).split(" ")[0]}
                        {!bits && it.point && it.point.order !== "ABCD" ? ` ${it.point.order}` : ""}
                      </td>
                      <td className="rval">{valueControl(it, i)}</td>
                      <td className="simcol">{sim ? `◷ ${simSummary(sim, lang)}` : ""}</td>
                      <td>{cfgButton(it)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, values, flash, format, addrMode, regView, tableSims, pts, lang, bits, table, selId, range.start, range.count, toast.show],
  );

  return (
    <div className={showSide ? "app show-side" : "app"}>
      <SideBackdrop open={showSide} onClose={() => setShowSide(false)} />
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>Modbus Slave</small>
          </span>
          <span className="brand-tools">
            <select
              className="lang"
              aria-label={lang === "ko" ? "언어" : "Language"}
              value={lang}
              onChange={(e) => {
                setLang(e.target.value as Lang);
                store("lang", e.target.value);
              }}
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
            <PinButton lang={lang} on={settings.alwaysOnTop} onToggle={(v) => update({ alwaysOnTop: v })} />
            <ReportButton app="PortDock Modbus Slave" lang={lang} frames={() => traffic.current} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} />
            <button className="icon-btn" onClick={openHelp} title={t("helpTip")} aria-label={t("helpTip")}>
              ?
            </button>
            <button className="icon-btn" onClick={() => setShowSettings(true)} title={ui(lang, "settings")} aria-label={ui(lang, "settings")}>
              ⚙
            </button>
            <SideClose lang={lang} onClose={() => setShowSide(false)} />
          </span>
        </div>

        <label data-tip={tip(lang, "mbTransport")}>
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
          </>
        ) : (
          <>
            <div className="grid2 net">
              <label data-tip={tip(lang, "mbBind")}>
                {t("bindHost")}
                <input className={net.host.trim() ? "" : "bad"} value={net.host} disabled={connected} spellCheck={false} onChange={(e) => setNet({ ...net, host: e.target.value })} />
              </label>
              <label data-tip={tip(lang, "mbPort")}>
                {t("netPort")}
                <NumInput min={0} max={65535} value={net.port} disabled={connected} onValue={(n) => setNet({ ...net, port: n })} />
              </label>
            </div>
            {!net.host.trim() ? <div className="interlock">{t("hostEmpty")}</div> : !connected && <span className="hint">{t("bindHint")}</span>}
            <label className="inline" data-tip={tip(lang, "ignoreUnitId")}>
              <input type="checkbox" checked={net.ignoreUnitId} onChange={(e) => setNet({ ...net, ignoreUnitId: e.target.checked })} /> {t("ignoreUnitId")}
            </label>
          </>
        )}
        <button data-tip={withKey(tip(lang, connected ? "disconnect" : "connect"), KEYS.connect)} className={connected ? "btn danger" : "btn primary"} onClick={connected ? disconnect : connect} disabled={runDisabled}>
          {runLabel}
        </button>
        {connected && <span className="lock-note">🔒 {t("lockedHint")}</span>}
        {connectErr && !connected ? (
          <div className="status s-failed" role="alert">
            <b>{t("connectFailed")}</b> · {connectErr}
            {/busy|in use|denied|사용 중|거부/i.test(connectErr) && !/another program|다른 프로그램/i.test(connectErr) && <div>{t("busyHint")}</div>}
          </div>
        ) : (
          <div className={`status s-${status}`}>
            {t(statusKey)}
            {statusMsg ? ` · ${statusMsg}` : ""}
            {connected && tcp && (
              <div className="clients" data-tip={tip(lang, "tcpClients")} title={peers.map((p) => p.addr).join("\n")}>
                {local ? `${local} · ` : ""}
                {clientsText}
              </div>
            )}
          </div>
        )}

        <hr />
        <label data-tip={tip(lang, "slaves")}>{t("slaves")}</label>
        <div className="chips">
          {ids.map((id) => (
            <span key={id} className={id === selId ? "chip on" : "chip"}>
              <button className="chip-btn" onClick={() => setSel(id)} aria-pressed={id === selId} title={`ID ${id}`}>
                {id}
              </button>
              {ids.length > 1 && (
                <button className="chip-x" aria-label={`${t("delete")} ${id}`} title={`${t("delete")} ${id}`} onClick={() => deleteSlave(id)}>
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="row2">
          <input
            className={idErr ? "bad" : ""}
            value={newId}
            placeholder="1~247"
            onChange={(e) => {
              setNewId(e.target.value);
              setIdErr(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && addId()}
          />
          <button data-tip={tip(lang, "addSlave")} className="btn small" onClick={addId}>
            {t("addSlave")}
          </button>
        </div>
        {idErr && <div className="error">{idErr}</div>}

        <hr />
        <label data-tip={tip(lang, "faults")}>{t("faults")}</label>
        <label data-tip={tip(lang, "delay")}>
          {t("delay")}
          <NumInput min={0} max={600000} value={faults.delayMs} onValue={(n) => setFaults({ ...faults, delayMs: n })} />
        </label>
        <label data-tip={tip(lang, "noResponse")} className="inline">
          <input type="checkbox" checked={faults.noResponse} onChange={(e) => setFaults({ ...faults, noResponse: e.target.checked })} /> {t("noResponse")}
        </label>
        {transport === "tcp" ? (
          <label data-tip={tip(lang, "badMbapLen")} className="inline">
            <input type="checkbox" checked={faults.badMbapLen} onChange={(e) => setFaults({ ...faults, badMbapLen: e.target.checked })} /> {t("badMbapLen")}
          </label>
        ) : (
          <label data-tip={tip(lang, "badCrc")} className="inline">
            <input type="checkbox" checked={faults.badCrc} onChange={(e) => setFaults({ ...faults, badCrc: e.target.checked })} /> {t("badCrc")}
          </label>
        )}
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
        <details className="adv" open={advOpen} onToggle={(e) => setAdvOpen((e.target as HTMLDetailsElement).open)}>
          <summary data-tip={tip(lang, "faultAdv")}>{t("faultAdv")}</summary>
          <label data-tip={tip(lang, "delayMax")}>
            {t("delayMax")}
            <NumInput min={0} max={600000} value={faults.delayMaxMs} onValue={(n) => setFaults({ ...faults, delayMaxMs: n })} />
          </label>
          <label data-tip={tip(lang, "faultIds")}>
            {t("fIds")}
            <input className={fErr.ids ? "bad" : ""} value={fText.ids} placeholder={t("fAll")} spellCheck={false} onChange={(e) => setTargetText("ids", e.target.value)} />
          </label>
          {fErr.ids && <div className="error">{fErr.ids}</div>}
          <label data-tip={tip(lang, "faultFcs")}>
            {t("fFcs")}
            <input className={fErr.fcs ? "bad" : ""} value={fText.fcs} placeholder={t("fAll")} spellCheck={false} onChange={(e) => setTargetText("fcs", e.target.value)} />
          </label>
          {fErr.fcs && <div className="error">{fErr.fcs}</div>}
          <label data-tip={tip(lang, "faultAddr")}>{t("fAddr")}</label>
          <div className="row2 addr-range">
            <input className={fErr.from || fErr.order ? "bad" : ""} value={fText.from} placeholder={t("fFrom")} inputMode="numeric" aria-label={`${t("fAddr")} — ${t("fFrom")}`} onChange={(e) => setTargetText("from", e.target.value)} />
            <span>~</span>
            <input className={fErr.to || fErr.order ? "bad" : ""} value={fText.to} placeholder={t("fTo")} inputMode="numeric" aria-label={`${t("fAddr")} — ${t("fTo")}`} onChange={(e) => setTargetText("to", e.target.value)} />
          </div>
          {(fErr.from || fErr.to || fErr.order) && <div className="error">{fErr.from || fErr.to || fErr.order}</div>}
          <div className="grid2">
            <label data-tip={tip(lang, "faultNth")}>
              {t("fNth")}
              <NumInput min={1} max={100000} value={Math.max(1, tg.everyNth)} onValue={(n) => setFaults({ ...faults, target: { ...tg, everyNth: n } })} />
            </label>
            <label data-tip={tip(lang, "faultProb")}>
              {t("fProb")}
              <NumInput min={0} max={100} value={tg.probability} onValue={(n) => setFaults({ ...faults, target: { ...tg, probability: n } })} />
            </label>
          </div>
        </details>
        {faultOn && (
          <div className="hint warn" role="status">
            ⚠ {t("faults")}
            {targeted && targetText ? ` — ${t("fTarget")}: ${targetText}` : ""}
          </div>
        )}
        {(faults.delayMs >= 1000 || faults.delayMaxMs >= 1000) && <div className="interlock">{t("ilDelay")}</div>}
        {faults.delayMaxMs > 0 && faults.delayMaxMs < faults.delayMs && <div className="interlock">{t("ilJitter").replace("{a}", String(faults.delayMs))}</div>}
        {faults.noResponse && faults.forceException > 0 && <div className="interlock">{t("ilNoRespWins")}</div>}

        <hr />
        <details className="adv">
          <summary data-tip={tip(lang, "deviceId")}>{t("device")}</summary>
          {(
            [
              ["vendor", "devVendor"],
              ["productCode", "devProduct"],
              ["revision", "devRevision"],
            ] as const
          ).map(([f, label]) => (
            <label key={f} data-tip={tip(lang, label)}>
              {t(label)}
              <input className={utf8Len(device[f]) > 80 ? "bad" : ""} value={device[f]} spellCheck={false} onChange={(e) => setDevice({ ...device, [f]: e.target.value })} />
            </label>
          ))}
          {devTooLong && <div className="error">{t("devTooLong")}</div>}
        </details>

        <hr />
        <label data-tip={tip(lang, "mbStats")}>{t("stats")}</label>
        {stats && (
          <table className="stats">
            <tbody>
              <tr>
                <td>{t("stMine")}</td>
                <td>{stats.requests}</td>
              </tr>
              <tr>
                <td>{t("ok")}</td>
                <td>{stats.ok}</td>
              </tr>
              <tr className={stats.exceptions ? "warnrow" : ""}>
                <td>{t("exceptions")}</td>
                <td>{stats.exceptions}</td>
              </tr>
              <tr>
                <td>{t("stOther")}</td>
                <td>{stats.otherId}</td>
              </tr>
              <tr className={stats.badFrames ? "warnrow" : ""}>
                <td>{transport === "tcp" ? t("stMbap") : t("stCrc")}</td>
                <td>{stats.badFrames}</td>
              </tr>
              <tr>
                <td>{t("stWrites")}</td>
                <td>{stats.writes}</td>
              </tr>
              {stats.busy > 0 && (
                <tr>
                  <td>{t("stBusy")}</td>
                  <td>{stats.busy}</td>
                </tr>
              )}
              {stats.noResponse > 0 && (
                <tr>
                  <td>{t("stNoResp")}</td>
                  <td>{stats.noResponse}</td>
                </tr>
              )}
              {stats.broadcasts > 0 && (
                <tr>
                  <td>{t("stBroadcast")}</td>
                  <td>{stats.broadcasts}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {perFc.length > 0 && (
          <div className="perfc" data-tip={tip(lang, "mbStatsFc")}>
            {t("stPerFc")}: {perFc.map(([fc, n]) => `FC${fc}×${n}`).join(" · ")}
          </div>
        )}
        <button data-tip={tip(lang, "reset")} className="btn small" onClick={() => api.resetStats()}>
          {t("reset")}
        </button>
      </aside>

      <main className="main">
        <NarrowBar lang={lang} open={showSide} onToggle={() => setShowSide(!showSide)} dot={connectErr && !connected ? "s-disconnected" : `s-${status === "listening" ? "connected" : status}`} summary={summaryLine}>
          <button className={connected ? "btn small danger" : "btn small primary"} onClick={connected ? disconnect : connect} disabled={runDisabled} data-tip={withKey(tip(lang, connected ? "disconnect" : "connect"), KEYS.connect)}>
            {runLabel}
          </button>
        </NarrowBar>
        <div className="toolbar">
          {TABLES.map((tb) => (
            <button key={tb.id} className={table === tb.id ? "seg on" : "seg"} onClick={() => setTable(tb.id)} title={tb.fc}>
              {t(tb.id)} <small>{tb.fc.split(" ")[0]}</small>
            </button>
          ))}
          <span className="hint">ID {selId}</span>
          <span className="grow" />
          <button className="btn small" onClick={fill} data-tip={tip(lang, "fill")}>
            {t("fill")}
          </button>
          <button data-tip={tip(lang, "mbExport")} className="btn small" onClick={exportTable}>
            {t("exportTable")}
          </button>
          <button data-tip={tip(lang, "mbImport")} className="btn small" onClick={importTable}>
            {t("importTable")}
          </button>
        </div>
        <div className="toolbar">
          <label data-tip={tip(lang, "mbStart")} className="inline">
            {t("start")}
            <NumInput
              className="num"
              min={base}
              max={65535 + base}
              value={range.start + base}
              onValue={(n) => {
                const s = n - base;
                setRanges({ ...ranges, [key(selId, table)]: { start: s, count: Math.min(range.count, 65536 - s) } });
              }}
            />
          </label>
          <label data-tip={tip(lang, "count")} className="inline">
            {t("count")}
            <NumInput className="num" min={1} max={65536 - range.start} value={range.count} onValue={(n) => setRanges({ ...ranges, [key(selId, table)]: { ...range, count: n } })} />
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
          <label data-tip={tip(lang, "addrMode")} className="inline">
            {t("addrMode")}
            <select value={addrMode} onChange={(e) => setAddrMode(e.target.value as AddrMode)}>
              <option value="zero">{t("amZero")}</option>
              <option value="one">{t("amOne")}</option>
              <option value="plc">{t("amPlc")}</option>
            </select>
          </label>
          <span className="segs" role="group" aria-label={t("view")} data-tip={tip(lang, "regView")}>
            {(["grid", "list"] as const).map((v) => (
              <button key={v} className={regView === v ? "seg on" : "seg"} aria-pressed={regView === v} onClick={() => setRegView(v)}>
                {v === "grid" ? t("viewGrid") : t("viewList")}
              </button>
            ))}
          </span>
          <span className="hint warn range-warn">
            ⚠ {t("rangeWarn")}. {t("rangeHint")}
          </span>
        </div>

        {regsView}

        <Traffic
          lang={lang}
          settings={settings}
          traffic={traffic}
          seqRef={seqRef}
          failCount={failCount}
          handle={trafficApi}
          connected={connected}
          logPath={logPath}
          onToggleLog={toggleLog}
          peers={tcp}
          error={error}
          onClearError={clearError}
          onCopied={onCopied}
        />
      </main>
      {cellDlg != null && dlgItem && (
        <CellDialog
          lang={lang}
          bits={bits}
          addr={cellDlg}
          addrLabel={(a) => addrText(table, a, addrMode)}
          points={pts ?? []}
          point={dlgItem.point}
          sim={simOf(cellDlg)}
          onSave={(p, s) => saveCell(cellDlg, p, s)}
          onClose={() => setCellDlg(null)}
        />
      )}
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
      {toast.node}
    </div>
  );
}

/**
 * 레지스터 칸 — 입력 중엔 화면 갱신이 덮어쓰지 않게, 엔터·포커스 잃을 때 반영.
 * 표 칸처럼: Enter·↓ 다음 칸, ↑·Shift+Enter 앞 칸(옮기면서 반영), Esc 고치기 취소.
 * 엑셀 등에서 여러 값(탭·줄바꿈·쉼표로 나뉨)을 붙여 넣으면 이 칸부터 이어진 칸에 한꺼번에 넣는다(문자열 칸은 탭·줄바꿈만).
 */
function RegInput({
  text: shown,
  check,
  onCommit,
  onPasteMany,
  str,
}: {
  text: string;
  check: (s: string) => boolean;
  onCommit: (s: string) => void;
  onPasteMany: (tokens: string[]) => Promise<string | null>;
  str?: boolean;
}) {
  const [text, setText] = useState(shown);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(shown);
  }, [shown, editing]);
  const commit = () => {
    setEditing(false);
    if (!check(text)) setText(shown);
    else if (text !== shown) onCommit(text);
  };
  /** 앞(-1)·다음(+1) 칸으로 — 옮기면 지금 칸은 포커스를 잃으며 반영된다. 끝 칸이면 반영만 */
  const go = (el: HTMLInputElement, d: number) => {
    const all = [...document.querySelectorAll<HTMLInputElement>(".regs .regval")];
    const next = all[all.indexOf(el) + d];
    if (next) {
      next.focus();
      next.select();
    } else commit();
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const raw = e.clipboardData.getData("text");
    const parts = raw
      .split(str ? /[\t\r\n]+/ : /[\t\r\n,]+/)
      .map((x) => (str ? x : x.trim()))
      .filter(Boolean);
    if (parts.length <= 1) return; // 값 하나는 보통 붙여넣기
    e.preventDefault();
    onPasteMany(parts).then((first) => first != null && setText(first));
  };
  return (
    <input
      className={check(text) ? "regval" : "regval bad"}
      value={text}
      spellCheck={false}
      onFocus={() => setEditing(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onPaste={onPaste}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          go(e.currentTarget, e.key === "ArrowUp" || (e.key === "Enter" && e.shiftKey) ? -1 : 1);
        } else if (e.key === "Escape") {
          // 고치던 글자를 버리고 지금 값으로 — 포커스는 그대로(다시 칠 수 있게)
          e.preventDefault();
          setText(shown);
          const el = e.currentTarget;
          requestAnimationFrame(() => el.select());
        }
      }}
    />
  );
}
