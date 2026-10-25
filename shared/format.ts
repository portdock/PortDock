// PortDock 공용 화면 도우미 — 모든 프로그램이 같은 표기를 쓴다.

export const hex = (bytes: number[]) => bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");

// ---- 글자 인코딩 — 글자 보기(ascii)와 ASCII 송신(백엔드 codec::Encoding)에 쓴다
export type Encoding = "utf-8" | "cp949" | "latin1" | "ascii";

export const ENCODINGS: { id: Encoding; label: string }[] = [
  { id: "utf-8", label: "UTF-8" },
  { id: "cp949", label: "CP949 (EUC-KR)" },
  { id: "latin1", label: "Latin-1 (ISO-8859-1)" },
  { id: "ascii", label: "ASCII (7bit)" },
];

export const isEncoding = (v: unknown): v is Encoding => ENCODINGS.some((e) => e.id === v);

/** 이 창의 글자 보기 인코딩 — 설정이 바뀌면 앱이 setTextEncoding 으로 바꾼다(복사·저장도 같은 값) */
let textEncoding: Encoding = "utf-8";
export function setTextEncoding(e: Encoding) {
  textEncoding = isEncoding(e) ? e : "utf-8";
}
export const getTextEncoding = () => textEncoding;

const CONTROL: Record<number, string> = { 0x0d: "<CR>", 0x0a: "<LF>", 0x09: "<TAB>", 0x02: "<STX>", 0x03: "<ETX>", 0x06: "<ACK>", 0x15: "<NAK>" };
const hx = (b: number) => `<${b.toString(16).toUpperCase().padStart(2, "0")}>`;

/** CP949 두 바이트 → 글자(없으면 null). 한 번 푼 것은 기억한다 */
const cp949Cache = new Map<number, string | null>();
let cp949Decoder: TextDecoder | null | undefined;
function cp949Pair(a: number, b: number): string | null {
  const key = (a << 8) | b;
  const hit = cp949Cache.get(key);
  if (hit !== undefined) return hit;
  if (cp949Decoder === undefined) {
    try {
      cp949Decoder = new TextDecoder("euc-kr", { fatal: true });
    } catch {
      cp949Decoder = null;
    }
  }
  let out: string | null = null;
  try {
    const s = cp949Decoder ? cp949Decoder.decode(new Uint8Array([a, b])) : "";
    out = [...s].length === 1 && s.charCodeAt(0) >= 0x80 ? s : null;
  } catch {
    out = null;
  }
  cp949Cache.set(key, out);
  return out;
}

/**
 * 받은 바이트를 글자로 — 제어 문자는 <CR> <LF> <02> 처럼, 그 인코딩으로 읽을 수 없는 바이트는 <XX>.
 * 백엔드 codec::text_view(파일 로그의 ASCII 칸)와 같은 규칙.
 */
export function ascii(bytes: number[], enc: Encoding = textEncoding) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) {
      out += CONTROL[b] ?? (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : hx(b));
      continue;
    }
    if (enc === "latin1") {
      out += b >= 0xa0 ? String.fromCharCode(b) : hx(b);
    } else if (enc === "utf-8") {
      const n = b >= 0xc2 && b <= 0xdf ? 2 : b >= 0xe0 && b <= 0xef ? 3 : b >= 0xf0 && b <= 0xf4 ? 4 : 0;
      const ch = n && i + n <= bytes.length ? utf8At(bytes, i, n) : null;
      if (ch != null) {
        out += ch;
        i += n - 1;
      } else out += hx(b);
    } else if (enc === "cp949") {
      const ch = b >= 0x81 && b <= 0xfe && i + 1 < bytes.length ? cp949Pair(b, bytes[i + 1]) : null;
      if (ch != null) {
        out += ch;
        i++;
      } else out += hx(b);
    } else out += hx(b);
  }
  return out;
}

