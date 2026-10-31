// 배선도·구성도 공용 — 도형 목록(Shape) → SVG 글. 화면(React·DOM) 없이 글만 만든다(node --test 로 시험).
// 색은 이름(Ink)으로만 쓰고, 그릴 때 팔레트(LIGHT·DARK)로 바꾼다 — 화면은 브라우저 밝게/어둡게를 따라 다시 그리고, 인쇄는 밝게.

export type Ink =
  | "ink"
  | "muted"
  | "line"
  | "panel"
  | "bg"
  | "accent"
  | "dp"
  | "dn"
  | "gnd"
  | "pwr"
  | "zero"
  | "bk"
  | "br"
  | "aux"
  | "warn"
  | "eth"
  | "can"
  | "usb"
  | "wifi"
  | "loop";
export type Palette = Record<Ink, string>;

export const INKS: Ink[] = ["ink", "muted", "line", "panel", "bg", "accent", "dp", "dn", "gnd", "pwr", "zero", "bk", "br", "aux", "warn", "eth", "can", "usb", "wifi", "loop"];

/** 밝은 화면·인쇄용 */
export const LIGHT: Palette = {
  ink: "#1b1f24",
  muted: "#5a6572",
  line: "#8d98a3",
  panel: "#ffffff",
  bg: "#ffffff",
  accent: "#0b6e75",
  dp: "#c2410c",
  dn: "#0369a1",
  gnd: "#15803d",
  pwr: "#dc2626",
  zero: "#2563eb",
  bk: "#111827",
  br: "#8b4513",
  aux: "#7c3aed",
  warn: "#b42318",
  eth: "#0b6e75",
  can: "#a16207",
  usb: "#475569",
  wifi: "#9333ea",
  loop: "#be185d",
};
/** 어두운 화면용 */
export const DARK: Palette = {
  ink: "#e4e8ec",
  muted: "#9aa6b2",
  line: "#6b7682",
  panel: "#161b20",
  bg: "#0f1215",
  accent: "#4fb3ba",
  dp: "#fb923c",
  dn: "#38bdf8",
  gnd: "#4ade80",
  pwr: "#f87171",
  zero: "#60a5fa",
  bk: "#e5e7eb",
  br: "#d2955b",
  aux: "#c4b5fd",
  warn: "#f97066",
  eth: "#4fb3ba",
  can: "#facc15",
  usb: "#94a3b8",
  wifi: "#d8b4fe",
  loop: "#f472b6",
};
export type Shape =
  | { k: "box"; x: number; y: number; w: number; h: number; title: string; sub?: string; sub2?: string; fill?: Ink; stroke?: Ink; dash?: boolean; r?: number }
  | { k: "wire"; pts: [number, number][]; c: Ink; dash?: boolean; w?: number }
  | { k: "dot"; x: number; y: number; c: Ink }
  | { k: "term"; x: number; y: number; label: string; pos?: "below" | "above" | "left" | "right" }
  | { k: "res"; x1: number; y1: number; x2: number; y2: number; label?: string; c?: Ink }
  | { k: "diode"; x: number; y1: number; y2: number; c?: Ink; label?: string }
  | { k: "text"; x: number; y: number; t: string; anchor?: "start" | "middle" | "end"; size?: number; c?: Ink; bold?: boolean; bg?: boolean };

export interface LegendItem {
  c: Ink;
  label: string;
  dash?: boolean;
}

export interface Drawing {
  w: number;
  h: number;
  title: string;
  shapes: Shape[];
  legend: LegendItem[];
}

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v: number) => String(Math.round(v * 10) / 10);
const FONT = `'Segoe UI','Malgun Gothic','Pretendard',system-ui,sans-serif`;

/** 대략 글 너비(px) — 한글 등 넓은 글자는 1, 나머지 0.58 배 */
export const textWidth = (s: string, size: number) => [...s].reduce((w, c) => w + (/[ᄀ-ᇿ⺀-鿿가-힯＀-￯]/.test(c) ? size : size * 0.58), 0);

