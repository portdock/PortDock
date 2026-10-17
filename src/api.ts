import { Channel, invoke } from "@tauri-apps/api/core";

export type ChecksumKind =
  | "crc16-modbus"
  | "crc16-ccitt"
  | "crc16-xmodem"
  | "crc8"
  | "lrc"
  | "bcc"
  | "sum8"
  | "sum16";

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

export type TextMode = "hex" | "ascii";

export type FrameMode =
  | { kind: "gap"; gapMs: number }
  | { kind: "terminator"; bytes: number[]; gapMs: number }
  | { kind: "fixed"; len: number; gapMs: number }
  | { kind: "modbus-rtu"; baud: number };

export interface PortInfo {
  name: string;
  kind: "usb" | "pci" | "bluetooth" | "unknown";
  vid: number | null;
  pid: number | null;
  serial_number: string | null;
  manufacturer: string | null;
  product: string | null;
}

export interface SerialConfig {
  port: string;
  baud: number;
  dataBits: number;
  parity: "none" | "odd" | "even";
  stopBits: number;
  flow: "none" | "hardware" | "software";
  dtr: boolean;
  rts: boolean;
  autoReconnect: boolean;
}

export interface Frame {
  ts: number;
  /** ev = 연결·설정 변경·신호선 등 사건 줄 */
  dir: "rx" | "tx" | "ev";
  bytes: number[];
  check: boolean | null;
  note?: string;
}

export interface Lines {
  cts: boolean;
  dsr: boolean;
  ri: boolean;
  cd: boolean;
}

export type SessionEvent =
  | { type: "frames"; frames: Frame[] }
  | {
      type: "status";
      state: "connected" | "disconnected" | "reconnecting" | "closed";
      port: string;
      message: string | null;
    }
  | { type: "error"; message: string }
  | ({ type: "lines" } & Lines);

export interface SendSpec {
  text: string;
  mode: TextMode;
  checksum: ChecksumKind | null;
  suffix: string;
}

export interface AutoRule {
  name: string;
  enabled: boolean;
  pattern: string;
  patternMode: TextMode;
  kind: "exact" | "contains";
  reply: SendSpec;
  delayMs: number;
}

export interface ModbusInfo {
  slave: number;
  function: number;
  function_name: string;
  kind: string;
  crc_ok: boolean;
  fields: [string, string][];
  values: number[];
}

// Rust 의 serde 는 FrameMode 필드를 snake_case 로 받는다
function frameModeToRust(m: FrameMode) {
  switch (m.kind) {
    case "gap":
      return { kind: "gap", gap_ms: m.gapMs };
    case "terminator":
      return { kind: "terminator", bytes: m.bytes, gap_ms: m.gapMs };
    case "fixed":
      return { kind: "fixed", len: m.len, gap_ms: m.gapMs };
    case "modbus-rtu":
      return { kind: "modbus-rtu", baud: m.baud };
  }
}

export const api = {
  listPorts: () => invoke<PortInfo[]>("list_ports"),
  open: (config: SerialConfig, framing: FrameMode, rxCheck: ChecksumKind | null, onEvent: (e: SessionEvent) => void) => {
    const ch = new Channel<SessionEvent>();
    ch.onmessage = onEvent;
    return invoke<void>("open_session", { config, framing: frameModeToRust(framing), rxCheck, onEvent: ch });
  },
  close: (id: string) => invoke<void>("close_session", { id }),
  setFraming: (id: string, framing: FrameMode, rxCheck: ChecksumKind | null) =>
    invoke<void>("set_framing", { id, framing: frameModeToRust(framing), rxCheck }),
  setAutoReply: (id: string, rules: AutoRule[]) => invoke<number>("set_auto_reply", { id, rules }),
  checkAutoReply: (rules: AutoRule[]) => invoke<number>("check_auto_reply", { rules }),
  reconfigure: (id: string, config: SerialConfig) => invoke<void>("reconfigure", { id, config }),
  setLog: (id: string, path: string | null) => invoke<void>("set_log", { id, path }),
  send: (id: string, spec: SendSpec) => invoke<number[]>("send", { id, spec }),
  preview: (spec: SendSpec) => invoke<number[]>("preview", { spec }),
  decodeModbus: (bytes: number[]) => invoke<ModbusInfo | null>("decode_modbus", { bytes }),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
};

export const hex = (bytes: number[]) => bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");

/** 제어 문자는 <CR> <LF> <02> 처럼 보이게 */
export function ascii(bytes: number[]) {
  const names: Record<number, string> = { 0x0d: "<CR>", 0x0a: "<LF>", 0x09: "<TAB>", 0x02: "<STX>", 0x03: "<ETX>", 0x06: "<ACK>", 0x15: "<NAK>" };
  return bytes
    .map((b) => names[b] ?? (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : `<${b.toString(16).toUpperCase().padStart(2, "0")}>`))
    .join("");
}

/** «COM3 · 9600 8N1 · flow none» */
export function summary(c: SerialConfig) {
  const p = c.parity === "odd" ? "O" : c.parity === "even" ? "E" : "N";
  return `${c.port} · ${c.baud} ${c.dataBits}${p}${c.stopBits} · flow ${c.flow}`;
}

export function clock(ts: number) {
  const d = new Date(ts);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}
