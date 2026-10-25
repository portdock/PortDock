// 좁은 창(너비 900px 이하, 화면 반쪽 맞춤 등) — 왼쪽 연결 설정 칸을 접고 가운데 위에 요약 한 줄을 보인다.
// «⚙ 연결 설정» 으로 왼쪽 칸을 펼치고(덮개), 바깥·✕ 로 닫는다. 연결·끊기 버튼은 요약 줄에도 있다(F4 도 됨).
import type { ReactNode } from "react";
import { ui, type Lang } from "./uiText";

export function NarrowBar({
  lang,
  open,
  onToggle,
  dot,
  summary,
  children,
}: {
  lang: Lang;
  /** 왼쪽 칸이 펼쳐져 있는지 */
  open: boolean;
  onToggle: () => void;
  /** 상태 점 색(s-connected 등) */
  dot: string;
  /** 지금 설정·상태 요약 */
  summary: string;
  /** 연결·끊기 같은 버튼 */
  children?: ReactNode;
}) {
  return (
    <div className="narrow-bar">
      <button type="button" className="btn small side-toggle" onClick={onToggle} aria-expanded={open} data-tip={ui(lang, "sideOpenTip")}>
        ⚙ {ui(lang, "sidePanel")}
      </button>
      <span className={`dot ${dot}`} />
      <span className="nb-summary" title={summary}>
        {summary}
      </span>
      {children}
    </div>
  );
}

/** 펼친 왼쪽 칸을 닫는 ✕(좁은 창에서만 보임) + 바깥 덮개 */
export function SideClose({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  return (
    <button type="button" className="icon-btn side-close" onClick={onClose} aria-label={ui(lang, "sideClose")} data-tip={ui(lang, "sideClose")}>
      ✕
    </button>
  );
}

export function SideBackdrop({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <div className="side-backdrop" onClick={onClose} /> : null;
}
