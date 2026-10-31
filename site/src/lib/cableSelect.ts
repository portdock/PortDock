// 웹 도구 «케이블 선정 도우미» — 용도를 고르면 맞는 케이블 종류·조건을 보이고, 전원·통신은 숫자로 확인한다. DOM 없이 순수 함수만.
// 근거(각 용도의 src 에도 적는다):
//   전압 강하: lib/wire.ts(IEC 60028 저항률, ASTM B258 AWG, IEC 60228 공칭 단면적) — 이 파일은 그 함수를 그대로 쓴다.
//   허용 전류: KEC 232.5.2 → KS C IEC 60364-5-52 부속서 B. 표 원문을 확인하지 못해 수치는 싣지 않는다(전압 강하만 계산).
//   RS-485: MODBUS over serial line V1.02 §3.4(차폐 꼬임쌍, AWG 26 이상·9600 bps 에서 1000 m, 가지선 20 m), TI SLLA070D(약 1200 m, bps × m ≤ 10^8),
//           종단 값은 케이블 특성 임피던스에 맞춘다(흔히 120 Ω) — lib/rs485.ts.
//   RS-232: TI SLLA067C §2.13(TIA-232: 선로 용량 2500 pF 미만, 약 20 m). 옛 RS-232-C 의 «50 ft(약 15 m)» 도 같은 용량 한계에서 나온 값.
//   이더넷: ANSI/TIA-568 채널 100 m(고정 배선 90 m + 패치 코드 10 m), IEEE 802.3(1000BASE-T Cat5e, 10GBASE-T Cat6A 100 m·Cat6 은 짧게).
//   열전대: IEC 60584-3(연장·보상 도선, 형별 색 — + 선은 형의 색, − 선은 흰색).
// 일반 지식만 적는다 — 설계·시공은 자격자와 그 나라 규정, 케이블·장비 제조사 자료로 확인한다.
import { awgName, minArea, nextAwg, nextIec, voltageDrop, type Material, type System } from "./wire.ts";
import { roughMaxLength } from "./rs485.ts";

export type Lang = "ko" | "en";
type L = { ko: string; en: string };
const t = (ko: string, en: string): L => ({ ko, en });

export type UseId = "ac" | "dc24" | "rs485" | "rs232" | "analog" | "temp" | "ethernet" | "servo" | "moving";
/** 화면에서 받을 입력 묶음 */
export type InputKind = "power" | "rs485" | "rs232" | "ethernet" | "none";

export interface Use {
  id: UseId;
  name: L;
  input: InputKind;
  /** 권하는 케이블 */
  cable: L[];
  /** 고를 때·깔 때 볼 것 */
  check: L[];
  /** 근거 */
  src: L[];
  /** 사이트 안 링크(가이드 slug 경로·웹 도구 경로) */
  links: string[];
}

