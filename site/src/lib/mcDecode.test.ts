// crates/core/src/mc.rs 시험과 같은 프레임(SLMP SH-080956ENG 5.2·5.9 예시의 명령·응답 데이터) — 웹 해석기와 PLC Simulator 가 같은 답을 내는지
import { test } from "node:test";
import assert from "node:assert/strict";
import { hex } from "./checksum.ts";
import { buildRequest, decodeMc, frameText, type Item, type McDecoded } from "./mcDecode.ts";

const le2 = (n: number) => [n & 0xff, n >> 8];
/** mc.rs b3: 3E 이진 요청, 자기 국, 감시 타이머 0010 */
const b3 = (cmd: number[]) => hex([0x50, 0x00, 0x00, 0xff, 0xff, 0x03, 0x00, ...le2(2 + cmd.length), 0x10, 0x00, ...cmd]);
const b3ok = (data: number[]) => hex([0xd0, 0x00, 0x00, 0xff, 0xff, 0x03, 0x00, ...le2(2 + data.length), 0x00, 0x00, ...data]);
const h4 = (n: number) => n.toString(16).toUpperCase().padStart(4, "0");
const a3 = (cmd: string) => `500000FF03FF00${h4(4 + cmd.length)}0010${cmd}`;
const a3ok = (data: string) => `D00000FF03FF00${h4(4 + data.length)}0000${data}`;

const items = (d: McDecoded) => d.items.map((i: Item) => [i.addr, i.value]);
const field = (d: McDecoded, name: string) => [...d.header, ...d.body].find((f) => f.name === name)?.value;

test("M100~M107 비트 읽기 — 요청·응답 (mc.rs read_bits_m100_to_m107)", () => {
  const reqB = b3([0x01, 0x04, 0x01, 0x00, 0x64, 0x00, 0x00, 0x90, 0x08, 0x00]);
  const q = decodeMc(reqB, { lang: "en" });
  assert.deepEqual([q.frame, q.code, q.dir, q.command, q.sub, q.simEnd], ["3e", "binary", "request", 0x0401, 0x0001, 0]);
  assert.equal(q.commandName, "Read (bits)");
  assert.ok(field(q, "Head device")!.startsWith("M100 — M Internal relay (code 90)"));
  assert.equal(field(q, "Number of device points"), "8 points (bits)");
  assert.equal(field(q, "Monitoring timer"), "16 × 0.25 s = 4 s");
  const want = [0, 0, 0, 1, 0, 0, 1, 1].map((v, i) => [`M${100 + i}`, v]);
  assert.deepEqual(items(decodeMc(b3ok([0x00, 0x01, 0x00, 0x11]), { pair: reqB })), want);
  const reqA = a3("04010001M*0001000008");
  const qa = decodeMc(reqA);
  assert.deepEqual([qa.code, qa.command, qa.sub, qa.simEnd], ["ascii", 0x0401, 1, 0]);
  assert.deepEqual(items(decodeMc(a3ok("00010011"), { pair: reqA })), want);
});

test("M100~M131 워드 단위·TN100~TN102 (mc.rs read_words_*)", () => {
  const req = b3([0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0x90, 0x02, 0x00]);
  assert.deepEqual(items(decodeMc(b3ok([0x34, 0x12, 0x02, 0x00]), { pair: req })), [
    ["M100–M115", 0x1234],
    ["M116–M131", 0x0002],
  ]);
  assert.deepEqual(items(decodeMc(a3ok("12340002"), { pair: a3("04010000M*0001000002") })), [
    ["M100–M115", 0x1234],
    ["M116–M131", 0x0002],
  ]);
  const tn = b3([0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0xc2, 0x03, 0x00]);
  assert.deepEqual(items(decodeMc(b3ok([0x34, 0x12, 0x02, 0x00, 0xef, 0x1d]), { pair: tn })), [
    ["TN100", 0x1234],
    ["TN101", 0x0002],
    ["TN102", 0x1def],
  ]);
  assert.deepEqual(items(decodeMc(a3ok("123400021DEF"), { pair: a3("04010000TN0001000003") })).map((x) => x[1]), [0x1234, 0x0002, 0x1def]);
  // 짝 요청이 없으면 워드로만
  assert.deepEqual(items(decodeMc(b3ok([0x34, 0x12, 0x02, 0x00]))), [
    ["#0", 0x1234],
    ["#1", 0x0002],
  ]);
});

