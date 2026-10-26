// 이 PC 점검(Port Inspector «이 PC» 카드) — 장비 PC 로 쓸 때 볼 설정(빠른 시작·절전·업데이트·재시작 대기·화면 보호기·시간 동기화)과
// 최근 기록(예기치 않은 종료·하드웨어 오류)을 «문제 없음(읽은 범위) / 볼 것 / 읽지 못함» 으로 나누는 순수 함수와 결과 글.
// 정답은 현장마다 다르다 — 사무용 PC 엔 켜 두는 게 맞는 값(업데이트·절전)이 대부분이라, 설정 값은 «장비 PC» 를 고른 뒤에만 «볼 것» 을 붙인다.
// «문제 있음» 은 쓰지 않는다. 업데이트를 끄라고 권하지 않는다. 바꾸기는 하지 않는다(바꾸는 곳 안내만).
import type { Level, Text, Verdict } from "./portinfo.ts";

// ---------------------------------------------------------------- 백엔드 모양(crates/core/src/portinfo/mod.rs PcCheck)

export type PcPowerId = "sleep" | "hibernate" | "display" | "aspm" | "usbSuspend";
export interface PcPowerValue {
  id: PcPowerId;
  ac: number | null;
  dc: number | null;
}
export interface PcUpdate {
  noAutoUpdate: number | null;
  auOptions: number | null;
  noAutoReboot: number | null;
  alwaysAutoReboot: number | null;
  excludeDrivers: number | null;
  policyActiveHours: [number, number] | null;
  activeHours: [number, number] | null;
  smartActiveHours: number | null;
}
export interface PcTime {
  type: string | null;
  ntpServer: string | null;
  policy: boolean;
  serviceStart: number | null;
}
export interface PcScreenSaver {
  active: boolean | null;
  program: string | null;
  timeout: number | null;
  secure: boolean | null;
}
export interface PcEventCount {
  group: "unexpected" | "hardware" | "time";
  provider: string;
  id: number;
  level: number;
  count: number;
  last: number;
}
export type RebootFlag = "windowsUpdate" | "servicing" | "fileRename";
export interface PcCheck {
  readAt: number;
  days: number;
  fastStartup: boolean | null;
  hibernateEnabled: boolean | null;
  scheme: string | null;
  power: PcPowerValue[];
  update: PcUpdate;
  rebootPending: RebootFlag[];
  screenSaver: PcScreenSaver;
  time: PcTime;
  events: PcEventCount[];
  errors: string[];
  /** 화면 쪽 — 백엔드 호출 자체가 실패함(값을 하나도 못 읽음) */
  failed?: boolean;
}

/** 백엔드 호출이 실패했을 때 보일 빈 결과(모든 항목 «읽지 못함») */
export function pcFailed(days: number, message: string): PcCheck {
  return {
    readAt: Date.now(),
    days,
    fastStartup: null,
    hibernateEnabled: null,
    scheme: null,
    power: [],
    update: { noAutoUpdate: null, auOptions: null, noAutoReboot: null, alwaysAutoReboot: null, excludeDrivers: null, policyActiveHours: null, activeHours: null, smartActiveHours: null },
    rebootPending: [],
    screenSaver: { active: null, program: null, timeout: null, secure: null },
    time: { type: null, ntpServer: null, policy: false, serviceStart: null },
    events: [],
    errors: [message],
    failed: true,
  };
}

// ---------------------------------------------------------------- 용도·항목

export type PcPurpose = "general" | "equipment";
export const PC_PURPOSES: PcPurpose[] = ["general", "equipment"];

const t = (ko: string, en: string): Text => ({ ko, en });
const rank: Record<Level, number> = { ok: 0, unread: 1, look: 2, problem: 3 };
const worst = (a: Level, b: Level): Level => (rank[b] > rank[a] ? b : a);

export const PC_PURPOSE_TEXT: Record<PcPurpose, Text> = {
  general: t("일반 PC", "General PC"),
  equipment: t("장비 PC (오래 켜 둠)", "Equipment PC (runs for long periods)"),
};

