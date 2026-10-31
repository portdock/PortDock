// 시운전·유지보수 점검표 만들기 — 작업 종류(신규 설치·정기 점검·증설·교체·제거) × 구성 요소를 고르면 단계별 점검 항목 목록.
// DOM 없이 순수 함수만(node --test 로 시험).
// 항목은 일반 지식만 적는다(특정 회사·고객 점검표 아님). 링크는 사이트의 실제 가이드 slug·웹 도구 경로·앱 소개 페이지만
// (시험이 guides.ts·webTools.ts·tools.ts 와 맞춰 본다).

export type Lang = "ko" | "en";
type L = { ko: string; en: string };
const t = (ko: string, en: string): L => ({ ko, en });

export type CompId = "pc" | "plc" | "hmi" | "vfd" | "meter" | "ai420" | "dio" | "rs485" | "switch" | "usbser" | "power" | "remote";
export type StageId = "pre" | "off" | "on" | "comm" | "rec";
export type WorkId = "install" | "pm" | "expand" | "replace" | "remove";

export const WORKS: { id: WorkId; name: L; hint: L; title: L }[] = [
  { id: "install", name: t("신규 설치·시운전", "New installation"), hint: t("처음 설치하고 시운전할 때", "First installation and commissioning"), title: t("시운전·설치 점검표", "Commissioning checklist") },
  { id: "pm", name: t("정기 점검(예방 보전)", "Routine inspection (preventive)"), hint: t("돌아가는 설비를 정해진 주기로 볼 때", "Periodic checks on running equipment"), title: t("정기 점검표", "Routine inspection checklist") },
  { id: "expand", name: t("증설(장비 추가)", "Expansion (adding devices)"), hint: t("버스·네트워크에 장비를 더할 때", "Adding devices to a bus or network"), title: t("증설 점검표", "Expansion checklist") },
  { id: "replace", name: t("교체(같은 자리)", "Replacement (same position)"), hint: t("고장·노후 장비를 같은 자리에서 바꿀 때", "Swapping a failed or old device in place"), title: t("장비 교체 점검표", "Device replacement checklist") },
  { id: "remove", name: t("제거·철거", "Removal"), hint: t("장비를 빼거나 라인을 철거할 때", "Taking a device out or decommissioning a line"), title: t("장비 제거·철거 점검표", "Device removal checklist") },
];
export const WORK_IDS = new Set<WorkId>(WORKS.map((w) => w.id));

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
  { id: "power", name: t("24 V 전원·UPS", "24 V supply / UPS") },
  { id: "remote", name: t("원격 접속", "Remote access") },
];

/** 단계 이름 — 신규 설치는 «설치 전 → 전원 켜기 전 …», 나머지 작업은 «작업 전 → 전원 끄고 …» */
export const STAGES: { id: StageId; name: L; work: L }[] = [
  { id: "pre", name: t("설치 전", "Before installation"), work: t("작업 전 준비", "Preparation") },
  { id: "off", name: t("전원 켜기 전", "Before power-on"), work: t("전원 끄고 할 일", "With power off") },
  { id: "on", name: t("전원 켠 뒤", "After power-on"), work: t("전원 켠 뒤·운전 중", "Powered / running") },
  { id: "comm", name: t("통신", "Communication"), work: t("통신", "Communication") },
  { id: "rec", name: t("기록·백업", "Records and backup"), work: t("기록·문서 갱신", "Records and documents") },
];
export const stageName = (stage: StageId, work: WorkId, lang: Lang) => {
  const s = STAGES.find((x) => x.id === stage)!;
  return (work === "install" ? s.name : s.work)[lang];
};

export interface Item {
  id: string;
  stage: StageId;
  /** 이 항목을 넣는 구성 요소 — "all" 이면 늘 넣는다 */
  for: CompId[] | "all";
  /** 이 항목을 넣는 작업 종류 — 없으면 신규 설치만 */
  work?: WorkId[];
  text: L;
  /** 이어지는 사이트 페이지(언어 뺀 경로: "guides/<slug>/", "tools/<이름>/" 또는 앱 소개 "<앱 id>/") */
  links?: string[];
}

const ETH: CompId[] = ["pc", "plc", "hmi", "switch"];

