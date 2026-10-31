// 커넥터 핀 배치 사전 — 데이터(커넥터·핀·선 색·출처)와 정면 그림(SVG 글). DOM 없이 글만 만든다(node --test 로 시험).
// 지어낸 값 금지: 출처를 단 공개 문서·널리 쓰는 관례만 넣는다. 확실치 않은 것은 빼거나 «제조사마다 다름» 으로 적는다.
//   - DB9·DB25 RS-232 신호: TIA-574·EIA-232 관례(공개 요약: TLDP Serial-HOWTO). DB9 정면 번호 배치는 Modbus 직렬 규격 V1.02 그림 25 와 같다.
//   - Modbus RJ45·DB9: MODBUS over serial line V1.02 (2006) §3.5.1·§3.5.2 표와 §3.6 권장 선 색 — 원문에서 확인.
//   - RJ45 T568A/B 선 색, 10/100·1000BASE-T 핀 이름: ANSI/TIA-568·IEEE 802.3 관례.
//   - M12 A-코드·M8 센서 선 색: IEC 60947-5-2 관례(갈색 +, 파랑 0 V, 검정 출력, 흰색 둘째). M8 3핀은 핀 번호가 1·3·4(2 없음).
//   - M12 D-코드(PROFINET 등): 1 TD+ 노랑, 2 RD+ 흰색, 3 TD− 주황, 4 RD− 파랑(Siemens·Pepperl+Fuchs 문서).
//   - M12 X-코드: 1 DA+ 2 DA− 3 DB+ 4 DB− 5 DD+ 6 DD− 7 DC− 8 DC+(FLIR·Banner 문서 — 7·8 이 DC−·DC+ 순서).
//   - M12·M8 의 원형 정면 배치(어느 위치가 몇 번인지)는 제조사 도면마다 그리는 방향이 달라 그리지 않는다 — 번호 목록 그림만.
import { LIGHT, esc, type Palette } from "./diagramSvg.ts";

import { msg as trMsg, tx as trTx, type Lang } from "./tr.ts";
export type { Lang };
export type L = { ko: string; en: string };

/** 선 색 — 줄무늬는 «흰 바탕 + 색 줄» */
export type WireColor = "bn" | "wh" | "bu" | "bk" | "gy" | "gn" | "ye" | "or" | "rd" | "pk" | "w-or" | "w-gn" | "w-bu" | "w-bn";

export const WIRE: Record<WireColor, { name: L; hex: string; stripe?: string }> = {
  bn: { name: { ko: "갈색", en: "brown" }, hex: "#8b4513" },
  wh: { name: { ko: "흰색", en: "white" }, hex: "#f5f5f4" },
  bu: { name: { ko: "파랑", en: "blue" }, hex: "#1d4ed8" },
  bk: { name: { ko: "검정", en: "black" }, hex: "#111827" },
  gy: { name: { ko: "회색", en: "grey" }, hex: "#9ca3af" },
  gn: { name: { ko: "초록", en: "green" }, hex: "#15803d" },
  ye: { name: { ko: "노랑", en: "yellow" }, hex: "#facc15" },
  or: { name: { ko: "주황", en: "orange" }, hex: "#ea580c" },
  rd: { name: { ko: "빨강", en: "red" }, hex: "#dc2626" },
  pk: { name: { ko: "분홍", en: "pink" }, hex: "#f472b6" },
  "w-or": { name: { ko: "흰/주황", en: "white/orange" }, hex: "#f5f5f4", stripe: "#ea580c" },
  "w-gn": { name: { ko: "흰/초록", en: "white/green" }, hex: "#f5f5f4", stripe: "#15803d" },
  "w-bu": { name: { ko: "흰/파랑", en: "white/blue" }, hex: "#f5f5f4", stripe: "#1d4ed8" },
  "w-bn": { name: { ko: "흰/갈색", en: "white/brown" }, hex: "#f5f5f4", stripe: "#8b4513" },
};

export type Kind = "dsub9" | "dsub25" | "rj45" | "usbc" | "list";
export type Category = "serial" | "ethernet" | "sensor" | "usb" | "rs485";
export const CATEGORIES: { id: Category; name: L }[] = [
  { id: "serial", name: { ko: "RS-232 (DB9·DB25)", en: "RS-232 (DB9, DB25)" } },
  { id: "rs485", name: { ko: "RS-485·Modbus", en: "RS-485 and Modbus" } },
  { id: "ethernet", name: { ko: "이더넷 (RJ45·M12)", en: "Ethernet (RJ45, M12)" } },
  { id: "sensor", name: { ko: "센서 (M12·M8)", en: "Sensors (M12, M8)" } },
  { id: "usb", name: { ko: "USB", en: "USB" } },
];

export interface Pin {
  /** 핀 번호(«1», «A5», 단자 이름 «D1») */
  n: string;
  sig: L;
  /** 설명(짧게) */
  desc?: L;
  color?: WireColor;
  /** 커넥터의 추가 칸(cols 와 같은 수) */
  x?: L[];
}

export interface Source {
  name: string;
  href: string;
}

export interface Connector {
  id: string;
  cat: Category;
  kind: Kind;
  name: L;
  /** 한 줄 요약 */
  sum: L;
  /** 핀 수(그림 칸 수). list 는 ids 가 없으면 1..pins */
  pinCount: number;
  /** 핀 번호가 1..n 이 아닐 때(M8 3핀 «1·3·4», 단자 표기) */
  ids?: string[];
  /** 주요 핀만 적음(DB25) — 빠진 번호 검사를 건너뛴다 */
  partial?: boolean;
  /** 표의 추가 칸 이름 */
  cols?: L[];
  /** 선 색 칸 이름(없으면 «선 색») */
  colorCol?: L;
  /** 선 색이 관례·예시임을 알리는 말 */
  colorNote?: L;
  pins: Pin[];
  notes: L[];
  src: Source[];
  /** 찾기용 낱말 */
  tags: string[];
  /** 이어지는 사이트 페이지(언어 뺀 경로) */
  links?: string[];
}

const t = (ko: string, en: string): L => ({ ko, en });

const OUT = t("→ 출력", "→ out");
const IN = t("← 입력", "← in");
const NA = t("—", "—");

const SRC_TLDP: Source = { name: "The Linux Documentation Project — Serial-HOWTO §19 (Pinouts), Text-Terminal-HOWTO §12", href: "https://tldp.org/HOWTO/Serial-HOWTO-19.html" };
const SRC_MODBUS: Source = { name: "MODBUS over serial line specification and implementation guide V1.02 (2006) — §3.5 Mechanical Interfaces, §3.6 Cables", href: "https://www.modbus.org/modbus-specifications" };
const SRC_TIA568: Source = { name: "ANSI/TIA-568 — T568A / T568B wiring (Wikipedia summary)", href: "https://en.wikipedia.org/wiki/ANSI/TIA-568" };
const SRC_IEEE: Source = { name: "IEEE 802.3 Ethernet (free via IEEE GET Program) — 10BASE-T, 100BASE-TX, 1000BASE-T MDI", href: "https://ieeexplore.ieee.org/browse/standards/get-program/page/series?id=68" };
const SRC_M12_WIKI: Source = { name: "M12 connector — codings and IEC 61076-2-101 / -109 / -104 (Wikipedia summary)", href: "https://en.wikipedia.org/wiki/M12_connector" };
const SRC_BANNER_M8: Source = { name: "Banner Engineering, M8 Connectivity Quick Ship (B_51882048) — M8 3/4-pin wire colours", href: "https://info.bannerengineering.com/cs/groups/public/documents/literature/b_51882048.pdf" };
const SRC_PF_D: Source = { name: "Pepperl+Fuchs, M12 D-coded female connector data sheet 209344 — PIN 1 TD+, 2 RD+, 3 TD−, 4 RD−", href: "https://files.pepperl-fuchs.com/webcat/navi/productInfo/edb/209344_eng.pdf" };
const SRC_FLIR_X: Source = { name: "Teledyne FLIR — Pin configurations, female X-coded M12 Ethernet connector", href: "https://docs.flir.com/T810579/en-US/latest/PinConfigurations-9CFFE032.html" };
const SRC_BANNER_X: Source = { name: "Banner Engineering, M12 X-Code 8-Pin Field Wireable Connector datasheet (249113)", href: "https://info.bannerengineering.com/cs/groups/public/documents/literature/249113.pdf" };
const SRC_IOLINK: Source = { name: "IO-Link Community — IO-Link Interface and System Specification (port pins L+, C/Q, L−)", href: "https://io-link.com/" };
const SRC_USB: Source = { name: "USB-IF document library — USB 2.0 Specification, USB Type-C Cable and Connector Specification", href: "https://www.usb.org/documents" };
const SRC_TI485: Source = { name: "Texas Instruments, RS-422 and RS-485 Standards Overview and System Configurations (SLLA070D)", href: "https://www.ti.com/lit/an/slla070d/slla070d.pdf" };

