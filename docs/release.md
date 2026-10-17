# 릴리스 절차

다섯 프로그램을 한 번에, 같은 버전으로 낸다. 빌드·업로드는 GitHub Actions(`.github/workflows/release.yml`)가 하고, 사람은 버전을 올리고 태그를 달고, 초안을 확인해 공개한다.

## 올라가는 파일

이름에 버전을 넣지 않는다 — `https://github.com/juhak0308/PortDock/releases/latest/download/<이름>` 이 늘 최신을 가리키게(홈페이지 `site/src/data/tools.ts` 의 `file` 과 같은 이름).

| 파일 | 내용 |
|---|---|
| `PortDock-<App>-setup.exe` | 설치판(NSIS, `currentUser` — 관리자 권한 없음, WebView2 부트스트래퍼 포함) |
| `PortDock-<App>-portable.zip` | 휴대판: `PortDock <App>.exe` + `LICENSE.txt` + `THIRD_PARTY_NOTICES.txt` + `portdock-data/` |
| `SHA256SUMS.txt` | 위 파일 모두의 SHA-256 |

`<App>` = `Serial` · `Modbus-Slave` · `TCP` · `UDP` · `Simulator`. 소스 압축본(zip·tar.gz)은 GitHub 가 태그마다 자동으로 붙인다(GPL 소스 제공).

## 설치판과 휴대판의 차이

같은 소스에서 설정만 바꿔 두 번 빌드한다.

- 설치판: `tauri.conf.json` 그대로. 데이터는 `%LOCALAPPDATA%\dev.portdock.<app>`.
- 휴대판: `tauri build --no-bundle --config tools/portable.conf.json` — `app.appDirectoriesOverride: "./portdock-data"` 를 덮어쓴다.
  Tauri 2.12(tauri-utils 2.10)의 이 설정은 `app_*_dir` 경로(설정·데이터·캐시·로그)와 **WebView2 데이터 폴더**를 exe 기준 상대 경로로 옮긴다 → localStorage 에 있는 설정이 exe 옆에 남는다.
  상대 경로는 exe 폴더에 쓰기 권한이 있어야 하므로 설치판 설정에는 넣지 않는다.
- 주의: 오류 보고서(`crates/core/src/report.rs`)는 지금 `%LOCALAPPDATA%\PortDock\reports` 를 직접 쓰므로 휴대판에서도 그곳에 남는다.

## 순서

1. **버전 올리기** — 다섯 `apps/*/src-tauri/tauri.conf.json` 의 `version`, 루트 `Cargo.toml` 의 `[workspace.package] version`, `apps/*/package.json` 의 `version` 을 같은 값으로. (워크플로가 태그와 `tauri.conf.json` 버전이 다르면 멈춘다.)
2. **제3자 고지 새로 만들기** — 의존성이 바뀌었으면 결과가 달라진다.
   ```powershell
   node tools/notices.mjs          # THIRD_PARTY_NOTICES.txt 다시 만들기
   node tools/notices.mjs --check  # 최신인지만 확인(다르면 종료 코드 1)
   ```
   `cargo metadata` 로 다섯 앱의 일반 의존성(Windows x64)을, `apps/*/package.json` 의 dependencies 를 재귀로 모은다. 라이선스 종류마다 본문 한 벌, 패키지마다 저작권 줄. 워크플로도 빌드 전에 다시 만든다(`bundle.resources` 로 설치 폴더에 `LICENSE`·`THIRD_PARTY_NOTICES.txt` 가 들어가므로 이 파일이 없으면 빌드가 실패한다).
3. **로컬 확인** — `cargo test --workspace`, 각 앱 폴더에서 `npx tsc --noEmit -p .`
4. **커밋 → 태그**
   ```powershell
   git commit -am "release: v0.2.0"
   git tag v0.2.0
   git push origin main v0.2.0
   ```
5. **Actions 확인** — `release` 워크플로가 다섯 앱을 병렬로 빌드하고 «초안(draft)» 릴리스를 만든다. (태그 없이 시험하려면 Actions 화면에서 *Run workflow* — 빌드 결과만 artifact 로 남고 릴리스는 만들지 않는다.)
6. **초안 검사**
   - 설치판 하나를 깨끗한 PC(또는 Windows Sandbox)에서 설치 → 실행 → 설정 «정보» 의 버전 확인 → 제거.
   - 휴대판 zip 을 풀어 실행 → `portdock-data` 에 `EBWebView` 폴더가 생기는지 확인.
   - 파일마다 <https://www.virustotal.com/> 에 올리고, 결과 링크를 릴리스 본문의 «VirusTotal» 줄에 붙인다.
   - 변경 내용을 다듬는다(자동 생성된 노트 위에 한국어·영어 요약).
7. **Publish** — 공개 후 `https://github.com/juhak0308/PortDock/releases/latest/download/PortDock-Serial-setup.exe` 가 새 파일을 받는지 확인. 앱의 «새 버전 확인» 버튼은 `/releases/latest` 페이지를 연다(자동 확인 없음).

## 코드 서명 (예정)

아직 서명하지 않는다 → 사용자는 SmartScreen «추가 정보 → 실행»(README 에 안내). SignPath Foundation(오픈소스 무료) 승인을 받으면:

1. SignPath 에 프로젝트·서명 정책(`release-signing`)·아티팩트 구성(`nsis`, exe 안의 `PortDock *.exe` 도 서명)을 만든다.
2. 저장소 Secrets 에 `SIGNPATH_API_TOKEN`, Variables 에 `SIGNPATH_ORGANIZATION_ID`.
3. `release.yml` 의 주석 처리된 «SignPath 서명» 단계를 켜고, 미서명 설치판을 artifact 로 올린 뒤 서명본으로 바꿔 넣도록 이어 붙인다. 휴대판 exe 도 같은 방식으로 서명한다.
4. 서명 후 SHA256SUMS 를 만든다(지금 순서 그대로 — release 작업에서 계산).

## 아이콘

원본은 `tools/icons/*.svg`(앱마다 색과 글자: S 청록 `#0b6e75`, M 남색 `#4338ca`, T 파랑 `#1d4ed8`, U 보라 `#7c3aed`, Σ 호박색 `#b45309`; `portdock.svg` 는 글자 없는 기본 마크). 바꾸면:

```powershell
npx tauri icon tools/icons/serial.svg -o apps/serial/src-tauri/icons
# 안드로이드·iOS 폴더와 64x64.png 는 쓰지 않으므로 지운다
Remove-Item -Recurse apps/serial/src-tauri/icons/android, apps/serial/src-tauri/icons/ios, apps/serial/src-tauri/icons/64x64.png
```
