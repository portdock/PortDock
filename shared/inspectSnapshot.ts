// Port Inspector «점검 결과 저장·비교»(0.10.0) — 지금 점검 결과(COM 포트·드라이버·USB 경로·랜카드 설정·«이 PC» 설정)를
// 스냅샷으로 남기고, 나중에 다시 읽은 것과 비교해 «바뀐 것» 만 보인다(유지보수 때 «지난번과 무엇이 달라졌나»).
// 화면·Tauri 의존 없는 순수 함수(시험: node --test shared/inspectSnapshot.test.ts). 읽기·저장·화면은 apps/port-inspector.
//
// 스냅샷에 넣지 않는 것: 장치 인스턴스 ID(USB 일련번호가 들어 있다)·USB 허브의 인스턴스 ID·PC 이름·연결한 네트워크 이름·
// 통계 카운터(늘 바뀐다)·디스크 온도(읽은 순간 값). 사용자 폴더 경로는 «~» 로 가린다(hideUserPaths).
// 장치는 인스턴스 ID 대신 «VID:PID + USB 포트 사슬(또는 위치)» 로 알아본다 — 같은 변환기를 다른 USB 포트에 꽂으면
// VID:PID 가 양쪽에 하나뿐일 때 같은 장치로 보고 «USB 위치 바뀜» 으로 적는다.
import { hideUserPaths } from "./redact.ts";
import { effective } from "./nicCheck.ts";
import { pcItems, type PcCheck } from "./pcCheck.ts";
import { fmtSpeed, fmtTime, hex4, type NicList, type PortEntry, type PortReport, type Text } from "./portinfo.ts";

const t = (ko: string, en: string): Text => ({ ko, en });

export const SNAPSHOT_KIND = "portdock-inspector-snapshot";

export interface SnapPort {
  /** 알아보는 열쇠(일련번호 없음) — «usb:0403:6001@1-3» · «dev:Ports:Communications Port» */
  id: string;
  port: string | null;
  name: string;
  present: boolean;
  vidPid: string | null;
  problem: number | null;
  /** 아래는 장치 정보를 읽었을 때만 */
  read: boolean;
  driverProvider?: string | null;
  driverVersion?: string | null;
  driverDate?: number | null;
  driverInf?: string | null;
  /** USB 포트 사슬 «1-3-2»(루트 허브 쪽부터), USB 가 아니면 위치 글 */
  usbPorts?: string | null;
  usbSpeed?: string | null;
  portDefault?: string | null;
  params?: Record<string, string>;
  /** «PC 가 이 장치를 끌 수 있음»(이 장치 것) */
  canTurnOff?: boolean | null;
}
export interface SnapNic {
  id: string;
  name: string;
  up: boolean;
  speed: number | null;
  fullDuplex: boolean | null;
  ipv4: string[];
  gateway: string | null;
  canTurnOff: boolean | null;
  profile: string | null;
  /** 고급 속성 — 이름 → [원값, 보이는 글] */
  props: Record<string, [string | null, string | null]>;
}
export interface SnapPc {
  readAt: number;
  /** 설정 항목(빠른 시작·절전·업데이트·…) — 값 글 */
  items: { id: string; label: Text; value: Text }[];
  crashes: { time: number; kind: string; code: number | null }[];
  disks: {
    key: string;
    model: string | null;
    criticalWarning: number | null;
    mediaErrors: number | null;
    percentageUsed: number | null;
  }[];
}
export interface Snapshot {
  kind: typeof SNAPSHOT_KIND;
  v: 1;
  name: string;
  savedAt: number;
  version?: string;
  ports: SnapPort[] | null;
  nics: SnapNic[] | null;
  pc: SnapPc | null;
}

/** 스냅샷에 넣는 «이 PC» 설정 항목(기록·디스크·배터리처럼 늘 바뀌는 값은 따로 또는 빼고) */
export const PC_SETTING_IDS = ["fastStartup", "sleep", "hibernate", "display", "aspm", "usbSuspend", "updatePolicy", "activeHours", "rebootPending", "screenSaver", "time"];

/** «Communications Port (COM1)» → «Communications Port» */
const stripCom = (name: string) => name.replace(/\s*\(COM\d+\)\s*$/i, "").trim();

