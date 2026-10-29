// 명령줄 인자 — PLC Simulator 는 «--auto»(켤 때 마지막으로 시작에 성공한 설정으로 바로 시작)만 읽는다.
// 다른 인자는 bad 에 모아 화면이 «무시한 명령줄 인자» 로 알린다. 시험: node --test apps/plc-simulator/src/launch.test.ts
import { parseArgs } from "../../../shared/launchArgs.ts";

export interface PlcLaunch {
  auto: boolean;
  bad: string[];
}

const SPEC = { auto: "flag" } as const;

export function plcLaunch(argv: readonly string[]): PlcLaunch {
  const { opts, bad } = parseArgs(argv, SPEC);
  return { auto: opts.has("auto"), bad: [...bad] };
}
