// 고장 원인 찾기 도우미(/tools/troubleshoot/)의 질문 나무. 증상 → 예/아니오(또는 몇 갈래) 질문 → 끝 노드(원인 후보·확인 방법·링크).
// 규칙(lib/troubleshoot.test.ts 가 검사): 모든 노드가 어느 증상에서든 닿고, 막다른 곳·되돌아오는 고리가 없고,
// 링크는 guides.ts 의 슬러그·webTools.ts 의 경로·tools.ts 의 앱 id 로 실제 있는 것만. 문구는 «원인 후보» — 확정하지 않는다.
// 숫자(멀티미터 값)는 lib/meterCheck.ts 와 같은 경계를 쓴다.
import type { TreeData } from "../lib/troubleshoot.ts";

const Y = { ko: "예", en: "Yes" };
const N = { ko: "아니오", en: "No" };
const yn = (yes: string, no: string) => [
  { a: Y, next: yes },
  { a: N, next: no },
];

export const TREE: TreeData = {
  symptoms: [
    { id: "rs485", start: "rs485-any", name: { ko: "RS-485·Modbus RTU 응답 없음·깨짐", en: "RS-485 / Modbus RTU: no reply or garbled" } },
    { id: "rs232", start: "rs232-seen", name: { ko: "RS-232 통신이 안 됨", en: "RS-232 not communicating" } },
    { id: "tcp", start: "tcp-ping", name: { ko: "Modbus TCP·이더넷 장비 연결 안 됨", en: "Modbus TCP / Ethernet device won't connect" } },
    { id: "usb", start: "usb-sound", name: { ko: "USB-시리얼 변환기 인식 안 됨·끊김", en: "USB-serial adapter not detected or dropping" } },
    { id: "ma", start: "ma-kind", name: { ko: "4-20mA 값이 이상함", en: "4–20 mA reading looks wrong" } },
    { id: "sensor", start: "sn-kind", name: { ko: "NPN/PNP 센서 입력이 안 들어옴", en: "NPN/PNP sensor input not seen" } },
    { id: "mc", start: "mc-ping", name: { ko: "MC 프로토콜(미쓰비시) 연결 안 됨", en: "MC protocol (Mitsubishi) won't connect" } },
    { id: "pcusb", start: "pu-know", name: { ko: "PC 의 USB 장치가 자꾸 끊김", en: "A USB device on the PC keeps disconnecting" } },
  ],
  nodes: [
    // ============================================================ ① RS-485 · Modbus RTU
    {
      id: "rs485-any",
      q: { ko: "아무 응답도 오지 않나요?", en: "Is there no reply at all?" },
      hint: { ko: "«아니오» = 가끔 오거나, 오긴 하는데 깨진 바이트가 섞임", en: "«No» = replies come sometimes, or arrive with garbled bytes" },
      opts: yn("rs485-txled", "rs485-garbled"),
    },
    {
      id: "rs485-txled",
      q: { ko: "요청을 보낼 때 변환기의 TX(송신) LED 가 깜빡이나요?", en: "Does the adapter's TX LED blink when a request is sent?" },
      hint: { ko: "LED 가 없으면 PortDock Serial 의 기록에 보낸 바이트가 찍히는지로 대신", en: "No LED? Check that the sent bytes appear in the PortDock Serial log instead" },
      opts: yn("rs485-settings", "r-rs485-port"),
    },
    {
      id: "rs485-settings",
      q: { ko: "보율·패리티·정지 비트·국번을 장비 화면(또는 매뉴얼) 값과 하나씩 맞춰 봤나요?", en: "Have you matched baud, parity, stop bits and slave ID one by one against the device's own setting screen (or manual)?" },
      opts: yn("rs485-swap", "r-rs485-settings"),
    },
    {
      id: "rs485-swap",
      q: { ko: "A·B(D+·D−) 두 선을 서로 바꿔 이으면 응답이 오나요?", en: "If you swap the A and B (D+/D−) wires, does a reply come?" },
      hint: { ko: "바꿔 이어도 장비는 상하지 않습니다", en: "Swapping them does not damage devices" },
      opts: yn("r-rs485-polarity", "rs485-single"),
    },
    {
      id: "rs485-single",
      q: { ko: "장비 한 대만 짧은 선으로 변환기에 바로 이으면 응답이 오나요?", en: "With just one device on a short cable straight to the adapter, does it reply?" },
      opts: yn("r-rs485-bus", "r-rs485-device"),
    },
    {
      id: "rs485-garbled",
      q: { ko: "받은 바이트가 깨져 보이나요(CRC 오류·엉뚱한 글자)?", en: "Do the received bytes look corrupted (CRC errors, odd characters)?" },
      hint: { ko: "«아니오» = 바이트는 멀쩡한데 응답이 가끔 빠짐(타임아웃)", en: "«No» = bytes look fine but replies are sometimes missing (timeouts)" },
      opts: yn("rs485-slower", "rs485-timeout"),
    },
    {
      id: "rs485-slower",
      q: { ko: "보율을 낮추거나 선을 짧게 하면 깨짐이 줄어드나요?", en: "Does lowering the baud rate or shortening the cable reduce the corruption?" },
      opts: yn("r-rs485-signal", "r-rs485-framing"),
    },
    {
      id: "rs485-timeout",
      q: { ko: "응답 대기 시간(타임아웃)을 늘리면(예: 1000 ms) 빠지는 응답이 줄어드나요?", en: "Does a longer response timeout (e.g. 1000 ms) reduce the missing replies?" },
      opts: yn("r-rs485-timing", "r-rs485-idle"),
    },
    {
      id: "r-rs485-port",
      title: { ko: "요청이 PC 밖으로 나가지 않음 — 포트·드라이버 쪽", en: "The request never leaves the PC — port or driver side" },
      causes: [
        { ko: "다른 COM 번호를 열었음(변환기를 다른 USB 포트에 꽂으면 번호가 바뀜)", en: "The wrong COM number is open (it changes when the adapter moves to another USB port)" },
        { ko: "다른 프로그램(SCADA·이전 터미널)이 같은 포트를 쥐고 있음", en: "Another program (SCADA, an earlier terminal) still holds the port" },
        { ko: "드라이버 문제(장치 관리자 느낌표·문제 코드)", en: "Driver problem (Device Manager warning mark or problem code)" },
        { ko: "변환기가 2선 RS-485 송신 방향 전환(자동 TX 제어)을 하지 않는 제품", en: "The adapter does not switch direction automatically for 2-wire RS-485" },
      ],
      checks: [
        { ko: "장치 관리자 «포트(COM & LPT)» 에서 변환기의 COM 번호를 확인하고 프로그램 설정과 맞추기", en: "Find the adapter's COM number under «Ports (COM & LPT)» in Device Manager and match the program setting" },
        { ko: "Port Inspector 에서 그 포트의 드라이버·문제 코드를 읽고, 2선 RS-485 에코 시험으로 송신이 나가는지 보기", en: "Read the port's driver and problem code in Port Inspector, and run the 2-wire RS-485 echo test to see whether anything is transmitted" },
        { ko: "멀티미터(V⎓)로 A–B 를 재며 요청을 연달아 보내면 값이 흔들려야 함 — 그대로면 송신이 나가지 않는 것", en: "With a meter (V⎓) across A–B, sending requests repeatedly should make the reading jump — if it stays still, nothing is transmitted" },
      ],
      links: [
        { k: "app", to: "port-inspector" },
        { k: "app", to: "serial" },
        { k: "guide", to: "usb-serial-disconnects" },
      ],
    },
    {
      id: "r-rs485-settings",
      title: { ko: "통신 설정이 다를 가능성이 큼", en: "Communication settings likely differ" },
      causes: [
        { ko: "보율 또는 패리티가 다름(예: 장비 8E1, 프로그램 8N1)", en: "Baud rate or parity differs (e.g. device 8E1, program 8N1)" },
        { ko: "국번(Slave ID)이 다르거나 0(방송)으로 보냄 — 방송에는 응답하지 않음", en: "Slave ID differs, or 0 (broadcast) is used — broadcasts get no reply" },
        { ko: "장비의 통신 프로토콜이 Modbus RTU 가 아님(제조사 전용·ASCII), 또는 통신 설정을 바꾼 뒤 저장·재시작하지 않음", en: "The device protocol is not Modbus RTU (vendor protocol or ASCII), or settings were changed without saving and restarting" },
      ],
      checks: [
        { ko: "장비 파라미터 화면에서 통신 항목을 읽어 적고, 프로그램 값과 한 줄씩 대조하기", en: "Write down the communication parameters from the device screen and compare them line by line with the program" },
        { ko: "인버터는 «운전 지령 출처»·«통신 프로토콜 선택» 파라미터도 같이 보기", en: "For drives, also check the «run command source» and «protocol select» parameters" },
        { ko: "모르는 보율이면 Modbus Master 의 국번·보율 찾기로 훑어보기", en: "If the baud rate is unknown, sweep IDs and bauds with Modbus Master's scan" },
      ],
      links: [
        { k: "guide", to: "modbus-no-response" },
        { k: "guide", to: "vfd-modbus-setup" },
        { k: "web", to: "tools/modbus/" },
        { k: "app", to: "modbus-master" },
      ],
    },
    {
      id: "r-rs485-polarity",
      title: { ko: "A/B(+·−) 표기가 반대였음", en: "A/B (+/−) labelling was reversed" },
      causes: [
        { ko: "제조사마다 A·B 의 +·− 가 반대(Modbus 규격은 D1=B=+, D0=A=−)", en: "Vendors disagree on which of A/B is + (the Modbus spec says D1 = B = +, D0 = A = −)" },
        { ko: "여러 대 중 일부만 반대로 이어졌을 수 있음 — 바꾼 뒤 다른 장비가 응답하지 않으면 그 장비 쪽 표기를 볼 것", en: "Only some devices may be reversed — if others stop replying after the swap, check their labels" },
      ],
      checks: [
        { ko: "전원 켜고 폴링을 멈춘 채, 빨강을 B(D1·+)·검정을 A(D0·−)에 대면 바이어스가 있을 때 +200 mV 이상", en: "Power on, polling stopped: red on B (D1·+), black on A (D0·−) should read +200 mV or more when bias is present" },
        { ko: "바꾼 상태를 배선도에 적어 두기(다음 사람이 다시 바꾸지 않게)", en: "Record the swapped state on the wiring diagram so nobody swaps it back" },
      ],
      links: [
        { k: "guide", to: "rs485-multimeter-check" },
        { k: "guide", to: "rs485-wiring" },
        { k: "web", to: "tools/multimeter-check/", hash: "rs485-idle" },
        { k: "web", to: "tools/wiring/", hash: "tpl=rs485-2w" },
      ],
    },
    {
      id: "r-rs485-bus",
      title: { ko: "장비 하나는 되는데 버스로는 안 됨 — 버스 배선·구성 쪽", en: "One device works alone but not on the bus — bus wiring or layout" },
      causes: [
        { ko: "종단이 셋 이상(중간 장비의 종단 스위치 켜짐) 또는 없음", en: "Three or more terminations (a middle device's switch on), or none" },
        { ko: "국번이 겹친 장비가 둘 — 동시에 응답해 서로 깨뜨림", en: "Two devices share a slave ID and reply at once, corrupting each other" },
        { ko: "가지선(스터브)이 길거나 별 모양 배선, 중간 단자에서 끊김", en: "Long stubs or star wiring, or a break at an intermediate terminal" },
        { ko: "SG(공통)선이 없어 멀리 있는 장비의 공통 모드 전압이 범위를 벗어남", en: "No SG (common) wire, pushing distant devices outside the common-mode range" },
      ],
      checks: [
        { ko: "모든 장비 전원 끄고 A–B 저항: 약 60 Ω(양 끝 종단), 약 120 Ω(한쪽만), 수 kΩ 이상(없음), 40 Ω 이하(과다)", en: "All power off, A–B resistance: about 60 Ω (both ends), about 120 Ω (one end), several kΩ or more (none), 40 Ω or less (too many)" },
        { ko: "전원 켜고 A–SG·B–SG 가 −7~+12 V 안인지", en: "Power on: A–SG and B–SG within −7 to +12 V" },
        { ko: "장비를 한 대씩 더하며 어느 장비부터 안 되는지 보기, 국번 목록 적기", en: "Add devices back one at a time to see where it fails; list every slave ID" },
      ],
      links: [
        { k: "guide", to: "rs485-multimeter-check" },
        { k: "guide", to: "rs485-wiring" },
        { k: "guide", to: "rs485-bias-termination" },
        { k: "web", to: "tools/multimeter-check/", hash: "rs485-ohm" },
        { k: "web", to: "tools/rs485/" },
        { k: "web", to: "tools/system-diagram/" },
      ],
    },
    {
      id: "r-rs485-device",
      title: { ko: "장비 한 대로도 안 됨 — 장비 쪽 설정·통신부 또는 변환기", en: "Fails even with one device — device settings, comms port or adapter" },
      causes: [
        { ko: "장비 통신 설정이 저장되지 않았거나 재시작해야 적용됨", en: "Device settings not saved, or only applied after a restart" },
        { ko: "통신 옵션 카드·단자가 따로 있음(본체 단자가 아닌 옵션 쪽에 이어야 함), 2선/4선 모드 선택", en: "Comms are on an option card or separate terminals, or a 2-wire/4-wire mode setting" },
        { ko: "변환기 고장 또는 RS-485 가 아닌 RS-422/RS-232 단자에 이음", en: "Adapter fault, or wired to RS-422/RS-232 terminals instead of RS-485" },
      ],
      checks: [
        { ko: "Port Inspector 의 2선 RS-485 에코 시험으로 변환기 자체를 시험하기", en: "Test the adapter on its own with Port Inspector's 2-wire RS-485 echo test" },
        { ko: "다른 변환기나 다른 PC 로 같은 장비를 시험하기", en: "Try the same device with another adapter or PC" },
        { ko: "장비 매뉴얼에서 통신 단자 번호와 «통신 설정 적용 시점» 보기", en: "Look up the comms terminal numbers and when new settings take effect in the device manual" },
      ],
      links: [
        { k: "guide", to: "modbus-no-response" },
        { k: "guide", to: "vfd-modbus-setup" },
        { k: "app", to: "port-inspector" },
        { k: "app", to: "modbus-master" },
      ],
    },
    {
      id: "r-rs485-signal",
      title: { ko: "신호 품질 — 반사·잡음·길이", en: "Signal quality — reflections, noise, length" },
      causes: [
        { ko: "종단이 없거나 한쪽만 — 길고 빠른 선에서 반사", en: "No termination or only one end — reflections on long, fast lines" },
        { ko: "케이블이 길어 보율 한계를 넘음(대략 보율 × 길이 ≤ 10^8)", en: "Cable too long for the baud rate (roughly baud × metres ≤ 10^8)" },
        { ko: "꼬임선이 아니거나 동력선과 같은 덕트, 차폐 접지 없음", en: "Not twisted pair, run alongside power cables, or shield not grounded" },
      ],
      checks: [
        { ko: "전원 끄고 A–B 저항 약 60 Ω 인지", en: "Power off: A–B about 60 Ω" },
        { ko: "A–SG·B–SG 공통 모드 −7~+12 V, 모터가 돌 때도", en: "A–SG and B–SG common mode within −7 to +12 V, also while motors run" },
        { ko: "RS-485 계산기로 이 보율의 길이 한계 보기", en: "Check the length limit for this baud rate in the RS-485 calculator" },
      ],
      links: [
        { k: "guide", to: "field-noise-communication-errors" },
        { k: "guide", to: "cable-shield-grounding" },
        { k: "guide", to: "rs485-wiring" },
        { k: "guide", to: "rs485-bias-termination" },
        { k: "web", to: "tools/rs485/" },
        { k: "web", to: "tools/multimeter-check/", hash: "rs485-cm" },
      ],
    },
    {
      id: "r-rs485-framing",
      title: { ko: "프레임이 어긋남 — 설정·에코·쪼개짐", en: "Frames misaligned — settings, echo or splitting" },
      causes: [
        { ko: "보율·패리티가 조금 다름(일부 바이트만 맞아 보일 수 있음)", en: "Baud or parity slightly off (some bytes can still look right)" },
        { ko: "2선 변환기가 보낸 요청을 되돌려 받아(에코) 응답 앞에 붙음", en: "A 2-wire adapter echoes the request, which shows up in front of the reply" },
        { ko: "USB 지연으로 한 응답이 둘로 쪼개져 받는 쪽이 따로 풀이", en: "USB latency splits one reply in two and the receiver parses them separately" },
      ],
      checks: [
        { ko: "받은 바이트를 Modbus 프레임 해석기에 붙여 국번·함수·CRC 가 맞는지 보기", en: "Paste the received bytes into the Modbus frame decoder and check ID, function and CRC" },
        { ko: "Port Inspector 에서 변환기 에코 여부·FTDI 지연 타이머 보기", en: "Check adapter echo and the FTDI latency timer in Port Inspector" },
      ],
      links: [
        { k: "guide", to: "modbus-rtu-frame" },
        { k: "guide", to: "usb-serial-latency" },
        { k: "web", to: "tools/modbus-decoder/" },
        { k: "app", to: "port-inspector" },
      ],
    },
    {
      id: "r-rs485-timing",
      title: { ko: "시간 설정이 빠듯함 — 타임아웃·폴링 간격·USB 지연", en: "Timing too tight — timeout, poll interval, USB latency" },
      causes: [
        { ko: "장비 응답 시간보다 타임아웃이 짧음(인버터·전력 미터는 수십~수백 ms 걸리기도)", en: "Timeout shorter than the device's response time (drives and meters can take tens to hundreds of ms)" },
        { ko: "다음 요청을 너무 빨리 보내 장비가 앞 응답을 끝내기 전에 겹침", en: "Next request sent too soon, overlapping the previous reply" },
        { ko: "USB 변환기 지연 타이머(FTDI 기본 16 ms)가 짧은 프레임마다 더해짐", en: "The USB adapter latency timer (FTDI default 16 ms) adds to every short frame" },
      ],
      checks: [
        { ko: "시리얼 통신 시간 계산기로 요청·응답 시간과 타임아웃 하한 구하기", en: "Work out request/response time and the minimum timeout with the serial timing calculator" },
        { ko: "Port Inspector 로 지연 타이머 값 읽기", en: "Read the latency timer value with Port Inspector" },
      ],
      links: [
        { k: "guide", to: "modbus-rtu-timeout-polling" },
        { k: "guide", to: "usb-serial-latency" },
        { k: "web", to: "tools/serial-timing/" },
        { k: "app", to: "port-inspector" },
      ],
    },
    {
      id: "r-rs485-idle",
      title: { ko: "쉬는 동안 선이 떠 있거나 응답이 겹침 — 바이어스·국번", en: "Line floats while idle, or replies collide — bias or IDs" },
      causes: [
        { ko: "바이어스(페일세이프) 저항이 없어 쉬는 동안 잡음이 바이트로 읽힘", en: "No bias (fail-safe) resistors, so idle noise is read as bytes" },
        { ko: "국번이 같은 장비가 둘이라 가끔 겹침", en: "Two devices with the same ID occasionally collide" },
        { ko: "모터·인버터가 돌 때만 생기는 잡음(차폐·접지)", en: "Noise only while motors or drives run (shield, ground)" },
      ],
      checks: [
        { ko: "전원 켜고 폴링 멈춘 채 B–A 차동 전압 +200 mV 이상인지", en: "Power on, polling stopped: B–A differential +200 mV or more" },
        { ko: "구성도에 장비와 국번을 모두 적고 겹침 보기", en: "List every device and ID on a system diagram to spot duplicates" },
        { ko: "빠지는 시각이 모터 운전과 겹치는지 기록과 대조", en: "Compare when replies drop with when motors run" },
      ],
      links: [
        { k: "guide", to: "rs485-multimeter-check" },
        { k: "guide", to: "rs485-bias-termination" },
        { k: "web", to: "tools/rs485/" },
        { k: "web", to: "tools/multimeter-check/", hash: "rs485-idle" },
        { k: "web", to: "tools/system-diagram/" },
      ],
    },

    // ============================================================ ② RS-232
    {
      id: "rs232-seen",
      q: { ko: "PC 의 장치 관리자에 그 COM 포트가 보이나요?", en: "Does the COM port show up in the PC's Device Manager?" },
      hint: { ko: "USB-RS232 변환기라면 «아니오» 는 변환기 인식 갈래로 이어집니다", en: "For a USB-RS232 adapter, «No» continues with the adapter detection branch" },
      opts: yn("rs232-loop", "usb-sound"),
    },
    {
      id: "rs232-loop",
      q: { ko: "PC 쪽 DB9 의 2번(RXD)과 3번(TXD)을 이어 루프백하면 보낸 글자가 그대로 돌아오나요?", en: "With pins 2 (RXD) and 3 (TXD) of the PC-side DB9 linked (loopback), do sent characters come back?" },
      opts: yn("rs232-cross", "r-rs232-pc"),
    },
    {
      id: "rs232-cross",
      q: { ko: "장비의 TX 가 PC 의 RX(2번)로, PC 의 TX(3번)가 장비의 RX 로 엇갈려 이어졌나요?", en: "Is the device's TX wired to the PC's RX (pin 2) and the PC's TX (pin 3) to the device's RX — crossed over?" },
      hint: { ko: "모르면 «아니오» — 확인 방법이 나옵니다", en: "Not sure? Choose «No» to see how to check" },
      opts: yn("rs232-flow", "r-rs232-cross"),
    },
    {
      id: "rs232-flow",
      q: { ko: "프로그램과 장비 모두 흐름 제어가 «없음» 인가요?", en: "Is flow control set to «None» on both the program and the device?" },
      opts: yn("r-rs232-settings", "r-rs232-flow"),
    },
    {
      id: "r-rs232-pc",
      title: { ko: "PC 쪽 포트·변환기에서 막힘", en: "Blocked at the PC port or adapter" },
      causes: [
        { ko: "다른 프로그램이 포트를 쥐고 있거나 다른 COM 번호를 엶", en: "Another program holds the port, or the wrong COM number is open" },
        { ko: "변환기·포트 고장, 드라이버 문제", en: "Adapter or port fault, driver problem" },
        { ko: "핀 번호를 잘못 이음(루프백은 2–3번)", en: "Wrong pins linked (the loopback is pins 2–3)" },
      ],
      checks: [
        { ko: "아무것도 보내지 않을 때 3번(TXD)–5번(GND)이 −3~−15 V(보통 −5~−12 V)인지", en: "While idle, pin 3 (TXD) to pin 5 (GND) reads −3 to −15 V (typically −5 to −12 V)" },
        { ko: "Port Inspector 의 루프백 연결 시험으로 속도마다 같은 바이트가 돌아오는지", en: "Run Port Inspector's loopback test and check that bytes come back at each baud rate" },
      ],
      links: [
        { k: "web", to: "tools/multimeter-check/", hash: "rs232-tx" },
        { k: "app", to: "port-inspector" },
        { k: "guide", to: "rs232-db9-null-modem" },
      ],
    },
    {
      id: "r-rs232-cross",
      title: { ko: "TX 끼리 맞물렸을 가능성 — 크로스·스트레이트 케이블", en: "TX may be wired to TX — crossover vs straight cable" },
      causes: [
        { ko: "PC 와 장비가 둘 다 DTE 인데 스트레이트 케이블(TX–TX)을 씀 — 널 모뎀(크로스)이 필요", en: "PC and device are both DTE but a straight cable (TX–TX) is used — a null-modem (crossover) cable is needed" },
        { ko: "반대로 장비가 DCE 인데 크로스 케이블을 씀", en: "Or the device is DCE and a crossover cable is used" },
      ],
      checks: [
        { ko: "각 쪽 커넥터에서 쉬는 동안 −3~−15 V 가 나오는 핀이 그쪽 TX — 두 TX 가 한 선에 붙어 있으면 맞물린 것", en: "On each connector, the pin showing −3 to −15 V at idle is that side's TX — if both TX pins share one wire, they are clashing" },
        { ko: "케이블 양 끝 2·3번 사이를 저항(통전)으로 재서 2↔3 이 엇갈리는지 보기", en: "Use continuity mode across the cable to see whether 2↔3 are crossed" },
      ],
      links: [
        { k: "guide", to: "rs232-db9-null-modem" },
        { k: "web", to: "tools/wiring/", hash: "tpl=rs232" },
        { k: "web", to: "tools/multimeter-check/", hash: "rs232-tx" },
      ],
    },
    {
      id: "r-rs232-flow",
      title: { ko: "흐름 제어가 맞지 않음", en: "Flow control mismatch" },
      causes: [
        { ko: "하드웨어 흐름 제어(RTS/CTS)가 켜졌는데 CTS 선이 없어 PC 가 보내지 않고 기다림", en: "Hardware flow control (RTS/CTS) is on but CTS is not wired, so the PC waits forever" },
        { ko: "장비가 DTR·DSR 이 켜져야 응답하는데 3선 케이블만 이음", en: "The device needs DTR/DSR asserted but only a 3-wire cable is used" },
      ],
      checks: [
        { ko: "프로그램 흐름 제어를 «없음» 으로 두고 다시 시험", en: "Set flow control to «None» in the program and test again" },
        { ko: "장비가 핸드셰이크를 요구하면 커넥터 안에서 RTS–CTS(7–8), DTR–DSR–DCD(4–6–1)를 잇거나 핸드셰이크 포함 케이블 쓰기", en: "If the device requires handshaking, link RTS–CTS (7–8) and DTR–DSR–DCD (4–6–1) inside the connector, or use a full handshake cable" },
      ],
      links: [
        { k: "guide", to: "rs232-db9-null-modem" },
        { k: "web", to: "tools/wiring/", hash: "tpl=rs232" },
        { k: "app", to: "serial" },
      ],
    },
    {
      id: "r-rs232-settings",
      title: { ko: "배선은 맞아 보임 — 설정·명령 형식·신호 레벨", en: "Wiring looks right — settings, command format or signal level" },
      causes: [
        { ko: "보율·데이터 비트·패리티·정지 비트가 다름", en: "Baud, data bits, parity or stop bits differ" },
        { ko: "명령 끝 문자(CR·LF·CR LF)나 체크섬이 장비 요구와 다름", en: "Line ending (CR, LF, CR LF) or checksum differs from what the device expects" },
        { ko: "장비 포트가 RS-232 가 아니라 TTL(3.3·5 V) UART 임", en: "The device port is a TTL (3.3/5 V) UART, not RS-232" },
      ],
      checks: [
        { ko: "장비 TX 핀이 쉬는 동안 +3.3·+5 V 면 TTL — RS-232 포트에 바로 잇지 말 것", en: "If the device TX idles at +3.3 or +5 V it is TTL — do not connect it straight to an RS-232 port" },
        { ko: "HEX 로 보내고 받아 끝 문자·체크섬까지 바이트 단위로 비교", en: "Send and receive in HEX and compare line endings and checksums byte by byte" },
      ],
      links: [
        { k: "guide", to: "rs232-rs422-rs485" },
        { k: "web", to: "tools/hex-ascii/" },
        { k: "web", to: "tools/checksum/" },
        { k: "app", to: "serial" },
      ],
    },

    // ============================================================ ③ Modbus TCP · 이더넷
    {
      id: "tcp-ping",
      q: { ko: "PC 에서 장비 IP 로 ping 이 되나요?", en: "Does the device answer ping from the PC?" },
      opts: yn("tcp-502", "tcp-subnet"),
    },
    {
      id: "tcp-subnet",
      q: { ko: "PC 와 장비의 IP 가 같은 대역인가요? (예: 192.168.0.10/24 와 192.168.0.50)", en: "Are the PC and device IPs in the same subnet? (e.g. 192.168.0.10/24 and 192.168.0.50)" },
      opts: yn("tcp-link", "r-tcp-subnet"),
    },
    {
      id: "tcp-link",
      q: { ko: "PC·장비(스위치)의 랜 포트 링크 LED 가 켜져 있나요?", en: "Are the link LEDs lit on the PC and device (or switch) LAN ports?" },
      opts: yn("r-tcp-noping", "r-tcp-link"),
    },
    {
      id: "tcp-502",
      q: { ko: "502 포트(또는 매뉴얼의 포트)로 TCP 연결이 되나요?", en: "Can you open a TCP connection to port 502 (or the port in the manual)?" },
      hint: { ko: "PortDock TCP 로 연결해 보거나 PowerShell 의 Test-NetConnection <IP> -Port 502", en: "Try connecting with PortDock TCP, or PowerShell Test-NetConnection <IP> -Port 502" },
      opts: yn("tcp-reply", "r-tcp-port"),
    },
    {
      id: "tcp-reply",
      q: { ko: "연결된 뒤 요청에 응답이 오나요?", en: "Once connected, does a request get a reply?" },
      opts: yn("tcp-exception", "r-tcp-unitid"),
    },
    {
      id: "tcp-exception",
      q: { ko: "응답이 예외(함수 코드에 0x80 이 더해진 값, 예: 83 02)인가요?", en: "Is the reply an exception (function code + 0x80, e.g. 83 02)?" },
      hint: { ko: "«아니오» = 응답은 오는데 값이 이상함", en: "«No» = replies arrive but the values look wrong" },
      opts: yn("r-tcp-exception", "r-tcp-values"),
    },
    {
      id: "r-tcp-subnet",
      title: { ko: "IP 대역이 다름", en: "Different IP subnets" },
      causes: [
        { ko: "PC 와 장비의 네트워크 부분이 달라 게이트웨이 없이는 닿지 않음", en: "The network parts differ, so they cannot reach each other without a gateway" },
        { ko: "장비 IP 를 모름(공장 기본값·DHCP)", en: "The device IP is unknown (factory default or DHCP)" },
      ],
      checks: [
        { ko: "서브넷 계산기에 두 IP 와 마스크를 넣어 같은 대역인지 보기", en: "Enter both IPs and masks in the subnet calculator to see whether they share a subnet" },
        { ko: "PC 랜카드에 장비 대역의 IP 를 하나 더 주기(예: 192.168.0.200/24)", en: "Add a second IP in the device's subnet to the PC adapter (e.g. 192.168.0.200/24)" },
        { ko: "IP 를 모르면 Net Scan 으로 찾기", en: "If the IP is unknown, find it with Net Scan" },
      ],
      links: [
        { k: "guide", to: "plc-ip-subnet" },
        { k: "web", to: "tools/subnet/" },
        { k: "app", to: "netscan" },
      ],
    },
    {
      id: "r-tcp-link",
      title: { ko: "물리 연결이 없음 — 케이블·포트·스위치", en: "No physical link — cable, port or switch" },
      causes: [
        { ko: "케이블 단선·커넥터 불량, 다른 랜 포트에 꽂음", en: "Broken cable or connector, or plugged into another port" },
        { ko: "스위치 전원·포트 꺼짐, 장비 랜 포트가 꺼진 설정", en: "Switch power or port off, or the device's LAN port disabled" },
      ],
      checks: [
        { ko: "다른 케이블·다른 스위치 포트로 바꿔 보기", en: "Swap the cable and switch port" },
        { ko: "Port Inspector «랜카드 읽기» 로 링크·속도·이중 상태 보기", en: "Read link, speed and duplex with Port Inspector's «Read adapters»" },
      ],
      links: [
        { k: "app", to: "port-inspector" },
        { k: "guide", to: "plc-ip-subnet" },
      ],
    },
    {
      id: "r-tcp-noping",
      title: { ko: "링크는 있는데 ping 이 안 됨", en: "Link is up but no ping" },
      causes: [
        { ko: "장비가 ping(ICMP)에 응답하지 않도록 설정됨 — 이때는 502 연결로 바로 시험", en: "The device is set not to answer ping (ICMP) — test the 502 connection directly" },
        { ko: "같은 IP 를 쓰는 장비가 둘(IP 충돌)", en: "Two devices share the same IP (address conflict)" },
        { ko: "PC 의 다른 랜카드(Wi-Fi 등)가 같은 대역이라 그쪽으로 나감, 방화벽", en: "Another PC adapter (e.g. Wi-Fi) is on the same subnet and traffic goes out there; firewall" },
      ],
      checks: [
        { ko: "장비를 뽑고 ping 해서 응답이 오면 다른 장비가 같은 IP", en: "Unplug the device and ping — a reply means another device has that IP" },
        { ko: "Net Scan 으로 대역을 훑어 IP·MAC 목록 보기, 구성도의 IP 중복 점검", en: "Sweep the subnet with Net Scan for IPs and MACs; check for duplicate IPs on a system diagram" },
        { ko: "다른 랜카드를 잠시 끄고 다시 시험", en: "Temporarily disable other adapters and retry" },
      ],
      links: [
        { k: "app", to: "netscan" },
        { k: "web", to: "tools/system-diagram/" },
        { k: "guide", to: "plc-ip-subnet" },
        { k: "guide", to: "modbus-tcp-connection" },
      ],
    },
    {
      id: "r-tcp-port",
      title: { ko: "ping 은 되는데 502 연결이 안 됨", en: "Ping works but port 502 refuses" },
      causes: [
        { ko: "장비의 Modbus TCP 기능이 꺼져 있거나 옵션(별도 카드·라이선스)", en: "Modbus TCP is disabled on the device or is an option (separate card or licence)" },
        { ko: "포트 번호가 502 가 아님", en: "The port is not 502" },
        { ko: "동시 접속 수가 꽉 참(SCADA·HMI 가 이미 연결)", en: "The connection limit is full (SCADA or HMI already connected)" },
      ],
      checks: [
        { ko: "장비 매뉴얼의 Modbus TCP 설정·포트·최대 접속 수 보기", en: "Check the Modbus TCP setting, port and max connections in the manual" },
        { ko: "다른 클라이언트를 잠시 끊고 다시 연결", en: "Disconnect other clients briefly and reconnect" },
      ],
      links: [
        { k: "guide", to: "modbus-tcp-connection" },
        { k: "app", to: "tcp" },
        { k: "app", to: "modbus-master" },
      ],
    },
    {
      id: "r-tcp-unitid",
      title: { ko: "연결은 되는데 응답이 없음 — Unit ID·게이트웨이", en: "Connected but no reply — Unit ID or gateway" },
      causes: [
        { ko: "Unit ID 가 다름 — 게이트웨이 뒤 RTU 장비는 Unit ID = 그 장비 국번, 직접 장비는 매뉴얼 값(1 또는 255 가 흔함)", en: "Wrong Unit ID — behind a gateway it must equal the RTU slave ID; for direct devices use the manual's value (1 or 255 is common)" },
        { ko: "게이트웨이의 RTU 쪽(보율·배선)이 안 됨 — 게이트웨이가 응답 대신 끊거나 예외 0B 를 냄", en: "The gateway's RTU side (baud, wiring) fails — it drops the request or returns exception 0B" },
        { ko: "장비가 지원하지 않는 함수 코드", en: "A function code the device does not support" },
      ],
      checks: [
        { ko: "주고받은 바이트를 Modbus 프레임 해석기로 풀어 MBAP·Unit ID 보기", en: "Decode the exchanged bytes in the Modbus frame decoder to see MBAP and Unit ID" },
        { ko: "Wireshark·pktmon 으로 기록을 떠 pcap 해석기로 응답 유무·시간 보기", en: "Capture with Wireshark or pktmon and check replies and timing with the pcap analyzer" },
      ],
      links: [
        { k: "guide", to: "modbus-tcp-connection" },
        { k: "web", to: "tools/modbus-decoder/" },
        { k: "web", to: "tools/pcap-analyzer/" },
        { k: "guide", to: "capture-plc-traffic-wireshark-pktmon" },
      ],
    },
    {
      id: "r-tcp-exception",
      title: { ko: "장비가 예외로 답함 — 주소·함수·개수", en: "The device answers with an exception — address, function or count" },
      causes: [
        { ko: "예외 02: 주소가 없음 — 40001 표기를 0 기준 주소로 바꾸지 않음(1 차이)", en: "Exception 02: no such address — 40001 notation not converted to a 0-based address (off by one)" },
        { ko: "예외 01: 함수 코드 미지원(예: 입력 레지스터인데 03 으로 읽음)", en: "Exception 01: function not supported (e.g. reading input registers with 03)" },
        { ko: "예외 03: 개수가 125 를 넘거나 장비 한도 초과", en: "Exception 03: quantity over 125 or over the device limit" },
      ],
      checks: [
        { ko: "응답 바이트를 Modbus 프레임 해석기에 붙여 예외 코드 뜻 보기", en: "Paste the reply into the Modbus frame decoder for the exception meaning" },
        { ko: "레지스터 맵의 주소 표기 기준(0/1)을 매뉴얼에서 보기", en: "Check whether the register map uses 0- or 1-based addresses" },
      ],
      links: [
        { k: "guide", to: "modbus-exception-codes" },
        { k: "guide", to: "modbus-address-notation" },
        { k: "guide", to: "modbus-read-blocks" },
        { k: "web", to: "tools/modbus-decoder/" },
      ],
    },
    {
      id: "r-tcp-values",
      title: { ko: "통신은 되는데 값이 이상함 — 형식·순서·배율", en: "Communication works but values look wrong — format, order or scale" },
      causes: [
        { ko: "32비트 값(float·int32)의 워드 순서가 다름(ABCD·CDAB…)", en: "Word order of 32-bit values (float, int32) differs (ABCD, CDAB …)" },
        { ko: "배율(×0.1·×0.01)·부호(int16/uint16)·CT 비를 반영하지 않음", en: "Scale (×0.1, ×0.01), sign (int16/uint16) or CT ratio not applied" },
        { ko: "한 칸 밀린 주소(0/1 기준)", en: "Address shifted by one (0- vs 1-based)" },
      ],
      checks: [
        { ko: "레지스터 두 개를 Modbus 실수 변환기에 넣어 네 순서를 나란히 보기", en: "Put the two registers into the Modbus float converter and compare all four orders" },
        { ko: "정수 변환기로 부호 있는/없는 값 비교", en: "Compare signed and unsigned with the integer converter" },
      ],
      links: [
        { k: "guide", to: "modbus-float-word-order" },
        { k: "guide", to: "power-meter-modbus-values" },
        { k: "web", to: "tools/modbus-float/" },
        { k: "web", to: "tools/integer/" },
      ],
    },

    // ============================================================ ④ USB-시리얼 변환기
    {
      id: "usb-sound",
      q: { ko: "변환기를 꽂을 때 Windows 연결 소리가 나거나 장치 관리자 목록이 바뀌나요?", en: "When you plug the adapter in, does Windows play the connect sound or does Device Manager change?" },
      opts: yn("usb-com", "r-usb-none"),
    },
    {
      id: "usb-com",
      q: { ko: "장치 관리자 «포트(COM & LPT)» 에 COM 번호와 함께 보이나요?", en: "Does it appear under «Ports (COM & LPT)» with a COM number?" },
      hint: { ko: "«아니오» = «기타 장치»·느낌표·알 수 없는 장치로 보임", en: "«No» = it shows under «Other devices», with a warning mark or as unknown" },
      opts: yn("usb-drops", "r-usb-driver"),
    },
    {
      id: "usb-drops",
      q: { ko: "쓰는 도중에 끊기나요(포트가 사라졌다가 다시 생김)?", en: "Does it drop out during use (the port disappears and comes back)?" },
      opts: yn("usb-motor", "usb-comnum"),
    },
    {
      id: "usb-motor",
      q: { ko: "모터·인버터·용접기 같은 큰 부하가 켜지거나 돌 때 끊기나요?", en: "Does it drop when large loads such as motors, drives or welders start or run?" },
      opts: yn("r-usb-emi", "r-usb-power"),
    },
    {
      id: "usb-comnum",
      q: { ko: "꽂을 때마다 COM 번호가 바뀌거나 COM15 처럼 높은 번호가 되나요?", en: "Does the COM number change on every plug-in, or jump high like COM15?" },
      hint: { ko: "«아니오» = 인식·연결은 되는데 통신이 느리거나 응답이 쪼개짐", en: "«No» = detected and connected, but communication is slow or replies split" },
      opts: yn("r-usb-comnum", "r-usb-latency"),
    },
    {
      id: "r-usb-none",
      title: { ko: "USB 장치로도 잡히지 않음 — 케이블·포트·변환기", en: "Not seen as a USB device at all — cable, port or adapter" },
      causes: [
        { ko: "충전 전용 USB 케이블(데이터선 없음)", en: "A charge-only USB cable (no data wires)" },
        { ko: "앞면 포트·허브의 연결·전원 문제", en: "Front-panel port or hub connection or power issue" },
        { ko: "변환기 고장", en: "Adapter fault" },
      ],
      checks: [
        { ko: "PC 뒷면 포트에 허브 없이 바로, 다른 케이블로 꽂기", en: "Plug straight into a rear port without a hub, with another cable" },
        { ko: "다른 PC 에서도 똑같은지 보기", en: "See whether another PC behaves the same" },
        { ko: "Hardware Tester 의 USB 연결·끊김 기록(0.10.0 부터)으로 꽂힘이 기록되는지 보기", en: "Check whether the plug-in is logged in Hardware Tester's USB connect/disconnect log (from 0.10.0)" },
      ],
      links: [
        { k: "guide", to: "usb-serial-disconnects" },
        { k: "app", to: "hw-tester" },
      ],
    },
    {
      id: "r-usb-driver",
      title: { ko: "드라이버가 없거나 장치를 시작하지 못함", en: "Driver missing or the device cannot start" },
      causes: [
        { ko: "칩(FTDI·CH34x·CP210x·PL2303) 드라이버가 설치되지 않음", en: "No driver installed for the chip (FTDI, CH34x, CP210x, PL2303)" },
        { ko: "드라이버가 그 칩을 거부함(코드 10 등) — 오래된 PL2303 계열에서 흔함", en: "The driver rejects the chip (code 10 etc.) — common with older PL2303 parts" },
      ],
      checks: [
        { ko: "Port Inspector 로 VID:PID·칩 이름·문제 코드와 뜻 보기", en: "Read VID:PID, chip name and the problem code with its meaning in Port Inspector" },
        { ko: "칩 제조사 사이트의 드라이버를 쓰기(관리자 권한이 필요하면 담당자에게)", en: "Use the driver from the chip vendor's site (ask IT if admin rights are needed)" },
      ],
      links: [
        { k: "app", to: "port-inspector" },
        { k: "guide", to: "usb-serial-disconnects" },
      ],
    },
    {
      id: "r-usb-emi",
      title: { ko: "잡음·접지 차이가 USB 로 들어옴", en: "Noise or ground difference getting into USB" },
      causes: [
        { ko: "비절연 변환기라 장비 접지와 PC 접지 사이 전위차로 USB 가 리셋됨", en: "With a non-isolated adapter, the potential difference between device and PC ground resets USB" },
        { ko: "통신선·USB 케이블이 동력선 옆을 지남", en: "Comms or USB cable runs next to power cables" },
      ],
      checks: [
        { ko: "PC USB 외함과 장비 SG/PE 사이 전압(V⎓·V~): 1 V 미만이 일반적, 7 V 이상이면 문제", en: "Voltage between the PC USB shell and device SG/PE (V⎓ and V~): under 1 V is typical; 7 V or more is a problem" },
        { ko: "절연형 변환기, 짧은 USB, 페라이트 코어로 바꿔 보기", en: "Try an isolated adapter, a shorter USB cable or ferrite cores" },
        { ko: "Hardware Tester 의 USB 끊김 시각을 모터 운전 시각과 대조(0.10.0 부터)", en: "Compare Hardware Tester's USB drop times with motor run times (from 0.10.0)" },
      ],
      links: [
        { k: "guide", to: "field-noise-communication-errors" },
        { k: "web", to: "tools/multimeter-check/", hash: "ground-diff" },
        { k: "guide", to: "usb-serial-disconnects" },
        { k: "app", to: "hw-tester" },
      ],
    },
    {
      id: "r-usb-power",
      title: { ko: "절전·전원·접촉", en: "Power saving, power supply or contact" },
      causes: [
        { ko: "USB 선택적 절전, «전원을 절약하기 위해 컴퓨터가 이 장치를 끌 수 있음»", en: "USB selective suspend, or «Allow the computer to turn off this device to save power»" },
        { ko: "버스 전원 허브의 전원 부족, 헐거운 커넥터", en: "A bus-powered hub running short of power, or a loose connector" },
      ],
      checks: [
        { ko: "Port Inspector 로 절전 설정과 최근 연결·분리 기록 보기(읽기만 — 바꾸는 것은 Windows 에서 직접)", en: "Read the power-saving settings and recent plug history with Port Inspector (read-only — change them yourself in Windows)" },
        { ko: "케이블을 살짝 움직일 때 끊기는지 보기", en: "See whether wiggling the cable causes a drop" },
      ],
      links: [
        { k: "guide", to: "usb-serial-disconnects" },
        { k: "app", to: "port-inspector" },
        { k: "app", to: "serial" },
      ],
    },
    {
      id: "r-usb-comnum",
      title: { ko: "COM 번호가 바뀜 — 포트 위치·일련번호·예약", en: "COM number changes — port location, serial number, reservations" },
      causes: [
        { ko: "일련번호가 없는 칩(CH34x 등)은 USB 포트마다 새 번호를 받음", en: "Chips without a serial number (CH34x etc.) get a new number on every USB port" },
        { ko: "예전에 꽂았던 장치가 번호를 예약해 둠(ComDB)", en: "Previously connected devices keep numbers reserved (ComDB)" },
      ],
      checks: [
        { ko: "늘 같은 USB 포트에 꽂기", en: "Always use the same USB port" },
        { ko: "Port Inspector 의 COM 번호 예약 목록 보기", en: "Look at the COM number reservations in Port Inspector" },
        { ko: "PortDock Serial 은 번호가 바뀌어도 같은 장치를 찾아 다시 엶", en: "PortDock Serial reopens the same device even if its number changes" },
      ],
      links: [
        { k: "app", to: "port-inspector" },
        { k: "app", to: "serial" },
        { k: "guide", to: "usb-serial-disconnects" },
      ],
    },
    {
      id: "r-usb-latency",
      title: { ko: "연결은 되는데 느리거나 응답이 쪼개짐 — USB 지연", en: "Connected but slow or replies split — USB latency" },
      causes: [
        { ko: "FTDI 지연 타이머(기본 16 ms)로 짧은 프레임마다 지연이 더해짐", en: "The FTDI latency timer (default 16 ms) adds delay to every short frame" },
        { ko: "프로그램이 쪼개진 조각을 각각 응답으로 다룸", en: "The program treats each fragment as a separate reply" },
        { ko: "통신 자체가 안 되면 RS-485 또는 RS-232 갈래로 이어서 볼 것", en: "If there is no communication at all, continue with the RS-485 or RS-232 branch" },
      ],
      checks: [
        { ko: "Port Inspector 로 지연 타이머·루프백 왕복 시간 보기", en: "Check the latency timer and loopback round trip in Port Inspector" },
        { ko: "시리얼 통신 시간 계산기로 기대 응답 시간과 비교", en: "Compare with the expected response time from the serial timing calculator" },
      ],
      links: [
        { k: "guide", to: "usb-serial-latency" },
        { k: "web", to: "tools/serial-timing/" },
        { k: "app", to: "port-inspector" },
      ],
    },

    // ============================================================ ⑤ 4-20mA
    {
      id: "ma-kind",
      q: { ko: "값이 어떻게 이상한가요?", en: "How does the value look wrong?" },
      opts: [
        { a: { ko: "0(또는 최소)에서 움직이지 않음", en: "Stuck at 0 (or minimum)" }, next: "ma-flow" },
        { a: { ko: "최대에서 움직이지 않음", en: "Stuck at maximum" }, next: "ma-high" },
        { a: { ko: "흔들리거나 튐", en: "Fluctuating or jumping" }, next: "ma-motor" },
        { a: { ko: "움직이긴 하는데 실제와 다름", en: "Moves, but disagrees with reality" }, next: "r-ma-scale" },
      ],
    },
    {
      id: "ma-flow",
      q: { ko: "루프에 멀티미터(mA)를 직렬로 넣으면 3.6 mA 넘게 흐르나요?", en: "With a meter (mA) in series in the loop, is more than 3.6 mA flowing?" },
      opts: yn("r-ma-input", "ma-volt"),
    },
    {
      id: "ma-volt",
      q: { ko: "트랜스미터 + 와 − 단자 사이에 전압(보통 10 V 이상)이 걸려 있나요?", en: "Is there voltage (usually 10 V or more) across the transmitter's + and − terminals?" },
      opts: yn("r-ma-tx", "r-ma-open"),
    },
    {
      id: "ma-high",
      q: { ko: "잰 전류가 21 mA 이상인가요?", en: "Is the measured current 21 mA or more?" },
      opts: yn("r-ma-fault-high", "r-ma-over"),
    },
    {
      id: "ma-motor",
      q: { ko: "모터·인버터가 돌 때 흔들림이 커지나요?", en: "Does the fluctuation grow while motors or drives run?" },
      opts: yn("r-ma-noise", "ma-loopv"),
    },
    {
      id: "ma-loopv",
      q: { ko: "20 mA 가까이일 때도 트랜스미터 단자 전압이 매뉴얼의 최소 동작 전압보다 높나요?", en: "Near 20 mA, is the transmitter terminal voltage still above the minimum operating voltage in its manual?" },
      opts: yn("r-ma-process", "r-ma-loadv"),
    },
    {
      id: "r-ma-open",
      title: { ko: "루프에 전류도 전압도 없음 — 끊김·전원", en: "No current and no voltage in the loop — open circuit or supply" },
      causes: [
        { ko: "선 끊김·단자 풀림·퓨즈", en: "Broken wire, loose terminal or fuse" },
        { ko: "루프 전원(24 V)이 꺼졌거나 다른 곳에 이음", en: "Loop supply (24 V) off or wired elsewhere" },
        { ko: "4선식(전원 별도) 트랜스미터를 2선식처럼 이어 전원이 안 들어감", en: "A 4-wire (separately powered) transmitter wired like 2-wire, so it gets no power" },
      ],
      checks: [
        { ko: "루프 전원 단자에서 24 V, 다음에 트랜스미터 단자에서 전압을 차례로 재며 어디서 사라지는지", en: "Measure 24 V at the supply, then at the transmitter, to find where it disappears" },
        { ko: "배선도의 2·3·4선식 그림과 실제 배선 대조", en: "Compare the real wiring with the 2/3/4-wire drawings" },
      ],
      links: [
        { k: "guide", to: "4-20ma-loop" },
        { k: "web", to: "tools/wiring/", hash: "tpl=4-20ma" },
        { k: "web", to: "tools/multimeter-check/", hash: "loop-ma" },
      ],
    },
    {
      id: "r-ma-tx",
      title: { ko: "전압은 있는데 전류가 없음 — 트랜스미터·극성", en: "Voltage present but no current — transmitter or polarity" },
      causes: [
        { ko: "2선식 극성 반대(+·− 바뀜)", en: "2-wire polarity reversed (+ and − swapped)" },
        { ko: "수신 쪽 입력이 전압 입력으로 설정돼 루프가 사실상 끊김", en: "The receiving input is set to voltage mode, effectively opening the loop" },
        { ko: "트랜스미터 고장", en: "Transmitter fault" },
      ],
      checks: [
        { ko: "트랜스미터 +·− 를 매뉴얼 그림대로 다시 보기", en: "Recheck transmitter + and − against the manual drawing" },
        { ko: "입력 카드의 채널 종류(전류/전압) 설정·점퍼 보기", en: "Check the input card channel type (current/voltage) setting or jumper" },
      ],
      links: [
        { k: "guide", to: "4-20ma-loop" },
        { k: "guide", to: "analog-input-scaling" },
        { k: "web", to: "tools/wiring/", hash: "tpl=4-20ma" },
      ],
    },
    {
      id: "r-ma-input",
      title: { ko: "전류는 흐르는데 값이 0 — 수신 쪽 설정·스케일", en: "Current flows but the value is 0 — receiving side setup or scale" },
      causes: [
        { ko: "입력 범위 설정이 다름(0–20 mA·1–5 V·0–10 V 로 설정)", en: "Input range set differently (0–20 mA, 1–5 V, 0–10 V)" },
        { ko: "다른 채널을 보고 있음, 스케일 설정이 0", en: "Looking at another channel, or scaling set to 0" },
        { ko: "3.6~3.8 mA 근처면 트랜스미터가 고장 신호를 내는 중", en: "Around 3.6–3.8 mA the transmitter is signalling a fault" },
      ],
      checks: [
        { ko: "잰 mA 를 멀티미터 점검기에 넣어 %·NE 43 구간 보기", en: "Enter the measured mA in the multimeter checker for % and the NE 43 zone" },
        { ko: "4–20mA 환산 계산기로 기대 카운트(예: 0–27648)와 비교", en: "Compare with the expected count (e.g. 0–27648) in the 4–20 mA calculator" },
      ],
      links: [
        { k: "web", to: "tools/multimeter-check/", hash: "loop-ma" },
        { k: "web", to: "tools/4-20ma/" },
        { k: "guide", to: "analog-input-scaling" },
      ],
    },
    {
      id: "r-ma-fault-high",
      title: { ko: "21 mA 이상 — 고장 신호 또는 단락", en: "21 mA or more — failure signal or short" },
      causes: [
        { ko: "트랜스미터가 NE 43 위쪽 고장 신호를 냄(센서 단선 등)", en: "The transmitter outputs the NE 43 high failure signal (e.g. broken sensor)" },
        { ko: "25 mA 를 크게 넘으면 전원이 트랜스미터를 거치지 않고 바로 이어진 배선", en: "Well above 25 mA: the supply bypasses the transmitter (a short)" },
      ],
      checks: [
        { ko: "트랜스미터 표시·진단 코드 보기", en: "Check the transmitter display or diagnostics" },
        { ko: "센서(Pt100 등) 단자 저항을 재서 끊김 보기", en: "Measure the sensor (e.g. Pt100) resistance for an open circuit" },
      ],
      links: [
        { k: "web", to: "tools/multimeter-check/", hash: "loop-ma" },
        { k: "guide", to: "4-20ma-loop" },
        { k: "guide", to: "pt100-thermocouple-wiring" },
      ],
    },
    {
      id: "r-ma-over",
      title: { ko: "최대값에서 멈춤 — 범위 설정 또는 실제 값", en: "Stuck at maximum — range setting or real value" },
      causes: [
        { ko: "PLC 스케일 범위가 트랜스미터 범위보다 좁음", en: "PLC scaling range narrower than the transmitter range" },
        { ko: "트랜스미터 범위(예: 0–10 bar)를 공정값이 넘음", en: "The process value exceeds the transmitter range (e.g. 0–10 bar)" },
        { ko: "단위 혼동(bar·psi·kPa)", en: "Unit confusion (bar, psi, kPa)" },
      ],
      checks: [
        { ko: "잰 mA 로 % 를 구해 PLC 값과 비교", en: "Work out % from the measured mA and compare with the PLC value" },
        { ko: "트랜스미터 명판·설정의 범위 보기", en: "Check the range on the transmitter nameplate or settings" },
      ],
      links: [
        { k: "web", to: "tools/4-20ma/" },
        { k: "guide", to: "analog-input-scaling" },
        { k: "guide", to: "pressure-units" },
      ],
    },
    {
      id: "r-ma-noise",
      title: { ko: "잡음 — 차폐·접지·배선 경로", en: "Noise — shield, ground or cable route" },
      causes: [
        { ko: "신호선이 동력선과 같은 덕트", en: "Signal cable shares a duct with power cables" },
        { ko: "차폐를 양쪽에서 접지해 접지 루프가 생김(보통 한쪽만)", en: "Shield grounded at both ends forming a ground loop (usually one end only)" },
        { ko: "트랜스미터와 PLC 접지 전위차", en: "Ground potential difference between transmitter and PLC" },
      ],
      checks: [
        { ko: "두 접지 사이 전압을 재기(1 V 미만이 일반적)", en: "Measure the voltage between the two grounds (under 1 V is typical)" },
        { ko: "흔들림 폭을 mA 로 재서 기록, 신호 절연기 검토", en: "Record the swing in mA; consider a signal isolator" },
        { ko: "입력 필터 시간 상수(RC 필터)로 흔들림 줄이기", en: "Reduce fluctuation with an input filter time constant (RC filter)" },
      ],
      links: [
        { k: "guide", to: "cable-shield-grounding" },
        { k: "web", to: "tools/multimeter-check/", hash: "ground-diff" },
        { k: "guide", to: "4-20ma-loop" },
        { k: "web", to: "tools/rc-filter/" },
      ],
    },
    {
      id: "r-ma-loadv",
      title: { ko: "루프 전압이 모자람 — 부하 저항·전원 강하", en: "Loop voltage too low — load resistance or supply drop" },
      causes: [
        { ko: "수신 저항·표시기·배리어가 많아 루프 부하가 큼", en: "Too many receivers, indicators or barriers in the loop" },
        { ko: "긴 선·가는 선, 24 V 전원 강하", en: "Long or thin wiring, 24 V supply drop" },
      ],
      checks: [
        { ko: "루프 부하 계산기로 20 mA(또는 21 mA)에서 트랜스미터 단자 전압 구하기", en: "Use the loop load calculator for the transmitter voltage at 20 mA (or 21 mA)" },
        { ko: "부하 켠 상태에서 24 V 전원 전압 재기(강하 5 % 이하가 무난)", en: "Measure the 24 V supply under load (5 % drop or less is comfortable)" },
      ],
      links: [
        { k: "guide", to: "24v-power-supply-check" },
        { k: "web", to: "tools/loop-load/" },
        { k: "web", to: "tools/multimeter-check/", hash: "supply-24v" },
        { k: "guide", to: "24v-voltage-drop" },
      ],
    },
    {
      id: "r-ma-process",
      title: { ko: "배선·전압은 무난함 — 실제 공정 변동이나 감쇠 설정", en: "Wiring and voltage look fine — real process variation or damping" },
      causes: [
        { ko: "공정값이 실제로 출렁임(펌프 맥동 등)", en: "The process value really fluctuates (pump pulsation etc.)" },
        { ko: "트랜스미터 감쇠(damping)·PLC 입력 필터가 짧음", en: "Short transmitter damping or PLC input filter" },
      ],
      checks: [
        { ko: "값을 시간 축 그래프로 기록해 주기적인지 보기", en: "Log the value on a time chart and look for periodic patterns" },
        { ko: "트랜스미터 감쇠 설정 보기", en: "Check the transmitter damping setting" },
      ],
      links: [
        { k: "app", to: "plot" },
        { k: "web", to: "tools/rc-filter/" },
        { k: "guide", to: "4-20ma-loop" },
      ],
    },
    {
      id: "r-ma-scale",
      title: { ko: "값이 실제와 다름 — 스케일·단위·카운트", en: "Value disagrees with reality — scaling, units or counts" },
      causes: [
        { ko: "공학값 범위(하한·상한)가 트랜스미터 설정과 다름", en: "Engineering range (low/high) differs from the transmitter setting" },
        { ko: "PLC 카운트 범위(0–27648·0–4000·0–32000)를 다르게 씀", en: "Wrong PLC count range (0–27648, 0–4000, 0–32000)" },
        { ko: "단위 혼동(bar/psi, 게이지/절대 압력)", en: "Unit confusion (bar/psi, gauge/absolute)" },
      ],
      checks: [
        { ko: "잰 mA 를 4–20mA 환산 계산기에 넣어 기대 공학값·카운트와 비교", en: "Enter the measured mA in the 4–20 mA calculator and compare with expected value and count" },
        { ko: "4·12·20 mA 세 점에서 PLC 값이 비례하는지", en: "Check that the PLC value is proportional at 4, 12 and 20 mA" },
      ],
      links: [
        { k: "web", to: "tools/4-20ma/" },
        { k: "guide", to: "analog-input-scaling" },
        { k: "guide", to: "pressure-units" },
        { k: "web", to: "tools/pressure/" },
      ],
    },

    // ============================================================ ⑥ NPN/PNP 센서
    {
      id: "sn-kind",
      q: { ko: "어떤 증상인가요?", en: "What is the symptom?" },
      opts: [
        { a: { ko: "켜져야 할 때 입력이 안 들어옴", en: "Input never turns on" }, next: "sn-led" },
        { a: { ko: "입력이 꺼지지 않음(늘 켜짐)", en: "Input never turns off (always on)" }, next: "r-sn-stuck" },
      ],
    },
    {
      id: "sn-led",
      q: { ko: "물체를 대면 센서 자체의 동작 LED 가 켜지나요?", en: "Does the sensor's own indicator LED light when a target is present?" },
      opts: yn("sn-type", "sn-power"),
    },
    {
      id: "sn-power",
      q: { ko: "센서 갈색(+)과 파랑(0 V) 사이가 전원 전압(보통 24 V) 근처인가요?", en: "Is the voltage between the sensor's brown (+) and blue (0 V) near the supply (usually 24 V)?" },
      opts: yn("r-sn-sense", "r-sn-power"),
    },
    {
      id: "sn-type",
      q: { ko: "센서 종류와 PLC 입력 COM 이 맞게 이어졌나요 — NPN 이면 입력 COM 이 +24 V, PNP 면 0 V?", en: "Do sensor type and PLC input COM match — input COM to +24 V for NPN, to 0 V for PNP?" },
      hint: { ko: "모르면 «아니오»", en: "Not sure? Choose «No»" },
      opts: yn("sn-vin", "r-sn-mismatch"),
    },
    {
      id: "sn-vin",
      q: { ko: "센서가 켜졌을 때 PLC 입력 단자와 입력 COM 사이에 15 V 이상이 걸리나요?", en: "With the sensor on, is there 15 V or more between the PLC input terminal and input COM?" },
      opts: yn("sn-plcled", "r-sn-wire"),
    },
    {
      id: "sn-plcled",
      q: { ko: "그때 PLC 입력 LED 가 켜지나요?", en: "Does the PLC input LED light at that moment?" },
      opts: yn("r-sn-program", "r-sn-input"),
    },
    {
      id: "r-sn-power",
      title: { ko: "센서에 전원이 없음", en: "No power at the sensor" },
      causes: [
        { ko: "전원선 끊김·커넥터 접촉·퓨즈", en: "Broken supply wire, connector contact or fuse" },
        { ko: "선 색이 관례(갈색 +, 파랑 0 V, 검정 출력)와 다른 제품", en: "Wire colours differ from the convention (brown +, blue 0 V, black output)" },
        { ko: "멀리 있는 센서의 전압 강하", en: "Voltage drop to a distant sensor" },
      ],
      checks: [
        { ko: "부하 켠 상태로 센서 단자에서 전원 전압 재기 — 강하 15 % 넘으면 문제", en: "Measure supply voltage at the sensor with loads on — more than 15 % drop is a problem" },
        { ko: "센서 데이터시트의 선 색·전원 범위 보기", en: "Check wire colours and supply range in the sensor datasheet" },
      ],
      links: [
        { k: "guide", to: "24v-power-supply-check" },
        { k: "web", to: "tools/multimeter-check/", hash: "supply-24v" },
        { k: "guide", to: "24v-voltage-drop" },
        { k: "web", to: "tools/voltage-drop/" },
      ],
    },
    {
      id: "r-sn-sense",
      title: { ko: "전원은 있는데 감지하지 않음 — 센서 설정·대상", en: "Powered but not detecting — sensor setting or target" },
      causes: [
        { ko: "감지 거리·감도 설정, 대상 재질(근접 센서는 금속 종류에 따라 거리 다름)", en: "Sensing distance or sensitivity, target material (proximity range depends on metal type)" },
        { ko: "광전 센서 축 어긋남·렌즈 오염", en: "Photoelectric sensor misaligned or dirty lens" },
        { ko: "센서 고장", en: "Sensor fault" },
      ],
      checks: [
        { ko: "대상을 가까이 대 보며 LED 가 켜지는 거리 확인", en: "Bring the target closer to see at what distance the LED lights" },
        { ko: "같은 종류 센서로 바꿔 보기", en: "Swap in a sensor of the same type" },
      ],
      links: [
        { k: "web", to: "tools/wiring/", hash: "tpl=npn-pnp" },
      ],
    },
    {
      id: "r-sn-mismatch",
      title: { ko: "NPN/PNP 와 입력 COM 극성이 맞지 않을 가능성", en: "NPN/PNP and input COM polarity may be mismatched" },
      causes: [
        { ko: "NPN 센서인데 입력 COM 이 0 V(또는 PNP 인데 +24 V) — 전류가 흐를 길이 없음", en: "NPN sensor with input COM at 0 V (or PNP with +24 V) — no path for current" },
        { ko: "«싱크/소스» 를 제조사마다 반대로 부름", en: "Vendors use «sink/source» in opposite senses" },
      ],
      checks: [
        { ko: "센서 켜짐 상태에서 검정–파랑: NPN 이면 거의 0 V, PNP 면 전원 근처", en: "With the sensor on, black–blue reads near 0 V for NPN, near the supply for PNP" },
        { ko: "PLC 매뉴얼의 입력 배선 그림에서 COM 이 어디로 가는지 보기", en: "Check in the PLC manual's input wiring figure where COM goes" },
      ],
      links: [
        { k: "guide", to: "npn-pnp-sensor-plc-input" },
        { k: "web", to: "tools/multimeter-check/", hash: "sensor-out" },
        { k: "web", to: "tools/wiring/", hash: "tpl=npn-pnp" },
      ],
    },
    {
      id: "r-sn-wire",
      title: { ko: "센서는 켜지는데 입력에 전압이 오지 않음 — 배선", en: "Sensor turns on but no voltage reaches the input — wiring" },
      causes: [
        { ko: "출력선이 다른 입력 번호에 이어짐, 중간 단자대에서 끊김", en: "Output wire landed on another input, or broken at an intermediate terminal block" },
        { ko: "입력 COM 선이 빠짐", en: "Input COM wire missing" },
        { ko: "센서 잔류 전압이 크거나 출력 전류가 입력에 모자람", en: "High sensor residual voltage, or output current too low for the input" },
      ],
      checks: [
        { ko: "센서 켜짐/꺼짐 각각 검정–파랑 전압을 재서 점검기에 넣기", en: "Measure black–blue with the sensor on and off and enter both in the checker" },
        { ko: "PLC 입력 단자–COM 사이: 켜짐 15 V 이상(형식 1), 꺼짐 5 V 이하", en: "PLC input to COM: ON 15 V or more (type 1), OFF 5 V or less" },
      ],
      links: [
        { k: "guide", to: "npn-pnp-sensor-plc-input" },
        { k: "web", to: "tools/multimeter-check/", hash: "sensor-out" },
        { k: "web", to: "tools/wiring/", hash: "tpl=npn-pnp" },
      ],
    },
    {
      id: "r-sn-input",
      title: { ko: "전압은 오는데 PLC 가 켜짐으로 읽지 않음 — 입력 카드", en: "Voltage arrives but the PLC does not read ON — input card" },
      causes: [
        { ko: "입력 카드 전원·고장, 다른 카드 슬롯을 보고 있음", en: "Input card power or fault, or looking at another slot" },
        { ko: "입력 전압이 문턱 근처(11~15 V) — 형식 1 입력은 켜지지 않을 수 있음", en: "Input voltage near the threshold (11–15 V) — a type 1 input may stay off" },
      ],
      checks: [
        { ko: "옆 채널에 같은 센서를 옮겨 보기", en: "Move the sensor to a neighbouring channel" },
        { ko: "입력 카드 매뉴얼의 ON 전압·전류 보기", en: "Check ON voltage and current in the input card manual" },
      ],
      links: [
        { k: "web", to: "tools/multimeter-check/", hash: "sensor-out" },
      ],
    },
    {
      id: "r-sn-program",
      title: { ko: "입력은 들어옴 — 주소·필터·펄스 길이 쪽", en: "The input does turn on — address, filter or pulse length" },
      causes: [
        { ko: "프로그램이 다른 입력 주소를 봄(X 번호의 8진·16진 표기 혼동)", en: "The program reads another input address (octal vs hex X numbering)" },
        { ko: "입력 필터 시간보다 신호가 짧음(빠른 물체)", en: "Signal shorter than the input filter time (fast-moving target)" },
        { ko: "통신으로 읽는다면 비트 주소 계산이 어긋남", en: "If read over comms, the bit address calculation is off" },
      ],
      checks: [
        { ko: "PLC 모니터에서 그 입력 비트를 직접 보기", en: "Watch that input bit directly in the PLC monitor" },
        { ko: "MC 프로토콜이면 디바이스 번호 표기 확인", en: "For MC protocol, check the device number notation" },
      ],
      links: [
        { k: "guide", to: "mc-protocol-device-numbers" },
      ],
    },
    {
      id: "r-sn-stuck",
      title: { ko: "입력이 꺼지지 않음 — 누설·단락·출력 모드", en: "Input never turns off — leakage, short or output mode" },
      causes: [
        { ko: "2선식 센서의 꺼짐 누설 전류가 입력을 켜 둠", en: "OFF-state leakage of a 2-wire sensor keeps the input on" },
        { ko: "출력선이 +24 V(PNP) 또는 0 V(NPN)에 닿아 단락", en: "Output wire shorted to +24 V (PNP) or 0 V (NPN)" },
        { ko: "센서 출력 모드(NO/NC, Light-ON/Dark-ON)가 반대", en: "Sensor output mode (NO/NC, light-on/dark-on) reversed" },
      ],
      checks: [
        { ko: "센서 꺼짐 상태에서 PLC 입력–COM 전압: 5 V 이하여야 꺼짐", en: "With the sensor off, PLC input to COM should be 5 V or less" },
        { ko: "센서 출력선을 떼면 입력이 꺼지는지", en: "See whether the input turns off when the output wire is removed" },
      ],
      links: [
        { k: "web", to: "tools/multimeter-check/", hash: "sensor-out" },
        { k: "web", to: "tools/wiring/", hash: "tpl=npn-pnp" },
      ],
    },

    // ============================================================ ⑦ MC 프로토콜
    {
      id: "mc-ping",
      q: { ko: "PC 에서 PLC IP 로 ping 이 되나요?", en: "Does the PLC answer ping from the PC?" },
      hint: { ko: "«아니오» 는 이더넷 갈래(IP 대역)로 이어집니다", en: "«No» continues with the Ethernet branch (IP subnet)" },
      opts: yn("mc-port", "tcp-subnet"),
    },
    {
      id: "mc-port",
      q: { ko: "PLC 이더넷 설정에 MC 프로토콜(SLMP)용 접속이 열려 있고, 포트 번호·TCP/UDP·바이너리/ASCII 가 프로그램과 같나요?", en: "Is an MC protocol (SLMP) connection opened in the PLC Ethernet settings, with port number, TCP/UDP and binary/ASCII matching the program?" },
      opts: yn("mc-endcode", "r-mc-port"),
    },
    {
      id: "mc-endcode",
      q: { ko: "응답의 종료 코드가 0 이 아닌가요(예: C059)?", en: "Is the reply's end code non-zero (e.g. C059)?" },
      opts: yn("r-mc-endcode", "mc-noreply"),
    },
    {
      id: "mc-noreply",
      q: { ko: "연결은 되는데 응답이 아예 오지 않나요(시간 초과)?", en: "Is the connection open but no reply ever arrives (timeout)?" },
      hint: { ko: "«아니오» = 응답은 오는데 값이 이상함", en: "«No» = replies arrive but values look wrong" },
      opts: yn("r-mc-frame", "r-mc-values"),
    },
    {
      id: "r-mc-port",
      title: { ko: "PLC 쪽 MC 프로토콜 접속 설정", en: "MC protocol connection settings on the PLC" },
      causes: [
        { ko: "MC 프로토콜(SLMP) 접속을 만들지 않았거나, 설정을 PLC 에 써넣고 다시 시작하지 않음", en: "No MC protocol (SLMP) connection configured, or the settings were not written to the PLC and restarted" },
        { ko: "포트 번호·TCP/UDP·코드(바이너리/ASCII)가 프로그램과 다름", en: "Port number, TCP/UDP or code (binary/ASCII) differs from the program" },
        { ko: "다른 프로그램이 같은 TCP 접속을 이미 쓰는 중", en: "Another program already uses the same TCP connection" },
      ],
      checks: [
        { ko: "PLC 없이 PortDock PLC Simulator(127.0.0.1)로 프로그램 쪽 설정부터 시험", en: "Test the program side first against PortDock PLC Simulator on 127.0.0.1, without a PLC" },
        { ko: "엔지니어링 도구의 이더넷 설정 화면과 프로그램 값을 나란히 적어 대조", en: "Write the engineering tool's Ethernet settings next to the program values and compare" },
      ],
      links: [
        { k: "guide", to: "mc-protocol-test-without-plc" },
        { k: "app", to: "plc-simulator" },
        { k: "app", to: "tcp" },
      ],
    },
    {
      id: "r-mc-endcode",
      title: { ko: "PLC 가 종료 코드로 거절함", en: "The PLC rejects the request with an end code" },
      causes: [
        { ko: "명령·하위 명령이 PLC 기종에서 지원되지 않음", en: "Command or subcommand not supported by the PLC model" },
        { ko: "디바이스 코드·번호 범위 밖, 점수 초과", en: "Device code or number out of range, or too many points" },
        { ko: "RUN 중 쓰기 금지 같은 PLC 쪽 설정", en: "PLC-side settings such as write-protect during RUN" },
      ],
      checks: [
        { ko: "응답 바이트를 MC 프로토콜 해석기에 넣어 종료 코드 뜻 보기", en: "Paste the reply into the MC protocol decoder for the end code meaning" },
        { ko: "종료 코드 가이드의 확인 순서 따르기", en: "Follow the checking order in the end codes guide" },
      ],
      links: [
        { k: "guide", to: "mc-protocol-end-codes" },
        { k: "web", to: "tools/mc-decoder/" },
        { k: "guide", to: "mc-protocol-device-numbers" },
      ],
    },
    {
      id: "r-mc-frame",
      title: { ko: "프레임 형식이 맞지 않아 PLC 가 답하지 않음", en: "Frame format mismatch, so the PLC stays silent" },
      causes: [
        { ko: "3E/4E 프레임, 바이너리/ASCII 가 PLC 설정과 다름", en: "3E/4E frame or binary/ASCII differs from the PLC setting" },
        { ko: "머리(네트워크 번호·PC 번호·요청 대상 모듈)·데이터 길이 값이 틀림", en: "Header values (network no., PC no., destination module) or data length wrong" },
        { ko: "UDP 인데 PLC 가 TCP 로 기다림(또는 반대)", en: "Using UDP while the PLC expects TCP (or vice versa)" },
      ],
      checks: [
        { ko: "보낸 바이트를 MC 프로토콜 해석기로 풀어 필드마다 보기", en: "Decode the sent bytes field by field in the MC protocol decoder" },
        { ko: "Wireshark·pktmon 으로 기록을 떠 pcap 해석기로 요청·응답 짝 보기", en: "Capture with Wireshark or pktmon and check request/reply pairs in the pcap analyzer" },
      ],
      links: [
        { k: "guide", to: "mc-protocol-3e-binary-frame" },
        { k: "web", to: "tools/mc-decoder/" },
        { k: "web", to: "tools/pcap-analyzer/" },
        { k: "guide", to: "capture-plc-traffic-wireshark-pktmon" },
      ],
    },
    {
      id: "r-mc-values",
      title: { ko: "응답은 오는데 값이 이상함 — 디바이스 번호·단위", en: "Replies arrive but values look wrong — device numbers or units" },
      causes: [
        { ko: "X·Y 는 16진 번호인데 10진으로 넣음", en: "X and Y are hexadecimal but entered as decimal" },
        { ko: "비트 단위/워드 단위 읽기 혼동", en: "Bit-unit vs word-unit read confusion" },
        { ko: "32비트 값의 워드 순서·부호", en: "Word order or sign of 32-bit values" },
      ],
      checks: [
        { ko: "디바이스 번호 가이드의 표기표와 대조", en: "Compare with the notation table in the device numbers guide" },
        { ko: "정수 변환기로 부호·16진 비교", en: "Compare sign and hex in the integer converter" },
      ],
      links: [
        { k: "guide", to: "mc-protocol-device-numbers" },
        { k: "web", to: "tools/integer/" },
        { k: "web", to: "tools/mc-decoder/" },
      ],
    },

    // ============================================================ ⑧ PC USB 장치 반복 끊김
    {
      id: "pu-know",
      q: { ko: "어느 장치가 끊기는지 알고 있나요?", en: "Do you know which device is dropping?" },
      hint: { ko: "«띠링–또롱» 소리만 반복되고 무엇인지 모르면 «아니오»", en: "If you only hear the connect/disconnect sound repeat, choose «No»" },
      opts: yn("pu-port", "r-pu-find"),
    },
    {
      id: "pu-port",
      q: { ko: "다른 USB 포트(PC 뒷면, 허브 없이)에 꽂아도 끊기나요?", en: "Does it still drop on another USB port (rear panel, no hub)?" },
      opts: yn("pu-cable", "r-pu-port"),
    },
    {
      id: "pu-cable",
      q: { ko: "다른 케이블로 바꿔도 끊기나요?", en: "Does it still drop with another cable?" },
      opts: yn("pu-suspend", "r-pu-cable"),
    },
    {
      id: "pu-suspend",
      q: { ko: "USB 절전(선택적 절전, 장치의 «전원 끌 수 있음»)을 끄면 줄어드나요?", en: "Does turning off USB power saving (selective suspend, «allow turn off») reduce it?" },
      hint: { ko: "PortDock 은 읽기만 합니다 — 바꾸는 것은 Windows 설정에서 직접", en: "PortDock only reads these — change them yourself in Windows settings" },
      opts: yn("r-pu-suspend", "r-pu-device"),
    },
    {
      id: "r-pu-find",
      title: { ko: "먼저 끊기는 장치를 찾기", en: "First find which device drops" },
      causes: [
        { ko: "아직 모름 — 마우스·키보드·무선 동글·카메라·USB-시리얼·허브 중 하나일 수 있음", en: "Unknown yet — could be a mouse, keyboard, wireless dongle, camera, USB-serial adapter or hub" },
      ],
      checks: [
        { ko: "Hardware Tester 의 USB 연결·끊김 기록(0.10.0 부터)으로 꽂힘·빠짐 시각과 장치 이름·VID:PID 보기", en: "Use Hardware Tester's USB connect/disconnect log (from 0.10.0) for times, device name and VID:PID" },
        { ko: "같은 장치가 10분 안에 3번 이상 끊기면 «반복 끊김 의심» 이 붙음 — 그 장치로 다시 이 갈래를 따라가기", en: "A device dropping 3+ times in 10 minutes is marked «suspected repeated drops» — then follow this branch again for it" },
      ],
      links: [
        { k: "app", to: "hw-tester" },
        { k: "guide", to: "usb-serial-disconnects" },
      ],
    },
    {
      id: "r-pu-port",
      title: { ko: "원래 포트·허브 쪽", en: "The original port or hub" },
      causes: [
        { ko: "앞면 포트의 내부 연결선·접촉 불량", en: "Front-panel port internal lead or contact" },
        { ko: "버스 전원 허브의 전원 부족", en: "Bus-powered hub running short of power" },
      ],
      checks: [
        { ko: "뒷면 포트나 전원 어댑터가 있는 허브로 옮겨 쓰기", en: "Use a rear port or a self-powered hub" },
        { ko: "Hardware Tester 기록으로 포트를 옮긴 뒤 끊김이 사라졌는지 확인", en: "Confirm with the Hardware Tester log that drops stopped after moving ports" },
      ],
      links: [
        { k: "app", to: "hw-tester" },
        { k: "guide", to: "usb-serial-disconnects" },
      ],
    },
    {
      id: "r-pu-cable",
      title: { ko: "케이블·커넥터", en: "Cable or connector" },
      causes: [
        { ko: "케이블 안 단선(움직일 때 끊김), 헐거운 커넥터", en: "Internal break in the cable (drops when moved), loose connector" },
        { ko: "너무 긴 USB 케이블·연장선", en: "USB cable or extension too long" },
      ],
      checks: [
        { ko: "짧고 굵은 케이블로 바꿔 쓰기", en: "Use a short, good-quality cable" },
      ],
      links: [
        { k: "app", to: "hw-tester" },
        { k: "guide", to: "usb-serial-disconnects" },
      ],
    },
    {
      id: "r-pu-suspend",
      title: { ko: "USB 절전이 장치를 끔", en: "USB power saving turns the device off" },
      causes: [
        { ko: "USB 선택적 절전, 장치·허브의 «전원 끌 수 있음»", en: "USB selective suspend, «allow the computer to turn off» on the device or hub" },
      ],
      checks: [
        { ko: "Port Inspector «이 PC 설정 읽기» 로 USB 선택적 절전 상태 보기", en: "Read USB selective suspend with Port Inspector's «Read this PC's settings»" },
        { ko: "장비 PC 라면 전원 옵션의 절전도 함께 보기", en: "On an equipment PC, review the power plan's sleep settings too" },
      ],
      links: [
        { k: "app", to: "port-inspector" },
        { k: "guide", to: "usb-serial-disconnects" },
      ],
    },
    {
      id: "r-pu-device",
      title: { ko: "장치·드라이버·주변 환경 쪽", en: "Device, driver or surroundings" },
      causes: [
        { ko: "장치 자체 고장이나 드라이버 문제", en: "The device itself or its driver" },
        { ko: "USB 3 장치가 USB 2.0 속도로 붙음(케이블·포트 문제의 신호)", en: "A USB 3 device running at USB 2.0 speed (a sign of cable or port trouble)" },
        { ko: "무선 동글이면 USB 3.0 포트 근처의 2.4 GHz 간섭", en: "For wireless dongles, 2.4 GHz interference near USB 3.0 ports" },
        { ko: "장비 접지 전위차·잡음(산업 현장)", en: "Equipment ground difference or noise (industrial sites)" },
      ],
      checks: [
        { ko: "다른 PC 에서도 끊기는지 보기", en: "See whether it drops on another PC" },
        { ko: "Hardware Tester 의 USB 속도 «볼 것» 표시 보기(0.10.0 부터)", en: "Look for Hardware Tester's USB speed «Worth a look» marks (from 0.10.0)" },
        { ko: "PC 와 장비 접지 사이 전압 재기", en: "Measure the voltage between PC and equipment ground" },
      ],
      links: [
        { k: "app", to: "hw-tester" },
        { k: "guide", to: "bluetooth-headphones-cutting-out-windows" },
        { k: "web", to: "tools/multimeter-check/", hash: "ground-diff" },
      ],
    },
  ],
};
