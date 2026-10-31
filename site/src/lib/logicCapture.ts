// 웹 도구 «로직 분석기 캡처 해석기» 의 읽기 쪽 — sigrok/PulseView CSV, Saleae Logic 2 «Export raw data» CSV, VCD(Value Change Dump)를
// 채널마다 «처음 값 + 바뀐 시각 목록(초)» 으로 바꾼다. 조각(chunk)으로 넣을 수 있어 큰 파일도 Web Worker 에서 나눠 읽는다.
// 순수 함수(브라우저 Worker·Node 시험 둘 다). 시험: logicCapture.test.ts.
// 형식 근거: Saleae «Exporting Data»(디지털은 값이 바뀔 때만 한 줄, 마지막 샘플은 늘 한 줄), sigrok wiki «File format:Csv»(주석 «;»,
// 첫 열 시간 선택), IEEE 1364 의 VCD($timescale·$var·$enddefinitions·#시각·값 바뀜).

export type Format = "saleae-csv" | "sigrok-csv" | "csv" | "vcd";

/** 한 채널 — 바뀐 시각 t[i] 뒤의 값은 init ^ ((i + 1) & 1) */
export interface Sig {
  init: 0 | 1;
  t: Float64Array;
}
export interface Channel extends Sig {
  name: string;
}
export interface Capture {
  format: Format;
  channels: Channel[];
  /** 첫 시각·마지막 시각(초) */
  start: number;
  end: number;
  /** 샘플 속도(Hz) — 파일에 적혀 있거나 사용자가 준 값. 모르면 null */
  rate: number | null;
  rows: number;
  /** 알림 코드: rate-assumed(샘플 속도를 몰라 사용자 값으로), x-values(VCD x 를 앞 값으로), analog(문턱으로 자른 아날로그 열), real-skipped(VCD 실수 변수 뺌) */
  warnings: string[];
}

export class CaptureError extends Error {
  code: "empty" | "format" | "unsorted" | "too-many-edges" | "no-channels" | "time";
  constructor(code: CaptureError["code"], message: string = code) {
    super(message);
    this.code = code;
  }
}

export interface ParseOpts {
  /** 시간 열이 없는 CSV 의 샘플 속도(Hz) — 파일 주석에 없을 때만 쓴다 */
  sampleRate?: number;
  /** 0/1 이 아닌 숫자(아날로그 전압) 열을 자를 문턱 — 이 값보다 크면 1 */
  threshold?: number;
  /** 모든 채널 변화 수 합 상한 */
  maxEdges?: number;
}

// ---------------------------------------------------------------- 채널 값 읽기

/** t 이하(t 포함)에서 바뀐 횟수 */
export function upperBound(a: Float64Array, x: number): number {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >>> 1;
    if (a[m] <= x) lo = m + 1;
    else hi = m;
  }
  return lo;
}
/** t 미만에서 바뀐 횟수 */
export function lowerBound(a: Float64Array, x: number): number {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >>> 1;
    if (a[m] < x) lo = m + 1;
    else hi = m;
  }
  return lo;
}
/** 시각 t 의 값(t 에 바뀐 것까지 반영) */
export const valueAt = (s: Sig, t: number): 0 | 1 => (s.init ^ (upperBound(s.t, t) & 1)) as 0 | 1;
/** 시각 t 직전 값(t 에 바뀐 것은 빼고) */
export const valueBefore = (s: Sig, t: number): 0 | 1 => (s.init ^ (lowerBound(s.t, t) & 1)) as 0 | 1;
/** i 번째 변화 뒤의 값 */
export const levelAfter = (s: Sig, i: number): 0 | 1 => (s.init ^ ((i + 1) & 1)) as 0 | 1;

// ---------------------------------------------------------------- 늘어나는 배열

