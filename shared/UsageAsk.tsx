// 사용 통계를 한 번 묻는 대화상자 — 무엇을 보내고 무엇을 안 보내는지 보이고 «보내기 / 보내지 않기».
// 고르지 않고 닫으면(✕·Esc) «보내지 않기». 키가 없는 빌드에서는 띄우지 않는다(ReportButton 이 판단).
// body 에 바로 그린다 — 머리줄(ReportButton)은 좁은 창에서 접힌 왼쪽 칸 안에 숨어 있다
import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Lang } from "./uiText";
import { USAGE_TEXT } from "./usageText";

export function UsageAsk({ lang, onChoose }: { lang: Lang; onChoose: (on: boolean) => void }) {
  const t = USAGE_TEXT[lang];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChoose(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChoose]);
  return createPortal(
    <div className="modal-back">
      <div className="modal usage-ask" role="dialog" aria-modal="true" aria-label={t.title}>
        <div className="modal-head">
          <b>{t.title}</b>
          <button className="btn small ghost" onClick={() => onChoose(false)} title={t.no} aria-label={t.no}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div>{t.why}</div>
          <div>
            <b>{t.sendsTitle}</b>
            <ul>
              {t.sends.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <b>{t.neverTitle}</b>
            <ul>
              {t.never.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="hint">{t.where}</div>
          <div className="row2 wrap">
            <button className="btn small primary" onClick={() => onChoose(true)}>
              {t.yes}
            </button>
            <button className="btn small" onClick={() => onChoose(false)} autoFocus>
              {t.no}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
