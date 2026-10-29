// 입력 장치 시간 계산 — 웹 도구 «키보드 테스트»·«마우스 테스트»·«모니터 테스트».
// 브라우저 이벤트의 시각(event.timeStamp, ms)만 받는 순수 함수. 화면·이벤트 등록은 views/ 쪽.
// 근거:
//   - 채터링(스위치 접점이 한 번 누름에 여러 번 붙었다 떨어짐)은 사람이 낼 수 없는 짧은 간격의 «누름» 으로 드러난다.
//     같은 키·버튼을 뗐다가 다시 누르기까지(뗌 → 누름) 사람 손으로는 보통 40 ms 넘게 걸린다. 그래서 «뗌 → 누름» 또는 «누름 → 누름» 간격이
//     임계값(기본 키보드 30 ms·마우스 40 ms, 사용자가 바꿈)보다 짧으면 «의심» 으로만 표시한다(고장 확정 아님). 자동 반복(event.repeat)은 부르는 쪽에서 뺀다.
//   - 이벤트 시각의 정밀도는 브라우저가 낮춘다(High Resolution Time 명세: 교차 출처 격리가 아니면 100 µs 안팎, Firefox 는 1 ms 단위일 수 있음).
//     그래서 폴링 레이트는 간격 하나가 아니라 «이어진 구간의 이벤트 수 ÷ 걸린 시간» 으로 센다.
//   - 화면 주사율은 requestAnimationFrame 콜백 시각 간격(HTML 명세: 브라우저가 화면 갱신에 맞춰 부른다).

/** 버튼·키 하나의 지난 누름·뗌 시각 */
export interface PressMemo {
  lastDown?: number;
  lastUp?: number;
}

export type SuspectReason = "fast-repeat" | "release-bounce";

export interface PressJudge {
  /** 앞 누름 → 이번 누름 간격 ms(처음이면 없음) */
  interval?: number;
  /** 앞 뗌 → 이번 누름 간격 ms(앞 누름 뒤 뗌이 있었을 때만) */
  upGap?: number;
  /** 채터링 의심 */
  suspect: boolean;
  /** fast-repeat: 누름 → 누름 간격 < 임계값, release-bounce: 뗌 → 누름 간격 < 임계값(누름 간격은 길어도 — 길게 누르기·드래그가 끊김) */
  reason?: SuspectReason;
}

/**
 * 이번 누름(시각 t)을 앞 기록과 견준다. memo 는 바꾸지 않는다 — 부르는 쪽이 judge 뒤 memo.lastDown = t.
 * 임계값 thr(ms): 누름 → 누름 또는 뗌 → 누름 간격이 이보다 짧으면 의심.
 */
export function judgePress(memo: PressMemo, t: number, thr: number): PressJudge {
  if (!(thr > 0) || !Number.isFinite(t)) throw new RangeError("thr");
  const out: PressJudge = { suspect: false };
  if (memo.lastDown === undefined) return out;
  out.interval = t - memo.lastDown;
  if (memo.lastUp !== undefined && memo.lastUp >= memo.lastDown) out.upGap = t - memo.lastUp;
  if (out.interval >= 0 && out.interval < thr) {
    out.suspect = true;
    out.reason = "fast-repeat";
  } else if (out.upGap !== undefined && out.upGap >= 0 && out.upGap < thr) {
    out.suspect = true;
    out.reason = "release-bounce";
  }
  return out;
}

export interface Stats {
  n: number;
  min: number;
  max: number;
  mean: number;
  median: number;
}

/** 수 목록의 개수·최소·최대·평균·중앙값(빈 목록이면 null) */
export function stats(xs: readonly number[]): Stats | null {
  const v = xs.filter((x) => Number.isFinite(x));
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return {
    n: s.length,
    min: s[0],
    max: s[s.length - 1],
    mean: s.reduce((a, b) => a + b, 0) / s.length,
    median: s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2,
  };
}

/** 가장 가까운 표준 값(상대 오차 tol 안일 때만) */
export function snapTo(x: number, table: readonly number[], tol: number): number | null {
  let best: number | null = null;
  for (const v of table) if (Math.abs(x - v) / v <= tol && (best === null || Math.abs(x - v) < Math.abs(x - best))) best = v;
  return best;
}

/** 흔한 모니터 주사율 Hz */
export const REFRESH_RATES = [24, 30, 48, 50, 60, 72, 75, 85, 90, 100, 120, 144, 165, 170, 180, 200, 240, 280, 300, 360, 480, 540] as const;
/** 흔한 USB 마우스 폴링 레이트 Hz */
export const POLLING_RATES = [125, 250, 500, 1000, 2000, 4000, 8000] as const;