class Edges {
  buf = new Float64Array(64);
  n = 0;
  push(t: number) {
    if (this.n === this.buf.length) {
      const b = new Float64Array(this.buf.length * 2);
      b.set(this.buf);
      this.buf = b;
    }
    this.buf[this.n++] = t;
  }
  pop() {
    this.n--;
  }
  last() {
    return this.n ? this.buf[this.n - 1] : NaN;
  }
  done() {
    return this.buf.slice(0, this.n);
  }
}

/** 채널 하나를 만들며 받는 쪽 — 같은 시각에 두 번 바뀌면(폭 0 펄스) 둘 다 지운다 */
class Track {
  name: string;
  init: 0 | 1 | -1 = -1;
  cur: 0 | 1 = 0;
  edges = new Edges();
  constructor(name: string) {
    this.name = name;
  }
  /** 바뀌었으면 1, 폭 0 펄스를 지웠으면 -1, 그대로 0 */
  set(t: number, v: 0 | 1): number {
    if (this.init === -1) {
      this.init = v;
      this.cur = v;
      return 0;
    }
    if (v === this.cur) return 0;
    this.cur = v;
    if (this.edges.n && this.edges.last() === t) {
      this.edges.pop();
      return -1;
    }
    this.edges.push(t);
    return 1;
  }
  channel(): Channel {
    return { name: this.name, init: this.init === -1 ? 0 : this.init, t: this.edges.done() };
  }
}

// ---------------------------------------------------------------- 단위

const UNIT: Record<string, number> = { s: 1, ms: 1e-3, us: 1e-6, "µs": 1e-6, "μs": 1e-6, ns: 1e-9, ps: 1e-12, fs: 1e-15 };
const SI: Record<string, number> = { "": 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };

/** «1 MHz»·«24MHz»·«500 kHz» → Hz */
export function parseRate(s: string): number | null {
  const m = s.trim().match(/^([\d.]+)\s*([kKMG]?)\s*Hz$/);
  if (!m) return null;
  const v = Number(m[1]) * SI[m[2]];
  return v > 0 && Number.isFinite(v) ? v : null;
}

// ---------------------------------------------------------------- 읽기

export interface Parser {
  push(text: string): void;
  finish(): Capture;
}

/** 조각으로 넣는 읽기 — 처음 글자로 CSV·VCD 를 고른다 */
export function createParser(opts: ParseOpts = {}): Parser {
  let inner: Parser | null = null;
  let head = "";
  return {
    push(text: string) {
      if (inner) return inner.push(text);
      head += text;
      const s = head.replace(/^﻿/, "").trimStart();
      if (!s) return;
      if (s.length < 2 && head.length < 64) return;
      inner = s[0] === "$" ? vcdParser(opts) : csvParser(opts);
      inner.push(head.replace(/^﻿/, ""));
      head = "";
    },
    finish() {
      if (!inner) {
        if (!head.trim()) throw new CaptureError("empty");
        inner = head.trimStart()[0] === "$" ? vcdParser(opts) : csvParser(opts);
        inner.push(head.replace(/^﻿/, ""));
      }
      return inner.finish();
    },
  };
}

/** 한 번에 읽기(시험·작은 파일) */
export const parseCapture = (text: string, opts: ParseOpts = {}): Capture => {
  const p = createParser(opts);
  p.push(text);
  return p.finish();
};

// ---- CSV

