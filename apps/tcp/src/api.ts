import { Channel, invoke } from "@tauri-apps/api/core";
import { checksumToRust, type ChecksumKind, type CkOpts, type Encoding } from "@shared/format";
import { frameModeToRust, type FrameMode } from "@shared/framing";
import type { MbapInfo } from "@shared/MbapDetail";
import type { Pace, Progress } from "@shared/FileSend";
import type { LogFormat } from "@shared/settings";
import { tally } from "@shared/usage";
export { ascii, CHECKSUMS, clock, hex, type ChecksumKind } from "@shared/format";
export type { FrameMode } from "@shared/framing";

export type TextMode = "hex" | "ascii";

export interface TcpConfig {
  /** relay = 중계(모니터): host:port 에서 듣고 접속마다 위쪽 장비(RelayTarget)로 잇는다 */
  mode: "client" | "server" | "relay";
  host: string;
  port: number;
  noDelay: boolean;
  autoReconnect: boolean;
  reconnectMs: number;
  echo: boolean;
}

/** 중계가 이어 줄 장비(B) */
export interface RelayTarget {
  host: string;
  port: number;
}

/** TCP 의 프레임 구분 — 공용 방식 + Modbus TCP(MBAP 길이 칸) */
export type TcpFrameMode = FrameMode | { kind: "modbus-tcp"; gapMs: number };

/** Rust FrameMode — Modbus TCP 는 길이 칸 방식(core framer::FrameMode::modbus_tcp 와 같은 값) */
export function tcpFrameToRust(m: TcpFrameMode) {
  if (m.kind === "modbus-tcp") return { kind: "length-field", offset: 4, size: 2, adjust: 6, max: 260, gap_ms: m.gapMs };
  return frameModeToRust(m);
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
  start: (config: TcpConfig, framing: TcpFrameMode, rxCheck: unknown, upstream: RelayTarget | null, onEvent: (e: SessionEvent) => void) => {
    const ch = new Channel<SessionEvent>();
    ch.onmessage = onEvent;
    return tally(upstream ? "relay" : "start", invoke<string | null>("start", { config, framing: tcpFrameToRust(framing), rxCheck, upstream, onEvent: ch }));
  },
  stop: () => invoke<void>("stop"),
  setFraming: (framing: TcpFrameMode, rxCheck: unknown) => invoke<void>("set_framing", { framing: tcpFrameToRust(framing), rxCheck }),
  setEcho: (on: boolean) => invoke<void>("set_echo", { on }),
  /** sent < total 이면 일부 상대에게만 나갔다. 문자 간 지연이 있으면 다 보낼 때까지 돌아오지 않는다.
   *  side: 중계에서 "b" = 장비(B) 쪽으로 끼워 넣기 · mbapTid: MBAP 이면 트랜잭션 ID 를 1씩 늘려 넣기 */
  send: (target: number | null, spec: SendSpec, encoding: Encoding, charDelayMs = 0, side: "a" | "b" = "a", mbapTid = false) =>
    tally("send", invoke<{ sent: number; total: number }>("send", {
      target,
      spec: wireSpec(spec, encoding),
      pace: charDelayMs > 0 ? { charDelayMs, lineDelayMs: 0, byLine: false, chunk: 0 } : null,
      side,
      mbapTid,
    })),
  decodeMbap: (bytes: number[]) => invoke<MbapInfo | null>("decode_mbap", { bytes }),
  /** 파일 보내기 — 진행은 onProgress 로 */
  sendFile: (target: number | null, path: string, pace: Pace, onProgress: (p: Progress) => void, side: "a" | "b" = "a") => {
    const ch = new Channel<Progress>();
    ch.onmessage = onProgress;
    return tally("send_file", invoke<{ id: number; total: number }>("send_file", { target, path, pace, side, onProgress: ch }));
  },
  cancelSend: () => invoke<void>("cancel_send"),
  fileSize: (path: string) => invoke<number>("file_size", { path }),
  kick: (id: number) => invoke<void>("kick", { id }),
  preview: (spec: SendSpec, encoding: Encoding) => invoke<number[]>("preview", { spec: wireSpec(spec, encoding) }),
  setLog: (path: string | null) => tally(path ? "file_log" : null, invoke<void>("set_log", { path })),
  setLogOptions: (options: LogOptions) => invoke<void>("set_log_options", { options }),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
  /** 명령줄 인자(0.3.0) — 처음 한 번만 */
  launchArgs: () => invoke<string[]>("launch_args"),
};
