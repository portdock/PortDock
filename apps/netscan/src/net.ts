// 화면 쪽 작은 계산 — 산업 포트 목록, 포트 칸 해석, IP 숫자 정렬, 랜카드 기본 범위, CSV.
import type { Lang } from "./i18n";

/** 산업 포트 — 이름은 칩에, 설명은 말풍선에. 범용 포트 스캔은 하지 않는다(이 목록·사용자가 넣은 포트만) */
export const SERVICES: { ports: [number, number]; name: string; ko: string; en: string; industrial: boolean }[] = [
  { ports: [502, 502], name: "Modbus", ko: "Modbus TCP — PLC·인버터·계측기·게이트웨이", en: "Modbus TCP — PLCs, drives, meters, gateways", industrial: true },
  { ports: [2004, 2004], name: "FEnet", ko: "LS XGT FEnet 전용 프로토콜(이더넷 모듈)", en: "LS XGT FEnet dedicated protocol (Ethernet module)", industrial: true },
  { ports: [5000, 5010], name: "SLMP", ko: "MC 프로토콜(SLMP) — 미쓰비시 계열 이더넷 포트로 흔히 쓰는 번호", en: "MC protocol (SLMP) — ports commonly used by Mitsubishi-style Ethernet modules", industrial: true },
  { ports: [102, 102], name: "S7", ko: "ISO-TSAP(S7 통신) — 지멘스 계열 PLC", en: "ISO-TSAP (S7 communication) — Siemens-style PLCs", industrial: true },
  { ports: [44818, 44818], name: "EtherNet/IP", ko: "EtherNet/IP(CIP) 명시적 메시지", en: "EtherNet/IP (CIP) explicit messaging", industrial: true },
  { ports: [4840, 4840], name: "OPC UA", ko: "OPC UA 서버", en: "OPC UA server", industrial: true },
  { ports: [1883, 1883], name: "MQTT", ko: "MQTT 브로커(IoT 게이트웨이)", en: "MQTT broker (IoT gateway)", industrial: true },
  { ports: [5025, 5025], name: "SCPI", ko: "SCPI raw socket — 계측기(오실로스코프·전원 공급기 등)", en: "SCPI raw socket — instruments (scopes, power supplies, …)", industrial: true },
  { ports: [80, 80], name: "HTTP", ko: "웹 설정 화면", en: "Web configuration page", industrial: false },
  { ports: [443, 443], name: "HTTPS", ko: "웹 설정 화면(암호화)", en: "Web configuration page (encrypted)", industrial: false },
  { ports: [23, 23], name: "Telnet", ko: "텔넷 — 시리얼 서버·옛 장비의 설정 콘솔", en: "Telnet — serial servers and older devices' console", industrial: false },
  { ports: [21, 21], name: "FTP", ko: "FTP — 파일 올리기·내려받기", en: "FTP — file transfer", industrial: false },
];

export const DEFAULT_PORTS = "502, 2004, 5000-5010, 102, 44818, 4840, 80, 443, 23, 21, 1883, 5025";
/** 한 번에 확인할 포트 수 상한(백엔드 scan::MAX_PORTS 와 같게) */
export const MAX_PORTS = 32;

export function serviceOf(port: number) {
  return SERVICES.find((s) => port >= s.ports[0] && port <= s.ports[1]);
}

/** 칩 글자: «Modbus», «SLMP 5001», 목록에 없으면 «TCP 8080» */
export function serviceLabel(port: number) {
  const s = serviceOf(port);
  if (!s) return `TCP ${port}`;
  return s.ports[0] === s.ports[1] ? s.name : `${s.name} ${port}`;
}

export function serviceTip(port: number, lang: Lang) {
  const s = serviceOf(port);
  return s ? `${port} — ${lang === "ko" ? s.ko : s.en}` : `TCP ${port}`;
}

export const isIndustrial = (port: number) => !!serviceOf(port)?.industrial;

