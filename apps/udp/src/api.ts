import { Channel, invoke } from "@tauri-apps/api/core";
import type { ChecksumKind } from "@shared/format";
export { ascii, CHECKSUMS, clock, hex, type ChecksumKind } from "@shared/format";

export type TextMode = "hex" | "ascii";

export interface UdpConfig {
  bindHost: string;
  bindPort: number;
  remoteHost: string;
  remotePort: number;
  broadcast: boolean;
  multicastGroup: string;
  multicastIf: string;
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
  | { type: "status"; state: "listening" | "closed"; port: string; message: string | null }
  | { type: "error"; message: string }
  | { type: "peers"; peers: Peer[] };

export interface SendSpec {
  text: string;
  mode: TextMode;
  checksum: ChecksumKind | null;
  suffix: string;
}

export const api = {
  start: (config: UdpConfig, rxCheck: ChecksumKind | null, onEvent: (e: SessionEvent) => void) => {
    const ch = new Channel<SessionEvent>();
    ch.onmessage = onEvent;
    return invoke<string>("start", { config, rxCheck, onEvent: ch });
  },
  stop: () => invoke<void>("stop"),
  setRemote: (host: string, port: number) => invoke<void>("set_remote", { host, port }),
  setRxCheck: (rxCheck: ChecksumKind | null) => invoke<void>("set_rx_check", { rxCheck }),
  setEcho: (on: boolean) => invoke<void>("set_echo", { on }),
  send: (to: string | null, spec: SendSpec) => invoke<string>("send", { to, spec }),
  rejoin: () => invoke<void>("rejoin"),
  preview: (spec: SendSpec) => invoke<number[]>("preview", { spec }),
  setLog: (path: string | null) => invoke<void>("set_log", { path }),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};
