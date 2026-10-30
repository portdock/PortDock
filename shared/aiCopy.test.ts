// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/aiCopy.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { AI_MAX_CHARS, aiFrameLine, aiFrameLines, buildAiCopy, isPrivateIpv4, maskForAi, settingsLines } from "./aiCopy.ts";

const at = (h, m, s, ms) => new Date(2026, 9, 30, h, m, s, ms).getTime();

test("질문 틀 — 앱 언어를 따른다", () => {
  const ko = buildAiCopy({ lang: "ko", app: "PortDock Serial", version: "0.8.0", log: [] }).text;
  assert.match(ko.split("\n")[0], /^다음은 PortDock Serial 의 기록입니다\. 문제 원인 후보와 확인 순서를 알려 주세요\.$/);
  assert.match(ko, /## 상황/);
  assert.match(ko, /- PortDock Serial 0\.8\.0/);
  assert.match(ko, /\(기록 없음\)/);
  assert.doesNotMatch(ko, /Below is|Recent traffic/);
  const en = buildAiCopy({ lang: "en", app: "PortDock TCP", version: "0.8.0", log: [] }).text;
  assert.match(en.split("\n")[0], /^Below is a log from PortDock TCP\. Please list likely causes/);
  assert.doesNotMatch(en, /[가-힣]/, "영어 틀에 한글이 섞이지 않는다");
});

test("(10/31) 질문 틀 — 앱 성격별(통신·PC·장비 찾기·포트), 영어 틀엔 한글 없음", () => {
  const comm = buildAiCopy({ lang: "ko", app: "PortDock TCP" }).text;
  assert.match(comm, /장비 설정·배선/);
  const pc = buildAiCopy({ lang: "ko", app: "PortDock Hardware Tester", kind: "pc", checks: "x" }).text;
  assert.match(pc, /PC 점검 결과/);
  assert.match(pc, /무선\(Wi-Fi·블루투스\)/);
  assert.doesNotMatch(pc, /배선/);
  const scan = buildAiCopy({ lang: "ko", app: "PortDock Net Scan", kind: "scan", checks: "192.168.0.10" }).text;
  assert.match(scan, /찾은 네트워크 장비 목록/);
  assert.match(scan, /## 찾은 장비/);
  assert.doesNotMatch(scan, /## 점검 결과/);
  const port = buildAiCopy({ lang: "ko", app: "PortDock Port Inspector", kind: "port", checks: "COM3" }).text;
  assert.match(port, /포트 번호·드라이버/);
  for (const kind of ["comm", "pc", "scan", "port"]) assert.doesNotMatch(buildAiCopy({ lang: "en", app: "A", kind, checks: "x" }).text, /[가-힣]/, kind);
});

test("칸 — 상태·연결 설정·오류·점검 결과·통신 기록, 없는 칸은 빠진다", () => {
  const r = buildAiCopy({
    lang: "ko",
    app: "PortDock Port Inspector",
    version: "0.8.0",
    os: "windows x86_64",
    state: "COM5 · 볼 것",
    settings: settingsLines({ com: { port: "COM5", baud: 9600 }, empty: "", none: null }),
    errors: ["포트를 열 수 없음\n자세히"],
    checks: "장치: 문제 없음\n설정: 볼 것",
  });
  assert.match(r.text, /- 지금 상태: COM5 · 볼 것/);
  assert.match(r.text, /## 연결 설정\n- com: \{"port":"COM5","baud":9600\}\n/);
  assert.doesNotMatch(r.text, /empty|none/);
  assert.match(r.text, /## 이번 실행의 오류 \(1\)\n- 포트를 열 수 없음\n {2}자세히/);
  assert.match(r.text, /## 점검 결과\n```text\n장치: 문제 없음\n설정: 볼 것\n```/);
  assert.doesNotMatch(r.text, /최근 통신 기록/, "log 를 넘기지 않으면 기록 칸이 없다");
  assert.equal(r.cutLines, 0);
  assert.equal(r.cutText, false);
});

test("통신 기록 줄 — 시각 방향 상대 HEX | 글자 | 풀이, 사건 줄, 긴 프레임", () => {
  assert.equal(aiFrameLine({ ts: at(9, 5, 7, 42), dir: "tx", bytes: [0x41, 0x0d, 0x0a] }), "09:05:07.042 TX 41 0D 0A | A<CR><LF>");
  assert.equal(aiFrameLine({ ts: at(9, 5, 7, 42), dir: "rx", bytes: [1, 3], note: "FC03 응답", peer: "192.168.0.5:502" }), "09:05:07.042 RX 192.168.0.5:502 01 03 | <01><ETX> | FC03 응답");
  assert.equal(aiFrameLine({ ts: at(9, 5, 7, 42), dir: "ev", bytes: [], note: "연결됨" }), "09:05:07.042 EV 연결됨");
  const long = aiFrameLine({ ts: 0, dir: "rx", bytes: Array(100).fill(0x30) });
  assert.match(long, /…\(\+36 B\)/);
  assert.equal(aiFrameLines(Array.from({ length: 300 }, (_, i) => ({ ts: i, dir: "rx", bytes: [i & 255] }))).length, 200, "최근 200줄");
});

test("길이 상한 — 오래된 줄부터 빼고 뺀 수를 적는다", () => {
  const log = Array.from({ length: 500 }, (_, i) => `줄${String(i).padStart(3, "0")} ${"01 ".repeat(20)}`);
  const r = buildAiCopy({ lang: "ko", app: "PortDock Serial", log });
  assert.ok(r.text.length <= AI_MAX_CHARS, `${r.text.length}`);
  assert.ok(r.cutLines > 0 && r.cutLines < 500);
  assert.match(r.text, new RegExp(`오래된 줄 ${r.cutLines}개를 뺐습니다`));
  assert.match(r.text, /줄499/, "최근 줄은 남는다");
  assert.doesNotMatch(r.text, /줄000/, "가장 오래된 줄은 빠진다");
  // 한 줄 더 넣으면 넘친다 — 꽉 채웠는지
  const kept = 500 - r.cutLines;
  assert.match(r.text, new RegExp(`\\(${kept}줄\\)`));
  const en = buildAiCopy({ lang: "en", app: "PortDock Serial", log, max: 3000 });
  assert.ok(en.text.length <= 3000);
  assert.match(en.text, new RegExp(`${en.cutLines} older lines removed to fit 3,000 characters`));
});

test("길이 상한 — 기록을 다 빼도 넘치면 점검 결과 뒤를 자른다", () => {
  const r = buildAiCopy({ lang: "en", app: "PortDock Port Inspector", checks: "x".repeat(20000), log: ["a", "b"] });
  assert.ok(r.text.length <= AI_MAX_CHARS);
  assert.equal(r.cutText, true);
  assert.equal(r.cutLines, 2);
  assert.match(r.text, /…\(cut — too long\)/);
  assert.match(r.text, /Hidden by PortDock/, "끝 줄은 남는다");
});

test("울타리 — 글 안의 ``` 와 겹치지 않는다", () => {
  const r = buildAiCopy({ lang: "en", app: "A", checks: "a ``` b" });
  assert.match(r.text, /````text\na ``` b\n````/);
});

test("가림 — 사용자 폴더·PC 이름·MAC", () => {
  assert.equal(maskForAi("C:\\Users\\홍길동\\log.txt"), "~\\log.txt");
  assert.equal(maskForAi("on DESKTOP-AB12CD3 and laptop-9xyz"), "on [PC] and [PC]");
  assert.equal(maskForAi("\\\\FACTORY-PC7\\share\\a.csv"), "\\\\[PC]\\share\\a.csv");
  assert.equal(maskForAi("host LINE3-HMI ok", { names: ["LINE3-HMI"] }), "host [PC] ok");
  assert.equal(maskForAi("MAC 00:1A:2B:3C:4D:5E / 00-1a-2b-3c-4d-5e"), "MAC 00:1A:2B:xx:xx:xx / 00-1a-2b-xx-xx-xx");
  // HEX 기록(빈칸 구분)·시각은 건드리지 않는다
  assert.equal(maskForAi("12:34:56.789 RX 00 1A 2B 3C 4D 5E"), "12:34:56.789 RX 00 1A 2B 3C 4D 5E");
});

test("가림 — IP: 공인은 늘, 사설은 고를 때만. 같은 주소는 같은 번호", () => {
  assert.equal(maskForAi("PC 192.168.0.10 → PLC 192.168.1.5:502, 10.0.0.1, 172.16.3.4, 127.0.0.1"), "PC 192.168.0.10 → PLC 192.168.1.5:502, 10.0.0.1, 172.16.3.4, 127.0.0.1");
  assert.equal(maskForAi("dns 8.8.8.8, gw 203.0.113.7, again 8.8.8.8"), "dns [IP-1], gw [IP-2], again [IP-1]");
  assert.equal(maskForAi("a 192.168.0.10 b 8.8.8.8 c 192.168.0.10", { hideIp: "all" }), "a [IP-1] b [IP-2] c [IP-1]");
  // 버전·네 마디가 넘는 숫자는 IP 가 아니다
  assert.equal(maskForAi("v1.2.3.4 0.8.0 1.2.3.4.5 300.1.1.1"), "v1.2.3.4 0.8.0 1.2.3.4.5 300.1.1.1");
  // IPv6 — 루프백·링크 로컬은 남기고 나머지는 번호
  assert.equal(maskForAi("::1 fe80::1c2d:3e4f 2001:db8::7 2001:0db8:0000:0000:0000:ff00:0042:8329"), "::1 fe80::1c2d:3e4f [IP-1] [IP-2]");
  assert.equal(maskForAi("std::vector a::b"), "std::vector a::b");
  // 한 번의 buildAiCopy 안에서는 칸이 달라도 같은 번호
  const r = buildAiCopy({ lang: "en", app: "A", state: "to 8.8.4.4", log: ["RX 8.8.4.4:80 01"] });
  assert.match(r.text, /to \[IP-1\]/);
  assert.match(r.text, /RX \[IP-1\]:80 01/);
  assert.match(r.text, /public IP addresses/);
  assert.match(buildAiCopy({ lang: "ko", app: "A", hideIp: "all" }).text, /모든 IP 주소/);
});

test("사설 IP 판정", () => {
  for (const ip of ["10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.0.1", "127.0.0.1", "169.254.1.1", "100.64.0.1", "224.0.0.1", "255.255.255.255", "0.0.0.0"]) assert.equal(isPrivateIpv4(ip), true, ip);
  for (const ip of ["8.8.8.8", "172.15.0.1", "172.32.0.1", "192.169.0.1", "100.128.0.1", "1.1.1.1"]) assert.equal(isPrivateIpv4(ip), false, ip);
});
