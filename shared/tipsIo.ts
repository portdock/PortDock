// 말풍선 — Serial·TCP·UDP 공통 기능(이력·단축키·간격·인코딩·처리량·반복 횟수·파일·로그 형식·트리거·체크섬 옵션·터미널·Break·RS-485).
// shared/tips.ts 의 TIPS 에 합쳐진다(키가 겹치지 않게 이 파일만 고친다).
type Tip = [ko: string, en: string];

export const IO_TIPS: Record<string, Tip> = {
  sendText: [
    "보낼 내용. Enter 로 보내고, ↑/↓ 로 앞서 보낸 내용(최근 50개, 모드 포함)을 불러옵니다. 고치던 글은 맨 아래에서 ↓ 로 돌아옵니다.",
    "What to send. Enter sends; ↑/↓ recall earlier sends (last 50, with their mode). Your unsent edit returns with ↓ at the bottom.",
  ],
  charDelay: [
    "보낼 때 바이트 사이에 둘 시간(ms). 느린 장비(버퍼 작은 PLC·단말)가 글자를 놓칠 때 씁니다. 0 이면 한꺼번에.",
    "Pause between bytes when sending (ms) — for slow devices that drop characters. 0 sends everything at once.",
  ],
  fileSend: [
    "파일 내용을 바이트 그대로 보냅니다 — 덩어리·줄 단위, 문자 간·줄 간 지연, 진행 막대와 취소.",
    "Sends a file byte for byte — in chunks or lines, with character/line delays, a progress bar and cancel.",
  ],
  fileMode: [
    "덩어리: 정한 바이트 수씩. 줄 단위: LF·CR LF·CR 뒤에서 끊어 줄마다 보내고 «줄 사이 지연» 만큼 쉽니다(장비가 한 줄씩 처리할 때).",
    "Chunks: a fixed number of bytes at a time. Lines: split after LF, CR LF or CR and pause «between lines» (for devices that process one line at a time).",
  ],
  delta: [
    "시각 옆 시간 간격 열 — «직전 줄과 간격»: 바로 앞 RX·TX 줄부터 지난 시간, «응답 시간»: 마지막 TX 부터 이 RX 까지. 복사·화면 저장에도 들어갑니다.",
    "Time gap column next to the time — «Gap from previous line»: time since the previous RX/TX line; «Response time»: from the last TX to this RX. Included in copy and Save view.",
  ],
  liveStats: [
    "최근 1초 받은·보낸 바이트/초, 프레임 수(지우기 뒤로), 마지막으로 받은 때. 10초 넘게 조용하면 빨갛게 바뀝니다.",
    "Bytes/s received and sent over the last second, frame counts (since Clear) and the time of the last RX. Turns red after 10 s of silence.",
  ],
  repeatTimes: [
    "반복을 이 횟수만큼 보내고 저절로 멈춥니다(0 = 끌 때까지). 옆에 보낸 횟수가 나옵니다.",
    "Repeat stops by itself after this many sends (0 = until turned off). The sent count is shown next to it.",
  ],
  encoding: [
    "받은 글자를 읽고 ASCII 로 보낼 때 쓰는 인코딩. 한국 장비 대부분 CP949(EUC-KR), 유럽 장비 Latin-1. 읽을 수 없는 바이트는 <XX> 로 보입니다.",
    "Encoding for showing received text and for ASCII sends. Korean devices mostly use CP949 (EUC-KR), European ones Latin-1. Unreadable bytes show as <XX>.",
  ],
  logFormat: [
    "«파일로 계속 저장» 의 줄 모양. CSV 는 엑셀에서 바로 열 수 있습니다(ts,dir,len,hex,ascii,check,note,peer).",
    "Line format of «Log to file». CSV opens directly in Excel (ts,dir,len,hex,ascii,check,note,peer).",
  ],
  logSplitDaily: [
    "자정을 넘으면 «이름-날짜.log» 새 파일로 이어 씁니다. 오래 켜 두는 기록을 날짜별로 나눌 때.",
    "After midnight, logging continues in a new «name-date.log» file — to split long-running logs by date.",
  ],
  logKeepDays: [
    "기록을 시작할 때·다음 파일로 넘어갈 때, 같은 폴더의 같은 이름 갈래 로그 중 고친 지 이 날 수가 지난 것을 지웁니다. 0 = 지우지 않음.",
    "When logging starts and at each new file, deletes logs of the same name family in the same folder last modified more than this many days ago. 0 = never.",
  ],
  triggers: [
    "받은 줄에 패턴이 오면: 줄 색칠, 소리, 반복 멈춤, 파일 기록 멈춤, 사건 줄, 작업 표시줄 깜빡임. 패턴은 자동응답과 같은 와일드카드(?? ** / ? *).",
    "When a received line contains a pattern: color the line, beep, stop repeat, stop file logging, add an event line, flash the taskbar. Wildcards as in auto reply (?? ** / ? *).",
  ],
  ckOptions: [
    "체크섬 옵션 — 앞에서 n바이트 빼고 계산, 끝에서 m바이트 앞에 넣기(ETX 앞), 바이트 순서 뒤집기, 범용 CRC 매개변수.",
    "Checksum options — leave out leading bytes, insert m bytes before the end (before ETX), reverse byte order, custom CRC parameters.",
  ],
  termView: [
    "터미널 보기 — 받은 글자를 프레임과 상관없이 CR·LF 로 줄을 나누고 ANSI 색을 입혀 보입니다(리눅스 콘솔·부트 로그). 긴 줄은 접어 보입니다.",
    "Terminal view — joins received text across frames, starts new lines at CR/LF and renders ANSI colors (Linux console, boot logs). Long lines wrap.",
  ],
  breakBtn: [
    "Break 신호 — TX 줄을 정한 시간 동안 0(스페이스)으로 붙잡습니다. LIN·DMX·일부 장비의 «주의» 신호, 부트로더 진입에 씁니다. 로그에 «BREAK 100ms».",
    "Break — holds the TX line at 0 (space) for the set time. Used for LIN/DMX, some devices' attention signal and bootloader entry. Logged as «BREAK 100ms».",
  ],
  breakMs: ["Break 길이(ms, 1~10000). 보통 100ms.", "Break length in ms (1–10000). Usually 100 ms."],
  paritySerial: [
    "패리티. 장비와 같아야 합니다(대부분 없음, Modbus 는 짝수가 흔함). Mark(늘 1)·Space(늘 0)는 9비트 주소 방식 장비용 — 일부 USB 변환기는 받지 않습니다.",
    "Parity — must match the device (usually None; Modbus often Even). Mark (always 1) and Space (always 0) are for 9-bit addressing devices; some USB adapters refuse them.",
  ],
  stopBitsSerial: [
    "글자 끝의 정지 비트 수. 대부분 1. 1.5 는 데이터 비트 5 에서만 쓰는 경우가 많습니다.",
    "Stop bits at the end of each character — usually 1. 1.5 is normally used only with 5 data bits.",
  ],
  rs485: [
    "RS-485 반이중 — 보낼 때만 RTS 를 켜 송신기를 켭니다. 드라이버 토글이 정확하고, 드라이버가 받지 않으면 프로그램 토글로 바뀝니다. 자동 방향 전환 변환기는 «쓰지 않음».",
    "RS-485 half duplex — RTS is raised only while sending to enable the driver. The driver toggle is precise; if the driver refuses it, the program toggles instead. Use «Off» for auto-direction adapters.",
  ],
};
