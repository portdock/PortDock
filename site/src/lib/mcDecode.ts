// 웹 도구 «MC 프로토콜(SLMP) 프레임 해석기» 의 풀이 — crates/core/src/mc.rs(PortDock PLC Simulator 의 처리기)와 같은 규칙.
// 머리(서브헤더·네트워크·PC·I/O·국·길이·감시 타이머/종료 코드), 명령 0401·1401·0403·1402·0619 의 데이터, 디바이스 코드 18종,
// (0.6.0 부터) 0406·1406 블록·0801·0802 모니터·1001~1006 원격 조작·0101 형명 읽기의 요청(블록 읽기·형명 응답도),
// 종료 코드 C050~C061(그 앱이 쓰는 값)을 풀고, 요청이면 그 앱이 어떤 종료 코드로 답할지도 같은 순서로 따진다.
// 시험(mcDecode.test.ts)은 mc.rs 시험의 매뉴얼 예시 프레임을 그대로 쓴다.
// 근거(공개 매뉴얼, 링크만): SLMP Reference Manual SH(NA)-080956ENG 4장·5.2·5.9, MELSEC Communication Protocol Reference Manual
// SH-080008 5장, 종료 코드 MELSEC iQ-R Ethernet User's Manual (Application) SH-081257ENG 3.5. 0.6.0 명령은 SLMP 5.2·5.6.
import { parseHex, hex, type Lang } from "./checksum.ts";

export type McMode = "auto" | "binary" | "ascii";
export type McFrame = "3e" | "4e";
export type McCode = "binary" | "ascii";

export interface Field {
  name: string;
  /** 원래 바이트(이진은 HEX, ASCII 는 글자 그대로) */
  raw: string;
  value: string;
}

/** 값 표 한 줄 — bit: 비트 1점, word: 워드 디바이스 1워드, bitword: 비트 디바이스 16점, dword: 2워드(32비트) */
export interface Item {
  addr: string;
  kind: "bit" | "word" | "bitword" | "dword";
  value: number;
}

export interface DevInfo {
  name: string;
  code: number;
  bits: boolean;
  /** 번호를 16진으로 쓰는지 */
  hex: boolean;
  ko: string;
  en: string;
}

/** 디바이스 코드 표 — mc.rs DEVICES 와 같은 18종(SLMP 5.2) */
export const MC_DEVICES: DevInfo[] = [
  { name: "X", code: 0x9c, bits: true, hex: true, ko: "입력", en: "Input" },
  { name: "Y", code: 0x9d, bits: true, hex: true, ko: "출력", en: "Output" },
  { name: "M", code: 0x90, bits: true, hex: false, ko: "내부 릴레이", en: "Internal relay" },
  { name: "L", code: 0x92, bits: true, hex: false, ko: "래치 릴레이", en: "Latch relay" },
  { name: "F", code: 0x93, bits: true, hex: false, ko: "어넌시에이터", en: "Annunciator" },
  { name: "B", code: 0xa0, bits: true, hex: true, ko: "링크 릴레이", en: "Link relay" },
  { name: "SM", code: 0x91, bits: true, hex: false, ko: "특수 릴레이", en: "Special relay" },
  { name: "D", code: 0xa8, bits: false, hex: false, ko: "데이터 레지스터", en: "Data register" },
  { name: "W", code: 0xb4, bits: false, hex: true, ko: "링크 레지스터", en: "Link register" },
  { name: "R", code: 0xaf, bits: false, hex: false, ko: "파일 레지스터", en: "File register" },
  { name: "ZR", code: 0xb0, bits: false, hex: true, ko: "파일 레지스터(연번)", en: "File register (serial numbers)" },
  { name: "SD", code: 0xa9, bits: false, hex: false, ko: "특수 레지스터", en: "Special register" },
  { name: "TS", code: 0xc1, bits: true, hex: false, ko: "타이머 접점", en: "Timer contact" },
  { name: "TC", code: 0xc0, bits: true, hex: false, ko: "타이머 코일", en: "Timer coil" },
  { name: "TN", code: 0xc2, bits: false, hex: false, ko: "타이머 현재값", en: "Timer current value" },
  { name: "CS", code: 0xc4, bits: true, hex: false, ko: "카운터 접점", en: "Counter contact" },
  { name: "CC", code: 0xc3, bits: true, hex: false, ko: "카운터 코일", en: "Counter coil" },
  { name: "CN", code: 0xc5, bits: false, hex: false, ko: "카운터 현재값", en: "Counter current value" },
];

export const devByName = (name: string) => MC_DEVICES.find((d) => d.name === name.toUpperCase());

/** 종료 코드 — mc.rs end_code_text(짧은 이름)와 PLC Simulator 도움말 «종료 코드» 절(그 앱이 이 코드를 쓰는 경우) */
export const END_CODES: Record<number, { ko: string; en: string; whenKo: string; whenEn: string }> = {
  0xc050: { ko: "ASCII 변환 불가", en: "ASCII conversion error", whenKo: "ASCII 코드에 16진이 아닌 글자, 10진 디바이스 번호에 A~F", whenEn: "a non-hex character in ASCII code, or A–F in a decimal device number" },
  0xc051: { ko: "점 수 범위 밖(워드)", en: "points out of range (words)", whenKo: "일괄 읽기·쓰기 워드 점 수가 0 이거나 960 초과", whenEn: "batch read/write word points are 0 or above 960" },
  0xc052: { ko: "점 수 범위 밖(비트)", en: "points out of range (bits)", whenKo: "일괄 읽기·쓰기 비트 점 수가 0 이거나 이진 7168·ASCII 3584 초과", whenEn: "batch read/write bit points are 0 or above 7168 (binary) / 3584 (ASCII)" },
  0xc053: { ko: "랜덤 점 수 범위 밖(비트)", en: "random points out of range (bits)", whenKo: "랜덤 쓰기 비트 점 수가 0 이거나 188(서브 0003 은 94) 초과", whenEn: "random write bit points are 0 or above 188 (94 for subcommand 0003)" },
  0xc054: { ko: "랜덤 점 수 범위 밖(워드)", en: "random points out of range (words)", whenKo: "랜덤 읽기·쓰기 워드·더블워드 점 수가 0 이거나 한도 초과", whenEn: "random read/write word and double-word points are 0 or above the limit" },
  0xc056: { ko: "주소 범위 밖", en: "address out of range", whenKo: "디바이스 크기(점 수)를 넘는 번호", whenEn: "a number beyond the device size (points)" },
  0xc057: { ko: "요청 길이 불일치", en: "request length mismatch", whenKo: "머리의 요청 데이터 길이가 실제 뒤따르는 길이와 다름", whenEn: "the header's request data length differs from what actually follows" },
  0xc059: { ko: "명령·서브 명령 틀림", en: "wrong command/subcommand", whenKo: "구현하지 않은 명령·서브 명령", whenEn: "a command or subcommand that is not implemented" },
  0xc05b: { ko: "디바이스 지정 틀림", en: "device cannot be accessed", whenKo: "모르는 디바이스 코드, 워드 디바이스를 비트 단위로", whenEn: "an unknown device code, or a word device in bit units" },
  0xc05c: { ko: "요청 데이터 틀림", en: "request data error", whenKo: "루프백 데이터 수가 1~960 밖, 원격 조작의 모드 값이 틀림", whenEn: "loopback data count outside 1–960, or a wrong mode value in a remote operation" },
  0xc05d: { ko: "모니터 등록 전 실행", en: "monitor not registered", whenKo: "모니터 등록(0801) 전에 모니터 실행(0802)", whenEn: "Execute Monitor (0802) before Entry Monitor Device (0801)" },
  0xc05f: { ko: "접근 대상 틀림", en: "wrong access destination", whenKo: "다른 국 요청(«자기 국 요청만 받기» 켬)", whenEn: "a request for another station («Own station requests only» on)" },
  0xc060: { ko: "비트 값 틀림", en: "bit request error", whenKo: "비트 쓰기 값이 0·1 이 아님", whenEn: "a bit write value other than 0 or 1" },
  0xc061: { ko: "데이터 길이 불일치", en: "data length mismatch", whenKo: "명령 데이터가 점 수보다 짧거나 김", whenEn: "command data shorter or longer than the point count" },
};

