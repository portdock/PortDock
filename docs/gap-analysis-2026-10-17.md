# 경쟁 도구와 비교한 빈 곳 (2026-10-17 저녁)

세 갈래로 공식 문서·소스를 보고 지금 코드와 대조했다(코드 읽기만, 실행 안 함). 이미 고친 것·미룬 것은 `persona-review-2026-10-17.md` 와 겹치지 않게 했다.
- 시리얼: Docklight·RealTerm·Hercules·YAT·CoolTerm·Tera Term·Termite·PuTTY·SerialTool·Serial Studio·SerialPlot·HTerm·ScriptCommunicator·LLCOM·COMTool·Bray
- Modbus·시뮬레이터: Witte Modbus Slave/Poll·diagslave/modpoll·ModRSsim2·pyModSlave·ModbusPal·pymodbus 시뮬레이터·Node-RED·Docklight 자동응답·Packet Sender·HHD·Termission
- TCP/UDP·배포: Hercules·Packet Sender·SocketTest·NetAssist·sokit·ncat · 배포는 Packet Sender·Serial Studio·YAT·CoolTerm·Tera Term·Witte

## 이미 앞서는 점 (유지할 것)
- 같은 장치로 자동 재연결(COM 번호가 바뀌어도), 연결 중 설정 변경 + 사건 줄(SET·LOST·RECONNECT) — 비교한 도구 중 없음
- 보낼 바이트 미리보기, 상호잠금 경고, 프레임 구분 4종 + 수신 체크섬 자동 검사(일반 TCP 도구에는 없음)
- 와일드카드 `**`(0개 이상) — Docklight 는 `?`·`#` 만, 규칙별 응답 횟수·NO MATCH·가장 가까운 규칙, 규칙 개수 제한 없음
- Modbus Slave: 쪼개진 요청을 길이로 다시 붙임, 지연 중 BUSY, 한 창에 슬레이브 여러 개, 표 값 자동 저장(Witte 작업공간은 데이터 저장 안 함)
- TCP: keepalive·자동 재접속·끊긴 상대로 잘못 보내기 방지·에코 핑퐁 차단, UDP 같은 포트 장비 구분
- 배포: 관리자 권한 없는 설치판 + 휴대판, SHA256·VirusTotal 절차, 제3자 고지, 개인정보 방침(데스크톱 원격 측정 방침을 쓴 무료 도구 없음), 한국어

## 빈 곳 — 묶음별 우선순위
크기: S(하루 안) · M(며칠) · L(일주일+). ★ = 현장 영향이 큰 것. ✅ = 넣음(10/18, 코드·단위 시험·미리보기 점검 — 실기 확인은 `docs/test-plan.md`).

### 1차 — v0.1(11/1) 전에 넣을 수 있는 작은 것
| # | 무엇 | 앱 | 누가 가졌나 | 크기 |
|---|---|---|---|---|
| 1 ★ | ✅ 명령 단축키 F2–F12(F4 제외) · 입력 이력(↑↓, 50개) — `shared/CommandList.tsx`·`sendHistory.ts` | Serial·TCP·UDP | Termite·Hercules·YAT·Bray | S |
| 2 ★ | ✅ 직전 줄과의 간격(+12 ms)·TX→RX 응답 시간 열, 복사·화면 저장 포함 — `shared/liveStats.ts` | Serial·TCP·UDP | YAT·Docklight | S |
| 3 ★ | ✅ 글자 인코딩 UTF-8·CP949·Latin1·ASCII(표시·송신·파일 로그) — `shared/format.ts`·core `codec.rs`(encoding_rs). Slave·Simulator 는 아직 | 전부 | YAT·LLCOM·COMTool | S~M |
| 4 ★ | 이 PC IP·랜카드 목록에서 고르기(서버·멀티캐스트), 포트를 쥔 프로그램 표시 | TCP·UDP | Packet Sender | S |
| 5 | ✅ 처리량(bytes/s)·프레임 수·«마지막 수신 n초 전»·반복 횟수 제한(보낸 수) | Serial·TCP·UDP | Packet Sender | S |
| 6 | ✅ Break 송신 버튼(길이 ms, EV «BREAK 100ms») | Serial | PuTTY·YAT·Docklight | S |
| 7 ★ | Slave 통신 기록 풀이(«id1 FC03 HR 0..9 → OK»)·줄 수 설정·찾기 재사용 | Modbus Slave | ModRSsim2·pyModSlave | S |
| 8 | FC 16(마스크 쓰기)·17(읽기/쓰기)·2B/0E(장치 식별)·08/00(에코) | Modbus Slave | Witte | S |
| 9 | GitHub: 이슈 양식·Discussions·FUNDING·push 마다 시험 돌리는 CI | 저장소 | Packet Sender·Tera Term | S |

