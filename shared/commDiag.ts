// «응답 없음» 원인 후보(0.10.0) — 최근 요청 결과를 나눠 원인 후보와 확인 방법을 보인다.
// 순수 함수(화면·통신 없음) — Modbus Master 의 원인 후보 패널이 쓴다. 단정하지 않는다: 늘 «후보».
// 실행 시험: node --test shared/commDiag.test.ts

export type Lang = "ko" | "en";
export interface Text {
  ko: string;
  en: string;
}
const t = (ko: string, en: string): Text => ({ ko, en });

/** 요청 하나의 결과(마지막 시도) — crates/core modbus_master PollResult 에서 */
export interface DiagSample {
  result: "ok" | "exception" | "timeout" | "crc" | "bad" | "send-error" | "broadcast";
  /** 예외 코드 */
  code?: number;
  /** 보낸 것이 그대로 먼저 되돌아옴(2선 RS-485 에코) */
  echo?: boolean;
  /** 응답이 덜 옴(잘린 프레임) */
  partial?: boolean;
  /** 받은 바이트 수 */
  got?: number;
  /** 다른 국번이 답함 */
  otherUnit?: number | null;
  /** 보낸 국번 */
  unit?: number;
}

export type CauseId = "silent" | "echo-only" | "garbled" | "partial" | "exception" | "other-unit" | "bad-shape" | "send-error" | "intermittent";

export interface DiagLink {
  label: Text;
  /** 사이트 주소(언어별) */
  url: (lang: Lang) => string;
}

export interface Cause {
  id: CauseId;
  /** problem = 요청이 대부분 이렇게 끝남, look = 일부 */
  level: "problem" | "look";
  /** 이 갈래로 나뉜 요청 수 */
  count: number;
  title: Text;
  /** 원인 후보(가능성이 큰 차례) */
  candidates: Text[];
  /** 확인 방법 */
  checks: Text[];
  links: DiagLink[];
  /** exception: 받은 예외 코드들, other-unit: 답한 국번들 */
  codes?: number[];
  units?: number[];
}

export interface Diagnosis {
  total: number;
  ok: number;
  causes: Cause[];
}

const site = (lang: Lang) => `https://portdock.dev/${lang === "en" ? "en/" : ""}`;
export const guideLink = (slug: string, label: Text): DiagLink => ({ label, url: (lang) => `${site(lang)}guides/${slug}/` });
/** 사이트의 고장 원인 찾기 도우미 */
export const TROUBLESHOOT: DiagLink = { label: t("고장 원인 찾기 도우미", "Troubleshooting helper"), url: (lang) => `${site(lang)}tools/troubleshoot/` };

const G = {
  noResponse: guideLink("modbus-no-response", t("Modbus 응답이 없을 때", "No reply from a Modbus device")),
  rs485: guideLink("rs485-wiring", t("RS-485 배선", "RS-485 wiring")),
  bias: guideLink("rs485-bias-termination", t("RS-485 종단·바이어스", "RS-485 termination and bias")),
  latency: guideLink("usb-serial-latency", t("USB 시리얼 지연", "USB serial latency")),
  timeout: guideLink("modbus-rtu-timeout-polling", t("RTU 타임아웃·폴링 간격", "RTU timeout and polling")),
  exceptions: guideLink("modbus-exception-codes", t("Modbus 예외 코드", "Modbus exception codes")),
  address: guideLink("modbus-address-notation", t("Modbus 주소 표기", "Modbus address notation")),
  disconnects: guideLink("usb-serial-disconnects", t("USB 시리얼이 끊길 때", "USB serial disconnects")),
};

/** 어느 갈래인지 — 정상·브로드캐스트는 null */
export function classify(s: DiagSample): CauseId | null {
  switch (s.result) {
    case "ok":
    case "broadcast":
      return null;
    case "send-error":
      return "send-error";
    case "exception":
      return "exception";
    case "timeout":
      return s.echo ? "echo-only" : "silent";
    case "crc":
      return "garbled";
    case "bad":
      if (s.otherUnit != null) return "other-unit";
      if (s.partial) return "partial";
      return "bad-shape";
  }
  return null;
}

