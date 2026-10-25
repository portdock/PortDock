// 보내기 칸 표기 바꾸기 — HEX ↔ ASCII 를 바꿀 때 «같은 바이트» 의 새 표기로 옮긴다.
// 읽는 규칙은 백엔드 codec(parse_hex·parse_ascii, crates/core/src/codec.rs)과 같다.
export type TextMode = "hex" | "ascii";

const enc = new TextEncoder();

/** codec::parse_hex — 공백 , ; - 로 나누고 0x 허용, 짝수 자리. 틀리면 이유를 던진다 */
export function parseHexText(text: string, lang: "ko" | "en" = "ko"): number[] {
  const out: number[] = [];
  for (const token of text.split(/[\s,;-]+/)) {
    const t = token.replace(/^(0x)+/, "").replace(/^(0X)+/, "");
    if (!t) continue;
    const bad = [...t].find((c) => !/[0-9a-fA-F]/.test(c));
    if (bad) throw new Error(lang === "ko" ? `HEX 가 아닌 글자: «${bad}»` : `Not a HEX digit: «${bad}»`);
    if (t.length % 2) throw new Error(lang === "ko" ? `HEX 자릿수가 홀수입니다: «${token}»` : `Odd number of HEX digits: «${token}»`);
    for (let i = 0; i < t.length; i += 2) out.push(parseInt(t.slice(i, i + 2), 16));
  }
  return out;
}

/** codec::parse_ascii — 글자는 UTF-8, \r \n \t \0 \\ \xNN 이스케이프 */
export function parseAsciiText(text: string, lang: "ko" | "en" = "ko"): number[] {
  const out: number[] = [];
  const cs = [...text];
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i];
    if (c !== "\\") {
      out.push(...enc.encode(c));
      continue;
    }
    const n = cs[++i];
    if (n === undefined) out.push(0x5c);
    else if (n === "r") out.push(13);
    else if (n === "n") out.push(10);
    else if (n === "t") out.push(9);
    else if (n === "0") out.push(0);
    else if (n === "\\") out.push(0x5c);
    else if (n === "x") {
      const s = (cs[i + 1] ?? "") + (cs[i + 2] ?? "");
      i += 2;
      if (!/^[0-9a-fA-F]{2}$/.test(s)) throw new Error(lang === "ko" ? `잘못된 \\x 이스케이프: «\\x${s}» (HEX 두 자리)` : `Bad \\x escape: «\\x${s}» (two HEX digits)`);
      out.push(parseInt(s, 16));
    } else throw new Error(lang === "ko" ? `모르는 이스케이프: «\\${n}»` : `Unknown escape: «\\${n}»`);
  }
  return out;
}

/** 바이트 → HEX 표기 «01 03 0A» */
export const toHexText = (b: number[]) => b.map((x) => x.toString(16).toUpperCase().padStart(2, "0")).join(" ");

/** 바이트 → ASCII 표기. 보이는 글자는 그대로, \ 는 \\, CR·LF·TAB·NUL 은 \r \n \t \0, 나머지는 \xNN */
export function toAsciiText(b: number[]) {
  let s = "";
  for (let i = 0; i < b.length; i++) {
    const x = b[i];
    if (x === 0x5c) s += "\\\\";
    else if (x === 13) s += "\\r";
    else if (x === 10) s += "\\n";
    else if (x === 9) s += "\\t";
    // \0 뒤에 숫자가 오면 읽을 때 헷갈리지 않게 \x00 으로
    else if (x === 0) s += /[0-9a-fA-Fx]/.test(String.fromCharCode(b[i + 1] ?? 0x20)) ? "\\x00" : "\\0";
    else if (x >= 0x20 && x < 0x7f) s += String.fromCharCode(x);
    else s += `\\x${x.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return s;
}

/**
 * 표기 바꾸기 — 같은 바이트를 새 모드로. 읽을 수 없으면(틀린 HEX 등) error 에 이유, text 는 원래 그대로.
 */
export function convertNotation(text: string, from: TextMode, to: TextMode, lang: "ko" | "en" = "ko"): { text: string; error: string | null } {
  if (from === to || !text) return { text, error: null };
  try {
    const bytes = from === "hex" ? parseHexText(text, lang) : parseAsciiText(text, lang);
    return { text: to === "hex" ? toHexText(bytes) : toAsciiText(bytes), error: null };
  } catch (e) {
    return { text, error: e instanceof Error ? e.message : String(e) };
  }
}
