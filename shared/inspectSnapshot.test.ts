// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/inspectSnapshot.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { compareSnapshots, makeSnapshot, parseSnapshot, portId, privateProp, snapDiffText } from "./inspectSnapshot.ts";

const SERIAL = "A1B2C3D4";
const entry = (o = {}) => ({
  port: "COM3",
  name: "USB Serial Port (COM3)",
  instanceId: `FTDIBUS\\VID_0403+PID_6001+${SERIAL}\\0000`,
  present: true,
  vid: 0x0403,
  pid: 0x6001,
  problem: null,
  class: "Ports",
  ...o,
});
const hops = (devPort = 2, hubPort = 3) => [
  {
    instanceId: `USB\\VID_0403&PID_6001\\${SERIAL}`,
    name: "USB Serial Converter",
    kind: "device",
    port: devPort,
    speed: "full",
    belowCapable: false,
    busPowered: null,
    ports: null,
  },
  {
    instanceId: "USB\\VID_05E3&PID_0610\\5&1",
    name: "Generic USB Hub",
    kind: "hub",
    port: hubPort,
    speed: "high",
    belowCapable: false,
    busPowered: true,
    ports: 4,
  },
  {
    instanceId: "USB\\ROOT_HUB30\\4&1",
    name: "USB Root Hub (USB 3.0)",
    kind: "root",
    port: null,
    speed: null,
    belowCapable: false,
    busPowered: null,
    ports: 10,
  },
];
const report = (e = entry(), o = {}) => ({
  entry: e,
  readAt: 1,
  description: null,
  busDescription: "FT232R USB UART",
  manufacturer: "FTDI",
  location: "Port_#0002.Hub_#0003",
  hardwareIds: [],
  chip: null,
  driver: {
    provider: "FTDI",
    version: "2.12.36.4",
    date: Date.UTC(2021, 6, 15),
    inf: "oem5.inf",
    service: "FTSER2K",
  },
  status: { present: true, started: true, problem: null, disabled: false },
  lastArrival: 1,
  lastRemoval: null,
  firstInstall: null,
  ancestors: [],
  params: [
    { name: "LatencyTimer", value: "16", kind: "dword", num: 16 },
    { name: "PortName", value: e.port, kind: "string" },
    {
      name: "SymbolicName",
      value: `\\??\\USB#VID_0403&PID_6001#${SERIAL}#{a5dcbf10}`,
      kind: "string",
    },
    { name: "Other", value: `x-${SERIAL}`, kind: "string" },
  ],
  portDefault: "9600,n,8,1",
  power: {
    usbSuspendAc: true,
    usbSuspendDc: true,
    devices: [
      {
        instanceId: `USB\\VID_0403&PID_6001\\${SERIAL}`,
        name: "USB Serial Converter",
        canTurnOff: false,
        own: true,
      },
    ],
  },
  usbPath: { hops: hops(), errors: [] },
  errors: [],
  ...o,
});
const prop = (name, raw, display = raw) => ({
  keyword: `*${name}`,
  name,
  display,
  raw,
  default: null,
  valid: [],
  min: null,
  max: null,
});
const nic = (o = {}) => ({
  name: "Ethernet 2",
  description: "Test Gigabit Adapter",
  up: true,
  speed: 1e9,
  fullDuplex: true,
  ipv4: ["192.168.0.10/24"],
  gateway: null,
  pnpId: "PCI\\VEN_8086&DEV_15B8\\3&11583659&0&FE",
  advanced: [prop("JumboPacket", "9014", "9KB MTU"), prop("EEE", "0", "Disabled")],
  canTurnOff: false,
  stats: {
    inPackets: 5,
    outPackets: 5,
    inErrors: 0,
    inDiscards: 0,
    outErrors: 0,
    outDiscards: 0,
  },
  profile: "private",
  network: "Plant-LAN",
  ...o,
});
const pc = (o = {}) => ({
  readAt: Date.UTC(2026, 9, 1),
  days: 30,
  fastStartup: false,
  hibernateEnabled: false,
  scheme: "High performance",
  power: [
    { id: "sleep", ac: 0, dc: 0 },
    { id: "hibernate", ac: 0, dc: 0 },
    { id: "display", ac: 600, dc: 300 },
    { id: "aspm", ac: 0, dc: 0 },
    { id: "usbSuspend", ac: 0, dc: 0 },
  ],
  update: {
    noAutoUpdate: null,
    auOptions: null,
    noAutoReboot: null,
    alwaysAutoReboot: null,
    excludeDrivers: null,
    policyActiveHours: null,
    activeHours: [8, 17],
    smartActiveHours: 0,
  },
  rebootPending: [],
  screenSaver: {
    active: true,
    program: ["C:", "Users", "someone", "saver.scr"].join("\\"),
    timeout: 600,
    secure: false,
  },
  time: {
    type: "NTP",
    ntpServer: "time.windows.com,0x9",
    policy: false,
    serviceStart: 3,
  },
  events: [],
  crashes: [],
  dumps: [],
  dumpsRead: true,
  disks: [
    {
      index: 0,
      model: "Test NVMe 512GB",
      bus: "nvme",
      state: "ok",
      health: {
        criticalWarning: 0,
        temperatureC: 40,
        availableSpare: 100,
        spareThreshold: 10,
        percentageUsed: 3,
        writtenGb: 1,
        powerCycles: 1,
        powerOnHours: 1,
        unsafeShutdowns: 0,
        mediaErrors: 0,
      },
      error: null,
    },
  ],
  wakes: [],
  batteries: [],
  errors: [],
  ...o,
});
const snap = (name, o = {}, at = Date.UTC(2026, 9, 1)) => {
  const e = o.entry ?? entry();
  return makeSnapshot(
    name,
    {
      entries: [e],
      reports: [o.report ?? report(e)],
      nics: { nics: [o.nic ?? nic()], errors: [] },
      pc: o.pc ?? pc(),
    },
    at,
    "0.10.0",
  );
};
const fields = (d) => d.changes.map((c) => `${c.change}|${c.field.ko}|${c.before.ko}→${c.after.ko}`);

