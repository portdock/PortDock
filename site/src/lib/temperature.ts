// 온도 환산 — 측온저항체(Pt100·Pt500·Pt1000)와 열전대(B·E·J·K·N·R·S·T).
// 측온저항체: IEC 60751 Callendar–Van Dusen 식, α = 0.00385 (A = 3.9083e-3, B = -5.775e-7, C = -4.183e-12), -200~850 °C.
// 열전대: NIST ITS-90 열전대 데이터베이스(SRD 60, NIST Monograph 175) — its90.nist.gov/downloadFiles/type_?.tab.txt 에서 그대로 옮긴 계수.
//   온도 → mV 는 기준 함수(reference function) 그대로, mV → 온도는 NIST 역함수로 첫 값을 잡고 기준 함수에 맞춰 뉴턴법으로 다듬는다.
//   mV → 온도의 유효 범위는 NIST 역함수가 덮는 전압 범위(그 밖은 계산하지 않는다).

export type Lang = "ko" | "en";
const msg = (lang: Lang, ko: string, en: string) => (lang === "ko" ? ko : en);

// ---- 측온저항체 (IEC 60751)
export const CVD = { A: 3.9083e-3, B: -5.775e-7, C: -4.183e-12 } as const;
export const RTD_T_MIN = -200;
export const RTD_T_MAX = 850;
export const RTD_R0 = [100, 500, 1000] as const;

const cvd = (t: number, r0: number) => r0 * (1 + CVD.A * t + CVD.B * t * t + (t < 0 ? CVD.C * (t - 100) * t * t * t : 0));

/** 온도(°C) → 저항(Ω). 범위 밖이면 Error */
export function rtdResistance(t: number, r0: number, lang: Lang = "ko"): number {
  if (!Number.isFinite(t) || t < RTD_T_MIN || t > RTD_T_MAX)
    throw new Error(msg(lang, `측온저항체 범위(${RTD_T_MIN}~${RTD_T_MAX} °C) 밖입니다`, `Outside the RTD range (${RTD_T_MIN} to ${RTD_T_MAX} °C)`));
  return cvd(t, r0);
}

/** 저항(Ω) → 온도(°C). 0 °C 이상은 2차식의 근, 0 °C 아래는 뉴턴법 */
export function rtdTemperature(r: number, r0: number, lang: Lang = "ko"): number {
  const lo = cvd(RTD_T_MIN, r0);
  const hi = cvd(RTD_T_MAX, r0);
  if (!Number.isFinite(r) || r < lo - 1e-9 || r > hi + 1e-9)
    throw new Error(
      msg(lang, `저항이 범위(${lo.toFixed(4)}~${hi.toFixed(4)} Ω) 밖입니다`, `Resistance outside the range (${lo.toFixed(4)} to ${hi.toFixed(4)} Ω)`),
    );
  const { A, B } = CVD;
  if (r >= r0) return (-A + Math.sqrt(A * A - 4 * B * (1 - r / r0))) / (2 * B);
  let t = (-A + Math.sqrt(A * A - 4 * B * (1 - r / r0))) / (2 * B);
  for (let i = 0; i < 50; i++) {
    const f = cvd(t, r0) - r;
    const d = (cvd(t + 1e-4, r0) - cvd(t - 1e-4, r0)) / 2e-4;
    const step = f / d;
    t -= step;
    if (Math.abs(step) < 1e-10) break;
  }
  return t;
}

// ---- 열전대 (NIST ITS-90, SRD 60)
export type TcType = "B" | "E" | "J" | "K" | "N" | "R" | "S" | "T";
export const TC_TYPES: TcType[] = ["K", "J", "T", "E", "N", "R", "S", "B"];

interface RefRange {
  lo: number;
  hi: number;
  /** E = Σ c_i t^i (mV, °C) */
  c: number[];
}
interface InvRange {
  tLo: number;
  tHi: number;
  eLo: number;
  eHi: number;
  /** NIST 가 밝힌 역함수 오차(°C) */
  err: [number, number];
  /** t = Σ d_i E^i */
  d: number[];
}
interface TcData {
  ref: RefRange[];
  /** K 형만: 0 °C 위 구간에 + a0·exp(a1·(t − a2)²) */
  exp?: [number, number, number];
  inv: InvRange[];
}

