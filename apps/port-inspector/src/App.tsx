import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { VERSION } from "@shared/version";
import { save } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { load, store } from "@shared/framing";
import { tip } from "@shared/tips";
import { ReportButton } from "@shared/ReportDialog";
import { noteError } from "@shared/report";
import { HelpDialog, useHelpKey } from "@shared/HelpDialog";
import { FirstCard } from "@shared/FirstCard";
import { useFold, useSettings } from "@shared/settings";
import { SettingsDialog } from "@shared/SettingsDialog";
import { useExitGuard } from "@shared/exitGuard";
import { useToast } from "@shared/Toast";
import { KEYS, useShortcuts, withKey } from "@shared/shortcuts";
import { useWindowTitle, windowTitle } from "@shared/useWindowTitle";
import { PinButton } from "@shared/PinButton";
import { NarrowBar, SideBackdrop, SideClose } from "@shared/NarrowBar";
import { ui } from "@shared/uiText";
import { LoopbackPanel, type LoopState } from "@shared/LoopbackPanel";
import {
  bundleJson,
  bundleText,
  CANNOT_SEE,
  comVerdict,
  deviceVerdict,
  fmtTime,
  GUIDES,
  guideUrl,
  hex4,
  historyVerdict,
  LEVEL_TEXT,
  powerVerdict,
  settingsVerdict,
  USB_KIND_TEXT,
  USB_SPEED_TEXT,
  usbPathVerdict,
  type Bundle,
  type ComNumbers,
  type EventList,
  type Level,
  type NicList,
  type PortEntry,
  type PortReport,
  type Verdict,
} from "@shared/portinfo";
import { NicCard } from "./NicCard";
import { NIC_PURPOSES, nicsVerdict, type NicPurpose } from "@shared/nicCheck";
import { PC_DAYS, PcCard } from "./PcCard";
import { PC_PURPOSES, pcFailed, pcVerdict, type PcCheck, type PcPurpose } from "@shared/pcCheck";
import { api, loopApi } from "./api";
import { help } from "./help";
import { dict, fill, type Key, type Lang } from "./i18n";
import { entryKey, overall, portLabel } from "./model";
import "./App.css";

const APP = "PortDock Port Inspector";
const DAYS = [7, 30, 90];

/** 접히는 카드 — 머리에 결과 표시, 펼침 상태는 카드마다 기억(«모두 펼치기» 를 따른다) */
function Card({ id, title, verdict, lang, expandAll, children, tipKey }: { id: string; title: string; verdict?: Verdict; lang: Lang; expandAll: boolean; children: ReactNode; tipKey?: string }) {
  const [saved, setSaved] = useState<boolean>(() => load<boolean>(`open.${id}`, true) !== false);
  useEffect(() => store(`open.${id}`, saved), [id, saved]);
  const [open, setOpen] = useFold(saved, setSaved, expandAll);
  return (
    <details className={`card card-${id}`} open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary data-tip={tipKey ? tip(lang, tipKey) : undefined}>
        <span className="card-title">{title}</span>
        {verdict && <span className={`lv lv-${verdict.level}`}>{LEVEL_TEXT[verdict.level][lang]}</span>}
      </summary>
      {verdict && verdict.notes.length > 0 && (
        <ul className="card-notes">
          {verdict.notes.map((n, i) => (
            <li key={i}>{n[lang]}</li>
          ))}
        </ul>
      )}
      <div className="card-body">{children}</div>
    </details>
  );
}