function csvParser(opts: ParseOpts): Parser {
  const maxEdges = opts.maxEdges ?? 20_000_000;
  const thr = opts.threshold ?? 0.5;
  let rest = "";
  let sigrok = false;
  let rate: number | null = null;
  let sep = "";
  let tracks: Track[] = [];
  /** 시간 열 배율(초) — null 이면 시간 열 없음(샘플 번호 × 1/rate) */
  let timeScale: number | null = null;
  let header = false;
  let saleae = false;
  let rows = 0;
  let edges = 0;
  let start = NaN;
  let last = NaN;
  let analog = false;
  let rateAssumed = false;

  const setup = (cells: string[]) => {
    const isHeader = cells.some((c) => c !== "" && !Number.isFinite(Number(c)));
    let names: string[];
    if (isHeader) {
      header = true;
      const first = cells[0].replace(/^"|"$/g, "").trim();
      const tm = first.match(/^time\s*(?:[[(]\s*([a-zµμ]+)\s*[\])])?/i);
      if (tm) {
        const u = (tm[1] ?? "s").toLowerCase().replace("μ", "µ");
        const k = UNIT[u] ?? UNIT[tm[1] ?? "s"];
        if (k === undefined) throw new CaptureError("time", first);
        timeScale = k;
        saleae = /^Time \[s\]$/.test(first);
        names = cells.slice(1);
      } else names = cells;
      names = names.map((c) => c.replace(/^"|"$/g, "").trim());
    } else {
      // 머리 줄 없음 — 첫 열이 0/1 이 아닌 숫자이고 늘어나면 시간 열로 본다(아래 첫 줄에서 판단하기 어려워 0/1 만 있으면 채널로)
      const nonBit = cells.some((c, i) => i === 0 && c !== "0" && c !== "1");
      if (nonBit) {
        timeScale = 1;
        names = cells.slice(1).map((_, i) => `D${i}`);
      } else names = cells.map((_, i) => `D${i}`);
    }
    if (!names.length) throw new CaptureError("no-channels");
    tracks = names.map((n, i) => new Track(n || `D${i}`));
    if (timeScale === null && rate === null) {
      rate = opts.sampleRate && opts.sampleRate > 0 ? opts.sampleRate : 1e6;
      rateAssumed = true;
    }
    return isHeader;
  };

  const row = (cells: string[]) => {
    let t: number;
    let off = 0;
    if (timeScale !== null) {
      t = Number(cells[0]) * timeScale;
      if (!Number.isFinite(t)) return;
      off = 1;
    } else t = rows / (rate as number);
    if (t < last) throw new CaptureError("unsorted", String(cells[0]));
    if (Number.isNaN(start)) start = t;
    last = t;
    rows++;
    for (let i = 0; i < tracks.length; i++) {
      const c = cells[i + off];
      if (c === undefined) continue;
      let v: 0 | 1;
      if (c === "1") v = 1;
      else if (c === "0") v = 0;
      else {
        const x = Number(c);
        if (c.trim() === "" || !Number.isFinite(x)) continue;
        if (x !== 0 && x !== 1) analog = true;
        v = x > thr ? 1 : 0;
      }
      edges += tracks[i].set(t, v);
    }
    if (edges > maxEdges) throw new CaptureError("too-many-edges", String(maxEdges));
  };

  const line = (raw: string) => {
    const l = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    const s = l.trim();
    if (!s) return;
    if (s[0] === ";" || s[0] === "#" || s.startsWith("//")) {
      if (/sigrok/i.test(s)) sigrok = true;
      const m = s.match(/samplerate\s*[:=]\s*([\d.]+\s*[kKMG]?\s*Hz)/i);
      if (m) {
        sigrok = true;
        rate = parseRate(m[1]);
      }
      return;
    }
    if (!sep) sep = s.includes(",") ? "," : s.includes("\t") ? "\t" : s.includes(";") ? ";" : ",";
    const cells = s.split(sep).map((c) => c.trim());
    if (!tracks.length) {
      if (setup(cells)) return;
    }
    row(cells);
  };

  return {
    push(text: string) {
      const s = rest + text;
      let a = 0;
      for (;;) {
        const b = s.indexOf("\n", a);
        if (b < 0) break;
        line(s.slice(a, b));
        a = b + 1;
      }
      rest = s.slice(a);
    },
    finish(): Capture {
      if (rest) line(rest);
      rest = "";
      if (!tracks.length) throw new CaptureError("empty");
      if (!rows) throw new CaptureError("empty");
      // 시간 열이 없으면 마지막 샘플의 끝까지
      const end = timeScale === null ? rows / (rate as number) : last;
      const warnings: string[] = [];
      if (rateAssumed) warnings.push("rate-assumed");
      if (analog) warnings.push("analog");
      return {
        format: saleae ? "saleae-csv" : sigrok ? "sigrok-csv" : header ? "csv" : "csv",
        channels: tracks.map((t) => t.channel()),
        start,
        end,
        rate,
        rows,
        warnings,
      };
    },
  };
}