// prettier-ignore
export const TC: Record<TcType, TcData> = {
  B: {
    ref: [
      { lo: 0.0, hi: 630.615, c: [0.000000000000E+00, -0.246508183460E-03, 0.590404211710E-05, -0.132579316360E-08, 0.156682919010E-11, -0.169445292400E-14, 0.629903470940E-18] },
      { lo: 630.615, hi: 1820.0, c: [-0.389381686210E+01, 0.285717474700E-01, -0.848851047850E-04, 0.157852801640E-06, -0.168353448640E-09, 0.111097940130E-12, -0.445154310330E-16, 0.989756408210E-20, -0.937913302890E-24] },
    ],
    inv: [
      { tLo: 250.0, tHi: 700.0, eLo: 0.291, eHi: 2.431, err: [-0.02, 0.03], d: [9.8423321E+01, 6.9971500E+02, -8.4765304E+02, 1.0052644E+03, -8.3345952E+02, 4.5508542E+02, -1.5523037E+02, 2.9886750E+01, -2.4742860E+00] },
      { tLo: 700.0, tHi: 1820.0, eLo: 2.431, eHi: 13.82, err: [-0.01, 0.02], d: [2.1315071E+02, 2.8510504E+02, -5.2742887E+01, 9.9160804E+00, -1.2965303E+00, 1.1195870E-01, -6.0625199E-03, 1.8661696E-04, -2.4878585E-06] },
    ],
  },
  E: {
    ref: [
      { lo: -270.0, hi: 0.0, c: [0.000000000000E+00, 0.586655087080E-01, 0.454109771240E-04, -0.779980486860E-06, -0.258001608430E-07, -0.594525830570E-09, -0.932140586670E-11, -0.102876055340E-12, -0.803701236210E-15, -0.439794973910E-17, -0.164147763550E-19, -0.396736195160E-22, -0.558273287210E-25, -0.346578420130E-28] },
      { lo: 0.0, hi: 1000.0, c: [0.000000000000E+00, 0.586655087100E-01, 0.450322755820E-04, 0.289084072120E-07, -0.330568966520E-09, 0.650244032700E-12, -0.191974955040E-15, -0.125366004970E-17, 0.214892175690E-20, -0.143880417820E-23, 0.359608994810E-27] },
    ],
    inv: [
      { tLo: -200.0, tHi: 0.0, eLo: -8.825, eHi: 0.0, err: [-0.01, 0.03], d: [0.0000000E+00, 1.6977288E+01, -4.3514970E-01, -1.5859697E-01, -9.2502871E-02, -2.6084314E-02, -4.1360199E-03, -3.4034030E-04, -1.1564890E-05] },
      { tLo: 0.0, tHi: 1000.0, eLo: 0.0, eHi: 76.373, err: [-0.02, 0.02], d: [0.0000000E+00, 1.7057035E+01, -2.3301759E-01, 6.5435585E-03, -7.3562749E-05, -1.7896001E-06, 8.4036165E-08, -1.3735879E-09, 1.0629823E-11, -3.2447087E-14] },
    ],
  },
  J: {
    ref: [
      { lo: -210.0, hi: 760.0, c: [0.000000000000E+00, 0.503811878150E-01, 0.304758369300E-04, -0.856810657200E-07, 0.132281952950E-09, -0.170529583370E-12, 0.209480906970E-15, -0.125383953360E-18, 0.156317256970E-22] },
      { lo: 760.0, hi: 1200.0, c: [0.296456256810E+03, -0.149761277860E+01, 0.317871039240E-02, -0.318476867010E-05, 0.157208190040E-08, -0.306913690560E-12] },
    ],
    inv: [
      { tLo: -210.0, tHi: 0.0, eLo: -8.095, eHi: 0.0, err: [-0.05, 0.03], d: [0.0000000E+00, 1.9528268E+01, -1.2286185E+00, -1.0752178E+00, -5.9086933E-01, -1.7256713E-01, -2.8131513E-02, -2.3963370E-03, -8.3823321E-05] },
      { tLo: 0.0, tHi: 760.0, eLo: 0.0, eHi: 42.919, err: [-0.04, 0.04], d: [0.000000E+00, 1.978425E+01, -2.001204E-01, 1.036969E-02, -2.549687E-04, 3.585153E-06, -5.344285E-08, 5.099890E-10] },
      { tLo: 760.0, tHi: 1200.0, eLo: 42.919, eHi: 69.553, err: [-0.04, 0.03], d: [-3.11358187E+03, 3.00543684E+02, -9.94773230E+00, 1.70276630E-01, -1.43033468E-03, 4.73886084E-06] },
    ],
  },
  K: {
    ref: [
      { lo: -270.0, hi: 0.0, c: [0.000000000000E+00, 0.394501280250E-01, 0.236223735980E-04, -0.328589067840E-06, -0.499048287770E-08, -0.675090591730E-10, -0.574103274280E-12, -0.310888728940E-14, -0.104516093650E-16, -0.198892668780E-19, -0.163226974860E-22] },
      { lo: 0.0, hi: 1372.0, c: [-0.176004136860E-01, 0.389212049750E-01, 0.185587700320E-04, -0.994575928740E-07, 0.318409457190E-09, -0.560728448890E-12, 0.560750590590E-15, -0.320207200030E-18, 0.971511471520E-22, -0.121047212750E-25] },
    ],
    exp: [0.118597600000E+00, -0.118343200000E-03, 0.126968600000E+03],
    inv: [
      { tLo: -200.0, tHi: 0.0, eLo: -5.891, eHi: 0.0, err: [-0.02, 0.04], d: [0.0000000E+00, 2.5173462E+01, -1.1662878E+00, -1.0833638E+00, -8.9773540E-01, -3.7342377E-01, -8.6632643E-02, -1.0450598E-02, -5.1920577E-04] },
      { tLo: 0.0, tHi: 500.0, eLo: 0.0, eHi: 20.644, err: [-0.05, 0.04], d: [0.000000E+00, 2.508355E+01, 7.860106E-02, -2.503131E-01, 8.315270E-02, -1.228034E-02, 9.804036E-04, -4.413030E-05, 1.057734E-06, -1.052755E-08] },
      { tLo: 500.0, tHi: 1372.0, eLo: 20.644, eHi: 54.886, err: [-0.05, 0.06], d: [-1.318058E+02, 4.830222E+01, -1.646031E+00, 5.464731E-02, -9.650715E-04, 8.802193E-06, -3.110810E-08] },
    ],
  },
  N: {
    ref: [
      { lo: -270.0, hi: 0.0, c: [0.000000000000E+00, 0.261591059620E-01, 0.109574842280E-04, -0.938411115540E-07, -0.464120397590E-10, -0.263033577160E-11, -0.226534380030E-13, -0.760893007910E-16, -0.934196678350E-19] },
      { lo: 0.0, hi: 1300.0, c: [0.000000000000E+00, 0.259293946010E-01, 0.157101418800E-04, 0.438256272370E-07, -0.252611697940E-09, 0.643118193390E-12, -0.100634715190E-14, 0.997453389920E-18, -0.608632456070E-21, 0.208492293390E-24, -0.306821961510E-28] },
    ],
    inv: [
      { tLo: -200.0, tHi: 0.0, eLo: -3.99, eHi: 0.0, err: [-0.02, 0.03], d: [0.0000000E+00, 3.8436847E+01, 1.1010485E+00, 5.2229312E+00, 7.2060525E+00, 5.8488586E+00, 2.7754916E+00, 7.7075166E-01, 1.1582665E-01, 7.3138868E-03] },
      { tLo: 0.0, tHi: 600.0, eLo: 0.0, eHi: 20.613, err: [-0.02, 0.03], d: [0.00000E+00, 3.86896E+01, -1.08267E+00, 4.70205E-02, -2.12169E-06, -1.17272E-04, 5.39280E-06, -7.98156E-08] },
      { tLo: 600.0, tHi: 1300.0, eLo: 20.613, eHi: 47.513, err: [-0.04, 0.02], d: [1.972485E+01, 3.300943E+01, -3.915159E-01, 9.855391E-03, -1.274371E-04, 7.767022E-07] },
    ],
  },
  R: {
    ref: [
      { lo: -50.0, hi: 1064.18, c: [0.000000000000E+00, 0.528961729765E-02, 0.139166589782E-04, -0.238855693017E-07, 0.356916001063E-10, -0.462347666298E-13, 0.500777441034E-16, -0.373105886191E-19, 0.157716482367E-22, -0.281038625251E-26] },
      { lo: 1064.18, hi: 1664.5, c: [0.295157925316E+01, -0.252061251332E-02, 0.159564501865E-04, -0.764085947576E-08, 0.205305291024E-11, -0.293359668173E-15] },
      { lo: 1664.5, hi: 1768.1, c: [0.152232118209E+03, -0.268819888545E+00, 0.171280280471E-03, -0.345895706453E-07, -0.934633971046E-14] },
    ],
    inv: [
      { tLo: -50.0, tHi: 250.0, eLo: -0.226, eHi: 1.923, err: [-0.02, 0.02], d: [0.0000000E+00, 1.8891380E+02, -9.3835290E+01, 1.3068619E+02, -2.2703580E+02, 3.5145659E+02, -3.8953900E+02, 2.8239471E+02, -1.2607281E+02, 3.1353611E+01, -3.3187769E+00] },
      { tLo: 250.0, tHi: 1200.0, eLo: 1.923, eHi: 13.228, err: [-0.005, 0.005], d: [1.334584505E+01, 1.472644573E+02, -1.844024844E+01, 4.031129726E+00, -6.249428360E-01, 6.468412046E-02, -4.458750426E-03, 1.994710149E-04, -5.313401790E-06, 6.481976217E-08] },
      { tLo: 1064.0, tHi: 1664.5, eLo: 11.361, eHi: 19.739, err: [-0.0005, 0.001], d: [-8.199599416E+01, 1.553962042E+02, -8.342197663E+00, 4.279433549E-01, -1.191577910E-02, 1.492290091E-04] },
      { tLo: 1664.5, tHi: 1768.1, eLo: 19.739, eHi: 21.103, err: [-0.001, 0.002], d: [3.406177836E+04, -7.023729171E+03, 5.582903813E+02, -1.952394635E+01, 2.560740231E-01] },
    ],
  },
  S: {
    ref: [
      { lo: -50.0, hi: 1064.18, c: [0.000000000000E+00, 0.540313308631E-02, 0.125934289740E-04, -0.232477968689E-07, 0.322028823036E-10, -0.331465196389E-13, 0.255744251786E-16, -0.125068871393E-19, 0.271443176145E-23] },
      { lo: 1064.18, hi: 1664.5, c: [0.132900444085E+01, 0.334509311344E-02, 0.654805192818E-05, -0.164856259209E-08, 0.129989605174E-13] },
      { lo: 1664.5, hi: 1768.1, c: [0.146628232636E+03, -0.258430516752E+00, 0.163693574641E-03, -0.330439046987E-07, -0.943223690612E-14] },
    ],
    inv: [
      { tLo: -50.0, tHi: 250.0, eLo: -0.235, eHi: 1.874, err: [-0.02, 0.02], d: [0.00000000E+00, 1.84949460E+02, -8.00504062E+01, 1.02237430E+02, -1.52248592E+02, 1.88821343E+02, -1.59085941E+02, 8.23027880E+01, -2.34181944E+01, 2.79786260E+00] },
      { tLo: 250.0, tHi: 1200.0, eLo: 1.874, eHi: 11.95, err: [-0.01, 0.01], d: [1.291507177E+01, 1.466298863E+02, -1.534713402E+01, 3.145945973E+00, -4.163257839E-01, 3.187963771E-02, -1.291637500E-03, 2.183475087E-05, -1.447379511E-07, 8.211272125E-09] },
      { tLo: 1064.0, tHi: 1664.5, eLo: 10.332, eHi: 17.536, err: [-0.0002, 0.0002], d: [-8.087801117E+01, 1.621573104E+02, -8.536869453E+00, 4.719686976E-01, -1.441693666E-02, 2.081618890E-04] },
      { tLo: 1664.5, tHi: 1768.1, eLo: 17.536, eHi: 18.693, err: [-0.002, 0.002], d: [5.333875126E+04, -1.235892298E+04, 1.092657613E+03, -4.265693686E+01, 6.247205420E-01] },
    ],
  },
  T: {
    ref: [
      { lo: -270.0, hi: 0.0, c: [0.000000000000E+00, 0.387481063640E-01, 0.441944343470E-04, 0.118443231050E-06, 0.200329735540E-07, 0.901380195590E-09, 0.226511565930E-10, 0.360711542050E-12, 0.384939398830E-14, 0.282135219250E-16, 0.142515947790E-18, 0.487686622860E-21, 0.107955392700E-23, 0.139450270620E-26, 0.797951539270E-30] },
      { lo: 0.0, hi: 400.0, c: [0.000000000000E+00, 0.387481063640E-01, 0.332922278800E-04, 0.206182434040E-06, -0.218822568460E-08, 0.109968809280E-10, -0.308157587720E-13, 0.454791352900E-16, -0.275129016730E-19] },
    ],
    inv: [
      { tLo: -200.0, tHi: 0.0, eLo: -5.603, eHi: 0.0, err: [-0.02, 0.04], d: [0.0000000E+00, 2.5949192E+01, -2.1316967E-01, 7.9018692E-01, 4.2527777E-01, 1.3304473E-01, 2.0241446E-02, 1.2668171E-03] },
      { tLo: 0.0, tHi: 400.0, eLo: 0.0, eHi: 20.872, err: [-0.03, 0.03], d: [0.000000E+00, 2.592800E+01, -7.602961E-01, 4.637791E-02, -2.165394E-03, 6.048144E-05, -7.293422E-07] },
    ],
  },
};

