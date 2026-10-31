// (0.11.0) 방송으로 찾기 — 백엔드(src-tauri/src/discover.rs)가 돌려준 EtherNet/IP·BACnet 답을 화면 글로. React·Tauri 없는 부분(시험: discover.test.ts)
// 일련번호는 백엔드가 넘기지 않는다(화면·CSV·AI 복사에 없음).
import type { Lang } from "./i18n";

export interface EnipDevice {
  ip: string;
  /** 장비가 알린 주소가 답이 온 주소와 다를 때 */
  addr: string | null;
  vendorId: number;
  deviceType: number;
  productCode: number;
  revision: string;
  productName: string;
  status: number;
  state: number | null;
}

export interface BacnetDevice {
  ip: string;
  port: number;
  instance: number;
  vendorId: number;
  maxApdu: number;
  segmentation: number;
  network: number | null;
  mac: string | null;
}

export interface DiscoverConfig {
  nicIp: string;
  prefix: number;
  enip: boolean;
  bacnet: boolean;
  waitMs: number;
  tries: number;
}

export interface DiscoverResult {
  enip: EnipDevice[];
  bacnet: BacnetDevice[];
  sent: string[];
  notes: string[];
}

/** 한 IP 에서 방송으로 받은 것 — BACnet 은 라우터 하나가 뒤의 여러 장치를 대신 답할 수 있어 목록 */
export interface Disc {
  enip: EnipDevice | null;
  bacnet: BacnetDevice[];
}

/**
 * EtherNet/IP 벤더 ID → 이름(흔한 것 40개만). 출처: ODVA Marketplace 의 회사 쪽(marketplace.odva.org/organizations/…)
 * «ODVA Technologies Licensed to this Company — EtherNet/IP ID» 칸, 2026-11-01 확인. 목록에 없으면 숫자만 보인다.
 */
export const ENIP_VENDORS: Record<number, string> = {
  1: "Rockwell Automation/Allen-Bradley",
  3: "Honeywell",
  4: "Parker Hannifin",
  7: "SMC",
  8: "Molex",
  12: "Banner Engineering",
  26: "Festo",
  40: "WAGO",
  43: "Balluff",
  44: "Yaskawa",
  46: "ABB",
  47: "OMRON",
  48: "TURCK",
  57: "Pepperl+Fuchs",
  68: "Eaton",
  71: "Toshiba",
  90: "HMS",
  94: "Advantech",
  97: "Danfoss",
  108: "Beckhoff",
  121: "KUKA",
  159: "IDEC",
  161: "Mitsubishi Electric",
  171: "DENSO WAVE",
  216: "Panasonic",
  243: "Schneider Electric",
  259: "LS ELECTRIC",
  283: "Hilscher",
  287: "Bosch Rexroth",
  309: "ProSoft Technology",
  319: "Fuji Electric",
  322: "ifm electronic",
  356: "FANUC America",
  367: "KEYENCE",
  562: "Phoenix Contact",
  591: "FANUC",
  678: "Cognex",
  808: "SICK",
  991: "Moxa",
  1251: "Siemens",
};

/** CIP 장비 종류(Identity 객체 속성 2, ODVA 공개 장비 프로필 번호) — 흔한 것만. 없으면 16진 숫자 */
const DEVICE_TYPES: Record<number, [string, string]> = {
  0x02: ["AC 드라이브(인버터)", "AC drive"],
  0x07: ["범용 디지털 I/O", "General purpose discrete I/O"],
  0x0c: ["통신 어댑터", "Communications adapter"],
  0x0e: ["PLC", "Programmable logic controller"],
  0x16: ["모터 스타터", "Motor starter"],
  0x18: ["HMI(터치 패널)", "Human-machine interface"],
  0x2b: ["범용 장비", "Generic device"],
  0x2c: ["관리형 스위치", "Managed switch"],
};

const hex4 = (n: number) => `0x${n.toString(16).toUpperCase().padStart(2, "0")}`;

export const enipVendor = (id: number) => ENIP_VENDORS[id] ?? null;
/** «Rockwell Automation/Allen-Bradley (1)» · 모르면 «벤더 1234» */
export const enipVendorLabel = (id: number, lang: Lang) => (ENIP_VENDORS[id] ? `${ENIP_VENDORS[id]} (${id})` : `${lang === "ko" ? "벤더" : "vendor"} ${id}`);
export function deviceTypeLabel(n: number, lang: Lang) {
  const t = DEVICE_TYPES[n];
  return t ? `${t[lang === "ko" ? 0 : 1]} (${hex4(n)})` : `${lang === "ko" ? "종류" : "type"} ${hex4(n)}`;
}

const SEG: [string, string][] = [
  ["양방향", "both"],
  ["보내기만", "transmit"],
  ["받기만", "receive"],
  ["없음", "none"],
];
export const segLabel = (n: number, lang: Lang) => SEG[n]?.[lang === "ko" ? 0 : 1] ?? String(n);

/** 결과를 IP 별로 묶는다(이미 있는 것에 덧붙임) */
export function mergeDisc(prev: Map<string, Disc>, r: DiscoverResult): Map<string, Disc> {
  const out = new Map(prev);
  const get = (ip: string) => out.get(ip) ?? { enip: null, bacnet: [] };
  for (const e of r.enip) out.set(e.ip, { ...get(e.ip), enip: e });
  for (const b of r.bacnet) {
    const d = get(b.ip);
    out.set(b.ip, { ...d, bacnet: [...d.bacnet.filter((x) => x.instance !== b.instance), b].sort((x, y) => x.instance - y.instance) });
  }
  return out;
}

