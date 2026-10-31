// Net Scan «기준 목록»(0.10.0) — 찾은 장비 목록을 기준으로 저장해 두고 다음 찾기 결과와 비교한다(유지보수·증설·제거 확인).
// 화면·Tauri 의존 없는 순수 함수(시험: node --test shared/scanBaseline.test.ts). 저장·불러오기·화면은 apps/netscan.
//
// 짝 맞추기 순서:
// 1. 같은 MAC(양쪽 목록에서 그 MAC 이 하나뿐일 때만 — 경유 장비·프록시 ARP 는 여러 IP 가 한 MAC 이라 IP 로 맞춘다)
//    → IP 도 같으면 그대로, 다르면 «IP 바뀜»(DHCP? 설정 바꿈?)
// 2. 같은 IP → 두 MAC 이 다 있고 다르면 «MAC 바뀜»(같은 IP 에 다른 장비 = 교체 의심), 한쪽이 MAC 을 모르면 같은 장비로 본다
// 3. 남은 지금 것 = «새로 생김», 남은 기준 것 = «사라짐» — 단 이번에 찾은 범위 밖의 기준 장비는 «범위 밖» 으로 따로 센다
// 열린 포트는 짝이 맞은 장비만, 두 번 다 확인한 포트만 비교한다(이번에 확인하지 않은 포트가 «닫힘» 으로 보이지 않게).

export type DiffLang = "ko" | "en";

/** 기준·지금 목록의 장비 한 대 — Net Scan Host 의 일부 */
export interface BaseHost {
  ip: string;
  mac: string | null;
  vendor: string | null;
  name: string | null;
  ports: number[];
  /** Modbus 장비 정보 한 줄(«제조사 제품 판»), 없으면 null */
  modbus?: string | null;
}

export const BASELINE_KIND = "portdock-netscan-baseline";
export const BASELINE_MAX = 20;

export interface Baseline {
  kind: typeof BASELINE_KIND;
  v: 1;
  name: string;
  savedAt: number;
  /** 찾은 범위(«192.168.0.0/24») */
  range: string;
  /** 확인한 포트(포트 확인을 껐으면 빈 목록) */
  ports: number[];
  hosts: BaseHost[];
}

export type HostChange = "new" | "gone" | "macChanged" | "ipChanged" | "portsChanged" | "same";
/** 화면·CSV 순서 — 손볼 것부터 */
export const CHANGE_ORDER: HostChange[] = ["macChanged", "ipChanged", "new", "gone", "portsChanged", "same"];

export interface HostDiff {
  change: HostChange;
  /** 지금 IP(사라짐이면 기준 IP) */
  ip: string;
  /** IP 바뀜 — 기준 IP */
  oldIp?: string;
  mac: string | null;
  /** MAC 바뀜 — 기준 MAC */
  oldMac?: string | null;
  vendor: string | null;
  oldVendor?: string | null;
  name: string | null;
  ports: number[];
  /** 두 번 다 확인한 포트 가운데 새로 열린 것·닫힌 것 */
  opened: number[];
  closed: number[];
}

export interface ScanDiff {
  rows: HostDiff[];
  counts: Record<HostChange, number>;
  /** 이번에 찾은 범위 밖이라 비교하지 않은 기준 장비 수 */
  outside: number;
  /** 두 번 다 확인한 포트 수(0 이면 포트 비교 없음) */
  portsCompared: number;
}

/** MAC 비교용 — «00-1a-2b…»·«001A.2B…» 를 «00:1A:2B:…» 로. 6바이트가 아니면 null */
export function normMac(mac: string | null | undefined): string | null {
  if (!mac) return null;
  const hex = mac.replace(/[^0-9a-f]/gi, "").toUpperCase();
  return hex.length === 12 ? hex.match(/../g)!.join(":") : null;
}

/** IP → 숫자(정렬·범위). 틀리면 -1 */
export function ipValue(ip: string): number {
  const p = ip.split(".");
  if (p.length !== 4 || !p.every((x) => /^\d{1,3}$/.test(x) && Number(x) <= 255)) return -1;
  return ((Number(p[0]) << 24) >>> 0) + (Number(p[1]) << 16) + (Number(p[2]) << 8) + Number(p[3]);
}

