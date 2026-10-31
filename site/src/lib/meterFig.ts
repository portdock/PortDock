// 멀티미터 점검기의 «어디에 대고 재나» 그림 — 단자 줄 + 멀티미터 + 빨강·검정 프로브. 빌드 때 SVG 글로 만든다(브라우저 일 없음).
// 색은 currentColor(밝게/어둡게 자동), 빨강 프로브만 고정색. 그림은 설명용 — 실제 단자 번호는 장비 매뉴얼을 따른다.
import type { ItemId, Lang } from "./meterCheck.ts";

interface Term {
  label: string;
  /** 같은 group 끼리 상자로 묶는다 */
  group: string;
}
interface Fig {
  terms: Term[];
  /** 빨강 프로브가 닿는 단자 번호들(둘이면 ①② 로 차례 측정) */
  red: number[];
  black: number;
  /** 멀티미터 화면 글 */
  mode: string;
  /** 위쪽 조건 글 */
  cond: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function figOf(id: Exclude<ItemId, "loop-ma">, lang: Lang): Fig {
  const ko = lang === "ko";
  const bus = ko ? "RS-485 장비 단자" : "RS-485 device terminals";
  switch (id) {
    case "rs485-ohm":
      return { terms: [{ label: "A (D0 −)", group: bus }, { label: "B (D1 +)", group: bus }, { label: "SG", group: bus }], red: [1], black: 0, mode: "Ω", cond: ko ? "모든 장비 전원 끔 · 선은 그대로" : "All devices powered off · wiring left in place" };
    case "rs485-idle":
      return { terms: [{ label: "A (D0 −)", group: bus }, { label: "B (D1 +)", group: bus }, { label: "SG", group: bus }], red: [1], black: 0, mode: "V⎓", cond: ko ? "전원 켬 · 폴링 멈춤" : "Power on · polling stopped" };
    case "rs485-cm":
      return { terms: [{ label: "A (D0 −)", group: bus }, { label: "B (D1 +)", group: bus }, { label: "SG", group: bus }], red: [0, 1], black: 2, mode: "V⎓", cond: ko ? "전원 켬 · ① A–SG, ② B–SG" : "Power on · ① A–SG, ② B–SG" };
    case "supply-24v": {
      const g = ko ? "멀리 있는 장비 단자" : "Terminals at the far device";
      return { terms: [{ label: "+24V", group: g }, { label: "0V", group: g }], red: [0], black: 1, mode: "V⎓", cond: ko ? "부하 켠 채로 · 장비 쪽에서" : "Load switched on · at the device end" };
    }
    case "sensor-out": {
      const g = ko ? "센서 선(3선식)" : "Sensor wires (3-wire)";
      return { terms: [{ label: ko ? "갈색 +V" : "Brown +V", group: g }, { label: ko ? "검정 출력" : "Black out", group: g }, { label: ko ? "파랑 0V" : "Blue 0V", group: g }], red: [1], black: 2, mode: "V⎓", cond: ko ? "PLC 입력에 이은 채 · 켜짐/꺼짐 각각" : "Connected to the PLC input · ON and OFF" };
    }
    case "rs232-tx": {
      const g = ko ? "PC 쪽 DB9 (DTE)" : "PC-side DB9 (DTE)";
      return { terms: [{ label: "2 RXD", group: g }, { label: "3 TXD", group: g }, { label: "5 GND", group: g }], red: [1], black: 2, mode: "V⎓", cond: ko ? "보내지 않을 때 · 장비 뗀 채로도 됨" : "Not transmitting · device may be unplugged" };
    }
    case "ground-diff":
      return {
        terms: [
          { label: ko ? "USB 외함" : "USB shell", group: "PC" },
          { label: "SG / PE", group: ko ? "장비" : "Device" },
        ],
        red: [0],
        black: 1,
        mode: "V⎓ / V~",
        cond: ko ? "둘 다 켬 · 직류·교류 각각" : "Both powered · DC and AC",
      };
  }
}

const W = 360;
const RED = "#d92d20";

function meter(cx: number, y: number, mode: string) {
  return [
    `<rect x="${cx - 46}" y="${y}" width="92" height="64" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
    `<rect x="${cx - 34}" y="${y + 8}" width="68" height="22" rx="3" fill="none" stroke="currentColor"/>`,
    `<text x="${cx}" y="${y + 24}" text-anchor="middle" font-size="12" font-family="ui-monospace,monospace" fill="currentColor">${esc(mode)}</text>`,
    `<circle cx="${cx - 18}" cy="${y + 48}" r="5" fill="${RED}"/>`,
    `<circle cx="${cx + 18}" cy="${y + 48}" r="5" fill="currentColor"/>`,
    `<text x="${cx + 18}" y="${y + 62}" text-anchor="middle" font-size="8" fill="currentColor">COM</text>`,
  ].join("");
}

/** 측정 그림 SVG 글. title 은 접근성용(그림 설명) */
export function probeSvg(id: ItemId, lang: Lang, title: string): string {
  if (id === "loop-ma") return loopSvg(lang, title);
  const f = figOf(id, lang);
  const n = f.terms.length;
  const gap = 96;
  const x0 = W / 2 - ((n - 1) * gap) / 2;
  const tx = (i: number) => x0 + i * gap;
  const ty = 68;
  const out: string[] = [];
  out.push(`<text x="${W / 2}" y="14" text-anchor="middle" font-size="11" fill="currentColor" opacity=".8">${esc(f.cond)}</text>`);
  // 묶음 상자
  const groups = [...new Set(f.terms.map((t) => t.group))];
  for (const g of groups) {
    const idx = f.terms.map((t, i) => (t.group === g ? i : -1)).filter((i) => i >= 0);
    const a = tx(idx[0]) - 40;
    const b = tx(idx[idx.length - 1]) + 40;
    out.push(`<rect x="${a}" y="22" width="${b - a}" height="58" rx="6" fill="none" stroke="currentColor" stroke-dasharray="4 3" opacity=".6"/>`);
    out.push(`<text x="${(a + b) / 2}" y="36" text-anchor="middle" font-size="10" fill="currentColor" opacity=".8">${esc(g)}</text>`);
  }
  f.terms.forEach((t, i) => {
    out.push(`<circle cx="${tx(i)}" cy="${ty}" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>`);
    out.push(`<text x="${tx(i)}" y="${ty - 12}" text-anchor="middle" font-size="11" font-family="ui-monospace,monospace" fill="currentColor">${esc(t.label)}</text>`);
  });
  const my = 104;
  const cx = W / 2;
  out.push(meter(cx, my, f.mode));
  // 프로브 선: 잭 → 단자
  const probe = (from: number, to: number, color: string, dash: boolean, tag: string) => {
    const x1 = from;
    const y1 = my + 48;
    const x2 = tx(to);
    const y2 = ty + 5;
    out.push(`<path d="M${x1} ${y1} C ${x1} ${y1 + 26}, ${x2 + (x2 < cx ? -40 : 40)} ${y1 + 10}, ${x2} ${y2 + 30} L ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="2"${dash ? ' stroke-dasharray="5 4"' : ""}/>`);
    if (tag) out.push(`<text x="${x2 + 8}" y="${y2 + 26}" font-size="11" fill="${color}">${tag}</text>`);
  };
  f.red.forEach((r, i) => probe(cx - 18, r, RED, i > 0, f.red.length > 1 ? (i === 0 ? "①" : "②") : ""));
  probe(cx + 18, f.black, "currentColor", false, "");
  const h = 190;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${out.join("")}</svg>`;
}

/** 4–20 mA: 루프를 끊고 멀티미터를 직렬로 */
function loopSvg(lang: Lang, title: string): string {
  const ko = lang === "ko";
  const o: string[] = [];
  o.push(`<text x="${W / 2}" y="14" text-anchor="middle" font-size="11" fill="currentColor" opacity=".8">${esc(ko ? "루프를 한 곳 끊고 멀티미터를 직렬로 (mA 단자)" : "Break the loop at one point, meter in series (mA jack)")}</text>`);
  // 전원(왼쪽), 트랜스미터(오른쪽), 수신 저항(아래)
  o.push(`<rect x="16" y="50" width="70" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>`);
  o.push(`<text x="51" y="76" text-anchor="middle" font-size="11" fill="currentColor">${esc(ko ? "전원" : "Supply")}</text><text x="51" y="92" text-anchor="middle" font-size="11" font-family="ui-monospace,monospace" fill="currentColor">24V</text>`);
  o.push(`<rect x="274" y="50" width="70" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>`);
  o.push(`<text x="309" y="76" text-anchor="middle" font-size="11" fill="currentColor">${esc(ko ? "트랜스" : "Trans-")}</text><text x="309" y="92" text-anchor="middle" font-size="11" fill="currentColor">${esc(ko ? "미터" : "mitter")}</text>`);
  // 위쪽 선: 전원 + → 멀티미터 빨강(+) → 멀티미터 COM → 트랜스미터 +
  o.push(`<text x="92" y="62" font-size="10" fill="currentColor">+</text><text x="262" y="62" font-size="10" fill="currentColor">+</text>`);
  o.push(meter(W / 2, 24, "mA"));
  o.push(`<path d="M86 60 L 120 60 L 120 96 L ${W / 2 - 18} 96 L ${W / 2 - 18} 72" fill="none" stroke="${RED}" stroke-width="2"/>`);
  o.push(`<path d="M${W / 2 + 18} 72 L ${W / 2 + 18} 96 L 240 96 L 240 60 L 274 60" fill="none" stroke="currentColor" stroke-width="2"/>`);
  // 아래쪽 선: 트랜스미터 − → 수신 저항 → 전원 −
  o.push(`<text x="92" y="106" font-size="10" fill="currentColor">−</text><text x="262" y="106" font-size="10" fill="currentColor">−</text>`);
  o.push(`<path d="M274 104 L 300 104 L 300 160 L 220 160" fill="none" stroke="currentColor" stroke-width="1.5"/>`);
  o.push(`<rect x="140" y="150" width="80" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>`);
  o.push(`<text x="180" y="164" text-anchor="middle" font-size="10" fill="currentColor">${esc(ko ? "PLC 입력 250Ω" : "PLC input 250Ω")}</text>`);
  o.push(`<path d="M140 160 L 60 160 L 60 110" fill="none" stroke="currentColor" stroke-width="1.5"/>`);
  const h = 190;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${o.join("")}</svg>`;
}
