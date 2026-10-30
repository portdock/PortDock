// 도구 목록 — 첫 화면 카드·도구 페이지·내려받기·문서가 모두 여기서 나온다.
// 기능 문구는 실제 코드에 있는 것만 적는다(apps/*/src, crates/core).
import type { HelpDoc } from "@shared/HelpDialog";
import { help as serialHelp } from "../../../apps/serial/src/help";
import { help as slaveHelp } from "../../../apps/modbus-slave/src/help";
import { help as tcpHelp } from "../../../apps/tcp/src/help";
import { help as udpHelp } from "../../../apps/udp/src/help";
import { help as simHelp } from "../../../apps/simulator/src/help";
import { help as netscanHelp } from "../../../apps/netscan/src/help";
import { help as modbusMasterHelp } from "../../../apps/modbus-master/src/help";
import { help as scpiHelp } from "../../../apps/scpi/src/help";
import { help as plotHelp } from "../../../apps/plot/src/help";
import { help as portInspectorHelp } from "../../../apps/port-inspector/src/help";
import { help as plcSimulatorHelp } from "../../../apps/plc-simulator/src/help";
import { help as hwTesterHelp } from "../../../apps/hw-tester/src/help";

/** 내장 장비 프로필 수 — data/devices 의 JSON 개수(앱 도움말 «내장 장비 N종» 과 같은 데이터). 숫자를 손으로 적지 않는다 */
const DEVICE_COUNT = Object.keys(import.meta.glob("../../../data/devices/*/*.json")).length;

export type Lang = "ko" | "en";
export type L = Record<Lang, string>;

export const REPO = "https://github.com/portdock/PortDock";
export const RELEASES = `${REPO}/releases`;
/** 릴리스 파일 이름은 버전 없이 고정한다 — /releases/latest/download/<이름> 이 늘 최신을 가리키게(릴리스 작업에서 이름을 맞춘다) */
export const latest = (file: string) => `${RELEASES}/latest/download/${file}`;
/** 첫 릴리스를 공개하기 전에는 false — 내려받기 버튼 자리에 «공개 준비 중» 을 보인다(없는 파일로 가는 404 를 막는다). 공개하면 true 로(docs/release.md 7) */
export const RELEASED = true;

export interface Tool {
  id: "serial" | "modbus-slave" | "tcp" | "udp" | "simulator" | "netscan" | "modbus-master" | "scpi" | "plot" | "port-inspector" | "plc-simulator" | "hw-tester";
  name: string;
  /** 파일 이름에 쓰는 이름 — PortDock-Serial */
  file: string;
  tagline: L;
  /** 아직 릴리스에 들어가지 않은 도구 — 소개·문서 쪽은 보이고, 내려받기 자리는 «곧 공개»(없는 파일로 가는 링크를 만들지 않는다). 그 판을 공개하면 지운다 */
  upcoming?: boolean;
  /** 검색 결과용 제목·설명 — 사람들이 치는 검색어(site/SEO.md)를 앞에, 길이는 tools/site-check.mjs 가 검사 */
  seo: { title: L; desc: L };
  summary: L;
  /** 이런 분께 */
  who: L[];
  features: { title: L; body: L }[];
  /** 빠른 시작 */
  steps: L[];
  /** 이럴 때 쓰기 — 실제 쓰는 장면(앱 도움말 help.ts 에 있는 사실만) */
  uses?: { title: L; body: L }[];
  /** 자주 묻는 것 — 앱 도움말의 «문제 해결»·설명에서 옮긴 답 */
  faq?: { q: L; a: L }[];
  /** 비슷한 도구 — 사실만(이름·무료/상용/오픈소스 여부). 남의 제품을 깎지 않고, 검색 제목에는 넣지 않는다(site/SEO.md) */
  similar?: L;
  help: HelpDoc;
}

