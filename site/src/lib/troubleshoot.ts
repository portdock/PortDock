// 고장 원인 찾기 도우미 — 질문 나무(data/troubleshoot.ts)를 따라가는 순수 함수. 화면은 views/TroubleshootPage.astro.
// 상태는 «증상 id + 고른 답 번호들» 뿐이라 주소 # 에 담아 그대로 공유된다(서버로 가지 않음).
// 글: 한국어·영어는 나무(data/troubleshoot.ts) 안에, 추가 언어(ja 등)는 노드 id 로 찾는 언어별 표(TreeText — i18n/<언어>/troubleshootTree.ts)에 둔다.
// 나무 모양(id·답의 다음 노드·링크)은 모든 언어가 함께 쓰고, localize() 가 표의 글을 각 글 칸의 x 에 붙인다.
import { msg, type Lang } from "./tr.ts";

export type { Lang };
export interface T {
  ko: string;
  en: string;
  /** 추가 언어 글 — localize() 가 채운다 */
  x?: string;
}
/** 글 칸 하나를 이 언어로(추가 언어는 localize 한 나무에서 x, 없으면 영어) */
export const say = (t: T, lang: Lang) => (lang === "ko" ? t.ko : lang === "en" ? t.en : (t.x ?? t.en));
export type Link = { k: "guide"; to: string } | { k: "web"; to: string; hash?: string } | { k: "app"; to: string };
export interface Question {
  id: string;
  q: T;
  hint?: T;
  opts: { a: T; next: string }[];
}
export interface Result {
  id: string;
  title: T;
  causes: T[];
  checks: T[];
  links: Link[];
}
export type TNode = Question | Result;
export interface Symptom {
  id: string;
  name: T;
  start: string;
}
export interface TreeData {
  symptoms: Symptom[];
  nodes: TNode[];
}

export const isQuestion = (n: TNode): n is Question => "opts" in n;

/** 언어를 뺀 사이트 경로(+ #) */
export function linkPath(l: Link): string {
  if (l.k === "guide") return `guides/${l.to}/`;
  if (l.k === "app") return `${l.to}/`;
  return l.to + (l.hash ? `#${l.hash}` : "");
}

export interface Step {
  q: Question;
  /** 고른 답 번호 */
  pick: number;
}
export interface Walk {
  symptom: Symptom;
  steps: Step[];
  /** 지금 노드 — 질문이면 답을 기다림, 결과면 끝 */
  at: TNode;
}

/** 증상과 답 번호들로 걸어 간다. 잘못된 번호·없는 노드를 만나면 거기서 멈춘다(앞까지는 유지) */
export function walk(tree: TreeData, symptomId: string, picks: number[]): Walk | null {
  const symptom = tree.symptoms.find((s) => s.id === symptomId);
  if (!symptom) return null;
  const byId = new Map<string, TNode>(tree.nodes.map((n) => [n.id, n]));
  const first = byId.get(symptom.start);
  if (!first) return null;
  let at: TNode = first;
  const steps: Step[] = [];
  for (const p of picks) {
    if (!isQuestion(at)) break;
    const o: Question["opts"][number] | undefined = at.opts[p];
    const next: TNode | undefined = o ? byId.get(o.next) : undefined;
    if (!next) break;
    steps.push({ q: at, pick: p });
    at = next;
  }
  return { symptom, steps, at };
}

/** 주소 # ↔ 상태: «s=rs485&a=0.1.1» */
export function toHash(symptomId: string, picks: number[]) {
  return `s=${encodeURIComponent(symptomId)}` + (picks.length ? `&a=${picks.join(".")}` : "");
}
export function parseHash(hash: string): { s: string; a: number[] } | null {
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const s = p.get("s");
  if (!s) return null;
  const a = (p.get("a") ?? "")
    .split(".")
    .filter((x) => /^\d{1,2}$/.test(x))
    .map(Number);
  return { s, a };
}

/** AI·동료에게 붙여 넣기 좋은 글. names: 링크 경로 → 이름, base: «https://portdock.dev/» 같은 앞부분(언어 포함) */
export function toText(w: Walk, lang: Lang, names: Record<string, string>, base: string | ((path: string) => string)): string {
  const t = (k: string, e: string) => msg(lang, k, e);
  const href = typeof base === "string" ? (p: string) => base + p : base;
  const L: string[] = [];
  L.push(t("[PortDock 고장 원인 찾기 도우미]", "[PortDock troubleshooting wizard]"));
  L.push(`${t("증상", "Symptom")}: ${say(w.symptom.name, lang)}`);
  L.push(t("답한 것:", "Answers:"));
  for (const s of w.steps) L.push(`- ${say(s.q.q, lang)} → ${say(s.q.opts[s.pick].a, lang)}`);
  if (isQuestion(w.at)) {
    L.push(`${t("아직 답하지 않은 질문", "Not answered yet")}: ${say(w.at.q, lang)}`);
    return L.join("\n");
  }
  const r = w.at;
  L.push("");
  L.push(`${t("결과", "Result")}: ${say(r.title, lang)}`);
  L.push(t("원인 후보:", "Possible causes:"));
  for (const c of r.causes) L.push(`- ${say(c, lang)}`);
  L.push(t("확인 방법:", "How to check:"));
  for (const c of r.checks) L.push(`- ${say(c, lang)}`);
  L.push(t("참고:", "See also:"));
  for (const l of r.links) {
    const p = linkPath(l);
    L.push(`- ${names[p] ?? p}: ${href(p)}`);
  }
  L.push("");
  L.push(t("(원인 후보일 뿐이며, 현장 측정으로 확인이 필요합니다.)", "(These are possible causes only; confirm with measurements on site.)"));
  return L.join("\n");
}

