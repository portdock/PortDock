// pcap 해석기의 «예시 캡처» — 빌드 때 /tools/pcap-analyzer/sample.pcapng 로 내보낸다(src/pages/tools/pcap-analyzer/sample.pcapng.ts).
// 실제 현장 캡처가 아니라 pcapFixture.ts 로 바이트를 직접 만든 합성 파일이다. 주소는 사설 대역(192.168.0.x), 장비·회사 정보 없음.
// 들어 있는 것(해석기에서 보이도록):
//  · Modbus TCP 192.168.0.10 → 192.168.0.20:502 — 03 읽기 30번(응답 시간 들쭉날쭉), 예외 02 한 번, 무응답 한 번
//  · MC 3E 이진 192.168.0.10 → 192.168.0.30:5000 — D100 2워드 읽기 12번, 종료 코드 C059 한 번
//  · 산업 통신이 아닌 UDP 패킷 몇 개(개수만 세어지는 것)
// 시험: pcapAnalyze.test.ts «예시 캡처».
import { TcpConv, pcapng, wrap, ipv4, mbap, mc3eReq, mc3eResp, type Rec } from "./pcapFixture.ts";

/** 2026-10-01 09:00:00 KST */
const T0 = 1790812800;

export function samplePcapng(): Uint8Array {
  const recs: Rec[] = [];

  // ---- Modbus TCP
  const mb = new TcpConv("192.168.0.10", 50312, "192.168.0.20", 502).handshake(T0);
  // 응답 시간(ms) — 대부분 8~20ms, 가끔 느림
  const rts = [12, 9, 15, 11, 38, 10, 13, 9, 17, 12, 8, 11, 64, 10, 14, 12, 9, 22, 11, 10, 13, 95, 12, 9, 16, 11, 10, 12, 14, 9];
  let tid = 1;
  for (let i = 0; i < rts.length; i++) {
    const t = T0 + 0.5 + i * 0.5;
    const id = tid++;
    if (i === 7) {
      // 없는 주소 — 예외 02(Illegal Data Address)
      mb.c2s(t, mbap(id, 1, [0x03, 0x27, 0x10, 0x00, 0x02]));
      mb.s2c(t + 0.006, mbap(id, 1, [0x83, 0x02]));
      continue;
    }
    if (i === 19) {
      // 응답이 오지 않은 요청
      mb.c2s(t, mbap(id, 1, [0x03, 0x00, 0x00, 0x00, 0x0a]));
      continue;
    }
    mb.c2s(t, mbap(id, 1, [0x03, 0x00, 0x00, 0x00, 0x0a]));
    const words: number[] = [];
    for (let w = 0; w < 10; w++) words.push(0x00, (i * 7 + w * 3) & 0xff);
    mb.s2c(t + rts[i] / 1000, mbap(id, 1, [0x03, 20, ...words]));
  }
  recs.push(...mb.recs());

  // ---- MC 3E 이진
  const mc = new TcpConv("192.168.0.10", 50318, "192.168.0.30", 5000).handshake(T0 + 0.2);
  // 0401 일괄 읽기(워드) D100 부터 2점: 명령 0401 · 서브 0000 · 디바이스 번호 100 · 코드 A8(D) · 점수 2
  const readD100 = mc3eReq([0x01, 0x04, 0x00, 0x00, 0x64, 0x00, 0x00, 0xa8, 0x02, 0x00]);
  const mcRts = [6, 7, 5, 9, 6, 31, 7, 6, 8, 5, 7, 6];
  for (let i = 0; i < mcRts.length; i++) {
    const t = T0 + 0.75 + i * 1.2;
    if (i === 4) {
      // 받는 쪽이 지원하지 않는 서브커맨드 — 종료 코드 C059, 오류 정보 9바이트(네트워크·PC·I/O·국·명령·서브)
      mc.c2s(t, mc3eReq([0x01, 0x04, 0x09, 0x00, 0x64, 0x00, 0x00, 0xa8, 0x02, 0x00]));
      mc.s2c(t + 0.005, mc3eResp(0xc059, [0x00, 0xff, 0xff, 0x03, 0x00, 0x01, 0x04, 0x09, 0x00]));
      continue;
    }
    mc.c2s(t, readD100);
    mc.s2c(t + mcRts[i] / 1000, mc3eResp(0, [(i * 5) & 0xff, 0x00, 0x2c, 0x01]));
  }
  recs.push(...mc.recs());

  // ---- 산업 통신이 아닌 것(내용은 풀지 않고 개수만)
  for (let i = 0; i < 4; i++) {
    const ip = ipv4({ src: "192.168.0.10", dst: "224.0.0.251", sport: 5353, dport: 5353, udp: true, payload: new Array(12).fill(0), ipId: 7000 + i });
    recs.push({ t: T0 + 3 + i * 4, data: wrap(1, ip) });
  }

  recs.sort((a, b) => a.t - b.t);
  return pcapng([{ link: 1 }], recs);
}
