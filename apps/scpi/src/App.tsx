import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as KeyEv } from "react";
import { VERSION } from "@shared/version";
import { save } from "@tauri-apps/plugin-dialog";
import { api, asScpiError, hex, isFatal, type ErrEntry, type ExchangeOut, type NetConfig, type PortInfo, type ScpiError, type SerialConfig, type Term, type Transport } from "./api";
import { addSample, blockExt, clampInt, COMMON, findCommon, fmtNum, hexDump, isQuery, parseIdn, parseNumber, sampleStats, samplesCsv, shortForm, showBytes, stamp, type Idn, type Sample } from "./model";
import { Traffic, type Frame, type TrafficHandle } from "./Traffic";
import { Chart } from "./Chart";
import { tip } from "@shared/tips";
import { help } from "./help";
import { dict, fill, type Key, type Lang } from "./i18n";
import { ReportButton } from "@shared/ReportDialog";
import { noteError } from "@shared/report";
import { HelpDialog, useHelpKey } from "@shared/HelpDialog";
import { load, samePorts, store } from "@shared/framing";
import { autoLogPath, formatTime, useFold, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useLostAlert } from "@shared/useLostAlert";
import { useKeepAwake } from "@shared/useKeepAwake";
import { loadLastOk, saveLastOk, useAutoStart } from "@shared/autoStart";
import { cleanLastOk, scpiLaunch, type ScpiLastOk } from "./launch";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { useToast } from "@shared/Toast";
import { KEYS, useShortcuts, withKey } from "@shared/shortcuts";
import { useWindowTitle, windowTitle } from "@shared/useWindowTitle";
import { PinButton } from "@shared/PinButton";
import { NarrowBar, SideBackdrop, SideClose, SideTools } from "@shared/NarrowBar";
import { FirstCard } from "@shared/FirstCard";
import { CommandList, type Cmd } from "@shared/CommandList";
import { scpiExamples } from "@shared/examples";
import { useSendHistory } from "@shared/sendHistory";
import { screenText } from "@shared/logSearch";
import { copyText } from "@shared/logCopy";
import { ui } from "@shared/uiText";
import { RecentButton, RecentHosts, useRecent } from "@shared/RecentPicker";
import { joinHostPort, splitHostPort } from "@shared/recent";
import { PortPicker } from "@shared/PortPicker";
import { portUsable } from "@shared/portPick";
import "./App.css";

const APP = "PortDock SCPI";
type Status = "idle" | "connected" | "closed" | "lost";
const BAUDS = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
const TERM_BYTES: Record<Term, number[]> = { lf: [10], crlf: [13, 10], cr: [13] };
/** 측정 표에 보일 줄 수(CSV 에는 모두) */
const TABLE_ROWS = 500;

interface Timing {
  timeoutMs: number;
  opcMs: number;
}
interface Meas {
  cmd: string;
  intervalMs: number;
  count: number;
}
/** «마지막 응답» 칸 */
interface Last {
  cmd: string;
  kind: "query" | "write" | "read";
  x?: ExchangeOut;
  err?: ScpiError;
}
/** «장비» 칸 — *IDN? 결과 */
type IdnState = { text: string; idn: Idn | null } | { error: string } | null;
/** 오류 큐 비우기 결과 */
interface ErrResult {
  errors: ErrEntry[];
  complete: boolean;
  asked: number;
}

function pickPort(ports: PortInfo[], id: { vid: number | null; pid: number | null; serial: string | null } | null) {
  const same =
    id &&
    ((id.serial && ports.find((p) => p.serial_number === id.serial && p.vid === id.vid && p.pid === id.pid)) ||
      (id.vid != null && ports.find((p) => p.vid === id.vid && p.pid === id.pid)));
  return (same || ports[0]).name;
}

const isTerm = (v: unknown): v is Term => v === "lf" || v === "crlf" || v === "cr";

function cleanCommands(v: unknown): Cmd[] {
  if (!Array.isArray(v)) return [];
  return v.filter((c): c is Cmd => !!c && typeof c === "object" && typeof c.text === "string" && typeof c.name === "string").map((c) => ({ ...c, mode: "ascii", checksum: null, suffix: "" }));
}

/** 사건 줄 — bad 면 빨갛게(시간 초과·끊김). 체크섬 실패(check=false)와는 다르다 */
const ev = (note: string, bad = false): Frame => ({ ts: Date.now(), dir: "ev", bytes: [], check: null, note, bad });

