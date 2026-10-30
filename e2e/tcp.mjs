// PortDock TCP 검증 — 이 PC 안에서 상대(서버·클라이언트)를 띄워 실제로 주고받는다
import net from "node:net";
import { By, check, checkLayout, choose, click, field, launch, placeholder, report, section, shot, sleep, text, type, waitText, button } from "./lib.mjs";

function server() {
  const got = [];
  const socks = [];
  const srv = net.createServer((s) => {
    socks.push(s);
    s.on("data", (d) => got.push(...d));
    s.on("error", () => {});
  });
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r({ srv, got, socks, port: srv.address().port })));
}

function client(port) {
  return new Promise((r, j) => {
    const got = [];
    const c = net.connect(port, "127.0.0.1", () => r({ c, got }));
    c.on("data", (d) => got.push(...d));
    c.on("error", j);
  });
}

const hexs = (a) => a.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");

const app = await launch("portdock-tcp");
const d = app.driver;
try {
  section("C1 첫 화면");
  await shot(d, "tcp-01-start");
  const body = await text(d);
  check("C1 오류 화면 없음", !body.includes("TypeError") && !body.includes("is not"), "");
  check("C1 보내기 버튼 꺼짐", !(await (await button(d, "보내기")).isEnabled()));
  await checkLayout(d, "tcp-C3-client");

  section("C2 언어 전환");
  await choose(await d.findElement(By.css("select.lang")), "English");
  await shot(d, "tcp-02-english");
  const en = await text(d);
  check("C2 영어로 바뀜", en.includes("Connect") && en.includes("Framing") && !/[가-힣]/.test(en.replace("한국어", "")), "");
  await choose(await d.findElement(By.css("select.lang")), "한국어");

  section("T1 클라이언트");
  const s = await server();
  await type(await field(d, "주소"), "127.0.0.1");
  await type(await field(d, "포트"), s.port);
  await click(d, "연결");
  check("T1 연결됨 표시", await waitText(d, "연결됨"));
  check("T1 CONNECT 사건 줄", await waitText(d, "CONNECT 127.0.0.1"));
  await sleep(300);
  s.socks[0].write("HELLO\r\n");
  check("T1 받은 데이터 보임(HEX)", await waitText(d, "48 45 4C 4C 4F 0D 0A"));
  await shot(d, "tcp-03-client-connected");

  section("C10 보내기·미리보기");
  const sendbox = await d.findElement(By.css("input.sendtext"));
  await type(sendbox, "PING");
  const pv = await text(d);
  check("C10 미리보기 = PING CRLF", pv.includes("50 49 4E 47 0D 0A (6)"), "");
  s.got.length = 0;
  await click(d, "보내기");
  await sleep(500);
  check("C10 상대가 받은 바이트 = 미리보기", hexs(s.got) === "50 49 4E 47 0D 0A", hexs(s.got));

  // HEX + CRC16 Modbus
  const selects = await d.findElements(By.css(".sendbar select"));
  await choose(selects[0], "HEX");
  await type(sendbox, "01 03 00 00 00 0A");
  await choose(selects[1], "CRC16 Modbus");
  await choose(selects[2], "끝 문자: 없음");
  check("C10 CRC 붙은 미리보기", (await text(d)).includes("01 03 00 00 00 0A C5 CD (8)"));
  s.got.length = 0;
  await click(d, "보내기");
  await sleep(500);
  check("C10 CRC 붙여 나감", hexs(s.got) === "01 03 00 00 00 0A C5 CD", hexs(s.got));

  section("C6 잘못된 입력");
  await type(sendbox, "0G");
  await sleep(300);
  const bad = await text(d);
  check("C6 HEX 오류 문구", bad.includes("HEX 가 아닌 글자") || bad.includes("홀수"), "");
  check("C6 보내기 막힘", !(await (await button(d, "보내기")).isEnabled()));
  await shot(d, "tcp-04-bad-hex");
  await type(sendbox, "AA");

  section("C11 반복");
  s.got.length = 0;
  const rep = await d.findElement(By.xpath("//label[contains(., '반복')]/input"));
  await type(await d.findElement(By.css("input.num")), "200");
  check("C6 숫자 칸 지우고 다시 입력 = 200", (await (await d.findElement(By.css("input.num"))).getAttribute("value")) === "200");
  await rep.click();
  await sleep(1300);
  await rep.click();
  const n = s.got.length;
  check("C11 200ms 반복 ≈ 5~7회(한 번에 3바이트)", n % 3 === 0 && n / 3 >= 4 && n / 3 <= 8, `${n / 3}번`);
  await sleep(500);
  check("C11 끄면 멈춤", s.got.length === n);

  section("C12 명령 목록");
  await click(d, "+ 명령 목록");
  const names = await d.findElements(By.css("input.cmdname"));
  check("C12 추가됨", names.length === 1);
  await type(names[0], "읽기");
  s.got.length = 0;
  await (await d.findElement(By.xpath("//div[@class='cmd']//button[normalize-space(.)='▶']"))).click();
  await sleep(400);
  check("C12 ▶ 로 보냄(저장한 그대로: AA + CRC)", hexs(s.got).startsWith("AA ") && s.got.length === 3, hexs(s.got));
  // ✕ 는 확인 창(윈도우 기본 창)이 떠서 자동 조작이 안 된다 — 손으로 확인(test-plan C12)

  section("C8 로그");
  await click(d, "지우기");
  check("C8 지우기 → 카운터 0", (await text(d)).includes("RX 0 · TX 0"));

  section("T1 끊김·자동 재연결");
  for (const so of s.socks) so.destroy();
  check("T1 끊김 감지", await waitText(d, "closed by peer", 4000) || await waitText(d, "CLOSE", 1000));
  check("T1 재연결", await waitText(d, "연결됨", 6000));
  await shot(d, "tcp-05-reconnected");
  await click(d, "멈춤");
  check("T1 멈춤", await waitText(d, "멈춤"));
  s.srv.close();

  section("T2 서버");
  await choose(await field(d, "방식"), "서버");
  const free = await server();
  const port = free.port;
  free.srv.close();
  await sleep(200);
  await type(await field(d, "포트"), port);
  await click(d, "듣기 시작");
  check("T2 듣는 중", await waitText(d, "듣는 중"));
  const a = await client(port);
  const b = await client(port);
  check("T2 연결 2개 목록", await waitText(d, "연결한 상대") && (await d.findElements(By.css(".peer"))).length === 2);
  await checkLayout(d, "tcp-C3-server");
  await shot(d, "tcp-06-server-2peers");
  const sb = await d.findElement(By.css("input.sendtext"));
  await type(sb, "BB");
  await click(d, "보내기");
  await sleep(500);
  check("T2 모두에게 → 둘 다 받음", a.got.length > 0 && b.got.length > 0, `${hexs(a.got)} / ${hexs(b.got)}`);
  // 받는 쪽 하나만
  const tsel = (await d.findElements(By.css(".sendbar select")))[0];
  const opts = await tsel.findElements(By.css("option"));
  await opts[1].click();
  a.got.length = 0;
  b.got.length = 0;
  await click(d, "보내기");
  await sleep(500);
  check("T2 한 상대에게만", (a.got.length > 0) !== (b.got.length > 0), `${a.got.length}/${b.got.length}`);
  // 에코
  await (await d.findElement(By.xpath("//label[contains(., '에코')]/input"))).click();
  a.got.length = 0;
  a.c.write("ECHO?");
  await sleep(600);
  check("T2 에코", Buffer.from(a.got).toString().includes("ECHO?"));
  // 끊기
  await (await d.findElements(By.xpath("//div[@class='peer']//button")))[0].click();
  await sleep(800);
  check("T2 끊기 → 1개 남음", (await d.findElements(By.css(".peer"))).length === 1);
  check("T2 끊은 사유 = 사용자", await waitText(d, "disconnected by user", 2000));
  await shot(d, "tcp-07-server-kicked");

  section("T2 포트 사용 중");
  await click(d, "멈춤");
  const busy = await server();
  await type(await field(d, "포트"), busy.port);
  await type(await field(d, "묶을 주소"), "127.0.0.1");
  await click(d, "듣기 시작");
  await sleep(800);
  const bt = await text(d);
  check("T2 포트 사용 중 오류 문구", /10048|in use|사용|denied|권한/i.test(bt), bt.split("\n").slice(-2).join(" | "));
  await shot(d, "tcp-08-port-busy");
  busy.srv.close();
  a.c.destroy();
  b.c.destroy();

  section("C3 좁은 창 ☰");
  await d.manage().window().setRect({ width: 1000, height: 640 });
  await sleep(400);
  const right = await d.findElement(By.css("aside.right"));
  check("C3 좁은 창에서 오른쪽 칸 숨김", !(await right.isDisplayed()));
  await click(d, "☰ 명령 목록");
  check("C3 ☰ 누르면 펼침", await right.isDisplayed());
  await shot(d, "tcp-C3-drawer");
  await click(d, "✕");
  check("C3 ✕ 로 닫힘", !(await right.isDisplayed()));
  await click(d, "☰ 명령 목록");
  await d.findElement(By.css(".backdrop")).click();
  await sleep(200);
  check("C3 바깥 누르면 닫힘", !(await right.isDisplayed()));
} catch (e) {
  check("실행 중 예외", false, String(e).slice(0, 300));
  await shot(d, "tcp-zz-exception").catch(() => {});
} finally {
  await app.quit();
  process.exitCode = report("tcp");
}
