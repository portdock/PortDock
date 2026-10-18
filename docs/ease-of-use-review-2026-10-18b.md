# 쉽게 쓰기 검토 2 (2026-10-18) — TCP · UDP · Simulator · Modbus Master

**질문:** [첫 검토](ease-of-use-review-2026-10-18.md)(Serial·Modbus Slave·Net Scan)와 같은 눈으로 보면, 나머지 네 앱도 처음 몇 분 안에 쉽게 쓸 수 있는가?

**어떻게 봤나**
- 첫 검토와 같은 방법을 썼다.
  - 화면 미리보기(`e2e/ui-preview`, 가짜 백엔드)를 Edge 헤드리스로 띄웠다(tcp 5203 · udp 5204 · simulator 5205 · modbus-master 5207).
  - localStorage 를 비운 첫 실행 상태에서 1400×900·1000×640, 한국어·영어로 찍었다.
- 컨트롤 수는 화면 안에 보이는 button·input·select·textarea·summary 를 셌다. 접힌 것과 화면 밖은 뺐다. Modbus Master 의 값 칸(role=button)은 따로 셌다.
- 핵심 작업은 직접 눌러 클릭·입력·결정 수를 셌다.
- 경쟁 도구는 공식 문서·README·저장소의 .ui·소스로 봤고 실행하지는 않았다. 그래서 경쟁 도구의 클릭 수는 문서상 단계로 추정한 것이다. 문서로 확인 못 한 동작은 «출처 미확인» 으로 적었다.
- 캡처: `docs/ease-of-use-2026-10-18/{tcp,udp,simulator,modbus-master}-*.png`
- 가짜 백엔드라 화면·흐름만 본 것이다. 받은 데이터 내용·타이밍은 `mock.js` 가 만든 것이다.
- 앱 코드는 고치지 않았다. 다른 작업자가 고치는 중인 `apps/serial`·`shared/ModbusBuilder`·`modbusBuild`·`tips`·`smoke.mjs` 의 줄 번호는 바뀔 수 있다.

**한 줄 결론**
- **Modbus Master** 는 흐름이 Modbus Poll 과 같고 걸음 수는 더 적다(창 두 개 대신 표 위 한 줄). 다만 세 가지가 걸린다.
  - 0 기준에 40001 을 넣으면 경고 없이 주소 40001 을 읽는다.
  - float 은 오른쪽 버튼으로만 정할 수 있다.
  - 첫 화면이 시리얼 RTU 이고 통계·값 기록·«0F·10» 같은 고급 칸이 늘 보인다.
- **TCP** 는 기능이 경쟁 도구보다 많다(클라이언트·서버·중계, MBAP 풀이). 대신 기본값이 어긋난다.
  - 보내기는 ASCII 인데 로그 보기는 HEX 라서, 받은 글이 16진으로만 보인다.
  - 첫 화면 컨트롤이 50개다.
- **UDP** 는 보내기 기본이 HEX 라 `hello` 를 치면 빨간 오류부터 본다. 브로드캐스트·멀티캐스트·에코가 늘 펼쳐져 있다.
- **Simulator** 는 첫 화면이 가장 가볍다(29개). 그러나 세 가지가 문제다.
  - 빈 규칙의 기본이 HEX·정확히다.
  - ASCII 에서 `?`·`*` 가 와일드카드라 SCPI `*IDN?` 규칙이 `XIDN!` 에도 답한다.
  - 통신 기록에서 «이 요청으로 규칙 만들기» 가 없다.
- 첫 검토와 마찬가지로 기능을 뺄 필요는 없다. **기본값·접기·예제 규칙·첫 실행 카드** 로 대부분 풀린다.

---

## 1. 앱별 결과

### 1-1. TCP

| 작업 | PortDock | 가장 쉬운 경쟁 도구 |
|---|---|---|
| 장비 192.168.0.20:5000 에 접속해 `hello` + CR LF 보내고 답 읽기 | **클릭 2 + 입력 3, 결정 2**<br>주소 → 포트 → 접속 → `hello` Enter. 보내기 기본이 ASCII·CR LF 라 바꿀 것이 없다.<br>단 답이 HEX 로만 보여 «둘 다»/«ASCII» 를 한 번 더 눌러야 읽힌다(+1). | **Hercules**: TCP Client 탭 → IP·Port → Connect → 보내기 칸 + Send(약 4). 줄 끝은 «Transmit EOL» 설정이나 `$0D$0A` 로 넣는다.<br>**ncat**: `ncat -C 192.168.0.20 5000` 한 줄(-C 가 LF→CRLF). |
| 이 PC 에서 5000 포트로 서버를 열고, 붙은 장비 하나에게만 보내기 | **클릭 4 + 입력 1, 결정 2**<br>방식 고르기(2) → 포트 → 듣기 시작 → 보낼 상대 고르기(«모두에게» 가 기본) | **sokit**: Server 탭(첫 탭) → TCP Port → TCP Listen. 접속자는 «Connections» 목록에 나온다.<br>**NetAssist**: 协议类型 드롭다운 → 포트 → 打开. 보내기 쪽 드롭다운에 «All Connections» 가 있다(2차 자료). |

**첫 화면 컨트롤 수**
- 1400 폭 **50개**: 버튼 24, 고르기 10, 입력칸 9, 체크 7
- 1000 폭 **45개**: 오른쪽 칸(명령 목록·트리거·자동응답·상세)이 «☰ 명령 목록» 뒤로 숨는다. «파일로 계속 저장» 은 왼쪽 칸 아래로 밀려난다.

대부분이 안 쓰는데 기본으로 보이는 것(약 20개):
- 즉시 전송(Nagle 끔), 끊기면 자동 재접속 + 재접속 간격
- 프레임 구분 + 조용한 시간, 수신 체크섬 + ⚙, 파일로 계속 저장
- 간격 열 고르기
- 보내기 체크섬 + ⚙, 반복·ms·횟수, Modbus…, 문자 간 지연, 파일 보내기…
- 트리거·자동응답(오른쪽 칸)

**헷갈리는 곳**

1. **보내기는 ASCII 인데 받은 줄은 HEX 로만 보인다.** `READY,TEMP=24.8C` 가 `52 45 41 44 …` 로 보여, 글자로 읽으려면 «둘 다»/«ASCII» 를 눌러야 한다.
   - 근거: 보기 기본 `apps/tcp/src/App.tsx:286`(`"hex"`), 보내기 기본 `:355`(`mode: "ascii", suffix: "\\r\\n"`)
   - 캡처: `tcp-t1-client-hex.png` → `tcp-t1-client-both.png`
2. **처음 주소·포트가 `192.168.0.10:502` 로 Modbus 포트인데, 보내기 예시는 `STATUS?` 다.** 프레임 구분도 «조용한 시간» 이라 Modbus TCP 를 쓰려면 «Modbus TCP (MBAP 길이)» 를 직접 골라야 한다. 기본값끼리 서로 다른 용도를 가리킨다.
   - 근거: `App.tsx:94`, `:691-713`, `:919`
3. **방식이 고르기 안에 숨어 있다.** 서버·중계로 바꾸면 «주소» 칸이 «묶을 주소» 로 바뀌고 값이 `0.0.0.0` 으로 바뀐다. 무엇이 바뀌었는지 알려 주지 않는다.
   - Hercules·sokit 은 탭이라 세 방식이 눈에 보이고, 각 탭이 자기 칸을 따로 기억한다.
   - 근거: `App.tsx:601-616`
4. **연결된 클라이언트 모드에서 끊는 버튼 이름이 «멈춤» 이다.** «접속» 의 반대인 «끊기» 가 아니다. 서버에서도 «듣기 멈춤» 이 아니라 «멈춤» 이다.
   - 근거: `apps/tcp/src/i18n.ts:30-32`
   - 캡처: `tcp-t1-client-hex.png`
