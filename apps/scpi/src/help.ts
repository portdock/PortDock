// SCPI 도움말 — 화면 ? 버튼·F1 로 연다(사이트 도구 소개에도 쓴다)
import type { HelpDoc } from "@shared/HelpDialog";
import { logHandlingLines, settingsLines, shortcutLines, windowLines } from "@shared/helpCommon";

export const help: HelpDoc = {
  ko: [
    {
      title: "이 프로그램은",
      body: [
        "PortDock SCPI 는 SCPI 로 말하는 계측기(전원 공급기·멀티미터·오실로스코프·신호 발생기·부하 등)에 명령을 보내고 답을 보는 «계측기 터미널» 입니다. VISA(NI-VISA·Keysight IO Libraries)를 설치하지 않아도 됩니다.",
        "- 연결: LAN «소켓»(SCPI raw socket, 보통 TCP 5025)과 시리얼(RS-232).",
        "- 질의·쓰기·읽기와 응답 시간, *IDN? 으로 장비 식별, *RST·*CLS, 오류 큐 비우기(SYST:ERR? 를 0 이 나올 때까지), *OPC? 기다림.",
        "- 명령 이력(↑↓)·명령 목록, 자주 쓰는 SCPI 명령 자동완성, 숫자 응답 반복 측정(값 표·추세·통계·CSV), IEEE 488.2 블록 데이터(#…)의 HEX 미리보기와 파일 저장.",
        "- 무료(GPL-3.0)이고 화면은 한국어·영어입니다.",
      ],
    },
    {
      id: "start",
      title: "처음 쓰는 순서",
      body: [
        "- 1. 장비 앞 패널의 LAN 설정에서 IP 를 확인하고, «소켓»(Sockets·SCPI raw·Port 5025) 기능이 켜져 있는지 봅니다. IP 를 모르면 PortDock Net Scan 으로 찾을 수 있습니다.",
        "- 2. 왼쪽 «연결 방식» LAN → «장비 주소» 에 IP, «포트» 5025(대부분 그대로) → «연결»(F4).",
        "- 3. 연결되면 *IDN? 을 물어 왼쪽 «장비» 칸에 제조사·모델·일련번호·펌웨어가 나옵니다(«연결하면 *IDN? 묻기» 를 끄면 묻지 않음).",
        "- 4. 위 명령 칸에 명령을 넣고 Enter — ? 로 끝나면 «질의»(보내고 답을 기다림), 아니면 «쓰기»(보내기만). 답과 응답 시간이 «마지막 응답» 에, 주고받은 줄이 «통신 기록» 에 남습니다.",
        "- 5. 틀린 명령은 장비의 오류 큐에 쌓입니다. 가끔 «오류 큐 비우기» 로 확인하세요.",
        "- 시리얼(RS-232) 계측기: «연결 방식» 시리얼 → 포트·속도·패리티·정지 비트·흐름 제어를 장비 설정과 같게. 줄 끝도 장비에 맞춥니다(대부분 LF, 일부 CR LF).",
      ],
    },
    {
      title: "화면 구성",
      body: [
        "- 왼쪽: 연결 방식·주소(또는 포트·속도), «줄 끝», «통신 세부» 접기(응답 기다림·*OPC? 기다림·연결하면 *IDN? 묻기), 연결 버튼과 상태, «장비»(*IDN? 풀이), «자주 쓰는 동작»(*IDN?·*RST·*CLS·오류 큐 비우기·*OPC? 기다림)과 오류 큐 결과.",
        "- 가운데 위: 명령 칸과 [질의] [쓰기] [읽기] [＋ 목록에]. 기다리는 동안은 [멈춤](Esc). 칸 아래에 넣은 명령의 뜻(자주 쓰는 명령이면)과 Enter 가 무엇을 할지가 나옵니다.",
        "- 가운데: «마지막 응답» — 답 글(또는 블록 정보·HEX 미리보기·[파일로 저장]), 응답 시간, 실패 이유.",
        "- 아래: 탭 «통신 기록» / «반복 측정».",
        "- 오른쪽: 명령 목록(창이 좁으면 «명령 목록» 버튼으로 엽니다).",
        ...windowLines("ko"),
      ],
    },
    {
      title: "질의·쓰기·읽기",
      body: [
        "- «질의»: 보내고 답 하나를 기다립니다. 응답 시간은 다 보낸 때부터 답의 끝(줄 끝 또는 블록 끝)까지입니다. 보내기 전에 지난 질의의 늦게 온 답이 남아 있으면 버리고 사건 줄에 «… 바이트를 버렸습니다» 를 남깁니다.",
        "- «쓰기»: 보내기만 합니다. 설정 명령(CONF:VOLT:DC 10, OUTP ON …)에 씁니다.",
        "- «읽기»: 보내지 않고 답 하나를 읽습니다. «쓰기» 로 질의를 보냈거나, 장비가 스스로 보낸 것을 받을 때.",
        "- Enter 는 명령이 ? 로 끝나면 질의, 아니면 쓰기입니다. «;» 로 이은 명령(*CLS;*OPC?)은 하나라도 ? 로 끝나면 질의입니다.",
        "- «줄 끝»: 보낼 때 붙이고 받을 때 답의 끝으로 봅니다. LF 와 CR LF 는 LF 에서 끊고 앞의 CR 을 떼며, CR 은 CR 에서 끊습니다. 연결 중에도 바꿀 수 있습니다.",
        "- 시간이 넘었는데 받은 것이 있으면 «받은 것: …» 으로 보여 줍니다 — 대개 줄 끝 설정이 장비와 다릅니다.",
      ],
    },
    {
      title: "장비 식별·오류 큐·*OPC?",
      body: [
        "- *IDN?: IEEE 488.2 공통 명령. 답은 «제조사,모델,일련번호,펌웨어» 이고 «장비» 칸에 나누어 보입니다. 모양이 다르면 받은 글을 그대로 보입니다.",
        "- *RST: 장비를 초기 설정으로 되돌립니다(측정 범위·출력 설정이 바뀝니다 — 출력이 켜진 전원에 주의). *CLS: 상태 레지스터·오류 큐를 지웁니다.",
        "- «오류 큐 비우기»: SYST:ERR? 를 «0,\"No error\"»(또는 +0)가 나올 때까지 최대 50번 묻고, 나온 오류를 «-113 Undefined header» 처럼 보입니다. 50번에도 끝나지 않거나 숫자로 시작하지 않는 답이면 그렇게 알립니다.",
        "- 자주 보는 오류: -113 Undefined header(모르는 명령·철자), -222 Data out of range(범위 밖 값), -410 Query INTERRUPTED(답을 읽기 전에 다음 명령을 보냄), -420 Query UNTERMINATED(답이 없는데 읽음).",
        "- «*OPC? 기다림»: 앞 명령이 다 끝나면 장비가 1 을 답합니다. 스윕·초기화처럼 오래 걸리는 동작 뒤에 씁니다. 기다림은 «통신 세부» 의 «*OPC? 기다림(ms)»(기본 30초).",
      ],
    },
    {
      title: "블록 데이터 (#…)",
      body: [
        "- 화면 캡처·파형처럼 큰 답은 IEEE 488.2 «정해진 길이 블록» 으로 옵니다: «#» + 자릿수 N + 길이(N 자리) + 데이터. 예: «#41000» 다음에 1000바이트.",
        "- 길이 머리로 끝을 알기 때문에 데이터 속에 LF(0x0A)가 있어도 끊지 않습니다. 블록 뒤 줄 끝은 함께 읽습니다.",
        "- «#0…»(길이 모름)은 줄 끝까지 읽습니다 — 바이너리 속에 줄 끝 바이트가 있으면 잘릴 수 있으니 장비에서 정해진 길이 형식을 고르세요.",
        "- «마지막 응답» 에 머리·길이·글인지 바이너리인지와 앞 1024바이트 HEX 가 보입니다. [파일로 저장] 은 머리를 뺀 데이터를 그대로 저장합니다(PNG·BMP·JPG·GIF 면 그 확장자를 권합니다).",
        "- 한 답은 64MB 까지 받습니다. 통신 기록 줄에는 앞부분만 남깁니다.",
      ],
    },
    {
      title: "반복 측정",
      body: [
        "- 아래 «반복 측정» 탭: «명령»(숫자로 답하는 질의 — MEAS:VOLT:DC?·READ?·FETC?), «주기(ms)», «횟수»(0 = 멈출 때까지) → «시작». Esc 나 «멈춤» 으로 멈춥니다.",
        "- 주기는 측정 시작 간격입니다. 답이 주기보다 오래 걸리면 끝나자마자 다음을 묻습니다.",
        "- 답의 첫 값(쉼표 앞)을 숫자로 읽습니다. «1.5 V» 처럼 뒤의 단위 글자는 무시합니다. SCPI 의 9.9E37 은 넘침(+OVLD), 9.91E37 은 NaN 으로 보이고 추세에서는 빈 자리입니다.",
        "- 시간 초과는 «실패» 줄로 남기고 계속하며, 연결이 끊기면 멈춥니다.",
        "- 값 표(최근 500줄), 추세(최근 1000개), 통계(개수·최소·최대·평균·표준편차), [CSV 저장](번호·시각·응답 시간·값·응답 글 — 엑셀에서 열림).",
      ],
    },
    {
      title: "자주 쓰는 SCPI 명령",
      body: [
        "- 명령 칸의 자동완성 목록에는 IEEE 488.2 공통 명령(*IDN?·*RST·*CLS·*OPC?·*WAI·*ESR?·*STB?·*SRE·*ESE·*TST?·*OPT?·*TRG·*SAV·*RCL)과 SCPI 기본(SYST:ERR?·SYST:VERS?·SYST:PRES·STAT:PRES·STAT:OPER:COND?·STAT:QUES:COND?, MEAS:VOLT:DC?·MEAS:CURR:DC?·MEAS:RES?·MEAS:FREQ?, CONF?·READ?·INIT·FETC?·ABOR)만 있습니다. 장비마다 다른 명령은 장비 설명서(Programming Guide)를 보세요.",
        "- 짧은 꼴(MEAS:VOLT:DC?)과 긴 꼴(MEASURE:VOLTAGE:DC?)은 같은 명령입니다. 대소문자는 가리지 않습니다. 목록에 있는 명령이면 칸 아래에 뜻이 나옵니다.",
        "- 명령 목록(오른쪽)에 자주 쓰는 명령을 두고 ▶ 또는 F2·F3·F5~F12 로 보냅니다. 빈 목록의 «예시 넣기» 는 *IDN?·MEAS:VOLT:DC?·SYST:ERR? 를 넣습니다. ? 로 끝나면 질의, 아니면 쓰기로 보냅니다.",
      ],
    },
    {
      id: "tutorial",
      title: "Simulator 로 따라하기 (계측기 없이)",
      body: [
        "실제 계측기가 없으면 PortDock Simulator 를 가짜 계측기로 씁니다(같은 PC).",
        "- 1. PortDock Simulator 를 열고 방식 «TCP 서버 (상대가 접속)», 포트 5025, 프레임 구분 «끝 문자» 0A(LF)로 둡니다.",
        "- 2. 규칙이 없을 때 나오는 [SCPI *IDN? 응답] 예제를 누릅니다. 규칙은 ASCII «*IDN?» → «PORTDOCK,SIM,1» + 줄 끝 CR LF 이고, «와일드카드» 는 꺼져 있습니다 — 꺼 두어야 ?·* 를 글자 그대로 비교합니다.",
        "- 3. «+ 규칙 추가» 로 «MEAS:VOLT:DC?» → «+1.2{rand 0..9}E+00»(받을 때마다 끝자리가 바뀜), «SYST:ERR?» → «+0,\"No error\"» 를 더합니다(새 규칙은 위 규칙의 방식과 줄 끝을 물려받고 와일드카드는 꺼진 채 시작).",
        "- 4. Simulator «시작». PortDock SCPI 에서 LAN, 장비 주소 127.0.0.1, 포트 5025, 줄 끝 LF → «연결». «장비» 칸에 PORTDOCK · SIM · 1 이 나오면 됩니다(Simulator 는 CR LF 로 답하지만 LF 에서 끊고 CR 을 뗍니다).",
        "- 5. «오류 큐 비우기» → «오류 없음 ✓». «반복 측정» 탭에서 MEAS:VOLT:DC?, 주기 500, 횟수 20 → «시작» → 값 표·추세·통계 → [CSV 저장].",
        "- 6. 규칙이 없는 명령(예: VOLT?)을 질의하면 «응답 없음» 으로 시간 초과가 납니다 — 실제 장비라면 오류 큐에 -113 이 쌓입니다.",
        "- 와일드카드를 켜면 «*IDN?» 의 ? 와 * 가 아무 글자로 읽혀 «XIDN!» 같은 엉뚱한 요청에도 답합니다. SCPI 규칙은 끈 채로 두세요.",
      ],
    },
    {
      title: "범위 밖 (아직 하지 않는 것)",
      body: [
        "- VXI-11(LAN, RPC 방식 — 포트 111·동적 포트): 다음 판에서 할 일입니다. 지금은 장비의 «소켓(5025)» 을 쓰세요. 대부분의 LAN 계측기는 둘 다 켜져 있습니다.",
        "- HiSLIP(4880)·USBTMC(USB)·GPIB: VISA·드라이버가 필요해 하지 않습니다. USB 만 있는 장비는 장비 쪽 «USB 가상 COM» 설정이 있으면 시리얼로 쓸 수 있습니다.",
        "- 서비스 요청(SRQ)·장치 지우기(Device Clear)·원격/로컬 전환 같은 VISA 기능은 소켓에 없습니다. 장비가 바쁠 때는 *OPC? 로 기다리세요.",
      ],
    },
    {
      title: "통신 기록",
      body: [
        "- TX ▶ 보낸 명령, RX ◀ 받은 답, EV 사건(연결·끊김·시간 초과·묵은 바이트 버림). 줄 끝 같은 제어 문자는 <CR>·<LF> 로 보입니다. 시간 초과·끊김은 빨간 사건 줄입니다.",
        "- «응답 시간» 을 켜면 RX 줄 옆에 «12.3 ms»(블록이면 «#41000 · 1000 B · 12.3 ms»)가 붙습니다.",
        "- 찾기·거르기, 따라가기, 줄 고르기·복사는 다른 PortDock 프로그램과 같습니다. «화면 저장»(Ctrl+S)은 보이는 줄을 글 파일로, «파일 기록»(Ctrl+Shift+L)은 지금부터 오는 줄을 파일에 계속 덧붙입니다.",
        ...logHandlingLines("ko", { find: true, checkbox: true }),
      ],
    },
    {
      title: "설정 (⚙)",
      body: [
        "- 언어·테마·글자 크기·기록 시각 형식·화면에 남길 줄 수.",
        "- «연결하면 파일 기록 자동 시작» 과 자동 기록 폴더: 연결할 때마다 «portdock-scpi-날짜-시각.log».",
        "- «설정 내보내기·가져오기» 로 연결 설정·명령 목록·반복 측정 설정을 JSON 파일로 옮깁니다.",
        ...settingsLines("ko"),
      ],
    },
    {
      title: "단축키·팁",
      body: [
        ...shortcutLines("ko", { saveView: true, find: true }),
        "- Enter: 명령 칸에서 질의(? 로 끝남) 또는 쓰기. ↑↓: 앞서 보낸 명령.",
        "- Esc: 기다리는 질의·반복 측정 멈춤(명령 칸 밖에서).",
      ],
    },
    {
      title: "문제 해결",
      body: [
        "- «연결 거부»: 포트가 다르거나(5025 가 아닌 장비 — 설명서의 «socket port») 장비의 소켓 기능이 꺼져 있습니다. 다른 프로그램(VISA 세션)이 이미 붙어 있으면 장비가 새 접속을 받지 않기도 합니다.",
        "- «응답 없음(시간 초과)»: 질의가 아닌 명령을 질의로 보냈거나, 철자가 틀렸거나(오류 큐 확인), 장비가 느린 측정 중입니다(«응답 기다림» 늘리기 또는 *OPC?).",
        "- «응답이 끝나지 않았습니다»: «줄 끝» 이 장비와 다릅니다(CR 을 쓰는 장비 등).",
        "- -410 Query INTERRUPTED: 답을 읽기 전에 다음 명령을 보냈습니다. «쓰기» 로 질의를 보냈다면 «읽기» 로 답을 먼저 받으세요.",
        "- 시리얼에서 글자가 깨짐: 속도·패리티·데이터 비트, 흐름 제어(장비가 DTR/DSR 나 RTS/CTS 를 쓰는지), 널 모뎀 케이블인지 보세요.",
        "- 프로그램이 열리지 않음: Microsoft Edge WebView2 가 필요합니다(윈도우 11 에는 기본 포함).",
      ],
    },
  ],
  en: [
    {
      title: "About",
      body: [
        "PortDock SCPI is an «instrument terminal» for SCPI test equipment (power supplies, multimeters, oscilloscopes, signal generators, loads …): send commands and read the answers. No VISA (NI-VISA, Keysight IO Libraries) needed.",
        "- Connections: LAN «socket» (raw SCPI socket, usually TCP 5025) and serial (RS-232).",
        "- Query, write and read with response times, *IDN? identification, *RST and *CLS, error queue draining (SYST:ERR? until 0), *OPC? waits.",
        "- Command history (↑↓) and command list, completion for common SCPI commands, repeated numeric measurements (table, trend, statistics, CSV), and IEEE 488.2 block data (#…) with HEX preview and file save.",
        "- Free (GPL-3.0); the interface is in Korean and English.",
      ],
    },
    {
      id: "start",
      title: "Getting started",
      body: [
        "- 1. Look up the IP in the instrument's front-panel LAN settings and check that the «socket» service (Sockets, raw SCPI, port 5025) is on. PortDock Net Scan can find the IP.",
        "- 2. On the left, «Connection» LAN → IP in «Instrument address», «Port» 5025 (usually leave it) → «Connect» (F4).",
        "- 3. On connect, *IDN? fills «Instrument» on the left with maker, model, serial number and firmware (turn off «Ask *IDN? on connect» to skip).",
        "- 4. Type a command in the box at the top and press Enter — ending in ? it «queries» (sends and waits), otherwise it «writes» (sends only). The answer and response time appear in «Last reply», the exchanged lines in «Traffic».",
        "- 5. Wrong commands go to the instrument's error queue. Check it now and then with «Drain error queue».",
        "- RS-232 instruments: «Connection» Serial → port, baud, parity, stop bits and flow control as set on the instrument. Match the line ending too (usually LF, sometimes CR LF).",
      ],
    },
    {
      title: "Layout",
      body: [
        "- Left: connection and address (or port and baud), «Line ending», «Timing» (response timeout, *OPC? timeout, ask *IDN? on connect), the connect button and status, «Instrument» (*IDN? decoded), «Common actions» (*IDN?, *RST, *CLS, drain error queue, wait *OPC?) with the error queue result.",
        "- Top centre: the command box with [Query] [Write] [Read] [＋ To list]. While waiting, [Stop] (Esc). Under the box: what the command means (for common commands) and what Enter will do.",
        "- Centre: «Last reply» — the text (or block info, HEX preview and [Save to file]), response time and failure reasons.",
        "- Bottom: tabs «Traffic» / «Repeat measurement».",
        "- Right: the command list (in a narrow window, open it with the «Commands» button).",
        ...windowLines("en"),
      ],
    },
    {
      title: "Query, write and read",
      body: [
        "- «Query»: sends and waits for one reply. The response time runs from the end of sending to the end of the reply (line ending or block end). Late bytes left over from an earlier query are discarded first, with an event line «Discarded n late bytes».",
        "- «Write»: sends only — for setting commands (CONF:VOLT:DC 10, OUTP ON …).",
        "- «Read»: reads one reply without sending — after sending a query with «Write», or for data the instrument sends by itself.",
        "- Enter queries when the command ends in ?, otherwise it writes. Chained commands (*CLS;*OPC?) query if any part ends in ?.",
        "- «Line ending» is appended when sending and marks the end of replies. LF and CR LF split at LF and drop a preceding CR; CR splits at CR. It can change while connected.",
        "- If the timeout passes with something received, it is shown as «Received: …» — usually the line ending does not match the instrument.",
      ],
    },
    {
      title: "Identification, error queue and *OPC?",
      body: [
        "- *IDN?: an IEEE 488.2 common command. The answer «maker,model,serial,firmware» is split into «Instrument». Anything else is shown as received.",
        "- *RST resets the instrument to its default setup (ranges and outputs change — mind a supply with its output on). *CLS clears the status registers and error queue.",
        "- «Drain error queue» asks SYST:ERR? until «0,\"No error\"» (or +0), at most 50 times, and lists the errors like «-113 Undefined header». It says so if 50 reads did not finish or the answer does not start with a number.",
        "- Common errors: -113 Undefined header (unknown command, typo), -222 Data out of range, -410 Query INTERRUPTED (a new command before the answer was read), -420 Query UNTERMINATED (read without a pending answer).",
        "- «Wait *OPC?»: the instrument answers 1 when pending operations finish — use it after long operations such as sweeps or initialisation. The wait is «*OPC? timeout (ms)» under «Timing» (30 s by default).",
      ],
    },
    {
      title: "Block data (#…)",
      body: [
        "- Large answers such as screenshots and waveforms come as IEEE 488.2 «definite length blocks»: «#», digit count N, length (N digits), data. E.g. «#41000» followed by 1000 bytes.",
        "- The length header tells where the data ends, so LF bytes (0x0A) inside binary data do not cut it. A line ending after the block is read with it.",
        "- «#0…» (unknown length) is read up to the line ending — binary data containing that byte can be cut, so pick a definite-length format on the instrument.",
        "- «Last reply» shows the header, length, text or binary and the first 1024 bytes in HEX. [Save to file] writes the data without the header (PNG, BMP, JPG and GIF get that extension suggested).",
        "- One reply can be up to 64 MB. Traffic lines keep only the beginning.",
      ],
    },
    {
      title: "Repeat measurement",
      body: [
        "- «Repeat measurement» tab: «Command» (a query answering with a number — MEAS:VOLT:DC?, READ?, FETC?), «Interval (ms)», «Count» (0 = until stopped) → «Start». Stop with Esc or «Stop».",
        "- The interval is between measurement starts. If a reply takes longer, the next query follows right after it.",
        "- The first value (before a comma) is read as a number; trailing unit letters as in «1.5 V» are ignored. SCPI 9.9E37 shows as overload (+OVLD) and 9.91E37 as NaN; both leave a gap in the trend.",
        "- Timeouts are recorded as failed rows and it continues; it stops if the connection drops.",
        "- Value table (last 500 rows), trend (last 1000), statistics (count, min, max, mean, standard deviation) and [Save CSV] (index, time, response time, value, reply text — opens in Excel).",
      ],
    },
    {
      title: "Common SCPI commands",
      body: [
        "- The completion list holds only IEEE 488.2 common commands (*IDN?, *RST, *CLS, *OPC?, *WAI, *ESR?, *STB?, *SRE, *ESE, *TST?, *OPT?, *TRG, *SAV, *RCL) and SCPI basics (SYST:ERR?, SYST:VERS?, SYST:PRES, STAT:PRES, STAT:OPER:COND?, STAT:QUES:COND?, MEAS:VOLT:DC?, MEAS:CURR:DC?, MEAS:RES?, MEAS:FREQ?, CONF?, READ?, INIT, FETC?, ABOR). See the instrument's programming guide for its own commands.",
        "- The short form (MEAS:VOLT:DC?) and long form (MEASURE:VOLTAGE:DC?) are the same command, in any letter case. For listed commands the meaning appears under the box.",
        "- Keep frequent commands in the command list (right) and send them with ▶ or F2, F3, F5–F12. «Add examples» in an empty list adds *IDN?, MEAS:VOLT:DC? and SYST:ERR?. Commands ending in ? are queried, others written.",
      ],
    },
    {
      id: "tutorial",
      title: "Try it with Simulator (no instrument)",
      body: [
        "Without a real instrument, PortDock Simulator can play one on the same PC.",
        "- 1. Open PortDock Simulator: mode «TCP server (peer connects)», port 5025, framing «Terminator» 0A (LF).",
        "- 2. With no rules yet, click the [SCPI *IDN? reply] example. The rule is ASCII «*IDN?» → «PORTDOCK,SIM,1» with CR LF, «Wildcards» off — keep it off so ? and * compare literally.",
        "- 3. With «+ Add rule» add «MEAS:VOLT:DC?» → «+1.2{rand 0..9}E+00» (the last digit changes on each request) and «SYST:ERR?» → «+0,\"No error\"» (new rules inherit the format and line ending of the rule above and start with wildcards off).",
        "- 4. «Start» Simulator. In PortDock SCPI: LAN, address 127.0.0.1, port 5025, line ending LF → «Connect». «Instrument» shows PORTDOCK · SIM · 1 (Simulator answers with CR LF; replies split at LF with the CR dropped).",
        "- 5. «Drain error queue» → «No errors ✓». In «Repeat measurement»: MEAS:VOLT:DC?, interval 500, count 20 → «Start» → table, trend and statistics → [Save CSV].",
        "- 6. Querying a command without a rule (e.g. VOLT?) times out with «No reply» — a real instrument would also queue -113.",
        "- With wildcards on, ? and * in «*IDN?» match any character, so odd requests like «XIDN!» get answered too. Keep them off for SCPI rules.",
      ],
    },
    {
      title: "Out of scope (not yet)",
      body: [
        "- VXI-11 (LAN, RPC — port 111 plus dynamic ports): planned for a later version. Use the instrument's «socket (5025)» for now; most LAN instruments offer both.",
        "- HiSLIP (4880), USBTMC (USB) and GPIB need VISA or drivers and are not supported. A USB-only instrument with a «USB virtual COM» option can be used as serial.",
        "- VISA features such as service requests (SRQ), device clear and remote/local switching do not exist on a socket. Use *OPC? to wait while the instrument is busy.",
      ],
    },
    {
      title: "Traffic",
      body: [
        "- TX ▶ sent commands, RX ◀ replies, EV events (connect, disconnect, timeouts, discarded late bytes). Control characters such as line endings show as <CR>, <LF>. Timeouts and disconnects are red event lines.",
        "- With «Response time» on, RX lines carry «12.3 ms» (for blocks «#41000 · 1000 B · 12.3 ms»).",
        "- Find/filter, follow, line selection and copying work as in the other PortDock programs. «Save view» (Ctrl+S) writes the visible lines to a text file; «Log to file» (Ctrl+Shift+L) keeps appending new lines to a file.",
        ...logHandlingLines("en", { find: true, checkbox: true }),
      ],
    },
    {
      title: "Settings (⚙)",
      body: [
        "- Language, theme, font size, log timestamp format and the number of lines kept on screen.",
        "- «Start file log automatically» and the auto-log folder: each connection writes «portdock-scpi-date-time.log».",
        "- «Export / Import settings» move the connection settings, command list and repeat measurement settings as a JSON file.",
        ...settingsLines("en"),
      ],
    },
    {
      title: "Shortcuts and tips",
      body: [
        ...shortcutLines("en", { saveView: true, find: true }),
        "- Enter: in the command box, query (ends in ?) or write. ↑↓: earlier commands.",
        "- Esc: stop a pending query or the repeat measurement (outside the command box).",
      ],
    },
    {
      title: "Troubleshooting",
      body: [
        "- «Connection refused»: wrong port (not every instrument uses 5025 — see «socket port» in the manual) or the socket service is off. Some instruments refuse new connections while another program (a VISA session) is connected.",
        "- «No reply (timed out)»: a non-query sent as a query, a typo (check the error queue), or a slow measurement (raise «Response timeout» or use *OPC?).",
        "- «The reply did not end»: the «Line ending» does not match the instrument (some use CR).",
        "- -410 Query INTERRUPTED: a new command was sent before the answer was read. If you sent a query with «Write», take the answer with «Read» first.",
        "- Garbled serial text: check baud, parity and data bits, flow control (does the instrument use DTR/DSR or RTS/CTS?) and whether a null-modem cable is needed.",
        "- The program does not open: Microsoft Edge WebView2 is required (included in Windows 11).",
      ],
    },
  ],
};
