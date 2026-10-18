// SCPI 화면 점검 — 미리보기 서버(가짜 백엔드 mock.js 의 SCPI 부분)에 띄운 PortDock SCPI 를 네 경우(언어 × 테마)로 눌러 본다.
// smoke.mjs(일곱 앱 «다 눌러 보기»)와 따로 둔다 — 같은 검사(예외·화면 오류·창 밖 요소·잘린 버튼)를 SCPI 흐름에 맞춰 한다.
// 사용: (저장소 루트에서) APP=scpi PORT=5208 npx vite --config e2e/ui-preview/vite.config.mjs
//       cd e2e && EDGEDRIVER=<msedgedriver.exe> node ui-preview/smoke-scpi.mjs      (COMBO=ko-light 로 한 경우만)
// 결과: $OUT(기본 shots/smoke)/scpi.json + 단계별 캡처 scpi-*.png. 문제가 있으면 종료 코드 1.
import { Builder, By, Key } from "selenium-webdriver";
import edge from "selenium-webdriver/edge.js";
import fs from "node:fs";
import path from "node:path";

const OUT = process.env.OUT ?? "shots/smoke";
const PORT = Number(process.env.PORT ?? 5208);
fs.mkdirSync(OUT, { recursive: true });
const driverPath = process.env.EDGEDRIVER ?? path.join(process.env.PD_E2E_TOOLS ?? "C:\\tools", "edgedriver", "msedgedriver.exe");
// 최소 창 1008×740 의 안쪽(smoke.mjs 와 같다)
const INNER = { w: 984, h: 601 };
const COMBOS = [
  { name: "ko-light", lang: "ko", theme: "light", full: true },
  { name: "en-dark", lang: "en", theme: "dark", full: true },
  { name: "ko-dark", lang: "ko", theme: "dark", full: false },
  { name: "en-light", lang: "en", theme: "light", full: false },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HOOK = `
window.__smoke = { errors: [] };
addEventListener('error', (e) => window.__smoke.errors.push('onerror: ' + (e.error && e.error.stack || e.message)));
addEventListener('unhandledrejection', (e) => window.__smoke.errors.push('unhandledrejection: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
const __ce = console.error;
console.error = function (...a) { window.__smoke.errors.push('console.error: ' + a.map((x) => x && x.stack || String(x)).join(' ').slice(0, 600)); return __ce.apply(console, a); };
try { if (navigator.clipboard) navigator.clipboard.writeText = (t) => { window.__smoke.clip = String(t); return Promise.resolve(); }; } catch (e) {}
`;

// 창 밖 요소·가로 스크롤·잘린 버튼·빈 고르기·화면 오류(smoke.mjs 의 overflow 와 같은 규칙)
const PROBE = `
const vis = (e) => { if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none'; };
const name = (e) => e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : '') + ' «' + (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30) + '»';
const out = [];
const w = innerWidth;
if (document.documentElement.scrollWidth > w + 1) out.push('page horizontal scroll ' + document.documentElement.scrollWidth + '>' + w);
for (const e of document.querySelectorAll('#root *, .modal-back *')) {
  if (e.closest('.tlog, svg, datalist, option, .help-text, pre, .mtable-wrap, .report-preview')) continue;
  const r = e.getBoundingClientRect();
  if (!r.width || !r.height || r.right <= w + 1) continue;
  let clipped = false;
  for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (s.overflowX !== 'visible' && p.getBoundingClientRect().right <= w + 1) { clipped = true; break; } }
  if (!clipped && vis(e)) out.push('off-window ' + name(e) + ' right=' + Math.round(r.right));
}
for (const b of document.querySelectorAll('#root button, .modal-back button')) if (vis(b) && b.scrollWidth > b.clientWidth + 1 && b.textContent.trim()) out.push('button text cut ' + name(b) + ' ' + b.clientWidth + '<' + b.scrollWidth);
for (const s of document.querySelectorAll('select')) if (vis(s) && s.selectedIndex < 0) out.push('select shows nothing ' + name(s));
const h = document.querySelector('#root h3');
const boundary = h && /화면 오류가 났습니다|The screen crashed/.test(h.textContent) ? h.textContent : null;
return { overflow: [...new Set(out)].slice(0, 8), errors: window.__smoke.errors.slice(), boundary };
`;

const opts = new edge.Options().addArguments("--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1100,800");
const d = await new Builder().forBrowser("MicrosoftEdge").setEdgeOptions(opts).setEdgeService(new edge.ServiceBuilder(driverPath)).build();
await d.sendDevToolsCommand("Page.addScriptToEvaluateOnNewDocument", { source: HOOK });
const js = (code, ...args) => d.executeScript(code, ...args);

for (const f of fs.readdirSync(OUT)) if (f.startsWith("scpi-") && f.endsWith(".png")) fs.rmSync(path.join(OUT, f));
const report = { app: "scpi", startedAt: new Date().toISOString(), combos: {} };
let shotNo = 0;
let bad = false;

async function fitWindow(w = INNER.w, h = INNER.h) {
  await d.manage().window().setRect({ width: w, height: h });
  const [iw, ih] = await js("return [innerWidth, innerHeight]");
  if (iw !== w || ih !== h) await d.manage().window().setRect({ width: w + (w - iw), height: h + (h - ih) });
}

try {
  for (const combo of COMBOS) {
    if (process.env.COMBO && process.env.COMBO !== combo.name) continue;
    const findings = [];
    const passed = [];
    let errSeen = 0;
    const shot = async (label) => {
      const f = `scpi-${String(++shotNo).padStart(2, "0")}-${combo.name}-${label}.png`;
      fs.writeFileSync(path.join(OUT, f), Buffer.from(await d.takeScreenshot(), "base64"));
      return f;
    };
    const add = async (step, kind, detail) => findings.push({ step, kind, detail: String(detail).slice(0, 600), shot: await shot(step) });
    /** 매 단계 뒤 공통 검사 */
    async function verify(step) {
      const r = await js(PROBE);
      for (const e of r.errors.slice(errSeen)) await add(step, "exception", e);
      errSeen = r.errors.length;
      if (r.boundary) await add(step, "boundary", r.boundary);
      for (const o of r.overflow) await add(step, "overflow", o);
    }
    /** 조건이 참이 될 때까지(최대 ms) — 안 되면 기록 */
    async function expect(step, code, ms = 3000) {
      const t0 = Date.now();
      let v;
      do {
        v = await js(code);
        if (v) break;
        await sleep(100);
      } while (Date.now() - t0 < ms);
      if (!v) await add(step, "expect", code);
      else passed.push(step);
      await verify(step);
      return v;
    }
    const click = (sel, text) =>
      js(
        `const want = arguments[1];
         const el = [...document.querySelectorAll(arguments[0])].find((e) => !want || e.textContent.trim() === want || e.textContent.includes(want));
         if (!el) return false; el.click(); return true;`,
        sel,
        text ?? null,
      );
    const type = async (sel, text, enter = true) => {
      const el = await d.findElement(By.css(sel));
      await el.clear();
      await js("arguments[0].value = ''; arguments[0].dispatchEvent(new Event('input', { bubbles: true }))", el);
      await el.sendKeys(text);
      if (enter) await el.sendKeys(Key.ENTER);
    };
    const lastText = () => js("const e = document.querySelector('.last'); return e ? e.textContent : ''");
    const ko = combo.lang === "ko";

    await fitWindow();
    await d.get(`http://localhost:${PORT}/`);
    await js("localStorage.clear(); localStorage.setItem('settings', JSON.stringify(arguments[0]));", { lang: combo.lang, theme: combo.theme });
    await d.navigate().refresh();
    await sleep(900);
    errSeen = 0;

    // ---- 첫 화면: 첫 실행 카드 + 도움말 «Simulator 로 따라하기» 절
    await expect("first-card", "return !!document.querySelector('.first-card') && document.querySelectorAll('.first-links .link-btn').length === 2");
    await shot("first");
    await click(".first-links .link-btn", ko ? "Simulator 로 따라하기" : "Try it with Simulator");
    await expect("help-tutorial", `return !!document.querySelector('.modal-back') && /${ko ? "Simulator 로 따라하기" : "Try it with Simulator"}/.test(document.querySelector('.modal-back').textContent) && /PORTDOCK,SIM,1/.test(document.querySelector('.modal-back').textContent)`);
    await shot("help-tutorial");
    await d.actions().sendKeys(Key.ESCAPE).perform();
    await sleep(300);
    await expect("help-closed", "return !document.querySelector('.modal-back')");

    // ---- 연결 실패(거부) → 안내, 그다음 정상 연결 → *IDN? 이 장비 칸에
    await type(".side .grid2.net label:first-child input", "10.0.0.99", false);
    await click("aside.side > button.btn.primary");
    await expect("connect-timeout", "return /연결 실패|Connection failed/.test((document.querySelector('aside .status') || {}).textContent || '')", 3000);
    await type(".side .grid2.net label:first-child input", "127.0.0.1", false);
    await click("aside.side > button.btn.primary");
    await expect("connected", "return /연결됨|Connected/.test(document.querySelector('aside .status').textContent)");
    await expect("idn", "return /PORTDOCK/.test((document.querySelector('table.idn') || {}).textContent || '') && /SCPI-SIM/.test(document.querySelector('table.idn').textContent)");
    await expect("title", "return /127\\.0\\.0\\.1:5025 · PORTDOCK SCPI-SIM — PortDock SCPI/.test(document.title)");
    await shot("connected");

    // ---- 질의(Enter) → 숫자 응답·응답 시간, 자주 쓰는 명령 뜻
    await type(".cmd-input", "meas:volt:dc?", false);
    await expect("known-hint", `return /MEAS:VOLT:DC\\?/.test(document.querySelector('.cmd-hint').textContent) && /${ko ? "DC 전압" : "DC voltage"}/.test(document.querySelector('.cmd-hint').textContent)`);
    await d.findElement(By.css(".cmd-input")).sendKeys(Key.ENTER);
    await expect("query", "return /\\+(5\\.0|4\\.99)\\d+E\\+00/.test(document.querySelector('.last-text')?.textContent || '') && / ms/.test(document.querySelector('.last').textContent)");

    if (combo.full) {
      // 쓰기(답 없음)
      await type(".cmd-input", "*RST");
      await expect("write", `return /${ko ? "보냄" : "Sent"}/.test(document.querySelector('.last').textContent)`);
      // 모르는 질의 → 시간 초과 안내 → 오류 큐 비우기에 -113
      await type(".cmd-input", "BOGUS?");
      await expect("timeout", `return /${ko ? "응답 없음" : "No reply"}/.test(document.querySelector('.last').textContent)`, 3000);
      await click(".quick button", ko ? "오류 큐 비우기" : "Drain error queue");
      await expect("errors", "return /-113 Undefined header/.test((document.querySelector('.err-list') || {}).textContent || '')");
      await click(".quick button", ko ? "오류 큐 비우기" : "Drain error queue");
      await expect("errors-none", `return /${ko ? "오류 없음" : "No errors"}/.test(document.querySelector('aside.side').textContent)`);
      // 줄 끝 없는 답 → 받은 것·줄 끝 안내
      await type(".cmd-input", "NOEND?");
      await expect("noend", "return /1\\.23/.test(document.querySelector('.last-partial')?.textContent || '')", 3000);
      // 블록 — HEX 미리보기 + 파일 저장
      await type(".cmd-input", "DATA?");
      await expect("block", "return /#3300/.test(document.querySelector('.block-info')?.textContent || '') && /89 50 4E 47/.test(document.querySelector('.hexdump')?.textContent || '')");
      await shot("block");
      await js("window.__pdMock.dialog.save = 'C:\\\\tmp\\\\shot.png'");
      await click(".block-info button");
      await expect("block-saved", "return window.__pdMock.files.has('C:\\\\tmp\\\\shot.png')");
      // *OPC? 기다림·이력 ↑
      await click(".quick button", ko ? "*OPC? 기다림" : "Wait *OPC?");
      await expect("opc", "return /\\*OPC\\? → 1/.test(document.body.textContent)", 3000);
      await d.findElement(By.css(".cmd-input")).click();
      await d.actions().sendKeys(Key.ARROW_UP).perform();
      await expect("history", "return document.querySelector('.cmd-input').value === 'DATA?'");
      // 명령 목록 «예시 넣기» → ▶
      await click(".cmdlist .cmd-examples");
      await expect("examples", "return document.querySelectorAll('.cmdlist .cmd').length === 3");
      // 통신 기록 — TX·RX·빨간 사건 줄
      await click(".lower-tabs .seg", ko ? "통신 기록" : "Traffic");
      await expect("traffic", "return document.querySelectorAll('.tlog .trow.tx').length > 3 && document.querySelectorAll('.tlog .trow.rx').length > 3 && document.querySelectorAll('.tlog .trow.ev.bad').length >= 1");
      await shot("traffic");
    }

    // ---- 반복 측정 5번 → 표·통계·추세·CSV
    await click(".lower-tabs .seg", ko ? "반복 측정" : "Repeat measurement");
    await js(
      "const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); }; const n = document.querySelectorAll('.mbar input.num'); set(n[0], '100'); set(n[1], '5');",
    );
    await sleep(200);
    await click(".mbar button.primary");
    await expect("measure", "return document.querySelectorAll('.mtable tbody tr').length === 5 && /(값 5개|5 values)/.test(document.querySelector('.mstat').textContent) && !!document.querySelector('.chart canvas')", 5000);
    await shot("measure");
    if (combo.full) {
      await js("window.__pdMock.dialog.save = 'C:\\\\tmp\\\\m.csv'");
      await click(".mbar button", ko ? "CSV 저장" : "Save CSV");
      await expect("csv", "const f = window.__pdMock.files.get('C:\\\\tmp\\\\m.csv'); return !!f && f.split('\\r\\n').length === 8 && /^\\uFEFF# MEAS:VOLT:DC\\?/.test(f)");
      // 넘침 응답
      await type(".meas-cmd", "MEAS:RES?", false);
      await click(".mbar button.primary");
      await expect("overload", "return /\\+OVLD/.test(document.querySelector('.mtable').textContent)", 5000);
      // F1·⚙
      await d.actions().sendKeys(Key.F1).perform();
      await expect("f1", "return !!document.querySelector('.modal-back')");
      await d.actions().sendKeys(Key.ESCAPE).perform();
      await sleep(300);
      await click(".brand-tools .icon-btn", "⚙");
      await expect("settings", "return !!document.querySelector('.modal-back')");
      await shot("settings");
      await d.actions().sendKeys(Key.ESCAPE).perform();
      await sleep(300);
    }

    // ---- 좁은 창: 왼쪽·오른쪽 칸 접힘, 요약 줄
    await fitWindow(760, 600);
    await sleep(300);
    await expect("narrow", "return getComputedStyle(document.querySelector('.narrow-bar')).display !== 'none' && getComputedStyle(document.querySelector('aside.side')).display === 'none'");
    await shot("narrow-760");
    await click(".narrow-only", ko ? "명령 목록" : "Commands");
    await expect("narrow-right", "return getComputedStyle(document.querySelector('aside.right')).display !== 'none'");
    await shot("narrow-commands");
    await fitWindow();
    await sleep(200);

    // ---- 끊기
    await click("aside.side > button.btn.danger");
    await expect("disconnected", "return /끊음|Disconnected/.test(document.querySelector('aside .status').textContent)");

    report.combos[combo.name] = { findings, passed: passed.length };
    if (findings.length) bad = true;
    console.log(`${findings.length ? "❌" : "✅"} ${combo.name} — 통과 ${passed.length}${findings.length ? `, 문제 ${findings.length}` : ""}`);
    for (const f of findings) console.log(`   · [${f.step}] ${f.kind}: ${f.detail.slice(0, 200)} (${f.shot})`);
  }
} finally {
  fs.writeFileSync(path.join(OUT, "scpi.json"), JSON.stringify(report, null, 1));
  await d.quit();
}
process.exit(bad ? 1 : 0);
