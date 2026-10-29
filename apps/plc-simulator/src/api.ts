import { Channel, invoke } from "@tauri-apps/api/core";
import type { SimSpec } from "../../modbus-slave/src/regmap";
import { tally } from "@shared/usage";
export { ascii, clock, hex } from "@shared/format";

export { DEV_GROUPS, DEV_INFO, DEVS, MAX_SIZE, type DataCode, type Dev, type Format, type FrameKind } from "./devs.ts";
import type { Dev, Format } from "./devs.ts";

export type Transport = "tcp" | "udp";

/** 서버 설정(화면 저장용) */
export interface NetConfig {
  transport: Transport;
  host: string;
  port: number;
  format: Format;
  ownStationOnly: boolean;
}

export interface Frame {
  ts: number;
  dir: "rx" | "tx" | "ev";
  bytes: number[];
  check: boolean | null;
  note?: string;
  peer?: string;
  /** 백엔드가 붙인 MC 한 줄 풀이(«0401 일괄 읽기 (워드) D100 ×3», «종료 0000 완료 · 6바이트») */
  sum?: string;
  seq?: number;
}

export interface Peer {
  id: number;
  addr: string;
}

export type SessionEvent =
  | { type: "frames"; frames: Frame[] }
  | { type: "status"; state: "connected" | "listening" | "disconnected" | "reconnecting" | "closed"; port: string; message: string | null }
  | { type: "error"; message: string }
  | { type: "peers"; peers: Peer[] };

/** 장애를 걸 요청 고르기 — 비어 있으면 모두 */
export interface FaultTarget {
  /** 명령(0x0401 …) */
  commands: number[];
  devices: Dev[];
  everyNth: number;
  probability: number;
}

export interface Faults {
  delayMs: number;
  delayMaxMs: number;
  noResponse: boolean;
  /** 이 종료 코드로 답함(0 = 끔) */
  forceEndCode: number;
  target: FaultTarget;
}

export interface Stats {
  requests: number;
  ok: number;
  errors: number;
  ignored: number;
  noResponse: number;
  writes: number;
  perCmd: Record<string, number>;
  perEnd: Record<string, number>;
}

/** 구현한 명령 — [코드, 한국어, 영어] */
export const COMMANDS: [number, string, string][] = [
  [0x0401, "일괄 읽기", "Read"],
  [0x1401, "일괄 쓰기", "Write"],
  [0x0403, "랜덤 읽기", "Read Random"],
  [0x1402, "랜덤 쓰기", "Write Random"],
  [0x0619, "루프백", "Loopback"],
];

/**
 * 종료 코드 — 이 흉내가 쓰는 값과 뜻(MELSEC iQ-R Ethernet User's Manual (Application) SH-081257ENG 3.5 의 설명을 줄인 것).
 * [코드, 한국어, 영어]
 */
export const END_CODES: [number, string, string][] = [
  [0xc050, "ASCII 변환 불가", "ASCII conversion error"],
  [0xc051, "점 수 범위 밖(워드)", "Points out of range (words)"],
  [0xc052, "점 수 범위 밖(비트)", "Points out of range (bits)"],
  [0xc053, "랜덤 점 수 범위 밖(비트)", "Random points out of range (bits)"],
  [0xc054, "랜덤 점 수 범위 밖(워드)", "Random points out of range (words)"],
  [0xc056, "주소 범위 밖", "Address out of range"],
  [0xc057, "요청 길이 불일치", "Request length mismatch"],
  [0xc059, "명령·서브 명령 틀림", "Wrong command/subcommand"],
  [0xc05b, "디바이스 지정 틀림", "Device cannot be accessed"],
  [0xc05c, "요청 데이터 틀림", "Request data error"],
  [0xc05f, "접근 대상 틀림", "Wrong access destination"],
  [0xc060, "비트 값 틀림", "Bit request error"],
  [0xc061, "데이터 길이 불일치", "Data length mismatch"],
];

export const api = {
  /** 서버를 연다 — 실제로 묶인 주소를 돌려준다 */
  start: (config: { transport: Transport; host: string; port: number; format: Format }, onEvent: (e: SessionEvent) => void) => {
    const ch = new Channel<SessionEvent>();
    ch.onmessage = onEvent;
    return tally(config.transport === "udp" ? "start_udp" : "start_tcp", invoke<string>("start", { config, onEvent: ch }));
  },
  stop: () => invoke<void>("stop"),
  kick: (id: number) => invoke<void>("kick", { id }),
  setLog: (path: string | null) => tally(path ? "file_log" : null, invoke<void>("set_log", { path })),
  setFaults: (faults: Faults) => tally((faults.noResponse || faults.forceEndCode > 0 || faults.delayMs > 0 || faults.delayMaxMs > 0) && "faults", invoke<void>("set_faults", { faults })),
  setOptions: (options: { ownStationOnly: boolean }) => invoke<void>("set_options", { options }),
  setSims: (dev: Dev, sims: SimSpec[]) => tally(sims.length > 0 && "simulate", invoke<void>("set_sims", { dev, sims })),
  setSize: (dev: Dev, size: number) => invoke<void>("set_size", { dev, size }),
  getValues: (dev: Dev, start: number, count: number) => invoke<number[]>("get_values", { dev, start, count }),
  setValues: (dev: Dev, start: number, values: number[]) => tally("edit_values", invoke<void>("set_values", { dev, start, values })),
  getStats: () => invoke<Stats>("get_stats"),
  resetStats: () => invoke<void>("reset_stats"),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
  launchArgs: () => invoke<string[]>("launch_args"),
};
