// 터미널 보기(Serial) — 받은 바이트를 CR/LF 로 줄을 나누고 ANSI 색(SGR)을 입혀 보인다. 프레임 구분과 상관없이 이어 붙인다.
// 커서 이동·화면 지우기 같은 다른 ESC 시퀀스는 버린다(로그처럼 위에서 아래로만 쌓는다).
import type { Encoding } from "./format.ts";

/** 한 줄 안에서 같은 모양으로 이어지는 글자들 */
export interface Seg {
  text: string;
  /** 0~255 색 번호 또는 "#rrggbb" */
  fg?: number | string;
  bg?: number | string;
  bold?: boolean;
}

type Style = Omit<Seg, "text">;

const LABEL: Record<Encoding, string | null> = { "utf-8": "utf-8", cp949: "euc-kr", latin1: null, ascii: null };

export class TermBuffer {
  private done: Seg[][] = [];
  private cur: Seg[] = [];
  private style: Style = {};
  private dec: TextDecoder | null = null;
  private enc: Encoding = "utf-8";
  /** ESC 를 받은 뒤 아직 끝나지 않은 시퀀스 */
  private esc: string | null = null;
  private lastCR = false;
  /** 바뀔 때마다 늘어난다(화면 다시 그리기용) */
  version = 0;

  private max: number;

  constructor(max = 5000) {
    this.max = max;
  }

  setEncoding(e: Encoding) {
    if (e === this.enc && this.dec) return;
    this.enc = e;
    const label = LABEL[e];
    try {
      this.dec = label ? new TextDecoder(label) : null;
    } catch {
      this.dec = null;
    }
  }

  clear() {
    this.done = [];
    this.cur = [];
    this.style = {};
    this.esc = null;
    this.lastCR = false;
    this.version++;
  }

  feed(bytes: number[]) {
    if (!this.dec && LABEL[this.enc]) this.setEncoding(this.enc);
    const text = this.dec
      ? this.dec.decode(new Uint8Array(bytes), { stream: true })
      : bytes.map((b) => (this.enc === "ascii" && b >= 0x80 ? "�" : String.fromCharCode(b))).join("");
    for (const ch of text) this.put(ch);
    this.version++;
  }

  private put(ch: string) {
    if (this.esc != null) {
      this.esc += ch;
      this.escStep();
      return;
    }
    const c = ch.charCodeAt(0);
    if (ch === "\n") {
      if (!this.lastCR) this.newline();
      this.lastCR = false;
      return;
    }
    this.lastCR = false;
    if (ch === "\r") {
      this.newline();
      this.lastCR = true;
    } else if (c === 0x1b) this.esc = "";
    else if (ch === "\t") this.text("    ");
    else if (c === 0x08) this.backspace();
    else if (c < 0x20 || c === 0x7f) {
      /* 그 밖의 제어 문자(BEL 등)는 버린다 */
    } else this.text(ch);
  }

  /** ESC 뒤 — CSI(«[ … 끝 글자») 만 해석, OSC(«] … BEL/ST») 와 나머지는 버린다 */
  private escStep() {
    const s = this.esc!;
    if (s === "") return;
    if (s[0] === "[") {
      const last = s[s.length - 1];
      if (s.length > 1 && /[@-~]/.test(last)) {
        if (last === "m") this.sgr(s.slice(1, -1));
        this.esc = null;
      } else if (s.length > 64) this.esc = null;
    } else if (s[0] === "]") {
      if (s.endsWith("\x07") || s.endsWith("\x1b\\") || s.length > 256) this.esc = null;
    } else if (s[0] === "(" || s[0] === ")") {
      if (s.length >= 2) this.esc = null;
    } else this.esc = null;
  }

  private sgr(params: string) {
    const p = params === "" ? [0] : params.split(/[;:]/).map((x) => (x === "" ? 0 : Number(x)));
    for (let i = 0; i < p.length; i++) {
      const n = p[i];
      if (n === 0) this.style = {};
      else if (n === 1) this.style = { ...this.style, bold: true };
      else if (n === 22) this.style = { ...this.style, bold: undefined };
      else if (n >= 30 && n <= 37) this.style = { ...this.style, fg: n - 30 };
      else if (n >= 90 && n <= 97) this.style = { ...this.style, fg: n - 90 + 8 };
      else if (n === 39) this.style = { ...this.style, fg: undefined };
      else if (n >= 40 && n <= 47) this.style = { ...this.style, bg: n - 40 };
      else if (n >= 100 && n <= 107) this.style = { ...this.style, bg: n - 100 + 8 };
      else if (n === 49) this.style = { ...this.style, bg: undefined };
      else if ((n === 38 || n === 48) && p[i + 1] === 5) {
        const v = p[i + 2] ?? 0;
        this.style = n === 38 ? { ...this.style, fg: v } : { ...this.style, bg: v };
        i += 2;
      } else if ((n === 38 || n === 48) && p[i + 1] === 2) {
        const rgb = `#${[p[i + 2], p[i + 3], p[i + 4]].map((x) => Math.max(0, Math.min(255, x ?? 0)).toString(16).padStart(2, "0")).join("")}`;
        this.style = n === 38 ? { ...this.style, fg: rgb } : { ...this.style, bg: rgb };
        i += 4;
      }
    }
  }

  private text(t: string) {
    const last = this.cur[this.cur.length - 1];
    if (last && last.fg === this.style.fg && last.bg === this.style.bg && !!last.bold === !!this.style.bold) last.text += t;
    else this.cur.push({ text: t, ...clean(this.style) });
  }

  private backspace() {
    const last = this.cur[this.cur.length - 1];
    if (!last) return;
    last.text = [...last.text].slice(0, -1).join("");
    if (!last.text) this.cur.pop();
  }

  private newline() {
    this.done.push(this.cur);
    this.cur = [];
    if (this.done.length > this.max) this.done.splice(0, this.done.length - this.max);
  }

  /** 끝난 줄들 + 쓰는 중인 줄(비어 있지 않으면). 최대 max 줄 */
  lines(): Seg[][] {
    const all = this.cur.length ? [...this.done, this.cur] : this.done;
    return all.length > this.max ? all.slice(all.length - this.max) : all;
  }
}

function clean(s: Style): Style {
  const o: Style = {};
  if (s.fg !== undefined) o.fg = s.fg;
  if (s.bg !== undefined) o.bg = s.bg;
  if (s.bold) o.bold = true;
  return o;
}

/** xterm 16색 + 256색 표 → CSS 색 */
const BASE16 = ["#000000", "#cd3131", "#0dbc79", "#e5e510", "#2472c8", "#bc3fbc", "#11a8cd", "#e5e5e5", "#666666", "#f14c4c", "#23d18b", "#f5f543", "#3b8eea", "#d670d6", "#29b8db", "#ffffff"];
export function termColor(c: number | string | undefined): string | undefined {
  if (c === undefined) return undefined;
  if (typeof c === "string") return c;
  if (c < 16) return BASE16[c];
  if (c < 232) {
    const v = c - 16;
    const k = [0, 95, 135, 175, 215, 255];
    return `rgb(${k[Math.floor(v / 36)]},${k[Math.floor(v / 6) % 6]},${k[v % 6]})`;
  }
  const g = 8 + (c - 232) * 10;
  return `rgb(${g},${g},${g})`;
}
