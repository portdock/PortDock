# 편의성 점검 (2026-10-17 밤)

코드 읽기로 «쓰다 보면 거슬리는 것» 을 찾았다(실행 안 함). 기능 빈 곳은 `gap-analysis-2026-10-17.md`, 여기서는 사용감만.
상태: ⏳ 할 일 · ✅ 고침

## 바로 고칠 12개
| # | 무엇 | 지금 | 고칠 방법 | 상태 |
|---|---|---|---|---|
| 1 | 위로 굴려 읽는데 새 줄이 오면 맨 아래로 끌려감 | 새 줄마다 맨 아래로 이동, 줄을 누르면 자동 스크롤이 꺼짐(Serial·TCP·UDP) | 맨 아래에서 벗어나면 따라가기 멈춤 + «↓ 맨 아래로 (새 줄 n)» 버튼, End 로 재개 — `shared/useFollowTail.ts` | ✅ `shared/useFollowTail.ts`·`FollowButton.tsx`(Slave·Simulator 는 `useSimpleLog.ts`), 줄을 눌러도 안 꺼짐 |
| 2 | 우클릭하면 브라우저 메뉴(새로고침·인쇄), F5·Ctrl+R 이면 화면이 새로 고쳐져 기록이 사라짐 | 막는 코드 없음 | 배포판에서 기본 메뉴·F5·Ctrl+R·Ctrl+P·개발자 도구 키 막기, 대신 자체 우클릭 메뉴 | ✅ `shared/browserGuard.ts`(배포판만) — 실기 확인 남음 |
| 3 | 로그 줄을 복사할 수 없음 | Ctrl+C·우클릭 없음 | 여러 줄 선택(Shift/Ctrl+클릭), Ctrl+C, 우클릭 메뉴: HEX·ASCII·둘 다·C 배열 복사, 다시 보내기, 명령에 추가 | ✅ `shared/logCopy.ts`·`LogMenu.tsx` — 다섯 앱(Slave·Simulator 통신 기록 포함) |
| 4 | 창 위치·크기를 기억하지 않음 | 늘 1200×760 | tauri-plugin-window-state | (Rust 쪽 작업 — 이 문서 범위 밖) |
| 5 | 작업 표시줄에서 어느 창이 어느 포트인지 모름 | 제목 고정 | 제목에 «COM3 115200 8N1 · 연결됨 ● REC — PortDock Serial» | ✅ `shared/useWindowTitle.ts` |
| 6 | 항상 위 없음 | — | 머리줄 📌 토글 + 설정 | ✅ `shared/PinButton.tsx` + 설정 «항상 위» |
| 7 | 화면 반쪽 맞춤으로 두 앱을 나란히 둘 수 없음 | 최소 너비 1000 | 760 으로 낮추고 좁을 때 왼쪽 칸 접기 | ✅ 900px 이하 왼쪽 칸 접기·요약 줄(`shared/NarrowBar.tsx`, `common.css`) — minWidth 760 은 Rust 쪽 |
| 8 | 연결·지우기·저장 단축키 없음 | F1·Ctrl+F 만 | F4 연결/끊기, Ctrl+L 지우기, Ctrl+S 화면 저장, Ctrl+Shift+L 파일 기록, Esc 반복 멈춤 | ✅ `shared/shortcuts.ts` — 말풍선·도움말 «단축키» |
| 9 | 보내기·▶ 를 누르면 포커스가 버튼에 남음, Simulator 먼저 보내기 칸은 Enter 안 됨 | — | 보낸 뒤 입력칸으로 포커스, Enter 송신 | ✅ (앞서 고침 — 0002177) |
| 10 | HEX↔ASCII 를 바꿔도 내용이 그대로라 엉뚱한 바이트가 나감 | 모드만 바뀜 | 바꿀 때 같은 바이트의 새 표기로 변환(ASCII 는 `\r` `\xNN`), 체크섬 질문은 알림줄로 | ✅ `shared/notation.ts`·`SendMode.tsx`(Serial·TCP·UDP·Simulator, 규칙 응답 포함) |
| 11 | 명령 순서 바꾸기·복제·더블클릭 보내기·목록만 내보내기 없음, 삭제마다 확인 창 | — | 공통 `shared/CommandList.tsx`: ↑↓·Alt+↑↓, 복제, 더블클릭·Enter 보내기, 추가하면 이름 칸 포커스, 내보내기/가져오기, 삭제는 «되돌리기 5초» 알림 | ✅ `shared/CommandList.tsx`·`Toast.tsx`, Slave 슬레이브·Simulator 규칙 지우기도 되돌리기 |
| 12 | 숫자 칸 ↑↓·휠 안 됨, Slave 레지스터 칸 Enter 가 다음 칸으로 안 감·붙여넣기 하나씩 | — | NumInput ↑↓(Shift ±10)·PageUp/Down·휠, 속도 칸은 목록 다음 값 / RegInput Enter·↓ 다음 칸, Esc 취소, 엑셀에서 여러 값 붙여넣기 | ✅ `shared/NumInput.tsx`, Slave `RegInput` |

## 그다음
- 같은 앱 두 번째 창이 이미 쓰는 포트를 고름 → 사용 중인 포트 빼고 고르기
- 줄바꿈 보기 토글(긴 프레임), 상세 칸 복사 버튼, 로그 키보드 이동(↑↓·Home/End), 화면만 잠깐 멈춤
- 화면 저장 파일 이름에 포트·시각
- 확인 창 대신 되돌리기 알림 — 슬레이브 지우기·규칙 지우기 ✅(10/17), Slave 채우기는 아직 확인 창. 오류 줄 닫기 ✕·«×n»
- 켤 때 마지막 연결로 자동 연결(설정, 기본 끔), TCP·UDP 최근 주소 목록, 모드별 마지막 주소
- 처음 켰을 때 예시 명령 2~3개
- 창이 뒤에 있을 때 끊기면 작업 표시줄 깜빡임(설정)
- 대화 상자 포커스 가둠·닫으면 원래 버튼으로, Modbus 요청 창 Enter=넣기·첫 칸 포커스
- ~~아이콘 버튼 aria-label, 어두운 테마 포커스 링~~ ✅ (10/17, `common.css` `:focus-visible`)

근거: Termite(항상 위·우클릭 복사·↑↓ 이력), YAT(Ctrl+L 지우기·복사 옵션). 나머지 도구 동작은 출처 미확인.

점검: `e2e/ui-preview/smoke.mjs` 의 `convenience()`·`narrow()` 단계(따라가기·고르기·Ctrl+C·우클릭 메뉴·단축키·명령 목록·숫자 칸·표기 바꾸기·되돌리기·📌·760 너비). 미리보기(가짜 백엔드)라 창 제목·항상 위·WebView 기본 동작 막기는 실기로 다시 본다.
