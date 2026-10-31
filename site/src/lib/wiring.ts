// 웹 도구 «배선도 만들기» — 상황(템플릿)과 입력 → 도형(diagramSvg.ts 의 Shape) + 확인 목록 + 경고.
// 화면 없이 계산만 한다(node --test 로 시험). 특정 장비의 실제 단자 번호는 데이터에 없으므로 그리지 않는다 — 일반 표기만.
// 근거:
//   MODBUS over serial line V1.02 (2006) — §3.3 D0(A)·D1(B)·Common 이름, §3.4.3 가지선 20 m, §3.4.5 종단(양 끝에만), §3.4.6 바이어스(한 곳), 국번 1~247(§2.2)
//   TI SLLA070D (2010) — 수신 문턱 ±200 mV, 대략 «bps × m ≤ 10^8», 권장 최대 약 1200 m, RS-422 은 드라이버 하나·먼 끝 종단
//   TLDP Serial-HOWTO §19·Text-Terminal-HOWTO §12 — DB9 핀 배치, 널 모뎀 결선(사이트 가이드 rs232-db9-null-modem 과 같음)
//   4-20mA: 옴의 법칙(V = I × R), 250 Ω → 1~5 V. 센서 선 색: IEC 60947-5-2 관례(갈색 +·파랑 0 V·검정 출력) — 제조사 데이터시트 확인
import type { Drawing, LegendItem, Shape, Ink } from "./diagramSvg.ts";
import { roughMaxLength } from "./rs485.ts";

export type Lang = "ko" | "en";
export type TemplateId = "rs485-2w" | "rs485-4w" | "rs232" | "4-20ma" | "npn-pnp" | "output";
export const TEMPLATES: TemplateId[] = ["rs485-2w", "rs485-4w", "rs232", "4-20ma", "npn-pnp", "output"];

export const TEMPLATE_NAME: Record<TemplateId, Record<Lang, string>> = {
  "rs485-2w": { ko: "RS-485 2선 멀티드롭", en: "RS-485 2-wire multidrop" },
  "rs485-4w": { ko: "RS-485 4선 / RS-422", en: "RS-485 4-wire / RS-422" },
  rs232: { ko: "RS-232 DB9", en: "RS-232 DB9" },
  "4-20ma": { ko: "4-20mA 트랜스미터 → PLC 아날로그 입력", en: "4-20 mA transmitter → PLC analog input" },
  "npn-pnp": { ko: "NPN/PNP 3선 센서 → PLC 입력", en: "NPN/PNP 3-wire sensor → PLC input" },
  output: { ko: "릴레이·TR 출력 → 부하", en: "Relay / transistor output → load" },
};

export type Level = "ok" | "info" | "warn" | "fault";
export interface Note {
  level: Level;
  text: string;
  /** 출처(짧게) */
  src?: string;
}
export interface Table {
  caption: string;
  head: string[];
  rows: string[][];
}
export interface WiringResult {
  drawing: Drawing;
  checks: Note[];
  warnings: Note[];
  tables: Table[];
}

const SRC_MODBUS = "Modbus over serial line V1.02";
const SRC_TI = "TI SLLA070D";
const SRC_TLDP = "TLDP Text-Terminal-HOWTO §12";

// ---------------------------------------------------------------- RS-485 2선

/** 단자 표기 — [D1(+, B) 쪽, D0(−, A) 쪽] */
export type LabelSet = "ab" | "d" | "trx" | "485" | "d10";
export const LABEL_SETS: Record<LabelSet, [string, string]> = {
  ab: ["B", "A"],
  d: ["D+", "D−"],
  trx: ["TRX+", "TRX−"],
  "485": ["485+", "485−"],
  d10: ["D1", "D0"],
};

export interface Rs485Device {
  name: string;
  unit: number;
  /** 장비 맵에서 고른 경우 — 그 장비가 받는 보율 목록·패리티(모르면 비움) */
  bauds?: number[];
  parity?: "none" | "even" | "odd";
  dataBits?: number;
  stopBits?: number;
  unitRange?: [number, number];
  /** 장비 맵 id(«ls-electric/g100») */
  ref?: string;
}

export interface Rs485Input {
  devices: Rs485Device[];
  conv: LabelSet;
  dev: LabelSet;
  lengthM: number;
  baud: number;
  parity: "none" | "even" | "odd";
  bias: boolean;
  /** 마스터 이름(기본 «PC + USB-RS485») */
  master?: string;
}

export const MAX_DEVICES = 8;
/** Modbus V1.02 §3.4.3: 9600 bps·AWG26 이상 굵기에서 최대 길이 */
export const MODBUS_MAX_M = 1000;

/** 1000~1200 m: TIA/TI 기준 안이지만 Modbus 규격 값(9600 bps·AWG26)은 넘음 */
function modbusLengthNote(len: number, t: (k: string, e: string) => string): Note {
  return {
    level: "warn",
    text: t(
      `길이 ${len} m — Modbus 규격은 9600 bps·AWG26 이상 굵기에서 최대 1000 m 입니다(TIA-485 일반값 1200 m 보다 짧음). 굵은 선을 쓰거나 중계기로 나눕니다.`,
      `${len} m — the Modbus spec allows at most 1000 m at 9600 bps with AWG26 or thicker (shorter than the general TIA-485 1200 m). Use thicker cable or split with a repeater.`,
    ),
    src: `${SRC_MODBUS} §3.4.3`,
  };
}
const BW = 136;
const GAP = 36;

const parityChar = (p?: string) => (p === "even" ? "E" : p === "odd" ? "O" : p === "none" ? "N" : "?");

/** 장비 하나의 통신 설정이 고른 값과 맞지 않는 점(장비 맵 값이 있을 때만) */
export function deviceMismatch(d: Rs485Device, baud: number, parity: string): ("baud" | "parity" | "unit")[] {
  const out: ("baud" | "parity" | "unit")[] = [];
  if (d.bauds?.length && !d.bauds.includes(baud)) out.push("baud");
  if (d.parity && d.parity !== parity) out.push("parity");
  if (d.unitRange && (d.unit < d.unitRange[0] || d.unit > d.unitRange[1])) out.push("unit");
  return out;
}

/** 같은 국번이 둘 이상인 국번 목록 */
export function duplicateUnits(units: number[]): number[] {
  const seen = new Map<number, number>();
  for (const u of units) seen.set(u, (seen.get(u) ?? 0) + 1);
  return [...seen].filter(([, c]) => c > 1).map(([u]) => u);
}

function clampDevices<T>(list: T[]): T[] {
  return list.slice(0, MAX_DEVICES);
}

