// 공유 미리보기 그림(og.png 한국어, og-en.png 영어, 1200×630) 만들기 — 사이트 빌드와 따로, 문구·도구가 바뀔 때만 손으로 돌린다.
//   node site/og/make.mjs
// HTML 로 그려 Microsoft Edge 헤드리스 화면 찍기로 PNG 를 만든다(윈도우 기본 글꼴: Segoe UI·맑은 고딕·Cascadia Mono).
// 결과는 site/public/ 에 그대로 넣어 커밋한다(빌드 서버에는 Edge 가 없다).
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const pub = join(here, "..", "public");
const icon = readFileSync(join(pub, "favicon.svg"), "utf8");

const EDGE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
if (!EDGE) throw new Error("Microsoft Edge 를 찾지 못했습니다");

// 도구 이름은 site/src/data/tools.ts 의 순서·이름과 맞춘다
const TOOLS = ["Serial", "Modbus Slave", "Modbus Master", "TCP", "UDP", "Simulator", "Net Scan", "SCPI", "Plot"];
const TEXT = {
  ko: { file: "og.png", lang: "ko", title: "현장 장비 시험을 위한<br>작고 정확한 통신 도구", tail: "무료 · 오픈소스(GPL-3.0) · 광고 없음 · 윈도우 10·11" },
  en: { file: "og-en.png", lang: "en", title: "Small, precise communication tools<br>for testing hardware", tail: "Free · Open source (GPL-3.0) · No ads · Windows 10 & 11" },
};

const page = (t) => `<!doctype html><html lang="${t.lang}"><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{font-family:"Segoe UI","Malgun Gothic",sans-serif;color:#fff;
  background:radial-gradient(circle at 88% 12%,rgba(79,179,186,.35),transparent 42%),linear-gradient(135deg,#0b6e75 0%,#085a60 55%,#06393d 100%);
  padding:64px 80px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:22px}
.brand svg{width:84px;height:84px;filter:drop-shadow(0 4px 10px rgba(0,0,0,.25))}
.brand svg rect{fill:#0e8189}
.brand b{font-size:60px;font-weight:700;letter-spacing:-.5px}
h1{margin-top:34px;font-size:${t.lang === "ko" ? 50 : 48}px;line-height:1.22;font-weight:700;letter-spacing:-.3px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:32px}
.chips span{font-size:20px;padding:5px 13px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22)}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
.tail{font-size:23px;color:#cfe9eb}
.term{font-family:"Cascadia Mono",Consolas,monospace;font-size:19px;background:rgba(0,0,0,.28);border-radius:10px;padding:10px 16px;line-height:1.5;white-space:nowrap}
.tx{color:#8fe0b0}.rx{color:#a9c6ff}
</style><body>
<div class="brand">${icon}<b>PortDock</b></div>
<h1>${t.title}</h1>
<div class="chips">${TOOLS.map((x) => `<span>${x}</span>`).join("")}</div>
<div class="foot"><div class="tail">${t.tail}</div>
<div class="term"><div class="tx">TX ▶ 01 03 00 00 00 0A C5 CD</div><div class="rx">RX ◀ 01 03 14 00 64 00 C8 …</div></div></div>
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), "portdock-og-"));
try {
  for (const t of Object.values(TEXT)) {
    const html = join(dir, `${t.lang}.html`);
    writeFileSync(html, page(t));
    const out = join(pub, t.file);
    execFileSync(EDGE, ["--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", `--user-data-dir=${join(dir, "edge")}`, "--window-size=1200,630", `--screenshot=${out}`, pathToFileURL(html).href], { stdio: "inherit" });
    console.log("→", out);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