5. **서버의 «접속한 상대» 목록에서 IPv6 주소가 길면 «끊기» 버튼이 왼쪽 칸 밖으로 밀려 안 보인다.**
   - 근거: `App.tsx:679-686`(`.peer` 한 줄)
   - 캡처: `tcp-t2-server-1400.png`
6. **1400 폭 서버 모드에서도 보내기 줄이 두 줄로 넘친다.** 상대 고르기가 앞에 붙으면서 «보내기» 버튼이 둘째 줄 맨 앞으로 내려간다.
   - 캡처: `tcp-t2-server-1400.png`
7. **1180 폭 이하에서는 상세·자동응답·트리거가 «☰ 명령 목록» 뒤에 숨는다.** 첫 검토에서 본 Serial #6 과 같다. 줄을 눌러도 화면에 변화가 없다.
   - 근거: `apps/tcp/src/App.css:568-` (`.app.three > aside.right`), `App.tsx:789-791`
   - 캡처: `tcp-t1-1000-detail-hidden.png`, `tcp-1000-commands-panel-en.png`
8. **보내기 아래 둘째 줄에 9개가 붙어 있다.** 반복·ms·횟수·목록에 추가·Modbus…·문자 간·ms·파일 보내기다. 첫 검토 Serial #9 와 같다.
   - 근거: `App.tsx:947-990`
9. 좋은 점:
   - 보내기 줄 아래에 «보낼 바이트: 68 65 6C 6C 6F 0D 0A (7)» 가 바로 보인다.
   - 서버에서 «보낼 상대» 를 고를 수 있고, 끊긴 상대는 «(끊김)» 으로 남겨 실수로 다른 상대에게 보내지 않는다(`App.tsx:889-909`).
   - 중계(A ⇄ 이 PC ⇄ B)는 sokit Transfer 탭과 같은 기능을 한 앱에서 한다.

### 1-2. UDP

| 작업 | PortDock | 경쟁 도구 |
|---|---|---|
| 5000 포트로 받으면서 192.168.0.10:5000 에 `hello` 보내기 | **클릭 3 + 입력 1, 결정 2**<br>시작 → `hello` 입력 → **빨간 «HEX 가 아닌 글자: «h»»** → 보내기 형식 HEX→ASCII(2) → Enter | **Hercules**: UDP 탭 → Module IP·Port·Local port → Listen → 보내기 칸 + Send(약 4).<br>**Packet Sender**: 한 줄 폼에 ASCII·Address·Port·UDP → Send. ASCII 칸과 HEX 칸이 나란히 있어 형식을 고를 필요가 없다. |
| 브로드캐스트로 보내기 | 보낼 곳 `x.x.x.255` → «브로드캐스트 허용» 체크 → 시작 | Packet Sender 는 전용 설정이 없다(README). Hercules·sokit 은 출처 미확인. |

**첫 화면 컨트롤 수**
- 1400 폭 **50개**: 버튼 25, 고르기 9, 입력칸 9, 체크 7
- 1000 폭 **44개**

대부분이 안 쓰는데 기본으로 보이는 것(약 15개):
- 묶을 주소, 브로드캐스트 허용, 멀티캐스트 그룹, 받은 것 돌려주기(에코)
- 수신 체크섬 + ⚙, 파일로 계속 저장
- 보내기 체크섬 + ⚙, 반복·ms·횟수
- 트리거·자동응답(오른쪽 칸)

**헷갈리는 곳**

1. **보내기 기본이 HEX 다(TCP 는 ASCII).** 같은 PortDock 안에서 TCP 는 ASCII·CR LF, UDP 는 HEX·줄 끝 없음이다. 글자를 치면 빨간 오류만 나오고 «ASCII 로 바꿀까요?» 같은 길 안내가 없다.
   - 근거: `apps/udp/src/App.tsx:354`, `apps/tcp/src/App.tsx:355`
   - 캡처: `udp-t1-hex-default-typed.png`
2. **받는 쪽·보낼 곳·브로드캐스트·멀티캐스트·에코가 한 칸에 다 펼쳐져 있다.** 처음 쓰는 사람에게 필요한 것은 «받을 포트» 와 «보낼 곳» 둘뿐이다.
   - 근거: `App.tsx:531-588`
   - 캡처: `udp-first-1400-ko.png`
3. **«에코» 가 연결 설정 사이에 있다.** 다른 칸은 실행 중에 잠기는데 에코는 바로 적용된다. 이 칸만 실행 중에도 바뀐다.
   - 근거: `App.tsx:586-588`
4. **«기본 대상» 이라는 말이 낯설다.** 보내기 줄의 고르기가 «기본 대상 (192.168.0.10:5000)» 으로 시작한다. «보낼 곳» 이 더 쉽다(왼쪽 칸 이름은 «보낼 곳 (기본)» 이다).
   - 근거: `apps/udp/src/i18n.ts:12,44`, `App.tsx:762-775`
5. **브로드캐스트 허용 없이 `.255` 로 시작하면 막힌다는 알림은 나온다.** 다만 가짜 백엔드에서는 «이 PC 에 없는 주소» 오류가 함께 떠 이유가 둘로 보였다. 실제 OS 응답과 같은지는 실기로 확인해야 한다.
   - 근거: `App.tsx:403`, `:840`
   - 캡처: `udp-t2-broadcast-blocked-1400.png`
6. 좋은 점:
   - «이 PC 주소» 목록(랜카드 이름 포함)이 바로 보이고, 누르면 묶을 주소로 들어간다(`App.tsx:602`).
   - «보내온 상대» 를 누르면 그쪽으로 답한다(`:607-616`). Packet Sender 에 없는 편의다.

### 1-3. Simulator

| 작업 | PortDock | 경쟁 도구 |
|---|---|---|
| SCPI 장비 흉내: `*IDN?` 를 받으면 `PORTDOCK,SIM,1` + CR LF 로 답하기 | **클릭 8 + 입력 2, 결정 4**<br>+ 규칙 추가 → 받으면 HEX→ASCII(2) → `*IDN?` → 응답 HEX→ASCII(2) → `PORTDOCK,SIM,1` → 줄 끝 CR LF(2) → 시작<br>그런데 이대로면 `?`·`*` 가 와일드카드라 `XIDN!` 에도 맞는다. 정확히 하려면 `\x2AIDN\x3F` 로 써야 한다. | **Packet Sender** Smart Response: Settings → Smart Responses 체크 → 1번 줄에 검색어·Exact Match·Reply·Encoding(약 6). Exact Match 는 글자 그대로 비교한다(소스 `packet.cpp`).<br>**Docklight**: Receive Sequence 추가 → Action «Answer» → Send Sequence 고르기. 와일드카드는 오른쪽 클릭으로 넣는 `?`·`#` 이다(V2.1 매뉴얼).<br>**Termission**: 규칙 표가 없고 «Device Bot» 에 C#/JS 함수를 쓴다. |
| Modbus RTU 03 요청에 고정 값으로 답하기 | 빈 화면 안내에 예가 있다(`01 03 ?? ?? 00 01 **` → `01 03 02 00 64` + CRC16). 하지만 누를 수 없어 손으로 옮겨 써야 한다(클릭 4 + 입력 2). | Docklight 는 예제 프로젝트(ModbusRtuCrc)가 있다(첫 검토). |

**첫 화면 컨트롤 수:** **29개**(1000 폭도 29). 네 앱 중 가장 적다.
- 규칙이 생기면 규칙 카드 하나에 컨트롤이 15개쯤 붙는다. 켜기·이름·↑↓✕·HEX/ASCII·정확히/포함·패턴·응답 HEX/ASCII·응답·{…}·체크섬·줄 끝·지연·자세히다.