const sortNum = (a: number[]) => [...new Set(a)].sort((x, y) => x - y);

/** 지금 목록 → 기준(저장할 모양). 이름은 앞뒤 빈칸을 뺀다 */
export function makeBaseline(name: string, range: string, ports: number[], hosts: BaseHost[], savedAt = Date.now()): Baseline {
  return {
    kind: BASELINE_KIND,
    v: 1,
    name: name.trim(),
    savedAt,
    range: range.trim(),
    ports: sortNum(ports),
    hosts: hosts
      .map((h) => ({
        ip: h.ip,
        mac: h.mac ?? null,
        vendor: h.vendor ?? null,
        name: h.name ?? null,
        ports: sortNum(h.ports ?? []),
        modbus: h.modbus ?? null,
      }))
      .sort((a, b) => ipValue(a.ip) - ipValue(b.ip)),
  };
}

/** 파일·저장소에서 읽은 글 → 기준. 모양이 틀리면 null */
export function parseBaseline(v: unknown): Baseline | null {
  if (typeof v === "string") {
    try {
      v = JSON.parse(v.replace(/^﻿/, ""));
    } catch {
      return null;
    }
  }
  const o = v as Partial<Baseline> | null;
  if (!o || typeof o !== "object" || o.kind !== BASELINE_KIND || !Array.isArray(o.hosts)) return null;
  const str = (x: unknown) => (typeof x === "string" && x ? x : null);
  const nums = (x: unknown) => (Array.isArray(x) ? x.filter((n): n is number => Number.isInteger(n) && n > 0 && n <= 65535) : []);
  const hosts: BaseHost[] = [];
  for (const h of o.hosts as unknown[]) {
    const x = h as Record<string, unknown>;
    if (!x || typeof x.ip !== "string" || ipValue(x.ip) < 0) continue;
    hosts.push({
      ip: x.ip,
      mac: str(x.mac),
      vendor: str(x.vendor),
      name: str(x.name),
      ports: sortNum(nums(x.ports)),
      modbus: str(x.modbus),
    });
  }
  return {
    kind: BASELINE_KIND,
    v: 1,
    name: typeof o.name === "string" && o.name.trim() ? o.name.trim() : "baseline",
    savedAt: typeof o.savedAt === "number" ? o.savedAt : 0,
    range: typeof o.range === "string" ? o.range : "",
    ports: sortNum(nums(o.ports)),
    hosts,
  };
}

/** 이름이 같으면 바꾸고, 새것을 앞에. 최대 `max` 개(오래된 것부터 버림) */
export function upsertNamed<T extends { name: string; savedAt: number }>(list: T[], item: T, max = BASELINE_MAX): T[] {
  const key = item.name.trim().toLowerCase();
  return [item, ...list.filter((x) => x.name.trim().toLowerCase() !== key)].sort((a, b) => b.savedAt - a.savedAt).slice(0, max);
}

/** MAC → 그 MAC 이 하나뿐인 장비(같은 MAC 이 여러 IP 면 넣지 않는다) */
function uniqueByMac(list: BaseHost[]) {
  const seen = new Map<string, BaseHost | null>();
  for (const h of list) {
    const m = normMac(h.mac);
    if (!m) continue;
    seen.set(m, seen.has(m) ? null : h);
  }
  return seen;
}

/**
 * 기준과 지금 비교. `now.ports` = 이번에 확인한 포트, `inScope` = 이번에 찾은 범위 안인지(없으면 모두 안)
 */
