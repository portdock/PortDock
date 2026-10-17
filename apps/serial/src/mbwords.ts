// Modbus 풀이(백엔드는 영어 키로 준다)를 화면 언어로
const KO: Record<string, string> = {
  slave: "국번(슬레이브)",
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

export function mbWord(k: string, lang: "ko" | "en") {
  return lang === "ko" ? (KO[k] ?? k) : k;
}

const FUNC_KO: Record<number, string> = {
  0x01: "코일 읽기",
  0x02: "입력 접점 읽기",
  0x03: "보유 레지스터 읽기",
  0x04: "입력 레지스터 읽기",
  0x05: "코일 하나 쓰기",
  0x06: "레지스터 하나 쓰기",
  0x0f: "코일 여러 개 쓰기",
  0x10: "레지스터 여러 개 쓰기",
  0x17: "레지스터 읽기·쓰기",
};

export function mbFunc(code: number, en: string, lang: "ko" | "en") {
  const k = FUNC_KO[code & 0x7f];
  return lang === "ko" && k ? `${k} (${en})` : en;
}
