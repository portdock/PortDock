// «다 눌러 보기» 화면 점검 — 미리보기 서버(가짜 백엔드 mock.js)에 띄운 열두 앱의 버튼·고르기·체크·입력칸을 모두 건드리고
// 예외·화면 오류(Boundary)·창 밖으로 넘친 요소·풀리지 않는 «연결 중»·대화상자 닫은 뒤 포커스 잃음을 찾는다.
// 앱: serial 5201 · modbus-slave 5202 · tcp 5203 · udp 5204 · simulator 5205 · netscan 5206 · modbus-master 5207 · scpi 5208 · plot 5209 · port-inspector 5210 · plc-simulator 5211 · hw-tester 5212
// Port Inspector 는 실행 버튼이 없는 읽기 앱이라 공통 흐름 대신 inspectorFlow 를, Hardware Tester 는 hwFlow 를 돈다(10/25·10/30).
// SCPI·Plot 의 앱별 단계(가짜 계측기 질의·블록·반복 측정 / 그래프 그려짐·측정점·CSV 기록 …)도 이 공통 흐름 안에서 한다(10/19, 옛 smoke-scpi·smoke-plot).
// 사용: (저장소 루트에서 서버 5201~5212 를 띄운 뒤) cd e2e && EDGEDRIVER=<msedgedriver.exe> node ui-preview/smoke.mjs [앱]
// 결과: shots/smoke/<앱>.json (+ 문제가 난 단계의 캡처 shots/smoke/<앱>-*.png)
import { Builder, By, Key } from "selenium-webdriver";
import edge from "selenium-webdriver/edge.js";
import fs from "node:fs";
import path from "node:path";

