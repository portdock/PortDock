// Scoop 매니페스트 만들기 — 자체 bucket(예: 저장소 portdock/scoop-bucket 의 bucket/ 폴더)에 넣을 앱 12개. 휴대판 zip 기준.
// SHA256SUMS 에 PortDock-MCP.zip 이 있으면 MCP 서버(portdock-mcp.exe, 창 없는 명령줄 — bin 으로 PATH 에)도 하나 더.
//
//   node tools/scoop.mjs --version 0.1.0                       # 공개된 릴리스의 SHA256SUMS.txt 를 내려받아 채움
//   node tools/scoop.mjs --version 0.1.0 --sums SHA256SUMS.txt  # 받아 둔 파일로
//   옵션: --out dist-packages(기본)
//
// 결과: <out>/scoop/bucket/portdock-<app>.json
// 형식은 Scoop 위키 «App Manifests»·«App Manifest Autoupdate» 를 따른다:
//  - 휴대판 zip 은 루트에 exe·LICENSE.txt·THIRD_PARTY_NOTICES.txt·portdock-data/ 가 바로 있어 extract_dir 이 필요 없다(release.yml «휴대판 zip»)
//  - persist "portdock-data" → 업데이트해도 설정(WebView2 저장소)이 남는다(Scoop 이 persist 폴더로 연결)
//  - GUI 앱이라 bin 대신 shortcuts(시작 메뉴 «Scoop Apps» 에 바로 가기)
//  - checkver github + autoupdate: 다음 버전은 url 의 $version 과 같은 폴더 SHA256SUMS.txt(sha256sum 형식, 기본 정규식으로 찾음)로 채운다
import path from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, SITE, ROOT, readApps, loadSums, downloadUrl, parseArgs, needVersion, writeFiles } from "./release-assets.mjs";
import { ZIP_FILE as MCP_ZIP, EXE as MCP_EXE, DESCRIPTION as MCP_DESCRIPTION } from "./mcp.mjs";

export function manifestFor(a, version, sums) {
  const zip = `PortDock-${a.asset}-portable.zip`;
  const sha = sums.get(zip);
  if (!sha) throw new Error(`SHA256SUMS 에 ${zip} 없음`);
  return {
    version,
    description: `${a.name} — ${a.tagline.en}`,
    homepage: `${SITE}/en/${a.app}/`,
    license: { identifier: a.license, url: `${REPO}/blob/main/LICENSE` },
    notes: [
      "Settings are kept in the persisted 'portdock-data' folder across updates.",
      "설정은 업데이트해도 portdock-data 폴더에 남습니다.",
    ],
    architecture: {
      "64bit": {
        url: downloadUrl(version, zip),
        hash: sha,
      },
    },
    shortcuts: [[a.exe, a.name]],
    persist: "portdock-data",
    checkver: { github: REPO },
    autoupdate: {
      architecture: {
        "64bit": {
          url: `${REPO}/releases/download/v$version/${zip}`,
        },
      },
      hash: { url: "$baseurl/SHA256SUMS.txt" },
    },
  };
}

/** MCP 서버 — zip 루트에 portdock-mcp.exe·LICENSE.txt·THIRD_PARTY_NOTICES.txt(release.yml «MCP zip»). 설정 폴더가 없어 persist 없음 */
export function mcpManifest(version, sums) {
  const sha = sums.get(MCP_ZIP);
  if (!sha) throw new Error(`SHA256SUMS 에 ${MCP_ZIP} 없음`);
  return {
    version,
    description: `PortDock MCP — ${MCP_DESCRIPTION}`,
    homepage: `${SITE}/en/guides/portdock-mcp/`,
    license: { identifier: "GPL-3.0-only", url: `${REPO}/blob/main/LICENSE` },
    notes: [
      "MCP server started by an AI client (Claude Desktop, VS Code, Cursor …). Point the client's command at portdock-mcp.exe.",
      "AI 클라이언트가 띄우는 MCP 서버입니다. 클라이언트 설정의 command 를 portdock-mcp.exe 로 두세요.",
    ],
    architecture: { "64bit": { url: downloadUrl(version, MCP_ZIP), hash: sha } },
    bin: MCP_EXE,
    checkver: { github: REPO },
    autoupdate: {
      architecture: { "64bit": { url: `${REPO}/releases/download/v$version/${MCP_ZIP}` } },
      hash: { url: "$baseurl/SHA256SUMS.txt" },
    },
  };
}

export function buildAll(apps, version, sums) {
  const files = {};
  if (sums.has(MCP_ZIP)) files["bucket/portdock-mcp.json"] = JSON.stringify(mcpManifest(version, sums), null, 4) + "\n";
  for (const a of apps) {
    if (a.version !== version) throw new Error(`${a.app} 의 tauri.conf.json 버전 ${a.version} ≠ --version ${version}`);
    files[`bucket/portdock-${a.app}.json`] = JSON.stringify(manifestFor(a, version, sums), null, 4) + "\n";
  }
  return files;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apps = readApps();
  const version = needVersion(args.version || apps[0].version);
  const sums = await loadSums(version, args.sums);
  const out = path.resolve(ROOT, args.out || "dist-packages", "scoop");
  const files = buildAll(apps, version, sums);
  writeFiles(out, files);
  console.log(`Scoop 매니페스트 ${Object.keys(files).length}개 → ${out}`);
  console.log("다음: bucket 저장소의 bucket/ 에 넣고 커밋 → scoop bucket add portdock <bucket 저장소 주소> → scoop install portdock/portdock-serial");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
