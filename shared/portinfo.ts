// 포트 점검(Port Inspector·Serial «연결 점검…») — 백엔드(crates/core/src/portinfo, loopback.rs) 모양과
// 읽은 값을 «문제 없음(읽은 범위) / 볼 것 / 문제 있음 / 읽지 못함» 으로 나누는 순수 함수, 결과 글(복사·저장).
// 단정하지 않는다 — PC 가 읽은 범위만 말하고, 볼 수 없는 것(배선·종단·바이어스·접지)을 늘 함께 적는다.
import { hideUserPaths } from "./redact.ts";

export type Lang = "ko" | "en";
export interface Text {
  ko: string;
  en: string;
}

// ---------------------------------------------------------------- 백엔드 모양

export interface PortEntry {
  port: string | null;
  name: string;
  instanceId: string;
  present: boolean;
  vid: number | null;
  pid: number | null;
  problem: number | null;
  class: string;
}
export interface Problem {
  code: number;
  meaning: Text;
  action: Text;
}
export interface Chip {
  vendor: string;
  chip?: string;
  note?: Text;
  clue: boolean;
}
export interface RegValue {
  name: string;
  value: string;
  kind: "dword" | "string" | "multi" | "binary" | "qword" | "other";
  num?: number;
  note?: Text;
}
export interface PowerDevice {
  instanceId: string;
  name: string;
  canTurnOff: boolean;
  own: boolean;
}
export interface PortReport {
  entry: PortEntry;
  readAt: number;
  description: string | null;
  busDescription: string | null;
  manufacturer: string | null;
  location: string | null;
  hardwareIds: string[];
  chip: Chip | null;
  driver: { provider: string | null; version: string | null; date: number | null; inf: string | null; service: string | null };
  status: { present: boolean; started: boolean; problem: Problem | null; disabled: boolean };
  lastArrival: number | null;
  lastRemoval: number | null;
  firstInstall: number | null;
  ancestors: { instanceId: string; name: string; service: string | null }[];
  params: RegValue[];
  portDefault: string | null;
  portDefaultNote?: Text;
  power: { usbSuspendAc: boolean | null; usbSuspendDc: boolean | null; devices: PowerDevice[] };
  errors: string[];
}
export interface ComNumbers {
  comdbFound: boolean;
  reserved: number[];
  present: number[];
  hidden: [number, string][];
  orphan: number[];
  shared: [number, string[]][];
  serialcomm: string[];
  errors: string[];
}
export interface PnpEvent {
  time: number;
  id: number;
  provider: string;
  kind: "start" | "install" | "delete" | "problem" | "other";
  level: number;
  message: string | null;
  device: string;
}
export interface EventList {
  events: PnpEvent[];
  days: number;
  errors: string[];
}
export interface NicSummary {
  name: string;
  description: string;
  up: boolean;
  speed: number | null;
  fullDuplex: boolean | null;
  ipv4: string[];
  gateway: string | null;
}
export interface NicList {
  nics: NicSummary[];
  errors: string[];
}

export type LoopMode = "loopback" | "echo";
export interface LoopConfig {
  port: string;
  mode: LoopMode;
  bauds: number[];
  bytes?: number;
  pings?: number;
}
export interface CommFlags {
  read: boolean;
  frame: boolean;
  parity: boolean;
  overrun: boolean;
  rxOver: boolean;
  break: boolean;
}
export interface Rtt {
  samples: number;
  lost: number;
  min: number;
  median: number;
  max: number;
}
export interface BaudResult {
  baud: number;
  sent: number;
  received: number;
  same: number;
  changed: number;
  lost: number;
  extra: number;
  rtt: Rtt | null;
  flags: CommFlags;
  nothingBack: boolean;
}
export interface EchoResult {
  baud: number;
  sent: number;
  received: number;
  echoed: boolean;
  partial: boolean;
  firstMs: number | null;
  flags: CommFlags;
}
export type LoopEvent =
  | { type: "progress"; baud: number; done: number; total: number }
  | { type: "baud"; result: BaudResult }
  | { type: "echo"; result: EchoResult }
  | { type: "done"; cancelled: boolean; ms: number }
  | { type: "error"; message: string; busy: boolean };