/** 장치 열쇠 — 인스턴스 ID(일련번호)를 쓰지 않는다 */
export function portId(e: PortEntry, r?: PortReport | null): string {
  if (e.vid != null) {
    const chain = usbChain(r);
    return `usb:${hex4(e.vid)}:${hex4(e.pid)}@${chain ?? r?.location ?? "?"}`.toLowerCase();
  }
  return `dev:${e.class}:${stripCom(e.name)}`.toLowerCase();
}

/** USB 경로의 포트 번호 사슬(루트 허브 쪽부터) «1-3-2». 경로가 없으면 null */
function usbChain(r?: PortReport | null): string | null {
  const hops = r?.usbPath?.hops ?? [];
  const ports = hops.filter((h) => h.kind === "device" || h.kind === "hub").map((h) => h.port);
  if (!ports.length || ports.some((p) => p == null)) return null;
  return ports.reverse().join("-");
}

export interface SnapInput {
  entries: PortEntry[] | null;
  /** 읽은 장치 정보(읽지 못한 포트는 빠져도 된다) */
  reports: PortReport[];
  nics: NicList | null;
  pc: PcCheck | null;
}

/** 읽은 값 → 스냅샷 */
export function makeSnapshot(name: string, input: SnapInput, savedAt = Date.now(), version?: string): Snapshot {
  const ports = input.entries
    ? input.entries.map((e): SnapPort => {
        const r = input.reports.find((x) => x.entry.instanceId === e.instanceId && x.entry.port === e.port) ?? null;
        const base: SnapPort = {
          id: portId(e, r),
          port: e.port,
          name: e.name,
          present: e.present,
          vidPid: e.vid != null ? `${hex4(e.vid)}:${hex4(e.pid)}` : null,
          problem: e.problem,
          read: !!r,
        };
        if (!r) return base;
        const dev = r.power.devices.find((d) => d.own) ?? null;
        const speed = r.usbPath?.hops.find((h) => h.kind === "device")?.speed ?? null;
        return {
          ...base,
          driverProvider: r.driver.provider,
          driverVersion: r.driver.version,
          driverDate: r.driver.date,
          driverInf: r.driver.inf,
          usbPorts: usbChain(r) ?? r.location,
          usbSpeed: speed,
          portDefault: r.portDefault,
          params: safeParams(e, r),
          canTurnOff: dev ? dev.canTurnOff : null,
        };
      })
    : null;
  const nics = input.nics
    ? input.nics.nics.map((n): SnapNic => ({
        id: n.description || n.name,
        name: n.name,
        up: n.up,
        speed: n.speed,
        fullDuplex: n.fullDuplex,
        ipv4: [...n.ipv4],
        gateway: n.gateway,
        canTurnOff: n.canTurnOff ?? null,
        profile: n.profile ?? null,
        props: Object.fromEntries((n.advanced ?? []).map((p) => [p.name || p.keyword, [effective(p), p.display]])),
      }))
    : null;
  const pc = input.pc && !input.pc.failed ? snapPc(input.pc) : null;
  const snap: Snapshot = {
    kind: SNAPSHOT_KIND,
    v: 1,
    name: name.trim(),
    savedAt,
    ...(version ? { version } : {}),
    ports,
    nics,
    pc,
  };
  // 사용자 폴더(화면 보호기 경로 등)를 가린다
  return JSON.parse(hideUserPaths(JSON.stringify(snap))) as Snapshot;
}

/**
 * 장치 설정(Device Parameters) — PortName 은 COM 번호와 겹치고, SymbolicName 처럼 장치 경로(일련번호)를 담은 값은 뺀다.
 * 인스턴스 ID 의 조각(VID_·PID_·숫자만인 것 빼고 4글자 이상)이 든 값도 뺀다
 */
