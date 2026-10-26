// 명령줄 인자(0.2.0) — 연결 설정만 채운다(자동 연결은 하지 않는다 — 사용자가 «연결» 을 누른다).
//   --tcp <host[:port]>   Modbus TCP 로, 장비 주소·포트(없으면 502)
//   --rtu <COMx>          시리얼(RTU)로, 그 포트
//   --baud <n>            시리얼 속도(50~20000000)
//   --unit <n>            고른 표의 국번(TCP 0~255, RTU 1~255 — 화면 국번 칸과 같은 범위)
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
  /** 무시한 인자(받은 모양 그대로, «--unit 999» 처럼 이름·값을 붙여서) */
  bad: string[];
}

const SPEC = { tcp: "value", rtu: "value", baud: "value", unit: "value" } as const;

/** argv: 실행 파일 이름 뺀 인자. wire: 지금 연결 방식(국번 범위 — --tcp·--rtu 가 있으면 그쪽) */
export function masterLaunch(argv: readonly string[], wire: "tcp" | "rtu"): MasterLaunch {
  const { opts, bad } = parseArgs(argv, SPEC);
  const out: MasterLaunch = { bad: [...bad] };
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