export function rs485TwoWire(x: Rs485Input, lang: Lang): WiringResult {
  const ko = lang === "ko";
  const t = (k: string, e: string) => (ko ? k : e);
  const devs = clampDevices(x.devices.length ? x.devices : [{ name: t("장비 1", "Device 1"), unit: 1 }]);
  const nodes = [{ name: x.master || t("PC + USB-RS485", "PC + USB-RS485"), unit: 0 } as Rs485Device, ...devs];
  const left = 150;
  const w = left + nodes.length * (BW + GAP) + 80;
  const yBox = 30;
  const hBox = 78;
  const yT = yBox + hBox; // 단자 줄
  const yP = 190; // D1 (B, +)
  const yN = 222; // D0 (A, −)
  const yG = 254; // Common
  const S: Shape[] = [];
  const [cP, cN] = LABEL_SETS[x.conv];
  const [dP, dN] = LABEL_SETS[x.dev];
  const tx = (i: number) => left + i * (BW + GAP);
  const lastX = tx(nodes.length - 1) + BW - 10;
  const firstX = 40;
  // 버스 세 줄
  S.push({ k: "wire", pts: [[firstX + 50, yP], [lastX + 20, yP]], c: "dp" });
  S.push({ k: "wire", pts: [[firstX + 50, yN], [lastX + 20, yN]], c: "dn" });
  S.push({ k: "wire", pts: [[firstX + 90, yG], [lastX, yG]], c: "gnd", dash: true });
  nodes.forEach((d, i) => {
    const x0 = tx(i);
    const master = i === 0;
    const mm = master ? [] : deviceMismatch(d, x.baud, x.parity);
    const commTxt = !master && (d.bauds?.length || d.parity) ? `${d.bauds?.length ? (d.bauds.includes(x.baud) ? x.baud : d.bauds.join("/")) : "?"} ${d.dataBits ?? 8}${parityChar(d.parity)}${d.stopBits ?? 1}` : undefined;
    S.push({
      k: "box",
      x: x0,
      y: yBox,
      w: BW,
      h: hBox,
      title: d.name.slice(0, 22),
      sub: master ? t("마스터", "Master") : t(`국번 ${d.unit}`, `Slave ID ${d.unit}`),
      sub2: master ? (x.bias ? t("바이어스 켬(한 곳)", "Bias on (one place)") : undefined) : commTxt,
      stroke: mm.length ? "warn" : master ? "accent" : "line",
    });
    const xs = [x0 + 28, x0 + 68, x0 + 108];
    const labels = master ? [cP, cN, "SG"] : [dP, dN, "SG"];
    const ys = [yP, yN, yG];
    const cs: Ink[] = ["dp", "dn", "gnd"];
    xs.forEach((xx, j) => {
      S.push({ k: "wire", pts: [[xx, yT], [xx, ys[j]]], c: cs[j], dash: j === 2 });
      S.push({ k: "dot", x: xx, y: ys[j], c: cs[j] });
      S.push({ k: "term", x: xx, y: yT, label: labels[j], pos: "above" });
    });
  });
  // 종단 — 양 끝(변환기 쪽 = 왼쪽 끝, 마지막 장비 = 오른쪽 끝)
  const termL = firstX + 62;
  const termR = lastX + 14;
  for (const xx of [termL, termR]) {
    S.push({ k: "res", x1: xx, y1: yP, x2: xx, y2: yN, c: "ink" });
    S.push({ k: "dot", x: xx, y: yP, c: "dp" });
    S.push({ k: "dot", x: xx, y: yN, c: "dn" });
  }
  // 바이어스를 쓰면 Modbus V1.02 §3.4.5 는 150 Ω 또는 1 nF + 120 Ω 직렬(RC) 종단 — 순수 120 Ω 도 흔한 관례
  const termLabel = x.bias ? "150 Ω" : "120 Ω";
  for (const xx of [termL, termR]) {
    S.push({ k: "text", x: xx, y: yG + 26, t: termLabel, anchor: "middle", size: 11, bold: true });
    if (x.bias) S.push({ k: "text", x: xx, y: yG + 39, t: t("또는 1 nF+120 Ω", "or 1 nF+120 Ω"), anchor: "middle", size: 10, c: "muted" });
  }
  // 바이어스(변환기 쪽) — D1 풀업 → +5 V, D0 풀다운 → Common
  if (x.bias) {
    const bx = firstX + 22;
    S.push({ k: "res", x1: bx, y1: yP, x2: bx, y2: yP - 62, c: "pwr" });
    S.push({ k: "text", x: bx, y: yP - 68, t: "+5 V", anchor: "middle", size: 11, c: "pwr", bold: true });
    S.push({ k: "wire", pts: [[bx, yP], [firstX + 50, yP]], c: "dp" });
    S.push({ k: "res", x1: bx - 14, y1: yN, x2: bx - 14, y2: yG, c: "gnd" });
    S.push({ k: "wire", pts: [[bx - 14, yN], [firstX + 50, yN]], c: "dn" });
    S.push({ k: "wire", pts: [[bx - 14, yG], [firstX + 90, yG]], c: "gnd", dash: true });
    S.push({ k: "dot", x: firstX + 50, y: yP, c: "dp" });
    S.push({ k: "dot", x: firstX + 50, y: yN, c: "dn" });
    S.push({ k: "text", x: 8, y: yG + 26, t: t("바이어스", "Bias"), size: 11, c: "muted" });
  }
  // 줄 이름
  S.push({ k: "text", x: lastX + 26, y: yP + 4, t: "D1 (B, +)", size: 11, c: "dp" });
  S.push({ k: "text", x: lastX + 26, y: yN + 4, t: "D0 (A, −)", size: 11, c: "dn" });
  S.push({ k: "text", x: lastX + 6, y: yG + 4, t: "Common", size: 11, c: "gnd" });
  const len = x.lengthM;
  S.push({
    k: "text",
    x: (left + lastX) / 2,
    y: yG + (x.bias ? 56 : 48),
    t: t(`데이지 체인 — 전체 길이 약 ${len} m · ${x.baud} bps ${8}${parityChar(x.parity)}1`, `Daisy chain — total length about ${len} m · ${x.baud} bps 8${parityChar(x.parity)}1`),
    anchor: "middle",
    size: 12,
    c: "muted",
  });
  const legend: LegendItem[] = [
    { c: "dp", label: t("D1 (B, +) — 꼬임쌍선 한 가닥", "D1 (B, +) — one wire of the twisted pair") },
    { c: "dn", label: t("D0 (A, −) — 같은 쌍의 다른 가닥", "D0 (A, −) — the other wire of the pair") },
    { c: "gnd", label: t("Common(SG·신호 접지)", "Common (SG, signal ground)"), dash: true },
  ];
  if (x.bias) legend.push({ c: "pwr", label: t("바이어스 풀업(+5 V)", "Bias pull-up (+5 V)") });

  const units = devs.map((d) => d.unit);
  const warnings: Note[] = [];
  const maxLen = roughMaxLength(x.baud);
  if (len > 1200) warnings.push({ level: "fault", text: t(`길이 ${len} m — 일반적으로 RS-485 한 구간은 약 1200 m 까지입니다. 중계기(리피터)로 나눕니다.`, `${len} m — one RS-485 segment is generally limited to about 1200 m. Split it with a repeater.`), src: SRC_TI });
  else if (len > maxLen) warnings.push({ level: "warn", text: t(`${x.baud} bps 에서 대략 한계는 약 ${Math.round(maxLen)} m 입니다(경험칙 bps × m ≤ 10⁸). 보율을 낮추거나 길이를 줄입니다.`, `At ${x.baud} bps the rough limit is about ${Math.round(maxLen)} m (rule of thumb bps × m ≤ 10⁸). Lower the baud rate or shorten the line.`), src: SRC_TI });
  else if (len > MODBUS_MAX_M) warnings.push(modbusLengthNote(len, t));
  for (const u of duplicateUnits(units)) warnings.push({ level: "fault", text: t(`국번 ${u} 이(가) 겹칩니다 — 같은 버스에서는 국번이 모두 달라야 합니다.`, `Slave ID ${u} is used twice — every ID on one bus must be different.`), src: SRC_MODBUS });
  for (const d of devs) {
    if (!(d.unit >= 1 && d.unit <= 247)) warnings.push({ level: "warn", text: t(`«${d.name}» 국번 ${d.unit} — Modbus 국번은 1~247 입니다.`, `«${d.name}» ID ${d.unit} — Modbus slave IDs are 1–247.`), src: SRC_MODBUS });
    for (const m of deviceMismatch(d, x.baud, x.parity)) {
      if (m === "baud") warnings.push({ level: "warn", text: t(`«${d.name}» 는 장비 맵 기준 ${d.bauds!.join("·")} bps 만 받습니다.`, `«${d.name}» supports only ${d.bauds!.join(", ")} bps per the device map.`) });
      if (m === "parity") warnings.push({ level: "warn", text: t(`«${d.name}» 의 기본 패리티는 ${parityChar(d.parity)} 입니다 — 버스 전체가 같은 설정이어야 합니다(장비에서 바꿀 수 있는지 매뉴얼 확인).`, `«${d.name}» defaults to parity ${parityChar(d.parity)} — the whole bus needs one setting (check whether the device can change it).`) });
      if (m === "unit") warnings.push({ level: "warn", text: t(`«${d.name}» 의 국번 범위는 ${d.unitRange![0]}~${d.unitRange![1]} 입니다.`, `«${d.name}» accepts IDs ${d.unitRange![0]}–${d.unitRange![1]}.`) });
    }
  }
  if (x.conv !== x.dev) warnings.push({ level: "info", text: t(`변환기 표기(${cP}/${cN})와 장비 표기(${dP}/${dN})가 다릅니다 — 이름이 아니라 같은 신호(D1끼리, D0끼리)를 잇습니다.`, `The adapter (${cP}/${cN}) and devices (${dP}/${dN}) use different names — connect the same signal (D1 to D1, D0 to D0), not the same letter.`) });
  if (x.devices.length > MAX_DEVICES) warnings.push({ level: "info", text: t(`그림에는 ${MAX_DEVICES}대까지만 그립니다.`, `Only ${MAX_DEVICES} devices are drawn.`) });

  const last = devs[devs.length - 1].name;
  const checks: Note[] = [
    x.bias
      ? { level: "info", text: t(`종단은 선로 양 끝 두 곳(여기서는 변환기와 «${last}»)에만 답니다. 바이어스를 쓸 때 Modbus 규격은 150 Ω(0.5 W) 또는 1 nF + 120 Ω 직렬(0.25 W, RC 종단 — 쉬는 동안 바이어스 전류를 덜 먹음)을 권합니다. 120 Ω 만 다는 것도 흔한 관례입니다. 장비에 종단 스위치가 있으면 그것을 켜고 외부 저항은 겹쳐 달지 않습니다.`, `Terminate only at the two ends of the line (here the adapter and «${last}»). With biasing the Modbus spec recommends 150 Ω (0.5 W) or 1 nF + 120 Ω in series (0.25 W, RC termination — it draws less bias current at idle); a plain 120 Ω is also common practice. If a device has a termination switch, use it instead of adding an external resistor.`), src: `${SRC_MODBUS} §3.4.5` }
      : { level: "info", text: t(`종단 120 Ω 은 선로 양 끝 두 곳(여기서는 변환기와 «${last}»)에만 답니다. 장비에 종단 스위치가 있으면 그것을 켜고 외부 저항은 겹쳐 달지 않습니다.`, `120 Ω termination only at the two ends of the line (here the adapter and «${last}»). If a device has a termination switch, use it instead of adding an external resistor.`), src: `${SRC_MODBUS} §3.4.5` },
    { level: "info", text: t("바이어스(페일세이프)는 버스 전체에 한 곳만 — 보통 마스터(변환기) 쪽 스위치나 점퍼로 켭니다. 바이어스를 쓰면 Modbus 규격은 최대 장비 수를 4대 줄여 봅니다(32 → 28).", "Bias (failsafe) at one place for the whole bus — usually the master (adapter) side switch or jumper. With biasing the Modbus spec lowers the maximum number of devices by 4 (32 → 28)."), src: `${SRC_MODBUS} §3.4.6` },
    { level: "info", text: t("장비는 한 줄로 차례로(데이지 체인) 잇습니다. 한 점에서 여러 갈래로 뻗는 스타 배선은 쓰지 않고, 가지선은 20 m 이하로 짧게 합니다.", "Chain the devices one after another (daisy chain). Do not wire a star from one point; keep stubs under 20 m."), src: `${SRC_MODBUS} §3.4.3` },
    { level: "info", text: t("Common(SG)을 세 번째 선으로 함께 잇습니다 — 장비끼리 접지 전위가 다르면 통신이 끊기거나 장비가 상할 수 있습니다.", "Run Common (SG) as a third wire — ground potential differences between devices can break communication or damage devices."), src: `${SRC_MODBUS} §3.3` },
    { level: "warn", text: t("A/B 극성은 제조사마다 반대로 표기하기도 합니다 — 응답이 전혀 없으면 두 선을 바꿔 봅니다(극성이 반대여도 장비는 상하지 않음).", "A/B naming is reversed by some vendors — if nothing answers, swap the two wires (reversed polarity does not damage devices).") },
    { level: "info", text: t("그림의 단자 이름은 일반 표기입니다. 실제 단자 번호·위치는 장비 매뉴얼의 단자 번호를 확인합니다.", "Terminal names here are generic. Check the terminal numbers in each device manual.") },
    { level: "info", text: t("보율·데이터 비트·패리티·정지 비트는 버스의 모든 장비가 같아야 하고, 국번(1~247)은 겹치지 않아야 합니다.", "Baud, data bits, parity and stop bits must match on every device; slave IDs (1–247) must be unique."), src: SRC_MODBUS },
    { level: "info", text: t("일반적으로 표준 송수신기 기준 중계기 없이 32대(단위 부하)까지입니다.", "Generally up to 32 unit loads per segment without a repeater with standard transceivers."), src: `${SRC_MODBUS} §3.4` },
  ];
  return { drawing: { w, h: yG + 64, title: TEMPLATE_NAME["rs485-2w"][lang], shapes: S, legend }, checks, warnings, tables: [] };
}