/** Microsoft Learn «Configure policy settings on IoT devices» — 업데이트 재시작·사용 시간·빠른 시작 등을 장비용으로 다룬 공식 문서 */
export const IOT_POLICY_URL = "https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/iot-ent-configure-policy-settings";

export type PcGroup = "power" | "update" | "screen" | "events";
export const PC_GROUP_TEXT: Record<PcGroup, Text> = {
  power: t("전원·절전", "Power and sleep"),
  update: t("업데이트·재시작", "Updates and restarts"),
  screen: t("화면 보호기·시간", "Screen saver and time"),
  events: t("최근 기록", "Recent records"),
};

export interface PcItem {
  id: string;
  group: PcGroup;
  label: Text;
  value: Text;
  /** ok = 걸리는 것 없음(읽은 범위) · look = 볼 것 · unread = 읽지 못함. «문제 있음» 은 쓰지 않는다 */
  level: Level;
  notes: Text[];
  /** 바꾸는 곳·보는 곳(Windows 화면) */
  where: Text;
  link?: string;
}

// ---------------------------------------------------------------- 값 글

/** 초 → «15분»·«안 함» */
export function dur(sec: number | null | undefined): Text {
  if (sec == null) return t("읽지 못함", "not read");
  if (sec === 0) return t("안 함", "never");
  if (sec < 60) return t(`${sec}초`, `${sec} s`);
  if (sec < 3600) return t(`${Math.round(sec / 60)}분`, `${Math.round(sec / 60)} min`);
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return t(`${h}시간${m ? ` ${m}분` : ""}`, `${h} h${m ? ` ${m} min` : ""}`);
}

const join = (parts: Text[], sep = " · "): Text => t(parts.map((p) => p.ko).join(sep), parts.map((p) => p.en).join(sep));
const acdc = (ac: Text, dc: Text): Text => t(`전원 연결 ${ac.ko} · 배터리 ${dc.ko}`, `plugged in ${ac.en} · on battery ${dc.en}`);
const hourText = ([s, e]: [number, number]): Text => t(`${s}시–${e}시`, `${s}:00–${e}:00`);
const UNREAD = t("읽지 못함", "not read");

export const power = (pc: PcCheck, id: PcPowerId) => pc.power.find((p) => p.id === id) ?? null;

const ASPM_TEXT: Record<number, Text> = { 0: t("해제", "off"), 1: t("보통 절전", "moderate power savings"), 2: t("최대 절전", "maximum power savings") };
const aspmText = (v: number | null): Text => (v == null ? UNREAD : (ASPM_TEXT[v] ?? t(String(v), String(v))));
const usbText = (v: number | null): Text => (v == null ? UNREAD : v ? t("사용", "enabled") : t("사용 안 함", "disabled"));

const AU_TEXT: Record<number, Text> = {
  2: t("다운로드 전에 알림", "notify before download"),
  3: t("자동 다운로드, 설치는 알림", "auto download, notify to install"),
  4: t("자동 다운로드·예약 설치", "auto download and schedule install"),
  5: t("로컬 관리자가 고름", "local admin chooses"),
  7: t("자동 다운로드, 설치·재시작은 알림", "auto download, notify to install and restart"),
};

const TIME_TYPE: Record<string, Text> = {
  NTP: t("NTP 서버", "NTP server"),
  NT5DS: t("도메인(회사 네트워크)", "domain hierarchy"),
  AllSync: t("도메인·NTP 모두", "domain and NTP"),
  NoSync: t("동기화 안 함", "no sync"),
};
const START_TEXT: Record<number, Text> = { 2: t("자동", "automatic"), 3: t("수동(필요할 때 시작)", "manual (trigger start)"), 4: t("사용 안 함", "disabled") };

/** 업데이트 뒤 자동 재시작을 정책이 막는지 — 자동 업데이트 끔·AUOptions 2/3/7(설치를 사용자가)·로그인 중 자동 재시작 안 함 */
export function restartLimited(u: PcUpdate): boolean {
  return u.noAutoUpdate === 1 || [2, 3, 7].includes(u.auOptions ?? -1) || u.noAutoReboot === 1;
}

