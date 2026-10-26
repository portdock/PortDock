import { Channel, invoke } from "@tauri-apps/api/core";
import type { Fc, TableStats } from "./model";
import { tally } from "@shared/usage";
export { hex } from "@shared/format";

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

/** 연결 방식 — 시리얼(RTU), TCP(Modbus TCP — MBAP), TCP(RTU over TCP) */
export type Transport = "serial" | "tcp" | "rtu-tcp";

export interface NetConfig {
  host: string;
  port: number;
  autoReconnect: boolean;
}

/** 응답 기다림·재시도·요청 간격 (crates/core/src/modbus_master.rs Timing) */
export interface Timing {
  timeoutMs: number;
  retries: number;
  delayMs: number;
}

export interface PollSpec {
  id: number;
  unit: number;
  fc: Fc;
  start: number;
  qty: number;
  intervalMs: number;
  enabled: boolean;
}

export interface Setup {
  timing: Timing;
  tables: PollSpec[];
  style: { base: number; plc: boolean };
  paused: boolean;
}

/** 거래 결과 (Outcome) */
export type Outcome =
  | { result: "ok"; values: number[] }
  | { result: "exception"; code: number }
  | { result: "timeout" }
  | { result: "crc"; why: string }
  | { result: "bad"; why: string }
  | { result: "send-error"; why: string }
  | { result: "broadcast" };

/** 통신 기록 한 줄 — 백엔드 Line(+ 화면의 일련번호) */
export interface Frame {
  ts: number;
  dir: "rx" | "tx" | "ev";
  bytes: number[];
  check: boolean | null;
  note?: string;
  sum?: string;
  table?: number;
  peer?: string;
  seq?: number;
}

export interface PollResult {
  table: number;
  ts: number;
  outcome: Outcome;
  rttMs: number;
  tries: number;
}

export type MasterEvent =
  | { type: "batch"; lines: Frame[]; polls: PollResult[] }
  | { type: "write"; token: number; table: number; outcome: Outcome; rttMs: number }
  | { type: "scan-hit"; unit: number; outcome: Outcome; rttMs: number }
  | { type: "scan-ranges"; ranges: [number, number][] }
  | { type: "scan-progress"; done: number; total: number }
  | { type: "scan-done"; kind: "ids" | "addrs"; found: number; cancelled: boolean; stopped: string | null }
  // 세션(연결) 사건
  | { type: "status"; state: "connected" | "disconnected" | "reconnecting" | "closed"; port: string; message: string | null }
  | { type: "error"; message: string };

export interface Stats {
  total: TableStats;
  /** 표 번호(글자) → 통계 */
  tables: Record<string, TableStats>;
}

export interface WriteReq {
  unit: number;
  bits: boolean;
  start: number;
  values: number[];
  forceMulti: boolean;
}

export interface ScanIds {
  from: number;
  to: number;
  fc: Fc;
  addr: number;
  timeoutMs: number;
}

export interface ScanAddrs {
  unit: number;
  fc: Fc;
  from: number;
  to: number;
  block: number;
  timeoutMs: number;
  fine: boolean;
}

/** 예외 코드 → [영어 이름, 한국어 뜻·할 일, 영어 뜻·할 일] */
export const EXCEPTIONS: Record<number, [string, string, string]> = {
  1: ["Illegal Function", "지원하지 않는 함수 — 이 장비는 이 함수 코드를 모릅니다(다른 함수로)", "the device does not support this function code (try another one)"],
  2: ["Illegal Data Address", "없는 주소 — 장비에 없는 주소(범위)입니다. 시작 주소·개수·0/1 기준을 확인하세요", "the address range does not exist on the device — check start, count and 0/1-based numbering"],
  3: ["Illegal Data Value", "잘못된 값 — 개수나 값이 장비가 받는 범위를 벗어났습니다", "the count or value is outside what the device accepts"],
  4: ["Server Device Failure", "장비 고장 — 처리하다 장비 안에서 오류가 났습니다", "the device failed while handling the request"],
  5: ["Acknowledge", "받음(처리 중) — 오래 걸리는 일을 받아 처리하는 중입니다", "accepted, still processing a long operation"],
  6: ["Server Device Busy", "장비 바쁨 — 잠시 뒤 다시 보내세요(요청 간격을 늘려 보세요)", "busy — retry later (try a longer delay between polls)"],
  8: ["Memory Parity Error", "메모리 패리티 오류", "memory parity error on the device"],
  10: ["Gateway Path Unavailable", "게이트웨이 경로 없음 — 게이트웨이의 국번·경로 설정을 확인하세요", "the gateway has no path to this Slave ID — check the gateway's routing/unit IDs"],
  11: ["Gateway Target Device Failed to Respond", "게이트웨이 대상 응답 없음 — 게이트웨이 뒤 장비가 답하지 않습니다", "the device behind the gateway did not answer"],
};

