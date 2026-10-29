// Hardware Tester 화면 쪽 순수 함수(node --test apps/hw-tester/src/model.test.ts) — 통계·구간 요약·CSV·결과 글.
// 판정은 «볼 것» 까지만 쓴다(«문제 있음»·원인 단정 없음). 고치지 않는다.
// 개인 정보: Wi-Fi 이름(SSID)·AP 주소는 백엔드가 읽지 않는다. 블루투스 장치 이름은 화면에만 — 저장·복사 글은 «장치 N» 만 쓴다.

export type Lang = "ko" | "en";
export interface Text {
  ko: string;
  en: string;
}
const t = (ko: string, en: string): Text => ({ ko, en });

// ---------------------------------------------------------------- 백엔드 모양(apps/hw-tester/src-tauri/src/rec.rs·bt.rs, crates/core/src/wlan.rs)

/** 응답 시간(ms) · -1 = 응답 없음(손실) · null = 이번에 재지 않음 */
export type Rtt = number | null;
export type RecEvent =
  | { type: "started"; ts: number; gateway: string | null; target: string; dnsName: string; intervalMs: number }
  | { type: "tick"; ts: number; gw: Rtt; net: Rtt; dns: Rtt }
  | { type: "gateway"; ts: number; ip: string }
  | { type: "wifi"; ts: number; connected: boolean; code: number | null; reason: string | null }
  | { type: "note"; message: string }
  | { type: "stopped"; ts: number; reason: "user" | "limit" };
export interface RecConfig {
  target: string;
  dnsName: string;
  intervalMs: number;
}
export interface Tick {
  ts: number;
  gw: Rtt;
  net: Rtt;
  dns: Rtt;
}
export interface WifiEvent {
  ts: number;
  connected: boolean;
  code: number | null;
  reason: string | null;
}

export interface BtDev {
  n: number;
  name: string;
  connected: boolean | null;
}
export type BtEvent =
  | { type: "snapshot"; ts: number; devices: BtDev[] }
  | { type: "change"; ts: number; dev: BtDev; added: boolean; removed: boolean }
  | { type: "stopped"; ts: number; reason: "user" | "limit" };

export interface ChannelCount {
  band: "2.4" | "5" | "6";
  channel: number;
  count: number;
  mine: boolean;
}
export interface WifiSignal {
  state: "ok" | "denied" | "noWlan" | "noAdapter" | "notConnected" | "error";
  quality: number | null;
  rssi: number | null;
  rxMbps: number | null;
  txMbps: number | null;
  phy: string | null;
  band: string | null;
  channel: number | null;
  channels: ChannelCount[];
  error: string | null;
}

export interface BtAudio {
  name: string;
  flow: "render" | "capture";
  kind: "handsFree" | "stereo" | "other";
  defaultConsole: boolean;
  defaultComms: boolean;
}
export interface BtAudioState {
  audio: BtAudio[];
  errors: string[];
}

// ---------------------------------------------------------------- 상한·기본값

/** 대상 기본값 — 둘 중 하나를 고르거나 직접 넣는다 */
export const TARGETS = ["1.1.1.1", "8.8.8.8"];
export const DEFAULT_DNS = "example.com";
/** 핑 간격(초) — 1초에 한 번보다 자주 보내지 않는다 */
export const INTERVALS = [1, 2, 5, 10];
/** 화면에 들고 있을 최대 박자 수(24시간 × 1초) — 백엔드도 24시간에 멈춘다 */
export const MAX_TICKS = 86_400;
/** DNS 를 묻는 간격(백엔드 rec.rs DNS_INTERVAL) */
export const DNS_EVERY_S = 5;

/** 화면의 대상 칸 글 → 보낼 수 있는 글인지(IPv4 또는 이름). 백엔드가 한 번 더 본다 */
export function validTarget(s: string) {
  const v = s.trim();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) {
    const p = v.split(".").map(Number);
    return p.every((x) => x <= 255) && v !== "0.0.0.0" && v !== "255.255.255.255" && !(p[0] >= 224 && p[0] <= 239);
  }
  return validDnsName(v);
}

