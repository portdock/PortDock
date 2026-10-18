// Modbus Master 도움말 — 화면 ? 버튼·F1 로 연다(사이트 도구 소개에도 쓴다)
import type { HelpDoc } from "@shared/HelpDialog";
import { logHandlingLines, settingsLines, shortcutLines, windowLines } from "@shared/helpCommon";

export const help: HelpDoc = {
  ko: [
    {
      title: "이 프로그램은",
      body: [
        "PortDock Modbus Master 는 Modbus 장비(PLC·인버터·계측기·센서·HMI 대신 시험할 장비)에 먼저 묻는 «마스터(폴링 도구)» 입니다. 시리얼 RTU 와 Modbus TCP, RTU over TCP 를 씁니다.",
        "- 표(탭) 여러 개를 각각 다른 국번·함수(01·02·03·04)·주소·주기로 읽습니다.",
        "- 값은 U16·S16·U32·S32·F32·F64·문자열, 워드·바이트 순서(ABCD·CDAB·BADC·DCBA), HEX·BIN 으로 보고, 칸마다 이름을 붙입니다.",
        "- 칸을 두 번 눌러 씁니다(05·06·0F·10). 국번 찾기·주소 범위 찾기, 요청·응답 HEX 와 풀이, 표마다 통계, 값 CSV 기록, 추세 그림이 있습니다.",
        "- 무료(GPL-3.0)이고 화면은 한국어·영어입니다.",
      ],
    },
    {
      title: "처음 쓰는 순서",
      body: [
        "- 1. 왼쪽 «연결 방식» 을 고릅니다. 시리얼이면 포트·속도·패리티·정지 비트를 장비와 같게, TCP 면 장비 IP·포트(보통 502)를 넣습니다.",
        "- 2. «연결»(F4). 연결되면 표의 «주기» 마다 읽기 시작합니다.",
        "- 3. 가운데 위 표 설정에서 «국번», «함수», «시작», «개수» 를 장비 설명서대로 맞춥니다. 값 칸 위에 마지막 읽기 결과(✓ 시각·응답 시간 또는 ⚠ 이유)가 나옵니다.",
        "- 4. 다른 영역도 보려면 «+ 표» 로 표를 더합니다. 탭의 빨간 숫자는 그 표의 오류(타임아웃·CRC·예외) 수입니다.",
        "- 5. 값을 바꾸려면 칸을 두 번 누릅니다(코일·보유 레지스터 표만).",
      ],
    },
    {
      title: "화면 구성",
      body: [
        "- 왼쪽: 연결 방식·포트(또는 IP), 응답 기다림·재시도·요청 간격, 연결 버튼과 상태, «모든 폴링 멈춤», «한 칸도 0F·10 으로 쓰기», «찾기…», 값 기록(CSV), 전체 통계.",
        "- 가운데 위: 표 탭(⏸ = 폴링 안 함, ● = 마지막 읽기 실패, 빨간 숫자 = 오류 수), 표 설정(이름·국번·함수·시작·개수·주기·폴링·한 번 읽기), 보기 설정(표시·주소 표기·칸/목록·📈 추세·CSV).",
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
        "- CSV 저장·불러오기는 Modbus Slave 의 레지스터 맵과 같은 모양(table,address,type,order,name,value)입니다. Slave 에서 만든 맵을 그대로 불러와 이름·형식을 맞출 수 있습니다(값 칸은 장비에 쓰지 않습니다). 이 표와 다른 표(예: IR) 줄은 건너뜁니다.",
      ],
    },
    {
      title: "쓰기",
      body: [
        "- 코일(01) 표와 보유 레지스터(03) 표의 칸을 두 번 누르거나 Enter 로 쓰기 창을 엽니다. 02·04 표는 읽기 전용입니다.",
        "- 코일: «켬»·«끔» 을 누르면 바로 씁니다(FC05). «1 0 1» 처럼 여러 개를 넣으면 이어진 코일에 FC0F 로 씁니다.",
        "- 레지스터: 칸의 형식대로 넣습니다(창에서 이번만 형식·순서를 바꿀 수도 있음). U16 은 «10, 20, 30» 처럼 여러 값을 이어진 칸에 FC10 으로 씁니다. 0x 를 붙이면 HEX, 음수는 S16 으로 읽습니다.",
        "- 한 칸이면 06(코일은 05)을, 여러 칸·32/64비트 값이면 10(0F)을 씁니다. 장비가 06·05 를 받지 않으면 «한 칸도 0F·10 으로 쓰기» 를 켭니다.",
        "- 창 아래에 보낼 함수와 보낼 바이트(RTU 는 CRC 포함, TCP 는 트랜잭션 번호 0 으로)가 미리 보입니다. 쓰고 나면 그 표를 바로 다시 읽습니다.",
        "- 국번 0(브로드캐스트)으로 쓰면 모든 장비가 받아 쓰지만 아무도 답하지 않습니다(결과 «브로드캐스트»).",
      ],
    },
    {
      title: "타임아웃·재시도·요청 간격",
      body: [
        "- «응답 기다림(ms)»: 요청을 보낸 뒤 응답이 다 올 때까지 기다리는 시간. 넘으면 «타임아웃». 시리얼 9600bps 에서 125 레지스터 응답은 전송에만 약 270ms 가 걸리므로 넉넉히(기본 1000ms) 둡니다. 게이트웨이·무선은 더 깁니다.",
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
        "- 값 기록(CSV): «기록 시작…» 으로 파일을 고르면 time,table,address,name,value 를 «폴링마다» 또는 «바뀔 때만» 덧붙입니다. 값은 화면과 같은 글(형식·표시 그대로)이고 엑셀에서 바로 열립니다.",
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
        "- Several tables (tabs), each with its own slave ID, function (01/02/03/04), addresses and poll interval.",
        "- Values as U16, S16, U32, S32, F32, F64 or strings with word/byte order (ABCD, CDAB, BADC, DCBA), HEX/BIN, and a name per address.",
        "- Double-click a cell to write (05/06/0F/10). Slave ID and address range scans, request/response HEX with decoding, per-table statistics, CSV value logging and trend lines.",
        "- Free (GPL-3.0), Korean and English UI.",
      ],
    },
    {
      title: "Getting started",
      body: [
        "- 1. Pick the «Connection» on the left. For serial, match the port, baud, parity and stop bits to the device; for TCP enter the device IP and port (usually 502).",
        "- 2. «Connect» (F4). Tables are read at their «Every (ms)» interval.",
        "- 3. In the table settings set «Slave ID», «Function», «Start» and «Count» from the device manual. The last read (✓ time and response time, or ⚠ the reason) shows above the cells.",
        "- 4. «+ Table» adds another table. A red number on a tab counts that table's errors (timeouts, CRC, exceptions).",
        "- 5. To change a value, double-click its cell (coil and holding register tables only).",
      ],
    },
    {
      title: "Layout",
      body: [
        "- Left: connection and port (or IP), response timeout, retries, delay between polls, connect button and status, «Pause all polling», «Always write with 0F/10», «Scan…», value log (CSV), overall statistics.",
        "- Top middle: table tabs (⏸ = not polling, ● = last read failed, red number = errors), table settings (name, slave ID, function, start, count, interval, poll, read once) and view settings (display, addresses, grid/list, 📈 trend, CSV).",
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
        "- Save/Load CSV uses the same register map format as Modbus Slave (table,address,type,order,name,value). Load a map made in Slave to apply names and types (the value column is never written to the device). Rows for other tables (e.g. IR) are skipped.",
      ],
    },
    {
      title: "Writing",
      body: [
        "- Double-click (or press Enter on) a cell in a coil (01) or holding register (03) table to open the write dialog. Tables 02/04 are read-only.",
        "- Coils: «ON»/«OFF» writes at once (FC05). Several values like «1 0 1» write consecutive coils with FC0F.",
        "- Registers: enter a value in the cell's type (you can change the type/order for this write only). For U16, «10, 20, 30» writes consecutive registers with FC10. 0x means HEX; negatives are read as S16.",
        "- One register uses 06 (coils 05); several registers or 32/64-bit values use 10 (0F). If the device rejects 06/05, turn on «Always write with 0F/10».",
        "- The dialog previews the function and the exact bytes (RTU with CRC, TCP with transaction ID 0). After a write the table is read again at once.",
        "- Writing to ID 0 (broadcast) makes every device write and none reply (result «Broadcast»).",
      ],
    },
    {
      title: "Timeout, retries and delay",
      body: [
        "- «Response timeout (ms)»: how long to wait for the whole reply. At 9600 bps a 125-register reply takes about 270 ms just to transmit, so keep it generous (1000 ms default). Gateways and radio links need more.",
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
        "- Timeout: wrong slave ID, baud/parity mismatch, A/B swapped or the device is off. No RX at all in the traffic log points to wiring/settings; RX with CRC errors points to baud, parity or noise.",
        "- Malformed: the slave ID, function code or byte count differs from the request, or the reply was cut short — e.g. another master on the line or a non-conforming device.",
      ],
    },
    {
      title: "Scan — slave IDs and address ranges",
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
        "- Value log (CSV): «Start log…» appends time,table,address,name,value «Every poll» or «On change». Values are written as shown (type and display) and open directly in Excel.",
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
        "- Every request times out: check the slave ID, baud/parity/stop bits, A/B wiring, termination and the device's «Modbus RTU slave» setting. For TCP check IP, port and firewall, and whether the device already has the maximum number of masters connected.",
        "- Occasional timeouts: raise «Delay between polls» and set «Retries» to 1–2. USB adapters can deliver replies late — raise «Response timeout».",
        "- Frequent CRC errors: check baud/parity, noise (shielding, grounding) and other masters on the line.",
        "- Odd values: check the type and byte order («Value types and byte order») and 0/1-based numbering («40001 notation»).",
        "- Cannot open the port: another program (another master, terminal or PortDock window) may have it.",
        "- The program does not open: Microsoft Edge WebView2 is required (included in Windows 11).",
      ],
    },
  ],
};
