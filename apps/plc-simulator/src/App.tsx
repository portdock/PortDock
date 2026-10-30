import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";
import { VERSION } from "@shared/version";
import { ask, open as openDialog, save } from "@tauri-apps/plugin-dialog";
import { api, DEV_GROUPS, DEV_INFO, DEVS, END_CODES, type Dev, type Faults, type Frame, type NetConfig, type Peer, type SessionEvent, type Stats } from "./api";
import { decodeValue, encodeValue, formatValue, isPlainPoint, layout, mergePoints, parse16, parseValue, pointRegs, simSummary, simToSpec, type Item, type Point, type SimCfg, type SimSpec, type VType } from "../../modbus-slave/src/regmap";
import { addrText, cleanLastOk, isLoopback, numText, packWord, parseCommands, parseDevices, parseEndCode, parseNum, parseState, runs, show16, sparse, STATE_APP, unpackWord, type Fmt, type SparseValues, type StateFile } from "./model";
import { PointDialog } from "./PointDialog";
import { Traffic, type TrafficHandle } from "./Traffic";
import { tip } from "@shared/tips";
import { ReportButton } from "@shared/ReportDialog";
import { noteError } from "@shared/report";
import { HelpDialog, useHelpKey } from "@shared/HelpDialog";
import { FirstCard } from "@shared/FirstCard";
import { help } from "./help";
import { load, store } from "@shared/framing";
import { autoLogPath, useFold, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { useToast } from "@shared/Toast";
import { KEYS, useShortcuts, withKey } from "@shared/shortcuts";
import { useWindowTitle, windowTitle } from "@shared/useWindowTitle";
import { PinButton } from "@shared/PinButton";
import { NarrowBar, SideBackdrop, SideClose, SideTools } from "@shared/NarrowBar";
import { Splitter, useStoredHeight } from "@shared/Splitter";
import { ui } from "@shared/uiText";
import { RecentButton, RecentHosts, useRecent } from "@shared/RecentPicker";
import { joinHostPort, splitHostPort } from "@shared/recent";
import { saveName } from "@shared/fileName";
import { useKeepAwake } from "@shared/useKeepAwake";
import { loadLastOk, saveLastOk, useAutoStart } from "@shared/autoStart";
import { count as countUsage } from "@shared/usage";
import { plcLaunch, type PlcLaunch } from "./launch";
import { dict, type Key, type Lang } from "./i18n";
import "./App.css";

type Status = "idle" | "connected" | "listening" | "disconnected" | "reconnecting" | "closed";
type View = { start: number; count: number };
type BitView = "bit" | "word";

const APP = "PortDock PLC Simulator";
const MAX_VIEW = 2000;
const DEFAULT_NET: NetConfig = { transport: "tcp", host: "127.0.0.1", port: 5000, format: { frame: "3e", code: "binary" }, ownStationOnly: false };
const NO_FAULTS: Faults = { delayMs: 0, delayMaxMs: 0, noResponse: false, forceEndCode: 0, target: { commands: [], devices: [], everyNth: 1, probability: 100 } };
const defaultView = (d: Dev): View => ({ start: 0, count: DEV_INFO[d].bits ? 64 : 100 });
const sizesDefault = () => Object.fromEntries(DEVS.map((d) => [d, DEV_INFO[d].size])) as Record<Dev, number>;
const fmtLabel = (f: { frame: string; code: string }, lang: Lang) => `${f.frame.toUpperCase()} ${f.code === "ascii" ? "ASCII" : dict[lang].codeBinary}`;

function usePersist(k: string, v: unknown) {
  useEffect(() => store(k, v), [k, v]);
}

/** 저장해 둔 화면 설정 읽기 — 모양이 틀리면 기본값 */
function loadNet(): NetConfig {
  const v = load<Partial<NetConfig>>("net", {});
  const f = v.format;
  return {
    transport: v.transport === "udp" ? "udp" : "tcp",
    host: typeof v.host === "string" && v.host.trim() ? v.host : DEFAULT_NET.host,
    port: Number.isInteger(v.port) && (v.port as number) >= 0 && (v.port as number) <= 65535 ? (v.port as number) : DEFAULT_NET.port,
    format: { frame: f?.frame === "4e" ? "4e" : "3e", code: f?.code === "ascii" ? "ascii" : "binary" },
    ownStationOnly: v.ownStationOnly === true,
  };
}

export default function App() {
  const { settings, update, reset } = useSettings();
  const lang = settings.lang;
  const setLang = (l: Lang) => update({ lang: l });
  const t = useCallback((k: Key) => dict[lang][k], [lang]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState<boolean | string>(false);
  const openHelp = useCallback(() => setShowHelp(true), []);
  useHelpKey(openHelp);
  const maxLines = useRef(settings.maxLines);
  maxLines.current = settings.maxLines;
  const [showSide, setShowSide] = useState(false);
  const toast = useToast(lang);

  // ---- 서버 설정
  const [net, setNet] = useState<NetConfig>(loadNet);
  usePersist("net", net);
  const recent = useRecent("plc");
  const [peers, setPeers] = useState<Peer[]>([]);
  const [local, setLocal] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (error) noteError(error);
  }, [error]);
  const [connectErr, setConnectErr] = useState<string | null>(null);
  const [logPath, setLogPath] = useState<string | null>(null);

  // ---- 통신 기록
  const traffic = useRef<Frame[]>([]);
  const seqRef = useRef(0);
  const failCount = useRef(0);
  const trafficApi = useRef<TrafficHandle | null>(null);
  const onEvent = useCallback((e: SessionEvent) => {
    if (e.type === "frames") {
      for (const f of e.frames) f.seq = ++seqRef.current;
      traffic.current.push(...e.frames);
      if (traffic.current.length > maxLines.current) traffic.current.splice(0, traffic.current.length - maxLines.current);
      trafficApi.current?.bump();
    } else if (e.type === "status") {
      setStatus(e.state);
      setStatusMsg(e.message);
      if (e.state === "closed") {
        setConnected(false);
        setLogPath(null);
        setPeers([]);
        setLocal(null);
      }
    } else if (e.type === "peers") setPeers(e.peers);
    else if (e.type === "error") setError(e.message);
  }, []);
  const addEv = useCallback((note: string) => {
    traffic.current.push({ ts: Date.now(), dir: "ev", bytes: [], check: null, note, seq: ++seqRef.current });
    trafficApi.current?.bump();
  }, []);

  // ---- 디바이스 표(연결과 따로 살아 있다)
  const [dev, setDev] = useState<Dev>(() => {
    const d = load<string>("dev", "D");
    return (DEVS as string[]).includes(d) ? (d as Dev) : "D";
  });
  const [sizes, setSizes] = useState<Record<Dev, number>>(() => ({ ...sizesDefault(), ...load<Partial<Record<Dev, number>>>("sizes", {}) }));
  const [views, setViews] = useState<Partial<Record<Dev, View>>>(() => load("views", {}));
  const [fmt, setFmt] = useState<Fmt>(() => load<Fmt>("fmt", "u16"));
  const [bitView, setBitView] = useState<BitView>(() => (load<string>("bitView", "bit") === "word" ? "word" : "bit"));
  const [points, setPoints] = useState<Partial<Record<Dev, Point[]>>>(() => load("points", {}));
  const [sims, setSims] = useState<Partial<Record<Dev, SimCfg[]>>>(() => load("sims", {}));
  const [firstDone, setFirstDone] = useState<boolean>(() => load("firstHintDone", false));
  usePersist("dev", dev);
  usePersist("sizes", sizes);
  usePersist("views", views);
  usePersist("fmt", fmt);
  usePersist("bitView", bitView);
  usePersist("points", points);
  usePersist("sims", sims);
  usePersist("firstHintDone", firstDone);
  const info = DEV_INFO[dev];
  const size = sizes[dev];
  const view = views[dev] ?? defaultView(dev);
  const wordsOfBits = info.bits && bitView === "word";
  /** 화면 칸 하나가 차지하는 점 수 */
  const per = wordsOfBits ? 16 : 1;
  const cells = Math.max(0, Math.min(view.count, MAX_VIEW, Math.floor((size - view.start) / per)));
  const setView = (v: View) => setViews((o) => ({ ...o, [dev]: v }));

  // ---- 장애 주입(켤 때마다 꺼진 채)·접기
  const [faults, setFaults] = useState<Faults>(NO_FAULTS);
  const [fText, setFText] = useState({ cmds: "", devs: "" });
  const [endPick, setEndPick] = useState<string>("0");
  const [endText, setEndText] = useState("");
  const [faultOpenSaved, setFaultOpenSaved] = useState<boolean>(() => load("faultOpen", false));
  const [statsOpenSaved, setStatsOpenSaved] = useState<boolean>(() => load("statsOpen", false));
  const [advOpenSaved, setAdvOpenSaved] = useState(false);
  usePersist("faultOpen", faultOpenSaved);
  usePersist("statsOpen", statsOpenSaved);
  const [faultOpen, setFaultOpen] = useFold(faultOpenSaved, setFaultOpenSaved, settings.expandAll);
  const [statsOpen, setStatsOpen] = useFold(statsOpenSaved, setStatsOpenSaved, settings.expandAll);
  const [advOpen, setAdvOpen] = useFold(advOpenSaved, setAdvOpenSaved, settings.expandAll);
  const [trafficH, setTrafficH] = useStoredHeight("trafficH");
  const [cellDlg, setCellDlg] = useState<number | null>(null);

  // ---- 값 저장 — 0 이 아닌 칸만 «devValues» 하나에, 바뀌면 1초 뒤
  const savedVals = useRef<SparseValues>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushValues = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    store("devValues", savedVals.current);
  }, []);
  const remember = useCallback(
    (d: Dev, start: number, values: number[]) => {
      const m = (savedVals.current[d] ??= {});
      values.forEach((v, i) => {
        if (v) m[String(start + i)] = v;
        else delete m[String(start + i)];
      });
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flushValues, 1000);
    },
    [flushValues],
  );
  useEffect(() => {
    const onUnload = () => saveTimer.current && flushValues();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [flushValues]);

  /** 디바이스 하나의 자동 변화 → 백엔드 모양 */
  const specsFor = useCallback((d: Dev): SimSpec[] => (sims[d] ?? []).map((s) => simToSpec(s, points[d]?.find((p) => p.addr === s.addr), DEV_INFO[d].bits)).filter((x): x is SimSpec => !!x), [sims, points]);

  // ---- 켤 때: 크기·저장해 둔 값·장애(끔)를 엔진에
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      for (const d of DEVS) if (sizes[d] !== DEV_INFO[d].size) await api.setSize(d, sizes[d]);
      const sv = load<SparseValues>("devValues", {});
      const clean: SparseValues = {};
      for (const d of DEVS) {
        const m = sv?.[d];
        if (!m || typeof m !== "object") continue;
        clean[d] = {};
        for (const [start, vals] of runs(m)) {
          const fit = vals.slice(0, Math.max(0, sizes[d] - start)).map((v) => (DEV_INFO[d].bits ? (v ? 1 : 0) : v & 0xffff));
          if (!fit.length) continue;
          await api.setValues(d, start, fit);
          Object.assign(clean[d]!, sparse(start, fit));
        }
      }
      savedVals.current = clean;
      await api.setFaults(NO_FAULTS);
      setReady(true);
    })().catch((e) => setError(String(e)));
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 크기 — 바뀐 디바이스만
  const sentSizes = useRef<Partial<Record<Dev, number>>>({});
  useEffect(() => {
    if (!ready) return;
    for (const d of DEVS) {
      if ((sentSizes.current[d] ?? DEV_INFO[d].size) === sizes[d]) continue;
      sentSizes.current[d] = sizes[d];
      api.setSize(d, sizes[d]).catch((e) => setError(String(e)));
    }
  }, [ready, sizes]);
  useEffect(() => {
    if (ready) api.setFaults(faults).catch((e) => setError(String(e)));
  }, [ready, faults]);
  useEffect(() => {
    if (ready) api.setOptions({ ownStationOnly: net.ownStationOnly }).catch((e) => setError(String(e)));
  }, [ready, net.ownStationOnly]);
  const pushed = useRef<Partial<Record<Dev, string>>>({});
  useEffect(() => {
    if (!ready) return;
    for (const d of DEVS) {
      const specs = specsFor(d);
      const sig = JSON.stringify(specs);
      if ((pushed.current[d] ?? "[]") === sig) continue;
      pushed.current[d] = sig;
      api.setSims(d, specs).catch((e) => setError(String(e)));
    }
  }, [ready, specsFor]);

  // ---- 보이는 값: 0.3초마다 다시 읽고, 클라이언트가 바꾼 칸을 잠깐 표시
  const [values, setValues] = useState<number[]>([]);
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<Stats | null>(null);
  const prev = useRef<{ k: string; v: number[] }>({ k: "", v: [] });
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simAddrs = useMemo(() => {
    const s = new Set<number>();
    for (const c of sims[dev] ?? []) {
      const p = points[dev]?.find((q) => q.addr === c.addr);
      const n = p ? pointRegs(p) : 1;
      for (let a = c.addr; a < c.addr + n; a++) s.add(a);
    }
    return s;
  }, [sims, points, dev]);
  const simAddrsRef = useRef(simAddrs);
  simAddrsRef.current = simAddrs;
  const refresh = useCallback(async () => {
    if (!ready) return;
    const n = cells * per;
    const v = n > 0 ? await api.getValues(dev, view.start, n) : [];
    const k = `${dev}:${view.start}:${n}`;
    if (prev.current.k === k) {
      const changed = new Set<number>();
      v.forEach((x, i) => x !== prev.current.v[i] && !simAddrsRef.current.has(view.start + i) && changed.add(view.start + i));
      if (changed.size) {
        setFlash(changed);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(new Set()), 1200);
      }
    }
    const same = prev.current.k === k && v.length === prev.current.v.length && v.every((x, i) => x === prev.current.v[i]);
    prev.current = { k, v };
    if (!same) setValues(v);
  }, [ready, dev, view.start, cells, per]);
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
  // 클라이언트가 쓰면(쓰기 수가 바뀌면) 1초 뒤 모든 디바이스를 읽어 저장한다
  const writes = stats?.writes;
  useEffect(() => {
    if (!ready || !writes) return;
    const timer = setTimeout(async () => {
      for (const d of DEVS) {
        const v = await api.getValues(d, 0, sizes[d]).catch(() => null);
        if (v) {
          savedVals.current[d] = sparse(0, v);
        }
      }
      flushValues();
    }, 1000);
    return () => clearTimeout(timer);
  }, [writes, ready, sizes, flushValues]);

  // ---- 칸
  const pts = points[dev];
  const items: Item[] = useMemo(() => (info.bits ? Array.from({ length: Math.min(cells, values.length / per) }, (_, i) => ({ addr: view.start + i * per, span: per })) : layout(view.start, Math.min(cells, values.length), pts)) as Item[], [info.bits, cells, values.length, per, view.start, pts]);
  const regsOf = (it: Item) => values.slice(it.addr - view.start, it.addr - view.start + it.span);
  const itemType = (it: Item): VType => it.point?.type ?? "u16";
  const showItem = (it: Item, regs = regsOf(it)) => {
    if (wordsOfBits) return show16(packWord(regs), fmt);
    const ty = itemType(it);
    const order = it.point?.order ?? "ABCD";
    if (ty === "u16") return show16((decodeValue(regs, "u16", order) as number | null) ?? 0, fmt);
    return formatValue(decodeValue(regs, ty, order, it.point?.len), ty);
  };
  /** 입력 → 쓸 값들(비트 디바이스 워드 보기는 16점). 틀리면 null */
  const parseItem = (it: Item, text: string): number[] | null => {
    if (wordsOfBits) {
      const n = parse16(text, fmt);
      return n == null ? null : unpackWord(n);
    }
    const ty = itemType(it);
    const order = it.point?.order ?? "ABCD";
    if (ty === "u16") {
      const n = parse16(text, fmt);
      return n == null ? null : encodeValue(n, "u16", order);
    }
    const v = parseValue(text, ty, it.point?.len);
    return v == null ? null : encodeValue(v, ty, order, it.point?.len);
  };
  const typeTag = (it: Item) => {
    const p = it.point;
    if (!p || p.type === "u16") return p && p.order !== "ABCD" ? p.order : "";
    return `${p.type === "string" ? `STR(${p.len ?? 2})` : p.type.toUpperCase()}${p.order !== "ABCD" ? ` ${p.order}` : ""}`;
  };
  const simOf = (a: number) => sims[dev]?.find((s) => s.addr === a);
  const cellLabel = (it: Item) => (it.span > 1 ? `${addrText(dev, it.addr)}–${numText(dev, it.addr + it.span - 1)}` : addrText(dev, it.addr));

  async function writeVals(addr: number, vals: number[]) {
    try {
      await api.setValues(dev, addr, vals);
    } catch (e) {
      setError(String(e));
      return false;
    }
    const next = values.slice();
    vals.forEach((v, k) => {
      const i = addr - view.start + k;
      if (i >= 0 && i < next.length) next[i] = v;
    });
    prev.current.v = next;
    setValues(next);
    remember(dev, addr, vals);
    return true;
  }

  async function pasteMany(i: number, tokens: string[]): Promise<string | null> {
    const vals: number[] = [];
    let n = 0;
    for (; n < tokens.length && i + n < items.length; n++) {
      const r = parseItem(items[i + n], tokens[n]);
      if (!r) {
        toast.show(t("pasteBad").replace("{a}", tokens[n]).replace("{b}", fmt.toUpperCase()), { error: true });
        return null;
      }
      vals.push(...r);
    }
    if (!n || !(await writeVals(items[i].addr, vals))) return null;
    const msg = t("pasted").replace("{n}", String(n)).replace("{a}", addrText(dev, items[i].addr));
    toast.show(tokens.length > n ? `${msg} · ${t("pasteCut").replace("{n}", String(tokens.length - n))}` : msg);
    return showItem(items[i], vals.slice(0, items[i].span));
  }

  async function fill() {
    if (!(await ask(t("askFill"), { title: APP, kind: "warning" }))) return;
    const n = cells * per;
    const v = Array.from({ length: n }, (_, i) => (info.bits ? i % 2 : (view.start + i) & 0xffff));
    if (await writeVals(view.start, v)) refresh();
  }

  /** 첫 실행 카드 «예제 채우기» — D0~D7 = 1~8(이름 둘), D8~D9 = F32 CDAB 23.5 «온도», M0~M7 = 1·0 */
  async function fillExample() {
    const d = await api.getValues("D", 0, 10).catch(() => null);
    const m = await api.getValues("M", 0, 8).catch(() => null);
    if (((d && d.some((x) => x)) || (m && m.some((x) => x))) && !(await ask(t("askExample"), { title: APP, kind: "warning" }))) return;
    const regs = [1, 2, 3, 4, 5, 6, 7, 8, ...encodeValue(23.5, "f32", "CDAB")];
    const bits = [1, 0, 1, 0, 1, 0, 1, 0];
    try {
      await api.setValues("D", 0, regs);
      await api.setValues("M", 0, bits);
    } catch (e) {
      setError(String(e));
      return;
    }
    remember("D", 0, regs);
    remember("M", 0, bits);
    setPoints((o) => ({
      ...o,
      D: mergePoints(o.D, [
        { addr: 0, type: "u16", order: "ABCD", name: t("exStatus") },
        { addr: 1, type: "u16", order: "ABCD", name: t("exSetpoint") },
        { addr: 8, type: "f32", order: "CDAB", name: t("exTemp") },
      ]),
    }));
    setDev("D");
    setViews((o) => ({ ...o, D: { start: 0, count: o.D?.count ?? 100 } }));
    toast.show(t("exampleDone"));
    refresh();
  }

  function saveCell(addr: number, p: Point | null, s: SimCfg | null) {
    setPoints((o) => {
      const list = (o[dev] ?? []).filter((q) => q.addr !== addr);
      return { ...o, [dev]: p && !isPlainPoint(p) ? [...list, p].sort((a, b) => a.addr - b.addr) : list };
    });
    setSims((o) => {
      const list = (o[dev] ?? []).filter((x) => x.addr !== addr);
      return { ...o, [dev]: s ? [...list, s].sort((a, b) => a.addr - b.addr) : list };
    });
    setCellDlg(null);
  }

  // ---- 저장·불러오기(JSON): 크기·0 이 아닌 값·칸 설정·자동 변화
  async function saveState() {
    const path = await save({ title: t("saveStateTitle"), defaultPath: saveName("plc-simulator", "devices", "json"), filters: [{ name: "JSON", extensions: ["json"] }] }).catch(() => null);
    if (!path) return;
    try {
      const values: SparseValues = {};
      for (const d of DEVS) {
        const v = await api.getValues(d, 0, sizes[d]);
        const m = sparse(0, v);
        if (Object.keys(m).length) values[d] = m;
      }
      const changed = Object.fromEntries(DEVS.filter((d) => sizes[d] !== DEV_INFO[d].size).map((d) => [d, sizes[d]]));
      const body: StateFile = { app: STATE_APP, version: 1, sizes: changed, values, points, sims };
      await api.writeText(path, JSON.stringify(body, null, 1));
      countUsage("save_state");
      toast.show(t("stateSaved").replace("{a}", path.split(/[\\/]/).pop() ?? path));
    } catch (e) {
      setError(String(e));
    }
  }
  async function loadState() {
    const path = await openDialog({ filters: [{ name: "JSON", extensions: ["json"] }] });
    if (!path || Array.isArray(path)) return;
    try {
      const r = parseState(await api.readText(path));
      if ("error" in r) throw new Error(t(r.error === "json" ? "stateBadJson" : "stateBadApp"));
      if (connected && !(await ask(t("askLoadRunning"), { title: APP, kind: "warning" }))) return;
      const st = r.state;
      const nextSizes = { ...sizesDefault(), ...st.sizes };
      for (const d of DEVS) await api.setSize(d, nextSizes[d]);
      sentSizes.current = { ...nextSizes };
      setSizes(nextSizes);
      let n = 0;
      const clean: SparseValues = {};
      for (const d of DEVS) {
        await api.setValues(d, 0, new Array<number>(nextSizes[d]).fill(0));
        clean[d] = {};
        for (const [start, vals] of runs(st.values[d] ?? {})) {
          const fit = vals.slice(0, Math.max(0, nextSizes[d] - start));
          if (!fit.length) continue;
          await api.setValues(d, start, fit);
          Object.assign(clean[d]!, sparse(start, fit));
          n += fit.length;
        }
      }
      savedVals.current = clean;
      flushValues();
      setPoints(st.points as Partial<Record<Dev, Point[]>>);
      setSims(st.sims as Partial<Record<Dev, SimCfg[]>>);
      countUsage("load_state");
      const msg = t("stateLoaded").replace("{a}", path.split(/[\\/]/).pop() ?? path).replace("{n}", String(n));
      toast.show(r.skipped ? `${msg} · ${t("stateSkipped").replace("{n}", String(r.skipped))}` : msg, r.skipped ? { ms: 6000 } : {});
      setError(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // ---- 시작·멈춤
  const start = () => startWith(net);
  async function startWith(n: NetConfig, auto = false) {
    if (connecting) return;
    setConnecting(true);
    setError(null);
    setConnectErr(null);
    setStatusMsg(null);
    try {
      const at = await api.start({ transport: n.transport, host: n.host.trim(), port: n.port, format: n.format }, onEvent);
      setLocal(at || null);
      setStatus((s) => (s === "idle" || s === "closed" ? "listening" : s));
      setConnected(true);
      recent.remember(joinHostPort(n.host.trim(), n.port));
      saveLastOk({ transport: n.transport, host: n.host.trim(), port: n.port, format: n.format });
      if (auto) {
        addEv(t("autoConnected").replace("{a}", `${n.transport.toUpperCase()} ${joinHostPort(n.host.trim(), n.port)} · ${fmtLabel(n.format, lang)}`));
        if (faultOn) addEv(t("autoFaults"));
      }
      if (settings.autoLog && settings.logFolder) {
        const p = autoLogPath(settings.logFolder, "plc-simulator");
        await api.setLog(p).then(() => setLogPath(p)).catch((e) => setError(String(e)));
      }
    } catch (e) {
      setConnectErr(String(e));
      noteError(String(e));
    } finally {
      setConnecting(false);
    }
  }
  async function stop() {
    await api.stop();
    setConnected(false);
    setStatus("closed");
    setStatusMsg(null);
    setLogPath(null);
    setPeers([]);
    setLocal(null);
  }
  const saveWhere = () => local || joinHostPort(net.host.trim() || "127.0.0.1", net.port);
  async function saveView() {
    const text = trafficApi.current?.screen();
    if (!text) return;
    const path = await save({ title: t("saveViewTitle"), defaultPath: saveName("plc-simulator", saveWhere(), "txt"), filters: [{ name: "Text", extensions: ["txt", "log"] }] }).catch(() => null);
    if (!path) return;
    await api
      .writeText(path, text)
      .then(() => toast.show(t("exported").replace("{a}", path.split(/[\\/]/).pop() ?? path)))
      .catch((e) => setError(String(e)));
  }
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
    const path = await save({ title: t("logDlgTitle"), defaultPath: saveName("plc-simulator", saveWhere(), "log"), filters: [{ name: "Log", extensions: ["log", "txt"] }] });
    if (!path) return;
    await api.setLog(path).then(() => setLogPath(path)).catch((e) => setError(String(e)));
  }

  // ---- 장애 대상 글 — 맞는 글이면 바로 적용, 틀리면 빨갛게
  const fErr = { cmds: parseCommands(fText.cmds) == null, devs: parseDevices(fText.devs) == null };
  function setTargetText(k: keyof typeof fText, v: string) {
    const next = { ...fText, [k]: v };
    setFText(next);
    const cmds = parseCommands(next.cmds);
    const devs = parseDevices(next.devs);
    if (cmds == null || devs == null) return;
    setFaults((f) => ({ ...f, target: { ...f.target, commands: cmds, devices: devs } }));
  }
  function pickEnd(v: string) {
    setEndPick(v);
    if (v === "custom") setFaults((f) => ({ ...f, forceEndCode: parseEndCode(endText) ?? 0 }));
    else setFaults((f) => ({ ...f, forceEndCode: Number(v) }));
  }
  const tg = faults.target;
  const targeted = tg.commands.length > 0 || tg.devices.length > 0 || tg.everyNth > 1 || tg.probability < 100;
  const faultOn = faults.delayMs > 0 || faults.delayMaxMs > 0 || faults.noResponse || faults.forceEndCode > 0;
  useEffect(() => {
    if (targeted) setAdvOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targeted]);
  useEffect(() => {
    if (faultOn) setFaultOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faultOn]);
  const hex4 = (n: number) => n.toString(16).toUpperCase().padStart(4, "0");
  const faultList = [
    faults.delayMs > 0 || faults.delayMaxMs > 0 ? `${faults.delayMs}${faults.delayMaxMs > faults.delayMs ? `–${faults.delayMaxMs}` : ""}ms` : "",
    faults.noResponse ? t("noResponse").replace(/\s*\(.*\)$/, "") : "",
    faults.forceEndCode > 0 ? hex4(faults.forceEndCode) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const targetText = [tg.commands.length ? tg.commands.map(hex4).join(",") : "", tg.devices.join(","), tg.everyNth > 1 ? `×${tg.everyNth}` : "", tg.probability < 100 ? `${tg.probability}%` : ""].filter(Boolean).join(" · ");

  useExitGuard(connected || !!logPath, settings.confirmExit, lang, APP);
  const startable = !!net.host.trim();
  const runDisabled = connecting || (!connected && !startable);
  useShortcuts([
    { key: "F4", run: () => !runDisabled && void (connected ? stop() : start()) },
    { key: "l", ctrl: true, run: () => trafficApi.current?.clear() },
    { key: "l", ctrl: true, shift: true, run: () => connected && void toggleLog() },
    { key: "s", ctrl: true, run: () => void saveView() },
  ]);
  useKeepAwake(connected || !!logPath, settings.keepAwake);

  // ---- 명령줄 «--auto»·켤 때 마지막 설정으로 다시 시작
  const [launch, setLaunch] = useState<PlcLaunch | null>(null);
  const launchDone = useRef(false);
  useEffect(() => {
    if (launchDone.current) return;
    launchDone.current = true;
    api
      .launchArgs()
      .then((argv) => {
        const l = plcLaunch(argv ?? []);
        if (l.bad.length) toast.show(dict[lang].launchBad.replace("{a}", l.bad.join(", ")), { error: true, ms: 9000 });
        setLaunch(l);
      })
      .catch(() => setLaunch({ auto: false, bad: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useAutoStart(settings.autoConnect || !!launch?.auto, ready && launch !== null, () => {
    const last = cleanLastOk(loadLastOk());
    if (!last || connected || connecting) return;
    const n = { ...net, ...last };
    setNet(n);
    void startWith(n, true);
  });

  const clearError = useCallback(() => setError(null), []);
  const onCopied = (ok: boolean, n: number) => toast.show(ok ? ui(lang, "copied", { n }) : ui(lang, "copyFail"), { error: !ok });

  // ---- 창 제목·요약
  const where = local || joinHostPort(net.host.trim(), net.port);
  const peersText = t(net.transport === "udp" ? "senders" : "clients").replace("{n}", String(peers.length));
  useWindowTitle(windowTitle(APP, connected ? [`${net.transport.toUpperCase()} ${where}`, fmtLabel(net.format, lang), peersText] : [], !!logPath));
  const statusKey = `status_${status}` as Key;
  const summaryLine = `${net.transport.toUpperCase()} ${where} · ${fmtLabel(net.format, lang)} · ${t(statusKey)}${connected ? ` · ${peersText}` : ""}`;
  const runLabel = connected ? t("stop") : t("start");
  const open = !isLoopback(net.host);
  const dlgItem = cellDlg == null ? undefined : items.find((x) => x.addr === cellDlg);
  const lastNo = Math.max(0, size - 1);

  /** 칸 하나의 값 입력(비트 보기는 체크칸) */
  const valueControl = (it: Item, i: number) =>
    info.bits && !wordsOfBits ? (
      <input type="checkbox" checked={(values[it.addr - view.start] ?? 0) !== 0} onChange={(e) => writeVals(it.addr, [e.target.checked ? 1 : 0])} aria-label={addrText(dev, it.addr)} />
    ) : (
      <RegInput
        text={showItem(it)}
        check={(s) => parseItem(it, s) != null}
        onCommit={(s) => {
          const r = parseItem(it, s);
          if (r) writeVals(it.addr, r);
        }}
        onPasteMany={(tokens) => pasteMany(i, tokens)}
        str={it.point?.type === "string"}
      />
    );

  const regsView = useMemo(
    () => (
      <div className="regs">
        {items.map((it, i) => {
          const fl = Array.from({ length: it.span }, (_, k) => flash.has(it.addr + k)).some(Boolean);
          const sim = simOf(it.addr);
          const name = it.point?.name ?? (info.bits && !wordsOfBits ? (pts?.find((p) => p.addr === it.addr)?.name ?? "") : "");
          const tag = info.bits ? "" : typeTag(it);
          const canCfg = !wordsOfBits;
          return (
            <div
              key={`${dev}:${bitView}:${it.addr}`}
              className={`reg${fl ? " flash" : ""}${it.span > 1 && !wordsOfBits ? " wide" : ""}${wordsOfBits ? " wordbits" : ""}${info.bits && !wordsOfBits ? " bitcell" : ""}`}
              style={it.span > 1 && !wordsOfBits ? { gridColumn: `span ${it.span >= 4 ? 3 : 2}` } : undefined}
              title={fl ? t("writtenByClient") : name}
              onContextMenu={(e) => {
                if (!canCfg) return;
                e.preventDefault();
                setCellDlg(it.addr);
              }}
            >
              <span className="addr">{wordsOfBits ? cellLabel(it) : addrText(dev, it.addr)}</span>
              {name && <span className="rname">{name}</span>}
              {valueControl(it, i)}
              {tag && <span className="rtype">{tag}</span>}
              {sim && (
                <span className="simmark" title={t("simMark").replace("{a}", simSummary(sim, lang))} aria-label={t("simMark").replace("{a}", simSummary(sim, lang))}>
                  ◷
                </span>
              )}
              {canCfg && (
                <button className="cellcfg" onClick={() => setCellDlg(it.addr)} aria-label={`${t("cellCfg")} ${addrText(dev, it.addr)}`} data-tip={tip(lang, "plcCellCfg")}>
                  ⋯
                </button>
              )}
            </div>
          );
        })}
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, values, flash, fmt, dev, bitView, sims, pts, lang, toast.show],
  );

  // 머리줄 도구 — 넓은 창은 왼쪽 칸 머리, 좁은 창은 요약 줄(NarrowBar)에 그린다(한 번에 한 곳)
  const headTools = (
    <>
            <select className="lang" aria-label={lang === "ko" ? "언어" : "Language"} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
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
    </>
  );
  return (
    <div className={showSide ? "app show-side" : "app"}>
      <SideBackdrop open={showSide} onClose={() => setShowSide(false)} />
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>PLC Simulator</small>
          </span>
          <span className="brand-tools">
            <SideTools>{headTools}</SideTools>
            <SideClose lang={lang} onClose={() => setShowSide(false)} />
          </span>
        </div>

        <label data-tip={tip(lang, "plcTransport")}>
          {t("transport")}
          <select value={net.transport} disabled={connected} title={connected ? t("lockedHint") : ""} onChange={(e) => setNet({ ...net, transport: e.target.value === "udp" ? "udp" : "tcp" })}>
            <option value="tcp">{t("trTcp")}</option>
            <option value="udp">{t("trUdp")}</option>
          </select>
        </label>
        <div className="grid2">
          <label data-tip={tip(lang, "plcFrame")}>
            {t("frame")}
            <select value={net.format.frame} disabled={connected} onChange={(e) => setNet({ ...net, format: { ...net.format, frame: e.target.value === "4e" ? "4e" : "3e" } })}>
              <option value="3e">3E</option>
              <option value="4e">4E</option>
            </select>
          </label>
          <label data-tip={tip(lang, "plcCode")}>
            {t("code")}
            <select value={net.format.code} disabled={connected} onChange={(e) => setNet({ ...net, format: { ...net.format, code: e.target.value === "ascii" ? "ascii" : "binary" } })}>
              <option value="binary">{t("codeBinary")}</option>
              <option value="ascii">{t("codeAscii")}</option>
            </select>
          </label>
        </div>
        <div className="grid2 net">
          <div className="host-cell">
            <label data-tip={tip(lang, "plcBind")}>
              {t("bindHost")}
              <input className={net.host.trim() ? "" : "bad"} value={net.host} disabled={connected} spellCheck={false} list="recent-hosts" onChange={(e) => setNet({ ...net, host: e.target.value })} />
            </label>
            <RecentButton
              lang={lang}
              recent={recent}
              disabled={connected}
              onPick={(v) => {
                const { host, port } = splitHostPort(v);
                setNet({ ...net, host, port: port ?? net.port });
              }}
            />
            <RecentHosts id="recent-hosts" recent={recent} />
          </div>
          <label data-tip={tip(lang, "plcPort")}>
            {t("netPort")}
            <NumInput min={0} max={65535} value={net.port} disabled={connected} onValue={(n) => setNet({ ...net, port: n })} />
          </label>
        </div>
        <label className="inline" data-tip={tip(lang, "plcAllowOthers")}>
          <input type="checkbox" checked={open} disabled={connected} onChange={(e) => setNet({ ...net, host: e.target.checked ? "0.0.0.0" : "127.0.0.1" })} /> {t("allowOthers")}
        </label>
        {!net.host.trim() ? <div className="interlock">{t("hostEmpty")}</div> : open ? <div className="hint warn open-warn">{t("openHint")}</div> : !connected && <span className="hint">{t("localOnlyHint")}</span>}
        <label className="inline" data-tip={tip(lang, "plcOwnStation")}>
          <input type="checkbox" checked={net.ownStationOnly} onChange={(e) => setNet({ ...net, ownStationOnly: e.target.checked })} /> {t("ownStation")}
        </label>
        <button data-tip={withKey(tip(lang, connected ? "plcStop" : "plcStart"), KEYS.connect)} className={connected ? "btn danger" : "btn primary"} onClick={connected ? stop : start} disabled={runDisabled}>
          {runLabel}
        </button>
        {connected && <span className="lock-note">🔒 {t("lockedHint")}</span>}
        {connectErr && !connected ? (
          <div className="status s-failed" role="alert">
            <b>{t("connectFailed")}</b> · {connectErr}
          </div>
        ) : (
          <div className={`status s-${status}`}>
            {t(statusKey)}
            {statusMsg ? ` · ${statusMsg}` : ""}
            {connected && (
              <div className="clients" data-tip={tip(lang, "plcClients")}>
                {local ? `${local} · ` : ""}
                {peersText}
              </div>
            )}
          </div>
        )}
        {connected && (
          <ul className="peer-list" aria-label={peersText}>
            {peers.length === 0 && <li className="hint">{t("noClients")}</li>}
            {peers.map((p) => (
              <li key={p.id}>
                <span className="mono">{p.addr}</span>
                {net.transport === "tcp" && (
                  <button className="btn small ghost peer-kick" onClick={() => api.kick(p.id).catch((e) => setError(String(e)))} title={`${t("kick")} ${p.addr}`} aria-label={`${t("kick")} ${p.addr}`}>
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <hr />
        <details className={faultOn ? "adv panel on" : "adv panel"} open={faultOpen} onToggle={(e) => setFaultOpen((e.target as HTMLDetailsElement).open)}>
          <summary data-tip={tip(lang, "plcFaults")}>
            <span className="sum-title">{faultOn ? t("faultsOn") : t("faults")}</span>
            {!faultOpen && <span className="sum-note">{faultOn ? faultList : t("faultsOff")}</span>}
          </summary>
          <label data-tip={tip(lang, "plcDelay")}>
            {t("delay")}
            <NumInput min={0} max={600000} value={faults.delayMs} onValue={(n) => setFaults({ ...faults, delayMs: n })} />
          </label>
          <label data-tip={tip(lang, "noResponse")} className="inline">
            <input type="checkbox" checked={faults.noResponse} onChange={(e) => setFaults({ ...faults, noResponse: e.target.checked })} /> {t("noResponse")}
          </label>
          <label data-tip={tip(lang, "plcForceEnd")}>
            {t("forceEnd")}
            <select value={endPick} onChange={(e) => pickEnd(e.target.value)}>
              <option value="0">{t("faultsOff")}</option>
              {END_CODES.map(([c, ko, en]) => (
                <option key={c} value={String(c)}>
                  {hex4(c)} {lang === "ko" ? ko : en}
                </option>
              ))}
              <option value="custom">{t("forceEndCustom")}</option>
            </select>
          </label>
          {endPick === "custom" && (
            <>
              <label>
                {t("forceEndHex")}
                <input
                  className={parseEndCode(endText) == null ? "bad mono" : "mono"}
                  value={endText}
                  placeholder="C051"
                  spellCheck={false}
                  onChange={(e) => {
                    setEndText(e.target.value);
                    setFaults((f) => ({ ...f, forceEndCode: parseEndCode(e.target.value) ?? 0 }));
                  }}
                />
              </label>
              {parseEndCode(endText) == null && <div className="error">{t("badEnd")}</div>}
            </>
          )}
          <details className="adv" open={advOpen} onToggle={(e) => setAdvOpen((e.target as HTMLDetailsElement).open)}>
            <summary data-tip={tip(lang, "plcFaultAdv")}>{t("faultAdv")}</summary>
            <label data-tip={tip(lang, "delayMax")}>
              {t("delayMax")}
              <NumInput min={0} max={600000} value={faults.delayMaxMs} onValue={(n) => setFaults({ ...faults, delayMaxMs: n })} />
            </label>
            <label data-tip={tip(lang, "plcFaultCmds")}>
              {t("fCmds")}
              <input className={fErr.cmds ? "bad" : ""} value={fText.cmds} placeholder={t("fAll")} spellCheck={false} onChange={(e) => setTargetText("cmds", e.target.value)} />
            </label>
            {fErr.cmds && <div className="error">{t("fBadCmds")}</div>}
            <label data-tip={tip(lang, "plcFaultDevs")}>
              {t("fDevs")}
              <input className={fErr.devs ? "bad" : ""} value={fText.devs} placeholder={t("fAll")} spellCheck={false} onChange={(e) => setTargetText("devs", e.target.value)} />
            </label>
            {fErr.devs && <div className="error">{t("fBadDevs")}</div>}
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
        </details>
        {faultOn && (
          <div className="hint warn" role="status">
            ⚠ {t("faults")}
            {targeted && targetText ? ` — ${t("fTarget")}: ${targetText}` : ""}
          </div>
        )}
        {(faults.delayMs >= 1000 || faults.delayMaxMs >= 1000) && <div className="interlock">{t("ilDelay")}</div>}
        {faults.delayMaxMs > 0 && faults.delayMaxMs < faults.delayMs && <div className="interlock">{t("ilJitter").replace("{a}", String(faults.delayMs))}</div>}
        {faults.noResponse && faults.forceEndCode > 0 && <div className="interlock">{t("ilNoRespWins")}</div>}

        <hr />
        <details className="adv panel" open={statsOpen} onToggle={(e) => setStatsOpen((e.target as HTMLDetailsElement).open)}>
          <summary data-tip={tip(lang, "plcStats")}>
            <span className="sum-title">{t("stats")}</span>
            {stats && <span className={stats.errors || stats.ignored ? "sum-note bad" : "sum-note"}>{t("statsSum").replace("{r}", String(stats.requests)).replace("{e}", String(stats.errors))}</span>}
          </summary>
          {stats && (
            <table className="stats">
              <tbody>
                <tr>
                  <td>{t("stRequests")}</td>
                  <td>{stats.requests}</td>
                </tr>
                <tr>
                  <td>{t("stOk")}</td>
                  <td>{stats.ok}</td>
                </tr>
                <tr className={stats.errors ? "warnrow" : ""}>
                  <td>{t("stErrors")}</td>
                  <td>{stats.errors}</td>
                </tr>
                <tr className={stats.ignored ? "warnrow" : ""}>
                  <td>{t("stIgnored")}</td>
                  <td>{stats.ignored}</td>
                </tr>
                <tr>
                  <td>{t("stWrites")}</td>
                  <td>{stats.writes}</td>
                </tr>
                {stats.noResponse > 0 && (
                  <tr>
                    <td>{t("stNoResp")}</td>
                    <td>{stats.noResponse}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {stats && Object.keys(stats.perCmd).length > 0 && (
            <div className="perfc">
              {t("stPerCmd")}:{" "}
              {Object.entries(stats.perCmd)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([c, n]) => `${c}×${n}`)
                .join(" · ")}
            </div>
          )}
          {stats && Object.keys(stats.perEnd).length > 0 && (
            <div className="perfc">
              {t("stPerEnd")}:{" "}
              {Object.entries(stats.perEnd)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([c, n]) => `${c}×${n}`)
                .join(" · ")}
            </div>
          )}
          <button data-tip={tip(lang, "reset")} className="btn small" onClick={() => api.resetStats()}>
            {t("reset")}
          </button>
        </details>
      </aside>

      <main className="main">
        <NarrowBar tools={headTools} lang={lang} open={showSide} onToggle={() => setShowSide(!showSide)} dot={connectErr && !connected ? "s-disconnected" : `s-${status === "listening" ? "connected" : status}`} summary={summaryLine}>
          <button className={connected ? "btn small danger" : "btn small primary"} onClick={connected ? stop : start} disabled={runDisabled} data-tip={withKey(tip(lang, connected ? "plcStop" : "plcStart"), KEYS.connect)}>
            {runLabel}
          </button>
        </NarrowBar>
        <div className="toolbar devbar" role="group" aria-label={t("device")}>
          {DEV_GROUPS.map((g, gi) => (
            <span key={gi} className="segs" role="group" aria-label={t(gi === 0 ? "devBits" : gi === 1 ? "devWords" : "devTimers")}>
              {g.map((d) => (
                <button key={d} className={dev === d ? "seg on" : "seg"} aria-pressed={dev === d} onClick={() => setDev(d)} title={`${d} — ${DEV_INFO[d].bits ? t("devBits") : t("devWords")}${DEV_INFO[d].hex ? ` · ${t("hexBase")}` : ""}`}>
                  {d}
                </button>
              ))}
            </span>
          ))}
          <span className="grow" />
          <button className="btn small" onClick={fill} data-tip={tip(lang, "fill")}>
            {t("fill")}
          </button>
          <button className="btn small" onClick={saveState} data-tip={tip(lang, "plcSave")}>
            {t("saveState")}
          </button>
          <button className="btn small" onClick={loadState} data-tip={tip(lang, "plcLoad")}>
            {t("loadState")}
          </button>
        </div>
        <div className="toolbar">
          <label data-tip={tip(lang, "plcStartNo")} className="inline">
            {t("startNo")}
            <AddrInput
              dev={dev}
              value={view.start}
              max={lastNo}
              bad={(s) => t("badStart").replace("{d}", dev).replace("{base}", info.hex ? t("hexBase") : t("decBase")) + (s ? ` (${s})` : "")}
              onValue={(n) => setView({ ...view, start: n })}
            />
          </label>
          <label data-tip={tip(lang, "plcCount")} className="inline">
            {t("count")}
            <NumInput className="num" min={1} max={MAX_VIEW} value={view.count} onValue={(n) => setView({ ...view, count: n })} />
          </label>
          <label data-tip={tip(lang, "plcSize")} className="inline">
            {t("size")}
            <NumInput className="num size-num" min={1} max={65536} value={size} commitOnBlur onValue={(n) => setSizes((o) => ({ ...o, [dev]: n }))} />
          </label>
          {info.bits && (
            <span className="segs" role="group" aria-label={t("view")} data-tip={tip(lang, "plcBitView")}>
              {(["bit", "word"] as const).map((v) => (
                <button key={v} className={bitView === v ? "seg on" : "seg"} aria-pressed={bitView === v} onClick={() => setBitView(v)}>
                  {v === "bit" ? t("viewBits") : t("viewWords")}
                </button>
              ))}
            </span>
          )}
          {(!info.bits || wordsOfBits) && (
            <label data-tip={tip(lang, "plcFormat")} className="inline">
              {t("format")}
              <select className="fmt-sel" value={fmt} onChange={(e) => setFmt(e.target.value as Fmt)}>
                <option value="u16">U16</option>
                <option value="s16">S16</option>
                <option value="hex">HEX</option>
                <option value="bin">BIN</option>
              </select>
            </label>
          )}
          <span className="hint range-now" data-tip={tip(lang, "plcSize")} title={t("sizeHint")}>
            {t("rangeNow").replace("{a}", addrText(dev, 0)).replace("{b}", addrText(dev, lastNo))}
          </span>
        </div>

        {regsView}

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
          peers
          error={error}
          onClearError={clearError}
          onCopied={onCopied}
          onSaveView={() => void saveView()}
          empty={
            firstDone ? (
              <div className="tlog-empty hint">{t("first3")}</div>
            ) : (
              <FirstCard lang={lang} className="tlog-empty" title={t("firstTitle")} onHide={() => setFirstDone(true)} links={[{ id: "start", label: t("firstTitle") }]} onHelp={setShowHelp}>
                <div className="first-steps">
                  <span>① {t("first1")}</span> <span>② {t("first2")}</span> <span>③ {t("first3")}</span>
                </div>
                <div className="first-picks">
                  <button type="button" className="btn small first-example" onClick={fillExample} data-tip={tip(lang, "plcExample")}>
                    {t("firstExample")}
                  </button>
                </div>
              </FirstCard>
            )
          }
        />
        <div className="disclaimer hint">{t("disclaimer")}</div>
      </main>
      {cellDlg != null && dlgItem && (
        <PointDialog
          lang={lang}
          bits={info.bits}
          addr={cellDlg}
          addrLabel={(a) => addrText(dev, a)}
          size={size}
          points={pts ?? []}
          point={dlgItem.point ?? pts?.find((p) => p.addr === cellDlg)}
          sim={simOf(cellDlg)}
          onSave={(p, s) => saveCell(cellDlg, p, s)}
          onClose={() => setCellDlg(null)}
        />
      )}
      {showHelp && <HelpDialog doc={help} lang={lang} app={APP} start={typeof showHelp === "string" ? showHelp : null} onClose={() => setShowHelp(false)} />}
      {showSettings && (
        <SettingsDialog app={APP} version={VERSION} settings={settings} update={update} reset={reset} onClose={() => setShowSettings(false)} writeText={api.writeText} readText={api.readText} busy={connected || !!logPath} run />
      )}
      {toast.node}
    </div>
  );
}

/** 시작 번호 칸 — 16진 디바이스(X·Y·B·W·ZR)는 16진으로. Enter·포커스 잃을 때 반영, 틀리면 빨갛게 */
function AddrInput({ dev, value, max, onValue, bad }: { dev: Dev; value: number; max: number; onValue: (n: number) => void; bad: (s: string) => string }) {
  const [text, setText] = useState(numText(dev, value));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(numText(dev, value));
  }, [dev, value, editing]);
  const n = parseNum(dev, text);
  const ok = n != null && n <= max;
  const commit = () => {
    setEditing(false);
    if (ok && n !== value) onValue(n);
    else setText(numText(dev, value));
  };
  return (
    <input
      className={ok ? "num addr-in mono" : "num addr-in mono bad"}
      value={text}
      spellCheck={false}
      title={ok ? `${dev}${numText(dev, n)}` : bad(text)}
      aria-label={`${dev} ${text}`}
      onFocus={() => setEditing(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        else if (e.key === "Escape") {
          setText(numText(dev, value));
          setEditing(false);
        }
      }}
    />
  );
}

/**
 * 값 칸 — 입력 중엔 화면 갱신이 덮어쓰지 않게, 엔터·포커스 잃을 때 반영(Modbus Slave 와 같은 손놀림).
 * Enter·↓ 다음 칸, ↑·Shift+Enter 앞 칸, Esc 고치기 취소, 여러 값 붙여넣기.
 */
function RegInput({ text: shown, check, onCommit, onPasteMany, str }: { text: string; check: (s: string) => boolean; onCommit: (s: string) => void; onPasteMany: (tokens: string[]) => Promise<string | null>; str?: boolean }) {
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
    if (parts.length <= 1) return;
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
          e.preventDefault();
          setText(shown);
          const el = e.currentTarget;
          requestAnimationFrame(() => el.select());
        }
      }}
    />
  );
}
