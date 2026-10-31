// 시운전·설치 점검표 만들기 — 구성 요소를 고르면 단계별 점검 항목 목록. DOM 없이 순수 함수만(node --test 로 시험).
// 항목은 일반 지식만 적는다(특정 회사·고객 점검표 아님). 링크는 사이트의 실제 가이드 slug·웹 도구 경로만(시험이 guides.ts·webTools.ts 와 맞춰 본다).

export type Lang = "ko" | "en";
type L = { ko: string; en: string };
const t = (ko: string, en: string): L => ({ ko, en });

export type CompId = "pc" | "plc" | "hmi" | "vfd" | "meter" | "ai420" | "dio" | "rs485" | "switch" | "usbser" | "remote";
export type StageId = "pre" | "off" | "on" | "comm" | "rec";

export const COMPONENTS: { id: CompId; name: L }[] = [
  { id: "pc", name: t("PC·산업용 PC", "PC / industrial PC") },
  { id: "plc", name: t("PLC", "PLC") },
  { id: "hmi", name: t("HMI(터치 화면)", "HMI (touch panel)") },
  { id: "vfd", name: t("인버터", "Variable frequency drive") },
  { id: "meter", name: t("전력 미터", "Power meter") },
  { id: "ai420", name: t("4-20mA 센서", "4-20 mA sensor") },
  { id: "dio", name: t("NPN/PNP 센서", "NPN/PNP sensor") },
  { id: "rs485", name: t("RS-485 버스", "RS-485 bus") },
  { id: "switch", name: t("이더넷 스위치", "Ethernet switch") },
  { id: "usbser", name: t("USB-시리얼 변환기", "USB-serial adapter") },
  { id: "remote", name: t("원격 접속", "Remote access") },
];

export const STAGES: { id: StageId; name: L }[] = [
  { id: "pre", name: t("설치 전", "Before installation") },
  { id: "off", name: t("전원 켜기 전", "Before power-on") },
  { id: "on", name: t("전원 켠 뒤", "After power-on") },
  { id: "comm", name: t("통신", "Communication") },
  { id: "rec", name: t("기록·백업", "Records and backup") },
];

export interface Item {
  id: string;
  stage: StageId;
  /** 이 항목을 넣는 구성 요소 — "all" 이면 늘 넣는다 */
  for: CompId[] | "all";
  text: L;
  /** 이어지는 사이트 페이지(언어 뺀 경로: "guides/<slug>/" 또는 "tools/<이름>/") */
  links?: string[];
}