/** «502, 5000-5010» → 포트 목록. 틀리면 error */
export function parsePorts(text: string, lang: Lang): { ports: number[]; error: string | null } {
  const ko = lang === "ko";
  const out = new Set<number>();
  for (const tok of text.split(/[\s,;]+/)) {
    if (!tok) continue;
    const m = tok.match(/^(\d{1,5})(?:-(\d{1,5}))?$/);
    if (!m) return { ports: [], error: ko ? `포트 번호가 아닙니다: «${tok}»` : `Not a port number: «${tok}»` };
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b > 65535 || b < a) return { ports: [], error: ko ? `포트는 1~65535, 범위는 작은 쪽부터: «${tok}»` : `Ports are 1–65535, ranges low to high: «${tok}»` };
    if (b - a + 1 > MAX_PORTS) return { ports: [], error: ko ? `포트는 ${MAX_PORTS}개까지입니다: «${tok}»` : `Up to ${MAX_PORTS} ports: «${tok}»` };
    for (let p = a; p <= b; p++) out.add(p);
  }
  if (out.size > MAX_PORTS) return { ports: [], error: ko ? `포트는 ${MAX_PORTS}개까지입니다(지금 ${out.size}개)` : `Up to ${MAX_PORTS} ports (now ${out.size})` };
  return { ports: [...out], error: null };
}

/** IP → 숫자(정렬용). 틀리면 0 */
export function ipNum(ip: string) {
  const p = ip.split(".").map(Number);
  return p.length === 4 && p.every((n) => n >= 0 && n <= 255) ? ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3] : 0;
}

const ipStr = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");

/** 랜카드 대역 → 기본 범위(/24 보다 넓으면 그 주소가 든 /24) — 백엔드 range::default_range 와 같은 규칙 */
export function defaultRange(ip: string, prefix: number) {
  const p = Math.max(24, Math.min(32, prefix));
  const mask = p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
  return `${ipStr((ipNum(ip) & mask) >>> 0)}/${p}`;
}

/** 같은 대역인지 */
export function sameSubnet(a: string, b: string, prefix: number) {
  const mask = prefix <= 0 ? 0 : (0xffffffff << (32 - Math.min(32, prefix))) >>> 0;
  return ((ipNum(a) & mask) >>> 0) === ((ipNum(b) & mask) >>> 0);
}

/** CSV 칸 — 쉼표·따옴표·줄바꿈이 있으면 따옴표로 */
export const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const stamp = () => {
  const d = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
};

/**
 * 포트 칩(10/18) — 확인할 포트를 이름으로 고른다. 칩 하나가 SERVICES 한 줄(같은 포트 범위). 화면 순서는 흔히 찾는 것부터.
 * «MC/SLMP» 처럼 칩 이름은 결과 칩(SERVICES.name)보다 조금 길게 풀어 쓴다
 */
export const PORT_CHIPS: { label: string; ports: [number, number] }[] = [
  { label: "Modbus", ports: [502, 502] },
  { label: "S7", ports: [102, 102] },
  { label: "EtherNet/IP", ports: [44818, 44818] },
  { label: "MC/SLMP", ports: [5000, 5010] },
  { label: "FEnet", ports: [2004, 2004] },
  { label: "OPC UA", ports: [4840, 4840] },
  { label: "MQTT", ports: [1883, 1883] },
  { label: "SCPI", ports: [5025, 5025] },
  { label: "HTTP", ports: [80, 80] },
  { label: "HTTPS", ports: [443, 443] },
  { label: "Telnet", ports: [23, 23] },
  { label: "FTP", ports: [21, 21] },
];

const span = (r: [number, number]) => Array.from({ length: r[1] - r[0] + 1 }, (_, i) => r[0] + i);
/** 칩의 포트가 모두 들어 있는지 */
export const chipOn = (ports: number[], r: [number, number]) => span(r).every((p) => ports.includes(p));
/** 칩 글자 옆 포트 표시 «502», «5000–5010» */
export const chipPorts = (r: [number, number]) => (r[0] === r[1] ? String(r[0]) : `${r[0]}–${r[1]}`);

/**
 * 포트 목록 → 칸 글. 칩 하나에 다 들어 있는 것은 기본 목록(DEFAULT_PORTS)과 같은 순서로 «502, 2004, 5000-5010, …», 나머지(직접 넣은 포트)는 뒤에 작은 것부터(이어지면 범위로)
 */
export function formatPorts(ports: number[]): string {
  const set = new Set(ports);
  const order = DEFAULT_PORTS.split(/,\s*/).map((tok) => {
    const [a, b] = tok.split("-").map(Number);
    return [a, b ?? a] as [number, number];
  });
  const groups = [...order, ...PORT_CHIPS.map((c) => c.ports).filter((r) => !order.some((o) => o[0] === r[0] && o[1] === r[1]))];
  const toks: string[] = [];
  for (const r of groups) {
    if (!chipOn([...set], r)) continue;
    toks.push(r[0] === r[1] ? String(r[0]) : `${r[0]}-${r[1]}`);
    for (const p of span(r)) set.delete(p);
  }
  const rest = [...set].sort((a, b) => a - b);
  for (let i = 0; i < rest.length; ) {
    let j = i;
    while (j + 1 < rest.length && rest[j + 1] === rest[j] + 1) j++;
    toks.push(j - i >= 2 ? `${rest[i]}-${rest[j]}` : rest.slice(i, j + 1).join(", "));
    i = j + 1;
  }
  return toks.join(", ");
}