**헷갈리는 곳**

1. **새 규칙이 HEX·정확히·응답 HEX 로 시작한다.** 텍스트 장비(SCPI·AT·NMEA)를 흉내 내려면 고르기 두 개를 매번 바꿔야 한다.
   - 근거: `shared/autoReply.ts:74-82`(`blankRule`)
   - 캡처: `simulator-t1-blank-rule-1000.png`
2. **ASCII 패턴에서 `?`·`*` 가 늘 와일드카드다.** SCPI 명령은 거의 다 `?`(질의)나 `*`(공통 명령)를 쓴다. 그래서 `*IDN?` 라고 쓰면 `XIDN!` 도 맞고, «✓ 이 규칙에 맞음» 이 뜬다.
   - 도움말 한 줄(`\x3F`·`\x2A` 로 쓰라)에만 적혀 있다.
   - Packet Sender 의 Exact Match 는 글자 그대로 비교한다. Docklight 의 와일드카드는 `?`·`#` 이고, `*` 는 쓰지 않는다.
   - 근거: `shared/autoReplyText.ts:19`(help), `shared/AutoReplyPanel.tsx:377-384`
   - 캡처: `simulator-t1-scpi-wildcard-1000.png`
3. **통신 기록에서 규칙을 만들 수 없다.** 안 맞은 요청은 «NO MATCH» 줄로 남지만, 줄을 오른쪽 클릭해도 복사·다시 보내기뿐이다. 받은 요청을 패턴 칸에 옮겨 적어야 한다.
   - 근거: `apps/simulator/src/App.tsx:704-720`(`logMenuItems` 에 규칙 추가 없음)
4. **빈 화면의 예시를 누를 수 없다.** «예) 받으면 01 03 ?? ?? 00 01 ** → 응답 01 03 02 00 64 + CRC16 Modbus» 가 글로만 있다.
   - 근거: `shared/autoReplyText.ts:6`, `AutoReplyPanel.tsx:338`
5. **«장비가 먼저 보내기» 가 규칙 목록 바로 아래 같은 칸에 있다.** 처음 보는 사람은 응답 규칙 칸으로 오해하기 쉽다. 반복·ms 까지 포함해 컨트롤 8개다.
   - 근거: `apps/simulator/src/App.tsx:604-663`
6. **같은 자동응답 기능이 TCP·UDP 오른쪽 칸에도 있다.** Simulator 와 무엇이 다른지(Simulator 는 시리얼·TCP 서버/클라이언트·UDP 를 고르는 «장비 흉내» 전용)를 화면에서 알 수 없다.
   - 근거: `apps/tcp/src/App.tsx:1030`, `apps/udp/src/App.tsx:870`
7. 좋은 점:
   - 규칙의 «자세히» 에 «예시 요청» 칸이 있어, 요청을 적으면 맞는지와 응답 바이트를 바로 보여 준다.
   - 응답 자리({req}·{counter}·{crc …})는 «{…}» 고르기로 넣는다. 문법을 외울 필요가 없다.
   - 위의 규칙에 가려 영영 안 맞는 규칙은 알림줄로 알려 준다.

### 1-4. Modbus Master

| 작업 | PortDock | 경쟁 도구 |
|---|---|---|
| Modbus TCP 192.168.0.20 국번 1 의 40001~40010 읽기 | **클릭 3 + 입력 1, 결정 1**<br>연결 방식 시리얼→TCP(2) → 장비 주소 → 연결. 표 기본값이 국번 1·FC03·0·10·1000 ms·폴링 켬이라 연결하자마자 값이 찬다. | **Modbus Poll**: F3 연결 창(종류·IP·포트) + F8 정의 창(Slave ID·Function·Address·Quantity·Scan Rate). 약 8클릭, 창 두 개.<br>**modpoll**: `modpoll -m tcp -a 1 -r 1 -c 10 -t 4 IP` 한 줄(-r 기본 1 기준).<br>**OpenModScan**: 표 위 칸(Device ID·Start·Length·Point Type) + Connection 메뉴. 처음 Point Type 이 Coils 다. |
| 40005 에 123 쓰기 | **두 번 누르기 → 값 → Enter** (FC06 자동, 보낼 바이트를 미리 보여 줌) | Modbus Poll·OpenModScan 도 칸 더블클릭 → 쓰기 창. |
| 40007~40008 을 float CDAB 로 보기 | **오른쪽 클릭 → 형식 F32 → 순서 CDAB → 저장 (클릭 6)**<br>위 «표시 U16▾» 에는 U16/S16/HEX/BIN 만 있다. | Modbus Poll: 칸 고르기 → Display 메뉴 «Float Little-endian byte swap»(이름과 CDAB 의 대응은 문서에 없음).<br>OpenModScan: Float (MSRF)/(LSRF) + Swap Bytes(MSRF/LSRF 풀이는 출처 미확인).<br>ModbusMechanic: «Byte swap»·«Word swap» 체크. |

**첫 화면 컨트롤 수**
- 1400 폭 **52개** + 값 칸 10: 버튼 23, 고르기 11, 입력칸 10, 체크 8
- 1000 폭 **52개**(값 칸 2개는 아래로 밀림)

대부분이 안 쓰는데 기본으로 보이는 것(약 14개):
- 응답 기다림·재시도·요청 간격
- 모든 폴링 멈춤, 한 칸도 0F·10 으로 쓰기
- 값 기록(폴링마다/바뀔 때만·기록 시작), 통계 표·초기화
- 표 이름, 추세, CSV 저장·불러오기

**헷갈리는 곳**

1. **0 기준(기본)에서 시작 칸에 40001 을 넣으면 그대로 주소 40001(0x9C41)을 읽는다.** 장비는 예외 02 로 답하고, 칸 이름은 «40001 · 40002 …» 로 그럴듯하게 나온다.
   - 오류 줄에 «0/1 기준을 확인하세요» 라는 말은 있다. 하지만 «PLC (40001)» 표기로 바꾸는 버튼은 없다.
   - PLC 표기에서는 40001·30001 을 알아듣고 함수까지 바꿔 준다. 그러니 0 기준에서도 같은 판단으로 안내할 수 있다.
   - 근거: `apps/modbus-master/src/model.ts:130`(zero 분기는 그대로), `:132-137`(PLC 분기), 기본값 `App.tsx:134-137`
   - 캡처: `modbus-master-t2-40001-in-zero-1000.png`
2. **float·32비트는 오른쪽 버튼으로만 정한다.** 칸의 title 말풍선(«오른쪽 버튼으로 이름·형식»)에만 안내가 있다. 위의 «표시» 고르기에는 U16/S16/HEX/BIN 만 있다. 첫 검토 Slave #3 과 같은 문제다(Slave 는 10/18 에 «형식 지정…» 항목을 넣어 고쳤다).
   - 근거: `App.tsx:690-694`(onContextMenu), `:1103-1112`(표시 고르기), `apps/modbus-master/src/i18n.ts:145`
   - 캡처: `modbus-master-t4-point-f32-1000.png` → `modbus-master-t4-after-f32-1000.png`
