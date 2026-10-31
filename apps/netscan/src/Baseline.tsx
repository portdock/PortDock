// «기준과 비교» 탭(0.10.0) — 찾은 장비 목록을 이름 붙여 기준으로 저장(이 PC 의 앱 저장소, 원하면 JSON 파일)하고
// 이번 찾기 결과와 비교한다. 비교 로직은 shared/scanBaseline.ts(시험 있음).
import { useEffect, useMemo, useRef, useState } from "react";
import { ask, open as openDialog, save } from "@tauri-apps/plugin-dialog";
import { load, store } from "@shared/framing";
import { tip } from "@shared/tips";
import { count } from "@shared/usage";
import { BASELINE_MAX, CHANGE_TEXT, compareScan, diffCsv, diffDetail, diffSummary, diffText, makeBaseline, parseBaseline, scopeOf, freeName, upsertPlan, type BaseHost, type Baseline, type HostChange, type ScanDiff } from "@shared/scanBaseline";
import { api, type Host } from "./api";
import type { Key, Lang } from "./i18n";
import { stamp } from "./net";
import "@shared/compare.css";

type T = (k: Key, v?: Record<string, string | number>) => string;
type Toast = {
  show: (text: string, o?: { error?: boolean; ms?: number }) => void;
};

/** 이번 찾기 — 기준과 비교할 모양 */
export interface ScanNow {
  hosts: Host[];
  range: string;
  ports: number[];
  first: string | null;
  last: string | null;
  phase: "idle" | "scanning" | "checking" | "done" | "cancelled";
}

const toBase = (h: Host): BaseHost => ({
  ip: h.ip,
  mac: h.mac,
  vendor: h.vendor,
  name: h.name,
  ports: h.ports,
  modbus: h.modbus ? [h.modbus.vendor, h.modbus.product, h.modbus.revision].filter(Boolean).join(" ") || null : null,
});
const day = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function loadList(): Baseline[] {
  const raw = load<unknown[]>("baselines", []);
  return Array.isArray(raw) ? raw.map(parseBaseline).filter((b): b is Baseline => !!b) : [];
}

/** 기준 목록·고른 기준·비교 결과 — App 이 AI 복사 글에도 쓴다 */
export function useBaselines(now: ScanNow, lang: Lang) {
  const [list, setList] = useState<Baseline[]>(loadList);
  useEffect(() => store("baselines", list), [list]);
  const [selName, setSelName] = useState<string>(() => load("baselineSel", ""));
  useEffect(() => store("baselineSel", selName), [selName]);
  const selected = list.find((b) => b.name === selName) ?? null;
  const ready = now.phase === "done" || now.phase === "cancelled";
  const diff: ScanDiff | null = useMemo(() => (selected && ready ? compareScan(selected, { hosts: now.hosts.map(toBase), ports: now.ports }, scopeOf(now.first, now.last)) : null), [selected, ready, now.hosts, now.ports, now.first, now.last]);
  // 사용 통계 — 기준 하나와 찾기 결과 하나의 비교를 한 번만 센다
  const counted = useRef("");
  useEffect(() => {
    if (!diff || !selected) return;
    const k = `${selected.name}|${selected.savedAt}|${now.hosts.length}|${now.range}`;
    if (counted.current === k) return;
    counted.current = k;
    count("baseline_compare");
  }, [diff, selected, now.hosts.length, now.range]);
  const aiText = () => (selected && diff ? diffText(selected, diff, lang) : null);
  return { list, setList, selName, setSelName, selected, diff, aiText };
}

export type Baselines = ReturnType<typeof useBaselines>;

