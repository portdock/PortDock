import { Channel, invoke } from "@tauri-apps/api/core";
import type { SimSpec, Table } from "./regmap";
import { tally } from "@shared/usage";
export { ascii, clock, hex } from "@shared/format";
export type { Table } from "./regmap";

export const TABLES: { id: Table; fc: string; bits: boolean }[] = [
  { id: "coils", fc: "0x (01·05·0F)", bits: true },
  { id: "discrete-inputs", fc: "1x (02)", bits: true },
  { id: "holding-registers", fc: "4x (03·06·10·16·17)", bits: false },
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

/** 연결 방식 — 시리얼(RTU), TCP 서버(Modbus TCP), TCP 서버(RTU over TCP) */
export type Transport = "serial" | "tcp" | "rtu-tcp";

/** TCP 서버 설정(화면 저장용) */
export interface NetConfig {
  host: string;
  port: number;
  ignoreUnitId: boolean;
}

export interface Frame {
  ts: number;
  dir: "rx" | "tx" | "ev";
  bytes: number[];
  check: boolean | null;
  note?: string;
  /** TCP: 상대 주소 */
  peer?: string;
  /** 백엔드가 붙인 Modbus 한 줄 요약(«id1 FC03 HR 0..9 (10)») */
  sum?: string;
  /** 화면에서 붙이는 일련번호(줄 고르기·따라가기용) */
  seq?: number;
}

export interface Peer {
  id: number;
  addr: string;
}

export type SessionEvent =
  | { type: "frames"; frames: Frame[] }
  | { type: "status"; state: "connected" | "listening" | "disconnected" | "reconnecting" | "closed"; port: string; message: string | null }
  | { type: "error"; message: string }
  | { type: "lines"; cts: boolean; dsr: boolean; ri: boolean; cd: boolean }
  | { type: "peers"; peers: Peer[] };

/** 장애를 걸 요청 고르기 — 비어 있으면 모두 */
export interface FaultTarget {
  slaveIds: number[];
  functions: number[];
  addrFrom: number | null;
  addrTo: number | null;
  /** N번째마다(0·1 = 매번) */
  everyNth: number;
  /** 0~100 */
  probability: number;
}

export interface Faults {
  delayMs: number;
  /** 지연 범위의 끝(0 이면 고정 지연) */
  delayMaxMs: number;
  noResponse: boolean;
  forceException: number;
  badCrc: boolean;
  badMbapLen: boolean;
  target: FaultTarget;
}

export interface DeviceId {
  vendor: string;
  productCode: string;
  revision: string;
}

export interface Stats {
  requests: number;
  ok: number;
  exceptions: number;
  otherId: number;
  badFrames: number;
  busy: number;
  noResponse: number;
  broadcasts: number;
  writes: number;
  perFc: Record<string, number>;
  ignored: number;
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
    return tally("start_serial", invoke<void>("open", { config, onEvent: ch }));
  },
  /** TCP 서버로 연다 — 실제로 묶인 주소를 돌려준다 */
  openTcp: (config: { host: string; port: number; wire: "tcp" | "rtu"; ignoreUnitId: boolean }, onEvent: (e: SessionEvent) => void) => {
    const ch = new Channel<SessionEvent>();
    ch.onmessage = onEvent;
    return tally("start_tcp", invoke<string>("open_tcp", { config, onEvent: ch }));
  },
  close: () => invoke<void>("close"),
  reconfigure: (config: SerialConfig) => invoke<void>("reconfigure", { config }),
  setLog: (path: string | null) => tally(path ? "file_log" : null, invoke<void>("set_log", { path })),
  setFaults: (faults: Faults) => tally((faults.noResponse || faults.badCrc || faults.badMbapLen || faults.forceException > 0 || faults.delayMs > 0) && "faults", invoke<void>("set_faults", { faults })),
  setOptions: (options: { ignoreUnitId: boolean }) => invoke<void>("set_options", { options }),
  setDeviceId: (device: DeviceId) => invoke<void>("set_device_id", { device }),
  setSims: (id: number, table: Table, sims: SimSpec[]) => tally(sims.length > 0 && "simulate", invoke<void>("set_sims", { id, table, sims })),
  setAddrStyle: (style: { base: number; plc: boolean }) => invoke<void>("set_addr_style", { style }),
  setSlaveIds: (ids: number[]) => invoke<void>("set_slave_ids", { ids }),
  setRange: (id: number, table: Table, start: number, count: number) => invoke<void>("set_range", { id, table, start, count }),
  getValues: (id: number, table: Table, start: number, count: number) => invoke<number[]>("get_values", { id, table, start, count }),
  setValues: (id: number, table: Table, start: number, values: number[]) => tally("edit_values", invoke<void>("set_values", { id, table, start, values })),
  getStats: () => invoke<Stats>("get_stats"),
  resetStats: () => invoke<void>("reset_stats"),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
  /** 명령줄 인자(0.3.0) — 처음 한 번만 */
  launchArgs: () => invoke<string[]>("launch_args"),
};
