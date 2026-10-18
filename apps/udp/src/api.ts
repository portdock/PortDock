import { Channel, invoke } from "@tauri-apps/api/core";
import { checksumToRust, type ChecksumKind, type CkOpts, type Encoding } from "@shared/format";
import type { LogFormat } from "@shared/settings";
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
  /** 화면에서 붙이는 간격·응답 시간(ms) */
  gap?: number | null;
  rsp?: number | null;
  /** 트리거 색 */
  mark?: string | null;
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
  /** 체크섬 자리 옵션·범용 CRC 매개변수 */
  ck?: CkOpts | null;
}

export interface LogOptions {
  format: LogFormat;
  encoding: Encoding;
  splitMb: number;
  splitHours: number;
}

/** 보낼 것 → 백엔드 codec::SendText(체크섬 옵션은 ChecksumKind::Spec 으로, 글자 인코딩 포함) */
export const wireSpec = (s: SendSpec, encoding: Encoding) => ({ text: s.text, mode: s.mode, suffix: s.suffix, checksum: checksumToRust(s.checksum, s.ck), encoding });

export const api = {
  start: (config: UdpConfig, rxCheck: unknown, onEvent: (e: SessionEvent) => void) => {
    const ch = new Channel<SessionEvent>();
    ch.onmessage = onEvent;
    return invoke<string>("start", { config, rxCheck, onEvent: ch });
  },
  stop: () => invoke<void>("stop"),
  setRemote: (host: string, port: number) => invoke<void>("set_remote", { host, port }),
  setRxCheck: (rxCheck: unknown) => invoke<void>("set_rx_check", { rxCheck }),
  setEcho: (on: boolean) => invoke<void>("set_echo", { on }),
  send: (to: string | null, spec: SendSpec, encoding: Encoding) => invoke<string>("send", { to, spec: wireSpec(spec, encoding) }),
  rejoin: () => invoke<void>("rejoin"),
  preview: (spec: SendSpec, encoding: Encoding) => invoke<number[]>("preview", { spec: wireSpec(spec, encoding) }),
  setLog: (path: string | null) => invoke<void>("set_log", { path }),
  setLogOptions: (options: LogOptions) => invoke<void>("set_log_options", { options }),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};
