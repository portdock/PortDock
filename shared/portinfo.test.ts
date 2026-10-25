// @ts-nocheck — 앱 tsconfig 에는 node 타입이 없다. 실행: node --test shared/portinfo.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { bundleJson, bundleText, comVerdict, deviceVerdict, echoVerdict, historyVerdict, loopVerdict, powerVerdict, settingsVerdict, busyHint, guideUrl, fmtSpeed } from "./portinfo.ts";

const report = (o = {}) => ({
  entry: { port: "COM5", name: "USB Serial Port (COM5)", instanceId: "FTDIBUS\\VID_0403+PID_6001+A1\\0000", present: true, vid: 0x0403, pid: 0x6001, problem: null, class: "Ports" },
  readAt: 1,
  description: null,
  busDescription: "FT232R USB UART",
  manufacturer: "FTDI",
  location: null,
  hardwareIds: [],
  chip: { vendor: "FTDI", chip: "FT232R", clue: false },
  driver: { provider: "FTDI", version: "2.12.36.4", date: 1600000000000, inf: "oem5.inf", service: "FTSER2K" },
  status: { present: true, started: true, problem: null, disabled: false },
  lastArrival: 1,
  lastRemoval: null,
  firstInstall: null,
  ancestors: [],
  params: [{ name: "LatencyTimer", value: "16", kind: "dword", num: 16 }],
  portDefault: "9600,n,8,1",
  power: { usbSuspendAc: false, usbSuspendDc: false, devices: [] },
  errors: [],
  ...o,
});
const flags = { read: true, frame: false, parity: false, overrun: false, rxOver: false, break: false };

test("장치 — 문제 코드·연결 안 됨·단서", () => {
  assert.equal(deviceVerdict(report()).level, "ok");
  const p = deviceVerdict(report({ status: { present: true, started: false, problem: { code: 10, meaning: { ko: "시작 못함", en: "cannot start" }, action: { ko: "", en: "" } }, disabled: false }, entry: { ...report().entry, vid: 0x067b } }));
  assert.equal(p.level, "problem");
  assert.ok(p.notes.some((n) => /Prolific/.test(n.en)));
  assert.equal(deviceVerdict(report({ status: { present: false, started: false, problem: null, disabled: false } })).level, "look");
  assert.equal(deviceVerdict(report({ chip: { vendor: "FTDI", clue: true, note: { ko: "PID 0", en: "PID 0" } } })).level, "look");
  assert.equal(deviceVerdict(report({ entry: { ...report().entry, instanceId: "" } })).level, "unread");
});

test("설정·절전 — 지연 16ms 와 절전 켜짐은 «볼 것» 까지만", () => {
  assert.equal(settingsVerdict(report()).level, "look");
  assert.equal(settingsVerdict(report({ params: [{ name: "LatencyTimer", value: "2", kind: "dword", num: 2 }] })).level, "ok");
  assert.equal(settingsVerdict(report({ params: [], errors: ["Device Parameters: CONFIGRET 13"] })).level, "unread");
  assert.equal(powerVerdict(report()).level, "ok");
  assert.equal(powerVerdict(report({ power: { usbSuspendAc: true, usbSuspendDc: true, devices: [] } })).level, "look");
  assert.equal(powerVerdict(report({ power: { usbSuspendAc: null, usbSuspendDc: null, devices: [] } })).level, "unread");
});

test("기록·COM 번호", () => {
  const day = Date.UTC(2026, 9, 20, 3);
  const ev = (k, i) => ({ time: day + i * 60000, id: 410, provider: "Microsoft-Windows-Kernel-PnP", kind: k, level: 4, message: null, device: "x" });
  assert.equal(historyVerdict({ events: [ev("start", 0)], days: 30, errors: [] }).level, "ok");
  assert.equal(historyVerdict({ events: [ev("start", 0), ev("start", 1), ev("start", 2)], days: 30, errors: [] }).level, "look");
  assert.equal(historyVerdict({ events: [], days: 30, errors: ["System: denied"] }).level, "unread");
  assert.equal(historyVerdict(null).level, "unread");
  const c = { comdbFound: true, reserved: [3, 5, 20], present: [5], hidden: [], orphan: [3, 20], shared: [], serialcomm: ["COM5"], errors: [] };
  const v = comVerdict(c, "COM5");
  assert.equal(v.level, "ok");
  assert.ok(v.notes.some((n) => /2/.test(n.en)));
  assert.equal(comVerdict(c, "COM20").level, "look");
  assert.equal(comVerdict({ ...c, shared: [[5, ["a", "b"]]] }, "COM5").level, "problem");
});

test("루프백·에코", () => {
  const ok = { baud: 9600, sent: 256, received: 256, same: 256, changed: 0, lost: 0, extra: 0, rtt: { samples: 20, lost: 0, min: 1, median: 2, max: 3 }, flags, nothingBack: false };
  assert.equal(loopVerdict(ok).level, "ok");
  assert.equal(loopVerdict({ ...ok, lost: 3 }).level, "problem");
  assert.equal(loopVerdict({ ...ok, nothingBack: true }).level, "problem");
  assert.equal(loopVerdict({ ...ok, rtt: { ...ok.rtt, median: 16.2 } }).level, "look");
  assert.equal(loopVerdict({ ...ok, flags: { ...flags, frame: true } }).level, "look");
  const e = { baud: 9600, sent: 15, received: 15, echoed: true, partial: false, firstMs: 3, flags };
  assert.equal(echoVerdict(e).level, "look");
  assert.equal(echoVerdict({ ...e, echoed: false, received: 0 }).level, "ok");
});

test("결과 글 — 볼 수 없는 것을 늘 적고, 사용자 폴더를 가리며, 금지 낱말을 쓰지 않는다", () => {
  const b = { app: "PortDock Port Inspector", version: "0.1.0", report: report({ errors: ["C:\\Users\\kim\\x: denied"] }), com: null, events: null, nics: { nics: [{ name: "이더넷", description: "", up: true, speed: 1e8, fullDuplex: true, ipv4: ["192.168.0.2/24"], gateway: null }], errors: [] }, loop: [], echo: null, loopError: null };
  for (const lang of ["ko", "en"]) {
    const s = bundleText(lang, b);
    assert.ok(/A\/B/.test(s));
    assert.ok(!/Users\\kim/.test(s));
    assert.ok(!/진단|정상|검증|diagnos|verif/i.test(s), s);
  }
  assert.ok(/100 Mbps 전이중/.test(bundleText("ko", b)));
  const j = JSON.parse(bundleJson(b));
  assert.equal(j.report.entry.port, "COM5");
  assert.ok(!/kim/.test(bundleJson(b)));
  assert.match(busyHint("ko", "FTSER2K"), /Find Handle/);
  assert.equal(guideUrl("en", "rs485-wiring"), "https://portdock.dev/en/guides/rs485-wiring/");
  assert.equal(fmtSpeed(1e9), "1 Gbps");
});
