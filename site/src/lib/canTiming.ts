// CAN 비트 타이밍 — 웹 도구 «CAN 비트 타이밍 계산기 (샘플 포인트·TQ·프리스케일러)». 고전 CAN(CAN FD 데이터 구간 제외).
// 근거:
//   NXP(Freescale) AN1798 Rev. 4 «CAN Bit Timing Requirements»(Bosch CAN 규격을 따름):
//     §2.1 비트 = SYNC_SEG + PROP_SEG + PHASE_SEG1 + PHASE_SEG2, 각 구간은 TQ 의 정수배, TQ = 프리스케일러 ÷ CAN 클럭,
//     SYNC_SEG = 1 TQ, PROP_SEG 1~8, PHASE_SEG1 1~8, IPT = 2 TQ, 한 비트 8~25 TQ, 표 1
//     §2.4 SJW 는 1 이상, 4 이하, PHASE_SEG1 이하
//     §3.2 식 (10) (2Δf)·10·t_NBT < t_SJW, 식 (11) (2Δf)·(13·t_NBT − t_PS2) < MIN(t_PS1, t_PS2) — 클럭 허용 오차
//     §3.1 식 (8)·(9) t_PROP_SEG = 2(t_bus + t_Tx + t_Rx), PROP_SEG = 올림(t_PROP_SEG ÷ TQ)
//     §4.2·4.3 예제 1(8 MHz, 1 Mbit/s → 1·8·4·1·2·1, 0.49 %), 예제 2(8 MHz, 125 kbit/s → 8·8·1·3·3·3, 1.485 %)
//   Microchip SAM9X60 데이터시트 §50.7.4.1 «CAN Bit Timing Configuration» — PHASE_SEG2 는 IPT(2 TQ) 이상·PHASE_SEG1 이하,
//     샘플 포인트는 PHASE_SEG1 의 끝, SJW 는 PHASE_SEG1 과 4 TQ 중 작은 값까지
//   AN1798 표 1 은 PHASE_SEG2 = MAX(IPT, PHASE_SEG1) 이라 PHASE_SEG1 이 1 이면 PHASE_SEG2 = 2(예제 1). 두 문서를 함께 받아들여
//   «IPT ≤ PHASE_SEG2 ≤ MAX(IPT, PHASE_SEG1)» 로 검사한다.

export interface BitTiming {
  brp: number;
  /** 한 비트의 TQ 수 */
  ntq: number;
  prop: number;
  ps1: number;
  ps2: number;
  sjw: number;
  /** 샘플 포인트(0~1) = (1 + PROP + PS1) ÷ NTQ */
  sp: number;
  /** 실제 비트 속도 */
  bitrate: number;
  /** 원하는 속도와의 오차(비) */
  err: number;
  /** 클럭 허용 오차 Δf(비) — 식 (10)·(11) 중 작은 값 */
  tol: number;
  tq: number;
}

export const IPT = 2;

/** 규칙 확인 — 어긋나면 이유, 맞으면 undefined */
export function checkSegments(prop: number, ps1: number, ps2: number, sjw: number): string | undefined {
  const ntq = 1 + prop + ps1 + ps2;
  if (![prop, ps1, ps2, sjw].every(Number.isInteger)) return "integer";
  if (prop < 1 || prop > 8) return "PROP_SEG 1–8";
  if (ps1 < 1 || ps1 > 8) return "PHASE_SEG1 1–8";
  if (ps2 < IPT || ps2 > Math.max(IPT, ps1)) return "IPT ≤ PHASE_SEG2 ≤ max(IPT, PHASE_SEG1)";
  if (sjw < 1 || sjw > Math.min(4, ps1)) return "1 ≤ SJW ≤ min(4, PHASE_SEG1)";
  if (ntq < 8 || ntq > 25) return "8–25 TQ";
  return undefined;
}

export const samplePoint = (prop: number, ps1: number, ps2: number) => (1 + prop + ps1) / (1 + prop + ps1 + ps2);