export const ITEMS: Item[] = [
  // ---- 공통
  { id: "all-docs", stage: "pre", for: "all", text: t("배선도·구성도·장비 목록(모델·펌웨어 판)이 지금 현장과 같은지 맞춰 볼 것", "Check that the wiring diagram, system diagram and equipment list (models, firmware versions) match the site as it is now"), links: ["tools/wiring/", "tools/system-diagram/"] },
  { id: "all-manual", stage: "pre", for: "all", text: t("장비마다 매뉴얼(설치·결선·통신 설정 장)을 현장에서 볼 수 있게 준비", "Have each device's manual (installation, wiring and communication chapters) available on site") },
  { id: "all-qualified", stage: "off", for: "all", text: t("전기 작업은 자격을 갖춘 사람이, 현장의 전원 차단·잠금·표시 절차에 따라 할 것", "Electrical work is done by a qualified person, following the site's isolation, lock-out and tag-out procedure") },
  { id: "all-rating", stage: "off", for: "all", text: t("공급 전원의 종류·전압(AC/DC, 24 V 등)이 장비 명판 정격과 맞는지", "Supply type and voltage (AC/DC, 24 V…) match each device's nameplate rating") },
  { id: "all-terminals", stage: "off", for: "all", text: t("단자 조임·압착, 선 번호표가 배선도와 같은지", "Terminals tightened and crimped, wire markers match the wiring diagram") },
  { id: "all-shield", stage: "off", for: "all", text: t("접지(PE) 연결과 차폐선 처리 위치를 장비 매뉴얼·현장 규칙대로", "Protective earth connected and cable shields terminated as the manuals and site rules say") },
  { id: "all-leds", stage: "on", for: "all", text: t("전원 켠 뒤 상태 LED·오류 표시를 매뉴얼의 표와 맞춰 볼 것", "After power-on, compare status LEDs and error displays with the manual's table") },
  { id: "all-settings", stage: "rec", for: "all", text: t("바꾼 설정값(통신·파라미터)을 표로 남기고 날짜·판 번호를 적을 것", "Record changed settings (communication, parameters) in a table with date and version") },
  { id: "all-drawings", stage: "rec", for: "all", text: t("최종 배선도·구성도를 저장해 장비 옆·공유 위치에 둘 것", "Save the final wiring and system diagrams and keep a copy at the equipment and in the shared location"), links: ["tools/wiring/", "tools/system-diagram/"] },

  // ---- PC·산업용 PC
  { id: "pc-sw", stage: "pre", for: ["pc"], text: t("OS·드라이버·운영 프로그램의 판을 정하고, 설치 파일을 인터넷 없이도 쓸 수 있게 준비", "Fix the OS, driver and application versions and keep installers usable without internet") },
  { id: "pc-power", stage: "on", for: ["pc"], text: t("절전(USB 선택적 절전·디스크·절전 모드)이 운전 중 통신을 끊지 않게 설정", "Set power saving (USB selective suspend, disk, sleep) so it cannot drop communication during operation"), links: ["guides/usb-serial-disconnects/"] },
  { id: "pc-update", stage: "on", for: ["pc"], text: t("자동 업데이트의 재시작 시간이 운전 시간과 겹치지 않게", "Make sure automatic update restarts cannot happen during operating hours") },
  { id: "pc-clock", stage: "on", for: ["pc"], text: t("시계·시간대 확인 — 기록 시각이 맞아야 나중에 다른 장비 기록과 비교 가능", "Check the clock and time zone — log timestamps must be right to compare with other equipment later") },
  { id: "pc-firewall", stage: "comm", for: ["pc"], text: t("방화벽이 쓰는 포트(예: Modbus TCP 502)를 막지 않는지", "The firewall does not block the ports in use (e.g. Modbus TCP 502)"), links: ["guides/modbus-tcp-connection/"] },
  { id: "pc-backup", stage: "rec", for: ["pc"], text: t("PC 이름·IP·설치 프로그램 판을 기록하고 설정 파일을 백업", "Record PC name, IP and installed versions; back up configuration files") },

  // ---- PLC
  { id: "plc-version", stage: "pre", for: ["plc"], text: t("넣을 PLC 프로그램·파라미터의 판(파일 이름·날짜)을 정하고 원본을 따로 보관", "Fix the PLC program and parameter version (file name, date) and keep the original separately") },
  { id: "plc-io-com", stage: "off", for: ["plc"], text: t("입력 COM(+24 V/0 V)·출력 공통 결선이 센서·부하 종류와 맞는지", "Input COM (+24 V/0 V) and output common wiring match the sensor and load types"), links: ["tools/wiring/"] },
  { id: "plc-io-test", stage: "on", for: ["plc"], text: t("입출력을 하나씩 모니터로 확인 — 출력 시험은 기계가 움직일 수 있으니 현장 안전 절차와 함께", "Check inputs and outputs one by one on the monitor — output tests can move machinery, so follow the site safety procedure") },
  { id: "plc-ip", stage: "comm", for: ["plc"], text: t("IP·서브넷 마스크·국번이 구성도와 같은지", "IP, subnet mask and station number match the system diagram"), links: ["tools/subnet/", "guides/plc-ip-subnet/"] },
  { id: "plc-backup", stage: "rec", for: ["plc"], text: t("최종 PLC 프로그램을 PLC 에서 올려 받아 백업하고 판 번호를 붙일 것", "Upload the final program from the PLC, back it up and label the version") },

  // ---- HMI
  { id: "hmi-port", stage: "off", for: ["hmi"], text: t("HMI 전원과 통신 포트(이더넷·시리얼) 종류가 배선도와 같은지", "HMI supply and communication port (Ethernet or serial) match the wiring diagram") },
  { id: "hmi-values", stage: "on", for: ["hmi"], text: t("화면에 나온 값 몇 개를 실제 계측값과 맞춰 볼 것 — 배율·소수점 자리", "Compare a few values on screen with real measurements — scaling and decimal places") },
  { id: "hmi-comm", stage: "comm", for: ["hmi"], text: t("HMI 의 상대 장비 설정(IP·국번·프로토콜)이 PLC 쪽과 같은지", "The HMI's target settings (IP, station, protocol) match the PLC side"), links: ["guides/plc-ip-subnet/"] },
  { id: "hmi-backup", stage: "rec", for: ["hmi"], text: t("HMI 프로젝트 파일을 백업하고 판 번호를 붙일 것", "Back up the HMI project file and label the version") },

  // ---- 인버터
  { id: "vfd-nameplate", stage: "off", for: ["vfd"], text: t("모터 명판(전압·전류·주파수·극수)과 인버터에 넣을 모터 파라미터를 비교", "Compare the motor nameplate (voltage, current, frequency, poles) with the motor parameters to enter in the drive"), links: ["tools/motor-current/", "guides/motor-current-breaker-cable/"] },
  { id: "vfd-terminals", stage: "off", for: ["vfd"], text: t("전원 입력 단자와 모터 출력 단자(U·V·W)를 바꿔 잇지 않았는지", "Mains input terminals and motor output terminals (U, V, W) are not swapped") },
  { id: "vfd-discharge", stage: "off", for: ["vfd"], text: t("전원을 끈 뒤에도 내부 콘덴서에 전압이 남음 — 매뉴얼의 대기 시간을 지킨 뒤 단자에 손댈 것", "The DC bus capacitors stay charged after power-off — wait the time given in the manual before touching terminals") },
  { id: "vfd-direction", stage: "on", for: ["vfd"], text: t("낮은 주파수에서 회전 방향·회전수 확인", "Check rotation direction and speed at low frequency"), links: ["tools/motor-speed/", "guides/vfd-frequency-rpm/"] },
  { id: "vfd-modbus", stage: "comm", for: ["vfd"], text: t("통신 설정(프로토콜·국번·보율·패리티)과 운전 지령 출처(단자/통신)를 확인하고 저장", "Check communication settings (protocol, address, baud, parity) and the run command source (terminals or comms), then save"), links: ["guides/vfd-modbus-setup/"] },
  { id: "vfd-params", stage: "rec", for: ["vfd"], text: t("기본값에서 바꾼 파라미터 목록(번호·값)을 기록", "Record the list of parameters changed from default (number, value)") },

  // ---- 전력 미터
  { id: "meter-ct-dir", stage: "off", for: ["meter"], text: t("CT 방향 표시(P1→P2 등)와 상 순서 — 전압과 CT 가 같은 상끼리 짝인지", "CT direction marks (P1→P2 etc.) and phase order — each CT is paired with the voltage of the same phase") },
  { id: "meter-ct-open", stage: "off", for: ["meter"], text: t("전류가 흐르는 중에 CT 2차 회로를 열지 않을 것 — 단락 단자대를 쓰는지", "Never open a CT secondary while current flows — use a shorting terminal block"), links: ["guides/ct-ratio-burden/"] },
  { id: "meter-ratio", stage: "on", for: ["meter"], text: t("CT 비·PT 비 설정값을 실제 CT·PT 와 맞춰 입력", "Enter CT and PT ratios that match the installed transformers"), links: ["tools/ct-ratio/", "guides/ct-ratio-burden/"] },
  { id: "meter-sign", stage: "on", for: ["meter"], text: t("유효전력 부호·역률이 상식적인지 — 음수면 CT 방향·상 순서를 원인 후보로 볼 것", "Active power sign and power factor make sense — if negative, suspect CT direction or phase order") },
  { id: "meter-modbus", stage: "comm", for: ["meter"], text: t("통신으로 읽은 V·A·kW 를 계기 화면과 비교 — 배율·워드 순서", "Compare V, A and kW read over comms with the meter display — scaling and word order"), links: ["guides/power-meter-modbus-values/", "tools/modbus-float/"] },

  // ---- 4-20mA
  { id: "ai-type", stage: "off", for: ["ai420"], text: t("2선·3선·4선식 구분과 루프 전원이 어디서 나오는지", "Identify 2-, 3- or 4-wire and where the loop supply comes from"), links: ["tools/wiring/", "guides/4-20ma-loop/"] },
  { id: "ai-load", stage: "off", for: ["ai420"], text: t("루프 부하(수신 저항 + 배선 + 표시기)가 트랜스미터 허용 범위 안인지", "Loop load (receiver resistor + wiring + indicators) is within the transmitter's limit"), links: ["tools/loop-load/"] },
  { id: "ai-scale", stage: "on", for: ["ai420"], text: t("0 %·100 %(또는 몇 점)에서 mA·PLC 원시값·공학값을 함께 비교", "At 0 %, 100 % (or a few points) compare mA, the PLC raw value and the engineering value"), links: ["tools/4-20ma/", "guides/analog-input-scaling/"] },
  { id: "ai-fault", stage: "on", for: ["ai420"], text: t("단선·범위 밖 신호(예: 3.6 mA 미만, 21 mA 초과)를 PLC·HMI 가 어떻게 보여 주는지", "How the PLC and HMI show a broken loop or out-of-range signal (e.g. below 3.6 mA, above 21 mA)"), links: ["guides/4-20ma-loop/"] },

  // ---- NPN/PNP
  { id: "dio-type", stage: "pre", for: ["dio"], text: t("센서 출력(NPN/PNP)과 PLC 입력 COM 방식이 맞는지", "Sensor output type (NPN/PNP) matches the PLC input COM wiring"), links: ["tools/wiring/"] },
  { id: "dio-colors", stage: "off", for: ["dio"], text: t("선 색 관례(갈색 +, 파랑 0 V, 검정 출력)를 센서 데이터시트로 확인", "Confirm the colour convention (brown +, blue 0 V, black output) against the sensor datasheet"), links: ["tools/pinouts/"] },
  { id: "dio-lamp", stage: "on", for: ["dio"], text: t("센서 표시등과 PLC 입력 램프가 함께 켜지는지 하나씩", "One by one, the sensor indicator and the PLC input lamp come on together") },

  // ---- RS-485
  { id: "rs485-ids", stage: "pre", for: ["rs485"], text: t("장비 목록과 국번표(겹치지 않게)를 만들 것", "Make a device list and an address table with no duplicates"), links: ["tools/wiring/"] },
  { id: "rs485-term", stage: "off", for: ["rs485"], text: t("선로 양 끝 두 곳에만 종단(보통 120 Ω), 중간 장비의 종단 스위치는 끔", "Termination (usually 120 Ω) only at the two ends; termination switches off on devices in the middle"), links: ["guides/rs485-bias-termination/", "tools/rs485/"] },
  { id: "rs485-labels", stage: "off", for: ["rs485"], text: t("단자 표기(A/B·D+/D−·TRX±)를 대조하고 공통(SG) 선도 이을 것", "Compare terminal labels (A/B, D+/D−, TRX±) and connect the common (SG) wire too"), links: ["tools/pinouts/", "guides/rs485-wiring/"] },
  { id: "rs485-topology", stage: "off", for: ["rs485"], text: t("별 모양·긴 분기 대신 장비를 한 줄로 차례로 이을 것(데이지 체인)", "Daisy-chain devices in one line instead of a star or long branches"), links: ["guides/rs485-wiring/"] },
  { id: "rs485-settings", stage: "comm", for: ["rs485"], text: t("모든 장비의 보율·패리티·정지 비트가 같은지, 장비마다 하나씩 응답 확인", "Same baud, parity and stop bits on every device; check that each device answers, one at a time"), links: ["guides/modbus-no-response/", "tools/serial-timing/"] },
  { id: "rs485-poll", stage: "comm", for: ["rs485"], text: t("폴링 주기·응답 대기 시간을 장비 수와 보율에 맞춰 정할 것", "Set the polling cycle and response timeout for the number of devices and the baud rate"), links: ["guides/modbus-rtu-timeout-polling/"] },

  // ---- 이더넷 스위치
  { id: "sw-ipplan", stage: "pre", for: ["switch"], text: t("IP 계획표(장비별 IP·마스크·게이트웨이)를 만들 것", "Make an IP plan (IP, mask and gateway per device)"), links: ["tools/subnet/", "tools/system-diagram/"] },
  { id: "sw-cable", stage: "off", for: ["switch"], text: t("케이블 배치(T568A/B)를 현장에서 하나로 통일, 구리 한 구간 100 m 이하", "One cable scheme (T568A or B) for the whole site; copper runs of 100 m or less"), links: ["tools/pinouts/"] },
  { id: "sw-link", stage: "on", for: ["switch"], text: t("포트마다 링크 LED·속도(100M/1G) 확인 — 1G 장비가 100M 로 붙으면 케이블을 원인 후보로", "Check link LED and speed (100M/1G) per port — a 1G device linking at 100M points to the cable") },
  { id: "sw-dup", stage: "comm", for: ["switch"], text: t("IP 중복이 없는지, 장비마다 응답하는지 확인", "No duplicate IPs, and every device responds"), links: ["tools/system-diagram/"] },
  { id: "sw-mirror", stage: "rec", for: ["switch"], text: t("관리형 스위치면 설정을 백업하고, 통신 기록용 미러링 포트를 정해 둘 것", "On a managed switch, back up the configuration and set aside a mirror port for traffic capture"), links: ["guides/capture-plc-traffic-wireshark-pktmon/"] },

  // ---- USB-시리얼
  { id: "usb-spare", stage: "pre", for: ["usbser"], text: t("변환기 칩·드라이버를 확인하고 같은 모델 예비품을 준비", "Check the adapter chip and driver; keep a spare of the same model") },
  { id: "usb-term", stage: "off", for: ["usbser"], text: t("RS-485 변환기면 종단·바이어스 스위치 위치 확인", "On an RS-485 adapter, check the termination and bias switches"), links: ["guides/rs485-bias-termination/"] },
  { id: "usb-com", stage: "on", for: ["usbser"], text: t("COM 번호를 기록 — 다른 USB 포트에 꽂으면 번호가 바뀔 수 있음", "Record the COM number — it can change if plugged into another USB port"), links: ["guides/usb-serial-disconnects/"] },
  { id: "usb-suspend", stage: "on", for: ["usbser"], text: t("USB 선택적 절전 끄기, 허브를 거치지 않거나 전원 있는 허브 쓰기", "Turn off USB selective suspend; avoid hubs or use a powered hub"), links: ["guides/usb-serial-disconnects/"] },
  { id: "usb-latency", stage: "comm", for: ["usbser"], text: t("응답이 늦거나 프레임이 쪼개지면 변환기 지연 시간 설정을 볼 것", "If replies are late or frames split, check the adapter's latency setting"), links: ["guides/usb-serial-latency/"] },

  // ---- 원격 접속
  { id: "rem-approve", stage: "pre", for: ["remote"], text: t("원격 접속 방법·계정은 현장·고객의 보안 규칙대로 승인받을 것", "Get the remote access method and accounts approved under the site's or customer's security rules") },
  { id: "rem-net", stage: "comm", for: ["remote"], text: t("원격 접속용 네트워크와 제어망을 어떻게 나눌지 현장 규칙 확인", "Confirm with site rules how the remote access network is separated from the control network"), links: ["tools/system-diagram/"] },
  { id: "rem-restart", stage: "on", for: ["remote"], text: t("PC 를 다시 켠 뒤 원격 도구가 저절로 뜨는지 시험", "Test that the remote tool starts by itself after a PC restart") },
  { id: "rem-secrets", stage: "rec", for: ["remote"], text: t("접속 정보는 문서에 비밀번호를 적지 말고 현장 규칙대로 보관", "Keep access details per site rules — do not write passwords into documents") },
];

