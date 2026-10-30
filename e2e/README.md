# e2e — 실제 프로그램을 띄워 누르는 검증 (다른 노트북용)

개발 PC 가 아닌 검증용 노트북에서 아래 순서로 돌린다.

## 준비 (한 번)
1. Rust(rustup) · Node 22+ · Visual Studio C++ 빌드 도구 설치
2. 저장소 받아서 `npm install` (루트) → `cd e2e && npm install`
3. `cargo install tauri-driver --locked`
4. Edge WebDriver: 그 PC 의 WebView2 버전과 **같은 번호**로 받는다
   - 버전 보기: `reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv`
   - 받기: `https://msedgedriver.microsoft.com/<버전>/edgedriver_win64.zip` → 아무 폴더에 풀기(예: `C:\tools\edgedriver\msedgedriver.exe`)
5. 프로그램 빌드: 아래 실기 점검이 있는 다섯 앱(serial·modbus-slave·tcp·udp·simulator)을 루트에서 `npm run build:<도구>`(또는 `npx tauri build -w portdock-<도구> -- --no-bundle`)

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
1. 저장소 루트에서 앱마다 서버: `APP=serial PORT=5201 npx vite --config e2e/ui-preview/vite.config.mjs` (modbus-slave 5202, tcp 5203, udp 5204, simulator 5205, netscan 5206, modbus-master 5207, scpi 5208, plot 5209, port-inspector 5210, plc-simulator 5211, hw-tester 5212)
2. `e2e` 폴더에서: `EDGEDRIVER=<msedgedriver.exe 경로> node ui-preview/shots.mjs [앱]` → `shots/ui/*.png` + `probe.json`(잘린 칸 목록)
- 경우: 최소 창(1000×640) 한국어 대기·연결, 영어, 넓은 창 어두운 테마, 글자 17px, 설정 창
- 가짜 응답이라 상태 문구·사건 줄 내용은 실제와 다를 수 있다. 실제 동작 확인은 위 실기 점검으로.

### 가짜 백엔드(`ui-preview/mock.js`)
실제 명령 이름·반환 모양(`apps/*/src-tauri/src/lib.rs`)과 사건 모양(`crates/core/src/event.rs`)을 따른다.
- 연결하면 상태(연결됨·재연결 대기·닫힘 / 듣는 중·상대 / 받는 중)와 프레임(RX·TX·EV, 체크섬 맞음·틀림, 상대 주소)을 주기적으로 보낸다. 끊기·멈춤은 «닫힘» 상태를 따로 보낸다.
- «보낼 바이트» 는 실제 규칙대로 만든다(HEX·ASCII 이스케이프 + 체크섬 + 줄 끝, 틀리면 같은 오류 문구).
- 일부러 실패하는 입력: 시리얼 `COM9`(사용 중), 목록에 없는 포트(찾을 수 없음), TCP·UDP 포트 `445`(사용 중), TCP 클라이언트 `10.0.0.99`(시간 초과 → 재접속 대기), 주소 `nohost`(찾지 못함), UDP `x.x.x.255` 를 브로드캐스트 허용 없이(접근 거부).
- 시험용 손잡이 `window.__pdMock`: `dialog = { ask, save, open }`(확인 창 답·저장/열기 경로, 기본 «아니오»·취소), `unplug()`(장치 뽑힘 → 자동 재연결이면 1.5초 뒤 다시), `plug(true)`(블루투스 COM7 꽂기), `error(msg)`, `calls`·`files`, `noApp`(다른 PortDock 프로그램을 찾지 못한 것처럼)·`openedApp`(연 대상), `pendingCrash`(오류로 꺼진 기록 하나 — 주소 `?pendingCrash=1` 로도), 명령줄 인자는 주소 `?args=[...]`(JSON 배열).

