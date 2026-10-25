// 웹 시리얼 터미널의 브라우저 API 를 쓰지 않는 부분 — 설정 검사·보낼 바이트 만들기·받은 바이트 끊기·표시·로그 글.
// Web Serial 호출(navigator.serial)은 views/WebSerialPage.astro 의 <script> 에만 둔다. 시험: webSerial.test.ts
// 설정 값의 범위는 WICG Web Serial 명세의 SerialOptions(MDN SerialPort.open() 과 같음)를 따른다.
import { compute, hex, parseAscii, parseHex, toEscaped, type ChecksumKind, type Lang } from "./checksum.ts";

export type { Lang };
const msg = (lang: Lang, ko: string, en: string) => (lang === "ko" ? ko : en);

/** 화면에 내놓는 보레이트 — 다른 값은 직접 입력(명세는 0 보다 큰 정수면 받는다) */
export const BAUDS = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

export type Parity = "none" | "even" | "odd";
export type Flow = "none" | "hardware";

/** SerialOptions 와 같은 모양(명세: dataBits 7|8, stopBits 1|2, parity none|even|odd, flowControl none|hardware) */
export interface PortOptions {
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: Parity;
  flowControl: Flow;
}

/** 화면 칸(글자) → open() 에 넘길 설정. 틀리면 Error(사람이 읽는 이유) */
export function portOptions(
  f: { baud: string; dataBits: string; stopBits: string; parity: string; flow: string },
  lang: Lang = "ko",
): PortOptions {
  const b = f.baud.trim();
  if (!/^\d+$/.test(b) || Number(b) <= 0 || Number(b) > 0xffffffff)
    throw new Error(msg(lang, `보레이트는 0 보다 큰 정수여야 합니다: «${f.baud}»`, `Baud rate must be a positive integer: «${f.baud}»`));
  if (f.dataBits !== "7" && f.dataBits !== "8") throw new Error(msg(lang, "데이터 비트는 7 또는 8 입니다", "Data bits must be 7 or 8"));
  if (f.stopBits !== "1" && f.stopBits !== "2") throw new Error(msg(lang, "정지 비트는 1 또는 2 입니다", "Stop bits must be 1 or 2"));
  if (f.parity !== "none" && f.parity !== "even" && f.parity !== "odd") throw new Error(msg(lang, "패리티는 none·even·odd 입니다", "Parity must be none, even or odd"));
  if (f.flow !== "none" && f.flow !== "hardware") throw new Error(msg(lang, "흐름 제어는 none·hardware 입니다", "Flow control must be none or hardware"));
  return {
    baudRate: Number(b),
    dataBits: Number(f.dataBits) as 7 | 8,
    stopBits: Number(f.stopBits) as 1 | 2,
    parity: f.parity,
    flowControl: f.flow,
  };
}

/** «9600 8N1» 같은 짧은 표기 */
export const optionsLabel = (o: PortOptions) =>
  `${o.baudRate} ${o.dataBits}${o.parity[0].toUpperCase()}${o.stopBits}${o.flowControl === "hardware" ? " RTS/CTS" : ""}`;

export type Eol = "none" | "cr" | "lf" | "crlf";
export const EOL_BYTES: Record<Eol, number[]> = { none: [], cr: [13], lf: [10], crlf: [13, 10] };

export type SendMode = "hex" | "ascii";

/** 보낼 바이트 = 본문 + 체크섬(본문으로 계산) + 끝 문자 — PortDock Serial 의 보내기와 같은 순서 */
export function buildTx(text: string, mode: SendMode, checksum: ChecksumKind | "none", eol: Eol, lang: Lang = "ko"): number[] {
  const body = mode === "hex" ? parseHex(text, lang) : parseAscii(text, lang);
  const sum = checksum === "none" ? [] : compute(checksum, body);
  return [...body, ...sum, ...EOL_BYTES[eol]];
}

export type Dir = "rx" | "tx" | "ev";
/** 로그 한 줄 — ev 는 연결·끊김 같은 알림(text) */
export interface Entry {
  dir: Dir;
  /** 받은·보낸 시각(ms, Date.now()) */
  t: number;
  bytes: number[];
  text?: string;
}

