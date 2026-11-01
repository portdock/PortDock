// 웹 도구 «Modbus 연습장» — 신입·교육용 문제를 시드로 만들고 채점한다. 같은 시드 → 같은 문제(modbusQuiz.test.ts).
// 프레임은 checksum.ts(CRC16), 예외 코드 뜻은 modbusDecode.ts(EXCEPTIONS), 실수 순서는 modbusFloat.ts 를 그대로 쓴다.
// 링크는 실제 가이드 slug·웹 도구 경로만(시험이 확인). 문구는 t(ko, en) — 추가 언어는 영어 문장으로 찾는다(lib/tr.ts).
import { crc16Modbus, hex, parseHex } from "./checksum.ts";
import { msg, tx, type Lang } from "./tr.ts";
import { EXCEPTIONS, funcName } from "./modbusDecode.ts";
import { encodeRegisters, decodeRegisters, formatFloat, regHex, type ByteOrder } from "./modbusFloat.ts";

export type Kind = "readPick" | "readWrite" | "respValue" | "exception" | "crcOrder" | "floatOrder";
export const KINDS: Kind[] = ["readPick", "readWrite", "respValue", "exception", "crcOrder", "floatOrder"];

export const KIND_NAMES: Record<Kind, { ko: string; en: string }> = {
  readPick: { ko: "읽기 요청 고르기", en: "Pick the read request" },
  readWrite: { ko: "읽기 요청 쓰기", en: "Write the read request" },
  respValue: { ko: "응답에서 값 찾기", en: "Find a value in a response" },
  exception: { ko: "예외 응답의 뜻", en: "Meaning of an exception" },
  crcOrder: { ko: "CRC 바이트 순서", en: "CRC byte order" },
  floatOrder: { ko: "실수 워드 순서", en: "Float word order" },
};

export interface Question {
  kind: Kind;
  seed: number;
  prompt: string;
  /** 문제에 보여 줄 프레임·레지스터(고정폭) */
  shown?: string;
  /** 객관식이면 보기, 주관식이면 없음 */
  choices?: string[];
  /** 객관식 정답 번호 */
  answerIndex?: number;
  /** 주관식 정답(보여 줄 모양) */
  answer: string;
  /** 주관식 입력 칸 안내 */
  placeholder?: string;
  explain: string;
  /** 가이드 slug(guides/<slug>/) */
  guide: string;
  /** 이어 볼 웹 도구 경로 */
  tool: string;
}

