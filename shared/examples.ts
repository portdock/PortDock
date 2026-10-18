// 예시 명령 — 빈 명령 목록의 «예시 넣기»·Serial 첫 실행 카드가 넣는다. 사용자 명령과 섞이지 않게 이름 앞에 «예:»(e.g.).
// 화면 없이 값만 — node --test shared/examples.test.ts. Modbus 바이트는 «Modbus 요청 만들기» 와 같은 함수로 만든다.
import { readReq } from "./modbusBuild.ts";
import { mbapWrap } from "./mbap.ts";
import type { PresetId } from "./serialPresets.ts";
import type { ChecksumKind } from "./format.ts";

export interface ExampleCmd {
  name: string;
  text: string;
  mode: "hex" | "ascii";
  checksum: ChecksumKind | null;
  /** 줄 끝(이스케이프 글 그대로 — «\r\n» 4글자) */
  suffix: string;
  ck: null;
  key: null;
}
type Lang = "ko" | "en";

const hex = (b: number[]) => b.map((x) => x.toString(16).toUpperCase().padStart(2, "0")).join(" ");
const P = { ko: "예: ", en: "e.g. " };
const ex = (lang: Lang, name: string, text: string, mode: "hex" | "ascii", checksum: ChecksumKind | null, suffix: string): ExampleCmd => ({ name: P[lang] + name, text, mode, checksum, suffix, ck: null, key: null });

/** 이름이 예시 이름인지(«예: »·«e.g. » 로 시작) */
export const isExampleName = (n: string) => n.startsWith(P.ko) || n.startsWith(P.en);

const at = (lang: Lang) => [
  ex(lang, lang === "ko" ? "AT (응답 확인)" : "AT (check reply)", "AT", "ascii", null, "\\r\\n"),
  ex(lang, lang === "ko" ? "ATI (장치 정보)" : "ATI (device info)", "ATI", "ascii", null, "\\r\\n"),
  ex(lang, lang === "ko" ? "AT+GMR (펌웨어 버전)" : "AT+GMR (firmware version)", "AT+GMR", "ascii", null, "\\r\\n"),
];
// 읽기만 넣는다 — 모르고 눌러도 장비 값이 바뀌지 않게
const rtuRead = (lang: Lang) => ex(lang, lang === "ko" ? "Modbus 국번 1 40001~40010 읽기 (FC03)" : "Modbus Slave ID 1 read 40001–40010 (FC03)", hex(readReq(1, 3, 0, 10)), "hex", "crc16-modbus", "");
const rtuInput = (lang: Lang) => ex(lang, lang === "ko" ? "Modbus 국번 1 30001~30002 읽기 (FC04)" : "Modbus Slave ID 1 read 30001–30002 (FC04)", hex(readReq(1, 4, 0, 2)), "hex", "crc16-modbus", "");
const idn = (lang: Lang, suffix: string) => ex(lang, lang === "ko" ? "*IDN? (SCPI 계측기 이름)" : "*IDN? (SCPI instrument ID)", "*IDN?", "ascii", null, suffix);

/** Serial — 용도 프리셋에 맞춘 예시. 일반·NMEA 는 AT·Modbus·SCPI 하나씩 */
export function serialExamples(preset: PresetId, lang: Lang): ExampleCmd[] {
  if (preset === "at") return at(lang);
  if (preset === "modbus") return [rtuRead(lang), rtuInput(lang)];
  return [at(lang)[0], rtuRead(lang), idn(lang, "\\n")];
}

/** TCP — Modbus TCP 프레임 구분이면 Modbus TCP 읽기 둘, 아니면 SCPI(포트 5025)·HTTP·Modbus TCP 하나씩 */
export function tcpExamples(modbusTcp: boolean, lang: Lang): ExampleCmd[] {
  const mb = (tid: number, fc: number, qty: number, label: string) => ex(lang, label, hex(mbapWrap(tid, readReq(1, fc, 0, qty))), "hex", null, "");
  const mb03 = mb(1, 3, 10, lang === "ko" ? "Modbus TCP 국번 1 40001~40010 읽기 (FC03)" : "Modbus TCP Slave ID 1 read 40001–40010 (FC03)");
  if (modbusTcp) return [mb03, mb(2, 4, 2, lang === "ko" ? "Modbus TCP 국번 1 30001~30002 읽기 (FC04)" : "Modbus TCP Slave ID 1 read 30001–30002 (FC04)")];
  return [idn(lang, "\\n"), ex(lang, lang === "ko" ? "HTTP 첫 페이지 요청 (포트 80)" : "HTTP request for the home page (port 80)", "GET / HTTP/1.0\\r\\n\\r\\n", "ascii", null, ""), mb03];
}

/** UDP — 글자 하나·SCPI·HEX 하나 */
export function udpExamples(lang: Lang): ExampleCmd[] {
  return [ex(lang, lang === "ko" ? "글자 hello" : "text hello", "hello", "ascii", null, ""), idn(lang, "\\n"), ex(lang, lang === "ko" ? "HEX 01 02 03 04" : "HEX 01 02 03 04", "01 02 03 04", "hex", null, "")];
}