test("일괄 쓰기 — 비트·워드 (mc.rs write_bits_m100_to_m107, write_words_*)", () => {
  const bits = [1, 1, 0, 0, 1, 1, 0, 0].map((v, i) => [`M${100 + i}`, v]);
  const b = decodeMc(b3([0x01, 0x14, 0x01, 0x00, 0x64, 0x00, 0x00, 0x90, 0x08, 0x00, 0x11, 0x00, 0x11, 0x00]));
  assert.deepEqual([b.command, b.simEnd], [0x1401, 0]);
  assert.deepEqual(items(b), bits);
  assert.deepEqual(items(decodeMc(a3("14010001M*000100000811001100"))), bits);
  const m = decodeMc(b3([0x01, 0x14, 0x00, 0x00, 0x64, 0x00, 0x00, 0x90, 0x02, 0x00, 0x47, 0x23, 0x96, 0xab]));
  assert.deepEqual(items(m), [
    ["M100–M115", 0x2347],
    ["M116–M131", 0xab96],
  ]);
  const d = [
    ["D100", 0x1995],
    ["D101", 0x1202],
    ["D102", 0x1130],
  ];
  assert.deepEqual(items(decodeMc(b3([0x01, 0x14, 0x00, 0x00, 0x64, 0x00, 0x00, 0xa8, 0x03, 0x00, 0x95, 0x19, 0x02, 0x12, 0x30, 0x11]))), d);
  assert.deepEqual(items(decodeMc(a3("14010000D*0001000003199512021130"))), d);
  assert.deepEqual(items(decodeMc(a3("14010000M*00010000022347AB96"))).map((x) => x[1]), [0x2347, 0xab96]);
  // 쓰기 완료 응답(데이터 없음)
  const ok = decodeMc(b3ok([]));
  assert.deepEqual([ok.dir, ok.endCode, ok.items.length], ["response", 0, 0]);
});

test("0403 랜덤 읽기 매뉴얼 예 (mc.rs random_read_manual_example)", () => {
  const req = b3([
    0x03, 0x04, 0x00, 0x00, 0x04, 0x03, 0x00, 0x00, 0x00, 0xa8, 0x00, 0x00, 0x00, 0xc2, 0x64, 0x00, 0x00, 0x90, 0x20, 0x00, 0x00, 0x9c, 0xdc, 0x05, 0x00, 0xa8, 0x60, 0x01, 0x00, 0x9d, 0x57, 0x04, 0x00, 0x90,
  ]);
  const q = decodeMc(req, { lang: "en" });
  assert.deepEqual([q.command, q.simEnd], [0x0403, 0]);
  assert.equal(field(q, "Word access points"), "4");
  assert.ok(field(q, "Word 4")!.startsWith("X20 — X Input (code 9C, hex number = 32 decimal)"));
  const want = [
    ["D0", 0x1995],
    ["TN0", 0x1202],
    ["M100–M115", 0x2030],
    ["X20–X2F", 0x4849],
    ["D1500–D1501", 0x4c544f4e],
    ["Y160–Y17F", 0xc3deb9af],
    ["M1111–M1142", 0xbaddbcb7],
  ];
  const resp = [0x95, 0x19, 0x02, 0x12, 0x30, 0x20, 0x49, 0x48, 0x4e, 0x4f, 0x54, 0x4c, 0xaf, 0xb9, 0xde, 0xc3, 0xb7, 0xbc, 0xdd, 0xba];
  assert.deepEqual(items(decodeMc(b3ok(resp), { pair: req })), want);
  const reqA = a3("040300000403D*000000TN000000M*000100X*000020D*001500Y*000160M*001111");
  assert.equal(decodeMc(reqA).simEnd, 0);
  assert.deepEqual(items(decodeMc(a3ok("19951202203048494C544F4EC3DEB9AFBADDBCB7"), { pair: reqA })), want);
});

