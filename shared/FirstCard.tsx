// 첫 실행 카드 — 빈 로그·빈 결과 자리에 «처음 쓰는 순서»·«무엇을 하나요?» 를 보인다. Serial·Modbus Slave·Net Scan 이 같은 모양을 쓴다.
// 제목 + «다시 보지 않기», 본문(단계·고르기 버튼), 아래 도움말 링크(도움말 창을 그 절로 연다).
// 좁은 창(왼쪽 칸이 접힘)에서는 본문의 «왼쪽» 이 보이지 않으므로 맨 위에 «위 «⚙ 연결 설정» 으로 펼치세요» 한 줄 + «펼치기».
// (10/31) 그 줄엔 ⚙ 가 둘(펼치기 «⚙ 연결 설정»·오른쪽 끝 설정 ⚙)이라 단추 이름(sideLabel, NarrowBar label 과 같게)을 그대로 적는다.
import type { ReactNode } from "react";
import { OPEN_SIDE_EVENT, useNarrow } from "./NarrowBar";
import { ui, type Lang } from "./uiText";
import "./firstcard.css";

const L = {
  ko: {
    hide: "다시 보지 않기",
    help: "도움말:",
    narrow: "창이 좁아 왼쪽 칸이 접혀 있습니다 — 아래에서 «왼쪽» 은 맨 위 왼쪽 «⚙ {b}» 단추로 펼치는 칸입니다.",
    open: "왼쪽 칸 펼치기",
  },
  en: {
    hide: "Don't show again",
    help: "Help:",
    narrow: "The window is narrow, so the left panel is folded — «left» below means the panel behind the «⚙ {b}» button at the top left.",
    open: "Open the left panel",
  },
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
  sideLabel,
}: {
  lang: Lang;
  title: string;
  onHide: () => void;
  children: ReactNode;
  /** 도움말 링크 — 누르면 onHelp(id) */
  links?: FirstCardLink[];
  onHelp?: (id: string) => void;
  className?: string;
  /** 좁은 창 펼치기 단추 이름 — NarrowBar 의 label 과 같게(비우면 «연결 설정») */
  sideLabel?: string;
}) {
  const t = L[lang];
  const narrow = useNarrow();
  return (
    <div className={`first-card${className ? ` ${className}` : ""}`} role="note">
      <div className="first-head">
        <b>{title}</b>
        <button type="button" className="btn small ghost first-hide" onClick={onHide}>
          {t.hide}
        </button>
      </div>
      {narrow && (
        <div className="first-narrow hint">
          {t.narrow.replace("{b}", sideLabel ?? ui(lang, "sidePanel"))}{" "}
          <button type="button" className="link-btn" onClick={() => window.dispatchEvent(new Event(OPEN_SIDE_EVENT))}>
            {t.open}
          </button>
        </div>
      )}
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
