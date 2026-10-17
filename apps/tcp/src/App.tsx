import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ask, save } from "@tauri-apps/plugin-dialog";
import { hexList, load, store, trimFrames } from "@shared/framing";
import {
  api,
  ascii,
  CHECKSUMS,
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
import { tip } from "@shared/tips";
import { ReportButton } from "@shared/ReportDialog";
import { noteError } from "@shared/report";
import { HelpDialog, useHelpKey } from "@shared/HelpDialog";
import { help } from "./help";
import { autoLogPath, formatTime, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { dict, type Key, type Lang } from "./i18n";
import "./App.css";

type Status = "idle" | "listening" | "connected" | "disconnected" | "reconnecting" | "closed";
type ViewMode = "hex" | "ascii" | "both";
interface Command extends SendSpec {
  name: string;
}

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
  // 좁은 창에서 오른쪽 칸(명령 목록·상세)을 펼칠지
  const [showRight, setShowRight] = useState(false);

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
  // 화면에 보인 오류는 «문제 보고» 에 넣을 수 있게 모아 둔다
  useEffect(() => {
    if (error) noteError(error);
  }, [error]);
  const [logPath, setLogPath] = useState<string | null>(null);
  const framesRef = useRef<Frame[]>([]);
  // 줄마다 일련번호 — 앞을 잘라내도 선택한 줄이 다른 줄로 바뀌지 않게
  const seqRef = useRef(0);
  const screenBytes = useRef(0);
  const counters = useRef({ rx: 0, tx: 0 });
  const [version, setVersion] = useState(0);

  const onEvent = useCallback((e: SessionEvent) => {
    if (e.type === "frames") {
      for (const f of e.frames) {
        f.seq = ++seqRef.current;
        framesRef.current.push(f);
        screenBytes.current += f.bytes.length;
        if (f.dir !== "ev") counters.current[f.dir] += f.bytes.length;
      }
      screenBytes.current = trimFrames(framesRef.current, maxLines.current, screenBytes.current);
      setVersion((v) => v + 1);
    } else if (e.type === "status") {
      setStatus(e.state);
      setStatusMsg(e.message ?? (e.port || null));
      if (e.state === "closed") setRunning(false);
      // 끊기면 반복을 끈다 — 다시 붙었을 때 저절로 보내지 않게
      if (e.state !== "connected" && e.state !== "listening") setRepeating(false);
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

  const [starting, setStarting] = useState(false);
  async function start() {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const l = await api.start(cfg, effFraming, rxCheck, onEvent);
      setLocal(l);
      setRunning(true);
      if (settings.autoLog && settings.logFolder) {
        const p = autoLogPath(settings.logFolder, "tcp");
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
    setStatus("closed");
    setPeers([]);
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
    const path = await save({ defaultPath: `portdock-tcp-${stamp}.log`, filters: [{ name: "Log", extensions: ["log", "txt"] }] });
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
    screenBytes.current = 0;
    setSelected(null);
    setVersion((v) => v + 1);
  }
  async function saveView() {
    const path = await save({ defaultPath: "portdock-tcp-view.txt", filters: [{ name: "Text", extensions: ["txt", "log"] }] });
    if (!path) return;
    const text = framesRef.current
      .map((f) => (f.dir === "ev" ? `${fmt(f.ts)} EV ${f.note ?? ""}` : `${fmt(f.ts)} ${f.dir.toUpperCase()} [${f.peer ?? ""}] ${hex(f.bytes)}`))
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
  const sendable = !!previewBytes && previewBytes.length > 0;
  const canSend = running && peers.length > 0 && sendable;
  // 클라이언트는 주소와 포트(1~65535)가 있어야 접속할 수 있다
  const startable = cfg.mode === "server" || (!!cfg.host.trim() && cfg.port > 0);
  // 앞 송신이 끝나기 전엔 반복의 이번 차례를 건너뛴다
  const inflight = useRef(false);
  const doSend = useCallback(
    async (s: SendSpec) => {
      if (inflight.current) return;
      inflight.current = true;
      try {
        await api.send(target, s);
        setError(null);
      } catch (e) {
        setError(String(e));
        setRepeating(false);
      } finally {
        inflight.current = false;
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

  const sel = selected != null && frames.length ? frames[selected - (frames[0].seq ?? 0)] : undefined;
  const server = cfg.mode === "server";

  const fmt = (ts: number) => formatTime(ts, settings.timeFormat, framesRef.current[0]?.ts ?? ts);
  useExitGuard(running || !!logPath, settings.confirmExit, lang, "PortDock TCP");

  return (
    <div className={showRight ? "app three show-right" : "app three"}>
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>TCP</small>
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
          <ReportButton app="PortDock TCP" lang={lang} frames={() => framesRef.current} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} />
          <button className="icon-btn" onClick={openHelp} title={t("helpTip")} aria-label={t("helpTip")}>
            ?
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title={lang === "ko" ? "설정" : "Settings"}>
            ⚙
          </button>
          </span>
        </div>

        <label data-tip={tip(lang, "mode")}>
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
        <label data-tip={tip(lang, "port")}>
          {t("port")}
          <NumInput min={0} max={65535} value={cfg.port} disabled={running} onValue={(n) => setCfg({ ...cfg, port: n })} />
        </label>
        <label data-tip={tip(lang, "noDelay")} className="inline">
          <input type="checkbox" checked={cfg.noDelay} disabled={running} onChange={(e) => setCfg({ ...cfg, noDelay: e.target.checked })} /> {t("noDelay")}
        </label>
        {server ? (
          <label data-tip={tip(lang, "echo")} className="inline">
            <input type="checkbox" checked={cfg.echo} onChange={(e) => setCfg({ ...cfg, echo: e.target.checked })} /> {t("echo")}
          </label>
        ) : (
          <>
            <label data-tip={tip(lang, "autoReconnect")} className="inline">
              <input type="checkbox" checked={cfg.autoReconnect} disabled={running} onChange={(e) => setCfg({ ...cfg, autoReconnect: e.target.checked })} />{" "}
              {t("autoReconnect")}
            </label>
            {cfg.autoReconnect && (
              <label data-tip={tip(lang, "reconnectMs")}>
                {t("reconnectMs")}
                <NumInput min={200} max={3600000} value={cfg.reconnectMs} disabled={running} onValue={(n) => setCfg({ ...cfg, reconnectMs: n })} />
              </label>
            )}
          </>
        )}
        <button data-tip={tip(lang, running ? "stop" : "run")} className={running ? "btn danger" : "btn primary"} onClick={running ? stop : start} disabled={(!running && !startable) || starting}>
          {running ? t("stop") : server ? t("listen") : t("connect")}
        </button>
        {running && <span className="lock-note">🔒 {t("lockedHint")}</span>}
        <div className={`status s-${status === "listening" ? "connected" : status}`}>
          {t(`status_${status}` as Key)}
          {local && status === "listening" ? ` · ${local}` : statusMsg ? ` · ${statusMsg}` : ""}
        </div>
        {server && <div className="hint">{t("firewallHint")}</div>}
        {server && cfg.port === 0 && <div className="interlock">{t("ilPort0")}</div>}

        {server && running && (
          <>
            <label data-tip={tip(lang, "peers")}>{t("peers")}</label>
            {peers.length === 0 && <div className="hint">{t("noPeers")}</div>}
            {peers.map((p) => (
              <div key={p.id} className="peer">
                <span className="mono">{p.addr}</span>
                <button data-tip={tip(lang, "kick")} className="btn small ghost" onClick={() => api.kick(p.id).catch((e) => setError(String(e)))}>
                  {t("kick")}
                </button>
              </div>
            ))}
          </>
        )}

        <hr />
        <label data-tip={tip(lang, "framing")}>
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
          <label data-tip={tip(lang, "terminatorHex")}>
            {t("terminatorHex")}
            <input value={terminatorText} onChange={(e) => setTerminatorText(e.target.value)} placeholder="0D 0A" />
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
          <select value={rxCheck ?? ""} onChange={(e) => setRxCheck((e.target.value || null) as ChecksumKind | null)}>
            <option value="">{t("none")}</option>
            {CHECKSUMS.map((c) => (
              <option key={c.kind} value={c.kind}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <button data-tip={tip(lang, logPath ? "stopLog" : "logToFile")} className="btn" onClick={toggleLog} disabled={!running}>
          {logPath ? t("stopLog") : t("logToFile")}
        </button>
      </aside>

      <main className="main">
        <div className="toolbar">
          <span data-tip={tip(lang, "view")}>{t("view")}</span>
          {(["hex", "ascii", "both"] as ViewMode[]).map((v) => (
            <button key={v} className={view === v ? "seg on" : "seg"} onClick={() => setView(v)}>
              {v === "both" ? t("both") : v.toUpperCase()}
            </button>
          ))}
          <label data-tip={tip(lang, "autoscroll")} className="inline">
            <input type="checkbox" checked={autoscroll} onChange={(e) => setAutoscroll(e.target.checked)} /> {t("autoscroll")}
          </label>
          <span className="grow" />
          <span className="counter">
            RX {counters.current.rx.toLocaleString()} · TX {counters.current.tx.toLocaleString()} {t("bytes")}
          </span>
          <button data-tip={tip(lang, "saveView")} className="btn small" onClick={saveView}>
            {t("saveView")}
          </button>
          <button data-tip={tip(lang, "clear")} className="btn small" onClick={clearLog}>
            {t("clear")}
          </button>
          <button data-tip={tip(lang, "commands")} className="btn small narrow-only" onClick={() => setShowRight(!showRight)} title={t("commands")}>
            ☰ {t("commands")}
          </button>
        </div>

        <div className="log" ref={listRef}>
          {frames.length === 0 && <div className="empty-guide">{t("emptyGuide")}</div>}
          <div style={{ height: rows.getTotalSize(), position: "relative" }}>
            {rows.getVirtualItems().map((r) => {
              const f = frames[r.index];
              const cls = `row ${f.dir} ${selected === f.seq ? "sel" : ""}`;
              const style = { transform: `translateY(${r.start}px)` };
              const pick = () => {
                setSelected(f.seq ?? null);
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
              <select value={target ?? ""} onChange={(e) => setTarget(e.target.value ? Number(e.target.value) : null)} data-tip={tip(lang, "target")}>
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
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && canSend && doSend(spec)}
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
            <button data-tip={tip(lang, "send")} className="btn primary" onClick={() => doSend(spec)} disabled={!canSend}>
              {t("send")}
            </button>
          </div>
          <div className="sendrow sub">
            {!running ? (
              <span className="why">{t("whyNotStarted")}</span>
            ) : peers.length === 0 ? (
              <span className="why">{t("whyNoPeers")}</span>
            ) : !sendable && !previewErr ? (
              <span className="why">{t("whyEmpty")}</span>
            ) : null}
            <span className={previewErr ? "preview err" : "preview"}>
              {t("willSend")}: {previewErr ?? (previewBytes ? `${hex(previewBytes)} (${previewBytes.length})` : "")}
            </span>
            <span className="grow" />
            <label data-tip={tip(lang, "repeat")} className="inline">
              <input type="checkbox" checked={repeating} disabled={!canSend && !repeating} onChange={(e) => setRepeating(e.target.checked)} /> {t("repeat")}
            </label>
            <NumInput className="num" min={10} max={3600000} value={repeatMs} onValue={setRepeatMs} />
            <button className="btn small" onClick={() => setCommands([...commands, { ...spec, name: spec.text.slice(0, 24) || "cmd" }])} disabled={!previewBytes}>
              + {t("commands")}
            </button>
          </div>
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
              <input className="cmdname" value={c.name} onChange={(e) => setCommands(commands.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <button className="btn small" onClick={() => doSend(c)} disabled={!running || peers.length === 0} title={t("send")}>
                ▶
              </button>
              <button className="btn small ghost" data-tip={tip(lang, "edit")} onClick={() => setSpec({ text: c.text, mode: c.mode, checksum: c.checksum, suffix: c.suffix })}>
                ✎
              </button>
              <button data-tip={tip(lang, "delete")} className="btn small ghost" onClick={async () => (await ask(t("askDelCmd").replace("{a}", c.name), { title: "PortDock", kind: "warning" })) && setCommands(commands.filter((_, j) => j !== i))} title={t("delete")}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <h3 data-tip={tip(lang, "detail")}>{t("detail")}</h3>
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
      {showHelp && <HelpDialog doc={help} lang={lang} app="PortDock TCP" onClose={() => setShowHelp(false)} />}
      {showSettings && (
        <SettingsDialog
          app="PortDock TCP"
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
