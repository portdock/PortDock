import { Channel, invoke } from "@tauri-apps/api/core";
import { checksumToRust, type ChecksumKind, type CkOpts, type Encoding } from "@shared/format";
import type { Pace, Progress } from "@shared/FileSend";
import type { LogFormat } from "@shared/settings";
import type { LoopConfig, LoopEvent, PortReport } from "@shared/portinfo";
import type { PortCheckApi } from "@shared/PortCheckDialog";
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

export type Rs485 = "off" | "driver" | "software";

export interface SerialConfig {
  port: string;
  baud: number;
  dataBits: number;
  /** mark·space 는 윈도우 DCB 로 직접 설정 */
  parity: "none" | "odd" | "even" | "mark" | "space";
  /** 1 · 1.5 · 2 */
  stopBits: number;
  flow: "none" | "hardware" | "software";
  dtr: boolean;
  rts: boolean;
  autoReconnect: boolean;
  /** RS-485 송신 방향 제어(RTS) */
  rs485: Rs485;
}

export interface Frame {
  ts: number;
  /** ev = 연결·설정 변경·신호선 등 사건 줄 */
  dir: "rx" | "tx" | "ev";
  bytes: number[];
  check: boolean | null;
  note?: string;
  /** 화면에서 붙이는 일련번호(선택 줄 유지용) */
  seq?: number;
  /** 화면에서 붙이는 간격·응답 시간(ms) */
  gap?: number | null;
  rsp?: number | null;
  /** 트리거 색 */
  mark?: string | null;
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
  | ({ type: "lines" } & Lines)
  | ({ type: "progress" } & Progress);

export interface SendSpec {
  text: string;
  mode: TextMode;
  checksum: ChecksumKind | null;
  suffix: string;
  /** 체크섬 자리 옵션·범용 CRC 매개변수 */
  ck?: CkOpts | null;
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

export interface LogOptions {
  format: LogFormat;
  encoding: Encoding;
  splitMb: number;
  splitHours: number;
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

/** 보낼 것 → 백엔드 codec::SendText(체크섬 옵션은 ChecksumKind::Spec 으로, 글자 인코딩 포함) */
export const wireSpec = (s: SendSpec, encoding: Encoding) => ({ text: s.text, mode: s.mode, suffix: s.suffix, checksum: checksumToRust(s.checksum, s.ck), encoding });

export const api = {
  listPorts: () => invoke<PortInfo[]>("list_ports"),
  open: (config: SerialConfig, framing: FrameMode, rxCheck: unknown, onEvent: (e: SessionEvent) => void) => {
    const ch = new Channel<SessionEvent>();
    ch.onmessage = onEvent;
    return invoke<void>("open_session", { config, framing: frameModeToRust(framing), rxCheck, onEvent: ch });
  },
  close: (id: string) => invoke<void>("close_session", { id }),
  setFraming: (id: string, framing: FrameMode, rxCheck: unknown) => invoke<void>("set_framing", { id, framing: frameModeToRust(framing), rxCheck }),
  reconfigure: (id: string, config: SerialConfig) => invoke<void>("reconfigure", { id, config }),
  setLog: (id: string, path: string | null) => invoke<void>("set_log", { id, path }),
  setLogOptions: (options: LogOptions) => invoke<void>("set_log_options", { options }),
  send: (id: string, spec: SendSpec, encoding: Encoding, charDelayMs = 0) =>
    invoke<number[]>("send", { id, spec: wireSpec(spec, encoding), pace: charDelayMs > 0 ? { charDelayMs, lineDelayMs: 0, byLine: false, chunk: 0 } : null }),
  preview: (spec: SendSpec, encoding: Encoding) => invoke<number[]>("preview", { spec: wireSpec(spec, encoding) }),
  sendFile: (id: string, path: string, pace: Pace) => invoke<{ id: number; total: number }>("send_file", { id, path, pace }),
  cancelSend: (id: string) => invoke<void>("cancel_send", { id }),
  fileSize: (path: string) => invoke<number>("file_size", { path }),
  sendBreak: (id: string, ms: number) => invoke<void>("send_break", { id, ms }),
  decodeModbus: (bytes: number[]) => invoke<ModbusInfo | null>("decode_modbus", { bytes }),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};

/** «연결 점검…»(shared/PortCheckDialog) — 장치 읽기·연결 시험 */
export const checkApi: PortCheckApi = {
  report: (id: string) => invoke<PortReport>("pi_report", { id }),
  start: (config: LoopConfig, onEvent: (e: LoopEvent) => void) => {
    const ch = new Channel<LoopEvent>();
    ch.onmessage = onEvent;
    return invoke<void>("loop_start", { config, onEvent: ch });
  },
  cancel: () => invoke<void>("loop_cancel"),
};

const FLOW = {
  ko: { none: "흐름 제어 없음", hardware: "RTS/CTS", software: "XON/XOFF" },
  en: { none: "no flow control", hardware: "RTS/CTS", software: "XON/XOFF" },
};

export const parityChar = (p: SerialConfig["parity"]) => ({ odd: "O", even: "E", mark: "M", space: "S", none: "N" })[p] ?? "N";

/** «COM3 · 9600 8N1 · 흐름 제어 없음» (+ « · RS-485») */
export function summary(c: SerialConfig, lang: "ko" | "en" = "en") {
  const rs = c.rs485 && c.rs485 !== "off" && c.flow !== "hardware" ? " · RS-485" : "";
  return `${c.port} · ${c.baud} ${c.dataBits}${parityChar(c.parity)}${c.stopBits} · ${FLOW[lang][c.flow]}${rs}`;
}
