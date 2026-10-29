// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/wireless.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { audioAlias, BT_DOC_URL, manyDisconnects, WIFI_LOCATION_URL, WL_CANNOT_SEE, wirelessFailed, wirelessJson, wirelessText, wlItems, wlVerdict } from "./wireless.ts";

const ft = (ms) => `T${ms}`;
const DAY = 86_400_000;
const drv = (o = {}) => ({ provider: "Example", version: "1.2.3", date: 1_700_000_000_000, inf: "oem1.inf", service: "ExWlan", ...o });
const hop = (o) => ({ instanceId: "X", name: "", kind: "device", port: null, speed: null, belowCapable: false, busPowered: null, ports: null, ...o });
/** 예시 PC: Wi-Fi 어댑터 하나(끊김 기록 조금)·USB 블루투스 라디오(루트 허브에 바로)·서비스 실행 중·오디오 없음 */
const w = (o = {}) => ({
  readAt: 1,
  days: 30,
  wifi: {
    adapters: [{ name: "Wi-Fi", description: "Example Wi-Fi 6 Adapter", connected: true, driver: drv(), problem: null, canTurnOff: false }],
    powerSaveAc: 0,
    powerSaveDc: 2,
    disconnects: [{ code: 0, reason: "The network is disconnected by the driver.", count: 2, last: 5 * DAY }],
    logRead: true,
    driverEvents: [],
    ...(o.wifi ?? {}),
  },
  bt: {
    radios: [{ name: "Example Bluetooth", vid: 0x8087, pid: 0x0029, driver: drv({ service: "BTHUSB" }), started: true, problem: null, canTurnOff: false, usbPath: { hops: [hop({ kind: "device", speed: "full" }), hop({ kind: "root", name: "Root" }), hop({ kind: "controller", name: "Ctl" })], errors: [] } }],
    services: [
      { name: "bthserv", found: true, state: "running", startType: 3 },
      { name: "BTAGService", found: true, state: "running", startType: 3 },
      { name: "BthAvctpSvc", found: true, state: "running", startType: 3 },
    ],
    events: [],
    logRead: true,
    audio: [],
    ...(o.bt ?? {}),
  },
  errors: o.errors ?? [],
  ...(o.failed ? { failed: true } : {}),
});
const item = (list, id) => list.find((i) => i.id === id);
const BAN = /진단|정상|검증|최적|diagnos|verif|optimi/i;

test("기본 — 걸리는 것 없음, «문제 있음» 은 쓰지 않는다", () => {
  const it = wlItems(w(), ft);
  assert.ok(it.every((i) => i.level !== "problem"));
  assert.equal(wlVerdict(w(), "wifi").level, "ok");
  assert.equal(wlVerdict(w(), "bt").level, "ok");
  assert.match(item(it, "wifiAdapter").value.ko, /연결됨/);
  assert.match(item(it, "wifiPowerPlan").value.en, /plugged in Maximum Performance · on battery Medium Power Saving/);
  assert.match(item(it, "wifiPowerPlan").notes[0].ko, /배터리일 때만/);
  assert.equal(item(it, "wifiDisconnects").level, "ok");
  assert.match(item(it, "wifiDisconnects").notes[0].en, /by the driver\. \(0\) — 2, last T432000000/);
  assert.equal(item(it, "btAudio").value.ko, "연결된 블루투스 오디오 장치 없음");
  assert.ok(it.every((i) => i.where.ko && i.where.en));
  // 근거 링크는 Microsoft 문서만
  assert.ok(it.filter((i) => i.link).every((i) => i.link === BT_DOC_URL || i.link === WIFI_LOCATION_URL));
  assert.ok(it.every((i) => !BAN.test(i.label.ko + i.value.ko + i.where.ko + i.notes.map((n) => n.ko + n.en).join() + i.label.en + i.value.en + i.where.en)));
});

