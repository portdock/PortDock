import { Channel, invoke } from "@tauri-apps/api/core";
export { ascii, clock, hex } from "@shared/format";

export type Table = "coils" | "discrete-inputs" | "holding-registers" | "input-registers";
export const TABLES: { id: Table; fc: string; bits: boolean }[] = [
  { id: "coils", fc: "0x (01·05·0F)", bits: true },
  { id: "discrete-inputs", fc: "1x (02)", bits: true },
  { id: "holding-registers", fc: "4x (03·06·10)", bits: false },
  { id: "input-registers", fc: "3x (04)", bits: false },
];

export interface PortInfo {
  name: string;
  kind: string;
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
  flow: "none";
  dtr: boolean;
  rts: boolean;
  autoReconnect: boolean;
}

export interface Frame {
  ts: number;
  dir: "rx" | "tx" | "ev";
  bytes: number[];
  check: boolean | null;
  note?: string;
  /** 화면에서 붙이는 일련번호(줄 고르기·따라가기용) */
  seq?: number;
}

export type SessionEvent =
  | { type: "frames"; frames: Frame[] }
  | { type: "status"; state: "connected" | "disconnected" | "reconnecting" | "closed"; port: string; message: string | null }
  | { type: "error"; message: string }
  | { type: "lines"; cts: boolean; dsr: boolean; ri: boolean; cd: boolean };

export interface Faults {
  delayMs: number;
  noResponse: boolean;
  forceException: number;
  badCrc: boolean;
}

export interface Stats {
  requests: number;
  ok: number;
  exceptions: number;
  ignored: number;
  writes: number;
}

/** [코드, 영어 이름, 한국어 뜻] */
export const EXCEPTIONS: [number, string, string][] = [
  [1, "01 Illegal Function", "01 지원하지 않는 함수"],
  [2, "02 Illegal Data Address", "02 없는 주소"],
  [3, "03 Illegal Data Value", "03 잘못된 값"],
  [4, "04 Server Device Failure", "04 장비 고장"],
  [5, "05 Acknowledge", "05 받음(처리 중)"],
  [6, "06 Server Device Busy", "06 장비 바쁨"],
  [10, "0A Gateway Path Unavailable", "0A 게이트웨이 경로 없음"],
  [11, "0B Gateway Target Failed", "0B 게이트웨이 대상 응답 없음"],
];

export const api = {
  listPorts: () => invoke<PortInfo[]>("list_ports"),
  open: (config: SerialConfig, onEvent: (e: SessionEvent) => void) => {
    const ch = new Channel<SessionEvent>();
    ch.onmessage = onEvent;
    return invoke<void>("open", { config, onEvent: ch });
  },
  close: () => invoke<void>("close"),
  reconfigure: (config: SerialConfig) => invoke<void>("reconfigure", { config }),
  setLog: (path: string | null) => invoke<void>("set_log", { path }),
  setFaults: (faults: Faults) => invoke<void>("set_faults", { faults }),
  setSlaveIds: (ids: number[]) => invoke<void>("set_slave_ids", { ids }),
  setRange: (id: number, table: Table, start: number, count: number) => invoke<void>("set_range", { id, table, start, count }),
  getValues: (id: number, table: Table, start: number, count: number) => invoke<number[]>("get_values", { id, table, start, count }),
  setValues: (id: number, table: Table, start: number, values: number[]) => invoke<void>("set_values", { id, table, start, values }),
  getStats: () => invoke<Stats>("get_stats"),
  resetStats: () => invoke<void>("reset_stats"),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};
