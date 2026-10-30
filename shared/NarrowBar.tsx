// 좁은 창(너비 900px 이하, 화면 반쪽 맞춤 등) — 왼쪽 칸을 접고 가운데 위에 요약 한 줄을 보인다.
// «⚙ 연결 설정»(앱마다 이름이 다를 수 있음) 으로 왼쪽 칸을 펼치고(덮개), 바깥·✕ 로 닫는다. 연결·끊기 버튼은 요약 줄에도 있다(F4 도 됨).
// 머리줄 도구(언어·📌·!·?·⚙)는 접힌 칸 안에 숨지 않도록 좁은 창에서는 요약 줄 오른쪽으로 옮겨 그린다(`tools`·`SideTools`).
import { useEffect, useState, type ReactNode } from "react";
import { ui, type Lang } from "./uiText";

/** 좁은 창 기준 — common.css 의 @media (max-width: 900px) 와 같은 값 */
export const NARROW_QUERY = "(max-width: 900px)";

/** 첫 실행 카드 등이 «왼쪽 칸을 펼쳐 달라» 고 보내는 window 사건 이름 */
export const OPEN_SIDE_EVENT = "portdock-open-side";

/** 지금 창이 좁은지(왼쪽 칸이 접히는 너비) */
export function useNarrow(): boolean {
  const mq = () => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(NARROW_QUERY) : null);
  const [narrow, setNarrow] = useState(() => mq()?.matches ?? false);
  useEffect(() => {
    const m = mq();
    if (!m) return;
    const on = () => setNarrow(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return narrow;
}

/** 왼쪽 칸 머리줄의 도구 — 넓은 창에서만 그린다(좁은 창에서는 NarrowBar 의 `tools` 로 같은 것을 그린다. 한 번에 한 곳에만) */
export function SideTools({ children }: { children: ReactNode }) {
  return useNarrow() ? null : <>{children}</>;
}

export function NarrowBar({
  lang,
  open,
  onToggle,
  dot,
  summary,
  label,
  tools,
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
  /** 펼치기 버튼 이름 — 비우면 «연결 설정». 연결이 없는 앱은 칸 내용에 맞게(«포트 목록» 등) */
  label?: string;
  /** 머리줄 도구(언어·📌·!·?·⚙) — 좁은 창에서만 여기에 그린다 */
  tools?: ReactNode;
  /** 연결·끊기 같은 버튼 */
  children?: ReactNode;
}) {
  const narrow = useNarrow();
  // 첫 실행 카드의 «펼치기» — 닫혀 있으면 연다
  useEffect(() => {
    const onOpen = () => {
      if (!open) onToggle();
    };
    window.addEventListener(OPEN_SIDE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SIDE_EVENT, onOpen);
  }, [open, onToggle]);
  return (
    <div className="narrow-bar">
      <button type="button" className="btn small side-toggle" onClick={onToggle} aria-expanded={open} data-tip={ui(lang, "sideOpenTip")}>
        ⚙ {label ?? ui(lang, "sidePanel")}
      </button>
      <span className={`dot ${dot}`} />
      <span className="nb-summary" title={summary}>
        {summary}
      </span>
      {children}
      {narrow && tools && <span className="brand-tools nb-tools">{tools}</span>}
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