test("Wi-Fi — 절전·잦은 끊김·드라이버 오류는 «볼 것»", () => {
  const x = w({
    wifi: {
      adapters: [{ name: "Wi-Fi", description: "A", connected: false, driver: drv(), problem: null, canTurnOff: true }],
      powerSaveAc: 2,
      powerSaveDc: 3,
      disconnects: [
        { code: 0, reason: "driver", count: 20, last: 2 },
        { code: 5, reason: "policy", count: 3, last: 9 },
      ],
      logRead: true,
      driverEvents: [
        { provider: "ExWlan", id: 6062, level: 3, count: 4, last: 3 },
        { provider: "ExWlan", id: 5002, level: 2, count: 1, last: 4 },
      ],
    },
  });
  const it = wlItems(x, ft);
  assert.equal(item(it, "wifiDevicePower").level, "look");
  assert.equal(item(it, "wifiPowerPlan").level, "look");
  assert.match(item(it, "wifiDisconnects").value.ko, /23건 · 마지막 T9/);
  assert.equal(item(it, "wifiDisconnects").level, "look");
  assert.equal(item(it, "wifiDriverEvents").level, "look");
  assert.match(item(it, "wifiDriverEvents").value.en, /ExWlan 6062: 4 · ExWlan 5002: 1/);
  assert.equal(wlVerdict(x, "wifi").level, "look");
  // 경고만이면 적기만
  const y = wlItems(w({ wifi: { ...x.wifi, driverEvents: [{ provider: "ExWlan", id: 6062, level: 3, count: 4, last: 3 }] } }), ft);
  assert.equal(item(y, "wifiDriverEvents").level, "ok");
  assert.match(item(y, "wifiDriverEvents").notes[0].ko, /경고 수준만/);
});

test("끊김 기준 — 평균 일주일에 5번 이상", () => {
  assert.equal(manyDisconnects(4, 7), false);
  assert.equal(manyDisconnects(5, 7), true);
  assert.equal(manyDisconnects(21, 30), false);
  assert.equal(manyDisconnects(22, 30), true);
  assert.equal(manyDisconnects(65, 90), true);
  assert.equal(manyDisconnects(0, 1), false);
});

test("어댑터·라디오 없음 — «없음» (CI 서버처럼)", () => {
  const x = w({ wifi: { adapters: [], powerSaveAc: null, powerSaveDc: null, disconnects: [], logRead: false, driverEvents: [] }, bt: { radios: [], services: [{ name: "bthserv", found: false, state: null, startType: null }], events: [], logRead: true, audio: [] } });
  const it = wlItems(x, ft);
  assert.deepEqual(
    it.map((i) => i.id),
    ["wifiAdapter", "btRadio"],
  );
  assert.ok(it.every((i) => i.level === "ok"));
  assert.match(item(it, "wifiAdapter").value.en, /^none/);
  assert.match(item(it, "btRadio").value.ko, /^없음/);
});

test("읽지 못함 — 호출 실패·로그 막힘", () => {
  const f = wirelessFailed(7, "boom");
  const it = wlItems(f, ft);
  assert.ok(it.every((i) => i.level === "unread"));
  assert.equal(wlVerdict(f, "wifi").level, "unread");
  assert.equal(wlVerdict(null, "bt").level, "unread");
  const x = w({ wifi: { logRead: false }, bt: { logRead: false }, errors: ["Event log System: denied"] });
  const it2 = wlItems(x, ft);
  assert.equal(item(it2, "wifiDisconnects").level, "unread");
  assert.equal(item(it2, "wifiDriverEvents").level, "unread");
  assert.equal(item(it2, "btEvents").level, "unread");
});

