import { Channel, invoke } from "@tauri-apps/api/core";

export interface NicAddr {
  ip: string;
  prefix: number;
  mask: string;
}

export interface Nic {
  id: string;
  name: string;
  desc: string;
  addrs: NicAddr[];
  gateway: string | null;
  mac: string | null;
  up: boolean;
  wireless: boolean;
  vendor: string | null;
}

export interface RangeInfo {
  count: number;
  first: string;
  last: string;
  tooMany: boolean;
}

export interface ScanConfig {
  range: string;
  nicIp: string | null;
  ping: boolean;
  arp: boolean;
  timeoutMs: number;
  ports: number[];
  portTimeoutMs: number;
  names: boolean;
  modbusId: boolean;
  threads: number;
}

export interface Ident {
  unit: number;
  vendor: string;
  product: string;
  revision: string;
}

export interface Host {
  ip: string;
  mac: string | null;
  vendor: string | null;
  randomMac: boolean;
  rtt: number | null;
  arp: boolean;
  name: string | null;
  ports: number[];
  modbus: Ident | null;
  me: boolean;
  done: boolean;
  /** 찾는 동안 이 IP 에서 본 서로 다른 MAC(둘 이상일 때만) — IP 충돌 의심(0.2.0) */
  conflict: string[];
}

export type ScanEvent =
  | { type: "host"; host: Host }
  | { type: "progress"; phase: "find" | "check"; done: number; total: number; found: number }
  | { type: "done"; found: number; total: number; ms: number; cancelled: boolean }
  | { type: "error"; message: string };

export interface MonitorConfig {
  hosts: string[];
  intervalMs: number;
  timeoutMs: number;
}

export interface Target {
  host: string;
  ip: string;
}

export type MonitorEvent = { type: "tick"; ts: number; samples: { host: string; rtt: number | null }[] } | { type: "error"; message: string };

export const api = {
  listNics: () => invoke<Nic[]>("list_nics"),
  rangeInfo: (text: string) => invoke<RangeInfo>("range_info", { text }),
  scanStart: (config: ScanConfig, onEvent: (e: ScanEvent) => void) => {
    const ch = new Channel<ScanEvent>();
    ch.onmessage = onEvent;
    return invoke<number>("scan_start", { config, onEvent: ch });
  },
  scanCancel: () => invoke<void>("scan_cancel"),
  modbusIdent: (ip: string, port?: number) => invoke<Ident>("modbus_ident", { ip, port: port ?? null }),
  wake: (mac: string, nicIp: string | null, prefix: number | null) => invoke<string[]>("wake", { mac, nicIp, prefix }),
  openWeb: (ip: string, port: number | null, https: boolean) => invoke<void>("open_web", { ip, port, https }),
  /** Modbus Master 로 열기(0.2.0) — false 면 이 PC 에서 Master 를 찾지 못함 */
  openMaster: (ip: string, port: number, unit: number) => invoke<boolean>("open_master", { ip, port, unit }),
  monitorStart: (config: MonitorConfig, logPath: string | null, onEvent: (e: MonitorEvent) => void) => {
    const ch = new Channel<MonitorEvent>();
    ch.onmessage = onEvent;
    return invoke<Target[]>("monitor_start", { config, logPath, onEvent: ch });
  },
  monitorStop: () => invoke<void>("monitor_stop"),
  monitorSetLog: (path: string | null) => invoke<void>("monitor_set_log", { path }),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};