// ---- VCD

interface VcdVar {
  tracks: Track[];
  width: number;
}

function vcdParser(opts: ParseOpts): Parser {
  const maxEdges = opts.maxEdges ?? 20_000_000;
  let rest = "";
  let inDefs = true;
  /** 머리 안에서 지금 읽는 $키워드와 그 토큰 */
  let kw: string | null = null;
  let kwTok: string[] = [];
  let scale = 1e-9;
  const scopes: string[] = [];
  const byId = new Map<string, VcdVar>();
  const tracks: Track[] = [];
  let t = 0;
  let start = NaN;
  let last = NaN;
  let edges = 0;
  let rows = 0;
  let xSeen = false;
  let realSeen = false;
  /** «b0101» 다음 토큰이 id */
  let pendingVec: string | null = null;
  let pendingReal = false;

  const defEnd = () => {
    const k = kw;
    const a = kwTok;
    kw = null;
    kwTok = [];
    if (k === "$timescale") {
      const m = a.join("").match(/^(1|10|100)([munpf]?s)$/);
      if (!m) throw new CaptureError("time", a.join(" "));
      scale = Number(m[1]) * UNIT[m[2]];
    } else if (k === "$scope") scopes.push(a[1] ?? "");
    else if (k === "$upscope") scopes.pop();
    else if (k === "$var") {
      // $var wire 1 ! D0 $end · $var wire 8 # bus [7:0] $end
      const width = Number(a[1]);
      const id = a[2];
      const name = a.slice(3).join("");
      if (!id || !(width >= 1)) return;
      if (a[0] === "real" || a[0] === "realtime") {
        realSeen = true;
        return;
      }
      if (byId.has(id)) return; // 같은 신호의 다른 이름
      const nm = name || id;
      const ts: Track[] = [];
      if (width === 1) ts.push(new Track(nm));
      else if (width <= 32) {
        const base = nm.replace(/\[.*\]$/, "");
        for (let i = width - 1; i >= 0; i--) ts.push(new Track(`${base}[${i}]`));
      } else return;
      tracks.push(...ts);
      byId.set(id, { tracks: ts, width });
    }
  };

  const bit = (c: string, tr: Track, at: number) => {
    let v: 0 | 1;
    if (c === "0") v = 0;
    else if (c === "1") v = 1;
    else if (c === "z" || c === "Z") v = 1; // 열린 드레인 선은 놓으면 풀업으로 1
    else {
      xSeen = true;
      v = tr.init === -1 ? 0 : tr.cur;
    }
    edges += tr.set(at, v);
  };

  const tok = (w: string) => {
    if (inDefs) {
      if (kw) {
        if (w === "$end") defEnd();
        else kwTok.push(w);
        return;
      }
      if (w === "$enddefinitions") {
        inDefs = false;
        kw = null;
        return;
      }
      if (w[0] === "$") {
        kw = w;
        kwTok = [];
      }
      return;
    }
    if (pendingVec !== null) {
      const v = byId.get(w);
      const bits = pendingVec;
      pendingVec = null;
      if (!v) return;
      const pad = bits[0] === "x" || bits[0] === "z" || bits[0] === "X" || bits[0] === "Z" ? bits[0] : "0";
      const full = bits.length >= v.width ? bits.slice(bits.length - v.width) : pad.repeat(v.width - bits.length) + bits;
      for (let i = 0; i < v.width; i++) bit(full[i], v.tracks[i], t);
      return;
    }
    if (pendingReal) {
      pendingReal = false;
      return;
    }
    const c = w[0];
    if (c === "#") {
      const n = Number(w.slice(1));
      if (!Number.isFinite(n)) return;
      const nt = n * scale;
      if (nt < last) throw new CaptureError("unsorted", w);
      t = nt;
      if (Number.isNaN(start)) start = t;
      last = t;
      rows++;
      if (edges > maxEdges) throw new CaptureError("too-many-edges", String(maxEdges));
      return;
    }
    if (c === "$") return; // $dumpvars·$end·$dumpon·$comment 안 내용은 드물어 무시
    if (c === "b" || c === "B") {
      pendingVec = w.slice(1);
      return;
    }
    if (c === "r" || c === "R") {
      pendingReal = true;
      return;
    }
    if ("01xXzZ".includes(c)) {
      const v = byId.get(w.slice(1));
      if (v && v.width === 1) bit(c, v.tracks[0], t);
    }
  };

  // $comment … $end 안은 건너뛴다(머리 뒤)
  let inComment = false;
  const feed = (w: string) => {
    if (!inDefs) {
      if (inComment) {
        if (w === "$end") inComment = false;
        return;
      }
      if (w === "$comment") {
        inComment = true;
        return;
      }
    }
    tok(w);
  };

  return {
    push(text: string) {
      const s = rest + text;
      // 마지막 토큰은 다음 조각과 이어질 수 있어 남긴다
      let cut = s.length;
      while (cut > 0 && !/\s/.test(s[cut - 1])) cut--;
      rest = s.slice(cut);
      const body = s.slice(0, cut);
      const re = /\S+/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(body))) feed(m[0]);
    },
    finish(): Capture {
      if (rest) for (const w of rest.split(/\s+/)) if (w) feed(w);
      rest = "";
      if (inDefs) throw new CaptureError("format", "no $enddefinitions");
      if (!tracks.length) throw new CaptureError("no-channels");
      if (Number.isNaN(start)) throw new CaptureError("empty");
      const warnings: string[] = [];
      if (xSeen) warnings.push("x-values");
      if (realSeen) warnings.push("real-skipped");
      return { format: "vcd", channels: tracks.map((tr) => tr.channel()), start, end: last, rate: null, rows, warnings };
    },
  };
}

