// 화면 점검: 다섯 앱을 크기·언어·테마·글자 크기별로 캡처 + 잘린 글자 찾기(미리보기 서버 5201~5205 가 떠 있어야 함)
import { Builder } from "selenium-webdriver";
import edge from "selenium-webdriver/edge.js";
import fs from "node:fs";
const OUT = process.env.OUT ?? "shots/ui";
fs.mkdirSync(OUT, { recursive: true });
const APPS = { serial: 5201, "modbus-slave": 5202, tcp: 5203, udp: 5204, simulator: 5205 };
const only = process.argv[2];
const opts = new edge.Options().addArguments("--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1");
const d = await new Builder().forBrowser("MicrosoftEdge").setEdgeOptions(opts).setEdgeService(new edge.ServiceBuilder(process.env.EDGEDRIVER)).build();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PROBE = `
const out = [];
const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
for (const e of document.querySelectorAll('body *')) {
  if (!vis(e) || e.closest('.log,.tlog,.rows,svg,datalist,option,.term')) continue;
  const s = getComputedStyle(e); const r = e.getBoundingClientRect();
  const txt = (e.innerText || e.value || '').trim().replace(/\s+/g,' ').slice(0,60);
  const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || ['INPUT','SELECT','BUTTON','TEXTAREA'].includes(e.tagName);
  if (own && (s.overflowX !== 'visible' || s.textOverflow === 'ellipsis' || ['INPUT','SELECT','BUTTON'].includes(e.tagName)) && e.scrollWidth > e.clientWidth + 2)
    out.push('CUT  ' + e.tagName + '.' + (e.className||'') + ' [' + txt + '] ' + e.clientWidth + '<' + e.scrollWidth);
  if (own && (r.right > innerWidth + 1 || r.bottom > innerHeight + 1) && !e.closest('[style*=overflow],.side,.main,.right,aside,main,.modal-body,.help-body,.tables,.table-wrap,.grid-wrap'))
    out.push('OUT  ' + e.tagName + '.' + (e.className||'') + ' [' + txt + '] r=' + Math.round(r.right) + ' b=' + Math.round(r.bottom));
}
out.push('PAGE scroll ' + document.documentElement.scrollWidth + 'x' + document.documentElement.scrollHeight + ' view ' + innerWidth + 'x' + innerHeight);
return [...new Set(out)].slice(0, 60);`;
async function shot(name) { fs.writeFileSync(`${OUT}/${name}.png`, Buffer.from(await d.takeScreenshot(), "base64")); }
async function setup(port, w, h, settings) {
  await d.manage().window().setRect({ width: w, height: h });
  await d.get(`http://localhost:${port}/`);
  await d.executeScript(`localStorage.clear(); localStorage.setItem('settings', JSON.stringify(arguments[0])); localStorage.setItem('lang', JSON.stringify(arguments[0].lang));`, settings);
  await d.navigate().refresh();
  await sleep(1200);
}
async function connect() {
  await d.executeScript(`const b=[...document.querySelectorAll('aside button.btn.primary, .side button.btn.primary')][0]; b && b.click();`);
  await sleep(900);
}
const report = {};
try {
  for (const [app, port] of Object.entries(APPS)) {
    if (only && only !== app) continue;
    const cases = [
      ["ko-min-idle", 1008, 740, { lang: "ko", theme: "light" }, false],
      ["ko-min-conn", 1008, 740, { lang: "ko", theme: "light" }, true],
      ["en-min-conn", 1008, 740, { lang: "en", theme: "light" }, true],
      ["ko-wide-dark", 1464, 1039, { lang: "ko", theme: "dark" }, true],
      ["ko-big-font", 1008, 740, { lang: "ko", theme: "light", fontSize: 17 }, true],
    ];
    for (const [name, w, h, st, conn] of cases) {
      await setup(port, w, h, st);
      if (conn) await connect();
      await shot(`${app}-${name}`);
      report[`${app}-${name}`] = await d.executeScript(PROBE);
    }
    // 설정 창
    await setup(port, 1008, 740, { lang: "ko", theme: "light" });
    await d.executeScript(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='⚙')?.click()`);
    await sleep(500);
    await shot(`${app}-settings`);
    report[`${app}-settings`] = await d.executeScript(PROBE);
  }
} finally {
  await d.quit();
  fs.writeFileSync(`${OUT}/probe.json`, JSON.stringify(report, null, 1));
}
