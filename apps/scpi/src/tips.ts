// SCPI 말풍선 — 이 앱에만 있는 칸. 공통 칸(포트·속도·연결·지우기 …)은 shared/tips.ts 의 것을 그대로 쓴다.
// (shared/tips.ts 로 옮길 때는 키 앞에 «sc» 를 붙인 그대로 옮기면 된다)
import { tip as sharedTip } from "@shared/tips";

type Tip = [ko: string, en: string];

const TIPS: Record<string, Tip> = {
  scTransport: [
    "LAN 은 계측기의 «소켓»(SCPI raw socket, 보통 TCP 5025)으로, 시리얼은 RS-232 로 붙습니다. VISA 는 필요 없습니다. VXI-11·HiSLIP·USBTMC·GPIB 는 아직 하지 않습니다.",
    "LAN uses the instrument's «socket» service (raw SCPI, usually TCP 5025); Serial uses RS-232. No VISA needed. VXI-11, HiSLIP, USBTMC and GPIB are not supported yet.",
  ],
  scHost: ["계측기의 IP 주소(또는 이름). 장비 앞 패널의 LAN 설정에 나옵니다. 모르면 PortDock Net Scan 으로 찾을 수 있습니다.", "The instrument's IP address (or host name), shown in its front-panel LAN settings. PortDock Net Scan can find it."],
  scNetPort: ["SCPI 소켓 포트. 대부분 5025(Keysight·R&S·Rigol·Siglent 등). 5024 는 사람이 치는 텔넷 꼴이라 쓰지 마세요.", "SCPI socket port — 5025 on most instruments (Keysight, R&S, Rigol, Siglent …). Avoid 5024, the interactive telnet variant."],
  scFlow: ["RS-232 흐름 제어 — 장비 설정과 같게. DTR 은 늘 켭니다(DTR/DSR 를 쓰는 장비가 많음).", "RS-232 flow control — match the instrument. DTR is always on (many instruments use DTR/DSR)."],
  scTerm: [
    "보낼 때 명령 끝에 붙이는 줄 끝이자 받을 때 응답 끝. 대부분 LF. CR 이면 CR 에서 끊고, 그 밖에는 LF 에서 끊으며 앞의 CR 은 뗍니다. 연결 중에도 바꿀 수 있습니다.",
    "Added after each command and expected at the end of replies — usually LF. With CR, replies end at CR; otherwise at LF with a preceding CR removed. Can change while connected.",
  ],
  scComm: ["응답 기다림 시간과 *OPC? 기다림 시간.", "Response timeout and *OPC? wait time."],
  scTimeout: ["질의·읽기에서 답을 기다리는 최대 시간(ms). 느린 측정(긴 적분 시간·자체 시험)은 늘리세요.", "Longest wait for a reply to a query or read (ms). Raise it for slow measurements (long integration, self-test)."],
  scOpcTimeout: ["«*OPC? 기다림» 의 기다림(ms) — 오래 걸리는 동작(스윕·초기화)이 끝나기를 기다립니다.", "Wait for «Wait *OPC?» (ms) — long operations (sweeps, initialisation) to finish."],
  scAutoIdn: ["연결하자마자 *IDN? 을 물어 제조사·모델·일련번호·펌웨어를 «장비» 칸에 보입니다.", "Asks *IDN? right after connecting and shows maker, model, serial number and firmware in «Instrument»."],
  scIdn: ["*IDN? 응답(IEEE 488.2) — 제조사, 모델, 일련번호, 펌웨어. «다시 묻기» 로 새로 묻습니다.", "The *IDN? reply (IEEE 488.2) — maker, model, serial number, firmware. «Ask again» re-asks."],
  scQIdn: ["*IDN? — 장비 식별.", "*IDN? — identify the instrument."],
  scQRst: ["*RST — 장비를 초기 설정으로 되돌립니다(측정 범위·출력 설정이 바뀝니다).", "*RST — reset the instrument to its default setup (ranges and output settings change)."],
  scQCls: ["*CLS — 상태 레지스터와 오류 큐를 지웁니다.", "*CLS — clear the status registers and the error queue."],
  scQErr: ["SYST:ERR? 를 «0,\"No error\"» 가 나올 때까지(최대 50번) 물어 쌓인 오류를 모두 꺼내 보입니다.", "Asks SYST:ERR? until «0,\"No error\"» (up to 50 times) and lists every queued error."],
  scQOpc: ["*OPC? — 앞 명령이 다 끝나면 장비가 1 을 답합니다. «*OPC? 기다림» 시간까지 기다립니다.", "*OPC? — the instrument answers 1 when pending operations finish. Waits up to the «*OPC? timeout»."],
  scCmd: [
    "보낼 SCPI 명령. 목록에서 고르거나 직접 씁니다(짧은 꼴 MEAS:VOLT:DC?·긴 꼴 MEASURE:VOLTAGE:DC? 모두). Enter 는 ? 로 끝나면 질의, 아니면 쓰기. ↑↓ 로 앞서 보낸 명령.",
    "SCPI command to send — pick from the list or type (short MEAS:VOLT:DC? or long MEASURE:VOLTAGE:DC? form). Enter queries if it ends in ?, otherwise writes. ↑↓ recalls earlier commands.",
  ],
  scQuery: ["보내고 답 하나를 기다립니다(응답 시간 표시). 블록 데이터(#…)는 길이만큼 받습니다.", "Sends and waits for one reply (with response time). Block data (#…) is read by its length header."],
  scWrite: ["보내기만 합니다 — 답을 기다리지 않습니다(설정 명령).", "Sends only — no reply is awaited (setting commands)."],
  scRead: ["보내지 않고 답 하나를 읽습니다 — «쓰기» 로 보낸 질의의 답을 받을 때.", "Reads one reply without sending — for the answer to a query sent with «Write»."],
  scStop: ["기다리는 질의를 멈춥니다(연결은 그대로). Esc 도 됩니다.", "Stops the pending query (stays connected). Esc works too."],
  scToList: ["지금 명령을 오른쪽 명령 목록에 넣습니다.", "Adds this command to the command list on the right."],
  scSaveBlock: ["마지막으로 받은 블록 데이터(머리 #… 뺀 몸통)를 그대로 파일에 저장합니다. 그림(PNG·BMP)이면 그 확장자를 권합니다.", "Saves the last block's data (without the #… header) to a file. PNG/BMP images get that extension."],
  scMeasCmd: ["반복해서 물을 질의 — 숫자로 답하는 것(MEAS:VOLT:DC?·READ?·FETC? 등). 여러 값이면 첫 값을 씁니다.", "The query to repeat — one that answers with a number (MEAS:VOLT:DC?, READ?, FETC? …). With several values, the first is used."],
  scInterval: ["측정 시작 간격(ms). 응답이 더 오래 걸리면 끝나자마자 다음을 묻습니다.", "Interval between measurement starts (ms). If a reply takes longer, the next starts right after it."],
  scCount: ["몇 번 잴지. 0 이면 «멈춤» 까지 계속.", "How many readings. 0 runs until «Stop»."],
  scMStart: ["반복 측정을 시작·멈춥니다. 시간 초과는 «실패» 로 남기고 계속, 연결이 끊기면 멈춥니다. Esc 로도 멈춥니다.", "Starts/stops repeat measurement. Timeouts are recorded as failures and it continues; it stops if the connection drops. Esc stops it too."],
  scCsv: ["측정 값을 CSV(엑셀)로 저장 — 번호·시각·응답 시간·값·응답 글.", "Saves readings as CSV (Excel) — index, time, response time, value, reply text."],
  scChart: ["숫자 값의 추세 — 최근 1000개. 위·아래 끝 수는 그림 안 최댓값·최솟값.", "Trend of numeric values — the latest 1000. The numbers at the edges are the max and min shown."],
  scShowSum: ["기록 줄에 응답 시간(보낸 뒤 답이 끝날 때까지 ms)과 블록 크기를 붙입니다.", "Adds the response time (ms from sending to the end of the reply) and block size to log lines."],
  scTraffic: ["보낸 명령(TX ▶)·받은 응답(RX ◀)·사건(EV). 제어 문자는 <CR>·<LF> 로 보입니다. 시간 초과·끊김은 빨간 사건 줄.", "Sent commands (TX ▶), replies (RX ◀) and events (EV). Control characters show as <CR>, <LF>. Timeouts and disconnects are red event lines."],
  scSaveScreen: ["화면의 통신 기록을 글 파일로 저장합니다(찾기·거르기가 켜져 있으면 보이는 줄만).", "Saves the on-screen traffic as a text file (only the visible lines when a filter is on)."],
};

/** 이 앱 말풍선 — 없으면 공용(shared/tips.ts) */
export function tip(lang: "ko" | "en", key: string) {
  const t = TIPS[key];
  return t ? t[lang === "ko" ? 0 : 1] : sharedTip(lang, key);
}

export const SCPI_TIP_KEYS = Object.keys(TIPS);
