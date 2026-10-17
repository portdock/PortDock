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
