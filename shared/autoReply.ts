// 자동응답 규칙 — 모양(백엔드 autoreply::RuleSpec 과 같은 JSON)과 백엔드 명령. Simulator·Serial·TCP·UDP 공통.
// 백엔드 명령은 autoReplyApi.ts. 여기는 화면 없이 도는 것만(node --test shared/autoReply.test.ts).
import type { ChecksumKind } from "./format";

export type TextMode = "hex" | "ascii";

/** 응답 하나(본문 + 체크섬 + 줄 끝). 본문에 {req 0..1}·{counter}·{crc …} 같은 자리를 쓸 수 있다 */
export interface ReplySpec {
  text: string;
  mode: TextMode;
  checksum: ChecksumKind | null;
  suffix: string;
}

export interface AutoRule {
  name: string;
  enabled: boolean;
  pattern: string;
  patternMode: TextMode;
  kind: "exact" | "contains";
  reply: ReplySpec;
  delayMs: number;
  /** 지연 범위 끝(ms) — delayMs 보다 크면 그 사이 무작위 */
  delayMaxMs?: number;
  /** N번째마다 무응답(0 = 끔) */
  dropEvery?: number;
  /** 이 확률(%)로 무응답 */
  dropPct?: number;
  /** 다른 응답들 — reply 다음으로 돌아가며 */
  moreReplies?: ReplySpec[];
  replyOrder?: "sequence" | "random";
  /** 화면 미리보기용 예시 요청(패턴 방식으로) — 백엔드는 읽지 않는다 */
  sample?: string;
}

export interface MatchOptions {
  stripTerminator: boolean;
  logNoMatch: boolean;
}

export interface SetRulesResult {
  active: number;
  errors: { index: number; name: string; message: string }[];
}

export interface RulePreview {
  request: number[];
  matches: boolean | null;
  replies: { bytes?: number[]; error?: string }[];
  dynamic: boolean;
}

/** 체크섬 «crc»(사용자 정의)는 규칙에서 쓰지 않는다 — 백엔드가 매개변수 없는 «crc» 를 읽지 못한다 */
const wireReply = (r: ReplySpec) => ({ text: r.text, mode: r.mode, checksum: r.checksum === "crc" ? null : r.checksum, suffix: r.suffix ?? "" });

/** 백엔드로 보낼 모양 — 빈 칸은 기본값으로, 화면 전용 칸(sample)은 뺀다 */
export function ruleToWire(r: AutoRule) {
  return {
    name: r.name,
    enabled: r.enabled,
    pattern: r.pattern,
    patternMode: r.patternMode,
    kind: r.kind,
    reply: wireReply(r.reply),
    delayMs: r.delayMs,
    delayMaxMs: r.delayMaxMs ?? 0,
    dropEvery: r.dropEvery ?? 0,
    dropPct: r.dropPct ?? 0,
    moreReplies: (r.moreReplies ?? []).map(wireReply),
    replyOrder: r.replyOrder ?? "sequence",
  };
}

export const blankRule = (n: number): AutoRule => ({
  name: `rule ${n}`,
  enabled: true,
  pattern: "",
  patternMode: "hex",
  kind: "exact",
  reply: { text: "", mode: "hex", checksum: null, suffix: "" },
  delayMs: 0,
});

/** 저장해 둔(또는 불러온) 규칙 하나가 쓸 만한 모양인지 — 새 칸은 없어도 된다 */
export function validRule(r: unknown): r is AutoRule {
  const x = r as AutoRule;
  const reply = (s: ReplySpec | undefined) => !!s && typeof s.text === "string" && (s.mode === "hex" || s.mode === "ascii");
  return (
    !!x &&
    typeof x.name === "string" &&
    typeof x.enabled === "boolean" &&
    typeof x.pattern === "string" &&
    (x.patternMode === "hex" || x.patternMode === "ascii") &&
    (x.kind === "exact" || x.kind === "contains") &&
    reply(x.reply) &&
    Number.isInteger(x.delayMs) &&
    x.delayMs >= 0 &&
    (x.moreReplies === undefined || (Array.isArray(x.moreReplies) && x.moreReplies.every(reply)))
  );
}

/** 불러온 규칙의 빠진 칸 채우기(예전 파일 호환) */
export function normalizeRule(r: AutoRule): AutoRule {
  const fix = (s: ReplySpec): ReplySpec => ({ ...s, checksum: s.checksum ?? null, suffix: s.suffix ?? "" });
  return { ...r, reply: fix(r.reply), moreReplies: r.moreReplies?.map(fix) };
}

/** 규칙에 켜 둔 장애 흉내·응답 돌리기 요약(카드 머리 표시용) */
export function faultSummary(r: AutoRule): { delay: [number, number] | null; every: number; pct: number; replies: number; random: boolean } {
  const max = r.delayMaxMs ?? 0;
  return {
    delay: max > r.delayMs ? [r.delayMs, max] : null,
    every: r.dropEvery ?? 0,
    pct: r.dropPct ?? 0,
    replies: 1 + (r.moreReplies?.length ?? 0),
    random: r.replyOrder === "random",
  };
}
