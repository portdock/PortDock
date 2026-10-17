// 웹 계산기용 — crates/core/src/checksum.rs · codec.rs 를 그대로 옮긴 것. 둘이 어긋나지 않게 같은 시험값으로 검사한다(checksum.test.ts).

export type ChecksumKind = "crc16-modbus" | "crc16-ccitt" | "crc16-xmodem" | "crc8" | "lrc" | "bcc" | "sum8" | "sum16";

export const CHECKSUMS: { kind: ChecksumKind; label: string; ko: string; en: string }[] = [
  { kind: "crc16-modbus", label: "CRC16 Modbus", ko: "다항식 0xA001(역순 0x8005), 초기값 0xFFFF, 낮은 바이트 먼저", en: "Poly 0xA001 (reflected 0x8005), init 0xFFFF, low byte first" },
  { kind: "crc16-ccitt", label: "CRC16 CCITT", ko: "다항식 0x1021, 초기값 0xFFFF, 높은 바이트 먼저 (CCITT-FALSE)", en: "Poly 0x1021, init 0xFFFF, high byte first (CCITT-FALSE)" },
  { kind: "crc16-xmodem", label: "CRC16 XMODEM", ko: "다항식 0x1021, 초기값 0x0000, 높은 바이트 먼저", en: "Poly 0x1021, init 0x0000, high byte first" },
  { kind: "crc8", label: "CRC8", ko: "다항식 0x07, 초기값 0x00", en: "Poly 0x07, init 0x00" },
  { kind: "lrc", label: "LRC", ko: "바이트 합의 2의 보수", en: "Two's complement of the byte sum" },
  { kind: "bcc", label: "BCC (XOR)", ko: "모든 바이트 XOR", en: "XOR of all bytes" },
  { kind: "sum8", label: "SUM8", ko: "바이트 합 하위 8비트", en: "Byte sum, low 8 bits" },
  { kind: "sum16", label: "SUM16", ko: "바이트 합 16비트, 높은 바이트 먼저", en: "Byte sum, 16 bits, high byte first" },
];

export function crc16Modbus(data: Uint8Array | number[]) {
  let crc = 0xffff;
  for (const b of data) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
  }
  return crc & 0xffff;
}

function crc16x1021(data: Uint8Array | number[], init: number) {
  let crc = init;
  for (const b of data) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

function crc8(data: Uint8Array | number[]) {
  let crc = 0;
  for (const b of data) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
  }
  return crc;
}

const sum = (data: Uint8Array | number[]) => {
  let s = 0;
  for (const b of data) s += b;
  return s;
};

/** 체크섬 바이트(붙일 순서대로) */
export function compute(kind: ChecksumKind, data: Uint8Array | number[]): number[] {
  switch (kind) {
    case "crc16-modbus": {
      const c = crc16Modbus(data);
      return [c & 0xff, c >> 8];
    }
    case "crc16-ccitt":
    case "crc16-xmodem": {
      const c = crc16x1021(data, kind === "crc16-ccitt" ? 0xffff : 0);
      return [c >> 8, c & 0xff];
    }
    case "crc8":
      return [crc8(data)];
    case "lrc":
      return [(0x100 - (sum(data) & 0xff)) & 0xff];
    case "bcc": {
      let x = 0;
      for (const b of data) x ^= b;
      return [x];
    }
    case "sum8":
      return [sum(data) & 0xff];
    case "sum16": {
      const s = sum(data) & 0xffff;
      return [s >> 8, s & 0xff];
    }
  }
}

export type Lang = "ko" | "en";
const msg = (lang: Lang, ko: string, en: string) => (lang === "ko" ? ko : en);

/** «01 03 0A», «01030A», «0x01,0x03,0x0A» */
export function parseHex(text: string, lang: Lang = "ko"): number[] {
  const out: number[] = [];
  for (const token of text.split(/[\s,;-]+/)) {
    const t = token.replace(/^(0x)+/, "").replace(/^(0X)+/, "");
    if (!t) continue;
    const bad = [...t].find((c) => !/[0-9a-fA-F]/.test(c));
    if (bad) throw new Error(msg(lang, `HEX 가 아닌 글자: «${bad}»`, `Not a HEX digit: «${bad}»`));
    if (t.length % 2) throw new Error(msg(lang, `HEX 자릿수가 홀수입니다: «${token}»`, `Odd number of HEX digits: «${token}»`));
    for (let i = 0; i < t.length; i += 2) out.push(parseInt(t.slice(i, i + 2), 16));
  }
  return out;
}

/** 글자 그대로(UTF-8) + \r \n \t \0 \\ \xNN */
export function parseAscii(text: string, lang: Lang = "ko"): number[] {
  const out: number[] = [];
  const enc = new TextEncoder();
  const cs = [...text];
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (c !== "\\") {
      out.push(...enc.encode(c));
      continue;
    }
    const n = cs[++i];
    if (n === undefined) out.push(0x5c);
    else if (n === "r") out.push(13);
    else if (n === "n") out.push(10);
    else if (n === "t") out.push(9);
    else if (n === "0") out.push(0);
    else if (n === "\\") out.push(0x5c);
    else if (n === "x") {
      const s = (cs[i + 1] ?? "") + (cs[i + 2] ?? "");
      i += 2;
      if (!/^[0-9a-fA-F]{2}$/.test(s)) throw new Error(msg(lang, `잘못된 \\x 이스케이프: «\\x${s}» (HEX 두 자리)`, `Bad \\x escape: «\\x${s}» (two HEX digits)`));
      out.push(parseInt(s, 16));
    } else throw new Error(msg(lang, `모르는 이스케이프: «\\${n}»`, `Unknown escape: «\\${n}»`));
  }
  return out;
}

export const hex = (b: number[]) => b.map((x) => x.toString(16).toUpperCase().padStart(2, "0")).join(" ");
