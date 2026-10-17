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
