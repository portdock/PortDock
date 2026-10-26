// 명령줄 인자(0.3.0) — 지금은 «--auto»(켤 때 마지막으로 성공한 연결로 바로 연결) 하나만.
// 다른 인자는 bad 에 모아 화면이 «무시한 명령줄 인자» 로 알린다. 시험: node --test apps/scpi/src/launch.test.ts
import { parseArgs } from "../../../shared/launchArgs.ts";

export interface ScpiLaunch {
  auto: boolean;
  /** 무시한 인자(받은 모양 그대로) */
  bad: string[];
}

const SPEC = { auto: "flag" } as const;

/** argv: 실행 파일 이름 뺀 인자 */
export function scpiLaunch(argv: readonly string[]): ScpiLaunch {
  const { opts, bad } = parseArgs(argv, SPEC);
  return { auto: opts.has("auto"), bad: [...bad] };
}

/** 마지막으로 성공한 연결(lastConnOk) — 저장값 모양 확인. 틀리면 null */
export interface ScpiLastOk {
  transport: "lan" | "serial";
  host?: string;
  port?: number;
  serialPort?: string;
  baud?: number;
  dataBits?: number;
  parity?: "none" | "odd" | "even";
  stopBits?: number;
  flow?: "none" | "hardware" | "software";
  term?: "lf" | "crlf" | "cr";
}

const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | undefined => (list.includes(v as T) ? (v as T) : undefined);
const intIn = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi ? v : undefined);

export function cleanLastOk(v: unknown): ScpiLastOk | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const transport = oneOf(o.transport, ["lan", "serial"] as const);
  if (!transport) return null;
  const term = oneOf(o.term, ["lf", "crlf", "cr"] as const);
  if (transport === "lan") {
    const host = typeof o.host === "string" ? o.host.trim() : "";
    const port = intIn(o.port, 1, 65535);
    if (!host || host.length > 300 || port === undefined) return null;
    return { transport, host, port, term };
  }
  const serialPort = typeof o.serialPort === "string" ? o.serialPort.trim() : "";
  const baud = intIn(o.baud, 50, 20_000_000);
  if (!serialPort || baud === undefined) return null;
  return {
    transport,
    serialPort,
    baud,
    dataBits: [7, 8].includes(o.dataBits as number) ? (o.dataBits as number) : undefined,
    parity: oneOf(o.parity, ["none", "odd", "even"] as const),
    stopBits: [1, 2].includes(o.stopBits as number) ? (o.stopBits as number) : undefined,
    flow: oneOf(o.flow, ["none", "hardware", "software"] as const),
    term,
  };
}
