// 웹 도구 «RS-485 종단·바이어스 저항 계산기» — 아무도 보내지 않을 때(유휴) 바이어스 저항과 종단 저항이 만드는 차동 전압,
// 저항에 흐르는 전류·소비 전력, 보율과 케이블 길이의 대략 한계를 낸다.
// 근거:
//   MODBUS over serial line V1.02 (2006) §3.4.3 길이(9600 bps·AWG26 이상에서 1000 m, 가지선 20 m 이하, n 갈래 탭은 40 m ÷ n)
//     §3.4.5 종단(양 끝에만, 150 Ω 0.5 W 또는 1 nF + 120 Ω 0.25 W), §3.4.6 바이어스(D1 에 5 V 풀업, D0 에 공통 풀다운, 450~650 Ω, 버스 전체에 한 곳)
//   TI SLLA070D (2010) — 수신기는 차동 전압 ±200 mV 이상이면 정해진 상태, 권장 최대 길이 약 1200 m, 대략 «bps × m ≤ 10^8»
// 수신기 입력 저항(단위 부하)은 넣지 않는다 — 장비가 많으면 실제 유휴 전압은 이 값보다 조금 낮다.

export type TermKind = "none" | "r" | "rc";

export interface BiasInput {
  /** 바이어스 전원 V(규격은 5 V) */
  vcc: number;
  /** 풀업(D1/B → Vcc)·풀다운(D0/A → 공통) Ω */
  rUp: number;
  rDown: number;
  /** 두 끝의 종단 — "r" 저항만, "rc" 직렬 커패시터 + 저항(직류로는 끊김), "none" 없음 */
  ends: [TermKind, TermKind];
  /** 종단 저항 Ω */
  rTerm: number;
}

export interface BiasResult {
  /** 직류로 본 두 선 사이 저항 Ω (Infinity = 종단이 직류로 없음) */
  rLine: number;
  /** 유휴 차동 전압 V(D1 − D0) */
  vIdle: number;
  /** 수신기 문턱 200 mV 를 넘는가 */
  ok: boolean;
  /** 바이어스 전류 A */
  iBias: number;
  /** 바이어스 저항 하나가 쓰는 전력 W */
  pUp: number;
  /** 종단 저항 하나가 유휴 때 쓰는 전력 W */
  pTerm: number;
}

export const THRESHOLD = 0.2;

export function bias(x: BiasInput): BiasResult {
  // 전압은 0 이상, 저항은 0 보다 커야 한다 — 0 Ω 이면 0 ÷ 0(NaN)·무한 전류가 화면에 나온다
  if (!Number.isFinite(x.vcc) || x.vcc < 0) throw new RangeError("vcc");
  for (const v of [x.rUp, x.rDown, x.rTerm]) if (!Number.isFinite(v) || !(v > 0)) throw new RangeError("resistance");
  const dc = x.ends.filter((e) => e === "r").length;
  const rLine = dc === 0 ? Infinity : x.rTerm / dc;
  if (rLine === Infinity) {
    // 직류 경로가 없으면 바이어스 전류가 흐르지 않고, 두 선은 각각 Vcc 와 0 V 로 끌린다
    return { rLine, vIdle: x.vcc, ok: x.vcc >= THRESHOLD, iBias: 0, pUp: 0, pTerm: 0 };
  }
  const iBias = x.vcc / (x.rUp + rLine + x.rDown);
  const vIdle = iBias * rLine;
  const iTerm = dc ? vIdle / x.rTerm : 0;
  return { rLine, vIdle, ok: vIdle >= THRESHOLD - 1e-12, iBias, pUp: iBias * iBias * x.rUp, pTerm: iTerm * iTerm * x.rTerm };
}

/** 유휴 차동 전압을 target(V) 이상으로 만드는 풀업·풀다운(같은 값)의 최대 Ω */
export function maxBiasR(vcc: number, rLine: number, target = THRESHOLD) {
  if (rLine === Infinity) return Infinity;
  // target = vcc × rLine / (2R + rLine) → R = (vcc × rLine / target − rLine) / 2
  return (vcc * rLine / target - rLine) / 2;
}

/** 대략 길이 한계 m — TI 의 «bps × m ≤ 10^8» 과 권장 최대 1200 m 중 작은 값 */
export const roughMaxLength = (baud: number) => Math.min(1200, 1e8 / baud);

/** 가지선 한계 m — Modbus 규격 §3.4.3: 하나면 20 m, n 갈래 탭이면 40 m ÷ n */
export const maxStub = (n: number) => (n <= 1 ? 20 : 40 / n);

/** 드라이버가 보낼 때 종단 저항 하나가 쓰는 전력 W (차동 전압 vDiff 일 때) */
export const termPowerDriven = (vDiff: number, rTerm: number) => (vDiff * vDiff) / rTerm;