test("스냅샷에 일련번호·네트워크 이름·사용자 폴더·통계가 들어가지 않는다", () => {
  const s = snap("기준");
  const json = JSON.stringify(s);
  assert.ok(!json.includes(SERIAL), "serial");
  assert.ok(!json.includes("FTDIBUS"), "instance id");
  assert.ok(!json.includes("Plant-LAN"), "network name");
  assert.ok(!json.includes("someone"), "user folder");
  assert.ok(!json.includes("inPackets"), "stats");
  assert.ok(!json.includes("3&11583659"), "pnp id");
  assert.equal(s.ports[0].id, "usb:0403:6001@3-2");
  assert.deepEqual(s.ports[0].params, { LatencyTimer: "16" });
  assert.equal(
    portId(
      entry({
        vid: null,
        pid: null,
        name: "Communications Port (COM1)",
        port: "COM1",
      }),
    ),
    "dev:ports:communications port",
  );
});

test("랜카드 «네트워크 주소»(MAC 직접 지정)는 저장본에 넣지 않고, 옛 파일에서도 뺀다", () => {
  const mac = "02005E100001";
  const n = nic({ advanced: [prop("JumboPacket", "9014", "9KB MTU"), { ...prop("NetworkAddress", mac), keyword: "NetworkAddress", name: "Network Address" }, { ...prop("X", "02-00-5E-10-00-02"), keyword: "LAA", name: "로컬 관리 주소" }] });
  const s = snap("a", { nic: n });
  const json = JSON.stringify(s);
  assert.ok(!json.includes(mac), "NetworkAddress");
  assert.ok(!json.includes("02-00-5E-10-00-02"), "MAC 모양 값");
  assert.ok(json.includes("9014"), "다른 속성은 남는다");
  // 옛 파일(속성이 들어 있음)을 불러와도 뺀다
  const old = { ...s, nics: [{ ...s.nics[0], props: { ...s.nics[0].props, "Network Address": [mac, mac] } }] };
  const back = parseSnapshot(JSON.stringify(old));
  assert.ok(!JSON.stringify(back).includes(mac));
  assert.equal(privateProp("*JumboPacket", "Jumbo Packet", "9014", "9KB MTU"), false);
  assert.equal(privateProp("NetworkAddress", "네트워크 주소", null, null), true);
});

test("바뀐 것 없음", () => {
  const d = compareSnapshots(snap("a"), snap("b"));
  assert.deepEqual(d.changes, []);
  assert.deepEqual(d.skipped, []);
  assert.match(snapDiffText("ko", snap("a"), snap("b"), d), /바뀐 것 없음/);
});

test("COM3 → COM7·드라이버 버전 바뀜(같은 USB 자리)", () => {
  const e = entry({ port: "COM7", name: "USB Serial Port (COM7)" });
  const r = report(e, {
    driver: {
      ...report().driver,
      version: "2.12.36.20",
      date: Date.UTC(2026, 3, 2),
    },
  });
  const d = compareSnapshots(snap("a"), snap("b", { entry: e, report: r }));
  const f = fields(d);
  assert.ok(f.includes("changed|COM 번호|COM3→COM7"), f.join("\n"));
  assert.ok(f.includes("changed|드라이버 버전|2.12.36.4→2.12.36.20"));
  assert.ok(f.some((x) => x.startsWith("changed|드라이버 날짜|2021-07-15→")));
  assert.equal(d.changes[0].target.ko, "COM7 · USB Serial Port");
});

