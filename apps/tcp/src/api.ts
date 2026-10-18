import { Channel, invoke } from "@tauri-apps/api/core";
import { checksumToRust, type ChecksumKind, type CkOpts, type Encoding } from "@shared/format";
import { frameModeToRust, type FrameMode } from "@shared/framing";
import type { Pace, Progress } from "@shared/FileSend";
import type { LogFormat } from "@shared/settings";
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
  | { type: "status"; state: "listening" | "connected" | "disconnected" | "reconnecting" | "closed"; port: string; message: string | null }
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
  start: (config: TcpConfig, framing: FrameMode, rxCheck: unknown, onEvent: (e: SessionEvent) => void) => {
    const ch = new Channel<SessionEvent>();
    ch.onmessage = onEvent;
    return invoke<string | null>("start", { config, framing: frameModeToRust(framing), rxCheck, onEvent: ch });
  },
  stop: () => invoke<void>("stop"),
  setFraming: (framing: FrameMode, rxCheck: unknown) => invoke<void>("set_framing", { framing: frameModeToRust(framing), rxCheck }),
  setEcho: (on: boolean) => invoke<void>("set_echo", { on }),
  /** sent < total 이면 일부 상대에게만 나갔다. 문자 간 지연이 있으면 다 보낼 때까지 돌아오지 않는다 */
  send: (target: number | null, spec: SendSpec, encoding: Encoding, charDelayMs = 0) =>
    invoke<{ sent: number; total: number }>("send", { target, spec: wireSpec(spec, encoding), pace: charDelayMs > 0 ? { charDelayMs, lineDelayMs: 0, byLine: false, chunk: 0 } : null }),
  /** 파일 보내기 — 진행은 onProgress 로 */
  sendFile: (target: number | null, path: string, pace: Pace, onProgress: (p: Progress) => void) => {
    const ch = new Channel<Progress>();
    ch.onmessage = onProgress;
    return invoke<{ id: number; total: number }>("send_file", { target, path, pace, onProgress: ch });
  },
  cancelSend: () => invoke<void>("cancel_send"),
  fileSize: (path: string) => invoke<number>("file_size", { path }),
  kick: (id: number) => invoke<void>("kick", { id }),
  preview: (spec: SendSpec, encoding: Encoding) => invoke<number[]>("preview", { spec: wireSpec(spec, encoding) }),
  setLog: (path: string | null) => invoke<void>("set_log", { path }),
  setLogOptions: (options: LogOptions) => invoke<void>("set_log_options", { options }),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};