export const USES: Use[] = [
  {
    id: "ac",
    name: t("AC 전원 (단상·3상)", "AC power (single- or three-phase)"),
    input: "power",
    cable: [
      t("단상: L·N·PE 3심, 3상: L1·L2·L3(·N)·PE — 보호 도체(PE)를 같은 케이블에.", "Single-phase: L, N, PE (3 cores). Three-phase: L1, L2, L3 (and N) plus PE in the same cable."),
      t("굵기는 두 조건을 모두 만족해야 합니다: ① 허용 전류(공사 방법·주위 온도·묶음에 따름) ② 전압 강하. 이 도구는 ② 만 계산합니다.", "The size must satisfy both: (1) current-carrying capacity (installation method, ambient temperature, grouping) and (2) voltage drop. This tool calculates (2) only."),
      t("인버터(VFD) 출력은 제조사가 권하는 차폐 모터 케이블과 접지 방법을 따릅니다.", "For drive (VFD) outputs, follow the maker's recommended shielded motor cable and grounding."),
    ],
    check: [
      t("허용 전류 IZ 는 KEC 232.5.2 에 따라 KS C IEC 60364-5-52 부속서 B 표에서 고르고, 보호 장치와 IB ≤ In ≤ IZ 를 맞춥니다(KEC 212.4.1).", "Take IZ from Annex B of IEC 60364-5-52 (KEC 232.5.2 in Korea) and coordinate with protection so that IB ≤ In ≤ IZ."),
      t("절연물 최고 허용 온도: PVC 70 °C, XLPE·EPR 90 °C(KEC 표 232.5-1) — 같은 굵기라도 허용 전류가 다릅니다.", "Maximum conductor temperature: PVC 70 °C, XLPE/EPR 90 °C — the same size carries different current."),
      t("통신·아날로그 신호선과 떨어뜨리고, 교차는 직각으로.", "Keep apart from communication and analog cables; cross at right angles."),
    ],
    src: [t("KEC 212.4.1·232.5 / IEC 60364-5-52 부속서 B(허용 전류 — 수치는 원문에서)", "KEC 212.4.1, 232.5 / IEC 60364-5-52 Annex B (ampacity — values from the original)"), t("전압 강하: IEC 60028 구리 저항률 1/58 Ω·mm²/m", "Voltage drop: IEC 60028 copper resistivity 1/58 Ω·mm²/m")],
    links: ["tools/voltage-drop/", "tools/motor-current/", "guides/motor-current-breaker-cable/", "tools/three-phase-power/"],
  },
  {
    id: "dc24",
    name: t("DC 24 V 전원·제어", "24 V DC power and control"),
    input: "power",
    cable: [
      t("+24 V 와 0 V 를 같은 굵기로 — 강하는 왕복 두 가닥에서 생깁니다.", "Run +24 V and 0 V in the same size — the drop happens in both conductors."),
      t("멀리 있는 센서·밸브·통신 장비는 전압 강하로 굵기를 정하는 경우가 많습니다. 부하 쪽 전압을 장비 매뉴얼의 최소 입력 전압과 비교합니다.", "For remote sensors, valves and devices, voltage drop usually decides the size. Compare the voltage at the load with the device's minimum input voltage."),
      t("제어 신호(접점·NPN/PNP)는 다심 제어 케이블, 노이즈가 많은 곳은 차폐.", "Control signals (contacts, NPN/PNP): multi-core control cable, shielded where noise is high."),
    ],
    check: [
      t("돌입 전류가 큰 부하(솔레노이드·모터 브레이크)는 켜는 순간 강하가 더 큽니다.", "Loads with high inrush (solenoids, motor brakes) drop more at switch-on."),
      t("전원 장치 출력을 조금 올려 강하를 메우는 방법은 장비 쪽 최대 입력 전압 안에서만.", "Raising the supply output to cover the drop only works within the devices' maximum input voltage."),
    ],
    src: [t("전압 강하: IEC 60028 저항률, IEC 60228 공칭 단면적", "Voltage drop: IEC 60028 resistivity, IEC 60228 nominal sizes")],
    links: ["tools/voltage-drop/", "guides/24v-voltage-drop/", "guides/24v-power-supply-check/", "guides/npn-pnp-sensor-plc-input/"],
  },
  {
    id: "rs485",
    name: t("RS-485 / RS-422 통신", "RS-485 / RS-422 communication"),
    input: "rs485",
    cable: [
      t("꼬임쌍(트위스트 페어) + 전체 차폐. RS-485 2선식은 A·B 한 쌍 + SG(공통) 선, 4선식·RS-422 은 두 쌍 + SG.", "Twisted pair with an overall shield. 2-wire RS-485: one pair (A, B) plus a signal ground (SG) wire; 4-wire and RS-422: two pairs plus SG."),
      t("특성 임피던스가 정해진 RS-485 용 케이블(흔히 120 Ω)을 쓰고, 양 끝 종단 저항을 그 값에 맞춥니다.", "Use a cable rated for RS-485 with a stated characteristic impedance (commonly 120 Ω) and match the end terminations to it."),
      t("Modbus 직렬 규격: AWG 26 이상(더 굵게), 9600 bps 에서 최대 1000 m, 가지선 20 m 이하.", "Modbus serial spec: AWG 26 or thicker, up to 1000 m at 9600 bps, stubs 20 m or less."),
    ],
    check: [
      t("한 줄로 차례로(데이지 체인) — 별 모양·긴 가지선 피하기.", "Daisy chain — avoid star wiring and long stubs."),
      t("거리와 속도는 함께 최대가 될 수 없습니다: 대략 bps × m ≤ 10⁸, 최대 약 1200 m.", "Distance and speed trade off: roughly bps × m ≤ 10⁸, at most about 1200 m."),
      t("차폐 접지(한쪽·양쪽)는 장비·버스 설치 지침을 따릅니다.", "Ground the shield (one end or both) as the device or bus installation guide says."),
    ],
    src: [t("MODBUS over serial line V1.02 §3.4", "MODBUS over serial line V1.02 §3.4"), t("TI SLLA070D — 1200 m, bps × m ≤ 10⁸", "TI SLLA070D — 1200 m, bps × m ≤ 10⁸")],
    links: ["tools/rs485/", "tools/wiring/", "guides/rs485-wiring/", "guides/rs485-bias-termination/", "guides/cable-shield-grounding/", "tools/pinouts/"],
  },
  {
    id: "rs232",
    name: t("RS-232 통신", "RS-232 communication"),
    input: "rs232",
    cable: [
      t("짧게 — 규격은 길이가 아니라 선로 용량(2500 pF 미만)으로 정합니다. 일반 케이블로 약 15~20 m.", "Keep it short — the spec limits line capacitance (under 2500 pF), not length. About 15 to 20 m with ordinary cable."),
      t("TX·RX·SG(GND) 최소 3선, 하드웨어 흐름 제어를 쓰면 RTS·CTS 등 더. 차폐 다심 케이블.", "At least TX, RX and SG (GND); more (RTS, CTS, …) with hardware flow control. Shielded multi-core cable."),
      t("PC 와 장비가 둘 다 DTE 면 크로스(널 모뎀) 결선.", "If both ends are DTE, use a crossover (null-modem) cable."),
    ],
    check: [
      t("더 멀리 가야 하면 저용량 케이블·낮은 보율, 또는 RS-485/422 변환기.", "For longer runs: low-capacitance cable, lower baud rate, or an RS-485/422 converter."),
      t("케이블 데이터시트의 pF/m 로 대략 길이 = 2500 pF ÷ pF/m (장비 입력 용량은 빼지 않은 위쪽 값).", "From the datasheet pF/m: rough length = 2500 pF ÷ pF/m (an upper value; device input capacitance not subtracted)."),
    ],
    src: [t("TI SLLA067C §2.13 — TIA-232 2500 pF, 약 20 m", "TI SLLA067C §2.13 — TIA-232 2500 pF, about 20 m")],
    links: ["guides/rs232-db9-null-modem/", "guides/rs232-rs422-rs485/", "tools/pinouts/", "tools/wiring/"],
  },
  {
    id: "analog",
    name: t("4-20mA·0-10V 아날로그", "4–20 mA and 0–10 V analog"),
    input: "none",
    cable: [
      t("차폐 꼬임쌍 — 신호 한 쌍마다 꼬임, 전체 또는 쌍별 차폐.", "Shielded twisted pair — each signal pair twisted, overall or individual shields."),
      t("4-20mA 는 선 저항이 루프 전압을 먹습니다. 긴 선은 루프 부하 계산으로 전송기 단자 전압을 확인합니다.", "In a 4–20 mA loop the cable resistance eats supply voltage. For long runs, check the transmitter terminal voltage with a loop load calculation."),
      t("0-10V 전압 신호는 선 저항·노이즈에 더 약해 짧은 거리에 씁니다.", "0–10 V voltage signals are more sensitive to resistance and noise; keep them short."),
    ],
    check: [
      t("차폐는 보통 한쪽(받는 쪽)에서 접지 — 장비 지침이 다르면 지침대로.", "The shield is usually grounded at one end (the receiving end) — follow the device guide if it says otherwise."),
      t("동력선·인버터 출력선과 같은 덕트에 넣지 않습니다.", "Do not share a duct with power or drive output cables."),
    ],
    src: [t("일반 지식 — 루프 계산은 옴의 법칙(lib/loopLoad.ts)", "General practice — the loop calculation is Ohm's law")],
    links: ["tools/loop-load/", "tools/4-20ma/", "guides/4-20ma-loop/", "guides/cable-shield-grounding/", "tools/wiring/"],
  },
  {
    id: "temp",
    name: t("열전대·RTD(Pt100)", "Thermocouples and RTDs (Pt100)"),
    input: "none",
    cable: [
      t("열전대: 같은 형의 연장(X)·보상(C) 도선 — 예: K 형은 KX 또는 KCA·KCB. 일반 구리선을 이으면 이은 곳이 새 접점이 되어 오차.", "Thermocouple: extension (X) or compensating (C) cable of the same type — e.g. KX or KCA/KCB for type K. Copper wire in between creates new junctions and error."),
      t("IEC 60584-3 색: + 선은 형의 색(K 초록, J 검정, T 갈색, E 보라, N 분홍, R·S 주황), − 선은 흰색. 옛 규격·다른 나라 색은 다릅니다.", "IEC 60584-3 colours: + core in the type colour (K green, J black, T brown, E violet, N pink, R/S orange), − core white. Older and other national codes differ."),
      t("RTD(Pt100): 3선식은 세 선의 길이·굵기를 같게(선 저항 상쇄), 정밀하면 4선식. 차폐 케이블.", "RTD (Pt100): for 3-wire use the same length and size on all three wires (so lead resistance cancels); 4-wire for precision. Shielded cable."),
    ],
    check: [
      t("+ − 극성이 바뀌면 데울 때 값이 내려갑니다(보상 도선 포함).", "Reversed polarity reads down as it heats (including the compensating cable)."),
      t("보상 도선은 사용 온도 범위가 정해져 있습니다 — 뜨거운 곳은 연장 도선·내열 피복.", "Compensating cables have a limited temperature range — use extension cable and heat-resistant insulation in hot zones."),
    ],
    src: [t("IEC 60584-3 연장·보상 도선과 색", "IEC 60584-3 extension and compensating cables, colours")],
    links: ["guides/pt100-thermocouple-wiring/", "tools/temperature/"],
  },
  {
    id: "ethernet",
    name: t("이더넷 (Modbus TCP·카메라 등)", "Ethernet (Modbus TCP, cameras, …)"),
    input: "ethernet",
    cable: [
      t("100 Mbps·1 Gbps: Cat5e 이상, 10 Gbps: Cat6A(Cat6 은 짧은 거리만).", "100 Mbps and 1 Gbps: Cat5e or better; 10 Gbps: Cat6A (Cat6 only for short runs)."),
      t("구리 한 채널은 100 m — 고정 배선 90 m + 패치 코드 10 m.", "One copper channel is 100 m — 90 m fixed cabling plus 10 m of patch cords."),
      t("현장(노이즈·기름·움직임): 차폐(S/FTP·SF/UTP) 산업용 케이블, M12 D-코드(100 Mbps)·X-코드(1/10 Gbps) 커넥터.", "Factory floor (noise, oil, movement): shielded (S/FTP, SF/UTP) industrial cable, M12 D-coded (100 Mbps) or X-coded (1/10 Gbps) connectors."),
    ],
    check: [
      t("100 m 를 넘으면 스위치를 하나 더 두거나 광으로.", "Beyond 100 m add a switch or go to fibre."),
      t("현장에서 T568A/B 배치를 하나로 통일.", "Use one wiring scheme (T568A or B) for the whole site."),
      t("필드버스용 이더넷(PROFINET 등)은 그 단체의 케이블 지침을 따릅니다.", "Industrial Ethernet fieldbuses (PROFINET, …) have their own cable guidelines."),
    ],
    src: [t("ANSI/TIA-568 채널 100 m(90 + 10)", "ANSI/TIA-568 channel 100 m (90 + 10)"), t("IEEE 802.3 — 1000BASE-T(Cat5e), 10GBASE-T(Cat6A 100 m)", "IEEE 802.3 — 1000BASE-T (Cat5e), 10GBASE-T (Cat6A 100 m)")],
    links: ["tools/pinouts/", "tools/gige-bandwidth/", "guides/ethernet-add-device/", "tools/system-diagram/"],
  },
  {
    id: "servo",
    name: t("엔코더·서보 모터", "Encoders and servo motors"),
    input: "none",
    cable: [
      t("서보 모터 동력·엔코더 케이블은 제조사 전용(또는 제조사가 지정한 사양) 케이블을 권합니다 — 차폐·쌍 구성·최대 길이가 드라이브와 맞춰져 있습니다.", "Use the maker's dedicated servo power and encoder cables (or cables to the maker's spec) — shielding, pairing and maximum length are matched to the drive."),
      t("증분형 엔코더(라인 드라이버 A·A̅·B·B̅·Z·Z̅)는 쌍별 꼬임 + 차폐. 오픈 컬렉터 출력은 짧게.", "Incremental encoders (line driver A/A̅, B/B̅, Z/Z̅): individually twisted pairs plus shield. Open-collector outputs: keep short."),
    ],
    check: [
      t("최대 길이·엔코더 전원 강하는 드라이브 매뉴얼 값으로.", "Maximum length and encoder supply drop: from the drive manual."),
      t("동력선과 엔코더선은 떨어뜨려 깔고, 차폐는 매뉴얼의 접지 방법대로.", "Run power and encoder cables apart; terminate the shield as the manual shows."),
    ],
    src: [t("일반 지식 — 길이·사양은 드라이브·모터 제조사 매뉴얼", "General practice — lengths and specs from the drive and motor manuals")],
    links: ["tools/encoder/", "guides/field-noise-communication-errors/", "guides/cable-shield-grounding/"],
  },
  {
    id: "moving",
    name: t("움직이는 곳 (케이블 체인·로봇)", "Moving parts (cable chains, robots)"),
    input: "none",
    cable: [
      t("계속 굽혀지는 곳은 «케이블 체인용(고굴곡)» 으로 표시된 케이블 — 가는 연선, 굴곡에 맞춘 꼬임·피복.", "For continuous flexing use cables rated for cable chains (high-flex) — fine stranding, lay and jacket designed for bending."),
      t("최소 굽힘 반경은 «케이블 외경의 몇 배» 로 제조사 카탈로그에 있습니다 — 체인의 굽힘 반경이 그 값 이상인지 확인.", "The minimum bending radius is given in the maker's catalogue as a multiple of the outer diameter — make sure the chain radius is at least that."),
      t("비틀림(로봇 축)은 비틀림 등급이 따로 있는 케이블.", "For torsion (robot axes) use cables with a torsion rating."),
    ],
    check: [
      t("체인 안에서 케이블끼리 꼬이지 않게 칸막이·여유를 두고, 무거운 것은 바깥쪽에 고르게.", "Use separators and clearance so cables do not twist together; spread heavy cables evenly to the outside."),
      t("굽힘 횟수(수명)·가속도·이동 거리는 제조사 값으로.", "Flex life, acceleration and travel: from the maker's data."),
    ],
    src: [t("일반 지식 — 굽힘 반경·수명은 케이블·체인 제조사 값", "General practice — bending radius and life from cable and chain makers")],
    links: ["tools/encoder/", "tools/conduit-fill/"],
  },
];