## 다 눌러 보기 점검 (`ui-preview/smoke.mjs`)
미리보기 서버 열두 개(위 1번, 5201~5212)를 띄운 뒤 `e2e` 폴더에서:
```
EDGEDRIVER=<msedgedriver.exe 경로> node ui-preview/smoke.mjs [앱]      (예: node ui-preview/smoke.mjs tcp)
COMBO=ko-light node ui-preview/smoke.mjs serial                         (한 경우만 빨리)
```
- 경우: 최소 창 안쪽 984×601 에서 한국어·영어 × 밝게·어둡게. `ko-light`·`en-dark` 는 설정 «모두 펼치기(전문가 화면)» 를 켠 채 띄워 접기 속까지 전부 누르고, `ko-dark`·`en-light` 는 접힌 기본 그대로 열기·대화상자·연결·멈춤만(`ko-dark` 는 설정 창에서 «모두 펼치기» 를 켜고 끄며 접기가 따라 바뀌는지도 본다).
- 쉽게 쓰기 2차(10/18): Serial 도구 막대 한 줄·«보기 설정 ▾»·연결 요약 [바꾸기]·«받기도 Modbus 로» 알림줄·요청 창 «따라하기 보기», Slave 첫 실행 카드(주소 표기·예제 채우기·CSV)·Shift+클릭 여러 칸 형식·통신 기록 높이 막대, Net Scan 포트 칩·결과 줄 오른쪽 버튼 메뉴·Modbus 칩 «IP:502» 복사(두 주소만 찾아 빨리), Master 첫 실행 카드·«값 기록 ▾», TCP 방식 탭·모두 끊기·502 알림줄, TCP·UDP «⋯ 더보기»·좁은 창 줄 누르기 → 상세.
- 하는 일: 모든 버튼·고르기(항목마다)·체크(두 번)·입력칸(빈칸·0·음수·아주 큰 수·영문·한글·Enter)을 멈춘 상태와 연결한 상태에서 건드린다. 새로 뜬 창도 그 안을 눌러 본 뒤 Esc·✕ 로 닫는다. 확인 창은 «아니오» 로 한 번, «예»·저장 경로가 있는 채로 한 번.
- 따로 보는 것: ?·F1 도움말 → Esc, ⚙ 설정 → ✕, ! 문제 보고 → Esc 뒤 포커스가 제자리로 돌아오는지 · 연결/시작 뒤 2초 안에 «연결 중» 이 풀리는지 · 입력칸 Enter·보내기 버튼(누른 뒤 입력칸으로 돌아오는지) · 장치 뽑힘→재연결 · 바쁜 포트·안 붙는 주소 오류 · 저장해 둔 포트가 없어졌을 때.
- 편의성(10/17, `ko-light`·`en-dark`): 창 제목 · 로그 따라가기(위로 굴리면 멈춤·«↓ 맨 아래로»·End·줄을 눌러도 안 꺼짐) · 누르기/Shift/Ctrl 고르기와 Ctrl+C · 우클릭 메뉴(C 배열 복사·Esc) · 단축키(Ctrl+L·Ctrl+S·Ctrl+Shift+L·F4·Esc 반복 멈춤) · 숫자 칸 ↑/Shift+↑/PageDown·속도 목록 · HEX↔ASCII 표기 바꾸기·체크섬 알림줄 · 명령 목록(추가 뒤 이름 칸 포커스·↓·Alt+↑·Enter 보내기·복제·지우기→되돌리기) · Slave 레지스터 칸 ↓↑·Esc·여러 값 붙여넣기·슬레이브 되돌리기 · Simulator 규칙 되돌리기 · 📌. 복사한 글은 `navigator.clipboard.writeText` 를 가로채 `__smoke.clip` 에서 본다.
- Serial·TCP·UDP 공통 기능(10/18, `ko-light`·`en-dark`, `ioFeatures()`): 입력 이력 ↑↑↓↓(고치던 글로 돌아오는지) · 명령 단축키 F7(겹침 막기·키로 보내기) · 트리거(색칠·TRIGGER 사건 줄·횟수) · 간격 열(«직전 줄과 간격»·줄 복사에 들어가는지) · 처리량 표시 · 체크섬 옵션(BCC 앞 1·끝 1 → 미리보기 «02 41 42 03 03», Esc 로 닫힘) · 반복 3번 뒤 멈춤 · Serial Break·터미널 보기 · Serial·TCP 파일 보내기(가짜 4096바이트 진행 → «다 보냈습니다»). 캡처 `<앱>-*-triggers`·`-delta-trigger`·`-terminal`·`-file-sending`.
- 첫 실행(10/18): Serial «무엇을 하나요?»·Slave·Net Scan «처음 쓰는 순서» 카드 모양과 도움말 링크(그 절로 열리는지, 네 경우 모두). `ko-light`·`en-dark` 는 Serial «Modbus 장비 값 읽기» → 용도·보내기 형식·예시 2개 → 속도를 고쳐 «(바꿈)»·↺ → 용도 «AT 명령», Serial·TCP·UDP 빈 명령 목록 «예시 넣기» → 되돌리기. 캡처 `<앱>-*-first-card`·`serial-*-preset-at`.
- 용어(10/18, 네 경우 모두): Serial·TCP 요청 창 국번 칸 이름이 «국번(슬레이브 ID)»/«Slave ID», Slave·Master 화면에 그 이름이 있고, 옛 이름(슬레이브 주소·유닛 ID·Unit ID (slave address))이 화면에 없는지.
- Modbus 응답 짝짓기(10/18, `ko-light`·`en-dark`): Serial 요청 창 «보내기» 뒤 응답 줄이 저절로 골라지고 상세 «요청과 짝» 에 «40001 = 값 (0x….)» 10줄·F32 ABCD 5줄, 41001(가짜 장비의 1000 이상)은 예외 02 이름. TCP 는 MBAP 요청(트랜잭션 42)을 보내 응답 줄을 누르면 «트랜잭션 42» 짝·값 4줄. 가짜 백엔드는 RTU·MBAP 읽기 요청에 맞는 응답을 돌려준다(0 = 1812, 1 = 0xFFFF, 2·3 = F32 3.14, 그 밖 주소×10, 1000 이상 예외 02). 캡처 `serial-*-mb-pair`.
- 장비 프로필(10/19, `ko-light`·`en-dark`): Master «장비 프로필…» 창(목록·레지스터 표·주의 문구·출처, 찾기 «zzzz» → 0개) → 마지막 장비 «불러오기» → 창에 안내한 수만큼 표가 더해지고 칸 이름이 붙는지, 더한 표는 다시 지운다. Slave «장비 흉내…» → 불러오기 → «레지스터 n개를 국번 …» 알림·이름 붙은 칸. 캡처 `modbus-master-*-mm-device*`·`modbus-slave-*-slave-device*`.
- 좁은 창(네 경우 모두): 안쪽 760×600 에서 왼쪽 칸이 접히고 요약 줄이 보이는지, «⚙ 연결 설정» 으로 펼쳐도·연결해도 넘치지 않는지. 캡처 `<앱>-*-narrow-760-*.png`.
- 0.3.0 편의 기능(10/26, `ko-light`·`en-dark`): 최근 연결 «▾»(TCP·Master·SCPI — 연결에 성공한 주소가 목록에 남고, 고르면 칸이 채워지고, ✕ 로 지워지고, Esc 로 닫힘. Master 는 Modbus TCP 로 한 번 연결해 본다) · 포트 고르기 «직접 입력…»(Serial·Master — `COM0` 은 확인이 막히고 오류 문구, `com20` → COM20 «(직접 입력)») · 로그 칸 키보드(Serial·TCP — 줄을 누른 뒤 ↓·↑·Home·End 로 고른 줄이 바뀌고 End 는 다시 따라가기) · 상세 «복사»(Serial) · 다른 프로그램으로 열기(Serial «Modbus Master 로 열기»·TCP 502 알림줄·Net Scan «TCP 로 열기»·Port Inspector «Serial 로 열기» — `__pdMock.openedApp` 에 대상, `noApp = true` 면 복사 + 알림 «내려받기 페이지») · 글자 크기 Ctrl+= 두 번·Ctrl+0(Serial, 설정 fontSize) · 새 버전 알림(UDP — 오늘 확인한 결과 9.9.9 를 넣고 다시 열면 알림줄, 언어 섞임·넘침 없음, 760 너비도, «이 버전은 그만 알리기» 로 사라짐, 바깥 요청 없음) · 오류로 꺼진 기록 묻는 창(Simulator — 760 너비에서 `?pendingCrash=1` 로 열면 보이고 «나중에» 로 닫힘). `ko-light` 만: 명령줄 인자(Serial `?args=["--port","COM3","--baud","19200"]` → COM3·19200, TCP `["--connect","10.0.0.5:5000"]` → 클라이언트·주소·포트, 연결은 하지 않음). 캡처 `<앱>-*-manual-port`·`-update-note*`·`-pending-crash-760`.
- 다 눌러 보기 시간 한도: 본 화면 90초·새로 뜬 창 40초, TCP·Serial 은 요소가 많아 180초·80초(`BUDGET`). 넘으면 «시간 초과로 일부만 눌렀습니다» 로 남는다. 좁은 창(984)에서 줄·«명령 목록» 을 눌러 열린 오른쪽 서랍은 실행 버튼을 누르기 전에 ✕ 로 닫는다(덮개 `.backdrop` 이 버튼을 가린다 — 앱의 의도된 동작).
- 매 동작 뒤 확인: 잡히지 않은 예외·거부된 Promise·console.error, 화면 오류(Boundary), 창 밖으로 넘친 요소·가로 스크롤, 창보다 큰 대화상자, 글자가 잘린 버튼, 값이 목록에 없는 고르기.
- 결과: 화면에 경우별 ✅/❌ 와 누른 횟수, `shots/smoke/<앱>.json`(같은 문제는 묶어 횟수·단계와 함께), 문제가 난 단계의 캡처 `shots/smoke/<앱>-*.png`. 문제가 있으면 종료 코드 1.
- 가짜 백엔드라 «화면 쪽» 버그만 찾는다. 실제 통신·타이밍 문제는 위 실기 점검으로.

