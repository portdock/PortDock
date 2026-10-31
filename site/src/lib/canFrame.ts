// CAN 프레임 해석 — 웹 도구 «CAN 프레임 해석기». candump·cansend 줄, «ID DLC 데이터» HEX, 원시 비트열(비트 스터핑 제거·CRC15)을 풀고
// J1939(29비트 ID)·CANopen(11비트 COB-ID) 풀이 후보를 붙인다. 화면 문구는 쪽(CanDecoderPage.astro)에서, 여기는 값만.
// 근거:
//   Bosch «CAN Specification 2.0»(1991, NXP 가 올린 사본 BCANPSV2.0) Part A 데이터 프레임(SOF·식별자 11·RTR·IDE·r0·DLC 4·데이터·CRC 15·CRC 구분·ACK·EOF 7),
//     Part B 확장 프레임(식별자 11 + SRR + IDE + 식별자 18 + RTR + r1 + r0), CRC(다항식 x15+x14+x10+x8+x7+x4+x3+1 = 0x4599, 시작값 0,
//     SOF·중재·제어·데이터 필드를 스터핑 빼고 계산), 비트 스터핑(SOF~CRC 순서열에서 같은 값 5개 뒤에 반대 값 하나).
//   CRC 카탈로그(reveng) «CRC-15/CAN»: poly 0x4599, init 0, check("123456789") = 0x059E — 시험에 씀.
//   CAN FD DLC → 길이(9→12 … 15→64): ISO 11898-1:2015 / Bosch «CAN with Flexible Data-Rate» 1.0 표 — 표시만.
//   J1939: SAE J1939-21 의 29비트 ID 구성(우선순위 3 · EDP 1 · DP 1 · PF 8 · PS 8 · SA 8), PF < 240 이면 PDU1(PS = 목적 주소, PGN 의 아래 8비트 0),
//     240 이상이면 PDU2(PS = 그룹 확장, 전체 대상). PGN·SPN 이름·배율은 공개 요약(J1939-71 을 옮긴 장비 매뉴얼·해설) 기준 — 쪽의 출처 목록.
//   CANopen: CiA 301 의 기본 연결 집합(predefined connection set) — COB-ID = 기능 코드(4비트) × 128 + 노드 ID(1~127), SDO 명령 바이트.
//   candump/cansend 표기: Linux can-utils lib.c parse_canframe(3자리 = 표준, 8자리 = 확장, «R» = 원격, «##» = CAN FD).

export type Lang = "ko" | "en";

export interface CanFrame {
  id: number;
  ext: boolean;
  rtr: boolean;
  /** DLC 값(0~15). 데이터에서 셀 때는 길이로 */
  dlc: number;
  data: number[];
  fd: boolean;
  /** 원시 비트열에서 왔을 때만 */
  raw?: RawInfo;
}

export interface RawInfo {
  /** 넣은 비트 수 */
  bits: number;
  /** 지운 스터프 비트의 위치(넣은 비트열 기준, 0부터) */
  stuffAt: number[];
  crcRx: number;
  crcCalc: number;
  crcOk: boolean;
  /** CRC 구분자·ACK·EOF 를 읽었으면 그 값 */
  crcDelim?: number;
  ack?: number;
  ackDelim?: number;
  eofOnes?: number;
  /** 스터핑 오류(같은 값 6개) 위치 */
  stuffError?: number;
}

/** CAN FD DLC → 데이터 길이(ISO 11898-1:2015). 고전 CAN 은 9~15 도 8 바이트 */
export const FD_LEN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 20, 24, 32, 48, 64];
export const dlcLen = (dlc: number, fd: boolean) => (fd ? FD_LEN[dlc] : Math.min(dlc, 8));
/** 길이 → DLC(FD 는 그 길이를 담는 가장 작은 DLC) */
export const lenDlc = (len: number) => FD_LEN.findIndex((n) => n >= len);

/** 입력 오류 — code 로 화면 문구를 고른다(node --test 의 타입 지우기가 매개변수 속성을 못 읽어 필드를 따로 둔다) */
export class CanError extends Error {
  code: string;
  detail: string;
  constructor(code: string, detail = "") {
    super(code + (detail ? `: ${detail}` : ""));
    this.code = code;
    this.detail = detail;
  }
}