/** 노출 표시에 넣을 포트 — 방송에 답했으면 그 프로토콜이 이 장비에서 열린 것(EtherNet/IP 44818·BACnet/IP 47808, 둘 다 인증 없음) */
export function discPorts(d: Disc | undefined | null): number[] {
  if (!d) return [];
  return [...(d.enip ? [44818] : []), ...(d.bacnet.length ? [47808] : [])];
}

/** 표의 칩 글 — «EtherNet/IP · OMRON NJ501» · «BACnet #1234» */
export function discChips(d: Disc | undefined | null, lang: Lang): { text: string; title: string }[] {
  if (!d) return [];
  const out: { text: string; title: string }[] = [];
  if (d.enip) {
    const e = d.enip;
    const v = enipVendor(e.vendorId);
    out.push({ text: ["EtherNet/IP", [v, e.productName].filter(Boolean).join(" ")].filter(Boolean).join(" · "), title: enipLine(e, lang) });
  }
  for (const b of d.bacnet) out.push({ text: `BACnet #${b.instance}`, title: bacnetLine(b, lang) });
  return out;
}

/** 아래 칸 한 줄 */
export function enipLine(e: EnipDevice, lang: Lang) {
  const ko = lang === "ko";
  return [
    `EtherNet/IP — ${enipVendorLabel(e.vendorId, lang)}`,
    deviceTypeLabel(e.deviceType, lang),
    `${ko ? "제품 코드" : "product code"} ${e.productCode}`,
    e.productName && `${ko ? "제품" : "product"} «${e.productName}»`,
    `${ko ? "버전" : "rev"} ${e.revision}`,
    e.addr && `${ko ? "장비가 알린 IP" : "reported IP"} ${e.addr}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function bacnetLine(b: BacnetDevice, lang: Lang) {
  const ko = lang === "ko";
  return [
    `BACnet/IP — ${ko ? "장치 인스턴스" : "device instance"} ${b.instance}`,
    `${ko ? "벤더 ID" : "vendor ID"} ${b.vendorId}`,
    `${ko ? "최대 APDU" : "max APDU"} ${b.maxApdu}`,
    `${ko ? "분할" : "segmentation"} ${segLabel(b.segmentation, lang)}`,
    b.port !== 47808 && `${ko ? "포트" : "port"} ${b.port}`,
    b.network != null && `${ko ? "라우터 뒤 망" : "behind router, network"} ${b.network}${b.mac ? ` / ${b.mac}` : ""}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** CSV 칸(머리 순서 DISC_CSV_HEAD) — 일련번호 없음 */
export const DISC_CSV_HEAD = ["enip_vendor", "enip_device_type", "enip_product_code", "enip_product", "enip_revision", "bacnet_instances", "bacnet_vendor_id", "bacnet_max_apdu"];
export function discCsv(d: Disc | undefined | null): (string | number | null)[] {
  const e = d?.enip ?? null;
  const b = d?.bacnet ?? [];
  return [
    e ? (enipVendor(e.vendorId) ?? String(e.vendorId)) : null,
    e ? hex4(e.deviceType) : null,
    e ? e.productCode : null,
    e ? e.productName : null,
    e ? e.revision : null,
    b.length ? b.map((x) => x.instance).join(" ") : null,
    b.length ? [...new Set(b.map((x) => x.vendorId))].join(" ") : null,
    b.length ? [...new Set(b.map((x) => x.maxApdu))].join(" ") : null,
  ];
}

/** AI 복사 한 조각 — «enip OMRON NJ501 1.010 bacnet #7 vendor 260» */
export function discAi(d: Disc | undefined | null): string {
  if (!d) return "";
  const e = d.enip ? `enip ${[enipVendor(d.enip.vendorId) ?? `vendor ${d.enip.vendorId}`, d.enip.productName, d.enip.revision].filter(Boolean).join(" ")}` : "";
  const b = d.bacnet.length ? `bacnet ${d.bacnet.map((x) => `#${x.instance} vendor ${x.vendorId}`).join(", ")}` : "";
  return [e, b].filter(Boolean).join(" ");
}

/** 랜카드 주소·접두 길이 → 방송 주소(백엔드 range.rs broadcast_of 와 같은 규칙). /31·/32 는 없음 */
export function bcastOf(ip: string, prefix: number): string | null {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((x) => !Number.isInteger(x) || x < 0 || x > 255) || prefix > 30 || prefix < 0) return null;
  const n = ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
  const host = prefix === 0 ? 0xffffffff : (2 ** (32 - prefix) - 1) >>> 0;
  const b = (n | host) >>> 0;
  return [b >>> 24, (b >>> 16) & 255, (b >>> 8) & 255, b & 255].join(".");
}

/** 결과 한 줄 요약(알림) */
export function discSummary(r: DiscoverResult, lang: Lang) {
  return lang === "ko" ? `방송으로 찾기 — EtherNet/IP ${r.enip.length}대 · BACnet ${r.bacnet.length}대 (보낸 곳 ${r.sent.join(", ")})` : `Broadcast discovery — EtherNet/IP ${r.enip.length} · BACnet ${r.bacnet.length} (sent to ${r.sent.join(", ")})`;
}
