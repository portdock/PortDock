// 웹 도구 «바코드 스캐너 테스트» 의 풀이 — 키보드처럼 들어오는(키보드 웨지) 스캐너의 키 입력을 받아
// 보이지 않는 문자(Enter·Tab·GS…), 글자 사이 간격(스캐너 vs 손 입력), 한/영 상태로 깨진 글자, Caps Lock 영향, GS1 AI 풀이를 낸다.
// 키 위치(KeyboardEvent.code)는 IME 가 한글이어도 그대로 오므로, 미국 배열 기준으로 «스캐너가 보내려던 글자» 를 되살릴 수 있다.

export interface KeyEv {
  /** performance.now() ms */
  t: number;
  key: string;
  code: string;
  shift: boolean;
  caps: boolean;
  ctrl: boolean;
  alt: boolean;
}

const CTRL_NAMES: Record<number, string> = {
  0: "NUL", 1: "SOH", 2: "STX", 3: "ETX", 4: "EOT", 5: "ENQ", 6: "ACK", 7: "BEL", 8: "BS", 9: "Tab", 10: "LF", 11: "VT", 12: "FF", 13: "CR",
  14: "SO", 15: "SI", 16: "DLE", 17: "DC1", 18: "DC2", 19: "DC3", 20: "DC4", 21: "NAK", 22: "SYN", 23: "ETB", 24: "CAN", 25: "EM", 26: "SUB",
  27: "ESC", 28: "FS", 29: "GS", 30: "RS", 31: "US", 127: "DEL",
};

/** 보이지 않는 글자를 ‹이름› 으로 — 화면 표시용 조각 목록 */
export function visible(s: string): { text: string; ctrl: boolean }[] {
  return [...s].map((c) => {
    const n = c.codePointAt(0)!;
    if (n in CTRL_NAMES) return { text: n === 13 ? "‹CR/Enter›" : `‹${CTRL_NAMES[n]}›`, ctrl: true };
    if (c === " ") return { text: "␠", ctrl: true };
    return { text: c, ctrl: false };
  });
}
export const visibleText = (s: string) => visible(s).map((p) => p.text).join("");

// 미국 배열 키 위치 → [보통, Shift]
const US: Record<string, [string, string]> = {
  Backquote: ["`", "~"], Minus: ["-", "_"], Equal: ["=", "+"], BracketLeft: ["[", "{"], BracketRight: ["]", "}"], Backslash: ["\\", "|"],
  Semicolon: [";", ":"], Quote: ["'", '"'], Comma: [",", "<"], Period: [".", ">"], Slash: ["/", "?"], Space: [" ", " "],
  IntlBackslash: ["\\", "|"], NumpadDecimal: [".", "."], NumpadDivide: ["/", "/"], NumpadMultiply: ["*", "*"], NumpadSubtract: ["-", "-"], NumpadAdd: ["+", "+"],
};
const SHIFT_DIGITS = ")!@#$%^&*(";
/** 키 위치(code)와 Shift 로 미국 배열의 글자 — 글쇠가 아니면 null. Caps Lock 은 보지 않는다(스캐너가 보내려던 글자) */
export function codeChar(code: string, shift: boolean): string | null {
  let m = code.match(/^Key([A-Z])$/);
  if (m) return shift ? m[1] : m[1].toLowerCase();
  m = code.match(/^Digit(\d)$/);
  if (m) return shift ? SHIFT_DIGITS[Number(m[1])] : m[1];
  m = code.match(/^Numpad(\d)$/);
  if (m) return m[1];
  const u = US[code];
  return u ? u[shift ? 1 : 0] : null;
}

const MODIFIERS = new Set(["Shift", "Control", "Alt", "AltGraph", "Meta", "CapsLock", "NumLock", "ScrollLock", "HangulMode", "HanjaMode", "KanaMode", "Lang1", "Lang2", "OS", "Fn"]);

