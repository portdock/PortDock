// 명령줄 인자(0.3.0) — 주소·포트만 채운다(자동 접속은 하지 않는다 — 사용자가 «접속» 을 누른다).
//   --connect <host:port>   클라이언트 방식으로, 장비 주소·포트(포트는 꼭 — 기본 포트를 짐작하지 않는다)
// 잘못된 것은 bad 에 모아 화면이 한 줄로 알린다. 시험: node --test apps/tcp/src/launch.test.ts
import { hostPort, parseArgs } from "../../../shared/launchArgs.ts";

export interface TcpLaunch {
  host?: string;
  port?: number;
  /** 무시한 인자(받은 모양 그대로, «--connect 1.2.3.4» 처럼 이름·값을 붙여서) */
  bad: string[];
}

const SPEC = { connect: "value" } as const;

/** argv: 실행 파일 이름 뺀 인자 */
export function tcpLaunch(argv: readonly string[]): TcpLaunch {
  const { opts, bad } = parseArgs(argv, SPEC);
  const out: TcpLaunch = { bad: [...bad] };
  const c = opts.get("connect");
  if (c !== undefined) {
    // 포트가 없으면 0 이 돌아온다(적힌 포트는 1~65535 만 받으므로 0 은 «빠짐» 뜻)
    const hp = hostPort(c, 0);
    if (hp && hp.port > 0) Object.assign(out, { host: hp.host, port: hp.port });
    else out.bad.push(`--connect ${c}`);
  }
  return out;
}