/** 루프백 시험 속도(기본) */
export const LOOP_BAUDS = [9600, 19200, 38400, 57600, 115200];

// ---------------------------------------------------------------- 판정

export type Level = "ok" | "look" | "problem" | "unread";
export interface Verdict {
  level: Level;
  notes: Text[];
}

const t = (ko: string, en: string): Text => ({ ko, en });
const worst = (a: Level, b: Level): Level => {
  const rank: Record<Level, number> = { ok: 0, unread: 1, look: 2, problem: 3 };
  return rank[b] > rank[a] ? b : a;
};

export const LEVEL_TEXT: Record<Level, Text> = {
  ok: t("문제 없음(읽은 범위)", "No issue found (in what was read)"),
  look: t("볼 것", "Worth a look"),
  problem: t("문제 있음", "Problem"),
  unread: t("읽지 못함", "Could not read"),
};

export const hex4 = (n: number | null | undefined) => (n == null ? "—" : n.toString(16).toUpperCase().padStart(4, "0"));

/** 장치·드라이버 */
export function deviceVerdict(r: PortReport): Verdict {
  const notes: Text[] = [];
  let level: Level = "ok";
  if (!r.status.present) {
    level = "look";
    notes.push(t("지금 연결돼 있지 않은 장치입니다(예전에 꽂았던 기록).", "This device is not connected now (a record from an earlier connection)."));
  } else if (r.status.problem) {
    level = "problem";
    notes.push(t(`문제 코드 ${r.status.problem.code}: ${r.status.problem.meaning.ko}`, `Problem code ${r.status.problem.code}: ${r.status.problem.meaning.en}`));
  } else if (!r.status.started && r.entry.instanceId) {
    level = "look";
    notes.push(t("드라이버가 시작되지 않았습니다.", "The driver has not started."));
  }
  if (r.chip?.clue && r.chip.note) {
    level = worst(level, "look");
    notes.push(r.chip.note);
  }
  if (r.status.problem?.code === 10 && r.entry.vid === 0x067b) {
    level = worst(level, "look");
    notes.push(t("Prolific 칩 + 문제 코드 10 — 단종된 옛 리비전(HXA·XA)이나 복제 칩에서 흔한 조합입니다(단정은 아님).", "Prolific chip + problem code 10 — common with discontinued revisions (HXA, XA) or cloned chips (not conclusive)."));
  }
  if (!r.entry.instanceId) {
    level = worst(level, "unread");
    notes.push(t("포트 장치 목록에 없는 COM 이라 장치 정보를 읽지 못했습니다.", "This COM is not in the port device list, so device details could not be read."));
  }
  return { level, notes };
}

/** FTDI 지연 타이머 등 장치 설정 */
export function settingsVerdict(r: PortReport): Verdict {
  const notes: Text[] = [];
  let level: Level = "ok";
  const lat = r.params.find((p) => p.name === "LatencyTimer");
  if (lat?.num != null && lat.num >= 16) {
    level = "look";
    notes.push(
      t(
        `지연 타이머 ${lat.num}ms — 짧은 응답이 최대 ${lat.num}ms 늦게 PC 에 닿을 수 있습니다. 대부분의 용도에는 그대로 둬도 됩니다.`,
        `Latency timer ${lat.num} ms — short replies can reach the PC up to ${lat.num} ms late. Fine for most uses.`,
      ),
    );
  }
  if (!r.params.length && r.errors.some((e) => e.startsWith("Device Parameters"))) level = worst(level, "unread");
  return { level, notes };
}

