// 가이드 글 — 검색으로 들어오는 현장 질문에 답한다. 예시 바이트·CRC 는 lib/checksum.ts 로 계산해 확인한 값만 쓴다.
import type { Lang, Tool } from "./tools";

/** 본문 덩어리: 문단 · 소제목 · 목록 · 코드(바이트) · 표 */
export type Block =
  | { p: string }
  | { h: string }
  | { ul: string[] }
  | { code: string }
  /** 표 — 첫 칸은 바이트·코드라 고정폭 글꼴, 글로 된 첫 칸이면 plain */
  | { table: { head: string[]; rows: string[][]; plain?: boolean } };

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
    related: ["modbus-address-notation", "modbus-no-response", "usb-serial-latency"],
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
              ["38400", "0.29 ms", "1.0 ms", "2.3 ms"],
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
              ["38400", "0.29 ms", "1.0 ms", "2.3 ms"],
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
    related: ["modbus-no-response", "modbus-rtu-frame", "rs485-wiring"],
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
    related: ["modbus-no-response", "usb-serial-latency", "modbus-rtu-frame"],
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
        { h: "3. 바이어스(Fail-safe)" },
        { p: "아무도 보내지 않을 때 선로가 떠 있으면 수신기가 잡음을 데이터로 읽어 엉뚱한 바이트(흔히 00·FF)가 들어옵니다. 마스터 쪽이나 변환기에 바이어스 저항(풀업·풀다운)이 있는지 확인합니다. 많은 USB-RS485 변환기는 스위치나 점퍼로 켭니다." },
        { h: "4. 공통 접지(GND)" },
        { p: "«두 선이면 된다» 고 하지만, 장비끼리 접지 전위가 다르면 수신기 허용 범위를 넘어 통신이 끊기거나 장비가 상할 수 있습니다. 세 번째 선(신호 접지)을 함께 연결하는 것이 안전합니다." },
        { h: "5. 배선 모양: 한 줄로 이어 가기" },
        { p: "RS-485 는 장비를 한 줄로 차례로 잇는(데이지 체인) 방식이 기본입니다. 한 점에서 여러 갈래로 뻗는 별(스타) 모양이나 긴 가지선은 반사를 만듭니다. 표준 송수신기 기준으로 한 선로에 32대(단위 부하)까지, 길이는 느린 속도에서 약 1200 m 까지가 일반적인 기준입니다." },
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
        { h: "3. Biasing (fail-safe)" },
        { p: "When nobody transmits, a floating line lets receivers read noise as data, producing stray bytes (often 00 or FF). Check that the master or the adapter provides bias resistors (pull-up/pull-down). Many USB-RS485 adapters enable them with a switch or jumper." },
        { h: "4. Common ground" },
        { p: "«Two wires are enough» is a common belief, but if the devices' ground potentials differ, the receivers' common-mode range can be exceeded, breaking communication or even damaging devices. Connecting a third wire for signal ground is the safe choice." },
        { h: "5. Topology: daisy chain" },
        { p: "RS-485 expects devices to be chained one after another. Star wiring or long stubs create reflections. With standard transceivers the usual limits are 32 devices (unit loads) per line and about 1200 m at low speeds." },
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
    related: ["rs485-wiring", "modbus-address-notation", "usb-serial-latency"],
    webTools: ["tools/modbus/", "tools/checksum/"],
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
        { p: "하나라도 다르면 장비가 바이트를 제대로 읽지 못해 답하지 않거나, 답이 와도 CRC 가 틀립니다. 출하값은 장비마다 다릅니다. 이 사이트의 장비 10종만 봐도 9600 bps 가 많지만 LS ELECTRIC GIMAC1000 은 38400 bps, 루텍 Accura 3300E·2300 은 짝수 패리티, 오토닉스 TK·TX·MT4W 는 정지 비트 2 가 출하값입니다." },
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
            "응답 기다림(타임아웃)을 넉넉히: 9600 bps 에서 125 레지스터 응답은 전송에만 약 270 ms 가 걸립니다. 게이트웨이·무선 구간은 더 깁니다.",
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
        { p: "If any of these differ, the device cannot read the bytes and stays silent, or its reply fails the CRC. Factory defaults vary: among the ten devices on this site most use 9600 bps, but the LS ELECTRIC GIMAC1000 ships at 38400 bps, the Rootech Accura 3300E and 2300 use even parity, and the Autonics TK, TX and MT4W use two stop bits." },
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
            "Allow enough response time: at 9600 bps a 125-register reply takes about 270 ms on the wire alone. Gateways and radio links add more.",
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
    related: ["modbus-rtu-frame", "modbus-no-response"],
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
];
