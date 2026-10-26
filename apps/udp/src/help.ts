// UDP 도움말 — 화면 ? 버튼·F1 로 연다
import type { HelpDoc, HelpSection } from "@shared/HelpDialog";
import { ioAutoReplySections } from "@shared/helpAutoReply";
import { commandLines, ioEvLines, ioKeyLines, ioLayoutLines, ioSections, logHandlingLines, notationLines, settingsLines, shortcutLines, windowLines } from "@shared/helpCommon";

export const help: HelpDoc = {
  ko: [
    {
      title: "이 프로그램은",
      body: [
        "PortDock UDP 는 UDP 데이터그램으로 장비와 데이터를 주고받는 시험 도구입니다.",
        "접속 과정 없이 정한 포트로 받고, 정한 곳(또는 마지막으로 보내온 쪽)으로 보냅니다.",
        "브로드캐스트·멀티캐스트, 에코, 체크섬, 파일 기록을 지원합니다.",
      ],
    },
    {
      title: "처음 쓰는 순서",
      body: [
        "- 1. «받는 쪽 (이 PC)» 에 «묶을 주소»(보통 0.0.0.0)와 «받을 포트» 를 넣습니다. 장비가 이 PC 로 보내는 포트입니다.",
        "- 2. «보낼 곳 (기본)» 에 장비의 «주소»(IP)와 «포트» 를 넣습니다. 받기만 할 거면 비워도 됩니다.",
        "- 3. «시작» 을 누릅니다. 상태가 «받는 중» 이 되면 준비 끝입니다.",
        "- 4. 아래 입력칸에 보낼 내용을 쓰고 «보내기»(또는 Enter)를 누릅니다. 받은 것은 RX ◀, 보낸 것은 TX ▶ 로 찍히고 상대 주소가 함께 나옵니다.",
      ],
    },
    {
      title: "화면 구성",
      body: [
        "- 왼쪽: 받는 쪽·보낼 곳, «고급 연결» 접기(브로드캐스트·멀티캐스트), «시작»/«멈춤», 상태, «보내온 상대» 목록, «받기 설정» 접기(수신 체크섬 검사·에코), «파일로 계속 저장».",
        "- «고급 연결»·«받기 설정» 은 평소 접혀 있고 제목 옆에 지금 값(«브로드캐스트 · 239.0.0.1», «체크섬 검사 없음»)이 보입니다. 하나라도 켜 두었으면 펼친 채 시작하고, 열고 닫은 상태는 기억합니다.",
        "- 가운데 위 도구줄: «보기»(HEX·ASCII·«둘 다» — 처음에는 «둘 다»), «자동 스크롤», 누적 바이트 수, «화면 내용 저장», «지우기».",
        "- 도구줄 아래 찾기·거르기 줄: 찾기 칸, ▲·▼, «찾은 줄만», «틀림만», 방향(전체·RX·TX·EV). «로그 찾기·거르기» 절을 보세요.",
        "- 가운데 로그: 시각·방향(RX ◀ / TX ▶ / EV)·상대 주소·내용. UDP 는 데이터그램 하나가 곧 한 줄입니다(프레임 구분이 필요 없음).",
        "- 가운데 아래: 보내기 줄(대상, HEX/ASCII, 입력칸, 체크섬, 줄 끝 붙이기, «보내기»), «보낼 바이트», «반복(ms)», «+ 목록에 추가».",
        "- 오른쪽: «명령 목록», «트리거», «상세»(로그 줄을 누르면 상대 주소·바이트 수·HEX·ASCII).",
        "- 창이 좁으면(1180px 이하) 오른쪽 칸이 숨고 «☰ 명령·상세»(1100px 이하에서는 «☰») 버튼으로 펼칩니다. 로그 줄을 누르면 저절로 펼쳐져 «상세» 가 보입니다.",
        "- 반복 횟수 칸은 반복을 켰거나 횟수를 정했을 때만 보내기 둘째 줄에 보이고, 그 밖에는 «⋯ 더보기» 에서 정합니다.",
        ...windowLines("ko"),
        ...ioLayoutLines("ko", {}),
      ],
    },
    {
      title: "받는 쪽과 보낼 곳",
      body: [
        "- «묶을 주소 (0.0.0.0 = 모든 랜카드)»: 어느 랜카드로 받을지. 특정 랜카드만 쓰려면 그 PC 쪽 IP 를 넣습니다.",
        "- «받을 포트 (0 = 아무 포트)»: 0 이면 운영체제가 빈 포트를 고르고, 고른 포트가 상태줄에 나옵니다.",
        "- «보낼 곳 (기본)»: 보내기 줄에서 «보낼 곳» 을 고르면 여기로 보냅니다. 실행 중에도 바꿀 수 있습니다.",
        "- (0.3.0 부터) 보낼 곳 주소 칸 옆 «▾» 에 시작에 성공했던 보낼 곳이 최근 것부터 8개까지 남습니다. 고르면 주소·포트가 채워지고, ✕ 로 하나씩 지웁니다. 주소 칸에 글자를 넣으면 예전 주소가 자동 완성으로도 나옵니다.",
        "- 실행 중에 바꾼 보낼 곳은 입력을 멈추고 잠시 뒤 적용됩니다. 적용에 실패하면(예: 주소를 찾을 수 없음) 칸이 빨갛게 되고 «지금도 이전 주소로 되어 있다» 는 안내가 나오며, 고칠 때까지 «보낼 곳» 으로는 보내지 않습니다(이전 주소로 새지 않게). 보내기 줄의 «보낼 곳 (…)» 에는 실제 적용된 주소가 보입니다.",
        "- 보내기 줄의 대상: «보낼 곳», «마지막으로 보내온 쪽», 또는 «보내온 상대» 목록의 특정 주소.",
        "- «보내온 상대» 옆 «보낼 곳으로» 를 누르면 그 주소를 기본 보낼 곳으로 넣습니다.",
        "- 보내온 상대는 최대 256개까지 기억합니다.",
        "- 받는 주소·포트·브로드캐스트·멀티캐스트는 실행 중에 바꿀 수 없습니다(🔒). 멈추고 바꾸세요. 보낼 곳·에코·수신 체크섬 검사는 실행 중에 바꿔도 바로 적용됩니다.",
      ],
    },
    {
      title: "브로드캐스트·멀티캐스트·에코",
      body: [
        "- «브로드캐스트 허용»: 255.255.255.255 나 192.168.0.255 같은 브로드캐스트 주소로 보내려면 켜고 시작해야 합니다. 꺼진 채로 브로드캐스트 주소를 보낼 곳에 넣으면 경고가 나옵니다.",
        "- «멀티캐스트 그룹»: 224.0.0.0~239.255.255.255 주소를 넣으면 시작할 때 그 그룹에 가입해 받습니다. 범위 밖이면 오류가 나옵니다.",
        "- «멀티캐스트 랜카드»: 가입할 랜카드의 IP. 0.0.0.0 이면 운영체제 기본.",
        "- «다시 가입»: 무선 랜이나 랜카드가 바뀌어 멀티캐스트 수신이 끊기면 눌러 보세요.",
        "- «받은 것 보낸 쪽으로 돌려주기 (에코)»(«받기 설정» 안): 받은 데이터그램을 보낸 주소로 그대로 돌려줍니다. 실행 중에도 켜고 끌 수 있습니다.",
        "- 에코는 1초에 200번을 넘으면 저절로 꺼집니다(상대도 에코하면 끝없이 주고받기 때문). «ECHO OFF …» 줄과 오류가 나옵니다. 자기 자신에게 온 것(브로드캐스트 되돌림)은 에코하지 않습니다.",
      ],
    },
    {
      title: "보내기",
      body: [
        "입력칸 왼쪽에서 HEX 또는 ASCII 를 고릅니다(처음에는 ASCII). 입력하는 동안 «보낼 바이트» 에 실제로 나갈 바이트가 보이고, 틀리면 이유가 나옵니다.",
        "- HEX 칸에 «hello» 처럼 글자를 쳐서 오류가 나면 옆에 [ASCII 로 보내기] 가 나옵니다. 누르면 친 글 그대로 ASCII 로 바꾸고 바로 보냅니다(아직 시작 전이거나 보낼 곳이 없으면 [ASCII 로 바꾸기] — 바꾸기만).",
        "- HEX: «01 03 0A», «01030A», «0x01,0x03,0x0A» 모두 같은 3바이트입니다. 두 자리씩이어야 합니다.",
        "- ASCII: 글자를 그대로 보냅니다. «\\r»(CR), «\\n»(LF), «\\t», «\\0», «\\\\», «\\xNN» 을 쓸 수 있습니다.",
        "- «체크섬»: CRC16 Modbus, CRC16 CCITT, CRC16 XMODEM, CRC8, LRC, BCC (XOR), SUM8, SUM16, CRC-32, CRC (사용자 정의) 중 하나를 붙입니다. 옆 ⚙ 로 계산 범위·자리·바이트 순서를 바꿉니다.",
        "- «줄 끝 붙이기»: «없음»·CR·LF·CR LF. 붙는 순서는 «본문 + 체크섬 + 줄 끝» 입니다.",
        "- 한 번 보내기 = 데이터그램 하나입니다. 너무 크면(약 64KB 초과) 운영체제가 거절합니다.",
        "- 시작 전이거나 내용이 비면 «보내기» 가 잠기고 옆에 이유가 나옵니다. 보낼 곳이 없으면(«마지막으로 보내온 쪽» 인데 아직 받은 게 없음 등) 오류 문구가 나옵니다.",
        ...notationLines("ko"),
      ],
    },
    {
      title: "반복과 명령 목록",
      body: [
        "- «반복(ms)»: 체크하면 지금 입력을 정한 간격(10ms 이상)으로 계속 보냅니다. 멈추면 저절로 꺼집니다.",
        "- «+ 목록에 추가»: 지금 입력(모드·체크섬·줄 끝 포함)을 오른쪽 «명령 목록» 에 추가합니다.",
        "- 명령 목록은 껐다 켜도 남아 있습니다.",
        ...commandLines("ko"),
      ],
    },
    {
      title: "수신 체크섬 검사",
      body: [
        "- 종류를 고르면 받은 데이터그램마다 맨 끝 체크섬을 검사해 «정상» 또는 «틀림» 을 붙입니다.",
        "- 데이터그램 맨 끝 바이트가 체크섬이어야 합니다. 뒤에 CR·LF 가 붙어 오면 «틀림» 이 됩니다.",
        "- 파일 로그에는 «[OK]» 또는 «[CHECK FAIL]» 이 붙습니다.",
      ],
    },
    {
      title: "로그와 사건 줄(EV)",
      body: [
        "- EV 줄은 시작·멈춤·멀티캐스트 가입·에코 켜고 끄기·오류 같은 사건입니다.",
        "- «ICMP port unreachable»: 보낸 곳에서 아무도 듣고 있지 않다는 운영체제 알림입니다. 장비 포트와 전원을 확인하세요.",
        "- 화면에 남길 줄 수(기본 10만)를 넘으면 화면에서만 오래된 줄이 지워집니다. 파일 기록은 그대로입니다.",
        ...ioEvLines("ko", {}),
        ...logHandlingLines("ko", { sendAgain: true, addCommand: true, find: true, checkbox: true }),
      ],
    },
    {
      title: "로그 찾기·거르기",
      body: [
        "도구줄 바로 아래 줄에서 로그를 찾고 거릅니다. 거르기는 보기만 바꾸며 기록은 그대로 남습니다(파일 로그에도 영향 없음).",
        "- 찾기 칸: «01 03» 처럼 2자리 HEX 묶음이면 바이트로, 그 밖은 글자로(대소문자 무시) 찾습니다. 옆 칸에서 «자동»·«HEX»·«글자» 를 직접 고를 수 있습니다(«0A» 처럼 헷갈릴 때). 사건 줄(EV)은 글자로 찾을 때 설명 글에서 찾습니다.",
        "- 찾은 줄은 노랗게 보이고, ▲·▼(또는 Enter·Shift+Enter)로 앞뒤 찾은 줄로 옮겨 고릅니다. «3/17» 은 17개 중 세 번째라는 뜻입니다(고른 줄이 찾은 줄이 아니면 «–/17»).",
        "- «찾은 줄만»: 찾은 줄만 보입니다. «틀림만»: 수신 체크섬이 «틀림» 인 줄만 보입니다. 방향 칸: «전체»·RX·TX·EV.",
        "- 거르는 중에는 오른쪽에 «120 / 5,000줄 보임» 처럼 나오고, ✕ 로 모두 끕니다. 거르는 중에도 새 줄은 계속 들어오고, 조건에 맞으면 보입니다.",
        "- 도구줄의 «CHECK FAIL n»: «지우기» 뒤로 체크섬이 틀린 줄 수입니다(틀린 줄이 있을 때만 보임). 누르면 «틀림만» 이 켜지고 꺼집니다.",
        "- 단축키: Ctrl+F 찾기 칸으로, Enter 다음, Shift+Enter 이전, Esc 찾는 글자 지우기(한 번 더 누르면 거르기 전체 끄기).",
      ],
    },
    {
      title: "저장과 상세",
      body: [
        "- «화면 내용 저장»: 지금 화면에 남은 줄을 텍스트 파일로 저장합니다. 지금 «보기» 대로(HEX, ASCII, «둘 다» 는 «HEX | ASCII») 쓰고, 거르기가 켜져 있으면 보이는 줄만 씁니다. 첫 줄(# 로 시작)에 보기·거르기·줄 수가 적힙니다. 시각은 설정의 «로그 시각 표시» 를 따르고, 체크섬이 틀린 줄 끝에는 «[CHECK FAIL]» 이 붙습니다. («파일로 계속 저장» 의 줄 모양은 보기와 상관없이 설정 «파일 로그 형식» 을 따릅니다 — 기본 HEX.)",
        "- «파일로 계속 저장»: 파일을 고르면 그때부터 오는 모든 줄을 계속 씁니다. 첫 줄에 설정이 적힙니다. «저장 멈춤» 으로 끝냅니다. 시작한 뒤에만 누를 수 있습니다.",
        "- 로그 줄을 누르면 오른쪽 «상세» 에 그 줄의 상대·바이트 수·HEX·ASCII 가 나옵니다.",
        "- (0.3.0 부터) «상세» 제목 옆 «복사» 로 상세 칸에 보이는 글(상대·바이트 수·HEX·ASCII)을 그대로 클립보드에 넣습니다.",
        "- (0.3.0 부터) «화면 내용 저장»·«파일로 계속 저장» 의 기본 파일 이름에 받는 주소·포트와 시각이 들어갑니다(예: portdock-udp-0.0.0.0-5000-20261026-153012.txt).",
      ],
    },
    {
      title: "설정(⚙)",
      body: [
        "- «언어»·«테마»·«글자 크기»·«로그 시각 표시»·«화면에 남길 줄 수»·«자동 스크롤» 처음 상태.",
        "- «연결하면 자동으로 파일 로그 시작»: «자동 로그 폴더» 를 고르면 시작할 때마다 «portdock-udp-날짜-시각.log» 에 저장합니다.",
        "- «연결·기록 중에 창을 닫으려 하면 묻기».",
        "- «설정 내보내기»·«설정 가져오기»: 화면 설정과 명령 목록을 JSON 파일로 옮깁니다. «기본값으로» 는 화면 설정만 되돌립니다.",
        ...settingsLines("ko", { run: true }),
        "- (0.3.0 부터) 명령줄 «--auto»: 켤 때 마지막으로 시작에 성공한 설정(받는 쪽·보낼 곳 등)으로 바로 시작합니다. 성공한 적이 없으면 아무것도 하지 않습니다. 저절로 시작하면 로그에 사건 줄(EV)이 남고, 자동응답이 켜져 있으면 그것도 알립니다.",
      ],
    },
    {
      title: "단축키·팁",
      body: [
        ...shortcutLines("ko", { saveView: true, repeat: true, find: true, startStop: true }),
        ...ioKeyLines("ko"),
        "- 입력칸에서 Enter: 보내기.",
        "- 칸에 마우스를 올리면 말풍선으로 설명이 나옵니다.",
        "- 장비가 어디로 보내는지 모르면: 받을 포트를 맞게 넣고 시작한 뒤 «보내온 상대» 를 보세요.",
      ],
    },
    {
      title: "문제 해결",
      body: [
        "- 시작할 때 «주소 사용 중»: 다른 프로그램이 그 포트를 쓰고 있습니다. 다른 포트를 쓰거나 그 프로그램을 닫으세요.",
        "- 아무것도 안 들어옴: 장비가 보내는 대상 IP·포트, 윈도우 방화벽 허용, PC 와 장비가 같은 대역인지 확인하세요.",
        "- 브로드캐스트를 보냈는데 오류: «브로드캐스트 허용» 을 켜고 다시 시작하세요.",
        "- 멀티캐스트가 안 들어옴: 그룹 주소, «멀티캐스트 랜카드» 를 확인하고 «다시 가입» 을 눌러 보세요.",
        "- 프로그램이 안 열림: Microsoft Edge WebView2 가 필요합니다(윈도우 11 은 기본 포함).",
      ],
    },
  ],
  en: [
    {
      title: "About this program",
      body: [
        "PortDock UDP is a test tool that exchanges UDP datagrams with devices.",
        "There is no connection: it receives on a port you choose and sends to a destination you choose (or to the last sender).",
        "It supports broadcast, multicast, echo, checksums and file logging.",
      ],
    },
    {
      title: "Getting started",
      body: [
        "- 1. Under «Local (this PC)», enter the «Bind address» (usually 0.0.0.0) and the «Listen port» the device sends to.",
        "- 2. Under «Destination (default)», enter the device «Host» (IP) and «Port». Leave it empty if you only receive.",
        "- 3. Press «Start». When the status shows «Listening», you are ready.",
        "- 4. Type in the input and press «Send» (or Enter). Received data shows as RX ◀, sent data as TX ▶, with the peer address.",
      ],
    },
    {
      title: "Layout",
      body: [
        "- Left: local and destination settings, the «Advanced connection» section (broadcast, multicast), «Start»/«Stop», status, «Senders», the «Receive settings» section (RX checksum check, echo), «Log to file».",
        "- «Advanced connection» and «Receive settings» are collapsed with the current values next to the title («broadcast · 239.0.0.1», «No checksum check»). They start expanded when anything is set, and their open state is remembered.",
        "- Toolbar: «View» (HEX, ASCII, «Both» — «Both» at first), «Auto-scroll», byte counters, «Save view», «Clear».",
        "- Below the toolbar, the find/filter row: find box, ▲/▼, «Matches only», «FAIL only», direction (All/RX/TX/EV). See «Find and filter the log».",
        "- Log: time, direction (RX ◀ / TX ▶ / EV), peer address, data. One datagram is one line (no framing needed).",
        "- Bottom: send row (target, HEX/ASCII, input, checksum, line ending, «Send»), «Bytes to send», «Repeat (ms)», «+ Save to list».",
        "- Right: «Commands», «Triggers» and «Detail» (click a log line to see peer, length, HEX, ASCII).",
        "- In a narrow window (1180 px or less) the right pane hides; open it with «☰ Commands · Detail» (just «☰» at 1100 px or less). Clicking a log line opens it at «Detail».",
        "- The repeat count shows on the second send row only while repeat is on or a count is set; otherwise set it under «⋯ More».",
        ...windowLines("en"),
        ...ioLayoutLines("en", {}),
      ],
    },
    {
      title: "Local and destination",
      body: [
        "- «Bind address (0.0.0.0 = all NICs)»: which network card receives. Enter this PC's IP of a specific card to limit it.",
        "- «Listen port (0 = any)»: with 0 the OS picks a free port and the status line shows it.",
        "- «Destination (default)»: used when the send target is «Destination». You can change it while running.",
        "- (from 0.3.0) The «▾» next to the destination address lists up to 8 destinations you started with successfully, newest first. Pick one to fill in the address and port; ✕ removes an entry. Past addresses also show up as suggestions while you type in the address field.",
        "- A change made while running is applied shortly after you stop typing. If it fails (e.g. the host cannot be resolved), the fields turn red with a note that the previous address is still in use, and sending to «Destination (default)» is blocked until fixed, so nothing goes to the old address. «Default destination (…)» in the send row shows the address actually applied.",
        "- Send targets: «Destination», «Last sender», or a specific address from «Senders».",
        "- «Use as destination» next to a sender copies that address into the default destination.",
        "- Up to 256 senders are remembered.",
        "- Bind address/port, broadcast and multicast are locked (🔒) while running; stop to change them. Default destination, echo and the RX checksum check apply immediately.",
      ],
    },
    {
      title: "Broadcast, multicast, echo",
      body: [
        "- «Allow broadcast»: required (before starting) to send to broadcast addresses such as 255.255.255.255 or 192.168.0.255. A warning shows if the destination is a broadcast address while it is off.",
        "- «Multicast group»: an address in 224.0.0.0–239.255.255.255 is joined at start. Out-of-range addresses are rejected.",
        "- «Multicast NIC»: IP of the card to join on. 0.0.0.0 uses the OS default.",
        "- «Rejoin»: try it if multicast reception stops on Wi-Fi or after a network change.",
        "- «Echo back to sender» (in «Receive settings»): returns each datagram to its sender. Can be toggled while running.",
        "- Echo turns itself off above 200 per second (two echoing peers would loop forever); an «ECHO OFF …» line and an error appear. Your own looped-back broadcasts are not echoed.",
      ],
    },
    {
      title: "Sending",
      body: [
        "Choose HEX or ASCII left of the input (ASCII at first). «Bytes to send» shows the exact bytes while you type, or why the input is invalid.",
        "- If letters such as «hello» are typed in HEX mode, [Send as ASCII] appears next to the error. It switches to ASCII keeping the text and sends it right away ([Switch to ASCII] — switch only — before starting or without a destination).",
        "- HEX: «01 03 0A», «01030A» and «0x01,0x03,0x0A» are the same 3 bytes. Use two digits per byte.",
        "- ASCII: sent as typed. «\\r» (CR), «\\n» (LF), «\\t», «\\0», «\\\\» and «\\xNN» are supported.",
        "- «Checksum»: CRC16 Modbus, CRC16 CCITT, CRC16 XMODEM, CRC8, LRC, BCC (XOR), SUM8, SUM16, CRC-32 or CRC (custom). ⚙ next to it changes the range, position and byte order.",
        "- «Line ending»: none, CR, LF or CR LF. The order is always «body + checksum + line ending».",
        "- One send = one datagram. The OS refuses datagrams larger than about 64 KB.",
        "- «Send» is disabled, with the reason shown, before starting or when the input is empty. With no destination (e.g. «Last sender» before anything arrived) an error message appears.",
        ...notationLines("en"),
      ],
    },
    {
      title: "Repeat and commands",
      body: [
        "- «Repeat (ms)»: sends the current input every interval (10 ms or more). It turns off when you stop.",
        "- «+ Save to list» adds the current input (mode, checksum, line ending) to «Commands».",
        "- Commands are kept after restarting.",
        ...commandLines("en"),
      ],
    },
    {
      title: "RX checksum",
      body: [
        "- Pick a type to check the trailing checksum of each datagram and mark it «OK» or «FAIL».",
        "- The checksum must be the last bytes of the datagram; a trailing CR/LF makes it «FAIL».",
        "- The file log gets «[OK]» or «[CHECK FAIL]».",
      ],
    },
    {
      title: "Log and event lines (EV)",
      body: [
        "- EV lines are events: start, stop, multicast join, echo on/off, errors.",
        "- «ICMP port unreachable»: the OS reports that nobody listens at the destination. Check the device port and power.",
        "- Above the line limit (default 100,000) old lines are removed from the screen only; file logs are unaffected.",
        ...ioEvLines("en", {}),
        ...logHandlingLines("en", { sendAgain: true, addCommand: true, find: true, checkbox: true }),
      ],
    },
    {
      title: "Find and filter the log",
      body: [
        "The row just below the toolbar finds and filters log lines. Filtering only changes the view — nothing is deleted, and the file log is not affected.",
        "- Find box: 2-digit HEX groups such as «01 03» search bytes; anything else searches text (case-insensitive). Pick «Auto», «HEX» or «Text» next to it when ambiguous (e.g. «0A»). Event lines (EV) are searched by their description in text mode.",
        "- Matches are highlighted; ▲/▼ (or Enter/Shift+Enter) select the previous/next match. «3/17» means the third of 17 matches («–/17» when the selected line is not a match).",
        "- «Matches only» shows only matching lines. «FAIL only» shows only lines whose RX checksum failed. The direction box: «All», RX, TX, EV.",
        "- While filtering, «120 of 5,000 lines» appears on the right; ✕ turns everything off. New lines keep arriving and appear when they match.",
        "- «CHECK FAIL n» in the toolbar counts lines with a failed checksum since the last «Clear» (shown only when there are any). Click it to toggle «FAIL only».",
        "- Keys: Ctrl+F focuses the find box, Enter next, Shift+Enter previous, Esc clears the text (press again to clear all filters).",
      ],
    },
    {
      title: "Saving and detail",
      body: [
        "- «Save view»: saves the lines on screen to a text file in the current «View» (HEX, ASCII, or «Both» as «HEX | ASCII»). With a filter on, only the visible lines are saved. The first line (starting with #) records the view, filter and line count. Times follow «Log timestamp» in Settings; lines with a failed checksum end with «[CHECK FAIL]». (The line format of «Log to file» follows «File log format» in Settings regardless of the view — HEX by default.)",
        "- «Log to file»: writes every line from now on to a file, with the settings on the first line. «Stop logging» ends it. Available only while running.",
        "- Click a log line to see its peer, length, HEX and ASCII in «Detail».",
        "- (from 0.3.0) «Copy» next to the «Detail» title copies what the detail pane shows (peer, length, HEX, ASCII) to the clipboard.",
        "- (from 0.3.0) The default file names for «Save view» and «Log to file» include the bind address, port and time (e.g. portdock-udp-0.0.0.0-5000-20261026-153012.txt).",
      ],
    },
    {
      title: "Settings (⚙)",
      body: [
        "- Language, theme, font size, timestamp format, line limit, initial auto-scroll.",
        "- «Start file log automatically»: with an auto-log folder, each start writes «portdock-udp-date-time.log».",
        "- «Ask before closing while connected or logging».",
        "- «Export settings» / «Import settings» move display settings and commands as JSON. «Reset to defaults» resets display settings only.",
        ...settingsLines("en", { run: true }),
        "- (from 0.3.0) Command line «--auto»: at launch, start right away with the last settings that started successfully (local side, destination, etc.). Nothing happens if there are none. An automatic start leaves an event line (EV) in the log, plus a note when auto-reply is on.",
      ],
    },
    {
      title: "Shortcuts and tips",
      body: [
        ...shortcutLines("en", { saveView: true, repeat: true, find: true, startStop: true }),
        ...ioKeyLines("en"),
        "- Enter in the input: send.",
        "- Hover over a field to see a tooltip.",
        "- Not sure where the device sends? Start on the right listen port and watch «Senders».",
      ],
    },
    {
      title: "Troubleshooting",
      body: [
        "- «Address in use» at start: another program uses the port. Pick another port or close that program.",
        "- Nothing arrives: check the device's destination IP/port, the Windows Firewall prompt, and that both are on the same subnet.",
        "- Error when sending a broadcast: enable «Allow broadcast» and restart.",
        "- No multicast: check the group address and «Multicast NIC», then press «Rejoin».",
        "- The program does not open: Microsoft Edge WebView2 is required (included in Windows 11).",
      ],
    },
  ],
};