export function validDnsName(s: string) {
  const v = s.trim().replace(/\.$/, "");
  if (!v || v.length > 253 || /^\d{1,3}(\.\d{1,3}){3}$/.test(v)) return false;
  return v.split(".").every((l) => l.length > 0 && l.length <= 63 && /^[A-Za-z0-9-]+$/.test(l) && !l.startsWith("-") && !l.endsWith("-"));
}

// ---------------------------------------------------------------- 통계

export interface Stats {
  /** 잰 횟수(보낸 핑·물은 DNS) */
  sent: number;
  lost: number;
  /** 손실 % */
  loss: number;
  avg: number | null;
  /** 95 백분위 */
  p95: number | null;
  max: number | null;
  /** 흔들림 — 이어진 두 응답의 차이 평균(RFC 3550 처럼 단순 평균) */
  jitter: number | null;
}

/** 값들(ms·-1·null) → 통계. 잰 것이 없으면 null */
export function stats(vals: readonly Rtt[]): Stats | null {
  const sent = vals.filter((v) => v != null).length;
  if (!sent) return null;
  const ok = vals.filter((v): v is number => v != null && v >= 0);
  const lost = sent - ok.length;
  const sorted = [...ok].sort((a, b) => a - b);
  const avg = ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
  const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] : null;
  let jsum = 0;
  for (let i = 1; i < ok.length; i++) jsum += Math.abs(ok[i] - ok[i - 1]);
  return {
    sent,
    lost,
    loss: (lost / sent) * 100,
    avg,
    p95,
    max: sorted.length ? sorted[sorted.length - 1] : null,
    jitter: ok.length > 1 ? jsum / (ok.length - 1) : null,
  };
}

/** 가장 긴 연속 손실(박자 수) */
export function longestLoss(vals: readonly Rtt[]) {
  let run = 0;
  let best = 0;
  for (const v of vals) {
    if (v === -1) best = Math.max(best, ++run);
    else if (v != null) run = 0;
  }
  return best;
}

// ---------------------------------------------------------------- 구간 요약(«볼 것» 까지)

export type Level = "ok" | "look" | "short";
export const LEVEL_TEXT: Record<Level, Text> = {
  ok: t("걸리는 것 없음(기록한 동안)", "Nothing stood out (while recording)"),
  look: t("볼 것", "Worth a look"),
  short: t("기록이 짧음", "Too short to tell"),
};

/** 요약 판정 기준 — 문서·도움말에도 같은 숫자 */
export const RULES = {
  /** 이만큼 재야 판정한다 */
  minSamples: 20,
  /** 손실 %(이 이상이면 «볼 것») */
  loss: 2,
  /** 게이트웨이 95% 지연(ms) — 같은 집 안 Wi-Fi 에서 이보다 크면 흔들림 */
  gwP95: 50,
  /** 인터넷 평균 - 게이트웨이 평균(ms) */
  beyond: 100,
  /** DNS 평균(ms) */
  dnsAvg: 200,
  /** DNS 실패 % */
  dnsFail: 20,
};

export interface Summary {
  level: Level;
  notes: Text[];
  gw: Stats | null;
  net: Stats | null;
  dns: Stats | null;
  disconnects: number;
}

const pct = (n: number) => (n >= 10 ? n.toFixed(0) : n.toFixed(1));
const ms0 = (n: number | null) => (n == null ? "—" : n.toFixed(0));

