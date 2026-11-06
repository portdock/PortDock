// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/pcCheck.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { batteryHealth, BSOD_CODES_URL, bugcheckText, dur, eventsUnread, IOT_POLICY_URL, PC_ADMIN_ONLY, pcFailed, pcItems, pcLines, pcVerdict, restartLimited } from "./pcCheck.ts";
import { bundleText } from "./portinfo.ts";

const ft = (ms) => `T${ms}`;
const DAY = 86_400_000;
/** 이 PC 와 비슷한 값(사무용 기본값에 가까움): 빠른 시작 켜짐·최대 절전 켜짐·절전 30분·USB 절전 사용·정책 없음 */
const pc = (o = {}) => ({
  readAt: 1,
  days: 30,
  fastStartup: true,
  hibernateEnabled: true,
  scheme: "Balanced",
  power: [
    { id: "sleep", ac: 1800, dc: 900 },
    { id: "hibernate", ac: 0, dc: 0 },
    { id: "display", ac: 600, dc: 300 },
    { id: "aspm", ac: 0, dc: 2 },
    { id: "usbSuspend", ac: 1, dc: 1 },
  ],
  update: { noAutoUpdate: null, auOptions: null, noAutoReboot: null, alwaysAutoReboot: null, excludeDrivers: null, policyActiveHours: null, activeHours: [8, 17], smartActiveHours: 0 },
  rebootPending: [],
  screenSaver: { active: true, program: null, timeout: null, secure: null },
  time: { type: "NTP", ntpServer: "time.windows.com,0x9", policy: false, serviceStart: 3 },
  events: [],
  errors: [],
  ...o,
});
const item = (list, id) => list.find((i) => i.id === id);

test("값 글 — 초·정책", () => {
  assert.equal(dur(0).ko, "안 함");
  assert.equal(dur(900).en, "15 min");
  assert.equal(dur(5400).ko, "1시간 30분");
  assert.equal(dur(null).en, "not read");
  assert.equal(restartLimited({ auOptions: 3 }), true);
  assert.equal(restartLimited({ auOptions: 4 }), false);
  assert.equal(restartLimited({ noAutoReboot: 1 }), true);
  assert.equal(restartLimited({}), false);
});

test("일반 PC — 설정 값은 적기만, «볼 것» 은 기록(예기치 않은 종료·하드웨어)만", () => {
  const items = pcItems(pc(), "general", ft);
  assert.ok(items.every((i) => i.level === "ok"), JSON.stringify(items.filter((i) => i.level !== "ok")));
  assert.equal(pcVerdict(pc(), "general").level, "ok");
  const withEv = pc({ events: [{ group: "unexpected", provider: "Microsoft-Windows-Kernel-Power", id: 41, level: 1, count: 2, last: 5 * DAY }] });
  const u = item(pcItems(withEv, "general", ft), "unexpected");
  assert.equal(u.level, "look");
  assert.match(u.notes[0].ko, /정전·전원 버튼/);
  assert.match(u.value.en, /Kernel-Power 41: 2 · last T432000000/);
  // 재시작 대기는 일반 PC 면 적기만
  const rb = item(pcItems(pc({ rebootPending: ["windowsUpdate"] }), "general", ft), "rebootPending");
  assert.equal(rb.level, "ok");
  assert.equal(rb.notes.length, 1);
});

test("장비 PC — 빠른 시작·절전·USB 절전·자동 재시작·재시작 대기는 «볼 것» 까지만", () => {
  const items = pcItems(pc({ rebootPending: ["windowsUpdate", "fileRename"] }), "equipment", ft);
  for (const id of ["fastStartup", "sleep", "usbSuspend", "updatePolicy", "rebootPending"]) assert.equal(item(items, id).level, "look", id);
  for (const id of ["hibernate", "display", "aspm", "activeHours", "screenSaver", "time", "unexpected", "hardware"]) assert.equal(item(items, id).level, "ok", id);
  assert.ok(items.every((i) => i.level !== "problem"));
  assert.match(item(items, "sleep").notes[0].ko, /30분/);
  // 업데이트를 끄라고 하지 않는다
  assert.match(item(items, "updatePolicy").notes[0].ko, /업데이트를 끄라는 뜻은 아닙니다/);
  assert.equal(item(items, "updatePolicy").link, IOT_POLICY_URL);
  // 최대 절전이 꺼져 있으면 빠른 시작은 쓰이지 않는다 — «볼 것» 아님
  const hibOff = item(pcItems(pc({ hibernateEnabled: false }), "equipment", ft), "fastStartup");
  assert.equal(hibOff.level, "ok");
  assert.match(hibOff.value.ko, /쓰이지 않음/);
  // 다 맞춰 두면 문제 없음
  const tuned = pc({
    fastStartup: false,
    power: [
      { id: "sleep", ac: 0, dc: 900 },
      { id: "hibernate", ac: 0, dc: 0 },
      { id: "display", ac: 600, dc: 300 },
      { id: "aspm", ac: 0, dc: 0 },
      { id: "usbSuspend", ac: 0, dc: 1 },
    ],
    update: { ...pc().update, noAutoReboot: 1 },
  });
  assert.equal(pcVerdict(tuned, "equipment").level, "ok");
  // 정책으로 정한 사용 시간이 앞선다
  const ah = item(pcItems(pc({ update: { ...pc().update, policyActiveHours: [6, 22] } }), "equipment", ft), "activeHours");
  assert.equal(ah.value.ko, "6시–22시 (정책)");
});

