import { Channel, invoke } from "@tauri-apps/api/core";
import type { ChecksumKind } from "@shared/format";
import { frameModeToRust, type FrameMode } from "@shared/framing";
import { autoReplyApi } from "@shared/autoReplyApi";
import { tally } from "@shared/usage";
export { ascii, CHECKSUMS, clock, hex, type ChecksumKind } from "@shared/format";
export type { FrameMode } from "@shared/framing";

export type TextMode = "hex" | "ascii";
export type Transport = "serial" | "tcp-server" | "tcp-client" | "udp";

export interface SendSpec {
  text: string;
  mode: TextMode;
  checksum: ChecksumKind | null;
  suffix: string;
}

// 규칙·맞춰 보기 옵션·규칙 명령은 Serial·TCP·UDP 와 같은 것 — shared/autoReply.ts
export type { AutoRule, MatchOptions, SetRulesResult } from "@shared/autoReply";

export interface PortInfo {
  name: string;
  product: string | null;
  manufacturer: string | null;
}

export interface Frame {
  ts: number;
  dir: "rx" | "tx" | "ev";
  bytes: number[];
  check: boolean | null;
  note?: string;
  peer?: string;
  /** 화면에서 붙이는 일련번호(줄 고르기·따라가기용) */
  seq?: number;
}

export type SessionEvent =
  | { type: "frames"; frames: Frame[] }
  | { type: "status"; state: string; port: string; message: string | null }
  | { type: "error"; message: string }
  | { type: "peers"; peers: { id: number; addr: string }[] }
  | { type: "lines" };

function channel(onEvent: (e: SessionEvent) => void) {
  const ch = new Channel<SessionEvent>();
  ch.onmessage = onEvent;
  return ch;
}

export const api = {
  listPorts: () => invoke<PortInfo[]>("list_ports"),
  /** 명령줄 인자(0.3.0) — 처음 한 번만, 실행 파일 이름 뺀 것 */
  launchArgs: () => invoke<string[]>("launch_args"),
  startSerial: (config: object, framing: FrameMode, onEvent: (e: SessionEvent) => void) =>
    tally("start_serial", invoke<void>("start_serial", { config, framing: frameModeToRust(framing), onEvent: channel(onEvent) })),
  startTcp: (config: object, framing: FrameMode, onEvent: (e: SessionEvent) => void) =>
    tally("start_tcp", invoke<string | null>("start_tcp", { config, framing: frameModeToRust(framing), onEvent: channel(onEvent) })),
  startUdp: (config: object, onEvent: (e: SessionEvent) => void) => tally("start_udp", invoke<string>("start_udp", { config, onEvent: channel(onEvent) })),
  stop: () => invoke<void>("stop"),
  setFraming: (framing: FrameMode) => invoke<void>("set_framing", { framing: frameModeToRust(framing) }),
  /** 규칙(set_rules·preview_rule)·횟수·비교 옵션은 autoReplyApi 로 */
  setMatchOptions: autoReplyApi.setMatchOptions,
  getHits: autoReplyApi.getHits,
  resetHits: autoReplyApi.resetHits,
  send: (spec: SendSpec) => tally("send", invoke<void>("send", { spec })),
  preview: (spec: SendSpec) => invoke<number[]>("preview", { spec }),
  setLog: (path: string | null) => tally(path ? "file_log" : null, invoke<void>("set_log", { path })),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};
