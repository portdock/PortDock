# 쉽게 쓰기 검토 (2026-10-18) — Serial · Modbus Slave · Net Scan

**질문:** 기능이 많이 붙은 지금도 처음 몇 분 안에 쉽게 쓸 수 있는가?

**어떻게 봤나**
- 화면 미리보기(`e2e/ui-preview`, 가짜 백엔드)를 Edge 헤드리스로 띄웠다. localStorage 를 비운 첫 실행 상태에서 1200×760·1000×640, 한국어·영어로 찍었다.
- 핵심 작업을 직접 눌러 클릭·입력·결정 수를 셌다.
- 경쟁 도구는 공식 문서·매뉴얼·README·소스의 UI 파일로 봤고, 실행하지는 않았다(클릭 수는 문서상 단계로 추정).
- 캡처: `docs/ease-of-use-2026-10-18/*.png`
- 가짜 백엔드라 화면·흐름만 본 것이다. Net Scan 이 130초 걸린 것은 가짜 응답 속도(주소당 0.5초)다.
- 앱 코드는 고치지 않았다.

**한 줄 결론**
- **Net Scan** 은 경쟁 도구만큼, 또는 그보다 쉽다.
- **Serial** 은 기능은 앞서지만, 첫 화면에 컨트롤이 57개이고 그중 약 15개는 대부분 안 쓴다. 기본값 둘(보내기 형식 HEX, 0 기준 주소)과 숨는 상세 칸이 첫 작업을 막는다.
- **Modbus Slave** 는 작업 걸음 수는 Witte 보다 적다. 대신 첫 화면이 «경고·장애 주입» 으로 겁을 주고, 실수형(F32) 설정이 숨어 있다.
- 기능을 없앨 필요는 없다. **접기·기본값·프리셋·첫 실행 카드**만으로 대부분 풀린다.

---

## 1. 앱별 결과

### 1-1. Serial

| 작업 | PortDock | 가장 쉬운 경쟁 도구 |
|---|---|---|
| 포트 열고 «AT\r\n» 보내기 | **클릭 5 + 입력 1, 결정 3**<br>연결 → 보내기 형식 HEX→ASCII(2) → 줄 끝 CR LF(2) → `AT` → Enter<br>(`AT\r\n` 을 직접 쓰면 줄 끝 고르기 2번이 빠진다) | **COMTool 약 4**: 포트·속도 → 열기 → `AT` → `<CRLF>` 체크 → Send<br>CoolTerm 5~6: Options 창에서 포트 고르기 |
| 국번 1 의 40001×10 읽고 값 보기 | **클릭 4, 입력 0**<br>Modbus 요청 → (기본값이 정확히 1/03/0/10) 입력칸에 넣기 → Enter → 응답 줄을 찾아 누르기<br>1000~1180 폭에서는 «☰ 명령 목록» 을 열어야 해서 +1 | Modbus Poll: F3 연결 + F8 정의, 약 8클릭. 그 뒤로는 주소가 붙은 표가 계속 갱신된다<br>OpenModScan: 같은 창의 칸에 바로 입력 |

**첫 화면 컨트롤 수**
- 1200 폭 **57개**: 버튼 26, 고르기 15, 입력칸 8, 체크 8
- 1000 폭 **49개**: 오른쪽 칸이 «☰ 명령 목록» 뒤로 숨는다

대부분이 안 쓰는데 기본으로 보이는 것(약 15개):
- RS-485 송신 방향, DTR·RTS
- 프레임 구분 + 조용한 시간, 수신 체크섬 검사 + ⚙
- 파일로 계속 저장
- 간격 열 고르기
- 문자 간 지연, Break + ms, 파일 보내기…
- 반복 횟수, 보내기 체크섬 ⚙

**헷갈리는 곳**

1. **보내기 형식 기본값이 HEX다.** AT·SCPI·NMEA 사용자는 매번 ASCII 로 바꿔야 한다.
   - 근거: `apps/serial/src/App.tsx:505` (`mode: "hex"`)
   - 캡처: `serial-first-1200-ko.png`
2. **줄 끝을 넣는 길이 둘이다.** `\r\n` 을 직접 쓰거나 «줄 끝 붙이기: CR LF» 를 고른다. 둘 다 하면 CR LF 가 두 번 붙는다.
   - 근거: `App.tsx:1103-1108`
   - 캡처: `serial-t1-typed.png`
3. **Modbus 요청 창에 «보내기» 가 없다.** «입력칸에 넣기» 를 누른 뒤 다시 Enter 를 쳐야 한다.
   - 근거: `shared/ModbusBuilder.tsx:263`, `App.tsx:1258-1262`
   - 캡처: `serial-t2-mbdialog.png`
4. **«0 기준» 칸에 40001 을 넣으면 경고 없이 주소 40001(0x9C41)을 읽는다.** 현장에서 가장 흔한 실수다. 장비는 예외 02 로 답하는데, 사용자는 «장비가 이상하다» 고 본다.
   - 근거: `shared/modbusBuild.ts:119-123`
5. **응답 값이 읽기 어렵다.**
   - 응답 줄을 로그에서 직접 찾아 눌러야 한다(요청과 짝지어 주지 않는다).
   - 값이 `[0] 1812 … [9] 61950` 처럼 10진 번호로만 나온다. 40001 같은 주소, HEX, 부호 있는 값, float 표시가 없다.
   - 근거: `App.tsx:1238-1248`
   - 캡처: `serial-t2-detail.png`
6. **창 폭이 1180 이하면 상세 칸이 아예 안 보인다.** 줄을 눌러도 화면에 아무 변화가 없고, 상세는 이름이 다른 «☰ 명령 목록» 버튼 뒤에 있다.
   - 근거: `apps/serial/src/App.css:521-546`, `App.tsx:965`
   - 캡처: `serial-t2-1000-detail-hidden.png`
