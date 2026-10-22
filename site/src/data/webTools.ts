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
    | "tools/temperature/";
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
];

export const webToolByPath = (p: string) => WEB_TOOLS.find((w) => w.path === p)!;