// ---------------------------------------------------------------- RS-485 4선 / RS-422

export type FourLabel = "txrx" | "modbus";
export const FOUR_LABELS: Record<FourLabel, { tp: string; tn: string; rp: string; rn: string }> = {
  txrx: { tp: "TX+", tn: "TX−", rp: "RX+", rn: "RX−" },
  modbus: { tp: "TXD1", tn: "TXD0", rp: "RXD1", rn: "RXD0" },
};

export interface FourWireInput {
  devices: Rs485Device[];
  labels: FourLabel;
  lengthM: number;
  baud: number;
  parity: "none" | "even" | "odd";
  master?: string;
}

export function rs485FourWire(x: FourWireInput, lang: Lang): WiringResult {
  const ko = lang === "ko";
  const t = (k: string, e: string) => (ko ? k : e);
  const devs = clampDevices(x.devices.length ? x.devices : [{ name: t("장비 1", "Device 1"), unit: 1 }]);
  const nodes = [{ name: x.master || "PC + USB-RS422/485", unit: 0 } as Rs485Device, ...devs];
  const L = FOUR_LABELS[x.labels];
  const left = 60;
  const bw = 156;
  const w = left + nodes.length * (bw + GAP) + 110;
  const yBox = 30;
  const hBox = 78;
  const yT = yBox + hBox;
  const ys = [180, 206, 244, 270, 304]; // 쌍1 +,−(마스터 → 장비), 쌍2 +,−(장비 → 마스터), Common
  const cs: Ink[] = ["dp", "dn", "aux", "loop", "gnd"];
  const S: Shape[] = [];
  const tx = (i: number) => left + i * (bw + GAP);
  const lastX = tx(nodes.length - 1) + bw - 6;
  ys.forEach((y, j) => S.push({ k: "wire", pts: [[tx(0) + 16, y], [lastX + 30, y]], c: cs[j], dash: j === 4 }));
  nodes.forEach((d, i) => {
    const x0 = tx(i);
    const master = i === 0;
    S.push({ k: "box", x: x0, y: yBox, w: bw, h: hBox, title: d.name.slice(0, 24), sub: master ? t("마스터", "Master") : t(`국번 ${d.unit}`, `Slave ID ${d.unit}`), stroke: master ? "accent" : "line" });
    // 마스터: TX± → 쌍1, RX± → 쌍2. 장비: RX± → 쌍1, TX± → 쌍2 (보내는 쪽 ↔ 받는 쪽 교차)
    const labels = master ? [L.tp, L.tn, L.rp, L.rn, "SG"] : [L.rp, L.rn, L.tp, L.tn, "SG"];
    labels.forEach((lb, j) => {
      const xx = x0 + 18 + j * 30;
      S.push({ k: "wire", pts: [[xx, yT], [xx, ys[j]]], c: cs[j], dash: j === 4 });
      S.push({ k: "dot", x: xx, y: ys[j], c: cs[j] });
      S.push({ k: "term", x: xx, y: yT, label: lb, pos: "above" });
    });
  });
  // 종단: Modbus 4선(V1.02 §3.4.5 «In a 4W-system, each pair must be terminated at each end of the bus») — 두 쌍 모두 양 끝
  const tR = lastX + 20;
  const tL = tx(0) + 8;
  for (const [xx, a, b] of [[tR, 0, 1], [tR, 2, 3], [tL, 0, 1], [tL, 2, 3]] as const) {
    S.push({ k: "res", x1: xx, y1: ys[a], x2: xx, y2: ys[b] });
    S.push({ k: "dot", x: xx, y: ys[a], c: cs[a] });
    S.push({ k: "dot", x: xx, y: ys[b], c: cs[b] });
  }
  for (const j of [0, 1, 2, 3]) S.push({ k: "wire", pts: [[tL, ys[j]], [tx(0) + 16, ys[j]]], c: cs[j] });
  S.push({ k: "text", x: tR + 8, y: ys[1] + 18, t: "120 Ω", size: 11, bold: true });
  S.push({ k: "text", x: tR + 8, y: ys[3] + 18, t: "120 Ω", size: 11, bold: true });
  S.push({ k: "text", x: tL - 4, y: ys[1] + 18, t: "120 Ω", size: 11, bold: true, anchor: "end" });
  S.push({ k: "text", x: tL - 4, y: ys[3] + 18, t: "120 Ω", size: 11, bold: true, anchor: "end" });
  S.push({ k: "text", x: (tx(0) + lastX) / 2, y: ys[4] + 30, t: t(`위 쌍: 마스터 → 장비 · 아래 쌍: 장비 → 마스터 — 약 ${x.lengthM} m · ${x.baud} bps`, `Upper pair: master → devices · lower pair: devices → master — about ${x.lengthM} m · ${x.baud} bps`), anchor: "middle", size: 12, c: "muted" });
  const legend: LegendItem[] = [
    { c: "dp", label: t(`${L.tp} → ${L.rp} (마스터 송신 +)`, `${L.tp} → ${L.rp} (master transmit +)`) },
    { c: "dn", label: t(`${L.tn} → ${L.rn} (마스터 송신 −)`, `${L.tn} → ${L.rn} (master transmit −)`) },
    { c: "aux", label: t(`장비 ${L.tp} → 마스터 ${L.rp}`, `device ${L.tp} → master ${L.rp}`) },
    { c: "loop", label: t(`장비 ${L.tn} → 마스터 ${L.rn}`, `device ${L.tn} → master ${L.rn}`) },
    { c: "gnd", label: "Common (SG)", dash: true },
  ];
  const warnings: Note[] = [];
  const maxLen = roughMaxLength(x.baud);
  if (x.lengthM > 1200) warnings.push({ level: "fault", text: t(`길이 ${x.lengthM} m — 일반적으로 한 구간은 약 1200 m 까지입니다.`, `${x.lengthM} m — one segment is generally limited to about 1200 m.`), src: SRC_TI });
  else if (x.lengthM > maxLen) warnings.push({ level: "warn", text: t(`${x.baud} bps 에서 대략 한계는 약 ${Math.round(maxLen)} m 입니다.`, `At ${x.baud} bps the rough limit is about ${Math.round(maxLen)} m.`), src: SRC_TI });
  else if (x.lengthM > MODBUS_MAX_M) warnings.push(modbusLengthNote(x.lengthM, t));
  for (const u of duplicateUnits(devs.map((d) => d.unit))) warnings.push({ level: "fault", text: t(`국번 ${u} 이(가) 겹칩니다.`, `Slave ID ${u} is used twice.`), src: SRC_MODBUS });
  for (const d of devs) for (const m of deviceMismatch(d, x.baud, x.parity)) warnings.push({ level: "warn", text: t(`«${d.name}» 통신 설정(${m === "baud" ? "보율" : m === "parity" ? "패리티" : "국번 범위"})이 장비 맵 값과 다릅니다.`, `«${d.name}»: ${m === "baud" ? "baud rate" : m === "parity" ? "parity" : "ID range"} differs from the device map.`) });
  const checks: Note[] = [
    { level: "info", text: t("송신 쌍과 수신 쌍을 엇갈려 잇습니다 — 마스터의 TX± 는 장비의 RX± 로, 장비의 TX± 는 마스터의 RX± 로.", "Cross the pairs — master TX± to device RX±, device TX± to master RX±.") },
    { level: "info", text: t("한 쌍은 한 꼬임쌍선으로(+ 와 − 를 같은 쌍에). 두 쌍을 서로 다른 꼬임쌍으로 나눕니다.", "Keep + and − of each signal on the same twisted pair; use two separate pairs.") },
    { level: "info", text: t("Modbus 4선은 두 쌍 모두 버스 양 끝에서 종단합니다(그림). 드라이버가 하나뿐인 RS-422 점대점은 그 쌍을 먼 끝(받는 쪽)만 종단하기도 합니다 — 장비 매뉴얼을 따릅니다.", "In 4-wire Modbus each pair is terminated at both ends of the bus (as drawn). A point-to-point RS-422 link with a single driver is sometimes terminated only at the far (receiving) end of that pair — follow the device manual."), src: `${SRC_MODBUS} §3.4.5` },
    { level: "info", text: t("장비 여럿이 보내는 쌍(아래 쌍)에는 쉬는 동안을 위한 바이어스를 마스터 쪽 한 곳에 둡니다.", "Bias the pair several devices drive (lower pair) at one place on the master side."), src: `${SRC_MODBUS} §3.4.6` },
    { level: "info", text: t("변환기를 4선(전이중) 모드로 둡니다 — 2선/4선 스위치·점퍼가 있는 변환기가 많습니다.", "Set the adapter to 4-wire (full duplex) mode — many have a 2-wire/4-wire switch or jumper.") },
    { level: "warn", text: t("+/− 표기와 TX/RX 기준(자기 기준인지 상대 기준인지)은 제조사마다 다릅니다 — 장비 매뉴얼의 단자 번호를 확인합니다.", "+/− naming and whether TX/RX are named from the device's own side vary by vendor — check the manual's terminal numbers.") },
    { level: "info", text: t("Common(SG)을 함께 잇습니다.", "Connect Common (SG) as well."), src: `${SRC_MODBUS} §3.3` },
  ];
  return { drawing: { w, h: ys[4] + 44, title: TEMPLATE_NAME["rs485-4w"][lang], shapes: S, legend }, checks, warnings, tables: [] };
}