export interface McRequest {
  kind: "read" | "write" | "random-read" | "random-write-bits" | "random-write-words" | "loopback" | "read-block" | "write-block" | "monitor-entry" | "monitor-run" | "remote" | "type-name";
  /** 0406 — [디바이스, 시작, 워드 수](비트 블록은 1점 = 16비트) */
  blocks?: [DevInfo, number, number][];
  bit?: boolean;
  dev?: DevInfo;
  start?: number;
  n?: number;
  words?: [DevInfo, number][];
  dwords?: [DevInfo, number][];
}

export interface McDecoded {
  frame: McFrame;
  code: McCode;
  dir: "request" | "response";
  /** 왜 이 형식으로 봤는지 */
  why: string;
  serial?: number;
  network: number;
  pc: number;
  io: number;
  drop: number;
  header: Field[];
  /** 요청: 명령·서브명령, 응답: 오류 정보의 명령(있으면) */
  command?: number;
  sub?: number;
  commandName?: string;
  endCode?: number;
  /** 명령 데이터·응답 데이터 풀이 */
  body: Field[];
  items: Item[];
  itemsCaption?: string;
  /** 요청을 끝까지 읽었을 때의 모양(응답 짝 맞추기용) */
  req?: McRequest;
  /** 요청이면 PortDock PLC Simulator 가 답할 종료 코드(0 = 완료). 디바이스 크기(C056)·자기 국 설정은 따지지 않는다 */
  simEnd?: number;
  notes: string[];
}

class McErr {
  code: number;
  detail: string;
  constructor(code: number, detail = "") {
    this.code = code;
    this.detail = detail;
  }
}

const msg = (lang: Lang, ko: string, en: string) => (lang === "ko" ? ko : en);
const h = (n: number, w: number) => n.toString(16).toUpperCase().padStart(w, "0");
const text = (u: number[]) => String.fromCharCode(...u);

export const addrText = (d: DevInfo, n: number) => d.name + (d.hex ? n.toString(16).toUpperCase() : String(n));
const rangeText = (d: DevInfo, a: number, b: number) => (a === b ? addrText(d, a) : `${addrText(d, a)}–${addrText(d, b)}`);

/** 명령 이름 — mc.rs command_name 과 같은 이름 */
export function commandName(cmd: number, sub: number, lang: Lang = "ko") {
  const unit = sub === 0x0001 || sub === 0x0003 ? msg(lang, "비트", "bits") : msg(lang, "워드", "words");
  switch (cmd) {
    case 0x0401:
      return `${msg(lang, "일괄 읽기", "Read")} (${unit})`;
    case 0x1401:
      return `${msg(lang, "일괄 쓰기", "Write")} (${unit})`;
    case 0x0403:
      return msg(lang, "랜덤 읽기", "Read Random");
    case 0x1402:
      return `${msg(lang, "랜덤 쓰기", "Write Random")} (${unit})`;
    case 0x0619:
      return msg(lang, "루프백", "Loopback");
    case 0x0406:
      return msg(lang, "블록 읽기", "Read Block");
    case 0x1406:
      return msg(lang, "블록 쓰기", "Write Block");
    case 0x0801:
      return msg(lang, "모니터 등록", "Entry Monitor Device");
    case 0x0802:
      return msg(lang, "모니터 실행", "Execute Monitor");
    case 0x1001:
      return msg(lang, "원격 RUN", "Remote Run");
    case 0x1002:
      return msg(lang, "원격 STOP", "Remote Stop");
    case 0x1003:
      return msg(lang, "원격 PAUSE", "Remote Pause");
    case 0x1005:
      return msg(lang, "원격 래치 클리어", "Remote Latch Clear");
    case 0x1006:
      return msg(lang, "원격 리셋", "Remote Reset");
    case 0x0101:
      return msg(lang, "형명 읽기", "Read Type Name");
    default:
      return msg(lang, "모르는 명령", "unknown command");
  }
}

function subName(cmd: number, sub: number, lang: Lang) {
  const wide = msg(lang, " · 디바이스 번호 4바이트·코드 2바이트(ASCII 코드 4글자·번호 8글자)", " · 4-byte device number, 2-byte code (ASCII: 4-char code, 8-digit number)");
  if ([0x0619, 0x0802, 0x1001, 0x1002, 0x1003, 0x1005, 0x1006, 0x0101].includes(cmd)) return sub === 0 ? "—" : "?";
  if (cmd === 0x0403 || cmd === 0x0801 || cmd === 0x0406 || cmd === 0x1406) return sub === 0 ? msg(lang, "기본", "standard") : sub === 2 ? msg(lang, "넓은 지정", "wide") + wide : "?";
  switch (sub) {
    case 0x0000:
      return msg(lang, "워드 단위", "word units");
    case 0x0001:
      return msg(lang, "비트 단위(1점씩)", "bit units (1 point each)");
    case 0x0002:
      return msg(lang, "워드 단위", "word units") + wide;
    case 0x0003:
      return msg(lang, "비트 단위", "bit units") + wide;
    default:
      return "?";
  }
}

export const endText = (code: number, lang: Lang = "ko") =>
  code === 0 ? msg(lang, "완료", "completed") : END_CODES[code] ? END_CODES[code][lang] : msg(lang, "이 해석기에 설명이 없는 코드 — 매뉴얼의 오류 코드 표에서 찾으세요", "not described here — look it up in the manual's error code list");

// ---------------------------------------------------------------- 읽기(이진: 작은 자리 바이트 먼저 / ASCII: 16진 글자 큰 자리 먼저)

