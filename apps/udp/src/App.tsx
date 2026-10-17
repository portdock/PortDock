import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { save } from "@tauri-apps/plugin-dialog";
import { load, store } from "@shared/framing";
import {
  api,
  ascii,
  CHECKSUMS,
  clock,
  hex,
  type ChecksumKind,
  type Frame,
  type Peer,
  type SendSpec,
  type SessionEvent,
  type TextMode,
  type UdpConfig,
} from "./api";
import { dict, type Key, type Lang } from "./i18n";
import "./App.css";

const MAX_FRAMES = 100_000;
type Status = "idle" | "listening" | "closed";
type ViewMode = "hex" | "ascii" | "both";
interface Command extends SendSpec {
  name: string;
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => load("lang", navigator.language.startsWith("ko") ? "ko" : "en"));
  const t = useCallback((k: Key) => dict[lang][k], [lang]);

  // ---- 설정
  const [cfg, setCfg] = useState<UdpConfig>(() =>
    load("cfg", {
      bindHost: "0.0.0.0",
      bindPort: 5000,
      remoteHost: "192.168.0.10",
      remotePort: 5000,
      broadcast: false,
      multicastGroup: "",
      multicastIf: "0.0.0.0",
      echo: false,
    }),
  );
  const [rxCheck, setRxCheck] = useState<ChecksumKind | null>(() => load("rxCheck", null));
  useEffect(() => {
    store("cfg", cfg);
  }, [cfg]);
  useEffect(() => {
    store("rxCheck", rxCheck);
  }, [rxCheck]);

  // ---- 세션
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [local, setLocal] = useState<string | null>(null);
  const [senders, setSenders] = useState<Peer[]>([]);
  const [to, setTo] = useState<string>("");
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
      if (e.state === "closed") setRunning(false);
    } else if (e.type === "peers") {
      setSenders(e.peers);
    } else {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (running) api.setRxCheck(rxCheck).catch((e) => setError(String(e)));
  }, [running, rxCheck]);
  useEffect(() => {
    if (running) api.setEcho(cfg.echo).catch(() => {});
  }, [running, cfg.echo]);
  // 실행 중 기본 대상 바꾸기
  useEffect(() => {
    if (!running || !cfg.remoteHost || !cfg.remotePort) return;
    const id = setTimeout(() => api.setRemote(cfg.remoteHost, cfg.remotePort).catch((e) => setError(String(e))), 400);
    return () => clearTimeout(id);
  }, [running, cfg.remoteHost, cfg.remotePort]);

  async function start() {
    setError(null);
    try {
      setLocal(await api.start(cfg, rxCheck, onEvent));
      setRunning(true);
      setSenders([]);
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
    const path = await save({ defaultPath: `portdock-udp-${stamp}.log`, filters: [{ name: "Log", extensions: ["log", "txt"] }] });
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
    const path = await save({ defaultPath: "portdock-udp-view.txt", filters: [{ name: "Text", extensions: ["txt", "log"] }] });
    if (!path) return;
    const text = framesRef.current
      .map((f) => (f.dir === "ev" ? `${clock(f.ts)} EV ${f.note ?? ""}` : `${clock(f.ts)} ${f.dir.toUpperCase()} [${f.peer ?? ""}] ${hex(f.bytes)}`))
      .join("\n");
    await api.writeText(path, text).catch((e) => setError(String(e)));
  }

  // ---- 보내기
  const [spec, setSpec] = useState<SendSpec>(() => load("spec", { text: "", mode: "hex", checksum: null, suffix: "" }));
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
  const canSend = running && !!previewBytes;
  const doSend = useCallback(
    async (s: SendSpec) => {
      try {
        await api.send(to || null, s);
        setError(null);
      } catch (e) {
        setError(String(e));
        setRepeating(false);
      }
    },
    [to],
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
  const num = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Number(v) || 0));

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>UDP</small>
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

        <label>{t("local")}</label>
        <div className="grid2">
          <label>
            {t("bindHost").split(" (")[0]}
            <input value={cfg.bindHost} disabled={running} title={t("bindHost")} onChange={(e) => setCfg({ ...cfg, bindHost: e.target.value.trim() })} />
          </label>
          <label>
            {t("bindPort").split(" (")[0]}
            <input type="number" value={cfg.bindPort} disabled={running} title={t("bindPort")} onChange={(e) => setCfg({ ...cfg, bindPort: num(e.target.value, 0, 65535) })} />
          </label>
        </div>
        <label>{t("remote")}</label>
        <div className="grid2">
          <label>
            {t("remoteHost")}
            <input value={cfg.remoteHost} onChange={(e) => setCfg({ ...cfg, remoteHost: e.target.value.trim() })} />
          </label>
          <label>
            {t("remotePort")}
            <input type="number" value={cfg.remotePort} onChange={(e) => setCfg({ ...cfg, remotePort: num(e.target.value, 0, 65535) })} />
          </label>
        </div>
        <label className="inline">
          <input type="checkbox" checked={cfg.broadcast} disabled={running} onChange={(e) => setCfg({ ...cfg, broadcast: e.target.checked })} /> {t("broadcast")}
        </label>
        <label>
          {t("multicast")}
          <input value={cfg.multicastGroup} disabled={running} placeholder="—" onChange={(e) => setCfg({ ...cfg, multicastGroup: e.target.value.trim() })} />
        </label>
        {cfg.multicastGroup && (
          <label>
            {t("multicastIf")}
            <input value={cfg.multicastIf} disabled={running} onChange={(e) => setCfg({ ...cfg, multicastIf: e.target.value.trim() })} />
          </label>
        )}
        <label className="inline">
          <input type="checkbox" checked={cfg.echo} onChange={(e) => setCfg({ ...cfg, echo: e.target.checked })} /> {t("echo")}
        </label>
        <button className={running ? "btn danger" : "btn primary"} onClick={running ? stop : start}>
          {running ? t("stop") : t("start")}
        </button>
        <div className={`status s-${status === "listening" ? "connected" : status}`}>
          {t(`status_${status}` as Key)}
          {running && local ? ` · ${local}` : ""}
        </div>
        {running && cfg.multicastGroup && (
          <button className="btn small" onClick={() => api.rejoin().catch((e) => setError(String(e)))} title={t("rejoinHint")}>
            {t("rejoin")} {cfg.multicastGroup}
          </button>
        )}
        <div className="hint">{t("firewallHint")}</div>

        {running && (
          <>
            <label>{t("senders")}</label>
            {senders.length === 0 && <div className="hint">{t("noSenders")}</div>}
            {senders.map((p) => (
              <div key={p.addr} className="peer">
                <span className="mono">{p.addr}</span>
                <button className="btn small ghost" onClick={() => setTo(p.addr)}>
                  {t("useAsRemote")}
                </button>
              </div>
            ))}
          </>
        )}

        <hr />
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
                  <span className="peeraddr">{f.peer}</span>
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
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">
                {t("toRemote")} ({cfg.remoteHost}:{cfg.remotePort})
              </option>
              <option value="last">{t("toLast")}</option>
              {senders
                .filter((p) => p.addr !== `${cfg.remoteHost}:${cfg.remotePort}`)
                .map((p) => (
                  <option key={p.addr} value={p.addr}>
                    {p.addr}
                  </option>
                ))}
              {to && to !== "last" && !senders.some((p) => p.addr === to) && <option value={to}>{to}</option>}
            </select>
            <select value={spec.mode} onChange={(e) => setSpec({ ...spec, mode: e.target.value as TextMode })}>
              <option value="hex">HEX</option>
              <option value="ascii">ASCII</option>
            </select>
            <input
              className="sendtext"
              value={spec.text}
              placeholder={spec.mode === "hex" ? "01 02 03 04" : "PING"}
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
              <button className="btn small" onClick={() => doSend(c)} disabled={!running}>
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
