// Serial «용도» 프리셋 — 고르면 속도·프레임 구분·수신 체크섬·보내기 형식·줄 끝을 그 용도에 흔한 값으로 맞춘다.
// 화면(React) 없이 값만 다룬다. node --test shared/serialPresets.test.ts 로 시험한다(Node 24 는 타입을 지우고 바로 돌린다).
// 고른 뒤에도 칸은 그대로 고칠 수 있고, 프리셋과 달라진 칸은 presetDiff 가 돌려준다(화면에 «(바꿈)»).

export type PresetId = "general" | "at" | "modbus" | "nmea";
export const PRESET_IDS: PresetId[] = ["general", "at", "modbus", "nmea"];

/** 프리셋이 정하는 칸들 — Serial 화면 상태에서 뽑은 것 */
export interface PresetState {
  baud: number;
  dataBits: number;
  parity: string;
  stopBits: number;
  /** 프레임 구분 종류와(끊김 시간이면) ms */
  frameKind: "gap" | "terminator" | "fixed" | "modbus-rtu";
  gapMs: number;
  /** 끝 문자 칸 글(끝 문자 구분일 때만 비교) */
  terminatorText: string;
  rxCheck: string | null;
  mode: "hex" | "ascii";
  checksum: string | null;
  /** 줄 끝(이스케이프 글 그대로 — «\r\n» 4글자) */
  suffix: string;
}
export type PresetField = keyof PresetState;

/** 프리셋마다 정하는 값. 빠진 칸(일반의 속도 등)은 건드리지 않는다 */
export const PRESETS: Record<PresetId, Partial<PresetState>> = {
  // 일반: 첫 실행 기본값과 같다 — 끊김 시간 20ms · 검사 없음 · ASCII · 줄 끝 CR LF. 속도는 장비마다 달라 두지 않는다
  general: { frameKind: "gap", gapMs: 20, rxCheck: null, mode: "ascii", checksum: null, suffix: "\\r\\n" },
  // AT 명령(모뎀·LTE·BLE·Wi-Fi 모듈): 115200 8N1 · 응답을 CR LF 로 끊음 · ASCII + CR LF
  at: { baud: 115200, dataBits: 8, parity: "none", stopBits: 1, frameKind: "terminator", terminatorText: "0D 0A", rxCheck: null, mode: "ascii", checksum: null, suffix: "\\r\\n" },
  // Modbus RTU 장비: 9600 8N1 · Modbus 프레임 + 수신 CRC 검사 · HEX + CRC16 Modbus · 줄 끝 없음
  modbus: { baud: 9600, dataBits: 8, parity: "none", stopBits: 1, frameKind: "modbus-rtu", rxCheck: "crc16-modbus", mode: "hex", checksum: "crc16-modbus", suffix: "" },
  // NMEA·GPS: 9600 8N1(오래된 수신기는 4800) · 문장을 LF 로 끊음 · ASCII + CR LF(설정 명령용)
  nmea: { baud: 9600, dataBits: 8, parity: "none", stopBits: 1, frameKind: "terminator", terminatorText: "0A", rxCheck: null, mode: "ascii", checksum: null, suffix: "\\r\\n" },
};

export const isPresetId = (v: unknown): v is PresetId => typeof v === "string" && (PRESET_IDS as string[]).includes(v);

/** 끝 문자 칸 비교용 — 띄어쓰기·0x·대소문자를 무시하고 CR·LF 이름은 바이트로 */
function normTerm(t: string) {
  return t
    .toUpperCase()
    .replace(/\\R/g, "0D")
    .replace(/\\N/g, "0A")
    .replace(/CRLF/g, "0D0A")
    .replace(/\bCR\b/g, "0D")
    .replace(/\bLF\b/g, "0A")
    .replace(/0X/g, "")
    .replace(/[\s,;-]/g, "");
}

/** 지금 값이 프리셋과 다른 칸 — 프리셋이 정하지 않는 칸은 보지 않는다. 끊김 시간은 끊김 시간 구분일 때만, 끝 문자 글은 끝 문자 구분일 때만 */
export function presetDiff(id: PresetId, cur: PresetState): PresetField[] {
  const p = PRESETS[id];
  const out: PresetField[] = [];
  for (const k of Object.keys(p) as PresetField[]) {
    if (k === "gapMs" && (p.frameKind !== "gap" || cur.frameKind !== "gap")) continue;
    if (k === "terminatorText") {
      if (cur.frameKind === "terminator" && normTerm(cur.terminatorText) !== normTerm(p.terminatorText ?? "")) out.push(k);
      continue;
    }
    if (cur[k] !== p[k]) out.push(k);
  }
  return out;
}

/** 프리셋을 지금 값에 덮어쓴 결과 */
export function applyPreset(id: PresetId, cur: PresetState): PresetState {
  return { ...cur, ...PRESETS[id] };
}
