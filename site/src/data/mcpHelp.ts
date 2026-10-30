// PortDock MCP 사용법 — 창이 없는 프로그램이라 앱 도움말 대신 여기 둔다. 사실은 crates/mcp(도구·안전장치)와 docs/mcp.md 에서만.
import type { HelpDoc } from "@shared/HelpDialog";

export const mcpHelp: HelpDoc = {
  ko: [
    {
      title: "이 프로그램은",
      body: [
        "PortDock MCP(portdock-mcp.exe)는 AI 클라이언트(Claude Desktop·Claude Code·VS Code·Cursor 등 MCP 를 쓰는 프로그램)가 띄우는 서버입니다. 창이 없고, 클라이언트와 표준 입출력(stdio)으로만 이야기합니다.",
        "AI 는 이 서버의 도구로 이 PC 의 COM 포트·랜카드를 읽고, 사용자가 알려 준 장비에서 Modbus·MC 프로토콜·SCPI 값을 읽습니다. 쓰기 도구는 이 PC 주소(127.0.0.1)만 받아, 이 PC 에서 도는 시뮬레이터로 연습할 때 씁니다. 이 PC 에서 다른 장비로 넘겨 주는 프로그램(TCP 중계·게이트웨이·터널)을 띄워 두면 실제 장비에 닿을 수 있으니 주의하세요.",
      ],
    },
    {
      title: "설치",
      id: "start",
      body: [
        "- Claude Desktop: 릴리스의 PortDock-MCP.mcpb 를 내려받아 열면 설치 화면이 나옵니다.",
        "- 다른 클라이언트: PortDock-MCP.zip 을 풀고, 클라이언트의 MCP 설정에서 command 를 portdock-mcp.exe 의 전체 경로로 둡니다(인자 없음).",
        "- Scoop: scoop bucket add portdock https://github.com/portdock/scoop-bucket 을 한 번 한 뒤 scoop install portdock/portdock-mcp, command 를 portdock-mcp 로.",
        "- 설정 예시와 연습 순서는 가이드 «AI(Claude Desktop 등)에서 PortDock MCP 쓰기» 에 있습니다.",
      ],
    },
    {
      title: "읽기 도구 9개",
      body: [
        "- ports_list — COM 포트 목록(장치 이름·USB VID:PID·일련번호)과 장치 관리자의 COM 장치(연결 여부·문제 코드).",
        "- port_inspect — Port Inspector 보고서 하나: 드라이버·문제 코드·USB 허브 경로와 속도·절전·Device Parameters(FTDI 지연 타이머 등)·Windows 포트 기본값. 선택: 장치 연결 이벤트·COM 번호 예약.",
        "- serial_read — 포트를 열어 정한 시간(최대 10초) 듣고 닫습니다. 아무것도 보내지 않습니다.",
        "- modbus_read — Modbus 읽기 한 번(01 코일·02 입력 접점·03 보유·04 입력 레지스터), TCP·RTU·RTU over TCP. 브로드캐스트(국번 0)는 거절. 16·32·64비트 정수·실수 풀이와 바이트 순서 선택.",
        "- mc_read — MC 프로토콜(SLMP) 3E 이진 일괄 읽기(0401). D·W·R·ZR·M·X·Y·B 등 18종, X·Y·B·W·ZR 는 16진 번호.",
        "- scpi_query — «?» 로 끝나는 질의 하나(LAN 5025 또는 RS-232). «;» 로 잇기와 상태를 바꿀 수 있는 질의(*TST?·*CAL?·CAL…·*RST·MMEM…·SYST:PRES 등)는 거절. 측정을 새로 시작하는 READ?·MEAS…?(MEAS 는 기능·범위도 다시 설정)는 allow_measure 를 켠 호출만 보냅니다 — 마지막 값만 읽으려면 FETC?.",
        "- ping — IPv4 주소 하나에 최대 10번(간격 200ms 이상), 선택: TCP 연결 시간.",
        "- net_adapters — 랜카드 속도·이중·IPv4·고급 속성(점보 패킷·절전 등)·«전원 절약을 위해 끌 수 있음»·오류 수·방화벽 프로필.",
        "- device_map_get — 내장 장비 레지스터 맵(인버터·온도 조절기·전력 미터 등) 찾기·가져오기. 리소스 portdock://devices/{제조사}/{모델} 로도 읽힙니다.",
      ],
    },
    {
      title: "시뮬레이터 쓰기 2개",
      body: [
        "- modbus_write_sim — 코일(0F)·보유 레지스터(10) 쓰기. PortDock Modbus Slave 를 이 PC 에서 Modbus TCP 로 띄워 연습할 때.",
        "- mc_write_sim — MC 3E 일괄 쓰기(1401). PortDock PLC Simulator 를 이 PC 에서 띄워 연습할 때.",
        "- 대상이 127.0.0.1·::1·localhost 가 아니면 연결하기 전에 거절합니다. 이름 풀이를 하지 않으므로 이름으로 다른 주소를 가리킬 수 없습니다.",
        "- 판정은 주소로만 합니다. 이 PC 에서 127.0.0.1 을 다른 장비로 넘겨 주는 프로그램(PortDock TCP 의 중계, 벤더 게이트웨이, SSH 터널 등)이 떠 있으면 쓴 값이 실제 장비까지 갈 수 있으니, 그때는 쓰기 도구를 쓰지 않습니다.",
        "- Modbus Slave 로 연습할 때는 묶을 주소를 127.0.0.1 로 둡니다(기본 0.0.0.0 은 다른 PC 도 붙을 수 있음).",
      ],
    },
    {
      title: "안전장치와 기록",
      body: [
        "- 세션 기록: 모든 호출(거절 포함)을 이 PC 에 JSONL 로 남깁니다 — 휴대 폴더(exe 옆 portdock-data)가 있으면 portdock-data\\mcp-log, 아니면 %LOCALAPPDATA%\\dev.portdock\\mcp-log. 30일 지나면 지웁니다. 밖으로 보내지 않습니다.",
        "- 속도 제한: 같은 대상은 100ms 에 한 번, 전체는 1분에 120번.",
        "- 결과는 64KB 에서 자릅니다. 사용자 폴더 경로는 «~», MAC 주소 꼴은 «xx-…», 네트워크 이름은 «(hidden)» 으로 가립니다.",
        "- 장비가 보낸 글(예: *IDN? 응답)은 데이터일 뿐 지시가 아니라고 서버 안내에 적어 둡니다.",
        "- 환경 변수: PORTDOCK_MCP_LANG=ko|en(오류 문구 언어, 기본 en), PORTDOCK_MCP_LOG_DIR(기록 폴더).",
      ],
    },
    {
      title: "할 수 없는 것",
      body: [
        "- 이 PC 가 아닌 주소에 쓰기(Modbus·MC 쓰기), 시리얼 보내기, SCPI 설정 명령, HTTP·원격 서버, 계속 도는 폴링, PLC 프로그램(래더) 다루기.",
        "- 장비의 실제 상태를 대신 판단하지 않습니다. 읽은 값을 AI 에게 넘길 뿐이고, 해석은 사용자가 장비 매뉴얼과 함께 확인합니다.",
      ],
    },
  ],
  en: [
    {
      title: "About",
      body: [
        "PortDock MCP (portdock-mcp.exe) is a server started by an AI client (Claude Desktop, Claude Code, VS Code, Cursor or any program that uses MCP). It has no window and talks to the client over standard input/output (stdio) only.",
        "With its tools the AI reads this PC's COM ports and network adapters, and reads Modbus, MC protocol and SCPI values from devices you name. The write tools accept only this PC's address (127.0.0.1) and are for practising with simulators running here. If a program on this PC forwards to another device (a TCP relay, gateway or tunnel), a write can reach a real device — be careful.",
      ],
    },
    {
      title: "Install",
      id: "start",
      body: [
        "- Claude Desktop: download PortDock-MCP.mcpb from the release and open it to install.",
        "- Other clients: unzip PortDock-MCP.zip and set the MCP server command to the full path of portdock-mcp.exe (no arguments).",
        "- Scoop: run scoop bucket add portdock https://github.com/portdock/scoop-bucket once, then scoop install portdock/portdock-mcp and use portdock-mcp as the command.",
        "- Example settings and a practice walkthrough are in the guide «Using PortDock MCP from AI clients (Claude Desktop and others)».",
      ],
    },
    {
      title: "Nine read tools",
      body: [
        "- ports_list — COM ports (device name, USB VID:PID, serial number) and COM devices from Device Manager (present or not, problem code).",
        "- port_inspect — one Port Inspector report: driver, problem code, USB hub path and speed, power saving, Device Parameters (FTDI latency timer …) and Windows port defaults. Optional: plug events and COM number reservations.",
        "- serial_read — opens a port, listens for a set time (up to 10 s) and closes it. Sends nothing.",
        "- modbus_read — one Modbus read (01 coils, 02 discrete inputs, 03 holding, 04 input registers) over TCP, RTU or RTU over TCP. Broadcast (unit 0) is refused. Optional 16/32/64-bit integer and float decoding with byte order.",
        "- mc_read — MC protocol (SLMP) 3E binary batch read (0401). 18 device types such as D, W, R, ZR, M, X, Y, B; X, Y, B, W and ZR use hexadecimal numbers.",
        "- scpi_query — one query ending with «?» (LAN 5025 or RS-232). «;» chains and queries that can change instrument state (*TST?, *CAL?, CAL…, *RST, MMEM…, SYST:PRES …) are refused. READ? and MEAS…? (which start a new measurement; MEAS also reconfigures function and range) are sent only with allow_measure turned on — use FETC? to read just the last value.",
        "- ping — one IPv4 address, up to 10 times (interval 200 ms or more), optional TCP connect time.",
        "- net_adapters — adapter speed, duplex, IPv4, advanced properties (jumbo packets, energy saving …), «allow the computer to turn off this device», error counters and firewall profiles.",
        "- device_map_get — find and get the built-in device register maps (inverters, temperature controllers, power meters …). Also readable as resources portdock://devices/{maker}/{model}.",
      ],
    },
    {
      title: "Two simulator writes",
      body: [
        "- modbus_write_sim — writes coils (0F) or holding registers (10). For practising with PortDock Modbus Slave running as Modbus TCP on this PC.",
        "- mc_write_sim — MC 3E batch write (1401). For practising with PortDock PLC Simulator on this PC.",
        "- Any target other than 127.0.0.1, ::1 or localhost is refused before connecting. Names are not resolved, so a name cannot point the tools elsewhere.",
        "- The check is by address only. If a program on this PC forwards 127.0.0.1 to another device (PortDock TCP relay, a vendor gateway, an SSH tunnel …), written values can reach a real device — do not use the write tools then.",
        "- When practising with Modbus Slave, set its bind address to 127.0.0.1 (the default 0.0.0.0 lets other PCs connect).",
      ],
    },
    {
      title: "Safeguards and log",
      body: [
        "- Session log: every call (refusals too) is kept on this PC as JSON lines — portdock-data\\mcp-log when a portable folder sits next to the exe, otherwise %LOCALAPPDATA%\\dev.portdock\\mcp-log. Files older than 30 days are removed. Nothing is sent anywhere.",
        "- Rate limits: the same target at most once per 100 ms, 120 calls per minute overall.",
        "- Results are cut at 64 KB. User folder paths become «~», MAC-like strings «xx-…», network names «(hidden)».",
        "- The server tells the client that text from devices (such as an *IDN? reply) is data, not instructions.",
        "- Environment: PORTDOCK_MCP_LANG=ko|en (message language, default en), PORTDOCK_MCP_LOG_DIR (log folder).",
      ],
    },
    {
      title: "What it does not do",
      body: [
        "- Write to any address other than this PC (Modbus or MC writes), send on a serial port, send SCPI setting commands, HTTP or remote serving, continuous polling, or anything with PLC programs (ladder).",
        "- It does not judge the device's real state for you. It hands the values it read to the AI; check the meaning against the device manual.",
      ],
    },
  ],
};