class Rd {
  i = 0;
  u: number[];
  ascii: boolean;
  constructor(u: number[], ascii: boolean) {
    this.u = u;
    this.ascii = ascii;
  }
  left() {
    return this.u.length - this.i;
  }
  take(n: number) {
    if (this.i + n > this.u.length) throw new McErr(0xc061, "short");
    const s = this.u.slice(this.i, this.i + n);
    this.i += n;
    return s;
  }
  raw(s: number[]) {
    return this.ascii ? text(s) : hex(s);
  }
  /** 이진 n 바이트 또는 ASCII 2n 글자 */
  num(n: number): { v: number; raw: string } {
    if (this.ascii) {
      const s = this.take(n * 2);
      const t = text(s);
      if (!/^[0-9a-fA-F]+$/.test(t)) throw new McErr(0xc050, t);
      return { v: parseInt(t, 16), raw: t };
    }
    const s = this.take(n);
    return { v: s.reduceRight((a, b) => a * 256 + b, 0), raw: hex(s) };
  }
  device(wide: boolean): { dev: DevInfo; no: number; raw: string } {
    if (this.ascii) {
      const code = this.take(wide ? 4 : 2);
      const c = text(code);
      if (!/^[0-9A-Za-z* ]+$/.test(c)) throw new McErr(0xc050, c);
      const end = c.search(/[* ]/) < 0 ? c.length : c.search(/[* ]/);
      const name = c.slice(0, end);
      const dev = end > 0 && /^[* ]*$/.test(c.slice(end)) ? devByName(name) : undefined;
      if (!dev) throw new McErr(0xc05b, c);
      const digits = text(this.take(wide ? 8 : 6));
      const t = digits.replace(/^ +/, "");
      if (!(dev.hex ? /^[0-9A-Fa-f]*$/ : /^[0-9]*$/).test(t)) throw new McErr(0xc050, c + digits);
      return { dev, no: t ? parseInt(t, dev.hex ? 16 : 10) : 0, raw: c + digits };
    }
    const at = this.i;
    const no = this.num(wide ? 4 : 3).v;
    const code = this.num(wide ? 2 : 1).v;
    const dev = MC_DEVICES.find((d) => d.code === code);
    const raw = hex(this.u.slice(at, this.i));
    if (!dev) throw new McErr(0xc05b, raw);
    return { dev, no, raw };
  }
  end() {
    if (this.left() !== 0) throw new McErr(0xc061, "long");
  }
}

function devValue(d: DevInfo, no: number, lang: Lang) {
  const base = `${addrText(d, no)} — ${d.name} ${d[lang]} (${msg(lang, "코드", "code")} ${h(d.code, 2)}`;
  return d.hex ? `${base}, ${msg(lang, `16진 번호 = 10진 ${no}`, `hex number = ${no} decimal`)})` : `${base})`;
}

/** 서브 명령 → [비트 단위, 넓은 지정]. 모르면 C059 */
function subKind(sub: number): [boolean, boolean] {
  if (sub === 0) return [false, false];
  if (sub === 1) return [true, false];
  if (sub === 2) return [false, true];
  if (sub === 3) return [true, true];
  throw new McErr(0xc059);
}

