import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { VERSION } from "@shared/version";
import { save } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { load, store } from "@shared/framing";
import { tip } from "@shared/tips";
import { ReportButton } from "@shared/ReportDialog";
import { AiCopyButton } from "@shared/AiCopyButton";
import { noteError } from "@shared/report";
import { HelpDialog, useHelpKey } from "@shared/HelpDialog";
import { FirstCard } from "@shared/FirstCard";
import { useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { useToast } from "@shared/Toast";
import { count } from "@shared/usage";
import { KEYS, useShortcuts, withKey } from "@shared/shortcuts";
import { useWindowTitle, windowTitle } from "@shared/useWindowTitle";
import { PinButton } from "@shared/PinButton";
import { TERMS } from "@shared/glossary";
import { NarrowBar, SideBackdrop, SideClose, SideTools } from "@shared/NarrowBar";
import { ui } from "@shared/uiText";
import { api } from "./api";
import { Chart, type Mark } from "./Chart";
import { help } from "./help";
import { dict, fill, type Key, type Lang } from "./i18n";
import {
  btApply,
  btStateText,
  btText,
  CAVEATS,
  clock,
  DEFAULT_DNS,
  devLabel,
  DNS_EVERY_S,
  INTERVALS,
  LEVEL_TEXT,
  longestLoss,
  MAX_TICKS,
  recCsv,
  recText,
  sameChannel,
  SIGNAL_STATE_TEXT,
  signalNote,
  summarize,
  TARGETS,
  validDnsName,
  validTarget,
  type BtAudioState,
  type BtEvent,
  type BtLog,
  type BtRow,
  type RecEvent,
  type RecInfo,
  type Stats,
  type Tick,
  type WifiEvent,
  type WifiSignal,
} from "./model";
import "@shared/portcheck.css";
import "./App.css";
import "./hw.css";

const APP = "PortDock Hardware Tester";
const TABS = ["net", "signal", "bt", "audio"] as const;
/** 다음 판 — 사이트 웹 도구와 같은 코드로 붙인다(이번엔 자리만, 웹 도구로 가는 링크) */
const LATER = ["keyboard", "mouse", "monitor", "speaker", "mic", "webcam"] as const;
const LATER_WEB: Record<(typeof LATER)[number], string> = {
  keyboard: "keyboard-test",
  mouse: "mouse-test",
  monitor: "monitor-test",
  speaker: "speaker-test",
  mic: "mic-test",
  webcam: "webcam-test",
};
type Tab = (typeof TABS)[number] | (typeof LATER)[number];
const ALL_TABS: readonly string[] = [...TABS, ...LATER];
const SPANS: { s: number | null; key: Key }[] = [
  { s: 60, key: "span1m" },
  { s: 300, key: "span5m" },
  { s: 1800, key: "span30m" },
  { s: null, key: "spanAll" },
];
/** Microsoft Learn — Wi-Fi 신호·주변 AP 가 위치 권한에 묶인 까닭 */
const WIFI_LOCATION_URL = "https://learn.microsoft.com/en-us/windows/win32/nativewifi/wi-fi-access-location-changes";
const webToolUrl = (lang: Lang, slug: string) => `https://portdock.dev/${lang === "en" ? "en/" : ""}tools/${slug}/`;
const SIGNAL_POLL_MS = 2000;
const SIGNAL_KEEP_MS = 10 * 60_000;

interface NetNote {
  ts: number;
  text: string;
  kind: "wifiDown" | "wifiUp" | "gateway" | "note";
}

const fmt = (v: number | null | undefined, d = 0) => (v == null ? "—" : v.toFixed(d));

export default function App() {
  const { settings, update, reset } = useSettings();
  const lang = settings.lang;
  const t = useCallback((k: Key, v?: Record<string, string | number>) => fill(dict[lang][k], v), [lang]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState<boolean | string>(false);
  const openHelp = useCallback(() => setShowHelp(true), []);
  useHelpKey(openHelp);
  const [showSide, setShowSide] = useState(false);
  const toast = useToast(lang);
  const link = (url: string) => openUrl(url).catch((e) => toast.show(String(e), { error: true }));
  const copy = (text: string) =>
    navigator.clipboard
      .writeText(text)
      .then(() => toast.show(t("copied")))
      .catch(() => toast.show(ui(lang, "copyFail"), { error: true }));

  const [tab, setTab] = useState<Tab>(() => {
    const v = load<string>("tab", "net");
    return (ALL_TABS.includes(v) ? v : "net") as Tab;
  });
  useEffect(() => store("tab", tab), [tab]);
  const [firstDone, setFirstDone] = useState<boolean>(() => load("firstHintDone", false));
  useEffect(() => store("firstHintDone", firstDone), [firstDone]);

  // ================================================================ Wi-Fi·인터넷 끊김·지연 기록
  const [target, setTarget] = useState<string>(() => load("target", TARGETS[0]));
  useEffect(() => store("target", target), [target]);
  const [custom, setCustom] = useState<boolean>(() => !TARGETS.includes(load("target", TARGETS[0])));
  const [dnsName, setDnsName] = useState<string>(() => load("dnsName", DEFAULT_DNS));
  useEffect(() => store("dnsName", dnsName), [dnsName]);
  const [intervalS, setIntervalS] = useState<number>(() => {
    const v = load<number>("intervalS", 1);
    return INTERVALS.includes(v) ? v : 1;
  });
  useEffect(() => store("intervalS", intervalS), [intervalS]);
  const [spanS, setSpanS] = useState<number | null>(() => {
    const v = load<number | null>("spanS", 300);
    return SPANS.some((x) => x.s === v) ? v : 300;
  });
  useEffect(() => store("spanS", spanS), [spanS]);
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [info, setInfo] = useState<RecInfo | null>(null);
  const ticks = useRef<Tick[]>([]);
  const [wifi, setWifi] = useState<WifiEvent[]>([]);
  const [notes, setNotes] = useState<NetNote[]>([]);
  const [ver, setVer] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const targetOk = validTarget(target);
  const dnsOk = dnsName.trim() === "" || validDnsName(dnsName);

  const onRec = useCallback(
    (e: RecEvent) => {
      switch (e.type) {
        case "started":
          setInfo({ gateway: e.gateway, target: e.target, dnsName: e.dnsName, intervalMs: e.intervalMs, startedAt: e.ts });
          setRecording(true);
          break;
        case "tick":
          ticks.current.push({ ts: e.ts, gw: e.gw, net: e.net, dns: e.dns });
          if (ticks.current.length > MAX_TICKS) ticks.current.splice(0, ticks.current.length - MAX_TICKS);
          setNow(Date.now());
          setVer((v) => v + 1);
          break;
        case "gateway":
          setInfo((i) => (i ? { ...i, gateway: e.ip } : i));
          setNotes((n) => [...n, { ts: e.ts, kind: "gateway", text: fill(dict[lang].evGateway, { ip: e.ip }) }]);
          break;
        case "wifi":
          setWifi((w) => [...w, { ts: e.ts, connected: e.connected, code: e.code, reason: e.reason }]);
          break;
        case "note":
          setNotes((n) => [...n, { ts: Date.now(), kind: "note", text: e.message }]);
          break;
        case "stopped":
          setRecording(false);
          setNow(Date.now());
          if (e.reason === "limit") toast.show(dict[lang].recLimit);
          break;
      }
    },
    [lang, toast],
  );

  const startRec = async () => {
    if (!targetOk || !dnsOk || recording || starting) return;
    ticks.current = [];
    setWifi([]);
    setNotes([]);
    setInfo(null);
    setVer((v) => v + 1);
    setStarting(true);
    try {
      await api.recStart({ target: target.trim(), dnsName: dnsName.trim(), intervalMs: intervalS * 1000 }, onRec);
    } catch (e) {
      noteError(String(e));
      toast.show(String(e), { error: true });
    } finally {
      setStarting(false);
    }
  };
  const stopRec = () => {
    void api.recStop().finally(() => setRecording(false));
  };

  const summary = useMemo(() => summarize(ticks.current, wifi, !!info?.gateway), [ver, wifi, info]); // eslint-disable-line react-hooks/exhaustive-deps
  const lossRun = useMemo(() => ({ gw: longestLoss(ticks.current.map((x) => x.gw)), net: longestLoss(ticks.current.map((x) => x.net)) }), [ver]); // eslint-disable-line react-hooks/exhaustive-deps
  const series = useMemo(() => {
    const tk = ticks.current;
    return [
      { label: t("rowGw"), color: "--rx", points: tk.map((x) => ({ ts: x.ts, v: x.gw })) },
      { label: t("rowNet"), color: "--tx", points: tk.map((x) => ({ ts: x.ts, v: x.net })) },
      { label: "DNS", color: "--accent", points: tk.map((x) => ({ ts: x.ts, v: x.dns })), dots: true },
    ];
  }, [ver, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const marks: Mark[] = useMemo(() => wifi.map((w) => ({ ts: w.ts, kind: w.connected ? "good" : "bad" })), [wifi]);
  const events = useMemo(() => {
    const list: NetNote[] = [
      ...notes,
      ...wifi.map((w) => ({
        ts: w.ts,
        kind: (w.connected ? "wifiUp" : "wifiDown") as NetNote["kind"],
        text: w.connected ? t("evWifiUp") : `${t("evWifiDown")}${w.reason ? ` — ${w.reason}` : ""}${w.code != null ? ` (0x${w.code.toString(16)})` : ""}`,
      })),
    ];
    return list.sort((a, b) => b.ts - a.ts).slice(0, 200);
  }, [notes, wifi, t]);
  const hasData = ticks.current.length > 0;

  async function saveCsv() {
    if (!hasData) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const path = await save({ defaultPath: `portdock-net-${stamp}.csv`, filters: [{ name: "CSV", extensions: ["csv"] }] });
    if (!path) return;
    count("csv_save");
    await api
      .writeText(path, recCsv(info, ticks.current, wifi))
      .then(() => toast.show(t("saved", { p: path })))
      .catch((e) => toast.show(String(e), { error: true }));
  }

  // ================================================================ Wi-Fi 신호·채널(누를 때만)
  const [sigOn, setSigOn] = useState(false);
  const [sig, setSig] = useState<WifiSignal | null>(null);
  const [sigHist, setSigHist] = useState<{ ts: number; v: number | null }[]>([]);
  useEffect(() => {
    if (!sigOn || tab !== "signal") return;
    let alive = true;
    const read = () =>
      api
        .wifiSignal()
        .then((s) => {
          if (!alive) return;
          setSig(s);
          const ts = Date.now();
          setSigHist((h) => [...h.filter((p) => p.ts > ts - SIGNAL_KEEP_MS), { ts, v: s.state === "ok" ? s.quality : null }]);
        })
        .catch((e) => alive && setSig({ state: "error", quality: null, rssi: null, rxMbps: null, txMbps: null, phy: null, band: null, channel: null, channels: [], error: String(e) }));
    void read();
    const id = window.setInterval(read, SIGNAL_POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [sigOn, tab]);
  const sigNote = sig ? signalNote(sig) : null;
  const same = sig ? sameChannel(sig) : null;

  // ================================================================ 블루투스 연결 기록
  const [btRec, setBtRec] = useState(false);
  const [btRows, setBtRows] = useState<BtRow[]>([]);
  const [btLog, setBtLog] = useState<BtLog[]>([]);
  const [btStarted, setBtStarted] = useState<number | null>(null);
  const btState = useRef<{ rows: BtRow[]; log: BtLog[] }>({ rows: [], log: [] });
  const onBt = useCallback(
    (e: BtEvent) => {
      if (e.type === "stopped") {
        setBtRec(false);
        if (e.reason === "limit") toast.show(dict[lang].recLimit);
        return;
      }
      if (e.type === "snapshot") {
        setBtStarted(e.ts);
        setBtRec(true);
      }
      btState.current = btApply(btState.current.rows, btState.current.log, e);
      setBtRows(btState.current.rows);
      setBtLog(btState.current.log);
    },
    [lang, toast],
  );
  const startBt = async () => {
    if (btRec) return;
    btState.current = { rows: [], log: [] };
    setBtRows([]);
    setBtLog([]);
    try {
      await api.btStart(onBt);
    } catch (e) {
      toast.show(String(e), { error: true });
    }
  };
  const stopBt = () => void api.btStop().finally(() => setBtRec(false));
  async function saveBt() {
    if (!btStarted) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const path = await save({ defaultPath: `portdock-bluetooth-${stamp}.txt`, filters: [{ name: "Text", extensions: ["txt"] }] });
    if (!path) return;
    await api
      .writeText(path, btText(lang, APP, VERSION, btRows, btLog, btStarted))
      .then(() => toast.show(t("saved", { p: path })))
      .catch((e) => toast.show(String(e), { error: true }));
  }

  // ================================================================ 블루투스 소리
  const [audio, setAudio] = useState<BtAudioState | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const readAudio = useCallback(() => {
    setAudioLoading(true);
    api
      .btAudio()
      .then(setAudio)
      .catch((e) => setAudio({ audio: [], errors: [String(e)] }))
      .finally(() => setAudioLoading(false));
  }, []);
  const audioRead = useRef(false);
  useEffect(() => {
    if (tab === "audio" && !audioRead.current) {
      audioRead.current = true;
      readAudio();
    }
  }, [tab, readAudio]);
  const [volume, setVolume] = useState<number>(() => {
    const v = load<number>("toneVolume", 20);
    return v >= 0 && v <= 100 ? v : 20;
  });
  useEffect(() => store("toneVolume", volume), [volume]);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const play = (side: "left" | "right" | "both") => {
    try {
      count("test_tone");
      const ctx = (audioCtx.current ??= new AudioContext());
      void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const pan = ctx.createStereoPanner();
      osc.frequency.value = 440;
      pan.pan.value = side === "left" ? -1 : side === "right" ? 1 : 0;
      const g = (volume / 100) * 0.5;
      const t0 = ctx.currentTime;
      // 딸깍 소리가 나지 않게 천천히 켜고 끈다
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(g, t0 + 0.05);
      gain.gain.setValueAtTime(g, t0 + 0.9);
      gain.gain.linearRampToValueAtTime(0, t0 + 1);
      osc.connect(gain).connect(pan).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 1.02);
      setPlaying(side);
      osc.onended = () => setPlaying((p) => (p === side ? null : p));
    } catch (e) {
      toast.show(String(e), { error: true });
    }
  };
  useEffect(() => () => void audioCtx.current?.close().catch(() => {}), []);
  const defOut = audio?.audio.find((a) => a.flow === "render" && a.defaultConsole) ?? null;

  // ================================================================ 공통
  const busy = recording || btRec;
  useExitGuard(busy, settings.confirmExit, lang, APP);
  useEffect(() => {
    void api.keepAwake(busy).catch(() => {});
  }, [busy]);
  useEffect(() => {
    const off = () => void api.keepAwake(false).catch(() => {});
    window.addEventListener("pagehide", off);
    return () => window.removeEventListener("pagehide", off);
  }, []);
  const saveCurrent = () => {
    if (tab === "net") void saveCsv();
    else if (tab === "bt") void saveBt();
  };
  useShortcuts([{ key: "s", ctrl: true, run: saveCurrent }]);

  const tabTitle = (x: Tab) => t(`tab_${x}` as Key);
  const recMark = [recording && t("recNet"), btRec && t("recBt")].filter(Boolean).join(" · ");
  useWindowTitle(windowTitle(APP, [tabTitle(tab), recMark || null]));
  const dotCls = busy ? "s-connected" : "";
  const sideSummary = `${tabTitle(tab)}${recMark ? ` · ${recMark}` : ""}`;

  const pick = (x: Tab) => {
    setTab(x);
    setShowSide(false);
  };

  const statRow = (name: string, s: Stats | null, run: number | null, cls: string) => (
    <tr className={cls}>
      <th scope="row">{name}</th>
      <td className="num">{s ? s.sent : "—"}</td>
      <td className={`num${s && s.loss >= 2 ? " warn" : ""}`}>{s ? `${fmt(s.loss, s.loss >= 10 ? 0 : 1)}%` : "—"}</td>
      <td className="num">{fmt(s?.avg)}</td>
      <td className="num">{fmt(s?.p95)}</td>
      <td className="num">{fmt(s?.max)}</td>
      <td className="num">{fmt(s?.jitter, 1)}</td>
      <td className="num">{run == null ? "—" : run}</td>
    </tr>
  );

  let body: ReactNode;
  if (tab === "net") {
    const gwShown = info?.gateway ?? t("gwAuto");
    body = (
      <>
        <div className="toolbar">
          <b className="sel-title">{t("tab_net")}</b>
          {hasData && <span className={`lv lv-${summary.level === "short" ? "unread" : summary.level}`}>{LEVEL_TEXT[summary.level][lang]}</span>}
          <span className="grow" />
          {recording ? (
            <button className="btn danger rec-btn" onClick={stopRec} data-tip={tip(lang, "hwRecStop")}>
              ■ {t("recStop")}
            </button>
          ) : (
            <button className="btn primary rec-btn" onClick={() => void startRec()} disabled={!targetOk || !dnsOk || starting} data-tip={tip(lang, "hwRecStart")}>
              ● {t("recStart")}
            </button>
          )}
          <button className="btn small" disabled={!hasData} onClick={() => void copy(recText(lang, APP, VERSION, info, summary, wifi))} data-tip={tip(lang, "hwCopySummary")}>
            {t("copySummary")}
          </button>
          <button className="btn small" disabled={!hasData} onClick={() => void saveCsv()} data-tip={withKey(tip(lang, "hwSaveCsv"), KEYS.save)}>
            {t("saveCsv")}
          </button>
        </div>
        <div className="cards">
          <div className="net-config">
            <label className="field" data-tip={tip(lang, "hwTarget")}>
              <span>{t("target")}</span>
              <span className="row-inline">
                <select
                  className="target-sel"
                  value={custom ? "custom" : target}
                  disabled={recording}
                  aria-label={t("target")}
                  onChange={(e) => {
                    if (e.target.value === "custom") setCustom(true);
                    else {
                      setCustom(false);
                      setTarget(e.target.value);
                    }
                  }}
                >
                  {TARGETS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                  <option value="custom">{t("targetCustom")}</option>
                </select>
                {custom && <input className={`target-in${targetOk ? "" : " bad"}`} value={target} disabled={recording} onChange={(e) => setTarget(e.target.value)} aria-label={t("targetCustom")} placeholder="1.1.1.1" spellCheck={false} />}
              </span>
            </label>
            <label className="field" data-tip={tip(lang, "hwDns")}>
              <span>{t("dnsName")}</span>
              <input className={`dns-in${dnsOk ? "" : " bad"}`} value={dnsName} disabled={recording} onChange={(e) => setDnsName(e.target.value)} placeholder={DEFAULT_DNS} spellCheck={false} />
            </label>
            <label className="field" data-tip={tip(lang, "hwInterval")}>
              <span>{t("interval")}</span>
              <select value={intervalS} disabled={recording} onChange={(e) => setIntervalS(Number(e.target.value))}>
                {INTERVALS.map((s) => (
                  <option key={s} value={s}>
                    {t("everyS", { n: s })}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!targetOk && <div className="hint warn">{t("targetBad")}</div>}
          {!dnsOk && <div className="hint warn">{t("dnsBad")}</div>}
          <div className="out-note" data-tip={tip(lang, "hwOutNote")}>
            ↗ {t("outNote", { gw: gwShown, target: info?.target ?? target.trim(), n: info ? info.intervalMs / 1000 : intervalS })}
            {(info ? info.dnsName : dnsName.trim()) && ` ${t("outNoteDns", { name: info?.dnsName ?? dnsName.trim(), n: DNS_EVERY_S })}`} {t("outNoteOnly")}
          </div>
          {!hasData && !recording && !firstDone ? (
            <FirstCard lang={lang} title={t("firstTitle")} onHide={() => setFirstDone(true)} links={[{ id: "start", label: t("firstTitle") }]} onHelp={setShowHelp}>
              <ol>
                <li>{t("first1")}</li>
                <li>{t("first2")}</li>
                <li>{t("first3")}</li>
              </ol>
            </FirstCard>
          ) : null}
          <div className="chart-head">
            <span className="legend">
              <i className="sw sw-gw" /> {t("rowGw")} {info?.gateway ? <span className="mono">{info.gateway}</span> : null}
              <i className="sw sw-net" /> {t("rowNet")} {info ? <span className="mono">{info.target}</span> : null}
              <i className="sw sw-dns" /> DNS
              <i className="sw sw-loss" /> {t("legendLoss")}
              <i className="sw sw-down" /> {t("legendWifi")}
            </span>
            <span className="grow" />
            <span className="seg-group" role="group" aria-label={t("span")}>
              {SPANS.map((x) => (
                <button key={x.key} type="button" className={`seg${spanS === x.s ? " on" : ""}`} onClick={() => setSpanS(x.s)}>
                  {t(x.key)}
                </button>
              ))}
            </span>
          </div>
          <Chart series={series} marks={marks} spanMs={spanS == null ? null : spanS * 1000} now={recording ? now : (ticks.current[ticks.current.length - 1]?.ts ?? now)} unit="ms" ariaLabel={t("chartAria")} empty={t("chartEmpty")} />
          {hasData && (
            <section className="card summary">
              <div className="sub-title">
                {t("summary")} <span className={`lv lv-${summary.level === "short" ? "unread" : summary.level}`}>{LEVEL_TEXT[summary.level][lang]}</span>
                {info && <span className="hint"> · {t("since", { t: clock(info.startedAt) })}</span>}
              </div>
              <ul className="card-notes">
                {summary.notes.map((n, i) => (
                  <li key={i}>{n[lang]}</li>
                ))}
              </ul>
              <table className="grid stats">
                <thead>
                  <tr>
                    <th />
                    <th>{t("colSent")}</th>
                    <th>{t("colLoss")}</th>
                    <th>{t("colAvg")}</th>
                    <th data-tip={TERMS.p95[lang][1]}>95%</th>
                    <th>{t("colMax")}</th>
                    <th data-tip={TERMS.jitter[lang][1]}>{t("colJitter")}</th>
                    <th data-tip={TERMS.lossRun[lang][1]}>{t("colRun")}</th>
                  </tr>
                </thead>
                <tbody>
                  {statRow(t("rowGw"), summary.gw, info?.gateway ? lossRun.gw : null, "st-gw")}
                  {statRow(t("rowNet"), summary.net, lossRun.net, "st-net")}
                  {statRow("DNS", summary.dns, null, "st-dns")}
                </tbody>
              </table>
              <div className="hint">{t("statsNote")}</div>
            </section>
          )}
          <section className="card events">
            <div className="sub-title">{t("events")}</div>
            {events.length ? (
              <table className="grid ev-list">
                <tbody>
                  {events.map((e, i) => (
                    <tr key={i} className={`ev-${e.kind}`}>
                      <td className="mono nowrap">{clock(e.ts)}</td>
                      <td>{e.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="hint">{t("eventsNone")}</div>
            )}
          </section>
          <div className="cannot-see">
            <ul>
              {CAVEATS.map((c) => (
                <li key={c.en}>{c[lang]}</li>
              ))}
            </ul>
            <div className="hint">{t("readOnlyNet")}</div>
          </div>
        </div>
      </>
    );
  } else if (tab === "signal") {
    body = (
      <>
        <div className="toolbar">
          <b className="sel-title">{t("tab_signal")}</b>
          {sigNote?.level && <span className={`lv lv-${sigNote.level}`}>{sigNote.level === "ok" ? LEVEL_TEXT.ok[lang] : LEVEL_TEXT.look[lang]}</span>}
          <span className="grow" />
          <button className={`btn ${sigOn ? "danger" : "primary"} sig-btn`} onClick={() => setSigOn(!sigOn)} data-tip={tip(lang, "hwSignal")}>
            {sigOn ? `■ ${t("sigStop")}` : `▶ ${t("sigStart")}`}
          </button>
        </div>
        <div className="cards">
          <div className="hint">{t("sigIntro")}</div>
          {!sigOn && !sig && <div className="empty-guide">{t("sigOff")}</div>}
          {sig && (
            <>
              <section className={`card sig-state st-${sig.state}`}>
                <div className="sub-title">{SIGNAL_STATE_TEXT[sig.state][lang]}</div>
                {sig.state === "denied" && (
                  <>
                    <ol className="plain-ol">
                      <li>{t("denied1")}</li>
                      <li>{t("denied2")}</li>
                      <li>{t("denied3")}</li>
                    </ol>
                    <a
                      href={WIFI_LOCATION_URL}
                      onClick={(e) => {
                        e.preventDefault();
                        void link(WIFI_LOCATION_URL);
                      }}
                    >
                      {t("deniedDoc")}
                    </a>
                  </>
                )}
                {sig.error && <div className="hint warn">{sig.error}</div>}
                {sig.state === "ok" && (
                  <dl className="kv">
                    {(
                      [
                        [t("kQuality"), sig.quality == null ? "—" : `${sig.quality}%`],
                        [t("kRssi"), sig.rssi == null ? "—" : `${sig.rssi} dBm`],
                        [t("kRate"), sig.rxMbps == null ? "—" : `${sig.rxMbps} / ${sig.txMbps ?? "—"} Mbps`],
                        [t("kPhy"), sig.phy ?? "—"],
                        [t("kBand"), sig.band ? `${sig.band} GHz` : "—"],
                        [t("kChannel"), sig.channel ?? "—"],
                        [t("kSame"), same == null ? "—" : String(same)],
                      ] as [string, ReactNode][]
                    ).map(([k, v]) => (
                      <div className="kv-row" key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {sigNote && <div className="hint">{sigNote.text[lang]}</div>}
              </section>
              {sigHist.length > 0 && <Chart series={[{ label: t("kQuality"), color: "--accent", points: sigHist }]} marks={[]} spanMs={SIGNAL_KEEP_MS} now={sigHist[sigHist.length - 1]?.ts ?? Date.now()} unit="%" fixedMax={100} ariaLabel={t("kQuality")} empty="" />}
              {sig.channels.length > 0 && (
                <section className="card channels">
                  <div className="sub-title">{t("chTitle")}</div>
                  <table className="grid ch-table">
                    <thead>
                      <tr>
                        <th>{t("kBand")}</th>
                        <th>{t("kChannel")}</th>
                        <th>{t("chCount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sig.channels.map((c) => (
                        <tr key={`${c.band}-${c.channel}`} className={c.mine ? "mine" : ""}>
                          <td>{c.band} GHz</td>
                          <td className="num">{c.channel}</td>
                          <td>
                            <span className="bar" style={{ width: `${Math.min(100, c.count * 10)}%` }} /> {c.count}
                            {c.mine && <b> · {t("chMine")}</b>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="hint">{t("chNote")}</div>
                </section>
              )}
            </>
          )}
          <div className="cannot-see">
            <div className="hint">{t("sigPrivacy")}</div>
          </div>
        </div>
      </>
    );
  } else if (tab === "bt") {
    body = (
      <>
        <div className="toolbar">
          <b className="sel-title">{t("tab_bt")}</b>
          <span className="grow" />
          {btRec ? (
            <button className="btn danger rec-btn" onClick={stopBt} data-tip={tip(lang, "hwBtStop")}>
              ■ {t("recStop")}
            </button>
          ) : (
            <button className="btn primary rec-btn" onClick={() => void startBt()} data-tip={tip(lang, "hwBtStart")}>
              ● {t("recStart")}
            </button>
          )}
          <button className="btn small" disabled={!btStarted} onClick={() => void copy(btText(lang, APP, VERSION, btRows, btLog, btStarted))} data-tip={tip(lang, "hwBtCopy")}>
            {t("copyLog")}
          </button>
          <button className="btn small" disabled={!btStarted} onClick={() => void saveBt()} data-tip={withKey(tip(lang, "hwBtCopy"), KEYS.save)}>
            {t("saveFile")}
          </button>
        </div>
        <div className="cards">
          <div className="hint">{t("btIntro")}</div>
          {btStarted == null ? (
            <div className="empty-guide">{t("btEmpty")}</div>
          ) : (
            <>
              <section className="card bt-devs">
                <div className="sub-title">
                  {t("btDevices")} <span className="hint">· {t("since", { t: clock(btStarted) })}</span>
                </div>
                {btRows.length ? (
                  <table className="grid bt-table">
                    <thead>
                      <tr>
                        <th>{t("colDev")}</th>
                        <th>{t("colName")}</th>
                        <th>{t("colNow")}</th>
                        <th>{t("colConnects")}</th>
                        <th>{t("colDrops")}</th>
                        <th>{t("colLast")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {btRows.map((r) => (
                        <tr key={r.n} className={r.connected ? "on" : ""}>
                          <td className="nowrap">{devLabel(lang, r.n)}</td>
                          <td className="ellipsis-cell" title={r.name}>
                            {r.name}
                          </td>
                          <td className="nowrap">{btStateText(lang, r.connected, r.removed)}</td>
                          <td className="num">{r.connects}</td>
                          <td className={`num${r.drops ? " warn" : ""}`}>{r.drops}</td>
                          <td className="mono nowrap">{r.last ? clock(r.last) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="hint">{t("btNone")}</div>
                )}
                <div className="hint">{t("btNameNote")}</div>
              </section>
              <section className="card bt-log">
                <div className="sub-title">{t("btTimeline")}</div>
                {btLog.length ? (
                  <table className="grid ev-list">
                    <tbody>
                      {[...btLog]
                        .reverse()
                        .slice(0, 300)
                        .map((l, i) => (
                          <tr key={i} className={l.connected ? "ev-wifiUp" : "ev-wifiDown"}>
                            <td className="mono nowrap">{clock(l.ts)}</td>
                            <td className="nowrap">{devLabel(lang, l.n)}</td>
                            <td>
                              {btStateText(lang, l.connected, l.removed)}
                              {l.added ? ` (${t("btNew")})` : ""}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="hint">{t("btNoChange")}</div>
                )}
              </section>
            </>
          )}
          <div className="cannot-see">
            <div className="hint">{t("btReadOnly")}</div>
          </div>
        </div>
      </>
    );
  } else if (tab === "audio") {
    body = (
      <>
        <div className="toolbar">
          <b className="sel-title">{t("tab_audio")}</b>
          <span className="grow" />
          <button className="btn small" onClick={readAudio} disabled={audioLoading} data-tip={tip(lang, "hwAudioReload")}>
            ↻ {t("reload")}
          </button>
        </div>
        <div className="cards">
          <section className="card audio-mode">
            <div className="sub-title">{t("audioDefault")}</div>
            {!audio ? (
              <div className="hint">{t("loading")}</div>
            ) : !defOut ? (
              <div className="hint">{t("audioNotBt")}</div>
            ) : (
              <>
                <div className="audio-now">
                  <span className={`lv lv-${defOut.kind === "handsFree" ? "look" : "ok"}`}>{t(defOut.kind === "handsFree" ? "kindHandsFree" : defOut.kind === "stereo" ? "kindStereo" : "kindOther")}</span> <span className="ellipsis">{defOut.name}</span>
                </div>
                <div className="hint">{t(defOut.kind === "handsFree" ? "audioHfNote" : defOut.kind === "stereo" ? "audioStereoNote" : "audioOtherNote")}</div>
              </>
            )}
            {audio && audio.audio.length > 0 && (
              <table className="grid audio-table">
                <thead>
                  <tr>
                    <th>{t("colName")}</th>
                    <th>{t("colFlow")}</th>
                    <th>{t("colKind")}</th>
                    <th>{t("colDefault")}</th>
                  </tr>
                </thead>
                <tbody>
                  {audio.audio.map((a, i) => (
                    <tr key={i}>
                      <td className="ellipsis-cell" title={a.name}>
                        {a.name}
                      </td>
                      <td>{t(a.flow === "render" ? "flowOut" : "flowIn")}</td>
                      <td>{t(a.kind === "handsFree" ? "kindHandsFree" : a.kind === "stereo" ? "kindStereo" : "kindOther")}</td>
                      <td>{[a.defaultConsole && t("defMedia"), a.defaultComms && t("defComms")].filter(Boolean).join(" · ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {audio?.errors.map((x) => (
              <div key={x} className="hint warn">
                {t("readFail")}: {x}
              </div>
            ))}
          </section>
          <section className="card tone">
            <div className="sub-title">{t("toneTitle")}</div>
            <div className="hint warn">{t("toneWarn")}</div>
            <label className="field vol" data-tip={tip(lang, "hwVolume")}>
              <span>
                {t("volume")} {volume}%
              </span>
              <input type="range" min={0} max={100} step={5} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label={t("volume")} />
            </label>
            <div className="row-inline tone-btns">
              {(["left", "right", "both"] as const).map((s) => (
                <button key={s} className={`btn${playing === s ? " on" : ""}`} onClick={() => play(s)} disabled={volume === 0}>
                  ♪ {t(s === "left" ? "toneLeft" : s === "right" ? "toneRight" : "toneBoth")}
                </button>
              ))}
            </div>
            <div className="hint">{t("toneNote")}</div>
          </section>
          <div className="cannot-see">
            <div className="hint">{t("audioPrivacy")}</div>
          </div>
        </div>
      </>
    );
  } else {
    const url = webToolUrl(lang, LATER_WEB[tab]);
    body = (
      <>
        <div className="toolbar">
          <b className="sel-title">{tabTitle(tab)}</b>
        </div>
        <div className="cards">
          <div className="empty-guide later">
            <b>{t("laterTitle")}</b>
            <div>{t("laterBody")}</div>
            <div>
              {t("laterWeb")}{" "}
              <a
                className="later-web"
                href={url}
                onClick={(e) => {
                  e.preventDefault();
                  void link(url);
                }}
              >
                {url.replace("https://", "")}
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  // 머리줄 도구 — 넓은 창은 왼쪽 칸 머리, 좁은 창은 요약 줄(NarrowBar)에 그린다(한 번에 한 곳)
  const headTools = (
    <>
            <select className="lang" aria-label={lang === "ko" ? "언어" : "Language"} value={lang} onChange={(e) => update({ lang: e.target.value as Lang })}>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
            <PinButton lang={lang} on={settings.alwaysOnTop} onToggle={(v) => update({ alwaysOnTop: v })} />
            <ReportButton app={APP} lang={lang} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} usageAsked={settings.usageAsked} onUsage={(on) => update({ usageStats: on, usageAsked: true })} />
            <AiCopyButton app={APP} lang={lang} checks={() => [hasData && recText(lang, APP, VERSION, info, summary, wifi), btRows.length > 0 && btText(lang, APP, VERSION, btRows, btLog, btStarted)].filter(Boolean).join("\n\n") || null} />
            <button className="icon-btn" onClick={openHelp} title={t("helpTip")} aria-label={t("helpTip")}>
              ?
            </button>
            <button className="icon-btn" onClick={() => setShowSettings(true)} title={ui(lang, "settings")} aria-label={ui(lang, "settings")}>
              ⚙
            </button>
    </>
  );
  return (
    <div className={`app${showSide ? " show-side" : ""}`}>
      <SideBackdrop open={showSide} onClose={() => setShowSide(false)} />
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>Hardware Tester</small>
          </span>
          <span className="brand-tools">
            <SideTools>{headTools}</SideTools>
            <SideClose lang={lang} onClose={() => setShowSide(false)} />
          </span>
        </div>
        <nav className="hw-nav" role="tablist" aria-orientation="vertical" aria-label={t("navLabel")}>
          {TABS.map((x) => (
            <button key={x} type="button" role="tab" aria-selected={tab === x} className={`nav-item nav-${x}${tab === x ? " sel" : ""}`} onClick={() => pick(x)} data-tip={tip(lang, `hwTab_${x}`)}>
              <span className="nav-name">{tabTitle(x)}</span>
              {x === "net" && recording && <span className="tag rec">{t("recShort")}</span>}
              {x === "bt" && btRec && <span className="tag rec">{t("recShort")}</span>}
              {x === "signal" && sigOn && <span className="tag">{t("onShort")}</span>}
            </button>
          ))}
          <div className="label nav-later-head">{t("laterHead")}</div>
          {LATER.map((x) => (
            <button key={x} type="button" role="tab" aria-selected={tab === x} className={`nav-item later nav-${x}${tab === x ? " sel" : ""}`} onClick={() => pick(x)}>
              <span className="nav-name">{tabTitle(x)}</span>
              <span className="tag">{t("laterTag")}</span>
            </button>
          ))}
        </nav>
        <hr />
        <div className="hint">{t("readOnly")}</div>
      </aside>

      <main className="main">
        <NarrowBar tools={headTools} label={t("sideLabel")} lang={lang} open={showSide} onToggle={() => setShowSide(!showSide)} dot={dotCls} summary={sideSummary} />
        {body}
      </main>
      {showHelp && <HelpDialog doc={help} lang={lang} app={APP} start={typeof showHelp === "string" ? showHelp : null} onClose={() => setShowHelp(false)} />}
      {showSettings && <SettingsDialog app={APP} version={VERSION} settings={settings} update={update} reset={reset} onClose={() => setShowSettings(false)} writeText={api.writeText} readText={api.readText} busy={busy} />}
      {toast.node}
    </div>
  );
}
