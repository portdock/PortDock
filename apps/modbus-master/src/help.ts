// Modbus Master 도움말 — 화면 ? 버튼·F1 로 연다(사이트 도구 소개에도 쓴다)
import type { HelpDoc } from "@shared/HelpDialog";
import { logHandlingLines, settingsLines, shortcutLines, windowLines } from "@shared/helpCommon";

export const help: HelpDoc = {
  ko: [
    {
      title: "이 프로그램은",
      body: [
        "PortDock Modbus Master 는 Modbus 장비(PLC·인버터·계측기·센서·HMI 대신 시험할 장비)에 먼저 묻는 «마스터(폴링 도구)» 입니다. 시리얼 RTU 와 Modbus TCP, RTU over TCP 를 씁니다.",
        "- 표(탭) 여러 개를 각각 다른 국번(슬레이브 ID)·함수(01·02·03·04)·주소·주기로 읽습니다.",
        "- 값은 U16·S16·U32·S32·F32·F64·문자열, 워드·바이트 순서(ABCD·CDAB·BADC·DCBA), HEX·BIN 으로 보고, 칸마다 이름을 붙입니다.",
        "- 칸을 두 번 눌러 씁니다(05·06·0F·10). 국번 찾기·주소 범위 찾기, 요청·응답 HEX 와 풀이, 표마다 통계, 값 CSV 기록, 추세 그림이 있습니다.",
        "- 무료(GPL-3.0)이고 화면은 한국어·영어입니다.",
      ],
    },
    {
      title: "처음 쓰는 순서",
      id: "start",
      body: [
        "- 처음 켜면 값 칸 위에 «어떤 장비인가요?» 카드가 나옵니다. [Modbus TCP (이더넷)]·[Modbus RTU (시리얼)] 를 누르면 연결 방식이 맞춰지고 다음에 넣을 칸(장비 주소·포트)으로 갑니다. 주소 표기(0 기준·1 기준·PLC 40001)도 여기서 고릅니다. 연결하거나 «다시 보지 않기» 를 누르면 숨습니다. 처음 연결하면 «두 번 눌러 쓰기·오른쪽 버튼으로 형식» 알림이 한 번 나옵니다.",
        "- 1. 왼쪽 «연결 방식» 을 고릅니다. 시리얼이면 포트·속도·패리티·정지 비트를 장비와 같게, TCP 면 장비 IP·포트(보통 502)를 넣습니다.",
        "- 2. «연결»(F4). 연결되면 표의 «주기» 마다 읽기 시작합니다.",
        "- 3. 가운데 위 표 설정에서 «국번(슬레이브 ID)», «함수», «시작», «개수» 를 장비 설명서대로 맞춥니다. 값 칸 위에 마지막 읽기 결과(✓ 시각·응답 시간 또는 ⚠ 이유)가 나옵니다.",
        "- 4. 다른 영역도 보려면 «+ 표» 로 표를 더합니다. 탭의 숫자는 그 표의 오류(타임아웃·CRC·예외) 누적 수입니다 — 지금 실패 중이면 빨강, 다시 정상으로 읽히면 회색(통계 «초기화» 로 지움).",
        "- 5. 값을 바꾸려면 칸을 두 번 누릅니다(코일·보유 레지스터 표만).",
      ],
    },
    {
      title: "화면 구성",
      body: [
        "- 왼쪽: 연결 방식·포트(또는 IP), «통신 세부» 접기(응답 기다림·재시도·요청 간격·«한 칸도 여러 칸 쓰기로»), 연결 버튼과 상태, «모든 폴링 멈춤», «찾기…», «통계 (전체)» 접기. 값 기록(CSV)은 가운데 표 도구줄의 «값 기록 ▾». 통신 기록 위 막대를 끌면 높이가 바뀌고 기억됩니다(두 번 누르면 처음대로).",
        "- «통신 세부»·«통계» 는 평소 접혀 있고 제목 옆에 요약(«기다림 1000ms · 재시도 0 · 간격 20ms», «요청 n · 오류 m»)이 보입니다. 통신 세부가 기본값과 다르면 펼친 채 시작하고, 열고 닫은 상태는 기억합니다.",
        "- 가운데 위: 표 탭(⏸ = 폴링 안 함, ● = 마지막 읽기 실패, 숫자 = 오류 누적 수 — 지금 실패 중이면 빨강, 아니면 회색), 표 설정(이름·국번·함수·시작·개수·주기·폴링·한 번 읽기), 보기 설정(표시·주소 표기·칸/목록·📈 추세·CSV).",
        "- 가운데: 값 칸. 지난 읽기와 달라진 칸은 잠깐 색이 바뀝니다. 마지막 읽기가 실패하면 칸이 흐려지고(앞 값) 이유가 위에 나옵니다.",
        "- 아래: 추세(넣었을 때)와 통신 기록.",
        ...windowLines("ko"),
      ],
    },
    {
      title: "40001 표기 — 주소 쓰는 법",
      body: [
        "Modbus 통신에 들어가는 주소는 0 부터입니다(«0 기준»). 장비 설명서는 1 부터 세거나(«1 기준») 앞자리로 표를 나타내는 PLC 표기(00001·10001·30001·40001)를 많이 씁니다.",
        "- «주소 표기» 를 장비 설명서에 맞추면 칸·시작 칸·통신 기록 풀이가 모두 그 표기로 나옵니다. 실제로 보내는 주소는 같습니다.",
        "- PLC 표기: 0xxxx 코일(01·05·0F), 1xxxx 입력 접점(02), 3xxxx 입력 레지스터(04), 4xxxx 보유 레지스터(03·06·10). 40001 = 보유 레지스터 0번, 40010 = 9번. 10000 번째부터는 6자리(410000).",
        "- PLC 표기에서 시작 칸에 «30001» 처럼 앞자리가 다른 주소를 넣으면 함수도 그 표(04)로 바뀝니다. 앞자리 없이 «15» 만 넣으면 지금 표의 15번째(1 기준)로 봅니다.",
        "- 0 기준·1 기준에서 시작 칸에 «40001»·«30001» 처럼 PLC 표기로 보이는 수를 넣으면, 넣은 그대로(0 기준이면 주소 40001) 읽되 노란 알림줄에 «PLC 표기라면 주소 0(FC03)» 과 [PLC 표기로 바꾸기] 가 나옵니다. 누르면 주소 표기를 PLC 로 바꾸고 시작·함수를 그 주소로 맞춥니다.",
        "- 읽었는데 예외 02(없는 주소)가 나오거나 값이 한 칸씩 밀려 보이면 대개 0 기준과 1 기준이 섞인 것입니다 — 시작을 1 줄이거나 늘려 보세요.",
      ],
    },
    {
      title: "값 형식과 바이트 순서 고르기",
      body: [
        "- 칸을 오른쪽 버튼(또는 칸 설정)으로 열어 이름·형식·순서를 정합니다. U32·S32·F32 는 2칸, F64 는 4칸, 문자열은 길이/2 칸을 하나로 묶어 보입니다.",
        "- 순서 이름은 값의 바이트 A(가장 큰 쪽)…를 레지스터에 놓는 모양입니다. ABCD = 큰 쪽 먼저(Modbus 기본), CDAB = 워드 바꿈(많은 PLC·계측기의 «Little-endian word»), BADC = 바이트 바꿈, DCBA = 둘 다.",
        "- 고르는 법: 장비가 알려 준 값(예: 온도 21.5)을 아는 칸을 F32 로 두고 네 순서를 바꿔 보며 말이 되는 값이 나오는 것을 고릅니다. 정수면 U32 로 같은 방법을 씁니다.",
        "- «표시»(U16·S16·HEX·BIN)는 보통 칸(U16)에 쓰고, S16·U32·S32 칸은 HEX·BIN 일 때 그 진법(부호 없이)으로 보입니다. 실수·문자열은 늘 타입대로입니다.",
        "- «표시» 끝의 «형식 지정…(32비트·float·문자열)» 은 고른 칸(없으면 첫 칸)의 형식 창을 엽니다 — 칸 오른쪽 버튼과 같습니다.",
        "- CSV 저장·불러오기는 Modbus Slave 의 레지스터 맵과 같은 모양(table,address,type,order,name,value)입니다. Slave 에서 만든 맵을 그대로 불러와 이름·형식을 맞출 수 있습니다(값 칸은 장비에 쓰지 않습니다). 이 표와 다른 표(예: IR) 줄은 건너뜁니다.",
        "- «장비 프로필…»: 내장 장비 45종(LS ELECTRIC 인버터 S100·G100·M100·H100·S300과 전력 계측장치 GIMAC1000, 오토닉스 온도 조절기 TK·TX·TM2·TM4·TMH, 패널 미터 MT4W·MT4N, 온도 지시계 KN-2000W, 카운터/타이머 CT, 한영넉스 온도 조절기 VX·카운터/타이머 LC·패널 미터 LM, 루텍 전력 미터 Accura 3300E·2300·2500·2700·3500·3700, 야스카와 인버터 A1000·V1000·J1000, 미쓰비시전기 인버터 FR-E700·FR-D700·FR-E800·FR-A800·FR-F800·FR-A700·FR-F700·FR-D800·FR-CS80, 오므론 온도 조절기 E5CC·E5CN·인버터 MX2, 슈나이더 일렉트릭 인버터 ATV12·ATV320·ATV312, 후지전기 인버터 FRENIC-Mini/Eco/Multi/MEGA·FRENIC-Ace·FRENIC-HVAC/AQUA, 제조사 매뉴얼에서 확인한 사실만) 중에서 고르면 함수 코드별로 이어진 칸을 묶은 폴링 표가 더해지고, 칸 이름(단위·배율 포함, 예 «출력 주파수 (×0.01 Hz)»)·형식·워드 순서·국번이 채워집니다. «통신 설정도 맞추기» 를 켜 두면 시리얼 설정을 매뉴얼의 출하 속도·데이터 비트·패리티·정지 비트로 바꿉니다(TCP 주소·포트는 그대로). 빈 주소를 읽으면 예외 02 를 돌려주는 장비가 많아 기본은 이어진 칸만 묶습니다. 화면 값은 원시 값이니 배율을 곱해 읽고, 쓰기 전에는 장비 매뉴얼로 확인하세요. 같은 자료는 홈페이지 «장비» 에 표와 JSON(CC BY 4.0)으로 있습니다.",
      ],
    },
    {
      title: "쓰기",
      body: [
        "- 코일(01) 표와 보유 레지스터(03) 표의 칸을 두 번 누르거나 Enter 로 쓰기 창을 엽니다. 02·04 표는 읽기 전용입니다.",
        "- 코일: «켬»·«끔» 을 누르면 바로 씁니다(FC05). «1 0 1» 처럼 여러 개를 넣으면 이어진 코일에 FC0F 로 씁니다.",
        "- 레지스터: 칸의 형식대로 넣습니다(창에서 이번만 형식·순서를 바꿀 수도 있음). U16 은 «10, 20, 30» 처럼 여러 값을 이어진 칸에 FC10 으로 씁니다. 0x 를 붙이면 HEX, 음수는 S16 으로 읽습니다.",
        "- 한 칸이면 06(코일은 05)을, 여러 칸·32/64비트 값이면 10(0F)을 씁니다. 장비가 06·05 를 받지 않으면 «통신 세부» 의 «한 칸도 «여러 칸 쓰기» 명령(FC15·16)으로» 를 켭니다.",
        "- 창 아래에 보낼 함수와 보낼 바이트(RTU 는 CRC 포함, TCP 는 트랜잭션 번호 0 으로)가 미리 보입니다. 쓰고 나면 그 표를 바로 다시 읽습니다.",
        "- RTU 에서 국번 0(브로드캐스트)으로 쓰면 모든 장비가 받아 쓰지만 아무도 답하지 않습니다(결과 «브로드캐스트»). Modbus TCP 에서 유닛 0 은 브로드캐스트가 아니라 «이 장비» 라서 보통처럼 답을 기다립니다(규격).",
        "- 그래서 RTU 에서 국번 0 인 읽기 표는 폴링하지도 «한 번 읽기» 로 읽지도 않습니다 — 탭 이름 앞에 ⚠, 표 위에 알림과 [국번 1 로 바꾸기] 가 나옵니다. TCP 에서 RTU 로 바꿀 때도 그런 표가 몇 개인지 알립니다.",
      ],
    },
    {
      title: "타임아웃·재시도·요청 간격",
      body: [
        "- «응답 기다림(ms)»: 요청을 보낸 뒤 응답이 다 올 때까지 기다리는 시간. 넘으면 «타임아웃». 시리얼 9600bps 에서 125 레지스터 응답(255바이트 × 11비트)은 전송에만 약 290ms 가 걸리므로 넉넉히(기본 1000ms) 둡니다. 게이트웨이·무선은 더 깁니다.",
        "- «재시도»: 타임아웃·CRC 오류·모양 틀린 응답이면 그만큼 다시 보냅니다. 예외 응답은 다시 보내도 같아서 재시도하지 않습니다. 재시도도 «요청» 통계에 셉니다.",
        "- «요청 간격(ms)»: 앞 응답을 받은 뒤 다음 요청까지 쉬는 시간. 장비가 연달아 오는 요청을 놓치거나(타임아웃이 띄엄띄엄) 예외 06(바쁨)이 나오면 늘립니다. RS-485 에 여러 장비가 있으면 20~50ms 가 무난합니다.",
        "- 표의 «주기(ms)»: 그 표를 얼마마다 읽을지. 0 이면 «한 번 읽기»(F6)로만 읽습니다. 버스는 하나라 여러 표는 차례로 읽고, 장비가 느려 주기를 넘기면 밀린 것을 몰아서 읽지 않고 다음 차례부터 이어 갑니다.",
        "- 응답이 조각으로 와도(USB 어댑터) 요청으로 응답 길이를 계산해 이어 붙입니다. RS-485 어댑터가 보낸 것을 되돌려 주는 «에코» 도 알아서 건너뜁니다(05·06 은 요청과 응답이 같아 그대로 응답으로 봅니다).",
        "- Modbus TCP 는 트랜잭션 번호로 응답을 맞춥니다. 늦게 온 지난 요청의 응답은 버리고 기다립니다.",
      ],
    },
    {
      title: "예외와 오류 읽는 법",
      body: [
        "- 예외 01 지원하지 않는 함수: 그 장비에 없는 함수 코드입니다(예: 입력 레지스터만 있는 장비에 03).",
        "- 예외 02 없는 주소: 시작·개수가 장비의 범위를 벗어났습니다. 0/1 기준, 개수를 줄여 확인하세요.",
        "- 예외 03 잘못된 값: 개수나 쓴 값이 장비가 받는 범위 밖입니다.",
        "- 예외 04 장비 고장 · 06 장비 바쁨 · 0A·0B 게이트웨이(경로 없음·대상 응답 없음).",
        "- 타임아웃: 국번이 틀렸거나, 속도·패리티가 다르거나, A/B 선이 바뀌었거나, 장비가 꺼졌습니다. 통신 기록에 RX 가 전혀 없으면 배선·설정, RX 가 있는데 CRC 오류면 속도·패리티·노이즈를 봅니다.",
        "- 모양 틀림: 국번·함수 코드·바이트 수가 요청과 다르거나 응답이 끝까지 오지 않았습니다. 다른 마스터가 같은 선에 있거나 장비가 규격과 다르게 답하는 경우입니다.",
      ],
    },
    {
      title: "찾기 — 국번·주소 범위",
      body: [
        "- «찾기…» 창의 «국번 찾기»: 국번마다 정한 함수·주소 한 칸을 읽어 답하는 국번을 모읍니다. 예외로 답해도 «장비가 있음» 으로 봅니다. 기다림(기본 200ms) × 국번 수만큼 걸립니다.",
        "- «주소 범위 찾기»: 시작~끝을 «한 번에» 개씩 읽어 읽히는 범위를 모읍니다. 덩어리가 예외면 한 칸씩 다시 확인합니다(끄면 덩어리째 건너뜀). 예외 01 이거나 세 번 이어서 응답이 없으면 스스로 멈춥니다.",
        "- 찾은 줄의 «이 국번으로 표 만들기»·«이 범위로 표 만들기» 로 바로 표를 만듭니다.",
        "- 찾는 동안에는 폴링이 멈춥니다(같은 선에 요청을 섞지 않게). 창을 닫아도 찾기는 계속되고 왼쪽 상태 칸에 진행이 보입니다.",
      ],
    },
    {
      title: "통계·기록·추세",
      body: [
        "- 표 위 줄: 이 표의 요청·정상·타임아웃·CRC·예외 수와 평균·최대 응답 시간. 왼쪽 «통계(전체)» 는 찾기·쓰기를 포함한 전체입니다. «초기화» 로 0.",
        "- 응답 시간은 요청을 보내는 순간부터 응답이 다 올 때까지(시리얼 전송 시간 포함, USB 지연 몇 ms 포함)입니다.",
        "- 통신 기록: 요청(TX)·응답(RX)의 HEX 와 풀이(«id1 FC03 HR 0..9 (10)», «→ 정상: 1, 2 …», 예외 이름), 타임아웃·브로드캐스트·보내기 실패는 사건(EV) 줄. 풀이가 빨가면 실패한 응답입니다.",
        ...logHandlingLines("ko", { find: true, checkbox: true }),
        "- «파일로 기록»(Ctrl+Shift+L): 주고받은 바이트를 시각과 함께 파일에 계속 남깁니다(설정의 자동 기록 폴더도 됨).",
        "- 값 기록(CSV): 표 도구줄의 «값 기록 ▾» 에서 «폴링마다»/«바뀔 때만» 을 고르고 «기록 시작…» 으로 파일을 고르면 time,table,address,name,value 를 «폴링마다» 또는 «바뀔 때만» 덧붙입니다. 값은 화면과 같은 글(형식·표시 그대로)이고 엑셀에서 바로 열립니다.",
        "- 추세: 칸을 하나 누르고 «📈 추세» 를 누르면 아래에 값 변화가 선으로 그려집니다(6개까지, 최근 600개 값). 마지막·최소~최대가 옆에 나옵니다.",
      ],
    },
    {
      title: "Slave 와 같이 시험하기",
      body: [
        "장비 없이 이 프로그램을 익히거나, 마스터 쪽 설정·오류 처리를 미리 시험하려면 PortDock Modbus Slave 를 상대로 씁니다.",
        "- 같은 PC 에서 TCP: Slave 를 «TCP 서버(Modbus TCP)» 포트 502(또는 1502)로 켜고, 이 프로그램은 «TCP (Modbus TCP)» 장비 주소 127.0.0.1 로 연결합니다.",
        "- 시리얼: USB-RS485 두 개를 A-A·B-B 로 잇거나 가상 COM 쌍(com0com 등)을 만들어 한쪽은 Slave, 한쪽은 이 프로그램이 엽니다. 속도·패리티를 같게.",
        "- Slave 의 «장애 주입» 으로 응답 지연·무응답·예외·CRC 틀림을 걸어 이쪽의 타임아웃·재시도·통계가 어떻게 보이는지 확인합니다. Slave 의 칸 설정(F32 CDAB 등)을 CSV 로 저장해 이 프로그램에서 불러오면 이름·형식이 맞춰집니다.",
      ],
    },
    {
      title: "설정 (⚙)",
      body: [
        "- 언어·테마·글자 크기, 기록 시각 형식, 화면에 남길 줄 수.",
        "- «연결할 때 자동으로 파일 기록» 과 자동 기록 폴더: 연결할 때마다 «portdock-modbus-master-날짜-시각.log».",
        "- «설정 내보내기·가져오기»: 연결·표(국번·주소·칸 이름·형식)·추세를 JSON 파일로 옮깁니다.",
        ...settingsLines("ko"),
      ],
    },
    {
      title: "단축키·팁",
      body: [
        ...shortcutLines("ko", { find: true }),
        "- Ctrl+S: 지금 표를 CSV 로 저장.",
        "- F6: 지금 표 한 번 읽기. F8: 모든 폴링 멈춤·다시.",
        "- 칸: 누르면 고르기(추세에 넣을 칸), 두 번 누르기·Enter 로 쓰기, 오른쪽 버튼으로 칸 설정.",
        "- 표 지우기는 확인 창 대신 5초 동안 «되돌리기» 가 나옵니다.",
      ],
    },
    {
      title: "문제 해결",
      body: [
        "- 모든 요청이 타임아웃: 국번, 속도·패리티·정지 비트, A/B 선, 종단 저항, 장비의 «Modbus RTU 슬레이브» 설정을 확인합니다. TCP 면 IP·포트·방화벽, 그리고 장비가 이미 다른 마스터와 연결돼 있어 접속 수가 모자라지 않은지 봅니다.",
        "- 가끔 타임아웃: «요청 간격» 을 늘리고 «재시도» 를 1~2 로. USB 어댑터는 응답이 늦게 도착할 수 있어 «응답 기다림» 을 늘립니다.",
        "- CRC 오류가 잦음: 속도·패리티, 노이즈(차폐·접지), 같은 선의 다른 마스터를 확인합니다.",
        "- 값이 이상함: 형식·바이트 순서(«값 형식과 바이트 순서 고르기»)와 0/1 기준(«40001 표기»)을 확인합니다.",
        "- 포트를 열 수 없음: 다른 프로그램(다른 마스터·터미널·PortDock 창)이 쓰고 있는지 봅니다.",
        "- 프로그램이 열리지 않음: Microsoft Edge WebView2 가 필요합니다(윈도우 11 에는 들어 있음).",
      ],
    },
  ],
  en: [
    {
      title: "About",
      body: [
        "PortDock Modbus Master is a Modbus «master» (poll tool) that asks devices — PLCs, drives, meters, sensors — for data, instead of an HMI. It speaks serial RTU, Modbus TCP and RTU over TCP.",
        "- Several tables (tabs), each with its own Slave ID, function (01/02/03/04), addresses and poll interval.",
        "- Values as U16, S16, U32, S32, F32, F64 or strings with word/byte order (ABCD, CDAB, BADC, DCBA), HEX/BIN, and a name per address.",
        "- Double-click a cell to write (05/06/0F/10). Slave ID and address range scans, request/response HEX with decoding, per-table statistics, CSV value logging and trend lines.",
        "- Free (GPL-3.0), Korean and English UI.",
      ],
    },
    {
      title: "Getting started",
      id: "start",
      body: [
        "- On first start a «What kind of device?» card appears above the value cells. [Modbus TCP (Ethernet)] or [Modbus RTU (serial)] sets the connection type and moves to the next box to fill (device address or port). You can also pick the address notation (0-based, 1-based, PLC 40001) there. It hides once you connect or click «Don't show again». On the first connection a one-time notice explains double-click to write and right-click for types.",
        "- 1. Pick the «Connection» on the left. For serial, match the port, baud, parity and stop bits to the device; for TCP enter the device IP and port (usually 502).",
        "- 2. «Connect» (F4). Tables are read at their «Every (ms)» interval.",
        "- 3. In the table settings set «Slave ID», «Function», «Start» and «Count» from the device manual. The last read (✓ time and response time, or ⚠ the reason) shows above the cells.",
        "- 4. «+ Table» adds another table. The number on a tab counts that table's errors so far (timeouts, CRC, exceptions) — red while it is failing now, grey once reads succeed again (Statistics «Reset» clears it).",
        "- 5. To change a value, double-click its cell (coil and holding register tables only).",
      ],
    },
    {
      title: "Layout",
      body: [
        "- Left: connection and port (or IP), the «Communication details» section (response timeout, retries, delay between polls, «write single values with write multiple»), connect button and status, «Pause all polling», «Scan…», the «Statistics (all)» section. The value log (CSV) is «Value log ▾» on the table toolbar. Drag the bar above the traffic to resize it (remembered; double-click to reset).",
        "- «Communication details» and «Statistics» are collapsed with a summary next to the title («timeout 1000 ms · retries 0 · delay 20 ms», «n requests · m errors»). Communication details start expanded when they differ from the defaults; the open state is remembered.",
        "- Top middle: table tabs (⏸ = not polling, ● = last read failed, number = errors so far — red while failing now, grey otherwise), table settings (name, Slave ID, function, start, count, interval, poll, read once) and view settings (display, addresses, grid/list, 📈 trend, CSV).",
        "- Middle: value cells. Cells that changed since the previous read flash briefly. If the last read failed, the cells are dimmed (previous values) and the reason is shown above.",
        "- Bottom: trends (when added) and the traffic log.",
        ...windowLines("en"),
      ],
    },
    {
      title: "40001 notation — addresses",
      body: [
        "Addresses on the wire start at 0 («0-based»). Device manuals often count from 1 («1-based») or use PLC notation where the first digit names the table (00001, 10001, 30001, 40001).",
        "- Set «Addresses» to match the manual and the cells, the start box and the traffic decoding all use it. The address actually sent is the same.",
        "- PLC notation: 0xxxx coils (01/05/0F), 1xxxx discrete inputs (02), 3xxxx input registers (04), 4xxxx holding registers (03/06/10). 40001 = holding register 0, 40010 = 9. From the 10000th on it has six digits (410000).",
        "- In PLC notation, typing an address with another prefix such as «30001» in the start box also switches the function to that table (04). A short number like «15» means the 15th (1-based) of the current table.",
        "- In 0-based or 1-based mode, typing something that looks like PLC notation («40001», «30001») into the start box reads it as typed (0-based: address 40001) but shows a yellow notice — «in PLC notation it is address 0 (FC03)» — with [Switch to PLC notation], which switches the notation and sets the start and function to that address.",
        "- If you get exception 02 (illegal address) or values look shifted by one, 0-based and 1-based are usually mixed up — move the start by one.",
      ],
    },
    {
      title: "Value types and byte order",
      body: [
        "- Right-click a cell (or use cell settings) to set its name, type and order. U32/S32/F32 use 2 registers, F64 4 and strings length/2; they show as one cell.",
        "- Order names place the value's bytes A (most significant)… into registers. ABCD = big end first (Modbus default), CDAB = word swap (the «little-endian word» of many PLCs and meters), BADC = byte swap, DCBA = both.",
        "- How to choose: set a cell whose value you know (e.g. a temperature of 21.5) to F32 and try the four orders until the value makes sense. Use U32 the same way for integers.",
        "- «Display» (U16, S16, HEX, BIN) applies to plain U16 cells; S16, U32 and S32 cells show in that base (unsigned) when HEX/BIN is chosen. Floats and strings always show as their type.",
        "- «Typed… (32-bit, float, string)» at the end of «Display» opens the type dialog for the selected cell (or the first) — the same as right-clicking a cell.",
        "- Save/Load CSV uses the same register map format as Modbus Slave (table,address,type,order,name,value). Load a map made in Slave to apply names and types (the value column is never written to the device). Rows for other tables (e.g. IR) are skipped.",
        "- «Device profile…»: pick one of the 45 built-in devices (LS ELECTRIC S100, G100, M100, H100 and S300 inverters and GIMAC1000 power meter, Autonics TK, TX, TM2, TM4 and TMH temperature controllers, MT4W and MT4N panel meters, KN-2000W temperature indicator and CT counter/timer, Hanyoung NUX VX temperature controller, LC counter/timer and LM panel meter, Rootech Accura 3300E, 2300, 2500, 2700, 3500 and 3700 power meters, Yaskawa A1000, V1000 and J1000 inverters, Mitsubishi Electric FR-E700, FR-D700, FR-E800, FR-A800, FR-F800, FR-A700, FR-F700, FR-D800 and FR-CS80 inverters, OMRON E5CC and E5CN temperature controllers and MX2 inverter, Schneider Electric ATV12, ATV320 and ATV312 drives, Fuji Electric FRENIC-Mini/Eco/Multi/MEGA, FRENIC-Ace and FRENIC-HVAC/AQUA inverters; facts confirmed in the maker's manual only) to add polling tables of contiguous registers per function code, with names (unit and scale included, e.g. «Output frequency (×0.01 Hz)»), types, word order and Slave ID. With «Also apply serial settings» the serial settings are set to the manual's factory baud, data bits, parity and stop bits (TCP address and port are left alone). Many devices answer exception 02 for unused addresses, so only contiguous registers are grouped by default. Values on screen are raw — multiply by the scale — and check the device manual before writing. The same data is on the website under «Devices» as tables and JSON (CC BY 4.0).",
      ],
    },
    {
      title: "Writing",
      body: [
        "- Double-click (or press Enter on) a cell in a coil (01) or holding register (03) table to open the write dialog. Tables 02/04 are read-only.",
        "- Coils: «ON»/«OFF» writes at once (FC05). Several values like «1 0 1» write consecutive coils with FC0F.",
        "- Registers: enter a value in the cell's type (you can change the type/order for this write only). For U16, «10, 20, 30» writes consecutive registers with FC10. 0x means HEX; negatives are read as S16.",
        "- One register uses 06 (coils 05); several registers or 32/64-bit values use 10 (0F). If the device rejects 06/05, turn on «Write single values with «write multiple» (FC15/16) too» under «Communication details».",
        "- The dialog previews the function and the exact bytes (RTU with CRC, TCP with transaction ID 0). After a write the table is read again at once.",
        "- On RTU, writing to ID 0 (broadcast) makes every device write and none reply (result «Broadcast»). On Modbus TCP, unit 0 is not a broadcast but «this device», so the reply is awaited as usual (per the spec).",
        "- So on RTU a read table with ID 0 is neither polled nor read by «Read once» — its tab shows ⚠ before the name, and a notice above the table offers [Change Slave ID to 1]. Switching from TCP to RTU also tells how many such tables there are.",
      ],
    },
    {
      title: "Timeout, retries and delay",
      body: [
        "- «Response timeout (ms)»: how long to wait for the whole reply. At 9600 bps a 125-register reply (255 bytes × 11 bits) takes about 290 ms just to transmit, so keep it generous (1000 ms default). Gateways and radio links need more.",
        "- «Retries»: resend after a timeout, CRC error or malformed reply. Exceptions are not retried (the answer would be the same). Retries count as requests in the statistics.",
        "- «Delay between polls (ms)»: pause after a reply before the next request. Increase it if the device misses back-to-back requests (scattered timeouts) or answers exception 06 (busy). 20–50 ms suits RS-485 lines with several devices.",
        "- A table's «Every (ms)»: how often it is read; 0 = only with «Read once» (F6). There is one bus, so tables are read in turn; if the device is too slow for the interval, missed polls are not bunched up.",
        "- Replies that arrive in pieces (USB adapters) are joined using the length expected from the request. Local echo from RS-485 adapters is skipped (for 05/06 the reply equals the request and is taken as the reply).",
        "- Modbus TCP matches replies by transaction ID; late replies to earlier requests are discarded.",
      ],
    },
    {
      title: "Exceptions and errors",
      body: [
        "- Exception 01 Illegal Function: the device has no such function code (e.g. 03 on a device with input registers only).",
        "- Exception 02 Illegal Data Address: start/count outside the device's range. Check 0/1-based numbering and try a smaller count.",
        "- Exception 03 Illegal Data Value: the count or written value is outside what the device accepts.",
        "- Exception 04 device failure · 06 busy · 0A/0B gateway (no path / target did not respond).",
        "- Timeout: wrong Slave ID, baud/parity mismatch, A/B swapped or the device is off. No RX at all in the traffic log points to wiring/settings; RX with CRC errors points to baud, parity or noise.",
        "- Malformed: the Slave ID, function code or byte count differs from the request, or the reply was cut short — e.g. another master on the line or a non-conforming device.",
      ],
    },
    {
      title: "Scan — Slave IDs and address ranges",
      body: [
        "- «Slave ID scan» in «Scan…»: reads one address with the chosen function from every ID and lists the IDs that answer. An exception still counts as «a device is there». It takes timeout (200 ms default) × number of IDs.",
        "- «Address range scan»: reads From–To in blocks and collects the readable ranges. A block that fails is re-checked one address at a time (turn off to skip whole blocks). It stops on exception 01 or three silent requests in a row.",
        "- «New table for this ID» / «New table for this range» creates a table from a result.",
        "- Polling pauses while scanning (requests are not mixed on one line). Closing the dialog keeps the scan running; progress shows in the status box on the left.",
      ],
    },
    {
      title: "Statistics, logs and trends",
      body: [
        "- The line above the cells: this table's requests, OK, timeouts, CRC, exceptions and average/maximum response time. «Statistics (all)» on the left includes scans and writes. «Reset» clears them.",
        "- Response time runs from sending the request to receiving the whole reply (including serial transmission and a few ms of USB latency).",
        "- Traffic log: request (TX) and reply (RX) HEX with decoding («id1 FC03 HR 0..9 (10)», «→ OK: 1, 2 …», exception names); timeouts, broadcasts and send failures as event (EV) lines. Red decoding marks a failed reply.",
        ...logHandlingLines("en", { find: true, checkbox: true }),
        "- «Log to file» (Ctrl+Shift+L) keeps writing the bytes sent and received with timestamps (the auto-log folder in Settings works too).",
        "- Value log (CSV): in «Value log ▾» on the table toolbar, «Start log…» appends time,table,address,name,value «Every poll» or «On change». Values are written as shown (type and display) and open directly in Excel.",
        "- Trend: click a cell and press «📈 Trend» to draw its value below (up to 6, the latest 600 values), with last and min–max.",
      ],
    },
    {
      title: "Testing with Modbus Slave",
      body: [
        "To learn this program without a device, or to rehearse the master's settings and error handling, use PortDock Modbus Slave as the other end.",
        "- TCP on one PC: start Slave as «TCP server (Modbus TCP)» on port 502 (or 1502) and connect here with «TCP (Modbus TCP)» to 127.0.0.1.",
        "- Serial: connect two USB-RS485 adapters A-A and B-B, or create a virtual COM pair (e.g. com0com), and open one side in Slave and the other here with the same baud and parity.",
        "- Use Slave's «Fault injection» (delay, no reply, exceptions, bad CRC) to see how timeouts, retries and statistics look here. Save Slave's cell settings (e.g. F32 CDAB) as CSV and load them here to match names and types.",
      ],
    },
    {
      title: "Settings (⚙)",
      body: [
        "- Language, theme, font size, log timestamp format and the number of lines kept on screen.",
        "- «Start file log automatically» and the auto-log folder: each connection writes «portdock-modbus-master-date-time.log».",
        "- «Export / Import settings» move the connection, tables (IDs, addresses, cell names and types) and trends as a JSON file.",
        ...settingsLines("en"),
      ],
    },
    {
      title: "Shortcuts and tips",
      body: [
        ...shortcutLines("en", { find: true }),
        "- Ctrl+S: save the current table as CSV.",
        "- F6: read the current table once. F8: pause/resume all polling.",
        "- Cells: click to select (for trends), double-click or Enter to write, right-click for cell settings.",
        "- Deleting a table shows «Undo» for 5 seconds instead of a confirmation dialog.",
      ],
    },
    {
      title: "Troubleshooting",
      body: [
        "- Every request times out: check the Slave ID, baud/parity/stop bits, A/B wiring, termination and the device's «Modbus RTU slave» setting. For TCP check IP, port and firewall, and whether the device already has the maximum number of masters connected.",
        "- Occasional timeouts: raise «Delay between polls» and set «Retries» to 1–2. USB adapters can deliver replies late — raise «Response timeout».",
        "- Frequent CRC errors: check baud/parity, noise (shielding, grounding) and other masters on the line.",
        "- Odd values: check the type and byte order («Value types and byte order») and 0/1-based numbering («40001 notation»).",
        "- Cannot open the port: another program (another master, terminal or PortDock window) may have it.",
        "- The program does not open: Microsoft Edge WebView2 is required (included in Windows 11).",
      ],
    },
  ],
};