3. **첫 연결 방식이 «시리얼 (RTU)» 다.** Modbus TCP 장비라면 고르기를 바꿔야 한다. Net Scan 이 찾은 장비를 넘겨받는 길도 아직 없다(첫 검토 #25).
   - 근거: `App.tsx:115-118`
4. **왼쪽 칸에 고급 칸이 늘 펼쳐져 있다.** 재시도·요청 간격·«한 칸도 0F·10 으로 쓰기»·값 기록·통계 표 9줄이다. 특히 «0F·10» 은 함수 코드 번호를 아는 사람만 읽을 수 있다.
   - 근거: `App.tsx:893-906`, `:923-928`, `:933-999`
   - 캡처: `modbus-master-first-1400-ko.png`
5. **연결 전 첫 화면에 안내가 없다.** 값 칸 10개가 «—» 로만 차 있고, «연결하면 1초마다 읽습니다 · 두 번 눌러 쓰기 · 오른쪽 버튼으로 형식» 같은 한 줄이 없다. TCP·UDP·Serial 은 빈 화면 안내가 있다.
   - 근거: `App.tsx:768-769`(연결 전에는 빈 글)
   - 캡처: `modbus-master-first-1000-ko.png`
6. **표 탭의 빨간 오류 수가 원인을 고친 뒤에도 남는다.** 40001 을 0 으로 고쳐 정상으로 읽어도 탭에 «4» 가 계속 붙어 있어 지금도 문제가 있는 것처럼 보인다(누적 통계).
   - 근거: `App.tsx:1010`, `:1028-1032`
   - 캡처: `modbus-master-t4-after-f32-1000.png`
7. **연결 직후 첫 요청이 «SEND FAIL The port is disconnected» 로 한 번 실패해 탭에 «1» 이 붙었다.** 가짜 백엔드의 순서 문제일 수 있어 실기로 확인해야 한다.
   - 캡처: `modbus-master-t1-polling-1400-en.png`
8. 좋은 점:
   - 쓰기 창이 «보낼 함수: FC06 Write Single Register» 와 보낼 바이트를 미리 보여 준다. 여러 값은 «10, 20, 30» 으로 한 번에 쓴다(`modbus-master-t3-write-dialog-1000.png`).
   - 형식 창이 «2칸 사용: 6 ~ 7 · 장비 설명서의 Word swap·Byte swap 에 맞추세요» 로 설명한다.
   - 통신 기록 «풀이» 가 `#4 id1 FC03 HR 40001..40010 → 예외 02 없는 주소` 처럼 요청과 응답을 짝지어 보여 준다. 첫 검토 Serial #8 에서 바랐던 것이 여기에는 있다.
   - «찾기…» 창에서 국번 찾기·주소 범위 찾기를 한다. Modbus Poll(Address Scan)·OpenModScan(MODBUS Scanner)·ModbusMechanic(RTU scanner)과 같은 급이다(`modbus-master-t5-scan-1000.png`).

---

## 2. 경쟁 도구는 어떻게 하나 (요약)

| 도구 | 첫 화면·방식 고르기 | 보내기 형식·줄 끝 | 처음 쓰는 사람 돕기 |
|---|---|---|---|
| Hercules | **탭**: Serial · TCP Client · TCP Server · UDP · Test mode · UDP Config | 보내기 칸 3개(F1~F3). `$yy` 16진·`#xxx` 10진 이스케이프. «Transmit EOL» CRLF/LF/CR | 출처 미확인 |
| Packet Sender | 모드 탭 없음. 한 줄 폼(Name·ASCII·HEX·Address·Port·방식) + 저장 패킷 표. 서버는 켜자마자 듣는다 | **ASCII·HEX 칸이 나란히**, ASCII 는 `\r\n`·`\XX` 를 섞어 쓴다(Mixed ASCII) | 저장 패킷 표, 로그 줄에서 바로 패킷으로 저장 |
| sokit | **탭**: Server(처음) · Transfer(중계) · Client · Notepad | 텍스트 기본, `[0D 0A]` 처럼 대괄호 안만 HEX | — |
| NetAssist | «协议类型» **드롭다운**(UDP · TCP Client · TCP Server). 버튼이 打开↔关闭 | ASCII/HEX 고르기, «自动解析转义符» | 2차 자료뿐(출처 미확인 많음) |
| ncat | 명령줄 `ncat host port` / `-l` / `-u` | `-C` 로 CRLF, `-x` HEX 덤프 | man 페이지 |
| Packet Sender 응답 | Settings → Smart Responses 5줄, Exact/Contains/Starts/Ends | 줄마다 Mixed ASCII/HEX | 위에서부터 처음 맞는 것 하나만 응답 |
| Docklight | Receive Sequence → Action «Answer» | 와일드카드 `?`(한 글자)·`#`(0~1) | 예제 프로젝트(첫 검토) |
| Termission | 규칙 표 없음, «Device Bot» C#/JS 함수 | 문자열/HEX | 스크립트 템플릿 |
| Modbus Poll | 표 하나 + **F3 연결·F8 정의** 두 창. TCP 기본 127.0.0.1:502, 타임아웃 1000 ms | 0 기준 기본, «PLC Addresses (Base 1)» 체크. Display 메뉴 28가지 | 빠른 시작 페이지, F6 한 번 읽기 |
| modpoll | 명령 한 줄 | `-r` **1 기준이 기본**, `-0` 이면 0 기준. `-f`·`-i`·`-e` 순서 | — |
| QModMaster | 창 하나에 Mode·Slave·Scan Rate·FC·Start·Count·Format | Base Addr 기본 0. 형식은 Binary/Decimal/Hex 뿐 | Bus Monitor |
| OpenModScan | 표 위 칸(Device ID·Start·Length·Point Type·**Address Base**) | **1 기준이 기본**, Float (MSRF)/(LSRF) + Swap Bytes | 여러 창(Tile·Tabbed), Show Traffic |
| ModbusMechanic | 메뉴(Read Holding 등) | «Byte swap»·«Word swap» 체크 | Register/RTU scanner |
| Radzio Modbus Master | TCP·RTU·RTU over TCP, 여러 슬레이브 | float 표시 모드 | UI 단계는 출처 미확인 |

근거(대표):
- hw-group.com/software/hercules-setup-utility
- github.com/dannagle/PacketSender (README, `src/mainwindow.ui`, `src/settings.ui`, `src/packet.cpp`), packetsender.com/documentation
- github.com/sinpolib/sokit (`src/sokit/main.cpp`, `serverform.ui`, `toolkit.cpp`)
- NetAssist: gitcode.csdn.net 2차 자료(공식 문서 못 찾음)
- nmap.org/ncat/guide/ncat-usage.html, nmap.org/book/ncat-man.html
- Docklight V2.1 매뉴얼 사본(manualzilla) — docklight.de/manual 웹판은 하위 페이지를 열지 못함
- github.com/junian/termission (`src/Termission.Core/Helpers/Settings.cs`)
- modbustools.com/mbpoll-user-manual.html, modbusdriver.com/modpoll.html
- github.com/zhanglongqi/qModMaster(SourceForge 원본의 사본), github.com/sanny32/OpenModScan (`formmodsca.ui`, `displaydefinition.h`)
- github.com/SciFiDryer/ModbusMechanic, en.radzio.dxp.pl/modbus-master-simulator

다른 도구에서 볼 점:
- **TCP/UDP: 방식을 탭으로 보인다(Hercules·sokit).** 각 탭이 자기 주소·포트를 따로 기억한다.
- **Packet Sender 는 ASCII 와 HEX 를 동시에 보여 줘서 형식 고르기 자체가 없다.**
- **Modbus: 1 기준이 기본인 도구(modpoll·OpenModScan)와 0 기준인 도구(Modbus Poll·QModMaster)가 섞여 있다.** 그래서 «어느 기준인지 화면에 크게 보이기» 와 «4xxxx 입력 알아듣기» 가 중요하다.
- **응답 규칙: Packet Sender 의 Exact Match 는 글자 그대로 비교한다.** 와일드카드는 Docklight 처럼 따로 넣는 특수 문자로 둔다.

---

## 3. 휴리스틱 평가 (Nielsen 10 + 산업용 도구)

| 항목 | 판정 | 내용 |
|---|---|---|
| 시스템 상태 보이기 | ◎ | 네 앱 모두 상태 줄·처리량·창 제목이 있다. Master 는 표마다 «✓ 14:40:16 · 8 ms» 와 요청·정상·타임아웃·예외 수가 있다. |
| 시스템 상태 보이기 | ✗ | TCP·UDP 1180 폭 이하에서 상세가 숨는다. Master 탭의 오류 수는 고친 뒤에도 남는다. |
| 실제 세계와 맞추기 | △ | Master 0 기준 기본(40001 사고). «기본 대상»·«0F·10»·«조용한 시간» 같은 말이 낯설다. |
| 통제·자유(되돌리기) | ◎ | 규칙 지우기 되돌리기, Esc 반복 멈춤, 쓰기 전 미리보기가 있다. |
| 일관성 | ✗ | 보내기 기본이 TCP ASCII·CR LF / UDP HEX·없음 / Simulator ASCII·CR LF / 규칙 HEX 로 다르다. 끊기 버튼 이름도 «멈춤»(TCP)·«끊기»(Master)로 다르다. |
| 오류 예방 | △ | 쓰기 함수·바이트 미리보기, 브로드캐스트 허용 알림, 가려진 규칙 알림은 좋다. ASCII 와일드카드, 0 기준 40001 은 막지 않는다. |
| 기억보다 알아보기 | △ | Master 형식이 오른쪽 버튼 뒤에 있고, Simulator 의 `\x3F` 규칙은 외워야 한다. |
| 유연성·효율 | ◎ | 단축키(F4·F6·F8·Ctrl+L), 명령 목록, 표 여러 개, CSV, 값 기록이 있다. |
| 미니멀 디자인 | △ | TCP·UDP 50개, Master 52개가 첫 화면에 보인다. Simulator 29개는 적당하다. |
| 오류 알아보고 고치기 | ◎ | 예외 02 에 «시작 주소·개수·0/1 기준을 확인하세요», HEX 가 아닌 글자 위치, 묶을 주소 문제에 이 PC 주소 목록을 보여 준다. |
| 도움말 | ○ | 앱마다 도움말(F1)이 있고 빈 화면 안내가 있다. Master 만 첫 화면 안내가 없다. |
| 안전한 기본값 | ◎ | 자동 재접속, 실행 중 설정 잠금(🔒 안내), 서버 «모두에게» 와 끊긴 상대 막기가 있다. |
| 연결 상태가 분명함 | ◎ | 빨간 큰 버튼, 상태 점, 창 제목이 있다. |
| 실수로 보내기 | ○ | Enter·버튼으로만 보낸다. Master 쓰기는 창에서 «쓰기» 를 눌러야 나간다. |

---

## 4. 쉽게 만드는 변경 (우선순위 순)

크기 S = 반나절 이하, M = 하루 안팎. 기능은 하나도 빼지 않는다. 첫 검토의 번호와 겹치는 것은 «(첫 검토 #n)» 으로 적었다.

| # | 무엇 | 지금(파일:줄) | 다른 도구 | 고칠 방법 | 효과·크기 |
|---|---|---|---|---|---|
| 1 | Master: 0 기준에서 4xxxx·3xxxx 입력을 알아듣기 | 주소 40001 을 그대로 읽음 `apps/modbus-master/src/model.ts:130` | Modbus Poll «PLC Addresses (Base 1)», modpoll `-r` 1 기준 기본 | zero·one 모드에서 5~6자리이고 앞자리가 0·1·3·4 이면 노란 알림줄을 띄운다: «40001 은 PLC 표기로 보입니다 — [PLC 표기로 바꾸고 주소 0 으로] [그대로 40001]». 앞의 버튼은 `setAddrMode("plc")` + `parseAddr` PLC 분기를 재사용한다. 첫 검토 #7(Serial·TCP 요청 창)과 같은 문구를 쓴다 | 가장 흔한 사고 차단 · S <br>**✅ 10/18 적용** — 0·1 기준 시작 칸에 5~6자리 0·1·3·4xxxx 를 넣으면 그대로 읽고 노란 알림줄 «PLC 표기라면 주소 0(FC03)» + [PLC 표기로 바꾸기](주소 표기 PLC·시작·함수 맞춤). 0 기준에서 65535 를 넘는 410000 은 오류 대신 같은 알림줄. `model.ts` `plcGuess` + 시험. 연결 뒤 첫 한 번 알림은 하지 않음 |
| 2 | Master: «표시» 고르기 끝에 «형식 지정…(32비트·float)» | 표시는 U16/S16/HEX/BIN 만, 형식은 오른쪽 버튼 `App.tsx:1103-1112`, `:690-694` | Modbus Poll 은 칸 선택 → Display 메뉴 | Slave 10/18 적용과 같게 한다. 마지막 항목을 고르면 고른 칸(없으면 첫 칸)의 `PointDialog` 를 연다. 칸 말풍선 대신 연결 뒤 첫 한 번 알림 «두 번 눌러 쓰기 · 오른쪽 버튼으로 형식» | float 찾기 실패 방지 · S <br>**✅ 10/18 적용** — «표시» 끝 «형식 지정…(32비트·float·문자열)» — 고른 칸(없으면 첫 칸)의 형식 창을 열고 고르기 값은 그대로. 연결 뒤 첫 한 번 알림은 하지 않음 |
| 3 | TCP: 로그 보기 기본을 «둘 다» 로 | 보기 HEX, 보내기 ASCII `apps/tcp/src/App.tsx:286`, `:355` | Packet Sender 로그는 HEX·ASCII 를 함께 보여 준다 | 첫 실행 기본을 `"both"`(저장값이 있으면 그것). UDP `apps/udp/src/App.tsx:285` 도 같게 | 받은 글을 바로 읽음 −1클릭 · S <br>**✅ 10/18 적용** — TCP·UDP 저장값이 없으면 «둘 다» |
| 4 | UDP: 보내기 기본 ASCII + HEX 아닌 글자 길 안내 | HEX 기본 `apps/udp/src/App.tsx:354`, 오류만 표시 `:821-823` | Packet Sender Mixed ASCII, Hercules 텍스트 기본 | 첫 실행 기본을 TCP 와 같은 `{mode:"ascii"}`(줄 끝은 없음 유지). HEX 모드에서 글자가 들어오면 오류 옆에 [ASCII 로 보내기] 버튼(기존 `modeSwitch` 재사용) | 첫 보내기 −2클릭, 앱 사이 일관성 · S <br>**✅ 10/18 적용** — 저장값이 없으면 ASCII(줄 끝 없음). HEX 오류 옆 [ASCII 로 보내기] — 친 글 그대로 ASCII 로 바꾸고 보낼 수 있으면 바로 보냄(시작 전·보낼 곳 없음이면 [ASCII 로 바꾸기]) |
| 5 | Simulator: 빈 화면 예시를 버튼으로 | 글로만 있음 `shared/autoReplyText.ts:6`, `AutoReplyPanel.tsx:338` | Docklight 예제 프로젝트(ModbusRtuCrc), Packet Sender 기본 패킷 | 빈 화면에 [Modbus RTU 03 응답 예] [SCPI *IDN? 예] [에코(받은 것 그대로)] 버튼. 누르면 규칙 하나를 채워 넣는다(SCPI 예는 ASCII·글자 그대로·CR LF) | 첫 규칙까지 결정 4→0 · S <br>**✅ 10/18 적용** — 빈 화면에 [Modbus RTU 03 응답] [SCPI *IDN? 응답] [에코(받은 것 그대로)] — 누르면 규칙 하나 + «자세히»(예시 요청 미리보기) 펼침. 같은 칸을 쓰는 Serial·TCP·UDP 자동응답에도 나옴. SCPI 예는 #6 와일드카드 끔으로 «*IDN?» 그대로 |
| 6 | Simulator: ASCII 패턴 «글자 그대로 / 와일드카드» 고르기 | `?`·`*` 가 늘 와일드카드 `shared/autoReplyText.ts:19`, `AutoReplyPanel.tsx:369-384` | Packet Sender Exact Match 는 글자 그대로, Docklight 와일드카드는 오른쪽 클릭으로 넣는 `?`·`#` | 규칙에 `wild?: boolean` 을 두고 ASCII 새 규칙은 끔(글자 그대로)으로 한다. 켜면 지금과 같다. 저장된 옛 규칙은 `wild:true` 로 읽어 동작이 바뀌지 않게 한다. 패턴에 `?`·`*` 가 있고 와일드카드가 켜져 있으면 «SCPI 의 ?·* 는 글자 그대로 비교하려면 끄세요» 알림줄 | SCPI 오응답 차단 · M(백엔드 매칭 함께) <br>**✅ 10/18 적용** — 규칙마다 «와일드카드» 체크(ASCII 일 때). 새 규칙·예제는 끔, 칸 없는 옛 규칙은 켜짐으로 읽어 동작 유지. 켠 규칙에 ?·* 가 있으면 알림줄 + [와일드카드 끄기]. core `RuleSpec.wild`(serde 기본 true)·cargo 시험, 인터락(무엇이든 맞음·같은 패턴)도 반영. Serial·TCP·UDP 자동응답도 같은 칸이라 함께 |
| 7 | Simulator: 통신 기록 줄 → 규칙 만들기 | 메뉴에 복사·다시 보내기뿐 `apps/simulator/src/App.tsx:704-720` | Packet Sender 는 로그 줄을 바로 패킷으로 저장 | RX·NO MATCH 줄 오른쪽 클릭에 «이 요청으로 규칙 만들기» 를 넣는다. HEX 패턴에 받은 바이트를 넣고 Modbus 프레임이면 끝 2바이트를 `**` 로 바꾼 뒤 응답 칸에 포커스. `logMenuItems` 에 `addRule?` 를 더한다 | 패턴 옮겨 적기 없앰 · S <br>**✅ 10/18 적용** — RX 줄과 «NO MATCH» 줄(바로 앞 RX)의 오른쪽 버튼 «이 요청으로 규칙 만들기». 글자면 ASCII·글자 그대로(끝 CR LF 는 응답 줄 끝으로), Modbus RTU 면 CRC 자리 «**»·응답 CRC16 Modbus, Modbus TCP 면 트랜잭션 ID «?? ??». 무엇이든 맞는 규칙이 있으면 그 위에 넣고 응답 칸에 포커스 |
| 8 | Simulator: 새 규칙 기본을 직전 규칙 방식으로 | 늘 HEX·정확히 `shared/autoReply.ts:74-82` | — | `blankRule` 에 직전 규칙(없으면 «장비가 먼저 보내기» 의 형식)의 patternMode·reply.mode·suffix 를 물려준다 | 텍스트 장비 규칙마다 −4클릭 · S <br>**✅ 10/18 적용** — 직전 규칙의 받기 HEX/ASCII·정확히/포함, 응답 HEX/ASCII·체크섬·줄 끝을 물려받음(와일드카드는 늘 끔). 규칙이 없을 때 «장비가 먼저 보내기» 형식을 따르는 것은 하지 않음 — 빈 화면은 예제 버튼으로 |
| 9 | TCP·UDP: 연결 설정 «고급» 접기 | Nagle·재접속·간격 `apps/tcp/src/App.tsx:640-660`, 브로드캐스트·멀티캐스트·에코 `apps/udp/src/App.tsx:560-588` | Hercules·Packet Sender 는 설정 창에 둔다 | 첫 검토 #1 과 같은 `<details className="adv">`. 기본값과 다르면 펼친 채 시작하고, 제목에 요약(«Nagle 끔 · 재접속 2초», «브로드캐스트 · 239.0.0.1»). 에코는 연결 설정 밖으로 빼서 «받기» 묶음에 둔다 | TCP −4, UDP −4 · S <br>**✅ 10/18 적용** — TCP «고급 연결»(즉시 전송·재접속·간격), UDP «고급 연결»(브로드캐스트·멀티캐스트) 접기, 제목 요약(«Nagle 끔 · 재접속 2초», «브로드캐스트 · 239.0.0.1»), 기본값 아니면 펼침, 열림 상태 저장. 에코는 «받기 설정» 으로 |
| 10 | TCP·UDP: «받기 설정» 접기 | 프레임 구분·조용한 시간·수신 체크섬·파일 저장 `apps/tcp/src/App.tsx:690-758`, `apps/udp/src/App.tsx:620-640` | Docklight Options | 첫 검토 #2 와 같다. 제목에 «조용한 시간 20ms · 체크섬 없음» | −5 · S <br>**✅ 10/18 적용** — TCP «받기 설정»(프레임 구분·끝 문자·조용한 시간·수신 체크섬·서버 에코), UDP «받기 설정»(수신 체크섬·에코) 접기, 제목 요약. «파일로 계속 저장» 은 왼쪽에 그대로 |
| 11 | TCP: 방식을 탭(분할 버튼)으로 | 고르기 안에 숨음 `apps/tcp/src/App.tsx:601-613` | Hercules·sokit 탭, NetAssist 드롭다운 | 왼쪽 칸 맨 위에 [클라이언트 | 서버 | 중계] 분할 버튼을 두고, 방식마다 주소·포트를 따로 저장한다(`cfgByMode`). 바꿀 때 «주소 → 0.0.0.0» 을 조용히 바꾸지 않는다 | 방식 발견성, 주소 덮어쓰기 없음 · M |
| 12 | TCP: 포트 502 면 Modbus TCP 로 제안 | 기본 502 + 조용한 시간 + STATUS? `apps/tcp/src/App.tsx:94`, `:96`, `:919` | — | 첫 실행 기본 포트를 비 Modbus 값(예: 5000)으로 바꾸거나, 502 로 접속했는데 프레임 구분이 Modbus TCP 가 아니면 알림줄 한 번: «Modbus TCP 로 보면 요청·응답이 풀이됩니다 — [바꾸기] [Modbus Master 열기]» | 기본값끼리 어긋남 해소 · S |
| 13 | TCP: «멈춤» → «끊기»/«듣기 멈춤» | `apps/tcp/src/i18n.ts:32` | Hercules Connect↔Disconnect, Listen↔Close, NetAssist 连接↔断开 | 클라이언트 «끊기», 서버·중계 «듣기 멈춤». 영어 «Disconnect»/«Stop listening» | 말 일관성 · S <br>**✅ 10/18 적용** — 클라이언트 «끊기»/«Disconnect», 서버·중계 «듣기 멈춤»/«Stop listening»(`stopClient`·`stopListen`, 말풍선도) |
| 14 | TCP: 상대 목록 줄 넘침 | IPv6 주소가 «끊기» 를 밀어냄 `apps/tcp/src/App.tsx:679-686` | sokit «Connections» 목록 + Disconn·All | `.peer .mono` 에 `min-width:0; overflow:hidden; text-overflow:ellipsis` + title 로 전체 주소. «모두 끊기» 버튼 하나 추가 | 버튼 안 보임 해소 · S <br>**✅ 10/18 적용** — `.peer .mono` 줄임표 + `title` 전체 주소, «끊기» 는 늘 보임. «모두 끊기» 는 하지 않음 |
| 15 | TCP·UDP: 좁은 창에서 상세 보이기 | `apps/tcp/src/App.css:568-`, `apps/udp/src/App.css:568-` | — | 첫 검토 #9 와 같다(줄을 누르면 오른쪽 칸 열기, 버튼 이름 «☰ 명령·상세») | 1000 폭에서 «아무 일도 안 일어남» 해소 · S |
| 16 | TCP·UDP: 보내기 둘째 줄 «⋯ 더보기» | `apps/tcp/src/App.tsx:947-990`, `apps/udp/src/App.tsx:813-838` | — | 첫 검토 #3 과 같다. Modbus…·문자 간·파일 보내기를 팝오버로, 횟수는 반복을 켰을 때만 보인다 | −4, 서버 모드 줄 넘침 해소 · S |
| 17 | UDP: «기본 대상» → «보낼 곳» | `apps/udp/src/i18n.ts:44`, `App.tsx:762-775` | Hercules «Module IP / Port» | 보내기 고르기 첫 항목을 «보낼 곳 (192.168.0.10:5000)», 둘째를 «마지막으로 보내온 쪽» 으로. 왼쪽 칸 제목과 같은 말 | 이해도 · S |
| 18 | Master: 첫 연결 방식 고르기 + 첫 화면 안내 | 시리얼 기본 `App.tsx:115-118`, 연결 전 안내 없음 `:768-769` | Modbus Poll F3 연결 창이 종류부터 묻는다 | 처음(저장값 없음)에는 값 칸 자리에 카드: «어떤 장비인가요? [Modbus TCP (이더넷)] [Modbus RTU (시리얼)] · 주소는 [0 기준] [PLC 40001]». 누르면 연결 방식·주소 표기를 정하고 주소 칸에 포커스. «다시 보지 않기» | 첫 읽기 결정 2→1, 주소 혼동 감소 · M |
| 19 | Master: 왼쪽 고급 칸 접기 | 재시도·간격·0F·10·값 기록·통계 `App.tsx:893-906`, `:923-999` | Modbus Poll 은 연결 창·Setup 메뉴, OpenModScan 은 Setup 메뉴 | «통신 세부(기다림·재시도·간격·0F/10)» 와 «통계» 를 접기로 한다. 통계 제목에 «요청 n · 타임아웃 m». 값 기록은 표 도구줄의 CSV 옆으로 옮긴다. «한 칸도 0F·10 으로 쓰기» → «한 칸도 '여러 칸 쓰기' 명령(FC15·16)으로» | 첫 화면 약 −10 · S <br>**✅ 10/18 적용** — «통신 세부»(기다림·재시도·간격·여러 칸 쓰기)·«통계» 접기, 제목 요약(«요청 n · 오류 m», 오류 있으면 빨강), 통신 세부가 기본값 아니면 펼침. 문구 «한 칸도 «여러 칸 쓰기» 명령(FC15·16)으로». 값 기록 옮기기는 하지 않음 |
| 20 | Master: 탭 오류 수를 «최근» 으로 | 누적 수가 남음 `App.tsx:1010`, `:1028-1032` | — | 탭 배지는 «지금 실패 중» 일 때만 빨강으로 하고, 성공으로 돌아오면 회색 누적 수(또는 지움). 누적은 통계에 둔다 | 고친 뒤에도 «문제 있음» 으로 보이는 것 해소 · S <br>**✅ 10/18 적용** — 빨간 배지는 지금 실패 중(●)일 때만, 정상으로 돌아오면 회색 누적 수(말풍선에 «통계 초기화로 지움») |
| 21 | Simulator: «장비가 먼저 보내기» 접기 | 규칙 아래 늘 펼침 `apps/simulator/src/App.tsx:604-663` | — | «장비가 먼저 보내기(상태·하트비트)» 를 접기로 하고, 반복이 켜져 있으면 펼치고 제목에 «1000 ms 마다 보내는 중» | 규칙 칸 오해 감소, −8 · S <br>**✅ 10/18 적용** — «장비가 먼저 보내기» 접기(기본 접힘, 반복을 켜면 펼침, 열림 상태 저장), 접힌 제목에 내용 또는 «1000 ms 마다 보내는 중» |
| 22 | TCP·UDP 자동응답과 Simulator 의 관계 알리기 | 같은 기능이 세 곳 `apps/tcp/src/App.tsx:1030`, `apps/udp/src/App.tsx:870` | — | TCP·UDP «자동응답» 접기 제목 옆에 «규칙이 많으면 Simulator» 한 줄. 규칙 묶음 저장 형식이 같다면 «Simulator 로 열기» 는 다음 판 | 앱 고르기 혼동 감소 · S |
| 23 | Net Scan → Master 넘기기 | 없음 | — | 첫 검토 #25. Master 쪽은 실행 인자 `--tcp host:port --unit n` 을 받아 연결 방식·주소를 채운다(Rust 쪽 다음 판) | 앱 사이 이동 · M |
| 24 | 네 앱 보내기 기본값 한 곳에서 | TCP ASCII·CR LF / UDP HEX / Simulator ASCII·CR LF / 규칙 HEX | — | `shared` 에 «처음 보내기 형식» 상수 하나를 두고 네 앱과 `blankRule` 이 같이 쓴다. 설정 창에 «처음 보내기 형식: 글자/HEX» | 일관성 · S |

---

## 5. 바로 할 10개

기능을 빼지 않고 옮기기·숨기기·기본값만 바꾼다. 다른 작업자가 고치는 `apps/serial`·`shared/ModbusBuilder`·`modbusBuild`·`tips` 는 피했다(#1 의 문구만 맞춘다).

1. **Master 4xxxx 입력 알아듣기** (#1) — **✅ 10/18 적용**: 0·1 기준 시작 칸에 5~6자리 0·1·3·4xxxx 를 넣으면 그대로 읽고 노란 알림줄 «PLC 표기라면 주소 0(FC03)» + [PLC 표기로 바꾸기](주소 표기 PLC·시작·함수 맞춤). 0 기준에서 65535 를 넘는 410000 은 오류 대신 같은 알림줄. `model.ts` `plcGuess` + 시험. 연결 뒤 첫 한 번 알림은 하지 않음
   - `apps/modbus-master/src/App.tsx:1073-1084` 의 `onCommit` 에서 zero/one 모드이고 `parseAddr(s, "plc", sel.fc)` 가 성공하면, 그대로 적용하되 알림줄 «40001 은 PLC 표기로 보입니다 — [PLC 표기로 바꾸기]» 를 띄운다.
   - 버튼은 `setAddrMode("plc")` + `patchTable({start, fc})`.
   - `model.test.ts` 에 경우 하나 추가(`parseAddr("40001","plc",3)` 는 이미 있음 — zero 에서 «PLC 로 보임» 판정 함수만 새로).
2. **Master «표시» 에 «형식 지정…»** (#2) — **✅ 10/18 적용**: «표시» 끝 «형식 지정…(32비트·float·문자열)» — 고른 칸(없으면 첫 칸)의 형식 창을 열고 고르기 값은 그대로. 연결 뒤 첫 한 번 알림은 하지 않음
   - `App.tsx:1106-1111` 고르기 끝에 `<option value="__point">형식 지정…(32비트·float·문자열)</option>`.
   - 고르면 `setPointAt(selAddr ?? sel.start)` 하고 값은 되돌린다. Slave 10/18 적용과 같은 문구를 쓴다.
3. **TCP·UDP 로그 보기 기본 «둘 다»** (#3) — **✅ 10/18 적용**: TCP·UDP 저장값이 없으면 «둘 다»
   - `apps/tcp/src/App.tsx:286`, `apps/udp/src/App.tsx:285` 의 `load("view", "hex")` → `"both"`.
4. **UDP 보내기 기본 ASCII + [ASCII 로 보내기]** (#4) — **✅ 10/18 적용**: 저장값이 없으면 ASCII(줄 끝 없음). HEX 오류 옆 [ASCII 로 보내기] — 친 글 그대로 ASCII 로 바꾸고 보낼 수 있으면 바로 보냄(시작 전·보낼 곳 없음이면 [ASCII 로 바꾸기])
   - `apps/udp/src/App.tsx:354` 기본 `mode:"ascii"`, placeholder «PING» 그대로.
   - HEX 오류(`previewErr`)일 때 `.preview.err` 옆에 `modeSwitch.changeMode("ascii")` 버튼.
5. **Simulator 빈 화면 예제 버튼 3개** (#5) — **✅ 10/18 적용**: 빈 화면에 [Modbus RTU 03 응답] [SCPI *IDN? 응답] [에코(받은 것 그대로)] — 누르면 규칙 하나 + «자세히»(예시 요청 미리보기) 펼침. 같은 칸을 쓰는 Serial·TCP·UDP 자동응답에도 나옴. SCPI 예는 #6 와일드카드 끔으로 «*IDN?» 그대로
   - `shared/AutoReplyPanel.tsx:338` 의 `empty-guide` 아래에 버튼 세 개. 규칙은 `autoReply.ts` 에 `exampleRules` 로 둔다.
   - SCPI 예는 #6 전까지 패턴을 `\x2AIDN\x3F` 로 넣어 정확히 맞게 한다.
6. **Simulator 기록 줄 → 규칙** (#7) — **✅ 10/18 적용**: RX 줄과 «NO MATCH» 줄(바로 앞 RX)의 오른쪽 버튼 «이 요청으로 규칙 만들기». 글자면 ASCII·글자 그대로(끝 CR LF 는 응답 줄 끝으로), Modbus RTU 면 CRC 자리 «**»·응답 CRC16 Modbus, Modbus TCP 면 트랜잭션 ID «?? ??». 무엇이든 맞는 규칙이 있으면 그 위에 넣고 응답 칸에 포커스
   - `shared/LogMenu.tsx` `logMenuItems` 에 `addRule?: (bytes)=>void`(RX 줄만)를 더한다.
   - `apps/simulator/src/App.tsx:710-719` 에서 넘겨 `setRules([...rules, {...blankRule(n), pattern: hex(b)}])`.
7. **TCP·UDP «고급 연결»·«받기 설정» 접기** (#9·#10) — **✅ 10/18 적용**: TCP·UDP 왼쪽 «고급 연결»·«받기 설정» 접기(Serial 51a66c6 과 같은 모양·CSS, 요약·기본값 아니면 펼침·열림 저장)
   - TCP `App.tsx:640-660`, `690-758`, UDP `560-588`, `620-640` 을 `<details className="adv">` 로 묶는다.
   - 기본값과 다르면 펼침, 열림 상태 저장(첫 검토 #30).
   - 에코는 «받기 설정» 안으로 옮긴다.
8. **TCP 버튼 이름 «끊기»/«듣기 멈춤» + 상대 목록 줄임표** (#13·#14) — **✅ 10/18 적용**: «끊기»/«듣기 멈춤», 상대 주소 줄임표
   - `apps/tcp/src/i18n.ts:32` 를 `stopClient`·`stopListen` 둘로 나눈다(`App.tsx:662`, `:764`).
   - `App.css` 의 `.peer .mono` 에 줄임표, `title={p.addr}`.
9. **Master 왼쪽 «통신 세부»·«통계» 접기 + 탭 배지** (#19·#20) — **✅ 10/18 적용**: «통신 세부»·«통계» 접기, 탭 배지는 실패 중일 때만 빨강
   - `App.tsx:893-906`·`923-928`, `950-999` 를 `<details className="adv">` 로 감싼다(Slave 와 같은 CSS).
   - 탭 배지는 `bad`(마지막 결과 실패)일 때만 빨강.
10. **Simulator «장비가 먼저 보내기» 접기 + 새 규칙 방식 물려받기** (#21·#8) — **✅ 10/18 적용**: «장비가 먼저 보내기» 접기, 새 규칙은 직전 규칙 방식 물려받기
    - `apps/simulator/src/App.tsx:604-663` 을 `<details>` 로, `open={repeating}`.
    - `AutoReplyPanel.tsx:330-334` 의 `add` 가 직전 규칙의 `patternMode`·`reply.mode`·`reply.suffix` 를 복사한다.

다음 차례(M): ~~#6 ASCII 와일드카드 고르기(백엔드 매칭과 함께)~~ **✅ 10/18 적용(위 #6)**, #18 Master 첫 실행 카드(첫 검토 #17 과 함께), #11 TCP 방식 탭, #23 Net Scan → Master.

검증: 고친 뒤 `e2e/ui-preview/smoke.mjs` 를 돌린다. 접힌 칸은 «펼친 뒤 누르기» 단계가 필요하다(첫 검토 적용 기록 참고). 첫 화면 컨트롤 수 목표는 TCP 50→약 32, UDP 50→약 32, Master 52→약 40(값 칸 제외), Simulator 29 유지다.

---

## 6. PortDock 이 이미 더 쉬운 점

- **Master 첫 읽기:** 표 기본값(국번 1·FC03·0·10·1000 ms·폴링 켬) 덕에 연결 버튼 하나로 값이 찬다. Modbus Poll 은 F3·F8 두 창이 필요하고, OpenModScan 은 처음 Point Type 이 Coils 다.
- **Master 쓰기·풀이:** 쓰기 창이 함수 코드와 보낼 바이트를 미리 보여 준다. 통신 기록이 요청·응답을 짝지어 «FC03 HR 40001..40010 → 예외 02 없는 주소» 처럼 풀어 준다. Modbus Poll 의 Communication 창은 바이트만 보여 준다.
- **TCP 서버의 보낼 상대 고르기·끊긴 상대 막기, 중계 모드:** Hercules 는 출처 미확인이고, sokit 은 중계를 별도 탭으로 한다.
- **UDP «이 PC 주소» 목록과 «보내온 상대 → 여기로 답하기»:** 묶을 주소를 틀렸을 때 이 PC 주소를 함께 보여 준다.
- **Simulator 규칙 미리보기:** «예시 요청» 을 적으면 맞는지와 응답 바이트를 바로 보여 준다. 가려진 규칙·같은 패턴을 알림줄로 알려 준다. Packet Sender Smart Response 는 5줄 고정이고 미리보기는 출처 미확인이며, Termission 은 코드를 써야 한다.
- **네 앱 모두 1000×640 에서 가로 스크롤 0**(캡처 16장, `scroll` 측정값이 창 크기와 같음). 한국어·영어 전환이 즉시 된다.

## 7. 확인 못 한 것

- 실제 앱 동작은 보지 않았다. 다음 둘은 가짜 백엔드에서만 본 것이다.
  - Master 연결 직후 첫 요청 SEND FAIL(1-4 #7)
  - UDP 브로드캐스트 오류가 둘로 뜨는 것(1-2 #5)
- **Hercules:** 받은 데이터 HEX 보기 방법, 서버 접속자 목록, 매크로 문법, 브로드캐스트
- **SocketTest:** HEX·CR/LF·클릭 순서·접속자 목록(공식 페이지에 설명 없음)
- **NetAssist:** 공식 매뉴얼을 못 찾았다(2차 자료만). 브로드캐스트 위치·자동 응답
- **sokit:** HEX·ASCII 동시 표시, 줄 끝 옵션
- **Docklight:** 최신 웹 매뉴얼(하위 페이지가 스크립트로만 열림). V2.1 사본으로만 봤다.
- **Packet Sender:** 서버 접속자 목록 화면, Smart Response 규칙별 지연·미리보기
- **Modbus Poll:** 기본 Scan Rate 값
- **OpenModScan:** MSRF/LSRF 풀이 문구
- **Radzio Modbus Master Simulator:** UI 단계 전부(공식 페이지에 설명 없음)
- **ModbusMechanic:** 주소 기준·폴링 주기·쓰기 단계