const poly = (c: number[], x: number) => c.reduceRight((acc, k) => acc * x + k, 0);

/** 기준 함수가 정의된 온도 범위 */
export const tcTempRange = (type: TcType): [number, number] => {
  const r = TC[type].ref;
  return [r[0].lo, r[r.length - 1].hi];
};
/** mV → 온도로 얻는 온도 범위(NIST 역함수가 덮는 범위) */
export const tcInvTempRange = (type: TcType): [number, number] => {
  const v = TC[type].inv;
  return [Math.min(...v.map((x) => x.tLo)), Math.max(...v.map((x) => x.tHi))];
};
/** mV → 온도를 계산하는 전압 범위 = 역함수 온도 범위 양 끝의 기준 함수 값 */
export const tcEmfRange = (type: TcType): [number, number] => {
  const [lo, hi] = tcInvTempRange(type);
  return [emfRaw(type, lo), emfRaw(type, hi)];
};

function emfRaw(type: TcType, t: number): number {
  const d = TC[type];
  const r = d.ref.find((x) => t <= x.hi) ?? d.ref[d.ref.length - 1];
  let e = poly(r.c, t);
  if (d.exp && r.lo >= 0) {
    const [a0, a1, a2] = d.exp;
    e += a0 * Math.exp(a1 * (t - a2) ** 2);
  }
  return e;
}

