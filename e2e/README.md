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
1. 저장소 루트에서 앱마다 서버: `APP=serial PORT=5201 npx vite --config e2e/ui-preview/vite.config.mjs` (modbus-slave 5202, tcp 5203, udp 5204, simulator 5205, netscan 5206, modbus-master 5207)
2. `e2e` 폴더에서: `EDGEDRIVER=<msedgedriver.exe 경로> node ui-preview/shots.mjs [앱]` → `shots/ui/*.png` + `probe.json`(잘린 칸 목록)
- 경우: 최소 창(1000×640) 한국어 대기·연결, 영어, 넓은 창 어두운 테마, 글자 17px, 설정 창
- 가짜 응답이라 상태 문구·사건 줄 내용은 실제와 다를 수 있다. 실제 동작 확인은 위 실기 점검으로.

### 가짜 백엔드(`ui-preview/mock.js`)
실제 명령 이름·반환 모양(`apps/*/src-tauri/src/lib.rs`)과 사건 모양(`crates/core/src/event.rs`)을 따른다.
- 연결하면 상태(연결됨·재연결 대기·닫힘 / 듣는 중·상대 / 받는 중)와 프레임(RX·TX·EV, 체크섬 맞음·틀림, 상대 주소)을 주기적으로 보낸다. 끊기·멈춤은 «닫힘» 상태를 따로 보낸다.
- «보낼 바이트» 는 실제 규칙대로 만든다(HEX·ASCII 이스케이프 + 체크섬 + 줄 끝, 틀리면 같은 오류 문구).
- 일부러 실패하는 입력: 시리얼 `COM9`(사용 중), 목록에 없는 포트(찾을 수 없음), TCP·UDP 포트 `445`(사용 중), TCP 클라이언트 `10.0.0.99`(시간 초과 → 재접속 대기), 주소 `nohost`(찾지 못함), UDP `x.x.x.255` 를 브로드캐스트 허용 없이(접근 거부).
- 시험용 손잡이 `window.__pdMock`: `dialog = { ask, save, open }`(확인 창 답·저장/열기 경로, 기본 «아니오»·취소), `unplug()`(장치 뽑힘 → 자동 재연결이면 1.5초 뒤 다시), `plug(true)`(블루투스 COM7 꽂기), `error(msg)`, `calls`·`files`.

