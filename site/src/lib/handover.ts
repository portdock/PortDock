// 웹 도구 «현장 문서 묶음(인수인계)» — 사용자가 가진 파일(구성도 JSON·IO 리스트 JSON·시운전 점검표 CSV)과 메모를 읽어
// 인쇄용 HTML 문서 한 장(표지·목차·구성도 SVG·장비 표·IO 표·점검표 결과·연락처·메모)을 만든다. 화면 없이 글만 만든다(node --test).
// 구성도는 lib/sysDiagram.ts 의 validateDoc·toDrawing·checkDoc 과 diagramSvg.ts 의 renderSvg 를 그대로 쓴다(그 파일들은 고치지 않는다).
// 점검표 CSV 는 /tools/commissioning-checklist/ 의 «CSV 저장» 모양(머리 단계·항목·완료·메모 / Stage·Item·Done·Note, UTF-8 BOM)을 머리 이름으로 찾는다 —
// 칸 순서가 바뀌거나 칸이 늘어도 읽는다. 모든 글은 escape 하고, 문서에 스크립트는 넣지 않는다.
import { LIGHT, esc, renderSvg } from "./diagramSvg.ts";
import { NODE_NAME, checkDoc as checkSys, toDrawing, validateDoc as validateSys, type SysDoc } from "./sysDiagram.ts";
import { checkDoc as checkIo, commText, parseDoc as parseIo, toTableHtml, type IoDoc } from "./ioList.ts";

import { msg, tx, type Lang } from "./tr.ts";
export type { Lang };

// ---------------------------------------------------------------- 파일 읽기

/** 구성도 JSON 글 → 문서(오류는 영어 짧은 글) */
export function readSystem(text: string): { doc: SysDoc | null; errors: string[] } {
  try {
    return validateSys(JSON.parse(text.replace(/^﻿/, "")));
  } catch {
    return { doc: null, errors: ["not JSON"] };
  }
}

/** IO 리스트 JSON 글 → 문서 */
export const readIo = (text: string) => parseIo(text);

/** CSV 글 → 줄·칸(따옴표 안 쉼표·줄바꿈·"" 처리). BOM 은 뗀다 */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
      continue;
    }
    if (c === '"' && cell === "") q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** 내보낼 때 수식 막기로 붙인 ' 를 뗀다(«'=…» → «=…») */
const unguard = (v: string) => (/^'[=+\-@]/.test(v) ? v.slice(1) : v);

export interface CheckRow {
  stage: string;
  item: string;
  done: boolean;
  note: string;
}

// 점검표 CSV 의 머리·완료 표시 — 점검표 화면 언어마다 머리가 그 언어로 나온다(일본어 段階·項目·完了·メモ, 완료 표시 済).
// 점검표를 새 언어로 옮기면 그 언어의 머리·완료 낱말도 여기에 더한다(site/I18N.md «7차 묶음»).
const HEADS = {
  stage: ["단계", "stage", "段階"],
  item: ["항목", "item", "check", "項目"],
  done: ["완료", "done", "checked", "完了"],
  note: ["메모", "note", "notes", "memo", "メモ"],
};
const YES = new Set(["예", "네", "o", "y", "yes", "x", "true", "1", "✓", "✔", "완료", "done", "ok", "済", "完了"]);

/** 점검표 CSV → 줄. 머리를 이름으로 찾고, 머리가 없으면 «단계, 항목, 완료, 메모» 순서로 본다 */
export function parseChecklistCsv(text: string): { rows: CheckRow[]; error?: string } {
  const all = parseCsv(text);
  if (!all.length) return { rows: [], error: "empty" };
  const head = all[0].map((h) => h.trim().toLowerCase());
  const find = (names: string[]) => head.findIndex((h) => names.includes(h));
  let ix = { stage: find(HEADS.stage), item: find(HEADS.item), done: find(HEADS.done), note: find(HEADS.note) };
  let body = all.slice(1);
  if (ix.item < 0) {
    if (ix.stage >= 0 || ix.done >= 0) return { rows: [], error: "no item column" };
    ix = { stage: 0, item: 1, done: 2, note: 3 };
    body = all;
  }
  const cell = (r: string[], i: number) => (i >= 0 ? unguard((r[i] ?? "").trim()) : "");
  const rows = body
    .map((r) => ({ stage: cell(r, ix.stage), item: cell(r, ix.item), done: YES.has(cell(r, ix.done).toLowerCase()), note: cell(r, ix.note) }))
    .filter((r) => r.item)
    .slice(0, 2000);
  return rows.length ? { rows } : { rows, error: "no rows" };
}

// ---------------------------------------------------------------- 문서

export interface Cover {
  site: string;
  date: string;
  author: string;
}
export interface Pack {
  cover: Cover;
  sys?: SysDoc | null;
  io?: IoDoc | null;
  checks?: CheckRow[] | null;
  contacts?: string;
  memo?: string;
}

/** 문서 글 — 한국어·영어는 두 갈래, 추가 언어는 영어 문장으로 번역 표를 찾는다(lib/tr.ts) */
const tt = (lang: Lang) => ({
  doc: msg(lang, "현장 문서 묶음", "Site handover pack"),
  site: msg(lang, "현장", "Site"),
  date: msg(lang, "날짜", "Date"),
  author: msg(lang, "작성자", "Prepared by"),
  toc: msg(lang, "목차", "Contents"),
  sys: msg(lang, "시스템 구성도", "System diagram"),
  devices: msg(lang, "장비 표", "Device list"),
  io: msg(lang, "IO 리스트·통신 사양", "I/O list and communication spec"),
  checks: msg(lang, "시운전 점검 결과", "Commissioning check results"),
  contacts: msg(lang, "연락처", "Contacts"),
  memo: msg(lang, "메모", "Notes"),
  findings: msg(lang, "구성 점검에서 나온 것", "Findings from the diagram check"),
  ioFindings: msg(lang, "IO 리스트 점검에서 나온 것", "Findings from the I/O list check"),
  devHead: [msg(lang, "이름", "Name"), msg(lang, "종류", "Type"), msg(lang, "IP / 마스크", "IP / mask"), msg(lang, "국번", "Unit ID"), msg(lang, "보율·패리티", "Baud, parity"), msg(lang, "메모", "Note")],
  ioDevHead: [msg(lang, "이름", "Name"), msg(lang, "위치", "Location"), msg(lang, "통신", "Communication"), msg(lang, "신호 수", "Signals")],
  chkHead: [msg(lang, "단계", "Stage"), msg(lang, "항목", "Item"), msg(lang, "완료", "Done"), msg(lang, "메모", "Note")],
  doneN: (n: number, t: number) => msg(lang, `완료 ${n} / ${t}`, `Done ${n} / ${t}`),
  open: msg(lang, "남은 항목", "Open items"),
  yes: msg(lang, "예", "yes"),
  none: msg(lang, "넣은 자료가 없습니다 — 구성도·IO 리스트·점검표 파일을 불러오거나 메모를 적으세요.", "Nothing added yet — load a diagram, I/O list or checklist file, or write notes."),
  parity: { none: msg(lang, "없음", "none"), even: msg(lang, "짝수", "even"), odd: msg(lang, "홀수", "odd") } as Record<string, string>,
});

export interface Section {
  id: string;
  title: string;
  html: string;
}

const table = (head: string[], rows: string[][], cls = "") =>
  `<table${cls ? ` class="${cls}"` : ""}><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;

/** 여러 줄 글 → 문단(빈 줄로 나눔, 줄바꿈은 <br>) */
export const paragraphs = (s: string) =>
  s
    .trim()
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p.trim().split(/\r?\n/).map(esc).join("<br>")}</p>`)
    .join("");

