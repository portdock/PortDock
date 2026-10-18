// 가이드 글 — 검색으로 들어오는 현장 질문에 답한다. 예시 바이트·CRC 는 lib/checksum.ts 로 계산해 확인한 값만 쓴다.
import type { Lang } from "./tools";

/** 본문 덩어리: 문단 · 소제목 · 목록 · 코드(바이트) · 표 */
export type Block =
  | { p: string }
  | { h: string }
  | { ul: string[] }
  | { code: string }
  | { table: { head: string[]; rows: string[][] } };

export interface Guide {
  slug: string;
  date: string;
  /** 이 글과 이어지는 도구(id) */
  tool: "serial" | "modbus-slave" | "tcp" | "udp" | "simulator";
  title: Record<Lang, string>;
  desc: Record<Lang, string>;
  body: Record<Lang, Block[]>;
}

export const GUIDES: Guide[] = [
  {
    slug: "modbus-rtu-frame",
    date: "2026-10-17",
    tool: "serial",
    title: { ko: "Modbus RTU 프레임 읽는 법 — 요청·응답·예외·CRC", en: "Reading Modbus RTU frames — request, response, exception, CRC" },
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
        { h: "프레임 사이 조용한 시간" },
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
    tool: "modbus-slave",
    title: { ko: "USB-시리얼 변환기 지연 — 프레임이 쪼개지고 응답이 늦는 이유", en: "USB-serial adapter latency — why frames split and replies arrive late" },
    desc: {
      ko: "USB 변환기는 받은 바이트를 바로 넘기지 않고 묶어서 보냅니다. FTDI 의 Latency Timer 16 ms 가 Modbus RTU 프레임 구분과 응답 시간에 주는 영향과 대처법.",
      en: "USB adapters batch received bytes instead of passing them on immediately. How the FTDI 16 ms latency timer affects Modbus RTU framing and response times, and what to do.",
    },
    body: {
      ko: [
        { p: "USB 는 정해진 주기로 데이터를 묶어 주고받습니다. 그래서 USB-시리얼 변환기는 선로에서 받은 바이트를 하나씩 바로 PC 로 넘기지 않고, 버퍼가 차거나 일정 시간이 지나면 한꺼번에 넘깁니다. FTDI 칩은 이 시간을 «Latency Timer» 라고 부르며 기본값이 16 ms 입니다." },
        { h: "무엇이 문제인가" },
        { ul: ["프레임이 쪼개집니다: 9600 bps 에서 17바이트 요청은 선로에서 약 19 ms 걸립니다. 변환기가 16 ms 마다 넘기면 PC 에는 두 덩어리로 도착하고, 그 사이 틈이 3.5 문자(4 ms)보다 길어 RTU 프레임이 둘로 나뉩니다. 두 조각 모두 CRC 가 틀려 버려집니다.", "프레임이 합쳐집니다: 반대로 짧은 응답 여러 개가 한 덩어리로 묶여 와서 하나처럼 보일 수 있습니다.", "응답이 늦습니다: 요청을 보내고 받는 데 최대 몇십 ms 가 더 걸립니다. 타임아웃을 짧게 잡은 마스터는 «응답 없음» 으로 봅니다."] },
        { h: "대처법" },
        { ul: ["FTDI: 장치 관리자 → 포트(COM) → 해당 포트 속성 → 포트 설정 → 고급 → Latency Timer 를 16 에서 1~4 ms 로 낮춥니다. 다른 칩(CH340·CP210x 등)은 드라이버마다 설정이 다릅니다.", "프레임을 시간 말고 길이로 끊습니다: Modbus 요청은 함수 번호로 길이를 알 수 있습니다(읽기·단일 쓰기 8바이트, 여러 개 쓰기 7 + 바이트 수 + 2). PortDock Modbus Slave 는 이 방식으로 요청을 다시 합치고, USB 포트이면 최소 간격을 20 ms 로 잡습니다.", "프레임 구분 시간을 넉넉히: 시간으로 끊는 도구라면 USB 변환기에서는 조용한 시간을 20 ms 안팎으로 둡니다. PortDock Serial 은 USB 포트에서 이 점을 안내합니다.", "마스터 타임아웃에 여유를: 장비 응답 시간 + 변환기 지연(왕복 최대 2 × Latency Timer)을 더해 잡습니다."] },
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
    tool: "serial",
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
];
