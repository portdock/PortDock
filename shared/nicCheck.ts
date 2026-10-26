// 랜카드 점검(Port Inspector «이 PC 랜카드» 카드) — 고급 속성·절전·통계·네트워크 프로필·방화벽을 «용도» 에 따라
// «문제 없음(읽은 범위) / 볼 것 / 문제 있음 / 읽지 못함» 으로 나누는 순수 함수와 결과 글.
// 권장값은 PortDock 이 정하지 않는다 — 카메라 제조사 공개 문서의 예를 출처와 함께 나란히 둘 뿐이고, 제조사끼리 다르면 둘 다 둔다.
// «문제 있음» 은 쓰지 않는다(랜카드 설정만으로 명백히 틀렸다고 말할 수 있는 값이 없다). 바꾸기는 하지 않는다(장치 관리자 안내만).
import type { FirewallProfile, Level, NicList, NicProp, NicSummary, Text, Verdict } from "./portinfo.ts";

export type NicPurpose = "general" | "camera" | "plc";
export const NIC_PURPOSES: NicPurpose[] = ["general", "camera", "plc"];

const t = (ko: string, en: string): Text => ({ ko, en });
const rank: Record<Level, number> = { ok: 0, unread: 1, look: 2, problem: 3 };
const worst = (a: Level, b: Level): Level => (rank[b] > rank[a] ? b : a);

export const PURPOSE_TEXT: Record<NicPurpose, Text> = {
  general: t("일반", "General"),
  camera: t("GigE 카메라", "GigE camera"),
  plc: t("PLC·Modbus TCP 장비", "PLC / Modbus TCP device"),
};

export const PROFILE_TEXT: Record<"public" | "private" | "domain", Text> = {
  public: t("공용", "Public"),
  private: t("개인", "Private"),
  domain: t("도메인", "Domain"),
};

/** 화면 위쪽에 따로 보이는 속성(같은 뜻의 키워드 여럿 — 앞의 것이 먼저) */
export const KEY_PROPS: { id: string; keywords: string[]; label: Text }[] = [
  { id: "jumbo", keywords: ["*JumboPacket"], label: t("점보 프레임", "Jumbo frames") },
  { id: "rxbuf", keywords: ["*ReceiveBuffers"], label: t("수신 버퍼", "Receive buffers") },
  { id: "txbuf", keywords: ["*TransmitBuffers"], label: t("송신 버퍼", "Transmit buffers") },
  { id: "intmod", keywords: ["*InterruptModeration"], label: t("인터럽트 완화", "Interrupt moderation") },
  // 표준 키워드가 아니다 — Intel 드라이버는 «ITR»
  { id: "intrate", keywords: ["*InterruptModerationRate", "ITR"], label: t("인터럽트 완화 정도", "Interrupt moderation rate") },
  { id: "eee", keywords: ["*EEE", "EEE"], label: t("에너지 효율 이더넷(EEE)", "Energy-Efficient Ethernet (EEE)") },
  { id: "flow", keywords: ["*FlowControl"], label: t("흐름 제어", "Flow control") },
  { id: "speed", keywords: ["*SpeedDuplex"], label: t("속도·이중 설정", "Speed & duplex setting") },
  { id: "rss", keywords: ["*RSS"], label: t("수신 측 배율 조정(RSS)", "Receive Side Scaling (RSS)") },
  { id: "rssq", keywords: ["*NumRssQueues"], label: t("RSS 큐 수", "RSS queues") },
];

export interface VendorExample {
  vendor: string;
  text: Text;
  url: string;
}
const BASLER = "https://docs.baslerweb.com/affected-network-parameters";
const MATHWORKS = "https://www.mathworks.com/help/imaq/configure-gigabit-ethernet-network-adapter-on-windows.html";
const BALLUFF = "https://assets.balluff.com/documents/DRF_959443_AA_000/Troubleshooting_section_Checklist_Network_Settings_Windows.html";
const TELEDYNE = "https://www.teledynevisionsolutions.com/support/support-center/troubleshooting/iis/windows-firewall-may-disable-gige-network/";

