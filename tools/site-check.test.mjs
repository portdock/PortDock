// node --test tools/site-check.test.mjs
// 사이트 빌드 결과의 릴리스 내려받기 링크 대조 — v0.7.0 에서 MCP 버튼이 앱 3종 이름(PortDock-MCP-setup.exe 등, 404)을 만든 일이 다시 없게.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { ROOT, readMatrix, releaseAssetNames } from "./release-assets.mjs";

test("릴리스 자산 이름 — 앱마다 3종 + MCP 2종 + SHA256SUMS", () => {
  const names = releaseAssetNames();
  assert.equal(names.length, readMatrix().length * 3 + 3);
  for (const n of ["PortDock-MCP.mcpb", "PortDock-MCP.zip", "SHA256SUMS.txt", "PortDock-Serial-setup.exe", "PortDock-Serial-setup-offline.exe", "PortDock-Serial-portable.zip"])
    assert.ok(names.includes(n), n);
  assert.ok(!names.includes("PortDock-MCP-setup.exe"));
});

test("site-check — 없는 릴리스 파일로 가는 링크를 잡는다(release.yml 기준·--assets 기준)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "site-check-"));
  try {
    fs.writeFileSync(path.join(dir, "robots.txt"), "User-agent: *\nSitemap: https://example.com/sitemap-index.xml\n");
    const dl = (n) => `<a href="https://github.com/portdock/PortDock/releases/latest/download/${n}">x</a>`;
    fs.writeFileSync(
      path.join(dir, "index.html"),
      `<html lang="ko"><head><title>t</title></head><body><h1>t</h1>${dl("PortDock-MCP.mcpb")}${dl("PortDock-MCP-setup.exe")}${dl("PortDock-Serial-setup.exe")}</body></html>`,
    );
    const assets = path.join(dir, "assets.txt");
    fs.writeFileSync(assets, "PortDock-MCP.mcpb\nPortDock-MCP.zip\n");
    const r = spawnSync(process.execPath, [path.join(ROOT, "tools", "site-check.mjs"), dir, "--assets", assets], { encoding: "utf8" });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /릴리스에 없는 내려받기 파일 PortDock-MCP-setup\.exe/);
    assert.doesNotMatch(r.stderr, /릴리스에 없는 내려받기 파일 PortDock-MCP\.mcpb/);
    assert.doesNotMatch(r.stderr, /릴리스에 없는 내려받기 파일 PortDock-Serial-setup\.exe/);
    assert.match(r.stderr, /실제 릴리스 자산에 없는 파일 PortDock-Serial-setup\.exe/);
    assert.doesNotMatch(r.stderr, /실제 릴리스 자산에 없는 파일 PortDock-MCP\.mcpb/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