/** 칩을 켜고 끈 뒤의 칸 글 — 칸이 틀려 있으면 null(칩을 못 누름) */
export function togglePortChip(text: string, r: [number, number], on: boolean, lang: Lang): string | null {
  const cur = parsePorts(text, lang);
  if (cur.error) return null;
  const set = new Set(cur.ports);
  for (const p of span(r)) {
    if (on) set.add(p);
    else set.delete(p);
  }
  return formatPorts([...set]);
}

/** 칩 어느 것에도 속하지 않는(직접 넣은) 포트 */
export const extraPorts = (ports: number[]) => ports.filter((p) => !PORT_CHIPS.some((c) => p >= c.ports[0] && p <= c.ports[1]));

/** 두 포트 목록이 같은지(순서 무관) */
export const samePortSet = (a: number[], b: number[]) => a.length === b.length && a.every((p) => b.includes(p));

// ---- 대상 대역 알림(0.2.0) — 찾을 범위가 이 PC 의 켜진 랜카드 어느 대역에 드는지

/** 판정에 쓰는 랜카드 모양(api.Nic 의 일부) */
export interface NicLike {
  name: string;
  addrs: { ip: string; prefix: number }[];
  gateway: string | null;
  up: boolean;
}

/**
 * in: 고른 랜카드 대역 안(알림 없음) · otherNic: 다른 켜진 랜카드 대역 안 · partial: 범위 일부만 어느 랜카드 대역
 * routed: 어느 대역도 아니지만 게이트웨이가 있어 경유로 닿을 수는 있음(약한 알림) · none: 닿을 길 없음
 * down: 켜진 랜카드엔 없고 연결이 끊긴(랜선 빠짐 등) 랜카드 대역 안
 */
export type SubnetFit =
  | { kind: "in" }
  | { kind: "down"; nic: string }
  | { kind: "otherNic" | "partial"; nic: string; ip: string; prefix: number; apipa: string[]; list: string }
  | { kind: "routed"; gateway: string; apipa: string[]; list: string }
  | { kind: "none"; apipa: string[]; list: string };

const maskOf = (prefix: number) => (prefix <= 0 ? 0 : (0xffffffff << (32 - Math.min(32, prefix))) >>> 0);
const inNet = (x: number, ip: string, prefix: number) => ((x & maskOf(prefix)) >>> 0) === ((ipNum(ip) & maskOf(prefix)) >>> 0);
export const isApipa = (ip: string) => ip.startsWith("169.254.");

/**
 * 범위(처음·끝 주소)가 켜진 랜카드 대역에 드는지. selIp = 고른 랜카드 주소(없으면 null).
 * 처음·끝이 한 대역에 들면 그 사이 주소도 모두 든다(대역은 이어진 구간). 127.x 는 이 PC 라 알림 없음
 */
export function subnetFit(first: string, last: string, nics: NicLike[], selIp: string | null): SubnetFit {
  const a = ipNum(first);
  const b = ipNum(last);
  if (first.startsWith("127.") && last.startsWith("127.")) return { kind: "in" };
  const up = nics.filter((n) => n.up && n.addrs.length);
  const addrs = up.flatMap((n) => n.addrs.map((ad) => ({ nic: n, ...ad })));
  const list = addrs.map((x) => `${x.nic.name} ${x.ip}/${x.prefix}`).join(", ");
  // 주소가 169.254 뿐인 켜진 랜카드 — DHCP 로 IP 를 못 받은 것
  const apipa = up.filter((n) => n.addrs.every((ad) => isApipa(ad.ip))).map((n) => n.name);
  const hit = addrs.filter((x) => inNet(a, x.ip, x.prefix) && inNet(b, x.ip, x.prefix));
  if (hit.some((x) => x.ip === selIp)) return { kind: "in" };
  if (hit.length) return { kind: "otherNic", nic: hit[0].nic.name, ip: hit[0].ip, prefix: hit[0].prefix, apipa, list };
  // 일부만 겹침: 범위의 끝 하나가 대역 안이거나, 대역이 범위 안에 통째로 듦
  const part = addrs.find((x) => {
    const lo = (ipNum(x.ip) & maskOf(x.prefix)) >>> 0;
    const hi = (lo | (~maskOf(x.prefix) >>> 0)) >>> 0;
    return a <= hi && b >= lo;
  });
  if (part) return { kind: "partial", nic: part.nic.name, ip: part.ip, prefix: part.prefix, apipa, list };
  // 게이트웨이 — 고른 랜카드 것이 먼저, 없으면 켜진 랜카드 가운데 처음 것(169.254 랜카드는 게이트웨이가 없다)
  const sel = addrs.find((x) => x.ip === selIp);
  const gw = sel?.nic.gateway ?? up.find((n) => n.gateway)?.gateway ?? null;
  const down = nics.find((n) => !n.up && n.addrs.some((x) => inNet(a, x.ip, x.prefix) && inNet(b, x.ip, x.prefix)));
  if (down) return { kind: "down", nic: down.name };
  if (gw) return { kind: "routed", gateway: gw, apipa, list };
  return { kind: "none", apipa, list };
}

