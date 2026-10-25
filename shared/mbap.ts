// Modbus TCP(MBAP) 요청 만들기 — 화면 없이 바이트만. «Modbus 요청 만들기»(TCP)와 시험(node --test shared/mbap.test.ts)이 쓴다.
import { buildRequest, type MbForm, type MbResult } from "./modbusBuild.ts";

/** 국번 + PDU(CRC 없이) → MBAP 머리(트랜잭션 2 · 프로토콜 0 · 길이 2)를 붙인 Modbus TCP 요청 */
export function mbapWrap(tid: number, unitPdu: number[]): number[] {
  const t = tid & 0xffff;
  const len = unitPdu.length;
  return [t >> 8, t & 0xff, 0, 0, (len >> 8) & 0xff, len & 0xff, ...unitPdu];
}

/** TCP: 국번(MBAP Unit ID) 0·248~255 도 쓴다(1~247 검사는 RTU 규칙) — 국번 1 로 만들고 첫 바이트만 바꾼다 */
export function buildTcpRequest(form: MbForm, tid: number, lang: "ko" | "en"): MbResult {
  const unit = Math.max(0, Math.min(255, Math.trunc(form.slave)));
  const r = buildRequest({ ...form, slave: 1 }, lang);
  if (!r.bytes) return r;
  return { ...r, bytes: mbapWrap(tid, [unit, ...r.bytes.slice(1)]) };
}

/** MBAP 모양(프로토콜 0, 길이 칸 = 나머지 길이)인지 — 백엔드 tcp::is_mbap 과 같다 */
export const isMbap = (b: number[]) => b.length >= 8 && b[2] === 0 && b[3] === 0 && ((b[4] << 8) | b[5]) === b.length - 6;
