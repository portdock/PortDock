import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { save } from "@tauri-apps/plugin-dialog";
import { load, store, trimFrames } from "@shared/framing";
import {
  api,
  ascii,
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
import { autoLogPath, formatTime, logExt, logOptionsOf, rowHeight, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { looksBroadcast } from "@shared/interlocks";
import { FailCount, filterDesc, LogFilterBar, useLogFilter } from "@shared/LogFilter";
import { screenText, type LogFrame } from "@shared/logSearch";
import { useFollowTail } from "@shared/useFollowTail";
import { FollowButton } from "@shared/FollowButton";
import { copyTextOf, selectedFrames, useCopyKey, useLogSelection } from "@shared/logCopy";
import { LogMenu, logMenuItems, type MenuAt } from "@shared/LogMenu";
import { useToast } from "@shared/Toast";
import { CommandList, type CommandListHandle } from "@shared/CommandList";
import { KEYS, useShortcuts, withKey } from "@shared/shortcuts";
import { useWindowTitle, windowTitle } from "@shared/useWindowTitle";
import { PinButton } from "@shared/PinButton";
import { NarrowBar, SideBackdrop, SideClose } from "@shared/NarrowBar";
import { useModeSwitch } from "@shared/SendMode";
import { ui } from "@shared/uiText";
import { io } from "@shared/ioText";
import { checksumDesc, checksumToRust, crcProblem, setTextEncoding, type CkOpts } from "@shared/format";
import { ChecksumPicker } from "@shared/ChecksumOptions";
import { useSendHistory } from "@shared/sendHistory";
import { deltaText, Meter, newDeltaState, stampDelta, type DeltaMode } from "@shared/liveStats";
import { DeltaSelect, LiveStats } from "@shared/StatsBar";
import { TriggerPanel, useTriggers } from "@shared/TriggerPanel";
import { dict, type Key, type Lang } from "./i18n";
import "./App.css";

type Status = "idle" | "listening" | "closed";
type ViewMode = "hex" | "ascii" | "both";
interface Command extends SendSpec {
  name: string;
  key?: string | null;
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
  // 아주 좁은 창(900px 이하)에서 왼쪽 연결 설정 칸을 펼칠지
  const [showSide, setShowSide] = useState(false);
  const toast = useToast(lang);
  const langRef = useRef(lang);
  langRef.current = lang;
  // 글자 보기 인코딩 — 줄 그리기·복사·저장이 같은 값을 쓴다
  setTextEncoding(settings.encoding);
  // 파일 로그 형식·나누기·인코딩 — 다음 파일 기록부터
  useEffect(() => {
    api.setLogOptions(logOptionsOf(settings)).catch(() => {});
  }, [settings]);

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
  const [rxCk, setRxCk] = useState<CkOpts | null>(() => load("rxCk", null));
  useEffect(() => store("rxCk", rxCk), [rxCk]);
  // 백엔드로 보낼 수신 체크섬(옵션·범용 CRC 포함). 범용 CRC 매개변수가 틀리면 검사하지 않는다
  const rxWire = useMemo(() => (rxCheck === "crc" && (!rxCk?.crc || crcProblem(rxCk.crc)) ? null : checksumToRust(rxCheck, rxCk)), [rxCheck, rxCk]);
  const rxKey = JSON.stringify(rxWire);
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
  const logPathRef = useRef<string | null>(null);
  const repeatOn = useRef(false);
  const [logPath, setLogPathState] = useState<string | null>(null);
  const setLogPath = (p: string | null) => {
    logPathRef.current = p;
    setLogPathState(p);
  };
  const framesRef = useRef<Frame[]>([]);
  const timeBase = useRef<number | null>(null);
  // 줄마다 일련번호 — 앞을 잘라내도 선택한 줄이 다른 줄로 바뀌지 않게
  const seqRef = useRef(0);
  const screenBytes = useRef(0);
  const counters = useRef({ rx: 0, tx: 0, fail: 0 });
  const [version, setVersion] = useState(0);
  // 처리량·마지막 수신, 간격 열
  const meter = useRef(new Meter());
  const deltaSt = useRef(newDeltaState());

  /** 화면에서 만든 사건 줄(EV) — 파일 로그에는 남지 않는다 */
  const addEv = useCallback((note: string) => {
    framesRef.current.push({ ts: Date.now(), dir: "ev", bytes: [], check: null, note, seq: ++seqRef.current });
    screenBytes.current = trimFrames(framesRef.current, maxLines.current, screenBytes.current);
    setVersion((v) => v + 1);
  }, []);

  // ---- 트리거(받은 줄에 패턴이 오면 색·소리·반복/기록 멈춤·사건 줄·깜빡임)
  const trg = useTriggers(lang, {
    addEv,
    stopRepeat: () => {
      if (!repeatOn.current) return false;
      repeatOn.current = false;
      setRepeating(false);
      return true;
    },
    stopLog: () => {
      if (!logPathRef.current) return false;
      logPathRef.current = null;
      setLogPath(null);
      api.setLog(null).catch((e) => setError(String(e)));
      return true;
    },
  });
  const trgCheck = trg.check;

  const onEvent = useCallback((e: SessionEvent) => {
    if (e.type === "frames") {
      const now = Date.now();
      for (const f of e.frames) {
        f.seq = ++seqRef.current;
        stampDelta(deltaSt.current, f);
        framesRef.current.push(f);
        screenBytes.current += f.bytes.length;
        if (f.dir !== "ev") {
          counters.current[f.dir] += f.bytes.length;
          meter.current.add(f.dir, f.bytes.length, now);
        }
        if (f.dir === "rx") trgCheck(f);
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
  }, [trgCheck]);

  useEffect(() => {
    if (running) api.setRxCheck(rxWire).catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, rxKey]);
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
      setLocal(await api.start(cfg, rxWire, onEvent));
      setApplied(`${cfg.remoteHost}:${cfg.remotePort}`);
      setRemoteErr(null);
      setRunning(true);
      if (settings.autoLog && settings.logFolder) {
        const p = autoLogPath(settings.logFolder, "udp", logExt(settings));
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
    const ext = logExt(settings);
    const path = await save({ defaultPath: `portdock-udp-${stamp}.${ext}`, filters: [{ name: "Log", extensions: ext === "csv" ? ["csv", "txt"] : ["log", "txt"] }] });
    if (!path) return;
    await api.setLog(path).then(() => setLogPath(path)).catch((e) => setError(String(e)));
  }

  // ---- 보기
  const [view, setView] = useState<ViewMode>(() => load("view", "hex"));
  useEffect(() => {
    store("view", view);
  }, [view]);
  const [deltaMode, setDeltaMode] = useState<DeltaMode>(() => load("delta", "off"));
  useEffect(() => {
    store("delta", deltaMode);
  }, [deltaMode]);
  /** 복사·화면 저장에 넣을 간격 열 */
  const col = deltaMode === "off" ? undefined : (f: LogFrame) => deltaText(deltaMode, f);
  const frames = framesRef.current;
  const listRef = useRef<HTMLDivElement>(null);
  // 찾기·거르기 — 보기만 거른다(기록은 그대로)
  const filter = useLogFilter(frames, version);
  const rows = useVirtualizer({ count: filter.count, getScrollElement: () => listRef.current, estimateSize: () => rowHeight(settings.fontSize), overscan: 20 });
  // 글자 크기를 바꾸면 줄 높이를 다시 잰다
  useEffect(() => {
    rows.measure();
  }, [settings.fontSize, rows]);
  // 따라가기 — 맨 아래에 있을 때만 새 줄을 따라간다(위로 굴리면 멈춤, «↓ 맨 아래로»·End 로 다시)
  const follow = useFollowTail(listRef, settings.autoScroll, seqRef.current, `${version}:${filter.count}:${rows.getTotalSize()}`);
  // 줄 고르기(누르기·Shift 범위·Ctrl 하나씩) — 누른 줄이 상세 칸에 나온다
  const sel = useLogSelection({ indexOfSeq: filter.indexOfSeq, seqAt: (i) => filter.at(i)?.seq });
  const selected = sel.primary;
  const frameOf = (seq: number) => {
    const f = frames.length ? frames[seq - (frames[0].seq ?? 0)] : undefined;
    return f && f.seq === seq ? f : undefined;
  };
  const [menu, setMenu] = useState<MenuAt>(null);
  // 찾은 줄로 — 고르고 가운데로 굴린다(따라가기는 멈춘다)
  const jumpTo = useCallback(
    (seq: number) => {
      sel.only(seq);
      follow.pause();
      const i = filter.indexOfSeq(seq);
      if (i >= 0) rows.scrollToIndex(i, { align: "center" });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, rows, sel.only, follow.pause],
  );
  function clearLog() {
    framesRef.current = [];
    counters.current = { rx: 0, tx: 0, fail: 0 };
    meter.current.reset();
    deltaSt.current = newDeltaState();
    screenBytes.current = 0;
    sel.clear();
    setMenu(null);
    follow.resume();
    setVersion((v) => v + 1);
  }
  // Ctrl+C — 고른 줄을 «시각 방향 [상대] 내용»(지금 보기대로)으로
  const onCopied = (ok: boolean, n: number) => toast.show(ok ? ui(lang, "copied", { n }) : ui(lang, "copyFail"), { error: !ok });
  useCopyKey(
    () => {
      const list = selectedFrames(sel, frameOf);
      return list.length ? copyTextOf(list, "lines", view, fmt, true, col) : null;
    },
    (ok) => onCopied(ok, sel.set.size),
  );
  async function saveView() {
    const path = await save({ defaultPath: "portdock-udp-view.txt", filters: [{ name: "Text", extensions: ["txt", "log"] }] });
    if (!path) return;
    // 지금 보기(HEX·ASCII·둘 다)대로, 거르기가 켜져 있으면 보이는 줄만
    const text = screenText({ app: "PortDock UDP", frames: framesRef.current, view: filter.view, mode: view, fmt, hex, ascii, filterDesc: filterDesc(filter.state, lang), lang, peers: true, col });
    await api.writeText(path, text).catch((e) => setError(String(e)));
  }

  // ---- 보내기
  const [spec, setSpec] = useState<SendSpec>(() => load("spec", { text: "", mode: "hex", checksum: null, suffix: "" }));
  const [previewBytes, setPreviewBytes] = useState<number[] | null>(null);
  // 보내기 버튼 뒤 입력칸으로 돌아가 바로 이어 쓸 수 있게
  const sendInput = useRef<HTMLInputElement>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [repeatMs, setRepeatMs] = useState(1000);
  const [repeating, setRepeatingState] = useState(false);
  const setRepeating = (on: boolean) => {
    repeatOn.current = on;
    setRepeatingState(on);
  };
  // 반복 횟수 한도(0 = 계속)와 이번 반복에서 보낸 수
  const [repeatTimes, setRepeatTimes] = useState(() => load("repeatTimes", 0));
  useEffect(() => {
    store("repeatTimes", repeatTimes);
  }, [repeatTimes]);
  const [repeatSent, setRepeatSent] = useState(0);
  const repeatSentRef = useRef(0);
  const startRepeat = (on: boolean) => {
    repeatSentRef.current = 0;
    setRepeatSent(0);
    setRepeating(on);
  };
  useEffect(() => {
    store("spec", spec);
    let stale = false;
    if (spec.checksum === "crc" && spec.ck?.crc && crcProblem(spec.ck.crc, lang)) {
      setPreviewBytes(null);
      setPreviewErr(crcProblem(spec.ck.crc, lang));
      return;
    }
    api
      .preview(spec, settings.encoding)
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
  }, [spec, settings.encoding, lang]);
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
  /** 보내기 — 성공하면 true */
  const doSend = useCallback(
    async (s: SendSpec) => {
      if (inflight.current) return false;
      inflight.current = true;
      try {
        await api.send(to || null, s, settings.encoding);
        setError(null);
        return true;
      } catch (e) {
        setError(String(e));
        setRepeating(false);
        return false;
      } finally {
        inflight.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [to, settings.encoding],
  );
  useEffect(() => {
    if (!repeating || !running) return;
    const id = setInterval(() => {
      void doSend(spec).then((ok) => {
        if (!ok || !repeatOn.current) return;
        const n = ++repeatSentRef.current;
        setRepeatSent(n);
        if (repeatTimes > 0 && n >= repeatTimes) {
          setRepeating(false);
          addEv(io(langRef.current, "repDone", { n }));
        }
      });
    }, Math.max(10, repeatMs));
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeating, repeatMs, spec, running, doSend, repeatTimes, addEv]);
  /** 보내기 버튼·Enter — 이력에도 남긴다 */
  const sendNow = () => {
    if (!canSend) return;
    void doSend(spec).then((ok) => ok && history.remember({ text: spec.text, mode: spec.mode }));
  };
  // ↑/↓ 이력 — 보낸 내용(모드 포함)을 다시 불러온다
  const history = useSendHistory({ text: spec.text, mode: spec.mode }, useCallback((h) => setSpec((s) => ({ ...s, text: h.text, mode: h.mode })), []));

  // HEX ↔ ASCII 를 바꾸면 같은 바이트의 새 표기로, 켜진 체크섬은 알림줄로
  const modeSwitch = useModeSwitch(spec, setSpec, lang);

  const [commands, setCommands] = useState<Command[]>(() => load("commands", []));
  useEffect(() => {
    store("commands", commands);
  }, [commands]);
  const cmdList = useRef<CommandListHandle>(null);
  /** 명령을 목록 끝에 넣고 이름 칸에 포커스 — 바로 이름을 고칠 수 있게 */
  function pushCommand(c: Command) {
    setCommands((list) => [...list, c]);
    cmdList.current?.focusName(commands.length);
  }
  /** 로그 줄의 바이트 그대로(HEX·체크섬·줄 끝 없음) */
  const rawSpec = (bytes: number[]): SendSpec => ({ text: hex(bytes), mode: "hex", checksum: null, suffix: "", ck: null });
  // 명령(▶)·다시 보내기를 못 하는 이유
  const cmdWhy = !running ? t("whyNotStarted") : to === "" && remotePending ? t("whyRemoteNotApplied") : to === "" && noRemote ? t("ilNoRemote") : undefined;

  const selFrame = selected != null ? frameOf(selected) : undefined;

  // «지난 시간» 기준 — 오래된 줄이 화면에서 잘려도 바뀌지 않게 첫 기록 시각을 잡아 두고, 지우면 다시 잡는다
  if (!framesRef.current.length) timeBase.current = null;
  else if (timeBase.current === null) timeBase.current = framesRef.current[0].ts;
  const fmt = (ts: number) => formatTime(ts, settings.timeFormat, timeBase.current ?? ts);
  useExitGuard(running || !!logPath, settings.confirmExit, lang, "PortDock UDP");

  // ---- 단축키: F4 시작·멈춤, Ctrl+L 지우기, Ctrl+S 화면 저장, Ctrl+Shift+L 파일 기록, Esc 반복 멈춤
  const runDisabled = (!running && !startable) || starting;
  useShortcuts([
    { key: "F4", run: () => !runDisabled && void (running ? stop() : start()) },
    { key: "l", ctrl: true, run: clearLog },
    { key: "s", ctrl: true, run: () => void saveView() },
    { key: "l", ctrl: true, shift: true, run: () => running && void toggleLog() },
    { key: "Escape", inInput: false, run: () => repeating && setRepeating(false) },
  ]);

  // ---- 창 제목: «:5001 받는 중 — PortDock UDP»
  const localPort = local?.match(/:(\d+)$/)?.[1] ?? String(cfg.bindPort);
  const statusText = t(`status_${status}` as Key);
  useWindowTitle(windowTitle("PortDock UDP", running ? [`:${localPort} ${statusText}`] : [], !!logPath));
  const summaryLine = `${cfg.bindHost}:${running ? localPort : cfg.bindPort} → ${cfg.remoteHost}:${cfg.remotePort} · ${statusText}`;

  return (
    <div className={`app three${showRight ? " show-right" : ""}${showSide ? " show-side" : ""}`}>
      <SideBackdrop open={showSide} onClose={() => setShowSide(false)} />
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>UDP</small>
          </span>
          <span className="brand-tools">
          <select
            className="lang"
            aria-label={lang === "ko" ? "언어" : "Language"}
            value={lang}
            onChange={(e) => {
              setLang(e.target.value as Lang);
              store("lang", e.target.value);
            }}
          >
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
          <PinButton lang={lang} on={settings.alwaysOnTop} onToggle={(v) => update({ alwaysOnTop: v })} />
          <ReportButton app="PortDock UDP" lang={lang} frames={() => framesRef.current} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} />
          <button className="icon-btn" onClick={openHelp} title={t("helpTip")} aria-label={t("helpTip")}>
            ?
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title={ui(lang, "settings")} aria-label={ui(lang, "settings")}>
            ⚙
          </button>
          <SideClose lang={lang} onClose={() => setShowSide(false)} />
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
        <button data-tip={withKey(tip(lang, running ? "stop" : "run"), KEYS.connect)} className={running ? "btn danger" : "btn primary"} onClick={running ? stop : start} disabled={runDisabled}>
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
          <ChecksumPicker
            lang={lang}
            kind={rxCheck}
            ck={rxCk}
            rx
            noneLabel={t("none")}
            ariaLabel={t("rxCheck")}
            onChange={(k, c) => {
              setRxCheck(k);
              setRxCk(c);
            }}
          />
        </label>
        {rxCheck && (rxCk?.skipHead || rxCk?.beforeEnd || rxCk?.swap || rxCheck === "crc") ? <div className="hint">{checksumDesc(rxCheck, rxCk, lang)}</div> : null}
        <button data-tip={withKey(tip(lang, logPath ? "stopLog" : "logToFile"), KEYS.fileLog)} className="btn" onClick={toggleLog} disabled={!running}>
          {logPath ? t("stopLog") : t("logToFile")}
        </button>
      </aside>

      <main className="main">
        <NarrowBar lang={lang} open={showSide} onToggle={() => setShowSide(!showSide)} dot={`s-${status === "listening" ? "connected" : status}`} summary={summaryLine}>
          <button className={running ? "btn small danger" : "btn small primary"} onClick={running ? stop : start} disabled={runDisabled} data-tip={withKey(tip(lang, running ? "stop" : "run"), KEYS.connect)}>
            {running ? t("stop") : t("start")}
          </button>
        </NarrowBar>
        <div className="toolbar">
          <span data-tip={tip(lang, "view")}>{t("view")}</span>
          {(["hex", "ascii", "both"] as ViewMode[]).map((v) => (
            <button key={v} className={view === v ? "seg on" : "seg"} onClick={() => setView(v)} aria-pressed={view === v}>
              {v === "both" ? t("both") : v.toUpperCase()}
            </button>
          ))}
          <label data-tip={withKey(ui(lang, "autoscrollTip"), KEYS.end)} className="inline">
            <input type="checkbox" checked={follow.following} onChange={(e) => (e.target.checked ? follow.resume() : follow.pause())} /> {t("autoscroll")}
          </label>
          <DeltaSelect lang={lang} value={deltaMode} onChange={setDeltaMode} />
          <span className="grow" />
          <span className="counter">
            RX {counters.current.rx.toLocaleString()} · TX {counters.current.tx.toLocaleString()} {t("bytes")}
          </span>
          <FailCount lang={lang} n={counters.current.fail} filter={filter} />
          <button data-tip={withKey(tip(lang, "saveView"), KEYS.save)} className="btn small" onClick={saveView}>
            {t("saveView")}
          </button>
          <button data-tip={withKey(tip(lang, "clear"), KEYS.clear)} className="btn small" onClick={clearLog}>
            {t("clear")}
          </button>
          <button data-tip={tip(lang, "commands")} className="btn small narrow-only" onClick={() => setShowRight(!showRight)} aria-expanded={showRight}>
            ☰ {t("commands")}
          </button>
        </div>

        <div className="statusbar">
          <span className={`dot s-${status === "listening" ? "connected" : status}`} />
          <span className="mono">{statusText}</span>
          {logPath && <span className="rec">● REC</span>}
          <span className="grow" />
          <LiveStats meter={meter.current} lang={lang} active={running} />
        </div>

        <LogFilterBar lang={lang} filter={filter} selected={selected} total={frames.length} onJump={jumpTo} />

        <div className="log-wrap">
          <div className="log" ref={listRef}>
            {frames.length === 0 && <div className="empty-guide">{t("emptyGuide")}</div>}
            <div style={{ height: rows.getTotalSize(), position: "relative" }}>
              {rows.getVirtualItems().map((r) => {
                const f = filter.at(r.index);
                if (!f || f.seq == null) return null;
                const seq = f.seq;
                const cls = `row ${f.dir}${filter.isHit(seq) ? " hit" : ""}${sel.has(seq) ? " sel" : ""}${selected === seq ? " primary" : ""}${f.mark ? " marked" : ""}`;
                const style = f.mark ? ({ transform: `translateY(${r.start}px)`, "--mark": f.mark } as CSSProperties) : { transform: `translateY(${r.start}px)` };
                const dt = deltaMode !== "off" && <span className="dt">{deltaText(deltaMode, f)}</span>;
                // 누르기·Shift·Ctrl 로 고르고, 오른쪽 버튼은 복사·다시 보내기 메뉴. 누른다고 따라가기가 꺼지지는 않는다
                const handlers = {
                  onClick: (e: ReactMouseEvent) => sel.click(e, seq),
                  onContextMenu: (e: ReactMouseEvent) => {
                    e.preventDefault();
                    sel.context(seq);
                    setMenu({ x: e.clientX, y: e.clientY, seq });
                  },
                };
                if (f.dir === "ev")
                  return (
                    <div key={r.key} className={cls} style={style} {...handlers}>
                      <span className="ts">{fmt(f.ts)}</span>
                      {dt}
                      <span className="dir">EV</span>
                      <span className="note">{f.note}</span>
                    </div>
                  );
                return (
                  <div key={r.key} className={cls} style={style} {...handlers}>
                    <span className="ts">{fmt(f.ts)}</span>
                    {dt}
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
          <FollowButton follow={follow} lang={lang} hidden={frames.length === 0} />
        </div>
        {menu && (
          <LogMenu
            x={menu.x}
            y={menu.y}
            label={t("view")}
            onClose={() => setMenu(null)}
            items={logMenuItems({
              lang,
              frames: selectedFrames(sel, frameOf),
              clicked: frameOf(menu.seq),
              view,
              fmt,
              peers: true,
              col,
              onCopied,
              sendAgain: { run: (b) => void doSend(rawSpec(b)), enabled: !cmdWhy, why: cmdWhy },
              addCommand: (b) => {
                pushCommand({ ...rawSpec(b), name: hex(b).slice(0, 24), key: null });
                toast.show(ui(lang, "addedCmds", { n: 1 }));
              },
              find: (b) => {
                filter.setState((s) => ({ ...s, query: hex(b), qmode: "hex" }));
                document.querySelector<HTMLInputElement>(".filterbar .find")?.focus();
              },
            })}
          />
        )}

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
            {/* 바꾸면 같은 바이트의 새 표기로 옮기고, 켜진 체크섬은 아래 알림줄로 */}
            <select value={spec.mode} onChange={(e) => modeSwitch.changeMode(e.target.value as TextMode)} data-tip={ui(lang, "sendModeTip")} aria-label="HEX / ASCII">
              <option value="hex">HEX</option>
              <option value="ascii">ASCII</option>
            </select>
            <input
              ref={sendInput}
              className="sendtext"
              value={spec.text}
              placeholder={spec.mode === "hex" ? "01 02 03 04" : "PING"}
              data-tip={tip(lang, "sendText")}
              onChange={(e) => {
                setSpec({ ...spec, text: e.target.value });
                modeSwitch.onEdit();
                history.edited();
              }}
              onKeyDown={(e) => {
                if (history.onKeyDown(e)) return;
                if (e.key === "Enter" && !e.nativeEvent.isComposing) sendNow();
              }}
            />
            <ChecksumPicker lang={lang} kind={spec.checksum} ck={spec.ck} noneLabel={`${t("checksum")}: ${t("none")}`} tipKey="checksum" ariaLabel={t("checksum")} onChange={(k, c) => setSpec({ ...spec, checksum: k, ck: c })} />
            <select value={spec.suffix} onChange={(e) => setSpec({ ...spec, suffix: e.target.value })} data-tip={tip(lang, "suffix")}>
              <option value="">
                {t("suffix")}: {t("none")}
              </option>
              <option value="\r">{t("suffix")}: CR</option>
              <option value="\n">{t("suffix")}: LF</option>
              <option value="\r\n">{t("suffix")}: CR LF</option>
            </select>
            <button data-tip={tip(lang, "send")} className="btn primary" onClick={() => {
                sendNow();
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
            <label data-tip={withKey(tip(lang, "repeat"), KEYS.stopRepeat)} className="inline">
              <input type="checkbox" checked={repeating} disabled={!canSend && !repeating} onChange={(e) => startRepeat(e.target.checked)} /> {t("repeat")}
            </label>
            <NumInput className="num" min={10} max={3600000} value={repeatMs} onValue={setRepeatMs} aria-label={t("repeat")} />
            <label className="inline" data-tip={tip(lang, "repeatTimes")}>
              <NumInput className="num small-num" min={0} max={1000000} value={repeatTimes} onValue={setRepeatTimes} aria-label={io(lang, "repeatTimes")} /> {io(lang, "repeatTimes")}
            </label>
            {(repeating || repeatSent > 0) && (
              <span className="rep-count">{repeatTimes > 0 ? io(lang, "repeatSentOf", { n: repeatSent, m: repeatTimes }) : io(lang, "repeatSent", { n: repeatSent })}</span>
            )}
            <button className="btn small add-cmd" onClick={() => pushCommand({ ...spec, name: spec.text.slice(0, 24) || "cmd", key: null })} disabled={!sendable}>
              + {t("addCommand")}
            </button>
          </div>
          {modeSwitch.node}
          {bcastBlocked && <div className="interlock">{t("ilBcast")}</div>}
          {noRemote && running && <div className="interlock">{t("ilNoRemote")}</div>}
          {error && <div className="error">{error}</div>}
        </div>
      </main>

      {showRight && <div className="backdrop narrow-only" onClick={() => setShowRight(false)} />}
      <aside className="right">
        <button className="btn small narrow-only close-right" onClick={() => setShowRight(false)} title={t("close")} aria-label={t("close")}>
          ✕
        </button>
        <CommandList
          lang={lang}
          app="PortDock UDP"
          title={t("commands")}
          commands={commands}
          setCommands={setCommands}
          onSend={(c) => void doSend(c)}
          canSend={!cmdWhy}
          sendWhy={cmdWhy}
          onEdit={(c) => {
            setSpec({ text: c.text, mode: c.mode, checksum: c.checksum, suffix: c.suffix, ck: c.ck ?? null });
            sendInput.current?.focus();
          }}
          toast={toast}
          writeText={api.writeText}
          readText={api.readText}
          handle={cmdList}
        />
        <TriggerPanel lang={lang} trg={trg} toast={toast} />
        <h3 data-tip={tip(lang, "detail")}>{t("detail")}</h3>
        {!selFrame && <div className="hint">{t("selectFrame")}</div>}
        {selFrame && (
          <div className="detail">
            <div>
              {selFrame.dir.toUpperCase()} · {fmt(selFrame.ts)}
              {selFrame.peer ? ` · ${selFrame.peer}` : ""}
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
          ioOptions
        />
      )}
      {toast.node}
    </div>
  );
}
