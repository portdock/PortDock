// 사이트 빌드 결과 검사 — 검색엔진이 보는 것(제목·설명·canonical·구조화 데이터·내부 링크·sitemap)을 외부 서비스 없이 확인한다.
// 쓰는 법: npm run build -w portdock-site 뒤 node tools/site-check.mjs [site/dist]
// 실패(종료 코드 1): 제목·설명 없음·중복·너무 김, h1 이 하나가 아님, 제목 단계 건너뜀, img alt 없음,
//   canonical·hreflang 이 SITE 와 다름, JSON-LD 파싱 실패·필수 필드 없음, 깨진 내부 링크, sitemap 누락, robots.txt 의 Sitemap 줄 없음.
// 길이 기준(대략): 검색 결과 제목 약 600px, 설명 약 920px. 한글·한자 한 글자 = 2칸, 나머지 = 1칸으로 세어 제목 66칸·설명 160칸까지.
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.argv[2] ?? "site/dist");
const TITLE_MAX = 66;
const DESC_MIN = 70;
const DESC_MAX = 160;
const HTML_MAX = 150 * 1024;

const errors = [];
const warns = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

/** 검색 결과에서 차지하는 너비(대략) — 한글·한자·전각 = 2 */
export const width = (s) => [...s].reduce((n, c) => n + (/[ᄀ-ᇿ⺀-鿿가-힯＀-￯]/.test(c) ? 2 : 1), 0);
const decode = (s) =>
  s.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (m, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", "#x27": "'" })[e] ?? m);
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}=("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? decode(m[2] ?? m[3] ?? m[4] ?? "") : null;
};
const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

if (!fs.existsSync(dist)) {
  console.error(`빌드 결과가 없습니다: ${dist} — 먼저 npm run build -w portdock-site`);
  process.exit(1);
}
const files = walk(dist);
const htmlFiles = files.filter((f) => f.endsWith(".html"));
const rel = (f) => path.relative(dist, f).split(path.sep).join("/");
/** dist 파일 → 사이트 경로(/a/b/) */
const pagePath = (f) => "/" + rel(f).replace(/index\.html$/, "").replace(/\.html$/, "");

// robots.txt 의 Sitemap 줄에서 사이트 주소를 얻는다(SITE_URL 빌드 변수와 같아야 한다)
const robots = fs.existsSync(path.join(dist, "robots.txt")) ? fs.readFileSync(path.join(dist, "robots.txt"), "utf8") : "";
const sm = robots.match(/^Sitemap:\s*(\S+)/m);
if (!sm) err("robots.txt", "Sitemap 줄이 없습니다");
const SITE = sm ? new URL(sm[1]).origin : "";
if (robots && !/^User-agent:\s*\*/m.test(robots)) err("robots.txt", "User-agent: * 가 없습니다");