7. **왼쪽 칸 순서가 거꾸로다.** 1000×640 에서 왼쪽 칸 높이는 809px 이다. 그래서 자주 바꾸는 «프레임 구분·수신 체크섬» 은 접힌 아래에 있고, 거의 안 쓰는 «RS-485·DTR/RTS» 는 위에 있다.
   - 근거: `App.tsx:787-815` 와 `841-918`
8. **말이 어렵거나 앱마다 다르다.**
   - «조용한 시간» (Idle gap), «간격 열 끔»
   - 같은 것을 «국번»(요청 창·상세)과 «슬레이브 주소»(Slave 앱)로 다르게 부른다
   - 근거: `apps/serial/src/i18n.ts:29,33`, `shared/ioText.ts:45`
9. **보내기 아래 둘째 줄에 컨트롤 9개가 한 줄로 붙어 있다.** 반복·ms·횟수·목록에 추가·문자 간·Break·ms·파일 보내기다. «Break 100 ms» 와 «반복 1000» 이 어느 칸 단위인지 헷갈린다.
   - 근거: `App.tsx:1116-1157`

### 1-2. Modbus Slave

| 작업 | PortDock | 경쟁 도구 |
|---|---|---|
| 슬레이브 1 보유 레지스터 0~9 에 값, 그중 하나는 float32 CDAB | **클릭 6 + 값 입력 9, 결정 2**<br>연결 → 칸 0 누르기 → 값마다 Enter(다음 칸으로 감) → 칸 8 의 ⋯(마우스를 올려야 보임)/우클릭 → 형식 F32 → 순서 CDAB → 저장 → 3.14 입력 | Witte Modbus Slave: F3 연결 창 + F8 슬레이브 정의 창(약 8클릭) → 값마다 더블클릭해 입력 창 → 칸 둘을 골라 Display 메뉴 «Float Little-endian byte swap»(이것이 CDAB 라는 대응은 문서에 없음) |

**첫 화면 컨트롤 수**
- 1200 폭 **135개**: 레지스터 칸 96 + 나머지 39
- 1000 폭 **102개**: 레지스터 칸 66 + 나머지 36

나머지 39개 가운데 대부분이 안 쓰는 것(약 10개):
- 장애 주입 4개와 «고급» 접기
- 통계 표, 초기화
- 표시·주소 표기·칸/목록 전환

**헷갈리는 곳**

1. **빨간 ⚠ 범위 경고가 늘 떠 있다.** 아무것도 안 했는데 첫 화면이 오류처럼 보인다.
   - 근거: `apps/modbus-slave/src/App.tsx:1428-1430`
   - 캡처: `modbus-slave-first-1200-ko.png`
2. **«장애 주입(시험용)» 이 기본으로 펼쳐져 있다.** 응답 지연, 응답 안 함, CRC 틀리게, 예외가 «연결» 바로 아래 칸을 차지한다.
   - 근거: `App.tsx:1209-1237`
3. **실수형을 만드는 ⋯ 버튼이 숨어 있다.** 마우스를 올리거나 포커스가 가야 보이고, 우클릭으로도 열리지만 안내가 없다. 사용자는 위의 «표시 U16▾» 에서 float 을 찾는데, 거기에는 U16/S16/HEX/BIN 만 있다. 칸별 형식과 표 전체 표시가 서로 다른 곳에 있다.
   - 근거: `apps/modbus-slave/src/App.css:805-821`, `App.tsx:1402-1411`
   - 캡처: `slave-t-celldlg-f32.png`
4. **주소 표기 기본값이 «0 기준» 이다.** 40001 로 생각하는 사람은 어느 칸이 40001 인지 따로 계산해야 한다. 고르기는 있지만 첫 실행에는 안내가 없다.
   - 근거: `App.tsx:1413-1420`
5. **1000×640 에서는 표가 32칸만 보이고, 화면 절반을 통신 기록이 차지한다.**
   - 캡처: `modbus-slave-first-1000-en.png`
6. 좋은 점: 칸에서 Enter 를 치면 다음 칸으로 가고, 엑셀 값 여러 개를 한 번에 붙여 넣을 수 있다. Witte 의 «값마다 입력 창» 보다 훨씬 빠르다.
   - 캡처: `slave-t-done.png`

### 1-3. Net Scan

| 작업 | PortDock | 경쟁 도구 |
|---|---|---|
| 이 PC 대역에서 장비 찾고 Modbus 장비 알아보기 | **클릭 1, 결정 0**<br>랜카드와 대역이 자동으로 채워져 있다 → 찾기<br>결과 표의 «서비스» 열에 Modbus 칩과 장치 식별(제조사·제품)이 바로 붙는다 | Angry IP Scanner: 1클릭. 포트는 Preferences 에서 정하고 Modbus 식별은 없다<br>Advanced IP Scanner: «IP» 버튼 + Scan 1~2클릭, 산업 포트는 모른다 |

**첫 화면 컨트롤 수:** **24개**(1000 폭 23)
- 그중 «찾는 방법» 9개(ARP·핑·핑 기다림·동시에·이름·산업 포트·포트 목록·포트 기다림·Modbus 정보)는 기본값이 맞아 거의 안 건드린다.

**헷갈리는 곳**

1. **«찾는 방법» 9개가 늘 펼쳐져 있다.** 왼쪽 칸 절반이다.
   - 근거: `apps/netscan/src/App.tsx:491-540`
   - 캡처: `netscan-first-1200-ko.png`
