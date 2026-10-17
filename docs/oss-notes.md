# 오픈소스 도구에서 배운 것 (2026-10-17)

소스를 **읽기만** 했다(빌드·실행 없음). 코드는 옮기지 않고 아이디어만 쓴다. 비공개 프로그램 디컴파일은 하지 않는다.

| 도구 | 라이선스 | 비고 |
|---|---|---|
| chenxuuu/llcom | Apache-2.0 | C#, Lua 스크립트 |
| SuperStudio/SuperCom | GPL-3.0 | C# |
| YAT (SourceForge SVN) | LGPL-2.1 | C#, 일부 파일만 |
| wh201906/SerialTest | src GPL-3.0 / 문서 MIT | Qt, 시리얼·TCP·UDP·BLE |
| Neutree/COMTool | LGPL-3.0 | Python |
| Serial-Studio | 파일별 SPDX — `GPL OR Commercial` 만 읽음, Commercial 단독(Pro: Modbus·CAN·MQTT 등)은 제외 | Qt |
| s00d/tauri-plugin-serialplugin · Gyanano/RSerialDebugAssistant | MIT/Apache · MIT | Tauri |
| serialport/serialport-rs 4.10 | MPL-2.0 | 우리가 쓰는 라이브러리 — 윈도우 소스·이슈 확인 |

## 이미 반영 (v0.1)
- 송신 큐 스레드: 부분 쓰기 이어 쓰기, `flush()` 안 부름 — serialport-rs 윈도우는 읽기·쓰기 timeout 이 하나(com.rs:275-280), FlushFileBuffers 는 흐름 제어로 막히면 무한 대기(#60·#124·#149, 플러그인 #29).
- 끊기면 핸들을 먼저 닫고 재연결 — 단독 열기라 쥐고 있으면 Access denied(com.rs:62).
- 1초마다 목록에서 장치가 사라졌는지 감시 — 뽑혀도 TimedOut 만 내는 드라이버(YAT SerialPort.cs:2342-2385, 플러그인 #27).
- 일련번호 없는 장치(CH340)는 «같은 VID:PID 로 새로 생긴 포트가 하나뿐» 이면 재연결.
- 무거운 명령(list·open·close·send·log)은 async — Tauri 2 동기 명령은 메인 스레드.
- 프레임 최대 16KB, 시각은 첫 바이트 기준(SuperCom #15 반대 사례).
- USB 변환기 16ms 안내(FTDI LatencyTimer, serialport-rs #275).

## 남은 아이디어 (우선순위 순)
1. **자동응답(수신 패턴 → 응답)** — 비교한 도구 어디에도 전용 기능이 없음. 차별점.
2. 전송 계층 trait(시리얼·TCP·UDP 공유) — Serial Studio HAL_Driver.h:203, SerialTest connection.h.
3. 화면 상한을 바이트 기준으로, 넘치면 오래된 것부터 버리고 «버린 개수» 표시 — RSerial bus.rs:75-83, Serial Studio PipelineHost.
4. 바이트를 JSON 숫자 배열 대신 raw 로 묶어 전송(크기 3~4배 절감).
5. 포터블 설정: exe 옆 설정 파일이 있으면 그것, 없으면 AppData. 원자적 쓰기(임시→이름 바꾸기), 백업 — SerialTest main.cpp:35-63, LLCOM Global.cs, COMTool #114.
6. 드라이버 버퍼 키우기(SetupComm, baud×0.02) — Serial Studio UART.cpp:45-80.
7. 표시 열: 간격(delta)·길이 — YAT DisplaySettings.
8. 체크섬 계산 범위·삽입 위치(음수 인덱스) — SuperCom.
9. CR·LF 가 다른 조각으로 와도 빈 줄 안 생기게 — Serial Studio #199.
10. 컨트롤 패널(값 바뀌면 전송, JSON 내보내기) · 간단 그래프(구분자→숫자) — SerialTest.
11. 스크립트를 넣는다면 샌드박스 + 시간 제한(Serial Studio JS 500ms 워치독, Lua 안전 라이브러리) — COMTool 은 설정 JSON 로드만으로 임의 코드 실행.

## Tera Term · RealTerm (2026-10-17, 소스 읽기)
라이선스: Tera Term 3-clause BSD(CygTerm+ 만 GPLv2) · RealTerm 은 SF 메타데이터상 BSD, 코드 저장소는 비공식 미러(RavWin/RealTerm)뿐이고 LICENSE 없음 → 아이디어만.

가져올 것:
1. 대기·응답 시험 시퀀스 — 보내기 → 후보 여럿(문자열·정규식·N바이트) 중 하나 기다림 → 인덱스·캡처 그룹·ms 타임아웃 → 분기, 보내기 전 수신 비우기 (TTL wait/waitregex/flushrecv, ttl.cpp:5484-5578, 2227). 자동응답과 같은 엔진.
2. 재연결 정책 — 다시 꽂힌 뒤 대기(정상 500 / 이상 2000ms), 1초 간격 3회, 마지막 실패에서만 알림, «시작할 때 포트 없으면 기다림» (vtwin.cpp:327-520, 3783).
3. 열 때 수신 버퍼 비우기 옵션 — 끄면 부팅 메시지 보존 (commlib.c:156, #452).
4. 송신을 출력 큐 빈 공간·1회 상한으로 쪼개기, 문자·줄 지연 (commlib.c:1023-1029, #1000 대량 송신 유실·BSoD).
5. 타임스탬프 4종: 로컬·UTC·로그 시작 후·접속 후 (filesys_log.cpp:646-676).
6. 숫자 보기: int8/16/32·float·부호·엔디안·한 줄 N바이트 (RealTerm 12 모드, realterm1.pas:2646-2700).
7. 프레임 동기 패턴(+마스크) 강조·개수 (HexEmulator.pas:91-111).
8. 로그 회전·캡처 종료 조건(시간·바이트·줄) 뒤 자동 재시작 = 파일 분할, 시각 붙은 파일 이름.
9. 회선 오류 종류(overrun·parity·framing·break) 표시 (realterm1.pas:2122-2135). Break 송신.
10. 명령줄 = 설정 파일 같은 문법, 실행 중 인스턴스로 명령 전달, 종료 코드로 시험 결과 (RealTerm ParameterMatch.pas).
11. 포터블: exe 옆 portable.ini 있으면 그 폴더, 저장 전 날짜 붙은 백업 (Tera Term ttlib_static_dir.cpp:62-175).
12. SetupComm 입력 64KB, 쓰기 timeout 500ms (commlib.c:103-165).

피할 것: USB 장치 전체 알림 구독(마우스에도 반응, #435) · UI 스레드에서 읽기(#1290 송신 지연) · 재시도마다 오류 팝업 · Spy(커널 드라이버).
