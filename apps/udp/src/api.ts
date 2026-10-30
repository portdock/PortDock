import { Channel, invoke } from "@tauri-apps/api/core";
import { checksumToRust, type ChecksumKind, type CkOpts, type Encoding } from "@shared/format";
import type { LogFormat } from "@shared/settings";
import { tally } from "@shared/usage";
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
  /** 멀티캐스트로 보낼 때 TTL(1 = 같은 망만) */
  multicastTtl: number;
  /** 보낸 멀티캐스트를 이 PC(같은 그룹 가입한 프로그램)도 받는지 */
  multicastLoop: boolean;
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
  /** (0.6.0) 날짜가 바뀌면 새 파일 */
  splitDaily: boolean;
  /** (0.6.0) 옛 로그 지우기(일, 0 = 안 지움) */
  keepDays: number;
}

/** 보낼 것 → 백엔드 codec::SendText(체크섬 옵션은 ChecksumKind::Spec 으로, 글자 인코딩 포함) */
export const wireSpec = (s: SendSpec, encoding: Encoding) => ({ text: s.text, mode: s.mode, suffix: s.suffix, checksum: checksumToRust(s.checksum, s.ck), encoding });

export const api = {
  start: (config: UdpConfig, rxCheck: unknown, onEvent: (e: SessionEvent) => void) => {
    const ch = new Channel<SessionEvent>();
    ch.onmessage = onEvent;
    return tally("start", invoke<string>("start", { config, rxCheck, onEvent: ch }));
  },
  stop: () => invoke<void>("stop"),
  /** 명령줄 인자(0.3.0) — 처음 한 번만 */
  launchArgs: () => invoke<string[]>("launch_args"),
  setRemote: (host: string, port: number) => invoke<void>("set_remote", { host, port }),
  setRxCheck: (rxCheck: unknown) => invoke<void>("set_rx_check", { rxCheck }),
  setEcho: (on: boolean) => invoke<void>("set_echo", { on }),
  send: (to: string | null, spec: SendSpec, encoding: Encoding) => tally("send", invoke<string>("send", { to, spec: wireSpec(spec, encoding) })),
  rejoin: () => invoke<void>("rejoin"),
  preview: (spec: SendSpec, encoding: Encoding) => invoke<number[]>("preview", { spec: wireSpec(spec, encoding) }),
  setLog: (path: string | null) => tally(path ? "file_log" : null, invoke<void>("set_log", { path })),
  setLogOptions: (options: LogOptions) => invoke<void>("set_log_options", { options }),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};