2. **확인할 포트가 숫자 나열이다.** «502, 2004, 5000-5010, 102, 44818, …» 라서 어떤 프로토콜인지 안 보인다(결과 칩에는 이름이 나온다).
3. **장비를 고르면 할 수 있는 일이 화면 맨 아래 줄에만 나온다.** 웹 열기·IP 복사·WoL·감시·Modbus 정보 읽기 같은 것들이다. 줄 우클릭 메뉴는 없고, 더블클릭은 80 포트일 때만 웹을 연다.
   - 근거: `App.tsx:611-612,669-721`
   - 캡처: `netscan-t-selected2.png`
4. **찾은 Modbus 장비를 Modbus 도구로 바로 넘기는 길이 없다.** IP:502 를 복사해 붙여 넣어야 한다. 지금 만드는 Modbus Master 와 이을 자리다.

---

## 2. 경쟁 도구는 고급 기능을 어떻게 숨기나 (요약)

| 도구 | 첫 화면 | 고급 기능 숨기는 방식 | 처음 쓰는 사람 돕기 |
|---|---|---|---|
| Docklight | Send/Receive Sequences + 통신 창 | Project Settings·Options 창, 프로젝트 파일(.ptp) | **환영 화면 + 예제 프로젝트**(ModemDiagnostics=AT 9600 8N1, ModbusRtuCrc) |
| Modbus Poll / Slave | 레지스터 표 하나 | **F3 연결 · F8 정의** 두 창, 칸을 골라 Display 메뉴(28가지 형식), «PLC Addresses (Base 1)» 체크 | 빠른 시작 페이지, 창마다 F1 |
| CoolTerm | 터미널 + 도구 막대 | **Options 창 하나**(페이지별), 설정 파일, Shift 로 켜면 초기화 | 사용 설명서뿐 |
| Serial Studio | Setup·Console·Dashboard 칸 | **«작동 방식» 라디오 3개, 각각 한 줄 설명** | 예제 폴더, 시작 안내 |
| Packet Sender | 한 줄 입력 폼 + 저장 패킷 표 + 로그 | 설정 탭, 패널·매크로 | 기본 예제 패킷, 이전 세션 복원 |
| COMTool / LLCOM | 송수신 설정 묶음 / 로그 + 빠른 보내기 | 플러그인 탭 / 페이지 | LLCOM 은 예제 스크립트(줄바꿈 붙이기 등) |
| OpenModScan / QModMaster | **표 위에 국번·시작·개수·형식 칸** | Display Definition 창, Extended 메뉴 | — |
| Angry IP Scanner | 범위 + Start + 표 | Preferences, «Fetchers» 고르기 | **첫 실행 때 5쪽짜리 시작 안내가 저절로 뜸** |
| Advanced IP Scanner | «IP» 버튼 + Scan + 표 | Options, 우클릭 메뉴(HTTP·FTP·RDP) | 도움말뿐 |

근거(대표):
- docklight.de/manual/examplesandtutorials.html
- modbustools.com/mbpoll-user-manual.html, modbustools.com/poll_display_formats.html
- freeware.the-meiers.org/CoolTermHelp
- github.com/Serial-Studio/Serial-Studio (`Setup.qml`)
- github.com/dannagle/PacketSender
- github.com/Neutree/COMTool (`plugins/dbg.py`)
- github.com/chenxuuu/llcom (`DefaultFiles/`)
- github.com/sanny32/OpenModScan (`formmodsca.ui`)
- angryip.org/documentation, github.com/angryip/ipscan (`Startup.java`)
- advanced-ip-scanner.com/help

다른 도구에서 볼 점:
- 고급 기능은 대부분 **창 하나에 몰거나(CoolTerm·Modbus Poll)**, **«방식» 을 고르게 하고 한 줄 설명을 붙인다(Serial Studio)**.
- 처음 쓰는 사람에게는 **예제(Docklight)** 나 **첫 실행 안내(Angry IP)** 를 준다.

---

## 3. 휴리스틱 평가 (Nielsen 10 + 산업용 도구)

| 항목 | 판정 | 내용 |
|---|---|---|
| 시스템 상태 보이기 | ◎ | 상태 줄·LED·창 제목·처리량이 있다. Net Scan 은 진행 막대와 %를 보여 준다. |
| 시스템 상태 보이기 | ✗ | 1180 폭 이하에서 Serial 상세가 숨는다. |
| 실제 세계와 맞추기 | △ | 0 기준이 기본이다(40001 사고). «조용한 시간»·«간격 열» 같은 말이 낯설다. |
| 통제·자유(되돌리기) | ◎ | 지우기를 되돌리는 알림, Esc 로 반복 멈춤이 있다. |
| 일관성 | △ | «국번/슬레이브 주소/ID» 가 섞여 있다. 표시(표 전체)와 형식(칸)이 따로 있다. 상세가 «명령 목록» 버튼 뒤에 있다. |
| 오류 예방 | △ | HEX↔ASCII 변환과 체크섬 알림은 좋다. 0 기준 칸에 4xxxx 를 넣는 것, 줄 끝이 두 번 붙는 것은 막지 않는다. |
| 기억보다 알아보기 | △ | ⋯ 칸 설정이 마우스를 올려야 보인다. 우클릭 메뉴가 있다는 것을 알 길이 없다. |
| 유연성·효율 | ◎ | 단축키(F4·Ctrl+L·F7), 입력 이력, 명령 목록, 엑셀 붙여넣기가 있다. |
| 미니멀 디자인 | ✗ | Serial 57개·Slave 39개가 첫 화면에 다 보인다. 상시 빨간 경고도 있다. |
| 오류 알아보고 고치기 | ◎ | 연결 실패 이유, 사용 중인 포트 안내, OS 오류 번역이 있다. |
| 도움말 | ○ | 도움말(Serial 17절)과 «Modbus 장비 값 읽기 따라하기» 가 있다. 다만 F1 을 눌러야 보이고, 첫 화면 안내는 한 줄이다. |
| 안전한 기본값 | ◎ | 자동 재연결, 연결 중 포트 잠금, 반복 최소 간격 경고가 있다. |
| 연결 상태가 분명함 | ◎ | 큰 빨간 «끊기» 버튼, 상태 점, 창 제목이 있다. |
| 실수로 보내기 | ○ | 보내기는 Enter·버튼으로만 된다. 다만 Slave 칸 값은 연결 중이면 바로 마스터에게 보인다(의도된 동작). |

