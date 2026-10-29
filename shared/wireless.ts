// 무선 점검(Port Inspector «무선» 탭, 0.5.0) — Wi-Fi·블루투스 읽은 값을 «문제 없음(읽은 범위) / 볼 것 / 읽지 못함» 으로 나누는
// 순수 함수와 결과 글(복사·저장). «문제 있음» 은 쓰지 않는다 — 끊김 이유·절전·핸즈프리는 원인 후보일 뿐이다. 고치지 않는다(바꾸는 곳 안내만).
// 개인 정보: 네트워크 이름(SSID)은 백엔드가 읽지 않는다. 블루투스 오디오 장치 이름은 화면에만 보이고, 결과 글·JSON 에서는 «장치 1» 로 가린다.
import { fmtTime, LEVEL_TEXT, USB_KIND_TEXT, USB_SPEED_TEXT, type Lang, type Level, type Problem, type Text, type UsbPath, type Verdict } from "./portinfo.ts";
import { hideUserPaths } from "./redact.ts";

// ---------------------------------------------------------------- 백엔드 모양(crates/core/src/portinfo/mod.rs Wireless)

export interface WlDriver {
  provider: string | null;
  version: string | null;
  date: number | null;
  inf: string | null;
  service: string | null;
}
export interface WifiAdapter {
  name: string;
  description: string;
  connected: boolean;
  driver: WlDriver;
  problem: Problem | null;
  canTurnOff: boolean | null;
}
export interface ReasonCount {
  code: number | null;
  reason: string;
  count: number;
  last: number;
}
export interface EventCount {
  provider: string;
  id: number;
  level: number;
  count: number;
  last: number;
}
export interface Wifi {
  adapters: WifiAdapter[];
  powerSaveAc: number | null;
  powerSaveDc: number | null;
  disconnects: ReasonCount[];
  logRead: boolean;
  driverEvents: EventCount[];
}
export interface BtRadio {
  name: string;
  vid: number | null;
  pid: number | null;
  driver: WlDriver;
  started: boolean;
  problem: Problem | null;
  canTurnOff: boolean | null;
  usbPath: UsbPath | null;
}
export interface ServiceState {
  name: string;
  found: boolean;
  state: "running" | "stopped" | "starting" | "stopping" | "paused" | "other" | null;
  startType: number | null;
}
export interface BtAudio {
  name: string;
  flow: "render" | "capture";
  kind: "handsFree" | "stereo" | "other";
  defaultConsole: boolean;
  defaultComms: boolean;
}
export interface Bluetooth {
  radios: BtRadio[];
  services: ServiceState[];
  events: EventCount[];
  logRead: boolean;
  audio: BtAudio[];
}
export interface Wireless {
  readAt: number;
  days: number;
  wifi: Wifi;
  bt: Bluetooth;
  errors: string[];
  /** 화면 쪽 — 백엔드 호출 자체가 실패함(값을 하나도 못 읽음) */
  failed?: boolean;
}

/** 백엔드 호출이 실패했을 때 보일 빈 결과(모든 항목 «읽지 못함») */
export function wirelessFailed(days: number, message: string): Wireless {
  return {
    readAt: Date.now(),
    days,
    wifi: { adapters: [], powerSaveAc: null, powerSaveDc: null, disconnects: [], logRead: false, driverEvents: [] },
    bt: { radios: [], services: [], events: [], logRead: false, audio: [] },
    errors: [message],
    failed: true,
  };
}

// ---------------------------------------------------------------- 항목

const t = (ko: string, en: string): Text => ({ ko, en });
const rank: Record<Level, number> = { ok: 0, unread: 1, look: 2, problem: 3 };
const worst = (a: Level, b: Level): Level => (rank[b] > rank[a] ? b : a);
const UNREAD = t("읽지 못함", "not read");

/** Microsoft 지원 «Bluetooth keeps disconnecting in Windows» — 절전·드라이버·Bluetooth 지원 서비스 확인 순서 */
export const BT_DOC_URL = "https://support.microsoft.com/en-us/windows/hardware/bluetooth/bluetooth-keeps-disconnecting-in-windows";
/** Microsoft Learn «Changes to API behavior for Wi-Fi access and location» — SSID·신호·주변 AP 가 위치 권한에 묶인 까닭 */
export const WIFI_LOCATION_URL = "https://learn.microsoft.com/en-us/windows/win32/nativewifi/wi-fi-access-location-changes";

