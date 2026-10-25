// 화면 없는 부분 — *IDN? 풀이, 질의인지, 숫자 응답, 측정 통계·CSV, HEX 덤프, 자주 쓰는 SCPI 명령(시험: model.test.ts)

/** *IDN? 응답 «제조사,모델,일련번호,펌웨어» (IEEE 488.2 4.1.3.4 — 쉼표 넷) */
export interface Idn {
  maker: string;
  model: string;
  serial: string;
  firmware: string;
}

export function parseIdn(text: string): Idn | null {
  const parts = text.split(",").map((s) => s.trim());
  if (parts.length < 2 || !parts[0] || !parts[1]) return null;
  return { maker: parts[0], model: parts[1], serial: parts[2] ?? "", firmware: parts.slice(3).join(",") };
}

/** 질의 명령인지 — `;` 로 이은 명령 가운데 하나라도 머리(빈칸 앞)가 ? 로 끝나면 (crates/core/src/scpi.rs is_query 와 같다) */
export function isQuery(cmd: string): boolean {
  return cmd.split(";").some((p) => {
    const h = p.trim().split(/\s+/)[0];
    return !!h && h.endsWith("?");
  });
}

/** 숫자 응답 — 첫 칸(쉼표 앞)의 수. SCPI 의 9.9E37 은 넘침(OVLD), 9.91E37 은 NaN */
export interface Num {
  value: number | null;
  /** 넘침·NaN 이면 그 표시 */
  special: "+OVLD" | "-OVLD" | "NaN" | null;
}

const NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/;

export function parseNumber(text: string): Num | null {
  const first = text.split(",")[0].trim();
  const m = NUM_RE.exec(first);
  // 수 뒤에는 단위 글자만 허용(«1.234V», «+5.0E-03 A»)
  if (!m || !/^\s*[A-Za-z%°Ωµ]*$/.test(first.slice(m[0].length))) return null;
  const v = Number(m[0]);
  if (!Number.isFinite(v)) return null;
  if (Math.abs(v - 9.91e37) < 1e34) return { value: null, special: "NaN" };
  if (v >= 9.9e37) return { value: null, special: "+OVLD" };
  if (v <= -9.9e37) return { value: null, special: "-OVLD" };
  return { value: v, special: null };
}

/** 반복 측정 한 번 */
export interface Sample {
  i: number;
  ts: number;
  /** 다 보낸 때부터 응답까지(ms) */
  ms: number;
  value: number | null;
  /** 응답 글(숫자가 아니면 그대로, 실패면 이유) */
  text: string;
  ok: boolean;
}

export interface Stats {
  n: number;
  min: number;
  max: number;
  mean: number;
  /** 표본 표준편차(n-1). 하나면 0 */
  sd: number;
}

/** 반복 측정이 기억하는 표본 수 — 넘으면 오래된 것부터 버린다(끝없이 돌려도 메모리가 늘지 않게) */
export const MAX_SAMPLES = 100_000;

export function addSample(list: Sample[], s: Sample, max = MAX_SAMPLES) {
  list.push(s);
  if (list.length > max) list.splice(0, list.length - max);
}

export function sampleStats(samples: Sample[]): Stats | null {
  const v = samples.map((s) => s.value).filter((x): x is number => x != null);
  if (!v.length) return null;
  // Math.min(...v) 는 수십만 개면 호출 스택을 넘친다 — 한 바퀴로
  let min = Infinity;
  let max = -Infinity;
  for (const x of v) {
    if (x < min) min = x;
    if (x > max) max = x;
  }
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = v.length > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (v.length - 1)) : 0;
  return { n: v.length, min, max, mean, sd };
}

/** 표에 보일 수 — 유효 숫자 7자리까지, 아주 크거나 작으면 지수 */
export function fmtNum(v: number): string {
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e7 || a < 1e-4) return v.toExponential(6).replace(/\.?0+e/, "e");
  return String(Number(v.toPrecision(7)));
}