test("시간 동기화 — 동기화 안 함·서비스 꺼짐·경고, 마지막 기록", () => {
  const ev = [
    { group: "time", provider: "Microsoft-Windows-Time-Service", id: 37, level: 4, count: 3, last: 100 },
    { group: "time", provider: "Microsoft-Windows-Time-Service", id: 36, level: 3, count: 2, last: 200 },
  ];
  const g = item(pcItems(pc({ events: ev }), "general", ft), "time");
  assert.equal(g.level, "ok");
  assert.match(g.notes.map((n) => n.ko).join("\n"), /이벤트 35·37\): T100/);
  assert.match(g.notes.map((n) => n.ko).join("\n"), /경고 2건/);
  assert.equal(item(pcItems(pc({ events: ev }), "equipment", ft), "time").level, "look");
  assert.equal(item(pcItems(pc({ time: { ...pc().time, type: "NoSync" } }), "equipment", ft), "time").level, "look");
  assert.equal(item(pcItems(pc({ time: { ...pc().time, serviceStart: 4 } }), "equipment", ft), "time").level, "look");
  assert.match(item(pcItems(pc(), "general", ft), "time").value.ko, /NTP 서버 · time\.windows\.com,0x9 · 서비스 수동/);
});

test("읽지 못함 — 전원 계획·이벤트 로그", () => {
  const p = pc({ power: [], errors: ["이벤트 로그 System: 액세스가 거부되었습니다."] });
  assert.equal(eventsUnread(p), true);
  const items = pcItems(p, "equipment", ft);
  assert.equal(item(items, "sleep").level, "unread");
  assert.equal(item(items, "unexpected").level, "unread");
  assert.equal(pcVerdict(null, "general").level, "unread");
  // 백엔드 호출이 실패하면 모든 항목이 «읽지 못함»(«없음» 으로 보이지 않게)
  const f = pcItems(pcFailed(30, "boom"), "equipment", ft);
  assert.ok(f.every((i) => i.level === "unread"), JSON.stringify(f.filter((i) => i.level !== "unread").map((i) => i.id)));
});

test("화면 보호기 — 경로 없는 이름, 잠금", () => {
  const s = item(pcItems(pc({ screenSaver: { active: true, program: "Mystify.scr", timeout: 600, secure: true } }), "equipment", ft), "screenSaver");
  assert.equal(s.level, "ok");
  assert.match(s.value.ko, /Mystify\.scr · 10분 뒤 · 다시 시작할 때 로그온 화면/);
  assert.match(item(pcItems(pc(), "general", ft), "screenSaver").value.ko, /없음/);
});