export type WlGroup = "wifi" | "bt";
export const WL_GROUP_TEXT: Record<WlGroup, Text> = { wifi: t("Wi-Fi", "Wi-Fi"), bt: t("블루투스", "Bluetooth") };

export interface WlItem {
  id: string;
  group: WlGroup;
  label: Text;
  value: Text;
  /** ok = 걸리는 것 없음(읽은 범위) · look = 볼 것 · unread = 읽지 못함. «문제 있음» 은 쓰지 않는다 */
  level: Level;
  notes: Text[];
  /** 바꾸는 곳·보는 곳(Windows 화면) */
  where: Text;
  link?: string;
}

/** 전원 계획 «무선 어댑터 절전 모드» 값 */
export const POWER_SAVE_TEXT: Record<number, Text> = {
  0: t("최대 성능", "Maximum Performance"),
  1: t("절전 낮음", "Low Power Saving"),
  2: t("절전 보통", "Medium Power Saving"),
  3: t("최대 절전", "Maximum Power Saving"),
};
const psText = (v: number | null): Text => (v == null ? UNREAD : (POWER_SAVE_TEXT[v] ?? t(String(v), String(v))));

const START_TEXT: Record<number, Text> = { 2: t("자동", "automatic"), 3: t("수동", "manual"), 4: t("사용 안 함", "disabled") };
const STATE_TEXT: Record<string, Text> = {
  running: t("실행 중", "running"),
  stopped: t("멈춤", "stopped"),
  starting: t("시작 중", "starting"),
  stopping: t("멈추는 중", "stopping"),
  paused: t("일시 중지", "paused"),
  other: t("알 수 없음", "unknown"),
};
const SERVICE_NAME: Record<string, Text> = {
  bthserv: t("Bluetooth 지원 서비스(bthserv)", "Bluetooth Support Service (bthserv)"),
  BTAGService: t("Bluetooth 오디오 게이트웨이 서비스(BTAGService)", "Bluetooth Audio Gateway Service (BTAGService)"),
  BthAvctpSvc: t("AVCTP 서비스(BthAvctpSvc)", "AVCTP service (BthAvctpSvc)"),
};

const hex4 = (n: number | null) => (n == null ? "—" : n.toString(16).toUpperCase().padStart(4, "0"));
const driverText = (d: WlDriver): Text => {
  const v = [d.provider, d.version].filter(Boolean).join(" ");
  if (!v && !d.date) return t("읽지 못함", "not read");
  const date = d.date ? ` (${fmtTime(d.date, false)})` : "";
  return t(`${v || "—"}${date}`, `${v || "—"}${date}`);
};
const onOff = (v: boolean | null): Text => (v == null ? t("항목 없음(드라이버가 알리지 않음)", "no entry (the driver does not expose it)") : v ? t("켜짐", "on") : t("꺼짐", "off"));
const short = (p: string) => p.replace(/^Microsoft-Windows-/, "");
const sum = (l: { count: number }[]) => l.reduce((a, e) => a + e.count, 0);
const lastOf = (l: { last: number }[]) => l.reduce((a, e) => Math.max(a, e.last), 0);

/** 끊김이 «잦은» 기준 — 기간 평균 일주일에 5번 이상(그리고 5번 이상) */
export function manyDisconnects(total: number, days: number): boolean {
  return total >= Math.max(5, Math.ceil((days * 5) / 7));
}

/** 이벤트 건수 글 «Netwtw14 6062: 3 · 마지막 …» */
function eventText(list: EventCount[], days: number, fmt: (ms: number) => string): Text {
  if (!list.length) return t(`경고·오류 없음(최근 ${days}일)`, `no warnings or errors (last ${days} days)`);
  const parts = list.map((e) => `${short(e.provider)} ${e.id}: ${e.count}`).join(" · ");
  return t(`${parts} · 마지막 ${fmt(lastOf(list))}`, `${parts} · last ${fmt(lastOf(list))}`);
}

