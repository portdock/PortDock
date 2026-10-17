import { useCallback, useEffect, useRef, useState } from "react";
import { ask, open as openDialog, save } from "@tauri-apps/plugin-dialog";
import { load, parseTerminator, store, samePorts } from "@shared/framing";
import {
  api,
  ascii,
  CHECKSUMS,
  hex,
  type AutoRule,
  type ChecksumKind,
  type Frame,
  type FrameMode,
  type MatchOptions,
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
import { autoLogPath, formatTime, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { AutoReply } from "./AutoReply";
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
  const timeBase = useRef<number | null>(null);
  const [tick, setTick] = useState(0);
  const [trafficView, setTrafficView] = useState<"hex" | "ascii">(() => load("trafficView", "hex"));
  useEffect(() => {
    store("trafficView", trafficView);
  }, [trafficView]);
  const onEvent = useCallback((e: SessionEvent) => {
    if (e.type === "frames") {
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
  // 새 줄이 왔을 때, 사용자가 맨 아래에 있을 때만 따라 내려간다(응답 횟수 폴링으로 끌려가지 않게)
  const tlog = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  useEffect(() => {
    const el = tlog.current;
    if (el && atBottom.current && settings.autoScroll) el.scrollTop = el.scrollHeight;
  }, [tick, settings.autoScroll]);
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
  const [rules, setRules] = useState<AutoRule[]>(() => load("rules", []));
  const [hits, setHits] = useState<Record<string, number>>({});
  useEffect(() => {
    store("rules", rules);
  }, [rules]);
  useEffect(() => {
    const id = setInterval(() => api.getHits().then(setHits).catch(() => {}), 500);
    return () => clearInterval(id);
  }, []);
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
      const valid = (r: unknown): r is AutoRule => {
        const x = r as AutoRule;
        return (
          !!x &&
          typeof x.name === "string" &&
          typeof x.enabled === "boolean" &&
          typeof x.pattern === "string" &&
          (x.patternMode === "hex" || x.patternMode === "ascii") &&
          (x.kind === "exact" || x.kind === "contains") &&
          !!x.reply &&
          typeof x.reply.text === "string" &&
          (x.reply.mode === "hex" || x.reply.mode === "ascii") &&
          Number.isInteger(x.delayMs) &&
          x.delayMs >= 0
        );
      };
      if (!body.rules.every(valid)) throw new Error(t("badRules"));
      // 지금 규칙·설정을 덮어쓰기 전에 묻는다
      const name = path.split(/[\\/]/).pop() ?? path;
      if (!(await ask(t("askImport").replace("{n}", String(rules.length)).replace("{a}", name), { title: "PortDock Simulator", kind: "warning" }))) return;
      setRules(body.rules.map((r) => ({ ...r, reply: { ...r.reply, checksum: r.reply.checksum ?? null, suffix: r.reply.suffix ?? "" } })));
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
    }, Math.max(10, repeatMs));
    return () => {
      clearInterval(id);
      setWaiting(false);
    };
  }, [repeating, repeatMs, spec, running]);

  const frames = traffic.current.slice(-500);
  const net2 = transport !== "serial";

  // «지난 시간» 기준 — 오래된 줄이 화면에서 잘려도 바뀌지 않게 첫 기록 시각을 잡아 두고, 지우면 다시 잡는다
  if (!traffic.current.length) timeBase.current = null;
  else if (timeBase.current === null) timeBase.current = traffic.current[0].ts;
  const fmt = (ts: number) => formatTime(ts, settings.timeFormat, timeBase.current ?? ts);
  useExitGuard(running || !!logPath, settings.confirmExit, lang, "PortDock Simulator");

  return (
    <div className="app sim">
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>Simulator</small>
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
          <ReportButton app="PortDock Simulator" lang={lang} frames={() => traffic.current} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} />
          <button className="icon-btn" onClick={openHelp} title={t("helpTip")} aria-label={t("helpTip")}>
            ?
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title={lang === "ko" ? "설정" : "Settings"}>
            ⚙
          </button>
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

        <button data-tip={tip(lang, running ? "stop" : "run")} className={running ? "btn danger" : "btn primary"} onClick={running ? stop : start} disabled={(!running && transport === "serial" && !ports.some((p) => p.name === com.port)) || starting}>
          {running ? t("stop") : t("start")}
        </button>
        {running && <span className="lock-note">🔒 {t("lockedHint")}</span>}
        <div className={`status s-${status === "listening" ? "connected" : status}`}>
          {dict[lang][`status_${status}` as Key] ?? status}
          {statusMsg ? ` · ${statusMsg}` : ""}
        </div>
        <button data-tip={tip(lang, logPath ? "stopLog" : "logToFile")} className="btn small" onClick={toggleLog} disabled={!running}>
          {logPath ? t("stopLog") : t("logToFile")}
        </button>
      </aside>

      <main className="main">
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
          <AutoReply rules={rules} setRules={setRules} hits={hits} t={t} />
          <div className="unsol">
            <div className="arlbl" data-tip={tip(lang, "unsolicited")}>{t("unsolicited")}</div>
            <div className="arrow">
              <select value={spec.mode} onChange={(e) => setSpec({ ...spec, mode: e.target.value as TextMode })}>
                <option value="hex">HEX</option>
                <option value="ascii">ASCII</option>
              </select>
              <input
                ref={sendInput}
                className="mono grow"
                value={spec.text}
                placeholder="STATUS OK"
                onChange={(e) => setSpec({ ...spec, text: e.target.value })}
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
              <label data-tip={tip(lang, "repeatSim")} className="inline">
                <input type="checkbox" checked={repeating} disabled={!running && !repeating} onChange={(e) => setRepeating(e.target.checked)} /> {t("repeat")}
              </label>
              <NumInput className="num" min={10} max={3600000} value={repeatMs} onValue={setRepeatMs} />
            </div>
            <div className="hint mono">{preview}</div>
            {/* 보내기가 꺼진 이유 */}
            {!running ? <div className="hint">{t("whyNotStarted")}</div> : !sendable && !preview ? <div className="hint">{t("whyEmpty")}</div> : null}
            {repeating && running && waiting && <div className="hint warn">{t("waitingPeer")}</div>}
          </div>
        </div>

        <div className="traffic">
          <div className="toolbar">
            <b data-tip={tip(lang, "traffic")}>{t("traffic")}</b>
            {(["hex", "ascii"] as const).map((v) => (
              <button key={v} className={trafficView === v ? "seg on" : "seg"} onClick={() => setTrafficView(v)}>
                {v.toUpperCase()}
              </button>
            ))}
            <span className="grow" />
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
            ref={tlog}
            onScroll={(e) => {
              const el = e.currentTarget;
              atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
            }}
          >
            {frames.map((f, i) => (
              <div key={i} className={`trow ${f.dir}`}>
                <span className="ts">{fmt(f.ts)}</span>
                <span className="dir">{f.dir === "rx" ? "RX ◀" : f.dir === "tx" ? "TX ▶" : "EV"}</span>
                {net2 && f.dir !== "ev" && <span className="peeraddr">{f.peer}</span>}
                <span className="data">{f.dir === "ev" ? f.note : trafficView === "ascii" ? ascii(f.bytes) : hex(f.bytes)}</span>
              </div>
            ))}
          </div>
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
    </div>
  );
}