const OUT = process.env.OUT ?? "shots/smoke";
fs.mkdirSync(OUT, { recursive: true });
const APPS = { serial: 5201, "modbus-slave": 5202, tcp: 5203, udp: 5204, simulator: 5205, netscan: 5206, "modbus-master": 5207, scpi: 5208, plot: 5209, "port-inspector": 5210, "plc-simulator": 5211, "hw-tester": 5212 };
const only = process.argv[2];
const driverPath = process.env.EDGEDRIVER ?? path.join(process.env.PD_E2E_TOOLS ?? "C:\\tools", "edgedriver", "msedgedriver.exe");
// 최소 창 1008×740 의 안쪽(제목줄·테두리 뺀 화면) 크기
const INNER = { w: 984, h: 601 };
// 모든 경우를 다 누르는 조합과 화면만 훑는 조합
const COMBOS = [
  { name: "ko-light", lang: "ko", theme: "light", full: true },
  { name: "en-dark", lang: "en", theme: "dark", full: true },
  { name: "ko-dark", lang: "ko", theme: "dark", full: false },
  { name: "en-light", lang: "en", theme: "light", full: false },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 페이지에 먼저 심는 갈고리: 잡히지 않은 예외·거부된 Promise·console.error 를 모은다
const HOOK = `
window.__smoke = { errors: [] };
addEventListener('error', (e) => window.__smoke.errors.push('onerror: ' + (e.error && e.error.stack || e.message)));
addEventListener('unhandledrejection', (e) => window.__smoke.errors.push('unhandledrejection: ' + (e.reason && e.reason.stack || e.reason)));
// 바깥 요청이 mock.js 의 가로채기를 빠져나가 CSP(vite.config)에 막히면 오류로 — 실제 Sentry 등으로 나갈 뻔한 것
addEventListener('securitypolicyviolation', (e) => window.__smoke.errors.push('CSP blocked (바깥 요청이 가로채기를 빠져나감): ' + e.blockedURI));
const __ce = console.error;
console.error = function (...a) { window.__smoke.errors.push('console.error: ' + a.map((x) => x && x.stack || String(x)).join(' ').slice(0, 600)); return __ce.apply(console, a); };
// 복사(Ctrl+C·우클릭 메뉴)한 글을 잡아 둔다 — 헤드리스에서는 클립보드를 읽을 수 없다
try { if (navigator.clipboard) navigator.clipboard.writeText = (t) => { window.__smoke.clip = String(t); return Promise.resolve(); }; } catch (e) {}
`;

// ---- 페이지 안에서 도는 점검 도구(문자열로 넣는다)
const LIB = `
if (!window.__sm) {
const W = () => innerWidth;
const vis = (e) => { if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none'; };
const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const name = (e) => {
  if (!e) return '?';
  const lab = e.closest('label');
  const t = (e.getAttribute('aria-label') || e.title || e.getAttribute('data-tip-title') || (e.tagName === 'BUTTON' ? e.textContent : '') || e.placeholder || (lab ? lab.textContent : '') || e.className || '').trim().replace(/\\s+/g, ' ').slice(0, 40);
  return e.tagName.toLowerCase() + (e.type && e.tagName === 'INPUT' ? '[' + e.type + ']' : '') + (e.className ? '.' + String(e.className).split(' ')[0] : '') + ' «' + t + '»';
};
const boundary = () => { const h = document.querySelector('#root h3'); return h && /화면 오류가 났습니다|The screen crashed/.test(h.textContent) ? (document.querySelector('#root pre') || {}).textContent || h.textContent : null; };
/** 창 오른쪽 밖으로 나간 요소(잘라 주는 조상이 없는 것) + 가로 스크롤 */
function overflow() {
  const out = [];
  const w = W();
  if (document.documentElement.scrollWidth > w + 1) out.push('page horizontal scroll ' + document.documentElement.scrollWidth + '>' + w);
  for (const e of document.querySelectorAll('#root *, .modal-back *')) {
    if (e.closest('.log, .tlog, svg, datalist, option, .regs, .help-text, pre, .report-preview, .mtable-wrap, .ctable-wrap, .rawlog')) continue;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height || r.right <= w + 1) continue;
    let clipped = false;
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.overflowX !== 'visible' && p.getBoundingClientRect().right <= w + 1) { clipped = true; break; }
    }
    if (!clipped && vis(e)) out.push('off-window ' + name(e) + ' right=' + Math.round(r.right) + ' > ' + w);
  }
  // 대화상자가 창 위아래로 넘쳐 버튼에 닿을 수 없는지(작은 창)
  for (const m of document.querySelectorAll('.modal')) {
    const r = m.getBoundingClientRect();
    if (vis(m) && (r.bottom > innerHeight + 1 || r.top < -1)) out.push('dialog taller than window ' + name(m) + ' ' + Math.round(r.top) + '..' + Math.round(r.bottom) + ' / ' + innerHeight);
  }
  // 글자가 잘린 버튼
  for (const b of document.querySelectorAll('#root button, .modal-back button')) {
    if (vis(b) && b.scrollWidth > b.clientWidth + 1 && b.textContent.trim()) out.push('button text cut ' + name(b) + ' ' + b.clientWidth + '<' + b.scrollWidth);
  }
  // 고르기 값이 목록에 없으면(저장값이 사라진 포트 등) 빈칸으로 보인다
  for (const sel of document.querySelectorAll('select')) if (vis(sel) && sel.selectedIndex < 0) out.push('select shows nothing (value not in list) ' + name(sel));
  return [...new Set(out)].slice(0, 8);
}
const setVal = (el, v) => {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
};
const key = (el, k, extra = {}) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...extra }));
const VALUES = ['', '0', '-1', '99999999999', 'abc', '한글', '  12  ', '1.5'];

/** 범위(root) 안의 모든 버튼·고르기·체크·입력칸을 건드린다. 결과: [{step, kind, detail}] */
async function exercise(root, opts = {}) {
  const findings = [];
  const deadline = Date.now() + (opts.budgetMs || 90000);
  let seen = window.__smoke.errors.length;
  const add = (step, kind, detail) => findings.push({ step, kind, detail: String(detail).slice(0, 700) });
  async function check(step) {
    window.__smActions = (window.__smActions || 0) + 1;
    await raf2();
    for (const e of window.__smoke.errors.slice(seen)) add(step, 'exception', e);
    seen = window.__smoke.errors.length;
    const b = boundary();
    if (b) { add(step, 'boundary', b); throw new Error('boundary'); }
    for (const o of overflow()) add(step, 'overflow', o);
  }
  const done = new WeakSet();
  const perSig = new Map();
  const skip = (e) => e.matches(opts.skip || '#__none') || (opts.scope === 'main' && e.closest('.modal-back'));
  // 기록 줄(누르면 고르고 상세를 보인다)도 누른다
  const candidates = () => [...root.querySelectorAll('button, select, input, textarea, .log .row, .backdrop')].filter((e) => !done.has(e) && vis(e) && !skip(e));
  async function closeModals(step, before) {
    for (let i = 0; i < 3; i++) {
      const open = [...document.querySelectorAll('.modal-back')].filter((m) => !before.includes(m));
      if (!open.length) return;
      const m = open[open.length - 1];
      if (opts.depth == null || opts.depth < 1) {
        // 새로 뜬 창 속도 한 번 눌러 본다(«모두 펼치기» 로 화면 요소가 많아 한 번 검사가 느리다 — 창마다 40초)
        const label = (m.querySelector('[role=dialog],[role=alertdialog]') || m).getAttribute('aria-label') || 'modal';
        findings.push(...(await exercise(m, { ...opts, scope: 'modal', depth: (opts.depth || 0) + 1, skip: (opts.skip ? opts.skip + ',' : '') + '.modal-head button', budgetMs: opts.modalBudgetMs || 40000 })).map((f) => ({ ...f, step: '[' + label + '] ' + f.step })));
      }
      if (!m.isConnected) continue;
      key(window, 'Escape');
      key(document.activeElement || document.body, 'Escape');
      await raf2();
      if (m.isConnected) { const x = m.querySelector('.modal-head button'); if (x) { x.click(); await raf2(); } }
      if (m.isConnected) { add(step, 'modal-stuck', 'Esc·✕ 로 닫히지 않음'); m.remove(); }
      await check(step + ' → close');
    }
  }
  for (let pass = 0; pass < 3; pass++) {
    const list = candidates();
    if (!list.length) break;
    for (const el of list) {
      if (Date.now() > deadline) { add('budget', 'note', '시간 초과로 일부만 눌렀습니다'); return findings; }
      if (!el.isConnected || !vis(el) || el.disabled || done.has(el)) continue;
      done.add(el);
      // 같은 모양이 줄줄이 있으면(레지스터 칸·명령 줄) 셋만
      const sig = el.tagName + '|' + el.className + '|' + (el.type || '') + '|' + (el.parentElement && el.parentElement.className);
      const n = (perSig.get(sig) || 0) + 1;
      perSig.set(sig, n);
      if (n > 3) continue;
      const step = name(el);
      const before = [...document.querySelectorAll('.modal-back')];
      try {
        if (el.tagName === 'BUTTON' || el.tagName === 'DIV') {
          el.click();
          await sleep(30);
          await check('click ' + step);
          await closeModals('click ' + step, before);
        } else if (el.tagName === 'SELECT') {
          const orig = el.value;
          for (const o of [...el.options]) {
            if (o.disabled || !el.isConnected || el.disabled) continue;
            setVal(el, o.value);
            await sleep(20);
            await check('select ' + step + ' = ' + o.textContent.trim().slice(0, 30));
            await closeModals('select ' + step, before);
          }
          if (el.isConnected && !el.disabled && el.value !== orig) { setVal(el, orig); await check('select ' + step + ' restore'); }
        } else if (el.type === 'checkbox' || el.type === 'radio') {
          el.click(); await check('toggle ' + step);
          await closeModals('toggle ' + step, before);
          if (el.isConnected && !el.disabled) { el.click(); await check('toggle back ' + step); }
        } else if (!el.readOnly) {
          const orig = el.value;
          el.focus();
          for (const v of opts.values || VALUES) {
            if (!el.isConnected || el.disabled) break;
            setVal(el, v);
            await check('type ' + step + ' = «' + v + '»');
          }
          if (el.isConnected && !el.disabled) {
            key(el, 'Enter');
            await check('Enter ' + step);
            await closeModals('Enter ' + step, before);
          }
          if (el.isConnected && !el.disabled) {
            setVal(el, orig);
            el.blur();
            await check('restore ' + step);
          }
        }
      } catch (e) {
        if (String(e).includes('boundary')) return findings;
        add(step, 'smoke-error', e && e.stack || e);
      }
    }
  }
  return findings;
}
window.__sm = { exercise, overflow, boundary, name, setVal, key, vis };
}`;

const d = await new Builder()
  .forBrowser("MicrosoftEdge")
  .setEdgeOptions(new edge.Options().addArguments("--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1", "--lang=ko-KR"))
  .setEdgeService(new edge.ServiceBuilder(driverPath))
  .build();
// 다 눌러 보기 한 번(본 화면 한도 + 그 안에서 뜬 창들) 이 이 안에 끝나야 한다 — TCP 한도(BUDGET)에 맞춰 넉넉히
await d.manage().setTimeouts({ script: 480000 });
await d.sendDevToolsCommand("Page.addScriptToEvaluateOnNewDocument", { source: HOOK });

const js = (code, ...args) => d.executeScript(LIB + ";" + code, ...args);
const jsAsync = (code, ...args) => d.executeAsyncScript(LIB + `; const __done = arguments[arguments.length - 1]; (async () => { ${code} })().then(__done, (e) => __done({ fatal: String(e && e.stack || e) }));`, ...args);

let shotNo = 0;
async function shot(app, label) {
  const f = `${app}-${String(++shotNo).padStart(2, "0")}-${label.replace(/[^a-z0-9-]+/gi, "_").slice(0, 50)}.png`;
  fs.writeFileSync(path.join(OUT, f), Buffer.from(await d.takeScreenshot(), "base64"));
  return f;
}

// 다 누르는 조합(full)은 설정 «모두 펼치기(전문가 화면)» 를 켜고 띄운다 — «다 눌러 보기» 는 접힌 <details> 속을 누르지 못한다.
// 화면만 훑는 조합(ko-dark·en-light)은 기본(접힘) 그대로 본다
async function load(port, combo, extra = {}) {
  await d.get(`http://localhost:${port}/`);
  await d.executeScript(
    `localStorage.clear(); localStorage.setItem('settings', JSON.stringify(arguments[0])); localStorage.setItem('lang', JSON.stringify(arguments[0].lang)); for (const [k, v] of Object.entries(arguments[1])) localStorage.setItem(k, JSON.stringify(v));`,
    { lang: combo.lang, theme: combo.theme, expandAll: !!combo.full },
    extra,
  );
  await d.navigate().refresh();
  await sleep(900);
}

/** 화면 안쪽 크기를 최소 창에 맞춘다(헤드리스는 창 크기 = 화면 크기에 가깝지만 확인해서 맞춘다) */
async function fitWindow() {
  await d.manage().window().setRect({ width: INNER.w, height: INNER.h });
  const [iw, ih] = await d.executeScript("return [innerWidth, innerHeight]");
  if (iw !== INNER.w || ih !== INNER.h) await d.manage().window().setRect({ width: INNER.w + (INNER.w - iw), height: INNER.h + (INNER.h - ih) });
}

// 앱마다 다른 것
const RUN_BTN = "aside.side > button.btn.primary, aside.side > button.btn.danger";
/** 실행 중일 때 실행 버튼 글자 */
/** 다 눌러 보기 시간 한도(ms) — 기본 본 화면 90초·뜬 창 40초. TCP 는 방식 탭·자동응답·중계·명령 목록까지 «모두 펼치기» 요소가 가장 많아
 *  90초 안에 idle·running 을 다 못 눌렀다(10/23, 361·471번) — 두 배로 */
// Serial 도 0.3.0 에서 요소가 늘어(직접 입력·최근·복사·Master 로 열기) 본 화면 90초를 넘긴다 — TCP 와 같은 한도
const BUDGET = { tcp: { budgetMs: 180000, modalBudgetMs: 80000 }, serial: { budgetMs: 180000, modalBudgetMs: 80000 } };
const STOP_RE = /^(끊기|멈춤|멈추기|듣기 멈춤|Disconnect|Stop|Stop listening)$/;
const VALID_TEXT = { serial: "01 03 00 00 00 0A", tcp: "STATUS?", udp: "01 02 03 04", simulator: "STATUS OK" };

async function runButton() {
  const els = await d.findElements(By.css(RUN_BTN));
  return els[0];
}
async function state() {
  return js(`
    const b = document.querySelector(${JSON.stringify(RUN_BTN)});
    const st = document.querySelector('aside .status');
    return { btn: b && b.textContent.trim(), disabled: b && b.disabled, status: st && st.textContent.trim(), active: __sm.name(document.activeElement), body: document.activeElement === document.body, errors: window.__smoke.errors.slice(), boundary: __sm.boundary(), overflow: __sm.overflow() };
  `);
}

async function runApp(app, port) {
  for (const f of fs.readdirSync(OUT)) if (f.startsWith(app + "-") && f.endsWith(".png") && (!process.env.COMBO || f.includes(process.env.COMBO))) fs.rmSync(path.join(OUT, f));
  const report = { app, startedAt: new Date().toISOString(), combos: {} };
  for (const combo of COMBOS) {
    if (process.env.COMBO && process.env.COMBO !== combo.name) continue;
    const findings = [];
    const actions = {};
    const add = (step, kind, detail, shotFile) => findings.push({ step, kind, detail: String(detail).slice(0, 700), ...(shotFile ? { shot: shotFile } : {}) });
    let errSeen = 0;
    /** WebDriver 단계 뒤 공통 검사 */
    async function verify(step, { expectFocus } = {}) {
      const s = await state();
      const errs = s.errors.slice(errSeen);
      errSeen = s.errors.length;
      let bad = false;
      for (const e of errs) (add(step, "exception", e), (bad = true));
      if (s.boundary) (add(step, "boundary", s.boundary), (bad = true));
      for (const o of s.overflow) (add(step, "overflow", o), (bad = true));
      if (expectFocus && s.body) (add(step, "focus-lost", `대화상자를 닫은 뒤 포커스가 body 로 갔습니다`), (bad = true));
      if (bad) findings[findings.length - 1].shot = await shot(app, `${combo.name}-${step}`);
      return s;
    }
    async function pageExercise(label, scopeSel, opts = {}) {
      const r = await jsAsync(`return await __sm.exercise(document.querySelector(${JSON.stringify(scopeSel)}) || document, ${JSON.stringify({ scope: "main", ...(BUDGET[app] || {}), ...opts })});`);
      if (r && r.fatal) return add(label, "smoke-error", r.fatal);
      if (r.length) {
        const f = await shot(app, `${combo.name}-${label}`);
        for (const x of r) findings.push({ ...x, step: `${label}: ${x.step}`, shot: f });
      }
      errSeen = (await state()).errors.length;
      actions[label] = await d.executeScript("const n = window.__smActions || 0; window.__smActions = 0; return n;");
    }
    async function waitSettled(step, want) {
      // 2초 안에 «연결 중» 이 풀리고(버튼이 다시 눌리고) 원하는 상태가 되는지
      const t0 = Date.now();
      let s;
      do {
        await sleep(200);
        s = await state();
      } while (Date.now() - t0 < 2000 && (s.disabled || (want && !want(s))));
      if (s.disabled) add(step, "stuck", `2초 뒤에도 실행 버튼이 눌리지 않음 (${s.btn} · ${s.status})`, await shot(app, `${combo.name}-${step}`));
      else if (want && !want(s)) add(step, "state", `예상과 다른 상태: 버튼 «${s.btn}» · 상태 «${s.status}»`, await shot(app, `${combo.name}-${step}`));
      return s;
    }
    async function clickRun(step, want) {
      // 좁은 창(≤1180, smoke 기본 984)에서 줄·«명령 목록» 을 누르면 오른쪽 서랍과 덮개(.backdrop)가 열린 채 남는다 — 사람처럼 닫고 누른다
      await closeRight();
      const b = await runButton();
      if (!b) return add(step, "smoke-error", "실행 버튼을 못 찾음");
      await b.click();
      const s = await waitSettled(step, want);
      await verify(step);
      return s;
    }
    const mock = (code) => d.executeScript(`return (window.__pdMock && (${code}))`);
    const conv = (step, detail, shotIt = true) => (async () => add(step, "convenience", detail, shotIt ? await shot(app, `${combo.name}-${step}`) : undefined))();
    const blur = () => d.executeScript("document.activeElement && document.activeElement.blur && document.activeElement.blur()");
    const keys = async (...k) => {
      await d.actions().sendKeys(...k).perform();
      await sleep(200);
    };
    const chord = async (mods, key) => {
      let a = d.actions();
      for (const m of mods) a = a.keyDown(m);
      a = a.sendKeys(key);
      for (const m of [...mods].reverse()) a = a.keyUp(m);
      await a.perform();
      await sleep(250);
    };
    const calls = (name) => js(`return window.__pdMock.calls.filter((c) => c === ${JSON.stringify(name)}).length`);
    /** Serial 은 좁은 창(≤1180)에서 줄을 누르면 오른쪽 칸(상세)이 열린다 — 다음 클릭이 가림막에 막히지 않게 닫는다. 열렸는지 돌려준다 */
    const closeRight = () => js("const open = !!document.querySelector('.app.show-right'); if (open) document.querySelector('.close-right').click(); return open;");

    // ---- (10/19) SCPI·Plot 앱별 단계 — 옛 smoke-scpi.mjs·smoke-plot.mjs 를 공통 흐름에 합쳤다
    const ko = combo.lang === "ko";
    /** 조건(페이지에서 도는 JS, return 값)이 참이 될 때까지(최대 ms). 안 되면 «expect» 로 기록 */
    async function expectJs(step, code, ms = 3000, ...args) {
      const t0 = Date.now();
      let v;
      do {
        v = await d.executeScript(code, ...args);
        if (v) break;
        await sleep(100);
      } while (Date.now() - t0 < ms);
      if (!v) add(step, "expect", code, await shot(app, `${combo.name}-${step}`));
      else actions.checks = (actions.checks ?? 0) + 1;
      await verify(step);
      return v;
    }
    /** 고른 칸 중 글자가 맞는(또는 text 가 없으면 첫) 요소를 누른다 */
    const clickText = (sel, text) =>
      d.executeScript(
        `const want = arguments[1];
         const el = [...document.querySelectorAll(arguments[0])].find((e) => !want || e.textContent.trim() === want || e.textContent.includes(want));
         if (!el) return false; el.click(); return true;`,
        sel,
        text ?? null,
      );
    /** 입력칸에 실제 키로 쓰기(필요하면 Enter) */
    const typeInto = async (sel, text, enter = true) => {
      const el = await d.findElement(By.css(sel));
      await d.executeScript("arguments[0].value = ''; arguments[0].dispatchEvent(new Event('input', { bubbles: true }))", el);
      await el.sendKeys(text);
      if (enter) await el.sendKeys(Key.ENTER);
    };
    /** 고르기·입력칸 값 바꾸기(React 가 받게). nth 번째 */
    const setIn = (sel, value, nth = 0) =>
      d.executeScript(
        `const el = document.querySelectorAll(arguments[0])[arguments[2]]; if (!el) return false;
         const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
         Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, arguments[1]);
         el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
         if (el.tagName !== 'SELECT') { el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); }
         return true;`,
        sel,
        value,
        nth,
      );
    /** 좁은 창(760×600)으로 줄였다가(다시 불러오지 않고) 돌아온다 — 실행 중 화면이 접히는지 */
    async function narrowLive(extra) {
      await d.manage().window().setRect({ width: 760, height: 600 });
      const [iw, ih] = await d.executeScript("return [innerWidth, innerHeight]");
      if (iw !== 760 || ih !== 600) await d.manage().window().setRect({ width: 760 + (760 - iw), height: 600 + (600 - ih) });
      await sleep(400);
      await expectJs("narrow live", "return getComputedStyle(document.querySelector('.narrow-bar')).display !== 'none' && getComputedStyle(document.querySelector('aside.side')).display === 'none'");
      if (combo.full) await shot(app, `${combo.name}-narrow-760-live`);
      if (extra) await extra();
      await fitWindow();
      await sleep(200);
    }

    /** SCPI·Plot 첫 실행 카드(링크 둘)와 도움말 «Simulator 로 따라하기» 절 */
    async function tutorialCard() {
      const card = app === "plot" ? ".plot-first" : ".first-card";
      await expectJs("first card", `return !!document.querySelector('${card}') && document.querySelectorAll('.first-links .link-btn').length === 2`);
      await clickText(".first-links .link-btn", ko ? "Simulator 로 따라하기" : "Try it with Simulator");
      const mark = app === "plot" ? "\\{counter dec\\}" : "PORTDOCK,SIM,1";
      await expectJs("help tutorial", `const m = document.querySelector('.modal-back'); return !!m && /${ko ? "Simulator 로 따라하기" : "Try it with Simulator"}/.test(m.textContent) && /${mark}/.test(m.textContent)`);
      if (combo.full) await shot(app, `${combo.name}-help-tutorial`);
      await keys(Key.ESCAPE);
      await expectJs("help tutorial closed", "return !document.querySelector('.modal-back')");
    }

    /** SCPI — 연결된 상태에서: *IDN? 장비 칸·창 제목·질의·(full) 쓰기·시간 초과·오류 큐·줄 끝 없는 답·블록·*OPC?·이력·예시·통신 기록 → 반복 측정 → 좁은 창 */
    async function scpiRun() {
      await expectJs("scpi idn", "return /PORTDOCK/.test((document.querySelector('table.idn') || {}).textContent || '') && /SCPI-SIM/.test(document.querySelector('table.idn').textContent)");
      await expectJs("scpi title", "return /:5025 · PORTDOCK SCPI-SIM — PortDock SCPI/.test(document.title)");
      await typeInto(".cmd-input", "meas:volt:dc?", false);
      await expectJs("scpi known hint", `return /MEAS:VOLT:DC\\?/.test(document.querySelector('.cmd-hint').textContent) && /${ko ? "DC 전압" : "DC voltage"}/.test(document.querySelector('.cmd-hint').textContent)`);
      await (await d.findElement(By.css(".cmd-input"))).sendKeys(Key.ENTER);
      await expectJs("scpi query", "return /\\+(5\\.0|4\\.99)\\d+E\\+00/.test((document.querySelector('.last-text') || {}).textContent || '') && / ms/.test(document.querySelector('.last').textContent)");
      if (combo.full) {
        await typeInto(".cmd-input", "*RST");
        await expectJs("scpi write", `return /${ko ? "보냄" : "Sent"}/.test(document.querySelector('.last').textContent)`);
        // 모르는 질의 → 시간 초과 안내 → 오류 큐 비우기에 -113 → 다시 비우면 «오류 없음»
        await typeInto(".cmd-input", "BOGUS?");
        await expectJs("scpi timeout", `return /${ko ? "응답 없음" : "No reply"}/.test(document.querySelector('.last').textContent)`, 3000);
        await clickText(".quick button", ko ? "오류 큐 비우기" : "Drain error queue");
        await expectJs("scpi errors", "return /-113 Undefined header/.test((document.querySelector('.err-list') || {}).textContent || '')");
        await clickText(".quick button", ko ? "오류 큐 비우기" : "Drain error queue");
        await expectJs("scpi errors none", `return /${ko ? "오류 없음" : "No errors"}/.test(document.querySelector('aside.side').textContent)`);
        await typeInto(".cmd-input", "NOEND?");
        await expectJs("scpi no line end", "return /1\\.23/.test((document.querySelector('.last-partial') || {}).textContent || '')", 3000);
        // 블록 — HEX 미리보기 + 파일 저장
        await typeInto(".cmd-input", "DATA?");
        await expectJs("scpi block", "return /#3300/.test((document.querySelector('.block-info') || {}).textContent || '') && /89 50 4E 47/.test((document.querySelector('.hexdump') || {}).textContent || '')");
        if (combo.name === "ko-light") await shot(app, `${combo.name}-block`);
        await d.executeScript("window.__pdMock.dialog.save = 'C:\\\\tmp\\\\shot.png'");
        await clickText(".block-info button");
        await expectJs("scpi block saved", "return window.__pdMock.files.has('C:\\\\tmp\\\\shot.png')");
        await d.executeScript("window.__pdMock.dialog.save = null");
        await clickText(".quick button", ko ? "*OPC? 기다림" : "Wait *OPC?");
        await expectJs("scpi opc", "return /\\*OPC\\? → 1/.test(document.body.textContent)", 3000);
        await (await d.findElement(By.css(".cmd-input"))).click();
        await keys(Key.ARROW_UP);
        await expectJs("scpi history", "return document.querySelector('.cmd-input').value === 'DATA?'");
        await clickText(".cmdlist .cmd-examples");
        await expectJs("scpi examples", "return document.querySelectorAll('.cmdlist .cmd').length === 3");
        await clickText(".lower-tabs .seg", ko ? "통신 기록" : "Traffic");
        await expectJs("scpi traffic", "return document.querySelectorAll('.tlog .trow.tx').length > 3 && document.querySelectorAll('.tlog .trow.rx').length > 3 && document.querySelectorAll('.tlog .trow.ev.bad').length >= 1");
        if (combo.name === "ko-light") await shot(app, `${combo.name}-traffic`);
      }
      // 반복 측정 5번 → 표·통계·추세
      await clickText(".lower-tabs .seg", ko ? "반복 측정" : "Repeat measurement");
      await sleep(150);
      await setIn(".mbar input.num", "100", 0);
      await setIn(".mbar input.num", "5", 1);
      await blur();
      await sleep(200);
      await clickText(".mbar button.primary");
      await expectJs("scpi measure", "return document.querySelectorAll('.mtable tbody tr').length === 5 && /(값 5개|5 values)/.test(document.querySelector('.mstat').textContent) && !!document.querySelector('.chart canvas')", 5000);
      if (combo.full) await shot(app, `${combo.name}-measure`);
      if (combo.full) {
        await d.executeScript("window.__pdMock.dialog.save = 'C:\\\\tmp\\\\m.csv'");
        await clickText(".mbar button", ko ? "CSV 저장" : "Save CSV");
        await expectJs("scpi csv", "const f = window.__pdMock.files.get('C:\\\\tmp\\\\m.csv'); return !!f && f.split('\\r\\n').length === 8 && /^\\uFEFF# MEAS:VOLT:DC\\?/.test(f)");
        await d.executeScript("window.__pdMock.dialog.save = null");
        await typeInto(".meas-cmd", "MEAS:RES?", false);
        await clickText(".mbar button.primary");
        await expectJs("scpi overload", "return /\\+OVLD/.test(document.querySelector('.mtable').textContent)", 5000);
      }
      // 좁은 창: 왼쪽·오른쪽 칸 접힘, «명령 목록» 으로 오른쪽 칸
      await narrowLive(async () => {
        await clickText(".narrow-only", ko ? "명령 목록" : "Commands");
        await expectJs("scpi narrow commands", "return getComputedStyle(document.querySelector('aside.right')).display !== 'none'");
        if (combo.full) await shot(app, `${combo.name}-narrow-commands`);
        await d.executeScript("const b = document.querySelector('.close-right'); b && b.click();");
        await sleep(150);
      });
    }

    // 그래프에 첫 채널 색(model.ts PALETTE 의 1번) 점이 몇 개인지 — 그려졌는지 보는 기준
    const INK = `
      const c = document.querySelector('.plot-canvas'); if (!c) return -1;
      const [R, G, B] = arguments[0] ? [0x39, 0x87, 0xe5] : [0x2a, 0x78, 0xd6];
      const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < px.length; i += 4) if (Math.abs(px[i] - R) + Math.abs(px[i + 1] - G) + Math.abs(px[i + 2] - B) < 60) n++;
      return n;`;

    /** Plot — 받는 중에: 채널 표·그래프가 실제로 그려졌는지·창 제목·받은 양·원시 수신 실패 줄·측정점 A·B·(full) 멈춤·휠·축·Y 고정·최근 초·CSV 기록·화면 CSV·PNG·바이너리 → 좁은 창 */
    async function plotRun() {
      const dark = combo.theme === "dark";
      await expectJs("plot channels", "const rows = document.querySelectorAll('.ctable tbody tr'); return rows.length === 3 && [...rows].map((r) => r.querySelector('.ch-name').placeholder).join() === 'sin,cos,noise'", 4000);
      let ink = 0;
      for (let k = 0; k < 20 && !(ink > 150); k++, await sleep(150)) ink = await d.executeScript(INK, dark);
      if (!(ink > 150)) add("plot drawn", "expect", `첫 채널 색 점 ${ink}개(150 이하) — 그래프가 그려지지 않음`, await shot(app, `${combo.name}-plot-drawn`));
      await expectJs("plot title", `return /COM3 115200 · ${ko ? "받는 중" : "Receiving"} — PortDock Plot/.test(document.title)`);
      await expectJs("plot counts", "return /\\d/.test(document.querySelector('.counts').textContent) && !/^0/.test(document.querySelector('.counts span').textContent.trim())");
      if (combo.full) await shot(app, `${combo.name}-plotting`);
      // 원시 수신 — 해석 실패 줄(3초마다)
      await clickText(".lower-tabs .seg", ko ? "원시 수신" : "Raw input");
      await expectJs("plot raw fail", "return document.querySelectorAll('.rawlog .rrow').length > 10 && /ERR\\? overflow/.test((document.querySelector('.rawlog .rrow.fail') || {}).textContent || '')", 4500);
      await clickText(".lower-tabs .seg", ko ? "채널" : "Channels");
      // 측정점 A·B (그래프 두 번 누르기)
      const cv = await d.findElement(By.css(".plot-canvas"));
      const rect = await d.executeScript("const r = document.querySelector('.plot-canvas').getBoundingClientRect(); return [r.width, r.height];");
      await d.actions().move({ origin: cv, x: Math.round(-rect[0] / 4), y: 0 }).click().perform();
      await sleep(150);
      await d.actions().move({ origin: cv, x: Math.round(rect[0] / 4), y: 0 }).click().perform();
      await expectJs("plot markers", "const t = document.querySelector('.measure-bar').textContent; return /Δt/.test(t) && /Δn/.test(t) && /sin Δ/.test(t)");
      if (combo.full) {
        // 멈춤 → 받기는 계속(+n) → 실시간
        await clickText(".plotbar button", ko ? "⏸ 멈춤" : "⏸ Pause");
        await expectJs("plot paused", `return /${ko ? "멈춤 — 받기는 계속" : "Paused — still receiving"}/.test(document.querySelector('.notes').textContent)`);
        await expectJs("plot paused count", "return /\\(\\+\\d/.test(document.querySelector('.notes').textContent)", 2000);
        await clickText(".plotbar button", ko ? "▶ 실시간" : "▶ Live");
        await expectJs("plot live", "return !document.querySelector('.notes') || !/⏸/.test(document.querySelector('.notes').textContent)");
        // 휠 확대 → 저절로 멈춤, 두 번 누르기로 실시간(측정점은 그대로)
        await d.executeScript("const c = document.querySelector('.plot-canvas'); const r = c.getBoundingClientRect(); c.dispatchEvent(new WheelEvent('wheel', { deltaY: -200, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true }));");
        await expectJs("plot wheel zoom", "return !!document.querySelector('.notes') && /⏸/.test(document.querySelector('.notes').textContent)");
        await d.actions().doubleClick(cv).perform();
        await expectJs("plot dblclick live", "return (!document.querySelector('.notes') || !/⏸/.test(document.querySelector('.notes').textContent)) && /Δn [1-9]/.test(document.querySelector('.measure-bar').textContent)");
        // 채널: cos 를 오른쪽 축 → «Y 오른쪽», noise 숨기기, sin 이름 바꾸기
        await setIn(".ctable tbody tr:nth-child(2) select", "R");
        await expectJs("plot right axis", `return [...document.querySelectorAll('.plotbar .ygroup')].length === 2 && /${ko ? "Y 오른쪽" : "Y right"}/.test(document.querySelector('.plotbar').textContent)`);
        await d.executeScript("document.querySelector('.ctable tbody tr:nth-child(3) input[type=checkbox]').click();");
        await expectJs("plot hide", "return document.querySelector('.ctable tbody tr:nth-child(3)').classList.contains('off')");
        await setIn(".ctable .ch-name", ko ? "전압" : "Volt");
        await expectJs("plot rename", `return document.querySelector('.ctable .ch-name').value === '${ko ? "전압" : "Volt"}'`);
        await setIn(".plotbar .ygroup select", "fixed");
        await expectJs("plot y fixed", "return document.querySelectorAll('.plotbar .ygroup input').length === 2");
        await setIn(".plotbar select.win-mode", "time");
        await expectJs("plot time axis", `return document.querySelector('.plotbar select.win-mode').value === 'time' && document.querySelector('.plotbar input.num').getAttribute('aria-label') === '${ko ? "최근 초" : "Last seconds"}'`);
        await sleep(400);
        if (combo.name === "ko-light") await shot(app, `${combo.name}-styled`);
        // CSV 기록 → 멈춤
        await d.executeScript("window.__pdMock.dialog.save = 'C:\\\\tmp\\\\rec.csv'");
        await clickText(".plotbar button", ko ? "● CSV 기록" : "● Record CSV");
        await expectJs("plot recording", `return /${ko ? "기록 중" : "Recording"}/.test((document.querySelector('.notes .rec') || {}).textContent || '') && / ● REC — PortDock Plot/.test(document.title)`);
        await sleep(600);
        await clickText(".plotbar button", ko ? "■ 기록 멈춤" : "■ Stop recording");
        await expectJs("plot record file", `const f = window.__pdMock.files.get('C:\\\\tmp\\\\rec.csv'); return !!f && f.startsWith('\\uFEFFtime,elapsed_s,${ko ? "전압" : "Volt"},cos,noise') && f.split('\\r\\n').length > 20`);
        // 화면 CSV·PNG
        await d.executeScript("window.__pdMock.dialog.save = 'C:\\\\tmp\\\\view.csv'");
        await clickText(".plotbar button", ko ? "화면 CSV" : "View CSV");
        await expectJs("plot view csv", "const f = window.__pdMock.files.get('C:\\\\tmp\\\\view.csv'); return !!f && /^\\uFEFFtime,elapsed_s,index,/.test(f) && f.split('\\r\\n').length > 10");
        await d.executeScript("window.__pdMock.dialog.save = 'C:\\\\tmp\\\\g.png'");
        await clickText(".plotbar button", "PNG");
        await expectJs("plot png", "return / PNG>$/.test(window.__pdMock.files.get('C:\\\\tmp\\\\g.png') || '')");
        await d.executeScript("window.__pdMock.dialog.save = null");
        // 바이너리 형식 — 틀린 시작 바이트 알림, 프레임 길이
        await setIn("aside.side select.fmt-kind", "binary");
        await expectJs("plot binary", "return /= /.test((document.querySelector('.frame-len') || {}).textContent || '')");
        await setIn("aside.side input.sync-in", "ZZ");
        await expectJs("plot sync bad", "return /HEX/.test((document.querySelector('aside .interlock') || {}).textContent || '')");
        if (combo.name === "ko-light") await shot(app, `${combo.name}-binary`);
        await setIn("aside.side input.sync-in", "AA 55");
        await setIn("aside.side select.fmt-kind", "text");
        await blur();
      }
      await narrowLive();
    }

    /** (10/18) 첫 실행 카드(Serial «무엇을 하나요?»·Slave·Net Scan «처음 쓰는 순서»)·도움말 절 링크·Serial 용도 프리셋·빈 명령 목록 «예시 넣기» */
    async function firstRun() {
      if (app === "scpi" || app === "plot") await tutorialCard();
      const card = await js(`const c = document.querySelector('.first-card'); return c && { title: (c.querySelector('.first-head b') || {}).textContent, picks: c.querySelectorAll('.first-picks button').length, links: [...c.querySelectorAll('.first-links .link-btn')].map((b) => b.textContent), hide: !!c.querySelector('.first-hide') };`);
      if (app === "serial" || app === "modbus-slave" || app === "netscan") {
        const want = { serial: 3, "modbus-slave": 2, netscan: 0 }[app];
        if (!card || card.picks !== want || !card.links.length || !card.hide) await conv("first-card", `첫 실행 카드 모양이 이상함(고르기 ${want}개·도움말 링크·다시 보지 않기 기대): ${JSON.stringify(card)}`);
        else {
          // 도움말 링크 → 그 절이 열린 채로
          const links = await d.findElements(By.css(".first-card .first-links .link-btn"));
          await links[links.length - 1].click();
          await sleep(250);
          const h = await js("const a = document.querySelector('.modal.help .help-link.on'); return a && a.textContent");
          const wantRe = app === "serial" ? /Modbus/ : /처음 쓰는 순서|Getting started/;
          if (!h || !wantRe.test(h)) await conv("first-help", `카드의 도움말 링크로 연 절이 «${h}»`);
          await keys(Key.ESCAPE);
          await verify("first-card help");
          if (combo.name === "ko-light" || combo.name === "en-dark") await shot(app, `${combo.name}-first-card`);
        }
      }
      if (app === "serial" && combo.full && card) {
        // «Modbus 장비 값 읽기» → 용도 Modbus RTU·HEX + CRC16·줄 끝 없음·예시 2개(«예:»)·카드 사라짐
        const r = await jsAsync(`
          const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
          const sr = document.querySelector('.sendbar .sendrow'); const sels = [...sr.querySelectorAll('select')];
          const now = () => ({ preset: document.querySelector('.preset-sel').value, opt: document.querySelector('.preset-sel').selectedOptions[0].textContent, again: !!document.querySelector('.preset-again'), mode: sels.find((x) => x.querySelector('option[value=ascii]')).value, suffix: sels[sels.length - 1].value, baud: document.querySelector('input[list=bauds]').value, names: [...document.querySelectorAll('.cmdname')].map((e) => e.value), card: !!document.querySelector('.log .first-card'), note: document.querySelector('.preset-note').textContent });
          document.querySelector('.first-card .first-modbus').click(); await w(400);
          const a = now();
          const toast = (document.querySelector('.toast') || {}).textContent || '';
          // 속도를 고치면 «(바꿈)» + ↺ → ↺ 로 되돌림
          __sm.setVal(document.querySelector('input[list=bauds]'), '19200'); document.querySelector('input[list=bauds]').blur(); await w();
          const b = now();
          if (document.querySelector('.preset-again')) document.querySelector('.preset-again').click(); await w();
          const c = now();
          // 용도 고르기로 AT 명령
          __sm.setVal(document.querySelector('.preset-sel'), 'at'); await w();
          const e = now();
          return { a, toast, b, c, e };`);
        if (r.fatal) add("preset", "smoke-error", r.fatal);
        else {
          const ex = /^(예: |e\.g\. )/;
          if (r.a.preset !== "modbus" || r.a.mode !== "hex" || r.a.suffix !== "" || r.a.baud !== "9600" || r.a.card || r.a.names.length !== 2 || !r.a.names.every((n) => ex.test(n)) || !r.toast) await conv("first-modbus", `«Modbus 장비 값 읽기» 결과가 이상함: ${JSON.stringify({ a: r.a, toast: r.toast })}`);
          if (!/\((바꿈|changed)\)/.test(r.b.opt) || !r.b.again) await conv("preset-changed", `속도를 바꿨는데 «(바꿈)»·↺ 가 없음: ${JSON.stringify(r.b)}`);
          if (r.c.baud !== "9600" || /\((바꿈|changed)\)/.test(r.c.opt) || r.c.again) await conv("preset-again", `↺ 로 프리셋 값이 돌아오지 않음: ${JSON.stringify(r.c)}`);
          if (r.e.preset !== "at" || r.e.mode !== "ascii" || r.e.suffix !== "\\r\\n" || r.e.baud !== "115200" || /\((바꿈|changed)\)/.test(r.e.opt)) await conv("preset-at", `용도 «AT 명령» 결과가 이상함: ${JSON.stringify(r.e)}`);
          if (combo.name === "ko-light") await shot(app, `${combo.name}-preset-at`);
        }
        await verify("preset");
        await load(port, combo);
      }
      // (10/18) Master 첫 실행 카드: «어떤 장비인가요?» [Modbus TCP][Modbus RTU] → 연결 방식·다음 칸 포커스, 주소 표기, 도움말 링크, 연결하면 숨음
      if (app === "modbus-master") {
        const r = await jsAsync(`
          const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
          const c = document.querySelector('.first-card');
          if (!c) return { card: false };
          const tr = () => [...document.querySelectorAll('aside.side select')].find((s) => s.querySelector('option[value=rtu-tcp]')).value;
          const a = { card: true, picks: c.querySelectorAll('.first-picks button').length, links: c.querySelectorAll('.first-links .link-btn').length };
          c.querySelector('.first-tcp').click(); await w();
          a.tcp = tr(); a.focusTcp = document.activeElement && document.activeElement.closest('.grid2.net') ? true : false;
          document.querySelector('.first-card .first-rtu').click(); await w();
          a.rtu = tr(); a.focusRtu = document.activeElement && document.activeElement.classList.contains('port-sel');
          const segs = [...document.querySelectorAll('.first-card .first-addr .seg')];
          segs[2].click(); await w(150);
          a.plc = [...document.querySelectorAll('.main .toolbar select')].find((s) => s.querySelector('option[value=plc]')).value;
          segs[0].click(); await w(150);
          return a;`);
        if (r.fatal) add("mm first card", "smoke-error", r.fatal);
        else if (!r.card || r.picks !== 2 || !r.links || r.tcp !== "tcp" || !r.focusTcp || r.rtu !== "serial" || !r.focusRtu || r.plc !== "plc") await conv("mm-first-card", `Master 첫 실행 카드가 이상함: ${JSON.stringify(r)}`);
        if (combo.name === "ko-light" || combo.name === "en-dark") await shot(app, `${combo.name}-first-card`);
        await verify("mm first card");
        await load(port, combo);
      }
      // (0.2.0) 명령줄 인자: «--tcp 192.168.7.20:1502 --unit 3 --x» → Modbus TCP·주소·포트·국번이 채워지고(연결은 안 함) 알림 한 줄, 모르는 인자는 «무시»
      if (app === "modbus-master" && combo.full) {
        await d.get(`http://localhost:${port}/?args=${encodeURIComponent(JSON.stringify(["--tcp", "192.168.7.20:1502", "--unit", "3", "--x"]))}`);
        await sleep(900);
        const r = await js(`
          const tr = [...document.querySelectorAll('aside.side select')].find((s) => s.querySelector('option[value=rtu-tcp]'));
          const net = [...document.querySelectorAll('aside.side .grid2.net input')].map((i) => i.value);
          const unit = [...document.querySelectorAll('.main .toolbar input.num')][0];
          const toast = document.querySelector('.toast');
          const run = document.querySelector(${JSON.stringify(RUN_BTN)});
          return { tr: tr && tr.value, net, unit: unit && unit.value, toast: toast && toast.textContent, err: !!toast && toast.classList.contains('error'), run: run && run.textContent.trim() };`);
        if (r.tr !== "tcp" || !r.net.includes("192.168.7.20") || !r.net.includes("1502") || r.unit !== "3" || !/192\.168\.7\.20:1502/.test(r.toast ?? "") || !/--x/.test(r.toast ?? "") || !r.err || !/^(연결|Connect)$/.test(r.run ?? ""))
          await conv("mm-launch-args", `명령줄 인자로 채운 설정이 이상함: ${JSON.stringify(r)}`);
        if (combo.name === "ko-light") await shot(app, `${combo.name}-launch-args`);
        await verify("mm launch args");
        await load(port, combo);
      }
      // (10/18) Slave 첫 실행 카드: 주소 부르는 법(가운데 위 «주소 표기» 와 같은 값) · «예제 채우기»(보유 레지스터 0~9, 이름·F32 CDAB 23.5) · «CSV 가져오기…»
      if (app === "modbus-slave" && combo.full && card) {
        const r = await jsAsync(`
          const w = (ms = 300) => new Promise((r) => setTimeout(r, ms));
          const mode = () => [...document.querySelectorAll('.main .toolbar select')].find((s) => s.querySelector('option[value=plc]')).value;
          const segs = [...document.querySelectorAll('.first-card .first-addr .seg')];
          segs[2].click(); await w(200);
          const plc = mode();
          segs[0].click(); await w(200);
          const zero = mode();
          document.querySelector('.first-card .first-example').click(); await w(900);
          const cells = [...document.querySelectorAll('.regs .reg')];
          const wide = document.querySelector('.regs .reg.wide');
          const a = { segs: segs.length, plc, zero, toast: (document.querySelector('.toast') || {}).textContent || '', v0: cells[0] && cells[0].querySelector('.regval').value, v7: cells[7] && cells[7].querySelector('.regval').value,
            n0: cells[0] && (cells[0].querySelector('.rname') || {}).textContent, wide: wide && { tag: wide.querySelector('.rtype').textContent, v: wide.querySelector('.regval').value, name: (wide.querySelector('.rname') || {}).textContent } };
          return a;`);
        if (r.fatal) add("slave first card", "smoke-error", r.fatal);
        else if (r.segs !== 3 || r.plc !== "plc" || r.zero !== "zero" || !r.toast || r.v0 !== "1" || r.v7 !== "8" || !/상태|Status/.test(r.n0 ?? "") || !r.wide || r.wide.tag !== "F32 CDAB" || r.wide.v !== "23.5" || !/온도|Temperature/.test(r.wide.name ?? ""))
          await conv("slave-example", `첫 실행 카드 주소 표기·«예제 채우기» 결과가 이상함: ${JSON.stringify(r)}`);
        if (combo.name === "ko-light") await shot(app, `${combo.name}-example`);
        await verify("slave example");
        await load(port, combo);
        await js("window.__pdMock.files.set(arguments[0], arguments[1]); window.__pdMock.dialog.open = arguments[0];", "C:\\mock\\first.csv", "table,address,type,order,name,value\r\nholding-registers,0,f32,CDAB,Temp,1.5\r\n");
        await js("document.querySelector('.first-card .first-csv').click()");
        await sleep(600);
        const c = await js("return [(document.querySelector('.toast') || {}).textContent || '', !!document.querySelector('.traffic-error'), (document.querySelector('.regs .reg.wide .rtype') || {}).textContent || '']");
        if (!/1줄|1 row/.test(c[0]) || c[1] || c[2] !== "F32 CDAB") await conv("slave-first-csv", `첫 실행 카드 «CSV 가져오기…» 결과가 이상함: ${JSON.stringify(c)}`);
        await js("window.__pdMock.dialog.open = null");
        await verify("slave first csv");
        await load(port, combo);
      }
      await terms();
      // 빈 명령 목록 «예시 넣기»(Serial·TCP·UDP) → 3개, 이름 앞 «예:» → ✕ 없이 알림의 되돌리기로 비움
      if ((app === "serial" || app === "tcp" || app === "udp") && combo.full) {
        const r = await jsAsync(`
          const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
          const b = document.querySelector('.cmdlist .cmd-examples');
          if (!b) return { btn: false };
          b.click(); await w();
          const names = [...document.querySelectorAll('.cmdname')].map((e) => e.value);
          const gone = !document.querySelector('.cmdlist .cmd-examples');
          const u = document.querySelector('.toast .toast-undo'); if (u) u.click(); await w();
          return { btn: true, names, gone, undone: document.querySelectorAll('.cmdname').length === 0 && !!document.querySelector('.cmdlist .cmd-examples') };`);
        if (r.fatal) add("cmd-examples", "smoke-error", r.fatal);
        else if (!r.btn || r.names.length !== 3 || !r.names.every((n) => /^(예: |e\.g\. )/.test(n)) || !r.gone || !r.undone) await conv("cmd-examples", `빈 명령 목록 «예시 넣기» 가 이상함: ${JSON.stringify(r)}`);
        await verify("cmd examples");
      }
    }

    /** (10/18) 용어: 한국어 «국번(슬레이브 ID)» 한 번 + «국번», 영어 «Slave ID». 옛 이름(슬레이브 주소·유닛 ID·Unit ID (slave address))이 화면에 없어야 */
    async function terms() {
      if (!["serial", "tcp", "modbus-slave", "modbus-master"].includes(app)) return;
      const r = await jsAsync(`
        const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
        let label = null;
        if (${JSON.stringify(app)} === 'serial' || ${JSON.stringify(app)} === 'tcp') {
          document.querySelector('.sendbar .mb-open').click(); await w();
          const l = document.querySelector('.modal.mbuild .mb-grid label:nth-of-type(' + (${JSON.stringify(app)} === 'tcp' ? 2 : 1) + ')');
          label = l ? l.firstChild.textContent.trim() : null;
        }
        const text = document.body.innerText;
        if (label != null) { __sm.key(window, 'Escape'); await w(); }
        return { label, old: (text.match(/슬레이브 주소|유닛 ID|Unit ID \\(slave address\\)|slave address/) || [null])[0], ko: text.includes('국번(슬레이브 ID)'), en: /Slave ID/.test(text) };`);
      if (r.fatal) return add("terms", "smoke-error", r.fatal);
      const want = combo.lang === "ko" ? "국번(슬레이브 ID)" : "Slave ID";
      if (r.old) await conv("terms", `옛 이름 «${r.old}» 이(가) 화면에 남아 있음`);
      if ((app === "serial" || app === "tcp") && r.label !== want) await conv("terms", `Modbus 요청 창의 국번 칸 이름이 «${r.label}» (기대 «${want}»)`);
      if ((app === "modbus-slave" || app === "modbus-master") && !(combo.lang === "ko" ? r.ko : r.en)) await conv("terms", `화면에 «${want}» 가 없음`);
      await verify("terms");
    }

    /** 편의성 점검 — 연결된 상태에서 부른다. 끝나면 다시 연결된 상태로 돌려 둔다 */
    async function convenience() {
      const simple = app === "modbus-slave" || app === "simulator" || app === "modbus-master" || app === "plc-simulator";
      const LOG = simple ? ".tlog" : ".log";
      const ROW = simple ? ".tlog .trow" : ".log .row";
      // ---- 창 제목
      const title = await d.getTitle();
      if (!/ — PortDock /.test(title)) await conv("title", `연결 중인데 창 제목에 상태가 없음: «${title}»`, false);

      // ---- 따라가기: 로그가 넘칠 때까지 기다린 뒤 위로 굴리면 멈추고, 새 줄이 와도 화면이 그대로, 버튼·End 로 재개
      const over = await jsAsync(`const el = document.querySelector('${LOG}'); for (let i = 0; i < 75 && el.scrollHeight <= el.clientHeight + 60; i++) await new Promise((r) => setTimeout(r, 200)); return el.scrollHeight > el.clientHeight + 60;`);
      if (!over) await conv("follow", "15초 안에 로그가 넘치지 않아 따라가기를 시험하지 못함");
      else {
        const gap0 = await js(`const el = document.querySelector('${LOG}'); return el.scrollHeight - el.scrollTop - el.clientHeight;`);
        if (gap0 > 30) await conv("follow", `따라가는 중인데 맨 아래가 아님(남은 ${gap0}px)`);
        await js(`const el = document.querySelector('${LOG}'); el.scrollTop = Math.max(0, el.scrollTop - 120);`);
        await sleep(300);
        const top1 = await js(`return document.querySelector('${LOG}').scrollTop`);
        await sleep(2300);
        const s2 = await js(`const el = document.querySelector('${LOG}'); const b = document.querySelector('.follow-btn'); return { top: el.scrollTop, btn: b && b.textContent, box: (document.querySelector('.toolbar label.inline input[type=checkbox]') || {}).checked };`);
        if (!s2.btn) await conv("follow-paused", "위로 굴렸는데 «↓ 맨 아래로» 버튼이 안 보임");
        if (Math.abs(s2.top - top1) > 2) await conv("follow-paused", `따라가기를 멈췄는데 화면이 움직임 (${top1} → ${s2.top})`);
        if (!simple && s2.box !== false) await conv("follow-paused", "멈췄는데 «자동 스크롤» 체크가 그대로");
        if (combo.name === "ko-light") await shot(app, `${combo.name}-follow-paused`);
        // 멈춘 동안 줄 고르기: 누르기·Shift+누르기 → Ctrl+C
        const rows = await d.findElements(By.css(ROW));
        if (rows.length >= 4) {
          await rows[1].click();
          if ((app === "serial" || app === "tcp" || app === "udp") && !(await closeRight())) await conv("narrow-detail", "좁은 창에서 줄을 눌렀는데 오른쪽 칸(상세)이 열리지 않음");
          await sleep(100);
          await d.actions().keyDown(Key.SHIFT).click(rows[3]).keyUp(Key.SHIFT).perform();
          await sleep(150);
          const nSel = await js(`return document.querySelectorAll('${ROW}.sel').length`);
          if (nSel !== 3) await conv("select", `Shift+누르기로 3줄을 골랐는데 ${nSel}줄`);
          await d.actions().keyDown(Key.CONTROL).click(rows[2]).keyUp(Key.CONTROL).perform();
          await sleep(150);
          const nSel2 = await js(`return document.querySelectorAll('${ROW}.sel').length`);
          if (nSel2 !== 2) await conv("select", `Ctrl+누르기로 한 줄을 뺐는데 ${nSel2}줄`);
          await blur();
          await js("window.__smoke.clip = null");
          await chord([Key.CONTROL], "c");
          const clip = await js("return window.__smoke.clip");
          if (!clip || clip.split(/\r?\n/).length !== 2 || !/^\S+ (RX|TX|EV)\b/.test(clip)) await conv("ctrl-c", `Ctrl+C 로 고른 2줄이 «시각 방향 내용» 으로 복사되지 않음: ${JSON.stringify(clip)}`);
          if (!(await js("return !!document.querySelector('.toast')"))) await conv("ctrl-c", "복사한 뒤 알림이 안 보임");
          // 오른쪽 버튼 메뉴 — 데이터 줄에서
          const dataRow = (await d.findElements(By.css(`${ROW}.rx, ${ROW}.tx`)))[0];
          if (dataRow) {
            await d.actions().contextClick(dataRow).perform();
            await sleep(200);
            const items = await js("return [...document.querySelectorAll('.log-menu button')].map((b) => b.textContent)");
            if (items.length < 5) await conv("menu", `우클릭 메뉴 항목이 모자람: ${JSON.stringify(items)}`);
            if (combo.name === "ko-light") await shot(app, `${combo.name}-menu`);
            await js("window.__smoke.clip = null; document.querySelectorAll('.log-menu button')[4].click()");
            await sleep(150);
            const c = await js("return window.__smoke.clip");
            if (!c || !/^\{0x[0-9A-F]{2}(, 0x[0-9A-F]{2})*\}/.test(c)) await conv("menu", `«C 배열로 복사» 결과가 이상함: ${JSON.stringify(c)}`);
            if (await js("return !!document.querySelector('.log-menu')")) await conv("menu", "메뉴 항목을 눌렀는데 메뉴가 닫히지 않음");
            await d.actions().contextClick(dataRow).perform();
            await sleep(150);
            await keys(Key.ESCAPE);
            if (await js("return !!document.querySelector('.log-menu')")) await conv("menu", "Esc 로 우클릭 메뉴가 닫히지 않음");
          }
        }
        // End → 다시 따라가기
        await blur();
        await keys(Key.END);
        await sleep(200);
        const s3 = await js(`const el = document.querySelector('${LOG}'); return { gap: el.scrollHeight - el.scrollTop - el.clientHeight, btn: !!document.querySelector('.follow-btn') };`);
        if (s3.btn || s3.gap > 30) await conv("follow-end", `End 로 다시 따라가지 않음 (버튼 ${s3.btn}, 남은 ${s3.gap}px)`);
        // 따라가는 중에 줄을 눌러도 따라가기는 그대로
        const r2 = (await d.findElements(By.css(ROW))).slice(-1)[0];
        if (r2) {
          await r2.click();
          await sleep(1500);
          const s4 = await js(`const el = document.querySelector('${LOG}'); return { gap: el.scrollHeight - el.scrollTop - el.clientHeight, btn: !!document.querySelector('.follow-btn') };`);
          if (s4.btn || s4.gap > 30) await conv("follow-click", "따라가는 중에 줄을 눌렀더니 따라가기가 꺼짐");
          await closeRight();
        }
      }
      await verify("follow/select/menu");

      // ---- 단축키: Ctrl+L 지우기, Ctrl+S 화면 저장, Ctrl+Shift+L 파일 기록, F4 끊기·다시 연결
      await blur();
      await chord([Key.CONTROL], "l");
      const left = await js(`return document.querySelectorAll('${ROW}').length`);
      if (left > 2) await conv("ctrl-l", `Ctrl+L 뒤에도 로그가 ${left}줄`);
      if (!simple) {
        const n0 = await calls("plugin:dialog|save");
        await chord([Key.CONTROL], "s");
        if ((await calls("plugin:dialog|save")) !== n0 + 1) await conv("ctrl-s", "Ctrl+S 로 화면 저장 창이 열리지 않음", false);
      }
      const n1 = await calls("plugin:dialog|save");
      await chord([Key.CONTROL, Key.SHIFT], "l");
      if ((await calls("plugin:dialog|save")) !== n1 + 1) await conv("ctrl-shift-l", "Ctrl+Shift+L 로 파일 기록 창이 열리지 않음", false);
      const before = (await state()).btn;
      await keys(Key.F4);
      await waitSettled("F4 stop", (s) => s.btn !== before);
      await keys(Key.F4);
      await waitSettled("F4 start", (s) => s.btn === before);
      await sleep(800);
      await verify("shortcuts");

      // ---- 반복 보내기 → Esc 로 멈춤 (입력칸 밖에서) — 보내기 칸이 없는 Slave·Master·PLC Simulator 는 빼고
      if (app !== "modbus-slave" && app !== "modbus-master" && app !== "plc-simulator") {
        const sendSel = app === "simulator" ? ".unsol input.mono" : ".sendtext";
        await js(`__sm.setVal(document.querySelector(${JSON.stringify(sendSel)}), ${JSON.stringify(VALID_TEXT[app])})`);
        await sleep(300);
        const box = (await d.findElements(By.css(app === "simulator" ? ".unsol label.inline input[type=checkbox]" : ".sendrow.sub label.inline input[type=checkbox]")))[0];
        if (box && (await box.isEnabled())) {
          await box.click();
          await sleep(150);
          await keys(Key.ESCAPE);
          if (await box.isSelected()) await conv("esc-repeat", "Esc 로 반복 보내기가 멈추지 않음");
        } else await conv("esc-repeat", "반복 체크가 꺼져 있어 Esc 를 시험하지 못함", false);
      }

      // ---- 숫자 칸: ↑ +1, Shift+↑ +10, PageDown −100
      const num = (await d.findElements(By.css(app === "simulator" ? ".unsol input.num" : app === "modbus-slave" || app === "modbus-master" || app === "plc-simulator" ? ".main .toolbar input.num" : ".sendrow.sub input.num")))[app === "modbus-slave" || app === "plc-simulator" ? 1 : 0];
      if (num) {
        const v0 = Number(await num.getAttribute("value"));
        await num.click();
        await keys(Key.ARROW_UP);
        await chord([Key.SHIFT], Key.ARROW_UP);
        const v1 = Number(await num.getAttribute("value"));
        await keys(Key.PAGE_DOWN);
        const v2 = Number(await num.getAttribute("value"));
        if (v1 !== v0 + 11 || v2 !== Math.max(1, v1 - 100)) await conv("numinput", `숫자 칸 키: ${v0} → ↑·Shift+↑ ${v1}(기대 ${v0 + 11}) → PageDown ${v2}`);
        await blur();
      }
      // 속도 칸: ↑ 는 목록의 다음 값
      if (app === "serial" || app === "modbus-slave" || app === "modbus-master") {
        const baud = (await d.findElements(By.css("input[list=bauds]")))[0];
        if (baud) {
          await baud.click();
          await keys(Key.ARROW_UP);
          const b = await baud.getAttribute("value");
          if (b !== "19200") await conv("baud-step", `속도 칸 9600 에서 ↑ → ${b} (기대 19200)`);
          await keys(Key.ARROW_DOWN);
          await blur();
        }
      }

      // ---- HEX ↔ ASCII: 같은 바이트의 새 표기로, 켜진 체크섬은 알림줄로
      if (app !== "modbus-slave" && app !== "modbus-master" && app !== "plc-simulator") {
        const row = app === "simulator" ? ".unsol .arrow" : ".sendbar .sendrow";
        const r = await jsAsync(`
          const row = document.querySelector(${JSON.stringify(row)});
          const mode = [...row.querySelectorAll('select')].find((s) => s.querySelector('option[value=ascii]'));
          const orig = mode.value;
          const ck = [...row.querySelectorAll('select')].find((s) => s.querySelector('option[value=crc16-modbus]'));
          const inp = row.querySelector('input.sendtext, input.mono');
          const w = () => new Promise((r) => setTimeout(r, 120));
          __sm.setVal(mode, 'hex'); await w();
          __sm.setVal(inp, '41 54 0D 0A'); await w();
          __sm.setVal(ck, 'crc16-modbus'); await w();
          __sm.setVal(mode, 'ascii'); await w();
          const asc = inp.value;
          const notes = [...document.querySelectorAll('.notice')].map((n) => n.textContent);
          const off = document.querySelector('.notice.warn .btn');
          if (off) off.click();
          await w();
          const ckAfter = ck.value;
          __sm.setVal(mode, 'hex'); await w();
          const back = inp.value;
          __sm.setVal(mode, orig); await w();
          return { asc, back, notes, ckAfter };`);
        if (r.asc !== "AT\\r\\n" || r.back !== "41 54 0D 0A") await conv("notation", `표기 바꾸기 결과가 이상함: ${JSON.stringify(r)}`);
        if (r.notes.length < 2 || r.ckAfter !== "") await conv("notation", `체크섬 알림줄·«끄기» 가 동작하지 않음: ${JSON.stringify(r)}`);
        await js(`__sm.setVal(document.querySelector(${JSON.stringify(app === "simulator" ? ".unsol input.mono" : ".sendtext")}), ${JSON.stringify(VALID_TEXT[app])})`);
      }

      // ---- 명령 목록: 추가하면 이름 칸 포커스, ↑↓·Alt+↑↓, 복제, 지우기 → 되돌리기, 이름 칸 Enter 로 보내기
      if (!simple) {
        const nb = (await d.findElements(By.css(".toolbar .narrow-only")))[0];
        if (nb && (await nb.isDisplayed()) && !(await js("return !!document.querySelector('.app.show-right')"))) await nb.click();
        await sleep(200);
        const add3 = await jsAsync(`
          const w = () => new Promise((r) => setTimeout(r, 200));
          const inp = document.querySelector('.sendtext');
          const mode = [...document.querySelectorAll('.sendbar .sendrow select')].find((s) => s.querySelector('option[value=ascii]'));
          __sm.setVal(mode, 'hex'); await w();
          const out = [];
          for (const v of ['01 03 00 00 00 0A', '01 06 00 01 00 03', '01 10 00 00']) {
            __sm.setVal(inp, v); await w();
            const btn = document.querySelector('.sendrow.sub .add-cmd') || [...document.querySelectorAll('.sendrow.sub .btn.small')].pop();
            btn.click(); await w(); await w();
            out.push(document.activeElement && document.activeElement.className + '=' + document.activeElement.value);
          }
          return out;`);
        if (!add3.every((a, i) => a && a.startsWith("cmdname=") && a.endsWith(["01 03 00 00 00 0A", "01 06 00 01 00 03", "01 10 00 00"][i])))
          await conv("cmd-add-focus", `명령을 추가한 뒤 이름 칸에 포커스가 가지 않음: ${JSON.stringify(add3)}`);
        const names = () => js("return [...document.querySelectorAll('.cmdname')].map((e) => e.value)");
        const n0 = await names();
        await js("document.querySelectorAll('.cmd-move .mv')[1].click()"); // 첫 줄 ↓
        await sleep(200);
        const n1 = await names();
        if (n1[0] !== n0[1] || n1[1] !== n0[0]) await conv("cmd-move", `↓ 로 순서가 안 바뀜: ${JSON.stringify(n1)}`);
        const nameEl = (await d.findElements(By.css(".cmdname")))[1];
        await nameEl.click();
        await chord([Key.ALT], Key.ARROW_UP);
        const n2 = await names();
        if (JSON.stringify(n2) !== JSON.stringify(n0)) await conv("cmd-alt-up", `Alt+↑ 로 순서가 안 바뀜: ${JSON.stringify(n2)}`);
        const sends0 = await calls("send");
        const nameNow = (await d.findElements(By.css(".cmdname")))[0];
        await nameNow.click();
        await keys(Key.ENTER);
        await sleep(200);
        if ((await calls("send")) !== sends0 + 1) await conv("cmd-enter", "이름 칸 Enter 로 명령이 보내지지 않음");
        await js("[...document.querySelectorAll('.cmd')][0].querySelectorAll('.btn.ghost')[1].click()"); // ⧉
        await sleep(200);
        const n3 = await names();
        if (n3.length !== 4 || n3[1] !== `${n0[0]} (2)`) await conv("cmd-dup", `복제 결과가 이상함: ${JSON.stringify(n3)}`);
        await js("[...document.querySelectorAll('.cmd')][0].querySelectorAll('.btn.ghost')[2].click()"); // ✕
        await sleep(200);
        const n4 = await names();
        const toast = await js("const t = document.querySelector('.toast'); return t && t.textContent");
        if (n4.length !== 3 || !toast) await conv("cmd-del", `지우기 뒤 목록 ${n4.length}개 · 알림 ${toast}`);
        if (combo.name === "ko-light") await shot(app, `${combo.name}-cmd-undo`);
        await js("document.querySelector('.toast .toast-undo').click()");
        await sleep(200);
        const n5 = await names();
        if (JSON.stringify(n5) !== JSON.stringify(n3)) await conv("cmd-undo", `되돌리기 뒤 목록이 원래대로가 아님: ${JSON.stringify(n5)}`);
        await blur();
        const close = (await d.findElements(By.css(".close-right")))[0];
        if (close && (await close.isDisplayed())) await close.click();
        await verify("commands");
      }

      // ---- Modbus Slave: 레지스터 칸 ↓↑·Esc·여러 값 붙여넣기, 슬레이브 지우기 → 되돌리기
      if (app === "modbus-slave") {
        const cells = await d.findElements(By.css(".regs .regval"));
        await cells[0].click();
        await keys(Key.ARROW_DOWN);
        if (!(await js("return document.activeElement === document.querySelectorAll('.regs .regval')[1]"))) await conv("reg-down", "↓ 로 다음 칸에 가지 않음");
        await keys(Key.ARROW_UP);
        if (!(await js("return document.activeElement === document.querySelectorAll('.regs .regval')[0]"))) await conv("reg-up", "↑ 로 앞 칸에 가지 않음");
        const orig = await cells[0].getAttribute("value");
        await keys("777");
        await keys(Key.ESCAPE);
        if ((await cells[0].getAttribute("value")) !== orig) await conv("reg-esc", "Esc 로 고치기가 취소되지 않음");
        await js(`const dt = new DataTransfer(); dt.setData('text/plain', '7\\t8\\t9\\r\\n'); document.querySelectorAll('.regs .regval')[0].dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));`);
        await blur();
        await sleep(900);
        const vals = await js("return [...document.querySelectorAll('.regs .regval')].slice(0, 3).map((e) => e.value)");
        if (vals.join(",") !== "7,8,9") await conv("reg-paste", `여러 값 붙여넣기 결과: ${vals}`);
        // 슬레이브 2 를 더하고 지운 뒤 되돌리기
        await js(`const i = document.querySelector('.side .row2 input'); __sm.setVal(i, '2'); __sm.key(i, 'Enter');`);
        await sleep(300);
        await js("[...document.querySelectorAll('.chip')].find((c) => c.textContent.startsWith('2')).querySelector('.chip-x').click()");
        await sleep(200);
        const gone = await js("return ![...document.querySelectorAll('.chip-btn')].some((b) => b.textContent === '2') && !!document.querySelector('.toast .toast-undo')");
        if (!gone) await conv("slave-del", "슬레이브를 지웠는데 남아 있거나 «되돌리기» 알림이 없음");
        await js("document.querySelector('.toast .toast-undo') && document.querySelector('.toast .toast-undo').click()");
        await sleep(400);
        if (!(await js("return [...document.querySelectorAll('.chip-btn')].some((b) => b.textContent === '2')"))) await conv("slave-undo", "되돌리기로 슬레이브가 돌아오지 않음");
        await verify("modbus-slave keys");

        // ---- (10/18) Modbus Slave: 칸 설정(오른쪽 버튼) → F32·CDAB·이름·자동 변화 → 넓은 칸·◷·실수 입력·목록 보기·기본으로
        await js("document.querySelectorAll('.regs .reg')[4].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 300, clientY: 300 }))");
        await sleep(250);
        if (!(await js("return !!document.querySelector('.modal.cell-dlg')"))) await conv("cell-dlg", "칸에서 오른쪽 버튼으로 «칸 설정» 이 열리지 않음");
        else {
          if (combo.name === "ko-light") await shot(app, `${combo.name}-cell-dlg`);
          const r = await jsAsync(`
            const w = () => new Promise((r) => setTimeout(r, 150));
            const dlg = () => document.querySelector('.modal.cell-dlg');
            __sm.setVal(dlg().querySelector('input'), 'Temp'); await w();
            __sm.setVal(dlg().querySelector('select'), 'f32'); await w();
            __sm.setVal(dlg().querySelectorAll('select')[1], 'CDAB'); await w();
            __sm.setVal([...dlg().querySelectorAll('select')].find((s) => s.querySelector('option[value=sine]')), 'increment'); await w();
            const shot = !!dlg().querySelector('.grid3');
            dlg().querySelector('.btn.primary').click(); await w(); await w(); await w();
            const c = document.querySelector('.regs .reg.wide');
            return { open: !!dlg(), params: shot, wide: !!c, name: c && c.querySelector('.rname') && c.querySelector('.rname').textContent, sim: !!(c && c.querySelector('.simmark')), tag: c && c.querySelector('.rtype') && c.querySelector('.rtype').textContent };`);
          if (r.open || !r.params || !r.wide || r.name !== "Temp" || !r.sim || r.tag !== "F32 CDAB") await conv("cell-dlg", `칸 설정 저장 결과가 이상함: ${JSON.stringify(r)}`);
          const v = await jsAsync(`
            const i = document.querySelector('.regs .reg.wide .regval');
            i.focus(); __sm.setVal(i, '123.456'); __sm.key(i, 'Enter'); i.blur();
            await new Promise((r) => setTimeout(r, 900));
            const j = document.querySelector('.regs .reg.wide .regval');
            return { v: j.value, bad: j.classList.contains('bad') };`);
          if (v.v !== "123.456" || v.bad) await conv("cell-f32", `F32 칸에 123.456 을 넣었는데 ${JSON.stringify(v)}`);
          if (combo.name === "ko-light") await shot(app, `${combo.name}-cell-typed`);
          await js("[...document.querySelectorAll('.segs .seg')][1].click()");
          await sleep(300);
          const lv = await js("const tr = [...document.querySelectorAll('.rtable tbody tr')].find((x) => x.querySelector('.rname').textContent === 'Temp'); return tr ? [tr.querySelector('.rtype').textContent, tr.querySelector('.simcol').textContent] : null");
          if (!lv || !/F32/.test(lv[0]) || !/◷/.test(lv[1])) await conv("list-view", `목록 보기에 이름·형식·자동 변화가 안 보임: ${JSON.stringify(lv)}`);
          await verify("list view");
          if (combo.name === "ko-light" || combo.name === "en-dark") await shot(app, `${combo.name}-list-view`);
          await js("[...document.querySelectorAll('.segs .seg')][0].click()");
          await sleep(200);
          await js("document.querySelector('.regs .reg.wide').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))");
          await sleep(200);
          await js("document.querySelector('.modal.cell-dlg .dlg-buttons .btn.small').click()");
          await sleep(300);
          if (await js("return !!document.querySelector('.regs .reg.wide') || !!document.querySelector('.modal.cell-dlg')")) await conv("cell-reset", "«기본으로» 뒤에도 넓은 칸이 남아 있음");
          await verify("cell settings");
        }

        // ---- (10/18) CSV 가져오기: 틀린 줄이 있으면 행 번호와 함께 거절, 맞으면 알림
        const importBtn = async () => {
          await js("[...document.querySelectorAll('.main .toolbar .btn.small')].find((b) => /표 가져오기|Import table/.test(b.textContent)).click()");
          await sleep(500);
        };
        await js("window.__pdMock.files.set(arguments[0], arguments[1]); window.__pdMock.dialog.open = arguments[0];", "C:\\mock\\bad.csv", "table,address,type,order,name,value\nhr,1,f33,,,1\nXX,2,u16,,,1\n");
        await importBtn();
        const errText = await js("return (document.querySelector('.traffic-error') || {}).textContent || ''");
        if (!/2행|Row 2/.test(errText) || !/3행|Row 3/.test(errText)) await conv("csv-bad", `틀린 CSV 의 행 번호 오류가 안 보임: ${JSON.stringify(errText.slice(0, 200))}`);
        if (combo.name === "ko-light") await shot(app, `${combo.name}-csv-error`);
        await js("window.__pdMock.files.set(arguments[0], arguments[1]); window.__pdMock.dialog.open = arguments[0];", "C:\\mock\\ok.csv", "\uFEFFtable,address,type,order,name,value\r\nholding-registers,10,u32,CDAB,Count,70000\r\ncoils,3,bit,,Pump,1\r\n");
        await importBtn();
        const okToast = await js("return [(document.querySelector('.toast') || {}).textContent || '', !!document.querySelector('.traffic-error')]");
        if (!/2줄|2 row/.test(okToast[0]) || okToast[1]) await conv("csv-ok", `맞는 CSV 를 가져왔는데 알림이 이상함: ${JSON.stringify(okToast)}`);
        await js("window.__pdMock.dialog.open = null");
        await verify("csv import");

        // ---- (10/18) 여러 칸 형식 한 번에: 칸 0 을 고르고 칸 7 을 Shift+클릭 → 8칸 고름 → F32 CDAB 한 번에 → 넓은 칸 4개 → U16 ABCD 로 되돌림
        const bulk = await jsAsync(`
          const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
          const regs = () => [...document.querySelectorAll('.regs .reg')];
          const shiftTo = (el) => el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, shiftKey: true }));
          // 앞 CSV 단계가 만든 넓은 칸(주소 10 U32)은 그대로 — 그 수를 기준으로
          const base = document.querySelectorAll('.regs .reg.wide').length;
          const i0 = regs()[0].querySelector('.regval'); i0.focus(); await w(100); i0.blur();
          shiftTo(regs()[7]); await w();
          const a = { base, picked: document.querySelectorAll('.regs .reg.picked').length, bar: (document.querySelector('.bulk-bar b') || {}).textContent || '' };
          const bar = document.querySelector('.bulk-bar');
          if (!bar) return a;
          const sels = bar.querySelectorAll('select');
          __sm.setVal(sels[0], 'f32'); __sm.setVal(sels[1], 'CDAB'); await w(100);
          bar.querySelector('.bulk-apply').click(); await w(500);
          a.tags = [...document.querySelectorAll('.regs .reg.wide .rtype')].map((e) => e.textContent).filter((x) => x.startsWith('F32'));
          a.toast = (document.querySelector('.toast') || {}).textContent || '';
          a.gone = !document.querySelector('.bulk-bar');
          // 되돌리기: 0 ~ 6(넓은 칸 넷째) 다시 고르고 U16 ABCD
          const j0 = regs()[0].querySelector('.regval'); j0.focus(); await w(100); j0.blur();
          shiftTo(regs()[3]); await w();
          const b2 = document.querySelector('.bulk-bar');
          a.picked2 = document.querySelectorAll('.regs .reg.picked').length;
          if (b2) { __sm.setVal(b2.querySelectorAll('select')[0], 'u16'); __sm.setVal(b2.querySelectorAll('select')[1], 'ABCD'); await w(100); b2.querySelector('.bulk-apply').click(); await w(500); }
          a.after = document.querySelectorAll('.regs .reg.wide').length - base;
          // 보통 클릭으로 풀리는지
          shiftTo(regs()[2]); await w();
          regs()[5].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); await w();
          a.cleared = !document.querySelector('.bulk-bar') && !document.querySelector('.regs .reg.picked');
          return a;`);
        if (bulk.fatal) add("slave bulk", "smoke-error", bulk.fatal);
        else if (bulk.picked !== 8 || !/8/.test(bulk.bar) || (bulk.tags || []).length !== 4 || !bulk.tags.every((x) => x === "F32 CDAB") || !bulk.toast || !bulk.gone || bulk.picked2 !== 4 || bulk.after !== 0 || !bulk.cleared)
          await conv("slave-bulk", `여러 칸 형식 한 번에(Shift+클릭) 가 이상함: ${JSON.stringify(bulk)}`);
        await verify("slave bulk format");

        // ---- (10/18) 통신 기록 높이: 막대를 위로 60px 끌면 높이가 늘고 기억, 두 번 누르면 처음대로, ↑ 키로 20px
        {
          const sp = (await d.findElements(By.css(".splitter")))[0];
          const th = () => js("return [document.querySelector('.traffic').offsetHeight, localStorage.getItem('trafficH')]");
          const [h0] = await th();
          await d.actions({ async: true }).move({ origin: sp }).press().move({ origin: sp, y: -60 }).release().perform();
          await sleep(250);
          const [h1, s1] = await th();
          await d.actions({ async: true }).doubleClick(sp).perform();
          await sleep(250);
          const [h2, s2] = await th();
          await js("document.querySelector('.splitter').focus()");
          await keys(Key.ARROW_UP);
          const [h3] = await th();
          await keys(Key.ENTER);
          const [h4, s4] = await th();
          if (!sp || Math.abs(h1 - h0 - 60) > 8 || Number(s1) !== h1 || Math.abs(h2 - h0) > 2 || s2 !== "null" || Math.abs(h3 - h0 - 20) > 3 || Math.abs(h4 - h0) > 2 || s4 !== "null")
            await conv("slave-split", `통신 기록 높이 막대가 이상함: ${JSON.stringify({ h0, h1, s1, h2, s2, h3, h4, s4 })}`);
          await blur();
          await verify("slave splitter");
        }

        // ---- (10/19) 장비 흉내: 창 → 장비 고르기 → 불러오기 → 알림·이름 붙은 칸
        {
          await js("[...document.querySelectorAll('.main .toolbar .btn.small')].find((b) => /장비 흉내|Emulate device/.test(b.textContent)).click()");
          await sleep(300);
          const ok = await js("const d = document.querySelector('.modal.dev-dlg'); return d ? { items: d.querySelectorAll('.dev-item').length, rows: d.querySelectorAll('.dev-regs tbody tr').length, plan: (d.querySelector('.dev-plan') || {}).textContent || '' } : null");
          if (combo.name === "ko-light" || combo.name === "en-dark") await shot(app, `${combo.name}-slave-device`);
          if (!ok || ok.items < 1 || ok.rows < 1 || !/국번|Slave ID/.test(ok.plan)) await conv("slave-device", `장비 흉내 창이 이상함: ${JSON.stringify(ok)}`);
          else {
            await js("document.querySelector('.modal.dev-dlg .dlg-buttons .btn.primary').click()");
            await sleep(700);
            const r = await js("return { open: !!document.querySelector('.modal.dev-dlg'), toast: (document.querySelector('.toast') || {}).textContent || '', err: !!document.querySelector('.traffic-error'), names: [...document.querySelectorAll('.regs .reg .rname')].map((e) => e.textContent).filter(Boolean).length }");
            if (r.open || r.err || !/레지스터 \d+개를 국번|Loaded \d+ registers/.test(r.toast) || r.names < 1) await conv("slave-device", `장비 흉내 결과가 이상함: ${JSON.stringify(r)}`);
            if (combo.name === "ko-light" || combo.name === "en-dark") await shot(app, `${combo.name}-slave-device-loaded`);
          }
          await verify("slave device emulation");
        }

        // ---- (10/18) TCP 서버(Modbus TCP): 끊고 → 연결 방식 바꾸기 → 시작 → 듣는 중·클라이언트 수·풀이(#트랜잭션)·MBAP 장애 칸 → 멈춤 → 시리얼로 다시 연결
        const setTransport = (v) => js("const s = [...document.querySelectorAll('aside.side select')].find((x) => x.querySelector('option[value=rtu-tcp]')); __sm.setVal(s, arguments[0]);", v);
        await clickRun("mb-tcp: stop serial", (s) => !STOP_RE.test(s.btn ?? ""));
        await setTransport("tcp");
        await sleep(200);
        await clickRun("mb-tcp: start", (s) => STOP_RE.test(s.btn ?? "") && /듣는|Listening/.test(s.status ?? ""));
        await sleep(1800);
        const tcpState = await js(
          "return { clients: (document.querySelector('aside .status .clients') || {}).textContent || '', sum: [...document.querySelectorAll('.tlog .trow .sum')].map((e) => e.textContent).find((x) => x.startsWith('#')) || null, peer: !!document.querySelector('.tlog .trow .peeraddr'), mbap: [...document.querySelectorAll('aside label.inline')].some((l) => /MBAP/.test(l.textContent)), crc: [...document.querySelectorAll('aside label.inline')].some((l) => /CRC/.test(l.textContent)) }",
        );
        if (!/2/.test(tcpState.clients) || !tcpState.sum || !tcpState.peer || !tcpState.mbap || tcpState.crc) await conv("mb-tcp", `TCP 서버 화면이 이상함: ${JSON.stringify(tcpState)}`);
        await verify("mb-tcp running");
        if (combo.name === "ko-light" || combo.name === "en-dark") await shot(app, `${combo.name}-tcp-running`);
        await clickRun("mb-tcp: stop", (s) => !STOP_RE.test(s.btn ?? ""));
        await setTransport("serial");
        await sleep(200);
        await clickRun("mb-tcp: serial again", (s) => STOP_RE.test(s.btn ?? "") && /연결됨|Connected/.test(s.status ?? ""));
      }
      // ---- (10/18) Simulator: 빈 화면 예제 3개 → SCPI(글자 그대로) → 와일드카드 켜면 알림줄 → [끄기] → «+ 규칙 추가» 는 ASCII 를 물려받음(와일드카드 끔)
      //      → 통신 기록 RX 줄 오른쪽 버튼 «이 요청으로 규칙 만들기» → 카드 하나 더·응답 칸 포커스
      if (app === "simulator") {
        const ex = await jsAsync(`
          const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
          const btns = [...document.querySelectorAll('.arexamples .btn')];
          if (btns.length !== 3 || document.querySelectorAll('.arcard').length) return { n: btns.length, cards: document.querySelectorAll('.arcard').length };
          document.querySelector('.arexamples .arex-scpi').click(); await w(900);
          const card = document.querySelector('.arcard');
          const wild = card.querySelector('.arwild input');
          const r = { n: 3, pat: card.querySelector('.arpat').value, wild: wild ? wild.checked : null, ok: !!card.querySelector('.armore .hint.ok'), guide: !!document.querySelector('.arexamples') };
          if (wild) { wild.click(); await w(); }
          const note = card.querySelector('.arwild-note');
          r.note = !!note;
          if (note) { note.querySelector('.btn').click(); await w(); }
          r.off = !card.querySelector('.arwild-note') && !!wild && !wild.checked;
          [...document.querySelectorAll('.ar > .arrow .btn.small')][0].click(); await w();
          const c2 = [...document.querySelectorAll('.arcard')][1];
          r.inherit = c2 ? [...c2.querySelectorAll('select')].map((s) => s.value).slice(0, 2).join(',') : null;
          r.suffix2 = c2 ? [...c2.querySelectorAll('select')].map((s) => s.value).pop() : null;
          r.wild2 = c2 && c2.querySelector('.arwild input') ? c2.querySelector('.arwild input').checked : null;
          return r;`);
        if (ex.fatal) add("sim examples", "smoke-error", ex.fatal);
        else if (ex.n !== 3 || ex.pat !== "*IDN?" || ex.wild !== false || !ex.ok || ex.guide || !ex.note || !ex.off || ex.inherit !== "ascii,exact" || ex.suffix2 !== "\\r\\n" || ex.wild2 !== false)
          await conv("sim-examples", `예제 버튼·와일드카드·새 규칙 물려받기가 이상함: ${JSON.stringify(ex)}`);
        if (combo.name === "ko-light" || combo.name === "en-dark") await shot(app, `${combo.name}-sim-examples`);
        await verify("simulator examples / wildcard");
        await blur();
        await keys(Key.END);
        const lr = await jsAsync(`
          const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
          const row = [...document.querySelectorAll('.tlog .trow.rx')].pop();
          if (!row) return { row: false };
          const n = document.querySelectorAll('.arcard').length;
          const rc = row.getBoundingClientRect();
          row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: rc.left + 40, clientY: rc.top + 4 }));
          await w();
          const b = [...document.querySelectorAll('.log-menu button')].find((x) => /규칙 만들기|Make a rule/.test(x.textContent));
          if (!b) { __sm.key(window, 'Escape'); return { row: true, item: false }; }
          b.click(); await w(400);
          return { row: true, item: true, n, n2: document.querySelectorAll('.arcard').length, focus: !!document.activeElement && document.activeElement.classList.contains('arreply'), toast: (document.querySelector('.toast') || {}).textContent || '' };`);
        if (lr.fatal) add("sim rule from log", "smoke-error", lr.fatal);
        else if (!lr.row || !lr.item || lr.n2 !== lr.n + 1 || !lr.focus) await conv("sim-rule-from-log", `«이 요청으로 규칙 만들기» 가 이상함: ${JSON.stringify(lr)}`);
        await blur();
        await verify("simulator rule from log");
      }
      // ---- Simulator: 규칙 지우기 → 되돌리기
      if (app === "simulator") {
        await js("[...document.querySelectorAll('.ar > .arrow .btn.small')][0].click()");
        await sleep(200);
        const n = await js("return document.querySelectorAll('.arcard').length");
        await js("document.querySelector('.arcard .arrow .btn.small.ghost:last-child').click()");
        await sleep(200);
        const n2 = await js("return document.querySelectorAll('.arcard').length");
        await js("document.querySelector('.toast .toast-undo') && document.querySelector('.toast .toast-undo').click()");
        await sleep(200);
        const n3 = await js("return document.querySelectorAll('.arcard').length");
        if (n2 !== n - 1 || n3 !== n) await conv("rule-undo", `규칙 지우기·되돌리기: ${n} → ${n2} → ${n3}`);
        await verify("simulator rules");
      }

      // ---- (10/18) Modbus Master: 쓰기 창(두 번 누르기 → 미리보기 바이트 → 쓰기 → 알림·새 값), 칸 설정(F32 CDAB), 추세,
      //      40001 표기, 표 더하기·지우기 → 되돌리기, CSV 불러오기, 값 기록(CSV), 국번 찾기
      if (app === "modbus-master") {
        const w = (ms) => sleep(ms);
        // 쓰기: 첫 칸(보유 레지스터 0)을 두 번 눌러 1234 를 쓴다
        await js("document.querySelectorAll('.regs .reg')[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))");
        await w(300);
        if (!(await js("return !!document.querySelector('.modal.write-dlg')"))) await conv("mm-write", "칸을 두 번 눌렀는데 쓰기 창이 열리지 않음");
        else {
          const r = await jsAsync(`
            const dlg = document.querySelector('.modal.write-dlg');
            const inp = [...dlg.querySelectorAll('input')].find((i) => i.type !== 'checkbox');
            __sm.setVal(inp, '1234'); await new Promise((r) => setTimeout(r, 450));
            const bytes = (dlg.querySelector('.wbytes') || {}).textContent || '';
            dlg.querySelector('.dlg-buttons .btn.primary').click();
            await new Promise((r) => setTimeout(r, 700));
            return { bytes, open: !!document.querySelector('.modal.write-dlg'), toast: (document.querySelector('.toast') || {}).textContent || '', v: (document.querySelector('.regs .reg .rv') || {}).textContent };`);
          if (!/01 06 00 00 04 D2/.test(r.bytes)) await conv("mm-write", `쓰기 미리보기 바이트가 이상함: ${JSON.stringify(r.bytes)}`);
          if (r.open || !/썼습니다|Wrote/.test(r.toast) || r.v !== "1234") await conv("mm-write", `쓰기 결과가 이상함: ${JSON.stringify(r)}`);
          if (combo.name === "ko-light") await shot(app, `${combo.name}-mm-written`);
        }
        await verify("mm write");
        // 칸 설정: 주소 2 를 F32 CDAB «Temp» 로 → 넓은 칸 + 형식 표시
        await js("document.querySelectorAll('.regs .reg')[2].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))");
        await w(250);
        const pr = await jsAsync(`
          const dlg = document.querySelector('.modal.cell-dlg');
          if (!dlg) return { open: false };
          __sm.setVal(dlg.querySelector('input'), 'Temp'); await new Promise((r) => setTimeout(r, 120));
          __sm.setVal(dlg.querySelectorAll('select')[0], 'f32'); await new Promise((r) => setTimeout(r, 120));
          __sm.setVal(dlg.querySelectorAll('select')[1], 'CDAB'); await new Promise((r) => setTimeout(r, 120));
          dlg.querySelector('.dlg-buttons .btn.primary').click(); await new Promise((r) => setTimeout(r, 300));
          const c = document.querySelector('.regs .reg.wide');
          return { open: true, closed: !document.querySelector('.modal.cell-dlg'), name: c && (c.querySelector('.rname') || {}).textContent, tag: c && (c.querySelector('.rtype') || {}).textContent };`);
        if (!pr.open || !pr.closed || pr.name !== "Temp" || pr.tag !== "F32 CDAB") await conv("mm-point", `칸 설정 결과가 이상함: ${JSON.stringify(pr)}`);
        // 추세: 넓은 칸을 고르고 📈 → 추세 줄
        await js("document.querySelector('.regs .reg.wide').click()");
        await w(150);
        await js("[...document.querySelectorAll('.main .toolbar .btn.small')].find((b) => /추세|Trend/.test(b.textContent)).click()");
        await w(1500);
        if (!(await js("return document.querySelectorAll('.trend .trend-row').length === 1"))) await conv("mm-trend", "📈 추세를 눌렀는데 추세 줄이 없음");
        if (combo.name === "ko-light" || combo.name === "en-dark") await shot(app, `${combo.name}-mm-trend`);
        await verify("mm point/trend");
        // 40001 표기: 시작 칸이 40001, 30001 을 넣으면 함수가 04 로
        const plc = await jsAsync(`
          const sel = [...document.querySelectorAll('.main .toolbar select')].find((s) => s.querySelector('option[value=plc]'));
          __sm.setVal(sel, 'plc'); await new Promise((r) => setTimeout(r, 200));
          const inp = document.querySelector('.main .toolbar .addr-in');
          const shown = inp.value;
          inp.focus(); __sm.setVal(inp, '30001'); __sm.key(inp, 'Enter'); inp.blur(); await new Promise((r) => setTimeout(r, 300));
          const fc = [...document.querySelectorAll('.main .toolbar select')].find((s) => s.querySelector('option[value="4"]')).value;
          const addr = (document.querySelector('.regs .reg .addr') || {}).textContent;
          const back = [...document.querySelectorAll('.main .toolbar select')].find((s) => s.querySelector('option[value="4"]'));
          __sm.setVal(back, '3'); await new Promise((r) => setTimeout(r, 100));
          __sm.setVal(sel, 'zero'); await new Promise((r) => setTimeout(r, 200));
          return { shown, fc, addr };`);
        if (plc.shown !== "40001" || plc.fc !== "4" || plc.addr !== "30001") await conv("mm-plc", `40001 표기가 이상함: ${JSON.stringify(plc)}`);
        await verify("mm plc");
        // (10/18) 0 기준에 40001 → 그대로 읽되 노란 알림줄 → [PLC 표기로 바꾸기] → 주소 표기 PLC·시작 40001(0)
        const pn = await jsAsync(`
          const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
          const sel = [...document.querySelectorAll('.main .toolbar select')].find((s) => s.querySelector('option[value=plc]'));
          __sm.setVal(sel, 'zero'); await w();
          let inp = document.querySelector('.main .toolbar .addr-in');
          inp.focus(); __sm.setVal(inp, '40001'); __sm.key(inp, 'Enter'); inp.blur(); await w(350);
          const note = document.querySelector('.plc-note');
          const r = { note: !!note, text: note ? note.textContent : '', start0: document.querySelector('.main .toolbar .addr-in').value };
          if (note) note.querySelector('.btn').click();
          await w(350);
          r.mode = sel.value; r.start = document.querySelector('.main .toolbar .addr-in').value; r.gone = !document.querySelector('.plc-note');
          r.addr = (document.querySelector('.regs .reg .addr') || {}).textContent;
          __sm.setVal(sel, 'zero'); await w();
          return r;`);
        if (pn.fatal) add("mm plc note", "smoke-error", pn.fatal);
        else if (!pn.note || !/PLC/.test(pn.text) || pn.start0 !== "40001" || pn.mode !== "plc" || pn.start !== "40001" || !pn.gone || pn.addr !== "40001")
          await conv("mm-plc-note", `0 기준 40001 알림줄·«PLC 표기로 바꾸기» 가 이상함: ${JSON.stringify(pn)}`);
        if (combo.name === "ko-light") await shot(app, `${combo.name}-mm-plc-note`);
        // «표시» 끝 «형식 지정…» → 고른 칸의 형식 창, 고르기 값은 그대로
        const fs = await jsAsync(`
          const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
          const f = document.querySelector('.main .toolbar .fmt-sel');
          if (!f) return { sel: false };
          const before = f.value;
          __sm.setVal(f, '__point'); await w(350);
          const open = !!document.querySelector('.modal.cell-dlg');
          const v = f.value;
          const x = document.querySelector('.modal.cell-dlg .icon-btn') || [...document.querySelectorAll('.modal.cell-dlg .btn')].find((b) => /취소|Cancel/.test(b.textContent));
          if (x) x.click();
          await w();
          return { sel: true, open, before, v, closed: !document.querySelector('.modal.cell-dlg') };`);
        if (fs.fatal) add("mm typed", "smoke-error", fs.fatal);
        else if (!fs.sel || !fs.open || fs.v !== fs.before || !fs.closed) await conv("mm-typed", `«형식 지정…» 이 형식 창을 열지 않음: ${JSON.stringify(fs)}`);
        // 탭 배지: 빨강(.err-badge:not(.old))은 «지금 실패 중»(●) 탭에만
        const bd = await js("return [...document.querySelectorAll('.tabs .tab')].filter((t) => t.querySelector('.err-badge:not(.old)') && !/●/.test(t.textContent)).length");
        if (bd) await conv("mm-badge", `실패 중이 아닌 탭에 빨간 오류 배지 ${bd}개`);
        await verify("mm plc note / typed");
        // 표 더하기 → 지우기 → 되돌리기
        const tabs0 = await js("return document.querySelectorAll('.tabs .tab').length");
        await js("[...document.querySelectorAll('.tabs .btn.small')][0].click()");
        await w(200);
        const tabs1 = await js("return document.querySelectorAll('.tabs .tab').length");
        await js("[...document.querySelectorAll('.tabs .tab')].pop().querySelector('.tab-x').click()");
        await w(200);
        const tabs2 = await js("return document.querySelectorAll('.tabs .tab').length");
        await js("document.querySelector('.toast .toast-undo') && document.querySelector('.toast .toast-undo').click()");
        await w(200);
        const tabs3 = await js("return document.querySelectorAll('.tabs .tab').length");
        if (tabs1 !== tabs0 + 1 || tabs2 !== tabs0 || tabs3 !== tabs0 + 1) await conv("mm-tables", `표 더하기·지우기·되돌리기: ${tabs0} → ${tabs1} → ${tabs2} → ${tabs3}`);
        if (tabs3 > tabs0) {
          await js("[...document.querySelectorAll('.tabs .tab')].pop().querySelector('.tab-x').click()");
          await w(200);
          await js("document.querySelector('.tabs .tab .tab-btn').click()");
          await w(200);
        }
        await verify("mm tables");
        // CSV 불러오기(Modbus Slave 레지스터 맵): 맞는 표(HR) 줄 2개, 다른 표 줄 1개
        await js("window.__pdMock.files.set(arguments[0], arguments[1]); window.__pdMock.dialog.open = arguments[0];", "C:\\mock\\map.csv", "\uFEFFtable,address,type,order,name,value\r\nholding-registers,4,u32,DCBA,Count,70000\r\nholding-registers,6,s16,,Level,\r\ninput-registers,0,u16,,X,1\r\n");
        await js("[...document.querySelectorAll('.main .toolbar .btn.small')].find((b) => /CSV 불러오기|Load CSV/.test(b.textContent)).click()");
        await w(500);
        const csv = await js("return [(document.querySelector('.toast') || {}).textContent || '', [...document.querySelectorAll('.regs .reg .rname')].map((e) => e.textContent)]");
        if (!/2줄|2 row/.test(csv[0]) || !csv[1].includes("Count") || !csv[1].includes("Level")) await conv("mm-csv", `CSV 불러오기 결과가 이상함: ${JSON.stringify(csv)}`);
        await js("window.__pdMock.dialog.open = null");
        await verify("mm csv");
        // 값 기록(CSV): 저장 경로를 주고 시작 → 1.5초 뒤 파일에 머리줄 + 값 줄
        await js("window.__pdMock.dialog.save = 'C:\\\\mock\\\\values.csv'");
        // (10/18) 값 기록은 표 도구줄 «값 기록 ▾» 띄움 칸 안(왼쪽 칸에는 없음)
        if (await js("return [...document.querySelectorAll('aside .btn')].some((b) => /기록 시작|Start log/.test(b.textContent))")) await conv("mm-vlog-place", "값 기록 버튼이 아직 왼쪽 칸에 있음");
        await js("document.querySelector('.main .toolbar .vlog-btn').click()");
        await w(200);
        await js("[...document.querySelectorAll('.vlog-pop .btn')].find((b) => /기록 시작|Start log/.test(b.textContent)).click()");
        await w(2300);
        if (!(await js("return /●/.test(document.querySelector('.main .toolbar .vlog-btn').textContent) && !document.querySelector('.vlog-pop')"))) await conv("mm-vlog-btn", "값 기록 중인데 도구줄 버튼에 «●» 가 없거나 띄움 칸이 닫히지 않음");
        const vl = await js("const t = window.__pdMock.files.get('C:\\\\mock\\\\values.csv') || ''; return [t.split('\\r\\n').length, t.slice(0, 80)]");
        if (vl[0] < 3 || !/time,table,address,name,value/.test(vl[1])) await conv("mm-vlog", `값 기록 파일이 이상함: ${JSON.stringify(vl)}`);
        await js("document.querySelector('.main .toolbar .vlog-btn').click()");
        await w(200);
        await js("[...document.querySelectorAll('.vlog-pop .btn')].find((b) => /기록 멈춤|Stop log/.test(b.textContent)).click()");
        await w(200);
        await js("window.__pdMock.dialog.save = null");
        await verify("mm value log");
        // 국번 찾기 1~20: 1·2·17 이 답한다(17 은 예외 01) → 표 만들기
        await js("[...document.querySelectorAll('aside .btn.small')].find((b) => /찾기|Scan/.test(b.textContent)).click()");
        await w(300);
        await js("const d = document.querySelector('.scan-dlg'); const ins = d.querySelectorAll('input'); __sm.setVal(ins[1], '20');");
        await w(150);
        await js("document.querySelector('.scan-dlg .scan-run .btn.primary').click()");
        await w(1200);
        const sc = await js("return { rows: [...document.querySelectorAll('.scan-dlg .rtable tbody tr')].map((r) => r.querySelector('td').textContent), done: !document.querySelector('.scan-dlg .scan-run .btn.danger') }");
        if (sc.rows.join(",") !== "1,2,17" || !sc.done) await conv("mm-scan", `국번 찾기 결과가 이상함: ${JSON.stringify(sc)}`);
        if (combo.name === "ko-light" || combo.name === "en-dark") await shot(app, `${combo.name}-mm-scan`);
        const tabsA = await js("return document.querySelectorAll('.tabs .tab').length");
        await js("document.querySelector('.scan-dlg .rtable tbody tr .btn').click()");
        await w(300);
        if ((await js("return document.querySelectorAll('.tabs .tab').length")) !== tabsA + 1 || (await js("return !!document.querySelector('.scan-dlg')"))) await conv("mm-scan", "찾은 국번으로 표를 만들지 못함");
        await verify("mm scan");
        // (10/19) 장비 프로필: 창 → 목록·레지스터 표·주의 문구 → 찾기 → 불러오기 → 안내한 수만큼 표가 더해지고 이름에 단위가 붙는다 → 더한 표 지우기
        {
          const tabsB = await js("return document.querySelectorAll('.tabs .tab').length");
          await js("[...document.querySelectorAll('.main .toolbar .btn.small')].find((b) => /장비 프로필|Device profile/.test(b.textContent)).click()");
          await w(300);
          const dv = await jsAsync(`
            const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
            const dlg = document.querySelector('.modal.dev-dlg');
            if (!dlg) return { open: false };
            const r = { open: true, items: dlg.querySelectorAll('.dev-item').length, rows: dlg.querySelectorAll('.dev-regs tbody tr').length, caution: !!dlg.querySelector('.dev-caution'), src: (dlg.querySelector('.dev-src') || {}).textContent || '' };
            const inp = dlg.querySelector('.dev-search');
            __sm.setVal(inp, 'zzzz-none'); await w(150);
            r.none = dlg.querySelectorAll('.dev-item').length;
            __sm.setVal(inp, ''); await w(150);
            const items = [...dlg.querySelectorAll('.dev-item')];
            items[items.length - 1].click(); await w(150);
            r.on = (dlg.querySelector('.dev-item.on b') || {}).textContent || '';
            const plan = (dlg.querySelector('.dev-plan') || {}).textContent || '';
            r.plan = plan;
            r.n = Number((plan.match(/(?:폴링 표|Adds) (\\d+)/) || [])[1] || 0);
            return r;`);
          if (combo.name === "ko-light" || combo.name === "en-dark") await shot(app, `${combo.name}-mm-device`);
          if (!dv.open || dv.items < 1 || dv.rows < 1 || !dv.caution || !dv.src || dv.none !== 0 || !dv.on || dv.n < 1) await conv("mm-device", `장비 프로필 창이 이상함: ${JSON.stringify(dv)}`);
          else {
            await js("document.querySelector('.modal.dev-dlg .dlg-buttons .btn.primary').click()");
            await w(400);
            const after = await js("return { tabs: document.querySelectorAll('.tabs .tab').length, open: !!document.querySelector('.modal.dev-dlg'), toast: (document.querySelector('.toast') || {}).textContent || '', names: [...document.querySelectorAll('.regs .reg .rname')].map((e) => e.textContent) }");
            if (after.open || after.tabs !== tabsB + dv.n || !/표 \d+개를 더했습니다|Added \d+ table/.test(after.toast) || !after.names.length)
              await conv("mm-device", `장비 프로필 불러오기 결과가 이상함: ${JSON.stringify({ n: dv.n, tabsB, ...after })}`);
            if (combo.name === "ko-light" || combo.name === "en-dark") await shot(app, `${combo.name}-mm-device-loaded`);
            for (let i = 0; i < dv.n; i++) {
              await js("[...document.querySelectorAll('.tabs .tab')].pop().querySelector('.tab-x').click()");
              await w(120);
            }
            await js("document.querySelector('.tabs .tab .tab-btn').click()");
            await w(200);
          }
          await verify("mm device profile");
        }
      }

      // ---- 항상 위 📌
      const pin = (await d.findElements(By.css(".icon-btn.pin")))[0];
      if (!pin) await conv("pin", "📌 버튼이 없음", false);
      else {
        const c0 = await calls("plugin:window|set_always_on_top");
        await pin.click();
        await sleep(200);
        const on = await pin.getAttribute("aria-pressed");
        if (on !== "true" || (await calls("plugin:window|set_always_on_top")) <= c0) await conv("pin", `📌 를 눌렀는데 항상 위가 켜지지 않음 (aria-pressed ${on})`);
        await pin.click();
        await sleep(150);
      }
      await blur();
      await verify("convenience end");
    }

    /** Serial·TCP·UDP 공통 기능(10/18) — 연결된 상태에서. 입력 이력·명령 단축키·간격 열·트리거·체크섬 옵션·반복 횟수·처리량,
     *  Serial: Break·터미널 보기·파일 보내기, TCP: 파일 보내기 */
    async function ioFeatures() {
      if (app !== "serial" && app !== "tcp" && app !== "udp") return;
      const snap = combo.name === "ko-light" || combo.name === "en-dark";
      // ---- 입력 이력 ↑/↓ (고치던 글은 맨 아래에서 ↓ 로)
      const inp = (await d.findElements(By.css(".sendtext")))[0];
      await js(`const m = [...document.querySelectorAll('.sendbar .sendrow select')].find((s) => s.querySelector('option[value=ascii]')); __sm.setVal(m, 'hex');`);
      await sleep(150);
      for (const v of ["0A 0B", "0C 0D"]) {
        await js(`__sm.setVal(document.querySelector('.sendtext'), ${JSON.stringify(v)})`);
        await sleep(150);
        await inp.click();
        await keys(Key.ENTER);
        await sleep(250);
      }
      await js(`__sm.setVal(document.querySelector('.sendtext'), '0E')`);
      await sleep(100);
      await inp.click();
      const seq = [];
      for (const k of [Key.ARROW_UP, Key.ARROW_UP, Key.ARROW_DOWN, Key.ARROW_DOWN]) {
        await keys(k);
        seq.push(await inp.getAttribute("value"));
      }
      if (JSON.stringify(seq) !== JSON.stringify(["0C 0D", "0A 0B", "0C 0D", "0E"])) await conv("history", `↑↑↓↓ 결과가 이상함: ${JSON.stringify(seq)} (기대 0C 0D, 0A 0B, 0C 0D, 0E)`);
      await js(`__sm.setVal(document.querySelector('.sendtext'), ${JSON.stringify(VALID_TEXT[app] === "STATUS?" ? "01 02" : VALID_TEXT[app])})`);
      await blur();

      // ---- 오른쪽 칸 펼치기(좁은 창이면)
      const nb = (await d.findElements(By.css(".toolbar .narrow-only")))[0];
      if (nb && (await nb.isDisplayed()) && !(await js("return !!document.querySelector('.app.show-right')"))) await nb.click();
      await sleep(200);
      // ---- 명령 단축키: 첫 명령에 F7, 다른 명령에서는 F7 을 고를 수 없음, F7 로 보내기
      const nCmd = await js("return document.querySelectorAll('.cmd').length");
      if (nCmd < 2) await js(`for (let i = 0; i < 2; i++) { document.querySelector('.sendrow.sub .add-cmd').click(); }`);
      await sleep(300);
      await js(`__sm.setVal(document.querySelectorAll('.cmd-key')[0], 'F7')`);
      await sleep(150);
      const f7 = await js(`const o = [...document.querySelectorAll('.cmd-key')[1].options].find((x) => x.value === 'F7'); return { taken: o && o.disabled, chip: document.querySelectorAll('.cmd-key')[0].value };`);
      if (!f7.taken || f7.chip !== "F7") await conv("hotkey", `단축키 겹침 막기·표시가 이상함: ${JSON.stringify(f7)}`);
      await blur();
      const s0 = await calls("send");
      await keys(Key.F7);
      await sleep(300);
      if ((await calls("send")) !== s0 + 1) await conv("hotkey", "F7 로 명령이 보내지지 않음");
      // ---- 트리거: 받은 줄에 오는 글자 → 색칠·사건 줄·횟수
      const pat = { serial: "TEMP", tcp: "READY", udp: "PING" }[app];
      const opened = await js("return !!document.querySelector('.trg-list')");
      if (!opened) await js("document.querySelector('.trg-toggle').click()");
      await sleep(100);
      await js("[...document.querySelectorAll('.trg-head .btn')].pop().click()");
      await sleep(200);
      await js(`__sm.setVal(document.querySelector('.trg-pat'), ${JSON.stringify(pat)})`);
      if (snap) await shot(app, `${combo.name}-triggers`);
      // 오른쪽 칸을 닫고(좁은 창) 로그를 본다
      const close = (await d.findElements(By.css(".close-right")))[0];
      if (close && (await close.isDisplayed())) await close.click();
      await sleep(2600);
      const tr = await js(`return { marked: document.querySelectorAll('.log .row.marked').length, ev: [...document.querySelectorAll('.log .row.ev .note')].some((n) => /TRIGGER/.test(n.textContent)), hits: (document.querySelector('.trg-total') || {}).textContent || '' };`);
      if (!tr.marked || !tr.ev || !/\d/.test(tr.hits)) await conv("trigger", `트리거가 맞은 줄을 칠하거나 알리지 않음: ${JSON.stringify(tr)}`);
      // ---- 간격 열: 응답 시간
      // 시간 간격 열은 도구줄 «보기 설정 ▾» 띄움 칸 안(10/18)
      await js(`document.querySelector('.main .toolbar .view-opt-btn').click()`);
      await sleep(150);
      await js(`__sm.setVal(document.querySelector('.view-pop .delta-sel'), 'prev'); __sm.key(window, 'Escape')`);
      await sleep(150);
      if (!(await js("return !document.querySelector('.view-pop') && document.querySelector('.main .toolbar .view-opt-btn').classList.contains('on')"))) await conv("view-opts", "«보기 설정» 이 Esc 로 닫히지 않거나 간격 열이 켜졌는데 버튼이 강조되지 않음");
      await sleep(400);
      const dts = await js("return [...document.querySelectorAll('.log .row .dt')].map((e) => e.textContent).filter(Boolean).length");
      if (!dts) await conv("delta", "«직전 줄과 간격» 을 골랐는데 간격 열이 비어 있음");
      if (snap) await shot(app, `${combo.name}-delta-trigger`);
      await js("window.__smoke.clip = null");
      // 맨 첫 줄(지우기 바로 뒤)은 앞 줄이 없어 간격이 비어 있다 — 마지막 RX 줄로.
      // 기록은 가상 목록이라 줄이 계속 오면 같은 요소가 다른 줄(간격 없는 EV TRIGGER 줄)로 바뀐다 — 찾기와 누르기를 한 번에(10/23)
      const row = await js("const r = [...document.querySelectorAll('.log .row.rx')].slice(-1)[0]; if (r) r.click(); return !!r;");
      if (row) {
        await blur();
        await chord([Key.CONTROL], "c");
        const clip = await js("return window.__smoke.clip");
        if (!clip || !/ \+\d/.test(clip)) await conv("delta-copy", `간격 열이 줄 복사에 들어가지 않음: ${JSON.stringify(clip)}`);
        await closeRight();
      }
      await js(`document.querySelector('.main .toolbar .view-opt-btn').click()`);
      await sleep(150);
      await js(`__sm.setVal(document.querySelector('.view-pop .delta-sel'), 'off'); __sm.key(window, 'Escape')`);
      await sleep(150);
      // ---- 처리량
      const ls = await js("return (document.querySelector('.live-stats') || {}).textContent || ''");
      if (!/B\/s/.test(ls)) await conv("live-stats", `처리량 표시가 없음: «${ls}»`);
      // ---- 체크섬 옵션: BCC + 앞 1바이트 빼고 → 미리보기가 달라진다
      const ck = await jsAsync(`
        const w = () => new Promise((r) => setTimeout(r, 200));
        const sel = document.querySelector('.sendbar .ck-pick select');
        __sm.setVal(document.querySelector('.sendtext'), '02 41 42 03'); await w();
        __sm.setVal(sel, 'bcc'); await w();
        const plain = document.querySelector('.sendbar .preview').textContent;
        document.querySelector('.sendbar .ck-opt').click(); await w();
        const dlg = !!document.querySelector('.modal.ck-dialog');
        const nums = document.querySelectorAll('.modal.ck-dialog input.num, .modal.ck-dialog input');
        __sm.setVal(nums[0], '1'); await w();
        __sm.setVal(nums[1], '1'); await w();
        __sm.key(window, 'Escape'); await w();
        const opt = document.querySelector('.sendbar .preview').textContent;
        const closed = !document.querySelector('.modal.ck-dialog');
        __sm.setVal(sel, ''); await w();
        return { plain, opt, dlg, closed };`);
      if (!ck.dlg || !ck.closed) await conv("ck-options", `체크섬 옵션 창이 열리거나 Esc 로 닫히지 않음: ${JSON.stringify(ck)}`);
      if (!/02 41 42 03 02/.test(ck.plain) || !/02 41 42 03 03/.test(ck.opt)) await conv("ck-options", `체크섬 범위·자리 옵션이 미리보기에 반영되지 않음: ${JSON.stringify(ck)}`);
      await js(`__sm.setVal(document.querySelector('.sendtext'), ${JSON.stringify(VALID_TEXT[app] === "STATUS?" ? "01 02" : VALID_TEXT[app])})`);
      // ---- 반복 횟수: 3번 보내고 멈춤
      {
        // Serial·TCP·UDP: 횟수 칸은 반복을 켰거나 횟수>0 일 때만 줄에 — 꺼져 있으면 «⋯ 더보기» 에서 정한다(TCP·UDP 10/18)
        const r = await jsAsync(`
          const w = () => new Promise((r) => setTimeout(r, 200));
          const inRow = !!document.querySelector('.sendrow.sub .rep-times');
          __sm.setVal(document.querySelector('.sendrow.sub input.num'), '100');
          document.querySelector('.sendrow.sub .more-btn').click(); await w();
          const pop = document.querySelector('.more-pop');
          const t = pop && pop.querySelector('.rep-times');
          if (t) __sm.setVal(t, '3');
          await w();
          const nowInRow = !!document.querySelector('.sendrow.sub .rep-times');
          __sm.key(window, 'Escape'); await w();
          return { inRow, pop: !!pop, inPop: !!t, nowInRow, closed: !document.querySelector('.more-pop') };`);
        if (r.inRow || !r.pop || !r.inPop || !r.nowInRow || !r.closed) await conv("more-times", `«⋯ 더보기» 의 반복 횟수·Esc 닫기가 이상함: ${JSON.stringify(r)}`);
      }
      await sleep(200);
      const box = (await d.findElements(By.css(".sendrow.sub label.inline input[type=checkbox]")))[0];
      if (box && (await box.isEnabled())) {
        await box.click();
        await sleep(1500);
        const r = await js("return { on: document.querySelector('.sendrow.sub label.inline input[type=checkbox]').checked, n: (document.querySelector('.rep-count') || {}).textContent }");
        if (r.on || !/3\/3/.test(r.n ?? "")) await conv("repeat-times", `3번 보내고 멈추지 않음: ${JSON.stringify(r)}`);
      }
      await js(`__sm.setVal(document.querySelector('.sendrow.sub .rep-times'), '0')`);
      await sleep(150);
      if ((await js("return !!document.querySelector('.sendrow.sub .rep-times')"))) await conv("more-times", "반복이 꺼지고 횟수 0 인데 횟수 칸이 줄에 남아 있음");
      // ---- (10/18) Serial: 줄 끝 두 번 알림줄 → «줄 끝 끄기», Modbus 요청 창 0 기준 40001 안내 → 4xxxx 로 바꾸기 → «보내기»
      if (app === "serial") {
        const r = await jsAsync(`
          const w = () => new Promise((r) => setTimeout(r, 200));
          const sr = document.querySelector('.sendbar .sendrow'); const sels = [...sr.querySelectorAll('select')];
          const mode = sels.find((x) => x.querySelector('option[value=ascii]')); const suf = sels[sels.length - 1];
          __sm.setVal(mode, 'ascii'); await w();
          __sm.setVal(suf, '\\\\r\\\\n'); await w();
          __sm.setVal(document.querySelector('.sendtext'), 'AT\\\\r\\\\n'); await w();
          const dup = document.querySelector('.dup-suffix');
          const dupText = dup ? dup.textContent : '';
          if (dup) dup.querySelector('.btn').click();
          await w();
          return { dup: !!dup, dupText, suffix: suf.value, gone: !document.querySelector('.dup-suffix') };`);
        if (r.fatal) add("dup suffix", "smoke-error", r.fatal);
        else if (!r.dup || r.suffix !== "" || !r.gone) await conv("dup-suffix", `줄 끝 두 번 알림줄·«줄 끝 끄기» 가 이상함: ${JSON.stringify(r)}`);
        const s0 = await calls("send");
        const m = await jsAsync(`
          const w = () => new Promise((r) => setTimeout(r, 250));
          document.querySelector('.sendbar .mb-open').click(); await w();
          const dlg = () => document.querySelector('.modal.mbuild');
          if (!dlg()) return { open: false };
          const seg = [...dlg().querySelectorAll('.mb-addrmode .seg')];
          seg[0].click(); await w();
          __sm.setVal(dlg().querySelector('.mb-grid input.mono'), '40001'); await w();
          const plc = dlg().querySelector('.mb-plc');
          const note = plc ? plc.textContent : '';
          if (plc) plc.querySelector('.btn').click();
          await w();
          const code = dlg().querySelector('.mb-preview code').textContent;
          const send = dlg().querySelector('.mb-send');
          const primary = send && send.classList.contains('primary') && !send.disabled;
          if (send) send.click();
          await w(); await w();
          return { open: true, plc: !!plc, note, code, primary, closed: !dlg() };`);
        if (m.fatal) add("mb send", "smoke-error", m.fatal);
        else if (!m.open || !m.plc || !/4xxxx/.test(m.note) || m.code !== "01 03 00 00 00 0A" || !m.primary || !m.closed) await conv("mb-send", `Modbus 요청 창의 4xxxx 안내·바꾸기·«보내기» 가 이상함: ${JSON.stringify(m)}`);
        if ((await calls("send")) !== s0 + 1) await conv("mb-send", "Modbus 요청 창 «보내기» 로 보내지지 않음");
        await verify("serial dup-suffix / modbus send");
        // (10/18) 요청 창으로 보낸 요청과 응답 짝짓기 — 응답 줄이 저절로 골라지고 상세에 «40001 = 값 (0x….)» 10줄, F32 면 5줄. 주소 41001(=1000) 은 예외 02
        const pr = await jsAsync(`
          const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
          await w(700);
          // 고른 줄은 로그가 굴러가 화면 밖(그려지지 않음)일 수 있다 — 상세 머리(«RX · 시각 …»)로 본다
          const head = document.querySelector('.right .detail > div');
          const selRx = !!head && head.textContent.startsWith('RX ');
          const pd = () => document.querySelector('.right .mb-paired');
          const rows = () => [...document.querySelectorAll('.right .mb-paired-table tr')].map((tr) => [...tr.children].map((td) => td.textContent).join(' '));
          const a = { selRx, paired: !!pd(), head: pd() ? pd().querySelector('.mb-paired-req').textContent : '', rows: rows() };
          const fmt = pd() && pd().querySelector('.mb-paired-tools select');
          if (fmt) { __sm.setVal(fmt, 'f32abcd'); await w(); }
          a.f32 = rows();
          if (fmt) { __sm.setVal(fmt, 'u16'); await w(); }
          // 예외: 요청 창에서 41001 → 보내기
          document.querySelector('.sendbar .mb-open').click(); await w();
          const dlg = document.querySelector('.modal.mbuild');
          __sm.setVal(dlg.querySelector('.mb-grid input.mono'), '41001'); await w();
          dlg.querySelector('.mb-send').click(); await w(800);
          a.exc = (document.querySelector('.right .mb-paired-exc') || {}).textContent || '';
          return a;`);
        if (pr.fatal) add("mb pair", "smoke-error", pr.fatal);
        else if (!pr.selRx || !pr.paired || pr.rows.length !== 10 || !/^40001 = \d+ \(0x[0-9A-F]{4}\)$/.test(pr.rows[0]) || !/^40010 /.test(pr.rows[9]) || pr.f32.length !== 5 || !/^40001–40002 = /.test(pr.f32[0]) || !/02 /.test(pr.exc))
          await conv("mb-pair", `요청 창으로 보낸 요청과 응답 짝짓기가 이상함: ${JSON.stringify(pr)}`);
        if (combo.name === "ko-light" || combo.name === "en-dark") {
          // 좁은 창이라 상세는 오른쪽 칸 안 — 펼쳐 찍고 닫는다
          await js("const b = document.querySelector('.toolbar .narrow-only'); b && !document.querySelector('.app.show-right') && b.click()");
          await sleep(300);
          await js("const e = document.querySelector('.right .mb-paired'); e && e.scrollIntoView({ block: 'start' })");
          await sleep(200);
          await shot(app, `${combo.name}-mb-pair`);
          await closeRight();
        }
        await verify("serial modbus pair");
        // (10/18) 요청 창으로 Modbus 를 보냈는데 받기가 Modbus 가 아니면 «받기도 Modbus 로 볼까요?» 한 번 → [예] = 프레임 구분 Modbus RTU + 수신 CRC16 Modbus.
        // 요청 창 아래 «따라하기 보기» → 요청 창은 닫히고 도움말이 Modbus 따라하기 절로
        const q = await jsAsync(`
          const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
          const frameSel = () => [...document.querySelectorAll('aside.side select')].find((s) => s.querySelector('option[value=modbus-rtu]'));
          const rxSel = () => [...document.querySelectorAll('aside.side details select')].find((s) => s.querySelector('option[value=crc16-modbus]'));
          const n = document.querySelector('.sendbar .mb-rx-ask');
          const a = { ask: !!n, frameBefore: frameSel().value };
          if (n) n.querySelector('.btn').click();
          await w();
          a.gone = !document.querySelector('.sendbar .mb-rx-ask'); a.frame = frameSel().value; a.rx = rxSel() ? rxSel().value : null;
          // 다시 보내도 또 묻지 않는다
          document.querySelector('.sendbar .mb-open').click(); await w();
          document.querySelector('.modal.mbuild .mb-send').click(); await w(500);
          a.again = !!document.querySelector('.sendbar .mb-rx-ask');
          document.querySelector('.sendbar .mb-open').click(); await w();
          const link = document.querySelector('.modal.mbuild .mb-help .link-btn');
          a.link = !!link;
          if (link) link.click();
          await w();
          a.mbClosed = !document.querySelector('.modal.mbuild');
          const on = document.querySelector('.modal.help .help-link.on'); a.help = on ? on.textContent : null;
          __sm.key(window, 'Escape'); await w();
          // 다음 점검을 위해 받기를 처음(끊김 시간)으로 — Modbus 를 고를 때 저절로 바꾼 체크섬도 되돌아간다
          __sm.setVal(frameSel(), 'gap'); await w();
          a.rxAfter = rxSel() ? rxSel().value : null;
          return a;`);
        if (q.fatal) add("mb rx ask", "smoke-error", q.fatal);
        else {
          if (!q.ask || q.frameBefore === "modbus-rtu" || !q.gone || q.frame !== "modbus-rtu" || q.rx !== "crc16-modbus" || q.again || q.rxAfter !== "") await conv("mb-rx-ask", `«받기도 Modbus 로 볼까요?» 알림줄이 이상함: ${JSON.stringify(q)}`);
          if (!q.link || !q.mbClosed || !/Modbus/.test(q.help ?? "")) await conv("mb-help-link", `요청 창 «따라하기 보기» 가 도움말 Modbus 절을 열지 않음: ${JSON.stringify(q)}`);
        }
        await verify("serial modbus rx ask / help link");
      }
      // (10/18) TCP: Modbus TCP 요청(MBAP)을 보내면 가짜 장비가 같은 트랜잭션 ID 로 답한다 → 응답 줄을 누르면 상세에 짝지은 값
      if (app === "tcp") {
        const pr = await jsAsync(`
          const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
          const sr = document.querySelector('.sendbar .sendrow'); const sels = [...sr.querySelectorAll('select')];
          const mode = sels.find((x) => x.querySelector('option[value=ascii]'));
          __sm.setVal(mode, 'hex'); await w();
          const ck = sels.find((x) => x.querySelector('option[value=crc16-modbus]')); if (ck) { __sm.setVal(ck, ''); await w(); }
          const suf = sels.find((x) => x.querySelector('option[value=""]') && /CR LF/.test(x.textContent)); if (suf) { __sm.setVal(suf, ''); await w(); }
          __sm.setVal(document.querySelector('.sendtext'), '00 2A 00 00 00 06 01 03 00 00 00 04'); await w();
          document.querySelector('.sendbar .sendrow .btn.primary').click(); await w(700);
          const rx = [...document.querySelectorAll('.log .row.rx')].filter((r) => /00 2A 00 00 00 0B 01 03 08/.test(r.textContent)).pop();
          if (!rx) return { rx: false, rows: [...document.querySelectorAll('.log .row')].slice(-4).map((r) => r.textContent) };
          rx.click(); await w();
          const pd = document.querySelector('.right .mb-paired');
          return { rx: true, paired: !!pd, head: pd ? pd.querySelector('.mbhead').textContent : '', rows: [...document.querySelectorAll('.right .mb-paired-table tr')].map((tr) => tr.textContent) };`);
        if (pr.fatal) add("tcp mb pair", "smoke-error", pr.fatal);
        else if (!pr.rx || !pr.paired || !/42/.test(pr.head) || pr.rows.length !== 4 || !/1812 \(0x0714\)/.test(pr.rows[0])) await conv("tcp-mb-pair", `Modbus TCP 응답 짝짓기가 이상함: ${JSON.stringify(pr)}`);
        await closeRight();
        await verify("tcp modbus pair");
      }
      // ---- Serial: Break · 터미널 보기
      if (app === "serial") {
        // Break 는 «⋯ 더보기» 안 — 열고 누른 뒤 Esc 로 닫는다
        await js("document.querySelector('.sendrow.sub .more-btn').click()");
        await sleep(200);
        await js("[...document.querySelectorAll('.more-pop .btn')].find((b) => b.textContent.trim() === 'Break').click()");
        await sleep(300);
        await js("__sm.key(window, 'Escape')");
        await sleep(150);
        // 맨 아래(새 줄)로 — 가상 목록은 보이는 줄만 그린다
        await blur();
        await keys(Key.END);
        await sleep(300);
        if (!(await js("return [...document.querySelectorAll('.log .row.ev .note')].some((n) => /BREAK 100ms/.test(n.textContent))"))) await conv("break", "Break 를 눌렀는데 «BREAK 100ms» 사건 줄이 없음");
        await js("[...document.querySelectorAll('.toolbar .seg')].pop().click()");
        await sleep(1600);
        const t = await js("return { term: !!document.querySelector('.term'), lines: document.querySelectorAll('.term .term-line').length }");
        if (!t.term || !t.lines) await conv("terminal", `터미널 보기가 비어 있음: ${JSON.stringify(t)}`);
        if (snap) await shot(app, `${combo.name}-terminal`);
        await verify("terminal view");
        await js("document.querySelector('.toolbar .seg').click()");
        await sleep(200);
      }
      // ---- 파일 보내기(Serial·TCP): 고르기 → 시작 → 진행 → 다 보냄
      if (app === "serial" || app === "tcp") {
        await mock("(window.__pdMock.dialog = { ...window.__pdMock.dialog, open: 'C:\\\\mock\\\\firmware.bin' }, true)");
        // «⋯ 더보기» 안(누르면 팝오버는 닫히고 창이 열린다) — TCP 도 10/18 부터
        await js("document.querySelector('.sendrow.sub .more-btn').click()");
        await sleep(200);
        await js(`[...document.querySelectorAll('.more-pop .btn')].find((b) => /…$/.test(b.textContent.trim())).click()`);
        await sleep(250);
        if (!(await js("return !!document.querySelector('.modal.file-dialog')"))) await conv("file-send", "«파일 보내기…» 로 창이 열리지 않음");
        else {
          await js("document.querySelector('.modal.file-dialog .row2 .btn').click()");
          await sleep(250);
          await js("document.querySelector('.modal.file-dialog .btn.primary').click()");
          await sleep(500);
          if (snap) await shot(app, `${combo.name}-file-sending`);
          await sleep(1600);
          const f = await js("return (document.querySelector('.modal.file-dialog .file-job') || {}).textContent || ''");
          if (!/4,096|4096/.test(f) || !/다 보냈|Sent everything/.test(f)) await conv("file-send", `파일 보내기 진행이 끝나지 않음: «${f}»`);
          await verify("file send");
          await keys(Key.ESCAPE);
          await sleep(200);
          if (await js("return !!document.querySelector('.modal.file-dialog')")) await conv("file-send", "Esc 로 파일 보내기 창이 닫히지 않음");
        }
        await mock("(window.__pdMock.dialog = { ...window.__pdMock.dialog, open: null }, true)");
      }
      await blur();
      await verify("io features");
    }

    /** 좁은 창(안쪽 760×600): 왼쪽 칸이 접히고 요약 줄·«⚙ 연결 설정» 이 보이며, 펼쳐도·연결해도 넘치지 않는지 */
    async function narrow() {
      await d.manage().window().setRect({ width: 760, height: 600 });
      const [iw, ih] = await d.executeScript("return [innerWidth, innerHeight]");
      if (iw !== 760 || ih !== 600) await d.manage().window().setRect({ width: 760 + (760 - iw), height: 600 + (600 - ih) });
      await load(port, combo);
      await verify("narrow load");
      const nb = await js("const b = document.querySelector('.narrow-bar'); return !!b && getComputedStyle(b).display !== 'none' && getComputedStyle(document.querySelector('aside.side')).display === 'none'");
      if (!nb) await conv("narrow", "760 너비에서 왼쪽 칸이 접히지 않거나 요약 줄이 없음");
      await js("document.querySelector('.narrow-bar .side-toggle').click()");
      await sleep(250);
      const side = await js("const s = document.querySelector('aside.side'); const r = s.getBoundingClientRect(); return getComputedStyle(s).display !== 'none' && r.width > 200 && r.right <= innerWidth");
      if (!side) await conv("narrow-side", "«⚙ 연결 설정» 으로 왼쪽 칸이 펼쳐지지 않음");
      await verify("narrow side open");
      if (combo.name === "ko-light" || combo.name === "en-dark") await shot(app, `${combo.name}-narrow-760-side`);
      await js("document.querySelector('.side-close').click()");
      await sleep(200);
      await js("document.querySelector('.narrow-bar .btn.primary').click()");
      await sleep(2500);
      await verify("narrow running");
      await shot(app, `${combo.name}-narrow-760-running`);
      await blur();
      await keys(Key.F4);
      await sleep(600);
      await fitWindow();
    }

    /** 기능 묶음 C(10/18) — 연결된 상태에서: Serial·TCP·UDP «자동응답»(규칙 추가·켜기·AUTO 줄·미리보기), Simulator 템플릿·장애 표시 */
    async function waveC() {
      const snap = combo.name === "ko-light" || combo.name === "en-dark";
      if (app === "simulator") {
        // 규칙 하나: 받으면 ASCII 포함 «READ», 응답 «{req 0..1} 00 {counter 2}» + 자세히(지연 범위·N번째·응답 둘) + 예시 요청
        await js("[...document.querySelectorAll('.ar > .arrow .btn.small')][0].click()");
        await sleep(200);
        const r = await jsAsync(`
          const w = () => new Promise((r) => setTimeout(r, 350));
          const card = [...document.querySelectorAll('.arcard')].pop();
          const sel = card.querySelectorAll('select');
          __sm.setVal(sel[0], 'ascii'); await w();
          __sm.setVal(card.querySelector('.arpat'), 'READ'); await w();
          __sm.setVal(card.querySelectorAll('select')[1], 'contains'); await w();
          // 새 규칙은 직전 규칙의 응답 형식을 물려받는다 — 앞 단계가 만든 규칙에 따라 ASCII 일 수 있어 HEX 로 정한다
          const replyMode = [...card.querySelectorAll('select')].filter((s) => s.querySelector('option[value=hex]'))[1];
          if (replyMode) { __sm.setVal(replyMode, 'hex'); await w(); }
          __sm.setVal(card.querySelector('.arreply'), '{req 0..1} 00 {counter 2}'); await w();
          card.querySelector('.armore-btn').click(); await w();
          const nums = card.querySelectorAll('.armore input.num');
          __sm.setVal(nums[1], '50'); await w();
          __sm.setVal(nums[2], '3'); await w();
          card.querySelector('.armore .btn.small:not(.ghost)').click(); await w();
          __sm.setVal(card.querySelector('.arsample'), 'READ?'); await w(); await w();
          return { pv: (card.querySelector('.arpreview') || {}).textContent || '', ok: (card.querySelector('.armore .hint.ok') || {}).textContent || '', badges: [...card.querySelectorAll('.arbadge')].map((b) => b.textContent), bad: card.classList.contains('bad') };`);
        if (r.fatal) return add("sim template", "smoke-error", r.fatal);
        if (!/52 45 00 00 00/.test(r.pv) || !r.ok || r.badges.length < 3 || r.bad) await conv("sim-template", `템플릿 미리보기·장애 표시가 이상함: ${JSON.stringify(r)}`);
        if (snap) await shot(app, `${combo.name}-template-faults`);
        await sleep(2500);
        const auto = await js("return [...document.querySelectorAll('.tlog .trow.ev .data')].some((n) => /AUTO rule/.test(n.textContent))");
        if (!auto) await conv("sim-auto", "규칙이 맞는 READ? 요청에 «AUTO» 줄이 없음");
        await verify("simulator template rule");
        return;
      }
      if (app !== "serial" && app !== "tcp" && app !== "udp") return;
      const nb = (await d.findElements(By.css(".toolbar .narrow-only")))[0];
      if (nb && (await nb.isDisplayed()) && !(await js("return !!document.querySelector('.app.show-right')"))) await nb.click();
      await sleep(200);
      const pat = { serial: "TEMP", tcp: "READY", udp: "PING" }[app];
      const r = await jsAsync(`
        const w = () => new Promise((r) => setTimeout(r, 350));
        const panel = document.querySelector('.ars-panel');
        if (!panel) return { none: true };
        if (!panel.querySelector('.ar')) { panel.querySelector('.trg-toggle').click(); await w(); }
        panel.querySelector('.ar > .arrow .btn.small').click(); await w();
        const card = [...panel.querySelectorAll('.arcard')].pop();
        __sm.setVal(card.querySelectorAll('select')[0], 'ascii'); await w();
        __sm.setVal(card.querySelectorAll('select')[1], 'contains'); await w();
        __sm.setVal(card.querySelector('.arpat'), ${JSON.stringify(pat)}); await w();
        __sm.setVal(card.querySelector('.arreply'), '4F 4B {counter 2}'); await w();
        card.querySelector('.armore-btn').click(); await w();
        __sm.setVal(card.querySelector('.arsample'), ${JSON.stringify(pat + "1")}); await w(); await w();
        const on = panel.querySelector('.trg-head input[type=checkbox]');
        if (!on.checked) on.click();
        await w();
        return { pv: (card.querySelector('.arpreview') || {}).textContent || '', ok: !!card.querySelector('.armore .hint.ok'), green: !!panel.querySelector('.ars-on'), active: (panel.querySelector('.ar > .arrow .hint.ok') || {}).textContent || '' };`);
      if (r.fatal) return add("auto reply", "smoke-error", r.fatal);
      if (r.none) return conv("auto-reply", "오른쪽 칸에 «자동응답» 이 없음");
      if (!/4F 4B 00 00/.test(r.pv) || !r.ok || !r.green || !/1/.test(r.active)) await conv("auto-reply", `자동응답 규칙·미리보기·켜기 표시가 이상함: ${JSON.stringify(r)}`);
      if (snap) await shot(app, `${combo.name}-auto-reply`);
      const close = (await d.findElements(By.css(".close-right")))[0];
      if (close && (await close.isDisplayed())) await close.click();
      await sleep(app === "serial" ? 3600 : 2600);
      await blur();
      await keys(Key.END);
      await sleep(300);
      const got = await js("return { auto: [...document.querySelectorAll('.log .row.ev .note')].some((n) => /AUTO rule/.test(n.textContent)), tx: [...document.querySelectorAll('.log .row.tx .hex')].some((n) => /^4F 4B 00/.test(n.textContent)) }");
      if (!got.auto || !got.tx) await conv("auto-reply-run", `켜 둔 자동응답이 답하지 않음: ${JSON.stringify(got)}`);
      // 끄기 — 다른 점검(보낸 줄 수 등)에 섞이지 않게
      if (nb && (await nb.isDisplayed()) && !(await js("return !!document.querySelector('.app.show-right')"))) await nb.click();
      await sleep(200);
      await js("const on = document.querySelector('.ars-panel .trg-head input[type=checkbox]'); if (on && on.checked) on.click();");
      await sleep(200);
      if (close && (await close.isDisplayed())) await close.click();
      await verify("auto reply");
    }

    /** 기능 묶음 C — 멈춘 뒤 다시 열어서: TCP 중계·Modbus TCP·이 PC 주소, UDP 멀티캐스트 TTL·랜카드 */
    async function waveCStopped() {
      const snap = combo.name === "ko-light" || combo.name === "en-dark";
      if (app === "tcp") {
        // 이 PC 에 없는 주소 — 시작 전 경고, 시작하면 이 PC 주소 목록이 붙은 오류
        await load(port, combo, { cfg: { mode: "server", host: "10.9.9.9", port: 5020, noDelay: true, autoReconnect: true, reconnectMs: 2000, echo: false } });
        const warn = await js("return [...document.querySelectorAll('aside .interlock')].map((e) => e.textContent).join(' ')");
        if (!/10\.9\.9\.9/.test(warn)) await conv("iface-warn", `이 PC 에 없는 주소인데 시작 전 경고가 없음: «${warn}»`);
        const ifl = await js("return document.querySelectorAll('aside .ifaces button.iface').length");
        if (ifl < 2) await conv("iface-list", `«이 PC 주소» 목록이 비었음 (${ifl})`);
        await clickRun("listen non-local", (x) => !STOP_RE.test(x.btn ?? ""));
        const err = await js("return (document.querySelector('.error') || {}).textContent || ''");
        if (!/192\.168\.0\.15/.test(err)) await conv("iface-error", `없는 주소 오류에 이 PC 주소가 붙지 않음: «${err}»`);
        // 목록에서 눌러 고르기
        await js("document.querySelector('aside .ifaces button.iface').click()");
        await sleep(150);
        if ((await js("return document.querySelector('aside.side input[list=tcp-ifaces]').value")) !== "192.168.0.15") await conv("iface-pick", "«이 PC 주소» 를 눌러도 묶을 주소가 바뀌지 않음");
        if (snap) await shot(app, `${combo.name}-iface-list`);
        // 중계 + Modbus TCP 프레임
        await load(port, combo, {
          cfg: { mode: "relay", host: "0.0.0.0", port: 5020, noDelay: true, autoReconnect: true, reconnectMs: 2000, echo: false },
          relayTo: { host: "192.168.0.50", port: 502 },
          framing: { kind: "modbus-tcp", gapMs: 1000 },
        });
        await clickRun("relay start", (x) => STOP_RE.test(x.btn ?? "") && /듣는|Listening/.test(x.status ?? ""));
        await sleep(2500);
        const rows = await js("return { ab: [...document.querySelectorAll('.log .row.rx .dir')].some((e) => /A→B/.test(e.textContent)), ba: [...document.querySelectorAll('.log .row.tx .dir')].some((e) => /B→A/.test(e.textContent)), relay: [...document.querySelectorAll('.log .row.ev .note')].some((n) => /RELAY .*⇄/.test(n.textContent)), pairs: document.querySelectorAll('aside .peer').length }");
        if (!rows.ab || !rows.ba || !rows.relay || !rows.pairs) await conv("relay", `중계 기록·쌍 표시가 이상함: ${JSON.stringify(rows)}`);
        // (10/18) 듣는 방식의 실행 중 버튼은 «듣기 멈춤», 상대 주소는 줄임표(끊기 버튼은 왼쪽 칸 안)
        const pe = await js(`const b = document.querySelector(${JSON.stringify(RUN_BTN)}); const side = document.querySelector('aside.side').getBoundingClientRect();
          return { btn: b.textContent.trim(), peers: [...document.querySelectorAll('aside .peer')].map((p) => ({ ell: getComputedStyle(p.querySelector('.mono')).textOverflow, title: !!p.querySelector('.mono').title, kick: p.querySelector('.btn').getBoundingClientRect().right <= side.right + 1 })) };`);
        if (!/^(듣기 멈춤|Stop listening)$/.test(pe.btn) || !pe.peers.length || pe.peers.some((p) => p.ell !== "ellipsis" || !p.title || !p.kick)) await conv("tcp-stop-peers", `«듣기 멈춤»·상대 줄임표가 이상함: ${JSON.stringify(pe)}`);
        // (10/18) 상대가 둘 이상이면 «모두 끊기 (n)» — 하나면 없음
        const ka = await js("return { n: document.querySelectorAll('aside .peer').length, btn: !!document.querySelector('aside .kick-all') }");
        if ((ka.n > 1) !== ka.btn) await conv("tcp-kick-all", `«모두 끊기» 버튼 유무가 상대 수와 맞지 않음: ${JSON.stringify(ka)}`);
        // 줄을 눌러 MBAP 풀이
        const row = (await d.findElements(By.css(".log .row.tx"))).slice(-1)[0];
        if (row) {
          await row.click();
          await sleep(400);
          const nbr = (await d.findElements(By.css(".toolbar .narrow-only")))[0];
          if (nbr && (await nbr.isDisplayed()) && !(await js("return !!document.querySelector('.app.show-right')"))) await nbr.click();
          await sleep(300);
          const mb = await js("return (document.querySelector('.right .modbus') || {}).textContent || ''");
          if (!/Modbus TCP/.test(mb) || !/0x03|03/.test(mb)) await conv("mbap-detail", `MBAP 풀이가 상세 칸에 없음: «${mb.slice(0, 160)}»`);
          if (snap) await shot(app, `${combo.name}-relay-mbap`);
          const close = (await d.findElements(By.css(".close-right")))[0];
          if (close && (await close.isDisplayed())) await close.click();
        }
        // B 쪽 끼워 넣기
        await js("const s = document.querySelector('.sendbar .sendrow select.target-sel'); __sm.setVal(s, 'b');");
        await js(`__sm.setVal(document.querySelector('.sendtext'), '01 02')`);
        await sleep(300);
        await js("document.querySelector('.sendbar .sendrow .btn.primary').click()");
        await sleep(400);
        await blur();
        await keys(Key.END);
        await sleep(300);
        if (!(await js("return [...document.querySelectorAll('.log .row.ev .note')].some((n) => /INJECT → B/.test(n.textContent))"))) await conv("relay-inject", "B 쪽으로 보냈는데 «INJECT → B» 줄이 없음");
        // Modbus TCP 요청 만들기 → 입력칸
        await js("document.querySelector('.sendbar .mb-open').click()");
        await sleep(300);
        const mbp = await js("return (document.querySelector('.modal.mbuild .mb-preview code') || {}).textContent || ''");
        if (!/^\d\d \d\d 00 00 00 06 01 03 /.test(mbp)) await conv("mb-build-tcp", `Modbus TCP 요청 미리보기가 MBAP 모양이 아님: «${mbp}»`);
        if (snap) await shot(app, `${combo.name}-mb-build-tcp`);
        await verify("modbus tcp builder");
        await js("document.querySelector('.modal.mbuild .btn.primary').click()");
        await sleep(300);
        const st = await js("return document.querySelector('.sendtext').value");
        if (!/00 00 00 06 01 03/.test(st)) await conv("mb-build-put", `«입력칸에 넣기» 뒤 보내기 칸: «${st}»`);
        const tidBox = await js("return !!document.querySelector('.send-tools input[type=checkbox]')");
        if (!tidBox) await conv("mbap-tid", "Modbus TCP 프레임인데 «트랜잭션 ID 자동 증가» 가 없음");
        await clickRun("relay stop", (x) => !STOP_RE.test(x.btn ?? ""));
      }
      if (app === "udp") {
        await load(port, combo, { cfg: { bindHost: "0.0.0.0", bindPort: 5000, remoteHost: "239.1.2.3", remotePort: 5000, broadcast: false, multicastGroup: "239.1.2.3", multicastIf: "10.10.1.23", multicastTtl: 4, multicastLoop: false, echo: false } });
        const f = await js("return { ttl: !!document.querySelector('label.mc-loop'), list: document.querySelectorAll('#udp-ifaces-mc option').length }");
        if (!f.ttl || f.list < 2) await conv("udp-mc", `멀티캐스트 TTL·랜카드 칸이 없음: ${JSON.stringify(f)}`);
        if (snap) await shot(app, `${combo.name}-multicast`);
        await clickRun("multicast start", (x) => STOP_RE.test(x.btn ?? ""));
        await sleep(400);
        const bind = await js("return [...document.querySelectorAll('.log .row.ev .note')].map((n) => n.textContent).find((t) => /^BIND/.test(t)) || ''");
        if (!/if 10\.10\.1\.23/.test(bind) || !/ttl 4/.test(bind) || !/noloop/.test(bind)) await conv("udp-mc-bind", `BIND 줄에 랜카드·TTL·되돌려 받기가 없음: «${bind}»`);
        await clickRun("multicast stop", (x) => !STOP_RE.test(x.btn ?? ""));
      }
      // 좁은 창(760×600)에서 오른쪽 «자동응답» 을 펼친 모양
      if ((app === "serial" || app === "tcp" || app === "udp") && snap) {
        await d.manage().window().setRect({ width: 760, height: 600 });
        const [iw, ih] = await d.executeScript("return [innerWidth, innerHeight]");
        if (iw !== 760 || ih !== 600) await d.manage().window().setRect({ width: 760 + (760 - iw), height: 600 + (600 - ih) });
        await load(port, combo, {
          autoReplyOpen: true,
          autoRules: [{ name: "modbus tcp", enabled: true, pattern: "?? ?? 00 00 00 06 ?? 03 **", patternMode: "hex", kind: "exact", reply: { text: "{req 0..1} 00 00 00 07 {req 6} 03 04 00 64 00 C8", mode: "hex", checksum: null, suffix: "" }, delayMs: 0, delayMaxMs: 40, dropEvery: 5, sample: "00 01 00 00 00 06 01 03 00 00 00 02" }],
        });
        await js("const b = document.querySelector('.toolbar .narrow-only'); b && !document.querySelector('.app.show-right') && b.click()");
        await sleep(300);
        await js("const b = document.querySelector('.ars-panel .armore-btn'); b && b.click()");
        await sleep(700);
        await js("const m = document.querySelector('.ars-panel .arpreview') || document.querySelector('.ars-panel .armore'); m && m.scrollIntoView({ block: 'end' })");
        await sleep(200);
        await verify("narrow auto reply");
        await shot(app, `${combo.name}-narrow-760-auto-reply`);
        await fitWindow();
        // 열어 둔 오른쪽 칸·자동응답 저장값을 지우고 다음 점검으로
        await load(port, combo);
      }
    }

    /** (10/25) Port Inspector — 실행 버튼이 없는 읽기 앱이라 따로 돈다: 첫 실행 카드·대화상자 → 포트 고르기·카드 결과 →
     *  기록·COM 번호·랜카드 → 연결 시험(루프백·에코·사용 중·돌아오지 않음) → 숨은 장치 → 복사·저장 → 다 눌러 보기 → 좁은 창.
     *  가짜 장치는 mock.js «Port Inspector» 부분(COM5 FTDI = 볼 것, COM9 문제 코드 10·사용 중, COM1 루프백 안 돌아옴, 숨은 COM12) */
    async function inspectorFlow() {
      const BAN = /진단|정상 판정|검증|diagnos|verif/i;
      await load(port, combo);
      await fitWindow();
      await load(port, combo);
      await verify("load");
      // 첫 실행 카드 + 도움말 링크(«처음 쓰는 순서» 절)
      const card = await js(`const c = document.querySelector('.first-card'); return c && { links: c.querySelectorAll('.first-links .link-btn').length, hide: !!c.querySelector('.first-hide') }`);
      if (!card || !card.links || !card.hide) await conv("first-card", `첫 실행 카드가 이상함: ${JSON.stringify(card)}`);
      else {
        await js("[...document.querySelectorAll('.first-card .first-links .link-btn')].pop().click()");
        await sleep(250);
        const h = await js("const a = document.querySelector('.modal.help .help-link.on'); return a && a.textContent");
        if (!h || !/처음 쓰는 순서|Getting started/.test(h)) await conv("first-help", `카드의 도움말 링크로 연 절이 «${h}»`);
        await keys(Key.ESCAPE);
        await verify("first-card help");
        if (combo.full) await shot(app, `${combo.name}-first-card`);
      }
      // 대화상자: ? → Esc, F1 → Esc, ⚙ → ✕, ! → Esc (포커스 제자리)
      for (const [label, open, close] of [
        ["help", "?", "esc"],
        ["settings", "⚙", "x"],
        ["report", "!", "esc"],
      ]) {
        const ok = await js(`const b = [...document.querySelectorAll('.brand-tools button')].find((x) => x.textContent.trim() === ${JSON.stringify(open)}); if (b) { b.focus(); b.click(); } return !!b;`);
        if (!ok) {
          add(label, "dialog", `«${open}» 버튼이 없음`);
          continue;
        }
        await sleep(250);
        if (!(await js("return !!document.querySelector('.modal-back')"))) add(label, "dialog", `«${open}» 로 창이 열리지 않음`);
        if (combo.full) await pageExercise(label, ".modal-back", { scope: "modal", depth: 1, skip: ".modal-head button" });
        if (close === "x") await js("const x = document.querySelector('.modal-back .modal-head button'); x && x.click()");
        else await keys(Key.ESCAPE);
        await sleep(200);
        if (await js("return !!document.querySelector('.modal-back')")) add(label, "dialog", `${label} 창이 닫히지 않음`);
        await verify(`${label} close`, { expectFocus: true });
      }
      await blur();
      await keys(Key.F1);
      if (!(await js("return !!document.querySelector('.modal.help')"))) add("F1", "dialog", "F1 로 도움말이 열리지 않음");
      await keys(Key.ESCAPE);
      await verify("help F1 → Esc");

      // ---- 포트 고르기: COM5(FTDI) — 장치 문제 없음·설정 볼 것(지연 16ms)·절전 볼 것 → 전체 «볼 것»
      const pick = (com) => js(`const b = [...document.querySelectorAll('.port-item')].find((x) => x.querySelector('.pi-port').textContent.trim() === ${JSON.stringify(com)}); if (b) b.click(); return !!b;`);
      if (!(await pick("COM5"))) add("pick COM5", "expect", "목록에 COM5 가 없음");
      // (0.3.0) «Serial 로 열기» — 고른 포트를 넘긴다
      if (combo.full) await openAppCheck("pi-open-serial", ".open-serial", (o) => o.app === "serial" && o.port === "COM5", "await w(300);");
      // (10/26) USB 장치면 «USB 경로» 카드가 하나 더(COM5 = 장치 → 버스 전원 허브 → 루트 허브 → 컨트롤러)
      // (10/26) «이 PC» 카드가 하나 더 — 9장
      await expectJs("cards", "return document.querySelectorAll('details.card').length === 9");
      await expectJs("usb path", `const c = document.querySelector('details.card-usb'); return !!c && c.querySelectorAll('table.usb-path tbody tr').length === 4 && /Full Speed/.test(c.textContent) && /${ko ? "버스 전원" : "bus-powered"}/.test(c.textContent) && /lv-ok/.test(c.querySelector('summary .lv').className)`);
      await expectJs("com5 verdicts", `const lv = (id) => (document.querySelector('details.card-' + id + ' > summary .lv') || {}).className || '';
        return /lv-ok/.test(lv('device')) && /lv-look/.test(lv('settings')) && /lv-look/.test(lv('power')) && /lv-look/.test(document.querySelector('.toolbar .lv').className)`);
      await expectJs("com5 title", `return /^COM5 · USB Serial Port · ${ko ? "볼 것" : "Worth a look"} — PortDock Port Inspector$/.test(document.title)`);
      // 카드는 내용 자체라 기본으로 펼쳐 둔다(«모두 펼치기» 와 상관없이)
      await expectJs("cards open", "return [...document.querySelectorAll('details.card')].every((x) => x.open)");
      // 접힌 기본(화면만 훑는 조합)이면 카드를 펼쳐 둔다
      await js("document.querySelectorAll('details.card').forEach((x) => (x.open = true))");
      await sleep(200);
      await expectJs("latency note", `return /LatencyTimer/.test(document.querySelector('details.card-settings').textContent) && /${ko ? "지연 타이머 16ms" : "Latency timer 16 ms"}/.test(document.querySelector('details.card-settings').textContent)`);
      await expectJs("events", "return document.querySelectorAll('details.card-history table.events tr').length >= 3", 4000);
      // 하루에 세 번 다시 연결(가짜 기록) → 기록 «볼 것»
      await expectJs("history look", "return /lv-look/.test(document.querySelector('details.card-history > summary .lv').className)");
      await expectJs("com numbers", "return /COM4, COM17/.test(document.querySelector('details.card-com').textContent)");
      await expectJs("cannot see", `const c = document.querySelector('.cannot-see'); return !!c && /A\\/B/.test(c.textContent) && c.querySelectorAll('.guide-links a').length === 5`);
      if (combo.full) await shot(app, `${combo.name}-com5`);
      // 기록 기간 7일 → 3일 전 몰린 연결이 빠진다
      await setIn("details.card-history select", "7");
      await expectJs("events 7 days", "return document.querySelectorAll('details.card-history table.events tr').length >= 2 && !document.querySelector('details.card-history tr.ev-install')", 4000);
      await setIn("details.card-history select", "30");
      // 랜카드
      await clickText("details.card-nics .btn", ko ? "랜카드 읽기" : "Read adapters");
      await expectJs("nics", `const c = document.querySelector('details.card-nics'); return !!c && c.querySelectorAll('.nic-block').length === 3 && /${ko ? "반이중" : "half duplex"}/.test(c.textContent) && /1 Gbps/.test(c.textContent)`);
      // (10/26) 랜카드 점검 — 일반 용도: 이더넷 2(10 Mbps·반이중·받기 오류)만 «볼 것», 제조사 예 칸 없음
      const nicLv = (i) => `(document.querySelectorAll('details.card-nics .nic-block')[${i}].querySelector('.nic-head .lv') || {}).className || ''`;
      await expectJs("nics general", `return /lv-ok/.test(${nicLv(0)}) && /lv-look/.test(${nicLv(1)}) && !document.querySelector('details.card-nics .nic-vendor') && /\\*JumboPacket/.test(document.querySelector('details.card-nics table.nic-props').textContent)`);
      // 카메라 용도: 이더넷(점보 꺼짐·버퍼 512/2048·절전·공용·방화벽) «볼 것» + 제조사 예(Basler·Balluff 둘 다) + 볼 수 없는 것
      await setIn("details.card-nics select", "camera");
      await expectJs("nics camera", `const c = document.querySelector('details.card-nics'); const b = c.querySelectorAll('.nic-block')[0];
        return /lv-look/.test(${nicLv(0)}) && /${ko ? "점보 프레임 꺼짐" : "Jumbo frames off"}/.test(b.textContent) && /${ko ? "최대 2048" : "maximum 2048"}/.test(b.textContent)
          && b.querySelectorAll('.nic-vendor a').length >= 4 && /Balluff/.test(b.textContent) && /${ko ? "PC 가 볼 수 없는 것\\(랜카드\\)" : "What the PC cannot see \\(network\\)"}/.test(c.textContent)`);
      if (combo.full) await shot(app, `${combo.name}-nics-camera`);
      await js("window.__smoke.clip = null");
      await clickText(".toolbar .btn", ko ? "텍스트 복사" : "Copy text");
      await expectJs("nics copy", `const c = window.__smoke.clip || ''; return /baslerweb/.test(c) && /\\*JumboPacket/.test(c) && !${BAN}.test(c)`);
      // PLC 용도: EEE 켜짐(이더넷 2)
      await setIn("details.card-nics select", "plc");
      await expectJs("nics plc", `return /EEE/.test(document.querySelectorAll('details.card-nics .nic-block')[1].textContent) && !document.querySelector('details.card-nics .nic-vendor')`);
      await setIn("details.card-nics select", "general");
      // (10/26) 이 PC — 일반 PC: 설정은 적기만, 예기치 않은 종료(41·6008)·disk 경고만 «볼 것». «문제 있음» 없음
      await clickText("details.card-pc .btn", ko ? "이 PC 설정 읽기" : "Read this PC's settings");
      const pcLv = (id) => `((document.querySelector('details.card-pc tr.pc-' + ${JSON.stringify(id)}) || document.body).querySelector('.lv') || {}).className || ''`;
      await expectJs("pc general", `const c = document.querySelector('details.card-pc'); return !!c && c.querySelectorAll('table.pc-items tr').length === 13 && /lv-look/.test(c.querySelector('summary .lv').className)
        && /lv-ok/.test(${pcLv("fastStartup")}) && /lv-ok/.test(${pcLv("sleep")}) && /lv-look/.test(${pcLv("unexpected")}) && /lv-look/.test(${pcLv("hardware")}) && !c.querySelector('.lv-problem')
        && /Kernel-Power 41: 2/.test(c.textContent) && c.textContent.includes('powercfg /requests') && /${ko ? "관리자만 읽을 수 있음" : "Administrator only"}/.test(c.textContent)`, 4000);
      // 장비 PC: 빠른 시작·절전·USB 절전·자동 재시작 정책 없음·재시작 대기·시간 경고도 «볼 것», Microsoft 문서 링크
      await setIn("details.card-pc select.pc-purpose", "equipment");
      await expectJs("pc equipment", `const c = document.querySelector('details.card-pc'); return ["fastStartup", "sleep", "usbSuspend", "updatePolicy", "rebootPending", "time"].every((id) => /lv-look/.test(((c.querySelector('tr.pc-' + id) || c).querySelector('.lv') || {}).className || ''))
        && /lv-ok/.test(${pcLv("display")}) && !c.querySelector('.lv-problem') && [...c.querySelectorAll('a')].some((a) => a.href.startsWith('https://learn.microsoft.com/')) && /${ko ? "업데이트를 끄라는 뜻은 아닙니다" : "not advice to turn updates off"}/.test(c.textContent)`);
      if (combo.full) await shot(app, `${combo.name}-pc-equipment`);
      // 기록 기간 7일 → 20일 전 disk 경고가 빠진다
      await setIn("details.card-pc select.pc-days", "7");
      await expectJs("pc 7 days", `return /lv-ok/.test(${pcLv("hardware")}) && /lv-look/.test(${pcLv("unexpected")})`, 3000);
      await setIn("details.card-pc select.pc-days", "30");
      await expectJs("pc 30 days", `return /lv-look/.test(${pcLv("hardware")})`, 3000);
      await js("window.__smoke.clip = null");
      await clickText(".toolbar .btn", ko ? "텍스트 복사" : "Copy text");
      await expectJs("pc copy", `const c = window.__smoke.clip || ''; return c.includes(${JSON.stringify(ko ? "## 이 PC (최근 30일)" : "## This PC (last 30 days)")}) && /Kernel-Power 41/.test(c) && c.includes('powercfg /requests') && !${BAN}.test(c)`, 3000);
      await setIn("details.card-pc select.pc-purpose", "general");

      // ---- (0.5.0) 무선 탭 — 열면 읽는다. Wi-Fi = 장치 절전·전원 연결 절전·잦은 끊김 «볼 것», 블루투스 = 허브 경유·핸즈프리 기본 출력 «볼 것».
      //      «문제 있음» 없음, 링크는 Microsoft 문서만, 복사·JSON 에는 오디오 장치 이름이 «장치 1» 로 가려지고 포트 결과가 섞이지 않는다
      await clickText(".tabs .seg", ko ? "무선 (Wi-Fi·블루투스)" : "Wireless (Wi-Fi, Bluetooth)");
      const wlLv = (id) => `((document.querySelector('tr.wl-${id}') || document.body).querySelector('.lv') || {}).className || ''`;
      await expectJs("wireless", `const w = document.querySelector('details.card-wifi'), b = document.querySelector('details.card-bt');
        return !!w && !!b && /lv-look/.test(w.querySelector('summary .lv').className) && /lv-look/.test(b.querySelector('summary .lv').className) && !document.querySelector('.wl-cards .lv-problem')
          && /Example Buds/.test(b.textContent) && /${ko ? "26건" : "26 in the last"}/.test(w.textContent) && !document.querySelector('details.card-device')
          && document.title.startsWith(${JSON.stringify(ko ? "무선 — Wi-Fi·블루투스 · 볼 것" : "Wireless — Wi-Fi and Bluetooth · Worth a look")})`, 4000);
      await expectJs("wireless rows", `return [${["wifiDevicePower", "wifiPowerPlan", "wifiDisconnects", "btUsbPath", "btAudio"].map(wlLv).join(", ")}].every((c) => /lv-look/.test(c))
        && /lv-ok/.test(${wlLv("btService")}) && /lv-ok/.test(${wlLv("wifiDriverEvents")}) && document.querySelectorAll('.wl-cards a').length >= 2
        && [...document.querySelectorAll('.wl-cards a')].every((a) => /^https:\\/\\/(support|learn)\\.microsoft\\.com\\//.test(a.href))`);
      if (combo.full) await shot(app, `${combo.name}-wireless`);
      // 기간 7일 → 20일 전 드라이버 경고가 빠진다, 90일 → 끊김 26건은 «잦음» 이 아니다
      await setIn(".toolbar select.wl-days", "7");
      await expectJs("wireless 7 days", `return /${ko ? "경고·오류 없음\\(최근 7일\\)" : "no warnings or errors \\(last 7 days\\)"}/.test((document.querySelector('tr.wl-wifiDriverEvents') || {}).textContent || '')`, 3000);
      await setIn(".toolbar select.wl-days", "90");
      await expectJs("wireless 90 days", `return /lv-ok/.test(${wlLv("wifiDisconnects")}) && /Netwtw14 6062: 4/.test((document.querySelector('tr.wl-wifiDriverEvents') || {}).textContent || '')`, 3000);
      await setIn(".toolbar select.wl-days", "30");
      await expectJs("wireless 30 days", `return /lv-look/.test(${wlLv("wifiDisconnects")})`, 3000);
      await js("window.__smoke.clip = null");
      await clickText(".toolbar .btn", ko ? "텍스트 복사" : "Copy text");
      await expectJs("wireless copy", `const c = window.__smoke.clip || ''; return c.includes(${JSON.stringify(ko ? "## 블루투스 [볼 것]" : "## Bluetooth [Worth a look]")}) && c.includes(${JSON.stringify(ko ? "장치 1 — 출력" : "Device 1 — output")}) && !/Example Buds/.test(c) && !/LatencyTimer/.test(c) && c.includes('netsh wlan show wlanreport') && !${BAN}.test(c)`, 3000);
      await clickText(".toolbar .btn", ko ? "JSON 복사" : "Copy JSON");
      await expectJs("wireless json", "try { const c = window.__smoke.clip || ''; const j = JSON.parse(c); return j.wireless.bt.audio[0].name === 'device-1' && !/Example Buds/.test(c) && !j.report; } catch { return false; }");
      await expectJs("wireless wording", `return !${BAN}.test(document.querySelector('.wl-cards').innerText)`);
      await verify("wireless");
      await clickText(".tabs .seg", ko ? "COM 포트" : "COM ports");
      await expectJs("back to ports", "return document.querySelectorAll('details.card').length === 9 && /COM5/.test(document.querySelector('.toolbar .sel-title').textContent)");

      // ---- 연결 시험: 루프백(묻고 시작) → 속도 5개 «볼 것»(왕복 16ms)
      const startLoop = async (step) => {
        await clickText(".loop-panel .loop-actions .btn.primary", ko ? "시험 시작" : "Start test");
        await expectJs(`${step} ask`, "return !!document.querySelector('.loop-sure')");
        await clickText(".loop-sure .btn.primary");
      };
      await startLoop("loop COM5");
      await expectJs("loop running title", `return /${ko ? "시험 중" : "testing"}/.test(document.title)`, 1500);
      await expectJs("loop COM5 rows", "return document.querySelectorAll('.loop-table tbody tr').length === 5 && [...document.querySelectorAll('.loop-table tbody .lv')].every((x) => /lv-look/.test(x.className)) && !document.querySelector('.loop-actions .btn.danger')", 6000);
      if (combo.full) await shot(app, `${combo.name}-loop`);
      // 에코
      await js("[...document.querySelectorAll('.loop-modes input[type=radio]')][1].click()");
      await sleep(150);
      await startLoop("echo COM5");
      await expectJs("echo COM5", "const e = document.querySelector('.loop-echo'); return !!e && /lv-look/.test(e.querySelector('.lv').className)", 3000);
      await js("[...document.querySelectorAll('.loop-modes input[type=radio]')][0].click()");
      // 시험 중 멈춤
      await startLoop("loop cancel");
      await sleep(150);
      await clickText(".loop-actions .btn.danger");
      await expectJs("loop cancelled", "return !document.querySelector('.loop-actions .btn.danger') && document.querySelectorAll('.loop-table tbody tr').length < 5", 3000);
      // (10/26) 시험 중 다른 포트를 고르면 앞 시험을 멈추고, 앞 포트 결과가 새 포트 표에 들어오지 않는다
      await startLoop("loop switch");
      await sleep(150);
      await pick("COM3");
      await expectJs("loop switch stops", `return !document.querySelector('.loop-actions .btn.danger') && window.__pdMock.loop()?.done === true && window.__pdMock.loop()?.cancel === true && !/${ko ? "시험 중" : "testing"}/.test(document.title)`, 3000);
      await sleep(300);
      await expectJs("loop switch no rows", "return document.querySelectorAll('.loop-table tbody tr').length === 0");
      // (10/26) 늦게 온 앞 포트 읽기 값이 새로 고른 포트를 덮지 않는다(COM5 를 700ms 늦게 → 곧바로 COM3)
      await d.executeScript("window.__pdMock.piDelay = { COM5: 700 };");
      await pick("COM5");
      await sleep(30);
      await pick("COM3");
      await sleep(1100);
      await d.executeScript("window.__pdMock.piDelay = {};");
      await expectJs("stale report", "return /CH340/.test((document.querySelector('details.card-device') || {}).textContent || '') && !/FTDI/.test((document.querySelector('details.card-device') || {}).textContent || '')");
      await pick("COM5");
      await expectJs("back to COM5", "return /FTDI/.test((document.querySelector('details.card-device') || {}).textContent || '')", 3000);
      await js("document.querySelectorAll('details.card').forEach((x) => (x.open = true))");

      // ---- 복사·저장 — «볼 수 없는 것» 이 늘 들어가고 금지 낱말이 없다
      await js("window.__smoke.clip = null");
      await clickText(".toolbar .btn", ko ? "텍스트 복사" : "Copy text");
      await expectJs("copy text", `const c = window.__smoke.clip || ''; return /${ko ? "PC 가 볼 수 없는 것" : "What the PC cannot see"}/.test(c) && /LatencyTimer = 16/.test(c) && !${BAN}.test(c)`);
      await clickText(".toolbar .btn", ko ? "JSON 복사" : "Copy JSON");
      await expectJs("copy json", "try { const j = JSON.parse(window.__smoke.clip || ''); return j.report.entry.port === 'COM5' && Array.isArray(j.loop); } catch { return false; }");
      await d.executeScript(`window.__pdMock.dialog = { ask: false, save: 'C:\\\\mock\\\\pi.json', open: null };`);
      await clickText(".toolbar .btn", ko ? "저장…" : "Save…");
      await expectJs("save json", "const f = window.__pdMock.files.get('C:\\\\mock\\\\pi.json'); try { return !!f && JSON.parse(f).report.entry.port === 'COM5'; } catch { return false; }");
      await d.executeScript(`window.__pdMock.dialog = { ask: false, save: null, open: null };`);

      // ---- COM9: 문제 코드 10 → «문제 있음», 시험하면 «사용 중» + Process Explorer 안내
      await pick("COM9");
      await expectJs("com9 problem", `return /lv-problem/.test((document.querySelector('details.card-device > summary .lv') || {}).className || '') && /10 — /.test(document.querySelector('details.card-device').textContent) && /Prolific/.test(document.querySelector('details.card-device .card-notes')?.textContent || '')`);
      await js("document.querySelectorAll('details.card').forEach((x) => (x.open = true))");
      await startLoop("loop COM9");
      await expectJs("loop busy", "const e = document.querySelector('.loop-error'); return !!e && /Find Handle/.test(e.textContent) && /Ser2pl/.test(e.textContent)", 3000);
      if (combo.full) await shot(app, `${combo.name}-com9-busy`);
      // COM1: 아무것도 돌아오지 않음 → «문제 있음»
      await pick("COM1");
      await expectJs("com1 cards", "return /COM1/.test(document.querySelector('.toolbar .sel-title').textContent) && /ACPI/.test((document.querySelector('details.card-device') || {}).textContent || '')");
      await js("document.querySelectorAll('details.card').forEach((x) => (x.open = true))");
      await js("[...document.querySelectorAll('.loop-bauds input')].slice(1).forEach((x) => x.checked && x.click())");
      await startLoop("loop COM1");
      await expectJs("loop nothing back", "const r = document.querySelectorAll('.loop-table tbody tr'); return r.length === 1 && /lv-problem/.test(r[0].querySelector('.lv').className)", 3000);
      // 숨은 장치 보기 → COM12(지금 없음) — 시험은 막히고 이유가 보인다
      await js("const c = document.querySelector('aside.side label.inline input[type=checkbox]'); c && c.click()");
      await expectJs("hidden list", "return [...document.querySelectorAll('.port-item.absent')].some((b) => /COM12/.test(b.textContent))");
      await pick("COM12");
      await expectJs("hidden device", `return /lv-look/.test((document.querySelector('details.card-device > summary .lv') || {}).className || '') && document.querySelector('.loop-actions .btn.primary').disabled && /${ko ? "시험할 수 없습니다" : "cannot be tested"}/.test(document.querySelector('.loop-actions').textContent)`);
      // 화면 어디에도 금지 낱말이 없다
      await expectJs("wording", `return !${BAN}.test(document.body.innerText)`);
      // F4 다시 읽기
      await blur();
      await keys(Key.F4);
      await sleep(300);
      await verify("F4 refresh");

      // ---- 다 눌러 보기(포트를 고른 상태)
      if (combo.full) {
        await load(port, combo, { selected: "FTDIBUS\\VID_0403+PID_6001+PD000001A\\0000", firstHintDone: true });
        await sleep(600);
        await d.executeScript(`window.__pdMock.dialog = { ask: true, save: 'C:\\\\mock\\\\pi.txt', open: null };`);
        await pageExercise("selected", "#root");
        await load(port, combo);
      }
      // ---- 좁은 창: 왼쪽 칸이 접히고 요약 줄 + «다시 읽기»
      await d.manage().window().setRect({ width: 760, height: 600 });
      const [iw, ih] = await d.executeScript("return [innerWidth, innerHeight]");
      if (iw !== 760 || ih !== 600) await d.manage().window().setRect({ width: 760 + (760 - iw), height: 600 + (600 - ih) });
      await load(port, combo, { selected: "FTDIBUS\\VID_0403+PID_6001+PD000001A\\0000" });
      await sleep(500);
      await expectJs("narrow", "return getComputedStyle(document.querySelector('.narrow-bar')).display !== 'none' && getComputedStyle(document.querySelector('aside.side')).display === 'none' && /COM5/.test(document.querySelector('.narrow-bar').textContent)");
      await js("document.querySelector('.narrow-bar .side-toggle').click()");
      await sleep(250);
      await expectJs("narrow side", "const s = document.querySelector('aside.side'); const r = s.getBoundingClientRect(); return getComputedStyle(s).display !== 'none' && r.width > 200 && r.right <= innerWidth");
      // 목록에서 고르면 왼쪽 칸이 닫힌다
      await pick("COM3");
      await expectJs("narrow pick closes side", "return getComputedStyle(document.querySelector('aside.side')).display === 'none' && /COM3/.test(document.querySelector('.narrow-bar').textContent)");
      await shot(app, `${combo.name}-narrow-760`);
      // (0.5.0) 좁은 창에서 무선 탭 — 요약 줄이 무선으로 바뀌고 표·버튼이 잘리지 않는다
      await clickText(".tabs .seg", ko ? "무선 (Wi-Fi·블루투스)" : "Wireless (Wi-Fi, Bluetooth)");
      await expectJs("narrow wireless", `return !!document.querySelector('details.card-bt') && /${ko ? "무선" : "Wireless"}/.test(document.querySelector('.narrow-bar').textContent)`, 4000);
      await js("document.querySelectorAll('details.card').forEach((x) => (x.open = true))");
      await sleep(200);
      await verify("narrow wireless");
      await shot(app, `${combo.name}-narrow-760-wireless`);
      await fitWindow();
    }

    /** (10/30) Hardware Tester — 실행 버튼이 왼쪽 칸에 없는 기록 앱이라 따로 돈다: 첫 실행 카드·대화상자 → 끊김 기록(가짜 90박자 = 게이트웨이 손실 «볼 것»·
     *  Wi-Fi 끊김 사건·요약 복사·CSV) → 신호(ok·위치 권한 없음) → 블루투스 기록(이름은 화면에만) → 블루투스 소리(핸즈프리 «볼 것»·시험 소리) → 다음 판 자리
     *  → 금지 낱말 → 다 눌러 보기 → 좁은 창. 가짜 값은 mock.js «Hardware Tester» 부분 */
    async function hwFlow() {
      const BAN = /진단|검증|최적|정상|diagnos|verif|optimi/i;
      const nav = (cls) => js(`const b = document.querySelector('.hw-nav .nav-${cls}'); if (b) b.click(); return !!b;`);
      await load(port, combo);
      await fitWindow();
      await load(port, combo);
      await verify("load");
      await expectJs("title", "return /PortDock Hardware Tester$/.test(document.title) && document.querySelectorAll('.hw-nav .nav-item').length === 10");
      // 첫 실행 카드 + 도움말 링크(«처음 쓰는 순서» 절)
      const card = await js(`const c = document.querySelector('.first-card'); return c && { links: c.querySelectorAll('.first-links .link-btn').length, hide: !!c.querySelector('.first-hide') }`);
      if (!card || !card.links || !card.hide) await conv("first-card", `첫 실행 카드가 이상함: ${JSON.stringify(card)}`);
      else {
        await js("[...document.querySelectorAll('.first-card .first-links .link-btn')].pop().click()");
        await sleep(250);
        const h = await js("const a = document.querySelector('.modal.help .help-link.on'); return a && a.textContent");
        if (!h || !/처음 쓰는 순서|Getting started/.test(h)) await conv("first-help", `카드의 도움말 링크로 연 절이 «${h}»`);
        await keys(Key.ESCAPE);
        await verify("first-card help");
      }
      for (const [label, open, close] of [
        ["help", "?", "esc"],
        ["settings", "⚙", "x"],
        ["report", "!", "esc"],
      ]) {
        const ok = await js(`const b = [...document.querySelectorAll('.brand-tools button')].find((x) => x.textContent.trim() === ${JSON.stringify(open)}); if (b) { b.focus(); b.click(); } return !!b;`);
        if (!ok) {
          add(label, "dialog", `«${open}» 버튼이 없음`);
          continue;
        }
        await sleep(250);
        if (!(await js("return !!document.querySelector('.modal-back')"))) add(label, "dialog", `«${open}» 로 창이 열리지 않음`);
        if (combo.full) await pageExercise(label, ".modal-back", { scope: "modal", depth: 1, skip: ".modal-head button" });
        if (close === "x") await js("const x = document.querySelector('.modal-back .modal-head button'); x && x.click()");
        else await keys(Key.ESCAPE);
        await sleep(200);
        if (await js("return !!document.querySelector('.modal-back')")) add(label, "dialog", `${label} 창이 닫히지 않음`);
        await verify(`${label} close`, { expectFocus: true });
      }

      // ---- 끊김·지연 기록: 바깥으로 나가는 대상 안내 → 시작 → 90박자 + Wi-Fi 끊김 → 요약 «볼 것»(공유기 쪽)
      await expectJs("out note", `const n = document.querySelector('.out-note'); return !!n && /1\\.1\\.1\\.1/.test(n.textContent) && /example\\.com/.test(n.textContent)`);
      await clickText(".toolbar .rec-btn");
      await expectJs("rec ticks", `return window.__pdMock.hw().rec?.i >= 90 && /${ko ? "끊김 기록 중" : "recording drops"}/.test(document.title) && !!document.querySelector('.hw-nav .nav-net .tag.rec')`, 4000);
      await expectJs("rec summary", `const s = document.querySelector('section.summary'); return !!s && /lv-look/.test(s.querySelector('.lv')?.className ?? '') && /${ko ? "공유기 쪽" : "router side"}/.test(s.textContent) && s.querySelectorAll('table.stats tbody tr').length === 3`);
      await expectJs("rec gateway", "return /192\\.168\\.0\\.1/.test(document.querySelector('.out-note').textContent) && /192\\.168\\.0\\.1/.test(document.querySelector('.chart-head').textContent)");
      await expectJs("rec wifi events", `return document.querySelectorAll('table.ev-list tr.ev-wifiDown').length === 1 && document.querySelectorAll('table.ev-list tr.ev-wifiUp').length === 1 && /${ko ? "드라이버에 의해" : "by the driver"}/.test(document.querySelector('section.events').textContent)`);
      // 기록 중에는 대상·간격을 바꾸지 못한다
      await expectJs("rec locked", "return document.querySelector('.target-sel').disabled && document.querySelector('.dns-in').disabled");
      for (const s of ["1", "5", "30", ko ? "전체" : "All"]) await clickText(".chart-head .seg", s);
      await verify("span buttons");
      if (combo.full) await shot(app, `${combo.name}-net-record`);
      await js("window.__smoke.clip = null");
      await clickText(".toolbar .btn", ko ? "요약 복사" : "Copy summary");
      await expectJs("copy summary", `const c = window.__smoke.clip || ''; return /192\\.168\\.0\\.1/.test(c) && /1\\.1\\.1\\.1/.test(c) && /${ko ? "공유기 쪽" : "router side"}/.test(c) && !${BAN}.test(c)`);
      await d.executeScript(`window.__pdMock.dialog = { ask: false, save: 'C:\\\\mock\\\\net.csv', open: null };`);
      await clickText(".toolbar .btn", ko ? "CSV 저장…" : "Save CSV…");
      await expectJs("save csv", "const f = window.__pdMock.files.get('C:\\\\mock\\\\net.csv'); return !!f && /^# PortDock Hardware Tester/.test(f) && /time,gateway_ms,internet_ms,dns_ms,event/.test(f) && /lost/.test(f) && /wifi_disconnected/.test(f)");
      await d.executeScript(`window.__pdMock.dialog = { ask: false, save: null, open: null };`);
      await clickText(".toolbar .rec-btn");
      await expectJs("rec stopped", `return window.__pdMock.hw().rec?.done === true && !/${ko ? "기록 중" : "recording"}/.test(document.title) && !document.querySelector('.target-sel').disabled`);
      // 잘못된 대상 → 시작 단추가 막힌다
      await setIn(".target-sel", "custom");
      await typeInto(".target-in", "999.1.1.1", false);
      await expectJs("bad target", "return document.querySelector('.toolbar .rec-btn').disabled && !!document.querySelector('.cards .hint.warn')");
      // 공유기 너머: 인터넷 쪽만 손실
      await typeInto(".target-in", "10.255.255.1", false);
      await clickText(".toolbar .rec-btn");
      await expectJs("beyond", `const s = document.querySelector('section.summary'); return !!s && /${ko ? "공유기 너머" : "beyond the router"}/.test(s.textContent)`, 4000);
      await clickText(".toolbar .rec-btn");
      await setIn(".target-sel", "1.1.1.1");

      // ---- Wi-Fi 신호: 누르기 전에는 읽지 않음 → ok → 위치 권한 없음 안내
      await nav("signal");
      await sleep(300);
      if ((await calls("wifi_signal")) !== 0) add("signal idle", "expect", "«신호 보기» 를 누르기 전에 wifi_signal 을 불렀음");
      await clickText(".toolbar .sig-btn");
      await expectJs("signal ok", `const c = document.querySelector('.sig-state'); return !!c && /802\\.11ac/.test(c.textContent) && /dBm/.test(c.textContent) && document.querySelectorAll('.ch-table tbody tr').length === 5 && !!document.querySelector('.ch-table tr.mine')`, 4000);
      if (combo.full) await shot(app, `${combo.name}-signal`);
      await d.executeScript("window.__pdMock.hwSignal = 'denied'");
      await expectJs("signal denied", `const c = document.querySelector('.sig-state'); return !!c && c.classList.contains('st-denied') && c.querySelectorAll('ol li').length === 3`, 4000);
      await d.executeScript("window.__pdMock.hwSignal = 'noWlan'");
      await expectJs("signal noWlan", "return !!document.querySelector('.sig-state.st-noWlan')", 4000);
      await d.executeScript("window.__pdMock.hwSignal = undefined");
      await clickText(".toolbar .sig-btn");
      // 다른 탭에선 읽지 않는다
      const n0 = await calls("wifi_signal");
      await nav("bt");
      await sleep(2500);
      if ((await calls("wifi_signal")) !== n0) add("signal off", "expect", "«멈춤»·다른 탭에서도 wifi_signal 을 계속 부름");

      // ---- 블루투스 연결 기록: 이름은 화면에만, 복사는 «장치 N»
      await clickText(".toolbar .rec-btn");
      await expectJs("bt rows", "return document.querySelectorAll('table.bt-table tbody tr').length === 3 && /Example Buds/.test(document.querySelector('table.bt-table').textContent)", 3000);
      await expectJs("bt change", "return document.querySelectorAll('section.bt-log table.ev-list tr').length >= 2", 4000);
      if (combo.full) await shot(app, `${combo.name}-bt`);
      await js("window.__smoke.clip = null");
      await clickText(".toolbar .btn", ko ? "기록 복사" : "Copy log");
      await expectJs("bt copy masked", `const c = window.__smoke.clip || ''; return /${ko ? "장치 1" : "Device 1"}/.test(c) && !/Example/.test(c) && !${BAN}.test(c)`);
      await clickText(".toolbar .rec-btn");
      await expectJs("bt stopped", "return window.__pdMock.hw().bt?.done === true");

      // ---- 블루투스 소리: 기본 출력이 핸즈프리 → «볼 것», 시험 소리 버튼
      await nav("audio");
      await expectJs("audio hf", `const c = document.querySelector('section.audio-mode'); return !!c && /lv-look/.test(c.querySelector('.audio-now .lv')?.className ?? '') && c.querySelectorAll('table.audio-table tbody tr').length === 3`, 3000);
      for (const b of [ko ? "왼쪽" : "Left", ko ? "오른쪽" : "Right", ko ? "양쪽" : "Both"]) await clickText(".tone-btns .btn", b);
      await sleep(300);
      await verify("tones");
      if (combo.full) await shot(app, `${combo.name}-audio`);
      // ---- 다음 판 자리
      for (const x of ["keyboard", "mouse", "monitor", "speaker", "mic", "webcam"]) {
        await nav(x);
        await expectJs(`later ${x}`, `const a = document.querySelector('.empty-guide.later a.later-web'); return !!a && /portdock\\.dev\\/${ko ? "" : "en\\/"}tools\\/[a-z]+-test\\//.test(a.href)`, 1500);
      }
      // 화면 어디에도 금지 낱말이 없다(각 탭)
      for (const x of ["net", "signal", "bt", "audio"]) {
        await nav(x);
        await sleep(150);
        await expectJs(`wording ${x}`, `return !${BAN}.test(document.body.innerText)`);
      }

      // ---- 다 눌러 보기(탭마다)
      if (combo.full) {
        await d.executeScript(`window.__pdMock.dialog = { ask: true, save: 'C:\\\\mock\\\\hw.txt', open: null };`);
        for (const x of ["net", "signal", "bt", "audio"]) {
          await load(port, combo, { tab: x, firstHintDone: true });
          await sleep(500);
          await pageExercise(`exercise-${x}`, "#root");
          // 다 눌러 보기가 켠 기록·신호를 멈춘다
          await mock("(window.__pdMock.hw().rec && !window.__pdMock.hw().rec.done) && document.querySelector('.toolbar .rec-btn.danger') && document.querySelector('.toolbar .rec-btn.danger').click()");
        }
        await d.executeScript(`window.__pdMock.dialog = { ask: false, save: null, open: null };`);
        await load(port, combo);
      }
      // ---- 좁은 창: 왼쪽 칸이 접히고 요약 줄
      await d.manage().window().setRect({ width: 760, height: 600 });
      const [iw, ih] = await d.executeScript("return [innerWidth, innerHeight]");
      if (iw !== 760 || ih !== 600) await d.manage().window().setRect({ width: 760 + (760 - iw), height: 600 + (600 - ih) });
      await load(port, combo, { firstHintDone: true });
      await sleep(400);
      await clickText(".toolbar .rec-btn");
      await sleep(400);
      await expectJs("narrow", `return getComputedStyle(document.querySelector('.narrow-bar')).display !== 'none' && getComputedStyle(document.querySelector('aside.side')).display === 'none' && /${ko ? "기록 중" : "recording"}/.test(document.querySelector('.narrow-bar').textContent)`);
      await js("document.querySelector('.narrow-bar .side-toggle').click()");
      await sleep(250);
      await expectJs("narrow side", "const s = document.querySelector('aside.side'); const r = s.getBoundingClientRect(); return getComputedStyle(s).display !== 'none' && r.width > 200 && r.right <= innerWidth");
      await nav("bt");
      await expectJs("narrow pick closes side", "return getComputedStyle(document.querySelector('aside.side')).display === 'none'");
      await nav("net");
      await sleep(200);
      await verify("narrow net");
      await shot(app, `${combo.name}-narrow-760`);
      await clickText(".toolbar .rec-btn");
      await fitWindow();
    }

    /** (10/25) Serial «연결 점검…» — 끊긴 상태: 장치 요약·루프백 5개 → Esc 로 닫히고 포커스 제자리. 연결 중: 시험이 막히고 이유 */
    async function serialPortCheck(connectedNow) {
      await closeRight();
      // 연결 중에는 연결 설정이 한 줄 요약으로 접힌다(«모두 펼치기» 끔) — [바꾸기] 로 펼친 뒤
      const folded = await js("const c = document.querySelector('aside.side .conn-change'); if (c && !document.querySelector('.port-check-btn')) { c.click(); return true; } return false;");
      if (folded) await sleep(250);
      const ok = await js("const b = document.querySelector('.port-check-btn'); if (b) { b.focus(); b.click(); } return !!b");
      if (!ok) return add("port check", "expect", "«연결 점검…» 단추가 없음: " + (await js("return [...document.querySelectorAll('aside.side > *')].map((e) => e.className).join('|') + ' / modal=' + !!document.querySelector('.modal-back')")));
      await expectJs("port check open", `const m = document.querySelector('.modal.portcheck-dialog'); return !!m && /COM\\d+/.test(m.querySelector('.modal-head').textContent) && m.querySelectorAll('.pc-section .lv').length >= 3`);
      if (connectedNow) {
        await expectJs("port check locked", `const m = document.querySelector('.portcheck-dialog'); return m.querySelector('.loop-actions .btn.primary').disabled && /${ko ? "연결을 끊은 뒤" : "Disconnect first"}/.test(m.textContent)`);
      } else {
        await clickText(".portcheck-dialog .loop-actions .btn.primary");
        await expectJs("port check ask", "return !!document.querySelector('.portcheck-dialog .loop-sure')");
        await clickText(".portcheck-dialog .loop-sure .btn.primary");
        await expectJs("port check loop", "return document.querySelectorAll('.portcheck-dialog .loop-table tbody tr').length === 5", 6000);
        if (combo.full) await shot(app, `${combo.name}-port-check`);
        if (combo.full) await pageExercise("port check", ".modal-back", { scope: "modal", depth: 1, skip: ".modal-head button" });
      }
      await keys(Key.ESCAPE);
      await expectJs("port check closed", "return !document.querySelector('.portcheck-dialog')");
      await verify("port check Esc", { expectFocus: true });
      if (folded) await js("const c = document.querySelector('aside.side .conn-change'); c && c.click()");
    }

    // ---- (0.3.0) 편의 기능 — 최근 연결·직접 입력 포트·로그 키보드·상세 복사·다른 프로그램으로 열기·글자 크기·명령줄·새 버전 알림·오류로 꺼진 기록 창
    /** 다른 PortDock 프로그램으로 열기: 찾으면 __pdMock.openedApp 에 대상, 못 찾으면(noApp) 넘길 값 복사 + 알림 «내려받기 페이지» 버튼.
     *  pre: 누르기 전에 페이지에서 돌릴 JS(버튼을 보이게 등), btnSel: 버튼, want(opened): 연 대상이 맞는지 */
    async function openAppCheck(step, btnSel, want, pre = "") {
      const r = await jsAsync(`
        const w = (ms = 400) => new Promise((r) => setTimeout(r, ms));
        ${pre}
        const b = document.querySelector(${JSON.stringify(btnSel)});
        if (!b || b.disabled) return { btn: false, disabled: !!b };
        const press = async () => { b.click(); await w(); const m = document.querySelector('.log-menu'); if (m) { m.querySelector('button:not(:disabled)').click(); await w(); } };
        window.__pdMock.noApp = false; window.__pdMock.openedApp = null;
        await press();
        const a = { btn: true, opened: window.__pdMock.openedApp, toast1: (document.querySelector('.toast') || {}).textContent || '' };
        window.__pdMock.noApp = true; window.__pdMock.openedApp = null; window.__smoke.clip = null;
        await press();
        const act = document.querySelector('.toast .toast-action');
        a.action = act ? act.textContent.trim() : null; a.clip = window.__smoke.clip; a.opened2 = window.__pdMock.openedApp;
        window.__pdMock.noApp = false;
        return a;`);
      if (r.fatal) return add(step, "smoke-error", r.fatal);
      const okWant = r.btn && r.opened && want(r.opened);
      if (!okWant || !r.toast1 || !/^(내려받기 페이지|Download page)$/.test(r.action ?? "") || !r.clip || r.opened2) await conv(step, `다른 프로그램으로 열기가 이상함: ${JSON.stringify(r)}`);
      await verify(step);
    }

    /** 최근 연결(TCP·Master·SCPI) — 연결에 성공한 뒤 끊긴 상태에서: 주소 칸을 비우고 «▾» → 그 주소가 목록에 → 고르면 칸이 채워짐 → 다시 열어 ✕ 로 지움 → Esc */
    async function recentCheck() {
      if (app === "modbus-master") {
        // Master 는 Modbus TCP 로 한 번 연결해 둔다(기본은 RTU) — 끝나면 RTU 로 돌린다(뒤 단계가 COM 을 쓴다)
        await setIn("aside.side select", "tcp", await js("return [...document.querySelectorAll('aside.side select')].findIndex((s) => s.querySelector('option[value=rtu-tcp]'))"));
        await sleep(200);
        await clickRun("recent: connect tcp", (s) => /연결됨|Connected/.test(s.status ?? ""));
        await clickRun("recent: stop tcp", (s) => !STOP_RE.test(s.btn ?? ""));
      }
      const r = await jsAsync(`
        const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
        const btn = [...document.querySelectorAll('aside.side .recent-btn')].find((b) => __sm.vis(b));
        if (!btn) return { btn: false };
        const inp = btn.parentElement.querySelector('input');
        const host = inp.value;
        const mine = (b) => (b.title || b.textContent).startsWith(host + ':');
        __sm.setVal(inp, ''); await w(150);
        btn.click(); await w();
        const list = [...document.querySelectorAll('.recent-pop .recent-pick')];
        const a = { btn: true, host, list: list.map((b) => b.title), empty: btn.classList.contains('empty') };
        const pick = list.find(mine);
        if (pick) pick.click();
        await w();
        a.picked = inp.value; a.closed = !document.querySelector('.recent-pop');
        btn.click(); await w();
        const del = [...document.querySelectorAll('.recent-pop .recent-row')].find((row) => mine(row.querySelector('.recent-pick')));
        if (del) del.querySelector('.recent-del').click();
        await w();
        a.after = [...document.querySelectorAll('.recent-pop .recent-pick')].map((b) => b.title);
        __sm.key(document.activeElement || document.body, 'Escape'); await w(150);
        a.escClosed = !document.querySelector('.recent-pop');
        if (!a.escClosed) btn.click();
        return a;`);
      if (r.fatal) add("recent", "smoke-error", r.fatal);
      else if (!r.btn || !r.host || r.empty || !r.list.some((v) => v.startsWith(r.host + ":")) || r.picked !== r.host || !r.closed || r.after.some((v) => v.startsWith(r.host + ":")) || !r.escClosed)
        await conv("recent", `최근 연결 «▾» 가 이상함: ${JSON.stringify(r)}`);
      await verify("recent");
      if (app === "modbus-master") {
        await setIn("aside.side select", "serial", await js("return [...document.querySelectorAll('aside.side select')].findIndex((s) => s.querySelector('option[value=rtu-tcp]'))"));
        await sleep(200);
      }
    }

    /** 포트 고르기 «직접 입력…»(Serial·Master) — COM0 은 확인이 막히고 오류 문구, com20 → COM20 «(직접 입력)» */
    async function manualPortCheck() {
      const r = await jsAsync(`
        const w = (ms = 200) => new Promise((r) => setTimeout(r, ms));
        const tr = [...document.querySelectorAll('aside.side select')].find((s) => s.querySelector('option[value=rtu-tcp]'));
        if (tr && tr.value !== 'serial') { __sm.setVal(tr, 'serial'); await w(); }
        const isManual = (o) => o.value.charCodeAt(0) === 1;
        const sel = () => [...document.querySelectorAll('aside.side select')].find((s) => [...s.options].some(isManual));
        const s = sel();
        if (!s) return { sel: false };
        const last = s.options[s.options.length - 1];
        const a = { sel: true, lastIsManual: isManual(last), lastText: last.textContent };
        __sm.setVal(s, last.value); await w();
        const box = document.querySelector('.port-manual input');
        const ok = () => document.querySelector('.port-manual .row2 button:not(.ghost)');
        if (!box || !ok()) return { ...a, box: false };
        a.focus = document.activeElement === box;
        __sm.setVal(box, 'COM0'); await w(150);
        a.bad = { disabled: ok().disabled, err: (document.querySelector('.port-manual .error') || {}).textContent || null, red: box.classList.contains('bad') };
        __sm.setVal(box, 'com20'); await w(150);
        a.good = { disabled: ok().disabled, err: !!document.querySelector('.port-manual .error') };
        ok().click(); await w();
        const s2 = sel();
        a.value = s2.value; a.label = s2.selectedOptions[0] ? s2.selectedOptions[0].textContent : null; a.closed = !document.querySelector('.port-manual');
        return a;`);
      if (r.fatal) add("manual port", "smoke-error", r.fatal);
      else if (!r.sel || !r.lastIsManual || !/직접 입력…|Type a port…/.test(r.lastText) || r.box === false || !r.bad?.disabled || !r.bad?.err || !r.bad?.red || r.good?.disabled || r.good?.err || r.value !== "COM20" || !/\((직접 입력|typed)\)/.test(r.label ?? "") || !r.closed)
        await conv("manual-port", `포트 «직접 입력…» 이 이상함: ${JSON.stringify(r)}`);
      if (combo.name === "ko-light") await shot(app, `${combo.name}-manual-port`);
      await verify("manual port");
    }

    /** 로그 칸 키보드(Serial·TCP) + 상세 «복사»(Serial) — 연결 중에 */
    async function logKeysCheck() {
      await closeRight();
      const rows = await d.findElements(By.css(".log .row.rx, .log .row.tx"));
      if (rows.length < 6) return conv("log-keys", `줄이 모자라 로그 키보드를 시험하지 못함(${rows.length}줄)`, false);
      await rows[Math.floor(rows.length / 2)].click();
      await sleep(200);
      if (app === "serial") {
        // 좁은 창이라 오른쪽 칸(상세)이 열려 있다 — «복사» → 상세 글이 클립보드로
        const c = await jsAsync(`
          const w = (ms = 200) => new Promise((r) => setTimeout(r, ms));
          window.__smoke.clip = null;
          const b = [...document.querySelectorAll('.copy-detail')].find((x) => __sm.vis(x));
          if (!b) return { btn: false };
          const label = b.textContent;
          b.click(); await w();
          return { btn: true, label, after: b.textContent, clip: window.__smoke.clip };`);
        if (c.fatal) add("copy detail", "smoke-error", c.fatal);
        else if (!c.btn || !c.clip || c.clip.length < 8 || !/([0-9A-F]{2} ){2}/.test(c.clip) || c.after === c.label) await conv("copy-detail", `상세 «복사» 가 이상함: ${JSON.stringify(c)}`);
        await verify("copy detail");
      }
      await closeRight();
      await js("document.querySelector('.log').focus()");
      const now = () =>
        js(`const rows = [...document.querySelectorAll('.log .row')]; const i = rows.findIndex((r) => r.classList.contains('primary'));
            return { i, t: i >= 0 ? rows[i].textContent : null, next: i >= 0 && rows[i + 1] ? rows[i + 1].textContent : null, first: rows[0] && rows[0].textContent, top: document.querySelector('.log').scrollTop, focus: document.activeElement === document.querySelector('.log'), follow: !!document.querySelector('.follow-btn') };`);
      const s0 = await now();
      await keys(Key.ARROW_DOWN);
      const s1 = await now();
      await keys(Key.ARROW_UP);
      const s2 = await now();
      await keys(Key.HOME);
      await sleep(200);
      const s3 = await now();
      await keys(Key.END);
      await sleep(300);
      const s4 = await now();
      if (!s0.focus || s0.i < 0 || s1.t !== s0.next || s2.t !== s0.t || s3.t !== s3.first || s3.top > 4 || s4.i < 0 || s4.follow)
        await conv("log-keys", `로그 칸 ↓·↑·Home·End 가 이상함: ${JSON.stringify({ s0, s1, s2, s3, s4 }).slice(0, 600)}`);
      await blur();
      await verify("log keys");
    }

    /** 글자 크기 Ctrl+= 두 번 → +2, Ctrl+0 → 13 (설정 fontSize) */
    async function zoomCheck() {
      const fs = () => js("try { const s = JSON.parse(localStorage.getItem('settings') || '{}'); return s.fontSize ?? null; } catch { return null; }");
      await blur();
      const f0 = (await fs()) ?? 13;
      await chord([Key.CONTROL], "=");
      await chord([Key.CONTROL], "=");
      const f1 = await fs();
      await chord([Key.CONTROL], "0");
      const f2 = await fs();
      if (f1 !== f0 + 2 || f2 !== 13) await conv("zoom-keys", `Ctrl+= 두 번·Ctrl+0 결과가 이상함: ${f0} → ${f1} → ${f2}`);
      await verify("zoom keys");
    }

    /** 명령줄 인자(한 경우만): Serial «--port COM3 --baud 19200», TCP «--connect 10.0.0.5:5000» */
    async function launchArgsCheck() {
      const args = app === "serial" ? ["--port", "COM3", "--baud", "19200"] : ["--connect", "10.0.0.5:5000"];
      await d.get(`http://localhost:${port}/?args=${encodeURIComponent(JSON.stringify(args))}`);
      await sleep(1200);
      const r = await js(`
        const inputs = [...document.querySelectorAll('aside.side input')].map((i) => i.value);
        const portSel = [...document.querySelectorAll('aside.side select')].find((s) => s.querySelector('option[value=COM9]'));
        const tab = document.querySelector('.mode-tabs .seg.on');
        const run = document.querySelector(${JSON.stringify(RUN_BTN)});
        return { baud: (document.querySelector('input[list=bauds]') || {}).value || null, port: portSel ? portSel.value : null, inputs, tab: tab ? [...tab.parentElement.children].indexOf(tab) : null, toast: (document.querySelector('.toast') || {}).textContent || null, run: run && run.textContent.trim() };`);
      const ok = app === "serial" ? r.baud === "19200" && r.port === "COM3" : r.tab === 0 && r.inputs.includes("10.0.0.5") && r.inputs.includes("5000");
      if (!ok || !r.toast || STOP_RE.test(r.run ?? "")) await conv("launch-args", `명령줄 인자 ${JSON.stringify(args)} 로 채운 값이 이상함: ${JSON.stringify(r)}`);
      await verify("launch args");
    }

    /** 새 버전 알림(한 앱): 확인 켬 + 오늘 확인한 결과 9.9.9 → 알림줄(언어 섞임·넘침 없음, 좁은 창도) → «이 버전은 그만 알리기» 로 사라짐. 바깥 요청 없음 */
    async function updateNoteCheck() {
      await d.get(`http://localhost:${port}/`);
      await d.executeScript(
        `localStorage.clear(); localStorage.setItem('settings', JSON.stringify(arguments[0])); localStorage.setItem('lang', JSON.stringify(arguments[0].lang));
         localStorage.setItem('updateLatest', JSON.stringify({ version: '9.9.9', url: 'https://github.com/portdock/PortDock/releases/tag/v9.9.9' })); localStorage.setItem('updateCheckedAt', JSON.stringify(Date.now()));`,
        { lang: combo.lang, theme: combo.theme, expandAll: !!combo.full, updateCheck: true },
      );
      await d.navigate().refresh();
      const look = `const n = document.querySelector('.update-note'); if (!n || !__sm.vis(n)) return null; const r = n.getBoundingClientRect();
        const cut = [...n.querySelectorAll('button')].filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent);
        return { text: n.innerText, left: Math.round(r.left), right: Math.round(r.right), w: innerWidth, bottom: Math.round(r.bottom), h: innerHeight, over: n.scrollWidth > n.clientWidth + 1, cut, net: window.__pdMock.net.map((x) => x.url) };`;
      const okNote = (r) => r && r.left >= 0 && r.right <= r.w + 1 && r.bottom <= r.h + 1 && !r.over && !r.cut.length && !r.net.some((u) => /github/.test(u)) && (ko ? !/[A-Za-z]{2,}/.test(r.text.replace(/✕/g, "")) : !/[가-힣]/.test(r.text)) && /9\.9\.9/.test(r.text);
      let r = null;
      for (let i = 0; i < 40 && !r; i++, await sleep(200)) r = await js(look);
      if (!okNote(r)) await conv("update-note", `새 버전 알림줄이 이상함(안 보임·넘침·언어 섞임·바깥 요청): ${JSON.stringify(r)}`);
      if (combo.name === "ko-light" || combo.name === "en-dark") await shot(app, `${combo.name}-update-note`);
      await d.manage().window().setRect({ width: 760, height: 600 });
      const [iw, ih] = await d.executeScript("return [innerWidth, innerHeight]");
      if (iw !== 760 || ih !== 600) await d.manage().window().setRect({ width: 760 + (760 - iw), height: 600 + (600 - ih) });
      await sleep(300);
      const r2 = await js(look);
      if (!okNote(r2)) await conv("update-note-narrow", `좁은 창(760)에서 새 버전 알림줄이 이상함: ${JSON.stringify(r2)}`);
      if (combo.name === "ko-light") await shot(app, `${combo.name}-update-note-narrow`);
      await clickText(".update-note button", ko ? "이 버전은 그만 알리기" : "Don't remind me about this version");
      await sleep(250);
      const gone = await js("return !document.querySelector('.update-note') && localStorage.getItem('updateDismissed') === JSON.stringify('9.9.9')");
      if (!gone) await conv("update-note-dismiss", "«이 버전은 그만 알리기» 로 알림줄이 사라지지 않음");
      await verify("update note");
      await fitWindow();
    }

    /** 오류로 꺼진 기록이 남아 있을 때 켜면 묻는 창 — 좁은 창(760, 왼쪽 칸 접힘)에서도 보이는지 → «나중에» */
    async function pendingCrashCheck() {
      await d.manage().window().setRect({ width: 760, height: 600 });
      const [iw, ih] = await d.executeScript("return [innerWidth, innerHeight]");
      if (iw !== 760 || ih !== 600) await d.manage().window().setRect({ width: 760 + (760 - iw), height: 600 + (600 - ih) });
      await load(port, combo);
      await d.get(`http://localhost:${port}/?pendingCrash=1`);
      let r = null;
      for (let i = 0; i < 20 && !(r && r.modal); i++, await sleep(150))
        r = await js(`const m = document.querySelector('.modal-back [role=alertdialog]'); if (!m) return { modal: false }; const b = m.getBoundingClientRect();
          return { modal: __sm.vis(m), inWin: b.left >= 0 && b.top >= 0 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1, title: m.getAttribute('aria-label'), side: getComputedStyle(document.querySelector('aside.side') || document.body).display };`);
      if (!r?.modal || !r.inWin || !/지난번에 오류로 꺼졌습니다|crashed last time/.test(r.title ?? "")) await conv("pending-crash", `오류로 꺼진 기록 묻는 창이 좁은 창에서 안 보임: ${JSON.stringify(r)}`);
      if (combo.name === "ko-light" || combo.name === "en-dark") await shot(app, `${combo.name}-pending-crash-760`);
      await clickText(".modal-back [role=alertdialog] button", ko ? "나중에" : "Later");
      await sleep(200);
      if (await js("return !!document.querySelector('.modal-back')")) await conv("pending-crash-later", "«나중에» 로 묻는 창이 닫히지 않음");
      await verify("pending crash");
      await fitWindow();
    }

    try {
      if (app === "port-inspector") await inspectorFlow();
      else if (app === "hw-tester") await hwFlow();
      else {
      await load(port, combo);
      await fitWindow();
      await load(port, combo);
      const s0 = await verify("load");
      // (10/18) 설정 «모두 펼치기(전문가 화면)»: full 조합은 접기(details·트리거·자동응답)가 모두 펼쳐지고, 나머지 조합은 모두 접힌 기본.
      // 화면만 훑는 조합 하나(ko-dark)는 설정 창에서 켜고 끄며 바로 펼쳐지고 접히는지 본다
      {
        const folds = `return [...[...document.querySelectorAll('#root details')].map((x) => x.open), ...[...document.querySelectorAll('#root .trg-toggle')].map((x) => x.getAttribute('aria-expanded') === 'true')]`;
        const f = await js(folds);
        if (!f.length || f.some((x) => x !== !!combo.full)) await conv("expand-all", `접기 열림 상태가 «모두 펼치기 ${combo.full ? "켬" : "끔"}» 과 다름: ${JSON.stringify(f)}`);
        if (combo.name === "ko-dark") {
          const flip = async () => {
            await js("[...document.querySelectorAll('.brand-tools button')].find((b) => b.textContent.trim() === '⚙').click()");
            await sleep(250);
            await js("document.querySelector('.modal .expand-all input').click()");
            await sleep(150);
            await js("document.querySelector('.modal-back .modal-head button').click()");
            await sleep(250);
            return js(folds);
          };
          const on = await flip();
          const off = await flip();
          if (on.some((x) => !x) || off.some((x) => x)) await conv("expand-all-toggle", `설정 «모두 펼치기» 를 켜고 꺼도 접기가 따라 바뀌지 않음: ${JSON.stringify({ on, off })}`);
          await verify("expand-all toggle");
        }
      }
      // (10/18) Serial 첫 실행: 보내기 ASCII + 줄 끝 CR LF·placeholder «AT», 왼쪽 «고급 연결»·«받기 설정» 은 접힘(full 조합은 미리 펼쳐 둠)
      if (app === "serial") {
        const f = await js(`const sr = document.querySelector('.sendbar .sendrow'); const sels = [...sr.querySelectorAll('select')];
          return { mode: sels.find((x) => x.querySelector('option[value=ascii]')).value, suffix: sels[sels.length - 1].value, ph: document.querySelector('.sendtext').placeholder,
            adv: [...document.querySelectorAll('aside.side details.adv')].map((x) => x.open), notes: [...document.querySelectorAll('aside.side details.adv .sum-note')].map((x) => x.textContent) };`);
        if (f.mode !== "ascii" || f.suffix !== "\\r\\n" || f.ph !== "AT") await conv("first-run", `첫 실행 보내기 기본값이 ASCII·CR LF·«AT» 가 아님: ${JSON.stringify(f)}`, false);
        const want = combo.full ? [true, true] : [false, false];
        if (JSON.stringify(f.adv) !== JSON.stringify(want) || (!combo.full && f.notes.length !== 2)) await conv("serial-fold", `왼쪽 접기 상태·요약이 이상함(기대 ${JSON.stringify(want)}): ${JSON.stringify(f)}`);
        // (10/18) 도구줄 한 줄(최소 창): 간격 열은 «보기 설정 ▾» 안, «파일로 계속 저장» 은 도구줄(왼쪽 칸에는 없음)
        const tb = await js(`const tb = document.querySelector('.main .toolbar');
          const mids = [...tb.children].filter((e) => __sm.vis(e) && !e.classList.contains('grow')).map((e) => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; });
          return { spread: Math.round(Math.max(...mids) - Math.min(...mids)), file: !!tb.querySelector('.file-log'), side: !!document.querySelector('aside.side .file-log'), delta: !!tb.querySelector('.delta-sel'), view: !!tb.querySelector('.view-opt-btn') };`);
        if (tb.spread > 12 || !tb.file || tb.side || tb.delta || !tb.view) await conv("serial-toolbar", `도구줄이 한 줄이 아니거나 칸 자리가 이상함: ${JSON.stringify(tb)}`);
      }
      // (10/18) TCP·UDP·Simulator·Master 첫 실행: 왼쪽(Simulator 는 «장비가 먼저 보내기») 접기 상태·요약, TCP·UDP 로그 보기 «둘 다», UDP 보내기 ASCII
      if (app === "tcp" || app === "udp" || app === "simulator" || app === "modbus-master") {
        const f = await js(`const ds = [...document.querySelectorAll(${JSON.stringify(app === "simulator" ? "details.unsol" : "aside.side details.adv.panel")})];
          const seg = document.querySelector('.main .toolbar .seg.on');
          const sr = document.querySelector('.sendbar .sendrow'); const m = sr && [...sr.querySelectorAll('select')].find((x) => x.querySelector('option[value=ascii]'));
          return { open: ds.map((x) => x.open), notes: ds.map((x) => (x.querySelector('.sum-note') || {}).textContent || ''), view: seg ? seg.textContent.trim() : null, mode: m ? m.value : null };`);
        const n = app === "simulator" ? 1 : 2;
        const want = Array(n).fill(!!combo.full);
        if (JSON.stringify(f.open) !== JSON.stringify(want) || (!combo.full && f.notes.some((x) => !x))) await conv(`${app}-fold`, `접기 상태·요약이 이상함(기대 ${JSON.stringify(want)}): ${JSON.stringify(f)}`);
        if ((app === "tcp" || app === "udp") && !/^(둘 다|Both)$/.test(f.view ?? "")) await conv("first-view", `첫 실행 로그 보기가 «둘 다» 가 아님: ${JSON.stringify(f.view)}`, false);
        if (app === "udp" && f.mode !== "ascii") await conv("first-run", `UDP 첫 실행 보내기가 ASCII 가 아님: ${JSON.stringify(f.mode)}`, false);
      }
      // (10/18) TCP 방식 탭: [클라이언트|서버|중계] — 서버로 가면 0.0.0.0, 다시 클라이언트로 오면 장비 주소가 그대로(방식마다 따로 기억)
      if (app === "tcp") {
        const r = await jsAsync(`
          const w = (ms = 200) => new Promise((r) => setTimeout(r, ms));
          const tabs = () => [...document.querySelectorAll('.mode-tabs .seg')];
          const host = () => document.querySelector('aside.side label input:not([type])').value;
          const a = { n: tabs().length, on: tabs().findIndex((b) => b.classList.contains('on')), h0: host() };
          tabs()[1].click(); await w();
          a.server = host(); a.on1 = tabs().findIndex((b) => b.classList.contains('on'));
          tabs()[0].click(); await w();
          a.back = host();
          return a;`);
        if (r.fatal) add("tcp mode tabs", "smoke-error", r.fatal);
        else if (r.n !== 3 || r.on !== 0 || r.server !== "0.0.0.0" || r.on1 !== 1 || r.back !== r.h0) await conv("tcp-mode-tabs", `방식 탭·방식별 주소 기억이 이상함: ${JSON.stringify(r)}`);
        await verify("tcp mode tabs");
        await load(port, combo);
      }
      // (10/18) Net Scan 포트 칩: 기본은 12개 모두 켜짐 → MC/SLMP 끄면 칸 글에서 5000-5010 이 빠지고 «(바꿈)»·«기본 목록으로» → 다시 켜면 기본 글 그대로.
      // «직접 입력…» 으로 8080 을 넣으면 칩 밖 포트 안내
      if (app === "netscan" && combo.full) {
        const r = await jsAsync(`
          const w = (ms = 200) => new Promise((r) => setTimeout(r, ms));
          const chips = () => [...document.querySelectorAll('.port-chips .port-chip')];
          const text = () => { const i = document.querySelector('aside details.adv input.mono'); return i ? i.value : null; };
          const a = { n: chips().length, on: chips().filter((c) => c.classList.contains('on')).length };
          if (!document.querySelector('aside details.adv input.mono')) { document.querySelector('.ports-custom-btn').click(); await w(); }
          a.t0 = text();
          chips().find((c) => c.textContent.includes('MC/SLMP')).click(); await w();
          a.t1 = text(); a.def = !!document.querySelector('aside details.adv .btn.ghost');
          chips().find((c) => c.textContent.includes('MC/SLMP')).click(); await w();
          a.t2 = text();
          __sm.setVal(document.querySelector('aside details.adv input.mono'), a.t2 + ', 8080'); await w();
          a.extraOn = chips().filter((c) => c.classList.contains('on')).length;
          __sm.setVal(document.querySelector('aside details.adv input.mono'), a.t0); await w();
          return a;`);
        if (r.fatal) add("ns port chips", "smoke-error", r.fatal);
        else if (r.n !== 12 || r.on !== 12 || !r.t0 || /5000-5010/.test(r.t1 ?? "5000-5010") || !r.def || r.t2 !== r.t0 || r.extraOn !== 12) await conv("ns-port-chips", `포트 칩이 이상함: ${JSON.stringify(r)}`);
        if (combo.name === "ko-light") await shot(app, `${combo.name}-port-chips`);
        await verify("ns port chips");
        await load(port, combo);
      }
      // (10/18) 첫 실행 카드·용도 프리셋·예시 넣기 — 끝나면 다시 첫 실행 상태로
      await firstRun();
      if (combo.full) await shot(app, `${combo.name}-loaded`);
      const idleBtn = s0.btn;

      // ---- 대화상자: ? 버튼 → Esc, F1 → Esc, ⚙ → ✕, ! → Esc. 닫은 뒤 포커스가 원래 자리로 돌아오는지
      const btns = await d.findElements(By.css(".brand-tools button"));
      const byText = async (t) => {
        for (const b of btns) if ((await b.getText()).trim() === t) return b;
        return null;
      };
      const qBtn = await byText("?");
      if (qBtn) {
        await qBtn.click();
        await sleep(200);
        if (!(await js("return !!document.querySelector('.modal.help')"))) add("help ?", "dialog", "? 버튼으로 도움말이 열리지 않음");
        await d.actions().sendKeys("modbus").perform();
        await d.actions().sendKeys(Key.ESCAPE).perform();
        await sleep(200);
        if (await js("return !!document.querySelector('.modal.help')")) add("help Esc", "dialog", "Esc 로 도움말이 닫히지 않음");
        await verify("help ? → Esc", { expectFocus: true });
      }
      await d.executeScript("document.activeElement && document.activeElement.blur()");
      await d.actions().sendKeys(Key.F1).perform();
      await sleep(200);
      if (!(await js("return !!document.querySelector('.modal.help')"))) add("F1", "dialog", "F1 로 도움말이 열리지 않음");
      await d.actions().sendKeys(Key.ESCAPE).perform();
      await sleep(150);
      await verify("help F1 → Esc");

      const gear = await byText("⚙");
      if (gear) {
        await gear.click();
        await sleep(250);
        await verify("settings open");
        if (combo.full) await pageExercise("settings", ".modal-back", { scope: "modal", depth: 1, skip: ".modal-head button" });
        const x = await d.findElements(By.css(".modal-back .modal-head button"));
        if (x.length) await x[0].click();
        else await d.actions().sendKeys(Key.ESCAPE).perform();
        await sleep(200);
        if (await js("return !!document.querySelector('.modal-back')")) add("settings ✕", "dialog", "✕ 로 설정이 닫히지 않음");
        await verify("settings ✕", { expectFocus: true });
      }
      const bang = await byText("!");
      if (bang) {
        await bang.click();
        await sleep(250);
        await verify("report open");
        if (combo.full) await pageExercise("report", ".modal-back", { scope: "modal", depth: 1, skip: ".modal-head button" });
        // (10/19) 오류 자동 전송(Sentry DSN 있음) — «지금 바로 보내기» 를 눌렀으면 그 요청은 가짜 백엔드가 가로챘어야 한다(실제로 나가지 않음)
        if (combo.full && (await js("return !!window.__pdMock && window.__pdMock.net.length === 0 && !!document.querySelector('.modal-back') && /지금 바로 보내기|Send now/.test(document.querySelector('.modal-back').textContent)")))
          add("report send intercepted", "expect", "«지금 바로 보내기» 를 눌렀는데 가로챈 전송 요청이 없음");
        await d.actions().sendKeys(Key.ESCAPE).perform();
        await sleep(200);
        if (await js("return !!document.querySelector('.modal-back')")) add("report Esc", "dialog", "Esc 로 문제 보고가 닫히지 않음");
        await verify("report Esc", { expectFocus: true });
      }

      // ---- 멈춘 상태에서 다 눌러 보기
      if (combo.full) {
        await pageExercise("idle", "#root");
        // 눌러 본 뒤 설정이 바뀌었을 수 있다 — 깨끗하게 다시
        await load(port, combo);
      }
      // (0.3.0) 끊긴 상태: 포트 «직접 입력…»(Serial·Master), Serial «Modbus Master 로 열기»·글자 크기 키
      if (combo.full && (app === "serial" || app === "modbus-master")) {
        await manualPortCheck();
        if (app === "serial") {
          await openAppCheck("open-master", ".open-master", (o) => o.app === "modbus-master" && /^COM\d+$/.test(o.rtu ?? "") && o.baud > 0, "__sm.setVal(document.querySelector('.preset-sel'), 'modbus'); await w(300);");
          await zoomCheck();
        }
        await load(port, combo);
      }

      // (10/25) Serial «연결 점검…»(끊긴 상태 — 장치 요약·루프백)
      if (app === "serial") await serialPortCheck(false);

      // ---- 연결·시작
      const want = { serial: /연결됨|Connected/, "modbus-slave": /연결됨|Connected/, tcp: /접속됨|Connected|듣는|Listening/, udp: /듣는|Listening|받는/, simulator: /연결됨|Connected|듣는|Listening/, netscan: /찾는 중|Scanning/, "modbus-master": /연결됨|Connected/, scpi: /연결됨|Connected/, plot: /받는 중|Receiving/, "plc-simulator": /듣는|Listening/ }[app];
      const runS = await clickRun("connect", (s) => s.btn !== idleBtn && want.test(s.status ?? ""));
      if (combo.full) await shot(app, `${combo.name}-running`);
      await sleep(1800); // 상대가 붙고 프레임이 몇 줄 오도록

      // (10/18) Serial: 연결되면 연결 설정이 «COM… 9600 8N1 [바꾸기]» 한 줄로 접힌다(«모두 펼치기» 면 펼친 채). [바꾸기] 로 펼치고 [접기] 로 다시
      if (app === "serial") {
        const c = await jsAsync(`
          const w = (ms = 200) => new Promise((r) => setTimeout(r, ms));
          const now = () => ({ sum: !!document.querySelector('aside.side .conn-sum'), text: (document.querySelector('aside.side .conn-sum .mono') || {}).textContent || '', preset: !!document.querySelector('aside.side .preset-sel'), baud: !!document.querySelector('aside.side input[list=bauds]') });
          const a = now();
          const b = document.querySelector('aside.side .conn-change');
          if (b) b.click();
          await w();
          const opened = now();
          if (b) b.click();
          await w();
          return { a, opened, closed: now() };`);
        if (c.fatal) add("conn summary", "smoke-error", c.fatal);
        else if (!c.a.sum || !/\d+ \d[NOEMS]\d/.test(c.a.text) || c.a.preset !== !!combo.full || c.opened.preset === c.a.preset || c.opened.baud !== c.opened.preset || c.closed.preset !== c.a.preset)
          await conv("conn-summary", `연결 중 연결 설정 한 줄 요약·[바꾸기] 가 이상함: ${JSON.stringify(c)}`);
        await verify("serial conn summary");
      }
      // (10/25) Serial «연결 점검…» 연결 중 — 시험이 막히고 이유
      if (app === "serial") await serialPortCheck(true);
      if (app === "modbus-master" && (await js("return !!document.querySelector('.first-card')"))) await conv("mm-first-hide", "연결했는데 첫 실행 카드가 남아 있음");
      // (10/19) SCPI·Plot 앱별 단계(옛 smoke-scpi·smoke-plot)
      if (app === "scpi") await scpiRun();
      if (app === "plot") await plotRun();
      // (10/18) TCP: 502 로 접속했는데 프레임 구분이 Modbus TCP 가 아니면 «Modbus TCP 로 보기» 알림줄 한 번(첫 실행 상태라 이번이 처음)
      if (app === "tcp" && !(await js("return !!document.querySelector('.sendbar .mb502')"))) await conv("tcp-502", "502 로 접속했는데 «Modbus TCP 로 보기» 알림줄이 없음");
      // (0.3.0) 그 알림줄의 «Modbus Master 로 열기» → 주소:502
      else if (app === "tcp" && combo.full) await openAppCheck("tcp-502-open-master", ".sendbar .mb502 .open-master", (o) => o.app === "modbus-master" && /:502$/.test(o.tcp ?? ""));
      // (10/18) Net Scan 결과 줄: Modbus 칩을 누르면 «IP:502» 복사, 줄 오른쪽 버튼 메뉴(웹 열기·IP 복사·IP:502 복사·…) → «IP:502 복사» · Esc 로 닫힘
      if (app === "netscan" && combo.full) {
        // 가짜 장비는 주소당 0.5초 — 두 주소(.10 Modbus·.11)만 찾아 빨리 끝낸 뒤 보고, 끝나면 처음 범위로 다시 찾기 시작해 둔다
        await clickRun("ns stop for row menu", (s) => s.btn === idleBtn);
        // (0.2.0) 대상 대역 알림: 어느 랜카드 대역도 아님(게이트웨이 경유 — 약함, 지금 랜카드 목록) · Wi-Fi 대역(그 랜카드 이름) · 고른 랜카드 대역(알림 없음)
        const sn = await jsAsync(`
          const w = (ms = 450) => new Promise((r) => setTimeout(r, ms));
          const box = () => document.querySelector('aside .subnet-note');
          const inp = document.querySelector('aside.side input.mono');
          __sm.setVal(inp, '192.168.7.0/24'); await w();
          const a = { routed: box()?.textContent ?? null, weak: !!box() && !box().classList.contains('warn') };
          __sm.setVal(inp, '10.0.0.1-20'); await w();
          a.other = box()?.textContent ?? null;
          __sm.setVal(inp, '192.168.0.1-30'); await w();
          a.none = !box();
          return a;`);
        if (sn.fatal) add("ns subnet note", "smoke-error", sn.fatal);
        else if (!/192\.168\.0\.1/.test(sn.routed ?? "") || !/10\.0\.0\.23\/24/.test(sn.routed ?? "") || !sn.weak || !/Wi-Fi/.test(sn.other ?? "") || !sn.none) await conv("ns-subnet-note", `대상 대역 알림이 이상함: ${JSON.stringify(sn)}`);
        await verify("ns subnet note");
        await js("__sm.setVal(document.querySelector('aside.side input.mono'), '192.168.0.10-192.168.0.11')");
        await sleep(400);
        await clickRun("ns scan two hosts", (s) => s.btn !== idleBtn);
        const r = await jsAsync(`
          const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
          let chip = null;
          for (let i = 0; i < 60 && !(chip = document.querySelector('.hosts .mb-copy')); i++) await w();
          if (!chip) return { chip: false };
          const ip = chip.closest('tr').querySelector('.ip-cell').firstChild.textContent;
          window.__smoke.clip = null;
          chip.click(); await w();
          const a = { chip: true, ip, clip1: window.__smoke.clip, sel: chip.closest('tr').classList.contains('sel'), conflict: !!chip.closest('tr').querySelector('.mark.conflict') && !!document.querySelector('.toolbar .chip.conflict') };
          window.__smoke.clip = null;
          chip.closest('tr').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 400, clientY: 300 })); await w();
          const items = [...document.querySelectorAll('.log-menu button')];
          a.items = items.map((b) => b.textContent.trim() + (b.disabled ? '(x)' : ''));
          const it = items.find((b) => b.textContent.includes(':502'));
          if (it) it.click();
          await w();
          a.clip2 = window.__smoke.clip; a.closed = !document.querySelector('.log-menu');
          // (0.2.0) «Modbus Master 로 열기» — 메뉴에서 → Master 를 IP:502·국번으로 연다. Master 가 없으면 «IP:502» 복사 + 내려받기 안내
          chip.closest('tr').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 400, clientY: 300 })); await w();
          const om = [...document.querySelectorAll('.log-menu button')].find((b) => /Modbus Master/.test(b.textContent));
          a.omItem = !!om && !om.disabled;
          if (om) om.click();
          await w(400);
          a.master = window.__pdMock.master || null;
          a.omToast = (document.querySelector('.toast') || {}).textContent || null;
          window.__pdMock.noMaster = true; window.__smoke.clip = null;
          const ob = document.querySelector('.detail-actions .open-master');
          a.omBtn = !!ob;
          if (ob) ob.click();
          await w(400);
          const miss = document.querySelector('.master-missing');
          a.missing = miss ? miss.textContent : null; a.missLink = !!miss && !!miss.querySelector('a[href*="portdock.dev"]'); a.clip3 = window.__smoke.clip;
          window.__pdMock.noMaster = false;
          // 502 가 닫힌 장비는 «IP:502 복사» 가 흐림
          const other = [...document.querySelectorAll('.hosts tbody tr')].find((tr) => !tr.querySelector('.mb-copy') && !tr.classList.contains('gone'));
          if (other) {
            other.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 400, clientY: 300 })); await w();
            a.otherDisabled = [...document.querySelectorAll('.log-menu button')].some((b) => b.textContent.includes(':502') && b.disabled);
            __sm.key(window, 'Escape'); await w();
            a.closed2 = !document.querySelector('.log-menu');
          }
          return a;`);
        if (r.fatal) add("ns row menu", "smoke-error", r.fatal);
        else if (!r.chip || r.clip1 !== `${r.ip}:502` || !r.sel || !r.conflict || (r.items || []).length < 7 || r.clip2 !== `${r.ip}:502` || !r.closed || r.otherDisabled === false || r.closed2 === false || !r.omItem || r.master?.ip !== r.ip || r.master?.port !== 502 || !(r.master?.unit >= 1) || !/Modbus Master/.test(r.omToast ?? "") || !r.omBtn || !r.missLink || !(r.missing ?? "").includes(`${r.ip}:502`) || r.clip3 !== `${r.ip}:502`) await conv("ns-row-menu", `결과 줄 Modbus 칩·오른쪽 버튼 메뉴가 이상함: ${JSON.stringify(r)}`);
        if (combo.name === "ko-light") await shot(app, `${combo.name}-row-menu`);
        await verify("ns row menu");
        // (0.3.0) 고른 장비 «TCP 로 열기»(502·웹 말고 열린 포트)
        await openAppCheck("ns-open-tcp", ".detail-actions .open-tcp", (o) => o.app === "tcp" && /^192\.168\.0\.1[01]:\d+$/.test(o.connect ?? ""));
        await load(port, combo);
        await clickRun("ns scan again", (s) => s.btn !== idleBtn);
      }
      // TCP 클라이언트의 실행 중 버튼은 «끊기»
      if (app === "tcp" && !/^(끊기|Disconnect)$/.test(runS?.btn ?? "")) await conv("tcp-stop-label", `클라이언트 실행 중 버튼이 «끊기» 가 아님: ${JSON.stringify(runS?.btn)}`, false);
      // Simulator «장비가 먼저 보내기» 는 접혀 있을 수 있다(화면만 훑는 조합) — 펼친 뒤 보낸다
      if (app === "simulator") await js("const x = document.querySelector('details.unsol'); if (x && !x.open) x.open = true;");
      // 보내기: 입력칸에 쓰고 Enter → 포커스 그대로 · 보내기 버튼 → 입력칸으로 돌아오는지
      const sendSel = app === "simulator" ? ".unsol input.mono" : ".sendtext";
      const inputs = await d.findElements(By.css(sendSel));
      if (inputs.length && VALID_TEXT[app]) {
        const inp = inputs[0];
        await inp.click();
        await d.executeScript("arguments[0].select()", inp);
        await inp.sendKeys(VALID_TEXT[app]);
        await sleep(200);
        const before = await js("return window.__pdMock.calls.filter((c) => c === 'send').length");
        if (app !== "simulator") {
          await inp.sendKeys(Key.ENTER);
          await sleep(300);
          const after = await js("return window.__pdMock.calls.filter((c) => c === 'send').length");
          if (after === before) add("send Enter", "send", "입력칸에서 Enter 로 보내지지 않음", await shot(app, `${combo.name}-send-enter`));
          await verify("send Enter");
        }
        const sendBtn = await d.findElements(By.css(app === "simulator" ? ".unsol .btn.primary" : ".sendbar .sendrow .btn.primary"));
        if (sendBtn.length) {
          if (!(await sendBtn[0].isEnabled())) add("send button", "send", "연결 중인데 보내기 버튼이 꺼져 있음", await shot(app, `${combo.name}-send-disabled`));
          else {
            await sendBtn[0].click();
            await sleep(300);
            const s = await verify("send button");
            if (!/input/.test(s.active)) add("send button", "ux-focus", `보내기 버튼을 누른 뒤 포커스가 입력칸으로 돌아오지 않음 (${s.active})`);
          }
        }
      }

      // (10/18) UDP: HEX 칸에 «hello» → 오류 옆 [ASCII 로 보내기] → ASCII 로 바뀌고 한 번 보냄
      if (app === "udp" && combo.full) {
        const r = await jsAsync(`
          const w = (ms = 250) => new Promise((r) => setTimeout(r, ms));
          const sr = document.querySelector('.sendbar .sendrow'); const mode = [...sr.querySelectorAll('select')].find((x) => x.querySelector('option[value=ascii]'));
          __sm.setVal(mode, 'hex'); await w();
          __sm.setVal(document.querySelector('.sendtext'), 'hello'); await w(450);
          const b = document.querySelector('.sendbar .as-ascii');
          const label = b ? b.textContent.trim() : '';
          const before = window.__pdMock.calls.filter((c) => c === 'send').length;
          if (b) b.click();
          await w(450);
          const r = { btn: !!b, label, mode: mode.value, sent: window.__pdMock.calls.filter((c) => c === 'send').length - before, text: document.querySelector('.sendtext').value, gone: !document.querySelector('.sendbar .as-ascii') };
          __sm.setVal(mode, 'hex'); await w();
          __sm.setVal(document.querySelector('.sendtext'), ${JSON.stringify(VALID_TEXT.udp)}); await w();
          return r;`);
        if (r.fatal) add("udp as-ascii", "smoke-error", r.fatal);
        else if (!r.btn || !/ASCII/.test(r.label) || r.mode !== "ascii" || r.sent !== 1 || r.text !== "hello" || !r.gone) await conv("udp-as-ascii", `HEX 오류 옆 [ASCII 로 보내기] 가 이상함: ${JSON.stringify(r)}`);
        await verify("udp as-ascii");
      }

      // 편의성(10/17): 창 제목·따라가기·줄 고르기·Ctrl+C·우클릭 메뉴·단축키·명령 목록·숫자 칸·표기 바꾸기·되돌리기·항상 위
      // Net Scan 은 통신 기록·명령 목록이 없어 편의성 점검(로그 따라가기 등)을 건너뛴다
      // SCPI·Plot 도 건너뛴다 — 앱별 단계(scpiRun·plotRun)가 그 앱의 편의 기능을 본다
      // (0.3.0) 로그 칸 키보드(Serial·TCP)·상세 «복사»(Serial)
      if (combo.full && (app === "serial" || app === "tcp")) await logKeysCheck();
      if (combo.full && !["netscan", "scpi", "plot"].includes(app)) await convenience();
      // Serial·TCP·UDP 공통 기능(이력·단축키·간격·트리거·체크섬 옵션·반복 횟수·Break·터미널·파일)
      if (combo.full) await ioFeatures();
      // 기능 묶음 C(10/18): 자동응답(Serial·TCP·UDP)·템플릿·장애 흉내(Simulator)
      if (combo.full) await waveC();

      // 연결 중 다 눌러 보기(실행 버튼은 빼고)
      if (combo.full) await pageExercise("running", "#root", { skip: RUN_BTN });

      // 장치 뽑힘 → 재연결
      if ((app === "serial" || app === "modbus-slave" || app === "modbus-master") && (await mock("window.__pdMock.unplug()"))) {
        await sleep(300);
        const s = await verify("unplug");
        if (!/기다리|Waiting|재연결|reconnect/i.test(s.status ?? "")) add("unplug", "state", `장치를 뽑았는데 상태가 «${s.status}»`, await shot(app, `${combo.name}-unplug`));
        await sleep(1800);
        const s2 = await verify("replug");
        if (!/연결됨|Connected/.test(s2.status ?? "")) add("replug", "state", `다시 꽂았는데 상태가 «${s2.status}»`, await shot(app, `${combo.name}-replug`));
      }

      // 멈춤·끊기
      const stopS = await clickRun("stop", (s) => s.btn === idleBtn);
      if (app === "scpi") await expectJs("scpi disconnected", "return /끊음|Disconnected/.test(document.querySelector('aside .status').textContent)");
      if (app === "plot") {
        await expectJs("plot stopped", `return /${ko ? "멈춤" : "Stopped"}/.test(document.querySelector('aside .status').textContent)`);
        await clickText(".plotbar button", ko ? "지우기" : "Clear");
        await expectJs("plot cleared", "return document.querySelector('.counts span').textContent.trim().startsWith('0') || /^(값 0줄|0 rows)/.test(document.querySelector('.counts span').textContent.trim())");
      }
      void runS;
      void stopS;
      // (0.3.0) 최근 연결 «▾»(연결에 성공한 주소가 남는다)
      if (combo.full && ["tcp", "modbus-master", "scpi"].includes(app)) await recentCheck();
      // 기능 묶음 C: TCP 중계·Modbus TCP·이 PC 주소, UDP 멀티캐스트, 좁은 창 자동응답
      if (combo.full) await waveCStopped();

      // ---- 오류 경우: 바쁜 포트·안 붙는 주소
      if (app === "serial" || app === "modbus-slave" || app === "modbus-master") {
        await d.executeScript(`const s = [...document.querySelectorAll('aside.side select')].find((x) => x.querySelector('option[value=COM9]')); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, 'COM9'); s.dispatchEvent(new Event('change', { bubbles: true }));`);
        await sleep(100);
        const s = await clickRun("connect COM9 (busy)", (x) => /실패|failed/i.test(x.status ?? ""));
        if (s && !/사용 중|busy/i.test(s.status ?? "")) add("connect COM9", "state", `사용 중 오류가 안 보임: ${s.status}`);
      }
      if (app === "tcp") {
        await load(port, combo, { cfg: { mode: "client", host: "10.0.0.99", port: 502, noDelay: true, autoReconnect: true, reconnectMs: 500, echo: false } });
        await clickRun("connect unreachable", (s) => /기다리|대기|reconnect|Waiting|Retrying/i.test(s.status ?? ""));
        await clickRun("stop while reconnecting", (s) => s.btn === idleBtn);
        await load(port, combo, { cfg: { mode: "server", host: "0.0.0.0", port: 445, noDelay: true, autoReconnect: true, reconnectMs: 2000, echo: false } });
        const s = await clickRun("listen busy port", (x) => !STOP_RE.test(x.btn ?? ""));
        const err = await js("return (document.querySelector('.error') || {}).textContent || ''");
        if (!/사용 중|in use/.test(err)) add("listen busy port", "state", `포트 사용 중 오류가 안 보임 (상태 «${s?.status}»)`, await shot(app, `${combo.name}-busy`));
      }
      if (app === "udp") {
        await load(port, combo, { cfg: { bindHost: "0.0.0.0", bindPort: 445, remoteHost: "192.168.0.10", remotePort: 5000, broadcast: false, multicastGroup: "", multicastIf: "0.0.0.0", echo: false } });
        await clickRun("bind busy port", (x) => x.btn === idleBtn);
        const err = await js("return (document.querySelector('.error') || {}).textContent || ''");
        if (!/사용 중|in use/.test(err)) add("bind busy port", "state", "포트 사용 중 오류가 안 보임", await shot(app, `${combo.name}-busy`));
      }
      // (10/19) SCPI: 안 붙는 주소(10.0.0.99) → «연결 실패» 안내. Plot: 사용 중 포트(COM9) → «시작 실패» + 다른 프로그램 안내
      if (app === "scpi") {
        await load(port, combo, { net: { host: "10.0.0.99", port: 5025 } });
        await clickText(RUN_BTN);
        await expectJs("scpi connect timeout", "return /연결 실패|Connection failed/.test((document.querySelector('aside .status') || {}).textContent || '')", 3000);
      }
      if (app === "plot") {
        await load(port, combo, { cfg: { port: "COM9" } });
        await clickText(RUN_BTN);
        await expectJs("plot start busy", "const t = (document.querySelector('aside .status') || {}).textContent || ''; return /시작 실패|Start failed/.test(t) && /다른 프로그램|Another program/.test(t)");
      }
      if (app === "simulator") {
        await load(port, combo, { transport: "tcp-server", net: { host: "0.0.0.0", port: 445, remoteHost: "192.168.0.10", remotePort: 5000 } });
        await clickRun("listen busy port", (x) => x.btn === idleBtn);
        const err = await js("return (document.querySelector('.error') || {}).textContent || ''");
        if (!/사용 중|in use/.test(err)) add("listen busy port", "state", "포트 사용 중 오류가 안 보임", await shot(app, `${combo.name}-busy`));
      }

      // ---- 자동 재연결을 끈 채 끊기면 — 버튼·상태가 «대기» 로 돌아와야
      if (app === "serial") {
        await load(port, combo, { cfg: { port: "COM5", baud: 9600, dataBits: 8, parity: "none", stopBits: 1, flow: "none", dtr: false, rts: false, autoReconnect: false } });
        await clickRun("connect (no auto-reconnect)", (x) => STOP_RE.test(x.btn ?? ""));
        await mock("window.__pdMock.unplug()");
        await waitSettled("unplug (no auto-reconnect)", (x) => !STOP_RE.test(x.btn ?? "") && /닫힘|Closed/.test(x.status ?? ""));
        await verify("unplug (no auto-reconnect)");
      }
      if (app === "tcp") {
        await load(port, combo, { cfg: { mode: "client", host: "10.0.0.99", port: 502, noDelay: true, autoReconnect: false, reconnectMs: 2000, echo: false } });
        const s = await clickRun("connect unreachable (no auto-reconnect)", (x) => !STOP_RE.test(x.btn ?? "") && /멈춤|Stopped/.test(x.status ?? ""));
        if (s && !/시간 초과|timed out/i.test(s.status ?? "")) add("connect unreachable (no auto-reconnect)", "state", `멈춘 이유가 안 보임: ${s.status}`);
      }

      // ---- 저장해 둔 포트가 지금 목록에 없을 때(다른 PC·USB 뺌) — 빈 칸·눌리지 않는 버튼이 되지 않아야
      if (app === "serial" || app === "modbus-slave" || app === "simulator" || app === "modbus-master") {
        const saved = app === "simulator" ? { transport: "serial", com: { port: "COM8", baud: 9600, parity: "none" } } : { cfg: { port: "COM8", baud: 9600, dataBits: 8, parity: "none", stopBits: 1, flow: "none", dtr: false, rts: false, autoReconnect: true } };
        await load(port, combo, saved);
        await sleep(400);
        const s = await verify("saved port missing");
        if (s.disabled) add("saved port missing", "state", `저장된 포트(COM8)가 없을 때 실행 버튼이 꺼져 있음 (${s.btn})`, await shot(app, `${combo.name}-stale-port`));
        else {
          // 화면에 보이는 포트로 열려야 한다(보이는 것과 다른 COM8 을 열다 «찾을 수 없음» 이 나면 안 된다)
          await clickRun("saved port missing → run", (x) => STOP_RE.test(x.btn ?? ""));
          const err = await js("return [...document.querySelectorAll('.error, .status')].map((e) => e.textContent).join(' ')");
          if (/COM8/.test(err)) add("saved port missing → run", "state", `화면엔 다른 포트가 보이는데 COM8 을 열려고 함: ${err.slice(0, 200)}`, await shot(app, `${combo.name}-stale-port-run`));
          if (STOP_RE.test((await state()).btn ?? "")) await clickRun("saved port missing → stop", (x) => !STOP_RE.test(x.btn ?? ""));
        }
      }
      // TCP 클라이언트 포트 0 — 버튼이 꺼지면 이유가 보여야
      if (app === "tcp") {
        await load(port, combo, { cfg: { mode: "client", host: "192.168.0.10", port: 0, noDelay: true, autoReconnect: true, reconnectMs: 2000, echo: false } });
        const why = await js("return [...document.querySelectorAll('aside .interlock, aside .hint.warn')].map((e) => e.textContent).join(' ')");
        if (!why.trim()) add("client port 0", "ux-why", "포트 0 이라 접속 버튼이 꺼졌는데 이유가 안 보임", await shot(app, `${combo.name}-port0`));
      }

      // ---- «예» 를 누르는 경우(지우기 확인 등)와 파일 저장 경로가 있는 경우
      if (combo.full) {
        await load(port, combo);
        await d.executeScript(`window.__pdMock.dialog = { ask: true, save: 'C:\\\\mock\\\\out.txt', open: null };`);
        await clickRun("connect (yes)", (s) => s.btn !== idleBtn);
        await sleep(1200);
        await pageExercise("running-yes", "#root", { skip: RUN_BTN + ", select.lang, .brand-tools button" });
        await clickRun("stop (yes)", (s) => s.btn === idleBtn);
      }

      // ---- 좁은 창(화면 반쪽 맞춤 등): 안쪽 760×600
      await narrow();
      // (0.3.0) 한 번씩만: 명령줄 인자(Serial·TCP, ko-light), 새 버전 알림(UDP), 오류로 꺼진 기록 묻는 창(Simulator, 좁은 창)
      if (combo.name === "ko-light" && (app === "serial" || app === "tcp")) await launchArgsCheck();
      if (combo.full && app === "udp") await updateNoteCheck();
      if (combo.full && app === "simulator") await pendingCrashCheck();
      }
    } catch (e) {
      add("runner", "smoke-error", e && e.stack ? e.stack : e);
      try {
        add("runner", "shot", "", await shot(app, `${combo.name}-runner-error`));
      } catch {
        /* 창이 죽었으면 캡처 생략 */
      }
    }
    // 같은 내용은 하나로 묶는다
    const grouped = new Map();
    for (const f of findings) {
      const k = `${f.kind}|${f.detail.replace(/\d{2}:\d{2}:\d{2}\.\d{3}/g, "")}`;
      const g = grouped.get(k);
      if (g) g.count++, g.steps.length < 5 && g.steps.push(f.step);
      else grouped.set(k, { kind: f.kind, detail: f.detail, count: 1, steps: [f.step], shot: f.shot });
    }
    report.combos[combo.name] = [...grouped.values()];
    (report.actions ??= {})[combo.name] = actions;
    console.log(`${app} ${combo.name}: ${grouped.size ? `❌ ${grouped.size}가지` : "✅"}  (누른 횟수 ${JSON.stringify(actions)})`);
    for (const g of grouped.values()) console.log(`   [${g.kind}] ×${g.count} ${g.detail.split("\n")[0].slice(0, 160)}  ← ${g.steps[0]}`);
  }
  report.finishedAt = new Date().toISOString();
  report.total = Object.values(report.combos).reduce((n, l) => n + l.length, 0);
  fs.writeFileSync(path.join(OUT, `${app}.json`), JSON.stringify(report, null, 1));
  return report.total;
}

let total = 0;
try {
  for (const [app, port] of Object.entries(APPS)) {
    if (only && only !== app) continue;
    total += await runApp(app, port);
  }
} finally {
  await d.quit();
}
console.log(total ? `\n문제 ${total}가지 — ${OUT}/*.json` : "\n모두 통과");
process.exitCode = total ? 1 : 0;