export const ITEMS: Item[] = [
  // ---- 공통
  { id: "all-docs", stage: "pre", for: "all", work: ["install", "expand", "replace", "remove"], text: t("배선도·구성도·장비 목록(모델·펌웨어 판)이 지금 현장과 같은지 맞춰 볼 것", "Check that the wiring diagram, system diagram and equipment list (models, firmware versions) match the site as it is now"), links: ["tools/wiring/", "tools/system-diagram/"] },
  { id: "all-manual", stage: "pre", for: "all", work: ["install", "expand", "replace"], text: t("장비마다 매뉴얼(설치·결선·통신 설정 장)을 현장에서 볼 수 있게 준비", "Have each device's manual (installation, wiring and communication chapters) available on site") },
  { id: "all-qualified", stage: "off", for: "all", work: ["install", "pm", "expand", "replace", "remove"], text: t("전기 작업은 자격을 갖춘 사람이, 현장의 전원 차단·잠금·표시 절차에 따라 하고 시작 전 검전기로 전압이 없음을 확인할 것", "Electrical work is done by a qualified person, following the site's isolation, lock-out and tag-out procedure, and verifying absence of voltage with a tester before starting") },
  { id: "all-rating", stage: "off", for: "all", work: ["install", "expand", "replace"], text: t("공급 전원의 종류·전압(AC/DC, 24 V 등)이 장비 명판 정격과 맞는지", "Supply type and voltage (AC/DC, 24 V…) match each device's nameplate rating") },
  { id: "all-terminals", stage: "off", for: "all", text: t("단자 조임·압착, 선 번호표가 배선도와 같은지", "Terminals tightened and crimped, wire markers match the wiring diagram") },
  { id: "all-shield", stage: "off", for: "all", text: t("접지(PE) 연결과 차폐선 처리 위치를 장비 매뉴얼·현장 규칙대로", "Protective earth connected and cable shields terminated as the manuals and site rules say") },
  { id: "all-leds", stage: "on", for: "all", work: ["install", "expand", "replace"], text: t("전원 켠 뒤 상태 LED·오류 표시를 매뉴얼의 표와 맞춰 볼 것", "After power-on, compare status LEDs and error displays with the manual's table") },
  { id: "all-settings", stage: "rec", for: "all", text: t("바꾼 설정값(통신·파라미터)을 표로 남기고 날짜·판 번호를 적을 것", "Record changed settings (communication, parameters) in a table with date and version"), links: ["guides/communication-fault-log/"] },
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
  { id: "vfd-params", stage: "rec", for: ["vfd"], text: t("기본값에서 바꾼 파라미터 목록(번호·값)을 기록", "Record the list of parameters changed from default (number, value)"), links: ["guides/device-replacement-settings/"] },

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

  // ---- 24 V 전원·UPS (신규 설치)
  { id: "pw-capacity", stage: "pre", for: ["power"], text: t("장비마다 소비 전류를 더하고 여유를 둬 전원 용량을 정할 것 — 기동 돌입 전류도", "Add up each device's current with a margin to size the supply — include inrush at start-up"), links: ["guides/24v-power-supply-check/"] },
  { id: "pw-drop", stage: "off", for: ["power"], text: t("가장 먼 장비까지 선 굵기·길이로 24 V 강하를 계산", "Calculate the 24 V drop to the farthest device from wire size and length"), links: ["tools/voltage-drop/", "guides/24v-voltage-drop/"] },
  { id: "pw-measure", stage: "on", for: ["power"], text: t("부하가 걸린 상태에서 먼 장비 단자 전압을 잴 것", "Measure the voltage at the farthest device's terminals under load"), links: ["tools/multimeter-check/", "guides/24v-power-supply-check/"] },
  { id: "pw-ups", stage: "on", for: ["power"], text: t("UPS 가 있으면 입력을 끊어 전환·유지 시간과 PC 종료 신호를 시험", "With a UPS, cut its input to test change-over, hold-up time and the PC shutdown signal") },

  // ================= 정기 점검(예방 보전)
  { id: "pm-history", stage: "pre", for: "all", work: ["pm"], text: t("지난 점검 기록·고장 기록·알람 이력을 먼저 볼 것 — 이번에 더 볼 곳을 정함", "Read the previous inspection, fault and alarm records first to decide where to look harder") },
  { id: "pm-terminals", stage: "off", for: "all", work: ["pm"], text: t("단자 풀림·변색·탄 자국 — 다시 조일 때는 매뉴얼 토크로", "Loose, discoloured or burnt terminals — retighten to the manual's torque"), links: ["tools/multimeter-check/"] },
  { id: "pm-cable", stage: "off", for: "all", work: ["pm"], text: t("케이블 피복 손상·꺾임·커넥터 풀림, 차폐선·접지 연결 상태", "Cable jacket damage, kinks, loose connectors; shield and earth connections"), links: ["guides/cable-shield-grounding/"] },
  { id: "pm-env", stage: "on", for: "all", work: ["pm"], text: t("제어반 팬 돌아가는지, 필터 막힘, 함 안 온도·먼지·습기", "Panel fans running, filters not clogged; temperature, dust and moisture inside the cabinet") },
  { id: "pm-backup-age", stage: "rec", for: "all", work: ["pm"], text: t("백업(PLC·HMI 프로젝트·설정 파일)이 최신인가 — 지난 점검 뒤 바뀐 것이 있으면 새로 백업", "Are the backups (PLC, HMI project, settings files) current? If anything changed since last time, back up again") },
  { id: "pm-record", stage: "rec", for: "all", work: ["pm"], text: t("측정값·오류 수를 지난번과 같은 형식으로 남겨 추세를 비교", "Record readings and error counts in the same format as last time to compare trends") },
  { id: "pm-err-trend", stage: "comm", for: ["rs485", "switch", "usbser", "plc", "hmi"], work: ["pm"], text: t("통신 오류율(응답 없음·CRC 오류)을 지난 기록과 비교 — 늘고 있으면 배선·노이즈·접지를 원인 후보로", "Compare the communication error rate (timeouts, CRC errors) with earlier records — if rising, suspect wiring, noise or earthing"), links: ["plot/", "guides/field-noise-communication-errors/", "tools/troubleshoot/"] },
  { id: "pm-485-meter", stage: "off", for: ["rs485"], work: ["pm"], text: t("버스 A–B 저항(종단 두 개면 약 60 Ω)·쉬는 전압을 재서 지난 값과 비교", "Measure bus A–B resistance (about 60 Ω with two terminators) and idle voltage; compare with earlier values"), links: ["tools/multimeter-check/", "guides/rs485-multimeter-check/"] },
  { id: "pm-pc-disk", stage: "on", for: ["pc"], work: ["pm"], text: t("저장장치 수명·남은 용량 — 기록 파일이 디스크를 채우고 있지 않은지", "Storage health and free space — make sure log files are not filling the disk"), links: ["port-inspector/"] },
  { id: "pm-pc-bsod", stage: "on", for: ["pc"], work: ["pm"], text: t("블루스크린·갑자기 꺼짐 기록이 있었는지", "Any blue screens or unexpected shutdowns since last time"), links: ["port-inspector/", "tools/bsod-codes/"] },
  { id: "pm-pc-clock", stage: "on", for: ["pc"], work: ["pm"], text: t("시간 동기화 — 시계가 어긋나 있으면 기록 시각을 다른 장비와 비교할 수 없음", "Time sync — a drifting clock makes log timestamps useless for comparison"), links: ["port-inspector/"] },
  { id: "pm-pc-update", stage: "on", for: ["pc"], work: ["pm"], text: t("업데이트·재시작 이력이 운전 시간과 겹치지 않았는지", "Updates and restarts did not happen during operating hours") },
  { id: "pm-plc", stage: "on", for: ["plc"], work: ["pm"], text: t("PLC 오류 이력, 메모리 백업 배터리 교체 시기", "PLC error history and memory backup battery replacement date") },
  { id: "pm-hmi", stage: "on", for: ["hmi"], work: ["pm"], text: t("HMI 화면·터치·백라이트 상태, 시계", "HMI display, touch, backlight and clock") },
  { id: "pm-vfd", stage: "on", for: ["vfd"], work: ["pm"], text: t("인버터 냉각 팬·방열판 먼지, 경보 이력·운전 시간", "Drive cooling fan and heatsink dust, alarm history and run hours") },
  { id: "pm-meter", stage: "comm", for: ["meter"], work: ["pm"], text: t("통신으로 읽은 값과 계기 화면을 다시 비교", "Compare values read over comms with the meter display again"), links: ["guides/power-meter-modbus-values/"] },
  { id: "pm-ai", stage: "on", for: ["ai420"], work: ["pm"], text: t("몇 점에서 기준기와 비교 — 교정 주기가 지났는지", "Compare at a few points with a reference — is calibration overdue?"), links: ["tools/4-20ma/", "guides/analog-input-scaling/"] },
  { id: "pm-dio", stage: "on", for: ["dio"], work: ["pm"], text: t("센서 렌즈·검출면 오염, 고정 볼트 풀림", "Dirty sensor lenses or faces, loose mounting") },
  { id: "pm-sw", stage: "on", for: ["switch"], work: ["pm"], text: t("포트 링크 속도, 관리형이면 포트 오류 카운터", "Port link speeds; on a managed switch, the port error counters") },
  { id: "pm-usb", stage: "on", for: ["usbser"], work: ["pm"], text: t("COM 포트 연결 기록에 끊김이 있었는지", "Did the COM port connection history show drop-outs?"), links: ["port-inspector/", "guides/usb-serial-disconnects/"] },
  { id: "pm-ups", stage: "on", for: ["power"], work: ["pm"], text: t("UPS 배터리 교체 시기·자가 시험, 24 V 출력 전압 재기", "UPS battery age and self-test; measure the 24 V output"), links: ["guides/24v-power-supply-check/", "tools/multimeter-check/"] },
  { id: "pm-remote", stage: "rec", for: ["remote"], work: ["pm"], text: t("원격 접속 기록 확인, 쓰지 않는 계정 정리", "Review remote access logs and remove unused accounts") },

  // ================= 증설(장비 추가)
  { id: "exp-scope", stage: "pre", for: "all", work: ["expand"], text: t("더할 장비·위치·연결을 구성도에 먼저 그리고, 바꾸기 전 JSON 을 «기준» 으로 남길 것 — 뒤에 «변경 비교» 로 확인", "Draw the new devices on the system diagram first and keep the before JSON as a baseline — check with «Compare changes» afterwards"), links: ["tools/system-diagram/"] },
  { id: "exp-downtime", stage: "pre", for: "all", work: ["expand"], text: t("정지 범위·작업 시간을 운전 담당과 정하고, 되돌릴 방법(옛 설정·프로그램 백업)을 준비", "Agree the stoppage and time window with operations and prepare a way back (backups of settings and programs)") },
  { id: "exp-power", stage: "pre", for: "all", work: ["expand"], text: t("전원 용량 — 더한 장비 소비 전류를 합쳐도 전원 정격에 여유가 있는지, 24 V 선 끝 강하 다시 계산", "Supply capacity — with the new devices' current, is there still margin? Recalculate the 24 V drop at the far end"), links: ["tools/voltage-drop/", "guides/24v-voltage-drop/"] },
  { id: "exp-existing", stage: "on", for: "all", work: ["expand"], text: t("새 장비만이 아니라 기존 장비도 응답·값이 그대로인지 확인", "Check that existing devices still answer with the same values, not just the new ones") },
  { id: "exp-docs", stage: "rec", for: "all", work: ["expand"], text: t("구성도·배선도·장비 목록·국번/IP 표를 갱신하고 판 번호·날짜를 붙일 것", "Update the system and wiring diagrams, device list and address/IP tables with a version and date"), links: ["tools/system-diagram/", "tools/wiring/"] },
  { id: "exp-485-id", stage: "pre", for: ["rs485"], work: ["expand"], text: t("새 장비 국번이 버스에서 비어 있는지 — 공장 기본 국번(흔히 1)이 기존 장비와 겹치지 않게 미리 바꿀 것", "Is the new device's address free on the bus? Change the factory default (often 1) before connecting"), links: ["tools/system-diagram/", "guides/modbus-no-response/"] },
  { id: "exp-485-load", stage: "pre", for: ["rs485"], work: ["expand"], text: t("버스 장비 수·단위 부하 합(표준 송수신기 32)·버스 총 길이·분기 길이를 다시 볼 것", "Recheck device count, unit-load total (32 with standard transceivers), bus length and stub length"), links: ["tools/system-diagram/", "tools/rs485/", "guides/rs485-wiring/"] },
  { id: "exp-485-term", stage: "off", for: ["rs485"], work: ["expand"], text: t("새 장비를 버스 끝에 붙이면 종단을 새 끝으로 옮기고 옛 끝 장비의 종단은 끌 것", "If the new device is at the end of the bus, move termination to it and switch it off on the old end device"), links: ["guides/rs485-bias-termination/"] },
  { id: "exp-485-settings", stage: "comm", for: ["rs485"], work: ["expand"], text: t("새 장비의 보율·패리티·정지 비트를 버스와 같게", "Set the new device's baud, parity and stop bits to match the bus"), links: ["guides/vfd-modbus-setup/"] },
  { id: "exp-485-poll", stage: "comm", for: ["rs485"], work: ["expand"], text: t("장비가 늘면 한 바퀴 폴링 시간이 늘어남 — 화면 갱신·알람 지연이 허용 안인지 계산", "More devices make the polling cycle longer — check that screen updates and alarm delays stay acceptable"), links: ["tools/serial-timing/", "guides/modbus-rtu-timeout-polling/", "tools/modbus-blocks/"] },
  { id: "exp-485-master", stage: "comm", for: ["rs485"], work: ["expand"], text: t("마스터(PLC·HMI·PC 프로그램) 폴링 목록에 새 국번을 더하고 응답 대기 시간을 다시 볼 것", "Add the new address to the master's poll list (PLC, HMI or PC program) and review the response timeout"), links: ["guides/modbus-rtu-timeout-polling/"] },
  { id: "exp-ip", stage: "pre", for: ETH, work: ["expand"], text: t("새 장비 IP 가 비어 있는지 — 지금 쓰는 IP 를 훑어 구성도 IP 표와 맞춰 볼 것", "Is the new IP free? Scan the IPs in use and compare with the IP table in the system diagram"), links: ["netscan/", "tools/system-diagram/", "tools/subnet/"] },
  { id: "exp-sw-ports", stage: "pre", for: ["switch"], work: ["expand"], text: t("스위치 빈 포트 수·속도, 새 케이블 길이(구리 100 m 이하)", "Free switch ports and speed; new cable length (copper 100 m or less)"), links: ["tools/pinouts/"] },
  { id: "exp-tcp-conn", stage: "comm", for: ["plc", "hmi", "switch"], work: ["expand"], text: t("PLC·Modbus TCP 장비의 동시 연결 수 한계 — 새 클라이언트(HMI·PC·게이트웨이)를 더하면 기존 연결이 밀려날 수 있으니 매뉴얼 값과 비교", "Simultaneous connection limit of the PLC or Modbus TCP device — a new client (HMI, PC, gateway) can push out existing ones; compare with the manual"), links: ["guides/modbus-tcp-connection/"] },
  { id: "exp-plc", stage: "pre", for: ["plc"], work: ["expand"], text: t("PLC 입출력·통신 모듈 빈 자리와 주소 범위, 바꿀 프로그램 범위 — 바꾸기 전 프로그램 백업", "Free PLC I/O and comms slots and address ranges, the program changes needed — back up the program first") },
  { id: "exp-pc", stage: "on", for: ["pc"], work: ["expand"], text: t("PC 프로그램의 통신 주기·CPU·기록 저장 공간에 여유가 있는지", "Is there headroom in the PC program's cycle time, CPU and log storage?"), links: ["port-inspector/"] },
  { id: "exp-ups", stage: "pre", for: ["power"], work: ["expand"], text: t("UPS 용량·유지 시간을 늘어난 부하로 다시 계산", "Recalculate UPS capacity and hold-up time for the bigger load") },

  { id: "exp-vfd", stage: "off", for: ["vfd"], work: ["expand"], text: t("새 인버터의 모터 선은 통신선과 떨어뜨려 깔고, 모터 명판과 파라미터를 비교", "Route the new drive's motor cable away from communication cables; compare the motor nameplate with the parameters"), links: ["guides/field-noise-communication-errors/", "tools/motor-current/"] },
  { id: "exp-meter", stage: "comm", for: ["meter"], work: ["expand"], text: t("새 미터의 CT 비 설정과 레지스터 맵(워드 순서·배율)이 기존 미터와 같은지 — 다르면 마스터 쪽 설정도 따로", "Does the new meter use the same CT ratio setup and register map (word order, scaling) as the others? If not, set it up separately in the master"), links: ["guides/power-meter-modbus-values/", "tools/modbus-float/"] },
  { id: "exp-ai", stage: "pre", for: ["ai420"], work: ["expand"], text: t("아날로그 입력 카드 빈 채널과 루프 전원 용량, 새 루프의 부하 저항", "Free analog input channels, loop supply capacity and the new loop's load"), links: ["tools/loop-load/", "guides/4-20ma-loop/"] },
  { id: "exp-dio", stage: "pre", for: ["dio"], work: ["expand"], text: t("빈 입력 점과 그 입력 묶음의 COM 방식이 새 센서(NPN/PNP)와 맞는지", "Free input points, and the input group's COM wiring matches the new sensor (NPN/PNP)"), links: ["guides/npn-pnp-sensor-plc-input/", "tools/wiring/"] },
  { id: "exp-usb", stage: "comm", for: ["usbser"], work: ["expand"], text: t("변환기를 더하면 COM 번호를 기록하고 프로그램의 포트 설정과 맞출 것", "When adding an adapter, record its COM number and match it in the program's port settings"), links: ["port-inspector/", "guides/usb-serial-disconnects/"] },
  { id: "exp-remote", stage: "pre", for: ["remote"], work: ["expand"], text: t("새 장비에 원격으로 접속해야 하면 현장 보안 규칙대로 승인부터", "If the new device needs remote access, get it approved under the site's security rules first") },

  // ================= 교체(같은 자리)
  { id: "rep-record", stage: "pre", for: "all", work: ["replace"], text: t("옛 장비의 통신 설정·파라미터·레지스터 값을 읽어 파일로 남길 것 — 바꾼 뒤 같은 값과 비교", "Read the old device's communication settings, parameters and register values into a file — compare after the swap"), links: ["modbus-master/", "guides/device-replacement-settings/", "guides/modbus-read-blocks/"] },
  { id: "rep-model", stage: "pre", for: "all", work: ["replace"], text: t("같은 모델·펌웨어 판인지 — 다르면 레지스터 맵·기본값·단위 차이를 매뉴얼로 비교", "Same model and firmware? If not, compare the register map, defaults and units in the manuals"), links: ["guides/modbus-address-notation/"] },
  { id: "rep-label", stage: "off", for: "all", work: ["replace"], text: t("옛 장비 선을 뽑기 전에 단자마다 번호표를 붙이고 사진을 남길 것", "Label every terminal and take photos before disconnecting the old device"), links: ["tools/wiring/", "tools/pinouts/"] },
  { id: "rep-compare", stage: "comm", for: "all", work: ["replace"], text: t("바꾼 뒤 같은 레지스터·값을 읽어 옛 기록과 비교 — 배율·워드 순서", "After the swap, read the same registers and compare with the old record — scaling and word order"), links: ["tools/modbus-float/", "guides/modbus-float-word-order/"] },
  { id: "rep-docs", stage: "rec", for: "all", work: ["replace"], text: t("장비 목록의 모델·펌웨어·교체 날짜를 갱신, 옛 장비 처리(수리·폐기) 기록", "Update the model, firmware and swap date in the device list; record what happened to the old unit"), links: ["tools/system-diagram/"] },
  { id: "rep-485-same", stage: "comm", for: ["rs485"], work: ["replace"], text: t("국번·보율·패리티·정지 비트를 옛 장비와 같게 — 새 장비는 공장 기본값이라 그대로 붙이면 국번이 겹칠 수 있음", "Same address, baud, parity and stop bits as the old device — a new unit has factory defaults and may clash"), links: ["guides/modbus-no-response/"] },
  { id: "rep-485-term", stage: "off", for: ["rs485"], work: ["replace"], text: t("옛 장비의 종단·바이어스 스위치 상태를 새 장비에 옮길 것(끝 장비였다면 켬)", "Copy the old device's termination and bias switch positions (on if it was an end device)"), links: ["guides/rs485-bias-termination/"] },
  { id: "rep-ip", stage: "comm", for: ETH, work: ["replace"], text: t("IP·마스크·게이트웨이를 옛 장비와 같게 — MAC 이 바뀌므로 MAC 으로 묶은 설정(고정 할당·허용 목록)도 다시 볼 것", "Same IP, mask and gateway — the MAC changes, so review anything tied to it (DHCP reservations, allow lists)"), links: ["guides/plc-ip-subnet/", "netscan/"] },
  { id: "rep-plc", stage: "on", for: ["plc"], work: ["replace"], text: t("백업 프로그램·파라미터를 내려받고, 다시 올려 받아 판이 같은지 비교", "Download the backed-up program and parameters, then upload again to confirm the version matches") },
  { id: "rep-hmi", stage: "on", for: ["hmi"], work: ["replace"], text: t("HMI 프로젝트를 다시 내려받고 해상도·펌웨어 차이와 시계를 확인", "Download the HMI project again; check resolution, firmware differences and the clock") },
  { id: "rep-vfd", stage: "off", for: ["vfd"], work: ["replace"], text: t("기본값에서 바꾼 파라미터 목록을 새 인버터에 다시 넣고 모터 파라미터 확인", "Re-enter the list of changed parameters on the new drive and check the motor data"), links: ["guides/vfd-modbus-setup/", "tools/motor-current/"] },
  { id: "rep-vfd-dir", stage: "on", for: ["vfd"], work: ["replace"], text: t("낮은 주파수에서 회전 방향을 다시 확인", "Check rotation direction again at low frequency"), links: ["guides/vfd-frequency-rpm/"] },
  { id: "rep-meter", stage: "off", for: ["meter"], work: ["replace"], text: t("CT 2차를 단락한 뒤 교체하고 CT 비·PT 비 설정을 옮길 것", "Short the CT secondaries before the swap and carry over the CT and PT ratios"), links: ["guides/ct-ratio-burden/", "tools/ct-ratio/"] },
  { id: "rep-meter-energy", stage: "rec", for: ["meter"], work: ["replace"], text: t("적산 전력량은 새 계기에서 0 부터 — 옛 계기 마지막 값과 교체 시각을 기록", "Energy totals restart at zero — record the old meter's last reading and the swap time"), links: ["guides/power-meter-modbus-values/"] },
  { id: "rep-ai", stage: "on", for: ["ai420"], work: ["replace"], text: t("새 트랜스미터 범위(0·100 % 값)를 옛 것과 같게 맞추고 몇 점에서 비교", "Set the new transmitter's range (0 and 100 % values) as before and compare at a few points"), links: ["tools/4-20ma/", "guides/analog-input-scaling/"] },
  { id: "rep-dio", stage: "pre", for: ["dio"], work: ["replace"], text: t("새 센서 출력(NPN/PNP)·NO/NC·검출 거리가 같은지", "New sensor has the same output (NPN/PNP), NO/NC and sensing distance"), links: ["guides/npn-pnp-sensor-plc-input/"] },
  { id: "rep-usb", stage: "on", for: ["usbser"], work: ["replace"], text: t("새 변환기는 COM 번호가 바뀔 수 있음 — 프로그램 포트 설정을 다시, 칩이 다르면 드라이버도", "A new adapter may get another COM number — update the program's port; a different chip needs its driver"), links: ["port-inspector/", "guides/usb-serial-disconnects/"] },
  { id: "rep-pc", stage: "pre", for: ["pc"], work: ["replace"], text: t("옛 PC 의 프로그램 판·설정 파일·라이선스·IP·COM 번호를 기록하고, 새 PC 의 절전·업데이트·시간 동기화를 다시 설정", "Record the old PC's program versions, settings files, licences, IP and COM numbers; set power saving, updates and time sync again on the new PC"), links: ["port-inspector/", "guides/usb-serial-disconnects/"] },
  { id: "rep-power", stage: "off", for: ["power"], work: ["replace"], text: t("같은 출력 전압·그 이상 용량인지, 극성(+/−)을 확인", "Same output voltage, equal or larger capacity, correct polarity"), links: ["guides/24v-power-supply-check/"] },
  { id: "rep-remote", stage: "rec", for: ["remote"], work: ["replace"], text: t("원격 접속에 등록된 장비 정보가 바뀌면 목록을 갱신하고 옛 등록을 지울 것", "If the registered device for remote access changes, update the list and delete the old entry") },

  // ================= 제거·철거
  { id: "del-impact", stage: "pre", for: "all", work: ["remove"], text: t("그 장비 값을 쓰는 곳(PLC 프로그램·HMI 화면·상위 시스템·알람)을 찾아 두고 범위를 운전 담당과 정할 것", "Find everything that uses the device's values (PLC program, HMI screens, upper systems, alarms) and agree the scope with operations") },
  { id: "del-backup", stage: "pre", for: "all", work: ["remove"], text: t("빼기 전 마지막 설정·레지스터 값·프로그램을 백업 — 나중에 다시 쓸 수 있게", "Back up the last settings, register values and program before removal so it can be reused"), links: ["modbus-master/", "guides/modbus-read-blocks/"] },
  { id: "del-wires", stage: "off", for: "all", work: ["remove"], text: t("남은 선·분기선 정리 — 걷어 내거나 끝을 절연하고 표시", "Clean up leftover wires and stubs — remove them or insulate and label the ends"), links: ["tools/wiring/"] },
  { id: "del-others", stage: "on", for: "all", work: ["remove"], text: t("남은 장비들이 그대로 응답·값이 맞는지 확인", "Check that the remaining devices still answer with correct values") },
  { id: "del-docs", stage: "rec", for: "all", work: ["remove"], text: t("구성도·배선도·장비 목록에서 지우고 판 번호·날짜를 붙일 것", "Remove it from the system and wiring diagrams and the device list, with a version and date"), links: ["tools/system-diagram/", "tools/wiring/"] },
  { id: "del-485-term", stage: "off", for: ["rs485"], work: ["remove"], text: t("뺀 장비가 버스 끝이었다면 종단을 새 끝 장비로 옮길 것 — 한쪽 끝 종단이 없으면 반사로 오류가 늘 수 있음", "If the removed device was at the end of the bus, move termination to the new end device — a missing terminator can cause reflection errors"), links: ["guides/rs485-bias-termination/", "tools/system-diagram/"] },
  { id: "del-485-bias", stage: "on", for: ["rs485"], work: ["remove"], text: t("뺀 장비가 바이어스를 주고 있었다면 버스 쉬는 전압을 다시 잴 것", "If the removed device provided bias, measure the bus idle voltage again"), links: ["guides/rs485-multimeter-check/", "tools/multimeter-check/"] },
  { id: "del-485-poll", stage: "comm", for: ["rs485"], work: ["remove"], text: t("마스터 폴링 목록에서 국번을 뺄 것 — 남기면 응답 없음 오류가 쌓이고 매번 응답 대기 시간만큼 한 바퀴가 늦어짐", "Remove the address from the master's poll list — otherwise timeouts pile up and every cycle waits for the full response timeout"), links: ["guides/modbus-rtu-timeout-polling/", "tools/serial-timing/"] },
  { id: "del-485-id", stage: "rec", for: ["rs485"], work: ["remove"], text: t("반납한 국번을 국번표에 «비어 있음» 으로 기록", "Mark the freed address as unused in the address table"), links: ["tools/system-diagram/"] },
  { id: "del-ip", stage: "rec", for: ETH, work: ["remove"], text: t("반납한 IP 를 IP 표에 기록하고, 고정 할당·방화벽 허용 목록에서도 지울 것", "Record the freed IP in the IP table and remove it from DHCP reservations and firewall allow lists"), links: ["tools/system-diagram/", "netscan/"] },
  { id: "del-tcp", stage: "comm", for: ETH, work: ["remove"], text: t("그 장비에 접속하던 HMI·PC·게이트웨이의 연결 설정을 지울 것 — 남으면 재접속 시도·시간 초과가 계속 기록됨", "Delete connection settings in HMIs, PCs or gateways that talked to it — otherwise reconnect attempts and timeouts keep being logged"), links: ["guides/modbus-tcp-connection/"] },
  { id: "del-sw", stage: "rec", for: ["switch"], work: ["remove"], text: t("빈 스위치 포트 정리 — 관리형이면 포트를 끄고 설정 백업을 갱신", "Tidy the free switch port — on a managed switch, disable it and refresh the configuration backup") },
  { id: "del-pc", stage: "pre", for: ["pc"], work: ["remove"], text: t("PC 를 빼면 기록·설정 파일을 옮기고, 저장장치 지우기·폐기는 현장 규칙대로", "When removing a PC, move logs and settings files; wipe or dispose of the storage per site rules") },
  { id: "del-vfd", stage: "off", for: ["vfd"], work: ["remove"], text: t("전원을 끈 뒤 매뉴얼의 방전 대기 시간을 지키고 단자에 손댈 것", "After power-off, wait the manual's discharge time before touching terminals") },
  { id: "del-meter", stage: "off", for: ["meter"], work: ["remove"], text: t("CT 2차를 단락한 뒤 계기를 분리", "Short the CT secondaries before disconnecting the meter"), links: ["guides/ct-ratio-burden/"] },
  { id: "del-power", stage: "rec", for: ["power"], work: ["remove"], text: t("그 장비 몫의 차단기·퓨즈 표시를 정리하고 전원 부하 목록 갱신", "Update breaker and fuse labels and the supply load list") },
  { id: "del-ai", stage: "comm", for: ["ai420"], work: ["remove"], text: t("뺀 채널은 PLC·HMI 에서 끄거나 알람을 막을 것 — 그대로 두면 단선·범위 밖 알람이 계속 남", "Disable the freed channel in the PLC and HMI or suppress its alarm — otherwise broken-loop alarms keep firing"), links: ["guides/4-20ma-loop/"] },
  { id: "del-dio", stage: "comm", for: ["dio"], work: ["remove"], text: t("빈 입력 점을 쓰는 프로그램·인터록을 확인 — 늘 꺼진 입력이 기계 동작을 막거나 풀지 않는지", "Check program logic and interlocks using the freed input — an input that is now always off must not block or release machine motion") },
  { id: "del-usb", stage: "rec", for: ["usbser"], work: ["remove"], text: t("빼낸 변환기의 COM 번호를 기록에서 정리 — 다음 장치가 그 번호를 받을 수 있음", "Clear the removed adapter's COM number from your records — the next device may get that number"), links: ["port-inspector/"] },
  { id: "del-remote", stage: "rec", for: ["remote"], work: ["remove"], text: t("원격 접속 계정·등록을 지울 것", "Delete remote access accounts and registrations") },
];

