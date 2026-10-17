import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { save } from "@tauri-apps/plugin-dialog";
import {
  api,
  ascii,
  CHECKSUMS,
  clock,
  hex,
  type ChecksumKind,
  type Frame,
  type FrameMode,
  type ModbusInfo,
  type PortInfo,
  type SendSpec,
  type SerialConfig,
  type SessionEvent,
  type TextMode,
} from "./api";
import { dict, type Key, type Lang } from "./i18n";
import "./App.css";

const MAX_FRAMES = 100_000;
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
  const [lang, setLang] = useState<Lang>(() => load("lang", navigator.language.startsWith("ko") ? "ko" : "en"));
  const t = useCallback((k: Key) => dict[lang][k], [lang]);

  // ---- 포트 목록 (1.5초마다 갱신 — 꽂고 뽑는 것을 바로 보여 준다)
  const [ports, setPorts] = useState<PortInfo[]>([]);
  useEffect(() => {
    let alive = true;
    const tick = () => api.listPorts().then((p) => alive && setPorts(p)).catch(() => {});
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

  // 프레임은 ref 에 쌓고 version 으로만 다시 그린다(대량 수신 시 배열 복사 방지)
  const framesRef = useRef<Frame[]>([]);
  const [version, setVersion] = useState(0);
  const counters = useRef({ rx: 0, tx: 0 });

  const onEvent = useCallback((e: SessionEvent) => {
    if (e.type === "frames") {
      const arr = framesRef.current;
      for (const f of e.frames) {
        arr.push(f);
        counters.current[f.dir] += f.bytes.length;
      }
      if (arr.length > MAX_FRAMES) arr.splice(0, arr.length - MAX_FRAMES);
      setVersion((v) => v + 1);
    } else if (e.type === "error") {
      setError(e.message);
    } else {
      setStatus(e.state);
      setStatusMsg(e.message);
      if (e.state === "connected") setSessionId((id) => id ?? e.port);
      if (e.state === "closed") {
        setSessionId(null);
        setLogPath(null);
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

  async function connect() {
    setError(null);
    try {
      await api.open(cfg, effectiveFraming, rxCheck, onEvent);
      setSessionId(cfg.port);
    } catch (e) {
      setError(String(e));
    }
  }

  async function disconnect() {
    if (!sessionId) return;
    await api.close(sessionId);
    setSessionId(null);
    setStatus("closed");
    setLogPath(null);
  }

  async function toggleLog() {
    if (!sessionId) return;
    if (logPath) {
      await api.setLog(sessionId, null);
      setLogPath(null);
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
  const [autoscroll, setAutoscroll] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => store("view", view), [view]);

  function clearLog() {
    framesRef.current = [];
    counters.current = { rx: 0, tx: 0 };
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
      .map((f) => `${clock(f.ts)} ${f.dir.toUpperCase()} ${hex(f.bytes)}${f.check === false ? " [CHECK FAIL]" : ""}`)
      .join("\n");
    await api.writeText(path, text).catch((e: unknown) => setError(String(e)));
  }

  // ---- 상세(Modbus 풀이)
  const [modbus, setModbus] = useState<ModbusInfo | null>(null);
  const selFrame = selected != null ? frames[selected] : undefined;
  useEffect(() => {
    if (!selFrame) {
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
    api
      .preview(spec)
      .then((b) => {
        setPreviewBytes(b);
        setPreviewErr(null);
      })
      .catch((e) => {
        setPreviewBytes(null);
        setPreviewErr(String(e));
      });
  }, [spec]);

  const doSend = useCallback(
    async (s: SendSpec) => {
      if (!sessionId) return;
      try {
        await api.send(sessionId, s);
        setError(null);
      } catch (e) {
        setError(String(e));
        setRepeating(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    if (!repeating || !sessionId) return;
    const id = setInterval(() => doSend(spec), Math.max(10, repeatMs));
    return () => clearInterval(id);
  }, [repeating, repeatMs, spec, sessionId, doSend]);

  // ---- 명령 목록
  const [commands, setCommands] = useState<Command[]>(() => load("commands", []));
  useEffect(() => store("commands", commands), [commands]);
  function addCommand() {
    const name = spec.text.slice(0, 24) || "cmd";
    setCommands((c) => [...c, { ...spec, name }]);
  }

  const connected = sessionId != null;
  const statusKey = `status_${status}` as Key;

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <span className="logo">PortDock</span>
          <select className="lang" value={lang} onChange={(e) => {
            const l = e.target.value as Lang;
            setLang(l);
            store("lang", l);
          }}>
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
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
            <input
              list="bauds"
              value={cfg.baud}
              disabled={connected}
              onChange={(e) => setCfg({ ...cfg, baud: Number(e.target.value) || 0 })}
            />
            <datalist id="bauds">
              {BAUDS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </label>
          <label>
            {t("dataBits")}
            <select value={cfg.dataBits} disabled={connected} onChange={(e) => setCfg({ ...cfg, dataBits: Number(e.target.value) })}>
              {[5, 6, 7, 8].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            {t("parity")}
            <select value={cfg.parity} disabled={connected} onChange={(e) => setCfg({ ...cfg, parity: e.target.value as SerialConfig["parity"] })}>
              <option value="none">{t("none")}</option>
              <option value="odd">{t("odd")}</option>
              <option value="even">{t("even")}</option>
            </select>
          </label>
          <label>
            {t("stopBits")}
            <select value={cfg.stopBits} disabled={connected} onChange={(e) => setCfg({ ...cfg, stopBits: Number(e.target.value) })}>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </label>
        </div>
        <label>
          {t("flow")}
          <select value={cfg.flow} disabled={connected} onChange={(e) => setCfg({ ...cfg, flow: e.target.value as SerialConfig["flow"] })}>
            <option value="none">{t("none")}</option>
            <option value="hardware">{t("hardware")}</option>
            <option value="software">{t("software")}</option>
          </select>
        </label>
        <div className="checks">
          <label className="inline">
            <input type="checkbox" checked={cfg.dtr} disabled={connected} onChange={(e) => setCfg({ ...cfg, dtr: e.target.checked })} /> DTR
          </label>
          <label className="inline">
            <input type="checkbox" checked={cfg.rts} disabled={connected} onChange={(e) => setCfg({ ...cfg, rts: e.target.checked })} /> RTS
          </label>
        </div>
        <label className="inline">
          <input
            type="checkbox"
            checked={cfg.autoReconnect}
            disabled={connected}
            onChange={(e) => setCfg({ ...cfg, autoReconnect: e.target.checked })}
          />{" "}
          {t("autoReconnect")}
        </label>

        <button className={connected ? "btn danger" : "btn primary"} onClick={connected ? disconnect : connect} disabled={!cfg.port}>
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
          </label>
        )}
        {framing.kind === "fixed" && (
          <label>
            {t("length")}
            <input type="number" min={1} value={framing.len} onChange={(e) => setFraming({ ...framing, len: Number(e.target.value) || 1 })} />
          </label>
        )}
        {framing.kind !== "modbus-rtu" && (
          <label>
            {t("gapMs")}
            <input type="number" min={1} value={framing.gapMs} onChange={(e) => setFraming({ ...framing, gapMs: Number(e.target.value) || 1 })} />
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
        </div>

        <div className="log" ref={listRef}>
          <div style={{ height: rows.getTotalSize(), position: "relative" }}>
            {rows.getVirtualItems().map((r) => {
              const f = frames[r.index];
              return (
                <div
                  key={r.key}
                  className={`row ${f.dir} ${selected === r.index ? "sel" : ""}`}
                  style={{ transform: `translateY(${r.start}px)` }}
                  onClick={() => {
                    setSelected(r.index);
                    setAutoscroll(false);
                  }}
                >
                  <span className="ts">{clock(f.ts)}</span>
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
              onKeyDown={(e) => e.key === "Enter" && doSend(spec)}
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
            <button className="btn primary" onClick={() => doSend(spec)} disabled={!connected || !previewBytes}>
              {t("send")}
            </button>
          </div>
          <div className="sendrow sub">
            <span className={previewErr ? "preview err" : "preview"}>
              {t("willSend")}: {previewErr ?? (previewBytes ? `${hex(previewBytes)} (${previewBytes.length})` : "")}
            </span>
            <span className="grow" />
            <label className="inline">
              <input type="checkbox" checked={repeating} disabled={!connected} onChange={(e) => setRepeating(e.target.checked)} /> {t("repeat")}
            </label>
            <input className="num" type="number" min={10} value={repeatMs} onChange={(e) => setRepeatMs(Number(e.target.value) || 1000)} />
            <button className="btn small" onClick={addCommand} disabled={!previewBytes}>
              + {t("commands")}
            </button>
          </div>
          {error && <div className="error">{error}</div>}
        </div>
      </main>

      <aside className="right">
        <h3>{t("commands")}</h3>
        <div className="cmds">
          {commands.map((c, i) => (
            <div key={i} className="cmd" onDoubleClick={() => doSend(c)} title={c.text}>
              <input
                className="cmdname"
                value={c.name}
                onChange={(e) => setCommands(commands.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
              <button className="btn small" onClick={() => doSend(c)} disabled={!connected}>
                ▶
              </button>
              <button className="btn small ghost" onClick={() => setSpec({ text: c.text, mode: c.mode, checksum: c.checksum, suffix: c.suffix })}>
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
              {selFrame.dir.toUpperCase()} · {clock(selFrame.ts)} · {selFrame.bytes.length} {t("bytes")}
            </div>
            <pre className="dump">{hex(selFrame.bytes)}</pre>
            <pre className="dump">{ascii(selFrame.bytes)}</pre>
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
    </div>
  );
}
