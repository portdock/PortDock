// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/exposure.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { exposedPorts, exposeLines, exposureItems, pcWatchPort } from "./exposure.ts";
import { pcItems, pcVerdict } from "./pcCheck.ts";

const quiet = {
  rdpDeny: 1,
  rdpNla: 1,
  rdpPort: 3389,
  smb1Client: "absent",
  smb1Server: "absent",
  firewall: [
    { profile: "domain", enabled: true, current: false },
    { profile: "private", enabled: true, current: true },
    { profile: "public", enabled: true, current: false },
  ],
  listeners: [
    { port: 135, v6: false, pid: 1000, process: "svchost.exe" },
    { port: 445, v6: false, pid: 4 },
    { port: 445, v6: true, pid: 4 },
  ],
  listenersRead: true,
  autoLogon: false,
  autoLogonPassword: false,
  autoplayOff: true,
  autorunPolicy: null,
};
const item = (list, id) => list.find((i) => i.id === id);

test("Net Scan — 확인한 포트 가운데 인증 없는 산업 프로토콜·평문 관리 포트만", () => {
  assert.deepEqual(
    exposedPorts([443, 502, 80, 5025, 502, 44818]).map((p) => p.port),
    [80, 502, 44818],
  );
  assert.deepEqual(exposedPorts([443, 1883, 5025]), []);
  const ko = exposeLines([502, 102, 23, 80, 4840], "ko");
  assert.equal(ko.length, 4);
  assert.match(ko[0], /^102 S7 \(ISO-TSAP\) · 502 Modbus TCP — 산업 프로토콜 열림/);
  assert.match(ko[0], /인증 없음/);
  assert.match(exposeLines([5007], "en")[0], /MC protocol.*anyone on the same network/);
  assert.deepEqual(exposeLines([], "en"), []);
});

test("이 PC — 막혀 있으면 모두 «문제 없음(읽은 범위)»", () => {
  const items = exposureItems(quiet);
  assert.deepEqual(
    items.map((i) => i.id),
    ["rdp", "rdpNla", "smb1", "firewall", "listeners", "autoLogon", "autoplay"],
  );
  assert.ok(items.every((i) => i.level === "ok" && i.group === "exposure"), JSON.stringify(items.map((i) => [i.id, i.level])));
  // 445 는 IPv4·IPv6 둘이어도 한 번, System 이름
  assert.match(item(items, "listeners").value.ko, /^2개 — 135 \(svchost\.exe\), 445 \(System\)$/);
  // 0.9.x 백엔드(값 없음)는 빈 목록
  assert.deepEqual(exposureItems(undefined), []);
});

test("이 PC — 원격 데스크톱·NLA·SMBv1·방화벽·산업 포트·자동 로그온·자동 실행 «볼 것»", () => {
  const items = exposureItems({
    ...quiet,
    rdpDeny: 0,
    rdpNla: 0,
    smb1Server: "enabled",
    firewall: [{ profile: "public", enabled: false, current: true }],
    listeners: [...quiet.listeners, { port: 502, v6: false, pid: 2000, process: "gateway.exe" }, { port: 8080, v6: false, pid: 3000 }],
    autoLogon: true,
    autoLogonPassword: true,
    autoplayOff: false,
  });
  for (const id of ["rdp", "rdpNla", "smb1", "firewall", "listeners", "autoLogon", "autoplay"]) assert.equal(item(items, id).level, "look", id);
  assert.match(item(items, "rdp").value.en, /on \(port 3389\)/);
  assert.match(item(items, "listeners").notes[0].ko, /502 Modbus TCP\(gateway\.exe\)/);
  assert.ok(item(items, "listeners").notes.some((n) => /PID n/.test(n.ko)));
  assert.equal(item(items, "autoLogon").notes.length, 2);
  // 비밀번호 내용이 아니라 «있음» 만 말한다
  assert.match(item(items, "autoLogon").notes[1].en, /does not read its contents/);
  assert.match(item(items, "firewall").notes[0].ko, /지금 쓰는/);
});

test("이 PC — NLA 꺼짐은 원격 데스크톱이 켜졌을 때만 «볼 것», 정책이 막으면 자동 실행은 문제 없음, 읽지 못한 자동 로그온은 뺀다", () => {
  const items = exposureItems({ ...quiet, rdpNla: 0, autoplayOff: false, autorunPolicy: 0xff, autoLogon: null });
  assert.equal(item(items, "rdpNla").level, "ok");
  assert.equal(item(items, "autoplay").level, "ok");
  assert.equal(item(items, "autoplay").value.ko, "정책으로 막힘");
  assert.equal(item(items, "autoLogon"), undefined);
  const unread = exposureItems({ ...quiet, rdpDeny: null, rdpNla: null, smb1Client: null, smb1Server: null, firewall: [], listeners: [], listenersRead: false, autoplayOff: null });
  for (const id of ["rdp", "rdpNla", "smb1", "firewall", "listeners", "autoplay"]) assert.equal(item(unread, id).level, "unread", id);
  assert.match(item(unread, "smb1").notes[0].ko, /관리자만/);
});

test("PC 에선 HTTP 를 «볼 것» 으로 보지 않는다", () => {
  assert.equal(pcWatchPort(80), null);
  assert.equal(pcWatchPort(502).name, "Modbus TCP");
  assert.equal(pcWatchPort(445), null);
});

test("이 PC 카드 — 노출 묶음이 pcItems 끝에 붙고 판정에 들어간다", () => {
  const base = { readAt: 1, days: 30, fastStartup: false, hibernateEnabled: true, scheme: null, power: [], update: {}, rebootPending: [], screenSaver: {}, time: {}, events: [], errors: [] };
  const withX = pcItems({ ...base, exposure: { ...quiet, rdpDeny: 0 } }, "general", String);
  assert.equal(withX.at(-1).group, "exposure");
  assert.equal(pcVerdict({ ...base, exposure: { ...quiet, rdpDeny: 0 } }, "general", String).level, "look");
  assert.ok(!pcItems(base, "general", String).some((i) => i.group === "exposure"));
});
