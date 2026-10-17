// PortDock Simulator 검증 — TCP 서버로 띄우고 상대가 접속해 규칙대로 답하는지
import net from "node:net";
import { By, button, check, checkLayout, choose, click, field, launch, report, section, shot, sleep, text, type, waitText } from "./lib.mjs";

const hexs = (a) => a.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
async function freePort() {
  const s = net.createServer();
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const p = s.address().port;
  s.close();
  await sleep(100);
  return p;
}
function connect(port) {
  return new Promise((res, rej) => {
    const got = [];
    const c = net.connect(port, "127.0.0.1", () => res({ c, got }));
    c.on("data", (d) => got.push(...d));
    c.on("error", rej);
  });
}
/** 보내고 응답이 올 때까지(최대 ms) */
async function ask(cl, bytes, ms = 1500) {
  cl.got.length = 0;
  cl.c.write(Buffer.from(bytes));
  const end = Date.now() + ms;
  while (Date.now() < end && cl.got.length === 0) await sleep(30);
  await sleep(150);
  return hexs(cl.got);
}
const cards = (d) => d.findElements(By.css(".arcard"));

async function setRule(d, i, { name, pmode, kind, pattern, rmode, reply, checksum, suffix, delay }) {
  const card = (await cards(d))[i];
  const ins = await card.findElements(By.css("input"));
  const sels = await card.findElements(By.css("select"));
  // ins: [체크, 이름, 패턴, 응답, 지연] / sels: [패턴 방식, 정확히·포함, 응답 방식, 체크섬, 끝 문자]
  if (name != null) await type(ins[1], name);
  if (pmode) await choose(sels[0], pmode);
  if (kind) await choose(sels[1], kind);
  if (pattern != null) await type(ins[2], pattern);
  if (rmode) await choose(sels[2], rmode);
  if (reply != null) await type(ins[3], reply);
  if (checksum) await choose(sels[3], checksum);
  if (suffix) await choose(sels[4], suffix);
  if (delay != null) await type(ins[4], delay);
}

