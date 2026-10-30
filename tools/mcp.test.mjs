// node --test tools/mcp.test.mjs
// PortDock MCP 배포 파일(tools/mcp.mjs) — .mcpb manifest·레지스트리 server.json·Scoop 항목·release.yml 이 서로 맞는지. 내려받기·제출 없음.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { ROOT, parseSums } from "./release-assets.mjs";
import * as mcp from "./mcp.mjs";
import * as scoop from "./scoop.mjs";

const version = mcp.workspaceVersion();
const sha = "ab".repeat(32);

test("도구 목록 = crates/mcp/src/server.rs TOOL_NAMES(같은 순서), _sim 둘만 쓰기", () => {
  const src = fs.readFileSync(path.join(ROOT, "crates", "mcp", "src", "server.rs"), "utf8");
  const block = /TOOL_NAMES: \[&str; \d+\] = \[([^\]]+)\]/.exec(src)[1];
  const names = [...block.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
  assert.deepEqual(mcp.TOOLS.map((t) => t[0]), names);
  for (const [n, d] of mcp.TOOLS) assert.equal(n.endsWith("_sim"), !d.includes("read-only"), n);
  for (const [n, d] of mcp.TOOLS.filter(([n]) => n.endsWith("_sim"))) assert.match(d, /127\.0\.0\.1 only/, n);
});

test(".mcpb manifest: 0.3 · binary · Windows 전용 · 실행 파일 경로 · 버전", () => {
  const m = mcp.manifestFor(version);
  assert.equal(m.manifest_version, "0.3");
  for (const k of ["name", "version", "description", "author", "server"]) assert.ok(m[k], k);
  assert.equal(m.version, version);
  assert.equal(m.server.type, "binary");
  assert.equal(m.server.entry_point, "server/portdock-mcp.exe");
  assert.equal(m.server.mcp_config.command, "${__dirname}/server/portdock-mcp.exe");
  assert.equal(m.server.mcp_config.env.PORTDOCK_MCP_LANG, "${user_config.lang}");
  assert.equal(m.user_config.lang.default, "en");
  assert.deepEqual(m.compatibility.platforms, ["win32"]);
  assert.equal(m.license, "GPL-3.0-only");
  assert.equal(m.tools.length, 11);
  // 문구: «control» 같은 말 없이 읽기 전용
  const text = JSON.stringify(m);
  // «실장비 쓰기 도구 없음» 단정 대신 사실대로(판정은 주소로만 — 중계 프로그램 주의, docs/mcp.md 안전장치 1)
  assert.match(text, /127\.0\.0\.1/);
  assert.match(text, /check is by address only/);
  assert.doesNotMatch(text, /no tool that writes to real devices/);
  assert.doesNotMatch(text, /\bcontrol\b/i);
});

test("server.json: 레지스트리 형식(mcpb · 릴리스 주소 · sha · stdio), 이름 io.github.portdock", () => {
  const s = mcp.serverJsonFor(version, sha);
  assert.equal(s.$schema, mcp.SCHEMA);
  assert.equal(s.name, "io.github.portdock/portdock-mcp");
  assert.ok(s.description.length <= 100, s.description.length);
  const p = s.packages[0];
  assert.equal(p.registryType, "mcpb");
  assert.equal(p.identifier, `https://github.com/portdock/PortDock/releases/download/v${version}/PortDock-MCP.mcpb`);
  assert.match(p.identifier, /mcp/);
  assert.equal(p.fileSha256, sha);
  assert.deepEqual(p.transport, { type: "stdio" });
  assert.throws(() => mcp.serverJsonFor(version, "xyz"));
});

test("저장소의 server.json 초안 = 생성기 결과(해시 자리 0)", () => {
  const draft = JSON.parse(fs.readFileSync(path.join(ROOT, "crates", "mcp", "server.json"), "utf8"));
  assert.deepEqual(draft, mcp.serverJsonFor(version, "0".repeat(64)));
});

test("Scoop: SHA256SUMS 에 MCP zip 이 있을 때만 portdock-mcp.json(bin, persist 없음)", () => {
  const sums = parseSums(`${sha}  PortDock-MCP.zip\n${"cd".repeat(32)}  PortDock-MCP.mcpb\n`);
  const m = scoop.mcpManifest(version, sums);
  assert.equal(m.bin, "portdock-mcp.exe");
  assert.equal(m.persist, undefined);
  assert.equal(m.architecture["64bit"].url, `https://github.com/portdock/PortDock/releases/download/v${version}/PortDock-MCP.zip`);
  assert.equal(m.architecture["64bit"].hash, sha);
  assert.equal(m.autoupdate.architecture["64bit"].url.replace("$version", version), m.architecture["64bit"].url);
  assert.equal(Object.keys(scoop.buildAll([], version, sums)).join(), "bucket/portdock-mcp.json");
  assert.deepEqual(scoop.buildAll([], version, new Map()), {});
});

test("release.yml: MCP 빌드 작업이 zip·.mcpb 를 같은 이름으로 내고 릴리스에 올린다", () => {
  const yml = fs.readFileSync(path.join(ROOT, ".github", "workflows", "release.yml"), "utf8");
  assert.match(yml, /build-mcp:/);
  assert.match(yml, /cargo build --release --locked -p portdock-mcp/);
  assert.match(yml, /node tools\/mcp\.mjs manifest/);
  for (const f of [mcp.ZIP_FILE, mcp.MCPB_FILE]) {
    assert.ok(yml.includes(`out/${f}`), f);
    assert.ok(yml.includes(`dist/${f}`), f);
  }
  assert.match(yml, /needs: \[build, build-mcp\]/);
});