// ---------------------------------------------------------------- RS-232 DB9

export type Rs232Mode = "null3" | "nullFull" | "straight";
export interface Rs232Input {
  mode: Rs232Mode;
  /** 3선 널 모뎀에서 커넥터 안 자기 잇기(RTS–CTS, DTR–DSR–DCD) */
  loopback?: boolean;
}

export const DB9 = [
  { pin: 1, sig: "DCD" },
  { pin: 2, sig: "RxD" },
  { pin: 3, sig: "TxD" },
  { pin: 4, sig: "DTR" },
  { pin: 5, sig: "GND" },
  { pin: 6, sig: "DSR" },
  { pin: 7, sig: "RTS" },
  { pin: 8, sig: "CTS" },
  { pin: 9, sig: "RI" },
] as const;

/** 이쪽 핀 → 저쪽 핀들 — [이쪽, 저쪽, 용도] */
export function rs232Pairs(mode: Rs232Mode): { a: number; b: number; use: "data" | "gnd" | "flow" | "modem" }[] {
  if (mode === "straight") return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((p) => ({ a: p, b: p, use: p === 2 || p === 3 ? "data" : p === 5 ? "gnd" : p === 7 || p === 8 ? "flow" : "modem" }));
  const base = [
    { a: 3, b: 2, use: "data" as const },
    { a: 2, b: 3, use: "data" as const },
    { a: 5, b: 5, use: "gnd" as const },
  ];
  if (mode === "null3") return base;
  return [
    ...base,
    { a: 7, b: 8, use: "flow" as const },
    { a: 8, b: 7, use: "flow" as const },
    { a: 4, b: 6, use: "modem" as const },
    { a: 4, b: 1, use: "modem" as const },
    { a: 6, b: 4, use: "modem" as const },
    { a: 1, b: 4, use: "modem" as const },
  ];
}

export function rs232(x: Rs232Input, lang: Lang): WiringResult {
  const ko = lang === "ko";
  const t = (k: string, e: string) => (ko ? k : e);
  const S: Shape[] = [];
  const w = 760;
  const boxW = 170;
  const xa = 40;
  const xb = w - 40 - boxW;
  const y0 = 30;
  const rowH = 26;
  const pinY = (p: number) => y0 + 52 + (p - 1) * rowH;
  const right = x.mode === "straight" ? t("장비 (DCE)", "Device (DCE)") : t("장비 (DTE)", "Device (DTE)");
  S.push({ k: "box", x: xa, y: y0, w: boxW, h: 52 + 9 * rowH, title: t("PC (DTE) DB9", "PC (DTE) DB9"), sub: t("수 커넥터", "male connector"), stroke: "accent" });
  S.push({ k: "box", x: xb, y: y0, w: boxW, h: 52 + 9 * rowH, title: `${right} DB9`, sub: t("매뉴얼 핀 표 확인", "check the manual's pin table") });
  const color = (u: string): Ink => (u === "data" ? "dp" : u === "gnd" ? "gnd" : u === "flow" ? "aux" : "dn");
  const pairs = rs232Pairs(x.mode);
  for (const { pin, sig } of DB9) {
    const y = pinY(pin);
    S.push({ k: "term", x: xa + boxW, y, label: `${pin} ${sig}`, pos: "left" });
    S.push({ k: "term", x: xb, y, label: `${pin} ${sig}`, pos: "right" });
  }
  // 선 — 양쪽 커넥터 앞은 가로, 가운데는 비스듬히(널 모뎀의 X 모양). 스트레이트는 곧은 가로선
  const xL = xa + boxW + 56;
  const xR = xb - 56;
  for (const p of pairs) {
    const c = color(p.use);
    S.push({ k: "wire", pts: [[xa + boxW, pinY(p.a)], [xL, pinY(p.a)], [xR, pinY(p.b)], [xb, pinY(p.b)]], c, dash: p.use === "flow" || p.use === "modem" });
  }
  if (x.mode === "null3" && x.loopback) {
    // 커넥터 안에서 자기 RTS–CTS, DTR–DSR–DCD 잇기(양쪽)
    for (const [side, xx] of [["a", xa + boxW + 14], ["b", xb - 14]] as const) {
      const outer = side === "a" ? xa + boxW : xb;
      S.push({ k: "wire", pts: [[outer, pinY(7)], [xx, pinY(7)], [xx, pinY(8)], [outer, pinY(8)]], c: "aux", dash: true, w: 1.8 });
      const xx2 = side === "a" ? xx + 10 : xx - 10;
      S.push({ k: "wire", pts: [[outer, pinY(4)], [xx2, pinY(4)], [xx2, pinY(1)], [outer, pinY(1)]], c: "dn", dash: true, w: 1.8 });
      S.push({ k: "wire", pts: [[xx2, pinY(4)], [xx2, pinY(6)], [outer, pinY(6)]], c: "dn", dash: true, w: 1.8 });
    }
  }
  const h = y0 + 52 + 9 * rowH + 30;
  const modeName = x.mode === "straight" ? t("스트레이트(DTE ↔ DCE)", "Straight (DTE ↔ DCE)") : x.mode === "null3" ? t("널 모뎀 3선(핸드셰이크 없음)", "Null modem, 3 wires (no handshake)") : t("널 모뎀(RTS/CTS·DTR/DSR 포함)", "Null modem (with RTS/CTS, DTR/DSR)");
  S.push({ k: "text", x: w / 2, y: h - 8, t: modeName, anchor: "middle", size: 12, c: "muted" });
  const legend: LegendItem[] = [
    { c: "dp", label: t("데이터 TxD → RxD", "Data TxD → RxD") },
    { c: "gnd", label: t("신호 접지 5", "Signal ground 5") },
  ];
  if (x.mode !== "null3" || x.loopback) legend.push({ c: "aux", label: t("흐름 제어 RTS/CTS", "Flow control RTS/CTS"), dash: true }, { c: "dn", label: t("모뎀 제어 DTR/DSR/DCD", "Modem control DTR/DSR/DCD"), dash: true });
  const use = (u: string) => (u === "data" ? t("데이터", "Data") : u === "gnd" ? t("신호 접지", "Signal ground") : u === "flow" ? t("하드웨어 흐름 제어", "Hardware flow control") : t("모뎀 제어", "Modem control"));
  const sig = (p: number) => `${p} ${DB9[p - 1].sig}`;
  const tables: Table[] = [
    {
      caption: t("결선 표", "Wiring table"),
      head: [t("PC 쪽 핀", "PC pin"), t("장비 쪽 핀", "Device pin"), t("용도", "Use")],
      rows: pairs.map((p) => [sig(p.a), sig(p.b), use(p.use)]),
    },
    {
      caption: t("DB9 핀 배치 (DTE 기준, TIA-574)", "DB9 pinout (DTE side, TIA-574)"),
      head: [t("핀", "Pin"), t("신호", "Signal"), t("PC(DTE) 에서", "At the PC (DTE)")],
      rows: DB9.map(({ pin, sig: s }) => [String(pin), s, pin === 5 ? "—" : [3, 4, 7].includes(pin) ? t("출력", "Output") : t("입력", "Input")]),
    },
  ];
  const checks: Note[] = [
    { level: "info", text: t("상대 장비 매뉴얼의 핀 표에서 2번이 송신인지 수신인지 봅니다. 3번이 송신이면 PC 와 같은 DTE 배치라 널 모뎀(크로스), 2번이 송신이면 스트레이트입니다.", "In the device manual's pin table, see whether pin 2 transmits or receives. If pin 3 transmits it is a DTE like the PC (use a null modem); if pin 2 transmits, use a straight cable."), src: "TLDP Serial-HOWTO §19" },
    { level: "info", text: t("5번(GND)은 반드시 잇습니다 — 빠지면 글자가 깨지거나 아무것도 오지 않습니다.", "Always connect pin 5 (GND) — without it bytes are garbled or nothing arrives.") },
    { level: "info", text: t("흐름 제어를 쓰지 않으면(통신 프로그램 «없음») TxD·RxD·GND 세 선이면 됩니다.", "Without flow control (\"None\" in the terminal program) three wires — TxD, RxD, GND — are enough."), src: SRC_TLDP },
    { level: "info", text: t("하드웨어 흐름 제어(RTS/CTS)를 켰다면 7·8번도 엇갈려 잇습니다. 켰는데 CTS 선이 없으면 송신이 막힙니다.", "With hardware flow control (RTS/CTS), cross pins 7 and 8 too. Enabled without a CTS wire, transmission stalls."), src: SRC_TLDP },
    { level: "info", text: t("루프백 시험: PC 쪽 커넥터의 2번과 3번을 이어 보낸 바이트가 돌아오면 PC 포트·변환기는 동작합니다.", "Loopback test: tie pins 2 and 3 at the PC connector; if bytes come back, the port and adapter work.") },
    { level: "info", text: t("시중 케이블은 결선이 다른 것도 있습니다 — 케이블 결선도와 장비 매뉴얼의 단자 번호를 확인합니다.", "Commercial cables are not all wired alike — check the cable diagram and the device manual's pin numbers.") },
  ];
  return { drawing: { w, h, title: `${TEMPLATE_NAME.rs232[lang]} — ${modeName}`, shapes: S, legend }, checks, warnings: [], tables };
}

