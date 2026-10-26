// 사용 통계 묻는 창·설정 칸 점검 — 한국어·영어 × 밝게·어둡게, 보통 창(984)과 좁은 창(800)에서
// 글자·버튼이 잘리거나 넘치지 않는지, 언어를 바꾸면 열린 창이 바로 그 언어로만 바뀌는지, ✕ 로 닫으면 «보내지 않기» 인지 본다.
// 미리보기 서버를 가짜 키로 띄운다(실제로 보내지 않는다 — mock.js 가 바깥 요청을 막는다):
//   USAGE_PREVIEW=1 APP=serial PORT=5201 npx vite --config e2e/ui-preview/vite.config.mjs   (저장소 루트에서, 다른 앱도 같은 번호 규칙)
//   cd e2e && EDGEDRIVER=<msedgedriver.exe> node ui-preview/usage.mjs [앱…]
// 결과: shots/usage/<앱>-<경우>-<너비>-*.png, shots/usage/result.json. 문제가 있으면 종료 코드 1
import { Builder } from "selenium-webdriver";
import edge from "selenium-webdriver/edge.js";
import fs from "node:fs";
import path from "node:path";

const OUT = process.env.OUT ?? "shots/usage";
fs.mkdirSync(OUT, { recursive: true });
const PORTS = { serial: 5201, "modbus-slave": 5202, tcp: 5203, udp: 5204, simulator: 5205, netscan: 5206, "modbus-master": 5207, scpi: 5208, plot: 5209, "port-inspector": 5210 };
const apps = process.argv.slice(2).length ? process.argv.slice(2) : ["serial"];
const driverPath = process.env.EDGEDRIVER ?? path.join(process.env.PD_E2E_TOOLS ?? "C:\\tools", "edgedriver", "msedgedriver.exe");
const COMBOS = [
  { lang: "ko", theme: "light" },
  { lang: "en", theme: "light" },
  { lang: "ko", theme: "dark" },
  { lang: "en", theme: "dark" },
];
const SIZES = [
  { w: 984, h: 601 },
  { w: 800, h: 600 },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const d = await new Builder()
  .forBrowser("MicrosoftEdge")
  .setEdgeOptions(new edge.Options().addArguments("--headless=new", "--hide-scrollbars", "--force-device-scale-factor=1"))
  .setEdgeService(new edge.ServiceBuilder(driverPath))
  .build();

async function fit({ w, h }) {
  let [ow, oh] = [w, h];
  for (let i = 0; i < 3; i++) {
    await d.manage().window().setRect({ width: ow, height: oh });
    const [iw, ih] = await d.executeScript("return [innerWidth, innerHeight]");
    if (iw === w && ih === h) return;
    [ow, oh] = [ow + (w - iw), oh + (h - ih)];
  }
}
async function shot(name) {
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(await d.takeScreenshot(), "base64"));
}

/** 그 요소 안에서 잘리거나 넘친 것 — 창 밖·상자 밖으로 나감, 버튼·제목 글자 잘림, 다른 언어 글자 섞임 */
const CHECK = `
const root = arguments[0] ? document.querySelector(arguments[0]) : document.body;
const lang = arguments[1];
const out = [];
if (!root) return ['없음: ' + arguments[0]];
const box = root.getBoundingClientRect();
if (!box.width || !box.height) return ['보이지 않음(크기 0 — 숨은 칸 안에 그려짐)'];
if (box.right > innerWidth + 0.5 || box.left < -0.5 || box.bottom > innerHeight + 0.5 || box.top < -0.5) out.push('창 밖으로 나감 ' + JSON.stringify([box.left, box.top, box.right, box.bottom]));
for (const e of root.querySelectorAll('*')) {
  const r = e.getBoundingClientRect();
  if (!r.width || !r.height) continue;
  if (r.right > box.right + 1 || r.left < box.left - 1) out.push('상자 밖: ' + e.tagName + ' «' + e.textContent.trim().slice(0, 30) + '»');
  if ((e.tagName === 'BUTTON' || e.tagName === 'B' || e.tagName === 'LI' || e.tagName === 'LABEL') && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') out.push('글자 잘림: «' + e.textContent.trim().slice(0, 30) + '»');
}
// 언어 고르기의 «한국어»·«English» 는 일부러 제 언어로 쓴다
const text = root.innerText.replace(/한국어|English/g, '');
// 한국어 화면에 영어 문장이 섞였나 / 영어 화면에 한글이 섞였나(고유 이름 Aptabase·EU·IP·COM·PC·Windows 는 빼고 본다)
if (lang === 'en' && /[가-힣]/.test(text)) out.push('영어 화면에 한글: ' + (text.match(/.{0,20}[가-힣]+.{0,20}/) || [''])[0]);
if (lang === 'ko' && /\\b(the|and|you|sent|send|never|usage)\\b/i.test(text.replace(/Aptabase|EU|IP|COM|PC|Windows/g, ''))) out.push('한국어 화면에 영어 문장: ' + (text.match(/.{0,20}\\b(the|and|you|sent|send|never|usage)\\b.{0,20}/i) || [''])[0]);
return out;`;