export const useById = (id: string) => USES.find((u) => u.id === id);

// ---- 전원 굵기

export interface PowerInput {
  system: System;
  volts: number;
  amps: number;
  /** 편도 m */
  lengthM: number;
  /** 허용 강하율 % */
  pct: number;
  material: Material;
  tempC: number;
}

export interface PowerResult {
  /** 강하율을 맞추는 최소 단면적 mm² */
  need: number;
  /** 그보다 굵은 가장 작은 IEC 공칭 단면적(없으면 undefined) */
  iec?: number;
  awg?: number;
  awgLabel?: string;
  /** iec 굵기로 다시 계산한 강하 */
  dropAtIec?: ReturnType<typeof voltageDrop>;
}

export function powerSize(x: PowerInput): PowerResult {
  for (const [k, v] of Object.entries({ volts: x.volts, amps: x.amps, lengthM: x.lengthM, pct: x.pct, tempC: x.tempC })) if (!Number.isFinite(v)) throw new RangeError(k);
  if (!(x.amps >= 0) || !(x.lengthM >= 0)) throw new RangeError("neg");
  const base = { system: x.system, volts: x.volts, amps: x.amps, lengthM: x.lengthM, material: x.material, tempC: x.tempC };
  const need = minArea(base, x.pct);
  const iec = nextIec(need);
  const awg = nextAwg(need);
  return { need, iec, awg, awgLabel: awg !== undefined ? awgName(awg) : undefined, dropAtIec: iec !== undefined ? voltageDrop({ ...base, areaMm2: iec }) : undefined };
}

