// 고장 원인 찾기 도우미 — 질문 나무(data/troubleshoot.ts)를 따라가는 순수 함수. 화면은 views/TroubleshootPage.astro.
// 상태는 «증상 id + 고른 답 번호들» 뿐이라 주소 # 에 담아 그대로 공유된다(서버로 가지 않음).

export type Lang = "ko" | "en";
export interface T {
  ko: string;
  en: string;
}
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
export function toText(w: Walk, lang: Lang, names: Record<string, string>, base: string): string {
  const ko = lang === "ko";
  const L: string[] = [];
  L.push(ko ? "[PortDock 고장 원인 찾기 도우미]" : "[PortDock troubleshooting wizard]");
  L.push(`${ko ? "증상" : "Symptom"}: ${w.symptom.name[lang]}`);
  L.push(ko ? "답한 것:" : "Answers:");
  for (const s of w.steps) L.push(`- ${s.q.q[lang]} → ${s.q.opts[s.pick].a[lang]}`);
  if (isQuestion(w.at)) {
    L.push(`${ko ? "아직 답하지 않은 질문" : "Not answered yet"}: ${w.at.q[lang]}`);
    return L.join("\n");
  }
  const r = w.at;
  L.push("");
  L.push(`${ko ? "결과" : "Result"}: ${r.title[lang]}`);
  L.push(ko ? "원인 후보:" : "Possible causes:");
  for (const c of r.causes) L.push(`- ${c[lang]}`);
  L.push(ko ? "확인 방법:" : "How to check:");
  for (const c of r.checks) L.push(`- ${c[lang]}`);
  L.push(ko ? "참고:" : "See also:");
  for (const l of r.links) {
    const p = linkPath(l);
    L.push(`- ${names[p] ?? p}: ${base}${p}`);
  }
  L.push("");
  L.push(ko ? "(원인 후보일 뿐이며, 현장 측정으로 확인이 필요합니다.)" : "(These are possible causes only; confirm with measurements on site.)");
  return L.join("\n");
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
