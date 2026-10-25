// 웹 도구 «시리얼 통신 시간 계산기» — 보율·문자 형식에서 비트·문자 시간, Modbus RTU 의 t1.5·t3.5, 프레임 전송 시간, 폴링 주기를 낸다.
// 근거: MODBUS over serial line specification and implementation guide V1.02 (Modbus-IDA, 2006-12-20)
//   §2.5.1   RTU 한 문자 = 시작 1 + 데이터 8 + 패리티 1 + 정지 1 = 11 비트, 패리티 없음이면 정지 2 비트
//   §2.5.1.1 t1.5·t3.5 는 19200 bps 이하에서 문자 시간으로 지키고, 그보다 빠르면 고정값 750 µs·1.750 ms 를 권장
//   §2.4.1   응답 시간 제한(Response time-out)은 응용에 따라 정하며 9600 bps 에서 보통 1 s ~ 수 초, 방송 뒤 대기(Turnaround delay)는 보통 100~200 ms
// 프레임 길이: MODBUS Application Protocol Specification V1.1b3 의 각 함수 요청·응답 모양 + RTU 국번 1 바이트·CRC 2 바이트.

export type Parity = "none" | "even" | "odd";

export interface CharFormat {
  dataBits: 7 | 8;
  parity: Parity;
  stopBits: 1 | 2;
}

/** 한 문자를 보내는 데 드는 비트 수(시작 비트 포함) */
export const bitsPerChar = (f: CharFormat) => 1 + f.dataBits + (f.parity === "none" ? 0 : 1) + f.stopBits;

/** RTU 규격이 정한 문자 형식인가(8 데이터 비트, 패리티 있으면 정지 1·없으면 정지 2 → 11 비트) */
export const isRtuFormat = (f: CharFormat) => f.dataBits === 8 && bitsPerChar(f) === 11;

/** 19200 bps 를 넘으면 t1.5·t3.5 를 고정값으로 쓰라는 규격 권장(§2.5.1.1) */
export const FIXED_T15 = 0.00075;
export const FIXED_T35 = 0.00175;
export const FIXED_ABOVE = 19200;

export interface Timing {
  /** 초 단위 */
  bit: number;
  char: number;
  /** 1 초에 보낼 수 있는 최대 문자(바이트) 수 */
  charsPerSec: number;
  t15: number;
  t35: number;
  /** t1.5·t3.5 가 규격 권장 고정값인가 */
  fixed: boolean;
}

export function timing(baud: number, f: CharFormat): Timing {
  if (!Number.isFinite(baud) || baud <= 0) throw new RangeError("baud");
  const bit = 1 / baud;
  const char = bitsPerChar(f) * bit;
  const fixed = baud > FIXED_ABOVE;
  return { bit, char, charsPerSec: baud / bitsPerChar(f), t15: fixed ? FIXED_T15 : 1.5 * char, t35: fixed ? FIXED_T35 : 3.5 * char, fixed };
}

/** 바이트 n 개를 쉬지 않고 보내는 시간(초) */
export const bytesTime = (n: number, baud: number, f: CharFormat) => (n * bitsPerChar(f)) / baud;

export type Fc = 1 | 2 | 3 | 4 | 5 | 6 | 15 | 16;

/** 함수별 개수 한도(Application Protocol V1.1b3) — 05·06 은 1 */
export const QTY_MAX: Record<Fc, number> = { 1: 2000, 2: 2000, 3: 125, 4: 125, 5: 1, 6: 1, 15: 1968, 16: 123 };

/** RTU 요청·정상 응답 바이트 수(국번·CRC 포함). 예외 응답은 5 바이트 */
export function frameBytes(fc: Fc, qty: number): { req: number; res: number } {
  if (!Number.isInteger(qty) || qty < 1 || qty > QTY_MAX[fc]) throw new RangeError("qty");
  const bits = Math.ceil(qty / 8);
  switch (fc) {
    case 1:
    case 2:
      return { req: 8, res: 5 + bits };
    case 3:
    case 4:
      return { req: 8, res: 5 + 2 * qty };
    case 5:
    case 6:
      return { req: 8, res: 8 };
    case 15:
      return { req: 9 + bits, res: 8 };
    case 16:
      return { req: 9 + 2 * qty, res: 8 };
  }
}

export const EXCEPTION_BYTES = 5;

export interface PollInput {
  baud: number;
  format: CharFormat;
  fc: Fc;
  qty: number;
  /** 슬레이브가 요청 끝에서 응답 첫 바이트까지 쓰는 시간(초) — 장비 매뉴얼 값이나 실측 */
  slaveDelay: number;
  /** 마스터가 거래 사이에 더 쉬는 시간(초) */
  masterGap: number;
  /** 한 바퀴에 묻는 거래 수(장비 수 × 장비당 요청 수) */
  transactions: number;
}

export interface PollResult {
  t: Timing;
  req: number;
  res: number;
  reqTime: number;
  resTime: number;
  /** 거래 하나: 요청 + 슬레이브 처리 + 응답 + 다음 요청 전 t3.5 + 마스터 쉼 */
  transaction: number;
  /** 한 바퀴(모든 거래) */
  cycle: number;
  /** 요청 끝부터 응답 끝까지 — 응답 시간 제한은 적어도 이보다 길어야 한다 */
  minTimeout: number;
  /** 선로가 실제 바이트로 차 있는 비율 */
  busUse: number;
}

export function poll(p: PollInput): PollResult {
  for (const v of [p.slaveDelay, p.masterGap]) if (!Number.isFinite(v) || v < 0) throw new RangeError("delay");
  if (!Number.isInteger(p.transactions) || p.transactions < 1) throw new RangeError("transactions");
  const t = timing(p.baud, p.format);
  const { req, res } = frameBytes(p.fc, p.qty);
  const reqTime = bytesTime(req, p.baud, p.format);
  const resTime = bytesTime(res, p.baud, p.format);
  const transaction = reqTime + p.slaveDelay + resTime + t.t35 + p.masterGap;
  return {
    t,
    req,
    res,
    reqTime,
    resTime,
    transaction,
    cycle: transaction * p.transactions,
    minTimeout: p.slaveDelay + resTime,
    busUse: (reqTime + resTime) / transaction,
  };
}

/** 표에 쓰는 보율 */
export const BAUDS = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];

/** 시간 보기 — 1 ms 미만은 µs, 1 s 이상은 s */
export function fmtTime(sec: number) {
  if (!Number.isFinite(sec)) return "";
  const a = Math.abs(sec);
  const trim = (x: number, d: number) => {
    const s = x.toFixed(d);
    return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
  };
  if (a < 1e-3) return `${trim(sec * 1e6, 1)} µs`;
  if (a < 1) return `${trim(sec * 1e3, 3)} ms`;
  return `${trim(sec, 3)} s`;
}