// ---- 통신 길이 확인

export type Level = "ok" | "warn" | "fault";
export interface Note {
  level: Level;
  text: L;
}

/** RS-485: 보율·길이 → 대략 한계와 판정 */
export function rs485Check(baud: number, lengthM: number) {
  if (!(baud > 0) || !(lengthM >= 0)) throw new RangeError("rs485");
  const max = roughMaxLength(baud);
  const notes: Note[] = [];
  if (lengthM > 1200) notes.push({ level: "fault", text: t("1200 m 를 넘습니다 — 중계기(리피터)로 구간을 나눕니다.", "Over 1200 m — split the line with a repeater.") });
  else if (lengthM > max) notes.push({ level: "warn", text: t(`이 보율의 대략 한계(${Math.round(max)} m)를 넘습니다 — 보율을 낮추거나 구간을 나눕니다.`, `Beyond the rough limit for this baud rate (${Math.round(max)} m) — lower the baud rate or split the line.`) });
  else notes.push({ level: "ok", text: t(`대략 한계 ${Math.round(max)} m 안입니다.`, `Within the rough limit of ${Math.round(max)} m.`) });
  if (baud <= 19200 && lengthM > 1000) notes.push({ level: "warn", text: t("Modbus 규격의 9600 bps·1000 m(AWG 26 이상) 기준을 넘습니다 — 굵은 케이블·낮은 보율.", "Beyond the Modbus spec's 1000 m at 9600 bps (AWG 26 or thicker) — use thicker cable or a lower rate.") });
  return { max, notes };
}