export interface RefreshEstimate {
  /** 프레임 간격으로 낸 Hz */
  hz: number;
  /** 가까운 표준 주사율(±3 % 안), 없으면 null */
  snapped: number | null;
  /** 한 프레임 ms(중앙값 근처 간격의 평균) */
  frameMs: number;
  /** 중앙값의 1.5배를 넘은 간격 수 — 프레임을 건너뛴 것(탭 전환·무거운 작업 포함) */
  dropped: number;
  frames: number;
}

/** requestAnimationFrame 시각 목록 → 주사율 추정(간격 10개 미만이면 null) */
export function estimateRefresh(ts: readonly number[]): RefreshEstimate | null {
  const gaps: number[] = [];
  for (let i = 1; i < ts.length; i++) {
    const g = ts[i] - ts[i - 1];
    if (g > 0 && g < 1000) gaps.push(g);
  }
  const s = stats(gaps);
  if (!s || s.n < 10) return null;
  // 시각 정밀도(반올림)에 흔들리지 않게 중앙값 근처(±25 %) 간격의 평균을 쓴다
  const core = gaps.filter((g) => Math.abs(g - s.median) <= s.median * 0.25);
  const frameMs = core.reduce((a, b) => a + b, 0) / core.length;
  const hz = 1000 / frameMs;
  return { hz, snapped: snapTo(hz, REFRESH_RATES, 0.03), frameMs, dropped: gaps.filter((g) => g > s.median * 1.5).length, frames: gaps.length };
}

export interface PollingEstimate {
  /** 가장 긴 이어진 구간의 이벤트 수 ÷ 시간 */
  hz: number;
  /** 가까운 표준 폴링 레이트(±12 % 안), 없으면 null */
  snapped: number | null;
  /** 그 구간의 이벤트 수 */
  events: number;
  /** 그 구간의 길이 ms */
  spanMs: number;
}

/**
 * 마우스 움직임 이벤트 시각 → 폴링 레이트 추정. gapMs 보다 긴 쉼에서 구간을 나누고(마우스를 멈춘 때),
 * 이벤트 minEvents 개 이상인 가장 긴 구간으로 센다. 모자라면 null.
 */
export function estimatePolling(ts: readonly number[], gapMs = 50, minEvents = 20): PollingEstimate | null {
  let best: { a: number; b: number } | null = null;
  let a = 0;
  for (let i = 1; i <= ts.length; i++) {
    if (i === ts.length || ts[i] - ts[i - 1] > gapMs || ts[i] < ts[i - 1]) {
      if (!best || i - a > best.b - best.a) best = { a, b: i };
      a = i;
    }
  }
  if (!best) return null;
  const n = best.b - best.a;
  const span = ts[best.b - 1] - ts[best.a];
  if (n < minEvents || !(span > 0)) return null;
  const hz = ((n - 1) * 1000) / span;
  return { hz, snapped: snapTo(hz, POLLING_RATES, 0.12), events: n, spanMs: span };
}

/** 시각 목록에서 now − windowMs 보다 오래된 것을 앞에서 지운다(제자리) */
export function trimWindow(ts: number[], now: number, windowMs: number) {
  let k = 0;
  while (k < ts.length && ts[k] < now - windowMs) k++;
  if (k) ts.splice(0, k);
  return ts;
}

/** 마우스 버튼 번호(MouseEvent.button, UI Events 명세) → 이름 */
export const MOUSE_BUTTONS = [
  { b: 0, ko: "왼쪽", en: "Left" },
  { b: 1, ko: "가운데(휠)", en: "Middle (wheel)" },
  { b: 2, ko: "오른쪽", en: "Right" },
  { b: 3, ko: "뒤로(4번)", en: "Back (4)" },
  { b: 4, ko: "앞으로(5번)", en: "Forward (5)" },
] as const;

export type WheelDir = "up" | "down" | "left" | "right";

/** WheelEvent 의 deltaX·deltaY → 방향(둘 다 0 이면 null). 세로가 크거나 같으면 위·아래 */
export function wheelDir(dx: number, dy: number): WheelDir | null {
  if (!dx && !dy) return null;
  if (Math.abs(dy) >= Math.abs(dx)) return dy < 0 ? "up" : "down";
  return dx < 0 ? "left" : "right";
}

/** ms 를 화면용 글자로(소수 1자리, 없으면 «–») */
export const fmtMs = (x: number | undefined | null) => (x === undefined || x === null || !Number.isFinite(x) ? "–" : `${x.toFixed(1)} ms`);