/** 명령 데이터 — mc.rs parse 와 같은 순서로 읽고 같은 종료 코드를 낸다. 읽은 칸은 out 에 남는다 */
function parseRequestBody(cmd: number, sub: number, r: Rd, lang: Lang, out: McDecoded) {
  const f = (name: string, raw: string, value: string) => out.body.push({ name, raw, value });
  const pts = msg(lang, "점", "points");
  if (cmd === 0x0401 || cmd === 0x1401) {
    const [bit, wide] = subKind(sub);
    const d = r.device(wide);
    f(msg(lang, "시작 디바이스", "Head device"), d.raw, devValue(d.dev, d.no, lang));
    const n = r.num(2);
    const unit = bit ? msg(lang, "점(비트)", "points (bits)") : d.dev.bits ? msg(lang, `워드(= ${n.v * 16}점)`, `words (= ${n.v * 16} points)`) : msg(lang, "워드", "words");
    f(msg(lang, "디바이스 점 수", "Number of device points"), n.raw, `${n.v} ${unit}`);
    if (bit && !d.dev.bits) throw new McErr(0xc05b, "word-as-bit");
    const max = !bit ? 960 : r.ascii ? 3584 : 7168;
    if (n.v === 0 || n.v > max) throw new McErr(bit ? 0xc052 : 0xc051);
    const last = d.no + (bit ? n.v : d.dev.bits ? n.v * 16 : n.v) - 1;
    out.req = { kind: cmd === 0x0401 ? "read" : "write", bit, dev: d.dev, start: d.no, n: n.v };
    if (cmd === 0x0401) {
      f(msg(lang, "읽을 범위", "Range read"), "", rangeText(d.dev, d.no, last));
      r.end();
      return;
    }
    out.itemsCaption = msg(lang, "쓸 값", "Values to write");
    if (bit) {
      const vals: number[] = [];
      let raw: number[];
      if (r.ascii) {
        raw = r.take(n.v);
        for (const c of raw) {
          if (c !== 0x30 && c !== 0x31) throw new McErr(0xc060);
          vals.push(c - 0x30);
        }
      } else {
        // 한 점 = 4비트, 앞 점이 위 4비트
        raw = r.take(Math.ceil(n.v / 2));
        for (let i = 0; i < n.v; i++) {
          const nib = i % 2 === 0 ? raw[i >> 1] >> 4 : raw[i >> 1] & 0x0f;
          if (nib > 1) throw new McErr(0xc060);
          vals.push(nib);
        }
      }
      f(msg(lang, "쓸 데이터", "Write data"), r.raw(raw), r.ascii ? msg(lang, "1점 = 1글자(0·1)", "1 point = 1 character (0/1)") : msg(lang, "1점 = 4비트, 앞 점이 위 4비트", "1 point = 4 bits, earlier point in the upper 4 bits"));
      vals.forEach((v, i) => out.items.push({ addr: addrText(d.dev, d.no + i), kind: "bit", value: v }));
    } else {
      const at = r.i;
      for (let k = 0; k < n.v; k++) {
        const w = r.num(2).v;
        out.items.push(d.dev.bits ? { addr: rangeText(d.dev, d.no + k * 16, d.no + k * 16 + 15), kind: "bitword", value: w } : { addr: addrText(d.dev, d.no + k), kind: "word", value: w });
      }
      f(msg(lang, "쓸 데이터", "Write data"), r.raw(r.u.slice(at, r.i)), `${n.v} ${msg(lang, "워드", "words")}`);
    }
    r.end();
    return;
  }
  if (cmd === 0x0403 || cmd === 0x0801) {
    if (sub !== 0 && sub !== 2) throw new McErr(0xc059);
    const wide = sub === 2;
    const nw = r.num(1);
    f(msg(lang, "워드 점 수", "Word access points"), nw.raw, String(nw.v));
    const nd = r.num(1);
    f(msg(lang, "더블워드 점 수", "Double-word access points"), nd.raw, String(nd.v));
    if (nw.v + nd.v === 0 || nw.v + nd.v > (wide ? 96 : 192)) throw new McErr(0xc054);
    const words: [DevInfo, number][] = [];
    const dwords: [DevInfo, number][] = [];
    for (let k = 0; k < nw.v; k++) {
      const d = r.device(wide);
      words.push([d.dev, d.no]);
      f(`${msg(lang, "워드", "Word")} ${k + 1}`, d.raw, devValue(d.dev, d.no, lang) + (d.dev.bits ? ` · ${rangeText(d.dev, d.no, d.no + 15)}` : ""));
    }
    for (let k = 0; k < nd.v; k++) {
      const d = r.device(wide);
      dwords.push([d.dev, d.no]);
      const span = d.dev.bits ? 32 : 2;
      f(`${msg(lang, "더블워드", "Double word")} ${k + 1}`, d.raw, devValue(d.dev, d.no, lang) + ` · ${rangeText(d.dev, d.no, d.no + span - 1)}`);
    }
    r.end();
    if (cmd === 0x0801) {
      // 타이머·카운터 접점·코일은 등록할 수 없다(SLMP 5.2)
      if ([...words, ...dwords].some(([d]) => ["TS", "TC", "CS", "CC"].includes(d.name))) throw new McErr(0xc05b, "monitor");
      out.req = { kind: "monitor-entry", words, dwords };
      out.notes.push(msg(lang, "등록만 하고 응답 데이터는 없습니다 — 값은 0802(모니터 실행) 응답에 0403 과 같은 모양으로 옵니다", "Registers only; no response data — the values come in the 0802 (Execute Monitor) reply in the 0403 layout"));
      return;
    }
    out.req = { kind: "random-read", words, dwords };
    return;
  }
  if (cmd === 0x0802) {
    if (sub !== 0) throw new McErr(0xc059);
    r.end();
    out.req = { kind: "monitor-run" };
    out.notes.push(msg(lang, "0801(모니터 등록)을 먼저 보내지 않았으면 C05D 로 답합니다", "Answered with C05D unless 0801 (Entry Monitor Device) was sent first"));
    return;
  }
  if (cmd === 0x0406 || cmd === 0x1406) {
    if (sub !== 0 && sub !== 2) throw new McErr(0xc059);
    const wide = sub === 2;
    const write = cmd === 0x1406;
    const nw = r.num(1);
    f(msg(lang, "워드 블록 수", "Word device blocks"), nw.raw, String(nw.v));
    const nb = r.num(1);
    f(msg(lang, "비트 블록 수", "Bit device blocks"), nb.raw, String(nb.v));
    if (nw.v + nb.v === 0 || nw.v + nb.v > (wide ? 60 : 120)) throw new McErr(0xc051);
    const blocks: [DevInfo, number, number][] = [];
    let total = 0;
    if (write) out.itemsCaption = msg(lang, "쓸 값", "Values to write");
    for (let k = 0; k < nw.v + nb.v; k++) {
      const bitBlock = k >= nw.v;
      const d = r.device(wide);
      const n = r.num(2);
      const label = `${bitBlock ? msg(lang, "비트 블록", "Bit block") : msg(lang, "워드 블록", "Word block")} ${(bitBlock ? k - nw.v : k) + 1}`;
      const span = bitBlock ? n.v * 16 : n.v;
      f(label, `${d.raw} ${n.raw}`, `${devValue(d.dev, d.no, lang)} · ${n.v} ${pts}${n.v ? ` · ${rangeText(d.dev, d.no, d.no + span - 1)}` : ""}`);
      if (d.dev.bits !== bitBlock) throw new McErr(0xc05b, "block");
      if (n.v === 0) throw new McErr(0xc051);
      total += n.v;
      blocks.push([d.dev, d.no, n.v]);
      if (write) {
        const at = r.i;
        for (let i = 0; i < n.v; i++) {
          const w = r.num(2).v;
          out.items.push(bitBlock ? { addr: rangeText(d.dev, d.no + i * 16, d.no + i * 16 + 15), kind: "bitword", value: w } : { addr: addrText(d.dev, d.no + i), kind: "word", value: w });
        }
        f(`${label} — ${msg(lang, "쓸 데이터", "write data")}`, r.raw(r.u.slice(at, r.i)), `${n.v} ${msg(lang, "워드", "words")}`);
      }
    }
    // 점 수 상한(SLMP 5.2): 읽기는 합 ≤ 960, 쓰기는 블록 수 × 4(0002 는 × 9) + 합 ≤ 960
    if (total + (write ? (nw.v + nb.v) * (wide ? 9 : 4) : 0) > 960) throw new McErr(0xc051);
    r.end();
    out.req = write ? { kind: "write-block" } : { kind: "read-block", blocks };
    return;
  }
  if ([0x1001, 0x1002, 0x1003, 0x1005, 0x1006].includes(cmd)) {
    if (sub !== 0) throw new McErr(0xc059);
    if (cmd === 0x1001) {
      const mode = r.num(2);
      f(msg(lang, "모드", "Mode"), mode.raw, mode.v === 1 ? msg(lang, "0001 강제 실행 아님", "0001 forced execution not allowed") : mode.v === 3 ? msg(lang, "0003 강제 실행", "0003 forced execution allowed") : "?");
      const clear = r.num(1);
      f(msg(lang, "클리어 모드", "Clear mode"), clear.raw, [msg(lang, "00 지우지 않음", "00 do not clear"), msg(lang, "01 래치 범위 밖 지움", "01 clear outside the latch range"), msg(lang, "02 래치 범위까지 지움", "02 clear including the latch range")][clear.v] ?? "?");
      const fixed = r.num(1);
      f(msg(lang, "고정 값", "Fixed value"), fixed.raw, fixed.v === 0 ? "00" : "?");
      if ((mode.v !== 1 && mode.v !== 3) || clear.v > 2 || fixed.v !== 0) throw new McErr(0xc05c);
    } else if (cmd === 0x1003) {
      const mode = r.num(2);
      f(msg(lang, "모드", "Mode"), mode.raw, mode.v === 1 ? msg(lang, "0001 강제 실행 아님", "0001 forced execution not allowed") : mode.v === 3 ? msg(lang, "0003 강제 실행", "0003 forced execution allowed") : "?");
      if (mode.v !== 1 && mode.v !== 3) throw new McErr(0xc05c);
    } else {
      const v = r.num(2);
      f(msg(lang, "고정 값", "Fixed value"), v.raw, v.v === 1 ? "0001" : "?");
      if (v.v !== 1) throw new McErr(0xc05c);
    }
    r.end();
    out.req = { kind: "remote" };
    out.notes.push(
      cmd === 0x1006
        ? msg(lang, "원격 리셋은 응답을 보내지 않습니다(SLMP 5.6) — PLC Simulator 는 흉내 상태를 RUN 으로 돌리고 모니터 등록을 지웁니다", "Remote Reset sends no reply (SLMP 5.6) — PLC Simulator returns its simulated state to RUN and clears the monitor registration")
        : msg(lang, "응답 데이터는 없습니다 — PLC Simulator 는 흉내 운전 상태(RUN/STOP/PAUSE)만 바꿉니다", "No response data — PLC Simulator only changes its simulated run state (RUN/STOP/PAUSE)"),
    );
    return;
  }
  if (cmd === 0x0101) {
    if (sub !== 0) throw new McErr(0xc059);
    r.end();
    out.req = { kind: "type-name" };
    return;
  }
  if (cmd === 0x1402) {
    const [bit, wide] = subKind(sub);
    out.itemsCaption = msg(lang, "쓸 값", "Values to write");
    if (bit) {
      const n = r.num(1);
      f(msg(lang, "비트 점 수", "Bit access points"), n.raw, `${n.v} ${pts}`);
      if (n.v === 0 || n.v > (wide ? 94 : 188)) throw new McErr(0xc053);
      for (let k = 0; k < n.v; k++) {
        const d = r.device(wide);
        if (!d.dev.bits) throw new McErr(0xc05b, "word-as-bit");
        const v = r.num(wide ? 2 : 1);
        f(`${msg(lang, "비트", "Bit")} ${k + 1}`, `${d.raw} ${v.raw}`, `${addrText(d.dev, d.no)} ← ${v.v === 1 ? "ON" : v.v === 0 ? "OFF" : v.v}`);
        if (v.v > 1) throw new McErr(0xc060);
        out.items.push({ addr: addrText(d.dev, d.no), kind: "bit", value: v.v });
      }
      out.req = { kind: "random-write-bits" };
      r.end();
      return;
    }
    const nw = r.num(1);
    f(msg(lang, "워드 점 수", "Word access points"), nw.raw, String(nw.v));
    const nd = r.num(1);
    f(msg(lang, "더블워드 점 수", "Double-word access points"), nd.raw, String(nd.v));
    if (nw.v + nd.v === 0 || nw.v * 12 + nd.v * 14 > (wide ? 960 : 1920)) throw new McErr(0xc054);
    for (let k = 0; k < nw.v; k++) {
      const d = r.device(wide);
      const v = r.num(2);
      f(`${msg(lang, "워드", "Word")} ${k + 1}`, `${d.raw} ${v.raw}`, `${addrText(d.dev, d.no)} ← ${h(v.v, 4)}`);
      out.items.push(d.dev.bits ? { addr: rangeText(d.dev, d.no, d.no + 15), kind: "bitword", value: v.v } : { addr: addrText(d.dev, d.no), kind: "word", value: v.v });
    }
    for (let k = 0; k < nd.v; k++) {
      const d = r.device(wide);
      const v = r.num(4);
      f(`${msg(lang, "더블워드", "Double word")} ${k + 1}`, `${d.raw} ${v.raw}`, `${addrText(d.dev, d.no)} ← ${h(v.v, 8)}`);
      out.items.push({ addr: rangeText(d.dev, d.no, d.no + (d.dev.bits ? 31 : 1)), kind: "dword", value: v.v });
    }
    out.req = { kind: "random-write-words" };
    r.end();
    return;
  }
  if (cmd === 0x0619) {
    if (sub !== 0) throw new McErr(0xc059);
    const n = r.num(2);
    f(msg(lang, "루프백 데이터 수", "Number of loopback data"), n.raw, `${n.v} ${msg(lang, "바이트", "bytes")}`);
    if (n.v < 1 || n.v > 960) throw new McErr(0xc05c);
    const data = r.take(n.v);
    f(msg(lang, "루프백 데이터", "Loopback data"), r.raw(data), JSON.stringify(text(data)));
    out.req = { kind: "loopback", n: n.v };
    r.end();
    return;
  }
  throw new McErr(0xc059);
}