/** 결과를 사람이 읽는 한 줄로 — 예외는 뜻과 할 일까지 */
export function outcomeText(o: Outcome, lang: "ko" | "en"): string {
  const ko = lang === "ko";
  switch (o.result) {
    case "ok":
      return ko ? "정상" : "OK";
    case "broadcast":
      return ko ? "브로드캐스트(응답 없음)" : "Broadcast (no reply)";
    case "timeout":
      return ko ? "응답 없음(타임아웃) — 국번·통신 설정·배선·응답 기다림을 확인하세요" : "No response (timeout) — check the Slave ID, line settings, wiring and timeout";
    case "exception": {
      const e = EXCEPTIONS[o.code];
      const code = o.code.toString(16).toUpperCase().padStart(2, "0");
      if (!e) return ko ? `예외 ${code}(알 수 없는 코드)` : `Exception ${code} (unknown code)`;
      return ko ? `예외 ${code} ${e[0]} — ${e[1]}` : `Exception ${code} ${e[0]} — ${e[2]}`;
    }
    case "crc":
      return ko ? `${o.why} — 속도·패리티·배선(노이즈·종단 저항)을 확인하세요` : `${o.why} — check baud, parity and wiring (noise, termination)`;
    default:
      return o.why;
  }
}

export const api = {
  listPorts: () => invoke<PortInfo[]>("list_ports"),
  open: (config: SerialConfig, setup: Setup, onEvent: (e: MasterEvent) => void) => {
    const ch = new Channel<MasterEvent>();
    ch.onmessage = onEvent;
    return tally("connect_serial", invoke<void>("open", { config, setup, onEvent: ch }));
  },
  openTcp: (config: { host: string; port: number; wire: "tcp" | "rtu"; autoReconnect: boolean }, setup: Setup, onEvent: (e: MasterEvent) => void) => {
    const ch = new Channel<MasterEvent>();
    ch.onmessage = onEvent;
    return tally("connect_tcp", invoke<void>("open_tcp", { config, setup, onEvent: ch }));
  },
  close: () => invoke<void>("close"),
  reconfigure: (config: SerialConfig) => invoke<void>("reconfigure", { config }),
  setTables: (tables: PollSpec[]) => invoke<void>("set_tables", { tables }),
  setTiming: (timing: Timing) => invoke<void>("set_timing", { timing }),
  setAddrStyle: (style: { base: number; plc: boolean }) => invoke<void>("set_addr_style", { style }),
  setPaused: (paused: boolean) => invoke<void>("set_paused", { paused }),
  readOnce: (table: number) => tally("modbus_read", invoke<void>("read_once", { table })),
  write: (token: number, table: number, req: WriteReq) => tally("modbus_write", invoke<void>("write", { token, table, req })),
  previewWrite: (req: WriteReq, wire: "tcp" | "rtu") => invoke<number[]>("preview_write", { req, wire }),
  scanIds: (config: ScanIds) => tally("scan_ids", invoke<void>("scan_ids", { config })),
  scanAddrs: (config: ScanAddrs) => tally("scan_addrs", invoke<void>("scan_addrs", { config })),
  scanCancel: () => invoke<void>("scan_cancel"),
  getStats: () => invoke<Stats>("get_stats"),
  resetStats: () => invoke<void>("reset_stats"),
  setLog: (path: string | null) => tally(path ? "file_log" : null, invoke<void>("set_log", { path })),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  appendText: (path: string, text: string) => invoke<void>("append_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
  /** 명령줄 인자(실행 파일 이름 뺀 것) — 처음 한 번만 받는다(0.2.0) */
  launchArgs: () => invoke<string[]>("launch_args"),
};
