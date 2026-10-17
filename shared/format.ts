// PortDock 공용 화면 도우미 — 모든 프로그램이 같은 표기를 쓴다.

export const hex = (bytes: number[]) => bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");

/** 제어 문자는 <CR> <LF> <02> 처럼 보이게 */
export function ascii(bytes: number[]) {
  const names: Record<number, string> = { 0x0d: "<CR>", 0x0a: "<LF>", 0x09: "<TAB>", 0x02: "<STX>", 0x03: "<ETX>", 0x06: "<ACK>", 0x15: "<NAK>" };
  return bytes
    .map((b) => names[b] ?? (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : `<${b.toString(16).toUpperCase().padStart(2, "0")}>`))
    .join("");
}

export function clock(ts: number) {
  const d = new Date(ts);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

export type ChecksumKind = "crc16-modbus" | "crc16-ccitt" | "crc16-xmodem" | "crc8" | "lrc" | "bcc" | "sum8" | "sum16";

export const CHECKSUMS: { kind: ChecksumKind; label: string }[] = [
  { kind: "crc16-modbus", label: "CRC16 Modbus" },
  { kind: "crc16-ccitt", label: "CRC16 CCITT" },
  { kind: "crc16-xmodem", label: "CRC16 XMODEM" },
  { kind: "crc8", label: "CRC8" },
  { kind: "lrc", label: "LRC" },
  { kind: "bcc", label: "BCC (XOR)" },
  { kind: "sum8", label: "SUM8" },
  { kind: "sum16", label: "SUM16" },
];

/** 다른 PortDock 도구 — 각 프로그램 화면 아래에 소개 */
export const FAMILY = [
  { id: "serial", name: "PortDock Serial" },
  { id: "modbus-slave", name: "PortDock Modbus Slave" },
  { id: "tcp", name: "PortDock TCP" },
  { id: "udp", name: "PortDock UDP" },
];
