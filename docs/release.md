# 릴리스 절차

모든 프로그램(9개)을 한 번에, 같은 버전으로 낸다. 빌드·업로드는 GitHub Actions(`.github/workflows/release.yml`)가 하고, 사람은 버전을 올리고 태그를 달고, 초안을 확인해 공개한다.

## 올라가는 파일

이름에 버전을 넣지 않는다 — `https://github.com/portdock/PortDock/releases/latest/download/<이름>` 이 늘 최신을 가리키게(홈페이지 `site/src/data/tools.ts` 의 `file` 과 같은 이름).

| 파일 | 내용 |
|---|---|
| `PortDock-<App>-setup.exe` | 설치판(NSIS, `currentUser` — 관리자 권한 없음, WebView2 부트스트래퍼 포함) |
| `PortDock-<App>-setup-offline.exe` | 오프라인 설치판 — WebView2 런타임 동봉(`tools/offline.conf.json`, 약 +130MB). 인터넷 없는 공장 PC 용 |
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

1. **버전 올리기** — 모든 `apps/*/src-tauri/tauri.conf.json`(9개) 의 `version`, 루트 `Cargo.toml` 의 `[workspace.package] version`, `apps/*/package.json` 의 `version` 을 같은 값으로. (워크플로가 태그와 `tauri.conf.json` 버전이 다르면 멈춘다.)
2. **제3자 고지 새로 만들기** — 의존성이 바뀌었으면 결과가 달라진다.
   ```powershell
   node tools/notices.mjs          # THIRD_PARTY_NOTICES.txt 다시 만들기
   node tools/notices.mjs --check  # 최신인지만 확인(다르면 종료 코드 1)
   ```
   `cargo metadata` 로 모든 앱의 일반 의존성(Windows x64)을, `apps/*/package.json` 의 dependencies 를 재귀로 모은다. 라이선스 종류마다 본문 한 벌, 패키지마다 저작권 줄. 워크플로도 빌드 전에 다시 만든다(`bundle.resources` 로 설치 폴더에 `LICENSE`·`THIRD_PARTY_NOTICES.txt` 가 들어가므로 이 파일이 없으면 빌드가 실패한다).
3. **로컬 확인** — `cargo test --workspace`, 각 앱 폴더에서 `npx tsc --noEmit -p .`
4. **커밋 → 태그**
   ```powershell
   git commit -am "release: v0.2.0"
   git tag v0.2.0
   git push origin main v0.2.0
   ```
5. **Actions 확인** — `release` 워크플로가 모든 앱(9개)을 병렬로 빌드하고 «초안(draft)» 릴리스를 만든다. (태그 없이 시험하려면 Actions 화면에서 *Run workflow* — 빌드 결과만 artifact 로 남고 릴리스는 만들지 않는다.)
6. **초안 검사**
   - 설치판 하나를 깨끗한 PC(또는 Windows Sandbox)에서 설치 → 실행 → 설정 «정보» 의 버전 확인 → 제거.
   - 휴대판 zip 을 풀어 실행 → `portdock-data` 에 `EBWebView` 폴더가 생기는지 확인.
   - 파일마다 <https://www.virustotal.com/> 에 올리고, 결과 링크를 릴리스 본문의 «VirusTotal» 줄에 붙인다.
   - 변경 내용을 다듬는다(자동 생성된 노트 위에 한국어·영어 요약).
7. **Publish** — 공개 후 `https://github.com/portdock/PortDock/releases/latest/download/PortDock-Serial-setup.exe` 가 새 파일을 받는지 확인. 앱의 «새 버전 확인» 버튼은 `/releases/latest` 페이지를 연다(자동 확인 없음).

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

## 오류 보고(크래시) 확인

받는 곳은 Sentry(`shared/report.ts` 의 `SENTRY_DSN`, 비면 자동 전송이 숨는다). 보내는 코드는 직접 만든 가벼운 것이다(공식 SDK 아님). 남기는 곳은 모두 보고 폴더(«문제 보고» 창의 환경 정보 `reportsDir`).

| 사고 | 누가 남기나 | 파일 | 올리는 곳 |
|---|---|---|---|
| Rust panic | panic 훅 | `crash-<시각>-<pid>.txt` | envelope (+ 글 첨부) |
| 네이티브 크래시(접근 위반 등) | 감시 프로세스(같은 exe 를 `--portdock-crash-monitor <소켓> <pid>` 로 창 없이 하나 더 띄움, 부모가 끝나면 함께 끝남) | `.dmp` + 같은 이름 `.txt` | `/api/<project>/minidump/` (`upload_file_minidump`) |
| WebView2 화면 프로세스 종료(흰 화면) | `ProcessFailed` 이벤트 — 화면 다시 불러오기, 엔진 전체가 끝나면 안내 후 종료(30초에 보고 하나) | `.txt` | envelope |

릴리스 전에 손으로 (테스트 노트북, 릴리스 빌드):

```powershell
$env:PORTDOCK_TEST_CRASH = "1";      & ".\PortDock TCP.exe"   # 3초 뒤 panic → crash-*.txt
$env:PORTDOCK_TEST_CRASH = "native"; & ".\PortDock TCP.exe"   # 3초 뒤 접근 위반 → crash-*.dmp + crash-*.txt
Remove-Item Env:PORTDOCK_TEST_CRASH;  & ".\PortDock TCP.exe"   # «지난번에 오류로 꺼졌습니다» → 보내기/보고서 보기
```

- 실행 중에는 언제나 작업 관리자에 같은 이름의 프로세스가 둘 보이는 것이 정상(하나가 감시, 창 없음). 프로그램을 닫으면 둘 다 사라져야 한다.
- 디버그 빌드는 panic 이 프로그램을 끄지 않는다(기록만). `native` 는 디버그에서도 꺼진다.
- 덤프는 보통 수백 KB, 20 MB 를 넘으면 올리지 않는다. 보고는 최근 10건(.txt·.dmp 짝을 한 건)만 남긴다.

## CI (push·PR 마다)
`.github/workflows/ci.yml` — Windows 에서 모든 앱 화면 빌드(tsc 포함) → 공용 시험(`node --test`) → `cargo clippy -D warnings` → `cargo test` → 제3자 고지 최신 여부 → 사이트 검사·시험·빌드. 이슈 양식: `.github/ISSUE_TEMPLATE/`(버그·기능 제안, 공개라 민감 데이터 금지 안내).