/** 기록 → 요약. `hasGateway` = 게이트웨이를 찾았는지(못 찾으면 구간을 나눌 수 없다) */
export function summarize(ticks: readonly Tick[], wifi: readonly WifiEvent[], hasGateway: boolean): Summary {
  const gw = stats(ticks.map((x) => x.gw));
  const net = stats(ticks.map((x) => x.net));
  const dns = stats(ticks.map((x) => x.dns));
  const disconnects = wifi.filter((w) => !w.connected).length;
  const notes: Text[] = [];
  let level: Level = "ok";
  const look = (n: Text) => {
    level = "look";
    notes.push(n);
  };
  if (!net || net.sent < RULES.minSamples) {
    if (disconnects) look(t(`기록하는 동안 Wi-Fi 끊김 ${disconnects}번(Windows 기록) — 아래 «사건» 의 이유를 봅니다.`, `Wi-Fi disconnected ${disconnects} time(s) while recording (Windows log) — see the reasons under «Events».`));
    return { level: disconnects ? "look" : "short", notes: [...notes, t(`${RULES.minSamples}번 이상 재면 구간을 나눠 봅니다.`, `Record at least ${RULES.minSamples} samples to compare the two segments.`)], gw, net, dns, disconnects };
  }
  const gwLoss = gw && gw.loss >= RULES.loss;
  const netLoss = net.loss >= RULES.loss;
  if (gwLoss) {
    look(
      t(
        `게이트웨이(공유기)까지 손실 ${pct(gw.loss)}% · 인터넷 ${pct(net.loss)}% — 공유기 쪽(이 PC 의 Wi-Fi·공유기)에서 끊김이 보입니다. Wi-Fi 신호·채널, 어댑터 절전을 봅니다.`,
        `Loss to the gateway (router) ${pct(gw.loss)}% · internet ${pct(net.loss)}% — drops show up on the router side (this PC's Wi-Fi or the router). Check Wi-Fi signal and channel and adapter power saving.`,
      ),
    );
  } else if (netLoss && gw) {
    look(
      t(
        `게이트웨이까지는 손실 ${pct(gw.loss)}%, 인터넷 대상은 ${pct(net.loss)}% — 공유기 너머(인터넷 회선·통신사·대상 쪽)를 봅니다.`,
        `Gateway loss ${pct(gw.loss)}% but internet target ${pct(net.loss)}% — look beyond the router (line, ISP or the target).`,
      ),
    );
  } else if (netLoss) {
    look(t(`인터넷 대상 손실 ${pct(net.loss)}% — 게이트웨이를 찾지 못해 어느 구간인지는 나누지 못했습니다.`, `Internet target loss ${pct(net.loss)}% — no gateway was found, so the segment cannot be told.`));
  }
  if (gw && gw.p95 != null && gw.p95 > RULES.gwP95) {
    look(t(`게이트웨이 지연이 튑니다(95% ${ms0(gw.p95)} ms, 최대 ${ms0(gw.max)} ms) — 같은 집 안 구간이라 Wi-Fi 쪽 흔들림을 봅니다.`, `Gateway latency spikes (95th ${ms0(gw.p95)} ms, max ${ms0(gw.max)} ms) — that segment is inside the home, so look at Wi-Fi.`));
  }
  if (gw && gw.avg != null && net.avg != null && net.avg - gw.avg > RULES.beyond) {
    look(t(`인터넷 지연(평균 ${ms0(net.avg)} ms)이 게이트웨이(${ms0(gw.avg)} ms)보다 ${ms0(net.avg - gw.avg)} ms 깁니다 — 공유기 너머를 봅니다(먼 대상이면 원래 길 수 있음).`, `Internet latency (avg ${ms0(net.avg)} ms) is ${ms0(net.avg - gw.avg)} ms above the gateway (${ms0(gw.avg)} ms) — look beyond the router (a distant target can be slower anyway).`));
  }
  if (dns && dns.sent >= 3 && ((dns.avg != null && dns.avg > RULES.dnsAvg) || dns.loss >= RULES.dnsFail)) {
    look(t(`DNS 응답이 느리거나 실패합니다(평균 ${ms0(dns.avg)} ms, 실패 ${pct(dns.loss)}%) — 공유기·DNS 서버 설정을 봅니다.`, `DNS answers are slow or failing (avg ${ms0(dns.avg)} ms, failed ${pct(dns.loss)}%) — check the router or DNS server settings.`));
  }
  if (disconnects) look(t(`기록하는 동안 Wi-Fi 끊김 ${disconnects}번(Windows 기록) — 아래 «사건» 의 이유를 봅니다.`, `Wi-Fi disconnected ${disconnects} time(s) while recording (Windows log) — see the reasons under «Events».`));
  if (!hasGateway) notes.push(t("게이트웨이를 찾지 못해 인터넷 대상만 쟀습니다.", "No gateway was found; only the internet target was measured."));
  if ((level as Level) === "ok") notes.push(t("기록한 동안 손실·지연에서 걸리는 것을 찾지 못했습니다. 끊김이 드물면 더 길게 기록합니다.", "No loss or latency stood out while recording. If drops are rare, record longer."));
  return { level, notes, gw, net, dns, disconnects };
}

