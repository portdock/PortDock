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
  /**
   * ASCII 패턴의 ?·* 를 와일드카드로 읽을지(HEX 의 ??·** 는 늘 와일드카드).
   * 없으면 켜짐 — 예전에 저장한 규칙은 동작이 바뀌지 않는다. 새 규칙은 끔(글자 그대로, SCPI `*IDN?` 가 `XIDN!` 에 맞지 않게)
   */
  wild?: boolean;
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
    wild: r.wild ?? true,
    reply: wireReply(r.reply),
    delayMs: r.delayMs,
    delayMaxMs: r.delayMaxMs ?? 0,
    dropEvery: r.dropEvery ?? 0,
    dropPct: r.dropPct ?? 0,
    moreReplies: (r.moreReplies ?? []).map(wireReply),
    replyOrder: r.replyOrder ?? "sequence",
  };
}

/**
 * 새 규칙. prev(직전 규칙)가 있으면 그 방식 — 받기 HEX/ASCII·정확히/포함, 응답 HEX/ASCII·체크섬·줄 끝 — 을 물려받는다
 * (텍스트 장비 규칙을 이어 만들 때 고르기 네 개를 매번 바꾸지 않게). 패턴·응답 글자와 장애 흉내는 물려받지 않는다.
 * ASCII 와일드카드는 «방식» 이 아니라 패턴마다의 뜻이라 물려받지 않고 늘 끔(글자 그대로)으로 시작한다
 */
export const blankRule = (n: number, prev?: AutoRule): AutoRule => ({
  name: `rule ${n}`,
  enabled: true,
  pattern: "",
  patternMode: prev?.patternMode ?? "hex",
  kind: prev?.kind ?? "exact",
  wild: false,
  reply: { text: "", mode: prev?.reply.mode ?? "hex", checksum: prev?.reply.checksum ?? null, suffix: prev?.reply.suffix ?? "" },
  delayMs: 0,
});

/** ASCII 패턴에 와일드카드로 읽히는 ?·* 가 있는지(켜진 규칙만) — «글자 그대로 비교하려면 끄세요» 알림줄용 */
export const wildChars = (r: AutoRule) => r.patternMode === "ascii" && (r.wild ?? true) && /[?*]/.test(r.pattern);

export type ExampleKind = "modbus" | "scpi" | "echo";

/** 빈 화면의 예제 규칙 — 누르면 하나를 채워 넣는다. sample 은 «자세히» 미리보기용 */
export function exampleRule(kind: ExampleKind): AutoRule {
  const base = { enabled: true, kind: "exact" as const, delayMs: 0 };
  if (kind === "modbus")
    return {
      ...base,
      name: "Modbus RTU 03",
      pattern: "01 03 ?? ?? 00 01 **",
      patternMode: "hex",
      wild: false,
      reply: { text: "01 03 02 00 64", mode: "hex", checksum: "crc16-modbus", suffix: "" },
      sample: "01 03 00 00 00 01 84 0A",
    };
  if (kind === "scpi")
    return {
      ...base,
      name: "SCPI *IDN?",
      pattern: "*IDN?",
      patternMode: "ascii",
      wild: false,
      reply: { text: "PORTDOCK,SIM,1", mode: "ascii", checksum: null, suffix: "\\r\\n" },
      sample: "*IDN?",
    };
  return {
    ...base,
    name: "echo",
    pattern: "**",
    patternMode: "hex",
    wild: false,
    reply: { text: "{req}", mode: "hex", checksum: null, suffix: "" },
    sample: "01 02 03",
  };
}

/** CRC16 Modbus(다항식 0xA001 반사) — 받은 요청이 Modbus RTU 프레임인지 볼 때만 쓴다 */
function crc16Modbus(b: number[]) {
  let c = 0xffff;
  for (const x of b) {
    c ^= x;
    for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xa001 : c >>> 1;
  }
  return c;
}

const hex2 = (b: number[]) => b.map((x) => x.toString(16).toUpperCase().padStart(2, "0")).join(" ");

/**
 * 통신 기록의 받은 요청으로 새 규칙 만들기(«이 요청으로 규칙 만들기»). 응답 칸은 비워 둔다.
 * - 끝 CR·LF 를 뺀 나머지가 모두 보이는 글자면 ASCII·정확히·와일드카드 끔(«끝 문자 떼고 비교» 기본과 맞게 CR·LF 는 뺀다), 응답은 ASCII + 같은 줄 끝
 * - Modbus RTU(끝 2바이트가 맞는 CRC16)면 HEX 로, CRC 자리는 ** (요청마다 같지만 손으로 고칠 때 다시 계산하지 않게), 응답 체크섬 CRC16 Modbus
 * - Modbus TCP(MBAP 머리·길이가 맞음)면 트랜잭션 ID 2바이트는 ?? ??(요청마다 바뀐다)
 * - 그 밖은 HEX 그대로
 */
export function ruleFromRequest(bytes: number[], n: number): AutoRule {
  const base = { ...blankRule(n), kind: "exact" as const };
  let end = bytes.length;
  while (end > 0 && (bytes[end - 1] === 0x0d || bytes[end - 1] === 0x0a)) end--;
  const body = bytes.slice(0, end);
  if (body.length > 0 && body.every((b) => b >= 0x20 && b < 0x7f)) {
    const tail = bytes.slice(end);
    const suffix = tail.length === 0 ? "" : tail.map((b) => (b === 0x0d ? "\\r" : "\\n")).join("");
    const okSuffix = ["", "\\r", "\\n", "\\r\\n"].includes(suffix) ? suffix : "\\r\\n";
    // 이스케이프로 읽히는 \ 는 \\ 로
    const text = String.fromCharCode(...body).replace(/\\/g, "\\\\");
    return { ...base, patternMode: "ascii", wild: false, pattern: text, sample: text, reply: { text: "", mode: "ascii", checksum: null, suffix: okSuffix } };
  }
  if (bytes.length >= 4) {
    const crc = crc16Modbus(bytes.slice(0, -2));
    if (bytes[bytes.length - 2] === (crc & 0xff) && bytes[bytes.length - 1] === crc >> 8)
      return { ...base, pattern: `${hex2(bytes.slice(0, -2))} **`, sample: hex2(bytes), reply: { text: "", mode: "hex", checksum: "crc16-modbus", suffix: "" } };
  }
  if (bytes.length >= 8 && bytes[2] === 0 && bytes[3] === 0 && ((bytes[4] << 8) | bytes[5]) === bytes.length - 6)
    return { ...base, pattern: `?? ?? ${hex2(bytes.slice(2))}`, sample: hex2(bytes), reply: { text: "", mode: "hex", checksum: null, suffix: "" } };
  return { ...base, pattern: hex2(bytes), sample: hex2(bytes) };
}

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
    (x.wild === undefined || typeof x.wild === "boolean") &&
    reply(x.reply) &&
    Number.isInteger(x.delayMs) &&
    x.delayMs >= 0 &&
    (x.moreReplies === undefined || (Array.isArray(x.moreReplies) && x.moreReplies.every(reply)))
  );
}

/** 불러온 규칙의 빠진 칸 채우기(예전 파일 호환) */
export function normalizeRule(r: AutoRule): AutoRule {
  const fix = (s: ReplySpec): ReplySpec => ({ ...s, checksum: s.checksum ?? null, suffix: s.suffix ?? "" });
  // wild 칸이 없는 예전 규칙은 와일드카드 켜짐(예전 동작 그대로)
  return { ...r, wild: r.wild ?? true, reply: fix(r.reply), moreReplies: r.moreReplies?.map(fix) };
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
