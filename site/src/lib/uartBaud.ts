// UART 보율 오차 — 웹 도구 «UART 보율 오차 계산기 (MCU 클럭·분주비)».
// 근거: ATmega328P 데이터시트(Microchip 7810D, 2015-01)
//   표 19-1 BAUD = f_OSC ÷ (16(UBRRn + 1)) (보통), ÷ (8(UBRRn + 1)) (U2Xn = 1 두 배 속도)
//   §19.11 오차[%] = (가장 가까운 BAUD ÷ 원하는 BAUD − 1) × 100, 표 19-9~19-12 예시(16 MHz 115.2k → UBRR 8, −3.5 %)
//   §19.8.3 수신 허용 범위 R_slow = (D + 1)S ÷ (S − 1 + D·S + S_F), R_fast = (D + 2)S ÷ ((D + 1)S + S_M),
//     D = 데이터 + 패리티 비트(5~10), S = 16(보통)·8(두 배 속도), S_F = 8·4, S_M = 9·5, 표 19-2·19-3(권장 최대 수신 오차)
// 분수 분주기(소수 부분이 있는 분주 레지스터)는 «소수 비트 수» 로 일반화해 계산한다 — 실제 레지스터 모양은 칩 매뉴얼을 따른다.

export interface BaudResult {
  /** 이상적인 분주비 f ÷ (오버샘플링 × 보율) */
  ideal: number;
  /** 실제로 넣을 분주비(정수 또는 1/2^frac 단위) */
  div: number;
  /** 실제 보율 */
  actual: number;
  /** 오차(%) */
  errPct: number;
}

/** clockHz, baud, 오버샘플링(16·8), 소수 비트(0 = 정수 분주) */
export function baudFor(clockHz: number, baud: number, os = 16, fracBits = 0): BaudResult {
  if (!(clockHz > 0) || !(baud > 0) || !(os > 0) || !(fracBits >= 0)) throw new RangeError("input");
  const ideal = clockHz / (os * baud);
  const step = 2 ** -fracBits;
  const div = Math.max(step, Math.round(ideal / step) * step);
  const actual = clockHz / (os * div);
  return { ideal, div, actual, errPct: (actual / baud - 1) * 100 };
}

/** AVR UBRR 값 = 분주비 − 1 (정수 분주) */
export const avrUbrr = (r: BaudResult) => r.div - 1;

/** AVR 수신 허용 범위(§19.8.3). d = 데이터 + 패리티 비트, double = U2X */
export function avrRange(d: number, double = false): { slow: number; fast: number } {
  const S = double ? 8 : 16;
  const SF = double ? 4 : 8;
  const SM = double ? 5 : 9;
  return { slow: ((d + 1) * S) / (S - 1 + d * S + SF), fast: ((d + 2) * S) / ((d + 1) * S + SM) };
}

/** 표 19-2·19-3 «권장 최대 수신 오차(%)» — 송신·수신이 전체 오차를 반씩 나눈다고 본 값 */
export const AVR_REC: Record<"normal" | "double", Record<number, number>> = {
  normal: { 5: 3.0, 6: 2.5, 7: 2.0, 8: 2.0, 9: 1.5, 10: 1.5 },
  double: { 5: 2.5, 6: 2.0, 7: 1.5, 8: 1.5, 9: 1.5, 10: 1.0 },
};

export const BAUDS = [1200, 2400, 4800, 9600, 14400, 19200, 28800, 38400, 57600, 76800, 115200, 230400, 250000, 460800, 500000, 921600, 1000000];