const STAGE_ORDER: Record<StageId, number> = { pre: 0, off: 1, on: 2, comm: 3, rec: 4 };

/** 고른 구성 요소 → 점검 항목(단계 순, 단계 안에서는 ITEMS 순서) */
export function buildChecklist(comps: CompId[]): Item[] {
  const set = new Set(comps);
  return ITEMS.filter((it) => it.for === "all" || it.for.some((c) => set.has(c))).sort((a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage]);
}

/** 단계별로 묶기(빈 단계 뺌) */
export function byStage(items: Item[]) {
  return STAGES.map((s) => ({ ...s, items: items.filter((i) => i.stage === s.id) })).filter((g) => g.items.length);
}

// ---------- 저장(브라우저 localStorage — 화면 쪽에서 try/catch 로 감싼다)

export interface Saved {
  v: 1;
  title: string;
  comps: CompId[];
  done: Record<string, boolean>;
  memo: Record<string, string>;
}

export const STORE_KEY = "portdock-commissioning-v1";
const COMP_IDS = new Set(COMPONENTS.map((c) => c.id));
const ITEM_IDS = new Set(ITEMS.map((i) => i.id));

export const emptySaved = (): Saved => ({ v: 1, title: "", comps: ["pc", "plc", "hmi", "switch"], done: {}, memo: {} });