/** UDP 만 — 이 PC 주소·멀티캐스트 랜카드·TTL(10/18) */
const UDP_EXTRA: Record<"ko" | "en", HelpSection[]> = {
  ko: [
    {
      title: "이 PC 주소·멀티캐스트 랜카드·TTL",
      body: [
        "- «묶을 주소» 칸을 누르면 이 PC 의 랜카드 주소와 0.0.0.0(모든 랜카드)을 고를 수 있습니다. 왼쪽 «이 PC 주소» 에서 눌러도 됩니다(↻ 다시 읽기). 이 PC 에 없는 주소면 시작 전에 알려 줍니다.",
        "- 멀티캐스트 그룹을 넣거나 «보낼 곳» 이 멀티캐스트 주소(224~239.x.x.x)면 아래 칸이 나옵니다.",
        "- «멀티캐스트 랜카드»: 그룹 가입과 멀티캐스트 보내기에 쓸 랜카드(목록에서 고름). 0.0.0.0 이면 윈도우가 고릅니다 — 랜카드가 여러 개(사내망 + 장비망)면 꼭 장비 쪽을 고르세요.",
        "- «멀티캐스트 TTL»(1~255, 기본 1): 멀티캐스트가 지나갈 수 있는 라우터 수. 1 이면 같은 망 안에서만.",
        "- «보낸 멀티캐스트를 이 PC 도 받기»(기본 켬): 끄면 이 PC 에서 같은 그룹에 가입한 프로그램(이 창 포함)이 우리가 보낸 것을 받지 않습니다.",
        "- 시작하면 사건 줄 «BIND … multicast 239.0.0.1 if 192.168.0.10 ttl 4 noloop» 처럼 실제 설정이 남습니다. «포트가 이미 사용 중» 이면 그 포트를 쥔 프로그램·PID 를 함께 보여 줍니다.",
      ],
    },
  ],
  en: [
    {
      title: "This PC's addresses, multicast NIC, TTL",
      body: [
        "- Click «Bind address» to pick one of this PC's adapter addresses or 0.0.0.0 (all adapters), or click one under «This PC» on the left (↻ reloads). An address that is not on this PC is flagged before you start.",
        "- When a multicast group is set or «Destination (default)» is a multicast address (224–239.x.x.x), more fields appear.",
        "- «Multicast NIC»: the adapter used to join the group and to send multicast (pick from the list). 0.0.0.0 lets Windows choose — with several adapters (office + machine network) pick the machine side.",
        "- «Multicast TTL» (1–255, default 1): how many routers multicast may cross. 1 = this network only.",
        "- «Receive our own multicast on this PC» (on by default): when off, programs on this PC that joined the group (this window included) do not receive what we send.",
        "- On start the event line shows the real setup, e.g. «BIND … multicast 239.0.0.1 if 192.168.0.10 ttl 4 noloop». If the port is already in use, the program and PID holding it are shown.",
      ],
    },
  ],
};

// Serial·TCP·UDP 공통 기능 + 이 PC 주소·멀티캐스트 + 자동응답 — «문제 해결» 앞에
for (const lang of ["ko", "en"] as const) help[lang].splice(help[lang].length - 1, 0, ...ioSections(lang, { fileSend: false }), ...UDP_EXTRA[lang], ...ioAutoReplySections(lang));
