// 줄 사이 간격·응답 시간 열과 처리량(bytes/s)·«마지막 수신 n초 전» — Serial·TCP·UDP 공통(화면 없는 부분).

/** 간격 열: 끔 · 직전 줄(RX·TX)과의 간격 · 응답 시간(마지막 TX → 이 RX) */
export type DeltaMode = "off" | "prev" | "resp";
export const DELTA_MODES: DeltaMode[] = ["off", "prev", "resp"];

/** 줄에 붙여 두는 값(ms). 받는 순서대로 한 번 계산해 둔다 */
export interface DeltaFields {
  /** 직전 RX·TX 줄과의 간격 */
  gap?: number | null;
  /** 마지막 TX 뒤로 이 RX 까지(TX 가 아직 없으면 null) */
  rsp?: number | null;
}

export interface DeltaState {
  lastData: number | null;
  lastTx: number | null;
}

export const newDeltaState = (): DeltaState => ({ lastData: null, lastTx: null });

/** 새 줄에 간격·응답 시간을 붙인다(사건 줄 EV 는 건너뜀) */
export function stampDelta(st: DeltaState, f: { ts: number; dir: string } & DeltaFields) {
  if (f.dir === "ev") return;
  f.gap = st.lastData == null ? null : Math.max(0, f.ts - st.lastData);
  f.rsp = f.dir === "rx" && st.lastTx != null ? Math.max(0, f.ts - st.lastTx) : null;
  st.lastData = Math.max(st.lastData ?? f.ts, f.ts);
  if (f.dir === "tx") st.lastTx = f.ts;
}

/** «+12 ms», «+1.234 s», «+2:05.0» */
export function fmtDelta(ms: number | null | undefined) {
  if (ms == null) return "";
  if (ms < 10_000) return `+${Math.round(ms)} ms`;
  if (ms < 60_000) return `+${(ms / 1000).toFixed(3)} s`;
  const m = Math.floor(ms / 60_000);
  const s = (ms % 60_000) / 1000;
  return `+${m}:${s.toFixed(1).padStart(4, "0")}`;
}

/** 지금 간격 열 모드로 줄 값 */
export function deltaText(mode: DeltaMode, f: DeltaFields & { dir: string }) {
  if (mode === "off" || f.dir === "ev") return "";
  return fmtDelta(mode === "prev" ? f.gap : f.rsp);
}

// ---- 처리량
/** 받은·보낸 바이트를 1초 창으로 세는 계량기 — 화면 다시 그리기와 상관없이 ref 로 쓴다 */
export class Meter {
  private win: { t: number; dir: "rx" | "tx"; n: number }[] = [];
  frames = { rx: 0, tx: 0 };
  lastRx: number | null = null;
  lastTx: number | null = null;

  /** 줄이 들어올 때(사건 줄 제외). now 는 받은 시각(화면 시계) */
  add(dir: "rx" | "tx", n: number, now = Date.now()) {
    this.win.push({ t: now, dir, n });
    this.frames[dir]++;
    if (dir === "rx") this.lastRx = now;
    else this.lastTx = now;
    if (this.win.length > 50_000) this.prune(now);
  }

  private prune(now: number) {
    let i = 0;
    while (i < this.win.length && now - this.win[i].t > 1000) i++;
    if (i) this.win.splice(0, i);
  }

  /** 최근 1초 bytes/s */
  rate(now = Date.now()) {
    this.prune(now);
    let rx = 0;
    let tx = 0;
    for (const w of this.win) {
      if (w.dir === "rx") rx += w.n;
      else tx += w.n;
    }
    return { rx, tx };
  }

  reset() {
    this.win = [];
    this.frames = { rx: 0, tx: 0 };
    this.lastRx = null;
    this.lastTx = null;
  }
}

/** «1.2 KB/s» */
export function fmtRate(n: number) {
  if (n < 1000) return `${n} B/s`;
  if (n < 1_000_000) return `${(n / 1024).toFixed(1)} KB/s`;
  return `${(n / 1_048_576).toFixed(2)} MB/s`;
}

/** «3초 전», «2분 전» — 없으면 «—» */
export function fmtAgo(ts: number | null, now: number, lang: "ko" | "en") {
  if (ts == null) return "—";
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return lang === "ko" ? `${s}초 전` : `${s} s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return lang === "ko" ? `${m}분 전` : `${m} min ago`;
  const h = Math.floor(m / 60);
  return lang === "ko" ? `${h}시간 전` : `${h} h ago`;
}
