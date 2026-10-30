// 릴리스 자산 공용 — winget.mjs·scoop.mjs 가 함께 쓴다.
// 앱 목록은 .github/workflows/release.yml 의 matrix(app·asset), 이름·게시자·라이선스는 각 앱 tauri.conf.json,
// 짧은 설명(한·영)은 사이트 site/src/data/tools.ts 의 tagline(코드에 있는 기능만 적은 문구)에서 읽는다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REPO = "https://github.com/portdock/PortDock";
export const SITE = "https://portdock.dev";

/** release.yml matrix 의 `- { app: serial, asset: Serial }` 줄들 → [{ app, asset }] */
export function readMatrix(root = ROOT) {
  const yml = fs.readFileSync(path.join(root, ".github", "workflows", "release.yml"), "utf8");
  const out = [...yml.matchAll(/-\s*\{\s*app:\s*([\w-]+)\s*,\s*asset:\s*([\w-]+)\s*\}/g)].map((m) => ({ app: m[1], asset: m[2] }));
  if (out.length === 0) throw new Error("release.yml 에서 matrix 를 찾지 못함");
  return out;
}

/** 릴리스에 올라가는 파일 이름 전부 — release.yml 의 matrix(앱마다 설치판·오프라인 설치판·휴대판)와 «files:» 에 이름 그대로 적힌 것(MCP·SHA256SUMS).
 *  사이트의 /releases/latest/download/<이름> 링크를 이것과 대조한다(tools/site-check.mjs) */
export function releaseAssetNames(root = ROOT) {
  const yml = fs.readFileSync(path.join(root, ".github", "workflows", "release.yml"), "utf8");
  const names = readMatrix(root).flatMap(({ asset }) => ["setup.exe", "setup-offline.exe", "portable.zip"].map((s) => `PortDock-${asset}-${s}`));
  for (const m of yml.matchAll(/^\s*dist\/([\w.-]+)\s*$/gm)) if (!m[1].includes("*")) names.push(m[1]);
  if (!names.includes("SHA256SUMS.txt")) throw new Error("release.yml files: 에서 SHA256SUMS.txt 를 찾지 못함");
  return [...new Set(names)].sort();
}

/** site/src/data/tools.ts 에서 file → { ko, en } tagline */
export function readTaglines(root = ROOT) {
  const src = fs.readFileSync(path.join(root, "site", "src", "data", "tools.ts"), "utf8");
  const map = new Map();
  for (const m of src.matchAll(/file:\s*"([^"]+)",\s*\n\s*tagline:\s*\{\s*ko:\s*"([^"]*)",\s*en:\s*"([^"]*)"\s*\}/g)) map.set(m[1], { ko: m[2], en: m[3] });
  return map;
}

/** 앱마다 패키지에 넣을 정보. id 는 PortDock.<App>(asset 에서 하이픈을 뺀 PascalCase — PortDock.ModbusSlave) */
export function readApps(root = ROOT) {
  const tag = readTaglines(root);
  return readMatrix(root).map(({ app, asset }) => {
    const conf = JSON.parse(fs.readFileSync(path.join(root, "apps", app, "src-tauri", "tauri.conf.json"), "utf8"));
    const t = tag.get(`PortDock-${asset}`);
    if (!t) throw new Error(`tools.ts 에 PortDock-${asset} tagline 없음`);
    return {
      app,
      asset,
      id: `PortDock.${asset.replace(/-/g, "")}`,
      name: conf.productName, // 설치 후 «앱 및 기능» 에 보이는 이름과 같게(winget 이 이걸로 짝지음)
      exe: `PortDock ${asset}.exe`, // 휴대판 zip 안의 exe 이름(release.yml «휴대판 zip» — asset 그대로라 «PortDock Modbus-Slave.exe»)
      publisher: conf.bundle.publisher,
      license: conf.bundle.license,
      copyright: conf.bundle.copyright,
      version: conf.version,
      tagline: t,
    };
  });
}

/** sha256sum 형식(«<해시>  <이름>» 또는 «<해시> *<이름>») → Map(이름 → 해시 소문자) */
export function parseSums(text) {
  const map = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^([0-9a-fA-F]{64})\s+\*?(.+)$/.exec(line);
    if (!m) throw new Error(`SHA256SUMS 줄을 읽지 못함: ${line}`);
    map.set(m[2].trim(), m[1].toLowerCase());
  }
  return map;
}

export const downloadUrl = (version, file) => `${REPO}/releases/download/v${version}/${file}`;

/** --sums 가 파일이면 읽고, 없으면 그 버전 릴리스의 SHA256SUMS.txt 를 내려받는다(공개된 뒤에만 됨) */
export async function loadSums(version, sumsArg) {
  if (sumsArg && !/^https?:/.test(sumsArg)) return parseSums(fs.readFileSync(sumsArg, "utf8"));
  const url = sumsArg || downloadUrl(version, "SHA256SUMS.txt");
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status} (릴리스가 공개됐는지, 버전이 맞는지 확인)`);
  return parseSums(await res.text());
}

/** 간단한 인자 읽기: --version 0.1.0 --sums x --out y --date 2026-11-01 */
export function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith("--")) throw new Error(`알 수 없는 인자: ${k}`);
    a[k.slice(2)] = argv[i + 1];
    i++;
  }
  return a;
}

export function needVersion(v) {
  if (!v || !/^\d+\.\d+\.\d+$/.test(v)) throw new Error(`--version 은 0.1.0 같은 형식이어야 함: ${v}`);
  return v;
}

export function writeFiles(outDir, files) {
  for (const [rel, text] of Object.entries(files)) {
    const p = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text, "utf8"); // BOM 없는 UTF-8
  }
}
