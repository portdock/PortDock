#!/usr/bin/env node
// 제3자 라이선스 고지(THIRD_PARTY_NOTICES.txt)를 만든다 — 새 의존성 없이 Node 만 쓴다.
//
//   node tools/notices.mjs            → 저장소 루트에 THIRD_PARTY_NOTICES.txt
//   node tools/notices.mjs --check    → 다시 만들어 보고, 지금 파일과 다르면 종료 코드 1
//
// 무엇을 담나
//  - Rust: `cargo metadata` 로 다섯 앱(portdock-*)에서 일반(normal) 의존성만 따라간 패키지.
//    빌드 전용(build)·개발 전용(dev) 의존성은 실행 파일에 들어가지 않으므로 뺀다. Windows x64 대상만.
//  - npm: apps/*/package.json 의 dependencies 와 그 dependencies 를 재귀로(화면 번들에 들어가는 것).
//  - 라이선스 종류별로 묶고, 종류마다 대표 본문 한 벌(로컬 레지스트리·node_modules 에서 찾음),
//    패키지마다 라이선스 파일에서 찾은 저작권 줄.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "THIRD_PARTY_NOTICES.txt");
const APPS = ["serial", "modbus-slave", "tcp", "udp", "simulator"];
const TARGET = "x86_64-pc-windows-msvc";

// ---------- Rust ----------
function cargoBin() {
  const local = path.join(os.homedir(), ".cargo", "bin", process.platform === "win32" ? "cargo.exe" : "cargo");
  return fs.existsSync(local) ? local : "cargo";
}

function rustPackages() {
  const raw = execFileSync(cargoBin(), ["metadata", "--format-version", "1", "--filter-platform", TARGET], {
    cwd: ROOT,
    maxBuffer: 256 * 1024 * 1024,
    encoding: "utf8",
  });
  const meta = JSON.parse(raw);
  const byId = new Map(meta.packages.map((p) => [p.id, p]));
  const nodes = new Map(meta.resolve.nodes.map((n) => [n.id, n]));
  const members = new Set(meta.workspace_members);
  const roots = meta.packages.filter((p) => members.has(p.id) && APPS.some((a) => p.name === `portdock-${a}`)).map((p) => p.id);
  if (roots.length !== APPS.length) throw new Error(`앱 패키지를 다 찾지 못했습니다: ${roots.length}/${APPS.length}`);

  const seen = new Set();
  const stack = [...roots];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const d of nodes.get(id)?.deps ?? []) {
      // dep_kinds 의 kind: null = normal, "build", "dev"
      if (d.dep_kinds.some((k) => k.kind === null)) stack.push(d.pkg);
    }
  }
  const out = [];
  for (const id of seen) {
    if (members.has(id)) continue; // 우리 코드(GPL-3.0)는 뺀다
    const p = byId.get(id);
    out.push({
      eco: "cargo",
      name: p.name,
      version: p.version,
      license: p.license || (p.license_file ? `SEE FILE ${p.license_file}` : "UNKNOWN"),
      repository: p.repository || p.homepage || "",
      dir: path.dirname(p.manifest_path),
    });
  }
  return out;
}

// ---------- npm ----------
function findPkgDir(name, fromDir) {
  // node 의 해석과 같은 순서: 가까운 node_modules 부터 위로
  let dir = fromDir;
  for (;;) {
    const cand = path.join(dir, "node_modules", name);
    if (fs.existsSync(path.join(cand, "package.json"))) return cand;
    const up = path.dirname(dir);
    if (up === dir || !up.startsWith(ROOT)) return null;
    dir = up;
  }
}

function npmLicense(pj) {
  if (typeof pj.license === "string") return pj.license;
  if (pj.license?.type) return pj.license.type;
  if (Array.isArray(pj.licenses)) return pj.licenses.map((l) => l.type ?? l).join(" OR ");
  return "UNKNOWN";
}

