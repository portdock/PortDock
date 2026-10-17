// 말풍선 설명 — 화면 칸 이름(i18n 키)마다 «무엇인지 + 언제 쓰는지». 다섯 프로그램 공통.
type Tip = [ko: string, en: string];

const TIPS: Record<string, Tip> = {
  // ---- 연결
  ports: ["통신할 COM 포트. 장치 이름·USB 정보가 함께 나오고, 꽂으면 1.5초 안에 목록에 나타납니다.", "The COM port to use. Shows the device name and USB info; a newly plugged adapter appears within 1.5 s."],
  port: ["통신할 COM 포트(또는 TCP·UDP 포트 번호).", "The COM port (or the TCP/UDP port number)."],
  // 네트워크 포트 번호 — TCP·UDP·Simulator 용(위 «port» 는 COM 포트 설명)
  netPort: ["네트워크 포트 번호(1~65535). 접속할 때는 장비가 듣는 포트, 서버로 들을 때는 이 PC 의 포트입니다. 0 이면 운영체제가 빈 포트를 고릅니다.", "Network port number (1–65535): the device's port when connecting, or this PC's port when listening. 0 lets the OS pick a free port."],
  baud: ["통신 속도(bps). 장비 설정과 같아야 합니다. 목록에 없으면 숫자를 직접 넣으세요(연결 중에는 Enter 로 적용).", "Line speed in bps — must match the device. Type any value if it is not listed (while connected, press Enter to apply)."],
  dataBits: ["한 글자의 데이터 비트 수. 대부분 8.", "Data bits per character — usually 8."],
  parity: ["오류 검출용 패리티 비트. 장비가 쓰는 것과 같아야 합니다(대부분 없음, Modbus 는 짝수인 경우가 많음).", "Parity bit for error detection — must match the device (usually None; Modbus often uses Even)."],
  stopBits: ["글자 끝의 정지 비트 수. 대부분 1.", "Stop bits at the end of each character — usually 1."],
  flow: ["흐름 제어. 하드웨어(RTS/CTS)면 RTS 를 드라이버가 제어하고, 소프트웨어(XON/XOFF)면 0x11·0x13 바이트가 신호로 쓰입니다.", "Flow control. Hardware (RTS/CTS) lets the driver control RTS; Software (XON/XOFF) uses bytes 0x11/0x13 as signals."],
  autoReconnect: ["USB 를 뽑았다 다시 꽂거나 연결이 끊기면 같은 장치를 찾아 저절로 다시 엽니다.", "Reopens the same device automatically after it is unplugged/replugged or the link drops."],
  connect: ["고른 설정으로 포트를 엽니다. 연결 중에는 포트·방식이 잠깁니다.", "Opens the port with these settings. Port and mode are locked while connected."],
  disconnect: ["연결을 닫습니다. 파일 기록도 멈춥니다.", "Closes the connection and stops file logging."],
  run: ["설정한 방식으로 시작합니다.", "Starts with these settings."],
  stop: ["멈추고 연결을 닫습니다. 파일 기록도 멈춥니다.", "Stops and closes the connection; file logging stops too."],
  inputLine: ["장치가 보내는 입력 신호선. 켜지면 초록색이고, 바뀔 때마다 로그에 사건 줄(EV)이 남습니다.", "Input lines from the device. Green when on; every change is logged as an event (EV)."],

  // ---- 프레임 구분·검사
  framing: ["받은 바이트를 어디서 끊어 한 줄로 볼지 정합니다. 장비 프로토콜에 맞추면 읽기 쉽고 체크섬 검사도 정확해집니다.", "How received bytes are split into lines. Matching the device protocol makes logs readable and checksum checks accurate."],
  gapMs: ["조용한 시간: 이 시간(ms) 동안 아무것도 안 오면 한 줄로 끊습니다. USB 변환기는 16ms 단위로 넘겨서 그보다 짧으면 부정확할 수 있습니다.", "Idle gap: a line ends after this many ms of silence. USB adapters deliver in ~16 ms chunks, so shorter gaps may be inaccurate."],
  terminatorHex: ["끝 문자: 이 바이트(HEX)가 오면 줄을 끊습니다. 예: «0D 0A»(CR LF), «03»(ETX). «0D0A» 처럼 붙여 쓰거나 CR·LF·CRLF·STX·ETX 이름도 됩니다. 어떻게 읽었는지 아래에 보입니다. 보낼 때 붙이는 «줄 끝 붙이기» 와는 별개입니다.", "Terminator: a line ends when these bytes (HEX) arrive, e.g. «0D 0A» (CR LF) or «03» (ETX). «0D0A» or names like CR, LF, CRLF, STX, ETX also work. How it was read is shown below. Separate from the «Line ending» added when sending."],
  length: ["이 바이트 수마다 한 줄로 끊습니다.", "Splits a line every this many bytes."],
  rxCheck: ["받은 줄 끝(끝 문자가 있으면 그 앞)의 체크섬을 검사해 «정상»·«틀림» 을 붙입니다.", "Checks the checksum at the end of each received line (before the terminator) and marks it OK or FAIL."],

  // ---- 보기·로그
  view: ["로그를 HEX·ASCII·둘 다로 봅니다. ASCII 에서 제어 문자는 <CR> <LF> 처럼 보입니다.", "Show the log as HEX, ASCII or both. Control characters appear as <CR>, <LF>, …"],
  autoscroll: ["새 줄이 오면 맨 아래로 따라갑니다. 줄을 누르면 꺼져서 그 자리를 볼 수 있습니다.", "Follows new lines. Clicking a line turns it off so you can inspect it."],
  clear: ["화면의 기록만 지웁니다(파일 기록은 그대로).", "Clears the on-screen log only (file logs are kept)."],
  saveLog: ["지금 화면에 있는 기록을 텍스트 파일로 저장합니다.", "Saves the on-screen log to a text file."],
  saveView: ["지금 화면에 있는 기록을 텍스트 파일로 저장합니다.", "Saves the on-screen log to a text file."],
  logToFile: ["지금부터 모든 송수신·사건을 파일에 계속 덧붙여 남깁니다.", "Appends all traffic and events to a file from now on."],
  // 첫 줄에 설정을 남기는 프로그램(시리얼)용
  logToFileSettings: ["지금부터 모든 송수신·사건을 파일에 계속 덧붙여 남깁니다. 첫 줄에 그때 설정이 기록됩니다.", "Appends all traffic and events to a file from now on. The first line records the current settings."],
  stopLog: ["파일 기록을 멈춥니다.", "Stops file logging."],
  detail: ["로그에서 누른 줄의 HEX·ASCII 전체를 보여 줍니다.", "Shows the full HEX/ASCII of the clicked line."],
  // Modbus 풀이가 있는 프로그램(시리얼)용
  detailModbus: ["로그에서 누른 줄의 HEX·ASCII 전체와 Modbus 풀이를 보여 줍니다.", "Shows the full HEX/ASCII of the clicked line and its Modbus decoding."],

  // ---- 보내기
  checksum: ["보낼 때 본문 뒤에 붙일 체크섬. 순서는 본문 → 체크섬 → 줄 끝입니다.", "Checksum appended to the body. Order: body → checksum → line ending."],
  suffix: ["줄 끝 붙이기: 보낼 때 맨 끝에 붙일 CR, LF, CR LF. 받을 때 줄을 끊는 «끝 문자» 와는 별개입니다.", "Line ending appended last when sending (CR, LF, CR LF). Separate from the receive-side «Terminator»."],
  send: ["입력칸 내용을 보냅니다(Enter 도 됩니다). 실제로 나갈 바이트는 아래 «보낼 바이트» 에 미리 보입니다.", "Sends the input (Enter also works). The exact bytes are previewed below."],
  repeat: ["켜 두면 이 간격(ms)마다 같은 내용을 보냅니다. 앞 송신이 안 끝났으면 그 차례는 건너뛰고, 끊기면 멈춥니다.", "Sends the same input every this many ms while checked. A turn is skipped if the previous send is still running; stops on disconnect."],
  // 시리얼용 — 송신 시간보다 짧은 간격을 자동으로 늘린다
  repeatSerial: ["켜 두면 이 간격(ms)마다 같은 내용을 보냅니다. 송신 시간보다 짧으면 자동으로 늘리고, 끊기면 멈춥니다.", "Sends the same input every this many ms while checked. Raised automatically if shorter than the transmit time; stops on disconnect."],
  // Simulator 용 — 상대가 없으면 기다렸다가 이어서 보낸다
  repeatSim: ["켜 두면 이 간격(ms)마다 같은 내용을 보냅니다. 상대가 아직 없으면 그 차례는 건너뛰고 기다립니다. 체크를 끄거나 «멈춤» 을 눌러야 멈춥니다.", "Sends the same input every this many ms while checked. Turns are skipped while no peer is connected; only unchecking or Stop ends it."],
  commands: ["자주 쓰는 송신 내용을 저장해 두는 목록. ▶ 보내기, ✎ 입력칸으로, ✕ 지우기.", "Saved commands: ▶ send, ✎ load into the input, ✕ delete."],
  edit: ["이 명령을 입력칸으로 불러옵니다.", "Loads this command into the input."],
  delete: ["지웁니다(확인을 묻습니다).", "Deletes it (asks first)."],

  // ---- TCP
  mode: ["클라이언트: 이 PC 가 장비에 접속합니다. 서버: 장비가 이 PC 에 접속합니다.", "Client: this PC connects to the device. Server: the device connects to this PC."],
  host: ["접속할 장비의 IP 주소(또는 이름). 서버 모드에서는 묶을 랜카드 주소입니다.", "IP address (or name) of the device. In server mode, the local interface to bind."],
  noDelay: ["작은 데이터를 모으지 않고 바로 보냅니다(Nagle 끔). 장비 시험에는 켜 두는 것이 좋습니다.", "Sends small packets immediately (Nagle off). Recommended for device testing."],
  reconnectMs: ["끊긴 뒤 다시 접속을 시도하는 간격(ms).", "Interval between reconnect attempts (ms)."],
  echo: ["받은 것을 보낸 쪽으로 그대로 돌려보냅니다. 상대도 에코면 끝없이 주고받으므로 1초에 200번을 넘으면 저절로 꺼집니다.", "Sends received data straight back. If the peer echoes too, it is turned off automatically above 200 per second."],
  peers: ["지금 이 서버에 붙어 있는 상대들. «끊기» 로 하나씩 끊을 수 있습니다.", "Peers connected to this server. «Kick» disconnects one."],
  kick: ["이 상대만 끊습니다.", "Disconnects only this peer."],
  target: ["보낼 상대. «모두에게» 면 붙어 있는 전부에게 보냅니다. 고른 상대가 끊기면 «(끊김)» 으로 남고 보내기가 막힙니다(다른 장비로 새지 않게).", "Who to send to. «All» sends to every connected peer. If the chosen peer disconnects it stays as «(disconnected)» and sending is blocked, so nothing goes to another device."],

  // ---- UDP
  bindHost: ["받을 랜카드 주소. 0.0.0.0 이면 모든 랜카드에서 받습니다.", "Local interface to receive on. 0.0.0.0 receives on all interfaces."],
  bindPort: ["이 PC 가 받을 포트. 0 이면 운영체제가 빈 포트를 고릅니다.", "Port this PC listens on. 0 lets the OS pick a free port."],
  remoteHost: ["기본으로 보낼 장비의 주소.", "Default destination address."],
  remotePort: ["기본으로 보낼 장비의 포트.", "Default destination port."],
  broadcast: ["브로드캐스트 주소(255.255.255.255, x.x.x.255)로 보낼 수 있게 합니다. 시작 전에 켜야 합니다.", "Allows sending to broadcast addresses (255.255.255.255, x.x.x.255). Set before starting."],
  multicast: ["가입할 멀티캐스트 그룹(224.0.0.0~239.255.255.255). 비우면 가입하지 않습니다.", "Multicast group to join (224.0.0.0–239.255.255.255). Leave empty to skip."],
  multicastIf: ["멀티캐스트에 쓸 랜카드 주소. 랜카드가 여러 개일 때 지정합니다.", "Interface used for multicast; set it when the PC has several NICs."],
  rejoin: ["멀티캐스트 그룹에 다시 가입합니다. 무선 랜에서 수신이 끊겼을 때 씁니다.", "Rejoins the multicast group — use it when reception stops on Wi-Fi."],
  senders: ["데이터를 보내온 상대들. «보낼 곳으로» 를 누르면 그 상대에게 보냅니다.", "Addresses that sent data. «Use as destination» sends to that one."],
  useAsRemote: ["이 상대를 보낼 곳으로 고릅니다.", "Sends to this sender."],

  // ---- Modbus Slave
  slaves: ["흉내 낼 슬레이브 주소(1~247). 주소마다 표가 따로 있고, 누르면 그 표를 봅니다.", "Slave IDs to simulate (1–247). Each has its own tables; click one to view it."],
  addSlave: ["입력한 주소를 추가합니다(Enter 도 됩니다).", "Adds the typed ID (Enter also works)."],
  faults: ["마스터(PLC·HMI·검사 프로그램)의 오류 처리를 시험하려고 일부러 이상하게 답합니다. 켜져 있으면 ⚠ 표시가 납니다.", "Deliberately misbehaves to test the master's error handling. A ⚠ appears while active."],
  delay: ["응답을 이만큼(ms) 늦게 보냅니다. 기다리는 동안 온 요청은 실제 장비처럼 무시(BUSY)합니다.", "Delays each reply by this many ms. Requests arriving meanwhile are ignored (BUSY), like a real device."],
  noResponse: ["요청에 아무 답도 하지 않습니다(마스터 타임아웃 시험).", "Never replies (tests the master's timeout)."],
  badCrc: ["응답의 CRC 를 일부러 틀리게 보냅니다(마스터 CRC 검사 시험).", "Sends replies with a wrong CRC (tests the master's CRC check)."],
  forceException: ["모든 요청에 이 예외 코드로 답합니다.", "Answers every request with this exception code."],
  stats: ["받은 요청·정상 응답·예외·무시 횟수.", "Counts of requests, OK replies, exceptions and ignored frames."],
  start: ["표에서 볼(그리고 응답할) 시작 주소. 바꾸면 마스터가 읽을 수 있는 범위도 바뀝니다 — 범위 밖을 읽으면 예외 02 로 답합니다.", "First address to show (and answer). Changing it also changes what the master can read — reads outside get exception 02."],
  count: ["시작 주소부터 몇 칸을 쓸지(마스터가 읽을 수 있는 범위). 화면에는 처음 2000칸까지 보입니다.", "How many addresses from the start (also the range the master can read). The screen shows up to 2000."],
  format: ["레지스터 값을 U16(0~65535)·S16(음수)·HEX·BIN 으로 보고 입력합니다.", "View and enter register values as U16, S16, HEX or BIN."],
  fill: ["보이는 칸을 0, 1, 2… 로 채웁니다(확인을 묻습니다).", "Fills the visible cells with 0, 1, 2… (asks first)."],
  exportTable: ["지금 표의 범위 전체를 JSON 파일로 저장합니다.", "Saves the whole range of this table to a JSON file."],
  importTable: ["JSON 파일의 값을 지금 표에 넣습니다. 다른 표의 파일이면 확인을 묻습니다.", "Loads values from a JSON file into this table; asks if the file is for another table."],
  reset: ["통계를 0 으로 되돌립니다.", "Resets the statistics."],

  // ---- Simulator
  transport: ["장비를 흉내 낼 연결 방식. 시리얼, TCP 서버(상대가 접속), TCP 클라이언트(상대에 접속), UDP.", "How the simulated device connects: Serial, TCP server, TCP client or UDP."],
  rules: ["받은 것이 패턴에 맞으면 정해 둔 응답을 보냅니다. 위에서부터 처음 맞는 규칙 하나만 답합니다.", "When a frame matches a pattern, the reply is sent. Only the first matching rule (top-down) replies."],
  arWhen: ["이 패턴을 받으면. HEX 는 ??(1바이트)·**(0개 이상), ASCII 는 ?(1글자)·*(0개 이상)가 와일드카드입니다. «STATUS?» 처럼 ?·* 글자 자체를 맞추려면 \\x3F·\\x2A 로 쓰세요.", "Pattern to match. HEX wildcards: ?? (one byte), ** (zero or more); ASCII wildcards: ? (one char), * (zero or more). To match a literal ? or * (e.g. SCPI «STATUS?»), write \\x3F or \\x2A."],
  arExact: ["정확히: 줄 전체가 패턴과 같아야 합니다. «끝 문자 떼고 비교» 가 켜져 있으면 끝 문자와 뒤쪽 CR·LF 는 빼고 비교합니다.", "Exact: the whole line must match. With «Ignore line ending when matching» on, the terminator and trailing CR/LF are removed first."],
  arContains: ["포함: 줄 안 어딘가에 패턴이 있으면 됩니다.", "Contains: the pattern may appear anywhere in the line."],
  arReply: ["보낼 응답. 체크섬과 줄 끝을 고르면 자동으로 붙습니다.", "Reply to send; the chosen checksum and line ending are appended automatically."],
  arDelay: ["응답을 이만큼(ms) 늦게 보냅니다(실제 장비의 처리 시간 흉내).", "Delays the reply by this many ms (to mimic the device's processing time)."],
  arAdd: ["새 규칙을 맨 아래에 추가합니다.", "Adds a new rule at the bottom."],
  hits: ["이 규칙이 응답한 횟수.", "How many times this rule replied."],
  resetHits: ["응답 횟수를 0 으로 되돌립니다.", "Resets the reply counts."],
  exportRules: ["규칙 전체와 연결 방식·주소·포트·프레임 구분·비교 옵션·«장비가 먼저 보내기» 설정을 한 파일로 저장합니다. 장비별 흉내 설정(프로필)으로 나눠 쓸 수 있습니다.", "Saves all rules plus transport, addresses/ports, framing, match options and the device-initiated message to one file — a per-device profile."],
  importRules: ["저장해 둔 규칙 묶음(프로필)을 불러옵니다. 지금 규칙·설정을 바꾸기 전에 확인을 묻습니다. 실행 중에는 연결 설정은 빼고 불러옵니다.", "Loads a saved rule set (profile). Asks before replacing the current rules and settings; while running, connection settings are left unchanged."],
  matchStrip: ["켜면 받은 줄 끝의 끝 문자와 뒤쪽 CR·LF 를 떼고 패턴과 비교합니다. 그래서 «STATUS?<CR><LF>» 가 «STATUS\\x3F» 에 «정확히» 맞습니다.", "When on, the terminator and trailing CR/LF are removed before matching, so «STATUS?<CR><LF>» exactly matches «STATUS\\x3F»."],
  logNoMatch: ["켜면 어떤 규칙에도 맞지 않은 요청을 통신 기록에 «NO MATCH» 사건(EV)으로 남깁니다. 응답이 안 나가는 이유를 찾을 때 씁니다.", "When on, requests no rule matched are logged as a «NO MATCH» event (EV) — useful to find why no reply was sent."],
  unsolicited: ["장비가 요청 없이 먼저 보내는 것(상태 보고·하트비트)을 흉내 냅니다. 반복을 켜면 주기적으로 보내고, 상대가 없을 때는 기다렸다가 이어서 보냅니다.", "Mimics data the device sends on its own (status, heartbeat); enable repeat to send periodically — it waits while no peer is connected."],
  traffic: ["주고받은 데이터와 사건(AUTO 규칙 이름 등).", "Traffic and events (e.g. AUTO with the rule name)."],
  moveUp: ["위로 — 먼저 검사됩니다.", "Move up — checked earlier."],
  moveDown: ["아래로.", "Move down."],
};

export function tip(lang: "ko" | "en", key: string) {
  const t = TIPS[key];
  return t ? t[lang === "ko" ? 0 : 1] : undefined;
}

export const TIP_KEYS = Object.keys(TIPS);