// ---------------------------------------------------------------- 4-20mA

export type LoopKind = "2w" | "3w" | "4w";
export interface LoopInput {
  kind: LoopKind;
  supplyV: number;
  rRecv: number;
}

/** 수신 저항 양단 전압(V) — 4·8·12·16·20 mA */
export const loopRows = (rRecv: number) => [4, 8, 12, 16, 20].map((mA) => ({ mA, v: (mA / 1000) * rRecv }));

/** 2선식: 20 mA 일 때 트랜스미터에 남는 전압(케이블 저항 제외) */
export const txHeadroom = (supplyV: number, rRecv: number, mA = 20) => supplyV - (mA / 1000) * rRecv;

const fx = (v: number, d = 2) => {
  const s = v.toFixed(d);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
};

export function loop420(x: LoopInput, lang: Lang): WiringResult {
  const ko = lang === "ko";
  const t = (k: string, e: string) => (ko ? k : e);
  const S: Shape[] = [];
  const w = 760;
  // 상자: 전원(왼쪽 아래), 트랜스미터(왼쪽 위), PLC AI(오른쪽)
  const ps = { x: 40, y: 200, w: 170, h: 90 };
  const tx = { x: 40, y: 30, w: 170, h: 100 };
  const ai = { x: 500, y: 60, w: 210, h: 200 };
  S.push({ k: "box", ...ps, title: t("직류 전원 24 V", "24 V DC supply").replace("24", fx(x.supplyV)), sub: "+  /  0 V" });
  const kindName = x.kind === "2w" ? t("2선식(루프 전원)", "2-wire (loop powered)") : x.kind === "3w" ? t("3선식", "3-wire") : t("4선식(전원 별도)", "4-wire (separately powered)");
  S.push({ k: "box", ...tx, title: t("트랜스미터", "Transmitter"), sub: kindName });
  S.push({ k: "box", ...ai, title: t("PLC 아날로그 입력", "PLC analog input"), sub: t("전류 입력 채널", "current input channel"), stroke: "accent" });
  const aiP = { x: ai.x, y: ai.y + 70 };
  const aiN = { x: ai.x, y: ai.y + 160 };
  // 단자 이름은 선 위에(입력 안 선과 겹치지 않게)
  S.push({ k: "term", x: aiP.x, y: aiP.y, label: "", pos: "right" });
  S.push({ k: "term", x: aiN.x, y: aiN.y, label: "", pos: "right" });
  S.push({ k: "text", x: aiP.x + 10, y: aiP.y - 7, t: "AI+ (I+)", size: 11, bold: true });
  S.push({ k: "text", x: aiN.x + 10, y: aiN.y - 7, t: "AI− (COM)", size: 11, bold: true });
  // 수신 저항 — 입력 안
  const rx = ai.x + 140;
  S.push({ k: "wire", pts: [[aiP.x, aiP.y], [rx, aiP.y]], c: "loop", w: 1.8 });
  S.push({ k: "res", x1: rx, y1: aiP.y, x2: rx, y2: aiN.y, label: `${fx(x.rRecv, 1)} Ω`, c: "loop" });
  S.push({ k: "wire", pts: [[rx, aiN.y], [aiN.x, aiN.y]], c: "loop", w: 1.8 });
  const psP = { x: ps.x + ps.w, y: ps.y + 30 };
  const psN = { x: ps.x + ps.w, y: ps.y + 64 };
  S.push({ k: "term", x: psP.x, y: psP.y, label: "+", pos: "left" });
  S.push({ k: "term", x: psN.x, y: psN.y, label: "0 V", pos: "left" });
  const right = tx.x + tx.w;
  if (x.kind === "2w") {
    const tP = { x: right, y: tx.y + 50 };
    const tN = { x: right, y: tx.y + 80 };
    S.push({ k: "term", x: tP.x, y: tP.y, label: "+", pos: "left" });
    S.push({ k: "term", x: tN.x, y: tN.y, label: "−", pos: "left" });
    // + 전원 → 트랜스미터 + ; 트랜스미터 − → AI+ ; AI− → 0 V
    S.push({ k: "wire", pts: [[psP.x, psP.y], [300, psP.y], [300, tP.y], [tP.x, tP.y]], c: "pwr" });
    S.push({ k: "wire", pts: [[tN.x, tN.y], [400, tN.y], [400, aiP.y], [aiP.x, aiP.y]], c: "loop" });
    S.push({ k: "wire", pts: [[aiN.x, aiN.y], [420, aiN.y], [420, psN.y], [psN.x, psN.y]], c: "zero" });
    S.push({ k: "text", x: 410, y: tN.y - 8, t: "4–20 mA →", size: 11, c: "loop", bold: true });
  } else if (x.kind === "3w") {
    const tP = { x: right, y: tx.y + 46 };
    const tO = { x: right, y: tx.y + 66 };
    const tN = { x: right, y: tx.y + 86 };
    S.push({ k: "term", x: tP.x, y: tP.y, label: "+V", pos: "left" });
    S.push({ k: "term", x: tO.x, y: tO.y, label: "OUT", pos: "left" });
    S.push({ k: "term", x: tN.x, y: tN.y, label: "0 V", pos: "left" });
    S.push({ k: "wire", pts: [[psP.x, psP.y], [290, psP.y], [290, tP.y], [tP.x, tP.y]], c: "pwr" });
    S.push({ k: "wire", pts: [[tO.x, tO.y], [400, tO.y], [400, aiP.y], [aiP.x, aiP.y]], c: "loop" });
    S.push({ k: "wire", pts: [[psN.x, psN.y], [320, psN.y], [320, tN.y], [tN.x, tN.y]], c: "zero" });
    S.push({ k: "wire", pts: [[320, psN.y], [430, psN.y], [430, aiN.y], [aiN.x, aiN.y]], c: "zero" });
    S.push({ k: "dot", x: 320, y: psN.y, c: "zero" });
    S.push({ k: "text", x: 410, y: tO.y - 8, t: "4–20 mA →", size: 11, c: "loop", bold: true });
  } else {
    const tPw = { x: tx.x + 30, y: tx.y };
    S.push({ k: "text", x: tPw.x, y: tPw.y - 8, t: t("전원: 트랜스미터 매뉴얼대로(별도)", "Power: per transmitter manual (separate)"), size: 11, c: "muted" });
    const tP = { x: right, y: tx.y + 56 };
    const tN = { x: right, y: tx.y + 84 };
    S.push({ k: "term", x: tP.x, y: tP.y, label: "OUT+", pos: "left" });
    S.push({ k: "term", x: tN.x, y: tN.y, label: "OUT−", pos: "left" });
    S.push({ k: "wire", pts: [[tP.x, tP.y], [400, tP.y], [400, aiP.y], [aiP.x, aiP.y]], c: "loop" });
    S.push({ k: "wire", pts: [[tN.x, tN.y], [380, tN.y], [380, aiN.y], [aiN.x, aiN.y]], c: "zero" });
    S.push({ k: "text", x: 410, y: tP.y - 8, t: "4–20 mA →", size: 11, c: "loop", bold: true });
    S.push({ k: "text", x: ps.x + ps.w / 2, y: ps.y + ps.h + 18, t: t("(4선식은 루프 전원 불필요)", "(not needed for 4-wire)"), anchor: "middle", size: 11, c: "muted" });
  }
  const v4 = (4 / 1000) * x.rRecv;
  const v20 = (20 / 1000) * x.rRecv;
  S.push({ k: "text", x: ai.x + ai.w / 2, y: ai.y + ai.h + 22, t: `4 mA → ${fx(v4)} V · 20 mA → ${fx(v20)} V`, anchor: "middle", size: 12, bold: true, c: "loop" });
  const legend: LegendItem[] = [
    { c: "pwr", label: t("+ 전원", "+ supply") },
    { c: "loop", label: t("루프 전류(신호)", "Loop current (signal)") },
    { c: "zero", label: "0 V / COM" },
  ];
  const warnings: Note[] = [];
  if (x.kind === "2w") {
    const head = txHeadroom(x.supplyV, x.rRecv);
    warnings.push({
      level: head < 10 ? "warn" : "info",
      text: t(`20 mA 일 때 트랜스미터에 남는 전압 ≈ ${fx(x.supplyV)} − 0.02 × ${fx(x.rRecv, 1)} = ${fx(head)} V (케이블 저항 제외). 트랜스미터 데이터시트의 최소 공급 전압보다 커야 합니다.`, `Voltage left for the transmitter at 20 mA ≈ ${fx(x.supplyV)} − 0.02 × ${fx(x.rRecv, 1)} = ${fx(head)} V (cable excluded). It must exceed the minimum supply in the transmitter datasheet.`),
    });
  }
  if (!(x.rRecv > 0)) warnings.push({ level: "fault", text: t("수신 저항은 0 보다 커야 합니다.", "The receiver resistor must be above 0.") });
  const checks: Note[] = [
    { level: "info", text: t(`수신 저항 ${fx(x.rRecv, 1)} Ω 에서 4~20 mA 는 ${fx(v4)}~${fx(v20)} V 입니다(V = I × R). 250 Ω 이면 1~5 V.`, `With ${fx(x.rRecv, 1)} Ω, 4–20 mA is ${fx(v4)}–${fx(v20)} V (V = I × R). 250 Ω gives 1–5 V.`) },
    { level: "info", text: t("PLC 입력 채널이 «전류» 로 설정됐는지, 루프 전원을 공급하는 능동(active) 입력인지 받기만 하는 수동(passive) 입력인지 매뉴얼에서 확인합니다. 2선식 트랜스미터에 수동 입력이면 외부 24 V 가 필요합니다.", "Check that the PLC channel is set to current, and whether it is an active input (supplies loop power) or passive. A 2-wire transmitter on a passive input needs an external 24 V supply.") },
    { level: "info", text: t("2선식은 전원과 신호가 같은 두 선, 3선식은 0 V 를 전원과 신호가 같이 쓰고, 4선식은 전원과 신호가 따로입니다.", "2-wire shares one pair for power and signal; 3-wire shares 0 V between power and signal; 4-wire keeps them separate.") },
    { level: "info", text: t("극성이 바뀌면 전류가 흐르지 않아 0 mA(단선처럼) 로 읽힙니다.", "Reversed polarity stops the current, reading as 0 mA (like an open wire).") },
    { level: "info", text: t("실드선은 보통 한쪽 끝(제어반 쪽)만 접지합니다 — 현장 기준·매뉴얼을 따릅니다.", "Ground the cable shield at one end only (usually the panel side) — follow site rules and the manual.") },
    { level: "info", text: t("단자 이름(AI+·I+·V+·COM)과 번호는 PLC·트랜스미터 매뉴얼의 단자 번호를 확인합니다.", "Terminal names (AI+, I+, V+, COM) and numbers vary — check the PLC and transmitter manuals.") },
  ];
  const tables: Table[] = [{ caption: t(`수신 저항 ${fx(x.rRecv, 1)} Ω 양단 전압`, `Voltage across ${fx(x.rRecv, 1)} Ω`), head: ["mA", "V", "%"], rows: loopRows(x.rRecv).map((r) => [String(r.mA), fx(r.v, 3), String(((r.mA - 4) / 16) * 100)]) }];
  return { drawing: { w, h: 320, title: `${TEMPLATE_NAME["4-20ma"][lang]} — ${kindName}`, shapes: S, legend }, checks, warnings, tables };
}

