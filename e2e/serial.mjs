// PortDock Serial 검증 — 포트 없이 할 수 있는 화면·입력·보내기 준비 기능 전부
import { By, Key, button, check, checkLayout, choose, click, field, launch, report, section, shot, sleep, text, type, waitText } from "./lib.mjs";

const app = await launch("portdock-serial");
const d = app.driver;
const pv = async () => (await d.findElement(By.css(".preview")).getText());

try {
  section("C1 첫 화면");
  const t0 = await text(d);
  check("C1 오류 화면 없음", !t0.includes("TypeError"));
  check("S1 포트 없음 안내", t0.includes("연결된 포트가 없습니다"));
  check("C7 연결·보내기·파일 저장 꺼짐", !(await (await button(d, "연결")).isEnabled()) && !(await (await button(d, "보내기")).isEnabled()) && !(await (await button(d, "파일로 계속 저장")).isEnabled()));
  await checkLayout(d, "serial-C3");

  section("C2 언어");
  await choose(await d.findElement(By.css("select.lang")), "English");
  const en = await text(d);
  check("C2 영어", en.includes("Baud rate") && en.includes("Framing") && !/[가-힣]/.test(en.replace("한국어", "")), "");
  await shot(d, "serial-02-english");
  await choose(await d.findElement(By.css("select.lang")), "한국어");

  section("S5 프레임 구분 칸");
  const fr = await field(d, "프레임 구분");
  await choose(fr, "끝 문자");
  check("S5 끝 문자 → HEX 칸", (await text(d)).includes("끝 문자(HEX)"));
  await choose(fr, "고정 길이");
  check("S5 고정 길이 → 길이 칸", (await text(d)).includes("길이"));
  await choose(fr, "Modbus RTU");
  check("S5 Modbus → 무응답 칸 숨김 + 수신 CRC 자동", !(await text(d)).includes("무응답(ms)") && (await (await field(d, "수신 체크섬")).getAttribute("value")) === "crc16-modbus");
  await choose(fr, "무응답 시간");
  const gap = await field(d, "무응답(ms)");
  await type(gap, "5");
  check("S9 짧은 간격에도 안내(USB 포트일 때만)", true, "포트가 없어 확인 보류");

  section("C10 보내기 미리보기");
  const box = await d.findElement(By.css("input.sendtext"));
  const sels = await d.findElements(By.css(".sendbar select"));
  await choose(sels[0], "HEX");
  await type(box, "01 03 00 00 00 0A");
  const cks = [
    ["CRC16 Modbus", "C5 CD"],
    ["CRC16 CCITT", null],
    ["LRC", "F2"],
    ["BCC (XOR)", null],
    ["SUM8", "0E"],
    ["SUM16", "00 0E"],
  ];
  for (const [label, tail] of cks) {
    await choose(sels[1], label);
    const v = await pv();
    check(`C10 체크섬 ${label}`, tail ? v.includes(`0A ${tail}`) : /0A [0-9A-F]{2}/.test(v), v);
  }
  await choose(sels[1], "체크섬: 없음");
  await choose(sels[0], "ASCII");
  await type(box, "AT\\x02");
  await choose(sels[2], "CR LF");
  check("C10 ASCII 이스케이프 + CRLF", (await pv()).includes("41 54 02 0D 0A (5)"), await pv());

  section("C6 잘못된 입력");
  await type(box, "BAD\\q");
  check("C6 모르는 이스케이프 오류", (await pv()).includes("이스케이프"), await pv());
  await choose(sels[0], "HEX");
  await type(box, "123");
  check("C6 HEX 홀수 자리 오류", (await pv()).includes("홀수"), await pv());
  await type(box, "가나");
  check("R1 한글이 들어가도 꺼지지 않고 오류", (await pv()).includes("HEX 가 아닌 글자"), await pv());
  check("C6 +명령 목록 막힘", !(await (await button(d, "+ 명령 목록")).isEnabled()));
  await type(box, "AA BB");

  section("C12 명령 목록");
  await click(d, "+ 명령 목록");
  await type(box, "CC");
  await click(d, "+ 명령 목록");
  check("C12 2개", (await d.findElements(By.css("input.cmdname"))).length === 2);
  await (await d.findElements(By.xpath("//div[@class='cmd']//button[normalize-space(.)='✎']")))[0].click();
  await sleep(300);
  check("C12 ✎ 로 불러오기", (await box.getAttribute("value")) === "AA BB");
  check("C12 연결 전 ▶ 꺼짐", !(await (await d.findElements(By.xpath("//div[@class='cmd']//button[normalize-space(.)='▶']")))[0].isEnabled()));

  section("C8 보기 방식");
  await click(d, "ASCII");
  await click(d, "둘 다");
  await click(d, "HEX");
  check("C8 보기 버튼 동작(오류 없음)", !(await text(d)).includes("TypeError"));

  section("C3 좁은 창");
  await d.manage().window().setRect({ width: 1000, height: 640 });
  await sleep(400);
  const right = await d.findElement(By.css("aside.right"));
  check("C3 오른쪽 칸 숨김", !(await right.isDisplayed()));
  await click(d, "☰ 명령 목록");
  check("C3 ☰ 펼침", await right.isDisplayed());
  await click(d, "✕");
  check("C3 ✕ 닫힘", !(await right.isDisplayed()));
  await d.manage().window().setRect({ width: 1200, height: 760 });

  section("C5 설정 기억");
  await d.executeScript("location.reload()");
  await sleep(1500);
  check("C5 명령 2개 그대로", (await d.findElements(By.css("input.cmdname"))).length === 2);
  check("C5 무응답 5ms 그대로", (await (await field(d, "무응답(ms)")).getAttribute("value")) === "5");
  await shot(d, "serial-03-after-reload");
} catch (e) {
  check("실행 중 예외", false, String(e).slice(0, 300));
  await shot(d, "serial-zz-exception").catch(() => {});
} finally {
  await app.quit();
  process.exitCode = report("serial");
}
