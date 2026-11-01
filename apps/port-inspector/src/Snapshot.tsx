// «지난번과 비교» 탭(0.10.0) — 지금 점검 결과(COM 포트·드라이버·USB 위치·랜카드 설정·이 PC 설정)를 이름 붙여 저장하고
// 나중에 다시 읽은 것과 비교해 바뀐 것만 보인다. 스냅샷 모양·비교는 shared/inspectSnapshot.ts(시험 있음).
// 기준에는 장치 일련번호(인스턴스 ID)·PC 이름·사용자 폴더·네트워크 이름을 넣지 않는다.
import { txt } from "@shared/textLang";
import { useEffect, useState } from "react";
import { ask, open as openDialog, save } from "@tauri-apps/plugin-dialog";
import { load, store } from "@shared/framing";
import { tip } from "@shared/tips";
import { count } from "@shared/usage";
import { VERSION } from "@shared/version";
import { fmtTime, type PortReport } from "@shared/portinfo";
import { compareSnapshots, makeSnapshot, parseSnapshot, SECTION_TEXT, SNAP_CHANGE_TEXT, snapDiffCsv, snapDiffText, type SnapDiff, type Snapshot } from "@shared/inspectSnapshot";
import { BASELINE_MAX, freeName, upsertPlan } from "@shared/scanBaseline";
import { api } from "./api";
import type { Key, Lang } from "./i18n";
import { entryKey } from "./model";
import "@shared/compare.css";

type T = (k: Key, v?: Record<string, string | number>) => string;
type Toast = {
  show: (text: string, o?: { error?: boolean; ms?: number }) => void;
};

/** 지금 상태를 새로 읽는다 — 연결된 COM 포트마다 장치 정보, 랜카드, 이 PC(기간 = «이 PC» 카드의 것) */
export async function readSnapshot(name: string, pcDays: number): Promise<Snapshot> {
  const entries = await api.list(false).catch(() => null);
  const reports: PortReport[] = [];
  for (const e of entries ?? []) {
    if (!e.present) continue;
    try {
      reports.push(await api.reportQuiet(entryKey(e)));
    } catch {
      /* 이 포트는 목록 값만 */
    }
  }
  const nics = await api.nicsQuiet().catch(() => null);
  const pc = await api.pcQuiet(pcDays).catch(() => null);
  return makeSnapshot(name, { entries, reports, nics, pc }, Date.now(), VERSION);
}

function loadList(): Snapshot[] {
  const raw = load<unknown[]>("snapshots", []);
  return Array.isArray(raw) ? raw.map(parseSnapshot).filter((s): s is Snapshot => !!s) : [];
}

const stampName = () => fmtTime(Date.now()).slice(0, 16);

