import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { ask, open as openDialog, save } from "@tauri-apps/plugin-dialog";
import { load, parseTerminator, store, samePorts } from "@shared/framing";
import {
  api,
  ascii,
  CHECKSUMS,
  hex,
  type ChecksumKind,
  type Frame,
  type FrameMode,
  type PortInfo,
  type SendSpec,
  type SessionEvent,
  type TextMode,
  type Transport,
} from "./api";
import { tip } from "@shared/tips";
import { ReportButton } from "@shared/ReportDialog";
import { noteError } from "@shared/report";
import { HelpDialog, useHelpKey } from "@shared/HelpDialog";
import { help } from "./help";
import { autoLogPath, formatTime, useFold, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { AutoReplyPanel } from "@shared/AutoReplyPanel";
import { normalizeRule, ruleFromRequest, validRule, type AutoRule, type MatchOptions } from "@shared/autoReply";
import { matchesEverything, repeatInterval } from "@shared/interlocks";
import { autoReplyApi } from "@shared/autoReplyApi";
import { useSimpleLog } from "@shared/useSimpleLog";
import { FollowButton } from "@shared/FollowButton";
import { copyTextOf, selectedFrames, useCopyKey } from "@shared/logCopy";
import { LogMenu, logMenuItems, type MenuAt } from "@shared/LogMenu";
import { useToast } from "@shared/Toast";
import { KEYS, useShortcuts, withKey } from "@shared/shortcuts";
import { useWindowTitle, windowTitle } from "@shared/useWindowTitle";
import { PinButton } from "@shared/PinButton";
import { NarrowBar, SideBackdrop, SideClose } from "@shared/NarrowBar";
import { useModeSwitch } from "@shared/SendMode";
import { ui } from "@shared/uiText";
import { dict, type Key, type Lang } from "./i18n";
import "./App.css";

const BAUDS = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

interface Net {
  host: string;
  port: number;
  remoteHost: string;
  remotePort: number;
  /** UDP 에서만 — 예전 저장값엔 없을 수 있다 */
  broadcast?: boolean;
}

type Com = { port: string; baud: number; parity: "none" | "odd" | "even" };

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));

