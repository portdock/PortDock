// winget 매니페스트 만들기 — 앱 9개를 패키지 9개(PortDock.<App>)로. 제출은 하지 않는다(사람이 winget-pkgs 에 PR).
//
//   node tools/winget.mjs --version 0.1.0                      # 공개된 릴리스의 SHA256SUMS.txt 를 내려받아 채움
//   node tools/winget.mjs --version 0.1.0 --sums SHA256SUMS.txt # 받아 둔 파일로(초안 릴리스 단계)
//   옵션: --out dist-packages(기본) · --date 2026-11-01(ReleaseDate, 없으면 넣지 않음)
//
// 결과: <out>/winget/manifests/p/PortDock/<App>/<버전>/ 에 파일 4개(version·기본 언어 en-US·ko-KR·installer).
// 형식은 Microsoft Learn «Create your package manifest»(2026-09 판, ManifestVersion 1.12.0)의 다중 파일 형식을 따른다.
// 정책(Learn «Submit your manifest to the repository»·winget-pkgs 정책)에서 이 스크립트가 지키는 것:
//  - 무인 설치 필수 → 설치판은 NSIS(InstallerType nullsoft, 클라이언트가 /S 를 자동으로 쓰지만 명시도 함)
//  - InstallerUrl 은 게시자 배포 위치의 https 주소 → GitHub 릴리스의 «버전이 든» 주소(latest/download 는 내용이 바뀌어 해시가 어긋남)
//  - 폴더 = manifests/<게시자 첫 글자 소문자>/<게시자>/<앱>/<버전>, PackageIdentifier·PackageVersion 과 일치
//  - PackageName·Publisher 는 «앱 및 기능» 표시와 같게(tauri.conf.json productName·bundle.publisher)
//  - PR 하나에 패키지 버전 하나 → 9개 PR(제출 순서는 docs/release-v0.1.md)
// 오프라인 설치판·휴대판은 winget 에 넣지 않는다(같은 아키텍처·범위의 설치판이 둘이 되면 고를 기준이 없음). 휴대판은 Scoop(tools/scoop.mjs).
import path from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, SITE, ROOT, readApps, loadSums, downloadUrl, parseArgs, needVersion, writeFiles } from "./release-assets.mjs";

export const MANIFEST_VERSION = "1.12.0";

/** winget 검색에 쓰는 태그(소문자·공백 없이, 기능 문구는 tools.ts·help.ts 에 있는 것만) */
const TAGS = {
  serial: ["serial", "rs232", "rs485", "com-port", "terminal", "modbus-rtu", "checksum"],
  "modbus-slave": ["modbus", "modbus-rtu", "modbus-tcp", "slave", "simulator", "plc", "hmi"],
  tcp: ["tcp", "socket", "client", "server", "network", "test-tool"],
  udp: ["udp", "broadcast", "multicast", "network", "test-tool"],
  simulator: ["simulator", "serial", "tcp", "udp", "device", "test-tool"],
  netscan: ["ip-scanner", "network-scanner", "ping", "arp", "industrial", "wake-on-lan"],
  "modbus-master": ["modbus", "modbus-rtu", "modbus-tcp", "master", "poll", "plc"],
  scpi: ["scpi", "instrument", "lxi", "test-equipment", "rs232"],
  plot: ["serial-plotter", "plot", "graph", "chart", "csv", "arduino"],
};

/** YAML 문자열 — JSON 큰따옴표 문자열은 YAML 큰따옴표 문자열로도 같은 뜻 */
const q = (s) => JSON.stringify(String(s));
const head = (type) => `# yaml-language-server: $schema=https://aka.ms/winget-manifest.${type}.${MANIFEST_VERSION}.schema.json\n# 만든 곳: PortDock tools/winget.mjs\n\n`;
const list = (key, arr) => `${key}:\n${arr.map((x) => `- ${q(x)}`).join("\n")}\n`;

