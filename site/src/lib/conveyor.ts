// 웹 도구 «컨베이어 속도 ↔ 인버터 주파수 계산기» — 롤러(드럼) 지름·감속비·극수·슬립 → 라인 속도, 거꾸로 필요한 Hz.
// 근거: 회전 한 번에 둘레 π × D 만큼 움직인다(정의). 회전수는 lib/motor.ts 와 같은 식 —
//   동기 속도 = 120 × f ÷ 극수(ABB Motor guide §9.3), 정격 슬립 회전수를 그대로 둔 근사(YASKAWA A1000 E2-02).
// 벨트 두께·미끄럼·부하에 따른 슬립 변화는 넣지 않는다 — 실제 속도는 재서 맞춘다.
import { hzFor, speedAt } from "./motor.ts";

const pos = (x: number) => Number.isFinite(x) && x > 0;

/** 롤러 회전수 r/min, 지름 mm → 라인 속도 m/min */
export function lineSpeed(rollerRpm: number, diaMm: number) {
  if (!pos(diaMm) || !(rollerRpm >= 0)) throw new RangeError("conveyor");
  return (Math.PI * diaMm * rollerRpm) / 1000;
}

/** 라인 속도 m/min → 롤러 회전수 r/min */
export function rollerRpm(mPerMin: number, diaMm: number) {
  if (!pos(diaMm) || !(mPerMin >= 0)) throw new RangeError("conveyor");
  return (mPerMin * 1000) / (Math.PI * diaMm);
}

export interface Drive {
  poles: number;
  /** 정격 슬립 회전수 r/min (명판 동기 속도 − 정격 회전수, 모르면 0) */
  slipRpm: number;
  /** 감속비(모터 회전수 ÷ 롤러 회전수) */
  ratio: number;
  diaMm: number;
}

/** 출력 주파수 → 라인 속도 m/min (동기 속도 기준·슬립 반영 둘 다) */
export function speedFromHz(hz: number, d: Drive) {
  const s = speedAt(hz, d.poles, d.slipRpm, d.ratio);
  return { motorRpm: s.n, rollerRpm: s.out, m: lineSpeed(s.out, d.diaMm), mSync: lineSpeed(s.outSync, d.diaMm) };
}

/** 원하는 라인 속도 m/min → 필요한 출력 주파수 Hz */
export function hzForSpeed(mPerMin: number, d: Drive) {
  return hzFor(rollerRpm(mPerMin, d.diaMm), d.poles, d.slipRpm, d.ratio);
}

/** 주파수 1 Hz 당 라인 속도(m/min) — 동기 속도 기준 */
export function perHz(d: Drive) {
  return speedFromHz(1, { ...d, slipRpm: 0 }).mSync;
}