export function useSnapshots(lang: Lang) {
  const [list, setList] = useState<Snapshot[]>(loadList);
  useEffect(() => store("snapshots", list), [list]);
  const [selName, setSelName] = useState<string>(() => load("snapshotSel", ""));
  useEffect(() => store("snapshotSel", selName), [selName]);
  const [result, setResult] = useState<{
    base: Snapshot;
    now: Snapshot;
    diff: SnapDiff;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = list.find((s) => s.name === selName) ?? null;
  // 다른 기준을 고르면 앞 비교는 지운다
  useEffect(() => {
    setResult((r) => (r && selected && r.base.name === selected.name && r.base.savedAt === selected.savedAt ? r : null));
  }, [selected]);
  const aiText = () => (result ? snapDiffText(lang, result.base, result.now, result.diff) : null);
  return {
    list,
    setList,
    selName,
    setSelName,
    selected,
    result,
    setResult,
    busy,
    setBusy,
    aiText,
  };
}
export type Snapshots = ReturnType<typeof useSnapshots>;

export function SnapshotView({ lang, t, sn, pcDays, toast }: { lang: Lang; t: T; sn: Snapshots; pcDays: number; toast: Toast }) {
  const [name, setName] = useState("");
  const { selected, result, busy } = sn;
  const err = (e: unknown) => toast.show(String(e), { error: true });

  /** 목록에 넣기 — 같은 이름은 바꿔 쓸지, 20개가 넘치면 가장 오래된 것을 지울지 먼저 묻는다. 넣은 것은 늘 남는다 */
  async function put(s: Snapshot): Promise<string | null> {
    const p = upsertPlan(sn.list, s, BASELINE_MAX);
    const yes = (msg: string) => ask(msg, { kind: "warning" }).catch(() => false);
    if (p.replaced && !(await yes(t("snReplaceAsk", { a: p.replaced.name })))) return null;
    if (p.dropped.length && !(await yes(t("snDropAsk", { a: p.dropped[0].name, n: BASELINE_MAX })))) return null;
    sn.setList(p.list);
    sn.setSelName(s.name);
    return p.dropped.length ? t("snDropped", { a: p.dropped.map((x) => x.name).join("», «") }) : "";
  }
  async function saveNow() {
    if (busy) return;
    sn.setBusy(true);
    try {
      const s = await readSnapshot(name.trim() || stampName(), pcDays);
      const dropped = await put(s);
      if (dropped == null) return;
      setName("");
      count("snapshot_save");
      toast.show([t("snSaved", { a: s.name, n: s.ports?.length ?? 0 }), dropped].filter(Boolean).join(" · "));
    } catch (e) {
      err(e);
    } finally {
      sn.setBusy(false);
    }
  }
  async function compareNow() {
    if (busy || !selected) return;
    sn.setBusy(true);
    try {
      const now = await readSnapshot(lang === "ko" ? "지금" : "now", pcDays);
      sn.setResult({
        base: selected,
        now,
        diff: compareSnapshots(selected, now),
      });
      count("snapshot_compare");
    } catch (e) {
      err(e);
    } finally {
      sn.setBusy(false);
    }
  }
  async function remove() {
    if (!selected) return;
    const yes = await ask(t("snDeleteAsk", { a: selected.name }), {
      kind: "warning",
    }).catch(() => false);
    if (!yes) return;
    sn.setList((l) => l.filter((s) => s.name !== selected.name));
    sn.setSelName("");
  }
  async function exportFile() {
    if (!selected) return;
    const safe = selected.name.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 60);
    const path = await save({
      defaultPath: `portdock-port-check-${safe}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path) return;
    await api
      .writeText(path, JSON.stringify(selected, null, 2) + "\n")
      .then(() => toast.show(`${t("snExport").replace(/…$/, "")}: ${path}`))
      .catch(err);
  }
  async function importFile() {
    const path = await openDialog({
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path || Array.isArray(path)) return;
    try {
      const s = parseSnapshot(await api.readText(path));
      if (!s) {
        toast.show(t("snBadFile"), { error: true });
        return;
      }
      // 불러온 것이 같은 이름을 말없이 덮지 않게 «이름 (2)»
      const free = freeName(sn.list, s.name);
      const item = free === s.name ? s : { ...s, name: free };
      const dropped = await put(item);
      if (dropped == null) return;
      toast.show([t("snImported", { a: item.name }), free !== s.name ? t("snRenamed", { a: free }) : "", dropped].filter(Boolean).join(" · "));
    } catch (e) {
      err(e);
    }
  }
  async function exportCsv() {
    if (!result) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const path = await save({
      defaultPath: `portdock-port-compare-${stamp}.csv`,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (!path) return;
    const head = `﻿# PortDock Port Inspector · «${result.base.name}» (${fmtTime(result.base.savedAt)}) → ${fmtTime(result.now.savedAt)}\r\n`;
    await api
      .writeText(path, head + snapDiffCsv(lang, result.diff))
      .then(() => toast.show(`${t("snCsv")}: ${path}`))
      .catch(err);
  }
  const copyText = () =>
    result &&
    navigator.clipboard
      .writeText(snapDiffText(lang, result.base, result.now, result.diff))
      .then(() => toast.show(t("copied")))
      .catch(err);

  return (
    <div className="cmp-pane">
      <div className="cmp-bar">
        <label className="inline">
          {t("snPick")}
          <select value={selected?.name ?? ""} onChange={(e) => sn.setSelName(e.target.value)} aria-label={t("snPick")} disabled={busy}>
            <option value="">{sn.list.length ? "—" : t("snNone")}</option>
            {sn.list.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} · {fmtTime(s.savedAt).slice(0, 16)}
              </option>
            ))}
          </select>
        </label>
        <button className="btn small primary" onClick={() => void compareNow()} disabled={!selected || busy} data-tip={tip(lang, "piSnapCompare")}>
          {t("snCompare")}
        </button>
        <button className="btn small" onClick={() => void exportFile()} disabled={!selected} data-tip={tip(lang, "piSnapFile")}>
          {t("snExport")}
        </button>
        <button className="btn small" onClick={() => void importFile()} disabled={busy} data-tip={tip(lang, "piSnapImport")}>
          {t("snImport")}
        </button>
        <button className="btn small ghost" onClick={() => void remove()} disabled={!selected || busy} data-tip={tip(lang, "piSnapDelete")}>
          {t("snDelete")}
        </button>
        <span className="grow" />
        <input
          type="text"
          className="sn-name"
          value={name}
          placeholder={t("snNamePh")}
          aria-label={t("snName")}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && void saveNow()}
        />
        <button className="btn small" onClick={() => void saveNow()} disabled={busy} data-tip={tip(lang, "piSnapSave")}>
          {t("snSave")}
        </button>
      </div>
      <div className="cmp-notes">
        <div className="hint">{t("snIntro")}</div>
        <div className="hint cmp-mac-note">{t("snPrivacy")}</div>
        {busy && <div className="hint">{t("snReading")}</div>}
        {!busy && !sn.list.length && <div className="hint">{t("snNeedBase")}</div>}
        {!busy && sn.list.length > 0 && !result && <div className="hint">{t("snPickHint")}</div>}
        {result && (
          <div className="cmp-counts">
            <span className="hint mono">
              «{result.base.name}» ({fmtTime(result.base.savedAt)}) → {fmtTime(result.now.savedAt)}
            </span>
            {(["new", "gone", "changed"] as const).map((k) => {
              const n = result.diff.changes.filter((c) => c.change === k).length;
              return n ? (
                <span key={k} className={`chg chg-${k}`}>
                  {txt(SNAP_CHANGE_TEXT[k], lang)} {n}
                </span>
              ) : null;
            })}
            <span className="grow" />
            <button className="btn small" onClick={() => void copyText()} data-tip={tip(lang, "piCopyText")}>
              {t("snCopy")}
            </button>
            <button className="btn small" onClick={() => void exportCsv()} disabled={!result.diff.changes.length}>
              {t("snCsv")}
            </button>
          </div>
        )}
        {result && !result.diff.changes.length && <div className="hint sn-same">{t("snNoChange")}</div>}
        {result && result.diff.skipped.length > 0 && (
          <div className="hint">
            {t("snSkipped", {
              a: result.diff.skipped.map((s) => txt(SECTION_TEXT[s], lang)).join(", "),
            })}
          </div>
        )}
      </div>
      {result && result.diff.changes.length > 0 && (
        <table className="cmp-table sn-table">
          <thead>
            <tr>
              <th>{t("colChange")}</th>
              <th>{t("colSection")}</th>
              <th>{t("colTarget")}</th>
              <th>{t("colField")}</th>
              <th>{t("colBefore")}</th>
              <th>{t("colAfter")}</th>
            </tr>
          </thead>
          <tbody>
            {result.diff.changes.map((c, i) => (
              <tr key={i} className={`row-${c.change}`}>
                <td>
                  <span className={`chg chg-${c.change}`}>{txt(SNAP_CHANGE_TEXT[c.change], lang)}</span>
                </td>
                <td>{txt(SECTION_TEXT[c.section], lang)}</td>
                <td>{txt(c.target, lang)}</td>
                <td>{txt(c.field, lang)}</td>
                <td className="mono">{txt(c.before, lang)}</td>
                <td className="mono">{txt(c.after, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
