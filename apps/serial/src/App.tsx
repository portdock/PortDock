import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { VERSION } from "@shared/version";
import { useVirtualizer } from "@tanstack/react-virtual";
import { save } from "@tauri-apps/plugin-dialog";
import {
  api,
  ascii,
  hex,
  parityChar,
  checkApi,
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
import { mbFunc, mbWord } from "@shared/mbwords";
import { load, loadInt, parseTerminator, samePorts, store, trimFrames } from "@shared/framing";
import { autoLogPath, formatTime, logExt, logOptionsOf, rowHeight, useFold, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { hasXonXoff, minRepeatMs, repeatInterval, serialTxMs } from "@shared/interlocks";
import { FailCount, filterDesc, LogFilterBar, useLogFilter } from "@shared/LogFilter";
import { screenText, type LogFrame } from "@shared/logSearch";
import { ModbusBuilder } from "@shared/ModbusBuilder";
import { AutoReplySection } from "@shared/AutoReplySection";
import { useFollowTail } from "@shared/useFollowTail";
import { FollowButton } from "@shared/FollowButton";
import { copyTextOf, selectedFrames, useCopyKey, useLogSelection } from "@shared/logCopy";
import { LogMenu, logMenuItems, type MenuAt } from "@shared/LogMenu";
import { useToast } from "@shared/Toast";
import { CommandList, type CommandListHandle } from "@shared/CommandList";
import { KEYS, useShortcuts, withKey } from "@shared/shortcuts";
import { useWindowTitle, windowTitle } from "@shared/useWindowTitle";
import { PinButton } from "@shared/PinButton";
import { PortPicker } from "@shared/PortPicker";
import { portUsable, setManualPort } from "@shared/portPick";
import { openInApp } from "@shared/openApp";
import { count } from "@shared/usage";
import { launchFilled, serialLaunch } from "./launch";
import { useKeepAwake } from "@shared/useKeepAwake";
import { loadLastOk, saveLastOk, useAutoStart } from "@shared/autoStart";
import { useLostAlert } from "@shared/useLostAlert";
import { useLogKeys } from "@shared/logKeys";
import { CopyButton } from "@shared/CopyButton";
import { saveName } from "@shared/fileName";
import { NarrowBar, SideBackdrop, SideClose } from "@shared/NarrowBar";
import { useModeSwitch } from "@shared/SendMode";
import { ui } from "@shared/uiText";
import { io } from "@shared/ioText";
import { checksumDesc, checksumLabel, checksumLen, checksumToRust, crcProblem, setTextEncoding, type CkOpts } from "@shared/format";
import { ChecksumPicker } from "@shared/ChecksumOptions";
import { useSendHistory } from "@shared/sendHistory";
import { deltaText, Meter, newDeltaState, stampDelta, type DeltaMode } from "@shared/liveStats";
import { LiveStats, ViewOptions } from "@shared/StatsBar";
import { TriggerPanel, useTriggers } from "@shared/TriggerPanel";
import { FileSendDialog, JobBar, type FileJob, type Pace, type Progress } from "@shared/FileSend";
import { PortCheckDialog } from "@shared/PortCheckDialog";
import { TermBuffer } from "@shared/terminal";
import { TerminalView } from "@shared/TerminalView";
import { Popover } from "@shared/Popover";
import { FirstCard } from "@shared/FirstCard";
import { applyPreset, isPresetId, PRESET_IDS, presetDiff, type PresetField, type PresetId, type PresetState } from "@shared/serialPresets";
import { serialExamples } from "@shared/examples";
import { MbValues } from "@shared/MbValues";
import { pairInLog, rtuCrcOk, type AddrNotation } from "@shared/mbPair";
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

/** 예전 저장 값(rs485 없음·stopBits 2 외)도 받는다 */
function loadCfg(): SerialConfig {
  return cleanCfg(load<Partial<SerialConfig>>("cfg", {}));
}

/** 저장된 설정(모양이 틀릴 수 있음)을 쓸 수 있는 값으로 — 빠진 칸은 기본값 */
function cleanCfg(raw: unknown): SerialConfig {
  const c = (raw && typeof raw === "object" ? raw : {}) as Partial<SerialConfig>;
  return {
    port: typeof c.port === "string" ? c.port : "",
    baud: Number.isInteger(c.baud) && c.baud! >= 50 && c.baud! <= 20_000_000 ? c.baud! : 9600,
    dataBits: c.dataBits === 5 || c.dataBits === 6 || c.dataBits === 7 ? c.dataBits : 8,
    parity: (["none", "odd", "even", "mark", "space"] as const).includes(c.parity as never) ? c.parity! : "none",
    stopBits: c.stopBits === 1.5 || c.stopBits === 2 ? c.stopBits : 1,
    flow: c.flow === "hardware" || c.flow === "software" ? c.flow : "none",
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
  // true = 첫 절, 글자 = 그 id 의 절(첫 실행 카드의 도움말 링크)
  const [showHelp, setShowHelp] = useState<boolean | string>(false);
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
  // 포트 목록을 한 번이라도 읽었는지(실패해도) — 켤 때 자동 연결은 그 뒤에
  const [portsRead, setPortsRead] = useState(false);
  useEffect(() => {
    let alive = true;
    const tick = () =>
      api
        .listPorts()
        .then((p) => alive && setPorts((o) => samePorts(o, p)))
        .catch(() => {})
        .finally(() => alive && setPortsRead(true));
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
  // 왼쪽 칸 «고급 연결»(흐름 제어·RS-485·DTR·RTS) — 대부분 안 쓰니 접는다. 기본값이 아니면 펼친 채 시작, 열림 상태는 기억
  const advConnChanged = cfg.flow !== "none" || rs485On || cfg.dtr || cfg.rts;
  const [advConnOpenSaved, setAdvConnOpenSaved] = useState<boolean>(() => advConnChanged || load("advConnOpen", false));
  useEffect(() => store("advConnOpen", advConnOpenSaved), [advConnOpenSaved]);
  const [advConnOpen, setAdvConnOpen] = useFold(advConnOpenSaved, setAdvConnOpenSaved, settings.expandAll);
  // 연결되면 연결 설정(용도·포트·속도·고급 연결·자동 재연결)을 «COM3 9600 8N1 [바꾸기]» 한 줄로 접는다(10/18).
  // [바꾸기] 로 펼치면 지금처럼 바로 적용되고, 끊으면 다시 펼친 채로. «모두 펼치기» 면 늘 펼침
  const [connEditSaved, setConnEditSaved] = useState(false);
  const [connEdit, setConnEdit] = useFold(connEditSaved, setConnEditSaved, settings.expandAll);

  const [framing, setFraming] = useState<FrameMode>(() => load("framing", { kind: "gap", gapMs: 20 }));
  /** 프레임 구분을 고를 때의 처음 값 */
  const newFraming = (k: FrameMode["kind"], gapMs?: number): FrameMode =>
    k === "gap" ? { kind: "gap", gapMs: gapMs ?? 20 } : k === "terminator" ? { kind: "terminator", bytes: [], gapMs: 100 } : k === "fixed" ? { kind: "fixed", len: 8, gapMs: 100 } : { kind: "modbus-rtu", baud: cfg.baud };
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
  // 요청 창으로 Modbus 를 보냈는데 받기가 Modbus 가 아니면 한 번만 묻는 알림줄 — [예] = 프레임 구분 Modbus RTU + 수신 CRC16 Modbus 검사
  const [mbRxAsk, setMbRxAsk] = useState(false);
  const acceptMbRx = () => {
    setMbRxAsk(false);
    if (framing.kind !== "modbus-rtu") setFraming({ kind: "modbus-rtu", baud: cfg.baud });
    if (rxCheck !== "crc16-modbus") {
      setRxAuto({ prev: rxCheck });
      setRxCheck("crc16-modbus");
    }
  };
  // «받기 설정»(프레임 구분·수신 체크섬) 접기 — 기본(끊김 시간 20ms·체크섬 없음)이 아니면 펼친 채 시작
  const rxChanged = !(framing.kind === "gap" && framing.gapMs === 20) || rxCheck != null;
  const [rxOpenSaved, setRxOpenSaved] = useState<boolean>(() => rxChanged || load("rxOpen", false));
  useEffect(() => store("rxOpen", rxOpenSaved), [rxOpenSaved]);
  const [rxOpen, setRxOpen] = useFold(rxOpenSaved, setRxOpenSaved, settings.expandAll);
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
    if (sessionId || !ports.length || portUsable(ports, cfg.port)) return;
    const next = pickPort(ports, load<PortId | null>("portId", null));
    if (cfg.port) setPortNotice(fill(dict[lang].portSwitched, { a: cfg.port, b: next }));
    setCfg((c) => ({ ...c, port: next }));
  }, [ports, cfg.port, sessionId, lang]);

  // 명령줄 인자(0.3.0) — «--port COM3 --baud 9600». 설정만 채우고 연결은 사용자가 누른다(한 번만)
  const launchDone = useRef(false);
  // 명령줄 처리가 끝났는지·--auto·칸을 채웠는지 — 켤 때 자동 연결이 본다
  const [launch, setLaunch] = useState<{ done: boolean; auto: boolean; filled: boolean }>({ done: false, auto: false, filled: false });
  useEffect(() => {
    if (launchDone.current) return;
    launchDone.current = true;
    api
      .launchArgs()
      .then(async (argv) => {
        if (!argv?.length) return;
        const l = serialLaunch(argv);
        setLaunch((x) => ({ ...x, auto: l.auto, filled: launchFilled(l) }));
        const d = dict[langRef.current];
        const parts: string[] = [];
        if (l.port) {
          // 목록에 없는 COM 이면 직접 넣은 포트로 기억한다 — 다른 포트로 저절로 바뀌지 않게
          const sp = l.port;
          const listed = await api
            .listPorts()
            .then((ps) => ps.some((p) => p.name.toLowerCase() === sp.toLowerCase()))
            .catch(() => false);
          if (!listed) setManualPort(sp);
          setCfg((c) => ({ ...c, port: sp }));
          setPortNotice(null);
          parts.push(sp);
        }
        if (l.baud !== undefined) {
          setCfg((c) => ({ ...c, baud: l.baud! }));
          parts.push(`${l.baud} bps`);
        }
        const msg = [launchFilled(l) && fill(d.launchSet, { a: parts.join(" · ") }), l.bad.length > 0 && fill(d.launchBad, { a: l.bad.join(", ") })].filter(Boolean).join(" / ");
        if (msg) toast.show(msg, { error: l.bad.length > 0, ms: 9000 });
      })
      .catch(() => {})
      .finally(() => setLaunch((x) => ({ ...x, done: true })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // «Modbus 요청» 창으로 보낸 요청(국번·함수)을 기억했다가, CRC 가 맞는 같은 국번·함수 응답이 오면 그 줄을 골라 상세에 값이 바로 보이게
  const mbAwait = useRef<{ unit: number; fc: number; until: number } | null>(null);
  const mbPick = useRef<number | null>(null);

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
            const w = mbAwait.current;
            if (w && (now > w.until || (f.bytes[0] === w.unit && (f.bytes[1] & 0x7f) === w.fc && rtuCrcOk(f.bytes)))) {
              if (now <= w.until) mbPick.current = f.seq;
              mbAwait.current = null;
            }
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

  // 끝 문자 칸 — 백엔드와 같은 규칙 + CR·LF 같은 이름. 틀리면 빈 끝 문자(끊김 시간만)
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
  function connect() {
    return connectWith(cfg);
  }
  /** 이 설정으로 연결 — 성공하면 true(켤 때 자동 연결이 결과를 본다) */
  async function connectWith(cfg: SerialConfig): Promise<boolean> {
    if (connecting) return false;
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
      // 켤 때 자동 연결(0.3.0)이 다시 열 설정
      saveLastOk(cfg);
      return true;
    } catch (e) {
      setConnectErr(String(e));
      noteError(String(e));
      return false;
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!sessionId) return;
    await api.close(sessionId);
    setSessionId(null);
    setStatus("closed");
    setStatusMsg(null);
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
    const ext = logExt(settings);
    const path = await save({ title: t("logDlgTitle"), defaultPath: saveName("serial", livePort ?? cfg.port, ext), filters: [{ name: "Log", extensions: ext === "csv" ? ["csv", "txt"] : ["log", "txt"] }] });
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
  // 좁은 창(1180px 이하)은 오른쪽 칸이 숨어 있다 — 줄을 누르면 펼치고 «상세» 로 굴려 «아무 일도 안 일어남» 이 없게
  const detailHead = useRef<HTMLHeadingElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const openDetail = () => {
    if (!matchMedia("(max-width: 1180px)").matches) return;
    setShowRight(true);
    requestAnimationFrame(() => detailHead.current?.scrollIntoView({ block: "start" }));
  };

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
  // 로그 칸 키보드 이동(↑↓·Shift·PageUp/Down·Home/End) — 로그 칸에 포커스가 있을 때만
  const onLogKeys = useLogKeys({
    sel,
    count: filter.count,
    seqAt: (i) => filter.at(i)?.seq,
    indexOfSeq: filter.indexOfSeq,
    scrollTo: (i) => rows.scrollToIndex(i, { align: "auto" }),
    page: () => Math.max(1, Math.floor((listRef.current?.clientHeight ?? 0) / rowHeight(settings.fontSize)) - 1),
    follow,
  });
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
    const path = await save({ defaultPath: saveName("serial", livePort ?? (cfg.port || null), "txt"), filters: [{ name: "Text", extensions: ["txt", "log"] }] });
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
  // 첫 실행(저장값 없음)은 AT·SCPI·NMEA 처럼 글자 명령이 흔해 ASCII + 줄 끝 CR LF 로 시작한다. 저장값이 있으면 그것을 쓴다
  const [spec, setSpec] = useState<SendSpec>(() => load("spec", { text: "", mode: "ascii", checksum: null, suffix: "\\r\\n" }));
  // 보내기 버튼·Modbus 요청 넣기 뒤 입력칸으로 돌아가 바로 이어 쓸 수 있게
  const sendInput = useRef<HTMLInputElement>(null);
  const [previewBytes, setPreviewBytes] = useState<number[] | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [repeatMs, setRepeatMs] = useState(1000);
  // 반복 횟수 한도(0 = 계속)와 이번 반복에서 보낸 수
  const [repeatTimes, setRepeatTimes] = useState(() => loadInt("repeatTimes", 0, 1_000_000, 0));
  useEffect(() => store("repeatTimes", repeatTimes), [repeatTimes]);
  const [repeatSent, setRepeatSent] = useState(0);
  const repeatSentRef = useRef(0);
  // 문자 간 지연(ms) — 모든 송신(보내기·명령·반복·다시 보내기)에
  const [charDelay, setCharDelay] = useState(() => loadInt("charDelay", 0, 10_000, 0));
  useEffect(() => store("charDelay", charDelay), [charDelay]);
  const [breakMs, setBreakMs] = useState(() => loadInt("breakMs", 1, 10_000, 100));
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
  // 설정이 깨져 송신 시간이 NaN 이어도 0ms 로 돌지 않게
  const effRepeat = repeatInterval(Math.max(repeatMs, minRep));
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
  // «연결 점검…»(shared/PortCheckDialog) — 고른 포트의 장치 정보·연결 시험
  const [showCheck, setShowCheck] = useState(false);
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

  // ---- 보내기 둘째 줄 «⋯ 더보기» — times: 연 순간 줄에 횟수 칸이 없었으면 팝오버에 둔다
  const [moreOpen, setMoreOpen] = useState<{ times: boolean } | null>(null);
  const moreBtn = useRef<HTMLButtonElement>(null);
  const closeMore = useCallback(() => setMoreOpen(null), []);
  // 횟수 칸은 반복을 켰거나 횟수를 정해 둔 때만 줄에 보인다(«반복 1000» 과 «Break 100 ms» 가 섞여 보이지 않게)
  const timesInRow = repeating || repeatTimes > 0;
  const repeatTimesBox = (
    <label className="inline" data-tip={tip(lang, "repeatTimes")}>
      <NumInput className="num small-num rep-times" min={0} max={1000000} value={repeatTimes} onValue={setRepeatTimes} aria-label={io(lang, "repeatTimes")} /> {io(lang, "repeatTimes")}
    </label>
  );

  // ---- Modbus 요청 만들기 — HEX·CRC16 Modbus·줄 끝 없음으로 맞춘다(Modbus RTU 에는 줄 끝이 없다)
  const [showMb, setShowMb] = useState(false);
  const mbSpec = (bytes: number[]): SendSpec => ({ text: hex(bytes), mode: "hex", checksum: "crc16-modbus", suffix: "", ck: null });
  // 상세의 «요청과 짝» — 고른 줄을 응답으로 보고 바로 앞 요청(TX)과 짝지어 «40001 = 1812 (0x0714)». 주소 표기는 «Modbus 요청» 창이 쓰던 것
  const selIdx = selFrame && frames.length ? (selFrame.seq ?? 0) - (frames[0].seq ?? 0) : -1;
  const paired = useMemo(() => (selFrame && selFrame.dir !== "ev" ? pairInLog(framesRef.current, selIdx, "rtu") : null), [selFrame, selIdx]);
  const mbNotation = useMemo<AddrNotation>(() => (load<{ addrMode?: string }>("mbForm", {}).addrMode === "plc" ? "plc" : "zero"), [showMb]); // eslint-disable-line react-hooks/exhaustive-deps
  // 기억한 요청의 응답이 오면 그 줄을 고른다(따라가기는 그대로)
  useEffect(() => {
    if (mbPick.current == null) return;
    sel.only(mbPick.current);
    mbPick.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  // HEX ↔ ASCII 를 바꾸면 같은 바이트의 새 표기로, 켜진 체크섬은 알림줄로
  const modeSwitch = useModeSwitch(spec, setSpec, lang);
  // ASCII 입력이 \r\n·\n·\r 로 끝나는데 «줄 끝 붙이기» 도 켜져 있으면 줄 끝이 두 번 나간다 — 알림줄(✕ 는 그 입력·줄 끝일 때만 숨김)
  const typedEnd = spec.mode === "ascii" ? (/\\r\\n$|\\n$|\\r$/.exec(spec.text.trimEnd())?.[0] ?? null) : null;
  const [dupHidden, setDupHidden] = useState<string | null>(null);
  const dupKey = `${spec.text}|${spec.suffix}`;
  const dupSuffix = !!typedEnd && spec.suffix !== "" && dupHidden !== dupKey;
  // 줄 끝 값은 이스케이프 글자 그대로(«\r\n» 4글자) — 고르기의 value 와 같다
  const suffixName = (v: string) => (v === "\\r" ? "CR" : v === "\\n" ? "LF" : "CR LF");

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

  // ---- 용도 프리셋(포트 위) — 일반 / AT 명령 / Modbus RTU 장비 / NMEA·GPS. 고른 것을 기억하고, 칸을 고치면 «(바꿈)»
  const [preset, setPreset] = useState<PresetId>(() => {
    const v = load<unknown>("preset", "general");
    return isPresetId(v) ? v : "general";
  });
  useEffect(() => store("preset", preset), [preset]);
  const presetNow: PresetState = {
    baud: cfg.baud,
    dataBits: cfg.dataBits,
    parity: cfg.parity,
    stopBits: cfg.stopBits,
    frameKind: framing.kind,
    gapMs: framing.kind === "modbus-rtu" ? 0 : framing.gapMs,
    terminatorText,
    rxCheck,
    mode: spec.mode,
    checksum: spec.checksum,
    suffix: spec.suffix,
  };
  const presetChanged = presetDiff(preset, presetNow);
  const FIELD_KEY: Record<PresetField, Key> = { baud: "baud", dataBits: "dataBits", parity: "parity", stopBits: "stopBits", frameKind: "framing", gapMs: "gapMs", terminatorText: "terminatorHex", rxCheck: "rxCheck", mode: "sendMode", checksum: "checksum", suffix: "suffix" };
  /** 프리셋 값으로 칸을 맞춘다 — 연결 중이면 속도 등은 바로 적용된다. 보내기 형식이 바뀌면 입력칸은 비운다(다른 표기의 글이 남지 않게) */
  function pickPreset(id: PresetId) {
    const n = applyPreset(id, presetNow);
    setPreset(id);
    setCfg((c) => ({ ...c, baud: n.baud, dataBits: n.dataBits, parity: n.parity as SerialConfig["parity"], stopBits: n.stopBits }));
    if (n.frameKind !== framing.kind || (n.frameKind === "gap" && framing.kind === "gap" && n.gapMs !== framing.gapMs)) setFraming(newFraming(n.frameKind, n.gapMs));
    setTerminatorText(n.terminatorText);
    if (n.rxCheck !== rxCheck) {
      setRxCheck(n.rxCheck as ChecksumKind | null);
      setRxCk(null);
    }
    setRxAuto(null);
    setSpec((x) => ({ ...x, mode: n.mode, checksum: n.checksum as ChecksumKind | null, ck: n.checksum === x.checksum ? x.ck : null, suffix: n.suffix, text: x.mode === n.mode ? x.text : "" }));
  }
  const examples = useMemo(() => serialExamples(preset, lang) as Command[], [preset, lang]);

  // ---- 첫 실행 카드(빈 로그 자리) — «무엇을 하나요?» 를 고르면 프리셋 + 예시 명령. «다시 보지 않기» 면 예전 한 줄 안내
  const [firstDone, setFirstDone] = useState<boolean>(() => load("firstHintDone", false));
  useEffect(() => store("firstHintDone", firstDone), [firstDone]);
  function startWith(id: PresetId) {
    pickPreset(id);
    setFirstDone(true);
    // «그냥 보기» 는 예시를 넣지 않는다. 이미 같은 이름이 있으면 빼고 넣는다
    const add = id === "general" ? [] : serialExamples(id, lang).filter((e) => !commands.some((c) => c.name === e.name));
    if (add.length) setCommands((list) => [...list, ...(add as Command[])]);
    toast.show(fill(t(add.length ? "firstPicked" : "firstPickedNone"), { a: t(`preset_${id}`), n: add.length }));
  }

  /** 로그 줄의 바이트 그대로(HEX·체크섬·줄 끝 없음) */
  const rawSpec = (bytes: number[]): SendSpec => ({ text: hex(bytes), mode: "hex", checksum: null, suffix: "", ck: null });

  const connected = sessionId != null;
  // 끊으면 연결 설정 요약(«바꾸기»)을 다시 펼친 채로
  useEffect(() => {
    if (!connected) setConnEditSaved(false);
  }, [connected]);
  const statusKey = `status_${status}` as Key;
  // 끊기면 작업 표시줄 깜빡임 — 장치가 끊김·재연결 대기, 또는 자동 재연결이 꺼져 이유와 함께 닫힘(사용자가 끊은 닫힘은 이유 없음)
  useLostAlert(status === "disconnected" || status === "reconnecting" || (status === "closed" && statusMsg != null), settings.lostAlert);
  // 연결·파일 기록 중 절전 막기(0.3.0, 설정 켬일 때만)
  useKeepAwake(connected || !!logPath, settings.keepAwake);
  // 켤 때 자동 연결(0.3.0) — 설정 «켤 때 마지막 연결 다시 열기» 또는 명령줄 --auto.
  // 명령줄로 칸을 채웠으면 그 값, 아니면 마지막으로 성공한 설정. 포트가 목록에 없으면(직접 넣은 포트도 아니면) 조용히 그친다
  useAutoStart(settings.autoConnect || launch.auto, portsRead && launch.done, () => {
    let c: SerialConfig;
    if (launch.filled) c = cfg;
    else {
      const last = loadLastOk<unknown>();
      if (!last) return;
      c = cleanCfg(last);
    }
    if (!portUsable(ports, c.port)) return;
    if (!launch.filled) {
      setCfg(c);
      setPortNotice(null);
    }
    void connectWith(c).then((ok) => {
      if (!ok) return;
      const d = dict[langRef.current];
      addEv(fill(d.autoConnected, { a: `${c.port} ${c.baud} ${c.dataBits}${parityChar(c.parity)}${c.stopBits}` }));
      // 자동응답이 켜진 채 자동으로 열었으면 알린다 — 모르고 장비에 답하지 않게
      const rules = load<unknown[]>("autoRules", []);
      if (load("autoReplyOn", false) && Array.isArray(rules) && rules.length > 0) {
        addEv(d.autoConnectedReply);
        toast.show(d.autoConnectedReply, { error: true, ms: 12000 });
      }
    });
  });
  const runDisabled = connecting || (!connected && !portUsable(ports, cfg.port));

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
  // 접힌 제목에 보일 지금 값 — 기본값이면 짧게
  const advConnSummary =
    [
      cfg.flow === "hardware" ? "RTS/CTS" : cfg.flow === "software" ? "XON/XOFF" : "",
      rs485On ? t(cfg.rs485 === "driver" ? "rs485DriverShort" : "rs485SoftShort") : "",
      cfg.dtr ? "DTR" : "",
      cfg.rts && !rs485On && cfg.flow !== "hardware" ? "RTS" : "",
    ]
      .filter(Boolean)
      .join(" · ") || t("advConnDefault");
  const rxSummary = [
    framing.kind === "gap"
      ? `${t("fmGapShort")} ${framing.gapMs}ms`
      : framing.kind === "terminator"
        ? `${t("fmTerminator")} ${term_.bytes.length ? hex(term_.bytes) : "—"}`
        : framing.kind === "fixed"
          ? `${t("fmFixed")} ${framing.len}`
          : t("fmModbus"),
    rxCheck ? checksumLabel(rxCheck, lang) : t("rxNoCheck"),
  ].join(" · ");

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
          <ReportButton app="PortDock Serial" lang={lang} frames={() => framesRef.current} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} usageAsked={settings.usageAsked} onUsage={(on) => update({ usageStats: on, usageAsked: true })} />
          <button className="icon-btn" onClick={openHelp} title={t("helpTip")} aria-label={t("helpTip")}>
            ?
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title={ui(lang, "settings")} aria-label={ui(lang, "settings")}>
            ⚙
          </button>
          <SideClose lang={lang} onClose={() => setShowSide(false)} />
          </span>
        </div>

        {connected && (
          <div className="conn-sum">
            <span className="mono" title={t("lockedHint")}>
              {summary({ ...cfg, port: livePort ?? cfg.port }, lang)}
            </span>
            <button type="button" className="btn small conn-change" onClick={() => setConnEdit(!connEdit)} aria-expanded={connEdit} data-tip={tip(lang, "connChange")}>
              {connEdit ? t("connFold") : t("connChange")}
            </button>
          </div>
        )}
        {(!connected || connEdit) && (
        <>
        <label data-tip={tip(lang, "preset")}>{t("preset")}</label>
        <div className="preset-row">
          <select className="preset-sel" value={preset} onChange={(e) => pickPreset(e.target.value as PresetId)} aria-label={t("preset")}>
            {PRESET_IDS.map((id) => (
              <option key={id} value={id}>
                {t(`preset_${id}`)}
                {id === preset && presetChanged.length ? ` ${t("presetChanged")}` : ""}
              </option>
            ))}
          </select>
          {presetChanged.length > 0 && (
            <button type="button" className="btn small preset-again" onClick={() => pickPreset(preset)} data-tip={tip(lang, "presetAgain")} aria-label={t("presetAgain")}>
              ↺
            </button>
          )}
        </div>
        <div className="hint preset-note">{presetChanged.length ? fill(t("presetDiff"), { a: presetChanged.map((k) => t(FIELD_KEY[k])).join(" · ") }) : t(`presetDesc_${preset}`)}</div>
        {preset === "modbus" && (
          // Modbus Master 로 열기(0.3.0) — 같은 포트를 두 프로그램이 함께 열 수 없으니 연결 중이면 먼저 끊으라고 알린다
          <div className="open-master-row">
            <button
              type="button"
              className="btn small open-master"
              disabled={!cfg.port}
              data-tip={t(connected ? "openMasterBusy" : "openMasterTip")}
              onClick={() => {
                if (connected) {
                  toast.show(t("openMasterBusy"), { error: true });
                  return;
                }
                count("open_in_master");
                void openInApp({ app: "modbus-master", rtu: cfg.port, baud: cfg.baud }, `${cfg.port} ${cfg.baud}`, lang, toast);
              }}
            >
              {t("openMaster")}
            </button>
          </div>
        )}

        <label data-tip={tip(lang, "ports")}>{t("ports")}</label>
        <PortPicker
          lang={lang}
          ports={ports}
          value={cfg.port}
          disabled={connected}
          title={connected ? t("lockedHint") : ""}
          ariaLabel={t("ports")}
          emptyLabel={t("noPorts")}
          onChange={(name) => {
            setCfg((c) => ({ ...c, port: name }));
            setPortNotice(null);
          }}
        />
        <div className="port-info-row">
          {(() => {
            const p = ports.find((x) => x.name === cfg.port);
            return p?.vid != null ? (
              <span className="hint">
                USB {p.vid.toString(16).toUpperCase().padStart(4, "0")}:{p.pid?.toString(16).toUpperCase().padStart(4, "0")}
                {p.serial_number ? ` · S/N ${p.serial_number}` : ""}
              </span>
            ) : (
              <span />
            )
          })()}
          <button type="button" className="btn small ghost port-check-btn" disabled={!cfg.port} onClick={() => setShowCheck(true)} data-tip={tip(lang, "portCheck")}>
            {t("portCheck")}
          </button>
        </div>
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
        <details className="adv panel" open={advConnOpen} onToggle={(e) => setAdvConnOpen((e.target as HTMLDetailsElement).open)}>
          <summary data-tip={tip(lang, "serialAdvConn")}>
            <span className="sum-title">{t("advConn")}</span>
            {!advConnOpen && <span className="sum-note">{advConnSummary}</span>}
          </summary>
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
        </details>
        <label data-tip={tip(lang, "autoReconnect")} className="inline">
          <input
            type="checkbox"
            checked={cfg.autoReconnect}
            onChange={(e) => setCfg({ ...cfg, autoReconnect: e.target.checked })}
          />{" "}
          {t("autoReconnect")}
        </label>
        </>
        )}

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
        <details className="adv panel" open={rxOpen} onToggle={(e) => setRxOpen((e.target as HTMLDetailsElement).open)}>
          <summary data-tip={tip(lang, "serialRx")}>
            <span className="sum-title">{t("rxSettings")}</span>
            {!rxOpen && <span className="sum-note">{rxSummary}</span>}
          </summary>
          <label data-tip={tip(lang, "framing")}>
            {t("framing")}
            <select
              title={t("tipFraming")}
              value={framing.kind}
              onChange={(e) => {
                const k = e.target.value as FrameMode["kind"];
                setFraming(newFraming(k));
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
        </details>
      </aside>

      <main className="main">
        <NarrowBar lang={lang} open={showSide} onToggle={() => setShowSide(!showSide)} dot={connectErr && !connected ? "s-disconnected" : `s-${status}`} summary={summaryLine}>
          <button className={connected ? "btn small danger" : "btn small primary"} onClick={connected ? disconnect : connect} disabled={runDisabled} data-tip={withKey(tip(lang, connected ? "disconnect" : "connect"), KEYS.connect)}>
            {connected ? t("disconnect") : t("connect")}
          </button>
        </NarrowBar>
        <div className="toolbar">
          {/* 1000 폭에서 한 줄(10/18) — «보기» 글자는 빼고(말풍선은 단추에), 받은 바이트 수는 아래 상태줄로, 간격 열은 «보기 설정» 으로 */}
          {(["hex", "ascii", "both"] as ViewMode[]).map((v) => (
            <button
              key={v}
              className={screen === "log" && view === v ? "seg on" : "seg"}
              onClick={() => {
                setView(v);
                setScreen("log");
              }}
              aria-pressed={screen === "log" && view === v}
              data-tip={tip(lang, "view")}
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
          {screen === "log" && <ViewOptions lang={lang} delta={deltaMode} onDelta={setDeltaMode} />}
          <span className="grow" />
          <FailCount lang={lang} n={counters.current.fail} filter={filter} />
          {/* 파일로 계속 저장 — «화면 내용 저장» 옆(10/18 왼쪽 칸에서 옮김). 기록 중이면 «기록 멈춤» + 파일 경로 말풍선 */}
          <button
            data-tip={withKey(tip(lang, logPath ? "stopLog" : "logToFileSettings"), KEYS.fileLog)}
            className={logPath ? "btn small file-log on" : "btn small file-log"}
            onClick={toggleLog}
            disabled={!connected}
            title={logPath ?? undefined}
          >
            {logPath ? t("stopLog") : t("logToFile")}
          </button>
          <button data-tip={withKey(tip(lang, "saveLog"), KEYS.save)} className="btn small" onClick={saveView}>
            {t("saveLog")}
          </button>
          <button data-tip={withKey(tip(lang, "clear"), KEYS.clear)} className="btn small" onClick={clearLog}>
            {t("clear")}
          </button>
          {/* 1100 폭 이하에서는 «☰» 만(도구줄 한 줄) — 이름은 말풍선·aria-label */}
          <button data-tip={tip(lang, "commandsDetail")} className="btn small narrow-only" onClick={() => setShowRight(!showRight)} aria-expanded={showRight} aria-label={t("commandsDetail")}>
            ☰<span className="nb-text"> {t("commandsDetail")}</span>
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
          {logPath && (
            <span className="rec" title={logPath}>
              ● REC
            </span>
          )}
          <span className="grow" />
          <span className="counter">
            RX {counters.current.rx.toLocaleString()} · TX {counters.current.tx.toLocaleString()} {t("bytes")}
          </span>
          <LiveStats meter={meter.current} lang={lang} active={online} />
        </div>

        {screen === "log" && <LogFilterBar lang={lang} filter={filter} selected={selected} total={frames.length} onJump={jumpTo} />}

        <div className="log-wrap">
          {screen === "term" ? (
            <TerminalView term={term.current} lang={lang} colors={termColors} onColors={setTermColors} version={version} />
          ) : (
            <>
              <div className="log" ref={listRef} tabIndex={0} onKeyDown={onLogKeys}>
                {frames.length === 0 &&
                  (firstDone ? (
                    <div className="empty-guide">{t("emptyGuide")}</div>
                  ) : (
                    <FirstCard
                      lang={lang}
                      title={t("firstAsk")}
                      onHide={() => setFirstDone(true)}
                      links={[
                        { id: "start", label: t("firstHelpStart") },
                        { id: "modbus", label: t("firstHelpModbus") },
                      ]}
                      onHelp={setShowHelp}
                    >
                      <div className="first-picks">
                        <button type="button" className="btn small first-at" onClick={() => startWith("at")} data-tip={tip(lang, "firstAt")}>
                          {t("firstAt")}
                        </button>
                        <button type="button" className="btn small first-modbus" onClick={() => startWith("modbus")} data-tip={tip(lang, "firstModbus")}>
                          {t("firstModbus")}
                        </button>
                        <button type="button" className="btn small first-watch" onClick={() => startWith("general")} data-tip={tip(lang, "firstWatch")}>
                          {t("firstWatch")}
                        </button>
                      </div>
                      <div className="hint">{t("firstNote")}</div>
                    </FirstCard>
                  ))}
                <div style={{ height: rows.getTotalSize(), position: "relative" }}>
                  {rows.getVirtualItems().map((r) => {
                    const f = filter.at(r.index);
                    if (!f || f.seq == null) return null;
                    const seq = f.seq;
                    const cls = `row ${f.dir}${filter.isHit(seq) ? " hit" : ""}${sel.has(seq) ? " sel" : ""}${selected === seq ? " primary" : ""}${f.mark ? " marked" : ""}`;
                    const style = f.mark ? ({ transform: `translateY(${r.start}px)`, "--mark": f.mark } as CSSProperties) : { transform: `translateY(${r.start}px)` };
                    // 누르기·Shift·Ctrl 로 고르고, 오른쪽 버튼은 복사·다시 보내기 메뉴. 누른다고 따라가기가 꺼지지는 않는다
                    const handlers = {
                      onClick: (e: ReactMouseEvent) => {
                        sel.click(e, seq);
                        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) openDetail();
                      },
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
              placeholder={spec.mode === "hex" ? "01 03 00 00 00 0A" : spec.suffix ? "AT" : "AT\\r\\n"}
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
            {timesInRow && repeatTimesBox}
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
            {/* 문자 간·Break·파일 보내기(가끔 쓰는 것)는 «⋯ 더보기» 팝오버로. 문자 간 지연이 켜져 있으면 버튼에 보인다(모든 송신에 걸리므로) */}
            <button
              ref={moreBtn}
              className={charDelay > 0 ? "btn small more-btn on" : "btn small more-btn"}
              onClick={() => setMoreOpen((o) => (o ? null : { times: !timesInRow }))}
              aria-expanded={!!moreOpen}
              data-tip={tip(lang, "sendMore")}
            >
              ⋯ {t("more")}
              {charDelay > 0 ? ` · ${fill(t("moreDelay"), { n: charDelay })}` : ""}
            </button>
          </div>
          {moreOpen && (
            <Popover anchor={moreBtn.current} onClose={closeMore} label={t("more")} className="more-pop">
              <div className="pop-row">
                <label className="inline" data-tip={tip(lang, "charDelay")}>
                  {io(lang, "charDelay")} <NumInput className="num small-num" min={0} max={10000} value={charDelay} onValue={setCharDelay} aria-label={io(lang, "charDelay")} />
                </label>
              </div>
              <div className="pop-row">
                <button className="btn small" onClick={sendBreak} disabled={!online} data-tip={online ? tip(lang, "breakBtn") : sendWhy}>
                  {io(lang, "breakBtn")}
                </button>
                <label className="inline" data-tip={tip(lang, "breakMs")}>
                  <NumInput className="num small-num" min={1} max={10000} value={breakMs} onValue={setBreakMs} aria-label={io(lang, "breakMs")} /> ms
                </label>
              </div>
              <div className="pop-row">
                <button
                  className="btn small"
                  onClick={() => {
                    setMoreOpen(null);
                    setShowFile(true);
                  }}
                  data-tip={tip(lang, "fileSend")}
                >
                  {io(lang, "fileSend")}…
                </button>
              </div>
              {/* 반복 횟수 — 줄에 안 보일 때(반복 꺼짐·0)도 미리 정할 수 있게. 열 때 정해 두어 입력 중에 칸이 옮겨 가지 않는다 */}
              {moreOpen.times && <div className="pop-row">{repeatTimesBox}</div>}
            </Popover>
          )}
          {fileJob && <JobBar lang={lang} job={fileJob} onCancel={cancelSend} onOpen={() => setShowFile(true)} />}
          {modeSwitch.node}
          {dupSuffix && (
            <div className="notice warn dup-suffix" role="status">
              <span>{fill(t("dupSuffix"), { a: typedEnd!, b: suffixName(spec.suffix) })}</span>
              <button type="button" className="btn small" onClick={() => setSpec({ ...spec, suffix: "" })}>
                {t("dupSuffixOff")}
              </button>
              <button type="button" className="btn small ghost" onClick={() => setDupHidden(dupKey)} aria-label={ui(lang, "closeNote")} title={ui(lang, "closeNote")}>
                ✕
              </button>
            </div>
          )}
          {mbRxAsk && (
            <div className="notice mb-rx-ask" role="status">
              <span>{t("mbRxAsk")}</span>
              <button type="button" className="btn small" onClick={acceptMbRx}>
                {t("mbRxYes")}
              </button>
              <button type="button" className="btn small ghost" onClick={() => setMbRxAsk(false)} aria-label={ui(lang, "closeNote")} title={ui(lang, "closeNote")}>
                ✕
              </button>
            </div>
          )}
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
          examples={examples}
        />

        <TriggerPanel lang={lang} trg={trg} toast={toast} expandAll={settings.expandAll} />
        <AutoReplySection lang={lang} toast={toast} expandAll={settings.expandAll} />

        <div className="detail-head">
          <h3 ref={detailHead} data-tip={tip(lang, "detailModbus")}>{t("detail")}</h3>
          {selFrame && <CopyButton lang={lang} getText={() => detailRef.current?.innerText ?? ""} />}
        </div>
        {!selFrame && <div className="hint">{t("selectFrame")}</div>}
        {selFrame && (
          <div className="detail" ref={detailRef}>
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
                {!paired && modbus.values.length > 0 && (
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
            {paired && <MbValues lang={lang} paired={paired} notation={mbNotation} />}
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
          // 바로 보내기 — 보낸 뒤 창을 닫아 응답 줄이 보이게 하고, 입력칸 이력에도 남긴다(↑ 로 다시)
          onSend={(b) => {
            const s = mbSpec(b);
            mbAwait.current = { unit: b[0], fc: b[1], until: Date.now() + 5000 };
            void doSend(s).then((ok) => {
              if (!ok) return;
              history.remember({ text: s.text, mode: s.mode });
              // 받기가 아직 Modbus 가 아니면 «받기도 Modbus 로 볼까요?» 를 한 번만(10/18)
              if ((framing.kind !== "modbus-rtu" || rxCheck !== "crc16-modbus") && !load("mbRxAsked", false)) {
                store("mbRxAsked", true);
                setMbRxAsk(true);
              }
              setShowMb(false);
              sendInput.current?.focus();
            });
          }}
          canSend={online}
          sendWhy={sendWhy}
          onHelp={() => {
            setShowMb(false);
            setShowHelp("modbus");
          }}
        />
      )}
      {showCheck && cfg.port && <PortCheckDialog lang={lang} app="PortDock Serial" port={cfg.port} connected={connected} api={checkApi} onClose={() => setShowCheck(false)} />}
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
      {showHelp && <HelpDialog doc={help} lang={lang} app="PortDock Serial" start={typeof showHelp === "string" ? showHelp : null} onClose={() => setShowHelp(false)} />}
      {showSettings && (
        <SettingsDialog
          app="PortDock Serial"
          version={VERSION}
          settings={settings}
          update={update}
          reset={reset}
          onClose={() => setShowSettings(false)}
          writeText={api.writeText}
          readText={api.readText}
          busy={connected || !!logPath}
          ioOptions
          conn
          run
        />
      )}
      {toast.node}
    </div>
  );
}