/** 완료 응답의 데이터 — 짝 요청이 있으면 그 요청대로 디바이스마다 풀고, 없으면 워드로만 */
function parseResponseData(r: Rd, req: McRequest | undefined, lang: Lang, out: McDecoded) {
  const at = r.i;
  const f = (name: string, raw: string, value: string) => out.body.push({ name, raw, value });
  const dataRaw = () => r.raw(r.u.slice(at));
  if (!req) {
    if (r.left() === 0) {
      f(msg(lang, "응답 데이터", "Response data"), "", msg(lang, "없음 — 쓰기 명령의 완료 응답 모양", "none — the shape of a completed write"));
      return;
    }
    const unit = r.ascii ? 4 : 2;
    f(msg(lang, "응답 데이터", "Response data"), dataRaw(), msg(lang, "짝 요청을 넣으면 디바이스마다 풉니다", "add the matching request to decode it per device"));
    if (r.left() % unit === 0) {
      out.itemsCaption = msg(lang, "짝 요청 없이 16비트 워드로 본 값", "Read as 16-bit words (no matching request)");
      for (let k = 0; r.left() > 0; k++) out.items.push({ addr: `#${k}`, kind: "word", value: r.num(2).v });
    } else if (!r.ascii) out.notes.push(msg(lang, "데이터가 홀수 바이트 — 비트 단위 읽기(1점 = 4비트)이거나 루프백일 수 있습니다", "Odd number of data bytes — possibly a bit-unit read (1 point = 4 bits) or a loopback"));
    return;
  }
  out.itemsCaption = msg(lang, "읽은 값(짝 요청 기준)", "Values read (from the matching request)");
  try {
    if (req.kind === "read" && req.dev && req.start !== undefined && req.n) {
      const { dev, start, n } = req;
      if (req.bit) {
        const raw = r.take(r.ascii ? n : Math.ceil(n / 2));
        for (let i = 0; i < n; i++) {
          const v = r.ascii ? raw[i] - 0x30 : i % 2 === 0 ? raw[i >> 1] >> 4 : raw[i >> 1] & 0x0f;
          out.items.push({ addr: addrText(dev, start + i), kind: "bit", value: v });
        }
      } else {
        for (let k = 0; k < n; k++) {
          const w = r.num(2).v;
          out.items.push(dev.bits ? { addr: rangeText(dev, start + k * 16, start + k * 16 + 15), kind: "bitword", value: w } : { addr: addrText(dev, start + k), kind: "word", value: w });
        }
      }
    } else if (req.kind === "random-read") {
      for (const [d, no] of req.words ?? []) out.items.push(d.bits ? { addr: rangeText(d, no, no + 15), kind: "bitword", value: r.num(2).v } : { addr: addrText(d, no), kind: "word", value: r.num(2).v });
      for (const [d, no] of req.dwords ?? []) out.items.push({ addr: rangeText(d, no, no + (d.bits ? 31 : 1)), kind: "dword", value: r.num(4).v });
    } else if (req.kind === "read-block" || req.kind === "monitor-run") {
      for (const [d, no, n] of req.blocks ?? []) {
        for (let k = 0; k < n; k++) {
          const w = r.num(2).v;
          out.items.push(d.bits ? { addr: rangeText(d, no + k * 16, no + k * 16 + 15), kind: "bitword", value: w } : { addr: addrText(d, no + k), kind: "word", value: w });
        }
      }
    } else if (req.kind === "type-name") {
      const name = r.take(16);
      f(msg(lang, "형명", "Model name"), r.raw(name), JSON.stringify(text(name).replace(/ +$/, "")));
      const code = r.num(2);
      f(msg(lang, "형명 코드", "Model code"), code.raw, h(code.v, 4));
    } else if (req.kind === "loopback") {
      const n = r.num(2);
      f(msg(lang, "루프백 데이터 수", "Number of loopback data"), n.raw, `${n.v} ${msg(lang, "바이트", "bytes")}`);
      const data = r.take(n.v);
      f(msg(lang, "루프백 데이터", "Loopback data"), r.raw(data), JSON.stringify(text(data)));
    }
    if (r.left() !== 0) throw new McErr(0xc061, "long");
    f(msg(lang, "응답 데이터", "Response data"), dataRaw(), r.u.length === at ? msg(lang, "없음(쓰기 완료)", "none (write completed)") : msg(lang, "짝 요청과 길이가 맞음", "length matches the request"));
  } catch (e) {
    if (!(e instanceof McErr)) throw e;
    out.notes.push(msg(lang, "응답 데이터 길이가 짝 요청과 맞지 않습니다 — 다른 요청의 응답이거나 프레임이 잘렸을 수 있습니다", "The response data length does not match the request — it may answer a different request, or the frame was cut"));
  }
}

