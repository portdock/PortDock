// (0.10.0) 노출 점검 — 같은 망의 누구나 닿을 수 있는 포트·설정을 «문제 없음(읽은 범위) / 볼 것» 으로만 나눈다. 고치기는 하지 않는다(바꾸는 곳 안내만).
// - Net Scan: 찾은 장비의 열린 포트(이미 확인한 것만) 가운데 인증 없는 산업 프로토콜·평문 관리 포트 → 안내 칸
// - Port Inspector «이 PC»: 원격 데스크톱·SMBv1·방화벽·0.0.0.0 에 연 포트·자동 로그온·자동 실행(crates/core/src/portinfo/exposure.rs 가 읽은 값)
// React·Tauri 없는 부분(시험: node --test shared/exposure.test.ts)
import type { Level, Text } from "./portinfo.ts";
import type { PcItem } from "./pcCheck.ts";

const t = (ko: string, en: string): Text => ({ ko, en });

// ---------------------------------------------------------------- 포트

/** 노출 종류 — noAuth: 인증 없는 산업 프로토콜 · opcua: 보안 모드가 «None» 일 수 있음 · plain: 평문 로그인(Telnet·FTP·VNC) · web: 관리 웹 페이지(HTTP) */
export type ExposeKind = "noAuth" | "opcua" | "plain" | "web";

export interface ExposePort {
  port: number;
  name: string;
  kind: ExposeKind;
}

/** 안내할 포트 — Net Scan 은 이미 확인한 포트 가운데서만 고른다(새로 더 스캔하지 않음) */
export const EXPOSE_PORTS: ExposePort[] = [
  { port: 502, name: "Modbus TCP", kind: "noAuth" },
  { port: 5006, name: "MC protocol (SLMP)", kind: "noAuth" },
  { port: 5007, name: "MC protocol (SLMP)", kind: "noAuth" },
  { port: 44818, name: "EtherNet/IP", kind: "noAuth" },
  { port: 102, name: "S7 (ISO-TSAP)", kind: "noAuth" },
  { port: 2404, name: "IEC 60870-5-104", kind: "noAuth" },
  { port: 20000, name: "DNP3", kind: "noAuth" },
  // (0.11.0) UDP — Net Scan «방송으로 찾기» 에 답한 장치만(TCP 포트 확인에는 없음)
  { port: 47808, name: "BACnet/IP", kind: "noAuth" },
  { port: 4840, name: "OPC UA", kind: "opcua" },
  { port: 23, name: "Telnet", kind: "plain" },
  { port: 21, name: "FTP", kind: "plain" },
  { port: 5900, name: "VNC", kind: "plain" },
  { port: 80, name: "HTTP", kind: "web" },
];

const byPort = new Map(EXPOSE_PORTS.map((p) => [p.port, p]));
export const exposeOf = (port: number) => byPort.get(port) ?? null;

/** 열린 포트 → 안내할 것(포트 순, 중복 없음) */
export function exposedPorts(ports: number[]): ExposePort[] {
  return [...new Set(ports)]
    .sort((a, b) => a - b)
    .map(exposeOf)
    .filter((p): p is ExposePort => !!p);
}

const KIND_TEXT: Record<ExposeKind, Text> = {
  noAuth: t("산업 프로토콜 열림 — 같은 망의 누구나 읽고 쓸 수 있습니다(프로토콜에 인증 없음). 망 분리·방화벽으로 닿는 PC 를 좁혔는지 확인합니다.", "Industrial protocol open — anyone on the same network can read and write (the protocol has no authentication). Check that network separation or a firewall limits which PCs can reach it."),
  opcua: t("OPC UA 열림 — 보안 모드 «None»·익명 로그인이 켜져 있으면 누구나 읽고 쓸 수 있습니다. 장비의 보안 정책·사용자 설정을 확인합니다.", "OPC UA open — with security mode «None» or anonymous login enabled, anyone can read and write. Check the device's security policy and user settings."),
  plain: t("평문 로그인 포트 열림 — 아이디·비밀번호가 암호화 없이 오갑니다. 쓰지 않으면 장비 설정에서 끌 수 있는지 확인합니다.", "Plain-text login port open — user names and passwords travel unencrypted. If unused, check whether the device settings can turn it off."),
  web: t("관리 웹 페이지(HTTP) 열림 — 암호화 없이 열립니다. 기본 비밀번호를 바꿨는지 확인합니다.", "Admin web page (HTTP) open — served without encryption. Check that the default password was changed."),
};
export const exposeKindText = (k: ExposeKind) => KIND_TEXT[k];