## 다 눌러 보기 점검 (`ui-preview/smoke.mjs`)
미리보기 서버 다섯 개(위 1번)를 띄운 뒤 `e2e` 폴더에서:
```
EDGEDRIVER=<msedgedriver.exe 경로> node ui-preview/smoke.mjs [앱]      (예: node ui-preview/smoke.mjs tcp)
COMBO=ko-light node ui-preview/smoke.mjs serial                         (한 경우만 빨리)
```
- 경우: 최소 창 안쪽 984×601 에서 한국어·영어 × 밝게·어둡게. `ko-light`·`en-dark` 는 전부 누르고, `ko-dark`·`en-light` 는 열기·대화상자·연결·멈춤만.
- 하는 일: 모든 버튼·고르기(항목마다)·체크(두 번)·입력칸(빈칸·0·음수·아주 큰 수·영문·한글·Enter)을 멈춘 상태와 연결한 상태에서 건드린다. 새로 뜬 창도 그 안을 눌러 본 뒤 Esc·✕ 로 닫는다. 확인 창은 «아니오» 로 한 번, «예»·저장 경로가 있는 채로 한 번.
- 따로 보는 것: ?·F1 도움말 → Esc, ⚙ 설정 → ✕, ! 문제 보고 → Esc 뒤 포커스가 제자리로 돌아오는지 · 연결/시작 뒤 2초 안에 «연결 중» 이 풀리는지 · 입력칸 Enter·보내기 버튼(누른 뒤 입력칸으로 돌아오는지) · 장치 뽑힘→재연결 · 바쁜 포트·안 붙는 주소 오류 · 저장해 둔 포트가 없어졌을 때.
- 편의성(10/17, `ko-light`·`en-dark`): 창 제목 · 로그 따라가기(위로 굴리면 멈춤·«↓ 맨 아래로»·End·줄을 눌러도 안 꺼짐) · 누르기/Shift/Ctrl 고르기와 Ctrl+C · 우클릭 메뉴(C 배열 복사·Esc) · 단축키(Ctrl+L·Ctrl+S·Ctrl+Shift+L·F4·Esc 반복 멈춤) · 숫자 칸 ↑/Shift+↑/PageDown·속도 목록 · HEX↔ASCII 표기 바꾸기·체크섬 알림줄 · 명령 목록(추가 뒤 이름 칸 포커스·↓·Alt+↑·Enter 보내기·복제·지우기→되돌리기) · Slave 레지스터 칸 ↓↑·Esc·여러 값 붙여넣기·슬레이브 되돌리기 · Simulator 규칙 되돌리기 · 📌. 복사한 글은 `navigator.clipboard.writeText` 를 가로채 `__smoke.clip` 에서 본다.
- Serial·TCP·UDP 공통 기능(10/18, `ko-light`·`en-dark`, `ioFeatures()`): 입력 이력 ↑↑↓↓(고치던 글로 돌아오는지) · 명령 단축키 F7(겹침 막기·키로 보내기) · 트리거(색칠·TRIGGER 사건 줄·횟수) · 간격 열(«직전 줄과 간격»·줄 복사에 들어가는지) · 처리량 표시 · 체크섬 옵션(BCC 앞 1·끝 1 → 미리보기 «02 41 42 03 03», Esc 로 닫힘) · 반복 3번 뒤 멈춤 · Serial Break·터미널 보기 · Serial·TCP 파일 보내기(가짜 4096바이트 진행 → «다 보냈습니다»). 캡처 `<앱>-*-triggers`·`-delta-trigger`·`-terminal`·`-file-sending`.
- 첫 실행(10/18): Serial «무엇을 하나요?»·Slave·Net Scan «처음 쓰는 순서» 카드 모양과 도움말 링크(그 절로 열리는지, 네 경우 모두). `ko-light`·`en-dark` 는 Serial «Modbus 장비 값 읽기» → 용도·보내기 형식·예시 2개 → 속도를 고쳐 «(바꿈)»·↺ → 용도 «AT 명령», Serial·TCP·UDP 빈 명령 목록 «예시 넣기» → 되돌리기. 캡처 `<앱>-*-first-card`·`serial-*-preset-at`.
- Modbus 응답 짝짓기(10/18, `ko-light`·`en-dark`): Serial 요청 창 «보내기» 뒤 응답 줄이 저절로 골라지고 상세 «요청과 짝» 에 «40001 = 값 (0x….)» 10줄·F32 ABCD 5줄, 41001(가짜 장비의 1000 이상)은 예외 02 이름. TCP 는 MBAP 요청(트랜잭션 42)을 보내 응답 줄을 누르면 «트랜잭션 42» 짝·값 4줄. 가짜 백엔드는 RTU·MBAP 읽기 요청에 맞는 응답을 돌려준다(0 = 1812, 1 = 0xFFFF, 2·3 = F32 3.14, 그 밖 주소×10, 1000 이상 예외 02). 캡처 `serial-*-mb-pair`.
- 좁은 창(네 경우 모두): 안쪽 760×600 에서 왼쪽 칸이 접히고 요약 줄이 보이는지, «⚙ 연결 설정» 으로 펼쳐도·연결해도 넘치지 않는지. 캡처 `<앱>-*-narrow-760-*.png`.
- 매 동작 뒤 확인: 잡히지 않은 예외·거부된 Promise·console.error, 화면 오류(Boundary), 창 밖으로 넘친 요소·가로 스크롤, 창보다 큰 대화상자, 글자가 잘린 버튼, 값이 목록에 없는 고르기.
- 결과: 화면에 경우별 ✅/❌ 와 누른 횟수, `shots/smoke/<앱>.json`(같은 문제는 묶어 횟수·단계와 함께), 문제가 난 단계의 캡처 `shots/smoke/<앱>-*.png`. 문제가 있으면 종료 코드 1.
- 가짜 백엔드라 «화면 쪽» 버그만 찾는다. 실제 통신·타이밍 문제는 위 실기 점검으로.