test("1402 랜덤 쓰기 — 비트·워드 매뉴얼 예 (mc.rs random_write_*)", () => {
  const bits = [
    ["M50", 0],
    ["Y2F", 1],
  ];
  assert.deepEqual(items(decodeMc(b3([0x02, 0x14, 0x01, 0x00, 0x02, 0x32, 0x00, 0x00, 0x90, 0x00, 0x2f, 0x00, 0x00, 0x9d, 0x01]))), bits);
  assert.deepEqual(items(decodeMc(a3("1402000102M*00005000Y*00002F01"))), bits);
  const words = [
    ["D0", 0x0550],
    ["D1", 0x0575],
    ["M100–M115", 0x0540],
    ["X20–X2F", 0x0583],
    ["D1500–D1501", 0x04391202],
    ["Y160–Y17F", 0x23752607],
    ["M1111–M1142", 0x04250475],
  ];
  const req = [
    0x02, 0x14, 0x00, 0x00, 0x04, 0x03, 0x00, 0x00, 0x00, 0xa8, 0x50, 0x05, 0x01, 0x00, 0x00, 0xa8, 0x75, 0x05, 0x64, 0x00, 0x00, 0x90, 0x40, 0x05, 0x20, 0x00, 0x00, 0x9c, 0x83, 0x05, 0xdc, 0x05, 0x00, 0xa8, 0x02, 0x12, 0x39, 0x04,
    0x60, 0x01, 0x00, 0x9d, 0x07, 0x26, 0x75, 0x23, 0x57, 0x04, 0x00, 0x90, 0x75, 0x04, 0x25, 0x04,
  ];
  assert.deepEqual(items(decodeMc(b3(req))), words);
  assert.deepEqual(items(decodeMc(a3("140200000403D*0000000550D*0000010575M*0001000540X*0000200583D*00150004391202Y*00016023752607M*00111104250475"))), words);
});

test("0619 루프백·4E 일련번호 (mc.rs loopback_manual_example, frame_4e_serial_echo)", () => {
  const lb = b3([0x19, 0x06, 0x00, 0x00, 0x05, 0x00, 0x41, 0x42, 0x43, 0x44, 0x45]);
  assert.equal(field(decodeMc(lb, { lang: "en" }), "Loopback data"), '"ABCDE"');
  assert.equal(field(decodeMc(b3ok([0x05, 0x00, 0x41, 0x42, 0x43, 0x44, 0x45]), { pair: lb, lang: "en" }), "Loopback data"), '"ABCDE"');
  assert.equal(field(decodeMc(a3ok("0005ABCDE"), { pair: a3("061900000005ABCDE"), lang: "en" }), "Loopback data"), '"ABCDE"');
  const r4 = decodeMc("54 00 34 12 00 00 00 FF FF 03 00 0D 00 10 00 19 06 00 00 05 00 41 42 43 44 45");
  assert.deepEqual([r4.frame, r4.dir, r4.serial, r4.command, r4.simEnd], ["4e", "request", 0x1234, 0x0619, 0]);
  const s4 = decodeMc("D4 00 34 12 00 00 00 FF FF 03 00 09 00 00 00 05 00 41 42 43 44 45");
  assert.deepEqual([s4.frame, s4.dir, s4.serial, s4.endCode], ["4e", "response", 0x1234, 0]);
  const cmd = "061900000005ABCDE";
  const a4 = decodeMc(`54001234000000FF03FF00${h4(4 + cmd.length)}0010${cmd}`);
  assert.deepEqual([a4.frame, a4.code, a4.serial, a4.simEnd], ["4e", "ascii", 0x1234, 0]);
  const a4r = decodeMc(`D4001234000000FF03FF00${h4(13)}00000005ABCDE`);
  assert.deepEqual([a4r.dir, a4r.serial], ["response", 0x1234]);
});

