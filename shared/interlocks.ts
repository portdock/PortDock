// 인터락 — 잘못된 조작을 미리 막거나 알리는 판단. 화면과 무관한 순수 함수만.

/** 시리얼로 n 바이트를 보내는 데 걸리는 이론 시간(ms). 1문자 = 시작 1 + 데이터 + 패리티 + 정지 */
export function serialTxMs(bytes: number, baud: number, dataBits = 8, parity: string = "none", stopBits = 1) {
  if (baud <= 0) return Infinity;
  const bits = 1 + dataBits + (parity === "none" ? 0 : 1) + stopBits;
  return (bytes * bits * 1000) / baud;
}

/** 반복 간격이 실제 송신 시간보다 짧으면 앞 송신이 끝나기 전에 다음이 쌓인다 → 쓸 수 있는 최소 간격 */
export function minRepeatMs(txMs: number) {
  return Math.max(10, Math.ceil(txMs * 1.2) + 5);
}

/** XON(0x11)/XOFF(0x13) — 소프트웨어 흐름 제어에서 데이터로 보내면 흐름 제어 신호로 먹힌다 */
export function hasXonXoff(bytes: number[]) {
  return bytes.some((b) => b === 0x11 || b === 0x13);
}

/** 브로드캐스트 주소로 보이는지(255.255.255.255 또는 끝자리 255) */
export function looksBroadcast(host: string) {
  const m = host.trim().match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  return !!m && (host.trim() === "255.255.255.255" || m[4] === "255");
}

export interface RuleLike {
  name: string;
  enabled: boolean;
  pattern: string;
  kind: "exact" | "contains";
}

/** 무엇이든 맞는 규칙(** 또는 *)이 위에 있으면 그 아래 켜진 규칙은 절대 답하지 않는다 */
export function shadowedRules(rules: RuleLike[]) {
  const catchAll = (r: RuleLike) => r.enabled && /^\s*(\*\*|\*)\s*$/.test(r.pattern);
  const i = rules.findIndex(catchAll);
  if (i < 0) return { by: null as string | null, names: [] as string[] };
  return { by: rules[i].name, names: rules.slice(i + 1).filter((r) => r.enabled).map((r) => r.name) };
}

/** 같은 이름의 규칙 — 응답 횟수가 합쳐져 구분이 안 된다 */
export function duplicateNames(rules: RuleLike[]) {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const r of rules) {
    const n = r.name.trim();
    if (seen.has(n)) dup.add(n);
    seen.add(n);
  }
  return [...dup];
}