const providerShort = (p: string) => p.replace(/^Microsoft-Windows-/, "");
const sum = (list: PcEventCount[]) => list.reduce((a, e) => a + e.count, 0);
const lastOf = (list: PcEventCount[]) => list.reduce((a, e) => Math.max(a, e.last), 0);

/** 이벤트 로그를 읽지 못했는지 */
export const eventsUnread = (pc: PcCheck) => !!pc.failed || pc.errors.some((e) => /System/.test(e) && /(이벤트 로그|Event log)/.test(e));

// ---------------------------------------------------------------- 항목 판정

/** 읽은 값 → 항목들. `fmtTime` = 시각 글(portinfo.ts fmtTime 을 넘긴다) */
export function pcItems(pc: PcCheck, purpose: PcPurpose, fmtTime: (ms: number) => string): PcItem[] {
  const eq = purpose === "equipment";
  const items: PcItem[] = [];
  const add = (x: Omit<PcItem, "notes" | "level"> & { level?: Level; notes?: Text[] }) => items.push({ level: "ok", notes: [], ...x });
  const look = (i: PcItem, n: Text) => {
    i.level = worst(i.level, "look");
    i.notes.push(n);
  };
  const last = () => items[items.length - 1];

  // ---- 전원
  const hibOff = pc.hibernateEnabled === false;
  add({
    id: "fastStartup",
    group: "power",
    label: t("빠른 시작", "Fast startup"),
    value: pc.fastStartup == null ? UNREAD : pc.fastStartup ? (hibOff ? t("켜짐 — 최대 절전이 꺼져 있어 쓰이지 않음", "on — not in effect because hibernation is off") : t("켜짐", "on")) : t("꺼짐", "off"),
    level: pc.fastStartup == null ? "unread" : "ok",
    where: t("제어판 → 전원 옵션 → 전원 단추 작동 설정 → «현재 사용할 수 없는 설정 변경» → «빠른 시작 켜기»(관리자 권한)", "Control Panel → Power Options → Choose what the power buttons do → «Change settings that are currently unavailable» → «Turn on fast startup» (administrator)"),
    link: IOT_POLICY_URL,
  });
  if (eq && pc.fastStartup && !hibOff)
    look(
      last(),
      t(
        "빠른 시작 켜짐 — «시스템 종료» 뒤 켜도 Windows 커널·드라이버가 처음부터 다시 시작되지 않습니다(«다시 시작» 은 처음부터). 장비 PC 라면 끄는 것을 검토합니다. 큰 업데이트 뒤 다시 켜질 수 있습니다.",
        "Fast startup on — after «Shut down», the Windows kernel and drivers do not start fresh on the next power-on («Restart» does). On an equipment PC, consider turning it off. A major update may turn it back on.",
      ),
    );

  const sleep = power(pc, "sleep");
  add({
    id: "sleep",
    group: "power",
    label: t("절전 모드까지", "Sleep after"),
    value: sleep ? acdc(dur(sleep.ac), dur(sleep.dc)) : UNREAD,
    level: sleep?.ac == null ? "unread" : "ok",
    where: t("설정 → 시스템 → 전원(및 배터리) → «화면 및 절전»", "Settings → System → Power (& battery) → «Screen and sleep»"),
  });
  if (eq && sleep?.ac)
    look(
      last(),
      t(
        `전원 연결 상태에서 ${dur(sleep.ac).ko} 동안 입력이 없으면 절전 모드로 들어갑니다 — 절전 중에는 프로그램·통신이 멈춥니다. 장비 PC 라면 «안 함» 을 검토합니다.`,
        `Plugged in, the PC sleeps after ${dur(sleep.ac).en} without input — programs and communication stop while asleep. On an equipment PC, consider «Never».`,
      ),
    );

  const hib = power(pc, "hibernate");
  add({
    id: "hibernate",
    group: "power",
    label: t("최대 절전 모드까지", "Hibernate after"),
    value: hib ? (hibOff ? t(`${acdc(dur(hib.ac), dur(hib.dc)).ko} (최대 절전 꺼짐)`, `${acdc(dur(hib.ac), dur(hib.dc)).en} (hibernation off)`) : acdc(dur(hib.ac), dur(hib.dc))) : UNREAD,
    level: hib?.ac == null ? "unread" : "ok",
    where: t("제어판 → 전원 옵션 → 설정 변경 → 고급 전원 관리 옵션 변경 → 절전 → «다음 시간 이후에 최대 절전 모드로 전환»", "Control Panel → Power Options → Change plan settings → Change advanced power settings → Sleep → «Hibernate after»"),
  });
  if (eq && hib?.ac && !hibOff)
    look(
      last(),
      t(`전원 연결 상태에서 ${dur(hib.ac).ko} 뒤 최대 절전 모드로 들어갑니다 — 프로그램·통신이 멈춥니다.`, `Plugged in, the PC hibernates after ${dur(hib.ac).en} — programs and communication stop.`),
    );

  const disp = power(pc, "display");
  add({
    id: "display",
    group: "power",
    label: t("화면 끄기까지", "Turn off display after"),
    value: disp ? acdc(dur(disp.ac), dur(disp.dc)) : UNREAD,
    level: disp?.ac == null ? "unread" : "ok",
    notes: disp?.ac ? [t("화면만 꺼지고 프로그램은 계속 돕니다.", "Only the screen turns off; programs keep running.")] : [],
    where: t("설정 → 시스템 → 전원(및 배터리) → «화면 및 절전»", "Settings → System → Power (& battery) → «Screen and sleep»"),
  });

  const aspm = power(pc, "aspm");
  add({
    id: "aspm",
    group: "power",
    label: t("PCI Express 링크 상태 전원 관리", "PCI Express Link State Power Management"),
    value: aspm ? acdc(aspmText(aspm.ac), aspmText(aspm.dc)) : UNREAD,
    level: aspm?.ac == null ? "unread" : "ok",
    where: t("제어판 → 전원 옵션 → 설정 변경 → 고급 전원 관리 옵션 변경 → PCI Express → 링크 상태 전원 관리", "Control Panel → Power Options → Change plan settings → Change advanced power settings → PCI Express → Link State Power Management"),
  });
  if (eq && aspm?.ac)
    look(
      last(),
      t("PCIe 장치(랜카드·확장 카드)가 쉬는 동안 링크 전원을 줄입니다 — 장비를 PCIe 카드로 잇는다면 «해제» 와 견줘 봅니다(원인으로 단정하지는 않음).", "PCIe devices (network and add-in cards) reduce link power when idle — if equipment connects through a PCIe card, compare with «Off» (not proof of a cause)."),
    );

  const usb = power(pc, "usbSuspend");
  add({
    id: "usbSuspend",
    group: "power",
    label: t("USB 선택적 절전", "USB selective suspend"),
    value: usb ? acdc(usbText(usb.ac), usbText(usb.dc)) : UNREAD,
    level: usb?.ac == null ? "unread" : "ok",
    where: t("제어판 → 전원 옵션 → 설정 변경 → 고급 전원 관리 옵션 변경 → USB 설정 → USB 선택적 절전 설정", "Control Panel → Power Options → Change plan settings → Change advanced power settings → USB settings → USB selective suspend setting"),
  });
  if (eq && usb?.ac)
    look(last(), t("USB 선택적 절전 사용 — USB 변환기·장치가 가끔 끊기면 «사용 안 함» 을 검토합니다(원인으로 단정하지는 않음).", "USB selective suspend enabled — if USB adapters or devices drop now and then, consider «Disabled» (not proof of a cause)."));

  // ---- 업데이트·재시작
  const u = pc.update;
  const pol: Text[] = [];
  if (u.noAutoUpdate === 1) pol.push(t("자동 업데이트 끔", "automatic updates off"));
  if (u.auOptions != null) pol.push(t(`AUOptions ${u.auOptions}${AU_TEXT[u.auOptions] ? ` — ${AU_TEXT[u.auOptions].ko}` : ""}`, `AUOptions ${u.auOptions}${AU_TEXT[u.auOptions] ? ` — ${AU_TEXT[u.auOptions].en}` : ""}`));
  if (u.noAutoReboot === 1) pol.push(t("로그인한 사용자가 있으면 자동 재시작 안 함", "no auto-restart with logged-on users"));
  if (u.alwaysAutoReboot === 1) pol.push(t("예약 시각에 늘 자동 재시작", "always auto-restart at the scheduled time"));
  if (u.excludeDrivers === 1) pol.push(t("드라이버는 업데이트에서 뺌", "drivers excluded from updates"));
  add({
    id: "updatePolicy",
    group: "update",
    label: t("업데이트 정책", "Update policy"),
    value: pc.failed ? UNREAD : pol.length ? join(pol) : t("정책 없음(Windows 기본)", "no policy (Windows default)"),
    level: pc.failed ? "unread" : "ok",
    where: t(
      "설정 → Windows 업데이트 → 고급 옵션. 정책은 그룹 정책 편집기(gpedit.msc) → 컴퓨터 구성 → 관리 템플릿 → Windows 구성 요소 → Windows 업데이트(Pro 이상·관리자 권한)",
      "Settings → Windows Update → Advanced options. Policies: Group Policy Editor (gpedit.msc) → Computer Configuration → Administrative Templates → Windows Components → Windows Update (Pro or later, administrator)",
    ),
    link: IOT_POLICY_URL,
  });
  if (u.noAutoUpdate === 1) last().notes.push(t("자동 업데이트가 정책으로 꺼져 있습니다 — 보안 업데이트를 따로 챙기는지 봅니다.", "Automatic updates are turned off by policy — check that security updates are handled another way."));
  if (eq && !pc.failed && !restartLimited(u))
    look(
      last(),
      t(
        "업데이트 뒤 자동 재시작을 막는 정책이 없습니다 — 사용 시간 밖에서 PC 가 스스로 다시 시작할 수 있습니다. 장비가 도는 시간이 사용 시간 안에 드는지 봅니다(업데이트를 끄라는 뜻은 아닙니다).",
        "No policy holds back automatic restarts after updates — the PC may restart by itself outside active hours. Check that the hours the equipment runs fall inside active hours (this is not advice to turn updates off).",
      ),
    );

  const ah = u.policyActiveHours ?? u.activeHours;
  add({
    id: "activeHours",
    group: "update",
    label: t("사용 시간(활동 시간)", "Active hours"),
    value: ah
      ? t(`${hourText(ah).ko}${u.policyActiveHours ? " (정책)" : u.smartActiveHours === 1 ? " (자동 조정)" : ""}`, `${hourText(ah).en}${u.policyActiveHours ? " (policy)" : u.smartActiveHours === 1 ? " (adjusted automatically)" : ""}`)
      : pc.failed
        ? UNREAD
        : t("값 없음(Windows 기본)", "no value (Windows default)"),
    level: pc.failed ? "unread" : "ok",
    notes: [t("이 시간 안에는 업데이트 때문에 자동으로 다시 시작하지 않습니다.", "Windows does not restart automatically for updates during these hours.")],
    where: t("설정 → Windows 업데이트 → 고급 옵션 → 사용 시간", "Settings → Windows Update → Advanced options → Active hours"),
    link: IOT_POLICY_URL,
  });

  const rp = pc.rebootPending;
  const strong = rp.filter((f) => f !== "fileRename");
  const RP: Record<RebootFlag, Text> = {
    windowsUpdate: t("Windows 업데이트(RebootRequired)", "Windows Update (RebootRequired)"),
    servicing: t("구성 요소 설치(RebootPending)", "component servicing (RebootPending)"),
    fileRename: t("다음 시작 때 파일 바꾸기 예약(PendingFileRenameOperations)", "file replace scheduled at next start (PendingFileRenameOperations)"),
  };
  add({
    id: "rebootPending",
    group: "update",
    label: t("재시작 대기", "Restart pending"),
    value: pc.failed ? UNREAD : rp.length ? join(rp.map((f) => RP[f])) : t("없음", "none"),
    level: pc.failed ? "unread" : "ok",
    where: t("시작 → 전원 → «업데이트 및 다시 시작» 을 장비를 멈춰도 되는 때에 합니다.", "Start → Power → «Update and restart» at a time the equipment can stop."),
  });
  if (strong.length) {
    const n = t("업데이트·구성 요소 설치가 재시작을 기다립니다 — 예정에 없던 재시작이 올 수 있습니다. 장비를 멈춰도 되는 때에 직접 다시 시작합니다.", "An update or component install is waiting for a restart — an unplanned restart may come. Restart yourself at a time the equipment can stop.");
    if (eq) look(last(), n);
    else last().notes.push(n);
  } else if (rp.includes("fileRename")) last().notes.push(t("설치 프로그램이 다음 시작 때 파일을 바꾸도록 예약해 둔 것 — 흔합니다.", "An installer scheduled files to be replaced at the next start — common."));

  // ---- 화면 보호기·시간
  const ss = pc.screenSaver;
  const ssOn = ss.active !== false && !!ss.program;
  add({
    id: "screenSaver",
    group: "screen",
    label: t("화면 보호기", "Screen saver"),
    level: pc.failed ? "unread" : "ok",
    value: pc.failed ? UNREAD : ss.active == null && !ss.program ? t("값 없음(고른 화면 보호기 없음)", "no value (none chosen)") : !ssOn ? t("없음", "none") : join([t(ss.program ?? "", ss.program ?? ""), t(`${dur(ss.timeout).ko} 뒤`, `after ${dur(ss.timeout).en}`), ...(ss.secure ? [t("다시 시작할 때 로그온 화면", "on resume, display logon screen")] : [])]),
    notes: ssOn ? [t(ss.secure ? "화면 보호기는 화면만 가립니다. 끝날 때 로그온 화면이 나와 잠깁니다." : "화면 보호기는 화면만 가리고 프로그램은 계속 돕니다.", ss.secure ? "The screen saver only covers the screen; when it ends the logon screen appears (locked)." : "The screen saver only covers the screen; programs keep running.")] : [],
    where: t("설정 → 개인 설정 → 잠금 화면 → 화면 보호기", "Settings → Personalization → Lock screen → Screen saver"),
  });

  const tm = pc.time;
  const timeEv = pc.events.filter((e) => e.group === "time");
  const synced = timeEv.filter((e) => e.id === 35 || e.id === 37);
  const warns = timeEv.filter((e) => e.level >= 1 && e.level <= 3);
  const evUnread = eventsUnread(pc);
  const tv: Text[] = [tm.type ? (TIME_TYPE[tm.type] ?? t(tm.type, tm.type)) : UNREAD];
  if (tm.ntpServer && tm.type !== "NT5DS" && tm.type !== "NoSync") tv.push(t(tm.ntpServer, tm.ntpServer));
  if (tm.policy) tv.push(t("정책", "policy"));
  if (tm.serviceStart != null) tv.push(t(`서비스 ${START_TEXT[tm.serviceStart]?.ko ?? tm.serviceStart}`, `service ${START_TEXT[tm.serviceStart]?.en ?? tm.serviceStart}`));
  add({
    id: "time",
    group: "screen",
    label: t("시간 동기화(W32Time)", "Time sync (W32Time)"),
    value: join(tv),
    level: tm.type == null && tm.serviceStart == null ? "unread" : "ok",
    where: t("설정 → 시간 및 언어 → 날짜 및 시간 → «자동으로 시간 설정»·«지금 동기화»", "Settings → Time & language → Date & time → «Set time automatically» and «Sync now»"),
  });
  if (!evUnread) {
    last().notes.push(
      synced.length
        ? t(`마지막 «시간 원본과 동기화» 기록(이벤트 35·37): ${fmtTime(lastOf(synced))}`, `Last «synchronizing with time source» record (events 35, 37): ${fmtTime(lastOf(synced))}`)
        : t(`최근 ${pc.days}일 «시간 원본과 동기화» 기록(이벤트 35·37) 없음 — 이 기록은 원본이 바뀔 때만 남기도 합니다.`, `No «synchronizing with time source» record (events 35, 37) in the last ${pc.days} days — it may only be logged when the source changes.`),
    );
  }
  if (eq && (tm.type === "NoSync" || tm.serviceStart === 4))
    look(last(), t("PC 시계가 자동으로 맞춰지지 않습니다 — 기록 시각이 장비·다른 PC 와 어긋날 수 있습니다. 장비망에 시간 서버가 있는지 봅니다.", "The PC clock is not synced automatically — log times may drift from equipment and other PCs. Check whether the equipment network has a time server."));
  if (warns.length) {
    const n = t(`기간 안에 시간 서비스 경고 ${sum(warns)}건(마지막 ${fmtTime(lastOf(warns))}) — 시간 서버에 닿지 않을 수 있습니다(인터넷이 없는 장비망에서 흔함).`, `${sum(warns)} time service warning(s) in this period (last ${fmtTime(lastOf(warns))}) — the time server may be unreachable (common on equipment networks without internet).`);
    if (eq) look(last(), n);
    else last().notes.push(n);
  }

  // ---- 최근 기록
  const unexpected = pc.events.filter((e) => e.group === "unexpected");
  const hw = pc.events.filter((e) => e.group === "hardware");
  const countText = (list: PcEventCount[]): Text => {
    if (!list.length) return t(`없음(최근 ${pc.days}일)`, `none (last ${pc.days} days)`);
    const parts = list.map((e) => `${providerShort(e.provider)} ${e.id}: ${e.count}`).join(" · ");
    return t(`${parts} · 마지막 ${fmtTime(lastOf(list))}`, `${parts} · last ${fmtTime(lastOf(list))}`);
  };
  add({
    id: "unexpected",
    group: "events",
    label: t("예기치 않은 종료", "Unexpected shutdowns"),
    value: evUnread ? UNREAD : countText(unexpected),
    level: evUnread ? "unread" : "ok",
    where: t("이벤트 뷰어 → Windows 로그 → 시스템(원본 Kernel-Power·EventLog) · 신뢰성 기록(제어판 → 보안 및 유지 관리 → 신뢰성 기록 보기)", "Event Viewer → Windows Logs → System (sources Kernel-Power, EventLog) · Reliability history (Control Panel → Security and Maintenance → View reliability history)"),
  });
  if (unexpected.length)
    look(
      last(),
      t(
        `최근 ${pc.days}일 예기치 않은 종료 기록 ${sum(unexpected)}건 — 정전·전원 버튼 길게 누름·멈춘 뒤 강제 종료 가운데 무엇인지 PC 는 모릅니다. 한 번의 종료가 41·6008 둘 다 남기기도 합니다.`,
        `${sum(unexpected)} unexpected shutdown record(s) in the last ${pc.days} days — the PC cannot tell a power cut, a long press of the power button or a forced power-off after a hang apart. One shutdown often leaves both 41 and 6008.`,
      ),
    );
  add({
    id: "hardware",
    group: "events",
    label: t("하드웨어 경고·오류 (WHEA-Logger·disk·Ntfs)", "Hardware warnings and errors (WHEA-Logger, disk, Ntfs)"),
    value: evUnread ? UNREAD : countText(hw),
    level: evUnread ? "unread" : "ok",
    where: t("이벤트 뷰어 → Windows 로그 → 시스템 → «현재 로그 필터링» 에서 원본 WHEA-Logger·disk·Ntfs", "Event Viewer → Windows Logs → System → «Filter Current Log», sources WHEA-Logger, disk, Ntfs"),
  });
  if (hw.length)
    look(
      last(),
      t(`최근 ${pc.days}일 하드웨어 경고·오류 이벤트 ${sum(hw)}건 — 이벤트 뷰어에서 설명을 봅니다. 하나만으로 고장이라 단정하지 않습니다.`, `${sum(hw)} hardware warning/error event(s) in the last ${pc.days} days — read the descriptions in Event Viewer. One event alone is not proof of a fault.`),
    );
  return items;
}

