// Scoop 매니페스트 만들기 — 자체 bucket(예: 저장소 portdock/scoop-bucket 의 bucket/ 폴더)에 넣을 앱 11개. 휴대판 zip 기준.
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

export function buildAll(apps, version, sums) {
  const files = {};
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