// ---------------------------------------------------------------- NPN/PNP 센서 → PLC DI

export interface SensorInput {
  type: "npn" | "pnp";
  count: number;
}

/** 입력 공통(COM)을 잇는 곳 — NPN 은 +24 V, PNP 는 0 V */
export const comTo = (type: "npn" | "pnp") => (type === "npn" ? "+24V" : "0V");

export function sensors(x: SensorInput, lang: Lang): WiringResult {
  const ko = lang === "ko";
  const t = (k: string, e: string) => (ko ? k : e);
  const n = Math.max(1, Math.min(4, Math.round(x.count) || 1));
  const S: Shape[] = [];
  const w = 780;
  const yP = 40; // +24 V 줄
  const yZ = 70; // 0 V 줄
  S.push({ k: "wire", pts: [[30, yP], [w - 40, yP]], c: "pwr" });
  S.push({ k: "wire", pts: [[30, yZ], [w - 40, yZ]], c: "zero" });
  S.push({ k: "text", x: 30, y: yP - 8, t: "+24 V DC", size: 12, bold: true, c: "pwr" });
  S.push({ k: "text", x: 30, y: yZ + 16, t: "0 V", size: 12, bold: true, c: "zero" });
  const plc = { x: 520, y: 120, w: 200, h: 70 + n * 34 };
  S.push({ k: "box", ...plc, title: t("PLC 디지털 입력", "PLC digital input"), sub: x.type === "npn" ? t("COM → +24 V", "COM → +24 V") : t("COM → 0 V", "COM → 0 V"), stroke: "accent" });
  for (let i = 0; i < n; i++) {
    const sy = 120 + i * 80;
    const s = { x: 60, y: sy, w: 150, h: 64 };
    S.push({ k: "box", ...s, title: "" });
    S.push({ k: "text", x: s.x + 10, y: s.y + 22, t: t(`센서 ${i + 1}`, `Sensor ${i + 1}`), size: 13, bold: true });
    S.push({ k: "text", x: s.x + 10, y: s.y + 40, t: x.type.toUpperCase(), size: 11.5, c: "muted" });
    const ox = s.x + s.w;
    const yBr = sy + 22;
    const yBk = sy + 38;
    const yBu = sy + 54;
    const xBr = 260 + i * 12;
    const xBu = 330 + i * 12;
    S.push({ k: "wire", pts: [[ox, yBr], [xBr, yBr], [xBr, yP]], c: "br" });
    S.push({ k: "dot", x: xBr, y: yP, c: "pwr" });
    S.push({ k: "wire", pts: [[ox, yBu], [xBu, yBu], [xBu, yZ]], c: "zero" });
    S.push({ k: "dot", x: xBu, y: yZ, c: "zero" });
    const inY = plc.y + 62 + i * 34;
    S.push({ k: "wire", pts: [[ox, yBk], [420 + i * 10, yBk], [420 + i * 10, inY], [plc.x, inY]], c: "bk" });
    S.push({ k: "term", x: plc.x, y: inY, label: `X${i}`, pos: "right" });
    S.push({ k: "term", x: ox, y: yBr, label: t("갈색 +", "BN +"), pos: "left" });
    S.push({ k: "term", x: ox, y: yBk, label: t("검정 출력", "BK out"), pos: "left" });
    S.push({ k: "term", x: ox, y: yBu, label: t("파랑 0 V", "BU 0 V"), pos: "left" });
  }
  const comY = plc.y + 40;
  const comX = plc.x + plc.w;
  S.push({ k: "term", x: comX, y: comY, label: "COM", pos: "left" });
  const target = x.type === "npn" ? yP : yZ;
  S.push({ k: "wire", pts: [[comX, comY], [comX + 30, comY], [comX + 30, target]], c: x.type === "npn" ? "pwr" : "zero" });
  S.push({ k: "dot", x: comX + 30, y: target, c: x.type === "npn" ? "pwr" : "zero" });
  const hh = Math.max(plc.y + plc.h, 120 + n * 80) + 20;
  S.push({
    k: "text",
    x: w / 2,
    y: hh,
    t: x.type === "npn" ? t("NPN: 켜지면 검정 선이 0 V 로 당겨져 전류가 COM(+24 V) → 입력 → 센서로 흐릅니다", "NPN: when on, the black wire is pulled to 0 V; current flows COM (+24 V) → input → sensor") : t("PNP: 켜지면 검정 선에 +24 V 가 나와 전류가 센서 → 입력 → COM(0 V) 로 흐릅니다", "PNP: when on, the black wire outputs +24 V; current flows sensor → input → COM (0 V)"),
    anchor: "middle",
    size: 12,
    c: "muted",
  });
  const legend: LegendItem[] = [
    { c: "br", label: t("갈색 — +24 V", "Brown — +24 V") },
    { c: "zero", label: t("파랑 — 0 V", "Blue — 0 V") },
    { c: "bk", label: t("검정 — 출력 → 입력", "Black — output → input") },
  ];
  const checks: Note[] = [
    { level: "info", text: t("NPN 센서는 입력 COM 을 +24 V 에, PNP 센서는 COM 을 0 V 에 잇습니다. 한 COM 묶음에는 같은 종류 센서만 답니다.", "NPN sensors: input COM to +24 V. PNP sensors: COM to 0 V. Keep one sensor type per COM group.") },
    { level: "warn", text: t("«싱크/소스 입력» 이름은 제조사마다 반대로 쓰입니다 — 어떤 곳은 NPN 용 입력을 «싱크 입력», 다른 곳은 PNP 용 입력을 «sinking input» 이라 부릅니다. 이름보다 COM 을 어디에 잇는지로 봅니다.", "«Sink/source input» names are used in opposite ways by different vendors — some call the NPN-compatible input «sink», others call the PNP-compatible input «sinking». Go by where COM connects, not the name.") },
    { level: "info", text: t("선 색은 IEC 60947-5-2 관례(갈색 +, 파랑 0 V, 검정 출력, 4선이면 흰색 둘째 출력)입니다 — 제조사 데이터시트를 확인합니다.", "Wire colours follow the IEC 60947-5-2 convention (brown +, blue 0 V, black output, white second output on 4-wire) — check the sensor datasheet."), src: "IEC 60947-5-2" },
    { level: "info", text: t("2선식 근접 센서는 3선과 결선이 다릅니다(부하와 직렬, 누설 전류) — 갈색·파랑만 있다고 3선처럼 잇지 않습니다.", "2-wire proximity sensors are wired differently (in series with the load, leakage current) — do not wire them like 3-wire sensors.") },
    { level: "info", text: t("센서 전원과 PLC 입력 전원의 0 V 가 같아야 합니다(전원이 둘이면 0 V 를 잇기).", "The sensor supply and PLC input supply must share 0 V (tie the 0 V lines if there are two supplies).") },
    { level: "info", text: t("입력 단자 번호(X0·I0.0·%IX0 등)와 COM 묶음은 PLC 매뉴얼의 단자 번호를 확인합니다.", "Input names (X0, I0.0, %IX0 …) and COM groups vary — check the PLC manual's terminal numbers.") },
  ];
  return { drawing: { w, h: hh + 12, title: `${TEMPLATE_NAME["npn-pnp"][lang]} — ${x.type.toUpperCase()}`, shapes: S, legend }, checks, warnings: [], tables: [] };
}