export function compareScan(base: Baseline, now: { hosts: BaseHost[]; ports: number[] }, inScope: (ip: string) => boolean = () => true): ScanDiff {
  const both = new Set(base.ports.filter((p) => now.ports.includes(p)));
  const rows: HostDiff[] = [];
  const baseByMac = uniqueByMac(base.hosts);
  const nowByMac = uniqueByMac(now.hosts);
  const usedBase = new Set<BaseHost>();
  const usedNow = new Set<BaseHost>();

  const portDiff = (b: BaseHost, n: BaseHost) => ({
    opened: n.ports.filter((p) => both.has(p) && !b.ports.includes(p)).sort((x, y) => x - y),
    closed: b.ports.filter((p) => both.has(p) && !n.ports.includes(p)).sort((x, y) => x - y),
  });
  const row = (change: HostChange, n: BaseHost, extra: Partial<HostDiff> = {}): HostDiff => ({
    change,
    ip: n.ip,
    mac: n.mac,
    vendor: n.vendor,
    name: n.name,
    ports: n.ports,
    opened: [],
    closed: [],
    ...extra,
  });
  const pair = (b: BaseHost, n: BaseHost) => {
    usedBase.add(b);
    usedNow.add(n);
    const pd = portDiff(b, n);
    const portsMoved = pd.opened.length + pd.closed.length > 0;
    const bm = normMac(b.mac);
    const nm = normMac(n.mac);
    if (b.ip !== n.ip) rows.push(row("ipChanged", n, { oldIp: b.ip, ...pd, oldVendor: b.vendor }));
    else if (bm && nm && bm !== nm) rows.push(row("macChanged", n, { oldMac: b.mac, oldVendor: b.vendor, ...pd }));
    else
      rows.push(
        row(
          portsMoved ? "portsChanged" : "same",
          {
            ...n,
            mac: n.mac ?? b.mac,
            vendor: n.vendor ?? b.vendor,
            name: n.name ?? b.name,
          },
          pd,
        ),
      );
  };

  // 1. 같은 MAC(양쪽 다 하나뿐)
  for (const n of now.hosts) {
    const m = normMac(n.mac);
    if (!m || !nowByMac.get(m)) continue;
    const b = baseByMac.get(m);
    if (b && !usedBase.has(b)) pair(b, n);
  }
  // 2. 같은 IP
  const baseByIp = new Map(base.hosts.map((h) => [h.ip, h]));
  for (const n of now.hosts) {
    if (usedNow.has(n)) continue;
    const b = baseByIp.get(n.ip);
    if (b && !usedBase.has(b)) {
      // 기준의 이 MAC 이 지금 다른 IP 에서 짝을 찾았으면(1번) 여기 오지 않는다 — 남은 것끼리만
      pair(b, n);
    }
  }
  // 3. 남은 것
  for (const n of now.hosts) if (!usedNow.has(n)) rows.push(row("new", n));
  let outside = 0;
  for (const b of base.hosts) {
    if (usedBase.has(b)) continue;
    if (!inScope(b.ip)) {
      outside++;
      continue;
    }
    rows.push(row("gone", b));
  }
  const rank = (c: HostChange) => CHANGE_ORDER.indexOf(c);
  rows.sort((a, b) => rank(a.change) - rank(b.change) || ipValue(a.ip) - ipValue(b.ip));
  const counts = Object.fromEntries(CHANGE_ORDER.map((c) => [c, 0])) as Record<HostChange, number>;
  for (const r of rows) counts[r.change]++;
  return { rows, counts, outside, portsCompared: both.size };
}

/** 범위의 처음·끝 주소 → 범위 안인지(범위가 틀리면 모두 안) */
export function scopeOf(first: string | null | undefined, last: string | null | undefined): (ip: string) => boolean {
  const a = first ? ipValue(first) : -1;
  const b = last ? ipValue(last) : -1;
  if (a < 0 || b < 0) return () => true;
  return (ip) => {
    const x = ipValue(ip);
    return x >= a && x <= b;
  };
}

// ---------------------------------------------------------------- 글

export const CHANGE_TEXT: Record<HostChange, { ko: string; en: string; hint: { ko: string; en: string } }> = {
  macChanged: {
    ko: "MAC 바뀜",
    en: "MAC changed",
    hint: {
      ko: "같은 IP 에 다른 장비 — 교체·IP 겹침 의심",
      en: "Another device on the same IP — replaced, or an IP clash?",
    },
  },
  ipChanged: {
    ko: "IP 바뀜",
    en: "IP changed",
    hint: {
      ko: "같은 장비(MAC)가 다른 IP — DHCP·설정 바꿈?",
      en: "Same device (MAC) on another IP — DHCP or reconfigured?",
    },
  },
  new: {
    ko: "새로 생김",
    en: "New",
    hint: {
      ko: "기준에 없던 장비 — 증설?",
      en: "Not in the baseline — added?",
    },
  },
  gone: {
    ko: "사라짐",
    en: "Missing",
    hint: {
      ko: "기준에 있던 장비가 안 보임 — 제거·꺼짐·케이블?",
      en: "In the baseline but not seen — removed, off, or cable?",
    },
  },
  portsChanged: {
    ko: "포트 바뀜",
    en: "Ports changed",
    hint: {
      ko: "같은 장비의 열린 포트가 달라짐 — 설정·펌웨어·서비스?",
      en: "The same device's open ports differ — settings, firmware, service?",
    },
  },
  same: {
    ko: "같음",
    en: "Same",
    hint: { ko: "기준과 같음", en: "Same as the baseline" },
  },
};