export type Split = "lf" | "idle";

/**
 * 받은 바이트 묶기. 읽기 한 번에 오는 조각은 장비·드라이버마다 제멋대로라 그대로 보이면 읽기 어렵다.
 * - "idle": gapMs 동안 새 바이트가 없으면 한 줄로 끊는다(프레임 단위 장비 — Modbus RTU 등).
 * - "lf": LF(0A) 를 받을 때마다 끊고, LF 없이 gapMs 가 지나도 남은 것을 내보낸다(글자 장비).
 * 어느 쪽이든 maxLen 바이트가 차면 끊는다. 시각은 그 줄 첫 바이트를 받은 때.
 */
export class RxFramer {
  private buf: number[] = [];
  private first = 0;
  private last = 0;
  split: Split;
  gapMs: number;
  maxLen: number;
  // 매개변수 속성(public x) 은 node --test 의 타입 지우기가 받지 않아 풀어 쓴다
  constructor(split: Split = "lf", gapMs = 20, maxLen = 1024) {
    this.split = split;
    this.gapMs = gapMs;
    this.maxLen = maxLen;
  }

  /** 새로 받은 조각 → 끊어진 줄들(남은 것은 안에 둔다) */
  push(chunk: ArrayLike<number>, now: number): Entry[] {
    const out = this.due(now) ? this.flush() : [];
    for (let i = 0; i < chunk.length; i++) {
      if (!this.buf.length) this.first = now;
      const b = chunk[i];
      this.buf.push(b);
      if ((this.split === "lf" && b === 10) || this.buf.length >= this.maxLen) out.push(...this.flush());
    }
    this.last = now;
    return out;
  }

  /** 남은 바이트가 있고 gapMs 가 지났는가 — 화면 쪽 타이머가 묻는다 */
  due(now: number) {
    return this.buf.length > 0 && now - this.last >= this.gapMs;
  }

  /** 남은 것을 한 줄로(없으면 빈 배열) */
  flush(): Entry[] {
    if (!this.buf.length) return [];
    const e: Entry = { dir: "rx", t: this.first, bytes: this.buf };
    this.buf = [];
    return [e];
  }
}

const p2 = (n: number) => String(n).padStart(2, "0");

/** 이 PC 시각 «HH:MM:SS.mmm» */
export function formatTime(ms: number) {
  const d = new Date(ms);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

/** 저장 파일 이름 «web-serial-YYYYMMDD-HHMMSS.txt» */
export function logFileName(ms: number) {
  const d = new Date(ms);
  return `web-serial-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}.txt`;
}

export type View = "hex" | "ascii";

/** 바이트 → 보이는 글자. ASCII 는 \r \n \xNN 꼴(lib/checksum.ts 의 toEscaped — 그대로 복사해 보내면 같은 바이트) */
export const showBytes = (bytes: number[], view: View) => (view === "hex" ? hex(bytes) : toEscaped(bytes));

const TAG: Record<Dir, string> = { rx: "RX", tx: "TX", ev: "--" };

/** 로그 한 줄 글 «12:00:00.123 RX 01 03 …» */
export function formatEntry(e: Entry, view: View, time: boolean) {
  const body = e.dir === "ev" ? (e.text ?? "") : showBytes(e.bytes, view);
  return `${time ? formatTime(e.t) + " " : ""}${TAG[e.dir]} ${body}`;
}

/** 텍스트 파일로 저장할 글 — 윈도우 메모장에서 그대로 열리게 CRLF */
export const logToText = (entries: Entry[], view: View, time: boolean) =>
  entries.map((e) => formatEntry(e, view, time)).join("\r\n") + (entries.length ? "\r\n" : "");

/** 로그가 끝없이 커지지 않게 — 오래된 것부터 버린다 */
export function trimLog(entries: Entry[], max: number) {
  if (entries.length > max) entries.splice(0, entries.length - max);
  return entries;
}
