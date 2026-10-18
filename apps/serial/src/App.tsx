import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { save } from "@tauri-apps/plugin-dialog";
import {
  api,
  ascii,
  hex,
  parityChar,
  type ChecksumKind,
  type Frame,
  type FrameMode,
  type Lines,
  type ModbusInfo,
  type PortInfo,
  type SendSpec,
  type SerialConfig,
  type SessionEvent,
  type TextMode,
  summary,
} from "./api";
import { tip } from "@shared/tips";
import { ReportButton } from "@shared/ReportDialog";
import { noteError } from "@shared/report";
import { HelpDialog, useHelpKey } from "@shared/HelpDialog";
import { help } from "./help";
import { mbFunc, mbWord } from "./mbwords";
import { parseTerminator, samePorts, trimFrames } from "@shared/framing";
import { autoLogPath, formatTime, logExt, logOptionsOf, rowHeight, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { hasXonXoff, minRepeatMs, serialTxMs } from "@shared/interlocks";
import { FailCount, filterDesc, LogFilterBar, useLogFilter } from "@shared/LogFilter";
import { screenText, type LogFrame } from "@shared/logSearch";
import { ModbusBuilder } from "./ModbusBuilder";
import { useFollowTail } from "@shared/useFollowTail";
import { FollowButton } from "@shared/FollowButton";
import { copyTextOf, selectedFrames, useCopyKey, useLogSelection } from "@shared/logCopy";
import { LogMenu, logMenuItems, type MenuAt } from "@shared/LogMenu";
import { useToast } from "@shared/Toast";
import { CommandList, type CommandListHandle } from "@shared/CommandList";
import { KEYS, useShortcuts, withKey } from "@shared/shortcuts";
import { useWindowTitle, windowTitle } from "@shared/useWindowTitle";
import { PinButton } from "@shared/PinButton";
import { NarrowBar, SideBackdrop, SideClose } from "@shared/NarrowBar";
import { useModeSwitch } from "@shared/SendMode";
import { ui } from "@shared/uiText";
import { io } from "@shared/ioText";
import { checksumDesc, checksumLen, checksumToRust, crcProblem, setTextEncoding, type CkOpts } from "@shared/format";
import { ChecksumPicker } from "@shared/ChecksumOptions";
import { useSendHistory } from "@shared/sendHistory";
import { deltaText, Meter, newDeltaState, stampDelta, type DeltaMode } from "@shared/liveStats";
import { DeltaSelect, LiveStats } from "@shared/StatsBar";
import { TriggerPanel, useTriggers } from "@shared/TriggerPanel";
import { FileSendDialog, JobBar, type FileJob, type Pace, type Progress } from "@shared/FileSend";
import { TermBuffer } from "@shared/terminal";
import { TerminalView } from "@shared/TerminalView";
import { dict, type Key, type Lang } from "./i18n";
import "./App.css";

const BAUDS = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

type Status = "idle" | "connected" | "disconnected" | "reconnecting" | "closed";
type ViewMode = "hex" | "ascii" | "both";
/** 가운데 칸: 줄(프레임) 로그 또는 터미널 보기 */
type Screen = "log" | "term";

interface Command extends SendSpec {
  name: string;
  key?: string | null;
}

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

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));

function portLabel(p: PortInfo) {
  const desc = p.product ?? p.manufacturer;
  return desc ? `${p.name} — ${desc}` : p.name;
}

/** 예전 저장 값(rs485 없음·stopBits 2 외)도 받는다 */
function loadCfg(): SerialConfig {
  const c = load<Partial<SerialConfig>>("cfg", {});
  return {
    port: c.port ?? "",
    baud: c.baud ?? 9600,
    dataBits: c.dataBits ?? 8,
    parity: (["none", "odd", "even", "mark", "space"] as const).includes(c.parity as never) ? c.parity! : "none",
    stopBits: c.stopBits === 1.5 || c.stopBits === 2 ? c.stopBits : 1,
    flow: c.flow ?? "none",
    dtr: !!c.dtr,
    rts: !!c.rts,
    autoReconnect: c.autoReconnect ?? true,
    rs485: c.rs485 === "driver" || c.rs485 === "software" ? c.rs485 : "off",
  };
}