/** 온도(°C) → 열기전력(mV, 냉접점 0 °C 기준) */
export function tcEmf(type: TcType, t: number, lang: Lang = "ko"): number {
  const [lo, hi] = tcTempRange(type);
  if (!Number.isFinite(t) || t < lo || t > hi)
    throw new Error(msg(lang, `${type}형 범위(${lo}~${hi} °C) 밖입니다`, `Outside the type ${type} range (${lo} to ${hi} °C)`));
  return emfRaw(type, t);
}

/** NIST 표는 mV 를 소수 셋째 자리(µV)로 반올림해 싣는다 — 표 끝값(예: T형 400 °C = 20.872 mV)이 기준 함수 값을 반올림 폭만큼 넘어도 받는다 */
export const TC_EMF_TOL = 0.0005;

const tcRangeError = (type: TcType, lo: number, hi: number, lang: Lang, what: { ko: string; en: string }) => {
  const [a, b] = tcInvTempRange(type);
  return new Error(
    msg(
      lang,
      `${type}형 ${what.ko} 범위(${lo.toFixed(3)}~${hi.toFixed(3)} mV, ${a}~${b} °C) 밖입니다`,
      `Outside the type ${type} ${what.en} range (${lo.toFixed(3)} to ${hi.toFixed(3)} mV, ${a} to ${b} °C)`,
    ),
  );
};