const STAGE_ORDER: Record<StageId, number> = { pre: 0, off: 1, on: 2, comm: 3, rec: 4 };

const workOf = (it: Item): WorkId[] => it.work ?? ["install"];

/** 고른 구성 요소·작업 종류 → 점검 항목(단계 순, 단계 안에서는 ITEMS 순서) */
export function buildChecklist(comps: CompId[], work: WorkId = "install"): Item[] {
  const set = new Set(comps);
  return ITEMS.filter((it) => workOf(it).includes(work) && (it.for === "all" || it.for.some((c) => set.has(c)))).sort((a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage]);
}

/** 단계별로 묶기(빈 단계 뺌). 이름은 작업 종류에 맞춘다 */
export function byStage(items: Item[], work: WorkId = "install") {
  return STAGES.map((s) => ({ id: s.id, name: work === "install" ? s.name : s.work, items: items.filter((i) => i.stage === s.id) })).filter((g) => g.items.length);
}

/** 체크·메모 저장 키 — 신규 설치는 항목 id 그대로(옛 저장값과 같음), 다른 작업은 «작업:항목» 으로 따로 남긴다 */
export const itemKey = (work: WorkId, id: string) => (work === "install" ? id : `${work}:${id}`);

// ---------- 저장(브라우저 localStorage — 화면 쪽에서 try/catch 로 감싼다)

