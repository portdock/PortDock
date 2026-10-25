// 타이밍 벨트 길이·축간 거리 — 웹 도구 «타이밍 벨트 길이·축간 거리 계산기».
// 근거(Gates 공식 자료, gates.com):
//   Gates Mectrol «Timing Belt Theory»(백서, GM_Belt Theory_06_US, 2006) p.3~4
//     식 (4) 벨트 길이 L = 피치 p × 벨트 잇수 zb (피치선에서 잰다)
//     식 (5) 같은 풀리 둘: L = 2C + π·d
//     식 (6) 작은 풀리 감긴 각 θ1 = 2·arccos((d2 − d1) ÷ 2C),  식 (7) θ2 = 2π − θ1
//     식 (8) 스팬 길이 Ls = C·sin(θ1/2)
//     식 (9) L = 2C·sin(θ1/2) + θ1·d1/2 + (2π − θ1)·d2/2 — C 에 대한 닫힌 해가 없어 수치로 푼다
//     식 (10) 근사 C ≈ (Y + √(Y² − 2(d2 − d1)²)) ÷ 4,  Y = L − π(d2 + d1)/2
//   Gates «PowerGrip GT3 Drive Design Manual»(17195, 10/2014) — gates.com/content/dam/documents-library/catalogs/
//     powergrip-gt3-drive-design-manual-en.pdf
//     p.3 선정 예: 8MGT 72·144 홈(PD 7.218·14.437 in), 2400 mm(94.49 in) 벨트 → 축간 30.02 in
//                 14MGT 36·72 홈(PD 6.316·12.632 in), 2310 mm(90.94 in) 벨트 → 30.42 in
//     p.4 벨트 속도 V(fpm) = PD(in) × rpm ÷ 3.82 (예: 7.218 × 1160 ÷ 3.82 = 2191.9)
//     p.12 5MGT 선정 표(축간 거리 in) — 네 행 52칸을 시험에 옮김: 48칸은 끝자리까지 같고, 4칸은 계산값이
//          반올림 경계(…5)라 0.01 차이
//     «Useful Formulas and Calculations»(p.188): PL ≈ 2C + 1.57(D + d) + (D − d)² ÷ 4C,  감긴 각 ≈ 180 − (D − d) × 60 ÷ C (°)
//     Engineering §14 «Minimum Belt Wrap and Tooth Engagement»: 표의 정격은 맞물린 이 6개 이상 기준, 그보다 적으면 줄인다
// 피치원 지름 PD = 잇수 × 피치 ÷ π (같은 매뉴얼 풀리 표의 PD 와 같음).

const pos = (x: number) => x > 0 && Number.isFinite(x);
function fin(x: number) {
  if (!Number.isFinite(x)) throw new RangeError("belt");
  return x;
}

/** 피치원 지름 = z × p ÷ π */
export function pitchDiameter(teeth: number, pitch: number) {
  if (!pos(teeth) || !Number.isInteger(teeth) || teeth > 1e5 || !pos(pitch) || pitch > 1e4) throw new RangeError("pd");
  return (teeth * pitch) / Math.PI;
}

const order = (a: number, b: number) => (a <= b ? [a, b] : [b, a]);

/** 두 풀리가 겹치지 않는 가장 짧은 축간 거리 = (d1 + d2) ÷ 2 */
const minC = (d1: number, d2: number) => (d1 + d2) / 2;

function check(c: number, da: number, db: number) {
  if (!pos(da) || !pos(db) || !pos(c)) throw new RangeError("belt");
  if (c <= minC(da, db)) throw new RangeError("overlap");
}

/** 작은 풀리 감긴 각 θ1 (라디안) — 식 (6) */
export function wrapSmall(c: number, da: number, db: number) {
  check(c, da, db);
  const [d1, d2] = order(da, db);
  return 2 * Math.acos((d2 - d1) / (2 * c));
}