### AI 에게 물어보기용 복사 (0.8.0, `aiCopyCheck()`)
Serial·TCP·Modbus Master 는 연결 중(최근 통신 기록), Port Inspector 는 COM5 를 고른 뒤(점검 결과) 머리줄 «AI» 를 눌러 네 경우 모두: 미리보기 첫 줄이 앱 언어의 질문 틀인지, 8,000자 이하·금지 낱말·사용자 폴더 없음, 기록 줄(«시각 방향 HEX | 글자 | 풀이»)·점검 결과 칸, «사설 IP 도 가리기» 가 처음엔 꺼져 있고 켜면 사설 IP 가 «[IP-n]» 으로 바뀌고 끄면 처음 글로 돌아오는지, «복사» 가 미리보기 그대로 클립보드에 들어가는지, Esc 로 닫히고 포커스가 돌아오는지. 나머지 앱은 «다 눌러 보기» 가 그 창을 연다. 이 클론처럼 다른 미리보기 서버와 겹치면 `SMOKE_PORT` 로 포트를 바꾼다.

### Port Inspector·Serial «연결 점검…» (10/25)
`node ui-preview/smoke.mjs port-inspector`. Port Inspector 는 실행 버튼이 없는 읽기 앱이라 공통 흐름 대신 `inspectorFlow()` 를 돈다.
- PLC Simulator(5211, 10/29): 가짜 백엔드는 시작하면 클라이언트 둘(UDP 는 보내온 곳 하나)이 붙고 0.45초마다 «0401 D0 ×4 읽기», 다섯 번에 한 번 «1401 D100 쓰기» 를 주고받는다(풀이 줄 포함). 공통 흐름(대기·시작·다 눌러 보기·편의성·좁은 창)만 돈다 — 보내기 칸이 없어 반복 보내기·표기 바꾸기는 건너뛴다. (0.6.0) 시작한 뒤 `plcRun()`: 네 경우 모두 «규칙» 창 «예제 넣기»(두 규칙·요약 «M100 ON → 300 ms → M101 ON»·실행 횟수·RULE 줄 — 가짜 백엔드는 켠 첫 규칙을 네 박자마다 «실행» 한 것처럼 알림)·Esc, «흉내 PLC 상태» STOP(노란 줄)→RUN, 형명 칸(한글이면 빨강·«TEST-PLC» 반영), D0 «표시» ASCII 에 «AB» → 4241h·바이트 «66 65»·U16 «16961», «채우기…» D10 부터 5칸 100·102…, M0 칸 누르기 반전. `ko-light`·`en-dark` 는 더해서 규칙 고치기(틀린 주소 오류·«여러 개 만들기» 3개·간격 2·지우기·끄고 켜기·고치기 중 Esc), 문자열 «ABC» → D20·D21, 숫자 목록, 틀린 시작 번호. 다른 클론의 미리보기 서버와 겹치면 `SMOKE_PORT=5311 node ui-preview/smoke.mjs plc-simulator` 처럼 포트를 바꾼다. 실제 MC 프로토콜 동작은 `cargo test -p portdock-core mc::`(매뉴얼 예시 고정 시험)와 127.0.0.1 교차 시험(`cargo test -p portdock-plc-simulator --lib cross_server -- --ignored`)으로 본다.
- Hardware Tester(5212, 10/30): 실행 버튼이 왼쪽 칸에 없는 기록 앱이라 `hwFlow()` 를 돈다. 가짜 백엔드(mock.js «Hardware Tester»)는 «기록 시작» 하면 90박자 치 지난 기록(게이트웨이 17번째마다 손실·Wi-Fi 끊김 사건 하나 → 요약 «공유기 쪽»)을 한꺼번에 보내고 간격마다 하나씩, 대상 `10.255.255.1` 은 인터넷만 손실(«공유기 너머»). 네 경우 모두: 첫 실행 카드·?·⚙·! 창, 바깥 대상 안내 줄, 기록 시작·요약·사건·보이는 길이, 요약 복사(금지 낱말 없음)·CSV 저장, 기록 중 칸 잠김, 잘못된 대상이면 시작 막힘, 신호(누르기 전 호출 없음 → ok → 위치 권한 없음·무선 랜 없음 → 멈추면 호출 없음), 블루투스 기록(이름은 화면에만, 복사는 «장치 N»), 소리(핸즈프리 «볼 것»·좌우 소리), 다음 판 자리 여섯, 탭마다 금지 낱말, 좁은 창. `ko-light`·`en-dark` 는 탭마다 다 눌러 보기.
- 가짜 장치(mock.js «Port Inspector» 부분): COM3 CH340(문제 없음) · COM5 FTDI(지연 타이머 16ms·절전 켜짐 → «볼 것», 3일 전 하루 세 번 다시 연결) · COM1 내장 포트(루프백에서 아무것도 돌아오지 않음) · COM9 Prolific(문제 코드 10, 시험하면 «사용 중») · 숨은 COM12(지금 없음). ComDB 예약 1·3·4·5·9·12·17(주인 없음 4·17), 랜카드 셋(1 Gbps 전이중·10 Mbps 반이중·연결 안 됨).
- 네 경우 모두: 첫 실행 카드·도움말 링크, ?·⚙·!·F1 창(닫은 뒤 포커스), COM5 카드 결과(장치 문제 없음·설정/절전/기록 «볼 것»)·창 제목·지연 타이머 풀이·이벤트·기간 7일·COM 번호·«PC 가 볼 수 없는 것»(가이드 링크 5개)·랜카드, 루프백(묻고 시작 → 속도 5개 «볼 것»)·에코·시험 중 멈춤, 텍스트·JSON 복사(금지 낱말 없음)·JSON 저장, COM9 문제 코드·«사용 중» + Find Handle 안내, COM1 «돌아오지 않음», 숨은 장치(COM12 시험 막힘·이유), 화면 전체 금지 낱말(진단·검증 …) 없음, F4, 좁은 창(고르면 왼쪽 칸 닫힘). `ko-light`·`en-dark` 는 포트를 고른 상태에서 다 눌러 보기도.
- Serial(네 경우): 끊긴 상태에서 «연결 점검…» → 장치 요약 결과 3개 이상·루프백 5개 → Esc(포커스 제자리), 연결 중에는 시험이 막히고 «연결을 끊은 뒤» 이유(연결 설정이 한 줄로 접혀 있으면 [바꾸기] 로 펼쳐서).