/** 카메라 제조사 공개 문서에 적힌 예 — PortDock 의 권장이 아니다. 키: KEY_PROPS id 또는 «firewall» */
export const VENDOR_EXAMPLES: Record<string, VendorExample[]> = {
  jumbo: [
    { vendor: "Basler", text: t("가장 큰 값", "Maximum value"), url: BASLER },
    { vendor: "MathWorks", text: t("가장 큰 값(예 9014)", "Maximum value (e.g. 9014)"), url: MATHWORKS },
  ],
  rxbuf: [
    { vendor: "Basler", text: t("가장 큰 값(레지스트리 설정이 없으면 2048)", "Maximum value (2048 if not set in the registry)"), url: BASLER },
    { vendor: "MathWorks", text: t("가장 큰 값(예 2048)", "Maximum value (e.g. 2048)"), url: MATHWORKS },
  ],
  intmod: [{ vendor: "Basler", text: t("켬", "Enabled"), url: BASLER }],
  intrate: [
    { vendor: "Basler", text: t("Extreme. 버퍼 언더런·패킷 손실이 나면 Low·Minimal, 지연이 중요하면 Off", "Extreme. Low or Minimal on buffer underruns or packet loss, Off when latency matters"), url: BASLER },
    { vendor: "Balluff", text: t("Extreme 은 인터럽트가 늦어 손실이 날 수 있다고 경고", "Warns that Extreme can delay interrupts and cause loss"), url: BALLUFF },
  ],
  speed: [{ vendor: "MathWorks", text: t("자동 협상(Auto Negotiation)", "Auto Negotiation"), url: MATHWORKS }],
  rss: [{ vendor: "Basler", text: t("켬, 큐 1", "Enabled, 1 queue"), url: BASLER }],
  firewall: [{ vendor: "Teledyne", text: t("Windows 방화벽이 GigE 카메라 영상을 막을 수 있음 — 카메라 프로그램을 허용", "Windows Firewall may block the GigE stream — allow the camera software"), url: TELEDYNE }],
};

/** 장치 관리자에 쓰이는 값(원값이 없으면 드라이버 기본값) */
export const effective = (p: NicProp | null | undefined) => (p ? (p.raw ?? p.default ?? null) : null);

/** 키워드 여럿 중 처음 있는 속성(대소문자 무시) */
export function findProp(nic: NicSummary, keywords: string[]): NicProp | null {
  const list = nic.advanced ?? [];
  for (const k of keywords) {
    const p = list.find((x) => x.keyword.toLowerCase() === k.toLowerCase());
    if (p) return p;
  }
  return null;
}

/** 위쪽 표 — 드라이버가 알려 준 것만, 알려 주지 않은 것은 missing */
export function keyProps(nic: NicSummary) {
  const rows: { id: string; label: Text; prop: NicProp }[] = [];
  const missing: Text[] = [];
  for (const k of KEY_PROPS) {
    const prop = findProp(nic, k.keywords);
    if (prop) rows.push({ id: k.id, label: k.label, prop });
    else if (k.id !== "intrate" && k.id !== "rssq") missing.push(k.label);
  }
  const shown = new Set(rows.map((r) => r.prop.keyword));
  const others = (nic.advanced ?? []).filter((p) => !shown.has(p.keyword));
  return { rows, missing, others };
}

/** 점보 프레임이 꺼졌는지 — 표준 키워드는 프레임 크기(1514 = 끔). 모르면 null */
export function jumboOff(p: NicProp | null): boolean | null {
  const v = Number(effective(p));
  if (!p || !Number.isFinite(v)) return null;
  return v <= 1514;
}

/** 원값과 고를 수 있는 범위 «512 (32–2048)» */
export function rangeText(p: NicProp): string {
  if (p.min != null || p.max != null) return `${p.min ?? "?"}–${p.max ?? "?"}`;
  return p.valid.join(" · ");
}

const fmtCount = (n: number) => n.toLocaleString("en-US");

