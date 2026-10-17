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

/** «0D 0A» → [13, 10] */
export function hexList(text: string) {
  return text
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((h) => parseInt(h, 16))
    .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 255);
}

export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
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
