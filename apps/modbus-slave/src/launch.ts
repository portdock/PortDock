// 명령줄 인자(0.3.0) — Modbus Slave 는 «--auto»(켤 때 마지막으로 시작에 성공한 설정으로 바로 연결)만 읽는다.
// 다른 인자는 bad 에 모아 화면이 «무시한 명령줄 인자» 로 알린다. 시험: node --test apps/modbus-slave/src/launch.test.ts
import { parseArgs } from "../../../shared/launchArgs.ts";

export interface SlaveLaunch {
  /** --auto — 설정 «켤 때 마지막 연결 다시 열기» 와 같은 일을 이번 한 번 */
  auto: boolean;
  /** 무시한 인자(받은 모양 그대로) */
  bad: string[];
}

const SPEC = { auto: "flag" } as const;

/** argv: 실행 파일 이름 뺀 인자 */
export function slaveLaunch(argv: readonly string[]): SlaveLaunch {
  const { opts, bad } = parseArgs(argv, SPEC);
  return { auto: opts.has("auto"), bad: [...bad] };
}

/** 마지막으로 시작에 성공한 설정 — 저장값(loadLastOk)을 확인해 쓸 수 있는 것만 돌려준다(아니면 null) */
export interface LastOk {
  transport: "serial" | "tcp" | "rtu-tcp";
  /** 시리얼 설정(포트·속도·데이터 비트·패리티·정지 비트 …) — 앱 기본값과 합쳐 쓴다 */
  cfg?: Record<string, unknown>;
  /** 듣기 주소·포트 */
  net?: { host: string; port: number };
}

export function cleanLastOk(v: unknown): LastOk | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const tr = o.transport;
  if (tr !== "serial" && tr !== "tcp" && tr !== "rtu-tcp") return null;
  if (tr === "serial") {
    const c = o.cfg;
    if (!c || typeof c !== "object" || typeof (c as Record<string, unknown>).port !== "string" || !(c as Record<string, unknown>).port) return null;
    return { transport: tr, cfg: c as Record<string, unknown> };
  }
  const n = o.net as Record<string, unknown> | undefined;
  if (!n || typeof n !== "object" || typeof n.host !== "string" || !n.host.trim()) return null;
  const port = n.port;
  if (typeof port !== "number" || !Number.isInteger(port) || port < 0 || port > 65535) return null;
  return { transport: tr, net: { host: n.host.trim(), port } };
}
