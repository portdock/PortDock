import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { VERSION } from "@shared/version";
import { useVirtualizer } from "@tanstack/react-virtual";
import { save } from "@tauri-apps/plugin-dialog";
import { load, loadInt, parseTerminator, store, trimFrames } from "@shared/framing";
import { repeatInterval } from "@shared/interlocks";
import {
  api,
  ascii,
  hex,
  type ChecksumKind,
  type Frame,
  type Peer,
  type RelayTarget,
  type SendSpec,
  type SessionEvent,
  type TcpConfig,
  type TcpFrameMode,
  type TextMode,
} from "./api";
import { tip } from "@shared/tips";
import { ReportButton } from "@shared/ReportDialog";
import { AiCopyButton } from "@shared/AiCopyButton";
import { noteError } from "@shared/report";
import { HelpDialog, useHelpKey } from "@shared/HelpDialog";
import { help } from "./help";
import { autoLogPath, formatTime, logExt, logOptionsOf, rowHeight, useFold, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { FailCount, filterDesc, LogFilterBar, useLogFilter } from "@shared/LogFilter";
import { screenText, type LogFrame } from "@shared/logSearch";
import { useFollowTail } from "@shared/useFollowTail";
import { FollowButton } from "@shared/FollowButton";
import { copyTextOf, selectedFrames, useCopyKey, useLogSelection } from "@shared/logCopy";
import { LogMenu, logMenuItems, type MenuAt } from "@shared/LogMenu";
import { useToast } from "@shared/Toast";
import { CommandList, type CommandListHandle } from "@shared/CommandList";
import { tcpExamples } from "@shared/examples";
import { KEYS, useShortcuts, withKey } from "@shared/shortcuts";
import { useWindowTitle, windowTitle } from "@shared/useWindowTitle";
import { PinButton } from "@shared/PinButton";
import { NarrowBar, SideBackdrop, SideClose, SideTools } from "@shared/NarrowBar";
import { FirstCard } from "@shared/FirstCard";
import { useModeSwitch } from "@shared/SendMode";
import { ui } from "@shared/uiText";
import { io } from "@shared/ioText";
import { checksumDesc, checksumLabel, checksumToRust, crcProblem, setTextEncoding, type CkOpts } from "@shared/format";
import { ChecksumPicker } from "@shared/ChecksumOptions";
import { useSendHistory } from "@shared/sendHistory";
import { deltaText, Meter, newDeltaState, stampDelta, type DeltaMode } from "@shared/liveStats";
import { LiveStats, ViewOptions } from "@shared/StatsBar";
import { Popover } from "@shared/Popover";
import { TriggerPanel, useTriggers } from "@shared/TriggerPanel";
import { FileSendDialog, JobBar, type FileJob, type Pace } from "@shared/FileSend";
import { AutoReplySection } from "@shared/AutoReplySection";
import { IfaceList, IfaceOptions, ifaceProblem, useInterfaces } from "@shared/NetIfaces";
import { ModbusBuilder } from "@shared/ModbusBuilder";
import { MbapDetail, type MbapInfo } from "@shared/MbapDetail";
import { isMbap } from "@shared/mbap";
import { MbValues } from "@shared/MbValues";
import { pairInLog, type AddrNotation } from "@shared/mbPair";
import { dict, type Key, type Lang } from "./i18n";
import { ar } from "@shared/autoReplyText";
import { RecentButton, RecentHosts, useRecent } from "@shared/RecentPicker";
import { joinHostPort, lastRecent, rememberRecent, splitHostPort } from "@shared/recent";
import { useKeepAwake } from "@shared/useKeepAwake";
import { loadLastOk, saveLastOk, useAutoStart } from "@shared/autoStart";
import { useLostAlert } from "@shared/useLostAlert";
import { useLogKeys } from "@shared/logKeys";
import { CopyButton } from "@shared/CopyButton";
import { saveName } from "@shared/fileName";
import { openInApp } from "@shared/openApp";
import { count } from "@shared/usage";
import { tcpLaunch } from "./launch";
import { pairCell, RtBag, rtStats, statsText } from "./pairStats";

const arRelayNote = (lang: Lang) => ar(lang, "relayNote");
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));
import "./App.css";

/** 최근 연결 기록의 모드 이름 — 중계의 듣는 주소는 서버와 따로 */
const recentMode = (m: TcpConfig["mode"]) => (m === "relay" ? "relayListen" : m);

/** 켤 때 다시 열 설정(0.3.0) — 연결에 성공했을 때의 방식·주소·포트·중계 대상 */
interface LastOk {
  cfg: TcpConfig;
  relayTo: RelayTarget;
}
const isPort = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 65535;
/** 저장값 확인 — 모양이 틀리면 null(손으로 고친 값·옛 판) */
function cleanLastOk(v: unknown, base: TcpConfig): LastOk | null {
  if (!v || typeof v !== "object") return null;
  const o = v as { cfg?: Partial<TcpConfig>; relayTo?: Partial<RelayTarget> };
  const c = o.cfg;
  if (!c || (c.mode !== "client" && c.mode !== "server" && c.mode !== "relay") || typeof c.host !== "string" || !isPort(c.port)) return null;
  const bool = (x: unknown, d: boolean) => (typeof x === "boolean" ? x : d);
  const cfg: TcpConfig = {
    ...base,
    mode: c.mode,
    host: c.host.trim(),
    port: c.port,
    noDelay: bool(c.noDelay, base.noDelay),
    autoReconnect: bool(c.autoReconnect, base.autoReconnect),
    reconnectMs: typeof c.reconnectMs === "number" && c.reconnectMs >= 200 && c.reconnectMs <= 3600000 ? c.reconnectMs : base.reconnectMs,
    echo: bool(c.echo, base.echo),
  };
  if (cfg.mode === "client" && (!cfg.host || cfg.port === 0)) return null;
  const r = o.relayTo;
  const relayTo: RelayTarget = r && typeof r.host === "string" && isPort(r.port) ? { host: r.host.trim(), port: r.port } : { host: "", port: 0 };
  if (cfg.mode === "relay" && (!relayTo.host || relayTo.port === 0)) return null;
  return { cfg, relayTo };
}

/** (0.8.0) 중계 기록 줄의 짝 칸 — 요청 «#12 FC03 →», 응답 «#12 3.25 ms», 무응답 */
function PairCell({ p, missed, lang }: { p: NonNullable<Frame["pair"]>; missed: boolean; lang: Lang }) {
  const c = pairCell(p, lang, missed);
  return (
    <span className={c.cls} data-tip={tip(lang, "pairCol")}>
      {c.text}
    </span>
  );
}

type Status = "idle" | "listening" | "connected" | "disconnected" | "reconnecting" | "closed";
type ViewMode = "hex" | "ascii" | "both";
interface Command extends SendSpec {
  name: string;
  key?: string | null;
}

