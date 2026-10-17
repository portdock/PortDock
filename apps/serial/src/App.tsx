import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { save } from "@tauri-apps/plugin-dialog";
import {
  api,
  ascii,
  CHECKSUMS,
  hex,
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
import { samePorts, trimFrames } from "@shared/framing";
import { autoLogPath, formatTime, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { hasXonXoff, minRepeatMs, serialTxMs } from "@shared/interlocks";
import { dict, type Key, type Lang } from "./i18n";
import "./App.css";

const BAUDS = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

type Status = "idle" | "connected" | "disconnected" | "reconnecting" | "closed";
type ViewMode = "hex" | "ascii" | "both";

interface Command extends SendSpec {
  name: string;
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

function portLabel(p: PortInfo) {
  const desc = p.product ?? p.manufacturer;
  return desc ? `${p.name} — ${desc}` : p.name;
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
  // 좁은 창에서 오른쪽 칸(명령 목록·상세)을 펼칠지
  const [showRight, setShowRight] = useState(false);

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
  const [cfg, setCfg] = useState<SerialConfig>(() =>
    load("cfg", {
      port: "",
      baud: 9600,
      dataBits: 8,
      parity: "none",
      stopBits: 1,
      flow: "none",
      dtr: false,
      rts: false,
      autoReconnect: true,
    }),
  );
  useEffect(() => store("cfg", cfg), [cfg]);
  useEffect(() => {
    if (!cfg.port && ports.length) setCfg((c) => ({ ...c, port: ports[0].name }));
  }, [ports, cfg.port]);

  const [framing, setFraming] = useState<FrameMode>(() => load("framing", { kind: "gap", gapMs: 20 }));
  const [terminatorText, setTerminatorText] = useState(() => load("terminatorText", "0D 0A"));
  const [rxCheck, setRxCheck] = useState<ChecksumKind | null>(() => load("rxCheck", null));
  useEffect(() => store("framing", framing), [framing]);
  useEffect(() => store("terminatorText", terminatorText), [terminatorText]);
  useEffect(() => store("rxCheck", rxCheck), [rxCheck]);

  // ---- 세션
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logPath, setLogPath] = useState<string | null>(null);
  const [lines, setLines] = useState<Lines | null>(null);

  // 프레임은 ref 에 쌓고 version 으로만 다시 그린다(대량 수신 시 배열 복사 방지)
  const framesRef = useRef<Frame[]>([]);
  // 줄마다 일련번호 — 앞을 잘라내도 선택한 줄이 다른 줄로 바뀌지 않게
  const seqRef = useRef(0);
  const screenBytes = useRef(0);
  const [livePort, setLivePort] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const counters = useRef({ rx: 0, tx: 0 });

  const onEvent = useCallback((e: SessionEvent) => {
    if (e.type === "frames") {
      const arr = framesRef.current;
      for (const f of e.frames) {
        f.seq = ++seqRef.current;
        arr.push(f);
        screenBytes.current += f.bytes.length;
        if (f.dir !== "ev") counters.current[f.dir] += f.bytes.length;
      }
      screenBytes.current = trimFrames(arr, maxLines.current, screenBytes.current);
      setVersion((v) => v + 1);
    } else if (e.type === "error") {
      setError(e.message);
    } else if (e.type === "lines") {
      setLines({ cts: e.cts, dsr: e.dsr, ri: e.ri, cd: e.cd });
    } else {
      setStatus(e.state);
      setStatusMsg(e.message);
      if (e.state === "connected") {
        setSessionId((id) => id ?? e.port);
        setLivePort(e.port);
      }
      // 끊기면 반복을 끈다 — 다시 연결됐을 때 저절로 다시 보내지 않게
      if (e.state !== "connected") setRepeating(false);
      if (e.state === "closed") {
        setSessionId(null);
        setLogPath(null);
        setLines(null);
      }
    }
  }, []);

  const effectiveFraming = useMemo<FrameMode>(() => {
    if (framing.kind === "terminator") {
      const bytes = terminatorText
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((h) => parseInt(h, 16))
        .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 255);
      return { ...framing, bytes };
    }
    if (framing.kind === "modbus-rtu") return { kind: "modbus-rtu", baud: cfg.baud };
    return framing;
  }, [framing, terminatorText, cfg.baud]);

  useEffect(() => {
    if (sessionId) api.setFraming(sessionId, effectiveFraming, rxCheck).catch((e) => setError(String(e)));
  }, [sessionId, effectiveFraming, rxCheck]);

  const liveCfg = useMemo(() => ({ ...cfg }), [cfg.baud, cfg.dataBits, cfg.parity, cfg.stopBits, cfg.flow, cfg.dtr, cfg.rts, cfg.autoReconnect]); // eslint-disable-line react-hooks/exhaustive-deps
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
    try {
      await api.open(cfg, effectiveFraming, rxCheck, onEvent);
      setSessionId(cfg.port);
      if (settings.autoLog && settings.logFolder) {
        const p = autoLogPath(settings.logFolder, "serial");
        await api.setLog(cfg.port, p).then(() => setLogPath(p)).catch((e) => setError(String(e)));
      }
    } catch (e) {
      setError(String(e));
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
    const path = await save({ defaultPath: `portdock-${stamp}.log`, filters: [{ name: "Log", extensions: ["log", "txt"] }] });
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
  const [autoscroll, setAutoscroll] = useState(settings.autoScroll);
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => store("view", view), [view]);

  function clearLog() {
    framesRef.current = [];
    counters.current = { rx: 0, tx: 0 };
    screenBytes.current = 0;
    setSelected(null);
    setVersion((v) => v + 1);
  }

  const listRef = useRef<HTMLDivElement>(null);
  const frames = framesRef.current;
  const rows = useVirtualizer({
    count: frames.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 22,
    overscan: 20,
  });
  useEffect(() => {
    if (autoscroll && frames.length) rows.scrollToIndex(frames.length - 1, { align: "end" });
  }, [version, autoscroll, frames.length, rows]);

  async function saveView() {
    const path = await save({ defaultPath: "portdock-view.txt", filters: [{ name: "Text", extensions: ["txt", "log"] }] });
    if (!path) return;
    const text = framesRef.current
      .map((f) =>
        f.dir === "ev"
          ? `${fmt(f.ts)} EV ${f.note ?? ""}`
          : `${fmt(f.ts)} ${f.dir.toUpperCase()} ${hex(f.bytes)}${f.check === false ? " [CHECK FAIL]" : ""}`,
      )
      .join("\n");
    await api.writeText(path, text).catch((e: unknown) => setError(String(e)));
  }

  // ---- 상세(Modbus 풀이)
  const [modbus, setModbus] = useState<ModbusInfo | null>(null);
  const selFrame = selected != null && frames.length ? frames[selected - (frames[0].seq ?? 0)] : undefined;
  useEffect(() => {
    if (!selFrame || selFrame.dir === "ev") {
      setModbus(null);
      return;
    }
    api.decodeModbus(selFrame.bytes).then(setModbus).catch(() => setModbus(null));
  }, [selFrame]);

  // ---- 보내기
  const [spec, setSpec] = useState<SendSpec>(() => load("spec", { text: "", mode: "hex", checksum: null, suffix: "" }));
  const [previewBytes, setPreviewBytes] = useState<number[] | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [repeatMs, setRepeatMs] = useState(1000);
  const [repeating, setRepeating] = useState(false);
  useEffect(() => store("spec", spec), [spec]);
  useEffect(() => {
    let stale = false;
    api
      .preview(spec)
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
  }, [spec]);
  // 0바이트는 보낼 것이 없다
  const sendable = !!previewBytes && previewBytes.length > 0;

  const inflight = useRef(false);
  const doSend = useCallback(
    async (s: SendSpec) => {
      if (!sessionId || inflight.current) return;
      inflight.current = true;
      try {
        await api.send(sessionId, s);
        setError(null);
      } catch (e) {
        setError(String(e));
        setRepeating(false);
      } finally {
        inflight.current = false;
      }
    },
    [sessionId],
  );

  // ---- 인터락
  // 재연결 대기 중에는 세션은 있어도 보낼 수 없다
  const online = sessionId != null && status === "connected";
  // 반복 간격이 실제 송신 시간보다 짧으면 앞 송신이 끝나기 전에 쌓인다 → 최소 간격으로 올려 보낸다
  const txMs = previewBytes ? serialTxMs(previewBytes.length, cfg.baud, cfg.dataBits, cfg.parity, cfg.stopBits) : 0;
  const minRep = minRepeatMs(txMs);
  const effRepeat = Math.max(repeatMs, minRep);
  // 소프트웨어 흐름 제어에서 XON/XOFF 바이트는 데이터가 아니라 신호로 먹힌다
  const xonxoff = cfg.flow === "software" && !!previewBytes && hasXonXoff(previewBytes);

  useEffect(() => {
    if (!repeating || !online) return;
    const id = setInterval(() => doSend(spec), effRepeat);
    return () => clearInterval(id);
  }, [repeating, effRepeat, spec, online, doSend]);

  // ---- 명령 목록
  const [commands, setCommands] = useState<Command[]>(() => load("commands", []));
  useEffect(() => store("commands", commands), [commands]);
  function addCommand() {
    const name = spec.text.slice(0, 24) || "cmd";
    setCommands((c) => [...c, { ...spec, name }]);
  }

  const connected = sessionId != null;
  const statusKey = `status_${status}` as Key;

  const fmt = (ts: number) => formatTime(ts, settings.timeFormat, framesRef.current[0]?.ts ?? ts);
  useExitGuard(sessionId != null || !!logPath, settings.confirmExit, lang, "PortDock Serial");

  return (
    <div className={showRight ? "app three show-right" : "app three"}>
      <aside className="side">
        <div className="brand">
          <span className="logo">PortDock</span>
          <span className="brand-tools">
          <select className="lang" value={lang} onChange={(e) => {
            const l = e.target.value as Lang;
            setLang(l);
            store("lang", l);
          }}>
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title={lang === "ko" ? "설정" : "Settings"}>
            ⚙
          </button>
          </span>
        </div>

        <label>{t("ports")}</label>
        <select value={cfg.port} disabled={connected} onChange={(e) => setCfg({ ...cfg, port: e.target.value })}>
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

        <div className="grid2">
          <label>
            {t("baud")}
            <NumInput list="bauds" min={50} max={20000000} value={cfg.baud} commitOnBlur={connected} onValue={(n) => setCfg({ ...cfg, baud: n })} />
            <datalist id="bauds">
              {BAUDS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </label>
          <label>
            {t("dataBits")}
            <select value={cfg.dataBits} onChange={(e) => setCfg({ ...cfg, dataBits: Number(e.target.value) })}>
              {[5, 6, 7, 8].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            {t("parity")}
            <select value={cfg.parity} onChange={(e) => setCfg({ ...cfg, parity: e.target.value as SerialConfig["parity"] })}>
              <option value="none">{t("none")}</option>
              <option value="odd">{t("odd")}</option>
              <option value="even">{t("even")}</option>
            </select>
          </label>
          <label>
            {t("stopBits")}
            <select value={cfg.stopBits} onChange={(e) => setCfg({ ...cfg, stopBits: Number(e.target.value) })}>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </label>
        </div>
        <label>
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
        <div className="checks">
          <label className="inline">
            <input type="checkbox" checked={cfg.dtr} onChange={(e) => setCfg({ ...cfg, dtr: e.target.checked })} /> DTR
          </label>
          <label className="inline">
            <input
              type="checkbox"
              checked={cfg.rts}
              disabled={cfg.flow === "hardware"}
              title={cfg.flow === "hardware" ? t("ilRtsHw") : ""}
              onChange={(e) => setCfg({ ...cfg, rts: e.target.checked })}
            />{" "}
            RTS
          </label>
        </div>
        <label className="inline">
          <input
            type="checkbox"
            checked={cfg.autoReconnect}
            onChange={(e) => setCfg({ ...cfg, autoReconnect: e.target.checked })}
          />{" "}
          {t("autoReconnect")}
        </label>

        <button className={connected ? "btn danger" : "btn primary"} onClick={connected ? disconnect : connect} disabled={!cfg.port || connecting}>
          {connected ? t("disconnect") : t("connect")}
        </button>
        <div className={`status s-${status}`}>
          {t(statusKey)}
          {statusMsg ? ` · ${statusMsg}` : ""}
        </div>

        <hr />
        <label>
          {t("framing")}
          <select
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
              if (k === "modbus-rtu") setRxCheck("crc16-modbus");
            }}
          >
            <option value="gap">{t("fmGap")}</option>
            <option value="terminator">{t("fmTerminator")}</option>
            <option value="fixed">{t("fmFixed")}</option>
            <option value="modbus-rtu">{t("fmModbus")}</option>
          </select>
        </label>
        {framing.kind === "terminator" && (
          <label>
            {t("terminatorHex")}
            <input value={terminatorText} onChange={(e) => setTerminatorText(e.target.value)} placeholder="0D 0A" />
            {effectiveFraming.kind === "terminator" && effectiveFraming.bytes.length === 0 && <span className="interlock">{t("ilNoTerm")}</span>}
          </label>
        )}
        {framing.kind === "fixed" && (
          <label>
            {t("length")}
            <NumInput min={1} max={65536} value={framing.len} onValue={(n) => setFraming({ ...framing, len: n })} />
          </label>
        )}
        {framing.kind !== "modbus-rtu" && (
          <label>
            {t("gapMs")}
            <NumInput min={1} max={60000} value={framing.gapMs} onValue={(n) => setFraming({ ...framing, gapMs: n })} />
          </label>
        )}
        {((framing.kind !== "modbus-rtu" && framing.gapMs < 16) || framing.kind === "modbus-rtu") &&
          ports.find((p) => p.name === cfg.port)?.kind === "usb" && <div className="hint warn">{t("usbGapHint")}</div>}
        <label>
          {t("rxCheck")}
          <select value={rxCheck ?? ""} onChange={(e) => setRxCheck((e.target.value || null) as ChecksumKind | null)}>
            <option value="">{t("none")}</option>
            {CHECKSUMS.map((c) => (
              <option key={c.kind} value={c.kind}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn" onClick={toggleLog} disabled={!connected}>
          {logPath ? t("stopLog") : t("logToFile")}
        </button>
        {logPath && <div className="hint ellipsis" title={logPath}>{logPath}</div>}
      </aside>

      <main className="main">
        <div className="toolbar">
          <span>{t("view")}</span>
          {(["hex", "ascii", "both"] as ViewMode[]).map((v) => (
            <button key={v} className={view === v ? "seg on" : "seg"} onClick={() => setView(v)}>
              {v === "both" ? t("both") : v.toUpperCase()}
            </button>
          ))}
          <label className="inline">
            <input type="checkbox" checked={autoscroll} onChange={(e) => setAutoscroll(e.target.checked)} /> {t("autoscroll")}
          </label>
          <span className="grow" />
          <span className="counter">
            RX {counters.current.rx.toLocaleString()} · TX {counters.current.tx.toLocaleString()} {t("bytes")}
          </span>
          <button className="btn small" onClick={saveView}>
            {t("saveLog")}
          </button>
          <button className="btn small" onClick={clearLog}>
            {t("clear")}
          </button>
          <button className="btn small narrow-only" onClick={() => setShowRight(!showRight)} title={t("commands")}>
            ☰ {t("commands")}
          </button>
        </div>

        <div className="statusbar">
          <span className={`dot s-${status}`} />
          <span className="mono">{connected ? summary({ ...cfg, port: livePort ?? cfg.port }) : t(statusKey)}</span>
          {connected && (
            <>
              <span className={cfg.dtr ? "led on" : "led"}>DTR</span>
              <span className={cfg.rts ? "led on" : "led"}>RTS</span>
              <span className="sep" />
              {(["cts", "dsr", "ri", "cd"] as const).map((k) => (
                <span key={k} className={lines?.[k] ? "led in on" : "led in"} title={t("inputLine")}>
                  {k.toUpperCase()}
                </span>
              ))}
            </>
          )}
          {logPath && <span className="rec">● REC</span>}
        </div>

        <div className="log" ref={listRef}>
          <div style={{ height: rows.getTotalSize(), position: "relative" }}>
            {rows.getVirtualItems().map((r) => {
              const f = frames[r.index];
              if (f.dir === "ev")
                return (
                  <div
                    key={r.key}
                    className={`row ev ${selected === f.seq ? "sel" : ""}`}
                    style={{ transform: `translateY(${r.start}px)` }}
                    onClick={() => setSelected(f.seq ?? null)}
                  >
                    <span className="ts">{fmt(f.ts)}</span>
                    <span className="dir">EV</span>
                    <span className="note">{f.note}</span>
                  </div>
                );
              return (
                <div
                  key={r.key}
                  className={`row ${f.dir} ${selected === f.seq ? "sel" : ""}`}
                  style={{ transform: `translateY(${r.start}px)` }}
                  onClick={() => {
                    setSelected(f.seq ?? null);
                    setAutoscroll(false);
                  }}
                >
                  <span className="ts">{fmt(f.ts)}</span>
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

        <div className="sendbar">
          <div className="sendrow">
            <select value={spec.mode} onChange={(e) => setSpec({ ...spec, mode: e.target.value as TextMode })}>
              <option value="hex">HEX</option>
              <option value="ascii">ASCII</option>
            </select>
            <input
              className="sendtext"
              value={spec.text}
              placeholder={spec.mode === "hex" ? "01 03 00 00 00 0A" : "AT\\r\\n"}
              onChange={(e) => setSpec({ ...spec, text: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && online && sendable && doSend(spec)}
            />
            <select value={spec.checksum ?? ""} onChange={(e) => setSpec({ ...spec, checksum: (e.target.value || null) as ChecksumKind | null })} title={t("checksum")}>
              <option value="">{t("checksum")}: {t("none")}</option>
              {CHECKSUMS.map((c) => (
                <option key={c.kind} value={c.kind}>
                  {c.label}
                </option>
              ))}
            </select>
            <select value={spec.suffix} onChange={(e) => setSpec({ ...spec, suffix: e.target.value })} title={t("suffix")}>
              <option value="">{t("suffix")}: {t("none")}</option>
              <option value="\r">CR</option>
              <option value="\n">LF</option>
              <option value="\r\n">CR LF</option>
            </select>
            <button className="btn primary" onClick={() => doSend(spec)} disabled={!online || !sendable}>
              {t("send")}
            </button>
          </div>
          <div className="sendrow sub">
            <span className={previewErr ? "preview err" : "preview"}>
              {t("willSend")}: {previewErr ?? (previewBytes ? `${hex(previewBytes)} (${previewBytes.length})` : "")}
            </span>
            <span className="grow" />
            <label className="inline">
              <input type="checkbox" checked={repeating} disabled={!online} onChange={(e) => setRepeating(e.target.checked)} /> {t("repeat")}
            </label>
            <NumInput className="num" min={10} max={3600000} value={repeatMs} onValue={setRepeatMs} />
            <button className="btn small" onClick={addCommand} disabled={!sendable}>
              + {t("commands")}
            </button>
          </div>
          {connected && !online && <div className="interlock">{t("ilOffline")}</div>}
          {repeating && repeatMs < minRep && <div className="interlock">{t("ilRepeat").replace("{a}", String(repeatMs)).replace("{b}", String(minRep))}</div>}
          {xonxoff && <div className="interlock">{t("ilXon")}</div>}
          {cfg.flow === "hardware" && <div className="hint">{t("ilRtsHw")}</div>}
          {error && <div className="error">{error}</div>}
        </div>
      </main>

      {showRight && <div className="backdrop narrow-only" onClick={() => setShowRight(false)} />}
      <aside className="right">
        <button className="btn small narrow-only close-right" onClick={() => setShowRight(false)} title={t("close")}>
          ✕
        </button>
        <h3>{t("commands")}</h3>
        <div className="cmds">
          {commands.map((c, i) => (
            <div key={i} className="cmd" title={c.text}>
              <input
                className="cmdname"
                value={c.name}
                onChange={(e) => setCommands(commands.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
              <button className="btn small" onClick={() => doSend(c)} disabled={!online} title={t("send")}>
                ▶
              </button>
              <button className="btn small ghost" title={t("edit")} onClick={() => setSpec({ text: c.text, mode: c.mode, checksum: c.checksum, suffix: c.suffix })}>
                ✎
              </button>
              <button className="btn small ghost" onClick={() => setCommands(commands.filter((_, j) => j !== i))} title={t("delete")}>
                ✕
              </button>
            </div>
          ))}
        </div>

        <h3>{t("detail")}</h3>
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
            {modbus && (
              <div className="modbus">
                <div className="mbhead">
                  Modbus · {modbus.kind} · {t("crc")} <b className={modbus.crc_ok ? "okc" : "failc"}>{modbus.crc_ok ? t("ok") : t("fail")}</b>
                </div>
                <table>
                  <tbody>
                    <tr>
                      <td>slave</td>
                      <td>{modbus.slave}</td>
                    </tr>
                    <tr>
                      <td>function</td>
                      <td>
                        0x{modbus.function.toString(16).toUpperCase().padStart(2, "0")} {modbus.function_name}
                      </td>
                    </tr>
                    {modbus.fields.map(([k, v]) => (
                      <tr key={k}>
                        <td>{k}</td>
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
        />
      )}
    </div>
  );
}