/** 카드 머리 — 항목 가운데 가장 무거운 것 */
export function pcVerdict(pc: PcCheck | null, purpose: PcPurpose, fmtTime: (ms: number) => string = String): Verdict {
  if (!pc) return { level: "unread", notes: [] };
  let level: Level = "ok";
  for (const i of pcItems(pc, purpose, fmtTime)) level = worst(level, i.level);
  return { level, notes: [] };
}

/** 관리자만 읽을 수 있어 읽지 않는 것 */
export const PC_ADMIN_ONLY: Text[] = [
  t("절전을 막고 있는 프로그램·드라이버(powercfg /requests)", "Programs and drivers keeping the PC awake (powercfg /requests)"),
  t("Microsoft Defender 검사 예외 목록", "Microsoft Defender exclusion list"),
  t("디스크 SMART·신뢰성 카운터(온도·마모)", "Disk SMART and reliability counters (temperature, wear)"),
];

export const PC_CANNOT_SEE: Text[] = [
  t("BIOS/UEFI 설정(정전 뒤 자동 켜짐·CPU 절전 등)", "BIOS/UEFI settings (power-on after power loss, CPU power saving …)"),
  t("예기치 않은 종료의 원인(정전·전원 버튼·멈춤)과 UPS 상태", "The cause of an unexpected shutdown (power cut, power button, hang) and UPS state"),
  t("그룹 정책·관리 도구가 나중에 바꿀 값, 다음 업데이트가 언제 재시작할지", "Values a group policy or management tool will change later, and when the next update will restart"),
  t("그룹 정책으로 정한 전원 값 — 이 화면은 지금 전원 계획의 값을 읽습니다", "Power values set by group policy — this screen reads the current power plan"),
];

