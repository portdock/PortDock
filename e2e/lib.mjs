// 실제 PortDock 프로그램을 띄워 조작하는 도우미 (tauri-driver + Edge WebDriver)
import { Builder, By, Key, until } from "selenium-webdriver";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TOOLS = process.env.PD_E2E_TOOLS;
export const SHOTS = path.join(process.env.PD_E2E_SHOTS ?? path.join(ROOT, "e2e", "shots"));
fs.mkdirSync(SHOTS, { recursive: true });

export const results = [];
let current = "";

export function exe(name) {
  return path.join(ROOT, "target", "release", `${name}.exe`);
}

export async function launch(app) {
  const driverBin = path.join(process.env.USERPROFILE, ".cargo", "bin", "tauri-driver.exe");
  const tauriDriver = spawn(driverBin, ["--native-driver", path.join(TOOLS, "edgedriver", "msedgedriver.exe")], { stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 1500));
  const driver = await new Builder()
    .usingServer("http://127.0.0.1:4444/")
    .withCapabilities({ browserName: "wry", "tauri:options": { application: exe(app) } })
    .build();
  // 이전 실행에서 남은 설정을 지우고 깨끗하게 시작
  await driver.executeScript("localStorage.clear(); location.reload();");
  await sleep(1500);
  return {
    driver,
    async quit() {
      try {
        await driver.quit();
      } catch {}
      tauriDriver.kill();
    },
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function section(name) {
  current = name;
  console.log(`\n== ${name}`);
}

export function check(id, ok, detail = "") {
  results.push({ section: current, id, ok: !!ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${id}${detail ? ` — ${detail}` : ""}`);
}

export async function shot(driver, name) {
  const png = await driver.takeScreenshot();
  const file = path.join(SHOTS, `${name}.png`);
  fs.writeFileSync(file, png, "base64");
  return file;
}

const xq = (s) => (s.includes('"') ? `'${s}'` : `"${s}"`);

/** 글자로 버튼 찾기(정확히 같은 글자 우선) */
export async function button(driver, text) {
  const list = await driver.findElements(By.xpath(`//button[normalize-space(.)=${xq(text)}]`));
  if (list.length) return list[0];
  return driver.findElement(By.xpath(`//button[contains(normalize-space(.), ${xq(text)})]`));
}

export async function click(driver, text) {
  const b = await button(driver, text);
  await b.click();
  await sleep(200);
}

/** 라벨 글자로 그 안의 입력칸/선택칸 찾기 */
export async function field(driver, label) {
  return driver.findElement(By.xpath(`//label[contains(normalize-space(.), ${xq(label)})]//*[self::input or self::select][1]`));
}

export async function type(el, value) {
  await el.click();
  await el.sendKeys(Key.CONTROL, "a");
  await el.sendKeys(Key.DELETE);
  if (value !== "") await el.sendKeys(String(value));
  await sleep(150);
}

/** 선택칸에서 보이는 글자로 고르기 */
export async function choose(select, optionText) {
  const opt = await select.findElement(By.xpath(`.//option[contains(normalize-space(.), ${xq(optionText)})]`));
  await opt.click();
  await sleep(200);
}

export async function placeholder(driver, ph) {
  return driver.findElement(By.css(`input[placeholder=${JSON.stringify(ph)}]`));
}

export async function text(driver) {
  return driver.findElement(By.css("body")).getText();
}

export async function waitText(driver, needle, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if ((await text(driver)).includes(needle)) return true;
    await sleep(150);
  }
  return false;
}

export async function enabled(el) {
  return el.isEnabled();
}

export { By, Key, until };

export function report(name) {
  const file = path.join(SHOTS, `${name}-results.json`);
  fs.writeFileSync(file, JSON.stringify(results, null, 2));
  const fail = results.filter((r) => !r.ok);
  console.log(`\n${name}: ${results.length - fail.length}/${results.length} 통과`);
  for (const f of fail) console.log(`  ❌ [${f.section}] ${f.id} ${f.detail}`);
  return fail.length;
}

/** 보이는 버튼·입력·선택칸 중 화면 밖으로 나갔거나 찌그러진 것 */
export async function layoutProblems(driver) {
  return driver.executeScript(`
    const out = [];
    const W = innerWidth, H = innerHeight;
    for (const el of document.querySelectorAll('button, input, select')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.offsetParent === null) continue;
      if (el.type === 'checkbox') continue;
      const r = el.getBoundingClientRect();
      // 스크롤 영역 안에 있어 가려진 것은 제외(부모가 스크롤되는 경우)
      let p = el.parentElement, scroller = false;
      while (p) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowY + s.overflowX) && p !== document.body) { scroller = true; break; } p = p.parentElement; }
      const label = (el.innerText || el.value || el.placeholder || el.tagName).slice(0, 20);
      if (!scroller && (r.right > W + 1 || r.left < -1)) out.push('화면 밖: ' + label);
      const minW = el.tagName === 'SELECT' ? 60 : el.tagName === 'BUTTON' ? 24 : 40;
      if (r.width < minW) out.push('너무 좁음(' + Math.round(r.width) + 'px): ' + label);
      if (el.tagName === 'BUTTON' && r.height > 44) out.push('버튼 글자 줄바꿈: ' + label);
    }
    // 도구줄 글자가 세로로 쌓였는지
    for (const el of document.querySelectorAll('.toolbar > span, .toolbar > label')) {
      const r = el.getBoundingClientRect();
      if (r.height > 40 && r.width < 60) out.push('세로로 쌓인 글자: ' + el.innerText.slice(0, 12));
    }
    return out;
  `);
}

export async function checkLayout(driver, id, sizes = [[1200, 760], [1000, 640]]) {
  for (const [w, h] of sizes) {
    await driver.manage().window().setRect({ width: w, height: h });
    await sleep(500);
    const probs = await layoutProblems(driver);
    check(`${id} ${w}×${h} 화면 깨짐 없음`, probs.length === 0, probs.slice(0, 6).join(" / "));
    await shot(driver, `${id}-${w}x${h}`);
  }
  await driver.manage().window().setRect({ width: 1200, height: 760 });
  await sleep(300);
}
