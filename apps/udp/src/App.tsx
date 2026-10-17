import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ask, save } from "@tauri-apps/plugin-dialog";
import { load, store, trimFrames } from "@shared/framing";
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
import { tip } from "@shared/tips";
import { ReportButton } from "@shared/ReportDialog";
import { noteError } from "@shared/report";
import { HelpDialog, useHelpKey } from "@shared/HelpDialog";
import { help } from "./help";
import { autoLogPath, formatTime, rowHeight, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { looksBroadcast } from "@shared/interlocks";
import { FailCount, filterDesc, LogFilterBar, useLogFilter } from "@shared/LogFilter";
import { screenText } from "@shared/logSearch";
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
  // 실제로 적용된 기본 대상(«주소:포트»). 실행 중 바꾸기가 실패하면 이전 값 그대로 남고 remoteErr 에 이유
  const [applied, setApplied] = useState<string | null>(null);
  const [remoteErr, setRemoteErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      if (e.state === "closed") setRunning(false);
      // 끊기면 반복을 끈다 — 다시 붙었을 때 저절로 보내지 않게
      if (e.state === "closed") setRepeating(false);
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
    const want = `${cfg.remoteHost}:${cfg.remotePort}`;
    if (want === applied) {
      setRemoteErr(null);
      return;
    }
    const id = setTimeout(
      () =>
        api
          .setRemote(cfg.remoteHost, cfg.remotePort)
          .then(() => {
            setApplied(want);
            setRemoteErr(null);
          })
          .catch((e) => setRemoteErr(String(e))),
      400,
    );
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, cfg.remoteHost, cfg.remotePort]);

  const [starting, setStarting] = useState(false);
  async function start() {
    if (starting) return;
    setStarting(true);
    setError(null);
    setSenders([]);
    try {
      setLocal(await api.start(cfg, rxCheck, onEvent));
      setApplied(`${cfg.remoteHost}:${cfg.remotePort}`);
      setRemoteErr(null);
      setRunning(true);
      if (settings.autoLog && settings.logFolder) {
        const p = autoLogPath(settings.logFolder, "udp");
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
    setTo("");
    setApplied(null);
    setRemoteErr(null);
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
    const path = await save({ defaultPath: "portdock-udp-view.txt", filters: [{ name: "Text", extensions: ["txt", "log"] }] });
    if (!path) return;
    // 지금 보기(HEX·ASCII·둘 다)대로, 거르기가 켜져 있으면 보이는 줄만
    const text = screenText({ app: "PortDock UDP", frames: framesRef.current, view: filter.view, mode: view, fmt, hex, ascii, filterDesc: filterDesc(filter.state, lang), lang, peers: true });
    await api.writeText(path, text).catch((e) => setError(String(e)));
  }

  // ---- 보내기
  const [spec, setSpec] = useState<SendSpec>(() => load("spec", { text: "", mode: "hex", checksum: null, suffix: "" }));
  const [previewBytes, setPreviewBytes] = useState<number[] | null>(null);
  // 보내기 버튼 뒤 입력칸으로 돌아가 바로 이어 쓸 수 있게
  const sendInput = useRef<HTMLInputElement>(null);
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
  // 인터락: 기본 대상이 브로드캐스트 주소인데 허용이 꺼져 있으면 운영체제가 거절한다
  const bcastBlocked = to === "" && looksBroadcast(cfg.remoteHost) && !cfg.broadcast;
  const noRemote = to === "" && (!cfg.remoteHost || cfg.remotePort === 0);
  // 기본 대상 칸이 실제 적용된 값과 다르면(바꾸기 실패·적용 대기) 기본 대상으로는 보내지 않는다 — 이전 주소로 새지 않게
  const remotePending = running && applied !== `${cfg.remoteHost}:${cfg.remotePort}`;
  const remoteBlocked = to === "" && remotePending;
  const canSend = running && sendable && !bcastBlocked && !noRemote && !remoteBlocked;
  const startable = true;
  // 앞 송신이 끝나기 전엔 반복의 이번 차례를 건너뛴다
  const inflight = useRef(false);
  const doSend = useCallback(
    async (s: SendSpec) => {
      if (inflight.current) return;
      inflight.current = true;
      try {
        await api.send(to || null, s);
        setError(null);
      } catch (e) {
        setError(String(e));
        setRepeating(false);
      } finally {
        inflight.current = false;
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

  const sel = selected != null && frames.length ? frames[selected - (frames[0].seq ?? 0)] : undefined;

  // «지난 시간» 기준 — 오래된 줄이 화면에서 잘려도 바뀌지 않게 첫 기록 시각을 잡아 두고, 지우면 다시 잡는다
  if (!framesRef.current.length) timeBase.current = null;
  else if (timeBase.current === null) timeBase.current = framesRef.current[0].ts;
  const fmt = (ts: number) => formatTime(ts, settings.timeFormat, timeBase.current ?? ts);
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
          <ReportButton app="PortDock UDP" lang={lang} frames={() => framesRef.current} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} />
          <button className="icon-btn" onClick={openHelp} title={t("helpTip")} aria-label={t("helpTip")}>
            ?
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title={lang === "ko" ? "설정" : "Settings"}>
            ⚙
          </button>
          </span>
        </div>

        <label>{t("local")}</label>
        <div className="grid2">
          <label data-tip={tip(lang, "bindHost")}>
            {t("bindHost").split(" (")[0]}
            <input value={cfg.bindHost} disabled={running} title={t("bindHost")} onChange={(e) => setCfg({ ...cfg, bindHost: e.target.value.trim() })} />
          </label>
          <label data-tip={tip(lang, "bindPort")}>
            {t("bindPort").split(" (")[0]}
            <NumInput min={0} max={65535} value={cfg.bindPort} disabled={running} title={t("bindPort")} onValue={(n) => setCfg({ ...cfg, bindPort: n })} />
          </label>
        </div>
        <label>{t("remote")}</label>
        <div className="grid2">
          <label data-tip={tip(lang, "remoteHost")}>
            {t("remoteHost")}
            <input className={remoteErr ? "bad" : undefined} value={cfg.remoteHost} onChange={(e) => setCfg({ ...cfg, remoteHost: e.target.value.trim() })} />
          </label>
          <label data-tip={tip(lang, "remotePort")}>
            {t("remotePort")}
            <NumInput className={remoteErr ? "bad" : undefined} min={0} max={65535} value={cfg.remotePort} onValue={(n) => setCfg({ ...cfg, remotePort: n })} />
          </label>
        </div>
        {remoteErr && (
          <div className="interlock">
            {t("ilRemoteFail").replace("{a}", applied ?? "—").replace("{e}", remoteErr)}
          </div>
        )}
        <label data-tip={tip(lang, "broadcast")} className="inline">
          <input type="checkbox" checked={cfg.broadcast} disabled={running} onChange={(e) => setCfg({ ...cfg, broadcast: e.target.checked })} /> {t("broadcast")}
        </label>
        <label data-tip={tip(lang, "multicast")}>
          {t("multicast")}
          <input value={cfg.multicastGroup} disabled={running} placeholder="—" onChange={(e) => setCfg({ ...cfg, multicastGroup: e.target.value.trim() })} />
        </label>
        {cfg.multicastGroup && (
          <label data-tip={tip(lang, "multicastIf")}>
            {t("multicastIf")}
            <input value={cfg.multicastIf} disabled={running} onChange={(e) => setCfg({ ...cfg, multicastIf: e.target.value.trim() })} />
          </label>
        )}
        <label data-tip={tip(lang, "echo")} className="inline">
          <input type="checkbox" checked={cfg.echo} onChange={(e) => setCfg({ ...cfg, echo: e.target.checked })} /> {t("echo")}
        </label>
        <button data-tip={tip(lang, running ? "stop" : "run")} className={running ? "btn danger" : "btn primary"} onClick={running ? stop : start} disabled={(!running && !startable) || starting}>
          {running ? t("stop") : t("start")}
        </button>
        {running && <span className="lock-note">🔒 {t("lockedHint")}</span>}
        <div className={`status s-${status === "listening" ? "connected" : status}`}>
          {t(`status_${status}` as Key)}
          {running && local ? ` · ${local}` : ""}
        </div>
        {running && cfg.multicastGroup && (
          <button data-tip={tip(lang, "rejoin")} className="btn small" onClick={() => api.rejoin().catch((e) => setError(String(e)))} title={t("rejoinHint")}>
            {t("rejoin")} {cfg.multicastGroup}
          </button>
        )}
        <div className="hint">{t("firewallHint")}</div>

        {running && (
          <>
            <label data-tip={tip(lang, "senders")}>{t("senders")}</label>
            {senders.length === 0 && <div className="hint">{t("noSenders")}</div>}
            {senders.map((p) => (
              <div key={p.addr} className="peer">
                <span className="mono">{p.addr}</span>
                <button data-tip={tip(lang, "useAsRemote")} className="btn small ghost" onClick={() => setTo(p.addr)}>
                  {t("useAsRemote")}
                </button>
              </div>
            ))}
          </>
        )}

        <hr />
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
            <select className="target-sel" value={to} onChange={(e) => setTo(e.target.value)} data-tip={tip(lang, "target")}>
              <option value="">
                {t("toRemote")} ({running ? applied ?? "—" : `${cfg.remoteHost}:${cfg.remotePort}`}){remotePending ? ` — ${t("notApplied")}` : ""}
              </option>
              <option value="last">{t("toLast")}</option>
              {senders
                .filter((p) => p.addr !== (running ? applied : `${cfg.remoteHost}:${cfg.remotePort}`))
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
              ref={sendInput}
              className="sendtext"
              value={spec.text}
              placeholder={spec.mode === "hex" ? "01 02 03 04" : "PING"}
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
            ) : remoteBlocked && !noRemote ? (
              <span className="why">{t("whyRemoteNotApplied")}</span>
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
          {bcastBlocked && <div className="interlock">{t("ilBcast")}</div>}
          {noRemote && running && <div className="interlock">{t("ilNoRemote")}</div>}
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
              <button className="btn small" onClick={() => doSend(c)} disabled={!running || (to === "" && (remotePending || noRemote))} title={to === "" && remotePending ? t("whyRemoteNotApplied") : t("send")}>
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
      {showHelp && <HelpDialog doc={help} lang={lang} app="PortDock UDP" onClose={() => setShowHelp(false)} />}
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
          busy={running || !!logPath}
        />
      )}
    </div>
  );
}
