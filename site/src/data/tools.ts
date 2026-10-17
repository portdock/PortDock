// 도구 목록 — 첫 화면 카드·도구 페이지·내려받기·문서가 모두 여기서 나온다.
// 기능 문구는 실제 코드에 있는 것만 적는다(apps/*/src, crates/core).
import type { HelpDoc } from "@shared/HelpDialog";
import { help as serialHelp } from "../../../apps/serial/src/help";
import { help as slaveHelp } from "../../../apps/modbus-slave/src/help";
import { help as tcpHelp } from "../../../apps/tcp/src/help";
import { help as udpHelp } from "../../../apps/udp/src/help";
import { help as simHelp } from "../../../apps/simulator/src/help";

export type Lang = "ko" | "en";
export type L = Record<Lang, string>;

export const REPO = "https://github.com/juhak0308/PortDock";
export const RELEASES = `${REPO}/releases`;
/** 릴리스 파일 이름은 버전 없이 고정한다 — /releases/latest/download/<이름> 이 늘 최신을 가리키게(릴리스 작업에서 이름을 맞춘다) */
export const latest = (file: string) => `${RELEASES}/latest/download/${file}`;

export interface Tool {
  id: "serial" | "modbus-slave" | "tcp" | "udp" | "simulator";
  name: string;
  /** 파일 이름에 쓰는 이름 — PortDock-Serial */
  file: string;
  tagline: L;
  summary: L;
  /** 이런 분께 */
  who: L[];
  features: { title: L; body: L }[];
  /** 빠른 시작 */
  steps: L[];
  help: HelpDoc;
}