function npmRepo(pj) {
  const r = typeof pj.repository === "string" ? pj.repository : pj.repository?.url;
  if (!r) return pj.homepage || "";
  if (/^[\w.-]+\/[\w.-]+$/.test(r)) return `https://github.com/${r}`;
  return r.replace(/^git\+/, "").replace(/^git:\/\//, "https://").replace(/\.git$/, "");
}

function npmPackages() {
  const seen = new Map(); // dir → pkg
  const missing = new Set();
  const visit = (name, fromDir) => {
    const dir = findPkgDir(name, fromDir);
    if (!dir) {
      missing.add(name);
      return;
    }
    if (seen.has(dir)) return;
    const pj = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    seen.set(dir, { eco: "npm", name: pj.name, version: pj.version, license: npmLicense(pj), repository: npmRepo(pj), dir });
    for (const dep of Object.keys(pj.dependencies ?? {})) visit(dep, dir);
    // 선택(optional) 의존성은 설치된 것만 — 플랫폼별 바이너리 등
    for (const dep of Object.keys(pj.optionalDependencies ?? {})) if (findPkgDir(dep, dir)) visit(dep, dir);
  };
  for (const app of APPS) {
    const appDir = path.join(ROOT, "apps", app);
    const pj = JSON.parse(fs.readFileSync(path.join(appDir, "package.json"), "utf8"));
    for (const dep of Object.keys(pj.dependencies ?? {})) visit(dep, appDir);
  }
  if (missing.size) console.warn(`node_modules 에 없는 npm 패키지(먼저 npm install): ${[...missing].join(", ")}`);
  // 같은 이름·버전이 여러 곳에 깔려 있으면 하나만
  const uniq = new Map();
  for (const p of seen.values()) uniq.set(`${p.name}@${p.version}`, p);
  return [...uniq.values()];
}

// ---------- 라이선스 파일·본문 ----------
const LICENSE_FILE_RE = /^(licen[cs]e|copying|notice|unlicense|copyright)([-._].*)?$/i;

function licenseFiles(dir) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && LICENSE_FILE_RE.test(e.name))
      .map((e) => path.join(dir, e.name));
  } catch {
    return [];
  }
}

function read(f) {
  try {
    return fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
  } catch {
    return "";
  }
}

// 라이선스 식별자 → 본문을 알아보는 표지(대표 본문을 고를 때 씀)
const FAMILIES = {
  MIT: { file: /mit/i, has: ["Permission is hereby granted, free of charge"] },
  "Apache-2.0": { file: /apache/i, has: ["Apache License", "Version 2.0", "TERMS AND CONDITIONS"] },
  "MPL-2.0": { file: /./, has: ["Mozilla Public License Version 2.0"] },
  "Unicode-3.0": { file: /./, has: ["UNICODE LICENSE V3"] },
  "Unicode-DFS-2016": { file: /./, has: ["UNICODE, INC. LICENSE AGREEMENT"] },
  "BSD-3-Clause": { file: /./, has: ["Redistribution and use in source and binary forms", "Neither the name"] },
  "BSD-2-Clause": { file: /./, has: ["Redistribution and use in source and binary forms"], not: ["Neither the name"] },
  ISC: { file: /./, has: ["Permission to use, copy, modify, and/or distribute this software"] },
  Zlib: { file: /./, has: ["This software is provided 'as-is'"] },
  "BSL-1.0": { file: /./, has: ["Boost Software License - Version 1.0"] },
  Unlicense: { file: /./, has: ["This is free and unencumbered software"] },
  "CC0-1.0": { file: /./, has: ["CC0 1.0 Universal"] },
  "0BSD": { file: /./, has: ["Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee"], not: ["above copyright notice"] },
  "LGPL-2.1": { file: /./, has: ["GNU LESSER GENERAL PUBLIC LICENSE", "Version 2.1"] },
  "Zlib-Acknowledgement": { file: /./, has: ["This software is provided 'as-is'"] },
};