// ---------------------------------------------------------------- 머리

const SUBHEADERS: Record<string, [McFrame, "request" | "response"]> = { "5000": ["3e", "request"], D000: ["3e", "response"], "5400": ["4e", "request"], D400: ["4e", "response"] };

/** 서브헤더만 보고 형식 고르기 — 이진은 첫 2바이트, ASCII 는 첫 4글자 */
function kindOf(u: number[], ascii: boolean): [McFrame, "request" | "response"] | undefined {
  const key = ascii ? text(u.slice(0, 4)).toUpperCase() : u.length >= 2 && u[1] === 0 ? h(u[0], 2) + "00" : "";
  return SUBHEADERS[key];
}

/** 길이 칸이 실제와 맞는지(형식 고르기용) */
function lengthFits(u: number[], ascii: boolean) {
  const k = kindOf(u, ascii);
  if (!k) return false;
  const off = (k[0] === "3e" ? 2 : 6) * (ascii ? 2 : 1) + 5 * (ascii ? 2 : 1);
  const r = new Rd(u.slice(off), ascii);
  try {
    return r.num(2).v === r.left();
  } catch {
    return false;
  }
}

function decodeUnits(u: number[], code: McCode, why: string, lang: Lang, pair?: McDecoded): McDecoded {
  const ascii = code === "ascii";
  const k = kindOf(u, ascii)!;
  const [frame, dir] = k;
  const r = new Rd(u, ascii);
  const out: McDecoded = { frame, code, dir, why, network: 0, pc: 0, io: 0, drop: 0, header: [], body: [], items: [], notes: [] };
  const f = (name: string, raw: string, value: string) => out.header.push({ name, raw, value });
  const short = () => new Error(msg(lang, "머리가 짧습니다 — 프레임 전체를 붙여 넣으세요", "The header is too short — paste the whole frame"));
  try {
    const sh = r.take(ascii ? 4 : 2);
    f(msg(lang, "서브헤더", "Subheader"), r.raw(sh), `${frame.toUpperCase()} ${dir === "request" ? msg(lang, "요청", "request") : msg(lang, "응답", "response")}`);
    if (frame === "4e") {
      const s = r.num(2);
      out.serial = s.v;
      f(msg(lang, "일련번호", "Serial number"), s.raw, `${h(s.v, 4)} — ${msg(lang, "응답은 요청과 같은 값", "the response carries the same value")}`);
      const z = r.num(2);
      f(msg(lang, "고정(0000)", "Fixed (0000)"), z.raw, z.v === 0 ? "0000" : msg(lang, `${h(z.v, 4)} — 0000 이어야 합니다`, `${h(z.v, 4)} — should be 0000`));
    }
    const net = r.num(1);
    const pc = r.num(1);
    const io = r.num(2);
    const drop = r.num(1);
    Object.assign(out, { network: net.v, pc: pc.v, io: io.v, drop: drop.v });
    f(msg(lang, "네트워크 번호", "Network No."), net.raw, h(net.v, 2));
    f(msg(lang, "PC 번호(국번)", "PC No. (station)"), pc.raw, `${h(pc.v, 2)} (${pc.v})`);
    f(msg(lang, "요청 대상 모듈 I/O 번호", "Request destination module I/O No."), io.raw, h(io.v, 4));
    f(msg(lang, "요청 대상 모듈 국번(멀티드롭)", "Request destination module station No. (multidrop)"), drop.raw, h(drop.v, 2));
    if (net.v === 0 && pc.v === 0xff && io.v === 0x03ff && drop.v === 0)
      out.notes.push(msg(lang, "국 정보 00·FF·03FF·00 — 연결된 국 자신(자기 국) 지정입니다", "Station fields 00·FF·03FF·00 address the connected station itself (own station)"));
    const len = r.num(2);
    const after = r.left();
    const unit = ascii ? msg(lang, "글자", "characters") : msg(lang, "바이트", "bytes");
    const fits = len.v === after;
    f(dir === "request" ? msg(lang, "요청 데이터 길이", "Request data length") : msg(lang, "응답 데이터 길이", "Response data length"), len.raw, `${len.v} ${unit} — ${fits ? msg(lang, "뒤따르는 길이와 같음", "matches what follows") : msg(lang, `실제로 뒤따르는 것은 ${after} ${unit}`, `${after} ${unit} actually follow`)}`);
    if (!fits) out.notes.push(msg(lang, `길이 칸(${len.v})이 실제(${after})와 다릅니다 — 프레임이 잘렸거나 두 프레임이 붙었을 수 있습니다`, `The length field (${len.v}) differs from the actual length (${after}) — the frame may be cut or two frames joined`));
    if (dir === "request") {
      if (after < 6 * (ascii ? 2 : 1)) throw short();
      const t = r.num(2);
      f(msg(lang, "감시 타이머", "Monitoring timer"), t.raw, t.v === 0 ? msg(lang, "0 — 끝없이 기다림", "0 — wait indefinitely") : `${t.v} × 0.25 s = ${(t.v * 0.25).toFixed(2).replace(/\.?0+$/, "")} s`);
      const c = r.num(2);
      const s = r.num(2);
      out.command = c.v;
      out.sub = s.v;
      out.commandName = commandName(c.v, s.v, lang);
      f(msg(lang, "명령", "Command"), c.raw, `${h(c.v, 4)} ${out.commandName}`);
      f(msg(lang, "서브명령", "Subcommand"), s.raw, `${h(s.v, 4)} ${subName(c.v, s.v, lang)}`);
      // 길이 칸이 틀리면 PLC Simulator 는 데이터를 보기 전에 C057 로 답한다(풀이는 있는 데이터로 계속)
      try {
        parseRequestBody(c.v, s.v, r, lang, out);
        out.simEnd = fits ? 0 : 0xc057;
      } catch (e) {
        if (!(e instanceof McErr)) throw e;
        out.simEnd = fits ? e.code : 0xc057;
        if (fits && e.code === 0xc061) out.notes.push(e.detail === "short" ? msg(lang, "명령 데이터가 점 수보다 짧습니다", "The command data is shorter than the point count needs") : msg(lang, "명령 데이터 뒤에 남는 바이트가 있습니다", "There are bytes left over after the command data"));
      }
      if (c.v === 0x0401 || c.v === 0x0403) out.notes.push(msg(lang, "응답의 값까지 풀려면 이 요청을 «짝 요청» 칸에 두고 응답을 붙여 넣으세요", "To decode the reply's values, keep this request in «Matching request» and paste the reply"));
    } else {
      if (after < (ascii ? 4 : 2)) throw short();
      const e = r.num(2);
      out.endCode = e.v;
      f(msg(lang, "종료 코드", "End code"), e.raw, `${h(e.v, 4)} ${endText(e.v, lang)}`);
      if (e.v !== 0) {
        // 오류 정보: 요청의 국 정보 + 명령·서브명령(SLMP 4.2)
        try {
          const items: [string, number, number][] = [
            [msg(lang, "오류 정보 — 네트워크 번호", "Error info — network No."), 1, 2],
            [msg(lang, "오류 정보 — PC 번호", "Error info — PC No."), 1, 2],
            [msg(lang, "오류 정보 — I/O 번호", "Error info — I/O No."), 2, 4],
            [msg(lang, "오류 정보 — 국번", "Error info — station No."), 1, 2],
          ];
          for (const [name, n, w] of items) {
            const v = r.num(n);
            out.body.push({ name, raw: v.raw, value: h(v.v, w) });
          }
          const c = r.num(2);
          const s = r.num(2);
          out.command = c.v;
          out.sub = s.v;
          out.commandName = commandName(c.v, s.v, lang);
          out.body.push({ name: msg(lang, "오류 정보 — 명령", "Error info — command"), raw: c.raw, value: `${h(c.v, 4)} ${out.commandName}` });
          out.body.push({ name: msg(lang, "오류 정보 — 서브명령", "Error info — subcommand"), raw: s.raw, value: h(s.v, 4) });
        } catch (x) {
          if (!(x instanceof McErr)) throw x;
          out.notes.push(msg(lang, "오류 정보(국 정보·명령·서브명령 9바이트)가 모자랍니다", "The error information (station fields, command, subcommand) is incomplete"));
        }
        if (r.left() > 0) out.notes.push(msg(lang, "오류 정보 뒤에 남는 데이터가 있습니다", "Data is left over after the error information"));
      } else {
        let req = pair?.req;
        if (pair && pair.dir !== "request") req = undefined;
        if (pair && pair.dir === "request" && (pair.code !== code || pair.frame !== frame))
          out.notes.push(msg(lang, `짝 요청은 ${pair.frame.toUpperCase()} ${pair.code === "ascii" ? "ASCII" : "이진"} 입니다 — 형식이 달라 짝으로 쓰지 않았습니다`, `The matching request is ${pair.frame.toUpperCase()} ${pair.code} — different format, not used`));
        else if (pair && pair.dir === "request" && pair.serial !== undefined && out.serial !== undefined && pair.serial !== out.serial)
          out.notes.push(msg(lang, `일련번호가 짝 요청(${h(pair.serial, 4)})과 다릅니다`, `The serial number differs from the matching request (${h(pair.serial, 4)})`));
        parseResponseData(r, pair && pair.code === code && pair.frame === frame ? req : undefined, lang, out);
      }
    }
  } catch (e) {
    if (e instanceof McErr) throw e.code === 0xc050 ? new Error(msg(lang, `머리에 16진이 아닌 글자: «${e.detail}»`, `Non-hex characters in the header: «${e.detail}»`)) : short();
    throw e;
  }
  return out;
}