/** 결과 글(복사·저장)의 «이 PC» 부분. `v` = 판정을 «[볼 것] …» 으로 바꾸는 함수(portinfo.ts bundleText 가 넘긴다) */
export function pcLines(lang: "ko" | "en", pc: PcCheck, purpose: PcPurpose, v: (x: Verdict) => string, fmtTime: (ms: number) => string, levelText: (l: Level) => string): string[] {
  const ko = lang === "ko";
  const out: string[] = [];
  out.push(`${ko ? "용도" : "Use"}: ${PC_PURPOSE_TEXT[purpose][lang]}`);
  out.push(v(pcVerdict(pc, purpose, fmtTime)));
  if (pc.scheme) out.push(`${ko ? "전원 계획" : "Power plan"}: ${pc.scheme}`);
  let group: PcGroup | null = null;
  for (const i of pcItems(pc, purpose, fmtTime)) {
    if (i.group !== group) {
      group = i.group;
      out.push("", `### ${PC_GROUP_TEXT[group][lang]}`);
    }
    out.push(`- ${i.label[lang]}: ${i.value[lang]} [${levelText(i.level)}]`);
    for (const n of i.notes) out.push(`  - ${n[lang]}`);
  }
  if (pc.errors.length) out.push(`${ko ? "읽지 못함" : "Not read"}: ${pc.errors.join(" / ")}`);
  out.push("", ko ? "관리자만 읽을 수 있음 — 읽지 않음:" : "Administrator only — not read:");
  for (const c of PC_ADMIN_ONLY) out.push(`- ${c[lang]}`);
  out.push("", ko ? "PC 가 볼 수 없는 것(이 PC 설정):" : "What the PC cannot see (PC settings):");
  for (const c of PC_CANNOT_SEE) out.push(`- ${c[lang]}`);
  return out;
}
