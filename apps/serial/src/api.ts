import { Channel, invoke } from "@tauri-apps/api/core";
import type { ChecksumKind } from "@shared/format";
export { ascii, CHECKSUMS, clock, hex, type ChecksumKind } from "@shared/format";


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
  reconfigure: (id: string, config: SerialConfig) => invoke<void>("reconfigure", { id, config }),
  setLog: (id: string, path: string | null) => invoke<void>("set_log", { id, path }),
  send: (id: string, spec: SendSpec) => invoke<number[]>("send", { id, spec }),
  preview: (spec: SendSpec) => invoke<number[]>("preview", { spec }),
  decodeModbus: (bytes: number[]) => invoke<ModbusInfo | null>("decode_modbus", { bytes }),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};

/** «COM3 · 9600 8N1 · flow none» */
export function summary(c: SerialConfig) {
  const p = c.parity === "odd" ? "O" : c.parity === "even" ? "E" : "N";
  return `${c.port} · ${c.baud} ${c.dataBits}${p}${c.stopBits} · flow ${c.flow}`;
}

