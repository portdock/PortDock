// 명령줄 인자(0.3.0) — 받는 곳 설정만 채운다(자동으로 받기 시작하지 않는다 — 사용자가 «시작» 을 누른다).
//   --serial <COMx>       시리얼로, 그 포트
//   --baud <n>            시리얼 속도(50~20000000)
//   --tcp <host:port>     TCP 클라이언트로, 장비 주소·포트(포트까지 있어야 함)
//   --udp <port>          UDP 받기로, 묶을 포트(0~65535)
//   --auto                켜자마자 받기 시작(0.3.0) — 명령줄로 채운 설정, 없으면 마지막으로 성공한 설정으로
// --serial·--tcp·--udp 는 하나만 — 둘 이상이면 어느 쪽인지 모르므로 모두 무시한다.
// 잘못된 것은 bad 에 모아 화면이 한 줄로 알린다. 시험: node --test apps/plot/src/launch.test.ts
import { comPort, hostPort, intIn, parseArgs } from "../../../shared/launchArgs.ts";

export interface PlotLaunch {
  transport?: "serial" | "tcp" | "udp";
  serialPort?: string;
  baud?: number;
  host?: string;
  /** TCP 장비 포트 또는 UDP 묶을 포트 */
  port?: number;
  /** --auto */
  auto: boolean;
  /** 무시한 인자(받은 모양 그대로, «--udp 70000» 처럼 이름·값을 붙여서) */
  bad: string[];
}

const SPEC = { serial: "value", baud: "value", tcp: "value", udp: "value", auto: "flag" } as const;

/** argv: 실행 파일 이름 뺀 인자 */
export function plotLaunch(argv: readonly string[]): PlotLaunch {
  const { opts, bad } = parseArgs(argv, SPEC);
  const out: PlotLaunch = { auto: opts.has("auto"), bad: [...bad] };
  const given = (["serial", "tcp", "udp"] as const).filter((k) => opts.has(k));
  if (given.length > 1) {
    for (const k of given) out.bad.push(`--${k} ${opts.get(k)}`);
  } else if (given[0] === "serial") {
    const v = opts.get("serial")!;
    const p = comPort(v);
    if (p) Object.assign(out, { transport: "serial", serialPort: p });
    else out.bad.push(`--serial ${v}`);
  } else if (given[0] === "tcp") {
    const v = opts.get("tcp")!;
    // 포트 0 = «포트 없음» 표시 — TCP 는 포트까지 있어야 한다
    const hp = hostPort(v, 0);
    if (hp && hp.port > 0) Object.assign(out, { transport: "tcp", host: hp.host, port: hp.port });
    else out.bad.push(`--tcp ${v}`);
  } else if (given[0] === "udp") {
    const v = opts.get("udp")!;
    const n = intIn(v, 0, 65535);
    if (n != null) Object.assign(out, { transport: "udp", port: n });
    else out.bad.push(`--udp ${v}`);
  }
  const baud = opts.get("baud");
  if (baud !== undefined) {
    const n = intIn(baud, 50, 20_000_000);
    if (n != null) out.baud = n;
    else out.bad.push(`--baud ${baud}`);
  }
  return out;
}

/** 채운 것이 하나라도 있는지 */
export const launchFilled = (l: PlotLaunch) => l.transport !== undefined || l.baud !== undefined;

// ---- 마지막으로 성공한 받는 곳(0.3.0) — @shared/autoStart saveLastOk/loadLastOk 의 값 모양과 확인

export interface SerialPart {
  port: string;
  baud: number;
  dataBits: number;
  parity: "none" | "odd" | "even";
  stopBits: number;
  dtr: boolean;
  autoReconnect: boolean;
}

export type LastOk = { transport: "serial"; cfg: SerialPart } | { transport: "tcp"; host: string; port: number } | { transport: "udp"; host: string; port: number; group: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const intOk = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

/** 저장값 확인 — 모양이 틀리면 null(그때는 자동으로 받지 않는다) */
export function lastOkOf(v: unknown): LastOk | null {
  if (!isObj(v)) return null;
  if (v.transport === "serial" && isObj(v.cfg)) {
    const c = v.cfg;
    if (typeof c.port !== "string" || !c.port.trim() || !intOk(c.baud, 50, 20_000_000)) return null;
    return {
      transport: "serial",
      cfg: {
        port: c.port.trim(),
        baud: c.baud as number,
        dataBits: c.dataBits === 7 ? 7 : 8,
        parity: c.parity === "odd" || c.parity === "even" ? c.parity : "none",
        stopBits: c.stopBits === 2 ? 2 : 1,
        dtr: c.dtr !== false,
        autoReconnect: c.autoReconnect !== false,
      },
    };
  }
  if (v.transport === "tcp" && typeof v.host === "string" && v.host.trim() && intOk(v.port, 1, 65535)) return { transport: "tcp", host: v.host.trim(), port: v.port as number };
  if (v.transport === "udp" && typeof v.host === "string" && intOk(v.port, 0, 65535))
    return { transport: "udp", host: v.host.trim(), port: v.port as number, group: typeof v.group === "string" ? v.group.trim() : "" };
  return null;
}

/** 알림·사건 줄에 보일 짧은 모양(«COM3 9600» · «TCP 10.0.0.5:5000» · «UDP :5005») */
export const lastOkText = (l: LastOk) => (l.transport === "serial" ? `${l.cfg.port} ${l.cfg.baud}` : l.transport === "tcp" ? `TCP ${l.host.includes(":") ? `[${l.host}]` : l.host}:${l.port}` : `UDP :${l.port}`);
