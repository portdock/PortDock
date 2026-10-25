// Port Inspector 화면 쪽 순수 함수(node --test)
import type { Level, PortEntry } from "../../../shared/portinfo.ts";

/** 목록에서 포트를 가리키는 열쇠 — 인스턴스 ID, 장치 정보가 없으면 COM 이름 */
export const entryKey = (p: PortEntry) => p.instanceId || p.port || p.name;

/** «COM5 · USB Serial Port» — 이름 끝에 이미 «(COM5)» 가 있으면 뺀다 */
export function portLabel(p: PortEntry) {
  if (!p.port) return p.name;
  const tail = `(${p.port})`.toLowerCase();
  const n = p.name.trim();
  const name = n.toLowerCase().endsWith(tail) ? n.slice(0, n.length - tail.length).trim() : n;
  return `${p.port} · ${name}`;
}

/** 카드 결과들 → 전체(가장 무거운 것). «읽지 못함» 은 «볼 것» 보다 가볍다 */
export function overall(levels: Level[]): Level {
  const rank: Record<Level, number> = { ok: 0, unread: 1, look: 2, problem: 3 };
  return levels.reduce<Level>((a, b) => (rank[b] > rank[a] ? b : a), "ok");
}