// RJ45 선 색 — T568A·T568B
const T568A: WireColor[] = ["w-gn", "gn", "w-or", "bu", "w-bu", "or", "w-bn", "bn"];
const T568B: WireColor[] = ["w-or", "or", "w-gn", "bu", "w-bu", "gn", "w-bn", "bn"];
const PAIR_A = [3, 3, 2, 1, 1, 2, 4, 4];
const PAIR_B = [2, 2, 3, 1, 1, 3, 4, 4];

export const CONNECTORS: Connector[] = [
  {
    id: "db9-rs232",
    cat: "serial",
    kind: "dsub9",
    name: t("DB9 RS-232 (DTE·DCE)", "DB9 RS-232 (DTE and DCE)"),
    sum: t("PC COM 포트의 9핀. 신호 이름은 DTE(PC) 기준 — DCE(모뎀 등)는 같은 핀에서 방향만 반대.", "The 9-pin PC COM port. Signal names are from the DTE (PC) side — a DCE (modem etc.) uses the same pins with directions reversed."),
    pinCount: 9,
    cols: [t("DTE(PC) 방향", "DTE (PC) direction"), t("DCE 방향", "DCE direction"), t("DB25 핀", "DB25 pin")],
    pins: [
      { n: "1", sig: t("DCD", "DCD"), desc: t("반송파 검출", "Data Carrier Detect"), x: [IN, OUT, t("8", "8")] },
      { n: "2", sig: t("RXD", "RXD"), desc: t("받는 데이터", "Received Data"), x: [IN, OUT, t("3", "3")] },
      { n: "3", sig: t("TXD", "TXD"), desc: t("보내는 데이터", "Transmitted Data"), x: [OUT, IN, t("2", "2")] },
      { n: "4", sig: t("DTR", "DTR"), desc: t("단말 준비", "Data Terminal Ready"), x: [OUT, IN, t("20", "20")] },
      { n: "5", sig: t("GND", "GND"), desc: t("신호 접지(공통)", "Signal ground (common)"), x: [NA, NA, t("7", "7")] },
      { n: "6", sig: t("DSR", "DSR"), desc: t("상대 준비", "Data Set Ready"), x: [IN, OUT, t("6", "6")] },
      { n: "7", sig: t("RTS", "RTS"), desc: t("송신 요청", "Request To Send"), x: [OUT, IN, t("4", "4")] },
      { n: "8", sig: t("CTS", "CTS"), desc: t("송신 허락", "Clear To Send"), x: [IN, OUT, t("5", "5")] },
      { n: "9", sig: t("RI", "RI"), desc: t("호출 표시", "Ring Indicator"), x: [IN, OUT, t("22", "22")] },
    ],
    notes: [
      t("PC 의 COM 포트는 보통 DTE 이고 수(핀) 커넥터입니다. 장비(PLC·계측기)가 DTE 인지 DCE 인지는 장비 매뉴얼의 핀 표로 확인합니다.", "A PC COM port is usually a DTE with a male (pin) connector. Whether a device (PLC, instrument) is DTE or DCE is in its manual's pin table."),
      t("DTE ↔ DCE 는 스트레이트(1:1) 케이블, DTE ↔ DTE 는 널 모뎀(2·3 엇갈림) 케이블입니다.", "DTE ↔ DCE uses a straight (1:1) cable; DTE ↔ DTE uses a null-modem cable (2 and 3 crossed)."),
      t("최소 결선은 TXD·RXD·GND 세 선입니다. 흐름 제어를 쓰면 RTS/CTS·DTR/DSR 도 잇습니다.", "The minimum is three wires: TXD, RXD and GND. Add RTS/CTS and DTR/DSR when flow control is used."),
      t("납땜 쪽(뒤)에서 보면 좌우가 바뀝니다 — 수 커넥터의 뒤 = 암 커넥터의 정면 배치.", "Seen from the solder (rear) side left and right swap — the rear of a male connector looks like the front of a female."),
    ],
    src: [SRC_TLDP, SRC_MODBUS],
    tags: ["db9", "de-9", "d-sub", "rs232", "rs-232", "com", "serial", "시리얼", "널 모뎀", "null modem", "dte", "dce", "txd", "rxd"],
    links: ["guides/rs232-db9-null-modem/", "tools/wiring/"],
  },
  {
    id: "db25-rs232",
    cat: "serial",
    kind: "dsub25",
    name: t("DB25 RS-232 주요 핀", "DB25 RS-232 main pins"),
    sum: t("옛 장비·모뎀의 25핀. 비동기 통신에 쓰는 핀만 적었습니다(나머지는 동기 클록·보조 채널 등).", "The 25-pin port of older equipment and modems. Only the pins used for asynchronous links are listed (the rest are sync clocks, secondary channel etc.)."),
    pinCount: 25,
    partial: true,
    cols: [t("DTE 방향", "DTE direction"), t("DB9 핀", "DB9 pin")],
    pins: [
      { n: "1", sig: t("PG", "PG"), desc: t("보호 접지(차폐)", "Protective ground (shield)"), x: [NA, NA] },
      { n: "2", sig: t("TXD", "TXD"), desc: t("보내는 데이터", "Transmitted Data"), x: [OUT, t("3", "3")] },
      { n: "3", sig: t("RXD", "RXD"), desc: t("받는 데이터", "Received Data"), x: [IN, t("2", "2")] },
      { n: "4", sig: t("RTS", "RTS"), desc: t("송신 요청", "Request To Send"), x: [OUT, t("7", "7")] },
      { n: "5", sig: t("CTS", "CTS"), desc: t("송신 허락", "Clear To Send"), x: [IN, t("8", "8")] },
      { n: "6", sig: t("DSR", "DSR"), desc: t("상대 준비", "Data Set Ready"), x: [IN, t("6", "6")] },
      { n: "7", sig: t("GND", "GND"), desc: t("신호 접지(공통)", "Signal ground (common)"), x: [NA, t("5", "5")] },
      { n: "8", sig: t("DCD", "DCD"), desc: t("반송파 검출", "Data Carrier Detect"), x: [IN, t("1", "1")] },
      { n: "20", sig: t("DTR", "DTR"), desc: t("단말 준비", "Data Terminal Ready"), x: [OUT, t("4", "4")] },
      { n: "22", sig: t("RI", "RI"), desc: t("호출 표시", "Ring Indicator"), x: [IN, t("9", "9")] },
    ],
    notes: [
      t("DB25 의 2번은 TXD, DB9 의 2번은 RXD 입니다 — 번호가 같아도 신호가 다릅니다. 변환 젠더는 오른쪽 칸 대응을 따릅니다.", "Pin 2 is TXD on DB25 but RXD on DB9 — same number, different signal. A DB9–DB25 adapter follows the mapping in the right column."),
      t("1번(보호 접지)과 7번(신호 접지)은 다른 핀입니다.", "Pin 1 (protective ground) and pin 7 (signal ground) are different pins."),
      t("빠진 번호의 핀은 장비마다 쓰임이 달라 적지 않았습니다 — 장비 매뉴얼 확인.", "Pins not listed are used differently by different equipment — check the manual."),
    ],
    src: [SRC_TLDP],
    tags: ["db25", "d-sub", "rs232", "rs-232", "25핀", "25-pin", "modem", "모뎀"],
    links: ["guides/rs232-db9-null-modem/"],
  },
  {
    id: "rj45-t568a",
    cat: "ethernet",
    kind: "rj45",
    name: t("RJ45 T568A 선 색", "RJ45 T568A colours"),
    sum: t("8핀 모듈러 플러그의 T568A 선 색 배치.", "T568A colour order for an 8-position modular plug."),
    pinCount: 8,
    cols: [t("쌍", "Pair")],
    pins: T568A.map((c, i) => ({ n: String(i + 1), sig: { ko: `쌍 ${PAIR_A[i]}`, en: `Pair ${PAIR_A[i]}` }, color: c, x: [t(String(PAIR_A[i]), String(PAIR_A[i]))] })),
    notes: [
      t("T568A 와 T568B 는 초록 쌍과 주황 쌍의 자리만 바뀝니다. 성능 차이는 없고, 한 현장 안에서 하나로 통일합니다.", "T568A and T568B only swap the green and orange pairs. There is no performance difference — pick one per site."),
      t("양 끝이 같으면 스트레이트, 한쪽 A·다른 쪽 B 면 크로스 케이블입니다(요즘 장비는 대부분 Auto MDI-X).", "Same scheme at both ends = straight; A at one end and B at the other = crossover (most equipment today has Auto MDI-X)."),
    ],
    src: [SRC_TIA568],
    tags: ["rj45", "8p8c", "t568a", "568a", "lan", "랜", "케이블", "cable", "ethernet", "이더넷"],
    links: ["tools/system-diagram/"],
  },
  {
    id: "rj45-t568b",
    cat: "ethernet",
    kind: "rj45",
    name: t("RJ45 T568B 선 색", "RJ45 T568B colours"),
    sum: t("8핀 모듈러 플러그의 T568B 선 색 배치 — 시판 랜 케이블에 흔한 배치.", "T568B colour order for an 8-position modular plug — common in ready-made patch cables."),
    pinCount: 8,
    cols: [t("쌍", "Pair")],
    pins: T568B.map((c, i) => ({ n: String(i + 1), sig: { ko: `쌍 ${PAIR_B[i]}`, en: `Pair ${PAIR_B[i]}` }, color: c, x: [t(String(PAIR_B[i]), String(PAIR_B[i]))] })),
    notes: [
      t("T568A 와 T568B 는 초록 쌍과 주황 쌍의 자리만 바뀝니다. 성능 차이는 없고, 한 현장 안에서 하나로 통일합니다.", "T568A and T568B only swap the green and orange pairs. There is no performance difference — pick one per site."),
      t("쌍이 되는 두 선(1·2, 3·6, 4·5, 7·8)은 꼬인 한 쌍이어야 합니다 — 1·2·3·4 처럼 순서대로 쌍을 지으면 잡음에 약해집니다.", "Each pair (1-2, 3-6, 4-5, 7-8) must be one twisted pair — pairing pins in plain order (1-2, 3-4…) makes the link noise-prone."),
    ],
    src: [SRC_TIA568],
    tags: ["rj45", "8p8c", "t568b", "568b", "lan", "랜", "케이블", "cable", "ethernet", "이더넷"],
    links: ["tools/system-diagram/"],
  },
  {
    id: "rj45-eth100",
    cat: "ethernet",
    kind: "rj45",
    name: t("RJ45 이더넷 10/100", "RJ45 Ethernet 10/100"),
    sum: t("10BASE-T·100BASE-TX 는 1·2·3·6 네 선만 씁니다(PC·랜카드 쪽 MDI 기준).", "10BASE-T and 100BASE-TX use only pins 1, 2, 3 and 6 (MDI, PC/NIC side)."),
    pinCount: 8,
    colorCol: t("선 색(T568B)", "Colour (T568B)"),
    pins: [
      { n: "1", sig: t("TX+", "TX+"), desc: t("보냄 +", "Transmit +"), color: "w-or" },
      { n: "2", sig: t("TX−", "TX−"), desc: t("보냄 −", "Transmit −"), color: "or" },
      { n: "3", sig: t("RX+", "RX+"), desc: t("받음 +", "Receive +"), color: "w-gn" },
      { n: "4", sig: t("(안 씀)", "(unused)"), desc: t("PoE 모드 B 에선 전원", "Power in PoE mode B"), color: "bu" },
      { n: "5", sig: t("(안 씀)", "(unused)"), desc: t("PoE 모드 B 에선 전원", "Power in PoE mode B"), color: "w-bu" },
      { n: "6", sig: t("RX−", "RX−"), desc: t("받음 −", "Receive −"), color: "gn" },
      { n: "7", sig: t("(안 씀)", "(unused)"), desc: t("PoE 모드 B 에선 전원", "Power in PoE mode B"), color: "w-bn" },
      { n: "8", sig: t("(안 씀)", "(unused)"), desc: t("PoE 모드 B 에선 전원", "Power in PoE mode B"), color: "bn" },
    ],
    notes: [
      t("스위치(MDI-X) 쪽은 1·2 가 받음, 3·6 이 보냄으로 반대입니다. 요즘 장비는 대부분 Auto MDI-X 라 케이블 종류를 가리지 않습니다.", "On a switch (MDI-X) 1-2 receive and 3-6 transmit. Most equipment now has Auto MDI-X, so either cable type works."),
      t("1·2 와 3·6 이 각각 꼬인 한 쌍이어야 합니다(3·6 이 떨어져 있는 이유).", "1-2 and 3-6 must each be one twisted pair (which is why 3 and 6 are apart)."),
      t("4선(2쌍) 케이블로도 100 Mbps 까지는 됩니다 — 1 Gbps 는 8선이 모두 필요합니다.", "A 4-wire (2-pair) cable carries up to 100 Mbps — 1 Gbps needs all eight wires."),
    ],
    src: [SRC_IEEE, SRC_TIA568],
    tags: ["rj45", "ethernet", "이더넷", "10base-t", "100base-tx", "fast ethernet", "mdi", "mdi-x", "poe", "lan", "랜"],
    links: ["tools/system-diagram/", "tools/gige-bandwidth/"],
  },
  {
    id: "rj45-eth1000",
    cat: "ethernet",
    kind: "rj45",
    name: t("RJ45 이더넷 1000BASE-T", "RJ45 Ethernet 1000BASE-T"),
    sum: t("기가비트는 네 쌍을 모두 양방향으로 씁니다.", "Gigabit uses all four pairs in both directions."),
    pinCount: 8,
    colorCol: t("선 색(T568B)", "Colour (T568B)"),
    pins: [
      { n: "1", sig: t("BI_DA+", "BI_DA+"), color: "w-or" },
      { n: "2", sig: t("BI_DA−", "BI_DA−"), color: "or" },
      { n: "3", sig: t("BI_DB+", "BI_DB+"), color: "w-gn" },
      { n: "4", sig: t("BI_DC+", "BI_DC+"), color: "bu" },
      { n: "5", sig: t("BI_DC−", "BI_DC−"), color: "w-bu" },
      { n: "6", sig: t("BI_DB−", "BI_DB−"), color: "gn" },
      { n: "7", sig: t("BI_DD+", "BI_DD+"), color: "w-bn" },
      { n: "8", sig: t("BI_DD−", "BI_DD−"), color: "bn" },
    ],
    notes: [
      t("한 쌍이라도 끊기면 100 Mbps 로 떨어지거나 링크가 안 됩니다 — 링크 속도가 100M 로 보이면 케이블·커넥터 압착부터 봅니다.", "One broken pair drops the link to 100 Mbps or kills it — if the link shows 100M, check the cable and crimps first."),
      t("구리 케이블 한 구간은 100 m(채널) 이하입니다.", "A copper channel is limited to 100 m."),
    ],
    src: [SRC_IEEE, SRC_TIA568],
    tags: ["rj45", "ethernet", "이더넷", "1000base-t", "gigabit", "기가비트", "gige", "bi_da", "lan", "랜"],
    links: ["tools/gige-bandwidth/", "guides/gige-camera-network-adapter/"],
  },
  {
    id: "rj45-modbus",
    cat: "rs485",
    kind: "rj45",
    name: t("Modbus RS-485 RJ45 (규격 권장)", "Modbus RS-485 on RJ45 (spec pin-out)"),
    sum: t("Modbus 직렬 규격 V1.02 §3.5 가 RJ45 를 쓸 때 지키라고 정한 핀. 장비 쪽은 차폐 암 커넥터.", "The pins Modbus serial line spec V1.02 §3.5 requires when an RJ45 is used. Device side is a shielded female connector."),
    pinCount: 8,
    cols: [t("4선식 이름", "4-wire name"), t("규격 요구", "Requirement"), t("EIA-485 이름", "EIA-485 name")],
    colorCol: t("규격 권장 색", "Spec colour"),
    colorNote: t("선 색은 규격 §3.6 의 권장 색입니다 — Cat5 랜 케이블 색과는 다릅니다.", "Colours are the spec's §3.6 recommendation — Cat 5 LAN cable colours differ."),
    pins: [
      { n: "1", sig: t("(4선식만) RXD0", "(4-wire only) RXD0"), color: "wh", x: [t("RXD0", "RXD0"), t("4선식에서 필수", "required (4W)"), t("A'", "A'")] },
      { n: "2", sig: t("(4선식만) RXD1", "(4-wire only) RXD1"), color: "bu", x: [t("RXD1", "RXD1"), t("4선식에서 필수", "required (4W)"), t("B'", "B'")] },
      { n: "3", sig: t("PMC", "PMC"), desc: t("포트 모드 제어", "Port Mode Control"), x: [t("PMC", "PMC"), t("선택", "optional"), NA] },
      { n: "4", sig: t("D1", "D1"), desc: t("송수신 1 — V1 > V0 이면 1(OFF)", "Transceiver 1 — binary 1 (OFF) when V1 > V0"), color: "ye", x: [t("TXD1", "TXD1"), t("필수", "required"), t("B/B'", "B/B'")] },
      { n: "5", sig: t("D0", "D0"), desc: t("송수신 0", "Transceiver 0"), color: "bn", x: [t("TXD0", "TXD0"), t("필수", "required"), t("A/A'", "A/A'")] },
      { n: "6", sig: t("(규격에 없음)", "(not assigned)"), x: [NA, NA, NA] },
      { n: "7", sig: t("VP", "VP"), desc: t("+5…24 V DC 전원", "+5…24 V DC supply"), x: [t("VP", "VP"), t("권장", "recommended"), NA] },
      { n: "8", sig: t("Common", "Common"), desc: t("신호·전원 공통", "Signal and power common"), color: "gy", x: [t("Common", "Common"), t("필수", "required"), t("C/C'", "C/C'")] },
    ],
    notes: [
      t("규격 원문: «2선식 Modbus 에 크로스 케이블을 이으면 손상될 수 있다» 고 사용자에게 알리라고 적혀 있습니다 — 랜 크로스 케이블을 꽂지 않습니다.", "The spec asks makers to warn: «Connection of a crossed cable in a 2-wire MODBUS system may cause damages» — do not plug in a LAN crossover cable."),
      t("RJ45 를 쓰는 장비 중 이 배치를 따르지 않는 것이 많습니다(제조사마다 다름) — 장비 매뉴얼의 핀 표가 우선입니다.", "Many devices with an RJ45 do not follow this pin-out (varies by maker) — the device manual's pin table comes first."),
      t("2선과 4선을 모두 지원하는 포트는 4선 이름(TXD1·TXD0)으로 적습니다.", "A port that supports both 2-wire and 4-wire uses the 4-wire names (TXD1, TXD0)."),
    ],
    src: [SRC_MODBUS],
    tags: ["modbus", "모드버스", "rs485", "rs-485", "rj45", "d1", "d0", "common", "vp", "pmc", "rtu"],
    links: ["tools/wiring/", "guides/rs485-wiring/", "tools/rs485/"],
  },
  {
    id: "db9-modbus",
    cat: "rs485",
    kind: "dsub9",
    name: t("Modbus RS-485 DB9 (규격 권장)", "Modbus RS-485 on DB9 (spec pin-out)"),
    sum: t("Modbus 직렬 규격 V1.02 §3.5 의 9핀 D-sub 배치. RS-232 DB9 와 핀이 전혀 다릅니다.", "The 9-pin D-sub pin-out from Modbus serial line spec V1.02 §3.5. Completely different from RS-232 DB9."),
    pinCount: 9,
    cols: [t("4선식 이름", "4-wire name"), t("규격 요구", "Requirement"), t("EIA-485 이름", "EIA-485 name")],
    pins: [
      { n: "1", sig: t("Common", "Common"), desc: t("신호·전원 공통", "Signal and power common"), x: [t("Common", "Common"), t("필수", "required"), t("C/C'", "C/C'")] },
      { n: "2", sig: t("VP", "VP"), desc: t("+5…24 V DC 전원", "+5…24 V DC supply"), x: [t("VP", "VP"), t("권장", "recommended"), NA] },
      { n: "3", sig: t("PMC", "PMC"), desc: t("포트 모드 제어", "Port Mode Control"), x: [t("PMC", "PMC"), t("선택", "optional"), NA] },
      { n: "4", sig: t("(4선식만) RXD1", "(4-wire only) RXD1"), x: [t("RXD1", "RXD1"), t("4선식에서 필수", "required (4W)"), t("B'", "B'")] },
      { n: "5", sig: t("D1", "D1"), desc: t("송수신 1", "Transceiver 1"), x: [t("TXD1", "TXD1"), t("필수", "required"), t("B/B'", "B/B'")] },
      { n: "6", sig: t("(규격에 없음)", "(not assigned)"), x: [NA, NA, NA] },
      { n: "7", sig: t("(규격에 없음)", "(not assigned)"), x: [NA, NA, NA] },
      { n: "8", sig: t("(4선식만) RXD0", "(4-wire only) RXD0"), x: [t("RXD0", "RXD0"), t("4선식에서 필수", "required (4W)"), t("A'", "A'")] },
      { n: "9", sig: t("D0", "D0"), desc: t("송수신 0", "Transceiver 0"), x: [t("TXD0", "TXD0"), t("필수", "required"), t("A/A'", "A/A'")] },
    ],
    notes: [
      t("규격은 장비 쪽에 차폐된 암 커넥터, 케이블 끝에 수 커넥터를 쓰라고 정합니다.", "The spec calls for a shielded female connector on the device and a male connector on the cable end."),
      t("같은 DB9 라도 RS-232 장비(2 RXD·3 TXD·5 GND)와 섞어 꽂지 않습니다. 실제 장비의 DB9 배치는 제조사마다 다름 — 매뉴얼 확인.", "Do not mix it up with RS-232 DB9 (2 RXD, 3 TXD, 5 GND). Real devices' DB9 pin-outs vary by maker — check the manual."),
    ],
    src: [SRC_MODBUS],
    tags: ["modbus", "모드버스", "rs485", "rs-485", "db9", "d-sub", "d1", "d0", "common", "rtu"],
    links: ["tools/wiring/", "guides/rs485-wiring/"],
  },
  {
    id: "rs485-terms",
    cat: "rs485",
    kind: "list",
    name: t("RS-485 단자 표기 대조 (A/B, D+/D−, TRX±)", "RS-485 terminal names compared (A/B, D+/D−, TRX±)"),
    sum: t("단자대에 적힌 이름이 제조사마다 다릅니다. Modbus 규격 이름(D1·D0·Common)으로 맞춰 봅니다.", "Terminal labels differ by maker. Line them up by the Modbus spec names (D1, D0, Common)."),
    pinCount: 3,
    ids: ["D1", "D0", "C"],
    cols: [t("EIA-485 이름", "EIA-485 name"), t("흔한 표기", "Common labels")],
    pins: [
      { n: "D1", sig: t("D1 (+ 쪽)", "D1 (+ side)"), desc: t("1(OFF)일 때 전압이 높은 선", "Higher voltage for binary 1 (OFF)"), x: [t("B", "B"), t("B · + · D+ · TRX+ · 485+ · Data+ · TXD1", "B · + · D+ · TRX+ · 485+ · Data+ · TXD1")] },
      { n: "D0", sig: t("D0 (− 쪽)", "D0 (− side)"), desc: t("0(ON)일 때 전압이 높은 선", "Higher voltage for binary 0 (ON)"), x: [t("A", "A"), t("A · − · D− · TRX− · 485− · Data− · TXD0", "A · − · D− · TRX− · 485− · Data− · TXD0")] },
      { n: "C", sig: t("Common", "Common"), desc: t("신호 공통(0 V)", "Signal common (0 V)"), x: [t("C", "C"), t("SG · GND · COM · 0V · C", "SG · GND · COM · 0V · C")] },
    ],
    notes: [
      t("A 를 + 로 적는 제조사도 있습니다(제조사마다 다름). 글자보다 «1(OFF)일 때 높은 쪽 = D1» 로 맞추고, 응답이 전혀 없으면 두 선을 바꿔 봅니다 — 극성이 반대여도 장비는 대개 상하지 않습니다.", "Some makers label A as + (varies by maker). Match by «the line that is higher for binary 1 is D1» rather than by letter; if nothing answers, swap the two wires — reversed polarity normally does not damage devices."),
      t("Common(SG) 선은 «2선식» 이라도 따로 잇는 것이 규격의 요구입니다.", "The spec requires a Common (SG) wire even on a «2-wire» bus."),
      t("규격 권장 선 색: D1 노랑, D0 갈색, Common 회색(§3.6).", "Spec-recommended colours: D1 yellow, D0 brown, Common grey (§3.6)."),
    ],
    src: [SRC_MODBUS, SRC_TI485],
    tags: ["rs485", "rs-485", "a/b", "d+", "d-", "trx", "485+", "sg", "terminal", "단자", "극성", "polarity", "modbus"],
    links: ["tools/wiring/", "guides/rs485-wiring/", "guides/rs485-bias-termination/"],
  },
  {
    id: "m12a-4",
    cat: "sensor",
    kind: "list",
    name: t("M12 A-코드 4핀 센서", "M12 A-coded 4-pin sensor"),
    sum: t("근접·광전 센서에 흔한 4핀. 선 색은 IEC 60947-5-2 관례 — 기능은 제조사 확인.", "The common 4-pin for proximity and photo sensors. Colours follow the IEC 60947-5-2 convention — check functions with the maker."),
    pinCount: 4,
    colorNote: t("선 색은 관례입니다 — 센서·케이블 제조사 데이터시트 확인.", "Colours are a convention — check the sensor and cable datasheets."),
    pins: [
      { n: "1", sig: t("+ (L+)", "+ (L+)"), desc: t("전원 +(보통 +24 V)", "Supply + (usually +24 V)"), color: "bn" },
      { n: "2", sig: t("둘째 출력 등", "2nd output etc."), desc: t("제조사마다 다름(반전 출력·티치 입력 등)", "Varies by maker (inverted output, teach input…)"), color: "wh" },
      { n: "3", sig: t("− (0 V, L−)", "− (0 V, L−)"), desc: t("전원 −", "Supply −"), color: "bu" },
      { n: "4", sig: t("출력 (C/Q)", "Output (C/Q)"), desc: t("스위칭 출력, IO-Link 장비는 C/Q", "Switching output; C/Q on IO-Link devices"), color: "bk" },
    ],
    notes: [
      t("3선 센서(갈색·파랑·검정)를 M12 4핀에 쓰면 2번이 빕니다.", "A 3-wire sensor (brown, blue, black) on an M12 4-pin leaves pin 2 empty."),
      t("핀이 원형으로 놓인 위치·키 홈 방향은 제조사 도면마다 그리는 방향이 달라 이 그림은 번호 목록만 보여 줍니다.", "Where each pin sits on the round face is drawn differently in makers' drawings, so this figure only lists the numbers."),
    ],
    src: [SRC_M12_WIKI, SRC_IOLINK, SRC_BANNER_M8],
    tags: ["m12", "a-code", "a-coded", "a코드", "sensor", "센서", "근접", "proximity", "io-link", "갈색", "brown", "npn", "pnp"],
    links: ["tools/wiring/"],
  },
  {
    id: "m12a-5",
    cat: "sensor",
    kind: "list",
    name: t("M12 A-코드 5핀", "M12 A-coded 5-pin"),
    sum: t("4핀에 가운데 5번(회색)이 더해진 배치.", "The 4-pin layout plus a centre pin 5 (grey)."),
    pinCount: 5,
    colorNote: t("선 색은 관례입니다 — 센서·케이블 제조사 데이터시트 확인.", "Colours are a convention — check the sensor and cable datasheets."),
    pins: [
      { n: "1", sig: t("+ (L+)", "+ (L+)"), desc: t("전원 +", "Supply +"), color: "bn" },
      { n: "2", sig: t("제조사마다 다름", "Varies by maker"), color: "wh" },
      { n: "3", sig: t("− (0 V, L−)", "− (0 V, L−)"), desc: t("전원 −", "Supply −"), color: "bu" },
      { n: "4", sig: t("출력 (C/Q)", "Output (C/Q)"), color: "bk" },
      { n: "5", sig: t("제조사마다 다름", "Varies by maker"), desc: t("가운데 핀", "Centre pin"), color: "gy" },
    ],
    notes: [
      t("5핀 M12 는 센서 말고도 CANopen·DeviceNet 등 다른 신호에 쓰입니다 — 같은 모양이어도 장비 매뉴얼 확인.", "5-pin M12 is also used for other signals such as CANopen and DeviceNet — check the manual even if the plug fits."),
    ],
    src: [SRC_M12_WIKI, SRC_BANNER_M8],
    tags: ["m12", "a-code", "a-coded", "5pin", "5핀", "sensor", "센서", "grey", "회색"],
    links: ["tools/wiring/"],
  },
  {
    id: "m12a-8",
    cat: "sensor",
    kind: "list",
    name: t("M12 A-코드 8핀", "M12 A-coded 8-pin"),
    sum: t("밸브 단자·여러 신호용 8핀. 기능은 장비마다 다르고, 선 색은 흔히 쓰는 예입니다.", "8-pin for valve terminals and multi-signal devices. Functions vary by device; colours are a common example."),
    pinCount: 8,
    colorCol: t("선 색(흔한 예)", "Colour (common example)"),
    colorNote: t("8핀 케이블 색은 제조사마다 다름 — 이 색은 흔히 쓰는 예입니다. 케이블 데이터시트 확인.", "8-pin cable colours vary by maker — these are a common example. Check the cable datasheet."),
    pins: [
      { n: "1", sig: t("장비마다 다름", "Varies by device"), color: "wh" },
      { n: "2", sig: t("장비마다 다름", "Varies by device"), color: "bn" },
      { n: "3", sig: t("장비마다 다름", "Varies by device"), color: "gn" },
      { n: "4", sig: t("장비마다 다름", "Varies by device"), color: "ye" },
      { n: "5", sig: t("장비마다 다름", "Varies by device"), color: "gy" },
      { n: "6", sig: t("장비마다 다름", "Varies by device"), color: "pk" },
      { n: "7", sig: t("장비마다 다름", "Varies by device"), color: "bu" },
      { n: "8", sig: t("장비마다 다름", "Varies by device"), desc: t("가운데 핀", "Centre pin"), color: "rd" },
    ],
    notes: [
      t("8핀은 4핀 센서와 색 순서가 다릅니다(1번이 흰색, 2번이 갈색) — 4핀 관례로 짐작하지 않습니다.", "The 8-pin colour order differs from 4-pin sensors (pin 1 white, pin 2 brown) — do not assume the 4-pin convention."),
      t("이더넷용 8핀은 X-코드(다른 키)이고 이 배치와 다릅니다.", "8-pin Ethernet is X-coded (different key) and differs from this."),
    ],
    src: [SRC_M12_WIKI],
    tags: ["m12", "a-code", "8pin", "8핀", "valve", "밸브", "sensor", "센서"],
  },
  {
    id: "m12d-eth",
    cat: "ethernet",
    kind: "list",
    name: t("M12 D-코드 이더넷 (4핀)", "M12 D-coded Ethernet (4-pin)"),
    sum: t("PROFINET·EtherNet/IP 등 산업용 100 Mbps 이더넷. 네 선(두 쌍).", "Industrial 100 Mbps Ethernet such as PROFINET and EtherNet/IP. Four wires (two pairs)."),
    pinCount: 4,
    cols: [t("RJ45 핀", "RJ45 pin")],
    colorNote: t("선 색은 PROFINET 케이블에 흔한 색입니다 — 케이블 제조사마다 다를 수 있음.", "Colours are common on PROFINET cables — they can differ by cable maker."),
    pins: [
      { n: "1", sig: t("TD+", "TD+"), desc: t("보냄 +", "Transmit +"), color: "ye", x: [t("1", "1")] },
      { n: "2", sig: t("RD+", "RD+"), desc: t("받음 +", "Receive +"), color: "wh", x: [t("3", "3")] },
      { n: "3", sig: t("TD−", "TD−"), desc: t("보냄 −", "Transmit −"), color: "or", x: [t("2", "2")] },
      { n: "4", sig: t("RD−", "RD−"), desc: t("받음 −", "Receive −"), color: "bu", x: [t("6", "6")] },
    ],
    notes: [
      t("쌍은 1·3(TD±)과 2·4(RD±)입니다 — 번호 순서대로가 아닙니다. M12 ↔ RJ45 는 1→1, 2→3, 3→2, 4→6.", "Pairs are 1-3 (TD±) and 2-4 (RD±) — not in number order. M12 ↔ RJ45: 1→1, 2→3, 3→2, 4→6."),
      t("두 쌍뿐이라 100 Mbps 까지입니다. 1 Gbps 이상은 X-코드.", "Two pairs only, so up to 100 Mbps. Use X-coding for 1 Gbps and above."),
    ],
    src: [SRC_PF_D, SRC_M12_WIKI],
    tags: ["m12", "d-code", "d-coded", "d코드", "profinet", "ethernet/ip", "ethernet", "이더넷", "td+", "rd+"],
    links: ["tools/system-diagram/"],
  },
  {
    id: "m12x-eth",
    cat: "ethernet",
    kind: "list",
    name: t("M12 X-코드 이더넷 (8핀)", "M12 X-coded Ethernet (8-pin)"),
    sum: t("1 Gbps 이상 산업용 이더넷의 8핀(IEC 61076-2-109).", "8-pin for industrial Ethernet at 1 Gbps and above (IEC 61076-2-109)."),
    pinCount: 8,
    cols: [t("RJ45 핀", "RJ45 pin")],
    colorCol: t("선 색(T568B 대응)", "Colour (T568B equivalent)"),
    colorNote: t("선 색은 T568B 의 같은 신호 색입니다(현장 조립형 예) — 케이블마다 다를 수 있음.", "Colours are those of the same signals in T568B (field-wireable example) — cables can differ."),
    pins: [
      { n: "1", sig: t("DA+", "DA+"), color: "w-or", x: [t("1", "1")] },
      { n: "2", sig: t("DA−", "DA−"), color: "or", x: [t("2", "2")] },
      { n: "3", sig: t("DB+", "DB+"), color: "w-gn", x: [t("3", "3")] },
      { n: "4", sig: t("DB−", "DB−"), color: "gn", x: [t("6", "6")] },
      { n: "5", sig: t("DD+", "DD+"), color: "w-bn", x: [t("7", "7")] },
      { n: "6", sig: t("DD−", "DD−"), color: "bn", x: [t("8", "8")] },
      { n: "7", sig: t("DC−", "DC−"), color: "w-bu", x: [t("5", "5")] },
      { n: "8", sig: t("DC+", "DC+"), color: "bu", x: [t("4", "4")] },
    ],
    notes: [
      t("7번이 DC−, 8번이 DC+ 로 다른 쌍과 순서가 반대입니다 — RJ45 로 바꿀 때 4·5 를 엇갈리지 않게 봅니다.", "Pin 7 is DC− and pin 8 is DC+, the reverse of the other pairs — watch pins 4 and 5 when converting to RJ45."),
    ],
    src: [SRC_FLIR_X, SRC_BANNER_X, SRC_M12_WIKI],
    tags: ["m12", "x-code", "x-coded", "x코드", "gigabit", "기가비트", "ethernet", "이더넷", "1000base-t", "camera", "카메라"],
    links: ["tools/gige-bandwidth/"],
  },
  {
    id: "m8-3",
    cat: "sensor",
    kind: "list",
    name: t("M8 3핀 센서", "M8 3-pin sensor"),
    sum: t("작은 센서용 M8 3핀. 핀 번호가 1·3·4 입니다(2번 없음).", "The M8 3-pin for small sensors. Pins are numbered 1, 3 and 4 (no pin 2)."),
    pinCount: 3,
    ids: ["1", "3", "4"],
    colorNote: t("선 색은 관례입니다 — 센서·케이블 제조사 데이터시트 확인.", "Colours are a convention — check the sensor and cable datasheets."),
    pins: [
      { n: "1", sig: t("+ (L+)", "+ (L+)"), desc: t("전원 +", "Supply +"), color: "bn" },
      { n: "3", sig: t("− (0 V)", "− (0 V)"), desc: t("전원 −", "Supply −"), color: "bu" },
      { n: "4", sig: t("출력", "Output"), color: "bk" },
    ],
    notes: [
      t("M8 3핀은 4핀 배치에서 2번만 뺀 번호를 씁니다 — 그래서 출력이 3번이 아니라 4번입니다.", "M8 3-pin keeps the 4-pin numbering minus pin 2 — so the output is pin 4, not 3."),
      t("원형 정면의 핀 위치는 제조사 도면으로 확인합니다(이 그림은 번호 목록).", "Check pin positions on the round face in the maker's drawing (this figure is a number list)."),
    ],
    src: [SRC_BANNER_M8, SRC_M12_WIKI],
    tags: ["m8", "3pin", "3핀", "sensor", "센서", "갈색", "brown", "npn", "pnp"],
    links: ["tools/wiring/"],
  },
  {
    id: "m8-4",
    cat: "sensor",
    kind: "list",
    name: t("M8 4핀 센서", "M8 4-pin sensor"),
    sum: t("M8 4핀 — 색은 M12 4핀과 같은 관례.", "M8 4-pin — same colour convention as M12 4-pin."),
    pinCount: 4,
    colorNote: t("선 색은 관례입니다 — 센서·케이블 제조사 데이터시트 확인.", "Colours are a convention — check the sensor and cable datasheets."),
    pins: [
      { n: "1", sig: t("+ (L+)", "+ (L+)"), desc: t("전원 +", "Supply +"), color: "bn" },
      { n: "2", sig: t("둘째 출력 등", "2nd output etc."), desc: t("제조사마다 다름", "Varies by maker"), color: "wh" },
      { n: "3", sig: t("− (0 V)", "− (0 V)"), desc: t("전원 −", "Supply −"), color: "bu" },
      { n: "4", sig: t("출력", "Output"), color: "bk" },
    ],
    notes: [t("원형 정면의 핀 위치는 제조사 도면으로 확인합니다(이 그림은 번호 목록).", "Check pin positions on the round face in the maker's drawing (this figure is a number list).")],
    src: [SRC_BANNER_M8],
    tags: ["m8", "4pin", "4핀", "sensor", "센서"],
    links: ["tools/wiring/"],
  },
  {
    id: "usb-ab",
    cat: "usb",
    kind: "list",
    name: t("USB-A · USB-B (USB 2.0)", "USB-A and USB-B (USB 2.0)"),
    sum: t("USB 2.0 의 네 핀 — 전원 둘, 데이터 둘.", "The four USB 2.0 pins — two for power, two for data."),
    pinCount: 4,
    colorCol: t("케이블 선 색(흔한 색)", "Cable colour (usual)"),
    pins: [
      { n: "1", sig: t("VBUS", "VBUS"), desc: t("+5 V", "+5 V"), color: "rd" },
      { n: "2", sig: t("D−", "D−"), desc: t("데이터 −", "Data −"), color: "wh" },
      { n: "3", sig: t("D+", "D+"), desc: t("데이터 +", "Data +"), color: "gn" },
      { n: "4", sig: t("GND", "GND"), desc: t("접지", "Ground"), color: "bk" },
    ],
    notes: [
      t("1·4번(전원) 접점이 길어 데이터보다 먼저 닿습니다.", "Pins 1 and 4 (power) are longer, so they make contact before the data pins."),
      t("USB 3.x 의 A·B 는 SuperSpeed 용 핀이 더 있습니다(이 표는 2.0 의 네 핀). Mini·Micro-B 는 5핀(4번 ID, 5번 GND).", "USB 3.x A and B add SuperSpeed pins (this table is the four 2.0 pins). Mini and Micro-B have 5 pins (4 ID, 5 GND)."),
      t("USB-시리얼 변환기가 자꾸 끊기면 케이블·허브·절전을 먼저 봅니다.", "If a USB-serial adapter keeps dropping, check the cable, hub and power saving first."),
    ],
    src: [SRC_USB],
    tags: ["usb", "usb-a", "usb-b", "usb2", "vbus", "d+", "d-", "5v"],
    links: ["guides/usb-serial-disconnects/"],
  },
  {
    id: "usb-c",
    cat: "usb",
    kind: "usbc",
    name: t("USB-C 리셉터클 기본 핀", "USB-C receptacle basic pins"),
    sum: t("24핀 — 위 줄 A1~A12, 아래 줄 B1~B12 가 180° 돌려 같은 자리. USB 2.0 데이터는 A6/A7·B6/B7.", "24 pins — row A1–A12 on top, row B1–B12 rotated 180°. USB 2.0 data is on A6/A7 and B6/B7."),
    pinCount: 24,
    pins: [
      { n: "A1", sig: t("GND", "GND") },
      { n: "A2", sig: t("TX1+", "TX1+"), desc: t("SuperSpeed", "SuperSpeed") },
      { n: "A3", sig: t("TX1−", "TX1−"), desc: t("SuperSpeed", "SuperSpeed") },
      { n: "A4", sig: t("VBUS", "VBUS") },
      { n: "A5", sig: t("CC1", "CC1"), desc: t("연결·방향·전원 협상", "Detection, orientation, power negotiation") },
      { n: "A6", sig: t("D+", "D+"), desc: t("USB 2.0", "USB 2.0") },
      { n: "A7", sig: t("D−", "D−"), desc: t("USB 2.0", "USB 2.0") },
      { n: "A8", sig: t("SBU1", "SBU1"), desc: t("보조 신호", "Sideband use") },
      { n: "A9", sig: t("VBUS", "VBUS") },
      { n: "A10", sig: t("RX2−", "RX2−"), desc: t("SuperSpeed", "SuperSpeed") },
      { n: "A11", sig: t("RX2+", "RX2+"), desc: t("SuperSpeed", "SuperSpeed") },
      { n: "A12", sig: t("GND", "GND") },
      { n: "B1", sig: t("GND", "GND") },
      { n: "B2", sig: t("TX2+", "TX2+"), desc: t("SuperSpeed", "SuperSpeed") },
      { n: "B3", sig: t("TX2−", "TX2−"), desc: t("SuperSpeed", "SuperSpeed") },
      { n: "B4", sig: t("VBUS", "VBUS") },
      { n: "B5", sig: t("CC2", "CC2"), desc: t("연결·방향·전원 협상", "Detection, orientation, power negotiation") },
      { n: "B6", sig: t("D+", "D+"), desc: t("USB 2.0", "USB 2.0") },
      { n: "B7", sig: t("D−", "D−"), desc: t("USB 2.0", "USB 2.0") },
      { n: "B8", sig: t("SBU2", "SBU2"), desc: t("보조 신호", "Sideband use") },
      { n: "B9", sig: t("VBUS", "VBUS") },
      { n: "B10", sig: t("RX1−", "RX1−"), desc: t("SuperSpeed", "SuperSpeed") },
      { n: "B11", sig: t("RX1+", "RX1+"), desc: t("SuperSpeed", "SuperSpeed") },
      { n: "B12", sig: t("GND", "GND") },
    ],
    notes: [
      t("USB-C 끼리는 CC 핀으로 연결을 알아낸 뒤에야 VBUS 에 전원을 냅니다 — C 포트 장비에 CC 저항이 없으면 C-C 케이블로는 전원을 못 받고 A→C 케이블로만 되는 일이 있습니다.", "Between USB-C ports VBUS is only switched on after detection on the CC pins — a device whose C port lacks the CC resistor may get no power over a C-to-C cable and work only with an A-to-C cable."),
      t("플러그(수)는 CC 선이 하나뿐이고 다른 자리는 VCONN 으로 씁니다(전자 표시 케이블).", "A plug has a single CC wire; the other position is used as VCONN (e-marked cables)."),
    ],
    src: [SRC_USB],
    tags: ["usb-c", "usbc", "type-c", "타입c", "cc", "vbus", "sbu", "d+", "d-"],
    links: ["guides/usb-serial-disconnects/"],
  },
];

