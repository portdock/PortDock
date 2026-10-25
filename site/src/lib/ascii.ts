// ASCII 코드표 — 웹 도구 «ASCII 코드표·제어 문자».
// 근거: RFC 20 «ASCII format for Network Interchange»(1969) §2 코드표·§4.1 제어 문자 약어와 이름·§4.2 SP.
//   7비트(0~127)만 ASCII 다. 128~255 는 코드 페이지(ISO 8859-1, CP949 등)마다 달라 표에 넣지 않는다.
//   XON·XOFF = DC1·DC3 은 Text-Terminal-HOWTO §11(«^Q = DC1 = Xon», «^S = DC3 = Xoff»).

export interface AsciiRow {
  code: number;
  /** 제어 문자 약어(NUL…US, DEL) 또는 그 글자 자체 */
  sym: string;
  /** 제어 문자면 RFC 20 영어 이름 */
  name?: string;
  ko?: string;
  /** 제어 문자의 캐럿 표기(^@ …) */
  caret?: string;
  /** C·여러 언어의 이스케이프(\n 등) */
  esc?: string;
}

/** RFC 20 §4.1 순서 그대로(0x00~0x1F) */
const CTRL: [string, string, string][] = [
  ["NUL", "Null", "널(빈 문자)"],
  ["SOH", "Start of Heading", "머리말 시작"],
  ["STX", "Start of Text", "본문 시작"],
  ["ETX", "End of Text", "본문 끝"],
  ["EOT", "End of Transmission", "전송 끝"],
  ["ENQ", "Enquiry", "조회(응답 요청)"],
  ["ACK", "Acknowledge", "긍정 응답"],
  ["BEL", "Bell", "벨(경고음)"],
  ["BS", "Backspace", "백스페이스"],
  ["HT", "Horizontal Tabulation", "가로 탭"],
  ["LF", "Line Feed", "줄 바꿈"],
  ["VT", "Vertical Tabulation", "세로 탭"],
  ["FF", "Form Feed", "폼 피드(쪽 넘김)"],
  ["CR", "Carriage Return", "캐리지 리턴(줄 처음으로)"],
  ["SO", "Shift Out", "시프트 아웃"],
  ["SI", "Shift In", "시프트 인"],
  ["DLE", "Data Link Escape", "데이터 링크 이스케이프"],
  ["DC1", "Device Control 1", "장치 제어 1 (XON)"],
  ["DC2", "Device Control 2", "장치 제어 2"],
  ["DC3", "Device Control 3", "장치 제어 3 (XOFF)"],
  ["DC4", "Device Control 4 (Stop)", "장치 제어 4"],
  ["NAK", "Negative Acknowledge", "부정 응답"],
  ["SYN", "Synchronous Idle", "동기 유휴"],
  ["ETB", "End of Transmission Block", "전송 블록 끝"],
  ["CAN", "Cancel", "취소"],
  ["EM", "End of Medium", "매체 끝"],
  ["SUB", "Substitute", "치환"],
  ["ESC", "Escape", "이스케이프"],
  ["FS", "File Separator", "파일 구분"],
  ["GS", "Group Separator", "그룹 구분"],
  ["RS", "Record Separator", "레코드 구분"],
  ["US", "Unit Separator", "단위 구분"],
];

const ESC: Record<number, string> = { 0: "\\0", 7: "\\a", 8: "\\b", 9: "\\t", 10: "\\n", 11: "\\v", 12: "\\f", 13: "\\r", 27: "\\x1B" };

export const ASCII: AsciiRow[] = Array.from({ length: 128 }, (_, code) => {
  if (code < 32) {
    const [sym, name, ko] = CTRL[code];
    return { code, sym, name, ko, caret: "^" + String.fromCharCode(code + 64), esc: ESC[code] };
  }
  if (code === 32) return { code, sym: "SP", name: "Space", ko: "공백" };
  if (code === 127) return { code, sym: "DEL", name: "Delete", ko: "삭제", caret: "^?" };
  return { code, sym: String.fromCharCode(code) };
});

export const isControl = (code: number) => code < 32 || code === 127;

export const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");
export const bin7 = (n: number) => n.toString(2).padStart(7, "0");
export const oct3 = (n: number) => n.toString(8).padStart(3, "0");

/**
 * 표 거르기 — 검색어 하나를 글자·10진·HEX(0x41, 41h)·약어·이름으로 찾는다.
 * 한 글자면 그 글자(숫자 한 자리면 그 10진 코드도), 두 자리 숫자면 10진과 HEX 둘 다 맞춰 본다.
 */
export function filterAscii(q: string): AsciiRow[] {
  const s = q.trim();
  if (!s) return ASCII;
  if ([...s].length === 1 && s.charCodeAt(0) < 128) {
    const c = s.charCodeAt(0);
    return ASCII.filter((r) => r.code === c || (/^\d$/.test(s) && r.code === Number(s)));
  }
  const hx = s.match(/^(?:0x|\\x)([0-9a-f]{1,2})$|^([0-9a-f]{1,2})h$/i);
  if (hx) return ASCII.filter((r) => r.code === parseInt(hx[1] ?? hx[2], 16));
  const out = new Set<AsciiRow>();
  if (/^\d{1,3}$/.test(s)) {
    const d = Number(s);
    if (d < 128) out.add(ASCII[d]);
  }
  if (/^[0-9a-f]{2}$/i.test(s)) out.add(ASCII[parseInt(s, 16) & 0x7f]);
  const low = s.toLowerCase();
  for (const r of ASCII) {
    if (r.sym.toLowerCase() === low || r.caret?.toLowerCase() === low || r.esc?.toLowerCase() === low) out.add(r);
    else if (s.length >= 3 && (r.name?.toLowerCase().includes(low) || r.ko?.includes(s))) out.add(r);
  }
  return [...out].sort((a, b) => a.code - b.code);
}
