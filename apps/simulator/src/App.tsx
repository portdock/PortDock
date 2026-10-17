import { useCallback, useEffect, useRef, useState } from "react";
import { open as openDialog, save } from "@tauri-apps/plugin-dialog";
import { hexList, load, store } from "@shared/framing";
import {
  api,
  CHECKSUMS,
  hex,
  type AutoRule,
  type ChecksumKind,
  type Frame,
  type FrameMode,
  type PortInfo,
  type SendSpec,
  type SessionEvent,
  type TextMode,
  type Transport,
} from "./api";
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
}

export default function App() {
  const { settings, update, reset } = useSettings();
  const lang = settings.lang;
  const setLang = (l: Lang) => update({ lang: l });
  const [showSettings, setShowSettings] = useState(false);
  // 화면에 남길 줄 수 — 이벤트 콜백 안에서 최신 값을 쓰려고 ref
  const maxLines = useRef(settings.maxLines);
  maxLines.current = settings.maxLines;
  const t = useCallback((k: Key) => dict[lang][k], [lang]);

  // ---- 연결 방식과 설정
  const [transport, setTransport] = useState<Transport>(() => load("transport", "serial"));
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [com, setCom] = useState(() => load("com", { port: "", baud: 9600, parity: "none" as "none" | "odd" | "even" }));
  const [net, setNet] = useState<Net>(() => load("net", { host: "0.0.0.0", port: 5000, remoteHost: "192.168.0.10", remotePort: 5000 }));
  const [framing, setFraming] = useState<FrameMode>(() => load("framing", { kind: "gap", gapMs: 20 }));
  const [termText, setTermText] = useState(() => load("termText", "0D 0A"));
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
    if (transport !== "serial") return;
    let alive = true;
    const tick = () => api.listPorts().then((p) => alive && setPorts(p)).catch(() => {});
    tick();
    const id = setInterval(tick, 1500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [transport]);
  useEffect(() => {
    if (!com.port && ports.length) setCom((c) => ({ ...c, port: ports[0].name }));
  }, [ports, com.port]);
  const effFraming: FrameMode = framing.kind === "terminator" ? { ...framing, bytes: hexList(termText) } : framing;

  // ---- 실행
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logPath, setLogPath] = useState<string | null>(null);
  const traffic = useRef<Frame[]>([]);
  const [, setTick] = useState(0);
  const onEvent = useCallback((e: SessionEvent) => {
    if (e.type === "frames") {
      traffic.current.push(...e.frames);
      if (traffic.current.length > maxLines.current) traffic.current.splice(0, traffic.current.length - maxLines.current);
      setTick((x) => x + 1);
    } else if (e.type === "status") {
      setStatus(e.state);
      setStatusMsg(e.message ?? (e.port || null));
      if (e.state === "closed") setRunning(false);
    } else if (e.type === "error") {
      setError(e.message);
    }
  }, []);
  const tlog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tlog.current;
    if (el) el.scrollTop = el.scrollHeight;
  });
  useEffect(() => {
    if (running && transport !== "udp") api.setFraming(effFraming).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, JSON.stringify(effFraming)]);

  async function start() {
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
          { bindHost: net.host, bindPort: net.port, remoteHost: net.remoteHost, remotePort: net.remotePort, broadcast: false, multicastGroup: "", multicastIf: "0.0.0.0", echo: false },
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
    }
  }
  async function stop() {
    await api.stop();
    setRunning(false);
    setStatus("closed");
    setLogPath(null);
  }
  async function toggleLog() {
    if (logPath) {
      await api.setLog(null);
      setLogPath(null);
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
    const body = { app: "PortDock Simulator", version: 1, transport, framing: effFraming, rules };
    await api.writeText(path, JSON.stringify(body, null, 2)).catch((e) => setError(String(e)));
  }
  async function importRules() {
    const path = await openDialog({ filters: [{ name: "JSON", extensions: ["json"] }] });
    if (!path || Array.isArray(path)) return;
    try {
      const body = JSON.parse(await api.readText(path)) as { rules?: AutoRule[]; framing?: FrameMode };
      if (!Array.isArray(body.rules)) throw new Error("rules 가 없는 파일입니다");
      setRules(body.rules);
      if (body.framing && body.framing.kind !== "modbus-rtu") {
        setFraming(body.framing);
        if (body.framing.kind === "terminator") setTermText(hex(body.framing.bytes));
      }
    } catch (e) {
      setError(String(e));
    }
  }

  // ---- 장비가 먼저 보내기
  const [spec, setSpec] = useState<SendSpec>(() => load("spec", { text: "", mode: "ascii", checksum: null, suffix: "\\r\\n" }));
  const [preview, setPreview] = useState<string>("");
  const [repeatMs, setRepeatMs] = useState(1000);
  const [repeating, setRepeating] = useState(false);
  useEffect(() => {
    store("spec", spec);
    api
      .preview(spec)
      .then((b) => setPreview(`${hex(b)} (${b.length})`))
      .catch((e) => setPreview(String(e)));
  }, [spec]);
  useEffect(() => {
    if (!repeating || !running) return;
    const id = setInterval(() => api.send(spec).catch((e) => setError(String(e))), Math.max(10, repeatMs));
    return () => clearInterval(id);
  }, [repeating, repeatMs, spec, running]);

  const frames = traffic.current.slice(-500);
  const net2 = transport !== "serial";

  const fmt = (ts: number) => formatTime(ts, settings.timeFormat, traffic.current[0]?.ts ?? ts);
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
          <button className="icon-btn" onClick={() => setShowSettings(true)} title={lang === "ko" ? "설정" : "Settings"}>
            ⚙
          </button>
          </span>
        </div>
        <label>
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
            <label>
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
              <label>
                {t("baud")}
                <NumInput list="bauds" min={50} max={20000000} value={com.baud} disabled={running} onValue={(n) => setCom({ ...com, baud: n })} />
                <datalist id="bauds">
                  {BAUDS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </label>
              <label>
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
            <label>
              {t("host")}
              <input value={net.host} disabled={running} onChange={(e) => setNet({ ...net, host: e.target.value.trim() })} />
            </label>
            <label>
              {transport === "udp" ? t("bindPort") : t("netPort")}
              <NumInput min={0} max={65535} value={net.port} disabled={running} onValue={(n) => setNet({ ...net, port: n })} />
            </label>
          </div>
        )}
        {(transport === "tcp-client" || transport === "udp") && (
          <>
            <label>{t("remote")}</label>
            <div className="grid2">
              <label>
                {t("host")}
                <input value={net.remoteHost} disabled={running} onChange={(e) => setNet({ ...net, remoteHost: e.target.value.trim() })} />
              </label>
              <label>
                {t("netPort")}
                <NumInput min={0} max={65535} value={net.remotePort} disabled={running} onValue={(n) => setNet({ ...net, remotePort: n })} />
              </label>
            </div>
          </>
        )}

        {transport !== "udp" && (
          <>
            <label>
              {t("framing")}
              <select
                value={framing.kind}
                onChange={(e) => setFraming(e.target.value === "terminator" ? { kind: "terminator", bytes: [], gapMs: 200 } : { kind: "gap", gapMs: 20 })}
              >
                <option value="gap">{t("fmGap")}</option>
                <option value="terminator">{t("fmTerminator")}</option>
              </select>
            </label>
            {framing.kind === "terminator" && (
              <label>
                {t("terminatorHex")}
                <input value={termText} onChange={(e) => setTermText(e.target.value)} />
              </label>
            )}
            {(framing.kind === "gap" || framing.kind === "terminator") && (
              <label>
                {t("gapMs")}
                <NumInput min={1} max={60000} value={framing.gapMs} onValue={(n) => setFraming({ ...framing, gapMs: n })} />
              </label>
            )}
          </>
        )}

        <button className={running ? "btn danger" : "btn primary"} onClick={running ? stop : start} disabled={transport === "serial" && !com.port}>
          {running ? t("stop") : t("start")}
        </button>
        <div className={`status s-${status === "listening" ? "connected" : status}`}>
          {dict[lang][`status_${status}` as Key] ?? status}
          {statusMsg ? ` · ${statusMsg}` : ""}
        </div>
        <button className="btn small" onClick={toggleLog} disabled={!running}>
          {logPath ? t("stopLog") : t("logToFile")}
        </button>
      </aside>

      <main className="main">
        <div className="toolbar">
          <b>{t("rules")}</b>
          <span className="grow" />
          <button className="btn small" onClick={() => api.resetHits()}>
            {t("resetHits")}
          </button>
          <button className="btn small" onClick={exportRules}>
            {t("exportRules")}
          </button>
          <button className="btn small" onClick={importRules}>
            {t("importRules")}
          </button>
        </div>
        <div className="rules">
          <AutoReply rules={rules} setRules={setRules} hits={hits} t={t} />
          <div className="unsol">
            <div className="arlbl">{t("unsolicited")}</div>
            <div className="arrow">
              <select value={spec.mode} onChange={(e) => setSpec({ ...spec, mode: e.target.value as TextMode })}>
                <option value="hex">HEX</option>
                <option value="ascii">ASCII</option>
              </select>
              <input className="mono grow" value={spec.text} placeholder="STATUS OK" onChange={(e) => setSpec({ ...spec, text: e.target.value })} />
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
                <option value="\r">CR</option>
                <option value="\n">LF</option>
                <option value="\r\n">CR LF</option>
              </select>
              <button className="btn small primary" disabled={!running} onClick={() => api.send(spec).catch((e) => setError(String(e)))}>
                {t("send")}
              </button>
              <label className="inline">
                <input type="checkbox" checked={repeating} disabled={!running} onChange={(e) => setRepeating(e.target.checked)} /> {t("repeat")}
              </label>
              <NumInput className="num" min={10} max={3600000} value={repeatMs} onValue={setRepeatMs} />
            </div>
            <div className="hint mono">{preview}</div>
          </div>
        </div>

        <div className="traffic">
          <div className="toolbar">
            <b>{t("traffic")}</b>
            <span className="grow" />
            <button
              className="btn small"
              onClick={() => {
                traffic.current = [];
                setTick((x) => x + 1);
              }}
            >
              {t("clear")}
            </button>
          </div>
          <div className="tlog" ref={tlog}>
            {frames.map((f, i) => (
              <div key={i} className={`trow ${f.dir}`}>
                <span className="ts">{fmt(f.ts)}</span>
                <span className="dir">{f.dir === "rx" ? "RX ◀" : f.dir === "tx" ? "TX ▶" : "EV"}</span>
                {net2 && f.dir !== "ev" && <span className="peeraddr">{f.peer}</span>}
                <span className="data">{f.dir === "ev" ? f.note : hex(f.bytes)}</span>
              </div>
            ))}
          </div>
          {error && <div className="error">{error}</div>}
        </div>
      </main>
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
        />
      )}
    </div>
  );
}