/** 갈래마다 제목·원인 후보·확인 방법·링크. wire: rtu 면 배선·속도 후보까지, tcp 면 네트워크 쪽 */
function describe(id: CauseId, wire: "rtu" | "tcp"): Omit<Cause, "id" | "level" | "count"> {
  const rtu = wire === "rtu";
  switch (id) {
    case "silent":
      return {
        title: t("바이트가 전혀 오지 않음", "No bytes at all"),
        candidates: rtu
          ? [
              t("국번(Slave ID)이 장비 설정과 다름", "The Slave ID differs from the device setting"),
              t("속도·패리티가 장비와 다름 — 장비가 요청을 알아듣지 못하면 답하지 않습니다", "Baud or parity differs from the device — a device that cannot read the request does not reply"),
              t("RS-485 A/B(D+/D−) 가 뒤바뀜", "RS-485 A/B (D+/D−) swapped"),
              t("배선이 끊김·장비 전원 꺼짐·통신 카드 미장착", "Broken wire, device powered off or comm card missing"),
              t("다른 COM 포트를 고름(변환기가 여러 개일 때)", "The wrong COM port (when several adapters are plugged in)"),
            ]
          : [
              t("유닛 ID 가 게이트웨이·장비 설정과 다름", "The Unit ID differs from the gateway/device setting"),
              t("게이트웨이 뒤 시리얼 쪽 설정(속도·국번)이 다름", "Serial-side settings behind the gateway (baud, ID) differ"),
              t("장비가 연결은 받지만 Modbus 요청에 답하지 않음(다른 프로토콜·포트)", "The device accepts the connection but does not answer Modbus (another protocol or port)"),
            ],
        checks: rtu
          ? [
              t("«찾기» → «통신 설정 찾기» 로 속도·패리티·국번을 한 번에 훑어 봅니다(버스에 다른 마스터가 없을 때만).", "Use «Scan» → «Find line settings» to sweep baud, parity and ID at once (only when no other master is on the bus)."),
              t("A/B 를 바꿔 물려 봅니다 — 제조사마다 A/B 이름이 반대인 경우가 있습니다.", "Swap A and B — some vendors label them the other way round."),
              t("변환기 TX LED 가 깜박이는지, 장비 RX/통신 LED 가 반응하는지 봅니다.", "Check that the adapter's TX LED blinks and the device's RX/comm LED reacts."),
              t("Serial «연결 점검…» 의 루프백 시험으로 변환기·케이블 자체를 먼저 확인합니다.", "Run the loopback test in Serial «Check connection…» to rule out the adapter and cable first."),
            ]
          : [
              t("국번 찾기로 0~247 을 훑어 답하는 유닛 ID 를 찾습니다.", "Scan IDs 0–247 to find a Unit ID that answers."),
              t("게이트웨이 설정 화면에서 시리얼 쪽 속도·국번·타임아웃을 확인합니다.", "Check the serial-side baud, ID and timeout in the gateway settings."),
            ],
        links: rtu ? [G.noResponse, G.rs485, TROUBLESHOOT] : [G.noResponse, TROUBLESHOOT],
      };
    case "echo-only":
      return {
        title: t("보낸 것만 그대로 되돌아옴(에코)", "Only the request came back (echo)"),
        candidates: [
          t("2선 RS-485 변환기가 보낸 바이트를 스스로 되받음 — 이 프로그램은 에코를 건너뛰고 응답을 기다렸지만 장비가 답하지 않았습니다", "A 2-wire RS-485 adapter receives its own bytes — this program skipped the echo and waited, but the device did not answer"),
          t("변환기까지는 선이 살아 있음 — 장비 쪽(국번·속도·A/B·전원)을 볼 차례", "The line works up to the adapter — look at the device side next (ID, baud, A/B, power)"),
          t("변환기의 에코(로컬 에코) 설정이 켜져 있음", "The adapter's echo (local echo) setting is on"),
        ],
        checks: [
          t("장비를 뗀 채로 Serial «연결 점검…» 의 «2선 RS-485 에코» 시험을 돌려 변환기가 에코를 내는지 봅니다.", "With the device removed, run «2-wire RS-485 echo» in Serial «Check connection…» to see whether the adapter echoes."),
          t("에코를 끌 수 있는 변환기면 끄고, 국번·속도·A/B 를 다시 봅니다.", "If the adapter can turn echo off, do so, then recheck ID, baud and A/B."),
        ],
        links: [G.rs485, G.noResponse, TROUBLESHOOT],
      };
    case "garbled":
      return {
        title: t("바이트는 오는데 CRC 오류(깨짐)", "Bytes arrive but fail CRC (garbled)"),
        candidates: [
          t("속도(보율)·패리티·정지 비트가 장비와 다름", "Baud, parity or stop bits differ from the device"),
          t("선의 잡음 — 꼬임선이 아님·차폐 접지·동력선과 함께 배선", "Noise on the line — no twisted pair, shield grounding, run next to power cables"),
          t("종단 저항이 없거나 너무 많음, 바이어스 없음(긴 선·빠른 속도)", "Missing or extra termination, no bias (long line, high speed)"),
          t("버스에 다른 마스터가 있어 요청이 겹침", "Another master on the bus, requests collide"),
        ],
        checks: [
          t("장비의 통신 설정(속도·패리티)을 다시 봅니다. 모르면 «통신 설정 찾기» 를 씁니다.", "Recheck the device's baud and parity; if unknown, use «Find line settings»."),
          t("속도를 낮춰 오류가 줄면 잡음·종단 쪽입니다.", "If errors drop at a lower baud, suspect noise or termination."),
          t("버스 양 끝에만 120Ω 종단이 있는지 봅니다.", "Check there is a 120 Ω terminator at both ends of the bus only."),
        ],
        links: [G.bias, G.rs485, TROUBLESHOOT],
      };
    case "partial":
      return {
        title: t("짧게 잘린 프레임(덜 옴)", "Truncated frames (reply cut short)"),
        candidates: [
          t("응답 기다림(타임아웃)이 짧음 — 장비가 느리거나 응답이 김", "The response timeout is short — the device is slow or the reply is long"),
          t("USB 변환기의 지연(FTDI 지연 타이머 기본 16ms)으로 끝이 늦게 옴", "USB adapter latency (FTDI latency timer default 16 ms) delays the tail"),
          t("방향 전환이 늦은 RS-485 변환기가 응답 앞부분을 잘라 먹음", "A slow-switching RS-485 adapter clips part of the reply"),
        ],
        checks: [
          t("«응답 기다림» 을 늘려 봅니다(예: 1000ms). 그래도 잘리면 배선·변환기 쪽입니다.", "Increase «Response timeout» (e.g. 1000 ms). If it is still cut, look at wiring or the adapter."),
          t("한 번에 읽는 개수를 줄여 봅니다.", "Read fewer registers per request."),
        ],
        links: [G.timeout, G.latency, TROUBLESHOOT],
      };
    case "exception":
      return {
        title: t("예외 응답 — 장비는 답함", "Exception reply — the device answers"),
        candidates: [
          t("통신은 됩니다. 장비가 요청 내용(함수·주소·개수·값)을 받지 않았습니다", "Communication works; the device rejected the request (function, address, count or value)"),
        ],
        checks: [
          t("예외 코드의 뜻을 보고 주소(0/1 기준·PLC 표기)·개수·함수를 고칩니다.", "Read the exception code, then fix the address (0/1-based, PLC notation), count or function."),
        ],
        links: [G.exceptions, G.address],
      };
    case "other-unit":
      return {
        title: t("다른 국번이 답함", "A different ID answered"),
        candidates: [
          t("요청이 그 국번으로 가지 않았거나, 장비가 받은 국번과 다른 국번으로 답함(설정·게이트웨이)", "The request reached a different ID, or the device answers with its own ID (setting or gateway)"),
          t("버스에 같은 국번 장비가 둘 이상이거나 다른 마스터의 응답이 섞임", "Two devices share an ID, or another master's replies mix in"),
        ],
        checks: [
          t("표의 국번을 답한 국번으로 바꿔 봅니다.", "Try the ID that answered in the table."),
          t("버스에 다른 마스터(HMI·PLC)가 붙어 있지 않은지 봅니다.", "Check that no other master (HMI, PLC) is on the bus."),
        ],
        links: [G.noResponse, TROUBLESHOOT],
      };
    case "bad-shape":
      return {
        title: t("모양이 틀린 응답", "Malformed reply"),
        candidates: [
          t("요청과 다른 함수·바이트 수로 답함 — 장비가 Modbus 가 아닌 다른 규칙을 쓰거나, 다른 장비의 응답이 섞임", "The reply has a different function or byte count — the device speaks another protocol, or other traffic mixes in"),
          t("Modbus TCP 와 RTU over TCP 를 바꿔 고름", "Modbus TCP and RTU over TCP mixed up"),
        ],
        checks: [
          t("통신 기록에서 받은 바이트를 봅니다(풀이 줄).", "Look at the received bytes in the traffic log (decode line)."),
          t("연결 방식(시리얼·TCP·RTU over TCP)을 장비 설명서와 맞춥니다.", "Match the connection type (serial, TCP, RTU over TCP) with the device manual."),
        ],
        links: [G.noResponse, TROUBLESHOOT],
      };
    case "send-error":
      return {
        title: t("보내지 못함(포트·연결 끊김)", "Could not send (port or connection lost)"),
        candidates: [
          t("USB 변환기가 빠졌거나 절전으로 꺼짐", "The USB adapter was unplugged or powered down by power saving"),
          t("TCP 연결이 끊김", "The TCP connection dropped"),
        ],
        checks: [
          t("Port Inspector 에서 장치가 보이는지, USB 절전이 켜졌는지 봅니다.", "Check in Port Inspector that the device is present and whether USB power saving is on."),
        ],
        links: [G.disconnects, TROUBLESHOOT],
      };
    case "intermittent":
      return {
        title: t("가끔만 실패", "Fails only now and then"),
        candidates: [
          t("선의 잡음·종단·바이어스", "Line noise, termination or bias"),
          t("응답 기다림이 장비 응답 시간에 비해 빠듯함", "The timeout is tight for the device's response time"),
          t("폴링 간격이 짧아 장비가 바쁨", "Polling too fast for the device"),
          t("버스에 다른 마스터가 있어 가끔 겹침", "Another master on the bus collides now and then"),
        ],
        checks: [
          t("통계의 최대 응답 시간과 응답 기다림을 견줘 봅니다.", "Compare the maximum response time in Statistics with the timeout."),
          t("요청 간격을 늘리거나 속도를 낮춰 오류가 줄어드는지 봅니다.", "Lengthen the delay between requests or lower the baud and see whether errors drop."),
        ],
        links: [G.timeout, G.bias, TROUBLESHOOT],
      };
  }
}