// ---------------- CRC15
/** CRC-15/CAN — 비트 배열(0/1)을 앞에서부터 */
export function crc15Bits(bits: number[]): number {
  let crc = 0;
  for (const b of bits) {
    const nxt = b ^ ((crc >> 14) & 1);
    crc = (crc << 1) & 0x7fff;
    if (nxt) crc ^= 0x4599;
  }
  return crc;
}
export const bytesToBits = (bytes: number[]) => bytes.flatMap((x) => [7, 6, 5, 4, 3, 2, 1, 0].map((i) => (x >> i) & 1));
const numBits = (v: number, n: number) => Array.from({ length: n }, (_, i) => Math.floor(v / 2 ** (n - 1 - i)) & 1);
const bitsNum = (b: number[]) => b.reduce((a, x) => a * 2 + x, 0);

// ---------------- 원시 비트열 만들기(시험·예시용)·풀기
/** 스터핑 전 비트(SOF ~ 데이터) — 고전 CAN 만 */
function frameBits(f: { id: number; ext: boolean; rtr: boolean; dlc: number; data: number[] }): number[] {
  const b: number[] = [0];
  if (f.ext) {
    b.push(...numBits(f.id >>> 18, 11), 1, 1, ...numBits(f.id & 0x3ffff, 18), f.rtr ? 1 : 0, 0, 0);
  } else {
    b.push(...numBits(f.id, 11), f.rtr ? 1 : 0, 0, 0);
  }
  b.push(...numBits(f.dlc, 4));
  if (!f.rtr) b.push(...bytesToBits(f.data.slice(0, dlcLen(f.dlc, false))));
  return b;
}

/** 비트 스터핑 — 같은 값 5개 뒤에 반대 값 */
export function stuff(bits: number[]): number[] {
  const out: number[] = [];
  let run = 0;
  let last = -1;
  for (const b of bits) {
    out.push(b);
    if (b === last) run++;
    else {
      last = b;
      run = 1;
    }
    if (run === 5) {
      const s = 1 - b;
      out.push(s);
      last = s;
      run = 1;
    }
  }
  return out;
}

/** 고전 CAN 프레임 → 버스에 나가는 비트열(스터핑 + CRC + 구분자·ACK(0, 받은 쪽이 있다고 보고)·EOF) */
export function buildRaw(f: { id: number; ext: boolean; rtr: boolean; dlc: number; data: number[] }): number[] {
  const body = frameBits(f);
  const crc = crc15Bits(body);
  return [...stuff([...body, ...numBits(crc, 15)]), 1, 0, 1, 1, 1, 1, 1, 1, 1, 1];
}

/** 원시 비트열 풀기 — SOF 부터. 0 = 우성, 1 = 열성 */
export function decodeRaw(input: number[]): CanFrame {
  let pos = 0;
  let run = 0;
  let last = -1;
  const stuffAt: number[] = [];
  let stuffError: number | undefined;
  const destuffed: number[] = [];
  /** 스터핑 구간에서 한 비트 */
  const next = (): number => {
    if (pos >= input.length) throw new CanError("short", String(input.length));
    const b = input[pos++];
    destuffed.push(b);
    count(b);
    return b;
  };
  const count = (b: number) => {
    if (b === last) run++;
    else {
      last = b;
      run = 1;
    }
    if (run === 5) {
      // 다음 비트는 스터프 비트 — 반대 값이어야 한다
      if (pos < input.length) {
        const s = input[pos];
        if (s === b && stuffError === undefined) stuffError = pos;
        stuffAt.push(pos);
        pos++;
        last = s;
        run = 1;
      }
    }
  };
  const take = (n: number) => Array.from({ length: n }, next);

  // SOF 앞의 열성(1) 쉼은 건너뛴다
  while (pos < input.length && input[pos] === 1) pos++;
  const start = pos;
  if (next() !== 0) throw new CanError("sof");
  const idA = bitsNum(take(11));
  const rtrOrSrr = next();
  const ide = next();
  let id = idA;
  let rtr = rtrOrSrr === 1;
  if (ide === 1) {
    const idB = bitsNum(take(18));
    id = idA * 2 ** 18 + idB;
    rtr = next() === 1;
    next(); // r1
    next(); // r0
  } else {
    next(); // r0
  }
  const dlc = bitsNum(take(4));
  const n = rtr ? 0 : dlcLen(dlc, false);
  const data: number[] = [];
  for (let i = 0; i < n; i++) data.push(bitsNum(take(8)));
  const crcCalc = crc15Bits(destuffed.slice());
  const crcRx = bitsNum(take(15));
  // CRC 구분자부터는 스터핑 없음
  const rest = input.slice(pos);
  const raw: RawInfo = {
    bits: input.length - start,
    stuffAt: stuffAt.map((p) => p - start),
    crcRx,
    crcCalc,
    crcOk: crcRx === crcCalc,
    stuffError: stuffError === undefined ? undefined : stuffError - start,
  };
  if (rest.length > 0) raw.crcDelim = rest[0];
  if (rest.length > 1) raw.ack = rest[1];
  if (rest.length > 2) raw.ackDelim = rest[2];
  if (rest.length > 3) {
    let k = 0;
    while (k < 7 && rest[3 + k] === 1) k++;
    raw.eofOnes = k;
  }
  return { id, ext: ide === 1, rtr, dlc, data, fd: false, raw };
}