/** 채널의 변화 수 합 */
export const edgeCount = (c: Capture) => c.channels.reduce((n, ch) => n + ch.t.length, 0);

/**
 * 화면 그리기용 SVG 경로 — 보이는 구간 [v0, v1] 을 폭 w 에. 변화가 폭의 두 배보다 많으면 한 화소 칸마다 세로줄로 줄인다.
 * yHi·yLo = 1·0 의 y 좌표.
 */
export function wavePath(s: Sig, v0: number, v1: number, w: number, yHi: number, yLo: number): string {
  const k = w / (v1 - v0);
  const a = upperBound(s.t, v0);
  const b = upperBound(s.t, v1);
  let lv = s.init ^ (a & 1);
  const Y = (v: number) => (v ? yHi : yLo);
  const f = (x: number) => String(Math.round(x * 10) / 10);
  let d = `M0 ${Y(lv)}`;
  if (b - a <= 2 * w) {
    for (let i = a; i < b; i++) {
      lv ^= 1;
      d += `H${f((s.t[i] - v0) * k)}V${Y(lv)}`;
    }
  } else {
    let i = a;
    for (let px = 0; px < w && i < b; px++) {
      const j = Math.min(b, upperBound(s.t, v0 + (px + 1) / k));
      if (j > i) {
        lv = s.init ^ (j & 1);
        d += `H${px}V${yHi}V${yLo}V${Y(lv)}`;
        i = j;
      }
    }
  }
  return d + `H${w}`;
}