// ---------------------------------------------------------------- 릴레이·TR 출력 → 부하

export interface OutputInput {
  out: "relay" | "npn" | "pnp";
  load: "dc" | "ac";
}

export function output(x: OutputInput, lang: Lang): WiringResult {
  const ko = lang === "ko";
  const t = (k: string, e: string) => (ko ? k : e);
  const S: Shape[] = [];
  const w = 760;
  const yP = 40;
  const yZ = 300;
  const load = x.out === "relay" ? x.load : "dc"; // TR 출력은 DC 부하만
  const pName = load === "ac" ? "L" : "+24 V";
  const zName = load === "ac" ? "N" : "0 V";
  S.push({ k: "wire", pts: [[30, yP], [w - 40, yP]], c: "pwr" });
  S.push({ k: "wire", pts: [[30, yZ], [w - 40, yZ]], c: "zero" });
  S.push({ k: "text", x: 30, y: yP - 8, t: load === "ac" ? t("교류 전원 L", "AC supply L") : "+24 V DC", size: 12, bold: true, c: "pwr" });
  S.push({ k: "text", x: 30, y: yZ + 18, t: zName, size: 12, bold: true, c: "zero" });
  const plc = { x: 80, y: 110, w: 190, h: 120 };
  const outName = x.out === "relay" ? t("릴레이 출력", "Relay output") : x.out === "npn" ? t("TR 출력 NPN(싱크형)", "Transistor NPN (sinking)") : t("TR 출력 PNP(소스형)", "Transistor PNP (sourcing)");
  S.push({ k: "box", ...plc, title: t("PLC 출력", "PLC output"), sub: outName, stroke: "accent" });
  // COM 이 위(+)로 가면 COM 단자를 위에, 아래(0 V)로 가면 아래에 — 선이 엇갈리지 않게
  const yY = x.out === "npn" ? plc.y + 70 : plc.y + 100;
  const yC = x.out === "npn" ? plc.y + 100 : plc.y + 70;
  const ox = plc.x + plc.w;
  S.push({ k: "term", x: ox, y: yY, label: "Y0", pos: "left" });
  S.push({ k: "term", x: ox, y: yC, label: "COM", pos: "left" });
  // 부하(코일)
  const lx = 480;
  const loadTop = 120;
  const loadBot = 230;
  S.push({ k: "box", x: lx - 45, y: loadTop, w: 90, h: loadBot - loadTop, title: t("부하", "Load"), sub: load === "ac" ? t("AC 코일", "AC coil") : t("DC 코일", "DC coil"), sub2: t("솔레노이드·릴레이", "solenoid / relay") });
  // 결선: 위쪽 = + 쪽, 아래쪽 = − 쪽
  // NPN(싱크): +24 → 부하 → Y0, COM → 0 V
  // PNP(소스): COM → +24, Y0 → 부하 → 0 V
  // 릴레이: COM → L/+24, Y0 → 부하 → N/0 V
  if (x.out === "npn") {
    S.push({ k: "wire", pts: [[lx, yP], [lx, loadTop]], c: "pwr" });
    S.push({ k: "wire", pts: [[lx, loadBot], [lx, 260], [360, 260], [360, yY], [ox, yY]], c: "bk" });
    S.push({ k: "wire", pts: [[ox, yC], [330, yC], [330, yZ]], c: "zero" });
    S.push({ k: "dot", x: lx, y: yP, c: "pwr" });
    S.push({ k: "dot", x: 330, y: yZ, c: "zero" });
  } else {
    S.push({ k: "wire", pts: [[ox, yC], [330, yC], [330, yP]], c: "pwr" });
    S.push({ k: "wire", pts: [[ox, yY], [360, yY], [360, 90], [lx, 90], [lx, loadTop]], c: "bk" });
    S.push({ k: "wire", pts: [[lx, loadBot], [lx, yZ]], c: "zero" });
    S.push({ k: "dot", x: 330, y: yP, c: "pwr" });
    S.push({ k: "dot", x: lx, y: yZ, c: "zero" });
  }
  // 보호 소자 — 부하와 나란히
  const dx = lx + 90;
  const topY = x.out === "npn" ? 80 : 100;
  const botY = x.out === "npn" ? 250 : 260;
  const topSrc = x.out === "npn" ? [lx, 80] : [lx, 100];
  const botSrc = x.out === "npn" ? [lx, 250] : [lx, 260];
  S.push({ k: "wire", pts: [[topSrc[0], topSrc[1]], [dx, topY]], c: "aux", w: 1.8 });
  S.push({ k: "wire", pts: [[botSrc[0], botSrc[1]], [dx, botY]], c: "aux", w: 1.8 });
  S.push({ k: "dot", x: topSrc[0], y: topSrc[1], c: "aux" });
  S.push({ k: "dot", x: botSrc[0], y: botSrc[1], c: "aux" });
  if (load === "dc") {
    // 캐소드(띠)는 + 쪽(위)
    S.push({ k: "diode", x: dx, y1: topY, y2: botY, c: "aux", label: t("다이오드(띠 = + 쪽)", "Diode (band to +)") });
  } else {
    S.push({ k: "res", x1: dx, y1: topY, x2: dx, y2: (topY + botY) / 2, c: "aux", label: t("RC 서지 킬러", "RC snubber") });
    S.push({ k: "wire", pts: [[dx - 9, (topY + botY) / 2 + 8], [dx + 9, (topY + botY) / 2 + 8]], c: "aux" });
    S.push({ k: "wire", pts: [[dx - 9, (topY + botY) / 2 + 14], [dx + 9, (topY + botY) / 2 + 14]], c: "aux" });
    S.push({ k: "wire", pts: [[dx, (topY + botY) / 2], [dx, (topY + botY) / 2 + 8]], c: "aux" });
    S.push({ k: "wire", pts: [[dx, (topY + botY) / 2 + 14], [dx, botY]], c: "aux" });
  }
  const legend: LegendItem[] = [
    { c: "pwr", label: pName },
    { c: "zero", label: zName },
    { c: "bk", label: t("출력 → 부하", "Output → load") },
    { c: "aux", label: load === "dc" ? t("플라이백 다이오드", "Flyback diode") : t("RC 서지 킬러", "RC snubber") },
  ];
  const warnings: Note[] = [];
  if (x.out !== "relay" && x.load === "ac") warnings.push({ level: "fault", text: t("트랜지스터 출력은 직류 부하 전용입니다 — 교류 부하는 릴레이·SSR(트라이액) 출력으로 구동합니다. 그림은 DC 로 그렸습니다.", "Transistor outputs drive DC loads only — use relay or SSR (triac) outputs for AC loads. Drawn as DC.") });
  const checks: Note[] = [
    { level: "info", text: t("DC 코일(솔레노이드·릴레이)에는 플라이백 다이오드를 코일과 나란히, 캐소드(띠)를 + 쪽으로 답니다. 반대로 달면 켜는 순간 출력이 단락됩니다.", "On DC coils, fit a flyback diode across the coil with the cathode (band) to the + side. Reversed, it shorts the output when switched on.") },
    { level: "info", text: t("다이오드는 끄는 순간의 역기전력을 흡수하지만 코일이 놓이는 시간을 늘립니다 — 빠른 복귀가 필요하면 다이오드 + 제너 등을 씁니다.", "A diode absorbs the turn-off spike but slows coil release — use diode + Zener etc. when fast release matters.") },
    { level: "info", text: t("AC 부하에는 다이오드를 쓰지 않고 RC 서지 킬러나 바리스터를 코일과 나란히 답니다.", "For AC loads use an RC snubber or varistor across the coil, not a diode.") },
    { level: "info", text: t("NPN(싱크형) TR 출력은 부하를 + 와 출력 사이에, PNP(소스형) 는 출력과 0 V 사이에 답니다. COM 연결도 다릅니다.", "With NPN (sinking) transistor outputs the load goes between + and the output; with PNP (sourcing), between the output and 0 V. COM connects differently.") },
    { level: "info", text: t("출력 한 점·COM 묶음의 최대 전류, 릴레이 접점 정격(전압·전류·수명)을 PLC 매뉴얼에서 확인합니다.", "Check the PLC manual for maximum current per point and per COM group, and relay contact ratings (voltage, current, life).") },
    { level: "info", text: t("단자 이름(Y0·Q0.0·%QX0 등)과 번호는 PLC 매뉴얼의 단자 번호를 확인합니다.", "Output names (Y0, Q0.0, %QX0 …) vary — check the PLC manual's terminal numbers.") },
  ];
  return { drawing: { w, h: yZ + 30, title: `${TEMPLATE_NAME.output[lang]} — ${outName}`, shapes: S, legend }, checks, warnings, tables: [] };
}

