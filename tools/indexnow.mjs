// IndexNow — 배포가 끝난 뒤 portdock.dev 의 주소를 Bing·Naver·Yandex 등에 한 번에 알린다(계정 필요 없음).
// 키 파일: site/public/<KEY>.txt(내용 = 키). 공개해도 되는 값이다 — 이 사이트 주소만 알릴 수 있다.
// 쓰기: node tools/indexnow.mjs            (sitemap 의 모든 주소)
//       node tools/indexnow.mjs --dry      (보내지 않고 개수만)
//       node tools/indexnow.mjs URL...     (그 주소만)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "portdock.dev";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keyFile = fs.readdirSync(path.join(ROOT, "site/public")).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error("site/public/<32자리 16진>.txt 키 파일이 없습니다");
const KEY = keyFile.slice(0, 32);

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

async function sitemapUrls() {
  const index = await (await fetch(`https://${HOST}/sitemap-index.xml`)).text();
  const out = [];
  for (const sm of locs(index)) out.push(...locs(await (await fetch(sm)).text()));
  return [...new Set(out)].filter((u) => new URL(u).host === HOST);
}

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const given = args.filter((a) => a.startsWith("https://"));
const urls = given.length ? given : await sitemapUrls();
console.log(`주소 ${urls.length}개`);
if (dry) process.exit(0);
// 키 파일이 배포돼 있어야 받아 준다
const live = await fetch(`https://${HOST}/${KEY}.txt`);
if (!live.ok || (await live.text()).trim() !== KEY) throw new Error(`https://${HOST}/${KEY}.txt 가 아직 배포되지 않았습니다`);
for (let i = 0; i < urls.length; i += 10000) {
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls.slice(i, i + 10000) }),
  });
  console.log(`IndexNow ${r.status} ${r.statusText}`);
  if (r.status >= 300) process.exitCode = 1;
}