// ---------- 찾기·검사

/** 이 커넥터에 있어야 할 핀 번호 */
export function expectedIds(c: Connector): string[] {
  if (c.ids) return c.ids;
  if (c.kind === "usbc") return [...Array.from({ length: 12 }, (_, i) => `A${i + 1}`), ...Array.from({ length: 12 }, (_, i) => `B${i + 1}`)];
  return Array.from({ length: c.pinCount }, (_, i) => String(i + 1));
}

/** 핀 번호 검사 — 중복·범위 밖·빠짐(partial 이면 빠짐은 봐 줌). 문제 목록(빈 배열이면 통과) */
export function checkPins(c: Connector): string[] {
  const out: string[] = [];
  const exp = new Set(expectedIds(c));
  const seen = new Set<string>();
  for (const p of c.pins) {
    if (seen.has(p.n)) out.push(`${c.id}: duplicate pin ${p.n}`);
    seen.add(p.n);
    if (!exp.has(p.n)) out.push(`${c.id}: pin ${p.n} out of range`);
    if ((p.x?.length ?? 0) !== (c.cols?.length ?? 0)) out.push(`${c.id}: pin ${p.n} has ${p.x?.length ?? 0} extra cells, expected ${c.cols?.length ?? 0}`);
    if (!p.sig.ko.trim() || !p.sig.en.trim()) out.push(`${c.id}: pin ${p.n} empty signal`);
  }
  if (!c.partial) for (const n of exp) if (!seen.has(n)) out.push(`${c.id}: missing pin ${n}`);
  if (exp.size !== (c.ids ? c.ids.length : c.kind === "usbc" ? 24 : c.pinCount)) out.push(`${c.id}: pinCount mismatch`);
  if (c.kind === "usbc" && c.pinCount !== 24) out.push(`${c.id}: usb-c needs 24 pins`);
  if (c.kind === "dsub9" && c.pinCount !== 9) out.push(`${c.id}: dsub9 needs 9`);
  if (c.kind === "dsub25" && c.pinCount !== 25) out.push(`${c.id}: dsub25 needs 25`);
  if (c.kind === "rj45" && c.pinCount !== 8) out.push(`${c.id}: rj45 needs 8`);
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_/·()]+/g, "");