/** UTF-8 한 글자(n 바이트) — 틀리면(넘치는 표현·대리 쌍·이어지는 바이트 아님) null */
function utf8At(b: number[], i: number, n: number): string | null {
  let cp = n === 2 ? b[i] & 0x1f : n === 3 ? b[i] & 0x0f : b[i] & 0x07;
  for (let k = 1; k < n; k++) {
    const c = b[i + k];
    if ((c & 0xc0) !== 0x80) return null;
    cp = (cp << 6) | (c & 0x3f);
  }
  if ((n === 3 && cp < 0x800) || (n === 4 && (cp < 0x10000 || cp > 0x10ffff)) || (cp >= 0xd800 && cp <= 0xdfff)) return null;
  return String.fromCodePoint(cp);
}

export function clock(ts: number) {
  const d = new Date(ts);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

// ---- 체크섬
/** crc = 범용 CRC(매개변수는 CkOpts.crc) — 백엔드에는 checksumToRust 로 바꿔 보낸다 */
export type ChecksumKind = "crc16-modbus" | "crc16-ccitt" | "crc16-xmodem" | "crc8" | "lrc" | "bcc" | "sum8" | "sum16" | "crc32" | "crc";

/** 고르는 목록(범용 CRC 는 따로 — 매개변수 칸이 있는 화면만 CUSTOM_CRC 를 더한다) */
export const CHECKSUMS: { kind: ChecksumKind; label: string }[] = [
  { kind: "crc16-modbus", label: "CRC16 Modbus" },
  { kind: "crc16-ccitt", label: "CRC16 CCITT" },
  { kind: "crc16-xmodem", label: "CRC16 XMODEM" },
  { kind: "crc8", label: "CRC8" },
  { kind: "lrc", label: "LRC" },
  { kind: "bcc", label: "BCC (XOR)" },
  { kind: "sum8", label: "SUM8" },
  { kind: "sum16", label: "SUM16" },
  { kind: "crc32", label: "CRC-32" },
];
export const CUSTOM_CRC = { kind: "crc" as ChecksumKind, label: "CRC (custom)" };
export const checksumLabel = (k: ChecksumKind, lang: "ko" | "en" = "en") =>
  k === "crc" ? (lang === "ko" ? "CRC (사용자 정의)" : "CRC (custom)") : (CHECKSUMS.find((c) => c.kind === k)?.label ?? k);

/** 범용 CRC 매개변수(reveng 표기) */
export interface CrcParams {
  width: 8 | 16 | 32;
  poly: number;
  init: number;
  refin: boolean;
  refout: boolean;
  xorout: number;
}

/** 체크섬 자리 옵션 — 앞에서 n바이트 빼고 계산, 끝에서 m바이트 앞에 넣기, 바이트 순서 뒤집기 + 범용 CRC 매개변수 */
export interface CkOpts {
  skipHead?: number;
  beforeEnd?: number;
  swap?: boolean;
  crc?: CrcParams;
}

export const DEFAULT_CRC: CrcParams = { width: 16, poly: 0x8005, init: 0, refin: true, refout: true, xorout: 0 };

/** 자주 쓰는 범용 CRC(reveng 카탈로그 이름) */
export const CRC_PRESETS: { name: string; p: CrcParams }[] = [
  { name: "CRC-16/ARC", p: { width: 16, poly: 0x8005, init: 0, refin: true, refout: true, xorout: 0 } },
  { name: "CRC-16/KERMIT", p: { width: 16, poly: 0x1021, init: 0, refin: true, refout: true, xorout: 0 } },
  { name: "CRC-16/IBM-SDLC (X.25)", p: { width: 16, poly: 0x1021, init: 0xffff, refin: true, refout: true, xorout: 0xffff } },
  { name: "CRC-16/DNP", p: { width: 16, poly: 0x3d65, init: 0, refin: true, refout: true, xorout: 0xffff } },
  { name: "CRC-16/MAXIM-DOW", p: { width: 16, poly: 0x8005, init: 0, refin: true, refout: true, xorout: 0xffff } },
  { name: "CRC-8/MAXIM-DOW (1-Wire)", p: { width: 8, poly: 0x31, init: 0, refin: true, refout: true, xorout: 0 } },
  { name: "CRC-8/ROHC", p: { width: 8, poly: 0x07, init: 0xff, refin: true, refout: true, xorout: 0 } },
  { name: "CRC-32/MPEG-2", p: { width: 32, poly: 0x04c11db7, init: 0xffffffff, refin: false, refout: false, xorout: 0 } },
  { name: "CRC-32/BZIP2", p: { width: 32, poly: 0x04c11db7, init: 0xffffffff, refin: false, refout: false, xorout: 0xffffffff } },
  { name: "CRC-32C (iSCSI)", p: { width: 32, poly: 0x1edc6f41, init: 0xffffffff, refin: true, refout: true, xorout: 0xffffffff } },
];

/** 체크섬이 붙이는 바이트 수 */
export function checksumLen(k: ChecksumKind, ck?: CkOpts | null) {
  if (k === "crc") return (ck?.crc?.width ?? DEFAULT_CRC.width) / 8;
  if (k === "crc32") return 4;
  return k.startsWith("crc16") || k === "sum16" ? 2 : 1;
}

/** 옵션이 하나라도 켜져 있는지(범용 CRC 는 늘 매개변수가 있다) */
export const ckOptsActive = (ck?: CkOpts | null) => !!ck && ((ck.skipHead ?? 0) > 0 || (ck.beforeEnd ?? 0) > 0 || !!ck.swap);

/** CRC 매개변수가 너비에 맞는지 — 틀리면 이유 */
export function crcProblem(p: CrcParams, lang: "ko" | "en" = "ko"): string | null {
  const max = p.width === 32 ? 0xffffffff : (1 << p.width) - 1;
  for (const [k, v] of [
    ["poly", p.poly],
    ["init", p.init],
    ["xorout", p.xorout],
  ] as const) {
    if (!Number.isInteger(v) || v < 0 || v > max) return lang === "ko" ? `${k} 가 ${p.width}비트를 넘습니다` : `${k} does not fit in ${p.width} bits`;
  }
  if (!p.poly) return lang === "ko" ? "poly 가 0 입니다" : "poly is 0";
  return null;
}

/**
 * 화면 값 → 백엔드 ChecksumKind JSON. 옵션 없는 기본 종류는 예전처럼 문자열,
 * 옵션·범용 CRC 는 {spec: {algo, skipHead, beforeEnd, swap}}
 */
export function checksumToRust(kind: ChecksumKind | null, ck?: CkOpts | null): unknown {
  if (!kind) return null;
  if (kind !== "crc" && !ckOptsActive(ck)) return kind;
  const algo = kind === "crc" ? { crc: { ...(ck?.crc ?? DEFAULT_CRC) } } : kind;
  return { spec: { algo, skipHead: Math.max(0, ck?.skipHead ?? 0), beforeEnd: Math.max(0, ck?.beforeEnd ?? 0), swap: !!ck?.swap } };
}

/** 체크섬 표시 — «CRC16 Modbus», 옵션이 있으면 «… · 앞 1 · ETX 앞 1 · ⇄» */
export function checksumDesc(kind: ChecksumKind, ck: CkOpts | null | undefined, lang: "ko" | "en") {
  const parts = [checksumLabel(kind, lang)];
  if (kind === "crc" && ck?.crc) parts[0] = `CRC-${ck.crc.width} 0x${ck.crc.poly.toString(16).toUpperCase()}`;
  if ((ck?.skipHead ?? 0) > 0) parts.push(lang === "ko" ? `앞 ${ck!.skipHead} 빼고` : `skip ${ck!.skipHead}`);
  if ((ck?.beforeEnd ?? 0) > 0) parts.push(lang === "ko" ? `끝 ${ck!.beforeEnd} 앞에` : `${ck!.beforeEnd} before end`);
  if (ck?.swap) parts.push("⇄");
  return parts.join(" · ");
}

/** 다른 PortDock 도구 — 각 프로그램 화면 아래에 소개 */
export const FAMILY = [
  { id: "serial", name: "PortDock Serial" },
  { id: "modbus-slave", name: "PortDock Modbus Slave" },
  { id: "tcp", name: "PortDock TCP" },
  { id: "udp", name: "PortDock UDP" },
];
