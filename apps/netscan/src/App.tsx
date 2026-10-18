import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { load, store } from "@shared/framing";
import { tip } from "@shared/tips";
import { ReportButton } from "@shared/ReportDialog";
import { noteError } from "@shared/report";
import { HelpDialog, useHelpKey } from "@shared/HelpDialog";
import { FirstCard } from "@shared/FirstCard";
import { useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { NumInput } from "@shared/NumInput";
import { useToast } from "@shared/Toast";
import { KEYS, useShortcuts, withKey } from "@shared/shortcuts";
import { useWindowTitle, windowTitle } from "@shared/useWindowTitle";
import { PinButton } from "@shared/PinButton";
import { NarrowBar, SideBackdrop, SideClose } from "@shared/NarrowBar";
import { ui } from "@shared/uiText";
import { api, type Host, type Nic, type NicAddr, type RangeInfo, type ScanEvent } from "./api";
import { help } from "./help";
import { dict, fill, type Key, type Lang } from "./i18n";
import { csvCell, DEFAULT_PORTS, defaultRange, ipNum, isIndustrial, parsePorts, sameSubnet, serviceLabel, serviceTip, stamp } from "./net";
import { MonitorView, useMonitor } from "./Monitor";
import "./App.css";

const APP = "PortDock Net Scan";

interface Cfg {
  /** «어댑터 id|IP» */
  nic: string;
  range: string;
  arp: boolean;
  ping: boolean;
  timeoutMs: number;
  portsOn: boolean;
  portsText: string;
  portTimeoutMs: number;
  names: boolean;
  modbusId: boolean;
  threads: number;
}

const DEFAULT_CFG: Cfg = { nic: "", range: "", arp: true, ping: true, timeoutMs: 800, portsOn: true, portsText: DEFAULT_PORTS, portTimeoutMs: 400, names: true, modbusId: true, threads: 64 };

type Phase = "idle" | "scanning" | "checking" | "done" | "cancelled";
type SortKey = "ip" | "mac" | "vendor" | "name" | "rtt" | "services";
/** 지난번 찾기에서 남겨 두는 것(새로 나타남·사라짐 비교용) */
interface Lite {
  ip: string;
  mac: string | null;
  vendor: string | null;
  name: string | null;
}
type History = Record<string, { at: number; hosts: Lite[] }>;
type Row = Host & { gone?: boolean };

const nicKey = (n: Nic, a: NicAddr) => `${n.id}|${a.ip}`;

export default function App() {
  const { settings, update, reset } = useSettings();
  const lang = settings.lang;
  const setLang = (l: Lang) => update({ lang: l });
  const t = useCallback((k: Key, v?: Record<string, string | number>) => fill(dict[lang][k], v), [lang]);
  const [showSettings, setShowSettings] = useState(false);
  // true = 첫 절, 글자 = 그 id 의 절(첫 실행 카드의 도움말 링크)
  const [showHelp, setShowHelp] = useState<boolean | string>(false);
  const openHelp = useCallback(() => setShowHelp(true), []);
  useHelpKey(openHelp);
  const [showSide, setShowSide] = useState(false);
  const toast = useToast(lang);
  const [tab, setTab] = useState<"results" | "monitor">(() => load("tab", "results"));
  useEffect(() => store("tab", tab), [tab]);

  // ---- 설정(마지막 값 기억)
  const [cfg, setCfgState] = useState<Cfg>(() => ({ ...DEFAULT_CFG, ...load<Partial<Cfg>>("cfg", {}) }));
  const setCfg = (p: Partial<Cfg>) => setCfgState((c) => ({ ...c, ...p }));
  useEffect(() => store("cfg", cfg), [cfg]);

  // ---- 랜카드
  const [nics, setNics] = useState<Nic[]>([]);
  const [nicErr, setNicErr] = useState<string | null>(null);
  const [nicsLoaded, setNicsLoaded] = useState(false);
  const reloadNics = useCallback(() => {
    api
      .listNics()
      .then((l) => {
        setNics(l);
        setNicErr(null);
      })
      .catch((e) => setNicErr(String(e)))
      .finally(() => setNicsLoaded(true));
  }, []);
  useEffect(reloadNics, [reloadNics]);
  const options = useMemo(() => nics.flatMap((n) => n.addrs.map((a) => ({ key: nicKey(n, a), nic: n, addr: a }))), [nics]);
  // 저장해 둔 랜카드가 없으면(다른 PC·뺀 USB 랜카드) 연결된 것 가운데 게이트웨이가 있는 것부터
  const sel = useMemo(() => {
    const saved = options.find((o) => o.key === cfg.nic);
    if (saved) return saved;
    return options.find((o) => o.nic.up && o.nic.gateway && !o.addr.ip.startsWith("169.254.")) ?? options.find((o) => o.nic.up) ?? options[0] ?? null;
  }, [options, cfg.nic]);
  // 범위가 비어 있으면 랜카드 대역으로
  useEffect(() => {
    if (sel && !cfg.range) setCfg({ range: defaultRange(sel.addr.ip, sel.addr.prefix) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel?.key]);
  function chooseNic(key: string) {
    const o = options.find((x) => x.key === key);
    setCfg({ nic: key, ...(o ? { range: defaultRange(o.addr.ip, o.addr.prefix) } : {}) });
  }

  // ---- 범위 미리보기
  const [info, setInfo] = useState<RangeInfo | null>(null);
  const [rangeErr, setRangeErr] = useState<string | null>(null);
  useEffect(() => {
    let stale = false;
    const id = setTimeout(() => {
      api
        .rangeInfo(cfg.range)
        .then((i) => {
          if (stale) return;
          setInfo(i);
          setRangeErr(null);
        })
        .catch((e) => {
          if (stale) return;
          setInfo(null);
          setRangeErr(String(e));
        });
    }, 150);
    return () => {
      stale = true;
      clearTimeout(id);
    };
  }, [cfg.range, lang]);
  const outside = !!(sel && info && cfg.arp && !(sameSubnet(info.first, sel.addr.ip, sel.addr.prefix) && sameSubnet(info.last, sel.addr.ip, sel.addr.prefix)));
  const portsParsed = useMemo(() => parsePorts(cfg.portsText, lang), [cfg.portsText, lang]);
  // «찾는 방법·포트» 는 기본값이 맞아 거의 안 건드린다 — 접어 두고 제목에 요약. 기본값과 다르거나 틀린 칸이 있으면 펼친 채로
  const advChanged = (["arp", "ping", "timeoutMs", "portsOn", "portsText", "portTimeoutMs", "names", "modbusId", "threads"] as const).some((k) => cfg[k] !== DEFAULT_CFG[k]);
  const advBad = (!cfg.ping && !cfg.arp) || (cfg.portsOn && !!portsParsed.error);
  const [advOpen, setAdvOpen] = useState<boolean>(() => advChanged || load("advOpen", false));
  useEffect(() => store("advOpen", advOpen), [advOpen]);
  useEffect(() => {
    if (advBad) setAdvOpen(true);
  }, [advBad]);
  const advSummary = [
    [cfg.arp && "ARP", cfg.ping && t("sumPing")].filter(Boolean).join("+") || "—",
    cfg.portsOn ? t("sumPorts", { n: portsParsed.ports.length }) : t("sumNoPorts"),
    cfg.portsOn && cfg.modbusId && t("sumModbus"),
    cfg.names && t("sumNames"),
  ]
    .filter(Boolean)
    .join(" · ");
  // 처음 쓰는 순서 카드(결과가 빈 자리) — «다시 보지 않기» 를 누르면 예전 한 줄 안내로
  const [firstDone, setFirstDone] = useState<boolean>(() => load("firstHintDone", false));
  useEffect(() => store("firstHintDone", firstDone), [firstDone]);

  // ---- 찾기
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [found, setFound] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (error) noteError(error);
  }, [error]);
  const hostsRef = useRef(new Map<string, Host>());
  const [version, setVersion] = useState(0);
  const [gone, setGone] = useState<Lite[]>([]);
  const prevRef = useRef<Set<string> | null>(null);
  const [scannedRange, setScannedRange] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const scanning = phase === "scanning" || phase === "checking";
  const [selected, setSelected] = useState<string | null>(null);

  // 찾기가 끝났다는 표시 — 끝난 뒤 처리(지난번과 비교·기록)는 아래 효과에서
  const [rangeDone, setRangeDone] = useState<{ cancelled: boolean } | null>(null);
  const onScanEvent = useCallback((e: ScanEvent) => {
    if (e.type === "host") {
      const old = hostsRef.current.get(e.host.ip);
      // Modbus 정보를 손으로 읽어 둔 게 있으면 지우지 않는다
      hostsRef.current.set(e.host.ip, { ...e.host, modbus: e.host.modbus ?? old?.modbus ?? null });
      setVersion((v) => v + 1);
    } else if (e.type === "progress") {
      setProgress({ done: e.done, total: e.total });
      setFound(e.found);
      setPhase(e.phase === "find" ? "scanning" : "checking");
    } else if (e.type === "done") {
      // 멈췄으면 확인하지 못한 장비도 «확인 중» 을 지운다
      for (const [ip, h] of hostsRef.current) if (!h.done) hostsRef.current.set(ip, { ...h, done: true });
      setFound(e.found);
      setElapsed(e.ms);
      setPhase(e.cancelled ? "cancelled" : "done");
      setRangeDone({ cancelled: e.cancelled });
    } else {
      setError(e.message);
    }
  }, []);
  // 다 찾았으면(멈춤 아님) 지난번과 비교해 사라진 것을 보이고 이번 것을 남긴다
  useEffect(() => {
    if (!rangeDone) return;
    setRangeDone(null);
    if (rangeDone.cancelled) return;
    const hist = load<History>("history", {});
    const prev = hist[scannedRange];
    const now = [...hostsRef.current.values()];
    if (prev) setGone(prev.hosts.filter((p) => !hostsRef.current.has(p.ip)));
    hist[scannedRange] = { at: Date.now(), hosts: now.map((h) => ({ ip: h.ip, mac: h.mac, vendor: h.vendor, name: h.name })) };
    // 범위 10개까지만 기억
    const keep = Object.entries(hist)
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, 10);
    store("history", Object.fromEntries(keep));
  }, [rangeDone, scannedRange]);

  const canScan = !!info && !info.tooMany && !rangeErr && (cfg.ping || cfg.arp) && (!cfg.portsOn || !portsParsed.error);
  async function startScan() {
    if (starting || scanning || !canScan) return;
    setStarting(true);
    setError(null);
    hostsRef.current = new Map();
    setGone([]);
    setSelected(null);
    const range = cfg.range.trim();
    const hist = load<History>("history", {});
    prevRef.current = hist[range] ? new Set(hist[range].hosts.map((h) => h.ip)) : null;
    setScannedRange(range);
    setProgress({ done: 0, total: info?.count ?? 0 });
    setFound(0);
    setVersion((v) => v + 1);
    try {
      const total = await api.scanStart(
        {
          range,
          nicIp: sel?.addr.ip ?? null,
          ping: cfg.ping,
          arp: cfg.arp,
          timeoutMs: cfg.timeoutMs,
          ports: cfg.portsOn ? portsParsed.ports : [],
          portTimeoutMs: cfg.portTimeoutMs,
          names: cfg.names,
          modbusId: cfg.modbusId && cfg.portsOn,
          threads: cfg.threads,
        },
        onScanEvent,
      );
      setProgress({ done: 0, total });
      setPhase("scanning");
    } catch (e) {
      setError(String(e));
      setPhase("idle");
    } finally {
      setStarting(false);
    }
  }
  async function stopScan() {
    await api.scanCancel().catch(() => {});
  }
  function clearResults() {
    if (scanning) return;
    hostsRef.current = new Map();
    setGone([]);
    setSelected(null);
    setPhase("idle");
    prevRef.current = null;
    setVersion((v) => v + 1);
  }

  // ---- 표: 거르기·정렬
  const [query, setQuery] = useState("");
  const [indOnly, setIndOnly] = useState<boolean>(() => load("indOnly", false));
  useEffect(() => store("indOnly", indOnly), [indOnly]);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>(() => load("sort", { key: "ip", dir: 1 }));
  useEffect(() => store("sort", sort), [sort]);
  const filterRef = useRef<HTMLInputElement>(null);
  const gateway = sel?.nic.gateway ?? null;
  const isNew = (ip: string) => !!prevRef.current && !prevRef.current.has(ip);
  const allRows: Row[] = useMemo(
    () => [...hostsRef.current.values(), ...gone.map((g) => ({ ...g, randomMac: false, rtt: null, arp: false, ports: [], modbus: null, me: false, done: true, gone: true }))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, gone],
  );
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = allRows.filter((h) => {
      if (indOnly && !h.ports.some(isIndustrial)) return false;
      if (!q) return true;
      const hay = [h.ip, h.mac, h.vendor, h.name, h.modbus?.vendor, h.modbus?.product, ...h.ports.map(serviceLabel), ...h.ports.map(String)].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
    const val = (h: Row): number | string => {
      switch (sort.key) {
        case "ip":
          return ipNum(h.ip);
        case "mac":
          return h.mac ?? "~";
        case "vendor":
          return (h.vendor ?? "~").toLowerCase();
        case "name":
          return (h.name ?? "~").toLowerCase();
        case "rtt":
          return h.rtt ?? 1e9;
        case "services":
          return -h.ports.filter(isIndustrial).length * 100 - h.ports.length;
      }
    };
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : ipNum(a.ip) - ipNum(b.ip)) * sort.dir;
    });
  }, [allRows, query, indOnly, sort]);
  const newCount = prevRef.current ? [...hostsRef.current.keys()].filter(isNew).length : 0;
  const head = (key: SortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button className="th-btn" onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : 1 }))} data-tip={tip(lang, "nsSort")}>
        {label}
        {sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );
  const selHost: Row | undefined = selected ? (hostsRef.current.get(selected) ?? allRows.find((r) => r.ip === selected)) : undefined;

  // ---- 장비에서 할 일
  const copy = (text: string) =>
    navigator.clipboard
      .writeText(text)
      .then(() => toast.show(t("copied", { a: text })))
      .catch(() => toast.show(ui(lang, "copyFail"), { error: true }));
  const openWeb = (ip: string, port: number | null, https: boolean) => api.openWeb(ip, port, https).catch((e) => toast.show(String(e), { error: true }));
  const wake = (mac: string) =>
    api
      .wake(mac, sel?.addr.ip ?? null, sel?.addr.prefix ?? null)
      .then((sent) => toast.show(t("woke", { a: sent.join(", ") })))
      .catch((e) => toast.show(String(e), { error: true }));
  const [identBusy, setIdentBusy] = useState(false);
  const readIdent = (ip: string) => {
    setIdentBusy(true);
    api
      .modbusIdent(ip)
      .then((id) => {
        const h = hostsRef.current.get(ip);
        if (h) hostsRef.current.set(ip, { ...h, modbus: id });
        setVersion((v) => v + 1);
      })
      .catch((e) => toast.show(`${t("identNone")}: ${e}`, { error: true }))
      .finally(() => setIdentBusy(false));
  };

  // ---- CSV
  async function exportCsv() {
    if (!allRows.length) return;
    const path = await save({ defaultPath: `portdock-netscan-${stamp()}.csv`, filters: [{ name: "CSV", extensions: ["csv"] }] });
    if (!path) return;
    const headRow = ["ip", "mac", "vendor", "name", "rtt_ms", "found_by", "open_ports", "services", "modbus_vendor", "modbus_product", "modbus_revision", "mark"];
    const lines = rows.map((h) =>
      [
        h.ip,
        h.mac,
        h.vendor,
        h.name,
        h.rtt,
        h.gone ? "" : [h.arp && "arp", h.rtt != null && "ping", h.me && "self"].filter(Boolean).join("+"),
        h.ports.join(" "),
        h.ports.map(serviceLabel).join(" "),
        h.modbus?.vendor,
        h.modbus?.product,
        h.modbus?.revision,
        h.gone ? "gone" : [isNew(h.ip) && "new", h.me && "self", h.ip === gateway && "gateway"].filter(Boolean).join(" "),
      ]
        .map(csvCell)
        .join(","),
    );
    const text = `﻿# ${APP} · ${scannedRange || cfg.range} · ${new Date().toISOString()}\r\n${headRow.join(",")}\r\n${lines.join("\r\n")}\r\n`;
    await api
      .writeText(path, text)
      .then(() => toast.show(`${t("exportCsv")}: ${path}`))
      .catch((e) => setError(String(e)));
  }

  // ---- 핑 감시
  const mon = useMonitor(lang, settings, toast);

  useExitGuard(scanning || mon.running, settings.confirmExit, lang, APP);
  const runDisabled = (!scanning && !canScan) || starting;
  useShortcuts([
    { key: "F4", run: () => !runDisabled && void (scanning ? stopScan() : startScan()) },
    { key: "s", ctrl: true, run: () => void exportCsv() },
    { key: "l", ctrl: true, run: clearResults },
    {
      key: "f",
      ctrl: true,
      run: () => {
        setTab("results");
        setTimeout(() => filterRef.current?.focus(), 0);
      },
    },
  ]);

  // ---- 상태·창 제목: «192.168.0.0/24 · 12대 — PortDock Net Scan»
  const n = hostsRef.current.size;
  const pct = progress.total ? Math.floor((progress.done / progress.total) * 100) : 0;
  const statusText =
    phase === "scanning"
      ? t("status_scanning", { p: pct, n })
      : phase === "checking"
        ? t("status_checking", { d: progress.done, t: progress.total, n })
        : phase === "done"
          ? t("status_done", { n: found, s: (elapsed / 1000).toFixed(1) })
          : phase === "cancelled"
            ? t("status_cancelled", { n })
            : t("status_idle");
  const countWord = lang === "ko" ? `${n}대` : `${n} ${n === 1 ? "host" : "hosts"}`;
  const titleParts = [phase !== "idle" && scannedRange, phase !== "idle" && (scanning ? `${countWord} · ${pct}%` : countWord), mon.running && (lang === "ko" ? `감시 ${mon.hosts.length}${mon.downCount ? ` · 끊김 ${mon.downCount}` : ""}` : `monitor ${mon.hosts.length}${mon.downCount ? ` · ${mon.downCount} down` : ""}`)];
  useWindowTitle(windowTitle(APP, titleParts, !!mon.logPath));
  const dotCls = scanning ? "s-connected" : error ? "s-disconnected" : "";
  const summary = `${cfg.range || "—"} · ${sel ? sel.nic.name : "—"} · ${statusText}`;

  const scanButton = (small: boolean) => (
    <button
      className={`${scanning ? "btn danger" : "btn primary"}${small ? " small" : ""}`}
      onClick={scanning ? stopScan : startScan}
      disabled={runDisabled}
      data-tip={withKey(tip(lang, scanning ? "nsStop" : "nsScan"), KEYS.connect)}
    >
      {scanning ? t("stop") : t("scan")}
    </button>
  );

  return (
    <div className={`app${showSide ? " show-side" : ""}`}>
      <SideBackdrop open={showSide} onClose={() => setShowSide(false)} />
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>Net Scan</small>
          </span>
          <span className="brand-tools">
            <select className="lang" aria-label={lang === "ko" ? "언어" : "Language"} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
            <PinButton lang={lang} on={settings.alwaysOnTop} onToggle={(v) => update({ alwaysOnTop: v })} />
            <ReportButton app={APP} lang={lang} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} />
            <button className="icon-btn" onClick={openHelp} title={t("helpTip")} aria-label={t("helpTip")}>
              ?
            </button>
            <button className="icon-btn" onClick={() => setShowSettings(true)} title={ui(lang, "settings")} aria-label={ui(lang, "settings")}>
              ⚙
            </button>
            <SideClose lang={lang} onClose={() => setShowSide(false)} />
          </span>
        </div>

        <label data-tip={tip(lang, "nsNic")}>
          {t("nic")}
          <span className="row-inline">
            <select value={sel?.key ?? ""} disabled={scanning} onChange={(e) => chooseNic(e.target.value)} aria-label={t("nic")}>
              {!sel && <option value="">{nicsLoaded ? t("nicNone") : "…"}</option>}
              {options.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.nic.name} — {o.addr.ip}/{o.addr.prefix}
                  {o.nic.up ? "" : ` (${t("nicDown")})`}
                </option>
              ))}
            </select>
            <button className="icon-btn" onClick={reloadNics} disabled={scanning} aria-label={t("nicReload")} data-tip={tip(lang, "nsNicReload")}>
              ↻
            </button>
          </span>
        </label>
        {sel && (
          <div className="nic-info hint" title={sel.nic.desc}>
            <div className="mono">
              IP {sel.addr.ip}/{sel.addr.prefix} <span className="muted">({sel.addr.mask})</span>
            </div>
            <div className="mono">
              {t("gateway")} {sel.nic.gateway ?? "—"}
            </div>
            {sel.nic.mac && (
              <div className="mono ellipsis">
                {t("nicMac", { mac: sel.nic.mac })}
                {sel.nic.vendor ? ` · ${sel.nic.vendor}` : ""}
              </div>
            )}
          </div>
        )}
        {nicErr && <div className="hint warn">{nicErr}</div>}

        <label data-tip={tip(lang, "nsRange")}>
          {t("range")}
          <span className="row-inline">
            <input className={rangeErr || info?.tooMany ? "bad mono" : "mono"} value={cfg.range} disabled={scanning} placeholder="192.168.0.0/24" onChange={(e) => setCfg({ range: e.target.value })} onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && void startScan()} />
          </span>
        </label>
        <div className="range-row">
          <span className={`hint${rangeErr || info?.tooMany ? " warn" : ""}`}>{rangeErr ? rangeErr : info ? (info.tooMany ? t("rangeTooMany", { n: info.count.toLocaleString(), max: 4096 }) : t("rangeCount", { n: info.count, a: info.first, b: info.last })) : ""}</span>
          {sel && cfg.range.trim() !== defaultRange(sel.addr.ip, sel.addr.prefix) && (
            <button className="btn small ghost" disabled={scanning} onClick={() => setCfg({ range: defaultRange(sel.addr.ip, sel.addr.prefix) })} data-tip={tip(lang, "nsRangeAuto")}>
              {t("rangeAuto")}
            </button>
          )}
        </div>
        {outside && !rangeErr && <div className="hint warn">{t("rangeOther")}</div>}
        {scanButton(false)}
        <div className={`status s-${scanning ? "connected" : "idle"}`}>{statusText}</div>
        {scanning && (
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <span style={{ width: `${pct}%` }} />
          </div>
        )}

        <hr />
        <details className="adv panel" open={advOpen} onToggle={(e) => setAdvOpen((e.target as HTMLDetailsElement).open)}>
          <summary data-tip={tip(lang, "nsAdv")}>
            <span className="sum-title">{t("adv")}</span>
            {!advOpen && (
              <span className="sum-note">
                {advSummary}
                {advChanged ? ` ${t("sumChanged")}` : ""}
              </span>
            )}
          </summary>
          <label className="inline" data-tip={tip(lang, "nsArp")}>
            <input type="checkbox" checked={cfg.arp} disabled={scanning} onChange={(e) => setCfg({ arp: e.target.checked })} /> {t("arp")}
          </label>
          <label className="inline" data-tip={tip(lang, "nsPing")}>
            <input type="checkbox" checked={cfg.ping} disabled={scanning} onChange={(e) => setCfg({ ping: e.target.checked })} /> {t("ping")}
          </label>
          {!cfg.ping && !cfg.arp && <div className="interlock">{lang === "ko" ? "핑과 ARP 가운데 하나는 켜야 합니다" : "Turn on ping or ARP (at least one)"}</div>}
          <div className="grid2">
            <label data-tip={tip(lang, "nsTimeout")}>
              {t("timeout")}
              <NumInput min={100} max={10000} value={cfg.timeoutMs} disabled={scanning} onValue={(v) => setCfg({ timeoutMs: v })} />
            </label>
            <label data-tip={tip(lang, "nsThreads")}>
              {t("threads")}
              <NumInput min={1} max={128} value={cfg.threads} disabled={scanning} onValue={(v) => setCfg({ threads: v })} />
            </label>
          </div>
          <label className="inline" data-tip={tip(lang, "nsNames")}>
            <input type="checkbox" checked={cfg.names} disabled={scanning} onChange={(e) => setCfg({ names: e.target.checked })} /> {t("names")}
          </label>

          <label className="inline" data-tip={tip(lang, "nsPorts")}>
            <input type="checkbox" checked={cfg.portsOn} disabled={scanning} onChange={(e) => setCfg({ portsOn: e.target.checked })} /> {t("ports")}
          </label>
          {cfg.portsOn && (
            <>
              <label data-tip={tip(lang, "nsPortList")}>
                {t("portList")}
                <input className={portsParsed.error ? "bad mono" : "mono"} value={cfg.portsText} disabled={scanning} onChange={(e) => setCfg({ portsText: e.target.value })} />
              </label>
              {portsParsed.error ? <div className="hint warn">{portsParsed.error}</div> : null}
              <div className="range-row">
                <label data-tip={tip(lang, "nsPortTimeout")} className="inline">
                  {t("portTimeout")}
                  <NumInput className="num" min={50} max={10000} value={cfg.portTimeoutMs} disabled={scanning} onValue={(v) => setCfg({ portTimeoutMs: v })} />
                </label>
                {cfg.portsText !== DEFAULT_PORTS && (
                  <button className="btn small ghost" disabled={scanning} onClick={() => setCfg({ portsText: DEFAULT_PORTS })} data-tip={tip(lang, "nsPortsDefault")}>
                    {t("portsDefault")}
                  </button>
                )}
              </div>
              <label className="inline" data-tip={tip(lang, "nsModbusId")}>
                <input type="checkbox" checked={cfg.modbusId} disabled={scanning} onChange={(e) => setCfg({ modbusId: e.target.checked })} /> {t("modbusId")}
              </label>
            </>
          )}
        </details>
        <div className="hint">{t("firewallHint")}</div>
      </aside>

      <main className="main">
        <NarrowBar lang={lang} open={showSide} onToggle={() => setShowSide(!showSide)} dot={dotCls} summary={summary}>
          {scanButton(true)}
        </NarrowBar>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === "results"} className={tab === "results" ? "tab on" : "tab"} onClick={() => setTab("results")} data-tip={tip(lang, "nsTabResults")}>
            {t("tabResults")}
            {n ? <span className="tab-n">{n}</span> : null}
          </button>
          <button role="tab" aria-selected={tab === "monitor"} className={tab === "monitor" ? "tab on" : "tab"} onClick={() => setTab("monitor")} data-tip={tip(lang, "nsTabMonitor")}>
            {t("tabMonitor")}
            {mon.running ? <span className={mon.downCount ? "tab-n bad" : "tab-n ok"}>{mon.downCount ? `${mon.downCount} ↓` : "●"}</span> : null}
          </button>
          {mon.logPath && <span className="rec">● REC</span>}
        </div>

        {tab === "results" ? (
          <>
            <div className="toolbar">
              <input ref={filterRef} className="filter" value={query} placeholder={t("filter")} aria-label={t("filter")} data-tip={tip(lang, "nsFilter")} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setQuery("")} />
              <label className="inline" data-tip={tip(lang, "nsIndustrialOnly")}>
                <input type="checkbox" checked={indOnly} onChange={(e) => setIndOnly(e.target.checked)} /> {t("industrialOnly")}
              </label>
              <span className="grow" />
              {newCount > 0 && (
                <span className="chip new" data-tip={tip(lang, "nsMarkNew")}>
                  {t("newCount", { n: newCount })}
                </span>
              )}
              {gone.length > 0 && (
                <span className="chip gone" data-tip={tip(lang, "nsMarkGone")}>
                  {t("goneCount", { n: gone.length })}
                </span>
              )}
              {(query || indOnly) && allRows.length > 0 && <span className="counter">{t("shown", { a: rows.length, b: allRows.length })}</span>}
              <button className="btn small" onClick={exportCsv} disabled={!allRows.length} data-tip={withKey(tip(lang, "nsExport"), KEYS.save)}>
                {t("exportCsv")}
              </button>
              <button className="btn small" onClick={clearResults} disabled={scanning || !allRows.length} data-tip={withKey(tip(lang, "nsClear"), KEYS.clear)}>
                {t("clear")}
              </button>
            </div>
            {error && <div className="error pad">{error}</div>}
            <div className="table-wrap">
              {allRows.length === 0 ? (
                firstDone ? (
                  <div className="empty-guide">{t("emptyGuide")}</div>
                ) : (
                  <FirstCard lang={lang} title={t("firstTitle")} onHide={() => setFirstDone(true)} links={[{ id: "start", label: t("firstTitle") }]} onHelp={setShowHelp}>
                    <ol>
                      <li>{t("first1")}</li>
                      <li>{t("first2")}</li>
                      <li>{t("first3")}</li>
                    </ol>
                    <div className="hint">{t("firstAdv")}</div>
                  </FirstCard>
                )
              ) : rows.length === 0 ? (
                <div className="empty-guide">{t("emptyFiltered")}</div>
              ) : (
                <table className="grid hosts">
                  <thead>
                    <tr>
                      {head("ip", t("colIp"))}
                      {head("mac", t("colMac"))}
                      {head("vendor", t("colVendor"))}
                      {head("name", t("colName"))}
                      {head("rtt", t("colRtt"))}
                      {head("services", t("colServices"))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((h) => (
                      <tr
                        key={h.ip + (h.gone ? "-gone" : "")}
                        className={`${selected === h.ip ? "sel" : ""}${h.gone ? " gone" : ""}`}
                        onClick={() => setSelected(h.ip)}
                        onDoubleClick={() => !h.gone && h.ports.includes(80) && void openWeb(h.ip, 80, false)}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && setSelected(h.ip)}
                      >
                        <td className="mono ip-cell">
                          {h.ip}
                          {h.gone ? <span className="mark gone">{t("markGone")}</span> : isNew(h.ip) ? <span className="mark new">{t("markNew")}</span> : null}
                          {h.me && <span className="mark me">{t("me")}</span>}
                          {h.ip === gateway && <span className="mark gw">{t("gateway")}</span>}
                        </td>
                        <td className="mono">{h.mac ?? <span className="muted" title={t("otherSubnet")}>—</span>}</td>
                        <td className="ellipsis-cell" title={h.vendor ?? undefined}>
                          {h.vendor ?? (h.randomMac ? <span className="muted">{t("randomMac")}</span> : "")}
                        </td>
                        <td className="ellipsis-cell" title={h.name ?? undefined}>
                          {h.name ?? ""}
                        </td>
                        <td className="mono num-cell">{h.gone ? "" : h.rtt == null ? <span className="muted">{h.arp ? t("arpOnly") : "—"}</span> : `${h.rtt < 1 ? t("under1") : h.rtt} ${t("ms")}`}</td>
                        <td className="chips">
                          {!h.done && !h.gone && <span className="muted">{t("checking")}</span>}
                          {h.ports.map((p) => (
                            <span key={p} className={isIndustrial(p) ? "chip svc ind" : "chip svc"} title={serviceTip(p, lang)}>
                              {serviceLabel(p)}
                            </span>
                          ))}
                          {h.modbus && (
                            <span className="chip svc ident" title={`${h.modbus.vendor} ${h.modbus.product} ${h.modbus.revision} (unit ${h.modbus.unit})`}>
                              {[h.modbus.vendor, h.modbus.product].filter(Boolean).join(" ")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="detail-bar">
              {!selHost ? (
                <div className="hint">{t("selectHost")}</div>
              ) : (
                <>
                  <div className="detail-head">
                    <b className="mono">{selHost.ip}</b>
                    {selHost.mac && (
                      <span className="mono">
                        {selHost.mac}
                        {selHost.vendor ? ` · ${selHost.vendor}` : selHost.randomMac ? ` · ${t("randomMac")}` : ""}
                      </span>
                    )}
                    {selHost.name && <span>{selHost.name}</span>}
                    {selHost.rtt != null && (
                      <span className="muted">
                        {t("rtt")} {selHost.rtt < 1 ? t("under1") : selHost.rtt} {t("ms")}
                      </span>
                    )}
                    <span className="grow" />
                    <button className="btn small ghost" onClick={() => setSelected(null)} aria-label={t("close")} title={t("close")}>
                      ✕
                    </button>
                  </div>
                  <div className="detail-actions">
                    {selHost.ports.includes(443) && !selHost.ports.includes(80) ? (
                      <button className="btn small" onClick={() => void openWeb(selHost.ip, 443, true)} data-tip={tip(lang, "nsOpenWeb")}>
                        {t("openWeb")} (https)
                      </button>
                    ) : (
                      <button className="btn small" onClick={() => void openWeb(selHost.ip, 80, false)} data-tip={tip(lang, "nsOpenWeb")}>
                        {t("openWeb")}
                      </button>
                    )}
                    {selHost.ports.includes(443) && selHost.ports.includes(80) && (
                      <button className="btn small" onClick={() => void openWeb(selHost.ip, 443, true)} data-tip={tip(lang, "nsOpenWeb")}>
                        https
                      </button>
                    )}
                    <button className="btn small" onClick={() => void copy(selHost.ip)} data-tip={tip(lang, "nsCopyIp")}>
                      {t("copyIp")}
                    </button>
                    <button className="btn small" onClick={() => selHost.mac && void copy(selHost.mac)} disabled={!selHost.mac} data-tip={tip(lang, "nsCopyMac")}>
                      {t("copyMac")}
                    </button>
                    <button className="btn small" onClick={() => selHost.mac && void wake(selHost.mac)} disabled={!selHost.mac || selHost.me} data-tip={selHost.mac ? tip(lang, "nsWol") : t("noMac")}>
                      {t("wol")}
                    </button>
                    <button
                      className="btn small"
                      onClick={() => {
                        if (mon.add(selHost.ip)) toast.show(`${selHost.ip} → ${t("tabMonitor")}`);
                      }}
                      disabled={mon.running || mon.hosts.includes(selHost.ip)}
                      data-tip={tip(lang, "nsToMonitor")}
                    >
                      {t("toMonitor")}
                    </button>
                    {selHost.ports.includes(502) && (
                      <button className="btn small" onClick={() => readIdent(selHost.ip)} disabled={identBusy} data-tip={tip(lang, "nsReadIdent")}>
                        {t("readIdent")}
                      </button>
                    )}
                  </div>
                  {selHost.modbus && (
                    <div className="ident mono">
                      {t("identVendor")}: {selHost.modbus.vendor || "—"} · {t("identProduct")}: {selHost.modbus.product || "—"} · {t("identRevision")}: {selHost.modbus.revision || "—"} · {t("identUnit")} {selHost.modbus.unit}
                    </div>
                  )}
                  {selHost.ports.length > 0 && (
                    <div className="detail-ports">
                      {selHost.ports.map((p) => (
                        <button key={p} className="chip svc copy" onClick={() => void copy(`${selHost.ip}:${p}`)} title={`${serviceTip(p, lang)} — ${t("hostPortHint")}`} aria-label={t("copyHostPort", { a: `${selHost.ip}:${p}` })}>
                          {serviceLabel(p)} <span className="mono">{p}</span> ⧉
                        </button>
                      ))}
                      <span className="hint">{t("hostPortHint")}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <MonitorView lang={lang} mon={mon} settings={settings} />
        )}
      </main>
      {showHelp && <HelpDialog doc={help} lang={lang} app={APP} start={typeof showHelp === "string" ? showHelp : null} onClose={() => setShowHelp(false)} />}
      {showSettings && <SettingsDialog app={APP} version="0.1.0" settings={settings} update={update} reset={reset} onClose={() => setShowSettings(false)} writeText={api.writeText} readText={api.readText} busy={scanning || mon.running} />}
      {toast.node}
    </div>
  );
}
