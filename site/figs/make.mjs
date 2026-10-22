// 가이드 설명 그림(SVG) 생성기 — 좌표를 손으로 정해 쓴 그림을 ko/en 두 벌로 낸다. 쓰는 법: node site/figs/make.mjs (결과 SVG 를 커밋)
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../public/img/guides/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const FONT = "system-ui,-apple-system,'Segoe UI','Malgun Gothic','Apple SD Gothic Neo',sans-serif";
const MONO = "ui-monospace,Consolas,'Cascadia Mono',Menlo,monospace";
const INK = "#1f2933", MUTED = "#5a6572", LINE = "#8a96a3", BOXF = "#f3f5f8";
const CA = "#c2410c", CB = "#1d4ed8", CG = "#4b5563", OK = "#15803d", NG = "#b91c1c";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const svg = (w, h, title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${FONT}" font-size="14" fill="${INK}">\n<title>${esc(title)}</title>\n<rect width="${w}" height="${h}" rx="10" fill="#fff"/>\n${body}\n</svg>\n`;
const T = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}"${o.a ? ` text-anchor="${o.a}"` : ""}${o.s ? ` font-size="${o.s}"` : ""}${o.b ? ` font-weight="600"` : ""}${o.c ? ` fill="${o.c}"` : ""}${o.m ? ` font-family="${MONO}"` : ""}>${esc(s)}</text>`;
const L = (x1, y1, x2, y2, c = INK, w = 2, dash) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
const P = (d, c = INK, w = 2, fill = "none", dash) =>
  `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="${fill}" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
const R = (x, y, w, h, o = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 6}" fill="${o.f ?? BOXF}" stroke="${o.c ?? LINE}" stroke-width="${o.w ?? 1.5}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`;
const dot = (x, y, c = INK, r = 3.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
// 세로 저항: x 에서 y1~y2 사이, 가운데 직사각형
const resV = (x, y1, y2, c = INK) => {
  const m = (y1 + y2) / 2, h = Math.min(30, (y2 - y1) * 0.7);
  return L(x, y1, x, m - h / 2, c) + L(x, m + h / 2, x, y2, c) + R(x - 6, m - h / 2, 12, h, { rx: 1, f: "#fff", c, w: 2 });
};
// 가로 저항
const resH = (x1, x2, y, c = INK, len = 30) => {
  const m = (x1 + x2) / 2;
  return L(x1, y, m - len / 2, y, c) + L(m + len / 2, y, x2, y, c) + R(m - len / 2, y - 6, len, 12, { rx: 1, f: "#fff", c, w: 2 });
};
const arrowR = (x, y, c = INK) => `<path d="M${x - 9} ${y - 6} L${x} ${y} L${x - 9} ${y + 6} Z" fill="${c}"/>`;
const arrowL = (x, y, c = INK) => `<path d="M${x + 9} ${y - 6} L${x} ${y} L${x + 9} ${y + 6} Z" fill="${c}"/>`;
const okMark = (x, y) => `<circle cx="${x}" cy="${y}" r="10" fill="${OK}"/>` + P(`M${x - 5} ${y} L${x - 1} ${y + 4} L${x + 5} ${y - 4}`, "#fff", 2.5);
const ngMark = (x, y) => `<circle cx="${x}" cy="${y}" r="10" fill="${NG}"/>` + P(`M${x - 4} ${y - 4} L${x + 4} ${y + 4} M${x + 4} ${y - 4} L${x - 4} ${y + 4}`, "#fff", 2.5);

const figs = {};

// 1. RS-485 2선식 버스 — 마스터 + 슬레이브 3, A/B/GND, 양 끝 120 Ω
figs["rs485-bus"] = (t) => {
  const W = 780, H = 345;
  let b = "";
  const devs = [{ x: 60, n: t.master, s: "PC · PLC · HMI" }, ...[1, 2, 3].map((i) => ({ x: 80 + i * 170, n: `${t.slave} ${i}`, s: `ID ${i}` }))];
  const yA = 200, yB = 240, yG = 275;
  b += L(30, yA, 748, yA, CA, 3) + L(30, yB, 748, yB, CB, 3) + L(95 + 80, yG, 685 + 80 - 60, yG, CG, 3);
  b += T(44, yA - 7, "A", { c: CA, b: 1, s: 13 }) + T(44, yB - 7, "B", { c: CB, b: 1, s: 13 }) + T(178, yG - 7, "GND", { c: CG, b: 1, s: 12 });
  for (const d of devs) {
    b += R(d.x, 40, 150, 100);
    b += T(d.x + 75, 72, d.n, { a: "middle", b: 1, s: 15 }) + T(d.x + 75, 94, d.s, { a: "middle", c: MUTED, s: 13 });
    const xs = [d.x + 35, d.x + 75, d.x + 115], ys = [yA, yB, yG], cs = [CA, CB, CG], ns = ["A", "B", "GND"];
    xs.forEach((x, i) => {
      b += L(x, 140, x, ys[i], cs[i], 2) + dot(x, ys[i], cs[i]) + T(x, 132, ns[i], { a: "middle", s: 11, c: cs[i], b: 1 });
    });
  }
  b += resV(30, yA, yB) + T(30, yB + 22, "120 Ω", { a: "middle", s: 13, b: 1 });
  b += resV(748, yA, yB) + T(748, yB + 22, "120 Ω", { a: "middle", s: 13, b: 1 });
  b += T(W / 2, 312, t.busNote1, { a: "middle", s: 13 });
  b += T(W / 2, 332, t.busNote2, { a: "middle", s: 13, c: MUTED });
  return [W, H, b];
};

// 2. 배선 모양 — 데이지 체인(올바름) vs 스타·긴 가지선(잘못)
figs["rs485-topology"] = (t) => {
  const W = 780, H = 290;
  let b = "";
  const PAIR = "#374151";
  const dev = (cx, cy, s) => R(cx - 20, cy - 14, 40, 28, { rx: 4 }) + T(cx, cy + 5, s, { a: "middle", s: 13, b: 1 });
  const term = (x, y) => R(x - 5, y - 10, 10, 20, { rx: 1, f: "#fff", c: INK, w: 2 });
  const panels = [15, 270, 525];
  panels.forEach((x0) => (b += R(x0, 10, 240, 270, { f: "#fff", c: "#dde2e7", rx: 8 })));
  // 데이지 체인
  {
    const x0 = 15, y = 165;
    b += okMark(x0 + 22, 36) + T(x0 + 40, 41, t.chain, { b: 1, s: 14 });
    b += L(x0 + 25, y, x0 + 215, y, PAIR, 3);
    [["M", 45], ["S1", 95], ["S2", 145], ["S3", 195]].forEach(([s, dx]) => (b += L(x0 + dx, y - 26, x0 + dx, y, PAIR, 2) + dot(x0 + dx, y, PAIR) + dev(x0 + dx, y - 40, s)));
    b += term(x0 + 25, y) + term(x0 + 215, y);
    b += T(x0 + 25, y + 30, "120 Ω", { a: "middle", s: 12 }) + T(x0 + 215, y + 30, "120 Ω", { a: "middle", s: 12 });
    b += T(x0 + 120, 262, t.chainNote, { a: "middle", s: 13, c: MUTED });
  }
  // 스타
  {
    const x0 = 270, hx = x0 + 120, hy = 150;
    b += ngMark(x0 + 22, 36) + T(x0 + 40, 41, t.star, { b: 1, s: 14 });
    const ends = [["M", x0 + 45, 85], ["S1", x0 + 195, 85], ["S2", x0 + 45, 215], ["S3", x0 + 195, 215]];
    for (const [, x, y] of ends) b += L(hx, hy, x, y, PAIR, 3);
    for (const [s, x, y] of ends) b += dev(x, y, s);
    b += dot(hx, hy, PAIR, 6) + T(hx + 14, hy + 5, "?", { b: 1, s: 16, c: NG });
    b += T(x0 + 120, 262, t.starNote, { a: "middle", s: 13, c: MUTED });
  }
  // 긴 가지선
  {
    const x0 = 525, y = 110;
    b += ngMark(x0 + 22, 36) + T(x0 + 40, 41, t.stub, { b: 1, s: 14 });
    b += L(x0 + 25, y, x0 + 215, y, PAIR, 3);
    [["M", 45], ["S1", 120], ["S2", 195]].forEach(([s, dx]) => (b += L(x0 + dx, y - 22, x0 + dx, y, PAIR, 2) + dot(x0 + dx, y, PAIR) + dev(x0 + dx, y - 36, s)));
    b += term(x0 + 25, y) + term(x0 + 215, y);
    b += L(x0 + 158, y, x0 + 158, 206, NG, 3, "7 5") + dot(x0 + 158, y, NG) + dev(x0 + 158, 220, "S3");
    b += T(x0 + 168, 165, t.stubLabel, { s: 12, c: NG, b: 1 });
    b += T(x0 + 120, 262, t.stubNote, { a: "middle", s: 13, c: MUTED });
  }
  return [W, H, b];
};

// 3. RS-232 / RS-422 / RS-485 연결 비교
figs["serial-topologies"] = (t) => {
  const W = 780, H = 480;
  let b = "";
  const label = (y0, name, sub) => T(20, y0 + 58, name, { b: 1, s: 18 }) + T(20, y0 + 80, sub, { s: 13, c: MUTED });
  // RS-232
  {
    const y0 = 10;
    b += label(y0, "RS-232", t.single);
    b += R(150, y0 + 20, 120, 95);
    b += T(158, y0 + 74, "PC", { b: 1, s: 15 });
    b += R(600, y0 + 20, 120, 95) + T(712, y0 + 74, t.device, { a: "end", b: 1, s: 15 });
    const a = y0 + 42, r = y0 + 67, g = y0 + 92;
    b += T(262, a + 5, "TxD", { a: "end", s: 12, m: 1 }) + T(262, r + 5, "RxD", { a: "end", s: 12, m: 1 }) + T(262, g + 5, "GND", { a: "end", s: 12, m: 1 });
    b += T(608, a + 5, "TxD", { s: 12, m: 1 }) + T(608, r + 5, "RxD", { s: 12, m: 1 }) + T(608, g + 5, "GND", { s: 12, m: 1 });
    b += P(`M270 ${a} H385 L485 ${r} H600`, CA, 2.5) + arrowR(600, r, CA);
    b += P(`M600 ${a} H485 L385 ${r} H270`, CB, 2.5) + arrowL(270, r, CB);
    b += L(270, g, 600, g, CG, 2.5);
    b += T(435, y0 + 142, t.r232, { a: "middle", s: 13 });
  }
  // RS-422
  {
    const y0 = 165, p1 = y0 + 45, p2 = y0 + 65;
    b += label(y0, "RS-422", t.diff);
    b += R(150, y0 + 25, 70, 60) + T(185, y0 + 61, "TX", { a: "middle", b: 1, s: 15 });
    b += L(220, p1, 735, p1, CA, 2.5) + L(220, p2, 735, p2, CB, 2.5);
    b += arrowR(300, p1, CA) + arrowR(300, p2, CB);
    [[330, "RX 1"], [440, "RX 2"], [630, "RX 10"]].forEach(([x, s]) => {
      b += L(x + 20, p1, x + 20, y0 + 92, CA, 2) + dot(x + 20, p1, CA) + L(x + 45, p2, x + 45, y0 + 92, CB, 2) + dot(x + 45, p2, CB);
      b += R(x, y0 + 92, 65, 30, { rx: 4 }) + T(x + 32, y0 + 112, s, { a: "middle", s: 13, b: 1 });
    });
    b += T(570, y0 + 112, "…", { a: "middle", s: 18, b: 1 });
    b += resV(735, p1, p2) + T(735, y0 + 36, t.term, { a: "middle", s: 12, c: MUTED });
    b += T(450, y0 + 142, t.r422, { a: "middle", s: 13 });
  }
  // RS-485
  {
    const y0 = 320, p1 = y0 + 45, p2 = y0 + 65;
    b += label(y0, "RS-485", t.diff);
    b += L(150, p1, 745, p1, CA, 2.5) + L(150, p2, 745, p2, CB, 2.5);
    [[175, "M"], [305, "S1"], [435, "S2"], [640, "Sn"]].forEach(([x, s]) => {
      b += L(x + 20, p1, x + 20, y0 + 92, CA, 2) + dot(x + 20, p1, CA) + L(x + 45, p2, x + 45, y0 + 92, CB, 2) + dot(x + 45, p2, CB);
      b += R(x, y0 + 92, 65, 30, { rx: 4 }) + T(x + 32, y0 + 112, s, { a: "middle", s: 13, b: 1 });
    });
    b += T(570, y0 + 112, "…", { a: "middle", s: 18, b: 1 });
    b += resV(150, p1, p2) + resV(745, p1, p2);
    b += T(150, y0 + 30, "120 Ω", { a: "middle", s: 12 }) + T(745, y0 + 30, "120 Ω", { a: "middle", s: 12 });
    b += T(450, y0 + 145, t.r485, { a: "middle", s: 13 });
  }
  return [W, H, b];
};

// 4. 4–20 mA 2선식 vs 4선식, 250 Ω → 1–5 V
figs["4-20ma-wiring"] = (t) => {
  const W = 780, H = 535;
  let b = "";
  const input = (y0, sub) => {
    let s = R(600, y0 + 45, 160, 160) + T(680, y0 + 68, t.input, { a: "middle", b: 1, s: 15 }) + T(680, y0 + 88, sub, { a: "middle", s: 12, c: MUTED });
    s += T(608, y0 + 86 + 14, "+", { b: 1, s: 15 }) + T(608, y0 + 186, "−", { b: 1, s: 15 });
    s += P(`M600 ${y0 + 110} H640`, INK, 2) + resV(640, y0 + 110, y0 + 185) + P(`M640 ${y0 + 185} H600`, INK, 2);
    s += T(652, y0 + 145, "250 Ω", { s: 13, b: 1 }) + T(652, y0 + 165, "1–5 V", { s: 13, c: CB, b: 1 });
    return s;
  };
  // 2선식
  {
    const y0 = 10;
    b += T(20, y0 + 25, t.two, { b: 1, s: 16 });
    b += R(40, y0 + 80, 120, 120) + T(100, y0 + 135, t.supply, { a: "middle", b: 1, s: 14 }) + T(100, y0 + 155, "DC", { a: "middle", s: 13, c: MUTED });
    b += T(148, y0 + 104, "+", { b: 1, s: 15 }) + T(148, y0 + 190, "−", { b: 1, s: 15 });
    b += R(320, y0 + 70, 150, 80) + T(395, y0 + 105, t.tx, { a: "middle", b: 1, s: 15 }) + T(395, y0 + 125, t.tx2, { a: "middle", s: 12, c: MUTED });
    b += T(328, y0 + 104, "+", { b: 1, s: 14 }) + T(462, y0 + 104, "−", { a: "end", b: 1, s: 14 });
    b += P(`M160 ${y0 + 100} H320`, CA, 2.5) + P(`M470 ${y0 + 100} H530 V${y0 + 110} H600`, CA, 2.5);
    b += P(`M600 ${y0 + 185} H160`, CA, 2.5);
    b += arrowR(250, y0 + 100, CA) + T(240, y0 + 90, "4–20 mA", { a: "middle", s: 13, b: 1, c: CA });
    b += arrowL(380, y0 + 185, CA);
    b += input(y0, t.inPowered);
    b += T(20, y0 + 225, t.twoNote[0], { s: 13, c: MUTED }) + T(20, y0 + 243, t.twoNote[1], { s: 13, c: MUTED });
  }
  // 4선식
  {
    const y0 = 275;
    b += T(20, y0 + 25, t.four, { b: 1, s: 16 });
    b += R(40, y0 + 80, 120, 80) + T(100, y0 + 125, t.power, { a: "middle", b: 1, s: 14 });
    b += R(300, y0 + 60, 170, 130) + T(385, y0 + 120, t.tx, { a: "middle", b: 1, s: 15 }) + T(385, y0 + 140, t.tx4, { a: "middle", s: 12, c: MUTED });
    b += P(`M160 ${y0 + 95} H300`, CG, 2.5) + P(`M160 ${y0 + 145} H300`, CG, 2.5);
    b += T(230, y0 + 125, "PWR", { a: "middle", s: 12, m: 1, c: MUTED });
    b += T(462, y0 + 114, "+", { a: "end", s: 14, b: 1 }) + T(462, y0 + 184, "−", { a: "end", s: 14, b: 1 });
    b += P(`M470 ${y0 + 110} H600`, CA, 2.5) + P(`M470 ${y0 + 180} V${y0 + 185} H600`, CA, 2.5);
    b += arrowR(540, y0 + 110, CA) + T(530, y0 + 100, "4–20 mA", { a: "middle", s: 13, b: 1, c: CA });
    b += input(y0, t.inPassive);
    b += T(20, y0 + 225, t.fourNote[0], { s: 13, c: MUTED }) + T(20, y0 + 243, t.fourNote[1], { s: 13, c: MUTED });
  }
  return [W, H, b];
};

// 5. Pt100 2·3·4선식
figs["pt100-wiring"] = (t) => {
  const W = 780, H = 330;
  let b = "";
  const xs = [10, 268, 526];
  const lead = (x1, x2, y) => resH(x1, x2, y, INK, 26);
  xs.forEach((x0, k) => {
    b += R(x0, 10, 244, 310, { f: "#fff", c: "#dde2e7", rx: 8 });
    b += T(x0 + 16, 38, t.wires[k], { b: 1, s: 16 });
    const sx = x0 + 40, ix = x0 + 170;
    const top = k === 2 ? 125 : 105, bot = k === 2 ? 185 : 195;
    b += resV(sx, top, bot, CA) + T(sx - 8, 154, "Pt100", { a: "end", s: 11, c: CA, b: 1 }) + T(sx + 12, 154, "Rt", { s: 12, c: CA, b: 1, m: 1 });
    b += R(ix, 60, 60, 180, { rx: 4 }) + T(ix + 30, 80, t.input, { a: "middle", s: 12, b: 1 });
    const rl = (y) => T(x0 + 105, y - 11, "RL", { a: "middle", s: 11, c: MUTED });
    const meter = `<circle cx="${ix + 30}" cy="150" r="16" fill="#fff" stroke="${INK}" stroke-width="2"/>` + T(ix + 30, 155, "Ω", { a: "middle", s: 15, b: 1 });
    if (k === 0) {
      b += lead(sx, ix, top) + lead(sx, ix, bot) + rl(top) + rl(bot) + meter;
      b += T(x0 + 122, 272, "R = Rt + 2·RL", { a: "middle", s: 14, b: 1, c: NG, m: 1 });
    } else if (k === 1) {
      b += lead(sx, ix, top) + lead(sx, ix, bot) + P(`M${sx} ${bot} V225`, INK, 2) + lead(sx, ix, 225) + dot(sx, bot);
      b += rl(top) + rl(bot) + rl(225) + meter;
      b += T(x0 + 122, 272, "RL1 = RL2 = RL3 → R = Rt", { a: "middle", s: 13, b: 1, c: OK, m: 1 });
    } else {
      b += P(`M${sx} ${top} V95`, INK, 2) + dot(sx, top) + lead(sx, ix, 95) + lead(sx, ix, top);
      b += P(`M${sx} ${bot} V215`, INK, 2) + dot(sx, bot) + lead(sx, ix, bot) + lead(sx, ix, 215);
      b += [95, top, bot, 215].map(rl).join("");
      b += T(ix + 8, 99, "I+", { s: 11, m: 1, b: 1 }) + T(ix + 8, top + 4, "V+", { s: 11, m: 1, b: 1, c: CB }) + T(ix + 8, bot + 4, "V−", { s: 11, m: 1, b: 1, c: CB }) + T(ix + 8, 219, "I−", { s: 11, m: 1, b: 1 });
      b += T(x0 + 122, 272, "I(V±) ≈ 0 → R = Rt", { a: "middle", s: 13, b: 1, c: OK, m: 1 });
    }
    b += T(x0 + 122, 296, t.notes[k][0], { a: "middle", s: 12, c: MUTED }) + T(x0 + 122, 312, t.notes[k][1], { a: "middle", s: 12, c: MUTED });
  });
  return [W, H, b];
};

// 6. 열전대 냉접점 보정 — K 형 300 °C, 단자 25 °C
figs["thermocouple-cjc"] = (t) => {
  const W = 780, H = 320;
  let b = "";
  const yp = 95, yn = 145;
  // 측정 접점
  b += P(`M70 120 L110 ${yp} H430`, CA, 3) + P(`M70 120 L110 ${yn} H430`, CB, 3) + dot(70, 120, INK, 6);
  b += T(70, 75, "300 °C", { a: "middle", b: 1, s: 16, c: NG }) + T(70, 175, t.hot, { a: "middle", s: 12, c: MUTED }) + T(70, 191, t.hot2, { a: "middle", s: 12, c: MUTED });
  b += T(150, yp - 8, "+ (K)", { s: 13, b: 1, c: CA }) + T(150, yn + 20, "− (K)", { s: 13, b: 1, c: CB });
  b += T(270, 125, t.cable, { a: "middle", s: 12, c: MUTED });
  // 냉접점(단자)
  b += R(400, 55, 90, 140, { dash: "5 4", f: "#fff", c: CB });
  b += `<circle cx="440" cy="${yp}" r="8" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="440" cy="${yn}" r="8" fill="#fff" stroke="${INK}" stroke-width="2"/>`;
  b += T(445, 48, t.cold, { a: "middle", s: 13, b: 1, c: CB }) + T(445, 215, "25 °C", { a: "middle", s: 15, b: 1, c: CB });
  b += P(`M448 ${yp} H560`, CG, 2) + P(`M448 ${yn} H560`, CG, 2);
  // 입력
  b += R(560, 55, 200, 140) + T(660, 82, t.input, { a: "middle", b: 1, s: 15 });
  b += T(660, 120, t.measured, { a: "middle", s: 13, c: MUTED }) + T(660, 145, "11.208 mV", { a: "middle", s: 17, b: 1, m: 1 });
  // 결과
  b += R(20, 240, 360, 66, { f: "#ecf8f0", c: OK }) + okMark(42, 262);
  b += T(60, 267, t.cjcOn, { s: 13, b: 1 }) + T(60, 290, t.cjcOn2, { s: 13 });
  b += R(400, 240, 360, 66, { f: "#fdeeee", c: NG }) + ngMark(422, 262);
  b += T(440, 267, t.cjcOff, { s: 13, b: 1 }) + T(440, 290, t.cjcOff2, { s: 13 });
  return [W, H, b];
};

// 바이트 칸
const cell = (x, y, w, s, f, c = LINE) => R(x, y, w, 44, { rx: 3, f, c }) + T(x + w / 2, y + 28, s, { a: "middle", s: 16, b: 1, m: 1 });
const C_ID = "#e0ecff", C_FC = "#ffe3c2", C_DATA = "#e3f4e8", C_CRC = "#efe5ff", C_MBAP = "#eef0f3";
const bracket = (x1, x2, y, s, c = MUTED) => P(`M${x1} ${y + 6} V${y} H${x2} V${y + 6}`, c, 1.5) + T((x1 + x2) / 2, y - 6, s, { a: "middle", s: 12, c });

// 7. Modbus RTU 프레임 — 요청·응답 바이트 띠
figs["modbus-rtu-frame"] = (t) => {
  const W = 780, H = 310;
  let b = "";
  const X = 120, S = 66, CW = 62;
  const row = (y, bytes, groups) => {
    let s = "";
    bytes.forEach(([v, f], i) => (s += cell(X + i * S, y, CW, v, f)));
    for (const [from, n, l1, l2] of groups) {
      const cx = X + from * S + (n * S - 4) / 2;
      s += T(cx, y + 64, l1, { a: "middle", s: 13, b: 1 }) + (l2 ? T(cx, y + 81, l2, { a: "middle", s: 12, c: MUTED, m: 1 }) : "");
    }
    return s;
  };
  b += T(20, 102, t.req, { b: 1, s: 16 });
  b += bracket(X, X + 6 * S - 4, 62, t.crcRange);
  b += row(72, [["01", C_ID], ["03", C_FC], ["00", C_DATA], ["00", C_DATA], ["00", C_DATA], ["02", C_DATA], ["C4", C_CRC], ["0B", C_CRC]], [
    [0, 1, t.id], [1, 1, t.fc], [2, 2, t.start, "Hi · Lo"], [4, 2, t.qty, "Hi · Lo"], [6, 2, "CRC", "Lo · Hi"],
  ]);
  b += T(20, 230, t.res, { b: 1, s: 16 });
  b += row(200, [["01", C_ID], ["03", C_FC], ["04", C_DATA], ["00", C_DATA], ["64", C_DATA], ["00", C_DATA], ["C8", C_DATA], ["BA", C_CRC], ["7A", C_CRC]], [
    [0, 1, t.id], [1, 1, t.fc], [2, 1, t.count], [3, 2, `${t.reg1} = 100`], [5, 2, `${t.reg2} = 200`], [7, 2, "CRC", "Lo · Hi"],
  ]);
  return [W, H, b];
};

// 8. RTU 와 TCP — 같은 PDU, 앞뒤만 다르다
figs["modbus-rtu-vs-tcp"] = (t) => {
  const W = 780, H = 300;
  let b = "";
  const X = 100, S = 46, CW = 43, PDU = X + 7 * S;
  const pdu = [["03", C_FC], ["00", C_DATA], ["00", C_DATA], ["00", C_DATA], ["02", C_DATA]];
  const yR = 62, yT = 192;
  // RTU
  b += T(20, yR + 28, "RTU", { b: 1, s: 18 });
  b += cell(PDU - S, yR, CW, "01", C_ID);
  pdu.forEach(([v, f], i) => (b += cell(PDU + i * S, yR, CW, v, f)));
  b += cell(PDU + 5 * S, yR, CW, "C4", C_CRC) + cell(PDU + 6 * S, yR, CW, "0B", C_CRC);
  b += T(PDU - S + CW / 2, yR + 64, t.id, { a: "middle", s: 12, b: 1 });
  b += T(PDU + 6 * S - 2, yR + 64, "CRC16", { a: "middle", s: 12, b: 1 });
  b += T(PDU + CW / 2, yR - 10, t.fc, { a: "middle", s: 12, b: 1, c: "#b45309" }) + P(`M${PDU + CW / 2} ${yR - 6} V${yR}`, "#b45309", 1.5);
  // TCP
  b += T(20, yT + 28, "TCP", { b: 1, s: 18 });
  const mbap = ["00", "01", "00", "00", "00", "06", "01"];
  mbap.forEach((v, i) => (b += cell(X + i * S, yT, CW, v, i === 6 ? C_ID : C_MBAP)));
  pdu.forEach(([v, f], i) => (b += cell(PDU + i * S, yT, CW, v, f)));
  b += bracket(X, X + 7 * S - 3, yT - 14, t.mbap);
  [[0, 2, t.trans], [2, 2, t.proto], [4, 2, t.len], [6, 1, "Unit ID"]].forEach(([from, n, l]) => (b += T(X + from * S + (n * S - 3) / 2, yT + 64, l, { a: "middle", s: 12, b: 1 })));
  b += T(PDU + 5 * S + 46, yT + 28, t.noCrc, { a: "middle", s: 13, b: 1, c: NG });
  // 같은 PDU
  b += R(PDU - 4, yR - 4, 5 * S + 5, 52, { f: "none", c: OK, w: 2, rx: 5 }) + R(PDU - 4, yT - 4, 5 * S + 5, 52, { f: "none", c: OK, w: 2, rx: 5 });
  b += L(PDU + (5 * S) / 2, yR + 48, PDU + (5 * S) / 2, yT - 4, OK, 1.5, "4 4");
  b += T(PDU + (5 * S) / 2 + 10, yR + 92, t.same, { s: 13, b: 1, c: OK });
  b += T(PDU + (5 * S) / 2 + 10, yR + 110, t.same2, { s: 12, c: MUTED });
  return [W, H, b];
};

const L10N = {
  "rs485-bus": {
    ko: { title: "RS-485 2선식 버스 배선", master: "마스터", slave: "슬레이브", busNote1: "A·B·GND 를 장비마다 차례로 잇고, 선로 양 끝 두 곳에만 120 Ω 종단 저항", busNote2: "표준 송수신기 32대(단위 부하)까지 · 느린 속도에서 약 1200 m" },
    en: { title: "Two-wire RS-485 bus wiring", master: "Master", slave: "Slave", busNote1: "A, B and GND chained device to device; 120 Ω termination at the two ends only", busNote2: "Up to 32 standard transceivers (unit loads) · about 1200 m at low baud rates" },
  },
  "rs485-topology": {
    ko: { title: "RS-485 배선 모양: 데이지 체인과 잘못된 예", chain: "데이지 체인", chainNote: "양 끝에만 종단", star: "스타(별) 배선", starNote: "끝이 여럿 — 반사", stub: "긴 가지선", stubLabel: "가지선", stubNote: "가지 끝에서 반사" },
    en: { title: "RS-485 topology: daisy chain and wrong examples", chain: "Daisy chain", chainNote: "Terminate both ends only", star: "Star", starNote: "Many ends — reflections", stub: "Long stub", stubLabel: "stub", stubNote: "Reflections from the stub" },
  },
  "serial-topologies": {
    ko: { title: "RS-232·RS-422·RS-485 연결 비교", single: "단일 종단", diff: "차동", device: "장비", r232: "1:1 · TxD↔RxD 엇갈림 · GND 기준 전압 · 약 20 m", term: "종단", r422: "송신기 1 : 수신기 최대 10 · 한 쌍은 한 방향 · 최대 1200 m", r485: "한 쌍을 함께 씀(반이중, 한 번에 하나만 송신) · 32 단위 부하 · 최대 1200 m" },
    en: { title: "RS-232, RS-422 and RS-485 connections compared", single: "single-ended", diff: "differential", device: "Device", r232: "Point-to-point · TxD↔RxD crossed · voltage to GND · about 20 m", term: "term.", r422: "1 driver : up to 10 receivers · one direction per pair · up to 1200 m", r485: "Shared pair (half duplex, one talker at a time) · 32 unit loads · up to 1200 m" },
  },
  "4-20ma-wiring": {
    ko: { title: "4–20 mA 2선식과 4선식 결선", two: "2선식 (루프 전원)", four: "4선식 (능동 출력)", supply: "루프 전원", power: "전원", tx: "전송기", tx2: "2선식 · 전원 = 신호선", tx4: "따로 전원 · 전류를 스스로 냄", input: "입력", inPowered: "전류만 재는 입력", inPassive: "전류만 재는 입력", twoNote: ["두 선이 전원이자 신호 — 루프 어딘가에 전원이 하나 있어야 합니다.", "250 Ω 에서 4 mA → 1 V, 20 mA → 5 V."], fourNote: ["전송기가 전류를 스스로 내므로 받는 쪽은 루프 전원을 대지 않는 입력이어야 합니다.", "전원을 대는 입력에 물리면 루프에 전원이 둘이 됩니다."] },
    en: { title: "4–20 mA two-wire and four-wire connections", two: "2-wire (loop-powered)", four: "4-wire (active output)", supply: "Loop supply", power: "Power", tx: "Transmitter", tx2: "2-wire · power = signal", tx4: "own supply · drives current", input: "Input", inPowered: "measures current only", inPassive: "measures current only", twoNote: ["Two wires carry power and signal — the loop needs one supply somewhere.", "Across 250 Ω: 4 mA → 1 V, 20 mA → 5 V."], fourNote: ["The transmitter drives the current itself, so the input must not supply the loop.", "A powered input would put two sources in the loop."] },
  },
  "pt100-wiring": {
    ko: { title: "Pt100 2선·3선·4선식 결선", input: "입력", wires: ["2선식", "3선식", "4선식"], notes: [["왕복 선 저항이 더해져", "높게 읽음 (1 Ω ≈ 2.6 °C)"], ["셋째 선으로 선 저항을 재서 뺌", "세 선 저항이 같아야 상쇄"], ["전류 선과 전압 선이 따로", "선 저항을 무시할 만함"]] },
    en: { title: "Pt100 two-, three- and four-wire connections", input: "Input", wires: ["2-wire", "3-wire", "4-wire"], notes: [["Lead resistance adds in,", "reads high (1 Ω ≈ 2.6 °C)"], ["Third wire measures and", "subtracts lead resistance if equal"], ["Separate current and sense", "wires: leads negligible"]] },
  },
  "thermocouple-cjc": {
    ko: { title: "열전대 냉접점 보정 (K 형 300 °C, 단자 25 °C)", hot: "측정 접점", hot2: "(열접점)", cable: "보상 도선(같은 형)", cold: "냉접점 = 입력 단자", input: "입력 장치", measured: "단자에서 재는 전압", cjcOn: "냉접점 보정 켬", cjcOn2: "단자 25 °C 몫을 더해 → 300 °C", cjcOff: "냉접점 보정 없음", cjcOff2: "냉접점 0 °C 로 보면 → 약 275.8 °C" },
    en: { title: "Thermocouple cold-junction compensation (type K at 300 °C, terminals at 25 °C)", hot: "Measuring", hot2: "(hot) junction", cable: "Extension cable (same type)", cold: "Cold junction = input terminals", input: "Input device", measured: "Voltage at the terminals", cjcOn: "CJC on", cjcOn2: "adds the 25 °C share → 300 °C", cjcOff: "No CJC", cjcOff2: "read as if 0 °C → about 275.8 °C" },
  },
  "modbus-rtu-frame": {
    ko: { title: "Modbus RTU 요청·응답 프레임", req: "요청", res: "응답", crcRange: "CRC16 계산 범위 (국번 ~ 마지막 데이터)", id: "국번", fc: "함수", start: "시작 주소", qty: "개수", count: "바이트 수", reg1: "레지스터 1", reg2: "레지스터 2" },
    en: { title: "Modbus RTU request and response frames", req: "Request", res: "Response", crcRange: "CRC16 covers slave ID to last data byte", id: "Slave ID", fc: "Function", start: "Start address", qty: "Quantity", count: "Byte count", reg1: "Register 1", reg2: "Register 2" },
  },
  "modbus-rtu-vs-tcp": {
    ko: { title: "Modbus RTU 와 TCP 요청 비교", id: "국번", fc: "함수 코드", mbap: "MBAP 머리 · 7바이트", trans: "트랜잭션 ID", proto: "프로토콜 ID", len: "길이", noCrc: "CRC 없음", same: "같은 PDU", same2: "함수 03 · 주소 0 · 개수 2" },
    en: { title: "Modbus RTU and TCP requests compared", id: "Slave ID", fc: "Function code", mbap: "MBAP header · 7 bytes", trans: "Transaction ID", proto: "Protocol ID", len: "Length", noCrc: "No CRC", same: "Same PDU", same2: "FC 03 · address 0 · qty 2" },
  },
};

for (const [name, f] of Object.entries(figs)) {
  for (const lang of ["ko", "en"]) {
    const t = L10N[name][lang];
    const [w, h, body] = f(t);
    const file = `${OUT}/${name}.${lang}.svg`;
    writeFileSync(file, svg(w, h, t.title, body));
    console.log(file, w, h);
  }
}