const findingList = (title: string, items: { level: string; text: string }[]) =>
  items.length ? `<div class="find"><b>${esc(title)}</b><ul>${items.map((f) => `<li class="${f.level === "fault" ? "fault" : "warn"}">${esc(f.text)}</li>`).join("")}</ul></div>` : "";

/** 들어 있는 자료만 절로 — 목차·본문이 같이 쓴다 */
export function sections(p: Pack, lang: Lang): Section[] {
  const t = tt(lang);
  const out: Section[] = [];
  if (p.sys && (p.sys.nodes.length || p.sys.buses.length)) {
    const svg = renderSvg(toDrawing(p.sys, lang), LIGHT, { bg: true });
    const f = checkSys(p.sys, lang).filter((x) => x.level !== "info");
    out.push({ id: "sys", title: t.sys, html: `<figure class="svg">${svg}</figure>${findingList(t.findings, f)}` });
    const rows = p.sys.nodes.map((n) => [
      n.name,
      (NODE_NAME[n.kind] ? tx(NODE_NAME[n.kind], lang) : n.kind),
      n.ip ? `${n.ip}${n.mask ? ` / ${n.mask}` : ""}` : "",
      n.unit !== undefined ? String(n.unit) : "",
      n.baud !== undefined || n.parity ? `${n.baud ?? ""}${n.parity ? ` ${t.parity[n.parity] ?? n.parity}` : ""}`.trim() : "",
      n.note ?? "",
    ]);
    if (rows.length) out.push({ id: "devices", title: t.devices, html: table(t.devHead, rows) });
  } else if (p.io && p.io.devices.length) {
    // 구성도가 없으면 IO 리스트의 장비로 장비 표
    const rows = p.io.devices.map((d) => [d.name, d.location ?? "", commText(d, lang), String(d.signals.length)]);
    out.push({ id: "devices", title: t.devices, html: table(t.ioDevHead, rows) });
  }
  if (p.io && p.io.devices.length) {
    const f = checkIo(p.io, lang);
    out.push({ id: "io", title: t.io, html: `${findingList(t.ioFindings, f)}${toTableHtml(p.io, lang, 3)}` });
  }
  if (p.checks && p.checks.length) {
    const n = p.checks.filter((c) => c.done).length;
    const open = p.checks.filter((c) => !c.done);
    const rows = p.checks.map((c) => [c.stage, c.item, c.done ? t.yes : "", c.note]);
    const openHtml = open.length ? `<div class="find"><b>${esc(t.open)} (${open.length})</b><ul>${open.map((c) => `<li class="warn">${esc(c.item)}${c.note ? ` — ${esc(c.note)}` : ""}</li>`).join("")}</ul></div>` : "";
    out.push({ id: "checks", title: t.checks, html: `<p class="prog">${esc(t.doneN(n, p.checks.length))}</p>${openHtml}${table(t.chkHead, rows, "chk")}` });
  }
  if (p.contacts?.trim()) out.push({ id: "contacts", title: t.contacts, html: paragraphs(p.contacts) });
  if (p.memo?.trim()) out.push({ id: "memo", title: t.memo, html: paragraphs(p.memo) });
  return out;
}

