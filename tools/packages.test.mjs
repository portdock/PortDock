// node --test tools/packages.test.mjs
// winget·Scoop 매니페스트 생성(tools/winget.mjs·scoop.mjs)을 가짜 SHA256SUMS 로 시험한다 — 내려받기·제출 없음.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";
import YAML from "yaml";
import { ROOT, readApps, readMatrix, parseSums } from "./release-assets.mjs";
import * as winget from "./winget.mjs";
import * as scoop from "./scoop.mjs";

const apps = readApps();
const version = apps[0].version;
const hex = (i) => i.toString(16).padStart(2, "0").repeat(32);
// release.yml 과 같은 파일 이름 30개 + sha256sum 형식(공백 둘, 이름순)
const names = apps.flatMap((a) => ["setup.exe", "setup-offline.exe", "portable.zip"].map((s) => `PortDock-${a.asset}-${s}`)).sort();
const sumsText = names.map((n, i) => `${hex(i + 1)}  ${n}`).join("\n") + "\n";
const sums = parseSums(sumsText);

// winget 스키마(1.12.0)의 PackageIdentifier 패턴
const ID_RE = /^[^.\s\\/:*?"<>|\x01-\x1f]{1,32}(\.[^.\s\\/:*?"<>|\x01-\x1f]{1,32}){1,7}$/;

test("앱 10개 — release.yml matrix 와 같고, 모든 앱이 같은 버전", () => {
  assert.equal(apps.length, 10);
  assert.deepEqual(apps.map((a) => a.asset), readMatrix().map((m) => m.asset));
  for (const a of apps) assert.equal(a.version, version);
});

test("패키지 ID = PortDock.<App>, 겹치지 않고 스키마 패턴에 맞음", () => {
  const ids = apps.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.match(id, /^PortDock\.[A-Z][A-Za-z]+$/);
    assert.match(id, ID_RE);
  }
  assert.ok(ids.includes("PortDock.ModbusSlave") && ids.includes("PortDock.NetScan") && ids.includes("PortDock.SCPI") && ids.includes("PortDock.PortInspector"));
});

test("parseSums: 두 칸·별표(바이너리) 형식, 잘못된 줄은 오류", () => {
  const m = parseSums(`${"A".repeat(64)}  a.zip\r\n${"b".repeat(64)} *b.exe\n\n`);
  assert.equal(m.get("a.zip"), "a".repeat(64));
  assert.equal(m.get("b.exe"), "b".repeat(64));
  assert.throws(() => parseSums("abc  x.zip"));
});

test("winget: 패키지마다 파일 4개, 폴더 = manifests/p/PortDock/<App>/<버전>", () => {
  const files = winget.buildAll(apps, version, sums);
  assert.equal(Object.keys(files).length, apps.length * 4);
  for (const a of apps) {
    const dir = `manifests/p/PortDock/${a.id.slice("PortDock.".length)}/${version}`;
    for (const suffix of ["", ".locale.en-US", ".locale.ko-KR", ".installer"]) assert.ok(files[`${dir}/${a.id}${suffix}.yaml`], `${dir}/${a.id}${suffix}.yaml`);
  }
});