/** 저장된 글 → Saved(모르는 값은 버림). 깨졌으면 기본값 */
export function parseSaved(text: string | null): Saved {
  if (!text) return emptySaved();
  try {
    const o = JSON.parse(text) as Partial<Saved>;
    if (!o || typeof o !== "object" || o.v !== 1) return emptySaved();
    const comps = Array.isArray(o.comps) ? (o.comps.filter((c) => COMP_IDS.has(c as CompId)) as CompId[]) : [];
    const done: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(o.done ?? {})) if (ITEM_IDS.has(k) && v === true) done[k] = true;
    const memo: Record<string, string> = {};
    for (const [k, v] of Object.entries(o.memo ?? {})) if (ITEM_IDS.has(k) && typeof v === "string" && v.trim()) memo[k] = v.slice(0, 500);
    return { v: 1, title: typeof o.title === "string" ? o.title.slice(0, 120) : "", comps, done, memo };
  } catch {
    return emptySaved();
  }
}

// ---------- 내보내기

/** 글 목록(메신저·메일에 붙이기) */
export function toText(s: Saved, lang: Lang): string {
  const items = buildChecklist(s.comps);
  const ko = lang === "ko";
  const lines: string[] = [];
  lines.push(s.title.trim() || (ko ? "시운전·설치 점검표" : "Commissioning checklist"));
  lines.push((ko ? "구성: " : "Components: ") + COMPONENTS.filter((c) => s.comps.includes(c.id)).map((c) => c.name[lang]).join(", "));
  const n = items.filter((i) => s.done[i.id]).length;
  lines.push((ko ? "완료 " : "Done ") + `${n}/${items.length}`);
  for (const g of byStage(items)) {
    lines.push("");
    lines.push(`## ${g.name[lang]}`);
    for (const it of g.items) {
      lines.push(`[${s.done[it.id] ? "x" : " "}] ${it.text[lang]}`);
      if (s.memo[it.id]?.trim()) lines.push(`    ${ko ? "메모" : "Note"}: ${s.memo[it.id].trim().replace(/\s*\n\s*/g, " / ")}`);
    }
  }
  return lines.join("\n");
}

/** CSV 한 칸 — 쉼표·따옴표·줄바꿈이 있으면 따옴표로, 수식으로 읽히는 첫 글자(= + - @)는 앞에 ' */
export function csvCell(v: string): string {
  let s = v;
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(s: Saved, lang: Lang): string {
  const ko = lang === "ko";
  const head = ko ? ["단계", "항목", "완료", "메모"] : ["Stage", "Item", "Done", "Note"];
  const rows = buildChecklist(s.comps).map((it) => [STAGES.find((g) => g.id === it.stage)!.name[lang], it.text[lang], s.done[it.id] ? (ko ? "예" : "yes") : "", s.memo[it.id]?.trim() ?? ""]);
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
