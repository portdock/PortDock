import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ask, save } from "@tauri-apps/plugin-dialog";
import { load, parseTerminator, store, trimFrames } from "@shared/framing";
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
import { autoLogPath, formatTime, rowHeight, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { FailCount, filterDesc, LogFilterBar, useLogFilter } from "@shared/LogFilter";
import { screenText } from "@shared/logSearch";
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
  // 끝 문자 칸 해석 — 틀리면 bytes 가 비고 error 에 이유(화면에 빨갛게)
  const term = parseTerminator(terminatorText, lang);
  const effFraming: FrameMode = framing.kind === "terminator" ? { ...framing, bytes: term.bytes } : framing;

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
  // 일부 상대에게만 보냈을 때 알림(오류는 아님)
  const [sendNote, setSendNote] = useState<string | null>(null);
  // 화면에 보인 오류는 «문제 보고» 에 넣을 수 있게 모아 둔다
  useEffect(() => {
    if (error) noteError(error);
  }, [error]);
  const [logPath, setLogPath] = useState<string | null>(null);
  const framesRef = useRef<Frame[]>([]);
  const timeBase = useRef<number | null>(null);
  // 줄마다 일련번호 — 앞을 잘라내도 선택한 줄이 다른 줄로 바뀌지 않게
  const seqRef = useRef(0);
  const screenBytes = useRef(0);
  const counters = useRef({ rx: 0, tx: 0, fail: 0 });
  const [version, setVersion] = useState(0);

  const onEvent = useCallback((e: SessionEvent) => {
    if (e.type === "frames") {
      for (const f of e.frames) {
        f.seq = ++seqRef.current;
        framesRef.current.push(f);
        screenBytes.current += f.bytes.length;
        if (f.dir !== "ev") counters.current[f.dir] += f.bytes.length;
        if (f.check === false) counters.current.fail++;
      }
      screenBytes.current = trimFrames(framesRef.current, maxLines.current, screenBytes.current);
      setVersion((v) => v + 1);
    } else if (e.type === "status") {
      setStatus(e.state);
      // 백엔드가 준 설명(재접속 대기·멈춤의 마지막 실패 이유 등)을 먼저 보인다
      setStatusMsg(e.message || e.port || null);
      if (e.state === "closed") setRunning(false);
      // 끊기면 반복을 끈다 — 다시 붙었을 때 저절로 보내지 않게
      if (e.state !== "connected" && e.state !== "listening") setRepeating(false);
    } else if (e.type === "peers") {
      // 고른 상대가 방금 끊겼으면 반복을 멈추고 기록에 남긴다(다른 장비로 새지 않게)
      const cur = targetRef.current;
      if (cur && peersRef.current.some((p) => p.id === cur.id) && !e.peers.some((p) => p.id === cur.id) && repeatingRef.current) {
        const note = dict[langRef.current].evTargetGone.replace("{a}", cur.addr);
        framesRef.current.push({ ts: Date.now(), dir: "ev", bytes: [], check: null, note, seq: ++seqRef.current });
        setVersion((v) => v + 1);
        setRepeating(false);
      }
      peersRef.current = e.peers;
      setPeers(e.peers);
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
    peersRef.current = [];
    setTarget(null);
    setSendNote(null);
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
  // 찾기·거르기 — 보기만 거른다(기록은 그대로)
  const filter = useLogFilter(frames, version);
  const rows = useVirtualizer({ count: filter.count, getScrollElement: () => listRef.current, estimateSize: () => rowHeight(settings.fontSize), overscan: 20 });
  // 글자 크기를 바꾸면 줄 높이를 다시 잰다
  useEffect(() => {
    rows.measure();
  }, [settings.fontSize, rows]);
  useEffect(() => {
    if (autoscroll && filter.count) rows.scrollToIndex(filter.count - 1, { align: "end" });
  }, [version, autoscroll, filter.count, rows]);
  // 찾은 줄로 — 고르고 가운데로 굴린다
  const jumpTo = useCallback(
    (seq: number) => {
      setSelected(seq);
      setAutoscroll(false);
      const i = filter.indexOfSeq(seq);
      if (i >= 0) rows.scrollToIndex(i, { align: "center" });
    },
    [filter, rows],
  );
  function clearLog() {
    framesRef.current = [];
    counters.current = { rx: 0, tx: 0, fail: 0 };
    screenBytes.current = 0;
    setSelected(null);
    setVersion((v) => v + 1);
  }
  async function saveView() {
    const path = await save({ defaultPath: "portdock-tcp-view.txt", filters: [{ name: "Text", extensions: ["txt", "log"] }] });
    if (!path) return;
    // 지금 보기(HEX·ASCII·둘 다)대로, 거르기가 켜져 있으면 보이는 줄만
    const text = screenText({ app: "PortDock TCP", frames: framesRef.current, view: filter.view, mode: view, fmt, hex, ascii, filterDesc: filterDesc(filter.state, lang), lang, peers: true });
    await api.writeText(path, text).catch((e) => setError(String(e)));
  }

  // ---- 보내기
  const [spec, setSpec] = useState<SendSpec>(() => load("spec", { text: "", mode: "ascii", checksum: null, suffix: "\\r\\n" }));
  const [previewBytes, setPreviewBytes] = useState<number[] | null>(null);
  // 보내기 버튼 뒤 입력칸으로 돌아가 바로 이어 쓸 수 있게
  const sendInput = useRef<HTMLInputElement>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [repeatMs, setRepeatMs] = useState(1000);
  const [repeating, setRepeating] = useState(false);
  const repeatingRef = useRef(repeating);
  repeatingRef.current = repeating;
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
  // 고른 상대가 끊겼으면 보내지 않는다 — 말없이 «모두에게» 로 바뀌면 엉뚱한 장비로 나간다
  const targetGone = !!target && !peers.some((p) => p.id === target.id);
  // 같은 IP 로 다시 붙은 상대 — 저절로 바꾸지 않고 고르게 한다
  const targetBack = targetGone && target ? peers.find((p) => p.addr.replace(/:\d+$/, "") === target.addr.replace(/:\d+$/, "")) : undefined;
  const canSend = running && peers.length > 0 && sendable && !targetGone;
  // 클라이언트는 주소와 포트(1~65535)가 있어야 접속할 수 있다
  const startable = cfg.mode === "server" || (!!cfg.host.trim() && cfg.port > 0);
  // 앞 송신이 끝나기 전엔 반복의 이번 차례를 건너뛴다
  const inflight = useRef(false);
  const doSend = useCallback(
    async (s: SendSpec) => {
      if (inflight.current || targetGone) return;
      inflight.current = true;
      try {
        const r = await api.send(target?.id ?? null, s);
        setError(null);
        // 일부 상대에게만 나갔으면 알린다(예: 3개 중 2개)
        setSendNote(r && typeof r === "object" && r.sent < r.total ? t("partialSend").replace("{s}", String(r.sent)).replace("{t}", String(r.total)) : null);
      } catch (e) {
        setError(String(e));
        setRepeating(false);
      } finally {
        inflight.current = false;
      }
    },
    [target, targetGone, t],
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

  // «지난 시간» 기준 — 오래된 줄이 화면에서 잘려도 바뀌지 않게 첫 기록 시각을 잡아 두고, 지우면 다시 잡는다
  if (!framesRef.current.length) timeBase.current = null;
  else if (timeBase.current === null) timeBase.current = framesRef.current[0].ts;
  const fmt = (ts: number) => formatTime(ts, settings.timeFormat, timeBase.current ?? ts);
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
        <label data-tip={tip(lang, "netPort")}>
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
        {/* 접속 버튼이 꺼진 이유 */}
        {!running && !startable && <div className="interlock">{t("ilClientAddr")}</div>}

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
          <FailCount lang={lang} n={counters.current.fail} filter={filter} />
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

        <LogFilterBar lang={lang} filter={filter} selected={selected} total={frames.length} onJump={jumpTo} />

        <div className="log" ref={listRef}>
          {frames.length === 0 && <div className="empty-guide">{t("emptyGuide")}</div>}
          <div style={{ height: rows.getTotalSize(), position: "relative" }}>
            {rows.getVirtualItems().map((r) => {
              const f = filter.at(r.index);
              if (!f) return null;
              const cls = `row ${f.dir}${filter.isHit(f.seq) ? " hit" : ""} ${selected === f.seq ? "sel" : ""}`;
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
            <select value={spec.mode} onChange={(e) => setSpec({ ...spec, mode: e.target.value as TextMode })}>
              <option value="hex">HEX</option>
              <option value="ascii">ASCII</option>
            </select>
            <input
              ref={sendInput}
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
              <option value="\r">{t("suffix")}: CR</option>
              <option value="\n">{t("suffix")}: LF</option>
              <option value="\r\n">{t("suffix")}: CR LF</option>
            </select>
            <button data-tip={tip(lang, "send")} className="btn primary" onClick={() => {
                doSend(spec);
                sendInput.current?.focus();
              }} disabled={!canSend}>
              {t("send")}
            </button>
          </div>
          <div className="sendrow sub">
            {!running ? (
              <span className="why">{t("whyNotStarted")}</span>
            ) : peers.length === 0 ? (
              <span className="why">{t("whyNoPeers")}</span>
            ) : targetGone ? (
              <span className="why">{t("whyTargetGone")}</span>
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
            <button className="btn small" onClick={() => setCommands([...commands, { ...spec, name: spec.text.slice(0, 24) || "cmd" }])} disabled={!sendable}>
              + {t("addCommand")}
            </button>
          </div>
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
        <button className="btn small narrow-only close-right" onClick={() => setShowRight(false)} title={t("close")}>
          ✕
        </button>
        <h3>{t("commands")}</h3>
        <div className="cmds">
          {commands.map((c, i) => (
            <div key={i} className="cmd" title={c.text}>
              <input className="cmdname" value={c.name} onChange={(e) => setCommands(commands.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <button className="btn small" onClick={() => doSend(c)} disabled={!running || peers.length === 0 || targetGone} title={targetGone ? t("whyTargetGone") : t("send")}>
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