test("오류 응답 — 종료 코드·오류 정보 (mc.rs error_response_shape)", () => {
  const e = decodeMc("D0 00 00 FF FF 03 00 0B 00 59 C0 00 FF FF 03 00 01 01 00 00", { lang: "en" }); // 다른 기기의 응답 모양(0101 을 지원하지 않는 상대)
  assert.deepEqual([e.endCode, e.command, e.sub], [0xc059, 0x0101, 0]);
  assert.equal(field(e, "End code"), "C059 wrong command/subcommand");
  assert.equal(field(e, "Error info — I/O No."), "03FF");
  const a = decodeMc("D00000FF03FF000016C05100FF03FF0004010000", { lang: "en" });
  assert.deepEqual([a.code, a.endCode, a.command, a.sub], ["ascii", 0xc051, 0x0401, 0]);
  assert.equal(field(a, "Response data length"), "22 characters — matches what follows");
});

test("PLC Simulator 가 답할 종료 코드 (mc.rs point_limits·length_and_data_errors·iq_r_subcommands)", () => {
  const rd = (sub: number, code: number, start: number, n: number) => b3([0x01, 0x04, sub, 0x00, start & 0xff, (start >> 8) & 0xff, start >> 16, code, ...le2(n)]);
  const end = (s: string) => decodeMc(s).simEnd;
  assert.equal(end(rd(0, 0xa8, 0, 960)), 0);
  assert.equal(end(rd(0, 0xa8, 0, 961)), 0xc051);
  assert.equal(end(rd(0, 0xa8, 0, 0)), 0xc051);
  assert.equal(end(rd(1, 0x90, 0, 7168)), 0);
  assert.equal(end(rd(1, 0x90, 0, 7169)), 0xc052);
  assert.equal(end(rd(1, 0xa8, 0, 1)), 0xc05b);
  assert.equal(end(rd(0, 0x77, 0, 1)), 0xc05b);
  assert.equal(end(rd(0x80, 0xa8, 0, 1)), 0xc059);
  // 길이 칸 +1 → C057
  const bad = decodeMc("50 00 00 FF FF 03 00 0A 00 10 00 19 06 00 00 01 00 41");
  assert.equal(bad.simEnd, 0xc057);
  assert.ok(bad.notes.some((n) => n.includes("(10)")));
  assert.equal(end(b3([0x01, 0x14, 0x00, 0x00, 0, 0, 0, 0xa8, 0x02, 0x00, 0x01, 0x00])), 0xc061);
  assert.equal(end(b3([0x01, 0x14, 0x00, 0x00, 0, 0, 0, 0xa8, 0x01, 0x00, 0x01, 0x00, 0x09])), 0xc061);
  assert.equal(end(b3([0x01, 0x14, 0x01, 0x00, 0, 0, 0, 0x90, 0x02, 0x00, 0x12])), 0xc060);
  assert.equal(end(b3([0x03, 0x04, 0x00, 0x00, 0x00, 0x00])), 0xc054);
  assert.equal(end(b3([0x02, 0x14, 0x01, 0x00, 189])), 0xc053);
  assert.equal(end(b3([0x19, 0x06, 0x00, 0x00, 0x00, 0x00])), 0xc05c);
  assert.equal(end(a3("04010000D*00000G0001")), 0xc050);
  // 16진 디바이스 X 는 번호도 16진, 10진 디바이스 D 에 «1F» 는 C050
  const x = decodeMc(a3("04010001X*00001F0001"), { lang: "en" });
  assert.deepEqual([x.simEnd, x.req?.start], [0, 0x1f]);
  assert.ok(field(x, "Head device")!.startsWith("X1F — "));
  assert.equal(end(a3("04010000D*00001F0001")), 0xc050);
  // 앞자리 0 대신 공백
  assert.equal(decodeMc(a3("04010000D      70001")).req?.start, 7);
  // 서브 0002·0003(번호 4바이트·코드 2바이트 / 코드 4글자·번호 8글자)
  const w = decodeMc(b3([0x01, 0x04, 0x02, 0x00, 0x64, 0x00, 0x00, 0x00, 0xa8, 0x00, 0x01, 0x00]));
  assert.deepEqual([w.simEnd, w.req?.dev?.name, w.req?.start], [0, "D", 100]);
  assert.deepEqual(items(decodeMc(a3ok("ABCD"), { pair: a3("04010002ZR**000000100001") })), [["ZR10", 0xabcd]]);
  assert.deepEqual(items(decodeMc(b3([0x02, 0x14, 0x03, 0x00, 0x01, 0x05, 0x00, 0x00, 0x00, 0x90, 0x00, 0x01, 0x00]))), [["M5", 1]]);
  assert.equal(end(b3([0x03, 0x04, 0x01, 0x00, 0x01, 0x00, 0, 0, 0, 0xa8])), 0xc059);
});