/** 열기전력(mV, 냉접점 0 °C 기준) → 온도(°C) */
export function tcTemperature(type: TcType, e: number, lang: Lang = "ko"): number {
  const [lo, hi] = tcEmfRange(type);
  if (!Number.isFinite(e) || e < lo - TC_EMF_TOL || e > hi + TC_EMF_TOL) throw tcRangeError(type, lo, hi, lang, { ko: "mV → 온도", en: "mV-to-temperature" });
  const v = TC[type].inv;
  const inv = v.find((x) => e <= x.eHi) ?? v[v.length - 1];
  const [tLo, tHi] = tcInvTempRange(type);
  // NIST 역함수 → 기준 함수에 맞춰 뉴턴법으로 다듬기
  let t = poly(inv.d, e);
  for (let i = 0; i < 50; i++) {
    t = Math.min(tHi, Math.max(tLo, t));
    const f = emfRaw(type, t) - e;
    const h = 1e-3;
    const d = (emfRaw(type, Math.min(tHi, t + h)) - emfRaw(type, Math.max(tLo, t - h))) / (Math.min(tHi, t + h) - Math.max(tLo, t - h));
    if (!(d > 0)) break;
    const step = f / d;
    t -= step;
    if (Math.abs(step) < 1e-9) break;
  }
  return Math.min(tHi, Math.max(tLo, t));
}