---

## 4. 쉽게 만드는 변경 (우선순위 순)

크기 S = 반나절 이하, M = 하루 안팎. 기능은 하나도 빼지 않는다.

| # | 쉽게 만드는 변경 | 지금(file:line) | 다른 도구는(근거) | 구체적 방법 | 효과·크기 |
|---|---|---|---|---|---|
| 1 | Serial: 왼쪽 «고급 연결» 접기 | RS-485·DTR/RTS·흐름 제어가 늘 보임 `apps/serial/src/App.tsx:773-815` | CoolTerm·Modbus Poll 은 Options/Advanced 창에 둔다 | 흐름 제어·RS-485·DTR·RTS 를 `<details className="adv">` 로 묶는다(Slave 의 고급 접기와 같은 방식)<br>기본값과 다르면 접힌 제목에 요약(«RS-485 드라이버 · DTR») 표시, 열림 상태는 저장 | 첫 화면 −4, 프레임 구분이 접힌 아래에서 위로 올라옴 · S <br>**✅ 10/18 적용** — «고급 연결» 접기(흐름 제어·RS-485·DTR·RTS), 접힌 제목에 «RTS/CTS · DTR» 식 요약(기본이면 «흐름 제어 없음 · DTR·RTS 끔»), 기본값이 아니면 펼침, 열림 상태 저장 |
| 2 | Serial: «받기 설정» 접기 | 프레임 구분·조용한 시간·수신 체크섬·파일 기록 `App.tsx:841-923` | Docklight 는 Options 에 둔다 | «받기» 접기 하나로 묶는다. 제목에 지금 값(«조용한 시간 20ms · 체크섬 없음»)<br>«파일로 계속 저장» 은 위 도구 막대의 «화면 내용 저장» 옆으로 옮긴다 | −5 · S <br>**✅ 10/18 적용** — «받기 설정» 접기(프레임 구분·조용한 시간·끝 문자·수신 체크섬), 제목 요약 «조용한 시간 20ms · 체크섬 검사 없음». «파일로 계속 저장» 은 왼쪽에 그대로 둠 |
| 3 | Serial: 보내기 둘째 줄 «더보기 ▾» | 반복·횟수·문자 간·Break·ms·파일 보내기가 한 줄 `App.tsx:1116-1157` | COMTool 은 기능을 그룹으로 나누고, Serial Studio 는 콘솔 도구를 따로 묶는다 | `.send-tools`(문자 간·Break·ms·파일 보내기)를 «⋯ 더보기» 팝오버로 옮긴다<br>반복 체크와 ms 는 남긴다. 횟수는 반복을 켰을 때만 보인다 | −5, 단위 혼동이 없어짐 · S <br>**✅ 10/18 적용** — «⋯ 더보기» 팝오버(문자 간·Break·ms·파일 보내기…, 반복이 꺼져 있으면 반복 횟수), Esc·바깥 누르기로 닫힘. 문자 간 지연이 켜져 있으면 버튼에 표시. 횟수 칸은 반복 중이거나 횟수>0 일 때만 줄에 |
| 4 | Serial: 연결 프리셋 고르기 | 없음 | Docklight 예제 프로젝트(AT 9600 8N1, ModbusRtuCrc), Serial Studio «작동 방식» | 포트 위에 «용도» 고르기: 일반 / AT 명령 / Modbus RTU 장비 / NMEA·GPS<br>- AT 명령: ASCII·줄 끝 CR LF·줄 끝 기준 프레임(0D 0A)·115200<br>- Modbus RTU: Modbus 프레임·수신 CRC·보내기 HEX + CRC16·9600 8N1<br>- NMEA: ASCII·LF 프레임·4800/9600<br>고른 뒤에도 각 칸은 그대로 고칠 수 있다(«일반(바꿈)» 표시) | 첫 작업 결정 3→1 · M |
| 5 | Serial: 보내기 형식 기본값 | 기본 HEX `App.tsx:505` | COMTool·CoolTerm·LLCOM 은 텍스트가 기본 | 첫 실행 기본을 ASCII + 줄 끝 CR LF 로(또는 #4 의 «용도» 를 따름)<br>저장된 값이 있으면 그것을 쓴다 | AT 작업 −4클릭 · S <br>**✅ 10/18 적용** — 저장값이 없을 때 ASCII + 줄 끝 CR LF, placeholder «AT» |
| 6 | Serial: Modbus 요청 창에서 바로 보내기 | «입력칸에 넣기» 만 있음 `shared/ModbusBuilder.tsx:263` | Modbus Poll 은 F8 정의 → 바로 폴링 | «보내기(Enter)» 를 기본 버튼으로 두고 «입력칸에 넣기» 는 보조로<br>Enter = 보내기, 연결 전이면 «먼저 연결하세요» 로 막는다 | −1클릭, 흐름이 자연스러움 · S <br>**✅ 10/18 적용** — `ModbusBuilder` 에 선택적 `onSend`·`canSend`. Serial 은 «보내기»(창 안 Enter)가 기본, 보내면 창이 닫히고 입력 이력에 남음. 연결 전이면 막고 «먼저 연결하세요». TCP 는 넘기지 않아 지금과 같음 |
| 7 | 0 기준 칸에 4xxxx 를 넣으면 알려 주기 | 경고 없이 주소 40001 을 읽음 `shared/modbusBuild.ts:119-123` | Modbus Poll 은 문서에 «40001 = 주소 0» 을 밝히고 «PLC Addresses (Base 1)» 체크를 둔다 | zero 모드에서 값이 FC 에 맞는 앞자리(3·4)이고 30001~49999 범위면 노란 안내를 띄운다: «40001 표기라면 주소 0 입니다 — [4xxxx 표기로 바꾸기]»<br>Serial·TCP·Simulator 공통 | 흔한 사고 하나 차단 · S <br>**✅ 10/18 적용** — `parseAddr` 가 0 기준 칸의 함수에 맞는 5자리 3xxxx·4xxxx 에 note+`plcGuess`(오류 아님, 적힌 대로 보냄). 요청 창에 노란 안내 + «4xxxx 표기로 바꾸기». Serial·TCP 요청 창 공통 |
| 8 | Serial: Modbus 응답을 요청과 짝지어 보여 주기 | 응답 줄을 찾아 눌러야 하고 값은 `[i]` 10진만 `App.tsx:1238-1248` | Modbus Poll·OpenModScan 은 주소가 붙은 값 표 | 요청 창으로 보낸 요청(국번·FC·시작·개수)을 기억했다가, 다음에 CRC 가 맞는 같은 국번·FC 응답이 오면 상세를 자동으로 열고 «40001 = 1812 (0x0714)» 로 보여 준다<br>U16/S16/HEX/F32(ABCD·CDAB) 고르기는 `shared/mbwords.ts` 를 재사용 | Modbus 작업 −1클릭, 값을 해석하는 시간이 줄어듦 · M |
| 9 | Serial: 좁은 창에서 상세 보이기 | 1180 이하면 오른쪽 칸이 «☰ 명령 목록» 뒤 `apps/serial/src/App.css:521-546`, `App.tsx:965` | — | 좁은 폭에서 줄을 누르면 오른쪽 칸을 열거나, 로그 아래에 «상세» 띠(접기)를 둔다<br>버튼 이름은 «☰ 명령·상세» 로 | 1000 폭 사용자의 «아무 일도 안 일어남» 해소 · S <br>**✅ 10/18 적용** — 1180 이하에서 줄을 누르면(Shift·Ctrl 아님) 오른쪽 칸을 열고 «상세» 로 굴림. 버튼 «☰ 명령·상세» |
| 10 | Slave: 늘 떠 있는 빨간 경고 없애기 | `apps/modbus-slave/src/App.tsx:1428-1430` | — | 시작 주소·개수를 **바꿀 때만**(값이 기본과 다를 때나 칸에 포커스가 있을 때) 노란 안내로<br>평소에는 «응답 범위 0~99» 처럼 회색 요약 | 첫인상이 «오류» 에서 «정상» 으로 · S <br>**✅ 10/18 적용** — 바꿨을 때만 노란 알림줄(«알겠습니다» 로 닫음, 범위별 기억), 평소 회색 «응답 범위: HR 0–99» |
| 11 | Slave: 장애 주입 기본으로 접기 | `App.tsx:1209-1237` 이 늘 펼쳐짐 | Witte 도 오류 흉내는 메뉴 안에 둔다(문서 확인 못 함) | 장애 주입 전체를 `<details>` 로 묶는다. 켜져 있으면 제목을 «⚠ 장애 주입 켜짐» 빨강으로 하고 펼친다(`faultOn` 재사용) | 첫 화면 −5 · S <br>**✅ 10/18 적용** — 접힌 제목에 «꺼짐»/켜진 장애 목록, 켜지면 빨간 «⚠ 장애 주입 켜짐» + 펼침, 아래 ⚠ 표시는 그대로 |
| 12 | Slave: 통계 접기 | `App.tsx:1300-1357` | — | «통계» 를 접기로 하고 제목에 «요청 n · 예외 m»(예외가 있으면 강조) | −8줄 · S <br>**✅ 10/18 적용** |
| 13 | Slave: ⋯ 칸 설정을 늘 보이게 | 마우스를 올려야 보임 `apps/modbus-slave/src/App.css:805-821` | Modbus Poll 은 칸 선택 → Display 메뉴 | ⋯ 를 옅은 색으로 늘 보이게 한다. 첫 실행 말풍선에 «우클릭·⋯ = 이름·형식(F32 등)·순서»<br>«표시» 고르기 끝에 «실수·32비트는 칸마다 ⋯» 항목을 넣는다 | float 찾기 실패 방지 · S <br>**✅ 10/18 적용** — ⋯ 늘 옅게(opacity .4). «표시» 끝에 «형식 지정…(32비트·float·문자열)» → 고른 칸(없으면 첫 칸)의 칸 설정 창 + 알림. 첫 실행 카드에 «⋯ 또는 오른쪽 버튼 → 형식» |
| 14 | Slave: 여러 칸 골라 형식 한 번에 정하기 | 칸마다 창 `apps/modbus-slave/src/CellDialog.tsx` | Modbus Poll: 칸 여러 개 선택 → Display | Shift+클릭으로 범위를 골라 «형식: F32 CDAB» 를 한 번에 정한다(두 칸씩 묶음) | float 여러 개일 때 클릭 크게 감소 · M |
| 15 | Slave: 주소 표기 첫 질문 | 기본 0 기준 `App.tsx:1413-1420` | Modbus Poll «PLC Addresses (Base 1)» | 첫 실행 카드(#17)에서 «주소를 어떻게 부르나요? 0 / 1 / 40001» 하나만 묻고, Serial·Master 의 요청 창도 같은 설정을 따른다 | 주소 혼동 감소 · S |
| 16 | 이름 맞추기 | «국번»(Serial 요청 창), «슬레이브 주소»(Slave), «ID 1»(Slave 도구 막대) `shared/modbusBuild.ts`, `apps/modbus-slave/src/i18n.ts` | Modbus Poll 은 어디서나 «Slave ID» | 한국어 «국번(슬레이브 ID)», 영어 «Slave ID» 로 통일. «조용한 시간» → «끊김 시간(조용한 간격)», «간격 열 끔» → «시간 간격 열: 없음» | 일관성 · S <br>**◐ 10/18 Slave 만 적용** — 한국어 «국번(슬레이브 주소)» 한 번, 나머지 «국번». 영어는 «Unit ID (slave address)» 한 번, 나머지 «Unit ID». Serial·shared 쪽 문구는 아직 |
| 17 | 첫 실행 빠른 시작 카드 | 빈 화면 안내 한 줄 `apps/serial/src/i18n.ts:6` | Angry IP 의 첫 실행 시작 안내, Docklight 환영 화면 | 빈 로그 자리에 카드: «무엇을 하나요? [AT 명령 보내기] [Modbus 장비 값 읽기] [그냥 보기]»<br>누르면 #4 프리셋 적용 + 예시 명령 2~3개를 명령 목록에 넣는다. «다시 보지 않기», 도움말 «처음 쓰는 순서» 링크<br>Slave: [보유 레지스터 예제 채우기] [CSV 가져오기] | 첫 5분 결정을 거의 0으로 · M <br>**◐ 10/18 Slave·Net Scan 은 «처음 쓰는 순서» 카드만**(빈 통신 기록·빈 결과 자리, «다시 보지 않기»). 예제 채우기·CSV 버튼은 아직 |
| 18 | 예시 명령(빈 명령 목록) | 빈 목록 안내만 `shared/CommandList.tsx:228` | Packet Sender 기본 패킷, LLCOM 예제 스크립트 | 빈 목록에 «예시 넣기» 버튼: AT·ATI·AT+GMR / Modbus 03 0×10 / *IDN?. 사용자 명령과 섞이지 않게 이름에 «예:» | 발견성 · S |
| 19 | 줄 끝이 두 번 붙는 것 막기 | `\r\n` 과 «줄 끝 CR LF» 가 겹침 `App.tsx:1103-1108` | COMTool 은 CRLF 체크와 Escape 를 분리 | 입력이 `\r\n`·`\n` 으로 끝나고 줄 끝도 켜져 있으면 알림줄: «줄 끝이 두 번 붙습니다 — [줄 끝 끄기]»(기존 `modeSwitch` 알림줄 재사용) | 오류 예방 · S <br>**✅ 10/18 적용** — ASCII 입력이 `\r\n`·`\n`·`\r` 로 끝나고 줄 끝도 켜져 있으면 알림줄 «줄 끝이 두 번 붙습니다 — [줄 끝 끄기] ✕» |
| 20 | Serial: 도구 막대 정리 | 보기 4 + 자동 스크롤 + 간격 열 + 저장 + 지우기가 두 줄로 넘침 `App.tsx:932-968` | — | «간격 열» 을 보기 설정(톱니)이나 로그 우클릭 메뉴로 옮긴다. 1000 폭에서 한 줄이 되게 | −1, 줄 넘김 해소 · S |
| 21 | Serial: 연결 줄 요약 + 바꾸기 | 연결 뒤에도 왼쪽 칸 전체가 보임 | CoolTerm 은 도구 막대만 남긴다 | 연결되면 연결 설정을 «COM3 9600 8N1 [바꾸기]» 한 줄로 접고, 받기 설정과 명령을 위로 올린다(속도 등은 연결 중에도 바로 적용되니 펼치면 그대로 동작) | 화면 정리 · M |
| 22 | Net Scan: «찾는 방법» 접기 | `apps/netscan/src/App.tsx:491-540` | Angry IP 는 Preferences, Advanced IP Scanner 는 Options | «찾는 방법·포트» 를 접기로 묶고 제목에 «ARP+핑 · 산업 포트 14 · Modbus 정보» 요약. 기본값과 다르면 «(바꿈)» | 첫 화면 −9 · S <br>**✅ 10/18 적용** — «찾는 방법·포트 (고급)», 요약 예: «ARP+핑 · 포트 22개 · Modbus 정보 · 이름». 핑·ARP 둘 다 끔·틀린 포트 목록이면 저절로 펼침 |
| 23 | Net Scan: 포트를 이름으로 고르기 | 숫자 나열 칸 `App.tsx:515-535` | Advanced IP Scanner 는 «Resources» 를 체크로 고른다 | 칩 체크: Modbus 502 · S7 102 · EtherNet/IP 44818 · MC/SLMP 5000-5010 · FEnet 2004 · OPC UA 4840 · HTTP… / «직접 입력» 은 고급 | 이해도 · M |
| 24 | Net Scan: 줄 우클릭 메뉴 | 동작이 아래 줄에만 `App.tsx:669-721` | Advanced IP Scanner 우클릭(HTTP·FTP·RDP) | 줄 우클릭: 웹 열기·IP 복사·IP:502 복사·Modbus 정보·감시에 추가·WoL(아래 줄과 같은 함수) | 발견성 · S |
| 25 | Net Scan → Modbus 도구로 넘기기 | 없음 | — | Modbus 칩을 누르면 «Modbus Master 로 열기(IP·502·국번)». 다른 앱을 실행하는 인자는 Rust 쪽이라 다음 판. 지금은 «IP:502 복사» 를 칩 기본 동작으로 | 앱 사이 이동 · M |
| 26 | 도움말 «따라하기» 를 화면에서 바로 | 도움말이 F1 뒤에 있음(Serial 17절) `apps/serial/src/help.ts` | Docklight 튜토리얼, Modbus Poll 빠른 시작 | 빈 화면 카드(#17)와 «Modbus 요청» 창 아래에 «따라하기 보기» 링크 → 해당 절로 바로 연다(`HelpDialog` 에 절 id 넘기기) | 도움말 이용 · S |
| 27 | Slave: 1000×640 에서 표와 기록 비율 | 표 32칸, 기록이 절반 | — | 통신 기록을 기본으로 접거나 높이를 1/3 로 하고 끌어서 크기 조절 + 기억 | 표가 더 많이 보임 · S |
| 28 | Serial: 수신 체크섬 자동 제안 | Modbus 프레임을 고를 때만 자동 `App.tsx:858-867` | — | 요청 창으로 Modbus 를 보내면 «받기도 Modbus 로 볼까요? [예]» 알림줄 한 번(프레임 + CRC 검사) | 응답 해석 정확도 · S |
| 29 | Slave: 처음 연결 전 «예제 값» | 모두 0 | Witte Slave 는 예제 없음 | 첫 실행 카드에서 «예제 채우기» → 0~9 에 1..10, 칸 8 F32 CDAB 3.14, 이름 «온도» 등(기존 `fill` 재사용) | 바로 마스터 시험 가능 · S |
| 30 | 고급 접기 열림 상태 기억 | 일부만 `advOpen` | CoolTerm 은 설정 파일에 저장 | 모든 접기의 열림 상태를 앱 설정에 저장한다. 설정 창에 «모두 펼치기(전문가 화면)» 토글 | 숙련자 손해 없음 · S <br>**◐ 10/18 Slave(장애 주입·통계)·Net Scan(찾는 방법) 은 열림 상태 저장.** «모두 펼치기» 토글은 아직 |

---

## 5. 바로 할 10개

기능을 빼지 않고 옮기기·숨기기·기본값만 바꾼다.

1. **Slave 빨간 범위 경고를 바꿀 때만** (#10) — ✅ 적용
   - `apps/modbus-slave/src/App.tsx:1428-1430`
   - `range.start !== 0 || range.count !== 100` 이거나 시작·개수 칸에 포커스가 있을 때만 `hint warn` 으로 띄운다. 평소에는 `hint` 회색으로 «응답 범위 {a}~{b}».
   - i18n 키 하나 추가(`rangeNow`).
2. **Slave 장애 주입·통계 접기** (#11·#12) — ✅ 적용
   - `App.tsx:1209-1280`, `1300-1357` 을 `<details className="adv">` 로 감싼다.
   - 장애 주입은 `open={faultOn || faultOpen}`. 통계 제목에 요청·예외 수를 붙인다.
   - CSS 는 이미 있는 `.adv` 를 쓴다.
3. **Slave ⋯ 늘 보이기** (#13) — ✅ 적용
   - `apps/modbus-slave/src/App.css:805-821` 에서 `visibility:hidden` 을 `opacity:.35` 로 바꾸고, hover·포커스 때 1.
   - `tip(lang,"format")` 말풍선 끝에 «실수·32비트: 칸의 ⋯ 또는 우클릭» (`help.ts`/tips).
4. **0 기준 칸 4xxxx 안내** (#7) — ✅ 적용
   - `shared/modbusBuild.ts` `parseAddr` 의 zero 분기에서 `note` 를 돌려준다(오류가 아니다).
   - `shared/ModbusBuilder.tsx` 가 note 와 «4xxxx 표기로 바꾸기» 버튼을 보여 준다.
   - `modbusBuild.test.ts` 에 경우 하나 추가.
5. **Modbus 요청 창에 «보내기»** (#6) — ✅ 적용
   - `ModbusBuilder` 에 선택적 `onSend?: (bytes)=>void` 와 `canSend` 를 넘긴다.
   - Serial `App.tsx:1256-1265` 에서 `doSend(mbSpec(b))`. 기본 버튼은 «보내기», 보조 버튼은 «입력칸에 넣기»·«목록에 추가».
   - TCP·Simulator 는 넘기지 않으면 지금과 같다.
6. **Serial 왼쪽 칸 두 묶음 접기** (#1·#2) — ✅ 적용
   - `App.tsx:773-815`(흐름·RS-485·DTR·RTS)를 «고급 연결» 로, `841-919`(프레임·수신 체크섬)를 «받기 설정» 으로 묶는다. 제목에 요약을 붙인다.
   - 기본값이 아니면 펼친 채로 시작한다(`cfg.flow!=="none"||rs485On||cfg.dtr||cfg.rts`).
   - 열림 상태는 `store()` 로 저장(#30).
7. **Serial 보내기 줄 «⋯ 더보기»** (#3) — ✅ 적용
   - `App.tsx:1144-1157` 의 `.send-tools` 를 작은 팝오버로 옮긴다(`LogMenu` 와 같은 위치 계산, Esc 로 닫기).
   - 횟수 칸은 `repeating||repeatTimes>0` 일 때만 보인다.
   - smoke.mjs 의 Break·파일 보내기 단계는 팝오버를 연 뒤 누르도록 고친다.
8. **Serial 좁은 창 상세** (#9) — ✅ 적용
   - `selected` 가 바뀌면 `if (matchMedia("(max-width:1180px)").matches) setShowRight(true)`.
   - 버튼 문구를 `commands` → `commandsDetail`(«명령·상세»)로.
9. **첫 실행 기본값 + 줄 끝 중복 알림** (#5·#19) — ✅ 적용
   - `App.tsx:505` 의 기본값을 `{mode:"ascii", suffix:"\r\n"}` 로(저장값이 없을 때만).
   - placeholder 는 «AT» 로.
   - `modeSwitch` 알림줄에 «줄 끝 두 번» 경우를 추가.
10. **Net Scan «찾는 방법» 접기** (#22) — ✅ 적용
    - `apps/netscan/src/App.tsx:491-540` 을 `<details>` 로 감싼다.
    - 요약 문구는 `cfg` 로 만든다(ARP/핑·포트 수·Modbus). 기본값과 다르면 «(바꿈)» 을 붙이고 펼쳐서 시작한다.

다음 차례(M): #4 용도 프리셋 + #17 첫 실행 카드(둘은 함께), #8 응답 짝짓기, #14 여러 칸 형식, #23 포트 칩.

검증: 고친 뒤 `e2e/ui-preview/smoke.mjs` 를 돌린다. 숨긴 컨트롤은 «펼친 뒤 누르기» 로 바꾼다. 이 검토의 `first.mjs` 컨트롤 수 목표는 Serial 57→약 35, Slave 39→약 25(레지스터 칸 제외), Net Scan 24→15.

---

### 적용 기록 — Modbus Slave · Net Scan (10/18)

- 바꾼 곳: `apps/modbus-slave/src/{App.tsx,App.css,Traffic.tsx,i18n.ts,help.ts}`, `apps/netscan/src/{App.tsx,App.css,i18n.ts,help.ts}`, `shared/tips.ts`(slaves·addSlave·faults·format·mbStats·nsAdv)
- 기능은 빼지 않았다. 접기·기본값·안내만 바꿨다.
- 첫 화면 컨트롤 수(레지스터 칸 제외, 화면 밖·접힌 것 제외, 미리보기 1200×760):
  - Slave **46 → 43**(«다시 보지 않기» 1 포함). 왼쪽 칸만 보면 17 → 13. 남은 것은 연결 설정·통신 기록 찾기 줄이라 목표(약 25)까지는 통신 기록 도구줄 정리가 더 필요하다.
  - Net Scan **24 → 17**(1000 폭도 17).
- 캡처: `after-*.png`(첫 실행 1200·1000 × ko·en, 장애 켬+범위 바꿈, 장애 접힘, 형식 지정…, Net Scan 고급 펼침·바꿈 표시)
- smoke(포트 5221·5226 로 띄운 사본): 두 앱 4조합 모두 통과. 접기를 펼친 상태(faultOpen·statsOpen·advOpen=true)로도 ko-light 통과.
- `e2e/ui-preview/smoke.mjs` 는 고치지 않았다: 접힌 칸(장애 주입·통계·찾는 방법)은 기본 «다 눌러 보기» 에서 빠진다. «펼친 뒤 누르기» 단계를 넣어야 한다.

### 적용 기록 — Serial · 요청 창 공통 (10/18)

- 바꾼 곳: `shared/{modbusBuild.ts,modbusBuild.test.ts,ModbusBuilder.tsx,modbus.css,Popover.tsx,io.css,tips.ts,helpCommon.ts}`, `apps/serial/src/{App.tsx,App.css,i18n.ts,help.ts}`, `e2e/ui-preview/smoke.mjs`
- 기능은 빼지 않았다. 접기·팝오버·기본값·안내만 바꿨다.
- smoke: full 조합(ko-light·en-dark)은 접기를 펼친 채(`advConnOpen`·`rxOpen`) 띄워 «다 눌러 보기» 가 속까지 누른다. 나머지 조합은 접힌 기본 상태를 확인한다. Break·파일 보내기·반복 횟수는 «⋯ 더보기» 를 연 뒤 누른다. 좁은 창에서 줄을 누르면 오른쪽 칸이 열리는지 보고 닫은 뒤 다음 단계로 간다. 첫 실행 기본값, 줄 끝 두 번 알림줄, 요청 창 4xxxx 안내 → 바꾸기 → «보내기» 단계를 더했다.
- 남은 것: #2 의 «파일로 계속 저장» 을 도구 막대로 옮기기(도구 막대가 1000 폭에서 이미 넘쳐 #20 과 함께), TCP 요청 창 «보내기»(트랜잭션 ID 자동 증가와 맞춰야 함).

## 6. PortDock 이 이미 더 쉬운 점

- **Net Scan 1클릭 + Modbus 식별:** 대역 자동 채우기는 Angry IP 와 같다. 그 위에 산업 포트 이름 칩(S7·SLMP·FEnet·EtherNet/IP·OPC UA)과 Modbus 장치 식별이 결과 표에 바로 나온다. 경쟁 스캐너에는 없다.
- **Modbus 요청 창 기본값:** 국번 1 · FC03 · 0 · 10 이라 가장 흔한 첫 읽기가 입력 0번이다. CRC 는 자동으로 붙고, 보낼 바이트를 미리 보여 준다. Modbus Poll 은 F3·F8 두 창이 필요하다.
- **Slave 값 입력:** Enter·↓ 로 다음 칸, Esc 로 취소, 엑셀 여러 값 붙여넣기가 된다. Witte 는 값마다 입력 창을 연다. 형식 창은 ABCD/CDAB/BADC/DCBA 를 이름 그대로 쓰고 뜻을 한 줄로 설명한다. Modbus Poll·OpenModScan 의 «Little-endian byte swap»·«LSRF» 보다 덜 헷갈린다(OpenModScan #65 는 뒤집힌 순서 버그였다).
- **연결 없이도 길 안내:** «먼저 연결하세요», 보낼 바이트 미리보기, HEX↔ASCII 를 바꾸면 같은 바이트로 변환해 준다. 체크섬 알림줄도 있다.
- **안전·회복:** 연결 중 포트 잠금, 자동 재연결, 지우기 되돌리기, Esc 로 반복 멈춤, 창 제목에 포트와 상태가 나온다.
- **한 창에 한 도구:** 프로젝트 파일이나 세션 만들기(Docklight·Eltima) 없이 켜자마자 연결할 수 있다.
- **한국어·영어 전환이 즉시 되고, 줄 넘침 없이 1000 폭까지 맞는다**(캡처 12장에서 가로 스크롤 0).