/** 로컬 시각 «2026-10-18 14:03:05.123» */
export function stamp(ts: number) {
  const d = new Date(ts);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

const csvCell = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** 측정 CSV — 첫 줄은 명령, 둘째 줄은 열 이름(엑셀에서 열린다. 저장할 때 BOM 을 붙인다) */
export function samplesCsv(cmd: string, samples: Sample[]): string {
  const lines = [`# ${csvCell(cmd)}`, "index,time,response_ms,value,response"];
  for (const s of samples) lines.push([s.i, stamp(s.ts), s.ms.toFixed(1), s.value == null ? "" : String(s.value), csvCell(s.text)].join(","));
  return lines.join("\r\n") + "\r\n";
}

/** HEX 덤프 — «0000  00 01 … |..|» 한 줄 16바이트 */
export function hexDump(bytes: number[], offset = 0): string {
  const out: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const row = bytes.slice(i, i + 16);
    const h = row.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
    const a = row.map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".")).join("");
    out.push(`${(offset + i).toString(16).toUpperCase().padStart(6, "0")}  ${h.padEnd(47)}  |${a}|`);
  }
  return out.join("\n");
}

/** 보낸·받은 바이트를 한 줄 글로 — 제어 문자는 <CR> <LF> … */
export function showBytes(bytes: number[]): string {
  let s = "";
  for (const b of bytes) {
    if (b === 0x0d) s += "<CR>";
    else if (b === 0x0a) s += "<LF>";
    else if (b === 0x09) s += "<TAB>";
    else if (b < 0x20 || b === 0x7f) s += `<${b.toString(16).toUpperCase().padStart(2, "0")}>`;
    else s += String.fromCharCode(b);
  }
  return s;
}

/** 블록 데이터 저장 파일 확장자 — 앞 바이트로 알려진 그림 형식이면 그 확장자 */
export function blockExt(preview: number[]): string {
  const starts = (sig: number[]) => sig.every((b, i) => preview[i] === b);
  if (starts([0x89, 0x50, 0x4e, 0x47])) return "png";
  if (starts([0x42, 0x4d])) return "bmp";
  if (starts([0xff, 0xd8, 0xff])) return "jpg";
  if (starts([0x47, 0x49, 0x46, 0x38])) return "gif";
  return "bin";
}

// ---------------------------------------------------------------- 자주 쓰는 SCPI 명령
// IEEE 488.2 공통 명령과 SCPI 1999 의 SYSTem·STATus·측정 기본 — 장비마다 다른 명령은 넣지 않는다.
// 대문자 부분이 짧은 꼴(MEAS:VOLT:DC?), 전체가 긴 꼴(MEASURE:VOLTAGE:DC?). 둘 다 알아듣는다.
export interface ScpiCmd {
  cmd: string;
  ko: string;
  en: string;
}

