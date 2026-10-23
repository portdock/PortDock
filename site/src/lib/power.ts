// 교류 전력(kVA·kW·kvar·역률)과 역률 개선 콘덴서 — 웹 도구 «3상 전력 계산기», «역률 개선 콘덴서 계산기».
// 근거:
//   3상 유효 전력 P = √3 × U × I × cos φ — ABB Technical guide No. 7(3AFE64362569 Rev D) 식 3.15
//   역률 = 유효 전력 kW ÷ 피상 전력 kVA, P·Q 가 함께 S 를 이룸(전력 삼각형) — ABB Low voltage motors Motor guide(2019) §4.10
//   콘덴서 용량: Q = K × P ÷ η, K 는 표 4.7(«cos φ without compensation» → «compensation to cos φ = 0.95·0.90·0.85·0.80»),
//     C = 3.2 × 10^6 × Q ÷ U²(50 Hz, 콘덴서 하나당) — ABB Motor guide(2019) §4.10 «Reactive-power compensation», 표 4.7
//   표 4.7 의 K 는 tan φ1 − tan φ2 와 같다(시험에서 표 값 재현). 3.2 × 10^6 은 10^9 ÷ (2π × 50) ≈ 3.18 × 10^6 을 반올림한 값으로,
//     Q 가 kvar·U 가 V 이면 C 는 µF 로 나온다 — 여기서는 C = Q ÷ (2π f U²) 를 그대로 쓴다(60 Hz 도 같은 식).
//   Δ 결선은 콘덴서 하나에 선간 전압, Y 결선은 상전압(선간 ÷ √3)이 걸린다. 콘덴서 3개의 합이 Q.
//   단상은 √3 대신 1.

export type Ph = "3" | "1";
const kp = (p: Ph) => (p === "3" ? Math.sqrt(3) : 1);

export interface PowerOut {
  /** 전류 A */
  amps: number;
  /** 유효 kW */
  kw: number;
  /** 피상 kVA */
  kva: number;
  /** 무효 kvar */
  kvar: number;
  /** 역률 */
  pf: number;
  /** 위상각(도) */
  deg: number;
}

function pfOk(pf: number) {
  if (!(pf > 0 && pf <= 1)) throw new RangeError("pf");
}
function vOk(v: number) {
  if (!(v > 0)) throw new RangeError("V");
}

const out = (phase: Ph, volts: number, kva: number, pf: number): PowerOut => {
  const kw = kva * pf;
  return { amps: (kva * 1000) / (kp(phase) * volts), kw, kva, kvar: kva * Math.sqrt(1 - pf * pf), pf, deg: (Math.acos(pf) * 180) / Math.PI };
};

/** 전압·전류·역률 → 전력 */
export function fromAmps(phase: Ph, volts: number, amps: number, pf: number): PowerOut {
  vOk(volts);
  pfOk(pf);
  if (!(amps >= 0)) throw new RangeError("A");
  return out(phase, volts, (kp(phase) * volts * amps) / 1000, pf);
}
/** 전압·유효 kW·역률 → 전류 등 */
export function fromKw(phase: Ph, volts: number, kw: number, pf: number): PowerOut {
  vOk(volts);
  pfOk(pf);
  if (!(kw >= 0)) throw new RangeError("kW");
  return out(phase, volts, kw / pf, pf);
}
/** 전압·피상 kVA·역률 → 전류 등 */
export function fromKva(phase: Ph, volts: number, kva: number, pf: number): PowerOut {
  vOk(volts);
  pfOk(pf);
  if (!(kva >= 0)) throw new RangeError("kVA");
  return out(phase, volts, kva, pf);
}
/** kW·kVA → 역률 */
export function pfFromKwKva(kw: number, kva: number): number {
  if (!(kva > 0) || !(kw >= 0) || kw > kva) throw new RangeError("kVA");
  return kw / kva;
}
/** kW·kvar → 역률 */
export function pfFromKwKvar(kw: number, kvar: number): number {
  if (!(kw > 0) || !(kvar >= 0)) throw new RangeError("kW");
  return kw / Math.hypot(kw, kvar);
}

// ── 역률 개선 ─────────────────────────────────────────

const tanOf = (pf: number) => Math.sqrt(1 - pf * pf) / pf;

/** K = tan φ1 − tan φ2 (ABB Motor guide 표 4.7 의 상수) */
export function kFactor(pf1: number, pf2: number): number {
  pfOk(pf1);
  pfOk(pf2);
  if (pf2 < pf1) throw new RangeError("pf2");
  return tanOf(pf1) - tanOf(pf2);
}

export type Conn = "delta" | "star";

export interface CapIn {
  phase: Ph;
  /** 유효 전력 kW (모터라면 입력 전력 = 출력 ÷ 효율) */
  kw: number;
  pf1: number;
  pf2: number;
  /** 선간 전압 V (단상은 그 전압) */
  volts: number;
  hz: number;
  conn: Conn;
}

export interface CapOut {
  k: number;
  /** 필요한 무효 전력 kvar (콘덴서 전체) */
  qc: number;
  /** 콘덴서 하나에 걸리는 전압 V */
  uCap: number;
  /** 콘덴서 하나의 kvar */
  qEach: number;
  /** 콘덴서 하나의 용량 µF */
  uf: number;
  /** 콘덴서 뱅크의 선 전류 A */
  capAmps: number;
  /** 개선 전·후 */
  before: PowerOut;
  after: PowerOut;
}

/** 콘덴서 하나: kvar·전압·주파수 → µF */
export function capUf(qKvar: number, u: number, hz: number): number {
  if (!(u > 0) || !(hz > 0) || !(qKvar >= 0)) throw new RangeError("cap");
  return ((qKvar * 1000) / (2 * Math.PI * hz * u * u)) * 1e6;
}
/** 콘덴서 하나: µF·전압·주파수 → kvar */
export const capKvar = (uf: number, u: number, hz: number) => (2 * Math.PI * hz * u * u * uf * 1e-6) / 1000;

export function capacitor(x: CapIn): CapOut {
  vOk(x.volts);
  if (!(x.kw > 0)) throw new RangeError("kW");
  const k = kFactor(x.pf1, x.pf2);
  const qc = x.kw * k;
  const three = x.phase === "3";
  const uCap = three && x.conn === "star" ? x.volts / Math.sqrt(3) : x.volts;
  const qEach = three ? qc / 3 : qc;
  return {
    k,
    qc,
    uCap,
    qEach,
    uf: capUf(qEach, uCap, x.hz),
    capAmps: (qc * 1000) / (kp(x.phase) * x.volts),
    before: fromKw(x.phase, x.volts, x.kw, x.pf1),
    after: fromKw(x.phase, x.volts, x.kw, x.pf2),
  };
}

/** 콘덴서 kvar 를 정했을 때 개선 뒤 역률 */
export function pfAfter(kw: number, pf1: number, qc: number): number {
  pfOk(pf1);
  if (!(kw > 0)) throw new RangeError("kW");
  const q = kw * tanOf(pf1) - qc;
  return kw / Math.hypot(kw, q);
}