// ---------------------------------------------------------------- 추가 언어 글 표

/** 질문 노드 글 — opts 는 답 순서대로. 모든 답이 «예/아니오»(Yes/No)면 빼도 된다(yes·no 를 쓴다) */
export interface QText {
  q: string;
  hint?: string;
  opts?: string[];
}
/** 결과 노드 글 — causes·checks 는 나무와 같은 수·순서 */
export interface RText {
  title: string;
  causes: string[];
  checks: string[];
}
/** 언어 하나의 나무 글 — 열쇠는 증상 id·노드 id(나무 모양은 data/troubleshoot.ts 하나를 함께 쓴다) */
export interface TreeText {
  yes: string;
  no: string;
  symptoms: Record<string, string>;
  nodes: Record<string, QText | RText>;
}

const isYes = (o: { a: T }) => o.a.en === "Yes";
const isNo = (o: { a: T }) => o.a.en === "No";

/** 나무의 글 칸마다 표의 글을 x 로 붙인 새 나무(원본은 그대로). 표에 없는 글은 x 없이 — say() 가 영어로 */
export function localize(tree: TreeData, text: TreeText): TreeData {
  const put = (t: T, x: string | undefined): T => (x ? { ...t, x } : t);
  return {
    symptoms: tree.symptoms.map((s) => ({ ...s, name: put(s.name, text.symptoms[s.id]) })),
    nodes: tree.nodes.map((n): TNode => {
      const tx = text.nodes[n.id];
      if (isQuestion(n)) {
        const q = tx as QText | undefined;
        return {
          ...n,
          q: put(n.q, q?.q),
          hint: n.hint && put(n.hint, q?.hint),
          opts: n.opts.map((o, i) => ({ ...o, a: put(o.a, q?.opts?.[i] ?? (isYes(o) ? text.yes : isNo(o) ? text.no : undefined)) })),
        };
      }
      const r = tx as RText | undefined;
      return { ...n, title: put(n.title, r?.title), causes: n.causes.map((c, i) => put(c, r?.causes[i])), checks: n.checks.map((c, i) => put(c, r?.checks[i])) };
    }),
  };
}

/** 표가 나무와 맞는지 — 빠진·남는 id, 질문/결과 종류, 힌트·답·원인·확인 수, 빈 글. 시험(i18n.test.ts)이 번역된 언어마다 돌린다 */
export function checkText(tree: TreeData, text: TreeText): Problem[] {
  const out: Problem[] = [];
  const blank = (s: unknown) => typeof s !== "string" || !s.trim();
  if (blank(text.yes) || blank(text.no)) out.push({ id: "yes/no", what: "예·아니오 빈칸" });
  for (const s of tree.symptoms) if (blank(text.symptoms[s.id])) out.push({ id: s.id, what: "증상 이름 없음" });
  for (const id of Object.keys(text.symptoms)) if (!tree.symptoms.some((s) => s.id === id)) out.push({ id, what: "나무에 없는 증상" });
  const ids = new Set(tree.nodes.map((n) => n.id));
  for (const id of Object.keys(text.nodes)) if (!ids.has(id)) out.push({ id, what: "나무에 없는 노드" });
  for (const n of tree.nodes) {
    const x = text.nodes[n.id];
    if (!x) {
      out.push({ id: n.id, what: "글 없음" });
      continue;
    }
    if (isQuestion(n)) {
      if (!("q" in x) || blank(x.q)) {
        out.push({ id: n.id, what: "질문 글 없음" });
        continue;
      }
      if (!!n.hint !== (x.hint !== undefined)) out.push({ id: n.id, what: "힌트 있음/없음이 나무와 다름" });
      if (x.hint !== undefined && blank(x.hint)) out.push({ id: n.id, what: "힌트 빈칸" });
      if (x.opts) {
        if (x.opts.length !== n.opts.length) out.push({ id: n.id, what: `답 수 ${x.opts.length} ≠ ${n.opts.length}` });
        if (x.opts.some(blank)) out.push({ id: n.id, what: "답 빈칸" });
      } else if (!n.opts.every((o) => isYes(o) || isNo(o))) out.push({ id: n.id, what: "예/아니오 아닌 답은 opts 가 필요" });
    } else {
      if (!("title" in x) || blank(x.title)) {
        out.push({ id: n.id, what: "결과 제목 없음" });
        continue;
      }
      if (x.causes.length !== n.causes.length) out.push({ id: n.id, what: `원인 수 ${x.causes.length} ≠ ${n.causes.length}` });
      if (x.checks.length !== n.checks.length) out.push({ id: n.id, what: `확인 수 ${x.checks.length} ≠ ${n.checks.length}` });
      if ([...x.causes, ...x.checks].some(blank)) out.push({ id: n.id, what: "글 빈칸" });
    }
  }
  return out;
}

