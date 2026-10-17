import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { save } from "@tauri-apps/plugin-dialog";
import { hexList, load, store } from "@shared/framing";
import {
  api,
  ascii,
  CHECKSUMS,
  clock,
  hex,
  type ChecksumKind,
  type Frame,
  type FrameMode,
  type Peer,
  type SendSpec,
  type SessionEvent,
  type TcpConfig,
  type TextMode,
} from "./api";
import { dict, type Key, type Lang } from "./i18n";
import "./App.css";

const MAX_FRAMES = 100_000;
type Status = "idle" | "listening" | "connected" | "disconnected" | "reconnecting" | "closed";
type ViewMode = "hex" | "ascii" | "both";
interface Command extends SendSpec {
  name: string;
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => load("lang", navigator.language.startsWith("ko") ? "ko" : "en"));
  const t = useCallback((k: Key) => dict[lang][k], [lang]);

  // ---- 설정
  const [cfg, setCfg] = useState<TcpConfig>(() =>
    load("cfg", { mode: "client", host: "192.168.0.10", port: 502, noDelay: true, autoReconnect: true, reconnectMs: 2000, echo: false }),
  );
  const [framing, setFraming] = useState<FrameMode>(() => load("framing", { kind: "gap", gapMs: 20 }));
  const [terminatorText, setTerminatorText] = useState(() => load("terminatorText", "0D 0A"));
  const [rxCheck, setRxCheck] = useState<ChecksumKind | null>(() => load("rxCheck", null));
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
  const effFraming: FrameMode = framing.kind === "terminator" ? { ...framing, bytes: hexList(terminatorText) } : framing;

  // ---- 세션
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [local, setLocal] = useState<string | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [target, setTarget] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logPath, setLogPath] = useState<string | null>(null);
  const framesRef = useRef<Frame[]>([]);
  const counters = useRef({ rx: 0, tx: 0 });
  const [version, setVersion] = useState(0);

  const onEvent = useCallback((e: SessionEvent) => {
    if (e.type === "frames") {
      for (const f of e.frames) {
        framesRef.current.push(f);
        if (f.dir !== "ev") counters.current[f.dir] += f.bytes.length;
      }
      if (framesRef.current.length > MAX_FRAMES) framesRef.current.splice(0, framesRef.current.length - MAX_FRAMES);
      setVersion((v) => v + 1);
    } else if (e.type === "status") {
      setStatus(e.state);
      setStatusMsg(e.message ?? (e.port || null));
      if (e.state === "closed") setRunning(false);
    } else if (e.type === "peers") {
      setPeers(e.peers);
      setTarget((cur) => (cur != null && !e.peers.some((p) => p.id === cur) ? null : cur));
    } else {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (running) api.setFraming(effFraming, rxCheck).catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, JSON.stringify(effFraming), rxCheck]);
  useEffect(() => {
    if (running && cfg.mode === "server") api.setEcho(cfg.echo).catch(() => {});
  }, [running, cfg.echo, cfg.mode]);

  async function start() {
    setError(null);
    try {
      const l = await api.start(cfg, effFraming, rxCheck, onEvent);
      setLocal(l);
      setRunning(true);
    } catch (e) {
      setError(String(e));
    }
  }
  async function stop() {
    await api.stop();
    setRunning(false);
    setStatus("closed");
    setPeers([]);
    setLogPath(null);
  }
  async function toggleLog() {
    if (logPath) {
      await api.setLog(null);
      setLogPath(null);
      return;
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const path = await save({ defaultPath: `portdock-tcp-${stamp}.log`, filters: [{ name: "Log", extensions: ["log", "txt"] }] });
    if (!path) return;
    await api.setLog(path).then(() => setLogPath(path)).catch((e) => setError(String(e)));
  }

  // ---- 보기
  const [view, setView] = useState<ViewMode>(() => load("view", "hex"));
  const [autoscroll, setAutoscroll] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => {
    store("view", view);
  }, [view]);
  const frames = framesRef.current;
  const listRef = useRef<HTMLDivElement>(null);
  const rows = useVirtualizer({ count: frames.length, getScrollElement: () => listRef.current, estimateSize: () => 22, overscan: 20 });
  useEffect(() => {
    if (autoscroll && frames.length) rows.scrollToIndex(frames.length - 1, { align: "end" });
  }, [version, autoscroll, frames.length, rows]);
  function clearLog() {
    framesRef.current = [];
    counters.current = { rx: 0, tx: 0 };
    setSelected(null);
    setVersion((v) => v + 1);
  }
  async function saveView() {
    const path = await save({ defaultPath: "portdock-tcp-view.txt", filters: [{ name: "Text", extensions: ["txt", "log"] }] });
    if (!path) return;
    const text = framesRef.current
      .map((f) => (f.dir === "ev" ? `${clock(f.ts)} EV ${f.note ?? ""}` : `${clock(f.ts)} ${f.dir.toUpperCase()} [${f.peer ?? ""}] ${hex(f.bytes)}`))
      .join("\n");
    await api.writeText(path, text).catch((e) => setError(String(e)));
  }

  // ---- 보내기
  const [spec, setSpec] = useState<SendSpec>(() => load("spec", { text: "", mode: "ascii", checksum: null, suffix: "\\r\\n" }));
  const [previewBytes, setPreviewBytes] = useState<number[] | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [repeatMs, setRepeatMs] = useState(1000);
  const [repeating, setRepeating] = useState(false);
  useEffect(() => {
    store("spec", spec);
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
  const canSend = running && peers.length > 0 && !!previewBytes;
  const doSend = useCallback(
    async (s: SendSpec) => {
      try {
        await api.send(target, s);
        setError(null);
      } catch (e) {
        setError(String(e));
        setRepeating(false);
      }
    },
    [target],
  );
  useEffect(() => {
    if (!repeating || !running) return;
    const id = setInterval(() => doSend(spec), Math.max(10, repeatMs));
    return () => clearInterval(id);
  }, [repeating, repeatMs, spec, running, doSend]);

  const [commands, setCommands] = useState<Command[]>(() => load("commands", []));
  useEffect(() => {
    store("commands", commands);
  }, [commands]);

  const sel = selected != null ? frames[selected] : undefined;
  const server = cfg.mode === "server";

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>TCP</small>
          </span>
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
        </div>

        <label>
          {t("mode")}
          <select value={cfg.mode} disabled={running} onChange={(e) => {
            const mode = e.target.value as TcpConfig["mode"];
            setCfg({ ...cfg, mode, host: mode === "server" ? "0.0.0.0" : cfg.host === "0.0.0.0" ? "192.168.0.10" : cfg.host });
          }}>
            <option value="client">{t("client")}</option>
            <option value="server">{t("server")}</option>
          </select>
        </label>
        <label>
          {server ? t("bindHost") : t("host")}
          <input value={cfg.host} disabled={running} onChange={(e) => setCfg({ ...cfg, host: e.target.value.trim() })} />
        </label>
        <label>
          {t("port")}
          <input
            type="number"
            min={0}
            max={65535}
            value={cfg.port}
            disabled={running}
            onChange={(e) => setCfg({ ...cfg, port: Math.min(65535, Math.max(0, Number(e.target.value) || 0)) })}
          />
        </label>
        <label className="inline">
          <input type="checkbox" checked={cfg.noDelay} disabled={running} onChange={(e) => setCfg({ ...cfg, noDelay: e.target.checked })} /> {t("noDelay")}
        </label>
        {server ? (
          <label className="inline">
            <input type="checkbox" checked={cfg.echo} onChange={(e) => setCfg({ ...cfg, echo: e.target.checked })} /> {t("echo")}
          </label>
        ) : (
          <>
            <label className="inline">
              <input type="checkbox" checked={cfg.autoReconnect} disabled={running} onChange={(e) => setCfg({ ...cfg, autoReconnect: e.target.checked })} />{" "}
              {t("autoReconnect")}
            </label>
            {cfg.autoReconnect && (
              <label>
                {t("reconnectMs")}
                <input
                  type="number"
                  min={200}
                  value={cfg.reconnectMs}
                  disabled={running}
                  onChange={(e) => setCfg({ ...cfg, reconnectMs: Math.max(200, Number(e.target.value) || 2000) })}
                />
              </label>
            )}
          </>
        )}
        <button className={running ? "btn danger" : "btn primary"} onClick={running ? stop : start}>
          {running ? t("stop") : server ? t("listen") : t("connect")}
        </button>
        <div className={`status s-${status === "listening" ? "connected" : status}`}>
          {t(`status_${status}` as Key)}
          {local && status === "listening" ? ` · ${local}` : statusMsg ? ` · ${statusMsg}` : ""}
        </div>
        {server && <div className="hint">{t("firewallHint")}</div>}

        {server && running && (
          <>
            <label>{t("peers")}</label>
            {peers.length === 0 && <div className="hint">{t("noPeers")}</div>}
            {peers.map((p) => (
              <div key={p.id} className="peer">
                <span className="mono">{p.addr}</span>
                <button className="btn small ghost" onClick={() => api.kick(p.id)}>
                  {t("kick")}
                </button>
              </div>
            ))}
          </>
        )}

        <hr />
        <label>
          {t("framing")}
          <select
            value={framing.kind}
            onChange={(e) => {
              const k = e.target.value;
              setFraming(
                k === "terminator" ? { kind: "terminator", bytes: [], gapMs: 100 } : k === "fixed" ? { kind: "fixed", len: 8, gapMs: 100 } : { kind: "gap", gapMs: 20 },
              );
            }}
          >
            <option value="gap">{t("fmGap")}</option>
            <option value="terminator">{t("fmTerminator")}</option>
            <option value="fixed">{t("fmFixed")}</option>
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
        <button className="btn" onClick={toggleLog} disabled={!running}>
          {logPath ? t("stopLog") : t("logToFile")}
        </button>
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
            {t("saveView")}
          </button>
          <button className="btn small" onClick={clearLog}>
            {t("clear")}
          </button>
        </div>

        <div className="log" ref={listRef}>
          <div style={{ height: rows.getTotalSize(), position: "relative" }}>
            {rows.getVirtualItems().map((r) => {
              const f = frames[r.index];
              const cls = `row ${f.dir} ${selected === r.index ? "sel" : ""}`;
              const style = { transform: `translateY(${r.start}px)` };
              const pick = () => {
                setSelected(r.index);
                setAutoscroll(false);
              };
              if (f.dir === "ev")
                return (
                  <div key={r.key} className={cls} style={style} onClick={pick}>
                    <span className="ts">{clock(f.ts)}</span>
                    <span className="dir">EV</span>
                    <span className="note">{f.note}</span>
                  </div>
                );
              return (
                <div key={r.key} className={cls} style={style} onClick={pick}>
                  <span className="ts">{clock(f.ts)}</span>
                  <span className="dir">{f.dir === "rx" ? "RX ◀" : "TX ▶"}</span>
                  {server && <span className="peeraddr">{f.peer}</span>}
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
            {server && (
              <select value={target ?? ""} onChange={(e) => setTarget(e.target.value ? Number(e.target.value) : null)} title={t("target")}>
                <option value="">{t("all")}</option>
                {peers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.addr}
                  </option>
                ))}
              </select>
            )}
            <select value={spec.mode} onChange={(e) => setSpec({ ...spec, mode: e.target.value as TextMode })}>
              <option value="hex">HEX</option>
              <option value="ascii">ASCII</option>
            </select>
            <input
              className="sendtext"
              value={spec.text}
              placeholder={spec.mode === "hex" ? "01 03 00 00 00 0A" : "STATUS?"}
              onChange={(e) => setSpec({ ...spec, text: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && canSend && doSend(spec)}
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
              <option value="\r">CR</option>
              <option value="\n">LF</option>
              <option value="\r\n">CR LF</option>
            </select>
            <button className="btn primary" onClick={() => doSend(spec)} disabled={!canSend}>
              {t("send")}
            </button>
          </div>
          <div className="sendrow sub">
            <span className={previewErr ? "preview err" : "preview"}>
              {t("willSend")}: {previewErr ?? (previewBytes ? `${hex(previewBytes)} (${previewBytes.length})` : "")}
            </span>
            <span className="grow" />
            <label className="inline">
              <input type="checkbox" checked={repeating} disabled={!canSend} onChange={(e) => setRepeating(e.target.checked)} /> {t("repeat")}
            </label>
            <input className="num" type="number" min={10} value={repeatMs} onChange={(e) => setRepeatMs(Number(e.target.value) || 1000)} />
            <button className="btn small" onClick={() => setCommands([...commands, { ...spec, name: spec.text.slice(0, 24) || "cmd" }])} disabled={!previewBytes}>
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
            <div key={i} className="cmd" onDoubleClick={() => canSend && doSend(c)} title={c.text}>
              <input className="cmdname" value={c.name} onChange={(e) => setCommands(commands.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <button className="btn small" onClick={() => doSend(c)} disabled={!running || peers.length === 0}>
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
        {!sel && <div className="hint">{t("selectFrame")}</div>}
        {sel && (
          <div className="detail">
            <div>
              {sel.dir.toUpperCase()} · {clock(sel.ts)}
              {sel.peer ? ` · ${sel.peer}` : ""}
              {sel.dir !== "ev" && ` · ${sel.bytes.length} ${t("bytes")}`}
            </div>
            {sel.dir === "ev" ? (
              <pre className="dump">{sel.note}</pre>
            ) : (
              <>
                <pre className="dump">{hex(sel.bytes)}</pre>
                <pre className="dump">{ascii(sel.bytes)}</pre>
              </>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
