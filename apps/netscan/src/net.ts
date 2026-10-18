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
