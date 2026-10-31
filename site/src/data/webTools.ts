// 웹 도구(브라우저 계산기) 목록 — 웹 도구 첫 화면·가이드·도구 페이지의 «이어지는 웹 도구» 가 여기서 나온다.
import type { L } from "./tools";

export interface WebTool {
  /** 언어를 뺀 경로 */
  path:
    | "tools/checksum/"
    | "tools/modbus/"
    | "tools/hex-ascii/"
    | "tools/modbus-decoder/"
    | "tools/modbus-float/"
    | "tools/web-serial/"
    | "tools/4-20ma/"
    | "tools/temperature/"
    | "tools/serial-timing/"
    | "tools/rs485/"
    | "tools/loop-load/"
    | "tools/voltage-drop/"
    | "tools/subnet/"
    | "tools/pressure/"
    | "tools/units/"
    | "tools/motor-current/"
    | "tools/motor-speed/"
    | "tools/db/"
    | "tools/ascii/"
    | "tools/integer/"
    | "tools/uart-baud/"
    | "tools/can-bit-timing/"
    | "tools/ntc/"
    | "tools/encoder/"
    | "tools/voltage-divider/"
    | "tools/adc/"
    | "tools/rc-filter/"
    | "tools/three-phase-power/"
    | "tools/pf-capacitor/"
    | "tools/ct-ratio/"
    | "tools/parallel-resistor/"
    | "tools/reactance/"
    | "tools/led-resistor/"
    | "tools/cylinder-force/"
    | "tools/ball-screw/"
    | "tools/heater-power/"
    | "tools/op-amp-gain/"
    | "tools/vacuum-pad/"
    | "tools/air-consumption/"
    | "tools/timing-belt/"
    | "tools/modbus-blocks/"
    | "tools/gige-bandwidth/"
    | "tools/energy-pulse/"
    | "tools/mc-decoder/"
    | "tools/xgt-decoder/"
    | "tools/pcap-analyzer/"
    | "tools/pump-fan-affinity/"
    | "tools/conveyor-speed/"
    | "tools/mic-test/"
    | "tools/keyboard-test/"
    | "tools/webcam-test/"
    | "tools/speaker-test/"
    | "tools/gamepad-test/"
    | "tools/mouse-test/"
    | "tools/monitor-test/"
    | "tools/bsod-codes/"
    | "tools/battery-report/"
    | "tools/barcode-scanner-test/"
    | "tools/mqtt-decoder/"
    | "tools/wiring/"
    | "tools/system-diagram/"
    | "tools/troubleshoot/"
    | "tools/multimeter-check/"
    | "tools/pinouts/"
    | "tools/commissioning-checklist/"
    | "tools/cable-selection/"
    | "tools/awg-mm2/"
    | "tools/conduit-fill/"
    | "tools/power-supply-sizing/"
    | "tools/io-list/"
    | "tools/handover-pack/"
    | "tools/cable-labels/"
    | "tools/ferrules/"
    | "tools/panel-heat/"
    | "tools/insulation-resistance/"
    | "tools/metric-threads/"
    | "tools/modbus-rtu-tcp/"
    | "tools/modbus-practice/"
    | "tools/can-decoder/"
    | "tools/i2c/"
    | "tools/spi/"
    | "tools/uart-waveform/";
  name: L;
  blurb: L;
}