/** 글자 → 단위(이진 바이트 또는 ASCII 글자 코드) 후보. 앞에 둔 것을 먼저 고른다 */
function candidates(input: string, mode: McMode): { code: McCode; u: number[]; src: string }[] {
  const out: { code: McCode; u: number[]; src: string }[] = [];
  let bytes: number[] | null = null;
  try {
    bytes = parseHex(input);
  } catch {
    bytes = null;
  }
  if (mode !== "ascii" && bytes && kindOf(bytes, false)) out.push({ code: "binary", u: bytes, src: "hex" });
  if (mode !== "binary") {
    const raw = input.replace(/^[\r\n]+|[\r\n]+$/g, "").trim();
    const codes = (s: string) => [...s].map((c) => c.charCodeAt(0));
    const ok = (s: string) => /^[\x20-\x7e]+$/.test(s) && kindOf(codes(s), true);
    if (ok(raw)) out.push({ code: "ascii", u: codes(raw), src: "text" });
    const tight = raw.replace(/\s+/g, "");
    if (tight !== raw && ok(tight)) out.push({ code: "ascii", u: codes(tight), src: "text-tight" });
    if (bytes && bytes.every((b) => b >= 0x20 && b < 0x7f) && kindOf(bytes, true)) out.push({ code: "ascii", u: bytes, src: "hex-ascii" });
  }
  return out;
}

