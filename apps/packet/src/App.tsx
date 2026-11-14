import { LANG_NAMES, UI_LANGS } from "@shared/lang";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { VERSION } from "@shared/version";
import { load, store } from "@shared/framing";
import { ReportButton } from "@shared/ReportDialog";
import { HelpDialog, useHelpKey } from "@shared/HelpDialog";
import { rowHeight, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useToast } from "@shared/Toast";
import { useWindowTitle, windowTitle } from "@shared/useWindowTitle";
import { PinButton } from "@shared/PinButton";
import { ui } from "@shared/uiText";
import { DEVICES } from "@shared/deviceData";
import { api, type CapStart, type CapState, type DevMapInfo, type Detail, type ExpertReply, type FileInfo, type FilterFail, type Row, type Summary } from "./api";
import { ExpertPanel, FilterBar, FindBar, SummaryBar } from "./Bars";
import { CaptureDialog, ConvDialog, FollowDialog, RtDialog } from "./Dialogs";
import { help } from "./help";
import { dict, fill, type Key, type Lang } from "./i18n";
import { andFilter, pushHistory, sanitizeCols, type FlatNode, type TimeMode } from "./logic";
import { Bar, ContextMenu, HexView, PacketList, TreeView, nodeFilters, type MenuItem } from "./Panes";
import "./App.css";
import "./pk.css";

const APP = "PortDock Packet";
const TIME_MODES: TimeMode[] = ["rel", "abs", "delta", "deltaView"];
const isIp = (s: string) => /^[0-9a-fA-F:.]+$/.test(s) && (s.includes(".") || s.includes(":"));

