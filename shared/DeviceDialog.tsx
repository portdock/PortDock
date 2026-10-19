// 장비 프로필 고르기 창 — Modbus Master «장비 프로필 불러오기…», Modbus Slave «장비 흉내 불러오기…».
// 내장 목록(빌드 때 data/devices 를 묶음)에서 장비를 고르면 레지스터·통신 기본값·출처를 보여 주고, 고른 선택지로 onApply 를 부른다.
import { useEffect, useMemo, useState } from "react";
import { tip } from "./tips";
import { useRestoreFocus } from "./restoreFocus";
import { DEVICES } from "./deviceData";
import { commLine, devRegs, KIND_TEXT, matchDevice, pollGroups, readFc, type Device, type Lang } from "./devices";
import "./devices.css";

export interface DeviceApplyOpts {
  /** 통신 설정(속도·데이터·패리티·정지)도 맞추기 */
  comm: boolean;
  /** Master: 빈 주소를 사이에 둔 칸도 한 표로(최대 8칸) */
  joinGaps: boolean;
}

export const JOIN_GAP = 8;

const TX = {
  ko: {
    masterTitle: "장비 프로필 불러오기",
    slaveTitle: "장비 흉내 불러오기",
    search: "찾기 (제조사·모델·종류)",
    none: "맞는 장비가 없습니다",
    close: "닫기",
    cancel: "취소",
    apply: "불러오기",
    regs: "레지스터 {n}개",
    comm: "통신 기본값",
    commOpt: "통신 설정도 맞추기 (속도·데이터·패리티·정지)",
    commNone: "매뉴얼에서 확인한 통신 기본값이 없습니다",
    gapOpt: "빈 주소를 사이에 둔 칸도 한 표로 읽기 (최대 {n}칸 — 장비가 빈 주소를 거부하면 끄세요)",
    masterPlan: "폴링 표 {n}개를 더합니다 (국번 {u}): {a}",
    masterSkip: "쓰기 전용 {n}개는 표에 넣지 않습니다",
    slavePlan: "지금 국번 {u} 에 이름·형식과 예시 값을 넣습니다. 응답 범위가 모자라면 넓힙니다.",
    slaveUnit: "이 장비의 기본 국번은 {u} 입니다",
    sources: "출처",
    caution: "제조사 매뉴얼에서 옮긴 사실 정보입니다(제조사와 무관). 펌웨어·형번에 따라 다를 수 있으니 쓰기 전에 장비 매뉴얼로 확인하세요.",
    thAddr: "주소(매뉴얼)",
    thName: "이름",
    thType: "형식",
    thUnit: "단위",
    thRw: "R/W",
    notes: "주의",
  },
  en: {
    masterTitle: "Load device profile",
    slaveTitle: "Load device emulation",
    search: "Search (maker, model, type)",
    none: "No matching device",
    close: "Close",
    cancel: "Cancel",
    apply: "Load",
    regs: "{n} registers",
    comm: "Default communication",
    commOpt: "Also apply serial settings (baud, data, parity, stop)",
    commNone: "No default communication settings confirmed in the manual",
    gapOpt: "Read registers with small gaps in one table (up to {n} — turn off if the device rejects unused addresses)",
    masterPlan: "Adds {n} polling tables (Slave ID {u}): {a}",
    masterSkip: "{n} write-only registers are not polled",
    slavePlan: "Fills names, types and example values into the current Slave ID {u}. Response ranges grow if needed.",
    slaveUnit: "This device's default Slave ID is {u}",
    sources: "Sources",
    caution: "Facts taken from the maker's manual (not affiliated with the maker). They can differ by firmware or model — check the device manual before writing.",
    thAddr: "Address (manual)",
    thName: "Name",
    thType: "Type",
    thUnit: "Unit",
    thRw: "R/W",
    notes: "Notes",
  },
};
type TKey = keyof typeof TX.ko;

