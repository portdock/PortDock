// 변류기(CT) 비·2차 전류·부담 — 웹 도구 «CT 비·2차 전류·부담 계산기».
// 근거:
//   ABB «Instrument Transformers — Technical Information and Application Guide»(1VAP420003-TG, December 2004 Rev. A)
//     p.4  CT 의 보통 출력 1~5 A
//     p.5  CT 는 선로에 직렬로 들어가 선 전류를 5 A 로 바꾼다, 2차 회로는 접지
//     p.10 명판 «marked ratio» 와 실제 비의 차 — 비 보정 계수 RCF = 실제 비 ÷ 표시 비(예: 20.2 : 1 → RCF 1.01, 비 오차 1 %),
//          RCF 가 1 보다 크면 계기는 낮게 읽고 읽은 값에 RCF 를 곱한다(IEEE C57.13)
//     p.13 부담(burden) = 2차에 이어진 임피던스, 표준 부담 표(5 A 기준 B-0.1 = 0.1 Ω·2.5 VA …),
//          5 A 가 아닌 CT 는 옴 값에 (5 ÷ 정격 전류)² 를 곱하고 정격 전류에서의 VA 는 같다
//     p.26 2차를 열면 아주 높은 전압 펄스 — 2차 개방은 심각한 사고로 본다
//   VA = I² × R(옴의 법칙), 왕복 선 저항은 lib/wire(IEC 60028 구리 저항률).
//   IEC 61869-2 의 정확도 등급별 오차 한도는 원문(유료)을 확인하지 않아 여기서 다루지 않는다.
import { resistance } from "./wire.ts";

const pos = (x: number) => x > 0 && Number.isFinite(x);
function fin(x: number) {
  if (!Number.isFinite(x) || x < 0) throw new RangeError("CT");
  return x;
}

/** CT 비(1차 정격 ÷ 2차 정격), 예: 200/5 → 40 */
export function ratio(ipn: number, isn: number): number {
  if (!pos(ipn) || !pos(isn)) throw new RangeError("CT");
  return fin(ipn / isn);
}
/** 1차 전류 → 2차 전류(표시 비 그대로, 오차 없는 이상 CT) */
export function toSecondary(ip: number, ipn: number, isn: number): number {
  if (!(ip >= 0) || !Number.isFinite(ip)) throw new RangeError("I");
  return fin(ip / ratio(ipn, isn));
}
/** 1차 전류가 정격 1차의 몇 % 인지 — 넘치면(1e307 A 같은 입력) «Infinity %» 로 찍히지 않게 거절 */
export function loadPct(ip: number, ipn: number): number {
  if (!(ip >= 0) || !Number.isFinite(ip) || !pos(ipn)) throw new RangeError("I");
  return fin((ip / ipn) * 100);
}
/** 2차 전류 → 1차 전류 */
export function toPrimary(is: number, ipn: number, isn: number): number {
  if (!(is >= 0) || !Number.isFinite(is)) throw new RangeError("I");
  return fin(is * ratio(ipn, isn));
}

/** 2차 회로 왕복 선 저항(Ω) — 편도 길이 m, 단면적 mm², 구리 */
export function leadOhm(oneWayM: number, areaMm2: number, tempC = 20): number {
  if (!(oneWayM >= 0) || !Number.isFinite(oneWayM) || !pos(areaMm2)) throw new RangeError("lead");
  return fin(resistance("cu", 2 * oneWayM, areaMm2, tempC));
}
/** 저항 R(Ω)에 전류 I(A)가 흐를 때 VA(= I² R) */
export function va(i: number, ohm: number): number {
  if (!(i >= 0) || !Number.isFinite(i) || !(ohm >= 0) || !Number.isFinite(ohm)) throw new RangeError("VA");
  return fin(i * i * ohm);
}
/** 정격 2차 전류에서 VA 로 적힌 부담 → Ω */
export function vaToOhm(vaRated: number, isn: number): number {
  if (!(vaRated >= 0) || !Number.isFinite(vaRated) || !pos(isn)) throw new RangeError("VA");
  return fin(vaRated / (isn * isn));
}

export interface Burden {
  /** 왕복 선 저항 Ω */
  leadOhm: number;
  /** 계기 입력 Ω(정격 2차 전류에서 VA 로 받은 값을 바꾼 것) */
  meterOhm: number;
  /** 그 밖의 Ω(단자·시험 단자 등, 입력값) */
  otherOhm: number;
  totalOhm: number;
  /** 정격 2차 전류에서 VA */
  leadVa: number;
  meterVa: number;
  totalVa: number;
  /** CT 정격 부담 대비 % (정격 부담을 넣었을 때) */
  pctOfRated?: number;
  /** 정격 2차 전류에서 2차 단자 전압 V(= I × Z, 저항만 셈) */
  volts: number;
}

/** 2차 회로 전체 부담 — 저항 성분만 더한다(리액턴스 무시) */
export function burden(isn: number, oneWayM: number, areaMm2: number, meterVa: number, otherOhm = 0, ratedVa?: number, tempC = 20): Burden {
  if (!pos(isn)) throw new RangeError("I");
  if (!(otherOhm >= 0) || !Number.isFinite(otherOhm)) throw new RangeError("R");
  const lo = leadOhm(oneWayM, areaMm2, tempC);
  const mo = vaToOhm(meterVa, isn);
  const to = fin(lo + mo + otherOhm);
  const totalVa = va(isn, to);
  const out: Burden = { leadOhm: lo, meterOhm: mo, otherOhm, totalOhm: to, leadVa: va(isn, lo), meterVa: va(isn, mo), totalVa, volts: fin(isn * to) };
  if (ratedVa != null) {
    if (!pos(ratedVa)) throw new RangeError("VA");
    out.pctOfRated = fin((totalVa / ratedVa) * 100);
  }
  return out;
}

/** 비 보정 계수 RCF = 실제 비 ÷ 표시 비 (ABB p.10, IEEE C57.13 의 정의) */
export function rcf(actualRatio: number, markedRatio: number): number {
  if (!pos(actualRatio) || !pos(markedRatio)) throw new RangeError("RCF");
  return fin(actualRatio / markedRatio);
}
/** 실제 1차·2차 전류로 잰 비 → RCF 와 비 오차 %(= (RCF − 1) × 100, ABB 예: 20.2 : 1 ↔ 20 : 1 → 1 %) */
export function ratioError(ipMeasured: number, isMeasured: number, ipn: number, isn: number) {
  if (!pos(ipMeasured) || !pos(isMeasured)) throw new RangeError("I");
  const r = rcf(ipMeasured / isMeasured, ratio(ipn, isn));
  return { rcf: r, pct: (r - 1) * 100 };
}

/** 5 A 기준 옴 값 → 다른 정격 2차 전류에서 같은 VA 가 되는 옴 값(ABB p.13 각주: × (5 ÷ I)²) */
export const ohmForRating = (ohmAt5A: number, isn: number) => {
  if (!(ohmAt5A >= 0) || !Number.isFinite(ohmAt5A) || !pos(isn)) throw new RangeError("R");
  return fin(ohmAt5A * (5 / isn) ** 2);
};
