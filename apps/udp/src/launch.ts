// 명령줄 인자(0.3.0) — UDP 는 «--auto»(켤 때 마지막으로 시작에 성공한 설정으로 바로 시작)만 읽는다.
// 다른 인자는 bad 에 모아 화면이 한 줄로 알린다. 시험: node --test apps/udp/src/launch.test.ts
import { parseArgs } from "../../../shared/launchArgs.ts";
import type { UdpConfig } from "./api.ts";

export interface UdpLaunch {
  auto: boolean;
  /** 무시한 인자(받은 모양 그대로) */
  bad: string[];
}

/** argv: 실행 파일 이름 뺀 인자 */
export function udpLaunch(argv: readonly string[]): UdpLaunch {
  const { opts, bad } = parseArgs(argv, { auto: "flag" });
  return { auto: opts.has("auto"), bad: [...bad] };
}

const isPort = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 65535;
const isStr = (v: unknown, max = 300): v is string => typeof v === "string" && v.length <= max;

/**
 * 마지막으로 시작에 성공한 설정(saveLastOk 저장값)을 base 위에 덮는다 — 모양이 맞는 칸만.
 * 받을 포트가 없거나 틀리면 null(그 저장값은 쓰지 않는다)
 */
export function lastOkConfig(v: unknown, base: UdpConfig): UdpConfig | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (!isPort(o.bindPort)) return null;
  const out: UdpConfig = { ...base, bindPort: o.bindPort };
  if (isStr(o.bindHost) && o.bindHost.trim()) out.bindHost = o.bindHost.trim();
  if (isStr(o.remoteHost)) out.remoteHost = o.remoteHost.trim();
  if (isPort(o.remotePort)) out.remotePort = o.remotePort;
  if (typeof o.broadcast === "boolean") out.broadcast = o.broadcast;
  if (isStr(o.multicastGroup)) out.multicastGroup = o.multicastGroup.trim();
  if (isStr(o.multicastIf)) out.multicastIf = o.multicastIf.trim();
  if (typeof o.multicastTtl === "number" && Number.isInteger(o.multicastTtl) && o.multicastTtl >= 1 && o.multicastTtl <= 255) out.multicastTtl = o.multicastTtl;
  if (typeof o.multicastLoop === "boolean") out.multicastLoop = o.multicastLoop;
  if (typeof o.echo === "boolean") out.echo = o.echo;
  return out;
}