/** «바뀐 것» 한 칸 글 */
export function diffDetail(r: HostDiff, lang: DiffLang): string {
  const ko = lang === "ko";
  const parts: string[] = [];
  if (r.change === "ipChanged" && r.oldIp) parts.push(`${r.oldIp} → ${r.ip}`);
  if (r.change === "macChanged") parts.push(`${r.oldMac ?? "—"} → ${r.mac ?? "—"}${r.oldVendor !== r.vendor ? ` (${r.oldVendor ?? "?"} → ${r.vendor ?? "?"})` : ""}`);
  if (r.opened.length) parts.push(`${ko ? "열림" : "opened"} ${r.opened.join(",")}`);
  if (r.closed.length) parts.push(`${ko ? "닫힘" : "closed"} ${r.closed.join(",")}`);
  return parts.join(" · ");
}

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** 비교 결과 CSV(머리 줄 포함, BOM 없음) — `same` 은 넣지 않으려면 걸러서 넘긴다 */
export function diffCsv(rows: HostDiff[], lang: DiffLang): string {
  const head = ["change", "change_text", "ip", "old_ip", "mac", "old_mac", "vendor", "old_vendor", "name", "open_ports", "opened", "closed"];
  const lines = rows.map((r) => [r.change, CHANGE_TEXT[r.change][lang], r.ip, r.oldIp, r.mac, r.oldMac, r.vendor, r.oldVendor, r.name, r.ports.join(" "), r.opened.join(" "), r.closed.join(" ")].map(cell).join(","));
  return [head.join(","), ...lines].join("\r\n") + "\r\n";
}

/** 한 줄 요약 «MAC 바뀜 1 · 새로 생김 2 · …»(0 은 뺀다, 같음 포함) */
export function diffSummary(d: ScanDiff, lang: DiffLang): string {
  const parts = CHANGE_ORDER.filter((c) => d.counts[c] > 0).map((c) => `${CHANGE_TEXT[c][lang]} ${d.counts[c]}`);
  if (d.outside) parts.push(lang === "ko" ? `범위 밖 ${d.outside}` : `outside range ${d.outside}`);
  return parts.join(" · ") || (lang === "ko" ? "비교할 장비 없음" : "nothing to compare");
}

/** AI 복사용 글 — 바뀐 것만(같음 빼고). MAC 은 그대로 넘기고 가림은 aiCopy 가 한다 */
export function diffText(base: Baseline, d: ScanDiff, lang: DiffLang, max = 150): string {
  const ko = lang === "ko";
  const out = [
    ko
      ? `## 기준과 비교 — «${base.name}» (${base.range}, 저장 ${new Date(base.savedAt).toISOString().slice(0, 16).replace("T", " ")})`
      : `## Compared with baseline «${base.name}» (${base.range}, saved ${new Date(base.savedAt).toISOString().slice(0, 16).replace("T", " ")})`,
  ];
  out.push(diffSummary(d, lang));
  if (!d.portsCompared) out.push(ko ? "(열린 포트는 비교하지 않음 — 두 번 다 확인한 포트 없음)" : "(open ports not compared — no port checked both times)");
  const changed = d.rows.filter((r) => r.change !== "same");
  for (const r of changed.slice(0, max)) out.push(`- ${CHANGE_TEXT[r.change][lang]}: ${r.ip} ${r.mac ?? "-"} ${r.vendor ?? "-"}${diffDetail(r, lang) ? ` · ${diffDetail(r, lang)}` : ""}`);
  if (changed.length > max) out.push(`… +${changed.length - max}`);
  return out.join("\n");
}
