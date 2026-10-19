// 웹 도구(브라우저 계산기) 목록 — 웹 도구 첫 화면·가이드·도구 페이지의 «이어지는 웹 도구» 가 여기서 나온다.
import type { L } from "./tools";

export interface WebTool {
  /** 언어를 뺀 경로 */
  path: "tools/checksum/" | "tools/modbus/" | "tools/hex-ascii/";
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
];

export const webToolByPath = (p: string) => WEB_TOOLS.find((w) => w.path === p)!;