test("자동 판별 — HEX·ASCII 글자·HEX 로 적은 ASCII·띄어 쓴 ASCII", () => {
  const plain = a3("04010000D*0001000003");
  assert.equal(decodeMc(plain).code, "ascii");
  // 모두 16진 글자인 ASCII 응답도 길이 칸으로 가린다
  assert.equal(decodeMc(a3ok("12340002")).code, "ascii");
  const asHex = hex([...plain].map((c) => c.charCodeAt(0)));
  const fromHex = decodeMc(asHex);
  assert.deepEqual([fromHex.code, fromHex.command, fromHex.simEnd], ["ascii", 0x0401, 0]);
  const spaced = decodeMc("5000 00 FF 03FF 00 0012 0010 0619 0000 0002 AB");
  assert.deepEqual([spaced.code, spaced.command, spaced.simEnd], ["ascii", 0x0619, 0]);
  // 띄어쓰기 없는 소문자 HEX 도 이진으로
  assert.equal(decodeMc(b3([0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0xa8, 0x03, 0x00]).replace(/ /g, "").toLowerCase()).code, "binary");
  assert.throws(() => decodeMc("01 03 00 00 00 02 C4 0B"), /subheader|서브헤더/);
  assert.throws(() => decodeMc(a3("0401"), { mode: "binary" }));
  // 짝 요청이 다른 형식이면 쓰지 않는다
  const r = decodeMc(b3ok([0x34, 0x12]), { pair: a3("04010000D*0001000001") });
  assert.equal(r.items[0].addr, "#0");
});

test("요청 만들기 — 매뉴얼 예와 같은 프레임", () => {
  const u = buildRequest({ frame: "3e", code: "binary", op: "read-bits", dev: "M", start: 100, count: 8 });
  assert.equal(hex(u), b3([0x01, 0x04, 0x01, 0x00, 0x64, 0x00, 0x00, 0x90, 0x08, 0x00]));
  assert.equal(frameText(buildRequest({ frame: "3e", code: "ascii", op: "read-bits", dev: "M", start: 100, count: 8 }), "ascii"), a3("04010001M*0001000008"));
  assert.equal(frameText(buildRequest({ frame: "3e", code: "ascii", op: "read-words", dev: "TN", start: 100, count: 3 }), "ascii"), a3("04010000TN0001000003"));
  assert.equal(frameText(buildRequest({ frame: "3e", code: "ascii", op: "read-bits", dev: "X", start: 0x1f, count: 1 }), "ascii"), a3("04010001X*00001F0001"));
  assert.equal(
    hex(buildRequest({ frame: "3e", code: "binary", op: "write-words", dev: "D", start: 100, count: 3, values: [0x1995, 0x1202, 0x1130] })),
    b3([0x01, 0x14, 0x00, 0x00, 0x64, 0x00, 0x00, 0xa8, 0x03, 0x00, 0x95, 0x19, 0x02, 0x12, 0x30, 0x11]),
  );
  assert.equal(
    hex(buildRequest({ frame: "3e", code: "binary", op: "write-bits", dev: "M", start: 100, count: 8, values: [1, 1, 0, 0, 1, 1, 0, 0] })),
    b3([0x01, 0x14, 0x01, 0x00, 0x64, 0x00, 0x00, 0x90, 0x08, 0x00, 0x11, 0x00, 0x11, 0x00]),
  );
  assert.equal(frameText(buildRequest({ frame: "3e", code: "ascii", op: "write-bits", dev: "M", start: 100, count: 8, values: [1, 1, 0, 0, 1, 1, 0, 0] }), "ascii"), a3("14010001M*000100000811001100"));
  // 4E — 일련번호, 만든 프레임은 해석기로 되돌아온다
  const f4 = buildRequest({ frame: "4e", code: "binary", op: "read-words", dev: "D", start: 100, count: 3, serial: 0x1234 });
  assert.equal(hex(f4), "54 00 34 12 00 00 00 FF FF 03 00 0C 00 10 00 01 04 00 00 64 00 00 A8 03 00");
  const back = decodeMc(hex(f4));
  assert.deepEqual([back.frame, back.serial, back.req?.start, back.req?.n, back.simEnd], ["4e", 0x1234, 100, 3, 0]);
  const a4 = frameText(buildRequest({ frame: "4e", code: "ascii", op: "read-words", dev: "W", start: 0x100, count: 2, serial: 1 }), "ascii");
  assert.equal(a4, "54000001000000FF03FF000018001004010000W*0001000002");
  assert.throws(() => buildRequest({ frame: "3e", code: "binary", op: "read-bits", dev: "D", start: 0, count: 1 }));
  assert.throws(() => buildRequest({ frame: "3e", code: "binary", op: "read-words", dev: "D", start: 0, count: 961 }));
  assert.throws(() => buildRequest({ frame: "3e", code: "binary", op: "write-words", dev: "D", start: 0, count: 2, values: [1] }));
});