// ---------------------------------------------------------------- 주소(#…) ↔ 입력

/** 화면 상태 전체 — 주소 # 뒤에 넣고 빼는 모양 */
export interface WiringState {
  tpl: TemplateId;
  devices: Rs485Device[];
  conv: LabelSet;
  dev: LabelSet;
  four: FourLabel;
  len: number;
  baud: number;
  parity: "none" | "even" | "odd";
  bias: boolean;
  rs232: Rs232Mode;
  loopback: boolean;
  loop: LoopKind;
  supply: number;
  rRecv: number;
  sensor: "npn" | "pnp";
  count: number;
  out: "relay" | "npn" | "pnp";
  load: "dc" | "ac";
}

export const DEFAULT_STATE = (lang: Lang): WiringState => ({
  tpl: "rs485-2w",
  devices: [1, 2, 3].map((u) => ({ name: lang === "ko" ? `인버터 ${u}` : `Inverter ${u}`, unit: u })),
  conv: "ab",
  dev: "ab",
  four: "txrx",
  len: 100,
  baud: 9600,
  parity: "even",
  bias: true,
  rs232: "null3",
  loopback: false,
  loop: "2w",
  supply: 24,
  rRecv: 250,
  sensor: "npn",
  count: 2,
  out: "npn",
  load: "dc",
});

const oneOf = <T extends string>(v: string | null, list: readonly T[], d: T): T => (v && (list as readonly string[]).includes(v) ? (v as T) : d);
const numIn = (v: string | null, lo: number, hi: number, d: number) => {
  const x = v == null || v === "" ? NaN : Number(v);
  return Number.isFinite(x) && x >= lo && x <= hi ? x : d;
};

/**
 * 주소 # 뒤(URLSearchParams 모양) → 상태. 예: #tpl=rs485-2w&dev=ls-electric/g100&n=3&baud=9600
 * 장비 이름·국번 목록은 d=이름~국번|이름~국번 (장비 맵 id 는 ref 로 따로 넘겨 화면이 채운다)
 */
export function parseHash(hash: string, lang: Lang): WiringState & { ref?: string } {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const s = DEFAULT_STATE(lang);
  s.tpl = oneOf(p.get("tpl"), TEMPLATES, s.tpl);
  const d = p.get("d");
  if (d) {
    const list = d
      .split("|")
      .slice(0, MAX_DEVICES)
      .map((x, i) => {
        const [name, unit] = x.split("~");
        return { name: (name ?? "").slice(0, 40) || `#${i + 1}`, unit: numIn(unit ?? null, 0, 255, i + 1) };
      });
    if (list.length) s.devices = list;
  }
  s.conv = oneOf(p.get("conv"), Object.keys(LABEL_SETS) as LabelSet[], s.conv);
  s.dev = oneOf(p.get("lbl"), Object.keys(LABEL_SETS) as LabelSet[], s.dev);
  s.four = oneOf(p.get("four"), ["txrx", "modbus"] as const, s.four);
  s.len = numIn(p.get("len"), 0, 100000, s.len);
  s.baud = numIn(p.get("baud"), 50, 10000000, s.baud);
  s.parity = oneOf(p.get("parity"), ["none", "even", "odd"] as const, s.parity);
  if (p.has("bias")) s.bias = p.get("bias") !== "0";
  s.rs232 = oneOf(p.get("rs232"), ["null3", "nullFull", "straight"] as const, s.rs232);
  if (p.has("lb")) s.loopback = p.get("lb") === "1";
  s.loop = oneOf(p.get("loop"), ["2w", "3w", "4w"] as const, s.loop);
  s.supply = numIn(p.get("v"), 1, 1000, s.supply);
  s.rRecv = numIn(p.get("r"), 0.001, 1e6, s.rRecv);
  s.sensor = oneOf(p.get("sensor"), ["npn", "pnp"] as const, s.sensor);
  s.count = numIn(p.get("n"), 1, 4, s.count);
  s.out = oneOf(p.get("out"), ["relay", "npn", "pnp"] as const, s.out);
  s.load = oneOf(p.get("load"), ["dc", "ac"] as const, s.load);
  const ref = p.get("ref") ?? undefined;
  return ref && /^[a-z0-9-]+\/[a-z0-9-]+$/.test(ref) ? { ...s, ref } : s;
}

/** 상태 → 주소 # 뒤(그 상황에 쓰는 값만) */
export function toHash(s: WiringState): string {
  const p = new URLSearchParams();
  p.set("tpl", s.tpl);
  if (s.tpl === "rs485-2w" || s.tpl === "rs485-4w") {
    p.set("d", s.devices.map((d) => `${d.name.replace(/[|~]/g, " ")}~${d.unit}`).join("|"));
    p.set("len", String(s.len));
    p.set("baud", String(s.baud));
    p.set("parity", s.parity);
    if (s.tpl === "rs485-2w") {
      p.set("conv", s.conv);
      p.set("lbl", s.dev);
      p.set("bias", s.bias ? "1" : "0");
    } else p.set("four", s.four);
  } else if (s.tpl === "rs232") {
    p.set("rs232", s.rs232);
    if (s.rs232 === "null3" && s.loopback) p.set("lb", "1");
  } else if (s.tpl === "4-20ma") {
    p.set("loop", s.loop);
    p.set("v", String(s.supply));
    p.set("r", String(s.rRecv));
  } else if (s.tpl === "npn-pnp") {
    p.set("sensor", s.sensor);
    p.set("n", String(s.count));
  } else {
    p.set("out", s.out);
    p.set("load", s.load);
  }
  return p.toString();
}

/** 상태 → 결과(고른 상황 하나) */
export function build(s: WiringState, lang: Lang): WiringResult {
  switch (s.tpl) {
    case "rs485-2w":
      return rs485TwoWire({ devices: s.devices, conv: s.conv, dev: s.dev, lengthM: s.len, baud: s.baud, parity: s.parity, bias: s.bias }, lang);
    case "rs485-4w":
      return rs485FourWire({ devices: s.devices, labels: s.four, lengthM: s.len, baud: s.baud, parity: s.parity }, lang);
    case "rs232":
      return rs232({ mode: s.rs232, loopback: s.loopback }, lang);
    case "4-20ma":
      return loop420({ kind: s.loop, supplyV: s.supply, rRecv: s.rRecv }, lang);
    case "npn-pnp":
      return sensors({ type: s.sensor, count: s.count }, lang);
    case "output":
      return output({ out: s.out, load: s.load }, lang);
  }
}