export default function App() {
  const { settings, update, reset } = useSettings();
  const lang = settings.lang;
  const setLang = (l: Lang) => update({ lang: l });
  const [showSettings, setShowSettings] = useState(false);
  // true = 첫 절, 글자 = 그 id 의 절(요청 창 «따라하기 보기»)
  const [showHelp, setShowHelp] = useState<boolean | string>(false);
  // 첫 실행 카드(다른 앱과 같은 shared/FirstCard) — «다시 보지 않기» 를 누르면 짧은 안내만
  const [firstDone, setFirstDone] = useState<boolean>(() => load("firstHintDone", false));
  useEffect(() => store("firstHintDone", firstDone), [firstDone]);
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
  // 글자 보기 인코딩 — 줄 그리기·복사·저장이 같은 값을 쓴다
  setTextEncoding(settings.encoding);
  // 파일 로그 형식·나누기·인코딩 — 다음 파일 기록부터
  useEffect(() => {
    api.setLogOptions(logOptionsOf(settings)).catch(() => {});
  }, [settings]);

  // ---- 설정
  const [cfg, setCfg] = useState<TcpConfig>(() =>
    load("cfg", { mode: "client", host: "192.168.0.10", port: 502, noDelay: true, autoReconnect: true, reconnectMs: 2000, echo: false }),
  );
  const [framing, setFraming] = useState<TcpFrameMode>(() => load("framing", { kind: "gap", gapMs: 20 }));
  // 중계(모니터)가 이어 줄 장비(B)
  const [relayTo, setRelayTo] = useState<RelayTarget>(() => load("relayTo", { host: "192.168.0.10", port: 502 }));
  useEffect(() => store("relayTo", relayTo), [relayTo]);
  // 이 PC 의 랜카드 주소(서버·중계의 묶을 주소 고르기)
  const ifaces = useInterfaces();
  const [terminatorText, setTerminatorText] = useState(() => load("terminatorText", "0D 0A"));
  const [rxCheck, setRxCheck] = useState<ChecksumKind | null>(() => load("rxCheck", null));
  const [rxCk, setRxCk] = useState<CkOpts | null>(() => load("rxCk", null));
  useEffect(() => store("rxCk", rxCk), [rxCk]);
  // 백엔드로 보낼 수신 체크섬(옵션·범용 CRC 포함). 범용 CRC 매개변수가 틀리면 검사하지 않는다
  const rxWire = useMemo(() => (rxCheck === "crc" && (!rxCk?.crc || crcProblem(rxCk.crc)) ? null : checksumToRust(rxCheck, rxCk)), [rxCheck, rxCk]);
  const rxKey = JSON.stringify(rxWire);
  useEffect(() => {
    store("cfg", cfg);
  }, [cfg]);
  useEffect(() => {
    store("framing", framing);
  }, [framing]);
  useEffect(() => {
    store("terminatorText", terminatorText);
  }, [terminatorText]);
  useEffect(() => {
    store("rxCheck", rxCheck);
  }, [rxCheck]);
  // 듣는 방식(서버·중계)인지, 중계인지 — 상대 목록·받는 쪽 고르기·묶을 주소에 쓴다
  // 방식마다 따로 기억한 주소·포트 — 탭을 바꿔도 다른 방식의 주소를 덮어쓰지 않는다
  const [byMode, setByMode] = useState<Partial<Record<TcpConfig["mode"], { host: string; port: number }>>>(() => load("cfgByMode", {}));
  useEffect(() => store("cfgByMode", byMode), [byMode]);
  function pickMode(mode: TcpConfig["mode"]) {
    if (mode === cfg.mode || running) return;
    const saved = { ...byMode, [cfg.mode]: { host: cfg.host, port: cfg.port } };
    setByMode(saved);
    const next = saved[mode] ?? { host: mode === "client" ? (cfg.host === "0.0.0.0" ? "192.168.0.10" : cfg.host) : "0.0.0.0", port: cfg.port };
    // 그 방식의 최근 연결 기록이 있으면 그 값으로(0.3.0)
    const last = lastRecent(recentMode(mode));
    const rec = last ? splitHostPort(last) : null;
    setCfg({ ...cfg, mode, host: rec ? rec.host : next.host, port: rec?.port ?? next.port });
  }
  const relay = cfg.mode === "relay";
  const listening = cfg.mode !== "client";
  // 명령줄 인자(0.3.0) — «--connect 10.0.0.5:5000». 클라이언트 방식·주소·포트만 채우고 접속은 사용자가 누른다(한 번만)
  const launchDone = useRef(false);
  useEffect(() => {
    if (launchDone.current) return;
    launchDone.current = true;
    api
      .launchArgs()
      .then((argv) => {
        if (!argv?.length) return;
        const l = tcpLaunch(argv);
        launchRef.current = { auto: l.auto, filled: !!(l.host && l.port) };
        const d = dict[langRef.current];
        if (l.host && l.port) {
          const host = l.host;
          const port = l.port;
          // 지금 방식의 주소는 방식별 기억에 남겨 둔다(탭을 바꿀 때처럼)
          setCfg((c) => {
            if (c.mode !== "client") setByMode((b) => ({ ...b, [c.mode]: { host: c.host, port: c.port } }));
            return { ...c, mode: "client", host, port };
          });
        }
        const msg = [l.host && l.port && fill(d.launchSet, { a: joinHostPort(l.host, l.port) }), l.bad.length > 0 && fill(d.launchBad, { a: l.bad.join(", ") })].filter(Boolean).join(" / ");
        // --auto 면 곧 접속하므로 ««접속» 을 누르세요» 알림은 띄우지 않는다(무시한 인자만)
        if (l.auto && l.host && l.port) {
          if (l.bad.length) toast.show(fill(d.launchBad, { a: l.bad.join(", ") }), { error: true, ms: 9000 });
        } else if (msg) toast.show(msg, { error: l.bad.length > 0, ms: 9000 });
      })
      .catch(() => {})
      .finally(() => setLaunchReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 명령줄 처리 결과 — 켤 때 자동 연결(0.3.0)이 쓴다
  const launchRef = useRef({ auto: false, filled: false });
  const [launchReady, setLaunchReady] = useState(false);
  // 최근 연결 기록(0.3.0) — 주소 칸은 방식마다 따로(중계의 듣는 주소는 «relayListen»), 중계의 이어 줄 장비(B)는 «relay»
  const recMain = useRecent(recentMode(cfg.mode));
  const recRelay = useRecent("relay");
  // 아직 남기지 않은 성공 기록 — 클라이언트는 «접속됨» 이 왔을 때, 중계 B 는 처음 짝이 이어졌을 때(백엔드가 B 에 붙은 뒤에야 짝을 알린다)
  const pendingRec = useRef<{ client?: string; relay?: string; ok?: LastOk }>({});
  const recRef = useRef({ relay: recRelay.remember });
  recRef.current = { relay: recRelay.remember };
  const pickRecent = (v: string) => {
    const r = splitHostPort(v);
    setCfg({ ...cfg, host: r.host, port: r.port ?? cfg.port });
  };
  // 왼쪽 «고급 연결»(Nagle·재접속) — 대부분 기본값이라 접는다. 기본값(즉시 전송·재접속 2초)이 아니면 펼친 채 시작, 열림 상태는 기억
  const advConnChanged = !cfg.noDelay || (cfg.mode === "client" && (!cfg.autoReconnect || cfg.reconnectMs !== 2000));
  const [advConnOpenSaved, setAdvConnOpenSaved] = useState<boolean>(() => advConnChanged || load("advConnOpen", false));
  useEffect(() => store("advConnOpen", advConnOpenSaved), [advConnOpenSaved]);
  const [advConnOpen, setAdvConnOpen] = useFold(advConnOpenSaved, setAdvConnOpenSaved, settings.expandAll);
  // «받기 설정»(프레임 구분·수신 체크섬·에코) — 기본(끊김 시간 20ms·검사 없음·에코 끔)이 아니면 펼친 채 시작
  const rxChanged = !(framing.kind === "gap" && framing.gapMs === 20) || rxCheck != null || (cfg.mode === "server" && cfg.echo);
  const [rxOpenSaved, setRxOpenSaved] = useState<boolean>(() => rxChanged || load("rxOpen", false));
  useEffect(() => store("rxOpen", rxOpenSaved), [rxOpenSaved]);
  const [rxOpen, setRxOpen] = useFold(rxOpenSaved, setRxOpenSaved, settings.expandAll);
  // 끝 문자 칸 해석 — 틀리면 bytes 가 비고 error 에 이유(화면에 빨갛게)
  const term = parseTerminator(terminatorText, lang);
  const effFraming: TcpFrameMode = framing.kind === "terminator" ? { ...framing, bytes: term.bytes } : framing;

  // ---- 세션
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [local, setLocal] = useState<string | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const peersRef = useRef<Peer[]>([]);
  // 보낼 상대(null = 모두에게). 고른 상대가 끊겨도 «모두에게» 로 바꾸지 않고 주소와 함께 남긴다
  const [target, setTarget] = useState<Peer | null>(null);
  const targetRef = useRef(target);
  targetRef.current = target;
  const langRef = useRef(lang);
  langRef.current = lang;
  const [error, setError] = useState<string | null>(null);
  // 시작(연결·듣기) 실패 — 버튼 바로 밑 빨간 상자로(다른 앱과 같은 자리). 다시 시작하면 지운다
  const [startErr, setStartErr] = useState<string | null>(null);
  // 일부 상대에게만 보냈을 때 알림(오류는 아님)
  const [sendNote, setSendNote] = useState<string | null>(null);
  // 화면에 보인 오류는 «문제 보고» 에 넣을 수 있게 모아 둔다
  useEffect(() => {
    if (error) noteError(error);
  }, [error]);
  const logPathRef = useRef<string | null>(null);
  const repeatOn = useRef(false);
  const [logPath, setLogPathState] = useState<string | null>(null);
  const setLogPath = (p: string | null) => {
    logPathRef.current = p;
    setLogPathState(p);
  };
  // (0.8.0) 중계 pcap 저장 경로(멈추면 null)
  const [pcapPath, setPcapPath] = useState<string | null>(null);
  // (0.8.0) 중계 요청/응답 짝 — 응답을 기다리는 요청 줄(번호 → 줄)과 응답 시간 통
  const reqById = useRef(new Map<number, Frame>());
  const rtBag = useRef(new RtBag());
  const framesRef = useRef<Frame[]>([]);
  const timeBase = useRef<number | null>(null);
  // 줄마다 일련번호 — 앞을 잘라내도 선택한 줄이 다른 줄로 바뀌지 않게
  const seqRef = useRef(0);
  const screenBytes = useRef(0);
  const counters = useRef({ rx: 0, tx: 0, fail: 0 });
  const [version, setVersion] = useState(0);
  // 처리량·마지막 수신, 간격 열
  const meter = useRef(new Meter());
  const deltaSt = useRef(newDeltaState());

  /** 화면에서 만든 사건 줄(EV) — 파일 로그에는 남지 않는다 */
  const addEv = useCallback((note: string) => {
    framesRef.current.push({ ts: Date.now(), dir: "ev", bytes: [], check: null, note, seq: ++seqRef.current });
    screenBytes.current = trimFrames(framesRef.current, maxLines.current, screenBytes.current);
    setVersion((v) => v + 1);
  }, []);

  // ---- 트리거(받은 줄에 패턴이 오면 색·소리·반복/기록 멈춤·사건 줄·깜빡임)
  const trg = useTriggers(lang, {
    addEv,
    stopRepeat: () => {
      if (!repeatOn.current) return false;
      repeatOn.current = false;
      setRepeating(false);
      return true;
    },
    stopLog: () => {
      if (!logPathRef.current) return false;
      logPathRef.current = null;
      setLogPath(null);
      api.setLog(null).catch((e) => setError(String(e)));
      return true;
    },
  });
  const trgCheck = trg.check;

  const onEvent = useCallback((e: SessionEvent) => {
    if (e.type === "frames") {
      const now = Date.now();
      for (const f of e.frames) {
        f.seq = ++seqRef.current;
        stampDelta(deltaSt.current, f);
        framesRef.current.push(f);
        screenBytes.current += f.bytes.length;
        if (f.dir !== "ev") {
          counters.current[f.dir] += f.bytes.length;
          meter.current.add(f.dir, f.bytes.length, now);
        }
        if (f.dir === "rx") trgCheck(f);
        if (f.check === false) counters.current.fail++;
        // 짝: 요청은 기다리는 목록에, 응답은 응답 시간 통에, 무응답은 그 요청 줄에 표시
        const p = f.pair;
        if (p) {
          const waiting = reqById.current;
          if (p.role === "req") {
            waiting.set(p.id, f);
            if (waiting.size > 5000) waiting.delete(waiting.keys().next().value as number);
          } else {
            const q = waiting.get(p.id);
            waiting.delete(p.id);
            if (p.role === "rsp") {
              if (p.rtMs != null) rtBag.current.add(p.rtMs);
              if (p.error) rtBag.current.errors++;
            } else {
              rtBag.current.misses++;
              if (q) q.missed = true;
            }
          }
        }
      }
      screenBytes.current = trimFrames(framesRef.current, maxLines.current, screenBytes.current);
      setVersion((v) => v + 1);
    } else if (e.type === "status") {
      setStatus(e.state);
      // 뜻하지 않은 끊김(클라이언트 끊김·재접속 대기) — 백엔드가 이어서 «닫힘» 을 보내도 사용자가 다시 시작하거나 멈출 때까지 둔다
      if (e.state === "disconnected" || e.state === "reconnecting") setDropped(true);
      else if (e.state === "connected" || e.state === "listening") setDropped(false);
      if (e.state === "connected" && pendingRec.current.client) {
        rememberRecent("client", pendingRec.current.client);
        pendingRec.current.client = undefined;
        // 켤 때 다시 열 설정(0.3.0) — 클라이언트는 접속됐을 때
        if (pendingRec.current.ok) saveLastOk(pendingRec.current.ok);
        pendingRec.current.ok = undefined;
      }
      // 백엔드가 준 설명(재접속 대기·멈춤의 마지막 실패 이유 등)을 먼저 보인다
      setStatusMsg(e.message || e.port || null);
      if (e.state === "closed") {
        setRunning(false);
        setPcapPath(null);
      }
      // 끊기면 반복을 끈다 — 다시 붙었을 때 저절로 보내지 않게
      if (e.state !== "connected" && e.state !== "listening") setRepeating(false);
    } else if (e.type === "peers") {
      // 고른 상대가 방금 끊겼으면 반복을 멈추고 기록에 남긴다(다른 장비로 새지 않게)
      const cur = targetRef.current;
      if (cur && peersRef.current.some((p) => p.id === cur.id) && !e.peers.some((p) => p.id === cur.id) && repeatOn.current) {
        addEv(dict[langRef.current].evTargetGone.replace("{a}", cur.addr));
        setRepeating(false);
      }
      peersRef.current = e.peers;
      setPeers(e.peers);
      if (e.peers.length > 0 && pendingRec.current.relay) {
        recRef.current.relay(pendingRec.current.relay);
        pendingRec.current.relay = undefined;
      }
    } else {
      setError(e.message);
    }
  }, [addEv, trgCheck]);

  useEffect(() => {
    if (running) api.setFraming(effFraming, rxWire).catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, JSON.stringify(effFraming), rxKey]);
  useEffect(() => {
    if (running && cfg.mode === "server") api.setEcho(cfg.echo).catch(() => {});
  }, [running, cfg.echo, cfg.mode]);

  const [starting, setStarting] = useState(false);
  // 끊기면 작업 표시줄 깜빡임(0.3.0) — 클라이언트만(서버·중계는 상대가 끊겨도 듣기는 계속). 사용자가 멈추면 false
  const [dropped, setDropped] = useState(false);
  useLostAlert(dropped && cfg.mode === "client", settings.lostAlert);
  /** 시작 — over: 켤 때 자동 연결이 막 칸에 넣은 설정(상태가 아직 바뀌기 전이라 직접 넘긴다) */
  async function start(over?: LastOk) {
    if (starting) return;
    const c = over?.cfg ?? cfg;
    const rt = over?.relayTo ?? relayTo;
    const isRelay = c.mode === "relay";
    setStarting(true);
    setError(null);
    setStartErr(null);
    setDropped(false);
    const host = c.host.trim();
    const ok: LastOk = { cfg: c, relayTo: { host: rt.host.trim(), port: rt.port } };
    // 클라이언트는 접속은 뒤에서 하므로 «접속됨» 이 와야 남긴다 — 이벤트가 start 응답보다 먼저 올 수 있어 미리 걸어 둔다
    pendingRec.current = {
      client: c.mode === "client" ? joinHostPort(host, c.port) : undefined,
      relay: isRelay ? joinHostPort(rt.host.trim(), rt.port) : undefined,
      ok: c.mode === "client" ? ok : undefined,
    };
    // 요청 번호는 세션마다 1부터 — 앞 세션의 기다리던 요청은 버린다
    reqById.current.clear();
    try {
      const l = await api.start(c, effFraming, rxWire, isRelay ? { host: rt.host.trim(), port: rt.port } : null, onEvent);
      setLocal(l);
      setRunning(true);
      // 서버·중계는 듣기 시작이 성공 — 포트 0(운영체제가 고름)은 다시 쓸 값이 아니라 남기지 않는다
      if (c.mode !== "client" && host && c.port > 0) rememberRecent(recentMode(c.mode), joinHostPort(host, c.port));
      // 켤 때 다시 열 설정(0.3.0) — 서버·중계는 듣기 시작이 성공
      if (c.mode !== "client") saveLastOk(ok);
      if (settings.autoLog && settings.logFolder) {
        const p = autoLogPath(settings.logFolder, "tcp", logExt(settings));
        await api.setLog(p).then(() => setLogPath(p)).catch((e) => setError(String(e)));
      }
    } catch (e) {
      pendingRec.current = {};
      setStartErr(String(e));
    } finally {
      setStarting(false);
    }
  }
  // 켤 때 자동 연결(0.3.0) — 설정 «켤 때 마지막 연결 다시 열기» 또는 명령줄 --auto. 명령줄로 주소를 채웠으면 그 값, 아니면 마지막으로 성공한 설정
  useAutoStart(settings.autoConnect || launchRef.current.auto, launchReady, () => {
    const d = dict[langRef.current];
    let use: LastOk | undefined;
    if (!launchRef.current.filled) {
      const last = cleanLastOk(loadLastOk<unknown>(), cfg);
      if (!last) return;
      use = last;
      if (last.cfg.mode !== cfg.mode) setByMode((b) => ({ ...b, [cfg.mode]: { host: cfg.host, port: cfg.port } }));
      setCfg(last.cfg);
      if (last.cfg.mode === "relay") setRelayTo(last.relayTo);
    }
    const c = use?.cfg ?? cfg;
    const rt = use?.relayTo ?? relayTo;
    const where =
      c.mode === "client"
        ? `${d.tab_client} ${joinHostPort(c.host, c.port)}`
        : c.mode === "relay"
          ? `${d.titleRelay} ${joinHostPort(c.host || "0.0.0.0", c.port)} → ${joinHostPort(rt.host, rt.port)}`
          : `${d.titleServer} ${joinHostPort(c.host || "0.0.0.0", c.port)}`;
    addEv(fill(d.evAutoStart, { a: where }));
    // 자동응답이 켜진 채면 한 번 알린다 — 모르고 장비에 답하지 않게(중계는 자동응답을 쓰지 않는다)
    const rules = load<unknown>("autoRules", []);
    if (c.mode !== "relay" && load("autoReplyOn", false) && Array.isArray(rules) && rules.some((r) => (r as { enabled?: boolean } | null)?.enabled)) addEv(d.evAutoStartReply);
    void start(use);
  });
  // 연결·기록 중 절전 막기(0.3.0)
  useKeepAwake(running || !!logPath || !!pcapPath, settings.keepAwake);
  async function stop() {
    pendingRec.current = {};
    setDropped(false);
    await api.stop();
    setRunning(false);
    setStatus("closed");
    setPeers([]);
    peersRef.current = [];
    setTarget(null);
    setSendNote(null);
    setLogPath(null);
    setPcapPath(null);
  }
  /** (0.8.0) 중계 pcap 저장 켜기·끄기 */
  async function togglePcap() {
    if (pcapPath) {
      try {
        await api.setPcap(null);
      } catch (e) {
        setError(String(e));
      } finally {
        setPcapPath(null);
      }
      return;
    }
    const path = await save({ defaultPath: saveName("tcp", nameWhere(), "pcapng"), filters: [{ name: "pcapng", extensions: ["pcapng"] }] });
    if (!path) return;
    await api.setPcap(path).then(() => setPcapPath(path)).catch((e) => setError(String(e)));
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
    const ext = logExt(settings);
    const path = await save({ defaultPath: saveName("tcp", nameWhere(), ext), filters: [{ name: "Log", extensions: ext === "csv" ? ["csv", "txt"] : ["log", "txt"] }] });
    if (!path) return;
    await api.setLog(path).then(() => setLogPath(path)).catch((e) => setError(String(e)));
  }

  // ---- 보기
  // 첫 실행(저장값 없음)은 HEX·ASCII 둘 다 — 보내기 기본이 ASCII 라 받은 글을 바로 읽게. 저장값이 있으면 그것
  const [view, setView] = useState<ViewMode>(() => load("view", "both"));
  useEffect(() => {
    store("view", view);
  }, [view]);
  const [deltaMode, setDeltaMode] = useState<DeltaMode>(() => load("delta", "off"));
  useEffect(() => {
    store("delta", deltaMode);
  }, [deltaMode]);
  /** 복사·화면 저장에 넣을 간격 열 */
  const col = deltaMode === "off" ? undefined : (f: LogFrame) => deltaText(deltaMode, f);
  const frames = framesRef.current;
  const listRef = useRef<HTMLDivElement>(null);
  // 찾기·거르기 — 보기만 거른다(기록은 그대로)
  const filter = useLogFilter(frames, version);
  const rows = useVirtualizer({ count: filter.count, getScrollElement: () => listRef.current, estimateSize: () => rowHeight(settings.fontSize), overscan: 20 });
  // 글자 크기를 바꾸면 줄 높이를 다시 잰다
  useEffect(() => {
    rows.measure();
  }, [settings.fontSize, rows]);
  // 따라가기 — 맨 아래에 있을 때만 새 줄을 따라간다(위로 굴리면 멈춤, «↓ 맨 아래로»·End 로 다시)
  const follow = useFollowTail(listRef, settings.autoScroll, seqRef.current, `${version}:${filter.count}:${rows.getTotalSize()}`);
  // 줄 고르기(누르기·Shift 범위·Ctrl 하나씩) — 누른 줄이 상세 칸에 나온다
  const sel = useLogSelection({ indexOfSeq: filter.indexOfSeq, seqAt: (i) => filter.at(i)?.seq });
  const selected = sel.primary;
  // 502 로 접속했는데 프레임 구분이 Modbus TCP 가 아니면 한 번만 «Modbus TCP 로 볼까요?»(18b #12)
  const [mb502, setMb502] = useState(false);
  useEffect(() => {
    if (!running || cfg.mode !== "client" || cfg.port !== 502 || framing.kind === "modbus-tcp" || load("mb502Asked", false)) return;
    store("mb502Asked", true);
    setMb502(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  const acceptMb502 = () => {
    setMb502(false);
    setFraming({ kind: "modbus-tcp", gapMs: 1000 });
  };
  // ---- 보내기 둘째 줄 «⋯ 더보기» — times: 연 순간 줄에 횟수 칸이 없었으면 팝오버에 둔다
  const [moreOpen, setMoreOpen] = useState<{ times: boolean } | null>(null);
  const moreBtn = useRef<HTMLButtonElement>(null);
  const closeMore = useCallback(() => setMoreOpen(null), []);
  // 좁은 창(1180px 이하)은 오른쪽 칸이 숨어 있다 — 줄을 누르면 펼치고 «상세» 로 굴린다(Serial 과 같게, 10/18)
  const detailHead = useRef<HTMLHeadingElement>(null);
  const openDetail = () => {
    if (!matchMedia("(max-width: 1180px)").matches) return;
    setShowRight(true);
    requestAnimationFrame(() => detailHead.current?.scrollIntoView({ block: "start" }));
  };
  const frameOf = (seq: number) => {
    const f = frames.length ? frames[seq - (frames[0].seq ?? 0)] : undefined;
    return f && f.seq === seq ? f : undefined;
  };
  const [menu, setMenu] = useState<MenuAt>(null);
  // 로그 칸 키보드 이동(0.3.0) — 그 칸에 포커스가 있을 때만(줄을 누르면 칸에 포커스가 간다)
  const onLogKey = useLogKeys({
    sel,
    count: filter.count,
    seqAt: (i) => filter.at(i)?.seq,
    indexOfSeq: filter.indexOfSeq,
    scrollTo: (i) => rows.scrollToIndex(i, { align: "auto" }),
    page: () => Math.max(1, Math.floor((listRef.current?.clientHeight ?? 0) / rowHeight(settings.fontSize)) - 1),
    follow,
  });
  const detailBox = useRef<HTMLDivElement>(null);
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
  function clearLog() {
    framesRef.current = [];
    counters.current = { rx: 0, tx: 0, fail: 0 };
    reqById.current.clear();
    rtBag.current.reset();
    meter.current.reset();
    deltaSt.current = newDeltaState();
    screenBytes.current = 0;
    sel.clear();
    setMenu(null);
    follow.resume();
    setVersion((v) => v + 1);
  }
  // Ctrl+C — 고른 줄을 «시각 방향 [상대] 내용»(지금 보기대로)으로
  const onCopied = (ok: boolean, n: number) => toast.show(ok ? ui(lang, "copied", { n }) : ui(lang, "copyFail"), { error: !ok });
  useCopyKey(
    () => {
      const list = selectedFrames(sel, frameOf);
      return list.length ? copyTextOf(list, "lines", view, fmt, true, col) : null;
    },
    (ok) => onCopied(ok, sel.set.size),
  );
  /** 저장 파일 이름에 넣을 곳 — 클라이언트는 장비 «주소:포트», 서버는 «:포트», 중계는 장비 B */
  function nameWhere() {
    if (cfg.mode === "client") return cfg.host.trim() ? joinHostPort(cfg.host.trim(), cfg.port) : null;
    if (relay) return relayTo.host.trim() ? joinHostPort(relayTo.host.trim(), relayTo.port) : null;
    const p = local?.match(/:(\d+)$/)?.[1] ?? (cfg.port > 0 ? String(cfg.port) : "");
    return p ? `server-${p}` : "server";
  }
  async function saveView() {
    const path = await save({ defaultPath: saveName("tcp", nameWhere(), "txt"), filters: [{ name: "Text", extensions: ["txt", "log"] }] });
    if (!path) return;
    // 지금 보기(HEX·ASCII·둘 다)대로, 거르기가 켜져 있으면 보이는 줄만
    const text = screenText({ app: "PortDock TCP", frames: framesRef.current, view: filter.view, mode: view, fmt, hex, ascii, filterDesc: filterDesc(filter.state, lang), lang, peers: true, col });
    await api.writeText(path, text).catch((e) => setError(String(e)));
  }

  // ---- 보내기
  const [spec, setSpec] = useState<SendSpec>(() => load("spec", { text: "", mode: "ascii", checksum: null, suffix: "\\r\\n" }));
  const [previewBytes, setPreviewBytes] = useState<number[] | null>(null);
  // 보내기 버튼 뒤 입력칸으로 돌아가 바로 이어 쓸 수 있게
  const sendInput = useRef<HTMLInputElement>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [repeatMs, setRepeatMs] = useState(1000);
  const [repeating, setRepeatingState] = useState(false);
  const setRepeating = (on: boolean) => {
    repeatOn.current = on;
    setRepeatingState(on);
  };
  // 반복 횟수 한도(0 = 계속)와 이번 반복에서 보낸 수
  const [repeatTimes, setRepeatTimes] = useState(() => loadInt("repeatTimes", 0, 1_000_000, 0));
  // 횟수 칸은 반복을 켰거나 횟수를 정해 둔 때만 줄에(나머지는 «⋯ 더보기»)
  const timesInRow = repeating || repeatTimes > 0;
  const repeatTimesBox = (
    <label className="inline" data-tip={tip(lang, "repeatTimes")}>
      <NumInput className="num small-num rep-times" min={0} max={1000000} value={repeatTimes} onValue={setRepeatTimes} aria-label={io(lang, "repeatTimes")} /> {io(lang, "repeatTimes")}
    </label>
  );
  useEffect(() => {
    store("repeatTimes", repeatTimes);
  }, [repeatTimes]);
  const [repeatSent, setRepeatSent] = useState(0);
  const repeatSentRef = useRef(0);
  const startRepeat = (on: boolean) => {
    repeatSentRef.current = 0;
    setRepeatSent(0);
    setRepeating(on);
  };
  // 문자 간 지연(ms) — 모든 송신에. TCP 는 한 바이트씩 따로 보낸다
  const [charDelay, setCharDelay] = useState(() => loadInt("charDelay", 0, 10_000, 0));
  // 중계: 끼워 넣을 쪽(A = 접속해 온 쪽, B = 장비)
  const [side, setSide] = useState<"a" | "b">(() => load("relaySide", "a"));
  useEffect(() => store("relaySide", side), [side]);
  // Modbus TCP: 보낼 때마다 MBAP 트랜잭션 ID 를 1씩
  const [mbapTid, setMbapTid] = useState(() => load("mbapTid", true));
  useEffect(() => store("mbapTid", mbapTid), [mbapTid]);
  // MBAP 트랜잭션 ID 자동 증가 — 프레임 구분이 Modbus TCP 일 때만
  const mbapAuto = framing.kind === "modbus-tcp" && mbapTid;
  const [showMb, setShowMb] = useState(false);
  useEffect(() => {
    store("charDelay", charDelay);
  }, [charDelay]);
  useEffect(() => {
    store("spec", spec);
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
  const sendable = !!previewBytes && previewBytes.length > 0;
  // 고른 상대가 끊겼으면 보내지 않는다 — 말없이 «모두에게» 로 바뀌면 엉뚱한 장비로 나간다
  const targetGone = !!target && !peers.some((p) => p.id === target.id);
  // 같은 IP 로 다시 붙은 상대 — 저절로 바꾸지 않고 고르게 한다
  const targetBack = targetGone && target ? peers.find((p) => p.addr.replace(/:\d+$/, "") === target.addr.replace(/:\d+$/, "")) : undefined;
  const canSend = running && peers.length > 0 && sendable && !targetGone;
  // 클라이언트는 주소와 포트(1~65535)가 있어야 접속할 수 있다 · 중계는 이어 줄 장비(B)도
  const relayOk = !!relayTo.host.trim() && relayTo.port > 0;
  const startable = cfg.mode === "server" || (relay ? relayOk : !!cfg.host.trim() && cfg.port > 0);
  // 앞 송신이 끝나기 전엔 반복의 이번 차례를 건너뛴다
  const inflight = useRef(false);
  /** 보내기 — 성공하면 true */
  const doSend = useCallback(
    async (s: SendSpec) => {
      if (inflight.current || targetGone) return false;
      inflight.current = true;
      try {
        const r = await api.send(target?.id ?? null, s, settings.encoding, charDelay, relay ? side : "a", mbapAuto);
        setError(null);
        // 일부 상대에게만 나갔으면 알린다(예: 3개 중 2개)
        setSendNote(r && typeof r === "object" && r.sent < r.total ? t("partialSend").replace("{s}", String(r.sent)).replace("{t}", String(r.total)) : null);
        return true;
      } catch (e) {
        setError(String(e));
        setRepeating(false);
        return false;
      } finally {
        inflight.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target, targetGone, t, settings.encoding, charDelay, relay, side, mbapAuto],
  );
  // 문자 간 지연이면 한 번 보내는 데 (바이트 수 × 지연)이 걸린다 — 그보다 짧은 간격은 건너뛰기만 한다
  const effRepeat = repeatInterval(Math.max(10, repeatMs, previewBytes ? charDelay * previewBytes.length + 10 : 10));
  useEffect(() => {
    if (!repeating || !running) return;
    const id = setInterval(() => {
      void doSend(spec).then((ok) => {
        if (!ok || !repeatOn.current) return;
        const n = ++repeatSentRef.current;
        setRepeatSent(n);
        if (repeatTimes > 0 && n >= repeatTimes) {
          setRepeating(false);
          addEv(io(langRef.current, "repDone", { n }));
        }
      });
    }, effRepeat);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeating, effRepeat, spec, running, doSend, repeatTimes, addEv]);
  /** 보내기 버튼·Enter — 이력에도 남긴다 */
  const sendNow = () => {
    if (!canSend) return;
    void doSend(spec).then((ok) => ok && history.remember({ text: spec.text, mode: spec.mode }));
  };
  // ↑/↓ 이력 — 보낸 내용(모드 포함)을 다시 불러온다
  const history = useSendHistory({ text: spec.text, mode: spec.mode }, useCallback((h) => setSpec((s) => ({ ...s, text: h.text, mode: h.mode })), []));

  // ---- 파일 보내기
  const [showFile, setShowFile] = useState(false);
  const [fileJob, setFileJob] = useState<FileJob | null>(null);
  async function startFile(path: string, name: string, pace: Pace) {
    let first: FileJob | null = null;
    const r = await api.sendFile(target?.id ?? null, path, pace, (p) => {
      // 시작 응답보다 진행이 먼저 올 수 있다
      setFileJob((j) => (j && j.id === p.id ? { ...j, ...p } : { ...p, name }));
    }, relay ? side : "a");
    first = { id: r.id, total: r.total, sent: 0, done: false, cancelled: false, name };
    setFileJob((j) => (j && j.id === r.id ? j : first));
  }
  const cancelSend = () => api.cancelSend().catch((e) => setError(String(e)));

  // HEX ↔ ASCII 를 바꾸면 같은 바이트의 새 표기로, 켜진 체크섬은 알림줄로
  const modeSwitch = useModeSwitch(spec, setSpec, lang);

  const [commands, setCommands] = useState<Command[]>(() => load("commands", []));
  useEffect(() => {
    store("commands", commands);
  }, [commands]);
  const cmdList = useRef<CommandListHandle>(null);
  /** 명령을 목록 끝에 넣고 이름 칸에 포커스 — 바로 이름을 고칠 수 있게 */
  function pushCommand(c: Command) {
    setCommands((list) => [...list, c]);
    cmdList.current?.focusName(commands.length);
  }
  /** 로그 줄의 바이트 그대로(HEX·체크섬·줄 끝 없음) */
  const rawSpec = (bytes: number[]): SendSpec => ({ text: hex(bytes), mode: "hex", checksum: null, suffix: "", ck: null });
  /** Modbus TCP 요청 — HEX·체크섬 없음·줄 끝 없음(MBAP 에는 CRC 가 없다) */
  const mbSpec = rawSpec;
  // 명령(▶)·다시 보내기를 못 하는 이유
  const cmdWhy = !running ? t("whyNotStarted") : peers.length === 0 ? t(relay ? "whyNoPairs" : "whyNoPeers") : targetGone ? t("whyTargetGone") : undefined;

  const selFrame = selected != null ? frameOf(selected) : undefined;
  const server = cfg.mode === "server";
  // 상세 칸 Modbus TCP 풀이 — 프레임 구분이 Modbus TCP 이거나 MBAP 모양(프로토콜 0·길이 맞음)일 때
  const [mbap, setMbap] = useState<MbapInfo | null>(null);
  const selBytes = selFrame && selFrame.dir !== "ev" ? selFrame.bytes : null;
  // 상세의 «요청과 짝» — MBAP 응답이면 같은 상대·같은 트랜잭션 ID 의 요청과 짝지어 주소 붙은 값으로. 주소 표기는 «Modbus TCP 요청» 창이 쓰던 것
  const selIdx = selFrame && frames.length ? (selFrame.seq ?? 0) - (frames[0].seq ?? 0) : -1;
  const paired = useMemo(() => (selBytes && (framing.kind === "modbus-tcp" || isMbap(selBytes)) ? pairInLog(framesRef.current, selIdx, "tcp") : null), [selBytes, selIdx, framing.kind]);
  const mbNotation = useMemo<AddrNotation>(() => (load<{ addrMode?: string }>("mbForm", {}).addrMode === "plc" ? "plc" : "zero"), [showMb]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const b = selBytes;
    if (!b || !(framing.kind === "modbus-tcp" || isMbap(b))) {
      setMbap(null);
      return;
    }
    let stale = false;
    api
      .decodeMbap(b)
      .then((m) => !stale && setMbap(m))
      .catch(() => !stale && setMbap(null));
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, framing.kind, selBytes?.length]);
  const dirLabel = (d: "rx" | "tx") => (relay ? t(d === "rx" ? "dirAB" : "dirBA") : d === "rx" ? "RX ◀" : "TX ▶");

  // «지난 시간» 기준 — 오래된 줄이 화면에서 잘려도 바뀌지 않게 첫 기록 시각을 잡아 두고, 지우면 다시 잡는다
  if (!framesRef.current.length) timeBase.current = null;
  else if (timeBase.current === null) timeBase.current = framesRef.current[0].ts;
  const fmt = (ts: number) => formatTime(ts, settings.timeFormat, timeBase.current ?? ts);
  useExitGuard(running || !!logPath || !!pcapPath, settings.confirmExit, lang, "PortDock TCP");
  // (0.8.0) 중계 응답 시간 통계 — 짝이나 무응답이 하나라도 있을 때만
  const bag = rtBag.current;
  const pairStatsLine = relay && (bag.values.length > 0 || bag.misses > 0) ? statsText(rtStats(bag.values), bag.misses, bag.errors, lang) : null;

  // ---- 단축키: F4 시작·멈춤, Ctrl+L 지우기, Ctrl+S 화면 저장, Ctrl+Shift+L 파일 기록, Esc 반복 멈춤
  const runDisabled = (!running && !startable) || starting;
  useShortcuts([
    { key: "F4", run: () => !runDisabled && void (running ? stop() : start()) },
    { key: "l", ctrl: true, run: clearLog },
    { key: "s", ctrl: true, run: () => void saveView() },
    { key: "l", ctrl: true, shift: true, run: () => running && void toggleLog() },
    { key: "Escape", inInput: false, run: () => repeatOn.current && setRepeating(false) },
  ]);

  // ---- 창 제목: «서버 :5020 · 상대 2 — PortDock TCP» / «192.168.0.10:502 · 접속됨 — PortDock TCP»
  const localPort = local?.match(/:(\d+)$/)?.[1] ?? String(cfg.port);
  const statusText = t(`status_${status}` as Key);
  useWindowTitle(
    windowTitle(
      "PortDock TCP",
      !running
        ? []
        : relay
          ? [`${t("titleRelay")} :${localPort} → ${relayTo.host}:${relayTo.port}`, t("titlePeers").replace("{n}", String(peers.length))]
          : server
            ? [`${t("titleServer")} :${localPort}`, t("titlePeers").replace("{n}", String(peers.length))]
            : [`${cfg.host}:${cfg.port}`, statusText],
      !!logPath || !!pcapPath,
    ),
  );
  // 접힌 제목에 보일 지금 값
  const advConnSummary = [t(cfg.noDelay ? "nagleOff" : "nagleOn"), cfg.mode === "client" ? (cfg.autoReconnect ? fill(t("reconnShort"), { n: cfg.reconnectMs / 1000 }) : t("noReconn")) : ""]
    .filter(Boolean)
    .join(" · ");
  const rxSummary = [
    framing.kind === "gap"
      ? `${t("fmGapShort")} ${framing.gapMs}ms`
      : framing.kind === "terminator"
        ? `${t("fmTerminator")} ${term.bytes.length ? hex(term.bytes) : "—"}`
        : framing.kind === "fixed"
          ? `${t("fmFixed")} ${framing.len}`
          : t("fmModbusTcp"),
    rxCheck ? checksumLabel(rxCheck, lang) : t("rxNoCheck"),
    server && cfg.echo ? t("echoShort") : "",
  ]
    .filter(Boolean)
    .join(" · ");
  // 실행 중 버튼 — 클라이언트는 «끊기», 서버·중계는 «듣기 멈춤»
  const stopLabel = t(listening ? "stopListen" : "stopClient");
  const summaryLine = listening
    ? `${t(relay ? "titleRelay" : "titleServer")} ${cfg.host}:${running ? localPort : cfg.port}${relay ? ` → ${relayTo.host}:${relayTo.port}` : ""} · ${statusText}${running ? ` · ${t("titlePeers").replace("{n}", String(peers.length))}` : ""}`
    : `${cfg.host}:${cfg.port} · ${statusText}`;

  // 머리줄 도구 — 넓은 창은 왼쪽 칸 머리, 좁은 창은 요약 줄(NarrowBar)에 그린다(한 번에 한 곳)
  const headTools = (
    <>
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
          <ReportButton app="PortDock TCP" lang={lang} frames={() => framesRef.current} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} usageAsked={settings.usageAsked} onUsage={(on) => update({ usageStats: on, usageAsked: true })} />
          <AiCopyButton app="PortDock TCP" lang={lang} frames={() => framesRef.current} />
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
            PortDock <small>TCP</small>
          </span>
          <span className="brand-tools">
            <SideTools>{headTools}</SideTools>
          <SideClose lang={lang} onClose={() => setShowSide(false)} />
          </span>
        </div>

        {/* 방식은 탭(분할 버튼)으로 — 방식마다 주소·포트를 따로 기억한다(10/18, Hercules·sokit 처럼) */}
        <span className="label" data-tip={tip(lang, "mode")}>
          {t("mode")}
        </span>
        <div className="segs mode-tabs" role="tablist" aria-label={t("mode")}>
          {(["client", "server", "relay"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={cfg.mode === m} className={cfg.mode === m ? "seg on" : "seg"} disabled={running && cfg.mode !== m} title={running ? t("lockedHint") : t(m)} onClick={() => pickMode(m)}>
              {t(`tab_${m}` as Key)}
            </button>
          ))}
        </div>
        <label data-tip={tip(lang, listening ? "ifaces" : "host")}>
          {relay ? t("relayListen") : server ? t("bindHost") : t("host")}
          <div className="addr-row">
            <input value={cfg.host} disabled={running} list={listening ? "tcp-ifaces" : "tcp-recent-client"} onChange={(e) => setCfg({ ...cfg, host: e.target.value.trim() })} />
            <RecentButton lang={lang} recent={recMain} onPick={pickRecent} disabled={running} />
          </div>
          {listening ? <IfaceOptions id="tcp-ifaces" lang={lang} list={ifaces.list} /> : <RecentHosts id="tcp-recent-client" recent={recMain} />}
        </label>
        <label data-tip={tip(lang, "netPort")}>
          {t("port")}
          <NumInput min={0} max={65535} value={cfg.port} disabled={running} onValue={(n) => setCfg({ ...cfg, port: n })} />
        </label>
        {listening && !running && ifaceProblem(lang, cfg.host, ifaces.list) && <div className="interlock">{ifaceProblem(lang, cfg.host, ifaces.list)}</div>}
        {relay && (
          <>
            <label data-tip={tip(lang, "relayUpstream")}>{t("relayTo")}</label>
            <div className="grid2">
              <label data-tip={tip(lang, "relayUpstream")}>
                {t("host")}
                <div className="addr-row">
                  <input value={relayTo.host} disabled={running} list="tcp-recent-relay" onChange={(e) => setRelayTo({ ...relayTo, host: e.target.value.trim() })} />
                  <RecentButton
                    lang={lang}
                    recent={recRelay}
                    disabled={running}
                    onPick={(v) => {
                      const r = splitHostPort(v);
                      setRelayTo({ host: r.host, port: r.port ?? relayTo.port });
                    }}
                  />
                </div>
                <RecentHosts id="tcp-recent-relay" recent={recRelay} />
              </label>
              <label data-tip={tip(lang, "netPort")}>
                {t("port")}
                <NumInput min={0} max={65535} value={relayTo.port} disabled={running} onValue={(n) => setRelayTo({ ...relayTo, port: n })} />
              </label>
            </div>
            {!running && <div className="hint">{t("relayHint")}</div>}
          </>
        )}
        <details className="adv panel" open={advConnOpen} onToggle={(e) => setAdvConnOpen((e.target as HTMLDetailsElement).open)}>
          <summary data-tip={tip(lang, "tcpAdvConn")}>
            <span className="sum-title">{t("advConn")}</span>
            {!advConnOpen && <span className="sum-note">{advConnSummary}</span>}
          </summary>
          <label data-tip={tip(lang, "noDelay")} className="inline">
            <input type="checkbox" checked={cfg.noDelay} disabled={running} onChange={(e) => setCfg({ ...cfg, noDelay: e.target.checked })} /> {t("noDelay")}
          </label>
          {cfg.mode === "client" && (
            <label data-tip={tip(lang, "autoReconnect")} className="inline">
              <input type="checkbox" checked={cfg.autoReconnect} disabled={running} onChange={(e) => setCfg({ ...cfg, autoReconnect: e.target.checked })} />{" "}
              {t("autoReconnect")}
            </label>
          )}
          {cfg.mode === "client" && cfg.autoReconnect && (
            <label data-tip={tip(lang, "reconnectMs")}>
              {t("reconnectMs")}
              <NumInput min={200} max={3600000} value={cfg.reconnectMs} disabled={running} onValue={(n) => setCfg({ ...cfg, reconnectMs: n })} />
            </label>
          )}
        </details>
        <button data-tip={withKey(tip(lang, running ? (listening ? "stopListen" : "stopClient") : "run"), KEYS.connect)} className={running ? "btn danger" : "btn primary"} onClick={() => void (running ? stop() : start())} disabled={runDisabled}>
          {running ? stopLabel : listening ? t("listen") : t("connect")}
        </button>
        {running && <span className="lock-note">🔒 {t("lockedHint")}</span>}
        {/* (0.9.0) 중계 pcap — 시작 버튼 바로 밑(전엔 왼쪽 맨 아래라 굴려야 보였다). 실행 중엔 강조 */}
        {relay && (
          <button data-tip={tip(lang, pcapPath ? "pcapStop" : "pcapSave")} className={running && !pcapPath ? "btn pcap-btn pcap-ready" : "btn pcap-btn"} onClick={() => void togglePcap()} disabled={!running}>
            {pcapPath ? t("pcapStop") : t("pcapSave")}
          </button>
        )}
        {startErr && !running ? (
          <div className="status s-failed" role="alert">
            <b>{t(cfg.mode === "client" ? "connectFailed" : "startFailed")}</b> · {startErr}
          </div>
        ) : (
          <div className={`status s-${status === "listening" ? "connected" : status}`}>
            {t(`status_${status}` as Key)}
            {local && status === "listening" ? ` · ${local}` : statusMsg ? ` · ${statusMsg}` : ""}
          </div>
        )}
        {listening && <IfaceList lang={lang} list={ifaces.list} loaded={ifaces.loaded} refresh={ifaces.refresh} disabled={running} onPick={(ip) => setCfg({ ...cfg, host: ip })} />}
        {listening && !running && <div className="hint">{t("firewallHint")}</div>}
        {listening && cfg.port === 0 && <div className="interlock">{t("ilPort0")}</div>}
        {/* 접속 버튼이 꺼진 이유 */}
        {!running && !startable && <div className="interlock">{t(relay ? "ilRelayAddr" : "ilClientAddr")}</div>}

        {listening && running && (
          <>
            <label data-tip={tip(lang, "peers")}>{t(relay ? "pairs" : "peers")}</label>
            {peers.length === 0 && <div className="hint">{t("noPeers")}</div>}
            {peers.length > 1 && (
              <button className="btn small ghost kick-all" data-tip={tip(lang, "kickAll")} onClick={() => void Promise.all(peers.map((p) => api.kick(p.id))).catch((e) => setError(String(e)))}>
                {fill(t("kickAll"), { n: peers.length })}
              </button>
            )}
            {peers.map((p) => (
              <div key={p.id} className="peer">
                <span className="mono" title={p.addr}>
                  {p.addr}
                </span>
                <button data-tip={tip(lang, "kick")} className="btn small ghost" onClick={() => api.kick(p.id).catch((e) => setError(String(e)))}>
                  {t("kick")}
                </button>
              </div>
            ))}
          </>
        )}

        <hr />
        <details className="adv panel" open={rxOpen} onToggle={(e) => setRxOpen((e.target as HTMLDetailsElement).open)}>
          <summary data-tip={tip(lang, "tcpRx")}>
            <span className="sum-title">{t("rxSettings")}</span>
            {!rxOpen && <span className="sum-note">{rxSummary}</span>}
          </summary>
          <label data-tip={tip(lang, "framing")}>
            {t("framing")}
            <select
              value={framing.kind}
              onChange={(e) => {
                const k = e.target.value;
                setFraming(
                  k === "terminator"
                    ? { kind: "terminator", bytes: [], gapMs: 100 }
                    : k === "fixed"
                      ? { kind: "fixed", len: 8, gapMs: 100 }
                      : k === "modbus-tcp"
                        ? { kind: "modbus-tcp", gapMs: 1000 }
                        : { kind: "gap", gapMs: 20 },
                );
              }}
            >
              <option value="gap">{t("fmGap")}</option>
              <option value="terminator">{t("fmTerminator")}</option>
              <option value="fixed">{t("fmFixed")}</option>
              <option value="modbus-tcp">{t("fmModbusTcp")}</option>
            </select>
          </label>
          {framing.kind === "modbus-tcp" && <div className="hint">{t("fmMbapHint")}</div>}
          {framing.kind === "terminator" && (
            <label data-tip={tip(lang, "terminatorHex")}>
              {t("terminatorHex")}
              <input className={term.error ? "bad" : undefined} value={terminatorText} onChange={(e) => setTerminatorText(e.target.value)} placeholder="0D 0A" />
              {term.error ? (
                <span className="interlock">{term.error}</span>
              ) : term.bytes.length === 0 ? (
                <span className="interlock">{t("ilNoTerm")}</span>
              ) : (
                <span className="hint mono">{t("termParsed").replace("{a}", hex(term.bytes)).replace("{n}", String(term.bytes.length))}</span>
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
              }}
            />
          </label>
          {rxCheck && (rxCk?.skipHead || rxCk?.beforeEnd || rxCk?.swap || rxCheck === "crc") ? <div className="hint">{checksumDesc(rxCheck, rxCk, lang)}</div> : null}
          {server && (
            <label data-tip={tip(lang, "echo")} className="inline">
              <input type="checkbox" checked={cfg.echo} onChange={(e) => setCfg({ ...cfg, echo: e.target.checked })} /> {t("echo")}
            </label>
          )}
        </details>
        <button data-tip={withKey(tip(lang, logPath ? "stopLog" : "logToFile"), KEYS.fileLog)} className="btn" onClick={toggleLog} disabled={!running}>
          {logPath ? t("stopLog") : t("logToFile")}
        </button>
      </aside>

      <main className="main">
        <NarrowBar tools={headTools} lang={lang} open={showSide} onToggle={() => setShowSide(!showSide)} dot={startErr && !running ? "s-disconnected" : `s-${status === "listening" ? "connected" : status}`} summary={summaryLine}>
          <button className={running ? "btn small danger" : "btn small primary"} onClick={() => void (running ? stop() : start())} disabled={runDisabled} data-tip={withKey(tip(lang, running ? (listening ? "stopListen" : "stopClient") : "run"), KEYS.connect)}>
            {running ? stopLabel : listening ? t("listen") : t("connect")}
          </button>
        </NarrowBar>
        <div className="toolbar">
          <span data-tip={tip(lang, "view")}>{t("view")}</span>
          {(["hex", "ascii", "both"] as ViewMode[]).map((v) => (
            <button key={v} className={view === v ? "seg on" : "seg"} onClick={() => setView(v)} aria-pressed={view === v}>
              {v === "both" ? t("both") : v.toUpperCase()}
            </button>
          ))}
          <label data-tip={withKey(ui(lang, "autoscrollTip"), KEYS.end)} className="inline">
            <input type="checkbox" checked={follow.following} onChange={(e) => (e.target.checked ? follow.resume() : follow.pause())} /> {t("autoscroll")}
          </label>
          <ViewOptions lang={lang} delta={deltaMode} onDelta={setDeltaMode} />
          <span className="grow" />
          <span className="counter">
            RX {counters.current.rx.toLocaleString()} · TX {counters.current.tx.toLocaleString()} {t("bytes")}
          </span>
          <FailCount lang={lang} n={counters.current.fail} filter={filter} />
          <button data-tip={withKey(tip(lang, "saveView"), KEYS.save)} className="btn small" onClick={saveView}>
            {t("saveView")}
          </button>
          <button data-tip={withKey(tip(lang, "clear"), KEYS.clear)} className="btn small" onClick={clearLog}>
            {t("clear")}
          </button>
          <button data-tip={tip(lang, "commandsDetail")} className="btn small narrow-only" onClick={() => setShowRight(!showRight)} aria-expanded={showRight} aria-label={t("commandsDetail")}>
            ☰<span className="nb-text"> {t("commandsDetail")}</span>
          </button>
        </div>

        <div className="statusbar">
          <span className={`dot s-${status === "listening" ? "connected" : status}`} />
          <span className="mono">{statusText}</span>
          {logPath && <span className="rec">● REC</span>}
          {pcapPath && (
            <span className="rec pcap-rec" title={pcapPath}>
              ● PCAP
            </span>
          )}
          {pairStatsLine && (
            <span className="pair-stats mono" data-tip={tip(lang, "pairStats")}>
              {pairStatsLine}
            </span>
          )}
          <span className="grow" />
          <LiveStats meter={meter.current} lang={lang} active={running} />
        </div>

        <LogFilterBar lang={lang} filter={filter} selected={selected} total={frames.length} onJump={jumpTo} />

        <div className="log-wrap">
          <div className="log" ref={listRef} tabIndex={0} onKeyDown={onLogKey} aria-label={t("view")}>
            {frames.length === 0 &&
              (firstDone ? (
                <div className="empty-guide">{t("emptyGuide")}</div>
              ) : (
                <FirstCard lang={lang} title={t("firstTitle")} onHide={() => setFirstDone(true)} links={[{ id: "start", label: t("firstTitle") }]} onHelp={setShowHelp}>
                  <div>{t("firstAsk")}</div>
                  <div className="first-picks">
                    {(["client", "server", "relay"] as const).map((m) => (
                      <button key={m} type="button" className={cfg.mode === m ? "btn small primary" : "btn small"} aria-pressed={cfg.mode === m} disabled={running} onClick={() => pickMode(m)}>
                        {t(m === "client" ? "firstClient" : m === "server" ? "firstServer" : "firstRelay")}
                      </button>
                    ))}
                  </div>
                  <div>{t("first2")}</div>
                  <div>{t("first3")}</div>
                </FirstCard>
              ))}
            <div style={{ height: rows.getTotalSize(), position: "relative" }}>
              {rows.getVirtualItems().map((r) => {
                const f = filter.at(r.index);
                if (!f || f.seq == null) return null;
                const seq = f.seq;
                const cls = `row ${f.dir}${filter.isHit(seq) ? " hit" : ""}${sel.has(seq) ? " sel" : ""}${selected === seq ? " primary" : ""}${f.mark ? " marked" : ""}`;
                const style = f.mark ? ({ transform: `translateY(${r.start}px)`, "--mark": f.mark } as CSSProperties) : { transform: `translateY(${r.start}px)` };
                const dt = deltaMode !== "off" && <span className="dt">{deltaText(deltaMode, f)}</span>;
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
                    <span className="dir" data-tip={relay ? tip(lang, "relayDir") : undefined}>
                      {dirLabel(f.dir)}
                    </span>
                    {listening && <span className="peeraddr">{f.peer}</span>}
                    {relay && f.pair && <PairCell p={f.pair} missed={!!f.missed} lang={lang} />}
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
              peers: true,
              col,
              onCopied,
              sendAgain: { run: (b) => void doSend(rawSpec(b)), enabled: !cmdWhy, why: cmdWhy },
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
            {relay && (
              <select className="target-sel" value={side} onChange={(e) => setSide(e.target.value as "a" | "b")} data-tip={tip(lang, "relaySide")} aria-label={tip(lang, "relaySide")}>
                <option value="a">{t("sideA")}</option>
                <option value="b">{t("sideB")}</option>
              </select>
            )}
            {listening && (
              <select
                className={targetGone ? "target-sel bad" : "target-sel"}
                value={target ? String(target.id) : ""}
                onChange={(e) => setTarget(peers.find((p) => String(p.id) === e.target.value) ?? null)}
                data-tip={tip(lang, "target")}
              >
                <option value="">{t("all")}</option>
                {/* 끊긴 상대도 그대로 보여 준다 — 다른 걸 고를 때까지 보내기는 막힌다 */}
                {targetGone && target && (
                  <option value={String(target.id)}>
                    {t("targetGone")} {target.addr}
                  </option>
                )}
                {peers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.addr}
                  </option>
                ))}
              </select>
            )}
            {/* 바꾸면 같은 바이트의 새 표기로 옮기고, 켜진 체크섬은 아래 알림줄로 */}
            <select value={spec.mode} onChange={(e) => modeSwitch.changeMode(e.target.value as TextMode)} data-tip={ui(lang, "sendModeTip")} aria-label="HEX / ASCII">
              <option value="hex">HEX</option>
              <option value="ascii">ASCII</option>
            </select>
            <input
              ref={sendInput}
              className="sendtext"
              value={spec.text}
              placeholder={spec.mode === "hex" ? "01 03 00 00 00 0A" : "STATUS?"}
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
            <ChecksumPicker lang={lang} kind={spec.checksum} ck={spec.ck} noneLabel={`${t("checksum")}: ${t("none")}`} tipKey="checksum" ariaLabel={t("checksum")} onChange={(k, c) => setSpec({ ...spec, checksum: k, ck: c })} />
            <select value={spec.suffix} onChange={(e) => setSpec({ ...spec, suffix: e.target.value })} data-tip={tip(lang, "suffix")}>
              <option value="">
                {t("suffix")}: {t("none")}
              </option>
              <option value="\r">{t("suffix")}: CR</option>
              <option value="\n">{t("suffix")}: LF</option>
              <option value="\r\n">{t("suffix")}: CR LF</option>
            </select>
            <button data-tip={tip(lang, "send")} className="btn primary" onClick={() => {
                sendNow();
                sendInput.current?.focus();
              }} disabled={!canSend}>
              {t("send")}
            </button>
          </div>
          <div className="sendrow sub">
            {!running ? (
              <span className="why">{t("whyNotStarted")}</span>
            ) : peers.length === 0 ? (
              <span className="why">{t(relay ? "whyNoPairs" : "whyNoPeers")}</span>
            ) : targetGone ? (
              <span className="why">{t("whyTargetGone")}</span>
            ) : !sendable && !previewErr ? (
              <span className="why">{t("whyEmpty")}</span>
            ) : null}
            <span className={previewErr ? "preview err" : "preview"}>
              {t("willSend")}: {previewErr ?? (previewBytes ? `${hex(previewBytes)} (${previewBytes.length})` : "")}
            </span>
            <span className="grow" />
            <label data-tip={withKey(tip(lang, "repeat"), KEYS.stopRepeat)} className="inline">
              <input type="checkbox" checked={repeating} disabled={!canSend && !repeating} onChange={(e) => startRepeat(e.target.checked)} /> {t("repeat")}
            </label>
            <NumInput className="num" min={10} max={3600000} value={repeatMs} onValue={setRepeatMs} aria-label={t("repeat")} />
            {timesInRow && repeatTimesBox}
            {(repeating || repeatSent > 0) && (
              <span className="rep-count">{repeatTimes > 0 ? io(lang, "repeatSentOf", { n: repeatSent, m: repeatTimes }) : io(lang, "repeatSent", { n: repeatSent })}</span>
            )}
            <button className="btn small add-cmd" onClick={() => pushCommand({ ...spec, name: spec.text.slice(0, 24) || "cmd", key: null })} disabled={!sendable}>
              + {t("addCommand")}
            </button>
            <span className="send-tools">
            {framing.kind === "modbus-tcp" && (
              <label className="inline" data-tip={tip(lang, "mbapTid")}>
                <input type="checkbox" checked={mbapTid} onChange={(e) => setMbapTid(e.target.checked)} /> {t("mbapTid")}
              </label>
            )}
            <button className="btn small mb-open" data-tip={tip(lang, "modbusBuildTcp")} onClick={() => setShowMb(true)}>
              {t("mbRequest")}
            </button>
            </span>
            {/* 문자 간 지연·파일 보내기·(반복이 꺼져 있으면) 횟수는 «⋯ 더보기» 로(10/18, Serial 과 같게) */}
            <button
              ref={moreBtn}
              className={charDelay > 0 ? "btn small more-btn on" : "btn small more-btn"}
              onClick={() => setMoreOpen((o) => (o ? null : { times: !timesInRow }))}
              aria-expanded={!!moreOpen}
              data-tip={tip(lang, "sendMoreNet")}
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
              {moreOpen.times && <div className="pop-row">{repeatTimesBox}</div>}
            </Popover>
          )}
          {fileJob && <JobBar lang={lang} job={fileJob} onCancel={cancelSend} onOpen={() => setShowFile(true)} />}
          {mb502 && (
            <div className="notice mb502" role="status">
              <span>{t("mb502")}</span>
              <button type="button" className="btn small" onClick={acceptMb502}>
                {t("mb502Yes")}
              </button>
              {cfg.mode === "client" && cfg.host.trim() && (
                <button
                  type="button"
                  className="btn small open-master"
                  data-tip={t("openMasterTip")}
                  onClick={() => {
                    count("open_in_master");
                    const a = joinHostPort(cfg.host.trim(), cfg.port);
                    void openInApp({ app: "modbus-master", tcp: a }, a, lang, toast);
                  }}
                >
                  {t("openMaster")}
                </button>
              )}
              <button type="button" className="btn small ghost" onClick={() => setMb502(false)} aria-label={ui(lang, "closeNote")} title={ui(lang, "closeNote")}>
                ✕
              </button>
            </div>
          )}
          {modeSwitch.node}
          {targetBack && (
            <div className="interlock">
              {t("targetBack").replace("{a}", targetBack.addr)}{" "}
              <button className="btn small" onClick={() => setTarget(targetBack)}>
                {t("useTarget")}
              </button>
            </div>
          )}
          {sendNote && <div className="interlock">{sendNote}</div>}
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
          app="PortDock TCP"
          title={t("commands")}
          commands={commands}
          setCommands={setCommands}
          onSend={(c) => void doSend(c)}
          canSend={!cmdWhy}
          sendWhy={cmdWhy}
          onEdit={(c) => {
            setSpec({ text: c.text, mode: c.mode, checksum: c.checksum, suffix: c.suffix, ck: c.ck ?? null });
            sendInput.current?.focus();
          }}
          toast={toast}
          writeText={api.writeText}
          readText={api.readText}
          handle={cmdList}
          examples={tcpExamples(framing.kind === "modbus-tcp", lang) as Command[]}
        />
        <TriggerPanel lang={lang} trg={trg} toast={toast} expandAll={settings.expandAll} />
        <AutoReplySection lang={lang} toast={toast} expandAll={settings.expandAll} inactiveNote={relay ? arRelayNote(lang) : null} />
        <div className="detail-head">
          <h3 ref={detailHead} data-tip={tip(lang, framing.kind === "modbus-tcp" ? "detailMbap" : "detail")}>
            {t("detail")}
          </h3>
          {selFrame && <CopyButton lang={lang} getText={() => detailBox.current?.innerText ?? ""} />}
        </div>
        {!selFrame && <div className="hint">{t("selectFrame")}</div>}
        {selFrame && (
          <div className="detail" ref={detailBox}>
            <div>
              {selFrame.dir.toUpperCase()} · {fmt(selFrame.ts)}
              {selFrame.peer ? ` · ${selFrame.peer}` : ""}
              {relay && selFrame.dir !== "ev" ? ` · ${dirLabel(selFrame.dir)}` : ""}
              {selFrame.dir !== "ev" && ` · ${selFrame.bytes.length} ${t("bytes")}`}
            </div>
            {selFrame.pair && (
              <div className="pair-detail">
                {t("pairCol")}: {pairCell(selFrame.pair, lang, !!selFrame.missed).text}
              </div>
            )}
            {selFrame.dir === "ev" ? (
              <pre className="dump">{selFrame.note}</pre>
            ) : (
              <>
                <pre className="dump">{hex(selFrame.bytes)}</pre>
                <pre className="dump">{ascii(selFrame.bytes)}</pre>
              </>
            )}
            {mbap && selFrame.dir !== "ev" && <MbapDetail lang={lang} info={mbap} />}
            {paired && <MbValues lang={lang} paired={paired} notation={mbNotation} />}
          </div>
        )}
      </aside>
      {showMb && (
        <ModbusBuilder
          lang={lang}
          wire="tcp"
          onPut={(b) => {
            setSpec(mbSpec(b));
            setShowMb(false);
            sendInput.current?.focus();
          }}
          onAdd={(name, b) => pushCommand({ ...mbSpec(b), name, key: null })}
          onClose={() => setShowMb(false)}
          onHelp={() => {
            setShowMb(false);
            setShowHelp("modbus");
          }}
        />
      )}
      {showHelp && <HelpDialog doc={help} lang={lang} app="PortDock TCP" start={typeof showHelp === "string" ? showHelp : null} onClose={() => setShowHelp(false)} />}
      {showSettings && (
        <SettingsDialog
          app="PortDock TCP"
          version={VERSION}
          settings={settings}
          update={update}
          reset={reset}
          onClose={() => setShowSettings(false)}
          writeText={api.writeText}
          readText={api.readText}
          busy={running || !!logPath}
          ioOptions
          conn
          run
        />
      )}
      {showFile && (
        <FileSendDialog
          lang={lang}
          job={fileJob}
          canSend={!cmdWhy}
          why={cmdWhy}
          byteMs={0}
          target={target ? target.addr : peers.length > 1 ? t("all") : peers[0]?.addr}
          start={startFile}
          cancel={cancelSend}
          sizeOf={api.fileSize}
          onClose={() => setShowFile(false)}
        />
      )}
      {toast.node}
    </div>
  );
}