/**
 * 최근 요청 결과를 나눠 원인 후보를 고른다. 많이 나온 갈래부터.
 * - 실패가 절반 이상인 갈래는 problem, 아니면 look
 * - 성공과 실패가 섞이면 «가끔만 실패» 를 함께 보인다
 */
export function diagnose(samples: DiagSample[], wire: "rtu" | "tcp" = "rtu"): Diagnosis {
  const total = samples.length;
  const counts = new Map<CauseId, number>();
  const codes = new Set<number>();
  const units = new Set<number>();
  let ok = 0;
  for (const s of samples) {
    const id = classify(s);
    if (!id) {
      ok++;
      continue;
    }
    counts.set(id, (counts.get(id) ?? 0) + 1);
    if (id === "exception" && s.code != null) codes.add(s.code);
    if (id === "other-unit" && s.otherUnit != null) units.add(s.otherUnit);
  }
  const causes: Cause[] = [];
  for (const [id, count] of counts) {
    const c: Cause = { id, level: count * 2 >= total ? "problem" : "look", count, ...describe(id, wire) };
    if (id === "exception") c.codes = [...codes].sort((a, b) => a - b);
    if (id === "other-unit") c.units = [...units].sort((a, b) => a - b);
    causes.push(c);
  }
  causes.sort((a, b) => b.count - a.count);
  // 성공이 있는데 응답 없음·깨짐도 있다 — 통신 설정보다 선·타이밍 쪽
  const flaky = (counts.get("silent") ?? 0) + (counts.get("garbled") ?? 0) + (counts.get("partial") ?? 0);
  if (ok > 0 && flaky > 0) causes.push({ id: "intermittent", level: "look", count: flaky, ...describe("intermittent", wire) });
  return { total, ok, causes };
}

/** 원인 후보 패널을 글로(복사·AI 에 붙여 넣기) */
export function diagnosisText(d: Diagnosis, lang: Lang, exceptionText?: (code: number) => string): string {
  const L = (x: Text) => x[lang];
  const ko = lang === "ko";
  const out = [ko ? `최근 요청 ${d.total}개 — 응답 받음 ${d.ok}개` : `Last ${d.total} requests — ${d.ok} OK`];
  for (const c of d.causes) {
    out.push("", `[${c.count}] ${L(c.title)}`);
    if (c.codes?.length && exceptionText) for (const k of c.codes) out.push(`  - ${exceptionText(k)}`);
    if (c.units?.length) out.push(`  - ${ko ? "답한 국번" : "Answering IDs"}: ${c.units.join(", ")}`);
    out.push(ko ? " 원인 후보:" : " Possible causes:", ...c.candidates.map((x) => `  - ${L(x)}`));
    out.push(ko ? " 확인 방법:" : " How to check:", ...c.checks.map((x) => `  - ${L(x)}`));
  }
  return out.join("\n");
}
