// 웹 도구 묶음 — 웹 도구 목록을 종류별로 나누고, 웹 도구 페이지 아래 «이어 읽기» 에 같은 묶음 도구를 먼저 보여 준다.
// 새 웹 도구를 webTools.ts 에 넣으면 여기 한 줄(경로 → 묶음)을 더한다 — 빠지면 «그 밖의 도구» 묶음에 들어간다.
import { WEB_TOOLS, type WebTool } from "./webTools";
import type { L } from "./tools";

export type GroupId = "comm" | "net" | "signal" | "elec" | "mech" | "units" | "hw" | "etc";

export const GROUPS: { id: GroupId; name: L }[] = [
  { id: "comm", name: { ko: "통신·Modbus", en: "Serial and Modbus" } },
  { id: "net", name: { ko: "네트워크", en: "Network" } },
  { id: "signal", name: { ko: "신호·센서", en: "Signals and sensors" } },
  { id: "elec", name: { ko: "전기·모터", en: "Electrical and motors" } },
  { id: "mech", name: { ko: "기계·공압", en: "Mechanical and pneumatics" } },
  { id: "units", name: { ko: "단위 변환", en: "Unit conversion" } },
  { id: "hw", name: { ko: "PC 하드웨어 테스트", en: "PC hardware tests" } },
  { id: "etc", name: { ko: "그 밖의 도구", en: "Other tools" } },
];

const GROUP_OF: Partial<Record<WebTool["path"], GroupId>> = {
  "tools/checksum/": "comm",
  "tools/modbus/": "comm",
  "tools/hex-ascii/": "comm",
  "tools/modbus-decoder/": "comm",
  "tools/modbus-float/": "comm",
  "tools/web-serial/": "comm",
  "tools/serial-timing/": "comm",
  "tools/rs485/": "comm",
  "tools/ascii/": "comm",
  "tools/integer/": "comm",
  "tools/uart-baud/": "comm",
  "tools/can-bit-timing/": "comm",
  "tools/modbus-blocks/": "comm",
  "tools/mc-decoder/": "comm",
  "tools/pcap-analyzer/": "comm",
  "tools/subnet/": "net",
  "tools/gige-bandwidth/": "net",
  "tools/4-20ma/": "signal",
  "tools/temperature/": "signal",
  "tools/loop-load/": "signal",
  "tools/ntc/": "signal",
  "tools/encoder/": "signal",
  "tools/adc/": "signal",
  "tools/voltage-divider/": "signal",
  "tools/rc-filter/": "signal",
  "tools/op-amp-gain/": "signal",
  "tools/voltage-drop/": "elec",
  "tools/motor-current/": "elec",
  "tools/motor-speed/": "elec",
  "tools/three-phase-power/": "elec",
  "tools/pf-capacitor/": "elec",
  "tools/ct-ratio/": "elec",
  "tools/parallel-resistor/": "elec",
  "tools/reactance/": "elec",
  "tools/led-resistor/": "elec",
  "tools/heater-power/": "elec",
  "tools/energy-pulse/": "elec",
  "tools/cylinder-force/": "mech",
  "tools/ball-screw/": "mech",
  "tools/vacuum-pad/": "mech",
  "tools/air-consumption/": "mech",
  "tools/timing-belt/": "mech",
  "tools/pressure/": "units",
  "tools/units/": "units",
  "tools/db/": "units",
  "tools/mic-test/": "hw",
  "tools/keyboard-test/": "hw",
  "tools/webcam-test/": "hw",
  "tools/speaker-test/": "hw",
  "tools/gamepad-test/": "hw",
  "tools/mouse-test/": "hw",
  "tools/monitor-test/": "hw",
};

export const groupOf = (path: string): GroupId => GROUP_OF[path as WebTool["path"]] ?? "etc";

/** 묶음별 웹 도구(빈 묶음은 뺀다) */
export const groupedWebTools = () =>
  GROUPS.map((g) => ({ ...g, tools: WEB_TOOLS.filter((w) => groupOf(w.path) === g.id) })).filter((g) => g.tools.length > 0);

/** 첫 화면에 먼저 보일 웹 도구 — 많이 찾는 통신 계산기 위주 */
export const POPULAR_WEB_TOOLS: WebTool["path"][] = [
  "tools/checksum/",
  "tools/modbus-decoder/",
  "tools/modbus-float/",
  "tools/4-20ma/",
  "tools/web-serial/",
  "tools/subnet/",
  "tools/voltage-drop/",
  "tools/units/",
];