/** RS-232: 케이블 pF/m 로 2500 pF 까지의 대략 길이와 판정 */
export const RS232_PF = 2500;
export function rs232Check(lengthM: number, pfPerM: number) {
  if (!(lengthM >= 0) || !(pfPerM > 0)) throw new RangeError("rs232");
  const max = RS232_PF / pfPerM;
  const cap = lengthM * pfPerM;
  const notes: Note[] = [];
  if (cap > RS232_PF) notes.push({ level: "fault", text: t(`선로 용량 약 ${Math.round(cap)} pF — 2500 pF 를 넘습니다. 저용량 케이블·낮은 보율, 또는 RS-485/422 로.`, `Line capacitance about ${Math.round(cap)} pF — over 2500 pF. Use low-capacitance cable, a lower baud rate, or RS-485/422.`) });
  else if (lengthM > 15) notes.push({ level: "warn", text: t(`선로 용량 약 ${Math.round(cap)} pF 로 한계 안이지만 15 m 를 넘습니다 — 장비 입력 용량·노이즈를 고려해 낮은 보율로 시험.`, `About ${Math.round(cap)} pF, within the limit, but over 15 m — allowing for device capacitance and noise, test at a lower baud rate.`) });
  else notes.push({ level: "ok", text: t(`선로 용량 약 ${Math.round(cap)} pF — 2500 pF 안입니다.`, `Line capacitance about ${Math.round(cap)} pF — within 2500 pF.`) });
  return { max, cap, notes };
}

export type EthSpeed = "100M" | "1G" | "10G";
/** 이더넷: 속도 → 최소 등급, 길이 판정 */
export function ethernetCheck(speed: EthSpeed, lengthM: number) {
  if (!(lengthM >= 0)) throw new RangeError("eth");
  const cat = speed === "10G" ? "Cat6A" : "Cat5e";
  const notes: Note[] = [];
  if (lengthM > 100) notes.push({ level: "fault", text: t("구리 채널 100 m 를 넘습니다 — 스위치를 더 두거나 광으로.", "Over the 100 m copper channel — add a switch or use fibre.") });
  else if (lengthM > 90) notes.push({ level: "warn", text: t("고정 배선 90 m 를 넘습니다 — 패치 코드를 합쳐 채널 100 m 안인지 확인.", "Over 90 m of fixed cabling — check the channel including patch cords stays within 100 m.") });
  else notes.push({ level: "ok", text: t("채널 100 m 안입니다.", "Within the 100 m channel.") });
  return { cat, notes };
}