const fillT = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export function DeviceDialog({
  lang,
  mode,
  unit,
  onApply,
  onClose,
}: {
  lang: Lang;
  mode: "master" | "slave";
  /** Slave: 지금 국번 */
  unit?: number;
  onApply: (d: Device, opts: DeviceApplyOpts) => void;
  onClose: () => void;
}) {
  const t = (k: TKey, v: Record<string, string | number> = {}) => fillT(TX[lang][k], v);
  const back = useRestoreFocus<HTMLDivElement>();
  const [q, setQ] = useState("");
  const list = useMemo(() => DEVICES.filter((d) => matchDevice(d, q)), [q]);
  const [selId, setSelId] = useState<string>(DEVICES[0]?.id ?? "");
  const dev = list.find((d) => d.id === selId) ?? list[0];
  const [comm, setComm] = useState(true);
  const [joinGaps, setJoinGaps] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const groups = dev && mode === "master" ? pollGroups(dev, lang, joinGaps ? JOIN_GAP : 0) : [];
  const writeOnly = dev ? dev.registers.filter((r) => readFc(r) == null).length : 0;
  const hasComm = !!dev && (dev.comm.baud != null || dev.comm.parity != null || dev.comm.stopBits != null || dev.comm.dataBits != null);
  const title = mode === "master" ? t("masterTitle") : t("slaveTitle");
  const plan =
    mode === "master"
      ? t("masterPlan", { n: groups.length, u: dev?.comm.unit ?? 1, a: groups.map((g) => `${g.name.slice(dev!.model.length + 1)}(${g.qty})`).join(" · ") })
      : t("slavePlan", { u: unit ?? 1 });

  return (
    <div className="modal-back" ref={back} onClick={onClose}>
      <div className="modal dev-dlg" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{title}</b>
          <button className="btn small ghost" onClick={onClose} title={t("close")} aria-label={t("close")}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <input className="dev-search" value={q} placeholder={t("search")} aria-label={t("search")} autoFocus onChange={(e) => setQ(e.target.value)} data-tip={tip(lang, "devSearch")} />
          <div className="dev-split">
            <ul className="dev-list" role="listbox" aria-label={title}>
              {list.map((d) => (
                <li key={d.id}>
                  <button type="button" role="option" aria-selected={d.id === dev?.id} className={d.id === dev?.id ? "dev-item on" : "dev-item"} onClick={() => setSelId(d.id)}>
                    <b>
                      {d.manufacturer[lang]} {d.model}
                    </b>
                    <span className="hint">{KIND_TEXT[d.kind][lang]}</span>
                  </button>
                </li>
              ))}
              {!list.length && <li className="hint">{t("none")}</li>}
            </ul>
            {dev && (
              <div className="dev-detail">
                <div>
                  <b>{dev.title[lang]}</b> <span className="hint">· {t("regs", { n: dev.registers.length })}</span>
                </div>
                {dev.summary && <div className="hint">{dev.summary[lang]}</div>}
                <div className="hint">
                  {t("comm")}: {commLine(dev, lang)}
                </div>
                <div className="dev-regs">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("thAddr")}</th>
                        <th>{t("thName")}</th>
                        <th>{t("thType")}</th>
                        <th>{t("thUnit")}</th>
                        <th>{t("thRw")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dev.registers.map((r) => (
                        <tr key={`${r.table}:${r.address}`} title={r.description?.[lang] ?? ""}>
                          <td className="mono">{r.manualAddress}</td>
                          <td>{r.name[lang]}</td>
                          <td className="mono">
                            {r.type.toUpperCase()}
                            {devRegs(r) > 1 && (r.order ?? dev.comm.order ?? "ABCD") !== "ABCD" ? ` ${r.order ?? dev.comm.order}` : ""}
                          </td>
                          <td className="mono">{[r.scale != null && r.scale !== 1 ? `×${r.scale}` : "", r.unit ?? ""].filter(Boolean).join(" ")}</td>
                          <td className="mono">{r.access.toUpperCase()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!!(dev.notes?.length || dev.comm.notes?.length) && (
                  <details className="dev-notes">
                    <summary>{t("notes")}</summary>
                    <ul>
                      {[...(dev.comm.notes ?? []), ...(dev.notes ?? [])].map((n, i) => (
                        <li key={i}>{n[lang]}</li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="hint dev-src">
                  {t("sources")}:{" "}
                  {dev.sources.map((s, i) => (
                    <span key={i}>
                      {i > 0 && " · "}
                      {s.title}
                      {s.edition ? ` (${s.edition})` : ""}
                      {s.pages ? `, ${s.pages}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="hint warn dev-caution">{t("caution")}</div>
          {dev && (
            <>
              <label className="inline dev-opt" data-tip={tip(lang, "devComm")}>
                <input type="checkbox" checked={comm && hasComm} disabled={!hasComm} onChange={(e) => setComm(e.target.checked)} />
                {hasComm ? t("commOpt") : t("commNone")}
              </label>
              {mode === "master" && (
                <label className="inline dev-opt" data-tip={tip(lang, "devJoin")}>
                  <input type="checkbox" checked={joinGaps} onChange={(e) => setJoinGaps(e.target.checked)} />
                  {t("gapOpt", { n: JOIN_GAP })}
                </label>
              )}
              <div className="hint dev-plan">
                {plan}
                {mode === "master" && writeOnly > 0 ? ` · ${t("masterSkip", { n: writeOnly })}` : ""}
                {mode === "slave" && dev.comm.unit != null && dev.comm.unit !== unit ? ` · ${t("slaveUnit", { u: dev.comm.unit })}` : ""}
              </div>
            </>
          )}
          <div className="row2 dlg-buttons">
            <span className="grow" />
            <button className="btn small" onClick={onClose}>
              {t("cancel")}
            </button>
            <button className="btn small primary" disabled={!dev || (mode === "master" && !groups.length)} onClick={() => dev && onApply(dev, { comm: comm && hasComm, joinGaps })} data-tip={tip(lang, mode === "master" ? "devApplyMaster" : "devApplySlave")}>
              {t("apply")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