export interface Problem {
  id: string;
  what: string;
}

/**
 * 나무 점검 — 시험과 개발 중 확인용. 돌려주는 문제가 없어야 한다.
 * known: 있는 링크 경로들(guides·web·app). webHashes: 웹 도구 경로 → 허용하는 # 값들(없으면 # 금지)
 */
export function checkTree(tree: TreeData, known: Set<string>, webHashes: Record<string, (h: string) => boolean> = {}): Problem[] {
  const out: Problem[] = [];
  const byId = new Map<string, TNode>();
  for (const n of tree.nodes) {
    if (byId.has(n.id)) out.push({ id: n.id, what: "id 중복" });
    byId.set(n.id, n);
  }
  const sids = new Set<string>();
  for (const s of tree.symptoms) {
    if (sids.has(s.id)) out.push({ id: s.id, what: "증상 id 중복" });
    sids.add(s.id);
    if (!byId.has(s.start)) out.push({ id: s.id, what: `시작 노드 없음: ${s.start}` });
    if (!s.name.ko.trim() || !s.name.en.trim()) out.push({ id: s.id, what: "증상 이름 빈칸" });
  }
  for (const n of tree.nodes) {
    if (isQuestion(n)) {
      if (n.opts.length < 2) out.push({ id: n.id, what: "답이 둘 미만" });
      for (const o of n.opts) {
        if (!byId.has(o.next)) out.push({ id: n.id, what: `없는 다음 노드: ${o.next}` });
        if (!o.a.ko.trim() || !o.a.en.trim()) out.push({ id: n.id, what: "답 글 빈칸" });
      }
      if (new Set(n.opts.map((o) => o.next)).size !== n.opts.length) out.push({ id: n.id, what: "두 답이 같은 곳으로" });
      if (!n.q.ko.trim() || !n.q.en.trim()) out.push({ id: n.id, what: "질문 빈칸" });
    } else {
      if (n.causes.length === 0) out.push({ id: n.id, what: "원인 후보 없음" });
      if (n.checks.length === 0) out.push({ id: n.id, what: "확인 방법 없음" });
      if (n.links.length === 0) out.push({ id: n.id, what: "링크 없음" });
      for (const t of [n.title, ...n.causes, ...n.checks]) if (!t.ko.trim() || !t.en.trim()) out.push({ id: n.id, what: "글 빈칸" });
      for (const l of n.links) {
        const base = l.k === "guide" ? `guides/${l.to}/` : l.k === "app" ? `${l.to}/` : l.to;
        if (!known.has(base)) out.push({ id: n.id, what: `없는 링크: ${base}` });
        if (l.k === "web" && l.hash !== undefined) {
          const ok = webHashes[l.to];
          if (!ok || !ok(l.hash)) out.push({ id: n.id, what: `알 수 없는 #: ${l.to}#${l.hash}` });
        }
      }
      if (new Set(n.links.map(linkPath)).size !== n.links.length) out.push({ id: n.id, what: "같은 링크 둘" });
    }
  }
  // 닿음·고리: 증상마다 깊이 우선, 지나는 길에 같은 노드가 다시 나오면 고리
  const reached = new Set<string>();
  const visit = (id: string, stack: string[]) => {
    if (stack.includes(id)) {
      out.push({ id, what: `고리: ${[...stack, id].join(" → ")}` });
      return;
    }
    const n = byId.get(id);
    if (!n) return;
    reached.add(id);
    if (isQuestion(n)) for (const o of n.opts) visit(o.next, [...stack, id]);
  };
  for (const s of tree.symptoms) visit(s.start, []);
  for (const n of tree.nodes) if (!reached.has(n.id)) out.push({ id: n.id, what: "어느 증상에서도 닿지 않음" });
  return out;
}

/** 모든 끝까지의 길(증상 → … → 결과) 수 — 시험에서 «막다른 곳 없음» 을 길 단위로도 본다 */
export function allPaths(tree: TreeData): { symptom: string; picks: number[]; end: string }[] {
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const out: { symptom: string; picks: number[]; end: string }[] = [];
  const go = (s: string, id: string, picks: number[], depth: number) => {
    const n = byId.get(id);
    if (!n || depth > 40) return;
    if (!isQuestion(n)) {
      out.push({ symptom: s, picks, end: id });
      return;
    }
    n.opts.forEach((o, i) => go(s, o.next, [...picks, i], depth + 1));
  };
  for (const s of tree.symptoms) go(s.id, s.start, [], 0);
  return out;
}
