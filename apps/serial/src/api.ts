import { baseLang, type Lang } from "../../../shared/lang.ts";
import { Channel, invoke } from "@tauri-apps/api/core";
import { checksumToRust, type ChecksumKind, type CkOpts, type Encoding } from "@shared/format";
import type { Pace, Progress } from "@shared/FileSend";
import type { LogFormat } from "@shared/settings";
import type { LoopConfig, LoopEvent, PortReport } from "@shared/portinfo";
import type { PortCheckApi } from "@shared/PortCheckDialog";
import { tally } from "@shared/usage";
import type { PairMark } from "@shared/pairStats";
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
  /** (0.10.0) 포트 나눔: 보낸 TCP 클라이언트 · 엿듣기(두 포트): 들은 포트 */
  peer?: string;
  /** (0.10.0) 엿듣기: 요청/응답 짝(core reqpair) */
  pair?: PairMark;
  /** 화면에서 붙임 — 이 요청이 끝내 무응답 */
  missed?: boolean;
}

/** (0.10.0) 포트 나눔 설정 — core share::ShareConfig */
export interface ShareConfig {
  host: string;
  port: number;
  rfc2217: boolean;
  maxClients: number;
  /** (0.10.0) Modbus TCP ↔ RTU 게이트웨이 — 켜면 rfc2217 은 쓰지 않는다 */
  gateway?: boolean;
  gw?: GatewayConfig;
}

/** (0.10.0) 게이트웨이 설정 — core mb_gateway::GatewayConfig */
export interface GatewayConfig {
  timeoutMs: number;
  /** Unit ID 0: 경로 없음(예외 0A, 기본) / RTU 브로드캐스트 / 기본 국번으로 */
  unit0: "noroute" | "broadcast" | "default";
  defaultUnit: number;
  /** «1-10, 17» — 비우면 1~247 모두 */
  units: string;
  broadcastDelayMs: number;
}

/** (0.10.0) 게이트웨이 통계 — core mb_gateway::GwStats */
export interface GwStats {
  requests: number;
  responses: number;
  exceptions: number;
  timeouts: number;
  crcErrors: number;
  noRoute: number;
  broadcasts: number;
  busy: number;
  lastMs: number | null;
  avgMs: number | null;
  maxMs: number | null;
}

export interface ShareClient {
  id: number;
  addr: string;
  sent: number;
}

export type ShareEvent =
  | { type: "clients"; clients: ShareClient[] }
  | { type: "config"; config: SerialConfig }
  | { type: "gateway"; stats: GwStats }
  | { type: "stopped"; message: string | null };

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
  /** (0.6.0) 날짜가 바뀌면 새 파일 */
  splitDaily: boolean;
  /** (0.6.0) 옛 로그 지우기(일, 0 = 안 지움) */
  keepDays: number;
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
  launchArgs: () => invoke<string[]>("launch_args"),
  open: (config: SerialConfig, framing: FrameMode, rxCheck: unknown, onEvent: (e: SessionEvent) => void) => {
    const ch = new Channel<SessionEvent>();
    ch.onmessage = onEvent;
    return tally("connect", invoke<void>("open_session", { config, framing: frameModeToRust(framing), rxCheck, onEvent: ch }));
  },
  close: (id: string) => invoke<void>("close_session", { id }),
  /** (0.10.0) Modbus RTU 엿듣기(듣기만) — 포트 1개, 또는 RS-232 Y 케이블의 두 포트 */
  sniffOpen: (configs: SerialConfig[], onEvent: (e: SessionEvent) => void) => {
    const ch = new Channel<SessionEvent>();
    ch.onmessage = onEvent;
    return tally("sniff", invoke<void>("sniff_open", { configs, onEvent: ch }));
  },
  /** (0.10.0) 포트 나눔 — 묶인 주소를 돌려준다 */
  shareStart: (id: string, config: ShareConfig, onEvent: (e: ShareEvent) => void) => {
    const ch = new Channel<ShareEvent>();
    ch.onmessage = onEvent;
    return tally(config.gateway ? "mb_gateway" : "share", invoke<string>("share_start", { id, config, onEvent: ch }));
  },
  shareStop: () => invoke<void>("share_stop"),
  shareKick: (client: number) => invoke<void>("share_kick", { client }),
  setFraming: (id: string, framing: FrameMode, rxCheck: unknown) => invoke<void>("set_framing", { id, framing: frameModeToRust(framing), rxCheck }),
  reconfigure: (id: string, config: SerialConfig) => invoke<void>("reconfigure", { id, config }),
  setLog: (id: string, path: string | null) => tally(path ? "file_log" : null, invoke<void>("set_log", { id, path })),
  setLogOptions: (options: LogOptions) => invoke<void>("set_log_options", { options }),
  send: (id: string, spec: SendSpec, encoding: Encoding, charDelayMs = 0) =>
    tally("send", invoke<number[]>("send", { id, spec: wireSpec(spec, encoding), pace: charDelayMs > 0 ? { charDelayMs, lineDelayMs: 0, byLine: false, chunk: 0 } : null })),
  preview: (spec: SendSpec, encoding: Encoding) => invoke<number[]>("preview", { spec: wireSpec(spec, encoding) }),
  sendFile: (id: string, path: string, pace: Pace) => tally("send_file", invoke<{ id: number; total: number }>("send_file", { id, path, pace })),
  cancelSend: (id: string) => invoke<void>("cancel_send", { id }),
  fileSize: (path: string) => invoke<number>("file_size", { path }),
  sendBreak: (id: string, ms: number) => tally("send_break", invoke<void>("send_break", { id, ms })),
  decodeModbus: (bytes: number[]) => invoke<ModbusInfo | null>("decode_modbus", { bytes }),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};

/** «연결 점검…»(shared/PortCheckDialog) — 장치 읽기·연결 시험 */
export const checkApi: PortCheckApi = {
  report: (id: string) => tally("port_check", invoke<PortReport>("pi_report", { id })),
  start: (config: LoopConfig, onEvent: (e: LoopEvent) => void) => {
    const ch = new Channel<LoopEvent>();
    ch.onmessage = onEvent;
    return invoke<void>("loop_start", { config, onEvent: ch });
  },
  cancel: () => invoke<void>("loop_cancel"),
  // 두 포트 시험(0.10.0) — 고를 수 있는 다른 포트
  ports: () => invoke<PortInfo[]>("list_ports").then((l) => l.map((p) => p.name)),
};

const FLOW = {
  ko: { none: "흐름 제어 없음", hardware: "RTS/CTS", software: "XON/XOFF" },
  en: { none: "no flow control", hardware: "RTS/CTS", software: "XON/XOFF" },
};

export const parityChar = (p: SerialConfig["parity"]) => ({ odd: "O", even: "E", mark: "M", space: "S", none: "N" })[p] ?? "N";

/** «COM3 · 9600 8N1 · 흐름 제어 없음» (+ « · RS-485») */
export function summary(c: SerialConfig, lang: Lang = "en") {
  const rs = c.rs485 && c.rs485 !== "off" && c.flow !== "hardware" ? " · RS-485" : "";
  return `${c.port} · ${c.baud} ${c.dataBits}${parityChar(c.parity)}${c.stopBits} · ${FLOW[baseLang(lang)][c.flow]}${rs}`;
}
