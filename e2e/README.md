# e2e — 실제 프로그램을 띄워 누르는 검증 (다른 노트북용)

이 PC 에서는 실행하지 않는다(사용자 10/17). 검증용 노트북에서 아래 순서로 돌린다.

## 준비 (한 번)
1. Rust(rustup) · Node 22+ · Visual Studio C++ 빌드 도구 설치
2. 저장소 받아서 `npm install` (루트) → `cd e2e && npm install`
3. `cargo install tauri-driver --locked`
4. Edge WebDriver: 그 PC 의 WebView2 버전과 **같은 번호**로 받는다
   - 버전 보기: `reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv`
   - 받기: `https://msedgedriver.microsoft.com/<버전>/edgedriver_win64.zip` → 아무 폴더에 풀기(예: `C:\tools\edgedriver\msedgedriver.exe`)
5. 프로그램 빌드: 루트에서 `npm run build:serial` 등 다섯 개(또는 `npx tauri build -w portdock-<도구> -- --no-bundle`)

## 실행
```
set PD_E2E_TOOLS=C:\tools          (edgedriver\msedgedriver.exe 가 있는 상위 폴더)
cd e2e
node tcp.mjs
node udp.mjs
node sim.mjs
node slave.mjs
node serial.mjs
```
- 결과: 화면에 ✅/❌, `e2e/shots/` 에 단계별 캡처와 `<도구>-results.json`.
- TCP·UDP·Simulator 는 PC 안에서 상대를 띄워 실제로 주고받는다. Serial·Modbus Slave 는 포트 없이 되는 화면·입력만 본다.
- 시리얼 실통신은 가상 COM 쌍(com0com, 관리자 승인 필요) 또는 USB-시리얼 두 개를 서로 연결해 손으로 확인한다 — `docs/test-plan.md` 의 ⏸ 항목.
- 저장·열기 대화상자(파일 로그, 내보내기·가져오기)는 자동 조작이 안 되므로 손으로 확인한다.

## 화면 미리보기·캡처 (장비·Rust 없이, `ui-preview/`)
백엔드 대신 가짜 응답(`ui-preview/mock.js`)을 넣고 화면만 브라우저에 띄운다. 글자 잘림·배치·테마·글자 크기를 빠르게 본다.
1. 저장소 루트에서 앱마다 서버: `APP=serial PORT=5201 npx vite --config e2e/ui-preview/vite.config.mjs` (modbus-slave 5202, tcp 5203, udp 5204, simulator 5205)
2. `e2e` 폴더에서: `EDGEDRIVER=<msedgedriver.exe 경로> node ui-preview/shots.mjs [앱]` → `shots/ui/*.png` + `probe.json`(잘린 칸 목록)
- 경우: 최소 창(1000×640) 한국어 대기·연결, 영어, 넓은 창 어두운 테마, 글자 17px, 설정 창
- 가짜 응답이라 상태 문구·사건 줄 내용은 실제와 다를 수 있다. 실제 동작 확인은 위 실기 점검으로.