const result = [];
let bad = 0;
for (const app of apps) {
  const port = PORTS[app];
  for (const size of SIZES) {
    await fit(size);
    for (const c of COMBOS) {
      const tag = `${app}-${c.lang}-${c.theme}-${size.w}`;
      const issues = [];
      await d.get(`http://localhost:${port}/`);
      await fit(size);
      await d.executeScript("localStorage.clear(); localStorage.setItem('settings', JSON.stringify(arguments[0])); localStorage.setItem('lang', JSON.stringify(arguments[0].lang));", { lang: c.lang, theme: c.theme });
      await d.navigate().refresh();
      await sleep(900);
      const shown = await d.executeScript("return !!document.querySelector('.usage-ask')");
      if (!shown) issues.push("묻는 창이 뜨지 않음(USAGE_PREVIEW=1 로 띄운 서버인지)");
      else {
        issues.push(...(await d.executeScript(CHECK, ".usage-ask", c.lang)));
        await shot(`${tag}-ask`);
        // 열린 채 언어 바꾸기 — 다른 창에서 설정을 바꾼 것과 같은 길(storage 사건)
        const other = c.lang === "ko" ? "en" : "ko";
        await d.executeScript(
          "const s = JSON.parse(localStorage.getItem('settings') || '{}'); s.lang = arguments[0]; const v = JSON.stringify(s); localStorage.setItem('settings', v); dispatchEvent(new StorageEvent('storage', { key: 'settings', newValue: v }));",
          other,
        );
        await sleep(300);
        const title = await d.executeScript("return document.querySelector('.usage-ask .modal-head b')?.textContent ?? ''");
        const want = other === "ko" ? "사용 통계를 보낼까요?" : "Send usage statistics?";
        if (title !== want) issues.push(`언어를 바꿔도 창 제목이 그대로: «${title}»`);
        issues.push(...(await d.executeScript(CHECK, ".usage-ask", other)).map((s) => `(바꾼 뒤 ${other}) ${s}`));
        await shot(`${tag}-ask-switched-${other}`);
        // 되돌리고 ✕ 로 닫기 → 보내지 않기
        await d.executeScript(
          "const s = JSON.parse(localStorage.getItem('settings') || '{}'); s.lang = arguments[0]; const v = JSON.stringify(s); localStorage.setItem('settings', v); dispatchEvent(new StorageEvent('storage', { key: 'settings', newValue: v }));",
          c.lang,
        );
        await sleep(200);
        await d.executeScript("document.querySelector('.usage-ask .modal-head button').click()");
        await sleep(200);
        const st = await d.executeScript("return [!!document.querySelector('.usage-ask'), JSON.parse(localStorage.getItem('settings')||'{}')]");
        if (st[0]) issues.push("✕ 로 닫히지 않음");
        if (st[1].usageStats !== false || st[1].usageAsked !== true) issues.push(`✕ 뒤 설정이 «보내지 않기» 가 아님: ${JSON.stringify({ usageStats: st[1].usageStats, usageAsked: st[1].usageAsked })}`);
        // 설정 창의 칸
        await d.executeScript("[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '⚙')?.click()");
        await sleep(400);
        const row = await d.executeScript(
          "const i = [...document.querySelectorAll('.modal input[type=checkbox]')].find((x) => /사용 통계|usage statistics/i.test(x.closest('label')?.textContent ?? '')); if (!i) return null; i.closest('label').scrollIntoView({ block: 'center' }); i.closest('label').id = '__usageRow'; return [i.checked, i.closest('label').textContent];",
        );
        if (!row) issues.push("설정 창에 «사용 통계 보내기» 칸이 없음");
        else {
          if (row[0]) issues.push("설정 칸이 켜져 있음(보내지 않기를 골랐는데)");
          issues.push(...(await d.executeScript(CHECK, ".modal", c.lang)).map((s) => `(설정 창) ${s}`));
          await sleep(150);
          await shot(`${tag}-settings`);
        }
        // 다시 띄워도 묻지 않는다
        await d.navigate().refresh();
        await sleep(700);
        if (await d.executeScript("return !!document.querySelector('.usage-ask')")) issues.push("한 번 고른 뒤에도 다시 물음");
        const net = await d.executeScript("return (window.__pdMock && window.__pdMock.net) || []");
        if (net.length) issues.push(`바깥 요청: ${JSON.stringify(net)}`);
      }
      bad += issues.length;
      result.push({ case: tag, issues });
      console.log(`${issues.length ? "✖" : "✔"} ${tag}${issues.length ? "\n   " + issues.join("\n   ") : ""}`);
    }
  }
}
fs.writeFileSync(path.join(OUT, "result.json"), JSON.stringify(result, null, 2));
await d.quit();
console.log(`${result.length} 경우, 문제 ${bad}`);
process.exit(bad ? 1 : 0);
