// PortDock UDP 검증 — 이 PC 안에서 상대 UDP 소켓을 띄워 실제로 주고받는다
import dgram from "node:dgram";
import { By, button, check, checkLayout, choose, click, field, launch, report, section, shot, sleep, text, type, waitText } from "./lib.mjs";

function peer() {
  const got = [];
  const s = dgram.createSocket("udp4");
  s.on("message", (m, r) => got.push({ m: [...m], from: `${r.address}:${r.port}` }));
  return new Promise((res) => s.bind(0, "127.0.0.1", () => res({ s, got, port: s.address().port })));
}
const hexs = (a) => a.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
async function freePort() {
  const p = await peer();
  const port = p.port;
  p.s.close();
  await sleep(100);
  return port;
}

const app = await launch("portdock-udp");
const d = app.driver;
try {
  section("C1 첫 화면");
  await shot(d, "udp-01-start");
  check("C1 오류 화면 없음", !(await text(d)).includes("TypeError"));
  check("C1 보내기 꺼짐", !(await (await button(d, "보내기")).isEnabled()));
  await checkLayout(d, "udp-C3-idle");

  section("C2 언어");
  await choose(await d.findElement(By.css("select.lang")), "English");
  const en = await text(d);
  check("C2 영어", en.includes("Start") && en.includes("Default destination") && !/[가-힣]/.test(en.replace("한국어", "")));
  await shot(d, "udp-02-english");
  await choose(await d.findElement(By.css("select.lang")), "한국어");

  section("U1 받기·보내기");
  const p = await peer();
  const myPort = await freePort();
  const ins = await d.findElements(By.css("aside.side input:not([type=checkbox])"));
  // [묶을 주소, 받을 포트, 보낼 주소, 보낼 포트, 멀티캐스트]
  await type(ins[0], "127.0.0.1");
  await type(ins[1], myPort);
  await type(ins[2], "127.0.0.1");
  await type(ins[3], p.port);
  await click(d, "시작");
  check("U1 받는 중", await waitText(d, "받는 중"));
  check("U1 BIND 사건 줄", await waitText(d, `BIND 127.0.0.1:${myPort}`));
  // 상대 → 우리
  p.s.send(Buffer.from([1, 2, 3]), myPort, "127.0.0.1");
  check("U1 받은 데이터·보낸 쪽 주소", (await waitText(d, "01 02 03")) && (await waitText(d, `127.0.0.1:${p.port}`)));
  check("U1 보내온 상대 목록", (await d.findElements(By.css(".peer"))).length === 1);
  await checkLayout(d, "udp-C3-running");
  // 우리 → 기본 대상
  const sb = await d.findElement(By.css("input.sendtext"));
  await type(sb, "0A 0B");
  await click(d, "보내기");
  await sleep(400);
  check("U2 기본 대상으로 나감", p.got.length === 1 && hexs(p.got[0].m) === "0A 0B", p.got.map((x) => hexs(x.m)).join("|"));
  check("U2 보낸 쪽 포트 = 받는 포트", p.got[0]?.from.endsWith(`:${myPort}`), p.got[0]?.from);

  section("U2 마지막으로 보내온 쪽");
  const q = await peer();
  q.s.send(Buffer.from("HI"), myPort, "127.0.0.1");
  await sleep(500);
  const tsel = (await d.findElements(By.css(".sendbar select")))[0];
  await choose(tsel, "마지막으로 보내온 쪽");
  await click(d, "보내기");
  await sleep(400);
  check("U2 마지막 보낸 쪽(q)으로", q.got.length === 1, `q=${q.got.length} p=${p.got.length}`);

  section("U3 에코");
  await (await d.findElement(By.xpath("//label[contains(., '에코')]/input"))).click();
  p.got.length = 0;
  p.s.send(Buffer.from([0x55]), myPort, "127.0.0.1");
  await sleep(500);
  check("U3 에코로 되돌아옴", p.got.some((x) => hexs(x.m) === "55"));
  check("U3 ECHO ON 사건", await waitText(d, "ECHO ON"));

  section("U3 ICMP 안내");
  const dead = await freePort();
  await type(ins[3], dead);
  await sleep(700);
  await choose((await d.findElements(By.css(".sendbar select")))[0], "기본 대상");
  await click(d, "보내기");
  check("U3 아무도 안 들을 때 안내", await waitText(d, "ICMP port unreachable", 3000));
  await shot(d, "udp-03-icmp");

  section("U1 멈춤·포트 사용 중");
  await click(d, "멈춤");
  check("U1 멈춤", await waitText(d, "멈춤"));
  const busy = await peer();
  await type(ins[1], busy.port);
  await click(d, "시작");
  await sleep(600);
  const errs = await d.findElements(By.css(".error"));
  const et = errs.length ? await errs[0].getText() : "";
  check("U1 포트 사용 중 오류 문구", /10048|하나만 사용|in use/i.test(et), et);
  busy.s.close();

  section("U3 멀티캐스트 잘못된 그룹");
  await type(ins[1], myPort);
  await type(ins[4], "192.168.0.1");
  await click(d, "시작");
  await sleep(600);
  const e2 = await d.findElements(By.css(".error"));
  const et2 = e2.length ? await e2[0].getText() : "";
  check("U3 멀티캐스트 주소 아님 오류", et2.includes("멀티캐스트"), et2);

  section("U3 멀티캐스트 가입·재가입");
  await type(ins[4], "239.1.2.3");
  await type(ins[0], "0.0.0.0");
  await click(d, "시작");
  const ok = await waitText(d, "multicast 239.1.2.3", 3000);
  check("U3 가입 사건 줄", ok);
  if (ok) {
    await click(d, "다시 가입 239.1.2.3");
    check("U3 재가입", await waitText(d, "REJOIN 239.1.2.3"));
    // 그룹으로 보내면 받는다
    const m = dgram.createSocket("udp4");
    m.send(Buffer.from([0xa5]), myPort, "239.1.2.3");
    check("U3 그룹으로 보낸 것 받음", await waitText(d, "A5", 3000));
    m.close();
  }
  await shot(d, "udp-04-multicast");
  await click(d, "멈춤");
  p.s.close();
  q.s.close();
} catch (e) {
  check("실행 중 예외", false, String(e).slice(0, 300));
  await shot(d, "udp-zz-exception").catch(() => {});
} finally {
  await app.quit();
  process.exitCode = report("udp");
}