export function manifestsFor(a, version, sums, opts = {}) {
  const setup = `PortDock-${a.asset}-setup.exe`;
  const sha = sums.get(setup);
  if (!sha) throw new Error(`SHA256SUMS 에 ${setup} 없음`);
  const dir = `manifests/${a.publisher[0].toLowerCase()}/${a.publisher}/${a.id.split(".").slice(1).join(".")}/${version}`;
  const base = `${dir}/${a.id}`;
  const common = `PackageIdentifier: ${q(a.id)}\nPackageVersion: ${q(version)}\n`;
  const pageEn = `${SITE}/en/${a.app}/`;
  const pageKo = `${SITE}/${a.app}/`;
  const tags = TAGS[a.app];
  if (!tags) throw new Error(`태그 없음: ${a.app}`);

  const versionYaml = head("version") + common + `DefaultLocale: "en-US"\nManifestType: "version"\nManifestVersion: ${q(MANIFEST_VERSION)}\n`;

  const localeYaml = (loc, desc, page, type) =>
    head(type) +
    common +
    `PackageLocale: ${q(loc)}\n` +
    `Publisher: ${q(a.publisher)}\n` +
    `PublisherUrl: ${q(SITE + "/")}\n` +
    `PublisherSupportUrl: ${q(REPO + "/issues")}\n` +
    `PrivacyUrl: ${q(loc === "ko-KR" ? `${SITE}/privacy/` : `${SITE}/en/privacy/`)}\n` +
    `Author: ${q("PortDock")}\n` +
    `PackageName: ${q(a.name)}\n` +
    `PackageUrl: ${q(page)}\n` +
    `License: ${q(a.license)}\n` +
    `LicenseUrl: ${q(REPO + "/blob/main/LICENSE")}\n` +
    `Copyright: ${q(a.copyright)}\n` +
    `ShortDescription: ${q(desc)}\n` +
    (type === "defaultLocale" ? `Moniker: ${q("portdock-" + a.app)}\n` : "") +
    list("Tags", tags) +
    `ReleaseNotesUrl: ${q(`${REPO}/releases/tag/v${version}`)}\n` +
    `ManifestType: ${q(type)}\nManifestVersion: ${q(MANIFEST_VERSION)}\n`;

  const installerYaml =
    head("installer") +
    common +
    `Platform:\n- "Windows.Desktop"\n` +
    `MinimumOSVersion: "10.0.0.0"\n` +
    `InstallerType: "nullsoft"\n` +
    `Scope: "user"\n` + // tauri.conf.json nsis.installMode = currentUser(관리자 권한 없이 %LOCALAPPDATA% 에)
    `InstallModes:\n- "interactive"\n- "silent"\n- "silentWithProgress"\n` +
    `InstallerSwitches:\n  Silent: "/S"\n  SilentWithProgress: "/S"\n` +
    `UpgradeBehavior: "install"\n` +
    (opts.date ? `ReleaseDate: ${q(opts.date)}\n` : "") +
    `Installers:\n- Architecture: "x64"\n  InstallerUrl: ${q(downloadUrl(version, setup))}\n  InstallerSha256: ${q(sha.toUpperCase())}\n` +
    `ManifestType: "installer"\nManifestVersion: ${q(MANIFEST_VERSION)}\n`;

  return {
    [`${base}.yaml`]: versionYaml,
    [`${base}.locale.en-US.yaml`]: localeYaml("en-US", a.tagline.en, pageEn, "defaultLocale"),
    [`${base}.locale.ko-KR.yaml`]: localeYaml("ko-KR", a.tagline.ko, pageKo, "locale"),
    [`${base}.installer.yaml`]: installerYaml,
  };
}

export function buildAll(apps, version, sums, opts = {}) {
  const files = {};
  for (const a of apps) {
    if (a.version !== version) throw new Error(`${a.app} 의 tauri.conf.json 버전 ${a.version} ≠ --version ${version} (그 태그를 체크아웃해서 돌릴 것)`);
    Object.assign(files, manifestsFor(a, version, sums, opts));
  }
  return files;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apps = readApps();
  const version = needVersion(args.version || apps[0].version);
  if (args.date && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new Error("--date 는 YYYY-MM-DD");
  const sums = await loadSums(version, args.sums);
  const out = path.resolve(ROOT, args.out || "dist-packages", "winget");
  const files = buildAll(apps, version, sums, { date: args.date });
  writeFiles(out, files);
  console.log(`winget 매니페스트 ${apps.length}개 패키지(${Object.keys(files).length}개 파일) → ${out}`);
  for (const a of apps) console.log(`  ${a.id}`);
  console.log("다음: winget validate <폴더> → Windows Sandbox 시험 → winget-pkgs 에 패키지마다 PR 하나(docs/release-v0.1.md)");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
