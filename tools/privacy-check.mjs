#!/usr/bin/env node
// 공개 저장소·사이트에 개인 정보가 올라가지 않게 막는 검사 — 새 의존성 없이 Node 만 쓴다.
//
//   node tools/privacy-check.mjs              → git 이 아는 파일(추적 + 아직 추적 안 했지만 무시되지 않는 새 파일, node_modules 제외)
//   node tools/privacy-check.mjs site/dist    → 위에 더해 그 폴더(사이트 빌드 결과) 아래 글 파일 전부
//
// 찾으면 «파일:줄: 무엇 — 앞뒤 글» 을 찍고 종료 코드 1.
// 막는 것: 개발자 PC 의 개인 경로(C:\dev·C:\auto·C:\Users\<실제 이름>), 개인 메일·회사 이름·실명,
//   취업·겸업·부업·외주 같은 개인 계획 낱말, «사용자 10/22 결정» 류 개인 결정 기록, 비공개 검토 문서 경로.
// 운영 메모(일정·계정·수익 계획)는 공개 저장소 밖(비공개)에 둔다 — docs/todo.md 첫 줄.
// 허용은 아래 ALLOW 에 «어느 파일·어느 글·왜» 를 함께 적는다. 낱말을 통째로 빼지 말고 파일·문맥으로 좁힌다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** 보고서 시험에 쓰는 가짜 사용자 이름 — C:\Users\<이것> 은 허용(실제 개발자 이름이 아님) */
export const SAMPLE_USERS = ["<name>", "<user>", "이름", "홍길동", "kim", "lee", "park", "bob", "me", "john smith", "%username%", "name"];

/**
 * 개인 메일·회사·실명 같은 «구체적인 개인 낱말» 은 이 공개 파일에 두지 않는다(어떤 인코딩으로도).
 * 저장소 밖에서 읽는다: 환경 변수 PORTDOCK_PRIVATE_TERMS(CI 는 저장소 Secret) 또는 저장소 뿌리의
 * .private-terms(.gitignore). 형식: 한 줄에 «이름=정규식» (예: 개인 메일=someone123), # 은 주석.
 */
export function parsePrivateTerms(text) {
  const out = [];
  for (const raw of String(text ?? "").split(/\r?\n|;/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    const id = i > 0 ? line.slice(0, i).trim() : "개인 낱말";
    const pat = (i > 0 ? line.slice(i + 1) : line).trim();
    if (pat) out.push({ id, re: new RegExp(pat, "i") });
  }
  return out;
}

function loadPrivateTerms() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  let text = process.env.PORTDOCK_PRIVATE_TERMS ?? "";
  try { text += "\n" + fs.readFileSync(path.join(root, ".private-terms"), "utf8"); } catch { /* 없으면 일반 규칙만 */ }
  return parsePrivateTerms(text);
}

/** 금지 패턴. re 는 줄 하나에 대고 돈다(g 플래그 없음). */
export const RULES = [
  ...loadPrivateTerms(),
  { id: "개인 경로 C:\\dev", re: /\b[A-Za-z]:[\\/]+dev(?![\w-])/i },
  { id: "개인 경로 C:\\auto", re: /\b[A-Za-z]:[\\/]+auto(?![\w-])/i },
  {
    id: "개인 경로 C:\\Users\\<이름>",
    re: /\b[A-Za-z]:[\\/]+Users[\\/]+([^\\/"'`\s)»,;]*(?: [A-Za-z]+)?)/i,
    // 시험용 가짜 이름이면 통과
    ok: (m) => SAMPLE_USERS.some((n) => m[1].toLowerCase().startsWith(n)),
  },
  { id: "개인 계획 낱말(입사)", re: /입사/ },
  { id: "개인 계획 낱말(수습)", re: /수습/ },
  { id: "개인 계획 낱말(겸업)", re: /겸업/ },
  { id: "개인 계획 낱말(부업)", re: /부업/ },
  { id: "개인 계획 낱말(외주)", re: /외주/ },
  { id: "개인 결정 기록", re: /사용자\s*\(?\s*\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2}\s*\)?\s*사용자|사용자\s*(결정|확인)\s*\(?\s*\d{1,2}\/\d{1,2}/ },
  { id: "비공개 검토 문서 경로", re: /\breview[\\/]+20\d\d-\d\d-\d\d_/ },
];

/**
 * 허용 목록 — file: 저장소 기준 경로(/ 구분) 정규식, rule: 위 RULES 의 id(생략하면 전부), text: 그 줄에 있어야 하는 글(생략하면 줄 무관), why: 이유.
 * 줄 하나가 이 셋을 모두 만족할 때만 통과한다.
 */
export const ALLOW = [
  { file: /^tools\/privacy-check(\.test)?\.mjs$/, why: "검사기와 그 시험 — 금지 패턴을 정의·시험하려고 낱말을 직접 담는다" },
];

const EXT_SKIP = /\.(png|jpe?g|gif|webp|ico|icns|bmp|svgz|woff2?|ttf|otf|eot|zip|gz|7z|exe|dll|pdb|msi|pdf|wasm|lock)$/i;

/** 글 하나를 검사해 걸린 것 [{file, line, rule, snippet}] */
export function scanText(file, text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const r of RULES) {
      const m = r.re.exec(line);
      if (!m || (r.ok && r.ok(m))) continue;
      if (ALLOW.some((a) => a.file.test(file) && (!a.rule || a.rule === r.id) && (!a.text || line.includes(a.text)))) continue;
      const at = m.index;
      const snippet = line.slice(Math.max(0, at - 30), at + m[0].length + 30).trim();
      out.push({ file, line: i + 1, rule: r.id, snippet });
    }
  }
  return out;
}

/** 저장소 루트 기준으로 git 이 아는 파일(무시된 것·node_modules 제외) */
export function gitFiles(root) {
  const raw = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
  return [...new Set(raw.toString("utf8").split("\0").filter(Boolean))]
    .filter((f) => !f.split("/").includes("node_modules"))
    .filter((f) => fs.existsSync(path.join(root, f)));
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules") out.push(...walk(p));
    } else out.push(p);
  }
  return out;
}

/** 파일 하나 — 그림·압축·바이너리(NUL 이 있는 것)는 건너뛴다 */
function scanFile(abs, shown) {
  if (EXT_SKIP.test(abs)) return [];
  const buf = fs.readFileSync(abs);
  if (buf.subarray(0, 8192).includes(0)) return [];
  return scanText(shown, buf.toString("utf8"));
}

export function run(root, extraDirs = []) {
  const found = [];
  let count = 0;
  for (const f of gitFiles(root)) {
    found.push(...scanFile(path.join(root, f), f));
    count++;
  }
  for (const d of extraDirs) {
    const abs = path.resolve(root, d);
    if (!fs.existsSync(abs)) throw new Error(`폴더 없음: ${d}`);
    for (const p of walk(abs)) {
      found.push(...scanFile(p, path.relative(root, p).split(path.sep).join("/")));
      count++;
    }
  }
  return { found, count };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { found, count } = run(root, process.argv.slice(2));
  if (found.length) {
    for (const f of found) console.error(`${f.file}:${f.line}: ${f.rule} — ${f.snippet}`);
    console.error(`\n개인 정보 검사 실패: ${found.length}곳. 공개하면 안 되는 내용은 비공개 문서로 옮기고, 정말 필요한 것만 tools/privacy-check.mjs 의 ALLOW 에 이유와 함께.`);
    process.exit(1);
  }
  console.log(`개인 정보 검사 통과 (${count}개 파일)`);
}
