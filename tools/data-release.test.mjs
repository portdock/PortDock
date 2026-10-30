// node --test tools/data-release.test.mjs
// 장비 맵 데이터 묶음 — 만든 all.json·장비 JSON 이 /data/schema.json(묶음 스키마)에 맞는지, 판·인용 문구·바뀐 점, llms-full.txt 크기 상한.
// 사이트 빌드 결과(site/dist)가 있으면 실제로 나간 파일도 같은 스키마로 본다(CI 는 빌드 전에 이 시험을 돌리므로 그땐 데이터에서 만든 것만).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { DATA_DIR, deviceFiles, loadSchema, validateSchema } from "./devices-check.mjs";
import { bundle, bundleSchema, changelog, citeText, dataRelease, versionLabel } from "../site/src/lib/dataRelease.ts";
import { devicesDigest } from "../site/src/lib/devicesExport.ts";

const devices = deviceFiles().map((f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), "utf8")));
const schema = bundleSchema(loadSchema(), "https://portdock.dev/data/schema.json");
const deviceRef = { $ref: "#/$defs/device" };
const HOME = "https://portdock.dev/devices/";
const dist = path.resolve(import.meta.dirname, "..", "site", "dist");
const built = fs.existsSync(path.join(dist, "devices", "all.json"));

test("all.json(데이터에서 만든 것)이 묶음 스키마에 맞는다", () => {
  const b = JSON.parse(JSON.stringify(bundle(devices, { home: HOME, schema: "https://portdock.dev/data/schema.json" })));
  assert.deepEqual(validateSchema(b, schema), []);
  assert.equal(b.devices.length, devices.length);
});

test("장비 파일 하나하나가 $defs/device 에 맞는다", () => {
  for (const d of devices) assert.deepEqual(validateSchema(d, deviceRef, schema), [], d.id);
});

test("묶음 스키마가 틀린 것을 잡는다 — 판 모양·모르는 키·출처의 판 없음", () => {
  const b = JSON.parse(JSON.stringify(bundle(devices.slice(0, 1), { home: HOME, schema: "https://x/schema.json" })));
  assert.match(validateSchema({ ...b, version: "v2026.10" }, schema).join(), /version/);
  assert.match(validateSchema({ ...b, extra: 1 }, schema).join(), /extra/);
  delete b.devices[0].sources[0].edition;
  assert.match(validateSchema(b, schema).join(), /«edition» 없음/);
});

test("판·기준일·해시·인용 문구", () => {
  const r = dataRelease(devices);
  assert.match(r.version, /^\d{4}\.\d{2}$/);
  assert.equal(r.version, r.date.slice(0, 7).replace("-", "."));
  assert.equal(r.date, devices.flatMap((d) => d.sources.map((s) => s.checked)).sort().pop());
  assert.match(r.contentHash, /^[0-9a-f]{12}$/);
  assert.equal(r.registers, devices.reduce((n, d) => n + d.registers.length, 0));
  // 순서가 달라도 같은 해시, 내용이 바뀌면 다른 해시
  assert.equal(dataRelease([...devices].reverse()).contentHash, r.contentHash);
  const changed = structuredClone(devices);
  changed[0].registers[0].name.en += " x";
  assert.notEqual(dataRelease(changed).contentHash, r.contentHash);
  // 같은 판 안의 고침을 가르도록 인용에는 판과 해시를 함께
  assert.equal(versionLabel(r), `v${r.version} · ${r.contentHash}`);
  assert.equal(citeText(r, HOME), `PortDock device register maps, v${r.version} · ${r.contentHash}, ${HOME}`);
  assert.notEqual(citeText(dataRelease(changed), HOME), citeText(r, HOME));
});

test("바뀐 점: 모든 장비가 «더함» 에 한 번씩, 최근 날짜가 먼저", () => {
  const log = changelog(devices);
  assert.deepEqual(log.flatMap((e) => e.added).sort(), devices.map((d) => d.id).sort());
  for (let i = 1; i < log.length; i++) assert.ok(log[i - 1].date > log[i].date);
  const two = structuredClone(devices[0]);
  two.sources.push({ ...two.sources[0], checked: "2099-01-02" });
  const l2 = changelog([two]);
  assert.deepEqual(l2[0], { date: "2099-01-02", version: "2099.01", added: [], rechecked: [two.id] });
});

test("llms-full.txt 장비 요약은 200KB 이하 — 넘으면 요약을 줄이거나 나눈다", () => {
  const body = devicesDigest(devices, (d) => ({ page: `https://portdock.dev/en/devices/${d.id}/`, json: `https://portdock.dev/devices/${d.id}.json`, md: `https://portdock.dev/devices/${d.id}.md` }));
  assert.ok(Buffer.byteLength(body) < 195 * 1024, `${Math.round(Buffer.byteLength(body) / 1024)}KB`);
  assert.equal(body.split("\n").filter((l) => /^ {2}- (HR|IR|CO|DI) \d+ /.test(l)).length, devices.reduce((n, d) => n + d.registers.length, 0));
});

test("빌드 결과(site/dist)의 all.json·장비 JSON 이 함께 나간 /data/schema.json 에 맞는다", { skip: !built && "site/dist 없음(빌드 전)" }, () => {
  const read = (p) => JSON.parse(fs.readFileSync(path.join(dist, p), "utf8"));
  const s = read("data/schema.json");
  const all = read("devices/all.json");
  assert.deepEqual(validateSchema(all, s), []);
  for (const d of all.devices) assert.deepEqual(validateSchema(read(`devices/${d.id}.json`), deviceRef, s), [], d.id);
  const v = read("data/version.json");
  assert.equal(v.contentHash, all.contentHash);
  assert.equal(v.citation, all.citation);
  assert.ok(fs.statSync(path.join(dist, "llms-full.txt")).size < 200 * 1024);
});
