// «무선» 탭(0.5.0)의 카드 내용 — Wi-Fi·블루투스 항목 표. 판정은 shared/wireless.ts(순수 함수).
// 이 화면은 읽기만 한다 — 바꾸는 곳만 안내한다. 블루투스 오디오 장치 이름은 화면에만 보인다(복사·저장에서는 가림).
import { tip } from "@shared/tips";
import { fmtTime, LEVEL_TEXT } from "@shared/portinfo";
import { wlItems, type Wireless, type WlGroup } from "@shared/wireless";
import type { Key, Lang } from "./i18n";

type T = (k: Key, v?: Record<string, string | number>) => string;

export const WL_DAYS = [7, 30, 90];

export function WirelessItems({ lang, t, w, group, link }: { lang: Lang; t: T; w: Wireless; group: WlGroup; link: (url: string) => void }) {
  const items = wlItems(w, (ms) => fmtTime(ms)).filter((i) => i.group === group);
  return (
    <table className="grid pc-items wl-items">
      <tbody>
        {items.map((i) => (
          <tr key={i.id} className={`wl-${i.id}`}>
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
                      data-tip={tip(lang, "piWlSource")}
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
  );
}
