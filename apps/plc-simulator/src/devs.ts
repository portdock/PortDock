// 디바이스 표·프레임 형식 — 화면 어디서나(시험 포함) 쓰는 순수한 값. 백엔드 crates/core/src/mc.rs DEVICES 와 같다

/** 디바이스 이름 — crates/core/src/mc.rs Dev(대문자 이름으로 주고받는다) */
export type Dev = "X" | "Y" | "M" | "L" | "F" | "B" | "SM" | "D" | "W" | "R" | "ZR" | "SD" | "TS" | "TC" | "TN" | "CS" | "CC" | "CN";

/** 화면 줄 순서와 묶음 — 비트 · 워드 · 타이머·카운터 */
export const DEV_GROUPS: Dev[][] = [
  ["X", "Y", "M", "L", "F", "B", "SM"],
  ["D", "W", "R", "ZR", "SD"],
  ["TS", "TC", "TN", "CS", "CC", "CN"],
];
export const DEVS: Dev[] = DEV_GROUPS.flat();

/** 디바이스 성질(백엔드 devices 와 같은 값 — 미리보기·시작 전에도 쓰려고 화면에도 둔다) */
export const DEV_INFO: Record<Dev, { code: number; bits: boolean; hex: boolean; size: number }> = {
  X: { code: 0x9c, bits: true, hex: true, size: 8192 },
  Y: { code: 0x9d, bits: true, hex: true, size: 8192 },
  M: { code: 0x90, bits: true, hex: false, size: 8192 },
  L: { code: 0x92, bits: true, hex: false, size: 8192 },
  F: { code: 0x93, bits: true, hex: false, size: 2048 },
  B: { code: 0xa0, bits: true, hex: true, size: 8192 },
  SM: { code: 0x91, bits: true, hex: false, size: 2048 },
  D: { code: 0xa8, bits: false, hex: false, size: 12288 },
  W: { code: 0xb4, bits: false, hex: true, size: 8192 },
  R: { code: 0xaf, bits: false, hex: false, size: 32768 },
  ZR: { code: 0xb0, bits: false, hex: true, size: 65536 },
  SD: { code: 0xa9, bits: false, hex: false, size: 2048 },
  TS: { code: 0xc1, bits: true, hex: false, size: 1024 },
  TC: { code: 0xc0, bits: true, hex: false, size: 1024 },
  TN: { code: 0xc2, bits: false, hex: false, size: 1024 },
  CS: { code: 0xc4, bits: true, hex: false, size: 1024 },
  CC: { code: 0xc3, bits: true, hex: false, size: 1024 },
  CN: { code: 0xc5, bits: false, hex: false, size: 1024 },
};
export const MAX_SIZE = 65536;

export type FrameKind = "3e" | "4e";
export type DataCode = "binary" | "ascii";
export interface Format {
  frame: FrameKind;
  code: DataCode;
}
