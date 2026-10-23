// 유도 전동기 계산 — 웹 도구 «모터 전류 계산기» 와 «인버터 주파수 ↔ 모터 회전수 계산기» 가 함께 쓴다.
// 근거:
//   입력 = √3 × U × I × cos φ(3상, 식 3.15), 효율 = 출력 ÷ 입력(식 3.16), 토크 = 9550 × kW ÷ r/min(식 3.14), 슬립(식 3.1),
//     동기 속도 = 2 × f × 60 ÷ 극수(식 3.2) — ABB Technical guide No. 7(3AFE64362569 Rev D) «Induction (AC) motor»
//   단상은 √3 대신 1, 직류는 역률 대신 1 (같은 정의를 상 수에 맞춘 것)
//   역률 = 유효 전력 kW ÷ 피상 전력 kVA — ABB Low voltage motors Motor guide(2019) §4 «Power factor»
//   동기 속도 r/min = 주파수 × 120 ÷ 극수 — ABB Motor guide §9.3
//   정격 슬립(Hz) = 정격 주파수 − 정격 회전수 × 극수 ÷ 120 — YASKAWA A1000 Technical Manual(SIEP C710616 41H) E2-02
//   토크 = 출력 ÷ 각속도, 각속도 = 2π × r/min ÷ 60 (SI)

export type Phase = "3" | "1" | "dc";

export interface CurrentInput {
  phase: Phase;
  /** 정격 출력(축 출력) kW */
  kw: number;
  /** 전압 V — 3상은 선간 전압 */
  volts: number;
  /** 효율 0~1 */
  eff: number;
  /** 역률 0~1 (직류는 무시) */
  pf: number;
}

export interface CurrentResult {
  amps: number;
  /** 입력(유효) 전력 kW */
  inputKw: number;
  /** 피상 전력 kVA (직류는 입력 kW 와 같음) */
  kva: number;
  /** 무효 전력 kvar */
  kvar: number;
  /** 손실 kW = 입력 − 출력 */
  lossKw: number;
}

const k = (p: Phase) => (p === "3" ? Math.sqrt(3) : 1);

function check(x: { volts: number; eff: number; pf: number; phase: Phase }) {
  if (!(x.volts > 0)) throw new RangeError("volts");
  if (!(x.eff > 0 && x.eff <= 1)) throw new RangeError("eff");
  if (x.phase !== "dc" && !(x.pf > 0 && x.pf <= 1)) throw new RangeError("pf");
}

/** 출력 kW → 전류 A */
export function motorCurrent(x: CurrentInput): CurrentResult {
  check(x);
  if (!(x.kw >= 0)) throw new RangeError("kw");
  const pf = x.phase === "dc" ? 1 : x.pf;
  const inputKw = x.kw / x.eff;
  const kva = inputKw / pf;
  const amps = (kva * 1000) / (k(x.phase) * x.volts);
  return { amps, inputKw, kva, kvar: Math.sqrt(Math.max(0, kva * kva - inputKw * inputKw)), lossKw: inputKw - x.kw };
}

/** 전류 A → 출력 kW (위 식을 거꾸로) */
export function motorOutputKw(x: Omit<CurrentInput, "kw"> & { amps: number }) {
  check(x);
  if (!(x.amps >= 0)) throw new RangeError("amps");
  const pf = x.phase === "dc" ? 1 : x.pf;
  return (k(x.phase) * x.volts * x.amps * pf * x.eff) / 1000;
}

/** 명판 전압·전류·역률·출력 → 효율 (ABB Technical guide No. 7 예제 3.4 꼴) */
export function efficiencyFrom(x: { phase: Phase; kw: number; volts: number; amps: number; pf: number }) {
  if (!(x.volts > 0 && x.amps > 0)) throw new RangeError("volts/amps");
  if (!(x.kw >= 0)) throw new RangeError("kw");
  if (x.phase !== "dc" && !(x.pf > 0 && x.pf <= 1)) throw new RangeError("pf");
  const pf = x.phase === "dc" ? 1 : x.pf;
  return (x.kw * 1000) / (k(x.phase) * x.volts * x.amps * pf);
}

/** 정격 토크 N·m = 출력 W ÷ (2π × r/min ÷ 60) */
export function torqueNm(kw: number, rpm: number) {
  if (!(rpm > 0)) throw new RangeError("rpm");
  return (kw * 1000 * 60) / (2 * Math.PI * rpm);
}

// ── 회전수 ─────────────────────────────────────────────

/** 동기 속도 r/min = 120 × f ÷ 극수 */
export function syncRpm(hz: number, poles: number) {
  if (!(poles >= 2) || poles % 2 !== 0) throw new RangeError("poles");
  if (!(hz >= 0)) throw new RangeError("hz");
  return (120 * hz) / poles;
}

/** r/min → 그 회전수의 동기 주파수 Hz */
export const rpmToHz = (rpm: number, poles: number) => (rpm * poles) / 120;

export interface Slip {
  /** 동기 속도 r/min */
  ns: number;
  /** 슬립 회전수 r/min */
  rpm: number;
  /** 슬립 0~1 */
  s: number;
  /** 슬립 주파수 Hz (YASKAWA E2-02 꼴) */
  hz: number;
}

/** 명판 정격 주파수·정격 회전수·극수 → 정격 슬립 */
export function ratedSlip(hz: number, rpm: number, poles: number): Slip {
  const ns = syncRpm(hz, poles);
  if (!(rpm > 0 && rpm <= ns)) throw new RangeError("rpm");
  return { ns, rpm: ns - rpm, s: (ns - rpm) / ns, hz: hz - (rpm * poles) / 120 };
}

/**
 * 명판에서 극수 추정 — 정격 회전수 이상인 동기 속도 가운데 가장 가까운 것.
 * 유도 전동기는 슬립만큼 동기 속도보다 느리고(50 Hz 1450 r/min → 4극), 동기 속도 그대로 적힌 명판(50 Hz 1500 r/min — 동기 전동기·반올림)도 같은 극수(4극)로 본다.
 */
export function guessPoles(hz: number, rpm: number) {
  if (!(hz > 0) || !(rpm > 0)) return undefined;
  for (let p = 2; p <= 48; p += 2) if (syncRpm(hz, p) >= rpm && syncRpm(hz, p + 2) < rpm) return p;
  return undefined;
}

/**
 * 출력 주파수 f 에서 회전수 — 동기 속도와, 정격 슬립 회전수(r/min)가 그대로라고 본 근삿값.
 * 근사: 기저 주파수 아래 V/f 운전에서 같은 토크면 슬립 회전수가 거의 같다(토크–속도 곡선이 옆으로 평행 이동).
 * 실제 회전수는 부하 토크·제어 방식(슬립 보상·벡터 제어)에 따라 다르다.
 */
export function speedAt(hz: number, poles: number, slipRpm: number, ratio = 1) {
  if (!(ratio > 0)) throw new RangeError("ratio");
  const ns = syncRpm(hz, poles);
  const n = Math.max(0, ns - slipRpm);
  return { ns, n, out: n / ratio, outSync: ns / ratio };
}

/** 원하는 축 회전수(감속 뒤) → 필요한 출력 주파수 (슬립 회전수 근사 포함) */
export function hzFor(outRpm: number, poles: number, slipRpm = 0, ratio = 1) {
  if (!(ratio > 0)) throw new RangeError("ratio");
  if (!(outRpm >= 0)) throw new RangeError("rpm");
  return rpmToHz(outRpm * ratio + slipRpm, poles);
}

/** 극수별 동기 속도 표 */
export const POLES = [2, 4, 6, 8, 10, 12];