/** 상대가 아직 없어서 못 보낸 경우 — 반복은 끄지 않고 이번 차례만 건너뛴다 */
const NO_PEER = /연결된 상대가 없|상대가 없|끊겨 있|No peer|not connected|disconnected/i;

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

  // ---- 연결 방식과 설정
  const [transport, setTransport] = useState<Transport>(() => load("transport", "serial"));
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [com, setCom] = useState<Com>(() => load("com", { port: "", baud: 9600, parity: "none" }));
  const [net, setNet] = useState<Net>(() => load("net", { host: "0.0.0.0", port: 5000, remoteHost: "192.168.0.10", remotePort: 5000 }));
  const [framing, setFraming] = useState<FrameMode>(() => load("framing", { kind: "gap", gapMs: 20 }));
  // 새로 설치했을 때 기본 끝 문자는 LF(0A) — 저장값이 있으면 그대로 쓴다
  const [termText, setTermText] = useState(() => load("termText", "0A"));
  // 규칙 비교 옵션 — 끝 문자 떼고 비교 · 안 맞은 요청 기록
  const [matchOpts, setMatchOpts] = useState<MatchOptions>(() => ({ stripTerminator: true, logNoMatch: true, ...load<Partial<MatchOptions>>("matchOpts", {}) }));
  useEffect(() => {
    store("transport", transport);
  }, [transport]);
  useEffect(() => {
    store("com", com);
  }, [com]);
  useEffect(() => {
    store("net", net);
  }, [net]);
  useEffect(() => {
    store("framing", framing);
  }, [framing]);
  useEffect(() => {
    store("termText", termText);
  }, [termText]);
  useEffect(() => {
    store("matchOpts", matchOpts);
  }, [matchOpts]);
  useEffect(() => {
    if (transport !== "serial") return;
    let alive = true;
    const tick = () => api.listPorts().then((p) => alive && setPorts((o) => samePorts(o, p))).catch(() => {});
    tick();
    const id = setInterval(tick, 1500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [transport]);
  // 끝 문자 칸 해석 — 틀리면 bytes 가 비고 error 에 이유(화면에 빨갛게)
  const term = parseTerminator(termText, lang);
  const effFraming: FrameMode = framing.kind === "terminator" ? { ...framing, bytes: term.bytes } : framing;

  // ---- 실행
  const [running, setRunning] = useState(false);
  // 저장된 포트가 목록에 없으면(다른 PC·USB 뺌) 화면에 보이는 첫 포트로 맞춘다 — 보이는 것과 다른 포트를 열지 않게. 실행 중엔 그대로
  useEffect(() => {
    if (running || !ports.length || ports.some((p) => p.name === com.port)) return;
    setCom((c) => ({ ...c, port: ports[0].name }));
  }, [ports, com.port, running]);
  const [status, setStatus] = useState("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 화면에 보인 오류는 «문제 보고» 에 넣을 수 있게 모아 둔다
  useEffect(() => {
    if (error) noteError(error);
  }, [error]);
  const [logPath, setLogPath] = useState<string | null>(null);
  const traffic = useRef<Frame[]>([]);
  // 줄마다 일련번호 — 줄 고르기·따라가기(멈춘 뒤 새 줄 수)에 쓴다
  const seqRef = useRef(0);
  const timeBase = useRef<number | null>(null);
  const [tick, setTick] = useState(0);
  const [trafficView, setTrafficView] = useState<"hex" | "ascii">(() => load("trafficView", "hex"));
  useEffect(() => {
    store("trafficView", trafficView);
  }, [trafficView]);
  const onEvent = useCallback((e: SessionEvent) => {
    if (e.type === "frames") {
      for (const f of e.frames) f.seq = ++seqRef.current;
      traffic.current.push(...e.frames);
      if (traffic.current.length > maxLines.current) traffic.current.splice(0, traffic.current.length - maxLines.current);
      setTick((x) => x + 1);
    } else if (e.type === "status") {
      setStatus(e.state);
      // 백엔드가 준 설명(재접속 대기·멈춤의 마지막 실패 이유 등)을 먼저 보인다
      setStatusMsg(e.message || e.port || null);
      if (e.state === "closed") {
        setRunning(false);
        // 세션이 닫히면 «멈춤» 과 같다 — 다시 시작해도 반복이 저절로 돌지 않게
        setRepeating(false);
      }
    } else if (e.type === "error") {
      setError(e.message);
    }
  }, []);
  // 통신 기록 — 맨 아래에 있을 때만 새 줄을 따라간다(위로 굴리면 멈추고 «↓ 맨 아래로»). 마지막 500줄만 그린다
  const tlog = useRef<HTMLDivElement>(null);
  const log = useSimpleLog(traffic, seqRef, tlog, settings.autoScroll, `${tick}:${trafficView}`, 500);
  const [menu, setMenu] = useState<MenuAt>(null);
  function clearTraffic() {
    traffic.current = [];
    log.sel.clear();
    setMenu(null);
    log.follow.resume();
    setTick((x) => x + 1);
  }
  useEffect(() => {
    if (running && transport !== "udp") api.setFraming(effFraming).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, JSON.stringify(effFraming)]);
  // 비교 옵션 — 바꿀 때와 시작한 뒤에 백엔드에 알린다
  useEffect(() => {
    api.setMatchOptions(matchOpts).catch((e) => running && setError(String(e)));
  }, [running, matchOpts]);

  const [starting, setStarting] = useState(false);
  async function start() {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      if (transport === "serial") {
        await api.startSerial(
          { port: com.port, baud: com.baud, dataBits: 8, parity: com.parity, stopBits: 1, flow: "none", dtr: false, rts: false, autoReconnect: true },
          effFraming,
          onEvent,
        );
        setStatus("connected");
      } else if (transport === "udp") {
        const local = await api.startUdp(
          { bindHost: net.host, bindPort: net.port, remoteHost: net.remoteHost, remotePort: net.remotePort, broadcast: !!net.broadcast, multicastGroup: "", multicastIf: "0.0.0.0", echo: false },
          onEvent,
        );
        setStatusMsg(local);
      } else {
        const server = transport === "tcp-server";
        await api.startTcp(
          { mode: server ? "server" : "client", host: server ? net.host : net.remoteHost, port: server ? net.port : net.remotePort, noDelay: true, autoReconnect: true, reconnectMs: 2000, echo: false },
          effFraming,
          onEvent,
        );
      }
      setRunning(true);
      if (settings.autoLog && settings.logFolder) {
        const p = autoLogPath(settings.logFolder, "simulator");
        await api.setLog(p).then(() => setLogPath(p)).catch((e) => setError(String(e)));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setStarting(false);
    }
  }
  async function stop() {
    await api.stop();
    setRunning(false);
    setRepeating(false);
    setStatus("closed");
    setLogPath(null);
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
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const path = await save({ defaultPath: `portdock-sim-${stamp}.log`, filters: [{ name: "Log", extensions: ["log", "txt"] }] });
    if (!path) return;
    await api.setLog(path).then(() => setLogPath(path)).catch((e) => setError(String(e)));
  }

  // ---- 규칙
  const [rules, setRules] = useState<AutoRule[]>(() => {
    const saved = load<unknown[]>("rules", []);
    return Array.isArray(saved) ? saved.filter(validRule).map(normalizeRule) : [];
  });
  const [hits, setHits] = useState<Record<string, number>>({});
  useEffect(() => {
    store("rules", rules);
  }, [rules]);
  useEffect(() => {
    const id = setInterval(() => api.getHits().then(setHits).catch(() => {}), 500);
    return () => clearInterval(id);
  }, []);
  /**
   * 통신 기록 줄 → 새 규칙(오른쪽 버튼 «이 요청으로 규칙 만들기»). 무엇이든 맞는 규칙(에코 등)이 있으면 그 위에 넣어
   * 새 규칙이 가려지지 않게 하고, 응답 칸에 포커스
   */
  const ruleFromLog = (b: number[]) => {
    const catchAll = rules.findIndex((r) => r.enabled && matchesEverything(r));
    const at = catchAll < 0 ? rules.length : catchAll;
    const r = ruleFromRequest(b, rules.length + 1);
    setRules([...rules.slice(0, at), r, ...rules.slice(at)]);
    toast.show(fill(t("ruleMade"), { a: r.name }));
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement>(`.arcard[data-i="${at}"] .arreply`);
      el?.scrollIntoView({ block: "nearest" });
      el?.focus();
    });
  };
  /** 규칙으로 만들 바이트 — RX 줄은 그 바이트, «NO MATCH» 사건 줄은 바로 앞(20줄 안)의 RX */
  const ruleBytesOf = (seq: number): number[] | null => {
    const list = traffic.current;
    const i = list.findIndex((f) => f.seq === seq);
    const f = list[i];
    if (!f) return null;
    if (f.dir === "rx") return f.bytes;
    if (f.dir === "ev" && /^NO MATCH/.test(f.note ?? ""))
      for (let j = i - 1; j >= 0 && j >= i - 20; j--) if (list[j].dir === "rx" && (!f.peer || list[j].peer === f.peer)) return list[j].bytes;
    return null;
  };
  async function exportRules() {
    const path = await save({ defaultPath: "portdock-rules.json", filters: [{ name: "JSON", extensions: ["json"] }] });
    if (!path) return;
    // 프로필: 연결 방식·연결 칸·프레임 구분·비교 옵션·규칙·«장비가 먼저 보내기» 까지
    const body = { app: "PortDock Simulator", version: 2, transport, com, net, framing: effFraming, termText, matchOptions: matchOpts, rules, unsolicited: { spec, repeatMs } };
    await api.writeText(path, JSON.stringify(body, null, 2)).catch((e) => setError(String(e)));
  }
  async function importRules() {
    const path = await openDialog({ filters: [{ name: "JSON", extensions: ["json"] }] });
    if (!path || Array.isArray(path)) return;
    try {
      // 예전 파일(규칙·프레임 구분만)도 읽는다 — 없는 칸은 지금 값 그대로
      const body = JSON.parse(await api.readText(path)) as {
        rules?: unknown[];
        framing?: FrameMode;
        transport?: Transport;
        com?: Partial<Com>;
        net?: Partial<Net>;
        termText?: string;
        matchOptions?: Partial<MatchOptions>;
        unsolicited?: { spec?: Partial<SendSpec>; repeatMs?: number };
      };
      if (!Array.isArray(body.rules)) throw new Error(t("badRules"));
      if (!body.rules.every(validRule)) throw new Error(t("badRules"));
      // 지금 규칙·설정을 덮어쓰기 전에 묻는다
      const name = path.split(/[\\/]/).pop() ?? path;
      if (!(await ask(t("askImport").replace("{n}", String(rules.length)).replace("{a}", name), { title: "PortDock Simulator", kind: "warning" }))) return;
      setRules(body.rules.map(normalizeRule));
      if (body.framing && (body.framing.kind === "gap" || body.framing.kind === "terminator") && Number.isInteger(body.framing.gapMs)) {
        setFraming(body.framing);
        if (body.framing.kind === "terminator") setTermText(typeof body.termText === "string" ? body.termText : hex(body.framing.bytes));
      }
      const mo = body.matchOptions;
      if (mo) setMatchOpts((o) => ({ stripTerminator: typeof mo.stripTerminator === "boolean" ? mo.stripTerminator : o.stripTerminator, logNoMatch: typeof mo.logNoMatch === "boolean" ? mo.logNoMatch : o.logNoMatch }));
      const u = body.unsolicited;
      if (u?.spec && typeof u.spec.text === "string" && (u.spec.mode === "hex" || u.spec.mode === "ascii"))
        setSpec({ text: u.spec.text, mode: u.spec.mode, checksum: u.spec.checksum ?? null, suffix: typeof u.spec.suffix === "string" ? u.spec.suffix : "" });
      if (u && Number.isInteger(u.repeatMs) && (u.repeatMs as number) >= 10) setRepeatMs(u.repeatMs as number);
      // 연결 설정은 멈춰 있을 때만 바꾼다(실행 중엔 잠겨 있다)
      const hasConn = !!body.transport || !!body.com || !!body.net;
      if (hasConn && running) {
        setError(t("importedRunning"));
      } else {
        if (body.transport && ["serial", "tcp-server", "tcp-client", "udp"].includes(body.transport)) setTransport(body.transport);
        const c = body.com;
        if (c)
          setCom((o) => ({
            port: typeof c.port === "string" ? c.port : o.port,
            baud: Number.isInteger(c.baud) ? (c.baud as number) : o.baud,
            parity: c.parity === "none" || c.parity === "odd" || c.parity === "even" ? c.parity : o.parity,
          }));
        const n = body.net;
        if (n)
          setNet((o) => ({
            host: typeof n.host === "string" ? n.host : o.host,
            port: Number.isInteger(n.port) ? (n.port as number) : o.port,
            remoteHost: typeof n.remoteHost === "string" ? n.remoteHost : o.remoteHost,
            remotePort: Number.isInteger(n.remotePort) ? (n.remotePort as number) : o.remotePort,
            broadcast: typeof n.broadcast === "boolean" ? n.broadcast : o.broadcast,
          }));
      }
    } catch (e) {
      setError(String(e));
    }
  }

  // ---- 장비가 먼저 보내기
  const [spec, setSpec] = useState<SendSpec>(() => load("spec", { text: "", mode: "ascii", checksum: null, suffix: "\\r\\n" }));
  const [preview, setPreview] = useState<string>("");
  // 보낼 바이트가 있는지 — 없으면 보내기를 끄고 이유를 보인다
  const [sendable, setSendable] = useState(false);
  const sendInput = useRef<HTMLInputElement>(null);
  const [repeatMs, setRepeatMs] = useState(1000);
  const [repeating, setRepeating] = useState(false);
  // 반복 중 상대가 없어 건너뛰는 중인지
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    store("spec", spec);
    let stale = false;
    api
      .preview(spec)
      .then((b) => {
        if (stale) return;
        setPreview(b.length ? `${t("willSend")}: ${hex(b)} (${b.length})` : "");
        setSendable(b.length > 0);
      })
      .catch((e) => {
        if (stale) return;
        setPreview(String(e));
        setSendable(false);
      });
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 언어가 바뀌면 문구만 다시
  }, [spec, lang]);
  // «장비가 먼저 보내기» 접기 — 규칙 칸으로 오해하지 않게 기본 접힘. 반복을 켜면 펼치고, 열림 상태는 기억
  const [unsolOpenSaved, setUnsolOpenSaved] = useState<boolean>(() => load("unsolOpen", false));
  useEffect(() => store("unsolOpen", unsolOpenSaved), [unsolOpenSaved]);
  const [unsolOpen, setUnsolOpen] = useFold(unsolOpenSaved, setUnsolOpenSaved, settings.expandAll);
  useEffect(() => {
    if (repeating) setUnsolOpen(true);
  }, [repeating]);
  const inflight = useRef(false);
  useEffect(() => {
    if (!repeating || !running) return;
    const id = setInterval(async () => {
      if (inflight.current) return;
      inflight.current = true;
      try {
        await api.send(spec);
        setWaiting(false);
      } catch (e) {
        // 상대가 없으면 이번 차례만 건너뛴다 — 반복은 사용자가 끄거나 «멈춤» 때만 꺼진다
        if (NO_PEER.test(String(e))) setWaiting(true);
        else setError(String(e));
      } finally {
        inflight.current = false;
      }
    }, repeatInterval(repeatMs));
    return () => {
      clearInterval(id);
      setWaiting(false);
    };
  }, [repeating, repeatMs, spec, running]);

  const net2 = transport !== "serial";
  // HEX ↔ ASCII 를 바꾸면 같은 바이트의 새 표기로, 켜진 체크섬은 알림줄로
  const modeSwitch = useModeSwitch(spec, setSpec, lang);

  // «지난 시간» 기준 — 오래된 줄이 화면에서 잘려도 바뀌지 않게 첫 기록 시각을 잡아 두고, 지우면 다시 잡는다
  if (!traffic.current.length) timeBase.current = null;
  else if (timeBase.current === null) timeBase.current = traffic.current[0].ts;
  const fmt = (ts: number) => formatTime(ts, settings.timeFormat, timeBase.current ?? ts);
  useExitGuard(running || !!logPath, settings.confirmExit, lang, "PortDock Simulator");

  // ---- 단축키: F4 시작·멈춤, Ctrl+L 통신 기록 지우기, Ctrl+Shift+L 파일 기록, Esc 반복 멈춤
  const runDisabled = (!running && transport === "serial" && !ports.some((p) => p.name === com.port)) || starting;
  useShortcuts([
    { key: "F4", run: () => !runDisabled && void (running ? stop() : start()) },
    { key: "l", ctrl: true, run: clearTraffic },
    { key: "l", ctrl: true, shift: true, run: () => running && void toggleLog() },
    { key: "Escape", inInput: false, run: () => repeating && setRepeating(false) },
  ]);
  // Ctrl+C — 고른 통신 기록 줄을 «시각 방향 [상대] 내용»(지금 보기대로)으로
  const onCopied = (ok: boolean, n: number) => toast.show(ok ? ui(lang, "copied", { n }) : ui(lang, "copyFail"), { error: !ok });
  useCopyKey(
    () => {
      const list = selectedFrames(log.sel, log.frameOf);
      return list.length ? copyTextOf(list, "lines", trafficView, fmt, net2) : null;
    },
    (ok) => onCopied(ok, log.sel.set.size),
  );
  /** 로그 줄의 바이트 그대로(HEX·체크섬·줄 끝 없음) */
  const rawSpec = (bytes: number[]): SendSpec => ({ text: hex(bytes), mode: "hex", checksum: null, suffix: "" });

  // ---- 창 제목: «TCP 서버 :502 · 규칙 3 — PortDock Simulator»
  const where =
    transport === "serial"
      ? `${t("titleSerial")} ${com.port} ${com.baud}`
      : transport === "tcp-server"
        ? `${t("titleTcpServer")} :${net.port}`
        : transport === "tcp-client"
          ? `${t("titleTcpClient")} ${net.remoteHost}:${net.remotePort}`
          : `UDP :${net.port}`;
  const ruleCount = t("titleRules").replace("{n}", String(rules.filter((r) => r.enabled).length));
  const statusText = dict[lang][`status_${status}` as Key] ?? status;
  useWindowTitle(windowTitle("PortDock Simulator", running ? [where, ruleCount] : [], !!logPath));
  const summaryLine = `${where} · ${statusText} · ${ruleCount}`;

  return (
    <div className={showSide ? "app sim show-side" : "app sim"}>
      <SideBackdrop open={showSide} onClose={() => setShowSide(false)} />
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>Simulator</small>
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
          <ReportButton app="PortDock Simulator" lang={lang} frames={() => traffic.current} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} />
          <button className="icon-btn" onClick={openHelp} title={t("helpTip")} aria-label={t("helpTip")}>
            ?
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title={ui(lang, "settings")} aria-label={ui(lang, "settings")}>
            ⚙
          </button>
          <SideClose lang={lang} onClose={() => setShowSide(false)} />
          </span>
        </div>
        <label data-tip={tip(lang, "transport")}>
          {t("transport")}
          <select value={transport} disabled={running} onChange={(e) => setTransport(e.target.value as Transport)}>
            <option value="serial">{t("serial")}</option>
            <option value="tcp-server">{t("tcpServer")}</option>
            <option value="tcp-client">{t("tcpClient")}</option>
            <option value="udp">{t("udp")}</option>
          </select>
        </label>

        {transport === "serial" && (
          <>
            <label data-tip={tip(lang, "ports")}>
              {t("port")}
              <select value={com.port} disabled={running} onChange={(e) => setCom({ ...com, port: e.target.value })}>
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
                <NumInput list="bauds" min={50} max={20000000} value={com.baud} disabled={running} onValue={(n) => setCom({ ...com, baud: n })} />
                <datalist id="bauds">
                  {BAUDS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </label>
              <label data-tip={tip(lang, "parity")}>
                {t("parity")}
                <select value={com.parity} disabled={running} onChange={(e) => setCom({ ...com, parity: e.target.value as "none" | "odd" | "even" })}>
                  <option value="none">{t("none")}</option>
                  <option value="even">{t("even")}</option>
                  <option value="odd">{t("odd")}</option>
                </select>
              </label>
            </div>
          </>
        )}
        {(transport === "tcp-server" || transport === "udp") && (
          <div className="grid2">
            <label data-tip={tip(lang, "bindHost")}>
              {t("host")}
              <input value={net.host} disabled={running} onChange={(e) => setNet({ ...net, host: e.target.value.trim() })} />
            </label>
            <label data-tip={tip(lang, transport === "udp" ? "bindPort" : "netPort")}>
              {transport === "udp" ? t("bindPort") : t("netPort")}
              <NumInput min={0} max={65535} value={net.port} disabled={running} onValue={(n) => setNet({ ...net, port: n })} />
            </label>
          </div>
        )}
        {(transport === "tcp-client" || transport === "udp") && (
          <>
            {/* TCP 클라이언트는 «접속할 곳», UDP 는 «보낼 곳» */}
            <label>{transport === "udp" ? t("remote") : t("connectTo")}</label>
            <div className="grid2">
              <label data-tip={tip(lang, transport === "udp" ? "remoteHost" : "host")}>
                {t("host")}
                <input value={net.remoteHost} disabled={running} onChange={(e) => setNet({ ...net, remoteHost: e.target.value.trim() })} />
              </label>
              <label data-tip={tip(lang, transport === "udp" ? "remotePort" : "netPort")}>
                {t("netPort")}
                <NumInput min={0} max={65535} value={net.remotePort} disabled={running} onValue={(n) => setNet({ ...net, remotePort: n })} />
              </label>
            </div>
          </>
        )}
        {transport === "udp" && (
          <label data-tip={tip(lang, "broadcast")} className="inline">
            <input type="checkbox" checked={!!net.broadcast} disabled={running} onChange={(e) => setNet({ ...net, broadcast: e.target.checked })} /> {t("broadcast")}
          </label>
        )}

        {transport !== "udp" && (
          <>
            <label data-tip={tip(lang, "framing")}>
              {t("framing")}
              <select
                value={framing.kind}
                onChange={(e) => setFraming(e.target.value === "terminator" ? { kind: "terminator", bytes: [], gapMs: 50 } : { kind: "gap", gapMs: 20 })}
              >
                <option value="gap">{t("fmGap")}</option>
                <option value="terminator">{t("fmTerminator")}</option>
              </select>
            </label>
            {framing.kind === "terminator" && (
              <label data-tip={tip(lang, "terminatorHex")}>
                {t("terminatorHex")}
                <input className={term.error ? "bad" : undefined} value={termText} onChange={(e) => setTermText(e.target.value)} placeholder="0A" />
                {term.error ? (
                  <span className="interlock">{term.error}</span>
                ) : term.bytes.length === 0 ? (
                  <span className="interlock">{t("ilNoTerm")}</span>
                ) : (
                  <span className="hint mono">{t("termParsed").replace("{a}", hex(term.bytes)).replace("{n}", String(term.bytes.length))}</span>
                )}
              </label>
            )}
            {(framing.kind === "gap" || framing.kind === "terminator") && (
              <label data-tip={tip(lang, "gapMs")}>
                {t("gapMs")}
                <NumInput min={1} max={60000} value={framing.gapMs} onValue={(n) => setFraming({ ...framing, gapMs: n })} />
              </label>
            )}
          </>
        )}

        <button data-tip={withKey(tip(lang, running ? "stop" : "run"), KEYS.connect)} className={running ? "btn danger" : "btn primary"} onClick={running ? stop : start} disabled={runDisabled}>
          {running ? t("stop") : t("start")}
        </button>
        {running && <span className="lock-note">🔒 {t("lockedHint")}</span>}
        <div className={`status s-${status === "listening" ? "connected" : status}`}>
          {dict[lang][`status_${status}` as Key] ?? status}
          {statusMsg ? ` · ${statusMsg}` : ""}
        </div>
        <button data-tip={withKey(tip(lang, logPath ? "stopLog" : "logToFile"), KEYS.fileLog)} className="btn small" onClick={toggleLog} disabled={!running}>
          {logPath ? t("stopLog") : t("logToFile")}
        </button>
      </aside>

      <main className="main">
        <NarrowBar lang={lang} open={showSide} onToggle={() => setShowSide(!showSide)} dot={`s-${status === "listening" ? "connected" : status}`} summary={summaryLine}>
          <button className={running ? "btn small danger" : "btn small primary"} onClick={running ? stop : start} disabled={runDisabled} data-tip={withKey(tip(lang, running ? "stop" : "run"), KEYS.connect)}>
            {running ? t("stop") : t("start")}
          </button>
        </NarrowBar>
        <div className="toolbar">
          <b data-tip={tip(lang, "rules")}>{t("rules")}</b>
          <label data-tip={tip(lang, "matchStrip")} className="inline">
            <input type="checkbox" checked={matchOpts.stripTerminator} onChange={(e) => setMatchOpts({ ...matchOpts, stripTerminator: e.target.checked })} /> {t("matchStrip")}
          </label>
          <label data-tip={tip(lang, "logNoMatch")} className="inline">
            <input type="checkbox" checked={matchOpts.logNoMatch} onChange={(e) => setMatchOpts({ ...matchOpts, logNoMatch: e.target.checked })} /> {t("logNoMatch")}
          </label>
          <span className="grow" />
          <button data-tip={tip(lang, "resetHits")} className="btn small" onClick={() => api.resetHits()}>
            {t("resetHits")}
          </button>
          <button data-tip={tip(lang, "exportRules")} className="btn small" onClick={exportRules}>
            {t("exportRules")}
          </button>
          <button data-tip={tip(lang, "importRules")} className="btn small" onClick={importRules}>
            {t("importRules")}
          </button>
        </div>
        <div className="rules">
          <AutoReplyPanel lang={lang} rules={rules} setRules={setRules} hits={hits} toast={toast} api={autoReplyApi} />
          <details className="unsol adv panel" open={unsolOpen} onToggle={(e) => setUnsolOpen((e.target as HTMLDetailsElement).open)}>
            <summary data-tip={tip(lang, "unsolicited")}>
              <span className="sum-title">{t("unsolicited")}</span>
              {!unsolOpen && (
                <span className="sum-note">
                  {repeating && running
                    ? fill(t("unsolRepeating"), { n: repeatMs })
                    : spec.text
                      ? `${spec.mode.toUpperCase()} ${spec.text.length > 24 ? `${spec.text.slice(0, 24)}…` : spec.text}`
                      : t("unsolNone")}
                </span>
              )}
            </summary>
            <div className="arrow">
              {/* 바꾸면 같은 바이트의 새 표기로 옮기고, 켜진 체크섬은 아래 알림줄로 */}
              <select value={spec.mode} onChange={(e) => modeSwitch.changeMode(e.target.value as TextMode)} data-tip={ui(lang, "sendModeTip")} aria-label="HEX / ASCII">
                <option value="hex">HEX</option>
                <option value="ascii">ASCII</option>
              </select>
              <input
                ref={sendInput}
                className="mono grow"
                value={spec.text}
                placeholder="STATUS OK"
                onChange={(e) => {
                  setSpec({ ...spec, text: e.target.value });
                  modeSwitch.onEdit();
                }}
                // 다른 프로그램처럼 Enter 로 보내기
                onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && running && sendable && api.send(spec).catch((err) => setError(String(err)))}
              />
              <select value={spec.checksum ?? ""} onChange={(e) => setSpec({ ...spec, checksum: (e.target.value || null) as ChecksumKind | null })}>
                <option value="">
                  {t("checksum")}: {t("none")}
                </option>
                {CHECKSUMS.map((c) => (
                  <option key={c.kind} value={c.kind}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select value={spec.suffix} onChange={(e) => setSpec({ ...spec, suffix: e.target.value })}>
                <option value="">
                  {t("suffix")}: {t("none")}
                </option>
                <option value="\r">{t("suffix")}: CR</option>
                <option value="\n">{t("suffix")}: LF</option>
                <option value="\r\n">{t("suffix")}: CR LF</option>
              </select>
              <button
                data-tip={tip(lang, "send")}
                className="btn small primary"
                disabled={!running || !sendable}
                onClick={() => {
                  api.send(spec).catch((e) => setError(String(e)));
                  sendInput.current?.focus();
                }}
              >
                {t("send")}
              </button>
              <label data-tip={withKey(tip(lang, "repeatSim"), KEYS.stopRepeat)} className="inline">
                <input type="checkbox" checked={repeating} disabled={!running && !repeating} onChange={(e) => setRepeating(e.target.checked)} /> {t("repeat")}
              </label>
              <NumInput className="num" min={10} max={3600000} value={repeatMs} onValue={setRepeatMs} />
            </div>
            <div className="hint mono">{preview}</div>
            {modeSwitch.node}
            {/* 보내기가 꺼진 이유 */}
            {!running ? <div className="hint">{t("whyNotStarted")}</div> : !sendable && !preview ? <div className="hint">{t("whyEmpty")}</div> : null}
            {repeating && running && waiting && <div className="hint warn">{t("waitingPeer")}</div>}
          </details>
        </div>

        <div className="traffic">
          <div className="toolbar">
            <b data-tip={tip(lang, "traffic")}>{t("traffic")}</b>
            {(["hex", "ascii"] as const).map((v) => (
              <button key={v} className={trafficView === v ? "seg on" : "seg"} onClick={() => setTrafficView(v)} aria-pressed={trafficView === v}>
                {v.toUpperCase()}
              </button>
            ))}
            <span className="grow" />
            <button data-tip={withKey(tip(lang, "clear"), KEYS.clear)} className="btn small" onClick={clearTraffic}>
              {t("clear")}
            </button>
          </div>
          <div className="log-wrap">
            <div className="tlog" ref={tlog}>
              {log.frames.map((f) => {
                const seq = f.seq ?? 0;
                return (
                  <div
                    key={seq}
                    className={`trow ${f.dir}${log.sel.has(seq) ? " sel" : ""}${log.sel.primary === seq ? " primary" : ""}`}
                    onClick={(e: ReactMouseEvent) => log.sel.click(e, seq)}
                    onContextMenu={(e: ReactMouseEvent) => {
                      e.preventDefault();
                      log.sel.context(seq);
                      setMenu({ x: e.clientX, y: e.clientY, seq });
                    }}
                  >
                    <span className="ts">{fmt(f.ts)}</span>
                    <span className="dir">{f.dir === "rx" ? "RX ◀" : f.dir === "tx" ? "TX ▶" : "EV"}</span>
                    {net2 && f.dir !== "ev" && <span className="peeraddr">{f.peer}</span>}
                    <span className="data">{f.dir === "ev" ? f.note : trafficView === "ascii" ? ascii(f.bytes) : hex(f.bytes)}</span>
                  </div>
                );
              })}
            </div>
            <FollowButton follow={log.follow} lang={lang} hidden={!traffic.current.length} />
          </div>
          {menu && (
            <LogMenu
              x={menu.x}
              y={menu.y}
              label={t("traffic")}
              onClose={() => setMenu(null)}
              items={logMenuItems({
                lang,
                frames: selectedFrames(log.sel, log.frameOf),
                clicked: log.frameOf(menu.seq),
                view: trafficView,
                fmt,
                peers: net2,
                onCopied,
                sendAgain: { run: (b) => void api.send(rawSpec(b)).catch((e) => setError(String(e))), enabled: running, why: t("whyNotStarted") },
                addRule: { run: ruleFromLog, bytes: ruleBytesOf(menu.seq) },
              })}
            />
          )}
          {error && <div className="error">{error}</div>}
        </div>
      </main>
      {showHelp && <HelpDialog doc={help} lang={lang} app="PortDock Simulator" onClose={() => setShowHelp(false)} />}
      {showSettings && (
        <SettingsDialog
          app="PortDock Simulator"
          version="0.1.0"
          settings={settings}
          update={update}
          reset={reset}
          onClose={() => setShowSettings(false)}
          writeText={api.writeText}
          readText={api.readText}
          busy={running || !!logPath}
        />
      )}
      {toast.node}
    </div>
  );
}
