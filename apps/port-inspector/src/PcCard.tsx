// «이 PC» 카드 — 장비 PC 로 쓸 때 볼 설정(빠른 시작·절전·업데이트·재시작 대기·화면 보호기·시간 동기화)과 최근 기록
// 판정은 shared/pcCheck.ts(순수 함수). 이 화면은 읽기만 한다 — 바꾸는 곳만 안내한다.
import { tip } from "@shared/tips";
import { fmtTime, LEVEL_TEXT } from "@shared/portinfo";
import { PC_ADMIN_ONLY, PC_CANNOT_SEE, PC_GROUP_TEXT, PC_PURPOSE_TEXT, PC_PURPOSES, pcItems, type PcCheck, type PcGroup, type PcPurpose } from "@shared/pcCheck";
import type { Key, Lang } from "./i18n";

type T = (k: Key, v?: Record<string, string | number>) => string;

export const PC_DAYS = [7, 30, 90];

export function PcCard({
  lang,
  t,
  pc,
  loading,
  onLoad,
  purpose,
  setPurpose,
  days,
  setDays,
  link,
}: {
  lang: Lang;
  t: T;
  pc: PcCheck | null;
  loading: boolean;
  onLoad: () => void;
  purpose: PcPurpose;
  setPurpose: (p: PcPurpose) => void;
  days: number;
  setDays: (d: number) => void;
  link: (url: string) => void;
}) {
  const controls = (
    <>
      <label className="inline" data-tip={tip(lang, "piPcPurpose")}>
        {t("pcPurpose")}
        <select className="pc-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value as PcPurpose)} aria-label={t("pcPurpose")}>
          {PC_PURPOSES.map((p) => (
            <option key={p} value={p}>
              {PC_PURPOSE_TEXT[p][lang]}
            </option>
          ))}
        </select>
      </label>
      <label className="inline" data-tip={tip(lang, "piPcDays")}>
        {t("pcDays")}
        <select className="pc-days" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label={t("pcDays")}>
          {PC_DAYS.map((d) => (
            <option key={d} value={d}>
              {t("daysN", { n: d })}
            </option>
          ))}
        </select>
      </label>
    </>
  );
  if (!pc)
    return (
      <>
        <div className="row-inline pc-controls">
          <button className="btn small" onClick={onLoad} disabled={loading}>
            {loading ? t("loading") : t("pcLoad")}
          </button>
          {controls}
        </div>
        <div className="hint">{t("pcIntro")}</div>
      </>
    );
  const items = pcItems(pc, purpose, (ms) => fmtTime(ms));
  const groups = [...new Set(items.map((i) => i.group))] as PcGroup[];
  return (
    <>
      <div className="row-inline pc-controls">
        {controls}
        {loading && <span className="hint">{t("loading")}</span>}
      </div>
      <div className="hint">{purpose === "equipment" ? t("pcNoteEquipment") : t("pcNoteGeneral")}</div>
      {pc.scheme && (
        <div className="hint">
          {t("pcScheme")}: {pc.scheme}
        </div>
      )}
      {groups.map((g) => (
        <div key={g} className={`pc-group pc-group-${g}`}>
          <div className="sub-title">{PC_GROUP_TEXT[g][lang]}</div>
          <table className="grid pc-items">
            <tbody>
              {items
                .filter((i) => i.group === g)
                .map((i) => (
                  <tr key={i.id} className={`pc-${i.id}`}>
                    <td className="pc-label">{i.label[lang]}</td>
                    <td>
                      <div>{i.value[lang]}</div>
                      {i.notes.map((n, k) => (
                        <div key={k} className={i.level === "look" ? "pc-note look" : "hint"}>
                          {n[lang]}
                        </div>
                      ))}
                      <div className="hint pc-where">
                        {t("pcWhere")}: {i.where[lang]}
                        {i.link && (
                          <>
                            {" "}
                            <a
                              href={i.link}
                              data-tip={tip(lang, "piPcSource")}
                              onClick={(e) => {
                                e.preventDefault();
                                link(i.link!);
                              }}
                            >
                              {t("pcSource")}
                            </a>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="pc-lv">
                      <span className={`lv lv-${i.level}`}>{LEVEL_TEXT[i.level][lang]}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
      {pc.errors.map((x) => (
        <div key={x} className="hint warn">
          {t("readFail")}: {x}
        </div>
      ))}
      <div className="sub-title">{t("pcAdminOnly")}</div>
      <ul className="plain hint pc-admin">
        {PC_ADMIN_ONLY.map((c) => (
          <li key={c.en}>{c[lang]}</li>
        ))}
      </ul>
      <div className="sub-title">{t("pcCannot")}</div>
      <ul className="plain hint">
        {PC_CANNOT_SEE.map((c) => (
          <li key={c.en}>{c[lang]}</li>
        ))}
      </ul>
      <div className="hint">{t("pcReadOnly")}</div>
    </>
  );
}