/** 랜카드 하나의 판정 — 용도가 «일반» 이면 링크·오류만 본다 */
export function nicVerdict(nic: NicSummary, purpose: NicPurpose, firewall: FirewallProfile[] = [], advRead = true): Verdict {
  const notes: Text[] = [];
  let level: Level = "ok";
  const look = (n: Text) => {
    level = worst(level, "look");
    notes.push(n);
  };
  const device = purpose !== "general";
  if (!nic.up) {
    notes.push(t("연결 안 됨 — 링크 속도·이중은 케이블을 꽂은 뒤 읽힙니다.", "Not connected — link speed and duplex are read once a cable is plugged in."));
  } else {
    if (nic.fullDuplex === false) look(t("반이중 — 케이블·스위치 포트의 자동 협상을 봅니다.", "Half duplex — check the cable and auto-negotiation on the switch port."));
    if (nic.speed != null && nic.speed < 100e6) look(t("링크 10 Mbps — 케이블(선 수)·스위치 포트를 봅니다.", "Link at 10 Mbps — check the cable (wire pairs) and switch port."));
  }
  const speed = findProp(nic, ["*SpeedDuplex"]);
  const sv = effective(speed);
  if (sv != null && sv !== "0")
    look(
      t(
        `속도·이중을 «${speed?.display ?? sv}» 로 고정 — 상대 장비도 같은 값으로 고정돼야 합니다. 한쪽만 고정이면 이중이 어긋날 수 있습니다.`,
        `Speed & duplex fixed to «${speed?.display ?? sv}» — the other end must be fixed to the same value; fixing only one side can cause a duplex mismatch.`,
      ),
    );
  const s = nic.stats;
  if (s && s.inErrors > 0) look(t(`받기 오류 ${fmtCount(s.inErrors)}건(누적) — 케이블·커넥터·상대 포트를 봅니다.`, `${fmtCount(s.inErrors)} receive errors (cumulative) — check the cable, connectors and the other port.`));
  if (s && s.inDiscards > 0) {
    const n = t(`버린 받기 패킷 ${fmtCount(s.inDiscards)}건(누적) — 수신 버퍼가 모자라거나 처리가 늦을 때 늘어납니다.`, `${fmtCount(s.inDiscards)} discarded received packets (cumulative) — grows when receive buffers run short or processing lags.`);
    if (purpose === "camera") look(n);
    else notes.push(n);
  }
  if (device && nic.canTurnOff)
    look(t("«전원 절약을 위해 컴퓨터가 이 장치를 끌 수 있음» 켜짐 — 오래 켜 두는 장비 PC 라면 끄는 것을 검토합니다.", "«Allow the computer to turn off this device to save power» is on — on a PC that runs equipment for long periods, consider turning it off."));
  if (device && nic.up && nic.profile === "public")
    look(t("네트워크 프로필 «공용» — 방화벽이 들어오는 연결을 가장 많이 막는 프로필입니다. 장비 전용망이면 «개인» 을 검토합니다.", "Network profile «Public» — the profile where the firewall blocks the most incoming traffic. For a dedicated equipment network, consider «Private»."));
  const fw = nic.profile ? firewall.find((f) => f.profile === nic.profile) : undefined;
  if (purpose === "camera" && nic.up && fw?.enabled)
    look(t("이 프로필의 방화벽 켜짐 — 카메라 영상(UDP)이 들어오려면 카메라 프로그램이 허용돼 있어야 합니다(규칙은 이 화면에서 읽지 않음).", "Firewall on for this profile — the camera software must be allowed for the (UDP) stream to come in (rules are not read here)."));
  if (purpose === "camera") {
    const jumbo = findProp(nic, ["*JumboPacket"]);
    if (jumboOff(jumbo))
      look(t("점보 프레임 꺼짐 — 아래 카메라 제조사 문서 예와 견줘 봅니다. 켤 때는 카메라·스위치의 패킷 크기도 같이 맞아야 합니다.", "Jumbo frames off — compare with the camera vendor examples below. If you turn them on, the camera and switch packet size must match too."));
    else if (!jumbo && advRead) notes.push(t("이 드라이버는 점보 프레임 설정을 알려 주지 않습니다.", "This driver does not report a jumbo frame setting."));
    const rx = findProp(nic, ["*ReceiveBuffers"]);
    const rv = Number(effective(rx));
    if (rx?.max != null && Number.isFinite(rv) && rv < rx.max)
      look(t(`수신 버퍼 ${rv} (이 랜카드 최대 ${rx.max}) — 아래 카메라 제조사 문서 예와 견줘 봅니다.`, `Receive buffers ${rv} (this adapter's maximum ${rx.max}) — compare with the camera vendor examples below.`));
  }
  if (device) {
    const eee = findProp(nic, ["*EEE", "EEE"]);
    const ev = effective(eee);
    if (ev != null && ev !== "0")
      look(t("에너지 효율 이더넷(EEE) 켜짐 — 일부 랜카드·스위치 조합에서 링크가 잠깐 끊긴다는 사례가 있습니다(원인으로 단정하지는 않음).", "Energy-Efficient Ethernet (EEE) on — some adapter/switch combinations are reported to drop the link briefly (not proof of a cause)."));
  }
  if (!advRead && !(nic.advanced ?? []).length) {
    level = worst(level, "unread");
    notes.push(t("고급 속성을 읽지 못했습니다.", "Could not read the advanced properties."));
  }
  return { level, notes };
}

/** 카드 머리 — 실제로 연결된 랜카드만 모아 가장 무거운 것 */
export function nicsVerdict(list: NicList | null, purpose: NicPurpose): Verdict {
  if (!list) return { level: "unread", notes: [] };
  if (!list.nics.length) return { level: list.errors.length ? "unread" : "ok", notes: [] };
  const advRead = !list.errors.some((e) => /AdvancedProperty/.test(e));
  let level: Level = "ok";
  for (const n of list.nics.filter((x) => x.up)) level = worst(level, nicVerdict(n, purpose, list.firewall ?? [], advRead).level);
  return { level, notes: [] };
}

