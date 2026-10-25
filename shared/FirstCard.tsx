// 첫 실행 카드 — 빈 로그·빈 결과 자리에 «처음 쓰는 순서»·«무엇을 하나요?» 를 보인다. Serial·Modbus Slave·Net Scan 이 같은 모양을 쓴다.
// 제목 + «다시 보지 않기», 본문(단계·고르기 버튼), 아래 도움말 링크(도움말 창을 그 절로 연다).
import type { ReactNode } from "react";
import type { Lang } from "./uiText";
import "./firstcard.css";

const L = {
  ko: { hide: "다시 보지 않기", help: "도움말:" },
  en: { hide: "Don't show again", help: "Help:" },
};

export interface FirstCardLink {
  label: string;
  /** 도움말 절 id(HelpSection.id) */
  id: string;
}

export function FirstCard({
  lang,
  title,
  onHide,
  children,
  links,
  onHelp,
  className,
}: {
  lang: Lang;
  title: string;
  onHide: () => void;
  children: ReactNode;
  /** 도움말 링크 — 누르면 onHelp(id) */
  links?: FirstCardLink[];
  onHelp?: (id: string) => void;
  className?: string;
}) {
  const t = L[lang];
  return (
    <div className={`first-card${className ? ` ${className}` : ""}`} role="note">
      <div className="first-head">
        <b>{title}</b>
        <button type="button" className="btn small ghost first-hide" onClick={onHide}>
          {t.hide}
        </button>
      </div>
      {children}
      {links && links.length > 0 && onHelp && (
        <div className="first-links hint">
          {t.help}
          {links.map((l) => (
            <button key={l.id} type="button" className="link-btn" onClick={() => onHelp(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