/** 찾기 — 낱말(빈칸으로 나눈 모두가 들어 있어야)·묶음 */
export function filterConnectors(q: string, cat: Category | "" = "", list: Connector[] = CONNECTORS, lang?: Lang): Connector[] {
  const words = q.trim().split(/\s+/).map(norm).filter(Boolean);
  return list.filter((c) => {
    if (cat && c.cat !== cat) return false;
    if (!words.length) return true;
    // 추가 언어(ja 등) 쪽이면 그 언어 이름·설명도 찾는다
    const extra = lang && lang !== "ko" && lang !== "en" ? [trTx(c.name, lang), trTx(c.sum, lang), ...c.pins.map((p) => trTx(p.sig, lang))] : [];
    const hay = norm([c.id, c.name.ko, c.name.en, c.sum.ko, c.sum.en, ...c.tags, ...c.pins.flatMap((p) => [p.sig.ko, p.sig.en]), ...extra].join(" "));
    return words.every((w) => hay.includes(w));
  });
}

export const connectorById = (id: string) => CONNECTORS.find((c) => c.id === id);

// ---------- 그림

export type ViewId = "male" | "female" | "plug" | "jack" | "front" | "list";

export const VIEWS: Record<Kind, ViewId[]> = {
  dsub9: ["male", "female"],
  dsub25: ["male", "female"],
  rj45: ["plug", "jack"],
  usbc: ["front"],
  list: ["list"],
};