/** 알림 한 줄. in 이면 null. weak = 약한 알림(경유로 닿을 수 있거나 일부만 밖) */
export function subnetNote(fit: SubnetFit, range: string, first: string, lang: Lang): { text: string; weak: boolean } | null {
  if (fit.kind === "in") return null;
  const ko = lang === "ko";
  const r = range.trim();
  if (fit.kind === "down")
    return { text: ko ? `${r} 는 «${fit.nic}» 대역인데 그 랜카드가 연결 끊김입니다 — 랜선·스위치 불을 확인하세요.` : `${r} is in «${fit.nic}»'s subnet, but that adapter is disconnected — check the cable and the switch link light.`, weak: false };
  const ex = `${first.split(".").slice(0, 3).join(".")}.x`;
  const now = fit.list ? (ko ? ` 지금 랜카드: ${fit.list}` : ` Adapters now: ${fit.list}`) : ko ? " 켜진 랜카드가 없습니다 — 랜선·Wi-Fi 연결을 확인하세요." : " No adapter is up — check the cable or Wi-Fi.";
  const apipa = fit.apipa.length
    ? ko
      ? ` «${fit.apipa.join("», «")}» 는 169.254.x.x — IP 를 못 받았습니다(DHCP 없음). 장비 대역의 고정 IP 를 넣으세요.`
      : ` «${fit.apipa.join("», «")}» has 169.254.x.x — it did not get an IP (no DHCP). Set a static IP in the devices' subnet.`
    : "";
  switch (fit.kind) {
    case "otherNic":
      return {
        text: ko ? `${r} 는 «${fit.nic}»(${fit.ip}/${fit.prefix}) 대역입니다 — 랜카드를 «${fit.nic}» 로 고르면 ARP 로 찾습니다.` : `${r} is in «${fit.nic}»'s subnet (${fit.ip}/${fit.prefix}) — pick «${fit.nic}» as the adapter so ARP can be used.`,
        weak: true,
      };
    case "partial":
      return {
        text: ko ? `${r} 의 일부만 «${fit.nic}»(${fit.ip}/${fit.prefix}) 대역입니다 — 나머지 주소는 ARP 없이 핑으로만 찾습니다.` : `Only part of ${r} is in «${fit.nic}»'s subnet (${fit.ip}/${fit.prefix}) — the rest is found by ping only, without ARP.`,
        weak: true,
      };
    case "routed":
      return {
        text:
          (ko
            ? `${r} 는 이 PC 의 랜카드 대역 밖입니다 — 게이트웨이 ${fit.gateway} 를 거쳐(경유) 핑으로만 찾고 MAC 은 모릅니다. 장비가 이 PC 에 바로 꽂혀 있으면 이 PC 의 IP 를 같은 대역(예 ${ex})으로 바꾸세요.`
            : `${r} is outside this PC's adapter subnets — it is reached only via gateway ${fit.gateway} (routed), by ping, without MACs. If the devices are plugged straight into this PC, change this PC's IP to the same subnet (e.g. ${ex}).`) +
          apipa +
          now,
        weak: true,
      };
    case "none":
      return {
        text:
          (ko
            ? `${r} 는 이 PC 의 어느 랜카드 대역에도 없습니다 — 이 PC 의 IP 를 같은 대역(예 ${ex})으로 바꾸거나 다른 랜카드를 고르세요.`
            : `${r} is not in any of this PC's adapter subnets — change this PC's IP to the same subnet (e.g. ${ex}) or pick another adapter.`) +
          apipa +
          now,
        weak: false,
      };
  }
}