export interface Tok {
  /** 받은 글자(제어 문자 포함). 글자가 아닌 키는 "" */
  ch: string;
  /** 키 위치로 되살린 글자 */
  intended: string;
  /** 글자가 아닌 키 이름(F1·ArrowUp …) */
  named?: string;
  /** IME(한글 등)가 가로챈 키(key = Process) */
  ime: boolean;
  /** 앞 키에서 걸린 ms(첫 키는 없음) */
  dt?: number;
  caps: boolean;
  shift: boolean;
}

/** keydown 하나 → 조각. 수식 키(Shift·Ctrl…)는 null */
export function keyToken(e: KeyEv): Omit<Tok, "dt"> | null {
  if (MODIFIERS.has(e.key)) return null;
  const base = { caps: e.caps, shift: e.shift, ime: false };
  if (e.key === "Enter" || e.code === "NumpadEnter") return { ...base, ch: "\r", intended: "\r" };
  if (e.key === "Tab") return { ...base, ch: "\t", intended: "\t" };
  if (e.key === "Escape") return { ...base, ch: "\x1b", intended: "\x1b" };
  if (e.key === "Backspace") return { ...base, ch: "\b", intended: "\b" };
  // Ctrl + 글쇠 → 제어 문자(Ctrl+] = GS 0x1D, Ctrl+^ = RS, Ctrl+D = EOT …) — GS1 스캐너가 FNC1 을 이렇게 보내기도 한다
  if (e.ctrl && !e.alt) {
    const c = codeChar(e.code, e.shift) ?? (e.key.length === 1 ? e.key : "");
    const up = c.toUpperCase();
    if (up.length === 1 && up >= "@" && up <= "_") {
      const ch = String.fromCharCode(up.charCodeAt(0) - 64);
      return { ...base, ch, intended: ch };
    }
    if (c === "6" && e.shift) return { ...base, ch: "\x1e", intended: "\x1e" };
  }
  const intended = codeChar(e.code, e.shift);
  if (e.key === "Process" || e.key === "Unidentified") return { ...base, ime: true, ch: "", intended: intended ?? "" };
  if ([...e.key].length === 1) return { ...base, ch: e.key, intended: intended ?? e.key };
  return { ...base, ch: "", intended: "", named: e.key };
}

/** 한글 2벌식 자판 — 자모 → 키(소문자, 쌍자음·ㅒ·ㅖ 는 Shift 대문자) */
const JAMO_KEY: Record<string, string> = {
  ㅂ: "q", ㅈ: "w", ㄷ: "e", ㄱ: "r", ㅅ: "t", ㅛ: "y", ㅕ: "u", ㅑ: "i", ㅐ: "o", ㅔ: "p",
  ㅁ: "a", ㄴ: "s", ㅇ: "d", ㄹ: "f", ㅎ: "g", ㅗ: "h", ㅓ: "j", ㅏ: "k", ㅣ: "l",
  ㅋ: "z", ㅌ: "x", ㅊ: "c", ㅍ: "v", ㅠ: "b", ㅜ: "n", ㅡ: "m",
  ㅃ: "Q", ㅉ: "W", ㄸ: "E", ㄲ: "R", ㅆ: "T", ㅒ: "O", ㅖ: "P",
  // 겹모음·겹받침은 두 키
  ㅘ: "hk", ㅙ: "ho", ㅚ: "hl", ㅝ: "nj", ㅞ: "np", ㅟ: "nl", ㅢ: "ml",
  ㄳ: "rt", ㄵ: "sw", ㄶ: "sg", ㄺ: "fr", ㄻ: "fa", ㄼ: "fq", ㄽ: "ft", ㄾ: "fx", ㄿ: "fv", ㅀ: "fg", ㅄ: "qt",
};
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

export const HANGUL_RE = /[ᄀ-ᇿㄱ-ㆎ가-힣]/;
/** 한글(자모·음절)을 2벌식 키로 되돌린다 — «ㅁㅠㅊ» · «뮻» → «abc». 대소문자는 대부분 되살릴 수 없다(Shift+A 도 ㅁ) */
export function hangulToKeys(s: string): string {
  let out = "";
  for (const c of s) {
    const n = c.charCodeAt(0);
    if (n >= 0xac00 && n <= 0xd7a3) {
      const i = n - 0xac00;
      const parts = [CHO[Math.floor(i / 588)], JUNG[Math.floor((i % 588) / 28)], JONG[i % 28]];
      out += parts.map((p) => (p ? (JAMO_KEY[p] ?? p) : "")).join("");
    } else out += JAMO_KEY[c] ?? c;
  }
  return out;
}

