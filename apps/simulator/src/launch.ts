// 명령줄 인자(0.3.0) — 지금은 «--auto»(켤 때 마지막으로 시작에 성공한 설정으로 바로 시작)만 읽는다.
// 그 밖의 인자는 bad 에 모아 화면이 한 줄로 알린다. 시험: node --test apps/simulator/src/launch.test.ts
import { parseArgs } from "../../../shared/launchArgs.ts";

export interface SimLaunch {
  /** --auto 가 있었는지 */
  auto: boolean;
  /** 무시한 인자(받은 모양 그대로) */
  bad: string[];
}

/** argv: 실행 파일 이름 뺀 인자 */
export function simLaunch(argv: readonly string[]): SimLaunch {
  const { opts, bad } = parseArgs(argv, { auto: "flag" });
  return { auto: opts.has("auto"), bad };
}