test("블루투스 — 절전·허브 경유·서비스 멈춤·오류 이벤트", () => {
  const x = w({
    bt: {
      radios: [
        {
          name: "Dongle",
          vid: 0x0a12,
          pid: 0x0001,
          driver: drv({ service: "BTHUSB" }),
          started: true,
          problem: null,
          canTurnOff: true,
          usbPath: { hops: [hop({ kind: "device", speed: "full" }), hop({ kind: "hub", name: "Generic USB Hub", speed: "high" }), hop({ kind: "root", name: "Root" }), hop({ kind: "controller", name: "Ctl" })], errors: [] },
        },
      ],
      services: [
        { name: "bthserv", found: true, state: "stopped", startType: 4 },
        { name: "BTAGService", found: true, state: "stopped", startType: 4 },
      ],
      events: [{ provider: "BTHUSB", id: 17, level: 2, count: 3, last: 7 }],
      logRead: true,
      audio: [],
    },
  });
  const it = wlItems(x, ft);
  assert.equal(item(it, "btDevicePower").level, "look");
  assert.equal(item(it, "btDevicePower").link, BT_DOC_URL);
  assert.equal(item(it, "btUsbPath").level, "look");
  assert.match(item(it, "btUsbPath").value.ko, /허브 Generic USB Hub \(High Speed/);
  assert.equal(item(it, "btService").level, "look");
  assert.match(item(it, "btService").value.en, /Bluetooth Support Service \(bthserv\): stopped · disabled/);
  assert.match(item(it, "btService").notes[1].ko, /오디오 게이트웨이/);
  assert.equal(item(it, "btEvents").level, "look");
  assert.equal(item(it, "btRadio").value.en, "Dongle · 0A12:0001 · driver started");
  // 루트 허브에 바로 붙은 라디오는 경로만 적는다
  assert.equal(item(wlItems(w(), ft), "btUsbPath").level, "ok");
  // 문제 코드 → «볼 것»(«문제 있음» 아님)
  const p = wlItems(w({ bt: { radios: [{ ...w().bt.radios[0], problem: { code: 43, meaning: { ko: "멈춤", en: "stopped" }, action: { ko: "", en: "" } } }] } }), ft);
  assert.equal(item(p, "btRadio").level, "look");
});

test("핸즈프리 — 기본 출력이면 «볼 것», 아니면 안내만", () => {
  const audio = [
    { name: "Headset (Example Buds Hands-Free AG Audio)", flow: "render", kind: "handsFree", defaultConsole: true, defaultComms: true },
    { name: "Headphones (Example Buds Stereo)", flow: "render", kind: "stereo", defaultConsole: false, defaultComms: false },
    { name: "Headset (Example Buds Hands-Free AG Audio)", flow: "capture", kind: "handsFree", defaultConsole: true, defaultComms: true },
  ];
  const it = wlItems(w({ bt: { audio } }), ft);
  assert.equal(item(it, "btAudio").level, "look");
  assert.match(item(it, "btAudio").notes[0].ko, /Example Buds Hands-Free AG Audio\) — 출력 · 핸즈프리\(통화용\) · 기본 장치, 기본 통신 장치/);
  const ok = wlItems(w({ bt: { audio: audio.map((a) => ({ ...a, defaultConsole: a.kind === "stereo" })) } }), ft);
  assert.equal(item(ok, "btAudio").level, "ok");
  assert.match(item(ok, "btAudio").notes.at(-1).en, /switches to hands-free/);
  // 같은 이름은 같은 번호
  assert.deepEqual([...audioAlias(audio).values()], [1, 2]);
});

test("결과 글·JSON — 장치 이름이 없고 볼 수 없는 것이 들어간다", () => {
  const audio = [{ name: "Headset (Alice's Buds Hands-Free AG Audio)", flow: "render", kind: "handsFree", defaultConsole: true, defaultComms: false }];
  const x = w({ bt: { audio }, errors: [] });
  for (const lang of ["ko", "en"]) {
    const s = wirelessText(lang, "PortDock Port Inspector", "0.5.0", x);
    assert.ok(!s.includes("Alice"));
    assert.ok(s.includes(lang === "ko" ? "장치 1 — 출력" : "Device 1 — output"));
    assert.ok(s.includes(lang === "ko" ? "## 블루투스 [볼 것]" : "## Bluetooth [Worth a look]"));
    assert.ok(s.includes(WL_CANNOT_SEE[0][lang]));
    assert.ok(s.includes("netsh wlan show wlanreport"));
    assert.ok(!BAN.test(s));
  }
  // 화면(가리지 않음)에는 이름이 보인다
  assert.match(item(wlItems(x, ft), "btAudio").notes[0].en, /Alice/);
  const j = JSON.parse(wirelessJson("PortDock Port Inspector", "0.5.0", x));
  assert.equal(j.wireless.bt.audio[0].name, "device-1");
  assert.ok(!JSON.stringify(j).includes("Alice"));
  assert.equal(j.wireless.wifi.adapters[0].description, "Example Wi-Fi 6 Adapter");
});