export const TOOLS: Tool[] = [
  {
    id: "serial",
    name: "PortDock Serial",
    file: "PortDock-Serial",
    tagline: { ko: "시리얼(COM) 송수신·신호선·자동 재연결", en: "Serial (COM) terminal with signal lines and auto-reconnect" },
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
      { title: { ko: "프레임 구분 4가지", en: "Four framing modes" }, body: { ko: "조용한 시간·끝 문자·고정 길이·Modbus RTU 로 한 덩어리를 정확히 끊어 보여 줍니다.", en: "Idle gap, terminator, fixed length or Modbus RTU — so one message is one line." } },
      { title: { ko: "체크섬 8종", en: "Eight checksums" }, body: { ko: "CRC16 Modbus·CCITT·XMODEM, CRC8, LRC, BCC, SUM8, SUM16 을 붙여 보내고, 받은 줄의 체크섬을 검사합니다.", en: "Append CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8 or SUM16 when sending, and verify them on receive." } },
      { title: { ko: "Modbus RTU 풀이", en: "Modbus RTU decoding" }, body: { ko: "요청·응답·예외를 주소·기능·값으로 풀어 보여 줍니다.", en: "Decodes requests, responses and exceptions into address, function and values." } },
      { title: { ko: "신호선", en: "Signal lines" }, body: { ko: "DTR·RTS 를 켜고 끄고, CTS·DSR·RI·CD 변화를 표시등과 기록으로 보여 줍니다.", en: "Toggle DTR/RTS and watch CTS/DSR/RI/CD on indicators and in the log." } },
      { title: { ko: "시험 기록", en: "Test logs" }, body: { ko: "밀리초 시각, 명령 목록, 반복 보내기, 밤새 파일로 계속 저장.", en: "Millisecond timestamps, a command list, repeat sending and continuous logging to file." } },
    ],
    steps: [
      { ko: "포트·속도·패리티를 고르고 «연결»", en: "Pick the port, baud rate and parity, then «Connect»" },
      { ko: "HEX 또는 ASCII 로 입력, 필요하면 체크섬·줄 끝(CR·LF) 선택", en: "Type HEX or ASCII; add a checksum or line ending if needed" },
      { ko: "«보내기» — 받은 것은 RX ◀, 보낸 것은 TX ▶", en: "«Send» — received lines show as RX ◀, sent as TX ▶" },
    ],
    help: serialHelp,
  },
  {
    id: "modbus-slave",
    name: "PortDock Modbus Slave",
    file: "PortDock-Modbus-Slave",
    tagline: { ko: "Modbus RTU 장비 흉내 — 레지스터 표", en: "Modbus RTU slave simulator with register tables" },
    summary: {
      ko: "PC 를 Modbus RTU 슬레이브로 만들어, 실제 장비 없이 마스터(PLC·HMI·상위 프로그램)를 시험합니다. 일부러 늦게·틀리게 답하게 해서 오류 처리도 확인합니다.",
      en: "Turns the PC into a Modbus RTU slave so you can test a master (PLC, HMI, host software) without the real device — including deliberate delays and errors.",
    },
    who: [
      { ko: "Modbus 마스터 프로그램을 만드는 개발자", en: "Developers writing a Modbus master" },
      { ko: "장비가 오기 전에 HMI 화면을 맞추려는 분", en: "Teams preparing HMI screens before the device arrives" },
    ],
    features: [
      { title: { ko: "표 4종", en: "Four tables" }, body: { ko: "코일·입력 비트·홀딩 레지스터·입력 레지스터. 값은 U16·S16·HEX·BIN 으로 보고 고칩니다.", en: "Coils, discrete inputs, holding and input registers, shown and edited as U16, S16, HEX or BIN." } },
      { title: { ko: "슬레이브 여러 개", en: "Several slave IDs" }, body: { ko: "주소 1~247 을 여러 개 두고 따로 값을 줍니다.", en: "Run several slave addresses (1–247), each with its own values." } },
      { title: { ko: "장애 주입", en: "Fault injection" }, body: { ko: "응답 지연, 무응답, CRC 깨기, 예외 강제로 마스터의 타임아웃·재시도를 시험합니다.", en: "Delay, no response, broken CRC or forced exceptions to test the master's timeouts and retries." } },
      { title: { ko: "쓰기가 보임", en: "See every write" }, body: { ko: "마스터가 쓴 칸이 잠깐 강조되고, 통신 기록과 통계가 남습니다.", en: "Cells written by the master flash, with a traffic log and statistics." } },
      { title: { ko: "표 저장·불러오기", en: "Save and load tables" }, body: { ko: "레지스터 값을 JSON 으로 내보내고 가져옵니다.", en: "Export and import register values as JSON." } },
    ],
    steps: [
      { ko: "포트·속도를 고르고 슬레이브 주소를 추가", en: "Pick the port and baud rate, add a slave address" },
      { ko: "표를 고르고 시작 주소·개수를 정한 뒤 값을 입력", en: "Choose a table, set start and count, enter values" },
      { ko: "«시작» — 마스터의 요청에 표 값으로 답합니다", en: "«Start» — master requests are answered from the table" },
    ],
    help: slaveHelp,
  },
  {
    id: "tcp",
    name: "PortDock TCP",
    file: "PortDock-TCP",
    tagline: { ko: "TCP 클라이언트·서버 — 여러 접속·에코·자동 재접속", en: "TCP client and server with multiple peers, echo and auto-reconnect" },
    summary: {
      ko: "이더넷 장비에 접속하거나(클라이언트), 장비가 PC 로 접속하게(서버) 해서 데이터를 주고받습니다. 서버는 여러 접속을 받아 상대별·모두에게 보낼 수 있습니다.",
      en: "Connect to an Ethernet device (client) or let devices connect to the PC (server). The server accepts several peers and can send to one or all.",
    },
    who: [
      { ko: "HMI·MES·상위 프로그램 개발자", en: "HMI, MES and host software developers" },
      { ko: "TCP 로 접속하는 장비의 펌웨어 개발자", en: "Firmware developers of TCP devices" },
    ],
    features: [
      { title: { ko: "클라이언트·서버", en: "Client and server" }, body: { ko: "서버는 최대 64개 접속을 받고, 상대별·모두에게 보내고, 하나씩 끊을 수 있습니다.", en: "The server accepts up to 64 peers; send to one or all, and disconnect them individually." } },
      { title: { ko: "자동 재접속", en: "Auto-reconnect" }, body: { ko: "클라이언트는 끊기면 정한 간격으로 다시 접속합니다.", en: "The client reconnects at a set interval when the link drops." } },
      { title: { ko: "에코", en: "Echo" }, body: { ko: "받은 것을 그대로 돌려주고, 서로 에코하며 끝없이 도는 것은 저절로 막습니다.", en: "Echo back what arrives, with automatic protection against echo loops." } },
      { title: { ko: "프레임 구분·체크섬", en: "Framing and checksums" }, body: { ko: "이어 붙어 오는 TCP 데이터를 조용한 시간·끝 문자·고정 길이로 끊고, 체크섬 8종으로 검사합니다.", en: "Split the TCP stream by idle gap, terminator or fixed length, and verify eight checksum types." } },
    ],
    steps: [
      { ko: "«클라이언트» 또는 «서버» 를 고르고 주소·포트 입력", en: "Choose «Client» or «Server», enter address and port" },
      { ko: "«접속» 또는 «듣기 시작»", en: "«Connect» or «Start listening»" },
      { ko: "보낼 내용을 입력하고 «보내기»", en: "Type and «Send»" },
    ],
    help: tcpHelp,
  },
  {
    id: "udp",
    name: "PortDock UDP",
    file: "PortDock-UDP",
    tagline: { ko: "UDP 송수신 — 브로드캐스트·멀티캐스트·에코", en: "UDP sender/receiver with broadcast, multicast and echo" },
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
    help: udpHelp,
  },
  {
    id: "simulator",
    name: "PortDock Simulator",
    file: "PortDock-Simulator",
    tagline: { ko: "규칙대로 답하는 가짜 장비 — 시리얼·TCP·UDP", en: "Rule-based fake device over serial, TCP and UDP" },
    summary: {
      ko: "«이걸 받으면 → 이렇게 답한다» 규칙으로 아무 장비나 흉내 냅니다. 장비 없이 상위 프로그램을 개발하고, 지연·틀린 응답으로 예외 처리를 시험합니다.",
      en: "Imitate any device with «when this arrives → reply that» rules. Develop host software without hardware and test error handling with delays and wrong replies.",
    },
    who: [
      { ko: "장비가 아직 없는 상위 프로그램 개발자", en: "Host software developers without the hardware yet" },
      { ko: "자동 시험 환경을 꾸미려는 분", en: "Teams building automated test rigs" },
    ],
    features: [
      { title: { ko: "와일드카드 규칙", en: "Wildcard rules" }, body: { ko: "HEX 는 ??(아무 1바이트)·**(0개 이상), ASCII 는 ?·*. «정확히» 또는 «포함» 으로 비교합니다.", en: "HEX ?? (any byte) and ** (zero or more), ASCII ? and *. Match exactly or anywhere." } },
      { title: { ko: "응답 꾸미기", en: "Shaped replies" }, body: { ko: "체크섬·줄 끝을 자동으로 붙이고, 지연을 줍니다. 규칙별 응답 횟수가 보입니다.", en: "Auto checksum and line ending, reply delay, and per-rule hit counts." } },
      { title: { ko: "장비가 먼저 보내기", en: "Device-initiated messages" }, body: { ko: "하트비트·상태 보고를 정한 간격으로 보냅니다.", en: "Send heartbeats or status reports on an interval." } },
      { title: { ko: "4가지 연결", en: "Four transports" }, body: { ko: "시리얼, TCP 서버, TCP 클라이언트, UDP. 규칙 묶음은 파일로 저장·불러오기.", en: "Serial, TCP server, TCP client, UDP. Save and load rule sets as files." } },
    ],
    steps: [
      { ko: "연결 방식을 고르고 포트·주소 입력", en: "Pick a transport and enter port or address" },
      { ko: "«+ 규칙 추가» — 받으면 / 응답", en: "«+ Add rule» — When / Reply" },
      { ko: "«시작» — 상위 프로그램에서 요청을 보내 보세요", en: "«Start» — send a request from your host software" },
    ],
    help: simHelp,
  },
];

export const toolById = (id: string) => TOOLS.find((t) => t.id === id)!;