function safeParams(e: PortEntry, r: PortReport): Record<string, string> {
  const secret = e.instanceId
    .split(/[\\+#&]/)
    .filter((s) => s.length >= 4 && !/^(VID_|PID_|REV_|MI_)/i.test(s) && !/^\d+$/.test(s) && !/^(USB|FTDIBUS|ACPI|PCI)$/i.test(s))
    .map((s) => s.toLowerCase());
  const out: Record<string, string> = {};
  for (const p of r.params) {
    if (/^(PortName|SymbolicName)$/i.test(p.name)) continue;
    const v = p.value.toLowerCase();
    if (secret.some((s) => v.includes(s))) continue;
    out[p.name] = p.value;
  }
  return out;
}

function snapPc(pc: PcCheck): SnapPc {
  const items = pcItems(pc, "general", (ms) => fmtTime(ms))
    .filter((i) => PC_SETTING_IDS.includes(i.id))
    .map((i) => ({ id: i.id, label: i.label, value: i.value }));
  return {
    readAt: pc.readAt,
    items,
    crashes: (pc.crashes ?? []).map((c) => ({
      time: c.time,
      kind: c.kind,
      code: c.code,
    })),
    disks: (pc.disks ?? []).map((d) => ({
      key: `${d.index}:${d.model ?? ""}`,
      model: d.model,
      criticalWarning: d.health?.criticalWarning ?? null,
      mediaErrors: d.health?.mediaErrors ?? null,
      percentageUsed: d.health?.percentageUsed ?? null,
    })),
  };
}

/** 파일·저장소에서 읽은 글 → 스냅샷. 모양이 틀리면 null */
export function parseSnapshot(v: unknown): Snapshot | null {
  if (typeof v === "string") {
    try {
      v = JSON.parse(v.replace(/^﻿/, ""));
    } catch {
      return null;
    }
  }
  const o = v as Partial<Snapshot> | null;
  if (!o || typeof o !== "object" || o.kind !== SNAPSHOT_KIND) return null;
  const arr = <T>(x: unknown): T[] | null => (Array.isArray(x) ? (x as T[]) : null);
  const ports = arr<SnapPort>(o.ports)?.filter((p) => p && typeof p.id === "string" && typeof p.name === "string") ?? null;
  const nics = arr<SnapNic>(o.nics)?.filter((n) => n && typeof n.id === "string" && typeof n.name === "string" && n.props && typeof n.props === "object") ?? null;
  const pc =
    o.pc && typeof o.pc === "object" && Array.isArray(o.pc.items)
      ? {
          readAt: Number(o.pc.readAt) || 0,
          items: o.pc.items,
          crashes: arr<SnapPc["crashes"][number]>(o.pc.crashes) ?? [],
          disks: arr<SnapPc["disks"][number]>(o.pc.disks) ?? [],
        }
      : null;
  return {
    kind: SNAPSHOT_KIND,
    v: 1,
    name: typeof o.name === "string" && o.name.trim() ? o.name.trim() : "snapshot",
    savedAt: typeof o.savedAt === "number" ? o.savedAt : 0,
    ...(typeof o.version === "string" ? { version: o.version } : {}),
    ports,
    nics,
    pc,
  };
}

// ---------------------------------------------------------------- 비교

export type SnapSection = "port" | "nic" | "pc";
export type SnapChangeKind = "new" | "gone" | "changed";
export interface SnapChange {
  section: SnapSection;
  change: SnapChangeKind;
  /** 무엇의(«COM3 · USB Serial Port»·랜카드 이름·«이 PC») */
  target: Text;
  /** 어느 값(«COM 번호»·«드라이버 버전»·«점보 프레임»…) */
  field: Text;
  before: Text;
  after: Text;
}
export interface SnapDiff {
  changes: SnapChange[];
  /** 한쪽에서 읽지 않아 비교하지 못한 묶음 */
  skipped: SnapSection[];
}

export const SECTION_TEXT: Record<SnapSection, Text> = {
  port: t("COM 포트", "COM port"),
  nic: t("랜카드", "Network adapter"),
  pc: t("이 PC", "This PC"),
};
export const SNAP_CHANGE_TEXT: Record<SnapChangeKind, Text> = {
  new: t("새로 생김", "New"),
  gone: t("사라짐", "Missing"),
  changed: t("바뀜", "Changed"),
};

const same = (s: string): Text => t(s, s);
const NONE = t("—", "—");
const yn = (v: boolean | null | undefined): Text => (v == null ? t("읽지 못함", "not read") : v ? t("예", "yes") : t("아니요", "no"));
const str = (v: string | number | null | undefined): Text => (v == null || v === "" ? NONE : same(String(v)));
const portTitle = (p: SnapPort) => same(p.port ? `${p.port} · ${stripCom(p.name)}` : p.name);

/** 두 스냅샷 비교 — `base` = 저장해 둔 것(전), `now` = 지금 읽은 것(후) */
export function compareSnapshots(base: Snapshot, now: Snapshot): SnapDiff {
  const changes: SnapChange[] = [];
  const skipped: SnapSection[] = [];
  if (base.ports && now.ports) comparePorts(base.ports, now.ports, changes);
  else skipped.push("port");
  if (base.nics && now.nics) compareNics(base.nics, now.nics, changes);
  else skipped.push("nic");
  if (base.pc && now.pc) comparePc(base.pc, now.pc, changes);
  else skipped.push("pc");
  return { changes, skipped };
}

function comparePorts(base: SnapPort[], now: SnapPort[], out: SnapChange[]) {
  const usedB = new Set<SnapPort>();
  const usedN = new Set<SnapPort>();
  const pairs: [SnapPort, SnapPort][] = [];
  const take = (b: SnapPort, n: SnapPort) => {
    usedB.add(b);
    usedN.add(n);
    pairs.push([b, n]);
  };
  // 1. 같은 열쇠(VID:PID + USB 포트 사슬)
  for (const n of now) {
    const b = base.find((x) => !usedB.has(x) && x.id === n.id);
    if (b) take(b, n);
  }
  // 2. 같은 VID:PID 가 양쪽 남은 것에 하나씩뿐 — 다른 USB 포트에 꽂음
  for (const n of now) {
    if (usedN.has(n) || !n.vidPid) continue;
    const bs = base.filter((x) => !usedB.has(x) && x.vidPid === n.vidPid);
    const ns = now.filter((x) => !usedN.has(x) && x.vidPid === n.vidPid);
    if (bs.length === 1 && ns.length === 1) take(bs[0], n);
  }
  // 3. 같은 COM 번호·같은 이름
  for (const n of now) {
    if (usedN.has(n)) continue;
    const b = base.find((x) => !usedB.has(x) && x.port === n.port && stripCom(x.name) === stripCom(n.name));
    if (b) take(b, n);
  }
  const add = (change: SnapChangeKind, target: Text, field: Text, before: Text, after: Text) => out.push({ section: "port", change, target, field, before, after });
  for (const [b, n] of pairs) {
    const tg = portTitle(n);
    const ch = (field: Text, x: Text, y: Text) => {
      if (x.ko !== y.ko || x.en !== y.en) add("changed", tg, field, x, y);
    };
    ch(t("COM 번호", "COM number"), str(b.port), str(n.port));
    ch(t("연결", "Connected"), yn(b.present), yn(n.present));
    ch(t("문제 코드", "Problem code"), b.problem == null ? t("없음", "none") : same(String(b.problem)), n.problem == null ? t("없음", "none") : same(String(n.problem)));
    if (!b.read || !n.read) continue;
    ch(t("드라이버 제공자", "Driver provider"), str(b.driverProvider), str(n.driverProvider));
    ch(t("드라이버 버전", "Driver version"), str(b.driverVersion), str(n.driverVersion));
    ch(t("드라이버 날짜", "Driver date"), str(b.driverDate ? fmtTime(b.driverDate, false) : null), str(n.driverDate ? fmtTime(n.driverDate, false) : null));
    ch(t("드라이버 INF", "Driver INF"), str(b.driverInf), str(n.driverInf));
    ch(t("USB 위치(포트 사슬)", "USB location (port chain)"), str(b.usbPorts), str(n.usbPorts));
    ch(t("USB 속도", "USB speed"), str(b.usbSpeed), str(n.usbSpeed));
    ch(t("Windows 포트 기본값", "Windows port default"), str(b.portDefault), str(n.portDefault));
    ch(t("PC 가 끌 수 있음(절전)", "PC may turn it off (power saving)"), yn(b.canTurnOff), yn(n.canTurnOff));
    const keys = [...new Set([...Object.keys(b.params ?? {}), ...Object.keys(n.params ?? {})])].sort();
    for (const k of keys) ch(t(`장치 설정 ${k}`, `Device setting ${k}`), str(b.params?.[k]), str(n.params?.[k]));
  }
  for (const n of now) if (!usedN.has(n)) add("new", portTitle(n), t("장치", "Device"), NONE, same([n.vidPid, n.driverVersion && `driver ${n.driverVersion}`].filter(Boolean).join(" · ") || n.name));
  for (const b of base) if (!usedB.has(b)) add("gone", portTitle(b), t("장치", "Device"), same([b.vidPid, b.driverVersion && `driver ${b.driverVersion}`].filter(Boolean).join(" · ") || b.name), NONE);
}

function compareNics(base: SnapNic[], now: SnapNic[], out: SnapChange[]) {
  const usedB = new Set<SnapNic>();
  const add = (change: SnapChangeKind, target: Text, field: Text, before: Text, after: Text) => out.push({ section: "nic", change, target, field, before, after });
  for (const n of now) {
    const b = base.find((x) => !usedB.has(x) && x.id === n.id) ?? base.find((x) => !usedB.has(x) && x.name === n.name);
    if (!b) {
      add("new", same(n.name), t("랜카드", "Adapter"), NONE, same(n.id));
      continue;
    }
    usedB.add(b);
    const tg = same(n.name === b.name ? n.name : `${b.name} → ${n.name}`);
    const ch = (field: Text, x: Text, y: Text) => {
      if (x.ko !== y.ko || x.en !== y.en) add("changed", tg, field, x, y);
    };
    ch(t("연결", "Connected"), yn(b.up), yn(n.up));
    // 끊긴 랜카드는 속도·주소가 비어 있어 바뀐 것처럼 보인다 — 둘 다 연결됐을 때만
    if (b.up && n.up) {
      ch(t("링크 속도", "Link speed"), same(fmtSpeed(b.speed)), same(fmtSpeed(n.speed)));
      ch(t("이중", "Duplex"), b.fullDuplex == null ? NONE : b.fullDuplex ? t("전이중", "full") : t("반이중", "half"), n.fullDuplex == null ? NONE : n.fullDuplex ? t("전이중", "full") : t("반이중", "half"));
      ch(t("IPv4", "IPv4"), str(b.ipv4.join(", ")), str(n.ipv4.join(", ")));
      ch(t("게이트웨이", "Gateway"), str(b.gateway), str(n.gateway));
      ch(t("네트워크 프로필", "Network profile"), str(b.profile), str(n.profile));
    }
    ch(t("PC 가 끌 수 있음(절전)", "PC may turn it off (power saving)"), yn(b.canTurnOff), yn(n.canTurnOff));
    const keys = [...new Set([...Object.keys(b.props), ...Object.keys(n.props)])].sort();
    for (const k of keys) {
      const x = b.props[k];
      const y = n.props[k];
      if ((x?.[0] ?? null) === (y?.[0] ?? null)) continue;
      const show = (v?: [string | null, string | null]) => (!v ? t("없음", "none") : same(v[1] && v[1] !== v[0] ? `${v[1]} (${v[0] ?? "—"})` : (v[0] ?? "—")));
      add("changed", tg, same(k), show(x), show(y));
    }
  }
  for (const b of base) if (!usedB.has(b)) add("gone", same(b.name), t("랜카드", "Adapter"), same(b.id), NONE);
}

const CRASH_TEXT: Record<string, Text> = {
  bugcheck: t("블루스크린", "blue screen"),
  kernelPower: t("깨끗이 꺼지지 않음(Kernel-Power 41)", "no clean shutdown (Kernel-Power 41)"),
  unexpected: t("예기치 않은 종료(6008)", "unexpected shutdown (6008)"),
};

function comparePc(base: SnapPc, now: SnapPc, out: SnapChange[]) {
  const pcT = SECTION_TEXT.pc;
  const add = (change: SnapChangeKind, field: Text, before: Text, after: Text) => out.push({ section: "pc", change, target: pcT, field, before, after });
  for (const n of now.items) {
    const b = base.items.find((x) => x.id === n.id);
    if (b && (b.value.ko !== n.value.ko || b.value.en !== n.value.en)) add("changed", n.label, b.value, n.value);
  }
  // 새 블루스크린·갑자기 꺼짐 — 기준을 읽은 뒤에 생긴 것
  const seen = new Set(base.crashes.map((c) => `${c.time}|${c.kind}`));
  for (const c of now.crashes.filter((c) => c.time > base.readAt && !seen.has(`${c.time}|${c.kind}`)).sort((a, b) => a.time - b.time)) {
    const k = CRASH_TEXT[c.kind] ?? same(c.kind);
    const code = c.code != null ? ` 0x${c.code.toString(16).toUpperCase().padStart(2, "0")}` : "";
    add("new", t("새 블루스크린·갑자기 꺼짐 기록", "New blue screen / sudden shutdown record"), NONE, t(`${fmtTime(c.time)} ${k.ko}${code}`, `${fmtTime(c.time)} ${k.en}${code}`));
  }
  for (const n of now.disks) {
    const b = base.disks.find((x) => x.key === n.key) ?? base.disks.find((x) => x.model === n.model);
    const name = n.model ?? n.key;
    if (!b) {
      add("new", t(`디스크 ${name}`, `Disk ${name}`), NONE, t("새로 보임", "now present"));
      continue;
    }
    if (b.criticalWarning !== n.criticalWarning) add("changed", t(`디스크 ${name} 경고 비트`, `Disk ${name} critical warning`), str(b.criticalWarning), str(n.criticalWarning));
    if (b.mediaErrors !== n.mediaErrors) add("changed", t(`디스크 ${name} 미디어 오류`, `Disk ${name} media errors`), str(b.mediaErrors), str(n.mediaErrors));
    if (b.percentageUsed !== n.percentageUsed) add("changed", t(`디스크 ${name} 사용률(%)`, `Disk ${name} percentage used`), str(b.percentageUsed), str(n.percentageUsed));
  }
  for (const b of base.disks) if (!now.disks.some((x) => x.key === b.key || x.model === b.model)) add("gone", t(`디스크 ${b.model ?? b.key}`, `Disk ${b.model ?? b.key}`), t("있었음", "was present"), NONE);
}

// ---------------------------------------------------------------- 글

/** 비교 결과 글(복사·AI) */
export function snapDiffText(lang: "ko" | "en", base: Snapshot, now: Snapshot, d: SnapDiff): string {
  const ko = lang === "ko";
  const out = [ko ? `## 지난 점검과 비교 — «${base.name}» (${fmtTime(base.savedAt)}) → 지금 (${fmtTime(now.savedAt)})` : `## Compared with saved check «${base.name}» (${fmtTime(base.savedAt)}) → now (${fmtTime(now.savedAt)})`];
  if (!d.changes.length) out.push(ko ? "바뀐 것 없음(읽은 범위)" : "Nothing changed (within what was read)");
  for (const c of d.changes) out.push(`- [${SNAP_CHANGE_TEXT[c.change][lang]}] ${SECTION_TEXT[c.section][lang]} · ${c.target[lang]} · ${c.field[lang]}: ${c.before[lang]} → ${c.after[lang]}`);
  if (d.skipped.length) out.push(ko ? `(한쪽에서 읽지 않아 비교하지 않음: ${d.skipped.map((s) => SECTION_TEXT[s].ko).join(", ")})` : `(Not compared — not read on one side: ${d.skipped.map((s) => SECTION_TEXT[s].en).join(", ")})`);
  return out.join("\n");
}

/** 비교 결과 CSV(머리 줄 포함, BOM 없음) */
export function snapDiffCsv(lang: "ko" | "en", d: SnapDiff): string {
  const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = ["change", "area", "item", "value", "before", "after"];
  const lines = d.changes.map((c) => [SNAP_CHANGE_TEXT[c.change][lang], SECTION_TEXT[c.section][lang], c.target[lang], c.field[lang], c.before[lang], c.after[lang]].map(cell).join(","));
  return [head.join(","), ...lines].join("\r\n") + "\r\n";
}
