import type { FollowTail } from "./useFollowTail";
import { ui, type Lang } from "./uiText";

/** 따라가기를 멈췄을 때 로그 오른쪽 아래에 뜨는 «↓ 맨 아래로 (새 줄 n)» — 로그 칸을 감싼 .log-wrap 안에 둔다 */
export function FollowButton({ follow, lang, hidden }: { follow: FollowTail; lang: Lang; hidden?: boolean }) {
  if (follow.following || hidden) return null;
  const n = follow.newCount;
  return (
    <button type="button" className={n ? "follow-btn has-new" : "follow-btn"} onClick={follow.resume} data-tip={ui(lang, "toBottomTip")}>
      {ui(lang, "toBottom")}
      {n > 0 && <span className="follow-n">{ui(lang, "newLines", { n: n > 99999 ? "99999+" : n.toLocaleString() })}</span>}
    </button>
  );
}
