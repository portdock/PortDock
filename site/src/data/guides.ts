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
    related: ["modbus-address-notation", "modbus-function-codes", "modbus-no-response", "usb-serial-latency"],
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
    related: ["rs232-rs422-rs485", "modbus-no-response", "usb-serial-latency", "modbus-rtu-frame"],
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
    related: ["modbus-tcp-connection", "rs485-wiring", "modbus-address-notation", "usb-serial-latency"],
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
    related: ["modbus-rtu-frame", "modbus-address-notation", "modbus-float-word-order"],
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
    webTools: ["tools/modbus-float/", "tools/modbus-decoder/"],
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
    related: ["modbus-no-response", "modbus-function-codes", "modbus-address-notation"],
    webTools: ["tools/modbus-decoder/"],
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
    related: ["rs485-wiring", "usb-serial-latency", "modbus-rtu-frame"],
    webTools: ["tools/web-serial/"],
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
    related: ["pt100-thermocouple-wiring", "modbus-float-word-order"],
    webTools: ["tools/4-20ma/"],
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
    related: ["4-20ma-loop", "modbus-float-word-order"],
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
];
