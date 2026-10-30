// Plot 도움말 — 화면 ? 버튼·F1 로 연다(사이트 도구 소개에도 쓴다)
import type { HelpDoc } from "@shared/HelpDialog";
import { settingsLines, shortcutLines, windowLines } from "@shared/helpCommon";

export const help: HelpDoc = {
  ko: [
    {
      title: "이 프로그램은",
      body: [
        "PortDock Plot 은 시리얼·TCP·UDP 로 들어오는 숫자를 실시간 그래프로 그립니다. Arduino·ESP32 같은 보드, 센서 모듈, 값을 보내는 장비·PLC 의 출력을 눈으로 확인하고 기록할 때 씁니다.",
        "- 받는 곳: 시리얼(포트·속도·8N1), TCP 클라이언트(장비 포트에 접속), UDP 받기(멀티캐스트 포함).",
        "- 해석: 글자 줄(쉼표·빈칸·탭·세미콜론 자동), «이름:값»(Arduino 시리얼 플로터 식), 머리글 줄을 채널 이름으로, 바이너리 프레임(시작 바이트·u8~f64·엔디언·체크섬).",
        "- 그래프: 채널 32개까지(색·켜고 끄기·이름·왼쪽/오른쪽 축), 최근 N점/N초, Y 자동·고정, 멈춤(받기는 계속), 커서 값, 두 점의 Δt·Δ값, 확대·옮기기.",
        "- 표(최근·최소·최대·평균), 원시 수신(실패 줄 빨강·이유), 받는 동안 CSV 기록, 보이는 범위 CSV·PNG 저장.",
        "- 무료(GPL-3.0)이고 화면은 한국어·영어입니다.",
      ],
    },
    {
      id: "start",
      title: "처음 쓰는 순서",
      body: [
        "- 1. 장비가 한 줄에 숫자를 보내게 합니다. Arduino 예: Serial.print(t); Serial.print(','); Serial.println(h); → «23.1,40». 이름을 붙이려면 Serial.print(\"temp:\"); … → «temp:23.1,hum:40».",
        "- 2. 왼쪽 «받는 곳» 시리얼 → 포트와 속도(스케치의 Serial.begin 값). TCP 면 장비 주소·포트, UDP 면 이 PC 의 받을 포트.",
        "- 3. «해석» 은 «글자 줄»·구분자 «자동» 그대로 두면 대부분 됩니다.",
        "- 4. «받기 시작»(F4). 값이 오면 그래프와 아래 «채널» 표가 생깁니다. 숫자가 안 보이면 «원시 수신» 탭에서 실제로 무엇이 오는지 봅니다.",
        "- 5. 기록하려면 «● CSV 기록», 지금 화면만 남기려면 «화면 CSV»·«PNG».",
      ],
    },
    {
      title: "화면 구성",
      body: [
        "- 왼쪽: 받는 곳(시리얼·TCP·UDP)과 설정, «해석»(데이터 모양·구분자·머리글 또는 바이너리 프레임), 받기 시작·받기 멈춤과 상태, 받은 양(값 줄·실패·줄/초·바이트).",
        "- 가운데 위 도구 막대: ⏸ 화면 고정·▶ 실시간, 보기(최근 점·최근 초와 폭), Y 자동·고정(오른쪽 축을 쓰는 채널이 있으면 «Y 오른쪽» 도), ● CSV 기록, 화면 CSV, PNG, 지우기.",
        "- 가운데: 그래프(위에 범례), 그 아래 측정 줄(A·B·Δt·Δ값).",
        "- 아래: 탭 «채널»(보기·색·이름·축·최근·최소·최대·평균) / «원시 수신». 위아래 사이 막대를 끌어 높이를 바꿉니다(두 번 누르면 처음 높이).",
        ...windowLines("ko"),
      ],
    },
    {
      title: "받는 곳",
      body: [
        "- 시리얼: 포트·속도·데이터 비트·패리티·정지 비트(보통 8N1). «고급 연결» 의 «DTR 켜기»(기본 켬)는 네이티브 USB 보드(Leonardo·ESP32-S2/S3·RP2040 등)가 보내기 시작하게 합니다 — Uno 같은 보드는 열 때 한 번 리셋됩니다. «뽑혔다 꽂히면 다시 연결»(기본 켬).",
        "- TCP 클라이언트: 이 PC 가 장비의 주소·포트에 접속해 받습니다. 끊기면 2초마다 다시 접속합니다. (장비가 PC 에 접속해 오는 서버 방식은 PortDock TCP 로 받아 보세요.)",
        "- UDP 받기: 이 PC 의 «받을 주소»(0.0.0.0 = 모든 랜카드)·포트로 오는 데이터그램. 데이터그램 하나가 줄 끝 없이 와도 한 줄로 봅니다. 장비가 멀티캐스트로 보내면 «멀티캐스트 그룹» 에 그 주소.",
        "- 목록에 없는 포트(모뎀으로 잡힌 포트·일부 가상 포트)는 포트 목록 맨 아래 «직접 입력…» 으로 이름(예: COM12)을 넣어 엽니다. 목록에는 Windows 의 SERIALCOMM 에 등록된 포트도 함께 보입니다.",
        "- TCP·UDP 주소 칸 오른쪽 «▾» 는 받기 시작에 성공했던 주소·포트를 최근 것부터 8개까지 보여 줍니다. 고르면 두 칸이 채워지고, ✕ 로 그 줄을 지웁니다.",
        "- 다른 창에서 일하는 동안 받던 연결이 끊기거나 재연결을 기다리게 되면 작업 표시줄의 Plot 단추가 깜빡입니다. «받기 멈춤» 으로 직접 멈춘 것은 알리지 않고, 설정(⚙)에서 끌 수 있습니다.",
        "- 명령줄로 받는 곳을 채울 수 있습니다: «portdock-plot.exe --serial COM3 --baud 115200» · «--tcp 10.0.0.5:5000» · «--udp 5005» (받는 곳은 하나만). 칸만 채우고, 받기는 «받기 시작» 을 눌러야 시작합니다. 잘못된 인자는 알림 한 줄로 알리고 무시합니다.",
        "- «--auto» 를 붙이면 켜자마자 받기를 시작합니다 — 명령줄로 채운 설정, 없으면 마지막으로 받기에 성공한 설정으로. 시리얼 포트가 없으면 시작하지 않습니다.",
        "- 받는 중에는 받는 곳 설정이 잠기고, «해석» 은 바꿀 수 있습니다(바꾸면 줄 조각·채널 이름을 새로 시작).",
      ],
    },
    {
      title: "글자 줄 해석",
      body: [
        "- 줄 끝은 LF·CR LF·CR 어느 것이든 됩니다. 빈 줄은 건너뜁니다. 줄 끝 없이 4096바이트가 쌓이면 잘라서 실패 줄로 남깁니다.",
        "- 구분자 «자동»: 줄에 탭이 있으면 탭, 없으면 세미콜론, 쉼표, 빈칸 순. 세미콜론·탭·빈칸으로 나눌 때는 «1,5» 를 1.5 로 읽습니다(유럽식 소수점). 끝에 붙은 구분자(«1,2,»)는 빈 칸으로 치지 않습니다.",
        "- 숫자: 23 · -1.5 · +1.0E+00 · 0x1F(16진). «1,,3» 의 가운데처럼 빈 칸은 빈 값(선이 끊김). 숫자가 아닌 칸은 빈 값이 되고 그 줄은 «원시 수신» 에 빨강·이유(«숫자가 아닌 칸 2: «abc»»)로 남습니다.",
        "- «이름:값»: temp:23.1,hum:40 · temp:23.1 hum:40 · a=1 b=2 · «temp: 23.1»(빈칸) 모두 됩니다. 이름마다 채널이 정해지고(처음 나온 순서) 순서가 바뀌어 와도 같은 채널에 들어갑니다. 한 줄에 이름 없는 숫자가 섞이면 자리 번호(«2»)가 이름이 됩니다.",
        "- 머리글: 숫자가 하나도 없고 칸이 둘 이상인 줄(time,volt,amp)은 채널 이름이 됩니다. 장비가 다시 보내면 이름도 바뀝니다. «쓰지 않음» 이면 그런 줄은 실패 줄입니다. «Ready» 처럼 한 낱말 줄은 이름이 아니라 실패 줄입니다.",
        "- 채널은 32개까지 — 넘는 칸은 버리고 이유를 남깁니다.",
      ],
    },
    {
      title: "바이너리 프레임",
      body: [
        "- 프레임 = [시작 바이트…][값 × 채널 수][체크섬]. 길이는 정해져 있고 왼쪽에 «프레임 n 바이트 = 시작 + 값 + 체크섬» 으로 보입니다.",
        "- 시작 바이트(HEX, 예 «AA 55», 8개까지): 이것을 찾아 프레임을 맞춥니다. 찾느라 버린 바이트는 «원시 수신» 에 «시작 바이트를 찾느라 n바이트 버림». 비우면 받은 순서대로 길이마다 자릅니다 — 한 바이트라도 어긋나면 체크섬이 있어야 다시 맞춥니다.",
        "- 값 형식: u8·i8·u16·i16·u32·i32·f32·f64. 바이트 순서: 리틀 엔디언(Arduino·ESP32·PC 의 기본) 또는 빅 엔디언.",
        "- 체크섬: SUM8·XOR(BCC)·CRC8·CRC16 Modbus·CCITT·XMODEM·LRC·SUM16·CRC32. 기본은 시작 바이트 뒤부터 체크섬 앞까지 계산(«체크섬에 시작 바이트 포함» 으로 바꿈). 틀린 프레임은 버리고 한 바이트 밀어 다시 찾습니다.",
        "- Arduino 예: byte f[7] = {0xAA, 0x55}; int16_t a = analogRead(A0), b = analogRead(A1); memcpy(f+2,&a,2); memcpy(f+4,&b,2); f[6] = f[2]+f[3]+f[4]+f[5]; Serial.write(f,7); → 시작 «AA 55», 채널 2, i16, 리틀 엔디언, 체크섬 SUM8.",
        "- 길이 칸이 있는 가변 길이 프레임은 아직 하지 않습니다.",
      ],
    },
    {
      title: "그래프 보기",
      body: [
        "- 보기 «최근 점»: 받은 순서 번호를 가로축으로 최근 N점(기본 1000). «최근 초»: PC 가 받은 시각으로 최근 N초 — 장비 시각이 아니라 USB·네트워크가 묶어 넘기는 시각이라 점 간격이 고르지 않을 수 있습니다(정확한 간격이 필요하면 장비가 시각·카운터를 한 채널로 보내세요).",
        "- 버퍼는 최근 10만 줄입니다(1 kHz 면 약 100초). 그보다 긴 기록은 «● CSV 기록» 으로.",
        "- Y «자동» 은 보이는 값에 맞추고, «고정» 은 최소·최대. 채널 «축» 을 오른쪽으로 두면 오른쪽 축이 생기고 «Y 오른쪽» 을 따로 정합니다.",
        "- ⏸ 화면 고정(Space): 그래프만 멈추고 받기·기록은 계속합니다(받기를 멈추는 것은 왼쪽 «받기 멈춤»). ▶ 실시간(End, 또는 그래프 두 번 누르기)으로 돌아갑니다. 멈춘 사이 오래 받으면 보던 범위가 버퍼에서 밀려날 수 있습니다.",
        "- 휠: 마우스 자리를 기준으로 가로 확대·축소. Shift+휠: 세로. 끌기: 옮기기(Shift+끌기는 세로도). 확대·옮기기를 하면 저절로 멈춥니다.",
        "- 커서: 그래프 위에 마우스를 올리면 가장 가까운 점의 번호·시각과 채널 값이 나옵니다.",
        "- 측정: 그래프를 누르면 측정점 A, 한 번 더 누르면 B. 아래 줄에 Δt(시각 차)·Δn(점 수)·1/Δt(Hz)와 채널마다 Δ값. 세 번째 누르기는 새 A. 오른쪽 버튼·Esc·«측정점 지우기» 로 지웁니다.",
        "- 선이 점보다 픽셀이 적으면 픽셀마다 처음·최소·최대·마지막 값으로 그려 뾰족한 값도 사라지지 않습니다. 점이 적으면 점도 찍습니다.",
      ],
    },
    {
      title: "채널 표·원시 수신",
      body: [
        "- «채널» 탭: 채널마다 보기(켜고 끄기), 색(기본 8색은 색약에도 구별되게 고른 색, 9번째부터는 같은 색 점선), 이름(비우면 장비가 보낸 이름 또는 CH1…), 축(왼쪽·오른쪽), 최근 값과 지금 보이는 범위의 최소·최대·평균.",
        "- «원시 수신» 탭: 최근 300줄. 해석 실패 줄은 빨강과 이유, 연결·끊김 같은 사건은 회색. 바이너리면 프레임 HEX.",
        "- 왼쪽 받은 양: 값 줄·실패 수·초당 줄·바이트. 화면이 따라오지 못해 버린 줄이 있으면 따로 알립니다(CSV 기록에는 모두 남음).",
      ],
    },
    {
      title: "기록과 저장",
      body: [
        "- «● CSV 기록»(Ctrl+Shift+L): 받는 동안 모든 값을 파일에 바로 씁니다 — 시각(로컬, ms), elapsed_s(기록 시작부터 초), 채널. 첫 줄은 채널 이름(그때의 이름). 엑셀에서 한글이 깨지지 않게 BOM 을 붙입니다. 그래프를 멈추거나 버퍼에서 밀려나도 파일에는 남고, 1초마다 디스크에 씁니다.",
        "- «화면 CSV»(Ctrl+S): 지금 보이는 범위만 — time·elapsed_s·index(받은 순서)·채널.",
        "- «PNG»: 그래프 그림(범례·눈금·측정점 포함). «지우기»(Ctrl+L): 버퍼·그래프·원시 줄·측정점을 비웁니다.",
      ],
    },
    {
      id: "tutorial",
      title: "Simulator 로 따라하기 (장비 없이)",
      body: [
        "장비가 없으면 PortDock Simulator 의 «장비가 먼저 보내기» 로 같은 PC 에서 값을 흘려 봅니다.",
        "- 1. PortDock Simulator 를 열고 방식 «UDP» — «받을 포트» 5006, «보낼 곳» 127.0.0.1 : 5005 로 두고 «시작».",
        "- 2. «장비가 먼저 보내기» 를 펼쳐 ASCII, 내용 «temp:2{rand 0..4 dec}.{rand 0..9 dec},hum:{rand 40..45 dec},n:{counter dec}», «줄 끝 붙이기» CR LF.",
        "- 3. «반복(ms)» 100 을 켭니다 — 0.1초마다 «temp:23.4,hum:41,n:0» 처럼 값이 바뀌어 나갑니다({rand}·{counter} 는 보낼 때마다 새로 채움).",
        "- 4. PortDock Plot: 받는 곳 «UDP 받기», 받을 주소 0.0.0.0, 포트 5005 → «받기 시작». temp·hum·n 세 채널이 생깁니다. n 은 크기가 달라 «축» 을 오른쪽으로 두면 보기 좋습니다.",
        "- 5. 그래프를 두 번 눌러 측정점 A·B 사이 Δn 과 n 의 Δ값이 같은지 보고, «● CSV 기록» 을 켰다 끈 뒤 엑셀로 열어 봅니다.",
        "- 시리얼로 하려면 가상 COM 쌍(com0com 등)의 한쪽을 Simulator, 다른 쪽을 Plot 에 엽니다. TCP 면 Simulator «TCP 서버» 포트 5000, Plot «TCP 클라이언트» 127.0.0.1:5000.",
        "- 실패 줄 보기: 내용을 «temp:{rand 0..9 dec}x» 처럼 바꾸면 «원시 수신» 에 빨간 줄과 이유가 나옵니다.",
      ],
    },
    {
      title: "범위 밖 (아직 하지 않음)",
      body: [
        "- TCP 서버(장비가 접속해 오는 방식), MQTT·BLE·Modbus 폴링 — Modbus 값의 추세는 PortDock Modbus Master 의 «추세» 를 쓰세요.",
        "- 길이 칸이 있는 가변 길이 바이너리 프레임, 채널마다 배율·오프셋, XY(리사주) 그래프, FFT, 저장한 CSV 다시 열기.",
        "- 장비로 보내기(명령) — PortDock Serial·TCP·UDP 를 함께 쓰세요(같은 포트를 두 프로그램이 동시에 열 수는 없습니다).",
      ],
    },
    {
      title: "설정 (⚙)",
      body: [
        "- 언어, 테마, 글자 크기. 설정 내보내기·가져오기는 받는 곳·해석·보기·채널 이름과 색을 JSON 파일로 옮깁니다.",
        ...settingsLines("ko", { run: true }),
      ],
    },
    {
      title: "단축키",
      body: shortcutLines("ko", { startStop: true, graph: true }),
    },
    {
      title: "문제 해결",
      body: [
        "- 그래프가 비어 있음: «원시 수신» 을 봅니다. 아무것도 없으면 속도·포트·DTR(네이티브 USB 보드), TCP·UDP 면 주소·포트·방화벽. 글자가 깨져 보이면 속도가 틀렸습니다.",
        "- 빨간 줄 «숫자가 없습니다»: 장비가 설명 글(«Ready» 등)을 보냅니다 — 무시해도 됩니다. 값 줄이 빨가면 구분자나 형식이 다릅니다(구분자를 직접 골라 보세요).",
        "- 값이 엉뚱한 채널로 감: 줄마다 칸 수·순서가 바뀌면 자리로 나뉩니다 — 장비에서 «이름:값» 으로 보내면 순서가 바뀌어도 같은 채널.",
        "- 바이너리 값이 엉뚱함: 엔디언·형식·채널 수를 확인하고, «원시 수신» 의 HEX 로 프레임 경계를 봅니다.",
        "- «포트가 사용 중»: Arduino IDE 의 시리얼 모니터·플로터나 다른 터미널을 닫으세요.",
        "- 프로그램이 열리지 않음: Microsoft Edge WebView2 가 필요합니다(Windows 11 에는 들어 있음).",
      ],
    },
  ],
  en: [
    {
      title: "About",
      body: [
        "PortDock Plot draws numbers arriving over serial, TCP or UDP as a live graph — for checking and recording the output of boards such as Arduino and ESP32, sensor modules, and devices or PLCs that stream values.",
        "- Sources: serial (port, baud, 8N1), TCP client (connect to the device's port), UDP receive (multicast too).",
        "- Parsing: text lines (comma, space, tab or semicolon, detected automatically), «name:value» pairs (as in the Arduino Serial Plotter), a header line as channel names, and binary frames (start bytes, u8–f64, endianness, checksum).",
        "- Graph: up to 32 channels (color, show/hide, name, left/right axis), last N points or N seconds, auto or fixed Y, pause (keeps receiving), cursor readout, Δt and Δvalue between two markers, zoom and pan.",
        "- Statistics table (last, min, max, mean), raw input (failed lines in red with the reason), CSV recording while receiving, CSV and PNG export of the view.",
        "- Free (GPL-3.0), in English and Korean.",
      ],
    },
    {
      id: "start",
      title: "Getting started",
      body: [
        "- 1. Make the device print numbers on a line. Arduino: Serial.print(t); Serial.print(','); Serial.println(h); → «23.1,40». With names: Serial.print(\"temp:\"); … → «temp:23.1,hum:40».",
        "- 2. On the left, «Source» serial → port and baud (the sketch's Serial.begin). TCP: device address and port. UDP: the port on this PC.",
        "- 3. Leave «Format» on «Text lines» with separator «Auto» — that covers most devices.",
        "- 4. «Start» (F4). The graph and the «Channels» table appear when values arrive. Nothing? Check the «Raw input» tab to see what really arrives.",
        "- 5. To keep everything use «● Record CSV»; to keep only the view, «View CSV» or «PNG».",
      ],
    },
    {
      title: "Layout",
      body: [
        "- Left: source (serial, TCP, UDP) and its settings, «Format» (data shape, separator, header or binary frame), Start/Stop and status, counters (rows, failed, rows/s, bytes).",
        "- Toolbar above the graph: ⏸ Freeze view / ▶ Live, View (last points or seconds and the width), Y auto/fixed (plus «Y right» when a channel uses the right axis), ● Record CSV, View CSV, PNG, Clear.",
        "- Centre: the graph (legend on top) and the measurement line below it (A, B, Δt, Δvalue).",
        "- Bottom: tabs «Channels» (show, color, name, axis, last, min, max, mean) / «Raw input». Drag the bar between them to resize (double-click resets).",
        ...windowLines("en"),
      ],
    },
    {
      title: "Sources",
      body: [
        "- Serial: port, baud, data bits, parity, stop bits (usually 8N1). «Assert DTR» under «Advanced» (on by default) lets native-USB boards (Leonardo, ESP32-S2/S3, RP2040 …) start sending; boards such as the Uno reset once when the port opens. «Reconnect after unplug/replug» is on by default.",
        "- TCP client: this PC connects to the device's address and port and receives. Reconnects every 2 s after a drop. (If the device connects to the PC instead, use PortDock TCP as a server.)",
        "- UDP receive: datagrams sent to the «Listen address» (0.0.0.0 = every interface) and port on this PC. A datagram without a line ending still counts as one line. For multicast senders, enter the group in «Multicast group».",
        "- A port that is not in the list (one registered as a modem, some virtual ports) can be opened by typing its name (e.g. COM12) with «Type a port…» at the bottom of the port list. The list also includes ports registered in Windows SERIALCOMM.",
        "- The «▾» next to the TCP and UDP address box lists the last 8 address:port pairs that started receiving successfully. Pick one to fill both boxes; ✕ removes that entry.",
        "- If the connection drops or starts waiting to reconnect while you work in another window, Plot's taskbar button flashes. Pressing «Stop receiving» yourself does not flash; turn it off in Settings (⚙).",
        "- The source can be filled from the command line: «portdock-plot.exe --serial COM3 --baud 115200» · «--tcp 10.0.0.5:5000» · «--udp 5005» (one source only). It only fills the boxes — press «Start» to begin receiving. Invalid arguments are ignored and reported in one notice.",
        "- Add «--auto» to start receiving right away — with the settings from the command line, or else the last source that started successfully. If the serial port is not present, it does not start.",
        "- While receiving, source settings are locked; «Format» can change (the parser restarts — partial lines and names are dropped).",
      ],
    },
    {
      title: "Text lines",
      body: [
        "- Lines may end in LF, CR LF or CR. Empty lines are skipped. 4096 bytes without a line ending are cut and reported as a failed line.",
        "- Separator «Auto»: tab if the line has one, else semicolon, comma, space. With semicolon, tab or space, «1,5» reads as 1.5 (decimal comma). A trailing separator («1,2,») is not an empty field.",
        "- Numbers: 23 · -1.5 · +1.0E+00 · 0x1F (hex). An empty field (the middle of «1,,3») is a blank (the line breaks). A non-numeric field becomes a blank and the line shows in «Raw input» in red with the reason («Not a number: 2: «abc»»).",
        "- «name:value»: temp:23.1,hum:40 · temp:23.1 hum:40 · a=1 b=2 · «temp: 23.1» all work. Each name gets a channel (in order of first appearance) and keeps it even if the order changes. Unnamed numbers mixed in get their position («2») as the name.",
        "- Header: a line with no numbers and two or more fields (time,volt,amp) becomes the channel names; sent again, the names change. With «Off» such lines are failed lines. One-word lines such as «Ready» are failed lines, not names.",
        "- Up to 32 channels — extra fields are dropped with a reason.",
      ],
    },
    {
      title: "Binary frames",
      body: [
        "- Frame = [start bytes…][value × channels][checksum], fixed length, shown on the left as «Frame n bytes = start + values + checksum».",
        "- Start bytes (HEX, e.g. «AA 55», up to 8) are used to find frames. Bytes skipped while searching show in «Raw input» as «Skipped n bytes looking for the start bytes». Empty: frames are cut by length in arrival order — after a one-byte slip only a checksum can resync.",
        "- Value type: u8, i8, u16, i16, u32, i32, f32, f64. Byte order: little-endian (default on Arduino, ESP32 and PCs) or big-endian.",
        "- Checksum: SUM8, XOR (BCC), CRC8, CRC16 Modbus / CCITT / XMODEM, LRC, SUM16, CRC32 — computed from after the start bytes up to the checksum by default («Include start bytes in checksum» changes that). Bad frames are dropped and the search resumes one byte later.",
        "- Arduino example: byte f[7] = {0xAA, 0x55}; int16_t a = analogRead(A0), b = analogRead(A1); memcpy(f+2,&a,2); memcpy(f+4,&b,2); f[6] = f[2]+f[3]+f[4]+f[5]; Serial.write(f,7); → start «AA 55», 2 channels, i16, little-endian, checksum SUM8.",
        "- Variable-length frames with a length field are not supported yet.",
      ],
    },
    {
      title: "Viewing the graph",
      body: [
        "- View «Last points»: the last N points by arrival order (default 1000). «Last seconds»: the last N seconds of the PC's receive time — not the device's clock; USB and network batching can make spacing uneven (send a timestamp or counter channel from the device when exact spacing matters).",
        "- The buffer holds the last 100,000 rows (about 100 s at 1 kHz). Use «● Record CSV» for longer runs.",
        "- Y «Auto» fits the visible values; «Fixed» uses min and max. Set a channel's «Axis» to right to get a right axis with its own «Y right».",
        "- ⏸ Freeze view (Space) freezes only the graph; receiving and recording continue (to stop receiving, use «Stop receiving» on the left). ▶ Live (End, or double-click the graph) returns. During a long pause the viewed range may roll out of the buffer.",
        "- Wheel: horizontal zoom around the mouse. Shift+wheel: vertical. Drag: pan (Shift+drag pans vertically too). Zooming or panning pauses automatically.",
        "- Cursor: hover the graph for the nearest point's index, time and channel values.",
        "- Measuring: click the graph for marker A, again for B. The line below shows Δt, Δn (points), 1/Δt (Hz) and Δvalue per channel. A third click starts a new A. Right-click, Esc or «Clear markers» removes them.",
        "- With more points than pixels, each pixel column draws its first, min, max and last value, so spikes never vanish. Sparse data also gets dots.",
      ],
    },
    {
      title: "Channels and raw input",
      body: [
        "- «Channels» tab: show/hide, color (the 8 defaults stay distinct for color-vision deficiency; channels 9+ reuse them dashed), name (empty uses the device's name or CH1…), axis (left/right), the latest value and the min, max and mean of the visible range.",
        "- «Raw input» tab: the last 300 lines. Failed lines in red with the reason, events such as connect/disconnect in gray. Binary frames as HEX.",
        "- Counters on the left: rows, failed, rows per second, bytes. If the screen could not keep up and rows were dropped, that is shown separately (the CSV recording still has them all).",
      ],
    },
    {
      title: "Recording and saving",
      body: [
        "- «● Record CSV» (Ctrl+Shift+L) writes every value while receiving — time (local, ms), elapsed_s (seconds since recording started) and the channels. The first line holds the channel names at that moment. Starts with a BOM so Excel shows non-ASCII names. Kept even when the graph is paused or the buffer rolls over; flushed to disk every second.",
        "- «View CSV» (Ctrl+S): only the visible range — time, elapsed_s, index (arrival order), channels.",
        "- «PNG»: the graph image (legend, ticks and markers). «Clear» (Ctrl+L) empties the buffer, graph, raw lines and markers.",
      ],
    },
    {
      id: "tutorial",
      title: "Try it with Simulator (no device)",
      body: [
        "Without a device, the «Device-initiated message» feature of PortDock Simulator can stream values on the same PC.",
        "- 1. Open PortDock Simulator, mode «UDP» — «Listen port» 5006, «Send to» 127.0.0.1 : 5005 — and «Start».",
        "- 2. Expand «Device-initiated message»: ASCII, content «temp:2{rand 0..4 dec}.{rand 0..9 dec},hum:{rand 40..45 dec},n:{counter dec}», «Line ending» CR LF.",
        "- 3. Turn on «Repeat (ms)» 100 — every 0.1 s a line such as «temp:23.4,hum:41,n:0» goes out ({rand} and {counter} are filled on every send).",
        "- 4. In PortDock Plot: source «UDP receive», listen address 0.0.0.0, port 5005 → «Start». Three channels temp, hum and n appear; n has a different scale, so set its «Axis» to right.",
        "- 5. Click the graph twice and check that Δn equals n's Δvalue between markers A and B; turn «● Record CSV» on and off and open the file in Excel.",
        "- For serial, open one side of a virtual COM pair (com0com etc.) in Simulator and the other in Plot. For TCP: Simulator «TCP server» on port 5000, Plot «TCP client» 127.0.0.1:5000.",
        "- To see failed lines, change the content to something like «temp:{rand 0..9 dec}x» — «Raw input» shows red lines with the reason.",
      ],
    },
    {
      title: "Out of scope (not yet)",
      body: [
        "- TCP server mode (the device connects to the PC), MQTT, BLE, Modbus polling — for Modbus value trends use «Trend» in PortDock Modbus Master.",
        "- Variable-length binary frames with a length field, per-channel scale/offset, XY (Lissajous) plots, FFT, reopening a saved CSV.",
        "- Sending commands to the device — use PortDock Serial, TCP or UDP alongside (two programs cannot open the same port at once).",
      ],
    },
    {
      title: "Settings (⚙)",
      body: ["- Language, theme and font size. Export/Import settings moves the source, format, view, channel names and colors as a JSON file.", ...settingsLines("en", { run: true })],
    },
    {
      title: "Shortcuts",
      body: shortcutLines("en", { startStop: true, graph: true }),
    },
    {
      title: "Troubleshooting",
      body: [
        "- Empty graph: check «Raw input». If nothing arrives, check baud, port and DTR (native-USB boards); for TCP/UDP the address, port and firewall. Garbled text means the baud is wrong.",
        "- Red «No numbers» lines: the device prints text such as «Ready» — harmless. If value lines are red, the separator or format differs (pick the separator explicitly).",
        "- Values land in the wrong channel: when the number or order of fields changes per line, they are split by position — send «name:value» so the channel follows the name.",
        "- Odd binary values: check endianness, value type and channel count, and look at the frame boundaries in the HEX of «Raw input».",
        "- «Port is busy»: close the Arduino IDE Serial Monitor/Plotter or other terminals.",
        "- The program does not open: Microsoft Edge WebView2 is required (included in Windows 11).",
      ],
    },
  ],
};