/** 절전 */
export function powerVerdict(r: PortReport): Verdict {
  const p = r.power;
  const notes: Text[] = [];
  if (p.usbSuspendAc == null && p.usbSuspendDc == null && !p.devices.length) return { level: "unread", notes };
  let level: Level = "ok";
  const offable = p.devices.filter((d) => d.canTurnOff);
  if (p.usbSuspendAc || offable.length) {
    level = "look";
    notes.push(
      t(
        "절전이 켜져 있습니다 — 대부분 문제 없지만, 오래 켜 두는 감시·기록 PC 에서 변환기가 가끔 끊기면 끄는 것을 검토합니다(끊김 원인으로 단정하지는 않음).",
        "Power saving is on — usually harmless, but on a PC that monitors or logs for long periods, consider turning it off if the adapter drops now and then (not proof of the cause).",
      ),
    );
  }
  return { level, notes };
}

/** 연결 기록 — 하루에 시작(연결)이 3번 이상이면 «볼 것», 시작 문제 이벤트가 있으면 «볼 것» */
export function historyVerdict(ev: EventList | null): Verdict {
  if (!ev) return { level: "unread", notes: [] };
  const notes: Text[] = [];
  let level: Level = ev.errors.length && !ev.events.length ? "unread" : "ok";
  const days = new Map<string, number>();
  for (const e of ev.events) {
    if (e.kind !== "start") continue;
    const d = new Date(e.time).toDateString();
    days.set(d, (days.get(d) ?? 0) + 1);
  }
  const busy = [...days.values()].filter((n) => n >= 3).length;
  if (busy) {
    level = "look";
    notes.push(t(`하루에 3번 이상 다시 연결된 날이 ${busy}일 — 케이블·허브·절전을 봅니다.`, `${busy} day(s) with 3 or more reconnects — check the cable, hub and power saving.`));
  }
  if (ev.events.some((e) => e.kind === "problem" || e.level === 2 || e.level === 1)) {
    level = worst(level, "look");
    notes.push(t("기간 안에 장치 시작 문제·오류 이벤트가 있습니다.", "There are device start problems or error events in this period."));
  }
  return { level, notes };
}

/** COM 번호 */
export function comVerdict(c: ComNumbers | null, port: string | null): Verdict {
  if (!c) return { level: "unread", notes: [] };
  const notes: Text[] = [];
  let level: Level = c.errors.length && !c.comdbFound ? "unread" : "ok";
  const n = port ? Number(/^COM(\d+)$/i.exec(port)?.[1] ?? 0) : 0;
  if (n && c.shared.some(([x]) => x === n)) {
    level = "problem";
    notes.push(t(`COM${n} 을 둘 이상의 장치가 쥐고 있습니다 — 한 번에 하나만 쓸 수 있습니다.`, `More than one device holds COM${n} — only one can use it at a time.`));
  }
  if (n >= 17) {
    level = worst(level, "look");
    notes.push(t(`COM${n} — 옛 프로그램 가운데 COM1~16 만 고를 수 있는 것이 있습니다.`, `COM${n} — some older programs only offer COM1–16.`));
  }
  if (c.orphan.length) notes.push(t(`주인 없는 예약 번호 ${c.orphan.length}개 — 새 장치가 높은 번호를 받는 까닭이 됩니다.`, `${c.orphan.length} reserved number(s) with no device — a reason new devices get high numbers.`));
  return { level, notes };
}