/** 늘 함께 보이는 주의 — 판정의 한계 */
export const CAVEATS: Text[] = [
  t("핑(ICMP)은 공유기·통신사가 낮은 우선순위로 다뤄 손실처럼 보일 수 있습니다. 원인을 정하지 않고 «볼 곳» 만 알립니다.", "Routers and ISPs may give ping (ICMP) low priority, which can look like loss. This tells you where to look, not the cause."),
  t("Wi-Fi 끊김 이유는 Windows 가 남긴 문구 그대로입니다 — 증상일 수 있습니다.", "Wi-Fi disconnect reasons are Windows' own wording — they may be symptoms rather than causes."),
];

// ---------------------------------------------------------------- 신호

export const SIGNAL_STATE_TEXT: Record<WifiSignal["state"], Text> = {
  ok: t("읽음", "Read"),
  denied: t("위치 권한이 없어 읽지 못했습니다(또는 위치 서비스 꺼짐)", "Not read: no location permission (or location services are off)"),
  noWlan: t("이 PC 에 무선 랜 서비스가 없습니다", "No wireless LAN service on this PC"),
  noAdapter: t("Wi-Fi 어댑터가 없습니다", "No Wi-Fi adapter"),
  notConnected: t("Wi-Fi 에 연결돼 있지 않습니다", "Not connected to Wi-Fi"),
  error: t("읽지 못했습니다", "Could not read"),
};

/** 신호 세기 → 짧은 풀이. «볼 것» 까지만 */
export function signalNote(s: WifiSignal): { level: "ok" | "look" | null; text: Text } | null {
  if (s.state !== "ok" || s.rssi == null) return null;
  if (s.rssi <= -75) return { level: "look", text: t(`신호가 약합니다(${s.rssi} dBm) — 공유기와 거리·벽, 2.4/5GHz 대역을 봅니다.`, `Weak signal (${s.rssi} dBm) — check distance and walls to the router and the 2.4/5 GHz band.`) };
  if (s.rssi <= -67) return { level: "look", text: t(`신호가 보통 아래입니다(${s.rssi} dBm) — 영상 통화·게임에서 끊길 수 있습니다.`, `Signal is below fair (${s.rssi} dBm) — video calls or games may stutter.`) };
  return { level: "ok", text: t(`신호 ${s.rssi} dBm — 이 값만으로는 걸리는 것이 없습니다.`, `Signal ${s.rssi} dBm — nothing stands out from this value alone.`) };
}

/** 같은 채널을 쓰는 다른 AP 수(내 AP 빼고) */
export function sameChannel(s: WifiSignal) {
  const c = s.channels.find((x) => x.mine);
  return c ? c.count - 1 : null;
}

// ---------------------------------------------------------------- 블루투스

export interface BtRow {
  n: number;
  /** 화면에만 */
  name: string;
  connected: boolean | null;
  connects: number;
  drops: number;
  last: number | null;
  removed: boolean;
}

export interface BtLog {
  ts: number;
  n: number;
  connected: boolean | null;
  added: boolean;
  removed: boolean;
}