// ---- JSON-LD 필수 필드(Google 검색 센터·네이버 서치어드바이저 문서 기준, 리치 결과 자격이 아니라 «틀리지 않음» 확인)
const isAbs = (u) => typeof u === "string" && /^https?:\/\//.test(u);
const onSite = (u) => isAbs(u) && new URL(u).origin === SITE;
const REQUIRED = {
  SoftwareApplication: (o, e) => {
    if (!o.name) e("name");
    if (!o.applicationCategory) e("applicationCategory"); // 네이버 필수
    if (!o.operatingSystem) e("operatingSystem");
    const offers = [].concat(o.offers ?? []);
    if (!offers.length) e("offers");
    for (const of of offers) {
      if (of.price === undefined || Number.isNaN(Number(of.price))) e("offers.price(숫자)");
      if (!/^[A-Z]{3}$/.test(of.priceCurrency ?? "")) e("offers.priceCurrency(ISO 4217)");
    }
    if (o.aggregateRating || o.review) e("평점·리뷰는 실제 자료가 생기기 전에는 넣지 않는다");
    if (!onSite(o.url)) e("url(사이트 주소)");
  },
  TechArticle: (o, e) => {
    if (!o.headline) e("headline");
    else if (o.headline.length > 110) e("headline 110자 이하");
    if (!/^\d{4}-\d{2}-\d{2}/.test(o.datePublished ?? "")) e("datePublished(ISO 8601)");
    if (o.dateModified && !/^\d{4}-\d{2}-\d{2}/.test(o.dateModified)) e("dateModified(ISO 8601)");
    if (!o.author?.name) e("author.name");
    if (!isAbs(o.image)) e("image(절대 주소)");
    if (!onSite(o.url)) e("url(사이트 주소)");
  },
  Dataset: (o, e) => {
    if (!o.name) e("name");
    if (!o.description || o.description.length < 50 || o.description.length > 5000) e("description 50~5000자");
    if (!o.license) e("license");
    if (!onSite(o.url)) e("url(사이트 주소)");
    for (const d of [].concat(o.distribution ?? [])) if (!isAbs(d.contentUrl) || !d.encodingFormat) e("distribution.contentUrl·encodingFormat");
  },
  BreadcrumbList: (o, e) => {
    const items = o.itemListElement ?? [];
    if (items.length < 2) e("itemListElement 2개 이상");
    items.forEach((it, i) => {
      if (it.position !== i + 1) e(`itemListElement[${i}].position = ${i + 1}`);
      if (!it.name) e(`itemListElement[${i}].name`);
      if (!onSite(it.item)) e(`itemListElement[${i}].item(사이트 주소)`);
    });
  },
  WebSite: (o, e) => {
    if (!o.name) e("name");
    if (!onSite(o.url)) e("url(사이트 주소)");
  },
  Organization: (o, e) => {
    if (!o.name) e("name");
    if (!onSite(o.url)) e("url(사이트 주소)");
    if (o.logo && !isAbs(o.logo)) e("logo(절대 주소)");
  },
  FAQPage: (o, e) => {
    const q = o.mainEntity ?? [];
    if (!q.length) e("mainEntity");
    q.forEach((x, i) => {
      if (x["@type"] !== "Question" || !x.name) e(`mainEntity[${i}] Question.name`);
      if (!x.acceptedAnswer?.text) e(`mainEntity[${i}].acceptedAnswer.text`);
    });
  },
};

// ---- 페이지마다
const titles = new Map();
const descs = new Map();
const indexable = [];
const ldCount = {};
const linkTargets = new Set();
let biggest = { file: "", size: 0 };

