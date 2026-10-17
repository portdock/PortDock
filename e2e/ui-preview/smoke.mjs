// «다 눌러 보기» 화면 점검 — 미리보기 서버(가짜 백엔드 mock.js)에 띄운 다섯 앱의 버튼·고르기·체크·입력칸을 모두 건드리고
// 예외·화면 오류(Boundary)·창 밖으로 넘친 요소·풀리지 않는 «연결 중»·대화상자 닫은 뒤 포커스 잃음을 찾는다.
// 사용: (저장소 루트에서 서버 5201~5205 를 띄운 뒤) cd e2e && EDGEDRIVER=<msedgedriver.exe> node ui-preview/smoke.mjs [앱]
// 결과: shots/smoke/<앱>.json (+ 문제가 난 단계의 캡처 shots/smoke/<앱>-*.png)
import { Builder, By, Key } from "selenium-webdriver";
import edge from "selenium-webdriver/edge.js";
import fs from "node:fs";
import path from "node:path";

const OUT = process.env.OUT ?? "shots/smoke";
fs.mkdirSync(OUT, { recursive: true });
const APPS = { serial: 5201, "modbus-slave": 5202, tcp: 5203, udp: 5204, simulator: 5205 };
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
    if (e.closest('.log, .tlog, svg, datalist, option, .regs, .help-text, pre, .report-preview')) continue;
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
        // 새로 뜬 창 속도 한 번 눌러 본다
        const label = (m.querySelector('[role=dialog],[role=alertdialog]') || m).getAttribute('aria-label') || 'modal';
        findings.push(...(await exercise(m, { ...opts, scope: 'modal', depth: (opts.depth || 0) + 1, skip: (opts.skip ? opts.skip + ',' : '') + '.modal-head button', budgetMs: 20000 })).map((f) => ({ ...f, step: '[' + label + '] ' + f.step })));
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
await d.manage().setTimeouts({ script: 240000 });
await d.sendDevToolsCommand("Page.addScriptToEvaluateOnNewDocument", { source: HOOK });

const js = (code, ...args) => d.executeScript(LIB + ";" + code, ...args);
const jsAsync = (code, ...args) => d.executeAsyncScript(LIB + `; const __done = arguments[arguments.length - 1]; (async () => { ${code} })().then(__done, (e) => __done({ fatal: String(e && e.stack || e) }));`, ...args);

let shotNo = 0;
async function shot(app, label) {
  const f = `${app}-${String(++shotNo).padStart(2, "0")}-${label.replace(/[^a-z0-9-]+/gi, "_").slice(0, 50)}.png`;
  fs.writeFileSync(path.join(OUT, f), Buffer.from(await d.takeScreenshot(), "base64"));
  return f;
}

async function load(port, combo, extra = {}) {
  await d.get(`http://localhost:${port}/`);
  await d.executeScript(
    `localStorage.clear(); localStorage.setItem('settings', JSON.stringify(arguments[0])); localStorage.setItem('lang', JSON.stringify(arguments[0].lang)); for (const [k, v] of Object.entries(arguments[1])) localStorage.setItem(k, JSON.stringify(v));`,
    { lang: combo.lang, theme: combo.theme },
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
const STOP_RE = /^(끊기|멈춤|Disconnect|Stop)$/;
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
      const r = await jsAsync(`return await __sm.exercise(document.querySelector(${JSON.stringify(scopeSel)}) || document, ${JSON.stringify({ scope: "main", ...opts })});`);
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

    /** 편의성 점검 — 연결된 상태에서 부른다. 끝나면 다시 연결된 상태로 돌려 둔다 */
    async function convenience() {
      const simple = app === "modbus-slave" || app === "simulator";
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

      // ---- 반복 보내기 → Esc 로 멈춤 (입력칸 밖에서)
      if (app !== "modbus-slave") {
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
      const num = (await d.findElements(By.css(app === "simulator" ? ".unsol input.num" : app === "modbus-slave" ? ".main .toolbar input.num" : ".sendrow.sub input.num")))[app === "modbus-slave" ? 1 : 0];
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
      if (app === "serial" || app === "modbus-slave") {
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
      if (app !== "modbus-slave") {
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
        if (nb && (await nb.isDisplayed())) await nb.click();
        await sleep(200);
        const add3 = await jsAsync(`
          const w = () => new Promise((r) => setTimeout(r, 200));
          const inp = document.querySelector('.sendtext');
          const mode = [...document.querySelectorAll('.sendbar .sendrow select')].find((s) => s.querySelector('option[value=ascii]'));
          __sm.setVal(mode, 'hex'); await w();
          const out = [];
          for (const v of ['01 03 00 00 00 0A', '01 06 00 01 00 03', '01 10 00 00']) {
            __sm.setVal(inp, v); await w();
            const btn = [...document.querySelectorAll('.sendrow.sub .btn.small')].pop();
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

    try {
      await load(port, combo);
      await fitWindow();
      await load(port, combo);
      const s0 = await verify("load");
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

      // ---- 연결·시작
      const want = { serial: /연결됨|Connected/, "modbus-slave": /연결됨|Connected/, tcp: /접속됨|Connected|듣는|Listening/, udp: /듣는|Listening|받는/, simulator: /연결됨|Connected|듣는|Listening/ }[app];
      const runS = await clickRun("connect", (s) => s.btn !== idleBtn && want.test(s.status ?? ""));
      if (combo.full) await shot(app, `${combo.name}-running`);
      await sleep(1800); // 상대가 붙고 프레임이 몇 줄 오도록

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

      // 편의성(10/17): 창 제목·따라가기·줄 고르기·Ctrl+C·우클릭 메뉴·단축키·명령 목록·숫자 칸·표기 바꾸기·되돌리기·항상 위
      if (combo.full) await convenience();

      // 연결 중 다 눌러 보기(실행 버튼은 빼고)
      if (combo.full) await pageExercise("running", "#root", { skip: RUN_BTN });

      // 장치 뽑힘 → 재연결
      if ((app === "serial" || app === "modbus-slave") && (await mock("window.__pdMock.unplug()"))) {
        await sleep(300);
        const s = await verify("unplug");
        if (!/기다리|Waiting|재연결|reconnect/i.test(s.status ?? "")) add("unplug", "state", `장치를 뽑았는데 상태가 «${s.status}»`, await shot(app, `${combo.name}-unplug`));
        await sleep(1800);
        const s2 = await verify("replug");
        if (!/연결됨|Connected/.test(s2.status ?? "")) add("replug", "state", `다시 꽂았는데 상태가 «${s2.status}»`, await shot(app, `${combo.name}-replug`));
      }

      // 멈춤·끊기
      const stopS = await clickRun("stop", (s) => s.btn === idleBtn);
      void runS;
      void stopS;

      // ---- 오류 경우: 바쁜 포트·안 붙는 주소
      if (app === "serial" || app === "modbus-slave") {
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
      if (app === "serial" || app === "modbus-slave" || app === "simulator") {
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