/** 사건들 → 장치 표·시간순 기록 */
export function btApply(rows: BtRow[], log: BtLog[], e: BtEvent): { rows: BtRow[]; log: BtLog[] } {
  if (e.type === "snapshot") {
    return { rows: e.devices.map((d) => ({ n: d.n, name: d.name, connected: d.connected, connects: 0, drops: 0, last: null, removed: false })), log: [] };
  }
  if (e.type !== "change") return { rows, log };
  const d = e.dev;
  const prev = rows.find((r) => r.n === d.n);
  const was = prev?.connected ?? null;
  const row: BtRow = {
    n: d.n,
    name: d.name || prev?.name || "",
    connected: e.removed ? null : d.connected,
    connects: (prev?.connects ?? 0) + (!e.removed && d.connected === true && was !== true ? 1 : 0),
    drops: (prev?.drops ?? 0) + (!e.removed && d.connected === false && was === true ? 1 : 0),
    last: e.ts,
    removed: e.removed,
  };
  const next = prev ? rows.map((r) => (r.n === d.n ? row : r)) : [...rows, row].sort((a, b) => a.n - b.n);
  return { rows: next, log: [...log, { ts: e.ts, n: d.n, connected: e.removed ? null : d.connected, added: e.added, removed: e.removed }] };
}

