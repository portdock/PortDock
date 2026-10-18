// Plot 화면 점검 — 미리보기 서버(가짜 백엔드 mock.js 의 Plot 부분)에 띄운 PortDock Plot 을 네 경우(언어 × 테마)로 눌러 본다.
// smoke.mjs(일곱 앱 «다 눌러 보기»)와 따로 둔다 — 같은 검사(예외·화면 오류·창 밖 요소·잘린 버튼)를 Plot 흐름에 맞춰 한다.
// 그래프가 실제로 그려졌는지는 canvas 픽셀로 본다(첫 채널 색의 점이 충분히 있는지).
// 사용: (저장소 루트에서) APP=plot PORT=5209 npx vite --config e2e/ui-preview/vite.config.mjs
//       cd e2e && EDGEDRIVER=<msedgedriver.exe> node ui-preview/smoke-plot.mjs      (COMBO=ko-light 로 한 경우만)
// 결과: $OUT(기본 shots/smoke)/plot.json + 단계별 캡처 plot-*.png. 문제가 있으면 종료 코드 1.
import { Builder, By, Key } from "selenium-webdriver";
import edge from "selenium-webdriver/edge.js";
import fs from "node:fs";
import path from "node:path";

const OUT = process.env.OUT ?? "shots/smoke";
const PORT = Number(process.env.PORT ?? 5209);
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
`;

// 창 밖 요소·가로 스크롤·잘린 버튼·빈 고르기·화면 오류(smoke.mjs 의 overflow 와 같은 규칙)
const PROBE = `
const vis = (e) => { if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none'; };
const name = (e) => e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : '') + ' «' + (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30) + '»';
const out = [];
const w = innerWidth;
if (document.documentElement.scrollWidth > w + 1) out.push('page horizontal scroll ' + document.documentElement.scrollWidth + '>' + w);
for (const e of document.querySelectorAll('#root *, .modal-back *')) {
  if (e.closest('svg, datalist, option, .help-text, pre, .ctable-wrap, .rawlog, .report-preview')) continue;
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

// 그래프에 첫 채널 색(model.ts PALETTE 의 1번) 점이 몇 개인지 — 그려졌는지 보는 기준
const INK = `
const c = document.querySelector('.plot-canvas'); if (!c) return -1;
const dark = arguments[0];
const [R, G, B] = dark ? [0x39, 0x87, 0xe5] : [0x2a, 0x78, 0xd6];
const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
let n = 0;
for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - R) + Math.abs(d[i + 1] - G) + Math.abs(d[i + 2] - B) < 60) n++;
return n;
`;

const opts = new edge.Options().addArguments("--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1100,800");
const d = await new Builder().forBrowser("MicrosoftEdge").setEdgeOptions(opts).setEdgeService(new edge.ServiceBuilder(driverPath)).build();
await d.sendDevToolsCommand("Page.addScriptToEvaluateOnNewDocument", { source: HOOK });
const js = (code, ...args) => d.executeScript(code, ...args);

for (const f of fs.readdirSync(OUT)) if (f.startsWith("plot-") && f.endsWith(".png")) fs.rmSync(path.join(OUT, f));
const report = { app: "plot", startedAt: new Date().toISOString(), combos: {} };
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
      const f = `plot-${String(++shotNo).padStart(2, "0")}-${combo.name}-${label}.png`;
      fs.writeFileSync(path.join(OUT, f), Buffer.from(await d.takeScreenshot(), "base64"));
      return f;
    };
    const add = async (step, kind, detail) => findings.push({ step, kind, detail: String(detail).slice(0, 600), shot: await shot(step) });
    async function verify(step) {
      const r = await js(PROBE);
      for (const e of r.errors.slice(errSeen)) await add(step, "exception", e);
      errSeen = r.errors.length;
      if (r.boundary) await add(step, "boundary", r.boundary);
      for (const o of r.overflow) await add(step, "overflow", o);
    }
    async function expect(step, code, ms = 3000, ...args) {
      const t0 = Date.now();
      let v;
      do {
        v = await js(code, ...args);
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
    /** 고르기 값 바꾸기(React 가 받게) */
    const pick = (sel, value, nth = 0) =>
      js(
        "const el = document.querySelectorAll(arguments[0])[arguments[2]]; if (!el) return false; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, arguments[1]); el.dispatchEvent(new Event('change', { bubbles: true })); return true;",
        sel,
        value,
        nth,
      );
    const setInput = (sel, value, nth = 0) =>
      js(
        "const el = document.querySelectorAll(arguments[0])[arguments[2]]; if (!el) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, arguments[1]); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('blur', { bubbles: true })); el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); return true;",
        sel,
        value,
        nth,
      );
    const ko = combo.lang === "ko";
    const dark = combo.theme === "dark";

    await fitWindow();
    await d.get(`http://localhost:${PORT}/`);
    await js("localStorage.clear(); localStorage.setItem('settings', JSON.stringify(arguments[0]));", { lang: combo.lang, theme: combo.theme });
    await d.navigate().refresh();
    await sleep(900);
    errSeen = 0;

    // ---- 첫 화면: 첫 실행 카드 + 도움말 «Simulator 로 따라하기»
    await expect("first-card", "return !!document.querySelector('.plot-first') && document.querySelectorAll('.first-links .link-btn').length === 2");
    await shot("first");
    await click(".first-links .link-btn", ko ? "Simulator 로 따라하기" : "Try it with Simulator");
    await expect("help-tutorial", `const m = document.querySelector('.modal-back'); return !!m && /${ko ? "Simulator 로 따라하기" : "Try it with Simulator"}/.test(m.textContent) && /\\{counter dec\\}/.test(m.textContent)`);
    await shot("help-tutorial");
    await d.actions().sendKeys(Key.ESCAPE).perform();
    await sleep(300);
    await expect("help-closed", "return !document.querySelector('.modal-back')");

    // ---- 시작 실패(COM9 사용 중) → 안내, 그다음 COM3 로 받기
    await pick("aside.side select.port-sel", "COM9");
    await sleep(200);
    await click("aside.side > button.btn.primary");
    await expect("start-busy", "return /시작 실패|Start failed/.test((document.querySelector('aside .status') || {}).textContent || '') && /다른 프로그램|Another program/.test(document.querySelector('aside .status').textContent)");
    await pick("aside.side select.port-sel", "COM3");
    await sleep(200);
    await click("aside.side > button.btn.primary");
    await expect("receiving", `return /${ko ? "받는 중" : "Receiving"}/.test(document.querySelector('aside .status').textContent)`);
    await expect("channels", "const rows = document.querySelectorAll('.ctable tbody tr'); return rows.length === 3 && [...rows].map((r) => r.querySelector('.ch-name').placeholder).join() === 'sin,cos,noise'", 4000);
    let ink = 0;
    for (let k = 0; k < 20 && !(ink > 150); k++, await sleep(150)) ink = await js(INK, dark);
    if (!(ink > 150)) await add("drawn", "expect", `첫 채널 색 점 ${ink}개(150 이하) — 그래프가 그려지지 않음`);
    else passed.push(`drawn(${ink})`);
    await expect("title", `return /COM3 115200 · ${ko ? "받는 중" : "Receiving"} — PortDock Plot/.test(document.title)`);
    await expect("counts", "return /\\d/.test(document.querySelector('.counts').textContent) && !/^0/.test(document.querySelector('.counts span').textContent.trim())");
    await shot("plotting");

    // ---- 원시 수신 — 해석 실패 줄(3초마다)
    await click(".lower-tabs .seg", ko ? "원시 수신" : "Raw input");
    await expect("raw-fail", "return document.querySelectorAll('.rawlog .rrow').length > 10 && /ERR\\? overflow/.test((document.querySelector('.rawlog .rrow.fail') || {}).textContent || '')", 4500);
    await shot("raw");
    await click(".lower-tabs .seg", ko ? "채널" : "Channels");

    // ---- 측정점 A·B (그래프 두 번 누르기)
    const cv = await d.findElement(By.css(".plot-canvas"));
    const rect = await js("const r = document.querySelector('.plot-canvas').getBoundingClientRect(); return [r.width, r.height];");
    await d.actions().move({ origin: cv, x: Math.round(-rect[0] / 4), y: 0 }).click().perform();
    await sleep(150);
    await d.actions().move({ origin: cv, x: Math.round(rect[0] / 4), y: 0 }).click().perform();
    await expect("measure", "return /Δt/.test(document.querySelector('.measure-bar').textContent) && /Δn/.test(document.querySelector('.measure-bar').textContent) && /sin Δ/.test(document.querySelector('.measure-bar').textContent)");
    await shot("measure");

    if (combo.full) {
      // 멈춤 → 받기는 계속(+n) → 실시간
      await click(".plotbar button", ko ? "⏸ 멈춤" : "⏸ Pause");
      await expect("paused", `return /${ko ? "멈춤 — 받기는 계속" : "Paused — still receiving"}/.test(document.querySelector('.notes').textContent)`);
      await expect("paused-count", "return /\\(\\+\\d/.test(document.querySelector('.notes').textContent)", 2000);
      await click(".plotbar button", ko ? "▶ 실시간" : "▶ Live");
      await expect("live", "return !document.querySelector('.notes') || !/⏸/.test(document.querySelector('.notes').textContent)");
      // 휠 확대 → 저절로 멈춤, 두 번 누르기로 실시간
      await js("const c = document.querySelector('.plot-canvas'); const r = c.getBoundingClientRect(); c.dispatchEvent(new WheelEvent('wheel', { deltaY: -200, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true }));");
      await expect("wheel-zoom", "return !!document.querySelector('.notes') && /⏸/.test(document.querySelector('.notes').textContent)");
      await d.actions().doubleClick(cv).perform();
      await expect("dblclick-live", "return (!document.querySelector('.notes') || !/⏸/.test(document.querySelector('.notes').textContent)) && /Δn [1-9]/.test(document.querySelector('.measure-bar').textContent)");
      // 채널: cos 를 오른쪽 축 → «Y 오른쪽», noise 숨기기, sin 이름 바꾸기
      await pick(".ctable tbody tr:nth-child(2) select", "R");
      await expect("right-axis", `return [...document.querySelectorAll('.plotbar .ygroup')].length === 2 && /${ko ? "Y 오른쪽" : "Y right"}/.test(document.querySelector('.plotbar').textContent)`);
      await js("const c = document.querySelector('.ctable tbody tr:nth-child(3) input[type=checkbox]'); c.click();");
      await expect("hide", "return document.querySelector('.ctable tbody tr:nth-child(3)').classList.contains('off')");
      await setInput(".ctable .ch-name", ko ? "전압" : "Volt");
      await expect("rename", `return document.querySelector('.ctable .ch-name').value === '${ko ? "전압" : "Volt"}'`);
      // Y 고정 0~5
      await pick(".plotbar .ygroup select", "fixed");
      await expect("y-fixed", "return document.querySelectorAll('.plotbar .ygroup input').length === 2");
      // 보기: 최근 초
      await pick(".plotbar select.win-mode", "time");
      await expect("time-axis", `return document.querySelector('.plotbar select.win-mode').value === 'time' && document.querySelector('.plotbar input.num').getAttribute('aria-label') === '${ko ? "최근 초" : "Last seconds"}'`);
      await sleep(400);
      await shot("styled");
      // CSV 기록 → 멈춤
      await js("window.__pdMock.dialog.save = 'C:\\\\tmp\\\\rec.csv'");
      await click(".plotbar button", ko ? "● CSV 기록" : "● Record CSV");
      await expect("recording", `return /${ko ? "기록 중" : "Recording"}/.test((document.querySelector('.notes .rec') || {}).textContent || '') && / ● REC — PortDock Plot/.test(document.title)`);
      await sleep(600);
      await click(".plotbar button", ko ? "■ 기록 멈춤" : "■ Stop recording");
      await expect("record-file", `const f = window.__pdMock.files.get('C:\\\\tmp\\\\rec.csv'); return !!f && f.startsWith('\\uFEFFtime,elapsed_s,${ko ? "전압" : "Volt"},cos,noise') && f.split('\\r\\n').length > 20`);
      // 화면 CSV·PNG
      await js("window.__pdMock.dialog.save = 'C:\\\\tmp\\\\view.csv'");
      await click(".plotbar button", ko ? "화면 CSV" : "View CSV");
      await expect("view-csv", "const f = window.__pdMock.files.get('C:\\\\tmp\\\\view.csv'); return !!f && /^\\uFEFFtime,elapsed_s,index,/.test(f) && f.split('\\r\\n').length > 10");
      await js("window.__pdMock.dialog.save = 'C:\\\\tmp\\\\g.png'");
      await click(".plotbar button", "PNG");
      await expect("png", "return / PNG>$/.test(window.__pdMock.files.get('C:\\\\tmp\\\\g.png') || '')");
      // 바이너리 형식 — 틀린 시작 바이트 알림, 프레임 길이
      await pick("aside.side select.fmt-kind", "binary");
      await expect("binary", "return /= /.test((document.querySelector('.frame-len') || {}).textContent || '')");
      await setInput("aside.side input.sync-in", "ZZ");
      await expect("sync-bad", "return /HEX/.test((document.querySelector('aside .interlock') || {}).textContent || '')");
      await shot("binary");
      await setInput("aside.side input.sync-in", "AA 55");
      await pick("aside.side select.fmt-kind", "text");
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

    // ---- 좁은 창: 왼쪽 칸 접힘, 요약 줄
    await fitWindow(760, 600);
    await sleep(400);
    await expect("narrow", "return getComputedStyle(document.querySelector('.narrow-bar')).display !== 'none' && getComputedStyle(document.querySelector('aside.side')).display === 'none'");
    await shot("narrow-760");
    await fitWindow();
    await sleep(200);

    // ---- 멈추기 → 지우기
    await click("aside.side > button.btn.danger");
    await expect("stopped", `return /${ko ? "멈춤" : "Stopped"}/.test(document.querySelector('aside .status').textContent)`);
    await click(".plotbar button", ko ? "지우기" : "Clear");
    await expect("cleared", "return document.querySelector('.counts span').textContent.trim().startsWith('0') || /^(값 0줄|0 rows)/.test(document.querySelector('.counts span').textContent.trim())");

    report.combos[combo.name] = { findings, passed: passed.length };
    if (findings.length) bad = true;
    console.log(`${findings.length ? "❌" : "✅"} ${combo.name} — 통과 ${passed.length}${findings.length ? `, 문제 ${findings.length}` : ""}`);
    for (const f of findings) console.log(`   · [${f.step}] ${f.kind}: ${f.detail.slice(0, 200)} (${f.shot})`);
  }
} finally {
  fs.writeFileSync(path.join(OUT, "plot.json"), JSON.stringify(report, null, 1));
  await d.quit();
}
process.exit(bad ? 1 : 0);