/** 블루투스 오디오 장치 이름 → «장치 1» 번호(같은 이름은 같은 번호). 결과 글·JSON 용 */
export function audioAlias(audio: BtAudio[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of audio) if (!m.has(a.name)) m.set(a.name, m.size + 1);
  return m;
}

/** 읽은 값 → 항목들. `fmt` = 시각 글, `mask` = 오디오 장치 이름을 «장치 N» 으로 가릴지(결과 글) */
export function wlItems(w: Wireless, fmt: (ms: number) => string = (ms) => fmtTime(ms), mask = false): WlItem[] {
  const items: WlItem[] = [];
  const add = (x: Omit<WlItem, "notes" | "level"> & { level?: Level; notes?: Text[] }) => {
    const i: WlItem = { level: "ok", notes: [], ...x };
    items.push(i);
    return i;
  };
  const look = (i: WlItem, n: Text) => {
    i.level = worst(i.level, "look");
    i.notes.push(n);
  };
  const failed = !!w.failed;
  const sysUnread = failed || w.errors.some((e) => /(이벤트 로그 System|Event log System)/.test(e));

  // ---------------------------------------------------------------- Wi-Fi
  const wf = w.wifi;
  const many = wf.adapters.length > 1;
  if (!wf.adapters.length) {
    add({
      id: "wifiAdapter",
      group: "wifi",
      label: t("무선 어댑터", "Wireless adapter"),
      value: failed ? UNREAD : t("없음 — 이 PC 에서 Wi-Fi 어댑터를 찾지 못했습니다", "none — no Wi-Fi adapter found on this PC"),
      level: failed ? "unread" : "ok",
      where: t("장치 관리자 → 네트워크 어댑터(USB Wi-Fi 동글이면 꽂혀 있는지)", "Device Manager → Network adapters (for a USB Wi-Fi dongle, check that it is plugged in)"),
    });
  }
  wf.adapters.forEach((a, n) => {
    const sfx = many ? ` — ${a.name}` : "";
    const ad = add({
      id: `wifiAdapter${n || ""}`,
      group: "wifi",
      label: t(`무선 어댑터${sfx}`, `Wireless adapter${sfx}`),
      value: t(`${a.description} · ${a.connected ? "연결됨" : "연결 안 됨"}`, `${a.description} · ${a.connected ? "connected" : "not connected"}`),
      notes: [t("연결된 네트워크 이름(SSID)·신호·채널은 위치 권한이 필요해 읽지 않습니다.", "The connected network name (SSID), signal and channel need location permission, so they are not read.")],
      where: t("설정 → 네트워크 및 인터넷 → Wi-Fi", "Settings → Network & internet → Wi-Fi"),
      link: WIFI_LOCATION_URL,
    });
    if (a.problem) look(ad, t(`장치 관리자 문제 코드 ${a.problem.code} — ${a.problem.meaning.ko}`, `Device Manager problem code ${a.problem.code} — ${a.problem.meaning.en}`));
    add({
      id: `wifiDriver${n || ""}`,
      group: "wifi",
      label: t(`드라이버${sfx}`, `Driver${sfx}`),
      value: driverText(a.driver),
      notes: a.driver.service ? [t(`드라이버 서비스 ${a.driver.service}`, `driver service ${a.driver.service}`)] : [],
      where: t("장치 관리자 → 네트워크 어댑터 → 이 어댑터 → 속성 → 드라이버. 새 드라이버는 PC·어댑터 제조사 지원 페이지에서 받습니다.", "Device Manager → Network adapters → this adapter → Properties → Driver. Get newer drivers from the PC or adapter maker's support page."),
    });
    const dp = add({
      id: `wifiDevicePower${n || ""}`,
      group: "wifi",
      label: t(`장치 절전 «전원 절약을 위해 끌 수 있음»${sfx}`, `Device power saving «Allow the computer to turn off this device»${sfx}`),
      value: onOff(a.canTurnOff),
      where: t("장치 관리자 → 네트워크 어댑터 → 이 어댑터 → 속성 → 전원 관리", "Device Manager → Network adapters → this adapter → Properties → Power Management"),
    });
    if (a.canTurnOff) look(dp, t("켜짐 — 절전 뒤 깨어날 때 Wi-Fi 가 끊기면 끄는 것을 검토합니다(대부분 그대로 둬도 됩니다).", "On — if Wi-Fi drops after waking from sleep, consider turning it off (most PCs are fine as is)."));
  });
  if (wf.adapters.length || wf.powerSaveAc != null) {
    const pp = add({
      id: "wifiPowerPlan",
      group: "wifi",
      label: t("전원 계획 — 무선 어댑터 절전 모드", "Power plan — wireless adapter power saving mode"),
      value: wf.powerSaveAc == null && wf.powerSaveDc == null ? (failed ? UNREAD : t("항목 없음", "no entry")) : t(`전원 연결 ${psText(wf.powerSaveAc).ko} · 배터리 ${psText(wf.powerSaveDc).ko}`, `plugged in ${psText(wf.powerSaveAc).en} · on battery ${psText(wf.powerSaveDc).en}`),
      level: failed ? "unread" : "ok",
      where: t("제어판 → 전원 옵션 → 설정 변경 → 고급 전원 관리 옵션 변경 → 무선 어댑터 설정 → 절전 모드", "Control Panel → Power Options → Change plan settings → Change advanced power settings → Wireless Adapter Settings → Power Saving Mode"),
    });
    if (wf.powerSaveAc != null && wf.powerSaveAc > 0)
      look(pp, t(`전원 연결 상태에서도 «${psText(wf.powerSaveAc).ko}» — 끊김·느려짐이 있으면 «최대 성능» 과 견줘 봅니다(원인으로 단정하지는 않음).`, `«${psText(wf.powerSaveAc).en}» even when plugged in — if Wi-Fi drops or slows, compare with «Maximum Performance» (not proof of a cause).`));
    else if (wf.powerSaveDc != null && wf.powerSaveDc > 0) pp.notes.push(t("배터리일 때만 절전 — 노트북 기본값입니다.", "Power saving on battery only — the laptop default."));
  }
  if (wf.adapters.length || wf.disconnects.length) {
    const total = sum(wf.disconnects);
    const unread = failed || !wf.logRead;
    const dc = add({
      id: "wifiDisconnects",
      group: "wifi",
      label: t("Wi-Fi 끊김 기록 (이벤트 8003)", "Wi-Fi disconnect records (event 8003)"),
      value: unread ? UNREAD : total ? t(`최근 ${w.days}일 ${total}건 · 마지막 ${fmt(lastOf(wf.disconnects))}`, `${total} in the last ${w.days} days · last ${fmt(lastOf(wf.disconnects))}`) : t(`없음(최근 ${w.days}일)`, `none (last ${w.days} days)`),
      level: unread ? "unread" : "ok",
      notes: wf.disconnects.slice(0, 6).map((r) => {
        const why = r.reason || "—";
        const code = r.code != null ? ` (${r.code})` : "";
        return t(`${why}${code} — ${r.count}건, 마지막 ${fmt(r.last)}`, `${why}${code} — ${r.count}, last ${fmt(r.last)}`);
      }),
      where: t("이벤트 뷰어 → 응용 프로그램 및 서비스 로그 → Microsoft → Windows → WLAN-AutoConfig → Operational (이벤트 8003)", "Event Viewer → Applications and Services Logs → Microsoft → Windows → WLAN-AutoConfig → Operational (event 8003)"),
    });
    if (total) dc.notes.push(t("이유 문구는 Windows 가 남긴 그대로(PC 언어)입니다 — 원인이 아니라 증상일 수 있습니다. 직접 끊은 것·절전·유선 연결로 바뀐 것도 끊김으로 남습니다.", "The reason text is what Windows logged (in the PC's language) — it may be a symptom, not the cause. Disconnecting yourself, sleep and switching to a wired connection are logged too."));
    if (!unread && manyDisconnects(total, w.days))
      look(dc, t("끊김이 잦습니다(평균 일주일에 5번 이상) — 가장 많은 이유부터 봅니다. «드라이버에 의해» 가 많으면 드라이버·장치 절전·전원 계획을 봅니다.", "Frequent disconnects (5 or more a week on average) — start with the most common reason. If «by the driver» dominates, look at the driver, device power saving and the power plan."));
  }
  if (wf.adapters.length) {
    const svcs = wf.adapters.map((a) => a.driver.service).filter(Boolean).join(", ");
    const de = add({
      id: "wifiDriverEvents",
      group: "wifi",
      label: t("Wi-Fi 드라이버 경고·오류", "Wi-Fi driver warnings and errors"),
      value: sysUnread ? UNREAD : !svcs ? t("드라이버 서비스 이름을 읽지 못해 찾지 않음", "not searched — driver service name not read") : eventText(wf.driverEvents, w.days, fmt),
      level: sysUnread ? "unread" : "ok",
      where: t(`이벤트 뷰어 → Windows 로그 → 시스템 → «현재 로그 필터링» 에서 원본 ${svcs || "(드라이버 서비스 이름)"}`, `Event Viewer → Windows Logs → System → «Filter Current Log», source ${svcs || "(driver service name)"}`),
    });
    const errs = wf.driverEvents.filter((e) => e.level <= 2);
    if (errs.length) look(de, t(`오류 수준 이벤트 ${sum(errs)}건 — 이벤트 뷰어에서 설명을 봅니다. 드라이버를 제조사 최신판과 견줘 봅니다.`, `${sum(errs)} error-level event(s) — read the descriptions in Event Viewer and compare the driver with the maker's latest.`));
    else if (wf.driverEvents.length) de.notes.push(t("경고 수준만 — 드라이버에 따라 흔히 남습니다.", "Warnings only — common with some drivers."));
  }

  // ---------------------------------------------------------------- 블루투스
  const bt = w.bt;
  if (!bt.radios.length) {
    add({
      id: "btRadio",
      group: "bt",
      label: t("블루투스 어댑터", "Bluetooth adapter"),
      value: failed ? UNREAD : t("없음 — 이 PC 에서 블루투스 라디오를 찾지 못했습니다", "none — no Bluetooth radio found on this PC"),
      level: failed ? "unread" : "ok",
      where: t("설정 → Bluetooth 및 장치 · 장치 관리자 → Bluetooth(USB 동글이면 꽂혀 있는지)", "Settings → Bluetooth & devices · Device Manager → Bluetooth (for a USB dongle, check that it is plugged in)"),
    });
  }
  const manyR = bt.radios.length > 1;
  bt.radios.forEach((r, n) => {
    const sfx = manyR ? ` — ${r.name}` : "";
    const rd = add({
      id: `btRadio${n || ""}`,
      group: "bt",
      label: t(`블루투스 어댑터${sfx}`, `Bluetooth adapter${sfx}`),
      value: t(`${r.name}${r.vid != null ? ` · ${hex4(r.vid)}:${hex4(r.pid)}` : ""} · ${r.started ? "드라이버 시작됨" : "드라이버 시작 안 됨"}`, `${r.name}${r.vid != null ? ` · ${hex4(r.vid)}:${hex4(r.pid)}` : ""} · ${r.started ? "driver started" : "driver not started"}`),
      where: t("설정 → Bluetooth 및 장치 · 장치 관리자 → Bluetooth", "Settings → Bluetooth & devices · Device Manager → Bluetooth"),
    });
    if (r.problem) look(rd, t(`장치 관리자 문제 코드 ${r.problem.code} — ${r.problem.meaning.ko}`, `Device Manager problem code ${r.problem.code} — ${r.problem.meaning.en}`));
    else if (!r.started) look(rd, t("드라이버가 시작되지 않았습니다 — 장치 관리자에서 상태를 봅니다.", "The driver has not started — check its status in Device Manager."));
    add({
      id: `btDriver${n || ""}`,
      group: "bt",
      label: t(`드라이버${sfx}`, `Driver${sfx}`),
      value: driverText(r.driver),
      notes: r.driver.service ? [t(`드라이버 서비스 ${r.driver.service}`, `driver service ${r.driver.service}`)] : [],
      where: t("장치 관리자 → Bluetooth → 이 어댑터 → 속성 → 드라이버. 새 드라이버는 PC·어댑터 제조사 지원 페이지에서 받습니다.", "Device Manager → Bluetooth → this adapter → Properties → Driver. Get newer drivers from the PC or adapter maker's support page."),
      link: BT_DOC_URL,
    });
    const dp = add({
      id: `btDevicePower${n || ""}`,
      group: "bt",
      label: t(`장치 절전 «전원 절약을 위해 끌 수 있음»${sfx}`, `Device power saving «Allow the computer to turn off this device»${sfx}`),
      value: onOff(r.canTurnOff),
      where: t("장치 관리자 → Bluetooth → 이 어댑터 → 속성 → 전원 관리", "Device Manager → Bluetooth → this adapter → Properties → Power Management"),
      link: BT_DOC_URL,
    });
    if (r.canTurnOff) look(dp, t("켜짐 — 블루투스 장치가 자주 끊기면 끄는 것을 검토합니다(Microsoft 안내의 확인 항목).", "On — if Bluetooth devices drop often, consider turning it off (one of the checks in Microsoft's guidance)."));
    if (r.usbPath) {
      const hops = r.usbPath.hops;
      const hubs = hops.filter((h) => h.kind === "hub");
      const chain = (lang: Lang) => hops.map((h) => `${USB_KIND_TEXT[h.kind][lang]}${h.kind === "hub" ? ` ${h.name}` : ""}${h.speed ? ` (${USB_SPEED_TEXT[h.speed][lang]})` : ""}`).join(" → ");
      const up = add({
        id: `btUsbPath${n || ""}`,
        group: "bt",
        label: t(`USB 경로${sfx}`, `USB path${sfx}`),
        value: hops.length ? t(chain("ko"), chain("en")) : t("읽지 못함", "not read"),
        level: hops.length ? "ok" : "unread",
        where: t("동글이면 PC 본체의 다른 USB 포트(USB 2.0)나 짧은 연장선으로 옮겨 봅니다.", "For a dongle, try another USB port on the PC itself (USB 2.0) or a short extension cable."),
      });
      if (hubs.length)
        look(
          up,
          t(
            "USB 허브를 거쳐 붙어 있습니다 — USB 3 허브·장치 근처는 2.4GHz 잡음으로 블루투스가 끊기거나 소리가 끊길 수 있다는 안내가 있습니다(여기서 확인할 수는 없음). 동글을 본체 포트로 옮겨 견줘 봅니다.",
            "Connected through a USB hub — USB 3 hubs and devices nearby are reported to add 2.4 GHz noise that can make Bluetooth drop or stutter (cannot be confirmed from here). Compare with the dongle in a port on the PC itself.",
          ),
        );
    }
  });
  if (bt.radios.length) {
    const main = bt.services.find((s) => s.name === "bthserv");
    const svText = (lang: Lang) =>
      bt.services
        .map((s) => {
          const nm = SERVICE_NAME[s.name]?.[lang] ?? s.name;
          if (!s.found) return `${nm}: ${lang === "ko" ? "없음" : "not present"}`;
          const st = s.state ? STATE_TEXT[s.state][lang] : lang === "ko" ? "읽지 못함" : "not read";
          return `${nm}: ${st}${s.startType != null ? ` · ${START_TEXT[s.startType]?.[lang] ?? s.startType}` : ""}`;
        })
        .join(" / ");
    const svUnread = failed || !bt.services.length;
    const sv = add({
      id: "btService",
      group: "bt",
      label: t("블루투스 서비스", "Bluetooth services"),
      value: svUnread ? UNREAD : t(svText("ko"), svText("en")),
      level: svUnread ? "unread" : "ok",
      where: t("서비스(services.msc) → «Bluetooth 지원 서비스» — 시작 유형은 «수동» 이 Windows 기본입니다(필요할 때 시작).", "Services (services.msc) → «Bluetooth Support Service» — «Manual» is the Windows default (starts when needed)."),
      link: BT_DOC_URL,
    });
    if (main && (!main.found || main.startType === 4 || (main.state && main.state !== "running")))
      look(sv, t("Bluetooth 지원 서비스가 실행 중이 아니거나 «사용 안 함» 입니다 — 블루투스 장치 연결이 안 될 수 있습니다.", "The Bluetooth Support Service is not running or is disabled — Bluetooth devices may fail to connect."));
    const ag = bt.services.find((s) => s.name === "BTAGService");
    if (ag?.found && ag.startType === 4) sv.notes.push(t("오디오 게이트웨이 서비스가 «사용 안 함» — 헤드셋 마이크(핸즈프리 통화)가 안 될 수 있습니다.", "The Audio Gateway service is disabled — headset microphones (hands-free calls) may not work."));
    const unread = failed || !bt.logRead;
    const ev = add({
      id: "btEvents",
      group: "bt",
      label: t("블루투스 경고·오류 (BTHUSB·BTHPORT)", "Bluetooth warnings and errors (BTHUSB, BTHPORT)"),
      value: unread ? UNREAD : eventText(bt.events, w.days, fmt),
      level: unread ? "unread" : "ok",
      notes: [t("정보 수준 이벤트는 세지 않습니다.", "Information-level events are not counted.")],
      where: t("이벤트 뷰어 → Windows 로그 → 시스템 → «현재 로그 필터링» 에서 원본 BTHUSB·BTHPORT", "Event Viewer → Windows Logs → System → «Filter Current Log», sources BTHUSB, BTHPORT"),
    });
    const errs = bt.events.filter((e) => e.level <= 2);
    if (errs.length) look(ev, t(`오류 수준 이벤트 ${sum(errs)}건 — 이벤트 뷰어에서 설명을 봅니다.`, `${sum(errs)} error-level event(s) — read the descriptions in Event Viewer.`));
  }
  if (bt.radios.length || bt.audio.length) {
    const alias = audioAlias(bt.audio);
    const nameOf = (a: BtAudio, lang: Lang) => (mask ? `${lang === "ko" ? "장치" : "Device"} ${alias.get(a.name)}` : a.name);
    const KIND: Record<BtAudio["kind"], Text> = { handsFree: t("핸즈프리(통화용)", "hands-free (calls)"), stereo: t("스테레오", "stereo"), other: t("블루투스", "Bluetooth") };
    const FLOW: Record<BtAudio["flow"], Text> = { render: t("출력", "output"), capture: t("입력", "input") };
    const line = (a: BtAudio, lang: Lang) => {
      const marks = [a.defaultConsole && (lang === "ko" ? "기본 장치" : "default device"), a.defaultComms && (lang === "ko" ? "기본 통신 장치" : "default communication device")].filter(Boolean);
      return `${nameOf(a, lang)} — ${FLOW[a.flow][lang]} · ${KIND[a.kind][lang]}${marks.length ? ` · ${marks.join(", ")}` : ""}`;
    };
    const au = add({
      id: "btAudio",
      group: "bt",
      label: t("블루투스 오디오", "Bluetooth audio"),
      value: failed ? UNREAD : bt.audio.length ? t(`사용 가능한 끝점 ${bt.audio.length}개`, `${bt.audio.length} active endpoint(s)`) : t("연결된 블루투스 오디오 장치 없음", "no Bluetooth audio device connected"),
      level: failed ? "unread" : "ok",
      notes: bt.audio.map((a) => t(line(a, "ko"), line(a, "en"))),
      where: t("설정 → 시스템 → 소리 → 출력 — «헤드폰»(스테레오) 끝점을 고릅니다. 통화 앱의 마이크를 PC 마이크로 바꾸면 헤드셋이 핸즈프리로 바뀌지 않습니다.", "Settings → System → Sound → Output — pick the «Headphones» (stereo) endpoint. Setting the call app's microphone to the PC's own microphone keeps the headset out of hands-free mode."),
    });
    const hfDefault = bt.audio.some((a) => a.kind === "handsFree" && a.flow === "render" && a.defaultConsole);
    if (hfDefault)
      look(au, t("핸즈프리(통화용) 끝점이 기본 출력 장치입니다 — 이 끝점은 모노·낮은 음질입니다. 음악·영상 소리가 나쁘면 스테레오 끝점을 기본으로 고릅니다.", "A hands-free (call) endpoint is the default output — it is mono and lower quality. If music or video sounds poor, make the stereo endpoint the default."));
    else if (bt.audio.some((a) => a.kind === "handsFree"))
      au.notes.push(t("마이크를 쓰는 앱(회의·통화)이 헤드셋 마이크를 열면 헤드셋이 핸즈프리로 바뀌어 소리가 모노·낮은 음질이 됩니다.", "When an app (meetings, calls) opens the headset microphone, the headset switches to hands-free and sound becomes mono and lower quality."));
  }
  return items;
}

