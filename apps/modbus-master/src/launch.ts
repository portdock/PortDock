// 명령줄 인자(0.2.0) — 연결 설정을 채운다(--auto 가 없으면 연결은 사용자가 «연결» 을 누른다).
//   --tcp <host[:port]>   Modbus TCP 로, 장비 주소·포트(없으면 502)
//   --rtu <COMx>          시리얼(RTU)로, 그 포트
//   --baud <n>            시리얼 속도(50~20000000)
//   --unit <n>            고른 표의 국번(TCP 0~255, RTU 1~255 — 화면 국번 칸과 같은 범위)
//   --auto                (0.3.0) 켜자마자 연결 — 채운 설정, 없으면 마지막으로 성공한 연결로
// 잘못된 것은 bad 에 모아 화면이 한 줄로 알린다. 시험: node --test apps/modbus-master/src/launch.test.ts
import { comPort, hostPort, intIn, parseArgs } from "../../../shared/launchArgs.ts";
import { minUnit } from "./model.ts";

export interface MasterLaunch {
  transport?: "serial" | "tcp";
  host?: string;
  port?: number;
  serialPort?: string;
  baud?: number;
  unit?: number;
  /** --auto — 켜자마자 연결(0.3.0) */
  auto: boolean;
  /** 무시한 인자(받은 모양 그대로, «--unit 999» 처럼 이름·값을 붙여서) */
  bad: string[];
}

const SPEC = { tcp: "value", rtu: "value", baud: "value", unit: "value", auto: "flag" } as const;

/** argv: 실행 파일 이름 뺀 인자. wire: 지금 연결 방식(국번 범위 — --tcp·--rtu 가 있으면 그쪽) */
export function masterLaunch(argv: readonly string[], wire: "tcp" | "rtu"): MasterLaunch {
  const { opts, bad } = parseArgs(argv, SPEC);
  const out: MasterLaunch = { bad: [...bad], auto: opts.has("auto") };
  const tcp = opts.get("tcp");
  const rtu = opts.get("rtu");
  if (tcp !== undefined && rtu !== undefined) {
    // 둘 다면 어느 쪽인지 모른다 — 연결 방식은 그대로 두고 둘 다 알린다
    out.bad.push(`--tcp ${tcp}`, `--rtu ${rtu}`);
  } else if (tcp !== undefined) {
    const hp = hostPort(tcp, 502);
    if (hp) Object.assign(out, { transport: "tcp", host: hp.host, port: hp.port });
    else out.bad.push(`--tcp ${tcp}`);
  } else if (rtu !== undefined) {
    const p = comPort(rtu);
    if (p) Object.assign(out, { transport: "serial", serialPort: p });
    else out.bad.push(`--rtu ${rtu}`);
  }
  const baud = opts.get("baud");
  if (baud !== undefined) {
    const n = intIn(baud, 50, 20_000_000);
    if (n != null) out.baud = n;
    else out.bad.push(`--baud ${baud}`);
  }
  const unit = opts.get("unit");
  if (unit !== undefined) {
    const w = out.transport === "tcp" ? "tcp" : out.transport === "serial" ? "rtu" : wire;
    const n = intIn(unit, minUnit(w), 255);
    if (n != null) out.unit = n;
    else out.bad.push(`--unit ${unit}`);
  }
  return out;
}

/** 채운 것이 하나라도 있는지 */
export const launchFilled = (l: MasterLaunch) => l.transport !== undefined || l.baud !== undefined || l.unit !== undefined;

/** 켤 때 다시 열 마지막 성공 연결(0.3.0, shared/autoStart 의 lastConnOk) */
export interface LastOk<C, N> {
  transport: "serial" | "tcp" | "rtu-tcp";
  cfg: C;
  net: N;
}

/** 같은 열쇠·같은 타입만 base 위에 덮는다(손으로 고친 저장값·옛 모양 걸러 내기) */
function mergeSame<T extends object>(base: T, v: unknown): T {
  const out = { ...base };
  if (!v || typeof v !== "object") return out;
  for (const k of Object.keys(base) as (keyof T)[]) {
    const x = (v as Record<string, unknown>)[k as string];
    if (x !== undefined && typeof x === typeof base[k]) out[k] = x as T[keyof T];
  }
  return out;
}

/**
 * 저장된 마지막 성공 연결 → 화면 칸에 넣을 값. 모양이 틀리거나 값이 범위 밖이면 null(자동 연결하지 않음).
 * cfg·net 은 지금 칸 값 — 저장값에 없는 열쇠는 그대로 둔다
 */
export function cleanLastOk<C extends { port: string; baud: number; parity: string }, N extends { host: string; port: number }>(
  v: unknown,
  cfg: C,
  net: N,
): LastOk<C, N> | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const tr = o.transport;
  if (tr !== "serial" && tr !== "tcp" && tr !== "rtu-tcp") return null;
  const c = mergeSame(cfg, o.cfg);
  const n = mergeSame(net, o.net);
  if (tr === "serial") {
    const port = comPort(c.port);
    if (!port || !Number.isInteger(c.baud) || c.baud < 50 || c.baud > 20_000_000 || !["none", "odd", "even"].includes(c.parity)) return null;
    return { transport: tr, cfg: { ...c, port }, net };
  }
  const host = n.host.trim();
  if (!host || !Number.isInteger(n.port) || n.port < 1 || n.port > 65535) return null;
  return { transport: tr, cfg, net: { ...n, host } };
}
