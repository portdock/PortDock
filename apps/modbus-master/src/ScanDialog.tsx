// 찾기 창 — 국번 찾기(1~247 중 답하는 장비)와 주소 범위 찾기(읽히는 주소 모으기). 찾는 동안 폴링은 멈춘다.
// 창을 닫아도 찾기는 계속되고, 왼쪽 상태 칸에 진행이 보인다.
import { useEffect, useState } from "react";
import { NumInput } from "@shared/NumInput";
import { tip } from "@shared/tips";
import { useRestoreFocus } from "@shared/restoreFocus";
import { outcomeText, type Outcome, type ScanAddrs, type ScanIds } from "./api";
import { dict, fill, type Key, type Lang } from "./i18n";
import { FCS, addrLabel, fmtMs, maxQty, type AddrMode, type Fc } from "./model";

export interface ScanState {
  kind: "ids" | "addrs" | null;
  running: boolean;
  done: number;
  total: number;
  hits: { unit: number; outcome: Outcome; rttMs: number }[];
  ranges: [number, number][];
  /** 주소 찾기에 쓴 국번·함수(표 만들기용) */
  unit: number;
  fc: Fc;
  finished: { found: number; cancelled: boolean; stopped: string | null } | null;
}

export const NO_SCAN: ScanState = { kind: null, running: false, done: 0, total: 0, hits: [], ranges: [], unit: 1, fc: 3, finished: null };

