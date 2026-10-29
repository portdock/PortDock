// 소리·영상·게임패드 계산 — 웹 도구 «스피커 테스트»·«마이크 테스트»·«웹캠 테스트»·«게임패드 테스트».
// 순수 함수만(브라우저 API 는 views/ 쪽). 근거:
//   - dBFS: 디지털 최대값(±1.0)을 0 dB 로 한 20·log10(진폭) — Web Audio 의 샘플 범위가 −1~1(Web Audio API 명세).
//   - 주파수 스윕: 지수(로그) 스윕 f(t) = f0·(f1/f0)^(t/T) — 옥타브마다 같은 시간을 쓴다(Web Audio 의 exponentialRampToValueAtTime 과 같은 식).
//   - 게임패드: Gamepad API 명세의 «standard» 배치(버튼 0~16, 축 0~3 = 왼쪽 X·Y, 오른쪽 X·Y, 위·왼쪽이 −1).
//   - 데드존: 원형(radial) 데드존 — 반지름 dz 안은 0, 밖은 (r − dz)/(1 − dz) 로 다시 늘인다.
//   - getUserMedia 오류 이름: Media Capture and Streams 명세(NotAllowedError·NotFoundError·NotReadableError·OverconstrainedError).

/** 로그 스윕에서 시각 t(초)의 주파수 */
export function sweepFreqAt(f0: number, f1: number, dur: number, t: number): number {
  if (!(f0 > 0 && f1 > 0 && dur > 0)) throw new RangeError("sweep");
  const k = Math.min(1, Math.max(0, t / dur));
  return f0 * Math.pow(f1 / f0, k);
}

/** 슬라이더 0~1 ↔ 주파수(로그 눈금, 기본 20 Hz~20 kHz) */
export const sliderToFreq = (p: number, fmin = 20, fmax = 20000) => fmin * Math.pow(fmax / fmin, Math.min(1, Math.max(0, p)));
export const freqToSlider = (f: number, fmin = 20, fmax = 20000) => Math.min(1, Math.max(0, Math.log(f / fmin) / Math.log(fmax / fmin)));