/** 클럭 허용 오차 Δf — AN1798 식 (10)·(11), TQ 단위로 */
export function oscTolerance(ntq: number, ps1: number, ps2: number, sjw: number): { eq10: number; eq11: number; tol: number } {
  const eq10 = sjw / (20 * ntq);
  const eq11 = Math.min(ps1, ps2) / (2 * (13 * ntq - ps2));
  return { eq10, eq11, tol: Math.min(eq10, eq11) };
}

/** PROP_SEG 최소 TQ — 식 (8)·(9). busNs: 버스 한쪽 끝에서 다른 끝까지 지연, xcvrNs: 송신기 + 수신기 지연 */
export const propMin = (busNs: number, xcvrNs: number, tqNs: number) => Math.max(1, Math.ceil((2 * (busNs + xcvrNs)) / tqNs - 1e-9));

export interface SearchOpts {
  clockHz: number;
  bitrate: number;
  /** 원하는 샘플 포인트(0~1) */
  sp: number;
  /** 프리스케일러 최대(칩마다 다름) */
  brpMax?: number;
  /** 받아들일 속도 오차(비), 기본 0(정확히 맞는 것만) */
  maxErr?: number;
  /** 왕복 지연(ns) — 주면 PROP_SEG 를 그 이상으로 */
  busNs?: number;
  xcvrNs?: number;
}

/**
 * 가능한 조합 — 프리스케일러·TQ 수마다 샘플 포인트가 목표에 가장 가까운 것 하나.
 * PHASE_SEG1 은 규칙 안에서 가장 크게(SJW 를 크게 잡을 수 있어 허용 오차가 커진다), SJW = min(4, PHASE_SEG1)(AN1798 4단계).
 * 정렬: 샘플 포인트 차이 → 허용 오차 큰 것 → TQ 수 많은 것.
 */
export function searchTimings(o: SearchOpts): BitTiming[] {
  const { clockHz, bitrate, sp } = o;
  if (!(clockHz > 0) || !(bitrate > 0) || !(sp > 0 && sp < 1)) throw new RangeError("input");
  const brpMax = o.brpMax ?? 1024;
  const maxErr = o.maxErr ?? 0;
  const out: BitTiming[] = [];
  for (let brp = 1; brp <= brpMax; brp++) {
    for (let ntq = 8; ntq <= 25; ntq++) {
      const real = clockHz / (brp * ntq);
      const err = real / bitrate - 1;
      if (Math.abs(err) > maxErr + 1e-12) continue;
      const tq = brp / clockHz;
      const pmin = o.busNs !== undefined || o.xcvrNs !== undefined ? propMin(o.busNs ?? 0, o.xcvrNs ?? 0, tq * 1e9) : 1;
      let best: BitTiming | undefined;
      for (let ps2 = IPT; ps2 <= 8; ps2++) {
        const tseg1 = ntq - 1 - ps2;
        const hi = Math.min(8, tseg1 - pmin);
        const lo = Math.max(ps2 === IPT ? 1 : ps2, tseg1 - 8);
        if (hi < lo) continue;
        const ps1 = hi;
        const prop = tseg1 - ps1;
        const sjw = Math.min(4, ps1);
        if (checkSegments(prop, ps1, ps2, sjw)) continue;
        const t: BitTiming = { brp, ntq, prop, ps1, ps2, sjw, sp: samplePoint(prop, ps1, ps2), bitrate: real, err, tol: oscTolerance(ntq, ps1, ps2, sjw).tol, tq };
        if (!best || Math.abs(t.sp - sp) < Math.abs(best.sp - sp) - 1e-12 || (Math.abs(Math.abs(t.sp - sp) - Math.abs(best.sp - sp)) < 1e-12 && t.tol > best.tol)) best = t;
      }
      if (best) out.push(best);
    }
  }
  return out.sort((a, b) => Math.abs(a.sp - sp) - Math.abs(b.sp - sp) || b.tol - a.tol || b.ntq - a.ntq || a.brp - b.brp);
}

/** 흔히 쓰는 비트 속도(bit/s) */
export const BITRATES = [1000000, 800000, 500000, 250000, 125000, 100000, 50000, 20000, 10000];