export interface ScanAnalysis {
  /** 받은 글자(입력 칸 값 + 끝 키) */
  received: string;
  /** 키 위치로 되살린 글자 */
  intended: string;
  keys: number;
  intervals: number[];
  median: number | null;
  max: number | null;
  /** 첫 키 → 끝 키 ms */
  span: number;
  verdict: "scanner" | "human" | "unclear" | "single";
  /** 끝 키(Enter·Tab·LF) — 없으면 null */
  terminator: string | null;
  hangul: boolean;
  /** Caps Lock 때문에 대소문자가 바뀐 글자 수 */
  capsFlipped: number;
  capsOn: boolean;
  named: string[];
}

export const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** 스캔 하나(끝 키까지의 keydown 목록)와 입력 칸이 받은 글(IME 가 조합한 한글 포함) → 풀이 */
export function analyzeScan(evs: KeyEv[], boxText?: string, opts = { scannerMs: 35, humanMs: 60 }): ScanAnalysis {
  const toks: Tok[] = [];
  let last: number | undefined;
  for (const e of evs) {
    const k = keyToken(e);
    if (!k) continue;
    toks.push({ ...k, dt: last === undefined ? undefined : e.t - last });
    last = e.t;
  }
  const endKeys = ["\r", "\t", "\n"];
  const lastTok = toks[toks.length - 1];
  const terminator = lastTok && endKeys.includes(lastTok.ch) ? lastTok.ch : null;
  const fromKeys = toks.map((t) => t.ch).join("");
  // IME 가 끼면 keydown 의 key 로는 글자를 알 수 없다 → 입력 칸 값(조합된 한글)을 받은 글자로
  const anyIme = toks.some((t) => t.ime);
  const received = boxText !== undefined && (anyIme || HANGUL_RE.test(boxText)) ? boxText + (terminator ?? "") : fromKeys;
  const intended = toks.map((t) => t.intended).join("");
  const intervals = toks.map((t) => t.dt).filter((d): d is number => d !== undefined);
  const md = median(intervals);
  const verdict = toks.length < 2 ? "single" : md! <= opts.scannerMs ? "scanner" : md! >= opts.humanMs ? "human" : "unclear";
  let capsFlipped = 0;
  for (const t of toks) if (!t.ime && t.ch.length === 1 && /[a-z]/i.test(t.ch) && t.intended && t.ch !== t.intended && t.ch.toLowerCase() === t.intended.toLowerCase()) capsFlipped++;
  return {
    received,
    intended,
    keys: toks.length,
    intervals,
    median: md,
    max: intervals.length ? Math.max(...intervals) : null,
    span: evs.length > 1 ? evs[evs.length - 1].t - evs[0].t : 0,
    verdict,
    terminator,
    hangul: anyIme || HANGUL_RE.test(received),
    capsFlipped,
    capsOn: toks.some((t) => t.caps),
    named: toks.filter((t) => t.named).map((t) => t.named!),
  };
}

/** 여러 스캔의 공통 접두·접미(두 번 이상 스캔했을 때만 뜻이 있다) */
export function commonAffix(texts: string[]): { prefix: string; suffix: string } {
  if (texts.length < 2) return { prefix: "", suffix: "" };
  let p = texts[0];
  for (const t of texts) while (!t.startsWith(p)) p = p.slice(0, -1);
  let s = texts[0];
  for (const t of texts) while (!t.endsWith(s)) s = s.slice(1);
  // 모두 같은 값을 여러 번 찍었으면 접두·접미를 따로 말할 수 없다
  if (texts.every((t) => t === texts[0])) return { prefix: "", suffix: "" };
  return { prefix: p, suffix: s };
}