export const WEB_TOOLS: WebTool[] = [
  {
    path: "tools/checksum/",
    name: { ko: "CRC·체크섬 계산기", en: "CRC & Checksum Calculator" },
    blurb: { ko: "CRC16 Modbus·CCITT·XMODEM, CRC8, LRC, BCC, SUM8, SUM16 을 한 번에.", en: "CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8 and SUM16 at once." },
  },
  {
    path: "tools/modbus/",
    name: { ko: "Modbus RTU 요청 만들기", en: "Modbus RTU Request Builder" },
    blurb: { ko: "국번·함수·주소·개수 → CRC 까지 붙은 요청 바이트. 40001 표기 지원.", en: "Slave ID, function, address, quantity → request bytes with CRC. Accepts 40001 notation." },
  },
  {
    path: "tools/hex-ascii/",
    name: { ko: "HEX ↔ ASCII 변환기", en: "HEX ↔ ASCII Converter" },
    blurb: { ko: String.raw`바이트를 글자로, 글자를 바이트로. 제어 문자는 \r \n \xNN 으로.`, en: String.raw`Bytes to text and back. Control characters as \r \n \xNN.` },
  },
  {
    path: "tools/modbus-decoder/",
    name: { ko: "Modbus 프레임 해석기", en: "Modbus Frame Decoder" },
    blurb: { ko: "RTU·TCP 바이트를 붙여 넣으면 국번·함수·값·CRC·MBAP·예외 코드까지 풀이.", en: "Paste RTU or TCP bytes to decode slave ID, function, values, CRC, MBAP and exceptions." },
  },
  {
    path: "tools/modbus-float/",
    name: { ko: "Modbus 실수 변환기", en: "Modbus Float Converter" },
    blurb: { ko: "레지스터 2·4개 ↔ float32·float64·int32. ABCD·CDAB·BADC·DCBA 네 순서를 한 표로.", en: "2 or 4 registers ↔ float32/float64/int32. ABCD, CDAB, BADC and DCBA side by side." },
  },
  {
    path: "tools/web-serial/",
    name: { ko: "웹 시리얼 터미널", en: "Web Serial Terminal" },
    blurb: { ko: "브라우저에서 COM 포트를 열어 주고받기. HEX·ASCII 보기, 체크섬·끝 문자 붙이기, 로그 저장.", en: "Open a COM port in the browser. HEX/ASCII view, checksum and line endings, save the log." },
  },
  {
    path: "tools/4-20ma/",
    name: { ko: "4–20mA 환산 계산기", en: "4–20 mA Scaling Calculator" },
    blurb: { ko: "전류·전압 ↔ 공학값 ↔ % ↔ PLC 카운트(0–27648 등). 4·8·12·16·20mA 환산표.", en: "Current/voltage ↔ engineering units ↔ % ↔ PLC counts (0–27648…). 4/8/12/16/20 mA table." },
  },
  {
    path: "tools/temperature/",
    name: { ko: "Pt100·열전대 온도 환산", en: "Pt100 & Thermocouple Converter" },
    blurb: { ko: "Pt100·Pt1000 저항, K·J·T·E·N·R·S·B 열전대 mV ↔ 온도. 냉접점 보정·온도표.", en: "Pt100/Pt1000 resistance and type K, J, T, E, N, R, S, B thermocouple mV ↔ °C. Cold junction, tables." },
  },
  {
    path: "tools/serial-timing/",
    name: { ko: "시리얼 통신 시간 계산기", en: "Serial Timing Calculator" },
    blurb: { ko: "보율·패리티 → 문자 시간, Modbus RTU 3.5문자(t3.5)·1.5문자, 요청·응답 시간, 폴링 주기·타임아웃 하한.", en: "Baud and parity → character time, Modbus RTU t3.5/t1.5, request/response time, polling cycle, minimum timeout." },
  },
  {
    path: "tools/rs485/",
    name: { ko: "RS-485 종단·바이어스 계산기", en: "RS-485 Termination & Bias Calculator" },
    blurb: { ko: "풀업·풀다운과 120·150 Ω 종단 → 유휴 차동 전압(200 mV 문턱), 저항 전력, 보율별 길이 한계.", en: "Pull-up/down with 120/150 Ω termination → idle voltage vs the 200 mV threshold, resistor power, length vs baud." },
  },
  {
    path: "tools/loop-load/",
    name: { ko: "4–20mA 루프 부하 계산기", en: "4–20 mA Loop Load Calculator" },
    blurb: { ko: "루프 전원·전송기 최소 전압·250 Ω·선 저항 → 남는 전압, 최대 부하 저항, 최대 케이블 거리.", en: "Loop supply, transmitter minimum, 250 Ω and cable → voltage margin, maximum load and cable length." },
  },
  {
    path: "tools/voltage-drop/",
    name: { ko: "전압 강하·전선 굵기 계산기", en: "Voltage Drop & Wire Size Calculator" },
    blurb: { ko: "직류·단상·3상, mm²·AWG, 구리·알루미늄 → 전압 강하·강하율, 허용 강하율에 맞는 굵기와 거리.", en: "DC, single- and three-phase, mm² or AWG, copper or aluminium → drop and %, size and length for an allowed drop." },
  },
  {
    path: "tools/subnet/",
    name: { ko: "IP 서브넷 계산기", en: "IP Subnet Calculator" },
    blurb: { ko: "주소·마스크(/24) → 네트워크·브로드캐스트·범위. PC 와 PLC 가 양쪽 마스크로 같은 대역인지 판정.", en: "Address and mask (/24) → network, broadcast, range. Checks both masks: are the PC and PLC on the same subnet?" },
  },
  {
    path: "tools/pressure/",
    name: { ko: "압력 단위 변환기", en: "Pressure Unit Converter" },
    blurb: { ko: "bar·psi·kPa·MPa·kgf/cm²·mmH₂O·mmHg 를 한 번에. 게이지 ↔ 절대, 센서 범위의 4–20mA 환산표.", en: "bar, psi, kPa, MPa, kgf/cm², mmH₂O, mmHg at once. Gauge ↔ absolute, sensor range with a 4–20 mA table." },
  },
  {
    path: "tools/units/",
    name: { ko: "산업 단위 변환기", en: "Industrial Unit Converter" },
    blurb: { ko: "유량 m³/h·L/min·gpm, 토크 N·m·kgf·cm·lbf·ft, 전력 kW·HP·PS·kcal/h, 온도 °C·°F·K.", en: "Flow m³/h, L/min, gpm; torque N·m, kgf·cm, lbf·ft; power kW, HP, PS, kcal/h; °C, °F, K." },
  },
  {
    path: "tools/motor-current/",
    name: { ko: "모터 전류 계산기", en: "Motor Current Calculator" },
    blurb: { ko: "3상·단상·직류 kW(HP) → A, 입력 전력·kVA·토크. 명판 값으로 효율 확인, 차단기·전선 기본 조건.", en: "Three-phase, single-phase or DC kW (HP) → amps, input power, kVA, torque. Efficiency from the nameplate." },
  },
  {
    path: "tools/motor-speed/",
    name: { ko: "인버터 주파수 ↔ 모터 회전수", en: "VFD Frequency ↔ Motor RPM" },
    blurb: { ko: "Hz·극수 → 동기 속도, 명판 회전수로 슬립, 감속비 출력 회전수, 원하는 rpm 에 필요한 Hz.", en: "Hz and poles → synchronous speed, slip from the nameplate, gearbox output, Hz for a target rpm." },
  },
  {
    path: "tools/db/",
    name: { ko: "dB·dBm 변환기", en: "dB & dBm Converter" },
    blurb: { ko: "dBm ↔ mW·W, 50·75·600 Ω 기준 dBµV·dBV·dBu·전압, 전력 비·전압 비 ↔ dB.", en: "dBm ↔ mW and W, dBµV, dBV, dBu and volts for 50/75/600 Ω, power or voltage ratio ↔ dB." },
  },
  {
    path: "tools/ascii/",
    name: { ko: "ASCII 코드표·제어 문자", en: "ASCII Table & Control Characters" },
    blurb: { ko: "0~127 의 10진·HEX·2진·글자, STX·ETX·ACK·NAK·CR·LF 같은 제어 문자의 이름·캐럿 표기·쓰임.", en: "0–127 in decimal, hex, binary and text, with names, caret notation and uses of STX, ETX, ACK, NAK, CR, LF." },
  },
  {
    path: "tools/integer/",
    name: { ko: "정수·진수 변환기", en: "Integer & Base Converter" },
    blurb: { ko: "HEX·10진·2진 ↔ 8·16·32비트, 부호 있는 값(2의 보수), BCD, 그레이 코드, 레지스터 바이트 순서.", en: "Hex, decimal, binary ↔ 8/16/32-bit, signed (two's complement), BCD, Gray code, register byte orders." },
  },
  {
    path: "tools/uart-baud/",
    name: { ko: "UART 보율 오차 계산기", en: "UART Baud Rate Error Calculator" },
    blurb: { ko: "MCU 클럭·오버샘플링 → 분주비(UBRR)·실제 보율·오차 %, 수신 허용 범위, 표준 보율 표.", en: "MCU clock and oversampling → divisor (UBRR), actual baud and error %, receiver tolerance, standard baud table." },
  },
  {
    path: "tools/can-bit-timing/",
    name: { ko: "CAN 비트 타이밍 계산기", en: "CAN Bit Timing Calculator" },
    blurb: { ko: "CAN 클럭·비트 속도·샘플 포인트 → 프리스케일러·TQ·PROP·PHASE_SEG1·2·SJW 조합, 클럭 허용 오차.", en: "CAN clock, bit rate and sample point → prescaler, TQ, PROP, PHASE_SEG1/2 and SJW, with oscillator tolerance." },
  },
  {
    path: "tools/ntc/",
    name: { ko: "NTC 서미스터 계산기", en: "NTC Thermistor Calculator" },
    blurb: { ko: "B 정수·Steinhart–Hart 로 저항 ↔ 온도, 분압 전압·ADC 값, 온도표, 자기 발열.", en: "Resistance ↔ temperature by B value or Steinhart–Hart, divider voltage and ADC counts, table, self-heating." },
  },
  {
    path: "tools/encoder/",
    name: { ko: "엔코더 펄스 ↔ rpm 계산기", en: "Encoder Pulses ↔ RPM Calculator" },
    blurb: { ko: "PPR·체배 → 출력 주파수·카운트 속도, 카운트로 rpm, 응답 주파수로 최대 rpm, 1카운트 각도·거리.", en: "PPR and ×1/×2/×4 → output frequency and count rate, rpm from counts, max rpm, angle and distance per count." },
  },
  {
    path: "tools/voltage-divider/",
    name: { ko: "분압 저항 계산기", en: "Voltage Divider Calculator" },
    blurb: { ko: "입력·출력 전압 → R1·R2, E12·E24·E96 표준 값 조합(오차순), 부하·전류·전력·출력 저항·허용차.", en: "Vin and Vout → R1 and R2, closest E12/E24/E96 pairs, load, current, power, output impedance, tolerance." },
  },
  {
    path: "tools/adc/",
    name: { ko: "ADC 분해능·스케일링 계산기", en: "ADC Resolution & Scaling Calculator" },
    blurb: { ko: "비트·기준 전압 → 1 LSB·코드 ↔ 전압, 4–20mA(션트)·0–10V(분압) → 공학값, 1카운트의 값.", en: "Bits and reference → 1 LSB and code ↔ volts; 4–20 mA (shunt) or 0–10 V (divider) → engineering units per count." },
  },
  {
    path: "tools/rc-filter/",
    name: { ko: "RC 시정수·차단 주파수 계산기", en: "RC Time Constant & Cut-off Calculator" },
    blurb: { ko: "R·C → τ, 충전 63 %·99 % 시간, 1차 저역 필터 차단 주파수·감쇠·위상, fc 에 맞는 R·C.", en: "R and C → τ, time to 63 % and 99 %, first-order low-pass cut-off, attenuation and phase, R or C for fc." },
  },
  {
    path: "tools/three-phase-power/",
    name: { ko: "3상 전력 계산기", en: "Three-Phase Power Calculator" },
    blurb: { ko: "전압 + A·kW·kVA 중 하나 + 역률 → kVA·kW·kvar·전류, kW·kVA 로 역률, kVA ↔ A 표.", en: "Voltage plus amps, kW or kVA and power factor → kVA, kW, kvar and amps; power factor from kW and kVA." },
  },
  {
    path: "tools/pf-capacitor/",
    name: { ko: "역률 개선 콘덴서 계산기", en: "Power Factor Correction Capacitor Calculator" },
    blurb: { ko: "kW·지금 역률·목표 역률 → 필요한 kvar, Δ·Y 결선 콘덴서 하나의 µF, 개선 전후 전류.", en: "kW, present and target power factor → kvar needed, µF per capacitor in delta or star, current before and after." },
  },
  {
    path: "tools/ct-ratio/",
    name: { ko: "CT 비·2차 전류·부담 계산기", en: "CT Ratio & Burden Calculator" },
    blurb: { ko: "CT 비로 1차 ↔ 2차 전류, 왕복 선 저항 + 계기 VA → 전체 부담(VA·Ω)과 정격 대비 %, 비 보정 계수.", en: "Primary ↔ secondary current by CT ratio, round-trip leads + meter VA → total burden (VA, Ω) vs rating, ratio correction factor." },
  },
  {
    path: "tools/parallel-resistor/",
    name: { ko: "합성 저항 계산기 (직렬·병렬)", en: "Parallel & Series Resistor Calculator" },
    blurb: { ko: "여러 저항의 직렬·병렬 합성, 병렬 전류 몫, 원하는 값을 만드는 짝, E12·E24·E96 두 개 조합.", en: "Series and parallel totals, current sharing, the partner for a target value, and E12/E24/E96 pairs." },
  },
  {
    path: "tools/reactance/",
    name: { ko: "리액턴스·LC 공진 계산기", en: "Reactance & LC Resonance Calculator" },
    blurb: { ko: "주파수에서 Xc·XL, 원하는 X 에 맞는 C·L, LC 공진 주파수·특성 임피던스, 콘덴서 전류·kvar.", en: "Xc and XL at a frequency, C or L for a target X, LC resonant frequency and impedance, capacitor current and kvar." },
  },
  {
    path: "tools/led-resistor/",
    name: { ko: "LED 저항 계산기", en: "LED Resistor Calculator" },
    blurb: { ko: "전원·Vf·전류·직렬 개수 → 저항·전력, E12·E24 표준 값으로 바꿨을 때 전류. 5·12·24 V 표시등.", en: "Supply, Vf, current and LEDs in series → resistor and power, current with an E12/E24 value. 5, 12, 24 V indicators." },
  },
  {
    path: "tools/cylinder-force/",
    name: { ko: "공압 실린더 추력 계산기", en: "Pneumatic Cylinder Force Calculator" },
    blurb: { ko: "보어·로드·압력 → 미는 쪽·당기는 쪽 이론 출력(N·kgf), 필요한 힘·부하율로 SMC 표의 보어 고르기.", en: "Bore, rod and pressure → extend and retract output (N, kgf); pick a bore from SMC's table for a force and load factor." },
  },
  {
    path: "tools/ball-screw/",
    name: { ko: "볼스크류 토크·모터 선정 계산기", en: "Ball Screw Torque & Motor Sizing Calculator" },
    blurb: { ko: "질량·속도·가속 시간·리드 → 축 하중, 모터 회전수, 가속·등속·감속 토크, 부하 관성, 실효 토크. 수평·수직.", en: "Mass, speed, acceleration time and lead → axial load, motor speed, accel/constant/decel torque, load inertia, RMS torque. Horizontal or vertical." },
  },
  {
    path: "tools/heater-power/",
    name: { ko: "히터 용량 계산기 (kW·전류)", en: "Heater Power Calculator (kW, Amps)" },
    blurb: { ko: "질량·비열·온도 상승·시간 → 히터 kW, 흐르는 유체 kW, 단상·3상 전류와 전압이 다를 때 출력.", en: "Mass, specific heat, temperature rise and time → heater kW, kW for flowing fluids, single/three-phase amps and output at other voltages." },
  },
  {
    path: "tools/op-amp-gain/",
    name: { ko: "op amp 증폭률 계산기", en: "Op Amp Gain Calculator" },
    blurb: { ko: "비반전·반전·차동 이득과 dB, 출력 전압, 개루프 이득 오차, 대역폭, 원하는 이득의 표준 저항.", en: "Non-inverting, inverting and differential gain, dB, output voltage, open-loop gain error, bandwidth and standard resistors for a target gain." },
  },
  {
    path: "tools/vacuum-pad/",
    name: { ko: "진공 패드 흡착력 계산기", en: "Vacuum Pad Lifting Force Calculator" },
    blurb: { ko: "패드 지름·진공압·안전율 → 흡착력(N·kgf), 필요한 진공압·패드 지름, 배관 용적과 흡착 응답 시간.", en: "Pad diameter, vacuum and safety factor → lifting force (N, kgf), vacuum or pad size needed, pipe volume and response time." },
  },
  {
    path: "tools/air-consumption/",
    name: { ko: "공압 실린더 공기 소비량 계산기", en: "Pneumatic Cylinder Air Consumption Calculator" },
    blurb: { ko: "보어·행정·압력·배관 → 한 사이클 공기 소비량(L ANR), 분당 소비량, 필요 공기량, 컴프레서 용량 기준.", en: "Bore, stroke, pressure and tubing → air per cycle (L ANR), per minute, required air flow and a compressor guide." },
  },
  {
    path: "tools/timing-belt/",
    name: { ko: "타이밍 벨트 길이·축간 거리 계산기", en: "Timing Belt Length & Center Distance Calculator" },
    blurb: { ko: "피치·풀리 잇수·축간 거리 → 벨트 길이·잇수, 벨트 → 축간 거리. 피치원 지름, 감긴 각, 맞물린 이, 벨트 속도.", en: "Pitch, pulley teeth and center distance → belt length and teeth, or belt → center distance. Pitch diameter, wrap, teeth in mesh, speed." },
  },
  {
    path: "tools/modbus-blocks/",
    name: { ko: "Modbus 읽기 요청 묶기 계산기", en: "Modbus Read Request Planner" },
    blurb: { ko: "읽을 주소 목록 → 함수 코드별 요청. 125개 한도·허용 빈칸, 안 쓰는 칸, RTU 한 바퀴 시간·바이트 비교.", en: "Address list → requests per function code. 125-register limit, allowed gap, unused registers, RTU poll time and bytes." },
  },
  {
    path: "tools/gige-bandwidth/",
    name: { ko: "GigE 카메라 대역폭 계산기", en: "GigE Camera Bandwidth Calculator" },
    blurb: { ko: "해상도·픽셀 형식·fps·카메라 수 → MB/s, 1·2.5·5·10 GbE 대비 %, 링크 안에서 최대 fps.", en: "Resolution, pixel format, fps and cameras → MB/s, share of 1/2.5/5/10 GbE, max fps that fits." },
  },
  {
    path: "tools/energy-pulse/",
    name: { ko: "전력량계 펄스 계산기", en: "Energy Meter Pulse Calculator" },
    blurb: { ko: "imp/kWh·펄스 간격·개수 → kW·kWh, CT·PT 배율, 최대 전력에서 펄스 주파수와 펄스 폭.", en: "imp/kWh, pulse interval or count → kW and kWh, CT/VT multiplier, pulse rate and width at full load." },
  },
  {
    path: "tools/mc-decoder/",
    name: { ko: "MC 프로토콜(SLMP) 프레임 해석기", en: "MC Protocol (SLMP) Frame Decoder" },
    blurb: { ko: "3E·4E, 이진·ASCII 프레임 → 머리 칸·명령·디바이스·값·종료 코드. 짝 요청으로 응답 값 풀이, 요청 만들기.", en: "3E/4E binary or ASCII frames → header, command, device, values and end code. Pair a reply with its request; build requests." },
  },
  {
    path: "tools/xgt-decoder/",
    name: { ko: "LS XGT 전용 프로토콜(FEnet) 프레임 해석기", en: "LS XGT Dedicated Protocol (FEnet) Frame Decoder" },
    blurb: { ko: "«LSIS-XGT» 머리 프레임 → 머리 칸·BCC·명령·변수(%MW·%MX·%DB)·값·오류 코드. 짝 요청으로 응답 값 풀이, 요청 만들기. PLC Simulator 의 XGT 흉내(0.10.0 부터)와 짝.", en: "«LSIS-XGT» header frames → header fields, BCC, instruction, variables (%MW, %MX, %DB), values and error code. Pair a reply with its request; build requests. Pairs with PLC Simulator's XGT mode (from 0.10.0)." },
  },
  {
    path: "tools/pcap-analyzer/",
    name: { ko: "산업 통신 pcap 해석기", en: "Industrial pcap Analyzer" },
    blurb: { ko: "Wireshark·pktmon 캡처 → Modbus TCP·MC 요청/응답 짝, 응답 시간, 무응답, 예외·종료 코드 집계. 브라우저 안에서만.", en: "Wireshark or pktmon capture → Modbus TCP and MC request/response pairs, response times, missing replies, exception and end codes. In your browser only." },
  },
  {
    path: "tools/mqtt-decoder/",
    name: { ko: "MQTT 페이로드 디코더 (Sparkplug B)", en: "MQTT Payload Decoder (Sparkplug B)" },
    blurb: { ko: "HEX·Base64·텍스트 → JSON 정리, Sparkplug B 지표(이름·별칭·형·값), 원시 MQTT 패킷(헤더·토픽·QoS·패킷 ID) 풀이.", en: "HEX, Base64 or text → pretty JSON, Sparkplug B metrics (name, alias, type, value), raw MQTT packets (header, topic, QoS, packet ID)." },
  },
  {
    path: "tools/barcode-scanner-test/",
    name: { ko: "바코드 스캐너 테스트", en: "Barcode Scanner Test" },
    blurb: { ko: "찍힌 글자와 Enter·Tab·GS, 글자 사이 ms(스캐너인지), 한글 입력 상태로 깨진 글자 되살리기, Caps Lock, GS1 AI 풀이.", en: "Scanned text with Enter, Tab and GS shown, ms between characters, text garbled by a Korean IME restored, Caps Lock, GS1 AIs." },
  },
  {
    path: "tools/pump-fan-affinity/",
    name: { ko: "펌프·팬 회전수와 동력 계산기", en: "Pump & Fan Speed vs Power Calculator" },
    blurb: { ko: "인버터 주파수 → 유량·압력·동력(상사 법칙), 한 해 전력량 차, 원하는 유량의 주파수.", en: "Drive frequency → flow, pressure and power (affinity laws), yearly energy difference, frequency for a target flow." },
  },
  {
    path: "tools/conveyor-speed/",
    name: { ko: "컨베이어 속도 ↔ 인버터 주파수 계산기", en: "Conveyor Speed ↔ VFD Frequency Calculator" },
    blurb: { ko: "롤러 지름·감속비·극수·슬립 → 라인 속도 m/min, 원하는 속도의 Hz, 1 Hz 당 속도.", en: "Roller diameter, gear ratio, poles and slip → line speed in m/min, Hz for a target speed, speed per Hz." },
  },
  // ---- PC 하드웨어 테스트(브라우저 API 로 장치 입출력을 본다 — 영상·소리·입력은 브라우저 밖으로 보내지 않는다)
  {
    path: "tools/mic-test/",
    name: { ko: "마이크 테스트", en: "Mic Test" },
    blurb: { ko: "입력 레벨 막대·실제 샘플레이트·잡음 바닥·클리핑, 에코 제거 켜고 끄며 비교, 5초 로컬 녹음 듣기.", en: "Live level meter, actual sample rate, noise floor and clipping, echo cancellation on/off, 5-second local playback." },
  },
  {
    path: "tools/keyboard-test/",
    name: { ko: "키보드 테스트 (채터링·동시 입력)", en: "Keyboard Tester (Chatter & Rollover)" },
    blurb: { ko: "한국어 106·ANSI·ISO 배열에 누른 키 표시, 동시 입력 수, 키별 횟수, 채터링 의심(ms), 브라우저가 못 받는 키.", en: "Korean 106, ANSI or ISO layout: pressed keys, rollover count, presses per key, chatter suspects in ms, keys the browser cannot see." },
  },
  {
    path: "tools/webcam-test/",
    name: { ko: "웹캠 테스트", en: "Webcam Test" },
    blurb: { ko: "미리보기, 요청한 해상도와 실제 받은 해상도·fps 측정, 카메라 고르기. 영상은 저장·전송하지 않음.", en: "Preview, requested vs actual resolution, measured fps, camera picker. Video is never saved or sent." },
  },
  {
    path: "tools/speaker-test/",
    name: { ko: "스피커 좌우 테스트", en: "Left/Right Speaker Test" },
    blurb: { ko: "왼쪽·오른쪽·양쪽, 5.1·7.1 채널별 소리, 위상(극성) 반전 비교, 주파수 스윕·톤, 출력 장치 고르기.", en: "Left, right and both, per-channel 5.1/7.1, polarity check, frequency sweep and tone, output device picker." },
  },
  {
    path: "tools/gamepad-test/",
    name: { ko: "게임패드 테스트 (스틱 쏠림·데드존)", en: "Gamepad Tester (Stick Drift & Dead Zone)" },
    blurb: { ko: "버튼·트리거·축 실시간 값, 놓았을 때 스틱 쏠림 수치와 궤적, 데드존 적용 결과, 진동(되는 브라우저).", en: "Live buttons, triggers and axes, stick drift at rest with a trace, dead zone preview, rumble where supported." },
  },
  {
    path: "tools/mouse-test/",
    name: { ko: "마우스 더블클릭 테스트", en: "Mouse Double Click Test" },
    blurb: { ko: "버튼 5개·휠 4방향, 더블클릭 간격 ms·의도하지 않은 더블클릭(채터링) 의심, 드래그 끊김, 폴링 레이트 추정.", en: "Five buttons and four wheel directions, double-click interval in ms, chatter suspects, drag breaks, polling rate estimate." },
  },
  {
    path: "tools/monitor-test/",
    name: { ko: "모니터 불량화소·주사율 테스트", en: "Dead Pixel & Refresh Rate Test" },
    blurb: { ko: "전체 화면 단색(검정·흰색·빨강·초록·파랑·회색)으로 불량화소 보기, 그라데이션 밴딩, 주사율 추정, 잔상 패턴.", en: "Full-screen solid colors for dead or stuck pixels, gradient banding, refresh rate estimate, motion pattern for ghosting." },
  },
  // ---- PC 점검(파일·글을 브라우저 안에서만 읽는다)
  {
    path: "tools/bsod-codes/",
    name: { ko: "블루스크린 정지 코드 사전", en: "Blue Screen (BSOD) Stop Code Lookup" },
    blurb: { ko: "0xD1·0x133·WHEA 같은 코드나 이벤트 1001 메시지를 붙여 넣으면 뜻·원인 후보·볼 순서·Microsoft 문서 링크.", en: "Paste a code like 0xD1 or 0x133, a name, or an Event 1001 message for its meaning, likely causes, what to check and the Microsoft page." },
  },
  {
    path: "tools/battery-report/",
    name: { ko: "노트북 배터리 리포트 해석기", en: "Laptop Battery Report Reader" },
    blurb: { ko: "powercfg /batteryreport 의 HTML 을 끌어 놓으면 설계 대비 남은 용량 %, 충전 횟수, 용량 이력 그래프. 브라우저 안에서만.", en: "Drop the powercfg /batteryreport HTML for remaining capacity vs design, cycle count and a capacity history chart. In your browser only." },
  },
  {
    path: "tools/wiring/",
    name: { ko: "배선도 만들기", en: "Wiring Diagram Maker" },
    blurb: { ko: "RS-485 2선·4선, RS-232 널 모뎀, 4-20mA 2·3·4선식, NPN/PNP 센서, 릴레이 출력 — 장비 수·국번에 맞춘 그림 + 확인 목록, SVG·PNG.", en: "RS-485 2/4-wire, RS-232 null modem, 4-20 mA 2/3/4-wire, NPN/PNP sensors, relay outputs — drawn for your devices and IDs, with a checklist, SVG/PNG." },
  },
  {
    path: "tools/system-diagram/",
    name: { ko: "시스템 구성도 그리기", en: "System Diagram Editor" },
    blurb: { ko: "PC·PLC·HMI·인버터·스위치를 놓고 이더넷·RS-485 버스로 잇기. IP·서브넷·국번 중복, 종단·단위 부하·폴링 시간, 증설 전후 변경 비교, JSON·SVG·PNG, Net Scan CSV.", en: "Place PCs, PLCs, HMIs, drives and switches on Ethernet or RS-485 buses. Duplicate IPs, subnets, IDs, termination, unit loads, polling time, before/after comparison; JSON, SVG, PNG." },
  },
  // ---- 고장 찾기·점검
  {
    path: "tools/troubleshoot/",
    name: { ko: "고장 원인 찾기 도우미", en: "Field Troubleshooting Wizard" },
    blurb: { ko: "RS-485·RS-232·Modbus TCP·USB-시리얼·4-20mA·NPN/PNP 센서·MC 프로토콜·USB 끊김 — 예/아니오로 좁혀 원인 후보·멀티미터 확인값·가이드. 텍스트로 복사.", en: "RS-485, RS-232, Modbus TCP, USB-serial, 4–20 mA, NPN/PNP sensors, MC protocol, USB drops — narrow down by yes/no to possible causes, meter checks and guides. Copy as text." },
  },
  {
    path: "tools/multimeter-check/",
    name: { ko: "멀티미터 측정값 점검기", en: "Multimeter Reading Checker" },
    blurb: { ko: "RS-485 A–B 저항·쉬는 전압·공통 모드, 4-20mA(NE 43), 24 V 강하, NPN/PNP 출력, RS-232 TX, 접지 전위차 — 잰 값 → «문제 없음·볼 것·문제 있음».", en: "RS-485 A–B resistance, idle and common-mode voltage, 4–20 mA (NE 43), 24 V drop, NPN/PNP output, RS-232 TX, ground difference — reading in, verdict out." },
  },
  {
    path: "tools/pinouts/",
    name: { ko: "커넥터 핀 배치 사전", en: "Connector Pinout Reference" },
    blurb: { ko: "DB9·DB25 RS-232, RJ45 T568A/B·이더넷, Modbus RJ45/DB9(규격), M12 A·D·X-코드, M8, USB-A/B/C, RS-485 단자 표기 — 수/암 정면 그림·선 색·출처, SVG 저장.", en: "DB9/DB25 RS-232, RJ45 T568A/B and Ethernet, Modbus RJ45/DB9 (spec), M12 A/D/X-coded, M8, USB-A/B/C, RS-485 terminal names — male/female front views, wire colours, sources, SVG." },
  },
  {
    path: "tools/commissioning-checklist/",
    name: { ko: "시운전·유지보수 점검표 만들기", en: "Commissioning & Maintenance Checklist" },
    blurb: { ko: "신규 설치·정기 점검·증설·교체·제거 × PC·PLC·HMI·인버터·RS-485·스위치·24 V 전원 — 작업 전 → 전원 → 통신 → 기록 단계별 점검표. 체크·메모 저장, 인쇄, CSV.", en: "New install, routine inspection, expansion, replacement or removal × PC, PLC, HMI, drive, RS-485, switch, 24 V supply — a staged checklist. Ticks and notes saved, print, CSV." },
  },
  {
    path: "tools/cable-selection/",
    name: { ko: "케이블 선정 도우미", en: "Cable Selection Helper" },
    blurb: { ko: "AC·DC 24 V 전원, RS-485·RS-232, 4-20mA, 열전대·RTD, 이더넷, 서보, 케이블 체인 — 용도별 케이블 종류·조건, 전원은 전압 강하로 굵기, 통신은 길이 확인.", en: "AC and 24 V DC power, RS-485, RS-232, 4–20 mA, thermocouples and RTDs, Ethernet, servo, cable chains — cable type and conditions by use; size from voltage drop, length checks for comms." },
  },
  {
    path: "tools/awg-mm2/",
    name: { ko: "AWG ↔ mm² 변환표", en: "AWG to mm² Conversion Table" },
    blurb: { ko: "AWG 0000~40 지름·단면적(ASTM B258 공식), 가까운 미터 규격(IEC 60228), 구리 Ω/km. AWG·mm² 어느 쪽이든 넣어 바꾸기.", en: "AWG 0000 to 40 diameter and area (ASTM B258 formula), nearest metric size (IEC 60228), copper Ω/km. Convert either way." },
  },
  {
    path: "tools/conduit-fill/",
    name: { ko: "전선관·덕트 점유율 계산기", en: "Conduit & Duct Fill Calculator" },
    blurb: { ko: "전선 외경·개수 → 단면 점유율 %. 전선관 NEC 53·31·40 %, 와이어웨이 20 %, 제어반 덕트 NFPA 79 50 % 와 비교, 최소 관 안지름·최대 가닥.", en: "Wire outer diameter and count → fill %. Compared with NEC conduit 53/31/40 %, wireway 20 %, panel duct NFPA 79 50 %; minimum conduit ID and max wires." },
  },
  {
    path: "tools/io-list/",
    name: { ko: "IO 리스트·통신 사양서 만들기", en: "I/O List & Communication Spec Maker" },
    blurb: { ko: "장비별 통신(RTU·TCP·국번·IP·보율)과 태그·주소·함수·형식·워드 순서·스케일 표. 주소 겹침·국번 중복 점검, 장비 맵에서 가져오기, CSV(엑셀)·JSON·인쇄.", en: "Per-device communication (RTU/TCP, unit ID, IP, baud) with tags, addresses, functions, types, word order and scale. Overlap and duplicate-ID checks, device map import, CSV (Excel), JSON, print." },
  },
  {
    path: "tools/handover-pack/",
    name: { ko: "현장 문서 묶음 만들기(인수인계)", en: "Site Handover Pack Maker" },
    blurb: { ko: "구성도 JSON·IO 리스트 JSON·시운전 점검표 CSV·연락처·메모 → 표지·목차가 붙은 인쇄용 문서 한 장. HTML 저장·PDF 인쇄, 브라우저 안에서만.", en: "Diagram JSON, I/O list JSON, commissioning checklist CSV, contacts and notes → one printable document with cover and contents. Save HTML or print to PDF, in your browser only." },
  },
  {
    path: "tools/power-supply-sizing/",
    name: { ko: "24V DC 전원 용량 계산기", en: "24 V DC Power Supply Sizing Calculator" },
    blurb: { ko: "PLC·HMI·센서·밸브·릴레이 코일의 전류·돌입 전류·동시 사용률 → 합계, 여유를 둔 정격(흔한 정격에서), 돌입 피크 비교, 서킷 프로텍터 채널 나누기.", en: "Current, inrush and duty of PLCs, HMIs, sensors, valves and relay coils → total, rating with headroom (common sizes), inrush check and circuit protector channels." },
  },
  // ---- 현장 공구
  {
    path: "tools/cable-labels/",
    name: { ko: "케이블·단자 라벨 만들기", en: "Cable & Terminal Label Maker" },
    blurb: { ko: "W001~W120·X1:1~X1:40 연번, IO 이름 붙여넣기, 양끝 «A→B» 라벨 — A4 라벨 용지(행·열·여백 mm) 인쇄, 라벨 프린터용 CSV·텍스트.", en: "Sequences (W001–W120, X1:1–X1:40), pasted I/O names, two-end «A→B» labels — print on A4 label sheets (rows, columns, margins in mm) or export CSV and text for label printers." },
  },
  {
    path: "tools/ferrules/",
    name: { ko: "페룰·압착 단자 규격표", en: "Ferrule & Crimp Terminal Chart" },
    blurb: { ko: "mm²·AWG → 페룰 칼라 색(DIN 46228-4·프랑스 색 체계), 색 → 굵기, 링 단자 등급(1.25·2·5.5)·나사 크기. 출처 확인한 값만.", en: "mm² or AWG → ferrule collar colour (DIN 46228-4 and French code), colour → size, ring terminal class (1.25, 2, 5.5) and stud. Sourced values only." },
  },
  {
    path: "tools/panel-heat/",
    name: { ko: "제어반 발열·환기 팬 계산기", en: "Enclosure Heat & Fan Sizing Calculator" },
    blurb: { ko: "장비 손실 W 합, 외함 크기·설치 방식(IEC 60890) → 자연 방열, 필요한 팬 풍량 m³/h(해발 보정), 쿨러·히터 출력.", en: "Device heat loss total, enclosure size and installation (IEC 60890) → natural dissipation, fan airflow in m³/h (altitude-corrected), cooling unit and heater output." },
  },
  {
    path: "tools/insulation-resistance/",
    name: { ko: "절연 저항 판정", en: "Insulation Resistance Checker" },
    blurb: { ko: "SELV·PELV / 500 V 이하 / 500 V 초과 회로의 측정 전압·MΩ → 제52조·IEC 60364-6 최소값(0.5·1 MΩ)과 비교, 재기 전 안전 순서.", en: "SELV/PELV, ≤ 500 V or > 500 V circuit, test voltage and MΩ → compared with IEC 60364-6 minimums (0.5 and 1 MΩ), plus safety steps before testing." },
  },
  {
    path: "tools/metric-threads/",
    name: { ko: "미터 나사 탭 드릴·볼트 참고표", en: "Metric Thread Tap Drill & Bolt Chart" },
    blurb: { ko: "M2~M20 보통·가는 나사 피치, 탭 드릴(d − P), 육각 렌치(ISO 4762)·스패너(ISO 4032) 크기, 공구 크기 → 나사.", en: "M2–M20 coarse and fine pitch, tap drill (d − P), hex key (ISO 4762) and spanner (ISO 4032) sizes, tool size → thread." },
  },
  {
    path: "tools/modbus-rtu-tcp/",
    name: { ko: "Modbus RTU ↔ TCP 프레임 변환기", en: "Modbus RTU ↔ TCP Frame Converter" },
    blurb: { ko: "RTU(국번+CRC) ↔ TCP(MBAP: 트랜잭션·길이·유닛 ID) ↔ ASCII(«:»·LRC·CR LF). 요청·응답 모두, 바이트별 색 풀이, 게이트웨이 유닛 ID 0·255 설명.", en: "RTU (address + CRC) ↔ TCP (MBAP: transaction, length, unit ID) ↔ ASCII (colon, LRC, CR LF). Requests and responses, color-coded bytes, gateway unit ID 0 and 255 explained." },
  },
  {
    path: "tools/modbus-practice/",
    name: { ko: "Modbus 연습장 (퀴즈)", en: "Modbus Practice Quiz" },
    blurb: { ko: "신입·교육용 자동 문제 — 읽기 요청 HEX, 응답에서 40003 값, 예외 83 02 의 뜻, CRC 바이트 순서, float ABCD·CDAB. 해설·가이드 링크·점수.", en: "Auto-generated practice for beginners — read request HEX, the value of 40003 in a response, exception 83 02, CRC byte order, float ABCD vs CDAB. Explanations, guide links, score." },
  },
  {
    path: "tools/can-decoder/",
    name: { ko: "CAN 프레임 해석기 (J1939·CANopen)", en: "CAN Frame Decoder (J1939, CANopen)" },
    blurb: { ko: "candump 줄·ID DLC 데이터·원시 비트열 → 표준·확장 ID, DLC(FD 길이), 스터핑 제거·CRC15, J1939 PGN·주소·SPN, CANopen COB-ID·NMT·SDO.", en: "candump lines, ID DLC data or raw bits → standard/extended ID, DLC (FD lengths), destuffing and CRC15, J1939 PGN, addresses and SPNs, CANopen COB-ID, NMT and SDO." },
  },
  {
    path: "tools/i2c/",
    name: { ko: "I2C 도구 (풀업 저항·주소표·바이트 풀이)", en: "I2C Tools (Pull-up, Addresses, Decoder)" },
    blurb: { ko: "VDD·버스 용량·100k/400k/1M → 풀업 Rp 최소·최대(UM10204), 흔한 칩 7비트 주소표·8비트 변환, «S A0 A … P» 바이트 풀이.", en: "VDD, bus capacitance and 100k/400k/1M → pull-up Rp min and max (UM10204), 7-bit address table of common chips with 8-bit conversion, «S A0 A … P» decoder." },
  },
  {
    path: "tools/spi/",
    name: { ko: "SPI 모드 도우미 (CPOL·CPHA 파형)", en: "SPI Mode Helper (CPOL/CPHA Waveforms)" },
    blurb: { ko: "모드 0~3 → SCK·MOSI·MISO·CS 파형과 샘플·시프트 엣지, 바이트 비트(MSB/LSB first), 전송 시간, 제조사별 표기(CKE·UCCKPH).", en: "Mode 0–3 → SCK, MOSI, MISO and CS waveforms with sample and shift edges, byte bits (MSB/LSB first), transfer time, vendor notations (CKE, UCCKPH)." },
  },
  {
    path: "tools/uart-waveform/",
    name: { ko: "UART 파형 그리기", en: "UART Waveform Drawer" },
    blurb: { ko: "글자·HEX → 시작·데이터(LSB 먼저)·패리티·정지 비트 파형, TTL·RS-232 전압, 비트·프레임 시간, 펄스 폭 → 표준 보율 추정.", en: "Text or hex → start, data (LSB first), parity and stop bit waveform at TTL or RS-232 levels, bit and frame time, pulse width → standard baud." },
  },
];

export const webToolByPath = (p: string) => WEB_TOOLS.find((w) => w.path === p)!;
