// 웹 도구 «페룰·압착 단자 규격표» — 전선 단면적(mm²·AWG) → 페룰(봉형 단자) 칼라 색(DIN 46228-4 / 프랑스 색 체계),
// 링·Y 단자 이름(JST 식 «1.25-4») 고르기. 순수 함수·자료만(node --test). 화면은 views/FerrulesPage.astro.
// 근거(출처 확인한 값만 — 지어낸 값 없음):
//   페룰 색: de.wikipedia «Aderendhülse» 표(DIN 46228-4 열·프랑스 열, 0.5~50 mm²). DIN 0.75 회색·1.5 검정·2.5 파랑·35 빨강은
//     Würth DIN 46228-4 제품 목록, 프랑스 2.5 회색(DZ5CE025)·DIN 2.5 파랑(DZ5CE025D)·프랑스 4 주황(DZ5CE042)은 Schneider 목록으로도 맞춰 봤다.
//     0.14~0.34·70~120 mm² 는 DIN 46228-4 에 없는 «관용» 색이라 넣지 않는다.
//   AWG 대응: Weidmüller «Wire-end ferrules» 안내서의 Rated cross-section ↔ AWG 표(0.5↔20 … 50↔0), AWG 면적은 ASTM B258 식.
//   링 단자 전선 범위: JST 1.25(0.25~1.65 mm², AWG 22~16)·2(1.04~2.63, AWG 16~14)·5.5(2.6~6.6, AWG 12~10) — 배포처(RS) 목록.
// 피복 벗김 길이·체결 토크는 제조사·제품마다 달라 값을 넣지 않는다(«제조사 표 확인»).

export type Lang = "ko" | "en";
export interface T {
  ko: string;
  en: string;
}
const t = (ko: string, en: string): T => ({ ko, en });

export type Color = "white" | "grey" | "red" | "black" | "blue" | "yellow" | "orange" | "green" | "brown" | "ivory";

export const COLOR_NAME: Record<Color, T> = {
  white: t("흰색", "White"),
  grey: t("회색", "Grey"),
  red: t("빨강", "Red"),
  black: t("검정", "Black"),
  blue: t("파랑", "Blue"),
  yellow: t("노랑", "Yellow"),
  orange: t("주황", "Orange"),
  green: t("초록", "Green"),
  brown: t("갈색", "Brown"),
  ivory: t("상아색", "Ivory"),
};

/** 화면 색 견본(대략) */
export const COLOR_HEX: Record<Color, string> = {
  white: "#ffffff",
  grey: "#8c8c8c",
  red: "#d32f2f",
  black: "#1f1f1f",
  blue: "#1e63c4",
  yellow: "#f2c400",
  orange: "#f08a00",
  green: "#2e8b3a",
  brown: "#7a4a22",
  ivory: "#efe6c8",
};

export interface FerruleRow {
  mm2: number;
  /** Weidmüller 안내서의 대응 AWG(0 = 1/0) */
  awg: number;
  din: Color;
  fr: Color;
}

/** DIN 46228-4 색·프랑스 색 — 0.5~50 mm² */
export const FERRULES: FerruleRow[] = [
  { mm2: 0.5, awg: 20, din: "white", fr: "white" },
  { mm2: 0.75, awg: 18, din: "grey", fr: "blue" },
  { mm2: 1, awg: 17, din: "red", fr: "red" },
  { mm2: 1.5, awg: 16, din: "black", fr: "black" },
  { mm2: 2.5, awg: 14, din: "blue", fr: "grey" },
  { mm2: 4, awg: 12, din: "grey", fr: "orange" },
  { mm2: 6, awg: 10, din: "yellow", fr: "green" },
  { mm2: 10, awg: 8, din: "red", fr: "brown" },
  { mm2: 16, awg: 6, din: "blue", fr: "ivory" },
  { mm2: 25, awg: 4, din: "yellow", fr: "black" },
  { mm2: 35, awg: 2, din: "red", fr: "red" },
  { mm2: 50, awg: 0, din: "blue", fr: "blue" },
];

/** AWG → 면적 mm² (ASTM B258: d = 0.127 mm × 92^((36−n)/39)). 0 = 1/0, −1 = 2/0 … */
export function awgToMm2(n: number): number {
  const d = 0.127 * Math.pow(92, (36 - n) / 39);
  return (Math.PI / 4) * d * d;
}

/** AWG 표기 «1/0» 처럼 */
export const awgLabel = (n: number) => (n <= 0 ? `${1 - n}/0` : String(n));

/** 단면적(mm²)에 맞는 페룰 줄 — 표의 값과 정확히 같을 때만(0.5·0.75·1 …). 없으면 null */
export const ferruleByMm2 = (mm2: number) => FERRULES.find((r) => Math.abs(r.mm2 - mm2) < 1e-9) ?? null;

/** AWG 로 고른 페룰 줄(Weidmüller 대응표) — 없으면 null */
export const ferruleByAwg = (awg: number) => FERRULES.find((r) => r.awg === awg) ?? null;

/**
 * 색 → 해당 단면적 목록(체계별). 현장에서 «이 회색 페룰은 몇 mm²?» 를 볼 때 —
 * DIN 은 같은 색이 여러 굵기에 다시 쓰이므로(회색 0.75·4) 크기로 구분해야 한다.
 */
export function sizesByColor(sys: "din" | "fr", c: Color): number[] {
  return FERRULES.filter((r) => r[sys] === c).map((r) => r.mm2);
}

// ---- 링·Y 단자(JST 식 이름 «R1.25-4»: 전선 등급 1.25 · 나사 M4)

export interface LugClass {
  /** 이름 앞 숫자 */
  cls: "1.25" | "2" | "5.5";
  minMm2: number;
  maxMm2: number;
  awg: string;
  /** 절연 슬리브 색(배포처 목록의 JST 절연형 색) */
  sleeve: Color;
}

export const LUG_CLASSES: LugClass[] = [
  { cls: "1.25", minMm2: 0.25, maxMm2: 1.65, awg: "22–16", sleeve: "red" },
  { cls: "2", minMm2: 1.04, maxMm2: 2.63, awg: "16–14", sleeve: "blue" },
  { cls: "5.5", minMm2: 2.6, maxMm2: 6.6, awg: "12–10", sleeve: "yellow" },
];

/** 나사 지름(M) 선택지 — 이름의 «-4» = M4 */
export const STUDS = [3, 3.5, 4, 5, 6, 8] as const;

/** 단면적에 맞는 단자 등급(겹치는 범위는 둘 다) */
export const lugClassesFor = (mm2: number) => LUG_CLASSES.filter((c) => mm2 >= c.minMm2 - 1e-9 && mm2 <= c.maxMm2 + 1e-9);

/** 링 단자 이름(JST 식 «R1.25-4»). Y(fork) 단자는 등급·나사 크기를 같게 고르되 이름 붙이는 법이 제조사마다 달라 만들지 않는다 */
export const ringName = (cls: LugClass["cls"], stud: number) => `R${cls}-${stud}`;