export const VIEW_NAME: Record<ViewId, L> = {
  male: t("수(핀) — 핀 쪽 정면에서 봄", "Male (pins) — front, pin side"),
  female: t("암(소켓) — 정면에서 봄", "Female (socket) — front view"),
  plug: t("수(플러그) — 접점이 보이게, 걸쇠는 뒤, 케이블은 아래", "Male (plug) — contacts facing you, latch at the back, cable down"),
  jack: t("암(잭) — 정면, 걸쇠 홈이 아래", "Female (jack) — front, latch slot down"),
  front: t("암(리셉터클) — 정면에서 봄", "Female (receptacle) — front view"),
  list: t("번호 목록 — 실제 핀 위치 그림이 아님", "Number list — not the physical pin layout"),
};

const n1 = (v: number) => String(Math.round(v * 10) / 10);

function pinXY(c: Connector, view: ViewId): { id: string; x: number; y: number }[] {
  if (c.kind === "dsub9" || c.kind === "dsub25") {
    const top = c.kind === "dsub9" ? 5 : 13;
    const gap = c.kind === "dsub9" ? 46 : 30;
    const W = c.kind === "dsub9" ? 360 : 520;
    const out: { id: string; x: number; y: number }[] = [];
    const x0 = W / 2 - ((top - 1) * gap) / 2;
    for (let i = 0; i < c.pinCount; i++) {
      const row = i < top ? 0 : 1;
      const k = row === 0 ? i : i - top;
      let x = row === 0 ? x0 + k * gap : x0 + gap / 2 + k * gap;
      // 암 정면은 좌우가 거울
      if (view === "female") x = W - x;
      out.push({ id: String(i + 1), x, y: row === 0 ? 70 : 118 });
    }
    return out;
  }
  if (c.kind === "rj45") return Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), x: 96 + i * 24, y: 0 }));
  if (c.kind === "usbc") {
    const out: { id: string; x: number; y: number }[] = [];
    for (let i = 0; i < 12; i++) out.push({ id: `A${i + 1}`, x: 70 + i * 34, y: 78 });
    for (let i = 0; i < 12; i++) out.push({ id: `B${12 - i}`, x: 70 + i * 34, y: 122 });
    return out;
  }
  return [];
}