export function BaselineView({ lang, t, now, bs, toast, onError }: { lang: Lang; t: T; now: ScanNow; bs: Baselines; toast: Toast; onError: (e: string) => void }) {
  const [name, setName] = useState("");
  const [showSame, setShowSame] = useState<boolean>(() => load("baselineShowSame", false));
  useEffect(() => store("baselineShowSame", showSame), [showSame]);
  const scanning = now.phase === "scanning" || now.phase === "checking";
  const canSave = !scanning && now.hosts.length > 0 && now.phase !== "idle";
  const { selected, diff } = bs;

  /** 목록에 넣기 — 같은 이름은 바꿔 쓸지, 20개가 넘치면 가장 오래된 것을 지울지 먼저 묻는다. 넣은 것은 늘 남는다 */
  async function put(b: Baseline): Promise<string | null> {
    const p = upsertPlan(bs.list, b, BASELINE_MAX);
    const yes = (msg: string) => ask(msg, { kind: "warning" }).catch(() => false);
    if (p.replaced && !(await yes(t("bsReplaceAsk", { a: p.replaced.name })))) return null;
    if (p.dropped.length && !(await yes(t("bsDropAsk", { a: p.dropped[0].name, n: BASELINE_MAX })))) return null;
    bs.setList(p.list);
    bs.setSelName(b.name);
    return p.dropped.length ? t("bsDropped", { a: p.dropped.map((x) => x.name).join("», «") }) : "";
  }
  async function saveBaseline() {
    if (!canSave) return;
    const n = name.trim() || `${now.range} ${day(Date.now())}`;
    const b = makeBaseline(n, now.range, now.ports, now.hosts.map(toBase));
    const dropped = await put(b);
    if (dropped == null) return;
    setName("");
    count("baseline_save");
    toast.show([t("bsSaved", { a: b.name, n: b.hosts.length }), dropped].filter(Boolean).join(" · "));
  }
  async function removeBaseline() {
    if (!selected) return;
    const yes = await ask(t("bsDeleteAsk", { a: selected.name }), {
      kind: "warning",
    }).catch(() => false);
    if (!yes) return;
    bs.setList((l) => l.filter((b) => b.name !== selected.name));
    bs.setSelName("");
  }
  async function exportFile() {
    if (!selected) return;
    const safe = selected.name.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 60);
    const path = await save({
      defaultPath: `portdock-netscan-baseline-${safe}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path) return;
    await api
      .writeText(path, JSON.stringify(selected, null, 2) + "\n")
      .then(() => toast.show(`${t("bsExport").replace(/…$/, "")}: ${path}`))
      .catch((e) => onError(String(e)));
  }
  async function importFile() {
    const path = await openDialog({
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path || Array.isArray(path)) return;
    try {
      const b = parseBaseline(await api.readText(path));
      if (!b) {
        toast.show(t("bsBadFile"), { error: true });
        return;
      }
      // 불러온 것이 같은 이름을 말없이 덮지 않게 «이름 (2)»
      const free = freeName(bs.list, b.name);
      const item = free === b.name ? b : { ...b, name: free };
      const dropped = await put(item);
      if (dropped == null) return;
      toast.show([t("bsImported", { a: item.name, n: item.hosts.length }), free !== b.name ? t("bsRenamed", { a: free }) : "", dropped].filter(Boolean).join(" · "));
    } catch (e) {
      onError(String(e));
    }
  }
  async function exportCsv() {
    if (!selected || !diff) return;
    const path = await save({
      defaultPath: `portdock-netscan-compare-${stamp()}.csv`,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (!path) return;
    const head = `﻿# PortDock Net Scan · ${lang === "ko" ? "기준" : "baseline"} «${selected.name}» (${selected.range}, ${day(selected.savedAt)}) → ${now.range} · ${new Date().toISOString()}\r\n`;
    const rows = showSame ? diff.rows : diff.rows.filter((r) => r.change !== "same");
    await api
      .writeText(path, head + diffCsv(rows, lang))
      .then(() => toast.show(`${t("bsCsv")}: ${path}`))
      .catch((e) => onError(String(e)));
  }

  const rows = diff ? (showSame ? diff.rows : diff.rows.filter((r) => r.change !== "same")) : [];
  const counts: HostChange[] = ["macChanged", "ipChanged", "new", "gone", "portsChanged", "same"];
  return (
    <div className="cmp-pane">
      <div className="cmp-bar">
        <label className="inline" data-tip={tip(lang, "nsBasePick")}>
          {t("bsPick")}
          <select value={selected?.name ?? ""} onChange={(e) => bs.setSelName(e.target.value)} aria-label={t("bsPick")}>
            <option value="">{bs.list.length ? "—" : t("bsNone")}</option>
            {bs.list.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name} · {day(b.savedAt)} · {b.hosts.length}
              </option>
            ))}
          </select>
        </label>
        <button className="btn small" onClick={() => void exportFile()} disabled={!selected} data-tip={tip(lang, "nsBaseFile")}>
          {t("bsExport")}
        </button>
        <button className="btn small" onClick={() => void importFile()} data-tip={tip(lang, "nsBaseImport")}>
          {t("bsImport")}
        </button>
        <button className="btn small ghost" onClick={() => void removeBaseline()} disabled={!selected} data-tip={tip(lang, "nsBaseDelete")}>
          {t("bsDelete")}
        </button>
        <span className="grow" />
        <input
          type="text"
          className="bs-name"
          value={name}
          placeholder={t("bsNamePh")}
          aria-label={t("bsName")}
          disabled={!canSave}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && saveBaseline()}
        />
        <button className="btn small primary" onClick={saveBaseline} disabled={!canSave} data-tip={tip(lang, "nsBaseSave")}>
          {t("bsSave")}
        </button>
      </div>
      <div className="cmp-notes">
        <div className="hint">{t("bsIntro")}</div>
        <div className="hint cmp-mac-note">{t("bsMacNote")}</div>
        {selected && (
          <div className="hint mono">
            «{selected.name}» ·{" "}
            {t("bsInfo", {
              d: day(selected.savedAt),
              r: selected.range || "—",
              n: selected.hosts.length,
            })}
          </div>
        )}
        {now.phase === "idle" ? <div className="hint">{t("bsNeedScan")}</div> : scanning ? <div className="hint">{t("bsScanning")}</div> : !bs.list.length ? <div className="hint">{t("bsNeedBase")}</div> : null}
        {diff && now.phase === "cancelled" && <div className="hint warn">{t("bsCancelled")}</div>}
        {diff && diff.outside > 0 && (
          <div className="hint">
            {t("bsRangeDiff", {
              a: selected?.range || "—",
              b: now.range,
              n: diff.outside,
            })}
          </div>
        )}
        {diff && !diff.portsCompared && <div className="hint">{t("bsNoPorts")}</div>}
        {diff && (
          <div className="cmp-counts" aria-label={diffSummary(diff, lang)}>
            {counts
              .filter((c) => diff.counts[c] > 0)
              .map((c) => (
                <span key={c} className={`chg chg-${c}`} title={CHANGE_TEXT[c].hint[lang]}>
                  {CHANGE_TEXT[c][lang]} {diff.counts[c]}
                </span>
              ))}
            <span className="grow" />
            <label className="inline">
              <input type="checkbox" checked={showSame} onChange={(e) => setShowSame(e.target.checked)} /> {t("bsShowSame")}
            </label>
            <button className="btn small" onClick={() => void exportCsv()} data-tip={tip(lang, "nsBaseCsv")}>
              {t("bsCsv")}
            </button>
          </div>
        )}
        {diff && diff.rows.every((r) => r.change === "same") && <div className="hint">{t("bsNoChange")}</div>}
      </div>
      {diff && rows.length > 0 && (
        <table className="cmp-table bs-table">
          <thead>
            <tr>
              <th>{t("colChange")}</th>
              <th>{t("colIp")}</th>
              <th>{t("colMac")}</th>
              <th>{t("colVendor")}</th>
              <th>{t("colName")}</th>
              <th>{t("colDetail")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.change}-${r.ip}-${r.mac ?? ""}`} className={`row-${r.change}`}>
                <td>
                  <span className={`chg chg-${r.change}`} title={CHANGE_TEXT[r.change].hint[lang]}>
                    {CHANGE_TEXT[r.change][lang]}
                  </span>
                </td>
                <td className="mono">{r.ip}</td>
                <td className="mono">{r.mac ?? "—"}</td>
                <td>{r.vendor ?? ""}</td>
                <td>{r.name ?? ""}</td>
                <td className="mono">{diffDetail(r, lang) || (r.change === "same" ? "" : CHANGE_TEXT[r.change].hint[lang])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