const pad2 = (n: number) => String(n).padStart(2, "0");
export function clock(ms: number) {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
export function stamp(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${clock(ms)}`;
}

export const devLabel = (lang: Lang, n: number) => (lang === "ko" ? `장치 ${n}` : `Device ${n}`);

const btState = (lang: Lang, c: boolean | null, removed = false) =>
  removed ? (lang === "ko" ? "목록에서 사라짐" : "removed from list") : c == null ? (lang === "ko" ? "알 수 없음" : "unknown") : c ? (lang === "ko" ? "연결됨" : "connected") : lang === "ko" ? "끊김" : "disconnected";
export const btStateText = btState;

/** 블루투스 기록 글(복사·저장) — 장치 이름 없이 «장치 N» 만 */
export function btText(lang: Lang, app: string, version: string, rows: readonly BtRow[], log: readonly BtLog[], startedAt: number | null) {
  const ko = lang === "ko";
  const out = [`${app} ${version} — ${ko ? "블루투스 연결 기록" : "Bluetooth connection log"}`];
  if (startedAt) out.push(`${ko ? "시작" : "Started"}: ${stamp(startedAt)}`);
  out.push(ko ? "(장치 이름은 가렸습니다 — 화면의 번호와 같습니다)" : "(Device names are hidden — numbers match the screen)", "");
  for (const r of rows) out.push(`${devLabel(lang, r.n)}: ${btState(lang, r.connected, r.removed)} · ${ko ? "연결" : "connects"} ${r.connects} · ${ko ? "끊김" : "drops"} ${r.drops}`);
  out.push("");
  for (const l of log) out.push(`${stamp(l.ts)}  ${devLabel(lang, l.n)}  ${btState(lang, l.connected, l.removed)}${l.added ? (ko ? " (새로 보임)" : " (new)") : ""}`);
  return out.join("\n") + "\n";
}

// ---------------------------------------------------------------- 끊김·지연 기록 글·CSV

const cell = (v: Rtt) => (v == null ? "" : v < 0 ? "lost" : String(v));
/** CSV 칸 — 쉼표·따옴표·줄바꿈이 있으면 따옴표로 */
const csvq = (s: string) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export interface RecInfo {
  gateway: string | null;
  target: string;
  dnsName: string;
  intervalMs: number;
  startedAt: number;
}

/** CSV — time,gateway_ms,internet_ms,dns_ms,event. lost = 응답 없음, 빈 칸 = 재지 않음. Wi-Fi 사건은 따로 한 줄(이유 문구만) */
export function recCsv(info: RecInfo | null, ticks: readonly Tick[], wifi: readonly WifiEvent[]) {
  const lines: string[] = [];
  if (info) lines.push(`# PortDock Hardware Tester — gateway ${info.gateway ?? "-"}, internet ${info.target}, dns ${info.dnsName || "-"}, interval ${info.intervalMs} ms`);
  lines.push("time,gateway_ms,internet_ms,dns_ms,event");
  const rows: [number, string][] = ticks.map((x) => [x.ts, `${new Date(x.ts).toISOString()},${cell(x.gw)},${cell(x.net)},${cell(x.dns)},`]);
  for (const w of wifi) {
    const ev = w.connected ? "wifi_connected" : `wifi_disconnected${w.code != null ? ` (0x${w.code.toString(16)})` : ""}${w.reason ? `: ${w.reason}` : ""}`;
    rows.push([w.ts, `${new Date(w.ts).toISOString()},,,,${csvq(ev)}`]);
  }
  rows.sort((a, b) => a[0] - b[0]);
  return [...lines, ...rows.map((r) => r[1])].join("\n") + "\n";
}

const statLine = (lang: Lang, name: string, s: Stats | null) =>
  s ? `${name}: ${lang === "ko" ? "잰 횟수" : "samples"} ${s.sent} · ${lang === "ko" ? "손실" : "loss"} ${pct(s.loss)}% · ${lang === "ko" ? "평균" : "avg"} ${ms0(s.avg)} ms · 95% ${ms0(s.p95)} ms · ${lang === "ko" ? "최대" : "max"} ${ms0(s.max)} ms` : `${name}: —`;

/** 요약 글(복사) — 주소·숫자·Windows 이유 문구만(네트워크 이름 없음) */
export function recText(lang: Lang, app: string, version: string, info: RecInfo | null, s: Summary, wifi: readonly WifiEvent[]) {
  const ko = lang === "ko";
  const out = [`${app} ${version} — ${ko ? "Wi-Fi·인터넷 끊김·지연 기록" : "Wi-Fi / internet drop and latency log"}`];
  if (info) {
    out.push(`${ko ? "시작" : "Started"}: ${stamp(info.startedAt)} · ${ko ? "간격" : "interval"} ${info.intervalMs / 1000} s`);
    out.push(`${ko ? "게이트웨이" : "Gateway"} ${info.gateway ?? "—"} · ${ko ? "인터넷 대상" : "Internet target"} ${info.target} · DNS ${info.dnsName || "—"}`);
  }
  out.push(`${ko ? "결과" : "Result"}: ${LEVEL_TEXT[s.level][lang]}`);
  for (const n of s.notes) out.push(`- ${n[lang]}`);
  out.push("", statLine(lang, ko ? "게이트웨이" : "Gateway", s.gw), statLine(lang, ko ? "인터넷" : "Internet", s.net), statLine(lang, "DNS", s.dns));
  if (wifi.length) {
    out.push("", ko ? "Wi-Fi 사건(Windows 기록):" : "Wi-Fi events (Windows log):");
    for (const w of wifi) out.push(`${stamp(w.ts)}  ${w.connected ? (ko ? "연결" : "connected") : ko ? "끊김" : "disconnected"}${w.reason ? ` — ${w.reason}` : ""}${w.code != null ? ` (0x${w.code.toString(16)})` : ""}`);
  }
  out.push("", ...CAVEATS.map((c) => `* ${c[lang]}`));
  return out.join("\n") + "\n";
}

// ---------------------------------------------------------------- 그래프 도움

/** 보이는 범위의 y 상한 — 98% 값의 1.5배를 보기 좋은 수로(최소 20 ms) */
export function yMax(vals: readonly number[]) {
  const ok = vals.filter((v) => v >= 0).sort((a, b) => a - b);
  if (!ok.length) return 20;
  const p = ok[Math.min(ok.length - 1, Math.floor(ok.length * 0.98))] * 1.5;
  const steps = [20, 50, 100, 200, 300, 500, 1000, 2000];
  return steps.find((s) => s >= p) ?? 2000;
}