export function ScanDialog({
  lang,
  connected,
  scan,
  addrMode,
  defaults,
  onStartIds,
  onStartAddrs,
  onCancel,
  onUseId,
  onUseRange,
  onClose,
}: {
  lang: Lang;
  connected: boolean;
  scan: ScanState;
  addrMode: AddrMode;
  /** 지금 표의 국번·함수·시작 */
  defaults: { unit: number; fc: Fc; start: number };
  onStartIds: (c: ScanIds) => void;
  onStartAddrs: (c: ScanAddrs) => void;
  onCancel: () => void;
  onUseId: (unit: number, fc: Fc, addr: number) => void;
  onUseRange: (unit: number, fc: Fc, start: number, end: number) => void;
  onClose: () => void;
}) {
  const t = (k: Key) => dict[lang][k];
  const back = useRestoreFocus<HTMLDivElement>();
  const [tab, setTab] = useState<"ids" | "addrs">(scan.kind ?? "ids");
  const [ids, setIds] = useState<ScanIds>({ from: 1, to: 247, fc: defaults.fc, addr: defaults.start, timeoutMs: 200 });
  const [ad, setAd] = useState<ScanAddrs>({ unit: defaults.unit, fc: defaults.fc, from: 0, to: 999, block: defaults.fc <= 2 ? 100 : 10, timeoutMs: 500, fine: true });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fcName = (f: Fc) => t(`fc${f}` as Key);
  const label = (fc: Fc, a: number) => addrLabel(fc, a, addrMode);
  const mine = scan.kind === tab;
  const pct = scan.total ? Math.round((scan.done / scan.total) * 100) : 0;
  const result = mine && scan.finished;
  const fcSelect = (value: Fc, set: (f: Fc) => void, tipKey: string) => (
    <label data-tip={tip(lang, tipKey)}>
      {t("scanFc")}
      <select value={value} disabled={scan.running} onChange={(e) => set(Number(e.target.value) as Fc)}>
        {FCS.map((f) => (
          <option key={f} value={f}>
            {fcName(f)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="modal-back" ref={back} onClick={onClose}>
      <div className="modal scan-dlg" role="dialog" aria-label={t("scanTitle")} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{t("scanTitle")}</b>
          <button className="btn small ghost" onClick={onClose} title={t("close")} aria-label={t("close")}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <span className="segs" role="tablist" aria-label={t("scanTitle")}>
            {(["ids", "addrs"] as const).map((k) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "seg on" : "seg"} disabled={scan.running && scan.kind !== k} onClick={() => setTab(k)}>
                {k === "ids" ? t("scanIds") : t("scanAddrs")}
              </button>
            ))}
          </span>
          {tab === "ids" ? (
            <>
              <span className="hint">{t("scanIdsHint")}</span>
              <div className="grid3">
                <label data-tip={tip(lang, "mmScanRange")}>
                  {t("scanFrom")}
                  <NumInput min={1} max={255} value={ids.from} disabled={scan.running} onValue={(n) => setIds({ ...ids, from: n })} />
                </label>
                <label data-tip={tip(lang, "mmScanRange")}>
                  {t("scanTo")}
                  <NumInput min={1} max={255} value={ids.to} disabled={scan.running} onValue={(n) => setIds({ ...ids, to: n })} />
                </label>
                <label data-tip={tip(lang, "mmScanTimeout")}>
                  {t("scanTimeout")}
                  <NumInput min={10} max={60000} value={ids.timeoutMs} disabled={scan.running} onValue={(n) => setIds({ ...ids, timeoutMs: n })} />
                </label>
              </div>
              <div className="grid2">
                {fcSelect(ids.fc, (fc) => setIds({ ...ids, fc }), "mmScanFc")}
                <label data-tip={tip(lang, "mmScanAddr")}>
                  {t("scanAddr")} ({label(ids.fc, ids.addr)})
                  <NumInput min={0} max={65535} value={ids.addr} disabled={scan.running} onValue={(n) => setIds({ ...ids, addr: n })} />
                </label>
              </div>
            </>
          ) : (
            <>
              <span className="hint">{t("scanAddrsHint")}</span>
              <div className="grid3">
                <label data-tip={tip(lang, "mmScanUnit")}>
                  {t("scanUnit")}
                  <NumInput min={1} max={255} value={ad.unit} disabled={scan.running} onValue={(n) => setAd({ ...ad, unit: n })} />
                </label>
                {fcSelect(ad.fc, (fc) => setAd({ ...ad, fc, block: Math.min(ad.block, maxQty(fc)) }), "mmScanFc")}
                <label data-tip={tip(lang, "mmScanBlock")}>
                  {t("scanBlock")}
                  <NumInput min={1} max={maxQty(ad.fc)} value={ad.block} disabled={scan.running} onValue={(n) => setAd({ ...ad, block: n })} />
                </label>
              </div>
              <div className="grid3">
                <label data-tip={tip(lang, "mmScanAddrRange")}>
                  {t("scanFrom")} ({label(ad.fc, ad.from)})
                  <NumInput min={0} max={65535} value={ad.from} disabled={scan.running} onValue={(n) => setAd({ ...ad, from: n })} />
                </label>
                <label data-tip={tip(lang, "mmScanAddrRange")}>
                  {t("scanTo")} ({label(ad.fc, ad.to)})
                  <NumInput min={0} max={65535} value={ad.to} disabled={scan.running} onValue={(n) => setAd({ ...ad, to: n })} />
                </label>
                <label data-tip={tip(lang, "mmScanTimeout")}>
                  {t("scanTimeout")}
                  <NumInput min={10} max={60000} value={ad.timeoutMs} disabled={scan.running} onValue={(n) => setAd({ ...ad, timeoutMs: n })} />
                </label>
              </div>
              <label className="inline" data-tip={tip(lang, "mmScanFine")}>
                <input type="checkbox" checked={ad.fine} disabled={scan.running} onChange={(e) => setAd({ ...ad, fine: e.target.checked })} /> {t("scanFine")}
              </label>
            </>
          )}
          <span className="hint">{t("scanPaused")}</span>
          <div className="row2 scan-run">
            {scan.running && mine ? (
              <button className="btn small danger" onClick={onCancel}>
                {t("scanStop")}
              </button>
            ) : (
              <button
                className="btn small primary"
                disabled={!connected || scan.running || (tab === "ids" ? ids.to < ids.from : ad.to < ad.from)}
                title={connected ? "" : t("needConnect")}
                data-tip={tip(lang, "mmScanStart")}
                onClick={() => (tab === "ids" ? onStartIds(ids) : onStartAddrs(ad))}
              >
                {t("scanStart")}
              </button>
            )}
            {!connected && <span className="hint warn">{t("needConnect")}</span>}
            {mine && (scan.running || scan.finished) && (
              <span className="scan-progress" aria-live="polite">
                <progress max={100} value={pct} />
                {scan.running ? fill(t("scanRunning"), { d: scan.done, t: scan.total }) : scan.finished?.cancelled ? t("scanCancelled") : t("scanFinished")}
              </span>
            )}
          </div>
          {result && result.stopped && <div className="hint warn">{fill(t("scanStopped"), { a: result.stopped })}</div>}
          {tab === "ids" ? (
            <div className="scan-list">
              <div className="scan-sum">{mine && scan.hits.length ? fill(t("scanFoundIds"), { n: scan.hits.length }) : t("scanNone")}</div>
              {mine && scan.hits.length > 0 && (
                <table className="rtable">
                  <thead>
                    <tr>
                      <th>{t("scanColId")}</th>
                      <th>{t("scanColResult")}</th>
                      <th>{t("scanColRtt")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {scan.hits.map((h) => (
                      <tr key={h.unit}>
                        <td className="mono">{h.unit}</td>
                        <td className={h.outcome.result === "ok" ? "okc" : "failc"}>{outcomeText(h.outcome, lang)}</td>
                        <td className="mono">{fmtMs(h.rttMs)} ms</td>
                        <td>
                          <button className="btn small" onClick={() => onUseId(h.unit, ids.fc, ids.addr)}>
                            {t("scanUseId")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="scan-list">
              <div className="scan-sum">{mine && scan.ranges.length ? fill(t("scanFoundAddrs"), { n: scan.ranges.reduce((n, [a, b]) => n + b - a + 1, 0) }) : t("scanNone")}</div>
              {mine && scan.ranges.length > 0 && (
                <table className="rtable">
                  <thead>
                    <tr>
                      <th>{t("scanColRange")}</th>
                      <th>{t("scanColCount")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {scan.ranges.map(([a, b]) => (
                      <tr key={a}>
                        <td className="mono">
                          {label(scan.fc, a)} ~ {label(scan.fc, b)}
                        </td>
                        <td className="mono">{b - a + 1}</td>
                        <td>
                          <button className="btn small" onClick={() => onUseRange(scan.unit, scan.fc, a, b)}>
                            {t("scanUseRange")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
