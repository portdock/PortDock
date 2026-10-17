import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { save } from "@tauri-apps/plugin-dialog";
import { load, store } from "@shared/framing";
import {
  api,
  ascii,
  CHECKSUMS,
  hex,
  type ChecksumKind,
  type Frame,
  type Peer,
  type SendSpec,
  type SessionEvent,
  type TextMode,
  type UdpConfig,
} from "./api";
import { autoLogPath, formatTime, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { looksBroadcast } from "@shared/interlocks";
import { dict, type Key, type Lang } from "./i18n";
import "./App.css";

type Status = "idle" | "listening" | "closed";
type ViewMode = "hex" | "ascii" | "both";
interface Command extends SendSpec {
  name: string;
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
      if (framesRef.current.length > maxLines.current) framesRef.current.splice(0, framesRef.current.length - maxLines.current);
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
      if (settings.autoLog && settings.logFolder) {
        const p = autoLogPath(settings.logFolder, "udp");
        await api.setLog(p).then(() => setLogPath(p)).catch((e) => setError(String(e)));
      }
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
  const [autoscroll, setAutoscroll] = useState(settings.autoScroll);
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
      .map((f) => (f.dir === "ev" ? `${fmt(f.ts)} EV ${f.note ?? ""}` : `${fmt(f.ts)} ${f.dir.toUpperCase()} [${f.peer ?? ""}] ${hex(f.bytes)}`))
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
  // 인터락: 기본 대상이 브로드캐스트 주소인데 허용이 꺼져 있으면 운영체제가 거절한다
  const bcastBlocked = to === "" && looksBroadcast(cfg.remoteHost) && !cfg.broadcast;
  const noRemote = to === "" && (!cfg.remoteHost || cfg.remotePort === 0);
  const canSend = running && !!previewBytes && !bcastBlocked && !noRemote;
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

  const fmt = (ts: number) => formatTime(ts, settings.timeFormat, framesRef.current[0]?.ts ?? ts);
  useExitGuard(running || !!logPath, settings.confirmExit, lang, "PortDock UDP");

  return (
    <div className={showRight ? "app three show-right" : "app three"}>
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>UDP</small>
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

        <label>{t("local")}</label>
        <div className="grid2">
          <label>
            {t("bindHost").split(" (")[0]}
            <input value={cfg.bindHost} disabled={running} title={t("bindHost")} onChange={(e) => setCfg({ ...cfg, bindHost: e.target.value.trim() })} />
          </label>
          <label>
            {t("bindPort").split(" (")[0]}
            <NumInput min={0} max={65535} value={cfg.bindPort} disabled={running} title={t("bindPort")} onValue={(n) => setCfg({ ...cfg, bindPort: n })} />
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
            <NumInput min={0} max={65535} value={cfg.remotePort} onValue={(n) => setCfg({ ...cfg, remotePort: n })} />
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
          <button className="btn small narrow-only" onClick={() => setShowRight(!showRight)} title={t("commands")}>
            ☰ {t("commands")}
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
                    <span className="ts">{fmt(f.ts)}</span>
                    <span className="dir">EV</span>
                    <span className="note">{f.note}</span>
                  </div>
                );
              return (
                <div key={r.key} className={cls} style={style} onClick={pick}>
                  <span className="ts">{fmt(f.ts)}</span>
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
            <NumInput className="num" min={10} max={3600000} value={repeatMs} onValue={setRepeatMs} />
            <button className="btn small" onClick={() => setCommands([...commands, { ...spec, name: spec.text.slice(0, 24) || "cmd" }])} disabled={!previewBytes}>
              + {t("commands")}
            </button>
          </div>
          {bcastBlocked && <div className="interlock">{t("ilBcast")}</div>}
          {noRemote && running && <div className="interlock">{t("ilNoRemote")}</div>}
          {error && <div className="error">{error}</div>}
        </div>
      </main>

      {showRight && <div className="backdrop narrow-only" onClick={() => setShowRight(false)} />}
      <aside className="right">
        <button className="btn small narrow-only close-right" onClick={() => setShowRight(false)}>
          ✕
        </button>
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
              {sel.dir.toUpperCase()} · {fmt(sel.ts)}
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
      {showSettings && (
        <SettingsDialog
          app="PortDock UDP"
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