### 2차 — v0.2: Modbus TCP 와 «장비 흉내» 강화
| # | 무엇 | 앱 | 누가 가졌나 | 크기 |
|---|---|---|---|---|
| 10 ★★ | **Modbus TCP 슬레이브**(+ RTU over TCP, Unit ID 무시) — 길이 필드 프레임(MBAP) 일반형 | Modbus Slave | Witte·diagslave·ModRSsim2·ModbusPal 전부 | M |
| 11 ★★ | **레지스터 타입 32/64비트·float·문자열 + 바이트 순서(ABCD/CDAB/BADC/DCBA) + 칸 이름 + CSV 가져오기/내보내기 + 주소 기준 0/1** | Modbus Slave | Witte(28형식)·modpoll | M |
| 12 ★★ | **응답 템플릿**: 요청 바이트 되돌려 넣기(Modbus TCP 트랜잭션 ID 등)·카운터·랜덤·체크섬 범위/위치/엔디언 | Simulator | Docklight 는 스크립트로만, Packet Sender 매크로 | M |
| 13 ★ | 자동응답을 Serial·TCP·UDP 에도(엔진은 이미 core 에 있음) | Serial·TCP·UDP | Packet Sender·Termite·YAT | M |
| 14 ★ | 값 자동 변화(증가·랜덤·사인·램프, 주기·읽을 때마다) | Modbus Slave | Witte·ModbusPal·pymodbus | M |
| 15 ★ | 장애 대상 지정(ID·FC·주소)·N번째마다·확률·지연 범위 | Slave·Simulator | OPAL-RT·ModbusPal | S~M |
| 16 ★ | Modbus TCP 풀이·요청 만들기를 TCP 앱에도 | TCP | 전용 도구 | M |
| 17 | ✅ 파일 보내기(덩어리·줄, 진행·취소) + 문자·줄 사이 지연, 보내기 줄 «문자 간(ms)» | Serial·TCP | RealTerm·Hercules·YAT | M |
| 18 | ✅ 파일 로그 형식 HEX·ASCII·HEX+ASCII·CSV, 시간·크기로 나누기 — core `event.rs`. Slave·Simulator 는 설정 칸이 없어 HEX | 전부 | Docklight·RealTerm | S~M |
| 19 | ✅ 트리거: 패턴이 오면 색·소리·반복/기록 멈춤·사건 줄·창 깜빡임, 맞은 횟수 — `shared/triggers.ts`·`TriggerPanel.tsx`(화면에서) | Serial·TCP·UDP | YAT·Docklight·SerialTool | M |
| 20 | ✅ 체크섬 범위·위치·엔디언, CRC-32·범용 CRC(수신 검사도) — core `checksum.rs`·`shared/ChecksumOptions.tsx`. Simulator 규칙은 CRC-32 만 | 전부 | Docklight·YAT(약 50종) | M |
| 21 | ✅ Serial: Mark·Space 패리티, 1.5 정지 비트(DCB 직접), RS-485 RTS 방향 제어(드라이버 토글 → 안 되면 프로그램 토글). Slave 화면은 아직 | Serial·Slave | PuTTY·Docklight·Witte | M |

### 3차 — 큰 기능
| # | 무엇 | 크기 |
|---|---|---|
| 22 ★ | TCP 중계·모니터(HMI↔PLC 사이에 끼워 엿보기) | M~L |
| 23 ★ | 두 시리얼 포트 모니터(장치↔호스트) | L |
| 24 | 시퀀스(보내기→기다리기→분기, 반복) | L |
| 25 | ✅ 터미널 보기(CR/LF 줄, ANSI SGR 색, 줄 접기 — 커서 이동은 버림) — Serial, `shared/terminal.ts` | M |
| 26 | 이름 붙은 프로필 여러 개, 명령 목록 페이지 | M |
| 27 | 명령줄·자동화(헤드리스·종료 코드) | M |
| 28 | 스크립트(샌드박스) · 그래프 · Modbus ASCII · TLS | L |

### 배포·사이트
| # | 무엇 | 크기 |
|---|---|---|
| 29 ★ | **SignPath Foundation 무료 서명 신청**(Tera Term 선례) — 사용자 | 대기 |
| 30 | winget 등록(릴리스 작업에 자동 제출) | S |
| 31 ★ | 사이트 실제 화면(실기 점검 때 찍어서), JSON-LD 에 버전·내려받기·화면 | S |
| 32 | 가이드: TCP 클라이언트/서버 구분, UDP 브로드캐스트가 안 올 때, 다른 도구에서 넘어오기 | S |
| 33 | 선택형 «시작할 때 새 버전 확인»(하루 1번, 끌 수 있음) | S |
| 34 | 공장 PC 용 오프라인 설치판(WebView2 포함, +150 MB) | S |
| 35 | Sentry 를 설정할 때 개인정보 페이지 약속(EU·30일·IP 미저장)과 맞추기 — 사용자 | 월요일 |
