import { Channel, invoke } from "@tauri-apps/api/core";
import type { ChecksumKind } from "@shared/format";
import { frameModeToRust, type FrameMode } from "@shared/framing";
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

export interface AutoRule {
  name: string;
  enabled: boolean;
  pattern: string;
  patternMode: TextMode;
  kind: "exact" | "contains";
  reply: SendSpec;
  delayMs: number;
}

export interface MatchOptions {
  stripTerminator: boolean;
  logNoMatch: boolean;
}

export interface SetRulesResult {
  active: number;
  errors: { index: number; name: string; message: string }[];
}

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
  startSerial: (config: object, framing: FrameMode, onEvent: (e: SessionEvent) => void) =>
    invoke<void>("start_serial", { config, framing: frameModeToRust(framing), onEvent: channel(onEvent) }),
  startTcp: (config: object, framing: FrameMode, onEvent: (e: SessionEvent) => void) =>
    invoke<string | null>("start_tcp", { config, framing: frameModeToRust(framing), onEvent: channel(onEvent) }),
  startUdp: (config: object, onEvent: (e: SessionEvent) => void) => invoke<string>("start_udp", { config, onEvent: channel(onEvent) }),
  stop: () => invoke<void>("stop"),
  setFraming: (framing: FrameMode) => invoke<void>("set_framing", { framing: frameModeToRust(framing) }),
  /** 맞는 규칙만 적용하고, 틀린 규칙은 건너뛴 채 이유를 돌려준다 */
  setRules: (rules: AutoRule[]) => invoke<SetRulesResult>("set_rules", { rules }),
  /** stripTerminator: 끝 문자·뒤쪽 CR LF 를 떼고 비교 · logNoMatch: 안 맞은 요청을 EV «NO MATCH» 로 */
  setMatchOptions: (o: MatchOptions) => invoke<void>("set_match_options", { stripTerminator: o.stripTerminator, logNoMatch: o.logNoMatch }),
  getHits: () => invoke<Record<string, number>>("get_hits"),
  resetHits: () => invoke<void>("reset_hits"),
  send: (spec: SendSpec) => invoke<void>("send", { spec }),
  preview: (spec: SendSpec) => invoke<number[]>("preview", { spec }),
  setLog: (path: string | null) => invoke<void>("set_log", { path }),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};