// ---- GS1 Application Identifier(간단 풀이)
type L2 = { ko: string; en: string };
interface AiDef {
  ai: string;
  /** 고정 길이(AI 뺀 값) 또는 가변 최대 */
  fixed?: number;
  max?: number;
  name: L2;
  kind?: "date" | "gtin" | "sscc" | "decimal";
}
const AIS: AiDef[] = [
  { ai: "00", fixed: 18, name: { ko: "SSCC(물류 단위 번호)", en: "SSCC (serial shipping container code)" }, kind: "sscc" },
  { ai: "01", fixed: 14, name: { ko: "GTIN(상품 식별 코드)", en: "GTIN (global trade item number)" }, kind: "gtin" },
  { ai: "02", fixed: 14, name: { ko: "들어 있는 상품의 GTIN", en: "GTIN of contained items" }, kind: "gtin" },
  { ai: "10", max: 20, name: { ko: "배치·로트 번호", en: "Batch or lot number" } },
  { ai: "11", fixed: 6, name: { ko: "제조일", en: "Production date" }, kind: "date" },
  { ai: "12", fixed: 6, name: { ko: "지급 기한", en: "Due date" }, kind: "date" },
  { ai: "13", fixed: 6, name: { ko: "포장일", en: "Packaging date" }, kind: "date" },
  { ai: "15", fixed: 6, name: { ko: "품질 유지 기한(best before)", en: "Best before date" }, kind: "date" },
  { ai: "16", fixed: 6, name: { ko: "판매 기한", en: "Sell by date" }, kind: "date" },
  { ai: "17", fixed: 6, name: { ko: "유효 기한(expiry)", en: "Expiration date" }, kind: "date" },
  { ai: "20", fixed: 2, name: { ko: "변형 번호", en: "Internal product variant" } },
  { ai: "21", max: 20, name: { ko: "일련번호", en: "Serial number" } },
  { ai: "22", max: 20, name: { ko: "소비자 상품 변형", en: "Consumer product variant" } },
  { ai: "240", max: 30, name: { ko: "추가 상품 식별", en: "Additional product identification" } },
  { ai: "241", max: 30, name: { ko: "고객 부품 번호", en: "Customer part number" } },
  { ai: "30", max: 8, name: { ko: "수량(가변)", en: "Variable count" } },
  { ai: "37", max: 8, name: { ko: "들어 있는 상품 수", en: "Count of contained items" } },
  { ai: "400", max: 30, name: { ko: "고객 주문 번호", en: "Customer purchase order number" } },
  { ai: "410", fixed: 13, name: { ko: "배송지 GLN", en: "Ship to GLN" } },
  { ai: "414", fixed: 13, name: { ko: "위치 GLN", en: "Physical location GLN" } },
  ...[0, 1, 2, 3, 4, 5].map((d): AiDef => ({ ai: `310${d}`, fixed: 6, name: { ko: `순중량 kg (소수 ${d}자리)`, en: `Net weight, kg (${d} decimals)` }, kind: "decimal" })),
];

/** GS1 모듈로 10 확인 숫자(GTIN·SSCC·EAN·UPC) — 마지막 자리 앞까지 넣으면 확인 숫자 */
export function gs1Check(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) sum += Number(digits[digits.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
}
export const checkOk = (full: string) => /^\d{2,}$/.test(full) && gs1Check(full.slice(0, -1)) === Number(full.slice(-1));

export interface Gs1Field {
  ai: string;
  name: L2;
  value: string;
  /** 날짜 → YYYY-MM-DD(일 00 은 «그 달 말»), GTIN → 확인 숫자 맞음/틀림, 소수 */
  note?: { ko: string; en: string };
  bad?: boolean;
}
export interface Gs1Result {
  symbology?: string;
  fields: Gs1Field[];
  rest: string;
  /** GS 없이 가변 칸이 끝까지 읽혔을 수 있음 */
  noSeparator: boolean;
}

const SYMBOLOGY = /^\](C1|d2|Q3|e0|J1)/;
const GS = "\x1d";

