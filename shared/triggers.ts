// 트리거 — 받은 줄에 패턴이 오면 색칠·소리·반복 멈춤·파일 기록 멈춤·주석·창 깜빡임. Serial·TCP·UDP 공통(화면 없는 부분).
// 패턴 규칙은 자동응답(crates/core/src/autoreply.rs)과 같다:
//   HEX   — «01 03 ?? **»: ?? = 아무 1바이트, ** = 0바이트 이상
//   ASCII — «ERR?*»: ? = 아무 1바이트(글자), * = 0바이트 이상, \r \n \t \0 \\ \xNN 이스케이프(\x3F 는 글자 그대로의 ?)
// 줄 안 어디에든 있으면(포함) 맞는다.
import { parseAsciiText, parseHexText } from "./notation.ts";

export type Tok = number | null | "*";

export interface Trigger {
  id: number;
  name: string;
  on: boolean;
  mode: "hex" | "ascii";
  pattern: string;
  /** 줄 색(#rrggbb). null 이면 칠하지 않음 */
  color: string | null;
  sound: boolean;
  stopRepeat: boolean;
  stopLog: boolean;
  /** 사건 줄(EV)로 남기기 */
  note: boolean;
  /** 작업 표시줄 깜빡임 */
  flash: boolean;
}

export const TRIGGER_COLORS = ["#f2c94c", "#eb5757", "#27ae60", "#2d9cdb", "#bb6bd9", "#f2994a"];

export function newTrigger(id: number, mode: "hex" | "ascii" = "ascii"): Trigger {
  return { id, name: `T${id}`, on: true, mode, pattern: "", color: TRIGGER_COLORS[0], sound: false, stopRepeat: false, stopLog: false, note: true, flash: false };
}

/** 패턴 → 토큰. 틀리면 이유를 던진다(빈 패턴도) */
export function compilePattern(pattern: string, mode: "hex" | "ascii", lang: "ko" | "en" = "ko"): Tok[] {
  const ko = lang === "ko";
  if (!pattern.trim()) throw new Error(ko ? "패턴이 비어 있습니다" : "The pattern is empty");
  const out: Tok[] = [];
  if (mode === "hex") {
    for (const tok of pattern.split(/[\s,;]+/).filter(Boolean)) {
      if (tok === "??") out.push(null);
      else if (tok === "**") {
        if (out[out.length - 1] !== "*") out.push("*");
      } else out.push(...parseHexText(tok, lang));
    }
  } else {
    let lit = "";
    const flush = () => {
      if (lit) out.push(...parseAsciiText(lit, lang));
      lit = "";
    };
    const cs = [...pattern];
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (c === "\\") {
        // 이스케이프는 글자 그대로 넘긴다(\x3F 는 ? 바이트)
        lit += c + (cs[i + 1] ?? "");
        if (cs[i + 1] === "x") {
          lit += (cs[i + 2] ?? "") + (cs[i + 3] ?? "");
          i += 2;
        }
        i++;
      } else if (c === "?") {
        flush();
        out.push(null);
      } else if (c === "*") {
        flush();
        if (out[out.length - 1] !== "*") out.push("*");
      } else lit += c;
    }
    flush();
  }
  if (!out.some((t) => t !== "*")) throw new Error(ko ? "* 만으로는 고를 수 없습니다 — 바이트를 하나 이상 넣으세요" : "A pattern of only * matches everything — add at least one byte");
  return out;
}

/** 처음부터 끝까지 맞는지(글롭 — * 는 되돌아가며 찾는다) */
function globMatch(p: Tok[], b: number[]) {
  let pi = 0;
  let bi = 0;
  let star = -1;
  let mark = 0;
  while (bi < b.length) {
    if (pi < p.length && p[pi] !== "*" && (p[pi] === null || p[pi] === b[bi])) {
      pi++;
      bi++;
    } else if (pi < p.length && p[pi] === "*") {
      star = pi++;
      mark = bi;
    } else if (star >= 0) {
      pi = star + 1;
      bi = ++mark;
    } else return false;
  }
  while (pi < p.length && p[pi] === "*") pi++;
  return pi === p.length;
}

/** 줄 안 어디에든 있는지 */
export function containsPattern(toks: Tok[], bytes: number[]) {
  return globMatch(["*", ...toks, "*"], bytes);
}

export interface Compiled {
  t: Trigger;
  toks: Tok[] | null;
  error: string | null;
}

export function compileAll(list: Trigger[], lang: "ko" | "en"): Compiled[] {
  return list.map((t) => {
    try {
      return { t, toks: compilePattern(t.pattern, t.mode, lang), error: null };
    } catch (e) {
      return { t, toks: null, error: e instanceof Error ? e.message : String(e) };
    }
  });
}

/** 받은 바이트에 맞는 켜진 트리거들(목록 순서) */
export function matchTriggers(compiled: Compiled[], bytes: number[]): Trigger[] {
  const out: Trigger[] = [];
  for (const c of compiled) if (c.t.on && c.toks && containsPattern(c.toks, bytes)) out.push(c.t);
  return out;
}

/** 저장된 값 → 트리거 목록(모양이 틀린 항목은 버린다) */
export function sanitizeTriggers(v: unknown): Trigger[] {
  if (!Array.isArray(v)) return [];
  const out: Trigger[] = [];
  for (const x of v as Partial<Trigger>[]) {
    if (!x || typeof x !== "object" || typeof x.pattern !== "string" || typeof x.id !== "number") continue;
    out.push({
      id: x.id,
      name: typeof x.name === "string" ? x.name : `T${x.id}`,
      on: x.on !== false,
      mode: x.mode === "hex" ? "hex" : "ascii",
      pattern: x.pattern,
      color: typeof x.color === "string" && /^#[0-9a-f]{6}$/i.test(x.color) ? x.color : null,
      sound: !!x.sound,
      stopRepeat: !!x.stopRepeat,
      stopLog: !!x.stopLog,
      note: !!x.note,
      flash: !!x.flash,
    });
  }
  return out;
}