export const COMMON: ScpiCmd[] = [
  { cmd: "*IDN?", ko: "장비 식별 — 제조사, 모델, 일련번호, 펌웨어", en: "Identify — maker, model, serial number, firmware" },
  { cmd: "*RST", ko: "초기 설정으로 되돌리기(측정 설정이 바뀜)", en: "Reset to the default setup (changes the measurement setup)" },
  { cmd: "*CLS", ko: "상태·오류 큐 지우기", en: "Clear status registers and the error queue" },
  { cmd: "*OPC?", ko: "앞 명령이 다 끝나면 1 을 답함(기다리기)", en: "Answers 1 when pending operations finish (wait)" },
  { cmd: "*OPC", ko: "앞 명령이 끝나면 상태 바이트의 OPC 비트를 켬", en: "Sets the OPC bit when pending operations finish" },
  { cmd: "*WAI", ko: "앞 명령이 끝날 때까지 다음 명령을 미룸", en: "Holds further commands until pending operations finish" },
  { cmd: "*ESR?", ko: "표준 사건 상태 레지스터 읽기(읽으면 지워짐)", en: "Read (and clear) the Standard Event Status Register" },
  { cmd: "*ESE", ko: "표준 사건 상태 허용 마스크 쓰기", en: "Set the Standard Event Status Enable mask" },
  { cmd: "*ESE?", ko: "표준 사건 상태 허용 마스크 읽기", en: "Read the Standard Event Status Enable mask" },
  { cmd: "*STB?", ko: "상태 바이트 읽기", en: "Read the status byte" },
  { cmd: "*SRE", ko: "서비스 요청 허용 마스크 쓰기", en: "Set the Service Request Enable mask" },
  { cmd: "*SRE?", ko: "서비스 요청 허용 마스크 읽기", en: "Read the Service Request Enable mask" },
  { cmd: "*TST?", ko: "자체 시험 — 0 이면 정상(시간이 걸릴 수 있음)", en: "Self-test — 0 means pass (may take a while)" },
  { cmd: "*OPT?", ko: "설치된 옵션 목록", en: "Installed options" },
  { cmd: "*TRG", ko: "트리거 한 번(버스 트리거)", en: "Bus trigger" },
  { cmd: "*SAV", ko: "지금 설정을 메모리 번호에 저장(예: *SAV 1)", en: "Save the setup to a memory slot (e.g. *SAV 1)" },
  { cmd: "*RCL", ko: "저장한 설정 불러오기(예: *RCL 1)", en: "Recall a saved setup (e.g. *RCL 1)" },
  { cmd: "SYSTem:ERRor?", ko: "오류 큐에서 하나 꺼내기 — 0,\"No error\" 면 비었음", en: "Pop one entry from the error queue — 0,\"No error\" when empty" },
  { cmd: "SYSTem:ERRor:COUNt?", ko: "오류 큐에 쌓인 개수(장비에 따라 없음)", en: "Number of queued errors (not on every instrument)" },
  { cmd: "SYSTem:VERSion?", ko: "따르는 SCPI 판(예: 1999.0)", en: "SCPI version the instrument follows (e.g. 1999.0)" },
  { cmd: "SYSTem:PRESet", ko: "장비 기본 설정(장비마다 *RST 와 다를 수 있음)", en: "Instrument preset (may differ from *RST)" },
  { cmd: "STATus:PRESet", ko: "상태 레지스터 마스크를 기본값으로", en: "Reset the status enable registers" },
  { cmd: "STATus:OPERation:CONDition?", ko: "동작 상태 레지스터(지금 상태)", en: "Operation status condition register" },
  { cmd: "STATus:QUEStionable:CONDition?", ko: "의심 상태 레지스터(넘침·보정 등)", en: "Questionable status condition register (overload, calibration …)" },
  { cmd: "MEASure:VOLTage:DC?", ko: "DC 전압 한 번 측정(설정+트리거+읽기)", en: "Measure DC voltage once (configure + trigger + read)" },
  { cmd: "MEASure:VOLTage:AC?", ko: "AC 전압 한 번 측정", en: "Measure AC voltage once" },
  { cmd: "MEASure:CURRent:DC?", ko: "DC 전류 한 번 측정", en: "Measure DC current once" },
  { cmd: "MEASure:CURRent:AC?", ko: "AC 전류 한 번 측정", en: "Measure AC current once" },
  { cmd: "MEASure:RESistance?", ko: "저항 한 번 측정", en: "Measure resistance once" },
  { cmd: "MEASure:FREQuency?", ko: "주파수 한 번 측정", en: "Measure frequency once" },
  { cmd: "CONFigure?", ko: "지금 측정 설정 읽기", en: "Read the present measurement configuration" },
  { cmd: "READ?", ko: "지금 설정으로 측정하고 읽기(트리거 포함)", en: "Measure with the present setup and read (includes trigger)" },
  { cmd: "INITiate", ko: "측정 시작(트리거 기다림 상태로)", en: "Start a measurement (arm the trigger)" },
  { cmd: "FETCh?", ko: "마지막 측정값 읽기(새로 재지 않음)", en: "Fetch the last reading (no new measurement)" },
  { cmd: "ABORt", ko: "진행 중인 측정 멈춤", en: "Abort the measurement in progress" },
];

/** 짧은 꼴 — 마디마다 대문자·숫자·*·? 만 */
export function shortForm(cmd: string): string {
  if (cmd.startsWith("*")) return cmd;
  return cmd
    .split(":")
    .map((n) => n.replace(/[a-z]/g, ""))
    .join(":");
}

/** 넣은 명령(첫 명령의 머리)이 목록의 어느 것인지 — 짧은 꼴·긴 꼴, 대소문자 무시, 앞 «:» 무시 */
export function findCommon(input: string): ScpiCmd | null {
  const head = input.split(";")[0].trim().split(/\s+/)[0].replace(/^:/, "").toUpperCase();
  if (!head) return null;
  for (const c of COMMON) {
    if (c.cmd.startsWith("*")) {
      if (head === c.cmd) return c;
      continue;
    }
    const pn = c.cmd.replace(/\?$/, "").split(":");
    const q = c.cmd.endsWith("?");
    if (head.endsWith("?") !== q) continue;
    const un = head.replace(/\?$/, "").split(":");
    if (un.length !== pn.length) continue;
    if (pn.every((p, i) => un[i] === p.toUpperCase() || un[i] === p.replace(/[a-z]/g, ""))) return c;
  }
  return null;
}

/** 저장해 둔 숫자 설정 다듬기 */
export const clampInt = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi ? v : d);