/** 프레임 하나를 푼다. pair = 응답을 풀 때 쓸 짝 요청(글). 풀 수 없으면 Error(까닭) */
export function decodeMc(input: string, opts: { mode?: McMode; lang?: Lang; pair?: string } = {}): McDecoded {
  const lang = opts.lang ?? "ko";
  const mode = opts.mode ?? "auto";
  if (!input.trim()) throw new Error(msg(lang, "프레임을 붙여 넣으세요", "Paste a frame"));
  const cs = candidates(input, mode);
  if (!cs.length)
    throw new Error(
      mode === "ascii"
        ? msg(lang, "ASCII 프레임은 5000·D000·5400·D400 으로 시작합니다", "An ASCII frame starts with 5000, D000, 5400 or D400")
        : mode === "binary"
          ? msg(lang, "이진 프레임은 50 00·D0 00·54 00·D4 00 으로 시작합니다(HEX 로 붙여 넣기)", "A binary frame starts with 50 00, D0 00, 54 00 or D4 00 (paste as HEX)")
          : msg(lang, "서브헤더를 찾지 못했습니다 — 이진은 50 00·D0 00·54 00·D4 00, ASCII 는 5000·D000·5400·D400 으로 시작합니다", "No subheader found — binary starts with 50 00, D0 00, 54 00 or D4 00; ASCII with 5000, D000, 5400 or D400"),
    );
  const pick = cs.find((c) => lengthFits(c.u, c.code === "ascii")) ?? cs[0];
  const k = kindOf(pick.u, pick.code === "ascii")!;
  const what = `${k[0].toUpperCase()} ${k[1] === "request" ? msg(lang, "요청", "request") : msg(lang, "응답", "response")}`;
  const why =
    pick.code === "binary"
      ? msg(lang, `이진 — 첫 2바이트 ${hex(pick.u.slice(0, 2))} 이 ${what} 서브헤더`, `Binary — first two bytes ${hex(pick.u.slice(0, 2))} are the ${what} subheader`)
      : pick.src === "hex-ascii"
        ? msg(lang, `ASCII — HEX 로 붙여 넣은 바이트가 글자 «${text(pick.u.slice(0, 4))}» 로 시작(${what})`, `ASCII — the HEX bytes spell «${text(pick.u.slice(0, 4))}» (${what})`)
        : msg(lang, `ASCII — 글자 «${text(pick.u.slice(0, 4))}» 로 시작(${what})${pick.src === "text-tight" ? ", 띄어쓰기는 빼고 읽음" : ""}`, `ASCII — starts with «${text(pick.u.slice(0, 4))}» (${what})${pick.src === "text-tight" ? ", spaces removed" : ""}`);
  let pair: McDecoded | undefined;
  if (opts.pair?.trim()) {
    try {
      pair = decodeMc(opts.pair, { mode, lang });
    } catch {
      pair = undefined;
    }
  }
  const d = decodeUnits(pick.u, pick.code, why, lang, pair);
  if (opts.pair?.trim() && d.dir === "response" && (!pair || pair.dir !== "request"))
    d.notes.push(msg(lang, "«짝 요청» 칸의 글은 요청 프레임으로 풀리지 않아 쓰지 않았습니다", "The «Matching request» text did not decode as a request and was not used"));
  return d;
}

// ---------------------------------------------------------------- 요청 만들기

export type BuildOp = "read-words" | "read-bits" | "write-words" | "write-bits";

export interface BuildOpts {
  frame: McFrame;
  code: McCode;
  op: BuildOp;
  dev: string;
  start: number;
  count: number;
  values?: number[];
  serial?: number;
  /** 감시 타이머(0.25 s 단위), 기본 0x0010 */
  timer?: number;
}

/** 시작 번호 글 — 16진 디바이스는 16진(«1F»·«X1F»·«0x1F»), 나머지는 10진 */
export function parseStart(dev: DevInfo, s: string): number {
  let t = s.trim().toUpperCase();
  if (t.startsWith(dev.name)) t = t.slice(dev.name.length);
  if (dev.hex) t = t.replace(/^0X/, "");
  if (!(dev.hex ? /^[0-9A-F]{1,8}$/ : /^[0-9]{1,10}$/).test(t)) return NaN;
  return parseInt(t, dev.hex ? 16 : 10);
}

/** 일괄 읽기·쓰기(0401·1401, 서브 0000·0001) 요청 — 자기 국(00 FF 03FF 00). 이진은 바이트, ASCII 는 글자 코드를 돌려준다 */
export function buildRequest(o: BuildOpts, lang: Lang = "ko"): number[] {
  const ascii = o.code === "ascii";
  const dev = devByName(o.dev);
  if (!dev) throw new Error(msg(lang, `모르는 디바이스: ${o.dev}`, `Unknown device: ${o.dev}`));
  const bit = o.op.endsWith("bits");
  const write = o.op.startsWith("write");
  if (bit && !dev.bits) throw new Error(msg(lang, `${dev.name} 는 워드 디바이스라 비트 단위로 읽고 쓸 수 없습니다`, `${dev.name} is a word device; it cannot be accessed in bit units`));
  const max = !bit ? 960 : ascii ? 3584 : 7168;
  if (!Number.isInteger(o.count) || o.count < 1 || o.count > max) throw new Error(msg(lang, `점 수는 1~${max}`, `Points must be 1–${max}`));
  if (!Number.isInteger(o.start) || o.start < 0 || o.start > 0xffffff) throw new Error(msg(lang, "시작 번호가 범위(0~FFFFFF) 밖입니다", "Start number out of range (0–FFFFFF)"));
  const vals = o.values ?? [];
  if (write) {
    if (vals.length !== o.count) throw new Error(msg(lang, `쓸 값이 ${vals.length}개 — 점 수 ${o.count} 과 같아야 합니다`, `${vals.length} values — must equal the point count ${o.count}`));
    const lim = bit ? 1 : 0xffff;
    if (vals.some((v) => !Number.isInteger(v) || v < 0 || v > lim)) throw new Error(bit ? msg(lang, "비트 값은 0·1", "Bit values must be 0 or 1") : msg(lang, "워드 값은 0~65535(HEX 0~FFFF)", "Word values must be 0–65535 (hex 0–FFFF)"));
  }
  const num = (v: number, n: number) => (ascii ? [...h(v, n * 2)].map((c) => c.charCodeAt(0)) : Array.from({ length: n }, (_, i) => Math.floor(v / 256 ** i) & 0xff));
  const body: number[] = [...num(o.timer ?? 0x0010, 2), ...num(write ? 0x1401 : 0x0401, 2), ...num(bit ? 1 : 0, 2)];
  if (ascii) {
    const code = (dev.name + "**").slice(0, 2);
    const no = dev.hex ? h(o.start, 6) : String(o.start).padStart(6, "0");
    if (no.length > 6) throw new Error(msg(lang, "ASCII 번호는 6자리까지", "ASCII device numbers have at most 6 digits"));
    body.push(...[...(code + no)].map((c) => c.charCodeAt(0)));
  } else body.push(...num(o.start, 3), dev.code);
  body.push(...num(o.count, 2));
  if (write) {
    if (bit && ascii) body.push(...vals.map((v) => 0x30 + v));
    else if (bit) for (let i = 0; i < vals.length; i += 2) body.push((vals[i] << 4) | (vals[i + 1] ?? 0));
    else for (const v of vals) body.push(...num(v, 2));
  }
  const sub = o.frame === "4e" ? (ascii ? [..."5400", ...h(o.serial ?? 0, 4), ..."0000"].map((c) => c.charCodeAt(0)) : [0x54, 0x00, ...num(o.serial ?? 0, 2), 0x00, 0x00]) : ascii ? [..."5000"].map((c) => c.charCodeAt(0)) : [0x50, 0x00];
  return [...sub, ...num(0x00, 1), ...num(0xff, 1), ...num(0x03ff, 2), ...num(0x00, 1), ...num(body.length, 2), ...body];
}

/** 만든 프레임을 보일 글 — 이진은 HEX, ASCII 는 글자 그대로 */
export const frameText = (u: number[], code: McCode) => (code === "ascii" ? text(u) : hex(u));