### SCPI·Plot 앱별 단계 (10/19 — 옛 `smoke-scpi.mjs`·`smoke-plot.mjs` 를 smoke.mjs 공통 흐름에 합침)
`node ui-preview/smoke.mjs scpi` · `node ui-preview/smoke.mjs plot`. 공통 흐름(첫 실행·도움말·⚙·문제 보고·다 눌러 보기·연결·좁은 창·멈춤, `ko-light`·`en-dark` 는 «모두 펼치기» 켠 채) 안에서 아래를 더 한다.
- SCPI 가짜 계측기(mock.js SCPI 부분): `*IDN?` → `PORTDOCK,SCPI-SIM,0001,1.0`, `MEAS:VOLT:DC?`·`READ?` → 5 V 근처, `MEAS:RES?` → 9.9E37(넘침), `DATA?` → PNG 머리 300바이트 블록(`#3300`), `*OPC?` → 0.4초 뒤 1, 모르는 명령 → 오류 큐 -113(질의면 시간 초과), `SLOW?` 답 없음, `NOEND?` 줄 끝 없는 답, 주소 `10.0.0.99` 연결 시간 초과, 포트 445 거부, 시리얼 `COM9` 사용 중. 기다림은 0.9초까지만.
- SCPI(네 경우): 첫 실행 카드와 도움말 «Simulator 로 따라하기» 절 → 연결·`*IDN?` 장비 칸·창 제목 → 질의(자주 쓰는 명령 뜻) → 반복 측정 5번(표·통계·추세) → 좁은 창 760(명령 목록 열기) → 끊기 → 연결 실패(10.0.0.99) 안내. `ko-light`·`en-dark` 는 더해서 쓰기·시간 초과·오류 큐(-113 → 없음)·줄 끝 없는 답·블록 HEX·파일 저장·`*OPC?`·이력 ↑·명령 목록 예시·통신 기록 빨간 줄·CSV·넘침.
- Plot 가짜 장비(mock.js Plot 부분): 받기 시작하면 0.05초마다 10줄(200 Hz) — 머리글 `sin,cos,noise` 다음 사인파(±10)·코사인(20±5)·잡음 CSV 값, 3초마다 해석 실패 줄 `ERR? overflow`. 시리얼 `COM9` 사용 중, TCP `10.0.0.99` 는 «다시 연결하는 중»(값 없음), UDP 포트 445 묶기 실패, 기록 경로에 `readonly` 면 거부. 해석은 Rust 몫이라 가짜 백엔드는 만든 숫자를 그대로 넘긴다.
- Plot(네 경우): 첫 실행 카드와 도움말 «Simulator 로 따라하기» → COM3 받기·채널 표(sin·cos·noise)·**그래프가 실제로 그려졌는지(canvas 에서 첫 채널 색 점 수)**·창 제목·받은 양 → 원시 수신의 빨간 실패 줄 → 그래프 두 번 눌러 측정점 A·B(Δt·Δn·채널 Δ) → 좁은 창 760 → 멈추기·지우기 → 시작 실패(COM9) 안내. `ko-light`·`en-dark` 는 더해서 멈춤(+n)·실시간, 휠 확대(저절로 멈춤)·두 번 누르기(실시간, 측정점 그대로), 오른쪽 축·숨기기·이름 바꾸기, Y 고정, 최근 초, CSV 기록 파일(머리 줄·줄 수), 화면 CSV, PNG, 바이너리 형식(틀린 시작 바이트 알림·프레임 길이).
- 결과는 다른 앱과 같이 `shots/smoke/scpi.json`·`plot.json` + 캡처.