function describe(def: AiDef, v: string): Pick<Gs1Field, "note" | "bad"> {
  if (def.kind === "date" && /^\d{6}$/.test(v)) {
    const [yy, mm, dd] = [v.slice(0, 2), v.slice(2, 4), v.slice(4, 6)];
    // GS1 일반 규격: 두 자리 해는 지금 기준 -49 ~ +50 년 — 여기서는 단순히 20YY
    const y = `20${yy}`;
    const badM = Number(mm) < 1 || Number(mm) > 12;
    return dd === "00"
      ? { note: { ko: `${y}-${mm} (그 달 말일)`, en: `${y}-${mm} (end of month)` }, bad: badM }
      : { note: { ko: `${y}-${mm}-${dd}`, en: `${y}-${mm}-${dd}` }, bad: badM || Number(dd) > 31 };
  }
  if (def.kind === "gtin" || def.kind === "sscc") {
    const ok = /^\d+$/.test(v) && checkOk(v);
    return { note: ok ? { ko: "확인 숫자 맞음", en: "check digit OK" } : { ko: `확인 숫자 틀림 — ${gs1Check(v.slice(0, -1))} 이어야 함`, en: `check digit wrong — should be ${gs1Check(v.slice(0, -1))}` }, bad: !ok };
  }
  if (def.kind === "decimal" && /^\d{6}$/.test(v)) {
    const d = Number(def.ai[3]);
    const s = d ? `${Number(v.slice(0, 6 - d))}.${v.slice(6 - d)}` : String(Number(v));
    return { note: { ko: `${s} kg`, en: `${s} kg` } };
  }
  return {};
}

/** GS1 요소 문자열 풀이 — «]C1» 같은 기호 식별자, GS(0x1D) 구분, «(01)…(17)…» 괄호 꼴. GS1 로 보이지 않으면 null */
export function parseGs1(input: string): Gs1Result | null {
  let s = input.replace(/[\r\n\t]+$/, "");
  const sym = s.match(SYMBOLOGY);
  if (sym) s = s.slice(3);
  // 괄호 꼴
  if (/^\(\d{2,4}\)/.test(s)) {
    const fields: Gs1Field[] = [];
    for (const m of s.matchAll(/\((\d{2,4})\)([^(]*)/g)) {
      const def = AIS.find((a) => a.ai === m[1]);
      const v = m[2].trim();
      fields.push({ ai: m[1], name: def?.name ?? { ko: "모르는 AI", en: "Unknown AI" }, value: v, ...(def ? describe(def, v) : {}) });
    }
    return { symbology: sym?.[1], fields, rest: "", noSeparator: false };
  }
  if (!sym && !s.includes(GS) && !/^(00|01|02)\d{14}/.test(s)) return null;
  if (s.startsWith(GS)) s = s.slice(1);
  const fields: Gs1Field[] = [];
  let noSeparator = false;
  while (s.length) {
    const def = [...AIS].sort((a, b) => b.ai.length - a.ai.length).find((a) => s.startsWith(a.ai));
    if (!def) break;
    s = s.slice(def.ai.length);
    let v: string;
    if (def.fixed) {
      v = s.slice(0, def.fixed);
      s = s.slice(def.fixed);
      if (s.startsWith(GS)) s = s.slice(1);
    } else {
      const g = s.indexOf(GS);
      v = g >= 0 ? s.slice(0, g) : s;
      s = g >= 0 ? s.slice(g + 1) : "";
      if (g < 0 && v.length > def.max!) noSeparator = true;
    }
    fields.push({ ai: def.ai, name: def.name, value: v, ...describe(def, v) });
  }
  if (!fields.length) return null;
  return { symbology: sym?.[1], fields, rest: s, noSeparator };
}

/** 숫자만 8·12·13·14자리 → EAN-8·UPC-A·EAN-13·GTIN-14 확인 숫자 */
export function retailCode(s: string): { kind: string; ok: boolean; expect: number } | null {
  const t = s.replace(/[\r\n\t]+$/, "");
  if (!/^\d+$/.test(t)) return null;
  const kind = { 8: "EAN-8", 12: "UPC-A", 13: "EAN-13", 14: "GTIN-14" }[t.length];
  if (!kind) return null;
  const expect = gs1Check(t.slice(0, -1));
  return { kind, ok: expect === Number(t.slice(-1)), expect };
}
