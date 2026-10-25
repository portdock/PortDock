// 프레임 구분 설정 — 화면 모양과 Rust(serde) 모양 사이 변환

export type FrameMode =
  | { kind: "gap"; gapMs: number }
  | { kind: "terminator"; bytes: number[]; gapMs: number }
  | { kind: "fixed"; len: number; gapMs: number }
  | { kind: "modbus-rtu"; baud: number };

export function frameModeToRust(m: FrameMode) {
  switch (m.kind) {
    case "gap":
      return { kind: "gap", gap_ms: m.gapMs };
    case "terminator":
      return { kind: "terminator", bytes: m.bytes, gap_ms: m.gapMs };
    case "fixed":
      return { kind: "fixed", len: m.len, gap_ms: m.gapMs };
    case "modbus-rtu":
      return { kind: "modbus-rtu", baud: m.baud };
  }
}

/** 끝 문자 칸에 쓸 수 있는 이름 */
const TERM_NAMES: Record<string, number[]> = {
  CR: [13],
  LF: [10],
  CRLF: [13, 10],
  NUL: [0],
  STX: [2],
  ETX: [3],
  "\\R": [13],
  "\\N": [10],
  "\\R\\N": [13, 10],
};

/**
 * 끝 문자 칸 해석 — 백엔드 parse_hex 와 같은 규칙(공백 , ; - 로 나눔, 0x 허용, 짝수 자리, «0D0A» 처럼 붙여 써도 됨)
 * + 이름(CR LF CRLF NUL STX ETX \r \n). 틀리면 bytes 는 비우고 error 에 이유.
 */
export function parseTerminator(text: string, lang: "ko" | "en" = "ko"): { bytes: number[]; error: string | null } {
  const ko = lang === "ko";
  const bytes: number[] = [];
  for (const token of text.split(/[\s,;-]+/)) {
    if (!token) continue;
    const named = TERM_NAMES[token.toUpperCase()];
    if (named) {
      bytes.push(...named);
      continue;
    }
    const t = token.replace(/^(?:0x)+/, "").replace(/^(?:0X)+/, "");
    if (!t) continue;
    const bad = [...t].find((c) => !/[0-9a-fA-F]/.test(c));
    if (bad) return { bytes: [], error: ko ? `HEX 가 아닌 글자: «${bad}»` : `Not a HEX digit: «${bad}»` };
    if (t.length % 2) return { bytes: [], error: ko ? `HEX 자릿수가 홀수입니다: «${token}»` : `Odd number of HEX digits: «${token}»` };
    for (let i = 0; i < t.length; i += 2) bytes.push(parseInt(t.slice(i, i + 2), 16));
  }
  return { bytes, error: null };
}

/** «0D 0A» → [13, 10]. 해석할 수 없으면 [] (예전 호출 호환 — 새 코드는 parseTerminator) */
export function hexList(text: string) {
  return parseTerminator(text).bytes;
}

const kindOf = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

/**
 * 저장값 읽기. 기본값과 종류(객체·배열·수·글·참거짓)가 다르면 기본값 — 깨진 값(예: 가져온 파일의 "ranges": null,
 * NaN 이 JSON 으로 바뀐 null)으로 화면이 같은 곳에서 계속 죽지 않게. 기본값이 null·undefined 면 무엇이든 받는다
 */
export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    const parsed: unknown = JSON.parse(v);
    if (fallback != null && kindOf(parsed) !== kindOf(fallback)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

/** 저장된 정수 읽기 — 범위 밖·정수가 아니면 기본값(간격·시간 초과·반복 횟수 등) */
export function loadInt(key: string, lo: number, hi: number, fallback: number): number {
  const v = load<number>(key, fallback);
  return Number.isInteger(v) && v >= lo && v <= hi ? v : fallback;
}

export function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장이 막힌 환경 — 무시 */
  }
}

/** 화면에 쌓아 둘 바이트 상한(줄 수 상한과 별개) — 큰 프레임이 많을 때 메모리 폭증을 막는다 */
export const MAX_SCREEN_BYTES = 20_000_000;

/** 줄 수·바이트 상한을 넘으면 앞에서부터 지운다. 지운 뒤 남은 바이트 수를 돌려준다 */
export function trimFrames<T extends { bytes: number[] }>(arr: T[], maxLines: number, bytes: number) {
  let n = 0;
  while ((arr.length - n > maxLines || bytes > MAX_SCREEN_BYTES) && n < arr.length) {
    bytes -= arr[n].bytes.length;
    n++;
  }
  if (n) arr.splice(0, n);
  return bytes;
}

/** 포트 목록이 그대로면 같은 배열을 돌려준다 — 1.5초 폴링마다 화면 전체를 다시 그리지 않게 */
export function samePorts<T>(prev: T[], next: T[]) {
  return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
}