function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="kv">
      {rows.map(([k, v]) => (
        <div className="kv-row" key={k}>
          <dt>{k}</dt>
          <dd>{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function App() {
  const { settings, update, reset } = useSettings();
  const lang = settings.lang;
  const setLang = (l: Lang) => update({ lang: l });
  const t = useCallback((k: Key, v?: Record<string, string | number>) => fill(dict[lang][k], v), [lang]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState<boolean | string>(false);
  const openHelp = useCallback(() => setShowHelp(true), []);
  useHelpKey(openHelp);
  const [showSide, setShowSide] = useState(false);
  const toast = useToast(lang);

  // ---- 포트 목록
  const [hidden, setHidden] = useState<boolean>(() => load<boolean>("hidden", false) === true);
  useEffect(() => store("hidden", hidden), [hidden]);
  const [ports, setPorts] = useState<PortEntry[]>([]);
  const [listing, setListing] = useState(true);
  const [listErr, setListErr] = useState<string | null>(null);
  const [selKey, setSelKey] = useState<string>(() => load("selected", ""));
  useEffect(() => store("selected", selKey), [selKey]);
  const reloadList = useCallback(() => {
    setListing(true);
    api
      .list(hidden)
      .then((l) => {
        setPorts(l);
        setListErr(null);
      })
      .catch((e) => setListErr(String(e)))
      .finally(() => setListing(false));
  }, [hidden]);
  useEffect(reloadList, [reloadList]);
  const sel = useMemo(() => ports.find((p) => entryKey(p) === selKey) ?? null, [ports, selKey]);

  // ---- 고른 포트 읽기
  const [report, setReport] = useState<PortReport | null>(null);
  const [reportErr, setReportErr] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [com, setCom] = useState<ComNumbers | null>(null);
  const [days, setDays] = useState<number>(() => {
    const d = load<number>("days", 30);
    return DAYS.includes(d) ? d : 30;
  });
  useEffect(() => store("days", days), [days]);
  const [events, setEvents] = useState<EventList | null>(null);
  const [evLoading, setEvLoading] = useState(false);
  const [nics, setNics] = useState<NicList | null>(null);
  const [nicsLoading, setNicsLoading] = useState(false);
  const [nicPurpose, setNicPurpose] = useState<NicPurpose>(() => {
    const v = load<string>("nicPurpose", "general");
    return (NIC_PURPOSES as string[]).includes(v) ? (v as NicPurpose) : "general";
  });
  useEffect(() => store("nicPurpose", nicPurpose), [nicPurpose]);
  // ---- 이 PC 점검(누를 때 읽는다 — 이벤트 로그를 훑어 몇 초 걸릴 수 있다)
  const [pc, setPc] = useState<PcCheck | null>(null);
  const [pcLoading, setPcLoading] = useState(false);
  const [pcPurpose, setPcPurpose] = useState<PcPurpose>(() => {
    const v = load<string>("pcPurpose", "general");
    return (PC_PURPOSES as string[]).includes(v) ? (v as PcPurpose) : "general";
  });
  useEffect(() => store("pcPurpose", pcPurpose), [pcPurpose]);
  const [pcDays, setPcDays] = useState<number>(() => {
    const d = load<number>("pcDays", 30);
    return PC_DAYS.includes(d) ? d : 30;
  });
  useEffect(() => store("pcDays", pcDays), [pcDays]);
  const [loop, setLoop] = useState<LoopState>({ results: [], echo: null, error: null });
  const [testing, setTesting] = useState(false);
  useEffect(() => {
    if (reportErr) noteError(reportErr);
  }, [reportErr]);

  // 읽기 요청 번호 — 늦게 온 앞 포트의 값이 새로 고른 포트를 덮지 않게
  const reportSeq = useRef(0);
  const eventsSeq = useRef(0);
  const readPort = useCallback(() => {
    const seq = ++reportSeq.current;
    if (!sel) {
      setReport(null);
      setReading(false);
      return;
    }
    setReading(true);
    setReportErr(null);
    // 다른 포트로 바꿨으면 앞 포트의 값을 지운다(다시 읽기면 새 값이 올 때까지 그대로)
    const key = entryKey(sel);
    setReport((old) => (old && entryKey(old.entry) === key ? old : null));
    api
      .report(key)
      .then((r) => {
        if (seq === reportSeq.current) setReport(r);
      })
      .catch((e) => {
        if (seq !== reportSeq.current) return;
        setReport(null);
        setReportErr(String(e));
      })
      .finally(() => {
        if (seq === reportSeq.current) setReading(false);
      });
    api
      .comNumbers()
      .then(setCom)
      .catch(() => setCom(null));
  }, [sel]);
  useEffect(readPort, [readPort]);

  // 이벤트 로그는 따로(몇 초 걸릴 수 있다)
  const readEvents = useCallback(() => {
    const seq = ++eventsSeq.current;
    if (!sel?.instanceId) {
      setEvents(null);
      setEvLoading(false);
      return;
    }
    setEvLoading(true);
    const mine = () => seq === eventsSeq.current;
    api
      .events(sel.instanceId, days)
      .then((ev) => {
        if (mine()) setEvents(ev);
      })
      .catch((e) => {
        if (mine()) setEvents({ events: [], days, errors: [String(e)] });
      })
      .finally(() => {
        if (mine()) setEvLoading(false);
      });
  }, [sel, days]);
  useEffect(readEvents, [readEvents]);

  const readNics = useCallback(() => {
    setNicsLoading(true);
    api
      .nics()
      .then(setNics)
      .catch((e) => setNics({ nics: [], errors: [String(e)] }))
      .finally(() => setNicsLoading(false));
  }, []);

  const pcSeq = useRef(0);
  const readPc = useCallback(() => {
    const seq = ++pcSeq.current;
    const mine = () => seq === pcSeq.current;
    setPcLoading(true);
    api
      .pc(pcDays)
      .then((p) => {
        if (mine()) setPc(p);
      })
      .catch((e) => {
        if (mine()) setPc(pcFailed(pcDays, String(e)));
      })
      .finally(() => {
        if (mine()) setPcLoading(false);
      });
  }, [pcDays]);
  // 기간을 바꾸면(이미 읽었으면) 다시 읽는다
  const pcRead = pc !== null;
  const pcReadRef = useRef(pcRead);
  pcReadRef.current = pcRead;
  useEffect(() => {
    if (pcReadRef.current) readPc();
  }, [readPc]);

  const refresh = useCallback(() => {
    reloadList();
    readPort();
    readEvents();
    if (nics) readNics();
    if (pcReadRef.current) readPc();
  }, [reloadList, readPort, readEvents, readNics, nics, readPc]);

  // ---- 판정
  const verdicts = useMemo(() => {
    if (!report) return null;
    return {
      device: deviceVerdict(report),
      ...(report.usbPath ? { usb: usbPathVerdict(report) } : {}),
      settings: settingsVerdict(report),
      power: powerVerdict(report),
      history: historyVerdict(events),
      com: comVerdict(com, report.entry.port),
    };
  }, [report, events, com]);
  const total: Level | null = verdicts ? overall(Object.values(verdicts).map((v) => v.level)) : null;

  // ---- 내보내기
  const bundle = (): Bundle => ({ app: APP, version: VERSION, report, com, events, nics, nicPurpose, pc, pcPurpose, loop: loop.results, echo: loop.echo, loopError: loop.error });
  const copy = (text: string) =>
    navigator.clipboard
      .writeText(text)
      .then(() => toast.show(t("copied")))
      .catch(() => toast.show(ui(lang, "copyFail"), { error: true }));
  async function saveFile() {
    if (!report) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const path = await save({
      defaultPath: `portdock-port-${report.entry.port ?? "device"}-${stamp}.txt`,
      filters: [
        { name: "Text", extensions: ["txt"] },
        { name: "JSON", extensions: ["json"] },
      ],
    });
    if (!path) return;
    const text = /\.json$/i.test(path) ? bundleJson(bundle()) : bundleText(lang, bundle());
    await api
      .writeText(path, text)
      .then(() => toast.show(t("saved", { p: path })))
      .catch((e) => toast.show(String(e), { error: true }));
  }

  useExitGuard(testing, settings.confirmExit, lang, APP);
  useShortcuts([
    { key: "F4", run: refresh },
    { key: "s", ctrl: true, run: () => void saveFile() },
  ]);

  const titleParts = [sel && portLabel(sel), total && LEVEL_TEXT[total][lang], testing && (lang === "ko" ? "시험 중" : "testing")];
  useWindowTitle(windowTitle(APP, titleParts));
  const summary = sel ? `${portLabel(sel)} · ${total ? LEVEL_TEXT[total][lang] : t("loading")}` : t("pick");
  const dotCls = total === "problem" ? "s-disconnected" : total === "ok" ? "s-connected" : "";
  const nowCount = ports.filter((p) => p.present).length;
  const [firstDone, setFirstDone] = useState<boolean>(() => load("firstHintDone", false));
  useEffect(() => store("firstHintDone", firstDone), [firstDone]);
  const link = (url: string) => openUrl(url).catch((e) => toast.show(String(e), { error: true }));

  const refreshButton = (small: boolean) => (
    <button className={`btn${small ? " small" : ""}`} onClick={refresh} disabled={listing || reading} data-tip={withKey(tip(lang, "piReload"), KEYS.connect)}>
      ↻ {t("reload")}
    </button>
  );

  const r = report;
  return (
    <div className={`app${showSide ? " show-side" : ""}`}>
      <SideBackdrop open={showSide} onClose={() => setShowSide(false)} />
      <aside className="side">
        <div className="brand">
          <span className="logo">
            PortDock <small>Port Inspector</small>
          </span>
          <span className="brand-tools">
            <select className="lang" aria-label={lang === "ko" ? "언어" : "Language"} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
            <PinButton lang={lang} on={settings.alwaysOnTop} onToggle={(v) => update({ alwaysOnTop: v })} />
            <ReportButton app={APP} lang={lang} autoReport={settings.autoReport} setAutoReport={(v) => update({ autoReport: v })} usageAsked={settings.usageAsked} onUsage={(on) => update({ usageStats: on, usageAsked: true })} />
            <button className="icon-btn" onClick={openHelp} title={t("helpTip")} aria-label={t("helpTip")}>
              ?
            </button>
            <button className="icon-btn" onClick={() => setShowSettings(true)} title={ui(lang, "settings")} aria-label={ui(lang, "settings")}>
              ⚙
            </button>
            <SideClose lang={lang} onClose={() => setShowSide(false)} />
          </span>
        </div>

        <div className="ports-head">
          <span className="label" data-tip={tip(lang, "piPorts")}>
            {t("ports")}
          </span>
          <button className="icon-btn" onClick={reloadList} disabled={listing} aria-label={t("reload")} data-tip={tip(lang, "piReload")}>
            ↻
          </button>
        </div>
        <div className="port-list" role="listbox" aria-label={t("ports")}>
          {ports.map((p) => {
            const k = entryKey(p);
            return (
              <button
                key={k}
                type="button"
                role="option"
                aria-selected={k === selKey}
                className={`port-item${k === selKey ? " sel" : ""}${p.present ? "" : " absent"}`}
                onClick={() => {
                  setSelKey(k);
                  setShowSide(false);
                }}
                title={p.instanceId || p.name}
              >
                <span className="pi-port mono">{p.port ?? "—"}</span>
                <span className="pi-name ellipsis">{p.name}</span>
                <span className="pi-tags">
                  {p.problem != null && <span className="lv lv-problem">{p.problem}</span>}
                  {!p.present && <span className="tag">{t("notPresent")}</span>}
                  {!p.instanceId && <span className="tag">{t("noDevice")}</span>}
                </span>
              </button>
            );
          })}
          {!listing && ports.length === 0 && <div className="hint">{hidden ? t("noPorts") : t("noPortsHidden")}</div>}
          {listing && ports.length === 0 && <div className="hint">{t("loading")}</div>}
        </div>
        {ports.length > 0 && <div className="hint">{t("portCount", { n: ports.length, h: ports.length - nowCount })}</div>}
        {listErr && <div className="hint warn">{listErr}</div>}
        <label className="inline" data-tip={tip(lang, "piHidden")}>
          <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> {t("hidden")}
        </label>
        <hr />
        <div className="hint">{t("readOnly")}</div>
      </aside>

      <main className="main">
        <NarrowBar lang={lang} open={showSide} onToggle={() => setShowSide(!showSide)} dot={dotCls} summary={summary}>
          {refreshButton(true)}
        </NarrowBar>
        <div className="toolbar">
          <b className="sel-title">{sel ? portLabel(sel) : t("pick")}</b>
          {total && <span className={`lv lv-${total}`}>{LEVEL_TEXT[total][lang]}</span>}
          <span className="grow" />
          {r && <span className="hint">{t("readAt", { t: fmtTime(r.readAt) })}</span>}
          {refreshButton(false)}
          <button className="btn small" disabled={!r} onClick={() => void copy(bundleText(lang, bundle()))} data-tip={tip(lang, "piCopyText")}>
            {t("copyText")}
          </button>
          <button className="btn small" disabled={!r} onClick={() => void copy(bundleJson(bundle()))} data-tip={tip(lang, "piCopyJson")}>
            {t("copyJson")}
          </button>
          <button className="btn small" disabled={!r} onClick={() => void saveFile()} data-tip={withKey(tip(lang, "piSave"), KEYS.save)}>
            {t("saveFile")}
          </button>
        </div>
        <div className="cards">
          {!sel ? (
            firstDone ? (
              <div className="empty-guide">{t("emptyGuide")}</div>
            ) : (
              <FirstCard lang={lang} title={t("firstTitle")} onHide={() => setFirstDone(true)} links={[{ id: "start", label: t("firstTitle") }]} onHelp={setShowHelp}>
                <ol>
                  <li>{t("first1")}</li>
                  <li>{t("first2")}</li>
                  <li>{t("first3")}</li>
                </ol>
              </FirstCard>
            )
          ) : reportErr ? (
            <div className="error pad">
              {t("readFail")}: {reportErr}
            </div>
          ) : !r || !verdicts ? (
            <div className="hint pad">{t("loading")}</div>
          ) : (
            <>
              <Card id="device" title={t("cardDevice")} verdict={verdicts.device} lang={lang} expandAll={settings.expandAll} tipKey="piCardDevice">
                <KV
                  rows={[
                    [t("kName"), r.entry.name],
                    [t("kPort"), r.entry.port],
                    [
                      t("kInstance"),
                      r.entry.instanceId ? (
                        <span className="mono id-line">
                          {r.entry.instanceId}{" "}
                          <button className="btn small ghost" onClick={() => void copy(r.entry.instanceId)} aria-label={t("copyId")} title={t("copyId")}>
                            ⧉
                          </button>
                        </span>
                      ) : null,
                    ],
                    [t("kVidPid"), r.entry.vid != null ? <span className="mono">{`${hex4(r.entry.vid)}:${hex4(r.entry.pid)}`}</span> : null],
                    [t("kChip"), r.chip ? `${r.chip.vendor}${r.chip.chip ? ` — ${r.chip.chip}` : ""}` : null],
                    [t("kBusDesc"), r.busDescription],
                    [t("kMaker"), r.manufacturer],
                    [t("kLocation"), r.location],
                    [t("kDriver"), [r.driver.provider, r.driver.version].filter(Boolean).join(" ") || null],
                    [t("kDriverDate"), r.driver.date ? fmtTime(r.driver.date, false) : null],
                    [t("kInf"), r.driver.inf],
                    [t("kService"), r.driver.service],
                    [t("kStatus"), r.status.present ? (r.status.started ? t("stPresent") : t("stNotStarted")) : t("stAbsent")],
                    ...(r.status.problem
                      ? ([
                          [t("kProblem"), <span key="p" className="lv lv-problem">{`${r.status.problem.code} — ${r.status.problem.meaning[lang]}`}</span>],
                          [t("kAction"), r.status.problem.action[lang]],
                        ] as [string, ReactNode][])
                      : []),
                    [t("kArrival"), fmtTime(r.lastArrival)],
                    [t("kRemoval"), fmtTime(r.lastRemoval)],
                    [t("kFirst"), fmtTime(r.firstInstall)],
                    [t("kParents"), r.ancestors.filter((a) => /^USB\\/i.test(a.instanceId)).map((a) => a.name).join(" → ") || null],
                  ]}
                />
                {r.chip?.note && !r.chip.clue && <div className="hint">{r.chip.note[lang]}</div>}
              </Card>

              {r.usbPath && verdicts.usb && (
                <Card id="usb" title={t("cardUsb")} verdict={verdicts.usb} lang={lang} expandAll={settings.expandAll} tipKey="piCardUsb">
                  {r.usbPath.hops.length ? (
                    <table className="grid usb-path">
                      <thead>
                        <tr>
                          <th>{t("usbColKind")}</th>
                          <th>{t("usbColName")}</th>
                          <th>{t("usbColPort")}</th>
                          <th>{t("usbColSpeed")}</th>
                          <th>{t("usbColPower")}</th>
                          <th>{t("nicCanOff")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.usbPath.hops.map((h) => {
                          const pw = r.power.devices.find((d) => d.instanceId.toUpperCase() === h.instanceId.toUpperCase());
                          return (
                            <tr key={h.instanceId} className={`usb-${h.kind}`}>
                              <td className="nowrap">{USB_KIND_TEXT[h.kind][lang]}</td>
                              <td title={h.instanceId}>{h.name}</td>
                              <td className="mono">{h.port ?? "—"}</td>
                              <td>{h.speed ? USB_SPEED_TEXT[h.speed][lang] : "—"}</td>
                              <td>{h.busPowered == null ? "—" : `${h.busPowered ? t("usbBus") : t("usbSelf")}${h.ports != null ? ` · ${t("usbPorts", { n: h.ports })}` : ""}`}</td>
                              <td>{pw ? (pw.canTurnOff ? t("on") : t("off")) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="hint">{t("usbNone")}</div>
                  )}
                  {r.usbPath.errors.map((x) => (
                    <div key={x} className="hint warn">
                      {t("readFail")}: {x}
                    </div>
                  ))}
                  <div className="hint">{t("usbNote")}</div>
                </Card>
              )}

              <Card id="settings" title={t("cardSettings")} verdict={verdicts.settings} lang={lang} expandAll={settings.expandAll} tipKey="piCardSettings">
                <KV rows={[[t("kDefault"), r.portDefault ? `${r.portDefault}${r.portDefaultNote ? ` (${r.portDefaultNote[lang]})` : ""}` : null]]} />
                <div className="hint">{t("defaultNote")}</div>
                <div className="sub-title">{t("params")}</div>
                {r.params.length ? (
                  <table className="grid params">
                    <tbody>
                      {r.params.map((p) => (
                        <tr key={p.name} className={p.note ? "noted" : ""}>
                          <td className="mono">{p.name}</td>
                          <td className="mono ellipsis-cell" title={p.value}>
                            {p.value}
                          </td>
                          <td className="hint">{p.note?.[lang] ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="hint">{t("paramsNone")}</div>
                )}
                <div className="hint">{t("paramsNote")}</div>
              </Card>

              <Card id="power" title={t("cardPower")} verdict={verdicts.power} lang={lang} expandAll={settings.expandAll} tipKey="piCardPower">
                <KV
                  rows={[
                    [
                      t("kSuspend"),
                      `${t("kSuspendAc")} ${r.power.usbSuspendAc == null ? "—" : r.power.usbSuspendAc ? t("on") : t("off")} · ${t("kSuspendDc")} ${r.power.usbSuspendDc == null ? "—" : r.power.usbSuspendDc ? t("on") : t("off")}`,
                    ],
                  ]}
                />
                <div className="sub-title">{t("kCanOff")}</div>
                {r.power.devices.length ? (
                  <ul className="plain">
                    {r.power.devices.map((d) => (
                      <li key={d.instanceId}>
                        {d.name} <span className="muted">({d.own ? t("own") : t("parent")})</span> — <b>{d.canTurnOff ? t("on") : t("off")}</b>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="hint">{t("powerNone")}</div>
                )}
              </Card>

              <Card id="history" title={t("cardHistory")} verdict={verdicts.history} lang={lang} expandAll={settings.expandAll} tipKey="piCardHistory">
                <KV
                  rows={[
                    [t("kArrival"), fmtTime(r.lastArrival)],
                    [t("kRemoval"), fmtTime(r.lastRemoval)],
                  ]}
                />
                <div className="row-inline">
                  <label className="inline" data-tip={tip(lang, "piDays")}>
                    {t("days")}
                    <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label={t("days")}>
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {t("daysN", { n: d })}
                        </option>
                      ))}
                    </select>
                  </label>
                  {evLoading && <span className="hint">{t("evLoading")}</span>}
                </div>
                {events && !evLoading && (
                  <>
                    {events.events.length ? (
                      <>
                        <div className="hint">{t("evMore", { n: events.events.length })}</div>
                        <table className="grid events">
                          <tbody>
                            {events.events.map((e, i) => (
                              <tr key={i} className={`ev-${e.kind}`}>
                                <td className="mono nowrap">{fmtTime(e.time)}</td>
                                <td className="nowrap">
                                  {e.id} · {t(`evKind_${e.kind}` as Key)}
                                </td>
                                <td className="ev-msg" title={e.message ?? ""}>
                                  {(e.message ?? e.provider).split(/\r?\n/)[0]}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    ) : (
                      <div className="hint">{t("evNone")}</div>
                    )}
                    {events.errors.map((x) => (
                      <div key={x} className="hint warn">
                        {t("readFail")}: {x}
                      </div>
                    ))}
                  </>
                )}
              </Card>

              <Card id="com" title={t("cardCom")} verdict={verdicts.com} lang={lang} expandAll={settings.expandAll} tipKey="piCardCom">
                {com && (
                  <>
                    {!com.comdbFound && <div className="hint">{t("comdbNone")}</div>}
                    <KV
                      rows={[
                        [t("kReserved"), com.reserved.map((n) => `COM${n}`).join(", ") || t("none")],
                        [t("kInUse"), com.present.map((n) => `COM${n}`).join(", ") || t("none")],
                        [t("kHiddenNums"), com.hidden.map(([n, name]) => `COM${n} (${name})`).join(", ") || t("none")],
                        [t("kOrphan"), com.orphan.map((n) => `COM${n}`).join(", ") || t("none")],
                        [t("kShared"), com.shared.map(([n, names]) => `COM${n}: ${names.join(" / ")}`).join(", ") || t("none")],
                        [t("kSerialcomm"), com.serialcomm.join(", ") || t("none")],
                      ]}
                    />
                    {com.errors.map((x) => (
                      <div key={x} className="hint warn">
                        {t("readFail")}: {x}
                      </div>
                    ))}
                  </>
                )}
              </Card>

              <Card id="loop" title={t("cardLoop")} lang={lang} expandAll={settings.expandAll} tipKey="piCardLoop">
                <LoopbackPanel
                  lang={lang}
                  port={r.entry.port}
                  api={loopApi}
                  service={r.driver.service}
                  disabledReason={!r.status.present ? t("loopAbsent") : null}
                  onState={setLoop}
                  onRunning={setTesting}
                />
              </Card>

              <Card id="nics" title={t("cardNics")} verdict={nics ? nicsVerdict(nics, nicPurpose) : undefined} lang={lang} expandAll={settings.expandAll} tipKey="piCardNics">
                <NicCard lang={lang} t={t} nics={nics} loading={nicsLoading} onLoad={readNics} purpose={nicPurpose} setPurpose={setNicPurpose} link={link} />
              </Card>

              <Card id="pc" title={t("cardPc")} verdict={pc ? pcVerdict(pc, pcPurpose, (ms) => fmtTime(ms)) : undefined} lang={lang} expandAll={settings.expandAll} tipKey="piCardPc">
                <PcCard lang={lang} t={t} pc={pc} loading={pcLoading} onLoad={readPc} purpose={pcPurpose} setPurpose={setPcPurpose} days={pcDays} setDays={setPcDays} link={link} />
              </Card>

              {r.errors.length > 0 && (
                <div className="hint warn pad">
                  {t("readFail")}: {r.errors.join(" / ")}
                </div>
              )}
            </>
          )}
          {sel && (
            <div className="cannot-see" data-tip={tip(lang, "piCannot")}>
              <b>{t("cardCannot")}</b>
              <div className="hint">{t("cannotIntro")}</div>
              <ul>
                {CANNOT_SEE.map((c) => (
                  <li key={c.en}>{c[lang]}</li>
                ))}
              </ul>
              <div className="guide-links">
                <span className="hint">{t("guides")}</span>
                {GUIDES.map((g) => (
                  <a
                    key={g.slug}
                    href={guideUrl(lang, g.slug)}
                    onClick={(e) => {
                      e.preventDefault();
                      void link(guideUrl(lang, g.slug));
                    }}
                  >
                    {g.title[lang]}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      {showHelp && <HelpDialog doc={help} lang={lang} app={APP} start={typeof showHelp === "string" ? showHelp : null} onClose={() => setShowHelp(false)} />}
      {showSettings && <SettingsDialog app={APP} version={VERSION} settings={settings} update={update} reset={reset} onClose={() => setShowSettings(false)} writeText={api.writeText} readText={api.readText} busy={testing} />}
      {toast.node}
    </div>
  );
}
