// (0.11.0) 한·영 두 판 글({ ko, en } — 판정·점검 글, 백엔드 문구 등)을 화면 언어로.
// 한국어는 ko, 그 밖의 언어는 영어(en)를 열쇠로 그 언어 사전(shared/<언어>/text.ts)을 찾는다 — 없으면 영어 그대로.
// 열쇠 꼴: 소스의 t("한국어", "English") 에서 영어. 템플릿 글(`… ${n} …`)은 ${…} 를 차례로 {a} {b} … 로 바꾼 꼴
// («{a} devices» → «{a} 台»). 끼워진 값도 사전에 있으면 옮긴다. « · » 로 이은 글은 조각마다 찾는다.
// 열쇠 목록: node tools/text-keys.mjs(아직 ja 에 없는 것), 시험: node --test tools/text-keys.test.mjs shared/textLang.test.ts
// 새 언어: shared/<언어>/text.ts 를 만들고 아래 MORE 에 더한다.
import type { Lang } from "./lang.ts";
import { JA_TEXT } from "./ja/text.ts";
import { PT_TEXT } from "./pt/text.ts";
import { FR_TEXT } from "./fr/text.ts";
import { IT_TEXT } from "./it/text.ts";

export interface KoEn {
  ko: string;
  en: string;
}

const MORE: Partial<Record<Lang, Record<string, string>>> = { ja: JA_TEXT, pt: PT_TEXT, fr: FR_TEXT, it: IT_TEXT };

interface Pattern {
  re: RegExp;
  names: string[];
  to: string;
}
interface Book {
  exact: Map<string, string>;
  patterns: Pattern[];
  cache: Map<string, string | null>;
}
const books = new Map<Lang, Book | null>();

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function book(lang: Lang): Book | null {
  if (books.has(lang)) return books.get(lang) ?? null;
  const dict = MORE[lang];
  let b: Book | null = null;
  if (dict) {
    b = { exact: new Map(), patterns: [], cache: new Map() };
    for (const [k, v] of Object.entries(dict)) {
      if (!v) continue;
      if (!/\{[a-z]\}/.test(k)) {
        b.exact.set(k, v);
        continue;
      }
      // 고정 글에 글자·숫자가 하나도 없는 틀(«{a}{b}»)은 아무 글에나 맞으니 쓰지 않는다.
      // 고정 글자가 3자 이하인 짧은 틀(«{a} min»)은 뒤에 고정 글이 오는 자리를 숫자로만 받는다
      const fixed = k.replace(/\{[a-z]\}/g, "");
      if (!/[\p{L}\p{N}]/u.test(fixed)) continue;
      const short = (fixed.match(/\p{L}/gu) ?? []).length < 4;
      const names: string[] = [];
      const parts = k.split(/(\{[a-z]\})/);
      const src = parts
        .map((part, i) => {
          const m = /^\{([a-z])\}$/.exec(part);
          if (!m) return escRe(part);
          names.push(m[1]);
          return short && parts.slice(i + 1).join("") !== "" && !/^\{/.test(parts[i + 1] ?? "") ? "(-?\\d+(?:[.,]\\d+)?)" : "([\\s\\S]*?)";
        })
        .join("");
      b.patterns.push({ re: new RegExp(`^${src}$`), names, to: v });
    }
    // 고정 글이 긴 틀부터(«{a} devices» 보다 «{a} USB devices» 가 먼저)
    b.patterns.sort((x, y) => y.re.source.length - x.re.source.length);
  }
  books.set(lang, b);
  return b;
}

function lookup(b: Book, en: string, depth: number): string | null {
  const hit = b.cache.get(en);
  if (hit !== undefined) return hit;
  let out: string | null = b.exact.get(en) ?? null;
  if (out == null) {
    for (const p of b.patterns) {
      const m = p.re.exec(en);
      if (!m) continue;
      const vals: Record<string, string> = {};
      p.names.forEach((n, i) => {
        // 끼워진 값도 사전에서(앞뒤 빈칸은 그대로 두고)
        const v = m[i + 1];
        const core = v.trim();
        const tr = depth < 2 && core && !/^[\d.,:\- ]+$/.test(core) ? lookup(b, core, depth + 1) : null;
        vals[n] = tr == null ? v : v.replace(core, () => tr);
      });
      out = p.to.replace(/\{([a-z])\}/g, (_, n: string) => vals[n] ?? "");
      break;
    }
  }
  if (out == null && depth < 2 && en.includes(" · ")) {
    const parts = en.split(" · ");
    const done = parts.map((s) => lookup(b, s, depth + 1));
    if (done.some((x) => x != null)) out = done.map((x, i) => x ?? parts[i]).join(" · ");
  }
  if (b.cache.size < 5000) b.cache.set(en, out);
  return out;
}

/** 한·영 두 판 글 → 화면 언어(ko 는 한국어, 사전에 없으면 영어) */
export function txt(x: KoEn, lang: Lang): string {
  if (lang === "ko") return x.ko;
  if (lang === "en") return x.en;
  const b = book(lang);
  return (b && lookup(b, x.en, 0)) ?? x.en;
}

/** 사전에 있는가(시험용) */
export const hasText = (lang: Lang, en: string) => {
  const b = book(lang);
  return !!b && lookup(b, en, 0) != null;
};