export const TOOLS: Tool[] = [
  {
    id: "serial",
    name: "PortDock Serial",
    file: "PortDock-Serial",
    tagline: { ko: "시리얼(COM) 송수신·신호선·자동 재연결", en: "Serial (COM) terminal with signal lines and auto-reconnect" },
    seo: {
      title: { ko: "PortDock Serial — 무료 시리얼 통신 프로그램 (RS232·RS485)", en: "PortDock Serial — Free Serial Terminal for Windows (RS-232/485)" },
      desc: {
        ko: "RS232·RS485·USB 시리얼(COM) 장비와 HEX·ASCII 로 주고받는 무료 윈도우 프로그램. USB 재연결, 체크섬 9종, Modbus RTU 풀이, 시각 기록.",
        en: "Free Windows serial terminal for RS-232, RS-485 and USB COM ports: HEX/ASCII, auto-reconnect, nine checksums, Modbus RTU decoding, timestamped logs.",
      },
    },
    summary: {
      ko: "RS-232·RS-485·USB 시리얼 장비와 데이터를 주고받고, 시험 내용을 시각과 함께 남깁니다. USB 변환기를 뽑았다 꽂아도 같은 장치를 찾아 다시 연결합니다.",
      en: "Exchange data with RS-232, RS-485 and USB serial devices and keep a timestamped test log. Unplug and replug a USB adapter and it reconnects to the same device.",
    },
    who: [
      { ko: "새 장비의 통신을 처음 확인하는 현장 엔지니어", en: "Field engineers bringing up a new device" },
      { ko: "UART 프로토콜을 시험하는 펌웨어 개발자", en: "Firmware developers testing a UART protocol" },
      { ko: "Modbus RTU 요청·응답을 눈으로 확인하려는 분", en: "Anyone who needs to read Modbus RTU traffic" },
    ],
    features: [
      { title: { ko: "포트를 알아보기 쉽게", en: "Ports you can recognise" }, body: { ko: "포트 이름과 함께 장치 이름·USB VID:PID·일련번호를 보여 주고, 꽂고 뽑으면 바로 반영합니다.", en: "Shows device name, USB VID:PID and serial number next to each port, and updates on plug/unplug." } },
      { title: { ko: "끊겨도 다시 붙음", en: "Survives disconnects" }, body: { ko: "USB 를 뽑았다 꽂으면 COM 번호가 바뀌어도 같은 장치를 찾아 다시 엽니다. 끊김·재연결은 기록에 남습니다.", en: "Reopens the same device after a replug even if the COM number changed, and logs every drop and reconnect." } },
      { title: { ko: "프레임 구분 4가지", en: "Four framing modes" }, body: { ko: "끊김 시간(조용한 간격)·끝 문자·고정 길이·Modbus RTU 로 한 덩어리를 정확히 끊어 보여 줍니다.", en: "Idle gap, terminator, fixed length or Modbus RTU — so one message is one line." } },
      { title: { ko: "체크섬 9종 + 사용자 정의 CRC", en: "Nine checksums plus custom CRC" }, body: { ko: "CRC16 Modbus·CCITT·XMODEM, CRC8, LRC, BCC, SUM8, SUM16, CRC-32 와 사용자 정의 CRC 를 붙여 보내고, 받은 줄의 체크섬을 검사합니다.", en: "Append CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8, SUM16, CRC-32 or a custom CRC when sending, and verify them on receive." } },
      { title: { ko: "Modbus RTU 풀이", en: "Modbus RTU decoding" }, body: { ko: "요청·응답·예외를 주소·기능·값으로 풀어 보여 줍니다.", en: "Decodes requests, responses and exceptions into address, function and values." } },
      { title: { ko: "신호선", en: "Signal lines" }, body: { ko: "DTR·RTS 를 켜고 끄고, CTS·DSR·RI·CD 변화를 표시등과 기록으로 보여 줍니다.", en: "Toggle DTR/RTS and watch CTS/DSR/RI/CD on indicators and in the log." } },
      { title: { ko: "시험 기록", en: "Test logs" }, body: { ko: "밀리초 시각, 명령 목록, 반복 보내기, 밤새 파일로 계속 저장.", en: "Millisecond timestamps, a command list, repeat sending and continuous logging to file." } },
      { title: { ko: "연결 점검…", en: "Check connection…" }, body: { ko: "고른 포트의 장치·드라이버·문제 코드·FTDI 지연 타이머·USB 절전을 관리자 권한 없이 읽고, 루프백·2선 RS-485 에코 시험을 합니다. 아무것도 바꾸지 않습니다.", en: "Reads the chosen port's device, driver, problem code, FTDI latency timer and USB power saving without administrator rights, and runs a loopback or 2-wire RS-485 echo test. Nothing is changed." } },
    ],
    steps: [
      { ko: "포트·속도·패리티를 고르고 «연결»", en: "Pick the port, baud rate and parity, then «Connect»" },
      { ko: "HEX 또는 ASCII 로 입력, 필요하면 체크섬·줄 끝(CR·LF) 선택", en: "Type HEX or ASCII; add a checksum or line ending if needed" },
      { ko: "«보내기» — 받은 것은 RX ◀, 보낸 것은 TX ▶", en: "«Send» — received lines show as RX ◀, sent as TX ▶" },
    ],
    similar: {
      ko: "비슷한 일을 하는 도구로 Tera Term·PuTTY(오픈소스 터미널) 등이 있습니다. PortDock Serial 은 USB 재연결, 프레임 구분, 체크섬 검사, Modbus RTU 풀이처럼 장비 시험에 쓰는 기능을 한 화면에 모았습니다.",
      en: "Similar tools include Tera Term and PuTTY (open-source terminals). PortDock Serial puts device-testing features — USB reconnect, framing, checksum checks, Modbus RTU decoding — on one screen.",
    },
    help: serialHelp,
  },
  {
    id: "modbus-slave",
    name: "PortDock Modbus Slave",
    file: "PortDock-Modbus-Slave",
    tagline: { ko: "Modbus 장비 흉내(RTU·TCP) — 레지스터 표·장애 주입", en: "Modbus slave simulator (RTU and TCP) with register tables and fault injection" },
    seo: {
      title: { ko: "PortDock Modbus Slave — 무료 Modbus 슬레이브 시뮬레이터", en: "PortDock Modbus Slave — Free Modbus Slave Simulator (RTU/TCP)" },
      desc: {
        ko: "PC 를 Modbus RTU·TCP 슬레이브로 만들어 장비 없이 PLC·HMI·마스터를 시험하는 무료 시뮬레이터. 레지스터 표, 장애 주입, 내장 장비 흉내.",
        en: "Free Modbus RTU/TCP slave simulator for Windows: test a PLC, HMI or master without the device, with register tables, fault injection and device profiles.",
      },
    },
    summary: {
      ko: "PC 를 Modbus 슬레이브(시리얼 RTU, 또는 Modbus TCP·RTU over TCP 서버)로 만들어, 실제 장비 없이 마스터(PLC·HMI·상위 프로그램)를 시험합니다. 일부러 늦게·틀리게 답하게 해서 오류 처리도 확인합니다.",
      en: "Turns the PC into a Modbus slave (serial RTU, or a Modbus TCP or RTU over TCP server) so you can test a master (PLC, HMI, host software) without the real device — including deliberate delays and errors.",
    },
    who: [
      { ko: "Modbus 마스터 프로그램을 만드는 개발자", en: "Developers writing a Modbus master" },
      { ko: "장비가 오기 전에 HMI 화면을 맞추려는 분", en: "Teams preparing HMI screens before the device arrives" },
    ],
    features: [
      { title: { ko: "연결 3가지", en: "Three transports" }, body: { ko: "시리얼(RTU), TCP 서버(Modbus TCP), TCP 서버(RTU over TCP — 시리얼 서버 뒤의 장비 흉내).", en: "Serial (RTU), TCP server (Modbus TCP) and TCP server (RTU over TCP — a device behind a serial device server)." } },
      { title: { ko: "표 4종", en: "Four tables" }, body: { ko: "코일·입력 접점·보유 레지스터·입력 레지스터. 표는 U16·S16·HEX·BIN 으로 보고, 칸마다 U32·S32·F32·F64·문자열 형식과 바이트 순서를 정합니다. 값을 증가·랜덤·사인 등으로 저절로 바꿀 수도 있습니다.", en: "Coils, discrete inputs, holding and input registers. View a table as U16, S16, HEX or BIN, set per-cell U32, S32, F32, F64 or string types with byte order, and let values change by themselves (increment, random, sine …)." } },
      { title: { ko: "국번 여러 개", en: "Several Slave IDs" }, body: { ko: "국번(슬레이브 ID) 1~247 을 여러 개 두고 따로 값을 줍니다.", en: "Run several Slave IDs (1–247), each with its own values." } },
      { title: { ko: "장애 주입", en: "Fault injection" }, body: { ko: "응답 지연, 무응답, CRC 깨기, MBAP 길이 틀리게, 예외 강제를 국번·함수·주소·N번째·확률로 골라 걸어 마스터의 타임아웃·재시도를 시험합니다.", en: "Delay, no response, broken CRC, wrong MBAP length or forced exceptions — targeted by Slave ID, function, address, every Nth request or probability — to test the master's timeouts and retries." } },
      { title: { ko: "쓰기가 보임", en: "See every write" }, body: { ko: "마스터가 쓴 칸이 잠깐 강조되고, 통신 기록과 통계가 남습니다.", en: "Cells written by the master flash, with a traffic log and statistics." } },
      { title: { ko: "장비 흉내·표 저장", en: "Device profiles, saved tables" }, body: { ko: `내장 장비 ${DEVICE_COUNT}종(인버터·온도 조절기·전력 미터 등)의 레지스터 이름·형식을 예시 값과 함께 넣습니다. 표는 CSV 레지스터 맵(Modbus Master 와 같은 모양)이나 JSON 으로 내보내고 가져옵니다.`, en: `Load register names and types of ${DEVICE_COUNT} built-in devices (inverters, temperature controllers, power meters …) with example values. Export and import tables as CSV register maps (same format as Modbus Master) or JSON.` } },
    ],
    steps: [
      { ko: "연결 방식(시리얼·TCP)과 포트·속도(또는 주소·포트)를 고르고, 필요하면 국번을 추가", en: "Pick the transport (serial or TCP) and port and baud rate (or address and port); add Slave IDs if needed" },
      { ko: "표를 고르고 시작 주소·개수를 정한 뒤 값을 입력", en: "Choose a table, set start and count, enter values" },
      { ko: "«연결»(TCP 는 «시작») — 마스터의 요청에 표 값으로 답합니다", en: "«Connect» («Start» for TCP) — master requests are answered from the table" },
    ],
    similar: {
      ko: "비슷한 일을 하는 도구로 상용 Modbus Slave(Witte Software), 오픈소스 ModRSsim2 등이 있습니다. PortDock Modbus Slave 는 무료(GPL-3.0)이고 시간 제한이 없습니다.",
      en: "Similar tools include the commercial Modbus Slave (Witte Software) and the open-source ModRSsim2. PortDock Modbus Slave is free (GPL-3.0) with no time limit.",
    },
    help: slaveHelp,
  },
  {
    id: "tcp",
    name: "PortDock TCP",
    file: "PortDock-TCP",
    tagline: { ko: "TCP 클라이언트·서버·중계 — 여러 접속·에코·자동 재접속", en: "TCP client, server and relay with multiple peers, echo and auto-reconnect" },
    seo: {
      title: { ko: "PortDock TCP — 무료 TCP 소켓 테스트 프로그램 (클라이언트·서버)", en: "PortDock TCP — Free TCP Client, Server and Relay Test Tool" },
      desc: {
        ko: "이더넷 장비와 TCP 로 주고받는 무료 소켓 테스트 프로그램. 클라이언트·서버(여러 접속)·중계 모드, 에코, 자동 재접속, Modbus TCP 프레임 구분.",
        en: "Free TCP socket test tool for Windows: client, multi-peer server and relay (monitor) modes, echo, auto-reconnect and Modbus TCP framing.",
      },
    },
    summary: {
      ko: "이더넷 장비에 접속하거나(클라이언트), 장비가 PC 로 접속하게(서버) 해서 데이터를 주고받습니다. 서버는 여러 접속을 받아 상대별·모두에게 보낼 수 있고, 중계는 두 장비 사이에 끼어 양쪽 통신을 기록합니다.",
      en: "Connect to an Ethernet device (client) or let devices connect to the PC (server). The server accepts several peers and can send to one or all; the relay sits between two devices and logs both directions.",
    },
    who: [
      { ko: "HMI·MES·상위 프로그램 개발자", en: "HMI, MES and host software developers" },
      { ko: "TCP 로 접속하는 장비의 펌웨어 개발자", en: "Firmware developers of TCP devices" },
    ],
    features: [
      { title: { ko: "클라이언트·서버", en: "Client and server" }, body: { ko: "서버는 최대 64개 접속을 받고, 상대별·모두에게 보내고, 하나씩 끊을 수 있습니다.", en: "The server accepts up to 64 peers; send to one or all, and disconnect them individually." } },
      { title: { ko: "중계(모니터)", en: "Relay (monitor)" }, body: { ko: "A(HMI 등) ⇄ 이 PC ⇄ B(PLC 등) 사이에 끼어 양쪽 통신을 그대로 이어 주며 기록합니다.", en: "Sits between A (e.g. an HMI) and B (e.g. a PLC), passes traffic through and logs both directions." } },
      { title: { ko: "자동 재접속", en: "Auto-reconnect" }, body: { ko: "클라이언트는 끊기면 정한 간격으로 다시 접속합니다.", en: "The client reconnects at a set interval when the link drops." } },
      { title: { ko: "에코", en: "Echo" }, body: { ko: "서버는 받은 것을 그대로 돌려주고, 서로 에코하며 1초에 200번을 넘으면 에코를 저절로 끕니다.", en: "The server echoes back what arrives; echo turns itself off above 200 per second to stop echo loops." } },
      { title: { ko: "프레임 구분·체크섬", en: "Framing and checksums" }, body: { ko: "이어 붙어 오는 TCP 데이터를 끊김 시간(조용한 간격)·끝 문자·고정 길이·Modbus TCP(MBAP 길이)로 끊고, 체크섬 9종과 사용자 정의 CRC 로 검사합니다.", en: "Split the TCP stream by idle gap, terminator, fixed length or Modbus TCP (MBAP length), and verify nine checksum types or a custom CRC." } },
    ],
    steps: [
      { ko: "«클라이언트» 또는 «서버» 를 고르고 주소·포트 입력", en: "Choose «Client» or «Server», enter address and port" },
      { ko: "«연결» 또는 «듣기 시작»", en: "«Connect» or «Start listening»" },
      { ko: "보낼 내용을 입력하고 «보내기»", en: "Type and «Send»" },
    ],
    similar: {
      ko: "비슷한 일을 하는 도구로 Hercules SETUP utility(HW-group, 무료) 등이 있습니다.",
      en: "Similar tools include the Hercules SETUP utility (HW-group, freeware).",
    },
    uses: [
      { title: { ko: "장비에 접속해 명령 확인", en: "Talk to a device" }, body: { ko: "장비가 접속을 기다리는 쪽이면 «클라이언트» 로 IP·포트에 접속해 명령을 보내고 답을 HEX·ASCII 로 봅니다. 끊기면 정한 간격으로 다시 접속합니다.", en: "If the device waits for connections, use «Client» with its IP and port, send commands and read replies in HEX or ASCII. The client reconnects at a set interval if the link drops." } },
      { title: { ko: "장비가 PC 로 접속해 올 때", en: "When the device connects to the PC" }, body: { ko: "«서버» 로 포트를 열어 두면 여러 장비(최대 64)가 붙습니다. 상대마다 또는 모두에게 보내고, 하나씩 끊을 수 있습니다.", en: "Open a port with «Server» and up to 64 devices can connect. Send to one or all, and drop them one at a time." } },
      { title: { ko: "HMI ⇄ PLC 사이 엿보기", en: "Watch HMI ⇄ PLC traffic" }, body: { ko: "«중계» 로 이 PC 를 두 장비 사이에 끼우고, HMI 의 접속 대상을 이 PC 로 바꾸면 오가는 것을 방향별로 기록합니다. 넘기는 바이트는 바꾸지 않습니다.", en: "With «Relay» the PC sits between two devices; point the HMI at this PC and both directions are logged. Bytes pass through unchanged." } },
      { title: { ko: "Modbus TCP 장비 한 번 읽기", en: "Read a Modbus TCP device once" }, body: { ko: "포트 502 로 접속하면 «Modbus TCP 로 보기» 알림이 나옵니다. 누르면 요청·응답이 하나씩 끊기고 상세 칸에 풀이가 나옵니다. 계속 읽으려면 Modbus Master 가 편합니다.", en: "Connect to port 502 and a «View as Modbus TCP» bar appears. It splits requests and replies one by one and decodes them in the detail pane. For continuous polling, Modbus Master is easier." } },
    ],
    faq: [
      { q: { ko: "접속이 계속 실패(CONNECT FAIL)합니다", en: "The client keeps failing to connect (CONNECT FAIL)" }, a: { ko: "장비 전원과 랜 케이블, IP·포트, PC 와 장비가 같은 대역(예: 192.168.0.x)인지 확인하세요.", en: "Check the device's power and cable, the IP and port, and that the PC and device are on the same subnet (e.g. 192.168.0.x)." } },
      { q: { ko: "서버를 열었는데 장비가 접속하지 못합니다", en: "I started the server but the device cannot connect" }, a: { ko: "윈도우 방화벽 창에서 허용했는지, 장비가 접속하는 IP 가 이 PC 의 IP 인지 확인하세요. «이미 사용 중» 오류면 다른 프로그램이 그 포트를 쓰고 있습니다.", en: "Make sure you allowed it in the Windows Firewall prompt and that the device connects to this PC's IP. An «already in use» error means another program holds the port." } },
      { q: { ko: "데이터가 합쳐지거나 쪼개져 보입니다", en: "Data looks merged or split" }, a: { ko: "TCP 는 보낸 단위를 지켜 주지 않습니다. «받기 설정» 의 프레임 구분을 끝 문자·고정 길이·Modbus TCP(MBAP 길이)로 바꾸거나 끊김 시간을 조정하세요.", en: "TCP does not keep message boundaries. Switch framing in «Receive settings» to terminator, fixed length or Modbus TCP (MBAP length), or adjust the idle gap." } },
      { q: { ko: "중계로 끼우면 통신 내용이 바뀌나요?", en: "Does the relay change the traffic?" }, a: { ko: "받는 즉시 그대로 넘깁니다. 프레임 구분·체크섬 검사는 기록에만 쓰고, 자동응답·에코는 쓰지 않습니다. 직접 «끼워 넣기» 로 보낸 것만 실제 장비에 들어가므로 조심하세요.", en: "No. Bytes are forwarded as they arrive; framing and checksum checks are only used for the log, and auto-reply and echo are off. Only what you inject yourself reaches the devices, so take care." } },
    ],
    help: tcpHelp,
  },
  {
    id: "udp",
    name: "PortDock UDP",
    file: "PortDock-UDP",
    tagline: { ko: "UDP 송수신 — 브로드캐스트·멀티캐스트·에코", en: "UDP sender/receiver with broadcast, multicast and echo" },
    seo: {
      title: { ko: "PortDock UDP — 무료 UDP 송수신 테스트 프로그램", en: "PortDock UDP — Free UDP Sender/Receiver (Broadcast, Multicast)" },
      desc: {
        ko: "UDP 데이터그램을 받고 보내는 무료 테스트 프로그램. 브로드캐스트·멀티캐스트 장비 시험, 보낸 쪽으로 답하기, 에코, 시각 기록.",
        en: "Free UDP test tool for Windows: receive and send datagrams, broadcast and multicast, reply to the last sender, echo and timestamped logs.",
      },
    },
    summary: {
      ko: "정한 포트로 데이터그램을 받고, 정한 곳이나 마지막으로 보내온 쪽으로 답합니다. 브로드캐스트·멀티캐스트 장비 시험에 맞습니다.",
      en: "Receive datagrams on a port and reply to a fixed destination or the last sender. Built for broadcast and multicast devices.",
    },
    who: [
      { ko: "상태를 UDP 로 뿌리는 장비를 다루는 분", en: "Anyone working with devices that broadcast status over UDP" },
      { ko: "멀티캐스트 수신을 확인하려는 분", en: "Teams verifying multicast reception" },
    ],
    features: [
      { title: { ko: "보내온 상대 목록", en: "Sender list" }, body: { ko: "보내온 주소를 모아 보여 주고, 눌러서 보낼 곳으로 씁니다.", en: "Collects sender addresses; click one to use it as the destination." } },
      { title: { ko: "브로드캐스트·멀티캐스트", en: "Broadcast and multicast" }, body: { ko: "브로드캐스트 허용, 멀티캐스트 그룹 가입·다시 가입, 랜카드 지정.", en: "Allow broadcast, join or rejoin a multicast group, choose the network card." } },
      { title: { ko: "에코", en: "Echo" }, body: { ko: "받은 것을 보낸 쪽으로 돌려주고, 에코 고리는 저절로 막습니다.", en: "Echo back to the sender, with automatic loop protection." } },
    ],
    steps: [
      { ko: "받을 포트와 보낼 곳을 입력", en: "Enter the listen port and destination" },
      { ko: "«시작»", en: "«Start»" },
      { ko: "보낼 내용을 입력하고 «보내기»", en: "Type and «Send»" },
    ],
    uses: [
      { title: { ko: "상태를 뿌리는 장비 받기", en: "Receive status broadcasts" }, body: { ko: "받을 포트만 넣고 «시작» 하면 데이터그램 하나가 한 줄로 찍히고, 보내온 주소가 «보내온 상대» 목록(최대 256)에 모입니다.", en: "Enter the listen port and press «Start». Each datagram is one log line, and senders collect in the «Senders» list (up to 256)." } },
      { title: { ko: "장비 IP·포트를 모를 때", en: "When you don't know the device's address" }, body: { ko: "장비가 보내는 포트로 받기만 시작해 «보내온 상대» 를 보세요. 주소 옆 «보낼 곳으로» 를 누르면 그대로 답할 곳이 됩니다.", en: "Start listening on the port the device sends to and watch «Senders». Click «Use as destination» next to an address to reply there." } },
      { title: { ko: "브로드캐스트 보내기", en: "Send a broadcast" }, body: { ko: "«브로드캐스트 허용» 을 켜고 시작한 뒤 255.255.255.255 나 192.168.0.255 같은 주소로 보냅니다. 꺼진 채로 넣으면 경고가 나옵니다.", en: "Turn on «Allow broadcast» before starting, then send to 255.255.255.255 or an address like 192.168.0.255. You are warned if it is off." } },
      { title: { ko: "멀티캐스트 수신 확인", en: "Check multicast reception" }, body: { ko: "그룹(224~239.x.x.x)을 넣으면 시작할 때 가입합니다. 랜카드가 여럿(사무망 + 장비망)이면 «멀티캐스트 랜카드» 를 장비 쪽으로 고르세요. TTL 기본 1 은 같은 망 안에서만 갑니다.", en: "Enter a group (224–239.x.x.x) and it is joined on start. With several network cards (office and machine networks) pick the machine-side «Multicast NIC». The default TTL of 1 stays on the local network." } },
    ],
    faq: [
      { q: { ko: "아무것도 들어오지 않습니다", en: "Nothing arrives" }, a: { ko: "장비가 보내는 대상 IP·포트, 윈도우 방화벽 허용, PC 와 장비가 같은 대역인지 확인하세요. 멀티캐스트면 그룹 주소와 랜카드를 보고 «다시 가입» 을 눌러 보세요.", en: "Check the IP and port the device sends to, the Windows Firewall permission, and that both are on the same subnet. For multicast, check the group and NIC and try «Rejoin»." } },
      { q: { ko: "시작할 때 «주소 사용 중» 이 나옵니다", en: "Starting fails with «address in use»" }, a: { ko: "다른 프로그램이 그 포트를 쓰고 있습니다. 사건 줄에 그 포트를 쥔 프로그램·PID 가 함께 나옵니다. 다른 포트를 쓰거나 그 프로그램을 닫으세요.", en: "Another program holds the port; the event line names that program and its PID. Use another port or close it." } },
      { q: { ko: "«ICMP port unreachable» 은 무슨 뜻인가요?", en: "What does «ICMP port unreachable» mean?" }, a: { ko: "보낸 곳에서 그 포트를 듣는 프로그램이 없다는 운영체제 알림입니다. 장비의 포트 번호와 전원을 확인하세요.", en: "The OS reports that nothing is listening on that port at the destination. Check the device's port number and power." } },
      { q: { ko: "한 번에 얼마나 보낼 수 있나요?", en: "How much can I send at once?" }, a: { ko: "한 번 보내기가 데이터그램 하나입니다. 약 64KB 를 넘으면 운영체제가 거절합니다.", en: "One send is one datagram. Above roughly 64 KB the OS rejects it." } },
    ],
    help: udpHelp,
  },
  {
    id: "simulator",
    name: "PortDock Simulator",
    file: "PortDock-Simulator",
    tagline: { ko: "규칙대로 답하는 가짜 장비 — 시리얼·TCP·UDP", en: "Rule-based fake device over serial, TCP and UDP" },
    seo: {
      title: { ko: "PortDock Simulator — 무료 장비 시뮬레이터 (시리얼·TCP·UDP)", en: "PortDock Simulator — Free Device Simulator for Serial, TCP, UDP" },
      desc: {
        ko: "«이걸 받으면 이렇게 답한다» 규칙으로 시리얼·TCP·UDP 장비를 흉내 내는 무료 프로그램. 장비 없이 상위 프로그램 개발, 지연·무응답 시험.",
        en: "Free rule-based device simulator: «when this arrives, reply that» over serial, TCP and UDP. Build host software without hardware; test delays and lost replies.",
      },
    },
    summary: {
      ko: "«이걸 받으면 → 이렇게 답한다» 규칙으로 아무 장비나 흉내 냅니다. 장비 없이 상위 프로그램을 개발하고, 지연·무응답(N번째마다·확률)·응답 바꿔 가며 보내기로 예외 처리를 시험합니다.",
      en: "Imitate any device with «when this arrives → reply that» rules. Develop host software without hardware and test error handling with delays, dropped replies (every Nth or by chance) and rotating replies.",
    },
    who: [
      { ko: "장비가 아직 없는 상위 프로그램 개발자", en: "Host software developers without the hardware yet" },
      { ko: "자동 시험 환경을 꾸미려는 분", en: "Teams building automated test rigs" },
    ],
    features: [
      { title: { ko: "와일드카드 규칙", en: "Wildcard rules" }, body: { ko: "HEX 는 ??(아무 1바이트)·**(0개 이상). ASCII 는 기본이 글자 그대로이고, 규칙의 «와일드카드» 를 켜면 ?·* 를 씁니다. «정확히» 또는 «포함» 으로 비교합니다.", en: "HEX ?? (any byte) and ** (zero or more). ASCII matches literally by default; turn on a rule's «Wildcards» for ? and *. Match exact or contains." } },
      { title: { ko: "응답 꾸미기", en: "Shaped replies" }, body: { ko: "체크섬·줄 끝을 자동으로 붙이고, 지연을 줍니다. 규칙별 응답 횟수가 보입니다.", en: "Auto checksum and line ending, reply delay, and per-rule hit counts." } },
      { title: { ko: "장비가 먼저 보내기", en: "Device-initiated messages" }, body: { ko: "하트비트·상태 보고를 정한 간격으로 보냅니다.", en: "Send heartbeats or status reports on an interval." } },
      { title: { ko: "4가지 연결", en: "Four transports" }, body: { ko: "시리얼, TCP 서버, TCP 클라이언트, UDP. 규칙과 연결·프레임 설정을 JSON 파일 하나로 저장·불러오기.", en: "Serial, TCP server, TCP client, UDP. Save and load rules plus connection and framing settings as one JSON file." } },
    ],
    steps: [
      { ko: "연결 방식을 고르고 포트·주소 입력", en: "Pick a transport and enter port or address" },
      { ko: "«+ 규칙 추가» — 받으면 / 응답", en: "«+ Add rule» — When / Reply" },
      { ko: "«시작» — 상위 프로그램에서 요청을 보내 보세요", en: "«Start» — send a request from your host software" },
    ],
    uses: [
      { title: { ko: "장비가 오기 전에 상위 프로그램 만들기", en: "Build host software before the hardware arrives" }, body: { ko: "장비 설명서의 요청·응답을 «받으면 → 응답» 규칙으로 옮겨 두면, HMI·검사 프로그램을 실제 장비 없이 붙여 볼 수 있습니다.", en: "Turn the request/reply pairs from the device manual into «when → reply» rules and connect your HMI or test program without the real device." } },
      { title: { ko: "타임아웃·오류 처리 시험", en: "Test timeouts and error handling" }, body: { ko: "응답 지연(흔들림 포함), N번째마다·확률로 무응답, 응답 여러 개 돌리기로 상위 프로그램이 늦거나 빠진 답을 어떻게 다루는지 봅니다.", en: "Reply delays (with jitter), no reply every Nth time or by chance, and rotating replies show how your host software copes with late or missing answers." } },
      { title: { ko: "계측기 없이 SCPI 연습", en: "Practice SCPI without an instrument" }, body: { ko: "TCP 서버 5025 에 [SCPI *IDN? 응답] 예제를 두고 PortDock SCPI 로 127.0.0.1 에 붙습니다. «+1.2{rand 0..9}E+00» 처럼 받을 때마다 바뀌는 값도 됩니다.", en: "Run a TCP server on 5025 with the [SCPI *IDN? reply] example and connect PortDock SCPI to 127.0.0.1. Replies like «+1.2{rand 0..9}E+00» change on every request." } },
      { title: { ko: "하트비트·상태 보고 흉내", en: "Imitate heartbeats and status reports" }, body: { ko: "«장비가 먼저 보내기» 로 요청 없이 정한 간격마다 보냅니다. {counter}·{rand}·{time} 자리는 보낼 때마다 새로 채웁니다.", en: "«Device-initiated messages» sends without a request at a set interval. {counter}, {rand} and {time} placeholders are filled on every send." } },
    ],
    faq: [
      { q: { ko: "요청이 와도 응답이 나가지 않습니다", en: "Requests arrive but no reply goes out" }, a: { ko: "규칙이 켜져 있는지, 패턴 방식(HEX/ASCII)과 «정확히/포함» 이 맞는지, 위에 «**» 규칙이 있는지 보세요. «안 맞은 요청 기록» 을 켜 두면 «NO MATCH» 줄이 남고, 그 줄을 오른쪽 버튼으로 눌러 바로 규칙을 만들 수 있습니다.", en: "Check that the rule is on, the pattern type (HEX/ASCII) and «exact/contains» match, and that no «**» rule sits above it. With «Log unmatched requests» on, a «NO MATCH» line appears; right-click it to create a rule from it." } },
      { q: { ko: "요청이 둘로 쪼개지거나 합쳐집니다", en: "Requests arrive split or merged" }, a: { ko: "규칙은 프레임 단위로 비교합니다. «프레임 구분»(끊김 시간·끝 문자)과 «끊김 시간(ms)» 을 조정하세요. UDP 는 데이터그램 하나가 한 덩어리라 필요 없습니다.", en: "Rules compare whole frames. Adjust «Framing» (idle gap or terminator) and the gap in ms. UDP needs no framing — one datagram is one frame." } },
      { q: { ko: "같은 PC 의 프로그램과 어떻게 잇나요?", en: "How do I connect a program on the same PC?" }, a: { ko: "TCP 는 서버로 열고 상위 프로그램이 127.0.0.1 로 접속하게 합니다. 시리얼은 가상 COM 쌍(com0com 등)으로 잇습니다.", en: "For TCP, start a server and let the host program connect to 127.0.0.1. For serial, use a virtual COM pair (com0com or similar)." } },
      { q: { ko: "SCPI «*IDN?» 규칙이 엉뚱한 요청에도 답합니다", en: "My «*IDN?» rule answers unrelated requests" }, a: { ko: "ASCII 규칙의 «와일드카드» 가 켜져 있으면 ? 와 * 가 아무 글자로 읽힙니다. SCPI 규칙은 와일드카드를 끈 채로 두세요(새 규칙의 기본).", en: "With «Wildcards» on, ? and * in an ASCII rule match any character. Keep wildcards off for SCPI rules (the default for new rules)." } },
      { q: { ko: "규칙을 다른 PC 로 옮길 수 있나요?", en: "Can I move rules to another PC?" }, a: { ko: "«규칙 묶음 저장» 은 규칙과 연결 방식·포트·주소·프레임 구분·먼저 보내기 내용을 JSON 파일 하나로 저장합니다. 장비·시험마다 만들어 두세요.", en: "«Save rule set» stores the rules plus transport, port, address, framing and device-initiated messages in one JSON file — keep one per device or test." } },
    ],
    help: simHelp,
  },
  {
    id: "netscan",
    name: "PortDock Net Scan",
    file: "PortDock-Net-Scan",
    tagline: { ko: "산업 네트워크 장비 IP 찾기 — 산업 포트 판정·장기 핑", en: "Find devices on industrial networks — industrial ports, long-term ping" },
    seo: {
      title: { ko: "PortDock Net Scan — 무료 산업 네트워크 IP 스캐너 (장비 찾기)", en: "PortDock Net Scan — Free IP Scanner for Industrial Networks" },
      desc: {
        ko: "같은 대역의 PLC·HMI·장비 IP 를 찾는 무료 스캐너. 핑·ARP, MAC 제조사, Modbus 502·MC·XGT·S7 등 산업 포트 판정, 장기 핑 감시.",
        en: "Free IP scanner for industrial networks: ping and ARP sweep, MAC vendor, industrial ports (Modbus 502, MC, XGT, S7 …), long-term ping monitor.",
      },
    },
    summary: {
      ko: "랜카드 대역을 훑어 장비를 찾고, MAC 제조사와 열린 산업 포트(Modbus 502·MC·XGT·S7·EtherNet/IP·OPC UA 등)로 무슨 장비인지 알려 줍니다. 핑을 막아 둔 장비도 같은 대역이면 ARP 로 찾습니다.",
      en: "Sweep a network card's subnet to find devices, and identify them by MAC vendor and open industrial ports (Modbus 502, MC, XGT, S7, EtherNet/IP, OPC UA …). Devices that block ping are still found via ARP on the same subnet.",
    },
    who: [
      { ko: "새 장비의 IP 를 모르는 현장 엔지니어", en: "Field engineers who don't know a new device's IP" },
      { ko: "장비망 상태를 밤새 지켜봐야 하는 분", en: "Anyone who must watch a device network overnight" },
    ],
    features: [
      { title: { ko: "핑 + ARP 훑기", en: "Ping + ARP sweep" }, body: { ko: "같은 대역은 ARP 로 찾아 핑을 막은 장비도 보이고, 응답 시간·이름·«이 PC»·«게이트웨이» 를 표시합니다. 관리자 권한이 필요 없습니다.", en: "ARP on the same subnet finds devices that block ping; shows response time, name, this PC and gateway. No admin rights needed." } },
      { title: { ko: "산업 포트 판정", en: "Industrial port check" }, body: { ko: "502·2004·5000~5010·102·44818·4840 등 기본 포트 목록(직접 바꿀 수 있음, 32개까지)만 확인하고(전체 포트 훑기는 하지 않음), Modbus 장비는 제조사·모델(FC 2B/0E)을 물어봅니다.", en: "Checks only a port list (default 502, 2004, 5000–5010, 102, 44818, 4840 …; editable, up to 32) — no general port scan — and asks Modbus devices for vendor/model (FC 2B/0E)." } },
      { title: { ko: "MAC 제조사", en: "MAC vendor" }, body: { ko: "IEEE 공개 목록을 내장해 인터넷 없이 제조사를 보여 줍니다.", en: "Embedded IEEE list shows the vendor without internet access." } },
      { title: { ko: "장기 핑 감시", en: "Long-term ping monitor" }, body: { ko: "장비 여러 대의 손실·지연·끊긴 시각을 CSV 로 남기고, 끊기면 작업 표시줄을 깜빡입니다.", en: "Logs loss, latency and outages of several devices to CSV and flashes the taskbar on a drop." } },
      { title: { ko: "새로 나타남·사라짐", en: "New / missing" }, body: { ko: "지난 찾기와 비교해 새로 나타난 장비와 사라진 장비를 표시합니다. 결과는 CSV 로 저장합니다.", en: "Compares with the previous scan to mark new and missing devices. Export to CSV." } },
      { title: { ko: "Wake-on-LAN·웹 열기", en: "Wake-on-LAN, open web" }, body: { ko: "장비마다 웹 페이지 열기, IP·MAC 복사, 매직 패킷 보내기.", en: "Per device: open its web page, copy IP/MAC, send a magic packet." } },
    ],
    steps: [
      { ko: "랜카드를 고르면 그 대역이 범위로 들어갑니다(/24 보다 넓으면 그 /24)", en: "Pick a network adapter — its subnet becomes the range (the /24 it is in, if wider)" },
      { ko: "«찾기»(F4)", en: "«Scan» (F4)" },
      { ko: "표의 서비스·제조사 열을 확인하고, 장비를 눌러 웹 열기·IP 복사·WoL·«핑 감시에 추가»", en: "Check the services and vendor columns; click a device to open its web page, copy its IP, wake it or «Add to ping monitor»" },
    ],
    similar: {
      ko: "비슷한 일을 하는 도구로 Angry IP Scanner(오픈소스), Advanced IP Scanner(무료) 등이 있습니다. PortDock Net Scan 은 산업 포트(Modbus 502·MC·XGT·S7 등) 판정과 장기 핑 감시를 더했습니다.",
      en: "Similar tools include Angry IP Scanner (open source) and Advanced IP Scanner (freeware). PortDock Net Scan adds industrial port checks (Modbus 502, MC, XGT, S7 …) and long-term ping monitoring.",
    },
    help: netscanHelp,
  },
  {
    id: "modbus-master",
    name: "PortDock Modbus Master",
    file: "PortDock-Modbus-Master",
    tagline: { ko: "Modbus RTU·TCP 마스터(폴링) — 타입 값·쓰기·국번 찾기", en: "Modbus RTU/TCP master (poll tool) — typed values, writes, Slave ID scan" },
    seo: {
      title: { ko: "PortDock Modbus Master — 무료 Modbus 마스터·테스트 프로그램", en: "PortDock Modbus Master — Free Modbus RTU/TCP Test Tool" },
      desc: {
        ko: "Modbus RTU·TCP 장비를 읽고 쓰는 무료 마스터(폴링) 프로그램. 여러 표, F32·U32·바이트 순서, 40001 표기, 국번 찾기, 통계, CSV 기록.",
        en: "Free Modbus RTU/TCP master (poll tool) for Windows: multiple poll tables, F32/U32 and byte orders, 40001 notation, writes, Slave ID scan, CSV logs.",
      },
    },
    summary: {
      ko: "PLC·HMI 대신 Modbus 장비에 먼저 묻습니다. 여러 표를 국번·함수·주소·주기별로 읽고, F32·U32·문자열과 바이트 순서·40001 표기로 보며, 칸을 두 번 눌러 씁니다. 요청·응답 HEX 풀이와 통계, 값 CSV 기록이 있습니다.",
      en: "Ask Modbus devices for data in place of a PLC or HMI. Poll several tables by Slave ID, function, address and interval, view F32/U32/strings with byte orders and 40001 notation, and double-click a cell to write. Decoded request/response HEX, statistics and CSV value logging included.",
    },
    who: [
      { ko: "새 인버터·계측기의 Modbus 맵을 확인하는 현장 엔지니어", en: "Field engineers checking a new drive's or meter's Modbus map" },
      { ko: "슬레이브 장비 펌웨어를 시험하는 개발자", en: "Developers testing slave device firmware" },
    ],
    features: [
      { title: { ko: "여러 폴링 표", en: "Several poll tables" }, body: { ko: "표마다 국번·함수(01~04)·시작·개수·주기를 따로 두고, 탭에 오류 수가 보입니다. 시리얼 RTU·Modbus TCP·RTU over TCP.", en: "Each table has its own slave ID, function (01–04), start, count and interval, with an error count on its tab. Serial RTU, Modbus TCP and RTU over TCP." } },
      { title: { ko: "타입 값·바이트 순서", en: "Typed values and byte order" }, body: { ko: "U16·S16·U32·S32·F32·F64·문자열을 ABCD·CDAB·BADC·DCBA 로, HEX·BIN·40001 표기까지. Modbus Slave 와 같은 CSV 레지스터 맵을 주고받습니다.", en: "U16 to F64 and strings in ABCD/CDAB/BADC/DCBA, HEX/BIN and 40001 notation. Shares the CSV register map format with Modbus Slave." } },
      { title: { ko: "쓰기 미리보기", en: "Writes with preview" }, body: { ko: "칸을 두 번 눌러 05·06·0F·10 으로 쓰고, 보낼 바이트를 미리 봅니다. 한 칸도 0F·10 으로 보내는 «늘 FC15·16» 선택도 있습니다.", en: "Double-click to write with 05/06/0F/10 and preview the exact bytes. An «always FC15/16» option sends even single values with 0F/10." } },
      { title: { ko: "장비 프로필", en: "Device profiles" }, body: { ko: `내장 장비 ${DEVICE_COUNT}종(인버터·온도 조절기·전력 미터 등)에서 고르면 폴링 표·칸 이름(단위·배율)·형식·국번과 시리얼 기본값을 채웁니다.`, en: `Pick one of ${DEVICE_COUNT} built-in devices (inverters, temperature controllers, power meters …) to add poll tables with names (unit and scale), types, Slave ID and default serial settings.` } },
      { title: { ko: "국번·주소 찾기", en: "Slave ID and address scan" }, body: { ko: "1~247 중 답하는 국번과 읽히는 주소 범위를 찾아 바로 표로 만듭니다.", en: "Find which Slave IDs (1–247) answer and which address ranges are readable, then turn them into tables." } },
      { title: { ko: "타임아웃·재시도·통계", en: "Timeouts, retries, statistics" }, body: { ko: "응답 기다림·재시도·요청 간격을 정하고, 표마다 요청·정상·타임아웃·CRC·예외와 응답 시간을 셉니다. 예외는 한국어로 풀어 줍니다.", en: "Set timeout, retries and delay; count requests, OK, timeouts, CRC errors and exceptions with response times per table. Exceptions are explained." } },
      { title: { ko: "값 기록·추세", en: "Value log and trends" }, body: { ko: "값을 폴링마다 또는 바뀔 때만 CSV 로 남기고, 고른 칸의 변화를 작은 그림으로 봅니다.", en: "Log values to CSV on every poll or on change, and watch chosen cells as small trend lines." } },
    ],
    steps: [
      { ko: "연결 방식·포트(또는 IP)를 장비와 같게", en: "Match the connection and port (or IP) to the device" },
      { ko: "«연결»(F4) 후 국번·함수·시작·개수를 설명서대로", en: "«Connect» (F4), then set Slave ID, function, start and count from the manual" },
      { ko: "칸을 두 번 눌러 쓰기, 오른쪽 버튼으로 이름·형식", en: "Double-click a cell to write; right-click for name and type" },
    ],
    similar: {
      ko: "비슷한 일을 하는 도구로 상용 Modbus Poll(Witte Software), 오픈소스 QModMaster 등이 있습니다. PortDock Modbus Master 는 무료(GPL-3.0)이고 시간 제한이 없습니다.",
      en: "Similar tools include the commercial Modbus Poll (Witte Software) and the open-source QModMaster. PortDock Modbus Master is free (GPL-3.0) with no time limit.",
    },
    help: modbusMasterHelp,
  },
  {
    id: "scpi",
    name: "PortDock SCPI",
    file: "PortDock-SCPI",
    tagline: { ko: "SCPI 계측기 터미널 — LAN 소켓·RS-232, VISA 없이", en: "SCPI instrument terminal — LAN socket and RS-232, no VISA" },
    seo: {
      title: { ko: "PortDock SCPI — 무료 SCPI 계측기 터미널 (VISA 없이)", en: "PortDock SCPI — Free SCPI Terminal (LAN Socket, RS-232, No VISA)" },
      desc: {
        ko: "VISA 설치 없이 LAN 소켓(5025)·RS-232 로 SCPI 계측기에 명령을 보내는 무료 터미널. *IDN?, 오류 큐, 반복 측정, CSV 저장.",
        en: "Free SCPI instrument terminal over LAN socket (5025) or RS-232 without VISA: *IDN?, error queue, *OPC? waits, repeated measurements to CSV.",
      },
    },
    summary: {
      ko: "전원 공급기·멀티미터·오실로스코프 같은 SCPI 계측기에 명령을 보내고 답을 봅니다. VISA 를 설치하지 않고 LAN 소켓(TCP 5025)이나 RS-232 로 붙어, *IDN? 으로 장비를 알아보고 오류 큐를 비우며, 숫자 응답을 반복 측정해 CSV 로 남깁니다.",
      en: "Send commands to SCPI instruments such as power supplies, multimeters and oscilloscopes and read the answers. Connects over a LAN socket (TCP 5025) or RS-232 without installing VISA, identifies the instrument with *IDN?, drains the error queue and logs repeated numeric readings to CSV.",
    },
    who: [
      { ko: "계측 자동화 프로그램을 만들기 전에 명령을 손으로 확인하는 개발자", en: "Developers checking commands by hand before writing test automation" },
      { ko: "VISA 없는 PC 에서 계측기 상태를 빨리 보려는 현장 엔지니어", en: "Field engineers who need a quick look at an instrument on a PC without VISA" },
    ],
    features: [
      { title: { ko: "VISA 없이 연결", en: "No VISA needed" }, body: { ko: "LAN 소켓(보통 5025)과 RS-232(속도·패리티·흐름 제어). 줄 끝 LF·CR LF·CR 을 고릅니다. VXI-11·HiSLIP·USBTMC 는 아직 하지 않습니다.", en: "LAN socket (usually 5025) and RS-232 (baud, parity, flow control) with LF, CR LF or CR line endings. VXI-11, HiSLIP and USBTMC are not supported yet." } },
      { title: { ko: "질의·쓰기·읽기", en: "Query, write, read" }, body: { ko: "? 로 끝나면 질의, 아니면 쓰기. 응답 시간과 시간 초과, 줄 끝 없이 온 답까지 보여 줍니다. 명령 이력·명령 목록·자주 쓰는 명령 자동완성.", en: "Commands ending in ? are queried, others written. Response times, timeouts and replies without a line ending are shown. Command history, command list and completion for common commands." } },
      { title: { ko: "식별·오류 큐·*OPC?", en: "ID, error queue, *OPC?" }, body: { ko: "*IDN? 을 제조사·모델·일련번호·펌웨어로 나누어 보이고, SYST:ERR? 를 0 이 나올 때까지 물어 쌓인 오류를 꺼냅니다. *RST·*CLS·*OPC? 기다림 버튼.", en: "*IDN? split into maker, model, serial and firmware; SYST:ERR? asked until 0 to list every queued error. Buttons for *RST, *CLS and waiting on *OPC?." } },
      { title: { ko: "반복 측정", en: "Repeat measurement" }, body: { ko: "MEAS:VOLT:DC? 같은 질의를 주기·횟수대로 물어 값 표·추세·통계(최소·최대·평균·표준편차)를 보고 CSV 로 저장합니다.", en: "Repeat a query such as MEAS:VOLT:DC? at an interval for a count, with a value table, trend and statistics (min, max, mean, std dev), saved as CSV." } },
      { title: { ko: "블록 데이터", en: "Block data" }, body: { ko: "IEEE 488.2 블록(#NXXXX…)은 길이 머리로 끝을 알아 바이너리 속 LF 에 끊기지 않습니다. HEX 미리보기와 파일 저장(화면 캡처 PNG 등).", en: "IEEE 488.2 blocks (#NXXXX…) are read by their length header, so LF bytes inside binary data do not cut them. HEX preview and save to file (e.g. PNG screenshots)." } },
    ],
    steps: [
      { ko: "LAN 이면 장비 IP·포트 5025, 시리얼이면 포트·속도를 장비와 같게", en: "LAN: instrument IP and port 5025; serial: port and baud as on the instrument" },
      { ko: "«연결»(F4) — *IDN? 으로 장비 이름이 나옵니다", en: "«Connect» (F4) — *IDN? shows the instrument's name" },
      { ko: "명령을 넣고 Enter, 틀린 명령은 «오류 큐 비우기» 로 확인", en: "Type a command and press Enter; check mistakes with «Drain error queue»" },
    ],
    similar: {
      ko: "계측기 제조사의 VISA 기반 도구(NI MAX, Keysight Connection Expert 등)로도 명령을 보낼 수 있습니다. PortDock SCPI 는 VISA 를 설치하지 않은 PC 에서 LAN 소켓·RS-232 로 바로 붙습니다.",
      en: "VISA-based vendor tools (NI MAX, Keysight Connection Expert …) can also send commands. PortDock SCPI connects over a LAN socket or RS-232 on PCs without VISA.",
    },
    uses: [
      { title: { ko: "자동화 코드 쓰기 전에 명령 확인", en: "Check commands before writing automation" }, body: { ko: "명령을 손으로 넣어 응답과 응답 시간을 봅니다. ? 로 끝나면 질의, 아니면 쓰기입니다. 틀린 명령은 «오류 큐 비우기» 로 바로 확인합니다.", en: "Type commands by hand and see the reply and response time. Commands ending in ? are queries, others are writes. Check mistakes at once with «Drain error queue»." } },
      { title: { ko: "VISA 없는 PC 에서 계측기 보기", en: "Reach an instrument on a PC without VISA" }, body: { ko: "LAN 소켓(보통 포트 5025)이나 RS-232 로 바로 붙습니다. *IDN? 으로 제조사·모델·일련번호·펌웨어를 나눠 보여 줍니다.", en: "Connect straight over a LAN socket (usually port 5025) or RS-232. *IDN? is split into maker, model, serial number and firmware." } },
      { title: { ko: "값을 여러 번 재서 CSV 로", en: "Log repeated readings to CSV" }, body: { ko: "«반복 측정» 에서 MEAS:VOLT:DC? 같은 질의를 주기·횟수대로 물어 값 표·추세·통계(최소·최대·평균·표준편차)를 보고 CSV 로 저장합니다.", en: "In «Repeat measurement», ask a query such as MEAS:VOLT:DC? at an interval for a count, see the table, trend and statistics (min, max, mean, std dev) and save as CSV." } },
      { title: { ko: "화면 캡처 같은 블록 데이터 받기", en: "Fetch block data such as screenshots" }, body: { ko: "IEEE 488.2 블록(#N…)은 길이 머리로 끝을 알아 받으므로 바이너리 속 LF 에 끊기지 않습니다. HEX 로 미리 보고 파일(PNG 등)로 저장합니다.", en: "IEEE 488.2 blocks (#N…) are read by their length header, so LF bytes inside binary data do not cut them. Preview in HEX and save to a file (PNG and so on)." } },
    ],
    faq: [
      { q: { ko: "«연결 거부» 가 나옵니다", en: "I get «connection refused»" }, a: { ko: "포트가 다르거나(설명서의 «socket port» 확인 — 5025 가 아닌 장비도 있음) 장비의 소켓 기능이 꺼져 있습니다. 다른 프로그램(VISA 세션)이 이미 붙어 있으면 새 접속을 받지 않는 장비도 있습니다.", en: "The port differs (check the manual's «socket port» — not every instrument uses 5025) or the socket interface is off. Some instruments refuse a new connection while another program (a VISA session) is attached." } },
      { q: { ko: "«응답 없음(시간 초과)» 이 납니다", en: "I get «no response (timeout)»" }, a: { ko: "질의가 아닌 명령을 질의로 보냈거나, 철자가 틀렸거나(오류 큐 확인), 장비가 느린 측정 중입니다. «응답 기다림» 을 늘리거나 *OPC? 로 기다리세요. «응답이 끝나지 않았습니다» 면 줄 끝(LF·CR LF·CR)이 장비와 다릅니다.", en: "A non-query was sent as a query, the command is misspelled (check the error queue) or the instrument is busy measuring. Increase the reply wait or use *OPC?. «Reply not finished» means the line ending (LF, CR LF, CR) differs from the instrument's." } },
      { q: { ko: "-410 Query INTERRUPTED 는 무엇인가요?", en: "What is -410 Query INTERRUPTED?" }, a: { ko: "답을 읽기 전에 다음 명령을 보냈다는 뜻입니다. «쓰기» 로 질의를 보냈다면 «읽기» 로 답을 먼저 받으세요.", en: "The next command was sent before the reply was read. If you sent a query with «Write», fetch the answer with «Read» first." } },
      { q: { ko: "USB(USBTMC)·GPIB·VXI-11·HiSLIP 도 되나요?", en: "Does it support USBTMC, GPIB, VXI-11 or HiSLIP?" }, a: { ko: "아직 아닙니다. VXI-11 은 다음 판에서 할 일이고, HiSLIP·USBTMC·GPIB 는 VISA·드라이버가 필요해 하지 않습니다. 대부분의 LAN 계측기는 소켓(5025)도 켜져 있고, USB 만 있는 장비는 «USB 가상 COM» 설정이 있으면 시리얼로 쓸 수 있습니다.", en: "Not yet. VXI-11 is planned; HiSLIP, USBTMC and GPIB need VISA or drivers and are out of scope. Most LAN instruments also offer a socket (5025), and USB-only instruments with a «USB virtual COM» setting work over serial." } },
      { q: { ko: "계측기 없이 먼저 해 볼 수 있나요?", en: "Can I try it without an instrument?" }, a: { ko: "PortDock Simulator 를 TCP 서버 5025·끝 문자 LF 로 두고 [SCPI *IDN? 응답] 예제를 넣은 뒤, 127.0.0.1:5025 로 연결하면 됩니다.", en: "Run PortDock Simulator as a TCP server on 5025 with LF framing and the [SCPI *IDN? reply] example, then connect to 127.0.0.1:5025." } },
    ],
    help: scpiHelp,
  },
  {
    id: "plot",
    name: "PortDock Plot",
    file: "PortDock-Plot",
    tagline: { ko: "시리얼·TCP·UDP 숫자를 실시간 그래프로", en: "Live graphs of numbers from serial, TCP and UDP" },
    seo: {
      title: { ko: "PortDock Plot — 무료 시리얼 플로터 (실시간 그래프·CSV)", en: "PortDock Plot — Free Serial Plotter for Live Graphs and CSV" },
      desc: {
        ko: "시리얼·TCP·UDP 로 오는 숫자를 실시간 그래프로 보는 무료 플로터. Arduino 식 이름:값, 바이너리 프레임, 채널 32개, CSV 기록.",
        en: "Free live plotter for numbers from serial, TCP or UDP: Arduino-style name:value, binary frames, up to 32 channels, cursors and CSV recording.",
      },
    },
    summary: {
      ko: "Arduino·센서·장비가 보내는 숫자를 바로 그래프로 봅니다. 쉼표·빈칸·탭·세미콜론 글자 줄, Arduino 식 «이름:값», 바이너리 프레임을 읽고, 채널마다 색·축을 정해 멈추고 확대하며 두 점의 차이를 잽니다. 받는 동안 CSV 로 기록합니다.",
      en: "See the numbers an Arduino, sensor or device sends as a live graph. Reads comma/space/tab/semicolon text, Arduino-style «name:value» and binary frames, with per-channel colors and axes, pause, zoom and two-point deltas, and records CSV while receiving.",
    },
    who: [
      { ko: "센서·보드 값을 눈으로 확인하며 펌웨어를 맞추는 개발자", en: "Developers tuning firmware while watching sensor or board values" },
      { ko: "장비 출력을 오래 기록해 이상 구간을 찾는 현장 엔지니어", en: "Field engineers logging device output for hours to find anomalies" },
    ],
    features: [
      { title: { ko: "시리얼·TCP·UDP", en: "Serial, TCP, UDP" }, body: { ko: "COM 포트(속도·데이터 비트·패리티·정지 비트, 기본 8N1·DTR), 장비에 접속하는 TCP 클라이언트, UDP 받기(멀티캐스트 포함). 뽑혔다 꽂히면 다시 연결합니다.", en: "COM ports (baud, data bits, parity, stop bits — 8N1 by default — and DTR), a TCP client that connects to the device, and UDP receive (multicast too). Reconnects after unplug/replug." } },
      { title: { ko: "글자 줄·이름:값·바이너리", en: "Text, name:value, binary" }, body: { ko: "쉼표·빈칸·탭·세미콜론 자동, temp:23.1 hum:40 같은 이름 붙은 값, 첫 줄 머리글, 시작 바이트·u8~f64·엔디언·체크섬 프레임. 해석 실패 줄은 이유와 함께 빨갛게.", en: "Comma, space, tab or semicolon detected automatically, named values like temp:23.1 hum:40, header lines, and frames with start bytes, u8–f64, endianness and checksum. Failed lines show in red with the reason." } },
      { title: { ko: "보고 재기", en: "View and measure" }, body: { ko: "채널 32개·왼쪽/오른쪽 축, 최근 N점·N초, Y 자동·고정, 멈춤(받기는 계속), 커서 값, 측정점 두 개의 Δt·Δ값, 휠 확대·끌어 옮기기.", en: "Up to 32 channels on left/right axes, last N points or seconds, auto/fixed Y, pause (keeps receiving), cursor readout, Δt and Δvalue between two markers, wheel zoom and drag to pan." } },
      { title: { ko: "버티는 그리기", en: "Keeps up" }, body: { ko: "숫자 해석은 Rust 에서, 그리기는 화면 한 번에 한 번(canvas)·픽셀마다 최소·최대만 — 초당 수천 줄이 와도 뾰족한 값을 잃지 않습니다.", en: "Parsing runs in Rust; drawing happens once per frame on a canvas with min/max per pixel — thousands of rows per second without losing spikes." } },
      { title: { ko: "기록·저장", en: "Record and save" }, body: { ko: "받는 동안 모든 값을 CSV 로(엑셀 한글 그대로), 지금 보이는 범위 CSV, 그래프 PNG. 표에 최근 값과 보이는 범위의 최소·최대·평균.", en: "Every value to CSV while receiving (Excel-friendly), the visible range as CSV, the graph as PNG. Table of the last value plus min, max and mean over the visible range." } },
    ],
    steps: [
      { ko: "장비가 한 줄에 숫자를 보내게(예: 23.1,40 또는 temp:23.1 hum:40)", en: "Have the device print numbers per line (e.g. 23.1,40 or temp:23.1 hum:40)" },
      { ko: "받는 곳(시리얼 포트·속도, TCP, UDP)을 고르고 «받기 시작»(F4)", en: "Pick the source (serial port and baud, TCP, UDP) and «Start» (F4)" },
      { ko: "그래프를 눌러 측정점, «● CSV 기록» 으로 남기기", en: "Click the graph to measure; «● Record CSV» to keep it" },
    ],
    similar: {
      ko: "비슷한 일을 하는 도구로 Arduino IDE 의 시리얼 플로터, 오픈소스 SerialPlot 등이 있습니다. PortDock Plot 은 TCP·UDP 입력, 바이너리 프레임, 받는 동안 CSV 기록을 함께 합니다.",
      en: "Similar tools include the Arduino IDE Serial Plotter and the open-source SerialPlot. PortDock Plot also takes TCP and UDP input, binary frames, and records CSV while receiving.",
    },
    help: plotHelp,
  },
  {
    id: "port-inspector",
    name: "PortDock Port Inspector",
    file: "PortDock-Port-Inspector",
    tagline: { ko: "COM 포트·랜카드·장비 PC 설정·무선(Wi-Fi·블루투스) 읽기 전용 점검", en: "Read-only inspector for COM ports, network adapters, PC settings and wireless" },
    seo: {
      title: { ko: "PortDock Port Inspector — 무료 COM 포트 점검 (USB 시리얼)", en: "PortDock Port Inspector — Free COM Port Inspector (USB Serial)" },
      desc: {
        ko: "USB 시리얼 드라이버·장치 관리자 문제 코드·FTDI 지연·유령 COM 번호를 관리자 권한 없이 읽는 무료 윈도우 도구. 루프백 연결 시험, 설정은 바꾸지 않음.",
        en: "Free Windows COM port inspector: USB serial driver, Device Manager problem code, FTDI latency, ghost COM numbers. Read-only, no admin rights, loopback test.",
      },
    },
    summary: {
      ko: "COM 포트 하나를 고르면 장치 관리자·이벤트 뷰어·레지스트리를 따로 뒤져야 보이는 것을 한 화면에 모읍니다: 드라이버, 문제 코드와 뜻, USB 칩, FTDI 지연 타이머 같은 장치 설정, USB 절전, 최근 연결 기록, COM 번호 예약. 관리자 권한 없이 읽기만 하고, TX 와 RX 를 이어 두면 속도마다 왕복 시간을 잽니다. 탭을 바꾸면 이 PC 의 랜카드, 장비 PC 로서의 Windows 설정, Wi-Fi·블루투스도 같은 방식으로 읽습니다.",
      en: "Pick a COM port and see in one place what you would otherwise dig out of Device Manager, Event Viewer and the registry: the driver, problem code and its meaning, USB chip, device settings such as the FTDI latency timer, USB power saving, recent plug history and COM number reservations. It only reads, without admin rights, and with TX tied to RX it measures the round trip at each baud rate. Other tabs read this PC's network adapters, its Windows settings as an equipment PC, and Wi-Fi and Bluetooth the same way.",
    },
    who: [
      { ko: "USB-시리얼 변환기가 안 잡히거나 가끔 끊기는 현장 엔지니어", en: "Field engineers whose USB-serial adapter is not detected or drops now and then" },
      { ko: "Modbus RTU 응답이 늦게 보이는 까닭을 찾는 분(FTDI 지연 타이머)", en: "Anyone looking for why Modbus RTU replies seem late (FTDI latency timer)" },
      { ko: "문의·이슈에 PC 쪽 포트 정보를 붙여야 하는 분", en: "Anyone who needs to attach PC-side port details to a support request or issue" },
    ],
    features: [
      { title: { ko: "장치·드라이버·문제 코드", en: "Device, driver, problem code" }, body: { ko: "이름·COM 번호·위치·인스턴스 ID·제조사, 드라이버 제공자·버전·날짜·INF·서비스, 상태와 장치 관리자 문제 코드의 뜻·해 볼 것, 마지막 연결·분리 시각.", en: "Name, COM number, location, instance ID and manufacturer; driver provider, version, date, INF and service; status and the Device Manager problem code with its meaning and what to try; last plug-in and removal." } },
      { title: { ko: "USB 칩·장치 설정", en: "USB chip and device settings" }, body: { ko: "VID/PID 표로 본 칩 이름(FTDI·Prolific PL2303·WCH CH34x·Silicon Labs CP210x 등), Windows 포트 기본값, 드라이버가 둔 Device Parameters — FTDI 지연 타이머(LatencyTimer)는 뜻을 풀어 줍니다.", en: "Chip name from a VID/PID table (FTDI, Prolific PL2303, WCH CH34x, Silicon Labs CP210x …), the Windows port default and the driver's Device Parameters, with the FTDI latency timer (LatencyTimer) explained." } },
      { title: { ko: "절전·연결 기록", en: "Power saving and history" }, body: { ko: "전원 옵션의 USB 선택적 절전, 이 장치와 위 USB 장치의 «컴퓨터가 이 장치를 끌 수 있음», 이벤트 로그의 연결·드라이버 기록(7·30·90일).", en: "USB selective suspend from the power options, «Allow the computer to turn off this device» for the device and the USB devices above it, and plug and driver events from the event logs (7, 30 or 90 days)." } },
      { title: { ko: "COM 번호 예약", en: "COM number reservations" }, body: { ko: "Windows 가 예약해 둔 번호(ComDB), 지금 없는 장치가 쥔 번호, 주인 없는 번호, 여러 장치가 쥔 번호 — 새 변환기가 COM15 처럼 높은 번호를 받는 까닭을 봅니다.", en: "Numbers Windows keeps reserved (ComDB), numbers held by devices not connected now, orphan numbers and numbers held by more than one device — why a new adapter ends up on COM15." } },
      { title: { ko: "연결 시험", en: "Connection test" }, body: { ko: "TX–RX 루프백으로 속도마다 같음·잃음·바뀐 바이트와 1바이트 왕복 ms(중앙값·최대), 드라이버 오류 표시(ClearCommError). 2선 RS-485 변환기의 에코 여부도 알려 줍니다.", en: "A TX–RX loopback per baud rate: bytes same, lost and changed, 1-byte round trip in ms (median and max) and driver error flags (ClearCommError). It also tells whether a 2-wire RS-485 adapter echoes." } },
      { title: { ko: "이 PC 랜카드", en: "Network adapters on this PC" }, body: { ko: "«랜카드 읽기» 로 랜카드마다 연결·링크 속도·이중·IPv4·게이트웨이와 장치 관리자 «고급» 값(점보 프레임·수신 버퍼·인터럽트 완화·EEE 등)·절전·받기 오류·네트워크 프로필과 방화벽 켜짐을 읽습니다. «GigE 카메라» 용도면 카메라 제조사 문서의 값을 출처와 나란히 보입니다.", en: "«Read adapters» shows, for each adapter, link, speed, duplex, IPv4 and gateway plus Device Manager «Advanced» values (jumbo frames, receive buffers, interrupt moderation, EEE …), power saving, receive errors, network profile and whether its firewall is on. The «GigE camera» purpose shows camera makers' published values with sources alongside." } },
      { title: { ko: "이 PC — 장비 PC 설정", en: "This PC — equipment PC settings" }, body: { ko: "«이 PC 설정 읽기» 로 빠른 시작·절전·USB 선택적 절전·업데이트 재시작 정책·화면 보호기·시간 동기화와 최근의 예기치 않은 종료·하드웨어 오류 기록을 읽습니다. «장비 PC» 용도를 고르면 멈춤·재시작으로 이어질 수 있는 값에 «볼 것» 을 붙입니다.", en: "«Read this PC's settings» reads fast startup, sleep, USB selective suspend, update restart policy, screen saver, time sync and recent unexpected shutdowns and hardware errors. With the «Equipment PC» purpose, values that can lead to stops or restarts are marked «Worth a look»." } },
      { title: { ko: "무선 — Wi-Fi·블루투스", en: "Wireless — Wi-Fi and Bluetooth" }, body: { ko: "«무선» 탭은 Wi-Fi 어댑터·드라이버·절전과 Windows 가 남긴 끊김 기록(이유별 건수), 블루투스 어댑터·서비스 상태·오류 기록과 블루투스 소리가 핸즈프리(통화용)인지를 관리자·위치 권한 없이 읽습니다. 핑을 보내지 않고, 내보낼 때 장치 이름은 가립니다.", en: "The «Wireless» tab reads the Wi-Fi adapter, driver, power saving and the disconnect records Windows keeps (counted by reason), plus the Bluetooth adapter, service state, error events and whether Bluetooth audio is in hands-free (call) mode — without admin or location permission. It sends no pings, and exports mask device names." } },
      { title: { ko: "읽기만, 결과는 그대로", en: "Read-only, plain results" }, body: { ko: "설정·드라이버를 바꾸지 않습니다(고치는 법은 도움말). 카드마다 «문제 없음(읽은 범위)·볼 것·문제 있음·읽지 못함», A/B 뒤바뀜·종단·바이어스·접지처럼 PC 가 볼 수 없는 것은 늘 따로 적고, 텍스트·JSON 으로 내보낼 때 사용자 폴더 경로는 가립니다.", en: "It never changes settings or drivers (the help explains manual fixes). Each card is marked «No issue found (in what was read) / Worth a look / Problem / Could not read»; what the PC cannot see — A/B swap, termination, bias, ground — is always listed; text and JSON exports mask user folder paths." } },
    ],
    steps: [
      { ko: "왼쪽 «COM 포트» 목록에서 포트를 누르기", en: "Click a port in the «COM ports» list on the left" },
      { ko: "카드의 결과와 까닭을 보고, 필요하면 도움말의 고치는 법대로 Windows 에서 직접 바꾸기", en: "Read each card's result and reason; if needed, change things yourself in Windows as the help explains" },
      { ko: "TX·RX 를 이어 «연결 시험», 문의에는 «텍스트 복사» 로 결과 붙이기", en: "Tie TX to RX for the «Connection test»; use «Copy text» to attach the result to a question" },
    ],
    similar: {
      ko: "비슷한 일을 하는 도구로 Windows 장치 관리자, NirSoft 의 USBDeview(무료), Uwe Sieber 의 USB Device Tree Viewer(무료), FTDI 칩용 FT_PROG(무료) 등이 있습니다. PortDock Port Inspector 는 COM 포트 하나를 기준으로 드라이버·문제 코드·절전·연결 기록·COM 번호 예약을 한 화면에 모으고, 루프백 연결 시험을 함께 합니다.",
      en: "Similar tools include Windows Device Manager, NirSoft USBDeview (freeware), Uwe Sieber's USB Device Tree Viewer (freeware) and FTDI's FT_PROG for FTDI chips (free). PortDock Port Inspector gathers the driver, problem code, power saving, plug history and COM number reservations for one COM port in one place, and adds a loopback connection test.",
    },
    help: portInspectorHelp,
  },
  {
    id: "plc-simulator",
    name: "PortDock PLC Simulator",
    file: "PortDock-PLC-Simulator",
    tagline: { ko: "MC 프로토콜(SLMP) 서버 흉내 — PLC 없이 HMI·수집 프로그램 시험", en: "MC protocol (SLMP) server simulator for testing without a PLC" },
    seo: {
      title: { ko: "PortDock PLC Simulator — 무료 MC 프로토콜(SLMP) 시뮬레이터", en: "PortDock PLC Simulator — Free MC Protocol (SLMP) Simulator" },
      desc: {
        ko: "PLC 없이 MC 프로토콜(3E·4E, 이진·ASCII) 통신을 시험하는 무료 윈도우 도구. D·M·X·Y 등 디바이스 표, 일괄·랜덤 읽기쓰기, 종료 코드·지연 장애 주입.",
        en: "Free Windows tool to test MC protocol (3E/4E, binary/ASCII) links without a PLC: device tables (D, M, X, Y …), batch/random read and write, fault injection.",
      },
    },
    summary: {
      ko: "PC 가 PLC 의 이더넷 포트처럼 MC 프로토콜(SLMP) 요청에 답합니다. 디바이스 표에 값을 넣어 두면 HMI·데이터 수집·상위 프로그램이 읽고 쓰는 것을 그대로 받아 주고, 일부러 늦게·오류로 답해 오류 처리도 시험합니다. 미쓰비시 공개 매뉴얼(SLMP/MC)의 메시지 형식대로 만든 흉내이며 제휴가 아니고, 실제 PLC 와 동작이 다를 수 있습니다.",
      en: "The PC answers MC protocol (SLMP) requests like a PLC's Ethernet port. Put values in the device tables and HMI, data-collection or host software can read and write them; deliberate delays and error end codes test its error handling. It follows the message formats in Mitsubishi Electric's public manuals (SLMP/MC); it is not affiliated, and behaviour may differ from a real PLC.",
    },
    who: [
      { ko: "PLC 가 오기 전에 HMI 화면·통신을 맞추려는 분", en: "Teams preparing HMI screens and communication before the PLC arrives" },
      { ko: "MC 프로토콜로 PLC 값을 읽는 데이터 수집·상위 프로그램 개발자", en: "Developers of data-collection or host software that reads PLCs over the MC protocol" },
    ],
    features: [
      { title: { ko: "3E·4E, 이진·ASCII, TCP·UDP", en: "3E/4E, binary/ASCII, TCP/UDP" }, body: { ko: "TCP 서버(여러 클라이언트) 또는 UDP 로 듣습니다. 4E 응답에는 요청의 일련번호를 그대로 넣습니다. 기본은 이 PC 안(127.0.0.1)에서만 받고, 다른 PC 에서 붙게 하려면 직접 켭니다.", en: "Listens as a TCP server (several clients) or on UDP. 4E replies carry the request's serial number. By default only this PC (127.0.0.1) can connect; allowing other PCs is your choice." } },
      {
        title: { ko: "구현한 명령", en: "Implemented commands" },
        body: {
          ko: "0401 일괄 읽기·1401 일괄 쓰기(워드·비트, 서브 명령 0000~0003), 0403 랜덤 읽기, 1402 랜덤 쓰기, 0619 루프백. 0.6.0 부터 0406·1406 블록 읽기·쓰기, 0801·0802 모니터, 1001~1006 원격 RUN·STOP·PAUSE·래치 클리어·리셋(흉내 상태만), 0101 형명 읽기(흉내 값)도. 그 밖의 명령은 종료 코드 C059 로 답합니다.",
          en: "0401 Read and 1401 Write (words and bits, subcommands 0000–0003), 0403 Read Random, 1402 Write Random and 0619 Loopback. From 0.6.0 also 0406/1406 Read/Write Block, 0801/0802 monitor, 1001–1006 remote RUN/STOP/PAUSE/latch clear/reset (simulated state only) and 0101 Read Type Name (simulated values). Other commands get end code C059.",
        },
      },
      {
        title: { ko: "조건 규칙 (0.6.0 부터)", en: "Condition rules (from 0.6.0)" },
        body: {
          ko: "«요청 비트가 켜지면 300 ms 뒤 완료 비트 켜기» 처럼 조건(비트 ON·OFF·에지, 워드 값 비교, 주기) → 지연(고정·무작위) → 동작(비트·워드 쓰기)을 정해 핸드셰이크를 흉내 냅니다. 래더 프로그램은 아닙니다.",
          en: "Mimic handshakes such as «when the request bit turns on, turn the done bit on 300 ms later»: condition (bit ON/OFF/edge, word comparison, periodic) → delay (fixed or random) → actions (bit and word writes). Not a ladder program.",
        },
      },
      { title: { ko: "디바이스 18종", en: "18 devices" }, body: { ko: "X·Y·M·L·F·B·SM, D·W·R·ZR·SD, TS·TC·TN·CS·CC·CN. X·Y·B·W·ZR 는 16진 번호, 디바이스마다 크기를 정하고 넘으면 C056. 비트 디바이스는 16점 워드로도 보고, 칸마다 32비트·실수·문자열·이름을 정합니다.", en: "X, Y, M, L, F, B, SM, D, W, R, ZR, SD, TS, TC, TN, CS, CC and CN. X, Y, B, W and ZR use hex numbers; each device has a size and requests beyond it get C056. Bit devices can be viewed as 16-point words; cells can be 32-bit, float, string or named." } },
      { title: { ko: "장애 주입", en: "Fault injection" }, body: { ko: "응답 지연(범위), 응답 안 함, 정한 종료 코드로 답하기를 명령·디바이스·N번째·확률로 골라 겁니다.", en: "Response delay (with a range), no response or a chosen end code — targeted by command, device, every Nth request or probability." } },
      { title: { ko: "풀이가 붙은 통신 기록", en: "Decoded traffic" }, body: { ko: "요청마다 명령 이름·디바이스·점 수, 응답마다 종료 코드와 뜻이 붙습니다. 클라이언트가 바꾼 칸은 잠깐 강조되고 통계가 남습니다.", en: "Each request shows the command name, device and points; each reply the end code and its meaning. Cells changed by a client flash, with statistics." } },
      { title: { ko: "값 자동 변화·저장", en: "Simulation and saved states" }, body: { ko: "증가·랜덤·사인·램프·토글로 값을 저절로 바꾸고, 디바이스 값·칸 설정을 JSON 파일로 저장하고 불러옵니다.", en: "Values can change by themselves (increment, random, sine, ramp, toggle), and device values and cell settings save to and load from a JSON file." } },
    ],
    steps: [
      { ko: "프레임(3E/4E)·데이터 코드(이진/ASCII)·포트를 클라이언트와 맞추기", en: "Match the frame (3E/4E), data code (binary/ASCII) and port with the client" },
      { ko: "디바이스(D·M·X …)를 고르고 값을 넣기", en: "Pick a device (D, M, X …) and enter values" },
      { ko: "«시작» — 클라이언트의 읽기·쓰기에 표 값으로 답합니다", en: "«Start» — client reads and writes are answered from the tables" },
    ],
    faq: [
      {
        q: { ko: "실제 PLC 와 똑같이 동작하나요?", en: "Does it behave exactly like a real PLC?" },
        a: {
          ko: "아닙니다. 공개 매뉴얼의 메시지 형식대로 만들었고 실기와 견주지 않았습니다. 래더는 돌리지 않으며, 오류 코드·응답 시간·연결 수 제한·기종별 디바이스 범위는 실제와 다를 수 있습니다.",
          en: "No. It follows the message formats in the public manuals and has not been compared with real hardware. No ladder program runs, and error codes, timing, connection limits and per-model device ranges may differ.",
        },
      },
      {
        q: { ko: "다른 PC 의 HMI 에서 붙으려면?", en: "How do I connect an HMI on another PC?" },
        a: {
          ko: "«다른 PC 에서 접속 허용 (0.0.0.0)» 을 켜고 윈도우 방화벽에서 이 프로그램을 허용합니다. 공장망에서 실제 PLC 와 같은 IP·포트로 띄우지 마세요.",
          en: "Turn on «Allow other PCs to connect (0.0.0.0)» and allow the program in Windows Firewall. Do not run it on a plant network with the same IP and port as a real PLC.",
        },
      },
    ],
    similar: {
      ko: "비슷한 일을 하는 도구로 DummyPLC(무료, 소스 비공개), HslCommunication(상용) 등이 있습니다. PortDock PLC Simulator 는 무료(GPL-3.0)·한국어이고, 장애 주입·풀이가 붙은 통신 기록·값 자동 변화를 함께 합니다.",
      en: "Similar tools include DummyPLC (free, closed source) and HslCommunication (commercial). PortDock PLC Simulator is free (GPL-3.0) and adds fault injection, decoded traffic and value simulation.",
    },
    help: plcSimulatorHelp,
  },
  {
    id: "hw-tester",
    name: "PortDock Hardware Tester",
    file: "PortDock-Hardware-Tester",
    tagline: { ko: "와이파이·인터넷 끊김·지연 기록, 블루투스 연결·끊김 기록", en: "Wi-Fi and internet drop/latency recorder with a Bluetooth connection log" },
    seo: {
      title: { ko: "PortDock Hardware Tester — 와이파이 끊김·핑 기록 (무료)", en: "PortDock Hardware Tester — Wi-Fi Drop & Ping Logger (Free)" },
      desc: {
        ko: "와이파이가 자꾸 끊길 때 공유기 쪽인지 그 너머인지 기록으로 보는 무료 윈도우 도구. 게이트웨이·인터넷 핑, DNS, 끊김 이유, 블루투스 연결 기록.",
        en: "Free Windows tool that logs Wi-Fi drops: gateway vs internet ping side by side, DNS time, Windows disconnect reasons and a Bluetooth connect/disconnect log.",
      },
    },
    summary: {
      ko: "«와이파이가 자꾸 끊긴다» 를 기록으로 남깁니다. 기록을 켠 동안 게이트웨이(공유기)와 인터넷 주소 하나에 핑을 나란히 보내 지연·손실을 한 그래프에 그리고, Windows 가 남긴 Wi-Fi 끊김 이유를 같은 시간축에 표시해 «공유기 쪽» 인지 «공유기 너머» 인지 볼 곳을 알려 줍니다. 블루투스 장치가 언제 연결되고 끊겼는지도 기록합니다. 관리자 권한 없이 읽기만 하고, 설정을 바꾸지 않습니다.",
      en: "Turns «my Wi-Fi keeps dropping» into a record. While recording it pings your gateway (router) and one internet address side by side, draws latency and loss on one chart with the Wi-Fi disconnect reasons Windows logs on the same timeline, and tells you whether to look on the router side or beyond it. It also logs when Bluetooth devices connect and disconnect. Read-only, without administrator rights; it changes no settings.",
    },
    who: [
      { ko: "와이파이가 자꾸 끊기는데 공유기 탓인지 인터넷 탓인지 알고 싶은 분", en: "Anyone whose Wi-Fi keeps dropping and who wants to know whether it is the router or the internet" },
      { ko: "블루투스 이어폰·키보드가 끊기는 시각을 남겨 두려는 분", en: "People who want a record of when Bluetooth earbuds or keyboards disconnect" },
      { ko: "장비 PC 의 무선 연결 상태를 문의 전에 정리하려는 현장 엔지니어", en: "Field engineers documenting a device PC's wireless link before a support call" },
    ],
    features: [
      { title: { ko: "게이트웨이 vs 인터넷", en: "Gateway vs internet" }, body: { ko: "공유기와 인터넷 주소(1.1.1.1·8.8.8.8 또는 직접 입력)에 같은 박자로 핑을 보내 손실·평균·95%·흔들림을 나란히 보여 줍니다. 1초에 한 번보다 자주 보내지 않고, 한 번 기록은 24시간에서 멈춥니다.", en: "Pings the router and an internet address (1.1.1.1, 8.8.8.8 or your own) on the same beat and shows loss, average, 95th percentile and jitter side by side. Never more than once per second; one recording stops after 24 hours." } },
      { title: { ko: "Windows 끊김 이유를 같은 그래프에", en: "Windows' disconnect reasons on the same chart" }, body: { ko: "WLAN-AutoConfig 기록(8001 연결·8003 끊김)을 읽어 그래프에 세로 줄로, 사건 목록에 Windows 이유 문구로 보입니다. Wi-Fi 이름은 읽지 않습니다.", en: "Reads the WLAN-AutoConfig log (8001 connect, 8003 disconnect) and shows it as lines on the chart and as Windows' reason wording in the event list. The Wi-Fi name is not read." } },
      { title: { ko: "DNS 응답 시간", en: "DNS response time" }, body: { ko: "5초마다 이름 하나(기본 example.com)를 캐시 없이 DNS 서버에 물어 응답 시간·실패를 잽니다.", en: "Every 5 s one name (example.com by default) is looked up at the DNS server without the cache, timing replies and failures." } },
      { title: { ko: "«볼 곳» 요약·CSV", en: "Where-to-look summary and CSV" }, body: { ko: "게이트웨이까지 손실이 있으면 «공유기 쪽», 인터넷만 손실이면 «공유기 너머» 처럼 볼 곳만 알립니다(원인을 정하지 않음). 기록은 CSV 로 저장합니다.", en: "Says «router side» when loss reaches the gateway and «beyond the router» when only the internet target loses replies — where to look, not the cause. Records save as CSV." } },
      { title: { ko: "블루투스 연결 기록", en: "Bluetooth connection log" }, body: { ko: "짝지은 장치들의 «연결됨» 상태를 2초마다 읽어 연결·끊김 시각을 남깁니다. 장치 이름은 화면에만 보이고 저장·복사엔 «장치 N» 만 들어갑니다.", en: "Reads paired devices' «Connected» state every 2 s and logs connects and drops. Names are shown only on screen; saved and copied text uses «Device N»." } },
      { title: { ko: "블루투스 소리 모드·좌우 소리", en: "Bluetooth audio mode and left/right tones" }, body: { ko: "기본 출력이 스테레오(A2DP)인지 통화용 핸즈프리인지 보이고, 왼쪽·오른쪽·양쪽 시험 소리를 냅니다.", en: "Shows whether the default output is stereo (A2DP) or hands-free for calls, and plays left, right and both test tones." } },
      { title: { ko: "Wi-Fi 신호·채널(누를 때만)", en: "Wi-Fi signal and channel (on request)" }, body: { ko: "«신호 보기» 를 누른 동안만 신호 세기·링크 속도·대역·채널과 채널별 주변 Wi-Fi 수(이름 없이)를 읽습니다. Windows 11 24H2 부터는 위치 권한이 필요합니다(거부해도 다른 기능은 됩니다).", en: "Only while «Show signal» is on: signal strength, link speed, band, channel and how many nearby networks share each channel (no names). From Windows 11 24H2 this needs location permission (the rest works without it)." } },
    ],
    steps: [
      { ko: "인터넷 대상·간격을 고르고 «기록 시작»", en: "Choose the internet target and interval, then «Start recording»" },
      { ko: "끊김이 생길 때까지 그대로 두기 — 공유기·인터넷 지연과 Windows 끊김 이유가 한 그래프에", en: "Leave it until the drops happen — router and internet latency and Windows' reasons on one chart" },
      { ko: "«요약» 의 볼 곳을 읽고 «CSV 저장…»·«요약 복사»", en: "Read where to look in «Summary», then «Save CSV…» or «Copy summary»" },
    ],
    faq: [
      {
        q: { ko: "인터넷 속도도 재나요?", en: "Does it measure internet speed?" },
        a: { ko: "아닙니다. 다운로드·업로드 속도는 재지 않고, 끊김·지연·손실을 기록합니다. 속도는 측정 사이트를 씁니다.", en: "No. It records drops, latency and loss, not download or upload speed. Use a speed-test site for that." },
      },
      {
        q: { ko: "고쳐 주나요?", en: "Does it fix the problem?" },
        a: { ko: "아닙니다. 읽기만 하고 설정을 바꾸지 않습니다. 볼 곳(공유기 쪽·공유기 너머·DNS·Wi-Fi 끊김 이유)을 알려 줄 뿐입니다.", en: "No. It only reads and changes no settings. It points to where to look (router side, beyond the router, DNS, Windows' disconnect reasons)." },
      },
      {
        q: { ko: "무엇을 바깥으로 보내나요?", en: "What does it send out?" },
        a: { ko: "기록을 켠 동안 게이트웨이와 고른 인터넷 주소에 보내는 핑, 정한 이름 하나의 DNS 질의뿐입니다. 대상은 화면에 늘 보이고, 멈추면 보내지 않습니다.", en: "Only the pings to the gateway and the chosen internet address and one DNS lookup, while recording. The targets are always shown, and nothing is sent after you stop." },
      },
    ],
    similar: {
      ko: "비슷한 일을 하는 도구로 PingPlotter(상용, 무료판 있음), WifiHistoryView(무료, 연결·끊김 기록) 등이 있습니다. PortDock Hardware Tester 는 무료(GPL-3.0)·한국어이고, 게이트웨이·인터넷 핑과 Windows 끊김 이유를 한 그래프에, 블루투스 연결 기록을 함께 합니다.",
      en: "Similar tools include PingPlotter (commercial, with a free edition) and WifiHistoryView (free, connect/disconnect history). PortDock Hardware Tester is free (GPL-3.0) and puts gateway and internet pings and Windows' disconnect reasons on one chart, together with a Bluetooth connection log.",
    },
    help: hwTesterHelp,
  },
];

export const toolById = (id: string) => TOOLS.find((t) => t.id === id)!;
/** 지금 내려받을 수 있는지(첫 릴리스 공개 + 이 도구가 릴리스에 들어 있음) */
export const downloadable = (t: Tool) => RELEASED && !t.upcoming;
/** 내려받을 수 있는 도구 — 첫 화면 «윈도우 프로그램 N종» 같은 숫자에 쓴다 */
export const RELEASED_TOOLS = TOOLS.filter((t) => !t.upcoming);