test("0.6.0 명령 — 블록·모니터·원격·형명 매뉴얼 예 (mc.rs read_block·write_block·monitor·remote·read_type_name)", () => {
  // 0406: D0~D3·W100~W107 워드 블록, M0~M31·M128~M159·B100~B12F 비트 블록
  const blockReq = b3([
    0x06, 0x04, 0x00, 0x00, 0x02, 0x03, 0x00, 0x00, 0x00, 0xa8, 0x04, 0x00, 0x00, 0x01, 0x00, 0xb4, 0x08, 0x00, 0x00, 0x00, 0x00, 0x90, 0x02, 0x00, 0x80, 0x00, 0x00, 0x90, 0x02, 0x00, 0x00, 0x01, 0x00, 0xa0, 0x03, 0x00,
  ]);
  const q = decodeMc(blockReq, { lang: "en" });
  assert.deepEqual([q.command, q.commandName, q.simEnd, q.req?.kind], [0x0406, "Read Block", 0, "read-block"]);
  assert.equal(field(q, "Word device blocks"), "2");
  assert.ok(field(q, "Bit block 3")!.includes("B100–B12F"));
  const resp = [0x08, 0x00, 0x30, 0x20, 0x45, 0x15, 0x00, 0x28, 0x70, 0x09, ...new Array(12).fill(0), 0x31, 0x01, 0x30, 0x20, 0x49, 0x48, 0xde, 0xc3, 0x00, 0x28, 0x70, 0x09, 0xaf, 0xb9, 0xaf, 0xb9];
  const r = items(decodeMc(b3ok(resp), { pair: blockReq }));
  assert.equal(r.length, 4 + 8 + 2 + 2 + 3);
  assert.deepEqual(r.slice(0, 4), [
    ["D0", 0x0008],
    ["D1", 0x2030],
    ["D2", 0x1545],
    ["D3", 0x2800],
  ]);
  assert.deepEqual(r.slice(11), [
    ["W107", 0x0131],
    ["M0–M15", 0x2030],
    ["M16–M31", 0x4849],
    ["M128–M143", 0xc3de],
    ["M144–M159", 0x2800],
    ["B100–B10F", 0x0970],
    ["B110–B11F", 0xb9af],
    ["B120–B12F", 0xb9af],
  ]);
  const qa = decodeMc(a3("040600000203D*0000000004W*0001000008M*0000000002M*0001280002B*0001000003"));
  assert.deepEqual([qa.code, qa.simEnd], ["ascii", 0]);
  // 1406 ASCII — 블록마다 값
  const wr = decodeMc(a3(["140600000203", "D*0000000004", "0008203015452800", "W*0001000008", "0970", "0000".repeat(6), "0131", "M*0000000002", "20304849", "M*0001280002", "C3DE2800", "B*0001000003", "0970B9AFB9AF"].join("")), { lang: "en" });
  assert.deepEqual([wr.commandName, wr.simEnd, wr.items.length], ["Write Block", 0, 19]);
  // 블록 한도·종류
  const end = (s: string) => decodeMc(s).simEnd;
  assert.equal(end(b3([0x06, 0x04, 0x00, 0x00, 0x00, 0x00])), 0xc051);
  assert.equal(end(b3([0x06, 0x04, 0x00, 0x00, 0x01, 0x00, 0, 0, 0, 0xa8, 0xc0, 0x03])), 0);
  assert.equal(end(b3([0x06, 0x04, 0x00, 0x00, 0x02, 0x00, 0, 0, 0, 0xa8, 0xc0, 0x03, 0, 0, 0, 0xa8, 0x01, 0x00])), 0xc051);
  assert.equal(end(b3([0x06, 0x04, 0x00, 0x00, 0x01, 0x00, 0, 0, 0, 0x90, 1, 0])), 0xc05b);
  // 0801·0802 — 0403 예와 같은 디바이스, 실행 응답은 0403 모양(짝 없이 워드로)
  const entry = decodeMc(b3([0x01, 0x08, 0x00, 0x00, 0x04, 0x03, 0x00, 0x00, 0x00, 0xa8, 0x00, 0x00, 0x00, 0xc2, 0x64, 0x00, 0x00, 0x90, 0x20, 0x00, 0x00, 0x9c, 0xdc, 0x05, 0x00, 0xa8, 0x60, 0x01, 0x00, 0x9d, 0x57, 0x04, 0x00, 0x90]), { lang: "en" });
  assert.deepEqual([entry.commandName, entry.simEnd, entry.req?.kind], ["Entry Monitor Device", 0, "monitor-entry"]);
  assert.equal(end(a3("080100000100TS000000")), 0xc05b);
  const run = decodeMc(a3("08020000"), { lang: "en" });
  assert.deepEqual([run.commandName, run.simEnd], ["Execute Monitor", 0]);
  assert.ok(run.notes.some((n) => n.includes("C05D")));
  assert.equal(decodeMc("D0 00 00 FF FF 03 00 0B 00 5D C0 00 FF FF 03 00 02 08 00 00", { lang: "en" }).endCode, 0xc05d);
  // 원격 조작(5.6 예)
  const remote = (s: string) => {
    const d = decodeMc(s, { lang: "en" });
    return [d.commandName, d.simEnd];
  };
  assert.deepEqual(remote(b3([0x01, 0x10, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00])), ["Remote Run", 0]);
  assert.deepEqual(remote(a3("1001000000010200")), ["Remote Run", 0]);
  assert.deepEqual(remote(b3([0x02, 0x10, 0x00, 0x00, 0x01, 0x00])), ["Remote Stop", 0]);
  assert.deepEqual(remote(a3("100300000001")), ["Remote Pause", 0]);
  assert.deepEqual(remote(b3([0x05, 0x10, 0x00, 0x00, 0x01, 0x00])), ["Remote Latch Clear", 0]);
  assert.deepEqual(remote(a3("100600000001")), ["Remote Reset", 0]);
  assert.equal(end(b3([0x01, 0x10, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00])), 0xc05c);
  assert.equal(end(b3([0x02, 0x10, 0x01, 0x00, 0x01, 0x00])), 0xc059);
  assert.equal(end(b3([0x02, 0x10, 0x00, 0x00])), 0xc061);
  // 0101 형명 읽기 — 매뉴얼 예 Q02UCPU·0263
  const tn = b3([0x01, 0x01, 0x00, 0x00]);
  assert.deepEqual([decodeMc(tn, { lang: "en" }).commandName, decodeMc(tn).simEnd], ["Read Type Name", 0]);
  const tr = decodeMc(b3ok([...Array.from("Q02UCPU         ", (c) => c.charCodeAt(0)), 0x63, 0x02]), { pair: tn, lang: "en" });
  assert.equal(field(tr, "Model name"), '"Q02UCPU"');
  assert.equal(field(tr, "Model code"), "0263");
  const tra = decodeMc(a3ok("Q02UCPU         0263"), { pair: a3("01010000"), lang: "en" });
  assert.equal(field(tra, "Model code"), "0263");
});
