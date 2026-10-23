// 웹 도구 «IP 서브넷 계산기» — IPv4 주소와 마스크(255.255.255.0 또는 /24)로 네트워크·브로드캐스트·호스트 범위를 내고,
// PC 와 장비가 서로 «같은 서브넷» 으로 보는지 양쪽 마스크로 따로 판정한다(한쪽만 맞으면 응답이 게이트웨이로 가 버린다).
// 근거: CIDR 표기 RFC 4632, 사설 주소 RFC 1918(10/8·172.16/12·192.168/16), 링크 로컬 RFC 3927(169.254/16),
//       /31 두 주소 모두 호스트 RFC 3021, 루프백 127/8·멀티캐스트 224/4·제한 브로드캐스트 255.255.255.255 RFC 1122·RFC 5771·RFC 919.

export type Lang = "ko" | "en";

/** "192.168.1.10" → 32비트 부호 없는 정수. 틀리면 null */
export function parseIp(s: string): number | null {
  const m = s.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  if (o.some((x, i) => x > 255 || (m[i + 1].length > 1 && m[i + 1].startsWith("0")))) return null;
  return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
}

export const ipStr = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");

/** 접두 길이 → 마스크 */
export const maskOf = (prefix: number) => (prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0);

/** 마스크 → 접두 길이. 1 이 앞에 몰려 있지 않으면 null */
export function prefixOf(mask: number): number | null {
  const inv = ~mask >>> 0;
  if ((inv & (inv + 1)) !== 0) return null;
  let n = 0;
  for (let m = mask; m & 0x80000000; m = (m << 1) >>> 0) n++;
  return n;
}