/** 벨트 피치 길이(정확) — 식 (9). 단위는 c·d 와 같다 */
export function beltLength(c: number, da: number, db: number) {
  const th = wrapSmall(c, da, db);
  const [d1, d2] = order(da, db);
  return fin(2 * c * Math.sin(th / 2) + (th * d1) / 2 + ((2 * Math.PI - th) * d2) / 2);
}

/** Gates 매뉴얼 근사 PL ≈ 2C + 1.57(D + d) + (D − d)² ÷ 4C */
export function beltLengthApprox(c: number, da: number, db: number) {
  check(c, da, db);
  return fin(2 * c + 1.57 * (da + db) + (da - db) ** 2 / (4 * c));
}

/** 이 길이로 만들 수 있는 가장 짧은 벨트(풀리가 맞닿을 때) — 이보다 짧으면 축간 거리가 없다 */
export function minLength(da: number, db: number) {
  if (!pos(da) || !pos(db)) throw new RangeError("belt");
  const c = minC(da, db) * (1 + 1e-12);
  return beltLength(c, da, db);
}

/** 벨트 길이 → 축간 거리(정확, 식 (9)를 이분법으로) */
export function centerDistance(len: number, da: number, db: number) {
  if (!pos(len)) throw new RangeError("L");
  const lo0 = minC(da, db);
  if (len <= minLength(da, db)) throw new RangeError("short");
  let lo = lo0 * (1 + 1e-12);
  let hi = Math.max(len / 2, lo * 2);
  for (let i = 0; i < 200 && hi - lo > 1e-12 * hi; i++) {
    const m = (lo + hi) / 2;
    if (beltLength(m, da, db) < len) lo = m;
    else hi = m;
  }
  return fin((lo + hi) / 2);
}

/** 근사 축간 거리 — 식 (10) */
export function centerApprox(len: number, da: number, db: number) {
  if (!pos(len) || !pos(da) || !pos(db)) throw new RangeError("belt");
  const y = len - (Math.PI * (da + db)) / 2;
  const disc = y * y - 2 * (db - da) ** 2;
  if (!(y > 0) || !(disc >= 0)) throw new RangeError("short");
  return fin((y + Math.sqrt(disc)) / 4);
}

/** 맞물린 잇수(감긴 각 비율) = z1 × θ1 ÷ 2π — 정수로 내린 값도 함께 */
export function teethInMesh(z1: number, theta1: number) {
  if (!pos(z1) || !(theta1 > 0 && theta1 <= 2 * Math.PI)) throw new RangeError("mesh");
  const v = (z1 * theta1) / (2 * Math.PI);
  return { v, whole: Math.floor(v + 1e-9) };
}

/** 벨트 속도 m/s = π × PD(mm) × rpm ÷ 60 000 */
export function beltSpeed(pdMm: number, rpm: number) {
  if (!pos(pdMm) || !pos(rpm)) throw new RangeError("v");
  return fin((Math.PI * pdMm * rpm) / 60000);
}

/** Gates 매뉴얼의 ft/min 식: PD(in) × rpm ÷ 3.82 */
export const gatesFpm = (pdIn: number, rpm: number) => (pdIn * rpm) / 3.82;

/**
 * 풀리 잇수·피치와 원하는 축간 거리 → 가장 가까운 벨트 잇수 두 개(짧은·긴)와 그때 축간 거리.
 * 벨트 길이는 피치의 정수배여야 한다(식 (4)).
 */
export function nearestBelts(z1: number, z2: number, pitch: number, cWanted: number) {
  const d1 = pitchDiameter(z1, pitch);
  const d2 = pitchDiameter(z2, pitch);
  const l = beltLength(cWanted, d1, d2);
  const zb = l / pitch;
  const out: { teeth: number; length: number; c: number }[] = [];
  for (const t of [Math.floor(zb), Math.ceil(zb)]) {
    if (out.some((o) => o.teeth === t)) continue;
    const len = t * pitch;
    if (len <= minLength(d1, d2)) continue;
    out.push({ teeth: t, length: len, c: centerDistance(len, d1, d2) });
  }
  return { d1, d2, length: l, teeth: zb, belts: out };
}