test("다른 USB 포트에 꽂음 — VID:PID 가 하나뿐이면 같은 장치, USB 위치 바뀜", () => {
  const e = entry({ port: "COM8", name: "USB Serial Port (COM8)" });
  const r = report(e, { usbPath: { hops: hops(1, 4), errors: [] } });
  const d = compareSnapshots(snap("a"), snap("b", { entry: e, report: r }));
  const f = fields(d);
  assert.ok(f.includes("changed|COM 번호|COM3→COM8"));
  assert.ok(f.includes("changed|USB 위치(포트 사슬)|3-2→4-1"));
  assert.ok(!f.some((x) => x.startsWith("new|") || x.startsWith("gone|")));
});

test("새 장치·사라진 장치", () => {
  const other = entry({
    port: "COM4",
    name: "USB-SERIAL CH340 (COM4)",
    vid: 0x1a86,
    pid: 0x7523,
    instanceId: "USB\\VID_1A86&PID_7523\\5&2",
  });
  const s2 = makeSnapshot("b", { entries: [other], reports: [], nics: null, pc: null }, 2);
  const d = compareSnapshots(snap("a"), s2);
  const f = fields(d);
  assert.ok(f.includes("new|장치|—→1A86:7523"), f.join("\n"));
  assert.ok(f.some((x) => x.startsWith("gone|장치|0403:6001")));
  assert.deepEqual(d.skipped, ["nic", "pc"]);
});

test("랜카드 — 점보 프레임 꺼짐·절전 켜짐·IP 바뀜, 끊기면 속도·주소는 비교하지 않음", () => {
  const n2 = nic({
    advanced: [prop("JumboPacket", "1514", "Disabled"), prop("EEE", "0", "Disabled")],
    canTurnOff: true,
    ipv4: ["192.168.0.11/24"],
  });
  const f = fields(compareSnapshots(snap("a"), snap("b", { nic: n2 })));
  assert.ok(f.includes("changed|JumboPacket|9KB MTU (9014)→Disabled (1514)"), f.join("\n"));
  assert.ok(f.includes("changed|PC 가 끌 수 있음(절전)|아니요→예"));
  assert.ok(f.includes("changed|IPv4|192.168.0.10/24→192.168.0.11/24"));
  const down = fields(compareSnapshots(snap("a"), snap("b", { nic: nic({ up: false, speed: null, ipv4: [] }) })));
  assert.deepEqual(down, ["changed|연결|예→아니요"]);
});

test("이 PC — 절전 설정 바뀜·새 블루스크린·디스크 미디어 오류", () => {
  const later = Date.UTC(2026, 9, 20);
  const p2 = pc({
    readAt: later,
    power: pc().power.map((x) => (x.id === "sleep" ? { ...x, ac: 1800 } : x)),
    crashes: [
      {
        time: Date.UTC(2026, 9, 10),
        kind: "bugcheck",
        code: 0x50,
        params: null,
        dump: null,
        powerButton: false,
      },
    ],
    disks: [
      {
        ...pc().disks[0],
        health: { ...pc().disks[0].health, mediaErrors: 2, temperatureC: 55 },
      },
    ],
  });
  const d = compareSnapshots(snap("a"), snap("b", { pc: p2 }, later));
  const f = fields(d);
  assert.ok(
    f.some((x) => x.startsWith("changed|절전 모드") || x.startsWith("changed|절전")),
    f.join("\n"),
  );
  assert.ok(
    f.some((x) => /^new\|새 블루스크린·갑자기 꺼짐 기록\|—→.* 블루스크린 0x50$/.test(x)),
    f.join("\n"),
  );
  assert.ok(f.includes("changed|디스크 Test NVMe 512GB 미디어 오류|0→2"));
  // 온도는 비교하지 않는다
  assert.ok(!f.some((x) => /온도/.test(x)));
});

test("parseSnapshot — 저장한 글을 다시 읽고, 모양이 틀리면 null", () => {
  const s = snap("기준 1");
  assert.deepEqual(parseSnapshot("\uFEFF" + JSON.stringify(s)), s);
  assert.equal(parseSnapshot("{}"), null);
  assert.equal(parseSnapshot("nope"), null);
  const text = snapDiffText("en", s, s, { changes: [], skipped: ["pc"] });
  assert.match(text, /Not compared — not read on one side: This PC/);
});

test("비교 CSV", async () => {
  const { snapDiffCsv } = await import("./inspectSnapshot.ts");
  const e = entry({ port: "COM7", name: "USB Serial Port (COM7)" });
  const d = compareSnapshots(snap("a"), snap("b", { entry: e, report: report(e) }));
  const csv = snapDiffCsv("ko", d);
  assert.match(csv, /^change,area,item,value,before,after\r\n바뀜,COM 포트,COM7 · USB Serial Port,COM 번호,COM3,COM7\r\n$/);
});
