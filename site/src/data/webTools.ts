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
    | "tools/db/";
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
];

export const webToolByPath = (p: string) => WEB_TOOLS.find((w) => w.path === p)!;