/** mulberry32 — 작은 시드 난수. 같은 시드면 같은 수열 */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rand = ReturnType<typeof rng>;
const int = (r: Rand, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T>(r: Rand, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
function shuffle<T>(r: Rand, xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const h2 = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");
const withCrc = (b: number[]) => {
  const c = crc16Modbus(b);
  return [...b, c & 0xff, c >> 8];
};

/** 정답 + 오답 보기를 섞는다(같은 글은 한 번만) */
function choicesOf(r: Rand, right: string, wrong: string[]): { choices: string[]; answerIndex: number } {
  const uniq = [...new Set(wrong.filter((w) => w !== right))].slice(0, 3);
  const choices = shuffle(r, [right, ...uniq]);
  return { choices, answerIndex: choices.indexOf(right) };
}

function readRequest(r: Rand, lang: Lang, kind: "readPick" | "readWrite", seed: number): Question {
  const t = (ko: string, en: string) => msg(lang, ko, en);
  const unit = int(r, 1, 20);
  const holding = r() < 0.7;
  const fc = holding ? 0x03 : 0x04;
  const prefix = holding ? 4 : 3;
  const start = int(r, 0, 99);
  const count = int(r, 1, 10);
  const first = `${prefix}${String(start + 1).padStart(4, "0")}`;
  const last = `${prefix}${String(start + count).padStart(4, "0")}`;
  const frame = withCrc([unit, fc, start >> 8, start & 0xff, 0, count]);
  const range = count === 1 ? first : `${first}~${last}`;
  const space = holding ? t("보유 레지스터", "holding registers") : t("입력 레지스터", "input registers");
  const explain = t(
    `국번 ${h2(unit)}, 함수 ${h2(fc)}(${funcName(fc, "ko")}), 시작 주소는 0 기준이라 ${first} → ${start} = ${h2(start >> 8)} ${h2(start & 0xff)}, 개수 ${count} = 00 ${h2(count)}, 끝 2바이트는 CRC16(낮은 바이트 먼저) ${hex(frame.slice(-2))} 입니다.`,
    `Slave ${h2(unit)}, function ${h2(fc)} (${funcName(fc, "en")}); the address is 0-based so ${first} → ${start} = ${h2(start >> 8)} ${h2(start & 0xff)}; quantity ${count} = 00 ${h2(count)}; the last 2 bytes are the CRC16 (low byte first) ${hex(frame.slice(-2))}.`,
  );
  const prompt = t(`국번 ${unit} 장비의 ${space} ${range} (${count}개)를 읽는 Modbus RTU 요청은?`, `Which Modbus RTU request reads ${space} ${range} (${count} registers) from slave ${unit}?`);
  if (kind === "readWrite")
    return {
      kind,
      seed,
      prompt: t(`국번 ${unit} 장비의 ${space} ${range} (${count}개)를 읽는 Modbus RTU 요청을 CRC 까지 HEX 로 쓰세요.`, `Write the Modbus RTU request, CRC included, in HEX that reads ${space} ${range} (${count} registers) from slave ${unit}.`),
      answer: hex(frame),
      placeholder: "01 03 00 00 00 0A C5 CD",
      explain,
      guide: "modbus-rtu-frame",
      tool: "tools/modbus/",
    };
  const offByOne = withCrc([unit, fc, (start + 1) >> 8, (start + 1) & 0xff, 0, count]);
  const swapped = [...frame.slice(0, -2), frame[7], frame[6]];
  const otherFc = withCrc([unit, holding ? 0x04 : 0x03, start >> 8, start & 0xff, 0, count]);
  const qtyBytes = withCrc([unit, fc, start >> 8, start & 0xff, 0, count * 2]);
  const wrong = [hex(offByOne), hex(swapped), hex(otherFc), hex(qtyBytes)];
  return {
    kind,
    seed,
    prompt,
    ...choicesOf(r, hex(frame), shuffle(r, wrong)),
    answer: hex(frame),
    explain,
    guide: "modbus-address-notation",
    tool: "tools/modbus/",
  };
}

function respValue(r: Rand, lang: Lang, seed: number): Question {
  const t = (ko: string, en: string) => msg(lang, ko, en);
  const unit = int(r, 1, 20);
  const start = int(r, 0, 49);
  const count = int(r, 3, 6);
  const values = Array.from({ length: count }, () => (r() < 0.3 ? int(r, 0, 65535) : int(r, 0, 1500)));
  const k = int(r, 1, count - 1);
  const data = values.flatMap((v) => [v >> 8, v & 0xff]);
  const frame = withCrc([unit, 0x03, count * 2, ...data]);
  const at = (i: number) => `4${String(start + 1 + i).padStart(4, "0")}`;
  const v = values[k];
  const off = 3 + k * 2;
  return {
    kind: "respValue",
    seed,
    prompt: t(`국번 ${unit} 에 ${at(0)} 부터 ${count}개를 읽는 요청을 보냈고 아래 응답이 왔습니다. ${at(k)} 의 값(부호 없는 10진)은?`, `You asked slave ${unit} for ${count} registers starting at ${at(0)} and got the response below. What is the value of ${at(k)} (unsigned decimal)?`),
    shown: hex(frame),
    answer: String(v),
    placeholder: "1234",
    explain: t(
      `국번 ${h2(unit)}·함수 03·바이트 수 ${h2(count * 2)}(=${count * 2}) 다음부터 레지스터마다 2바이트(높은 바이트 먼저)입니다. ${at(k)} 은 ${k + 1}번째라 ${off + 1}~${off + 2}번째 바이트 ${h2(v >> 8)} ${h2(v & 0xff)} = 0x${h2(v >> 8)}${h2(v & 0xff)} = ${v}.`,
      `After slave ${h2(unit)}, function 03 and byte count ${h2(count * 2)} (= ${count * 2}) each register takes 2 bytes, high byte first. ${at(k)} is register #${k + 1}, so bytes ${off + 1}–${off + 2}: ${h2(v >> 8)} ${h2(v & 0xff)} = 0x${h2(v >> 8)}${h2(v & 0xff)} = ${v}.`,
    ),
    guide: "modbus-rtu-frame",
    tool: "tools/modbus-decoder/",
  };
}

const EXC_CODES = [0x01, 0x02, 0x03, 0x04, 0x06, 0x0b];

function exception(r: Rand, lang: Lang, seed: number): Question {
  const t = (ko: string, en: string) => msg(lang, ko, en);
  const unit = int(r, 1, 20);
  const fc = pick(r, [0x01, 0x03, 0x04, 0x06, 0x10]);
  const code = pick(r, EXC_CODES);
  const frame = withCrc([unit, fc | 0x80, code]);
  const label = (c: number) => `${h2(c)} ${EXCEPTIONS[c].name} — ${tx(EXCEPTIONS[c], lang)}`;
  const right = label(code);
  const wrong = shuffle(r, EXC_CODES.filter((c) => c !== code)).map(label);
  return {
    kind: "exception",
    seed,
    prompt: t(`이 응답(${h2(fc | 0x80)} ${h2(code)})은 무슨 뜻일까요?`, `What does this response (${h2(fc | 0x80)} ${h2(code)}) mean?`),
    shown: hex(frame),
    ...choicesOf(r, right, wrong),
    answer: right,
    explain: t(
      `함수 코드에 80 이 더해진 ${h2(fc | 0x80)} 은 «함수 ${h2(fc)} 에 대한 예외 응답», 다음 바이트 ${h2(code)} 가 예외 코드입니다: ${EXCEPTIONS[code].name}. ${EXCEPTIONS[code].ko}`,
      `${h2(fc | 0x80)} is function ${h2(fc)} with 0x80 added — an exception response; the next byte ${h2(code)} is the exception code: ${EXCEPTIONS[code].name}. ${EXCEPTIONS[code].en}`,
    ),
    guide: "modbus-exception-codes",
    tool: "tools/modbus-decoder/",
  };
}

function crcOrder(r: Rand, lang: Lang, seed: number): Question {
  const t = (ko: string, en: string) => msg(lang, ko, en);
  const unit = int(r, 1, 20);
  const fc = pick(r, [0x03, 0x04, 0x06]);
  const a = int(r, 0, 200);
  const v = int(r, 1, 100);
  const body = [unit, fc, a >> 8, a & 0xff, 0, v];
  const c = crc16Modbus(body);
  const hi = c >> 8;
  const lo = c & 0xff;
  const val = `0x${h2(hi)}${h2(lo)}`;
  const right = `${h2(lo)} ${h2(hi)}`;
  // 높은·낮은 바이트가 같아도 보기가 겹치지 않게 한 바이트를 뒤집은 오답을 함께 둔다
  const wrong = [`${h2(hi)} ${h2(lo)}`, `${h2(lo ^ 0xff)} ${h2(hi)}`, `${h2(hi)} ${h2(lo ^ 0xff)}`, `${h2(lo)} ${h2(hi ^ 0xff)}`];
  return {
    kind: "crcOrder",
    seed,
    prompt: t(`아래 바이트의 CRC16 Modbus 값은 ${val} 입니다. 프레임 끝에 붙는 두 바이트는?`, `The CRC16 Modbus of the bytes below is ${val}. Which two bytes go at the end of the frame?`),
    shown: hex(body),
    ...choicesOf(r, right, wrong),
    answer: right,
    explain: t(
      `Modbus RTU 의 CRC 는 레지스터 값과 달리 낮은 바이트가 먼저 갑니다: ${val} → ${h2(lo)} ${h2(hi)}. 그래서 «01 03 00 00 00 0A» 의 CRC 0xCDC5 는 «C5 CD» 로 붙습니다.`,
      `Unlike register values, the Modbus RTU CRC is sent low byte first: ${val} → ${h2(lo)} ${h2(hi)}. That is why the CRC 0xCDC5 of «01 03 00 00 00 0A» is appended as «C5 CD».`,
    ),
    guide: "modbus-rtu-frame",
    tool: "tools/checksum/",
  };
}

const FLOATS = [1.5, -2.25, 12.5, 100.25, 0.75, 230.5, -40.125, 3.375, 50.0625, 1013.25, 7.875, 65.5];

function floatOrder(r: Rand, lang: Lang, seed: number): Question {
  const t = (ko: string, en: string) => msg(lang, ko, en);
  const v = pick(r, FLOATS);
  const order: ByteOrder = r() < 0.5 ? "ABCD" : "CDAB";
  const regs = encodeRegisters(String(v), "float32", order, "en");
  const read = (o: ByteOrder) => formatFloat(decodeRegisters(regs, o).float, 4);
  const right = read(order);
  const wrong = (["ABCD", "CDAB", "BADC", "DCBA"] as ByteOrder[]).filter((o) => o !== order).map(read);
  // 다른 순서로 읽은 값이 정답과 같으면(드묾) 부호를 바꾼 값으로 채운다
  wrong.push(formatFloat(-v, 4), formatFloat(v * 2, 4));
  const label = order === "ABCD" ? t("ABCD(높은 워드 먼저)", "ABCD (high word first)") : t("CDAB(낮은 워드 먼저, 워드 스왑)", "CDAB (low word first, word swap)");
  return {
    kind: "floatOrder",
    seed,
    prompt: t(`장비 매뉴얼에 float32 를 ${label} 순서로 보낸다고 되어 있습니다. 두 레지스터 값이 아래와 같으면 실제 값은?`, `The device manual says float32 values are sent in ${label} order. With the two registers below, what is the value?`),
    shown: regHex(regs),
    ...choicesOf(r, right, wrong),
    answer: right,
    explain:
      order === "ABCD"
        ? t(
            `ABCD 는 첫 레지스터가 높은 워드라 ${regHex(regs).replace(" ", "")} 을 그대로 IEEE 754 float32 로 읽습니다 = ${right}. 순서를 CDAB 로 잘못 잡으면 ${read("CDAB")} 처럼 엉뚱한 값이 나옵니다.`,
            `ABCD means the first register is the high word, so read ${regHex(regs).replace(" ", "")} as IEEE 754 float32 = ${right}. Taking it as CDAB gives a nonsense value such as ${read("CDAB")}.`,
          )
        : t(
            `CDAB 는 첫 레지스터가 낮은 워드라 두 레지스터를 바꿔 ${regHex([regs[1], regs[0]]).replace(" ", "")} 을 float32 로 읽습니다 = ${right}. 그대로(ABCD) 읽으면 ${read("ABCD")} 처럼 엉뚱한 값이 나옵니다.`,
            `CDAB means the first register is the low word, so swap them and read ${regHex([regs[1], regs[0]]).replace(" ", "")} as float32 = ${right}. Reading it as-is (ABCD) gives a nonsense value such as ${read("ABCD")}.`,
          ),
    guide: "modbus-float-word-order",
    tool: "tools/modbus-float/",
  };
}

/** 시드 하나 → 문제 하나. kind 를 주지 않으면 시드로 고른다 */
export function makeQuestion(seed: number, lang: Lang = "ko", kind?: Kind): Question {
  const r = rng(seed);
  const k = kind ?? KINDS[Math.floor(r() * KINDS.length)];
  switch (k) {
    case "readPick":
    case "readWrite":
      return readRequest(r, lang, k, seed);
    case "respValue":
      return respValue(r, lang, seed);
    case "exception":
      return exception(r, lang, seed);
    case "crcOrder":
      return crcOrder(r, lang, seed);
    case "floatOrder":
      return floatOrder(r, lang, seed);
  }
}

/** 주관식 숫자 — 10진, 0x HEX, 끝 h 도 받는다 */
function parseNumber(s: string): number | null {
  const x = s.trim().replace(/[\s_,]/g, "");
  if (/^\d+$/.test(x)) return Number(x);
  if (/^0x[0-9a-f]+$/i.test(x)) return parseInt(x.slice(2), 16);
  if (/^[0-9a-f]+h$/i.test(x)) return parseInt(x.slice(0, -1), 16);
  return null;
}

/** 채점 — 객관식은 보기 번호, 주관식은 입력 글 */
export function grade(q: Question, given: number | string): boolean {
  if (q.choices) return typeof given === "number" ? given === q.answerIndex : given === q.answer;
  const s = String(given);
  if (q.kind === "respValue") return parseNumber(s) === Number(q.answer);
  if (q.kind === "readWrite") {
    try {
      return hex(parseHex(s)) === q.answer;
    } catch {
      return false;
    }
  }
  return s.trim() === q.answer;
}

/** 점수·연속 정답 기록 */
export interface Score {
  tried: number;
  right: number;
  streak: number;
  best: number;
}
export const emptyScore = (): Score => ({ tried: 0, right: 0, streak: 0, best: 0 });
export function addResult(s: Score, ok: boolean): Score {
  const streak = ok ? s.streak + 1 : 0;
  return { tried: s.tried + 1, right: s.right + (ok ? 1 : 0), streak, best: Math.max(s.best, streak) };
}
/** 저장된 글 → 점수(깨졌으면 빈 점수) */
export function parseScore(text: string | null): Score {
  if (!text) return emptyScore();
  try {
    const o = JSON.parse(text);
    const n = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : 0);
    const s = { tried: n(o.tried), right: n(o.right), streak: n(o.streak), best: n(o.best) };
    if (s.right > s.tried) return emptyScore();
    return s;
  } catch {
    return emptyScore();
  }
}
