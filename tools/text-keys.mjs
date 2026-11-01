// 한·영 두 판 글(t("한국어", "English"))의 영어 원천을 소스에서 뽑는다 — 추가 언어 사전(shared/<언어>/text.ts)의 열쇠.
// 템플릿 글(`… ${n} …`)은 ${…} 자리를 차례로 {a} {b} {c} … 로 바꾼 꼴이 열쇠다(shared/textLang.ts 가 같은 꼴로 맞춘다).
// 쓰기:   node tools/text-keys.mjs                — 아직 ja 에 없는 열쇠를 JSON 으로(자리표시뿐인 열쇠는 일부러 빠져 있다)
//         node tools/text-keys.mjs --all          — 모든 열쇠
// 시험:   node --test tools/text-keys.test.mjs    (ja 사전의 열쇠가 모두 소스에 있는지·자리표시가 맞는지)
// 새 판정 글 파일을 txt() 로 보이게 하면 아래 TEXT_SOURCES 에 더한다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** 판정·점검 글이 있는 파일(t(ko, en) 를 쓰는 곳) */
export const TEXT_SOURCES = [
  "shared/portinfo.ts",
  "shared/pcCheck.ts",
  "shared/nicCheck.ts",
  "shared/wireless.ts",
  "shared/inspectSnapshot.ts",
  "apps/hw-tester/src/model.ts",
  "shared/devices.ts",
  "shared/modbusBuild.ts",
];

const NAMES = "abcdefghijklmnopqrstuvwxyz";

function unescape(raw) {
  return raw.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (_, e) => {
    if (e[0] === "u" && e.length > 1) return String.fromCodePoint(parseInt(e[1] === "{" ? e.slice(2, -1) : e.slice(1), 16));
    if (e[0] === "x" && e.length === 3) return String.fromCharCode(parseInt(e.slice(1), 16));
    return { n: "\n", t: "\t", r: "\r", 0: "\0", b: "\b", f: "\f", v: "\v", "\n": "" }[e] ?? e;
  });
}

/** src[i] 에서 시작하는 글 상수 하나를 읽는다 — { value, next } 또는 null(글 상수가 아님) */
function readLiteral(src, i) {
  const q = src[i];
  if (q === '"' || q === "'") {
    let j = i + 1;
    while (j < src.length && src[j] !== q) j += src[j] === "\\" ? 2 : 1;
    return { value: unescape(src.slice(i + 1, j)), next: j + 1 };
  }
  if (q !== "`") return null;
  let j = i + 1;
  let out = "";
  let raw = "";
  let n = 0;
  while (j < src.length && src[j] !== "`") {
    if (src[j] === "\\") {
      raw += src.slice(j, j + 2);
      j += 2;
    } else if (src[j] === "$" && src[j + 1] === "{") {
      out += unescape(raw);
      raw = "";
      j = skipExpr(src, j + 2);
      out += `{${NAMES[n++]}}`;
    } else raw += src[j++];
  }
  out += unescape(raw);
  return { value: out, next: j + 1 };
}

/** ${ 다음부터 짝 맞는 } 다음 자리까지 건너뛴다(안의 글 상수·템플릿 포함) */
function skipExpr(src, j) {
  let depth = 1;
  while (j < src.length) {
    const c = src[j];
    if (c === '"' || c === "'" || c === "`") {
      j = readLiteral(src, j).next;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return j + 1;
    j++;
  }
  return j;
}

const skipWs = (src, j) => {
  while (j < src.length && /\s/.test(src[j])) j++;
  return j;
};

/** 소스 글 하나에서 t(ko, en) 쌍을 모두 */
export function extractPairs(src) {
  const out = [];
  const re = /(?<![\w$.])t\(/g;
  let m;
  while ((m = re.exec(src))) {
    let j = skipWs(src, m.index + 2);
    const a = readLiteral(src, j);
    if (!a) continue;
    j = skipWs(src, a.next);
    if (src[j] !== ",") continue;
    j = skipWs(src, j + 1);
    const b = readLiteral(src, j);
    if (!b) continue;
    j = skipWs(src, b.next);
    if (src[j] === ",") j = skipWs(src, j + 1);
    if (src[j] !== ")") continue;
    out.push({ ko: a.value, en: b.value });
  }
  return out;
}

/** 객체 글 { ko: "한국어", en: "English" } 쌍도 */
export function extractObjPairs(src) {
  const out = [];
  const re = /(?<![\w$])ko:\s*/g;
  let m;
  while ((m = re.exec(src))) {
    const a = readLiteral(src, m.index + m[0].length);
    if (!a) continue;
    let j = skipWs(src, a.next);
    if (src[j] !== ",") continue;
    j = skipWs(src, j + 1);
    if (!src.startsWith("en:", j)) continue;
    const b = readLiteral(src, skipWs(src, j + 3));
    if (b) out.push({ ko: a.value, en: b.value });
  }
  return out;
}

/** TEXT_SOURCES 의 모든 영어 열쇠(겹침 없이, 처음 나온 차례) */
export function allKeys() {
  const seen = new Map();
  for (const f of TEXT_SOURCES) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const p of [...extractPairs(src), ...extractObjPairs(src)]) if (!seen.has(p.en)) seen.set(p.en, { ...p, file: f });
  }
  return seen;
}

/** 열쇠·값의 자리표시({a} {b} …) */
export const holes = (s) => [...s.matchAll(/\{([a-z])\}/g)].map((x) => x[1]);

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const all = allKeys();
  const have = process.argv.includes("--all") ? {} : (await import("../shared/ja/text.ts")).JA_TEXT;
  const rows = [...all.values()].filter((p) => !(p.en in have)).map(({ file, ko, en }) => ({ file, ko, en }));
  process.stdout.write(`${JSON.stringify(rows, null, 1)}\n`);
}