const app = await launch("portdock-simulator");
const d = app.driver;
try {
  section("C1·X1 첫 화면·연결 방식");
  check("C1 오류 화면 없음", !(await text(d)).includes("TypeError"));
  await shot(d, "sim-01-start");
  const tsel = await field(d, "연결 방식");
  await choose(tsel, "TCP 서버");
  check("X1 TCP 서버 → 주소·포트 칸", (await text(d)).includes("주소"));
  await choose(tsel, "TCP 클라이언트");
  check("X1 TCP 클라이언트 → 보낼 곳", (await text(d)).includes("보낼 곳"));
  await choose(tsel, "UDP");
  check("X1 UDP → 받을 포트 + 프레임 구분 없음", (await text(d)).includes("받을 포트") && !(await text(d)).includes("프레임 구분"));
  await choose(tsel, "시리얼");
  check("X1 시리얼, 포트 없음 → 시작 꺼짐", !(await (await button(d, "시작")).isEnabled()));
  await checkLayout(d, "sim-C3-serial");
  await choose(tsel, "TCP 서버");

  section("X2 규칙 만들기");
  await click(d, "+ 규칙 추가");
  await click(d, "+ 규칙 추가");
  await click(d, "+ 규칙 추가");
  check("X2 규칙 3개", (await cards(d)).length === 3);
  // 1) Modbus 읽기 요청 → CRC 자동
  await setRule(d, 0, { name: "modbus read", pattern: "01 03 ?? ?? 00 01 **", reply: "01 03 02 00 64", checksum: "CRC16 Modbus" });
  // 2) ASCII 포함 → 끝 문자, 지연 300ms
  await setRule(d, 1, { name: "status", pmode: "ASCII", kind: "포함", pattern: "STATUS?", rmode: "ASCII", reply: "OK", suffix: "CR LF", delay: 300 });
  // 3) 아무거나(**) → NAK — 맨 아래라 위 규칙이 먼저
  await setRule(d, 2, { name: "fallback", pattern: "**", reply: "15" });
  check("X2 3개 동작 중 표시", await waitText(d, "규칙 3개 동작 중"));
  await checkLayout(d, "sim-C3-rules");

  section("X2 잘못된 패턴");
  await setRule(d, 2, { pattern: "0G" });
  check("X2 오류에 규칙 이름", await waitText(d, "«fallback» 패턴", 2000));
  await shot(d, "sim-02-bad-rule");
  await setRule(d, 2, { pattern: "**" });
  check("X2 고치면 오류 사라짐", await waitText(d, "규칙 3개 동작 중"));

  section("X3 TCP 서버로 실제 응답");
  const port = await freePort();
  const ins = await d.findElements(By.css("aside.side input"));
  await type(ins[0], "127.0.0.1");
  await type(ins[1], port);
  await click(d, "시작");
  check("X3 기다리는 중", await waitText(d, "기다리는 중"));
  const cl = await connect(port);
  await sleep(300);
  const r1 = await ask(cl, [0x01, 0x03, 0x00, 0x10, 0x00, 0x01, 0x85, 0xcf]);
  check("X3 Modbus 응답 + CRC 자동", r1 === "01 03 02 00 64 B9 AF", r1);
  const t0 = Date.now();
  const r2 = await ask(cl, [...Buffer.from(">>STATUS?\r\n")]);
  const dt = Date.now() - t0;
  check("X3 ASCII 포함 → OK CRLF", r2 === "4F 4B 0D 0A", r2);
  check("X3 지연 300ms 지켜짐", dt >= 280, `${dt}ms`);
  const r3 = await ask(cl, [0x99]);
  check("X3 맨 아래 ** → NAK", r3 === "15", r3);
  check("X3 AUTO 사건 줄", await waitText(d, "AUTO modbus read"));
  await sleep(700);
  const hits = await d.findElements(By.css(".hits"));
  const ht = await Promise.all(hits.map((h) => h.getText()));
  check("X3 규칙별 응답 횟수 1·1·1", ht.join(",") === "1,1,1", ht.join(","));

  section("X2 순서·끄기·실행 중 바로 적용");
  // fallback 을 맨 위로 → 모든 요청에 NAK
  const c3 = (await cards(d))[2];
  await (await c3.findElement(By.xpath(".//button[normalize-space(.)='↑']"))).click();
  await (await (await cards(d))[1].findElement(By.xpath(".//button[normalize-space(.)='↑']"))).click();
  await sleep(600);
  const r4 = await ask(cl, [0x01, 0x03, 0x00, 0x10, 0x00, 0x01, 0x85, 0xcf]);
  check("X2 ↑ 로 순서 바뀜 → fallback 먼저", r4 === "15", r4);
  // fallback 끄기
  await (await (await cards(d))[0].findElement(By.css("input[type=checkbox]"))).click();
  await sleep(600);
  const r5 = await ask(cl, [0x01, 0x03, 0x00, 0x10, 0x00, 0x01, 0x85, 0xcf]);
  check("X2 끈 규칙은 건너뜀", r5 === "01 03 02 00 64 B9 AF", r5);
  await click(d, "횟수 초기화");
  await sleep(700);
  const ht2 = await Promise.all((await d.findElements(By.css(".hits"))).map((h) => h.getText()));
  check("X3 횟수 초기화", ht2.every((x) => x === "0"), ht2.join(","));

  section("X5 장비가 먼저 보내기");
  const un = await d.findElements(By.css(".unsol input"));
  await type(un[0], "HEARTBEAT");
  cl.got.length = 0;
  await (await d.findElement(By.xpath("//div[@class='unsol']//button[normalize-space(.)='보내기']"))).click();
  await sleep(400);
  check("X5 보내기", Buffer.from(cl.got).toString() === "HEARTBEAT\r\n", JSON.stringify(Buffer.from(cl.got).toString()));
  cl.got.length = 0;
  await type(un[1], "200");
  const rep = await d.findElement(By.xpath("//div[@class='unsol']//label[contains(., '반복')]/input"));
  await rep.click();
  await sleep(1100);
  await rep.click();
  const n = Buffer.from(cl.got).toString().split("HEARTBEAT").length - 1;
  check("X5 200ms 반복 ≈ 4~7회", n >= 4 && n <= 7, `${n}회`);
  await shot(d, "sim-03-running");

  section("X1 멈춤");
  await click(d, "멈춤");
  check("X1 멈춤", await waitText(d, "멈춤"));
  cl.c.destroy();

  section("C5 설정 기억");
  await d.executeScript("location.reload()");
  await sleep(1500);
  check("C5 규칙 3개 그대로", (await cards(d)).length === 3);
  check("C5 연결 방식 그대로(TCP 서버)", (await (await field(d, "연결 방식")).getAttribute("value")) === "tcp-server");

  section("✕ 규칙 삭제");
  await (await (await cards(d))[0].findElement(By.xpath(".//button[normalize-space(.)='✕']"))).click();
  check("규칙 삭제 → 2개", (await cards(d)).length === 2);
} catch (e) {
  check("실행 중 예외", false, String(e).slice(0, 300));
  await shot(d, "sim-zz-exception").catch(() => {});
} finally {
  await app.quit();
  process.exitCode = report("sim");
}
