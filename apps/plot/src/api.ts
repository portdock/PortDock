// 백엔드(apps/plot/src-tauri/src/lib.rs) 명령과 사건 모양
import { Channel, invoke } from "@tauri-apps/api/core";
import type { Format } from "./model";
import { tally } from "@shared/usage";

export interface PortInfo {
  name: string;
  kind: string;
  vid: number | null;
  pid: number | null;
  serial_number: string | null;
  manufacturer: string | null;
  product: string | null;
}

export type Transport = "serial" | "tcp" | "udp";

/** crates/core/src/serial.rs SerialConfig (흐름 제어 없음·DTR 은 고를 수 있음) */
export interface SerialConfig {
  port: string;
  baud: number;
  dataBits: number;
  parity: "none" | "odd" | "even";
  stopBits: number;
  flow: "none" | "hardware" | "software";
  dtr: boolean;
  autoReconnect: boolean;
}

export type Source = { kind: "serial"; config: SerialConfig } | { kind: "tcp"; host: string; port: number } | { kind: "udp"; host: string; port: number; group: string };

/** 원시 보기 한 줄 (crates/core/src/plot.rs Raw) */
export interface RawLine {
  ts: number;
  text: string;
  ok: boolean;
  why?: string;
  /** 사건 줄(연결·끊김) */
  ev?: boolean;
}

/** lib.rs PlotEvent */
export type PlotEvent =
  | { type: "data"; t: number[]; rows: (number | null)[][]; names?: string[]; raw: RawLine[]; bad: number; bytes: number; dropped: number; recRows?: number }
  | { type: "status"; state: "connected" | "listening" | "disconnected" | "reconnecting" | "closed"; port: string; message: string | null }
  | { type: "error"; message: string }
  | { type: "recordStopped"; message: string };

export const api = {
  listPorts: () => invoke<PortInfo[]>("list_ports"),
  start: (source: Source, format: Format, onEvent: (e: PlotEvent) => void) => {
    const ch = new Channel<PlotEvent>();
    ch.onmessage = onEvent;
    return tally("start", invoke<string>("plot_start", { source, format, onEvent: ch }));
  },
  stop: () => invoke<void>("plot_stop"),
  setFormat: (format: Format) => invoke<void>("plot_set_format", { format }),
  record: (path: string | null, names: string[]) => tally(path ? "record" : null, invoke<void>("plot_record", { path, names })),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  writeBytes: (path: string, data: number[]) => tally("export", invoke<void>("write_bytes", { path, data })),
  readText: (path: string) => invoke<string>("read_text", { path }),
};
