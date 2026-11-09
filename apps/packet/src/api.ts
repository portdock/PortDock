import { invoke } from "@tauri-apps/api/core";
import { count } from "@shared/usage";
import type { Bucket, Chunk, FieldRef, Rt, TNode } from "./logic";

export interface FileInfo {
  sid: number;
  name: string;
  path: string;
  size: number;
  packets: number;
  format: "pcap" | "pcapng";
  truncated: boolean;
  firstSec: number;
  durationNs: number;
  openMs: number;
}

export interface Pair {
  role: "req" | "resp";
  peer: number;
  status: string;
}

export interface Row {
  no: number;
  hasTs: boolean;
  sec: number;
  nsec: number;
  relNs: number;
  deltaNs: number;
  deltaViewNs: number;
  src: string;
  dst: string;
  proto: string;
  len: number;
  info: string;
  color: string;
  rtNs: number;
  pair: Pair | null;
}

export interface RowsReply {
  total: number;
  pending: boolean;
  start: number;
  rows: Row[];
}

export interface FilterFail {
  message: string;
  pos: number;
  len: number;
  suggestions: string[];
}

export interface FilterCheck {
  ok: boolean;
  empty: boolean;
  error: FilterFail | null;
}

export interface FilterOutcome {
  shown: number;
  total: number;
  ms: number;
  current: boolean;
}

export interface FieldDef {
  name: string;
  type: string;
  desc: string;
}

export interface Explain {
  title: string;
  meaning: string;
  next: string;
  codeName: string | null;
  codeCause: string | null;
  codeCheck: string | null;
  topic: string;
}

export interface ExpertDto {
  severity: string;
  key: string;
  code: number;
  text: string;
  start: number;
  len: number;
  explain: Explain | null;
}

export interface Detail {
  no: number;
  tree: TNode[];
  bytes: string;
  caplen: number;
  origlen: number;
  fields: FieldRef[];
  experts: ExpertDto[];
  layers: string;
}

export interface Follow {
  flow: number;
  client: string;
  server: string;
  transport: "tcp" | "udp";
  chunks: Chunk[];
  clientBytes: number;
  serverBytes: number;
  truncated: boolean;
}

export interface Conv {
  a: string;
  b: string;
  portA: number | null;
  portB: number | null;
  packets: number;
  bytes: number;
  aToBPackets: number;
  aToBBytes: number;
  bToAPackets: number;
  bToABytes: number;
  startNs: number;
  durationS: number;
}

export interface Endpoint {
  addr: string;
  port: number | null;
  packets: number;
  bytes: number;
  txPackets: number;
  txBytes: number;
  rxPackets: number;
  rxBytes: number;
}

export interface AppSum {
  key: string;
  name: string;
  filter: string;
  rt: Rt;
}

export interface Summary {
  packets: number;
  firstSec: number;
  durationNs: number;
  flows: number;
  overall: Rt;
  apps: AppSum[];
}

export interface RtDist {
  key: string;
  name: string;
  buckets: Bucket[];
  rt: Rt;
}

export interface ExpertGroup {
  key: string;
  severity: string;
  count: number;
  firstFrame: number;
  explain: Explain | null;
}

export interface ExpertRow {
  frame: number;
  severity: string;
  key: string;
  code: number;
  text: string;
}

export interface ExpertReply {
  ready: boolean;
  groups: ExpertGroup[];
  rows: ExpertRow[];
  total: number;
}

export interface DevMapInfo {
  id: string;
  model: string;
  entries: number;
}

export const api = {
  openFile: (path: string) => invoke<FileInfo>("open_file", { path }).then((r) => (count("open_file"), r)),
  fileInfo: () => invoke<FileInfo | null>("file_info"),
  initialFile: () => invoke<string | null>("initial_file"),
  readyState: () => invoke<[boolean, boolean]>("ready_state"),
  summary: () => invoke<Summary | null>("summary"),
  checkFilter: (text: string) => invoke<FilterCheck>("check_filter", { text }),
  setFilter: (text: string) => invoke<FilterOutcome>("set_filter", { text }).then((r) => (text.trim() && count("filter"), r)),
  complete: (prefix: string, limit = 30) => invoke<FieldDef[]>("complete", { prefix, limit }),
  rows: (start: number, count: number) => invoke<RowsReply>("rows", { start, count }),
  locate: (no: number) => invoke<number | null>("locate", { no }),
  viewNo: (pos: number) => invoke<number | null>("view_no", { pos }),
  dissect: (no: number, lang: string) => invoke<Detail>("dissect_packet", { no, lang }),
  follow: (no: number) => invoke<Follow>("follow", { no }).then((r) => (count("follow"), r)),
  conversations: (kind: string, viewOnly: boolean) => invoke<{ conversations: Conv[]; endpoints: Endpoint[] }>("conversations", { kind, viewOnly }).then((r) => (count("stats"), r)),
  rtDistribution: () => invoke<RtDist[]>("rt_distribution").then((r) => (count("stats"), r)),
  experts: (lang: string) => invoke<ExpertReply>("experts", { lang }).then((r) => (count("expert"), r)),
  find: (kind: string, text: string, from: number | null, forward: boolean) => invoke<number | null>("find", { kind, text, from, forward }),
  savePcapng: (path: string, scope: string, selected: number[]) => invoke<number>("save_pcapng", { path, scope, selected }).then((r) => (count("save"), r)),
  setDeviceMap: (json: string | null) => invoke<DevMapInfo | null>("set_device_map", { json }).then((r) => (r && count("device_map"), r)),
  writeText: (path: string, text: string) => invoke<void>("write_text", { path, text }),
  readText: (path: string) => invoke<string>("read_text", { path }),
};