export interface Saved {
  v: 1;
  title: string;
  /** 작업 종류 — 옛 저장값(없음)은 신규 설치 */
  work: WorkId;
  comps: CompId[];
  done: Record<string, boolean>;
  memo: Record<string, string>;
}

/** 키는 그대로 둔다(옛 저장값을 그대로 읽는다 — work 가 없으면 신규 설치) */
export const STORE_KEY = "portdock-commissioning-v1";
const COMP_IDS = new Set(COMPONENTS.map((c) => c.id));
/** 저장해도 되는 키: 그 작업에 들어가는 항목만 */
const KEYS = new Set(ITEMS.flatMap((i) => workOf(i).map((w) => itemKey(w, i.id))));

export const emptySaved = (): Saved => ({ v: 1, title: "", work: "install", comps: ["pc", "plc", "hmi", "switch"], done: {}, memo: {} });

/** 저장된 글 → Saved(모르는 값은 버림). 깨졌으면 기본값 */
export function parseSaved(text: string | null): Saved {
  if (!text) return emptySaved();
  try {
    const o = JSON.parse(text) as Partial<Saved>;
    if (!o || typeof o !== "object" || o.v !== 1) return emptySaved();
    const comps = Array.isArray(o.comps) ? (o.comps.filter((c) => COMP_IDS.has(c as CompId)) as CompId[]) : [];
    const done: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(o.done ?? {})) if (KEYS.has(k) && v === true) done[k] = true;
    const memo: Record<string, string> = {};
    for (const [k, v] of Object.entries(o.memo ?? {})) if (KEYS.has(k) && typeof v === "string" && v.trim()) memo[k] = v.slice(0, 500);
    const work = WORK_IDS.has(o.work as WorkId) ? (o.work as WorkId) : "install";
    return { v: 1, title: typeof o.title === "string" ? o.title.slice(0, 120) : "", work, comps, done, memo };
  } catch {
    return emptySaved();
  }
}