function licenseIds(expr) {
  return [
    ...new Set(
      expr
        .replace(/\bWITH\s+[\w.-]+/g, "")
        .split(/\s+(?:OR|AND)\s+|\/|[()]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

function matchesFamily(id, text, fileName) {
  const f = FAMILIES[id];
  if (!f) return false;
  if (!f.file.test(fileName) && !/^(licen[cs]e|copying)(\.(md|txt))?$/i.test(fileName)) return false;
  return f.has.every((h) => text.includes(h)) && !(f.not ?? []).some((h) => text.includes(h));
}

// MIT·BSD·ISC 처럼 본문 안에 저작권 줄이 있는 종류는 그 줄을 일반 문구로 바꿔 대표 본문으로 쓴다
function genericize(text) {
  return text
    .split("\n")
    .map((l) => (/^\s*(\(c\)|©|copyright\b)/i.test(l) ? "Copyright (c) <copyright holders — see the package list above>" : l))
    .filter((l, i, a) => !(l.startsWith("Copyright (c) <copyright holders") && a[i - 1] === l))
    .join("\n")
    .trim();
}

function copyrightLines(dir) {
  const lines = new Set();
  for (const f of licenseFiles(dir)) {
    for (const l of read(f).split("\n")) {
      const t = l.trim();
      // «Copyright (c) 2020 누구» · «Copyright 2020 누구» · «© 2020 누구» 만 — 본문 속 «copyright license to …» 같은 줄은 뺀다
      const isCopyright = /^copyright\s*(\(c\)|©)\s*\S|^copyright\s+\d{4}|^(\(c\)|©)\s*\d{4}/i.test(t);
      if (isCopyright && t.length < 200 && !/<|\[yyyy\]|\{yyyy\}|\[year\]/i.test(t)) {
        lines.add(t);
      }
    }
  }
  return [...lines].slice(0, 5);
}

// ---------- 출력 ----------
function main() {
  const pkgs = [...rustPackages(), ...npmPackages()];
  pkgs.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version, undefined, { numeric: true }));

  const groups = new Map();
  for (const p of pkgs) {
    // «A/B» 는 옛 표기 — «A OR B» 로. 괄호·AND 없는 단순 OR 은 순서를 맞춰 같은 묶음으로 모은다
    let key = p.license.replace(/\s*\/\s*/g, " OR ");
    if (!/[()]|\bAND\b|\bWITH\b/.test(key)) key = key.split(/\s+OR\s+/).sort().join(" OR ");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  // 대표 본문 고르기 — 같은 종류면 더 짧은(덧붙인 말이 적은) 본문을 택한다
  const ids = new Set([...groups.keys()].flatMap(licenseIds));
  const texts = new Map();
  for (const p of pkgs) {
    for (const f of licenseFiles(p.dir)) {
      const text = read(f);
      for (const id of licenseIds(p.license)) {
        if (!matchesFamily(id, text, path.basename(f))) continue;
        const prev = texts.get(id);
        if (!prev || text.length < prev.length) texts.set(id, text);
      }
    }
  }

  const L = [];
  const line = "=".repeat(78);
  L.push("PortDock — THIRD-PARTY SOFTWARE NOTICES");
  L.push("");
  L.push("PortDock is Copyright (C) 2026 Juhak and is licensed under the GNU General Public");
  L.push("License v3.0 only (see LICENSE). It includes the third-party components listed");
  L.push("below, each under its own license. Where a component offers a choice of licenses");
  L.push("(\"A OR B\"), PortDock uses it under any one of them.");
  L.push("");
  L.push("PortDock 은 아래 제3자 구성 요소를 포함하며, 각각 해당 라이선스를 따릅니다.");
  L.push("");
  L.push("This file is generated by tools/notices.mjs — do not edit by hand.");
  L.push(`Rust crates: ${pkgs.filter((p) => p.eco === "cargo").length} · npm packages: ${pkgs.filter((p) => p.eco === "npm").length}`);
  L.push("");

  const order = [...groups.keys()].sort((a, b) => groups.get(b).length - groups.get(a).length || a.localeCompare(b));
  L.push(line);
  L.push("PART 1. COMPONENTS BY LICENSE");
  L.push(line);
  for (const key of order) {
    L.push("");
    L.push(`--- ${key} (${groups.get(key).length}) ---`);
    for (const p of groups.get(key)) {
      L.push(`${p.name} ${p.version} [${p.eco}]${p.repository ? `  ${p.repository}` : ""}`);
      for (const c of copyrightLines(p.dir)) L.push(`    ${c}`);
    }
  }

  L.push("");
  L.push(line);
  L.push("PART 2. LICENSE TEXTS");
  L.push(line);
  const missing = [];
  for (const id of [...ids].sort()) {
    const t = texts.get(id);
    if (!t) {
      missing.push(id);
      continue;
    }
    L.push("");
    L.push(`----- ${id} -----`);
    L.push("");
    L.push(["MIT", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD", "Zlib"].includes(id) ? genericize(t) : t.trim());
  }
  if (missing.length) {
    L.push("");
    L.push(`Full texts not found locally for: ${missing.join(", ")} — see https://spdx.org/licenses/<id>.html`);
  }
  L.push("");
  const out = L.join("\n");

  if (process.argv.includes("--check")) {
    const cur = read(OUT);
    if (cur !== out) {
      console.error("THIRD_PARTY_NOTICES.txt 가 최신이 아닙니다 — node tools/notices.mjs 로 다시 만드세요.");
      process.exit(1);
    }
    console.log("THIRD_PARTY_NOTICES.txt 최신");
    return;
  }
  fs.writeFileSync(OUT, out);
  console.log(`${path.relative(ROOT, OUT)}: 패키지 ${pkgs.length}개, 라이선스 묶음 ${groups.size}개, 본문 ${texts.size}개${missing.length ? `, 본문 못 찾음: ${missing.join(", ")}` : ""}`);
}

main();