/** 카드 머리 — 그 묶음 항목 가운데 가장 무거운 것 */
export function wlVerdict(w: Wireless | null, group: WlGroup): Verdict {
  if (!w) return { level: "unread", notes: [] };
  let level: Level = "ok";
  for (const i of wlItems(w)) if (i.group === group) level = worst(level, i.level);
  return { level, notes: [] };
}

/** 관리자만 읽을 수 있어 읽지 않는 것 */
export const WL_ADMIN_ONLY: Text[] = [t("Windows 무선 보고서(netsh wlan show wlanreport)", "Windows wireless report (netsh wlan show wlanreport)")];

export const WL_CANNOT_SEE: Text[] = [
  t("연결된 네트워크 이름(SSID)·신호 세기·대역·채널·주변 Wi-Fi — Windows 가 위치 권한으로 묶어 두어 읽지 않습니다", "The connected network name (SSID), signal strength, band, channel and nearby Wi-Fi — Windows ties these to location permission, so they are not read"),
  t("공유기·통신사 쪽 상태와 인터넷 속도 — 이 화면은 트래픽을 보내지 않습니다", "The router and provider side, and internet speed — this screen sends no traffic"),
  t("2.4GHz 간섭(전자레인지·USB 3 장치·Wi-Fi 와 블루투스 동시 사용)", "2.4 GHz interference (microwave ovens, USB 3 devices, Wi-Fi and Bluetooth at the same time)"),
  t("헤드셋·이어폰 쪽 배터리·펌웨어·다른 기기와의 연결", "The headset or earbuds' battery, firmware and links to other devices"),
  t("짝지은 블루투스 장치 목록과 주변 장치 — 검색하지 않습니다", "The list of paired Bluetooth devices and nearby devices — no scan is made"),
];