export const workTitle = (work: WorkId, lang: Lang) => WORKS.find((w) => w.id === work)!.title[lang];

// ---------- 내보내기

/** 글 목록(메신저·메일에 붙이기) */
export function toText(s: Saved, lang: Lang): string {
  const items = buildChecklist(s.comps, s.work);
  const ko = lang === "ko";
  const k = (id: string) => itemKey(s.work, id);
  const lines: string[] = [];
  lines.push(s.title.trim() || workTitle(s.work, lang));
  lines.push((ko ? "작업: " : "Work: ") + WORKS.find((w) => w.id === s.work)!.name[lang]);
  lines.push((ko ? "구성: " : "Components: ") + COMPONENTS.filter((c) => s.comps.includes(c.id)).map((c) => c.name[lang]).join(", "));
  const n = items.filter((i) => s.done[k(i.id)]).length;
  lines.push((ko ? "완료 " : "Done ") + `${n}/${items.length}`);
  for (const g of byStage(items, s.work)) {
    lines.push("");
    lines.push(`## ${g.name[lang]}`);
    for (const it of g.items) {
      lines.push(`[${s.done[k(it.id)] ? "x" : " "}] ${it.text[lang]}`);
      const m = s.memo[k(it.id)]?.trim();
      if (m) lines.push(`    ${ko ? "메모" : "Note"}: ${m.replace(/\s*\n\s*/g, " / ")}`);
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
  const k = (id: string) => itemKey(s.work, id);
  const head = ko ? ["단계", "항목", "완료", "메모"] : ["Stage", "Item", "Done", "Note"];
  const rows = buildChecklist(s.comps, s.work).map((it) => [stageName(it.stage, s.work, lang), it.text[lang], s.done[k(it.id)] ? (ko ? "예" : "yes") : "", s.memo[k(it.id)]?.trim() ?? ""]);
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
