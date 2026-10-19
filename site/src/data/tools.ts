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

export type Lang = "ko" | "en";
export type L = Record<Lang, string>;

export const REPO = "https://github.com/portdock/PortDock";
export const RELEASES = `${REPO}/releases`;
/** 릴리스 파일 이름은 버전 없이 고정한다 — /releases/latest/download/<이름> 이 늘 최신을 가리키게(릴리스 작업에서 이름을 맞춘다) */
export const latest = (file: string) => `${RELEASES}/latest/download/${file}`;

export interface Tool {
  id: "serial" | "modbus-slave" | "tcp" | "udp" | "simulator" | "netscan" | "modbus-master" | "scpi" | "plot";
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
      { title: { ko: "프레임 구분 4가지", en: "Four framing modes" }, body: { ko: "끊김 시간(조용한 간격)·끝 문자·고정 길이·Modbus RTU 로 한 덩어리를 정확히 끊어 보여 줍니다.", en: "Idle gap, terminator, fixed length or Modbus RTU — so one message is one line." } },
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
      { title: { ko: "국번 여러 개", en: "Several Slave IDs" }, body: { ko: "국번(슬레이브 ID) 1~247 을 여러 개 두고 따로 값을 줍니다.", en: "Run several Slave IDs (1–247), each with its own values." } },
      { title: { ko: "장애 주입", en: "Fault injection" }, body: { ko: "응답 지연, 무응답, CRC 깨기, 예외 강제로 마스터의 타임아웃·재시도를 시험합니다.", en: "Delay, no response, broken CRC or forced exceptions to test the master's timeouts and retries." } },
      { title: { ko: "쓰기가 보임", en: "See every write" }, body: { ko: "마스터가 쓴 칸이 잠깐 강조되고, 통신 기록과 통계가 남습니다.", en: "Cells written by the master flash, with a traffic log and statistics." } },
      { title: { ko: "표 저장·불러오기", en: "Save and load tables" }, body: { ko: "레지스터 값을 JSON 으로 내보내고 가져옵니다.", en: "Export and import register values as JSON." } },
    ],
    steps: [
      { ko: "포트·속도를 고르고 국번을 추가", en: "Pick the port and baud rate, add a Slave ID" },
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
      { title: { ko: "프레임 구분·체크섬", en: "Framing and checksums" }, body: { ko: "이어 붙어 오는 TCP 데이터를 끊김 시간(조용한 간격)·끝 문자·고정 길이로 끊고, 체크섬 8종으로 검사합니다.", en: "Split the TCP stream by idle gap, terminator or fixed length, and verify eight checksum types." } },
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
  {
    id: "netscan",
    name: "PortDock Net Scan",
    file: "PortDock-Net-Scan",
    tagline: { ko: "산업 네트워크 장비 IP 찾기 — 산업 포트 판정·장기 핑", en: "Find devices on industrial networks — industrial ports, long-term ping" },
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
      { title: { ko: "산업 포트 판정", en: "Industrial port check" }, body: { ko: "502·2004·5000번대·102·44818·4840 등 정해 둔 포트만 확인하고, Modbus 장비는 제조사·모델(FC 2B/0E)을 물어봅니다.", en: "Checks only a fixed list of industrial ports (502, 2004, 5000s, 102, 44818, 4840 …) and asks Modbus devices for vendor/model (FC 2B/0E)." } },
      { title: { ko: "MAC 제조사", en: "MAC vendor" }, body: { ko: "IEEE 공개 목록을 내장해 인터넷 없이 제조사를 보여 줍니다.", en: "Embedded IEEE list shows the vendor without internet access." } },
      { title: { ko: "장기 핑 감시", en: "Long-term ping monitor" }, body: { ko: "장비 여러 대의 손실·지연·끊긴 시각을 CSV 로 남기고, 끊기면 작업 표시줄을 깜빡입니다.", en: "Logs loss, latency and outages of several devices to CSV and flashes the taskbar on a drop." } },
      { title: { ko: "새로 나타남·사라짐", en: "New / missing" }, body: { ko: "지난 찾기와 비교해 새로 나타난 장비와 사라진 장비를 표시합니다. 결과는 CSV 로 저장합니다.", en: "Compares with the previous scan to mark new and missing devices. Export to CSV." } },
      { title: { ko: "Wake-on-LAN·웹 열기", en: "Wake-on-LAN, open web" }, body: { ko: "장비마다 웹 페이지 열기, IP·MAC 복사, 매직 패킷 보내기.", en: "Per device: open its web page, copy IP/MAC, send a magic packet." } },
    ],
    steps: [
      { ko: "랜카드를 고르면 그 대역이 범위로 들어갑니다", en: "Pick a network card — its subnet becomes the range" },
      { ko: "«찾기»(F4)", en: "«Scan» (F4)" },
      { ko: "장비를 눌러 포트·제조사 확인, 필요하면 핑 감시에 추가", en: "Click a device to see ports and vendor; add it to the ping monitor if needed" },
    ],
    help: netscanHelp,
  },
  {
    id: "modbus-master",
    name: "PortDock Modbus Master",
    file: "PortDock-Modbus-Master",
    tagline: { ko: "Modbus RTU·TCP 마스터(폴링) — 타입 값·쓰기·국번 찾기", en: "Modbus RTU/TCP master (poll tool) — typed values, writes, Slave ID scan" },
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
      { title: { ko: "쓰기 미리보기", en: "Writes with preview" }, body: { ko: "칸을 두 번 눌러 05·06·0F·10 으로 쓰고, 보낼 바이트를 미리 봅니다. «늘 0F/10» 선택도 있습니다.", en: "Double-click to write with 05/06/0F/10 and preview the exact bytes. An «always 0F/10» option is included." } },
      { title: { ko: "국번·주소 찾기", en: "Slave ID and address scan" }, body: { ko: "1~247 중 답하는 국번과 읽히는 주소 범위를 찾아 바로 표로 만듭니다.", en: "Find which Slave IDs (1–247) answer and which address ranges are readable, then turn them into tables." } },
      { title: { ko: "타임아웃·재시도·통계", en: "Timeouts, retries, statistics" }, body: { ko: "응답 기다림·재시도·요청 간격을 정하고, 표마다 요청·정상·타임아웃·CRC·예외와 응답 시간을 셉니다. 예외는 한국어로 풀어 줍니다.", en: "Set timeout, retries and delay; count requests, OK, timeouts, CRC errors and exceptions with response times per table. Exceptions are explained." } },
      { title: { ko: "값 기록·추세", en: "Value log and trends" }, body: { ko: "값을 폴링마다 또는 바뀔 때만 CSV 로 남기고, 고른 칸의 변화를 작은 그림으로 봅니다.", en: "Log values to CSV on every poll or on change, and watch chosen cells as small trend lines." } },
    ],
    steps: [
      { ko: "연결 방식·포트(또는 IP)를 장비와 같게", en: "Match the connection and port (or IP) to the device" },
      { ko: "«연결»(F4) 후 국번·함수·시작·개수를 설명서대로", en: "«Connect» (F4), then set Slave ID, function, start and count from the manual" },
      { ko: "칸을 두 번 눌러 쓰기, 오른쪽 버튼으로 이름·형식", en: "Double-click a cell to write; right-click for name and type" },
    ],
    help: modbusMasterHelp,
  },
  {
    id: "scpi",
    name: "PortDock SCPI",
    file: "PortDock-SCPI",
    tagline: { ko: "SCPI 계측기 터미널 — LAN 소켓·RS-232, VISA 없이", en: "SCPI instrument terminal — LAN socket and RS-232, no VISA" },
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
    help: scpiHelp,
  },
  {
    id: "plot",
    name: "PortDock Plot",
    file: "PortDock-Plot",
    tagline: { ko: "시리얼·TCP·UDP 숫자를 실시간 그래프로", en: "Live graphs of numbers from serial, TCP and UDP" },
    summary: {
      ko: "Arduino·센서·장비가 보내는 숫자를 바로 그래프로 봅니다. 쉼표·빈칸 글자 줄, Arduino 식 «이름:값», 바이너리 프레임을 읽고, 채널마다 색·축을 정해 멈추고 확대하며 두 점의 차이를 잽니다. 받는 동안 CSV 로 기록합니다.",
      en: "See the numbers an Arduino, sensor or device sends as a live graph. Reads comma/space text, Arduino-style «name:value» and binary frames, with per-channel colors and axes, pause, zoom and two-point deltas, and records CSV while receiving.",
    },
    who: [
      { ko: "센서·보드 값을 눈으로 확인하며 펌웨어를 맞추는 개발자", en: "Developers tuning firmware while watching sensor or board values" },
      { ko: "장비 출력을 오래 기록해 이상 구간을 찾는 현장 엔지니어", en: "Field engineers logging device output for hours to find anomalies" },
    ],
    features: [
      { title: { ko: "시리얼·TCP·UDP", en: "Serial, TCP, UDP" }, body: { ko: "COM 포트(속도·8N1·DTR), 장비에 접속하는 TCP 클라이언트, UDP 받기(멀티캐스트 포함). 뽑혔다 꽂히면 다시 연결합니다.", en: "COM ports (baud, 8N1, DTR), a TCP client that connects to the device, and UDP receive (multicast too). Reconnects after unplug/replug." } },
      { title: { ko: "글자 줄·이름:값·바이너리", en: "Text, name:value, binary" }, body: { ko: "쉼표·빈칸·탭·세미콜론 자동, temp:23.1 hum:40 같은 이름 붙은 값, 첫 줄 머리글, 시작 바이트·u8~f64·엔디언·체크섬 프레임. 해석 실패 줄은 이유와 함께 빨갛게.", en: "Comma, space, tab or semicolon detected automatically, named values like temp:23.1 hum:40, header lines, and frames with start bytes, u8–f64, endianness and checksum. Failed lines show in red with the reason." } },
      { title: { ko: "보고 재기", en: "View and measure" }, body: { ko: "채널 32개·왼쪽/오른쪽 축, 최근 N점·N초, Y 자동·고정, 멈춤(받기는 계속), 커서 값, 측정점 두 개의 Δt·Δ값, 휠 확대·끌어 옮기기.", en: "Up to 32 channels on left/right axes, last N points or seconds, auto/fixed Y, pause (keeps receiving), cursor readout, Δt and Δvalue between two markers, wheel zoom and drag to pan." } },
      { title: { ko: "버티는 그리기", en: "Keeps up" }, body: { ko: "숫자 해석은 Rust 에서, 그리기는 화면 한 번에 한 번(canvas)·픽셀마다 최소·최대만 — 초당 수천 줄이 와도 뾰족한 값을 잃지 않습니다.", en: "Parsing runs in Rust; drawing happens once per frame on a canvas with min/max per pixel — thousands of rows per second without losing spikes." } },
      { title: { ko: "기록·저장", en: "Record and save" }, body: { ko: "받는 동안 모든 값을 CSV 로(엑셀 한글 그대로), 지금 보이는 범위 CSV, 그래프 PNG. 표에 최근·최소·최대·평균.", en: "Every value to CSV while receiving (Excel-friendly), the visible range as CSV, the graph as PNG. Table of last, min, max and mean." } },
    ],
    steps: [
      { ko: "장비가 한 줄에 숫자를 보내게(예: 23.1,40 또는 temp:23.1 hum:40)", en: "Have the device print numbers per line (e.g. 23.1,40 or temp:23.1 hum:40)" },
      { ko: "받는 곳(시리얼 포트·속도, TCP, UDP)을 고르고 «받기 시작»(F4)", en: "Pick the source (serial port and baud, TCP, UDP) and «Start» (F4)" },
      { ko: "그래프를 눌러 측정점, «● CSV 기록» 으로 남기기", en: "Click the graph to measure; «● Record CSV» to keep it" },
    ],
    help: plotHelp,
  },
];

export const toolById = (id: string) => TOOLS.find((t) => t.id === id)!;
