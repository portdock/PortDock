// Modbus 풀이 문구(한국어) — Serial·TCP 상세 칸이 함께 쓴다(예전 apps/serial/src/mbwords.ts).
import { MB_FUNCS } from "./modbusBuild";
// Modbus 풀이(백엔드는 영어 키로 준다)를 화면 언어로
const KO: Record<string, string> = {
  slave: "국번",
  function: "함수",
  start: "시작 주소",
  quantity: "개수",
  "byte count": "바이트 수",
  address: "주소",
  value: "값",
  exception: "예외",
  "as request: start": "요청이라면: 시작 주소",
  "as request: quantity": "요청이라면: 개수",
  "as response: byte count": "응답이라면: 바이트 수",
  request: "요청",
  response: "응답",
  "request/response": "요청·응답(같은 모양)",
  "request or response": "요청 또는 응답(길이가 같아 둘 다 가능)",
  unknown: "알 수 없음",
};

// 영어는 백엔드 키 그대로 — 국번만 «Slave ID» 로 맞춘다(용어 통일 10/18)
const EN: Record<string, string> = { slave: "Slave ID" };

export function mbWord(k: string, lang: "ko" | "en") {
  return lang === "ko" ? (KO[k] ?? k) : (EN[k] ?? k);
}

// 함수 이름은 «Modbus 요청 만들기» 와 같은 표(shared/modbusBuild.ts)에서 — 0x17 만 따로
const FUNC_KO: Record<number, string> = {
  ...Object.fromEntries(MB_FUNCS.map((f) => [f.code, f.ko])),
  0x17: "레지스터 읽기·쓰기",
};

export function mbFunc(code: number, en: string, lang: "ko" | "en") {
  const k = FUNC_KO[code & 0x7f];
  return lang === "ko" && k ? `${k} (${en})` : en;
}
