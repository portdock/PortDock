// UDP 도움말 — 화면 ? 버튼·F1 로 연다
import type { HelpDoc } from "@shared/HelpDialog";

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
        "- 왼쪽: 받는 쪽·보낼 곳·옵션, «시작»/«멈춤», 상태, «보내온 상대» 목록, «수신 체크섬 검사», «파일로 계속 저장».",
        "- 가운데 위 도구줄: «보기»(HEX·ASCII·«둘 다»), «자동 스크롤», 누적 바이트 수, «화면 내용 저장», «지우기».",
        "- 가운데 로그: 시각·방향(RX ◀ / TX ▶ / EV)·상대 주소·내용. UDP 는 데이터그램 하나가 곧 한 줄입니다(프레임 구분이 필요 없음).",
        "- 가운데 아래: 보내기 줄(대상, HEX/ASCII, 입력칸, 체크섬, 끝 문자, «보내기»), «보낼 바이트», «반복(ms)», «+ 명령 목록».",
        "- 오른쪽: «명령 목록» 과 «상세»(로그 줄을 누르면 상대 주소·바이트 수·HEX·ASCII).",
        "- 창이 좁으면 오른쪽 칸이 숨고 «☰ 명령 목록» 버튼으로 펼칩니다.",
      ],
    },
    {
      title: "받는 쪽과 보낼 곳",
      body: [
        "- «묶을 주소 (0.0.0.0 = 모든 랜카드)»: 어느 랜카드로 받을지. 특정 랜카드만 쓰려면 그 PC 쪽 IP 를 넣습니다.",
        "- «받을 포트 (0 = 아무 포트)»: 0 이면 운영체제가 빈 포트를 고르고, 고른 포트가 상태줄에 나옵니다.",
        "- «보낼 곳 (기본)»: 보내기 줄에서 «기본 대상» 을 고르면 여기로 보냅니다. 실행 중에도 바꿀 수 있습니다.",
        "- 보내기 줄의 대상: «기본 대상», «마지막으로 보내온 쪽», 또는 «보내온 상대» 목록의 특정 주소.",
        "- «보내온 상대» 옆 «보낼 곳으로» 를 누르면 그 주소를 기본 보낼 곳으로 넣습니다.",
        "- 보내온 상대는 최대 256개까지 기억합니다.",
        "- 받는 쪽 설정은 실행 중에 바꿀 수 없습니다(🔒). 멈추고 바꾸세요.",
      ],
    },
    {
      title: "브로드캐스트·멀티캐스트·에코",
      body: [
        "- «브로드캐스트 허용»: 255.255.255.255 나 192.168.0.255 같은 브로드캐스트 주소로 보내려면 켜고 시작해야 합니다. 꺼진 채로 브로드캐스트 주소를 보낼 곳에 넣으면 경고가 나옵니다.",
        "- «멀티캐스트 그룹»: 224.0.0.0~239.255.255.255 주소를 넣으면 시작할 때 그 그룹에 가입해 받습니다. 범위 밖이면 오류가 나옵니다.",
        "- «멀티캐스트 랜카드»: 가입할 랜카드의 IP. 0.0.0.0 이면 운영체제 기본.",
        "- «다시 가입»: 무선 랜이나 랜카드가 바뀌어 멀티캐스트 수신이 끊기면 눌러 보세요.",
        "- «받은 것 보낸 쪽으로 돌려주기 (에코)»: 받은 데이터그램을 보낸 주소로 그대로 돌려줍니다. 실행 중에도 켜고 끌 수 있습니다.",
        "- 에코는 1초에 200번을 넘으면 저절로 꺼집니다(상대도 에코하면 끝없이 주고받기 때문). «ECHO OFF …» 줄과 오류가 나옵니다. 자기 자신에게 온 것(브로드캐스트 되돌림)은 에코하지 않습니다.",
      ],
    },
    {
      title: "보내기",
      body: [
        "입력칸 왼쪽에서 HEX 또는 ASCII 를 고릅니다. 입력하는 동안 «보낼 바이트» 에 실제로 나갈 바이트가 보이고, 틀리면 이유가 나옵니다.",
        "- HEX: «01 03 0A», «01030A», «0x01,0x03,0x0A» 모두 같은 3바이트입니다. 두 자리씩이어야 합니다.",
        "- ASCII: 글자를 그대로 보냅니다. «\\r»(CR), «\\n»(LF), «\\t», «\\0», «\\\\», «\\xNN» 을 쓸 수 있습니다.",
        "- «체크섬»: CRC16 Modbus, CRC16 CCITT, CRC16 XMODEM, CRC8, LRC, BCC (XOR), SUM8, SUM16 중 하나를 붙입니다.",
        "- «끝 문자»: «없음»·CR·LF·CR LF. 붙는 순서는 «본문 + 체크섬 + 끝 문자» 입니다.",
        "- 한 번 보내기 = 데이터그램 하나입니다. 너무 크면(약 64KB 초과) 운영체제가 거절합니다.",
        "- 시작 전이거나 내용이 비면 «보내기» 가 잠기고 옆에 이유가 나옵니다. 보낼 곳이 없으면(«마지막으로 보내온 쪽» 인데 아직 받은 게 없음 등) 오류 문구가 나옵니다.",
      ],
    },
    {
      title: "반복과 명령 목록",
      body: [
        "- «반복(ms)»: 체크하면 지금 입력을 정한 간격(10ms 이상)으로 계속 보냅니다. 멈추면 저절로 꺼집니다.",
        "- «+ 명령 목록»: 지금 입력(모드·체크섬·끝 문자 포함)을 오른쪽 «명령 목록» 에 추가합니다.",
        "- ▶ 바로 보내기, ✎ «입력칸으로 불러오기», ✕ «삭제»(확인 창이 뜹니다).",
        "- 명령 목록은 껐다 켜도 남아 있습니다.",
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
        "- «자동 스크롤» 을 끄면 새 줄이 와도 화면이 멈춰 있습니다.",
      ],
    },
    {
      title: "저장과 상세",
      body: [
        "- «화면 내용 저장»: 지금 화면에 있는 줄을 텍스트 파일로 저장합니다.",
        "- «파일로 계속 저장»: 파일을 고르면 그때부터 오는 모든 줄을 계속 씁니다. 첫 줄에 설정이 적힙니다. «저장 멈춤» 으로 끝냅니다. 시작한 뒤에만 누를 수 있습니다.",
        "- 로그 줄을 누르면 오른쪽 «상세» 에 그 줄의 상대·바이트 수·HEX·ASCII 가 나옵니다.",
      ],
    },
    {
      title: "설정(⚙)",
      body: [
        "- «언어»·«테마»·«글자 크기»·«로그 시각 표시»·«화면에 남길 줄 수»·«자동 스크롤» 처음 상태.",
        "- «연결하면 자동으로 파일 로그 시작»: «자동 로그 폴더» 를 고르면 시작할 때마다 «portdock-udp-날짜-시각.log» 에 저장합니다.",
        "- «연결·기록 중에 창을 닫으려 하면 묻기».",
        "- «설정 내보내기»·«설정 가져오기»: 화면 설정과 명령 목록을 JSON 파일로 옮깁니다. «기본값으로» 는 화면 설정만 되돌립니다.",
      ],
    },
    {
      title: "단축키·팁",
      body: [
        "- 입력칸에서 Enter: 보내기.",
        "- F1 또는 ?: 이 도움말. Esc 로 닫습니다.",
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
        "- 2. Under «Default destination», enter the device «Host» (IP) and «Port». Leave it empty if you only receive.",
        "- 3. Press «Start». When the status shows «Listening», you are ready.",
        "- 4. Type in the input and press «Send» (or Enter). Received data shows as RX ◀, sent data as TX ▶, with the peer address.",
      ],
    },
    {
      title: "Layout",
      body: [
        "- Left: local and destination settings, options, «Start»/«Stop», status, «Senders», «Verify RX checksum», «Log to file».",
        "- Toolbar: «View» (HEX, ASCII, «Both»), «Auto-scroll», byte counters, «Save view», «Clear».",
        "- Log: time, direction (RX ◀ / TX ▶ / EV), peer address, data. One datagram is one line (no framing needed).",
        "- Bottom: send row (target, HEX/ASCII, input, checksum, suffix, «Send»), «Bytes to send», «Repeat (ms)», «+ Commands».",
        "- Right: «Commands» and «Detail» (click a log line to see peer, length, HEX, ASCII).",
        "- In a narrow window the right pane hides; open it with «☰ Commands».",
      ],
    },
    {
      title: "Local and destination",
      body: [
        "- «Bind address (0.0.0.0 = all NICs)»: which network card receives. Enter this PC's IP of a specific card to limit it.",
        "- «Listen port (0 = any)»: with 0 the OS picks a free port and the status line shows it.",
        "- «Default destination»: used when the send target is «Default destination». You can change it while running.",
        "- Send targets: «Default destination», «Last sender», or a specific address from «Senders».",
        "- «Use as destination» next to a sender copies that address into the default destination.",
        "- Up to 256 senders are remembered.",
        "- Local settings are locked (🔒) while running. Stop to change them.",
      ],
    },
    {
      title: "Broadcast, multicast, echo",
      body: [
        "- «Allow broadcast»: required (before starting) to send to broadcast addresses such as 255.255.255.255 or 192.168.0.255. A warning shows if the destination is a broadcast address while it is off.",
        "- «Multicast group»: an address in 224.0.0.0–239.255.255.255 is joined at start. Out-of-range addresses are rejected.",
        "- «Multicast NIC»: IP of the card to join on. 0.0.0.0 uses the OS default.",
        "- «Rejoin»: try it if multicast reception stops on Wi-Fi or after a network change.",
        "- «Echo back to sender»: returns each datagram to its sender. Can be toggled while running.",
        "- Echo turns itself off above 200 per second (two echoing peers would loop forever); an «ECHO OFF …» line and an error appear. Your own looped-back broadcasts are not echoed.",
      ],
    },
    {
      title: "Sending",
      body: [
        "Choose HEX or ASCII left of the input. «Bytes to send» shows the exact bytes while you type, or why the input is invalid.",
        "- HEX: «01 03 0A», «01030A» and «0x01,0x03,0x0A» are the same 3 bytes. Use two digits per byte.",
        "- ASCII: sent as typed. «\\r» (CR), «\\n» (LF), «\\t», «\\0», «\\\\» and «\\xNN» are supported.",
        "- «Checksum»: CRC16 Modbus, CRC16 CCITT, CRC16 XMODEM, CRC8, LRC, BCC (XOR), SUM8 or SUM16.",
        "- «Suffix»: none, CR, LF or CR LF. The order is always «body + checksum + suffix».",
        "- One send = one datagram. The OS refuses datagrams larger than about 64 KB.",
        "- «Send» is disabled, with the reason shown, before starting or when the input is empty. With no destination (e.g. «Last sender» before anything arrived) an error message appears.",
      ],
    },
    {
      title: "Repeat and commands",
      body: [
        "- «Repeat (ms)»: sends the current input every interval (10 ms or more). It turns off when you stop.",
        "- «+ Commands» adds the current input (mode, checksum, suffix) to «Commands».",
        "- ▶ sends, ✎ «Load into the input», ✕ «Delete» (asks first).",
        "- Commands are kept after restarting.",
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
        "- With «Auto-scroll» off the view stays put when new lines arrive.",
      ],
    },
    {
      title: "Saving and detail",
      body: [
        "- «Save view»: saves the lines on screen to a text file.",
        "- «Log to file»: writes every line from now on to a file, with the settings on the first line. «Stop logging» ends it. Available only while running.",
        "- Click a log line to see its peer, length, HEX and ASCII in «Detail».",
      ],
    },
    {
      title: "Settings (⚙)",
      body: [
        "- Language, theme, font size, timestamp format, line limit, initial auto-scroll.",
        "- «Start file log automatically»: with an auto-log folder, each start writes «portdock-udp-date-time.log».",
        "- «Ask before closing while connected or logging».",
        "- «Export settings» / «Import settings» move display settings and commands as JSON. «Reset to defaults» resets display settings only.",
      ],
    },
    {
      title: "Shortcuts and tips",
      body: [
        "- Enter in the input: send.",
        "- F1 or ?: this help. Esc closes it.",
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
