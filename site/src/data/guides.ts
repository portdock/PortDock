// 가이드 글 — 검색으로 들어오는 현장 질문에 답한다. 예시 바이트·CRC 는 lib/checksum.ts 로 계산해 확인한 값만 쓴다.
import type { Lang, Tool } from "./tools";
import type { Device } from "@shared/devices";
import { DEVICES } from "./devices";

/** 본문 덩어리: 문단 · 소제목 · 목록 · 코드(바이트) · 표 · 그림 */
export type Block =
  | { p: string }
  | { h: string }
  | { ul: string[] }
  | { code: string }
  /** 표 — 첫 칸은 바이트·코드라 고정폭 글꼴, 글로 된 첫 칸이면 plain */
  | { table: { head: string[]; rows: string[][]; plain?: boolean } }
  /** 설명 그림 — public/img/guides/ 의 손으로 그린 SVG(언어별 파일), w·h 는 viewBox 크기 */
  | { fig: { src: string; w: number; h: number; alt: string; cap: string } };

export interface Guide {
  slug: string;
  date: string;
  /** 이 글과 이어지는 도구(id) — 첫째가 대표. 도구 페이지 «관련 가이드» 도 이 값으로 고른다 */
  tools: Tool["id"][];
  /** 이어 읽을 가이드(slug) */
  related: string[];
  /** 이어지는 웹 도구(언어를 뺀 경로, 예: "tools/modbus/") */
  webTools?: string[];
  /** 장비 레지스터 맵(/devices/)으로 잇는다 — Modbus 글 */
  devices?: boolean;
  /** 이 종류의 장비 페이지와 서로 잇는다(예: 인버터 글 ↔ 인버터 장비 맵) */
  deviceKinds?: Device["kind"][];
  title: Record<Lang, string>;
  /** 검색 결과 제목(«— PortDock» 까지 통째로) — 본문 제목이 길 때만 */
  seoTitle?: Partial<Record<Lang, string>>;
  desc: Record<Lang, string>;
  body: Record<Lang, Block[]>;
}

export const GUIDES: Guide[] = [
  {
    slug: "modbus-rtu-frame",
    date: "2026-10-17",
    tools: ["serial", "modbus-master", "modbus-slave"],
    related: ["modbus-address-notation", "modbus-function-codes", "modbus-no-response", "usb-serial-latency", "modbus-exception-codes"],
    webTools: ["tools/modbus/", "tools/checksum/"],
    devices: true,
    title: { ko: "Modbus RTU 프레임 읽는 법 — 요청·응답·예외·CRC", en: "Reading Modbus RTU frames — request, response, exception, CRC" },
    seoTitle: { en: "Modbus RTU Frame Explained: Request, Response, CRC — PortDock" },
    desc: {
      ko: "«01 03 00 00 00 02 C4 0B» 한 줄을 바이트 하나씩 풀어 봅니다. 주소·함수·시작 주소·개수·CRC 순서와 예외 응답, 40001 표기까지.",
      en: "Decode «01 03 00 00 00 02 C4 0B» byte by byte: address, function, start, quantity, CRC, exception replies and the 40001 notation.",
    },
    body: {
      ko: [
        { p: "Modbus RTU 는 시리얼(RS-485·RS-232)로 주고받는 바이너리 프로토콜입니다. 마스터(PLC·HMI·PC)가 요청을 보내면, 주소가 맞는 슬레이브 하나만 답합니다. 장비 설명서의 레지스터 표만 있으면 직접 요청을 만들 수 있습니다." },
        { h: "요청: 보유 레지스터 2개 읽기" },
        { code: "01 03 00 00 00 02 C4 0B" },
        {
          table: {
            head: ["바이트", "뜻"],
            rows: [
              ["01", "국번(슬레이브 ID) 1"],
              ["03", "함수 03 — 보유 레지스터 읽기"],
              ["00 00", "시작 주소 0 (높은 바이트 먼저)"],
              ["00 02", "개수 2"],
              ["C4 0B", "CRC16 — 낮은 바이트 먼저"],
            ],
          },
        },
        { h: "응답: 값 100, 200" },
        { code: "01 03 04 00 64 00 C8 BA 7A" },
        {
          table: {
            head: ["바이트", "뜻"],
            rows: [
              ["01 03", "같은 주소·함수"],
              ["04", "뒤따르는 데이터 바이트 수 (레지스터 2개 × 2)"],
              ["00 64", "첫 레지스터 = 100"],
              ["00 C8", "둘째 레지스터 = 200"],
              ["BA 7A", "CRC16"],
            ],
          },
        },
        { fig: { src: "/img/guides/modbus-rtu-frame.ko.svg", w: 780, h: 310, alt: "Modbus RTU 요청 01 03 00 00 00 02 C4 0B 와 응답 01 03 04 00 64 00 C8 BA 7A 를 국번·함수·시작 주소·개수·바이트 수·레지스터 값·CRC 칸으로 나눈 바이트 띠 그림", cap: "요청과 응답을 바이트 칸으로 나눈 그림. CRC16 은 국번부터 마지막 데이터까지 계산하고 낮은 바이트를 먼저 붙입니다." } },
        { h: "예외 응답" },
        { p: "요청을 처리할 수 없으면 슬레이브는 함수 번호에 0x80 을 더하고 예외 코드를 붙여 답합니다. 아래는 «없는 주소(02)» 입니다." },
        { code: "01 83 02 C0 F1" },
        { ul: ["01 — 지원하지 않는 함수", "02 — 없는 주소(범위 밖)", "03 — 잘못된 값(개수 초과 등)", "04 — 장비 내부 오류"] },
        { h: "40001 은 주소 0 입니다" },
        { p: "설명서의 «40001» 은 «보유 레지스터의 첫 번째» 라는 표기이고, 실제로 보내는 주소는 0 입니다. 40010 이면 9, 30001(입력 레지스터)은 함수 04 의 주소 0 입니다. 값이 한 칸씩 어긋나 보이면 이 표기부터 확인하세요." },
        { h: "CRC 와 바이트 순서" },
        { p: "CRC16 Modbus 는 다항식 0xA001(역순), 초깃값 0xFFFF 로 주소부터 마지막 데이터까지 계산하고, 결과의 낮은 바이트를 먼저 보냅니다. 위 요청의 CRC 값은 0x0BC4 이고 줄에는 «C4 0B» 로 붙습니다. 직접 확인하려면 CRC·체크섬 계산기에 «01 03 00 00 00 02» 를 넣어 보세요." },
        { h: "프레임 사이 조용한 간격(끊김 시간)" },
        { p: "RTU 는 3.5 문자 시간 동안 아무것도 오지 않으면 한 프레임이 끝난 것으로 봅니다. 한 문자는 11비트(시작·데이터 8·패리티 또는 정지·정지)입니다." },
        {
          table: {
            head: ["속도", "1문자", "3.5문자", "8바이트 요청 전송"],
            rows: [
              ["9600", "1.15 ms", "4.0 ms", "9.2 ms"],
              ["19200", "0.57 ms", "2.0 ms", "4.6 ms"],
              ["38400", "0.29 ms", "1.0 ms (규격 권장 1.75 ms)", "2.3 ms"],
              ["115200", "0.10 ms", "0.33 ms (규격 권장 1.75 ms)", "0.8 ms"],
            ],
          },
        },
        { p: "19200 bps 를 넘으면 규격은 3.5 문자 대신 1.75 ms 를 쓰도록 권합니다. USB 변환기를 쓰면 데이터가 몇 ms 단위로 묶여 오기 때문에 이 시간이 깨지기 쉽습니다 — 다음 글을 보세요." },
      ],
      en: [
        { p: "Modbus RTU is a binary protocol over serial lines (RS-485, RS-232). The master (PLC, HMI, PC) sends a request and only the slave with the matching address replies. With the register map from the device manual you can build requests yourself." },
        { h: "Request: read 2 holding registers" },
        { code: "01 03 00 00 00 02 C4 0B" },
        {
          table: {
            head: ["Bytes", "Meaning"],
            rows: [
              ["01", "Slave ID 1"],
              ["03", "Function 03 — read holding registers"],
              ["00 00", "Start address 0 (high byte first)"],
              ["00 02", "Quantity 2"],
              ["C4 0B", "CRC16 — low byte first"],
            ],
          },
        },
        { h: "Response: values 100 and 200" },
        { code: "01 03 04 00 64 00 C8 BA 7A" },
        {
          table: {
            head: ["Bytes", "Meaning"],
            rows: [
              ["01 03", "Same address and function"],
              ["04", "Data byte count (2 registers × 2)"],
              ["00 64", "First register = 100"],
              ["00 C8", "Second register = 200"],
              ["BA 7A", "CRC16"],
            ],
          },
        },
        { fig: { src: "/img/guides/modbus-rtu-frame.en.svg", w: 780, h: 310, alt: "Byte-strip diagram of the Modbus RTU request 01 03 00 00 00 02 C4 0B and response 01 03 04 00 64 00 C8 BA 7A, split into slave ID, function, start address, quantity, byte count, register values and CRC", cap: "The request and response split into byte fields. CRC16 covers the slave ID through the last data byte and is sent low byte first." } },
        { h: "Exception replies" },
        { p: "When a request cannot be served, the slave adds 0x80 to the function code and appends an exception code. This one is «illegal data address (02)»." },
        { code: "01 83 02 C0 F1" },
        { ul: ["01 — illegal function", "02 — illegal data address (out of range)", "03 — illegal data value (e.g. quantity too large)", "04 — slave device failure"] },
        { h: "40001 means address 0" },
        { p: "«40001» in a manual means «the first holding register»; the address on the wire is 0. 40010 is 9, and 30001 (input registers) is address 0 with function 04. If values look shifted by one, check this notation first." },
        { h: "CRC and byte order" },
        { p: "CRC16 Modbus uses polynomial 0xA001 (reflected) and initial value 0xFFFF over everything from the address to the last data byte, and the low byte is sent first. The CRC above is 0x0BC4 and appears as «C4 0B». Try «01 03 00 00 00 02» in the CRC calculator to check." },
        { h: "The silent interval between frames" },
        { p: "RTU ends a frame after 3.5 character times of silence. One character is 11 bits (start, 8 data, parity or stop, stop)." },
        {
          table: {
            head: ["Baud", "1 char", "3.5 chars", "8-byte request on the wire"],
            rows: [
              ["9600", "1.15 ms", "4.0 ms", "9.2 ms"],
              ["19200", "0.57 ms", "2.0 ms", "4.6 ms"],
              ["38400", "0.29 ms", "1.0 ms (spec recommends 1.75 ms)", "2.3 ms"],
              ["115200", "0.10 ms", "0.33 ms (spec recommends 1.75 ms)", "0.8 ms"],
            ],
          },
        },
        { p: "Above 19200 bps the specification recommends a fixed 1.75 ms instead of 3.5 characters. USB adapters deliver data in chunks of several milliseconds, which easily breaks this timing — see the next guide." },
      ],
    },
  },
  {
    slug: "usb-serial-latency",
    date: "2026-10-17",
    tools: ["modbus-slave", "serial", "modbus-master"],
    related: ["modbus-no-response", "modbus-rtu-frame", "rs485-wiring", "modbus-rtu-timeout-polling"],
    webTools: ["tools/serial-timing/", "tools/uart-baud/"],
    seoTitle: { ko: "USB-시리얼 변환기 지연 — 프레임이 쪼개지는 이유 — PortDock", en: "USB-Serial Adapter Latency: Split Frames, Late Replies — PortDock" },
    title: { ko: "USB-시리얼 변환기 지연 — 프레임이 쪼개지고 응답이 늦는 이유", en: "USB-serial adapter latency — why frames split and replies arrive late" },
    desc: {
      ko: "USB 변환기는 받은 바이트를 바로 넘기지 않고 묶어서 보냅니다. FTDI 의 Latency Timer 16 ms 가 Modbus RTU 프레임 구분과 응답 시간에 주는 영향과 대처법.",
      en: "USB adapters batch received bytes instead of passing them on at once. How the FTDI 16 ms latency timer affects Modbus RTU framing and replies, and what to do.",
    },
    body: {
      ko: [
        { p: "USB 는 정해진 주기로 데이터를 묶어 주고받습니다. 그래서 USB-시리얼 변환기는 선로에서 받은 바이트를 하나씩 바로 PC 로 넘기지 않고, 버퍼가 차거나 일정 시간이 지나면 한꺼번에 넘깁니다. FTDI 칩은 이 시간을 «Latency Timer» 라고 부르며 기본값이 16 ms 입니다." },
        { h: "무엇이 문제인가" },
        { ul: ["프레임이 쪼개집니다: 9600 bps 에서 17바이트 요청은 선로에서 약 19 ms 걸립니다. 변환기가 16 ms 마다 넘기면 PC 에는 두 덩어리로 도착하고, 그 사이 틈이 3.5 문자(4 ms)보다 길어 RTU 프레임이 둘로 나뉩니다. 두 조각 모두 CRC 가 틀려 버려집니다.", "프레임이 합쳐집니다: 반대로 짧은 응답 여러 개가 한 덩어리로 묶여 와서 하나처럼 보일 수 있습니다.", "응답이 늦습니다: 요청을 보내고 받는 데 최대 몇십 ms 가 더 걸립니다. 타임아웃을 짧게 잡은 마스터는 «응답 없음» 으로 봅니다."] },
        { h: "대처법" },
        { ul: ["FTDI: 장치 관리자 → 포트(COM) → 해당 포트 속성 → 포트 설정 → 고급 → Latency Timer 를 16 에서 1~4 ms 로 낮춥니다. 다른 칩(CH340·CP210x 등)은 드라이버마다 설정이 다릅니다.", "프레임을 시간 말고 길이로 끊습니다: Modbus 요청은 함수 번호로 길이를 알 수 있습니다(읽기·단일 쓰기 8바이트, 여러 개 쓰기 7 + 바이트 수 + 2). PortDock Modbus Slave 는 이 방식으로 요청을 다시 합치고, USB 포트이면 최소 간격을 20 ms 로 잡습니다.", "프레임 구분 시간을 넉넉히: 시간으로 끊는 도구라면 USB 변환기에서는 끊김 시간(조용한 간격)을 20 ms 안팎으로 둡니다. PortDock Serial 은 USB 포트에서 이 점을 안내합니다.", "마스터 타임아웃에 여유를: 장비 응답 시간 + 변환기 지연(왕복 최대 2 × Latency Timer)을 더해 잡습니다."] },
        { h: "어떻게 알아보나" },
        { p: "통신 기록에서 한 요청이 두 줄로 나뉘어 찍히고 둘 다 «CRC 틀림» 이면 쪼개진 것입니다. 받은 줄의 시각 간격이 거의 16 ms 단위로 끊겨 있으면 Latency Timer 의 영향입니다." },
      ],
      en: [
        { p: "USB moves data in scheduled batches. A USB-serial adapter therefore does not pass every received byte to the PC immediately; it sends a batch when its buffer fills or a timer expires. FTDI chips call this the «Latency Timer», 16 ms by default." },
        { h: "What goes wrong" },
        { ul: ["Frames split: at 9600 bps a 17-byte request takes about 19 ms on the wire. If the adapter hands data over every 16 ms, the PC gets two chunks with a gap longer than 3.5 characters (4 ms), so the RTU frame splits in two and both halves fail the CRC.", "Frames merge: several short replies can arrive in one chunk and look like one frame.", "Replies arrive late: a request-response round trip can take tens of milliseconds longer. A master with a tight timeout reports «no response»."] },
        { h: "What to do" },
        { ul: ["FTDI: Device Manager → Ports (COM) → port Properties → Port Settings → Advanced → lower Latency Timer from 16 to 1–4 ms. Other chips (CH340, CP210x …) differ by driver.", "Frame by length, not time: Modbus requests reveal their length from the function code (reads and single writes 8 bytes, multiple writes 7 + byte count + 2). PortDock Modbus Slave reassembles requests this way and uses a 20 ms minimum gap on USB ports.", "Give time-based framing more room: with USB adapters set the idle gap to about 20 ms. PortDock Serial points this out on USB ports.", "Give the master's timeout headroom: device response time + adapter latency (up to 2 × latency timer per round trip)."] },
        { h: "How to recognise it" },
        { p: "If one request appears as two lines in the log and both show «CRC FAIL», it was split. Line timestamps clustering at roughly 16 ms steps point to the latency timer." },
      ],
    },
  },
  {
    slug: "rs485-wiring",
    date: "2026-10-17",
    tools: ["serial", "modbus-master"],
    related: ["rs232-rs422-rs485", "rs485-bias-termination", "modbus-no-response", "usb-serial-latency", "modbus-rtu-frame"],
    webTools: ["tools/rs485/"],
    seoTitle: { ko: "RS485 통신이 안 될 때 — 배선 점검 다섯 가지 — PortDock", en: "RS-485 Wiring Checks: No Reply or Garbled Data — PortDock" },
    title: { ko: "RS-485 배선 점검 — 응답이 없거나 깨질 때 먼저 볼 다섯 가지", en: "RS-485 wiring checks — five things to look at when replies are missing or garbled" },
    desc: {
      ko: "A/B 극성, 종단 저항, 바이어스, 공통 접지, 배선 모양. 프로그램을 의심하기 전에 확인할 RS-485 배선 문제와 증상.",
      en: "A/B polarity, termination, biasing, common ground and topology. RS-485 wiring problems and their symptoms, before you blame the software.",
    },
    body: {
      ko: [
        { p: "RS-485 는 두 선의 전압 차이로 신호를 보내는 방식이라 길고 시끄러운 현장에서도 잘 버팁니다. 대신 배선이 조금만 어긋나도 «아무 응답 없음» 이나 «가끔 CRC 틀림» 처럼 소프트웨어 문제로 보이는 증상이 납니다. 통신 프로그램을 의심하기 전에 아래를 먼저 보세요." },
        { h: "1. A/B 극성" },
        { p: "선 이름이 제조사마다 다릅니다. A/B, D+/D−, Data+/Data− 가 섞여 쓰이고, 어떤 회사의 A 가 다른 회사의 B 인 경우도 흔합니다. 응답이 전혀 없으면 두 선을 바꿔 꽂아 보는 것이 가장 빠른 확인입니다. 극성이 반대여도 장비가 망가지지는 않습니다." },
        { h: "2. 종단 저항 (120 Ω)" },
        { p: "선로 양 끝 두 곳에만 120 Ω 저항을 둡니다. 중간 장비마다 달거나 하나도 없으면 신호가 반사돼 긴 선·빠른 속도에서 바이트가 깨집니다. 짧은 선(수 m)·느린 속도(9600 bps)에서는 없어도 동작하는 경우가 많아, 나중에 선을 늘리면서 문제가 생기기도 합니다." },
        { fig: { src: "/img/guides/rs485-bus.ko.svg", w: 780, h: 345, alt: "마스터 하나와 슬레이브 세 대를 A·B·GND 세 선으로 차례로 이은 2선식 RS-485 버스, 선로 양 끝의 A–B 사이에 120 Ω 종단 저항", cap: "2선식 RS-485 버스. 장비를 A·B·GND 로 차례로 잇고, 종단 저항 120 Ω 은 선로 양 끝 두 곳에만 둡니다." } },
        { h: "3. 바이어스(Fail-safe)" },
        { p: "아무도 보내지 않을 때 선로가 떠 있으면 수신기가 잡음을 데이터로 읽어 엉뚱한 바이트(흔히 00·FF)가 들어옵니다. 마스터 쪽이나 변환기에 바이어스 저항(풀업·풀다운)이 있는지 확인합니다. 많은 USB-RS485 변환기는 스위치나 점퍼로 켭니다." },
        { h: "4. 공통 접지(GND)" },
        { p: "«두 선이면 된다» 고 하지만, 장비끼리 접지 전위가 다르면 수신기 허용 범위를 넘어 통신이 끊기거나 장비가 상할 수 있습니다. 세 번째 선(신호 접지)을 함께 연결하는 것이 안전합니다." },
        { h: "5. 배선 모양: 한 줄로 이어 가기" },
        { p: "RS-485 는 장비를 한 줄로 차례로 잇는(데이지 체인) 방식이 기본입니다. 한 점에서 여러 갈래로 뻗는 별(스타) 모양이나 긴 가지선은 반사를 만듭니다. 표준 송수신기 기준으로 한 선로에 32대(단위 부하)까지, 길이는 느린 속도에서 약 1200 m 까지가 일반적인 기준입니다." },
        { fig: { src: "/img/guides/rs485-topology.ko.svg", w: 780, h: 290, alt: "RS-485 배선 모양 비교: 양 끝을 종단한 데이지 체인은 올바름, 한 점에서 뻗는 스타 배선과 긴 가지선은 잘못된 예", cap: "올바른 데이지 체인과 반사를 만드는 두 가지 잘못된 배선 — 스타(별) 모양과 긴 가지선." } },
        { h: "증상으로 찾기" },
        {
          table: {
            plain: true,
            head: ["증상", "먼저 볼 것"],
            rows: [
              ["응답이 전혀 없음", "A/B 극성, 국번·속도·패리티, 변환기 방향 제어"],
              ["보낼 때마다 내가 보낸 바이트가 그대로 돌아옴", "2선식 반이중의 에코 — 변환기 설정 또는 프로그램에서 내 송신 무시"],
              ["가끔 CRC 틀림", "종단 저항, 접지, 선 길이·속도, 주변 인버터 잡음"],
              ["대기 중에 00·FF 같은 쓰레기 바이트", "바이어스 저항"],
              ["가까운 장비만 됨", "종단·배선 모양(가지선), 장비 수"],
            ],
          },
        },
        { h: "반이중의 방향 제어" },
        { p: "2선식 RS-485 는 같은 두 선으로 보내고 받습니다. 그래서 보낼 때만 송신기를 켜는 «방향 제어» 가 필요합니다. 요즘 USB 변환기는 대부분 자동으로 하지만, RTS 신호로 방향을 바꾸는 오래된 변환기는 프로그램이 RTS 를 정확한 시각에 켜고 꺼야 합니다. 응답의 앞부분이 잘린다면 이 부분을 의심하세요." },
      ],
      en: [
        { p: "RS-485 signals with the voltage difference between two wires, so it survives long, noisy runs. A small wiring mistake, however, shows up as «no reply» or «occasional CRC errors», which look like software problems. Check these before you blame the program." },
        { h: "1. A/B polarity" },
        { p: "Wire names differ by vendor: A/B, D+/D−, Data+/Data−, and one vendor's A is often another's B. If nothing answers at all, swapping the two wires is the fastest test. Reversed polarity does not damage the devices." },
        { h: "2. Termination (120 Ω)" },
        { p: "Put a 120 Ω resistor at the two physical ends of the line only. One at every device, or none at all, causes reflections that corrupt bytes on long lines and at high speeds. Short runs (a few metres) at 9600 bps often work without it, so problems may appear only after the cable is extended." },
        { fig: { src: "/img/guides/rs485-bus.en.svg", w: 780, h: 345, alt: "Two-wire RS-485 bus: one master and three slaves chained on A, B and GND, with 120 Ω termination resistors across A–B at both ends of the line", cap: "A two-wire RS-485 bus. Devices are chained on A, B and GND; the 120 Ω terminators sit at the two ends of the line only." } },
        { h: "3. Biasing (fail-safe)" },
        { p: "When nobody transmits, a floating line lets receivers read noise as data, producing stray bytes (often 00 or FF). Check that the master or the adapter provides bias resistors (pull-up/pull-down). Many USB-RS485 adapters enable them with a switch or jumper." },
        { h: "4. Common ground" },
        { p: "«Two wires are enough» is a common belief, but if the devices' ground potentials differ, the receivers' common-mode range can be exceeded, breaking communication or even damaging devices. Connecting a third wire for signal ground is the safe choice." },
        { h: "5. Topology: daisy chain" },
        { p: "RS-485 expects devices to be chained one after another. Star wiring or long stubs create reflections. With standard transceivers the usual limits are 32 devices (unit loads) per line and about 1200 m at low speeds." },
        { fig: { src: "/img/guides/rs485-topology.en.svg", w: 780, h: 290, alt: "RS-485 topologies compared: a daisy chain terminated at both ends is correct; star wiring from one point and a long stub are wrong", cap: "The correct daisy chain and two layouts that cause reflections — a star and a long stub." } },
        { h: "Find it by symptom" },
        {
          table: {
            plain: true,
            head: ["Symptom", "Check first"],
            rows: [
              ["No reply at all", "A/B polarity, address, baud rate, parity, adapter direction control"],
              ["Every byte I send comes straight back", "Half-duplex echo — adapter setting, or ignore own transmission in software"],
              ["Occasional CRC errors", "Termination, ground, cable length vs speed, inverter noise nearby"],
              ["Garbage bytes (00, FF) while idle", "Bias resistors"],
              ["Only nearby devices work", "Termination, topology (stubs), number of devices"],
            ],
          },
        },
        { h: "Direction control in half duplex" },
        { p: "Two-wire RS-485 sends and receives on the same pair, so the transmitter must be enabled only while sending. Most current USB adapters do this automatically; older ones switch direction with the RTS line, and the software must toggle RTS at exactly the right moment. If the start of replies is cut off, suspect this." },
      ],
    },
  },
  // 근거: apps/modbus-master/src/help.ts «예외와 오류 읽는 법»·«타임아웃·재시도»·«문제 해결», apps/netscan/src/help.ts(502·Unit ID 1→255·접속 수),
  // apps/tcp/src/help.ts(방화벽), data/devices/*.json 의 comm·notes(출하 통신값·쪽 번호)
  {
    slug: "modbus-no-response",
    date: "2026-10-19",
    tools: ["modbus-master", "modbus-slave", "netscan"],
    related: ["modbus-tcp-connection", "rs485-wiring", "modbus-address-notation", "usb-serial-latency", "modbus-rtu-timeout-polling", "modbus-exception-codes"],
    webTools: ["tools/modbus/", "tools/checksum/", "tools/serial-timing/"],
    devices: true,
    title: { ko: "Modbus 응답이 없을 때 — 점검 순서 (RTU·TCP)", en: "No reply from a Modbus device — a checklist for RTU and TCP" },
    seoTitle: { ko: "Modbus 응답 없음·타임아웃 점검 순서 (RTU·TCP) — PortDock", en: "Modbus Timeout or No Response: Checklist (RTU/TCP) — PortDock" },
    desc: {
      ko: "타임아웃만 날 때 무엇부터 볼까. 통신 기록에 무엇이 돌아오는지로 범위를 좁히고 국번·속도·패리티·배선, IP·포트·Unit ID, 장비 쪽 Modbus 설정 순서로 확인합니다.",
      en: "Every request times out? Narrow it down by what comes back, then check slave ID, baud, parity, wiring, IP, port, unit ID and the device's Modbus settings.",
    },
    body: {
      ko: [
        { p: "마스터가 요청을 보냈는데 아무것도 오지 않으면 화면에는 «타임아웃» 한 줄만 남습니다. 원인은 배선부터 장비 설정까지 여러 층에 있으므로, 통신 기록을 보고 범위부터 좁히는 것이 빠릅니다. 아래 순서는 PortDock Modbus Master 도움말의 문제 해결 항목과, 이 사이트의 장비 레지스터 맵을 만들며 매뉴얼에서 확인한 사례를 묶은 것입니다." },
        { h: "0. 먼저: 무엇이라도 돌아오는가" },
        {
          table: {
            plain: true,
            head: ["통신 기록", "뜻", "볼 곳"],
            rows: [
              ["TX 만 있고 RX 가 전혀 없음", "장비가 요청을 못 알아들었거나, 자기 것이 아니라고 봄", "1 ~ 5"],
              ["RX 는 오는데 CRC 오류", "바이트는 오가지만 깨짐", "2(속도·패리티), RS-485 배선"],
              ["보낸 바이트가 그대로 돌아옴", "2선식 RS-485 변환기의 에코", "변환기 설정(PortDock Modbus Master 는 에코를 알아서 건너뜀)"],
              ["예외 응답(함수 + 0x80)", "통신은 정상, 요청 내용이 장비와 안 맞음", "6"],
              ["가끔만 타임아웃", "타이밍·잡음", "7"],
            ],
          },
        },
        { h: "1. 국번(슬레이브 ID)" },
        { p: "요청의 첫 바이트가 장비 국번과 다르면 장비는 오류도 없이 조용히 무시합니다. 장비 설정 메뉴의 국번을 확인하고, 모르면 국번을 차례로 물어봅니다(PortDock Modbus Master «찾기… → 국번 찾기», 국번마다 기다림 기본 200 ms — 예외로 답해도 «장비 있음» 으로 봅니다). 국번 0 은 브로드캐스트라서 장비가 받아도 답하지 않습니다." },
        { h: "2. 속도·데이터 비트·패리티·정지 비트" },
        { p: `하나라도 다르면 장비가 바이트를 제대로 읽지 못해 답하지 않거나, 답이 와도 CRC 가 틀립니다. 출하값은 장비마다 다릅니다. 이 사이트의 장비 ${DEVICES.length}종만 봐도 9600 bps 가 많지만 LS ELECTRIC GIMAC1000 은 38400 bps, 루텍 Accura 3300E·2300 은 짝수 패리티, 오토닉스 TK·TX·MT4W 는 정지 비트 2 가 출하값입니다.` },
        { p: "Modbus 시리얼 규격은 짝수 패리티를 기본으로 하고 패리티를 쓰지 않으면 정지 비트 2 를 쓰도록 정하지만, 8N1 로 출하되는 장비도 많습니다. 규격이 아니라 장비 매뉴얼 값을 따르세요. 장비 페이지 맨 위 «통신 기본값» 표에 매뉴얼 쪽 번호와 함께 정리해 두었습니다." },
        { h: "3. 배선과 변환기 (RTU)" },
        {
          ul: [
            "A/B 극성을 바꿔 꽂아 봅니다. 극성이 반대여도 장비는 망가지지 않습니다. 종단·바이어스·접지는 RS-485 배선 점검 글을 보세요.",
            "2선식 변환기의 방향 제어(자동 또는 RTS)가 맞는지 봅니다. 응답의 앞부분이 잘리면 이쪽입니다.",
            "다른 프로그램(다른 마스터·터미널)이 같은 COM 포트를 열고 있으면 포트를 열 수 없습니다.",
            "같은 선에 다른 마스터(PLC·HMI)가 붙어 있으면 요청이 섞여 CRC 오류나 «모양 틀림» 이 생깁니다. 시험하는 동안에는 떼어 둡니다.",
          ],
        },
        { h: "4. 장비 쪽 Modbus 설정" },
        { p: "통신 포트가 있어도 출하 때 Modbus 가 아닌 프로토콜로 맞춰진 장비가 있습니다. 예를 들어 한영넉스 VX 는 공장 초기값이 PC Link 이고, Modbus RTU 로 쓰려면 프로토콜 설정(PRS)을 3 으로 바꿔야 합니다(매뉴얼 p.103~104). LS ELECTRIC LSLV-S100 은 통신 그룹 CM.01~CM.04 에 국번·프로토콜·속도·데이터 형식이 있고 출하값은 국번 1, Modbus-RTU, 9600 bps, 8N1 입니다(매뉴얼 p.281). 설정 메뉴의 이름과 위치는 장비 페이지의 «통신 기본값» 아래 메모에 쪽 번호와 함께 있습니다." },
        { h: "5. Modbus TCP 라면" },
        {
          ul: [
            "IP·포트(보통 502)와 대역: PC 와 장비가 같은 대역에 있어야 합니다. PortDock Net Scan 은 대역을 훑어 502 가 열린 장비를 보여 주고 «IP:502» 를 복사해 줍니다.",
            "접속은 되는데 답이 없으면 Unit ID(국번): 게이트웨이 뒤의 RTU 장비라면 그 장비의 국번을 넣습니다. 장비가 직접 Modbus TCP 를 말할 때 어떤 Unit ID 를 받는지는 장비마다 다릅니다 — PortDock Net Scan 의 장비 정보 읽기는 1 로 묻고 안 되면 255 로 묻습니다.",
            "접속 수 제한: 장비가 이미 HMI·SCADA 같은 다른 마스터와 연결돼 있으면 새 접속을 받지 않거나 포트가 닫힌 것처럼 보일 수 있습니다.",
            "게이트웨이가 예외 0A(경로 없음)·0B(대상 응답 없음)를 돌려주면 TCP 구간은 정상이고 게이트웨이 뒤 시리얼 쪽 문제입니다 — 1~3 으로 돌아갑니다.",
            "PC 가 서버(슬레이브 흉내) 쪽이면 처음 열 때 윈도우 방화벽 허용 창이 뜰 수 있습니다. 허용하지 않으면 다른 장비가 접속하지 못합니다.",
          ],
        },
        { h: "6. 예외 응답이 온다면" },
        {
          table: {
            head: ["예외", "뜻", "흔한 원인"],
            rows: [
              ["01", "지원하지 않는 함수", "장비에 없는 함수 코드. 예: 루텍 Accura 3300E 는 03·06·16 만 지원"],
              ["02", "없는 주소", "0 기준과 1 기준·40001 표기 혼동, 개수가 범위를 넘음, 사이에 빈 주소"],
              ["03", "잘못된 값", "개수가 한도를 넘음(규격상 레지스터 읽기 125개, 장비가 더 적은 경우도 있음), 쓴 값이 범위 밖"],
              ["04", "장비 내부 오류", "장비 상태·매뉴얼의 오류 항목 확인"],
              ["06", "장비 바쁨", "요청 간격을 늘림"],
            ],
          },
        },
        { p: "읽기는 되는데 쓰기만 예외가 난다면 장비의 쓰기 잠금을 봅니다. 한영넉스 LC 는 통신 쓰기 금지(CWP)가 출하 때 ON 이라, 앞판에서 OFF 로 바꾸기 전까지 쓰기 요청에 예외로 답합니다(매뉴얼 p.31·p.34). 한 번에 읽는 개수도 장비마다 한도가 따로 있습니다 — LS ELECTRIC GIMAC1000 은 124개, 한영넉스 VX 는 FC03 으로 31개까지입니다." },
        { h: "7. 가끔만 타임아웃이 난다면" },
        {
          ul: [
            "응답 기다림(타임아웃)을 넉넉히: 9600 bps 에서 125 레지스터 응답(255바이트 × 11비트)은 전송에만 약 290 ms 가 걸립니다. 게이트웨이·무선 구간은 더 깁니다.",
            "요청 간격: 장비가 연달아 오는 요청을 놓치면 앞 응답과 다음 요청 사이를 띄웁니다. RS-485 에 여러 장비가 있으면 20~50 ms 가 무난합니다.",
            "USB-시리얼 변환기는 데이터를 몇 ms 단위로 묶어 넘겨 응답이 늦게 도착할 수 있습니다 — 변환기 지연 글을 보세요.",
            "재시도 1~2 회. 예외 응답은 다시 보내도 같으므로 재시도 대상이 아닙니다.",
          ],
        },
        { h: "장비 없이 마스터부터 확인하기" },
        { p: "마스터 프로그램 쪽이 의심되면 실제 장비 대신 PortDock Modbus Slave 를 상대로 붙여 봅니다. 같은 PC 라면 Slave 를 Modbus TCP 서버(포트 502 또는 1502)로 켜고 마스터를 127.0.0.1 로 연결합니다. Slave 의 장애 주입(응답 지연·무응답·예외·CRC 틀림)으로 마스터가 타임아웃·재시도를 어떻게 처리하는지도 미리 볼 수 있습니다." },
      ],
      en: [
        { p: "When a master sends a request and nothing comes back, all you see is «timeout». The cause can sit anywhere from the wiring to the device configuration, so the fastest route is to narrow it down from the traffic log first. This checklist combines the troubleshooting notes in the PortDock Modbus Master help with cases found in device manuals while building this site's register maps." },
        { h: "0. First: does anything come back?" },
        {
          table: {
            plain: true,
            head: ["Traffic log", "Meaning", "Go to"],
            rows: [
              ["Only TX, no RX at all", "The device did not understand the request or thinks it is not addressed to it", "1 – 5"],
              ["RX arrives but fails the CRC", "Bytes flow but get corrupted", "2 (baud, parity), RS-485 wiring"],
              ["My own bytes come straight back", "Echo from a two-wire RS-485 adapter", "Adapter setting (PortDock Modbus Master skips the echo itself)"],
              ["Exception reply (function + 0x80)", "Communication works; the request does not fit the device", "6"],
              ["Occasional timeouts only", "Timing or noise", "7"],
            ],
          },
        },
        { h: "1. Slave ID" },
        { p: "If the first byte of the request does not match the device's slave ID, the device ignores it silently — no error comes back. Check the ID in the device menu; if you do not know it, ask each ID in turn (PortDock Modbus Master «Scan… → Slave ID scan», 200 ms wait per ID by default; an exception reply also counts as «device present»). ID 0 is broadcast: devices act on it but never reply." },
        { h: "2. Baud rate, data bits, parity, stop bits" },
        { p: `If any of these differ, the device cannot read the bytes and stays silent, or its reply fails the CRC. Factory defaults vary: among the ${DEVICES.length} devices on this site most use 9600 bps, but the LS ELECTRIC GIMAC1000 ships at 38400 bps, the Rootech Accura 3300E and 2300 use even parity, and the Autonics TK, TX and MT4W use two stop bits.` },
        { p: "The Modbus serial specification makes even parity the default and asks for two stop bits when no parity is used, yet many devices ship as 8N1. Follow the device manual, not the specification. Each device page lists its defaults at the top, with manual page numbers." },
        { h: "3. Wiring and adapter (RTU)" },
        {
          ul: [
            "Swap A and B. Reversed polarity does not damage anything. For termination, biasing and ground see the RS-485 wiring guide.",
            "Check the direction control of a two-wire adapter (automatic or RTS). If the start of replies is cut off, look here.",
            "If another program (another master, a terminal) has the COM port open, the port cannot be opened.",
            "Another master (PLC, HMI) on the same line mixes requests and causes CRC errors or malformed replies. Disconnect it while testing.",
          ],
        },
        { h: "4. Modbus settings on the device" },
        { p: "Some devices have a communication port that ships set to a protocol other than Modbus. The Hanyoung Nux VX, for example, defaults to PC Link; to use Modbus RTU set the protocol (PRS) to 3 (manual p.103–104). The LS ELECTRIC LSLV-S100 keeps slave ID, protocol, baud and data format in CM.01–CM.04, shipping as ID 1, Modbus-RTU, 9600 bps, 8N1 (manual p.281). Each device page notes where these settings live, with page numbers." },
        { h: "5. For Modbus TCP" },
        {
          ul: [
            "IP, port (usually 502) and subnet: the PC and the device must be on the same subnet. PortDock Net Scan sweeps a subnet, shows devices with port 502 open and copies «IP:502» for you.",
            "Connected but no reply: check the unit ID. Behind a gateway, use the slave ID of the RTU device. Which unit ID a native Modbus TCP device accepts differs by device — PortDock Net Scan's device ID read tries 1 first, then 255.",
            "Connection limits: a device already connected to another master such as an HMI or SCADA may refuse new connections or look as if the port were closed.",
            "Gateway exceptions 0A (path unavailable) or 0B (target failed to respond) mean the TCP side works and the problem is on the serial side behind the gateway — go back to 1–3.",
            "If the PC is the server (simulating a slave), Windows may ask for firewall permission on first use. Without it other devices cannot connect.",
          ],
        },
        { h: "6. If you get an exception" },
        {
          table: {
            head: ["Code", "Meaning", "Common causes"],
            rows: [
              ["01", "Illegal function", "Function code the device lacks, e.g. the Rootech Accura 3300E supports only 03, 06 and 16"],
              ["02", "Illegal data address", "0-based vs 1-based vs 40001 confusion, quantity past the end, gaps in the map"],
              ["03", "Illegal data value", "Quantity over the limit (125 registers per read in the spec, some devices allow fewer), value out of range"],
              ["04", "Slave device failure", "Check the device status and the manual's error list"],
              ["06", "Slave device busy", "Increase the delay between requests"],
            ],
          },
        },
        { p: "If reads work but writes fail with an exception, look for a write lock. The Hanyoung Nux LC ships with communication write protection (CWP) ON and answers write requests with an exception until it is switched OFF on the front panel (manual p.31, p.34). Per-request limits also differ: 124 registers on the LS ELECTRIC GIMAC1000, 31 with FC03 on the Hanyoung Nux VX." },
        { h: "7. If timeouts happen only now and then" },
        {
          ul: [
            "Allow enough response time: at 9600 bps a 125-register reply (255 bytes × 11 bits) takes about 290 ms on the wire alone. Gateways and radio links add more.",
            "Delay between requests: if the device misses back-to-back requests, leave a gap after each reply. 20–50 ms works well with several devices on RS-485.",
            "USB-serial adapters hand data over in chunks of a few milliseconds, so replies can arrive late — see the adapter latency guide.",
            "Retry once or twice. Exception replies are not retried; they would only repeat.",
          ],
        },
        { h: "Check the master without the device" },
        { p: "If you suspect the master software, test it against PortDock Modbus Slave instead of the real device. On the same PC, start Slave as a Modbus TCP server (port 502 or 1502) and connect the master to 127.0.0.1. Slave's fault injection (delay, no reply, exception, bad CRC) shows how the master handles timeouts and retries before you go on site." },
      ],
    },
  },
  // 근거: shared/modbusBuild.ts(parseAddr·plcText — 5자리·6자리, 앞자리 검사), apps/modbus-master/src/help.ts «40001 표기»,
  // data/devices/*.json 의 manualAddress·address·comm.notes(장비별 표기와 프레임 예 쪽 번호)
  {
    slug: "modbus-address-notation",
    date: "2026-10-19",
    tools: ["modbus-master", "modbus-slave", "serial"],
    related: ["modbus-rtu-frame", "modbus-float-word-order", "modbus-function-codes", "modbus-no-response"],
    webTools: ["tools/modbus/"],
    devices: true,
    title: { ko: "Modbus 주소 0 기준 vs 40001 표기 — 매뉴얼 주소를 통신 주소로", en: "Modbus addresses: 0-based vs 40001 notation — from manual to wire" },
    seoTitle: { ko: "Modbus 주소 40001 vs 0 기준 — 매뉴얼 주소 읽는 법 — PortDock", en: "Modbus Address 40001 vs 0-Based: Reading the Manual — PortDock" },
    desc: {
      ko: "같은 첫 레지스터를 매뉴얼마다 0, 1, 40001, 400001, 0h0001 로 적습니다. 국산 장비 매뉴얼의 실제 표기로 통신 주소(0 기준) 구하는 법과 값이 한 칸 밀릴 때 볼 것.",
      en: "The same first register is written 0, 1, 40001, 400001 or 0h0001 depending on the manual. How to get the 0-based wire address, with real manual examples.",
    },
    body: {
      ko: [
        { p: "Modbus 요청 프레임에 실리는 주소는 언제나 0~65535 의 0 기준 수입니다. 이 글에서는 이것을 «통신 주소» 라고 부릅니다. 그런데 장비 매뉴얼과 PLC·HMI 프로그램은 같은 주소를 여러 방식으로 적습니다. 표기를 잘못 읽으면 값이 한 칸씩 밀리거나 예외 02(없는 주소)가 납니다." },
        { h: "표기 세 가지" },
        {
          table: {
            plain: true,
            head: ["표기", "첫 보유 레지스터", "통신 주소 구하기"],
            rows: [
              ["0 기준", "0 (0x0000)", "그대로"],
              ["1 기준(레지스터 번호)", "1", "번호 − 1"],
              ["PLC 표기 5자리", "40001", "뒤 네 자리 − 1 (앞자리는 표)"],
              ["PLC 표기 6자리", "400001", "뒤 다섯 자리 − 1 (앞자리는 표)"],
            ],
          },
        },
        { h: "앞자리는 «어느 표» 라는 뜻" },
        {
          table: {
            head: ["앞자리", "표", "읽기 함수", "쓰기 함수"],
            rows: [
              ["0xxxx", "코일", "01", "05 · 0F"],
              ["1xxxx", "입력 접점", "02", "— (읽기 전용)"],
              ["3xxxx", "입력 레지스터", "04", "— (읽기 전용)"],
              ["4xxxx", "보유 레지스터", "03", "06 · 10"],
            ],
          },
        },
        { p: "앞자리는 프레임에 실리지 않습니다. 함수 코드가 표를 정하고, 주소는 그 표 안의 0 기준 번호입니다. 그래서 30001 과 40001 은 둘 다 통신 주소 0 이지만 보내는 함수가 다릅니다(04 와 03). 5자리 표기는 9999 번째까지만 적을 수 있어 그 뒤는 6자리로 씁니다 — 410000 은 보유 레지스터 통신 주소 9999 입니다." },
        { h: "실제 매뉴얼은 이렇게 적습니다" },
        { p: "이 사이트에 정리한 국산 장비의 매뉴얼에서 확인한 첫 항목들입니다. 각 장비 페이지의 레지스터 표에 «매뉴얼 주소» 와 «통신 주소» 가 나란히 있습니다." },
        {
          table: {
            plain: true,
            head: ["장비", "매뉴얼 표기", "통신 주소", "읽는 법"],
            rows: [
              ["LS ELECTRIC GIMAC1000", "30001", "0", "PLC 표기. 맵에 0 기준 ADDRESS 칸도 함께 있음"],
              ["한영넉스 LC", "30104 (0067)", "103", "PLC 번호 + 괄호 속 16진 통신 주소"],
              ["오토닉스 TK", "301001 (03E8)", "1000", "6자리 참조 번호 + 괄호 속 16진 통신 주소"],
              ["루텍 Accura 3300E", "10000", "9999", "1 기준 레지스터 번호(번호 − 1)"],
              ["LS ELECTRIC LSLV-S100", "0h0001", "0", "16진 번호. 매뉴얼 통신 예에서 시작 주소를 «주소 − 1» 로 보냄"],
              ["한영넉스 VX", "D-register 0 / Address 1", "0", "D-register 열이 0 기준, Address 열은 1 기준"],
            ],
          },
        },
        { p: "16진으로 적혀 있다고 0 기준이라는 보장은 없습니다(위의 0h0001). 매뉴얼에 프레임 예가 있으면 예의 시작 주소 바이트와 맵의 숫자를 비교하는 것이 가장 확실합니다. 위 장비들 대부분도 그렇게 확인했고, 근거 쪽 번호는 장비 페이지의 메모에 있습니다." },
        { h: "값이 한 칸 밀려 보일 때" },
        {
          ul: [
            "읽은 값이 기대한 값의 바로 옆 칸이면 0 기준과 1 기준이 섞인 것입니다. 시작 주소를 1 줄이거나 늘려 봅니다.",
            "예외 02(없는 주소)는 표기 혼동이나 범위 초과입니다. 맵 사이에 빈 주소가 있으면 예외 02 를 돌려주는 장비가 많으므로, 이어진 칸끼리만 묶어 읽습니다.",
            "0 기준 칸에 40001 을 그대로 넣으면 통신 주소 40001 을 읽습니다 — 대개 예외 02 가 납니다.",
            "32비트 값(U32·F32)만 엉뚱하면 주소보다 워드 순서(ABCD·CDAB)를 먼저 의심합니다.",
          ],
        },
        { h: "PortDock 에서는" },
        {
          ul: [
            "Modbus Master: «주소 표기» 를 0 기준·1 기준·PLC(40001) 중에서 고르면 칸·시작 칸·통신 기록 풀이가 모두 그 표기로 나옵니다. 실제로 보내는 주소는 같습니다.",
            "0 기준·1 기준인데 시작 칸에 40001·30001 같은 수를 넣으면 넣은 그대로 읽되, «PLC 표기라면 주소 0(FC03)» 알림과 [PLC 표기로 바꾸기] 버튼이 나옵니다.",
            "PLC 표기에서 30001 처럼 앞자리가 다른 주소를 넣으면 함수도 그 표(04)로 바뀝니다.",
            "웹 도구 «Modbus RTU 요청 만들기» 는 0 기준과 PLC 표기를 받아 CRC 까지 붙은 요청 바이트를 만듭니다. 설치 없이 바로 확인할 수 있습니다.",
          ],
        },
      ],
      en: [
        { p: "The address inside a Modbus request frame is always a 0-based number from 0 to 65535 — this guide calls it the «wire address». Device manuals and PLC or HMI software, however, write the same address in several ways. Misreading the notation shifts values by one or triggers exception 02 (illegal data address)." },
        { h: "Three notations" },
        {
          table: {
            plain: true,
            head: ["Notation", "First holding register", "Wire address"],
            rows: [
              ["0-based", "0 (0x0000)", "as is"],
              ["1-based (register number)", "1", "number − 1"],
              ["PLC notation, 5 digits", "40001", "last four digits − 1 (first digit = table)"],
              ["PLC notation, 6 digits", "400001", "last five digits − 1 (first digit = table)"],
            ],
          },
        },
        { h: "The first digit names the table" },
        {
          table: {
            head: ["Prefix", "Table", "Read function", "Write function"],
            rows: [
              ["0xxxx", "Coils", "01", "05 · 0F"],
              ["1xxxx", "Discrete inputs", "02", "— (read only)"],
              ["3xxxx", "Input registers", "04", "— (read only)"],
              ["4xxxx", "Holding registers", "03", "06 · 10"],
            ],
          },
        },
        { p: "The prefix never goes on the wire. The function code selects the table and the address is the 0-based index inside it, so 30001 and 40001 are both wire address 0 — sent with different functions (04 and 03). Five digits only reach the 9999th entry; beyond that six digits are used, so 410000 is holding register wire address 9999." },
        { h: "How real manuals write it" },
        { p: "First entries from the manuals of the devices on this site. Each device page shows «Manual» and «Wire» addresses side by side." },
        {
          table: {
            plain: true,
            head: ["Device", "Manual", "Wire", "How to read it"],
            rows: [
              ["LS ELECTRIC GIMAC1000", "30001", "0", "PLC notation; the map also has a 0-based ADDRESS column"],
              ["Hanyoung Nux LC", "30104 (0067)", "103", "PLC number plus the hex wire address in brackets"],
              ["Autonics TK", "301001 (03E8)", "1000", "Six-digit reference plus the hex wire address in brackets"],
              ["Rootech Accura 3300E", "10000", "9999", "1-based register number (number − 1)"],
              ["LS ELECTRIC LSLV-S100", "0h0001", "0", "Hex number; the manual's frame example sends «address − 1»"],
              ["Hanyoung Nux VX", "D-register 0 / Address 1", "0", "D-register column is 0-based, Address column 1-based"],
            ],
          },
        },
        { p: "A hex address is not necessarily 0-based (see 0h0001 above). If the manual has a frame example, compare its start-address bytes with the map — that is the most reliable check, and how most of the devices above were verified. The page references are in each device page's notes." },
        { h: "When values look shifted by one" },
        {
          ul: [
            "If you read the value you expected from the neighbouring register, 0-based and 1-based are mixed up. Move the start address by one.",
            "Exception 02 means a notation mix-up or reading past the end. Many devices also return 02 for gaps in the map, so read contiguous blocks only.",
            "Typing 40001 into a 0-based field reads wire address 40001 — usually exception 02.",
            "If only 32-bit values (U32, F32) look wrong, suspect the word order (ABCD, CDAB) before the address.",
          ],
        },
        { h: "In PortDock" },
        {
          ul: [
            "Modbus Master: set «Addresses» — 0-based, 1-based or PLC (40001) — and cells, the start field and the decoded log all use it. The address sent is the same.",
            "With 0-based or 1-based selected, typing 40001 or 30001 reads exactly that, but a yellow notice says «in PLC notation it is address 0 (FC03)» with a [Switch to PLC notation] button.",
            "In PLC notation, typing an address with another prefix such as 30001 switches the function to that table (04).",
            "The «Modbus RTU Request Builder» web tool accepts 0-based and PLC notation and builds the request bytes with CRC — no install needed.",
          ],
        },
      ],
    },
  },
  // 근거: Modbus Application Protocol Specification V1.1b3(함수별 요청·응답 모양·개수 한도·05 값 FF00/0000·0x17 쓰기 먼저·비트 묶음 LSB 먼저),
  // shared/modbusBuild.ts(MB_FUNCS 한도)·site/src/lib/modbusDecode.ts, apps/modbus-master/src/help.ts(06·10, FC15·16 옵션), data/devices(Accura 3300E FC03, GIMAC1000 FC04).
  // 예시 CRC 는 lib/checksum.ts 로 계산.
  {
    slug: "modbus-function-codes",
    date: "2026-10-22",
    tools: ["modbus-master", "modbus-slave", "tcp"],
    related: ["modbus-rtu-frame", "modbus-address-notation", "modbus-float-word-order", "modbus-exception-codes"],
    webTools: ["tools/modbus-decoder/", "tools/modbus/"],
    devices: true,
    title: { ko: "Modbus 함수 코드 정리 — 01~06·0F·10·17 언제 무엇을 쓰나", en: "Modbus function codes — 01–06, 0F, 10 and 17, and when to use each" },
    seoTitle: { ko: "Modbus 함수 코드 정리 (FC01~06·0F·10·17) — PortDock", en: "Modbus Function Codes 01–06, 0F, 10, 17 Explained — PortDock" },
    desc: {
      ko: "코일·입력 접점·레지스터를 읽고 쓰는 함수 9개를 표 하나로. 한 번에 보낼 수 있는 개수, 응답 모양, 06 과 10 중 고르는 법, 예외 01 이 날 때 볼 것.",
      en: "The nine Modbus functions that read and write coils and registers in one table: quantity limits, reply layouts, 06 vs 10, 05 vs 0F, and what exception 01 means.",
    },
    body: {
      ko: [
        { p: "Modbus 요청에서 국번(RTU) 또는 MBAP 머리(TCP) 바로 뒤의 한 바이트가 함수 코드입니다. 함수 코드가 «어느 표를 읽을지·쓸지» 를 정하고, 주소는 그 표 안의 0 기준 번호입니다. 공개 함수 코드 가운데 레지스터·코일을 다루는 것은 아래 9개입니다. 한도는 Modbus Application Protocol Specification V1.1b3 의 값입니다." },
        { fig: { src: "/img/guides/modbus-rtu-vs-tcp.ko.svg", w: 780, h: 300, alt: "같은 요청을 Modbus RTU 와 TCP 로 비교: RTU 는 국번 01 + PDU 03 00 00 00 02 + CRC C4 0B, TCP 는 MBAP 머리 7바이트(트랜잭션 ID 00 01·프로토콜 ID 00 00·길이 00 06·Unit ID 01) + 같은 PDU, CRC 없음", cap: "같은 «보유 레지스터 0 부터 2개 읽기» 요청. PDU(함수 코드 + 데이터)는 같고, RTU 는 국번과 CRC 를, TCP 는 MBAP 머리를 붙입니다." } },
        {
          table: {
            head: ["코드", "이름", "표", "한 번에 최대"],
            rows: [
              ["01", "코일 읽기", "코일(0xxxx)", "2000개"],
              ["02", "입력 접점 읽기", "입력 접점(1xxxx)", "2000개"],
              ["03", "보유 레지스터 읽기", "보유 레지스터(4xxxx)", "125개"],
              ["04", "입력 레지스터 읽기", "입력 레지스터(3xxxx)", "125개"],
              ["05", "코일 하나 쓰기", "코일", "1개"],
              ["06", "레지스터 하나 쓰기", "보유 레지스터", "1개"],
              ["0F (15)", "코일 여러 개 쓰기", "코일", "1968개"],
              ["10 (16)", "레지스터 여러 개 쓰기", "보유 레지스터", "123개"],
              ["17 (23)", "레지스터 읽기·쓰기 한 번에", "보유 레지스터", "읽기 125개 · 쓰기 121개"],
            ],
          },
        },
        { p: "매뉴얼은 함수 코드를 16진(0F·10·17)으로도 10진(15·16·23)으로도 적습니다. «FC16» 과 «FC10» 은 같은 함수입니다. 표의 한도는 규격의 최대값이고 장비는 더 적게 받을 수 있습니다 — 넘기면 예외 03(잘못된 값)이 옵니다." },
        { h: "읽기: 01·02 는 비트, 03·04 는 16비트 값" },
        { p: "01·02 응답은 비트를 한 바이트에 8개씩 담고, 첫 바이트의 가장 낮은 비트가 요청한 첫 주소입니다. 코일 10개(주소 0~9)를 읽으면 데이터 2바이트가 옵니다." },
        { code: "요청  01 01 00 00 00 0A BC 0D\n응답  01 01 02 05 01 7B 6C" },
        { p: "첫 데이터 바이트 05 는 2진수 0000 0101 이라 코일 0 과 2 가 켜져 있고, 둘째 바이트 01 은 코일 8 이 켜져 있다는 뜻입니다. 마지막 바이트의 남는 비트는 0 으로 채웁니다." },
        { p: "03 과 04 는 요청·응답 모양이 같고 읽는 표만 다릅니다. 어느 값을 어느 표에 두는지는 장비가 정합니다 — 루텍 Accura 3300E 는 모든 값을 보유 레지스터(03)에 두고, LS ELECTRIC GIMAC1000 은 측정값을 입력 레지스터(04)에 둡니다. 매뉴얼의 함수 코드 칸을 따르세요. 03 으로 읽어 예외 02 가 나면 04 로도 읽어 봅니다." },
        { h: "쓰기: 하나씩(05·06)과 여러 개(0F·10)" },
        { code: "05 코일 0 켜기             01 05 00 00 FF 00 8C 3A\n06 레지스터 1 에 100       01 06 00 01 00 64 D9 E1\n10 레지스터 0~1 에 10, 258  01 10 00 00 00 02 04 00 0A 01 02 53 FC" },
        {
          ul: [
            "05 의 값은 FF 00(켬)과 00 00(끔) 둘뿐입니다. 00 01 같은 값은 규격상 잘못된 값입니다.",
            "05·06 이 성공하면 장비는 요청을 그대로 돌려줍니다(에코). 0F·10 은 시작 주소와 개수만 돌려줍니다 — 위 10 요청에는 «01 10 00 00 00 02 41 C8» 이 옵니다.",
            "U32·F32 처럼 두 레지스터가 한 값이면 10 으로 한 번에 씁니다. 06 을 두 번 보내면 두 요청 사이에 장비가 절반만 바뀐 값을 쓸 수 있습니다.",
            "장비마다 받는 쓰기 함수가 다릅니다. 루텍 Accura 3300E 는 03·06·16 만 지원합니다. 06 이 없는 장비라면 10 으로 개수 1 을 씁니다.",
          ],
        },
        { h: "17: 쓰고 나서 읽기를 한 번에" },
        { p: "17(23)은 한 요청으로 보유 레지스터를 쓰고 읽습니다. 규격상 쓰기를 먼저 한 뒤 읽습니다. 왕복이 한 번으로 줄지만 지원 여부가 장비마다 다르니 매뉴얼의 지원 함수 표를 먼저 봅니다. 아래는 주소 16 에 255 를 쓰고 주소 0 부터 2개를 읽는 예입니다." },
        { code: "요청  01 17 00 00 00 02 00 10 00 01 02 00 FF 56 6B\n응답  01 17 04 00 64 00 C8 B9 6E" },
        { h: "예외 01 이 오면" },
        { p: "예외 응답은 함수 코드에 0x80 을 더해 옵니다(03 → 83, 06 → 86, 10 → 90). 예외 01(지원하지 않는 함수)은 장비에 그 함수가 없거나 지금 상태에서 받을 수 없다는 뜻이니 지원 함수 표를 보고 다른 함수로 바꿉니다. 02 는 주소, 03 은 개수·값 문제입니다." },
        { code: "01 86 02 C3 A1   ← 06 요청에 예외 02(없는 주소)" },
        { h: "그 밖의 함수" },
        { p: "0x07·0x08·0x0B·0x0C·0x11 은 시리얼 회선 전용 진단 함수, 0x14·0x15 는 파일 레코드, 0x16 은 마스크 쓰기, 0x18 은 FIFO 읽기, 0x2B 는 장치 식별 등에 쓰입니다. 레지스터·코일 값을 주고받는 데는 위 9개로 충분합니다." },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «Modbus 프레임 해석기»: RTU·TCP HEX 를 붙여 넣으면 위 9개 함수의 요청·응답을 칸별로 풀고, 개수가 규격 한도를 넘거나 05 값이 틀리면 알려 줍니다.",
            "웹 도구 «Modbus RTU 요청 만들기»: 01~06·0F·10 요청을 국번·주소·개수로 만들고 CRC 까지 붙입니다.",
            "Modbus Master: 한 칸이면 06(코일은 05), 여러 칸·32/64비트 값이면 10(0F)으로 씁니다. 장비가 06·05 를 받지 않으면 «통신 세부» 에서 한 칸도 여러 칸 쓰기(FC15·16)로 보내게 바꿀 수 있습니다.",
          ],
        },
      ],
      en: [
        { p: "The function code is the byte right after the slave ID (RTU) or the MBAP header (TCP). It selects which table to read or write; the address is a 0-based index inside that table. Of the public function codes, these nine handle registers and coils. Limits are from the Modbus Application Protocol Specification V1.1b3." },
        { fig: { src: "/img/guides/modbus-rtu-vs-tcp.en.svg", w: 780, h: 300, alt: "The same request in Modbus RTU and TCP: RTU is slave ID 01 + PDU 03 00 00 00 02 + CRC C4 0B; TCP is a 7-byte MBAP header (transaction ID 00 01, protocol ID 00 00, length 00 06, unit ID 01) + the same PDU, with no CRC", cap: "One «read 2 holding registers from 0» request. The PDU (function code + data) is identical; RTU adds the slave ID and CRC, TCP adds the MBAP header." } },
        {
          table: {
            head: ["Code", "Name", "Table", "Max per request"],
            rows: [
              ["01", "Read Coils", "Coils (0xxxx)", "2000"],
              ["02", "Read Discrete Inputs", "Discrete inputs (1xxxx)", "2000"],
              ["03", "Read Holding Registers", "Holding registers (4xxxx)", "125"],
              ["04", "Read Input Registers", "Input registers (3xxxx)", "125"],
              ["05", "Write Single Coil", "Coils", "1"],
              ["06", "Write Single Register", "Holding registers", "1"],
              ["0F (15)", "Write Multiple Coils", "Coils", "1968"],
              ["10 (16)", "Write Multiple Registers", "Holding registers", "123"],
              ["17 (23)", "Read/Write Multiple Registers", "Holding registers", "read 125 · write 121"],
            ],
          },
        },
        { p: "Manuals write function codes in hex (0F, 10, 17) or decimal (15, 16, 23); «FC16» and «FC10» are the same function. The limits are the specification maximums and a device may accept fewer — exceeding them returns exception 03 (illegal data value)." },
        { h: "Reads: 01/02 return bits, 03/04 return 16-bit values" },
        { p: "Replies to 01 and 02 pack eight bits per byte, and the lowest bit of the first byte is the first requested address. Reading 10 coils (addresses 0–9) returns two data bytes." },
        { code: "Request   01 01 00 00 00 0A BC 0D\nResponse  01 01 02 05 01 7B 6C" },
        { p: "The first data byte 05 is binary 0000 0101, so coils 0 and 2 are on; the second byte 01 means coil 8 is on. Unused bits in the last byte are padded with zeros." },
        { p: "03 and 04 share the same request and reply layout and differ only in the table. The device decides which value lives where — the Rootech Accura 3300E keeps everything in holding registers (03), while the LS ELECTRIC GIMAC1000 keeps measurements in input registers (04). Follow the function code column in the manual; if 03 returns exception 02, try 04." },
        { h: "Writes: single (05, 06) and multiple (0F, 10)" },
        { code: "05 coil 0 ON                01 05 00 00 FF 00 8C 3A\n06 register 1 = 100         01 06 00 01 00 64 D9 E1\n10 registers 0–1 = 10, 258  01 10 00 00 00 02 04 00 0A 01 02 53 FC" },
        {
          ul: [
            "Function 05 accepts only FF 00 (ON) and 00 00 (OFF). Anything else, such as 00 01, is an illegal value in the specification.",
            "A successful 05 or 06 is answered with an echo of the request. 0F and 10 return only the start address and quantity — the 10 request above is answered with «01 10 00 00 00 02 41 C8».",
            "When two registers form one value (U32, F32), write them together with 10. Two separate 06 writes let the device use a half-updated value in between.",
            "Devices differ in the write functions they accept. The Rootech Accura 3300E supports only 03, 06 and 16. If a device lacks 06, write a quantity of 1 with 10.",
          ],
        },
        { h: "17: write, then read, in one request" },
        { p: "Function 17 (23) writes and reads holding registers in one request; the specification performs the write before the read. It saves a round trip, but support varies, so check the manual's function list first. This example writes 255 to address 16 and reads two registers from address 0." },
        { code: "Request   01 17 00 00 00 02 00 10 00 01 02 00 FF 56 6B\nResponse  01 17 04 00 64 00 C8 B9 6E" },
        { h: "If you get exception 01" },
        { p: "Exception replies add 0x80 to the function code (03 → 83, 06 → 86, 10 → 90). Exception 01 (illegal function) means the device lacks the function or cannot accept it in its current state; pick another function from the supported list. 02 points to the address, 03 to the quantity or value." },
        { code: "01 86 02 C3 A1   ← exception 02 (illegal data address) to a 06 request" },
        { h: "Other functions" },
        { p: "0x07, 0x08, 0x0B, 0x0C and 0x11 are serial-line-only diagnostics, 0x14/0x15 handle file records, 0x16 is mask write, 0x18 reads a FIFO queue and 0x2B carries device identification and more. For exchanging register and coil values, the nine above are all you need." },
        { h: "In PortDock" },
        {
          ul: [
            "«Modbus Frame Decoder» web tool: paste RTU or TCP hex to decode requests and replies of all nine functions field by field; it flags quantities over the specification limits and invalid 05 values.",
            "«Modbus RTU Request Builder» web tool: builds 01–06, 0F and 10 requests from slave ID, address and quantity, CRC included.",
            "Modbus Master writes one register with 06 (coils 05) and several registers or 32/64-bit values with 10 (0F). If the device rejects 06/05, an option under «Communication details» sends single values with the multiple-write functions (FC15/16).",
          ],
        },
      ],
    },
  },
  // 근거: Modbus Application Protocol V1.1b3 4.2(레지스터 안 big-endian, 32비트 순서는 규격 밖), site/src/lib/modbusFloat.ts 로 계산한 값,
  // apps/modbus-master/src/help.ts(형식·순서·고르는 법), apps/modbus-slave/src/help.ts(예제 채우기 F32 CDAB 23.5),
  // data/devices/rootech/accura-3300e.json(Big-Endian p.19), data/devices/ls-electric/gimac1000.json(Swap, 사용설명서 p.42).
  {
    slug: "modbus-float-word-order",
    date: "2026-10-22",
    tools: ["modbus-master", "modbus-slave"],
    related: ["modbus-address-notation", "modbus-function-codes", "modbus-no-response"],
    webTools: ["tools/modbus-float/", "tools/modbus-decoder/", "tools/integer/"],
    devices: true,
    title: { ko: "Modbus 실수(float)·32비트 값 읽기 — 워드 순서 맞추는 순서", en: "Reading Modbus floats and 32-bit values — finding the word order" },
    seoTitle: { ko: "Modbus float·32비트 값 읽기 — 워드 순서 맞추기 — PortDock", en: "Modbus Float & 32-bit Values: Finding the Word Order — PortDock" },
    desc: {
      ko: "float32·U32 는 레지스터 두 칸에 나뉘어 오고, 어느 칸이 먼저인지는 규격에 없어 장비마다 다릅니다. ABCD·CDAB 를 아는 값으로 가려내는 순서와 잘못 골랐을 때의 모양.",
      en: "Float32 and U32 values span two registers, and which comes first is up to the device. Find ABCD or CDAB with a known value; see what wrong orders look like.",
    },
    body: {
      ko: [
        { p: "Modbus 레지스터 하나는 16비트이고, 그 안의 두 바이트는 높은 바이트가 먼저 갑니다(Modbus Application Protocol V1.1b3, 4.2 «big-Endian»). 그런데 32비트 정수(U32·S32)나 IEEE 754 실수(float32)는 레지스터 두 칸에, float64 는 네 칸에 나눠 싣고, 어느 칸에 어느 반쪽을 넣을지는 규격이 정하지 않습니다. 그래서 같은 값이 장비마다 다른 순서로 옵니다." },
        { h: "네 가지 순서" },
        { p: "값의 바이트를 높은 쪽부터 A·B·C·D 라 하면, 레지스터 두 칸(낮은 주소 먼저)에 놓이는 모양은 네 가지입니다. 25.0(float32 = 0x41C80000)과 정수 100000(0x000186A0)으로 보면 이렇습니다." },
        {
          table: {
            head: ["순서", "25.0 (float32)", "100000 (U32)", "흔한 이름"],
            rows: [
              ["ABCD", "41C8 0000", "0001 86A0", "빅 엔디언 — 높은 워드 먼저"],
              ["CDAB", "0000 41C8", "86A0 0001", "워드 스왑 — 낮은 워드 먼저"],
              ["BADC", "C841 0000", "0100 A086", "바이트 스왑"],
              ["DCBA", "0000 C841", "A086 0100", "리틀 엔디언"],
            ],
          },
        },
        { h: "순서가 틀리면 이렇게 보입니다" },
        { p: "레지스터 «41C8 0000» 을 네 순서로 풀면 맞는 순서(ABCD)만 25 이고 나머지는 엉뚱한 값이 됩니다." },
        {
          table: {
            head: ["풀어 본 순서", "float32", "U32"],
            rows: [
              ["ABCD", "25", "1103626240"],
              ["CDAB", "2.36 × 10⁻⁴¹", "16840"],
              ["BADC", "−197632", "3359703040"],
              ["DCBA", "7.18 × 10⁻⁴¹", "51265"],
            ],
          },
        },
        { p: "0 에 아주 가까운 수(10⁻³⁸ 아래)나 터무니없이 큰 수, 부호가 뒤집힌 값이 나오면 순서부터 의심합니다. 반대로 값이 그럴듯해 보여도 앞판 값과 맞춰 보기 전에는 확정하지 않습니다." },
        { h: "맞추는 순서" },
        {
          ul: [
            "1. 값을 아는 칸을 고릅니다. 장비 앞판에 보이는 값이나 직접 써 넣은 설정값이 좋습니다. 계속 바뀌는 측정값보다 고정된 값이 비교하기 쉽습니다.",
            "2. 그 칸의 시작 주소부터 레지스터 2개를 한 요청으로 읽습니다. 따로 두 번 읽으면 그 사이 값이 바뀌어 두 반쪽이 어긋날 수 있습니다.",
            "3. 네 순서로 풀어 보고 앞판 값과 맞는 것을 고릅니다.",
            "4. 넷 다 이상하면 주소를 의심합니다. 시작 주소가 한 칸 밀리면 앞 값의 뒤 반쪽과 이 값의 앞 반쪽을 섞어 읽습니다 — 0 기준·1 기준·40001 표기를 먼저 확인하세요.",
            "5. 정한 순서를 다른 32비트 칸에 쓰기 전에, 매뉴얼에 칸마다 다른 순서가 적혀 있지 않은지 봅니다.",
          ],
        },
        { h: "매뉴얼에서 찾을 말" },
        { p: "매뉴얼에는 «Big-Endian», «상위 워드 먼저(high word first)», «Word swap», «Little-endian word» 같은 말로 적혀 있습니다. 루텍 Accura 3300E 매뉴얼은 32비트 값을 상위 워드가 낮은 주소인 Big-Endian 으로 적습니다(p.19). LS ELECTRIC GIMAC1000 은 Swap 설정에 따라 ABCD(100.0 → 42C8 0000)와 CDAB(0000 42C8)가 바뀝니다(사용설명서 p.42). 이처럼 장비 설정으로 순서가 바뀌기도 하니, 읽은 값으로 한 번은 확인하는 것이 안전합니다." },
        { h: "float32 의 자릿수" },
        { p: "float32 는 가수가 24비트라 유효 숫자가 약 7자리입니다. 123.456 을 float32 로 저장하면 123.456001 로 읽힙니다 — 장비 오류가 아닙니다. 자릿수가 큰 값은 장비가 float64(레지스터 4칸)나 «U32 정수 + 배율» 로 주기도 합니다. float64 도 같은 원리로, 네 레지스터를 놓는 순서를 확인해야 합니다." },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «Modbus 실수 변환기»: 레지스터 2개·4개를 넣으면 ABCD·CDAB·BADC·DCBA 네 순서의 float32·float64·int32 를 한 표로 보여 주고, 값 → 레지스터도 계산합니다.",
            "Modbus Master: 칸마다 U32·S32·F32·F64 형식과 순서를 정합니다. 아는 값이 있는 칸을 F32 로 두고 순서를 바꿔 가며 말이 되는 값을 고르면 됩니다.",
            "Modbus Slave: «예제 채우기» 를 누르면 보유 레지스터 8~9 에 F32 CDAB 23.5 가 들어갑니다. 마스터로 읽어 보면 순서 설정이 맞는지 장비 없이 확인할 수 있습니다.",
          ],
        },
      ],
      en: [
        { p: "A Modbus register is 16 bits and its two bytes travel high byte first (Modbus Application Protocol V1.1b3, 4.2 «big-Endian»). A 32-bit integer (U32, S32) or an IEEE 754 float32, however, spans two registers — a float64 four — and the specification does not say which half goes into which register. The same value therefore arrives in different orders from different devices." },
        { h: "Four orders" },
        { p: "Call the value's bytes A, B, C, D from most to least significant. Across two registers (lower address first) there are four layouts. Here they are for 25.0 (float32 = 0x41C80000) and the integer 100000 (0x000186A0)." },
        {
          table: {
            head: ["Order", "25.0 (float32)", "100000 (U32)", "Common name"],
            rows: [
              ["ABCD", "41C8 0000", "0001 86A0", "Big-endian — high word first"],
              ["CDAB", "0000 41C8", "86A0 0001", "Word swap — low word first"],
              ["BADC", "C841 0000", "0100 A086", "Byte swap"],
              ["DCBA", "0000 C841", "A086 0100", "Little-endian"],
            ],
          },
        },
        { h: "What a wrong order looks like" },
        { p: "Decoding the registers «41C8 0000» four ways gives 25 only for the right order (ABCD); the others are nonsense." },
        {
          table: {
            head: ["Decoded as", "float32", "U32"],
            rows: [
              ["ABCD", "25", "1103626240"],
              ["CDAB", "2.36 × 10⁻⁴¹", "16840"],
              ["BADC", "−197632", "3359703040"],
              ["DCBA", "7.18 × 10⁻⁴¹", "51265"],
            ],
          },
        },
        { p: "Values extremely close to zero (below 10⁻³⁸), absurdly large values or flipped signs point to the order first. Even a plausible-looking value is not settled until it matches the front panel." },
        { h: "Finding the order" },
        {
          ul: [
            "1. Pick a register pair whose value you know — a value on the front panel or a setpoint you wrote yourself. A fixed value is easier to compare than a changing measurement.",
            "2. Read both registers in one request from the value's start address. Two separate reads can catch the value changing in between, so the halves mismatch.",
            "3. Decode it in all four orders and keep the one that matches the front panel.",
            "4. If all four look wrong, suspect the address. A start address off by one mixes the second half of the previous value with the first half of this one — check 0-based, 1-based and 40001 notation first.",
            "5. Before applying the order to other 32-bit values, check that the manual does not list different orders per value.",
          ],
        },
        { h: "Words to look for in the manual" },
        { p: "Manuals say «Big-Endian», «high word first», «word swap» or «little-endian word». The Rootech Accura 3300E manual states that 32-bit values are big-endian with the high word at the lower address (p.19). The LS ELECTRIC GIMAC1000 switches between ABCD (100.0 → 42C8 0000) and CDAB (0000 42C8) with its Swap setting (user manual p.42). Since a setting can change the order, confirm it once with a value you read." },
        { h: "Float32 precision" },
        { p: "A float32 has a 24-bit significand, about 7 significant digits. 123.456 stored as float32 reads back as 123.456001 — the device is not wrong. For values with many digits, devices may use float64 (four registers) or a U32 integer with a scale factor. Float64 works the same way: check the order of all four registers." },
        { h: "In PortDock" },
        {
          ul: [
            "«Modbus Float Converter» web tool: enter 2 or 4 registers to see float32, float64 and int32 in ABCD, CDAB, BADC and DCBA side by side, or convert a value to registers.",
            "Modbus Master: set U32, S32, F32 or F64 and the order per cell. Put a cell with a known value on F32 and switch orders until the value makes sense.",
            "Modbus Slave: «Fill example values» puts F32 CDAB 23.5 into holding registers 8–9, so you can check a master's order setting without a device.",
          ],
        },
      ],
    },
  },
  // 근거: Modbus Messaging on TCP/IP Implementation Guide V1.0b(MBAP 7바이트·포트 502·Unit ID 0xFF/0·접속 수는 장비 능력·접속 유지·Keep-Alive 권고),
  // apps/netscan/src/help.ts(ARP·핑·502·Unit ID 1→255·고정 IP 대역·접속 수 제한), apps/modbus-master/src/help.ts(트랜잭션 번호), apps/tcp/src/help.ts(방화벽·MBAP 길이 끊기·중계).
  {
    slug: "modbus-tcp-connection",
    date: "2026-10-22",
    tools: ["netscan", "modbus-master", "tcp"],
    related: ["modbus-no-response", "plc-ip-subnet", "modbus-function-codes", "modbus-address-notation"],
    webTools: ["tools/modbus-decoder/", "tools/subnet/"],
    devices: true,
    title: { ko: "Modbus TCP 연결이 안 될 때 — 502 포트·Unit ID·접속 수 점검 순서", en: "Modbus TCP not connecting — checking port 502, unit ID and connection limits" },
    seoTitle: { ko: "Modbus TCP 연결 안 됨 — 502 포트·Unit ID 점검 — PortDock", en: "Modbus TCP Not Connecting: Port 502, Unit ID, Limits — PortDock" },
    desc: {
      ko: "핑은 되는데 Modbus TCP 가 안 될 때. 네트워크, 502 포트 접속, MBAP 응답, 값 순서로 층을 나눠 대역·방화벽·포트·Unit ID·접속 수 제한을 확인합니다.",
      en: "Ping works but Modbus TCP does not? Check layer by layer — network, port 502, MBAP reply, values — for subnet, firewall, port, unit ID and connection limits.",
    },
    body: {
      ko: [
        { p: "Modbus TCP 는 Modbus 요청(PDU)에 7바이트 MBAP 머리를 붙여 TCP 로 보냅니다. RTU 의 CRC 는 없고, 국번 자리는 MBAP 의 Unit ID 가 맡습니다. «안 된다» 는 증상은 아래 네 층 중 하나에서 나므로 아래층부터 차례로 확인합니다. 규격 내용은 Modbus Messaging on TCP/IP Implementation Guide V1.0b 를 따릅니다." },
        {
          table: {
            plain: true,
            head: ["층", "확인", "통과하면"],
            rows: [
              ["1. 네트워크", "같은 대역인가, ARP·핑이 닿는가", "장비가 네트워크에 있음"],
              ["2. TCP 접속", "502(또는 설정한 포트)에 접속되는가", "Modbus 서버가 듣고 있음"],
              ["3. Modbus 응답", "요청에 MBAP 응답이 오는가", "Unit ID·함수가 맞음"],
              ["4. 값", "값이 말이 되는가", "주소 표기·워드 순서가 맞음"],
            ],
          },
        },
        { h: "1. 네트워크: 대역부터" },
        { p: "공장 장비는 192.168.1.x 같은 고정 IP 로 나오는 경우가 많아, PC 가 다른 대역이면 핑도 닿지 않습니다. PC 에 그 대역의 IP 를 하나 더 붙이면 지금 네트워크를 끊지 않고 장비에 닿을 수 있습니다(예: 장비 192.168.1.10 → PC 192.168.1.200, 서브넷 마스크 255.255.255.0). 핑을 막아 둔 장비도 있으므로 «핑 안 됨» 만으로 장비가 없다고 단정하지 않습니다 — 같은 대역이면 ARP 로 물어 찾을 수 있습니다." },
        { h: "2. 502 포트에 접속되는가" },
        {
          ul: [
            "규격은 Modbus TCP 서버가 기본으로 TCP 502 를 듣도록 정하고, 다른 포트도 설정할 수 있게 하라고 권합니다. 장비 설정에서 포트가 바뀌어 있지 않은지 봅니다.",
            "접속이 곧바로 거절되면 그 포트를 듣는 프로그램이 없는 것이고, 한참 기다리다 실패하면 방화벽·라우터가 막고 있거나 주소가 틀린 경우가 많습니다.",
            "동시에 받는 TCP 접속 수는 규격이 정하지 않고 장비 능력에 맡깁니다. HMI·SCADA 가 이미 자리를 다 쓰고 있으면 새 접속이 거절되거나 포트가 닫힌 것처럼 보입니다. 시험하는 동안 다른 마스터를 잠시 끊거나, 매뉴얼에서 최대 접속 수를 확인합니다.",
            "PC 가 서버(슬레이브 흉내) 쪽이면 처음 열 때 윈도우 방화벽이 허용을 묻습니다. 허용하지 않으면 다른 장비가 접속하지 못합니다.",
          ],
        },
        { h: "3. 접속은 되는데 답이 없을 때: MBAP 와 Unit ID" },
        { p: "보유 레지스터 0 부터 2개를 읽는 요청과 그 응답(값 100, 200)입니다." },
        { code: "요청  00 01 00 00 00 06 01 03 00 00 00 02\n응답  00 01 00 00 00 07 01 03 04 00 64 00 C8" },
        {
          table: {
            head: ["바이트", "뜻"],
            rows: [
              ["00 01", "트랜잭션 ID — 서버가 응답에 그대로 돌려줌"],
              ["00 00", "프로토콜 ID — Modbus 는 0"],
              ["00 06", "길이 — 뒤따르는 바이트 수(Unit ID + PDU)"],
              ["01", "Unit ID"],
              ["03 00 00 00 02", "PDU — 함수 03, 시작 주소 0, 개수 2"],
            ],
          },
        },
        {
          ul: [
            "장비가 직접 Modbus TCP 를 말하면 IP 주소로 이미 구분되므로, 규격은 Unit ID 에 의미 없는 값 0xFF(255)를 권하고 0 도 받도록 정합니다. 실제로 어떤 값을 받는지는 장비마다 다르니 매뉴얼을 보고, 모르면 1·255·0 을 차례로 넣어 봅니다.",
            "게이트웨이(TCP ↔ RTU 변환기) 뒤의 시리얼 장비라면 Unit ID 가 곧 그 장비의 국번(1~247)입니다. 게이트웨이가 예외 0A(경로 없음)·0B(대상 응답 없음)를 돌려주면 TCP 쪽은 정상이고 게이트웨이 뒤 시리얼 쪽을 봐야 합니다.",
            "길이 칸이 실제 바이트 수와 다르면 장비가 요청을 버릴 수 있습니다. 바이트를 손으로 만들어 보낼 때 자주 생깁니다.",
            "TCP 는 메시지 경계를 지키지 않아 응답이 쪼개지거나 두 개가 붙어 올 수 있습니다. 응답은 MBAP 길이 칸으로 끊고, 트랜잭션 ID 로 요청과 짝지어야 합니다.",
          ],
        },
        { h: "4. 접속이 자꾸 끊기거나 다시 안 붙을 때" },
        {
          ul: [
            "규격은 요청마다 접속을 열고 닫지 말고 열어 둔 채 쓰라고 권합니다. 요청마다 다시 접속하는 마스터는 장비의 접속 자리를 빨리 써 버릴 수 있습니다.",
            "서버도 접속을 닫을 수 있고, 클라이언트는 닫힘을 받아들인 뒤 필요할 때 다시 열어야 합니다.",
            "케이블이 빠지거나 상대가 꺼진 채 접속이 남으면 장비가 그 자리를 계속 쥐고 있을 수 있습니다. 규격은 양쪽에서 TCP Keep-Alive 를 켜 끊긴 접속을 알아내라고 권합니다. 장비를 껐다 켜야만 다시 접속된다면 이 경우를 의심합니다.",
          ],
        },
        { h: "응답은 오는데 값이 이상하면" },
        { p: "통신이 아니라 해석 문제입니다. 값이 한 칸씩 밀리면 주소 표기(0 기준·40001), 32비트 값만 이상하면 워드 순서를 봅니다. 예외 응답이 오면 Modbus 응답 없음 점검 글의 예외 표를 보세요." },
        { h: "PortDock 에서는" },
        {
          ul: [
            "Net Scan: 대역을 ARP·핑으로 훑어 502 가 열린 장비를 보여 주고 «IP:502» 를 복사해 줍니다. 장비 정보 읽기(FC 2B/0E)는 Unit ID 1 로 묻고, 안 되면 255 로 묻습니다.",
            "Modbus Master: Modbus TCP 로 연결하면 트랜잭션 번호로 응답을 맞추고, 늦게 온 지난 요청의 응답은 버립니다.",
            "TCP: 클라이언트로 502 에 접속해 MBAP 가 붙은 요청을 직접 보내고, 응답의 트랜잭션 ID·길이 칸·Unit ID 를 풀어 봅니다. 중계 모드로 HMI 와 PLC 사이를 오가는 요청을 볼 수도 있습니다.",
            "웹 도구 «Modbus 프레임 해석기»: MBAP 가 붙은 HEX 를 붙여 넣으면 머리와 PDU 를 풀어 줍니다.",
          ],
        },
      ],
      en: [
        { p: "Modbus TCP sends the Modbus request (PDU) over TCP with a 7-byte MBAP header in front. There is no RTU CRC, and the MBAP unit ID takes the place of the slave ID. «It doesn't work» happens at one of the four layers below, so check them bottom-up. Specification details follow the Modbus Messaging on TCP/IP Implementation Guide V1.0b." },
        {
          table: {
            plain: true,
            head: ["Layer", "Check", "If it passes"],
            rows: [
              ["1. Network", "Same subnet? Do ARP and ping reach it?", "The device is on the network"],
              ["2. TCP connection", "Does port 502 (or the configured port) accept?", "A Modbus server is listening"],
              ["3. Modbus reply", "Does a request get an MBAP reply?", "Unit ID and function fit"],
              ["4. Values", "Do the values make sense?", "Address notation and word order fit"],
            ],
          },
        },
        { h: "1. Network: start with the subnet" },
        { p: "Factory devices often ship with fixed IPs such as 192.168.1.x; if the PC is on another subnet, not even ping gets through. Adding a second IP on that subnet to the PC reaches the device without dropping your current network (e.g. device 192.168.1.10 → PC 192.168.1.200, mask 255.255.255.0). Some devices block ping, so «no ping» alone does not prove the device is absent — on the same subnet ARP still finds it." },
        { h: "2. Does port 502 accept a connection?" },
        {
          ul: [
            "The guide makes TCP 502 the default listening port and recommends that the port be configurable. Check whether the device's port was changed.",
            "An immediate refusal means nothing listens on that port; a long wait followed by failure usually means a firewall or router blocks it, or the address is wrong.",
            "The number of simultaneous TCP connections is left to the device's capacity, not fixed by the specification. If an HMI or SCADA already uses all of them, new connections are refused or the port looks closed. Disconnect other masters while testing, or look up the maximum in the manual.",
            "If the PC acts as the server (simulating a slave), Windows Firewall asks for permission the first time. Without it other devices cannot connect.",
          ],
        },
        { h: "3. Connected but no reply: MBAP and unit ID" },
        { p: "A request reading two holding registers from address 0, and its reply (values 100 and 200):" },
        { code: "Request   00 01 00 00 00 06 01 03 00 00 00 02\nResponse  00 01 00 00 00 07 01 03 04 00 64 00 C8" },
        {
          table: {
            head: ["Bytes", "Meaning"],
            rows: [
              ["00 01", "Transaction ID — copied into the reply by the server"],
              ["00 00", "Protocol ID — 0 for Modbus"],
              ["00 06", "Length — bytes that follow (unit ID + PDU)"],
              ["01", "Unit ID"],
              ["03 00 00 00 02", "PDU — function 03, start address 0, quantity 2"],
            ],
          },
        },
        {
          ul: [
            "A device that speaks Modbus TCP natively is already identified by its IP address, so the guide recommends the non-significant unit ID 0xFF (255) and also accepts 0. Which values a device actually accepts varies, so check the manual; if unsure, try 1, 255 and 0.",
            "Behind a gateway (TCP ↔ RTU), the unit ID is the serial device's slave ID (1–247). If the gateway returns exception 0A (path unavailable) or 0B (target failed to respond), the TCP side works and the problem is on the serial side.",
            "If the length field does not match the actual byte count, the device may discard the request. This happens often with hand-built bytes.",
            "TCP does not keep message boundaries, so replies can arrive split or two at once. Split replies by the MBAP length field and pair them with requests by transaction ID.",
          ],
        },
        { h: "4. Connections drop or will not come back" },
        {
          ul: [
            "The guide recommends keeping the connection open rather than opening and closing it for every request. A master that reconnects for each request can use up the device's connection slots quickly.",
            "The server may close a connection too; the client must accept that and reopen when needed.",
            "If a cable is pulled or the peer powers off while connected, the device may keep holding that slot. The guide recommends enabling TCP keep-alive on both ends to detect broken connections. If the device only accepts a connection again after a power cycle, suspect this.",
          ],
        },
        { h: "Replies arrive but values look wrong" },
        { p: "That is interpretation, not communication. Values shifted by one point to address notation (0-based, 40001); wrong 32-bit values only point to word order. For exception replies, see the exception table in the no-response checklist." },
        { h: "In PortDock" },
        {
          ul: [
            "Net Scan sweeps a subnet with ARP and ping, shows devices with port 502 open and copies «IP:502». Its device ID read (FC 2B/0E) tries unit ID 1 first, then 255.",
            "Modbus Master matches Modbus TCP replies by transaction ID and discards late replies to earlier requests.",
            "TCP: connect to port 502 as a client, send requests with an MBAP header and decode the reply's transaction ID, length field and unit ID. Relay mode shows requests passing between an HMI and a PLC.",
            "«Modbus Frame Decoder» web tool: paste hex with an MBAP header to decode the header and PDU.",
          ],
        },
      ],
    },
  },
  // 근거: TI 응용 노트 «Comparing Bus Solutions» SLLA067C(2017) 2.13~2.15 — TIA-232(±5~15 V 출력·±3 V 수신·2500 pF·약 20 m),
  // TIA/EIA-422(송신기 1·수신기 10·1200 m·200 mV·공통 모드 7 V·먼 끝 종단), TIA-485(1.5 V·32 단위 부하 약 12 kΩ·1/8 UL 256·−7~12 V·200 mV·1200 m·양 끝 종단·반이중/전이중).
  // apps/modbus-master/src/help.ts(에코 건너뜀은 modbus-no-response 글과 같은 근거).
  {
    slug: "rs232-rs422-rs485",
    date: "2026-10-22",
    tools: ["serial", "modbus-master"],
    related: ["rs485-wiring", "usb-serial-latency", "modbus-rtu-frame", "rs232-db9-null-modem"],
    webTools: ["tools/web-serial/", "tools/uart-baud/"],
    title: { ko: "RS-232·RS-422·RS-485 차이 — 배선·거리·장비 수로 고르기", en: "RS-232 vs RS-422 vs RS-485 — choosing by wiring, distance and node count" },
    seoTitle: { ko: "RS232·RS422·RS485 차이 — 배선·거리·장비 수 비교 — PortDock", en: "RS-232 vs RS-422 vs RS-485: Wiring, Distance, Nodes — PortDock" },
    desc: {
      ko: "셋 다 시리얼이지만 전기 방식이 다릅니다. 단일 종단과 차동, 1:1 과 멀티드롭, 2선식과 4선식, 거리·장비 수를 표준 기준으로 비교하고 고르는 법을 정리했습니다.",
      en: "All serial, but electrically different: single-ended vs differential, point-to-point vs multidrop, 2-wire vs 4-wire, distance, node count, how to choose.",
    },
    body: {
      ko: [
        { p: "RS-232·RS-422·RS-485 는 «데이터를 어떤 약속으로 주고받을지(프로토콜)» 가 아니라 «전기 신호를 어떻게 실을지(물리 계층)» 를 정한 규격입니다. 그래서 같은 Modbus RTU 를 셋 중 어느 선로로도 보낼 수 있고, 통신 프로그램의 속도·패리티 설정도 같습니다. 다른 것은 배선, 거리, 한 선로에 붙는 장비 수입니다. 아래 숫자는 TI 응용 노트 «Comparing Bus Solutions»(SLLA067C)의 TIA/EIA 표준 정리를 따릅니다." },
        {
          table: {
            plain: true,
            head: ["", "RS-232", "RS-422", "RS-485"],
            rows: [
              ["신호", "단일 종단(GND 기준 전압)", "차동(두 선의 전압 차)", "차동"],
              ["연결", "1:1", "송신기 1 : 수신기 최대 10", "여러 송수신기가 한 선로 공유(32 단위 부하)"],
              ["방향", "송신·수신 선이 따로", "한 쌍은 한 방향(양방향은 두 쌍)", "2선식 반이중 또는 4선식 전이중"],
              ["거리", "약 20 m (선로 용량 2500 pF 미만)", "최대 1200 m", "최대 1200 m"],
              ["수신 판정", "±3 V", "차동 200 mV", "차동 200 mV"],
              ["공통 모드 전압", "—", "7 V 까지", "−7 ~ +12 V"],
              ["종단 저항", "없음", "송신기 반대쪽 끝", "선로 양 끝"],
            ],
          },
        },
        { p: "거리와 속도는 동시에 최대로 쓸 수 없습니다. 1200 m 는 느린 속도에서, 높은 속도는 짧은 선로에서 나오는 값입니다." },
        { fig: { src: "/img/guides/serial-topologies.ko.svg", w: 780, h: 480, alt: "RS-232 는 TxD·RxD 를 엇갈리고 GND 를 잇는 1:1 연결, RS-422 는 송신기 하나가 차동 쌍으로 수신기 최대 10개에 보내고 먼 끝을 종단, RS-485 는 여러 송수신기가 한 쌍을 함께 쓰고 양 끝을 120 Ω 으로 종단하는 그림", cap: "세 방식의 연결 모양. RS-232 는 1:1, RS-422 는 송신기 하나에 수신기 여럿, RS-485 는 여러 장비가 한 쌍을 함께 씁니다." } },
        { h: "RS-232: 가까운 1:1" },
        { p: "송신(TxD)·수신(RxD)·접지(GND) 세 선이 기본이고, 신호는 GND 에 대한 전압입니다(송신 쪽 ±5~15 V, 수신 쪽은 +3 V 위·−3 V 아래로 판정). PC 의 COM 포트나 장비의 설정용 포트처럼 가까운 1:1 연결에 씁니다. 두 장비가 모두 같은 쪽(DTE)이면 TxD 와 RxD 를 엇갈려 잇는 널 모뎀 케이블이 필요합니다. 응답이 전혀 없으면 송수신 선이 엇갈렸는지부터 봅니다." },
        { h: "RS-485: 여러 장비를 한 줄로" },
        { p: "두 선의 전압 차로 보내므로 잡음과 장비 사이 접지 전위 차(공통 모드 −7~+12 V)에 강합니다. 표준 송수신기(1 단위 부하, 약 12 kΩ) 기준으로 한 선로에 32개까지, 1/8 단위 부하 송수신기라면 256개까지 붙일 수 있습니다. 2선식은 같은 쌍으로 보내고 받으므로 한 번에 한 장비만 말해야 합니다(반이중). 마스터가 묻고 슬레이브 하나가 답하는 Modbus RTU 와 잘 맞는 이유입니다." },
        { p: "종단 저항·바이어스·A/B 극성·접지 같은 배선 점검은 RS-485 배선 점검 글에 따로 정리했습니다." },
        { h: "RS-422: 송신기 하나, 수신기 여럿" },
        { p: "차동 신호라 RS-485 처럼 멀리 가지만, 한 쌍에는 송신기가 하나만 붙고 수신기는 10개까지입니다. 양방향으로 쓰려면 송신 쌍과 수신 쌍, 두 쌍(4선)을 씁니다. 4선식 RS-485 와 배선 모양이 비슷해서 변환기 하나가 두 방식을 함께 지원하기도 합니다 — 변환기 설명서에서 «RS-422 / RS-485 4W» 같은 표기를 확인합니다." },
        { h: "고르는 법" },
        {
          table: {
            plain: true,
            head: ["상황", "고를 것"],
            rows: [
              ["PC 와 장비 하나, 몇 m 안", "RS-232 (장비에 있으면)"],
              ["장비 여러 대를 마스터 하나에", "RS-485 2선식"],
              ["수십 m 이상, 인버터 같은 잡음원 근처", "RS-485 또는 RS-422 (차동)"],
              ["1:1 장거리, 송신·수신을 동시에", "RS-422 또는 RS-485 4선식"],
            ],
          },
        },
        { p: "결국은 장비에 달린 포트가 정합니다. 장비에 RS-485 만 있으면 PC 쪽에 USB-RS485 변환기를 씁니다. RS-232 장비를 멀리 이어야 하면 양 끝에 RS-232 ↔ RS-485 변환기를 두는 방법도 있습니다." },
        { h: "변환기를 고를 때" },
        {
          ul: [
            "2선식 RS-485 변환기는 보낼 때만 송신기를 켜는 방향 제어가 필요합니다. 자동 방향 제어인지, RTS 신호로 바꾸는지 확인합니다.",
            "2선식에서는 내가 보낸 바이트가 수신으로 돌아오는(에코) 변환기가 있습니다. 통신 기록에 보낸 바이트가 그대로 찍히면 이것입니다.",
            "USB 변환기는 받은 데이터를 묶어 넘기므로 Modbus RTU 프레임 구분에 영향을 줄 수 있습니다 — USB-시리얼 변환기 지연 글을 보세요.",
          ],
        },
        { h: "PortDock 에서는" },
        {
          ul: [
            "Serial: 세 방식 모두 윈도우에서는 같은 COM 포트로 보입니다. 포트를 열어 바이트를 HEX 로 주고받으면 프로토콜과 상관없이 배선이 맞는지 확인할 수 있습니다.",
            "Modbus Master: 2선식 RS-485 변환기의 에코를 알아서 건너뜁니다.",
            "웹 도구 «웹 시리얼 터미널»: 설치 없이 브라우저에서 COM 포트를 엽니다(Web Serial 을 지원하는 브라우저).",
          ],
        },
      ],
      en: [
        { p: "RS-232, RS-422 and RS-485 define how electrical signals travel (the physical layer), not what the bytes mean (the protocol). The same Modbus RTU can run over any of them with the same baud and parity settings. What differs is the wiring, the distance and how many devices share a line. The figures below follow the TIA/EIA summary in TI's application report «Comparing Bus Solutions» (SLLA067C)." },
        {
          table: {
            plain: true,
            head: ["", "RS-232", "RS-422", "RS-485"],
            rows: [
              ["Signal", "Single-ended (voltage to GND)", "Differential (voltage between two wires)", "Differential"],
              ["Topology", "Point-to-point", "1 driver : up to 10 receivers", "Many transceivers share one line (32 unit loads)"],
              ["Direction", "Separate transmit and receive wires", "One direction per pair (two pairs for both)", "2-wire half duplex or 4-wire full duplex"],
              ["Distance", "About 20 m (line capacitance under 2500 pF)", "Up to 1200 m", "Up to 1200 m"],
              ["Receiver threshold", "±3 V", "200 mV differential", "200 mV differential"],
              ["Common-mode voltage", "—", "Up to 7 V", "−7 to +12 V"],
              ["Termination", "None", "Far end from the driver", "Both ends of the line"],
            ],
          },
        },
        { p: "Distance and speed cannot both be at their maximum. 1200 m applies at low speeds; high speeds need short lines." },
        { fig: { src: "/img/guides/serial-topologies.en.svg", w: 780, h: 480, alt: "RS-232 point-to-point with TxD and RxD crossed and GND joined; RS-422 with one driver sending on a differential pair to up to 10 receivers, terminated at the far end; RS-485 with several transceivers sharing one pair, 120 Ω at both ends", cap: "How each standard connects: RS-232 point-to-point, RS-422 one driver to several receivers, RS-485 many devices sharing one pair." } },
        { h: "RS-232: short point-to-point" },
        { p: "Transmit (TxD), receive (RxD) and ground (GND) are the basic three wires, and signals are voltages relative to GND (±5 to 15 V at the driver; the receiver decides above +3 V or below −3 V). It suits short point-to-point links such as a PC COM port or a device's configuration port. Two devices of the same kind (DTE) need a null-modem cable that crosses TxD and RxD. If nothing answers at all, check whether transmit and receive are crossed correctly." },
        { h: "RS-485: many devices on one line" },
        { p: "Differential signalling resists noise and ground potential differences between devices (common mode −7 to +12 V). With standard transceivers (one unit load, about 12 kΩ) a line takes 32 devices; with 1/8 unit-load transceivers, 256. Two-wire RS-485 sends and receives on the same pair, so only one device may talk at a time (half duplex) — a natural fit for Modbus RTU, where the master asks and one slave answers." },
        { p: "Termination, biasing, A/B polarity and ground are covered in the RS-485 wiring checklist." },
        { h: "RS-422: one driver, several receivers" },
        { p: "Differential like RS-485, so it also runs long distances, but each pair has only one driver and up to 10 receivers. Two-way links use two pairs (four wires), one per direction. Because the wiring resembles 4-wire RS-485, one adapter often supports both — look for «RS-422 / RS-485 4W» in the adapter manual." },
        { h: "How to choose" },
        {
          table: {
            plain: true,
            head: ["Situation", "Choose"],
            rows: [
              ["PC and one device, a few metres", "RS-232 (if the device has it)"],
              ["Several devices on one master", "RS-485 two-wire"],
              ["Tens of metres or more, near drives and other noise", "RS-485 or RS-422 (differential)"],
              ["Long point-to-point link, sending and receiving at once", "RS-422 or 4-wire RS-485"],
            ],
          },
        },
        { p: "In the end the device's port decides. If it only has RS-485, use a USB-RS485 adapter on the PC. To extend an RS-232 device, an RS-232 ↔ RS-485 converter at each end is an option." },
        { h: "Choosing an adapter" },
        {
          ul: [
            "Two-wire RS-485 adapters need direction control that enables the driver only while sending. Check whether it is automatic or switched by RTS.",
            "Some two-wire adapters echo your own bytes back to the receiver. If the log shows your transmitted bytes coming back, that is the echo.",
            "USB adapters batch received data, which can affect Modbus RTU framing — see the USB-serial adapter latency guide.",
          ],
        },
        { h: "In PortDock" },
        {
          ul: [
            "Serial: all three appear in Windows as the same kind of COM port. Opening the port and exchanging hex bytes checks the wiring regardless of protocol.",
            "Modbus Master skips the echo of a two-wire RS-485 adapter automatically.",
            "«Web Serial Terminal» web tool: open a COM port in the browser without installing anything (in browsers that support Web Serial).",
          ],
        },
      ],
    },
  },
  // 근거: site/src/lib/analogScale.ts — NAMUR NE 43 경계(3.8~20.5 mA 측정, ≤3.6·≥21 mA 고장; Vaisala·Endress+Hauser 매뉴얼로 확인),
  // S7-1500 0~27648(Siemens A5E03461439-AC 표 3-4), MELSEC iQ-R 0~32000(Mitsubishi 사양 페이지). 환산식·250 Ω 전압은 일차식·옴의 법칙 계산.
  {
    slug: "4-20ma-loop",
    date: "2026-10-22",
    tools: ["modbus-master", "plot"],
    related: ["pt100-thermocouple-wiring", "24v-voltage-drop", "modbus-float-word-order", "pressure-units"],
    webTools: ["tools/4-20ma/", "tools/loop-load/"],
    title: { ko: "4–20mA 신호 기초와 고장 찾기 — 2선식·4선식·라이브 제로·단선 판정", en: "4–20 mA basics and troubleshooting — 2-wire, 4-wire, live zero, open loop" },
    seoTitle: { ko: "4-20mA 신호 기초와 고장 찾기 (2선식·4선식·단선) — PortDock", en: "4–20 mA Loop Basics & Troubleshooting (2-Wire, 4-Wire) — PortDock" },
    desc: {
      ko: "왜 0 이 아니라 4 mA 에서 시작하는지, 2선식과 4선식 배선 차이, 환산식, NAMUR NE 43 고장 신호(3.6 mA·21 mA)로 단선과 센서 고장을 가려내는 순서.",
      en: "Why the signal starts at 4 mA, 2-wire vs 4-wire wiring, scaling, and how NAMUR NE 43 failure currents (3.6, 21 mA) tell open loops from sensor faults.",
    },
    body: {
      ko: [
        { p: "4–20mA 는 압력·유량·온도 전송기가 측정값을 전류로 보내는 방식입니다. 직렬 회로의 전류는 어디서나 같아서, 선이 길어 저항이 생겨도 전원 전압이 충분한 한 받는 쪽의 값이 바뀌지 않습니다. 하한 4 mA 가 0 %, 상한 20 mA 가 100 % 입니다." },
        { h: "라이브 제로: 왜 4 mA 부터인가" },
        { p: "0 % 에서도 4 mA 가 흐르므로 «측정값 0» 과 «전류 없음(단선·전원 꺼짐)» 이 구분됩니다. 0–20mA 신호는 0 % 가 0 mA 라 이 둘을 가르지 못합니다. 또 0 % 에서도 전류가 흐르기 때문에 2선식 전송기는 신호를 보내는 두 선에서 자기 동작 전력까지 얻을 수 있습니다." },
        { h: "환산식" },
        { code: "값 = 하한 + (전류 − 4) ÷ 16 × (상한 − 하한)" },
        {
          table: {
            head: ["전류", "%", "0~10 bar 전송기", "250 Ω 양단 전압"],
            rows: [
              ["4 mA", "0", "0 bar", "1 V"],
              ["8 mA", "25", "2.5 bar", "2 V"],
              ["12 mA", "50", "5 bar", "3 V"],
              ["16 mA", "75", "7.5 bar", "4 V"],
              ["20 mA", "100", "10 bar", "5 V"],
            ],
          },
        },
        { p: "전압 입력만 있는 장비에는 250 Ω 저항을 달아 4–20mA 를 1–5 V 로 받습니다(옴의 법칙). PLC 아날로그 입력은 전류를 정수 카운트로 바꿉니다 — SIMATIC S7-1500 은 하한~상한을 0~27648 로, MELSEC iQ-R 은 0~32000 으로 냅니다(각 제조사 매뉴얼). 카운트가 이상하면 먼저 mA 로 되돌려 봅니다." },
        { h: "2선식·3선식·4선식" },
        {
          table: {
            plain: true,
            head: ["방식", "배선", "전원"],
            rows: [
              ["2선식(루프 전원)", "두 선이 전원이자 신호", "루프 어딘가의 직류 전원이 전송기를 돌림"],
              ["3선식", "전원 +, 공통, 신호 출력", "전원과 신호가 공통선을 나눠 씀"],
              ["4선식(능동 출력)", "전원 두 선 + 신호 두 선", "전송기에 따로 전원, 전류를 스스로 내보냄"],
            ],
          },
        },
        { p: "배선에서 먼저 볼 것은 «누가 루프 전원을 대는가» 입니다. 2선식 전송기는 스스로 전류를 만들지 못하므로 루프 어딘가에 전원이 있어야 합니다. 받는 쪽 입력이 전원을 대는 입력인지, 전원 없이 전류만 재는 입력인지 매뉴얼에서 확인합니다. 2선식 전송기를 전원 없는 입력에 물리면 루프에 전원이 하나도 없고, 4선식(능동 출력) 전송기를 전원을 대는 입력에 물리면 전원이 둘이 됩니다." },
        { fig: { src: "/img/guides/4-20ma-wiring.ko.svg", w: 780, h: 535, alt: "2선식: 루프 전원 + → 전송기 → 입력 카드의 250 Ω → 전원 − 로 도는 직렬 루프. 4선식: 전송기에 따로 전원을 주고, 전송기 출력 +OUT·−OUT 이 입력 카드의 250 Ω 으로 전류를 보냄. 250 Ω 양단은 1–5 V", cap: "2선식은 루프 전원 하나가 전송기와 입력을 직렬로 돌고, 4선식은 전송기가 따로 전원을 받아 전류를 스스로 냅니다. 250 Ω 양단은 4–20 mA 에서 1–5 V." } },
        { h: "루프 전압이 모자라면" },
        { p: "2선식 루프의 전원 전압은 «전송기가 동작에 필요한 최소 전압 + 20 mA × 루프 저항(받는 쪽 입력 저항 + 선 저항 + 중간 표시기)» 보다 커야 합니다. 모자라면 상한 근처에서 전류가 더 오르지 못하고 멈춥니다. 예를 들어 입력 저항 250 Ω 에 20 mA 가 흐르면 그 저항에서만 5 V 가 떨어집니다. 전송기의 최소 전압은 전송기 매뉴얼에 있습니다." },
        { h: "고장 신호: NAMUR NE 43" },
        { p: "NAMUR 권고 NE 43 을 따르는 전송기는 측정값을 3.8~20.5 mA 안에서만 내고, 스스로 고장을 알아채면 3.6 mA 이하나 21 mA 이상을 냅니다. 고장 때 낮은 쪽으로 갈지 높은 쪽으로 갈지는 전송기 설정에서 정하며, 방법은 전송기 매뉴얼에 있습니다." },
        {
          table: {
            plain: true,
            head: ["받은 전류", "뜻", "먼저 볼 것"],
            rows: [
              ["0 mA 근처", "전류가 흐르지 않음", "단선, 루프 전원 꺼짐·퓨즈, 2선식 극성 반대"],
              ["3.6 mA 이하", "NE 43 고장 신호(낮음)", "전송기 진단 표시, 센서 단선"],
              ["3.6~3.8 mA", "NE 43 측정 범위 밖", "공정값이 하한 아래, 영점"],
              ["3.8~4 mA", "하한 미만, 측정 범위 안", "영점 조정"],
              ["20~20.5 mA", "상한 초과, 측정 범위 안", "범위 설정"],
              ["20.5~21 mA", "NE 43 측정 범위 밖", "공정값이 상한 위"],
              ["21 mA 이상", "NE 43 고장 신호(높음)", "전송기 진단 표시, 신호선 단락"],
            ],
          },
        },
        { h: "현장에서 단선을 가리는 순서" },
        {
          ul: [
            "1. 화면의 공학값이 아니라 mA 를 봅니다. PLC 카운트·공학값은 환산을 거친 값이라 환산 설정이 틀리면 엉뚱하게 보입니다. 환산 계산기로 카운트를 mA 로 되돌려 봅니다.",
            "2. 멀티미터를 전류 측정으로 두고 루프에 직렬로 넣어 실제 전류를 잽니다. 전원 단자에 전압이 있는데 전류가 0 이면 루프 어딘가가 끊긴 것입니다.",
            "3. 3.6 mA 이하나 21 mA 이상이면 전송기가 스스로 고장을 알리는 것일 수 있습니다. 전송기 표시창이나 진단 메뉴를 봅니다.",
            "4. 값이 늘 일정한 비율로 틀리면 환산 범위(공학값 하한·상한, 카운트 범위)를, 일정한 양만큼 밀려 있으면 영점을 의심합니다.",
            "5. 값이 흔들리면 차폐선 접지와, 신호선이 인버터 출력선과 같은 덕트를 지나지 않는지 봅니다.",
          ],
        },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «4–20mA 환산 계산기»: 전류·공학값·%·PLC 카운트를 서로 바꾸고, 4–20mA 값이 NE 43 고장 범위나 측정 범위 밖이면 알려 줍니다. S7-1500·MELSEC iQ-R·Compact I/O 카운트 범위가 들어 있습니다.",
            "아날로그 값을 Modbus 로 내주는 변환기·계측기라면 Modbus Master 로 그 레지스터를 읽고 추세 그림으로 흔들림을 봅니다.",
            "시리얼로 값을 찍어 내는 장비는 Plot 으로 실시간 그래프를 그리고 CSV 로 남깁니다.",
          ],
        },
      ],
      en: [
        { p: "4–20 mA is how pressure, flow and temperature transmitters send a measurement as current. Current is the same everywhere in a series loop, so long wires and their resistance do not change the reading as long as the supply voltage is sufficient. The low end, 4 mA, is 0 %; the high end, 20 mA, is 100 %." },
        { h: "Live zero: why 4 mA" },
        { p: "Because 4 mA flows even at 0 %, «measurement is zero» and «no current» (open loop, power off) can be told apart. A 0–20 mA signal puts 0 % at 0 mA and cannot. And since current always flows, a 2-wire transmitter can draw its own operating power from the same two wires that carry the signal." },
        { h: "Scaling formula" },
        { code: "value = low + (current − 4) ÷ 16 × (high − low)" },
        {
          table: {
            head: ["Current", "%", "0–10 bar transmitter", "Voltage across 250 Ω"],
            rows: [
              ["4 mA", "0", "0 bar", "1 V"],
              ["8 mA", "25", "2.5 bar", "2 V"],
              ["12 mA", "50", "5 bar", "3 V"],
              ["16 mA", "75", "7.5 bar", "4 V"],
              ["20 mA", "100", "10 bar", "5 V"],
            ],
          },
        },
        { p: "A device with voltage inputs only can take 4–20 mA as 1–5 V across a 250 Ω resistor (Ohm's law). PLC analog inputs convert the current to integer counts — the SIMATIC S7-1500 maps low–high to 0–27648 and the MELSEC iQ-R to 0–32000 (per the manufacturers' manuals). If counts look wrong, convert them back to mA first." },
        { h: "2-wire, 3-wire and 4-wire" },
        {
          table: {
            plain: true,
            head: ["Type", "Wiring", "Power"],
            rows: [
              ["2-wire (loop-powered)", "Two wires carry both power and signal", "A DC supply somewhere in the loop runs the transmitter"],
              ["3-wire", "Supply +, common, signal output", "Supply and signal share the common wire"],
              ["4-wire (active output)", "Two power wires + two signal wires", "Separately powered; the transmitter drives the current itself"],
            ],
          },
        },
        { p: "The first wiring question is «who powers the loop?». A 2-wire transmitter cannot drive current on its own, so the loop needs a supply somewhere. Check in the manual whether the receiving input supplies power or only measures current. A 2-wire transmitter on an unpowered input leaves the loop with no supply at all; a 4-wire (active) transmitter on a powered input puts two sources in the loop." },
        { fig: { src: "/img/guides/4-20ma-wiring.en.svg", w: 780, h: 535, alt: "2-wire: a series loop from the loop supply + through the transmitter and the input card's 250 Ω back to supply −. 4-wire: the transmitter has its own power and drives current from +OUT/−OUT into the input's 250 Ω. 1–5 V across 250 Ω", cap: "In a 2-wire loop one supply drives the transmitter and the input in series; a 4-wire transmitter has its own power and drives the current itself. 4–20 mA gives 1–5 V across 250 Ω." } },
        { h: "When the loop voltage is too low" },
        { p: "In a 2-wire loop the supply must exceed «the transmitter's minimum operating voltage + 20 mA × loop resistance (input resistance + wire resistance + any indicators)». If it does not, the current stops rising near the top of the range. For example, 20 mA through a 250 Ω input drops 5 V across that resistor alone. The transmitter's minimum voltage is in its manual." },
        { h: "Failure signals: NAMUR NE 43" },
        { p: "Transmitters following NAMUR recommendation NE 43 output measurements only within 3.8–20.5 mA and signal a detected failure with 3.6 mA or less, or 21 mA or more. Whether a failure drives the output low or high is set in the transmitter; its manual explains how." },
        {
          table: {
            plain: true,
            head: ["Current received", "Meaning", "Check first"],
            rows: [
              ["Near 0 mA", "No current flows", "Open loop, loop supply off or fuse, reversed polarity on a 2-wire device"],
              ["≤ 3.6 mA", "NE 43 failure signal (low)", "Transmitter diagnostics, broken sensor"],
              ["3.6–3.8 mA", "Outside the NE 43 measurement range", "Process below the low end, zero"],
              ["3.8–4 mA", "Below the low end, inside the measurement range", "Zero adjustment"],
              ["20–20.5 mA", "Above the high end, inside the measurement range", "Range setting"],
              ["20.5–21 mA", "Outside the NE 43 measurement range", "Process above the high end"],
              ["≥ 21 mA", "NE 43 failure signal (high)", "Transmitter diagnostics, short between signal wires"],
            ],
          },
        },
        { h: "Finding an open loop on site" },
        {
          ul: [
            "1. Look at mA, not the engineering value. PLC counts and engineering values pass through scaling, so a wrong scaling setup makes them look odd. Convert the count back to mA with a scaling calculator.",
            "2. Put a multimeter on its current range in series with the loop and measure the actual current. If the supply terminals have voltage but the current is zero, the loop is broken somewhere.",
            "3. At 3.6 mA or below, or 21 mA or above, the transmitter may be reporting its own failure. Check its display or diagnostics menu.",
            "4. A reading off by a constant ratio points to the scaling ranges (engineering low/high, count range); a constant offset points to the zero.",
            "5. If the value fluctuates, check the shield grounding and whether the signal cable shares a duct with drive output cables.",
          ],
        },
        { h: "In PortDock" },
        {
          ul: [
            "«4–20 mA Scaling Calculator» web tool converts between current, engineering units, % and PLC counts and flags 4–20 mA values in the NE 43 failure range or outside the measurement range. Count ranges for S7-1500, MELSEC iQ-R and Compact I/O are built in.",
            "For converters and meters that publish analog values over Modbus, read the registers with Modbus Master and watch fluctuations on its trend lines.",
            "Devices that print values over serial can be graphed live with Plot and saved as CSV.",
          ],
        },
      ],
    },
  },
  // 근거: IEC 60751 Callendar–Van Dusen 식(α 0.00385)과 NIST ITS-90 열전대 표(SRD 60, Monograph 175) — 저항·mV 값은 site/src/lib/temperature.ts 로 계산,
  // 열전대 재료 이름은 NIST 표 머리. 허용차 A·B 급 식·0/100 °C 값은 JUMO «Pt100 accuracy class» 글. 3선식 상쇄 조건·2선식 선 저항 오차는 계산.
  {
    slug: "pt100-thermocouple-wiring",
    date: "2026-10-22",
    tools: ["modbus-master", "plot"],
    related: ["4-20ma-loop", "modbus-float-word-order", "ntc-thermistor-temperature"],
    webTools: ["tools/temperature/"],
    devices: true,
    title: { ko: "Pt100 2선·3선·4선식 차이와 열전대 종류 고르기", en: "Pt100 2-, 3- and 4-wire connections, and choosing a thermocouple type" },
    seoTitle: { ko: "Pt100 2선·3선·4선식 차이와 열전대 K·J·T 고르기 — PortDock", en: "Pt100 2-, 3-, 4-Wire and Thermocouple Types Compared — PortDock" },
    desc: {
      ko: "Pt100 은 선 저항이 그대로 온도 오차가 됩니다 — 왕복 1 Ω 이면 약 2.6 °C. 2·3·4선식 차이와 허용차 등급, 열전대 K·J·T·E·N·R·S·B 의 범위와 냉접점 보정까지.",
      en: "In a Pt100, lead resistance becomes error — 1 Ω is about 2.6 °C. 2-, 3- and 4-wire, tolerance classes, thermocouple types K to B, cold-junction compensation.",
    },
    body: {
      ko: [
        { p: "공정 온도를 재는 센서는 크게 측온저항체(RTD, 대표가 Pt100)와 열전대 두 가지입니다. 측온저항체는 온도에 따라 바뀌는 백금 저항을 재고, 열전대는 서로 다른 두 금속의 접점에서 생기는 열기전력(mV)을 잽니다. 아래 저항·전압 값은 IEC 60751 의 식과 NIST ITS-90 열전대 표(SRD 60)로 계산했습니다." },
        { h: "Pt100: 0 °C 에서 100 Ω" },
        {
          table: {
            head: ["온도", "Pt100 저항"],
            rows: [
              ["−200 °C", "18.52 Ω"],
              ["−100 °C", "60.26 Ω"],
              ["0 °C", "100.00 Ω"],
              ["100 °C", "138.51 Ω"],
              ["200 °C", "175.86 Ω"],
              ["400 °C", "247.09 Ω"],
              ["850 °C", "390.48 Ω"],
            ],
          },
        },
        { p: "0 °C 근처에서 1 °C 에 약 0.39 Ω 바뀝니다(IEC 60751, α = 0.00385). 그래서 0.39 Ω 의 저항 오차가 곧 약 1 °C 의 온도 오차입니다. Pt1000 은 같은 식에 저항만 10배입니다." },
        { h: "2선식·3선식·4선식" },
        {
          table: {
            plain: true,
            head: ["방식", "재는 방법", "선 저항의 영향"],
            rows: [
              ["2선식", "센서와 왕복 두 선의 저항을 함께 잼", "그대로 더해져 높게 읽음"],
              ["3선식", "셋째 선으로 선 저항을 재서 뺌", "세 선의 저항이 같을 때 상쇄"],
              ["4선식", "전류를 흘리는 두 선과 전압을 재는 두 선이 따로", "전압 선에 전류가 거의 흐르지 않아 무시할 만함"],
            ],
          },
        },
        { p: "2선식에서 왕복 선 저항이 1 Ω 이면 Pt100 은 0 °C 에서 약 2.6 °C, Pt1000 은 약 0.26 °C 높게 읽습니다. 선이 길고 가늘수록 저항이 커지므로 2선식은 짧은 배선이나 Pt1000 에 맞습니다. 3선식은 세 선의 길이·굵기·접속 저항이 같아야 상쇄되므로, 단자 하나가 헐겁거나 중간에 굵기가 다른 선으로 이으면 오차가 남습니다. 더 정확해야 하면 4선식을 씁니다." },
        { fig: { src: "/img/guides/pt100-wiring.ko.svg", w: 780, h: 330, alt: "Pt100 결선 세 가지: 2선식은 왕복 선 저항 2·RL 이 더해지고, 3선식은 셋째 선으로 선 저항을 재서 빼며, 4선식은 전류 선 I+·I− 와 전압 선 V+·V− 가 따로라 선 저항의 영향이 거의 없음", cap: "Pt100 의 2·3·4선식. RL 은 각 선의 저항입니다 — 2선식은 그대로 더해지고, 3선식은 세 선이 같을 때 상쇄되고, 4선식은 전압 선에 전류가 거의 흐르지 않습니다." } },
        { p: "받는 쪽(온도 조절기·변환기 입력)이 어떤 결선을 받는지가 먼저입니다. 3선식 입력에 2선식 센서를 물릴 때는 입력 매뉴얼의 단자 연결 방법을 따릅니다." },
        { h: "허용차 등급 (IEC 60751)" },
        { p: "IEC 60751 은 센서 자체의 허용차를 등급으로 나눕니다. A 급은 ±(0.15 + 0.002·|t|) °C, B 급은 ±(0.3 + 0.005·|t|) °C 로, 0 °C 에서 ±0.15 °C·±0.3 °C, 100 °C 에서 ±0.35 °C·±0.8 °C 입니다. 이보다 엄격한 AA 급과 느슨한 C 급도 있습니다. 등급마다 허용차가 유효한 온도 범위가 있고 권선형과 박막형이 다르니 센서 데이터시트를 확인합니다. 등급은 센서의 오차이고, 2선식 선 저항 오차는 그 위에 더해집니다." },
        { h: "열전대 종류" },
        {
          table: {
            head: ["형", "재료 (+ / −)", "NIST 표 범위", "100 °C 기전력"],
            rows: [
              ["K", "니켈-크로뮴 / 니켈-알루미늄", "−270 ~ 1372 °C", "4.096 mV"],
              ["J", "철 / 구리-니켈", "−210 ~ 1200 °C", "5.269 mV"],
              ["T", "구리 / 구리-니켈", "−270 ~ 400 °C", "4.279 mV"],
              ["E", "니켈-크로뮴 / 구리-니켈", "−270 ~ 1000 °C", "6.319 mV"],
              ["N", "니크로실 / 니실", "−270 ~ 1300 °C", "2.774 mV"],
              ["R", "백금-13% 로듐 / 백금", "−50 ~ 1768.1 °C", "0.647 mV"],
              ["S", "백금-10% 로듐 / 백금", "−50 ~ 1768.1 °C", "0.646 mV"],
              ["B", "백금-30% 로듐 / 백금-6% 로듐", "0 ~ 1820 °C", "0.033 mV"],
            ],
          },
        },
        { p: "NIST 표 범위는 기전력 식이 정의된 범위입니다. 실제로 쓸 수 있는 상한은 소선 굵기·보호관에 따라 더 낮으니 센서 제조사 사양을 따르세요." },
        { h: "고를 때 볼 것" },
        {
          ul: [
            "받는 쪽 입력이 지원하는 형인지 먼저 봅니다. 입력 설정의 형이 센서와 다르면 같은 mV 를 다른 온도로 읽습니다 — 4.096 mV 는 K 형으로 100 °C 지만 J 형으로 읽으면 약 78 °C 입니다.",
            "같은 온도에서 mV 가 클수록 잡음의 영향이 상대적으로 작습니다. 100 °C 에서 E·J·T·K 는 4.1~6.3 mV, R·S 는 약 0.65 mV, B 는 0.033 mV 입니다.",
            "1372 °C 를 넘는 온도는 백금 계열(R·S·B)의 표가 덮습니다. B 형은 실온에서 기전력이 거의 0(25 °C 에서 −0.002 mV)이라 냉접점 보정의 영향이 작지만, 낮은 온도에서는 신호가 너무 작습니다.",
            "센서와 입력 단자 사이를 늘일 때는 같은 형의 보상 도선(연장 도선)을 씁니다. 일반 구리선으로 이으면 이은 곳이 새 접점이 되어 오차가 납니다.",
          ],
        },
        { h: "냉접점 보정" },
        { p: "열전대의 mV 는 측정 끝과 입력 단자(냉접점)의 온도 차에 따른 값입니다. NIST 표는 냉접점 0 °C 기준이라, 입력 장치가 단자 온도를 재서 그만큼을 더해 줍니다. 예: K 형으로 300 °C 를 잴 때 단자가 25 °C 면 측정 mV 는 11.208 mV 입니다. 이것을 냉접점 0 °C 로 보고 표에서 찾으면 약 275.8 °C — 약 24 °C 낮게 읽습니다." },
        { fig: { src: "/img/guides/thermocouple-cjc.ko.svg", w: 780, h: 320, alt: "K 형 열전대: 측정 접점 300 °C, 보상 도선, 입력 단자(냉접점) 25 °C, 단자에서 재는 전압 11.208 mV. 냉접점 보정을 켜면 300 °C, 없으면 약 275.8 °C 로 읽음", cap: "냉접점 보정. 단자가 25 °C 면 300 °C 의 K 형 열전대에서 11.208 mV 만 잡히므로, 입력 장치가 단자 온도 몫을 더해야 300 °C 가 됩니다." } },
        {
          ul: [
            "늘 실온쯤만큼 낮게(또는 높게) 읽으면: 냉접점 보정이 꺼졌거나 두 번 들어간 경우입니다.",
            "데우는데 값이 내려가면: + − 극성이 반대입니다(보상 도선 포함).",
            "값이 최대나 최소로 튀면: 단선입니다. 입력 장치의 단선(burnout) 표시를 확인합니다.",
          ],
        },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «Pt100·열전대 온도 환산»: Pt100·Pt500·Pt1000 저항 ↔ 온도, K·J·T·E·N·R·S·B mV ↔ 온도를 계산하고, 냉접점 온도를 넣어 보정합니다. 온도표도 만듭니다.",
            "온도 조절기의 현재값·설정값은 Modbus Master 로 읽어 추세 그림으로 봅니다. 이 사이트의 장비 레지스터 맵에 오토닉스 TK·TX, 한영넉스 VX 온도 조절기가 있습니다.",
          ],
        },
      ],
      en: [
        { p: "Process temperature sensors come in two main kinds: resistance temperature detectors (RTDs, typically Pt100) and thermocouples. An RTD measures a platinum resistance that changes with temperature; a thermocouple measures the thermoelectric voltage (mV) at the junction of two different metals. The resistance and voltage values below are calculated from the IEC 60751 equation and the NIST ITS-90 thermocouple tables (SRD 60)." },
        { h: "Pt100: 100 Ω at 0 °C" },
        {
          table: {
            head: ["Temperature", "Pt100 resistance"],
            rows: [
              ["−200 °C", "18.52 Ω"],
              ["−100 °C", "60.26 Ω"],
              ["0 °C", "100.00 Ω"],
              ["100 °C", "138.51 Ω"],
              ["200 °C", "175.86 Ω"],
              ["400 °C", "247.09 Ω"],
              ["850 °C", "390.48 Ω"],
            ],
          },
        },
        { p: "Near 0 °C the resistance changes by about 0.39 Ω per °C (IEC 60751, α = 0.00385), so a 0.39 Ω resistance error is about a 1 °C temperature error. A Pt1000 follows the same equation with ten times the resistance." },
        { h: "2-wire, 3-wire and 4-wire" },
        {
          table: {
            plain: true,
            head: ["Connection", "What is measured", "Effect of lead resistance"],
            rows: [
              ["2-wire", "Sensor plus both leads together", "Added in full — reads high"],
              ["3-wire", "A third lead measures lead resistance to subtract it", "Cancelled when all three leads are equal"],
              ["4-wire", "Separate current leads and voltage-sensing leads", "Negligible — almost no current in the sensing leads"],
            ],
          },
        },
        { p: "With 1 Ω of total lead resistance on a 2-wire connection, a Pt100 reads about 2.6 °C high at 0 °C and a Pt1000 about 0.26 °C. Longer and thinner leads have more resistance, so 2-wire suits short runs or Pt1000. 3-wire cancels only when the three leads match in length, gauge and contact resistance; a loose terminal or a splice to a different gauge leaves an error. For higher accuracy use 4-wire." },
        { fig: { src: "/img/guides/pt100-wiring.en.svg", w: 780, h: 330, alt: "Three Pt100 connections: 2-wire adds the round-trip lead resistance 2·RL; 3-wire measures lead resistance on a third wire and subtracts it; 4-wire uses separate current leads I+/I− and sense leads V+/V−, so lead resistance has almost no effect", cap: "Pt100 2-, 3- and 4-wire. RL is each lead's resistance — added directly in 2-wire, cancelled in 3-wire when all three match, and carrying almost no current on the 4-wire sense leads." } },
        { p: "Start from what the receiving input (temperature controller, transmitter) accepts. To connect a 2-wire sensor to a 3-wire input, follow the terminal instructions in the input's manual." },
        { h: "Tolerance classes (IEC 60751)" },
        { p: "IEC 60751 grades the sensor's own tolerance. Class A is ±(0.15 + 0.002·|t|) °C and class B ±(0.3 + 0.005·|t|) °C — ±0.15 °C and ±0.3 °C at 0 °C, ±0.35 °C and ±0.8 °C at 100 °C. A tighter class AA and a looser class C also exist. Each class is valid over its own temperature range, different for wire-wound and thin-film elements, so check the sensor datasheet. The class covers the sensor; 2-wire lead error comes on top." },
        { h: "Thermocouple types" },
        {
          table: {
            head: ["Type", "Materials (+ / −)", "NIST table range", "EMF at 100 °C"],
            rows: [
              ["K", "Nickel-chromium / nickel-aluminum", "−270 to 1372 °C", "4.096 mV"],
              ["J", "Iron / copper-nickel", "−210 to 1200 °C", "5.269 mV"],
              ["T", "Copper / copper-nickel", "−270 to 400 °C", "4.279 mV"],
              ["E", "Nickel-chromium / copper-nickel", "−270 to 1000 °C", "6.319 mV"],
              ["N", "Nicrosil / nisil", "−270 to 1300 °C", "2.774 mV"],
              ["R", "Platinum-13% rhodium / platinum", "−50 to 1768.1 °C", "0.647 mV"],
              ["S", "Platinum-10% rhodium / platinum", "−50 to 1768.1 °C", "0.646 mV"],
              ["B", "Platinum-30% rhodium / platinum-6% rhodium", "0 to 1820 °C", "0.033 mV"],
            ],
          },
        },
        { p: "The NIST range is where the EMF equations are defined. The usable upper limit is lower depending on wire gauge and sheath, so follow the sensor maker's specification." },
        { h: "What to consider when choosing" },
        {
          ul: [
            "Check that the receiving input supports the type. If the input is set to a different type, the same mV reads as a different temperature — 4.096 mV is 100 °C as type K but about 78 °C read as type J.",
            "A larger mV at the same temperature makes noise relatively smaller. At 100 °C, types E, J, T and K give 4.1–6.3 mV, R and S about 0.65 mV, and B 0.033 mV.",
            "Above 1372 °C the platinum types (R, S, B) cover the tables. Type B produces almost nothing near room temperature (−0.002 mV at 25 °C), so cold-junction compensation matters little, but its signal is too small at low temperatures.",
            "To extend between the sensor and the input, use extension or compensating cable of the same type. Plain copper creates new junctions at the splice and adds error.",
          ],
        },
        { h: "Cold-junction compensation" },
        { p: "A thermocouple's mV depends on the temperature difference between the measuring tip and the input terminals (the cold junction). NIST tables assume a 0 °C cold junction, so the instrument measures its terminal temperature and adds the corresponding voltage. Example: measuring 300 °C with type K and terminals at 25 °C gives 11.208 mV. Looking that up as if the cold junction were 0 °C gives about 275.8 °C — some 24 °C low." },
        { fig: { src: "/img/guides/thermocouple-cjc.en.svg", w: 780, h: 320, alt: "Type K thermocouple: measuring junction at 300 °C, extension cable, input terminals (cold junction) at 25 °C, 11.208 mV measured at the terminals. With cold-junction compensation it reads 300 °C, without it about 275.8 °C", cap: "Cold-junction compensation. With terminals at 25 °C a type K thermocouple at 300 °C produces only 11.208 mV there, so the instrument must add the terminals' share to read 300 °C." } },
        {
          ul: [
            "Reads consistently low (or high) by about room temperature: compensation is off or applied twice.",
            "Reading falls while heating: + and − are reversed (including the extension cable).",
            "Reading jumps to maximum or minimum: open circuit. Check the input's burnout indication.",
          ],
        },
        { h: "In PortDock" },
        {
          ul: [
            "«Pt100 & Thermocouple Converter» web tool: Pt100, Pt500 and Pt1000 resistance ↔ temperature and type K, J, T, E, N, R, S, B mV ↔ temperature, with cold-junction compensation and tables.",
            "Read a temperature controller's process value and setpoint with Modbus Master and watch them on its trend lines. This site's register maps include the Autonics TK and TX and the Hanyoung Nux VX temperature controllers.",
          ],
        },
      ],
    },
  },
  // 근거: MODBUS over serial line V1.02 (2006) §2.4.1 응답 타임아웃·Turnaround delay, §2.5.1 RTU 문자 11 비트, §2.5.1.1 t1.5·t3.5(19200 bps 초과 750 µs·1.75 ms),
  // 프레임 길이는 Application Protocol V1.1b3. 시간 값은 site/src/lib/serialTiming.ts 로 계산. Modbus Master 기능은 apps/modbus-master/src/help.ts.
  {
    slug: "modbus-rtu-timeout-polling",
    date: "2026-10-23",
    tools: ["modbus-master", "serial", "modbus-slave"],
    related: ["modbus-no-response", "usb-serial-latency", "modbus-rtu-frame", "rs485-bias-termination"],
    webTools: ["tools/serial-timing/", "tools/modbus/"],
    devices: true,
    title: { ko: "Modbus RTU 타임아웃·폴링 주기 정하기 — 3.5문자 시간과 응답 시간 계산", en: "Setting Modbus RTU timeouts and polling intervals — 3.5-character time and response time" },
    seoTitle: { ko: "Modbus RTU 타임아웃·폴링 주기 설정 (3.5문자 계산) — PortDock", en: "Modbus RTU Timeout & Polling Interval: t3.5 Explained — PortDock" },
    desc: {
      ko: "응답 타임아웃과 폴링 주기를 몇 ms 로 둘지 — 문자 시간·t3.5·프레임 전송 시간·슬레이브 처리 시간으로 하한을 계산하고, 값이 짧거나 길 때 생기는 증상을 정리합니다.",
      en: "How many ms for the response timeout and polling interval: the floor from character time, t3.5, frame time and slave processing, and symptoms of bad values.",
    },
    body: {
      ko: [
        { p: "Modbus RTU 마스터(PLC·HMI·PC 프로그램)에는 보통 «응답 타임아웃», «재시도 횟수», «요청 간격», «폴링 주기» 설정이 있습니다. 타임아웃이 너무 짧으면 멀쩡한 장비가 «응답 없음» 으로 보이고, 너무 길면 장비 하나가 꺼졌을 때 버스 전체의 갱신이 느려집니다. 이 글은 보율과 프레임 길이로 «적어도 얼마가 필요한지» 를 계산하는 방법입니다." },
        { h: "1. 문자 시간 — 한 바이트에 몇 ms" },
        { p: "시리얼은 한 바이트를 시작 비트·데이터 비트·패리티·정지 비트로 묶어 보냅니다. Modbus RTU 규격의 문자는 데이터 8 비트에 짝수 패리티 1·정지 1 이고(기본값), 패리티를 쓰지 않으면 정지 비트를 2 로 둡니다. 어느 쪽이든 한 문자는 11 비트이고, 문자 시간 = 11 ÷ 보율 입니다." },
        {
          table: {
            head: ["보율", "문자 시간", "t1.5", "t3.5", "초당 최대 바이트"],
            rows: [
              ["9600", "1.146 ms", "1.719 ms", "4.010 ms", "872"],
              ["19200", "0.573 ms", "0.859 ms", "2.005 ms", "1745"],
              ["38400", "0.286 ms", "0.75 ms (고정)", "1.75 ms (고정)", "3490"],
              ["115200", "0.095 ms", "0.75 ms (고정)", "1.75 ms (고정)", "10472"],
            ],
          },
        },
        { p: "RTU 에는 프레임 길이 칸이 없어서, 받는 쪽은 «조용한 시간» 으로 프레임을 나눕니다. 규격은 바이트 사이 틈이 1.5 문자(t1.5)를 넘으면 그 프레임을 버리고, 3.5 문자(t3.5) 이상 조용하면 프레임이 끝난 것으로 봅니다. 19200 bps 를 넘으면 이 시간이 너무 짧아 처리 부담이 커지므로 t1.5 = 750 µs, t3.5 = 1.75 ms 고정값을 권장합니다." },
        { h: "2. 프레임 길이 — 몇 바이트를 주고받나" },
        { p: "RTU 프레임은 국번 1 + 함수 1 + 데이터 + CRC 2 바이트입니다. 읽기 요청은 늘 8 바이트이고, 응답 길이는 읽는 개수에 따라 늘어납니다." },
        {
          table: {
            head: ["함수", "요청", "정상 응답", "개수 한도"],
            rows: [
              ["03·04 레지스터 읽기", "8", "5 + 2N", "125"],
              ["01·02 코일·입력 읽기", "8", "5 + ⌈N ÷ 8⌉", "2000"],
              ["05·06 단일 쓰기", "8", "8", "1"],
              ["10 여러 레지스터 쓰기", "9 + 2N", "8", "123"],
              ["예외 응답", "—", "5", "—"],
            ],
          },
        },
        { p: "보유 레지스터 125 개를 한 번에 읽으면 응답이 255 바이트라, 9600 bps 8E1 에서 전송에만 약 292 ms 가 걸립니다. 블록이 클수록 요청 수는 줄지만 응답 하나가 길어지므로 타임아웃도 그만큼 길어야 합니다." },
        { h: "3. 거래 하나에 걸리는 시간" },
        { fig: { src: "/img/guides/modbus-rtu-timing.ko.svg", w: 780, h: 230, alt: "9600 bps 8E1 에서 FC03 레지스터 10개를 읽는 거래의 시간선: t3.5 4.0 ms, 요청 8 바이트 9.2 ms, 슬레이브 처리 10 ms, 응답 25 바이트 28.6 ms, t3.5 4.0 ms. 요청 끝부터 응답 끝까지가 응답 타임아웃의 하한", cap: "거래 하나 = 요청 + 슬레이브 처리 + 응답 + 다음 요청 전 t3.5. 응답 타임아웃은 요청을 다 보낸 뒤부터 응답이 다 올 때까지보다 길어야 합니다." } },
        { p: "9600 bps 8E1 에서 레지스터 10 개(FC03)를 읽으면 요청 8 바이트 9.2 ms, 응답 25 바이트 28.6 ms, t3.5 4.0 ms 입니다. 슬레이브 처리 시간이 10 ms 라면 거래 하나에 약 51.8 ms, 장비 5 대를 차례로 읽으면 한 바퀴에 약 259 ms 가 걸립니다. 폴링 주기를 이보다 짧게 잡아도 버스가 하나라 더 빨라지지 않습니다." },
        { p: "슬레이브 처리 시간은 장비마다 다릅니다. 매뉴얼에 «응답 시간» 이나 «응답 지연(Response delay)» 설정이 있으면 그 값을 쓰고, 없으면 통신 기록에서 요청과 응답 사이 시간을 잽니다. 처리 시간이 전송 시간보다 긴 장비가 많아, 보율만 올려서는 한 바퀴가 생각만큼 줄지 않습니다." },
        { h: "4. 응답 타임아웃 정하기" },
        {
          ul: [
            "하한: 슬레이브 처리 시간 + 응답 전송 시간. 위 예라면 약 38.6 ms 입니다. 이보다 짧으면 응답이 오는 도중에 타임아웃이 납니다.",
            "USB-시리얼 변환기를 쓰면 받은 바이트가 묶여서 PC 에 넘어오므로(FTDI 기본 16 ms) 그만큼 더합니다.",
            "규격의 예: 9600 bps 에서 응답 타임아웃은 보통 1 초~수 초, 방송(국번 0) 뒤 다음 요청까지 기다림(Turnaround delay)은 보통 100~200 ms 입니다.",
            "실제 값은 하한보다 넉넉하게 두되, 장비 하나가 꺼졌을 때 버스가 «타임아웃 × (1 + 재시도)» 만큼 멈춘다는 점과 맞바꿉니다. 장비 10 대 중 하나가 꺼지면 타임아웃 1 초·재시도 2 회일 때 한 바퀴마다 3 초가 더 걸립니다.",
          ],
        },
        { h: "5. 증상으로 보는 잘못된 설정" },
        {
          table: {
            plain: true,
            head: ["증상", "의심할 것"],
            rows: [
              ["가끔 응답 없음, 다음 요청의 응답이 이전 요청의 답처럼 보임", "타임아웃이 처리 + 응답 시간보다 짧음 — 늦게 온 응답이 다음 요청 자리에 들어옴"],
              ["큰 블록 읽기만 실패하고 작은 읽기는 됨", "응답 전송 시간(5 + 2N 바이트)이 타임아웃보다 김"],
              ["응답이 둘로 쪼개져 CRC 틀림", "USB 변환기 지연, 또는 장비가 바이트 사이를 t1.5 보다 길게 띄움"],
              ["장비 하나가 꺼지면 전체 갱신이 몇 초씩 멈춤", "타임아웃 × 재시도가 큼"],
              ["연달아 보낸 요청 중 일부만 응답 없음, 예외 06(바쁨)", "요청 사이 쉼이 장비가 처리하기에 짧음 — 요청 간격을 늘림"],
            ],
          },
        },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «시리얼 통신 시간 계산기»: 보율·패리티·함수·개수·처리 시간을 넣으면 t3.5, 요청·응답 시간, 거래 하나·한 바퀴 시간, 타임아웃 하한을 계산합니다.",
            "Modbus Master: «통신 세부» 에서 응답 기다림(기본 1000 ms)·재시도·요청 간격(기본 20 ms)을, 표마다 읽는 주기를 정합니다. 표 위 줄에 평균·최대 응답 시간이 나오고, 응답 시간은 요청을 보내는 순간부터 응답이 다 올 때까지(전송 시간·USB 지연 포함)입니다.",
            "Modbus Slave 의 «장애 주입» 으로 응답 지연·무응답을 걸어 마스터의 타임아웃·재시도가 어떻게 동작하는지 장비 없이 미리 봅니다.",
            "Serial 의 «Modbus RTU» 끊기 방식은 함수 코드로 길이를 아는 응답은 바로 끊고, 나머지는 3.5 문자 시간(최소 3 ms)으로 끊습니다.",
          ],
        },
      ],
      en: [
        { p: "A Modbus RTU master (PLC, HMI or PC program) usually has settings for «response timeout», «retries», «delay between requests» and «polling interval». Too short a timeout makes a healthy device look dead; too long, and one powered-off device slows updates for the whole bus. This guide shows how to compute the minimum from baud rate and frame length." },
        { h: "1. Character time — how long is one byte" },
        { p: "A serial line sends each byte framed by a start bit, data bits, parity and stop bits. The Modbus RTU character is 8 data bits with even parity and 1 stop bit (the default), or 2 stop bits when no parity is used. Either way it is 11 bits, so character time = 11 ÷ baud rate." },
        {
          table: {
            head: ["Baud", "Char time", "t1.5", "t3.5", "Max bytes/s"],
            rows: [
              ["9600", "1.146 ms", "1.719 ms", "4.010 ms", "872"],
              ["19200", "0.573 ms", "0.859 ms", "2.005 ms", "1745"],
              ["38400", "0.286 ms", "0.75 ms (fixed)", "1.75 ms (fixed)", "3490"],
              ["115200", "0.095 ms", "0.75 ms (fixed)", "1.75 ms (fixed)", "10472"],
            ],
          },
        },
        { p: "RTU frames carry no length field, so receivers split them by silence. The specification discards a frame when a gap between bytes exceeds 1.5 characters (t1.5) and ends a frame after 3.5 characters (t3.5) of silence. Above 19200 bps these times get so short that the specification recommends fixed values: t1.5 = 750 µs, t3.5 = 1.75 ms." },
        { h: "2. Frame length — how many bytes go each way" },
        { p: "An RTU frame is address 1 + function 1 + data + CRC 2 bytes. Read requests are always 8 bytes; the response grows with the quantity read." },
        {
          table: {
            head: ["Function", "Request", "Normal response", "Quantity limit"],
            rows: [
              ["03/04 read registers", "8", "5 + 2N", "125"],
              ["01/02 read coils/inputs", "8", "5 + ⌈N ÷ 8⌉", "2000"],
              ["05/06 write single", "8", "8", "1"],
              ["10 write multiple registers", "9 + 2N", "8", "123"],
              ["Exception response", "—", "5", "—"],
            ],
          },
        },
        { p: "Reading 125 holding registers at once produces a 255-byte response, which takes about 292 ms on the wire at 9600 bps 8E1. Bigger blocks mean fewer requests but longer responses, so the timeout must grow with them." },
        { h: "3. How long one transaction takes" },
        { fig: { src: "/img/guides/modbus-rtu-timing.en.svg", w: 780, h: 230, alt: "Timeline of reading 10 registers with FC03 at 9600 bps 8E1: t3.5 4.0 ms, 8-byte request 9.2 ms, slave processing 10 ms, 25-byte response 28.6 ms, t3.5 4.0 ms. From the end of the request to the end of the response is the floor for the response timeout", cap: "One transaction = request + slave processing + response + t3.5 before the next request. The response timeout must be longer than the time from the end of the request to the end of the response." } },
        { p: "Reading 10 registers (FC03) at 9600 bps 8E1: the 8-byte request takes 9.2 ms, the 25-byte response 28.6 ms and t3.5 4.0 ms. With 10 ms of slave processing one transaction takes about 51.8 ms, and polling 5 devices in turn takes about 259 ms per cycle. A shorter polling interval will not make it faster — there is only one bus." },
        { p: "Slave processing time differs by device. Use the «response time» or «response delay» setting from the manual if there is one; otherwise measure the gap between request and response in a traffic log. Many devices take longer to process than to transmit, so raising the baud rate shortens the cycle less than you might expect." },
        { h: "4. Choosing the response timeout" },
        {
          ul: [
            "Floor: slave processing time + response transmission time — about 38.6 ms in the example above. Anything shorter times out while the response is still arriving.",
            "With a USB-serial adapter, received bytes reach the PC in batches (FTDI default 16 ms); add that.",
            "The specification's guidance: at 9600 bps the response timeout is typically 1 s to several seconds, and the turnaround delay after a broadcast (address 0) typically 100–200 ms.",
            "Set the real value well above the floor, but remember that a dead device stalls the bus for «timeout × (1 + retries)». With 10 devices, one powered off, a 1 s timeout and 2 retries add 3 s to every cycle.",
          ],
        },
        { h: "5. Symptoms of wrong settings" },
        {
          table: {
            plain: true,
            head: ["Symptom", "Suspect"],
            rows: [
              ["Occasional no response; the next reply looks like the answer to the previous request", "Timeout shorter than processing + response time — the late reply lands in the next request's slot"],
              ["Only large block reads fail, small reads work", "Response transmission time (5 + 2N bytes) exceeds the timeout"],
              ["Responses split in two with CRC errors", "USB adapter latency, or the device leaves gaps longer than t1.5 between bytes"],
              ["One device off stalls all updates for seconds", "Timeout × retries is large"],
              ["Some back-to-back requests get no reply, or exception 06 (busy)", "Too little rest between requests for the device — increase the delay between requests"],
            ],
          },
        },
        { h: "In PortDock" },
        {
          ul: [
            "«Serial Timing Calculator» web tool: enter baud, parity, function, quantity and processing time to get t3.5, request/response times, transaction and cycle time, and the minimum timeout.",
            "Modbus Master: set the response timeout (default 1000 ms), retries and delay between requests (default 20 ms) under «Communication details», and a read interval per table. The line above each table shows average and maximum response time, measured from sending the request until the whole response has arrived (transmission and USB latency included).",
            "Modbus Slave's «fault injection» adds response delays or no reply, so you can see how a master's timeout and retries behave before any hardware is connected.",
            "Serial's «Modbus RTU» framing splits replies whose length is known from the function code at once and others by the 3.5-character time (at least 3 ms).",
          ],
        },
      ],
    },
  },
  // 근거: RFC 4632(CIDR), RFC 1918(사설), RFC 3927(링크 로컬), RFC 3021(/31). 판정은 site/src/lib/subnet.ts.
  // PC 에 주소 더하기·Net Scan 동작은 apps/netscan/src/help.ts. netsh 문법은 Microsoft «netsh interface ipv4» 문서.
  {
    slug: "plc-ip-subnet",
    date: "2026-10-23",
    tools: ["netscan", "modbus-master", "tcp"],
    related: ["modbus-tcp-connection", "modbus-no-response"],
    webTools: ["tools/subnet/"],
    title: { ko: "PLC·HMI IP 와 서브넷 마스크 — 같은 대역인지 판정하고 PC 를 붙이는 법", en: "PLC and HMI IP addresses and subnet masks — checking the subnet and joining it from a PC" },
    seoTitle: { ko: "PLC IP 서브넷 마스크 설정 — 같은 대역 판정 — PortDock", en: "PLC IP Address & Subnet Mask: Same Subnet Check — PortDock" },
    desc: {
      ko: "PLC·HMI 에 핑이 안 될 때 — 서브넷 마스크(255.255.255.0 = /24)로 같은 대역인지 판정하는 법, 마스크가 다를 때의 한쪽 통신, PC 에 주소 더하기.",
      en: "No ping to the PLC or HMI? How the subnet mask (255.255.255.0 = /24) decides the subnet, one-way traffic from mismatched masks, and adding a PC address.",
    },
    body: {
      ko: [
        { p: "공장 장비는 192.168.0.x·192.168.1.x 같은 고정 IP 로 출하되는 경우가 많고, 노트북은 사무실 네트워크에서 받은 주소를 그대로 들고 옵니다. 그래서 «케이블은 꽂았는데 핑이 안 된다» 는 일이 흔하고, 대부분은 두 장치가 같은 서브넷이 아니어서입니다. 이 글은 서브넷 마스크로 판정하는 법과 흔한 실수를 정리합니다." },
        { h: "서브넷 마스크가 하는 일" },
        { p: "IPv4 주소는 32 비트입니다. 마스크에서 1 인 부분이 «네트워크», 0 인 부분이 «호스트» 이고, 주소와 마스크를 비트마다 AND 하면 네트워크 주소가 나옵니다." },
        { fig: { src: "/img/guides/subnet-and.ko.svg", w: 780, h: 290, alt: "주소 192.168.1.10 과 마스크 255.255.255.0 을 2진수로 AND 해 네트워크 주소 192.168.1.0 을 얻는 그림. 아래에 PC 192.168.1.200/24 와 PLC 192.168.1.10/24 는 네트워크가 같아 바로 통신, PC 192.168.0.200/24 와 PLC 192.168.1.10/24 는 달라 게이트웨이가 필요함을 비교", cap: "주소 AND 마스크 = 네트워크 주소. 두 장치의 네트워크 주소가 같아야 게이트웨이 없이 바로 통신합니다." } },
        { p: "장치는 보낼 상대 주소를 «자기 마스크» 로 AND 해 자기 네트워크 주소와 같으면 이더넷에서 바로(ARP 로 MAC 주소를 물어) 보내고, 다르면 기본 게이트웨이(라우터)로 보냅니다. 같은 스위치에 꽂혀 있어도 네트워크 주소가 다르면 게이트웨이로 보내려 하고, 게이트웨이가 없으면 닿지 않습니다." },
        { h: "표기: 255.255.255.0 = /24" },
        {
          table: {
            head: ["CIDR", "서브넷 마스크", "쓸 수 있는 주소", "예: 192.168.1.10 의 범위"],
            rows: [
              ["/16", "255.255.0.0", "65,534", "192.168.0.1 ~ 192.168.255.254"],
              ["/23", "255.255.254.0", "510", "192.168.0.1 ~ 192.168.1.254"],
              ["/24", "255.255.255.0", "254", "192.168.1.1 ~ 192.168.1.254"],
              ["/25", "255.255.255.128", "126", "192.168.1.1 ~ 192.168.1.126"],
              ["/30", "255.255.255.252", "2", "192.168.1.9 ~ 192.168.1.10"],
            ],
          },
        },
        { p: "/n 은 마스크의 앞에서부터 1 이 n 개라는 뜻입니다(CIDR, RFC 4632). 쓸 수 있는 주소 수는 2^(32 − n) − 2 — 맨 앞(네트워크 주소)과 맨 끝(브로드캐스트 주소)은 장비에 줄 수 없습니다(/31·/32 는 예외)." },
        { h: "흔한 실수" },
        {
          ul: [
            "셋째 자리가 다름: PLC 192.168.0.10/24, PC 192.168.1.20/24 → 네트워크가 192.168.0.0 과 192.168.1.0 으로 달라 직접 닿지 않습니다.",
            "마스크가 서로 다름: PC 192.168.0.5/16, 장비 192.168.1.10/24 면 PC 는 장비를 같은 망으로 보고 바로 보내지만, 장비는 PC 를 다른 망으로 보고 응답을 게이트웨이로 보냅니다. 요청은 가는데 응답이 안 오는 «한쪽 통신» 이 됩니다. 마스크를 양쪽 같게 맞춥니다.",
            "네트워크·브로드캐스트 주소를 장비에: /24 에서 .0 과 .255 는 쓸 수 없습니다. /25 처럼 작은 대역은 .127·.128 같은 중간 경계도 그렇습니다.",
            "같은 주소 두 대: 같은 기종 여러 대를 출하 기본 IP 그대로 꽂으면 주소가 겹칩니다. 한 대씩 연결해 주소를 바꿉니다.",
            "게이트웨이가 대역 밖: 게이트웨이는 같은 서브넷 안 주소여야 합니다. 같은 대역 안 통신에는 게이트웨이를 쓰지 않으므로, 다른 대역(사무실망·원격 접속)으로 나갈 때만 문제가 드러납니다.",
            "169.254.x.x: PC 가 DHCP 서버에서 주소를 못 받아 스스로 붙인 링크 로컬 주소(RFC 3927)입니다. 장비와 직결한 랜카드가 «자동으로 IP 받기» 로 되어 있으면 이렇게 됩니다.",
          ],
        },
        { h: "지금 네트워크를 끊지 않고 장비 대역에 붙기" },
        { p: "윈도우는 랜카드 하나에 IPv4 주소를 여러 개 둘 수 있습니다. 장비와 같은 네트워크 안의 비어 있는 주소를 하나 더 넣으면, 사무실 연결을 유지한 채 장비에 닿습니다(예: 장비 192.168.1.10 → PC 에 192.168.1.200, 마스크 255.255.255.0). 관리자 권한이 필요합니다." },
        {
          ul: [
            "제어판 → 네트워크 연결 → 랜카드 속성 → 인터넷 프로토콜 버전 4(TCP/IPv4) → 속성 → 고급 → IP 주소 «추가». (고정 IP 로 설정된 랜카드에서)",
            "또는 설정 → 네트워크 및 인터넷 → 이더넷 → IP 할당 «편집» → 수동 → IPv4 에 장비와 같은 대역의 주소.",
            "명령으로는 관리자 명령 프롬프트에서 netsh interface ipv4 add address \"이더넷\" 192.168.1.200 255.255.255.0 — 따옴표 안은 랜카드 이름(ipconfig 로 확인)입니다.",
          ],
        },
        { p: "넣기 전에 그 주소를 다른 장비가 쓰고 있지 않은지 확인합니다. 작업이 끝나면 더한 주소를 지웁니다." },
        { h: "장비 IP 를 모를 때" },
        { p: "장비 매뉴얼의 출하 기본 IP 를 먼저 봅니다. 모르면 같은 대역에 PC 주소를 하나 넣은 뒤 대역 전체를 검색합니다. 같은 서브넷이면 ARP 로 물을 수 있어 핑을 막아 둔 장비도 찾습니다. 다른 대역의 장비는 ARP 가 닿지 않으므로, 대역을 모르면 흔한 기본 대역(192.168.0.x, 192.168.1.x 등)을 차례로 넣어 봅니다." },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «IP 서브넷 계산기»: 주소·마스크로 네트워크·브로드캐스트·범위를 내고, PC 와 장비를 넣으면 양쪽 마스크로 각각 같은 서브넷인지 따로 판정합니다(한쪽 통신 찾기).",
            "Net Scan: 랜카드의 대역을 ARP·핑으로 훑어 장비를 찾고, MAC 주소로 제조사를 보여 주며, Modbus TCP(502) 같은 산업용 포트가 열려 있는지 봅니다.",
            "TCP·Modbus Master: 장비 대역에 붙은 뒤 IP:502 로 연결해 실제 응답을 확인합니다.",
          ],
        },
      ],
      en: [
        { p: "Factory devices often ship with fixed IPs such as 192.168.0.x or 192.168.1.x, while a laptop arrives with an address from the office network. So «the cable is in but ping fails» is common, and usually the two are simply not on the same subnet. This guide shows how a subnet mask decides that, and the usual mistakes." },
        { h: "What the subnet mask does" },
        { p: "An IPv4 address has 32 bits. The 1 bits of the mask mark the «network» part and the 0 bits the «host» part; AND the address with the mask bit by bit and you get the network address." },
        { fig: { src: "/img/guides/subnet-and.en.svg", w: 780, h: 290, alt: "Address 192.168.1.10 ANDed with mask 255.255.255.0 in binary gives network 192.168.1.0. Below, PC 192.168.1.200/24 and PLC 192.168.1.10/24 share a network and talk directly, while PC 192.168.0.200/24 and PLC 192.168.1.10/24 differ and need a gateway", cap: "Address AND mask = network address. Two hosts talk directly, without a gateway, only when their network addresses match." } },
        { p: "A host ANDs the destination with its own mask. If the result equals its own network address it sends directly on Ethernet (asking for the MAC address with ARP); otherwise it sends to its default gateway (router). Even on the same switch, a different network address means the packet goes to the gateway — and with no gateway it goes nowhere." },
        { h: "Notation: 255.255.255.0 = /24" },
        {
          table: {
            head: ["CIDR", "Subnet mask", "Usable addresses", "Range for 192.168.1.10"],
            rows: [
              ["/16", "255.255.0.0", "65,534", "192.168.0.1 – 192.168.255.254"],
              ["/23", "255.255.254.0", "510", "192.168.0.1 – 192.168.1.254"],
              ["/24", "255.255.255.0", "254", "192.168.1.1 – 192.168.1.254"],
              ["/25", "255.255.255.128", "126", "192.168.1.1 – 192.168.1.126"],
              ["/30", "255.255.255.252", "2", "192.168.1.9 – 192.168.1.10"],
            ],
          },
        },
        { p: "/n means n leading one bits in the mask (CIDR, RFC 4632). The usable count is 2^(32 − n) − 2: the first (network) and last (broadcast) addresses cannot be given to a device (/31 and /32 are exceptions)." },
        { h: "Common mistakes" },
        {
          ul: [
            "Third octet differs: PLC 192.168.0.10/24 and PC 192.168.1.20/24 are on networks 192.168.0.0 and 192.168.1.0 — no direct path.",
            "Different masks: with PC 192.168.0.5/16 and device 192.168.1.10/24 the PC treats the device as local and sends directly, but the device treats the PC as remote and sends replies to its gateway. Requests arrive, replies never do. Make the masks match.",
            "Network or broadcast address on a device: in a /24, .0 and .255 are unusable. Smaller blocks such as /25 have boundaries in the middle too (.127, .128).",
            "Two devices with the same address: several identical units plugged in with their factory IP collide. Connect them one at a time and change each address.",
            "Gateway outside the subnet: a gateway must be on the same subnet. Traffic inside the subnet never uses it, so the problem only shows when reaching other networks (office LAN, remote access).",
            "169.254.x.x: a link-local address (RFC 3927) the PC gave itself because no DHCP server answered — typical when the adapter wired to the device is set to «obtain an IP address automatically».",
          ],
        },
        { h: "Joining the device's subnet without dropping your network" },
        { p: "Windows lets one adapter hold several IPv4 addresses. Add a free address on the device's network and you reach it while keeping the office connection (e.g. device 192.168.1.10 → add 192.168.1.200, mask 255.255.255.0 to the PC). Administrator rights are required." },
        {
          ul: [
            "Control Panel → Network Connections → adapter Properties → Internet Protocol Version 4 (TCP/IPv4) → Properties → Advanced → IP addresses «Add» (on an adapter set to a static IP).",
            "Or Settings → Network & internet → Ethernet → IP assignment «Edit» → Manual → an IPv4 address on the device's subnet.",
            "From an administrator command prompt: netsh interface ipv4 add address \"Ethernet\" 192.168.1.200 255.255.255.0 — the quoted part is the adapter name (see ipconfig).",
          ],
        },
        { p: "Make sure no other device already uses that address, and remove the extra address when you are done." },
        { h: "When you don't know the device's IP" },
        { p: "Check the factory default IP in the device manual first. Otherwise add a PC address on the suspected subnet and sweep it. On the same subnet ARP finds devices even when they block ping. ARP does not cross subnets, so if the subnet is unknown, try common defaults (192.168.0.x, 192.168.1.x, …) one by one." },
        { h: "In PortDock" },
        {
          ul: [
            "«IP Subnet Calculator» web tool: network, broadcast and range from an address and mask; enter the PC and the device to check each direction with its own mask (finds one-way setups).",
            "Net Scan sweeps the adapter's subnet with ARP and ping, shows the vendor from the MAC address and checks whether industrial ports such as Modbus TCP (502) are open.",
            "TCP and Modbus Master: once on the device's subnet, connect to IP:502 and check for a real reply.",
          ],
        },
      ],
    },
  },
  // 근거: 구리 저항률 1/58 Ω·mm²/m·온도 계수 0.00393(IEC 60028), 계산은 site/src/lib/wire.ts. 표 값은 그 식으로 계산.
  {
    slug: "24v-voltage-drop",
    date: "2026-10-23",
    tools: ["modbus-master", "serial"],
    related: ["4-20ma-loop", "rs485-wiring", "rs485-bias-termination", "motor-current-breaker-cable"],
    webTools: ["tools/voltage-drop/", "tools/loop-load/"],
    title: { ko: "24V DC 전압 강하 — 멀리 있는 센서·통신 장비의 전선 굵기 고르기", en: "24 V DC voltage drop — choosing wire size for remote sensors and devices" },
    seoTitle: { ko: "24V DC 전압 강하 계산과 전선 굵기 고르기 — PortDock", en: "24 V DC Voltage Drop: Choosing Wire Size (mm², AWG) — PortDock" },
    desc: {
      ko: "멀리 있는 24 V 센서·RS-485 장비가 가끔 꺼지거나 응답이 끊길 때 — 왕복 선 저항으로 전압 강하를 계산해 굵기를 고르고, 기동 전류·공통선을 챙깁니다.",
      en: "A remote 24 V sensor or RS-485 device resets or drops off? Compute the drop from loop resistance, pick a wire size, and avoid inrush and shared-common traps.",
    },
    body: {
      ko: [
        { p: "24 V DC 는 전압이 낮아서 같은 전력이라도 전류가 크고, 같은 전압 강하가 «비율로» 크게 느껴집니다. 230 V 에서 1 V 는 0.4 % 지만 24 V 에서 1 V 는 약 4.2 % 입니다. 센서·리모트 I/O·RS-485 장비를 판넬에서 멀리 둘 때 먼저 계산해 볼 것이 전압 강하입니다." },
        { h: "계산식" },
        { code: "ΔV = 2 × I × ρ × L ÷ A\n  I: 전류(A), L: 편도 길이(m), A: 단면적(mm²)\n  ρ: 구리 20 °C 1/58 ≈ 0.01724 Ω·mm²/m" },
        { p: "2 는 가는 선(+)과 오는 선(0 V) 두 가닥 몫입니다. 길이는 편도(전원에서 장비까지)를 넣고 2 를 곱합니다. 구리 1 mm² 1 km 는 20 °C 에서 약 17.24 Ω 입니다." },
        { h: "예: 2 A 를 편도 50 m 보낼 때" },
        {
          table: {
            head: ["굵기", "왕복 저항", "전압 강하", "강하율", "장비 쪽 전압"],
            rows: [
              ["0.75 mm²", "2.30 Ω", "4.60 V", "19.2 %", "19.40 V"],
              ["1.5 mm²", "1.15 Ω", "2.30 V", "9.6 %", "21.70 V"],
              ["2.5 mm²", "0.69 Ω", "1.38 V", "5.7 %", "22.62 V"],
              ["4 mm²", "0.43 Ω", "0.86 V", "3.6 %", "23.14 V"],
            ],
          },
        },
        { p: "강하가 몇 % 까지 괜찮은지는 장비가 정합니다. 매뉴얼의 전원 사양(예: «24 V DC, 허용 범위 ○○~○○ V»)에서 하한을 보고, 장비 쪽 전압이 그보다 충분히 높은지 봅니다. 전원 출력을 조금 올리는 조정기가 있는 전원도 있지만, 전류가 바뀌면 강하도 바뀌므로 굵기나 배치를 바꾸는 것이 근본 해결입니다." },
        { h: "흔히 놓치는 것" },
        {
          ul: [
            "기동 전류: 릴레이·솔레노이드 밸브·모터처럼 켜지는 순간 전류가 큰 부하가 같은 선에 있으면 그 순간만 전압이 떨어져 장비가 다시 시작합니다. 계산은 평균이 아니라 가장 큰 전류로 합니다.",
            "공통선(0 V)을 나눠 씀: 여러 장비가 0 V 선 하나를 함께 쓰면 그 선에 전류가 합쳐져 강하가 커지고, 다른 장비의 기준 전압까지 흔들립니다.",
            "온도: 구리 저항은 1 °C 에 약 0.393 % 씩 늘어 20 °C 보다 50 °C 높으면 약 20 % 커집니다. 뜨거운 덕트·판넬 안 배선은 높은 온도로 계산합니다.",
            "단자·커넥터: 접촉 저항은 이 계산에 들어가지 않습니다. 느슨한 단자 하나가 긴 전선보다 크게 떨어뜨리기도 합니다.",
            "가는 신호선으로 전원까지: 통신 케이블 안의 가는 선(예: 24 AWG ≈ 0.2 mm²)으로 전원을 함께 보내면 짧은 거리에서도 크게 떨어집니다.",
          ],
        },
        { h: "통신 장비에서 보이는 증상" },
        { p: "전원이 모자라 장비가 다시 켜지면, 켜지는 동안은 응답하지 않습니다. 그래서 «가끔 타임아웃이 몰려서 난다» 는 모양으로 보입니다. 타임아웃이 난 시각을 기록해 두고, 같은 전원을 쓰는 다른 부하(밸브·모터·히터)가 켜지는 시각과 맞춰 보면 전원 쪽인지 통신 쪽인지 가를 수 있습니다." },
        { h: "4–20mA 는 다르게 본다" },
        { p: "4–20mA 신호는 전류라서 선 저항이 있어도 값이 바뀌지 않습니다. 대신 2선식 전송기는 «전원 − 루프 저항에서 떨어지는 전압» 이 전송기 최소 동작 전압보다 높아야 하므로, 전압 강하가 아니라 루프 부하로 계산합니다." },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «전압 강하·전선 굵기 계산기»: 직류·단상·3상, mm²·AWG, 구리·알루미늄, 온도로 강하와 강하율을 내고, 허용 강하율에 맞는 최소 굵기와 최대 거리를 찾습니다.",
            "웹 도구 «4–20mA 루프 부하 계산기»: 루프 전원·전송기 최소 전압·250 Ω·선 저항으로 남는 전압과 최대 거리를 계산합니다.",
            "Modbus Master 의 «파일로 기록» 은 주고받은 바이트를 시각과 함께 남기고, 타임아웃은 통신 기록에 사건 줄로 찍힙니다. 이 시각을 다른 부하가 켜지는 시각과 맞춰 봅니다.",
          ],
        },
      ],
      en: [
        { p: "At 24 V DC the same power means more current, and the same voltage drop is a bigger share: 1 V is 0.4 % of 230 V but about 4.2 % of 24 V. Voltage drop is the first thing to check when sensors, remote I/O or RS-485 devices sit far from the panel." },
        { h: "Formula" },
        { code: "ΔV = 2 × I × ρ × L ÷ A\n  I: current (A), L: one-way length (m), A: cross-section (mm²)\n  ρ: copper at 20 °C 1/58 ≈ 0.01724 Ω·mm²/m" },
        { p: "The 2 counts both conductors, out (+) and back (0 V). Enter the one-way length (supply to device) and multiply by 2. One kilometre of 1 mm² copper is about 17.24 Ω at 20 °C." },
        { h: "Example: 2 A over 50 m one way" },
        {
          table: {
            head: ["Size", "Loop resistance", "Drop", "Percent", "Voltage at device"],
            rows: [
              ["0.75 mm² (≈ 18 AWG)", "2.30 Ω", "4.60 V", "19.2 %", "19.40 V"],
              ["1.5 mm² (≈ 16 AWG)", "1.15 Ω", "2.30 V", "9.6 %", "21.70 V"],
              ["2.5 mm² (≈ 14 AWG)", "0.69 Ω", "1.38 V", "5.7 %", "22.62 V"],
              ["4 mm² (≈ 12 AWG)", "0.43 Ω", "0.86 V", "3.6 %", "23.14 V"],
            ],
          },
        },
        { p: "How much drop is acceptable is set by the device. Take the lower limit from its supply specification (e.g. «24 V DC, allowed range … V») and check the voltage at the device stays comfortably above it. Some supplies let you raise the output slightly, but the drop changes with current, so a thicker wire or a closer supply is the real fix." },
        { h: "What gets overlooked" },
        {
          ul: [
            "Inrush: relays, solenoid valves and motors draw much more current when switching on. If they share the wire, the voltage dips just then and devices restart. Calculate with the largest current, not the average.",
            "Shared common (0 V): when several devices share one 0 V wire, their currents add up in it, increasing the drop and shifting the reference of the other devices.",
            "Temperature: copper resistance rises about 0.393 % per °C, so 50 °C above 20 °C means about 20 % more. Use a higher temperature for wiring in hot ducts or panels.",
            "Terminals and connectors: contact resistance is not in this calculation. One loose terminal can drop more than a long wire.",
            "Power over thin signal wires: sending power through thin conductors in a communication cable (e.g. 24 AWG ≈ 0.2 mm²) drops a lot even over short runs.",
          ],
        },
        { h: "What it looks like on a communication bus" },
        { p: "A device that restarts for lack of voltage does not reply while it boots, so it shows up as «timeouts that come in bursts». Log the times of the timeouts and compare them with when other loads on the same supply (valves, motors, heaters) switch on to tell a power problem from a communication one." },
        { h: "4–20 mA is checked differently" },
        { p: "A 4–20 mA signal is a current, so wire resistance does not change the reading. A 2-wire transmitter, however, needs «supply − voltage lost in the loop resistance» to stay above its minimum operating voltage, so calculate the loop load rather than a percentage drop." },
        { h: "In PortDock" },
        {
          ul: [
            "«Voltage Drop & Wire Size Calculator» web tool: DC, single- and three-phase, mm² or AWG, copper or aluminium, temperature; gives drop and percent, plus minimum size and maximum length for an allowed drop.",
            "«4–20 mA Loop Load Calculator» web tool: voltage left at the transmitter and maximum cable length from loop supply, transmitter minimum, 250 Ω and cable resistance.",
            "Modbus Master's «Log to file» keeps the bytes with timestamps, and timeouts appear as event lines in the traffic log — line them up with when other loads switch on.",
          ],
        },
      ],
    },
  },
  // 근거: MODBUS over serial line V1.02 §3.4.1~3.4.6(32대, 1000 m, 가지선 20 m·40/n, 종단 150 Ω 또는 1 nF + 120 Ω, 바이어스 5 V·450~650 Ω·한 곳, 장비 수 4 감소),
  // TI SLLA070D(수신기 ±200 mV, 드라이버 54 Ω 부하에서 1.5 V 이상, Zo ±20 %, 유휴 때 종단만 있으면 차동 전압 0 근처). 계산은 site/src/lib/rs485.ts.
  {
    slug: "rs485-bias-termination",
    date: "2026-10-23",
    tools: ["serial", "modbus-master"],
    related: ["rs485-wiring", "rs232-rs422-rs485", "modbus-no-response", "modbus-rtu-timeout-polling"],
    webTools: ["tools/rs485/", "tools/serial-timing/"],
    devices: true,
    title: { ko: "RS485 종단·바이어스 저항 값 정하기 — 120 Ω, 560 Ω, 200 mV", en: "Choosing RS-485 termination and bias resistor values — 120 Ω, 560 Ω, 200 mV" },
    seoTitle: { ko: "RS485 종단·바이어스 저항 값 정하기 (120Ω·560Ω) — PortDock", en: "RS-485 Termination and Bias Resistors: 120 Ω, 560 Ω — PortDock" },
    desc: {
      ko: "종단·바이어스(페일세이프) 저항을 몇 Ω 으로 어디에 — Modbus 규격(150 Ω·450~650 Ω)과 수신기 문턱 200 mV 로 계산해 쓰레기 바이트를 없앱니다.",
      en: "Termination and bias (failsafe) resistor values from the Modbus rules (150 Ω, 450–650 Ω) and the 200 mV receiver threshold — stop garbage bytes between frames.",
    },
    body: {
      ko: [
        { p: "RS-485 배선에서 저항은 두 종류입니다. 선로 양 끝의 «종단 저항» 은 신호 반사를 줄이고, 버스 한 곳의 «바이어스 저항»(풀업·풀다운, 페일세이프라고도 함)은 아무도 보내지 않을 때 선로 상태를 정해 줍니다. 둘은 같은 선에 걸려 서로 영향을 주므로 함께 계산해야 합니다." },
        { h: "종단: 양 끝 두 곳에만" },
        { p: "종단 저항은 케이블 특성 임피던스에 맞춰 A·B 사이에 겁니다. TI 문서는 종단 값이 특성 임피던스의 ±20 % 안이면 되고, 흔한 값이 약 90~120 Ω 이라고 적습니다. Modbus 규격은 150 Ω(0.5 W) 저항, 또는 바이어스를 쓸 때는 1 nF(10 V 이상) 커패시터와 120 Ω(0.25 W)를 직렬로 쓰는 것이 더 낫다고 적습니다. 어느 쪽이든 선로 양 끝 두 곳에만 두고, 가지선에는 달지 않습니다." },
        { p: "종단을 장비마다 달면 병렬로 합쳐져 드라이버 부하가 커집니다. 표준 RS-485 드라이버 출력 시험은 54 Ω 부하에서 차동 1.5 V 이상입니다. 120 Ω 셋이면 40 Ω 으로 이보다 무거워 신호가 작아집니다." },
        { h: "바이어스: 왜 필요한가" },
        { p: "반이중 RS-485 는 마스터가 요청을 보내고 응답을 기다리는 사이 아무도 선로를 구동하지 않습니다. 종단 저항만 있으면 이때 A·B 사이 전압이 0 근처가 되어 수신기 출력이 정해지지 않고, 잡음이 시작 비트로 읽혀 00·FF 같은 쓰레기 바이트가 들어옵니다. 바이어스는 B(Modbus 이름 D1)를 풀업으로 5 V 에, A(D0)를 풀다운으로 공통에 당겨, 쉬는 동안 B − A 를 양수(«1», 마크)로 만듭니다." },
        { fig: { src: "/img/guides/rs485-bias.ko.svg", w: 780, h: 300, alt: "RS-485 바이어스: B(D1) 선은 풀업 560 Ω 으로 5 V 에, A(D0) 선은 풀다운 560 Ω 으로 공통에 연결되고, 양 끝 종단 120 Ω 두 개가 A–B 사이에서 바이어스 전류의 길이 됨. 유휴 B − A = 5 V × 60 Ω ÷ 1180 Ω ≈ 254 mV", cap: "바이어스 전류는 풀업 → 종단(병렬) → 풀다운으로 흐르고, 종단 양단 전압이 유휴 차동 전압입니다." } },
        { h: "바이어스 값 계산" },
        { p: "수신기는 차동 전압이 ±200 mV 이상이면 정해진 상태를 냅니다. 바이어스 전류가 양 끝 종단(병렬)을 지나며 만드는 전압이 200 mV 를 넘어야 합니다." },
        { code: "Rline = 종단 저항들의 병렬 (120 Ω 둘 → 60 Ω)\n유휴 전압 = Vcc × Rline ÷ (R풀업 + Rline + R풀다운)\n예: 5 V × 60 ÷ (560 + 60 + 560) ≈ 254 mV" },
        {
          table: {
            head: ["전원", "풀업·풀다운", "종단(양 끝)", "유휴 전압", "200 mV"],
            rows: [
              ["5 V", "560 Ω", "150 Ω", "314 mV", "넘음"],
              ["5 V", "650 Ω", "150 Ω", "273 mV", "넘음"],
              ["5 V", "560 Ω", "120 Ω", "254 mV", "넘음"],
              ["5 V", "1 kΩ", "120 Ω", "146 mV", "못 미침"],
              ["3.3 V", "560 Ω", "120 Ω", "168 mV", "못 미침"],
              ["3.3 V", "390 Ω", "120 Ω", "236 mV", "넘음"],
            ],
          },
        },
        { p: "Modbus 규격은 바이어스를 «필요하면 버스 전체에 한 곳(보통 마스터)» 에, 5 V 풀업·풀다운 450~650 Ω 으로 정합니다. 650 Ω 은 버스에 더 많은 장비를 달 수 있게 하고, 바이어스를 넣으면 최대 장비 수가 4 줄어듭니다. 3.3 V 송수신기는 같은 저항으로 전압이 모자라기 쉬우니 저항을 줄이거나, 1 nF + 120 Ω 종단으로 직류 경로를 끊거나, 수신 문턱이 한쪽으로 치우친 «페일세이프 내장» 송수신기를 씁니다." },
        { h: "바이어스를 여러 곳에서 켜면" },
        { p: "USB-RS485 변환기·PLC 통신 카드·장비마다 바이어스 스위치나 점퍼가 있는 경우가 많습니다. 여러 곳에서 켜면 풀업끼리, 풀다운끼리 병렬이 되어 저항이 작아지고, 드라이버가 늘 그만큼 더 전류를 흘려야 합니다. 한 곳만 켜고 나머지는 끕니다. 장비 매뉴얼에서 출하 때 켜져 있는지 확인합니다." },
        { h: "증상으로 가르기" },
        {
          table: {
            plain: true,
            head: ["증상", "먼저 볼 것"],
            rows: [
              ["요청을 안 보내는데도 00·FF 같은 바이트가 가끔 들어옴", "바이어스 없음·유휴 전압 200 mV 미만"],
              ["응답 앞에 엉뚱한 바이트가 하나 붙어 CRC 가 틀림", "바이어스 부족 — 드라이버가 켜지는 순간의 잡음을 읽음"],
              ["짧은 선·느린 속도에선 되다가 선을 늘리거나 속도를 올리면 깨짐", "종단 없음 또는 위치(양 끝이 아님)"],
              ["장비를 늘리자 전체 신호가 약해지고 가끔 실패", "종단이 중간 장비에도 달림, 바이어스가 여러 곳에서 켜짐"],
              ["종단·바이어스 다 맞는데 먼 장비만 실패", "길이 대비 보율(대략 bps × m ≤ 10⁸), 공통선(GND) 연결, A/B 극성"],
            ],
          },
        },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «RS-485 종단·바이어스 계산기»: 전원·풀업·풀다운·종단 종류를 넣으면 유휴 전압과 200 mV 판정, 저항 전력, 200 mV 를 만드는 최대 바이어스 저항, 보율별 대략 길이 한계를 계산합니다.",
            "Serial: 요청을 보내지 않은 채 수신을 켜 두면 쉬는 동안 들어오는 쓰레기 바이트를 HEX 로 볼 수 있습니다. 바이어스를 켜고 끄며 비교합니다.",
            "Modbus Master: 표마다 CRC 오류 수가 쌓이므로, 종단·바이어스를 바꾼 뒤 같은 시간 동안 오류 수를 비교합니다.",
          ],
        },
      ],
      en: [
        { p: "RS-485 wiring has two kinds of resistors. «Termination» at the two ends of the line reduces reflections; «bias» resistors at one place on the bus (pull-up and pull-down, also called failsafe) define the line state when nobody transmits. Both sit on the same pair and affect each other, so calculate them together." },
        { h: "Termination: at the two ends only" },
        { p: "A terminator goes across A and B and should match the cable's characteristic impedance. TI notes that within ±20 % of the characteristic impedance is fine and typical values run from about 90 to 120 Ω. The Modbus specification gives a 150 Ω (0.5 W) resistor, or — when the line is biased — a 1 nF (10 V min) capacitor in series with 120 Ω (0.25 W) as the better choice. Either way, only near the two ends of the trunk, never on a stub." },
        { p: "Terminating at every device puts them in parallel and loads the driver. The standard RS-485 driver output test requires at least 1.5 V differential into 54 Ω; three 120 Ω terminators make 40 Ω, a heavier load and a smaller signal." },
        { h: "Biasing: why it is needed" },
        { p: "On half-duplex RS-485, nobody drives the line while the master waits for a reply. With termination only, the A–B voltage then sits near 0, the receiver output is undefined, noise looks like a start bit and garbage bytes such as 00 or FF appear. Biasing pulls B (D1 in Modbus terms) up to 5 V and A (D0) down to common so that B − A is positive at idle — a «1» (mark)." },
        { fig: { src: "/img/guides/rs485-bias.en.svg", w: 780, h: 300, alt: "RS-485 biasing: B (D1) pulled up to 5 V through 560 Ω and A (D0) pulled down to common through 560 Ω, with two 120 Ω end terminators across A–B carrying the bias current. Idle B − A = 5 V × 60 Ω ÷ 1180 Ω ≈ 254 mV", cap: "Bias current flows pull-up → terminators (in parallel) → pull-down; the voltage across the terminators is the idle differential voltage." } },
        { h: "Calculating the bias value" },
        { p: "Receivers produce a defined output for differential inputs of ±200 mV or more. The voltage the bias current develops across the parallel end terminators must exceed 200 mV." },
        { code: "Rline = terminators in parallel (two 120 Ω → 60 Ω)\nIdle voltage = Vcc × Rline ÷ (Rpull-up + Rline + Rpull-down)\nExample: 5 V × 60 ÷ (560 + 60 + 560) ≈ 254 mV" },
        {
          table: {
            head: ["Supply", "Pull-up/down", "Termination (both ends)", "Idle voltage", "200 mV"],
            rows: [
              ["5 V", "560 Ω", "150 Ω", "314 mV", "above"],
              ["5 V", "650 Ω", "150 Ω", "273 mV", "above"],
              ["5 V", "560 Ω", "120 Ω", "254 mV", "above"],
              ["5 V", "1 kΩ", "120 Ω", "146 mV", "below"],
              ["3.3 V", "560 Ω", "120 Ω", "168 mV", "below"],
              ["3.3 V", "390 Ω", "120 Ω", "236 mV", "above"],
            ],
          },
        },
        { p: "The Modbus specification puts biasing, if needed, at one place for the whole bus (usually the master): pull-up to 5 V and pull-down to common, 450–650 Ω. 650 Ω allows more devices on the bus, and biasing reduces the maximum device count by 4. With 3.3 V transceivers the same resistors often fall short, so use smaller resistors, block the DC path with 1 nF + 120 Ω termination, or pick a transceiver with built-in failsafe (offset receiver threshold)." },
        { h: "Bias enabled in several places" },
        { p: "USB-RS485 converters, PLC communication cards and devices often have a bias switch or jumper. Enabling several puts the pull-ups and pull-downs in parallel, lowering the resistance and making every driver push that much more current. Enable one and disable the rest, and check device manuals for bias enabled at the factory." },
        { h: "Telling problems apart" },
        {
          table: {
            plain: true,
            head: ["Symptom", "Check first"],
            rows: [
              ["Bytes such as 00 or FF arrive while no request is sent", "No bias, or idle voltage below 200 mV"],
              ["An extra byte in front of replies, CRC fails", "Too little bias — the receiver catches noise as a driver switches on"],
              ["Works on short/slow lines, fails when longer or faster", "Missing termination, or not at the two ends"],
              ["Signals weaken and fail as devices are added", "Terminators on middle devices, bias enabled in several places"],
              ["Everything set right, only far devices fail", "Baud vs length (roughly bps × m ≤ 10⁸), common (GND) wire, A/B polarity"],
            ],
          },
        },
        { h: "In PortDock" },
        {
          ul: [
            "«RS-485 Termination & Bias Calculator» web tool: enter supply, pull-up, pull-down and termination type to get the idle voltage against 200 mV, resistor power, the largest bias resistors that still reach 200 mV, and a rough length limit per baud rate.",
            "Serial: leave reception on without sending and any garbage bytes between frames show up in HEX. Compare with bias on and off.",
            "Modbus Master counts CRC errors per table, so compare the counts over the same period before and after changing termination or bias.",
          ],
        },
      ],
    },
  },
  // 근거: ABB Technical guide No. 7(3AFE64362569 Rev D) 식 3.13~3.16·예제 3.4, ABB Motor guide(2019) §3.8 허용차·§4.5 기동,
  // KEC(공고 제2025-227호) 212.4.1(IB ≤ In ≤ IZ, I2 ≤ 1.45 IZ)·232.5.1(표 232.5-1)·232.5.2(허용 전류는 KS C IEC 60364-5-52 부속서 B).
  // 허용 전류표 수치는 원문(KS C IEC 60364-5-52)을 확인하지 못해 싣지 않는다. 계산은 site/src/lib/motor.ts.
  {
    slug: "motor-current-breaker-cable",
    date: "2026-10-23",
    tools: ["modbus-master"],
    related: ["vfd-frequency-rpm", "24v-voltage-drop", "pressure-units"],
    webTools: ["tools/motor-current/", "tools/voltage-drop/", "tools/units/"],
    deviceKinds: ["inverter", "power-meter"],
    title: { ko: "모터 정격 전류 읽기와 차단기·전선 고르기 기초 (kW → A)", en: "Motor rated current, breakers and cables — the basics (kW to amps)" },
    seoTitle: { ko: "모터 정격 전류 계산(kW→A)과 차단기·전선 기초 — PortDock", en: "Motor Full Load Current (kW to A), Breakers, Cables — PortDock" },
    desc: {
      ko: "명판 kW 로 정격 전류를 계산하는 식, 계산값이 명판 전류와 다른 이유, 기동 전류, KEC 212.4.1 의 IB ≤ In ≤ IZ 조건까지 — 허용 전류표는 원문에서.",
      en: "The kW-to-amps formula for motors, why it differs from the nameplate current, starting current, and the IB ≤ In ≤ IZ rule for breakers and cables.",
    },
    body: {
      ko: [
        { p: "모터 명판의 kW(또는 HP)는 모터가 먹는 전력이 아니라 축에서 내는 기계 출력입니다. 그래서 출력만으로는 전류가 나오지 않고, 효율과 역률을 함께 알아야 합니다. 차단기·전선·과부하 계전기를 고를 때 쓰는 값은 결국 명판의 정격 전류이고, 계산은 명판이 없거나 값을 확인할 때 씁니다." },
        { h: "계산식" },
        { code: "3상:  I = P ÷ (√3 × V × η × cos φ)\n단상: I = P ÷ (V × η × cos φ)\n직류: I = P ÷ (V × η)\n  P: 정격 출력(W), V: 전압(3상은 선간), η: 효율, cos φ: 역률" },
        { p: "식은 «입력 전력 = √3 × V × I × cos φ» 와 «효율 = 출력 ÷ 입력» 을 합친 것입니다(ABB Technical guide No. 7 식 3.15·3.16). 거꾸로 명판의 출력·전압·전류·역률로 효율을 확인할 수 있습니다. ABB 문서의 예(37 kW, 380 V, 71 A, cos φ 0.85)는 효율 약 0.931 이 나옵니다." },
        { fig: { src: "/img/guides/motor-current-chain.ko.svg", w: 780, h: 250, alt: "모터 전류 계산 흐름: 출력 7.5 kW 를 효율 0.9 로 나눠 입력 8.33 kW, 역률 0.85 로 나눠 9.80 kVA, √3 × 380 V 로 나눠 선 전류 14.9 A", cap: "축 출력에서 효율·역률·전압 순으로 나눠 전류를 얻습니다. 효율·역률 값은 예시입니다." } },
        { h: "효율·역률에 따라 얼마나 달라지나 (3상 7.5 kW)" },
        {
          table: {
            head: ["전압", "효율", "역률", "전류"],
            rows: [
              ["380 V", "0.90", "0.85", "14.90 A"],
              ["380 V", "0.87", "0.82", "15.97 A"],
              ["380 V", "0.92", "0.87", "14.24 A"],
              ["380 V", "0.90", "0.75", "16.88 A"],
              ["220 V", "0.90", "0.85", "25.73 A"],
              ["440 V", "0.90", "0.85", "12.86 A"],
            ],
          },
        },
        { p: "같은 7.5 kW 라도 효율·역률이 몇 % 다르면 전류가 1~2 A 달라집니다. 효율·역률은 모터 크기·극수·효율 등급마다 다르므로, «kW 당 몇 A» 로 외운 값은 대략값일 뿐입니다." },
        { h: "계산값보다 명판 전류를 믿는 이유" },
        {
          ul: [
            "부분 부하: 부하가 줄면 효율과 역률이 함께 떨어져, 가볍게 걸린 모터의 전류는 출력 비율만큼 줄지 않습니다.",
            "허용차: ABB Motor guide 는 IEC 60034-1 에 따라 명판 효율은 −15 %(1−η)(150 kW 이하), 역률은 −1/6 (1−cos φ) 까지 벗어날 수 있다고 적습니다.",
            "전압: 전압이 명판보다 낮으면 같은 출력에 전류가 늘어납니다. ABB 문서는 IEC 60034-1 에 따른 전원 허용차를 전압 ±5 %, 주파수 ±2 % 로 적습니다.",
          ],
        },
        { h: "기동 전류" },
        {
          ul: [
            "직입(DOL) 기동은 정격 전류의 몇 배가 흐릅니다. 정확한 배수는 카탈로그의 IS/IN(기동 전류 ÷ 정격 전류)에서 봅니다.",
            "투입 순간에는 과도 전류가 겹쳐 최댓값이 기동 전류(실효값)의 약 2.5배까지 될 수 있고 곧 줄어듭니다(ABB Motor guide §4.5).",
            "Y-Δ 기동은 기동 전류를 직입의 약 30 %, 기동 토크를 약 25 % 로 줄입니다. 인버터 기동은 정격의 0.5~1배, 최대 1.5배 정도입니다.",
            "그래서 모터 회로의 차단기는 정격 전류만이 아니라 기동 전류에도 트립하지 않는 특성으로 고르고, 과부하 보호는 따로(과부하 계전기·인버터 전자 서멀) 맞춥니다.",
          ],
        },
        { h: "차단기·전선: KEC 212.4.1 의 두 조건" },
        { fig: { src: "/img/guides/overload-coordination.ko.svg", w: 780, h: 210, alt: "전류 눈금 위에 IB(설계 전류) ≤ In(보호 장치 정격) ≤ IZ(전선 허용 전류) 순서와, I2(보호 장치가 확실히 동작하는 전류)가 1.45 × IZ 이하여야 함을 나타낸 그림", cap: "설계 전류 ≤ 보호 장치 정격 ≤ 전선 허용 전류, 그리고 보호 장치가 확실히 동작하는 전류 ≤ 1.45 × 허용 전류." } },
        { code: "IB ≤ In ≤ IZ        (식 212.4-1)\nI2 ≤ 1.45 × IZ      (식 212.4-2)\n  IB: 회로의 설계 전류      In: 보호 장치의 정격 전류(조정형은 설정값)\n  IZ: 케이블의 허용 전류    I2: 보호 장치가 규약 시간 안에 유효하게 동작하는 것을 보장하는 전류" },
        { p: "모터 한 대 회로라면 IB 는 모터의 정격 전류입니다. In 은 IB 이상이어야 정상 운전에서 트립하지 않고, IZ 이하여야 전선을 보호합니다. I2 는 보호 장치 제조사가 주거나 제품 표준에 있는 값입니다(KEC 212.4.1 주 2)." },
        { h: "허용 전류 IZ 는 어디서" },
        {
          ul: [
            "KEC 232.5.2 는 허용 전류를 KS C IEC 60364-5-52 «부속서 B(허용전류)» 의 표에서, «부속서 A(공사방법)» 를 참고해 고르고 필요한 보정 계수(주위 온도·묶음)를 적용하라고 합니다.",
            "표의 바탕이 되는 절연물 최고 허용 온도는 PVC 70 °C, XLPE·EPR 90 °C 입니다(KEC 표 232.5-1). 같은 굵기라도 절연물·공사 방법·통전 도체 수·주위 온도에 따라 허용 전류가 크게 다릅니다.",
            "이 글은 허용 전류표 수치를 싣지 않습니다. 원문(KS C IEC 60364-5-52 부속서 B)을 확인하지 못했기 때문입니다. 표는 원문이나 케이블 제조사 자료에서 확인하세요.",
            "거리가 길면 허용 전류를 만족해도 전압 강하가 커질 수 있으니 따로 계산합니다.",
          ],
        },
        { h: "운전 중 전류는 통신으로 확인" },
        { p: "인버터는 출력 전류를, 전력 미터는 잰 전류를 Modbus 레지스터로 내줍니다. 인버터의 예로 LS S300 은 0x0310(출력 전류, 0.1 A 단위), YASKAWA A1000 은 0026H(출력 전류, 배율은 형번별)입니다. 명판 정격 전류와 운전 중 전류를 함께 보면 모터가 얼마나 걸려 있는지 알 수 있습니다." },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «모터 전류 계산기»: 3상·단상·직류, kW·HP 로 전류·입력 전력·kVA·토크를 계산하고, 명판 값으로 효율을 거꾸로 확인합니다.",
            "웹 도구 «전압 강하·전선 굵기 계산기»: 전선 길이에 따른 전압 강하를 봅니다.",
            "Modbus Master: 장비 레지스터 맵을 불러와 인버터·전력 미터의 출력 전류를 표로 읽고, 파일로 기록할 수 있습니다.",
          ],
        },
      ],
      en: [
        { p: "The kW (or HP) on a motor nameplate is the mechanical output at the shaft, not the power the motor draws. Output alone does not give the current — you also need efficiency and power factor. Breakers, cables and overload relays are set from the nameplate rated current; the calculation is for when there is no nameplate or to check one." },
        { h: "Formulas" },
        { code: "Three-phase:  I = P ÷ (√3 × V × η × cos φ)\nSingle-phase: I = P ÷ (V × η × cos φ)\nDC:           I = P ÷ (V × η)\n  P: rated output (W), V: voltage (line-to-line for three-phase), η: efficiency, cos φ: power factor" },
        { p: "This combines «input power = √3 × V × I × cos φ» with «efficiency = output ÷ input» (ABB Technical guide No. 7, eq. 3.15 and 3.16). Turned around, nameplate output, voltage, current and power factor give the efficiency; ABB's example (37 kW, 380 V, 71 A, cos φ 0.85) works out to about 0.931." },
        { fig: { src: "/img/guides/motor-current-chain.en.svg", w: 780, h: 250, alt: "Motor current chain: 7.5 kW output ÷ efficiency 0.9 = 8.33 kW input ÷ power factor 0.85 = 9.80 kVA ÷ (√3 × 380 V) = 14.9 A line current", cap: "Divide shaft output by efficiency, power factor and voltage to get the current. The efficiency and power factor are examples." } },
        { h: "How much efficiency and power factor matter (three-phase 7.5 kW)" },
        {
          table: {
            head: ["Voltage", "Efficiency", "Power factor", "Current"],
            rows: [
              ["380 V", "0.90", "0.85", "14.90 A"],
              ["380 V", "0.87", "0.82", "15.97 A"],
              ["380 V", "0.92", "0.87", "14.24 A"],
              ["380 V", "0.90", "0.75", "16.88 A"],
              ["220 V", "0.90", "0.85", "25.73 A"],
              ["440 V", "0.90", "0.85", "12.86 A"],
            ],
          },
        },
        { p: "A few percent of efficiency or power factor moves the current of the same 7.5 kW motor by 1–2 A. Both vary with size, poles and efficiency class, so «amps per kW» rules of thumb are only rough." },
        { h: "Why trust the nameplate over the calculation" },
        {
          ul: [
            "Part load: efficiency and power factor both drop at light load, so the current does not fall in proportion to the load.",
            "Tolerances: ABB's Motor guide lists, after IEC 60034-1, −15 % of (1−η) for efficiency (up to 150 kW) and −1/6 of (1−cos φ) for power factor.",
            "Voltage: below nameplate voltage the same output takes more current. ABB quotes the IEC 60034-1 supply tolerance as ±5 % voltage and ±2 % frequency.",
          ],
        },
        { h: "Starting current" },
        {
          ul: [
            "Direct-on-line starting draws several times the rated current; take the exact ratio from the catalogue's IS/IN.",
            "At switch-on a transient adds on top, and the peak can reach about 2.5 times the (rms) starting current before it decays (ABB Motor guide §4.5).",
            "Star-delta starting cuts the starting current to about 30 % of DOL and the starting torque to about 25 %. Starting through a drive keeps the current at 0.5–1 times rated, 1.5 times at most.",
            "So a motor circuit breaker is chosen not to trip on the starting current, and overload protection is set separately (overload relay or the drive's electronic thermal).",
          ],
        },
        { h: "Breakers and cables: the two conditions" },
        { fig: { src: "/img/guides/overload-coordination.en.svg", w: 780, h: 210, alt: "Current scale showing IB (design current) ≤ In (device rating) ≤ IZ (cable capacity), and I2 (current ensuring operation) no more than 1.45 × IZ", cap: "Design current ≤ device rating ≤ cable capacity, and the current that ensures operation ≤ 1.45 × cable capacity." } },
        { code: "IB ≤ In ≤ IZ\nI2 ≤ 1.45 × IZ\n  IB: design current of the circuit   In: rated current of the protective device (setting, if adjustable)\n  IZ: current-carrying capacity       I2: current ensuring effective operation within the conventional time" },
        { p: "These are the overload coordination conditions of IEC 60364-4-43, as adopted in the Korean code (KEC 212.4.1). For a single motor, IB is the motor's rated current. In must be at least IB so normal running does not trip, and no more than IZ so the cable is protected. I2 comes from the device maker or its product standard." },
        { h: "Where IZ comes from" },
        {
          ul: [
            "Current-carrying capacity is taken from the tables in Annex B of IEC 60364-5-52 (KS C IEC 60364-5-52 in Korea, KEC 232.5.2), using Annex A for the installation method and applying correction factors for ambient temperature and grouping.",
            "The tables are based on maximum conductor temperatures of 70 °C for PVC and 90 °C for XLPE/EPR (KEC Table 232.5-1). The same size carries very different currents depending on insulation, installation method, loaded conductors and ambient temperature.",
            "This guide does not reproduce the tables, because we could not check the original Annex B. Use the standard itself or the cable maker's data.",
            "On long runs a cable can meet IZ and still drop too much voltage, so check voltage drop separately.",
          ],
        },
        { h: "Read the running current over the bus" },
        { p: "Drives publish their output current, and power meters the current they measure, as Modbus registers — for example 0x0310 on the LS S300 (output current, 0.1 A units) and 0026H on the YASKAWA A1000 (output current, scaling depends on the model). Comparing the running current with the nameplate tells you how loaded the motor is." },
        { h: "In PortDock" },
        {
          ul: [
            "«Motor Current Calculator» web tool: three-phase, single-phase or DC, kW or HP → current, input power, kVA and torque, plus efficiency from nameplate values.",
            "«Voltage Drop & Wire Size Calculator» web tool: voltage drop over the cable length.",
            "Modbus Master: load a device register map and read a drive's or power meter's output current in a table, with logging to file.",
          ],
        },
      ],
    },
  },
  // 근거: NIST SP 811 부록 B.8(psi·kgf/cm²·mmH2O·inH2O·mmHg·atm), SI 브로슈어 표 8(bar). 계산은 site/src/lib/units.ts.
  {
    slug: "pressure-units",
    date: "2026-10-23",
    tools: ["modbus-master", "plot"],
    related: ["4-20ma-loop", "modbus-float-word-order", "motor-current-breaker-cable", "pneumatic-cylinder-force"],
    webTools: ["tools/pressure/", "tools/4-20ma/", "tools/units/"],
    deviceKinds: ["panel-meter"],
    title: { ko: "압력 센서 단위 혼동 — bar·psi·kPa·kgf/cm²·mmH2O, 게이지와 절대", en: "Pressure sensor unit mix-ups — bar, psi, kPa, kgf/cm², mmH2O, gauge vs absolute" },
    seoTitle: { ko: "압력 단위 변환과 센서 범위 설정 (bar·psi·kPa·kgf/cm²) — PortDock", en: "Pressure Units: bar, psi, kPa, kgf/cm², Gauge vs Abs — PortDock" },
    desc: {
      ko: "압력 값이 2 %, 1 bar, 또는 14.5배 틀릴 때 — kgf/cm² 와 bar, 게이지와 절대, mmH₂O·kPa, psi 를 바로잡고 4–20mA 범위를 PLC 에 맞게 넣습니다.",
      en: "Pressure off by 2 %, by 1 bar, or by a factor of 14.5? Sort out kgf/cm² vs bar, gauge vs absolute, mmH₂O vs kPa and psi, and set the 4–20 mA range in the PLC.",
    },
    body: {
      ko: [
        { p: "압력은 현장마다 쓰는 단위가 다릅니다. 오래된 압력계는 kgf/cm², 수입 장비는 psi, 전송기 사양서는 kPa·MPa, 송풍기·덕트는 mmH₂O, 진공은 mbar·Torr 를 씁니다. 숫자가 «조금» 또는 «크게» 틀릴 때는 계산보다 단위부터 의심하는 편이 빠릅니다. 틀린 크기로 원인을 짐작할 수 있습니다." },
        { h: "틀린 크기로 보는 원인" },
        {
          table: {
            plain: true,
            head: ["증상", "흔한 원인"],
            rows: [
              ["약 2 % 차이", "kgf/cm² 와 bar 를 같은 것으로 봄 — 1 kgf/cm² = 0.980 665 bar"],
              ["약 1 bar(101 kPa) 차이", "게이지(bar g)와 절대(bar a) 혼동 — 둘의 차이가 대기압"],
              ["약 14.5배", "psi 와 bar 혼동 — 1 bar ≈ 14.504 psi"],
              ["약 6.9배", "psi 와 kPa 혼동 — 1 psi ≈ 6.895 kPa"],
              ["10배·1000배", "kPa·MPa·bar 접두어 — 1 MPa = 10 bar = 1000 kPa"],
              ["약 102배", "kPa 와 mmH₂O 혼동 — 1 kPa ≈ 101.97 mmH₂O"],
            ],
          },
        },
        { h: "kgf/cm² 는 bar 가 아니다" },
        { p: "1 kgf/cm² 는 1 kg 이 표준 중력(9.806 65 m/s²)에서 누르는 힘을 1 cm² 로 나눈 98 066.5 Pa 이고, 1 bar 는 100 000 Pa 입니다. 둘은 약 2 % 다릅니다. 7 kgf/cm² 는 약 6.86 bar 이고, 1.6 MPa 는 약 16.3 kgf/cm² 입니다. 도면·오래된 압력계의 «kg» 를 bar 칸에 그대로 옮기면 이만큼 어긋납니다." },
        { h: "게이지 압력과 절대 압력" },
        { fig: { src: "/img/guides/pressure-gauge-abs.ko.svg", w: 780, h: 330, alt: "압력 눈금: 완전 진공이 절대 압력 0, 대기압 101.325 kPa 가 게이지 압력 0. 5 bar g 는 약 6.013 bar a, −0.5 bar g 는 약 0.513 bar a", cap: "게이지 압력은 대기압에서, 절대 압력은 완전 진공에서 잽니다. 표준 대기압으로 그렸습니다." } },
        { p: "게이지 압력(bar g, psig)은 그 자리 대기압을 0 으로, 절대 압력(bar a, psia)은 완전 진공을 0 으로 잽니다. 절대 = 게이지 + 대기압입니다. 표준 대기압 101.325 kPa 로 보면 5 bar g 는 약 6.013 bar a 입니다. 대부분의 공정 압력 전송기는 게이지형이고, 진공·증기·기체 계산에는 절대 압력이 필요할 때가 많습니다. 사양서의 «G» «A» «gauge» «absolute» 를 확인하고, 단위 뒤에 g·a 를 붙여 적어 두면 혼동이 줄어듭니다." },
        { p: "차압 전송기(필터 앞뒤, 오리피스 유량계)의 값은 두 점의 차이라 게이지·절대 어느 쪽도 아닙니다." },
        { h: "mmH₂O·mmHg 는 «관용» 값" },
        { p: "수주 1 mm(mmH₂O)는 물 1000 kg/m³ 과 표준 중력으로 정한 9.806 65 Pa, 수은주 1 mm(mmHg)는 수은 13 595.1 kg/m³ 로 정한 약 133.3224 Pa 입니다. 실제 물기둥은 물 온도에 따라 조금 달라, NIST SP 811 은 inH₂O 를 39.2 °F 물로 249.082 Pa, 60 °F 로 248.84 Pa 로 따로 적습니다. 송풍기 정압 250 mmH₂O 는 약 2.45 kPa 입니다." },
        { h: "센서 범위를 PLC 에 넣을 때" },
        { p: "4–20mA 압력 전송기는 «범위 하한 = 4 mA, 상한 = 20 mA» 입니다. PLC 에 공학 단위로 넣을 때는 전송기에 설정된 범위와 단위를 그대로 옮기거나, 원하는 단위로 범위만 바꿔 넣습니다. 예: 0–10 bar 전송기를 psi 로 보려면 0–145.04 psi 로 넣습니다." },
        {
          table: {
            head: ["전류", "0–10 bar", "psi", "kPa", "kgf/cm²"],
            rows: [
              ["4 mA", "0", "0", "0", "0"],
              ["8 mA", "2.5", "36.26", "250", "2.549"],
              ["12 mA", "5", "72.52", "500", "5.099"],
              ["16 mA", "7.5", "108.8", "750", "7.648"],
              ["20 mA", "10", "145.04", "1000", "10.197"],
            ],
          },
        },
        { p: "범위가 «−1–9 bar» 처럼 음수에서 시작하는 복합(진공 포함) 전송기도 같은 식으로 4 mA 가 하한입니다. 단위를 바꿀 때 하한·상한을 함께 바꿔야 하고, 게이지형 범위를 절대 압력으로 바꾸려면 두 값에 대기압을 더합니다." },
        { h: "통신으로 읽는 압력 값" },
        { p: "Modbus 로 압력을 읽을 때는 레지스터 값에 배율(예: 0.01)이 붙거나, 32비트 실수(float)로 두 레지스터에 나뉘어 있는 경우가 많습니다. 장비 매뉴얼에서 단위·배율·워드 순서를 확인합니다. 단위를 장비에서 바꿀 수 있는 패널 미터·전송기는 단위 설정 레지스터를 함께 읽어 두면 화면과 통신 값의 단위가 어긋나는 일을 막을 수 있습니다." },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «압력 단위 변환기»: 한 값을 bar·psi·kPa·MPa·kgf/cm²·mmH₂O·mmHg 등 모든 단위로, 게이지 ↔ 절대, 센서 범위의 4–20mA 환산표를 만듭니다.",
            "웹 도구 «4–20mA 환산 계산기»: 전류 ↔ 공학값 ↔ % ↔ PLC 카운트를 바꿉니다.",
            "Modbus Master 는 레지스터를 형식(정수·float)과 워드 순서대로 풀어 보여 주고(장비 프로필은 칸 이름에 단위·배율을 적음), PortDock Plot 은 시리얼·TCP·UDP 로 들어오는 숫자를 실시간 그래프로 그립니다.",
          ],
        },
      ],
      en: [
        { p: "Every site uses its own pressure units: old gauges in kgf/cm², imported machines in psi, transmitter datasheets in kPa or MPa, fans and ducts in mmH₂O (or inH₂O), vacuum in mbar or Torr. When a reading is «slightly» or «badly» off, suspect the units before the maths — the size of the error often tells you which mix-up it is." },
        { h: "What the size of the error suggests" },
        {
          table: {
            plain: true,
            head: ["Symptom", "Usual cause"],
            rows: [
              ["About 2 % off", "kgf/cm² treated as bar — 1 kgf/cm² = 0.980 665 bar"],
              ["About 1 bar (101 kPa) off", "Gauge (bar g) vs absolute (bar a) — they differ by atmospheric pressure"],
              ["About 14.5 times", "psi vs bar — 1 bar ≈ 14.504 psi"],
              ["About 6.9 times", "psi vs kPa — 1 psi ≈ 6.895 kPa"],
              ["10 or 1000 times", "kPa, MPa and bar prefixes — 1 MPa = 10 bar = 1000 kPa"],
              ["About 102 times", "kPa vs mmH₂O — 1 kPa ≈ 101.97 mmH₂O"],
            ],
          },
        },
        { h: "kgf/cm² is not a bar" },
        { p: "1 kgf/cm² is the force of 1 kg under standard gravity (9.806 65 m/s²) over 1 cm², i.e. 98 066.5 Pa; 1 bar is 100 000 Pa. They are about 2 % apart: 7 kgf/cm² is about 6.86 bar and 1.6 MPa is about 16.3 kgf/cm². Copying the «kg» of a drawing or old gauge straight into a bar field is off by that much." },
        { h: "Gauge versus absolute" },
        { fig: { src: "/img/guides/pressure-gauge-abs.en.svg", w: 780, h: 330, alt: "Pressure scale: perfect vacuum is 0 absolute, atmosphere at 101.325 kPa is 0 gauge. 5 bar g is about 6.013 bar a, −0.5 bar g about 0.513 bar a", cap: "Gauge pressure is measured from the atmosphere, absolute pressure from a perfect vacuum. Drawn with the standard atmosphere." } },
        { p: "Gauge pressure (bar g, psig) takes the local atmosphere as zero; absolute pressure (bar a, psia) takes a perfect vacuum as zero. Absolute = gauge + atmospheric. With the standard 101.325 kPa, 5 bar g is about 6.013 bar a. Most process pressure transmitters are gauge types, while vacuum, steam and gas calculations often need absolute pressure. Check the «G», «A», «gauge» or «absolute» in the datasheet, and write g or a after the unit to avoid mix-ups." },
        { p: "A differential pressure transmitter (across a filter, an orifice flowmeter) reads the difference between two points — neither gauge nor absolute." },
        { h: "mmH₂O and mmHg are conventional values" },
        { p: "One millimetre of water (mmH₂O) is defined with water at 1000 kg/m³ and standard gravity: 9.806 65 Pa. One millimetre of mercury (mmHg) uses 13 595.1 kg/m³: about 133.3224 Pa. A real water column varies slightly with temperature — NIST SP 811 lists inH₂O at 39.2 °F as 249.082 Pa and at 60 °F as 248.84 Pa, against 249.0889 Pa conventional. A fan static pressure of 250 mmH₂O is about 2.45 kPa." },
        { h: "Putting the sensor range into the PLC" },
        { p: "A 4–20 mA pressure transmitter maps «range low = 4 mA, range high = 20 mA». In the PLC, either copy the transmitter's range and unit as they are or convert just the range into the unit you want. Example: to show a 0–10 bar transmitter in psi, enter 0–145.04 psi." },
        {
          table: {
            head: ["Current", "0–10 bar", "psi", "kPa", "kgf/cm²"],
            rows: [
              ["4 mA", "0", "0", "0", "0"],
              ["8 mA", "2.5", "36.26", "250", "2.549"],
              ["12 mA", "5", "72.52", "500", "5.099"],
              ["16 mA", "7.5", "108.8", "750", "7.648"],
              ["20 mA", "10", "145.04", "1000", "10.197"],
            ],
          },
        },
        { p: "Compound (vacuum and pressure) transmitters with a range such as −1–9 bar work the same way, with 4 mA at the low end. Convert both ends when changing units, and add atmospheric pressure to both to turn a gauge range into absolute." },
        { h: "Pressure read over Modbus" },
        { p: "Pressure registers often carry a scale (such as 0.01) or a 32-bit float split across two registers. Check the unit, scale and word order in the device manual. For panel meters and transmitters whose unit can be changed on the device, also read the unit-setting register so the display and the bus value cannot drift apart." },
        { h: "In PortDock" },
        {
          ul: [
            "«Pressure Unit Converter» web tool: one value in bar, psi, kPa, MPa, kgf/cm², mmH₂O, mmHg and more; gauge ↔ absolute; a 4–20 mA table for a sensor range.",
            "«4–20 mA Scaling Calculator» web tool: current ↔ engineering units ↔ % ↔ PLC counts.",
            "Modbus Master decodes registers by type (integer or float) and word order (device profiles put the unit and scale in the column name), and PortDock Plot graphs numbers arriving over serial, TCP or UDP live.",
          ],
        },
      ],
    },
  },
  // 근거: ABB Motor guide(2019) §9.3 동기 속도·§3.8 슬립 허용차, ABB Technical guide No. 7 식 3.1·3.2, YASKAWA A1000 Technical Manual(SIEP C710616 41H)
  // E2-02·o1-03·Modbus 0024H, LS S300 사용 설명서 5.1.2.3(DRV-32)·식 16·Modbus 0x0311. 장비 주소는 data/devices 의 확인값. 계산은 site/src/lib/motor.ts.
  {
    slug: "vfd-frequency-rpm",
    date: "2026-10-23",
    tools: ["modbus-master"],
    related: ["motor-current-breaker-cable", "modbus-address-notation", "modbus-function-codes", "ball-screw-torque-motor"],
    webTools: ["tools/motor-speed/", "tools/motor-current/", "tools/encoder/"],
    devices: true,
    deviceKinds: ["inverter"],
    title: { ko: "인버터 주파수와 모터 회전수 — 60 Hz 가 1800 rpm 이 아닌 이유", en: "Drive frequency and motor speed — why 60 Hz is not 1800 rpm" },
    seoTitle: { ko: "인버터 주파수 ↔ 모터 회전수 (극수·슬립·rpm 표시) — PortDock", en: "VFD Hz to RPM: Poles, Slip and the RPM Display — PortDock" },
    desc: {
      ko: "인버터 Hz 와 모터 rpm 의 관계 — 동기 속도 120f/P, 슬립, 감속비, 인버터 화면의 rpm 표시와 극수 설정, Modbus 로 출력 주파수 읽기까지.",
      en: "How drive Hz maps to motor rpm — synchronous speed 120f/P, slip, gear ratio, the rpm display and pole setting, and output frequency over Modbus.",
    },
    body: {
      ko: [
        { p: "인버터는 모터에 주는 전원의 주파수를 바꿔 속도를 바꿉니다. 주파수와 회전수는 비례하지만, 유도 전동기는 «동기 속도» 보다 조금 느리게 돌기 때문에 60 Hz 4극 모터가 1800 rpm 으로 돌지는 않습니다. 계산·표시·통신 값이 서로 맞지 않을 때 확인할 것을 정리합니다." },
        { h: "동기 속도: 120 × f ÷ 극수" },
        { code: "ns(r/min) = 120 × f ÷ 극수\n  4극, 60 Hz → 1800 r/min\n  4극, 50 Hz → 1500 r/min\n  2극, 60 Hz → 3600 r/min   6극, 60 Hz → 1200 r/min" },
        { p: "120 은 «60 초 × 2(극 한 쌍)» 입니다. 극수는 명판에 직접 적혀 있지 않은 경우가 많지만, 정격 회전수보다 조금 큰 동기 속도를 찾으면 알 수 있습니다. 60 Hz 에서 1750 r/min 이면 4극, 3500 r/min 대면 2극, 1160 r/min 이면 6극입니다." },
        { h: "슬립: 실제 회전수가 낮은 이유" },
        { fig: { src: "/img/guides/motor-slip.ko.svg", w: 780, h: 280, alt: "4극 모터: 60 Hz 에서 동기 1800 r/min, 실제 약 1750 r/min, 차이 50 r/min 이 슬립. 30 Hz 에서 동기 900 r/min, 실제 약 850 r/min", cap: "주파수를 반으로 줄이면 동기 속도도 반이 되고, 실제 회전수는 슬립만큼 낮습니다(같은 토크에서 슬립 회전수가 같다고 본 근사)." } },
        { p: "유도 전동기는 회전자가 회전 자기장보다 느리게 돌아야 토크가 생깁니다. 이 차이가 슬립이고, 명판의 정격 회전수(예: 1750 r/min)는 정격 부하에서의 회전수입니다. 슬립 = (1800 − 1750) ÷ 1800 ≈ 2.8 %, 슬립 주파수 = 60 − 1750 × 4 ÷ 120 ≈ 1.67 Hz 입니다. YASKAWA A1000 은 이 식(E2-02 = f − n × p ÷ 120)으로 «모터 정격 슬립» 파라미터를 계산하라고 적고, 범용 모터라면 0.5~3 Hz 를 기준으로 듭니다." },
        { p: "명판 회전수에도 허용차가 있습니다. ABB Motor guide 는 IEC 60034-1 에 따라 슬립 허용차를 ±20 %(1 kW 이상), ±30 %(1 kW 미만)로 적습니다." },
        { h: "주파수를 바꿀 때 회전수" },
        {
          table: {
            head: ["출력 주파수", "동기 속도(4극)", "회전수(정격 슬립 50 r/min 유지, 근사)"],
            rows: [
              ["60 Hz", "1800", "1750"],
              ["45 Hz", "1350", "1300"],
              ["30 Hz", "900", "850"],
              ["15 Hz", "450", "400"],
            ],
          },
        },
        { p: "기저 주파수 아래에서 V/f 를 일정하게 운전하면, 같은 토크에서 슬립 회전수가 거의 같다고 보고 계산할 수 있습니다. 그래서 저속일수록 슬립이 «비율로» 커집니다. 실제 슬립은 부하에 따라 달라지고, 인버터의 슬립 보상이나 벡터 제어를 쓰면 인버터가 그만큼 주파수를 올려 동기 속도 기준의 지령 회전수에 가깝게 맞춥니다." },
        { h: "감속기가 있으면" },
        { p: "감속비 10 이면 출력축 회전수는 모터 회전수의 1/10 입니다. 출력축 150 r/min 이 필요하면 모터는 1500 r/min, 4극이면 동기 주파수 50 Hz 에 슬립 몫(50 r/min ≈ 1.67 Hz)을 더해 약 51.7 Hz 가 됩니다. 슬립 보상을 쓰면 50 Hz 로 맞춥니다." },
        { h: "인버터 화면의 rpm 은 극수 설정으로 환산한 값" },
        {
          ul: [
            "LS S300 은 DRV-32(Hz/rpm Select)를 1(rpm Display)로 하면 속도 관련 값이 rpm 으로 바뀝니다. 매뉴얼은 이 rpm 값이 4극 모터 기준이며 극수 설정(MOT1, 2-25)에 따라 달라진다고 적습니다. 같은 매뉴얼의 식 16 은 Hz = rpm × 극수 ÷ 120 입니다.",
            "YASKAWA A1000 은 o1-03 = 2 이면 최대 출력 주파수와 모터 극수(E2-04)로 계산한 r/min 단위로 표시합니다.",
            "극수 설정이 실제 모터와 다르면 rpm 표시가 배로 틀립니다(4극 모터를 2극으로 두면 2배). rpm 이 이상하면 극수 파라미터부터 봅니다.",
          ],
        },
        { h: "Modbus 로 출력 주파수 읽기" },
        {
          table: {
            head: ["장비", "출력 주파수 주소", "단위"],
            rows: [
              ["LS S300", "0x0311", "0.01 Hz"],
              ["LS S100", "0h000A", "0.01 Hz"],
              ["YASKAWA A1000", "0024H", "o1-03 설정에 따름"],
            ],
          },
        },
        { p: "주소는 PortDock 장비 레지스터 맵의 매뉴얼 표기입니다. 읽은 값을 rpm 으로 보려면 주파수 × 120 ÷ 극수(동기 속도)로 바꾸고, 실제 회전수가 필요하면 슬립을 빼거나 인코더·회전수 모니터 값을 씁니다. YASKAWA 처럼 표시 단위 설정이 통신 값에도 적용되는 장비는 설정을 함께 확인합니다." },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «인버터 주파수 ↔ 모터 회전수»: Hz·극수 → 동기 속도, 명판 회전수로 슬립, 감속비 출력 회전수, 원하는 rpm 에 필요한 Hz 를 계산합니다.",
            "웹 도구 «모터 전류 계산기»: 정격 출력·전압·효율·역률로 전류와 정격 토크를 봅니다.",
            "Modbus Master: 인버터 장비 맵(LS S100·S300·G100·M100·H100, YASKAWA A1000·V1000)을 불러와 출력 주파수·전류를 표로 읽습니다.",
          ],
        },
      ],
      en: [
        { p: "A drive changes motor speed by changing the frequency it supplies. Speed is proportional to frequency, but an induction motor runs a little below «synchronous speed», so a 4-pole motor at 60 Hz does not turn at 1800 rpm. Here is what to check when the calculation, the display and the bus value disagree." },
        { h: "Synchronous speed: 120 × f ÷ poles" },
        { code: "ns (r/min) = 120 × f ÷ poles\n  4 poles, 60 Hz → 1800 r/min\n  4 poles, 50 Hz → 1500 r/min\n  2 poles, 60 Hz → 3600 r/min   6 poles, 60 Hz → 1200 r/min" },
        { p: "The 120 is «60 seconds × 2 (poles per pair)». Nameplates often omit the pole count, but the synchronous speed just above the rated speed gives it away: 1750 r/min at 60 Hz is 4 poles, 3500-something is 2 poles, 1160 is 6 poles." },
        { h: "Slip: why the real speed is lower" },
        { fig: { src: "/img/guides/motor-slip.en.svg", w: 780, h: 280, alt: "4-pole motor: synchronous 1800 r/min and actual about 1750 r/min at 60 Hz, the 50 r/min difference is slip; at 30 Hz synchronous 900 r/min and actual about 850 r/min", cap: "Halving the frequency halves the synchronous speed; the actual speed is lower by the slip (approximation: same slip rpm at the same torque)." } },
        { p: "An induction motor's rotor must turn slower than the rotating field to produce torque. The difference is slip, and the nameplate rated speed (say 1750 r/min) is the speed at rated load. Slip = (1800 − 1750) ÷ 1800 ≈ 2.8 %; slip frequency = 60 − 1750 × 4 ÷ 120 ≈ 1.67 Hz. The YASKAWA A1000 manual uses exactly this formula (E2-02 = f − n × p ÷ 120) for its «motor rated slip» parameter and gives 0.5–3 Hz as a guideline for general-purpose motors." },
        { p: "Nameplate speed has a tolerance too: ABB's Motor guide gives, after IEC 60034-1, ±20 % on slip for 1 kW and above and ±30 % below 1 kW." },
        { h: "Speed at other frequencies" },
        {
          table: {
            head: ["Output frequency", "Synchronous (4 poles)", "Speed (rated slip 50 r/min kept, approx.)"],
            rows: [
              ["60 Hz", "1800", "1750"],
              ["45 Hz", "1350", "1300"],
              ["30 Hz", "900", "850"],
              ["15 Hz", "450", "400"],
            ],
          },
        },
        { p: "Below base frequency with constant V/f, the slip speed at a given torque can be taken as roughly unchanged, so slip grows as a percentage at low speed. Real slip varies with load, and with slip compensation or vector control the drive raises the frequency by the slip to track a speed command based on synchronous speed." },
        { h: "With a gearbox" },
        { p: "A 10:1 reducer turns the output shaft at one tenth of motor speed. For 150 r/min at the output the motor needs 1500 r/min: on 4 poles that is 50 Hz synchronous plus the slip (50 r/min ≈ 1.67 Hz), about 51.7 Hz — or 50 Hz with slip compensation." },
        { h: "The rpm on the drive display comes from the pole setting" },
        {
          ul: [
            "On the LS S300, setting DRV-32 (Hz/rpm Select) to 1 (rpm Display) switches speed values to rpm. The manual notes the rpm values assume a 4-pole motor and change with the pole number setting (MOT1, 2-25); its formula 16 is Hz = rpm × poles ÷ 120.",
            "On the YASKAWA A1000, o1-03 = 2 shows r/min calculated from the maximum output frequency and the number of motor poles (E2-04).",
            "A wrong pole setting makes the rpm display wrong by a whole factor (a 4-pole motor set as 2 poles reads double). If the rpm looks odd, check the pole parameter first.",
          ],
        },
        { h: "Reading output frequency over Modbus" },
        {
          table: {
            head: ["Device", "Output frequency address", "Unit"],
            rows: [
              ["LS S300", "0x0311", "0.01 Hz"],
              ["LS S100", "0h000A", "0.01 Hz"],
              ["YASKAWA A1000", "0024H", "set by o1-03"],
            ],
          },
        },
        { p: "Addresses are as printed in the manuals, from PortDock's device register maps. To show the value in rpm, multiply by 120 and divide by the poles (synchronous speed); for the true speed, subtract the slip or use an encoder or speed monitor value. On drives like the YASKAWA where the display unit setting also applies to the bus value, check that setting too." },
        { h: "In PortDock" },
        {
          ul: [
            "«VFD Frequency ↔ Motor RPM» web tool: Hz and poles → synchronous speed, slip from the nameplate, gearbox output speed, and the Hz needed for a target rpm.",
            "«Motor Current Calculator» web tool: current and rated torque from output, voltage, efficiency and power factor.",
            "Modbus Master: load the drive register maps (LS S100, S300, G100, M100, H100, YASKAWA A1000, V1000) and read output frequency and current in a table.",
          ],
        },
      ],
    },
  },
  {
    // 근거: MODBUS Application Protocol Specification V1.1b3 §6(함수별 상태도: 01 → 03 → 02 → 04 순서, 개수 한도), §7(예외 응답·코드표·96+5 예),
    //   예시 프레임 CRC 는 lib/checksum.ts 로 계산. 장비 사례는 modbus-no-response 글과 같은 출처(장비 맵·매뉴얼).
    slug: "modbus-exception-codes",
    date: "2026-10-23",
    tools: ["modbus-master", "modbus-slave"],
    related: ["modbus-no-response", "modbus-function-codes", "modbus-address-notation", "modbus-rtu-frame"],
    webTools: ["tools/modbus-decoder/", "tools/modbus/"],
    devices: true,
    title: { ko: "Modbus 예외 코드 01~0B — 83 02 같은 응답 읽기와 원인", en: "Modbus exception codes 01–0B — reading replies like 83 02" },
    seoTitle: { ko: "Modbus 예외 코드(에러 코드) 01·02·03·04 원인 — PortDock", en: "Modbus Exception Codes 01, 02, 03, 04, 0B Explained — PortDock" },
    desc: {
      ko: "Modbus 예외 응답(함수 + 0x80)의 모양, 예외 코드 01~0B 의 뜻, 장비가 01 → 03 → 02 → 04 순서로 검사하는 규격의 상태도, 코드별로 고칠 곳을 정리했습니다.",
      en: "What a Modbus exception reply (function + 0x80) looks like, codes 01–0B, the 01 → 03 → 02 → 04 check order in the specification, and what to fix for each.",
    },
    body: {
      ko: [
        { p: "Modbus 장비가 요청을 받았지만 처리할 수 없으면 «예외 응답» 을 보냅니다. 예외 응답이 왔다는 것은 배선·속도·국번은 맞고 요청 내용이 장비와 안 맞는다는 뜻이라, 타임아웃보다 원인을 찾기 쉽습니다. 아래는 MODBUS Application Protocol Specification V1.1b3 의 6장(함수별 상태도)과 7장(예외 응답)을 따릅니다." },
        { h: "예외 응답이 오는 경우와 안 오는 경우" },
        {
          table: {
            plain: true,
            head: ["장비가 받은 것", "장비의 반응(규격 7장)"],
            rows: [
              ["통신 오류 없이 받았고 처리할 수 있음", "정상 응답"],
              ["통신 오류 때문에 받지 못함", "응답 없음 → 마스터는 타임아웃"],
              ["받았지만 패리티·CRC·LRC 오류", "응답 없음 → 마스터는 타임아웃"],
              ["오류 없이 받았지만 처리할 수 없음(없는 주소 등)", "예외 응답"],
            ],
          },
        },
        { p: "그래서 CRC 가 틀린 요청에는 예외가 오지 않습니다. 타임아웃만 난다면 예외가 아니라 통신 쪽 문제이니 Modbus 응답 없음 점검 글을 보세요." },
        { h: "모양: 함수 코드 + 0x80, 예외 코드 1바이트" },
        { code: "요청  01 03 00 60 00 05 85 D7   ← 국번 1, 보유 레지스터 96 번부터 5개\n응답  01 83 02 C0 F1            ← 83 = 03 + 80, 예외 코드 02" },
        { p: "정상 응답은 요청의 함수 코드를 그대로 돌려주고, 예외 응답은 함수 코드의 맨 위 비트를 1로 바꿔(0x80 을 더해) 돌려줍니다. 함수 코드는 모두 0x80 보다 작으므로 첫 바이트 다음이 0x80 이상이면 예외입니다. RTU 는 뒤에 CRC 2바이트가 붙고, TCP 는 MBAP 머리 7바이트 뒤에 «83 02» 두 바이트만 옵니다." },
        {
          table: {
            head: ["요청 함수", "예외 응답 함수"],
            rows: [
              ["01 코일 읽기", "81"],
              ["02 입력 접점 읽기", "82"],
              ["03 보유 레지스터 읽기", "83"],
              ["04 입력 레지스터 읽기", "84"],
              ["05 코일 하나 쓰기", "85"],
              ["06 레지스터 하나 쓰기", "86"],
              ["0F 여러 코일 쓰기", "8F"],
              ["10 여러 레지스터 쓰기", "90"],
              ["17 읽기·쓰기 함께", "97"],
            ],
          },
        },
        { h: "예외 코드표 (규격 7장)" },
        {
          table: {
            head: ["코드", "이름", "뜻"],
            rows: [
              ["01", "ILLEGAL FUNCTION", "그 함수 코드를 장비가 받지 않음. 장비에 구현되지 않았거나, 지금 상태(예: 설정 전)에서 처리할 수 없음"],
              ["02", "ILLEGAL DATA ADDRESS", "주소가 장비에 없음. 정확히는 «시작 주소 + 개수» 의 조합이 장비 범위를 벗어남"],
              ["03", "ILLEGAL DATA VALUE", "요청 데이터 칸의 값이 허용되지 않음 — 개수·바이트 수처럼 요청 구조가 맞지 않을 때"],
              ["04", "SERVER DEVICE FAILURE", "요청을 처리하다 장비에서 복구할 수 없는 오류"],
              ["05", "ACKNOWLEDGE", "프로그래밍 명령용. 받았고 처리에 오래 걸림(마스터의 타임아웃을 막으려고 먼저 답함)"],
              ["06", "SERVER DEVICE BUSY", "오래 걸리는 명령을 처리 중. 나중에 다시 보내야 함"],
              ["08", "MEMORY PARITY ERROR", "파일 레코드(함수 20·21) 읽기에서 메모리 패리티 오류"],
              ["0A", "GATEWAY PATH UNAVAILABLE", "게이트웨이가 입력 포트에서 출력 포트로 가는 경로를 잡지 못함 — 설정 오류·과부하"],
              ["0B", "GATEWAY TARGET DEVICE FAILED TO RESPOND", "게이트웨이 뒤의 대상 장비가 응답하지 않음 — 대개 그 장비가 네트워크에 없음"],
            ],
          },
        },
        { p: "07·09 는 이 판(V1.1b3)에 정의가 없습니다. 이런 코드가 오면 장비 매뉴얼의 자체 오류 표를 봅니다." },
        { h: "장비가 검사하는 순서: 01 → 03 → 02 → 04" },
        { p: "규격 6장의 함수별 상태도는 읽기·쓰기 함수(01~06·0F·10)마다 같은 순서로 요청을 검사합니다. 그래서 어떤 예외가 왔는지 보면 어디까지는 통과했는지도 알 수 있습니다." },
        {
          table: {
            plain: true,
            head: ["순서", "검사", "실패하면"],
            rows: [
              ["1", "함수 코드를 지원하는가", "01"],
              ["2", "개수가 범위 안인가 — 03·04 는 1~125(0x007D), 01·02 는 1~2000(0x07D0), 10 은 1~123(0x007B), 0F 는 1~1968(0x07B0). 05 는 값이 0000 또는 FF00 인가", "03"],
              ["3", "시작 주소, 그리고 시작 주소 + 개수가 장비 범위 안인가", "02"],
              ["4", "실제로 읽기·쓰기를 해냈는가", "04"],
            ],
          },
        },
        { p: "예를 들어 03 이 왔다면 함수는 지원되고 주소를 보기도 전에 개수(또는 값)에서 걸린 것입니다. 표의 개수는 규격의 최대값이고, 장비는 더 작은 한도를 둘 수 있습니다." },
        { h: "02: 주소 범위 — 규격의 예" },
        { p: "규격 7장은 레지스터가 100개(0~99)인 장비를 예로 듭니다. 96 번부터 4개(96~99)는 성공하지만, 96 번부터 5개는 100 번 레지스터가 없으므로 전체가 예외 02 입니다. 위의 «01 03 00 60 00 05» 가 바로 그 요청(0x60 = 96)입니다. 하나라도 범위 밖이면 나머지도 읽히지 않으므로, 이어진 칸끼리만 묶어 읽습니다." },
        {
          ul: [
            "0 기준 주소와 1 기준(40001) 표기를 섞으면 한 칸 밀려 마지막 칸이 범위 밖이 되기 쉽습니다 — Modbus 주소 표기 글을 보세요.",
            "매뉴얼의 레지스터 표 사이에 빈 주소가 있으면 그 칸을 걸쳐 읽을 때 02 를 돌려주는 장비가 많습니다.",
            "03 으로 읽어 02 가 나면, 그 값이 입력 레지스터(04)에 있는 장비인지 매뉴얼의 함수 코드 칸을 봅니다.",
          ],
        },
        { h: "03: 값 — 규격이 말하는 것과 말하지 않는 것" },
        { p: "규격은 03 을 «요청 나머지 부분의 구조가 틀렸을 때(예: 암시된 길이가 틀림)» 라고 정의하고, «레지스터에 쓰려는 값이 응용 프로그램의 기대 범위를 벗어났다는 뜻이 아니다 — Modbus 는 레지스터 값의 의미를 모른다» 고 덧붙입니다. 범위 밖 쓰기 값을 장비가 03 으로 거절하는지, 받아서 무시하거나 잘라 쓰는지는 장비 매뉴얼에 있습니다." },
        { h: "04·06: 장비 상태" },
        { p: "04 는 장비 안의 처리 오류이므로 장비 상태 표시와 매뉴얼의 오류 항목을 봅니다. 06(바쁨)은 같은 요청을 나중에 다시 보내면 되는 경우로, 요청을 너무 촘촘히 보낼 때 나기도 합니다 — 요청 간격을 늘립니다. 그 밖의 예외는 다시 보내도 같은 답이 오므로 재시도 대상이 아닙니다." },
        { h: "0A·0B: 게이트웨이 뒤 문제" },
        { p: "Modbus TCP ↔ RTU 게이트웨이가 0A·0B 를 돌려주면 PC 와 게이트웨이 사이(TCP)는 정상입니다. 0B 는 게이트웨이 뒤 시리얼 장비가 답하지 않은 것이므로 Unit ID(= 시리얼 국번)·속도·패리티·RS-485 배선을 봅니다. 0A 는 게이트웨이의 포트·경로 설정을 봅니다." },
        { h: "매뉴얼에 나온 장비별 예" },
        {
          ul: [
            "01: 루텍 Accura 3300E 는 함수 03·06·16 만 지원합니다 — 그 밖의 함수(예: 04)는 이 장비에게 «지원하지 않는 함수» 입니다.",
            "03: 한 번에 읽는 개수 한도가 규격(125)보다 작은 장비 — LS ELECTRIC GIMAC1000 은 124개, 한영넉스 VX 는 FC03 으로 31개까지입니다.",
            "쓰기만 예외: 한영넉스 LC 는 통신 쓰기 금지(CWP)가 출하 때 ON 이라 앞판에서 OFF 로 바꾸기 전까지 쓰기 요청을 예외로 거절합니다(매뉴얼 p.31·p.34).",
          ],
        },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «Modbus 프레임 해석기»: 받은 바이트를 붙여 넣으면 예외 응답인지, 어떤 코드인지 풀어 줍니다(RTU·TCP).",
            "Modbus Master: 통신 기록에 예외 이름을 함께 적고, 표마다 예외 수를 셉니다. 예외 응답은 재시도하지 않습니다.",
            "Modbus Slave: «장애 주입» 으로 일부러 예외를 돌려줘 마스터·HMI 가 예외를 어떻게 처리하는지 미리 볼 수 있습니다.",
          ],
        },
      ],
      en: [
        { p: "When a Modbus device receives a request but cannot carry it out, it sends an «exception response». Getting one means wiring, baud rate and slave ID are fine and the request itself does not fit the device — easier to fix than a timeout. This follows chapters 6 (state diagrams per function) and 7 (exception responses) of the MODBUS Application Protocol Specification V1.1b3." },
        { h: "When you get an exception — and when you do not" },
        {
          table: {
            plain: true,
            head: ["What the device received", "Its reaction (spec chapter 7)"],
            rows: [
              ["A request without communication error that it can handle", "Normal response"],
              ["Nothing, because of a communication error", "No response → the master times out"],
              ["A request with a parity, CRC or LRC error", "No response → the master times out"],
              ["A valid request it cannot handle (non-existent address…)", "Exception response"],
            ],
          },
        },
        { p: "So a request with a bad CRC never gets an exception. If all you see are timeouts, the problem is on the communication side — see the Modbus no-response checklist." },
        { h: "Shape: function code + 0x80, then one exception byte" },
        { code: "request   01 03 00 60 00 05 85 D7   ← slave 1, 5 holding registers from 96\nresponse  01 83 02 C0 F1            ← 83 = 03 + 80, exception code 02" },
        { p: "A normal response echoes the function code; an exception response sets its most significant bit (adds 0x80). All function codes are below 0x80, so a second byte of 0x80 or more means an exception. RTU adds a 2-byte CRC; TCP sends only «83 02» after the 7-byte MBAP header." },
        {
          table: {
            head: ["Request function", "Exception function"],
            rows: [
              ["01 Read Coils", "81"],
              ["02 Read Discrete Inputs", "82"],
              ["03 Read Holding Registers", "83"],
              ["04 Read Input Registers", "84"],
              ["05 Write Single Coil", "85"],
              ["06 Write Single Register", "86"],
              ["0F Write Multiple Coils", "8F"],
              ["10 Write Multiple Registers", "90"],
              ["17 Read/Write Multiple Registers", "97"],
            ],
          },
        },
        { h: "Exception codes (spec chapter 7)" },
        {
          table: {
            head: ["Code", "Name", "Meaning"],
            rows: [
              ["01", "ILLEGAL FUNCTION", "The function code is not allowed: not implemented in this device, or the device is in the wrong state (e.g. unconfigured)"],
              ["02", "ILLEGAL DATA ADDRESS", "The address does not exist; more precisely, the combination of start address and quantity is out of range"],
              ["03", "ILLEGAL DATA VALUE", "A value in the request's data field is not allowed — the structure of the request, such as a quantity or byte count, is wrong"],
              ["04", "SERVER DEVICE FAILURE", "An unrecoverable error occurred while performing the action"],
              ["05", "ACKNOWLEDGE", "For programming commands: accepted, but it will take long (sent to prevent a master timeout)"],
              ["06", "SERVER DEVICE BUSY", "Busy with a long-duration command; retransmit later"],
              ["08", "MEMORY PARITY ERROR", "Parity error in memory while reading a file record (functions 20/21)"],
              ["0A", "GATEWAY PATH UNAVAILABLE", "The gateway could not allocate a path from input to output port — misconfigured or overloaded"],
              ["0B", "GATEWAY TARGET DEVICE FAILED TO RESPOND", "No response from the device behind the gateway — usually it is not on the network"],
            ],
          },
        },
        { p: "Codes 07 and 09 are not defined in this edition (V1.1b3). If you see them, look for the device's own error table in its manual." },
        { h: "The order a device checks: 01 → 03 → 02 → 04" },
        { p: "The state diagrams in chapter 6 check read and write requests (functions 01–06, 0F, 10) in the same order, so the exception code also tells you how far the request got." },
        {
          table: {
            plain: true,
            head: ["Step", "Check", "On failure"],
            rows: [
              ["1", "Is the function code supported?", "01"],
              ["2", "Is the quantity in range — 1–125 (0x007D) for 03/04, 1–2000 (0x07D0) for 01/02, 1–123 (0x007B) for 10, 1–1968 (0x07B0) for 0F; for 05, is the value 0000 or FF00?", "03"],
              ["3", "Are the start address and start + quantity inside the device's range?", "02"],
              ["4", "Did the read or write actually succeed?", "04"],
            ],
          },
        },
        { p: "So a 03 means the function is supported and the request failed on the quantity (or value) before the address was even checked. The quantities are the specification maximums; devices may set lower limits." },
        { h: "02: address range — the specification's example" },
        { p: "Chapter 7 uses a device with 100 registers (0–99). Reading 4 registers from 96 (96–99) works; reading 5 from 96 fails entirely with exception 02 because register 100 does not exist. «01 03 00 60 00 05» above is exactly that request (0x60 = 96). If any part is out of range nothing is returned, so read contiguous blocks only." },
        {
          ul: [
            "Mixing 0-based addresses with 1-based (40001) notation shifts by one and easily pushes the last register out of range — see the Modbus address notation guide.",
            "Where the manual's register table has gaps, many devices return 02 when a read spans the gap.",
            "If FC03 returns 02, check the manual's function code column — the value may be an input register (FC04).",
          ],
        },
        { h: "03: values — what the specification does and does not say" },
        { p: "The specification defines 03 as «a fault in the structure of the remainder of a complex request, such as that the implied length is incorrect», and adds that it «specifically does NOT mean that a data item submitted for storage in a register has a value outside the expectation of the application program». Whether a device rejects an out-of-range write with 03, ignores it or clamps it is in its manual." },
        { h: "04 and 06: device state" },
        { p: "04 is an internal processing error — check the device's status display and the error section of its manual. 06 (busy) means retry the same request later; it also appears when requests come too close together, so increase the delay between requests. Other exceptions return the same answer on retry, so they are not worth retrying." },
        { h: "0A and 0B: behind a gateway" },
        { p: "If a Modbus TCP ↔ RTU gateway returns 0A or 0B, the TCP link from the PC to the gateway works. 0B means the serial device behind it did not answer — check the unit ID (= serial slave ID), baud rate, parity and RS-485 wiring. 0A points to the gateway's port and routing settings." },
        { h: "Examples from device manuals" },
        {
          ul: [
            "01: the Rootech Accura 3300E supports only functions 03, 06 and 16 — any other (e.g. 04) is an «illegal function» for it.",
            "03: devices whose per-request limit is below the specification's 125 — 124 on the LS ELECTRIC GIMAC1000, 31 with FC03 on the Hanyoung Nux VX.",
            "Writes only fail: the Hanyoung Nux LC ships with communication write protection (CWP) ON and rejects writes with an exception until it is turned OFF on the front panel (manual pp. 31, 34).",
          ],
        },
        { h: "In PortDock" },
        {
          ul: [
            "«Modbus Frame Decoder» web tool: paste the received bytes to see whether it is an exception and which code (RTU and TCP).",
            "Modbus Master: the traffic log names each exception and every table counts them. Exception responses are not retried.",
            "Modbus Slave: «fault injection» returns exceptions on purpose so you can see how your master or HMI handles them.",
          ],
        },
      ],
    },
  },
  {
    // 근거: TLDP Serial-HOWTO §19(DB9·DB25 핀 배치, PC 기준 방향), Text-Terminal-HOWTO §12(«Standard Null Modem cable pin-out»: DB9-DB9 결선,
    //   흐름 제어선이 없는 케이블의 RTS-CTS·DSR-DCD-DTR 잇기), §11(XON·XOFF = DC1·DC3), Serial-HOWTO «DTE-to-DTE 는 널 모뎀(크로스) 케이블».
    //   PortDock Serial 의 신호선 표시·흐름 제어는 apps/serial/src/help.ts. 전압·거리는 rs232-rs422-rs485 글(TI SLLA067C).
    slug: "rs232-db9-null-modem",
    date: "2026-10-23",
    tools: ["serial"],
    related: ["rs232-rs422-rs485", "usb-serial-latency", "rs485-wiring"],
    webTools: ["tools/ascii/", "tools/uart-baud/", "tools/web-serial/"],
    title: { ko: "RS-232 DB9 핀 배치와 크로스(널 모뎀) 케이블 결선", en: "RS-232 DB9 pinout and null-modem (crossover) cable wiring" },
    seoTitle: { ko: "RS232 DB9 핀배치·크로스(널 모뎀) 케이블 결선도 — PortDock", en: "RS-232 DB9 Pinout & Null Modem Cable Wiring — PortDock" },
    desc: {
      ko: "PC COM 포트 DB9 의 핀 1~9 신호(TxD 3·RxD 2·GND 5), 스트레이트와 크로스(널 모뎀) 케이블의 차이, 3선 결선과 RTS·CTS·DTR 결선, 통신이 안 될 때 확인 순서.",
      en: "PC COM port DB9 pins 1–9 (TxD 3, RxD 2, GND 5), straight vs null-modem cables, 3-wire and full RTS/CTS/DTR wiring, and what to check when nothing arrives.",
    },
    body: {
      ko: [
        { p: "RS-232 장비가 응답하지 않을 때 가장 흔한 원인은 송신·수신 선이 엇갈리지 않았거나 두 번 엇갈린 것입니다. PC 의 COM 포트와 USB-RS232 변환기의 9핀(DB9) 커넥터는 핀 배치가 정해져 있으므로, 상대 장비 매뉴얼의 핀 표와 나란히 놓고 보면 어떤 케이블이 필요한지 알 수 있습니다." },
        { h: "PC(DTE) DB9 핀 배치" },
        {
          table: {
            head: ["DB9 핀", "신호", "PC 쪽에서", "DB25 핀"],
            rows: [
              ["1", "DCD (Carrier Detect)", "입력", "8"],
              ["2", "RxD (Receive Data)", "입력", "3"],
              ["3", "TxD (Transmit Data)", "출력", "2"],
              ["4", "DTR (Data Terminal Ready)", "출력", "20"],
              ["5", "SG (Signal Ground)", "—", "7"],
              ["6", "DSR (Data Set Ready)", "입력", "6"],
              ["7", "RTS (Request To Send)", "출력", "4"],
              ["8", "CTS (Clear To Send)", "입력", "5"],
              ["9", "RI (Ring Indicator)", "입력", "22"],
            ],
          },
        },
        { p: "표는 Linux 문서 프로젝트의 Serial-HOWTO 를 따릅니다. 9핀과 25핀은 2·3번 핀의 뜻이 서로 반대이고(9핀은 3번이 송신, 25핀은 2번이 송신), 접지는 9핀 5번·25핀 7번입니다. 9핀 ↔ 25핀 변환 젠더가 핀을 1:1 로 잇는 것이 아니라 신호 이름끼리 잇는 이유입니다." },
        { h: "스트레이트와 크로스(널 모뎀)" },
        {
          ul: [
            "PC 같은 단말 쪽을 DTE, 모뎀 쪽을 DCE 라고 합니다. DTE ↔ DCE 는 핀을 그대로 잇는 스트레이트 케이블을 씁니다 — DCE 는 원래 3번 핀으로 받고 2번 핀으로 보내기 때문입니다.",
            "DTE ↔ DTE(PC 와 PC, PC 와 DTE 처럼 배선된 장비)는 송신과 수신을 엇갈리는 널 모뎀(크로스) 케이블이 필요합니다.",
            "상대 장비가 어느 쪽인지는 매뉴얼의 핀 표에서 2번 핀이 «송신(TxD)» 인지 «수신(RxD)» 인지로 봅니다. 장비 기준으로 3번이 송신이면 PC 와 같은 DTE 배치라 크로스가 필요하고, 2번이 송신이면 스트레이트입니다.",
          ],
        },
        { fig: { src: "/img/guides/db9-null-modem.ko.svg", w: 780, h: 430, alt: "DB9 두 개를 잇는 널 모뎀 결선: 3번 TxD 와 2번 RxD 를 엇갈리고 5번 GND 끼리 잇는다. RTS 7 ↔ CTS 8 을 엇갈리고, DTR 4 는 상대의 DSR 6 과 DCD 1 에 잇는다", cap: "DB9 ↔ DB9 널 모뎀(크로스) 결선. 실선 세 가닥이 최소 결선이고, 점선은 흐름 제어·모뎀 제어 신호입니다." } },
        { h: "널 모뎀 결선 (DB9 ↔ DB9)" },
        {
          table: {
            head: ["이쪽 핀", "", "저쪽 핀", "용도"],
            rows: [
              ["3 TxD", "→", "2 RxD", "데이터"],
              ["2 RxD", "←", "3 TxD", "데이터"],
              ["5 GND", "—", "5 GND", "신호 접지"],
              ["7 RTS", "→", "8 CTS", "하드웨어 흐름 제어"],
              ["8 CTS", "←", "7 RTS", "하드웨어 흐름 제어"],
              ["4 DTR", "→", "6 DSR · 1 DCD", "모뎀 제어"],
              ["6 DSR · 1 DCD", "←", "4 DTR", "모뎀 제어"],
              ["9 RI", "", "연결 안 함", ""],
            ],
          },
        },
        { p: "이 결선은 Text-Terminal-HOWTO 의 «표준 널 모뎀 케이블» 입니다. 시중 케이블 중에는 다르게 배선된 것도 있으므로, 흐름 제어를 쓸 때는 케이블의 결선도를 확인합니다." },
        { h: "3선이면 충분한가" },
        { p: "장비와 PC 가 흐름 제어를 쓰지 않으면(통신 프로그램의 흐름 제어 «없음») TxD·RxD·GND 세 선만 엇갈려 이어도 됩니다. 장비가 CTS·DSR 같은 입력이 켜져 있어야 보내도록 되어 있는데 케이블에 그 선이 없다면, 같은 문서가 옛 방법으로 소개하듯 커넥터 안에서 자기 RTS 와 CTS 를, DTR 과 DSR·DCD 를 서로 이어 «스스로 허락» 하게 만들기도 합니다. 어느 쪽이 맞는지는 장비 매뉴얼의 흐름 제어 설정을 따릅니다." },
        { h: "통신이 안 될 때 확인 순서" },
        {
          ul: [
            "루프백: PC 쪽 커넥터의 2번과 3번을 이어 보낸 바이트가 그대로 돌아오는지 봅니다. 돌아오면 PC 포트·변환기·드라이버는 정상입니다.",
            "엇갈림: 케이블 끝에서 다시 루프백해 보면 케이블이 스트레이트인지 크로스인지 알 수 있습니다. 상대가 DTE 면 크로스여야 합니다.",
            "GND: 5번 접지가 빠지면 신호 기준이 없어 글자가 깨지거나 아무것도 안 옵니다.",
            "설정: 속도·데이터 비트·패리티·정지 비트가 양쪽에서 같아야 하고, 흐름 제어 설정도 같아야 합니다. 하드웨어 흐름 제어를 켰는데 CTS 선이 없으면 송신이 막힙니다.",
            "소프트웨어 흐름 제어(XON/XOFF)는 DC1(0x11)·DC3(0x13) 바이트로 멈춤·재개를 알리므로, 바이너리 데이터를 보낼 때는 쓰지 않습니다.",
            "변환기 쪽: 단자대형 RS-232 변환기는 TxD·RxD 이름이 «변환기 기준» 인지 «상대 기준» 인지 설명서를 봅니다.",
          ],
        },
        { h: "PortDock 에서는" },
        {
          ul: [
            "Serial: 상태줄에 입력 신호 CTS·DSR·RI·CD 표시등과 출력 신호 DTR·RTS 가 보여, 결선이 맞는지(상대의 DTR 이 내 DSR 로 오는지) 바로 확인할 수 있습니다. 흐름 제어는 «없음»·«하드웨어(RTS/CTS)»·«소프트웨어(XON/XOFF)» 중에서 고릅니다.",
            "웹 도구 «ASCII 코드표·제어 문자»: STX·ETX·ACK·NAK·XON·XOFF 같은 제어 바이트의 값을 찾습니다.",
            "웹 도구 «UART 보율 오차 계산기»: 장비 MCU 클럭에서 보율 오차가 큰지 봅니다.",
          ],
        },
      ],
      en: [
        { p: "When an RS-232 device does not answer, the most common cause is that transmit and receive are not crossed — or crossed twice. PC COM ports and USB-RS232 adapters use a fixed 9-pin (DB9) pinout, so putting it next to the device manual's pin table tells you which cable you need." },
        { h: "PC (DTE) DB9 pinout" },
        {
          table: {
            head: ["DB9 pin", "Signal", "At the PC", "DB25 pin"],
            rows: [
              ["1", "DCD (Carrier Detect)", "in", "8"],
              ["2", "RxD (Receive Data)", "in", "3"],
              ["3", "TxD (Transmit Data)", "out", "2"],
              ["4", "DTR (Data Terminal Ready)", "out", "20"],
              ["5", "SG (Signal Ground)", "—", "7"],
              ["6", "DSR (Data Set Ready)", "in", "6"],
              ["7", "RTS (Request To Send)", "out", "4"],
              ["8", "CTS (Clear To Send)", "in", "5"],
              ["9", "RI (Ring Indicator)", "in", "22"],
            ],
          },
        },
        { p: "The table follows the Linux Documentation Project's Serial-HOWTO. Pins 2 and 3 have opposite meanings on 9-pin and 25-pin connectors (TxD is pin 3 on DB9 and pin 2 on DB25), and ground is pin 5 on DB9 and pin 7 on DB25 — which is why a DB9-to-DB25 adapter connects signal to signal, not pin 1 to pin 1." },
        { h: "Straight-through vs null modem" },
        {
          ul: [
            "Terminal equipment such as a PC is DTE; a modem is DCE. DTE ↔ DCE uses a straight-through cable, because a DCE receives on pin 3 and transmits on pin 2.",
            "DTE ↔ DTE (PC to PC, or PC to a device wired like a PC) needs a null-modem (crossover) cable that crosses transmit and receive.",
            "To tell which side a device is, check whether pin 2 is «TxD» or «RxD» in its manual. If the device transmits on pin 3 it is wired like a PC (DTE) and needs a crossover; if it transmits on pin 2, use straight-through.",
          ],
        },
        { fig: { src: "/img/guides/db9-null-modem.en.svg", w: 780, h: 430, alt: "Null-modem wiring between two DB9s: pin 3 TxD crossed to pin 2 RxD, pin 5 GND to GND, RTS 7 crossed to CTS 8, DTR 4 to the other side's DSR 6 and DCD 1", cap: "DB9 ↔ DB9 null-modem (crossover) wiring. The three solid wires are the minimum; dashed lines are flow control and modem control." } },
        { h: "Null-modem wiring (DB9 ↔ DB9)" },
        {
          table: {
            head: ["This end", "", "Other end", "Purpose"],
            rows: [
              ["3 TxD", "→", "2 RxD", "data"],
              ["2 RxD", "←", "3 TxD", "data"],
              ["5 GND", "—", "5 GND", "signal ground"],
              ["7 RTS", "→", "8 CTS", "hardware flow control"],
              ["8 CTS", "←", "7 RTS", "hardware flow control"],
              ["4 DTR", "→", "6 DSR · 1 DCD", "modem control"],
              ["6 DSR · 1 DCD", "←", "4 DTR", "modem control"],
              ["9 RI", "", "not connected", ""],
            ],
          },
        },
        { p: "This is the «standard null modem cable» from the Text-Terminal-HOWTO. Some cables on the market are wired differently, so check the cable's diagram when you use flow control." },
        { h: "Are three wires enough?" },
        { p: "If neither side uses flow control (flow control «none» in the terminal program), crossing TxD and RxD and joining GND is enough. If a device only transmits when an input such as CTS or DSR is on and the cable lacks that wire, the same document describes the old trick of looping RTS to CTS and DTR to DSR and DCD inside each connector so each side «permits itself». Follow the device manual's flow control setting to decide." },
        { h: "When nothing arrives" },
        {
          ul: [
            "Loopback: join pins 2 and 3 on the PC-side connector and check that sent bytes come straight back. If they do, the PC port, adapter and driver work.",
            "Crossing: loop back at the far end of the cable to learn whether it is straight or crossed. A DTE device needs a crossover.",
            "GND: without pin 5 ground the signals have no reference — garbled characters or nothing at all.",
            "Settings: baud, data bits, parity and stop bits must match on both sides, and so must flow control. Hardware flow control with no CTS wire blocks transmission.",
            "Software flow control (XON/XOFF) uses DC1 (0x11) and DC3 (0x13) bytes to pause and resume, so do not use it for binary data.",
            "Adapters: on terminal-block RS-232 adapters, check whether TxD and RxD are labelled from the adapter's or the other device's point of view.",
          ],
        },
        { h: "In PortDock" },
        {
          ul: [
            "Serial: the status bar shows input lamps CTS, DSR, RI and CD and outputs DTR and RTS, so you can see whether the wiring works (does the other side's DTR reach your DSR?). Flow control is «none», «hardware (RTS/CTS)» or «software (XON/XOFF)».",
            "«ASCII Table & Control Characters» web tool: look up control bytes such as STX, ETX, ACK, NAK, XON and XOFF.",
            "«UART Baud Rate Error Calculator» web tool: check whether the device MCU's clock gives a large baud error.",
          ],
        },
      ],
    },
  },
  {
    // 근거: TDK «NTC thermistors — General technical information»(2018-01) §3.1(식 1·B 값 정의·B25/100·적용 범위 한계), §3.2.3(발산 계수),
    //   Steinhart & Hart(1968), ATmega328P 데이터시트 §23.7. 표 값은 lib/ntc.ts 로 계산(10 kΩ, B 3950 K, 3.3 V, 고정 10 kΩ, 12비트).
    slug: "ntc-thermistor-temperature",
    date: "2026-10-23",
    tools: ["plot", "serial"],
    related: ["pt100-thermocouple-wiring", "4-20ma-loop", "rs232-db9-null-modem"],
    webTools: ["tools/ntc/", "tools/temperature/"],
    title: { ko: "NTC 서미스터 온도 계산 — B 값·Steinhart–Hart·분압 회로와 ADC", en: "NTC thermistor temperature — B value, Steinhart–Hart, divider and ADC" },
    seoTitle: { ko: "NTC 서미스터 온도 계산 — B값·Steinhart–Hart·ADC — PortDock", en: "NTC Thermistor Temperature: Beta, Steinhart–Hart, ADC — PortDock" },
    desc: {
      ko: "10k B3950 같은 NTC 서미스터의 저항 ↔ 온도 계산법(B 정수 식·Steinhart–Hart), B25/50·B25/100 차이, 분압 회로의 고정 저항 고르기와 ADC 값, 자기 발열까지.",
      en: "Turn NTC thermistor resistance into temperature (B equation, Steinhart–Hart), B25/50 vs B25/100, the divider resistor, ADC counts and self-heating.",
    },
    body: {
      ko: [
        { p: "NTC 서미스터는 온도가 오르면 저항이 내려가는 소자입니다. 값이 싸고 변화가 커서 MCU 보드·전원 장치·가전의 온도 측정에 흔히 쓰입니다. 데이터시트에는 보통 «25 °C 에서 10 kΩ, B25/85 = 3950 K» 처럼 두 숫자와 R/T 표가 있습니다. 이 두 숫자로 온도를 계산하는 법과 회로에서 주의할 점을 정리합니다." },
        { h: "B 정수 식" },
        { code: "R(T) = R25 × exp(B × (1/T − 1/T25))\nT = 1 ÷ (1/T25 + ln(R/R25) ÷ B)        ← T 는 켈빈(°C + 273.15), T25 = 298.15 K" },
        {
          table: {
            head: ["온도", "저항 (10 kΩ, B 3950 K)", "분압 전압 (3.3 V, 고정 10 kΩ 위)", "12비트 ADC"],
            rows: [
              ["−20 °C", "105.4 kΩ", "3.014 V", "3741"],
              ["0 °C", "33.62 kΩ", "2.543 V", "3156"],
              ["25 °C", "10.00 kΩ", "1.650 V", "2048"],
              ["50 °C", "3.588 kΩ", "0.871 V", "1081"],
              ["80 °C", "1.270 kΩ", "0.372 V", "461"],
              ["100 °C", "698 Ω", "0.215 V", "267"],
            ],
          },
        },
        { p: "TDK 의 NTC 기술 자료는 이 지수 식이 «정격 온도 근처의 좁은 범위에서만 충분히 정확하다» 고 적습니다. 실제 서미스터의 B 는 온도에 따라 조금씩 달라서, 데이터시트는 B 값을 어느 두 온도로 정했는지 B25/50·B25/85·B25/100 처럼 붙여 적습니다." },
        { h: "B25/85 와 B25/100 은 왜 다른가" },
        { p: "B 값은 두 온도의 저항으로 정의합니다: B = ln(R1/R2) ÷ (1/T1 − 1/T2). 같은 서미스터라도 25 °C 와 85 °C 로 잰 값과 25 °C 와 100 °C 로 잰 값이 다릅니다. 차이가 작아 보여도 범위 끝에서는 오차가 납니다 — 예를 들어 B 3950 으로 만든 100 °C 의 저항을 B 3980 으로 풀면 99.3 °C 가 나옵니다. 쓰는 범위에 가까운 B 를 고르고, 넓은 범위면 다음의 Steinhart–Hart 를 씁니다." },
        { h: "Steinhart–Hart 식: 세 점으로 넓은 범위" },
        { code: "1/T = A + B·ln R + C·(ln R)³" },
        { p: "Steinhart 와 Hart 가 1968년 발표한 식입니다. 데이터시트 R/T 표에서 쓰려는 범위의 낮은 온도·가운데·높은 온도 세 점을 골라 A·B·C 를 구하면, 세 점에서는 표와 정확히 맞고 그 사이도 B 식보다 표를 잘 따라갑니다. 계수 구하기는 연립 방정식이라 계산기를 쓰는 편이 편합니다. 가장 정확한 것은 결국 제조사의 R/T 표이므로, 정밀도가 중요하면 표를 그대로 넣고 사이를 보간하는 방법도 있습니다." },
        { h: "분압 회로와 고정 저항" },
        {
          ul: [
            "NTC 를 고정 저항과 직렬로 이어 가운데 전압을 ADC 로 읽습니다. NTC 가 아래(GND 쪽)면 V = 전원 × R_NTC ÷ (R_고정 + R_NTC) 로, 온도가 오르면 전압이 내려갑니다.",
            "고정 저항을 측정 범위 가운데 온도의 NTC 저항과 같게 고르면 그 근처에서 전압 변화가 가장 큽니다. 10 kΩ NTC 를 25 °C 근처에서 쓰면 10 kΩ, 80 °C 근처를 정밀하게 보려면 1~2 kΩ 대가 맞습니다.",
            "분압 전원과 ADC 기준 전압을 같은 전원에서 쓰면(비율 측정) 전원 전압이 흔들려도 ADC 값이 그대로입니다.",
          ],
        },
        { h: "ADC 값 → 온도" },
        { p: "ATmega328P 데이터시트는 10비트 ADC 값을 ADC = V_IN × 1024 ÷ V_REF 로 적습니다. n비트면 2^n 을 곱합니다. 거꾸로 풀면 V = ADC ÷ 2^n × V_REF, NTC(아래) 저항 = R_고정 × V ÷ (전원 − V), 그다음 B 식이나 Steinhart–Hart 로 온도입니다. 위 표의 조건(3.3 V, 10 kΩ, 12비트)에서 25 °C 근처는 1 °C 에 약 37 mV, 1 LSB(0.81 mV)는 약 0.02 °C 에 해당합니다 — 양 끝 온도로 갈수록 이 값이 커집니다." },
        { h: "자기 발열" },
        { p: "측정 전류가 NTC 를 데워 실제보다 높게 읽게 만듭니다. 데이터시트의 발산 계수 δth(mW/K)는 서미스터 온도를 1 K 올리는 전력이므로, 자기 발열 ΔT = P ÷ δth 입니다. 3.3 V·10 kΩ 분압에서 25 °C 면 NTC 에 걸리는 전력은 약 0.27 mW 이고, δth 1.5 mW/K 라면 약 0.18 K 입니다. 정밀도가 중요하면 분압 전원을 낮추거나 측정할 때만 전원을 켭니다. δth 는 공기 중·액체 속처럼 놓인 환경에 따라 다르므로 데이터시트의 조건을 확인합니다." },
        { h: "Pt100 과 무엇이 다른가" },
        {
          ul: [
            "NTC 는 변화가 크고 싸지만 곡선이 제품마다 다르고(같은 10 kΩ 라도 B 가 다르면 다른 온도), 넓은 범위에서 비선형이 큽니다.",
            "Pt100 은 저항-온도 관계가 IEC 60751 로 정해져 있어 제품끼리 바꿔 끼울 수 있고, 산업용 온도 조절기·변환기 입력이 대개 이쪽입니다. 결선(2·3·4선식)은 Pt100·열전대 결선 글을 보세요.",
          ],
        },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «NTC 서미스터 계산기»: B 식·Steinhart–Hart 로 저항 ↔ 온도, 분압 전압·ADC 값, 온도표, 자기 발열을 계산합니다.",
            "Plot: MCU 가 «temp:25.3» 처럼 보내는 값을 실시간 그래프로 보고 CSV 로 저장합니다.",
            "Serial: ADC 원시 값을 보내는 보드라면 HEX·ASCII 로 받아 보고, 계산기로 온도를 확인합니다.",
          ],
        },
      ],
      en: [
        { p: "An NTC thermistor's resistance falls as temperature rises. Cheap and sensitive, it is common on MCU boards, power supplies and appliances. Datasheets usually give two numbers such as «10 kΩ at 25 °C, B25/85 = 3950 K» plus an R/T table. Here is how to turn them into temperature and what to watch in the circuit." },
        { h: "The B equation" },
        { code: "R(T) = R25 × exp(B × (1/T − 1/T25))\nT = 1 ÷ (1/T25 + ln(R/R25) ÷ B)        ← T in kelvin (°C + 273.15), T25 = 298.15 K" },
        {
          table: {
            head: ["Temperature", "Resistance (10 kΩ, B 3950 K)", "Divider (3.3 V, 10 kΩ on top)", "12-bit ADC"],
            rows: [
              ["−20 °C", "105.4 kΩ", "3.014 V", "3741"],
              ["0 °C", "33.62 kΩ", "2.543 V", "3156"],
              ["25 °C", "10.00 kΩ", "1.650 V", "2048"],
              ["50 °C", "3.588 kΩ", "0.871 V", "1081"],
              ["80 °C", "1.270 kΩ", "0.372 V", "461"],
              ["100 °C", "698 Ω", "0.215 V", "267"],
            ],
          },
        },
        { p: "TDK's NTC technical information says this exponential law is accurate enough «only for a restricted range around the rated temperature». A real thermistor's B drifts with temperature, so datasheets state which two temperatures define it: B25/50, B25/85, B25/100." },
        { h: "Why B25/85 and B25/100 differ" },
        { p: "B is defined from the resistance at two temperatures: B = ln(R1/R2) ÷ (1/T1 − 1/T2). The same part gives a different value for 25/85 °C than for 25/100 °C. The difference looks small but shows at the ends — the 100 °C resistance from B 3950, solved with B 3980, reads 99.3 °C. Use the B closest to your range, or Steinhart–Hart for wide ranges." },
        { h: "Steinhart–Hart: three points for a wide range" },
        { code: "1/T = A + B·ln R + C·(ln R)³" },
        { p: "Steinhart and Hart published this equation in 1968. Pick three points from the datasheet R/T table — low, middle and high in your range — and solve for A, B and C. It then matches the table exactly at those points and follows it more closely than the B equation in between. Solving is a small linear system, so a calculator helps. The manufacturer's R/T table is still the most accurate; when precision matters, store the table and interpolate." },
        { h: "Divider and fixed resistor" },
        {
          ul: [
            "Put the NTC in series with a fixed resistor and read the midpoint with the ADC. With the NTC at the bottom (to GND), V = supply × R_NTC ÷ (R_fixed + R_NTC), falling as temperature rises.",
            "A fixed resistor equal to the NTC's resistance at the middle of your range gives the largest voltage change there: 10 kΩ for a 10 kΩ NTC around 25 °C, around 1–2 kΩ to resolve 80 °C well.",
            "Feeding the divider and the ADC reference from the same supply (ratiometric) cancels supply variations from the ADC count.",
          ],
        },
        { h: "ADC count → temperature" },
        { p: "The ATmega328P datasheet gives the 10-bit result as ADC = V_IN × 1024 ÷ V_REF; for n bits use 2^n. Backwards: V = ADC ÷ 2^n × V_REF, NTC (bottom) resistance = R_fixed × V ÷ (supply − V), then the B equation or Steinhart–Hart. With the table's setup (3.3 V, 10 kΩ, 12 bits) the signal near 25 °C is about 37 mV per °C, so one LSB (0.81 mV) is about 0.02 °C — it grows towards the ends of the range." },
        { h: "Self-heating" },
        { p: "Measuring current warms the NTC so it reads high. The datasheet's dissipation factor δth (mW/K) is the power that raises the thermistor by 1 K, so self-heating ΔT = P ÷ δth. In a 3.3 V, 10 kΩ divider at 25 °C the NTC dissipates about 0.27 mW; with δth = 1.5 mW/K that is about 0.18 K. For precision, lower the divider supply or power it only while measuring. δth depends on the surroundings (still air, liquid…), so check the datasheet conditions." },
        { h: "How it differs from Pt100" },
        {
          ul: [
            "An NTC is sensitive and cheap, but curves vary between products (two 10 kΩ parts with different B read different temperatures) and it is strongly non-linear over wide ranges.",
            "Pt100's resistance–temperature relation is fixed by IEC 60751, so sensors are interchangeable; industrial controllers and transmitters usually take Pt100. For 2-, 3- and 4-wire connections see the Pt100 and thermocouple wiring guide.",
          ],
        },
        { h: "In PortDock" },
        {
          ul: [
            "«NTC Thermistor Calculator» web tool: resistance ↔ temperature by B equation or Steinhart–Hart, divider voltage, ADC counts, a table and self-heating.",
            "Plot: graph values an MCU sends as «temp:25.3» live and save them as CSV.",
            "Serial: if a board sends raw ADC counts, receive them in HEX or ASCII and check the temperature with the calculator.",
          ],
        },
      ],
    },
  },
  // 아날로그 입력 스케일링 — Microchip AN693(DS00693A: LSb = VREF/2^N, ±½ LSb, 이득 오차는 디지털로 보정 쉬움), ATmega328P §23.6.1·§23.7,
  // 수치는 lib/adc 로 계산(4–20 mA·150 Ω·3.3 V·12비트·0–10 bar). PLC 카운트는 4-20ma-loop 글과 같은 출처(S7-1500 표 3-4, MELSEC iQ-R).
  // Plot 은 채널 배율·오프셋이 없음(apps/plot/src/help.ts «범위 밖»), Modbus Master 화면 값은 원시 값(apps/modbus-master/src/help.ts),
  // MT4W 측정값·소수점 위치는 data/devices/autonics/mt4w.json.
  {
    slug: "analog-input-scaling",
    date: "2026-10-23",
    tools: ["plot", "modbus-master"],
    related: ["4-20ma-loop", "ntc-thermistor-temperature", "pressure-units"],
    webTools: ["tools/adc/", "tools/4-20ma/", "tools/voltage-divider/", "tools/rc-filter/"],
    deviceKinds: ["panel-meter"],
    title: { ko: "아날로그 입력 스케일링 — ADC 원시값을 bar·°C 같은 공학값으로", en: "Analog input scaling — turning raw ADC counts into bar, °C and other units" },
    seoTitle: { ko: "아날로그 입력 스케일링 — ADC 값 → 공학값 환산 — PortDock", en: "Analog Input Scaling: ADC Counts to Engineering Units — PortDock" },
    desc: {
      ko: "4–20mA·0–10V 센서 신호를 션트 저항·분압으로 ADC 에 넣고, 원시 코드를 직선 비례로 공학값으로 바꾸는 법. 1카운트의 크기, 상한 잘림, 단선 판정, PLC 카운트까지.",
      en: "Feed 4–20 mA or 0–10 V signals into an ADC through a shunt or divider and scale raw counts linearly to engineering units: count size, clipping, open loop.",
    },
    body: {
      ko: [
        { p: "압력 전송기·온도 변환기 같은 센서는 값을 4–20 mA 나 0–10 V 로 내보냅니다. 이것을 MCU 의 ADC, PLC 아날로그 입력 모듈, 패널 미터가 숫자로 바꾸고, 그 숫자를 다시 bar·°C 로 되돌리는 것이 «스케일링» 입니다. 단계는 늘 같습니다: 신호 → ADC 입력 전압 → ADC 코드 → 공학값. 각 단계가 일차식이라 양 끝 두 점만 알면 됩니다." },
        { fig: { src: "/img/guides/adc-scaling.ko.svg", w: 780, h: 250, alt: "4–20 mA 가 150 Ω 션트에서 0.6–3.0 V 가 되고, 12비트 3.3 V ADC 에서 1 LSB 0.806 mV 로 나눠 코드 745–3724, 직선 비례로 0–10 bar 가 되는 흐름", cap: "4–20 mA 압력 전송기(0–10 bar)를 150 Ω 션트와 12비트 3.3 V ADC 로 읽는 예. 쓰는 코드는 4096 단계가 아니라 약 2979 개입니다." } },
        { h: "1. 신호를 ADC 입력 전압으로" },
        { p: "전류 신호는 션트 저항 하나로 전압이 됩니다(V = I × R). 0–10 V 같은 전압 신호는 ADC 기준 전압보다 크면 분압으로 줄입니다. 어느 쪽이든 상한 신호의 전압이 기준 전압보다 조금 낮게 고르는 것이 요점입니다." },
        {
          table: {
            head: ["션트 저항", "4 mA", "20 mA", "기준 전압", "결과"],
            rows: [
              ["150 Ω", "0.6 V", "3.0 V", "3.3 V", "위로 약 9 % 여유 — 코드 끝(4095)은 약 22 mA"],
              ["165 Ω", "0.66 V", "3.3 V", "3.3 V", "20 mA 가 정확히 풀스케일 — 그 위는 잘림"],
              ["250 Ω", "1 V", "5 V", "5 V", "20 mA 가 정확히 풀스케일 — 그 위는 잘림"],
            ],
            plain: true,
          },
        },
        { p: "상한에 여유가 없으면 20 mA 를 조금만 넘는 값도 코드 끝에 붙어, «딱 상한» 과 «상한 초과» 를 구별할 수 없습니다. 0–10 V 를 3.3 V ADC 로 받을 때는 분압비 0.3(10 V → 3.0 V)처럼 같은 여유를 둡니다. 분압 저항의 표준 값은 분압 저항 계산기로 고릅니다." },
        { h: "2. 전압을 코드로" },
        { code: "1 LSB = V_REF ÷ 2^N                     (Microchip AN693)\n코드  = ⌊V_IN × 2^N ÷ V_REF⌋, 최댓값 2^N − 1   (ATmega328P §23.7 을 N비트로)\n\n12비트, 3.3 V → 1 LSB = 0.806 mV\n0.6 V → 744.7,  3.0 V → 3723.6      ← 쓰는 코드 약 2979 개" },
        { p: "12비트라고 4096 단계를 모두 쓰지는 않습니다. 4 mA 아래(0~0.6 V)와 20 mA 위(3.0~3.3 V)를 빼면 약 2979 개이고, 0–10 bar 라면 1카운트는 약 0.0034 bar 입니다. 이것이 이 회로의 실제 분해능입니다. Microchip AN693 은 이상적인 변환기도 양자화 오차가 최대 ±½ LSB 이고, 실제 변환기는 오프셋·이득 오차와 비직선성(DNL·INL)이 더해진다고 설명합니다 — 1 LSB 는 «구별할 수 있는 단계» 이지 정확도가 아닙니다." },
        { h: "3. 코드를 공학값으로 — 두 점 직선" },
        { code: "공학값 = 하한 + (코드 − 코드_하한) ÷ (코드_상한 − 코드_하한) × (상한 − 하한)\n\n코드 2234 → 0 + (2234 − 744.7) ÷ (3723.6 − 744.7) × 10 = 5.00 bar   (12 mA)" },
        {
          table: {
            head: ["코드", "신호", "공학값 (0–10 bar)"],
            rows: [
              ["0", "0 mA", "−2.50 bar (단선·전원 없음)"],
              ["745", "4.00 mA", "0.00 bar"],
              ["1489", "8.00 mA", "2.50 bar"],
              ["2234", "12.00 mA", "5.00 bar"],
              ["2979", "16.00 mA", "7.50 bar"],
              ["3724", "20.00 mA", "10.00 bar"],
              ["4095", "22.0 mA", "11.25 bar (코드 끝)"],
            ],
          },
        },
        {
          ul: [
            "코드_하한·상한은 소수 그대로 둡니다(744.7, 3723.6). 반올림하면 끝 값이 조금씩 어긋납니다.",
            "정수만 쓰는 MCU 에서는 0.01 bar 단위 정수로 계산하는 식으로 곱셈을 먼저, 나눗셈을 나중에 합니다. 정수 나눗셈은 소수를 버리므로 나눗셈을 먼저 하면 0 이 되기 쉽습니다.",
            "션트·기준 전압의 오차와 ADC 의 오프셋·이득 오차는 위 식의 «코드_하한·상한» 을 두 점에서 정한 값으로 바꾸면 함께 보정됩니다. AN693 도 이득 오차는 디지털로 쉽게 보정된다고 적습니다.",
          ],
        },
        { h: "4. 범위 밖과 단선" },
        { p: "4–20 mA 는 0 이 아니라 4 mA 에서 시작하므로, 하한보다 한참 낮은 값(위 표의 코드 0 근처)은 «0 bar» 가 아니라 단선이나 전송기 전원 문제입니다. 상한 위 값도 «측정 범위 밖» 으로 따로 보여 주는 편이 좋습니다. 어디부터를 고장으로 볼지(NAMUR NE 43 경계 등)는 4–20mA 환산 계산기에 정리돼 있습니다." },
        { h: "5. 노이즈와 입력 필터" },
        { p: "ATmega328P 데이터시트(§23.6.1)는 ADC 가 출력 임피던스 약 10 kΩ 이하의 신호에 맞춰져 있고, 나이퀴스트 주파수(f_ADC/2)보다 높은 성분은 입력 전에 저역 필터로 없애라고 권합니다. 션트 전압에 RC 필터를 두면 τ = R × C 만큼 응답이 늦어지므로, 필요한 응답 속도와 함께 RC 시정수 계산기로 고릅니다. 소프트웨어에서 여러 번 읽어 평균하는 방법도 흔합니다." },
        { h: "장비가 이미 바꿔서 주는 값" },
        {
          ul: [
            "PLC 아날로그 입력 모듈은 비트·기준 전압 대신 정해진 범위의 정수를 냅니다 — SIMATIC S7-1500 은 하한~상한을 0~27648, MELSEC iQ-R 은 0~32000(각 제조사 매뉴얼). 이때도 3단계의 두 점 직선을 그 범위로 씁니다.",
            "Modbus 장비는 소수점 없는 정수를 주고 배율이나 소수점 위치를 따로 정하는 경우가 많습니다. 예를 들어 오토닉스 MT4W 패널 미터의 측정값은 정수로 오고, 소수점 위치는 다른 입력 레지스터에 있습니다(PortDock 장비 맵).",
            "PortDock Modbus Master 화면의 값은 원시 값입니다. 장비 프로필을 고르면 칸 이름에 «(×0.01 Hz)» 처럼 배율이 붙으므로 그만큼 곱해 읽습니다.",
          ],
        },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «ADC 분해능·스케일링 계산기»: 비트·기준 전압·션트(또는 분압비)·공학값 범위를 넣으면 1카운트의 값, 코드 ↔ 공학값, 상한 잘림을 보여 줍니다.",
            "웹 도구 «4–20mA 환산 계산기»: PLC 카운트(0–27648 등)와 NE 43 경계. «분압 저항 계산기» 와 «RC 시정수 계산기» 는 입력 회로 값 고르기에.",
            "Plot: 채널마다 배율을 거는 기능은 없으므로, MCU 가 환산한 값을 «press:5.00» 처럼 보내면 바로 bar 로 그려집니다. 원시 코드를 보내면 코드 그대로 그려지니 계산기로 대조합니다.",
            "Modbus Master: 장비 프로필로 패널 미터·온도 지시계 칸을 채우고, 원시 값에 배율·소수점을 적용해 읽습니다.",
          ],
        },
      ],
      en: [
        { p: "Pressure transmitters, temperature converters and similar sensors output their value as 4–20 mA or 0–10 V. An MCU ADC, a PLC analog input module or a panel meter turns that into a number, and «scaling» turns the number back into bar or °C. The steps are always the same: signal → ADC input voltage → ADC code → engineering value. Every step is linear, so two end points are all you need." },
        { fig: { src: "/img/guides/adc-scaling.en.svg", w: 780, h: 250, alt: "4–20 mA becomes 0.6–3.0 V across a 150 Ω shunt, divided by the 0.806 mV LSB of a 12-bit 3.3 V ADC gives codes 745–3724, then linear scaling to 0–10 bar", cap: "Reading a 4–20 mA, 0–10 bar pressure transmitter with a 150 Ω shunt and a 12-bit 3.3 V ADC. About 2979 codes are in use, not 4096." } },
        { h: "1. Signal to ADC input voltage" },
        { p: "A current signal becomes a voltage across one shunt resistor (V = I × R). A voltage signal such as 0–10 V is reduced with a divider when it exceeds the ADC reference. Either way, the point is to put the top of the signal a little below the reference." },
        {
          table: {
            head: ["Shunt", "4 mA", "20 mA", "Reference", "Result"],
            rows: [
              ["150 Ω", "0.6 V", "3.0 V", "3.3 V", "About 9 % headroom — the top code (4095) is about 22 mA"],
              ["165 Ω", "0.66 V", "3.3 V", "3.3 V", "20 mA is exactly full scale — anything above clips"],
              ["250 Ω", "1 V", "5 V", "5 V", "20 mA is exactly full scale — anything above clips"],
            ],
            plain: true,
          },
        },
        { p: "Without headroom, a reading just above 20 mA sticks at the top code and you cannot tell «exactly full» from «over range». For 0–10 V into a 3.3 V ADC, leave the same room with a ratio of 0.3 (10 V → 3.0 V). Pick standard divider resistors with the voltage divider calculator." },
        { h: "2. Voltage to code" },
        { code: "1 LSB = V_REF ÷ 2^N                     (Microchip AN693)\ncode  = ⌊V_IN × 2^N ÷ V_REF⌋, max 2^N − 1     (ATmega328P §23.7, N bits)\n\n12 bits, 3.3 V → 1 LSB = 0.806 mV\n0.6 V → 744.7,  3.0 V → 3723.6      ← about 2979 codes in use" },
        { p: "A 12-bit ADC does not use all 4096 steps here. Without the range below 4 mA (0–0.6 V) and above 20 mA (3.0–3.3 V) about 2979 codes remain, so for 0–10 bar one count is about 0.0034 bar — the real resolution of this circuit. Microchip's AN693 notes that even an ideal converter has up to ±½ LSB of quantization error, and real converters add offset and gain errors and non-linearity (DNL, INL): 1 LSB is the step you can resolve, not the accuracy." },
        { h: "3. Code to engineering value — a two-point line" },
        { code: "value = low + (code − code_low) ÷ (code_high − code_low) × (high − low)\n\ncode 2234 → 0 + (2234 − 744.7) ÷ (3723.6 − 744.7) × 10 = 5.00 bar   (12 mA)" },
        {
          table: {
            head: ["Code", "Signal", "Value (0–10 bar)"],
            rows: [
              ["0", "0 mA", "−2.50 bar (open loop or no power)"],
              ["745", "4.00 mA", "0.00 bar"],
              ["1489", "8.00 mA", "2.50 bar"],
              ["2234", "12.00 mA", "5.00 bar"],
              ["2979", "16.00 mA", "7.50 bar"],
              ["3724", "20.00 mA", "10.00 bar"],
              ["4095", "22.0 mA", "11.25 bar (top code)"],
            ],
          },
        },
        {
          ul: [
            "Keep code_low and code_high as decimals (744.7, 3723.6); rounding them shifts the end values slightly.",
            "On an integer-only MCU, compute in integer units such as 0.01 bar and multiply before dividing. Integer division drops the fraction, so dividing first tends to give 0.",
            "Shunt and reference tolerances and the ADC's offset and gain errors are all corrected when code_low and code_high come from two known points. AN693 also notes that gain error is easily compensated digitally.",
          ],
        },
        { h: "4. Out of range and open loop" },
        { p: "4–20 mA starts at 4 mA, not 0, so a reading far below the low end (near code 0 above) is not «0 bar» but an open loop or a transmitter supply problem. Showing values above the top as «out of range» separately is also good practice. Where faults begin (NAMUR NE 43 limits and so on) is summarized in the 4–20 mA scaling calculator." },
        { h: "5. Noise and the input filter" },
        { p: "The ATmega328P datasheet (§23.6.1) says its ADC is optimized for sources of about 10 kΩ output impedance or less, and advises removing components above the Nyquist frequency (f_ADC/2) with a low-pass filter. An RC filter on the shunt voltage delays the response by τ = R × C, so choose it with the RC time constant calculator against the response you need. Averaging several readings in software is also common." },
        { h: "Values the device has already scaled" },
        {
          ul: [
            "PLC analog input modules output a fixed integer range instead of bits and reference: SIMATIC S7-1500 maps low–high to 0–27648 and MELSEC iQ-R to 0–32000 (per the makers' manuals). Use the same two-point line with that range.",
            "Modbus devices often send integers without a decimal point and define the scale or decimal position separately. The Autonics MT4W panel meter, for example, sends its reading as an integer with the decimal position in another input register (PortDock device map).",
            "PortDock Modbus Master shows raw values. Picking a device profile puts the scale in the register name, such as «(×0.01 Hz)», so multiply by it when reading.",
          ],
        },
        { h: "In PortDock" },
        {
          ul: [
            "«ADC Resolution & Scaling Calculator» web tool: enter bits, reference, shunt (or divider ratio) and engineering range to see the value per count, code ↔ value and clipping.",
            "«4–20 mA Scaling Calculator» for PLC counts (0–27648…) and NE 43 limits; the voltage divider and RC time constant calculators for choosing input parts.",
            "Plot has no per-channel scale, so have the MCU send the scaled value as «press:5.00» and it plots in bar directly. If it sends raw codes, they are plotted as codes — check them with the calculator.",
            "Modbus Master: fill panel meter and temperature indicator registers from a device profile and apply the scale or decimal position to the raw values.",
          ],
        },
      ],
    },
  },
  // 역률과 콘덴서 기초 — ABB Motor guide(2019) §4.10(역률 정의, 0.7~0.9, 부분 부하 표 4.8, 보상 주의, 표 4.7·C 식), ABB TG7 식 3.15.
  // 수치는 lib/power 로 계산. GIMAC1000 역률 f32·음수 = 진상, Accura 2300 총 역률 f32 는 data/devices 의 장비 맵.
  // 전력 회사 역률 요금 기준(국내 약관)은 원문 확인 전이라 수치를 싣지 않는다.
  {
    slug: "power-factor-capacitor",
    date: "2026-10-23",
    tools: ["modbus-master"],
    related: ["motor-current-breaker-cable", "vfd-frequency-rpm", "modbus-float-word-order"],
    webTools: ["tools/pf-capacitor/", "tools/three-phase-power/", "tools/motor-current/"],
    deviceKinds: ["power-meter"],
    title: { ko: "역률과 역률 개선 콘덴서 기초 — kW·kVA·kvar 와 콘덴서 용량", en: "Power factor and correction capacitors — kW, kVA, kvar and capacitor sizing" },
    seoTitle: { ko: "역률과 역률 개선 콘덴서 — kW·kVA·kvar·용량 계산 — PortDock", en: "Power Factor & Correction Capacitors: kW, kVA, kvar — PortDock" },
    desc: {
      ko: "역률이 무엇이고 낮으면 왜 전류가 커지는지, 콘덴서 용량(kvar) = kW × (tan φ1 − tan φ2) 계산과 µF 환산, 모터에 직접 달 때 주의, 전력 미터에서 역률 읽기까지.",
      en: "What power factor is and why a low one raises current, sizing capacitors as kvar = kW × (tan φ1 − tan φ2) and in µF, cautions at motors, and reading meters.",
    },
    body: {
      ko: [
        { p: "전력 미터나 설비 자료에서 «역률 0.85» 같은 숫자를 봅니다. 역률은 같은 일을 하는 데 전류가 얼마나 더 흐르는지를 나타냅니다. 역률이 무엇인지, 콘덴서로 어떻게 올리는지, 용량은 어떻게 계산하는지를 정리합니다." },
        { h: "kW·kvar·kVA 와 역률" },
        {
          ul: [
            "유효 전력 P(kW): 열·회전처럼 실제 일로 바뀌는 전력.",
            "무효 전력 Q(kvar): 모터를 자화하는 데 쓰이며 오가기만 하고 일로 바뀌지 않는 전력.",
            "피상 전력 S(kVA): 둘을 합한 크기, 3상이면 √3 × 선간 전압 × 전류. S = √(P² + Q²).",
            "역률 cos φ = P ÷ S. ABB Motor guide 는 유효 전력(kW)과 피상 전력(kVA)의 비를 역률이라 부르고, P 와 Q 가 함께 S 를 이룬다고 설명합니다.",
          ],
        },
        { p: "전선·차단기·변압기는 전류로 정해지므로 같은 kW 라도 역률이 낮으면 더 큰 설비가 필요합니다. 100 kW 를 3상 400 V 에서 쓰면 역률 1 에서 144 A, 0.8 에서 180 A, 0.75 에서 192 A 입니다." },
        { h: "모터의 역률" },
        { p: "ABB Motor guide(§4.10)에 따르면 모터의 역률은 보통 0.7~0.9 이고, 작은 모터일수록 낮고 큰 모터일수록 높습니다. 부하가 줄면 역률도 떨어집니다 — 같은 문서의 표에서 정격 역률 0.85 인 모터는 3/4 부하에서 0.81, 1/2 부하에서 0.72, 1/4 부하에서 0.54 입니다. 그래서 모터가 많은 설비는 전체 역률이 낮아지고, ABB 는 전력 회사가 설비의 역률을 높이라고 요구하기도 한다고 적습니다." },
        { h: "콘덴서로 역률 올리기" },
        { fig: { src: "/img/guides/power-triangle.ko.svg", w: 780, h: 330, alt: "유효 전력 100 kW 를 밑변으로 한 전력 삼각형: 개선 전 무효 전력 88.2 kvar·피상 전력 133.3 kVA, 콘덴서 55.3 kvar 로 무효 전력이 32.9 kvar 로 줄어 피상 전력 105.3 kVA", cap: "100 kW 부하를 역률 0.75 에서 0.95 로. 콘덴서가 무효 전력만 55.3 kvar 줄이고 유효 전력은 그대로입니다." } },
        { p: "콘덴서는 모터와 반대 방향의 무효 전력을 내므로, 병렬로 달면 전원에서 가져오는 무효 전력이 줄어듭니다. ABB Motor guide 도 «무효 전력을 흡수하는 콘덴서를 전원에 이어 역률을 높인다» 고 적습니다. 유효 전력은 그대로이고 피상 전력·전류만 줄어듭니다." },
        { code: "Qc (kvar) = P (kW) × (tan φ1 − tan φ2)\ntan φ = √(1 − cos²φ) ÷ cos φ\n\n100 kW, 0.75 → 0.95:  tan φ1 = 0.882, tan φ2 = 0.329\nQc = 100 × 0.553 = 55.3 kvar\n선 전류(3상 400 V): 192.5 A → 151.9 A" },
        { p: "ABB Motor guide 표 4.7 은 이 tan φ1 − tan φ2 를 «상수 K» 로 표로 줍니다(보상 전 0.50~0.90 → 보상 후 0.80·0.85·0.90·0.95). 모터에 달 때는 Q = K × P ÷ η 로, 축 출력 P 를 효율 η 로 나눈 입력 전력에 K 를 곱합니다." },
        { h: "kvar 를 µF 로" },
        { code: "콘덴서 하나: C = Q × 1000 ÷ (2π × f × U²)   [F]   (Q 는 그 콘덴서의 kvar, U 는 그 콘덴서에 걸린 전압)\n\n3상 Δ 결선: 콘덴서 3개, 각각 Qc ÷ 3, U = 선간 전압\n3상 Y 결선: 콘덴서 3개, 각각 Qc ÷ 3, U = 선간 전압 ÷ √3  → Δ 의 3배 용량\n\n55.3 kvar, 400 V, 50 Hz, Δ: 18.4 kvar → 약 367 µF × 3" },
        { p: "ABB Motor guide 는 50 Hz 에서 C = 3.2 × 10⁶ × Q ÷ U² 를 적습니다. 3.2 × 10⁶ 은 10⁹ ÷ (2π × 50) ≈ 3.18 × 10⁶ 을 반올림한 것으로, Q 를 kvar·U 를 V 로 넣으면 µF 가 나옵니다. 같은 콘덴서는 60 Hz 에서 kvar 가 50 Hz 의 1.2배가 되므로 주파수를 꼭 맞춥니다." },
        { h: "모터에 직접 달 때 주의 (ABB Motor guide §4.10)" },
        {
          ul: [
            "과보상하면 유도 전동기가 자기 여자되어 발전기처럼 돌 수 있으므로, 모터의 무부하 전류를 넘게 보상하지 않는 것이 보통입니다.",
            "콘덴서를 권선의 한 상에만 병렬로 달면 Y-Δ 기동이 어렵거나 안 될 수 있습니다.",
            "권선이 따로인 2단 속도 모터는 쓰지 않는 권선의 콘덴서가 회로에 남아 있지 않게 합니다.",
          ],
        },
        { h: "지상·진상과 목표 역률" },
        { p: "모터처럼 전류가 전압보다 늦는 상태를 지상(lag), 콘덴서가 너무 많아 전류가 앞서는 상태를 진상(lead)이라 합니다. 목표를 1.0 에 가깝게 잡을수록 필요한 kvar 가 빠르게 늘고, 부하가 줄었을 때 진상이 되기 쉽습니다. 부하가 바뀌는 설비는 여러 단을 켜고 끄는 자동 역률 조정 장치를 쓰는 경우가 많습니다. 전력 회사의 역률 기준·요금 조항은 계약마다 다르므로 계약서·공급 약관을 확인합니다(이 글은 약관 원문을 확인하지 않아 수치를 싣지 않습니다)." },
        { h: "전력 미터에서 역률 읽기" },
        {
          ul: [
            "디지털 전력 미터는 역률·무효 전력·피상 전력을 Modbus 레지스터로 줍니다. LS ELECTRIC GIMAC1000 은 역률을 32비트 실수(f32)로 주고 음수를 진상으로 표시하며, 루텍 Accura 2300 도 상별·총 역률을 f32 로 줍니다(PortDock 장비 맵).",
            "32비트 실수는 레지스터 2개에 걸쳐 오므로 워드 순서가 맞아야 합니다. 값이 엉뚱하면 실수 워드 순서 글을 보세요.",
            "역률이 음수로 보인다고 고장은 아닙니다 — 장비마다 진상을 부호로 나타내는 규칙이 매뉴얼에 있습니다.",
          ],
        },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «역률 개선 콘덴서 계산기»: kW·지금 역률·목표 역률 → 필요한 kvar, Δ·Y 결선 콘덴서 하나의 µF, 개선 전후 전류. 달 콘덴서 kvar 로 개선 뒤 역률과 과보상도 봅니다.",
            "웹 도구 «3상 전력 계산기»: 전압과 A·kW·kVA 중 하나, 역률로 나머지를 계산하고, kW·kVA 로 역률을 구합니다. 모터 출력에서 전류를 낼 때는 «모터 전류 계산기».",
            "Modbus Master: 전력 미터 장비 프로필로 역률·무효 전력 칸을 채워 폴링하고, 추세로 부하에 따른 역률 변화를 봅니다.",
          ],
        },
      ],
      en: [
        { p: "Power meters and plant data show numbers like «power factor 0.85». Power factor tells you how much extra current flows for the same work. Here is what it is, how capacitors raise it and how to size them." },
        { h: "kW, kvar, kVA and power factor" },
        {
          ul: [
            "Real power P (kW): power that becomes work, such as heat or rotation.",
            "Reactive power Q (kvar): power that magnetizes a motor and flows back and forth without doing work.",
            "Apparent power S (kVA): their combined size; for three-phase, √3 × line voltage × current. S = √(P² + Q²).",
            "Power factor cos φ = P ÷ S. ABB's Motor guide calls the ratio of real power (kW) to apparent power (kVA) the power factor, with P and Q together making up S.",
          ],
        },
        { p: "Cables, breakers and transformers are sized by current, so the same kW at a lower power factor needs bigger equipment. 100 kW at 400 V three-phase is 144 A at power factor 1, 180 A at 0.8 and 192 A at 0.75." },
        { h: "Motor power factor" },
        { p: "According to ABB's Motor guide (§4.10), motor power factor is usually between 0.7 and 0.9, lower for small motors and higher for large ones. It also falls with load: in the same guide's table a motor rated at 0.85 has 0.81 at 3/4 load, 0.72 at 1/2 and 0.54 at 1/4. Installations with many motors therefore have a lower overall power factor, and ABB notes that power suppliers sometimes require it to be raised." },
        { h: "Raising the power factor with capacitors" },
        { fig: { src: "/img/guides/power-triangle.en.svg", w: 780, h: 330, alt: "Power triangle on a 100 kW base: before correction 88.2 kvar reactive and 133.3 kVA apparent; a 55.3 kvar capacitor reduces reactive power to 32.9 kvar and apparent power to 105.3 kVA", cap: "A 100 kW load from 0.75 to 0.95. The capacitor removes 55.3 kvar of reactive power; real power is unchanged." } },
        { p: "A capacitor supplies reactive power opposite to a motor's, so connecting it in parallel reduces the reactive power drawn from the supply. ABB's Motor guide likewise describes raising the power factor by «connecting capacitors to the supply which absorb reactive power». Real power stays the same; only apparent power and current fall." },
        { code: "Qc (kvar) = P (kW) × (tan φ1 − tan φ2)\ntan φ = √(1 − cos²φ) ÷ cos φ\n\n100 kW, 0.75 → 0.95:  tan φ1 = 0.882, tan φ2 = 0.329\nQc = 100 × 0.553 = 55.3 kvar\nLine current (three-phase 400 V): 192.5 A → 151.9 A" },
        { p: "ABB Motor guide Table 4.7 tabulates tan φ1 − tan φ2 as a «constant K» (uncompensated 0.50–0.90 → compensated 0.80, 0.85, 0.90, 0.95). For a motor it uses Q = K × P ÷ η: the shaft output P divided by efficiency η gives the input power, multiplied by K." },
        { h: "kvar to µF" },
        { code: "One capacitor: C = Q × 1000 ÷ (2π × f × U²)   [F]   (Q its kvar, U the voltage across it)\n\nThree-phase delta: 3 capacitors, Qc ÷ 3 each, U = line voltage\nThree-phase star:  3 capacitors, Qc ÷ 3 each, U = line voltage ÷ √3  → 3× the capacitance\n\n55.3 kvar, 400 V, 50 Hz, delta: 18.4 kvar → about 367 µF × 3" },
        { p: "ABB's Motor guide gives C = 3.2 × 10⁶ × Q ÷ U² at 50 Hz. 3.2 × 10⁶ is 10⁹ ÷ (2π × 50) ≈ 3.18 × 10⁶ rounded; with Q in kvar and U in volts the result is in µF. The same capacitor gives 1.2 times the kvar at 60 Hz as at 50 Hz, so match the frequency." },
        { h: "Cautions at the motor (ABB Motor guide §4.10)" },
        {
          ul: [
            "Over-compensation can make an induction motor self-excite and run as a generator, so it is normal practice not to compensate for more than the motor's no-load current.",
            "Capacitors connected in parallel with single phases of the winding can make star-delta starting difficult or impossible.",
            "On a two-speed motor with separate windings, capacitors should not remain in circuit on the unused winding.",
          ],
        },
        { h: "Lagging, leading and the target" },
        { p: "With current behind voltage, as in a motor, the power factor is lagging; with too much capacitance the current leads. The closer the target is to 1.0, the faster the kvar grows and the easier it is to go leading when the load drops. Plants with varying load often use automatic correction that switches several steps. Utility requirements and tariffs differ by contract, so check your supply agreement (we have not checked the original terms, so no figures here)." },
        { h: "Reading power factor from a meter" },
        {
          ul: [
            "Digital power meters give power factor, reactive and apparent power as Modbus registers. The LS ELECTRIC GIMAC1000 sends power factor as a 32-bit float (f32) with negative meaning leading, and the Rootech Accura 2300 gives per-phase and total power factor as f32 (PortDock device maps).",
            "A 32-bit float spans two registers, so the word order must match. If values look wrong, see the float word order guide.",
            "A negative power factor is not a fault — each manual states how its device signs leading values.",
          ],
        },
        { h: "In PortDock" },
        {
          ul: [
            "«Power Factor Correction Capacitor Calculator» web tool: kW, present and target power factor → kvar needed, µF per capacitor in delta or star, current before and after; also the power factor after a given kvar and over-compensation.",
            "«Three-Phase Power Calculator» web tool: from voltage, one of amps, kW or kVA, and power factor, get the rest; power factor from kW and kVA. For current from motor output, use the «Motor Current Calculator».",
            "Modbus Master: poll power factor and reactive power from a power meter device profile and watch how they change with load in the trend view.",
          ],
        },
      ],
    },
  },
  // CT 비·부담 — ABB «Instrument Transformers Technical Information and Application Guide»(1VAP420003-TG, 2004 Rev. A)
  // p.4(보통 출력 1~5 A)·p.5(직렬, 2차 접지)·p.6(다중 비 600:5)·p.10(RCF)·p.12(IEEE 등급 0.3·0.6·1.2)·p.13(표준 부담)·p.26(2차 개방).
  // 숫자는 lib/ct 로 계산(ct.test.ts «가이드·그림 예»). IEC 61869-2 의 등급별 오차 한도는 원문 미확인이라 싣지 않는다.
  {
    slug: "ct-ratio-burden",
    date: "2026-10-23",
    tools: ["modbus-master"],
    related: ["power-factor-capacitor", "motor-current-breaker-cable", "modbus-float-word-order"],
    webTools: ["tools/ct-ratio/", "tools/three-phase-power/", "tools/voltage-drop/"],
    deviceKinds: ["power-meter"],
    title: { ko: "CT 비·2차 전류·부담 기초 — 전력 미터 CT 설정과 배선 거리", en: "CT ratio, secondary current and burden — power meter CT settings and wiring distance" },
    seoTitle: { ko: "CT 비·CT 부담 계산 — 2차 전류·선 굵기·전력 미터 설정 — PortDock", en: "CT Ratio & CT Burden: Secondary Current, Leads, Meters — PortDock" },
    desc: {
      ko: "CT 비 200/5 의 뜻과 2차 전류 환산, 계기·왕복 선의 부담(VA = I²R) 계산, 1 A·5 A 2차 차이, 비 오차(RCF), 2차 개방 금지, 전력 미터 CT 설정.",
      en: "What a 200/5 CT ratio means, burden from meter and leads (VA = I²R), 1 A vs 5 A secondaries, ratio error (RCF), open secondaries and meter CT settings.",
    },
    body: {
      ko: [
        { p: "전력 미터·전류계는 수백 A 를 직접 받지 않고 변류기(CT)를 거쳐 작은 2차 전류로 잽니다. 미터를 달거나 Modbus 로 전류 값을 읽을 때 «CT 비 설정», «CT 부담» 이 나옵니다. 계산은 단순하지만 배선 거리에 따라 결과가 크게 달라집니다." },
        { h: "CT 가 하는 일" },
        { p: "ABB 의 계기용 변성기 가이드(1VAP420003-TG)는 CT 를 «선로에 직렬로 들어가 선 전류를 계기·계전기에 맞는 표준 5 A 로 바꾸는 것» 으로 설명하고(p.5), CT 의 보통 출력을 1~5 A 로 적습니다(p.4). 2차 회로는 계기 쪽 전압을 안전하게 두려고 접지합니다(p.5)." },
        { h: "CT 비와 2차 전류" },
        { code: "CT 비 = 1차 정격 ÷ 2차 정격\n200/5 → 40\n\n2차 전류 = 1차 전류 ÷ 40\n1차 150 A → 2차 3.75 A\n1차 200 A → 2차 5 A\n2차 4 A (계기에서 잼) → 1차 160 A" },
        { p: "탭이 여럿인 다중 비 CT 도 있습니다. ABB 가이드의 예(p.6)는 600:5 다중 비 CT 로, 2차 단자 조합(X1-X2, X2-X3 …)에 따라 50:5 ~ 600:5 를 고릅니다. 이때는 어느 단자에 이었는지가 곧 CT 비이므로 명판의 결선표를 확인합니다." },
        { h: "전력 미터의 CT 비 설정" },
        {
          ul: [
            "미터에 CT 1차·2차 정격(예: 200, 5)을 넣으면 미터가 2차 전류에 CT 비를 곱한 실제 전류·전력을 보여 줍니다. 설정이 CT 와 다르면 전류·전력·전력량이 모두 그 비만큼 어긋납니다.",
            "LS ELECTRIC GIMAC1000 장비 맵은 «모든 계측값이 PT/CT 비가 반영된 실제 단위의 Float32» 이고, 루텍 Accura 2300 도 «PT/CT 배율을 따로 곱하지 않는다» 고 적혀 있습니다(PortDock 장비 맵, 각 매뉴얼 근거). Modbus 로 읽은 값에 CT 비를 다시 곱하지 않습니다.",
            "평소 부하가 CT 정격 1차의 몇 % 인지 봅니다. 200/5 CT 에 20 A 부하면 2차 0.5 A(10 %)로, 계기 범위의 아래쪽에서 읽게 됩니다.",
          ],
        },
        { h: "부담(burden) — CT 가 미는 2차 회로" },
        { fig: { src: "/img/guides/ct-burden.ko.svg", w: 780, h: 350, alt: "1차 도체가 CT 를 지나고, CT 2차 S1·S2 에서 편도 10 m 2.5 mm² 선이 왕복으로 계기 전류 입력에 이어진 그림. 왕복 0.138 Ω 이 5 A 에서 3.45 VA, 계기 1 VA(0.04 Ω)를 더해 합계 4.45 VA 로 정격 5 VA 의 89 %", cap: "200/5 A CT, 편도 10 m·2.5 mm² 구리, 계기 1 VA. 선이 계기보다 더 큰 부담이 됩니다." } },
        { p: "부담은 CT 2차에 이어진 임피던스 전체입니다(ABB p.13). CT 의 비 오차·위상 오차는 이 부담에 따라 달라지므로, CT 명판의 정격 부담(VA) 안에서 씁니다. 저항 성분만 보면 계산은 옴의 법칙입니다." },
        { code: "부담 VA = (정격 2차 전류)² × (왕복 선 저항 + 계기 입력 저항 + 단자 등)\n계기 입력 Ω = 계기 부담 VA ÷ (정격 2차 전류)²\n왕복 선 저항 = (2 × 편도 길이) ÷ (58 × 단면적)   (구리 20 °C, Ω)\n\n200/5, 편도 10 m, 2.5 mm², 계기 1 VA:\n  선 0.138 Ω → 3.45 VA,  계기 0.04 Ω → 1 VA\n  합계 0.178 Ω → 4.45 VA  (정격 5 VA 의 89 %)\n같은 조건, 편도 30 m:  11.34 VA  (227 % — 정격 초과)" },
        { p: "계기의 VA 는 계기 사양서의 «전류 입력 부담» 값을 씁니다. 위 계산은 저항 성분만 더한 것이고, 계기 입력에 리액턴스가 있으면 실제 임피던스는 조금 다릅니다." },
        { h: "1 A 와 5 A 2차" },
        {
          table: {
            head: ["선(구리 2.5 mm²) 편도", "왕복 Ω", "5 A 2차 선 부담", "1 A 2차 선 부담"],
            rows: [
              ["10 m", "0.138", "3.45 VA", "0.138 VA"],
              ["30 m", "0.414", "10.34 VA", "0.414 VA"],
              ["50 m", "0.690", "17.24 VA", "0.690 VA"],
            ],
            plain: true,
          },
        },
        { p: "같은 선이면 선 부담(I²R)은 1 A 2차가 5 A 의 1/25 입니다. 편도 30 m 에서 5 A CT 는 선만으로 10 VA 를 넘지만, 1 A CT 는 계기 1 VA 를 더해도 약 1.41 VA 입니다. 배선이 길면 선을 굵게 하거나, 계기를 CT 가까이 두거나, 1 A 2차 CT 와 1 A 입력 계기를 씁니다. 계기가 어느 2차 전류를 받는지 먼저 확인합니다." },
        { h: "표준 부담 표 (IEEE C57.13)" },
        { p: "ABB 가이드(p.13)는 IEEE C57.13 의 5 A 2차 계량용 표준 부담을 B-0.1(0.1 Ω, 2.5 VA), B-0.2(0.2 Ω, 5.0 VA), B-0.5(0.5 Ω, 12.5 VA), B-0.9(0.9 Ω, 22.5 VA), B-1.8(1.8 Ω, 45 VA)로 줍니다(역률 0.9, 60 Hz). 5 A 가 아닌 CT 는 옴 값에 (5 ÷ 정격 전류)² 를 곱하고 정격 전류에서 VA 는 그대로입니다 — 1 A CT 에서 2.5 VA 는 2.5 Ω 입니다. IEC 쪽 정격 부담 표기와 정확도 등급별 오차 한도는 IEC 61869-2 원문을 확인하지 않아 이 글에 싣지 않습니다." },
        { h: "비 오차와 정확도 등급" },
        { p: "명판의 비는 «표시 비» 이고, 실제 비는 그보다 조금 크거나 작습니다. ABB 가이드(p.10)는 그 차이를 비 보정 계수 RCF = 실제 비 ÷ 표시 비 로 정의합니다. 실제 20.2 : 1, 표시 20 : 1 이면 RCF 1.01, 비 오차 1 % 이고, RCF 가 1 보다 크면 계기는 낮게 읽으므로 읽은 값에 RCF 를 곱합니다." },
        { p: "같은 가이드(p.12)에 따르면 IEEE C57.13 은 계량용 CT 에 0.3·0.6·1.2 등급을 두고, 0.6·1.2 등급은 0.3 등급의 두 배·네 배 오차를 허용합니다. 정격 전류의 10 % 에서는 100 % 에서의 두 배 오차를 허용하고, 이 한도는 정해진 부담에서뿐 아니라 부담 0 에서도 지켜야 합니다. 등급은 정해진 부담 조건에서의 값이므로, 실제 부담이 정격을 넘으면 등급을 기대할 수 없습니다." },
        { h: "2차를 열지 않기" },
        { p: "ABB 가이드(p.26): CT 2차가 전류가 흐르는 채로 열리면 1차 전류가 모두 여자 회로로 흘러 2차 단자에 아주 높은 전압이 생깁니다. 실효값은 철심 포화로 제한돼 전압계로는 위험해 보이지 않을 수 있지만, 전류가 0 을 지날 때마다 매우 높은 전압 펄스가 생겨 절연을 깨고 사람에게 위험합니다. 가이드는 2차 개방을 «심각한 사고» 로 보라고 하고, 큰 CT 에서 개방될 수 있으면 보호 회로를 2차 단자에 늘 이어 두라고 적습니다." },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «CT 비·2차 전류·부담 계산기»: CT 비로 1차 ↔ 2차 전류, 정격 1차 대비 %, 왕복 선 저항 + 계기 VA → 전체 부담과 정격 대비 %, 잰 전류로 RCF.",
            "웹 도구 «3상 전력 계산기»: 미터에서 읽은 전압·전류·역률로 kVA·kW·kvar 를 확인합니다. 선 굵기별 저항은 «전압 강하·전선 굵기 계산기».",
            "Modbus Master: 전력 미터 장비 프로필(GIMAC1000·Accura 등)로 상별 전류를 폴링해 CT 비 설정이 맞는지(실제 부하와 비슷한지) 봅니다.",
          ],
        },
      ],
      en: [
        { p: "Power meters and ammeters do not take hundreds of amps directly; they measure a small secondary current through a current transformer (CT). Installing a meter or reading current over Modbus brings up «CT ratio settings» and «CT burden». The arithmetic is simple, but wiring distance changes the result a lot." },
        { h: "What a CT does" },
        { p: "ABB's instrument transformer guide (1VAP420003-TG) describes a CT as connected in series with the line to transform the line current to the standard 5 A suitable for meters and relays (p.5), and gives typical CT outputs of 1–5 A (p.4). The secondary circuit is grounded to keep the voltage at the meters safe (p.5)." },
        { h: "CT ratio and secondary current" },
        { code: "CT ratio = rated primary ÷ rated secondary\n200/5 → 40\n\nSecondary = primary ÷ 40\n150 A primary → 3.75 A secondary\n200 A primary → 5 A secondary\n4 A measured at the meter → 160 A primary" },
        { p: "Some CTs have several taps. ABB's example (p.6) is a 600:5 multi-ratio CT where the pair of secondary terminals (X1-X2, X2-X3 …) selects 50:5 to 600:5. The terminals you wired are the ratio, so check the nameplate connection table." },
        { h: "Setting the CT ratio on a power meter" },
        {
          ul: [
            "Enter the CT's rated primary and secondary (e.g. 200 and 5) and the meter multiplies the secondary current by the ratio to show real current and power. If the setting does not match the CT, current, power and energy are all off by that ratio.",
            "The LS ELECTRIC GIMAC1000 device map notes that all measurements are Float32 in engineering units with the PT/CT ratio applied, and the Rootech Accura 2300 map says no separate PT/CT scaling is needed (PortDock device maps, from each manual). Do not multiply Modbus values by the CT ratio again.",
            "Check what percentage of the CT's rated primary your normal load is. A 20 A load on a 200/5 CT gives 0.5 A secondary (10 %), at the bottom of the meter's range.",
          ],
        },
        { h: "Burden — the circuit the CT drives" },
        { fig: { src: "/img/guides/ct-burden.en.svg", w: 780, h: 350, alt: "The primary conductor passes through a CT; from secondary terminals S1 and S2, 10 m one-way 2.5 mm² leads run to the meter current input and back. The 0.138 Ω round trip is 3.45 VA at 5 A; with the meter's 1 VA (0.04 Ω) the total is 4.45 VA, 89 % of a 5 VA rating", cap: "A 200/5 A CT, 10 m one way of 2.5 mm² copper, a 1 VA meter. The leads are a bigger burden than the meter." } },
        { p: "The burden is the whole impedance connected to the CT secondary (ABB p.13). A CT's ratio and phase errors depend on it, so keep within the rated burden (VA) on the nameplate. Looking at the resistive part only, it is Ohm's law." },
        { code: "Burden VA = (rated secondary current)² × (round-trip leads + meter input + terminals)\nMeter input Ω = meter burden VA ÷ (rated secondary current)²\nRound-trip leads = (2 × one-way length) ÷ (58 × area)   (copper at 20 °C, Ω)\n\n200/5, 10 m one way, 2.5 mm², meter 1 VA:\n  leads 0.138 Ω → 3.45 VA,  meter 0.04 Ω → 1 VA\n  total 0.178 Ω → 4.45 VA  (89 % of 5 VA)\nSame, 30 m one way:  11.34 VA  (227 % — over the rating)" },
        { p: "Take the meter's VA from its datasheet («current input burden»). The calculation adds resistance only; if the meter input has reactance, the real impedance differs slightly." },
        { h: "1 A and 5 A secondaries" },
        {
          table: {
            head: ["Leads (copper 2.5 mm²) one way", "Round-trip Ω", "Lead burden, 5 A secondary", "Lead burden, 1 A secondary"],
            rows: [
              ["10 m", "0.138", "3.45 VA", "0.138 VA"],
              ["30 m", "0.414", "10.34 VA", "0.414 VA"],
              ["50 m", "0.690", "17.24 VA", "0.690 VA"],
            ],
            plain: true,
          },
        },
        { p: "On the same wire, lead burden (I²R) with a 1 A secondary is 1/25 of 5 A. At 30 m one way a 5 A CT passes 10 VA on the leads alone, while a 1 A CT with a 1 VA meter is about 1.41 VA in total. For long runs, use thicker wire, move the meter closer, or use a 1 A secondary CT with a 1 A meter input. Check which secondary current your meter takes first." },
        { h: "Standard burdens (IEEE C57.13)" },
        { p: "ABB's guide (p.13) lists the IEEE C57.13 metering burdens for 5 A secondaries: B-0.1 (0.1 Ω, 2.5 VA), B-0.2 (0.2 Ω, 5.0 VA), B-0.5 (0.5 Ω, 12.5 VA), B-0.9 (0.9 Ω, 22.5 VA) and B-1.8 (1.8 Ω, 45 VA), at power factor 0.9 and 60 Hz. For a CT not rated 5 A, multiply the ohms by (5 ÷ rated current)²; the VA at rated current stays the same — 2.5 VA on a 1 A CT is 2.5 Ω. IEC rated-burden notation and accuracy-class error limits are not covered here: we have not checked the IEC 61869-2 text." },
        { h: "Ratio error and accuracy classes" },
        { p: "The nameplate ratio is the «marked ratio»; the actual ratio is slightly higher or lower. ABB's guide (p.10) defines the difference as the ratio correction factor RCF = actual ratio ÷ marked ratio. An actual 20.2 : 1 against a marked 20 : 1 is RCF 1.01, a 1 % ratio error; with RCF above 1 the meter reads low, so multiply readings by the RCF." },
        { p: "According to the same guide (p.12), IEEE C57.13 has metering classes 0.3, 0.6 and 1.2 for CTs, the 0.6 and 1.2 classes allowing twice and four times the error of 0.3. Twice the error is permitted at 10 % of rated current as at 100 %, and the limits apply at the specified burden and also at zero burden. A class holds under its burden conditions; if the actual burden exceeds the rating, do not expect the class." },
        { h: "Never open the secondary" },
        { p: "ABB's guide (p.26): if a CT secondary is opened while current flows, all the primary current flows through the exciting branch and a high voltage appears at the secondary terminals. The RMS value is limited by core saturation and may not look dangerous on a voltmeter, but each current zero produces very high voltage peaks that can break down insulation and are dangerous to people. The guide says an open secondary should be considered a serious accident and, where larger CTs may be opened, a protective circuit should be permanently connected to the secondary terminals." },
        { h: "In PortDock" },
        {
          ul: [
            "«CT Ratio & Burden Calculator» web tool: primary ↔ secondary current by ratio, percentage of rated primary, round-trip leads + meter VA → total burden against the rating, and RCF from measured currents.",
            "«Three-Phase Power Calculator» web tool: check kVA, kW and kvar from the voltage, current and power factor the meter reports. For wire resistance by size, use the «Voltage Drop & Wire Size Calculator».",
            "Modbus Master: poll per-phase current from a power meter device profile (GIMAC1000, Accura and others) to see whether the CT ratio setting gives plausible load currents.",
          ],
        },
      ],
    },
  },
  // 합성 저항 — 정의식. 숫자는 lib/resistors·lib/led 로 계산(resistors.test.ts·led.test.ts), 표준 값은 Vishay 28372(IEC 60063 표).
  {
    slug: "resistor-series-parallel",
    date: "2026-10-23",
    tools: ["serial"],
    related: ["rs485-bias-termination", "analog-input-scaling", "ntc-thermistor-temperature"],
    webTools: ["tools/parallel-resistor/", "tools/led-resistor/", "tools/voltage-divider/"],
    title: { ko: "저항 직렬·병렬 합성 — 공식, 전류·전력 나눔, 표준 값으로 원하는 저항 만들기", en: "Resistors in series and parallel — formulas, current and power sharing, making values from standard resistors" },
    seoTitle: { ko: "저항 병렬·직렬 계산 — 합성저항 공식과 표준 값 조합 — PortDock", en: "Resistors in Series & Parallel: Formulas, E12/E24 Pairs — PortDock" },
    desc: {
      ko: "합성 저항 공식(직렬 합, 병렬 역수의 합), 병렬 전류·전력 나눔, E12·E24·E96 두 개로 없는 값 만들기, 허용차, 종단 저항 겹침과 LED 저항 예.",
      en: "Series and parallel formulas, current and power sharing, making missing values from two E12/E24/E96 resistors, tolerance, terminators and LED resistors.",
    },
    body: {
      ko: [
        { p: "회로도에 필요한 값이 저항 계열에 없거나, 종단 저항이 두 곳에서 켜져 값이 반으로 보이거나, 저항 하나가 너무 뜨거울 때 — 모두 직렬·병렬 합성으로 설명됩니다. 공식은 두 줄이지만 전류·전력이 어떻게 나뉘는지까지 보면 현장에서 쓸 곳이 많습니다." },
        { h: "직렬: 더한다" },
        { code: "R = R1 + R2 + … + Rn\n1 kΩ + 2.2 kΩ = 3.2 kΩ" },
        { p: "직렬은 모든 저항에 같은 전류가 흐르고 전압이 저항 크기에 비례해 나뉩니다. 합성 값은 가장 큰 저항보다 항상 큽니다. 전력도 저항에 비례하므로(P = I²R) 큰 저항이 더 뜨거워집니다." },
        { h: "병렬: 역수를 더한다" },
        { code: "1/R = 1/R1 + 1/R2 + … + 1/Rn\n두 개:   R = R1 × R2 ÷ (R1 + R2)\n같은 값 n 개:   R ÷ n\n\n10 kΩ ∥ 4.7 kΩ = 47 000 000 ÷ 14 700 ≈ 3.197 kΩ\n10 kΩ ∥ 10 kΩ = 5 kΩ\n10 kΩ ∥ 1 MΩ ≈ 9.90 kΩ (−1 %)" },
        { p: "병렬은 모든 저항에 같은 전압이 걸리고 전류가 저항에 반비례해 나뉩니다. 합성 값은 가장 작은 저항보다 항상 작습니다. 큰 저항을 병렬로 붙이면 값이 조금만 줄어 미세 조정에 쓸 수 있습니다." },
        { h: "병렬에서 전류·전력이 나뉘는 방식" },
        {
          table: {
            head: ["24 V 에 병렬", "전류", "전력"],
            rows: [
              ["1 kΩ", "24 mA", "576 mW"],
              ["2 kΩ", "12 mA", "288 mW"],
              ["4 kΩ", "6 mA", "144 mW"],
              ["합성 571.4 Ω", "42 mA", "1008 mW"],
            ],
            plain: true,
          },
        },
        { p: "작은 저항이 전류와 전력을 가장 많이 받습니다. 전력을 나누려고 저항을 병렬로 둘 때는 같은 값을 쓰면 n 개가 1/n 씩 고르게 나눕니다. 값이 다르면 가장 작은 저항의 정격 전력부터 확인합니다." },
        { h: "표준 값 두 개로 원하는 값 만들기" },
        { p: "저항은 E12(한 decade 에 12개)·E24(24개)·E96(96개) 같은 계열 값으로 팝니다(Vishay 문서 28372 의 IEC 60063 표). 필요한 값이 계열에 없으면 두 개를 직렬이나 병렬로 이어 맞춥니다. 짝은 공식을 거꾸로 풀면 나옵니다." },
        { code: "직렬 짝:  R2 = Rt − R1          (R1 < Rt)\n병렬 짝:  R2 = R1 × Rt ÷ (R1 − Rt)   (R1 > Rt)\n\n10 kΩ 에 무엇을 병렬로 붙이면 6 kΩ?  10k × 6k ÷ 4k = 15 kΩ\nE12 로 정확히:  5 kΩ = 10k ∥ 10k,   3.3 kΩ = 1.8k + 1.5k" },
        {
          table: {
            head: ["6.04 kΩ 만들기", "조합", "합성 값", "오차"],
            rows: [
              ["E12", "6.8k ∥ 56k", "6.064 kΩ", "+0.39 %"],
              ["E24", "6.2k ∥ 240k", "6.044 kΩ", "+0.06 %"],
              ["E96", "3.24k + 2.8k", "6.04 kΩ", "0 %"],
            ],
            plain: true,
          },
        },
        { p: "6.04 kΩ 은 E96 값입니다. E24 두 개만으로도 0.1 % 안에 맞출 수 있지만, 그 정도 정밀도가 필요하면 보통은 E96 저항 하나가 더 간단합니다. 비율이 중요한 분압은 저항 값이 아니라 비를 맞추는 분압 저항 계산기의 조합을 씁니다." },
        { h: "허용차는 어떻게 되나" },
        { p: "두 저항이 같은 허용차(예: ±5 %)이고 둘 다 같은 방향 끝까지 어긋나면, 직렬 합(R1 + R2)과 병렬 합(R1R2 ÷ (R1 + R2)) 모두 같은 비율(±5 %)만큼 어긋납니다 — 두 값에 같은 배수를 곱하면 합성 값에도 그 배수가 곱해지기 때문입니다. 조합으로 공칭 값을 맞춰도 허용차는 줄지 않으므로, 오차가 중요하면 허용차가 작은 저항을 고릅니다." },
        { h: "현장에서 보는 예" },
        {
          ul: [
            "RS-485 종단: 장비 내장 120 Ω 종단과 바깥 120 Ω 이 같은 끝에서 둘 다 켜지면 그 끝은 120 ∥ 120 = 60 Ω 입니다. 선로 양 끝에 하나씩 바르게 단 종단도 A-B 사이(전원을 끈 상태)에서는 60 Ω 으로 재지므로, 재어 본 값과 함께 장비 수와 내장 종단 설정을 확인합니다.",
            "4–20 mA 입력 저항: 250 Ω 이 없을 때 1 kΩ 네 개를 병렬로(250 Ω), 또는 E24 의 120 Ω + 130 Ω 을 직렬로 만듭니다.",
            "LED 전류 제한 저항: R = (전원 − Vf) ÷ 전류. 24 V, Vf 2 V, 10 mA 면 2.2 kΩ 이고 저항 전력은 0.22 W 로 LED(20 mW)의 10배가 넘습니다. 1/4 W 저항이면 여유가 거의 없으므로 정격이 큰 저항을 쓰거나 두 개를 직렬로 나눕니다.",
          ],
        },
        { h: "4k7·2M2 표기" },
        { p: "회로도·부품 목록에서는 단위 글자를 소수점 자리에 써서 4k7(4.7 kΩ), 2M2(2.2 MΩ), 0R47(0.47 Ω)처럼 적기도 합니다. PortDock 합성 저항 계산기는 이 표기도 그대로 읽습니다." },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «합성 저항 계산기 (직렬·병렬)»: 여러 값의 직렬·병렬 합성, 병렬 전류 몫과 전류, 짝 저항, E12·E24·E96 두 개 조합(오차순).",
            "웹 도구 «LED 저항 계산기»: 전원·Vf·전류·직렬 개수 → 저항·전력, 표준 값으로 바꿨을 때 전류.",
            "웹 도구 «분압 저항 계산기»: 비를 맞추는 R1·R2 표준 값 조합, 부하·허용차.",
          ],
        },
      ],
      en: [
        { p: "A value your schematic needs is not in the series, a bus reads half the termination you expected, a resistor runs too hot — all of these come down to series and parallel combinations. The formulas are two lines, but how current and power divide is where they become useful." },
        { h: "Series: add" },
        { code: "R = R1 + R2 + … + Rn\n1 kΩ + 2.2 kΩ = 3.2 kΩ" },
        { p: "In series the same current flows through every resistor and the voltage divides in proportion to resistance. The total is always above the largest resistor. Power is also proportional to resistance (P = I²R), so the larger one runs hotter." },
        { h: "Parallel: add reciprocals" },
        { code: "1/R = 1/R1 + 1/R2 + … + 1/Rn\nTwo:   R = R1 × R2 ÷ (R1 + R2)\nn equal values:   R ÷ n\n\n10 kΩ ∥ 4.7 kΩ = 47,000,000 ÷ 14,700 ≈ 3.197 kΩ\n10 kΩ ∥ 10 kΩ = 5 kΩ\n10 kΩ ∥ 1 MΩ ≈ 9.90 kΩ (−1 %)" },
        { p: "In parallel every resistor sees the same voltage and current divides in inverse proportion to resistance. The total is always below the smallest resistor. A large resistor in parallel lowers the value only slightly, which is handy for trimming." },
        { h: "How current and power divide in parallel" },
        {
          table: {
            head: ["In parallel on 24 V", "Current", "Power"],
            rows: [
              ["1 kΩ", "24 mA", "576 mW"],
              ["2 kΩ", "12 mA", "288 mW"],
              ["4 kΩ", "6 mA", "144 mW"],
              ["Total 571.4 Ω", "42 mA", "1008 mW"],
            ],
            plain: true,
          },
        },
        { p: "The smallest resistor takes the most current and power. To share power, use equal values: n of them each take 1/n. With different values, check the power rating of the smallest one first." },
        { h: "Making a value from two standard resistors" },
        { p: "Resistors come in series values such as E12 (12 per decade), E24 (24) and E96 (96) — the IEC 60063 tables in Vishay document 28372. If the value you need is not in the series, join two in series or parallel. The partner comes from solving the formula backwards." },
        { code: "Series partner:    R2 = Rt − R1          (R1 < Rt)\nParallel partner:  R2 = R1 × Rt ÷ (R1 − Rt)   (R1 > Rt)\n\nWhat in parallel with 10 kΩ gives 6 kΩ?  10k × 6k ÷ 4k = 15 kΩ\nExact from E12:  5 kΩ = 10k ∥ 10k,   3.3 kΩ = 1.8k + 1.5k" },
        {
          table: {
            head: ["Making 6.04 kΩ", "Combination", "Value", "Error"],
            rows: [
              ["E12", "6.8k ∥ 56k", "6.064 kΩ", "+0.39 %"],
              ["E24", "6.2k ∥ 240k", "6.044 kΩ", "+0.06 %"],
              ["E96", "3.24k + 2.8k", "6.04 kΩ", "0 %"],
            ],
            plain: true,
          },
        },
        { p: "6.04 kΩ is an E96 value. Two E24 resistors get within 0.1 %, but if you need that precision a single E96 part is usually simpler. For a divider where the ratio matters, use the Voltage Divider Calculator's pairs, which match the ratio rather than one value." },
        { h: "What happens to tolerance" },
        { p: "If two resistors have the same tolerance (say ±5 %) and both drift fully the same way, the series sum (R1 + R2) and the parallel value (R1R2 ÷ (R1 + R2)) both move by the same ±5 % — scaling both values by the same factor scales the result by that factor. Combining values hits the nominal value but does not shrink the tolerance, so if accuracy matters choose tighter-tolerance resistors." },
        { h: "Examples in the field" },
        {
          ul: [
            "RS-485 termination: with a device's built-in 120 Ω terminator and an external 120 Ω both on at the same end, that end is 120 ∥ 120 = 60 Ω. Correct termination, one at each end of the line, also measures 60 Ω across A-B (power off), so check the reading together with the number of devices and their built-in termination settings.",
            "4–20 mA input resistor: without a 250 Ω part, use four 1 kΩ in parallel (250 Ω) or the E24 values 120 Ω + 130 Ω in series.",
            "LED current-limiting resistor: R = (supply − Vf) ÷ current. At 24 V, Vf 2 V and 10 mA that is 2.2 kΩ dissipating 0.22 W, over ten times the LED's 20 mW. A 1/4 W part leaves almost no margin, so use a higher rating or split it into two in series.",
          ],
        },
        { h: "4k7 and 2M2 notation" },
        { p: "Schematics and parts lists often put the unit letter where the decimal point goes: 4k7 (4.7 kΩ), 2M2 (2.2 MΩ), 0R47 (0.47 Ω). PortDock's resistor calculator reads this notation directly." },
        { h: "In PortDock" },
        {
          ul: [
            "«Parallel & Series Resistor Calculator» web tool: series and parallel totals, current share and currents, the partner value, and E12/E24/E96 pairs by error.",
            "«LED Resistor Calculator» web tool: supply, Vf, current and LEDs in series → resistor and power, current with a standard value.",
            "«Voltage Divider Calculator» web tool: standard R1/R2 pairs for a ratio, with load and tolerance.",
          ],
        },
      ],
    },
  },
  // 공압 실린더 — SMC «Best Pneumatics» 기술 자료(Data 1·3·선정 예제). 숫자는 lib/cylinder 로 계산(cylinder.test.ts).
  {
    slug: "pneumatic-cylinder-force",
    date: "2026-10-24",
    tools: ["plot", "modbus-master"],
    related: ["pressure-units", "analog-input-scaling", "ball-screw-torque-motor"],
    webTools: ["tools/cylinder-force/", "tools/pressure/", "tools/units/"],
    title: { ko: "공압 실린더 추력과 부하율 — 이론 출력 계산과 보어 고르기", en: "Pneumatic cylinder force and load factor — theoretical output and choosing a bore" },
    seoTitle: { ko: "실린더 추력 계산 — 공압 실린더 출력 공식·부하율·보어 — PortDock", en: "Pneumatic Cylinder Force: Formula, Load Factor, Bore — PortDock" },
    desc: {
      ko: "공압 실린더 추력은 압력 × 면적. 미는 쪽·당기는 쪽 차이, SMC 의 부하율(정적 0.7·동적 0.5·가이드 1), 이론 출력 표, 선정 예제 세 개로 보어 고르는 순서.",
      en: "Cylinder force = pressure × area. Extend vs retract, SMC load factors (static 0.7, dynamic 0.5, guided 1), the output table and three bore selection examples.",
    },
    body: {
      ko: [
        { p: "공압 실린더가 내는 힘은 «얼마나 큰 보어를 써야 하나» 를 정할 때 가장 먼저 계산합니다. 식은 단순하지만, 당기는 쪽 면적과 «부하율» 을 빠뜨리면 실린더가 모자라거나 느려집니다. 이 글은 SMC 의 기술 자료(Best Pneumatics «Air Cylinders Model Selection», «Technical Data 1·3»)를 따라갑니다." },
        { h: "이론 출력 = 압력 × 면적" },
        { code: "F(N) = P(MPa) × A(mm²)\n미는 쪽  A1 = π × D² ÷ 4\n당기는 쪽 A2 = π × (D² − d²) ÷ 4     (D 보어, d 로드 지름)\n\nø50 / 로드 20, 0.5 MPa:\n  미는 쪽  1963 mm² × 0.5 = 982 N (100 kgf)\n  당기는 쪽 1649 mm² × 0.5 = 825 N (84 kgf)" },
        { p: "SMC 는 실린더 안의 저항이 없다고 보고 압력에 받는 면적만 곱한 값을 «이론 출력» 이라고 부릅니다. 단위를 MPa 와 mm² 로 맞추면 결과가 바로 N 입니다(1 MPa = 1 N/mm²). kgf 로는 9.806 65 로 나눕니다." },
        {
          table: {
            head: ["압력", "미는 쪽 N (kgf)", "당기는 쪽 N (kgf)"],
            rows: [
              ["0.3 MPa", "589 (60.1)", "495 (50.5)"],
              ["0.4 MPa", "785 (80.1)", "660 (67.3)"],
              ["0.5 MPa", "982 (100.1)", "825 (84.1)"],
              ["0.6 MPa", "1178 (120.1)", "990 (100.9)"],
            ],
            plain: true,
          },
        },
        { p: "위 표는 ø50·로드 20 mm 의 값입니다. 힘은 압력에 정비례하므로, 공급 압력이 0.5 에서 0.4 MPa 로 떨어지면 힘도 20 % 줄어듭니다." },
        { h: "부하율 — 이론 출력을 다 쓰지 않는 이유" },
        { p: "실제 실린더에는 패킹·베어링 마찰이 있고, 움직일 때는 배기 쪽에 남은 압력이 반대로 밉니다. SMC 는 이 힘들이 크기·압력·속도에 따라 달라지므로 실린더를 늘 넉넉하게 고르라고 하고, 그 여유를 «부하율 η» 로 둡니다." },
        { code: "필요한 힘 F = η × A × P   →   필요한 면적 A = F ÷ (η × P)" },
        {
          table: {
            head: ["쓰임 (SMC)", "부하율 η"],
            rows: [
              ["정적 — 클램프, 저속 압입", "0.7 이하"],
              ["동적 — 부하를 수직·수평으로 움직임", "0.5 이하"],
              ["동적 — 가이드 위에서 수평 이동", "1 이하"],
            ],
            plain: true,
          },
        },
        { p: "특히 빨리 움직여야 하면 부하율을 더 낮춥니다(SMC 그래프는 0.4·0.3·0.2 까지). 부하율을 낮출수록 힘이 남아 속도를 내기 쉬워집니다. 압력은 보통 공급 압력의 85 % 로 레귤레이터를 둔다고 SMC 는 적습니다." },
        { h: "보어 고르는 순서 — SMC 예제 세 개" },
        { p: "SMC 의 선정 순서는 ① 쓰임에 맞는 부하율 ② 사용 압력 ③ 필요한 힘(누르는 힘, 또는 움직일 질량)으로 그래프에서 보어를 읽는 것입니다. 그래프 대신 식으로 풀면 다음과 같고, 세 예제 모두 SMC 가 고른 보어와 같습니다." },
        {
          table: {
            head: ["예제", "조건", "필요한 면적", "보어"],
            rows: [
              ["1", "정적으로 1000 N 누름, η 0.7, 0.5 MPa, 미는 쪽", "1000 ÷ (0.7 × 0.5) = 2857 mm² (ø60.3 이상)", "ø63"],
              ["2", "가이드 위 30 kg 수평 이동, η 1, 0.4 MPa, 당기는 쪽", "294 N ÷ 0.4 = 735 mm²", "ø40 (로드 14, 당김 1103 mm²)"],
              ["3", "100 kg 수직으로 끌어올림, η 0.5, 0.5 MPa, 당기는 쪽", "981 N ÷ 0.25 = 3923 mm²", "ø80 (로드 25, 당김 4536 mm²)"],
            ],
            plain: true,
          },
        },
        { p: "예제 2·3 은 당기는 쪽으로 계산합니다. 부하를 양쪽으로 움직이면 면적이 작은 당기는 쪽이 기준이고, 예제 3 은 당겨서 들어 올리는 구조라서입니다. 예제 3 에서 압력이 0.4 MPa 로 떨어진다고 보면 필요한 면적이 4903 mm² 가 되어 ø80(당김 4536 mm²)으로는 모자라고 ø100 이 됩니다 — 압력은 낮은 쪽으로 넣습니다." },
        { h: "SMC 이론 출력 표 읽기" },
        { p: "SMC 의 «Theoretical Output Table»(Data 3)은 보어·로드별 면적과 0.2~1.0 MPa 의 출력을 줍니다. 면적을 유효 숫자 3자리로 반올림한 뒤 압력을 곱해 다시 3자리로 적은 값이라, 계산기 값과 끝자리가 조금 다를 수 있습니다. 같은 보어라도 시리즈마다 로드 지름이 다르니(ø40 은 로드 14·16 두 줄) 쓰는 실린더의 카탈로그 값을 넣습니다." },
        {
          table: {
            head: ["보어 / 로드", "미는 쪽 mm²", "당기는 쪽 mm²", "0.5 MPa 미는 쪽 N", "0.5 MPa 당기는 쪽 N"],
            rows: [
              ["ø32 / 12", "804", "691", "402", "346"],
              ["ø40 / 14", "1,260", "1,100", "630", "550"],
              ["ø50 / 20", "1,960", "1,650", "980", "825"],
              ["ø63 / 20", "3,120", "2,800", "1,560", "1,400"],
              ["ø80 / 25", "5,030", "4,540", "2,520", "2,270"],
              ["ø100 / 30", "7,850", "7,150", "3,930", "3,580"],
            ],
          },
        },
        { h: "계산에 없는 것" },
        {
          ul: [
            "속도와 충돌: 이론 출력은 정지 상태의 힘입니다. 행정 끝에서 부하를 멈추는 운동 에너지는 쿠션 용량(카탈로그의 허용 운동 에너지)으로 따로 봅니다.",
            "가로 하중: 로드에 옆으로 걸리는 힘은 실린더가 아니라 가이드로 받게 합니다. SMC 예제 2 가 부하율 1 을 쓰는 것도 가이드 위 이동이기 때문입니다.",
            "공기 소비량과 배관: 빨리 움직이려면 밸브·배관 크기와 공급 유량이 맞아야 합니다.",
          ],
        },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «공압 실린더 추력 계산기»: 보어·로드·압력(MPa·bar·kgf/cm²·psi) → 미는 쪽·당기는 쪽 이론 출력과 부하율을 곱한 힘, 필요한 힘·질량으로 SMC 표의 보어 고르기.",
            "웹 도구 «압력 단위 변환기»: 레귤레이터·압력계 눈금(bar·kgf/cm²·psi)을 MPa 로 바꿉니다.",
            "Serial Plotter·Modbus Master: 압력 센서(4–20 mA → 아날로그 입력 → Modbus)의 값을 기록해 실린더가 움직일 때 공급 압력이 얼마나 떨어지는지 그래프로 봅니다.",
          ],
        },
      ],
      en: [
        { p: "The force a pneumatic cylinder delivers is the first thing to calculate when choosing a bore. The formula is simple, but forgetting the retract-side area or the «load factor» leaves a cylinder too weak or too slow. This guide follows SMC's technical data (Best Pneumatics «Air Cylinders Model Selection», «Technical Data 1 and 3»)." },
        { h: "Theoretical output = pressure × area" },
        { code: "F (N) = P (MPa) × A (mm²)\nExtend   A1 = π × D² ÷ 4\nRetract  A2 = π × (D² − d²) ÷ 4     (D bore, d rod diameter)\n\nø50 / rod 20, 0.5 MPa:\n  extend   1963 mm² × 0.5 = 982 N (100 kgf)\n  retract  1649 mm² × 0.5 = 825 N (84 kgf)" },
        { p: "SMC calls the force from pressure times area, assuming no resistance inside the cylinder, the «theoretical output». With MPa and mm² the result is directly in newtons (1 MPa = 1 N/mm²). Divide by 9.806 65 for kgf." },
        {
          table: {
            head: ["Pressure", "Extend N (kgf)", "Retract N (kgf)"],
            rows: [
              ["0.3 MPa", "589 (60.1)", "495 (50.5)"],
              ["0.4 MPa", "785 (80.1)", "660 (67.3)"],
              ["0.5 MPa", "982 (100.1)", "825 (84.1)"],
              ["0.6 MPa", "1178 (120.1)", "990 (100.9)"],
            ],
            plain: true,
          },
        },
        { p: "The table is for ø50 with a 20 mm rod. Force is proportional to pressure: if the supply drops from 0.5 to 0.4 MPa, force drops by 20 %." },
        { h: "Load factor — why you do not use the full output" },
        { p: "A real cylinder has seal and bearing friction, and while moving, pressure left on the exhaust side pushes back. SMC notes these forces vary with size, pressure and speed, recommends always selecting a cylinder with margin, and expresses that margin as a «load factor η»." },
        { code: "Required force F = η × A × P   →   area needed A = F ÷ (η × P)" },
        {
          table: {
            head: ["Use (SMC)", "Load factor η"],
            rows: [
              ["Static — clamping, low-speed press fitting", "0.7 or less"],
              ["Dynamic — moving the load vertically or horizontally", "0.5 or less"],
              ["Dynamic — horizontal movement on a guide", "1 or less"],
            ],
            plain: true,
          },
        },
        { p: "For particularly fast motion, reduce the load factor further (SMC's graphs go down to 0.4, 0.3, 0.2); the spare force makes speed easier to reach. SMC also says the regulator is generally set to 85 % of the supply pressure." },
        { h: "Choosing a bore — SMC's three examples" },
        { p: "SMC's procedure is ① choose the load factor for the use, ② choose the operating pressure, ③ read the bore off a graph from the force needed (a pressing force or a mass to move). Solved with the formula instead of the graph, all three examples land on SMC's bore." },
        {
          table: {
            head: ["Example", "Conditions", "Area needed", "Bore"],
            rows: [
              ["1", "Press 1000 N statically, η 0.7, 0.5 MPa, extend", "1000 ÷ (0.7 × 0.5) = 2857 mm² (ø60.3 or more)", "ø63"],
              ["2", "Move 30 kg horizontally on a guide, η 1, 0.4 MPa, retract", "294 N ÷ 0.4 = 735 mm²", "ø40 (rod 14, retract 1103 mm²)"],
              ["3", "Pull 100 kg vertically upward, η 0.5, 0.5 MPa, retract", "981 N ÷ 0.25 = 3923 mm²", "ø80 (rod 25, retract 4536 mm²)"],
            ],
            plain: true,
          },
        },
        { p: "Examples 2 and 3 use the retract side: when the load moves both ways the smaller retract area governs, and example 3 lifts by pulling. If the pressure in example 3 dropped to 0.4 MPa, the area needed would be 4903 mm², too much for ø80 (4536 mm² retract), and you would need ø100 — so enter the lower pressure." },
        { h: "Reading SMC's theoretical output table" },
        { p: "SMC's «Theoretical Output Table» (Data 3) gives area and output at 0.2–1.0 MPa for each bore and rod. Areas are rounded to three significant figures before multiplying by pressure, and outputs are rounded to three figures again, so the last digit can differ from the calculator. Rod diameter varies by series even for the same bore (ø40 has rows for 14 and 16 mm rods), so use your cylinder's catalogue value." },
        {
          table: {
            head: ["Bore / rod", "Extend mm²", "Retract mm²", "0.5 MPa extend N", "0.5 MPa retract N"],
            rows: [
              ["ø32 / 12", "804", "691", "402", "346"],
              ["ø40 / 14", "1,260", "1,100", "630", "550"],
              ["ø50 / 20", "1,960", "1,650", "980", "825"],
              ["ø63 / 20", "3,120", "2,800", "1,560", "1,400"],
              ["ø80 / 25", "5,030", "4,540", "2,520", "2,270"],
              ["ø100 / 30", "7,850", "7,150", "3,930", "3,580"],
            ],
          },
        },
        { h: "What the calculation leaves out" },
        {
          ul: [
            "Speed and impact: theoretical output is a static force. Stopping the load at the end of stroke is a kinetic energy question for the cushion (the catalogue's allowable kinetic energy).",
            "Side load: let a guide, not the cylinder, take forces across the rod. SMC's example 2 uses load factor 1 precisely because the load runs on a guide.",
            "Air consumption and piping: fast motion needs valves, tubing and supply flow to match.",
          ],
        },
        { h: "In PortDock" },
        {
          ul: [
            "«Pneumatic Cylinder Force Calculator» web tool: bore, rod and pressure (MPa, bar, kgf/cm², psi) → extend and retract theoretical output and force × load factor; pick a bore from SMC's table for a force or mass.",
            "«Pressure Unit Converter» web tool: convert regulator and gauge readings (bar, kgf/cm², psi) to MPa.",
            "Serial Plotter and Modbus Master: log a pressure sensor (4–20 mA → analog input → Modbus) to see how far the supply pressure drops while cylinders move.",
          ],
        },
      ],
    },
  },
  // 볼스크류 — THK 종합 카탈로그 515-1E(A15 식, B15 선정 예제). 숫자는 lib/ballscrew 로 계산(ballscrew.test.ts).
  {
    slug: "ball-screw-torque-motor",
    date: "2026-10-24",
    tools: ["modbus-master", "plot"],
    related: ["vfd-frequency-rpm", "motor-current-breaker-cable", "pneumatic-cylinder-force"],
    webTools: ["tools/ball-screw/", "tools/encoder/", "tools/motor-speed/"],
    title: { ko: "볼스크류 토크와 서보 모터 고르기 — 축 하중·회전수·가속 토크·실효 토크", en: "Ball screw torque and servo motor sizing — axial load, speed, acceleration torque, RMS torque" },
    seoTitle: { ko: "볼스크류 토크 계산 — 수평·수직 축 하중과 서보 모터 선정 — PortDock", en: "Ball Screw Torque Calculation: Axial Load, Servo Sizing — PortDock" },
    desc: {
      ko: "볼스크류 구동 토크 T = Fa × 리드 ÷ (2π × 효율). 수평·수직 축 하중, 모터 회전수, 부하 관성과 가속 토크, 실효 토크까지 THK 카탈로그 예제 두 개로 따라갑니다.",
      en: "Ball screw torque T = Fa × lead ÷ (2π × efficiency): axial load, motor speed, inertia, acceleration and RMS torque, worked through two THK catalogue examples.",
    },
    body: {
      ko: [
        { p: "볼스크류 축에 서보 모터를 고를 때는 «최고 회전수», «가속할 때의 최대 토크», «한 사이클의 실효 토크» 세 가지를 봅니다. 이 글은 THK 종합 카탈로그 «Ball Screw»(515-1E)의 식과 선정 예제를 차례로 따라갑니다. 숫자는 PortDock 계산기로 다시 계산한 값이고, 카탈로그 값과 1 % 안쪽으로 맞습니다." },
        { h: "1. 축 하중 Fa" },
        { p: "나사가 받는 축 방향 힘입니다. 수평이면 안내면 마찰과 가속에 드는 힘, 수직이면 무게가 더해집니다(THK 식 18~29, α = 최고 속도 ÷ 가속 시간)." },
        { code: "수평: 가속 Fa1 = μ·m·g + f + m·α,  등속 Fa2 = μ·m·g + f,  감속 Fa3 = μ·m·g + f − m·α\n수직(올라감): Fa = m·g + f (± m·α)\n수직(내려감): Fa = m·g − f (∓ m·α)\n\nTHK 수평 예제: m 80 kg, μ 0.003, f 15 N, 1 m/s, 가속 0.15 s → α 6.67 m/s²\n  Fa1 = 550 N,  Fa2 = 17 N,  Fa3 = −516 N\nTHK 수직 예제: m 50 kg, f 20 N, 0.3 m/s, 가속 0.2 s → α 1.5 m/s²\n  올라감 585 · 510 · 435 N,  내려감 395 · 470 · 545 N" },
        { p: "수평 축은 등속 중 하중이 아주 작고(17 N) 가속·감속 때 크다는 점, 수직 축은 등속 중에도 무게(약 490 N)를 늘 받는다는 점이 다릅니다." },
        { h: "2. 모터 회전수와 리드" },
        { code: "NM = V(m/s) × 1000 × 60 ÷ 리드 Ph(mm) ÷ A     (A = 나사 회전 ÷ 모터 회전, 직결 1)\n\n1 m/s, 리드 20 → 3,000 min⁻¹\n1 m/s, 리드 40 → 1,500 min⁻¹\n0.3 m/s, 리드 10 → 1,800 min⁻¹" },
        { p: "THK 수평 예제는 모터 정격 3,000 min⁻¹ 로 1 m/s 를 내려면 리드가 20 mm 이상이어야 한다고 계산하고, 나사축의 위험 속도·DN 값을 검토한 끝에 축 지름 20 mm·리드 40 mm 를 고릅니다. 같은 식으로 필요한 엔코더 분해능도 나옵니다: 최소 이송 0.02 mm 에 리드 20 mm 면 20 ÷ 0.02 = 1,000 p/rev." },
        { h: "3. 등속 토크" },
        { code: "T1 = Fa × Ph ÷ (2π × η) × A     (N·mm, η 볼스크류 효율 0.9~0.95)\n\n수평 예제: 17 × 40 ÷ (2π × 0.9) = 120 N·mm\n수직 예제(올라감): 510 × 10 ÷ (2π × 0.9) = 900 N·mm\n수직 예제(내려감): 470 × 10 ÷ (2π × 0.9) = 830 N·mm" },
        { p: "식을 뒤집으면 토크로 낼 수 있는 추력이 됩니다: Fa = 2π × η × T ÷ Ph. 1 N·m(1000 N·mm), 리드 10 mm, 효율 0.9 면 약 565 N 입니다. 예압이 있는 나사는 예압 토크를, 지지 베어링·오일 실의 마찰 토크도 더합니다(THK 식 45)." },
        { h: "4. 부하 관성과 가속 토크" },
        { code: "J = m × (Ph ÷ 2π)² × A² × 10⁻⁶ + JS × A²       (kg·m²)\nω′ = 2π × NM ÷ (60 × t1)                       (rad/s²)\nT3 = (J + Jm) × ω′                              (Jm 모터 관성)\n\n수평 예제: J = 80 × (40 ÷ 2π)² × 10⁻⁶ + 1.48 × 10⁻⁴ = 3.39 × 10⁻³ kg·m²\n  ω′ = 2π × 1500 ÷ (60 × 0.15) = 1,047 rad/s²\n  T3 = (3.39 + 1) × 10⁻³ × 1,047 ≈ 4.60 N·m" },
        { p: "나사축 관성 JS 는 카탈로그 치수표의 «단위 길이당 관성»(예제는 1.23 × 10⁻³ kg·cm²/mm)에 축 길이(1,200 mm)를 곱합니다. 리드가 두 배가 되면 질량의 관성 항은 네 배가 됩니다 — 리드를 키우면 회전수는 줄지만 같은 질량을 가속하는 데 드는 토크는 늘 수 있습니다." },
        { h: "5. 가속·등속·감속 토크와 최대 토크" },
        {
          table: {
            head: ["구간", "수평 예제 (N·mm)", "수직 예제 올라감 / 내려감 (N·mm)"],
            rows: [
              ["가속", "등속 + T3 = 4,720 (카탈로그 4,730)", "1,098 (1,100) / 636 (630)"],
              ["등속", "123 (120)", "902 (900) / 832 (830)"],
              ["감속", "등속 − T3 = −4,474 (−4,490)", "707 (700) / 1,028 (1,030)"],
            ],
            plain: true,
          },
        },
        { p: "수평 축의 감속 토크는 음수(모터가 제동)입니다. 수직 축은 내려갈 때 무게가 나사를 돌리려 해서 가속에서는 T3 를 빼고 감속에서는 더합니다 — 그래서 내려가며 멈출 때 토크(1,030 N·mm)가 올라가며 멈출 때(700)보다 큽니다. 가장 큰 값(수평 4,730, 수직 1,100 N·mm)이 모터의 순간 최대 토크 안에 있어야 합니다." },
        { h: "6. 실효 토크 — 정격 토크와 비교" },
        { code: "Trms = √(Σ T² × t ÷ Σ t)\n\n수평 예제: 가속 0.15 s, 등속 0.85 s, 감속 0.15 s, 정지 2.6 s\n  √((4730² × 0.15 + 120² × 0.85 + 4490² × 0.15 + 0) ÷ 3.75) = 1,305 N·mm\n수직 예제: 올라감 0.2·1.8·0.2 s, 내려감 0.2·1.8·0.2 s, 정지 7.6 s(공작물을 뺀 40 kg 을 버팀 658 N·mm)\n  = 743 N·mm" },
        { p: "실효 토크가 모터 정격 토크 안에 들어야 합니다. 수평 예제처럼 가속 토크가 크고 정지 시간이 짧은 축은 실효 토크가 커지고, 수직 축은 정지 중에도 버티는 토크가 실효 토크에 들어갑니다(브레이크로 잡으면 이 몫은 줄어듭니다)." },
        { h: "7. 관성 비" },
        { p: "THK 예제는 모터에 걸리는 관성(수평 3.39 × 10⁻³, 수직 1.58 × 10⁻⁴ kg·m²)을 적고, «보통 모터 관성이 부하 관성의 1/10 이상이어야 하며 값은 모터 제조사마다 다르다» 고 덧붙입니다. 실제 허용 관성 비는 쓰는 서보 모터·드라이브 매뉴얼의 값을 봅니다." },
        { h: "PortDock 에서는" },
        {
          ul: [
            "웹 도구 «볼스크류 토크·모터 선정 계산기»: 질량·마찰·속도·가속 시간·리드·감속비·관성 → 축 하중, 모터 회전수, 가속·등속·감속 토크, 정지 토크(수직), 최대·실효 토크. 기본값이 THK 수평 예제입니다.",
            "웹 도구 «엔코더 펄스 ↔ rpm 계산기»: 서보 모터 엔코더 분해능·체배와 회전수·펄스 주파수.",
            "Modbus Master: Modbus 를 지원하는 서보 드라이브의 모니터 레지스터(부하율·실효 토크·회전수 등 — 드라이브 매뉴얼 주소)를 폴링해 계산한 값과 운전 중 값을 나란히 봅니다.",
          ],
        },
      ],
      en: [
        { p: "Sizing a servo motor for a ball screw axis comes down to three numbers: maximum speed, peak torque while accelerating, and RMS torque over a cycle. This guide follows the formulas and selection examples in THK's general catalogue «Ball Screw» (515-1E). The numbers were recalculated with PortDock's calculator and agree with the catalogue within 1 %." },
        { h: "1. Axial load Fa" },
        { p: "The force along the screw. Horizontally it is guide friction plus the force to accelerate; vertically the weight is added (THK equations 18–29, α = maximum speed ÷ acceleration time)." },
        { code: "Horizontal: accel Fa1 = μ·m·g + f + m·α,  constant Fa2 = μ·m·g + f,  decel Fa3 = μ·m·g + f − m·α\nVertical (up):   Fa = m·g + f (± m·α)\nVertical (down): Fa = m·g − f (∓ m·α)\n\nTHK horizontal example: m 80 kg, μ 0.003, f 15 N, 1 m/s, 0.15 s → α 6.67 m/s²\n  Fa1 = 550 N,  Fa2 = 17 N,  Fa3 = −516 N\nTHK vertical example: m 50 kg, f 20 N, 0.3 m/s, 0.2 s → α 1.5 m/s²\n  up 585 · 510 · 435 N,  down 395 · 470 · 545 N" },
        { p: "A horizontal axis carries very little at constant speed (17 N) and a lot while accelerating or braking; a vertical axis always carries its weight (about 490 N), even at constant speed." },
        { h: "2. Motor speed and lead" },
        { code: "NM = V (m/s) × 1000 × 60 ÷ lead Ph (mm) ÷ A     (A = screw turns ÷ motor turns, 1 for direct drive)\n\n1 m/s, 20 mm lead → 3,000 min⁻¹\n1 m/s, 40 mm lead → 1,500 min⁻¹\n0.3 m/s, 10 mm lead → 1,800 min⁻¹" },
        { p: "THK's horizontal example works out that a 3,000 min⁻¹ rated motor needs a lead of at least 20 mm for 1 m/s, then, after checking critical speed and DN value, chooses a 20 mm shaft with a 40 mm lead. The same formula gives the encoder resolution needed: 0.02 mm minimum feed on a 20 mm lead is 20 ÷ 0.02 = 1,000 p/rev." },
        { h: "3. Constant-speed torque" },
        { code: "T1 = Fa × Ph ÷ (2π × η) × A     (N·mm, η ball screw efficiency 0.9–0.95)\n\nHorizontal example: 17 × 40 ÷ (2π × 0.9) = 120 N·mm\nVertical example (up):   510 × 10 ÷ (2π × 0.9) = 900 N·mm\nVertical example (down): 470 × 10 ÷ (2π × 0.9) = 830 N·mm" },
        { p: "Turned around, it gives the thrust a torque can deliver: Fa = 2π × η × T ÷ Ph. 1 N·m (1000 N·mm) with a 10 mm lead and 0.9 efficiency is about 565 N. For a preloaded screw add the preload torque, and add support bearing and oil seal friction too (THK equation 45)." },
        { h: "4. Load inertia and acceleration torque" },
        { code: "J = m × (Ph ÷ 2π)² × A² × 10⁻⁶ + JS × A²       (kg·m²)\nω′ = 2π × NM ÷ (60 × t1)                       (rad/s²)\nT3 = (J + Jm) × ω′                              (Jm motor inertia)\n\nHorizontal example: J = 80 × (40 ÷ 2π)² × 10⁻⁶ + 1.48 × 10⁻⁴ = 3.39 × 10⁻³ kg·m²\n  ω′ = 2π × 1500 ÷ (60 × 0.15) = 1,047 rad/s²\n  T3 = (3.39 + 1) × 10⁻³ × 1,047 ≈ 4.60 N·m" },
        { p: "Screw shaft inertia JS is the dimension table's inertia per unit length (1.23 × 10⁻³ kg·cm²/mm in the example) times shaft length (1,200 mm). Doubling the lead quadruples the mass term — a longer lead lowers motor speed but can raise the torque needed to accelerate the same mass." },
        { h: "5. Accel, constant and decel torque, and peak torque" },
        {
          table: {
            head: ["Phase", "Horizontal example (N·mm)", "Vertical example up / down (N·mm)"],
            rows: [
              ["Accelerating", "constant + T3 = 4,720 (catalogue 4,730)", "1,098 (1,100) / 636 (630)"],
              ["Constant speed", "123 (120)", "902 (900) / 832 (830)"],
              ["Decelerating", "constant − T3 = −4,474 (−4,490)", "707 (700) / 1,028 (1,030)"],
            ],
            plain: true,
          },
        },
        { p: "On the horizontal axis the deceleration torque is negative (the motor brakes). On the vertical axis the weight tries to turn the screw on the way down, so T3 is subtracted while accelerating down and added while decelerating — stopping on the way down (1,030 N·mm) takes more than stopping on the way up (700). The largest value (4,730 horizontal, 1,100 N·mm vertical) must be within the motor's instantaneous maximum torque." },
        { h: "6. RMS torque — compare with rated torque" },
        { code: "Trms = √(Σ T² × t ÷ Σ t)\n\nHorizontal example: accel 0.15 s, constant 0.85 s, decel 0.15 s, dwell 2.6 s\n  √((4730² × 0.15 + 120² × 0.85 + 4490² × 0.15 + 0) ÷ 3.75) = 1,305 N·mm\nVertical example: up 0.2·1.8·0.2 s, down 0.2·1.8·0.2 s, dwell 7.6 s (holding 40 kg without the work, 658 N·mm)\n  = 743 N·mm" },
        { p: "The RMS torque must be within the motor's rated torque. An axis with large acceleration torque and short dwell, like the horizontal example, has a high RMS torque; on a vertical axis the holding torque at rest counts too (a brake holding the load removes that part)." },
        { h: "7. Inertia ratio" },
        { p: "THK's examples state the inertia at the motor (3.39 × 10⁻³ horizontal, 1.58 × 10⁻⁴ kg·m² vertical) and add that the motor normally needs an inertia of at least one tenth of that, though the value varies by motor maker. Use the allowable inertia ratio from your servo motor and drive manual." },
        { h: "In PortDock" },
        {
          ul: [
            "«Ball Screw Torque & Motor Sizing Calculator» web tool: mass, friction, speed, acceleration time, lead, gear ratio and inertia → axial load, motor speed, accel/constant/decel torque, holding torque (vertical), peak and RMS torque. The defaults are THK's horizontal example.",
            "«Encoder Pulses ↔ RPM Calculator» web tool: servo encoder resolution, quadrature and speed versus pulse frequency.",
            "Modbus Master: poll a Modbus-capable servo drive's monitor registers (load ratio, effective torque, speed and so on — addresses from the drive manual) to put the calculated values next to the running values.",
          ],
        },
      ],
    },
  },
];