function shape(s: Shape, p: Palette): string {
  switch (s.k) {
    case "box": {
      const out = [
        `<rect x="${n(s.x)}" y="${n(s.y)}" width="${n(s.w)}" height="${n(s.h)}" rx="${s.r ?? 7}" fill="${p[s.fill ?? "panel"]}" stroke="${p[s.stroke ?? "line"]}" stroke-width="1.5"${s.dash ? ' stroke-dasharray="5 4"' : ""}/>`,
        `<text x="${n(s.x + s.w / 2)}" y="${n(s.y + 20)}" text-anchor="middle" font-size="13" font-weight="700" fill="${p.ink}">${esc(s.title)}</text>`,
      ];
      if (s.sub) out.push(`<text x="${n(s.x + s.w / 2)}" y="${n(s.y + 37)}" text-anchor="middle" font-size="11.5" fill="${p.muted}">${esc(s.sub)}</text>`);
      if (s.sub2) out.push(`<text x="${n(s.x + s.w / 2)}" y="${n(s.y + 52)}" text-anchor="middle" font-size="11.5" fill="${p.muted}">${esc(s.sub2)}</text>`);
      return out.join("");
    }
    case "wire":
      return `<polyline points="${s.pts.map(([x, y]) => `${n(x)},${n(y)}`).join(" ")}" fill="none" stroke="${p[s.c]}" stroke-width="${s.w ?? 2.4}" stroke-linejoin="round" stroke-linecap="round"${s.dash ? ' stroke-dasharray="7 5"' : ""}/>`;
    case "dot":
      return `<circle cx="${n(s.x)}" cy="${n(s.y)}" r="3.6" fill="${p[s.c]}"/>`;
    case "term": {
      const pos = s.pos ?? "above";
      const tx = pos === "left" ? s.x - 8 : pos === "right" ? s.x + 8 : s.x;
      const ty = pos === "below" ? s.y + 17 : pos === "above" ? s.y - 9 : s.y + 4;
      const anchor = pos === "left" ? "end" : pos === "right" ? "start" : "middle";
      return `<circle cx="${n(s.x)}" cy="${n(s.y)}" r="4.2" fill="${p.panel}" stroke="${p.ink}" stroke-width="1.4"/><text x="${n(tx)}" y="${n(ty)}" text-anchor="${anchor}" font-size="11" font-weight="600" fill="${p.ink}">${esc(s.label)}</text>`;
    }
    case "res": {
      const c = p[s.c ?? "ink"];
      const vert = Math.abs(s.x2 - s.x1) < Math.abs(s.y2 - s.y1);
      const mx = (s.x1 + s.x2) / 2;
      const my = (s.y1 + s.y2) / 2;
      const L = 11;
      const out: string[] = [];
      if (vert) {
        out.push(`<polyline points="${n(s.x1)},${n(s.y1)} ${n(mx)},${n(my - L)}" fill="none" stroke="${c}" stroke-width="2"/>`);
        out.push(`<polyline points="${n(mx)},${n(my + L)} ${n(s.x2)},${n(s.y2)}" fill="none" stroke="${c}" stroke-width="2"/>`);
        out.push(`<rect x="${n(mx - 5.5)}" y="${n(my - L)}" width="11" height="${2 * L}" fill="${p.panel}" stroke="${c}" stroke-width="1.8"/>`);
        if (s.label) out.push(`<text x="${n(mx + 9)}" y="${n(my + 4)}" font-size="11" fill="${p.ink}">${esc(s.label)}</text>`);
      } else {
        out.push(`<polyline points="${n(s.x1)},${n(s.y1)} ${n(mx - L)},${n(my)}" fill="none" stroke="${c}" stroke-width="2"/>`);
        out.push(`<polyline points="${n(mx + L)},${n(my)} ${n(s.x2)},${n(s.y2)}" fill="none" stroke="${c}" stroke-width="2"/>`);
        out.push(`<rect x="${n(mx - L)}" y="${n(my - 5.5)}" width="${2 * L}" height="11" fill="${p.panel}" stroke="${c}" stroke-width="1.8"/>`);
        if (s.label) out.push(`<text x="${n(mx)}" y="${n(my - 10)}" text-anchor="middle" font-size="11" fill="${p.ink}">${esc(s.label)}</text>`);
      }
      return out.join("");
    }
    case "diode": {
      // y1 = 캐소드(띠) 쪽, y2 = 애노드 쪽 — 전류는 애노드 → 캐소드
      const c = p[s.c ?? "ink"];
      const my = (s.y1 + s.y2) / 2;
      const up = s.y1 < s.y2;
      const k = up ? my - 7 : my + 7;
      const a = up ? my + 7 : my - 7;
      return [
        `<polyline points="${n(s.x)},${n(s.y1)} ${n(s.x)},${n(k)}" fill="none" stroke="${c}" stroke-width="2"/>`,
        `<polyline points="${n(s.x)},${n(a)} ${n(s.x)},${n(s.y2)}" fill="none" stroke="${c}" stroke-width="2"/>`,
        `<polygon points="${n(s.x - 8)},${n(a)} ${n(s.x + 8)},${n(a)} ${n(s.x)},${n(k)}" fill="${c}"/>`,
        `<line x1="${n(s.x - 8)}" y1="${n(k)}" x2="${n(s.x + 8)}" y2="${n(k)}" stroke="${c}" stroke-width="2.4"/>`,
        s.label ? `<text x="${n(s.x + 13)}" y="${n(my + 4)}" font-size="11" fill="${p.ink}">${esc(s.label)}</text>` : "",
      ].join("");
    }
    case "text": {
      const size = s.size ?? 12;
      const anchor = s.anchor ?? "start";
      const t = `<text x="${n(s.x)}" y="${n(s.y)}" text-anchor="${anchor}" font-size="${size}"${s.bold ? ' font-weight="700"' : ""} fill="${p[s.c ?? "ink"]}">${esc(s.t)}</text>`;
      if (!s.bg) return t;
      const w = textWidth(s.t, size) + 8;
      const x0 = anchor === "middle" ? s.x - w / 2 : anchor === "end" ? s.x - w : s.x - 4;
      return `<rect x="${n(x0)}" y="${n(s.y - size)}" width="${n(w)}" height="${n(size + 5)}" rx="3" fill="${p.panel}"/>` + t;
    }
  }
}