// ---------------- 글 → 프레임
const hexBytes = (s: string): number[] => {
  const h = s.replace(/[\s.:,_-]/g, "").replace(/0x/gi, "");
  if (h.length === 0) return [];
  if (!/^[0-9a-f]+$/i.test(h) || h.length % 2) throw new CanError("hex", s);
  return h.match(/../g)!.map((x) => parseInt(x, 16));
};

export type IdKind = "auto" | "std" | "ext";

/** 입력 한 줄을 프레임으로. kind 로 표준/확장을 강제할 수 있다(«ID DLC 데이터» 꼴만) */
export function parseFrame(line: string, kind: IdKind = "auto"): CanFrame {
  let s = line.trim();
  if (!s) throw new CanError("empty");
  // 원시 비트열
  const bitsOnly = s.replace(/[\s_|]/g, "");
  if (/^[01]+$/.test(bitsOnly) && bitsOnly.length >= 19) return decodeRaw([...bitsOnly].map(Number));
  // candump -L 로그: (시각) can0 123#11
  s = s.replace(/^\(\s*[\d.]+\s*\)\s*/, "");
  const hash = s.match(/(?:^|\s)([0-9a-f]+)(##?)(\S*)\s*$/i);
  if (hash) {
    const [, idS, sep, rest] = hash;
    if (idS.length !== 3 && idS.length !== 8) throw new CanError("idlen", idS);
    const ext = idS.length === 8;
    const id = parseInt(idS, 16);
    if (ext ? id > 0x1fffffff : id > 0x7ff) throw new CanError("idrange", idS);
    if (sep === "##") {
      // CAN FD: ##<플래그 1자리><데이터>
      const data = hexBytes(rest.slice(1));
      if (data.length > 64) throw new CanError("len", String(data.length));
      const dlc = lenDlc(data.length);
      if (FD_LEN[dlc] !== data.length) throw new CanError("fdlen", String(data.length));
      return { id, ext, rtr: false, dlc, data, fd: true };
    }
    const r = rest.match(/^R(\d*)$/i);
    if (r) {
      const dlc = r[1] ? Number(r[1]) : 0;
      if (dlc > 8) throw new CanError("dlc", r[1]);
      return { id, ext, rtr: true, dlc, data: [], fd: false };
    }
    // 고전 CAN 데이터 뒤 «_<DLC>» (9~15) 표기
    const m = rest.match(/^([0-9a-f.]*)(?:_([0-9a-f]))?$/i);
    if (!m) throw new CanError("hex", rest);
    const data = hexBytes(m[1]);
    if (data.length > 8) throw new CanError("len", String(data.length));
    const dlc = m[2] && data.length === 8 ? parseInt(m[2], 16) : data.length;
    return { id, ext, rtr: false, dlc, data, fd: false };
  }
  // candump 기본 출력: can0  18FEF100   [8]  00 11 22 …   또는  123  [2]  remote request
  const cd = s.match(/(?:^|\s)([0-9a-f]{3}|[0-9a-f]{8})\s+\[(\d{1,2})\]\s*(.*)$/i);
  if (cd) {
    const [, idS, lenS, rest] = cd;
    const ext = idS.length === 8;
    const id = parseInt(idS, 16);
    const len = Number(lenS);
    if (/remote/i.test(rest)) return { id, ext, rtr: true, dlc: Math.min(len, 8), data: [], fd: false };
    const data = hexBytes(rest.replace(/'.*$/, ""));
    if (data.length !== len) throw new CanError("lenmismatch", `${len}/${data.length}`);
    const fd = len > 8;
    return { id, ext, rtr: false, dlc: fd ? lenDlc(len) : len, data, fd };
  }
  // «ID DLC 데이터» 또는 «ID 데이터»
  const tok = s.replace(/0x/gi, "").split(/[\s,;]+/).filter(Boolean);
  const idS = tok[0];
  if (!/^[0-9a-f]{1,8}$/i.test(idS)) throw new CanError("id", idS);
  const id = parseInt(idS, 16);
  const ext = kind === "ext" || (kind === "auto" && (idS.length > 3 || id > 0x7ff));
  if (ext ? id > 0x1fffffff : id > 0x7ff) throw new CanError("idrange", idS);
  let rest = tok.slice(1);
  let rtr = false;
  if (rest[0] && /^r(tr)?$/i.test(rest[0])) {
    rtr = true;
    rest = rest.slice(1);
  }
  let dlc: number | undefined;
  // 한 자리 수(0~F 가 아니라 0~8, 또는 FD 길이)면 DLC 로 본다 — 바이트는 두 자리로 적는다
  if (rest[0] && /^\d{1,2}$/.test(rest[0]) && rest[0].length === 1) {
    dlc = Number(rest[0]);
    rest = rest.slice(1);
  } else if (rest[0] && /^\[\d{1,2}\]$/.test(rest[0])) {
    dlc = Number(rest[0].slice(1, -1));
    rest = rest.slice(1);
  }
  const data = rtr ? [] : hexBytes(rest.join(""));
  if (data.length > 64) throw new CanError("len", String(data.length));
  const fd = data.length > 8;
  if (fd && FD_LEN[lenDlc(data.length)] !== data.length) throw new CanError("fdlen", String(data.length));
  if (dlc === undefined) dlc = fd ? lenDlc(data.length) : data.length;
  else if (!rtr && dlcLen(dlc, fd) !== data.length) throw new CanError("lenmismatch", `${dlc}/${data.length}`);
  return { id, ext, rtr, dlc, data, fd };
}

// ---------------- J1939
export interface J1939 {
  priority: number;
  edp: number;
  dp: number;
  pf: number;
  ps: number;
  sa: number;
  pdu: 1 | 2;
  pgn: number;
  /** PDU1 이면 목적 주소, PDU2 면 255(전체) */
  da: number;
}

export function j1939(id: number): J1939 {
  const priority = (id >>> 26) & 7;
  const edp = (id >>> 25) & 1;
  const dp = (id >>> 24) & 1;
  const pf = (id >>> 16) & 0xff;
  const ps = (id >>> 8) & 0xff;
  const sa = id & 0xff;
  const pdu = pf < 240 ? 1 : 2;
  const pgn = (edp << 17) | (dp << 16) | (pf << 8) | (pdu === 2 ? ps : 0);
  return { priority, edp, dp, pf, ps, sa, pdu, pgn, da: pdu === 1 ? ps : 255 };
}

/** 우선순위·PGN·주소 → 29비트 ID */
export const j1939Id = (priority: number, pgn: number, sa: number, da = 255) => {
  const pf = (pgn >> 8) & 0xff;
  const ps = pf < 240 ? da : pgn & 0xff;
  return ((priority & 7) << 26) | (((pgn >> 16) & 3) << 24) | (pf << 16) | (ps << 8) | (sa & 0xff);
};

/** 흔한 PGN — 이름은 공개 요약(SAE J1939-71·-21·-73 이름을 옮긴 장비 매뉴얼·해설) */
export const PGNS: Record<number, { abbr: string; ko: string; en: string }> = {
  0xea00: { abbr: "RQST", ko: "요청(Request)", en: "Request" },
  0xe800: { abbr: "ACKM", ko: "응답 확인(Acknowledgment)", en: "Acknowledgment" },
  0xee00: { abbr: "AC", ko: "주소 선언(Address Claimed)", en: "Address Claimed" },
  0xec00: { abbr: "TP.CM", ko: "전송 프로토콜 — 연결 관리", en: "Transport Protocol — Connection Management" },
  0xeb00: { abbr: "TP.DT", ko: "전송 프로토콜 — 데이터 전송", en: "Transport Protocol — Data Transfer" },
  0xef00: { abbr: "PropA", ko: "제조사 고유 A(Proprietary A)", en: "Proprietary A" },
  0xf001: { abbr: "EBC1", ko: "전자 브레이크 제어기 1", en: "Electronic Brake Controller 1" },
  0xf002: { abbr: "ETC1", ko: "전자 변속기 제어기 1", en: "Electronic Transmission Controller 1" },
  0xf003: { abbr: "EEC2", ko: "전자 엔진 제어기 2(가속 페달)", en: "Electronic Engine Controller 2 (accelerator pedal)" },
  0xf004: { abbr: "EEC1", ko: "전자 엔진 제어기 1(엔진 회전수·토크)", en: "Electronic Engine Controller 1 (engine speed, torque)" },
  0xf005: { abbr: "ETC2", ko: "전자 변속기 제어기 2(기어)", en: "Electronic Transmission Controller 2 (gear)" },
  0xfeca: { abbr: "DM1", ko: "현재 고장 코드(DM1)", en: "Active Diagnostic Trouble Codes (DM1)" },
  0xfecb: { abbr: "DM2", ko: "이전 고장 코드(DM2)", en: "Previously Active Diagnostic Trouble Codes (DM2)" },
  0xfee0: { abbr: "VD", ko: "차량 주행 거리", en: "Vehicle Distance" },
  0xfec1: { abbr: "VDHR", ko: "고분해능 차량 주행 거리", en: "High Resolution Vehicle Distance" },
  0xfee5: { abbr: "HOURS", ko: "엔진 가동 시간·회전 수", en: "Engine Hours, Revolutions" },
  0xfee6: { abbr: "TD", ko: "시각·날짜", en: "Time/Date" },
  0xfee9: { abbr: "LFC", ko: "연료 소비량(액체)", en: "Fuel Consumption (Liquid)" },
  0xfeeb: { abbr: "CI", ko: "구성품 식별", en: "Component Identification" },
  0xfeec: { abbr: "VI", ko: "차량 식별(VIN)", en: "Vehicle Identification" },
  0xfeda: { abbr: "SOFT", ko: "소프트웨어 식별", en: "Software Identification" },
  0xfeee: { abbr: "ET1", ko: "엔진 온도 1(냉각수·연료·오일)", en: "Engine Temperature 1" },
  0xfeef: { abbr: "EFL/P1", ko: "엔진 유체 수위·압력 1(오일 압력)", en: "Engine Fluid Level/Pressure 1" },
  0xfef1: { abbr: "CCVS1", ko: "크루즈 컨트롤·차속", en: "Cruise Control/Vehicle Speed 1" },
  0xfef2: { abbr: "LFE1", ko: "연비(액체 연료)", en: "Fuel Economy (Liquid)" },
  0xfef5: { abbr: "AMB", ko: "주변 조건(대기압·외기 온도)", en: "Ambient Conditions" },
  0xfef6: { abbr: "IC1", ko: "흡기·배기 조건 1", en: "Intake/Exhaust Conditions 1" },
  0xfef7: { abbr: "VEP1", ko: "차량 전원 1(배터리 전압)", en: "Vehicle Electrical Power 1" },
  0xfef8: { abbr: "TRF1", ko: "변속기 유체 1(오일 압력·온도)", en: "Transmission Fluids 1" },
  0xfecc: { abbr: "DM3", ko: "이전 고장 코드 지우기(DM3)", en: "Diagnostic Data Clear (DM3)" },
  0xfefc: { abbr: "DD", ko: "계기판 표시(연료량)", en: "Dash Display" },
};

export const pgnInfo = (pgn: number) => {
  if (PGNS[pgn]) return PGNS[pgn];
  if (pgn >= 0xff00 && pgn <= 0xffff) return { abbr: "PropB", ko: "제조사 고유 B(Proprietary B)", en: "Proprietary B" };
  if (pgn === 0x1ef00) return { abbr: "PropA2", ko: "제조사 고유 A2", en: "Proprietary A2" };
  return undefined;
};

export interface Spn {
  spn: number;
  pgn: number;
  ko: string;
  en: string;
  /** 시작 바이트(1부터) */
  byte: number;
  /** 바이트 수(1·2·4), 리틀 엔디언 */
  len: number;
  scale: number;
  offset: number;
  unit: string;
}

/** 흔한 SPN 몇 개 — 배율·오프셋은 공개 자료로 맞춘 것만: SPN 190 은 TiePie J1939 디코더 예(위치 24비트·16비트·0.125·0),
 * 나머지는 Woodward easYgen-3000XT J1939 표의 범위(110: −40~210 °C, 513: −125~125 %, 100: 0~1000 kPa, 91: 0~100 %, 247: 0~210 554 060 h)를
 * J1939 의 값 칸(1바이트 0~250, 4바이트 0~0xFAFFFFFF)으로 나눈 배율. 시작 바이트는 J1939-71 의 일반 배치(공개 해설) */
export const SPNS: Spn[] = [
  { spn: 513, pgn: 0xf004, ko: "실제 엔진 토크", en: "Actual engine percent torque", byte: 3, len: 1, scale: 1, offset: -125, unit: "%" },
  { spn: 190, pgn: 0xf004, ko: "엔진 회전수", en: "Engine speed", byte: 4, len: 2, scale: 0.125, offset: 0, unit: "rpm" },
  { spn: 91, pgn: 0xf003, ko: "가속 페달 위치 1", en: "Accelerator pedal position 1", byte: 2, len: 1, scale: 0.4, offset: 0, unit: "%" },
  { spn: 110, pgn: 0xfeee, ko: "엔진 냉각수 온도", en: "Engine coolant temperature", byte: 1, len: 1, scale: 1, offset: -40, unit: "°C" },
  { spn: 100, pgn: 0xfeef, ko: "엔진 오일 압력", en: "Engine oil pressure", byte: 4, len: 1, scale: 4, offset: 0, unit: "kPa" },
  { spn: 247, pgn: 0xfee5, ko: "엔진 총 가동 시간", en: "Engine total hours of operation", byte: 1, len: 4, scale: 0.05, offset: 0, unit: "h" },
];

export interface SpnValue {
  spec: Spn;
  raw: number;
  /** 값 — 범위 밖(오류·«없음» 표시)이면 undefined */
  value?: number;
  status: "ok" | "error" | "na" | "short";
}

/** J1939 의 값 범위: 맨 위 바이트 0x00~0xFA = 값, 0xFE = 오류, 0xFF = 없음(not available) */
export function spnValues(pgn: number, data: number[]): SpnValue[] {
  return SPNS.filter((s) => s.pgn === pgn).map((s) => {
    if (data.length < s.byte - 1 + s.len) return { spec: s, raw: NaN, status: "short" as const };
    let raw = 0;
    for (let i = s.len - 1; i >= 0; i--) raw = raw * 256 + data[s.byte - 1 + i];
    const top = data[s.byte - 1 + s.len - 1];
    if (top === 0xff) return { spec: s, raw, status: "na" as const };
    if (top > 0xfa) return { spec: s, raw, status: "error" as const };
    return { spec: s, raw, value: raw * s.scale + s.offset, status: "ok" as const };
  });
}

// ---------------- CANopen
export type CoFunc =
  | "nmt"
  | "sync"
  | "emcy"
  | "time"
  | "tpdo1"
  | "rpdo1"
  | "tpdo2"
  | "rpdo2"
  | "tpdo3"
  | "rpdo3"
  | "tpdo4"
  | "rpdo4"
  | "sdoTx"
  | "sdoRx"
  | "hb"
  | "lss"
  | "unknown";

export interface CoId {
  func: CoFunc;
  /** 노드 ID(0 = 해당 없음) */
  node: number;
  fc: number;
}

/** CiA 301 기본 연결 집합으로 11비트 COB-ID 풀기 */
export function canopenId(cob: number): CoId {
  const fc = (cob >> 7) & 0xf;
  const node = cob & 0x7f;
  if (cob === 0) return { func: "nmt", node: 0, fc };
  if (cob === 0x80) return { func: "sync", node: 0, fc };
  if (cob === 0x100) return { func: "time", node: 0, fc };
  if (cob === 0x7e4 || cob === 0x7e5) return { func: "lss", node: 0, fc };
  if (node === 0) return { func: "unknown", node, fc };
  const map: Record<number, CoFunc> = {
    1: "emcy",
    3: "tpdo1",
    4: "rpdo1",
    5: "tpdo2",
    6: "rpdo2",
    7: "tpdo3",
    8: "rpdo3",
    9: "tpdo4",
    10: "rpdo4",
    11: "sdoTx",
    12: "sdoRx",
    14: "hb",
  };
  return { func: map[fc] ?? "unknown", node, fc };
}

export const NMT_CMD: Record<number, { ko: string; en: string }> = {
  0x01: { ko: "운전 시작(Start remote node → Operational)", en: "Start remote node (→ Operational)" },
  0x02: { ko: "정지(Stop remote node → Stopped)", en: "Stop remote node (→ Stopped)" },
  0x80: { ko: "운전 전 상태로(Enter Pre-operational)", en: "Enter Pre-operational" },
  0x81: { ko: "노드 리셋(Reset node)", en: "Reset node" },
  0x82: { ko: "통신 리셋(Reset communication)", en: "Reset communication" },
};

export const HB_STATE: Record<number, { ko: string; en: string }> = {
  0x00: { ko: "부트업(Boot-up)", en: "Boot-up" },
  0x04: { ko: "정지(Stopped)", en: "Stopped" },
  0x05: { ko: "운전(Operational)", en: "Operational" },
  0x7f: { ko: "운전 전(Pre-operational)", en: "Pre-operational" },
};

/** 흔한 SDO 중단 코드(CiA 301 표) */
export const SDO_ABORT: Record<number, { ko: string; en: string }> = {
  0x05030000: { ko: "토글 비트가 바뀌지 않음", en: "Toggle bit not alternated" },
  0x05040000: { ko: "SDO 프로토콜 시간 초과", en: "SDO protocol timed out" },
  0x05040001: { ko: "명령 지정자가 틀리거나 모름", en: "Client/server command specifier not valid or unknown" },
  0x05040005: { ko: "메모리 부족", en: "Out of memory" },
  0x06010000: { ko: "지원하지 않는 접근", en: "Unsupported access to an object" },
  0x06010001: { ko: "쓰기 전용 객체를 읽으려 함", en: "Attempt to read a write only object" },
  0x06010002: { ko: "읽기 전용 객체에 쓰려 함", en: "Attempt to write a read only object" },
  0x06020000: { ko: "객체 사전에 없는 객체", en: "Object does not exist in the object dictionary" },
  0x06040041: { ko: "PDO 에 매핑할 수 없는 객체", en: "Object cannot be mapped to the PDO" },
  0x06040042: { ko: "매핑할 객체 수·길이가 PDO 길이를 넘음", en: "Number and length of objects would exceed PDO length" },
  0x06040043: { ko: "일반 매개변수 호환 안 됨", en: "General parameter incompatibility" },
  0x06040047: { ko: "장치 안의 일반 호환 안 됨", en: "General internal incompatibility in the device" },
  0x06060000: { ko: "하드웨어 오류로 접근 실패", en: "Access failed due to a hardware error" },
  0x06070010: { ko: "데이터 형식이 맞지 않음(길이 다름)", en: "Data type does not match, length of service parameter does not match" },
  0x06070012: { ko: "데이터 형식이 맞지 않음(길이가 김)", en: "Data type does not match, length too high" },
  0x06070013: { ko: "데이터 형식이 맞지 않음(길이가 짧음)", en: "Data type does not match, length too low" },
  0x06090011: { ko: "없는 하위 인덱스", en: "Sub-index does not exist" },
  0x06090030: { ko: "값 범위를 벗어남", en: "Invalid value for parameter" },
  0x06090031: { ko: "값이 너무 큼", en: "Value of parameter written too high" },
  0x06090032: { ko: "값이 너무 작음", en: "Value of parameter written too low" },
  0x08000000: { ko: "일반 오류", en: "General error" },
  0x08000020: { ko: "데이터를 전달·저장할 수 없음", en: "Data cannot be transferred or stored to the application" },
  0x08000021: { ko: "로컬 제어 때문에 전달·저장할 수 없음", en: "Data cannot be transferred or stored because of local control" },
  0x08000022: { ko: "지금 장치 상태 때문에 전달·저장할 수 없음", en: "Data cannot be transferred or stored because of the present device state" },
};

/** 흔한 객체(CiA 301 통신 영역) */
export function objectName(index: number, lang: Lang): string {
  const ko = lang === "ko";
  const fixed: Record<number, [string, string]> = {
    0x1000: ["장치 형식(Device type)", "Device type"],
    0x1001: ["오류 레지스터(Error register)", "Error register"],
    0x1003: ["미리 정한 오류 필드(Pre-defined error field)", "Pre-defined error field"],
    0x1005: ["SYNC COB-ID", "COB-ID SYNC"],
    0x1008: ["제조사 장치 이름", "Manufacturer device name"],
    0x1009: ["제조사 하드웨어 판", "Manufacturer hardware version"],
    0x100a: ["제조사 소프트웨어 판", "Manufacturer software version"],
    0x1010: ["매개변수 저장(Store parameters)", "Store parameters"],
    0x1011: ["기본값 복원(Restore default parameters)", "Restore default parameters"],
    0x1014: ["EMCY COB-ID", "COB-ID EMCY"],
    0x1016: ["소비자 하트비트 시간", "Consumer heartbeat time"],
    0x1017: ["생산자 하트비트 시간(ms)", "Producer heartbeat time (ms)"],
    0x1018: ["식별 객체(Identity: 제조사·제품·판·일련번호)", "Identity object"],
  };
  if (fixed[index]) return fixed[index][ko ? 0 : 1];
  if (index >= 0x1400 && index <= 0x15ff) return ko ? `RPDO${index - 0x1400 + 1} 통신 매개변수` : `RPDO${index - 0x1400 + 1} communication parameter`;
  if (index >= 0x1600 && index <= 0x17ff) return ko ? `RPDO${index - 0x1600 + 1} 매핑` : `RPDO${index - 0x1600 + 1} mapping`;
  if (index >= 0x1800 && index <= 0x19ff) return ko ? `TPDO${index - 0x1800 + 1} 통신 매개변수` : `TPDO${index - 0x1800 + 1} communication parameter`;
  if (index >= 0x1a00 && index <= 0x1bff) return ko ? `TPDO${index - 0x1a00 + 1} 매핑` : `TPDO${index - 0x1a00 + 1} mapping`;
  if (index >= 0x2000 && index <= 0x5fff) return ko ? "제조사 고유 영역" : "Manufacturer-specific area";
  if (index >= 0x6000 && index <= 0x9fff) return ko ? "장치 프로파일 영역(CiA 4xx)" : "Standardized device profile area (CiA 4xx)";
  if (index >= 0x1000 && index <= 0x1fff) return ko ? "통신 프로파일 영역" : "Communication profile area";
  return "";
}

export interface Sdo {
  /** request = 클라이언트 → 서버(0x600+노드), response = 서버 → 클라이언트(0x580+노드) */
  dir: "request" | "response";
  cs: number;
  kind:
    | "initDownload"
    | "initDownloadResp"
    | "initUpload"
    | "initUploadResp"
    | "downloadSeg"
    | "downloadSegResp"
    | "uploadSeg"
    | "uploadSegResp"
    | "abort"
    | "block"
    | "unknown";
  index?: number;
  sub?: number;
  expedited?: boolean;
  sizeIndicated?: boolean;
  /** 빠른 전송이면 실제 데이터 바이트 수 */
  n?: number;
  /** 빠른 전송 값(리틀 엔디언) 또는 세그먼트 전송 전체 길이 */
  value?: number;
  bytes?: number[];
  toggle?: number;
  last?: boolean;
  abort?: number;
}

/** SDO 명령 바이트·인덱스·데이터 풀기(CiA 301 §7.2.4.3) */
export function sdo(dir: "request" | "response", d: number[]): Sdo | undefined {
  if (d.length < 1) return undefined;
  const c = d[0];
  const cs = c >> 5;
  const le = (b: number[]) => b.reduce((a, x, i) => a + x * 2 ** (8 * i), 0);
  const idx = d.length >= 4 ? { index: d[1] | (d[2] << 8), sub: d[3] } : {};
  if (cs === 4) return { dir, cs, kind: "abort", ...idx, abort: d.length >= 8 ? le(d.slice(4, 8)) : undefined };
  if (cs === 5 || cs === 6) return { dir, cs, kind: "block", ...idx };
  const e = ((c >> 1) & 1) === 1;
  const s = (c & 1) === 1;
  const initial = (kind: Sdo["kind"]): Sdo => {
    const r: Sdo = { dir, cs, kind, ...idx, expedited: e, sizeIndicated: s };
    if (d.length >= 8) {
      if (e) {
        const n = s ? 4 - ((c >> 2) & 3) : 4;
        r.n = n;
        r.bytes = d.slice(4, 4 + n);
        r.value = le(r.bytes);
      } else if (s) r.value = le(d.slice(4, 8));
    }
    return r;
  };
  const seg = (kind: Sdo["kind"], data: boolean): Sdo => {
    const r: Sdo = { dir, cs, kind, toggle: (c >> 4) & 1 };
    if (data) {
      const n = 7 - ((c >> 1) & 7);
      r.n = n;
      r.bytes = d.slice(1, 1 + n);
      r.last = (c & 1) === 1;
    }
    return r;
  };
  if (dir === "request") {
    if (cs === 1) return initial("initDownload");
    if (cs === 2) return { dir, cs, kind: "initUpload", ...idx };
    if (cs === 0) return seg("downloadSeg", true);
    if (cs === 3) return seg("uploadSeg", false);
  } else {
    if (cs === 2) return initial("initUploadResp");
    if (cs === 3) return { dir, cs, kind: "initDownloadResp", ...idx };
    if (cs === 0) return seg("uploadSegResp", true);
    if (cs === 1) return seg("downloadSegResp", false);
  }
  return { dir, cs, kind: "unknown" };
}
