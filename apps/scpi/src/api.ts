// 백엔드(apps/scpi/src-tauri/src/lib.rs) 명령과 반환 모양
import { invoke } from "@tauri-apps/api/core";
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

/** 줄 끝 — 보낼 때 붙이고, 받을 때 CR 이면 CR 에서, 아니면 LF 에서 끊는다 */
export type Term = "lf" | "crlf" | "cr";
export type Transport = "lan" | "serial";

export interface NetConfig {
  host: string;
  port: number;
}

export interface SerialConfig {
  port: string;
  baud: number;
  dataBits: number;
  parity: "none" | "odd" | "even";
  stopBits: number;
  flow: "none" | "hardware" | "software";
}

/** 응답 하나 (lib.rs ReplyOut) */
export interface ReplyOut {
  kind: "text" | "block";
  /** 글 응답(줄 끝 뗀 것). 블록이면 데이터가 글일 때만(앞 4096바이트) */
  text: string;
  /** 블록 머리 «#41000» */
  header: string;
  len: number;
  indefinite: boolean;
  binary: boolean;
  /** 블록 앞 1024바이트 */
  preview: number[];
  /** 받은 그대로(앞 4096바이트) */
  raw: number[];
  rawLen: number;
}

/** 주고받기 한 번 (lib.rs ExchangeOut) */
export interface ExchangeOut {
  ts: number;
  rxTs: number;
  sent: number[];
  stale: number;
  reply: ReplyOut | null;
  ms: number;
}

/** 오류 큐 한 줄 */
export interface ErrEntry {
  code: number | null;
  message: string;
  raw: string;
}

export interface DrainOut {
  errors: ErrEntry[];
  exchanges: ExchangeOut[];
  complete: boolean;
}

/** 질의 오류 (crates/core/src/scpi.rs ScpiError) */
export interface ScpiError {
  kind: "timeout" | "closed" | "io" | "cancelled" | "not-connected" | "invalid";
  message: string;
  partial?: string;
}

/** invoke 가 던진 것 → ScpiError(연결 명령은 글로 던진다) */
export function asScpiError(e: unknown): ScpiError {
  if (e && typeof e === "object" && "kind" in e && "message" in e) return e as ScpiError;
  return { kind: "io", message: String(e) };
}

/** 연결이 끊긴 오류인지 — 백엔드가 연결을 버렸다 */
export const isFatal = (e: ScpiError) => e.kind === "closed" || e.kind === "io" || e.kind === "not-connected";

export const api = {
  listPorts: () => invoke<PortInfo[]>("list_ports"),
  openTcp: (config: NetConfig & { term: Term; connectTimeoutMs: number }) => invoke<void>("open_tcp", { config }),
  openSerial: (config: SerialConfig & { term: Term }) => invoke<void>("open_serial", { config }),
  close: () => invoke<void>("close"),
  cancel: () => invoke<void>("cancel"),
  setTerm: (term: Term) => invoke<void>("set_term", { term }),
  write: (cmd: string) => invoke<ExchangeOut>("write_cmd", { cmd }),
  read: (timeoutMs: number) => invoke<ExchangeOut>("read_reply", { timeoutMs }),
  query: (cmd: string, timeoutMs: number) => invoke<ExchangeOut>("query", { cmd, timeoutMs }),
  drainErrors: (timeoutMs: number, cmd?: string, max?: number) => invoke<DrainOut>("drain_errors", { cmd: cmd ?? null, timeoutMs, max: max ?? null }),
  saveBlock: (path: string) => invoke<number>("save_block", { path }),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  appendText: (path: string, text: string) => invoke<void>("append_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};