export default function App() {
  const { settings, update, reset } = useSettings();
  const lang = settings.lang;
  const t = useCallback((k: Key) => dict[lang][k], [lang]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState<boolean | string>(false);
  const openHelp = useCallback(() => setShowHelp(true), []);
  useHelpKey(openHelp);
  const [showSide, setShowSide] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const toast = useToast(lang);
  const langRef = useRef(lang);
  langRef.current = lang;

  // ---- 연결 설정
  const [transport, setTransport] = useState<Transport>(() => (load<Transport>("transport", "lan") === "serial" ? "serial" : "lan"));
  const [net, setNet] = useState<NetConfig>(() => ({ host: "192.168.0.20", port: 5025, ...load<Partial<NetConfig>>("net", {}) }));
  const [cfg, setCfg] = useState<SerialConfig>(() => ({ port: "", baud: 9600, dataBits: 8, parity: "none", stopBits: 1, flow: "none", ...load<Partial<SerialConfig>>("cfg", {}) }));
  const [term, setTerm] = useState<Term>(() => {
    const v = load<Term>("term", "lf");
    return isTerm(v) ? v : "lf";
  });
  const [timing, setTiming] = useState<Timing>(() => {
    const v = load<Partial<Timing>>("timing", {});
    return { timeoutMs: clampInt(v.timeoutMs, 10, 600000, 3000), opcMs: clampInt(v.opcMs, 10, 600000, 30000) };
  });
  const [autoIdn, setAutoIdn] = useState<boolean>(() => load<boolean>("autoIdn", true) !== false);
  const commChanged = timing.timeoutMs !== 3000 || timing.opcMs !== 30000 || !autoIdn;
  const [commOpenSaved, setCommOpenSaved] = useState<boolean>(() => commChanged || load<boolean>("commOpen", false) === true);
  useEffect(() => store("transport", transport), [transport]);
  useEffect(() => store("net", net), [net]);
  useEffect(() => store("cfg", cfg), [cfg]);
  useEffect(() => store("term", term), [term]);
  useEffect(() => store("timing", timing), [timing]);
  useEffect(() => store("autoIdn", autoIdn), [autoIdn]);
  useEffect(() => store("commOpen", commOpenSaved), [commOpenSaved]);
  // 설정 «모두 펼치기» 면 펼친 채(켠 채 접으면 이번 실행만) — 다른 앱과 같은 shared useFold
  const [commOpen, setCommOpen] = useFold(commOpenSaved, setCommOpenSaved, settings.expandAll);
  const timingRef = useRef(timing);
  timingRef.current = timing;
  const termRef = useRef(term);
  termRef.current = term;

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
  useEffect(() => {
    if (connected || !ports.length || portUsable(ports, cfg.port)) return;
    setCfg((c) => ({ ...c, port: pickPort(ports, load("portId", null)) }));
  }, [ports, cfg.port, connected]);

  // ---- 통신 기록·파일 기록
  const traffic = useRef<Frame[]>([]);
  const seqRef = useRef(0);
  const failCount = useRef(0);
  const trafficApi = useRef<TrafficHandle | null>(null);
  const maxLines = useRef(settings.maxLines);
  maxLines.current = settings.maxLines;
  const [logPath, setLogPath] = useState<string | null>(null);
  const logRef = useRef<string | null>(null);
  logRef.current = logPath;
  const logBuf = useRef("");
  const fmtTs = useCallback((ts: number) => formatTime(ts, settings.timeFormat, traffic.current[0]?.ts ?? ts), [settings.timeFormat]);
  const fmtRef = useRef(fmtTs);
  fmtRef.current = fmtTs;
  const [frameCount, setFrameCount] = useState(0);

  const addFrames = useCallback((list: Frame[]) => {
    if (!list.length) return;
    for (const f of list) {
      f.seq = ++seqRef.current;
      if (f.check === false) failCount.current++;
      if (logRef.current) {
        const line = f.dir === "ev" ? `${stamp(f.ts)} EV ${f.note ?? ""}` : `${stamp(f.ts)} ${f.dir.toUpperCase()}${f.sum ? ` [${f.sum}]` : ""} ${showBytes(f.bytes)}${f.note ? ` ${f.note}` : ""}`;
        logBuf.current += line + "\r\n";
      }
    }
    traffic.current.push(...list);
    if (traffic.current.length > maxLines.current) traffic.current.splice(0, traffic.current.length - maxLines.current);
    trafficApi.current?.bump();
    setFrameCount(traffic.current.length);
  }, []);

  // 파일 기록 — 1초마다 덧붙인다
  useEffect(() => {
    if (!logPath) return;
    const flush = () => {
      const text = logBuf.current;
      if (!text) return;
      logBuf.current = "";
      api.appendText(logPath, text).catch((e) => {
        setError(String(e));
        setLogPath(null);
      });
    };
    const id = setInterval(flush, 1000);
    return () => {
      clearInterval(id);
      flush();
    };
  }, [logPath]);

  async function startLog(path: string) {
    try {
      await api.appendText(path, `# ${APP} · ${stamp(Date.now())}\r\n`);
      logBuf.current = "";
      setLogPath(path);
    } catch (e) {
      setError(String(e));
    }
  }
  async function toggleLog() {
    if (logPath) return setLogPath(null);
    const st = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const path = await save({ title: t("logDlgTitle"), defaultPath: `scpi-${st}.log`, filters: [{ name: "Log", extensions: ["log", "txt"] }] }).catch(() => null);
    if (path) await startLog(path);
  }
  async function saveView(view: number[] | null, desc: string | null) {
    const st = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const path = await save({ title: t("saveScreenTitle"), defaultPath: `scpi-screen-${st}.txt`, filters: [{ name: "Text", extensions: ["txt", "log"] }] }).catch(() => null);
    if (!path) return;
    const text = screenText({ app: APP, frames: traffic.current, view, mode: "ascii", fmt: fmtRef.current, hex, ascii: showBytes, filterDesc: desc, lang });
    await api
      .writeText(path, text)
      .then(() => toast.show(fill(t("csvSaved"), { a: path.split(/[\\/]/).pop() ?? path })))
      .catch((e) => setError(String(e)));
  }

  /** 주고받기 한 번 → 기록 줄 */
  const logExchange = useCallback(
    (x: ExchangeOut) => {
      const out: Frame[] = [];
      if (x.stale) out.push({ ...ev(fill(dict[langRef.current].evStale, { n: x.stale })), ts: x.ts });
      if (x.sent.length) out.push({ ts: x.ts, dir: "tx", bytes: x.sent, check: null });
      const r = x.reply;
      if (r) {
        const ms = `${x.ms.toFixed(1)} ms`;
        const more = r.rawLen > r.raw.length ? `(${r.rawLen.toLocaleString()} B)` : undefined;
        out.push({ ts: x.rxTs || Date.now(), dir: "rx", bytes: r.raw, check: null, sum: r.kind === "block" ? `${r.header} · ${r.len.toLocaleString()} B · ${ms}` : ms, note: more });
      }
      addFrames(out);
    },
    [addFrames],
  );

  // ---- 연결이 끊김
  const [running, setRunning] = useState(false);
  const runToken = useRef(0);
  const stopMeas = useCallback(() => {
    runToken.current++;
    setRunning(false);
  }, []);
  const markLost = useCallback(
    (msg: string) => {
      if (!connectedRef.current) return;
      connectedRef.current = false;
      setConnected(false);
      setStatus("lost");
      setStatusMsg(msg);
      setLogPath(null);
      stopMeas();
      addFrames([ev(fill(dict[langRef.current].lostMsg, { a: msg }), true)]);
      api.close().catch(() => {});
    },
    [addFrames, stopMeas],
  );

  /** 실패한 질의 → 기록 줄(보낸 줄은 시간 초과·멈춤일 때만 — 그때는 보낸 것) */
  const logFail = useCallback(
    (cmd: string, e: ScpiError, sent: boolean) => {
      const out: Frame[] = [];
      if (sent && (e.kind === "timeout" || e.kind === "cancelled")) out.push({ ts: Date.now(), dir: "tx", bytes: [...new TextEncoder().encode(cmd.replace(/[\r\n]+$/, "")), ...TERM_BYTES[termRef.current]], check: null });
      out.push(ev(`⚠ ${e.message}${e.partial ? ` — ${fill(dict[langRef.current].partial, { a: e.partial })}` : ""}`, true));
      addFrames(out);
      if (isFatal(e)) markLost(e.message);
    },
    [addFrames, markLost],
  );

  // ---- 주고받기
  const [busy, setBusy] = useState(0);
  const [last, setLast] = useState<Last | null>(null);
  const need = () => {
    if (connectedRef.current) return true;
    toast.show(t("needConnect"), { error: true });
    return false;
  };
  const query = useCallback(
    async (cmd: string, timeoutMs: number, show = true): Promise<ExchangeOut | ScpiError> => {
      setBusy((b) => b + 1);
      try {
        const x = await api.query(cmd, timeoutMs);
        logExchange(x);
        if (show) setLast({ cmd, kind: "query", x });
        return x;
      } catch (err) {
        const e = asScpiError(err);
        logFail(cmd, e, true);
        if (show) setLast({ cmd, kind: "query", err: e });
        return e;
      } finally {
        setBusy((b) => b - 1);
      }
    },
    [logExchange, logFail],
  );
  async function write(cmd: string, show = true) {
    setBusy((b) => b + 1);
    try {
      const x = await api.write(cmd);
      logExchange(x);
      if (show) setLast({ cmd, kind: "write", x });
      return true;
    } catch (err) {
      const e = asScpiError(err);
      logFail(cmd, e, false);
      if (show) setLast({ cmd, kind: "write", err: e });
      if (e.kind === "invalid") toast.show(e.message, { error: true });
      return false;
    } finally {
      setBusy((b) => b - 1);
    }
  }
  async function read() {
    if (!need()) return;
    setBusy((b) => b + 1);
    try {
      const x = await api.read(timing.timeoutMs);
      logExchange(x);
      setLast({ cmd: "", kind: "read", x });
    } catch (err) {
      const e = asScpiError(err);
      logFail("", e, false);
      setLast({ cmd: "", kind: "read", err: e });
    } finally {
      setBusy((b) => b - 1);
    }
  }

  // ---- 명령 칸
  const [input, setInput] = useState<string>(() => load<string>("input", "*IDN?"));
  useEffect(() => store("input", input), [input]);
  const inputRef = useRef<HTMLInputElement>(null);
  const applyHist = useCallback((e: { text: string }) => setInput(e.text), []);
  const hist = useSendHistory({ text: input, mode: "ascii" }, applyHist);
  async function send(kind: "auto" | "query" | "write", text = input) {
    const cmd = text.trim();
    if (!cmd) {
      toast.show(dict[lang].cmdPlaceholder, { error: true });
      return;
    }
    if (!need()) return;
    hist.remember({ text: cmd, mode: "ascii" });
    const q = kind === "query" || (kind === "auto" && isQuery(cmd));
    if (q) await query(cmd, timing.timeoutMs);
    else await write(cmd);
    inputRef.current?.focus();
  }
  const known = findCommon(input);

  // ---- 장비 식별·자주 쓰는 동작
  const [idn, setIdn] = useState<IdnState>(null);
  const [errResult, setErrResult] = useState<ErrResult | null>(null);
  const askIdn = useCallback(async () => {
    const r = await query("*IDN?", timingRef.current.timeoutMs);
    if ("kind" in r) setIdn({ error: r.message });
    else if (r.reply) setIdn({ text: r.reply.text, idn: parseIdn(r.reply.text) });
  }, [query]);
  async function drainErrors() {
    if (!need()) return;
    setBusy((b) => b + 1);
    try {
      const d = await api.drainErrors(timing.timeoutMs);
      d.exchanges.forEach(logExchange);
      setErrResult({ errors: d.errors, complete: d.complete, asked: d.exchanges.length });
    } catch (err) {
      const e = asScpiError(err);
      logFail("SYST:ERR?", e, true);
      setErrResult(null);
      toast.show(e.message, { error: true });
    } finally {
      setBusy((b) => b - 1);
    }
  }
  async function opc() {
    if (!need()) return;
    const r = await query("*OPC?", timing.opcMs);
    if (!("kind" in r)) toast.show(fill(t("opcDone"), { a: r.reply?.text ?? "", ms: r.ms.toFixed(0) }));
  }
  async function quickWrite(cmd: "*RST" | "*CLS") {
    if (!need()) return;
    if (await write(cmd)) {
      toast.show(t(cmd === "*RST" ? "rstDone" : "clsDone"));
      if (cmd === "*CLS") setErrResult(null);
    }
  }

  // ---- 연결
  const recentLan = useRecent("lan");
  const pickRecent = (v: string) => {
    const { host, port } = splitHostPort(v);
    setNet((n) => ({ ...n, host, ...(port != null && port > 0 ? { port } : {}) }));
  };
  const where = transport === "lan" ? `${net.host.trim()}:${net.port}` : `${cfg.port} ${cfg.baud}`;
  /** over: 켤 때 자동 연결(0.3.0) — 칸 상태가 아직 바뀌기 전이라 쓸 설정을 직접 넘긴다 */
  async function connect(over?: { transport: Transport; net: NetConfig; cfg: SerialConfig; term: Term; ports: PortInfo[] }) {
    if (connecting || connectedRef.current) return;
    const tr = over?.transport ?? transport;
    const nc = over?.net ?? net;
    const sc = over?.cfg ?? cfg;
    const tm = over?.term ?? term;
    const pl = over?.ports ?? ports;
    const at = tr === "lan" ? `${nc.host.trim()}:${nc.port}` : `${sc.port} ${sc.baud}`;
    setConnecting(true);
    setConnectErr(null);
    setError(null);
    setStatusMsg(null);
    try {
      if (tr === "lan") {
        await api.openTcp({ host: nc.host.trim(), port: nc.port, term: tm, connectTimeoutMs: 3000 });
        recentLan.remember(joinHostPort(nc.host.trim(), nc.port));
        saveLastOk<ScpiLastOk>({ transport: "lan", host: nc.host.trim(), port: nc.port, term: tm });
      } else {
        await api.openSerial({ ...sc, term: tm });
        const p = pl.find((x) => x.name === sc.port);
        if (p) store("portId", { vid: p.vid, pid: p.pid, serial: p.serial_number });
        saveLastOk<ScpiLastOk>({ transport: "serial", serialPort: sc.port, baud: sc.baud, dataBits: sc.dataBits, parity: sc.parity, stopBits: sc.stopBits, flow: sc.flow, term: tm });
      }
      connectedRef.current = true;
      setConnected(true);
      setStatus("connected");
      setIdn(null);
      setErrResult(null);
      addFrames([ev(fill(t("evConnected"), { a: at }))]);
      if (settings.autoLog && settings.logFolder) await startLog(autoLogPath(settings.logFolder, "scpi"));
      if (autoIdn) void askIdn();
    } catch (e) {
      setConnectErr(String(e));
      noteError(String(e));
    } finally {
      setConnecting(false);
    }
  }
  async function disconnect() {
    stopMeas();
    connectedRef.current = false;
    setConnected(false);
    setStatus("closed");
    setStatusMsg(null);
    setLogPath(null);
    await api.close().catch(() => {});
    addFrames([ev(t("evClosed"))]);
  }
  // 연결 중 줄 끝 바꾸기
  useEffect(() => {
    if (connected) api.setTerm(term).catch(() => {});
  }, [connected, term]);

  // ---- 반복 측정
  const [meas, setMeas] = useState<Meas>(() => {
    const v = load<Partial<Meas>>("meas", {});
    return { cmd: typeof v.cmd === "string" && v.cmd ? v.cmd : "MEAS:VOLT:DC?", intervalMs: clampInt(v.intervalMs, 0, 86400000, 1000), count: clampInt(v.count, 0, 1000000, 10) };
  });
  useEffect(() => store("meas", meas), [meas]);
  const samples = useRef<Sample[]>([]);
  const [sampleVer, setSampleVer] = useState(0);
  const [tab, setTab] = useState<"log" | "measure">(() => (load<string>("tab", "log") === "measure" ? "measure" : "log"));
  useEffect(() => store("tab", tab), [tab]);
  async function startMeas() {
    if (running) return stopMeas();
    const cmd = meas.cmd.trim();
    if (!isQuery(cmd)) return toast.show(t("mNeedQuery"), { error: true });
    if (!need()) return;
    const token = ++runToken.current;
    const { intervalMs, count } = meas;
    samples.current = [];
    setSampleVer((v) => v + 1);
    setRunning(true);
    hist.remember({ text: cmd, mode: "ascii" });
    let i = 0;
    while (runToken.current === token && (count === 0 || i < count)) {
      const t0 = performance.now();
      i++;
      const r = await query(cmd, timingRef.current.timeoutMs, false);
      if (runToken.current !== token && "kind" in r && r.kind === "cancelled") break;
      let s: Sample;
      if ("kind" in r) s = { i, ts: Date.now(), ms: 0, value: null, text: r.message, ok: false };
      else {
        const text = r.reply?.kind === "text" ? r.reply.text : (r.reply?.header ?? "");
        const n = parseNumber(text);
        s = { i, ts: r.ts, ms: r.ms, value: n?.value ?? null, text: n?.special ?? text, ok: true };
      }
      addSample(samples.current, s);
      setSampleVer((v) => v + 1);
      if ("kind" in r && (isFatal(r) || r.kind === "cancelled")) {
        if (isFatal(r)) toast.show(t("mLost"), { error: true });
        break;
      }
      if (count !== 0 && i >= count) break;
      // 다음 측정 시작까지 — 0.1초씩 쉬며 멈춤을 본다
      const until = t0 + intervalMs;
      while (runToken.current === token && performance.now() < until) await new Promise((res) => setTimeout(res, Math.min(100, Math.max(1, until - performance.now()))));
    }
    if (runToken.current === token) setRunning(false);
  }
  async function saveCsv() {
    const st = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const path = await save({ defaultPath: `scpi-measure-${st}.csv`, filters: [{ name: "CSV (Excel)", extensions: ["csv"] }] }).catch(() => null);
    if (!path) return;
    try {
      // 엑셀에서 한글이 깨지지 않게 BOM
      await api.writeText(path, "﻿" + samplesCsv(meas.cmd, samples.current));
      toast.show(fill(t("csvSaved"), { a: path.split(/[\\/]/).pop() ?? path }));
    } catch (e) {
      setError(String(e));
    }
  }
  const stats = useMemo(() => sampleStats(samples.current), [sampleVer]); // eslint-disable-line react-hooks/exhaustive-deps
  const fails = useMemo(() => samples.current.filter((s) => !s.ok).length, [sampleVer]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- 블록 저장
  async function saveBlock() {
    const r = last?.x?.reply;
    if (!r || r.kind !== "block") return;
    const st = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const ext = blockExt(r.preview);
    const path = await save({ defaultPath: `scpi-block-${st}.${ext}`, filters: [{ name: ext.toUpperCase(), extensions: [ext] }, { name: "All", extensions: ["*"] }] }).catch(() => null);
    if (!path) return;
    try {
      const n = await api.saveBlock(path);
      toast.show(fill(t("savedBlock"), { n: n.toLocaleString(), a: path.split(/[\\/]/).pop() ?? path }));
    } catch (e) {
      setError(String(e));
    }
  }

  // ---- 명령 목록
  const [commands, setCommands] = useState<Cmd[]>(() => cleanCommands(load("commands", [])));
  useEffect(() => store("commands", commands), [commands]);
  function addToList() {
    const text = input.trim();
    if (!text) return;
    setCommands((c) => [...c, { name: text.slice(0, 32), text, mode: "ascii", checksum: null, suffix: "", ck: null, key: null }]);
    toast.show(fill(t("addedToList"), { a: text }));
  }

  // ---- 첫 실행
  const [firstDone, setFirstDone] = useState<boolean>(() => load<boolean>("firstHintDone", false) === true);
  useEffect(() => store("firstHintDone", firstDone), [firstDone]);

  // ---- 단축키: F4 연결·끊기, Ctrl+L 기록 지우기, Ctrl+S 화면 저장, Ctrl+Shift+L 파일 기록, Esc 멈춤
  const startable = transport === "serial" ? portUsable(ports, cfg.port) : !!net.host.trim() && net.port > 0;
  const runDisabled = connecting || (!connected && !startable);
  useShortcuts([
    { key: "F4", run: () => !runDisabled && void (connected ? disconnect() : connect()) },
    { key: "l", ctrl: true, run: () => trafficApi.current?.clear() },
    { key: "l", ctrl: true, shift: true, run: () => connected && void toggleLog() },
    { key: "s", ctrl: true, run: () => trafficApi.current?.save() },
    {
      key: "Escape",
      inInput: false,
      run: () => {
        if (running) stopMeas();
        if (busy || running) api.cancel().catch(() => {});
      },
    },
  ]);
  // 끊기면 작업 표시줄 깜빡임(0.3.0) — «lost» 는 사용자가 끊지 않았는데 끊긴 상태(끊기 버튼은 «closed»)
  useLostAlert(status === "lost", settings.lostAlert);
  // 연결·기록 중 절전 막기(0.3.0)
  useKeepAwake(connected || !!logPath, settings.keepAwake);

  // ---- 명령줄 «--auto»(0.3.0) — 다른 인자는 없다(무시한 것은 한 줄로 알림)
  const [launchAuto, setLaunchAuto] = useState(false);
  const [launchReady, setLaunchReady] = useState(false);
  useEffect(() => {
    let alive = true;
    api
      .launchArgs()
      .then((argv) => {
        if (!alive || !argv?.length) return;
        const l = scpiLaunch(argv);
        setLaunchAuto(l.auto);
        if (l.bad.length) toast.show(fill(dict[langRef.current].launchBad, { a: l.bad.join(", ") }), { error: true, ms: 9000 });
      })
      .catch(() => {})
      .finally(() => alive && setLaunchReady(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ---- 켤 때 마지막 연결 다시 열기(0.3.0) — 설정 또는 --auto. 시리얼 포트가 없으면 조용히 그만둔다
  useAutoStart(settings.autoConnect || launchAuto, launchReady, () => {
    const last = cleanLastOk(loadLastOk());
    if (!last) return;
    const tm = last.term ?? term;
    if (last.transport === "lan") {
      const nc = { host: last.host!, port: last.port! };
      setTransport("lan");
      setNet(nc);
      setTerm(tm);
      addFrames([ev(fill(dict[langRef.current].evAutoConnect, { a: `${nc.host}:${nc.port}` }))]);
      void connect({ transport: "lan", net: nc, cfg, term: tm, ports });
      return;
    }
    void api
      .listPorts()
      .catch(() => [] as PortInfo[])
      .then((pl) => {
        if (connectedRef.current || !portUsable(pl, last.serialPort!)) return;
        const sc: SerialConfig = {
          ...cfg,
          port: last.serialPort!,
          baud: last.baud!,
          ...(last.dataBits !== undefined && { dataBits: last.dataBits }),
          ...(last.parity !== undefined && { parity: last.parity }),
          ...(last.stopBits !== undefined && { stopBits: last.stopBits }),
          ...(last.flow !== undefined && { flow: last.flow }),
        };
        setTransport("serial");
        setCfg(sc);
        setTerm(tm);
        setPorts((o) => samePorts(o, pl));
        addFrames([ev(fill(dict[langRef.current].evAutoConnect, { a: `${sc.port} ${sc.baud}` }))]);
        void connect({ transport: "serial", net, cfg: sc, term: tm, ports: pl });
      });
  });
  useExitGuard(connected || !!logPath || running, settings.confirmExit, lang, APP);
  const clearError = useCallback(() => setError(null), []);
  const onCopied = (ok: boolean, n: number) => toast.show(ok ? ui(lang, "copied", { n }) : ui(lang, "copyFail"), { error: !ok });

  // ---- 창 제목: «192.168.0.20:5025 · KEYSIGHT 34465A — PortDock SCPI»
  const statusKey = `status_${connecting ? "connecting" : status}` as Key;
  const idnName = idn && "idn" in idn && idn.idn ? `${idn.idn.maker} ${idn.idn.model}` : null;
  useWindowTitle(windowTitle(APP, connected ? [where, idnName, status !== "connected" && t(statusKey)] : [], !!logPath));
  const parityCh = cfg.parity === "odd" ? "O" : cfg.parity === "even" ? "E" : "N";
  const summaryLine = transport === "lan" ? `LAN ${net.host}:${net.port} · ${t(statusKey)}` : `${cfg.port || t("noPorts")} ${cfg.baud} ${cfg.dataBits}${parityCh}${cfg.stopBits} · ${t(statusKey)}`;
  const runLabel = connected ? t("disconnect") : t("connect");
  const sendWhy = connected ? undefined : t("needConnect");

  // ---- 마지막 응답 칸
  const lastView = (() => {
    if (!last) return <div className="hint">{t("lastNone")}</div>;
    const head = last.kind === "read" ? t("read") : last.cmd;
    if (last.err) {
      const e = last.err;
      return (
        <>
          <div className="last-head">
            <span className="last-cmd mono">{head}</span>
            <span className="hint warn" role="status">
              ⚠ {e.message}
            </span>
          </div>
          {e.partial && <div className="mono last-partial">{fill(t("partial"), { a: e.partial })}</div>}
          {e.kind === "timeout" && <div className="hint">{e.partial ? t("termHint") : t("timeoutHint")}</div>}
        </>
      );
    }
    const x = last.x!;
    const r = x.reply;
    if (!r)
      return (
        <div className="last-head">
          <span className="last-cmd mono">{head}</span>
          <span className="hint ok">✓ {t("wrote")}</span>
        </div>
      );
    return (
      <>
        <div className="last-head">
          <span className="last-cmd mono">{head}</span>
          <span className="hint ok">✓ {x.ms.toFixed(1)} ms</span>
          <span className="grow" />
          {r.kind === "text" && (
            <button className="btn small ghost" onClick={() => void copyText(r.text).then((ok) => onCopied(ok, 1))}>
              {t("copyReply")}
            </button>
          )}
        </div>
        {r.kind === "text" ? (
          <div className="last-text mono">{r.text || " "}</div>
        ) : (
          <div className="block-box">
            <div className="block-info">
              <b>{fill(t("blockInfo"), { h: r.header, n: r.len.toLocaleString() })}</b>
              <span className="hint">· {r.binary ? t("blockBin") : t("blockText")}</span>
              {r.indefinite && <span className="hint warn">· {t("blockIndef")}</span>}
              <span className="grow" />
              <button className="btn small" onClick={saveBlock} data-tip={tip(lang, "scSaveBlock")}>
                {t("saveBlock")}
              </button>
            </div>
            {r.binary || !r.text ? (
              <>
                <pre className="dump hexdump">{hexDump(r.preview)}</pre>
                {r.len > r.preview.length && <div className="hint">{fill(t("previewNote"), { n: r.preview.length })}</div>}
              </>
            ) : (
              <div className="last-text mono">{r.text}</div>
            )}
          </div>
        )}
      </>
    );
  })();

  const idnView = (() => {
    if (!idn) return <div className="hint">{t("idnNone")}</div>;
    if ("error" in idn)
      return (
        <div className="hint warn">
          {t("idnFail")} — {idn.error}
        </div>
      );
    if (!idn.idn)
      return (
        <>
          <div className="hint warn">{t("idnOdd")}</div>
          <div className="mono idn-raw">{idn.text}</div>
        </>
      );
    const rows: [Key, string][] = [
      ["idnMaker", idn.idn.maker],
      ["idnModel", idn.idn.model],
      ["idnSerial", idn.idn.serial],
      ["idnFw", idn.idn.firmware],
    ];
    return (
      <table className="idn">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td>{t(k)}</td>
              <td className="mono" title={v}>
                {v || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  })();

  const errView =
    errResult &&
    (errResult.errors.length === 0 && errResult.complete ? (
      <div className="hint ok">
        {t("errNone")} · {fill(t("errAsked"), { n: errResult.asked })}
      </div>
    ) : (
      <div className="err-list">
        {errResult.errors.some((e) => e.code != null) && <b className="bad">{fill(t("errSome"), { n: errResult.errors.filter((e) => e.code != null).length })}</b>}
        <ul>
          {errResult.errors.map((e, i) => (
            <li key={i} className="mono" title={e.raw}>
              {e.code != null ? `${e.code} ${e.message}` : e.raw}
            </li>
          ))}
        </ul>
        {!errResult.complete && <div className="hint warn">{errResult.errors.some((e) => e.code == null) ? t("errOdd") : fill(t("errMore"), { n: errResult.asked })}</div>}
      </div>
    ));

  const shown = samples.current.slice(-TABLE_ROWS).reverse();
  // 표본은 MAX_SAMPLES 개만 기억하므로 진행 수는 마지막 번호로
  const doneN = samples.current[samples.current.length - 1]?.i ?? 0;

  // 머리줄 도구 — 넓은 창은 왼쪽 칸 머리, 좁은 창은 요약 줄(NarrowBar)에 그린다(한 번에 한 곳)
  const headTools = (
    <>
            <select className="lang" aria-label={lang === "ko" ? "언어" : "Language"} value={lang} onChange={(e) => update({ lang: e.target.value as Lang })}>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
            <PinButton lang={lang} on={settings.alwaysOnTop} onToggle={(v) => update({ alwaysOnTop: v })} />
            <ReportButton app={APP} lang={lang} frames={() => traffic.current.map((f) => ({ ts: f.ts, dir: f.dir, bytes: f.bytes, note: f.note }))} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} usageAsked={settings.usageAsked} onUsage={(on) => update({ usageStats: on, usageAsked: true })} />
            <button className="icon-btn" onClick={openHelp} title={t("helpTip")} aria-label={t("helpTip")}>
              ?
            </button>
            <button className="icon-btn" onClick={() => setShowSettings(true)} title={ui(lang, "settings")} aria-label={ui(lang, "settings")}>
              ⚙
            </button>
    </>
  );
  return (
    <div className={`app three${showRight ? " show-right" : ""}${showSide ? " show-side" : ""}`}>
      <SideBackdrop open={showSide} onClose={() => setShowSide(false)} />
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>SCPI</small>
          </span>
          <span className="brand-tools">
            <SideTools>{headTools}</SideTools>
            <SideClose lang={lang} onClose={() => setShowSide(false)} />
          </span>
        </div>

        <label data-tip={tip(lang, "scTransport")}>
          {t("transport")}
          <select value={transport} disabled={connected} title={connected ? t("lockedHint") : ""} onChange={(e) => setTransport(e.target.value as Transport)}>
            <option value="lan">{t("trLan")}</option>
            <option value="serial">{t("trSerial")}</option>
          </select>
        </label>
        {transport === "lan" ? (
          <>
            <div className="grid2 net">
              <label data-tip={tip(lang, "scHost")}>
                {t("host")}
                <div className="row2 host-row">
                  <input className={net.host.trim() ? "" : "bad"} value={net.host} disabled={connected} spellCheck={false} list="recent-lan" onChange={(e) => setNet({ ...net, host: e.target.value })} />
                  <RecentButton lang={lang} recent={recentLan} onPick={pickRecent} disabled={connected} />
                </div>
                <RecentHosts id="recent-lan" recent={recentLan} />
              </label>
              <label data-tip={tip(lang, "scNetPort")}>
                {t("netPort")}
                <NumInput min={1} max={65535} value={net.port} disabled={connected} onValue={(n) => setNet({ ...net, port: n })} />
              </label>
            </div>
            {!net.host.trim() && <div className="interlock">{t("hostEmpty")}</div>}
          </>
        ) : (
          <>
            <label data-tip={tip(lang, "port")}>
              {t("port")}
              <PortPicker lang={lang} ports={ports} value={cfg.port} disabled={connected} title={connected ? t("lockedHint") : ""} emptyLabel={t("noPorts")} onChange={(name) => setCfg({ ...cfg, port: name })} />
            </label>
            <div className="grid2">
              <label data-tip={tip(lang, "baud")}>
                {t("baud")}
                <NumInput list="bauds" min={50} max={20000000} value={cfg.baud} disabled={connected} onValue={(n) => setCfg({ ...cfg, baud: n })} />
                <datalist id="bauds">
                  {BAUDS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </label>
              <label data-tip={tip(lang, "dataBits")}>
                {t("dataBits")}
                <select value={cfg.dataBits} disabled={connected} onChange={(e) => setCfg({ ...cfg, dataBits: Number(e.target.value) })}>
                  <option value={8}>8</option>
                  <option value={7}>7</option>
                </select>
              </label>
              <label data-tip={tip(lang, "parity")}>
                {t("parity")}
                <select value={cfg.parity} disabled={connected} onChange={(e) => setCfg({ ...cfg, parity: e.target.value as SerialConfig["parity"] })}>
                  <option value="none">{t("none")}</option>
                  <option value="even">{t("even")}</option>
                  <option value="odd">{t("odd")}</option>
                </select>
              </label>
              <label data-tip={tip(lang, "stopBits")}>
                {t("stopBits")}
                <select value={cfg.stopBits} disabled={connected} onChange={(e) => setCfg({ ...cfg, stopBits: Number(e.target.value) })}>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </label>
            </div>
            <label data-tip={tip(lang, "scFlow")}>
              {t("flow")}
              <select value={cfg.flow} disabled={connected} onChange={(e) => setCfg({ ...cfg, flow: e.target.value as SerialConfig["flow"] })}>
                <option value="none">{t("flowNone")}</option>
                <option value="hardware">{t("flowHw")}</option>
                <option value="software">{t("flowSw")}</option>
              </select>
            </label>
          </>
        )}
        <label data-tip={tip(lang, "scTerm")}>
          {t("term")}
          <select value={term} onChange={(e) => setTerm(e.target.value as Term)}>
            <option value="lf">{t("termLf")}</option>
            <option value="crlf">{t("termCrlf")}</option>
            <option value="cr">{t("termCr")}</option>
          </select>
        </label>
        <details className="adv panel comm" open={commOpen} onToggle={(e) => setCommOpen((e.target as HTMLDetailsElement).open)}>
          <summary data-tip={tip(lang, "scComm")}>
            <span className="sum-title">{t("commDetail")}</span>
            {!commOpen && <span className="sum-note">{fill(t("commSummary"), { a: timing.timeoutMs, b: Math.round(timing.opcMs / 1000) })}</span>}
          </summary>
          <div className="grid2">
            <label data-tip={tip(lang, "scTimeout")}>
              {t("timeout")}
              <NumInput min={10} max={600000} value={timing.timeoutMs} onValue={(n) => setTiming({ ...timing, timeoutMs: n })} />
            </label>
            <label data-tip={tip(lang, "scOpcTimeout")}>
              {t("opcTimeout")}
              <NumInput min={10} max={600000} value={timing.opcMs} onValue={(n) => setTiming({ ...timing, opcMs: n })} />
            </label>
          </div>
          <label className="inline" data-tip={tip(lang, "scAutoIdn")}>
            <input type="checkbox" checked={autoIdn} onChange={(e) => setAutoIdn(e.target.checked)} /> {t("autoIdn")}
          </label>
        </details>
        <button data-tip={withKey(tip(lang, connected ? "disconnect" : "connect"), KEYS.connect)} className={connected ? "btn danger" : "btn primary"} onClick={() => void (connected ? disconnect() : connect())} disabled={runDisabled}>
          {runLabel}
        </button>
        {connected && <span className="lock-note">🔒 {t("lockedHint")}</span>}
        {connectErr && !connected ? (
          <div className="status s-failed" role="alert">
            <b>{t("connectFailed")}</b> · {connectErr}
            {/busy|in use|denied|사용 중|거부/i.test(connectErr) && <div>{transport === "serial" ? t("busyHint") : t("refusedHint")}</div>}
          </div>
        ) : (
          <div className={`status s-${connecting ? "reconnecting" : status === "lost" ? "disconnected" : status}`}>
            {t(statusKey)}
            {statusMsg ? ` · ${statusMsg}` : ""}
          </div>
        )}

        <hr />
        <div className="sec-head">
          <b data-tip={tip(lang, "scIdn")}>{t("instTitle")}</b>
          <button className="btn small" onClick={() => need() && void askIdn()} disabled={!connected} data-tip={tip(lang, "scIdn")}>
            {t("idnAgain")}
          </button>
        </div>
        <div className="idn-box">{idnView}</div>

        <b>{t("quickTitle")}</b>
        <div className="quick">
          <button className="btn small" disabled={!connected} onClick={() => need() && void askIdn()} data-tip={tip(lang, "scQIdn")}>
            *IDN?
          </button>
          <button className="btn small" disabled={!connected} onClick={() => void quickWrite("*RST")} data-tip={tip(lang, "scQRst")}>
            *RST
          </button>
          <button className="btn small" disabled={!connected} onClick={() => void quickWrite("*CLS")} data-tip={tip(lang, "scQCls")}>
            *CLS
          </button>
          <button className="btn small" disabled={!connected} onClick={() => void drainErrors()} data-tip={tip(lang, "scQErr")}>
            {t("qErr")}
          </button>
          <button className="btn small" disabled={!connected} onClick={() => void opc()} data-tip={tip(lang, "scQOpc")}>
            {t("qOpc")}
          </button>
        </div>
        {errView}
      </aside>

      <main className="main">
        <NarrowBar tools={headTools} lang={lang} open={showSide} onToggle={() => setShowSide(!showSide)} dot={connectErr && !connected ? "s-disconnected" : `s-${status === "lost" ? "disconnected" : status}`} summary={summaryLine}>
          <button className={connected ? "btn small danger" : "btn small primary"} onClick={() => void (connected ? disconnect() : connect())} disabled={runDisabled} data-tip={withKey(tip(lang, connected ? "disconnect" : "connect"), KEYS.connect)}>
            {runLabel}
          </button>
        </NarrowBar>
        <div className="toolbar cmdbar">
          <input
            ref={inputRef}
            className="cmd-input mono"
            list="scpi-cmds"
            value={input}
            placeholder={t("cmdPlaceholder")}
            spellCheck={false}
            autoComplete="off"
            aria-label={t("cmdPlaceholder")}
            data-tip={tip(lang, "scCmd")}
            onChange={(e) => {
              setInput(e.target.value);
              hist.edited();
            }}
            onKeyDown={(e: KeyEv<HTMLInputElement>) => {
              if (hist.onKeyDown(e)) return;
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send("auto");
              }
            }}
          />
          <datalist id="scpi-cmds">
            {COMMON.map((c) => (
              <option key={c.cmd} value={shortForm(c.cmd)} label={c[lang]} />
            ))}
          </datalist>
          <button className="btn small primary" disabled={!connected} onClick={() => void send("query")} data-tip={tip(lang, "scQuery")}>
            {t("query")}
          </button>
          <button className="btn small" disabled={!connected} onClick={() => void send("write")} data-tip={tip(lang, "scWrite")}>
            {t("write")}
          </button>
          <button className="btn small" disabled={!connected} onClick={() => void read()} data-tip={tip(lang, "scRead")}>
            {t("read")}
          </button>
          {busy > 0 && (
            <button className="btn small danger" onClick={() => api.cancel().catch(() => {})} data-tip={withKey(tip(lang, "scStop"), "Esc")}>
              {t("stop")}
            </button>
          )}
          <button className="btn small ghost" onClick={addToList} disabled={!input.trim()} data-tip={tip(lang, "scToList")}>
            {t("toList")}
          </button>
          <button className="btn small narrow-only" onClick={() => setShowRight(!showRight)} aria-expanded={showRight}>
            {t("showCmds")}
          </button>
        </div>
        <div className="cmd-hint hint">
          {known ? (
            <span className="known">
              <b className="mono">{shortForm(known.cmd)}</b> — {known[lang]}
            </span>
          ) : input.trim() ? (
            <span>{t("unknownCmd")}</span>
          ) : null}
          <span className="grow" />
          <span className="keys">
            {input.trim() ? (isQuery(input) ? t("enterQuery") : t("enterWrite")) : ""} · {t("enterKeys")}
          </span>
        </div>
        <section className="last" aria-label={t("lastTitle")}>
          <div className="last-title">{t("lastTitle")}</div>
          {lastView}
        </section>

        <div className="toolbar lower-tabs">
          <span className="segs" role="tablist">
            {(["log", "measure"] as const).map((v) => (
              <button key={v} role="tab" aria-selected={tab === v} className={tab === v ? "seg on" : "seg"} onClick={() => setTab(v)}>
                {v === "log" ? t("tabLog") : t("tabMeasure")}
                {v === "measure" && running ? " ●" : ""}
              </button>
            ))}
          </span>
          {logPath && (
            <span className="hint ellipsis rec" title={logPath}>
              ● {fill(t("logLines"), { a: logPath.split(/[\\/]/).pop() ?? logPath })}
            </span>
          )}
        </div>
        {tab === "log" ? (
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
            error={error}
            onClearError={clearError}
            onCopied={onCopied}
            onSave={(v, d) => void saveView(v, d)}
          >
            {frameCount === 0 && !firstDone ? (
              <FirstCard lang={lang} className="tlog-empty" title={t("firstTitle")} onHide={() => setFirstDone(true)} links={[{ id: "start", label: t("firstTitle") }, { id: "tutorial", label: t("firstSimLink") }]} onHelp={setShowHelp}>
                <ol>
                  <li>{t("first1")}</li>
                  <li>{t("first2")}</li>
                  <li>{t("first3")}</li>
                </ol>
                <div className="hint">{t("firstSim")}</div>
              </FirstCard>
            ) : null}
          </Traffic>
        ) : (
          <div className="measure">
            <div className="toolbar mbar">
              <label className="inline grow-in" data-tip={tip(lang, "scMeasCmd")}>
                {t("measCmd")}
                <input className="mono meas-cmd" list="scpi-cmds" value={meas.cmd} spellCheck={false} disabled={running} onChange={(e) => setMeas({ ...meas, cmd: e.target.value })} />
              </label>
              <label className="inline" data-tip={tip(lang, "scInterval")}>
                {t("interval")}
                <NumInput className="num" min={0} max={86400000} value={meas.intervalMs} disabled={running} onValue={(n) => setMeas({ ...meas, intervalMs: n })} />
              </label>
              <label className="inline" data-tip={tip(lang, "scCount")}>
                {t("count")}
                <NumInput className="num" min={0} max={1000000} value={meas.count} disabled={running} title={t("countHint")} onValue={(n) => setMeas({ ...meas, count: n })} />
              </label>
              <button className={running ? "btn small danger" : "btn small primary"} onClick={() => void startMeas()} disabled={!running && !connected} data-tip={withKey(tip(lang, "scMStart"), running ? "Esc" : "")}>
                {running ? t("mStop") : t("mStart")}
              </button>
              <button className="btn small" onClick={saveCsv} disabled={!doneN} data-tip={tip(lang, "scCsv")}>
                {t("mCsv")}
              </button>
              <button
                className="btn small ghost"
                disabled={!doneN || running}
                onClick={() => {
                  samples.current = [];
                  setSampleVer((v) => v + 1);
                }}
              >
                {t("mClear")}
              </button>
            </div>
            <div className="mstat">
              {running ? (
                <span className="hint">● {meas.count ? fill(t("mRunning"), { i: doneN, n: meas.count }) : fill(t("mRunningInf"), { i: doneN })}</span>
              ) : doneN ? (
                <span className="hint ok">✓ {fill(t("mDone"), { n: doneN })}</span>
              ) : null}
              {stats && <span className="mono">{fill(t("mStats"), { n: stats.n, min: fmtNum(stats.min), max: fmtNum(stats.max), mean: fmtNum(stats.mean), sd: fmtNum(stats.sd) })}</span>}
              {fails > 0 && <span className="bad">{fill(t("mFails"), { n: fails })}</span>}
            </div>
            {doneN === 0 ? (
              <div className="hint m-empty">{t("mEmpty")}</div>
            ) : (
              <>
                <div data-tip={tip(lang, "scChart")}>
                  <Chart samples={samples.current} version={sampleVer} label={t("tabMeasure")} empty={t("chartEmpty")} />
                </div>
                <div className="mtable-wrap">
                  <table className="rtable mtable">
                    <thead>
                      <tr>
                        <th>{t("colNo")}</th>
                        <th>{t("colTime")}</th>
                        <th>{t("colMs")}</th>
                        <th>{t("colValue")}</th>
                        <th>{t("colText")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((s) => (
                        <tr key={s.i} className={s.ok ? "" : "failrow"}>
                          <td>{s.i}</td>
                          <td className="mono">{stamp(s.ts).slice(11)}</td>
                          <td className="mono">{s.ok ? s.ms.toFixed(1) : "—"}</td>
                          <td className="mono rval">{s.value != null ? fmtNum(s.value) : s.ok ? (/^[+-]?OVLD$|^NaN$/.test(s.text) ? s.text : t("notNumber")) : "—"}</td>
                          <td className="mono rtext" title={s.text}>
                            {s.text}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {doneN > TABLE_ROWS && <div className="hint">{fill(t("mShown"), { n: TABLE_ROWS })}</div>}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {showRight && <div className="backdrop narrow-only" onClick={() => setShowRight(false)} />}
      <aside className="right">
        <button className="btn small narrow-only close-right" onClick={() => setShowRight(false)} title={t("close")} aria-label={t("close")}>
          ✕
        </button>
        <CommandList
          lang={lang}
          app={APP}
          title={t("cmdTitle")}
          commands={commands}
          setCommands={setCommands}
          onSend={(c) => void send("auto", c.text)}
          canSend={connected}
          sendWhy={sendWhy}
          onEdit={(c) => {
            setInput(c.text);
            inputRef.current?.focus();
          }}
          toast={toast}
          writeText={api.writeText}
          readText={api.readText}
          examples={scpiExamples(lang)}
        />
      </aside>
      {showHelp && <HelpDialog doc={help} lang={lang} app={APP} start={typeof showHelp === "string" ? showHelp : null} onClose={() => setShowHelp(false)} />}
      {showSettings && (
        <SettingsDialog conn run app={APP} version={VERSION} settings={settings} update={update} reset={reset} onClose={() => setShowSettings(false)} writeText={api.writeText} readText={api.readText} busy={connected || !!logPath} />
      )}
      {toast.node}
    </div>
  );
}