/** 범례 줄 높이 계산 — 너비 w 안에서 몇 줄 */
export function legendLayout(items: LegendItem[], w: number, x0 = 16) {
  const pos: { x: number; row: number }[] = [];
  let x = x0;
  let row = 0;
  for (const it of items) {
    const iw = 34 + textWidth(it.label, 12) + 18;
    if (x + iw > w - 8 && x > x0) {
      row++;
      x = x0;
    }
    pos.push({ x, row });
    x += iw;
  }
  return { pos, rows: items.length ? row + 1 : 0 };
}

export interface RenderOpts {
  /** 배경 사각형을 칠할지(저장할 때 true) */
  bg?: boolean;
  /** 위에 제목 줄 */
  title?: boolean;
  /** 맨 아래 작은 글(출처·만든 곳) */
  footer?: string;
}

/** 도형 → SVG 글. 범례·제목·아래 글을 넣으면 높이가 늘어난다 */
export function renderSvg(d: Drawing, p: Palette, o: RenderOpts = {}): string {
  const top = o.title ? 34 : 0;
  const lg = legendLayout(d.legend, d.w);
  const legH = lg.rows ? lg.rows * 22 + 12 : 0;
  const footH = o.footer ? 20 : 0;
  const H = top + d.h + legH + footH;
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(d.w)} ${n(H)}" width="${n(d.w)}" height="${n(H)}" font-family="${FONT}" role="img" aria-label="${esc(d.title)}">`);
  out.push(`<title>${esc(d.title)}</title>`);
  if (o.bg) out.push(`<rect x="0" y="0" width="${n(d.w)}" height="${n(H)}" fill="${p.bg}"/>`);
  if (o.title) out.push(`<text x="16" y="24" font-size="15" font-weight="700" fill="${p.ink}">${esc(d.title)}</text>`);
  out.push(top ? `<g transform="translate(0 ${top})">` : "<g>");
  for (const s of d.shapes) out.push(shape(s, p));
  out.push("</g>");
  if (lg.rows) {
    const y0 = top + d.h + 6;
    d.legend.forEach((it, i) => {
      const { x, row } = lg.pos[i];
      const y = y0 + row * 22 + 10;
      out.push(`<line x1="${n(x)}" y1="${n(y)}" x2="${n(x + 26)}" y2="${n(y)}" stroke="${p[it.c]}" stroke-width="3"${it.dash ? ' stroke-dasharray="6 4"' : ""}/>`);
      out.push(`<text x="${n(x + 32)}" y="${n(y + 4)}" font-size="12" fill="${p.ink}">${esc(it.label)}</text>`);
    });
  }
  if (o.footer) out.push(`<text x="${n(d.w - 12)}" y="${n(H - 6)}" text-anchor="end" font-size="10.5" fill="${p.muted}">${esc(o.footer)}</text>`);
  out.push("</svg>");
  return out.join("");
}