const CSS = `
*{box-sizing:border-box}
body{font-family:system-ui,-apple-system,"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;color:#111;background:#fff;margin:0;padding:24px;font-size:13px;line-height:1.5}
main{max-width:1000px;margin:0 auto}
h1{font-size:26px;margin:0 0 12px}
h2{font-size:18px;margin:28px 0 8px;padding-bottom:4px;border-bottom:2px solid #333}
h3{font-size:15px;margin:18px 0 4px}
h3 small{font-weight:400;color:#555}
.cover{border:2px solid #333;padding:20px 24px;margin-bottom:16px}
.cover dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:0}
.cover dt{font-weight:600}
.cover dd{margin:0}
.toc ol{margin:4px 0 0;padding-left:22px}
table{border-collapse:collapse;width:100%;margin:6px 0 10px;font-size:12px}
th,td{border:1px solid #999;padding:3px 6px;text-align:left;vertical-align:top}
th{background:#eee}
td.mono,.mono{font-family:ui-monospace,Consolas,monospace}
.io-comm{margin:0 0 4px;color:#333}
.io-empty{color:#666}
figure.svg{margin:8px 0}
figure.svg svg{max-width:100%;height:auto;border:1px solid #ccc}
.find{border-left:4px solid #b7791f;background:#fffbeb;padding:6px 10px;margin:8px 0}
.find ul{margin:4px 0 0;padding-left:18px}
.find li.fault{color:#9b1c1c}
.prog{font-weight:700}
.foot{margin-top:32px;color:#666;font-size:11px;border-top:1px solid #ccc;padding-top:6px}
.empty{color:#666}
@page{size:A4;margin:12mm}
@media print{body{padding:0}h2{break-after:avoid}tr,figure,.find{break-inside:avoid}thead{display:table-header-group}.cover{break-after:page}}
`;

export interface BuildOpts {
  /** 맨 아래 작은 글(만든 곳) */
  footer?: string;
}

/** 독립 HTML 문서(인쇄·파일 저장) — 스크립트 없음, 글은 모두 escape */
export function buildHtml(p: Pack, lang: Lang, o: BuildOpts = {}): string {
  const t = tt(lang);
  const secs = sections(p, lang);
  const title = p.cover.site.trim() ? `${p.cover.site.trim()} — ${t.doc}` : t.doc;
  const cover = `<section class="cover"><h1>${esc(title)}</h1><dl>${[
    [t.site, p.cover.site],
    [t.date, p.cover.date],
    [t.author, p.cover.author],
  ]
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v.trim())}</dd>`)
    .join("")}</dl>${
    secs.length ? `<nav class="toc"><b>${esc(t.toc)}</b><ol>${secs.map((s) => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`).join("")}</ol></nav>` : ""
  }</section>`;
  const body = secs.length ? secs.map((s, i) => `<section id="${s.id}"><h2>${i + 1}. ${esc(s.title)}</h2>${s.html}</section>`).join("\n") : `<p class="empty">${esc(t.none)}</p>`;
  const foot = o.footer ? `<p class="foot">${esc(o.footer)}</p>` : "";
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body>
<main>
${cover}
${body}
${foot}
</main>
</body>
</html>
`;
}

/** 파일 이름에 쓸 현장 이름(글자·숫자·-_ 만, 최대 40자) */
export function fileSlug(site: string): string {
  const s = site
    .normalize("NFC")
    .replace(/[\\/:*?"<>|\s]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "handover";
}

export const STORE_KEY = "portdock-handover-v1";
export interface Saved {
  v: 1;
  cover: Cover;
  contacts: string;
  memo: string;
}
export function parseSaved(text: string | null): Saved {
  const empty: Saved = { v: 1, cover: { site: "", date: "", author: "" }, contacts: "", memo: "" };
  if (!text) return empty;
  try {
    const o = JSON.parse(text) as Partial<Saved>;
    if (!o || o.v !== 1) return empty;
    const s = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
    const c = (o.cover ?? {}) as Partial<Cover>;
    return { v: 1, cover: { site: s(c.site, 120), date: s(c.date, 40), author: s(c.author, 80) }, contacts: s(o.contacts, 4000), memo: s(o.memo, 20000) };
  } catch {
    return empty;
  }
}