export default function App() {
  const { settings, update, reset } = useSettings();
  const lang = settings.lang;
  const setLang = (l: Lang) => update({ lang: l });
  // 글자 보기 인코딩 — 줄 그리기·복사·저장이 같은 값을 쓴다
  setTextEncoding(settings.encoding);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const openHelp = useCallback(() => setShowHelp(true), []);
  useHelpKey(openHelp);
  // 화면에 남길 줄 수 — 이벤트 콜백 안에서 최신 값을 쓰려고 ref
  const maxLines = useRef(settings.maxLines);
  maxLines.current = settings.maxLines;
  const t = useCallback((k: Key) => dict[lang][k], [lang]);
  // 좁은 창에서 오른쪽 칸(명령 목록·상세)을 펼칠지
  const [showRight, setShowRight] = useState(false);
  // 아주 좁은 창(900px 이하)에서 왼쪽 연결 설정 칸을 펼칠지
  const [showSide, setShowSide] = useState(false);
  const toast = useToast(lang);

  // 파일 로그 형식·나누기·인코딩 — 다음 파일 기록부터
  useEffect(() => {
    api.setLogOptions(logOptionsOf(settings)).catch(() => {});
  }, [settings]);

  // ---- 포트 목록 (1.5초마다 갱신 — 꽂고 뽑는 것을 바로 보여 준다)
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

  // ---- 연결 설정
  const [cfg, setCfg] = useState<SerialConfig>(loadCfg);
  useEffect(() => store("cfg", cfg), [cfg]);
  const rs485On = cfg.rs485 !== "off" && cfg.flow !== "hardware";

  const [framing, setFraming] = useState<FrameMode>(() => load("framing", { kind: "gap", gapMs: 20 }));
  const [terminatorText, setTerminatorText] = useState(() => load("terminatorText", "0D 0A"));
  const [rxCheck, setRxCheck] = useState<ChecksumKind | null>(() => load("rxCheck", null));
  const [rxCk, setRxCk] = useState<CkOpts | null>(() => load("rxCk", null));
  // Modbus RTU 를 고를 때 수신 체크섬을 저절로 바꿨으면 그 전 값 — 다른 방식으로 돌아가면 되돌린다
  const [rxAuto, setRxAuto] = useState<{ prev: ChecksumKind | null } | null>(() => load("rxAuto", null));
  useEffect(() => store("framing", framing), [framing]);
  useEffect(() => store("terminatorText", terminatorText), [terminatorText]);
  useEffect(() => store("rxCheck", rxCheck), [rxCheck]);
  useEffect(() => store("rxCk", rxCk), [rxCk]);
  useEffect(() => store("rxAuto", rxAuto), [rxAuto]);
  // 백엔드로 보낼 수신 체크섬(옵션·범용 CRC 포함). 범용 CRC 매개변수가 틀리면 검사하지 않는다
  const rxWire = useMemo(() => {
    if (rxCheck === "crc" && (!rxCk?.crc || crcProblem(rxCk.crc))) return null;
    return checksumToRust(rxCheck, rxCk);
  }, [rxCheck, rxCk]);

  // ---- 세션
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 화면에 보인 오류는 «문제 보고» 에 넣을 수 있게 모아 둔다
  useEffect(() => {
    if (error) noteError(error);
  }, [error]);
  // 연결 실패는 상태 칸에 빨갛게
  const [connectErr, setConnectErr] = useState<string | null>(null);
  const [logPath, setLogPath] = useState<string | null>(null);
  const logPathRef = useRef(logPath);
  logPathRef.current = logPath;
  const [lines, setLines] = useState<Lines | null>(null);

  // 저장된 포트가 목록에 없으면 같은 장치(없으면 첫 포트)로 바꾸고 알린다. 연결 중엔 건드리지 않는다
  const [portNotice, setPortNotice] = useState<string | null>(null);
  useEffect(() => {
    if (sessionId || !ports.length || ports.some((p) => p.name === cfg.port)) return;
    const next = pickPort(ports, load<PortId | null>("portId", null));
    if (cfg.port) setPortNotice(fill(dict[lang].portSwitched, { a: cfg.port, b: next }));
    setCfg((c) => ({ ...c, port: next }));
  }, [ports, cfg.port, sessionId, lang]);

  // 프레임은 ref 에 쌓고 version 으로만 다시 그린다(대량 수신 시 배열 복사 방지)
  const framesRef = useRef<Frame[]>([]);
  // 줄마다 일련번호 — 앞을 잘라내도 선택한 줄이 다른 줄로 바뀌지 않게
  const seqRef = useRef(0);
  const screenBytes = useRef(0);
  const [livePort, setLivePort] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const counters = useRef({ rx: 0, tx: 0, fail: 0 });
  // 처리량·마지막 수신, 간격 열, 터미널 보기
  const meter = useRef(new Meter());
  const deltaSt = useRef(newDeltaState());
  const term = useRef(new TermBuffer(5000));
  term.current.setEncoding(settings.encoding);
  // 경과 시간 기준 — 연결한 시각(«지우기» 하면 그때부터). 앞줄이 잘려도 바뀌지 않게
  const baseTs = useRef<number | null>(null);
  const langRef = useRef(lang);
  langRef.current = lang;
  const repeatingRef = useRef(false);
  const fileJobRef = useRef<FileJob | null>(null);
  // 진행 사건이 send_file 응답보다 먼저 올 수 있다(작은 파일은 끝까지) — 번호별 마지막 진행을 잡아 둔다
  const lastProgress = useRef(new Map<number, Progress>());
  const [fileJob, setFileJobState] = useState<FileJob | null>(null);
  const setFileJob = (j: FileJob | null) => {
    fileJobRef.current = j;
    setFileJobState(j);
  };

  /** 화면에서 만든 사건 줄(EV) — 파일 로그에는 남지 않는다 */
  const addEv = useCallback((note: string) => {
    const arr = framesRef.current;
    arr.push({ ts: Date.now(), dir: "ev", bytes: [], check: null, note, seq: ++seqRef.current });
    screenBytes.current = trimFrames(arr, maxLines.current, screenBytes.current);
    setVersion((v) => v + 1);
  }, []);

  // ---- 트리거(받은 줄에 패턴이 오면 색·소리·반복/기록 멈춤·사건 줄·깜빡임)
  const sessionRef = useRef<string | null>(null);
  const trg = useTriggers(lang, {
    addEv,
    stopRepeat: () => {
      if (!repeatingRef.current) return false;
      repeatingRef.current = false;
      setRepeatSpec(null);
      return true;
    },
    stopLog: () => {
      const id = sessionRef.current;
      if (!logPathRef.current || !id) return false;
      logPathRef.current = null;
      setLogPath(null);
      api.setLog(id, null).catch((e) => setError(String(e)));
      return true;
    },
  });
  const trgCheck = trg.check;

  const onEvent = useCallback(
    (e: SessionEvent) => {
      if (e.type === "frames") {
        const arr = framesRef.current;
        const now = Date.now();
        for (const f of e.frames) {
          f.seq = ++seqRef.current;
          stampDelta(deltaSt.current, f);
          arr.push(f);
          screenBytes.current += f.bytes.length;
          if (f.dir !== "ev") {
            counters.current[f.dir] += f.bytes.length;
            meter.current.add(f.dir, f.bytes.length, now);
          }
          if (f.dir === "rx") {
            term.current.feed(f.bytes);
            trgCheck(f);
          }
          if (f.check === false) counters.current.fail++;
        }
        screenBytes.current = trimFrames(arr, maxLines.current, screenBytes.current);
        setVersion((v) => v + 1);
      } else if (e.type === "error") {
        setError(e.message);
      } else if (e.type === "lines") {
        setLines({ cts: e.cts, dsr: e.dsr, ri: e.ri, cd: e.cd });
      } else if (e.type === "progress") {
        const { type: _t, ...p } = e;
        void _t;
        lastProgress.current.set(e.id, p);
        if (lastProgress.current.size > 50) lastProgress.current.delete(lastProgress.current.keys().next().value!);
        const j = fileJobRef.current;
        if (j && j.id === e.id) setFileJob({ ...j, sent: e.sent, total: e.total, done: e.done, cancelled: e.cancelled, error: e.error });
      } else {
        setStatus(e.state);
        setStatusMsg(e.message);
        if (e.state === "connected") {
          setSessionId((id) => id ?? e.port);
          setLivePort(e.port);
          // 다시 꽂아 COM 번호가 바뀌었으면 다음 연결도 새 번호로
          setCfg((c) => (c.port === e.port ? c : { ...c, port: e.port }));
        }
        // 끊기면 반복을 끈다 — 다시 연결됐을 때 저절로 다시 보내지 않게. 이유는 사건 줄로 남긴다
        if (e.state !== "connected" && repeatingRef.current) {
          repeatingRef.current = false;
          setRepeatSpec(null);
          addEv(dict[langRef.current].repStopDisc);
        }
        if (e.state === "closed") {
          setSessionId(null);
          setLogPath(null);
          setLines(null);
          const j = fileJobRef.current;
          if (j && !j.done) setFileJob({ ...j, done: true, cancelled: true });
        }
      }
    },
    [addEv, trgCheck],
  );

  // 끝 문자 칸 — 백엔드와 같은 규칙 + CR·LF 같은 이름. 틀리면 빈 끝 문자(조용한 시간만)
  const term_ = useMemo(() => parseTerminator(terminatorText, lang), [terminatorText, lang]);
  const effectiveFraming = useMemo<FrameMode>(() => {
    if (framing.kind === "terminator") return { ...framing, bytes: term_.bytes };
    if (framing.kind === "modbus-rtu") return { kind: "modbus-rtu", baud: cfg.baud };
    return framing;
  }, [framing, term_, cfg.baud]);

  const rxKey = JSON.stringify(rxWire);
  useEffect(() => {
    if (sessionId) api.setFraming(sessionId, effectiveFraming, rxWire).catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, effectiveFraming, rxKey]);

  const liveCfg = useMemo(() => ({ ...cfg }), [cfg.baud, cfg.dataBits, cfg.parity, cfg.stopBits, cfg.flow, cfg.dtr, cfg.rts, cfg.autoReconnect, cfg.rs485]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!sessionId) return;
    const id = setTimeout(() => {
      api.reconfigure(sessionId, liveCfg).catch((e) => setError(String(e)));
    }, 300);
    return () => clearTimeout(id);
  }, [sessionId, liveCfg]);

  const [connecting, setConnecting] = useState(false);
  async function connect() {
    if (connecting) return;
    setConnecting(true);
    setError(null);
    setConnectErr(null);
    setPortNotice(null);
    try {
      await api.open(cfg, effectiveFraming, rxWire, onEvent);
      setSessionId(cfg.port);
      baseTs.current = Date.now();
      const p = ports.find((x) => x.name === cfg.port);
      if (p) store("portId", { vid: p.vid, pid: p.pid, serial: p.serial_number } satisfies PortId);
      if (settings.autoLog && settings.logFolder) {
        const p = autoLogPath(settings.logFolder, "serial", logExt(settings));
        await api.setLog(cfg.port, p).then(() => setLogPath(p)).catch((e) => setError(String(e)));
      }
    } catch (e) {
      setConnectErr(String(e));
      noteError(String(e));
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!sessionId) return;
    await api.close(sessionId);
    setSessionId(null);
    setStatus("closed");
    setLogPath(null);
    setLines(null);
  }
  sessionRef.current = sessionId;

  async function toggleLog() {
    if (!sessionId) return;
    if (logPath) {
      try {
        await api.setLog(sessionId, null);
      } catch (e) {
        setError(String(e));
      } finally {
        setLogPath(null);
      }
      return;
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const ext = logExt(settings);
    const path = await save({ title: t("logDlgTitle"), defaultPath: `portdock-${stamp}.${ext}`, filters: [{ name: "Log", extensions: ext === "csv" ? ["csv", "txt"] : ["log", "txt"] }] });
    if (!path) return;
    try {
      await api.setLog(sessionId, path);
      setLogPath(path);
    } catch (e) {
      setError(String(e));
    }
  }

  // ---- 보기
  const [view, setView] = useState<ViewMode>(() => load("view", "hex"));
  useEffect(() => store("view", view), [view]);
  const [screen, setScreen] = useState<Screen>(() => load("screen", "log"));
  useEffect(() => store("screen", screen), [screen]);
  const [termColors, setTermColors] = useState(() => load("termColors", true));
  useEffect(() => store("termColors", termColors), [termColors]);
  const [deltaMode, setDeltaMode] = useState<DeltaMode>(() => load("delta", "off"));
  useEffect(() => store("delta", deltaMode), [deltaMode]);
  /** 복사·화면 저장에 넣을 간격 열 */
  const col = deltaMode === "off" ? undefined : (f: LogFrame) => deltaText(deltaMode, f);

  const listRef = useRef<HTMLDivElement>(null);
  const frames = framesRef.current;
  // 찾기·거르기 — 보기만 거른다(기록은 그대로)
  const filter = useLogFilter(frames, version);
  const rows = useVirtualizer({
    count: filter.count,
    getScrollElement: () => listRef.current,
    estimateSize: () => rowHeight(settings.fontSize),
    overscan: 20,
  });
  // 글자 크기를 바꾸면 줄 높이를 다시 잰다
  useEffect(() => {
    rows.measure();
  }, [settings.fontSize, rows]);
  // 따라가기 — 맨 아래에 있을 때만 새 줄을 따라간다(위로 굴리면 멈춤, «↓ 맨 아래로»·End 로 다시)
  const follow = useFollowTail(listRef, settings.autoScroll, seqRef.current, `${version}:${filter.count}:${rows.getTotalSize()}:${screen}`);
  // 줄 고르기(누르기·Shift 범위·Ctrl 하나씩) — 누른 줄이 상세 칸에 나온다
  const sel = useLogSelection({ indexOfSeq: filter.indexOfSeq, seqAt: (i) => filter.at(i)?.seq });
  const selected = sel.primary;
  const frameOf = (seq: number) => {
    const f = frames.length ? frames[seq - (frames[0].seq ?? 0)] : undefined;
    return f && f.seq === seq ? f : undefined;
  };
  const [menu, setMenu] = useState<MenuAt>(null);

  function clearLog() {
    framesRef.current = [];
    counters.current = { rx: 0, tx: 0, fail: 0 };
    meter.current.reset();
    deltaSt.current = newDeltaState();
    term.current.clear();
    screenBytes.current = 0;
    baseTs.current = Date.now();
    sel.clear();
    setMenu(null);
    follow.resume();
    setVersion((v) => v + 1);
  }

  // 찾은 줄로 — 고르고 가운데로 굴린다(따라가기는 멈춘다)
  const jumpTo = useCallback(
    (seq: number) => {
      sel.only(seq);
      follow.pause();
      const i = filter.indexOfSeq(seq);
      if (i >= 0) rows.scrollToIndex(i, { align: "center" });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, rows, sel.only, follow.pause],
  );
  // Ctrl+C — 고른 줄을 «시각 [간격] 방향 내용»(지금 보기대로)으로
  const onCopied = (ok: boolean, n: number) => toast.show(ok ? ui(lang, "copied", { n }) : ui(lang, "copyFail"), { error: !ok });
  useCopyKey(
    () => {
      if (screen !== "log") return null;
      const list = selectedFrames(sel, frameOf);
      return list.length ? copyTextOf(list, "lines", view, fmt, false, col) : null;
    },
    (ok) => onCopied(ok, sel.set.size),
  );

  async function saveView() {
    const path = await save({ defaultPath: "portdock-view.txt", filters: [{ name: "Text", extensions: ["txt", "log"] }] });
    if (!path) return;
    // 지금 보기(HEX·ASCII·둘 다)대로, 거르기가 켜져 있으면 보이는 줄만
    const text = screenText({ app: "PortDock Serial", frames: framesRef.current, view: filter.view, mode: view, fmt, hex, ascii, filterDesc: filterDesc(filter.state, lang), lang, col });
    await api.writeText(path, text).catch((e: unknown) => setError(String(e)));
  }

  // ---- 상세(Modbus 풀이)
  const [modbus, setModbus] = useState<ModbusInfo | null>(null);
  // Modbus 로 풀어 보일 줄: 프레임 구분이 Modbus RTU 이거나 CRC16 Modbus 가 맞을 때만
  const showModbus = !!modbus && (framing.kind === "modbus-rtu" || modbus.crc_ok);
  const selFrame = selected != null ? frameOf(selected) : undefined;
  useEffect(() => {
    if (!selFrame || selFrame.dir === "ev") {
      setModbus(null);
      return;
    }
    api.decodeModbus(selFrame.bytes).then(setModbus).catch(() => setModbus(null));
  }, [selFrame]);

  // ---- 보내기
  const [spec, setSpec] = useState<SendSpec>(() => load("spec", { text: "", mode: "hex", checksum: null, suffix: "" }));
  // 보내기 버튼·Modbus 요청 넣기 뒤 입력칸으로 돌아가 바로 이어 쓸 수 있게
  const sendInput = useRef<HTMLInputElement>(null);
  const [previewBytes, setPreviewBytes] = useState<number[] | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [repeatMs, setRepeatMs] = useState(1000);
  // 반복 횟수 한도(0 = 계속)와 이번 반복에서 보낸 수
  const [repeatTimes, setRepeatTimes] = useState(() => load("repeatTimes", 0));
  useEffect(() => store("repeatTimes", repeatTimes), [repeatTimes]);
  const [repeatSent, setRepeatSent] = useState(0);
  const repeatSentRef = useRef(0);
  // 문자 간 지연(ms) — 모든 송신(보내기·명령·반복·다시 보내기)에
  const [charDelay, setCharDelay] = useState(() => load("charDelay", 0));
  useEffect(() => store("charDelay", charDelay), [charDelay]);
  const [breakMs, setBreakMs] = useState(() => load("breakMs", 100));
  useEffect(() => store("breakMs", breakMs), [breakMs]);
  // 반복은 켠 순간의 내용을 얼려서 보낸다 — 입력을 고치는 중간값이 나가지 않게
  const [repeatSpec, setRepeatSpec] = useState<{ spec: SendSpec; bytes: number[] } | null>(null);
  const repeating = repeatSpec != null;
  repeatingRef.current = repeating;
  useEffect(() => store("spec", spec), [spec]);
  useEffect(() => {
    let stale = false;
    if (spec.checksum === "crc" && spec.ck?.crc && crcProblem(spec.ck.crc, lang)) {
      setPreviewBytes(null);
      setPreviewErr(crcProblem(spec.ck.crc, lang));
      return;
    }
    api
      .preview(spec, settings.encoding)
      .then((b) => {
        if (stale) return;
        setPreviewBytes(b);
        setPreviewErr(null);
      })
      .catch((e) => {
        if (stale) return;
        setPreviewBytes(null);
        setPreviewErr(String(e));
      });
    return () => {
      stale = true;
    };
  }, [spec, settings.encoding, lang]);
  // 0바이트는 보낼 것이 없다
  const sendable = !!previewBytes && previewBytes.length > 0;

  // ↑/↓ 이력 — 보낸 내용(모드 포함)을 다시 불러온다
  const history = useSendHistory({ text: spec.text, mode: spec.mode }, useCallback((h) => setSpec((s) => ({ ...s, text: h.text, mode: h.mode })), []));

  const inflight = useRef(false);
  /** 보내기 — 성공하면 true. 문자 간 지연이 있으면 백엔드가 천천히 보낸다 */
  const doSend = useCallback(
    async (s: SendSpec) => {
      if (!sessionId || inflight.current) return false;
      inflight.current = true;
      try {
        await api.send(sessionId, s, settings.encoding, charDelay);
        setError(null);
        return true;
      } catch (e) {
        setError(String(e));
        if (repeatingRef.current) {
          repeatingRef.current = false;
          setRepeatSpec(null);
          addEv(dict[langRef.current].repStopErr);
        }
        return false;
      } finally {
        inflight.current = false;
      }
    },
    [sessionId, addEv, settings.encoding, charDelay],
  );
  /** 보내기 버튼·Enter — 이력에도 남긴다 */
  const sendNow = () => {
    if (!online || !sendable) return;
    void doSend(spec).then((ok) => ok && history.remember({ text: spec.text, mode: spec.mode }));
  };

  // ---- 인터락
  // 재연결 대기 중에는 세션은 있어도 보낼 수 없다
  const online = sessionId != null && status === "connected";
  // 반복 간격이 실제 송신 시간(+ 문자 간 지연)보다 짧으면 앞 송신이 끝나기 전에 쌓인다 → 최소 간격으로 올려 보낸다
  const repBytes = repeatSpec?.bytes ?? previewBytes;
  const txMs = repBytes ? serialTxMs(repBytes.length, cfg.baud, cfg.dataBits, cfg.parity === "none" ? "none" : "odd", Math.ceil(cfg.stopBits)) + charDelay * repBytes.length : 0;
  const minRep = minRepeatMs(txMs);
  const effRepeat = Math.max(repeatMs, minRep);
  // 소프트웨어 흐름 제어에서 XON/XOFF 바이트는 데이터가 아니라 신호로 먹힌다
  const xonxoff = cfg.flow === "software" && !!previewBytes && hasXonXoff(previewBytes);

  const startRepeat = (on: boolean) => {
    repeatSentRef.current = 0;
    setRepeatSent(0);
    setRepeatSpec(on && previewBytes ? { spec, bytes: previewBytes } : null);
  };
  useEffect(() => {
    if (!repeatSpec || !online) return;
    const id = setInterval(() => {
      void doSend(repeatSpec.spec).then((ok) => {
        if (!ok || !repeatingRef.current) return;
        const n = ++repeatSentRef.current;
        setRepeatSent(n);
        if (repeatTimes > 0 && n >= repeatTimes) {
          repeatingRef.current = false;
          setRepeatSpec(null);
          addEv(io(langRef.current, "repDone", { n }));
        }
      });
    }, effRepeat);
    return () => clearInterval(id);
  }, [repeatSpec, effRepeat, online, doSend, repeatTimes, addEv]);

  // ---- 파일 보내기·Break
  const [showFile, setShowFile] = useState(false);
  async function startFile(path: string, name: string, pace: Pace) {
    if (!sessionId) return;
    const r = await api.sendFile(sessionId, path, pace);
    // 진행 사건이 먼저 왔으면 그 값부터
    const early = lastProgress.current.get(r.id);
    setFileJob({ id: r.id, total: r.total, sent: 0, done: false, cancelled: false, ...early, name });
  }
  const cancelSend = () => {
    if (sessionId) api.cancelSend(sessionId).catch((e) => setError(String(e)));
  };
  const sendBreak = () => {
    if (sessionId) api.sendBreak(sessionId, breakMs).catch((e) => setError(String(e)));
  };
  const byteMs = serialTxMs(1, cfg.baud, cfg.dataBits, cfg.parity === "none" ? "none" : "odd", Math.ceil(cfg.stopBits));

  // ---- Modbus 요청 만들기 — HEX·CRC16 Modbus·줄 끝 없음으로 맞춘다(Modbus RTU 에는 줄 끝이 없다)
  const [showMb, setShowMb] = useState(false);
  const mbSpec = (bytes: number[]): SendSpec => ({ text: hex(bytes), mode: "hex", checksum: "crc16-modbus", suffix: "", ck: null });

  // HEX ↔ ASCII 를 바꾸면 같은 바이트의 새 표기로, 켜진 체크섬은 알림줄로
  const modeSwitch = useModeSwitch(spec, setSpec, lang);

  // ---- 명령 목록
  const [commands, setCommands] = useState<Command[]>(() => load("commands", []));
  useEffect(() => store("commands", commands), [commands]);
  const cmdList = useRef<CommandListHandle>(null);
  /** 명령을 목록 끝에 넣고 이름 칸에 포커스 — 바로 이름을 고칠 수 있게 */
  function pushCommand(c: Command) {
    setCommands((list) => [...list, c]);
    cmdList.current?.focusName(commands.length);
  }
  function addCommand() {
    pushCommand({ ...spec, name: spec.text.slice(0, 24) || "cmd", key: null });
  }
  /** 로그 줄의 바이트 그대로(HEX·체크섬·줄 끝 없음) */
  const rawSpec = (bytes: number[]): SendSpec => ({ text: hex(bytes), mode: "hex", checksum: null, suffix: "", ck: null });

  const connected = sessionId != null;
  const statusKey = `status_${status}` as Key;
  const runDisabled = connecting || (!connected && !ports.some((p) => p.name === cfg.port));

  const fmt = (ts: number) => formatTime(ts, settings.timeFormat, baseTs.current ?? framesRef.current[0]?.ts ?? ts);
  useExitGuard(sessionId != null || !!logPath, settings.confirmExit, lang, "PortDock Serial");

  // ---- 단축키: F4 연결·끊기, Ctrl+L 지우기, Ctrl+S 화면 저장, Ctrl+Shift+L 파일 기록, Esc 반복 멈춤
  useShortcuts([
    { key: "F4", run: () => !runDisabled && (connected ? disconnect() : connect()) },
    { key: "l", ctrl: true, run: clearLog },
    { key: "s", ctrl: true, run: () => void saveView() },
    { key: "l", ctrl: true, shift: true, run: () => connected && void toggleLog() },
    { key: "Escape", inInput: false, run: () => repeatingRef.current && setRepeatSpec(null) },
  ]);

  // ---- 창 제목: «COM3 115200 8N1 · 연결됨 ● REC — PortDock Serial»
  const parityCh = parityChar(cfg.parity);
  useWindowTitle(windowTitle("PortDock Serial", connected ? [`${livePort ?? cfg.port} ${cfg.baud} ${cfg.dataBits}${parityCh}${cfg.stopBits}`, t(statusKey)] : [], !!logPath));
  const summaryLine = connected ? `${summary({ ...cfg, port: livePort ?? cfg.port }, lang)} · ${t(statusKey)}` : `${cfg.port || t("noPorts")} ${cfg.baud} ${cfg.dataBits}${parityCh}${cfg.stopBits} · ${t(statusKey)}`;
  const sendWhy = t(connected ? "ilOffline" : "whyNotConnected");

  return (
    <div className={`app three${showRight ? " show-right" : ""}${showSide ? " show-side" : ""}`}>
      <SideBackdrop open={showSide} onClose={() => setShowSide(false)} />
      <aside className="side">
        <div className="brand">
          <span className="logo">PortDock</span>
          <span className="brand-tools">
          <select className="lang" value={lang} aria-label={lang === "ko" ? "언어" : "Language"} onChange={(e) => {
            const l = e.target.value as Lang;
            setLang(l);
            store("lang", l);
          }}>
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
          <PinButton lang={lang} on={settings.alwaysOnTop} onToggle={(v) => update({ alwaysOnTop: v })} />
          <ReportButton app="PortDock Serial" lang={lang} frames={() => framesRef.current} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} />
          <button className="icon-btn" onClick={openHelp} title={t("helpTip")} aria-label={t("helpTip")}>
            ?
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title={ui(lang, "settings")} aria-label={ui(lang, "settings")}>
            ⚙
          </button>
          <SideClose lang={lang} onClose={() => setShowSide(false)} />
          </span>
        </div>

        <label data-tip={tip(lang, "ports")}>{t("ports")}</label>
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
              {portLabel(p)}
            </option>
          ))}
        </select>
        {(() => {
          const p = ports.find((x) => x.name === cfg.port);
          return p?.vid != null ? (
            <div className="hint">
              USB {p.vid.toString(16).toUpperCase().padStart(4, "0")}:{p.pid?.toString(16).toUpperCase().padStart(4, "0")}
              {p.serial_number ? ` · S/N ${p.serial_number}` : ""}
            </div>
          ) : null;
        })()}
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
              {[5, 6, 7, 8].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label data-tip={tip(lang, "paritySerial")}>
            {t("parity")}
            <select value={cfg.parity} onChange={(e) => setCfg({ ...cfg, parity: e.target.value as SerialConfig["parity"] })}>
              <option value="none">{t("none")}</option>
              <option value="odd">{t("odd")}</option>
              <option value="even">{t("even")}</option>
              <option value="mark">{io(lang, "mark")}</option>
              <option value="space">{io(lang, "space")}</option>
            </select>
          </label>
          <label data-tip={tip(lang, "stopBitsSerial")}>
            {t("stopBits")}
            <select value={cfg.stopBits} onChange={(e) => setCfg({ ...cfg, stopBits: Number(e.target.value) })}>
              <option value={1}>1</option>
              <option value={1.5}>1.5</option>
              <option value={2}>2</option>
            </select>
          </label>
        </div>
        {(cfg.parity === "mark" || cfg.parity === "space") && <div className="hint">{io(lang, "markSpaceHint")}</div>}
        {cfg.stopBits === 1.5 && cfg.dataBits !== 5 && <div className="hint warn">{io(lang, "one5Hint")}</div>}
        <label data-tip={tip(lang, "flow")}>
          {t("flow")}
          <select
            value={cfg.flow}
            onChange={(e) => {
              const flow = e.target.value as SerialConfig["flow"];
              setCfg({ ...cfg, flow, rts: flow === "hardware" ? false : cfg.rts });
            }}
          >
            <option value="none">{t("none")}</option>
            <option value="hardware">{t("hardware")}</option>
            <option value="software">{t("software")}</option>
          </select>
        </label>
        <label data-tip={tip(lang, "rs485")}>
          {io(lang, "rs485")}
          <select
            value={cfg.flow === "hardware" ? "off" : cfg.rs485}
            disabled={cfg.flow === "hardware"}
            title={cfg.flow === "hardware" ? io(lang, "rs485Hw") : ""}
            onChange={(e) => setCfg({ ...cfg, rs485: e.target.value as SerialConfig["rs485"], rts: e.target.value === "off" ? cfg.rts : false })}
          >
            <option value="off">{io(lang, "rs485Off")}</option>
            <option value="driver">{io(lang, "rs485Driver")}</option>
            <option value="software">{io(lang, "rs485Soft")}</option>
          </select>
        </label>
        {rs485On && cfg.rs485 === "software" && <div className="hint warn">{io(lang, "rs485SoftWarn")}</div>}
        <div className="checks">
          <label className="inline">
            <input type="checkbox" checked={cfg.dtr} onChange={(e) => setCfg({ ...cfg, dtr: e.target.checked })} /> DTR
          </label>
          <label className="inline">
            <input
              type="checkbox"
              checked={cfg.rts && !rs485On}
              disabled={cfg.flow === "hardware" || rs485On}
              title={cfg.flow === "hardware" ? t("ilRtsHw") : rs485On ? io(lang, "rs485Lock") : ""}
              onChange={(e) => setCfg({ ...cfg, rts: e.target.checked })}
            />{" "}
            RTS
          </label>
        </div>
        <label data-tip={tip(lang, "autoReconnect")} className="inline">
          <input
            type="checkbox"
            checked={cfg.autoReconnect}
            onChange={(e) => setCfg({ ...cfg, autoReconnect: e.target.checked })}
          />{" "}
          {t("autoReconnect")}
        </label>

        <button data-tip={withKey(tip(lang, connected ? "disconnect" : "connect"), KEYS.connect)} className={connected ? "btn danger" : "btn primary"} onClick={connected ? disconnect : connect} disabled={runDisabled}>
          {connected ? t("disconnect") : t("connect")}
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
          </div>
        )}

        <hr />
        <label data-tip={tip(lang, "framing")}>
          {t("framing")}
          <select
            title={t("tipFraming")}
            value={framing.kind}
            onChange={(e) => {
              const k = e.target.value as FrameMode["kind"];
              setFraming(
                k === "gap"
                  ? { kind: "gap", gapMs: 20 }
                  : k === "terminator"
                    ? { kind: "terminator", bytes: [], gapMs: 100 }
                    : k === "fixed"
                      ? { kind: "fixed", len: 8, gapMs: 100 }
                      : { kind: "modbus-rtu", baud: cfg.baud },
              );
              if (k === "modbus-rtu") {
                if (rxCheck !== "crc16-modbus") {
                  setRxAuto({ prev: rxCheck });
                  setRxCheck("crc16-modbus");
                }
              } else if (rxAuto) {
                // Modbus 를 고를 때 저절로 바꾼 것이면 되돌린다
                if (rxCheck === "crc16-modbus") setRxCheck(rxAuto.prev);
                setRxAuto(null);
              }
            }}
          >
            <option value="gap">{t("fmGap")}</option>
            <option value="terminator">{t("fmTerminator")}</option>
            <option value="fixed">{t("fmFixed")}</option>
            <option value="modbus-rtu">{t("fmModbus")}</option>
          </select>
        </label>
        {framing.kind === "terminator" && (
          <label data-tip={tip(lang, "terminatorHex")}>
            {t("terminatorHex")}
            <input className={term_.error ? "bad" : ""} value={terminatorText} onChange={(e) => setTerminatorText(e.target.value)} placeholder="0D 0A" />
            {term_.error ? (
              <span className="error">{term_.error}</span>
            ) : term_.bytes.length === 0 ? (
              <span className="interlock">{t("ilNoTerm")}</span>
            ) : (
              <span className="hint">{fill(t("termParsed"), { a: hex(term_.bytes), n: term_.bytes.length })}</span>
            )}
          </label>
        )}
        {framing.kind === "fixed" && (
          <label data-tip={tip(lang, "length")}>
            {t("length")}
            <NumInput min={1} max={65536} value={framing.len} onValue={(n) => setFraming({ ...framing, len: n })} />
          </label>
        )}
        {framing.kind !== "modbus-rtu" && (
          <label data-tip={tip(lang, "gapMs")}>
            {t("gapMs")}
            <NumInput min={1} max={60000} value={framing.gapMs} onValue={(n) => setFraming({ ...framing, gapMs: n })} />
          </label>
        )}
        {((framing.kind !== "modbus-rtu" && framing.gapMs < 16) || framing.kind === "modbus-rtu") &&
          ports.find((p) => p.name === cfg.port)?.kind === "usb" && <div className="hint warn">{t("usbGapHint")}</div>}
        <label data-tip={tip(lang, "rxCheck")}>
          {t("rxCheck")}
          <ChecksumPicker
            lang={lang}
            kind={rxCheck}
            ck={rxCk}
            rx
            noneLabel={t("none")}
            ariaLabel={t("rxCheck")}
            onChange={(k, c) => {
              setRxCheck(k);
              setRxCk(c);
              setRxAuto(null);
            }}
          />
        </label>
        {rxCheck && (rxCk?.skipHead || rxCk?.beforeEnd || rxCk?.swap || rxCheck === "crc") ? <div className="hint">{checksumDesc(rxCheck, rxCk, lang)}</div> : null}
        <button data-tip={withKey(tip(lang, logPath ? "stopLog" : "logToFileSettings"), KEYS.fileLog)} className="btn" onClick={toggleLog} disabled={!connected}>
          {logPath ? t("stopLog") : t("logToFile")}
        </button>
        {logPath && <div className="hint ellipsis" title={logPath}>{logPath}</div>}
      </aside>

      <main className="main">
        <NarrowBar lang={lang} open={showSide} onToggle={() => setShowSide(!showSide)} dot={connectErr && !connected ? "s-disconnected" : `s-${status}`} summary={summaryLine}>
          <button className={connected ? "btn small danger" : "btn small primary"} onClick={connected ? disconnect : connect} disabled={runDisabled} data-tip={withKey(tip(lang, connected ? "disconnect" : "connect"), KEYS.connect)}>
            {connected ? t("disconnect") : t("connect")}
          </button>
        </NarrowBar>
        <div className="toolbar">
          <span data-tip={tip(lang, "view")}>{t("view")}</span>
          {(["hex", "ascii", "both"] as ViewMode[]).map((v) => (
            <button
              key={v}
              className={screen === "log" && view === v ? "seg on" : "seg"}
              onClick={() => {
                setView(v);
                setScreen("log");
              }}
              aria-pressed={screen === "log" && view === v}
            >
              {v === "both" ? t("both") : v.toUpperCase()}
            </button>
          ))}
          <button className={screen === "term" ? "seg on" : "seg"} onClick={() => setScreen("term")} aria-pressed={screen === "term"} data-tip={tip(lang, "termView")}>
            {io(lang, "termView")}
          </button>
          <label data-tip={withKey(ui(lang, "autoscrollTip"), KEYS.end)} className="inline">
            <input type="checkbox" checked={follow.following} onChange={(e) => (e.target.checked ? follow.resume() : follow.pause())} /> {t("autoscroll")}
          </label>
          {screen === "log" && <DeltaSelect lang={lang} value={deltaMode} onChange={setDeltaMode} />}
          <span className="grow" />
          <span className="counter">
            RX {counters.current.rx.toLocaleString()} · TX {counters.current.tx.toLocaleString()} {t("bytes")}
          </span>
          <FailCount lang={lang} n={counters.current.fail} filter={filter} />
          <button data-tip={withKey(tip(lang, "saveLog"), KEYS.save)} className="btn small" onClick={saveView}>
            {t("saveLog")}
          </button>
          <button data-tip={withKey(tip(lang, "clear"), KEYS.clear)} className="btn small" onClick={clearLog}>
            {t("clear")}
          </button>
          <button data-tip={tip(lang, "commands")} className="btn small narrow-only" onClick={() => setShowRight(!showRight)} aria-expanded={showRight}>
            ☰ {t("commands")}
          </button>
        </div>

        <div className="statusbar">
          <span className={`dot s-${status}`} />
          <span className="mono">{connected ? summary({ ...cfg, port: livePort ?? cfg.port }, lang) : t(statusKey)}</span>
          {connected && (
            <>
              <span className={cfg.dtr ? "led on" : "led"}>DTR</span>
              <span className={cfg.rts && !rs485On ? "led on" : "led"}>RTS{rs485On ? " ⇄" : ""}</span>
              <span className="sep" />
              {(["cts", "dsr", "ri", "cd"] as const).map((k) => (
                <span key={k} className={lines?.[k] ? "led in on" : "led in"} data-tip={tip(lang, "inputLine")}>
                  {k.toUpperCase()}
                </span>
              ))}
            </>
          )}
          {logPath && <span className="rec">● REC</span>}
          <span className="grow" />
          <LiveStats meter={meter.current} lang={lang} active={online} />
        </div>

        {screen === "log" && <LogFilterBar lang={lang} filter={filter} selected={selected} total={frames.length} onJump={jumpTo} />}

        <div className="log-wrap">
          {screen === "term" ? (
            <TerminalView term={term.current} lang={lang} colors={termColors} onColors={setTermColors} version={version} />
          ) : (
            <>
              <div className="log" ref={listRef}>
                {frames.length === 0 && <div className="empty-guide">{t("emptyGuide")}</div>}
                <div style={{ height: rows.getTotalSize(), position: "relative" }}>
                  {rows.getVirtualItems().map((r) => {
                    const f = filter.at(r.index);
                    if (!f || f.seq == null) return null;
                    const seq = f.seq;
                    const cls = `row ${f.dir}${filter.isHit(seq) ? " hit" : ""}${sel.has(seq) ? " sel" : ""}${selected === seq ? " primary" : ""}${f.mark ? " marked" : ""}`;
                    const style = f.mark ? ({ transform: `translateY(${r.start}px)`, "--mark": f.mark } as CSSProperties) : { transform: `translateY(${r.start}px)` };
                    // 누르기·Shift·Ctrl 로 고르고, 오른쪽 버튼은 복사·다시 보내기 메뉴. 누른다고 따라가기가 꺼지지는 않는다
                    const handlers = {
                      onClick: (e: ReactMouseEvent) => sel.click(e, seq),
                      onContextMenu: (e: ReactMouseEvent) => {
                        e.preventDefault();
                        sel.context(seq);
                        setMenu({ x: e.clientX, y: e.clientY, seq });
                      },
                    };
                    const dt = deltaMode !== "off" && <span className="dt">{deltaText(deltaMode, f)}</span>;
                    if (f.dir === "ev")
                      return (
                        <div key={r.key} className={cls} style={style} {...handlers}>
                          <span className="ts">{fmt(f.ts)}</span>
                          {dt}
                          <span className="dir">EV</span>
                          <span className="note">{f.note}</span>
                        </div>
                      );
                    return (
                      <div key={r.key} className={cls} style={style} {...handlers}>
                        <span className="ts">{fmt(f.ts)}</span>
                        {dt}
                        <span className="dir">{f.dir === "rx" ? "RX ◀" : "TX ▶"}</span>
                        <span className="data">
                          {view !== "ascii" && <span className="hex">{hex(f.bytes)}</span>}
                          {view !== "hex" && <span className="asc">{ascii(f.bytes)}</span>}
                        </span>
                        {f.check != null && <span className={f.check ? "badge ok" : "badge fail"}>{f.check ? t("ok") : t("fail")}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <FollowButton follow={follow} lang={lang} hidden={frames.length === 0} />
            </>
          )}
        </div>
        {menu && (
          <LogMenu
            x={menu.x}
            y={menu.y}
            label={t("view")}
            onClose={() => setMenu(null)}
            items={logMenuItems({
              lang,
              frames: selectedFrames(sel, frameOf),
              clicked: frameOf(menu.seq),
              view,
              fmt,
              col,
              onCopied,
              sendAgain: { run: (b) => void doSend(rawSpec(b)), enabled: online, why: sendWhy },
              addCommand: (b) => {
                pushCommand({ ...rawSpec(b), name: hex(b).slice(0, 24), key: null });
                toast.show(ui(lang, "addedCmds", { n: 1 }));
              },
              find: (b) => {
                filter.setState((s) => ({ ...s, query: hex(b), qmode: "hex" }));
                document.querySelector<HTMLInputElement>(".filterbar .find")?.focus();
              },
            })}
          />
        )}

        <div className="sendbar">
          <div className="sendrow">
            {/* 바꾸면 같은 바이트의 새 표기로 옮기고, 켜진 체크섬은 아래 알림줄로(HEX 에 쓰던 체크섬이 ASCII 명령에 모르고 붙지 않게) */}
            <select value={spec.mode} onChange={(e) => modeSwitch.changeMode(e.target.value as TextMode)} data-tip={ui(lang, "sendModeTip")} aria-label="HEX / ASCII">
              <option value="hex">HEX</option>
              <option value="ascii">ASCII</option>
            </select>
            <input
              ref={sendInput}
              className="sendtext"
              value={spec.text}
              placeholder={spec.mode === "hex" ? "01 03 00 00 00 0A" : "AT\\r\\n"}
              data-tip={tip(lang, "sendText")}
              onChange={(e) => {
                setSpec({ ...spec, text: e.target.value });
                modeSwitch.onEdit();
                history.edited();
              }}
              onKeyDown={(e) => {
                if (history.onKeyDown(e)) return;
                if (e.key === "Enter" && !e.nativeEvent.isComposing) sendNow();
              }}
            />
            <button className="btn mb-open" data-tip={tip(lang, "modbusBuild")} onClick={() => setShowMb(true)}>
              {t("mbRequest")}
            </button>
            {spec.mode === "ascii" && spec.checksum && (
              <span className="ck-chip" title={t("ckChipTip")}>
                {fill(t("ckChip"), { a: checksumDesc(spec.checksum, spec.ck, lang), n: checksumLen(spec.checksum, spec.ck) })}
              </span>
            )}
            <ChecksumPicker lang={lang} kind={spec.checksum} ck={spec.ck} noneLabel={`${t("checksum")}: ${t("none")}`} tipKey="checksum" ariaLabel={t("checksum")} onChange={(k, c) => setSpec({ ...spec, checksum: k, ck: c })} />
            <select value={spec.suffix} onChange={(e) => setSpec({ ...spec, suffix: e.target.value })} data-tip={tip(lang, "suffix")}>
              <option value="">{t("suffix")}: {t("none")}</option>
              <option value="\r">{t("suffix")}: CR</option>
              <option value="\n">{t("suffix")}: LF</option>
              <option value="\r\n">{t("suffix")}: CR LF</option>
            </select>
            <button data-tip={tip(lang, "send")} className="btn primary" onClick={() => {
                sendNow();
                sendInput.current?.focus();
              }} disabled={!online || !sendable}>
              {t("send")}
            </button>
          </div>
          <div className="sendrow sub">
            {!connected ? (
              <span className="why">{t("whyNotConnected")}</span>
            ) : online && !sendable && !previewErr ? (
              <span className="why">{t("whyEmpty")}</span>
            ) : null}
            <span className={previewErr ? "preview err" : "preview"}>
              {t("willSend")}: {previewErr ?? (previewBytes ? `${hex(previewBytes)} (${previewBytes.length})` : "")}
            </span>
            <span className="grow" />
            <label data-tip={withKey(tip(lang, "repeatSerial"), KEYS.stopRepeat)} className="inline">
              <input type="checkbox" checked={repeating} disabled={!online || (!repeating && !sendable)} onChange={(e) => startRepeat(e.target.checked)} /> {t("repeat")}
            </label>
            <NumInput className="num" min={10} max={3600000} value={repeatMs} onValue={setRepeatMs} aria-label={t("repeat")} />
            <label className="inline" data-tip={tip(lang, "repeatTimes")}>
              <NumInput className="num small-num" min={0} max={1000000} value={repeatTimes} onValue={setRepeatTimes} aria-label={io(lang, "repeatTimes")} /> {io(lang, "repeatTimes")}
            </label>
            {(repeating || repeatSent > 0) && (
              <span className="rep-count">{repeatTimes > 0 ? io(lang, "repeatSentOf", { n: repeatSent, m: repeatTimes }) : io(lang, "repeatSent", { n: repeatSent })}</span>
            )}
            {repeatSpec && (
              <span className="repeating mono" title={hex(repeatSpec.bytes)}>
                {fill(t("repeatingAs"), { a: repeatSpec.bytes.length > 16 ? `${hex(repeatSpec.bytes.slice(0, 16))} …` : hex(repeatSpec.bytes) })}
              </span>
            )}
            <button className="btn small add-cmd" onClick={addCommand} disabled={!sendable}>
              + {t("addCommand")}
            </button>
            <span className="send-tools">
            <label className="inline" data-tip={tip(lang, "charDelay")}>
              {io(lang, "charDelay")} <NumInput className="num small-num" min={0} max={10000} value={charDelay} onValue={setCharDelay} aria-label={io(lang, "charDelay")} />
            </label>
            <button className="btn small" onClick={sendBreak} disabled={!online} data-tip={online ? tip(lang, "breakBtn") : sendWhy}>
              {io(lang, "breakBtn")}
            </button>
            <label className="inline" data-tip={tip(lang, "breakMs")}>
              <NumInput className="num small-num" min={1} max={10000} value={breakMs} onValue={setBreakMs} aria-label={io(lang, "breakMs")} /> ms
            </label>
            <button className="btn small" onClick={() => setShowFile(true)} data-tip={tip(lang, "fileSend")}>
              {io(lang, "fileSend")}…
            </button>
            </span>
          </div>
          {fileJob && <JobBar lang={lang} job={fileJob} onCancel={cancelSend} onOpen={() => setShowFile(true)} />}
          {modeSwitch.node}
          {connected && !online && <div className="interlock">{t("ilOffline")}</div>}
          {repeating && repeatMs < minRep && <div className="interlock">{t("ilRepeat").replace("{a}", String(repeatMs)).replace("{b}", String(minRep))}</div>}
          {xonxoff && <div className="interlock">{t("ilXon")}</div>}
          {cfg.flow === "hardware" && <div className="hint">{t("ilRtsHw")}</div>}
          {error && <div className="error">{error}</div>}
        </div>
      </main>

      {showRight && <div className="backdrop narrow-only" onClick={() => setShowRight(false)} />}
      <aside className="right">
        <button className="btn small narrow-only close-right" onClick={() => setShowRight(false)} title={t("close")} aria-label={t("close")}>
          ✕
        </button>
        <CommandList
          lang={lang}
          app="PortDock Serial"
          title={t("commands")}
          commands={commands}
          setCommands={setCommands}
          onSend={(c) => void doSend(c)}
          canSend={online}
          sendWhy={sendWhy}
          onEdit={(c) => {
            setSpec({ text: c.text, mode: c.mode, checksum: c.checksum, suffix: c.suffix, ck: c.ck ?? null });
            sendInput.current?.focus();
          }}
          toast={toast}
          writeText={api.writeText}
          readText={api.readText}
          handle={cmdList}
        />

        <TriggerPanel lang={lang} trg={trg} toast={toast} />

        <h3 data-tip={tip(lang, "detailModbus")}>{t("detail")}</h3>
        {!selFrame && <div className="hint">{t("selectFrame")}</div>}
        {selFrame && (
          <div className="detail">
            <div>
              {selFrame.dir.toUpperCase()} · {fmt(selFrame.ts)}
              {selFrame.dir !== "ev" && ` · ${selFrame.bytes.length} ${t("bytes")}`}
            </div>
            {selFrame.dir === "ev" ? (
              <pre className="dump">{selFrame.note}</pre>
            ) : (
              <>
                <pre className="dump">{hex(selFrame.bytes)}</pre>
                <pre className="dump">{ascii(selFrame.bytes)}</pre>
              </>
            )}
            {modbus && !showModbus && <div className="hint">{t("notModbus")}</div>}
            {showModbus && modbus && (
              <div className="modbus">
                <div className="mbhead">
                  Modbus · {mbWord(modbus.kind, lang)} · {t("crc")} <b className={modbus.crc_ok ? "okc" : "failc"}>{modbus.crc_ok ? t("ok") : t("fail")}</b>
                </div>
                <table>
                  <tbody>
                    <tr>
                      <td>{mbWord("slave", lang)}</td>
                      <td>{modbus.slave}</td>
                    </tr>
                    <tr>
                      <td>{mbWord("function", lang)}</td>
                      <td>
                        0x{modbus.function.toString(16).toUpperCase().padStart(2, "0")} {mbFunc(modbus.function, modbus.function_name, lang)}
                      </td>
                    </tr>
                    {modbus.fields.map(([k, v]) => (
                      <tr key={k}>
                        <td>{mbWord(k, lang)}</td>
                        <td>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {modbus.values.length > 0 && (
                  <>
                    <div className="mbhead">{t("values")}</div>
                    <div className="values">
                      {modbus.values.map((v, i) => (
                        <span key={i}>
                          [{i}] {v}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </aside>
      {showMb && (
        <ModbusBuilder
          lang={lang}
          onPut={(b) => {
            setSpec(mbSpec(b));
            setShowMb(false);
            sendInput.current?.focus();
          }}
          onAdd={(name, b) => setCommands((c) => [...c, { ...mbSpec(b), name, key: null }])}
          onClose={() => setShowMb(false)}
        />
      )}
      {showFile && (
        <FileSendDialog
          lang={lang}
          job={fileJob}
          canSend={online}
          why={sendWhy}
          byteMs={byteMs}
          start={startFile}
          cancel={cancelSend}
          sizeOf={api.fileSize}
          onClose={() => setShowFile(false)}
        />
      )}
      {showHelp && <HelpDialog doc={help} lang={lang} app="PortDock Serial" onClose={() => setShowHelp(false)} />}
      {showSettings && (
        <SettingsDialog
          app="PortDock Serial"
          version="0.1.0"
          settings={settings}
          update={update}
          reset={reset}
          onClose={() => setShowSettings(false)}
          writeText={api.writeText}
          readText={api.readText}
          busy={connected || !!logPath}
          ioOptions
        />
      )}
      {toast.node}
    </div>
  );
}