export default function App() {
  const { settings, update, reset } = useSettings();
  const lang = settings.lang as Lang;
  const t = useCallback((k: Key, v?: Record<string, string | number>) => fill(dict[lang][k], v), [lang]);
  const toast = useToast(lang);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState<boolean | string>(false);
  const openHelp = useCallback(() => setShowHelp(true), []);
  useHelpKey(openHelp);

  // ---- 화면 설정(기억)
  const [cols, setColsState] = useState(() => sanitizeCols(load("pk.cols", {})));
  const setCols = (c: typeof cols) => {
    setColsState(c);
    store("pk.cols", c);
  };
  const [timeMode, setTimeModeState] = useState<TimeMode>(() => {
    const v = load<string>("pk.time", "rel");
    return TIME_MODES.includes(v as TimeMode) ? (v as TimeMode) : "rel";
  });
  const setTimeMode = (m: TimeMode) => (setTimeModeState(m), store("pk.time", m));
  const [listH, setListH] = useState(() => load<number>("pk.listH", 300));
  const [hexW, setHexW] = useState(() => load<number>("pk.hexW", 520));
  const [exH, setExH] = useState(() => load<number>("pk.exH", 190));
  const [exOpen, setExOpen] = useState(() => load<boolean>("pk.exOpen", true));
  useEffect(() => store("pk.listH", listH), [listH]);
  useEffect(() => store("pk.hexW", hexW), [hexW]);
  useEffect(() => store("pk.exH", exH), [exH]);
  useEffect(() => store("pk.exOpen", exOpen), [exOpen]);
  const [history, setHistory] = useState<string[]>(() => load<string[]>("pk.history", []));
  useEffect(() => store("pk.history", history), [history]);

  // ---- 파일·목록
  const [file, setFile] = useState<FileInfo | null>(null);
  const [opening, setOpening] = useState(false);
  const [total, setTotal] = useState(0);
  const [applied, setApplied] = useState("");
  const [outcome, setOutcome] = useState<{ shown: number; total: number; ms: number } | null>(null);
  const [applyError, setApplyError] = useState<FilterFail | null>(null);
  const [busy, setBusy] = useState(false);
  const [injected, setInjected] = useState<{ text: string; n: number } | null>(null);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [filterSeq, setFilterSeq] = useState(0);
  const [live, setLive] = useState<CapState | null>(null);
  const [capOpen, setCapOpen] = useState(false);
  const liveBusy = useRef(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [experts, setExperts] = useState<ExpertReply | null>(null);
  const [devId, setDevId] = useState("");
  const [devInfo, setDevInfo] = useState<DevMapInfo | null>(null);
  const [devVer, setDevVer] = useState(0);
  const filterInput = useRef<HTMLInputElement>(null);

  // ---- 선택·해석
  const [sel, setSel] = useState(-1);
  const [selNo, setSelNo] = useState(0);
  const [, setSelRow] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [selPath, setSelPath] = useState<string | null>(null);
  const [hl, setHl] = useState<{ start: number; len: number } | null>(null);
  const [reveal, setReveal] = useState<{ pos: number; n: number } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const [dlg, setDlg] = useState<null | "conv" | "follow" | "rt">(null);
  const [showFind, setShowFind] = useState(false);
  const [findMsg, setFindMsg] = useState("");
  const findFrom = useRef<number | null>(null);

  const appliedRef = useRef("");
  const sidRef = useRef(0);
  sidRef.current = file?.sid ?? 0;
  appliedRef.current = applied;

  const viewKey = `${live?.running ? `live${file?.packets ?? 0}` : file?.sid ?? 0}:${filterSeq}:${analysisReady ? 1 : 0}`;
  const rowH = rowHeight(settings.fontSize);

  const resetFile = (f: FileInfo) => {
    setFile(f);
    setTotal(f.packets);
    setApplied("");
    setOutcome(null);
    setApplyError(null);
    setAnalysisReady(false);
    setFilterSeq((n) => n + 1);
    setSummary(null);
    setExperts(null);
    setSel(-1);
    setSelNo(0);
    setSelRow(null);
    setDetail(null);
    setSelPath(null);
    setHl(null);
    setDevId("");
    setDevInfo(null);
    setFindMsg("");
    findFrom.current = null;
  };

  const openPath = useCallback(
    async (path: string) => {
      setOpening(true);
      try {
        const f = await api.openFile(path);
        resetFile(f);
        // 이벤트를 놓쳤을 때를 위해 한 번 확인
        setTimeout(() => {
          api.readyState().then(([a, p]) => {
            if (sidRef.current !== f.sid) return;
            if (a) setAnalysisReady(true);
            if (p) loadSummary(f.sid);
          });
        }, 1200);
      } catch (e) {
        toast.show(t("openFail", { e: String(e) }), { error: true, ms: 6000 });
      } finally {
        setOpening(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  // 실시간 캡처 — 받은 것을 파일로 내려 쓰고 다시 열어 목록을 갱신한다(필터는 그대로, 고른 패킷도 그대로)
  const refreshLive = useCallback(
    async (final: boolean) => {
      if (liveBusy.current) return;
      liveBusy.current = true;
      try {
        const f = await (final ? api.captureStop() : api.captureRefresh());
        if (!f) return;
        setFile(f);
        if (appliedRef.current) {
          const r = await api.setFilter(appliedRef.current);
          setOutcome({ shown: r.shown, total: r.total, ms: r.ms });
          setTotal(r.shown);
        } else {
          setTotal(f.packets);
        }
        setFilterSeq((n) => n + 1);
        setTimeout(() => {
          api.readyState().then(([a, p]) => {
            if (sidRef.current !== f.sid) return;
            if (a) setAnalysisReady(true);
            if (p) loadSummary(f.sid);
          });
        }, 900);
      } catch (e) {
        toast.show(String(e), { error: true, ms: 5000 });
      } finally {
        liveBusy.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const startCapture = useCallback(
    async (o: CapStart): Promise<string | null> => {
      try {
        await api.captureStart(o);
      } catch (e) {
        return t("capFail", { e: String(e) });
      }
      setCapOpen(false);
      setLive({ running: true, frames: 0, written: 0, secs: 0, error: null, path: "" });
      return null;
    },
    [t],
  );

  const stopCapture = useCallback(async () => {
    const s = await api.captureState();
    setLive({ ...s, running: false });
    for (let i = 0; i < 30 && liveBusy.current; i++) await new Promise((r) => setTimeout(r, 100));
    await refreshLive(true);
    toast.show(t("capStopped", { n: s.written.toLocaleString() }));
  }, [refreshLive, t]);

  useEffect(() => {
    if (!live?.running) return;
    const id = window.setInterval(async () => {
      const s = await api.captureState().catch(() => null);
      if (!s) return;
      setLive(s);
      if (s.written > 0) void refreshLive(false);
    }, 1500);
    return () => window.clearInterval(id);
  }, [live?.running, refreshLive]);

  const loadSummary = useCallback(
    (sid: number) => {
      api.summary().then((s) => sidRef.current === sid && setSummary(s));
      api.experts(lang).then((r) => sidRef.current === sid && setExperts(r));
    },
    [lang],
  );
  useEffect(() => {
    if (summary) api.experts(lang).then(setExperts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // 백엔드 이벤트 — 분석 끝(응답 시간·색), 요약·Expert 끝
  useEffect(() => {
    const subs = [
      listen<number>("pk-analysis", (e) => e.payload === sidRef.current && setAnalysisReady(true)),
      listen<number>("pk-ready", (e) => e.payload === sidRef.current && (setAnalysisReady(true), loadSummary(e.payload))),
    ];
    return () => void subs.forEach((s) => s.then((u) => u()));
  }, [loadSummary]);

  const pickFile = useCallback(async () => {
    const r = await open({ multiple: false, title: t("openTitle"), filters: [{ name: "pcap / pcapng", extensions: ["pcap", "pcapng", "cap"] }, { name: "*", extensions: ["*"] }] }).catch(() => null);
    if (typeof r === "string") void openPath(r);
  }, [openPath, t]);

  // 끌어 놓기 + 명령줄 인자
  useEffect(() => {
    const un = getCurrentWebview().onDragDropEvent((e) => {
      if (e.payload.type === "drop" && e.payload.paths[0]) void openPath(e.payload.paths[0]);
    });
    api.initialFile().then((p) => p && void openPath(p));
    return () => void un.then((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 필터
  const applyFilter = useCallback(
    async (text: string) => {
      if (!file) return;
      setBusy(true);
      setApplyError(null);
      try {
        const r = await api.setFilter(text);
        if (!r.current) return;
        setApplied(text.trim());
        setOutcome({ shown: r.shown, total: r.total, ms: r.ms });
        setTotal(r.shown);
        setFilterSeq((n) => n + 1);
        setHistory((h) => pushHistory(h, text));
        // 고른 패킷이 새 목록에 있으면 그 자리로
        if (selNo) {
          const pos = await api.locate(selNo);
          setSel(pos ?? -1);
          if (pos !== null) setReveal((x) => ({ pos, n: (x?.n ?? 0) + 1 }));
        }
      } catch (e) {
        const f = e as FilterFail;
        setApplyError(typeof f === "object" && f && "message" in f ? f : { message: String(e), pos: 0, len: 0, suggestions: [] });
      } finally {
        setBusy(false);
      }
    },
    [file, selNo],
  );
  const filterFromOutside = useCallback((text: string) => setInjected((x) => ({ text, n: (x?.n ?? 0) + 1 })), []);

  // ---- 선택 → 해석
  const onSel = useCallback((pos: number, row: Row | null) => {
    setSel(pos);
    setSelRow(row);
    if (row) setSelNo(row.no);
    else api.viewNo(pos).then((n) => n && setSelNo(n));
    findFrom.current = pos;
  }, []);
  useEffect(() => {
    if (!selNo || !file) {
      setDetail(null);
      return;
    }
    let stale = false;
    api
      .dissect(selNo, lang)
      .then((d) => {
        if (stale) return;
        setDetail(d);
        setSelPath(null);
        setHl(null);
      })
      .catch(() => !stale && setDetail(null));
    return () => {
      stale = true;
    };
  }, [selNo, lang, file, devVer]);

  const pickNode = useCallback((n: FlatNode) => {
    setSelPath(n.path.join("."));
    setHl(n.node.len > 0 ? { start: n.node.start, len: n.node.len } : null);
  }, []);

  const gotoFrame = useCallback(
    async (no: number) => {
      const pos = await api.locate(no);
      if (pos === null) return toast.show(t("notInView", { n: no }));
      setSel(pos);
      setSelNo(no);
      setSelRow(null);
      setReveal((x) => ({ pos, n: (x?.n ?? 0) + 1 }));
    },
    [t, toast],
  );

  const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.show(t("mCopied")), () => {});

  const treeMenu = (e: { x: number; y: number }, n: FlatNode) => {
    const f = nodeFilters(n.node, detail?.fields ?? []);
    setMenu({
      ...e,
      items: [
        { label: t("mApply"), disabled: !f.apply, run: () => f.apply && filterFromOutside(f.apply) },
        { label: t("mOnly"), disabled: !f.only, run: () => f.only && filterFromOutside(f.only) },
        { label: t("mAnd"), disabled: !f.only && !f.apply, run: () => filterFromOutside(andFilter(applied, (f.only ?? f.apply)!)) },
        { label: t("mNot"), disabled: !f.only, run: () => f.only && filterFromOutside(andFilter(applied, `!(${f.only})`)) },
        { label: t("mCopy"), run: () => void copy(n.node.label) },
        { label: t("mCopyFilter"), disabled: !f.only && !f.apply, run: () => void copy((f.only ?? f.apply)!) },
      ],
    });
  };
  const listMenu = (e: { x: number; y: number }, r: Row) => {
    const items: MenuItem[] = [{ label: t("mFollow"), run: () => setDlg("follow") }];
    if (r.pair?.peer) items.push({ label: t("mGotoPeer", { n: r.pair.peer }), run: () => void gotoFrame(r.pair!.peer) });
    if (isIp(r.src) && isIp(r.dst)) items.push({ label: t("mOnlyConv"), run: () => filterFromOutside(`ip.addr == ${r.src} && ip.addr == ${r.dst}`) });
    setMenu({ ...e, items });
  };

  // ---- 찾기
  const doFind = async (kind: string, text: string, forward: boolean) => {
    try {
      const pos = await api.find(kind, text, findFrom.current, forward);
      if (pos === null) return setFindMsg(t("findNone"));
      const no = await api.viewNo(pos);
      findFrom.current = pos;
      setSel(pos);
      if (no) {
        setSelNo(no);
        setSelRow(null);
        setFindMsg(t("findFound", { n: no }));
      }
      setReveal((x) => ({ pos, n: (x?.n ?? 0) + 1 }));
    } catch (e) {
      setFindMsg(String(e));
    }
  };

  // ---- 저장
  const doSave = async (scope: "all" | "view" | "selected") => {
    if (!file) return;
    const base = file.name.replace(/\.(pcapng|pcap|cap)$/i, "");
    const path = await save({ defaultPath: `${base}${scope === "all" ? "" : scope === "view" ? "-filtered" : `-${selNo}`}.pcapng`, filters: [{ name: "pcapng", extensions: ["pcapng"] }] }).catch(() => null);
    if (!path) return;
    try {
      const n = await api.savePcapng(path, scope, selNo ? [selNo] : []);
      toast.show(t("saved", { n }));
    } catch (e) {
      toast.show(String(e), { error: true });
    }
  };

  // ---- 장비 맵
  const chooseDevice = async (id: string) => {
    setDevId(id);
    try {
      const dev = DEVICES.find((d) => d.id === id);
      setDevInfo(await api.setDeviceMap(dev ? JSON.stringify(dev) : null));
      setDevVer((v) => v + 1);
    } catch (e) {
      toast.show(String(e), { error: true });
    }
  };

  // ---- 단축키
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const inField = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
        e.preventDefault();
        void pickFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (file) setShowFind(true);
      } else if (e.key === "/" && !inField && !e.ctrlKey) {
        e.preventDefault();
        filterInput.current?.focus();
      } else if (e.key === "Escape" && showFind && !dlg && !showHelp && !showSettings) {
        setShowFind(false);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [pickFile, file, showFind, dlg, showHelp, showSettings]);

  useWindowTitle(windowTitle(APP, [file?.name, file && `${file.packets.toLocaleString()}${lang === "ko" ? "개" : ""}`]));

  const fileView = file && { name: file.name, size: file.size, packets: file.packets, format: file.format, truncated: file.truncated, openMs: file.openMs };

  return (
    <div className="pk">
      <header className="pk-head-bar">
        <span className="logo">
          PortDock <small>Packet</small>
        </span>
        <button className="btn small primary" onClick={() => void pickFile()} title={t("openTip")}>
          {t("open")}
        </button>
        <span className="menu-wrap">
          <button
            className="btn small"
            disabled={!file}
            title={t("saveTip")}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setMenu({ x: r.left, y: r.bottom + 2, items: [{ label: t("saveAll"), run: () => void doSave("all") }, { label: t("saveView"), disabled: !applied, run: () => void doSave("view") }, { label: t("saveSel"), disabled: !selNo, run: () => void doSave("selected") }] });
            }}
          >
            {t("save")} ▾
          </button>
        </span>
        <button className="btn small" disabled={!file} onClick={() => setShowFind(true)} title={t("findTip")}>
          {t("find")}
        </button>
        <button className="btn small" disabled={!file} onClick={() => setDlg("conv")} title={t("convTip")}>
          {t("conv")}
        </button>
        <button className="btn small" disabled={!selNo} onClick={() => setDlg("follow")} title={t("followTip")}>
          {t("follow")}
        </button>
        <label className="tm" title={t("timeMode")}>
          <select value={timeMode} onChange={(e) => setTimeMode(e.target.value as TimeMode)} aria-label={t("timeMode")}>
            {TIME_MODES.map((m) => (
              <option key={m} value={m}>
                {t(`tm_${m}` as Key)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn small"
          title={t("columnsTip")}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setMenu({ x: r.left, y: r.bottom + 2, items: (["no", "time", "src", "dst", "proto", "len", "rt", "info"] as const).map((c) => ({ label: t(`col${c[0].toUpperCase()}${c.slice(1)}` as Key), checked: !cols.hidden.includes(c), keepOpen: true, run: () => setCols({ ...cols, hidden: cols.hidden.includes(c) ? cols.hidden.filter((x) => x !== c) : [...cols.hidden, c] }) })) });
          }}
        >
          {t("columns")} ▾
        </button>
        <span className="sm-spacer" />
        {live?.running ? (
          <button className="btn small danger" onClick={() => void stopCapture()} title={t("capStop")}>
            ■ {t("capStop")}
          </button>
        ) : (
          <button className="btn small" onClick={() => setCapOpen(true)} title={t("captureTip")}>
            ● {t("capture")}
          </button>
        )}
        <select className="lang" aria-label={ui(lang, "language")} value={lang} onChange={(e) => update({ lang: e.target.value as Lang })}>
          {UI_LANGS.map((l) => (
            <option key={l} value={l}>
              {LANG_NAMES[l]}
            </option>
          ))}
        </select>
        <PinButton lang={lang} on={settings.alwaysOnTop} onToggle={(v) => update({ alwaysOnTop: v })} />
        <ReportButton app={APP} lang={lang} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} usageAsked={settings.usageAsked} onUsage={(on) => update({ usageStats: on, usageAsked: true })} />
        <button className="icon-btn" onClick={openHelp} title={t("helpTip")} aria-label={t("helpTip")}>
          ?
        </button>
        <button className="icon-btn" onClick={() => setShowSettings(true)} title={ui(lang, "settings")} aria-label={ui(lang, "settings")}>
          ⚙
        </button>
      </header>

      <SummaryBar t={t} lang={lang} file={fileView} summary={summary} analyzing={!!file && !analysisReady || (!!file && !summary)} onFilter={filterFromOutside} onRt={() => setDlg("rt")} devInfo={devInfo} onDevice={chooseDevice} devId={devId} />
      {file && <FilterBar t={t} applied={applied} history={history} busy={busy} applyError={applyError} outcome={outcome} injected={injected} onApply={applyFilter} inputRef={filterInput} />}
      {showFind && file && <FindBar t={t} onClose={() => setShowFind(false)} onFind={doFind} message={findMsg} />}

      <main className="pk-main">
        {!file ? (
          <div className="pk-first">
            <div className="card">
              <h2>{opening ? t("opening") : t("emptyTitle")}</h2>
              <p>{t("emptyDrop")}</p>
              <ul>
                <li>{t("empty1")}</li>
                <li>{t("empty2")}</li>
                <li>{t("empty3")}</li>
              </ul>
              <button className="btn primary" onClick={() => void pickFile()}>
                {t("open")}
              </button>{" "}
              <button className="btn ghost" onClick={() => setShowHelp("start")}>
                {t("emptyHelp")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="pane list-pane" style={{ height: listH }}>
              {total === 0 ? <div className="pk-empty hint">{t("empty0")}</div> : <PacketList t={t} total={total} viewKey={viewKey} rowH={rowH} cols={cols} setCols={setCols} timeMode={timeMode} sel={sel} onSel={onSel} onMenu={listMenu} reveal={reveal} live={!!live?.running} />}
            </div>
            <Bar dir="v" invert size={listH} onSize={setListH} min={90} label="↕" />
            <div className="pane mid-pane">
              <div className="pane tree-pane">
                <TreeView t={t} detail={detail} selPath={selPath} onPick={pickNode} onMenu={treeMenu} />
              </div>
              <Bar dir="h" size={hexW} onSize={setHexW} min={260} max={1400} label="↔" />
              <div className="pane hex-pane" style={{ width: hexW }}>
                <HexView t={t} detail={detail} sel={hl} />
              </div>
            </div>
            <Bar dir="v" size={exH} onSize={setExH} min={60} max={600} label="↕" />
            <div className={`pane ex-pane${exOpen ? "" : " closed"}`} style={exOpen ? { height: exH } : undefined}>
              <div className="ex-tabs">
                <button className="tab on" onClick={() => setExOpen((v) => !v)} aria-expanded={exOpen} title={t("tabHide")}>
                  {exOpen ? "▾" : "▸"} {t("tabExpert")}
                  {experts && experts.total > 0 && <span className="badge">{experts.total.toLocaleString()}</span>}
                </button>
              </div>
              {exOpen && <ExpertPanel t={t} detail={detail} data={experts} onFilter={filterFromOutside} onGoto={(n) => void gotoFrame(n)} />}
            </div>
          </>
        )}
      </main>

      <footer className="pk-status">
        {live?.running && <span className="rec">● {t("capRunning", { n: live.written.toLocaleString(), s: live.secs })}</span>}
        <span>{file ? t("statusFile", { a: file.packets.toLocaleString() }) : t("noFile")}</span>
        {file && applied && <span>{t("statusShown", { a: total.toLocaleString() })}</span>}
        {selNo > 0 && <span>{t("statusSel", { n: selNo })}</span>}
        {detail && <span className="mono muted ellipsis">{detail.layers}</span>}
        <span className="sm-spacer" />
        <span className="muted">v{VERSION}</span>
      </footer>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
      {capOpen && <CaptureDialog t={t} onClose={() => setCapOpen(false)} onStart={startCapture} />}
      {dlg === "conv" && <ConvDialog t={t} onClose={() => setDlg(null)} onFilter={filterFromOutside} />}
      {dlg === "follow" && selNo > 0 && <FollowDialog t={t} no={selNo} onClose={() => setDlg(null)} onFilter={filterFromOutside} />}
      {dlg === "rt" && <RtDialog t={t} onClose={() => setDlg(null)} onFilter={filterFromOutside} />}
      {showHelp && <HelpDialog doc={help} lang={lang} app={APP} start={typeof showHelp === "string" ? showHelp : null} onClose={() => setShowHelp(false)} />}
      {showSettings && <SettingsDialog app={APP} version={VERSION} settings={settings} update={update} reset={reset} onClose={() => setShowSettings(false)} writeText={api.writeText} readText={api.readText} busy={busy} />}
      {toast.node}
    </div>
  );
}
