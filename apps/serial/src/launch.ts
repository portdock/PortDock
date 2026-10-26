// 명령줄 인자(0.3.0) — 연결 설정만 채운다(자동 연결은 하지 않는다 — 사용자가 «연결» 을 누른다).
//   --port <COMx>   그 포트
//   --baud <n>      속도(50~20000000)
// 잘못된 것은 bad 에 모아 화면이 한 줄로 알린다. 시험: node --test apps/serial/src/launch.test.ts
import { comPort, intIn, parseArgs } from "../../../shared/launchArgs.ts";

export interface SerialLaunch {
  port?: string;
  baud?: number;
  /** 무시한 인자(받은 모양 그대로, «--baud 10» 처럼 이름·값을 붙여서) */
  bad: string[];
}

const SPEC = { port: "value", baud: "value" } as const;

/** argv: 실행 파일 이름 뺀 인자 */
export function serialLaunch(argv: readonly string[]): SerialLaunch {
  const { opts, bad } = parseArgs(argv, SPEC);
  const out: SerialLaunch = { bad: [...bad] };
  const port = opts.get("port");
  if (port !== undefined) {
    const p = comPort(port);
    if (p) out.port = p;
    else out.bad.push(`--port ${port}`);
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
export const launchFilled = (l: SerialLaunch) => l.port !== undefined || l.baud !== undefined;
