// PortDock Modbus Slave 검증 — 포트 없이 할 수 있는 화면·입력·표 기능 전부
import { By, Key, button, check, checkLayout, choose, click, field, launch, report, section, shot, sleep, text, type, waitText } from "./lib.mjs";

const app = await launch("portdock-modbus-slave");
const d = app.driver;
const regs = () => d.findElements(By.css(".reg"));
const regInput = async (i) => (await (await regs())[i].findElement(By.css("input")));

try {
  section("C1 첫 화면");
  check("C1 오류 화면 없음", !(await text(d)).includes("TypeError"));
  check("C1 포트 없음 → 연결 꺼짐", !(await (await button(d, "연결")).isEnabled()));
  check("C1 기본 100칸", (await regs()).length === 100);
  await checkLayout(d, "slave-C3");

  section("C2 언어");
  await choose(await d.findElement(By.css("select.lang")), "English");
  const en = await text(d);
  check("C2 영어", en.includes("Holding registers") && en.includes("Fault injection") && !/[가-힣]/.test(en.replace("한국어", "")));
  await shot(d, "slave-02-english");
  await choose(await d.findElement(By.css("select.lang")), "한국어");

  section("M1 슬레이브 주소");
  const idIn = await d.findElement(By.css("input[placeholder='1~247']"));
  await type(idIn, "0");
  await click(d, "추가");
  await type(idIn, "248");
  await click(d, "추가");
  await type(idIn, "1");
  await click(d, "추가");
  check("M1 0·248·중복 1 거절", (await d.findElements(By.css(".chip"))).length === 1);
  await type(idIn, "17");
  await idIn.sendKeys(Key.ENTER);
  await sleep(300);
  check("M1 17 추가(엔터)·선택", (await d.findElements(By.css(".chip"))).length === 2 && (await text(d)).includes("ID 17"));
  // 17 표에 값 넣고 1 로 바꾸면 따로
  await type(await regInput(0), "1234");
  await (await regInput(0)).sendKeys(Key.ENTER);
  await sleep(500);
  await (await d.findElement(By.xpath("//span[contains(@class,'chip') and starts-with(normalize-space(.),'1')]"))).click();
  await sleep(500);
  check("M1 주소마다 표가 따로", (await (await regInput(0)).getAttribute("value")) === "0");
  // 17 삭제 → 1 남고 1 은 × 없음
  await (await d.findElement(By.xpath("//span[contains(@class,'chip') and starts-with(normalize-space(.),'17')]/b"))).click();
  await sleep(300);
  check("M1 삭제 → 1개, 마지막은 × 없음", (await d.findElements(By.css(".chip"))).length === 1 && (await d.findElements(By.css(".chip b"))).length === 0);

  section("M3 값 입력·표시 형식");
  await type(await regInput(5), "65535");
  await (await regInput(5)).sendKeys(Key.ENTER);
  await sleep(400);
  const fmt = await field(d, "표시");
  await choose(fmt, "S16");
  await sleep(500);
  check("M3 S16: 65535 → -1", (await (await regInput(5)).getAttribute("value")) === "-1");
  await choose(fmt, "HEX");
  await sleep(500);
  check("M3 HEX: FFFF", (await (await regInput(5)).getAttribute("value")) === "FFFF");
  await type(await regInput(6), "1A2B");
  await (await regInput(6)).sendKeys(Key.ENTER);
  await choose(fmt, "U16");
  await sleep(500);
  check("M3 HEX 1A2B 입력 → U16 6699", (await (await regInput(6)).getAttribute("value")) === "6699");
  await choose(fmt, "BIN");
  await sleep(500);
  check("M3 BIN 표시", (await (await regInput(6)).getAttribute("value")) === "0001 1010 0010 1011");
  await choose(fmt, "S16");
  await type(await regInput(7), "-2");
  await (await regInput(7)).sendKeys(Key.ENTER);
  await choose(fmt, "U16");
  await sleep(500);
  check("M3 S16 -2 → U16 65534", (await (await regInput(7)).getAttribute("value")) === "65534");
  // 잘못된 입력: 빨간 칸, 벗어나면 되돌림
  const r8 = await regInput(8);
  await type(r8, "70000");
  check("M3 범위 밖 빨간 칸", (await r8.getAttribute("class")).includes("bad"));
  await (await regInput(9)).click();
  await sleep(300);
  check("M3 벗어나면 원래 값", (await r8.getAttribute("value")) === "0");
  await shot(d, "slave-03-values");

  section("M2 표·범위");
  await click(d, "코일");
  await sleep(500);
  check("M2 코일 표 = 체크박스", (await d.findElements(By.css(".reg input[type=checkbox]"))).length === 100);
  const cb = (await d.findElements(By.css(".reg input[type=checkbox]")))[3];
  await cb.click();
  await sleep(500);
  check("M3 코일 켜짐 유지", await cb.isSelected());
  await click(d, "보유 레지스터");
  await sleep(400);
  const start = await field(d, "시작 주소");
  const count = await field(d, "개수");
  await type(start, "40000");
  await type(count, "8");
  await sleep(600);
  const addrs = await Promise.all((await d.findElements(By.css(".addr"))).map((a) => a.getText()));
  check("M2 시작 40000 개수 8", addrs.length === 8 && addrs[0] === "40000" && addrs[7] === "40007", addrs.join(","));
  await type(count, "0");
  check("M2 개수 0 → 빨간 칸", (await count.getAttribute("class")).includes("bad"));
  await type(count, "100");
  await type(start, "0");
  await sleep(500);

  section("M4 채우기");
  await click(d, "채우기");
  await sleep(600);
  check("M4 0,1,2…", (await (await regInput(42)).getAttribute("value")) === "42");

  section("M6 장애 주입 경고");
  await (await d.findElement(By.xpath("//label[contains(., '응답 안 함')]/input"))).click();
  check("M6 경고 표시", await waitText(d, "⚠"));
  await (await d.findElement(By.xpath("//label[contains(., '응답 안 함')]/input"))).click();
  await choose(await field(d, "예외로 답함"), "06 Server Device Busy");
  check("M6 예외 강제도 경고", await waitText(d, "⚠"));
  await choose(await field(d, "예외로 답함"), "없음");
  await shot(d, "slave-04-faults");

  section("C5 설정·값 기억");
  await d.executeScript("location.reload()");
  await sleep(2000);
  check("C5 표 값 그대로(채운 값)", (await (await regInput(42)).getAttribute("value")) === "42");
  await click(d, "코일");
  await sleep(600);
  check("C5 코일 값 그대로", await (await d.findElements(By.css(".reg input[type=checkbox]")))[3].isSelected());
} catch (e) {
  check("실행 중 예외", false, String(e).slice(0, 300));
  await shot(d, "slave-zz-exception").catch(() => {});
} finally {
  await app.quit();
  process.exitCode = report("slave");
}