function swatch(x: number, y: number, w: number, h: number, col: WireColor, pal: Palette) {
  const c = WIRE[col];
  const base = `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="2" fill="${c.hex}" stroke="${pal.line}" stroke-width="1"/>`;
  if (!c.stripe) return base;
  const s: string[] = [base];
  // 줄무늬: 같은 색 띠 세 개
  for (let k = 0; k < 3; k++) s.push(`<rect x="${n1(x + 1)}" y="${n1(y + h * (0.12 + k * 0.33))}" width="${n1(w - 2)}" height="${n1(h * 0.16)}" fill="${c.stripe}"/>`);
  return s.join("");
}

export interface SvgOpts {
  lang: Lang;
  pal?: Palette;
  /** 강조할 핀 번호 */
  hl?: string;
  /** 배경 칠(저장용) */
  bg?: boolean;
  /** 아래 작은 글 */
  footer?: string;
}

/** 커넥터 정면 그림(SVG 글). 핀마다 data-pin 이 붙어 있어 화면에서 눌러 강조할 수 있다 */
export function pinoutSvg(c: Connector, view: ViewId, o: SvgOpts): string {
  const pal = o.pal ?? LIGHT;
  const L = (x: L) => trTx(x, o.lang);
  const pinOf = new Map(c.pins.map((p) => [p.n, p]));
  const body: string[] = [];
  let W = 360;
  let H = 180;
  const label = (x: number, y: number, s: string, size = 11, c2 = pal.ink, anchor = "middle", bold = false) =>
    `<text x="${n1(x)}" y="${n1(y)}" text-anchor="${anchor}" font-size="${size}"${bold ? ' font-weight="700"' : ""} fill="${c2}">${esc(s)}</text>`;

  if (c.kind === "dsub9" || c.kind === "dsub25") {
    W = c.kind === "dsub9" ? 360 : 520;
    H = 196;
    const r = c.kind === "dsub9" ? 15 : 11;
    const top = c.kind === "dsub9" ? 5 : 13;
    const gap = c.kind === "dsub9" ? 46 : 30;
    const half = ((top - 1) * gap) / 2 + 34;
    const cx = W / 2;
    // D 모양 껍데기: 위가 넓고 아래가 좁은 사다리꼴
    body.push(`<path d="M ${n1(cx - half)} 40 L ${n1(cx + half)} 40 L ${n1(cx + half - 22)} 148 L ${n1(cx - half + 22)} 148 Z" fill="${pal.panel}" stroke="${pal.ink}" stroke-width="2" stroke-linejoin="round"/>`);
    for (const { id, x, y } of pinXY(c, view)) {
      const p = pinOf.get(id);
      const hl = o.hl === id;
      const used = !!p && !/^\(|^—/.test(p.sig.en);
      const fill = hl ? pal.accent : used ? pal.panel : pal.bg;
      const inner = view === "female" ? `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(r * 0.45)}" fill="${hl ? pal.panel : pal.muted}"/>` : "";
      body.push(`<g class="pin" data-pin="${esc(id)}" style="cursor:pointer"><circle cx="${n1(x)}" cy="${n1(y)}" r="${r}" fill="${fill}" stroke="${hl ? pal.accent : pal.ink}" stroke-width="${hl ? 3 : 1.6}"${used ? "" : ' stroke-dasharray="3 3"'}/>${inner}`);
      body.push(label(x, y - r - 5, id, 11, pal.muted, "middle", true));
      if (p && c.kind === "dsub9") body.push(label(x, y + r + 14, L(p.sig).replace(/^\((.*)\)$/, "$1"), 10.5, used ? pal.ink : pal.muted));
      body.push("</g>");
    }
  } else if (c.kind === "rj45") {
    W = 380;
    H = 296;
    // 몸통(위쪽 빈자리에 신호 이름을 세로로 쓴다)
    body.push(`<rect x="80" y="110" width="220" height="120" rx="6" fill="${pal.panel}" stroke="${pal.ink}" stroke-width="2"/>`);
    if (view === "plug") {
      body.push(`<rect x="150" y="230" width="80" height="34" fill="${pal.panel}" stroke="${pal.ink}" stroke-width="1.6"/>`);
      body.push(label(190, 282, trMsg(o.lang, "케이블", "cable"), 11, pal.muted));
      body.push(label(190, 222, trMsg(o.lang, "끝(꽂는 쪽)은 위 · 걸쇠는 뒤쪽", "tip up · latch at the back"), 10.5, pal.muted));
    } else {
      body.push(`<rect x="160" y="214" width="60" height="16" fill="${pal.bg}" stroke="${pal.ink}" stroke-width="1.6"/>`);
      body.push(label(190, 252, trMsg(o.lang, "걸쇠 홈(아래)", "latch slot (down)"), 11, pal.muted));
      body.push(label(190, 200, trMsg(o.lang, "접점은 구멍 안 위쪽", "contacts at the top inside"), 10.5, pal.muted));
    }
    for (const { id, x } of pinXY(c, view)) {
      const p = pinOf.get(id);
      const hl = o.hl === id;
      const y = view === "plug" ? 122 : 116;
      const h = view === "plug" ? 62 : 40;
      body.push(`<g class="pin" data-pin="${esc(id)}" style="cursor:pointer">`);
      if (p?.color) body.push(swatch(x - 9, y, 18, h, p.color, pal));
      else body.push(`<rect x="${n1(x - 9)}" y="${n1(y)}" width="18" height="${h}" rx="2" fill="${pal.bg}" stroke="${pal.line}"/>`);
      if (hl) body.push(`<rect x="${n1(x - 12)}" y="${n1(y - 3)}" width="24" height="${h + 6}" rx="3" fill="none" stroke="${pal.accent}" stroke-width="3"/>`);
      body.push(label(x, y + h + 16, id, 12, hl ? pal.accent : pal.ink, "middle", true));
      if (p) {
        const sg = L(p.sig).replace(/^\((.*)\)$/, "$1");
        body.push(`<text transform="translate(${n1(x + 4)} 102) rotate(-90)" font-size="10" fill="${hl ? pal.accent : pal.muted}">${esc(sg.length > 14 ? sg.slice(0, 13) + "…" : sg)}</text>`);
      }
      body.push("</g>");
    }
  } else if (c.kind === "usbc") {
    W = 520;
    H = 200;
    body.push(`<rect x="40" y="44" width="440" height="110" rx="55" fill="${pal.panel}" stroke="${pal.ink}" stroke-width="2"/>`);
    body.push(`<rect x="58" y="92" width="404" height="14" rx="4" fill="${pal.line}"/>`);
    for (const { id, x, y } of pinXY(c, view)) {
      const p = pinOf.get(id);
      const hl = o.hl === id;
      const sig = p ? L(p.sig) : "";
      const col = /VBUS/.test(sig) ? pal.pwr : /GND/.test(sig) ? pal.gnd : /^D[+−]/.test(sig) ? pal.dp : /CC/.test(sig) ? pal.aux : pal.muted;
      const ry = y < 100 ? y - 14 : y;
      body.push(`<g class="pin" data-pin="${esc(id)}" style="cursor:pointer"><rect x="${n1(x - 11)}" y="${n1(ry)}" width="22" height="14" rx="2" fill="${hl ? pal.accent : col}" stroke="${hl ? pal.ink : "none"}" stroke-width="2"/>`);
      body.push(label(x, y < 100 ? y - 20 : y + 26, id, 9.5, pal.ink, "middle", true));
      body.push(label(x, y < 100 ? y - 32 : y + 38, sig, 8.5, pal.muted));
      body.push("</g>");
    }
  } else {
    // 번호 목록 그림 — 실제 배치가 아님
    const rows = c.pins.length;
    W = 420;
    H = 30 + rows * 34;
    c.pins.forEach((p, i) => {
      const y = 30 + i * 34;
      const hl = o.hl === p.n;
      body.push(`<g class="pin" data-pin="${esc(p.n)}" style="cursor:pointer">`);
      body.push(`<rect x="10" y="${n1(y - 14)}" width="${W - 20}" height="28" rx="6" fill="${hl ? pal.panel : "none"}" stroke="${hl ? pal.accent : "none"}" stroke-width="2.5"/>`);
      body.push(`<circle cx="36" cy="${n1(y)}" r="12" fill="${hl ? pal.accent : pal.panel}" stroke="${pal.ink}" stroke-width="1.6"/>`);
      body.push(label(36, y + 4, p.n, p.n.length > 1 ? 9.5 : 11.5, hl ? pal.panel : pal.ink, "middle", true));
      if (p.color) body.push(swatch(60, y - 8, 44, 16, p.color, pal));
      const tx = p.color ? 114 : 60;
      body.push(label(tx, y + 4, L(p.sig), 12, pal.ink, "start", true));
      if (p.color) body.push(label(W - 16, y + 4, L(WIRE[p.color].name), 11, pal.muted, "end"));
      body.push("</g>");
    });
  }

  const title = `${L(c.name)} — ${L(VIEW_NAME[view])}`;
  const top = 30;
  const foot = o.footer ? 18 : 0;
  const TH = top + H + foot;
  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${n1(TH)}" width="${W}" height="${n1(TH)}" font-family="'Segoe UI','Malgun Gothic','Pretendard',system-ui,sans-serif" role="img" aria-label="${esc(title)}">`,
  );
  out.push(`<title>${esc(title)}</title>`);
  if (o.bg) out.push(`<rect x="0" y="0" width="${W}" height="${n1(TH)}" fill="${pal.bg}"/>`);
  out.push(label(12, 20, L(VIEW_NAME[view]), 12.5, pal.ink, "start", true));
  out.push(`<g transform="translate(0 ${top})">${body.join("")}</g>`);
  if (o.footer) out.push(label(W - 10, TH - 6, o.footer, 10, pal.muted, "end"));
  out.push("</svg>");
  return out.join("");
}

/** 표 한 줄(화면·복사 공용) — 번호, 신호, 설명, 색, 추가 칸 */
export function rowCells(c: Connector, p: Pin, lang: Lang): string[] {
  const cells = [p.n, trTx(p.sig, lang), p.desc ? trTx(p.desc, lang) : ""];
  if (c.pins.some((q) => q.color)) cells.push(p.color ? trTx(WIRE[p.color].name, lang) : "");
  for (const x of p.x ?? []) cells.push(trTx(x, lang));
  return cells;
}

export function headCells(c: Connector, lang: Lang): string[] {
  const h = [trMsg(lang, "핀", "Pin"), trMsg(lang, "신호", "Signal"), trMsg(lang, "설명", "Description")];
  if (c.pins.some((q) => q.color)) h.push(c.colorCol ? trTx(c.colorCol, lang) : trMsg(lang, "선 색", "Colour"));
  for (const x of c.cols ?? []) h.push(trTx(x, lang));
  return h;
}