### 바깥 네트워크 막기 (10/19)
오류 자동 전송(Sentry DSN, `shared/report.ts`)이 켜져 있어 문제 보고 창에 «지금 바로 보내기» 가 보인다. 미리보기·smoke 가 실제로 보내지 않게:
- `mock.js` 가 `fetch`·`sendBeacon` 을 가로채 같은 서버(vite) 말고는 보내지 않고 200 으로 답한 뒤 `window.__pdMock.net` 에 남긴다.
- `vite.config.mjs` 가 `Content-Security-Policy: connect-src 'self' ws://localhost:*` 를 붙여, 가로채기를 빠져나간 요청도 브라우저가 막는다. smoke 는 이렇게 막힌 요청(`securitypolicyviolation`)을 오류로 센다.

## 사용 통계 묻는 창 점검 (`ui-preview/usage.mjs`)
공개 저장소에는 통계 키가 비어 있어 묻는 창·설정 칸이 숨는다. 미리보기 서버를 `USAGE_PREVIEW=1` 로 띄우면 가짜 키를 넣어 보인다(바깥 요청은 mock.js·CSP 가 막는다).
```
USAGE_PREVIEW=1 APP=serial PORT=5201 npx vite --config e2e/ui-preview/vite.config.mjs      (저장소 루트)
EDGEDRIVER=<msedgedriver.exe 경로> node ui-preview/usage.mjs [앱…]                          (e2e 폴더, 기본 serial)
```
- 한국어·영어 × 밝게·어둡게, 안쪽 984×601·800×600 에서 잘림·넘침·다른 언어 글자 섞임, 열린 채 언어 바꾸기, ✕ = «보내지 않기», 설정 칸, 다시 띄워도 묻지 않음. 캡처 `shots/usage/`.
- 다 눌러 보기(`smoke.mjs`)는 이 서버 말고 보통 서버(`USAGE_PREVIEW` 없이)로 돌린다 — 묻는 창이 다른 버튼을 가린다.