/** "24", "/24", "255.255.255.0" → 접두 길이. 틀리면 null */
export function parseMask(s: string): number | null {
  const t = s.trim().replace(/^\//, "");
  if (/^\d{1,2}$/.test(t)) {
    const p = Number(t);
    return p <= 32 ? p : null;
  }
  const n = parseIp(t);
  return n === null ? null : prefixOf(n);
}

/** "192.168.1.10/24" 또는 주소 + 마스크 칸 */
export function parseCidr(ip: string, mask?: string): { ip: number; prefix: number } | null {
  let a = ip.trim();
  let m = mask?.trim() ?? "";
  const slash = a.indexOf("/");
  if (slash >= 0) {
    m = a.slice(slash + 1);
    a = a.slice(0, slash);
  }
  const n = parseIp(a);
  const p = parseMask(m);
  return n === null || p === null ? null : { ip: n, prefix: p };
}

export type Kind = "private" | "public" | "loopback" | "linklocal" | "multicast" | "broadcast" | "unspecified" | "reserved" | "cgnat";

const inNet = (ip: number, net: number, prefix: number) => ((ip & maskOf(prefix)) >>> 0) === net;

/** 주소 종류 */
export function kindOf(ip: number): Kind {
  if (ip === 0) return "unspecified";
  if (ip === 0xffffffff) return "broadcast";
  if (inNet(ip, 0x7f000000, 8)) return "loopback";
  if (inNet(ip, 0x0a000000, 8) || inNet(ip, 0xac100000, 12) || inNet(ip, 0xc0a80000, 16)) return "private";
  if (inNet(ip, 0xa9fe0000, 16)) return "linklocal";
  if (inNet(ip, 0x64400000, 10)) return "cgnat";
  if (inNet(ip, 0xe0000000, 4)) return "multicast";
  if (inNet(ip, 0xf0000000, 4) || inNet(ip, 0, 8)) return "reserved";
  return "public";
}

export const KIND_LABEL: Record<Kind, Record<Lang, string>> = {
  private: { ko: "사설 주소(RFC 1918) — 공장·사무실 안쪽 네트워크", en: "Private (RFC 1918) — internal plant or office network" },
  public: { ko: "공인 주소", en: "Public address" },
  loopback: { ko: "루프백(127.x) — 이 PC 자신", en: "Loopback (127.x) — this PC itself" },
  linklocal: { ko: "링크 로컬(169.254.x) — DHCP 를 못 받았을 때 윈도우가 스스로 붙이는 주소", en: "Link-local (169.254.x) — what Windows assigns itself when DHCP fails" },
  cgnat: { ko: "통신사 공유 주소(100.64/10, RFC 6598)", en: "Carrier-grade NAT shared space (100.64/10, RFC 6598)" },
  multicast: { ko: "멀티캐스트(224~239) — 장비 주소로 쓸 수 없음", en: "Multicast (224–239) — not usable as a device address" },
  broadcast: { ko: "제한 브로드캐스트(255.255.255.255)", en: "Limited broadcast (255.255.255.255)" },
  unspecified: { ko: "0.0.0.0 — 지정 안 됨", en: "0.0.0.0 — unspecified" },
  reserved: { ko: "예약 주소 — 장비 주소로 쓰지 않음", en: "Reserved — do not use as a device address" },
};

export interface Subnet {
  ip: number;
  prefix: number;
  mask: number;
  wildcard: number;
  network: number;
  broadcast: number;
  /** 쓸 수 있는 호스트 범위(/32 는 자기 자신, /31 은 둘 다) */
  first: number;
  last: number;
  hosts: number;
  /** 입력 주소가 네트워크 주소·브로드캐스트 주소인가(/31·/32 제외) */
  isNetwork: boolean;
  isBroadcast: boolean;
  kind: Kind;
}

export function subnet(ip: number, prefix: number): Subnet {
  const mask = maskOf(prefix);
  const network = (ip & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  const small = prefix >= 31;
  const first = small ? network : network + 1;
  const last = small ? broadcast : broadcast - 1;
  return {
    ip,
    prefix,
    mask,
    wildcard: ~mask >>> 0,
    network,
    broadcast,
    first,
    last,
    hosts: prefix === 32 ? 1 : prefix === 31 ? 2 : 2 ** (32 - prefix) - 2,
    isNetwork: !small && ip === network,
    isBroadcast: !small && ip === broadcast,
    kind: kindOf(ip),
  };
}

/** 8비트씩 끊은 2진 표기 */
export const bin = (n: number) => [24, 16, 8, 0].map((s) => ((n >>> s) & 255).toString(2).padStart(8, "0")).join(".");

export interface PairCheck {
  /** A 의 마스크로 볼 때 B 가 같은 서브넷인가 */
  aSeesB: boolean;
  bSeesA: boolean;
  same: boolean;
  /** 두 주소가 같다 */
  duplicate: boolean;
  messages: { level: "ok" | "warn" | "fault"; ko: string; en: string }[];
}

/** 두 장치(PC·장비)가 서로 직접(게이트웨이 없이) 닿는지 */
export function pair(a: { ip: number; prefix: number }, b: { ip: number; prefix: number }, gateway?: number | null): PairCheck {
  const A = subnet(a.ip, a.prefix);
  const B = subnet(b.ip, b.prefix);
  const aSeesB = inNet(b.ip, A.network, a.prefix);
  const bSeesA = inNet(a.ip, B.network, b.prefix);
  const duplicate = a.ip === b.ip;
  const msgs: PairCheck["messages"] = [];
  if (duplicate) msgs.push({ level: "fault", ko: "두 주소가 같습니다 — IP 충돌로 둘 중 하나는 통신이 안 됩니다", en: "Both addresses are the same — an IP conflict; one of them will not communicate" });
  for (const [s, ko, en] of [
    [A, "A", "A"],
    [B, "B", "B"],
  ] as const) {
    if (s.isNetwork) msgs.push({ level: "fault", ko: `${ko} 가 네트워크 주소(${ipStr(s.network)})입니다 — 장비 주소로 쓸 수 없습니다`, en: `${en} is the network address (${ipStr(s.network)}) — not usable for a host` });
    if (s.isBroadcast) msgs.push({ level: "fault", ko: `${ko} 가 브로드캐스트 주소(${ipStr(s.broadcast)})입니다 — 장비 주소로 쓸 수 없습니다`, en: `${en} is the broadcast address (${ipStr(s.broadcast)}) — not usable for a host` });
  }
  if (!duplicate) {
    if (aSeesB && bSeesA) msgs.push({ level: "ok", ko: "서로 같은 서브넷 — 게이트웨이 없이 바로 닿습니다", en: "Same subnet both ways — they reach each other directly, no gateway needed" });
    else if (aSeesB !== bSeesA) {
      const [who, other] = aSeesB ? ["B", "A"] : ["A", "B"];
      msgs.push({
        level: "fault",
        ko: `한쪽만 같은 서브넷으로 봅니다 — ${who} 의 마스크로는 ${other} 가 다른 네트워크라, ${who} 의 응답은 게이트웨이로 가 버립니다(마스크를 맞추세요)`,
        en: `Only one side sees the other as local — with ${who}'s mask, ${other} is on another network, so ${who}'s replies go to its gateway (make the masks match)`,
      });
    } else msgs.push({ level: "fault", ko: "다른 서브넷 — 게이트웨이(라우터) 없이 직접 닿지 않습니다. 같은 대역의 주소를 PC 에 하나 더 넣는 방법이 흔합니다", en: "Different subnets — they cannot reach each other without a gateway (router). Adding a second address on the device's subnet to the PC is the usual fix" });
    if (a.prefix !== b.prefix && aSeesB && bSeesA) msgs.push({ level: "warn", ko: `마스크가 다릅니다(/${a.prefix} · /${b.prefix}) — 지금 두 주소끼리는 되지만, 같은 네트워크의 다른 장비와는 한쪽만 닿을 수 있습니다`, en: `Masks differ (/${a.prefix} vs /${b.prefix}) — these two work, but other hosts on the network may be reachable one way only` });
  }
  if (gateway !== undefined && gateway !== null && !inNet(gateway, A.network, a.prefix))
    msgs.push({ level: "warn", ko: `게이트웨이 ${ipStr(gateway)} 가 A 의 서브넷 밖입니다 — 게이트웨이는 같은 서브넷 안에 있어야 합니다`, en: `Gateway ${ipStr(gateway)} is outside A's subnet — a gateway must be on the same subnet` });
  return { aSeesB, bSeesA, same: aSeesB && bSeesA, duplicate, messages: msgs };
}

/** 자주 쓰는 마스크 표 /8 ~ /32 */
export const PREFIX_TABLE = Array.from({ length: 25 }, (_, i) => i + 8).map((p) => ({ prefix: p, mask: ipStr(maskOf(p)), hosts: p === 32 ? 1 : p === 31 ? 2 : 2 ** (32 - p) - 2 }));