test("결과 글 — 항목·관리자만·볼 수 없는 것, 금지 낱말 없음", () => {
  const v = (x) => `[${x.level}]`;
  const lines = pcLines("ko", pc({ rebootPending: ["servicing"] }), "equipment", v, ft, (l) => l).join("\n");
  assert.match(lines, /용도: 장비 PC/);
  assert.match(lines, /### 전원·절전/);
  assert.match(lines, /- 빠른 시작: 켜짐 \[look\]/);
  assert.match(lines, /powercfg \/requests/);
  assert.match(lines, /PC 가 볼 수 없는 것\(이 PC 설정\)/);
  assert.equal(PC_ADMIN_ONLY.length, 5);
  const text = bundleText("en", { app: "PI", version: "0", report: null, com: null, events: null, nics: null, loop: [], echo: null, loopError: null, pc: pc(), pcPurpose: "equipment" });
  assert.match(text, /## This PC \(last 30 days\)/);
  assert.match(text, /Fast startup: on \[Worth a look\]/);
  assert.match(text, /Administrator only — not read/);
  for (const lang of ["ko", "en"])
    for (const purpose of ["general", "equipment"]) {
      const all = pcLines(lang, pc({ rebootPending: ["windowsUpdate", "fileRename"], events: [{ group: "hardware", provider: "disk", id: 7, level: 2, count: 1, last: 1 }] }), purpose, v, ft, (l) => l).join("\n");
      assert.doesNotMatch(all, /진단|검증|최적|정상|diagnos|verif|optimi/i);
    }
  // 읽지 않았으면 결과 글에 넣지 않는다
  assert.doesNotMatch(bundleText("ko", { app: "PI", version: "0", report: null, com: null, events: null, nics: null, loop: [], echo: null, loopError: null }), /이 PC \(/);
});

test("(0.10.0) 블루스크린·꺼짐·저장장치·깨어남·배터리", () => {
  const BAN = /진단|검증|최적|정상|원인 확정|고쳐 줍/;
  assert.equal(bugcheckText(0x50), "0x00000050 PAGE_FAULT_IN_NONPAGED_AREA");
  assert.equal(bugcheckText(0x12345), "0x00012345");
  const nvme = (h) => ({ index: 0, model: "Example NVMe SSD", bus: "nvme", state: "ok", error: null, health: { criticalWarning: 0, temperatureC: 42, availableSpare: 100, spareThreshold: 10, percentageUsed: 11, writtenGb: 30000, powerCycles: 900, powerOnHours: 4516, unsafeShutdowns: 37, mediaErrors: 0, ...h } });
  const data = pc({
    crashes: [
      { time: 3 * DAY, kind: "bugcheck", code: 0x50, params: "0x1, 0x0, 0x2, 0x3", dump: "MEMORY.DMP", powerButton: false },
      { time: 3 * DAY - 1000, kind: "kernelPower", code: 0x50, params: null, dump: null, powerButton: false },
      { time: 2 * DAY, kind: "unexpected", code: null, params: null, dump: null, powerButton: false },
    ],
    dumps: [{ name: "103126-1234-01.dmp", time: 3 * DAY, size: 2048 * 1024 }],
    dumpsRead: true,
    disks: [nvme({}), { index: 1, model: "Example SATA SSD", bus: "sata", state: "adminOnly", health: null, error: null }, nvme({ criticalWarning: 0x04, percentageUsed: 95 })].map((d, i) => ({ ...d, index: i })),
    wakes: [
      { time: 4 * DAY, sleepTime: 4 * DAY - 9000, source: "Device -USB Input Device", sourceType: 4, device: "USB Input Device", timerOwner: null },
      { time: 2 * DAY, sleepTime: null, source: "Power Button", sourceType: 1, device: null, timerOwner: null },
    ],
    batteries: [{ designMwh: 50000, fullMwh: 36000, cycles: 412 }],
  });
  const items = pcItems(data, "general", ft);
  const cr = item(items, "crashes");
  assert.equal(cr.level, "look");
  assert.equal(cr.link, BSOD_CODES_URL);
  assert.match(cr.notes[0].en, /PAGE_FAULT_IN_NONPAGED_AREA/);
  assert.match(cr.value.ko, /블루스크린 1번/);
  assert.match(item(items, "dumps").value.en, /1 file/);
  assert.equal(item(items, "disk-0").level, "ok");
  assert.match(item(items, "disk-0").value.ko, /사용률 11%/);
  assert.equal(item(items, "disk-1").level, "unread");
  assert.match(item(items, "disk-1").value.ko, /관리자만/);
  const bad = item(items, "disk-2");
  assert.equal(bad.level, "problem");
  assert.ok(bad.notes.some((n) => /신뢰성/.test(n.ko)) && bad.notes.some((n) => /95%/.test(n.ko)));
  const wk = item(items, "wakes");
  assert.equal(wk.level, "look");
  assert.match(wk.value.en, /2 · last T345600000 — Device -USB Input Device/);
  const bat = item(items, "battery-0");
  assert.equal(batteryHealth(data.batteries[0]), 72);
  assert.equal(bat.level, "look");
  assert.equal(bat.link, undefined);
  for (const i of items) for (const x of [i.value, ...i.notes]) assert.ok(!BAN.test(x.ko), x.ko);
  // 배터리가 없으면 카드 줄이 없다, 0.9 백엔드 모양(새 칸 없음)도 깨지지 않는다
  assert.equal(pcItems(pc(), "general", ft).filter((i) => i.group === "battery").length, 0);
  const lines = pcLines("ko", data, "general", (v) => `[${v.level}]`, ft, (l) => l).join("\n");
  assert.ok(lines.includes(BSOD_CODES_URL) && lines.includes("### 저장장치 수명") && lines.includes("### 배터리"));
  // 실패한 결과는 새 칸도 비어 있다
  const f = pcFailed(7, "x");
  assert.deepEqual([f.crashes, f.disks, f.wakes, f.batteries], [[], [], [], []]);
  assert.equal(item(pcItems(f, "general", ft), "crashes").level, "unread");
});
