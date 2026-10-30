// 도움말 «용어» 절 — 화면에 설명 없이 나오는 낱말을 짧게. 공용 목록 하나에서 앱마다 쓰는 것만 골라 쓴다.
// 각 앱 help.ts 가 `termsSection(lang, [...])` 로 넣는다(사이트 사용법 문서에도 그대로 나간다).
// 시험: node --test shared/glossary.test.ts
import type { HelpSection } from "./HelpDialog";

type Lang = "ko" | "en";

/** 낱말 하나 — [이름, 설명] 한·영 */
interface Term {
  ko: [string, string];
  en: [string, string];
}

export const TERMS = {
  rxtx: {
    ko: ["RX · TX · B/s", "RX(◀) = 받은 것, TX(▶) = 보낸 것. B/s 는 1초에 오간 바이트 수입니다."],
    en: ["RX · TX · B/s", "RX (◀) = received, TX (▶) = sent. B/s is bytes per second."],
  },
  frame: {
    ko: ["프레임", "끊김 시간·끝 문자 등으로 끊어 본 메시지 하나 — 로그 한 줄입니다. 상태줄 «프레임 a/b» 는 받은 수/보낸 수."],
    en: ["Frame", "One message, split by idle gap, terminator and so on — one log line. «Frames a/b» in the status bar is received/sent."],
  },
  gap: {
    ko: ["끊김 시간(조용한 간격)", "이 시간(ms) 동안 아무것도 안 오면 받은 것을 한 줄로 끊습니다. USB 변환기는 16ms 쯤씩 넘겨 주므로 그보다 짧으면 한 줄이 쪼개질 수 있습니다."],
    en: ["Idle gap", "A line ends after this many ms of silence. USB adapters hand data over in ~16 ms chunks, so a shorter gap can split one message."],
  },
  crlf: {
    ko: ["CR · LF · CR LF", "줄 끝 문자. CR = 0x0D(\\r), LF = 0x0A(\\n). 장비마다 CR, LF, CR LF 중 하나를 줄 끝으로 씁니다."],
    en: ["CR · LF · CR LF", "Line-end characters. CR = 0x0D (\\r), LF = 0x0A (\\n). Each device uses CR, LF or CR LF to end a line."],
  },
  checksum: {
    ko: ["체크섬", "내용 끝에 붙여 오류를 알아보는 값(합·XOR·CRC 등). 받은 줄의 값이 맞지 않으면 «틀림» 으로 표시합니다."],
    en: ["Checksum", "A value added after the data to catch errors (sum, XOR, CRC …). A received line whose value does not match is marked as failed."],
  },
  failOnly: {
    ko: ["틀림만", "찾기 줄의 거르기 — 체크섬이 틀린 줄만 보입니다."],
    en: ["Failed only", "Filter in the find bar — shows only lines whose checksum failed."],
  },
  baud: {
    ko: ["속도(bps) · 8N1", "속도는 1초에 보내는 비트 수로, 양쪽이 같아야 합니다. 8N1 = 데이터 8비트·패리티 없음·정지 비트 1."],
    en: ["Baud (bps) · 8N1", "Bits per second; both sides must match. 8N1 = 8 data bits, no parity, 1 stop bit."],
  },
  dtrrts: {
    ko: ["DTR · RTS", "시리얼 제어선. DTR 이 켜져야 보내는 장비가 있고, RS-485 변환기는 RTS 로 보내기·받기 방향을 바꾸기도 합니다."],
    en: ["DTR · RTS", "Serial control lines. Some devices only send while DTR is on, and some RS-485 adapters switch send/receive direction with RTS."],
  },
  nagle: {
    ko: ["Nagle · 즉시 전송", "Nagle 은 TCP 가 작은 조각을 모아 한 번에 보내는 방식입니다. «즉시 전송»(Nagle 끔)이면 쓰는 즉시 보내 짧은 명령·응답이 늦지 않습니다."],
    en: ["Nagle · send immediately", "Nagle makes TCP collect small pieces and send them together. «Send immediately» (Nagle off) sends each write at once, so short commands are not delayed."],
  },
  mbap: {
    ko: ["MBAP", "Modbus TCP 메시지 앞의 머리 7바이트(트랜잭션 번호·프로토콜·길이·국번). 이 길이로 요청·응답을 하나씩 끊습니다."],
    en: ["MBAP", "The 7-byte header in front of a Modbus TCP message (transaction id, protocol, length, unit id). Its length splits requests and replies."],
  },
  datagram: {
    ko: ["데이터그램", "UDP 로 한 번에 보내는 묶음 하나. 연결 과정이 없고, 도착과 순서를 보장하지 않습니다."],
    en: ["Datagram", "One packet sent over UDP. There is no connection step, and delivery and order are not guaranteed."],
  },
  broadcast: {
    ko: ["브로드캐스트 · 멀티캐스트", "브로드캐스트는 같은 대역 모두에게(예: 192.168.0.255), 멀티캐스트는 그 무리(예: 239.0.0.1)에 들어온 쪽에만 보냅니다."],
    en: ["Broadcast · multicast", "Broadcast goes to everyone on the subnet (e.g. 192.168.0.255); multicast goes only to those who joined the group (e.g. 239.0.0.1)."],
  },
  hr: {
    ko: ["HR(보유 레지스터)", "Modbus 에서 읽고 쓰는 16비트 값 칸. 0 부터 세거나 40001 부터 부르기도 합니다(«주소 부르는 법»)."],
    en: ["HR (holding register)", "A 16-bit value in Modbus that can be read and written. Counted from 0, or called 40001 and up («address style»)."],
  },
  coils: {
    ko: ["코일 · 입력 · IR", "코일 = 읽고 쓰는 1비트, 입력(DI) = 읽기만 하는 1비트, IR(입력 레지스터) = 읽기만 하는 16비트 값."],
    en: ["Coil · input · IR", "Coil = 1 bit, read/write. Discrete input = 1 bit, read-only. IR (input register) = 16-bit value, read-only."],
  },
  fc2b0e: {
    ko: ["FC 2B/0E (장치 식별)", "Modbus 함수 43(0x2B)의 하위 14(0x0E) — 제조사·모델·버전 같은 글자를 묻고 답합니다."],
    en: ["FC 2B/0E (device identification)", "Modbus function 43 (0x2B), sub-function 14 (0x0E) — asks for text such as vendor, model and version."],
  },
  polling: {
    ko: ["폴링", "같은 읽기 요청을 정한 간격으로 되풀이해 값을 계속 새로 받는 것."],
    en: ["Polling", "Repeating the same read request at a set interval to keep the values fresh."],
  },
  timeout: {
    ko: ["타임아웃(기다림)", "응답을 기다리는 가장 긴 시간. 넘으면 «응답 없음» 으로 셉니다."],
    en: ["Timeout", "The longest time to wait for a reply. After that it counts as «no response»."],
  },
  ping: {
    ko: ["핑", "상대가 살아 있는지 묻는 작은 패킷(ICMP). 막아 둔 장비·망도 있습니다."],
    en: ["Ping", "A small packet (ICMP) asking whether a host is there. Some devices and networks block it."],
  },
  arp: {
    ko: ["ARP", "같은 대역에서 IP 로 장비의 MAC 주소를 묻는 방법. 핑을 막아 둔 장비도 이것으로 찾습니다."],
    en: ["ARP", "Asks for a device's MAC address by IP on the same subnet. It finds devices even when they block ping."],
  },
  wol: {
    ko: ["WoL(원격 켜기)", "꺼진 PC·장비를 랜으로 깨우는 신호(매직 패킷). 그 장비의 랜카드·BIOS 에서 켜 두어야 합니다."],
    en: ["WoL (Wake-on-LAN)", "A signal (magic packet) that wakes a PC or device over the network. It must be enabled in that device's adapter / BIOS."],
  },
  idn: {
    ko: ["*IDN? · *RST · *CLS", "SCPI 공통 명령 — 장비 이름 묻기 · 처음 상태로 되돌리기 · 오류·상태 기록 지우기."],
    en: ["*IDN? · *RST · *CLS", "SCPI common commands — ask the instrument's identity · reset to the initial state · clear error and status records."],
  },
  terminator: {
    ko: ["끝 문자(종단)", "명령·응답 한 줄의 끝을 알리는 문자(보통 LF 또는 CR LF). 장비와 같아야 응답 끝을 바로 알아챕니다(다르면 타임아웃까지 기다림)."],
    en: ["Terminator", "The character that ends a command or reply line (usually LF or CR LF). It must match the instrument, or each reply waits until the timeout."],
  },
  problemCode: {
    ko: ["문제 코드", "장치 관리자가 장치에 붙이는 번호. 예: 10 = 장치를 시작할 수 없음, 28 = 드라이버가 설치되지 않음."],
    en: ["Problem code", "The number Device Manager gives a device. For example 10 = the device cannot start, 28 = no driver installed."],
  },
  loopback: {
    ko: ["루프백", "보낸 것이 그대로 돌아오게 TX 와 RX 를 이은 것(어댑터 핀 2·3 등). 포트·케이블만 따로 시험할 때 씁니다."],
    en: ["Loopback", "TX wired to RX (e.g. pins 2 and 3) so whatever is sent comes back. Used to test the port and cable alone."],
  },
  mc: {
    ko: ["MC 프로토콜(SLMP) · 3E", "미쓰비시 PLC 와 이더넷으로 값을 읽고 쓰는 방식. 3E 는 그 메시지 모양 중 하나이고, 이진·ASCII 두 가지 데이터 코드가 있습니다."],
    en: ["MC protocol (SLMP) · 3E", "The way to read and write Mitsubishi PLC values over Ethernet. 3E is one of its message formats, with binary or ASCII data codes."],
  },
  device: {
    ko: ["디바이스(X·Y·M·D …)", "PLC 메모리 이름 — X 입력, Y 출력, M 내부 릴레이, D 데이터 레지스터 등. 버튼에 대면 비트/워드·몇 진수인지 나옵니다."],
    en: ["Device (X, Y, M, D …)", "PLC memory names — X inputs, Y outputs, M internal relays, D data registers and so on. Hover a button for bit/word and number base."],
  },
  c05f: {
    ko: ["C05F", "MC 프로토콜 종료 코드(오류). «자기 국 요청만 받기» 를 켜면 다른 국 앞으로 온 요청에 이 코드로 답합니다."],
    en: ["C05F", "An MC protocol end code (error). With «Own station requests only» on, requests for other stations get this code."],
  },
  gateway: {
    ko: ["게이트웨이", "이 PC 가 바깥으로 나갈 때 처음 거치는 장비 — 보통 공유기."],
    en: ["Gateway", "The first device this PC goes through to reach outside — usually the router."],
  },
  p95: {
    ko: ["95%(지연)", "잰 응답 시간 100개 중 95개가 이 값 이하 — 가끔 튀는 느린 응답을 봅니다."],
    en: ["95th percentile", "95 of every 100 measured replies are at or below this — it shows the occasional slow spike."],
  },
  jitter: {
    ko: ["흔들림 ms", "이어진 두 응답 시간 차이의 평균. 클수록 응답 시간이 들쭉날쭉합니다."],
    en: ["Jitter ms", "The average difference between consecutive reply times. Larger means less steady."],
  },
  lossRun: {
    ko: ["연속 손실", "응답 없음이 가장 길게 이어진 박자 수. 길면 그동안 끊겼던 것입니다."],
    en: ["Longest loss run", "The longest streak of missed replies, in ticks. A long run means the link was down for that time."],
  },
} satisfies Record<string, Term>;

export type TermId = keyof typeof TERMS;

/** «용어» 절 — 고른 낱말만, 고른 순서대로. id «terms» */
export function termsSection(lang: Lang, ids: readonly TermId[]): HelpSection {
  return {
    title: lang === "ko" ? "용어" : "Terms",
    id: "terms",
    body: ids.map((id) => {
      const [name, desc] = TERMS[id][lang];
      return `- ${name}: ${desc}`;
    }),
  };
}