/** Net Scan 안내 칸의 줄들 — 종류마다 한 줄 «502 Modbus TCP · 102 S7 — 산업 프로토콜 열림 …». 없으면 빈 목록 */
export function exposeLines(ports: number[], lang: "ko" | "en"): string[] {
  const hits = exposedPorts(ports);
  const kinds: ExposeKind[] = ["noAuth", "opcua", "plain", "web"];
  return kinds
    .map((k) => {
      const ps = hits.filter((h) => h.kind === k);
      return ps.length ? `${ps.map((h) => `${h.port} ${h.name}`).join(" · ")} — ${KIND_TEXT[k][lang]}` : "";
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------- 이 PC(Port Inspector)

export interface PcListener {
  port: number;
  v6: boolean;
  /** 묶인 주소 — 0.0.0.0 · :: (모든 주소)면 비어 있음. 루프백이 아닌 랜 주소 하나에 묶이면 그 주소(0.10.0 백엔드) */
  addr?: string | null;
  pid: number;
  process?: string | null;
}
export interface FirewallState {
  profile: "domain" | "private" | "public";
  enabled: boolean | null;
  current: boolean;
}
export type SmbState = "absent" | "disabled" | "enabled";
/** 백엔드 모양(crates/core/src/portinfo/mod.rs PcExposure) */
export interface PcExposure {
  rdpDeny: number | null;
  rdpNla: number | null;
  rdpPort: number | null;
  smb1Client: SmbState | null;
  smb1Server: SmbState | null;
  firewall: FirewallState[];
  listeners: PcListener[];
  listenersRead: boolean;
  autoLogon: boolean | null;
  autoLogonPassword: boolean | null;
  autoplayOff: boolean | null;
  autorunPolicy: number | null;
}

const UNREAD = t("읽지 못함", "not read");
const FW_NAME: Record<FirewallState["profile"], Text> = { domain: t("도메인", "domain"), private: t("개인", "private"), public: t("공용", "public") };
const SMB_TEXT: Record<SmbState, Text> = { absent: t("설치 안 됨", "not installed"), disabled: t("꺼짐", "disabled"), enabled: t("켜짐", "enabled") };
/** 듣는 포트를 값에 몇 개까지 적을지 */
export const LISTEN_SHOW = 20;
/** 이 PC 가 열고 있으면 «볼 것» 인 포트 — 인증 없는 산업 프로토콜·평문 로그인(HTTP 는 PC 에서 흔해 뺀다) */
export const pcWatchPort = (port: number) => {
  const e = exposeOf(port);
  return e && e.kind !== "web" ? e : null;
};

/** 노출 항목들 — group «exposure». 값이 없으면(0.9.x 백엔드) 빈 목록. 읽지 못한 자동 로그온은 뺀다 */
export function exposureItems(x: PcExposure | undefined | null): PcItem[] {
  if (!x) return [];
  const items: PcItem[] = [];
  const add = (i: Omit<PcItem, "group" | "notes" | "level"> & { level?: Level; notes?: Text[] }) => {
    const it: PcItem = { group: "exposure", level: "ok", notes: [], ...i };
    items.push(it);
    return it;
  };
  const look = (i: PcItem, n: Text) => {
    if (i.level !== "problem") i.level = "look";
    i.notes.push(n);
  };

  // 원격 데스크톱
  const rdpOn = x.rdpDeny == null ? null : x.rdpDeny === 0;
  const rdp = add({
    id: "rdp",
    label: t("원격 데스크톱", "Remote Desktop"),
    value: rdpOn == null ? UNREAD : rdpOn ? t(`켜짐(포트 ${x.rdpPort ?? 3389})`, `on (port ${x.rdpPort ?? 3389})`) : t("꺼짐", "off"),
    level: rdpOn == null ? "unread" : "ok",
    where: t("설정 → 시스템 → 원격 데스크톱", "Settings → System → Remote Desktop"),
  });
  if (rdpOn) look(rdp, t("같은 망에서 이 PC 에 원격으로 로그인할 수 있습니다. 쓰는 사람·PC 가 정해져 있는지, 방화벽이 허용 범위를 좁혔는지 확인합니다.", "Others on the network can sign in to this PC remotely. Check who uses it and that the firewall limits where connections may come from."));
  const nla = add({
    id: "rdpNla",
    label: t("네트워크 수준 인증(원격 데스크톱)", "Network Level Authentication (Remote Desktop)"),
    value: x.rdpNla == null ? UNREAD : x.rdpNla ? t("요구함", "required") : t("요구 안 함", "not required"),
    level: x.rdpNla == null ? "unread" : "ok",
    where: t("설정 → 시스템 → 원격 데스크톱 → «연결할 때 네트워크 수준 인증을 사용하도록 장치 요구»", "Settings → System → Remote Desktop → «Require devices to use Network Level Authentication to connect»"),
  });
  if (rdpOn && x.rdpNla === 0) look(nla, t("원격 데스크톱이 켜져 있는데 로그인 전 인증을 요구하지 않습니다 — 로그인 화면이 누구에게나 열립니다.", "Remote Desktop is on without pre-login authentication — the sign-in screen is open to anyone."));

  // SMBv1
  const smbUnread = x.smb1Client == null || x.smb1Server == null;
  const smbOn = x.smb1Client === "enabled" || x.smb1Server === "enabled";
  const smb = add({
    id: "smb1",
    label: t("SMBv1 (옛 파일 공유)", "SMBv1 (legacy file sharing)"),
    value: t(`클라이언트 ${x.smb1Client ? SMB_TEXT[x.smb1Client].ko : UNREAD.ko} · 서버 ${x.smb1Server ? SMB_TEXT[x.smb1Server].ko : UNREAD.ko}`, `client ${x.smb1Client ? SMB_TEXT[x.smb1Client].en : UNREAD.en} · server ${x.smb1Server ? SMB_TEXT[x.smb1Server].en : UNREAD.en}`),
    level: smbUnread && !smbOn ? "unread" : "ok",
    where: t("제어판 → 프로그램 및 기능 → Windows 기능 켜기/끄기 → «SMB 1.0/CIFS 파일 공유 지원»(관리자 권한)", "Control Panel → Programs and Features → Turn Windows features on or off → «SMB 1.0/CIFS File Sharing Support» (administrator)"),
  });
  if (smbUnread) smb.notes.push(t("서비스 키를 읽지 못했습니다 — Windows 기능 목록은 관리자만 볼 수 있습니다.", "Could not read the service key — the Windows features list is administrator only."));
  if (smbOn) look(smb, t("SMBv1 은 오래된 공유 방식으로 알려진 취약점이 많습니다. 옛 장비(NAS·HMI)가 아직 쓰는지 확인한 뒤 끌 수 있는지 봅니다.", "SMBv1 is an old sharing protocol with many known vulnerabilities. Check whether an old device (NAS, HMI) still needs it before turning it off."));

  // 방화벽
  const fwRead = x.firewall.filter((f) => f.enabled != null);
  const fwOff = x.firewall.filter((f) => f.enabled === false);
  const fw = add({
    id: "firewall",
    label: t("방화벽(프로필별)", "Firewall (per profile)"),
    value: fwRead.length
      ? t(x.firewall.map((f) => `${FW_NAME[f.profile].ko} ${f.enabled == null ? "?" : f.enabled ? "켜짐" : "꺼짐"}${f.current ? "(지금)" : ""}`).join(" · "), x.firewall.map((f) => `${FW_NAME[f.profile].en} ${f.enabled == null ? "?" : f.enabled ? "on" : "off"}${f.current ? " (current)" : ""}`).join(" · "))
      : UNREAD,
    level: fwRead.length ? "ok" : "unread",
    where: t("Windows 보안 → 방화벽 및 네트워크 보호", "Windows Security → Firewall & network protection"),
  });
  if (fwOff.length)
    look(
      fw,
      fwOff.some((f) => f.current)
        ? t("지금 쓰는 네트워크 프로필의 방화벽이 꺼져 있습니다 — 아래 «같은 망에서 닿는 TCP 포트» 가 같은 망에 그대로 열립니다.", "The firewall is off for the network profile in use — the «TCP ports reachable from the network» below are open to the network as is.")
        : t("쓰지 않는 프로필의 방화벽이 꺼져 있습니다 — 그 종류의 네트워크에 붙으면 막지 않습니다.", "The firewall is off for a profile not in use — it will not filter when the PC joins that kind of network."),
    );

  // 0.0.0.0 · :: 또는 이 PC 의 랜 주소(루프백 아님)에서 듣는 포트 — 같은 망에서 닿는다
  const ports = [...new Map(x.listeners.map((l) => [`${l.port}|${l.addr ?? ""}`, l])).values()].sort((a, b) => a.port - b.port || (a.addr ?? "").localeCompare(b.addr ?? ""));
  const name = (l: PcListener) => (l.pid === 4 ? "System" : (l.process ?? `PID ${l.pid}`));
  const at = (l: PcListener) => (l.addr ? ` @${l.addr}` : "");
  const shown = ports.slice(0, LISTEN_SHOW).map((l) => `${l.port}${at(l)} (${name(l)})`);
  const more = ports.length - shown.length;
  const lis = add({
    id: "listeners",
    label: t("같은 망에서 닿는 TCP 포트(모든 주소 0.0.0.0·랜 주소)", "TCP ports reachable from the network (all addresses 0.0.0.0 or a LAN address)"),
    value: !x.listenersRead ? UNREAD : ports.length ? t(`${ports.length}개 — ${shown.join(", ")}${more > 0 ? ` 외 ${more}개` : ""}`, `${ports.length} — ${shown.join(", ")}${more > 0 ? ` and ${more} more` : ""}`) : t("없음", "none"),
    level: x.listenersRead ? "ok" : "unread",
    where: t("Windows 보안 → 방화벽 및 네트워크 보호 → 고급 설정 → 인바운드 규칙 · 명령 프롬프트 netstat -ano", "Windows Security → Firewall & network protection → Advanced settings → Inbound rules · Command Prompt netstat -ano"),
  });
  const watched = ports.filter((l) => pcWatchPort(l.port));
  const wAll = watched.filter((l) => !l.addr);
  const wLan = watched.filter((l) => l.addr);
  const tail = t(" 이 PC 가 서버(시뮬레이터·게이트웨이) 역할이 맞는지, 방화벽이 허용 범위를 좁혔는지 확인합니다.", " Check that this PC is meant to be a server (simulator, gateway) and that the firewall limits who can reach it.");
  if (wAll.length)
    look(
      lis,
      t(
        `이 PC 가 ${wAll.map((l) => `${l.port} ${pcWatchPort(l.port)!.name}(${name(l)})`).join(", ")} 를 모든 주소에 열고 있습니다 — 같은 망의 누구나 연결할 수 있습니다.${tail.ko}`,
        `This PC listens on ${wAll.map((l) => `${l.port} ${pcWatchPort(l.port)!.name} (${name(l)})`).join(", ")} on all addresses — anyone on the network can connect.${tail.en}`,
      ),
    );
  if (wLan.length)
    look(
      lis,
      t(
        `${wLan.map((l) => `${l.port} ${pcWatchPort(l.port)!.name}(${name(l)})`).join(", ")} 는 이 PC 의 랜 주소(${[...new Set(wLan.map((l) => l.addr))].join(", ")})에 묶여 같은 망에서 닿습니다 — 127.0.0.1 이 아니므로 같은 망의 누구나 연결할 수 있습니다.${tail.ko}`,
        `${wLan.map((l) => `${l.port} ${pcWatchPort(l.port)!.name} (${name(l)})`).join(", ")} ${wLan.length > 1 ? "are" : "is"} bound to this PC's LAN address (${[...new Set(wLan.map((l) => l.addr))].join(", ")}) and reachable from the network — it is not 127.0.0.1, so anyone on the network can connect.${tail.en}`,
      ),
    );
  if (x.listenersRead) {
    if (ports.some((l) => l.process == null && l.pid !== 4)) lis.notes.push(t("«PID n» 은 관리자 권한 없이 이름을 볼 수 없는 프로세스입니다.", "«PID n» is a process whose name cannot be read without administrator rights."));
    lis.notes.push(t("방화벽 규칙은 읽지 않습니다 — 방화벽이 막고 있으면 밖에서는 닿지 않을 수 있습니다.", "Firewall rules are not read — if the firewall blocks a port it may not be reachable from outside."));
  }

  // 자동 로그온 — 읽지 못하면 뺀다
  if (x.autoLogon != null) {
    const al = add({
      id: "autoLogon",
      label: t("자동 로그온", "Automatic sign-in"),
      value: x.autoLogon ? t("켜짐", "on") : t("꺼짐", "off"),
      where: t("명령 실행(Win+R) → netplwiz → «사용자 이름과 암호를 입력해야 이 컴퓨터를 사용할 수 있음»", "Run (Win+R) → netplwiz → «Users must enter a user name and password to use this computer»"),
    });
    if (x.autoLogon) look(al, t("전원만 켜면 로그인됩니다 — 장비 PC 에선 흔하지만, 화면 앞에 선 누구나 이 계정 권한을 갖습니다. 계정 권한(관리자 아님)과 화면 잠금을 확인합니다.", "The PC signs in on power-up — common on equipment PCs, but anyone at the screen gets this account's rights. Check the account is not an administrator and the screen lock."));
    if (x.autoLogon && x.autoLogonPassword) look(al, t("레지스트리(Winlogon DefaultPassword)에 비밀번호 값이 있습니다 — 평문으로 저장되는 방식입니다(PortDock 은 값의 내용을 읽지 않음).", "A password value exists in the registry (Winlogon DefaultPassword) — it is stored in plain text (PortDock does not read its contents)."));
  }

  // USB 저장장치 자동 실행
  const pol = x.autorunPolicy;
  const policyBlocks = pol != null && (pol & 0x04) !== 0;
  const autoplayOn = x.autoplayOff === false && !policyBlocks;
  const ap = add({
    id: "autoplay",
    label: t("USB 저장장치 자동 실행(AutoPlay)", "USB storage AutoPlay"),
    value: x.autoplayOff == null && pol == null ? UNREAD : policyBlocks ? t("정책으로 막힘", "blocked by policy") : x.autoplayOff ? t("꺼짐", "off") : t("켜짐", "on"),
    level: x.autoplayOff == null && pol == null ? "unread" : "ok",
    where: t("설정 → Bluetooth 및 장치 → 자동 실행 → «모든 미디어 및 장치에 자동 실행 사용»", "Settings → Bluetooth & devices → AutoPlay → «Use AutoPlay for all media and devices»"),
  });
  if (autoplayOn) look(ap, t("USB 저장장치를 꽂으면 무엇을 할지 묻거나 정해 둔 동작을 합니다. 여러 사람이 USB 를 꽂는 장비 PC 라면 끄는 것을 검토합니다(Windows 7 부터 autorun.inf 의 프로그램은 저절로 실행되지 않음).", "Plugging in USB storage prompts or runs the chosen action. On an equipment PC where many people plug in USB drives, consider turning it off (since Windows 7 programs in autorun.inf do not start by themselves)."));

  return items;
}

/** 이 화면이 하지 않는 것 — «이 PC» 노출 묶음 아래 */
export const EXPOSURE_LIMITS: Text[] = [
  t("고치지 않습니다 — 읽기만 하고, 바꾸는 곳만 안내합니다.", "Nothing is changed — values are read and only where to change them is shown."),
  t("방화벽 규칙·원격 접속 도구(TeamViewer·AnyDesk 등) 설정·계정 비밀번호 강도는 읽지 않습니다.", "Firewall rules, remote access tools (TeamViewer, AnyDesk …) and password strength are not read."),
];