/** 루프백 한 속도 */
export function loopVerdict(r: BaudResult): Verdict {
  const notes: Text[] = [];
  let level: Level = "ok";
  if (r.nothingBack) {
    return { level: "problem", notes: [t("아무것도 돌아오지 않았습니다 — TX·RX 를 이었는지, 속도를 받는 변환기인지 봅니다.", "Nothing came back — check that TX and RX are tied and the adapter accepts this speed.")] };
  }
  if (r.lost || r.changed) {
    level = "problem";
    notes.push(t(`잃음 ${r.lost} · 바뀜 ${r.changed} 바이트`, `${r.lost} lost · ${r.changed} changed bytes`));
  }
  if (r.extra) {
    level = worst(level, "look");
    notes.push(t(`보낸 것보다 ${r.extra} 바이트 더 왔습니다(선에 다른 장비가 있는지).`, `${r.extra} more bytes than sent (is another device on the line?).`));
  }
  if (r.flags.frame || r.flags.parity || r.flags.overrun || r.flags.rxOver || r.flags.break) {
    level = worst(level, "look");
    notes.push(t("드라이버가 오류 표시를 올렸습니다.", "The driver raised error flags."));
  }
  if (r.rtt && r.rtt.median >= 10) {
    level = worst(level, "look");
    notes.push(t(`1바이트 왕복 중앙값 ${r.rtt.median.toFixed(1)}ms — USB 변환기의 지연 타이머(FTDI 기본 16ms) 때문일 수 있습니다.`, `Median 1-byte round trip ${r.rtt.median.toFixed(1)} ms — possibly the USB adapter's latency timer (FTDI default 16 ms).`));
  }
  return { level, notes };
}

export function echoVerdict(r: EchoResult): Verdict {
  if (r.echoed)
    return {
      level: "look",
      notes: [t("에코 있음 — 이 변환기는 보낸 바이트를 되받습니다. 받는 쪽에 보낸 것이 먼저 섞여 보입니다(2선 RS-485 에서 흔함).", "Echo — this adapter receives what it sends; your own bytes show up before the reply (common on 2-wire RS-485).")],
    };
  if (r.partial) return { level: "look", notes: [t("보낸 것의 앞부분만 돌아왔습니다 — 방향 전환이 늦거나 선에 잡음이 있을 수 있습니다.", "Only the start of what was sent came back — direction switching may be slow or the line noisy.")] };
  if (r.received) return { level: "look", notes: [t("보낸 것과 다른 바이트가 왔습니다 — 버스에 장비가 남아 있는지 봅니다.", "Different bytes came back — check whether a device is still on the bus.")] };
  return { level: "ok", notes: [t("에코 없음 — 보낸 바이트가 되돌아오지 않았습니다.", "No echo — the sent bytes did not come back.")] };
}

// ---------------------------------------------------------------- 볼 수 없는 것·안내

/** 사이트 가이드 주소 */
export const guideUrl = (lang: Lang, slug: string) => `https://portdock.dev/${lang === "en" ? "en/" : ""}guides/${slug}/`;

export const CANNOT_SEE: Text[] = [
  t("RS-485 A/B(+/−) 뒤바뀜 — 제조사마다 이름이 다릅니다.", "RS-485 A/B (+/−) swapped — makers label them differently."),
  t("종단 저항(양 끝 120Ω)·바이어스 저항", "Termination (120 Ω at both ends) and bias resistors"),
  t("접지·공통선(GND)·차폐", "Ground / common (GND) and shielding"),
  t("장비 쪽 설정(국번·속도·패리티)과 배선 길이·잡음", "Device-side settings (Slave ID, baud, parity), cable length and noise"),
];

export const GUIDES: { slug: string; title: Text }[] = [
  { slug: "rs485-wiring", title: t("RS-485 배선", "RS-485 wiring") },
  { slug: "rs485-bias-termination", title: t("바이어스·종단", "Bias and termination") },
  { slug: "usb-serial-latency", title: t("USB 시리얼 지연", "USB serial latency") },
  { slug: "modbus-no-response", title: t("Modbus 응답 없음", "Modbus no response") },
  { slug: "rs232-db9-null-modem", title: t("RS-232 DB9·널 모뎀", "RS-232 DB9 and null modem") },
];

/** «사용 중» 일 때 — 쥔 프로그램 찾는 법(핸들은 이 프로그램이 훑지 않는다) */
export function busyHint(lang: Lang, service: string | null): string {
  const s = service || (lang === "ko" ? "드라이버 서비스 이름" : "the driver service name");
  return lang === "ko"
    ? `다른 프로그램이 이 포트를 열고 있습니다. 어느 프로그램인지는 Microsoft Process Explorer 의 «Find → Find Handle or DLL» 에 «${s}» 를 넣어 찾을 수 있습니다(이 프로그램은 다른 프로그램의 핸들을 훑지 않습니다).`
    : `Another program has this port open. To see which, use «Find → Find Handle or DLL» in Microsoft Process Explorer and search for «${s}» (this program does not scan other programs' handles).`;
}

