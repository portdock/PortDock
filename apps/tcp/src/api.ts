import { Channel, invoke } from "@tauri-apps/api/core";
import type { ChecksumKind } from "@shared/format";
import { frameModeToRust, type FrameMode } from "@shared/framing";
export { ascii, CHECKSUMS, clock, hex, type ChecksumKind } from "@shared/format";
export type { FrameMode } from "@shared/framing";

export type TextMode = "hex" | "ascii";

export interface TcpConfig {
  mode: "client" | "server";
  host: string;
  port: number;
  noDelay: boolean;
  autoReconnect: boolean;
  reconnectMs: number;
  echo: boolean;
}

export interface Frame {
  ts: number;
  dir: "rx" | "tx" | "ev";
  bytes: number[];
  check: boolean | null;
  note?: string;
  peer?: string;
  /** 화면에서 붙이는 일련번호(선택 줄 유지용) */
  seq?: number;
}

export interface Peer {
  id: number;
  addr: string;
}

export type SessionEvent =
  | { type: "frames"; frames: Frame[] }
  | { type: "status"; state: "listening" | "connected" | "disconnected" | "reconnecting" | "closed"; port: string; message: string | null }
  | { type: "error"; message: string }
  | { type: "peers"; peers: Peer[] };

export interface SendSpec {
  text: string;
  mode: TextMode;
  checksum: ChecksumKind | null;
  suffix: string;
}

export const api = {
  start: (config: TcpConfig, framing: FrameMode, rxCheck: ChecksumKind | null, onEvent: (e: SessionEvent) => void) => {
    const ch = new Channel<SessionEvent>();
    ch.onmessage = onEvent;
    return invoke<string | null>("start", { config, framing: frameModeToRust(framing), rxCheck, onEvent: ch });
  },
  stop: () => invoke<void>("stop"),
  setFraming: (framing: FrameMode, rxCheck: ChecksumKind | null) => invoke<void>("set_framing", { framing: frameModeToRust(framing), rxCheck }),
  setEcho: (on: boolean) => invoke<void>("set_echo", { on }),
  /** sent < total 이면 일부 상대에게만 나갔다 */
  send: (target: number | null, spec: SendSpec) => invoke<{ sent: number; total: number }>("send", { target, spec }),
  kick: (id: number) => invoke<void>("kick", { id }),
  preview: (spec: SendSpec) => invoke<number[]>("preview", { spec }),
  setLog: (path: string | null) => invoke<void>("set_log", { path }),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};
