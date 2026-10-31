// «응답 없음» 원인 후보 창(0.11.0) — 최근 요청 결과(폴링·한 번 읽기)를 shared/commDiag 로 나눠 원인 후보·확인 방법·가이드 링크를 보인다.
// 읽기만 한다(보내는 요청 없음). 창이 열려 있는 동안 1초마다 새로 나눈다.
import { useEffect, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tip } from "@shared/tips";
import { copyText } from "@shared/logCopy";
import { useRestoreFocus } from "@shared/restoreFocus";
import { diagnose, diagnosisText, type DiagSample } from "@shared/commDiag";
import { outcomeText } from "./api";
import { dict, fill, type Key, type Lang } from "./i18n";

export function DiagDialog({ lang, samples, wire, onClear, onClose }: { lang: Lang; samples: () => DiagSample[]; wire: "rtu" | "tcp"; onClear: () => void; onClose: () => void }) {
  const t = (k: Key) => dict[lang][k];
  const back = useRestoreFocus<HTMLDivElement>();
  const [list, setList] = useState<DiagSample[]>(() => samples());
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setList(samples()), 1000);
    return () => clearInterval(id);
  }, [samples]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const d = diagnose(list, wire);
  const exText = (code: number) => outcomeText({ result: "exception", code }, lang);
  const open = (url: string) => void openUrl(url).catch(() => {});

  return (
    <div className="modal-back" ref={back} onClick={onClose}>
      <div className="modal diag-dlg" role="dialog" aria-label={t("diagTitle")} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{t("diagTitle")}</b>
          <button className="btn small ghost" onClick={onClose} title={t("close")} aria-label={t("close")}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <span className="hint">{fill(t("diagHint"), { n: d.total })}</span>
          {d.total === 0 ? (
            <div className="hint diag-empty">{t("diagNone")}</div>
          ) : d.causes.length === 0 ? (
            <div className="hint diag-empty">{fill(t("diagAllOk"), { n: d.total })}</div>
          ) : (
            d.causes.map((c) => (
              <section key={c.id} className={`diag-cause ${c.level}`} data-cause={c.id}>
                <h4>
                  <span>{c.title[lang]}</span>
                  <span className="diag-n">
                    {fill(t("diagCount"), { n: c.count })}/{d.total} · {c.level === "problem" ? t("diagLevelProblem") : t("diagLevelLook")}
                  </span>
                </h4>
                {c.codes && c.codes.length > 0 && (
                  <div className="diag-sub">
                    {t("diagCodes")}:
                    <ul>
                      {c.codes.map((k) => (
                        <li key={k}>{exText(k)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {c.units && c.units.length > 0 && <div className="diag-sub">{fill(t("diagUnits"), { u: c.units.join(", ") })}</div>}
                <div className="diag-sub">{t("diagCandidates")}</div>
                <ul>
                  {c.candidates.map((x, i) => (
                    <li key={i}>{x[lang]}</li>
                  ))}
                </ul>
                <div className="diag-sub">{t("diagChecks")}</div>
                <ul>
                  {c.checks.map((x, i) => (
                    <li key={i}>{x[lang]}</li>
                  ))}
                </ul>
                <div className="diag-links">
                  <span className="diag-sub">{t("diagLinks")}: </span>
                  {c.links.map((l) => (
                    <a
                      key={l.url(lang)}
                      href={l.url(lang)}
                      onClick={(e) => {
                        e.preventDefault();
                        open(l.url(lang));
                      }}
                    >
                      {l.label[lang]}
                    </a>
                  ))}
                </div>
              </section>
            ))
          )}
          <div className="row2 dlg-buttons">
            <button
              className="btn small"
              disabled={d.total === 0}
              onClick={() => {
                onClear();
                setList([]);
              }}
            >
              {t("diagClear")}
            </button>
            <button
              className="btn small"
              disabled={d.causes.length === 0}
              data-tip={tip(lang, "mmDiag")}
              onClick={() => void copyText(diagnosisText(d, lang, exText)).then((ok) => setCopied(ok))}
            >
              {copied ? t("diagCopied") : t("diagCopy")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