for (const f of htmlFiles) {
  const file = rel(f);
  const html = fs.readFileSync(f, "utf8");
  if (html.length > biggest.size) biggest = { file, size: html.length };
  if (html.length > HTML_MAX) err(file, `HTML ${Math.round(html.length / 1024)}KB — ${HTML_MAX / 1024}KB 이하로`);
  const head = html.slice(0, html.indexOf("</head>") + 1 || undefined);
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(head);

  const lang = (html.match(/<html[^>]*\slang="([^"]+)"/) ?? [])[1];
  if (!lang) err(file, "<html lang> 없음");

  const t = [...head.matchAll(/<title>([\s\S]*?)<\/title>/g)].map((m) => decode(m[1]).trim());
  if (t.length !== 1 || !t[0]) err(file, `<title> ${t.length}개`);
  const d = [...head.matchAll(/<meta\s[^>]*name="description"[^>]*>/g)].map((m) => attr(m[0], "content") ?? "");
  if (d.length !== 1 || !d[0]) err(file, `meta description ${d.length}개`);

  if (!noindex) {
    indexable.push(pagePath(f));
    const title = t[0] ?? "";
    const desc = d[0] ?? "";
    if (width(title) > TITLE_MAX) err(file, `제목이 깁니다(${width(title)}칸 > ${TITLE_MAX}): ${title}`);
    if (width(desc) > DESC_MAX) err(file, `설명이 깁니다(${width(desc)}칸 > ${DESC_MAX}): ${desc}`);
    if (width(desc) < DESC_MIN) err(file, `설명이 짧습니다(${width(desc)}칸 < ${DESC_MIN}): ${desc}`);
    titles.set(title, [...(titles.get(title) ?? []), file]);
    descs.set(desc, [...(descs.get(desc) ?? []), file]);

    const canon = [...head.matchAll(/<link\s[^>]*rel="canonical"[^>]*>/g)].map((m) => attr(m[0], "href"));
    if (canon.length !== 1) err(file, `canonical ${canon.length}개`);
    else if (canon[0] !== SITE + pagePath(f)) err(file, `canonical ${canon[0]} ≠ ${SITE + pagePath(f)}`);
    const hl = [...head.matchAll(/<link\s[^>]*rel="alternate"[^>]*hreflang="([^"]+)"[^>]*>/g)].map((m) => [m[1], attr(m[0], "href")]);
    for (const want of ["ko", "en", "x-default"]) {
      const h = hl.find(([l]) => l === want);
      if (!h) err(file, `hreflang ${want} 없음`);
      else if (!h[1].startsWith(SITE + "/")) err(file, `hreflang ${want} 이 사이트 주소가 아님: ${h[1]}`);
      else linkTargets.add(new URL(h[1]).pathname + "|" + file);
    }
    for (const p of ["og:title", "og:description", "og:url", "og:image"])
      if (!new RegExp(`property="${p}"`).test(head)) err(file, `${p} 없음`);
  }

  // 본문 제목: h1 하나, 단계 건너뛰지 않기(h2 → h4 금지)
  const heads = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  if (heads.filter((h) => h === 1).length !== 1) err(file, `h1 ${heads.filter((h) => h === 1).length}개`);
  heads.reduce((prev, h) => {
    if (h > prev + 1) err(file, `제목 단계 건너뜀 h${prev} → h${h}`);
    return h;
  }, 0);

  for (const m of html.matchAll(/<img\s[^>]*>/g)) if (attr(m[0], "alt") === null) err(file, `img alt 없음: ${m[0].slice(0, 80)}`);

  // 구조화 데이터
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let data;
    try {
      data = JSON.parse(m[1]);
    } catch (e) {
      err(file, `JSON-LD 파싱 실패: ${e.message}`);
      continue;
    }
    for (const o of [].concat(data)) {
      if (o["@context"] !== "https://schema.org") err(file, `JSON-LD @context: ${o["@context"]}`);
      const type = o["@type"];
      ldCount[type] = (ldCount[type] ?? 0) + 1;
      const check = REQUIRED[type];
      if (!check) err(file, `JSON-LD @type ${type} — 검사 규칙 없음(tools/site-check.mjs 에 더할 것)`);
      else check(o, (what) => err(file, `${type}: ${what}`));
    }
  }

  // 내부 링크(같은 사이트로 가는 href·src)
  for (const m of html.matchAll(/\s(?:href|src)="(\/[^"#?]*)/g)) linkTargets.add(m[1] + "|" + file);
}

for (const [k, v] of titles) if (v.length > 1) err(v.join(", "), `제목이 같습니다: ${k}`);
for (const [k, v] of descs) if (v.length > 1) err(v.join(", "), `설명이 같습니다: ${k.slice(0, 60)}…`);

// 깨진 내부 링크
const exists = (p) => {
  const fp = path.join(dist, decodeURIComponent(p));
  if (p.endsWith("/")) return fs.existsSync(path.join(fp, "index.html"));
  return fs.existsSync(fp) && fs.statSync(fp).isFile();
};
const broken = new Map();
for (const lt of linkTargets) {
  const [p, from] = lt.split("|");
  if (!exists(p)) broken.set(p, [...(broken.get(p) ?? []), from]);
}
for (const [p, from] of broken) err(from.slice(0, 3).join(", ") + (from.length > 3 ? ` 외 ${from.length - 3}` : ""), `깨진 내부 링크 ${p}`);

// sitemap: 색인할 페이지가 모두 들어 있고, 없는 페이지는 없어야 한다
const smFiles = files.filter((f) => /sitemap-\d+\.xml$/.test(f));
if (!smFiles.length) err("sitemap", "sitemap-0.xml 없음");
const inSitemap = new Set(
  smFiles.flatMap((f) => [...fs.readFileSync(f, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])),
);
for (const u of inSitemap) {
  if (!u.startsWith(SITE + "/")) err("sitemap", `사이트 주소가 아님: ${u}`);
  else if (!exists(new URL(u).pathname)) err("sitemap", `없는 페이지: ${u}`);
}
for (const p of indexable) if (!inSitemap.has(SITE + p)) err("sitemap", `빠진 페이지: ${p}`);

// ---- 결과
const kb = Math.round(biggest.size / 1024);
console.log(`사이트 검사: ${htmlFiles.length}쪽(색인 ${indexable.length}) · SITE ${SITE} · 가장 큰 HTML ${biggest.file} ${kb}KB`);
console.log(`구조화 데이터: ${Object.entries(ldCount).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
for (const w of warns) console.warn(`주의 ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`실패 ${errors.length}건`);
  process.exit(1);
}
console.log("✓ 문제 없음");