// ---------------------------------------------------------------- 결과 글

const pad2 = (n: number) => String(n).padStart(2, "0");
export function fmtTime(ms: number | null | undefined, withTime = true) {
  if (!ms) return "—";
  const d = new Date(ms);
  const day = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return withTime ? `${day} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` : day;
}

export function fmtSpeed(bps: number | null) {
  if (!bps) return "—";
  if (bps >= 1e9) return `${+(bps / 1e9).toFixed(1)} Gbps`;
  if (bps >= 1e6) return `${+(bps / 1e6).toFixed(0)} Mbps`;
  return `${+(bps / 1e3).toFixed(0)} kbps`;
}

export interface Bundle {
  app: string;
  version: string;
  report: PortReport | null;
  com: ComNumbers | null;
  events: EventList | null;
  nics: NicList | null;
  loop: BaudResult[];
  echo: EchoResult | null;
  loopError: string | null;
}

const L = (lang: Lang, x: Text) => x[lang];
const yn = (lang: Lang, v: boolean | null | undefined) => (v == null ? (lang === "ko" ? "읽지 못함" : "not read") : v ? (lang === "ko" ? "켜짐" : "on") : lang === "ko" ? "꺼짐" : "off");

/** 문제 보고에 붙일 글 — 사용자 폴더 경로는 가린다 */
export function bundleText(lang: Lang, b: Bundle): string {
  const ko = lang === "ko";
  const out: string[] = [];
  const head = (s: string) => out.push("", `## ${s}`);
  const v = (x: Verdict) => `[${L(lang, LEVEL_TEXT[x.level])}]${x.notes.length ? " " + x.notes.map((n) => L(lang, n)).join(" / ") : ""}`;
  const r = b.report;
  out.push(`# ${b.app} ${b.version} — ${fmtTime(Date.now())}`);
  out.push(ko ? "관리자 권한 없이 읽은 값입니다. PC 가 볼 수 없는 것은 끝에 적었습니다." : "Values read without administrator rights. What the PC cannot see is listed at the end.");
  if (r) {
    const e = r.entry;
    head(ko ? "장치" : "Device");
    out.push(v(deviceVerdict(r)));
    out.push(`${ko ? "포트" : "Port"}: ${e.port ?? "—"} · ${e.name}`);
    out.push(`${ko ? "인스턴스 ID" : "Instance ID"}: ${e.instanceId || "—"}`);
    out.push(`VID/PID: ${hex4(e.vid)}:${hex4(e.pid)}${r.chip ? ` · ${r.chip.vendor}${r.chip.chip ? " " + r.chip.chip : ""}` : ""}`);
    if (r.busDescription) out.push(`${ko ? "USB 제품 이름" : "USB product"}: ${r.busDescription}`);
    out.push(`${ko ? "제조사" : "Manufacturer"}: ${r.manufacturer ?? "—"} · ${ko ? "위치" : "Location"}: ${r.location ?? "—"}`);
    out.push(`${ko ? "드라이버" : "Driver"}: ${r.driver.provider ?? "—"} ${r.driver.version ?? ""} (${fmtTime(r.driver.date, false)}) ${r.driver.inf ?? ""} · ${ko ? "서비스" : "service"} ${r.driver.service ?? "—"}`);
    out.push(`${ko ? "상태" : "Status"}: ${r.status.present ? (ko ? "연결됨" : "connected") : ko ? "연결 안 됨" : "not connected"}${r.status.problem ? ` · ${ko ? "문제 코드" : "problem code"} ${r.status.problem.code} — ${L(lang, r.status.problem.meaning)} → ${L(lang, r.status.problem.action)}` : ""}`);
    out.push(`${ko ? "마지막 연결" : "Last arrival"}: ${fmtTime(r.lastArrival)} · ${ko ? "마지막 분리" : "Last removal"}: ${fmtTime(r.lastRemoval)}`);
    head(ko ? "설정" : "Settings");
    out.push(v(settingsVerdict(r)));
    out.push(`${ko ? "Windows 포트 기본값" : "Windows port default"}: ${r.portDefault ?? "—"}`);
    for (const p of r.params) out.push(`${p.name} = ${p.value}`);
    head(ko ? "절전" : "Power saving");
    out.push(v(powerVerdict(r)));
    out.push(`${ko ? "USB 선택적 절전" : "USB selective suspend"}: AC ${yn(lang, r.power.usbSuspendAc)} · DC ${yn(lang, r.power.usbSuspendDc)}`);
    for (const d of r.power.devices) out.push(`${d.name}: ${ko ? "PC 가 끌 수 있음" : "PC may turn off"} ${yn(lang, d.canTurnOff)}`);
    if (r.errors.length) out.push(`${ko ? "읽지 못함" : "Not read"}: ${r.errors.join(" / ")}`);
  }
  if (b.events) {
    head(ko ? `연결 기록(최근 ${b.events.days}일)` : `History (last ${b.events.days} days)`);
    out.push(v(historyVerdict(b.events)));
    for (const e of b.events.events.slice(0, 30)) out.push(`${fmtTime(e.time)} · ${e.id} ${e.kind} · ${(e.message ?? "").split(/\r?\n/)[0]}`);
    if (b.events.errors.length) out.push(`${ko ? "읽지 못함" : "Not read"}: ${b.events.errors.join(" / ")}`);
  }
  if (b.com) {
    head(ko ? "COM 번호 예약" : "COM number reservations");
    out.push(v(comVerdict(b.com, r?.entry.port ?? null)));
    out.push(`${ko ? "예약" : "Reserved"}: ${b.com.reserved.map((n) => `COM${n}`).join(", ") || "—"}`);
    out.push(`${ko ? "주인 없음" : "No device"}: ${b.com.orphan.map((n) => `COM${n}`).join(", ") || "—"}`);
  }
  if (b.loop.length || b.echo || b.loopError) {
    head(ko ? "연결 시험" : "Connection test");
    if (b.loopError) out.push(b.loopError);
    for (const x of b.loop)
      out.push(
        `${x.baud} bps: ${v(loopVerdict(x))} · ${ko ? "보냄" : "sent"} ${x.sent} · ${ko ? "같음" : "same"} ${x.same} · ${ko ? "잃음" : "lost"} ${x.lost} · ${ko ? "바뀜" : "changed"} ${x.changed}${x.rtt ? ` · RTT ${x.rtt.median.toFixed(1)}/${x.rtt.max.toFixed(1)} ms` : ""}`,
      );
    if (b.echo) out.push(`${b.echo.baud} bps ${ko ? "에코" : "echo"}: ${v(echoVerdict(b.echo))}`);
  }
  if (b.nics?.nics.length) {
    head(ko ? "이 PC 랜카드" : "Network adapters on this PC");
    for (const n of b.nics.nics) out.push(`${n.name}: ${n.up ? fmtSpeed(n.speed) : ko ? "연결 안 됨" : "not connected"}${n.fullDuplex == null ? "" : n.fullDuplex ? (ko ? " 전이중" : " full duplex") : ko ? " 반이중" : " half duplex"} · ${n.ipv4.join(", ") || "—"}`);
  }
  head(ko ? "PC 가 볼 수 없는 것" : "What the PC cannot see");
  for (const c of CANNOT_SEE) out.push(`- ${L(lang, c)}`);
  return hideUserPaths(out.join("\n")) + "\n";
}

/** JSON 으로(모든 값) — 사용자 폴더 경로는 가린다 */
export function bundleJson(b: Bundle): string {
  return hideUserPaths(JSON.stringify({ ...b, exportedAt: new Date().toISOString() }, null, 2)) + "\n";
}