test("winget: YAML 로 읽히고 필수 칸·버전 주소·해시·무인 설치(/S)·사용자 범위", () => {
  const files = winget.buildAll(apps, version, sums, { date: "2026-11-01" });
  for (const a of apps) {
    const dir = `manifests/p/PortDock/${a.id.slice(9)}/${version}/${a.id}`;
    const v = YAML.parse(files[`${dir}.yaml`]);
    const en = YAML.parse(files[`${dir}.locale.en-US.yaml`]);
    const ko = YAML.parse(files[`${dir}.locale.ko-KR.yaml`]);
    const ins = YAML.parse(files[`${dir}.installer.yaml`]);
    for (const d of [v, en, ko, ins]) {
      assert.equal(d.PackageIdentifier, a.id);
      assert.equal(d.PackageVersion, version);
      assert.equal(d.ManifestVersion, winget.MANIFEST_VERSION);
    }
    assert.equal(v.ManifestType, "version");
    assert.equal(v.DefaultLocale, "en-US");
    assert.equal(en.ManifestType, "defaultLocale");
    assert.equal(ko.ManifestType, "locale");
    for (const k of ["Publisher", "PackageName", "License", "ShortDescription"]) assert.ok(en[k], k);
    assert.equal(en.Publisher, "PortDock");
    assert.equal(en.PackageName, a.name);
    assert.equal(en.License, "GPL-3.0-only");
    assert.ok(en.Tags.length > 0 && en.Tags.length <= 16 && en.Tags.every((t) => /^[a-z0-9-]+$/.test(t) && t.length <= 40));
    assert.ok(en.ShortDescription.length <= 256 && ko.ShortDescription.length <= 256);
    assert.match(ko.ShortDescription, /[가-힣]/);
    assert.equal(ins.ManifestType, "installer");
    assert.equal(ins.InstallerType, "nullsoft");
    assert.equal(ins.Scope, "user");
    assert.equal(ins.InstallerSwitches.Silent, "/S");
    assert.equal(ins.InstallerSwitches.SilentWithProgress, "/S");
    assert.equal(ins.ReleaseDate, "2026-11-01");
    assert.equal(ins.Installers.length, 1);
    const i0 = ins.Installers[0];
    assert.equal(i0.Architecture, "x64");
    const file = `PortDock-${a.asset}-setup.exe`;
    // latest/download 가 아니라 버전이 든 주소(해시가 고정되게)
    assert.equal(i0.InstallerUrl, `https://github.com/portdock/PortDock/releases/download/v${version}/${file}`);
    assert.equal(i0.InstallerSha256, sums.get(file).toUpperCase());
    assert.match(i0.InstallerSha256, /^[0-9A-F]{64}$/);
    for (const d of [en, ko]) for (const [k, val] of Object.entries(d)) if (/Url$/.test(k)) assert.match(val, /^https:\/\//, k);
  }
});

test("winget: SHA256SUMS 에 설치판이 없거나 버전이 다르면 멈춤", () => {
  const partial = new Map([...sums].filter(([n]) => n !== "PortDock-Plot-setup.exe"));
  assert.throws(() => winget.buildAll(apps, version, partial), /PortDock-Plot-setup\.exe/);
  assert.throws(() => winget.buildAll(apps, "9.9.9", sums), /9\.9\.9/);
});

test("Scoop: 앱마다 JSON, 휴대판 zip 주소·해시·persist·autoupdate", () => {
  const files = scoop.buildAll(apps, version, sums);
  assert.equal(Object.keys(files).length, apps.length);
  for (const a of apps) {
    const m = JSON.parse(files[`bucket/portdock-${a.app}.json`]);
    const zip = `PortDock-${a.asset}-portable.zip`;
    assert.equal(m.version, version);
    assert.equal(m.architecture["64bit"].url, `https://github.com/portdock/PortDock/releases/download/v${version}/${zip}`);
    assert.equal(m.architecture["64bit"].hash, sums.get(zip));
    assert.equal(m.license.identifier, "GPL-3.0-only");
    assert.equal(m.persist, "portdock-data");
    assert.deepEqual(m.shortcuts, [[`PortDock ${a.asset}.exe`, a.name]]);
    assert.equal(m.checkver.github, "https://github.com/portdock/PortDock");
    // autoupdate 주소에 버전 변수를 넣으면 지금 주소와 같아야 함
    assert.equal(m.autoupdate.architecture["64bit"].url.replace("$version", version), m.architecture["64bit"].url);
    assert.equal(m.autoupdate.hash.url, "$baseurl/SHA256SUMS.txt");
  }
  // Scoop 기본 정규식(위키 «App Manifest Autoupdate»)이 sha256sum 줄에서 그 zip 의 해시만 고르는지
  for (const a of apps) {
    const base = `PortDock-${a.asset}-portable.zip`;
    const re = new RegExp(`([a-fA-F0-9]{32,128})[\\x20\\t]+.*${base.replace(/[.]/g, "\\.")}(?:[\\x20\\t]+\\d+)?`);
    assert.equal(re.exec(sumsText)[1], sums.get(base));
  }
});

test("휴대판 zip 안의 exe 이름 = release.yml 이 복사하는 이름", () => {
  const yml = fs.readFileSync(path.join(ROOT, ".github", "workflows", "release.yml"), "utf8");
  assert.match(yml, /\$stage\/PortDock \$\{\{ matrix\.asset \}\}\.exe/);
  // 그래서 exe = "PortDock <asset>.exe"(Modbus-Slave·Net-Scan 은 하이픈 그대로) — Scoop 바로 가기가 이 이름을 가리켜야 함
  for (const a of apps) assert.equal(a.exe, `PortDock ${a.asset}.exe`);
});

test("명령줄: --sums 파일로 두 스크립트가 파일을 만든다", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "portdock-pkg-"));
  try {
    const sumsFile = path.join(tmp, "SHA256SUMS.txt");
    fs.writeFileSync(sumsFile, sumsText);
    for (const s of ["winget.mjs", "scoop.mjs"]) execFileSync(process.execPath, [path.join(ROOT, "tools", s), "--version", version, "--sums", sumsFile, "--out", tmp], { stdio: "pipe" });
    assert.ok(fs.existsSync(path.join(tmp, "winget", "manifests", "p", "PortDock", "Serial", version, "PortDock.Serial.installer.yaml")));
    assert.ok(fs.existsSync(path.join(tmp, "scoop", "bucket", "portdock-modbus-master.json")));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