export const NIC_CANNOT_SEE: Text[] = [
  t("카메라·PLC 쪽 설정(패킷 크기·IP)과 스위치의 점보·EEE·흐름 제어 설정", "Camera / PLC settings (packet size, IP) and the switch's jumbo, EEE and flow control settings"),
  t("케이블 품질·길이·잡음", "Cable quality, length and noise"),
  t("CPU 부하·백신·필터 드라이버(카메라 회사 드라이버 포함)", "CPU load, antivirus and filter drivers (including camera vendor drivers)"),
  t("방화벽 규칙(포트·프로그램별) — 이 화면은 프로필이 켜졌는지만 읽습니다", "Firewall rules (per port / program) — this screen only reads whether each profile is on"),
];

export const NIC_WHERE = t(
  "바꾸는 곳: 장치 관리자 → 네트워크 어댑터 → 이 랜카드 → 속성 → «고급»·«전원 관리» 탭(관리자 권한). PortDock 은 읽기만 합니다.",
  "Where to change: Device Manager → Network adapters → this adapter → Properties → «Advanced» and «Power Management» tabs (administrator). PortDock only reads.",
);

const onOff = (lang: "ko" | "en", v: boolean | null | undefined) => (v == null ? (lang === "ko" ? "읽지 못함" : "not read") : v ? (lang === "ko" ? "켜짐" : "on") : lang === "ko" ? "꺼짐" : "off");

/** 결과 글(복사·저장)의 랜카드 부분. `v` = 판정을 «[볼 것] …» 으로 바꾸는 함수(portinfo.ts bundleText 가 넘긴다) */
export function nicLines(lang: "ko" | "en", list: NicList, purpose: NicPurpose, v: (x: Verdict) => string, fmtSpeed: (n: number | null) => string): string[] {
  const ko = lang === "ko";
  const out: string[] = [];
  out.push(`${ko ? "용도" : "Use"}: ${PURPOSE_TEXT[purpose][lang]}`);
  if (list.firewall?.length) out.push(`${ko ? "방화벽" : "Firewall"}: ${list.firewall.map((f) => `${PROFILE_TEXT[f.profile][lang]}${f.current ? "*" : ""} ${onOff(lang, f.enabled)}`).join(" · ")}${ko ? " (* 지금 쓰는 프로필)" : " (* in use)"}`);
  const advRead = !list.errors.some((e) => /AdvancedProperty/.test(e));
  for (const n of list.nics) {
    out.push("", `### ${n.name} — ${n.description}`);
    out.push(v(nicVerdict(n, purpose, list.firewall ?? [], advRead)));
    out.push(
      `${ko ? "링크" : "Link"}: ${n.up ? fmtSpeed(n.speed) : ko ? "연결 안 됨" : "not connected"}${n.fullDuplex == null ? "" : n.fullDuplex ? (ko ? " 전이중" : " full duplex") : ko ? " 반이중" : " half duplex"} · ${n.ipv4.join(", ") || "—"}${n.gateway ? ` · GW ${n.gateway}` : ""}`,
    );
    if (n.profile !== undefined) out.push(`${ko ? "네트워크 프로필" : "Network profile"}: ${n.profile ? `${PROFILE_TEXT[n.profile][lang]}${n.network ? ` (${n.network})` : ""}` : "—"}`);
    if (n.canTurnOff !== undefined) out.push(`${ko ? "PC 가 끌 수 있음" : "PC may turn off"}: ${onOff(lang, n.canTurnOff)}${n.pnpCapabilities != null ? ` · PnPCapabilities ${n.pnpCapabilities}` : ""}`);
    if (n.stats) out.push(`${ko ? "받기 오류·버림" : "Receive errors / discards"}: ${n.stats.inErrors} / ${n.stats.inDiscards} · ${ko ? "보내기 오류·버림" : "send errors / discards"}: ${n.stats.outErrors} / ${n.stats.outDiscards}`);
    for (const p of n.advanced ?? []) out.push(`${p.keyword} (${p.name}) = ${p.display ?? "—"} [${p.raw ?? (ko ? `기본 ${p.default ?? "—"}` : `default ${p.default ?? "—"}`)}]${rangeText(p) ? ` (${rangeText(p)})` : ""}`);
  }
  if (purpose === "camera") {
    out.push("", ko ? "카메라 제조사 문서 예(PortDock 의 권장 아님):" : "Camera vendor examples (not PortDock recommendations):");
    for (const k of [...KEY_PROPS.map((x) => ({ id: x.id, label: x.label })), { id: "firewall", label: t("방화벽", "Firewall") }])
      for (const e of VENDOR_EXAMPLES[k.id] ?? []) out.push(`- ${k.label[lang]} · ${e.vendor}: ${e.text[lang]} — ${e.url}`);
  }
  if (list.errors.length) out.push(`${ko ? "읽지 못함" : "Not read"}: ${list.errors.join(" / ")}`);
  out.push("", ko ? "PC 가 볼 수 없는 것(랜카드):" : "What the PC cannot see (network):");
  for (const c of NIC_CANNOT_SEE) out.push(`- ${c[lang]}`);
  return out;
}