// ---------------------------------------------------------------- 결과 글·JSON

/** 결과 글(복사·저장) — 오디오 장치 이름은 «장치 N» 으로 가린다. 사용자 폴더 경로도 가린다 */
export function wirelessText(lang: Lang, app: string, version: string, w: Wireless): string {
  const ko = lang === "ko";
  const out: string[] = [];
  const lv = (l: Level) => LEVEL_TEXT[l][lang];
  out.push(`# ${app} ${version} — ${fmtTime(Date.now())}`);
  out.push(ko ? `무선(Wi-Fi·블루투스) — 관리자·위치 권한 없이 읽은 값입니다(최근 ${w.days}일). 블루투스 오디오 장치 이름은 가렸습니다.` : `Wireless (Wi-Fi, Bluetooth) — values read without administrator or location permission (last ${w.days} days). Bluetooth audio device names are hidden.`);
  const items = wlItems(w, (ms) => fmtTime(ms), true);
  for (const g of ["wifi", "bt"] as WlGroup[]) {
    out.push("", `## ${WL_GROUP_TEXT[g][lang]} [${lv(wlVerdict(w, g).level)}]`);
    for (const i of items.filter((x) => x.group === g)) {
      out.push(`- ${i.label[lang]}: ${i.value[lang]} [${lv(i.level)}]`);
      for (const n of i.notes) out.push(`  - ${n[lang]}`);
    }
  }
  if (w.errors.length) out.push("", `${ko ? "읽지 못함" : "Not read"}: ${w.errors.join(" / ")}`);
  out.push("", ko ? "관리자만 읽을 수 있음 — 읽지 않음:" : "Administrator only — not read:");
  for (const c of WL_ADMIN_ONLY) out.push(`- ${c[lang]}`);
  out.push("", ko ? "PC 가 볼 수 없는 것(무선):" : "What the PC cannot see (wireless):");
  for (const c of WL_CANNOT_SEE) out.push(`- ${c[lang]}`);
  return hideUserPaths(out.join("\n")) + "\n";
}

/** JSON(모든 값) — 오디오 장치 이름은 «device-N» 으로 바꾼다. 사용자 폴더 경로도 가린다 */
export function wirelessJson(app: string, version: string, w: Wireless): string {
  const alias = audioAlias(w.bt.audio);
  const safe = { ...w, bt: { ...w.bt, audio: w.bt.audio.map((a) => ({ ...a, name: `device-${alias.get(a.name)}` })) } };
  return hideUserPaths(JSON.stringify({ app, version, wireless: safe, exportedAt: new Date().toISOString() }, null, 2)) + "\n";
}