/** 주파수 표시 — 1000 Hz 넘으면 kHz */
export const fmtHz = (f: number) => (f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 1 : 2)} kHz` : `${Math.round(f)} Hz`);

const DB_FLOOR = -100;
const toDb = (a: number) => (a > 0 ? Math.max(DB_FLOOR, 20 * Math.log10(a)) : DB_FLOOR);

export interface Level {
  rms: number;
  peak: number;
  /** dBFS, 소리 없으면 −100 */
  rmsDb: number;
  peakDb: number;
}

/** 샘플(−1~1) 묶음의 RMS·피크와 dBFS */
export function levelOf(samples: ArrayLike<number>): Level {
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    sum += v * v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  const rms = samples.length ? Math.sqrt(sum / samples.length) : 0;
  return { rms, peak, rmsDb: toDb(rms), peakDb: toDb(peak) };
}

/** dBFS → 막대 길이 0~1(floor dB 이하 0, 0 dB 에서 1) */
export const meterFraction = (db: number, floor = -60) => Math.min(1, Math.max(0, (db - floor) / -floor));

/** 원형 데드존을 거친 스틱 값 */
export function radialDeadzone(x: number, y: number, dz: number) {
  const r = Math.hypot(x, y);
  const d = Math.min(0.99, Math.max(0, dz));
  if (r <= d || r === 0) return { x: 0, y: 0, r, inside: true };
  const s = Math.min(1, (r - d) / (1 - d)) / r;
  return { x: x * s, y: y * s, r, inside: false };
}

/** 스틱을 놓아 둔 동안의 표본([x, y]) → 평균 위치·가장 먼 거리(쏠림), 그 거리를 덮는 데드존(2 %p 여유, 1 % 단위 올림). 비면 null */
export function driftSummary(samples: readonly (readonly [number, number])[]) {
  if (!samples.length) return null;
  let sx = 0;
  let sy = 0;
  let maxR = 0;
  for (const [x, y] of samples) {
    sx += x;
    sy += y;
    maxR = Math.max(maxR, Math.hypot(x, y));
  }
  return { meanX: sx / samples.length, meanY: sy / samples.length, maxR, deadzone: Math.min(0.99, Math.ceil(Number((maxR * 100).toFixed(6)) + 2) / 100) };
}

/** Gamepad API «standard» 배치의 버튼 이름(엑스박스 식 / 플레이스테이션 식) */
export const STANDARD_BUTTONS: { ko: string; en: string }[] = [
  { ko: "A / ✕ (아래)", en: "A / ✕ (bottom)" },
  { ko: "B / ○ (오른쪽)", en: "B / ○ (right)" },
  { ko: "X / □ (왼쪽)", en: "X / □ (left)" },
  { ko: "Y / △ (위)", en: "Y / △ (top)" },
  { ko: "LB / L1", en: "LB / L1" },
  { ko: "RB / R1", en: "RB / R1" },
  { ko: "LT / L2", en: "LT / L2" },
  { ko: "RT / R2", en: "RT / R2" },
  { ko: "View / Share", en: "View / Share" },
  { ko: "Menu / Options", en: "Menu / Options" },
  { ko: "왼쪽 스틱 누름(L3)", en: "Left stick press (L3)" },
  { ko: "오른쪽 스틱 누름(R3)", en: "Right stick press (R3)" },
  { ko: "방향 위", en: "D-pad up" },
  { ko: "방향 아래", en: "D-pad down" },
  { ko: "방향 왼쪽", en: "D-pad left" },
  { ko: "방향 오른쪽", en: "D-pad right" },
  { ko: "홈(가운데)", en: "Home (center)" },
];

/** 프레임 시각 목록(ms) → 초당 프레임(2개 미만이면 null) */
export function framesPerSecond(ts: readonly number[]): number | null {
  if (ts.length < 2) return null;
  const span = ts[ts.length - 1] - ts[0];
  return span > 0 ? ((ts.length - 1) * 1000) / span : null;
}

export type MediaErr = "denied" | "notfound" | "busy" | "constraint" | "insecure" | "other";

/** getUserMedia 가 던진 오류 이름 → 안내 종류 */
export function mediaErrorKind(name: string | undefined): MediaErr {
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "notfound";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "busy";
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "constraint";
    case "TypeError":
      return "insecure";
    default:
      return "other";
  }
}

const RES_NAMES: [number, number, string][] = [
  [640, 480, "VGA"],
  [1280, 720, "720p HD"],
  [1920, 1080, "1080p Full HD"],
  [2560, 1440, "1440p QHD"],
  [3840, 2160, "2160p 4K UHD"],
];

/** 가로×세로 → «1920×1080 (1080p Full HD)» */
export function resolutionLabel(w: number | undefined, h: number | undefined): string {
  if (!w || !h) return "–";
  const n = RES_NAMES.find(([a, b]) => (a === w && b === h) || (a === h && b === w));
  return n ? `${w}×${h} (${n[2]})` : `${w}×${h}`;
}

/** 잡음 바닥 — 짧은 구간 RMS(dBFS) 목록의 하위 10 % 값(말소리·소음이 섞여도 조용한 순간을 잡는다). 비면 null */
export function noiseFloor(dbs: readonly number[]): number | null {
  const v = dbs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  return v[Math.floor((v.length - 1) * 0.1)];
}

/** 이 샘플 묶음에 클리핑(디지털 최대값에 닿음)이 있나 — |샘플| ≥ 0.999 */
export const clipped = (peak: number) => peak >= 0.999;

/**
 * 출력 채널 이름 — Web Audio 명세의 «speakers» 배치: 2채널 L·R, 6채널(5.1) L·R·C·LFE·SL·SR.
 * 8채널(7.1)의 5번부터 순서는 명세가 정하지 않아(드라이버·브라우저마다 다름) 번호만 붙인다.
 */
export function channelLabel(i: number, n: number, lang: "ko" | "en"): string {
  const ko = lang === "ko";
  const two = ko ? ["왼쪽(L)", "오른쪽(R)"] : ["Left (L)", "Right (R)"];
  const six = ko
    ? ["앞 왼쪽(L)", "앞 오른쪽(R)", "가운데(C)", "우퍼(LFE)", "뒤 왼쪽(SL)", "뒤 오른쪽(SR)"]
    : ["Front left (L)", "Front right (R)", "Center (C)", "Subwoofer (LFE)", "Surround left (SL)", "Surround right (SR)"];
  if (n <= 2 && i < 2) return two[i];
  if (n >= 6 && i < (n === 6 ? 6 : 4)) return six[i];
  return ko ? `채널 ${i + 1}` : `Channel ${i + 1}`;
}