/** 측정 mV(냉접점 tCj °C) → 온도. E(t) = E측정 + E(tCj) */
export function tcFromMeasured(type: TcType, eMeasured: number, tCj: number, lang: Lang = "ko"): number {
  const eCj = tcEmf(type, tCj, lang);
  // 범위 오류는 사용자가 넣은 «측정 mV» 기준으로 알린다(냉접점 보정을 더한 값이 아니라)
  const [lo, hi] = tcEmfRange(type);
  const e = eMeasured + eCj;
  if (!Number.isFinite(e) || e < lo - TC_EMF_TOL || e > hi + TC_EMF_TOL)
    throw tcRangeError(type, lo - eCj, hi - eCj, lang, { ko: `측정 mV(냉접점 ${tCj} °C)`, en: `measured mV (cold junction ${tCj} °C)` });
  return tcTemperature(type, e, lang);
}

/** 온도 → 냉접점 tCj °C 에서 측정될 mV. E측정 = E(t) − E(tCj) */
export function tcMeasured(type: TcType, t: number, tCj: number, lang: Lang = "ko"): number {
  return tcEmf(type, t, lang) - tcEmf(type, tCj, lang);
}

// ---- 표
/** 범위를 step 간격으로(양 끝 포함) */
export function steps(lo: number, hi: number, step: number): number[] {
  const out: number[] = [];
  const first = Math.ceil(lo / step) * step;
  if (first > lo) out.push(lo);
  for (let t = first; t <= hi + 1e-9; t += step) out.push(Math.round(t * 1e6) / 1e6);
  if (out[out.length - 1] < hi) out.push(hi);
  return out;
}

/** 고정 소수점 표기 — 2진 오차로 138.5055 가 138.505 가 되지 않게 반올림하고, «-0.000» 은 «0.000» 으로 */
export function fixed(v: number, d: number): string {
  const k = 10 ** d;
  const s = (Math.round(v * k + (v >= 0 ? 1e-6 : -1e-6)) / k).toFixed(d);
  return /^-0\.?0*$/.test(s) ? s.slice(1) : s;
}
